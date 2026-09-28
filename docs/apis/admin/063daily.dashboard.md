# GET /api/admin/daily/dashboard

How much the daily games paid out over a date range, and exactly where it went — by game, by segment, by day, and by player.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/daily/dashboard` |
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
| `date_from` | string (date) | no | Window start, `yyyy-MM-dd`. Defaults to 29 days before `date_to`. |
| `date_to` | string (date) | no | Window end. Defaults to today. |
| `source` | string | no | Narrow to one payout source. See [Enum values](#enum-values). |
| `currency` | string | no | `coin` or `gem`. Zeroes the other side so the split is clean. |
| `granularity` | string | no | `day` (default) or `week` for the series buckets. |
| `top` | integer | no | Rows in the leaderboard, 1–50. Default `10`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `range.date_from` | string (date) | Window start actually used. |
| `range.date_to` | string (date) | Window end actually used. |
| `range.days` | integer | Days in the window, inclusive. |
| `filters.source` | string \| null | Echoes the filter, so the tab can render its state from the response. |
| `filters.currency` | string \| null | Echoes the currency filter. |
| `filters.granularity` | string | `day` or `week`. |
| `totals.coins` | integer | Every coin the daily games paid in range. |
| `totals.gems` | integer | Every gem. |
| `totals.payouts` | integer | How many individual payouts. |
| `totals.players` | integer | Distinct users who were paid. |
| `totals.avg_coins_per_payout` | integer | `coins / payouts`. |
| `totals.avg_coins_per_player` | integer | `coins / players`. |
| `totals.coins_per_day` | integer | `coins / days`. The burn rate. |
| `totals.gems_per_day` | integer | The same in gems. |
| `by_source[].source` | string | Which game. See [Enum values](#enum-values). |
| `by_source[].label` | string | Its display name. |
| `by_source[].coins` | integer | Coins it paid. |
| `by_source[].gems` | integer | Gems it paid. |
| `by_source[].payouts` | integer | Payouts from it. |
| `by_source[].players` | integer | Distinct users it paid. |
| `by_source[].avg_coins` | integer | Coins per payout. |
| `by_source[].share_pct` | number | Its share of every coin paid in range. |
| `breakdown[]` | object[] | The same shape, one row per **thing** that paid: a wheel segment, a scratch prize, a quiz, a tile, the chest. Also carries `source` and `source_label`. |
| `series[].date` | string (date) | Bucket start. Weekly buckets are Monday-anchored. |
| `series[].coins` | integer | Coins in that bucket. |
| `series[].gems` | integer | Gems in that bucket. |
| `series[].payouts` | integer | Payouts in that bucket. |
| `series[].players` | integer | Distinct users in that bucket. |
| `top_earners[].rank` | integer | 1 is the biggest earner. |
| `top_earners[].cz_user_id` | string (uuid) | The user. |
| `top_earners[].name` | string \| null | Display name. |
| `top_earners[].email` | string \| null | Email. |
| `top_earners[].coins` | integer | Coins they took from the daily games. |
| `top_earners[].gems` | integer | Gems. |
| `top_earners[].payouts` | integer | How many payouts. |
| `quiz.attempts` | integer | Quiz answers submitted in range. |
| `quiz.correct` | integer | How many were right. |
| `quiz.players` | integer | Distinct users who answered. |
| `quiz.accuracy_pct` | integer | `correct / attempts`. |
| `engagement.tile_completions` | integer | Tiles finished in range. |
| `engagement.chests_claimed` | integer | Master chests taken. |
| `engagement.active_tiles` | integer | Tiles currently on the board. |
| `engagement.completion_rate_pct` | number | Of every tile every paid player could have finished, how many were. |

```json
{
  "success": true,
  "data": {
    "range": { "date_from": "2026-08-01", "date_to": "2026-08-30", "days": 30 },
    "filters": { "source": null, "currency": null, "granularity": "day" },
    "totals": {
      "coins": 320,
      "gems": 0,
      "payouts": 8,
      "players": 2,
      "avg_coins_per_payout": 40,
      "avg_coins_per_player": 160,
      "coins_per_day": 11,
      "gems_per_day": 0
    },
    "by_source": [
      {
        "source": "challenge",
        "id": "challenge",
        "label": "Challenge tiles",
        "coins": 200,
        "gems": 0,
        "payouts": 4,
        "players": 2,
        "avg_coins": 50,
        "share_pct": 62.5
      }
    ],
    "breakdown": [
      {
        "source": "spin",
        "source_label": "Spin the Lucky Wheel",
        "id": "spin:2718021f-b5ad-4094-b483-6486c2eb578b",
        "label": "10",
        "coins": 20,
        "gems": 0,
        "payouts": 2,
        "players": 2,
        "avg_coins": 10,
        "share_pct": 6.25
      }
    ],
    "series": [
      { "date": "2026-08-29", "coins": 0, "gems": 0, "payouts": 0, "players": 0 },
      { "date": "2026-08-30", "coins": 320, "gems": 0, "payouts": 8, "players": 2 }
    ],
    "top_earners": [
      {
        "rank": 1,
        "cz_user_id": "dbc6dd8c-b845-4708-b315-845234f6d35e",
        "name": "Aarav",
        "email": "aarav@example.com",
        "coins": 210,
        "gems": 0,
        "payouts": 5
      }
    ],
    "quiz": { "attempts": 2, "correct": 2, "players": 2, "accuracy_pct": 100 },
    "engagement": {
      "tile_completions": 4,
      "chests_claimed": 0,
      "active_tiles": 5,
      "completion_rate_pct": 1.3
    }
  }
}
```

> `by_source`, `breakdown`, `series` and `top_earners` are abbreviated above.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | An unknown `source`, `currency` or `granularity`, a malformed date, or an unknown query field. | `ValidationFailedIcon` |
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
  "cz_error_description": "source must be one of the following values: spin, scratch, quiz, challenge, chest",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T10:44:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `source` / `by_source[].source` / `breakdown[].source` | `spin`, `scratch`, `quiz`, `challenge`, `chest` | `challenge` is the five tiles; `chest` is the master chest. |
| `currency` / `filters.currency` | `coin`, `gem` | Omit for both. |
| `granularity` / `filters.granularity` | `day`, `week` | Weekly buckets start on Monday. |

## Example

```bash
# The last 30 days, everything
curl "$BASE/admin/daily/dashboard" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Only what the wheel paid, week by week, over a quarter
curl "$BASE/admin/daily/dashboard?date_from=2026-06-01&date_to=2026-08-30&source=spin&granularity=week" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Coins only, with a longer leaderboard
curl "$BASE/admin/daily/dashboard?currency=coin&top=25" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **This reads the history tables, not the wallet.** Every figure comes from what each game actually recorded — `spin_history`, `scratch_history`, `quiz_attempts`, `user_challenge_progress` and `daily_chest_claims` — so a payout is attributed to the exact segment or prize that produced it, which the wallet's `source_type: "game"` cannot tell apart.
- **`totals.coins_per_day` is the number to watch.** It is the daily cost of the whole feature; compare it against the wheel's and pool's `expected_coins` when you retune the odds.
- **`breakdown` answers "where did it go".** A segment that dominates the list is either too generous or too likely — its `share_pct` and `avg_coins` tell you which.
- **Tile payouts use the challenge's current reward, not the amount paid at the time.** Tiles do not record what they paid, so editing a tile's reward retroactively changes its historical figures here. Spins, scratches, quizzes and chests all store their real amounts and are exact.
- **`series` is dense**: a day with no payouts still appears with zeroes, so the chart never implies activity it did not have.
- **`currency` zeroes rather than filters.** Asking for gems keeps every payout row and its player count, and reports `0` coins — so `payouts` and `players` stay comparable across currency filters.
- **`engagement.completion_rate_pct` divides by `players × active_tiles × days`**, so it is a rate across users who were paid at least once, not across the whole user base. Read it as a trend, not an absolute.
- `top_earners` is worth a glance for anyone far ahead of the pack — the daily games are the easiest surface to farm.
- Everything is UTC, and a day rolls at 00:00 UTC.
