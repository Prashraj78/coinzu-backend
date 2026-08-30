import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyChallenge } from '../../../database/entities/daily-challenge.entity';
import { UserChallengeProgress } from '../../../database/entities/user-challenge-progress.entity';
import { DailyChestClaim } from '../../../database/entities/daily-chest-claim.entity';
import { SpinHistory } from '../../../database/entities/spin-history.entity';
import { ScratchHistory } from '../../../database/entities/scratch-history.entity';
import { QuizAttempt } from '../../../database/entities/quiz-attempt.entity';
import { addDaysToDate, todayDate } from '../../../common/utils/date.util';
import { DailyDashboardDto } from '../../daily/dto/admin-daily.dto';

type Source = 'spin' | 'scratch' | 'quiz' | 'challenge' | 'chest';

const SOURCE_LABEL: Record<Source, string> = {
  spin: 'Spin the Lucky Wheel',
  scratch: 'Scratch & Win',
  quiz: 'Take the Quiz',
  challenge: 'Challenge tiles',
  chest: 'Master chest',
};

/** One payout, whichever table it came out of. */
interface Payout {
  source: Source;
  /** The segment, prize, quiz, tile or chest that paid. */
  bucket_id: string;
  bucket_label: string;
  user_id: string;
  date: string;
  coins: number;
  gems: number;
}

@Injectable()
export class AdminDailyDashboardService {
  constructor(
    @InjectRepository(SpinHistory)
    private readonly spins: Repository<SpinHistory>,
    @InjectRepository(ScratchHistory)
    private readonly scratches: Repository<ScratchHistory>,
    @InjectRepository(QuizAttempt)
    private readonly attempts: Repository<QuizAttempt>,
    @InjectRepository(UserChallengeProgress)
    private readonly progress: Repository<UserChallengeProgress>,
    @InjectRepository(DailyChallenge)
    private readonly challenges: Repository<DailyChallenge>,
    @InjectRepository(DailyChestClaim)
    private readonly chests: Repository<DailyChestClaim>,
  ) {}

  /** Everything the Daily Challenges dashboard shows: how much went out, and where. */
  async overview(query: DailyDashboardDto) {
    const today = todayDate();
    const to = query.date_to ?? today;
    const from = query.date_from ?? addDaysToDate(to, -29);
    const top = query.top ?? 10;

    const wanted = query.source ? [query.source] : (Object.keys(SOURCE_LABEL) as Source[]);
    const rows = (
      await Promise.all(wanted.map((s) => this.load(s, from, to)))
    ).flat();

    // Currency filter is applied by zeroing the other side, so counts stay honest.
    const payouts = rows.map((r) => ({
      ...r,
      coins: query.currency === 'gem' ? 0 : r.coins,
      gems: query.currency === 'coin' ? 0 : r.gems,
    }));

    const days = this.daysBetween(from, to);
    const players = new Set(payouts.map((p) => p.user_id));
    const coins = sum(payouts, 'coins');
    const gems = sum(payouts, 'gems');

    return {
      range: { date_from: from, date_to: to, days },
      filters: {
        source: query.source ?? null,
        currency: query.currency ?? null,
        granularity: query.granularity ?? 'day',
      },
      totals: {
        coins,
        gems,
        payouts: payouts.length,
        players: players.size,
        /** What one payout is worth on average, across everything in range. */
        avg_coins_per_payout: payouts.length ? Math.round(coins / payouts.length) : 0,
        avg_coins_per_player: players.size ? Math.round(coins / players.size) : 0,
        coins_per_day: days ? Math.round(coins / days) : 0,
        gems_per_day: days ? Math.round(gems / days) : 0,
      },
      by_source: this.groupBy(
        payouts,
        (p) => p.source,
        (p) => SOURCE_LABEL[p.source],
        coins,
      ).map((g) => ({ source: g.id as Source, ...g })),
      breakdown: this.groupBy(
        payouts,
        (p) => `${p.source}:${p.bucket_id}`,
        (p) => p.bucket_label,
        coins,
      ).map((g) => ({
        source: g.id.split(':')[0] as Source,
        source_label: SOURCE_LABEL[g.id.split(':')[0] as Source],
        ...g,
      })),
      series: this.series(payouts, from, to, query.granularity ?? 'day'),
      top_earners: await this.topEarners(payouts, top),
      quiz: await this.quizStats(from, to),
      engagement: await this.engagement(from, to, players.size),
    };
  }

  /* -------------------------------------------------------------- loaders */

  private async load(source: Source, from: string, to: string): Promise<Payout[]> {
    if (source === 'spin') {
      const rows = await this.spins
        .createQueryBuilder('h')
        .leftJoin('spin_wheel_configs', 'c', 'c.cz_spin_wheel_config_id = h.config_id')
        .select('h.user_id', 'user_id')
        .addSelect('h.config_id', 'bucket_id')
        .addSelect("COALESCE(c.label, 'Removed segment')", 'bucket_label')
        .addSelect("to_char(h.played_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
        .addSelect('h.reward_coins', 'coins')
        .addSelect('h.reward_gems', 'gems')
        .where(this.dayWindow('h.played_at'), { from, to })
        .getRawMany<RawPayout>();
      return rows.map((r) => this.toPayout('spin', r));
    }

    if (source === 'scratch') {
      const rows = await this.scratches
        .createQueryBuilder('h')
        .leftJoin('scratch_cards', 'c', 'c.cz_scratch_card_id = h.card_id')
        .select('h.user_id', 'user_id')
        .addSelect('h.card_id', 'bucket_id')
        .addSelect("COALESCE(c.label, 'Removed prize')", 'bucket_label')
        .addSelect("to_char(h.played_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
        .addSelect('h.reward_coins', 'coins')
        .addSelect('h.reward_gems', 'gems')
        .where(this.dayWindow('h.played_at'), { from, to })
        .getRawMany<RawPayout>();
      return rows.map((r) => this.toPayout('scratch', r));
    }

    if (source === 'quiz') {
      const rows = await this.attempts
        .createQueryBuilder('a')
        .leftJoin('quizzes', 'q', 'q.cz_quiz_id = a.quiz_id')
        .select('a.user_id', 'user_id')
        .addSelect('a.quiz_id', 'bucket_id')
        .addSelect("COALESCE(to_char(q.date, 'YYYY-MM-DD'), 'Removed quiz')", 'bucket_label')
        .addSelect("to_char(a.attempted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
        .addSelect('a.reward_coins', 'coins')
        .addSelect('0', 'gems')
        .where(this.dayWindow('a.attempted_at'), { from, to })
        .andWhere('a.is_correct = true')
        .getRawMany<RawPayout>();
      return rows.map((r) => ({
        ...this.toPayout('quiz', r),
        bucket_label: `Quiz · ${r.bucket_label}`,
      }));
    }

    if (source === 'chest') {
      const rows = await this.chests
        .createQueryBuilder('c')
        .select('c.user_id', 'user_id')
        .addSelect("'chest'", 'bucket_id')
        .addSelect("'Master chest'", 'bucket_label')
        .addSelect("to_char(c.date, 'YYYY-MM-DD')", 'date')
        .addSelect('c.reward_coins', 'coins')
        .addSelect('c.reward_gems', 'gems')
        .where('c.date BETWEEN :from AND :to', { from, to })
        .getRawMany<RawPayout>();
      return rows.map((r) => this.toPayout('chest', r));
    }

    // Tiles do not store what they paid, so the challenge's current reward is used.
    const rows = await this.progress
      .createQueryBuilder('p')
      .innerJoin('daily_challenges', 'c', 'c.cz_daily_challenge_id = p.challenge_id')
      .select('p.user_id', 'user_id')
      .addSelect('p.challenge_id', 'bucket_id')
      .addSelect('c.title', 'bucket_label')
      .addSelect("to_char(p.date, 'YYYY-MM-DD')", 'date')
      .addSelect('c.reward_coins', 'coins')
      .addSelect('c.reward_gems', 'gems')
      .where('p.date BETWEEN :from AND :to', { from, to })
      .andWhere("p.status IN ('completed', 'claimed')")
      .getRawMany<RawPayout>();
    return rows.map((r) => this.toPayout('challenge', r));
  }

  private dayWindow(column: string): string {
    return `${column} >= (:from)::date AND ${column} < ((:to)::date + interval '1 day')`;
  }

  private toPayout(source: Source, r: RawPayout): Payout {
    return {
      source,
      bucket_id: r.bucket_id,
      bucket_label: r.bucket_label,
      user_id: r.user_id,
      date: r.date,
      coins: Number(r.coins ?? 0),
      gems: Number(r.gems ?? 0),
    };
  }

  /* ------------------------------------------------------------ shaping */

  private groupBy(
    rows: Payout[],
    key: (p: Payout) => string,
    label: (p: Payout) => string,
    totalCoins: number,
  ) {
    const acc = new Map<
      string,
      { id: string; label: string; coins: number; gems: number; payouts: number; users: Set<string> }
    >();
    for (const r of rows) {
      const k = key(r);
      const g =
        acc.get(k) ??
        { id: k, label: label(r), coins: 0, gems: 0, payouts: 0, users: new Set<string>() };
      g.coins += r.coins;
      g.gems += r.gems;
      g.payouts += 1;
      g.users.add(r.user_id);
      acc.set(k, g);
    }
    return [...acc.values()]
      .map((g) => ({
        id: g.id,
        label: g.label,
        coins: g.coins,
        gems: g.gems,
        payouts: g.payouts,
        players: g.users.size,
        avg_coins: g.payouts ? Math.round(g.coins / g.payouts) : 0,
        /** This row's share of every coin paid out in range. */
        share_pct: totalCoins ? Number(((g.coins / totalCoins) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.coins - a.coins || b.payouts - a.payouts);
  }

  /** A dense series — a day with nothing paid still gets a zero, so the chart is honest. */
  private series(rows: Payout[], from: string, to: string, granularity: 'day' | 'week') {
    const buckets = new Map<string, { coins: number; gems: number; payouts: number; users: Set<string> }>();
    const keyOf = (date: string) =>
      granularity === 'week' ? this.weekStart(date) : date;

    for (let d = from; d <= to; d = addDaysToDate(d, 1)) {
      const k = keyOf(d);
      if (!buckets.has(k)) {
        buckets.set(k, { coins: 0, gems: 0, payouts: 0, users: new Set() });
      }
    }
    for (const r of rows) {
      const b = buckets.get(keyOf(r.date));
      if (!b) continue;
      b.coins += r.coins;
      b.gems += r.gems;
      b.payouts += 1;
      b.users.add(r.user_id);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => ({
        date,
        coins: b.coins,
        gems: b.gems,
        payouts: b.payouts,
        players: b.users.size,
      }));
  }

  /** Monday-anchored, so weekly buckets line up with the calendar. */
  private weekStart(date: string): string {
    const d = new Date(`${date}T00:00:00.000Z`);
    const offset = (d.getUTCDay() + 6) % 7;
    return addDaysToDate(date, -offset);
  }

  private async topEarners(rows: Payout[], top: number) {
    const acc = new Map<string, { coins: number; gems: number; payouts: number }>();
    for (const r of rows) {
      const g = acc.get(r.user_id) ?? { coins: 0, gems: 0, payouts: 0 };
      g.coins += r.coins;
      g.gems += r.gems;
      g.payouts += 1;
      acc.set(r.user_id, g);
    }
    const ranked = [...acc.entries()]
      .sort((a, b) => b[1].coins - a[1].coins)
      .slice(0, top);
    if (!ranked.length) return [];

    const users = await this.spins.manager.query<
      { cz_user_id: string; name: string | null; email: string | null }[]
    >(
      'SELECT cz_user_id, name, email FROM users WHERE cz_user_id = ANY($1)',
      [ranked.map(([id]) => id)],
    );
    const byId = new Map(users.map((u) => [u.cz_user_id, u]));

    return ranked.map(([cz_user_id, g], i) => ({
      rank: i + 1,
      cz_user_id,
      name: byId.get(cz_user_id)?.name ?? null,
      email: byId.get(cz_user_id)?.email ?? null,
      ...g,
    }));
  }

  private async quizStats(from: string, to: string) {
    const row = await this.attempts
      .createQueryBuilder('a')
      .select('COUNT(*)', 'attempts')
      .addSelect('COUNT(*) FILTER (WHERE a.is_correct)', 'correct')
      .addSelect('COUNT(DISTINCT a.user_id)', 'players')
      .where(this.dayWindow('a.attempted_at'), { from, to })
      .getRawOne<{ attempts: string; correct: string; players: string }>();

    const attempts = Number(row?.attempts ?? 0);
    const correct = Number(row?.correct ?? 0);
    return {
      attempts,
      correct,
      players: Number(row?.players ?? 0),
      accuracy_pct: attempts ? Math.round((correct / attempts) * 100) : 0,
    };
  }

  private async engagement(from: string, to: string, players: number) {
    const [completions, chests, activeTiles] = await Promise.all([
      this.completionCount(from, to),
      this.chests
        .createQueryBuilder('c')
        .select('COUNT(*)', 'n')
        .where('c.date BETWEEN :from AND :to', { from, to })
        .getRawOne<{ n: string }>()
        .then((r) => Number(r?.n ?? 0)),
      this.challenges.count({ where: { is_active: true } }),
    ]);

    const days = this.daysBetween(from, to);
    const possible = players * activeTiles * days;
    return {
      tile_completions: completions,
      chests_claimed: chests,
      active_tiles: activeTiles,
      /** Of every tile every active player could have finished, how many were. */
      completion_rate_pct: possible
        ? Number(((completions / possible) * 100).toFixed(1))
        : 0,
    };
  }

  private async completionCount(from: string, to: string): Promise<number> {
    const row = await this.progress
      .createQueryBuilder('p')
      .select('COUNT(*)', 'n')
      .where('p.date BETWEEN :from AND :to', { from, to })
      .andWhere("p.status IN ('completed', 'claimed')")
      .getRawOne<{ n: string }>();
    return Number(row?.n ?? 0);
  }

  private daysBetween(from: string, to: string): number {
    const a = Date.parse(`${from}T00:00:00.000Z`);
    const b = Date.parse(`${to}T00:00:00.000Z`);
    return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
  }
}

interface RawPayout {
  user_id: string;
  bucket_id: string;
  bucket_label: string;
  date: string;
  coins: string | number | null;
  gems: string | number | null;
}

function sum(rows: Payout[], key: 'coins' | 'gems'): number {
  return rows.reduce((s, r) => s + r[key], 0);
}
