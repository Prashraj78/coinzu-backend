import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CronTime } from 'cron';
import { Repository } from 'typeorm';
import { CronJobSetting } from '../../../database/entities/cron-job-setting.entity';
import { CronJobLog } from '../../../database/entities/cron-job-log.entity';
import {
  CRON_JOBS,
  findCronJob,
  scheduleLabel,
} from '../../cron/cron.catalogue';
import { CronRegistryService } from '../../cron/cron-registry.service';
import {
  CzCommonErrorCodes,
  CzAdminErrorCodes,
} from '../../../common/errors/error.constants';

@Injectable()
export class AdminCronService {
  constructor(
    @InjectRepository(CronJobSetting)
    private readonly settings: Repository<CronJobSetting>,
    @InjectRepository(CronJobLog)
    private readonly logs: Repository<CronJobLog>,
    private readonly registry: CronRegistryService,
  ) {}

  /** The catalogue, each job's stored override, and how it last went. */
  async list() {
    const [settings, lastRuns] = await Promise.all([
      this.settings.find(),
      this.latestRunPerJob(),
    ]);
    const byKey = new Map(settings.map((s) => [s.job_key, s]));

    const data = CRON_JOBS.map((job) => {
      const setting = byKey.get(job.key);
      const cron = setting?.cron ?? job.default_cron;
      const enabled = setting?.enabled ?? true;
      const last = lastRuns.get(job.key) ?? null;
      return {
        key: job.key,
        label: job.label,
        group: job.group,
        description: job.description,
        cron,
        default_cron: job.default_cron,
        is_custom_schedule: Boolean(setting?.cron),
        schedule_label: scheduleLabel(cron),
        time_zone: 'UTC',
        enabled,
        critical: job.critical,
        consequence: job.consequence,
        confirm_run: job.critical,
        /** Coinzu has no prod-only job; the field keeps the admin UI contract. */
        production_only: false,
        /** False when no module claimed this key — the job cannot run. */
        registered: this.registry.hasRunner(job.key),
        scheduled: this.registry.isScheduled(job.key),
        next_run_at: enabled ? this.registry.nextRunAt(job.key) : null,
        last_run: last
          ? {
              started_at: last.last_run_at,
              finished_at: last.finished_at,
              status: last.status,
              duration_ms: last.duration_ms,
              error: last.error_message,
              triggered_by: last.triggered_by,
            }
          : null,
        updated_by: setting?.updated_by ?? null,
        updated_at: setting?.updated_at ?? null,
      };
    });

    return {
      data,
      total: data.length,
      summary: {
        total: data.length,
        enabled: data.filter((j) => j.enabled).length,
        disabled: data.filter((j) => !j.enabled).length,
        custom_schedule: data.filter((j) => j.is_custom_schedule).length,
        failing: data.filter((j) => j.last_run?.status === 'failed').length,
      },
    };
  }

  /** One row per job: its most recent run. */
  private async latestRunPerJob(): Promise<Map<string, CronJobLog>> {
    const rows = await this.logs
      .createQueryBuilder('l')
      .distinctOn(['l.job_name'])
      .orderBy('l.job_name', 'ASC')
      .addOrderBy('l.last_run_at', 'DESC')
      .getMany();
    return new Map(rows.map((r) => [r.job_name, r]));
  }

  /** Runs a job by hand, through the same logging path as a scheduled run. */
  async runNow(key: string, admin_id: string) {
    const job = this.mustExist(key);
    if (!this.registry.hasRunner(key)) {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: `No runner is registered for "${key}".`,
      });
    }
    const started = Date.now();
    await this.registry.execute(key, admin_id);
    const last = (await this.latestRunPerJob()).get(key) ?? null;
    return {
      key: job.key,
      ran_by: admin_id,
      duration_ms: last?.duration_ms ?? Date.now() - started,
      status: last?.status ?? 'success',
      error_message: last?.error_message ?? null,
    };
  }

  async setEnabled(key: string, enabled: boolean, admin_id: string) {
    this.mustExist(key);
    await this.upsert(key, { enabled }, admin_id);
    await this.registry.applySchedule(key);
    return this.list();
  }

  async setSchedule(key: string, cron: string, admin_id: string) {
    this.mustExist(key);
    // Reject a bad expression here rather than letting it kill the timer.
    try {
      new CronTime(cron, 'UTC');
    } catch {
      throw new BadRequestException({
        cz_error_code: CzCommonErrorCodes.VALIDATION_FAILED,
        cz_error_description: `"${cron}" is not a valid cron expression.`,
      });
    }
    await this.upsert(key, { cron }, admin_id);
    await this.registry.applySchedule(key);
    return this.list();
  }

  /** Drops the override so the job goes back to its shipped schedule. */
  async resetSchedule(key: string, admin_id: string) {
    this.mustExist(key);
    await this.upsert(key, { cron: null }, admin_id);
    await this.registry.applySchedule(key);
    return this.list();
  }

  private async upsert(
    job_key: string,
    patch: Partial<Pick<CronJobSetting, 'enabled' | 'cron'>>,
    admin_id: string,
  ): Promise<void> {
    const existing = await this.settings.findOne({ where: { job_key } });
    if (existing) {
      Object.assign(existing, patch, { updated_by: admin_id });
      await this.settings.save(existing);
      return;
    }
    await this.settings.save(
      this.settings.create({
        job_key,
        enabled: patch.enabled ?? true,
        cron: patch.cron ?? null,
        updated_by: admin_id,
      }),
    );
  }

  private mustExist(key: string) {
    const job = findCronJob(key);
    if (!job) {
      throw new NotFoundException({
        cz_error_code: CzAdminErrorCodes.CRON_JOB_NOT_FOUND,
      });
    }
    return job;
  }
}
