import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type WalletCurrency = 'coin' | 'gem';

export type WalletTransactionType =
  | 'earn'
  | 'spend'
  | 'withdrawal'
  | 'convert_in'
  | 'convert_out'
  | 'reversal';

export type WalletSourceType =
  | 'offer'
  | 'daily_checkin'
  | 'referral'
  | 'game'
  | 'streak'
  | 'withdrawal'
  | 'redeem'
  | 'lucky_draw'
  | 'achievement'
  | 'challenge'
  | 'convert'
  | 'admin_adjustment'
  | 'offerwall';

@Entity({ name: 'wallet_transactions' })
@Index(['user_id', 'created_at'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  cz_wallet_transaction_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 10 })
  currency: WalletCurrency;

  @Column({ type: 'varchar', length: 20 })
  type: WalletTransactionType;

  @Column({ type: 'int' })
  amount: number;

  /** Balance snapshot right after this row was written. */
  @Column({ type: 'int' })
  balance_after: number;

  @Column({ type: 'varchar', length: 30 })
  source_type: WalletSourceType;

  @Column({ type: 'uuid', nullable: true })
  source_id: string | null;

  /** Human-readable context, e.g. "AdGate Media - Survey #42" or "Reversed by AdGate Media". */
  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
