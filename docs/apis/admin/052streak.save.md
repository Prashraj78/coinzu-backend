# PUT /api/admin/streak

Replaces the whole 30-day ladder in one transaction. The board is saved as a set, never a row at a time.

## Overview

| Item | Value |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/streak` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `days` | object[] | yes | Exactly 30 entries, one per day, in any order. | The whole board. |
| `days[].day_number` | integer | yes | 1–30, each exactly once. | Position on the board. |
| `days[].reward_coins` | integer | yes | 0–1,000,000. | Coins this day pays. `0` for none. |
| `days[].reward_gems` | integer | yes | 0–1,000,000. | Gems this day pays. `0` for none. |
| `days[].label` | string | no | Max 40 characters. | What the app prints on the tile. |
| `days[].is_milestone` | boolean | no | Defaults to `true` on days 7, 14, 21, 28 and 30. | Draw the gold border. |

```json
{
  "days": [
    { "day_number": 1, "reward_coins": 60, "reward_gems": 0, "label": "Token", "is_milestone": false },
    { "day_number": 7, "reward_coins": 300, "reward_gems": 200, "label": "Week 1 bonus", "is_milestone": true }
  ]
}
```

> The sample is abbreviated. All 30 days must be present or the call is rejected.

## Response

### Success — `200`

Identical to `GET /api/admin/streak`, so the tab can re-render straight from the response.

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
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | Fewer or more than 30 days, a duplicate or missing `day_number`, a negative reward, a label over 40 characters, or an unknown field. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "Day 12 is missing. Send all 30 days.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T04:31:02.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X PUT "$BASE/admin/streak" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "days": [ { "day_number": 1, "reward_coins": 60, "reward_gems": 0 }, ...29 more ] }'
```

## Notes

- **All or nothing.** The write runs in a transaction that clears the board and re-inserts it, so a rejected payload leaves the previous ladder exactly as it was. A partly written board would leave a day nobody can claim.
- **Every day is required, every time.** This is a `PUT`, not a `PATCH`: send all 30 days including the ones you did not change. `cz_streak_reward_config_id` values are regenerated on each save — never store them.
- **Editing does not touch past claims.** A user who already collected day 7 keeps what they were paid; `wallet_transactions` is the record. The new amount applies to the next user who reaches that day.
- **Users mid-board are not disturbed.** Their `current_day` is unchanged, so someone on day 12 next claims day 13 at whatever day 13 now pays.
- The totals are **not** validated against anything. Whatever the ladder sums to is what it pays; the response reports `totals.coins` and `totals.gems` so the tab can show the new figure.
- A day paying `0` coins and `0` gems is allowed — it still advances the streak, it just pays nothing.
