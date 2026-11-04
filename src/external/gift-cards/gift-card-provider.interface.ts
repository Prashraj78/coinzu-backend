/**
 * The gift-card vendor contract. One class per vendor implements this; the
 * registry picks the active one from config. Adding a vendor later = a new class
 * that implements this interface + registering it — nothing else changes.
 */

export type GiftCardOrderStatus = 'pending' | 'fulfilled' | 'failed';

/** One buyable card at a single fixed denomination (Amazon US $5, $10, …). */
export interface GiftCardCatalogItem {
  external_product_id: string;
  brand: string;
  denomination: string;
  category: string | null;
  image_url: string | null;
  price_usd: number;
  /** Vendor's brand id, used to fetch redeem instructions. */
  brand_ref: string | null;
}

export interface GiftCardPurchaseResult {
  provider_order_id: string;
  status: GiftCardOrderStatus;
  code: string | null;
  failure_reason: string | null;
}

export interface GiftCardRedeemInstruction {
  concise: string | null;
  verbose: string | null;
}

export interface GiftCardProvider {
  /** Stable key stored on product rows + in config (e.g. 'reloadly'). */
  readonly name: string;

  /** Every buyable card for the configured market, one row per denomination. */
  fetchCatalog(): Promise<GiftCardCatalogItem[]>;

  /** Place an order. `reference` is our order id, for idempotency/tracing. */
  purchase(
    external_product_id: string,
    reference: string,
  ): Promise<GiftCardPurchaseResult>;

  /** Re-read an order's status/code (used to poll pending orders). */
  fetchOrder(provider_order_id: string): Promise<GiftCardPurchaseResult>;

  /** How the recipient redeems the card. Null if the vendor has none. */
  redeemInstructions(
    brand_ref: string,
  ): Promise<GiftCardRedeemInstruction | null>;
}

/** DI token for the set of registered providers. */
export const GIFT_CARD_PROVIDERS = Symbol('GIFT_CARD_PROVIDERS');
