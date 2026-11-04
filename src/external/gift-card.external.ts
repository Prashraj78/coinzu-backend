import { Injectable } from '@nestjs/common';
import { GiftCardProviderRegistry } from './gift-cards/gift-card-provider.registry';
import {
  GiftCardCatalogItem,
  GiftCardPurchaseResult,
  GiftCardRedeemInstruction,
} from './gift-cards/gift-card-provider.interface';

export type {
  GiftCardCatalogItem,
  GiftCardPurchaseResult,
  GiftCardRedeemInstruction,
  GiftCardOrderStatus,
} from './gift-cards/gift-card-provider.interface';

/**
 * Facade over whichever gift-card vendor is active. Callers depend on this; the
 * concrete vendor is resolved per-call from config via the registry, so the
 * redeem flow never names a vendor.
 */
@Injectable()
export class GiftCardExternal {
  constructor(private readonly registry: GiftCardProviderRegistry) {}

  async fetchCatalog(): Promise<GiftCardCatalogItem[]> {
    return (await this.registry.active()).fetchCatalog();
  }

  async purchase(
    external_product_id: string,
    reference: string,
  ): Promise<GiftCardPurchaseResult> {
    return (await this.registry.active()).purchase(
      external_product_id,
      reference,
    );
  }

  async fetchOrder(
    provider_order_id: string,
  ): Promise<GiftCardPurchaseResult> {
    return (await this.registry.active()).fetchOrder(provider_order_id);
  }

  async redeemInstructions(
    brand_ref: string,
  ): Promise<GiftCardRedeemInstruction | null> {
    return (await this.registry.active()).redeemInstructions(brand_ref);
  }

  async activeVendorName(): Promise<string> {
    return (await this.registry.active()).name;
  }

  availableVendors(): string[] {
    return this.registry.available();
  }
}
