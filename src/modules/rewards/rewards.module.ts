import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardGame } from '../../database/entities/reward-game.entity';
import { RewardPrize } from '../../database/entities/reward-prize.entity';
import { RewardPayoutRule } from '../../database/entities/reward-payout-rule.entity';
import { RewardPlay } from '../../database/entities/reward-play.entity';
import { LuckyDraw } from '../../database/entities/lucky-draw.entity';
import { LuckyDrawEntry } from '../../database/entities/lucky-draw-entry.entity';
import { LuckyDrawWinner } from '../../database/entities/lucky-draw-winner.entity';
import { User } from '../../database/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronModule } from '../cron/cron.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { RewardDrawScheduler } from './reward-draw.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardGame,
      RewardPrize,
      RewardPayoutRule,
      RewardPlay,
      LuckyDraw,
      LuckyDrawEntry,
      LuckyDrawWinner,
      User,
    ]),
    WalletModule,
    AchievementsModule,
    NotificationsModule,
    CronModule,
  ],
  controllers: [RewardsController],
  providers: [RewardsService, RewardDrawScheduler],
  exports: [RewardsService, RewardDrawScheduler],
})
export class RewardsModule {}
