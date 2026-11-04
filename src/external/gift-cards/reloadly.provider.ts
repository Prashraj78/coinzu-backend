import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Env } from '../../common/config/env';
import {
  GiftCardCatalogItem,
  GiftCardProvider,
  GiftCardPurchaseResult,
  GiftCardRedeemInstruction,
  GiftCardOrderStatus,
} from './gift-card-provider.interface';

const CATALOG_TIMEOUT_MS = 20000;
const ORDER_TIMEOUT_MS = 30000;
const AUTH_TIMEOUT_MS = 15000;
// US-only market for now; the user's coin balance maps to USD.
const MARKET_COUNTRY = 'US';
// Refresh the token a little before it actually expires.
const TOKEN_SKEW_MS = 60_000;
// Preset amounts offered for RANGE products (those without a fixed list).
const RANGE_PRESETS = [5, 10, 25, 50, 100];

/**
 * Reloadly gift-card vendor. Owns its OAuth token exchange, request building and
 * response parsing — a Reloadly JSON change touches only this file. Catalog is
 * expanded to one item per FIXED denomination so each buyable amount is a row.
 */
@Injectable()
export class ReloadlyProvider implements GiftCardProvider {
  readonly name = 'reloadly';
  private readonly logger = new Logger(ReloadlyProvider.name);
  private token: { value: string; expiresAt: number } | null = null;

  async fetchCatalog(): Promise<GiftCardCatalogItem[]> {
    const url = `${Env.giftCard.reloadly.baseUrl}/countries/${MARKET_COUNTRY}/products`;
    const res = await axios.get(url, {
      headers: await this.authHeaders(),
      timeout: CATALOG_TIMEOUT_MS,
    });
    const rows = Array.isArray(res.data) ? res.data : [];
    const items: GiftCardCatalogItem[] = [];
    for (const row of rows as Record<string, unknown>[]) {
      items.push(...this.expandDenominations(row));
    }
    return items;
  }

  async purchase(
    external_product_id: string,
    reference: string,
  ): Promise<GiftCardPurchaseResult> {
    // external_product_id is "<productId>:<unitPrice>" (see expandDenominations).
    const [productId, unitPrice] = external_product_id.split(':');
    const body = {
      productId: Number(productId),
      countryCode: MARKET_COUNTRY,
      quantity: 1,
      unitPrice: Number(unitPrice),
      customIdentifier: reference,
      senderName: Env.sendgrid.fromName,
    };
    try {
      const res = await axios.post(
        `${Env.giftCard.reloadly.baseUrl}/orders`,
        body,
        { headers: await this.authHeaders(), timeout: ORDER_TIMEOUT_MS },
      );
      return this.toPurchaseResult(res.data);
    } catch (err) {
      return {
        provider_order_id: '',
        status: 'failed',
        code: null,
        failure_reason: this.errorText(err),
      };
    }
  }

  async fetchOrder(
    provider_order_id: string,
  ): Promise<GiftCardPurchaseResult> {
    // Reloadly exposes the issued code via the transaction's card endpoint.
    const url = `${Env.giftCard.reloadly.baseUrl}/orders/transactions/${provider_order_id}/cards`;
    try {
      const res = await axios.get(url, {
        headers: await this.authHeaders(),
        timeout: CATALOG_TIMEOUT_MS,
      });
      const cards = Array.isArray(res.data) ? res.data : [];
      const code = this.readCardCode(cards[0]);
      return {
        provider_order_id,
        status: code ? 'fulfilled' : 'pending',
        code,
        failure_reason: null,
      };
    } catch (err) {
      return {
        provider_order_id,
        status: 'pending',
        code: null,
        failure_reason: this.errorText(err),
      };
    }
  }

  async redeemInstructions(
    brand_ref: string,
  ): Promise<GiftCardRedeemInstruction | null> {
    const url = `${Env.giftCard.reloadly.baseUrl}/redeem-instructions/${brand_ref}`;
    try {
      const res = await axios.get(url, {
        headers: await this.authHeaders(),
        timeout: CATALOG_TIMEOUT_MS,
      });
      const body = (res.data ?? {}) as Record<string, unknown>;
      return {
        concise: body.concise ? String(body.concise) : null,
        verbose: body.verbose ? String(body.verbose) : null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Each USD amount of a Reloadly product becomes its own item. FIXED products
   * use their listed denominations; RANGE products (no fixed list, e.g. Amazon)
   * get a preset ladder of amounts that fall inside the allowed min–max.
   */
  private expandDenominations(
    row: Record<string, unknown>,
  ): GiftCardCatalogItem[] {
    const productId = row.productId;
    if (productId == null) return [];
    const currency = String(row.recipientCurrencyCode ?? 'USD');
    if (currency !== 'USD') return []; // US/USD market only for now.

    const brandObj = (row.brand ?? {}) as Record<string, unknown>;
    const brand = String(row.productName ?? brandObj.brandName ?? 'Gift Card');
    const brandRef = brandObj.brandId != null ? String(brandObj.brandId) : null;
    const logos = Array.isArray(row.logoUrls) ? (row.logoUrls as unknown[]) : [];
    const image = logos.length ? String(logos[0]) : null;
    const categoryObj = (row.category ?? {}) as Record<string, unknown>;
    const category = categoryObj.name ? String(categoryObj.name) : null;

    const amounts = this.denominationsFor(row);
    return amounts.map((amount) => ({
      external_product_id: `${productId}:${amount}`,
      brand,
      denomination: `$${amount}`,
      category,
      image_url: image,
      price_usd: amount,
      brand_ref: brandRef,
    }));
  }

  /** The buyable USD amounts for a product — fixed list, or a preset range ladder. */
  private denominationsFor(row: Record<string, unknown>): number[] {
    const fixed = Array.isArray(row.fixedRecipientDenominations)
      ? (row.fixedRecipientDenominations as unknown[])
          .map((d) => Number(d))
          .filter((amount) => amount > 0)
      : [];
    if (fixed.length) return fixed;

    // RANGE product: offer the preset ladder, clamped to the allowed min–max.
    const min = Number(row.minRecipientDenomination ?? 0);
    const max = Number(row.maxRecipientDenomination ?? 0);
    if (!(min > 0) || !(max >= min)) return [];
    return RANGE_PRESETS.filter((a) => a >= min && a <= max);
  }

  private toPurchaseResult(payload: unknown): GiftCardPurchaseResult {
    const body = (payload ?? {}) as Record<string, unknown>;
    const id = body.transactionId;
    return {
      provider_order_id: id != null ? String(id) : '',
      status: this.readStatus(String(body.status ?? 'pending').toLowerCase()),
      code: null, // code is fetched separately via fetchOrder.
      failure_reason: null,
    };
  }

  private readStatus(value: string): GiftCardOrderStatus {
    if (value === 'successful' || value === 'success') return 'fulfilled';
    if (value === 'failed' || value === 'refunded') return 'failed';
    return 'pending';
  }

  private readCardCode(card: unknown): string | null {
    const c = (card ?? {}) as Record<string, unknown>;
    const number = c.cardNumber ? String(c.cardNumber) : '';
    const pin = c.pinCode ? String(c.pinCode) : '';
    const url = c.redemptionUrl ? String(c.redemptionUrl) : '';
    // A card is a number and/or a PIN, sometimes with a redemption link. Some
    // products put a URL in cardNumber — keep the PIN as the code then.
    const isUrl = (v: string) => /^https?:\/\//i.test(v);
    const parts: string[] = [];
    if (number && !isUrl(number)) parts.push(`Card: ${number}`);
    if (pin) parts.push(`PIN: ${pin}`);
    if (url || isUrl(number)) parts.push(`Redeem at: ${url || number}`);
    const code = parts.join('\n');
    return code || null;
  }

  /** Client-credentials token, cached until shortly before it expires. */
  private async authHeaders(): Promise<Record<string, string>> {
    const now = Date.now();
    if (!this.token || this.token.expiresAt - TOKEN_SKEW_MS <= now) {
      const res = await axios.post(
        Env.giftCard.reloadly.authUrl,
        {
          client_id: Env.giftCard.reloadly.clientId,
          client_secret: Env.giftCard.reloadly.clientSecret,
          grant_type: 'client_credentials',
          audience: Env.giftCard.reloadly.audience,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: AUTH_TIMEOUT_MS,
        },
      );
      const data = (res.data ?? {}) as Record<string, unknown>;
      const expiresIn = Number(data.expires_in ?? 86400);
      this.token = {
        value: String(data.access_token ?? ''),
        expiresAt: now + expiresIn * 1000,
      };
    }
    return {
      Authorization: `Bearer ${this.token.value}`,
      'Content-Type': 'application/json',
      Accept: 'application/com.reloadly.giftcards-v1+json',
    };
  }

  private errorText(err: unknown): string {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as Record<string, unknown> | undefined;
      const msg = data?.message ?? data?.error ?? err.message;
      return String(msg);
    }
    return 'Provider request failed.';
  }
}
