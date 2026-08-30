import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak } from '../../database/entities/user-streak.entity';
import { StreakRewardConfig } from '../../database/entities/streak-reward-config.entity';
import { DailyCheckin } from '../../database/entities/daily-checkin.entity';
import { CzGameErrorCodes } from '../../common/errors/error.constants';
import { todayDate, yesterdayDate } from '../../common/utils/date.util';
import { WalletService } from '../wallet/wallet.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ReferralRulesService } from '../referrals/referral-rules.service';
import { ChallengesService } from './challenges.service';

/** The board is a fixed 30-day cycle; day 31 wraps back to day 1. */
export const CYCLE_DAYS = 30;

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    @InjectRepository(StreakRewardConfig)
    private readonly configs: Repository<StreakRewardConfig>,
    @InjectRepository(DailyCheckin)
    private readonly checkins: Repository<DailyCheckin>,
    private readonly walletService: WalletService,
    private readonly achievementsService: AchievementsService,
    private readonly challengesService: ChallengesService,
    private readonly referralRulesService: ReferralRulesService,
  ) {}

  /**
   * The whole Rewards screen in one call: the 30 tiles, where the user is on
   * the board, and whether today is still unclaimed. The app calls this on open.
   */
  async getBoard(user_id: string) {
    const [streak, configs] = await Promise.all([
      this.getOrCreate(user_id),
      this.configs.find({ order: { day_number: 'ASC' } }),
    ]);

    const today = todayDate();
    const can_claim_today = streak.last_claimed_date !== today;
    // A missed day resets the board, so the tile offered today is day 1 again.
    const claimable_day = this.nextDayNumber(streak);

    const data = configs.map((config) => ({
      day_number: config.day_number,
      reward_coins: config.reward_coins,
      reward_gems: config.reward_gems,
      label: config.label,
      is_milestone: config.is_milestone,
      is_claimed: config.day_number <= streak.current_day,
      is_today: can_claim_today && config.day_number === claimable_day,
    }));

    return {
      current_day: streak.current_day,
      longest_day: streak.longest_day,
      last_claimed_date: streak.last_claimed_date,
      can_claim_today,
      claimable_day: can_claim_today ? claimable_day : null,
      cycle_days: CYCLE_DAYS,
      total_coins: configs.reduce((sum, c) => sum + c.reward_coins, 0),
      total_gems: configs.reduce((sum, c) => sum + c.reward_gems, 0),
      data,
      total: data.length,
    };
  }

  /**
   * Claims the next day on the board. This is the daily check-in: it pays the
   * configured day, records the check-in row, and feeds challenges,
   * achievements and referral rules.
   */
  async claimToday(user_id: string) {
    const today = todayDate();
    const streak = await this.getOrCreate(user_id);

    if (streak.last_claimed_date === today) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.STREAK_ALREADY_CLAIMED,
      });
    }

    const day_number = this.nextDayNumber(streak);
    const config = await this.configs.findOne({ where: { day_number } });
    if (!config) {
      throw new NotFoundException({
        cz_error_code: CzGameErrorCodes.STREAK_DAY_NOT_CONFIGURED,
      });
    }

    const continuing = streak.last_claimed_date === yesterdayDate();
    streak.current_day = day_number;
    streak.longest_day = Math.max(streak.longest_day, day_number);
    if (!continuing) streak.streak_start_date = today;
    streak.last_claimed_date = today;
    await this.streaks.save(streak);

    const checkin = await this.recordCheckin(user_id, today, day_number);
    const credited = await this.payReward(user_id, config, checkin.cz_daily_checkin_id);

    const total_checkins = await this.checkins.count({ where: { user_id } });
    await Promise.all([
      this.challengesService.markCompleted(user_id, 'checkin'),
      this.achievementsService.trackProgress(user_id, 'daily_checkin'),
      this.referralRulesService.award(user_id, 'daily_checkins', total_checkins),
      this.referralRulesService.award(user_id, 'streak_reached', day_number),
    ]);

    return {
      day_number,
      reward_coins: credited.coins,
      reward_gems: credited.gems,
      label: config.label,
      is_milestone: config.is_milestone,
      current_day: streak.current_day,
      longest_day: streak.longest_day,
      cycle_days: CYCLE_DAYS,
      /** True on the day the user finished the whole board. */
      cycle_completed: day_number === CYCLE_DAYS,
      claimed_date: today,
      total_checkins,
    };
  }

  /** The check-in row is the audit trail; the streak row is the position. */
  private async recordCheckin(
    user_id: string,
    date: string,
    streak_count: number,
  ): Promise<DailyCheckin> {
    const existing = await this.checkins.findOne({ where: { user_id, date } });
    if (existing) return existing;
    const created = this.checkins.create({ user_id, date, streak_count, reward_coins: 0 });
    return this.checkins.save(created);
  }

  /** A day may pay coins, gems, both, or nothing at all. */
  private async payReward(
    user_id: string,
    config: StreakRewardConfig,
    source_id: string,
  ): Promise<{ coins: number; gems: number }> {
    if (config.reward_coins > 0) {
      await this.walletService.credit({
        user_id,
        currency: 'coin',
        amount: config.reward_coins,
        type: 'earn',
        source_type: 'streak',
        source_id,
      });
    }
    if (config.reward_gems > 0) {
      await this.walletService.credit({
        user_id,
        currency: 'gem',
        amount: config.reward_gems,
        type: 'earn',
        source_type: 'streak',
        source_id,
      });
    }
    if (config.reward_coins > 0) {
      await this.checkins.update(
        { cz_daily_checkin_id: source_id },
        { reward_coins: config.reward_coins },
      );
    }
    return { coins: config.reward_coins, gems: config.reward_gems };
  }

  /**
   * Yesterday's claim carries the board forward; any gap starts it again at
   * day 1, and finishing day 30 wraps to day 1 the next day.
   */
  private nextDayNumber(streak: UserStreak): number {
    if (streak.last_claimed_date !== yesterdayDate()) return 1;
    if (streak.current_day >= CYCLE_DAYS) return 1;
    return streak.current_day + 1;
  }

  /**
   * Nightly sweep: anyone who did not claim yesterday is back to day 0, so the
   * board offers day 1 again. `longest_day` is the record and never resets.
   */
  async breakMissedStreaks(): Promise<number> {
    const result = await this.streaks
      .createQueryBuilder()
      .update(UserStreak)
      .set({ current_day: 0, streak_start_date: null })
      .where('current_day > 0')
      .andWhere('(last_claimed_date IS NULL OR last_claimed_date < :cutoff)', {
        cutoff: yesterdayDate(),
      })
      .execute();
    return result.affected ?? 0;
  }

  private async getOrCreate(user_id: string): Promise<UserStreak> {
    const existing = await this.streaks.findOne({
      where: { cz_user_id: user_id },
    });
    if (existing) return existing;
    const created = this.streaks.create({ cz_user_id: user_id });
    return this.streaks.save(created);
  }
}
