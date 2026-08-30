import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds dropdown rows for the onboarding age/goal pickers and the full
 * `CzErrorIcon` enum. Error icon rows are created with `icon_url: NULL` —
 * an admin uploads each image through the Dropdown admin tab afterwards.
 */
const AGE_RANGES: Array<[value: string, label: string]> = [
  ['18-24', '18-24'],
  ['25-34', '25-34'],
  ['35-44', '35-44'],
  ['45-54+', '45-54+'],
];

const PRIMARY_GOALS: Array<[value: string, label: string]> = [
  ['earn_up_to_10_daily', 'Earn up to $10 daily'],
  ['highest_rewards', 'I want the highest rewards'],
  ['no_limit_earn_big', 'No limit – earn big!'],
];

const ERROR_ICONS: Array<[value: string, label: string]> = [
  ['InvalidCredentialsIcon', 'Invalid credentials'],
  ['AccountInactiveIcon', 'Account inactive'],
  ['SessionExpiredIcon', 'Session expired'],
  ['SessionInvalidIcon', 'Session invalid'],
  ['SignInRequiredIcon', 'Sign in required'],
  ['PermissionDeniedIcon', 'Permission denied'],
  ['OtpIncorrectIcon', 'OTP incorrect'],
  ['OtpExpiredIcon', 'OTP expired'],
  ['TooManyAttemptsIcon', 'Too many attempts'],
  ['EmailUnverifiedIcon', 'Email unverified'],
  ['GoogleSignInFailedIcon', 'Google sign in failed'],
  ['PasswordNotSetIcon', 'Password not set'],
  ['ReferralInvalidIcon', 'Referral invalid'],
  ['DuplicateEmailIcon', 'Duplicate email'],
  ['AccountNotFoundIcon', 'Account not found'],
  ['RegistrationFailedIcon', 'Registration failed'],
  ['PhoneAlreadyLinkedIcon', 'Phone already linked'],
  ['PhoneUnverifiedIcon', 'Phone unverified'],
  ['OnboardingCompleteIcon', 'Onboarding complete'],
  ['WalletNotFoundIcon', 'Wallet not found'],
  ['InsufficientCoinsIcon', 'Insufficient coins'],
  ['InsufficientGemsIcon', 'Insufficient gems'],
  ['BelowMinimumWithdrawalIcon', 'Below minimum withdrawal'],
  ['WithdrawalNotFoundIcon', 'Withdrawal not found'],
  ['WithdrawalReviewedIcon', 'Withdrawal reviewed'],
  ['KycRequiredIcon', 'KYC required'],
  ['InvalidAmountIcon', 'Invalid amount'],
  ['WithdrawalPendingIcon', 'Withdrawal pending'],
  ['OfferNotFoundIcon', 'Offer not found'],
  ['OfferUnavailableIcon', 'Offer unavailable'],
  ['OfferRestrictedRegionIcon', 'Offer restricted region'],
  ['ProviderNotFoundIcon', 'Provider not found'],
  ['RequestUnverifiedIcon', 'Request unverified'],
  ['ClickNotFoundIcon', 'Click not found'],
  ['DuplicateRewardIcon', 'Duplicate reward'],
  ['SyncFailedIcon', 'Sync failed'],
  ['ChallengeNotFoundIcon', 'Challenge not found'],
  ['ChallengeIncompleteIcon', 'Challenge incomplete'],
  ['RewardAlreadyClaimedIcon', 'Reward already claimed'],
  ['AlreadyDoneTodayIcon', 'Already done today'],
  ['NotConfiguredIcon', 'Not configured'],
  ['QuizUnavailableIcon', 'Quiz unavailable'],
  ['InvalidOptionIcon', 'Invalid option'],
  ['DrawNotFoundIcon', 'Draw not found'],
  ['DrawClosedIcon', 'Draw closed'],
  ['AlreadyEnteredIcon', 'Already entered'],
  ['ProductNotFoundIcon', 'Product not found'],
  ['ProductUnavailableIcon', 'Product unavailable'],
  ['OrderNotFoundIcon', 'Order not found'],
  ['FulfillmentFailedIcon', 'Fulfillment failed'],
  ['CodeNotReadyIcon', 'Code not ready'],
  ['SelfReferralIcon', 'Self referral'],
  ['ReferralAlreadyUsedIcon', 'Referral already used'],
  ['AchievementNotFoundIcon', 'Achievement not found'],
  ['AchievementLockedIcon', 'Achievement locked'],
  ['VerificationNotFoundIcon', 'Verification not found'],
  ['AlreadyVerifiedIcon', 'Already verified'],
  ['ReviewInProgressIcon', 'Review in progress'],
  ['SelfieNoFaceIcon', 'Selfie no face'],
  ['SelfieMultipleFacesIcon', 'Selfie multiple faces'],
  ['ImageInvalidIcon', 'Image invalid'],
  ['VerificationUnavailableIcon', 'Verification unavailable'],
  ['TicketNotFoundIcon', 'Ticket not found'],
  ['TicketResolvedIcon', 'Ticket resolved'],
  ['FaqNotFoundIcon', 'FAQ not found'],
  ['FaqTopicNotFoundIcon', 'FAQ topic not found'],
  ['AdminNotFoundIcon', 'Admin not found'],
  ['SettingNotFoundIcon', 'Setting not found'],
  ['NotificationNotFoundIcon', 'Notification not found'],
  ['FileRequiredIcon', 'File required'],
  ['FileTypeInvalidIcon', 'File type invalid'],
  ['FileTooLargeIcon', 'File too large'],
  ['UploadFailedIcon', 'Upload failed'],
  ['ValidationFailedIcon', 'Validation failed'],
  ['ServerErrorIcon', 'Server error'],
  ['ServiceUnavailableIcon', 'Service unavailable'],
  ['NotFoundIcon', 'Not found'],
  ['RateLimitedIcon', 'Rate limited'],
  ['DropdownOptionNotFoundIcon', 'Dropdown option not found'],
  ['DuplicateOptionIcon', 'Duplicate option'],
];

export class DropdownAgeGoalErrorIconSeed1787985584386 implements MigrationInterface {
  name = 'DropdownAgeGoalErrorIconSeed1787985584386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values: string[] = [];
    const params: unknown[] = [];

    const pushGroup = (type: string, rows: Array<[string, string]>) => {
      let order = 0;
      for (const [value, label] of rows) {
        params.push(type, value, label, order++);
        values.push(
          `($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, NULL, $${params.length})`,
        );
      }
    };

    pushGroup('age_range', AGE_RANGES);
    pushGroup('primary_goal', PRIMARY_GOALS);
    pushGroup('error_icon', ERROR_ICONS);

    await queryRunner.query(
      `INSERT INTO "dropdown_options" ("type", "value", "label", "icon_url", "display_order") VALUES ${values.join(', ')}`,
      params,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "dropdown_options" WHERE "type" IN ('age_range', 'primary_goal', 'error_icon')`,
    );
  }
}
