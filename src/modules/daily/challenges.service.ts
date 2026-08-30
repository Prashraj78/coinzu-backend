import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DailyChallenge, ChallengeType } from '../../database/entities/daily-challenge.entity';
import { UserChallengeProgress } from '../../database/entities/user-challenge-progress.entity';
import { CzGameErrorCodes } from '../../common/errors/error.constants';
import { todayDate } from '../../common/utils/date.util';
import { WalletService } from '../wallet/wallet.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(DailyChallenge)
    private readonly challenges: Repository<DailyChallenge>,
    @InjectRepository(UserChallengeProgress)
    private readonly progress: Repository<UserChallengeProgress>,
    private readonly walletService: WalletService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /** Today's challenge board with this user's status on each row. */
  async listForUser(user_id: string) {
    const date = todayDate();
    const challenges = await this.challenges.find({
      where: { is_active: true },
      order: { display_order: 'ASC' },
    });

    const rows = await this.progress.find({ where: { user_id, date } });
    const data = challenges.map((challenge) => {
      const row = rows.find((item) => item.challenge_id === challenge.cz_daily_challenge_id);
      return {
        cz_daily_challenge_id: challenge.cz_daily_challenge_id,
        type: challenge.type,
        title: challenge.title,
        description: challenge.description,
        reward_coins: challenge.reward_coins,
        reward_gems: challenge.reward_gems,
        status: row?.status ?? 'pending',
        completed_at: row?.completed_at ?? null,
        claimed_at: row?.claimed_at ?? null,
      };
    });

    return { data, total: data.length, date };
  }

  /**
   * Called by the game/offer flows when the user does the thing a challenge
   * asks for. Marks every matching challenge complete for today.
   */
  async markCompleted(user_id: string, type: ChallengeType): Promise<void> {
    const date = todayDate();
    const challenges = await this.challenges.find({
      where: { type, is_active: true },
      select: { cz_daily_challenge_id: true, target_count: true },
    });
    if (!challenges.length) return;

    // One read and one write for the whole set instead of a pair per challenge.
    const ids = challenges.map((c) => c.cz_daily_challenge_id);
    const existing = await this.progress.find({
      where: { user_id, challenge_id: In(ids), date },
    });
    const byChallenge = new Map(existing.map((row) => [row.challenge_id, row]));

    const now = new Date();
    const toSave: UserChallengeProgress[] = [];
    for (const challenge of challenges) {
      const id = challenge.cz_daily_challenge_id;
      const row = byChallenge.get(id);
      if (row && row.status !== 'pending') continue;
      const target = row ?? this.progress.create({ user_id, challenge_id: id, date });
      // A challenge needing two actions only completes on the second.
      target.progress = (target.progress ?? 0) + 1;
      if (target.progress >= (challenge.target_count ?? 1)) {
        target.progress = challenge.target_count ?? 1;
        target.status = 'completed';
        target.completed_at = now;
      }
      toSave.push(target);
    }
    if (toSave.length) await this.progress.save(toSave);
  }

  /** Pays the reward for a challenge the user already finished today. */
  async claim(user_id: string, challenge_id: string) {
    const date = todayDate();
    const challenge = await this.challenges.findOne({
      where: { cz_daily_challenge_id: challenge_id },
    });
    if (!challenge) {
      throw new NotFoundException({
        cz_error_code: CzGameErrorCodes.CHALLENGE_NOT_FOUND,
      });
    }

    const row = await this.progress.findOne({
      where: { user_id, challenge_id, date },
    });
    if (!row || row.status === 'pending') {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.CHALLENGE_NOT_COMPLETED,
      });
    }
    if (row.status === 'claimed') {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.CHALLENGE_ALREADY_CLAIMED,
      });
    }

    row.status = 'claimed';
    row.claimed_at = new Date();
    await this.progress.save(row);

    if (challenge.reward_coins > 0) {
      await this.walletService.credit({
        user_id,
        currency: 'coin',
        amount: challenge.reward_coins,
        type: 'earn',
        source_type: 'challenge',
        source_id: challenge.cz_daily_challenge_id,
      });
    }
    if (challenge.reward_gems > 0) {
      await this.walletService.credit({
        user_id,
        currency: 'gem',
        amount: challenge.reward_gems,
        type: 'earn',
        source_type: 'challenge',
        source_id: challenge.cz_daily_challenge_id,
      });
    }

    await this.achievementsService.trackProgress(user_id, 'complete_challenge');

    return {
      cz_daily_challenge_id: challenge.cz_daily_challenge_id,
      reward_coins: challenge.reward_coins,
      reward_gems: challenge.reward_gems,
      status: row.status,
    };
  }

  /** Cron helper: clears yesterday's unfinished rows so the board looks fresh. */
  async resetStalePending(date: string): Promise<number> {
    const result = await this.progress.delete({
      date: In([date]),
      status: 'pending',
    });
    return result.affected ?? 0;
  }
}
