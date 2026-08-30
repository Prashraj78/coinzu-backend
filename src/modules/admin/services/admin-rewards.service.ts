import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardGame } from '../../../database/entities/reward-game.entity';
import { RewardPrize } from '../../../database/entities/reward-prize.entity';
import { RewardPayoutRule } from '../../../database/entities/reward-payout-rule.entity';
import { RewardPlay } from '../../../database/entities/reward-play.entity';
import { LuckyDraw } from '../../../database/entities/lucky-draw.entity';
import { LuckyDrawEntry } from '../../../database/entities/lucky-draw-entry.entity';
import { LuckyDrawWinner } from '../../../database/entities/lucky-draw-winner.entity';
import { CzCommonErrorCodes } from '../../../common/errors/error.constants';
import { addDaysToDate, todayDate } from '../../../common/utils/date.util';
import { toSkipTake } from '../../../common/utils/pagination.util';
import { maskEmail } from '../../../common/utils/mask.util';
import { SettingsService } from '../../settings/settings.service';
import { SettingKeys } from '../../settings/setting.keys';
import { RewardsService } from '../../rewards/rewards.service';
import { RewardDrawScheduler } from '../../rewards/reward-draw.scheduler';
import {
  DrawsQueryDto,
  RewardDashboardDto,
  SavePayoutRulesDto,
  SavePrizesDto,
  UpdateRewardGameDto,
} from '../../rewards/dto/admin-rewards.dto';

@Injectable()
export class AdminRewardsService {
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
    private readonly rewards: RewardsService,
    private readonly scheduler: RewardDrawScheduler,
    private readonly settings: SettingsService,
  ) {}

  /* -------------------------------------------------------------- games */

  /** Every card with its live figures. The Rewards tab's first screen. */
  async listGames() {
    const games = await this.games.find({ order: { display_order: 'ASC' } });
    if (!games.length) return { data: [], total: 0, summary: this.emptySummary() };

    const ids = games.map((g) => g.cz_reward_game_id);
    const [prizes, rules, openDraws, playAgg, entryAgg] = await Promise.all([
      this.prizes.find(),
      this.rules.find(),
      this.draws.find({ where: { status: 'open' } }),
      this.plays
        .createQueryBuilder('p')
        .select('p.game_id', 'game_id')
        .addSelect('COUNT(*)', 'plays')
        .addSelect('COALESCE(SUM(p.gems_spent), 0)', 'gems_in')
        .addSelect('COALESCE(SUM(p.reward_coins), 0)', 'coins_out')
        .groupBy('p.game_id')
        .getRawMany<{ game_id: string; plays: string; gems_in: string; coins_out: string }>(),
      this.entries
        .createQueryBuilder('e')
        .innerJoin('lucky_draws', 'd', 'd.cz_lucky_draw_id = e.draw_id')
        .select('d.game_id', 'game_id')
        .addSelect('COALESCE(SUM(e.entries_count), 0)', 'entries')
        .addSelect('COALESCE(SUM(e.gems_spent), 0)', 'gems_in')
        .addSelect('COUNT(DISTINCT e.user_id)', 'players')
        .groupBy('d.game_id')
        .getRawMany<{ game_id: string; entries: string; gems_in: string; players: string }>(),
    ]);

    const playByGame = new Map(playAgg.map((r) => [r.game_id, r]));
    const entryByGame = new Map(entryAgg.map((r) => [r.game_id, r]));
    const drawByGame = new Map(openDraws.map((d) => [d.game_id ?? '', d]));

    const data = games.map((g) => {
      const p = playByGame.get(g.cz_reward_game_id);
      const e = entryByGame.get(g.cz_reward_game_id);
      const draw = drawByGame.get(g.cz_reward_game_id) ?? null;
      return {
        ...this.shapeGame(g),
        prize_count: prizes.filter((x) => x.game_id === g.cz_reward_game_id).length,
        rule_count: rules.filter((x) => x.game_id === g.cz_reward_game_id).length,
        open_draw: draw
          ? {
              cz_lucky_draw_id: draw.cz_lucky_draw_id,
              period_key: draw.period_key,
              draw_date: draw.draw_date,
              participants_count: draw.participants_count,
              entries_count: draw.entries_count,
              prize_pool_coins: draw.prize_pool_coins,
            }
          : null,
        /** Lifetime, so a paused game still shows what it did. */
        total_plays: Number(p?.plays ?? 0),
        total_entries: Number(e?.entries ?? 0),
        total_players: Number(e?.players ?? 0),
        gems_collected: Number(p?.gems_in ?? 0) + Number(e?.gems_in ?? 0),
        coins_paid: Number(p?.coins_out ?? 0),
      };
    });

    const liveDraws = data.filter((g) => g.kind === 'draw' && g.status === 'live');
    return {
      data,
      total: data.length,
      summary: {
        live_games: data.filter((g) => g.status === 'live').length,
        coming_soon: data.filter((g) => g.status === 'coming_soon').length,
        gems_collected: data.reduce((s, g) => s + g.gems_collected, 0),
        coins_paid: data.reduce((s, g) => s + g.coins_paid, 0),
        open_draws: liveDraws.filter((g) => g.open_draw).length,
        /** A live draw game with no open instance cannot be entered. */
        draws_missing: liveDraws.filter((g) => !g.open_draw).length,
      },
    };
  }

  async updateGame(id: string, dto: UpdateRewardGameDto) {
    const game = await this.games.findOne({ where: { cz_reward_game_id: id } });
    if (!game) {
      throw new NotFoundException({
        cz_error_code: CzCommonErrorCodes.RESOURCE_NOT_FOUND,
        cz_error_description: 'No reward game exists with that id.',
      });
    }
    if (
      dto.min_entries !== undefined &&
      dto.max_entries !== undefined &&
      dto.min_entries > dto.max_entries
    ) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'min_entries cannot be above max_entries.',
      });
    }
    Object.assign(game, dto);
    await this.games.save(game);
    return this.listGames();
  }

  /* ------------------------------------------------------------- prizes */

  async getPrizes(game_id: string) {
    const game = await this.gameOrFail(game_id);
    const rows = await this.prizes.find({ where: { game_id }, order: { rank: 'ASC' } });
    const active = rows.filter((r) => r.is_active);
    const weight = active.reduce((s, r) => s + (r.probability_weight ?? 0), 0);

    return {
      data: rows.map((r) => ({
        cz_reward_prize_id: r.cz_reward_prize_id,
        rank: r.rank,
        label: r.label,
        reward_coins: r.reward_coins,
        reward_gems: r.reward_gems,
        probability_weight: r.probability_weight,
        /** Only meaningful on an instant game; a draw ranks instead of weighting. */
        chance_pct:
          game.kind === 'instant' && weight && r.is_active
            ? Number((((r.probability_weight ?? 0) / weight) * 100).toFixed(2))
            : null,
        is_active: r.is_active,
      })),
      total: rows.length,
      game: this.shapeGame(game),
      summary: {
        active_prizes: active.length,
        total_weight: Number(weight.toFixed(2)),
        /** What one play costs the business, for an instant game. */
        expected_coins:
          game.kind === 'instant' && weight
            ? Math.round(
                active.reduce(
                  (s, r) =>
                    s + ((r.probability_weight ?? 0) / weight) * r.reward_coins,
                  0,
                ),
              )
            : 0,
        top_prize_coins: Math.max(0, ...rows.map((r) => r.reward_coins)),
      },
    };
  }

  /** Replaces the whole ladder in one transaction, so it is never half-written. */
  async savePrizes(game_id: string, dto: SavePrizesDto) {
    const game = await this.gameOrFail(game_id);
    const active = dto.prizes.filter((p) => p.is_active !== false);
    if (!active.length) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'At least one prize must be active.',
      });
    }
    if (
      game.kind === 'instant' &&
      active.every((p) => (p.probability_weight ?? 0) <= 0)
    ) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description:
          'An instant game needs at least one active prize with a weight above 0.',
      });
    }

    await this.prizes.manager.transaction(async (m) => {
      const repo = m.getRepository(RewardPrize);
      await repo.createQueryBuilder().delete().where('game_id = :game_id', { game_id }).execute();
      await repo.insert(
        dto.prizes.map((p, i) => ({
          game_id,
          rank: p.rank ?? i + 1,
          label: p.label,
          reward_coins: p.reward_coins,
          reward_gems: p.reward_gems,
          probability_weight:
            game.kind === 'instant' ? (p.probability_weight ?? 1) : null,
          is_active: p.is_active ?? true,
        })),
      );
    });
    return this.getPrizes(game_id);
  }

  /* -------------------------------------------------------- payout rules */

  async getRules(game_id: string) {
    const game = await this.gameOrFail(game_id);
    const rows = await this.rules.find({
      where: { game_id },
      order: { min_participants: 'ASC' },
    });
    return {
      data: rows.map((r, i) => ({
        cz_reward_payout_rule_id: r.cz_reward_payout_rule_id,
        min_participants: r.min_participants,
        /** The band runs to just below the next rule's floor. */
        max_participants:
          i + 1 < rows.length ? rows[i + 1].min_participants - 1 : null,
        prize_pool_coins: r.prize_pool_coins,
        winners_count: r.winners_count,
        coins_per_winner: Math.floor(r.prize_pool_coins / Math.max(1, r.winners_count)),
        is_active: r.is_active,
      })),
      total: rows.length,
      game: this.shapeGame(game),
      summary: {
        active_rules: rows.filter((r) => r.is_active).length,
        /** Turnout below this pays the fallback pot, so it should be 0. */
        lowest_floor: rows.length ? rows[0].min_participants : null,
        max_pool_coins: Math.max(0, ...rows.map((r) => r.prize_pool_coins)),
      },
    };
  }

  async saveRules(game_id: string, dto: SavePayoutRulesDto) {
    await this.gameOrFail(game_id);
    const floors = dto.rules.map((r) => r.min_participants);
    if (new Set(floors).size !== floors.length) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: 'Two rules cannot share the same participant floor.',
      });
    }
    // Without a zero floor a quiet day matches no band and pays the fallback.
    if (dto.rules.length && !floors.includes(0)) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description:
          'The first band must start at 0 participants, or a quiet day pays nothing predictable.',
      });
    }

    await this.rules.manager.transaction(async (m) => {
      const repo = m.getRepository(RewardPayoutRule);
      await repo.createQueryBuilder().delete().where('game_id = :game_id', { game_id }).execute();
      await repo.insert(
        dto.rules.map((r) => ({
          game_id,
          min_participants: r.min_participants,
          prize_pool_coins: r.prize_pool_coins,
          winners_count: Math.max(1, r.winners_count),
          is_active: r.is_active ?? true,
        })),
      );
    });
    return this.getRules(game_id);
  }

  /* -------------------------------------------------------------- draws */

  /** Every draw instance, past and present, with who won. */
  async listDraws(query: DrawsQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const qb = this.draws
      .createQueryBuilder('d')
      .leftJoin('reward_games', 'g', 'g.cz_reward_game_id = d.game_id')
      .select([
        'd.cz_lucky_draw_id AS cz_lucky_draw_id',
        'd.title AS title',
        'd.type AS type',
        'd.period_key AS period_key',
        'd.status AS status',
        'd.draw_date AS draw_date',
        'd.settled_at AS settled_at',
        'd.prize_pool_coins AS prize_pool_coins',
        'd.winners_count AS winners_count',
        'd.participants_count AS participants_count',
        'd.entries_count AS entries_count',
        'd.entry_cost_gems AS entry_cost_gems',
        'g.slug AS game_slug',
      ]);

    if (query.slug) qb.andWhere('g.slug = :slug', { slug: query.slug });
    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.date_from) qb.andWhere('d.draw_date >= (:from)::date', { from: query.date_from });
    if (query.date_to) {
      qb.andWhere("d.draw_date < ((:to)::date + interval '1 day')", { to: query.date_to });
    }

    const [rows, total] = await Promise.all([
      qb.orderBy('d.draw_date', 'DESC').offset(skip).limit(take).getRawMany<RawDraw>(),
      qb.getCount(),
    ]);

    const ids = rows.map((r) => r.cz_lucky_draw_id);
    const winners = ids.length
      ? await this.winners
          .createQueryBuilder('w')
          .leftJoin('users', 'u', 'u.cz_user_id = w.user_id')
          .select([
            'w.draw_id AS draw_id',
            'w.rank AS rank',
            'w.prize_amount AS prize_amount',
            'w.entries_held AS entries_held',
            'w.user_id AS user_id',
            'u.email AS email',
            'u.name AS name',
          ])
          .where('w.draw_id IN (:...ids)', { ids })
          .orderBy('w.rank', 'ASC')
          .getRawMany<RawDrawWinner>()
      : [];

    const byDraw = new Map<string, RawDrawWinner[]>();
    for (const w of winners) {
      byDraw.set(w.draw_id, [...(byDraw.get(w.draw_id) ?? []), w]);
    }

    return {
      data: rows.map((r) => ({
        cz_lucky_draw_id: r.cz_lucky_draw_id,
        game_slug: r.game_slug,
        title: r.title,
        type: r.type,
        period_key: r.period_key,
        status: r.status,
        draw_date: r.draw_date,
        settled_at: r.settled_at,
        prize_pool_coins: Number(r.prize_pool_coins ?? 0),
        winners_count: Number(r.winners_count ?? 0),
        participants_count: Number(r.participants_count ?? 0),
        entries_count: Number(r.entries_count ?? 0),
        entry_cost_gems: Number(r.entry_cost_gems ?? 0),
        gems_collected:
          Number(r.entries_count ?? 0) * Number(r.entry_cost_gems ?? 0),
        winners: (byDraw.get(r.cz_lucky_draw_id) ?? []).map((w) => ({
          rank: Number(w.rank),
          cz_user_id: w.user_id,
          name: w.name,
          email: w.email,
          masked_name: maskEmail(w.email, w.name),
          prize_coins: Number(w.prize_amount ?? 0),
          entries_held: Number(w.entries_held ?? 0),
        })),
      })),
      total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }

  /** Settles anything due and opens what is missing. The manual-run button. */
  async runDraws() {
    const result = await this.scheduler.run();
    return { ...result, ran_at: new Date() };
  }

  /* ---------------------------------------------------------- dashboard */

  /** Where the gems went in, where the coins came out, and how it is trending. */
  async dashboard(query: RewardDashboardDto) {
    const to = query.date_to ?? todayDate();
    const from = query.date_from ?? addDaysToDate(to, -29);

    const games = await this.games.find({ order: { display_order: 'ASC' } });
    const bySlug = new Map(games.map((g) => [g.cz_reward_game_id, g]));
    const wanted = query.slug
      ? games.filter((g) => g.slug === query.slug).map((g) => g.cz_reward_game_id)
      : games.map((g) => g.cz_reward_game_id);

    const [plays, entries, prizes] = await Promise.all([
      this.plays
        .createQueryBuilder('p')
        .select('p.game_id', 'game_id')
        .addSelect("to_char(p.played_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(*)', 'plays')
        .addSelect('COUNT(DISTINCT p.user_id)', 'players')
        .addSelect('COALESCE(SUM(p.gems_spent), 0)', 'gems_in')
        .addSelect('COALESCE(SUM(p.reward_coins), 0)', 'coins_out')
        .where('p.game_id IN (:...ids)', { ids: wanted.length ? wanted : [''] })
        .andWhere(this.window('p.played_at'), { from, to })
        .groupBy('p.game_id')
        .addGroupBy('date')
        .getRawMany<RawBucket>(),
      this.entries
        .createQueryBuilder('e')
        .innerJoin('lucky_draws', 'd', 'd.cz_lucky_draw_id = e.draw_id')
        .select('d.game_id', 'game_id')
        .addSelect("to_char(e.purchased_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
        .addSelect('COALESCE(SUM(e.entries_count), 0)', 'plays')
        .addSelect('COUNT(DISTINCT e.user_id)', 'players')
        .addSelect('COALESCE(SUM(e.gems_spent), 0)', 'gems_in')
        .addSelect('0', 'coins_out')
        .where('d.game_id IN (:...ids)', { ids: wanted.length ? wanted : [''] })
        .andWhere(this.window('e.purchased_at'), { from, to })
        .groupBy('d.game_id')
        .addGroupBy('date')
        .getRawMany<RawBucket>(),
      this.winners
        .createQueryBuilder('w')
        .innerJoin('lucky_draws', 'd', 'd.cz_lucky_draw_id = w.draw_id')
        .select('d.game_id', 'game_id')
        .addSelect("to_char(d.draw_date AT TIME ZONE 'UTC', 'YYYY-MM-DD')", 'date')
        .addSelect('0', 'plays')
        .addSelect('COUNT(DISTINCT w.user_id)', 'players')
        .addSelect('0', 'gems_in')
        .addSelect('COALESCE(SUM(w.prize_amount), 0)', 'coins_out')
        .where('d.game_id IN (:...ids)', { ids: wanted.length ? wanted : [''] })
        .andWhere(this.window('d.draw_date'), { from, to })
        .groupBy('d.game_id')
        .addGroupBy('date')
        .getRawMany<RawBucket>(),
    ]);

    const rows = [...plays, ...entries, ...prizes];
    const gems_in = rows.reduce((s, r) => s + Number(r.gems_in ?? 0), 0);
    const coins_out = rows.reduce((s, r) => s + Number(r.coins_out ?? 0), 0);
    const spins = plays.reduce((s, r) => s + Number(r.plays ?? 0), 0);
    const entry_count = entries.reduce((s, r) => s + Number(r.plays ?? 0), 0);

    const [reach, settled, spend] = await Promise.all([
      this.distinctPlayers(wanted, from, to),
      this.settledStats(wanted, from, to),
      this.topSpenders(wanted, from, to, 10),
    ]);

    const byGame = new Map<string, { gems_in: number; coins_out: number; plays: number }>();
    for (const r of rows) {
      const g = byGame.get(r.game_id) ?? { gems_in: 0, coins_out: 0, plays: 0 };
      g.gems_in += Number(r.gems_in ?? 0);
      g.coins_out += Number(r.coins_out ?? 0);
      g.plays += Number(r.plays ?? 0);
      byGame.set(r.game_id, g);
    }

    const series = new Map<string, { gems_in: number; coins_out: number; plays: number }>();
    for (let d = from; d <= to; d = addDaysToDate(d, 1)) {
      series.set(d, { gems_in: 0, coins_out: 0, plays: 0 });
    }
    for (const r of rows) {
      const b = series.get(r.date);
      if (!b) continue;
      b.gems_in += Number(r.gems_in ?? 0);
      b.coins_out += Number(r.coins_out ?? 0);
      b.plays += Number(r.plays ?? 0);
    }

    const days = Math.max(
      1,
      Math.round(
        (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
      ) + 1,
    );

    return {
      range: { date_from: from, date_to: to, days },
      filters: { slug: query.slug ?? null },
      totals: {
        gems_collected: gems_in,
        coins_paid: coins_out,
        plays: spins + entry_count,
        /** Split, because an entry and a spin are very different actions. */
        entries_bought: entry_count,
        spins_played: spins,
        winners: prizes.reduce((s, r) => s + Number(r.players ?? 0), 0),
        players: reach.players,
        gems_per_day: Math.round(gems_in / days),
        coins_per_day: Math.round(coins_out / days),
        /** What the average paying player spent. */
        gems_per_player: reach.players ? Math.round(gems_in / reach.players) : 0,
        plays_per_player: reach.players
          ? Number(((spins + entry_count) / reach.players).toFixed(1))
          : 0,
        /**
         * Gems in, valued in coins, against coins out. Above 100 means the
         * rewards took more than they gave back over this range.
         */
        return_pct: coins_out
          ? Number(((gems_in * reach.coins_per_gem * 100) / coins_out).toFixed(1))
          : null,
        coins_per_gem: reach.coins_per_gem,
      },
      draws: {
        settled: settled.count,
        participants: settled.participants,
        entries: settled.entries,
        pool_coins: settled.pool,
        avg_pot_coins: settled.count ? Math.round(settled.pool / settled.count) : 0,
        avg_participants: settled.count
          ? Number((settled.participants / settled.count).toFixed(1))
          : 0,
        biggest_prize_coins: settled.biggest,
        /** Draws that closed with nobody in them. */
        empty: settled.empty,
      },
      busiest_day:
        [...series.entries()].sort((a, b) => b[1].gems_in - a[1].gems_in)[0]?.[1]
          .gems_in
          ? {
              date: [...series.entries()].sort(
                (a, b) => b[1].gems_in - a[1].gems_in,
              )[0][0],
              gems_in: [...series.entries()].sort(
                (a, b) => b[1].gems_in - a[1].gems_in,
              )[0][1].gems_in,
            }
          : null,
      top_spenders: spend,
      by_game: [...byGame.entries()]
        .map(([game_id, g]) => ({
          cz_reward_game_id: game_id,
          slug: bySlug.get(game_id)?.slug ?? 'unknown',
          title: bySlug.get(game_id)?.title ?? 'Removed game',
          kind: bySlug.get(game_id)?.kind ?? 'draw',
          gems_collected: g.gems_in,
          coins_paid: g.coins_out,
          plays: g.plays,
          share_pct: gems_in ? Number(((g.gems_in / gems_in) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.gems_collected - a.gems_collected),
      series: [...series.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, b]) => ({ date, ...b })),
    };
  }

  /* ------------------------------------------------------------ helpers */

  /** Distinct users who spent anything, plus the live gem-to-coin rate. */
  private async distinctPlayers(
    ids: string[],
    from: string,
    to: string,
  ): Promise<{ players: number; coins_per_gem: number }> {
    const safe = ids.length ? ids : [''];
    const [a, b, rate] = await Promise.all([
      this.plays
        .createQueryBuilder('p')
        .select('p.user_id', 'user_id')
        .where('p.game_id IN (:...ids)', { ids: safe })
        .andWhere(this.window('p.played_at'), { from, to })
        .groupBy('p.user_id')
        .getRawMany<{ user_id: string }>(),
      this.entries
        .createQueryBuilder('e')
        .innerJoin('lucky_draws', 'd', 'd.cz_lucky_draw_id = e.draw_id')
        .select('e.user_id', 'user_id')
        .where('d.game_id IN (:...ids)', { ids: safe })
        .andWhere(this.window('e.purchased_at'), { from, to })
        .groupBy('e.user_id')
        .getRawMany<{ user_id: string }>(),
      this.settings.getNumber(SettingKeys.COINS_PER_GEM),
    ]);
    const set = new Set([...a, ...b].map((r) => r.user_id));
    return { players: set.size, coins_per_gem: rate || 0 };
  }

  private async settledStats(ids: string[], from: string, to: string) {
    const safe = ids.length ? ids : [''];
    const [row, biggest] = await Promise.all([
      this.draws
        .createQueryBuilder('d')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(d.participants_count), 0)', 'participants')
        .addSelect('COALESCE(SUM(d.entries_count), 0)', 'entries')
        .addSelect('COALESCE(SUM(d.prize_pool_coins), 0)', 'pool')
        .addSelect('COUNT(*) FILTER (WHERE d.participants_count = 0)', 'empty')
        .where('d.game_id IN (:...ids)', { ids: safe })
        .andWhere("d.status = 'resolved'")
        .andWhere(this.window('d.draw_date'), { from, to })
        .getRawOne<Record<string, string>>(),
      this.winners
        .createQueryBuilder('w')
        .innerJoin('lucky_draws', 'd', 'd.cz_lucky_draw_id = w.draw_id')
        .select('COALESCE(MAX(w.prize_amount), 0)', 'biggest')
        .where('d.game_id IN (:...ids)', { ids: safe })
        .andWhere(this.window('d.draw_date'), { from, to })
        .getRawOne<{ biggest: string }>(),
    ]);
    return {
      count: Number(row?.count ?? 0),
      participants: Number(row?.participants ?? 0),
      entries: Number(row?.entries ?? 0),
      pool: Number(row?.pool ?? 0),
      empty: Number(row?.empty ?? 0),
      biggest: Number(biggest?.biggest ?? 0),
    };
  }

  /** Who is spending the most gems here — worth a look for anyone far ahead. */
  private async topSpenders(ids: string[], from: string, to: string, top: number) {
    const safe = ids.length ? ids : [''];
    const rows = await this.entries
      .createQueryBuilder('e')
      .innerJoin('lucky_draws', 'd', 'd.cz_lucky_draw_id = e.draw_id')
      .leftJoin('users', 'u', 'u.cz_user_id = e.user_id')
      .select('e.user_id', 'cz_user_id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('COALESCE(SUM(e.gems_spent), 0)', 'gems_spent')
      .addSelect('COALESCE(SUM(e.entries_count), 0)', 'entries')
      .where('d.game_id IN (:...ids)', { ids: safe })
      .andWhere(this.window('e.purchased_at'), { from, to })
      .groupBy('e.user_id')
      .addGroupBy('u.name')
      .addGroupBy('u.email')
      .orderBy('SUM(e.gems_spent)', 'DESC')
      .limit(top)
      .getRawMany<{
        cz_user_id: string;
        name: string | null;
        email: string | null;
        gems_spent: string;
        entries: string;
      }>();

    return rows.map((r, i) => ({
      rank: i + 1,
      cz_user_id: r.cz_user_id,
      name: r.name,
      email: r.email,
      masked_name: maskEmail(r.email, r.name),
      gems_spent: Number(r.gems_spent),
      entries: Number(r.entries),
    }));
  }

  private window(column: string): string {
    return `${column} >= (:from)::date AND ${column} < ((:to)::date + interval '1 day')`;
  }

  private async gameOrFail(id: string): Promise<RewardGame> {
    const game = await this.games.findOne({ where: { cz_reward_game_id: id } });
    if (!game) {
      throw new NotFoundException({
        cz_error_code: CzCommonErrorCodes.RESOURCE_NOT_FOUND,
        cz_error_description: 'No reward game exists with that id.',
      });
    }
    return game;
  }

  private shapeGame(g: RewardGame) {
    return {
      cz_reward_game_id: g.cz_reward_game_id,
      slug: g.slug,
      kind: g.kind,
      cadence: g.cadence,
      title: g.title,
      subtitle: g.subtitle,
      icon_url: g.icon_url,
      headline_prize_coins: g.headline_prize_coins,
      entry_cost_gems: g.entry_cost_gems,
      min_entries: g.min_entries,
      max_entries: g.max_entries,
      entry_packs: g.entry_packs ?? [],
      how_it_works: g.how_it_works ?? [],
      terms_url: g.terms_url,
      status: g.status,
      display_order: g.display_order,
    };
  }

  private emptySummary() {
    return {
      live_games: 0,
      coming_soon: 0,
      gems_collected: 0,
      coins_paid: 0,
      open_draws: 0,
      draws_missing: 0,
    };
  }
}

interface RawDraw {
  cz_lucky_draw_id: string;
  game_slug: string | null;
  title: string;
  type: string;
  period_key: string | null;
  status: string;
  draw_date: Date;
  settled_at: Date | null;
  prize_pool_coins: number;
  winners_count: number;
  participants_count: number;
  entries_count: number;
  entry_cost_gems: number;
}

interface RawDrawWinner {
  draw_id: string;
  rank: number;
  prize_amount: number | null;
  entries_held: number | null;
  user_id: string;
  email: string | null;
  name: string | null;
}

interface RawBucket {
  game_id: string;
  date: string;
  plays: string;
  players: string;
  gems_in: string;
  coins_out: string;
}
