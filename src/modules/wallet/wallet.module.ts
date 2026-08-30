import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsModule } from '../referrals/referrals.module';
import { Wallet } from '../../database/entities/wallet.entity';
import { WalletTransaction } from '../../database/entities/wallet-transaction.entity';
import { WithdrawalRequest } from '../../database/entities/withdrawal-request.entity';
import { User } from '../../database/entities/user.entity';
import { AchievementsModule } from '../achievements/achievements.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WithdrawalService } from './withdrawal.service';

@Module({
  imports: [
    forwardRef(() => AchievementsModule),
    TypeOrmModule.forFeature([
      Wallet,
      WalletTransaction,
      WithdrawalRequest,
      User,
    ]),
    forwardRef(() => ReferralsModule),
  ],
  controllers: [WalletController],
  providers: [WalletService, WithdrawalService],
  exports: [WalletService, WithdrawalService],
})
export class WalletModule {}
