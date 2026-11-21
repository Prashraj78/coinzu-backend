import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type WithdrawalMethod = 'paypal' | 'bank' | 'crypto';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export const USDT_NETWORKS = ['BEP20', 'TRC20'] as const;
export type UsdtNetwork = (typeof USDT_NETWORKS)[number];

@Entity({ name: 'withdrawal_requests' })
@Index(['user_id', 'created_at'])
@Index('IDX_withdrawal_requests_status_created_at', ['status', 'created_at'])
@Index('IDX_withdrawal_requests_one_pending', ['user_id'], {
  unique: true,
  where: `"status" = 'pending'`,
})
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

  /** Encrypted payout details of pre-USDT requests; null on USDT rows. */
  @Column({ type: 'text', nullable: true })
  destination_details_encrypted: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  network: UsdtNetwork | null;

  /** Plain on purpose: admins search and copy it. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  wallet_address: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  fee_percent: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  fee_usd: string | null;

  /** What actually gets sent: amount_usd minus fee_usd. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  payout_usd: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tx_hash: string | null;

  @Column({ type: 'text', nullable: true })
  admin_note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paid_at: Date | null;

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
