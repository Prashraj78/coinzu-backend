import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Maps a provider's own field names onto our normalized postback shape. */
export interface ProviderFieldMapping {
  click_id: string;
  payout: string;
  status: string;
  goal_id?: string;
  transaction_id: string;
  /** Provider value that means "approved", e.g. "1" or "completed". */
  approved_value?: string;
  /** Provider value that means "reversed", e.g. "2" or "chargeback". */
  reversed_value?: string;
}

/** Tracking link template plus the offer-list response shape. */
export interface ProviderMacroTemplate {
  click_url: string;
  offers_path?: string;
  /** Dot path to the offer array inside the list response, e.g. "data.offers". */
  offers_list_key?: string;
  offer_fields?: Record<string, string>;
}

@Entity({ name: 'offerwall_providers' })
export class OfferwallProvider {
  @PrimaryGeneratedColumn('uuid')
  cz_offerwall_provider_id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  /** Picks the adapter class at runtime; "generic" covers most REST providers. */
  @Column({ type: 'varchar', length: 40, default: 'generic' })
  adapter_type: string;

  @Column({ type: 'varchar', length: 500 })
  base_api_url: string;

  @Column({ type: 'text', nullable: true, select: false })
  api_key_encrypted: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  postback_secret: string | null;

  @Column({ type: 'jsonb' })
  field_mapping: ProviderFieldMapping;

  @Column({ type: 'jsonb' })
  macro_template: ProviderMacroTemplate;

  @Column({ type: 'int', default: 30 })
  sync_interval_minutes: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_synced_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
