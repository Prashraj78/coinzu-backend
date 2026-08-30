import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type OfferwallPostbackStatus =
  | 'credited'
  | 'reversed'
  | 'duplicate'
  | 'invalid_secret'
  | 'user_not_found'
  | 'invalid_payload';

/**
 * Audit ledger of every hit to a partner's postback URL, success or not.
 * A `credited` row is also the user-visible offerwall history entry.
 */
@Entity({ name: 'offerwall_postbacks' })
@Index(['partner_id', 'external_transaction_id'], { unique: true })
export class OfferwallPostback {
  @PrimaryGeneratedColumn('uuid')
  cz_offerwall_postback_id: string;

  @Column({ type: 'uuid' })
  partner_id: string;

  /** Snapshot at the time of the hit, so history reads fine after a rename. */
  @Column({ type: 'varchar', length: 120 })
  partner_name: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 120 })
  external_transaction_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  offer_name: string | null;

  @Column({ type: 'int', default: 0 })
  coins_credited: number;

  @Column({ type: 'varchar', length: 20 })
  status: OfferwallPostbackStatus;

  @Column({ type: 'uuid', nullable: true })
  wallet_transaction_id: string | null;

  @Column({ type: 'jsonb' })
  raw_payload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
