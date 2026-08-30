import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type KycStatus = 'pending' | 'verified' | 'rejected' | 'manual_review';

@Entity({ name: 'kyc_verifications' })
@Index(['user_id', 'created_at'])
export class KycVerification {
  @PrimaryGeneratedColumn('uuid')
  cz_kyc_verification_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 500 })
  selfie_url: string;

  @Column({ type: 'float', nullable: true })
  rekognition_score: number | null;

  @Column({ type: 'jsonb', nullable: true })
  rekognition_response: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: KycStatus;

  /** Machine-readable reason, so the app can pick its own wording. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  rejection_code: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  /** Rewardtym admin id (`lt_admin_...`), not a Coinzu uuid. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
