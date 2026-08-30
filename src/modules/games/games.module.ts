import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpinWheelConfig } from '../../database/entities/spin-wheel-config.entity';
import { SpinHistory } from '../../database/entities/spin-history.entity';
import { Quiz } from '../../database/entities/quiz.entity';
import { QuizAttempt } from '../../database/entities/quiz-attempt.entity';
import { UserAchievement } from '../../database/entities/user-achievement.entity';
import { ScratchCardGrant } from '../../database/entities/scratch-card-grant.entity';
import { ScratchCard } from '../../database/entities/scratch-card.entity';
import { ScratchHistory } from '../../database/entities/scratch-history.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { DailyModule } from '../daily/daily.module';
import { GamesController } from './games.controller';
import { SpinService } from './spin.service';
import { QuizService } from './quiz.service';
import { ScratchService } from './scratch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAchievement,
      ScratchCardGrant,
      SpinWheelConfig,
      SpinHistory,
      Quiz,
      QuizAttempt,
      ScratchCard,
      ScratchHistory,
    ]),
    WalletModule,
    AchievementsModule,
    DailyModule,
  ],
  controllers: [GamesController],
  providers: [SpinService, QuizService, ScratchService],
  exports: [SpinService, QuizService, ScratchService],
})
export class GamesModule {}
