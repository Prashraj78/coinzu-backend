import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
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
import {
  GiftCardExternal,
  GiftCardPurchaseResult,
  GiftCardVendorPlan,
} from '../../external/gift-card.external';
import { SendgridMailExternal } from '../../external/sendgrid-mail.external';
import { TelegramExternal } from '../../external/telegram.external';
import { ListProductsDto } from './dto/list-products.dto';
import { AdminListProductsDto } from './dto/admin-list-products.dto';

/** Same card across vendors: brand without vendor noise + face value in cents. */
export function giftCardMatchKey(
  brand: string,
  price_usd: number,
): string | null {
  const name = brand
    .toLowerCase()
    .replace(/\.com\b/g, ' ')
    .replace(
      /\b(e-?gift|gift ?cards?|giftcards?|e-?cards?|cards?|vouchers?|codes?|digital|online|usd|usa|us|united states)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9]+/g, '');
  if (!name || !(price_usd > 0)) return null;
  return `${name}|${Math.round(price_usd * 100)}`;
}

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
    const builder = this.products.createQueryBuilder('p');
    this.storefront(builder, await this.giftCardApiService.plan());

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

    if (query.provider) {
      builder.andWhere('p.provider_name = :provider', {
        provider: query.provider,
      });
    }
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

  /** Per-vendor catalogue size and freshness, for the admin vendor cards. */
  async catalogueStats(): Promise<
    Record<
      string,
      { total: number; active: number; last_synced_at: Date | null }
    >
  > {
    const rows = await this.products
      .createQueryBuilder('p')
      .select('p.provider_name', 'provider')
      .addSelect('COUNT(*)::int', 'total')
      .addSelect('COUNT(*) FILTER (WHERE p.is_active)::int', 'active')
      .addSelect('MAX(p.synced_at)', 'last_synced_at')
      .groupBy('p.provider_name')
      .getRawMany<{
        provider: string;
        total: number;
        active: number;
        last_synced_at: Date | null;
      }>();
    return Object.fromEntries(
      rows.map(({ provider, ...rest }) => [provider, rest]),
    );
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
    const builder = this.products.createQueryBuilder('p');
    this.storefront(builder, await this.giftCardApiService.plan());
    const rows = await builder
      .select('DISTINCT p.category', 'category')
      .andWhere('p.category IS NOT NULL')
      .getRawMany();
    return rows.map((row) => row.category as string);
  }

  /**
   * What users can buy: the primary vendor's active cards, plus secondary cards
   * for a brand + amount the primary does not offer — never the same card twice.
   */
  private storefront(
    builder: SelectQueryBuilder<GiftCardProduct>,
    plan: GiftCardVendorPlan,
  ): void {
    builder.where('p.is_active = true');
    if (!plan.secondary) {
      builder.andWhere('p.provider_name = :primary', { primary: plan.primary });
      return;
    }
    builder.andWhere(
      `(p.provider_name = :primary OR (p.provider_name = :secondary AND (p.match_key IS NULL OR NOT EXISTS (
         SELECT 1 FROM gift_card_products q
          WHERE q.provider_name = :primary AND q.is_active = true AND q.match_key = p.match_key))))`,
      { primary: plan.primary, secondary: plan.secondary },
    );
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
    const [product, plan] = await Promise.all([
      this.getProductOrFail(product_id),
      this.giftCardApiService.plan(),
    ]);
    const vendorLive = [plan.primary, plan.secondary].includes(
      product.provider_name,
    );
    if (!product.is_active || !vendorLive) {
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
        provider_name: product.provider_name,
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

  /**
   * Buys from the product's vendor; if that vendor rejects the order outright
   * and failover is on, buys the same brand + amount from the other vendor.
   * A pending order is never retried elsewhere — it may still be issued.
   * Never throws.
   */
  async fulfill(order: GiftCardOrder, product: GiftCardProduct): Promise<void> {
    let result = await this.attempt(
      order,
      product.provider_name,
      product.external_product_id,
    );

    if (result.status === 'failed') {
      const plan = await this.giftCardApiService.plan();
      const alt = plan.failover ? await this.alternative(product, plan) : null;
      if (alt) {
        const first = `${product.provider_name}: ${result.failure_reason ?? 'rejected'}`;
        await this.alert(
          `🔁 <b>Gift card failover</b>\norder <code>${order.cz_gift_card_order_id}</code> — ${this.telegram.escape(first)} → retrying on ${alt.provider_name}`,
        );
        const second = await this.attempt(
          order,
          alt.provider_name,
          alt.external_product_id,
        );
        result =
          second.status === 'failed'
            ? {
                ...second,
                failure_reason: `${first}; ${alt.provider_name}: ${second.failure_reason ?? 'rejected'}`,
              }
            : second;
      }
    }

    this.applyResult(order, result.status, result.code, result.failure_reason);
    await this.orders.save(order);
    if (order.status === 'failed') await this.refund(order);
    if (order.status === 'fulfilled') await this.notifyReady(order, product);
  }

  private async attempt(
    order: GiftCardOrder,
    vendor: string,
    external_product_id: string,
  ): Promise<GiftCardPurchaseResult> {
    order.provider_name = vendor;
    order.provider_order_id = null;
    try {
      const result = await this.giftCardApiService.purchase(
        vendor,
        external_product_id,
        order.cz_gift_card_order_id,
      );
      order.provider_order_id = result.provider_order_id || null;

      // Reloadly accepts as SUCCESSFUL but issues the code on another endpoint.
      if (
        result.status === 'fulfilled' &&
        !result.code &&
        order.provider_order_id
      ) {
        const card = await this.giftCardApiService.fetchOrder(
          vendor,
          order.provider_order_id,
        );
        return {
          ...result,
          code: card.code,
          status: card.code ? 'fulfilled' : 'pending',
        };
      }
      return result;
    } catch (error) {
      this.logger.error(
        `Gift card purchase on ${vendor} failed: ${String(error)}`,
      );
      return {
        provider_order_id: '',
        status: 'failed',
        code: null,
        failure_reason: 'Provider request failed.',
      };
    }
  }

  /**
   * The same brand + amount at the other configured vendor. Store visibility is
   * ignored on purpose: a curated store hides the backup's duplicates, but the
   * backup must still be able to fulfil the card the user already bought.
   */
  private async alternative(
    product: GiftCardProduct,
    plan: GiftCardVendorPlan,
  ): Promise<GiftCardProduct | null> {
    const other = [plan.primary, plan.secondary].find(
      (v): v is string => !!v && v !== product.provider_name,
    );
    if (!other || !product.match_key) return null;
    return this.products.findOne({
      where: { provider_name: other, match_key: product.match_key },
      order: { price_coins: 'ASC' },
    });
  }

  /** Phaze webhook: re-reads the order from the vendor rather than trusting the payload. */
  async handleVendorWebhook(
    vendor: string,
    provider_order_id: string,
  ): Promise<void> {
    const order = await this.orders.findOne({
      where: { provider_name: vendor, provider_order_id, status: 'pending' },
      relations: { product: true },
    });
    if (order) await this.pollOne(order);
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
      const vendor = order.provider_name ?? order.product?.provider_name;
      if (!vendor) return;
      const result = await this.giftCardApiService.fetchOrder(
        vendor,
        order.provider_order_id as string,
      );
      if (result.status === 'pending') return;

      this.applyResult(
        order,
        result.status,
        result.code,
        result.failure_reason,
      );
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
        order.product?.redeem_verbose ?? order.product?.redeem_concise ?? null,
      fulfilled_at: order.fulfilled_at,
    };
  }

  /** Cron: refreshes the primary and secondary catalogues and prices them in coins. */
  async syncCatalog(): Promise<{
    synced: number;
    vendors: Record<string, number>;
    errors: string[];
  }> {
    const enabled = await this.settingsService.getBoolean(
      SettingKeys.GIFT_CARD_ENABLED,
    );
    if (!enabled) return { synced: 0, vendors: {}, errors: [] };

    const [coins_per_usd, markupPercent, plan] = await Promise.all([
      this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
      this.settingsService.getNumber(SettingKeys.GIFT_CARD_MARKUP_PERCENT),
      this.giftCardApiService.plan(),
    ]);
    const markup = 1 + Math.max(0, markupPercent) / 100;
    const vendors: Record<string, number> = {};
    const errors: string[] = [];

    for (const vendor of [plan.primary, plan.secondary].filter(
      (v): v is string => !!v,
    )) {
      try {
        vendors[vendor] = await this.syncVendor(vendor, coins_per_usd, markup);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Gift card catalogue sync for ${vendor} failed: ${detail}`,
        );
        errors.push(`${vendor}: ${detail}`);
      }
    }
    // Nothing synced at all is a real failure; one vendor down is not.
    if (!Object.keys(vendors).length && errors.length) {
      throw new Error(errors.join('; '));
    }
    const synced = Object.values(vendors).reduce((a, b) => a + b, 0);
    return { synced, vendors, errors };
  }

  private async syncVendor(
    provider_name: string,
    coins_per_usd: number,
    markup: number,
  ): Promise<number> {
    const items = await this.giftCardApiService.fetchCatalog(provider_name);
    const synced_at = new Date();
    // Instructions are per brand: inline when the catalogue has them, else one call per brand.
    const instructionsByBrand = await this.fetchInstructions(
      provider_name,
      items.filter((i) => i.redeem === undefined),
    );

    // One row per id: a repeat inside one upsert batch makes Postgres reject the batch.
    const unique = [
      ...new Map(
        items
          .filter((item) => item.external_product_id)
          .map((item) => [item.external_product_id, item]),
      ).values(),
    ];
    const payloads = unique.map((item) => {
      const ri =
        item.redeem !== undefined
          ? item.redeem
          : item.brand_ref
            ? instructionsByBrand.get(item.brand_ref)
            : null;
      return {
        provider_name,
        external_product_id: item.external_product_id,
        brand: item.brand,
        denomination: item.denomination,
        // Face value, not price: a vendor fee must not split the same card.
        match_key: giftCardMatchKey(
          item.brand,
          Number(item.denomination.replace(/[^0-9.]/g, '')) || item.price_usd,
        ),
        category: item.category,
        image_url: item.image_url,
        brand_ref: item.brand_ref,
        redeem_concise: ri?.concise ?? null,
        redeem_verbose: ri?.verbose ?? null,
        price_coins: Math.round(item.price_usd * markup * coins_per_usd),
        synced_at,
      };
    });

    // Existing rows keep their admin-set visibility; brand-new rows go live only
    // when auto-publish is on, so a curated store is not flooded by a sync.
    const [existing, autoPublish] = await Promise.all([
      this.products.find({
        where: { provider_name },
        select: { external_product_id: true },
      }),
      this.settingsService.getBoolean(SettingKeys.GIFT_CARD_AUTO_PUBLISH),
    ]);
    const known = new Set(existing.map((p) => p.external_product_id));
    const batches = [
      payloads.filter((p) => known.has(p.external_product_id)),
      payloads
        .filter((p) => !known.has(p.external_product_id))
        .map((p) => ({ ...p, is_active: autoPublish })),
    ];
    for (const batch of batches) {
      for (let start = 0; start < batch.length; start += 500) {
        await this.products.upsert(batch.slice(start, start + 500), [
          'provider_name',
          'external_product_id',
        ]);
      }
    }
    return payloads.length;
  }

  private async fetchInstructions(
    vendor: string,
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
      const ri = await this.giftCardApiService.redeemInstructions(vendor, ref);
      if (ri) byBrand.set(ref, ri);
    }
    return byBrand;
  }
}
