import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'streak_reward_configs' })
export class StreakRewardConfig {
  @PrimaryGeneratedColumn('uuid')
  cz_streak_reward_config_id: string;

  /** 1 to 30. The board is a fixed cycle, so this is also its position. */
  @Index({ unique: true })
  @Column({ type: 'int' })
  day_number: number;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  /** What the app prints on the tile, e.g. "Token" or "Big day". */
  @Column({ type: 'varchar', length: 40, nullable: true })
  label: string | null;

  /** Drawn with the gold border on the board. Days 7, 14, 21, 28 and 30. */
  @Column({ type: 'boolean', default: false })
  is_milestone: boolean;
}
