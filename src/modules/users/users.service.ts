import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { CzUserErrorCodes } from '../../common/errors/error.constants';
import { generateReferralCode } from '../../common/utils/random.util';
import { toSkipTake } from '../../common/utils/pagination.util';
import {
  extractRequestIp,
  resolveCountryFromRequestHeaders,
} from '../../common/utils/device-platform.util';
import { GeoLookupExternal } from '../../external/geo-lookup.external';
import type { Request } from 'express';
import { WalletService } from '../wallet/wallet.service';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { ReferralRulesService } from '../referrals/referral-rules.service';
import { AdminListUsersDto } from './dto/admin-list-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { OnboardingInfoDto } from './dto/onboarding-info.dto';
import { OnboardingInterestsDto } from './dto/onboarding-interests.dto';
import { AchievementsService } from '../achievements/achievements.service';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { OnboardingGoalDto } from './dto/onboarding-goal.dto';
import { OnboardingPermissionsDto } from './dto/onboarding-permissions.dto';

const BCRYPT_ROUNDS = 12;

/** Fields that count toward profile_completion_pct on the profile screen. */
const PROFILE_FIELDS: Array<keyof User> = [
  'name',
  'gender',
  'age_range',
  'country',
  'avatar_url',
  'email_verified_at',
  'primary_goal',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly walletService: WalletService,
    private readonly referralRulesService: ReferralRulesService,
    private readonly achievementsService: AchievementsService,
    private readonly geoLookup: GeoLookupExternal,
    private readonly settingsService: SettingsService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException({
        cz_error_code: CzUserErrorCodes.EMAIL_ALREADY_REGISTERED,
      });
    }

    const user = this.users.create({
      email,
      password_hash: dto.password
        ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        : null,
      google_id: dto.google_id ?? null,
      name: dto.name ?? null,
      avatar_url: dto.avatar_url ?? null,
      referral_code: await this.nextReferralCode(),
      role: 'user',
      status: 'active',
      email_verified_at: dto.email_verified ? new Date() : null,
    });
    user.profile_completion_pct = this.completionPercent(user);

    const saved = await this.users.save(user);
    await this.walletService.createWallet(saved.cz_user_id);
    return saved;
  }

  findById(cz_user_id: string): Promise<User | null> {
    return this.users.findOne({ where: { cz_user_id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /** Includes password_hash, which is not selected by default. */
  findByEmailWithSecret(email: string): Promise<User | null> {
    return this.users.findOne({
      where: { email: email.toLowerCase().trim() },
      select: [
        'cz_user_id',
        'email',
        'password_hash',
        'phone',
        'name',
        'avatar_url',
        'referral_code',
        'tier',
        'kyc_status',
        'role',
        'status',
        'onboarding_completed',
        'profile_completion_pct',
        'email_verified_at',
      ],
    });
  }

  findByGoogleId(google_id: string): Promise<User | null> {
    return this.users.findOne({ where: { google_id } });
  }

  findByReferralCode(referral_code: string): Promise<User | null> {
    return this.users.findOne({
      where: { referral_code: referral_code.toUpperCase().trim() },
    });
  }

  async getOrFail(cz_user_id: string): Promise<User> {
    const user = await this.findById(cz_user_id);
    if (!user) {
      throw new NotFoundException({
        cz_error_code: CzUserErrorCodes.USER_NOT_FOUND,
      });
    }
    return user;
  }

  /**
   * The user-level fraud aggregate (MAX of device risk_score + union of flags).
   * Both columns are select:false so they never leak on GET /users/me — this
   * reads them explicitly for the admin detail page only.
   */
  async getFraudSummary(
    cz_user_id: string,
  ): Promise<{ fraud_score: number; fraud_flags: string[] }> {
    const row = await this.users
      .createQueryBuilder('u')
      .select(['u.fraud_score', 'u.fraud_flags'])
      .where('u.cz_user_id = :cz_user_id', { cz_user_id })
      .getOne();
    return {
      fraud_score: row?.fraud_score ?? 0,
      fraud_flags: row?.fraud_flags ?? [],
    };
  }

  /**
   * Hard-deletes a user and every row that references them, by email, in one
   * transaction. There are no ON DELETE cascades on the user id, so each child
   * table is cleared explicitly and the users row goes last. Mirrors the
   * scripts/delete-user.ts maintenance utility; the admin delete endpoint calls
   * this. Irreversible — the caller is trusted (admin-only route).
   */
  async hardDeleteByEmail(
    email: string,
  ): Promise<{ cz_user_id: string; email: string }> {
    const found = await this.findByEmail(email);
    if (!found) {
      throw new NotFoundException({
        cz_error_code: CzUserErrorCodes.USER_NOT_FOUND,
      });
    }
    const userId = found.cz_user_id;

    // Tables keyed by user_id; created_by tables are admin-authored content and
    // are detached (nulled) rather than deleted. Kept in sync with delete-user.ts.
    const userIdTables = [
      'daily_checkins',
      'daily_chest_claims',
      'gift_card_orders',
      'kyc_verifications',
      'lucky_draw_entries',
      'lucky_draw_winners',
      'notifications',
      'offer_clicks',
      'offerwall_postbacks',
      'push_campaign_events',
      'quiz_attempts',
      'reward_plays',
      'scratch_card_grants',
      'scratch_history',
      'spin_history',
      'support_tickets',
      'user_achievements',
      'user_challenge_progress',
      'wallet_transactions',
      'withdrawal_requests',
    ];
    const czUserIdTables = ['user_devices', 'user_streaks', 'wallets'];
    const createdByTables = ['push_campaigns', 'push_templates'];

    await this.users.manager.transaction(async (tx) => {
      for (const table of userIdTables) {
        await tx.query(`DELETE FROM "${table}" WHERE user_id = $1`, [userId]);
      }
      for (const table of czUserIdTables) {
        await tx.query(`DELETE FROM "${table}" WHERE cz_user_id = $1`, [userId]);
      }
      for (const table of createdByTables) {
        await tx.query(
          `UPDATE "${table}" SET created_by = NULL WHERE created_by = $1`,
          [userId],
        );
      }
      // Detach anyone this user referred so the users row can go.
      await tx.query('UPDATE users SET referred_by = NULL WHERE referred_by = $1', [
        userId,
      ]);
      await tx.query('DELETE FROM users WHERE cz_user_id = $1', [userId]);
    });

    return { cz_user_id: userId, email: found.email };
  }

  /** The in-app "Delete account" action: the same irreversible wipe the admin delete runs. */
  async deleteSelf(
    cz_user_id: string,
  ): Promise<{ cz_user_id: string; email: string }> {
    const user = await this.getOrFail(cz_user_id);
    return this.hardDeleteByEmail(user.email);
  }

  async updateProfile(
    cz_user_id: string,
    dto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.getOrFail(cz_user_id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.age_range !== undefined) user.age_range = dto.age_range;
    if (dto.country !== undefined) user.country = dto.country;
    if (dto.avatar_url !== undefined) user.avatar_url = dto.avatar_url;
    if (dto.interests !== undefined) user.interests = dto.interests;
    if (dto.phone !== undefined) {
      const owner = await this.users.findOne({ where: { phone: dto.phone } });
      if (owner && owner.cz_user_id !== cz_user_id) {
        throw new ConflictException({
          cz_error_code: CzUserErrorCodes.PHONE_ALREADY_LINKED,
        });
      }
      user.phone = dto.phone;
    }
    user.profile_completion_pct = this.completionPercent(user);
    return this.saveWithoutSecret(user);
  }

  async saveOnboardingInfo(
    cz_user_id: string,
    dto: OnboardingInfoDto,
    req: Request,
  ): Promise<User> {
    const user = await this.getOrFail(cz_user_id);
    user.name = dto.name;
    user.gender = dto.gender;
    user.age_range = dto.age_range;
    // Country is server-derived, never trusted from the client — same as the
    // device row and Rewardtym: edge header first, then IP geo, else leave it.
    const country = await this.resolveCountry(req);
    if (country) user.country = country;
    user.profile_completion_pct = this.completionPercent(user);
    return this.saveWithoutSecret(user);
  }

  /** ISO country from a request: CDN edge header first, then IP geo, else null. */
  private async resolveCountry(req: Request): Promise<string | null> {
    const fromHeader = resolveCountryFromRequestHeaders(req);
    if (fromHeader) return fromHeader;
    const ip = extractRequestIp(req);
    if (!ip) return null;
    const geo = await this.geoLookup.lookup(ip);
    return geo.country_code;
  }

  async saveOnboardingPermissions(
    cz_user_id: string,
    dto: OnboardingPermissionsDto,
  ): Promise<User> {
    await this.users.update(
      { cz_user_id },
      { notifications_enabled: dto.notifications_enabled },
    );
    return this.getOrFail(cz_user_id);
  }

  /**
   * Merges the categories the user changed into what is already stored, so a
   * screen that only sends one toggle never wipes the others.
   */
  async updateNotificationPreferences(
    cz_user_id: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<User> {
    const user = await this.getOrFail(cz_user_id);
    const { notifications_enabled, ...categories } = dto;
    user.notification_preferences = {
      ...user.notification_preferences,
      ...categories,
    };
    if (notifications_enabled !== undefined) {
      user.notifications_enabled = notifications_enabled;
    }
    return this.saveWithoutSecret(user);
  }

  async saveOnboardingInterests(
    cz_user_id: string,
    dto: OnboardingInterestsDto,
  ): Promise<User> {
    await this.users.update({ cz_user_id }, { interests: dto.interests });
    return this.getOrFail(cz_user_id);
  }

  /** Last onboarding step — picking a goal completes account setup. */
  async saveOnboardingGoal(
    cz_user_id: string,
    dto: OnboardingGoalDto,
  ): Promise<User> {
    // Conditional flip so a double submit can't pay the welcome bonus twice.
    const { affected } = await this.users.update(
      { cz_user_id, onboarding_completed: false },
      { onboarding_completed: true },
    );
    const user = await this.getOrFail(cz_user_id);
    user.primary_goal = dto.primary_goal;
    user.onboarding_completed = true;
    user.profile_completion_pct = this.completionPercent(user);
    const saved = await this.saveWithoutSecret(user);
    if (affected) await this.creditWelcomeBonus(cz_user_id);
    await this.referralRulesService.award(cz_user_id, 'onboarding_completed');
    await this.achievementsService.trackProgress(cz_user_id, 'onboarding_completed');
    return saved;
  }

  private async creditWelcomeBonus(cz_user_id: string): Promise<void> {
    const gems = await this.settingsService.getNumber(
      SettingKeys.WELCOME_BONUS_GEMS,
    );
    if (gems <= 0) return;
    await this.walletService.credit({
      user_id: cz_user_id,
      currency: 'gem',
      amount: Math.floor(gems),
      type: 'earn',
      source_type: 'welcome_bonus',
      note: 'Welcome bonus',
    });
  }

  async markEmailVerified(cz_user_id: string): Promise<User> {
    const user = await this.getOrFail(cz_user_id);
    const wasVerified = user.email_verified_at !== null;
    user.email_verified_at = new Date();
    user.profile_completion_pct = this.completionPercent(user);
    const saved = await this.saveWithoutSecret(user);
    if (!wasVerified) {
      await this.referralRulesService.award(cz_user_id, 'email_verified');
    }
    return saved;
  }

  async setReferredBy(cz_user_id: string, referrer_id: string): Promise<void> {
    await this.users.update({ cz_user_id }, { referred_by: referrer_id });
  }

  async setKycStatus(
    cz_user_id: string,
    kyc_status: User['kyc_status'],
  ): Promise<void> {
    await this.users.update({ cz_user_id }, { kyc_status });
  }

  async touchLastLogin(cz_user_id: string): Promise<void> {
    await this.users.update({ cz_user_id }, { last_login_at: new Date() });
  }

  async setPassword(cz_user_id: string, password: string): Promise<void> {
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.users.update({ cz_user_id }, { password_hash });
  }

  /** Admin table: every user with their wallet balance, newest first. */
  async listAllAdmin(query: AdminListUsersDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const builder = this.users
      .createQueryBuilder('u')
      .select([
        'u.cz_user_id',
        'u.email',
        'u.name',
        'u.phone',
        'u.avatar_url',
        'u.tier',
        'u.kyc_status',
        'u.status',
        'u.role',
        'u.country',
        'u.referral_code',
        'u.created_at',
        'u.last_login_at',
        // select:false columns — pulled in explicitly for the admin risk badge.
        'u.fraud_score',
        'u.fraud_flags',
      ])
      .orderBy('u.created_at', 'DESC')
      .skip(skip)
      .take(take);

    if (query.search) {
      builder.andWhere(
        '(u.email ILIKE :search OR u.name ILIKE :search OR u.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.status) {
      builder.andWhere('u.status = :status', { status: query.status });
    }
    if (query.kyc_status) {
      builder.andWhere('u.kyc_status = :kyc_status', {
        kyc_status: query.kyc_status,
      });
    }
    if (query.tier) {
      builder.andWhere('u.tier = :tier', { tier: query.tier });
    }
    if (query.country) {
      builder.andWhere('u.country = :country', { country: query.country });
    }
    if (query.medal) {
      builder.andWhere(
        `u.cz_user_id IN (
           SELECT ua.user_id FROM user_achievements ua
           JOIN achievements a ON a.cz_achievement_id = ua.achievement_id
           WHERE a.slug = :medal AND ua.unlocked_at IS NOT NULL
         )`,
        { medal: query.medal },
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

    const [users, total] = await builder.getManyAndCount();

    const ids = users.map((u) => u.cz_user_id);
    const [balances, medals] = await Promise.all([
      this.walletService.getBalances(ids),
      this.achievementsService.currentMedals(ids),
    ]);

    const data = users.map((u) => {
      const { created_at, ...rest } = u;
      const wallet = balances.get(u.cz_user_id);
      return {
        ...rest,
        joined_at: created_at,
        coin_balance: wallet?.coin_balance ?? 0,
        gem_balance: wallet?.gem_balance ?? 0,
        /** Rarest medal they hold, for the row's badge. Null when none. */
        medal: medals.get(u.cz_user_id) ?? null,
        /** User-level fraud aggregate for the row's risk badge. */
        fraud_score: u.fraud_score ?? 0,
        fraud_flags: u.fraud_flags ?? [],
      };
    });

    return { data, total };
  }

  /** save() re-attaches password_hash (as null) even though select:false keeps it off find(). */
  private async saveWithoutSecret(user: User): Promise<User> {
    const saved = await this.users.save(user);
    delete (saved as { password_hash?: string | null }).password_hash;
    return saved;
  }

  private completionPercent(user: User): number {
    const filled = PROFILE_FIELDS.filter((field) => Boolean(user[field]));
    return Math.round((filled.length / PROFILE_FIELDS.length) * 100);
  }

  /** Retries until the random code is free; collisions are very rare. */
  private async nextReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode();
      const taken = await this.users.findOne({
        where: { referral_code: code },
      });
      if (!taken) return code;
    }
    return generateReferralCode(12);
  }
}
