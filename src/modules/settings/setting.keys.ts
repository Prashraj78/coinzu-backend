/** Every tunable value lives in app_settings under one of these keys. */
export const SettingKeys = {
  COINS_PER_USD: 'coins_per_usd',
  COINS_PER_GEM: 'coins_per_gem',
  MIN_WITHDRAWAL_COINS: 'min_withdrawal_coins',
  WITHDRAWAL_REQUIRES_KYC: 'withdrawal_requires_kyc',
  KYC_CONFIDENCE_THRESHOLD: 'kyc_confidence_threshold',
  REFERRAL_MAX_COINS_PER_FRIEND: 'referral_max_coins_per_friend',
  REFERRAL_MAX_GEMS_PER_FRIEND: 'referral_max_gems_per_friend',
  DAILY_CHEST_COINS: 'daily_chest_coins',
  DAILY_CHEST_GEMS: 'daily_chest_gems',
  PUSH_QUIET_HOURS_START: 'push_quiet_hours_start',
  PUSH_QUIET_HOURS_END: 'push_quiet_hours_end',
} as const;

export type SettingValueType = 'integer' | 'decimal' | 'boolean';

export type SettingGroup =
  | 'currency'
  | 'withdrawals'
  | 'referrals'
  | 'notifications';

export interface SettingMeta {
  group: SettingGroup;
  label: string;
  description: string;
  value_type: SettingValueType;
  /** Shown after the input, e.g. "coins". Omitted for booleans. */
  unit?: string;
  min?: number;
  max?: number;
}

const QUIET_HOURS_NOTE =
  "Marketing pushes are held back for anyone whose local time falls inside this window. Transaction and system messages ignore it. Set both to the same hour to switch quiet hours off.";

/** The Configuration Settings tab is generated from this — label, help text, type and bounds. */
export const SettingCatalogue: Record<string, SettingMeta> = {
  [SettingKeys.COINS_PER_USD]: {
    group: 'currency',
    label: 'Coins per USD',
    description:
      'How many coins make one US dollar. Drives the cash value shown on the Wallet screen and the payout amount on every withdrawal.',
    value_type: 'integer',
    unit: 'coins',
    min: 1,
    max: 1_000_000,
  },
  [SettingKeys.COINS_PER_GEM]: {
    group: 'currency',
    label: 'Coins per gem',
    description:
      'What one gem is worth in coins. May be fractional — 0.025 means 40 gems buy 1 coin. Drives both directions of Convert.',
    value_type: 'decimal',
    unit: 'coins',
    min: 0.000001,
    max: 1_000_000,
  },
  [SettingKeys.MIN_WITHDRAWAL_COINS]: {
    group: 'withdrawals',
    label: 'Minimum withdrawal',
    description:
      'Smallest payout a user may request. Anything below is rejected with CZDWLT004.',
    value_type: 'integer',
    unit: 'coins',
    min: 1,
    max: 10_000_000,
  },
  [SettingKeys.WITHDRAWAL_REQUIRES_KYC]: {
    group: 'withdrawals',
    label: 'Require KYC to withdraw',
    description:
      'When on, a user must be KYC-verified before a payout is accepted. Off lets anyone cash out.',
    value_type: 'boolean',
  },
  [SettingKeys.KYC_CONFIDENCE_THRESHOLD]: {
    group: 'withdrawals',
    label: 'KYC confidence threshold',
    description:
      'Face-match score a selfie must reach to auto-verify. Below this the attempt goes to manual review.',
    value_type: 'integer',
    unit: '%',
    min: 0,
    max: 100,
  },
  [SettingKeys.REFERRAL_MAX_COINS_PER_FRIEND]: {
    group: 'referrals',
    label: 'Max coins per friend',
    description:
      'Hard ceiling on the coins one invited friend can ever earn a referrer, across every step. A step that would cross it pays only the remainder. Set 0 for no cap.',
    value_type: 'integer',
    unit: 'coins',
    min: 0,
    max: 10_000_000,
  },
  [SettingKeys.REFERRAL_MAX_GEMS_PER_FRIEND]: {
    group: 'referrals',
    label: 'Max gems per friend',
    description:
      'Hard ceiling on the gems one invited friend can ever earn a referrer, across every step. Set 0 for no cap.',
    value_type: 'integer',
    unit: 'gems',
    min: 0,
    max: 10_000_000,
  },
  [SettingKeys.PUSH_QUIET_HOURS_START]: {
    group: 'notifications',
    label: 'Quiet hours start',
    description: `Hour of the user's own day when quiet hours begin, 0-23. ${QUIET_HOURS_NOTE}`,
    value_type: 'integer',
    unit: 'hour',
    min: 0,
    max: 23,
  },
  [SettingKeys.PUSH_QUIET_HOURS_END]: {
    group: 'notifications',
    label: 'Quiet hours end',
    description: `Hour of the user's own day when quiet hours lift, 0-23. A window that wraps midnight is fine. ${QUIET_HOURS_NOTE}`,
    value_type: 'integer',
    unit: 'hour',
    min: 0,
    max: 23,
  },
};

export const SettingGroupMeta: Record<
  SettingGroup,
  { label: string; description: string }
> = {
  currency: {
    label: 'Currency & rates',
    description:
      'What a coin and a gem are worth. These drive the Wallet screen, Convert, and every payout.',
  },
  withdrawals: {
    label: 'Withdrawals & KYC',
    description: 'The bar a user has to clear before money leaves the platform.',
  },
  referrals: {
    label: 'Referral rewards',
    description:
      'The ceiling on what one invited friend can earn a referrer. The steps themselves live in the ladder below.',
  },
  notifications: {
    label: 'Notifications',
    description:
      'When it is acceptable to interrupt someone. Applies to every push campaign that opts into quiet hours.',
  },
};

export const SettingDefaults: Record<string, string> = {
  [SettingKeys.COINS_PER_USD]: '1000',
  // 12,000 gems = 300 coins, i.e. 40 gems buy 1 coin.
  [SettingKeys.COINS_PER_GEM]: '0.025',
  [SettingKeys.MIN_WITHDRAWAL_COINS]: '5000',
  [SettingKeys.WITHDRAWAL_REQUIRES_KYC]: 'true',
  [SettingKeys.KYC_CONFIDENCE_THRESHOLD]: '90',
  [SettingKeys.REFERRAL_MAX_COINS_PER_FRIEND]: '0',
  [SettingKeys.REFERRAL_MAX_GEMS_PER_FRIEND]: '0',
  [SettingKeys.DAILY_CHEST_COINS]: '1000',
  [SettingKeys.DAILY_CHEST_GEMS]: '1000',
  [SettingKeys.PUSH_QUIET_HOURS_START]: '22',
  [SettingKeys.PUSH_QUIET_HOURS_END]: '8',
};
