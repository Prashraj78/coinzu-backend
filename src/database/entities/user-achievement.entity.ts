import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_achievements' })
@Index(['user_id', 'achievement_id'], { unique: true })
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  cz_user_achievement_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  achievement_id: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'timestamptz', nullable: true })
  unlocked_at: Date | null;
}
