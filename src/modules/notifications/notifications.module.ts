import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { PushCampaign } from '../../database/entities/push-campaign.entity';
import { PushCampaignEvent } from '../../database/entities/push-campaign-event.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushCampaign, PushCampaignEvent])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
