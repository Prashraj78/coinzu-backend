# POST /api/daily/streak/claim

Claims today's tile on the 30-day board and credits it. **This is the daily check-in** — it also records the check-in row and advances challenges, achievements and referral rules.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/daily/streak/claim` |
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

None. Which day is claimed is decided by the server from the user's own board — the app never sends a day number.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `day_number` | integer | The tile that was just claimed, `1`–`30`. |
| `reward_coins` | integer | Coins credited. `0` when the day pays none. |
| `reward_gems` | integer | Gems credited. `0` when the day pays none. |
| `label` | string \| null | The tile's label, for the celebration copy. |
| `is_milestone` | boolean | Whether this was a gold-border day — worth a bigger animation. |
| `current_day` | integer | Where the user now sits on the board. Equals `day_number`. |
| `longest_day` | integer | Their all-time record, updated if this beat it. |
| `cycle_days` | integer | Always `30`. |
| `cycle_completed` | boolean | `true` only on the day they finished all 30 — show the Streak Champion screen. |
| `claimed_date` | string (date) | UTC calendar date of this claim, `yyyy-MM-dd`. |
| `total_checkins` | integer | Lifetime check-ins, across every run of the board. |

```json
{
  "success": true,
  "data": {
    "day_number": 7,
    "reward_coins": 300,
    "reward_gems": 200,
    "label": "Week 1 bonus",
    "is_milestone": true,
    "current_day": 7,
    "longest_day": 7,
    "cycle_days": 30,
    "cycle_completed": false,
    "claimed_date": "2026-08-30",
    "total_checkins": 7
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDGAME015` | You have already claimed today's streak reward. | Today has been claimed. Comes back tomorrow. | `AlreadyDoneTodayIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 404 | `CZDGAME016` | This streak day is not set up yet. Please try again later. | The admin has not configured that day. Should not happen on a complete board. | `NotConfiguredIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME015",
  "cz_error_message": "You have already claimed today's streak reward.",
  "cz_error_description": "The user already claimed a streak day today.",
  "cz_error_icon": "AlreadyDoneTodayIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T04:26:44.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST http://localhost:4000/api/daily/streak/claim \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Once per UTC day.** A second call the same day is a `400 CZDGAME015`, not a silent no-op, so the app can tell the difference between "already collected" and a failure.
- **The server picks the day.** It claims `claimable_day` from `GET /api/daily/streak`. The app cannot claim out of order or skip ahead.
- **This replaces the old check-in endpoints.** `GET /api/daily/checkin` and `POST /api/daily/checkin` were removed — they were a second daily reward path over the same action. Everything they did happens here: the `daily_checkins` row is written, `total_checkins` is returned, and challenges, achievements and referral rules all advance.
- **Both currencies are credited separately.** A milestone day that pays coins and gems writes two `wallet_transactions` rows, both with `source_type: "streak"`. Read the new balances from `GET /api/wallet` rather than adding the deltas locally.
- `cycle_completed` is `true` only on the day day-30 is claimed. The next day the board wraps and `claimable_day` is `1` again.
- A missed day resets the run before this is called, so a user who skips a day claims day 1 next time, not the day they were on.
- All dates are UTC calendar dates. The day rolls over at 00:00 UTC.
