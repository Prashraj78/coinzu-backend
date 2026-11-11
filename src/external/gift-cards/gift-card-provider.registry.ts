import { Inject, Injectable } from '@nestjs/common';
import { SettingsService } from '../../modules/settings/settings.service';
import { SettingKeys } from '../../modules/settings/setting.keys';
import {
  GIFT_CARD_PROVIDERS,
  GiftCardProvider,
} from './gift-card-provider.interface';

export interface GiftCardVendorPlan {
  primary: string;
  /** Null when the admin chose "none" or picked the primary again. */
  secondary: string | null;
  failover: boolean;
}

/**
 * Resolves vendors at runtime from app_settings (editable in the admin
 * Gift Cards tab), so switching or reordering vendors is a config change.
 */
@Injectable()
export class GiftCardProviderRegistry {
  private readonly byName = new Map<string, GiftCardProvider>();

  constructor(
    @Inject(GIFT_CARD_PROVIDERS) providers: GiftCardProvider[],
    private readonly settings: SettingsService,
  ) {
    for (const p of providers) this.byName.set(p.name, p);
  }

  get(name: string): GiftCardProvider {
    const provider = this.byName.get(name);
    if (!provider)
      throw new Error(`Gift-card vendor "${name}" is not registered.`);
    return provider;
  }

  async plan(): Promise<GiftCardVendorPlan> {
    const [primaryRaw, secondaryRaw, failover] = await Promise.all([
      this.settings.getString(SettingKeys.GIFT_CARD_ACTIVE_VENDOR),
      this.settings.getString(SettingKeys.GIFT_CARD_SECONDARY_VENDOR),
      this.settings.getBoolean(SettingKeys.GIFT_CARD_FAILOVER_ENABLED),
    ]);
    const primary = this.byName.has(primaryRaw)
      ? primaryRaw
      : (this.byName.keys().next().value as string);
    const secondary =
      this.byName.has(secondaryRaw) && secondaryRaw !== primary
        ? secondaryRaw
        : null;
    return { primary, secondary, failover };
  }

  /** The vendor names available to choose from (for the admin dropdown). */
  available(): string[] {
    return [...this.byName.keys()];
  }
}
