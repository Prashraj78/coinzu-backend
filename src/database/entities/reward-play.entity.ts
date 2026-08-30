import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One instant play — a paid wheel spin today, a mystery box later. */
@Entity('reward_plays')
export class RewardPlay {
  @PrimaryGeneratedColumn('uuid')
  cz_reward_play_id: string;

  @Column({ type: 'uuid' })
  game_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  prize_id: string | null;

  @Column({ type: 'varchar', length: 60 })
  label: string;

  @Column({ type: 'int', default: 0 })
  gems_spent: number;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  @CreateDateColumn({ type: 'timestamptz' })
  played_at: Date;
}
