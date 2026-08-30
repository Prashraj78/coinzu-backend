import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferwallPartner } from '../../database/entities/offerwall-partner.entity';
import { OfferwallPostback } from '../../database/entities/offerwall-postback.entity';
import { User } from '../../database/entities/user.entity';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OfferwallController } from './offerwall.controller';
import { OfferwallService } from './offerwall.service';
import { OfferwallPartnersService } from './offerwall-partners.service';
import { OfferwallPostbackService } from './offerwall-postback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfferwallPartner, OfferwallPostback, User]),
    WalletModule,
    NotificationsModule,
  ],
  controllers: [OfferwallController],
  providers: [OfferwallService, OfferwallPartnersService, OfferwallPostbackService],
  exports: [OfferwallPartnersService, OfferwallPostbackService],
})
export class OfferwallModule {}
