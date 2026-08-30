import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type RewardGameKind = 'instant' | 'draw';
export type RewardGameCadence = 'none' | 'daily' | 'weekly';
export type RewardGameStatus = 'live' | 'coming_soon' | 'paused';

/** One card on the Rewards screen, and everything an admin can steer about it. */
@Entity('reward_games')
export class RewardGame {
  @PrimaryGeneratedColumn('uuid')
  cz_reward_game_id: string;

  @Column({ type: 'varchar', length: 40 })
  slug: string;

  /** `instant` plays immediately; `draw` settles at the end of its period. */
  @Column({ type: 'varchar', length: 10 })
  kind: RewardGameKind;

  @Column({ type: 'varchar', length: 10, default: 'none' })
  cadence: RewardGameCadence;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon_url: string | null;

  /** The "5,000 Coins" line on the card. Display only. */
  @Column({ type: 'int', default: 0 })
  headline_prize_coins: number;

  @Column({ type: 'int', default: 0 })
  entry_cost_gems: number;

  @Column({ type: 'int', default: 1 })
  min_entries: number;

  @Column({ type: 'int', default: 250 })
  max_entries: number;

  /** Quick-pick buttons on the Buy Entries screen, e.g. [5,10,25,50,100,250]. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  entry_packs: number[];

  /** Each step shows an icon from the `reward_step_icon` dropdown type. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  how_it_works: { title: string; description?: string; icon_url?: string }[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  terms_url: string | null;

  @Column({ type: 'varchar', length: 20, default: 'live' })
  status: RewardGameStatus;

  @Column({ type: 'int', default: 0 })
  display_order: number;
}
