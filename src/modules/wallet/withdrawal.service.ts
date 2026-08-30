import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WithdrawalRequest } from '../../database/entities/withdrawal-request.entity';
import { User } from '../../database/entities/user.entity';
import { CzWalletErrorCodes } from '../../common/errors/error.constants';
import { encryptJson } from '../../common/utils/crypto.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import { SettingsService } from '../settings/settings.service';
import { ReferralRulesService } from '../referrals/referral-rules.service';
import { SettingKeys } from '../settings/setting.keys';
import { WalletService } from './wallet.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawals: Repository<WithdrawalRequest>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly walletService: WalletService,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => ReferralRulesService))
    private readonly referralRulesService: ReferralRulesService,
    @Inject(forwardRef(() => AchievementsService))
    private readonly achievementsService: AchievementsService,
  ) {}

  /** Coins leave the wallet immediately; an admin later approves or rejects. */
  async create(
    user_id: string,
    dto: CreateWithdrawalDto,
  ): Promise<WithdrawalRequest> {
    // Every read is independent, so they run as one round trip.
    const [minCoins, requiresKyc, coinsPerUsd, user, pending] =
      await Promise.all([
        this.settingsService.getNumber(SettingKeys.MIN_WITHDRAWAL_COINS),
        this.settingsService.getBoolean(SettingKeys.WITHDRAWAL_REQUIRES_KYC),
        this.settingsService.getNumber(SettingKeys.COINS_PER_USD),
        this.users.findOne({
          where: { cz_user_id: user_id },
          select: { cz_user_id: true, kyc_status: true },
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

    const amountUsd = (dto.amount_coins / coinsPerUsd).toFixed(2);

    const request = this.withdrawals.create({
      user_id,
      amount_coins: dto.amount_coins,
      amount_usd: amountUsd,
      method: dto.method,
      destination_details_encrypted: encryptJson(dto.destination_details),
      status: 'pending',
    });
    const saved = await this.withdrawals.save(request);

    await this.walletService.debit({
      user_id,
      currency: 'coin',
      amount: dto.amount_coins,
      type: 'withdrawal',
      source_type: 'withdrawal',
      source_id: saved.cz_withdrawal_request_id,
    });

    const totalWithdrawals = await this.withdrawals.count({ where: { user_id } });
    // Absolute, not incremental: the count is the standing figure.
    void this.achievementsService.setProgress(
      user_id,
      'withdrawal_completed',
      totalWithdrawals,
    );
    if (totalWithdrawals === 1) {
      await this.referralRulesService.award(user_id, 'first_withdrawal');
    }
    await this.referralRulesService.award(
      user_id,
      'withdrawals_completed',
      totalWithdrawals,
    );

    return saved;
  }

  async listForUser(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.withdrawals.findAndCount({
      where: { user_id },
      order: { created_at: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

}
