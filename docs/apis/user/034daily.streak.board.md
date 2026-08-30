# GET /api/daily/streak

The whole Rewards screen in one call — the 30-day board, every tile's payout, where the user is on it, and whether today is still unclaimed. **The app calls this on open.**

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/daily/streak` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `current_day` | integer | The last day the user claimed, `0`–`30`. `0` means the board has not been started, or it was broken by a missed day. |
| `longest_day` | integer | The furthest they have ever reached. Never resets — this is the record to show off. |
| `last_claimed_date` | string (date) \| null | UTC calendar date of the last claim, `yyyy-MM-dd`. |
| `can_claim_today` | boolean | `false` once today has been claimed. Drives the button state. |
| `claimable_day` | integer \| null | Which tile `POST /api/daily/streak/claim` will pay right now. `null` when today is already claimed. |
| `cycle_days` | integer | Always `30`. The board length. |
| `total_coins` | integer | Coins across the whole board — what the "Win up to" banner shows. |
| `total_gems` | integer | Gems across the whole board. |
| `data[].day_number` | integer | Position on the board, `1`–`30`. |
| `data[].reward_coins` | integer | Coins this day pays. `0` when it pays none. |
| `data[].reward_gems` | integer | Gems this day pays. `0` when it pays none. |
| `data[].label` | string \| null | What to print on the tile, e.g. `Token` or `Week 1 bonus`. |
| `data[].is_milestone` | boolean | Draw this tile with the gold border. |
| `data[].is_claimed` | boolean | Already collected in the current run — draw the green tick. |
| `data[].is_today` | boolean | The tile claimable right now. At most one tile has this, and none when `can_claim_today` is `false`. |
| `total` | integer | Number of tiles returned. Always `30` once the ladder is configured. |

```json
{
  "success": true,
  "data": {
    "current_day": 6,
    "longest_day": 6,
    "last_claimed_date": "2026-08-29",
    "can_claim_today": true,
    "claimable_day": 7,
    "cycle_days": 30,
    "total_coins": 5000,
    "total_gems": 2000,
    "data": [
      {
        "day_number": 1,
        "reward_coins": 60,
        "reward_gems": 0,
        "label": "Token",
        "is_milestone": false,
        "is_claimed": true,
        "is_today": false
      },
      {
        "day_number": 7,
        "reward_coins": 300,
        "reward_gems": 200,
        "label": "Week 1 bonus",
        "is_milestone": true,
        "is_claimed": false,
        "is_today": true
      }
    ],
    "total": 30
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
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

This endpoint has no fixed-value string fields — every tile is numbers, a free-text `label`, and booleans.

## Example

```bash
curl http://localhost:4000/api/daily/streak \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **This is the daily check-in.** There is no separate check-in endpoint — reading the board and claiming from it is the whole feature. Call this on app open; call `POST /api/daily/streak/claim` when the user taps the tile.
- Reading the board **never** claims anything and never pays out. It is safe to poll.
- **A missed day resets the run.** A nightly job sets `current_day` back to `0` for anyone who did not claim yesterday, so `claimable_day` becomes `1` again. `longest_day` is untouched.
- **Day 30 wraps to day 1.** The board is a repeating cycle, not a one-off, so a user who finishes it starts again the next day.
- `is_claimed` reflects the **current run**, not lifetime — after a reset every tile is unclaimed again.
- `total_coins` and `total_gems` are the sum of the configured board. An admin can change any day's payout at any time from the Daily Streak tab, so read these rather than hard-coding 5,000 and 2,000.
- A day may pay coins, gems, both, or nothing. Render a `0` as an empty slot rather than "0 coins".
- All dates are UTC calendar dates. The day rolls over at 00:00 UTC, not in the user's local time.
