import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { DailyChallenge } from '../../database/entities/daily-challenge.entity';
import { UserChallengeProgress } from '../../database/entities/user-challenge-progress.entity';
import { DailyChestClaim } from '../../database/entities/daily-chest-claim.entity';
import { ScratchCardGrant } from '../../database/entities/scratch-card-grant.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { SpinHistory } from '../../database/entities/spin-history.entity';
import { UserStreak } from '../../database/entities/user-streak.entity';
import { CzGameErrorCodes } from '../../common/errors/error.constants';
import { addDaysToDate, todayDate } from '../../common/utils/date.util';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { WalletService } from '../wallet/wallet.service';

/** One spin a day, matching SpinService. */
const DAILY_SPINS = 1;

/** How many days back the calendar strip offers. */
const HISTORY_DAYS = 7;
/** How many locked days ahead it shows, so the strip reads as a run. */
const FUTURE_DAYS = 3;

@Injectable()
export class ChallengeBoardService {
  constructor(
    @InjectRepository(DailyChallenge)
    private readonly challenges: Repository<DailyChallenge>,
    @InjectRepository(UserChallengeProgress)
    private readonly progress: Repository<UserChallengeProgress>,
    @InjectRepository(DailyChestClaim)
    private readonly chests: Repository<DailyChestClaim>,
    @InjectRepository(ScratchCardGrant)
    private readonly grants: Repository<ScratchCardGrant>,
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(SpinHistory)
    private readonly spins: Repository<SpinHistory>,
    @InjectRepository(UserStreak)
    private readonly streaks: Repository<UserStreak>,
    private readonly settings: SettingsService,
    private readonly wallet: WalletService,
  ) {}

  /**
   * The whole Daily Challenge screen in one call. A past date is read-only:
   * the tiles show what was finished, and nothing can be played or claimed.
   */
  async getBoard(user_id: string, date?: string) {
    const today = todayDate();
    const day = date ?? today;

    if (day > today) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.CHALLENGE_NOT_FOUND,
        cz_error_description: 'That day has not started yet.',
      });
    }
    const is_today = day === today;

    const [list, rows, chest, chestCoins, chestGems, streak, quiz, spunToday] =
      await Promise.all([
        this.challenges.find({
          where: { is_active: true },
          order: { display_order: 'ASC' },
        }),
        this.progress.find({ where: { user_id, date: day } }),
        this.chests.findOne({ where: { user_id, date: day } }),
        this.settings.getNumber(SettingKeys.DAILY_CHEST_COINS),
        this.settings.getNumber(SettingKeys.DAILY_CHEST_GEMS),
        this.streaks.findOne({ where: { cz_user_id: user_id } }),
        this.quizzes.findOne({ where: { date: day, is_active: true } }),
        this.spins.count({
          where: { user_id, played_at: this.dayRange(day) },
        }),
      ]);

    const byChallenge = new Map(rows.map((r) => [r.challenge_id, r]));

    // A card won from the quiz is worthless until it is scratched, so the tile
    // that produced it keeps pointing at the card rather than falling idle.
    const [pendingScratch, scratchLeft] = is_today
      ? await Promise.all([
          this.grants.count({ where: { user_id, date: day, used_at: IsNull() } }),
          this.scratchLeft(user_id, day),
        ])
      : [0, 0];

    const data = list.map((c) => {
      const row = byChallenge.get(c.cz_daily_challenge_id);
      const done = row?.status === 'completed' || row?.status === 'claimed';
      const progress = done ? c.target_count : Math.min(row?.progress ?? 0, c.target_count);
      const awaitingScratch = c.type === 'quiz' && done && pendingScratch > 0;
      return {
        cz_daily_challenge_id: c.cz_daily_challenge_id,
        type: c.type,
        title: c.title,
        description: c.description,
        icon_url: c.icon_url,
        /**
         * Where the tile's arrow sends the app. A finished quiz that left an
         * unscratched card points at the card instead of the answered question.
         */
        action: awaitingScratch ? 'scratch' : c.action,
        /** Draw attention to this tile — there is something waiting on it. */
        is_highlighted: awaitingScratch,
        highlight_reason: awaitingScratch ? 'scratch_card_ready' : null,
        /** Unscratched cards this tile won. Only ever set on the quiz tile. */
        pending_scratch_cards: awaitingScratch ? pendingScratch : 0,
        reward_coins: c.reward_coins,
        reward_gems: c.reward_gems,
        target: c.target_count,
        progress,
        progress_label: `${progress}/${c.target_count}`,
        is_completed: done,
        completed_at: row?.completed_at ?? null,
        /** False on a past day, or once it is finished. */
        is_playable: is_today && !done,
        /** The tile is finished but still has something to collect. */
        has_pending_action: awaitingScratch,
      };
    });

    const completed = data.filter((c) => c.is_completed).length;
    const all_done = completed === data.length && data.length > 0;

    const dailySpinLimit = DAILY_SPINS;
    const quizAnsweredRow = byChallenge.get(
      list.find((c) => c.type === 'quiz')?.cz_daily_challenge_id ?? '',
    );

    return {
      date: day,
      is_today,
      /** A past day is a read-only view; nothing on it can be played. */
      is_read_only: !is_today,
      streak_days: streak?.current_day ?? 0,

      /** The "complete all the challenges to claim" header. */
      master_chest: {
        reward_coins: chestCoins,
        reward_gems: chestGems,
        completed,
        total: data.length,
        progress_label: `${completed}/${data.length}`,
        percent: data.length ? Math.round((completed / data.length) * 100) : 0,
        is_unlocked: all_done,
        is_claimed: Boolean(chest),
        can_claim: is_today && all_done && !chest,
        claimed_at: chest?.claimed_at ?? null,
      },

      /** Everything a tile pays, plus the chest — the "maximum earning" figure. */
      max_earning: {
        coins: data.reduce((s, c) => s + c.reward_coins, 0) + chestCoins,
        gems: data.reduce((s, c) => s + c.reward_gems, 0) + chestGems,
      },

      /** What the games can offer right now. Always false on a past day. */
      availability: {
        spin_available: is_today && spunToday < dailySpinLimit,
        spins_left: is_today ? Math.max(0, dailySpinLimit - spunToday) : 0,
        quiz_available:
          is_today && Boolean(quiz) && quizAnsweredRow?.status !== 'completed',
        quiz_id: is_today ? (quiz?.cz_quiz_id ?? null) : null,
        scratch_cards_left: scratchLeft,
        /** Cards won today that have not been scratched yet. */
        scratch_cards_pending: pendingScratch,
        scratch_available: scratchLeft > 0,
      },

      calendar: await this.calendar(user_id, today),
      data,
      total: data.length,
    };
  }

  /** The day strip: past days are viewable, future days are locked. */
  private async calendar(user_id: string, today: string) {
    const from = addDaysToDate(today, -HISTORY_DAYS);
    const rows = await this.progress.find({
      where: { user_id, date: Between(from, today) },
    });
    const active = await this.challenges.count({ where: { is_active: true } });

    const done = new Map<string, number>();
    for (const r of rows) {
      if (r.status === 'completed' || r.status === 'claimed') {
        done.set(r.date, (done.get(r.date) ?? 0) + 1);
      }
    }

    const days: {
      date: string;
      label: string;
      completed: number;
      total: number;
      is_today: boolean;
      is_locked: boolean;
      is_viewable: boolean;
    }[] = [];

    for (let i = -HISTORY_DAYS; i <= FUTURE_DAYS; i += 1) {
      const d = addDaysToDate(today, i);
      const future = i > 0;
      days.push({
        date: d,
        label: d.slice(8),
        completed: done.get(d) ?? 0,
        total: active,
        is_today: i === 0,
        // A future day cannot be opened at all.
        is_locked: future,
        is_viewable: !future,
      });
    }
    return days;
  }

  /**
   * Cards come only from the quiz, so what is left is simply what has been
   * won and not yet scratched. Must match ScratchService.getStatus.
   */
  private async scratchLeft(user_id: string, date: string): Promise<number> {
    return this.grants.count({ where: { user_id, date, used_at: IsNull() } });
  }

  /** Pays the master chest once, and only when every tile is finished. */
  async claimChest(user_id: string) {
    const date = todayDate();
    const [list, rows, existing, coins, gems] = await Promise.all([
      this.challenges.find({ where: { is_active: true } }),
      this.progress.find({ where: { user_id, date } }),
      this.chests.findOne({ where: { user_id, date } }),
      this.settings.getNumber(SettingKeys.DAILY_CHEST_COINS),
      this.settings.getNumber(SettingKeys.DAILY_CHEST_GEMS),
    ]);

    if (existing) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.CHALLENGE_ALREADY_CLAIMED,
      });
    }

    const doneIds = new Set(
      rows
        .filter((r) => r.status === 'completed' || r.status === 'claimed')
        .map((r) => r.challenge_id),
    );
    const outstanding = list.filter((c) => !doneIds.has(c.cz_daily_challenge_id));
    if (outstanding.length) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.CHALLENGE_NOT_COMPLETED,
        cz_error_description: `${outstanding.length} challenge(s) still to finish today.`,
      });
    }

    const claim = await this.chests.save(
      this.chests.create({ user_id, date, reward_coins: coins, reward_gems: gems }),
    );

    if (coins > 0) {
      await this.wallet.credit({
        user_id,
        currency: 'coin',
        amount: coins,
        type: 'earn',
        source_type: 'challenge',
        source_id: claim.cz_daily_chest_claim_id,
      });
    }
    if (gems > 0) {
      await this.wallet.credit({
        user_id,
        currency: 'gem',
        amount: gems,
        type: 'earn',
        source_type: 'challenge',
        source_id: claim.cz_daily_chest_claim_id,
      });
    }

    return {
      claimed: true,
      date,
      reward_coins: coins,
      reward_gems: gems,
      claimed_at: claim.claimed_at,
    };
  }

  /** Midnight-to-midnight bounds for a calendar date, in UTC. */
  private dayRange(date: string) {
    return Between(
      new Date(`${date}T00:00:00.000Z`),
      new Date(`${date}T23:59:59.999Z`),
    );
  }
}
