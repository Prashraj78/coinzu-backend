const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Turns 1-based page/limit query params into TypeORM skip/take. */
export function toSkipTake(page?: number, limit?: number) {
  const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const safePage = Math.max(page ?? 1, 1);
  return { skip: (safePage - 1) * safeLimit, take: safeLimit };
}
