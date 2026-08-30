import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { DailyChallenge } from '../../../database/entities/daily-challenge.entity';
import { UserChallengeProgress } from '../../../database/entities/user-challenge-progress.entity';
import { DailyChestClaim } from '../../../database/entities/daily-chest-claim.entity';
import { SpinWheelConfig } from '../../../database/entities/spin-wheel-config.entity';
import { SpinHistory } from '../../../database/entities/spin-history.entity';
import { ScratchCard } from '../../../database/entities/scratch-card.entity';
import { ScratchHistory } from '../../../database/entities/scratch-history.entity';
import { Quiz } from '../../../database/entities/quiz.entity';
import { QuizAttempt } from '../../../database/entities/quiz-attempt.entity';
import { CzCommonErrorCodes } from '../../../common/errors/error.constants';
import { addDaysToDate, todayDate } from '../../../common/utils/date.util';
import { SettingsService } from '../../settings/settings.service';
import { SettingKeys } from '../../settings/setting.keys';
import {
  ListQuizzesDto,
  RepeatQuizDto,
  SaveScratchCardsDto,
  SaveSpinWheelDto,
  UpdateChallengeDto,
  UpdateDailyConfigDto,
  UpsertQuizDto,
} from '../../daily/dto/admin-daily.dto';

/** How far back the tab's activity figures look. */
const WINDOW_DAYS = 7;

@Injectable()
export class AdminDailyService {
  constructor(
    @InjectRepository(DailyChallenge)
    private readonly challenges: Repository<DailyChallenge>,
    @InjectRepository(UserChallengeProgress)
    private readonly progress: Repository<UserChallengeProgress>,
    @InjectRepository(DailyChestClaim)
    private readonly chests: Repository<DailyChestClaim>,
    @InjectRepository(SpinWheelConfig)
    private readonly wheel: Repository<SpinWheelConfig>,
    @InjectRepository(SpinHistory)
    private readonly spins: Repository<SpinHistory>,
    @InjectRepository(ScratchCard)
    private readonly scratch: Repository<ScratchCard>,
    @InjectRepository(ScratchHistory)
    private readonly scratchHistory: Repository<ScratchHistory>,
    @InjectRepository(Quiz)
    private readonly quizzes: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly attempts: Repository<QuizAttempt>,
    private readonly settings: SettingsService,
  ) {}

  /* ----------------------------------------------------------- challenges */

  /** The five tiles, the chest, and how the last week went. */
  async overview() {
    const today = todayDate();
    const from = addDaysToDate(today, -WINDOW_DAYS);

    const [list, chestCoins, chestGems, rows, chestsClaimed, activeQuizzes] =
      await Promise.all([
        this.challenges.find({ order: { display_order: 'ASC' } }),
        this.settings.getNumber(SettingKeys.DAILY_CHEST_COINS),
        this.settings.getNumber(SettingKeys.DAILY_CHEST_GEMS),
        this.progress.find({ where: { date: Between(from, today) } }),
        this.chests.count({ where: { date: Between(from, today) } }),
        this.quizzes.count({
          where: { date: MoreThanOrEqual(today), is_active: true },
        }),
      ]);

    const completions = new Map<string, number>();
    const todayCompletions = new Map<string, number>();
    for (const r of rows) {
      if (r.status === 'pending') continue;
      completions.set(r.challenge_id, (completions.get(r.challenge_id) ?? 0) + 1);
      if (r.date === today) {
        todayCompletions.set(
          r.challenge_id,
          (todayCompletions.get(r.challenge_id) ?? 0) + 1,
        );
      }
    }

    const active = list.filter((c) => c.is_active);
    const data = list.map((c) => ({
      cz_daily_challenge_id: c.cz_daily_challenge_id,
      type: c.type,
      title: c.title,
      description: c.description,
      icon_url: c.icon_url,
      action: c.action,
      target_count: c.target_count,
      reward_coins: c.reward_coins,
      reward_gems: c.reward_gems,
      display_order: c.display_order,
      is_active: c.is_active,
      /** Completions in the last 7 days, and today alone. */
      completions_7d: completions.get(c.cz_daily_challenge_id) ?? 0,
      completions_today: todayCompletions.get(c.cz_daily_challenge_id) ?? 0,
    }));

    return {
      data,
      total: data.length,
      chest: {
        reward_coins: chestCoins,
        reward_gems: chestGems,
        claims_7d: chestsClaimed,
      },
      /** Editable here; the Configuration tab no longer carries these. */
      config: {
        chest_coins: chestCoins,
        chest_gems: chestGems,
        /** Both fixed in code: one spin a day, and cards only from the quiz. */
        spin_limit: 1,
        scratch_source: 'quiz',
      },
      summary: {
        active_challenges: active.length,
        /** What a user can collect in a day by finishing everything. */
        max_daily_coins:
          active.reduce((s, c) => s + c.reward_coins, 0) + chestCoins,
        max_daily_gems:
          active.reduce((s, c) => s + c.reward_gems, 0) + chestGems,
        completions_7d: rows.filter((r) => r.status !== 'pending').length,
        scheduled_quizzes: activeQuizzes,
      },
    };
  }

  /** The chest and the scratch allowance live here now, not in Configuration. */
  async updateConfig(dto: UpdateDailyConfigDto) {
    const values: Record<string, number> = {};
    if (dto.chest_coins !== undefined) {
      values[SettingKeys.DAILY_CHEST_COINS] = dto.chest_coins;
    }
    if (dto.chest_gems !== undefined) {
      values[SettingKeys.DAILY_CHEST_GEMS] = dto.chest_gems;
    }
    if (Object.keys(values).length) await this.settings.setNumbers(values);
    return this.overview();
  }

  async updateChallenge(id: string, dto: UpdateChallengeDto) {
    const challenge = await this.challenges.findOne({
      where: { cz_daily_challenge_id: id },
    });
    if (!challenge) {
      throw new NotFoundException({
        cz_error_code: CzCommonErrorCodes.RESOURCE_NOT_FOUND,
        cz_error_description: 'No challenge exists with that id.',
      });
    }
    Object.assign(challenge, dto);
    await this.challenges.save(challenge);
    return this.overview();
  }

  /* ------------------------------------------------------------ the wheel */

  /** Segments with the odds each weight actually produces. */
  async getWheel() {
    const [segments, played] = await Promise.all([
      this.wheel.find({ order: { display_order: 'ASC' } }),
      this.spins.count(),
    ]);
    const active = segments.filter((s) => s.is_active);
    const totalWeight = active.reduce((s, x) => s + x.probability_weight, 0);

    return {
      data: segments.map((s) => ({
        cz_spin_wheel_config_id: s.cz_spin_wheel_config_id,
        label: s.label,
        reward_coins: s.reward_coins,
        reward_gems: s.reward_gems,
        probability_weight: s.probability_weight,
        /** The weight as a real percentage of the active pool. */
        chance_pct:
          s.is_active && totalWeight
            ? Number(((s.probability_weight / totalWeight) * 100).toFixed(2))
            : 0,
        display_order: s.display_order,
        is_active: s.is_active,
      })),
      total: segments.length,
      summary: {
        active_segments: active.length,
        total_weight: Number(totalWeight.toFixed(2)),
        total_spins: played,
        /** What a spin pays on average, at the current odds. */
        expected_coins: totalWeight
          ? Math.round(
              active.reduce(
                (s, x) => s + (x.probability_weight / totalWeight) * x.reward_coins,
                0,
              ),
            )
          : 0,
        expected_gems: totalWeight
          ? Math.round(
              active.reduce(
                (s, x) => s + (x.probability_weight / totalWeight) * x.reward_gems,
                0,
              ),
            )
          : 0,
      },
    };
  }

  /** Replaces the whole wheel, so the odds are never half-written. */
  async saveWheel(dto: SaveSpinWheelDto) {
    const active = dto.segments.filter((s) => s.is_active !== false);
    if (!active.length) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'At least one segment must stay active.',
      });
    }
    if (active.every((s) => s.probability_weight <= 0)) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'At least one active segment needs a weight above 0.',
      });
    }

    await this.wheel.manager.transaction(async (m) => {
      const repo = m.getRepository(SpinWheelConfig);
      await repo.createQueryBuilder().delete().execute();
      await repo.insert(
        dto.segments.map((s, i) => ({
          label: s.label,
          reward_coins: s.reward_coins,
          reward_gems: s.reward_gems,
          probability_weight: s.probability_weight,
          display_order: s.display_order ?? i + 1,
          is_active: s.is_active ?? true,
        })),
      );
    });
    return this.getWheel();
  }

  /* -------------------------------------------------------- scratch cards */

  async getScratch() {
    const [cards, played] = await Promise.all([
      this.scratch.find(),
      this.scratchHistory.count(),
    ]);
    const active = cards.filter((c) => c.is_active);
    const totalWeight = active.reduce((s, x) => s + x.probability_weight, 0);

    return {
      data: cards.map((c) => ({
        cz_scratch_card_id: c.cz_scratch_card_id,
        label: c.label,
        reward_coins: c.reward_coins,
        reward_coins_max: c.reward_coins_max ?? c.reward_coins,
        reward_gems: c.reward_gems,
        reward_gems_max: c.reward_gems_max ?? c.reward_gems,
        is_range:
          (c.reward_coins_max ?? c.reward_coins) > c.reward_coins ||
          (c.reward_gems_max ?? c.reward_gems) > c.reward_gems,
        probability_weight: c.probability_weight,
        chance_pct:
          c.is_active && totalWeight
            ? Number(((c.probability_weight / totalWeight) * 100).toFixed(2))
            : 0,
        /** Gated behind a medal tier; null means everyone is eligible. */
        min_medal_rarity: c.min_medal_rarity,
        is_active: c.is_active,
      })),
      total: cards.length,
      summary: {
        active_prizes: active.length,
        total_weight: Number(totalWeight.toFixed(2)),
        total_scratches: played,
        gated_prizes: active.filter((c) => c.min_medal_rarity).length,
        range_prizes: active.filter(
          (c) => (c.reward_coins_max ?? c.reward_coins) > c.reward_coins,
        ).length,
        expected_coins: totalWeight
          ? Math.round(
              active.reduce(
                (s, x) =>
                  s +
                  (x.probability_weight / totalWeight) *
                    mid(x.reward_coins, x.reward_coins_max),
                0,
              ),
            )
          : 0,
      },
    };
  }

  async saveScratch(dto: SaveScratchCardsDto) {
    const active = dto.cards.filter((c) => c.is_active !== false);
    // A user with no medal must still have something to win.
    if (!active.some((c) => !c.min_medal_rarity)) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description:
          'At least one active prize must be open to everyone, or an unmedalled user could never win.',
      });
    }

    await this.scratch.manager.transaction(async (m) => {
      const repo = m.getRepository(ScratchCard);
      await repo.createQueryBuilder().delete().execute();
      await repo.insert(
        dto.cards.map((c) => ({
          label: c.label,
          reward_coins: c.reward_coins,
          reward_coins_max: capMax(c.reward_coins, c.reward_coins_max),
          reward_gems: c.reward_gems,
          reward_gems_max: capMax(c.reward_gems, c.reward_gems_max),
          probability_weight: c.probability_weight,
          min_medal_rarity: c.min_medal_rarity ?? null,
          is_active: c.is_active ?? true,
        })),
      );
    });
    return this.getScratch();
  }

  /* ------------------------------------------------------------- quizzes */

  /** The schedule, paged and filterable. The gap list always covers the next 15 days. */
  async listQuizzes(query: ListQuizzesDto = {}) {
    const today = todayDate();
    const start = query.from ?? addDaysToDate(today, -7);
    const end = query.to ?? addDaysToDate(today, 60);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.quizzes
      .createQueryBuilder('q')
      .addSelect('q.correct_option')
      .where('q.date BETWEEN :start AND :end', { start, end });

    if (query.state === 'past') qb.andWhere('q.date < :today', { today });
    if (query.state === 'today') qb.andWhere('q.date = :today', { today });
    if (query.state === 'upcoming') qb.andWhere('q.date > :today', { today });
    if (query.search) {
      qb.andWhere(
        '(q.question ILIKE :term OR q.options::text ILIKE :term)',
        { term: `%${query.search}%` },
      );
    }
    if (query.has_image !== undefined) {
      qb.andWhere(
        query.has_image ? 'q.image_url IS NOT NULL' : 'q.image_url IS NULL',
      );
    }
    if (query.is_active !== undefined) {
      qb.andWhere('q.is_active = :a', { a: query.is_active });
    }

    const [quizzes, total] = await qb
      .orderBy('q.date', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const counts = quizzes.length
      ? await this.attempts
          .createQueryBuilder('a')
          .select('a.quiz_id', 'quiz_id')
          .addSelect('COUNT(*)', 'attempts')
          .addSelect('COUNT(*) FILTER (WHERE a.is_correct)', 'correct')
          .where('a.quiz_id IN (:...ids)', {
            ids: quizzes.map((q) => q.cz_quiz_id),
          })
          .groupBy('a.quiz_id')
          .getRawMany<{ quiz_id: string; attempts: string; correct: string }>()
      : [];
    const byQuiz = new Map(counts.map((c) => [c.quiz_id, c]));

    const data = quizzes.map((q) => {
      const c = byQuiz.get(q.cz_quiz_id);
      const attempts = Number(c?.attempts ?? 0);
      const correct = Number(c?.correct ?? 0);
      return {
        cz_quiz_id: q.cz_quiz_id,
        date: q.date,
        question: q.question,
        options: q.options,
        correct_option: q.correct_option,
        image_url: q.image_url,
        is_active: q.is_active,
        attempts,
        correct,
        accuracy_pct: attempts ? Math.round((correct / attempts) * 100) : 0,
        is_past: q.date < today,
        is_today: q.date === today,
      };
    });

    // The gaps are counted over the whole horizon, never just the page.
    const horizon = Array.from({ length: 15 }, (_, i) => addDaysToDate(today, i));
    const [scheduled, ahead] = await Promise.all([
      this.quizzes
        .createQueryBuilder('q')
        .select("to_char(q.date, 'YYYY-MM-DD')", 'date')
        .where('q.date IN (:...days)', { days: horizon })
        .andWhere('q.is_active = true')
        .getRawMany<{ date: string }>(),
      this.quizzes.count({
        where: { date: MoreThanOrEqual(today), is_active: true },
      }),
    ]);
    const have = new Set(scheduled.map((r) => r.date));
    const missing = horizon.filter((d) => !have.has(d));

    return {
      data,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        scheduled_ahead: ahead,
        missing_days: missing,
        /** True when the next 15 days are all covered. */
        fully_scheduled: missing.length === 0,
      },
    };
  }

  /** Copies a quiz onto another day, so a good question can run again. */
  async repeatQuiz(id: string, dto: RepeatQuizDto) {
    const source = await this.quizzes
      .createQueryBuilder('q')
      .addSelect('q.correct_option')
      .where('q.cz_quiz_id = :id', { id })
      .getOne();
    if (!source) {
      throw new NotFoundException({
        cz_error_code: CzCommonErrorCodes.RESOURCE_NOT_FOUND,
        cz_error_description: 'No quiz exists with that id.',
      });
    }
    if (source.date === dto.date) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'That is the day the quiz already runs on.',
      });
    }
    return this.upsertQuiz({
      date: dto.date,
      question: source.question,
      options: source.options,
      correct_option: source.correct_option,
      image_url: source.image_url ?? undefined,
      is_active: source.is_active,
    });
  }

  /** One quiz per day: saving over an existing date replaces it. */
  async upsertQuiz(dto: UpsertQuizDto) {
    if (!dto.options.includes(dto.correct_option)) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'correct_option must be one of the options.',
      });
    }

    const existing = await this.quizzes.findOne({ where: { date: dto.date } });
    const quiz = existing ?? this.quizzes.create({ date: dto.date });
    Object.assign(quiz, {
      question: dto.question,
      options: dto.options,
      correct_option: dto.correct_option,
      image_url: dto.image_url ?? null,
      is_active: dto.is_active ?? true,
    });
    await this.quizzes.save(quiz);
    return this.listQuizzes();
  }

  async deleteQuiz(id: string) {
    const quiz = await this.quizzes.findOne({ where: { cz_quiz_id: id } });
    if (!quiz) {
      throw new NotFoundException({
        cz_error_code: CzCommonErrorCodes.RESOURCE_NOT_FOUND,
        cz_error_description: 'No quiz exists with that id.',
      });
    }
    await this.quizzes.delete({ cz_quiz_id: id });
    return this.listQuizzes();
  }
}

/** A range's average, used for expected value. Falls back to the exact amount. */
function mid(min: number, max: number | null): number {
  return max != null && max > min ? (min + max) / 2 : min;
}

/** A max below its min is meaningless, so it is dropped rather than stored. */
function capMax(min: number, max: number | undefined): number | null {
  return max == null || max <= min ? null : max;
}
