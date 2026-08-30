import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ScratchGrantSource = 'quiz' | 'admin' | 'promo';

/**
 * A scratch card earned rather than allotted — winning the quiz grants one on
 * top of the day's normal allowance. Unused grants do not roll over.
 */
@Entity({ name: 'scratch_card_grants' })
@Index(['user_id', 'date'])
export class ScratchCardGrant {
  @PrimaryGeneratedColumn('uuid')
  cz_scratch_card_grant_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 30 })
  source: ScratchGrantSource;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
