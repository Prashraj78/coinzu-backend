# POST /api/admin/streak/reset

Puts the shipped 30-day ladder back: 25 ordinary days, four weekly milestones and a finale, summing to exactly 5,000 coins and 2,000 gems.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/streak/reset` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `201`

Identical to `GET /api/admin/streak`, describing the ladder that was just written.

The default ladder:

| Days | Coins | Gems | Label | Milestone |
|---|---|---|---|---|
| 1–6, 8–13, 15–20, 22–27, 29 (25 days) | 60 each | 0 | `Token` | no |
| 7 | 300 | 200 | `Week 1 bonus` | yes |
| 14 | 500 | 300 | `Week 2 bonus` | yes |
| 21 | 700 | 400 | `Week 3 bonus` | yes |
| 28 | 1000 | 500 | `Week 4 bonus` | yes |
| 30 | 1000 | 600 | `Streak champion` | yes |
| **Total** | **5,000** | **2,000** | | |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_streak_reward_config_id": "3f2a1c88-9b41-4d02-8e77-1c5b90d4a613",
        "day_number": 1,
        "reward_coins": 60,
        "reward_gems": 0,
        "label": "Token",
        "is_milestone": false,
        "users_on_day": 4
      }
    ],
    "total": 30,
    "cycle_days": 30,
    "configured": true,
    "totals": {
      "coins": 5000,
      "gems": 2000,
    },
    "participation": { "active_users": 5, "completed_users": 0 }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH007",
  "cz_error_message": "You do not have permission to do that.",
  "cz_error_description": "Admin token cannot open Coinzu.",
  "cz_error_icon": "PermissionDeniedIcon",
  "statusCode": 403,
  "timestamp": "2026-08-30T04:31:44.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST "$BASE/admin/streak/reset" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Destructive and unconfirmed.** It clears whatever ladder is there and writes the default over it, with no undo. The tab should confirm before calling it.
- It is the fastest way to get from an empty or partial board to a valid one — a fresh install has no ladder at all, and a user claiming an unconfigured day gets `CZDGAME016`.
- Like `PUT /api/admin/streak`, this runs in one transaction and does not disturb users mid-board or rewrite past payouts.
- Idempotent in effect: calling it twice leaves the same ladder, though `cz_streak_reward_config_id` values are regenerated each time.
- The default ladder sums to 5,000 coins and 2,000 gems across the 30 days.
