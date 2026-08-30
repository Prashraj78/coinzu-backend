/**
 * Coinzu API: centralized CZD error codes.
 * Format: CZD + MODULE PREFIX + sequential number (e.g. CZDAUTH001).
 * Services throw only cz_error_code; the filter resolves message & description.
 */

/** Auth module error codes */
export const CzAuthErrorCodes = {
  INVALID_CREDENTIALS: 'CZDAUTH001',
  ACCOUNT_INACTIVE: 'CZDAUTH002',
  TOKEN_EXPIRED: 'CZDAUTH003',
  TOKEN_INVALID: 'CZDAUTH004',
  TOKEN_MISSING: 'CZDAUTH005',
  REFRESH_TOKEN_INVALID: 'CZDAUTH006',
  FORBIDDEN: 'CZDAUTH007',
  OTP_INVALID: 'CZDAUTH008',
  OTP_EXPIRED: 'CZDAUTH009',
  OTP_TOO_MANY_ATTEMPTS: 'CZDAUTH010',
  EMAIL_NOT_VERIFIED: 'CZDAUTH011',
  GOOGLE_TOKEN_INVALID: 'CZDAUTH012',
  PASSWORD_NOT_SET: 'CZDAUTH013',
  REFERRAL_CODE_INVALID: 'CZDAUTH014',
  LINK_EXPIRED: 'CZDAUTH015',
} as const;

/** User module error codes */
export const CzUserErrorCodes = {
  EMAIL_ALREADY_REGISTERED: 'CZDUSER001',
  USER_NOT_FOUND: 'CZDUSER002',
  REGISTRATION_FAILED: 'CZDUSER003',
  // Retired with SMS. Kept so the numbers are never handed to a new code.
  PHONE_ALREADY_REGISTERED: 'CZDUSER004',
  PHONE_NOT_VERIFIED: 'CZDUSER005',
  ONBOARDING_ALREADY_DONE: 'CZDUSER006',
  PHONE_ALREADY_LINKED: 'CZDUSER007',
} as const;

/** Wallet module error codes */
export const CzWalletErrorCodes = {
  WALLET_NOT_FOUND: 'CZDWLT001',
  INSUFFICIENT_COINS: 'CZDWLT002',
  INSUFFICIENT_GEMS: 'CZDWLT003',
  BELOW_MINIMUM_WITHDRAWAL: 'CZDWLT004',
  // Both retired with the admin reset — only the deleted withdrawal review endpoint threw these.
  WITHDRAWAL_NOT_FOUND: 'CZDWLT005',
  WITHDRAWAL_ALREADY_REVIEWED: 'CZDWLT006',
  KYC_REQUIRED: 'CZDWLT007',
  INVALID_CONVERT_AMOUNT: 'CZDWLT008',
  PENDING_WITHDRAWAL_EXISTS: 'CZDWLT009',
  TRANSACTION_NOT_FOUND: 'CZDWLT010',
} as const;

/** Offer module error codes */
export const CzOfferErrorCodes = {
  OFFER_NOT_FOUND: 'CZDOFR001',
  OFFER_INACTIVE: 'CZDOFR002',
  OFFER_NOT_AVAILABLE_IN_COUNTRY: 'CZDOFR003',
  PROVIDER_NOT_FOUND: 'CZDOFR004',
  PROVIDER_INACTIVE: 'CZDOFR005',
  POSTBACK_SIGNATURE_INVALID: 'CZDOFR006',
  POSTBACK_CLICK_NOT_FOUND: 'CZDOFR007',
  POSTBACK_DUPLICATE: 'CZDOFR008',
  PROVIDER_SYNC_FAILED: 'CZDOFR009',
} as const;

/** Daily engagement & mini-game error codes */
export const CzGameErrorCodes = {
  CHALLENGE_NOT_FOUND: 'CZDGAME001',
  CHALLENGE_NOT_COMPLETED: 'CZDGAME002',
  CHALLENGE_ALREADY_CLAIMED: 'CZDGAME003',
  ALREADY_CHECKED_IN: 'CZDGAME004',
  SPIN_ALREADY_USED: 'CZDGAME005',
  SPIN_NOT_CONFIGURED: 'CZDGAME006',
  QUIZ_NOT_AVAILABLE: 'CZDGAME007',
  QUIZ_ALREADY_ATTEMPTED: 'CZDGAME008',
  QUIZ_OPTION_INVALID: 'CZDGAME009',
  SCRATCH_ALREADY_USED: 'CZDGAME010',
  SCRATCH_NOT_CONFIGURED: 'CZDGAME011',
  DRAW_NOT_FOUND: 'CZDGAME012',
  DRAW_CLOSED: 'CZDGAME013',
  DRAW_ALREADY_ENTERED: 'CZDGAME014',
  STREAK_ALREADY_CLAIMED: 'CZDGAME015',
  STREAK_DAY_NOT_CONFIGURED: 'CZDGAME016',
  SCRATCH_NOT_EARNED: 'CZDGAME017',
  REWARD_GAME_NOT_FOUND: 'CZDGAME018',
  REWARD_COMING_SOON: 'CZDGAME019',
  REWARD_GAME_PAUSED: 'CZDGAME020',
  REWARD_NOT_A_DRAW: 'CZDGAME021',
  REWARD_NOT_INSTANT: 'CZDGAME022',
  REWARD_ENTRY_COUNT_INVALID: 'CZDGAME023',
  REWARD_NOT_CONFIGURED: 'CZDGAME024',
} as const;

/** Redeem / gift card error codes */
export const CzRedeemErrorCodes = {
  PRODUCT_NOT_FOUND: 'CZDRDM001',
  PRODUCT_INACTIVE: 'CZDRDM002',
  ORDER_NOT_FOUND: 'CZDRDM003',
  FULFILLMENT_FAILED: 'CZDRDM004',
  CODE_NOT_READY: 'CZDRDM005',
} as const;

/** Referral module error codes */
export const CzReferralErrorCodes = {
  SELF_REFERRAL: 'CZDREF001',
  ALREADY_REFERRED: 'CZDREF002',
  REFERRER_NOT_FOUND: 'CZDREF003',
  RULE_NOT_FOUND: 'CZDREF004',
  RULE_ALREADY_EXISTS: 'CZDREF005',
} as const;

/** Achievement module error codes */
export const CzAchievementErrorCodes = {
  ACHIEVEMENT_NOT_FOUND: 'CZDACH001',
  ACHIEVEMENT_LOCKED: 'CZDACH002',
  ACHIEVEMENT_ALREADY_CLAIMED: 'CZDACH003',
} as const;

/** KYC module error codes */
export const CzKycErrorCodes = {
  // Retired with the admin reset — only the deleted admin KYC review endpoint threw this.
  VERIFICATION_NOT_FOUND: 'CZDKYC001',
  ALREADY_VERIFIED: 'CZDKYC002',
  REVIEW_IN_PROGRESS: 'CZDKYC003',
  NO_FACE_DETECTED: 'CZDKYC004',
  MULTIPLE_FACES_DETECTED: 'CZDKYC005',
  IMAGE_INVALID: 'CZDKYC006',
  FACE_SERVICE_UNAVAILABLE: 'CZDKYC007',
  DECISION_ALREADY_MADE: 'CZDKYC008',
} as const;

/** Support module error codes */
export const CzSupportErrorCodes = {
  TICKET_NOT_FOUND: 'CZDSUP001',
  // Retired with the admin reset — only the deleted admin ticket-respond endpoint threw this.
  TICKET_ALREADY_RESOLVED: 'CZDSUP002',
  FAQ_NOT_FOUND: 'CZDSUP003',
  // Retired with the admin reset — only the deleted admin FAQ-category endpoints threw this.
  FAQ_CATEGORY_NOT_FOUND: 'CZDSUP004',
} as const;

/** Admin module error codes */
export const CzAdminErrorCodes = {
  // 001-003 retired: Coinzu has no admin table. 004 is live again with the Configuration Settings tab.
  ADMIN_NOT_FOUND: 'CZDADM001',
  ADMIN_INACTIVE: 'CZDADM002',
  ADMIN_EMAIL_TAKEN: 'CZDADM003',
  SETTING_NOT_FOUND: 'CZDADM004',
  INVALID_SETTING_VALUE: 'CZDADM005',
  CRON_JOB_NOT_FOUND: 'CZDADM006',
} as const;

/** Notification module error codes */
export const CzNotificationErrorCodes = {
  NOTIFICATION_NOT_FOUND: 'CZDNOTIF001',
  CAMPAIGN_NOT_CANCELLABLE: 'CZDNOTIF002',
  TEMPLATE_NOT_FOUND: 'CZDNOTIF003',
} as const;

/** Storage / upload error codes */
export const CzStorageErrorCodes = {
  FILE_REQUIRED: 'CZDSTR001',
  FILE_TYPE_NOT_ALLOWED: 'CZDSTR002',
  FILE_TOO_LARGE: 'CZDSTR003',
  UPLOAD_FAILED: 'CZDSTR004',
} as const;

/** Common / shared error codes */
export const CzCommonErrorCodes = {
  VALIDATION_FAILED: 'CZDCOMM001',
  INTERNAL_SERVER_ERROR: 'CZDCOMM002',
  SERVICE_UNAVAILABLE: 'CZDCOMM003',
  RESOURCE_NOT_FOUND: 'CZDCOMM004',
  TOO_MANY_REQUESTS: 'CZDCOMM005',
} as const;

/** Dropdown master-data module error codes */
export const CzDropdownErrorCodes = {
  OPTION_NOT_FOUND: 'CZDDRP001',
  OPTION_ALREADY_EXISTS: 'CZDDRP002',
  TYPE_NOT_FOUND: 'CZDDRP003',
  TYPE_ALREADY_EXISTS: 'CZDDRP004',
} as const;

/** Offerwall module error codes */
export const CzOfferwallErrorCodes = {
  PARTNER_NOT_FOUND: 'CZDOFW001',
  PARTNER_INACTIVE: 'CZDOFW002',
  SLUG_ALREADY_EXISTS: 'CZDOFW003',
  POSTBACK_UNAUTHORIZED: 'CZDOFW004',
  POSTBACK_DUPLICATE: 'CZDOFW005',
  POSTBACK_USER_NOT_FOUND: 'CZDOFW006',
} as const;

/**
 * Icon shown next to an error in the client's error sheet. Value is the
 * enum name an admin uploads an image for as a `dropdown_options` row of
 * type `error_icon` (value = enum name, icon_url = the uploaded image).
 * GET /api/dropdown?types=error_icon serves the enum-name -> URL map.
 */
export const CzErrorIcon = {
  INVALID_CREDENTIALS: 'InvalidCredentialsIcon',
  ACCOUNT_INACTIVE: 'AccountInactiveIcon',
  SESSION_EXPIRED: 'SessionExpiredIcon',
  SESSION_INVALID: 'SessionInvalidIcon',
  SIGN_IN_REQUIRED: 'SignInRequiredIcon',
  PERMISSION_DENIED: 'PermissionDeniedIcon',
  OTP_INCORRECT: 'OtpIncorrectIcon',
  OTP_EXPIRED: 'OtpExpiredIcon',
  TOO_MANY_ATTEMPTS: 'TooManyAttemptsIcon',
  EMAIL_UNVERIFIED: 'EmailUnverifiedIcon',
  GOOGLE_SIGNIN_FAILED: 'GoogleSignInFailedIcon',
  PASSWORD_NOT_SET: 'PasswordNotSetIcon',
  REFERRAL_INVALID: 'ReferralInvalidIcon',
  DUPLICATE_EMAIL: 'DuplicateEmailIcon',
  ACCOUNT_NOT_FOUND: 'AccountNotFoundIcon',
  REGISTRATION_FAILED: 'RegistrationFailedIcon',
  PHONE_ALREADY_LINKED: 'PhoneAlreadyLinkedIcon',
  PHONE_UNVERIFIED: 'PhoneUnverifiedIcon',
  ONBOARDING_COMPLETE: 'OnboardingCompleteIcon',
  WALLET_NOT_FOUND: 'WalletNotFoundIcon',
  INSUFFICIENT_COINS: 'InsufficientCoinsIcon',
  INSUFFICIENT_GEMS: 'InsufficientGemsIcon',
  BELOW_MINIMUM_WITHDRAWAL: 'BelowMinimumWithdrawalIcon',
  WITHDRAWAL_NOT_FOUND: 'WithdrawalNotFoundIcon',
  WITHDRAWAL_REVIEWED: 'WithdrawalReviewedIcon',
  KYC_REQUIRED: 'KycRequiredIcon',
  INVALID_AMOUNT: 'InvalidAmountIcon',
  WITHDRAWAL_PENDING: 'WithdrawalPendingIcon',
  OFFER_NOT_FOUND: 'OfferNotFoundIcon',
  OFFER_UNAVAILABLE: 'OfferUnavailableIcon',
  OFFER_RESTRICTED_REGION: 'OfferRestrictedRegionIcon',
  PROVIDER_NOT_FOUND: 'ProviderNotFoundIcon',
  REQUEST_UNVERIFIED: 'RequestUnverifiedIcon',
  CLICK_NOT_FOUND: 'ClickNotFoundIcon',
  DUPLICATE_REWARD: 'DuplicateRewardIcon',
  SYNC_FAILED: 'SyncFailedIcon',
  CHALLENGE_NOT_FOUND: 'ChallengeNotFoundIcon',
  CHALLENGE_INCOMPLETE: 'ChallengeIncompleteIcon',
  REWARD_ALREADY_CLAIMED: 'RewardAlreadyClaimedIcon',
  ALREADY_DONE_TODAY: 'AlreadyDoneTodayIcon',
  NOT_CONFIGURED: 'NotConfiguredIcon',
  QUIZ_UNAVAILABLE: 'QuizUnavailableIcon',
  INVALID_OPTION: 'InvalidOptionIcon',
  DRAW_NOT_FOUND: 'DrawNotFoundIcon',
  DRAW_CLOSED: 'DrawClosedIcon',
  ALREADY_ENTERED: 'AlreadyEnteredIcon',
  PRODUCT_NOT_FOUND: 'ProductNotFoundIcon',
  PRODUCT_UNAVAILABLE: 'ProductUnavailableIcon',
  ORDER_NOT_FOUND: 'OrderNotFoundIcon',
  FULFILLMENT_FAILED: 'FulfillmentFailedIcon',
  CODE_NOT_READY: 'CodeNotReadyIcon',
  SELF_REFERRAL: 'SelfReferralIcon',
  REFERRAL_ALREADY_USED: 'ReferralAlreadyUsedIcon',
  ACHIEVEMENT_NOT_FOUND: 'AchievementNotFoundIcon',
  ACHIEVEMENT_LOCKED: 'AchievementLockedIcon',
  VERIFICATION_NOT_FOUND: 'VerificationNotFoundIcon',
  ALREADY_VERIFIED: 'AlreadyVerifiedIcon',
  REVIEW_IN_PROGRESS: 'ReviewInProgressIcon',
  SELFIE_NO_FACE: 'SelfieNoFaceIcon',
  SELFIE_MULTIPLE_FACES: 'SelfieMultipleFacesIcon',
  IMAGE_INVALID: 'ImageInvalidIcon',
  VERIFICATION_UNAVAILABLE: 'VerificationUnavailableIcon',
  TICKET_NOT_FOUND: 'TicketNotFoundIcon',
  TICKET_RESOLVED: 'TicketResolvedIcon',
  FAQ_NOT_FOUND: 'FaqNotFoundIcon',
  FAQ_TOPIC_NOT_FOUND: 'FaqTopicNotFoundIcon',
  ADMIN_NOT_FOUND: 'AdminNotFoundIcon',
  SETTING_NOT_FOUND: 'SettingNotFoundIcon',
  NOTIFICATION_NOT_FOUND: 'NotificationNotFoundIcon',
  FILE_REQUIRED: 'FileRequiredIcon',
  FILE_TYPE_INVALID: 'FileTypeInvalidIcon',
  FILE_TOO_LARGE: 'FileTooLargeIcon',
  UPLOAD_FAILED: 'UploadFailedIcon',
  VALIDATION_FAILED: 'ValidationFailedIcon',
  SERVER_ERROR: 'ServerErrorIcon',
  SERVICE_UNAVAILABLE: 'ServiceUnavailableIcon',
  NOT_FOUND: 'NotFoundIcon',
  RATE_LIMITED: 'RateLimitedIcon',
  DROPDOWN_OPTION_NOT_FOUND: 'DropdownOptionNotFoundIcon',
  DUPLICATE_OPTION: 'DuplicateOptionIcon',
} as const;

/** Single source of truth: code → message & description. */
export const CzErrorMap: Record<
  string,
  { message: string; description: string; icon: string }
> = {
  [CzAuthErrorCodes.INVALID_CREDENTIALS]: {
    message: 'Invalid email or password.',
    description: 'Login failed. Invalid email or password.',
    icon: CzErrorIcon.INVALID_CREDENTIALS,
  },
  [CzAuthErrorCodes.ACCOUNT_INACTIVE]: {
    message: 'Account is inactive. Please contact support.',
    description: 'Login failed. Your account is inactive.',
    icon: CzErrorIcon.ACCOUNT_INACTIVE,
  },
  [CzAuthErrorCodes.TOKEN_EXPIRED]: {
    message: 'Your session has expired. Please sign in again.',
    description: 'Access token has expired.',
    icon: CzErrorIcon.SESSION_EXPIRED,
  },
  [CzAuthErrorCodes.TOKEN_INVALID]: {
    message: 'Your session is no longer valid. Please sign in again.',
    description: 'Access token is malformed or has been revoked.',
    icon: CzErrorIcon.SESSION_INVALID,
  },
  [CzAuthErrorCodes.TOKEN_MISSING]: {
    message: 'Please sign in to continue.',
    description: 'No Bearer token was provided in the Authorization header.',
    icon: CzErrorIcon.SIGN_IN_REQUIRED,
  },
  [CzAuthErrorCodes.REFRESH_TOKEN_INVALID]: {
    message: 'Your session has expired. Please sign in again.',
    description: 'Refresh token is invalid, expired, or of the wrong type.',
    icon: CzErrorIcon.SESSION_EXPIRED,
  },
  [CzAuthErrorCodes.FORBIDDEN]: {
    message: 'You do not have permission to do that.',
    description: 'The account lacks the role required for this action.',
    icon: CzErrorIcon.PERMISSION_DENIED,
  },
  [CzAuthErrorCodes.OTP_INVALID]: {
    message: 'That code is not correct. Please check and try again.',
    description: 'OTP does not match the hash stored in Redis for this destination.',
    icon: CzErrorIcon.OTP_INCORRECT,
  },
  [CzAuthErrorCodes.OTP_EXPIRED]: {
    message: 'That code has expired. Please request a new one.',
    description: 'The Redis key for this OTP was evicted by its TTL, was already consumed, or never existed.',
    icon: CzErrorIcon.OTP_EXPIRED,
  },
  [CzAuthErrorCodes.OTP_TOO_MANY_ATTEMPTS]: {
    message: 'Too many wrong codes. Please request a new one.',
    description: 'OTP attempt limit reached; the code stays locked until a new one is issued.',
    icon: CzErrorIcon.TOO_MANY_ATTEMPTS,
  },
  [CzAuthErrorCodes.EMAIL_NOT_VERIFIED]: {
    message: 'Please verify your email to continue.',
    description: 'Account has no email_verified_at timestamp.',
    icon: CzErrorIcon.EMAIL_UNVERIFIED,
  },
  [CzAuthErrorCodes.GOOGLE_TOKEN_INVALID]: {
    message: 'We could not sign you in with Google. Please try again.',
    description: 'Google ID token failed verification or has a wrong audience.',
    icon: CzErrorIcon.GOOGLE_SIGNIN_FAILED,
  },
  [CzAuthErrorCodes.PASSWORD_NOT_SET]: {
    message: 'This account uses Google sign-in. Please continue with Google.',
    description: 'Account has no password_hash; it was created via Google.',
    icon: CzErrorIcon.PASSWORD_NOT_SET,
  },
  [CzAuthErrorCodes.REFERRAL_CODE_INVALID]: {
    message: 'That referral code is not valid.',
    description: 'No active user owns the supplied referral code.',
    icon: CzErrorIcon.REFERRAL_INVALID,
  },
  [CzAuthErrorCodes.LINK_EXPIRED]: {
    message: 'This link has expired or was already used. Please request a new one.',
    description: 'The Redis key for this email/reset link token was evicted by its TTL, was already consumed, or never existed.',
    icon: CzErrorIcon.OTP_EXPIRED,
  },
  [CzUserErrorCodes.EMAIL_ALREADY_REGISTERED]: {
    message: 'This email is already registered. Please sign in instead.',
    description: 'Registration failed. Email already exists.',
    icon: CzErrorIcon.DUPLICATE_EMAIL,
  },
  [CzUserErrorCodes.USER_NOT_FOUND]: {
    message: 'We could not find that account.',
    description: 'No user exists for the given identifier.',
    icon: CzErrorIcon.ACCOUNT_NOT_FOUND,
  },
  [CzUserErrorCodes.REGISTRATION_FAILED]: {
    message: 'We could not create your account. Please try again.',
    description: 'Registration failed due to an unexpected error.',
    icon: CzErrorIcon.REGISTRATION_FAILED,
  },
  [CzUserErrorCodes.PHONE_ALREADY_REGISTERED]: {
    message: 'This phone number is already linked to another account.',
    description: 'Phone number is in use by a different user.',
    icon: CzErrorIcon.PHONE_ALREADY_LINKED,
  },
  [CzUserErrorCodes.PHONE_NOT_VERIFIED]: {
    message: 'Please verify your phone number to continue.',
    description: 'Account has no phone_verified_at timestamp.',
    icon: CzErrorIcon.PHONE_UNVERIFIED,
  },
  [CzUserErrorCodes.ONBOARDING_ALREADY_DONE]: {
    message: 'Your account setup is already complete.',
    description: 'onboarding_completed is already true for this user.',
    icon: CzErrorIcon.ONBOARDING_COMPLETE,
  },
  [CzUserErrorCodes.PHONE_ALREADY_LINKED]: {
    message: 'This phone number is already linked to another account.',
    description: 'PATCH /api/users/me phone conflicts with a different user.',
    icon: CzErrorIcon.PHONE_ALREADY_LINKED,
  },
  [CzWalletErrorCodes.WALLET_NOT_FOUND]: {
    message: 'We could not load your wallet. Please try again.',
    description: 'No wallet row exists for this user.',
    icon: CzErrorIcon.WALLET_NOT_FOUND,
  },
  [CzWalletErrorCodes.TRANSACTION_NOT_FOUND]: {
    message: 'We could not find that transaction.',
    description: 'No wallet_transactions row exists for the given id.',
    icon: CzErrorIcon.WALLET_NOT_FOUND,
  },
  [CzWalletErrorCodes.INSUFFICIENT_COINS]: {
    message: 'You do not have enough coins for this.',
    description: 'Requested coin debit exceeds the current coin balance.',
    icon: CzErrorIcon.INSUFFICIENT_COINS,
  },
  [CzWalletErrorCodes.INSUFFICIENT_GEMS]: {
    message: 'You do not have enough gems for this.',
    description: 'Requested gem debit exceeds the current gem balance.',
    icon: CzErrorIcon.INSUFFICIENT_GEMS,
  },
  [CzWalletErrorCodes.BELOW_MINIMUM_WITHDRAWAL]: {
    message: 'This amount is below the minimum withdrawal.',
    description: 'amount_coins is under the min_withdrawal_coins setting.',
    icon: CzErrorIcon.BELOW_MINIMUM_WITHDRAWAL,
  },
  [CzWalletErrorCodes.WITHDRAWAL_NOT_FOUND]: {
    message: 'We could not find that withdrawal.',
    description: 'No withdrawal request exists for the given id.',
    icon: CzErrorIcon.WITHDRAWAL_NOT_FOUND,
  },
  [CzWalletErrorCodes.WITHDRAWAL_ALREADY_REVIEWED]: {
    message: 'This withdrawal has already been reviewed.',
    description: 'Withdrawal status is no longer pending.',
    icon: CzErrorIcon.WITHDRAWAL_REVIEWED,
  },
  [CzWalletErrorCodes.KYC_REQUIRED]: {
    message: 'Please complete identity verification before withdrawing.',
    description: 'User kyc_status is not verified.',
    icon: CzErrorIcon.KYC_REQUIRED,
  },
  [CzWalletErrorCodes.INVALID_CONVERT_AMOUNT]: {
    message: 'Please enter a valid amount to convert.',
    description: 'Conversion amount is zero, negative, or not a whole number.',
    icon: CzErrorIcon.INVALID_AMOUNT,
  },
  [CzWalletErrorCodes.PENDING_WITHDRAWAL_EXISTS]: {
    message: 'You already have a withdrawal being reviewed.',
    description: 'A pending withdrawal request already exists for this user.',
    icon: CzErrorIcon.WITHDRAWAL_PENDING,
  },
  [CzOfferErrorCodes.OFFER_NOT_FOUND]: {
    message: 'We could not find that offer.',
    description: 'No offer exists for the given id.',
    icon: CzErrorIcon.OFFER_NOT_FOUND,
  },
  [CzOfferErrorCodes.OFFER_INACTIVE]: {
    message: 'This offer is no longer available.',
    description: 'Offer is inactive or past its expiry date.',
    icon: CzErrorIcon.OFFER_UNAVAILABLE,
  },
  [CzOfferErrorCodes.OFFER_NOT_AVAILABLE_IN_COUNTRY]: {
    message: 'This offer is not available in your country.',
    description: 'User country is not in the offer countries list.',
    icon: CzErrorIcon.OFFER_RESTRICTED_REGION,
  },
  [CzOfferErrorCodes.PROVIDER_NOT_FOUND]: {
    message: 'We could not find that offer provider.',
    description: 'No offerwall provider exists for the given id.',
    icon: CzErrorIcon.PROVIDER_NOT_FOUND,
  },
  [CzOfferErrorCodes.PROVIDER_INACTIVE]: {
    message: 'This offer is temporarily unavailable.',
    description: 'The offerwall provider behind this offer is inactive.',
    icon: CzErrorIcon.OFFER_UNAVAILABLE,
  },
  [CzOfferErrorCodes.POSTBACK_SIGNATURE_INVALID]: {
    message: 'We could not verify this request.',
    description: 'Postback secret or signature did not match the provider.',
    icon: CzErrorIcon.REQUEST_UNVERIFIED,
  },
  [CzOfferErrorCodes.POSTBACK_CLICK_NOT_FOUND]: {
    message: 'We could not match this reward to a click.',
    description: 'No offer click exists for the click_id in the postback.',
    icon: CzErrorIcon.CLICK_NOT_FOUND,
  },
  [CzOfferErrorCodes.POSTBACK_DUPLICATE]: {
    message: 'This reward has already been recorded.',
    description: 'A completion with this external_transaction_id exists.',
    icon: CzErrorIcon.DUPLICATE_REWARD,
  },
  [CzOfferErrorCodes.PROVIDER_SYNC_FAILED]: {
    message: 'We could not refresh offers right now. Please try again.',
    description: 'The provider offer-list request failed or returned no array.',
    icon: CzErrorIcon.SYNC_FAILED,
  },
  [CzGameErrorCodes.CHALLENGE_NOT_FOUND]: {
    message: 'We could not find that challenge.',
    description: 'No active daily challenge exists for the given id.',
    icon: CzErrorIcon.CHALLENGE_NOT_FOUND,
  },
  [CzGameErrorCodes.CHALLENGE_NOT_COMPLETED]: {
    message: 'Finish this challenge before claiming its reward.',
    description: 'Challenge progress status is still pending.',
    icon: CzErrorIcon.CHALLENGE_INCOMPLETE,
  },
  [CzGameErrorCodes.CHALLENGE_ALREADY_CLAIMED]: {
    message: 'You have already claimed this reward.',
    description: 'Challenge progress status is already claimed.',
    icon: CzErrorIcon.REWARD_ALREADY_CLAIMED,
  },
  [CzGameErrorCodes.ALREADY_CHECKED_IN]: {
    message: 'You have already checked in today. Come back tomorrow.',
    description: 'A check-in row already exists for this user and date.',
    icon: CzErrorIcon.ALREADY_DONE_TODAY,
  },
  [CzGameErrorCodes.SPIN_ALREADY_USED]: {
    message: 'You have used your spin for today. Come back tomorrow.',
    description: 'Daily spin limit reached for this user.',
    icon: CzErrorIcon.ALREADY_DONE_TODAY,
  },
  [CzGameErrorCodes.SPIN_NOT_CONFIGURED]: {
    message: 'The wheel is not ready yet. Please try again later.',
    description: 'No active spin wheel segments are configured.',
    icon: CzErrorIcon.NOT_CONFIGURED,
  },
  [CzGameErrorCodes.QUIZ_NOT_AVAILABLE]: {
    message: 'There is no quiz available right now.',
    description: 'No active quiz exists for today.',
    icon: CzErrorIcon.QUIZ_UNAVAILABLE,
  },
  [CzGameErrorCodes.QUIZ_ALREADY_ATTEMPTED]: {
    message: 'You have already answered today’s quiz.',
    description: 'An attempt row already exists for this user and quiz.',
    icon: CzErrorIcon.ALREADY_DONE_TODAY,
  },
  [CzGameErrorCodes.QUIZ_OPTION_INVALID]: {
    message: 'Please pick one of the given options.',
    description: 'selected_option is not present in the quiz options array.',
    icon: CzErrorIcon.INVALID_OPTION,
  },
  [CzGameErrorCodes.SCRATCH_ALREADY_USED]: {
    message: 'You have used your scratch card for today.',
    description: 'Every card won today has already been scratched.',
    icon: CzErrorIcon.ALREADY_DONE_TODAY,
  },
  [CzGameErrorCodes.SCRATCH_NOT_EARNED]: {
    message: 'Answer today’s quiz correctly to win a scratch card.',
    description: 'The user holds no unscratched card; the quiz is the only source.',
    icon: CzErrorIcon.CHALLENGE_INCOMPLETE,
  },
  [CzGameErrorCodes.REWARD_GAME_NOT_FOUND]: {
    message: 'We could not find that reward.',
    description: 'No reward game exists with that slug.',
    icon: CzErrorIcon.NOT_FOUND,
  },
  [CzGameErrorCodes.REWARD_COMING_SOON]: {
    message: 'This one is coming soon. Check back shortly.',
    description: 'The reward game status is coming_soon.',
    icon: CzErrorIcon.NOT_CONFIGURED,
  },
  [CzGameErrorCodes.REWARD_GAME_PAUSED]: {
    message: 'This reward is paused right now. Please try again later.',
    description: 'The reward game status is paused.',
    icon: CzErrorIcon.NOT_CONFIGURED,
  },
  [CzGameErrorCodes.REWARD_NOT_A_DRAW]: {
    message: 'This reward is played instantly, not entered.',
    description: 'buy-entries was called on an instant game.',
    icon: CzErrorIcon.VALIDATION_FAILED,
  },
  [CzGameErrorCodes.REWARD_NOT_INSTANT]: {
    message: 'This reward is a draw. Buy entries to take part.',
    description: 'play was called on a draw game.',
    icon: CzErrorIcon.VALIDATION_FAILED,
  },
  [CzGameErrorCodes.REWARD_ENTRY_COUNT_INVALID]: {
    message: 'Please choose a valid number of entries.',
    description: 'The entry count is outside the range the game allows.',
    icon: CzErrorIcon.VALIDATION_FAILED,
  },
  [CzGameErrorCodes.REWARD_NOT_CONFIGURED]: {
    message: 'This reward is not ready yet. Please try again later.',
    description: 'The game has no active prize carrying a weight above 0.',
    icon: CzErrorIcon.NOT_CONFIGURED,
  },
  [CzGameErrorCodes.SCRATCH_NOT_CONFIGURED]: {
    message: 'Scratch cards are not ready yet. Please try again later.',
    description: 'No active scratch card rewards are configured.',
    icon: CzErrorIcon.NOT_CONFIGURED,
  },
  [CzGameErrorCodes.DRAW_NOT_FOUND]: {
    message: 'We could not find that lucky draw.',
    description: 'No lucky draw exists for the given id.',
    icon: CzErrorIcon.DRAW_NOT_FOUND,
  },
  [CzGameErrorCodes.DRAW_CLOSED]: {
    message: 'Entries for this draw are closed.',
    description: 'Lucky draw status is not open, or draw_date has passed.',
    icon: CzErrorIcon.DRAW_CLOSED,
  },
  [CzGameErrorCodes.DRAW_ALREADY_ENTERED]: {
    message: 'You are already entered in this draw.',
    description: 'An entry row already exists for this user and draw.',
    icon: CzErrorIcon.ALREADY_ENTERED,
  },
  [CzGameErrorCodes.STREAK_ALREADY_CLAIMED]: {
    message: 'You have already claimed today’s streak reward.',
    description: 'last_claimed_date on the streak already equals today.',
    icon: CzErrorIcon.REWARD_ALREADY_CLAIMED,
  },
  [CzGameErrorCodes.STREAK_DAY_NOT_CONFIGURED]: {
    message: 'Streak rewards are not ready yet. Please try again later.',
    description: 'No streak reward config exists for the next day number.',
    icon: CzErrorIcon.NOT_CONFIGURED,
  },
  [CzRedeemErrorCodes.PRODUCT_NOT_FOUND]: {
    message: 'We could not find that gift card.',
    description: 'No gift card product exists for the given id.',
    icon: CzErrorIcon.PRODUCT_NOT_FOUND,
  },
  [CzRedeemErrorCodes.PRODUCT_INACTIVE]: {
    message: 'This gift card is no longer available.',
    description: 'Gift card product is inactive.',
    icon: CzErrorIcon.PRODUCT_UNAVAILABLE,
  },
  [CzRedeemErrorCodes.ORDER_NOT_FOUND]: {
    message: 'We could not find that order.',
    description: 'No gift card order exists for the given id and user.',
    icon: CzErrorIcon.ORDER_NOT_FOUND,
  },
  [CzRedeemErrorCodes.FULFILLMENT_FAILED]: {
    message: 'We could not complete this redemption. Your coins were returned.',
    description: 'The gift card provider rejected or failed the order.',
    icon: CzErrorIcon.FULFILLMENT_FAILED,
  },
  [CzRedeemErrorCodes.CODE_NOT_READY]: {
    message: 'Your gift card code is not ready yet. Please check back soon.',
    description: 'Order status is still pending; no code has been issued.',
    icon: CzErrorIcon.CODE_NOT_READY,
  },
  [CzReferralErrorCodes.SELF_REFERRAL]: {
    message: 'You cannot use your own referral code.',
    description: 'Referral code belongs to the signing-up user.',
    icon: CzErrorIcon.SELF_REFERRAL,
  },
  [CzReferralErrorCodes.ALREADY_REFERRED]: {
    message: 'This account has already used a referral code.',
    description: 'A referral row already exists for this referred user.',
    icon: CzErrorIcon.REFERRAL_ALREADY_USED,
  },
  [CzReferralErrorCodes.REFERRER_NOT_FOUND]: {
    message: 'That referral code is not valid.',
    description: 'No user owns the supplied referral code.',
    icon: CzErrorIcon.REFERRAL_INVALID,
  },
  [CzReferralErrorCodes.RULE_NOT_FOUND]: {
    message: 'We could not find that referral rule.',
    description: 'No referral_reward_rules row exists for the given id.',
    icon: CzErrorIcon.REFERRAL_INVALID,
  },
  [CzReferralErrorCodes.RULE_ALREADY_EXISTS]: {
    message: 'A rule for that step already exists.',
    description: 'A referral_reward_rules row already uses this trigger.',
    icon: CzErrorIcon.DUPLICATE_OPTION,
  },
  [CzAchievementErrorCodes.ACHIEVEMENT_NOT_FOUND]: {
    message: 'We could not find that achievement.',
    description: 'No achievement exists for the given id.',
    icon: CzErrorIcon.ACHIEVEMENT_NOT_FOUND,
  },
  [CzAchievementErrorCodes.ACHIEVEMENT_LOCKED]: {
    message: 'You have not unlocked this achievement yet.',
    description: 'User achievement progress is below criteria_value.',
    icon: CzErrorIcon.ACHIEVEMENT_LOCKED,
  },
  [CzAchievementErrorCodes.ACHIEVEMENT_ALREADY_CLAIMED]: {
    message: 'You have already claimed this achievement.',
    description: 'User achievement already has an unlocked_at timestamp.',
    icon: CzErrorIcon.REWARD_ALREADY_CLAIMED,
  },
  [CzKycErrorCodes.VERIFICATION_NOT_FOUND]: {
    message: 'We could not find that verification.',
    description: 'No KYC verification row exists with that id.',
    icon: CzErrorIcon.VERIFICATION_NOT_FOUND,
  },
  [CzKycErrorCodes.ALREADY_VERIFIED]: {
    message: 'Your identity is already verified.',
    description: 'User kyc_status is already verified.',
    icon: CzErrorIcon.ALREADY_VERIFIED,
  },
  [CzKycErrorCodes.REVIEW_IN_PROGRESS]: {
    message: 'Your verification is being reviewed. We will update you soon.',
    description: 'An earlier KYC verification is still pending a decision.',
    icon: CzErrorIcon.REVIEW_IN_PROGRESS,
  },
  [CzKycErrorCodes.NO_FACE_DETECTED]: {
    message: 'We could not see your face clearly. Please retake the selfie.',
    description: 'Rekognition returned no face in the uploaded image.',
    icon: CzErrorIcon.SELFIE_NO_FACE,
  },
  [CzKycErrorCodes.MULTIPLE_FACES_DETECTED]: {
    message: 'Please take a selfie with only you in the frame.',
    description: 'Rekognition detected more than one face in the image.',
    icon: CzErrorIcon.SELFIE_MULTIPLE_FACES,
  },
  [CzKycErrorCodes.IMAGE_INVALID]: {
    message: 'That image could not be read. Please retake the selfie.',
    description: 'Image is corrupt, empty, or an unsupported format.',
    icon: CzErrorIcon.IMAGE_INVALID,
  },
  [CzKycErrorCodes.DECISION_ALREADY_MADE]: {
    message: 'That verification has already been decided.',
    description:
      'Admin decision rejected: the attempt is already verified, which is final.',
    icon: CzErrorIcon.TICKET_RESOLVED,
  },
  [CzKycErrorCodes.FACE_SERVICE_UNAVAILABLE]: {
    message: 'Verification is unavailable right now. Please try again shortly.',
    description: 'The AWS Rekognition call failed or timed out.',
    icon: CzErrorIcon.VERIFICATION_UNAVAILABLE,
  },
  [CzSupportErrorCodes.TICKET_NOT_FOUND]: {
    message: 'We could not find that request.',
    description: 'No support ticket exists for the given id and user.',
    icon: CzErrorIcon.TICKET_NOT_FOUND,
  },
  [CzSupportErrorCodes.TICKET_ALREADY_RESOLVED]: {
    message: 'This request has already been resolved.',
    description: 'Support ticket status is already resolved.',
    icon: CzErrorIcon.TICKET_RESOLVED,
  },
  [CzSupportErrorCodes.FAQ_NOT_FOUND]: {
    message: 'We could not find that answer.',
    description: 'No FAQ exists for the given id.',
    icon: CzErrorIcon.FAQ_NOT_FOUND,
  },
  [CzSupportErrorCodes.FAQ_CATEGORY_NOT_FOUND]: {
    message: 'We could not find that help topic.',
    description: 'No FAQ category exists for the given id.',
    icon: CzErrorIcon.FAQ_TOPIC_NOT_FOUND,
  },
  [CzAdminErrorCodes.ADMIN_NOT_FOUND]: {
    message: 'We could not find that admin account.',
    description: 'No admin user exists for the given identifier.',
    icon: CzErrorIcon.ADMIN_NOT_FOUND,
  },
  [CzAdminErrorCodes.ADMIN_INACTIVE]: {
    message: 'This admin account is inactive.',
    description: 'Admin user is_active is false.',
    icon: CzErrorIcon.ACCOUNT_INACTIVE,
  },
  [CzAdminErrorCodes.ADMIN_EMAIL_TAKEN]: {
    message: 'An admin with this email already exists.',
    description: 'Duplicate email on admin user creation.',
    icon: CzErrorIcon.DUPLICATE_EMAIL,
  },
  [CzAdminErrorCodes.SETTING_NOT_FOUND]: {
    message: 'We could not find that setting.',
    description: 'No app setting exists for the given key.',
    icon: CzErrorIcon.SETTING_NOT_FOUND,
  },
  [CzAdminErrorCodes.INVALID_SETTING_VALUE]: {
    message: 'Please check the value you entered and try again.',
    description:
      'A setting value is the wrong type, or outside the range its catalogue entry allows.',
    icon: CzErrorIcon.VALIDATION_FAILED,
  },
  [CzNotificationErrorCodes.NOTIFICATION_NOT_FOUND]: {
    message: 'We could not find that notification.',
    description: 'No notification exists for the given id and user.',
    icon: CzErrorIcon.NOTIFICATION_NOT_FOUND,
  },
  [CzAdminErrorCodes.CRON_JOB_NOT_FOUND]: {
    message: 'We could not find that scheduled job.',
    description: 'No job in the cron catalogue matches that key.',
    icon: CzErrorIcon.SETTING_NOT_FOUND,
  },
  [CzNotificationErrorCodes.CAMPAIGN_NOT_CANCELLABLE]: {
    message: 'That campaign can no longer be cancelled.',
    description: 'Only a draft or a scheduled campaign can be cancelled.',
    icon: CzErrorIcon.TICKET_RESOLVED,
  },
  [CzNotificationErrorCodes.TEMPLATE_NOT_FOUND]: {
    message: 'We could not find that template.',
    description: 'No push template exists with that id.',
    icon: CzErrorIcon.NOTIFICATION_NOT_FOUND,
  },
  [CzStorageErrorCodes.FILE_REQUIRED]: {
    message: 'Please choose a file to upload.',
    description: 'No file was present on the multipart request.',
    icon: CzErrorIcon.FILE_REQUIRED,
  },
  [CzStorageErrorCodes.FILE_TYPE_NOT_ALLOWED]: {
    message: 'That file type is not supported. Please upload a JPG or PNG.',
    description: 'Uploaded MIME type is outside the allowed list.',
    icon: CzErrorIcon.FILE_TYPE_INVALID,
  },
  [CzStorageErrorCodes.FILE_TOO_LARGE]: {
    message: 'That file is too large. Please upload a smaller image.',
    description: 'Uploaded file exceeds the configured size limit.',
    icon: CzErrorIcon.FILE_TOO_LARGE,
  },
  [CzStorageErrorCodes.UPLOAD_FAILED]: {
    message: 'We could not upload that file. Please try again.',
    description: 'The object storage PutObject call failed.',
    icon: CzErrorIcon.UPLOAD_FAILED,
  },
  [CzCommonErrorCodes.VALIDATION_FAILED]: {
    message: 'Please check the details you entered and try again.',
    description: 'One or more fields in the request are invalid.',
    icon: CzErrorIcon.VALIDATION_FAILED,
  },
  [CzCommonErrorCodes.INTERNAL_SERVER_ERROR]: {
    message: 'Something went wrong. Please try again.',
    description: 'An unexpected error occurred while processing the request.',
    icon: CzErrorIcon.SERVER_ERROR,
  },
  [CzCommonErrorCodes.SERVICE_UNAVAILABLE]: {
    message: 'Service is temporarily unavailable. Please try again shortly.',
    description: 'A dependency required to serve this request is unavailable.',
    icon: CzErrorIcon.SERVICE_UNAVAILABLE,
  },
  [CzCommonErrorCodes.RESOURCE_NOT_FOUND]: {
    message: 'We could not find what you were looking for.',
    description: 'The requested resource does not exist.',
    icon: CzErrorIcon.NOT_FOUND,
  },
  [CzCommonErrorCodes.TOO_MANY_REQUESTS]: {
    message: 'Too many requests. Please slow down and try again.',
    description: 'Rate limit exceeded for this client.',
    icon: CzErrorIcon.RATE_LIMITED,
  },
  [CzDropdownErrorCodes.OPTION_NOT_FOUND]: {
    message: 'We could not find that option.',
    description: 'No dropdown_options row exists for the given id.',
    icon: CzErrorIcon.DROPDOWN_OPTION_NOT_FOUND,
  },
  [CzDropdownErrorCodes.OPTION_ALREADY_EXISTS]: {
    message: 'That option already exists.',
    description: 'A dropdown_options row already has this type and value.',
    icon: CzErrorIcon.DUPLICATE_OPTION,
  },
  [CzDropdownErrorCodes.TYPE_NOT_FOUND]: {
    message: 'We could not find that category.',
    description: 'No dropdown_types row exists for the given id.',
    icon: CzErrorIcon.DROPDOWN_OPTION_NOT_FOUND,
  },
  [CzDropdownErrorCodes.TYPE_ALREADY_EXISTS]: {
    message: 'That category already exists.',
    description: 'A dropdown_types row already uses this type key.',
    icon: CzErrorIcon.DUPLICATE_OPTION,
  },
  [CzOfferwallErrorCodes.PARTNER_NOT_FOUND]: {
    message: 'We could not find that offerwall.',
    description: 'No offerwall_partners row exists for the given id or slug.',
    icon: CzErrorIcon.PROVIDER_NOT_FOUND,
  },
  [CzOfferwallErrorCodes.PARTNER_INACTIVE]: {
    message: 'This offerwall is temporarily unavailable.',
    description: 'The offerwall partner is set inactive by an admin.',
    icon: CzErrorIcon.OFFER_UNAVAILABLE,
  },
  [CzOfferwallErrorCodes.SLUG_ALREADY_EXISTS]: {
    message: 'That offerwall slug is already in use.',
    description: 'An offerwall_partners row already has this slug.',
    icon: CzErrorIcon.DUPLICATE_OPTION,
  },
  [CzOfferwallErrorCodes.POSTBACK_UNAUTHORIZED]: {
    message: 'We could not verify this request.',
    description: 'The postback token or signature did not match the partner.',
    icon: CzErrorIcon.REQUEST_UNVERIFIED,
  },
  [CzOfferwallErrorCodes.POSTBACK_DUPLICATE]: {
    message: 'This reward has already been recorded.',
    description: 'An offerwall_postbacks row with this external_transaction_id already exists for the partner.',
    icon: CzErrorIcon.DUPLICATE_REWARD,
  },
  [CzOfferwallErrorCodes.POSTBACK_USER_NOT_FOUND]: {
    message: 'We could not match this reward to a user.',
    description: 'The mapped user_id field in the postback does not match any user.',
    icon: CzErrorIcon.ACCOUNT_NOT_FOUND,
  },
};

const defaultError = CzErrorMap[CzCommonErrorCodes.INTERNAL_SERVER_ERROR];

export function getCzErrorByCode(code: string): {
  message: string;
  description: string;
  icon: string;
} {
  return CzErrorMap[code] ?? defaultError;
}

/** Payload thrown from services; filter fills message & description from map */
export interface CzErrorPayload {
  cz_error_code: string;
  /** Optional override for cz_error_description */
  cz_error_description?: string;
}

/** Standard error response returned by the API */
export interface CzApiErrorResponse {
  success: false;
  cz_error_code: string;
  cz_error_message: string;
  cz_error_description: string;
  cz_error_icon: string;
  statusCode: number;
  timestamp: string;
}

/** Standard success response returned by the API */
export interface CzApiSuccessResponse<T> {
  success: true;
  data: T;
}
