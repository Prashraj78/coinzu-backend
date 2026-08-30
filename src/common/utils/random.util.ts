import * as crypto from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Referral codes avoid look-alike characters so they are easy to read out. */
export function generateReferralCode(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function generateClickId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateNumericOtp(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

/** Picks one item using probability_weight; heavier weights win more often. */
export function pickByWeight<T extends { probability_weight: number }>(
  items: T[],
): T {
  const totalWeight = items.reduce(
    (sum, item) => sum + Math.max(item.probability_weight, 0),
    0,
  );
  if (totalWeight <= 0) return items[0];

  let ticket = Math.random() * totalWeight;
  for (const item of items) {
    ticket -= Math.max(item.probability_weight, 0);
    if (ticket <= 0) return item;
  }
  return items[items.length - 1];
}

export function pickRandomItems<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = crypto.randomInt(0, pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

/** A prize can pay a random amount in a range; without a max it pays exactly min. */
export function pickInRange(min: number, max: number | null | undefined): number {
  const low = Math.max(0, Math.round(min));
  if (max == null) return low;
  const high = Math.max(low, Math.round(max));
  return high === low ? low : crypto.randomInt(low, high + 1);
}
