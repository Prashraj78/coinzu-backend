import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OfferClick } from './offer-click.entity';

export type OfferCompletionStatus = 'pending' | 'approved' | 'reversed';

@Entity({ name: 'offer_completions' })
@Index(['provider_id', 'external_transaction_id'], { unique: true })
export class OfferCompletion {
  @PrimaryGeneratedColumn('uuid')
  cz_offer_completion_id: string;

  @Column({ type: 'uuid' })
  offer_click_id: string;

  @Column({ type: 'uuid' })
  provider_id: string;

  @Column({ type: 'varchar', length: 120 })
  external_transaction_id: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  goal_id: string | null;

  @Column({ type: 'int', default: 0 })
  payout_coins: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: OfferCompletionStatus;

  /** Untouched postback body, kept for disputes. Write-only: excluded from
      reads so list queries never drag the jsonb over the wire. */
  @Column({ type: 'jsonb', select: false })
  raw_payload: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  credited_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // Read-only relation — no FK constraint is created.
  @OneToOne(() => OfferClick, (click) => click.completion, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'offer_click_id' })
  click: OfferClick;
}
