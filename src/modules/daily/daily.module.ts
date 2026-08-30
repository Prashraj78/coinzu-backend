import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyChallenge } from '../../database/entities/daily-challenge.entity';
import { UserChallengeProgress } from '../../database/entities/user-challenge-progress.entity';
import { DailyCheckin } from '../../database/entities/daily-checkin.entity';
import { UserStreak } from '../../database/entities/user-streak.entity';
import { StreakRewardConfig } from '../../database/entities/streak-reward-config.entity';
import { DailyChestClaim } from '../../database/entities/daily-chest-claim.entity';
import { ScratchCardGrant } from '../../database/entities/scratch-card-grant.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { SpinHistory } from '../../database/entities/spin-history.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { DailyController } from './daily.controller';
import { ChallengesService } from './challenges.service';
import { StreakService } from './streak.service';
import { ChallengeBoardService } from './challenge-board.service';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyChallenge,
      UserChallengeProgress,
      DailyCheckin,
      UserStreak,
      StreakRewardConfig,
      DailyChestClaim,
      ScratchCardGrant,
      Quiz,
      SpinHistory,
    ]),
    WalletModule,
    AchievementsModule,
    ReferralsModule,
  ],
  controllers: [DailyController],
  providers: [ChallengesService, StreakService, ChallengeBoardService],
  exports: [ChallengesService, StreakService, ChallengeBoardService],
})
export class DailyModule {}
