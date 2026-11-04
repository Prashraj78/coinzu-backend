import { Inject, Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../../modules/settings/settings.service';
import { SettingKeys } from '../../modules/settings/setting.keys';
import {
  GIFT_CARD_PROVIDERS,
  GiftCardProvider,
} from './gift-card-provider.interface';

/**
 * Picks the active gift-card vendor at runtime. The active vendor is an
 * app_setting (editable from the admin Configuration tab), so switching vendors
 * is a config change, not a deploy. Falls back to the first registered provider.
 */
@Injectable()
export class GiftCardProviderRegistry {
  private readonly logger = new Logger(GiftCardProviderRegistry.name);
  private readonly byName = new Map<string, GiftCardProvider>();

  constructor(
    @Inject(GIFT_CARD_PROVIDERS) providers: GiftCardProvider[],
    private readonly settings: SettingsService,
  ) {
    for (const p of providers) this.byName.set(p.name, p);
  }

  /** The vendor named by the `gift_card_active_vendor` setting. */
  async active(): Promise<GiftCardProvider> {
    const name = await this.settings.getString(
      SettingKeys.GIFT_CARD_ACTIVE_VENDOR,
    );
    const provider = this.byName.get(name);
    if (provider) return provider;
    const first = this.byName.values().next().value as
      | GiftCardProvider
      | undefined;
    if (!first) throw new Error('No gift-card provider is registered.');
    this.logger.warn(
      `Gift-card vendor "${name}" is not registered; using "${first.name}".`,
    );
    return first;
  }

  /** The vendor names available to choose from (for the admin dropdown). */
  available(): string[] {
    return [...this.byName.keys()];
  }
}
