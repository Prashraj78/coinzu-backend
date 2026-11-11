import { Injectable } from '@nestjs/common';
import {
  GiftCardProviderRegistry,
  GiftCardVendorPlan,
} from './gift-cards/gift-card-provider.registry';
import {
  GiftCardCatalogItem,
  GiftCardPurchaseResult,
  GiftCardRedeemInstruction,
} from './gift-cards/gift-card-provider.interface';
import { PhazeProvider } from './gift-cards/phaze.provider';

export type {
  GiftCardCatalogItem,
  GiftCardPurchaseResult,
  GiftCardRedeemInstruction,
  GiftCardOrderStatus,
} from './gift-cards/gift-card-provider.interface';
export type { GiftCardVendorPlan } from './gift-cards/gift-card-provider.registry';

/**
 * Facade over the gift-card vendors. Every call names its vendor: a product and
 * an order belong to the vendor that issued them, whatever is primary today.
 */
@Injectable()
export class GiftCardExternal {
  constructor(
    private readonly registry: GiftCardProviderRegistry,
    private readonly phaze: PhazeProvider,
  ) {}

  fetchCatalog(vendor: string): Promise<GiftCardCatalogItem[]> {
    return this.registry.get(vendor).fetchCatalog();
  }

  purchase(
    vendor: string,
    external_product_id: string,
    reference: string,
  ): Promise<GiftCardPurchaseResult> {
    return this.registry.get(vendor).purchase(external_product_id, reference);
  }

  fetchOrder(
    vendor: string,
    provider_order_id: string,
  ): Promise<GiftCardPurchaseResult> {
    return this.registry.get(vendor).fetchOrder(provider_order_id);
  }

  redeemInstructions(
    vendor: string,
    brand_ref: string,
  ): Promise<GiftCardRedeemInstruction | null> {
    return this.registry.get(vendor).redeemInstructions(brand_ref);
  }

  plan(): Promise<GiftCardVendorPlan> {
    return this.registry.plan();
  }

  availableVendors(): string[] {
    return this.registry.available();
  }

  phazeAccountStatus() {
    return this.phaze.accountStatus();
  }

  registerPhazeWebhook(url: string) {
    return this.phaze.registerWebhook(url);
  }

  isAuthenticPhazeWebhook(
    headers: Record<string, string | string[] | undefined>,
  ) {
    return this.phaze.isAuthenticWebhook(headers);
  }
}
