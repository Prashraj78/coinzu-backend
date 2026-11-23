import type { DevicePlatformType } from '../../database/entities/user-device.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DataSource, Not, IsNull, QueryFailedError, Repository } from 'typeorm';
import {
  USDT_NETWORKS,
  WithdrawalRequest,
  type UsdtNetwork,
} from '../../database/entities/withdrawal-request.entity';
import { User } from '../../database/entities/user.entity';
import { CzWalletErrorCodes } from '../../common/errors/error.constants';
import { toSkipTake } from '../../common/utils/pagination.util';
import { SettingsService } from '../settings/settings.service';
import { ReferralRulesService } from '../referrals/referral-rules.service';
import { SettingKeys } from '../settings/setting.keys';
import { WalletService } from './wallet.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { PayWithdrawalDto } from './dto/review-withdrawal.dto';
import { AchievementsService } from '../achievements/achievements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramExternal } from '../../external/telegram.external';
import { Env } from '../../common/config/env';

const ONE_PENDING_INDEX = 'IDX_withdrawal_requests_one_pending';
// Admin panel link in the Telegram alert.
const WITHDRAWALS_ADMIN_URL = 'https://rewardtym.online/admin/coinzu/withdrawals';

const ADDRESS_FORMAT: Record<UsdtNetwork, RegExp> = {
  BEP20: /^0x[a-fA-F0-9]{40}$/,
  TRC20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
};

const TX_HASH_FORMAT: Record<UsdtNetwork, RegExp> = {
  BEP20: /^0x[a-fA-F0-9]{64}$/,
  TRC20: /^[a-fA-F0-9]{64}$/,
};

export type WithdrawalBlockReason =
  'not_web' | 'pending_exists' | 'kyc_required' | 'below_minimum';

export function txExplorerUrl(
  network: string | null,
  tx_hash: string | null,
): string | null {
  if (!tx_hash) return null;
  if (network === 'BEP20') return `https://bscscan.com/tx/${tx_hash}`;
  if (network === 'TRC20')
    return `https://tronscan.org/#/transaction/${tx_hash}`;
  return null;
}

export function addressExplorerUrl(
  network: string | null,
  address: string | null,
): string | null {
  if (!address) return null;
  if (network === 'BEP20') return `https://bscscan.com/address/${address}`;
  if (network === 'TRC20') return `https://tronscan.org/#/address/${address}`;
  return null;
}

/** The shape every user-facing withdrawal endpoint returns. */
export function toWithdrawalView(w: WithdrawalRequest) {
  return {
    cz_withdrawal_request_id: w.cz_withdrawal_request_id,
    status: w.status,
    amount_coins: w.amount_coins,
    gross_usd: w.amount_usd,
    fee_percent: w.fee_percent,
    fee_usd: w.fee_usd,
    payout_usd: w.payout_usd,
    network: w.network,
    wallet_address: w.wallet_address,
    tx_hash: w.tx_hash ?? null,
    explorer_url: txExplorerUrl(w.network, w.tx_hash ?? null),
    rejection_reason: w.rejection_reason ?? null,
    created_at: w.created_at,
    reviewed_at: w.reviewed_at ?? null,
    paid_at: w.paid_at ?? null,
  };
}

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawals: Repository<WithdrawalRequest>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => ReferralRulesService))
    private readonly referralRulesService: ReferralRulesService,
    @Inject(forwardRef(() => AchievementsService))
    private readonly achievementsService: AchievementsService,
    private readonly notificationsService: NotificationsService,
    private readonly telegram: TelegramExternal,
  ) {}

  /** Web-only USDT payout. Coins leave the wallet in the same transaction; an admin pays or rejects later. */
  async create(
    user_id: string,
    dto: CreateWithdrawalDto,
    platform: DevicePlatformType,
  ) {
    if (platform !== 'web') {
      throw new ForbiddenException({
        cz_error_code: CzWalletErrorCodes.WITHDRAWAL_WEB_ONLY,
      });
    }
    const wallet_address = dto.wallet_address.trim();
    if (!ADDRESS_FORMAT[dto.network].test(wallet_address)) {
      throw new BadRequestException({
        cz_error_code: CzWalletErrorCodes.INVALID_WALLET_ADDRESS,
      });
    }

    const [minCoins, requiresKyc, coinsPerUsd, feePercent, user, pending] =
      await Promise.all([
        this.settingsService.getNumber(SettingKeys.MIN_WITHDRAWAL_COINS),
        this.settingsService.withdrawalRequiresKyc(platform),
        this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
        this.settingsService.getNumber(SettingKeys.USDT_WITHDRAWAL_FEE_PERCENT),
        this.users.findOne({
          where: { cz_user_id: user_id },
          select: { cz_user_id: true, kyc_status: true, telegram_id: true, telegram_member_id: true },
        }),
        this.withdrawals.findOne({
          where: { user_id, status: 'pending' },
          select: { cz_withdrawal_request_id: true },
        }),
      ]);

    if (dto.amount_coins < minCoins) {
      throw new BadRequestException({
        cz_error_code: CzWalletErrorCodes.BELOW_MINIMUM_WITHDRAWAL,
        cz_error_description: `Minimum withdrawal is ${minCoins} coins.`,
      });
    }
    if (requiresKyc && user?.kyc_status !== 'verified') {
      throw new ForbiddenException({
        cz_error_code: CzWalletErrorCodes.KYC_REQUIRED,
      });
    }
    if (pending) {
      throw new ConflictException({
        cz_error_code: CzWalletErrorCodes.PENDING_WITHDRAWAL_EXISTS,
      });
    }
    // Always a fresh check: leaving the channel right after the gate let them in must not pay out.
    // Only a definite "not a member" blocks; a failed check lets the request through.
    if (Env.telegram.channelId) {
      const memberId = user?.telegram_member_id ?? user?.telegram_id;
      const member = memberId ? await this.telegram.isChannelMember(memberId) : false;
      if (member === false) {
        throw new ForbiddenException({
          cz_error_code: CzWalletErrorCodes.TELEGRAM_CHANNEL_REQUIRED,
        });
      }
    }

    // Integer cents so gross = fee + payout exactly.
    const grossCents = Math.round((dto.amount_coins * 100) / coinsPerUsd);
    const feeCents = Math.round((grossCents * feePercent) / 100);
    const cents = (n: number) => (n / 100).toFixed(2);

    let saved: WithdrawalRequest;
    try {
      saved = await this.dataSource.transaction(async (tx) => {
        const row = await tx.save(
          WithdrawalRequest,
          tx.create(WithdrawalRequest, {
            user_id,
            amount_coins: dto.amount_coins,
            amount_usd: cents(grossCents),
            fee_percent: feePercent.toFixed(2),
            fee_usd: cents(feeCents),
            payout_usd: cents(grossCents - feeCents),
            method: 'crypto',
            network: dto.network,
            wallet_address,
            destination_details_encrypted: null,
            status: 'pending',
          }),
        );
        await this.walletService.debit(
          {
            user_id,
            currency: 'coin',
            amount: dto.amount_coins,
            type: 'withdrawal',
            source_type: 'withdrawal',
            source_id: row.cz_withdrawal_request_id,
            note: `USDT ${dto.network} withdrawal`,
          },
          tx,
        );
        return row;
      });
    } catch (err) {
      // Two concurrent submits: the partial unique index lets only one pending row in.
      const constraint = (err as { driverError?: { constraint?: string } })
        .driverError?.constraint;
      if (err instanceof QueryFailedError && constraint === ONE_PENDING_INDEX) {
        throw new ConflictException({
          cz_error_code: CzWalletErrorCodes.PENDING_WITHDRAWAL_EXISTS,
        });
      }
      throw err;
    }

    await this.notificationsService.push(
      user_id,
      'Withdrawal submitted',
      `Your withdrawal of ${dto.amount_coins} coins ($${saved.payout_usd} USDT on ${dto.network}) is being reviewed. We'll let you know once it's paid.`,
    );
    void this.alertNewRequest(saved);

    return toWithdrawalView(saved);
  }

  /** Posts the new request to the withdrawals Telegram group. Detached; a failure never touches the request. */
  private async alertNewRequest(row: WithdrawalRequest): Promise<void> {
    try {
      const user = await this.users.findOne({
        where: { cz_user_id: row.user_id },
        select: { name: true, email: true, kyc_status: true, signup_platform: true },
      });
      const e = (v: string | null | undefined) => this.telegram.escape(v ?? '-');
      const lines = [
        '<b>💸 New withdrawal request</b>',
        `User: ${e(user?.name)} (${e(user?.email)})`,
        `Amount: ${row.amount_coins.toLocaleString('en-US')} coins = $${row.amount_usd}`,
        `Fee: ${row.fee_percent}% ($${row.fee_usd}) · <b>Pay: $${row.payout_usd} USDT</b>`,
        `Network: <b>${e(row.network)}</b>`,
        `Address: <code>${e(row.wallet_address)}</code>`,
        `KYC: ${e(user?.kyc_status)} · Signed up: ${e(user?.signup_platform)}`,
        `<a href="${WITHDRAWALS_ADMIN_URL}/${row.cz_withdrawal_request_id}">Review in admin</a>`,
      ];
      await this.telegram.sendAlert(lines.join('\n'), Env.telegram.withdrawalsChatId || undefined);
    } catch (err) {
      this.logger.warn(`Withdrawal alert failed: ${String(err)}`);
    }
  }

  async listForUser(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [rows, total] = await this.withdrawals.findAndCount({
      where: { user_id },
      order: { created_at: 'DESC' },
      skip,
      take,
    });
    return { data: rows.map(toWithdrawalView), total };
  }

  /** Everything the web withdraw page needs in one call. */
  async form(user_id: string, platform: DevicePlatformType) {
    const [
      wallet,
      coinsPerUsd,
      minCoins,
      feePercent,
      requiresKyc,
      user,
      pending,
      last,
    ] = await Promise.all([
      this.walletService.getBalance(user_id),
      this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
      this.settingsService.getNumber(SettingKeys.MIN_WITHDRAWAL_COINS),
      this.settingsService.getNumber(SettingKeys.USDT_WITHDRAWAL_FEE_PERCENT),
      this.settingsService.withdrawalRequiresKyc(platform),
      this.users.findOne({
        where: { cz_user_id: user_id },
        select: { cz_user_id: true, kyc_status: true },
      }),
      this.withdrawals.findOne({ where: { user_id, status: 'pending' } }),
      this.withdrawals.findOne({
        where: { user_id, network: Not(IsNull()) },
        select: {
          cz_withdrawal_request_id: true,
          network: true,
          wallet_address: true,
        },
        order: { created_at: 'DESC' },
      }),
    ]);

    const kycStatus = user?.kyc_status ?? 'none';
    let reason: WithdrawalBlockReason | null = null;
    if (platform !== 'web') reason = 'not_web';
    else if (pending) reason = 'pending_exists';
    else if (requiresKyc && kycStatus !== 'verified') reason = 'kyc_required';
    else if (wallet.coin_balance < minCoins) reason = 'below_minimum';

    return {
      coin_balance: wallet.coin_balance,
      coins_per_usd: coinsPerUsd,
      min_withdrawal_coins: minCoins,
      max_withdrawal_coins: wallet.coin_balance,
      fee_percent: feePercent,
      requires_kyc: requiresKyc,
      kyc_status: kycStatus,
      has_pending: !!pending,
      pending: pending ? toWithdrawalView(pending) : null,
      last_destination:
        last?.network && last.wallet_address
          ? { network: last.network, wallet_address: last.wallet_address }
          : null,
      networks: [...USDT_NETWORKS],
      can_withdraw: reason === null,
      reason,
    };
  }

  /** Admin marks a pending request paid. Awards fire only here, never on submission. */
  async markPaid(
    id: string,
    dto: PayWithdrawalDto,
    admin_id: string,
  ): Promise<void> {
    const row = await this.getPendingOrFail(id);
    const tx_hash = dto.tx_hash.trim();
    const format = row.network ? TX_HASH_FORMAT[row.network] : /^\S+$/;
    if (!format.test(tx_hash)) {
      throw new BadRequestException({
        cz_error_code: CzWalletErrorCodes.INVALID_TX_HASH,
      });
    }

    const now = new Date();
    const result = await this.withdrawals.update(
      { cz_withdrawal_request_id: id, status: 'pending' },
      {
        status: 'paid',
        tx_hash,
        admin_note: dto.note?.trim() || null,
        paid_at: now,
        reviewed_by: admin_id,
        reviewed_at: now,
      },
    );
    if (!result.affected) {
      throw new ConflictException({
        cz_error_code: CzWalletErrorCodes.WITHDRAWAL_ALREADY_REVIEWED,
      });
    }

    const amount = row.payout_usd ?? row.amount_usd;
    await this.notificationsService.push(
      row.user_id,
      'Withdrawal paid',
      row.network
        ? `We sent $${amount} USDT on ${row.network} to your wallet. Check the transaction in your withdrawal history.`
        : `Your withdrawal of $${amount} has been paid.`,
    );
    await this.awardPaid(row.user_id);
  }

  /** Admin rejects a pending request: status flip and coin refund commit together. */
  async reject(id: string, note: string, admin_id: string): Promise<void> {
    const row = await this.getPendingOrFail(id);
    const reason = note.trim();

    await this.dataSource.transaction(async (tx) => {
      const result = await tx.update(
        WithdrawalRequest,
        { cz_withdrawal_request_id: id, status: 'pending' },
        {
          status: 'rejected',
          rejection_reason: reason,
          admin_note: reason,
          reviewed_by: admin_id,
          reviewed_at: new Date(),
        },
      );
      if (!result.affected) {
        throw new ConflictException({
          cz_error_code: CzWalletErrorCodes.WITHDRAWAL_ALREADY_REVIEWED,
        });
      }
      await this.walletService.credit(
        {
          user_id: row.user_id,
          currency: 'coin',
          amount: row.amount_coins,
          type: 'reversal',
          source_type: 'withdrawal',
          source_id: id,
          note: 'Withdrawal rejected — coins returned',
        },
        tx,
      );
    });

    await this.notificationsService.push(
      row.user_id,
      'Withdrawal rejected',
      `Your withdrawal was rejected. Reason: ${reason.replace(/[.\s]+$/, '')}. ${row.amount_coins} coins are back in your wallet.`,
    );
  }

  private async getPendingOrFail(id: string): Promise<WithdrawalRequest> {
    const row = isUUID(id)
      ? await this.withdrawals.findOne({
          where: { cz_withdrawal_request_id: id },
        })
      : null;
    if (!row) {
      throw new NotFoundException({
        cz_error_code: CzWalletErrorCodes.WITHDRAWAL_NOT_FOUND,
      });
    }
    if (row.status !== 'pending') {
      throw new ConflictException({
        cz_error_code: CzWalletErrorCodes.WITHDRAWAL_ALREADY_REVIEWED,
      });
    }
    return row;
  }

  /** The payout already committed, so an award failure is logged, never surfaced. */
  private async awardPaid(user_id: string): Promise<void> {
    try {
      const totalPaid = await this.withdrawals.count({
        where: { user_id, status: 'paid' },
      });
      await this.achievementsService.setProgress(
        user_id,
        'withdrawal_completed',
        totalPaid,
      );
      if (totalPaid === 1) {
        await this.referralRulesService.award(user_id, 'first_withdrawal');
      }
      await this.referralRulesService.award(
        user_id,
        'withdrawals_completed',
        totalPaid,
      );
    } catch (err) {
      this.logger.warn(
        `Withdrawal awards failed user=${user_id}: ${String(err)}`,
      );
    }
  }
}
