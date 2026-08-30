import { BadRequestException, Injectable } from '@nestjs/common';
import { forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Wallet } from '../../database/entities/wallet.entity';
import {
  WalletTransaction,
  type WalletCurrency,
  type WalletSourceType,
  type WalletTransactionType,
} from '../../database/entities/wallet-transaction.entity';
import { CzWalletErrorCodes } from '../../common/errors/error.constants';
import { toSkipTake } from '../../common/utils/pagination.util';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { AchievementsService } from '../achievements/achievements.service';

export interface LedgerEntry {
  user_id: string;
  currency: WalletCurrency;
  amount: number;
  type: WalletTransactionType;
  source_type: WalletSourceType;
  source_id?: string | null;
  note?: string | null;
}

/**
 * The only place balances change. Every movement locks the wallet row and
 * writes one wallet_transactions row, so the ledger always explains the balance.
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactions: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => AchievementsService))
    private readonly achievementsService: AchievementsService,
  ) {}

  async createWallet(user_id: string): Promise<Wallet> {
    const wallet = this.wallets.create({
      cz_user_id: user_id,
      coin_balance: 0,
      gem_balance: 0,
    });
    return this.wallets.save(wallet);
  }

  async getBalance(user_id: string): Promise<Wallet> {
    const wallet = await this.wallets.findOne({
      where: { cz_user_id: user_id },
    });
    return wallet ?? this.createWallet(user_id);
  }

  /**
   * Balance plus everything the Wallet screen prints under it — the cash value
   * of the coins, what the gems convert to, and the live rates.
   */
  async getBalanceSummary(user_id: string) {
    const [wallet, coinsPerUsd, coinsPerGem, minWithdrawalCoins] =
      await Promise.all([
        this.getBalance(user_id),
        this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
        this.settingsService.getNumber(SettingKeys.COINS_PER_GEM),
        this.settingsService.getNumber(SettingKeys.MIN_WITHDRAWAL_COINS),
      ]);

    return {
      coin_balance: wallet.coin_balance,
      gem_balance: wallet.gem_balance,
      coin_value_usd:
        coinsPerUsd > 0
          ? (wallet.coin_balance / coinsPerUsd).toFixed(2)
          : '0.00',
      gem_value_coins: Math.floor(wallet.gem_balance * coinsPerGem),
      can_withdraw: wallet.coin_balance >= minWithdrawalCoins,
      rates: {
        coins_per_usd: coinsPerUsd,
        coins_per_gem: coinsPerGem,
        min_withdrawal_coins: minWithdrawalCoins,
      },
      updated_at: wallet.updated_at,
    };
  }

  /** Admin list screens: one query for every wallet instead of N. Missing wallets are omitted, not created. */
  async getBalances(user_ids: string[]): Promise<Map<string, Wallet>> {
    if (!user_ids.length) return new Map();
    const wallets = await this.wallets.find({
      where: { cz_user_id: In(user_ids) },
    });
    return new Map(wallets.map((w) => [w.cz_user_id, w]));
  }

  async credit(entry: LedgerEntry, manager?: EntityManager): Promise<Wallet> {
    return this.move(entry, 1, manager);
  }

  async debit(entry: LedgerEntry, manager?: EntityManager): Promise<Wallet> {
    return this.move(entry, -1, manager);
  }

  /** Several credits in one transaction — one wallet lock, one commit. */
  async creditMany(entries: LedgerEntry[]): Promise<void> {
    if (!entries.length) return;
    await this.dataSource.transaction(async (tx) => {
      for (const entry of entries) {
        await this.moveWithManager(entry, 1, tx);
      }
    });
  }

  /** Runs the balance change inside the caller's transaction when one is given. */
  private async move(
    entry: LedgerEntry,
    sign: 1 | -1,
    manager?: EntityManager,
  ): Promise<Wallet> {
    if (manager) return this.moveWithManager(entry, sign, manager);
    return this.dataSource.transaction((tx) =>
      this.moveWithManager(entry, sign, tx),
    );
  }

  private async moveWithManager(
    entry: LedgerEntry,
    sign: 1 | -1,
    manager: EntityManager,
  ): Promise<Wallet> {
    const wallet = await this.lockWallet(entry.user_id, manager);
    const delta = sign * Math.abs(entry.amount);

    const currentBalance =
      entry.currency === 'coin' ? wallet.coin_balance : wallet.gem_balance;
    const nextBalance = currentBalance + delta;

    if (nextBalance < 0) {
      throw new BadRequestException({
        cz_error_code:
          entry.currency === 'coin'
            ? CzWalletErrorCodes.INSUFFICIENT_COINS
            : CzWalletErrorCodes.INSUFFICIENT_GEMS,
      });
    }

    if (entry.currency === 'coin') wallet.coin_balance = nextBalance;
    else wallet.gem_balance = nextBalance;
    await manager.save(Wallet, wallet);

    const transaction = manager.create(WalletTransaction, {
      user_id: entry.user_id,
      currency: entry.currency,
      type: entry.type,
      amount: delta,
      balance_after: nextBalance,
      source_type: entry.source_type,
      source_id: entry.source_id ?? null,
      note: entry.note ?? null,
    });
    await manager.save(WalletTransaction, transaction);

    return wallet;
  }

  /** SELECT ... FOR UPDATE so two concurrent rewards cannot race. */
  private async lockWallet(
    user_id: string,
    manager: EntityManager,
  ): Promise<Wallet> {
    const existing = await manager.findOne(Wallet, {
      where: { cz_user_id: user_id },
      lock: { mode: 'pessimistic_write' },
    });
    if (existing) return existing;

    const created = manager.create(Wallet, {
      cz_user_id: user_id,
      coin_balance: 0,
      gem_balance: 0,
    });
    return manager.save(Wallet, created);
  }

  /**
   * The rate book the app renders Convert from — every definition spelled out,
   * plus an exact preview so the client never re-implements the flooring.
   */
  async getRates(gem_amount?: number, coin_amount?: number) {
    const [coinsPerUsd, coinsPerGem, minWithdrawalCoins, requiresKyc] =
      await Promise.all([
        this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
        this.settingsService.getNumber(SettingKeys.COINS_PER_GEM),
        this.settingsService.getNumber(SettingKeys.MIN_WITHDRAWAL_COINS),
        this.settingsService.getBoolean(SettingKeys.WITHDRAWAL_REQUIRES_KYC),
      ]);

    const gemsPerCoin = coinsPerGem > 0 ? 1 / coinsPerGem : 0;
    const round = (n: number) => Number(n.toFixed(6));

    return {
      coin: {
        coins_per_usd: coinsPerUsd,
        usd_per_coin: coinsPerUsd > 0 ? (1 / coinsPerUsd).toFixed(6) : '0.000000',
        definition: `${coinsPerUsd.toLocaleString('en-US')} coins = $1.00`,
      },
      gem: {
        coins_per_gem: coinsPerGem,
        gems_per_coin: round(gemsPerCoin),
        definition: `${round(gemsPerCoin).toLocaleString('en-US')} gems = 1 coin`,
      },
      convert: {
        gem_to_coin: {
          rate: coinsPerGem,
          formula: 'floor(gems * coins_per_gem)',
          definition: `${round(gemsPerCoin).toLocaleString('en-US')} gems convert to 1 coin`,
          preview:
            gem_amount === undefined
              ? null
              : {
                  from_gems: gem_amount,
                  to_coins: Math.floor(gem_amount * coinsPerGem),
                },
        },
        coin_to_gem: {
          rate: coinsPerGem,
          formula: 'floor(coins / coins_per_gem)',
          definition: `1 coin converts to ${round(gemsPerCoin).toLocaleString('en-US')} gems`,
          preview:
            coin_amount === undefined
              ? null
              : {
                  from_coins: coin_amount,
                  to_gems:
                    coinsPerGem > 0
                      ? Math.floor(coin_amount / coinsPerGem)
                      : 0,
                },
        },
      },
      withdrawal: {
        min_withdrawal_coins: minWithdrawalCoins,
        min_withdrawal_usd:
          coinsPerUsd > 0 ? (minWithdrawalCoins / coinsPerUsd).toFixed(2) : '0.00',
        requires_kyc: requiresKyc,
      },
    };
  }

  async listTransactions(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.transactions.findAndCount({
      where: { user_id },
      order: { created_at: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

  /** Lifetime coin totals plus a per-source earning breakdown, for the admin detail page. */
  async getEarningSummary(user_id: string) {
    const [totals, bySource] = await Promise.all([
      this.transactions
        .createQueryBuilder('t')
        .select(
          `COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'coin' AND t.amount > 0), 0)`,
          'coins_earned',
        )
        .addSelect(
          `COALESCE(-SUM(t.amount) FILTER (WHERE t.currency = 'coin' AND t.amount < 0), 0)`,
          'coins_spent',
        )
        .addSelect(
          `COALESCE(SUM(t.amount) FILTER (WHERE t.currency = 'gem' AND t.amount > 0), 0)`,
          'gems_earned',
        )
        .addSelect('COUNT(*)', 'transaction_count')
        .addSelect('MAX(t.created_at)', 'last_activity_at')
        .where('t.user_id = :user_id', { user_id })
        .getRawOne<{
          coins_earned: string;
          coins_spent: string;
          gems_earned: string;
          transaction_count: string;
          last_activity_at: Date | null;
        }>(),
      this.transactions
        .createQueryBuilder('t')
        .select('t.source_type', 'source_type')
        .addSelect('COALESCE(SUM(t.amount), 0)', 'coins')
        .addSelect('COUNT(*)', 'count')
        .where('t.user_id = :user_id', { user_id })
        .andWhere(`t.currency = 'coin'`)
        .andWhere('t.amount > 0')
        .groupBy('t.source_type')
        .orderBy('SUM(t.amount)', 'DESC')
        .getRawMany<{ source_type: string; coins: string; count: string }>(),
    ]);

    return {
      coins_earned: Number(totals?.coins_earned ?? 0),
      coins_spent: Number(totals?.coins_spent ?? 0),
      gems_earned: Number(totals?.gems_earned ?? 0),
      transaction_count: Number(totals?.transaction_count ?? 0),
      last_activity_at: totals?.last_activity_at ?? null,
      by_source: bySource.map((r) => ({
        source_type: r.source_type,
        coins: Number(r.coins),
        count: Number(r.count),
      })),
    };
  }

  /** Coins → gems, or gems → coins, using the admin-set gems_per_coin rate. */
  async convert(
    user_id: string,
    from: WalletCurrency,
    amount: number,
  ): Promise<Wallet> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException({
        cz_error_code: CzWalletErrorCodes.INVALID_CONVERT_AMOUNT,
      });
    }

    const coinsPerGem = await this.settingsService.getNumber(
      SettingKeys.COINS_PER_GEM,
    );
    const to: WalletCurrency = from === 'coin' ? 'gem' : 'coin';
    // Floored both ways — a rate below 1 would otherwise mint fractional coins.
    const receiveAmount =
      from === 'coin'
        ? Math.floor(amount / coinsPerGem)
        : Math.floor(amount * coinsPerGem);

    if (receiveAmount <= 0) {
      throw new BadRequestException({
        cz_error_code: CzWalletErrorCodes.INVALID_CONVERT_AMOUNT,
      });
    }

    const wallet = await this.dataSource.transaction(async (tx) => {
      await this.moveWithManager(
        {
          user_id,
          currency: from,
          amount,
          type: 'convert_out',
          source_type: 'convert',
        },
        -1,
        tx,
      );
      return this.moveWithManager(
        {
          user_id,
          currency: to,
          amount: receiveAmount,
          type: 'convert_in',
          source_type: 'convert',
        },
        1,
        tx,
      );
    });

    // Awarded after the move commits, so a failed convert never unlocks a medal.
    void this.achievementsService.trackProgress(user_id, 'convert_currency');
    return wallet;
  }
}
