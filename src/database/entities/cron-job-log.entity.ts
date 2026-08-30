import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type CronJobStatus = 'running' | 'success' | 'failed';

@Entity({ name: 'cron_job_logs' })
@Index(['job_name', 'created_at'])
export class CronJobLog {
  @PrimaryGeneratedColumn('uuid')
  cz_cron_job_log_id: string;

  @Column({ type: 'varchar', length: 80 })
  job_name: string;

  @Column({ type: 'varchar', length: 20, default: 'running' })
  status: CronJobStatus;

  @Column({ type: 'timestamptz' })
  last_run_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  next_run_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finished_at: Date | null;

  /** Admin id for a manual run, null when the schedule fired it. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  triggered_by: string | null;

  @Column({ type: 'int', nullable: true })
  duration_ms: number | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
