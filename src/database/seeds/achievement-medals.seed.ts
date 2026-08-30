/**
 * The 24 medals from the Figma achievement board, in reading order.
 *
 * A medal is recognition, not currency — none of them pays out. `points` is
 * the engagement score the board totals.
 *
 * Artwork lives on R2 under `achievements/<slug>.png` — transparent PNGs, so a
 * medal sits on whatever background the app draws behind it.
 */
export interface MedalSeed {
  slug: string;
  title: string;
  emoji: string;
  description: string;
  criteria_type: string;
  criteria_value: number;
  rarity: 'common' | 'rare' | 'epic' | 'rarest';
  /** Engagement score only. Medals never pay coins or gems. */
  points: number;
}

export const MEDAL_SEEDS: MedalSeed[] = [
  { slug: 'first-blood', title: 'First Blood', emoji: '🔥', description: 'Complete your first offer.', criteria_type: 'complete_offer', criteria_value: 1, rarity: 'common', points: 25 },
  { slug: 'quick-draw', title: 'Quick Draw', emoji: '⚡', description: 'Complete 10 offers.', criteria_type: 'complete_offer', criteria_value: 10, rarity: 'common', points: 50 },
  { slug: 'verified', title: 'Verified', emoji: '✅', description: 'Pass identity verification.', criteria_type: 'kyc_verified', criteria_value: 1, rarity: 'rare', points: 100 },
  { slug: 'journey-begins', title: 'Journey Begins', emoji: '🚩', description: 'Finish setting up your account.', criteria_type: 'onboarding_completed', criteria_value: 1, rarity: 'common', points: 25 },

  { slug: 'gem-cutter', title: 'Gem Cutter', emoji: '💠', description: 'Convert coins into gems for the first time.', criteria_type: 'convert_currency', criteria_value: 1, rarity: 'common', points: 30 },
  { slug: 'silver-circle', title: 'Silver Circle', emoji: '🥈', description: 'Complete 25 offers.', criteria_type: 'complete_offer', criteria_value: 25, rarity: 'rare', points: 75 },
  { slug: 'gold-standard', title: 'Gold Standard', emoji: '🥇', description: 'Complete 50 offers.', criteria_type: 'complete_offer', criteria_value: 50, rarity: 'rare', points: 150 },
  { slug: 'star-player', title: 'Star Player', emoji: '⭐', description: 'Check in 7 days in a row.', criteria_type: 'daily_checkin', criteria_value: 7, rarity: 'common', points: 50 },

  { slug: 'deep-diver', title: 'Deep Diver', emoji: '🌌', description: 'Complete 100 offers.', criteria_type: 'complete_offer', criteria_value: 100, rarity: 'epic', points: 250 },
  { slug: 'on-fire', title: 'On Fire', emoji: '🔥', description: 'Check in 30 days in a row.', criteria_type: 'daily_checkin', criteria_value: 30, rarity: 'epic', points: 200 },
  { slug: 'challenger', title: 'Challenger', emoji: '⚔️', description: 'Finish 10 daily challenges.', criteria_type: 'complete_challenge', criteria_value: 10, rarity: 'common', points: 60 },
  { slug: 'beast-mode', title: 'Beast Mode', emoji: '🐯', description: 'Finish 50 daily challenges.', criteria_type: 'complete_challenge', criteria_value: 50, rarity: 'epic', points: 200 },

  { slug: 'treasure-hunter', title: 'Treasure Hunter', emoji: '🔮', description: 'Enter 10 lucky draws.', criteria_type: 'enter_lucky_draw', criteria_value: 10, rarity: 'epic', points: 180 },
  { slug: 'first-payout', title: 'First Payout', emoji: '💰', description: 'Complete your first withdrawal.', criteria_type: 'withdrawal_completed', criteria_value: 1, rarity: 'rare', points: 100 },
  { slug: 'champion', title: 'Champion', emoji: '👑', description: 'Complete 10 withdrawals.', criteria_type: 'withdrawal_completed', criteria_value: 10, rarity: 'epic', points: 250 },
  { slug: 'sky-high', title: 'Sky High', emoji: '🚀', description: 'Invite 5 friends who join.', criteria_type: 'refer_friend', criteria_value: 5, rarity: 'rare', points: 120 },

  { slug: 'collector', title: 'Collector', emoji: '🎁', description: 'Redeem your first gift card.', criteria_type: 'redeem_gift_card', criteria_value: 1, rarity: 'rare', points: 80 },
  { slug: 'bullseye', title: 'Bullseye', emoji: '🎯', description: 'Play the daily quiz 10 times.', criteria_type: 'play_quiz', criteria_value: 10, rarity: 'common', points: 40 },
  { slug: 'guardian', title: 'Guardian', emoji: '🛡️', description: 'Scratch 10 daily cards.', criteria_type: 'play_scratch', criteria_value: 10, rarity: 'common', points: 40 },
  { slug: 'diamond', title: 'Diamond', emoji: '💎', description: 'Spin the wheel 10 times.', criteria_type: 'play_spin', criteria_value: 10, rarity: 'common', points: 40 },

  { slug: 'hall-of-fame', title: 'Hall of Fame', emoji: '🏆', description: 'Invite 25 friends who join.', criteria_type: 'refer_friend', criteria_value: 25, rarity: 'rarest', points: 500 },
  { slug: 'north-star', title: 'North Star', emoji: '✨', description: 'Complete 250 offers.', criteria_type: 'complete_offer', criteria_value: 250, rarity: 'rarest', points: 500 },
  { slug: 'evergreen', title: 'Evergreen', emoji: '🌿', description: 'Check in 100 days in a row.', criteria_type: 'daily_checkin', criteria_value: 100, rarity: 'rarest', points: 500 },
  { slug: 'sealed-legend', title: 'Sealed Legend', emoji: '🎖️', description: 'Complete 50 withdrawals.', criteria_type: 'withdrawal_completed', criteria_value: 50, rarity: 'rarest', points: 750 },
];

/** Public artwork for a medal. Kept here so the URL shape lives in one place. */
export function medalIconUrl(publicUrl: string, slug: string): string {
  return `${publicUrl.replace(/\/$/, '')}/achievements/${slug}.png`;
}
