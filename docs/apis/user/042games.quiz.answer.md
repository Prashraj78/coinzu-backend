# POST /api/games/quiz/:cz_quiz_id/answer

Submits an answer. A right one wins a scratch card and finishes the Take the Quiz challenge. One attempt a day.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/games/quiz/:cz_quiz_id/answer` |
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
| `cz_quiz_id` | string (uuid) | yes | From `GET /api/games/quiz`. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `selected_option` | string | yes | Max 255, and must match one of the quiz's `options` exactly. | The answer the user tapped. |

```json
{ "selected_option": "WOODY" }
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_quiz_attempt_id` | string (uuid) | This attempt. |
| `is_correct` | boolean | Whether they got it right. |
| `correct_option` | string | The right answer. Sent whether they were right or wrong, so the app can show it. |
| `scratch_card_granted` | boolean | A scratch card was won. Always equal to `is_correct`. |

```json
{
  "success": true,
  "data": {
    "cz_quiz_attempt_id": "20b2e3a2-2ac9-49c3-b716-2f003a012d8c",
    "is_correct": true,
    "correct_option": "WOODY",
    "scratch_card_granted": true
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDGAME008` | You have already answered today's quiz. | An attempt already exists for this user and quiz. | `AlreadyDoneTodayIcon` |
| 400 | `CZDGAME009` | Please pick one of the given options. | `selected_option` is not one of the quiz's options. | `InvalidOptionIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `selected_option` is missing, not a string, or over 255 characters. | `ValidationFailedIcon` |
| 404 | `CZDGAME007` | There is no quiz available right now. | No active quiz exists with that id. | `QuizUnavailableIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME008",
  "cz_error_message": "You have already answered today's quiz.",
  "cz_error_description": "An attempt row already exists for this user and quiz.",
  "cz_error_icon": "AlreadyDoneTodayIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T11:08:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST http://localhost:4000/api/games/quiz/75130136-b35f-4e3b-b8ff-b672a1964aeb/answer \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "selected_option": "WOODY" }'
```

## Notes

- **The field is `selected_option`, and it must match an option string exactly** — send the option's text, not its index. Anything else is `400 CZDGAME009`.
- **`correct_option` comes back either way**, so a wrong answer can still be shown against the right one. It is the only place the answer is ever revealed.
- **One attempt a day, and it cannot be retried.** Gate the submit on `already_attempted` from `GET /api/games/quiz`.
- **The card is the entire prize.** A right answer credits **no coins and no gems** — nothing reaches the wallet from this endpoint. What the user actually wins is decided later, when they scratch the card.
- **`scratch_card_granted` mirrors `is_correct`**, so a right answer always wins exactly one card. When it is `true`, refresh `GET /api/games/scratch` and send the user straight to the card — the daily board does the same, switching the quiz tile to point at the Scratch & Win screen.
- **A wrong answer wins nothing at all** and still uses up the day's single attempt. There is no consolation payout.
- **A right answer finishes the Take the Quiz tile** and counts towards the Master Chest, so refresh `GET /api/daily/challenges` afterwards. A wrong answer still uses up the attempt but does not complete the tile.
- Times are UTC; the quiz rolls at 00:00 UTC.
