import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronJobLog } from '../../database/entities/cron-job-log.entity';
import { CronJobSetting } from '../../database/entities/cron-job-setting.entity';
import { Offer } from '../../database/entities/offer.entity';
import { OfferClick } from '../../database/entities/offer-click.entity';
import { OffersModule } from '../offers/offers.module';
import { DailyModule } from '../daily/daily.module';
import { RedeemModule } from '../redeem/redeem.module';
import { CronService } from './cron.service';
import { CronLogService } from './cron-log.service';
import { CronRegistryService } from './cron-registry.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([CronJobLog, CronJobSetting, Offer, OfferClick]),
    OffersModule,
    DailyModule,
    RedeemModule,
  ],
  providers: [CronService, CronLogService, CronRegistryService],
  exports: [CronLogService, CronRegistryService],
})
export class CronModule {}
