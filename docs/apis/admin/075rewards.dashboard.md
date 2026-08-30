# GET /api/admin/rewards/dashboard

What the Rewards feature took in and paid out over a date range, by reward and by day.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/rewards/dashboard` |
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
| `date_from` | string (date) | no | Window start. Defaults to 29 days before `date_to`. |
| `date_to` | string (date) | no | Window end. Defaults to today. |
| `slug` | string | no | Narrow to one reward. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `range.date_from` / `.date_to` / `.days` | — | The window actually used. |
| `filters.slug` | string \| null | Echoes the filter. |
| `totals.gems_collected` | integer | Gems spent on entries and plays. **The revenue side.** |
| `totals.coins_paid` | integer | Coins paid out, instant wins plus draw prizes. **The cost side.** |
| `totals.plays` | integer | Entries bought plus instant plays. |
| `totals.winners` | integer | Distinct winners across settled draws. |
| `totals.gems_per_day` | integer | `gems_collected / days`. |
| `totals.coins_per_day` | integer | `coins_paid / days`. |
| `by_game[].slug` / `.title` / `.kind` | — | Which reward. |
| `by_game[].gems_collected` | integer | Its take. |
| `by_game[].coins_paid` | integer | Its payout. |
| `by_game[].plays` | integer | Entries and plays. |
| `by_game[].share_pct` | number | Its share of every gem collected. |
| `series[].date` | string (date) | One day. Dense — a quiet day is a zero row. |
| `series[].gems_in` / `.coins_out` / `.plays` | integer | That day's figures. |

```json
{
  "success": true,
  "data": {
    "range": { "date_from": "2026-08-01", "date_to": "2026-08-30", "days": 30 },
    "filters": { "slug": null },
    "totals": {
      "gems_collected": 610,
      "coins_paid": 720,
      "plays": 61,
      "winners": 1,
      "gems_per_day": 20,
      "coins_per_day": 24
    },
    "by_game": [
      {
        "cz_reward_game_id": "…",
        "slug": "daily_lucky_draw",
        "title": "Daily Lucky Draw",
        "kind": "draw",
        "gems_collected": 560,
        "coins_paid": 500,
        "plays": 56,
        "share_pct": 91.8
      }
    ],
    "series": [
      { "date": "2026-08-29", "gems_in": 0, "coins_out": 0, "plays": 0 },
      { "date": "2026-08-30", "gems_in": 610, "coins_out": 720, "plays": 61 }
    ]
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A malformed date or an unknown query field. | `ValidationFailedIcon` |
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
  "cz_error_description": "date_from must be a valid ISO 8601 date string",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:10:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `slug` / `by_game[].slug` | `wheel_of_fortune`, `daily_lucky_draw`, `mystery_box`, `weekly_lucky_draw` | Admin-managed, so treat the set as open. |
| `by_game[].kind` | `instant`, `draw` | |

## Example

```bash
curl "$BASE/admin/rewards/dashboard" -H 'Authorization: Bearer $ADMIN_TOKEN'

curl "$BASE/admin/rewards/dashboard?date_from=2026-08-01&date_to=2026-08-30&slug=wheel_of_fortune" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **`gems_collected` against `coins_paid` is the whole health check.** Gems are bought; coins are given away. If the coin figure runs consistently ahead of the gem figure, the wheel odds or the payout bands are too generous.
- **The three sources are read separately and summed**: instant plays from `reward_plays`, entries from `lucky_draw_entries`, and prizes from `lucky_draw_winners` joined to their draw. That is why a draw's payout appears on the day the draw settled, not the day the entries were bought.
- **`series` is dense**, so a day with no activity is a zero row rather than a gap — the chart never implies a trend that is not there.
- A `coming_soon` game appears with zeroes until it goes live, which is normal.
- Everything is UTC.
