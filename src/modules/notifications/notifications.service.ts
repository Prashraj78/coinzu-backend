import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';
import { PushCampaign } from '../../database/entities/push-campaign.entity';
import { PushCampaignEvent } from '../../database/entities/push-campaign-event.entity';
import { UserDevice } from '../../database/entities/user-device.entity';
import { User } from '../../database/entities/user.entity';
import { CzNotificationErrorCodes } from '../../common/errors/error.constants';
import { FirebasePushExternal } from '../../external/firebase-push.external';
import { ReportPushEventDto } from './dto/push-event.dto';
import { toSkipTake } from '../../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(PushCampaignEvent)
    private readonly events: Repository<PushCampaignEvent>,
    @InjectRepository(PushCampaign)
    private readonly campaigns: Repository<PushCampaign>,
    @InjectRepository(UserDevice)
    private readonly devices: Repository<UserDevice>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly firebasePush: FirebasePushExternal,
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

  /**
   * Called by other modules whenever something worth telling the user happens
   * (an offer credited, a withdrawal submitted). Always writes the in-app row,
   * then fires a real device push to the user's registered devices. The push is
   * best-effort: a Firebase failure never breaks the action that credited the
   * user. A null user_id is a broadcast — in-app only, no device push.
   */
  async push(
    user_id: string | null,
    title: string,
    body: string,
    deep_link?: string | null,
  ): Promise<Notification> {
    const notification = this.notifications.create({
      user_id,
      title,
      body,
      type: user_id ? 'push' : 'in_app',
    });
    const saved = await this.notifications.save(notification);
    if (user_id) void this.sendDevicePush(user_id, title, body, deep_link);
    return saved;
  }

  /** Resolves the user's live tokens, sends one FCM push, clears dead tokens. */
  private async sendDevicePush(
    user_id: string,
    title: string,
    body: string,
    deep_link?: string | null,
  ): Promise<void> {
    try {
      const user = await this.users.findOne({
        where: { cz_user_id: user_id },
        select: { cz_user_id: true, notifications_enabled: true },
      });
      if (!user || user.notifications_enabled === false) return;

      const rows = await this.devices.find({
        where: { cz_user_id: user_id, push_token: Not(IsNull()) },
        select: { push_token: true },
      });
      const tokens = rows
        .map((r) => r.push_token)
        .filter((t): t is string => !!t);
      if (tokens.length === 0) return;

      const result = await this.firebasePush.sendToTokens(tokens, {
        title,
        body,
        deep_link: deep_link ?? null,
      });
      if (result.invalid_tokens.length) {
        await this.devices.update(
          { push_token: In(result.invalid_tokens) },
          { push_token: null },
        );
      }
    } catch (error) {
      this.logger.warn(
        `Device push failed for user ${user_id}: ${String(error)}`,
      );
    }
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
