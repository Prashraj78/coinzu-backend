import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ALWAYS_DELIVER,
  PushCampaign,
  type PushAudience,
  type PushAudienceType,
  type PushButton,
  type PushCategory,
} from '../../../database/entities/push-campaign.entity';
import { PushTemplate } from '../../../database/entities/push-template.entity';
import { UserDevice } from '../../../database/entities/user-device.entity';
import { Notification } from '../../../database/entities/notification.entity';
import { CzNotificationErrorCodes } from '../../../common/errors/error.constants';
import { toSkipTake } from '../../../common/utils/pagination.util';
import { FirebasePushExternal } from '../../../external/firebase-push.external';
import { SettingsService } from '../../settings/settings.service';
import { SettingKeys } from '../../settings/setting.keys';
import { AdminListPushDto } from '../../notifications/dto/admin-list-push.dto';
import { CreatePushDto } from '../../notifications/dto/create-push.dto';
import { PreviewAudienceDto } from '../../notifications/dto/preview-audience.dto';
import { TestPushDto } from '../../notifications/dto/test-push.dto';

/** In-app rows are written in chunks so one big send cannot blow up a statement. */
const INSERT_CHUNK = 1000;

interface TargetRow {
  user_id: string;
  push_token: string;
}

@Injectable()
export class AdminPushService {
  private readonly logger = new Logger(AdminPushService.name);

  constructor(
    @InjectRepository(PushCampaign)
    private readonly campaigns: Repository<PushCampaign>,
    @InjectRepository(PushTemplate)
    private readonly templates: Repository<PushTemplate>,
    @InjectRepository(UserDevice)
    private readonly devices: Repository<UserDevice>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly push: FirebasePushExternal,
    private readonly settings: SettingsService,
  ) {}

  /* ------------------------------------------------------------- audience */

  /** The platform-wide window, as two hours of the user's own day. */
  private async quietHours(): Promise<{ start: number; end: number }> {
    const [start, end] = await Promise.all([
      this.settings.getNumber(SettingKeys.PUSH_QUIET_HOURS_START),
      this.settings.getNumber(SettingKeys.PUSH_QUIET_HOURS_END),
    ]);
    return { start, end };
  }

  /**
   * Every filter is an AND, and each is skipped when empty. `all` therefore
   * falls out naturally: no filters means every device with a live token.
   */
  private audienceQuery(audience: PushAudience): SelectQueryBuilder<UserDevice> {
    const b = this.devices
      .createQueryBuilder('d')
      .innerJoin('users', 'u', 'u.cz_user_id = d.cz_user_id')
      .where('d.push_token IS NOT NULL')
      .andWhere("d.push_token <> ''")
      // A banned or deleted account never gets a push, whatever the filters say.
      .andWhere('u.status = :active', { active: 'active' });

    if (audience.cz_user_ids?.length) {
      b.andWhere('d.cz_user_id IN (:...ids)', { ids: audience.cz_user_ids });
    }
    if (audience.countries?.length) {
      // Fall back to the device's own geo when the profile has no country.
      b.andWhere('COALESCE(u.country, d.country_code) IN (:...countries)', {
        countries: audience.countries,
      });
    }
    if (audience.platforms?.length) {
      b.andWhere('d.platform_type IN (:...platforms)', {
        platforms: audience.platforms,
      });
    }
    if (audience.statuses?.length) {
      b.andWhere('u.status IN (:...statuses)', { statuses: audience.statuses });
    }
    if (audience.kyc_statuses?.length) {
      b.andWhere('u.kyc_status IN (:...kyc)', { kyc: audience.kyc_statuses });
    }
    if (audience.tiers?.length) {
      b.andWhere('u.tier IN (:...tiers)', { tiers: audience.tiers });
    }
    if (audience.min_coins !== undefined) {
      b.andWhere(
        `d.cz_user_id IN (
           SELECT t.user_id FROM wallet_transactions t
           WHERE t.currency = 'coin' AND t.type = 'earn'
           GROUP BY t.user_id HAVING SUM(t.amount) >= :min_coins
         )`,
        { min_coins: audience.min_coins },
      );
    }
    return b;
  }

  /** Drops anyone who muted this category. Transactional mail ignores it. */
  private applyConsent(
    b: SelectQueryBuilder<UserDevice>,
    category: PushCategory,
  ): void {
    if (ALWAYS_DELIVER.includes(category)) return;
    b.andWhere(
      `COALESCE((u.notification_preferences ->> :category)::boolean, true) = true`,
      { category },
    );
  }

  /**
   * Drops anyone whose own clock is inside the quiet window. The device's
   * reported IANA timezone is the source; a device that never sent one is
   * treated as UTC.
   */
  private applyQuietHours(
    b: SelectQueryBuilder<UserDevice>,
    start: number,
    end: number,
  ): void {
    if (start === end) return;
    const localHour = `EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(NULLIF(d.device_info ->> 'timezone', ''), 'UTC')))`;
    // A window that wraps midnight (22 to 8) is the union of two ranges.
    const inside =
      start < end
        ? `${localHour} >= :qs AND ${localHour} < :qe`
        : `${localHour} >= :qs OR ${localHour} < :qe`;
    b.andWhere(
      `(COALESCE((u.notification_preferences ->> 'quiet_hours')::boolean, true) = false OR NOT (${inside}))`,
      { qs: start, qe: end },
    );
  }

  /** How many people and devices a send would reach, without sending anything. */
  async previewAudience(dto: PreviewAudienceDto) {
    const audience = this.normalise(dto);
    const category = dto.category ?? 'announcement';
    // A payout or a security notice is never held back for the hour.
    const quiet =
      dto.respect_quiet_hours !== false && !ALWAYS_DELIVER.includes(category);
    const { start, end } = await this.quietHours();

    const build = (withConsent: boolean, withQuiet: boolean) => {
      const b = this.audienceQuery(audience);
      if (withConsent) this.applyConsent(b, category);
      if (withQuiet && quiet) this.applyQuietHours(b, start, end);
      return b;
    };

    const count = async (b: SelectQueryBuilder<UserDevice>) => {
      const row = await b
        .select('COUNT(DISTINCT d.cz_user_id)', 'users')
        .addSelect('COUNT(*)', 'devices')
        .getRawOne<{ users: string; devices: string }>();
      return {
        users: Number(row?.users ?? 0),
        devices: Number(row?.devices ?? 0),
      };
    };

    const [raw, afterConsent, final, byPlatform] = await Promise.all([
      count(build(false, false)),
      count(build(true, false)),
      count(build(true, true)),
      build(true, true)
        .select('d.platform_type', 'platform')
        .addSelect('COUNT(*)', 'devices')
        .groupBy('d.platform_type')
        .getRawMany<{ platform: string; devices: string }>(),
    ]);

    return {
      targeted_users: final.users,
      targeted_devices: final.devices,
      matched_users: raw.users,
      skipped_muted: raw.users - afterConsent.users,
      skipped_quiet_hours: afterConsent.users - final.users,
      by_platform: byPlatform.map((r) => ({
        platform: r.platform,
        devices: Number(r.devices),
      })),
      category,
      quiet_hours: { start, end, applied: quiet && start !== end },
      firebase_configured: this.push.isConfigured,
    };
  }

  /** Strips empty arrays so a stored audience says only what it means. */
  private normalise(dto: PreviewAudienceDto | CreatePushDto): PushAudience {
    const out: PushAudience = {};
    if (dto.cz_user_ids?.length) out.cz_user_ids = dto.cz_user_ids;
    if (dto.countries?.length) out.countries = dto.countries.map((c) => c.toUpperCase());
    if (dto.platforms?.length) out.platforms = dto.platforms;
    if (dto.statuses?.length) out.statuses = dto.statuses;
    if (dto.kyc_statuses?.length) out.kyc_statuses = dto.kyc_statuses;
    if (dto.tiers?.length) out.tiers = dto.tiers;
    if (dto.min_coins !== undefined) out.min_coins = dto.min_coins;
    return out;
  }

  /** A label for the list screen, derived from what was actually filtered. */
  private audienceType(a: PushAudience): PushAudienceType {
    const keys = Object.keys(a);
    if (!keys.length) return 'all';
    if (keys.length === 1) {
      if (a.cz_user_ids) return 'users';
      if (a.countries) return 'country';
      if (a.platforms) return 'platform';
    }
    return 'segment';
  }

  /* ----------------------------------------------------------------- send */

  async createAndSend(dto: CreatePushDto, admin_id: string | null) {
    const audience = this.normalise(dto);
    const scheduled = dto.scheduled_at ? new Date(dto.scheduled_at) : null;
    const isScheduled = Boolean(scheduled && scheduled.getTime() > Date.now());

    const campaign = await this.campaigns.save(
      this.campaigns.create({
        emoji: dto.emoji ?? null,
        title: dto.title,
        body: dto.body,
        image_url: dto.image_url ?? null,
        deep_link: dto.deep_link ?? null,
        category: dto.category ?? 'announcement',
        cz_push_template_id: dto.cz_push_template_id ?? null,
        buttons: (dto.buttons ?? []) as PushButton[],
        priority: dto.priority ?? 'high',
        ttl_seconds: dto.ttl_seconds ?? null,
        collapse_key: dto.collapse_key ?? null,
        android_channel_id: dto.android_channel_id ?? null,
        sound: dto.sound ?? null,
        badge: dto.badge ?? null,
        respect_quiet_hours: dto.respect_quiet_hours !== false,
        audience,
        audience_type: this.audienceType(audience),
        scheduled_at: isScheduled ? scheduled : null,
        status: isScheduled ? 'scheduled' : dto.send_now === false ? 'draft' : 'sending',
        created_by: admin_id,
      }),
    );

    if (dto.cz_push_template_id) {
      await this.templates.increment(
        { cz_push_template_id: dto.cz_push_template_id },
        'use_count',
        1,
      );
    }

    if (isScheduled || dto.send_now === false) {
      return this.detail(campaign.cz_push_campaign_id);
    }
    return this.send(campaign.cz_push_campaign_id);
  }

  /** Resolves the audience, pushes, mirrors in-app, prunes dead tokens. */
  async send(cz_push_campaign_id: string) {
    const campaign = await this.getOrFail(cz_push_campaign_id);
    const { start, end } = await this.quietHours();

    const b = this.audienceQuery(campaign.audience);
    this.applyConsent(b, campaign.category);
    if (campaign.respect_quiet_hours && !ALWAYS_DELIVER.includes(campaign.category)) {
      this.applyQuietHours(b, start, end);
    }

    const targets = await b
      .select('d.cz_user_id', 'user_id')
      .addSelect('d.push_token', 'push_token')
      .getRawMany<TargetRow>();

    const tokens = [...new Set(targets.map((t) => t.push_token))];
    const userIds = [...new Set(targets.map((t) => t.user_id))];

    const reach = await this.previewAudience({
      ...campaign.audience,
      category: campaign.category,
      respect_quiet_hours: campaign.respect_quiet_hours,
    });

    campaign.status = 'sending';
    campaign.targeted_users = userIds.length;
    campaign.targeted_devices = tokens.length;
    campaign.skipped_muted = reach.skipped_muted;
    campaign.skipped_quiet_hours = reach.skipped_quiet_hours;
    await this.campaigns.save(campaign);

    try {
      const result = await this.push.sendToTokens(tokens, this.toMessage(campaign));

      // Everyone targeted gets an in-app copy, so the message survives a
      // dismissed banner and shows up in the notification feed.
      await this.writeInApp(userIds, campaign);

      const pruned = result.invalid_tokens.length
        ? await this.pruneTokens(result.invalid_tokens)
        : 0;

      campaign.sent_count = result.sent;
      campaign.failed_count = result.failed;
      campaign.pruned_tokens = pruned;
      campaign.dry_run = result.dry_run;
      campaign.sent_at = new Date();
      campaign.status = result.dry_run
        ? 'sent'
        : result.failed === 0
          ? 'sent'
          : result.sent > 0
            ? 'partial'
            : 'failed';
      campaign.error = null;
      await this.campaigns.save(campaign);
    } catch (error) {
      campaign.status = 'failed';
      campaign.error = String(error);
      await this.campaigns.save(campaign);
      this.logger.error(`Push campaign ${campaign.cz_push_campaign_id} failed: ${String(error)}`);
    }

    return this.detail(campaign.cz_push_campaign_id);
  }

  /** The device payload. Emoji is joined onto the title here, not stored joined. */
  private toMessage(c: PushCampaign) {
    return {
      title: c.emoji ? `${c.emoji} ${c.title}` : c.title,
      body: c.body,
      image_url: c.image_url,
      deep_link: c.deep_link,
      priority: c.priority,
      ttl_seconds: c.ttl_seconds,
      collapse_key: c.collapse_key,
      android_channel_id: c.android_channel_id,
      sound: c.sound,
      badge: c.badge,
      data: {
        campaign_id: c.cz_push_campaign_id,
        category: c.category,
        ...(c.buttons.length ? { buttons: JSON.stringify(c.buttons) } : {}),
      },
    };
  }

  /** A real send to a few named accounts, with nothing recorded as a campaign. */
  async testSend(dto: TestPushDto) {
    const targets = await this.audienceQuery({ cz_user_ids: dto.cz_user_ids })
      .select('d.cz_user_id', 'user_id')
      .addSelect('d.push_token', 'push_token')
      .getRawMany<TargetRow>();

    const tokens = [...new Set(targets.map((t) => t.push_token))];
    const result = await this.push.sendToTokens(tokens, {
      title: dto.emoji ? `${dto.emoji} ${dto.title}` : dto.title,
      body: dto.body,
      image_url: dto.image_url,
      deep_link: dto.deep_link,
      priority: dto.priority,
      ttl_seconds: dto.ttl_seconds,
      collapse_key: dto.collapse_key,
      android_channel_id: dto.android_channel_id,
      sound: dto.sound,
      badge: dto.badge,
      data: { test: 'true' },
    });

    return {
      targeted_users: new Set(targets.map((t) => t.user_id)).size,
      targeted_devices: tokens.length,
      sent_count: result.sent,
      failed_count: result.failed,
      dry_run: result.dry_run,
      // A test never writes an in-app row, so it cannot pollute a real feed.
      users_without_a_device: dto.cz_user_ids.filter(
        (id) => !targets.some((t) => t.user_id === id),
      ),
    };
  }

  private async writeInApp(userIds: string[], campaign: PushCampaign) {
    const title = campaign.emoji
      ? `${campaign.emoji} ${campaign.title}`
      : campaign.title;
    for (let i = 0; i < userIds.length; i += INSERT_CHUNK) {
      const chunk = userIds.slice(i, i + INSERT_CHUNK);
      await this.notifications.insert(
        chunk.map((user_id) => ({
          user_id,
          title,
          body: campaign.body,
          type: 'push' as const,
        })),
      );
    }
  }

  /** A token FCM rejects as dead is cleared so it is never tried again. */
  private async pruneTokens(tokens: string[]): Promise<number> {
    const res = await this.devices.update(
      { push_token: In(tokens) },
      { push_token: null },
    );
    return res.affected ?? 0;
  }

  /* -------------------------------------------------------------- workflow */

  /** Stops a campaign that has not gone out. Anything sent is already gone. */
  async cancel(cz_push_campaign_id: string) {
    const campaign = await this.getOrFail(cz_push_campaign_id);
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new ConflictException({
        cz_error_code: CzNotificationErrorCodes.CAMPAIGN_NOT_CANCELLABLE,
      });
    }
    campaign.status = 'cancelled';
    campaign.scheduled_at = null;
    await this.campaigns.save(campaign);
    return this.detail(cz_push_campaign_id);
  }

  /** Copies a campaign into a fresh draft so a good send can be reused. */
  async duplicate(cz_push_campaign_id: string, admin_id: string | null) {
    const source = await this.getOrFail(cz_push_campaign_id);
    const copy = await this.campaigns.save(
      this.campaigns.create({
        emoji: source.emoji,
        title: source.title,
        body: source.body,
        image_url: source.image_url,
        deep_link: source.deep_link,
        category: source.category,
        cz_push_template_id: source.cz_push_template_id,
        buttons: source.buttons,
        priority: source.priority,
        ttl_seconds: source.ttl_seconds,
        collapse_key: source.collapse_key,
        android_channel_id: source.android_channel_id,
        sound: source.sound,
        badge: source.badge,
        respect_quiet_hours: source.respect_quiet_hours,
        audience: source.audience,
        audience_type: source.audience_type,
        status: 'draft',
        created_by: admin_id,
      }),
    );
    return this.detail(copy.cz_push_campaign_id);
  }

  /** Campaigns whose scheduled moment has arrived. Used by the dispatcher. */
  async dueCampaigns(): Promise<PushCampaign[]> {
    return this.campaigns.find({
      where: { status: 'scheduled', scheduled_at: LessThanOrEqual(new Date()) },
      order: { scheduled_at: 'ASC' },
      take: 20,
    });
  }

  /* ----------------------------------------------------------------- read */

  async list(query: AdminListPushDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const b = this.campaigns
      .createQueryBuilder('c')
      .orderBy('c.created_at', 'DESC')
      .skip(skip)
      .take(take);

    if (query.status) b.andWhere('c.status = :status', { status: query.status });
    if (query.audience_type) {
      b.andWhere('c.audience_type = :at', { at: query.audience_type });
    }
    if (query.category) {
      b.andWhere('c.category = :cat', { cat: query.category });
    }
    if (query.search) {
      b.andWhere('(c.title ILIKE :s OR c.body ILIKE :s)', { s: `%${query.search}%` });
    }
    if (query.date_from) {
      b.andWhere('c.created_at >= :df', { df: query.date_from });
    }
    if (query.date_end) {
      b.andWhere("c.created_at < (:de::date + interval '1 day')", { de: query.date_end });
    }

    const [data, total] = await b.getManyAndCount();

    const totals = await this.campaigns
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.sent_count), 0)', 'sent')
      .addSelect('COALESCE(SUM(c.failed_count), 0)', 'failed')
      .addSelect('COALESCE(SUM(c.opened_count), 0)', 'opened')
      .addSelect('COALESCE(SUM(c.clicked_count), 0)', 'clicked')
      .addSelect('COUNT(*)', 'campaigns')
      .addSelect(
        `COUNT(*) FILTER (WHERE c.status = 'scheduled')`,
        'scheduled',
      )
      .getRawOne<Record<string, string>>();

    const sent = Number(totals?.sent ?? 0);
    return {
      data,
      total,
      summary: {
        campaigns: Number(totals?.campaigns ?? 0),
        scheduled: Number(totals?.scheduled ?? 0),
        total_sent: sent,
        total_failed: Number(totals?.failed ?? 0),
        total_opened: Number(totals?.opened ?? 0),
        total_clicked: Number(totals?.clicked ?? 0),
        open_rate: sent ? Number(((Number(totals?.opened ?? 0) / sent) * 100).toFixed(1)) : 0,
        firebase_configured: this.push.isConfigured,
      },
    };
  }

  async detail(cz_push_campaign_id: string) {
    const campaign = await this.getOrFail(cz_push_campaign_id);
    // Re-resolving shows how the same audience looks *now*, which is what an
    // admin wants when deciding whether to resend.
    const current = await this.previewAudience({
      ...campaign.audience,
      category: campaign.category,
      respect_quiet_hours: campaign.respect_quiet_hours,
    });
    return { campaign, audience_now: current };
  }

  private async getOrFail(id: string): Promise<PushCampaign> {
    const campaign = await this.campaigns.findOne({
      where: { cz_push_campaign_id: id },
    });
    if (!campaign) {
      throw new NotFoundException({
        cz_error_code: CzNotificationErrorCodes.NOTIFICATION_NOT_FOUND,
      });
    }
    return campaign;
  }
}
