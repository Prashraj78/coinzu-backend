import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Env } from '../common/config/env';
import { CzOfferErrorCodes } from '../common/errors/error.constants';

/** One milestone within a RewardTym offer. No currency images — coins/gems are integers. */
export interface CoinzuMilestoneDto {
  milestone_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  coins: number;
  gems: number;
  deadline_days: number | null;
  is_bonus: boolean;
}

/** A RewardTym /v3/coinzu offer, served verbatim to the Coinzu app. */
export interface CoinzuOfferDto {
  offer_id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  icon_url: string | null;
  category: string | null;
  difficulty: string | null;
  countries: string[];
  is_worldwide: boolean;
  has_milestones: boolean;
  milestones: CoinzuMilestoneDto[];
  total_coins: number;
  total_gems: number;
  redirect_url: string;
  cta_label: string | null;
  est_time_label: string | null;
  rating: number | null;
  completed_count: number | null;
  section_key: string | null;
}

/** An offer the user has started, with its milestone progress. */
export interface CoinzuInProgressOfferDto extends CoinzuOfferDto {
  progress: {
    completed: number;
    total: number;
    done_milestone_ids: string[];
  };
}

/** A titled group of offers on the home screen. */
export interface CoinzuHomeSectionDto {
  key: string;
  title: string;
  offers: CoinzuOfferDto[];
}

export interface CoinzuHomeSectionsDto {
  sections: CoinzuHomeSectionDto[];
}

export interface CoinzuInProgressPageDto {
  data: CoinzuInProgressOfferDto[];
  total: number;
  page: number;
  limit: number;
}

/** One home section, paginated. `has_more` drives the app's infinite scroll. */
export interface CoinzuSectionPageDto {
  key: string;
  title: string;
  data: CoinzuOfferDto[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/** The geo/device signals RewardTym stores verbatim; Coinzu captures them from user_devices. */
export interface RewardtymOfferContext {
  country: string | null;
  device: string | null;
}

/** Full device context used to build a click/redirect. */
export interface RewardtymRedirectContext extends RewardtymOfferContext {
  hardware_id: string | null;
  ip: string | null;
}

/** RewardTym wraps every response as { success, data }. */
interface RewardtymEnvelope<T> {
  success: boolean;
  data: T;
}

const REQUEST_TIMEOUT_MS = 20000;
const PARTNER_USER_HEADER = 'x-partner-user-id';

/**
 * Everything about talking to RewardTym's /v3/coinzu surface — the axios client,
 * apikey wiring, the x-partner-user-id header, envelope unwrapping and the typed
 * shapes — lives in this one file. A RewardTym JSON change touches only this file.
 */
@Injectable()
export class RewardtymExternal {
  private readonly logger = new Logger(RewardtymExternal.name);
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: Env.rewardtym.baseUrl.replace(/\/$/, ''),
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        apikey: Env.rewardtym.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async getHomeSections(
    userId: string,
    ctx: RewardtymOfferContext,
  ): Promise<CoinzuHomeSectionsDto> {
    return this.get<CoinzuHomeSectionsDto>(
      '/v3/coinzu/offers',
      this.ctxParams(ctx),
      userId,
    );
  }

  async getOfferDetail(
    userId: string,
    offerId: string,
    ctx: RewardtymOfferContext,
  ): Promise<CoinzuOfferDto> {
    return this.get<CoinzuOfferDto>(
      `/v3/coinzu/offers/${encodeURIComponent(offerId)}`,
      this.ctxParams(ctx),
      userId,
      CzOfferErrorCodes.OFFER_NOT_FOUND,
    );
  }

  async getSection(
    userId: string,
    ctx: RewardtymOfferContext,
    section: string,
    page: number,
    limit: number,
  ): Promise<CoinzuSectionPageDto> {
    return this.get<CoinzuSectionPageDto>(
      '/v3/coinzu/section',
      { ...this.ctxParams(ctx), section, page, limit },
      userId,
    );
  }

  async getInProgress(
    userId: string,
    ctx: RewardtymOfferContext,
    page: number,
    limit: number,
  ): Promise<CoinzuInProgressPageDto> {
    return this.get<CoinzuInProgressPageDto>(
      '/v3/coinzu/in-progress',
      { ...this.ctxParams(ctx), page, limit },
      userId,
    );
  }

  /**
   * The offer's redirect_url already points at RewardTym's /v3/r entry with
   * lt_campaign_id and lt_partner_id baked in. Coinzu appends only the device
   * context it captured (partner_user_id, hardware_id, ip, country, device) so
   * RewardTym stores it verbatim. Absent values are skipped.
   */
  buildRedirectUrl(
    rewardtymRedirectUrl: string,
    userId: string,
    deviceCtx: RewardtymRedirectContext,
  ): string {
    const url = new URL(rewardtymRedirectUrl);
    const params: Record<string, string | null> = {
      partner_user_id: userId,
      lt_partner_id: Env.rewardtym.partnerId,
      hardware_id: deviceCtx.hardware_id,
      ip: deviceCtx.ip,
      country: deviceCtx.country,
      device: deviceCtx.device,
    };
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private ctxParams(ctx: RewardtymOfferContext): Record<string, string> {
    const params: Record<string, string> = {};
    if (ctx.country) params.country = ctx.country;
    if (ctx.device) params.device = ctx.device;
    return params;
  }

  private async get<T>(
    path: string,
    params: Record<string, unknown>,
    userId: string,
    failureCode: string = CzOfferErrorCodes.PROVIDER_SYNC_FAILED,
  ): Promise<T> {
    try {
      const response = await this.client.get<RewardtymEnvelope<T>>(path, {
        params,
        headers: { [PARTNER_USER_HEADER]: userId },
      });
      const body = response.data;
      if (!body || body.success !== true || body.data == null) {
        throw new Error('RewardTym response was not a successful envelope.');
      }
      return body.data;
    } catch (error) {
      this.logger.error(
        `RewardTym GET ${path} failed: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException({ cz_error_code: failureCode });
    }
  }
}
