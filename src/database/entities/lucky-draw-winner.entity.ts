import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'lucky_draw_winners' })
@Index(['draw_id'])
export class LuckyDrawWinner {
  @PrimaryGeneratedColumn('uuid')
  cz_lucky_draw_winner_id: string;

  @Column({ type: 'uuid' })
  draw_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'int' })
  prize_amount: number;

  @Column({ type: 'int', default: 0 })
  prize_gems: number;

  /** How many entries they held when the draw was settled. */
  @Column({ type: 'int', default: 0 })
  entries_held: number;

  @Column({ type: 'int' })
  rank: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
