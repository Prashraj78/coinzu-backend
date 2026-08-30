import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Env } from '../common/config/env';

export interface GiftCardCatalogItem {
  external_product_id: string;
  brand: string;
  denomination: string;
  category: string | null;
  image_url: string | null;
  price_usd: number;
}

export type GiftCardOrderStatus = 'pending' | 'fulfilled' | 'failed';

export interface GiftCardPurchaseResult {
  provider_order_id: string;
  status: GiftCardOrderStatus;
  code: string | null;
  failure_reason: string | null;
}

const CATALOG_TIMEOUT_MS = 20000;
const ORDER_TIMEOUT_MS = 30000;

/** The gift card vendor. Every request and every response shape lives here. */
@Injectable()
export class GiftCardExternal {
  private readonly logger = new Logger(GiftCardExternal.name);

  async fetchCatalog(): Promise<GiftCardCatalogItem[]> {
    const response = await axios.get(`${Env.giftCard.apiUrl}/products`, {
      headers: this.headers(),
      timeout: CATALOG_TIMEOUT_MS,
    });
    const rows = this.readRows(response.data);
    const items: GiftCardCatalogItem[] = [];
    for (const row of rows) items.push(this.toCatalogItem(row));
    return items;
  }

  async purchase(
    external_product_id: string,
    reference: string,
  ): Promise<GiftCardPurchaseResult> {
    const body = { product_id: external_product_id, reference };
    const response = await axios.post(`${Env.giftCard.apiUrl}/orders`, body, {
      headers: this.headers(),
      timeout: ORDER_TIMEOUT_MS,
    });
    return this.toPurchaseResult(response.data);
  }

  async fetchOrder(provider_order_id: string): Promise<GiftCardPurchaseResult> {
    const url = `${Env.giftCard.apiUrl}/orders/${provider_order_id}`;
    const response = await axios.get(url, {
      headers: this.headers(),
      timeout: CATALOG_TIMEOUT_MS,
    });
    return this.toPurchaseResult(response.data);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${Env.giftCard.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /** Vendors wrap their list in `data`, `products`, or nothing at all. */
  private readRows(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) return payload as Record<string, unknown>[];
    const body = (payload ?? {}) as Record<string, unknown>;
    if (Array.isArray(body.data)) return body.data as Record<string, unknown>[];
    if (Array.isArray(body.products)) {
      return body.products as Record<string, unknown>[];
    }
    this.logger.warn('Gift card catalog response had no recognisable list.');
    return [];
  }

  private toCatalogItem(row: Record<string, unknown>): GiftCardCatalogItem {
    return {
      external_product_id: String(row.id ?? row.product_id ?? ''),
      brand: String(row.brand ?? row.name ?? 'Gift Card'),
      denomination: String(row.denomination ?? row.value ?? ''),
      category: row.category ? String(row.category) : null,
      image_url: row.image_url ? String(row.image_url) : null,
      price_usd: Number(row.price ?? row.price_usd ?? 0),
    };
  }

  private toPurchaseResult(payload: unknown): GiftCardPurchaseResult {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      provider_order_id: String(body.id ?? body.order_id ?? ''),
      status: this.readStatus(String(body.status ?? 'pending').toLowerCase()),
      code: body.code ? String(body.code) : null,
      failure_reason: body.error ? String(body.error) : null,
    };
  }

  private readStatus(value: string): GiftCardOrderStatus {
    if (value === 'fulfilled' || value === 'complete' || value === 'success') {
      return 'fulfilled';
    }
    if (value === 'failed' || value === 'error' || value === 'cancelled') {
      return 'failed';
    }
    return 'pending';
  }
}
