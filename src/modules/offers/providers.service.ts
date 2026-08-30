import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferwallProvider } from '../../database/entities/offerwall-provider.entity';
import { CzOfferErrorCodes } from '../../common/errors/error.constants';
import { decryptText } from '../../common/utils/crypto.util';

const PROVIDER_CACHE_TTL_MS = 60_000;

/**
 * Providers are onboarded by inserting a row here — no code deploy. The adapter
 * reads base_api_url, field_mapping, and macro_template to talk to any network.
 */
@Injectable()
export class ProvidersService {
  private secretsCache = new Map<
    string,
    { provider: OfferwallProvider; expires_at: number }
  >();

  constructor(
    @InjectRepository(OfferwallProvider)
    private readonly providers: Repository<OfferwallProvider>,
  ) {}

  findActive(): Promise<OfferwallProvider[]> {
    return this.providers.find({ where: { is_active: true } });
  }

  async getOrFail(provider_id: string): Promise<OfferwallProvider> {
    const provider = await this.providers.findOne({
      where: { cz_offerwall_provider_id: provider_id },
    });
    if (!provider) {
      throw new NotFoundException({
        cz_error_code: CzOfferErrorCodes.PROVIDER_NOT_FOUND,
      });
    }
    return provider;
  }

  /**
   * Loads the row together with its encrypted secrets, which are select:false.
   * Cached briefly — postbacks hit this on every webhook, and provider rows
   * only change on an admin edit, which clears the cache.
   */
  async getWithSecrets(provider_id: string): Promise<OfferwallProvider> {
    const hit = this.secretsCache.get(provider_id);
    if (hit && Date.now() < hit.expires_at) return hit.provider;

    const provider = await this.providers
      .createQueryBuilder('p')
      .addSelect(['p.api_key_encrypted', 'p.postback_secret'])
      .where('p.cz_offerwall_provider_id = :provider_id', { provider_id })
      .getOne();
    if (!provider) {
      throw new NotFoundException({
        cz_error_code: CzOfferErrorCodes.PROVIDER_NOT_FOUND,
      });
    }
    this.secretsCache.set(provider_id, {
      provider,
      expires_at: Date.now() + PROVIDER_CACHE_TTL_MS,
    });
    return provider;
  }

  readApiKey(provider: OfferwallProvider): string {
    return provider.api_key_encrypted
      ? decryptText(provider.api_key_encrypted)
      : '';
  }

  readPostbackSecret(provider: OfferwallProvider): string {
    return provider.postback_secret ? decryptText(provider.postback_secret) : '';
  }

  async markSynced(provider_id: string): Promise<void> {
    await this.providers.update(
      { cz_offerwall_provider_id: provider_id },
      { last_synced_at: new Date() },
    );
  }
}
