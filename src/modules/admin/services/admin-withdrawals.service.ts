import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { WithdrawalRequest } from '../../../database/entities/withdrawal-request.entity';
import { CzWalletErrorCodes } from '../../../common/errors/error.constants';
import { toSkipTake } from '../../../common/utils/pagination.util';
import { AdminWithdrawalFiltersDto } from '../../wallet/dto/admin-list-withdrawals.dto';
import { PayWithdrawalDto } from '../../wallet/dto/review-withdrawal.dto';
import { WalletService } from '../../wallet/wallet.service';
import {
  WithdrawalService,
  addressExplorerUrl,
  toWithdrawalView,
  txExplorerUrl,
} from '../../wallet/withdrawal.service';

const PREVIOUS_LIMIT = 10;

interface Row {
  cz_withdrawal_request_id: string;
  status: string;
  network: string | null;
  wallet_address: string | null;
  amount_coins: number;
  amount_usd: string;
  fee_percent: string | null;
  fee_usd: string | null;
  payout_usd: string | null;
  tx_hash: string | null;
  rejection_reason: string | null;
  admin_note: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  paid_at: Date | null;
  reviewed_by: string | null;
  user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  signup_platform: string;
  kyc_status: string;
  user_status: string;
}

/** Admin Withdrawals tab: the manual USDT payout queue. */
@Injectable()
export class AdminWithdrawalsService {
  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawals: Repository<WithdrawalRequest>,
    private readonly withdrawalService: WithdrawalService,
    private readonly walletService: WalletService,
  ) {}

  async list(query: AdminWithdrawalFiltersDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const rows = this.applyFilters(this.base(), query, true);
    const [data, total] = await Promise.all([
      this.selectRow(rows)
        .orderBy('w.created_at', 'DESC')
        .offset(skip)
        .limit(take)
        .getRawMany<Row>(),
      this.applyFilters(this.base(), query, true).getCount(),
    ]);
    return { data: data.map(toAdminRow), total };
  }

  /** Header tiles. Takes the list filters except status, which the tiles split by themselves. */
  async summary(query: AdminWithdrawalFiltersDto) {
    const r = await this.applyFilters(this.base(), query, false)
      .select(
        `COUNT(*) FILTER (WHERE w.status = 'pending')::int`,
        'pending_count',
      )
      .addSelect(
        `COALESCE(SUM(${PAYOUT}) FILTER (WHERE w.status = 'pending'), 0)`,
        'pending_usd',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE w.status = 'paid' AND w.paid_at >= date_trunc('day', now()))::int`,
        'paid_today_count',
      )
      .addSelect(
        `COALESCE(SUM(${PAYOUT}) FILTER (WHERE w.status = 'paid' AND w.paid_at >= date_trunc('day', now())), 0)`,
        'paid_today_usd',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE w.status = 'paid' AND w.paid_at >= date_trunc('month', now()))::int`,
        'paid_month_count',
      )
      .addSelect(
        `COALESCE(SUM(${PAYOUT}) FILTER (WHERE w.status = 'paid' AND w.paid_at >= date_trunc('month', now())), 0)`,
        'paid_month_usd',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE w.status = 'rejected' AND w.reviewed_at >= date_trunc('month', now()))::int`,
        'rejected_month_count',
      )
      .getRawOne<Record<string, string | number>>();
    const usd = (v: unknown) => Number(v ?? 0).toFixed(2);
    return {
      pending: {
        count: Number(r?.pending_count ?? 0),
        payout_usd: usd(r?.pending_usd),
      },
      paid_today: {
        count: Number(r?.paid_today_count ?? 0),
        payout_usd: usd(r?.paid_today_usd),
      },
      paid_this_month: {
        count: Number(r?.paid_month_count ?? 0),
        payout_usd: usd(r?.paid_month_usd),
      },
      rejected_this_month: { count: Number(r?.rejected_month_count ?? 0) },
    };
  }

  async detail(id: string) {
    const row = await this.getRowOrFail(id);
    const user_id = row.user.cz_user_id;
    const [wallet, earnings, lifetime, previous] = await Promise.all([
      this.walletService.getBalance(user_id),
      this.walletService.getEarningSummary(user_id),
      this.withdrawals
        .createQueryBuilder('w')
        .select('COUNT(*)::int', 'count')
        .addSelect(`COALESCE(SUM(${PAYOUT}), 0)`, 'usd')
        .where('w.user_id = :user_id', { user_id })
        .andWhere(`w.status = 'paid'`)
        .getRawOne<{ count: number; usd: string }>(),
      this.withdrawals
        .createQueryBuilder('w')
        .where('w.user_id = :user_id', { user_id })
        .andWhere('w.cz_withdrawal_request_id <> :id', { id })
        .orderBy('w.created_at', 'DESC')
        .limit(PREVIOUS_LIMIT)
        .getMany(),
    ]);
    return {
      ...row,
      user_context: {
        coin_balance: wallet.coin_balance,
        gem_balance: wallet.gem_balance,
        total_coins_earned: earnings.coins_earned,
        lifetime_paid: {
          count: Number(lifetime?.count ?? 0),
          payout_usd: Number(lifetime?.usd ?? 0).toFixed(2),
        },
        user_status: row.user.status,
        previous_withdrawals: previous.map((w) => ({
          ...toWithdrawalView(w),
          admin_note: w.admin_note,
        })),
      },
    };
  }

  async pay(id: string, dto: PayWithdrawalDto, admin_id: string) {
    await this.withdrawalService.markPaid(id, dto, admin_id);
    return this.getRowOrFail(id);
  }

  async reject(id: string, note: string, admin_id: string) {
    await this.withdrawalService.reject(id, note, admin_id);
    return this.getRowOrFail(id);
  }

  private async getRowOrFail(id: string) {
    const row = isUUID(id)
      ? await this.selectRow(this.base())
          .where('w.cz_withdrawal_request_id = :id', { id })
          .getRawOne<Row>()
      : undefined;
    if (!row) {
      throw new NotFoundException({
        cz_error_code: CzWalletErrorCodes.WITHDRAWAL_NOT_FOUND,
      });
    }
    return toAdminRow(row);
  }

  private base() {
    return this.withdrawals
      .createQueryBuilder('w')
      .innerJoin('users', 'u', 'u.cz_user_id = w.user_id');
  }

  private selectRow(b: SelectQueryBuilder<WithdrawalRequest>) {
    return b.select([
      'w.cz_withdrawal_request_id AS cz_withdrawal_request_id',
      'w.status AS status',
      'w.network AS network',
      'w.wallet_address AS wallet_address',
      'w.amount_coins AS amount_coins',
      'w.amount_usd AS amount_usd',
      'w.fee_percent AS fee_percent',
      'w.fee_usd AS fee_usd',
      'w.payout_usd AS payout_usd',
      'w.tx_hash AS tx_hash',
      'w.rejection_reason AS rejection_reason',
      'w.admin_note AS admin_note',
      'w.created_at AS created_at',
      'w.reviewed_at AS reviewed_at',
      'w.paid_at AS paid_at',
      'w.reviewed_by AS reviewed_by',
      'w.user_id AS user_id',
      'u.name AS name',
      'u.email AS email',
      'u.avatar_url AS avatar_url',
      'u.signup_platform AS signup_platform',
      'u.kyc_status AS kyc_status',
      'u.status AS user_status',
    ]);
  }

  private applyFilters(
    b: SelectQueryBuilder<WithdrawalRequest>,
    q: AdminWithdrawalFiltersDto,
    withStatus: boolean,
  ) {
    if (q.search) {
      b.andWhere(
        '(u.email ILIKE :s OR u.name ILIKE :s OR u.cz_user_id::text ILIKE :s OR w.wallet_address ILIKE :s OR w.tx_hash ILIKE :s)',
        { s: `%${q.search.trim()}%` },
      );
    }
    if (withStatus && q.status)
      b.andWhere('w.status = :status', { status: q.status });
    if (q.network) b.andWhere('w.network = :network', { network: q.network });
    if (q.signup_platform)
      b.andWhere('u.signup_platform = :sp', { sp: q.signup_platform });
    if (q.kyc_status) b.andWhere('u.kyc_status = :kyc', { kyc: q.kyc_status });
    if (q.min_usd != null)
      b.andWhere(`${PAYOUT} >= :min_usd`, { min_usd: q.min_usd });
    if (q.max_usd != null)
      b.andWhere(`${PAYOUT} <= :max_usd`, { max_usd: q.max_usd });
    if (q.date_from)
      b.andWhere('w.created_at >= :date_from', { date_from: q.date_from });
    if (q.date_end) {
      b.andWhere("w.created_at < (:date_end::date + interval '1 day')", {
        date_end: q.date_end,
      });
    }
    return b;
  }
}

// Pre-USDT rows have no payout_usd; their gross was the payout.
const PAYOUT = 'COALESCE(w.payout_usd, w.amount_usd)';

function toAdminRow(r: Row) {
  return {
    cz_withdrawal_request_id: r.cz_withdrawal_request_id,
    status: r.status,
    network: r.network,
    wallet_address: r.wallet_address,
    amount_coins: Number(r.amount_coins),
    gross_usd: r.amount_usd,
    fee_percent: r.fee_percent,
    fee_usd: r.fee_usd,
    payout_usd: r.payout_usd,
    tx_hash: r.tx_hash,
    address_explorer_url: addressExplorerUrl(r.network, r.wallet_address),
    tx_explorer_url: txExplorerUrl(r.network, r.tx_hash),
    rejection_reason: r.rejection_reason,
    admin_note: r.admin_note,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
    paid_at: r.paid_at,
    reviewed_by: r.reviewed_by,
    user: {
      cz_user_id: r.user_id,
      name: r.name,
      email: r.email,
      avatar_url: r.avatar_url,
      signup_platform: r.signup_platform,
      kyc_status: r.kyc_status,
      status: r.user_status,
    },
  };
}
