import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GiftCardProduct } from '../../database/entities/gift-card-product.entity';
import { GiftCardOrder } from '../../database/entities/gift-card-order.entity';
import { CzRedeemErrorCodes } from '../../common/errors/error.constants';
import { encryptText, decryptText } from '../../common/utils/crypto.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { Env } from '../../common/config/env';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ReferralRulesService } from '../referrals/referral-rules.service';
import { GiftCardExternal } from '../../external/gift-card.external';
import { ListProductsDto } from './dto/list-products.dto';

/** One row of the order history screen, with product details joined in. */
export interface MyOrderRow extends Omit<GiftCardOrder, 'product'> {
  brand: string | null;
  denomination: string | null;
  image_url: string | null;
}

@Injectable()
export class RedeemService {
  private readonly logger = new Logger(RedeemService.name);

  constructor(
    @InjectRepository(GiftCardProduct)
    private readonly products: Repository<GiftCardProduct>,
    @InjectRepository(GiftCardOrder)
    private readonly orders: Repository<GiftCardOrder>,
    private readonly giftCardApiService: GiftCardExternal,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly achievementsService: AchievementsService,
    private readonly referralRulesService: ReferralRulesService,
  ) {}

  async listProducts(query: ListProductsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const builder = this.products
      .createQueryBuilder('p')
      .where('p.is_active = true');

    if (query.category) {
      builder.andWhere('p.category = :category', { category: query.category });
    }
    if (query.brand) {
      builder.andWhere('p.brand ILIKE :brand', { brand: `%${query.brand}%` });
    }
    if (query.is_featured !== undefined) {
      builder.andWhere('p.is_featured = :is_featured', {
        is_featured: query.is_featured,
      });
    }

    builder
      .orderBy('p.is_featured', 'DESC')
      .addOrderBy('p.price_coins', 'ASC')
      .skip(skip)
      .take(take);

    const [data, total] = await builder.getManyAndCount();
    return { data, total };
  }

  async listCategories(): Promise<string[]> {
    const rows = await this.products
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.is_active = true')
      .andWhere('p.category IS NOT NULL')
      .getRawMany();
    return rows.map((row) => row.category as string);
  }

  async getProductOrFail(product_id: string): Promise<GiftCardProduct> {
    const product = await this.products.findOne({
      where: { cz_gift_card_product_id: product_id },
    });
    if (!product) {
      throw new NotFoundException({
        cz_error_code: CzRedeemErrorCodes.PRODUCT_NOT_FOUND,
      });
    }
    return product;
  }

  /** Charges coins first, then asks the vendor for a code. */
  async order(user_id: string, product_id: string) {
    const product = await this.getProductOrFail(product_id);
    if (!product.is_active) {
      throw new BadRequestException({
        cz_error_code: CzRedeemErrorCodes.PRODUCT_INACTIVE,
      });
    }

    // Order row and coin debit commit together — a failed debit can never
    // leave an orphan pending order behind.
    const saved = await this.dataSource.transaction(async (tx) => {
      const row = tx.create(GiftCardOrder, {
        user_id,
        product_id,
        price_coins: product.price_coins,
        status: 'pending' as const,
      });
      const order = await tx.save(GiftCardOrder, row);
      await this.walletService.debit(
        {
          user_id,
          currency: 'coin',
          amount: product.price_coins,
          type: 'spend',
          source_type: 'redeem',
          source_id: order.cz_gift_card_order_id,
        },
        tx,
      );
      return order;
    });

    await this.fulfill(saved, product);
    await this.achievementsService.trackProgress(user_id, 'redeem_gift_card');

    const totalOrders = await this.orders.count({ where: { user_id } });
    if (totalOrders === 1) {
      await this.referralRulesService.award(user_id, 'first_redeem');
    }
    await this.referralRulesService.award(
      user_id,
      'redeems_completed',
      totalOrders,
    );

    return {
      ...saved,
      brand: product.brand,
      denomination: product.denomination,
      image_url: product.image_url,
    };
  }

  /** Calls the vendor and records whatever comes back. Never throws. */
  async fulfill(order: GiftCardOrder, product: GiftCardProduct): Promise<void> {
    try {
      const result = await this.giftCardApiService.purchase(
        product.external_product_id,
        order.cz_gift_card_order_id,
      );
      order.provider_order_id = result.provider_order_id || null;
      this.applyResult(order, result.status, result.code, result.failure_reason);
    } catch (error) {
      this.logger.error(`Gift card purchase failed: ${String(error)}`);
      order.status = 'failed';
      order.failure_reason = 'Provider request failed.';
    }

    await this.orders.save(order);
    if (order.status === 'failed') await this.refund(order);
    if (order.status === 'fulfilled') await this.notifyReady(order, product);
  }

  /** Cron: pending orders are polled until the vendor settles them. */
  async pollPendingOrders(): Promise<number> {
    const pending = await this.orders.find({
      where: { status: 'pending' },
      relations: { product: true },
      take: 100,
    });

    // Ten vendor calls in flight at a time instead of one after another.
    const due = pending.filter((order) => order.provider_order_id);
    for (let start = 0; start < due.length; start += 10) {
      const chunk = due.slice(start, start + 10);
      await Promise.all(chunk.map((order) => this.pollOne(order)));
    }
    return pending.length;
  }

  private async pollOne(order: GiftCardOrder): Promise<void> {
    try {
      const result = await this.giftCardApiService.fetchOrder(
        order.provider_order_id as string,
      );
      if (result.status === 'pending') return;

      this.applyResult(order, result.status, result.code, result.failure_reason);
      await this.orders.save(order);

      if (order.status === 'failed') await this.refund(order);
      if (order.status === 'fulfilled' && order.product) {
        await this.notifyReady(order, order.product);
      }
    } catch (error) {
      this.logger.warn(`Order poll failed for ${order.cz_gift_card_order_id}.`);
    }
  }

  private applyResult(
    order: GiftCardOrder,
    status: GiftCardOrder['status'],
    code: string | null,
    failure_reason: string | null,
  ): void {
    order.status = status;
    if (status === 'fulfilled' && code) {
      order.redeemed_code_encrypted = encryptText(code);
      order.fulfilled_at = new Date();
    }
    if (status === 'failed') {
      order.failure_reason = failure_reason ?? 'Provider rejected the order.';
    }
  }

  /** A failed order must give the coins back through the ledger. */
  private async refund(order: GiftCardOrder): Promise<void> {
    await this.walletService.credit({
      user_id: order.user_id,
      currency: 'coin',
      amount: order.price_coins,
      type: 'earn',
      source_type: 'redeem',
      source_id: order.cz_gift_card_order_id,
    });
    await this.notificationsService.push(
      order.user_id,
      'Gift card order failed',
      `We could not complete your order, so ${order.price_coins} coins were returned.`,
    );
  }

  private async notifyReady(
    order: GiftCardOrder,
    product: GiftCardProduct,
  ): Promise<void> {
    await this.notificationsService.push(
      order.user_id,
      'Gift card ready',
      `Your ${product.brand} ${product.denomination} code is ready to view.`,
    );
  }

  /** The product is joined in, so this is one query no matter the page size. */
  async listOrders(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [rows, total] = await this.orders.findAndCount({
      where: { user_id },
      relations: { product: true },
      order: { created_at: 'DESC' },
      skip,
      take,
    });

    const data: MyOrderRow[] = [];
    for (const { product, ...rest } of rows) {
      data.push({
        ...rest,
        brand: product?.brand ?? null,
        denomination: product?.denomination ?? null,
        image_url: product?.image_url ?? null,
      });
    }

    return { data, total };
  }

  async getOrder(user_id: string, order_id: string) {
    const order = await this.orders.findOne({
      where: { cz_gift_card_order_id: order_id, user_id },
      relations: { product: true },
    });
    if (!order) {
      throw new NotFoundException({
        cz_error_code: CzRedeemErrorCodes.ORDER_NOT_FOUND,
      });
    }
    const { product, ...rest } = order;
    return {
      ...rest,
      brand: product?.brand ?? null,
      denomination: product?.denomination ?? null,
      image_url: product?.image_url ?? null,
    };
  }

  /** The only endpoint that decrypts a code. Kept separate on purpose. */
  async revealCode(user_id: string, order_id: string) {
    const order = await this.orders
      .createQueryBuilder('o')
      .addSelect('o.redeemed_code_encrypted')
      .where('o.cz_gift_card_order_id = :order_id', { order_id })
      .andWhere('o.user_id = :user_id', { user_id })
      .getOne();

    if (!order) {
      throw new NotFoundException({
        cz_error_code: CzRedeemErrorCodes.ORDER_NOT_FOUND,
      });
    }
    if (order.status !== 'fulfilled' || !order.redeemed_code_encrypted) {
      throw new BadRequestException({
        cz_error_code: CzRedeemErrorCodes.CODE_NOT_READY,
      });
    }

    return {
      cz_gift_card_order_id: order.cz_gift_card_order_id,
      code: decryptText(order.redeemed_code_encrypted),
      fulfilled_at: order.fulfilled_at,
    };
  }

  /** Cron: refreshes the catalog and prices it in coins. */
  async syncCatalog(): Promise<{ synced: number }> {
    const [items, coins_per_usd] = await Promise.all([
      this.giftCardApiService.fetchCatalog(),
      this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
    ]);

    const provider_name = Env.giftCard.providerName;
    const synced_at = new Date();
    const payloads = items
      .filter((item) => item.external_product_id)
      .map((item) => ({
        provider_name,
        external_product_id: item.external_product_id,
        brand: item.brand,
        denomination: item.denomination,
        category: item.category,
        image_url: item.image_url,
        price_coins: Math.round(item.price_usd * coins_per_usd),
        is_active: true,
        synced_at,
      }));

    // One INSERT ... ON CONFLICT per chunk instead of two queries per product.
    for (let start = 0; start < payloads.length; start += 500) {
      await this.products.upsert(payloads.slice(start, start + 500), [
        'provider_name',
        'external_product_id',
      ]);
    }
    return { synced: payloads.length };
  }
}
