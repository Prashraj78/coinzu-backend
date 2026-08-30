import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'rarest';

@Entity({ name: 'achievements' })
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  cz_achievement_id: string;

  /** Stable key used by seeds and by the medal artwork on R2. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60, nullable: true })
  slug: string | null;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  /** Printed next to the name on the medal detail sheet. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  emoji: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon_url: string | null;

  /** e.g. "complete_first_offer", "invite_friends", "checkin_days". */
  @Column({ type: 'varchar', length: 60 })
  criteria_type: string;

  @Column({ type: 'int', default: 1 })
  criteria_value: number;

  @Column({ type: 'int', default: 0 })
  points: number;

  /** Reading order on the medal grid. */
  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'varchar', length: 20, default: 'common' })
  rarity: AchievementRarity;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
