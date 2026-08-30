import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SpinWheelConfig } from '../../database/entities/spin-wheel-config.entity';
import { SpinHistory } from '../../database/entities/spin-history.entity';
import { CzGameErrorCodes } from '../../common/errors/error.constants';
import { startOfTodayUtc } from '../../common/utils/date.util';
import { pickByWeight } from '../../common/utils/random.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { WalletService, LedgerEntry } from '../wallet/wallet.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ChallengesService } from '../daily/challenges.service';

/** One spin a day, for everyone. */
const DAILY_SPINS = 1;

@Injectable()
export class SpinService {
  constructor(
    @InjectRepository(SpinWheelConfig)
    private readonly configs: Repository<SpinWheelConfig>,
    @InjectRepository(SpinHistory)
    private readonly history: Repository<SpinHistory>,
    private readonly walletService: WalletService,
    private readonly achievementsService: AchievementsService,
    private readonly challengesService: ChallengesService,
  ) {}

  /** The wheel face plus how many spins the user has left today. */
  async getWheel(user_id: string) {
    const [segments, used, limit] = await Promise.all([
      this.configs.find({
        where: { is_active: true },
        order: { display_order: 'ASC' },
      }),
      this.countToday(user_id),
      this.dailyLimit(),
    ]);

    // The odds stay admin-only; the payout is printed on the wedge.
    const data = segments.map((s) => ({
      cz_spin_wheel_config_id: s.cz_spin_wheel_config_id,
      label: s.label,
      reward_coins: s.reward_coins,
      reward_gems: s.reward_gems,
      display_order: s.display_order,
    }));

    return {
      data,
      total: data.length,
      spins_used: used,
      spins_left: Math.max(limit - used, 0),
    };
  }

  async spin(user_id: string) {
    const [limit, used, segments] = await Promise.all([
      this.dailyLimit(),
      this.countToday(user_id),
      this.configs.find({ where: { is_active: true } }),
    ]);
    if (used >= limit) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.SPIN_ALREADY_USED,
      });
    }
    if (!segments.length) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.SPIN_NOT_CONFIGURED,
      });
    }

    const won = pickByWeight(segments);
    // The wedge advertises its payout, so it pays exactly that.
    const coins = won.reward_coins;
    const gems = won.reward_gems;
    const row = this.history.create({
      user_id,
      config_id: won.cz_spin_wheel_config_id,
      reward_coins: coins,
      reward_gems: gems,
    });
    const saved = await this.history.save(row);

    await this.payReward(user_id, saved.cz_spin_history_id, coins, gems);
    await Promise.all([
      this.challengesService.markCompleted(user_id, 'spin'),
      this.achievementsService.trackProgress(user_id, 'play_spin'),
    ]);

    return {
      cz_spin_history_id: saved.cz_spin_history_id,
      cz_spin_wheel_config_id: won.cz_spin_wheel_config_id,
      label: won.label,
      reward_coins: coins,
      reward_gems: gems,
      spins_left: Math.max(limit - used - 1, 0),
    };
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

  private async dailyLimit(): Promise<number> {
    return DAILY_SPINS;
  }
}
