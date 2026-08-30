import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * An admin's override for one job in the catalogue. A job with no row here
 * runs on its shipped schedule and is enabled.
 */
@Entity({ name: 'cron_job_settings' })
export class CronJobSetting {
  /** Matches CronJobDefinition.key. */
  @PrimaryColumn({ type: 'varchar', length: 80 })
  job_key: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /** Null means the shipped schedule is in force. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  cron: string | null;

  /** Rewardtym admin id (`lt_admin_...`), not a Coinzu uuid. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  updated_by: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
