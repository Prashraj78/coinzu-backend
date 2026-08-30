import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** One row per user per day, written when the master chest is taken. */
@Entity({ name: 'daily_chest_claims' })
@Index(['user_id', 'date'], { unique: true })
export class DailyChestClaim {
  @PrimaryGeneratedColumn('uuid')
  cz_daily_chest_claim_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  @CreateDateColumn({ type: 'timestamptz' })
  claimed_at: Date;
}
