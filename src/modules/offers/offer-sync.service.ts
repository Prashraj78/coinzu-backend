import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from '../../database/entities/offer.entity';
import { OfferwallProvider } from '../../database/entities/offerwall-provider.entity';
import {
  OfferwallExternal,
  OfferwallOfferRow,
} from '../../external/offerwall.external';
import { ProvidersService } from './providers.service';

/** Grace window so rows written moments ago are not treated as stale. */
const UPSERT_CHUNK = 500;
const STALE_GRACE_MS = 60000;

@Injectable()
export class OfferSyncService {
  private readonly logger = new Logger(OfferSyncService.name);

  constructor(
    @InjectRepository(Offer)
    private readonly offers: Repository<Offer>,
    private readonly providersService: ProvidersService,
    private readonly offerwall: OfferwallExternal,
  ) {}

  /** Pulls one provider's offer list and upserts it into offers. */
  async syncProvider(provider_id: string): Promise<{ synced: number }> {
    const provider = await this.providersService.getWithSecrets(provider_id);
    const startedAt = new Date();
    const rows = await this.offerwall.fetchOffers({
      name: provider.name,
      base_api_url: provider.base_api_url,
      api_key: this.providersService.readApiKey(provider),
      offers_path: provider.macro_template.offers_path,
      offers_list_key: provider.macro_template.offers_list_key,
      offer_fields: provider.macro_template.offer_fields,
    });

    await this.upsertOffers(provider, rows, startedAt);
    if (rows.length > 0) {
      await this.deactivateMissing(provider_id, startedAt);
    }

    await this.providersService.markSynced(provider_id);
    this.logger.log(`Synced ${rows.length} offers from ${provider.name}.`);
    return { synced: rows.length };
  }

  /**
   * One INSERT ... ON CONFLICT per chunk instead of a find+save pair per
   * offer — a thousand-offer catalog syncs in a handful of statements.
   */
  private async upsertOffers(
    provider: OfferwallProvider,
    rows: OfferwallOfferRow[],
    syncedAt: Date,
  ): Promise<void> {
    const payloads: Partial<Offer>[] = rows.map((row) => ({
      ...row,
      provider_id: provider.cz_offerwall_provider_id,
      is_active: true,
      synced_at: syncedAt,
    }));

    for (let start = 0; start < payloads.length; start += UPSERT_CHUNK) {
      await this.offers.upsert(payloads.slice(start, start + UPSERT_CHUNK), [
        'provider_id',
        'external_offer_id',
      ]);
    }
  }

  /** Offers the provider stopped returning are switched off, never deleted. */
  private async deactivateMissing(
    provider_id: string,
    syncStartedAt: Date,
  ): Promise<void> {
    await this.offers
      .createQueryBuilder()
      .update(Offer)
      .set({ is_active: false })
      .where('provider_id = :provider_id', { provider_id })
      .andWhere('(synced_at IS NULL OR synced_at < :cutoff)', {
        cutoff: new Date(syncStartedAt.getTime() - STALE_GRACE_MS),
      })
      .execute();
  }
}
