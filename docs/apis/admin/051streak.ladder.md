# GET /api/admin/streak

The 30-day streak ladder — what each day pays, how the totals compare with the payout targets, and where users are sitting on the board. The Daily Streak tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/streak` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None. The board is a fixed 30-day cycle, so there is nothing to page or filter.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_streak_reward_config_id` | string (uuid) | Primary key of the day row. |
| `data[].day_number` | integer | Position on the board, `1`–`30`. |
| `data[].reward_coins` | integer | Coins this day pays. |
| `data[].reward_gems` | integer | Gems this day pays. |
| `data[].label` | string \| null | What the app prints on the tile. |
| `data[].is_milestone` | boolean | Drawn with the gold border in the app. |
| `data[].users_on_day` | integer | How many users are sitting on this day right now. |
| `total` | integer | Days configured. |
| `cycle_days` | integer | Always `30`. |
| `configured` | boolean | `false` until all 30 days exist — a user reaching a missing day cannot claim it. |
| `totals.coins` | integer | Coins across the whole board. |
| `totals.gems` | integer | Gems across the whole board. |
| `participation.active_users` | integer | Users with a streak row, i.e. anyone who has opened the board. |
| `participation.completed_users` | integer | Users whose `longest_day` has reached 30 at least once. |

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
      },
      {
        "cz_streak_reward_config_id": "8c71ee02-45a9-4f16-93d0-2b6e77aa1e54",
        "day_number": 7,
        "reward_coins": 300,
        "reward_gems": 200,
        "label": "Week 1 bonus",
        "is_milestone": true,
        "users_on_day": 1
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
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "Authorization header is missing.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-30T04:24:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields — a day is numbers, a free-text `label`, and booleans.

## Example

```bash
curl "$BASE/admin/streak" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Always ordered by `day_number`, ascending.
- `configured` is the one field to check before trusting the board. A ladder with fewer than 30 days will fail a user's claim with `CZDGAME016`; `POST /api/admin/streak/reset` lays a complete one down.
- **`totals.coins` and `totals.gems` are what the ladder actually pays** across the full 30 days. There is no separate target to check them against — the advisory `streak_target_coins` / `streak_target_gems` settings were retired along with the Rewards configuration tab.
- `users_on_day` counts users whose `current_day` equals that day right now, so it moves every night as streaks advance or break. It is a live distribution, not a lifetime total.
- `participation.active_users` counts anyone who has ever opened the board, including those whose run is currently broken (`current_day` back at `0`).
- Editing a day never touches a claim that has already happened — `wallet_transactions` records what was actually paid.
- All dates and times are UTC.
