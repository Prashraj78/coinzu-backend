import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction } from '../../database/entities/wallet-transaction.entity';
import {
  startOfThisWeekUtc,
  startOfTodayUtc,
} from '../../common/utils/date.util';

export type LeaderboardWindow = 'today' | 'week' | 'all_time';

// Ranks are the same for every viewer, so one aggregate per window per minute
// serves everyone instead of re-summing the ledger on each request.
const CACHE_TTL_MS = 60_000;

interface LeaderboardRow {
  cz_user_id: string;
  name: string | null;
  avatar_url: string | null;
  total_coins: string;
}

export interface LeaderboardResult {
  data: Array<{
    rank: number;
    cz_user_id: string;
    name: string | null;
    avatar_url: string | null;
    total_coins: number;
  }>;
  total: number;
}

/**
 * There is no leaderboard table — ranks are summed from the wallet ledger so
 * they can never drift from the balances users actually see.
 */
@Injectable()
export class LeaderboardService {
  private cache = new Map<string, { expires_at: number; result: LeaderboardResult }>();

  constructor(
    @InjectRepository(WalletTransaction)
    private readonly transactions: Repository<WalletTransaction>,
  ) {}

  async getTop(window: LeaderboardWindow, limit = 50) {
    const key = `${window}:${limit}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() < hit.expires_at) return hit.result;

    const result = await this.computeTop(window, limit);
    this.cache.set(key, { expires_at: Date.now() + CACHE_TTL_MS, result });
    return result;
  }

  private async computeTop(window: LeaderboardWindow, limit: number) {
    const query = this.transactions
      .createQueryBuilder('tx')
      .innerJoin('users', 'u', 'u.cz_user_id = tx.user_id')
      .select('tx.user_id', 'cz_user_id')
      .addSelect('u.name', 'name')
      .addSelect('u.avatar_url', 'avatar_url')
      .addSelect('SUM(tx.amount)', 'total_coins')
      .where('tx.currency = :currency', { currency: 'coin' })
      .andWhere('tx.type = :type', { type: 'earn' })
      .andWhere('u.status = :status', { status: 'active' })
      .groupBy('tx.user_id')
      .addGroupBy('u.name')
      .addGroupBy('u.avatar_url')
      // Nobody with nothing earned belongs on a leaderboard.
      .having('SUM(tx.amount) > 0')
      .orderBy('SUM(tx.amount)', 'DESC')
      .limit(limit);

    const since = this.windowStart(window);
    if (since) query.andWhere('tx.created_at >= :since', { since });

    const rows = await query.getRawMany<LeaderboardRow>();
    const data = rows.map((row, index) => ({
      rank: index + 1,
      cz_user_id: row.cz_user_id,
      name: row.name,
      avatar_url: row.avatar_url,
      total_coins: Number(row.total_coins),
    }));

    return { data, total: data.length };
  }

  /** Where the signed-in user sits, even when they are outside the top list. */
  async getMyRank(user_id: string, window: LeaderboardWindow) {
    const { data } = await this.getTop(window, 1000);
    const mine = data.find((row) => row.cz_user_id === user_id);
    return {
      rank: mine?.rank ?? null,
      total_coins: mine?.total_coins ?? 0,
      window,
    };
  }

  private windowStart(window: LeaderboardWindow): Date | null {
    if (window === 'today') return startOfTodayUtc();
    if (window === 'week') return startOfThisWeekUtc();
    return null;
  }
}
