import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SettingsService } from '../../settings/settings.service';
import { SettingKeys } from '../../settings/setting.keys';
import { AdminEconomyQueryDto } from '../../wallet/dto/admin-economy-query.dto';

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;
// A one-day view still gets a readable trend line.
const MIN_TREND_DAYS = 14;
// Programs whose coins are paid for by a partner network's conversion.
const OFFER_PROGRAMS = new Set(['rewardtym', 'offer', 'offerwall']);
// Programs that bring users in rather than reward activity.
const ACQUISITION_PROGRAMS = new Set(['welcome_bonus', 'referral']);
// Programs whose "earn" rows are refunds of the user's own coins.
const REFUND_PROGRAMS = new Set(['redeem', 'withdrawal']);

// Owner-facing names. Reward games ("game:<title>") are named from their row.
const PROGRAM_LABEL: Record<string, string> = {
  welcome_bonus: 'Joining bonus',
  referral: 'Referrals',
  rewardtym: 'Offers',
  offer: 'Offers (legacy)',
  offerwall: 'Offerwalls',
  spin: 'Spin wheel',
  scratch: 'Scratch card',
  // Older game records and reward-game entry fees carry no game link.
  game: 'Games (other)',
  daily_checkin: 'Daily check-in',
  streak: 'Daily streak',
  challenge: 'Daily challenges',
  achievement: 'Achievements',
  lucky_draw: 'Lucky draw',
  admin_adjustment: 'Admin credits',
  redeem: 'Gift cards',
  withdrawal: 'Withdrawals',
  convert: 'Gems converted to coins',
};

/** Splits "game" rows into the game that paid them, so each one is costed on its own. */
const PROGRAM_SQL = `CASE
  WHEN t.source_type <> 'game' THEN t.source_type
  WHEN sh.cz_spin_history_id IS NOT NULL THEN 'spin'
  WHEN sc.cz_scratch_history_id IS NOT NULL THEN 'scratch'
  WHEN rg.title IS NOT NULL THEN 'game:' || rg.title
  ELSE 'game' END`;

const PROGRAM_JOINS = `
  LEFT JOIN spin_history sh ON t.source_type = 'game' AND sh.cz_spin_history_id = t.source_id
  LEFT JOIN scratch_history sc ON t.source_type = 'game' AND sc.cz_scratch_history_id = t.source_id
  LEFT JOIN reward_plays rp ON t.source_type = 'game' AND rp.cz_reward_play_id = t.source_id
  LEFT JOIN reward_games rg ON rg.cz_reward_game_id = rp.game_id`;

type ProgramRow = {
  program: string;
  currency: 'coin' | 'gem';
  type: string;
  credited: string;
  debited: string;
  transactions: number;
  users: number;
};

type ProgramTotal = {
  key: string;
  label: string;
  coins: number;
  gems: number;
  usd: number;
  users: number;
  transactions: number;
};

function utcDay(value: string | undefined, fallback: Date): Date {
  const d = value ? new Date(`${value}T00:00:00Z`) : fallback;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function label(key: string): string {
  if (key.startsWith('game:')) return key.slice(5);
  return PROGRAM_LABEL[key] ?? key;
}

/** The money view of Coinzu: what came in, what it cost, and where it went. */
@Injectable()
export class AdminEconomyService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: SettingsService,
  ) {}

  async overview(query: AdminEconomyQueryDto) {
    let from = utcDay(query.date_from, new Date());
    let to = utcDay(query.date_end, new Date());
    if (to < from) [from, to] = [to, from];
    const maxFrom = new Date(to.getTime() - (MAX_RANGE_DAYS - 1) * DAY_MS);
    if (from < maxFrom) from = maxFrom;
    const end = new Date(to.getTime() + DAY_MS);
    const days = Math.round((end.getTime() - from.getTime()) / DAY_MS);
    const trendFrom =
      days < MIN_TREND_DAYS
        ? new Date(end.getTime() - MIN_TREND_DAYS * DAY_MS)
        : from;

    const [coinsPerUsd, coinsPerGem] = await Promise.all([
      this.settings.getNumber(SettingKeys.COINS_PER_USD),
      this.settings.getNumber(SettingKeys.COINS_PER_GEM),
    ]);
    const usdPerCoin = coinsPerUsd > 0 ? 1 / coinsPerUsd : 0;
    const usdPerGem = coinsPerGem > 0 ? coinsPerGem * usdPerCoin : 0;

    const q = <T>(sql: string, params: unknown[]) =>
      this.dataSource.query(sql, params) as Promise<T>;

    const [
      rows,
      [revenue],
      [users],
      [gift],
      [withdrawals],
      [liability],
      daily,
    ] = await Promise.all([
      q<ProgramRow[]>(
        `SELECT ${PROGRAM_SQL} AS program, t.currency, t.type,
                COALESCE(SUM(t.amount) FILTER (WHERE t.amount > 0), 0)::bigint AS credited,
                COALESCE(-SUM(t.amount) FILTER (WHERE t.amount < 0), 0)::bigint AS debited,
                COUNT(*)::int AS transactions,
                COUNT(DISTINCT t.user_id)::int AS users
           FROM wallet_transactions t ${PROGRAM_JOINS}
          WHERE t.created_at >= $1 AND t.created_at < $2
          GROUP BY 1, t.currency, t.type`,
        [from, end],
      ),
      q<{ revenue_usd: string; conversions: number }[]>(
        `SELECT COALESCE(SUM(revenue_usd), 0) AS revenue_usd,
                COUNT(*) FILTER (WHERE revenue_usd IS NOT NULL)::int AS conversions
           FROM wallet_transactions
          WHERE created_at >= $1 AND created_at < $2`,
        [from, end],
      ),
      q<{ new_signups: number; active: number; earners: number }[]>(
        `SELECT (SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at < $2)::int AS new_signups,
                (SELECT COUNT(DISTINCT user_id) FROM wallet_transactions WHERE created_at >= $1 AND created_at < $2)::int AS active,
                (SELECT COUNT(DISTINCT user_id) FROM wallet_transactions WHERE created_at >= $1 AND created_at < $2 AND revenue_usd IS NOT NULL)::int AS earners`,
        [from, end],
      ),
      q<Record<string, number>[]>(
        `SELECT COUNT(*)::int AS orders,
                COUNT(*) FILTER (WHERE status = 'fulfilled')::int AS fulfilled,
                COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COALESCE(SUM(price_coins) FILTER (WHERE status = 'fulfilled'), 0)::bigint AS fulfilled_coins
           FROM gift_card_orders
          WHERE created_at >= $1 AND created_at < $2`,
        [from, end],
      ),
      q<Record<string, string | number>[]>(
        `SELECT COUNT(*)::int AS requests,
                COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE status = 'paid')::int AS paid,
                COALESCE(SUM(amount_usd::numeric), 0) AS requested_usd,
                COALESCE(SUM(amount_usd::numeric) FILTER (WHERE status = 'paid'), 0) AS paid_usd
           FROM withdrawal_requests
          WHERE created_at >= $1 AND created_at < $2`,
        [from, end],
      ),
      q<{ coins: string; gems: string; wallets: number }[]>(
        `SELECT COALESCE(SUM(coin_balance), 0)::bigint AS coins,
                COALESCE(SUM(gem_balance), 0)::bigint AS gems,
                COUNT(*) FILTER (WHERE coin_balance > 0 OR gem_balance > 0)::int AS wallets
           FROM wallets`,
        [],
      ),
      q<Record<string, string>[]>(
        `SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(SUM(t.revenue_usd), 0) AS revenue_usd,
                COALESCE(SUM(CASE WHEN t.type = 'earn' THEN t.amount * CASE WHEN t.currency = 'coin' THEN $3::numeric ELSE $4::numeric END END), 0) AS rewards_usd,
                COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'coin' AND t.type = 'earn'), 0)::bigint AS coins_earned,
                COALESCE(-SUM(t.amount) FILTER (WHERE t.currency = 'coin' AND t.type IN ('spend', 'withdrawal')), 0)::bigint AS coins_spent,
                (SELECT COUNT(*) FROM users u WHERE u.created_at >= d.day AND u.created_at < d.day + interval '1 day')::int AS signups
           FROM generate_series($1::timestamptz, $2::timestamptz - interval '1 day', interval '1 day') AS d(day)
           LEFT JOIN wallet_transactions t ON t.created_at >= d.day AND t.created_at < d.day + interval '1 day'
          GROUP BY d.day
          ORDER BY d.day`,
        [trendFrom, end, usdPerCoin, usdPerGem],
      ),
    ]);

    // Fold currency + type rows into one line per program, valued in USD.
    const fold = (
      keep: (r: ProgramRow) => boolean,
      field: 'credited' | 'debited',
    ): ProgramTotal[] => {
      const by = new Map<string, ProgramTotal>();
      for (const r of rows.filter(keep)) {
        const amount = Number(r[field]);
        if (!amount) continue;
        const row = by.get(r.program) ?? {
          key: r.program,
          label: label(r.program),
          coins: 0,
          gems: 0,
          usd: 0,
          users: 0,
          transactions: 0,
        };
        if (r.currency === 'coin') row.coins += amount;
        else row.gems += amount;
        row.usd += amount * (r.currency === 'coin' ? usdPerCoin : usdPerGem);
        row.users = Math.max(row.users, r.users);
        row.transactions += r.transactions;
        by.set(r.program, row);
      }
      return [...by.values()]
        .map((p) => ({ ...p, usd: round2(p.usd) }))
        .sort((a, b) => b.usd - a.usd);
    };

    // A failed gift card or withdrawal is credited back as "earn"; that is a
    // refund of the user's own coins, not a reward, so it nets off spending.
    const isRefund = (r: ProgramRow) =>
      r.type === 'earn' && REFUND_PROGRAMS.has(r.program);
    const rewards = fold((r) => r.type === 'earn' && !isRefund(r), 'credited');
    const refunds = fold(isRefund, 'credited');
    const spending = fold(
      (r) => ['spend', 'withdrawal', 'convert_out'].includes(r.type),
      'debited',
    )
      .map((p) => {
        const back = refunds.find((x) => x.key === p.key);
        if (!back) return p;
        return {
          ...p,
          coins: p.coins - back.coins,
          gems: p.gems - back.gems,
          usd: round2(p.usd - back.usd),
        };
      })
      .filter((p) => p.coins > 0 || p.gems > 0)
      .sort((a, b) => b.usd - a.usd);
    const reversed = fold((r) => r.type === 'reversal', 'debited');

    const total = (list: ProgramTotal[], pick?: (p: ProgramTotal) => boolean) =>
      round2(
        list.filter((p) => !pick || pick(p)).reduce((s, p) => s + p.usd, 0),
      );
    const sumCurrency = (list: ProgramTotal[], c: 'coins' | 'gems') =>
      list.reduce((s, p) => s + p[c], 0);

    const revenueUsd = round2(Number(revenue.revenue_usd));
    const rewardsUsd = total(rewards);
    const offerRewardsUsd = total(rewards, (p) => OFFER_PROGRAMS.has(p.key));
    const acquisitionUsd = total(rewards, (p) =>
      ACQUISITION_PROGRAMS.has(p.key),
    );
    const giftCardsUsd = round2(Number(gift.fulfilled_coins) * usdPerCoin);
    const paidUsd = round2(Number(withdrawals.paid_usd));

    return {
      range: { date_from: iso(from), date_end: iso(to), days },
      rates: { coins_per_usd: coinsPerUsd, coins_per_gem: coinsPerGem },
      summary: {
        // Money in: what partner networks paid for completed offers.
        revenue_usd: revenueUsd,
        tracked_conversions: revenue.conversions,
        // Value of every coin and gem handed out, at today's rates.
        rewards_usd: rewardsUsd,
        offer_rewards_usd: offerRewardsUsd,
        promo_rewards_usd: round2(rewardsUsd - offerRewardsUsd),
        profit_usd: round2(revenueUsd - rewardsUsd),
        offer_margin_usd: round2(revenueUsd - offerRewardsUsd),
        // Real money that left the business: gift cards issued and withdrawals paid.
        cash_out_usd: round2(giftCardsUsd + paidUsd),
        gift_cards_usd: giftCardsUsd,
        withdrawals_paid_usd: paidUsd,
        acquisition_usd: acquisitionUsd,
        cost_per_new_user_usd: users.new_signups
          ? round2(acquisitionUsd / users.new_signups)
          : 0,
        reversed_usd: total(reversed),
      },
      coins: {
        earned: sumCurrency(rewards, 'coins'),
        spent: sumCurrency(spending, 'coins'),
      },
      gems: {
        earned: sumCurrency(rewards, 'gems'),
        spent: sumCurrency(spending, 'gems'),
      },
      rewards,
      spending,
      users,
      gift_cards: {
        orders: Number(gift.orders),
        fulfilled: Number(gift.fulfilled),
        pending: Number(gift.pending),
        failed: Number(gift.failed),
        value_usd: giftCardsUsd,
      },
      withdrawals: {
        requests: Number(withdrawals.requests),
        pending: Number(withdrawals.pending),
        paid: Number(withdrawals.paid),
        requested_usd: round2(Number(withdrawals.requested_usd)),
        paid_usd: paidUsd,
      },
      liability: {
        coins: Number(liability.coins),
        gems: Number(liability.gems),
        wallets: liability.wallets,
        usd: round2(
          Number(liability.coins) * usdPerCoin +
            Number(liability.gems) * usdPerGem,
        ),
      },
      daily: daily.map((d) => ({
        date: d.date,
        revenue_usd: round2(Number(d.revenue_usd)),
        rewards_usd: round2(Number(d.rewards_usd)),
        coins_earned: Number(d.coins_earned),
        coins_spent: Number(d.coins_spent),
        signups: Number(d.signups),
      })),
    };
  }
}
