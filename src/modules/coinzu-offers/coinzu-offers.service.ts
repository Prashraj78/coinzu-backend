import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Env } from '../../common/config/env';
import {
  extractRequestIp,
  isLoopbackIp,
  resolveCountryFromRequestHeaders,
  resolveDevicePlatform,
} from '../../common/utils/device-platform.util';
import { GeoLookupExternal } from '../../external/geo-lookup.external';
import { UserDevice } from '../../database/entities/user-device.entity';
import { CzOfferErrorCodes } from '../../common/errors/error.constants';
import {
  CoinzuHomeSectionsDto,
  CoinzuInProgressPageDto,
  CoinzuOfferDto,
  CoinzuSectionPageDto,
  RewardtymExternal,
  RewardtymOfferContext,
} from '../../external/rewardtym.external';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
// The app always gets the US offer catalogue until geo targeting goes live there.
const APP_COUNTRY = 'US';

@Injectable()
export class CoinzuOffersService {
  constructor(
    private readonly rewardtym: RewardtymExternal,
    private readonly geoLookup: GeoLookupExternal,
    @InjectRepository(UserDevice)
    private readonly devices: Repository<UserDevice>,
  ) {}

  async getHome(userId: string, req: Request): Promise<CoinzuHomeSectionsDto> {
    const ctx = await this.offerContext(userId, req);
    return this.rewardtym.getHomeSections(userId, ctx);
  }

  /** One home section, paginated — the app loads each section independently. */
  async getSection(
    userId: string,
    req: Request,
    section: string,
    page?: number,
    limit?: number,
  ): Promise<CoinzuSectionPageDto> {
    const ctx = await this.offerContext(userId, req);
    return this.rewardtym.getSection(
      userId,
      ctx,
      section,
      page ?? DEFAULT_PAGE,
      limit ?? DEFAULT_LIMIT,
    );
  }

  async getOffer(
    userId: string,
    offerId: string,
    req: Request,
  ): Promise<CoinzuOfferDto> {
    const ctx = await this.offerContext(userId, req);
    return this.rewardtym.getOfferDetail(userId, offerId, ctx);
  }

  async getInProgress(
    userId: string,
    req: Request,
    page?: number,
    limit?: number,
  ): Promise<CoinzuInProgressPageDto> {
    const ctx = await this.offerContext(userId, req);
    return this.rewardtym.getInProgress(
      userId,
      ctx,
      page ?? DEFAULT_PAGE,
      limit ?? DEFAULT_LIMIT,
    );
  }

  async getRedirectUrl(
    userId: string,
    offerId: string,
    platform: 'web' | 'app',
    req: Request,
  ): Promise<{ offer_id: string; redirect_url: string }> {
    const caller = await this.callerContext(userId, req);
    const offer = await this.rewardtym.getOfferDetail(userId, offerId, {
      country: caller.country,
      device: null,
    });
    if (!offer.redirect_url) {
      throw new NotFoundException({
        cz_error_code: CzOfferErrorCodes.OFFER_NOT_FOUND,
      });
    }
    const redirect_url = this.rewardtym.buildRedirectUrl(
      offer.redirect_url,
      userId,
      {
        country: caller.country,
        device: null,
        hardware_id: caller.device?.hardware_id ?? null,
        ip: caller.ip,
        platform,
      },
    );
    return { offer_id: offer.offer_id, redirect_url };
  }

  // Device is never sent: offers show for all platforms.
  private async offerContext(
    userId: string,
    req: Request,
  ): Promise<RewardtymOfferContext> {
    const { country } = await this.callerContext(userId, req);
    return { country, device: null };
  }

  /**
   * App: the US catalogue and the last device's IP, as before. Web: the country and IP of
   * this request (falling back to the user's last device).
   */
  private async callerContext(userId: string, req: Request) {
    if (resolveDevicePlatform(undefined, req) !== 'web') {
      const device = await this.latestDevice(userId);
      return { device, country: APP_COUNTRY, ip: device?.ip_address ?? null };
    }
    const requestIp = extractRequestIp(req);
    const ip = requestIp && !isLoopbackIp(requestIp) ? requestIp : null;
    const [device, requestCountry] = await Promise.all([
      this.latestDevice(userId),
      this.requestCountry(req, requestIp),
    ]);
    return {
      device,
      country:
        Env.rewardtym.localCountry ||
        requestCountry ||
        device?.country_code ||
        null,
      ip: ip ?? device?.ip_address ?? null,
    };
  }

  // CDN header first, then the cached IP lookup. Local dev (loopback) looks up this machine's own IP.
  private async requestCountry(
    req: Request,
    ip: string | null,
  ): Promise<string | null> {
    const header = resolveCountryFromRequestHeaders(req);
    if (header || !ip) return header;
    if (isLoopbackIp(ip) && Env.isProduction) return null;
    const geo = await this.geoLookup.lookup(isLoopbackIp(ip) ? '' : ip);
    return geo.country_code;
  }

  /** Latest device row for the user — the capture used for geo/fraud context. */
  private latestDevice(userId: string): Promise<UserDevice | null> {
    return this.devices.findOne({
      where: { cz_user_id: userId },
      order: { last_seen_at: 'DESC' },
      select: {
        cz_device_id: true,
        hardware_id: true,
        ip_address: true,
        country_code: true,
        platform_type: true,
        last_seen_at: true,
      },
    });
  }
}
