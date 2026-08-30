import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PushAudienceType =
  | 'all'
  | 'users'
  | 'country'
  | 'platform'
  | 'segment';

export type PushCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'cancelled';

/**
 * What the message is about. Everything except `transaction` and `system` is
 * opt-out-able by the user and can be held back during their quiet hours.
 */
export type PushCategory =
  | 'announcement'
  | 'promotion'
  | 'reward'
  | 'transaction'
  | 'system';

/** Categories a user is never allowed to mute — they are not marketing. */
export const ALWAYS_DELIVER: PushCategory[] = ['transaction', 'system'];

export type PushPriority = 'high' | 'normal';

/** A tappable action under the notification. FCM allows a small number. */
export interface PushButton {
  id: string;
  label: string;
  deep_link?: string | null;
}

/** Everything an admin can narrow a send by. Empty arrays mean "no filter". */
export interface PushAudience {
  cz_user_ids?: string[];
  countries?: string[];
  platforms?: Array<'ios' | 'android' | 'web'>;
  statuses?: string[];
  kyc_statuses?: string[];
  tiers?: string[];
  /** Only users who have earned at least this many coins, lifetime. */
  min_coins?: number;
}

@Entity({ name: 'push_campaigns' })
@Index(['status', 'created_at'])
export class PushCampaign {
  @PrimaryGeneratedColumn('uuid')
  cz_push_campaign_id: string;

  /** Shown before the title on the device. Kept separate so it stays editable. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  emoji: string | null;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  /** Where the app navigates when the notification is tapped. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  deep_link: string | null;

  @Column({ type: 'varchar', length: 20, default: 'announcement' })
  category: PushCategory;

  @Column({ type: 'uuid', nullable: true })
  cz_push_template_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'all' })
  audience_type: PushAudienceType;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  audience: PushAudience;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: PushCampaignStatus;

  /** When the scheduler should run it. Null means it was sent by hand. */
  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'boolean', default: true })
  respect_quiet_hours: boolean;

  @Column({ type: 'varchar', length: 10, default: 'high' })
  priority: PushPriority;

  /** How long FCM keeps trying an offline device, in seconds. */
  @Column({ type: 'int', nullable: true })
  ttl_seconds: number | null;

  /** Later messages with the same key replace an undelivered earlier one. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  collapse_key: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  android_channel_id: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sound: string | null;

  /** iOS app-icon badge number. */
  @Column({ type: 'int', nullable: true })
  badge: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  buttons: PushButton[];

  @Column({ type: 'int', default: 0 })
  targeted_users: number;

  @Column({ type: 'int', default: 0 })
  targeted_devices: number;

  @Column({ type: 'int', default: 0 })
  sent_count: number;

  @Column({ type: 'int', default: 0 })
  failed_count: number;

  /** Confirmed by the app, unlike sent_count which is only FCM's acceptance. */
  @Column({ type: 'int', default: 0 })
  delivered_count: number;

  @Column({ type: 'int', default: 0 })
  opened_count: number;

  @Column({ type: 'int', default: 0 })
  clicked_count: number;

  /** Users left out because they muted this category. */
  @Column({ type: 'int', default: 0 })
  skipped_muted: number;

  /** Users left out because it was the middle of their night. */
  @Column({ type: 'int', default: 0 })
  skipped_quiet_hours: number;

  /** Dead tokens cleared from user_devices as a result of this send. */
  @Column({ type: 'int', default: 0 })
  pruned_tokens: number;

  /** True when Firebase was unconfigured, so nothing actually left the box. */
  @Column({ type: 'boolean', default: false })
  dry_run: boolean;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  /** Rewardtym admin id (`lt_admin_...`), not a Coinzu uuid. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  created_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
