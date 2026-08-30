# POST /api/games/spin

Spins the wheel once, credits whatever it lands on, and advances the Spin the Lucky Wheel challenge.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/games/spin` |
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

None. The result is drawn server-side.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_spin_history_id` | string (uuid) | This spin. |
| `cz_spin_wheel_config_id` | string (uuid) | The segment that won. Matches an id from `GET /api/games/spin`, so the app can stop the wheel on it. |
| `label` | string | That segment's caption. |
| `reward_coins` | integer | Coins credited. Matches that segment's `reward_coins` from `GET /api/games/spin`. |
| `reward_gems` | integer | Gems actually credited. |
| `spins_left` | integer | Spins remaining today. |

```json
{
  "success": true,
  "data": {
    "cz_spin_history_id": "11d41457-525e-49c5-b183-3c46a98888de",
    "cz_spin_wheel_config_id": "41a9cf85-dead-41a0-8ac8-06782928c414",
    "label": "100",
    "reward_coins": 100,
    "reward_gems": 0,
    "spins_left": 0
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDGAME005` | You have used your spin for today. Come back tomorrow. | The daily allowance is spent. | `AlreadyDoneTodayIcon` |
| 400 | `CZDGAME006` | The wheel is not ready yet. Please try again later. | No active segment is configured. | `NotConfiguredIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME005",
  "cz_error_message": "You have used your spin for today. Come back tomorrow.",
  "cz_error_description": "Daily spin limit reached for this user.",
  "cz_error_icon": "AlreadyDoneTodayIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T11:04:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST http://localhost:4000/api/games/spin \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **The winning segment is drawn server-side from admin-managed weights and is final.** Animate to the `cz_spin_wheel_config_id` that comes back; never pick a wedge locally, and never re-request hoping for a different result.
- **The payout always matches the wedge.** `reward_coins` and `reward_gems` equal that segment's values from `GET /api/games/spin`, so the number the user saw before spinning is the number they get.
- **A spin can pay nothing.** `reward_coins` and `reward_gems` both `0` is a normal outcome, not an error — show the wedge's `label` (e.g. "Better luck") rather than "0 coins".
- **The credit has already happened** when this returns. Read the new balance from `GET /api/wallet` rather than adding the delta locally.
- **It advances the daily board.** Spinning completes the Spin the Lucky Wheel tile and counts towards the Master Chest — refresh `GET /api/daily/challenges` afterwards.
- Gate the button on `spins_left` from `GET /api/games/spin` rather than calling and handling `CZDGAME005`.
- The allowance resets at **00:00 UTC**.
