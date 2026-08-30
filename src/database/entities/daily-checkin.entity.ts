import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'daily_checkins' })
@Index(['user_id', 'date'], { unique: true })
export class DailyCheckin {
  @PrimaryGeneratedColumn('uuid')
  cz_daily_checkin_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 1 })
  streak_count: number;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
