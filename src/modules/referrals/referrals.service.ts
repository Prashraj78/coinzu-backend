import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Env } from '../../common/config/env';
import { CzUserErrorCodes } from '../../common/errors/error.constants';
import { Referral } from '../../database/entities/referral.entity';
import { ReferralTierConfig } from '../../database/entities/referral-tier-config.entity';
import { User } from '../../database/entities/user.entity';
import { toSkipTake } from '../../common/utils/pagination.util';
import { WalletService } from '../wallet/wallet.service';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminListReferralsDto } from './dto/admin-list-referrals.dto';
import { ReferralRulesService } from './referral-rules.service';
import type { ReferralTrigger } from '../../database/entities/referral-reward-rule.entity';
import { AchievementsService } from '../achievements/achievements.service';

/** The Invite screen shows a recent list, not the full history. */
const FRIENDS_LIMIT = 20;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referrals: Repository<Referral>,
    @InjectRepository(ReferralTierConfig)
    private readonly tiers: Repository<ReferralTierConfig>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly walletService: WalletService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly rulesService: ReferralRulesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * Links a new signup to whoever owns the code. A bad or self-referral code is
   * ignored rather than failing signup — the account still gets created.
   */
  async attachReferrer(
    referred_id: string,
    referral_code: string,
  ): Promise<Referral | null> {
    const [referrer, existing] = await Promise.all([
      this.users.findOne({
        where: { referral_code: referral_code.toUpperCase().trim() },
        select: { cz_user_id: true },
      }),
      this.referrals.findOne({ where: { referred_id } }),
    ]);
    if (!referrer || referrer.cz_user_id === referred_id) {
      this.logger.warn(`Ignored referral code "${referral_code}" on signup.`);
      return null;
    }
    if (existing) return existing;

    await this.users.update(
      { cz_user_id: referred_id },
      { referred_by: referrer.cz_user_id },
    );

    const referral = this.referrals.create({
      referrer_id: referrer.cz_user_id,
      referred_id,
      status: 'pending',
    });
    const saved = await this.referrals.save(referral);

    // Pays immediately if the admin put a reward on the signup step.
    await this.rulesService.award(referred_id, 'signup');

    // The new user's own referrer may sit one level up: if whoever invited
    // *them* was themselves invited, that grandparent's "invites others" step
    // moves forward.
    const invitesMade = await this.referrals.count({
      where: { referrer_id: referrer.cz_user_id },
    });
    // Absolute, not incremental: the count is the standing figure.
    void this.achievementsService.setProgress(
      referrer.cz_user_id,
      'refer_friend',
      invitesMade,
    );
    await this.rulesService.award(
      referrer.cz_user_id,
      'referrals_made',
      invitesMade,
    );
    return saved;
  }

  /**
   * A referral step the invited friend just cleared. The rule ladder decides
   * whether anything is owed, so every hook can call this unconditionally.
   * `progress` only matters for `offers_completed`.
   */
  async recordTrigger(
    referred_id: string,
    trigger: ReferralTrigger,
    progress = 1,
  ): Promise<void> {
    const referral = await this.referrals.findOne({ where: { referred_id } });
    if (!referral) return;

    await this.rulesService.award(referred_id, trigger, progress);
    await this.updateTier(referral.referrer_id);
  }

  /** Single-event step: nothing to count, the event itself is the proof. */
  async recordEvent(referred_id: string, trigger: ReferralTrigger): Promise<void> {
    await this.recordTrigger(referred_id, trigger, 1);
  }

  /**
   * Called when the referred user completes an offer. Counts their approved
   * offers so far and lets the ladder decide.
   */
  async qualify(referred_id: string): Promise<void> {
    const completed = await this.countCompletedOffers(referred_id);
    await this.recordTrigger(referred_id, 'offers_completed', completed);
  }

  private async countCompletedOffers(user_id: string): Promise<number> {
    const row = await this.referrals.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('offer_completions', 'oc')
      .innerJoin('offer_clicks', 'c', 'c.cz_offer_click_id = oc.offer_click_id')
      .where('c.user_id = :user_id', { user_id })
      .andWhere("oc.status = 'approved'")
      .getRawOne<{ count: string }>();
    return Number(row?.count ?? 0);
  }

  /** Records which invite milestone the referrer has now reached. */
  private async updateTier(referrer_id: string): Promise<void> {
    const [qualifiedCount, tiers] = await Promise.all([
      this.referrals.count({ where: { referrer_id, status: 'qualified' } }),
      this.tiers.find({
        where: { is_active: true },
        order: { invites_required: 'ASC' },
      }),
    ]);

    const reached = tiers.filter((tier) => tier.invites_required <= qualifiedCount);
    if (reached.length === 0) return;

    const highest = reached[reached.length - 1];
    await this.referrals.update(
      { referrer_id, status: 'qualified' },
      { tier_reached: highest.reward_type },
    );
  }

  /**
   * The Invite a Friend screen. Returns the link, the live reward ladder step
   * by step, the ceiling one friend can earn, and what this user has actually
   * earned so far — everything the screen renders, none of it hardcoded.
   */
  async getInviteInfo(user_id: string) {
    const [user, ladder, caps, counts, earned, friends] = await Promise.all([
      this.users.findOne({
        where: { cz_user_id: user_id },
        select: { cz_user_id: true, referral_code: true },
      }),
      this.rulesService.listActiveLadder(),
      this.rulesService.getCaps(),
      this.referrals
        .createQueryBuilder('r')
        .select('COUNT(*)', 'invited')
        .addSelect(
          `COUNT(*) FILTER (WHERE r.status = 'qualified')`,
          'qualified',
        )
        .where('r.referrer_id = :id', { id: user_id })
        .getRawOne<{ invited: string; qualified: string }>(),
      this.rulesService.getEarnedTotals(user_id),
      this.listFriends(user_id),
    ]);

    const ladderCoins = ladder.reduce((s, r) => s + r.reward_coins, 0);
    const ladderGems = ladder.reduce((s, r) => s + r.reward_gems, 0);

    return {
      referral_code: user?.referral_code ?? null,
      referral_link: user?.referral_code
        ? `${Env.urls.frontend}/ref/${user.referral_code}`
        : null,
      /** Every step, in the order the friend will clear them. */
      reward_steps: ladder.map((step, i) => ({ step: i + 1, ...step })),
      /** The most one friend can ever earn, after the admin's caps are applied. */
      max_per_friend: {
        coins: caps.effective_max_coins,
        gems: caps.effective_max_gems,
        is_capped:
          (caps.max_coins_per_friend > 0 &&
            caps.max_coins_per_friend < ladderCoins) ||
          (caps.max_gems_per_friend > 0 && caps.max_gems_per_friend < ladderGems),
      },
      stats: {
        friends_invited: Number(counts?.invited ?? 0),
        friends_qualified: Number(counts?.qualified ?? 0),
        coins_earned: earned.coins,
        gems_earned: earned.gems,
      },
      /** The people this user invited, newest first, capped so the screen stays light. */
      friends,
    };
  }

  /** Invited friends with just enough detail for the screen's list. */
  private async listFriends(referrer_id: string) {
    const rows = await this.referrals
      .createQueryBuilder('r')
      .leftJoin('users', 'u', 'u.cz_user_id = r.referred_id')
      .select([
        'r.cz_referral_id AS cz_referral_id',
        'r.status AS status',
        'r.reward_coins AS reward_coins',
        'r.qualified_at AS qualified_at',
        'r.created_at AS created_at',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
      ])
      .where('r.referrer_id = :id', { id: referrer_id })
      .orderBy('r.created_at', 'DESC')
      .limit(FRIENDS_LIMIT)
      .getRawMany<{
        cz_referral_id: string;
        status: string;
        reward_coins: number;
        qualified_at: Date | null;
        created_at: Date;
        name: string | null;
        avatar_url: string | null;
      }>();

    return rows.map((r) => ({
      cz_referral_id: r.cz_referral_id,
      name: r.name,
      avatar_url: r.avatar_url,
      status: r.status,
      reward_coins: Number(r.reward_coins ?? 0),
      qualified_at: r.qualified_at,
      joined_at: r.created_at,
    }));
  }

  async getSummary(user_id: string) {
    const [user, total_invited, total_qualified, tiers] = await Promise.all([
      this.users.findOne({
        where: { cz_user_id: user_id },
        select: { cz_user_id: true, referral_code: true },
      }),
      this.referrals.count({ where: { referrer_id: user_id } }),
      this.referrals.count({
        where: { referrer_id: user_id, status: 'qualified' },
      }),
      this.tiers.find({
        where: { is_active: true },
        order: { invites_required: 'ASC' },
      }),
    ]);

    const milestones = tiers.map((tier) => ({
      invites_required: tier.invites_required,
      reward_type: tier.reward_type,
      reward_value: tier.reward_value,
      reward_coins: tier.reward_coins,
      is_unlocked: total_qualified >= tier.invites_required,
    }));

    return {
      referral_code: user?.referral_code ?? null,
      total_invited,
      total_qualified,
      milestones,
    };
  }



  /** Admin table: every user, with their referral counts and coins earned. */
  async listAllAdmin(query: AdminListReferralsDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const builder = this.users
      .createQueryBuilder('u')
      .select([
        'u.cz_user_id',
        'u.email',
        'u.name',
        'u.referral_code',
        'u.created_at',
      ])
      .orderBy('u.created_at', 'DESC')
      .skip(skip)
      .take(take);

    if (query.search) {
      builder.andWhere(
        '(u.email ILIKE :search OR u.name ILIKE :search OR u.referral_code ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.date_from) {
      builder.andWhere('u.created_at >= :date_from', {
        date_from: query.date_from,
      });
    }
    if (query.date_end) {
      builder.andWhere("u.created_at < (:date_end::date + interval '1 day')", {
        date_end: query.date_end,
      });
    }
    if (query.has_referrals !== undefined) {
      const exists = query.has_referrals ? 'EXISTS' : 'NOT EXISTS';
      builder.andWhere(
        `${exists} (SELECT 1 FROM referrals r WHERE r.referrer_id = u.cz_user_id)`,
      );
    }

    const [users, total] = await builder.getManyAndCount();

    const referrerIds = users.map((u) => u.cz_user_id);
    const stats = referrerIds.length
      ? await this.referrals
          .createQueryBuilder('r')
          .select('r.referrer_id', 'referrer_id')
          .addSelect('COUNT(*)', 'friends_invited')
          .addSelect(
            `COUNT(*) FILTER (WHERE r.status = 'qualified')`,
            'qualified_invites',
          )
          .addSelect('COALESCE(SUM(r.reward_coins), 0)', 'coins_earned')
          .where('r.referrer_id IN (:...ids)', { ids: referrerIds })
          .groupBy('r.referrer_id')
          .getRawMany<{
            referrer_id: string;
            friends_invited: string;
            qualified_invites: string;
            coins_earned: string;
          }>()
      : [];
    const byUserId = new Map(stats.map((s) => [s.referrer_id, s]));

    const data = users.map((u) => {
      const s = byUserId.get(u.cz_user_id);
      return {
        cz_user_id: u.cz_user_id,
        email: u.email,
        name: u.name,
        referral_code: u.referral_code,
        friends_invited: Number(s?.friends_invited ?? 0),
        qualified_invites: Number(s?.qualified_invites ?? 0),
        coins_earned: Number(s?.coins_earned ?? 0),
        gems_earned: 0,
        joined_at: u.created_at,
      };
    });

    return { data, total };
  }

  /** Admin detail page: one user's referral summary plus who they invited. */
  async getAdminDetail(cz_user_id: string, page?: number, limit?: number) {
    const user = await this.users.findOne({
      where: { cz_user_id },
      select: {
        cz_user_id: true,
        email: true,
        name: true,
        referral_code: true,
        created_at: true,
      },
    });
    if (!user) {
      throw new NotFoundException({
        cz_error_code: CzUserErrorCodes.USER_NOT_FOUND,
      });
    }

    const { skip, take } = toSkipTake(page, limit);
    const [total_invited, total_qualified, coins_earned, invited] =
      await Promise.all([
        this.referrals.count({ where: { referrer_id: cz_user_id } }),
        this.referrals.count({
          where: { referrer_id: cz_user_id, status: 'qualified' },
        }),
        this.referrals
          .createQueryBuilder('r')
          .select('COALESCE(SUM(r.reward_coins), 0)', 'sum')
          .where('r.referrer_id = :cz_user_id', { cz_user_id })
          .getRawOne<{ sum: string }>()
          .then((row) => Number(row?.sum ?? 0)),
        this.referrals
          .createQueryBuilder('r')
          .innerJoin(User, 'u', 'u.cz_user_id = r.referred_id')
          .select([
            'r.cz_referral_id AS cz_referral_id',
            'r.status AS status',
            'r.reward_coins AS reward_coins',
            'r.qualified_at AS qualified_at',
            'r.created_at AS created_at',
            'u.cz_user_id AS cz_user_id',
            'u.email AS email',
            'u.name AS name',
          ])
          .where('r.referrer_id = :cz_user_id', { cz_user_id })
          .orderBy('r.created_at', 'DESC')
          .skip(skip)
          .take(take)
          .getRawMany(),
      ]);

    return {
      user: {
        cz_user_id: user.cz_user_id,
        email: user.email,
        name: user.name,
        referral_code: user.referral_code,
        joined_at: user.created_at,
      },
      total_invited,
      total_qualified,
      coins_earned,
      gems_earned: 0,
      invited: { data: invited, total: total_invited },
    };
  }
}
