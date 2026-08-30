import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from '../../database/entities/offer.entity';
import { OfferClick } from '../../database/entities/offer-click.entity';
import { OfferCompletion } from '../../database/entities/offer-completion.entity';
import { OfferwallProvider } from '../../database/entities/offerwall-provider.entity';
import { User } from '../../database/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PostbackService } from './postback.service';
import { ProvidersService } from './providers.service';
import { OfferSyncService } from './offer-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Offer,
      OfferClick,
      OfferCompletion,
      OfferwallProvider,
      User,
    ]),
    WalletModule,
    ReferralsModule,
    AchievementsModule,
  ],
  controllers: [OffersController],
  providers: [
    OffersService,
    PostbackService,
    ProvidersService,
    OfferSyncService,
  ],
  exports: [OfferSyncService, ProvidersService],
})
export class OffersModule {}
