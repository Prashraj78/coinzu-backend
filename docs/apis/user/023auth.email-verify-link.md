# POST /api/auth/email/verify

Consumes the token from the emailed "Confirm my email" link, marks the email verified, and returns a signed-in session. This is what the browser page at `GET /api/auth/email/verify?token=...` calls automatically on load.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/email/verify` |
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
| `token` | string | yes | 64 lowercase hex characters. | The `token` query param from the confirm-email link. |

```json
{
  "token": "aa7782ba386f30ba490d8375100fbf29014e60e2935e5b088e0e7170f07a4fe"
}
```

## Response

### Success — `200`

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
| `user.email_verified` | boolean | `true` once the link has been verified. |
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
      "email_verified": true
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjel91c2VyX2lkIjoiMGY3YzJi...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjel91c2VyX2lkIjoiMGY3YzJi..."
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDAUTH015` | This link has expired or was already used. Please request a new one. | No Redis key exists for this token: it expired, was already consumed, or the format was invalid. | `OtpExpiredIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH015",
  "cz_error_message": "This link has expired or was already used. Please request a new one.",
  "cz_error_description": "The Redis key for this email/reset link token was evicted by its TTL, was already consumed, or never existed.",
  "cz_error_icon": "OtpExpiredIcon",
  "statusCode": 400,
  "timestamp": "2026-08-28T14:47:35.503Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | `none` means the user has never submitted a selfie. |
| `status` | `active`, `suspended`, `banned`, `deleted` | — |
| `tier` | `silver`, `gold`, `platinum`, `diamond` | Ordered lowest to highest. Driven by lifetime coins earned. |

## Example

```bash
curl -X POST http://localhost:4000/api/auth/email/verify \
  -H 'Content-Type: application/json' \
  -d '{ "token": "aa7782ba386f30ba490d8375100fbf29014e60e2935e5b088e0e7170f07a4fe" }'
```

## Notes

- The token is consumed on first successful use and cannot be replayed — a second call with the same token returns `CZDAUTH015`.
- Issued by `OtpService.issue()` whenever a `verify_email` code is sent (on register and on `POST /api/auth/email/send-otp`); the same email carries both this link and the existing numeric code, so either flow works.
- The token lives in Redis only, keyed `link:verify_email:<token>`, TTL `LINK_TOKEN_TTL_MINUTES` (default 30).
- `GET /api/auth/email/verify?token=...` (see `024auth.email-verify-page.md`) is the branded HTML page that calls this endpoint automatically and is what the email's "Confirm my email" button actually links to.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
