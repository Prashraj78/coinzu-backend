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
import { WalletService } from '../wallet/wallet.service';
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
  ): Promise<User> {
    const user = await this.getOrFail(cz_user_id);
    user.name = dto.name;
    user.gender = dto.gender;
    user.age_range = dto.age_range;
    user.country = dto.country;
    user.profile_completion_pct = this.completionPercent(user);
    return this.saveWithoutSecret(user);
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
    const user = await this.getOrFail(cz_user_id);
    user.primary_goal = dto.primary_goal;
    user.onboarding_completed = true;
    user.profile_completion_pct = this.completionPercent(user);
    const saved = await this.saveWithoutSecret(user);
    await this.referralRulesService.award(cz_user_id, 'onboarding_completed');
    await this.achievementsService.trackProgress(cz_user_id, 'onboarding_completed');
    return saved;
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
