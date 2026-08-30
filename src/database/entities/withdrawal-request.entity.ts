import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type WithdrawalMethod = 'paypal' | 'bank' | 'crypto';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

@Entity({ name: 'withdrawal_requests' })
@Index(['user_id', 'created_at'])
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  cz_withdrawal_request_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'int' })
  amount_coins: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount_usd: string;

  @Column({ type: 'varchar', length: 20 })
  method: WithdrawalMethod;

  /** Encrypted at rest — payout account details. */
  @Column({ type: 'text' })
  destination_details_encrypted: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: WithdrawalStatus;

  /** Rewardtym admin id (`lt_admin_...`), not a Coinzu uuid. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
