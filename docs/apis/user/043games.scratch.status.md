# GET /api/games/scratch

How many scratch cards the signed-in user has left today. Cards are won from the quiz and nowhere else.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
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

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cards_used` | integer | Cards scratched today. |
| `cards_left` | integer | Cards still available — won today and not yet scratched. |
| `granted_cards` | integer | The same figure. Every card is a won card, so the two always agree. |

```json
{
  "success": true,
  "data": {
    "cards_used": 0,
    "cards_left": 1,
    "granted_cards": 1
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
  "timestamp": "2026-08-30T11:32:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl http://localhost:4000/api/games/scratch \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **The prize pool is never sent.** There is no list of what a card can pay and no odds — the prize is drawn server-side when the card is scratched. Render the unscratched card as a closed foil, not as a menu.
- **There is no free allowance.** A card exists only because the user answered today's quiz correctly, so `cards_left` is `0` for anyone who has not played or got it wrong. Point them at the quiz rather than showing an empty card.
- **`cards_left` is the number to gate the button on.** Scratching with none returns `400 CZDGAME017` ("answer the quiz to win a card") when they never had one, and `400 CZDGAME010` when they have already scratched it.
- **`GET /api/daily/challenges` reports the same figures** under `availability.scratch_cards_left` and `availability.scratch_cards_pending`, so the board does not need this call. Use this one on the scratch screen itself.
- A user's best medal changes which prizes are in their pool, but never how many cards they get. That is invisible here by design.
- **Cards expire with the day.** An unscratched card does not carry over past 00:00 UTC, so a "scratch it before midnight" nudge is worth having.
