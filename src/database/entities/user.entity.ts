import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UserRole } from '../../common/auth/request-user.types';

export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted';
export type UserKycStatus =
  | 'none'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'manual_review';

export type UserAgeRange = '18-24' | '25-34' | '35-44' | '45-54+';
export type UserTier = 'silver' | 'gold' | 'platinum' | 'diamond';

/**
 * Push opt-outs the user controls. `false` mutes that category; anything
 * missing counts as opted in, so an untouched account receives everything.
 * `transaction` and `system` are always delivered and ignore this.
 */
export interface NotificationPreferences {
  announcement?: boolean;
  promotion?: boolean;
  reward?: boolean;
  /** Hold marketing back between the platform's quiet hours. Default on. */
  quiet_hours?: boolean;
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  cz_user_id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  // Not selected by default so a stray find() cannot leak the hash.
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password_hash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  google_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  age_range: UserAgeRange | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  interests: string[];

  @Column({ type: 'varchar', length: 60, nullable: true })
  primary_goal: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 12 })
  referral_code: string;

  @Column({ type: 'uuid', nullable: true })
  referred_by: string | null;

  @Column({ type: 'varchar', length: 20, default: 'silver' })
  tier: UserTier;

  @Column({ type: 'varchar', length: 20, default: 'none' })
  kyc_status: UserKycStatus;

  @Column({ type: 'int', default: 0 })
  profile_completion_pct: number;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: UserRole;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  onboarding_completed: boolean;

  @Column({ type: 'boolean', default: false })
  notifications_enabled: boolean;

  /** Per-category push opt-outs. A missing key means opted in. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  notification_preferences: NotificationPreferences;

  @Column({ type: 'timestamptz', nullable: true })
  email_verified_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  phone_verified_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
