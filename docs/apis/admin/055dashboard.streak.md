# GET /api/admin/dashboard/streak

Daily-streak participation, depth and payout, shaped for the Dashboard tab's streak card.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/dashboard/streak` |
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

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `on_streak` | integer | Users with a live run right now, i.e. `current_day > 0`. |
| `active_users` | integer | Everyone who has ever opened the board, broken runs included. |
| `completed_users` | integer | Users whose `longest_day` has reached 30 at least once. |
| `claimed_today` | integer | Users who have already claimed today. |
| `average_day` | number | Mean day across everyone on a run, one decimal. `0` when nobody is. |
| `longest_day` | integer | The furthest any user has ever reached. |
| `cycle_days` | integer | Always `30`. |
| `paid_out.coins` | integer | Lifetime coins credited by streak claims. |
| `paid_out.gems` | integer | Lifetime gems credited by streak claims. |
| `paid_out.claims` | integer | How many days have been claimed across every user and run. |
| `distribution[].day_number` | integer | Position on the board, `1`–`30`. One entry per day, always all 30. |
| `distribution[].users` | integer | Users sitting on that day right now. |
| `distribution[].is_milestone` | boolean | Lets the chart colour milestone bars differently. |

```json
{
  "success": true,
  "data": {
    "on_streak": 7,
    "active_users": 7,
    "completed_users": 0,
    "claimed_today": 3,
    "average_day": 3.7,
    "longest_day": 7,
    "cycle_days": 30,
    "paid_out": { "coins": 510, "gems": 200, "claims": 3 },
    "distribution": [
      { "day_number": 1, "users": 2, "is_milestone": false },
      { "day_number": 2, "users": 1, "is_milestone": false },
      { "day_number": 7, "users": 2, "is_milestone": true }
    ]
  }
}
```

> `distribution` is abbreviated above. It always carries all 30 days, in order, including days with `0` users.

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
  "timestamp": "2026-08-30T05:12:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl "$BASE/admin/dashboard/streak" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **A live snapshot, not a time series.** Every number is "right now"; there is no date range and nothing is cached. A nightly job breaks missed runs, so `on_streak` and `distribution` shift every morning.
- `distribution` always returns all 30 days, so the chart can be drawn without filling gaps client-side. It is keyed off the configured ladder — an incomplete ladder returns fewer entries, which is itself a signal that `POST /api/admin/streak/reset` is needed.
- `paid_out` is summed from `wallet_transactions` where `source_type = 'streak'` and `type = 'earn'`, so it reflects what was **actually credited** at the time, not what the current ladder would pay. Editing a day never rewrites history.
- `paid_out.claims` counts coin rows only, so a day paying gems alone is not double-counted. A day paying nothing at all is not counted.
- `active_users` includes broken runs; `on_streak` does not. The gap between them is churn.
- `average_day` is weighted by users, not a median, so one user deep into the board pulls it up.
- The Daily Streak tab (`GET /api/admin/streak`) covers the same ground per day with `users_on_day`. This endpoint is the aggregate view; use that one to edit the ladder.
