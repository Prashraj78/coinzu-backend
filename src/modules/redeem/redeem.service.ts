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
import { User } from '../../database/entities/user.entity';
import { CzRedeemErrorCodes } from '../../common/errors/error.constants';
import { encryptText, decryptText } from '../../common/utils/crypto.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ReferralRulesService } from '../referrals/referral-rules.service';
import { GiftCardExternal } from '../../external/gift-card.external';
import { SendgridMailExternal } from '../../external/sendgrid-mail.external';
import { TelegramExternal } from '../../external/telegram.external';
import { ListProductsDto } from './dto/list-products.dto';
import { AdminListProductsDto } from './dto/admin-list-products.dto';

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
    private readonly mail: SendgridMailExternal,
    private readonly telegram: TelegramExternal,
    @InjectRepository(User)
    private readonly users: Repository<User>,
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

  /** Admin: every product, active or not, filterable + paginated. */
  async listAdminProducts(query: AdminListProductsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const builder = this.products.createQueryBuilder('p');

    if (query.brand) {
      builder.andWhere('p.brand ILIKE :brand', { brand: `%${query.brand}%` });
    }
    if (query.category) {
      builder.andWhere('p.category = :category', { category: query.category });
    }
    if (query.status) {
      builder.andWhere('p.is_active = :active', {
        active: query.status === 'active',
      });
    }

    const [data, total] = await builder
      .orderBy('p.brand', 'ASC')
      .addOrderBy('p.price_coins', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
    return { data, total };
  }

  /** Distinct category names across the catalogue, for admin filters. */
  async listAdminCategories(): Promise<string[]> {
    const rows = await this.products
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.category IS NOT NULL')
      .orderBy('p.category', 'ASC')
      .getRawMany<{ category: string }>();
    return rows.map((r) => r.category);
  }

  /** Admin: show or hide a single product from the store. */
  async setProductActive(product_id: string, is_active: boolean) {
    const product = await this.getProductOrFail(product_id);
    product.is_active = is_active;
    return this.products.save(product);
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
    const enabled = await this.settingsService.getBoolean(
      SettingKeys.GIFT_CARD_ENABLED,
    );
    if (!enabled) {
      throw new BadRequestException({
        cz_error_code: CzRedeemErrorCodes.PRODUCT_INACTIVE,
      });
    }
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

    await this.alert(
      `🧾 <b>Gift card ordered</b>\n${this.telegram.escape(
        `${product.brand} ${product.denomination}`,
      )} — ${product.price_coins} coins — order <code>${saved.cz_gift_card_order_id}</code>`,
    );

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

      // Some vendors (Reloadly) accept the order as SUCCESSFUL but issue the
      // code on a separate endpoint, so fetch it now when it isn't inline.
      let { status, code } = result;
      if (status === 'fulfilled' && !code && order.provider_order_id) {
        const card = await this.giftCardApiService.fetchOrder(
          order.provider_order_id,
        );
        code = card.code;
        // Still no code yet → leave it pending for the poller to pick up.
        if (!code) status = 'pending';
      }
      this.applyResult(order, status, code, result.failure_reason);
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
    await this.alert(
      `⚠️ <b>Gift card failed</b>\norder <code>${order.cz_gift_card_order_id}</code> — ${this.telegram.escape(
        order.failure_reason ?? 'unknown',
      )} — ${order.price_coins} coins refunded`,
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
    await this.emailCode(order, product);
    await this.alert(
      `✅ <b>Gift card fulfilled</b>\n${this.telegram.escape(
        `${product.brand} ${product.denomination}`,
      )} — order <code>${order.cz_gift_card_order_id}</code>`,
    );
  }

  /** Sends the code + redeem steps to the user's email. Best-effort. */
  private async emailCode(
    order: GiftCardOrder,
    product: GiftCardProduct,
  ): Promise<void> {
    const code = order.redeemed_code_encrypted
      ? decryptText(order.redeemed_code_encrypted)
      : null;
    if (!code) return;
    const user = await this.users.findOne({
      where: { cz_user_id: order.user_id },
      select: { email: true, name: true },
    });
    if (!user?.email) return;

    const steps = product.redeem_verbose || product.redeem_concise || '';
    const lines = [
      `Hi ${user.name ?? 'there'},`,
      ``,
      `Your ${product.brand} ${product.denomination} gift card is ready.`,
      ``,
      `Code: ${code}`,
      ``,
      steps ? `How to redeem:\n${steps}` : '',
      ``,
      `Thanks for using Coinzu.`,
    ].filter((l) => l !== null);
    await this.mail.send(
      user.email,
      `Your ${product.brand} gift card code`,
      lines.join('\n'),
    );
  }

  /** Fire-and-forget ops alert; failures never touch the order flow. */
  private async alert(html: string): Promise<void> {
    try {
      await this.telegram.sendAlert(html);
    } catch {
      /* already logged inside the external */
    }
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
      .leftJoinAndSelect('o.product', 'product')
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
      redeem_instructions:
        order.product?.redeem_verbose ??
        order.product?.redeem_concise ??
        null,
      fulfilled_at: order.fulfilled_at,
    };
  }

  /** Cron: refreshes the catalog from the active vendor and prices it in coins. */
  async syncCatalog(): Promise<{ synced: number }> {
    const enabled = await this.settingsService.getBoolean(
      SettingKeys.GIFT_CARD_ENABLED,
    );
    if (!enabled) return { synced: 0 };

    const [items, coins_per_usd, markupPercent, provider_name] =
      await Promise.all([
        this.giftCardApiService.fetchCatalog(),
        this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
        this.settingsService.getNumber(SettingKeys.GIFT_CARD_MARKUP_PERCENT),
        this.giftCardApiService.activeVendorName(),
      ]);

    const markup = 1 + Math.max(0, markupPercent) / 100;
    const synced_at = new Date();

    // Redeem instructions are per brand, not per denomination — fetch each brand
    // once and reuse it across all of that brand's rows.
    const instructionsByBrand = await this.fetchInstructions(items);

    const payloads = items
      .filter((item) => item.external_product_id)
      .map((item) => {
        const ri = item.brand_ref
          ? instructionsByBrand.get(item.brand_ref)
          : null;
        return {
          provider_name,
          external_product_id: item.external_product_id,
          brand: item.brand,
          denomination: item.denomination,
          category: item.category,
          image_url: item.image_url,
          brand_ref: item.brand_ref,
          redeem_concise: ri?.concise ?? null,
          redeem_verbose: ri?.verbose ?? null,
          price_coins: Math.round(item.price_usd * markup * coins_per_usd),
          is_active: true,
          synced_at,
        };
      });

    // One INSERT ... ON CONFLICT per chunk instead of two queries per product.
    for (let start = 0; start < payloads.length; start += 500) {
      await this.products.upsert(payloads.slice(start, start + 500), [
        'provider_name',
        'external_product_id',
      ]);
    }
    return { synced: payloads.length };
  }

  private async fetchInstructions(
    items: { brand_ref: string | null }[],
  ): Promise<Map<string, { concise: string | null; verbose: string | null }>> {
    const byBrand = new Map<
      string,
      { concise: string | null; verbose: string | null }
    >();
    const brandRefs = [
      ...new Set(items.map((i) => i.brand_ref).filter((r): r is string => !!r)),
    ];
    for (const ref of brandRefs) {
      const ri = await this.giftCardApiService.redeemInstructions(ref);
      if (ri) byBrand.set(ref, ri);
    }
    return byBrand;
  }
}
