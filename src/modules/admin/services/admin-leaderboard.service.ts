import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction } from '../../../database/entities/wallet-transaction.entity';
import { toSkipTake } from '../../../common/utils/pagination.util';
import {
  startOfThisWeekUtc,
  startOfTodayUtc,
} from '../../../common/utils/date.util';
import { AdminLeaderboardDto } from '../../leaderboard/dto/admin-leaderboard.dto';

interface Row {
  cz_user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  country: string | null;
  status: string;
  total_coins: string;
  earn_count: string;
  last_earned_at: Date | null;
}

/**
 * The admin cut of the leaderboard. Same ledger sum as the app's, but paged,
 * searchable and open to a custom date range, and never cached so an admin
 * always sees the live standing.
 */
@Injectable()
export class AdminLeaderboardService {
  constructor(
    @InjectRepository(WalletTransaction)
    private readonly transactions: Repository<WalletTransaction>,
  ) {}

  async list(query: AdminLeaderboardDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const build = () => {
      const b = this.transactions
        .createQueryBuilder('tx')
        .innerJoin('users', 'u', 'u.cz_user_id = tx.user_id')
        .where('tx.currency = :currency', { currency: 'coin' })
        .andWhere('tx.type = :type', { type: 'earn' })
        .andWhere('u.status = :status', { status: 'active' })
        .groupBy('tx.user_id')
        .addGroupBy('u.email')
        .addGroupBy('u.name')
        .addGroupBy('u.avatar_url')
        .addGroupBy('u.country')
        .addGroupBy('u.status')
        // Only people who actually earned something rank.
        .having('SUM(tx.amount) > 0');

      const { from, to } = this.range(query);
      if (from) b.andWhere('tx.created_at >= :from', { from });
      if (to) b.andWhere("tx.created_at < (:to::date + interval '1 day')", { to });
      if (query.search) {
        b.andWhere('(u.email ILIKE :s OR u.name ILIKE :s)', {
          s: `%${query.search}%`,
        });
      }
      if (query.country) {
        b.andWhere('u.country = :country', { country: query.country });
      }
      if (query.min_coins !== undefined) {
        b.andHaving('SUM(tx.amount) >= :min_coins', {
          min_coins: query.min_coins,
        });
      }
      return b;
    };

    const rows = await build()
      .select('tx.user_id', 'cz_user_id')
      .addSelect('u.email', 'email')
      .addSelect('u.name', 'name')
      .addSelect('u.avatar_url', 'avatar_url')
      .addSelect('u.country', 'country')
      .addSelect('u.status', 'status')
      .addSelect('SUM(tx.amount)', 'total_coins')
      .addSelect('COUNT(*)', 'earn_count')
      .addSelect('MAX(tx.created_at)', 'last_earned_at')
      .orderBy('SUM(tx.amount)', 'DESC')
      .offset(skip)
      .limit(take)
      .getRawMany<Row>();

    // A grouped query cannot use getCount(), so the whole grouped statement is
    // wrapped and counted in SQL rather than pulled into memory.
    const [innerSql, innerParams] = build()
      .select('SUM(tx.amount)', 'total_coins')
      .getQueryAndParameters();

    const counted = await this.transactions.manager.query<
      Array<{ total: string; coins: string }>
    >(
      `SELECT COUNT(*)::text AS total,
              COALESCE(SUM(t.total_coins), 0)::text AS coins
       FROM (${innerSql}) t`,
      innerParams,
    );

    const total = Number(counted?.[0]?.total ?? 0);
    const coins_total = Number(counted?.[0]?.coins ?? 0);

    const data = rows.map((r, i) => ({
      rank: skip + i + 1,
      cz_user_id: r.cz_user_id,
      email: r.email,
      name: r.name,
      avatar_url: r.avatar_url,
      country: r.country,
      status: r.status,
      total_coins: Number(r.total_coins),
      earn_count: Number(r.earn_count),
      last_earned_at: r.last_earned_at,
    }));

    return {
      data,
      total,
      summary: {
        ranked_users: total,
        coins_earned: coins_total,
        window: query.date_from || query.date_end ? 'custom' : (query.window ?? 'all_time'),
      },
    };
  }

  /** A custom range wins over the preset window. */
  private range(query: AdminLeaderboardDto): {
    from: Date | string | null;
    to: string | null;
  } {
    if (query.date_from || query.date_end) {
      return { from: query.date_from ?? null, to: query.date_end ?? null };
    }
    if (query.window === 'today') return { from: startOfTodayUtc(), to: null };
    if (query.window === 'week') return { from: startOfThisWeekUtc(), to: null };
    if (query.window === 'month') {
      const d = new Date();
      return {
        from: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
        to: null,
      };
    }
    return { from: null, to: null };
  }
}
