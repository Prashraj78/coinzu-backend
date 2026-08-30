# GET /api/admin/leaderboard

Coin earners ranked highest first, paginated and filterable. Only users who earned more than zero in the range appear. The Leaderboard tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/leaderboard` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | 1-based page number. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `window` | string | no | Preset range. See [Enum values](#enum-values). Default `all_time`. **Ignored** when `date_from` or `date_end` is sent. |
| `date_from` | string (date) | no | Custom range start, UTC, `yyyy-MM-dd`. Overrides `window`. |
| `date_end` | string (date) | no | Custom range end, UTC, `yyyy-MM-dd`, inclusive. Overrides `window`. |
| `search` | string | no | Case-insensitive match against the user's email or name. |
| `min_coins` | integer | no | Only users who earned at least this many coins in the range. |
| `country` | string | no | ISO country code, exact match. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].rank` | number | Position in the ranking, 1 is highest. Continues across pages, so page 2 starts at 21. |
| `data[].cz_user_id` | string (uuid) | Links to `GET /api/admin/users/:cz_user_id`. |
| `data[].email` | string | Their email. |
| `data[].name` | string \| null | Their display name. |
| `data[].avatar_url` | string \| null | Their profile photo. |
| `data[].country` | string \| null | ISO country code. |
| `data[].status` | string | Account state. Always `active` — other states are excluded from ranking. |
| `data[].total_coins` | number | Coins earned in the range. Always greater than zero. |
| `data[].earn_count` | number | How many separate credits made up that total. |
| `data[].last_earned_at` | string (date-time) \| null | Their most recent credit inside the range. |
| `total` | integer | How many users rank, all pages. |
| `summary.ranked_users` | integer | Same as `total`, repeated where the header uses it. |
| `summary.coins_earned` | number | Every ranked user's coins added up, across all pages. |
| `summary.window` | string | The range in force: one of the `window` values, or `custom` when dates were sent. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "rank": 1,
        "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
        "email": "prashantrajputaaaa@gmail.com",
        "name": "Prashant",
        "avatar_url": null,
        "country": null,
        "status": "active",
        "total_coins": 18905,
        "earn_count": 19,
        "last_earned_at": "2026-08-28T10:30:00.000Z"
      }
    ],
    "total": 6,
    "summary": {
      "ranked_users": 6,
      "coins_earned": 38901,
      "window": "all_time"
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `window` is not one of the allowed values, a date is not `yyyy-MM-dd`, or `min_coins` is below 1. | `ValidationFailedIcon` |
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
  "timestamp": "2026-08-29T08:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `window` | `today`, `week`, `month`, `all_time` | `today` and `week` start at UTC midnight and UTC week start. `month` starts on the 1st, UTC. |
| `summary.window` | `today`, `week`, `month`, `all_time`, `custom` | `custom` means a date range was sent and `window` was ignored. |
| `data[].status` | `active` | Suspended, banned and deleted accounts never rank. |

## Example

```bash
# Preset window
curl "$BASE/admin/leaderboard?window=week&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Exact range, only sizeable earners in one country
curl "$BASE/admin/leaderboard?date_from=2026-08-01&date_end=2026-08-29&min_coins=1000&country=IN" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **There is no leaderboard table.** Ranks are summed live from `wallet_transactions` where `currency = 'coin'` and `type = 'earn'`, so they can never drift from the balances users actually see.
- **Only earners rank.** A `HAVING SUM(amount) > 0` keeps anyone with nothing earned off the board, which is also true of the app-facing `GET /api/leaderboard`.
- Spends, withdrawals, conversions and reversals are **not** subtracted. This ranks what a user earned in the range, not what they still hold.
- Unlike the app endpoint, this is **not cached**, so an admin always sees the live standing rather than a figure up to a minute old.
- `summary.coins_earned` is computed across every ranked user, not just the current page, so it stays correct while paging.
- A date range beats `window`. Send one or the other, not both, and read `summary.window` to see which applied.

- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
