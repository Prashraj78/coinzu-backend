import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LuckyDraw } from './lucky-draw.entity';

@Entity({ name: 'lucky_draw_entries' })
// Entries are bought in packs, so a user has many rows per draw.
@Index(['draw_id', 'user_id'])
export class LuckyDrawEntry {
  @PrimaryGeneratedColumn('uuid')
  cz_lucky_draw_entry_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  draw_id: string;

  @Column({ type: 'int', default: 1 })
  entries_count: number;

  @Column({ type: 'int', default: 0 })
  gems_spent: number;

  /** What one entry cost when this pack was bought. */
  @Column({ type: 'int', default: 0 })
  entry_cost_gems: number;

  @CreateDateColumn({ type: 'timestamptz' })
  purchased_at: Date;

  // Read-only relation — no FK constraint is created.
  @ManyToOne(() => LuckyDraw, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'draw_id' })
  draw: LuckyDraw | null;
}
