import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReferralStatus = 'pending' | 'qualified';

@Entity({ name: 'referrals' })
@Index(['referrer_id'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  cz_referral_id: string;

  @Column({ type: 'uuid' })
  referrer_id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  referred_id: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ReferralStatus;

  @Column({ type: 'varchar', length: 60, nullable: true })
  tier_reached: string | null;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'timestamptz', nullable: true })
  qualified_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
