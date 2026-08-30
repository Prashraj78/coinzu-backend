# POST /api/users/me/onboarding/goal

Account setup step 4 — saves the primary goal and marks onboarding complete.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/users/me/onboarding/goal` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `primary_goal` | string | yes | 1–60 characters. | What the user wants to earn towards, for example `save_for_a_trip`. |

```json
{
  "primary_goal": "save_for_a_trip"
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_user_id` | string (uuid) | Primary key of the user. |
| `email` | string | Account email, always lowercase. |
| `phone` | string \| null | Phone number, if the user has set one via `PATCH /api/users/me`. `null` until then. |
| `google_id` | string \| null | Google subject id when the account is linked to Google. |
| `name` | string \| null | Display name. |
| `gender` | string \| null | Self-reported gender. |
| `age_range` | string \| null | One of `18-24`, `25-34`, `35-44`, `45-54+`. |
| `country` | string \| null | ISO 3166-1 alpha-2 country code. |
| `avatar_url` | string \| null | Public avatar URL. |
| `interests` | string[] | Interest tags picked during onboarding. |
| `primary_goal` | string \| null | The goal picked in the last onboarding step. |
| `referral_code` | string | The code this user shares with friends. |
| `referred_by` | string (uuid) \| null | The user who referred this account. |
| `tier` | string | One of `silver`, `gold`, `platinum`, `diamond`. |
| `kyc_status` | string | One of `none`, `pending`, `verified`, `rejected`, `manual_review`. |
| `profile_completion_pct` | number | Profile completeness, 0–100. |
| `role` | string | `user` or `admin`. |
| `status` | string | One of `active`, `suspended`, `banned`, `deleted`. |
| `onboarding_completed` | boolean | `true` once the goal step is saved. |
| `notifications_enabled` | boolean | Whether the user accepted push notifications. |
| `email_verified_at` | string (iso date) \| null | When the email was verified. |
| `phone_verified_at` | string (iso date) \| null | Always `null`. Phone verification was removed with SMS. |
| `last_login_at` | string (iso date) \| null | Last successful sign-in. |
| `created_at` | string (iso date) | When the account was created. |
| `updated_at` | string (iso date) | When the account was last changed. |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
    "email": "user@coinzu.app",
    "phone": null,
    "google_id": null,
    "name": "Ada Lovelace",
    "gender": "female",
    "age_range": "25-34",
    "country": "GB",
    "avatar_url": "https://cdn.coinzu.app/avatars/0f7c2b9e.png",
    "interests": ["gaming", "shopping", "travel"],
    "primary_goal": "save_for_a_trip",
    "referral_code": "K7M2PQ4X",
    "referred_by": null,
    "tier": "silver",
    "kyc_status": "verified",
    "profile_completion_pct": 100,
    "role": "user",
    "status": "active",
    "onboarding_completed": true,
    "notifications_enabled": true,
    "email_verified_at": "2026-08-20T10:12:00.000Z",
    "phone_verified_at": null,
    "last_login_at": "2026-08-27T08:59:11.000Z",
    "created_at": "2026-08-20T10:11:02.000Z",
    "updated_at": "2026-08-27T08:59:11.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDUSER002` | We could not find that account. | No user exists with that id. | `AccountNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDUSER002",
  "cz_error_message": "We could not find that account.",
  "cz_error_description": "No user exists for the given identifier.",
  "cz_error_icon": "AccountNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `age_range` | `18-24`, `25-34`, `35-44`, `45-54+` | — |
| `kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | `none` means the user has never submitted a selfie. |
| `status` | `active`, `suspended`, `banned`, `deleted` | — |
| `tier` | `silver`, `gold`, `platinum`, `diamond` | Ordered lowest to highest. Driven by lifetime coins earned. |

## Example

```bash
curl -X POST http://localhost:4000/api/users/me/onboarding/goal \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "primary_goal": "save_for_a_trip" }'
```

## Notes

- This is the last step. It sets `onboarding_completed` to `true`.
- Calling it again simply overwrites the goal; the flag stays `true`.
- The client should route to the home screen once this returns.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
