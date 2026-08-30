import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TicketType = 'email_support' | 'report_problem' | 'feedback';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

/** One turn in the ticket thread. The reply feature appends to this. */
export interface TicketMessage {
  from: 'user' | 'admin';
  body: string;
  /** Coinzu user uuid, or the Rewardtym admin id on an admin turn. */
  author_id: string;
  created_at: string;
}

@Entity({ name: 'support_tickets' })
@Index(['user_id', 'created_at'])
@Index(['type', 'status'])
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  cz_support_ticket_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  type: TicketType;

  /** Free text picked from a list the app hard-codes, so new options need no release. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  issue_type: string | null;

  /** When the user says the problem happened, not when they reported it. */
  @Column({ type: 'timestamptz', nullable: true })
  occurred_at: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  affected_area: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  attachment_urls: string[];

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: TicketStatus;

  @Column({ type: 'text', nullable: true })
  admin_response: string | null;

  /** The conversation. Seeded with the user's own message on create. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  messages: TicketMessage[];

  /** Rewardtym admin id (`lt_admin_...`), not a Coinzu uuid. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  resolved_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
