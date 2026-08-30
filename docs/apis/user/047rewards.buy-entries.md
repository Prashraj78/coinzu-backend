# POST /api/rewards/:slug/entries

Buys entries into a draw with gems. More entries is more chance, and there is no limit on how many purchases a user makes.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/rewards/:slug/entries` |
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

| Name | Type | Required | Description |
|---|---|---|---|
| `slug` | string | yes | A draw game, e.g. `daily_lucky_draw`. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `count` | integer | yes | Between the game's `min_entries` and `max_entries`. | How many entries to buy. |

```json
{ "count": 10 }
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_lucky_draw_entry_id` | string (uuid) | This purchase. |
| `cz_lucky_draw_id` | string (uuid) | The draw they were bought into. |
| `entries_bought` | integer | This purchase alone. |
| `gems_spent` | integer | `count × entry_cost_gems`. |
| `my_entries` | integer | Their **total** for this draw, across every purchase. |
| `participants_count` | integer | Players in the draw now. |
| `entries_count` | integer | Entries sold this period. |
| `draw_date` | string (date-time) | When it settles. |

```json
{
  "success": true,
  "data": {
    "cz_lucky_draw_entry_id": "7ca20983-23d3-421a-91ec-ed02f21e6ef5",
    "cz_lucky_draw_id": "d720adca-19fe-4a69-9c5c-7d33be558a7a",
    "entries_bought": 10,
    "gems_spent": 100,
    "my_entries": 18,
    "participants_count": 7,
    "entries_count": 66,
    "draw_date": "2026-08-31T00:00:00.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDWLT003` | You do not have enough gems for this. | The wallet cannot cover `count × entry_cost_gems`. | `InsufficientBalanceIcon` |
| 400 | `CZDGAME021` | This reward is played instantly, not entered. | The slug is an instant game — call `play` instead. | `ValidationFailedIcon` |
| 400 | `CZDGAME023` | Please choose a valid number of entries. | `count` is outside the game's range. The description gives the range. | `ValidationFailedIcon` |
| 400 | `CZDGAME019` | This one is coming soon. Check back shortly. | The game is `coming_soon`. | `NotConfiguredIcon` |
| 400 | `CZDGAME020` | This reward is paused right now. Please try again later. | The game is `paused`. | `NotConfiguredIcon` |
| 400 | `CZDGAME013` | This lucky draw is closed. | No draw is open, or the deadline has passed. | `DrawClosedIcon` |
| 404 | `CZDGAME018` | We could not find that reward. | No reward exists with that slug. | `NotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME023",
  "cz_error_message": "Please choose a valid number of entries.",
  "cz_error_description": "Buy between 1 and 250 entries.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:04:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST http://localhost:4000/api/rewards/daily_lucky_draw/entries \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "count": 10 }'
```

## Notes

- **Entries stack.** Every purchase adds to the same draw, so `my_entries` is the running total and `entries_bought` is just this one. A user can buy as many times as they like before the deadline.
- **More entries buys more chance, never a second prize.** Winners are drawn weighted by entries held, but without replacement — one user can only appear once in the results.
- **Nothing is charged unless the entry is recorded.** If the gem debit fails, the entry is removed before the error is returned, so a failed purchase never leaves a phantom entry. Verified: a purchase the wallet could not cover left the entry count unchanged.
- **Check the balance before enabling the button.** `entry_cost_gems × count` against `gem_balance` from `GET /api/wallet` gives a better experience than handling `CZDWLT003` — and the "Add Gems" shortcut belongs on that failure.
- **Refresh the detail screen afterwards.** `participants_count` and `prize_pool_coins` both move as people join, and the pot may have just crossed a threshold into a bigger band.
- **Entries do not carry over.** They belong to one period; when the draw settles they are spent whether or not the user won.
- The deadline is `draw_date`, at 00:00 UTC.
