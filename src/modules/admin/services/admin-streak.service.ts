import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StreakRewardConfig } from '../../../database/entities/streak-reward-config.entity';
import { UserStreak } from '../../../database/entities/user-streak.entity';
import { CzCommonErrorCodes } from '../../../common/errors/error.constants';
import { CYCLE_DAYS } from '../../daily/streak.service';
import { SaveStreakLadderDto } from '../../daily/dto/streak-config.dto';

/** Every 7th day is a milestone, and day 30 closes the board. */
const MILESTONES = new Set([7, 14, 21, 28, 30]);

/**
 * The shipped ladder: 25 ordinary days at 60 coins, four weekly milestones and
 * a finale, summing to exactly 5,000 coins and 2,000 gems.
 */
export function defaultLadder(): SaveStreakLadderDto['days'] {
  const milestoneRewards: Record<number, { coins: number; gems: number; label: string }> = {
    7: { coins: 300, gems: 200, label: 'Week 1 bonus' },
    14: { coins: 500, gems: 300, label: 'Week 2 bonus' },
    21: { coins: 700, gems: 400, label: 'Week 3 bonus' },
    28: { coins: 1000, gems: 500, label: 'Week 4 bonus' },
    30: { coins: 1000, gems: 600, label: 'Streak champion' },
  };
  return Array.from({ length: CYCLE_DAYS }, (_, i) => {
    const day_number = i + 1;
    const milestone = milestoneRewards[day_number];
    return milestone
      ? {
          day_number,
          reward_coins: milestone.coins,
          reward_gems: milestone.gems,
          label: milestone.label,
          is_milestone: true,
        }
      : { day_number, reward_coins: 60, reward_gems: 0, label: 'Token', is_milestone: false };
  });
}

@Injectable()
export class AdminStreakService {
  constructor(
    @InjectRepository(StreakRewardConfig)
    private readonly configs: Repository<StreakRewardConfig>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    private readonly dataSource: DataSource,
  ) {}

  /** The ladder, its totals against the targets, and where users are on it. */
  async getLadder() {
    const days = await this.configs.find({ order: { day_number: 'ASC' } });

    const total_coins = days.reduce((sum, d) => sum + d.reward_coins, 0);
    const total_gems = days.reduce((sum, d) => sum + d.reward_gems, 0);

    const rows = await this.streaks
      .createQueryBuilder('s')
      .select('s.current_day', 'day')
      .addSelect('COUNT(*)', 'users')
      .where('s.current_day > 0')
      .groupBy('s.current_day')
      .getRawMany<{ day: number; users: string }>();
    const byDay = new Map(rows.map((r) => [Number(r.day), Number(r.users)]));

    const [active_users, completed_users] = await Promise.all([
      this.streaks.count(),
      this.streaks
        .createQueryBuilder('s')
        .where('s.longest_day >= :n', { n: CYCLE_DAYS })
        .getCount(),
    ]);

    return {
      data: days.map((d) => ({
        cz_streak_reward_config_id: d.cz_streak_reward_config_id,
        day_number: d.day_number,
        reward_coins: d.reward_coins,
        reward_gems: d.reward_gems,
        label: d.label,
        is_milestone: d.is_milestone,
        /** How many users are sitting on this day right now. */
        users_on_day: byDay.get(d.day_number) ?? 0,
      })),
      total: days.length,
      cycle_days: CYCLE_DAYS,
      configured: days.length === CYCLE_DAYS,
      totals: {
        coins: total_coins,
        gems: total_gems,
      },
      participation: { active_users, completed_users },
    };
  }

  /** Replaces the whole board in one transaction. */
  async saveLadder(dto: SaveStreakLadderDto) {
    const seen = new Set<number>();
    for (const day of dto.days) {
      if (seen.has(day.day_number)) {
        throw new BadRequestException({
          cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
          cz_error_description: `Day ${day.day_number} appears more than once.`,
        });
      }
      seen.add(day.day_number);
    }
    for (let n = 1; n <= CYCLE_DAYS; n += 1) {
      if (!seen.has(n)) {
        throw new BadRequestException({
          cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
          cz_error_description: `Day ${n} is missing. Send all ${CYCLE_DAYS} days.`,
        });
      }
    }

    // All or nothing: a partly written board would leave an unclaimable day.
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(StreakRewardConfig);
      // Empty criteria are rejected by delete(), so clear via the builder.
      await repo.createQueryBuilder().delete().execute();
      await repo.insert(
        dto.days.map((d) => ({
          day_number: d.day_number,
          reward_coins: d.reward_coins,
          reward_gems: d.reward_gems,
          label: d.label ?? null,
          is_milestone: d.is_milestone ?? MILESTONES.has(d.day_number),
        })),
      );
    });

    return this.getLadder();
  }

  /**
   * The Daily Streak card on the dashboard: how many people are on a run,
   * how deep they are, and what the board has paid out.
   */
  async dashboard() {
    const [ladder, distribution, payout, longest] = await Promise.all([
      this.configs.find({ order: { day_number: 'ASC' } }),
      this.streaks
        .createQueryBuilder('s')
        .select('s.current_day', 'day')
        .addSelect('COUNT(*)', 'users')
        .where('s.current_day > 0')
        .groupBy('s.current_day')
        .orderBy('s.current_day', 'ASC')
        .getRawMany<{ day: number; users: string }>(),
      this.dataSource.query<{ coins: string; gems: string; claims: string }[]>(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE currency = 'coin'), 0) AS coins,
           COALESCE(SUM(amount) FILTER (WHERE currency = 'gem'), 0)  AS gems,
           COUNT(*) FILTER (WHERE currency = 'coin')                 AS claims
         FROM wallet_transactions
         WHERE source_type = 'streak' AND type = 'earn'`,
      ),
      this.streaks
        .createQueryBuilder('s')
        .select('COALESCE(MAX(s.longest_day), 0)', 'best')
        .getRawOne<{ best: string }>(),
    ]);

    const byDay = new Map(distribution.map((r) => [Number(r.day), Number(r.users)]));
    const on_streak = distribution.reduce((sum, r) => sum + Number(r.users), 0);
    const [active_users, completed_users, claimed_today] = await Promise.all([
      this.streaks.count(),
      this.streaks
        .createQueryBuilder('s')
        .where('s.longest_day >= :n', { n: CYCLE_DAYS })
        .getCount(),
      this.streaks
        .createQueryBuilder('s')
        .where('s.last_claimed_date = CURRENT_DATE')
        .getCount(),
    ]);

    const weightedDays = distribution.reduce(
      (sum, r) => sum + Number(r.day) * Number(r.users),
      0,
    );
    const p = payout[0] ?? { coins: '0', gems: '0', claims: '0' };

    return {
      on_streak,
      active_users,
      completed_users,
      claimed_today,
      /** Mean day across everyone currently on a run, one decimal. */
      average_day: on_streak
        ? Number((weightedDays / on_streak).toFixed(1))
        : 0,
      longest_day: Number(longest?.best ?? 0),
      cycle_days: CYCLE_DAYS,
      paid_out: {
        coins: Number(p.coins),
        gems: Number(p.gems),
        claims: Number(p.claims),
      },
      /** One entry per day of the board, so the card can draw the whole curve. */
      distribution: ladder.map((d) => ({
        day_number: d.day_number,
        users: byDay.get(d.day_number) ?? 0,
        is_milestone: d.is_milestone,
      })),
    };
  }

  /** Puts the shipped 5,000-coin / 2,000-gem ladder back. */
  async resetLadder() {
    return this.saveLadder({ days: defaultLadder() });
  }
}
