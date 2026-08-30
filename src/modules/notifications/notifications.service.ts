import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { PushCampaign } from '../../database/entities/push-campaign.entity';
import { PushCampaignEvent } from '../../database/entities/push-campaign-event.entity';
import { CzNotificationErrorCodes } from '../../common/errors/error.constants';
import { ReportPushEventDto } from './dto/push-event.dto';
import { toSkipTake } from '../../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(PushCampaignEvent)
    private readonly events: Repository<PushCampaignEvent>,
    @InjectRepository(PushCampaign)
    private readonly campaigns: Repository<PushCampaign>,
  ) {}

  /**
   * Records that a push landed, was opened, or had a button tapped. The unique
   * index makes a repeat a no-op, so an app that retries cannot inflate a rate.
   */
  async reportPushEvent(user_id: string, dto: ReportPushEventDto) {
    const campaign = await this.campaigns.findOne({
      where: { cz_push_campaign_id: dto.cz_push_campaign_id },
      select: { cz_push_campaign_id: true },
    });
    if (!campaign) {
      throw new NotFoundException({
        cz_error_code: CzNotificationErrorCodes.NOTIFICATION_NOT_FOUND,
      });
    }

    const insert = await this.events
      .createQueryBuilder()
      .insert()
      .values({
        cz_push_campaign_id: dto.cz_push_campaign_id,
        user_id,
        event: dto.event,
        button_id: dto.button_id ?? null,
      })
      .orIgnore()
      .execute();

    const counted = (insert.raw as unknown[]).length > 0;
    if (counted) {
      const column = `${dto.event === 'clicked' ? 'clicked' : dto.event}_count`;
      await this.campaigns.increment(
        { cz_push_campaign_id: dto.cz_push_campaign_id },
        column,
        1,
      );
    }
    return { recorded: true, counted };
  }

  /** Called by other modules whenever something worth telling the user happens. */
  async push(
    user_id: string | null,
    title: string,
    body: string,
  ): Promise<Notification> {
    const notification = this.notifications.create({
      user_id,
      title,
      body,
      type: 'in_app',
    });
    return this.notifications.save(notification);
  }

  /** Returns the user's own notifications plus every broadcast. */
  async listForUser(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [[data, total], unread_count] = await Promise.all([
      this.notifications.findAndCount({
        where: [{ user_id }, { user_id: IsNull() }],
        order: { created_at: 'DESC' },
        skip,
        take,
      }),
      this.countUnread(user_id),
    ]);
    // Folded in so the bell badge needs no second call.
    return { data, total, unread_count };
  }

  countUnread(user_id: string): Promise<number> {
    return this.notifications.count({
      where: [
        { user_id, read_at: IsNull() },
        { user_id: IsNull(), read_at: IsNull() },
      ],
    });
  }

  async markRead(
    notification_id: string,
    user_id: string,
  ): Promise<Notification> {
    const notification = await this.notifications.findOne({
      where: { cz_notification_id: notification_id },
    });
    if (!notification || (notification.user_id && notification.user_id !== user_id)) {
      throw new NotFoundException({
        cz_error_code: CzNotificationErrorCodes.NOTIFICATION_NOT_FOUND,
      });
    }
    notification.read_at = new Date();
    await this.notifications.update(notification_id, {
      read_at: notification.read_at,
    });
    return notification;
  }
}
