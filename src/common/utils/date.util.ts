/** All daily resets use UTC calendar dates, stored as "YYYY-MM-DD". */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateStringOf(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDaysToDate(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return dateStringOf(result);
}

export function yesterdayDate(): string {
  return addDaysToDate(todayDate(), -1);
}

export function daysBetweenDates(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86400000);
}

export function startOfTodayUtc(): Date {
  return new Date(`${todayDate()}T00:00:00.000Z`);
}

export function startOfThisWeekUtc(): Date {
  const now = new Date(`${todayDate()}T00:00:00.000Z`);
  // Monday is treated as day 1; Sunday (0) rolls back six days.
  const weekday = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  now.setUTCDate(now.getUTCDate() - (weekday - 1));
  return now;
}
