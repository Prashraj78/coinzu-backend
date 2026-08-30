import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Offer } from '../../database/entities/offer.entity';
import { OfferClick } from '../../database/entities/offer-click.entity';
import { StreakService } from '../daily/streak.service';
import { ChallengesService } from '../daily/challenges.service';
import { RedeemService } from '../redeem/redeem.service';
import { addDaysToDate, todayDate, yesterdayDate } from '../../common/utils/date.util';
import { CronRegistryService } from './cron-registry.service';

/** Old click rows are only useful for a short window. */
const CLICK_RETENTION_DAYS = 30;

@Injectable()
export class CronService implements OnModuleInit {
  constructor(
    @InjectRepository(Offer)
    private readonly offers: Repository<Offer>,
    @InjectRepository(OfferClick)
    private readonly clicks: Repository<OfferClick>,
    private readonly registry: CronRegistryService,
    private readonly streakService: StreakService,
    private readonly challengesService: ChallengesService,
    private readonly redeemService: RedeemService,
  ) {}

  /**
   * Hands every runner to the registry, which owns the timers. Nothing here
   * is decorated, so a job can be paused or rescheduled from the admin panel.
   */
  onModuleInit(): void {
    this.registry.register('daily_challenge_reset', () =>
      this.challengesService.resetStalePending(yesterdayDate()),
    );
    this.registry.register('streak_check', () =>
      this.streakService.breakMissedStreaks(),
    );
    this.registry.register('gift_card_order_poll', () =>
      this.redeemService.pollPendingOrders(),
    );
    this.registry.register('gift_card_catalog_sync', () =>
      this.redeemService.syncCatalog(),
    );
    this.registry.register('expired_cleanup', () => this.runCleanup());
  }

  /** Switches off expired offers and drops click rows nobody needs. */
  private async runCleanup(): Promise<number> {
    const expired = await this.offers
      .createQueryBuilder()
      .update(Offer)
      .set({ is_active: false })
      .where('is_active = true')
      .andWhere('expires_at IS NOT NULL AND expires_at < :now', {
        now: new Date(),
      })
      .execute();

    const cutoff = new Date(
      `${addDaysToDate(todayDate(), -CLICK_RETENTION_DAYS)}T00:00:00.000Z`,
    );
    await this.clicks.delete({ clicked_at: LessThan(cutoff) });

    return expired.affected ?? 0;
  }
}
