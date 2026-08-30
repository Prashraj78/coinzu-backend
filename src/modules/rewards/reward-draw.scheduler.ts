import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { RewardGame } from '../../database/entities/reward-game.entity';
import { LuckyDraw } from '../../database/entities/lucky-draw.entity';
import { LuckyDrawEntry } from '../../database/entities/lucky-draw-entry.entity';
import { LuckyDrawWinner } from '../../database/entities/lucky-draw-winner.entity';
import { CronRegistryService } from '../cron/cron-registry.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardsService } from './rewards.service';
import { currentPeriodKey, periodEnd, periodStart } from './reward-period.util';

/**
 * Settles every draw whose period has ended and opens the next one. Runs at
 * 00:00 UTC and handles daily and weekly in the same pass, so a weekly draw
 * closing on the same midnight as a daily one is never missed.
 */
@Injectable()
export class RewardDrawScheduler implements OnModuleInit {
  private readonly logger = new Logger(RewardDrawScheduler.name);
  private running = false;

  constructor(
    @InjectRepository(RewardGame)
    private readonly games: Repository<RewardGame>,
    @InjectRepository(LuckyDraw)
    private readonly draws: Repository<LuckyDraw>,
    @InjectRepository(LuckyDrawEntry)
    private readonly entries: Repository<LuckyDrawEntry>,
    @InjectRepository(LuckyDrawWinner)
    private readonly winners: Repository<LuckyDrawWinner>,
    private readonly rewards: RewardsService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
    private readonly registry: CronRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register('reward_draw_settle', () => this.run());
  }

  /** Settle what has ended, then make sure every live game has an open draw. */
  async run(): Promise<{ settled: number; opened: number }> {
    // Paying twice would be unrecoverable, so a slow pass never overlaps itself.
    if (this.running) return { settled: 0, opened: 0 };
    this.running = true;
    try {
      const settled = await this.settleDue();
      const opened = await this.openMissing();
      if (settled || opened) {
        this.logger.log(`Draws settled: ${settled}, opened: ${opened}`);
      }
      return { settled, opened };
    } finally {
      this.running = false;
    }
  }

  /* ----------------------------------------------------------- settling */

  private async settleDue(): Promise<number> {
    const due = await this.draws.find({
      where: { status: 'open', draw_date: LessThanOrEqual(new Date()) },
      order: { draw_date: 'ASC' },
    });
    let settled = 0;
    for (const draw of due) {
      try {
        await this.settle(draw);
        settled += 1;
      } catch (error) {
        this.logger.error(
          `Draw ${draw.cz_lucky_draw_id} failed to settle: ${String(error)}`,
        );
      }
    }
    return settled;
  }

  /** Picks winners weighted by entries held, pays them, and closes the draw. */
  async settle(draw: LuckyDraw): Promise<void> {
    const rows = await this.entries.find({ where: { draw_id: draw.cz_lucky_draw_id } });

    const heldBy = new Map<string, number>();
    for (const r of rows) {
      heldBy.set(r.user_id, (heldBy.get(r.user_id) ?? 0) + r.entries_count);
    }
    const participants = heldBy.size;
    const totalEntries = [...heldBy.values()].reduce((s, n) => s + n, 0);

    // Nobody entered: close it cleanly rather than paying an empty pot out.
    if (!participants) {
      await this.draws.update(
        { cz_lucky_draw_id: draw.cz_lucky_draw_id },
        {
          status: 'resolved',
          settled_at: new Date(),
          participants_count: 0,
          entries_count: 0,
          prize_pool_coins: 0,
        },
      );
      return;
    }

    const rules = draw.game_id ? await this.rewards.rulesFor(draw.game_id) : [];
    const { prize_pool_coins, winners_count } = this.rewards.poolFor(
      rules,
      participants,
      draw.prize_pool_coins,
    );

    // Never more winners than players, and never a zero-coin prize row.
    const seats = Math.max(1, Math.min(winners_count, participants));
    const picked = this.pickWeighted(heldBy, seats);
    const splits = this.split(prize_pool_coins, seats);

    for (let i = 0; i < picked.length; i += 1) {
      const user_id = picked[i];
      const prize = splits[i];
      const winner = await this.winners.save(
        this.winners.create({
          draw_id: draw.cz_lucky_draw_id,
          user_id,
          rank: i + 1,
          prize_amount: prize,
          prize_gems: 0,
          entries_held: heldBy.get(user_id) ?? 0,
        }),
      );
      if (prize > 0) {
        await this.wallet.credit({
          user_id,
          currency: 'coin',
          amount: prize,
          type: 'earn',
          source_type: 'lucky_draw',
          source_id: winner.cz_lucky_draw_winner_id,
        });
      }
      void this.notifications
        .push(
          user_id,
          'You won a lucky draw',
          `You placed #${i + 1} in "${draw.title}" and won ${prize} coins.`,
        )
        .catch(() => undefined);
    }

    await this.draws.update(
      { cz_lucky_draw_id: draw.cz_lucky_draw_id },
      {
        status: 'resolved',
        settled_at: new Date(),
        participants_count: participants,
        entries_count: totalEntries,
        prize_pool_coins,
        winners_count: seats,
      },
    );
  }

  /**
   * Draws without replacement, weighted by entries held. Buying more entries
   * buys more chance, but never a second prize.
   */
  private pickWeighted(heldBy: Map<string, number>, seats: number): string[] {
    const pool = [...heldBy.entries()].map(([user_id, weight]) => ({ user_id, weight }));
    const picked: string[] = [];
    while (picked.length < seats && pool.length) {
      const total = pool.reduce((s, p) => s + p.weight, 0);
      let ticket = Math.random() * total;
      let index = pool.length - 1;
      for (let i = 0; i < pool.length; i += 1) {
        ticket -= pool[i].weight;
        if (ticket <= 0) {
          index = i;
          break;
        }
      }
      picked.push(pool[index].user_id);
      pool.splice(index, 1);
    }
    return picked;
  }

  /** Splits the pot 1st-place-heavy, with the remainder going to the winner. */
  private split(pool: number, seats: number): number[] {
    if (seats === 1) return [pool];
    // Weights 3,2,1... so first place always beats second by a visible margin.
    const weights = Array.from({ length: seats }, (_, i) => seats - i);
    const total = weights.reduce((s, w) => s + w, 0);
    const shares = weights.map((w) => Math.floor((pool * w) / total));
    shares[0] += pool - shares.reduce((s, n) => s + n, 0);
    return shares;
  }

  /* ------------------------------------------------------------ opening */

  /** Every live draw game should always have exactly one open instance. */
  private async openMissing(): Promise<number> {
    const games = await this.games.find({ where: { kind: 'draw', status: 'live' } });
    let opened = 0;

    for (const game of games) {
      const existing = await this.draws.findOne({
        where: { game_id: game.cz_reward_game_id, status: 'open' },
      });
      if (existing) continue;

      const cadence = game.cadence === 'weekly' ? 'weekly' : 'daily';

      /*
       * The next draw starts where the last one ended, not at the current wall
       * clock. Settling early — a manual run, or a cron that fired ahead of
       * midnight — would otherwise reopen the period that was just closed.
       */
      const last = await this.draws.findOne({
        where: { game_id: game.cz_reward_game_id },
        order: { draw_date: 'DESC' },
      });
      const now = new Date();
      const anchor =
        last && last.draw_date.getTime() > now.getTime() ? last.draw_date : now;

      /*
       * Roll forward past any period already on record. A draw settled ahead of
       * its midnight leaves today's key taken, and reusing it would collide.
       */
      let cursor = anchor;
      let period_key = currentPeriodKey(cadence, cursor);
      let guard = 0;
      while (
        guard < 8 &&
        (await this.draws.findOne({
          where: { game_id: game.cz_reward_game_id, period_key },
        }))
      ) {
        cursor = periodEnd(cadence, cursor);
        period_key = currentPeriodKey(cadence, cursor);
        guard += 1;
      }
      if (guard >= 8) continue;

      const opens_at = periodStart(cadence, cursor);
      const draw_date = periodEnd(cadence, cursor);

      const rules = await this.rewards.rulesFor(game.cz_reward_game_id);
      const seed = this.rewards.poolFor(rules, 0, game.headline_prize_coins);

      await this.draws.save(
        this.draws.create({
          game_id: game.cz_reward_game_id,
          period_key,
          type: cadence,
          title: game.title,
          prize_pool_coins: seed.prize_pool_coins,
          entry_cost_gems: game.entry_cost_gems,
          winners_count: seed.winners_count,
          opens_at,
          draw_date,
          status: 'open',
        }),
      );
      opened += 1;
    }
    return opened;
  }
}
