import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { RewardGame } from '../../database/entities/reward-game.entity';
import { RewardPrize } from '../../database/entities/reward-prize.entity';
import { RewardPayoutRule } from '../../database/entities/reward-payout-rule.entity';
import { RewardPlay } from '../../database/entities/reward-play.entity';
import { LuckyDraw } from '../../database/entities/lucky-draw.entity';
import { LuckyDrawEntry } from '../../database/entities/lucky-draw-entry.entity';
import { LuckyDrawWinner } from '../../database/entities/lucky-draw-winner.entity';
import { User } from '../../database/entities/user.entity';
import { CzGameErrorCodes } from '../../common/errors/error.constants';
import { pickByWeight } from '../../common/utils/random.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { LedgerEntry, WalletService } from '../wallet/wallet.service';
import { AchievementsService } from '../achievements/achievements.service';
import { maskEmail } from '../../common/utils/mask.util';
import {
  currentPeriodKey,
  periodEnd,
  periodStart,
} from './reward-period.util';

/** How many winners the public feed shows per draw before "Show More". */
const WINNERS_PREVIEW = 3;

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardGame)
    private readonly games: Repository<RewardGame>,
    @InjectRepository(RewardPrize)
    private readonly prizes: Repository<RewardPrize>,
    @InjectRepository(RewardPayoutRule)
    private readonly rules: Repository<RewardPayoutRule>,
    @InjectRepository(RewardPlay)
    private readonly plays: Repository<RewardPlay>,
    @InjectRepository(LuckyDraw)
    private readonly draws: Repository<LuckyDraw>,
    @InjectRepository(LuckyDrawEntry)
    private readonly entries: Repository<LuckyDrawEntry>,
    @InjectRepository(LuckyDrawWinner)
    private readonly winners: Repository<LuckyDrawWinner>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly wallet: WalletService,
    private readonly achievements: AchievementsService,
  ) {}

  /* ------------------------------------------------------------ the list */

  /** The Rewards screen: every card, its countdown, and where the user stands. */
  async list(user_id: string) {
    const games = await this.games.find({
      where: { status: Not('paused' as never) },
      order: { display_order: 'ASC' },
    });
    if (!games.length) return { data: [], total: 0 };

    const drawGames = games.filter((g) => g.kind === 'draw');
    const openDraws = drawGames.length
      ? await this.draws.find({
          where: {
            game_id: In(drawGames.map((g) => g.cz_reward_game_id)),
            status: 'open',
          },
        })
      : [];
    const drawByGame = new Map(openDraws.map((d) => [d.game_id, d]));

    const myEntries = openDraws.length
      ? await this.entries.find({
          where: {
            user_id,
            draw_id: In(openDraws.map((d) => d.cz_lucky_draw_id)),
          },
        })
      : [];
    const minePerDraw = new Map<string, number>();
    for (const e of myEntries) {
      minePerDraw.set(e.draw_id, (minePerDraw.get(e.draw_id) ?? 0) + e.entries_count);
    }

    const now = Date.now();
    const data = games.map((g) => {
      const draw = drawByGame.get(g.cz_reward_game_id) ?? null;
      const endsAt = draw?.draw_date ?? null;
      return {
        cz_reward_game_id: g.cz_reward_game_id,
        slug: g.slug,
        kind: g.kind,
        cadence: g.cadence,
        title: g.title,
        subtitle: g.subtitle,
        icon_url: g.icon_url,
        /** The "5,000 Coins" line. Display only — the real pot scales with turnout. */
        headline_prize_coins: g.headline_prize_coins,
        entry_cost_gems: g.entry_cost_gems,
        status: g.status,
        is_playable: g.status === 'live',
        /** Seconds until the draw settles. `null` for an instant game. */
        ends_at: endsAt,
        seconds_remaining: endsAt
          ? Math.max(0, Math.floor((endsAt.getTime() - now) / 1000))
          : null,
        my_entries: draw ? (minePerDraw.get(draw.cz_lucky_draw_id) ?? 0) : 0,
        cz_lucky_draw_id: draw?.cz_lucky_draw_id ?? null,
        display_order: g.display_order,
      };
    });

    return { data, total: data.length };
  }

  /* ---------------------------------------------------------- the detail */

  /** One card's screen: pot, countdown, my entries, prize ladder, winners. */
  async detail(user_id: string, slug: string) {
    const game = await this.gameOrFail(slug);
    const prizes = await this.prizes.find({
      where: { game_id: game.cz_reward_game_id, is_active: true },
      order: { rank: 'ASC' },
    });

    const base = {
      cz_reward_game_id: game.cz_reward_game_id,
      slug: game.slug,
      kind: game.kind,
      cadence: game.cadence,
      title: game.title,
      subtitle: game.subtitle,
      icon_url: game.icon_url,
      headline_prize_coins: game.headline_prize_coins,
      entry_cost_gems: game.entry_cost_gems,
      status: game.status,
      is_playable: game.status === 'live',
      min_entries: game.min_entries,
      max_entries: game.max_entries,
      entry_packs: game.entry_packs ?? [],
      how_it_works: game.how_it_works ?? [],
      terms_url: game.terms_url,
      /** Ranked prizes for a draw; weighted segments for a wheel, odds withheld. */
      prizes: prizes.map((p) => ({
        cz_reward_prize_id: p.cz_reward_prize_id,
        rank: p.rank,
        label: p.label,
        reward_coins: p.reward_coins,
        reward_gems: p.reward_gems,
      })),
    };

    if (game.kind === 'instant') {
      const [playsToday, lastPlay] = await Promise.all([
        this.plays.count({
          where: {
            game_id: game.cz_reward_game_id,
            user_id,
            played_at: Between(periodStart('daily'), new Date()),
          },
        }),
        this.plays.findOne({
          where: { game_id: game.cz_reward_game_id, user_id },
          order: { played_at: 'DESC' },
        }),
      ]);
      return {
        ...base,
        draw: null,
        /** No cap: an entry buys a spin, and a user can buy as many as they like. */
        my_plays_today: playsToday,
        last_play: lastPlay
          ? {
              label: lastPlay.label,
              reward_coins: lastPlay.reward_coins,
              reward_gems: lastPlay.reward_gems,
              played_at: lastPlay.played_at,
            }
          : null,
        recent_winners: await this.recentWinners(game, WINNERS_PREVIEW),
      };
    }

    const draw = await this.openDraw(game);
    const [myEntries, stats] = await Promise.all([
      this.myEntryCount(user_id, draw?.cz_lucky_draw_id),
      this.drawStats(draw?.cz_lucky_draw_id),
    ]);
    const now = Date.now();

    return {
      ...base,
      draw: draw
        ? {
            cz_lucky_draw_id: draw.cz_lucky_draw_id,
            period_key: draw.period_key,
            opens_at: draw.opens_at,
            draw_date: draw.draw_date,
            seconds_remaining: Math.max(
              0,
              Math.floor((draw.draw_date.getTime() - now) / 1000),
            ),
            /** What the pot pays at the current turnout. Grows as people join. */
            prize_pool_coins: this.poolFor(
              await this.rulesFor(game.cz_reward_game_id),
              stats.participants,
              draw.prize_pool_coins,
            ).prize_pool_coins,
            participants_count: stats.participants,
            entries_count: stats.entries,
            my_entries: myEntries,
            /** Entries the average player holds — the "Below Average" line. */
            average_entries: stats.participants
              ? Number((stats.entries / stats.participants).toFixed(1))
              : 0,
          }
        : null,
      my_plays_today: null,
      last_play: null,
      recent_winners: await this.recentWinners(game, WINNERS_PREVIEW),
    };
  }

  /* --------------------------------------------------------- buy entries */

  /** Buys `count` entries with gems. Unlimited, and more entries win more often. */
  async buyEntries(user_id: string, slug: string, count: number) {
    const game = await this.gameOrFail(slug);
    this.assertPlayable(game);

    // The wrong-game error is the more useful one, so it is checked first.
    if (game.kind !== 'draw') {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.REWARD_NOT_A_DRAW,
      });
    }
    if (count < game.min_entries || count > game.max_entries) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.REWARD_ENTRY_COUNT_INVALID,
        cz_error_description: `Buy between ${game.min_entries} and ${game.max_entries} entries.`,
      });
    }

    const draw = await this.openDraw(game);
    if (!draw) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.DRAW_CLOSED,
        cz_error_description: 'No draw is open for this game right now.',
      });
    }
    if (draw.draw_date.getTime() <= Date.now()) {
      throw new BadRequestException({ cz_error_code: CzGameErrorCodes.DRAW_CLOSED });
    }

    const gems = game.entry_cost_gems * count;
    const entry = await this.entries.save(
      this.entries.create({
        user_id,
        draw_id: draw.cz_lucky_draw_id,
        entries_count: count,
        gems_spent: gems,
        entry_cost_gems: game.entry_cost_gems,
      }),
    );

    // The debit throws on an empty wallet, so the entry must not survive it.
    try {
      if (gems > 0) {
        await this.wallet.debit({
          user_id,
          currency: 'gem',
          amount: gems,
          type: 'spend',
          source_type: 'lucky_draw',
          source_id: entry.cz_lucky_draw_entry_id,
        });
      }
    } catch (error) {
      await this.entries.delete({
        cz_lucky_draw_entry_id: entry.cz_lucky_draw_entry_id,
      });
      throw error;
    }

    void this.achievements.trackProgress(user_id, 'enter_lucky_draw');
    const stats = await this.drawStats(draw.cz_lucky_draw_id);
    await this.draws.update(
      { cz_lucky_draw_id: draw.cz_lucky_draw_id },
      { participants_count: stats.participants, entries_count: stats.entries },
    );

    return {
      cz_lucky_draw_entry_id: entry.cz_lucky_draw_entry_id,
      cz_lucky_draw_id: draw.cz_lucky_draw_id,
      entries_bought: count,
      gems_spent: gems,
      my_entries: await this.myEntryCount(user_id, draw.cz_lucky_draw_id),
      participants_count: stats.participants,
      entries_count: stats.entries,
      draw_date: draw.draw_date,
    };
  }

  /* ------------------------------------------------------------ instant */

  /** Pays for one spin and resolves it immediately. No daily cap. */
  async play(user_id: string, slug: string) {
    const game = await this.gameOrFail(slug);
    this.assertPlayable(game);
    if (game.kind !== 'instant') {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.REWARD_NOT_INSTANT,
      });
    }

    const pool = await this.prizes.find({
      where: { game_id: game.cz_reward_game_id, is_active: true },
    });
    const weighted = pool.filter((p) => (p.probability_weight ?? 0) > 0);
    if (!weighted.length) {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.REWARD_NOT_CONFIGURED,
      });
    }

    if (game.entry_cost_gems > 0) {
      await this.wallet.debit({
        user_id,
        currency: 'gem',
        amount: game.entry_cost_gems,
        type: 'spend',
        source_type: 'game',
        source_id: null,
      });
    }

    const won = pickByWeight(
      weighted.map((p) => ({ ...p, probability_weight: p.probability_weight ?? 0 })),
    );
    const play = await this.plays.save(
      this.plays.create({
        game_id: game.cz_reward_game_id,
        user_id,
        prize_id: won.cz_reward_prize_id,
        label: won.label,
        gems_spent: game.entry_cost_gems,
        reward_coins: won.reward_coins,
        reward_gems: won.reward_gems,
      }),
    );

    const credits: LedgerEntry[] = [];
    if (won.reward_coins > 0) {
      credits.push({
        user_id,
        currency: 'coin' as const,
        amount: won.reward_coins,
        type: 'earn' as const,
        source_type: 'game' as const,
        source_id: play.cz_reward_play_id,
      });
    }
    if (won.reward_gems > 0) {
      credits.push({
        user_id,
        currency: 'gem' as const,
        amount: won.reward_gems,
        type: 'earn' as const,
        source_type: 'game' as const,
        source_id: play.cz_reward_play_id,
      });
    }
    await this.wallet.creditMany(credits);
    void this.achievements.trackProgress(user_id, 'play_spin');

    return {
      cz_reward_play_id: play.cz_reward_play_id,
      cz_reward_prize_id: won.cz_reward_prize_id,
      label: won.label,
      reward_coins: won.reward_coins,
      reward_gems: won.reward_gems,
      gems_spent: game.entry_cost_gems,
      played_at: play.played_at,
    };
  }

  /* ------------------------------------------------------------ winners */

  /**
   * The public winners feed. Identity is masked here, not in the app, so a
   * raw email never leaves the server.
   */
  async listWinners(
    slug: string | undefined,
    query: { date?: string; date_from?: string; date_to?: string; page?: number; limit?: number },
  ) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const qb = this.winners
      .createQueryBuilder('w')
      .innerJoin('lucky_draws', 'd', 'd.cz_lucky_draw_id = w.draw_id')
      .leftJoin('reward_games', 'g', 'g.cz_reward_game_id = d.game_id')
      .leftJoin('users', 'u', 'u.cz_user_id = w.user_id')
      .select([
        'w.cz_lucky_draw_winner_id AS cz_lucky_draw_winner_id',
        'w.rank AS rank',
        'w.prize_amount AS prize_amount',
        'w.prize_gems AS prize_gems',
        'w.entries_held AS entries_held',
        'w.created_at AS created_at',
        'd.cz_lucky_draw_id AS cz_lucky_draw_id',
        'd.period_key AS period_key',
        'd.draw_date AS draw_date',
        'g.slug AS game_slug',
        'g.title AS game_title',
        'u.email AS email',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
        'u.country AS country',
      ]);

    if (slug) qb.andWhere('g.slug = :slug', { slug });
    if (query.date) {
      qb.andWhere("to_char(d.draw_date AT TIME ZONE 'UTC', 'YYYY-MM-DD') = :d", {
        d: query.date,
      });
    }
    if (query.date_from) {
      qb.andWhere("d.draw_date >= (:from)::date", { from: query.date_from });
    }
    if (query.date_to) {
      qb.andWhere("d.draw_date < ((:to)::date + interval '1 day')", {
        to: query.date_to,
      });
    }

    const [rows, total] = await Promise.all([
      qb
        .orderBy('d.draw_date', 'DESC')
        .addOrderBy('w.rank', 'ASC')
        .offset(skip)
        .limit(take)
        .getRawMany<RawWinner>(),
      qb.getCount(),
    ]);

    return {
      data: rows.map((r) => ({
        cz_lucky_draw_winner_id: r.cz_lucky_draw_winner_id,
        cz_lucky_draw_id: r.cz_lucky_draw_id,
        game_slug: r.game_slug,
        game_title: r.game_title,
        period_key: r.period_key,
        draw_date: r.draw_date,
        rank: Number(r.rank),
        /** Masked server-side; the real address is never sent. */
        masked_name: maskEmail(r.email, r.name),
        avatar_url: r.avatar_url,
        country: r.country,
        prize_coins: Number(r.prize_amount ?? 0),
        prize_gems: Number(r.prize_gems ?? 0),
        entries_held: Number(r.entries_held ?? 0),
      })),
      total,
    };
  }

  /* ------------------------------------------------------------ helpers */

  private async gameOrFail(slug: string): Promise<RewardGame> {
    const game = await this.games.findOne({ where: { slug } });
    if (!game) {
      throw new NotFoundException({
        cz_error_code: CzGameErrorCodes.REWARD_GAME_NOT_FOUND,
      });
    }
    return game;
  }

  private assertPlayable(game: RewardGame): void {
    if (game.status === 'coming_soon') {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.REWARD_COMING_SOON,
      });
    }
    if (game.status !== 'live') {
      throw new BadRequestException({
        cz_error_code: CzGameErrorCodes.REWARD_GAME_PAUSED,
      });
    }
  }

  private async openDraw(game: RewardGame): Promise<LuckyDraw | null> {
    return this.draws.findOne({
      where: { game_id: game.cz_reward_game_id, status: 'open' },
      order: { draw_date: 'ASC' },
    });
  }

  private async myEntryCount(user_id: string, draw_id?: string): Promise<number> {
    if (!draw_id) return 0;
    const row = await this.entries
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.entries_count), 0)', 'n')
      .where('e.user_id = :user_id AND e.draw_id = :draw_id', { user_id, draw_id })
      .getRawOne<{ n: string }>();
    return Number(row?.n ?? 0);
  }

  async drawStats(draw_id?: string): Promise<{ participants: number; entries: number }> {
    if (!draw_id) return { participants: 0, entries: 0 };
    const row = await this.entries
      .createQueryBuilder('e')
      .select('COUNT(DISTINCT e.user_id)', 'participants')
      .addSelect('COALESCE(SUM(e.entries_count), 0)', 'entries')
      .where('e.draw_id = :draw_id', { draw_id })
      .getRawOne<{ participants: string; entries: string }>();
    return {
      participants: Number(row?.participants ?? 0),
      entries: Number(row?.entries ?? 0),
    };
  }

  async rulesFor(game_id: string): Promise<RewardPayoutRule[]> {
    return this.rules.find({
      where: { game_id, is_active: true },
      order: { min_participants: 'ASC' },
    });
  }

  /** The highest band the turnout clears. Falls back to the draw's own pot. */
  poolFor(
    rules: RewardPayoutRule[],
    participants: number,
    fallbackPool: number,
  ): { prize_pool_coins: number; winners_count: number } {
    const matched = rules
      .filter((r) => participants >= r.min_participants)
      .sort((a, b) => b.min_participants - a.min_participants)[0];
    if (!matched) return { prize_pool_coins: fallbackPool, winners_count: 1 };
    return {
      prize_pool_coins: matched.prize_pool_coins,
      winners_count: Math.max(1, matched.winners_count),
    };
  }

  private async recentWinners(game: RewardGame, limit: number) {
    const { data } = await this.listWinners(game.slug, { page: 1, limit });
    return data;
  }
}

interface RawWinner {
  cz_lucky_draw_winner_id: string;
  cz_lucky_draw_id: string;
  game_slug: string | null;
  game_title: string | null;
  period_key: string | null;
  draw_date: Date;
  rank: number;
  prize_amount: number | null;
  prize_gems: number | null;
  entries_held: number | null;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  country: string | null;
}
