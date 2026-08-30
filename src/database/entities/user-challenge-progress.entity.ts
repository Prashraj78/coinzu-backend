import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ChallengeProgressStatus = 'pending' | 'completed' | 'claimed';

@Entity({ name: 'user_challenge_progress' })
@Index(['user_id', 'challenge_id', 'date'], { unique: true })
export class UserChallengeProgress {
  @PrimaryGeneratedColumn('uuid')
  cz_user_challenge_progress_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  challenge_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ChallengeProgressStatus;

  /** Counts towards the challenge's target_count. */
  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  claimed_at: Date | null;
}
