import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from '../../database/entities/referral.entity';
import { ReferralRewardPayout } from '../../database/entities/referral-reward-payout.entity';
import {
  ReferralRewardRule,
  type ReferralTrigger,
} from '../../database/entities/referral-reward-rule.entity';
import { CzReferralErrorCodes } from '../../common/errors/error.constants';
import { WalletService } from '../wallet/wallet.service';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReferralRuleDto } from './dto/create-referral-rule.dto';
import { UpdateReferralRuleDto } from './dto/update-referral-rule.dto';

export const REFERRAL_TRIGGERS: ReferralTrigger[] = [
  'signup',
  'email_verified',
  'onboarding_completed',
  'kyc_verified',
  'first_withdrawal',
  'first_redeem',
  'offers_completed',
  'daily_checkins',
  'streak_reached',
  'withdrawals_completed',
  'redeems_completed',
  'referrals_made',
];

/**
 * `repeatable` triggers hold many steps, one per threshold — that is what lets
 * the ladder run to as many rungs as the admin wants. Single-event triggers
 * hold exactly one step because the thing they describe happens once.
 */
export const REFERRAL_TRIGGER_META: Record<
  ReferralTrigger,
  {
    label: string;
    description: string;
    uses_threshold: boolean;
    threshold_unit: string | null;
    /** `{n}` is replaced with the threshold to build a step's default label. */
    threshold_template: string | null;
    repeatable: boolean;
  }
> = {
  signup: {
    label: 'Friend signs up',
    description:
      'Pays the moment an invited friend creates their account with the code.',
    uses_threshold: false,
    threshold_unit: null,
    threshold_template: null,
    repeatable: false,
  },
  email_verified: {
    label: 'Friend verifies their email',
    description: 'Pays when the invited friend confirms their email address.',
    uses_threshold: false,
    threshold_unit: null,
    threshold_template: null,
    repeatable: false,
  },
  onboarding_completed: {
    label: 'Friend finishes onboarding',
    description:
      'Pays when the invited friend completes the last onboarding step and their profile is set up.',
    uses_threshold: false,
    threshold_unit: null,
    threshold_template: null,
    repeatable: false,
  },
  kyc_verified: {
    label: 'Friend completes KYC',
    description: 'Pays when the invited friend passes identity verification.',
    uses_threshold: false,
    threshold_unit: null,
    threshold_template: null,
    repeatable: false,
  },
  first_withdrawal: {
    label: 'Friend’s first withdrawal',
    description: 'Pays when the invited friend requests their first payout.',
    uses_threshold: false,
    threshold_unit: null,
    threshold_template: null,
    repeatable: false,
  },
  first_redeem: {
    label: 'Friend’s first gift card',
    description: 'Pays when the invited friend redeems their first gift card.',
    uses_threshold: false,
    threshold_unit: null,
    threshold_template: null,
    repeatable: false,
  },
  offers_completed: {
    label: 'Friend completes offers',
    description:
      'Pays each time the friend reaches an offer count you set. Add one step per milestone — 1, 5, 10, 25 and so on.',
    uses_threshold: true,
    threshold_unit: 'offers',
    threshold_template: 'Friend completes {n} offers',
    repeatable: true,
  },
  daily_checkins: {
    label: 'Friend checks in',
    description:
      'Pays each time the friend reaches a total check-in count you set. Add a step per milestone — 7, 30, 100.',
    uses_threshold: true,
    threshold_unit: 'check-ins',
    threshold_template: 'Friend checks in {n} times',
    repeatable: true,
  },
  streak_reached: {
    label: 'Friend hits a streak',
    description:
      'Pays when the friend reaches a consecutive-day streak you set. Add a step per streak length — 7, 14, 30.',
    uses_threshold: true,
    threshold_unit: 'day streak',
    threshold_template: 'Friend hits a {n}-day streak',
    repeatable: true,
  },
  withdrawals_completed: {
    label: 'Friend withdraws',
    description:
      'Pays each time the friend reaches a total withdrawal count you set. Add a step per milestone — 1, 3, 10.',
    uses_threshold: true,
    threshold_unit: 'withdrawals',
    threshold_template: 'Friend makes {n} withdrawals',
    repeatable: true,
  },
  redeems_completed: {
    label: 'Friend redeems gift cards',
    description:
      'Pays each time the friend reaches a total gift-card count you set. Add a step per milestone — 1, 5, 10.',
    uses_threshold: true,
    threshold_unit: 'gift cards',
    threshold_template: 'Friend redeems {n} gift cards',
    repeatable: true,
  },
  referrals_made: {
    label: 'Friend invites others',
    description:
      'Pays each time the friend invites a number of people you set — a second-level reward for building a chain.',
    uses_threshold: true,
    threshold_unit: 'invites',
    threshold_template: 'Friend invites {n} people',
    repeatable: true,
  },
};

/** Fallback reading order when the admin has not set display_order. */
const TRIGGER_RANK: Record<ReferralTrigger, number> = {
  signup: 0,
  email_verified: 1,
  onboarding_completed: 2,
  kyc_verified: 3,
  offers_completed: 4,
  daily_checkins: 5,
  streak_reached: 6,
  first_withdrawal: 7,
  withdrawals_completed: 8,
  first_redeem: 9,
  redeems_completed: 10,
  referrals_made: 11,
};

function byLadderOrder(a: ReferralRewardRule, b: ReferralRewardRule): number {
  if (a.display_order !== b.display_order) return a.display_order - b.display_order;
  if (a.trigger !== b.trigger) return TRIGGER_RANK[a.trigger] - TRIGGER_RANK[b.trigger];
  return a.threshold - b.threshold;
}

@Injectable()
export class ReferralRulesService {
  constructor(
    @InjectRepository(ReferralRewardRule)
    private readonly rules: Repository<ReferralRewardRule>,
    @InjectRepository(ReferralRewardPayout)
    private readonly payouts: Repository<ReferralRewardPayout>,
    @InjectRepository(Referral)
    private readonly referrals: Repository<Referral>,
    private readonly walletService: WalletService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /* ------------------------------------------------------------------ admin */

  async listAdmin() {
    const [rules, maxCoins, maxGems] = await Promise.all([
      this.rules.find().then((r) => r.sort(byLadderOrder)),
      this.settingsService.getNumber(SettingKeys.REFERRAL_MAX_COINS_PER_FRIEND),
      this.settingsService.getNumber(SettingKeys.REFERRAL_MAX_GEMS_PER_FRIEND),
    ]);

    const ladderCoins = rules
      .filter((r) => r.is_active)
      .reduce((s, r) => s + r.reward_coins, 0);
    const ladderGems = rules
      .filter((r) => r.is_active)
      .reduce((s, r) => s + r.reward_gems, 0);

    return {
      // Meta first so a rule's own `label` always wins.
      data: rules.map((r) => ({
        trigger_label: REFERRAL_TRIGGER_META[r.trigger].label,
        trigger_description: REFERRAL_TRIGGER_META[r.trigger].description,
        uses_threshold: REFERRAL_TRIGGER_META[r.trigger].uses_threshold,
        threshold_unit: REFERRAL_TRIGGER_META[r.trigger].threshold_unit,
        threshold_template: REFERRAL_TRIGGER_META[r.trigger].threshold_template,
        repeatable: REFERRAL_TRIGGER_META[r.trigger].repeatable,
        default_label: this.defaultLabel(r),
        ...r,
      })),
      total: rules.length,
      triggers: REFERRAL_TRIGGERS.map((t) => ({
        trigger: t,
        ...REFERRAL_TRIGGER_META[t],
      })),
      caps: {
        max_coins_per_friend: maxCoins,
        max_gems_per_friend: maxGems,
        // What the ladder would pay with no cap, so the panel can warn on a clash.
        ladder_total_coins: ladderCoins,
        ladder_total_gems: ladderGems,
        effective_max_coins: maxCoins > 0 ? Math.min(maxCoins, ladderCoins) : ladderCoins,
        effective_max_gems: maxGems > 0 ? Math.min(maxGems, ladderGems) : ladderGems,
      },
    };
  }

  /** The live ladder, shaped for the app's Invite a Friend screen. */
  async listActiveLadder() {
    const rules = (await this.rules.find({ where: { is_active: true } })).sort(
      byLadderOrder,
    );
    return rules.map((r) => {
      const meta = REFERRAL_TRIGGER_META[r.trigger];
      return {
        cz_referral_rule_id: r.cz_referral_rule_id,
        trigger: r.trigger,
        label: r.label ?? this.defaultLabel(r),
        description: meta.description,
        threshold: meta.uses_threshold ? r.threshold : null,
        threshold_unit: meta.threshold_unit,
        reward_coins: r.reward_coins,
        reward_gems: r.reward_gems,
      };
    });
  }

  private defaultLabel(rule: ReferralRewardRule): string {
    const meta = REFERRAL_TRIGGER_META[rule.trigger];
    if (!meta.uses_threshold || !meta.threshold_template) return meta.label;
    return meta.threshold_template.replace('{n}', String(rule.threshold));
  }

  async create(dto: CreateReferralRuleDto): Promise<ReferralRewardRule> {
    const meta = REFERRAL_TRIGGER_META[dto.trigger];
    const threshold = meta.uses_threshold ? (dto.threshold ?? 1) : 1;

    // Single-event triggers hold one step; threshold triggers hold one per level.
    const clash = await this.rules.findOne({
      where: meta.repeatable
        ? { trigger: dto.trigger, threshold }
        : { trigger: dto.trigger },
    });
    if (clash) {
      throw new ConflictException({
        cz_error_code: CzReferralErrorCodes.RULE_ALREADY_EXISTS,
        cz_error_description: meta.repeatable
          ? `A step already pays at ${threshold} ${meta.threshold_unit}.`
          : `The "${meta.label}" step already exists.`,
      });
    }

    return this.rules.save(this.rules.create({ ...dto, threshold }));
  }

  async update(id: string, dto: UpdateReferralRuleDto): Promise<ReferralRewardRule> {
    const rule = await this.getOrFail(id);
    const meta = REFERRAL_TRIGGER_META[rule.trigger];
    Object.assign(rule, dto);
    if (!meta.uses_threshold) rule.threshold = 1;
    return this.rules.save(rule);
  }

  async remove(id: string): Promise<{ cz_referral_rule_id: string }> {
    const rule = await this.getOrFail(id);
    await this.rules.remove(rule);
    return { cz_referral_rule_id: id };
  }

  private async getOrFail(id: string): Promise<ReferralRewardRule> {
    const rule = await this.rules.findOne({
      where: { cz_referral_rule_id: id },
    });
    if (!rule) {
      throw new NotFoundException({
        cz_error_code: CzReferralErrorCodes.RULE_NOT_FOUND,
      });
    }
    return rule;
  }

  /* ----------------------------------------------------------------- runtime */

  /**
   * Pays every step this event just unlocked, at most once each and never past
   * the per-friend cap. `progress` is the friend's running count for threshold
   * triggers, so passing 12 settles the 1, 5 and 10 steps in one call.
   */
  async award(
    referred_id: string,
    trigger: ReferralTrigger,
    progress = 1,
  ): Promise<void> {
    const referral = await this.referrals.findOne({ where: { referred_id } });
    if (!referral) return;

    const meta = REFERRAL_TRIGGER_META[trigger];
    const rules = await this.rules.find({
      where: { trigger, is_active: true },
      order: { threshold: 'ASC' },
    });
    const due = rules.filter(
      (r) =>
        (r.reward_coins > 0 || r.reward_gems > 0) &&
        (!meta.uses_threshold || progress >= r.threshold),
    );
    if (!due.length) return;

    for (const rule of due) {
      await this.payOne(referral, rule);
    }
  }

  /** One step. Clamped by the cap, claimed by the unique index, then credited. */
  private async payOne(
    referral: Referral,
    rule: ReferralRewardRule,
  ): Promise<void> {
    const already = await this.payouts.findOne({
      where: { referral_id: referral.cz_referral_id, rule_id: rule.cz_referral_rule_id },
    });
    if (already) return;

    const [maxCoins, maxGems, paid] = await Promise.all([
      this.settingsService.getNumber(SettingKeys.REFERRAL_MAX_COINS_PER_FRIEND),
      this.settingsService.getNumber(SettingKeys.REFERRAL_MAX_GEMS_PER_FRIEND),
      this.payouts
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.reward_coins), 0)', 'coins')
        .addSelect('COALESCE(SUM(p.reward_gems), 0)', 'gems')
        .where('p.referral_id = :id', { id: referral.cz_referral_id })
        .getRawOne<{ coins: string; gems: string }>(),
    ]);

    const paidCoins = Number(paid?.coins ?? 0);
    const paidGems = Number(paid?.gems ?? 0);

    // 0 means uncapped. A step that would cross the cap pays the remainder only.
    const coins =
      maxCoins > 0
        ? Math.max(0, Math.min(rule.reward_coins, maxCoins - paidCoins))
        : rule.reward_coins;
    const gems =
      maxGems > 0
        ? Math.max(0, Math.min(rule.reward_gems, maxGems - paidGems))
        : rule.reward_gems;

    if (coins <= 0 && gems <= 0) return;

    try {
      await this.payouts.insert({
        referral_id: referral.cz_referral_id,
        referrer_id: referral.referrer_id,
        trigger: rule.trigger,
        rule_id: rule.cz_referral_rule_id,
        reward_coins: coins,
        reward_gems: gems,
      });
    } catch {
      return; // A concurrent call already claimed this step.
    }

    const label = rule.label ?? this.defaultLabel(rule);
    if (coins > 0) {
      await this.walletService.credit({
        user_id: referral.referrer_id,
        currency: 'coin',
        amount: coins,
        type: 'earn',
        source_type: 'referral',
        source_id: referral.cz_referral_id,
        note: `Referral: ${label}`,
      });
    }
    if (gems > 0) {
      await this.walletService.credit({
        user_id: referral.referrer_id,
        currency: 'gem',
        amount: gems,
        type: 'earn',
        source_type: 'referral',
        source_id: referral.cz_referral_id,
        note: `Referral: ${label}`,
      });
    }

    referral.reward_coins = paidCoins + coins;
    if (referral.status !== 'qualified') {
      referral.status = 'qualified';
      referral.qualified_at = new Date();
    }
    await this.referrals.save(referral);

    const parts = [
      coins > 0 ? `${coins} coins` : null,
      gems > 0 ? `${gems} gems` : null,
    ].filter(Boolean);
    await this.notificationsService.push(
      referral.referrer_id,
      'Referral reward earned',
      `${label} — you earned ${parts.join(' and ')}.`,
    );
  }

  /** The admin's per-friend ceilings, with the ladder total folded in. */
  async getCaps() {
    const [maxCoins, maxGems, rules] = await Promise.all([
      this.settingsService.getNumber(SettingKeys.REFERRAL_MAX_COINS_PER_FRIEND),
      this.settingsService.getNumber(SettingKeys.REFERRAL_MAX_GEMS_PER_FRIEND),
      this.rules.find({ where: { is_active: true } }),
    ]);
    const ladderCoins = rules.reduce((s, r) => s + r.reward_coins, 0);
    const ladderGems = rules.reduce((s, r) => s + r.reward_gems, 0);
    return {
      max_coins_per_friend: maxCoins,
      max_gems_per_friend: maxGems,
      effective_max_coins: maxCoins > 0 ? Math.min(maxCoins, ladderCoins) : ladderCoins,
      effective_max_gems: maxGems > 0 ? Math.min(maxGems, ladderGems) : ladderGems,
    };
  }

  /** Everything one referrer has actually been paid by the programme. */
  async getEarnedTotals(referrer_id: string) {
    const row = await this.payouts
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.reward_coins), 0)', 'coins')
      .addSelect('COALESCE(SUM(p.reward_gems), 0)', 'gems')
      .where('p.referrer_id = :id', { id: referrer_id })
      .getRawOne<{ coins: string; gems: string }>();
    return { coins: Number(row?.coins ?? 0), gems: Number(row?.gems ?? 0) };
  }

  /** Which steps a referral has already been paid, newest last. */
  async listPayoutsForReferral(referral_id: string) {
    const data = await this.payouts.find({
      where: { referral_id },
      order: { created_at: 'ASC' },
    });
    return { data, total: data.length };
  }

  /** Per-friend progress for the app's Invite screen. */
  async getPaidRuleIds(referral_id: string): Promise<Set<string>> {
    const rows = await this.payouts.find({
      where: { referral_id },
      select: { rule_id: true },
    });
    return new Set(rows.map((r) => r.rule_id));
  }
}
