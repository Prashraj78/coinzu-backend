import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type LuckyDrawType = 'daily' | 'weekly';
export type LuckyDrawStatus = 'open' | 'drawing' | 'resolved';

@Entity({ name: 'lucky_draws' })
export class LuckyDraw {
  @PrimaryGeneratedColumn('uuid')
  cz_lucky_draw_id: string;

  @Column({ type: 'varchar', length: 10 })
  type: LuckyDrawType;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'int' })
  prize_pool_coins: number;

  @Column({ type: 'int', default: 1 })
  entry_cost_gems: number;

  @Column({ type: 'int', default: 1 })
  winners_count: number;

  @Column({ type: 'timestamptz' })
  draw_date: Date;

  /** Set when the draw is an instance of a recurring reward game. */
  @Column({ type: 'uuid', nullable: true })
  game_id: string | null;

  /** `2026-08-30` for a daily draw, `2026-W35` for a weekly one. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  period_key: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  opens_at: Date | null;

  @Column({ type: 'int', default: 0 })
  participants_count: number;

  @Column({ type: 'int', default: 0 })
  entries_count: number;

  @Column({ type: 'timestamptz', nullable: true })
  settled_at: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: LuckyDrawStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
