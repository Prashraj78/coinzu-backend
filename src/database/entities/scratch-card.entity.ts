import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'scratch_cards' })
export class ScratchCard {
  @PrimaryGeneratedColumn('uuid')
  cz_scratch_card_id: string;

  @Column({ type: 'varchar', length: 60 })
  label: string;

  /** The minimum payout. With reward_coins_max set, the draw is random in range. */
  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', nullable: true })
  reward_coins_max: number | null;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  @Column({ type: 'int', nullable: true })
  reward_gems_max: number | null;

  /** Relative weight, not a percentage — the service normalizes across rows. */
  @Column({ type: 'float', default: 1 })
  probability_weight: number;

  /**
   * Only users whose rarest medal is at least this tier can win this prize.
   * Null means everyone is eligible.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  min_medal_rarity: 'common' | 'rare' | 'epic' | 'rarest' | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
