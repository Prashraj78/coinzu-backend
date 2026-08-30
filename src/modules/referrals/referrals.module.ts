import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referral } from '../../database/entities/referral.entity';
import { ReferralTierConfig } from '../../database/entities/referral-tier-config.entity';
import { ReferralRewardRule } from '../../database/entities/referral-reward-rule.entity';
import { ReferralRewardPayout } from '../../database/entities/referral-reward-payout.entity';
import { User } from '../../database/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { ReferralRulesService } from './referral-rules.service';

@Module({
  imports: [AchievementsModule, 
    TypeOrmModule.forFeature([
      Referral,
      ReferralTierConfig,
      ReferralRewardRule,
      ReferralRewardPayout,
      User,
    ]),
    forwardRef(() => WalletModule),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService, ReferralRulesService],
  exports: [ReferralsService, ReferralRulesService],
})
export class ReferralsModule {}
