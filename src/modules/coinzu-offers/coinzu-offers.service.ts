import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from '../../database/entities/user-device.entity';
import { CzOfferErrorCodes } from '../../common/errors/error.constants';
import {
  CoinzuHomeSectionsDto,
  CoinzuInProgressPageDto,
  CoinzuOfferDto,
  RewardtymExternal,
  RewardtymOfferContext,
  RewardtymRedirectContext,
} from '../../external/rewardtym.external';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class CoinzuOffersService {
  constructor(
    private readonly rewardtym: RewardtymExternal,
    @InjectRepository(UserDevice)
    private readonly devices: Repository<UserDevice>,
  ) {}

  async getHome(userId: string): Promise<CoinzuHomeSectionsDto> {
    const ctx = await this.offerContext(userId);
    return this.rewardtym.getHomeSections(userId, ctx);
  }

  async getOffer(userId: string, offerId: string): Promise<CoinzuOfferDto> {
    const ctx = await this.offerContext(userId);
    return this.rewardtym.getOfferDetail(userId, offerId, ctx);
  }

  async getInProgress(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<CoinzuInProgressPageDto> {
    const ctx = await this.offerContext(userId);
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
  ): Promise<{ offer_id: string; redirect_url: string }> {
    const device = await this.latestDevice(userId);
    const offer = await this.rewardtym.getOfferDetail(
      userId,
      offerId,
      this.toOfferContext(device),
    );
    if (!offer.redirect_url) {
      throw new NotFoundException({
        cz_error_code: CzOfferErrorCodes.OFFER_NOT_FOUND,
      });
    }
    const redirect_url = this.rewardtym.buildRedirectUrl(
      offer.redirect_url,
      userId,
      this.toRedirectContext(device),
    );
    return { offer_id: offer.offer_id, redirect_url };
  }

  private async offerContext(userId: string): Promise<RewardtymOfferContext> {
    const device = await this.latestDevice(userId);
    return this.toOfferContext(device);
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

  // Device is never sent: offers show for all platforms. Country is hardcoded to
  // US for now so the app sees the US offer catalogue regardless of the device's
  // captured geo. Revert to device?.country_code when geo targeting goes live.
  private toOfferContext(_device: UserDevice | null): RewardtymOfferContext {
    return {
      country: 'US',
      device: null,
    };
  }

  private toRedirectContext(
    device: UserDevice | null,
  ): RewardtymRedirectContext {
    return {
      country: 'US',
      device: null,
      hardware_id: device?.hardware_id ?? null,
      ip: device?.ip_address ?? null,
    };
  }
}
