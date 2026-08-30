import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycVerification } from '../../../database/entities/kyc-verification.entity';
import { User } from '../../../database/entities/user.entity';
import { CzKycErrorCodes } from '../../../common/errors/error.constants';
import { toSkipTake } from '../../../common/utils/pagination.util';
import { AdminListKycDto } from '../../kyc/dto/admin-list-kyc.dto';
import { DecideKycDto } from '../../kyc/dto/decide-kyc.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { AchievementsService } from '../../achievements/achievements.service';

interface Row {
  cz_kyc_verification_id: string;
  user_id: string;
  selfie_url: string;
  rekognition_score: number | null;
  status: string;
  rejection_code: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  email: string;
  name: string | null;
  avatar_url: string | null;
  country: string | null;
  user_kyc_status: string;
}

/** Admin KYC tab: one row per attempt, with the user who made it. */
@Injectable()
export class AdminKycService {
  constructor(
    @InjectRepository(KycVerification)
    private readonly verifications: Repository<KycVerification>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async list(query: AdminListKycDto) {
    const { skip, take } = toSkipTake(query.page, query.limit);

    const base = () =>
      this.verifications
        .createQueryBuilder('k')
        .innerJoin('users', 'u', 'u.cz_user_id = k.user_id');

    const builder = base()
      .select([
        'k.cz_kyc_verification_id AS cz_kyc_verification_id',
        'k.user_id AS user_id',
        'k.selfie_url AS selfie_url',
        'k.rekognition_score AS rekognition_score',
        'k.status AS status',
        'k.rejection_code AS rejection_code',
        'k.rejection_reason AS rejection_reason',
        'k.reviewed_by AS reviewed_by',
        'k.reviewed_at AS reviewed_at',
        'k.created_at AS created_at',
        'u.email AS email',
        'u.name AS name',
        'u.avatar_url AS avatar_url',
        'u.country AS country',
        'u.kyc_status AS user_kyc_status',
      ])
      .orderBy('k.created_at', 'DESC')
      .offset(skip)
      .limit(take);

    const countBuilder = base();

    for (const b of [builder, countBuilder]) {
      if (query.search) {
        b.andWhere('(u.email ILIKE :s OR u.name ILIKE :s)', {
          s: `%${query.search}%`,
        });
      }
      if (query.status) {
        b.andWhere('k.status = :status', { status: query.status });
      }
      if (query.date_from) {
        b.andWhere('k.created_at >= :date_from', { date_from: query.date_from });
      }
      if (query.date_end) {
        b.andWhere("k.created_at < (:date_end::date + interval '1 day')", {
          date_end: query.date_end,
        });
      }
    }

    const [rows, total, counts] = await Promise.all([
      builder.getRawMany<Row>(),
      countBuilder.getCount(),
      this.statusCounts(),
    ]);

    const data = rows.map((r) => ({
      cz_kyc_verification_id: r.cz_kyc_verification_id,
      selfie_url: r.selfie_url,
      rekognition_score: r.rekognition_score,
      status: r.status,
      rejection_code: r.rejection_code,
      rejection_reason: r.rejection_reason,
      reviewed_by: r.reviewed_by,
      reviewed_at: r.reviewed_at,
      created_at: r.created_at,
      user: {
        cz_user_id: r.user_id,
        email: r.email,
        name: r.name,
        avatar_url: r.avatar_url,
        country: r.country,
        kyc_status: r.user_kyc_status,
      },
    }));

    return { data, total, counts };
  }

  /** Attempt counts per outcome, for the tab's header tiles. */
  private async statusCounts() {
    const rows = await this.verifications
      .createQueryBuilder('k')
      .select('k.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('k.status')
      .getRawMany<{ status: string; count: string }>();

    const out: Record<string, number> = {
      pending: 0,
      verified: 0,
      rejected: 0,
      manual_review: 0,
    };
    for (const r of rows) out[r.status] = Number(r.count);
    out.total = Object.values(out).reduce((a, b) => a + b, 0);
    return out;
  }

  /**
   * A super admin's verdict on an attempt the face check could not settle.
   * Writes both the attempt and the account, then tells the user.
   */
  async decide(
    cz_kyc_verification_id: string,
    dto: DecideKycDto,
    admin_id: string,
  ) {
    const attempt = await this.verifications.findOne({
      where: { cz_kyc_verification_id },
    });
    if (!attempt) {
      throw new NotFoundException({
        cz_error_code: CzKycErrorCodes.VERIFICATION_NOT_FOUND,
      });
    }
    // An auto-rejection is an override candidate, so it stays decidable. Only a
    // verified account is final — revoking one is not a KYC-tab action.
    if (attempt.status === 'verified') {
      throw new ConflictException({
        cz_error_code: CzKycErrorCodes.DECISION_ALREADY_MADE,
      });
    }

    const approved = dto.decision === 'approve';
    attempt.status = approved ? 'verified' : 'rejected';
    attempt.reviewed_by = admin_id;
    attempt.reviewed_at = new Date();
    attempt.rejection_reason = approved
      ? null
      : (dto.reason ??
        'Your selfie did not pass our checks. Please try again with better lighting.');
    attempt.rejection_code = null;
    await this.verifications.save(attempt);

    await this.users.update(
      { cz_user_id: attempt.user_id },
      { kyc_status: approved ? 'verified' : 'rejected' },
    );

    if (approved) {
      await this.achievementsService.trackProgress(attempt.user_id, 'kyc_verified');
    }

    await this.notifications.push(
      attempt.user_id,
      approved ? 'Identity verified' : 'Verification unsuccessful',
      approved
        ? 'Your identity has been verified. Withdrawals are now open.'
        : (attempt.rejection_reason ?? 'Please try your selfie again.'),
    );

    return this.detail(cz_kyc_verification_id);
  }

  /** One attempt, the user behind it, and every other attempt they made. */
  async detail(cz_kyc_verification_id: string) {
    const attempt = await this.verifications.findOne({
      where: { cz_kyc_verification_id },
    });
    if (!attempt) {
      throw new NotFoundException({
        cz_error_code: CzKycErrorCodes.VERIFICATION_NOT_FOUND,
      });
    }

    const [user, history] = await Promise.all([
      this.users.findOne({
        where: { cz_user_id: attempt.user_id },
        select: {
          cz_user_id: true,
          email: true,
          name: true,
          avatar_url: true,
          country: true,
          status: true,
          kyc_status: true,
          created_at: true,
        },
      }),
      this.verifications.find({
        where: { user_id: attempt.user_id },
        order: { created_at: 'DESC' },
      }),
    ]);

    return {
      attempt,
      user: user
        ? { ...user, joined_at: user.created_at, created_at: undefined }
        : null,
      /** Every attempt this user has made, newest first, including this one. */
      attempts: { data: history, total: history.length },
    };
  }
}
