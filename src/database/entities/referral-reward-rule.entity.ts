import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** What the invited friend has to do before the referrer is paid. */
export type ReferralTrigger =
  | 'signup'
  | 'email_verified'
  | 'onboarding_completed'
  | 'kyc_verified'
  | 'first_withdrawal'
  | 'first_redeem'
  | 'offers_completed'
  | 'daily_checkins'
  | 'streak_reached'
  | 'withdrawals_completed'
  | 'redeems_completed'
  | 'referrals_made';

/**
 * One payable step of the referral programme. The admin adds, edits and
 * retires these freely, so the reward ladder is data, never a release.
 */
@Entity({ name: 'referral_reward_rules' })
@Index(['trigger', 'threshold'])
export class ReferralRewardRule {
  @PrimaryGeneratedColumn('uuid')
  cz_referral_rule_id: string;

  @Column({ type: 'varchar', length: 30 })
  trigger: ReferralTrigger;

  /** Only read for `offers_completed` — how many offers the friend must finish. */
  @Column({ type: 'int', default: 1 })
  threshold: number;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label: string | null;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
