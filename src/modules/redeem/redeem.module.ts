import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GiftCardProduct } from '../../database/entities/gift-card-product.entity';
import { GiftCardOrder } from '../../database/entities/gift-card-order.entity';
import { WalletModule } from '../wallet/wallet.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { RedeemController } from './redeem.controller';
import { RedeemService } from './redeem.service';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GiftCardProduct, GiftCardOrder]),
    WalletModule,
    AchievementsModule,
    ReferralsModule,
  ],
  controllers: [RedeemController],
  providers: [RedeemService],
  exports: [RedeemService],
})
export class RedeemModule {}
