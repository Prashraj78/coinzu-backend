import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A prize ladder rung for a draw (rank 1..N), or a wheel segment when
 * `probability_weight` is set. One table, because the admin edits both the
 * same way and the dashboard reports them the same way.
 */
@Entity('reward_prizes')
export class RewardPrize {
  @PrimaryGeneratedColumn('uuid')
  cz_reward_prize_id: string;

  @Column({ type: 'uuid' })
  game_id: string;

  @Column({ type: 'int', default: 1 })
  rank: number;

  @Column({ type: 'varchar', length: 60 })
  label: string;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  /** Set on instant games only; a draw ranks its prizes instead of weighting them. */
  @Column({ type: 'float', nullable: true })
  probability_weight: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
