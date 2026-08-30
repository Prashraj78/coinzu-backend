import { CronExpression } from '@nestjs/schedule';

export type CronJobGroup = 'rewards' | 'delivery' | 'catalogue' | 'maintenance';

export interface CronJobDefinition {
  /** Stable key. Also the `job_name` written to cron_job_logs. */
  key: string;
  label: string;
  group: CronJobGroup;
  description: string;
  /** Shipped schedule. An admin override is stored separately. */
  default_cron: string;
  /** What breaks if this stops running. Shown before a manual run. */
  consequence: string;
  /** Touches money or a user's standing, so a manual run is confirmed first. */
  critical: boolean;
}

/**
 * Every scheduled job in Coinzu. Adding one here plus a matching runner is all
 * it takes for it to appear in the admin tab, be toggled, and be run by hand.
 */
export const CRON_JOBS: CronJobDefinition[] = [
  {
    key: 'reward_draw_settle',
    label: 'Lucky draw settlement',
    group: 'rewards',
    description:
      'Settles every daily and weekly lucky draw whose period has ended — picks winners weighted by entries held, pays the pot, and opens the next draw. One pass covers both cadences.',
    default_cron: '0 0 * * *',
    consequence:
      'Draws never close. Nobody is paid, no winners are published, and the next period never opens, so entries stop being sellable.',
    critical: true,
  },
  {
    key: 'push_dispatch',
    label: 'Push dispatcher',
    group: 'delivery',
    description:
      'Sends push campaigns whose scheduled time has arrived. Polls every minute, which is the finest granularity the composer offers.',
    default_cron: CronExpression.EVERY_MINUTE,
    consequence: 'Scheduled push campaigns stay queued and never go out.',
    critical: false,
  },
  {
    key: 'gift_card_order_poll',
    label: 'Gift card order poll',
    group: 'delivery',
    description:
      'Asks the gift card provider for the status of orders still waiting on a code, and fulfils the ones that are ready.',
    default_cron: CronExpression.EVERY_5_MINUTES,
    consequence:
      'Users who redeemed a gift card never receive their code, even though the coins have already left their wallet.',
    critical: true,
  },
  {
    key: 'daily_challenge_reset',
    label: 'Daily challenge reset',
    group: 'rewards',
    description:
      "Clears yesterday's unfinished challenge progress so today's board starts clean.",
    default_cron: CronExpression.EVERY_DAY_AT_MIDNIGHT,
    consequence:
      "Yesterday's half-finished challenges carry into today and can be claimed twice.",
    critical: false,
  },
  {
    key: 'streak_check',
    label: 'Streak break check',
    group: 'rewards',
    description:
      'Resets the board to day 0 for anyone who did not claim yesterday. The all-time record is never reset.',
    default_cron: CronExpression.EVERY_DAY_AT_1AM,
    consequence:
      'A broken streak keeps advancing, so users collect late-board rewards without earning them.',
    critical: true,
  },
  {
    key: 'gift_card_catalog_sync',
    label: 'Gift card catalogue sync',
    group: 'catalogue',
    description:
      'Pulls the current gift card products, prices and stock from the provider.',
    default_cron: CronExpression.EVERY_DAY_AT_2AM,
    consequence:
      'The redeem catalogue drifts from the provider — users can order items that are out of stock or mispriced.',
    critical: false,
  },
  {
    key: 'expired_cleanup',
    label: 'Expired data cleanup',
    group: 'maintenance',
    description:
      'Deactivates offers past their end date and deletes offer clicks older than 30 days.',
    default_cron: CronExpression.EVERY_DAY_AT_3AM,
    consequence:
      'Expired offers stay visible in the app and the click table grows without bound.',
    critical: false,
  },
];

export const CRON_JOB_KEYS = CRON_JOBS.map((j) => j.key);

export function findCronJob(key: string): CronJobDefinition | undefined {
  return CRON_JOBS.find((j) => j.key === key);
}

/** A plain-English reading of the cron expressions this project actually uses. */
export function scheduleLabel(cron: string): string {
  const named: Record<string, string> = {
    [CronExpression.EVERY_MINUTE]: 'Every minute',
    [CronExpression.EVERY_5_MINUTES]: 'Every 5 minutes',
    [CronExpression.EVERY_10_MINUTES]: 'Every 10 minutes',
    [CronExpression.EVERY_30_MINUTES]: 'Every 30 minutes',
    [CronExpression.EVERY_HOUR]: 'Every hour, on the hour',
    [CronExpression.EVERY_DAY_AT_MIDNIGHT]: 'Every day at 00:00 UTC',
    [CronExpression.EVERY_DAY_AT_1AM]: 'Every day at 01:00 UTC',
    [CronExpression.EVERY_DAY_AT_2AM]: 'Every day at 02:00 UTC',
    [CronExpression.EVERY_DAY_AT_3AM]: 'Every day at 03:00 UTC',
  };
  if (named[cron]) return named[cron];

  const parts = cron.trim().split(/\s+/);
  // Nest accepts both 5- and 6-field expressions; drop the seconds field.
  const [min, hour, dom, , dow] = parts.length === 6 ? parts.slice(1) : parts;

  if (min?.startsWith('*/') && hour === '*') return `Every ${min.slice(2)} minutes`;
  if (hour?.startsWith('*/') && min === '0') return `Every ${hour.slice(2)} hours`;
  if (dom === '*' && dow === '*' && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
    return `Every day at ${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`;
  }
  return `Cron: ${cron}`;
}
