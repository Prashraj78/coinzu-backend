import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * How the pot scales with turnout: the band whose floor the participant count
 * clears decides the pool and how many winners share it. This is the whole of
 * "x participants pays out y", and it is the admin's to set.
 */
@Entity('reward_payout_rules')
export class RewardPayoutRule {
  @PrimaryGeneratedColumn('uuid')
  cz_reward_payout_rule_id: string;

  @Column({ type: 'uuid' })
  game_id: string;

  /** Inclusive floor. The highest matching band wins. */
  @Column({ type: 'int', default: 0 })
  min_participants: number;

  @Column({ type: 'int', default: 0 })
  prize_pool_coins: number;

  @Column({ type: 'int', default: 1 })
  winners_count: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
