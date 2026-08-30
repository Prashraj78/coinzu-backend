import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisExternal } from './redis.external';

export interface GeoLookupResult {
  country_code: string | null;
  asn: string | null;
  isp: string | null;
  is_vpn: boolean;
}

const CACHE_TTL_SECONDS = 6 * 60 * 60;
const PROVIDER_TIMEOUT_MS = 2000;
const EMPTY_RESULT: GeoLookupResult = { country_code: null, asn: null, isp: null, is_vpn: false };

/**
 * Resolves ASN / ISP / VPN-hosting flag / country for an IP via free,
 * keyless providers, chained with fallback. Same provider order Rewardtym
 * uses for its own fraud checks.
 */
@Injectable()
export class GeoLookupExternal {
  private readonly logger = new Logger(GeoLookupExternal.name);

  constructor(private readonly redis: RedisExternal) {}

  async lookup(ip: string): Promise<GeoLookupResult> {
    const cacheKey = `geoip:${ip}`;
    const cached = await this.redis.get<GeoLookupResult>(cacheKey);
    if (cached) return cached;

    const result = (await this.fromIpApi(ip)) ?? (await this.fromIpWhoIs(ip)) ?? EMPTY_RESULT;
    await this.redis.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  private async fromIpApi(ip: string): Promise<GeoLookupResult | null> {
    try {
      const { data } = await axios.get(
        `http://ip-api.com/json/${ip}?fields=status,countryCode,as,isp,hosting`,
        { timeout: PROVIDER_TIMEOUT_MS },
      );
      if (data.status !== 'success') return null;
      return {
        country_code: data.countryCode ?? null,
        asn: data.as ? String(data.as).split(' ')[0] : null,
        isp: data.isp ?? null,
        is_vpn: Boolean(data.hosting),
      };
    } catch (error) {
      this.logger.warn(`ip-api.com lookup failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async fromIpWhoIs(ip: string): Promise<GeoLookupResult | null> {
    try {
      const { data } = await axios.get(`https://ipwho.is/${ip}`, {
        timeout: PROVIDER_TIMEOUT_MS,
      });
      if (!data.success) return null;
      return {
        country_code: data.country_code ?? null,
        asn: data.connection?.asn ? String(data.connection.asn) : null,
        isp: data.connection?.isp ?? null,
        is_vpn: Boolean(data.security?.is_datacenter),
      };
    } catch (error) {
      this.logger.warn(`ipwho.is lookup failed: ${(error as Error).message}`);
      return null;
    }
  }
}
