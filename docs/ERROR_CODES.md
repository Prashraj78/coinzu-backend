# Error codes

Every failure returns the same body. `cz_error_code` is the value to branch on; `cz_error_message` is safe to show a user as it is.

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH001",
  "cz_error_message": "Invalid email or password.",
  "cz_error_description": "No account matches that email, or the password did not match.",
  "cz_error_icon": "InvalidCredentialsIcon",
  "statusCode": 401,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

Format: `CZD` + module prefix + 3-digit sequence. Codes are a public contract — never renumber or reuse one.

To add a code: put it in the module block in `src/common/errors/error.constants.ts`, add its `CzErrorMap` entry with a message, a description and an icon, then add the row here. A code with no map entry falls back to `CZDCOMM002`.

Throw it from a service by passing the code inside the exception body:

```ts
throw new NotFoundException({ cz_error_code: CzRedeemErrorCodes.ORDER_NOT_FOUND });
```

The global `HttpExceptionFilter` turns that into the response above. Rows marked *reserved* exist in the map but nothing throws them yet.

## Auth — `CZDAUTH`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDAUTH001` | 401 | Invalid email or password. | Login failed. Invalid email or password. | `InvalidCredentialsIcon` |
| `CZDAUTH002` | 401 | Account is inactive. Please contact support. | Login failed. Your account is inactive. | `AccountInactiveIcon` |
| `CZDAUTH003` | 401 | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| `CZDAUTH004` | 401 | Your session is no longer valid. Please sign in again. | Access token is malformed or has been revoked. | `SessionInvalidIcon` |
| `CZDAUTH005` | 401 | Please sign in to continue. | No Bearer token was provided in the Authorization header. | `SignInRequiredIcon` |
| `CZDAUTH006` | 401 | Your session has expired. Please sign in again. | Refresh token is invalid, expired, or of the wrong type. | `SessionExpiredIcon` |
| `CZDAUTH007` | 403 | You do not have permission to do that. | The account lacks the role required for this action. | `PermissionDeniedIcon` |
| `CZDAUTH008` | 400 | That code is not correct. Please check and try again. | *Retired.* Email verification is link-only; no code is ever issued. Never thrown. | `OtpIncorrectIcon` |
| `CZDAUTH009` | 400 | That code has expired. Please request a new one. | *Retired.* Email verification is link-only; no code is ever issued. Never thrown. | `OtpExpiredIcon` |
| `CZDAUTH010` | 429 | Too many wrong codes. Please request a new one. | *Retired.* Email verification is link-only; no code is ever issued. Never thrown. | `TooManyAttemptsIcon` |
| `CZDAUTH011` | 403 | Please verify your email to continue. | *Reserved.* Account has no email_verified_at timestamp. | `EmailUnverifiedIcon` |
| `CZDAUTH012` | 401 | We could not sign you in with Google. Please try again. | Google ID token failed verification or has a wrong audience. | `GoogleSignInFailedIcon` |
| `CZDAUTH013` | 401 | This account uses Google sign-in. Please continue with Google. | Account has no password_hash; it was created via Google. | `PasswordNotSetIcon` |
| `CZDAUTH014` | 400 | That referral code is not valid. | No active user owns the supplied referral code. | `ReferralInvalidIcon` |
| `CZDAUTH015` | 400 | This link has expired or was already used. Please request a new one. | The Redis key for this email/reset link token was evicted by its TTL, was already consumed, or never existed. | `OtpExpiredIcon` |

## User — `CZDUSER`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDUSER001` | 409 | This email is already registered. Please sign in instead. | Registration failed. Email already exists. | `DuplicateEmailIcon` |
| `CZDUSER002` | 404 | We could not find that account. | No user exists for the given identifier. | `AccountNotFoundIcon` |
| `CZDUSER003` | 500 | We could not create your account. Please try again. | *Reserved.* Registration failed due to an unexpected error. | `RegistrationFailedIcon` |
| `CZDUSER004` | 409 | This phone number is already linked to another account. | *Retired.* Phone verification was removed with SMS. The number stays reserved and is never returned. | `PhoneAlreadyLinkedIcon` |
| `CZDUSER005` | 403 | Please verify your phone number to continue. | *Retired.* Phone verification was removed with SMS. The number stays reserved and is never returned. | `PhoneUnverifiedIcon` |
| `CZDUSER006` | 400 | Your account setup is already complete. | *Reserved.* onboarding_completed is already true for this user. | `OnboardingCompleteIcon` |
| `CZDUSER007` | 409 | This phone number is already linked to another account. | `PATCH /api/users/me` `phone` conflicts with a different user's. | `PhoneAlreadyLinkedIcon` |

## Wallet — `CZDWLT`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDWLT001` | 404 | We could not load your wallet. Please try again. | *Reserved.* No wallet row exists for this user. | `WalletNotFoundIcon` |
| `CZDWLT002` | 400 | You do not have enough coins for this. | Requested coin debit exceeds the current coin balance. | `InsufficientCoinsIcon` |
| `CZDWLT003` | 400 | You do not have enough gems for this. | Requested gem debit exceeds the current gem balance. | `InsufficientGemsIcon` |
| `CZDWLT004` | 400 | This amount is below the minimum withdrawal. | amount_coins is under the min_withdrawal_coins setting. | `BelowMinimumWithdrawalIcon` |
| `CZDWLT005` | 404 | We could not find that withdrawal. | *Retired.* Only the deleted admin withdrawal review endpoint threw this. Never thrown. | `WithdrawalNotFoundIcon` |
| `CZDWLT006` | 409 | This withdrawal has already been reviewed. | *Retired.* Only the deleted admin withdrawal review endpoint threw this. Never thrown. | `WithdrawalReviewedIcon` |
| `CZDWLT007` | 403 | Please complete identity verification before withdrawing. | User kyc_status is not verified. | `KycRequiredIcon` |
| `CZDWLT008` | 400 | Please enter a valid amount to convert. | Conversion amount is zero, negative, or not a whole number. | `InvalidAmountIcon` |
| `CZDWLT009` | 409 | You already have a withdrawal being reviewed. | A pending withdrawal request already exists for this user. | `WithdrawalPendingIcon` |
| `CZDWLT010` | 404 | We could not find that transaction. | No `wallet_transactions` row exists for the given id. | `WalletNotFoundIcon` |

## Offers — `CZDOFR`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDOFR001` | 404 | We could not find that offer. | No offer exists for the given id. | `OfferNotFoundIcon` |
| `CZDOFR002` | 400 | This offer is no longer available. | Offer is inactive or past its expiry date. | `OfferUnavailableIcon` |
| `CZDOFR003` | 403 | This offer is not available in your country. | User country is not in the offer countries list. | `OfferRestrictedRegionIcon` |
| `CZDOFR004` | 404 | We could not find that offer provider. | No offerwall provider exists for the given id. | `ProviderNotFoundIcon` |
| `CZDOFR005` | 403 | This offer is temporarily unavailable. | The offerwall provider behind this offer is inactive. | `OfferUnavailableIcon` |
| `CZDOFR006` | 401 | We could not verify this request. | Postback secret or signature did not match the provider. | `RequestUnverifiedIcon` |
| `CZDOFR007` | 404 | We could not match this reward to a click. | No offer click exists for the click_id in the postback. | `ClickNotFoundIcon` |
| `CZDOFR008` | 409 | This reward has already been recorded. | *Reserved.* A completion with this external_transaction_id exists. | `DuplicateRewardIcon` |
| `CZDOFR009` | 502 | We could not refresh offers right now. Please try again. | The provider offer-list request failed or returned no array. | `SyncFailedIcon` |

## Daily & games — `CZDGAME`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDGAME001` | 404 / 400 | We could not find that challenge. | No active daily challenge exists for the given id. Also thrown as a 400 when the challenge board is asked for a future date. | `ChallengeNotFoundIcon` |
| `CZDGAME002` | 400 | Finish this challenge before claiming its reward. | Challenge progress is still pending, or the master chest was claimed before every tile was finished. | `ChallengeIncompleteIcon` |
| `CZDGAME003` | 400 | You have already claimed this reward. | Challenge progress is already claimed, or today's master chest has been taken. | `RewardAlreadyClaimedIcon` |
| `CZDGAME004` | 400 | You have already checked in today. Come back tomorrow. | A check-in row already exists for this user and date. | `AlreadyDoneTodayIcon` |
| `CZDGAME005` | 400 | You have used your spin for today. Come back tomorrow. | Daily spin limit reached for this user. | `AlreadyDoneTodayIcon` |
| `CZDGAME006` | 400 | The wheel is not ready yet. Please try again later. | No active spin wheel segments are configured. | `NotConfiguredIcon` |
| `CZDGAME007` | 404 | There is no quiz available right now. | No active quiz exists for today. | `QuizUnavailableIcon` |
| `CZDGAME008` | 400 | You have already answered today’s quiz. | An attempt row already exists for this user and quiz. | `AlreadyDoneTodayIcon` |
| `CZDGAME009` | 400 | Please pick one of the given options. | selected_option is not present in the quiz options array. | `InvalidOptionIcon` |
| `CZDGAME010` | 400 | You have used your scratch card for today. | Every card won today has already been scratched. | `AlreadyDoneTodayIcon` |
| `CZDGAME011` | 400 | Scratch cards are not ready yet. Please try again later. | No active scratch card rewards are configured. | `NotConfiguredIcon` |
| `CZDGAME012` | 404 | We could not find that lucky draw. | No lucky draw exists for the given id. | `DrawNotFoundIcon` |
| `CZDGAME013` | 400 | Entries for this draw are closed. | Lucky draw status is not open, or draw_date has passed. | `DrawClosedIcon` |
| `CZDGAME014` | 400 | You are already entered in this draw. | An entry row already exists for this user and draw. | `AlreadyEnteredIcon` |
| `CZDGAME015` | 400 | You have already claimed today’s streak reward. | last_claimed_date on the streak already equals today. | `RewardAlreadyClaimedIcon` |
| `CZDGAME016` | 404 | Streak rewards are not ready yet. Please try again later. | No streak reward config exists for the next day number. | `NotConfiguredIcon` |
| `CZDGAME017` | 400 | Answer today’s quiz correctly to win a scratch card. | The user holds no unscratched card; the quiz is the only source. | `ChallengeIncompleteIcon` |
| `CZDGAME018` | 404 | We could not find that reward. | No reward game exists with that slug or id. | `NotFoundIcon` |
| `CZDGAME019` | 400 | This one is coming soon. Check back shortly. | The reward game status is coming_soon. | `NotConfiguredIcon` |
| `CZDGAME020` | 400 | This reward is paused right now. Please try again later. | The reward game status is paused. | `NotConfiguredIcon` |
| `CZDGAME021` | 400 | This reward is played instantly, not entered. | buy-entries was called on an instant game. | `ValidationFailedIcon` |
| `CZDGAME022` | 400 | This reward is a draw. Buy entries to take part. | play was called on a draw game. | `ValidationFailedIcon` |
| `CZDGAME023` | 400 | Please choose a valid number of entries. | The entry count is outside the range the game allows. | `ValidationFailedIcon` |
| `CZDGAME024` | 400 | This reward is not ready yet. Please try again later. | The game has no active prize carrying a weight above 0. | `NotConfiguredIcon` |

## Redeem — `CZDRDM`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDRDM001` | 404 | We could not find that gift card. | No gift card product exists for the given id. | `ProductNotFoundIcon` |
| `CZDRDM002` | 400 | This gift card is no longer available. | Gift card product is inactive. | `ProductUnavailableIcon` |
| `CZDRDM003` | 404 | We could not find that order. | No gift card order exists for the given id and user. | `OrderNotFoundIcon` |
| `CZDRDM004` | 500 | We could not complete this redemption. Your coins were returned. | *Reserved.* The gift card provider rejected or failed the order. | `FulfillmentFailedIcon` |
| `CZDRDM005` | 400 | Your gift card code is not ready yet. Please check back soon. | Order status is still pending; no code has been issued. | `CodeNotReadyIcon` |

## Referrals — `CZDREF`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDREF001` | 400 | You cannot use your own referral code. | *Reserved.* Referral code belongs to the signing-up user. | `SelfReferralIcon` |
| `CZDREF002` | 400 | This account has already used a referral code. | *Reserved.* A referral row already exists for this referred user. | `ReferralAlreadyUsedIcon` |
| `CZDREF003` | 404 | That referral code is not valid. | *Reserved.* No user owns the supplied referral code. | `ReferralInvalidIcon` |
| `CZDREF004` | 404 | We could not find that referral rule. | No `referral_reward_rules` row exists for the given id. | `ReferralInvalidIcon` |
| `CZDREF005` | 409 | A rule for that step already exists. | A `referral_reward_rules` row already uses this trigger. | `DuplicateOptionIcon` |

## Achievements — `CZDACH`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDACH001` | 404 | We could not find that achievement. | No achievement exists for the given id. | `AchievementNotFoundIcon` |
| `CZDACH002` | 403 | You have not unlocked this achievement yet. | *Reserved.* User achievement progress is below criteria_value. | `AchievementLockedIcon` |
| `CZDACH003` | 409 | You have already claimed this achievement. | *Reserved.* User achievement already has an unlocked_at timestamp. | `RewardAlreadyClaimedIcon` |

## KYC — `CZDKYC`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDKYC001` | 404 | We could not find that verification. | `GET /api/admin/kyc/:id` was given an id with no matching attempt. | `VerificationNotFoundIcon` |
| `CZDKYC002` | 400 | Your identity is already verified. | User kyc_status is already verified. | `AlreadyVerifiedIcon` |
| `CZDKYC003` | 400 | Your verification is being reviewed. We will update you soon. | An earlier KYC verification is still pending a decision. A `manual_review` row does not block a retry. | `ReviewInProgressIcon` |
| `CZDKYC004` | 400 | We could not see your face clearly. Please retake the selfie. | Rekognition returned no face in the uploaded image. Not thrown as an error — returned as `reason_code` on a successful `POST /api/kyc/verify` whose `status` is `rejected`. | `SelfieNoFaceIcon` |
| `CZDKYC005` | 400 | Please take a selfie with only you in the frame. | Rekognition detected more than one face in the image. Not thrown as an error — returned as `reason_code` on a successful `POST /api/kyc/verify` whose `status` is `rejected`. | `SelfieMultipleFacesIcon` |
| `CZDKYC006` | 400 | That image could not be read. Please retake the selfie. | *Reserved.* Image is corrupt, empty, or an unsupported format. | `ImageInvalidIcon` |
| `CZDKYC007` | 503 | Verification is unavailable right now. Please try again shortly. | The AWS Rekognition call failed or timed out. | `VerificationUnavailableIcon` |
| `CZDKYC008` | 409 | That verification has already been decided. | `POST /api/admin/kyc/:id/decision` on an attempt that is already `verified`, which is final. Admin-facing only. | `TicketResolvedIcon` |

## Support — `CZDSUP`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDSUP001` | 404 | We could not find that request. | No support ticket exists for the given id and user. | `TicketNotFoundIcon` |
| `CZDSUP002` | 400 | This request has already been resolved. | *Retired.* Only the deleted admin ticket-respond endpoint threw this. Never thrown. | `TicketResolvedIcon` |
| `CZDSUP003` | 404 | We could not find that answer. | No FAQ exists for the given id. | `FaqNotFoundIcon` |
| `CZDSUP004` | 404 | We could not find that help topic. | `POST`/`PATCH /api/admin/faqs` was given a `category_id` with no matching FAQ category. | `FaqTopicNotFoundIcon` |

## Admin — `CZDADM`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDADM001` | 404 | We could not find that admin account. | *Retired.* Coinzu has no admin table — admins are Rewardtym accounts. Never thrown. | `AdminNotFoundIcon` |
| `CZDADM002` | 401 | This admin account is inactive. | *Retired.* An inactive admin now fails token verification as `CZDAUTH004`. Never thrown. | `AccountInactiveIcon` |
| `CZDADM003` | 409 | An admin with this email already exists. | *Retired.* Admin accounts are created in Rewardtym, not here. Never thrown. | `DuplicateEmailIcon` |
| `CZDADM004` | 404 | We could not find that setting. | `PATCH /api/admin/settings` was sent a `setting_key` with no catalogue entry. | `SettingNotFoundIcon` |
| `CZDADM006` | 404 | We could not find that scheduled job. | No job in the cron catalogue matches that key. Admin-facing only. | `SettingNotFoundIcon` |
| `CZDADM005` | 400 | Please check the value you entered and try again. | A setting value is the wrong type, outside its catalogue `min`/`max`, or a key was sent twice. | `ValidationFailedIcon` |

`CZDADM001`–`CZDADM003` stay in the registry because codes are a public
contract and are never reused or renumbered. They are dead: nothing in the
codebase throws them.

## Notifications — `CZDNOTIF`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDNOTIF001` | 404 | We could not find that notification. | No notification exists for the given id and user. Also thrown when a push campaign id does not resolve. | `NotificationNotFoundIcon` |
| `CZDNOTIF002` | 409 | That campaign can no longer be cancelled. | `POST /api/admin/push/:id/cancel` on a campaign that is not a `draft` or `scheduled`. Admin-facing only. | `TicketResolvedIcon` |
| `CZDNOTIF003` | 404 | We could not find that template. | No push template exists with that id. Admin-facing only. | `NotificationNotFoundIcon` |

## Storage — `CZDSTR`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDSTR001` | 400 | Please choose a file to upload. | No file was present on the multipart request. | `FileRequiredIcon` |
| `CZDSTR002` | 400 | That file type is not supported. Please upload a JPG or PNG. | Uploaded MIME type is outside the allowed list. | `FileTypeInvalidIcon` |
| `CZDSTR003` | 400 | That file is too large. Please upload a smaller image. | Uploaded file exceeds the configured size limit. | `FileTooLargeIcon` |
| `CZDSTR004` | 500 | We could not upload that file. Please try again. | The object storage PutObject call failed. | `UploadFailedIcon` |

## Dropdown — `CZDDRP`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDDRP001` | 404 | We could not find that option. | No `dropdown_options` row exists for the given id. | `DropdownOptionNotFoundIcon` |
| `CZDDRP002` | 409 | That option already exists. | A `dropdown_options` row already has this type and value. | `DuplicateOptionIcon` |
| `CZDDRP003` | 404 | We could not find that category. | No `dropdown_types` row exists for the given id. | `DropdownOptionNotFoundIcon` |
| `CZDDRP004` | 409 | That category already exists. | A `dropdown_types` row already uses this type key. | `DuplicateOptionIcon` |

## Offerwall — `CZDOFW`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDOFW001` | 404 | We could not find that offerwall. | No `offerwall_partners` row exists for the given id or slug. | `ProviderNotFoundIcon` |
| `CZDOFW002` | 403 | This offerwall is temporarily unavailable. | The offerwall partner is set inactive by an admin. | `OfferUnavailableIcon` |
| `CZDOFW003` | 409 | That offerwall slug is already in use. | An `offerwall_partners` row already has this slug. | `DuplicateOptionIcon` |
| `CZDOFW004` | 401 | We could not verify this request. | The postback token or signature did not match the partner. | `RequestUnverifiedIcon` |
| `CZDOFW005` | — | This reward has already been recorded. | Reserved — currently recorded as `data.status: "duplicate"` in a `200`, never thrown. | `DuplicateRewardIcon` |
| `CZDOFW006` | — | We could not match this reward to a user. | Reserved — currently recorded as `data.status: "user_not_found"` in a `200`, never thrown. | `AccountNotFoundIcon` |

## Common — `CZDCOMM`

| Code | Status | Message (shown to user) | Cause | Icon |
|---|---|---|---|---|
| `CZDCOMM001` | 400 | Please check the details you entered and try again. | One or more fields in the request are invalid. | `ValidationFailedIcon` |
| `CZDCOMM002` | 500 | Something went wrong. Please try again. | An unexpected error occurred while processing the request. | `ServerErrorIcon` |
| `CZDCOMM003` | 503 | Service is temporarily unavailable. Please try again shortly. | A dependency required to serve this request is unavailable. | `ServiceUnavailableIcon` |
| `CZDCOMM004` | 404 | We could not find what you were looking for. | The requested resource does not exist. | `NotFoundIcon` |
| `CZDCOMM005` | 429 | Too many requests. Please slow down and try again. | Rate limit exceeded for this client. | `RateLimitedIcon` |

## Error icons

Every error carries a `cz_error_icon` — a `CzErrorIcon` member name (e.g.
`InsufficientCoinsIcon`) identifying which icon the client shows in its error
sheet. The name-to-image mapping is not code — it is data, stored as ordinary
`dropdown_options` rows of type `error_icon` (`value` = the icon name,
`icon_url` = the image an admin uploaded through the Dropdown admin tab).

The client fetches the whole map once via
`GET /api/dropdown?types=error_icon`, caches `{value: icon_url}` locally, and
on any error looks up `cz_error_icon` in that cache to render the icon. An
icon name with no matching dropdown row yet (nothing uploaded) means the
client shows its own generic fallback — this is expected until an admin
uploads every icon.

Several distinct codes share one icon on purpose (e.g. every "not found"
falls back to `NotFoundIcon` unless a more specific one exists) — the icon
set is small and reusable, not one image per code.

## Notes

- `CZDCOMM001` is raised by the global validation pipe. It also covers unknown fields, because the pipe rejects anything not on the DTO.
- `CZDCOMM002` is the fallback for any unhandled server error, and for a thrown code missing from `CzErrorMap`.
- `CZDCOMM003` and `CZDCOMM004` are filled in by the filter when an exception carries no `cz_error_code` and the status is 503 or 404.
- `CZDCOMM005` comes from the global throttler at 120 requests per minute per IP.
- `CZDAUTH003`, `CZDAUTH004` and `CZDAUTH005` can come back from any authenticated endpoint, so handle them once in the HTTP client rather than per call.
