import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { createHash } from 'crypto';
import { Env } from '../../common/config/env';
import {
  GiftCardCatalogItem,
  GiftCardOrderStatus,
  GiftCardProvider,
  GiftCardPurchaseResult,
  GiftCardRedeemInstruction,
} from './gift-card-provider.interface';

const CATALOG_TIMEOUT_MS = 20000;
const ORDER_TIMEOUT_MS = 30000;
const MAX_CATALOG_PAGES = 100;
// Preset amounts offered for sliding-range products (no fixed denominations).
const RANGE_PRESETS = [5, 10, 25, 50, 100];
const MARKET_CURRENCY = 'USD';

type PhazeBrand = {
  brandName?: string;
  currency?: string;
  denominations?: number[];
  valueRestrictions?: { minVal?: number; maxVal?: number };
  productId?: number | string;
  productImage?: string;
  howToUse?: string;
  expiryAndValidity?: string;
  termsAndConditions?: string;
  categories?: string[] | string;
  deliveryFeeInPercentage?: number | string;
};

type PhazeVoucher = {
  code?: string;
  pin?: string;
  url?: string;
  validityDate?: string;
  ValidityDate?: string;
};

/**
 * Phaze gift-card vendor. Every request is signed with
 * sha256(method + pathWithQuery + requestSecret + compactJsonBody). Orders are
 * keyed by our own order id (`orderId`), which is also how they are looked up.
 */
@Injectable()
export class PhazeProvider implements GiftCardProvider {
  readonly name = 'phaze';
  private readonly logger = new Logger(PhazeProvider.name);

  async fetchCatalog(): Promise<GiftCardCatalogItem[]> {
    const country = encodeURIComponent(Env.giftCard.phaze.country);
    const items: GiftCardCatalogItem[] = [];
    for (let page = 1; page <= MAX_CATALOG_PAGES; page++) {
      const body = await this.request<{
        brands?: PhazeBrand[];
        perPage?: number;
        totalCount?: number;
      }>(
        'GET',
        `/brands/country/${country}?currentPage=${page}`,
        undefined,
        CATALOG_TIMEOUT_MS,
      );
      const brands = Array.isArray(body.brands) ? body.brands : [];
      for (const brand of brands) items.push(...this.expand(brand));
      const perPage = Number(body.perPage) || brands.length;
      if (!brands.length || page * perPage >= Number(body.totalCount ?? 0))
        break;
    }
    return items;
  }

  async purchase(
    external_product_id: string,
    reference: string,
  ): Promise<GiftCardPurchaseResult> {
    // external_product_id is "<productId>:<price>" (see expand).
    const [productId, price] = external_product_id.split(':');
    const body = {
      orderId: reference,
      productId: Number(productId),
      price: Number(price),
      externalUserId: reference,
    };
    try {
      const res = await this.request<Record<string, unknown>>(
        'POST',
        '/purchase',
        body,
        ORDER_TIMEOUT_MS,
      );
      return this.toResult(reference, res);
    } catch (err) {
      // A timeout or a duplicate orderId may mean Phaze did take the order, so
      // ask before reporting it failed — a false "failed" would refund and
      // could trigger a second purchase on the fallback vendor.
      const status = (err as AxiosError).response?.status;
      const maybeTaken =
        axios.isAxiosError(err) &&
        (!status || status >= 500 || this.isDuplicate(err));
      if (maybeTaken) return this.fetchOrder(reference);
      return {
        provider_order_id: reference,
        status: 'failed',
        code: null,
        failure_reason: this.errorText(err),
      };
    }
  }

  async fetchOrder(provider_order_id: string): Promise<GiftCardPurchaseResult> {
    try {
      const res = await this.request<Record<string, unknown>>(
        'GET',
        `/transaction/${encodeURIComponent(provider_order_id)}`,
        undefined,
        CATALOG_TIMEOUT_MS,
      );
      return this.toResult(provider_order_id, res);
    } catch (err) {
      const res = (err as AxiosError).response;
      // A failed transaction is returned as HTTP 400 with the full body.
      const data = res?.data as Record<string, unknown> | undefined;
      if (res?.status === 400 && data?.status) {
        return this.toResult(provider_order_id, data);
      }
      // Unknown orderId: Phaze never took it, so it is safe to call it failed.
      if (res?.status === 404) {
        return {
          provider_order_id,
          status: 'failed',
          code: null,
          failure_reason: this.errorText(err),
        };
      }
      return {
        provider_order_id,
        status: 'pending',
        code: null,
        failure_reason: this.errorText(err),
      };
    }
  }

  /** Phaze ships redeem steps inside the catalogue; see `expand`. */
  redeemInstructions(): Promise<GiftCardRedeemInstruction | null> {
    return Promise.resolve(null);
  }

  /** Prefunded balance, for the admin vendor panel. */
  async accountStatus(): Promise<{ balance: string; currency: string } | null> {
    try {
      const res = await this.request<{
        account?: { balance?: string | number; baseCurrency?: string };
      }>('GET', '/accountstatus', undefined, CATALOG_TIMEOUT_MS);
      if (!res.account) return null;
      return {
        balance: String(res.account.balance ?? ''),
        currency: String(res.account.baseCurrency ?? ''),
      };
    } catch (err) {
      this.logger.warn(`Phaze account status failed: ${this.errorText(err)}`);
      return null;
    }
  }

  /** Points Phaze's status webhook at `url`, replacing any earlier registration. */
  async registerWebhook(url: string): Promise<{ id: string; url: string }> {
    const existing = await this.request<Array<{ id: number; url: string }>>(
      'GET',
      '/webhooks',
      undefined,
      CATALOG_TIMEOUT_MS,
    );
    for (const hook of Array.isArray(existing) ? existing : []) {
      if (hook.url === url) {
        await this.request(
          'DELETE',
          `/webhooks/${hook.id}`,
          undefined,
          CATALOG_TIMEOUT_MS,
        );
      }
    }
    const created = await this.request<{ id: number; url: string }>(
      'POST',
      '/webhooks',
      {
        url,
        apiKey: Env.giftCard.phaze.webhookSecret,
        authorizationHeaderName: Env.giftCard.phaze.webhookHeader,
      },
      CATALOG_TIMEOUT_MS,
    );
    return { id: String(created.id), url: created.url };
  }

  /** True when an inbound webhook carries the secret we registered. */
  isAuthenticWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const expected = Env.giftCard.phaze.webhookSecret;
    const got = headers[Env.giftCard.phaze.webhookHeader.toLowerCase()];
    const value = Array.isArray(got) ? got[0] : got;
    if (!expected || !value) return false;
    const a = createHash('sha256').update(value).digest();
    const b = createHash('sha256').update(expected).digest();
    return a.equals(b);
  }

  /** One catalogue row per buyable USD amount, keyed "<productId>:<price>". */
  private expand(brand: PhazeBrand): GiftCardCatalogItem[] {
    if (brand.productId == null) return [];
    if (String(brand.currency ?? '').toUpperCase() !== MARKET_CURRENCY)
      return [];

    const howToUse = this.plainText(brand.howToUse);
    const validity = this.plainText(brand.expiryAndValidity);
    const terms = this.plainText(brand.termsAndConditions);
    const verbose = [
      howToUse,
      validity ? `Validity: ${validity}` : '',
      terms ? `Terms: ${terms}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Phaze adds this fee on top of face value, so it is part of our cost.
    const fee = Math.max(0, Number(brand.deliveryFeeInPercentage) || 0);
    const categories = Array.isArray(brand.categories)
      ? brand.categories
      : brand.categories
        ? [brand.categories]
        : [];
    const category = categories.find((c) => c && c !== 'others') ?? null;

    return this.amounts(brand).map((amount) => ({
      external_product_id: `${brand.productId}:${amount}`,
      brand: String(brand.brandName ?? 'Gift Card').trim(),
      denomination: `$${amount}`,
      category: category
        ? category
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (ch) => ch.toUpperCase())
            .slice(0, 60)
        : null,
      image_url: brand.productImage ? String(brand.productImage) : null,
      price_usd: Math.round(amount * (1 + fee / 100) * 100) / 100,
      brand_ref: String(brand.productId),
      redeem: {
        concise: howToUse || validity || null,
        verbose: verbose || null,
      },
    }));
  }

  private amounts(brand: PhazeBrand): number[] {
    // Phaze sometimes repeats an amount ([9.99, 9.99]); one row per amount.
    const fixed = [
      ...new Set((brand.denominations ?? []).map(Number).filter((n) => n > 0)),
    ];
    if (fixed.length) return fixed;
    const min = Number(brand.valueRestrictions?.minVal ?? 0);
    const max = Number(brand.valueRestrictions?.maxVal ?? 0);
    if (!(min > 0) || !(max >= min)) return [];
    return RANGE_PRESETS.filter((a) => a >= min && a <= max);
  }

  private toResult(
    orderId: string,
    body: Record<string, unknown>,
  ): GiftCardPurchaseResult {
    const status = this.readStatus(String(body.status ?? 'pending'));
    const vouchers = Array.isArray(body.vouchers)
      ? (body.vouchers as PhazeVoucher[])
      : [];
    const code = status === 'fulfilled' ? this.readVoucher(vouchers[0]) : null;
    return {
      provider_order_id: orderId,
      // A processed order with no voucher yet stays pending for the poller.
      status: status === 'fulfilled' && !code ? 'pending' : status,
      code,
      failure_reason:
        status === 'failed'
          ? String(body.error ?? 'Phaze rejected the order.')
          : null,
    };
  }

  private readStatus(value: string): GiftCardOrderStatus {
    const v = value.toLowerCase();
    if (v === 'processed') return 'fulfilled';
    if (v === 'failed') return 'failed';
    return 'pending';
  }

  private readVoucher(v: PhazeVoucher | undefined): string | null {
    if (!v) return null;
    const parts: string[] = [];
    if (v.code) parts.push(`Card: ${v.code}`);
    if (v.pin) parts.push(`PIN: ${v.pin}`);
    if (v.url) parts.push(`Redeem at: ${v.url}`);
    const validity = v.validityDate ?? v.ValidityDate;
    if (parts.length && validity && !validity.startsWith('1970')) {
      parts.push(`Valid until: ${validity.slice(0, 10)}`);
    }
    return parts.join('\n') || null;
  }

  /** Phaze sends HTML, sometimes entity-escaped twice; flatten it to plain text. */
  private plainText(html: string | undefined): string {
    if (!html) return '';
    let text = html;
    for (let i = 0; i < 2; i++) {
      text = text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
        .replace(/&ldquo;|&rdquo;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
    }
    return text
      .replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/[ \t\r]+/g, ' ')
      .replace(/\n\s*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private isDuplicate(err: unknown): boolean {
    const data = (err as AxiosError).response?.data as
      Record<string, unknown> | undefined;
    return /duplicate orderid/i.test(String(data?.error ?? ''));
  }

  /** Signed request; the signed body string is exactly what is sent. */
  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    pathWithQuery: string,
    body: unknown,
    timeout: number,
  ): Promise<T> {
    const { apiKey, requestSecret, baseUrl } = Env.giftCard.phaze;
    if (!apiKey || !requestSecret) {
      throw new Error('Phaze credentials are not configured.');
    }
    const payload = body === undefined ? '' : JSON.stringify(body);
    const base = new URL(baseUrl);
    const signedPath = `${base.pathname.replace(/\/$/, '')}${pathWithQuery}`;
    const signature = createHash('sha256')
      .update(
        `${method}${decodeURIComponent(signedPath)}${requestSecret}${payload}`,
      )
      .digest('hex');
    const res = await axios.request<T>({
      method,
      url: `${base.origin}${signedPath}`,
      data: payload || undefined,
      headers: {
        'API-Key': apiKey,
        Signature: signature,
        Accept: 'application/json',
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
      timeout,
      transformRequest: [(d: unknown) => d],
    });
    return res.data;
  }

  private errorText(err: unknown): string {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as Record<string, unknown> | undefined;
      return String(data?.error ?? data?.message ?? err.message);
    }
    return err instanceof Error ? err.message : 'Provider request failed.';
  }
}
