import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Field names the partner's own postback uses, mapped to our meaning. */
export interface OfferwallFieldMapping {
  user_id: string;
  external_transaction_id: string;
  offer_name?: string;
  /** When the offer has multiple goals, the field carrying which one was just completed. */
  milestone_name?: string;
  payout?: string;
  status?: string;
  approved_value?: string;
  reversed_value?: string;
}

export type OfferwallPostbackMethod = 'get' | 'post';
export type OfferwallPostbackAuthType = 'token' | 'hmac_sha256';

/**
 * One row per offerwall network shown to the app as a logo. Separate from
 * `offerwall_providers` (the older offer-sync catalog): this is a whole
 * hosted wall opened in an iframe, not individual synced offers.
 */
@Entity({ name: 'offerwall_partners' })
export class OfferwallPartner {
  @PrimaryGeneratedColumn('uuid')
  cz_offerwall_partner_id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  slug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Opened in the app's iframe on click. `{USER_ID}` is replaced with cz_user_id. */
  @Column({ type: 'text' })
  click_url_template: string;

  @Column({ type: 'varchar', length: 10, default: 'get' })
  postback_method: OfferwallPostbackMethod;

  @Column({ type: 'varchar', length: 20, default: 'token' })
  postback_auth_type: OfferwallPostbackAuthType;

  /** Path token (token mode) or HMAC key (hmac_sha256 mode). Never returned to the app. */
  @Column({ type: 'varchar', length: 100, select: false })
  postback_secret: string;

  @Column({ type: 'jsonb' })
  postback_field_mapping: OfferwallFieldMapping;

  @Column({ type: 'int', default: 1 })
  coins_per_payout_unit: number;

  /**
   * When the partner sends raw dollars instead of a final payout, the cut
   * we keep and pass on to the user, e.g. 50 means the user gets 50% of
   * the payout field before `coins_per_payout_unit` converts it to coins.
   * Null means the partner's payout field is already the final amount.
   */
  @Column({ type: 'int', nullable: true })
  revenue_share_percent: number | null;

  /** Higher shows first in the app's offerwall list. */
  @Column({ type: 'int', default: 0 })
  rank: number;

  /** Free-text badge, e.g. "Trending", "Featured", "New". Null shows no badge. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  badge_label: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
