import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDevice } from '../../database/entities/user-device.entity';
import { WalletTransaction } from '../../database/entities/wallet-transaction.entity';
import { User } from '../../database/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { CoinzuOffersController } from './coinzu-offers.controller';
import { CoinzuOffersService } from './coinzu-offers.service';
import { RewardtymPostbackService } from './rewardtym-postback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDevice, WalletTransaction, User]),
    WalletModule,
  ],
  controllers: [CoinzuOffersController],
  providers: [CoinzuOffersService, RewardtymPostbackService],
})
export class CoinzuOffersModule {}
