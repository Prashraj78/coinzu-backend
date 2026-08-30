# PATCH /api/users/me/notification-preferences

Turns push categories on or off for the signed-in user, and controls whether marketing is held back overnight. Backs the Notifications screen in app settings.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/users/me/notification-preferences` |
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

Send only what changed. Anything left out keeps its current value.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `notifications_enabled` | boolean | no | | Master switch for push on this account. |
| `announcement` | boolean | no | | Product news and general announcements. `false` mutes them. |
| `promotion` | boolean | no | | Offers, bonuses and campaigns. |
| `reward` | boolean | no | | Streaks, achievements and earning nudges. |
| `quiet_hours` | boolean | no | | `true` (the default) holds marketing back overnight in the user's own timezone. `false` means they accept being interrupted at any hour. |

`transaction` and `system` are deliberately absent — payout and security messages cannot be muted.

```json
{ "promotion": false, "quiet_hours": true }
```

## Response

### Success — `200`

The updated user. The two fields that matter here:

| Field | Type | Description |
|---|---|---|
| `notifications_enabled` | boolean | The master switch. |
| `notification_preferences` | object | Only the keys the user has ever set. A missing key means opted in. |
| `notification_preferences.announcement` | boolean | Present only once set. |
| `notification_preferences.promotion` | boolean | Present only once set. |
| `notification_preferences.reward` | boolean | Present only once set. |
| `notification_preferences.quiet_hours` | boolean | Present only once set. |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
    "email": "prashantrajputaaaa@gmail.com",
    "name": "Prashant",
    "notifications_enabled": true,
    "notification_preferences": { "promotion": false, "quiet_hours": true },
    "tier": "silver",
    "kyc_status": "none",
    "status": "active"
  }
}
```

> The response is the full user object from `GET /api/users/me`; the sample is abbreviated to the fields this endpoint changes.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A value is not a boolean, or an unknown field was sent — including `transaction` or `system`, which cannot be muted. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 404 | `CZDUSER001` | We could not find that account. | The token's user no longer exists. | `AccountNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "property transaction should not exist",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-29T10:06:12.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| Every field | `true`, `false` | Booleans only. The mutable categories are `announcement`, `promotion` and `reward`; `transaction` and `system` are not accepted. |

## Example

```bash
# Mute promotions, keep everything else
curl -X PATCH http://localhost:4000/api/users/me/notification-preferences \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "promotion": false }'

# Accept being interrupted at any hour
curl -X PATCH http://localhost:4000/api/users/me/notification-preferences \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "quiet_hours": false }'
```

## Notes

- **It merges, it does not replace.** Sending `{ "promotion": false }` leaves an existing `quiet_hours` setting alone, so a screen with one toggle per row can PATCH just the row that moved.
- **A missing key means opted in.** A brand-new account has `notification_preferences: {}` and receives everything; the app should render an unset category as on.
- The opt-out is enforced on the server when an audience is resolved, so a muted user is dropped from a campaign no matter what the admin selected. The admin sees the count as `skipped_muted`, never the identities.
- `transaction` and `system` ignore this endpoint entirely — a payout notice or a security alert always goes out, and always ignores quiet hours.
- The quiet-hours window itself is a platform setting, not a per-user one. `quiet_hours: false` opts out of the window; it does not choose different hours.
- Quiet hours are evaluated against the IANA timezone the app reported in `device_info.timezone` on `POST /api/users/me/device`. A device that never sent one is treated as UTC, so send it.
- `notifications_enabled` is the same field `POST /api/users/me/onboarding/permissions` sets during account setup.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
