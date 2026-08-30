import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { Repository } from 'typeorm';
import { CronJobSetting } from '../../database/entities/cron-job-setting.entity';
import { CRON_JOBS, findCronJob } from './cron.catalogue';
import { CronLogService } from './cron-log.service';

type Runner = () => Promise<unknown>;

/**
 * Owns every scheduled job. Modules register a runner by key; this service
 * decides when it fires, using the admin's schedule when one is stored.
 *
 * Registering rather than decorating with `@Cron` is what lets a job be
 * paused or rescheduled from the panel without a redeploy.
 */
@Injectable()
export class CronRegistryService implements OnModuleInit {
  private readonly logger = new Logger(CronRegistryService.name);
  private readonly runners = new Map<string, Runner>();
  private booted = false;

  constructor(
    @InjectRepository(CronJobSetting)
    private readonly settings: Repository<CronJobSetting>,
    private readonly scheduler: SchedulerRegistry,
    private readonly cronLogService: CronLogService,
  ) {}

  /** Called by each owning module during its own init. */
  register(key: string, runner: Runner): void {
    if (!findCronJob(key)) {
      this.logger.warn(`Runner "${key}" is not in the cron catalogue; ignored.`);
      return;
    }
    this.runners.set(key, runner);
    if (this.booted) void this.applySchedule(key);
  }

  hasRunner(key: string): boolean {
    return this.runners.has(key);
  }

  async onModuleInit(): Promise<void> {
    // Runners register during their own init, so schedule on the next tick.
    setImmediate(() => {
      void this.bootAll();
    });
  }

  private async bootAll(): Promise<void> {
    this.booted = true;
    for (const job of CRON_JOBS) {
      await this.applySchedule(job.key);
    }
  }

  /** Reads the stored override and (re)installs the timer for one job. */
  async applySchedule(key: string): Promise<void> {
    const def = findCronJob(key);
    if (!def || !this.runners.has(key)) return;

    this.removeTimer(key);

    const setting = await this.settings.findOne({ where: { job_key: key } });
    if (setting && !setting.enabled) return;

    const expression = setting?.cron ?? def.default_cron;
    try {
      const job = new CronJob(expression, () => {
        void this.execute(key);
      }, null, false, 'UTC');
      this.scheduler.addCronJob(key, job as unknown as CronJob);
      job.start();
    } catch (error) {
      this.logger.error(
        `Could not schedule "${key}" with "${expression}": ${String(error)}`,
      );
    }
  }

  private removeTimer(key: string): void {
    try {
      if (this.scheduler.doesExist('cron', key)) this.scheduler.deleteCronJob(key);
    } catch {
      // Nothing installed under that key yet.
    }
  }

  /** Runs a job now, through the same logging path as a scheduled run. */
  async execute(key: string, triggered_by: string | null = null): Promise<void> {
    const runner = this.runners.get(key);
    if (!runner) {
      this.logger.warn(`No runner registered for "${key}".`);
      return;
    }
    await this.cronLogService.run(key, runner, triggered_by);
  }

  /** When the timer for a job will next fire, or null when it is paused. */
  nextRunAt(key: string): Date | null {
    try {
      if (!this.scheduler.doesExist('cron', key)) return null;
      const job = this.scheduler.getCronJob(key);
      const next = job.nextDate();
      return next ? next.toJSDate() : null;
    } catch {
      return null;
    }
  }

  /** True when a timer is currently installed — i.e. the job is live. */
  isScheduled(key: string): boolean {
    try {
      return this.scheduler.doesExist('cron', key);
    } catch {
      return false;
    }
  }
}
