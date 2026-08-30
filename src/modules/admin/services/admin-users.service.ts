import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { UserDevicesService } from '../../users/user-devices.service';
import { WalletService } from '../../wallet/wallet.service';
import { WithdrawalService } from '../../wallet/withdrawal.service';
import { KycService } from '../../kyc/kyc.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { RedeemService } from '../../redeem/redeem.service';
import { AdminAchievementsService } from './admin-achievements.service';

/** How many rows each activity list carries. The panel links out for the full history. */
const RECENT_LIMIT = 20;

/** Admin user detail page: composes every module's already-built per-user query into one payload. */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userDevicesService: UserDevicesService,
    private readonly walletService: WalletService,
    private readonly withdrawalService: WithdrawalService,
    private readonly kycService: KycService,
    private readonly referralsService: ReferralsService,
    private readonly redeemService: RedeemService,
    private readonly adminAchievementsService: AdminAchievementsService,
  ) {}

  async getAdminDetail(cz_user_id: string) {
    const user = await this.usersService.getOrFail(cz_user_id);

    const [
      wallet,
      kyc,
      referral_summary,
      earning_summary,
      devices,
      recent_wallet_transactions,
      recent_withdrawals,
      recent_redeem_orders,
      referred_by,
      achievements,
    ] = await Promise.all([
      this.walletService.getBalance(cz_user_id),
      this.kycService.getStatus(cz_user_id),
      this.referralsService.getSummary(cz_user_id),
      this.walletService.getEarningSummary(cz_user_id),
      this.userDevicesService.listForUserAdmin(cz_user_id),
      this.walletService.listTransactions(cz_user_id, 1, RECENT_LIMIT),
      this.withdrawalService.listForUser(cz_user_id, 1, RECENT_LIMIT),
      this.redeemService.listOrders(cz_user_id, 1, RECENT_LIMIT),
      user.referred_by ? this.usersService.findById(user.referred_by) : null,
      this.adminAchievementsService.forUser(cz_user_id),
    ]);

    return {
      user,
      wallet: {
        coin_balance: wallet.coin_balance,
        gem_balance: wallet.gem_balance,
        updated_at: wallet.updated_at,
      },
      kyc,
      referral_summary,
      earning_summary,
      devices,
      referred_by: referred_by
        ? {
            cz_user_id: referred_by.cz_user_id,
            email: referred_by.email,
            name: referred_by.name,
          }
        : null,
      recent_wallet_transactions,
      recent_withdrawals,
      recent_redeem_orders,
      achievements,
    };
  }
}
