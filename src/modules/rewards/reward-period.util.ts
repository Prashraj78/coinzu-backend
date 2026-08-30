import { RewardGameCadence } from '../../database/entities/reward-game.entity';

/** The key a draw is filed under: `2026-08-30` daily, `2026-W35` weekly. */
export function currentPeriodKey(cadence: RewardGameCadence, at = new Date()): string {
  if (cadence === 'weekly') {
    const monday = weekStart(at);
    return `${monday.getUTCFullYear()}-W${String(isoWeek(monday)).padStart(2, '0')}`;
  }
  return at.toISOString().slice(0, 10);
}

/** Midnight UTC that opens the current period. */
export function periodStart(cadence: RewardGameCadence, at = new Date()): Date {
  if (cadence === 'weekly') return weekStart(at);
  return new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Midnight UTC that closes it — the moment the cron settles the draw. */
export function periodEnd(cadence: RewardGameCadence, at = new Date()): Date {
  const start = periodStart(cadence, at);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (cadence === 'weekly' ? 7 : 1));
  return end;
}

/** Monday 00:00 UTC of the week containing `at`. */
function weekStart(at: Date): Date {
  const d = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), 0, 0, 0, 0),
  );
  // getUTCDay is 0 on Sunday, so shift it to a Monday-first week.
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

function isoWeek(monday: Date): number {
  const thursday = new Date(monday);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(
    firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3,
  );
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000);
}
