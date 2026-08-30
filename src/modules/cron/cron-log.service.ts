import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJobLog } from '../../database/entities/cron-job-log.entity';

/** Every scheduled job records one row here so failures are visible. */
@Injectable()
export class CronLogService {
  private readonly logger = new Logger(CronLogService.name);

  constructor(
    @InjectRepository(CronJobLog)
    private readonly logs: Repository<CronJobLog>,
  ) {}

  /**
   * Runs a job and writes its outcome. Errors are logged, never rethrown,
   * so one broken job cannot stop the scheduler.
   */
  async run(
    job_name: string,
    work: () => Promise<unknown>,
    triggered_by: string | null = null,
  ): Promise<void> {
    const started = Date.now();
    const row = this.logs.create({
      job_name,
      status: 'running',
      last_run_at: new Date(),
      triggered_by,
    });
    const saved = await this.logs.save(row);

    try {
      await work();
      saved.status = 'success';
    } catch (error) {
      this.logger.error(`Cron job ${job_name} failed: ${String(error)}`);
      saved.status = 'failed';
      saved.error_message = String(error);
    }

    saved.duration_ms = Date.now() - started;
    saved.finished_at = new Date();
    await this.logs.update(saved.cz_cron_job_log_id, {
      status: saved.status,
      error_message: saved.error_message ?? null,
      duration_ms: saved.duration_ms,
      finished_at: saved.finished_at,
    });
  }
}
