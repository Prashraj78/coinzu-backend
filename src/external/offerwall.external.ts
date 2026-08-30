import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { CzOfferErrorCodes } from '../common/errors/error.constants';

/** Everything the adapter needs to talk to one provider. */
export interface OfferwallProviderConfig {
  name: string;
  base_api_url: string;
  api_key: string;
  offers_path?: string;
  offers_list_key?: string;
  offer_fields?: Record<string, string>;
}

/** One offer, already renamed into Coinzu's field names. */
export interface OfferwallOfferRow {
  external_offer_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  reward_coins: number;
  reward_gems: number;
  category: string | null;
  countries: string[];
  platforms: string[];
}

const REQUEST_TIMEOUT_MS = 20000;

/**
 * Generic offerwall adapter. A provider is onboarded by inserting a DB row, so
 * fetching, unwrapping and field renaming all have to stay generic — and all of
 * it stays in this file.
 */
@Injectable()
export class OfferwallExternal {
  private readonly logger = new Logger(OfferwallExternal.name);

  async fetchOffers(
    config: OfferwallProviderConfig,
  ): Promise<OfferwallOfferRow[]> {
    const rows = await this.requestRows(config);
    const offers: OfferwallOfferRow[] = [];
    for (const row of rows) {
      const offer = this.toOfferRow(config, row);
      if (offer.external_offer_id) offers.push(offer);
    }
    return offers;
  }

  /** Builds the tracking URL by filling {macro} placeholders. */
  buildClickUrl(template: string, macros: Record<string, string>): string {
    let url = template;
    for (const name of Object.keys(macros)) {
      url = url.split(`{${name}}`).join(encodeURIComponent(macros[name]));
    }
    return url;
  }

  private async requestRows(
    config: OfferwallProviderConfig,
  ): Promise<Array<Record<string, unknown>>> {
    const path = config.offers_path ?? '';
    const url = `${config.base_api_url.replace(/\/$/, '')}${path}`;
    const headers = config.api_key
      ? { Authorization: `Bearer ${config.api_key}` }
      : undefined;

    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers,
      });
      const listKey = config.offers_list_key;
      const list = listKey
        ? this.readPath(response.data, listKey)
        : response.data;
      if (!Array.isArray(list)) {
        throw new Error(`Response at "${listKey ?? 'root'}" is not an array.`);
      }
      return list as Array<Record<string, unknown>>;
    } catch (error) {
      this.logger.error(
        `Offer fetch failed for ${config.name}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException({
        cz_error_code: CzOfferErrorCodes.PROVIDER_SYNC_FAILED,
      });
    }
  }

  private toOfferRow(
    config: OfferwallProviderConfig,
    row: Record<string, unknown>,
  ): OfferwallOfferRow {
    const fields = config.offer_fields ?? {};
    return {
      external_offer_id: this.readString(row, fields.external_offer_id ?? 'id') ?? '',
      title: this.readString(row, fields.title ?? 'title') ?? 'Offer',
      description: this.readString(row, fields.description ?? 'description'),
      image_url: this.readString(row, fields.image_url ?? 'image_url'),
      reward_coins: this.readNumber(row, fields.reward_coins ?? 'payout'),
      reward_gems: this.readNumber(row, fields.reward_gems),
      category: this.readString(row, fields.category ?? 'category'),
      countries: this.readArray(row, fields.countries ?? 'countries'),
      platforms: this.readArray(row, fields.platforms ?? 'platforms'),
    };
  }

  /** Reads a dotted path such as "data.offers" out of a JSON response. */
  private readPath(source: unknown, path: string): unknown {
    let current = source;
    for (const key of path.split('.')) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private readString(
    row: Record<string, unknown>,
    key?: string,
  ): string | null {
    if (!key) return null;
    const value = row[key];
    return value == null ? null : String(value);
  }

  private readNumber(row: Record<string, unknown>, key?: string): number {
    if (!key) return 0;
    const value = Number(row[key]);
    return Number.isFinite(value) ? Math.round(value) : 0;
  }

  private readArray(row: Record<string, unknown>, key?: string): string[] {
    if (!key) return [];
    const value = row[key];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value !== 'string') return [];
    const parts: string[] = [];
    for (const part of value.split(',')) {
      const trimmed = part.trim();
      if (trimmed) parts.push(trimmed);
    }
    return parts;
  }
}
