import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ChallengeType =
  | 'spin'
  | 'quiz'
  | 'scratch'
  | 'game_install'
  | 'invite'
  | 'offer'
  | 'checkin';

@Entity({ name: 'daily_challenges' })
export class DailyChallenge {
  @PrimaryGeneratedColumn('uuid')
  cz_daily_challenge_id: string;

  @Column({ type: 'varchar', length: 20 })
  type: ChallengeType;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  /** How many actions finish it — "play any 2 new games" is 2. */
  @Column({ type: 'int', default: 1 })
  target_count: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon_url: string | null;

  /** Where the tile's arrow sends the app. See ChallengeAction. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  action: string | null;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
