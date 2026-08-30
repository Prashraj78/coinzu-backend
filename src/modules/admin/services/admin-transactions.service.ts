import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTransaction } from '../../../database/entities/wallet-transaction.entity';
import { Wallet } from '../../../database/entities/wallet.entity';
import { OfferwallPostback } from '../../../database/entities/offerwall-postback.entity';
import { WithdrawalRequest } from '../../../database/entities/withdrawal-request.entity';
import { GiftCardOrder } from '../../../database/entities/gift-card-order.entity';
import { OfferCompletion } from '../../../database/entities/offer-completion.entity';
import { OfferClick } from '../../../database/entities/offer-click.entity';
import { CzWalletErrorCodes } from '../../../common/errors/error.constants';
import { toSkipTake } from '../../../common/utils/pagination.util';
import { AdminListTransactionsDto } from '../../wallet/dto/admin-list-transactions.dto';

interface TransactionRow {
  cz_wallet_transaction_id: string;
  user_id: string;
  currency: string;
  type: string;
  amount: number;
  balance_after: number;
  source_type: string;
  source_id: string | null;
  note: string | null;
  created_at: Date;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

/** Admin Transactions tab: every user's ledger in one filterable list. */
@Injectable()
export class AdminTransactionsService {
  constructor(
    @InjectRepository(WalletTransaction)
    private readonly transactions: Repository<WalletTransaction>,
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    @InjectRepository(OfferwallPostback)
    private readonly postbacks: Repository<OfferwallPostback>,
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawals: Repository<WithdrawalRequest>,
    @InjectRepository(GiftCardOrder)
    private readonly orders: Repository<GiftCardOrder>,
    @InjectRepository(OfferCompletion)
    private readonly completions: Repository<OfferCompletion>,
    @InjectRepository(OfferClick)
    private readonly clicks: Repository<OfferClick>,
  ) {}

  async list(query: AdminListTransactionsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const builder = this.transactions
      .createQueryBuilder('t')
      .innerJoin('users', 'u', 'u.cz_user_id = t.user_id')
      .select([
        't.cz_wallet_transaction_id AS cz_wallet_transaction_id',
        't.user_id AS user_id',
        't.currency AS currency',
        't.type AS type',
        't.amount AS amount',
        't.balance_after AS balance_after',
        't.source_type AS source_type',
        't.source_id AS source_id',
        't.note AS note',
        't.created_at AS created_at',
        'u.email AS email',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
      ])
      .orderBy('t.created_at', 'DESC')
      .offset(skip)
      .limit(take);

    const countBuilder = this.transactions
      .createQueryBuilder('t')
      .innerJoin('users', 'u', 'u.cz_user_id = t.user_id');

    for (const b of [builder, countBuilder]) {
      if (query.search) {
        b.andWhere(
          '(u.email ILIKE :search OR u.name ILIKE :search OR t.note ILIKE :search)',
          { search: `%${query.search}%` },
        );
      }
      if (query.cz_user_id) {
        b.andWhere('t.user_id = :cz_user_id', { cz_user_id: query.cz_user_id });
      }
      if (query.currency) {
        b.andWhere('t.currency = :currency', { currency: query.currency });
      }
      if (query.type) {
        b.andWhere('t.type = :type', { type: query.type });
      }
      if (query.source_type) {
        b.andWhere('t.source_type = :source_type', {
          source_type: query.source_type,
        });
      }
      if (query.date_from) {
        b.andWhere('t.created_at >= :date_from', { date_from: query.date_from });
      }
      if (query.date_end) {
        b.andWhere("t.created_at < (:date_end::date + interval '1 day')", {
          date_end: query.date_end,
        });
      }
    }

    const [rows, total] = await Promise.all([
      builder.getRawMany<TransactionRow>(),
      countBuilder.getCount(),
    ]);

    const data = rows.map((r) => ({
      cz_wallet_transaction_id: r.cz_wallet_transaction_id,
      currency: r.currency,
      type: r.type,
      amount: Number(r.amount),
      balance_after: Number(r.balance_after),
      source_type: r.source_type,
      source_id: r.source_id,
      note: r.note,
      created_at: r.created_at,
      user: {
        cz_user_id: r.user_id,
        email: r.email,
        name: r.name,
        avatar_url: r.avatar_url,
      },
    }));

    return { data, total };
  }

  async detail(cz_wallet_transaction_id: string) {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .innerJoin('users', 'u', 'u.cz_user_id = t.user_id')
      .select([
        't.cz_wallet_transaction_id AS cz_wallet_transaction_id',
        't.user_id AS user_id',
        't.currency AS currency',
        't.type AS type',
        't.amount AS amount',
        't.balance_after AS balance_after',
        't.source_type AS source_type',
        't.source_id AS source_id',
        't.note AS note',
        't.created_at AS created_at',
        'u.email AS email',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
      ])
      .where('t.cz_wallet_transaction_id = :id', {
        id: cz_wallet_transaction_id,
      })
      .getRawMany<TransactionRow>();

    const row = rows[0];
    if (!row) {
      throw new NotFoundException({
        cz_error_code: CzWalletErrorCodes.TRANSACTION_NOT_FOUND,
      });
    }

    const [wallet, source] = await Promise.all([
      this.wallets.findOne({ where: { cz_user_id: row.user_id } }),
      this.resolveSource(row.source_type, row.source_id),
    ]);

    return {
      transaction: {
        cz_wallet_transaction_id: row.cz_wallet_transaction_id,
        currency: row.currency,
        type: row.type,
        amount: Number(row.amount),
        balance_after: Number(row.balance_after),
        source_type: row.source_type,
        source_id: row.source_id,
        note: row.note,
        created_at: row.created_at,
      },
      user: {
        cz_user_id: row.user_id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
      },
      wallet_now: {
        coin_balance: wallet?.coin_balance ?? 0,
        gem_balance: wallet?.gem_balance ?? 0,
      },
      source,
    };
  }

  /** The row that caused the movement, shaped per source. `null` when there is nothing to link. */
  private async resolveSource(source_type: string, source_id: string | null) {
    if (!source_id) return null;

    if (source_type === 'offerwall') {
      const postback = await this.postbacks.findOne({
        where: { cz_offerwall_postback_id: source_id },
      });
      if (!postback) return null;
      return {
        kind: 'offerwall_postback' as const,
        cz_offerwall_postback_id: postback.cz_offerwall_postback_id,
        partner_name: postback.partner_name,
        offer_name: postback.offer_name,
        external_transaction_id: postback.external_transaction_id,
        coins_credited: postback.coins_credited,
        status: postback.status,
        created_at: postback.created_at,
      };
    }

    if (source_type === 'offer') {
      const completion = await this.completions.findOne({
        where: { cz_offer_completion_id: source_id },
      });
      if (!completion) return null;

      const click = await this.clicks.findOne({
        where: { cz_offer_click_id: completion.offer_click_id },
        relations: { offer: true },
      });
      const offer = click?.offer;
      const goal = completion.goal_id
        ? offer?.goals?.find((g) => g.goal_id === completion.goal_id)
        : undefined;

      return {
        kind: 'offer_completion' as const,
        cz_offer_completion_id: completion.cz_offer_completion_id,
        offer_title: offer?.title ?? null,
        goal_id: completion.goal_id,
        goal_title: goal?.title ?? null,
        external_transaction_id: completion.external_transaction_id,
        payout_coins: completion.payout_coins,
        status: completion.status,
        credited_at: completion.credited_at,
        created_at: completion.created_at,
      };
    }

    if (source_type === 'withdrawal') {
      const withdrawal = await this.withdrawals.findOne({
        where: { cz_withdrawal_request_id: source_id },
      });
      if (!withdrawal) return null;
      return {
        kind: 'withdrawal_request' as const,
        cz_withdrawal_request_id: withdrawal.cz_withdrawal_request_id,
        amount_coins: withdrawal.amount_coins,
        amount_usd: withdrawal.amount_usd,
        method: withdrawal.method,
        status: withdrawal.status,
        rejection_reason: withdrawal.rejection_reason,
        created_at: withdrawal.created_at,
      };
    }

    if (source_type === 'redeem') {
      const order = await this.orders.findOne({
        where: { cz_gift_card_order_id: source_id },
      });
      if (!order) return null;
      return {
        kind: 'gift_card_order' as const,
        cz_gift_card_order_id: order.cz_gift_card_order_id,
        price_coins: order.price_coins,
        status: order.status,
        failure_reason: order.failure_reason,
        created_at: order.created_at,
      };
    }

    return null;
  }
}
