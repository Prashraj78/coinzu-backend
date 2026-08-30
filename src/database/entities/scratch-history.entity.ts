import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'scratch_history' })
@Index(['user_id', 'played_at'])
export class ScratchHistory {
  @PrimaryGeneratedColumn('uuid')
  cz_scratch_history_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  card_id: string;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  @CreateDateColumn({ type: 'timestamptz' })
  played_at: Date;
}
