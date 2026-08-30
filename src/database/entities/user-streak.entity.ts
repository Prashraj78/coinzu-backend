import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_streaks' })
export class UserStreak {
  @PrimaryColumn({ type: 'uuid' })
  cz_user_id: string;

  @Column({ type: 'int', default: 0 })
  current_day: number;

  @Column({ type: 'int', default: 0 })
  longest_day: number;

  @Column({ type: 'date', nullable: true })
  last_claimed_date: string | null;

  @Column({ type: 'date', nullable: true })
  streak_start_date: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
