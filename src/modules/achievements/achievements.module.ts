import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from '../../database/entities/achievement.entity';
import { UserAchievement } from '../../database/entities/user-achievement.entity';
import { WalletTransaction } from '../../database/entities/wallet-transaction.entity';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement, WalletTransaction]),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
