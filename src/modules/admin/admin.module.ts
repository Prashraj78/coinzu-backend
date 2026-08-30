import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransaction } from '../../database/entities/wallet-transaction.entity';
import { Wallet } from '../../database/entities/wallet.entity';
import { OfferwallPostback } from '../../database/entities/offerwall-postback.entity';
import { WithdrawalRequest } from '../../database/entities/withdrawal-request.entity';
import { GiftCardOrder } from '../../database/entities/gift-card-order.entity';
import { SupportTicket } from '../../database/entities/support-ticket.entity';
import { KycVerification } from '../../database/entities/kyc-verification.entity';
import { PushCampaign } from '../../database/entities/push-campaign.entity';
import { PushTemplate } from '../../database/entities/push-template.entity';
import { StreakRewardConfig } from '../../database/entities/streak-reward-config.entity';
import { CronJobLog } from '../../database/entities/cron-job-log.entity';
import { CronJobSetting } from '../../database/entities/cron-job-setting.entity';
import { Achievement } from '../../database/entities/achievement.entity';
import { DailyChallenge } from '../../database/entities/daily-challenge.entity';
import { UserChallengeProgress } from '../../database/entities/user-challenge-progress.entity';
import { DailyChestClaim } from '../../database/entities/daily-chest-claim.entity';
import { SpinWheelConfig } from '../../database/entities/spin-wheel-config.entity';
import { SpinHistory } from '../../database/entities/spin-history.entity';
import { ScratchCard } from '../../database/entities/scratch-card.entity';
import { ScratchHistory } from '../../database/entities/scratch-history.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserAchievement } from '../../database/entities/user-achievement.entity';
import { UserStreak } from '../../database/entities/user-streak.entity';
import { UserDevice } from '../../database/entities/user-device.entity';
import { Notification } from '../../database/entities/notification.entity';
import { User } from '../../database/entities/user.entity';
import { OfferCompletion } from '../../database/entities/offer-completion.entity';
import { OfferClick } from '../../database/entities/offer-click.entity';
import { DropdownModule } from '../dropdown/dropdown.module';
import { OfferwallModule } from '../offerwall/offerwall.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { KycModule } from '../kyc/kyc.module';
import { RedeemModule } from '../redeem/redeem.module';
import { SupportModule } from '../support/support.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { AdminDropdownController } from './controllers/admin-dropdown.controller';
import { AdminFaqsController } from './controllers/admin-faqs.controller';
import { AdminKycController } from './controllers/admin-kyc.controller';
import { AdminPushController } from './controllers/admin-push.controller';
import { AdminPushTemplateController } from './controllers/admin-push-template.controller';
import { AdminStreakController } from './controllers/admin-streak.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminCronController } from './controllers/admin-cron.controller';
import { AdminAchievementsController } from './controllers/admin-achievements.controller';
import { AdminDailyController } from './controllers/admin-daily.controller';
import { AdminLeaderboardController } from './controllers/admin-leaderboard.controller';
import { AdminOfferwallController } from './controllers/admin-offerwall.controller';
import { AdminReferralRulesController } from './controllers/admin-referral-rules.controller';
import { AdminReferralsController } from './controllers/admin-referrals.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { AdminTicketsController } from './controllers/admin-tickets.controller';
import { AdminTransactionsController } from './controllers/admin-transactions.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminKycService } from './services/admin-kyc.service';
import { AdminPushService } from './services/admin-push.service';
import { AdminPushTemplateService } from './services/admin-push-template.service';
import { AdminStreakService } from './services/admin-streak.service';
import { AdminCronService } from './services/admin-cron.service';
import { AdminAchievementsService } from './services/admin-achievements.service';
import { AdminDailyService } from './services/admin-daily.service';
import { AdminRewardsService } from './services/admin-rewards.service';
import { AdminRewardsController } from './controllers/admin-rewards.controller';
import { RewardGame } from '../../database/entities/reward-game.entity';
import { RewardPrize } from '../../database/entities/reward-prize.entity';
import { RewardPayoutRule } from '../../database/entities/reward-payout-rule.entity';
import { RewardPlay } from '../../database/entities/reward-play.entity';
import { LuckyDraw } from '../../database/entities/lucky-draw.entity';
import { LuckyDrawEntry } from '../../database/entities/lucky-draw-entry.entity';
import { LuckyDrawWinner } from '../../database/entities/lucky-draw-winner.entity';
import { RewardsModule } from '../rewards/rewards.module';
import { AdminDailyDashboardService } from './services/admin-daily-dashboard.service';
import { PushSchedulerService } from './services/push-scheduler.service';
import { AdminLeaderboardService } from './services/admin-leaderboard.service';
import { AdminTicketsService } from './services/admin-tickets.service';
import { AdminTransactionsService } from './services/admin-transactions.service';
import { AdminUsersService } from './services/admin-users.service';

/**
 * Every /api/admin route lives here. There is no Coinzu admin table — the
 * caller is a Rewardtym admin, identified by the claims on their Rewardtym
 * token, so nothing in this module reads an admin record.
 */
@Module({
  imports: [
    RewardsModule,
    TypeOrmModule.forFeature([
      WalletTransaction,
      Wallet,
      OfferwallPostback,
      WithdrawalRequest,
      GiftCardOrder,
      OfferCompletion,
      OfferClick,
      SupportTicket,
      KycVerification,
      User,
      PushCampaign,
      PushTemplate,
      StreakRewardConfig,
      UserStreak,
      CronJobLog,
      CronJobSetting,
      Achievement,
      RewardGame,
      RewardPrize,
      RewardPayoutRule,
      RewardPlay,
      LuckyDraw,
      LuckyDrawEntry,
      LuckyDrawWinner,
      DailyChallenge,
      UserChallengeProgress,
      DailyChestClaim,
      SpinWheelConfig,
      SpinHistory,
      ScratchCard,
      ScratchHistory,
      Quiz,
      QuizAttempt,
      UserAchievement,
      UserDevice,
      Notification,
    ]),
    DropdownModule,
    OfferwallModule,
    ReferralsModule,
    UsersModule,
    WalletModule,
    KycModule,
    RedeemModule,
    SupportModule,
    AchievementsModule,
  ],
  controllers: [
    AdminDropdownController,
    AdminFaqsController,
    AdminKycController,
    AdminPushController,
    AdminPushTemplateController,
    AdminStreakController,
    AdminDashboardController,
    AdminCronController,
    AdminAchievementsController,
    AdminDailyController,
    AdminRewardsController,
    AdminLeaderboardController,
    AdminOfferwallController,
    AdminReferralRulesController,
    AdminReferralsController,
    AdminSettingsController,
    AdminTicketsController,
    AdminTransactionsController,
    AdminUsersController,
  ],
  providers: [
    AdminKycService,
    AdminPushService,
    AdminPushTemplateService,
    AdminStreakService,
    AdminCronService,
    AdminAchievementsService,
    AdminDailyService,
    AdminRewardsService,
    AdminDailyDashboardService,
    PushSchedulerService,
    AdminLeaderboardService,
    AdminTicketsService,
    AdminTransactionsService,
    AdminUsersService,
  ],
})
export class AdminModule {}
