import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PushButton, PushCategory } from './push-campaign.entity';

/** A saved message an admin can drop into the composer instead of retyping it. */
@Entity({ name: 'push_templates' })
@Index(['is_active', 'created_at'])
export class PushTemplate {
  @PrimaryGeneratedColumn('uuid')
  cz_push_template_id: string;

  /** How the template is listed to the admin, not shown to any user. */
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  emoji: string | null;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deep_link: string | null;

  @Column({ type: 'varchar', length: 20, default: 'announcement' })
  category: PushCategory;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  buttons: PushButton[];

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  use_count: number;

  /** Rewardtym admin id (`lt_admin_...`), not a Coinzu uuid. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  created_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
