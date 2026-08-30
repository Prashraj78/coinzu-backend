import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ReferralTrigger } from './referral-reward-rule.entity';

/**
 * One row per rule already paid for one referral. The unique index is what
 * makes the programme idempotent — a single step can never pay twice.
 */
@Entity({ name: 'referral_reward_payouts' })
@Index(['referral_id', 'rule_id'], { unique: true })
export class ReferralRewardPayout {
  @PrimaryGeneratedColumn('uuid')
  cz_referral_payout_id: string;

  @Index()
  @Column({ type: 'uuid' })
  referral_id: string;

  @Column({ type: 'uuid' })
  referrer_id: string;

  @Column({ type: 'varchar', length: 30 })
  trigger: ReferralTrigger;

  @Column({ type: 'uuid' })
  rule_id: string;

  @Column({ type: 'int' })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
