import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { Between, Repository } from 'typeorm';
import { ScratchCard } from '../../database/entities/scratch-card.entity';
import { ScratchHistory } from '../../database/entities/scratch-history.entity';
import { CzGameErrorCodes } from '../../common/errors/error.constants';
import { todayDate } from '../../common/utils/date.util';
import { ScratchCardGrant } from '../../database/entities/scratch-card-grant.entity';
import { UserAchievement } from '../../database/entities/user-achievement.entity';

/** Higher is rarer. A prize is in the pool when the user reaches its tier. */
const RARITY_RANK: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  rarest: 4,
};
import { startOfTodayUtc } from '../../common/utils/date.util';
import { pickByWeight, pickInRange } from '../../common/utils/random.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { WalletService, LedgerEntry } from '../wallet/wallet.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ChallengesService } from '../daily/challenges.service';

@Injectable()
export class ScratchService {
  constructor(
    @InjectRepository(ScratchCard)
    private readonly cards: Repository<ScratchCard>,
    @InjectRepository(ScratchHistory)
    private readonly history: Repository<ScratchHistory>,
    private readonly walletService: WalletService,
    private readonly achievementsService: AchievementsService,
    private readonly challengesService: ChallengesService,
    @InjectRepository(ScratchCardGrant)
    private readonly grants: Repository<ScratchCardGrant>,
    @InjectRepository(UserAchievement)
    private readonly userAchievements: Repository<UserAchievement>,
  ) {}

  /** How many cards the user may still scratch today. */
  /** A card is only ever won from the quiz; there is no free allowance. */
  async getStatus(user_id: string) {
    const [used, granted] = await Promise.all([
      this.countToday(user_id),
      this.grants.count({
        where: { user_id, date: todayDate(), used_at: IsNull() },
      }),
    ]);
    return {
      cards_used: used,
      cards_left: granted,
      /** Unscratched cards won today, all of them from the quiz. */
      granted_cards: granted,
    };
  }

  async scratch(user_id: string) {
    const [used, all, granted] = await Promise.all([
      this.countToday(user_id),
      this.cards.find({ where: { is_active: true } }),
      this.grants.count({
        where: { user_id, date: todayDate(), used_at: IsNull() },
      }),
    ]);
    // Nothing to scratch until the quiz hands one over.
    if (granted <= 0) {
      throw new BadRequestException({
        cz_error_code: used
          ? CzGameErrorCodes.SCRATCH_ALREADY_USED
          : CzGameErrorCodes.SCRATCH_NOT_EARNED,
      });
    }
    // A prize can be gated behind a medal tier, so the pool is per-user.
    const pool = await this.eligiblePool(user_id, all);
    if (!pool.length) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.SCRATCH_NOT_CONFIGURED,
      });
    }

    const won = pickByWeight(pool);
    // A prize can be a range; the exact amount is drawn here, not stored on it.
    const coins = pickInRange(won.reward_coins, won.reward_coins_max);
    const gems = pickInRange(won.reward_gems, won.reward_gems_max);
    const row = this.history.create({
      user_id,
      card_id: won.cz_scratch_card_id,
      reward_coins: coins,
      reward_gems: gems,
    });
    const saved = await this.history.save(row);

    // Every scratch spends a card the quiz granted — the oldest one first.
    const grant = await this.grants.findOne({
      where: { user_id, date: todayDate(), used_at: IsNull() },
      order: { created_at: 'ASC' },
    });
    if (grant) {
      grant.used_at = new Date();
      await this.grants.save(grant);
    }

    await this.payReward(user_id, saved.cz_scratch_history_id, coins, gems);
    await Promise.all([
      this.challengesService.markCompleted(user_id, 'scratch'),
      this.achievementsService.trackProgress(user_id, 'play_scratch'),
    ]);

    return {
      cz_scratch_history_id: saved.cz_scratch_history_id,
      cz_scratch_card_id: won.cz_scratch_card_id,
      label: won.label,
      reward_coins: coins,
      reward_gems: gems,
      cards_left: Math.max(granted - 1, 0),
    };
  }

  /**
   * Drops prizes the user's best medal does not reach. A prize with no
   * `min_medal_rarity` is always in the pool, so an unmedalled user still wins.
   */
  private async eligiblePool(user_id: string, all: ScratchCard[]) {
    const gated = all.filter((c) => c.min_medal_rarity);
    if (!gated.length) return all;

    const best = await this.bestMedalRank(user_id);
    return all.filter(
      (c) => !c.min_medal_rarity || RARITY_RANK[c.min_medal_rarity] <= best,
    );
  }

  /** 0 when the user holds no medal at all. */
  private async bestMedalRank(user_id: string): Promise<number> {
    const row = await this.userAchievements
      .createQueryBuilder('ua')
      .innerJoin('achievements', 'a', 'a.cz_achievement_id = ua.achievement_id')
      .select('a.rarity', 'rarity')
      .where('ua.user_id = :user_id', { user_id })
      .andWhere('ua.unlocked_at IS NOT NULL')
      .getRawMany<{ rarity: string }>();
    return row.reduce((best, r) => Math.max(best, RARITY_RANK[r.rarity] ?? 0), 0);
  }

  async listHistory(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.history.findAndCount({
      where: { user_id },
      order: { played_at: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

  private async payReward(
    user_id: string,
    source_id: string,
    coins: number,
    gems: number,
  ): Promise<void> {
    const entries: LedgerEntry[] = [];
    if (coins > 0) {
      entries.push({
        user_id,
        currency: 'coin' as const,
        amount: coins,
        type: 'earn' as const,
        source_type: 'game' as const,
        source_id,
      });
    }
    if (gems > 0) {
      entries.push({
        user_id,
        currency: 'gem' as const,
        amount: gems,
        type: 'earn' as const,
        source_type: 'game' as const,
        source_id,
      });
    }
    await this.walletService.creditMany(entries);
  }


  private async countToday(user_id: string): Promise<number> {
    return this.history.count({
      where: { user_id, played_at: Between(startOfTodayUtc(), new Date()) },
    });
  }

}
