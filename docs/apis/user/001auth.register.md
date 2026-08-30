# POST /api/auth/register

Creates a new account with an email and password, sends the email verification code, and returns a signed-in session.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/register` |
| **Auth** | Public — no token required. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `email` | string | yes | Valid email address. | Becomes the account login. Stored lowercase. |
| `password` | string | yes | Minimum 8 characters. | Hashed with bcrypt before it is stored. |
| `name` | string | no | 1–120 characters. | Display name shown in the app. |
| `referral_code` | string | no | 6–12 characters. | A friend's referral code. Links this account to that referrer. |
| `device` | object | no | See `POST /api/users/me/device`. | Registers this install's device for fraud checks and push notifications, same as calling that endpoint right after registering. |

```json
{
  "email": "user@coinzu.app",
  "password": "S3curePassw0rd",
  "name": "Ada Lovelace",
  "referral_code": "K7M2PQ4X",
  "device": {
    "device_id": "b7e2b6b0-1a2b-4c3d-9e4f-5a6b7c8d9e0f",
    "platform_type": "android",
    "push_token": "fcm-or-apns-token",
    "device_info": { "app_version": "1.4.2", "os_version": "17.4", "model": "Pixel 8" }
  }
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `user` | object | The signed-in user, client-safe fields only. |
| `user.cz_user_id` | string (uuid) | Primary key of the user. |
| `user.email` | string | Account email, always lowercase. |
| `user.phone` | string \| null | Phone number, if the user has set one via `PATCH /api/users/me`. `null` until then. |
| `user.name` | string \| null | Display name. |
| `user.avatar_url` | string \| null | Public avatar URL. |
| `user.referral_code` | string | The code this user shares with friends. |
| `user.tier` | string | One of `silver`, `gold`, `platinum`, `diamond`. |
| `user.kyc_status` | string | One of `none`, `pending`, `verified`, `rejected`, `manual_review`. |
| `user.role` | string | `user` or `admin`. |
| `user.status` | string | One of `active`, `suspended`, `banned`, `deleted`. |
| `user.onboarding_completed` | boolean | `true` once all four onboarding steps are saved. |
| `user.profile_completion_pct` | number | Profile completeness, 0–100. |
| `user.email_verified` | boolean | `true` once the email OTP has been verified. |
| `access_token` | string (jwt) | Bearer token for every authenticated call. |
| `refresh_token` | string (jwt) | Long-lived token, used only by `POST /api/auth/refresh`. |

```json
{
  "success": true,
  "data": {
    "user": {
      "cz_user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
      "email": "user@coinzu.app",
      "phone": null,
      "name": "Ada Lovelace",
      "avatar_url": null,
      "referral_code": "K7M2PQ4X",
      "tier": "silver",
      "kyc_status": "none",
      "role": "user",
      "status": "active",
      "onboarding_completed": false,
      "profile_completion_pct": 20,
      "email_verified": false
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjel91c2VyX2lkIjoiMGY3YzJi...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjel91c2VyX2lkIjoiMGY3YzJi..."
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 409 | `CZDUSER001` | This email is already registered. Please sign in instead. | An account already exists with this email. | `DuplicateEmailIcon` |
| 400 | `CZDAUTH014` | That referral code is not valid. | The supplied `referral_code` does not belong to an active user. | `ReferralInvalidIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDUSER001",
  "cz_error_message": "This email is already registered. Please sign in instead.",
  "cz_error_description": "Registration failed. Email already exists.",
  "cz_error_icon": "DuplicateEmailIcon",
  "statusCode": 409,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | `none` means the user has never submitted a selfie. |
| `status` | `active`, `suspended`, `banned`, `deleted` | — |
| `tier` | `silver`, `gold`, `platinum`, `diamond` | Ordered lowest to highest. Driven by lifetime coins earned. |

## Example

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@coinzu.app",
    "password": "S3curePassw0rd",
    "name": "Ada Lovelace",
    "referral_code": "K7M2PQ4X"
  }'
```

## Notes

- A wallet row is created with the account, so `GET /api/wallet` works immediately.
- The account starts with `email_verified: false`. Send the code again with `POST /api/auth/email/send-otp` and confirm it with `POST /api/auth/email/verify-otp`.
- The referral is only recorded here; the referrer is paid later, once this user qualifies (see `docs/apis/050referrals.summary.md`).
- `device` is optional and its result is never echoed back in the response — call `POST /api/users/me/device` afterwards (or again later, e.g. when the push token rotates) to register or refresh it.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
