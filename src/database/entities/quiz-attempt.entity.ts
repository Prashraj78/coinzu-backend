import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'quiz_attempts' })
@Index(['user_id', 'quiz_id'], { unique: true })
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  cz_quiz_attempt_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  quiz_id: string;

  @Column({ type: 'varchar', length: 255 })
  selected_option: string;

  @Column({ type: 'boolean' })
  is_correct: boolean;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @CreateDateColumn({ type: 'timestamptz' })
  attempted_at: Date;
}
