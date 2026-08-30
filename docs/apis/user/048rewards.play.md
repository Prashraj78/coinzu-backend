# POST /api/rewards/:slug/play

Pays for one instant play and resolves it there and then. This is the paid Wheel of Fortune — buy a spin, spin it, keep what it lands on.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/rewards/:slug/play` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `slug` | string | yes | An instant game, e.g. `wheel_of_fortune`. |

### Body

None. The entry fee and the result are both decided server-side.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_reward_play_id` | string (uuid) | This play. |
| `cz_reward_prize_id` | string (uuid) | The segment that won. Matches a `prizes[]` id from the detail call, so the wheel can stop on it. |
| `label` | string | That segment's caption. |
| `reward_coins` | integer | Coins credited. |
| `reward_gems` | integer | Gems credited. |
| `gems_spent` | integer | What the play cost. |
| `played_at` | string (date-time) | When it resolved. |

```json
{
  "success": true,
  "data": {
    "cz_reward_play_id": "3f1a2b3c-4d5e-4f60-8a71-9b2c3d4e5f60",
    "cz_reward_prize_id": "8c9d0e1f-2a3b-4c5d-9e6f-7a8b9c0d1e2f",
    "label": "100 Coins",
    "reward_coins": 100,
    "reward_gems": 0,
    "gems_spent": 10,
    "played_at": "2026-08-30T12:03:41.882Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDWLT003` | You do not have enough gems for this. | The wallet cannot cover the entry fee. | `InsufficientBalanceIcon` |
| 400 | `CZDGAME022` | This reward is a draw. Buy entries to take part. | The slug is a draw — call `entries` instead. | `ValidationFailedIcon` |
| 400 | `CZDGAME019` | This one is coming soon. Check back shortly. | The game is `coming_soon` — the Mystery Box today. | `NotConfiguredIcon` |
| 400 | `CZDGAME020` | This reward is paused right now. Please try again later. | The game is `paused`. | `NotConfiguredIcon` |
| 400 | `CZDGAME024` | This reward is not ready yet. Please try again later. | No active prize carries a weight above 0. | `NotConfiguredIcon` |
| 404 | `CZDGAME018` | We could not find that reward. | No reward exists with that slug. | `NotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME019",
  "cz_error_message": "This one is coming soon. Check back shortly.",
  "cz_error_description": "The reward game status is coming_soon.",
  "cz_error_icon": "NotConfiguredIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:03:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST http://localhost:4000/api/rewards/wheel_of_fortune/play \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Unlimited, and that is the point.** There is no daily cap on the paid wheel — a user can buy and spin as many times as their gems allow. `my_plays_today` on the detail response is informational, not a limit.
- **The result is drawn server-side from admin-managed weights and is final.** Animate to the `cz_reward_prize_id` that comes back; never pick a segment locally, and never re-request hoping for a better one.
- **The odds are never sent to the app.** The detail response lists the prizes so the wheel face can be drawn, but not how likely each one is.
- **A play can pay nothing.** Both rewards `0` is a normal outcome — show the segment's `label` (e.g. "Better luck") rather than "0 coins".
- **The gem is taken before the wheel turns**, so a play that resolves has definitely been paid for. Both the debit and any credit are already committed when this returns; read the new balance from `GET /api/wallet` rather than adjusting locally.
- **This is a different game from the free daily spin.** `POST /api/games/spin` is the once-a-day free wheel on the Daily Challenges board; this one is paid, unlimited, and has its own segments and its own odds.
- **The Mystery Box is the same endpoint** once it goes live — nothing in the app needs to change beyond the card no longer being `coming_soon`.
