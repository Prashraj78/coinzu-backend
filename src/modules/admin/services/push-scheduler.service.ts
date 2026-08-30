import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CronRegistryService } from '../../cron/cron-registry.service';
import { AdminPushService } from './admin-push.service';

/**
 * Runs scheduled campaigns. One minute is the finest granularity the composer
 * offers, so polling at that rate is exact rather than approximate.
 */
@Injectable()
export class PushSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PushSchedulerService.name);
  private running = false;

  constructor(
    private readonly push: AdminPushService,
    private readonly registry: CronRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register('push_dispatch', () => this.dispatchDue());
  }

  async dispatchDue(): Promise<void> {
    // A slow send must never overlap itself and double-deliver.
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.push.dueCampaigns();
      for (const campaign of due) {
        try {
          await this.push.send(campaign.cz_push_campaign_id);
          this.logger.log(`Sent scheduled campaign ${campaign.cz_push_campaign_id}`);
        } catch (error) {
          this.logger.error(
            `Scheduled campaign ${campaign.cz_push_campaign_id} failed: ${String(error)}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
