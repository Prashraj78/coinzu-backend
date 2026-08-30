# POST /api/auth/google

Signs in with a Google ID token, creating the account on first use.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/google` |
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
| `id_token` | string | yes | Non-empty string. | The Google ID token returned by the Google Sign-In SDK on the client. |
| `referral_code` | string | no | 6–12 characters. | A friend's referral code. Only applied when this call creates the account. |

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjZmNzI1NDEwMWY...",
  "referral_code": "K7M2PQ4X"
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
| 401 | `CZDAUTH012` | We could not sign you in with Google. Please try again. | The Google ID token failed verification, expired, or was issued for a different client id. | `GoogleSignInFailedIcon` |
| 401 | `CZDAUTH002` | Account is inactive. Please contact support. | The matched account status is not `active`. | `AccountInactiveIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH012",
  "cz_error_message": "We could not sign you in with Google. Please try again.",
  "cz_error_description": "Google ID token failed verification or has a wrong audience.",
  "cz_error_icon": "GoogleSignInFailedIcon",
  "statusCode": 401,
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
curl -X POST http://localhost:4000/api/auth/google \
  -H 'Content-Type: application/json' \
  -d '{ "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjZmNzI1NDEwMWY..." }'
```

## Notes

- The token is verified against `GOOGLE_CLIENT_ID`; a token minted for another app is rejected.
- Matching order is `google_id` first, then `email`. An existing password account with the same email is linked, not duplicated.
- Google accounts arrive with `email_verified: true`, so no email OTP step is needed.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
