# POST /api/games/scratch

Scratches one card, credits the prize, and advances the scratch achievements. The amount is drawn server-side.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/games/scratch` |
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

None. Which prize is won, and how much it pays, are both decided server-side.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_scratch_history_id` | string (uuid) | This scratch. |
| `cz_scratch_card_id` | string (uuid) | The prize that was drawn. |
| `label` | string | That prize's caption, e.g. `Better luck`. |
| `reward_coins` | integer | Coins actually credited. |
| `reward_gems` | integer | Gems actually credited. |
| `cards_left` | integer | Cards remaining today. |

```json
{
  "success": true,
  "data": {
    "cz_scratch_history_id": "4ed32d38-a773-46b8-9c8e-4fc9f4f31c75",
    "cz_scratch_card_id": "69b32fa9-b415-4044-b2b8-e0ca0b95a503",
    "label": "Coin drop",
    "reward_coins": 47,
    "reward_gems": 0,
    "cards_left": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDGAME017` | Answer today's quiz correctly to win a scratch card. | The user has won no card today. | `ChallengeIncompleteIcon` |
| 400 | `CZDGAME010` | You have used your scratch card for today. | Every card won today has already been scratched. | `AlreadyDoneTodayIcon` |
| 400 | `CZDGAME011` | Scratch cards are not ready yet. Please try again later. | No active prize is configured, or none the user's medal reaches. | `NotConfiguredIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME017",
  "cz_error_message": "Answer today’s quiz correctly to win a scratch card.",
  "cz_error_description": "The user holds no unscratched card; the quiz is the only source.",
  "cz_error_icon": "ChallengeIncompleteIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T11:34:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST http://localhost:4000/api/games/scratch \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **The amount is drawn per scratch, so it is genuinely unpredictable.** A prize can be configured as a **band** — say 25 to 250 coins — and the exact figure is picked inside that band at the moment the card is scratched. Two users who draw the same prize win different amounts, and the same user scratching the same prize twice will usually see two different numbers. Reveal `reward_coins`; never cache a figure against a `cz_scratch_card_id`.
- **`label` is a caption, not a formula.** Print it as sent and never parse a number out of it — the amount is in `reward_coins` and `reward_gems`.
- **A card can pay nothing.** Both rewards `0` is a normal draw, not an error.
- **The pool is not the same for everyone.** A prize can be gated behind a medal tier, so a user's best medal decides which prizes they can draw. This is invisible to the app: better medals simply produce better outcomes over time. At least one prize is always ungated, so a user with no medal can still win.
- **Every card comes from the quiz.** There is no free allowance: each scratch spends a card that a correct quiz answer granted, oldest first. The two failure modes are worth telling apart — `CZDGAME017` means "you have not won one yet", and should send the user to the quiz; `CZDGAME010` means "you already opened it", and should not.
- **`CZDGAME011` is possible even when cards are left**, if an admin has left the pool empty. Treat it as "try again later", not as a spent allowance.
- **The credit has already happened** when this returns. Read the new balance from `GET /api/wallet`.
- **Refresh the board afterwards.** `GET /api/daily/challenges` drops the quiz tile's `scratch_card_ready` highlight once the won card is scratched.
- **Cards expire with the day.** An unscratched card is gone at 00:00 UTC and does not carry over.
