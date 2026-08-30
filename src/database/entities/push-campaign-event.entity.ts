import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type PushEvent = 'delivered' | 'opened' | 'clicked';

/**
 * What the app reports back about a notification. Unique per campaign, user and
 * event, so an app retrying its report can never inflate a rate.
 */
@Entity({ name: 'push_campaign_events' })
@Index(['cz_push_campaign_id', 'user_id', 'event'], { unique: true })
export class PushCampaignEvent {
  @PrimaryGeneratedColumn('uuid')
  cz_push_event_id: string;

  @Column({ type: 'uuid' })
  cz_push_campaign_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  event: PushEvent;

  /** Which action button was tapped, when the event is `clicked`. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  button_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
