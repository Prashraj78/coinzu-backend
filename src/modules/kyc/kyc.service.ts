import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KycVerification,
  type KycStatus,
} from '../../database/entities/kyc-verification.entity';
import { CzKycErrorCodes } from '../../common/errors/error.constants';
import { toSkipTake } from '../../common/utils/pagination.util';
import {
  R2StorageExternal,
  UploadedFile,
} from '../../external/r2-storage.external';
import { SettingsService } from '../settings/settings.service';
import { SettingKeys } from '../settings/setting.keys';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralRulesService } from '../referrals/referral-rules.service';
import {
  RekognitionFaceExternal,
  FaceCheckResult,
} from '../../external/rekognition-face.external';

/** What the app is allowed to see. Score and raw response stay internal. */
const USER_FIELDS = {
  cz_kyc_verification_id: true,
  status: true,
  rejection_code: true,
  rejection_reason: true,
  selfie_url: true,
  reviewed_at: true,
  created_at: true,
} as const;

/** Sentence shown to the user for each automatic outcome. */
const OUTCOME_MESSAGE: Record<KycStatus, string> = {
  pending: 'Your photo is queued for checking.',
  verified: 'Your identity is verified. Withdrawals are unlocked.',
  manual_review:
    'Thanks — a team member is checking your photo. This usually takes a day.',
  rejected: 'We could not verify that photo. Please try again.',
};

const REJECTION_MESSAGE: Record<string, string> = {
  [CzKycErrorCodes.NO_FACE_DETECTED]:
    'We could not find a face in that photo. Please retake it in good light with your face clearly visible.',
  [CzKycErrorCodes.MULTIPLE_FACES_DETECTED]:
    'We found more than one face in that photo. Please retake it with only you in the frame.',
};

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycVerification)
    private readonly verifications: Repository<KycVerification>,
    private readonly face: RekognitionFaceExternal,
    private readonly r2Storage: R2StorageExternal,
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly referralRulesService: ReferralRulesService,
  ) {}

  /** Admin surface only. The app reads `kyc_status` off `GET /api/users/me`. */
  async getStatus(user_id: string) {
    const [user, latest] = await Promise.all([
      this.usersService.getOrFail(user_id),
      this.verifications.findOne({
        where: { user_id },
        order: { created_at: 'DESC' },
        select: USER_FIELDS,
      }),
    ]);

    return {
      kyc_status: user.kyc_status,
      latest_attempt: latest ?? null,
      reason_code: latest?.rejection_code ?? null,
      reason: this.reasonText(latest),
      can_retry: user.kyc_status !== 'verified' && latest?.status !== 'pending',
    };
  }

  /**
   * Uploads the selfie, runs face detection, and decides on the spot.
   * A borderline score goes to a human instead of failing the user.
   */
  async submitSelfie(user_id: string, file?: UploadedFile) {
    const [user, pending] = await Promise.all([
      this.usersService.getOrFail(user_id),
      this.verifications.findOne({
        where: { user_id, status: 'pending' },
        select: { cz_kyc_verification_id: true },
      }),
    ]);
    if (user.kyc_status === 'verified') {
      throw new BadRequestException({
        cz_error_code: CzKycErrorCodes.ALREADY_VERIFIED,
      });
    }
    if (pending) {
      throw new BadRequestException({
        cz_error_code: CzKycErrorCodes.REVIEW_IN_PROGRESS,
      });
    }

    const image = this.r2Storage.validateImage(file);
    const selfie_url = await this.r2Storage.upload('kyc', image);

    // Anything thrown here leaves no row and no status change, so the user is
    // exactly where they were and can simply try again.
    const [result, threshold] = await Promise.all([
      this.face.detectFaces(image.buffer),
      this.confidenceThreshold(),
    ]);

    const rejection_code = this.rejectionCodeFor(result);
    const status = this.decideStatus(result, threshold, rejection_code);

    const row = this.verifications.create({
      user_id,
      selfie_url,
      rekognition_score: result.confidence,
      rekognition_response: result.raw,
      status,
      rejection_code,
      rejection_reason: rejection_code ? REJECTION_MESSAGE[rejection_code] : null,
      // An automatic pass is still a decision, with nobody behind it.
      reviewed_by: null,
      reviewed_at: status === 'pending' ? null : new Date(),
    });
    const saved = await this.verifications.save(row);

    await Promise.all([
      this.usersService.setKycStatus(user_id, status),
      this.notifyUser(user_id, status, saved.rejection_reason),
    ]);

    return {
      cz_kyc_verification_id: saved.cz_kyc_verification_id,
      kyc_status: status,
      status: saved.status,
      reason_code: saved.rejection_code,
      message: saved.rejection_reason ?? OUTCOME_MESSAGE[saved.status],
      selfie_url: saved.selfie_url,
      // The app reads its next move straight off this response.
      can_retry: status !== 'verified' && status !== 'pending',
      is_final: status === 'verified',
      submitted_at: saved.created_at,
    };
  }

  /** Zero or many faces means the photo cannot be judged at all. */
  private rejectionCodeFor(result: FaceCheckResult): string | null {
    if (result.face_count === 0) return CzKycErrorCodes.NO_FACE_DETECTED;
    if (result.face_count > 1) return CzKycErrorCodes.MULTIPLE_FACES_DETECTED;
    return null;
  }

  /**
   * One clear face above the threshold passes outright. One face that is
   * covered, blurry, blinking or just short of the threshold goes to a human —
   * we would rather look at it than turn a real user away.
   */
  private decideStatus(
    result: FaceCheckResult,
    threshold: number,
    rejection_code: string | null,
  ): KycStatus {
    if (rejection_code) return 'rejected';

    const clean =
      result.eyes_open &&
      !result.sunglasses &&
      !result.face_occluded &&
      result.sharp;

    if (result.confidence >= threshold && clean) return 'verified';
    return 'manual_review';
  }

  private async confidenceThreshold(): Promise<number> {
    return this.settingsService.getNumber(SettingKeys.KYC_CONFIDENCE_THRESHOLD);
  }

  private reasonText(row?: KycVerification | null): string | null {
    if (!row || row.status !== 'rejected') return null;
    return row.rejection_reason ?? OUTCOME_MESSAGE.rejected;
  }

  /** Every attempt for one user, newest first. Admin surface only. */
  async listForUser(user_id: string, page?: number, limit?: number) {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.verifications.findAndCount({
      where: { user_id },
      order: { created_at: 'DESC' },
      select: USER_FIELDS,
      skip,
      take,
    });
    return { data, total };
  }

  private async notifyUser(
    user_id: string,
    status: KycStatus,
    reason: string | null,
  ): Promise<void> {
    if (status === 'verified') {
      await this.notificationsService.push(
        user_id,
        'Identity verified',
        'Your identity check passed. Withdrawals are now unlocked.',
      );
      // Pays the referrer if the admin put a reward on the KYC step.
      await this.referralRulesService.award(user_id, 'kyc_verified');
      return;
    }
    if (status === 'rejected') {
      await this.notificationsService.push(
        user_id,
        'Identity check rejected',
        reason ?? OUTCOME_MESSAGE.rejected,
      );
      return;
    }
    await this.notificationsService.push(
      user_id,
      'Identity check under review',
      OUTCOME_MESSAGE.manual_review,
    );
  }
}
