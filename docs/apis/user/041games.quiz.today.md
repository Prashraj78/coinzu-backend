# GET /api/games/quiz

Today's quiz — the question, its image, exactly three options, and whether the user has already answered. A right answer wins a scratch card and nothing else.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/games/quiz` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None. There is exactly one quiz a day and it is always today's.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_quiz_id` | string (uuid) | Pass to `POST /api/games/quiz/:id/answer`. |
| `date` | string (date) | The UTC day this quiz runs on. |
| `question` | string | The question. |
| `options` | string[] | Exactly three answers, in the order to render them. |
| `image_url` | string \| null | Shown above the question. `null` when the admin set none. |
| `already_attempted` | boolean | One attempt per user per day. |
| `my_attempt` | object \| null | The attempt, when there is one. |
| `my_attempt.cz_quiz_attempt_id` | string (uuid) | The attempt. |
| `my_attempt.selected_option` | string | What they picked. |
| `my_attempt.is_correct` | boolean | Whether it was right. |
| `my_attempt.attempted_at` | string (date-time) | When they answered. |

```json
{
  "success": true,
  "data": {
    "cz_quiz_id": "75130136-b35f-4e3b-b8ff-b672a1964aeb",
    "date": "2026-08-30",
    "question": "What is the name of the toy cowboy in Toy Story?",
    "options": ["SMITH", "WOODY", "JACK"],
    "image_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/quiz-images/353daf7f.png",
    "already_attempted": true,
    "my_attempt": {
      "cz_quiz_attempt_id": "20b2e3a2-2ac9-49c3-b716-2f003a012d8c",
      "selected_option": "WOODY",
      "is_correct": true,
      "attempted_at": "2026-08-30T10:27:35.449Z"
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDGAME007` | There is no quiz available right now. | No active quiz is scheduled for today. | `QuizUnavailableIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME007",
  "cz_error_message": "There is no quiz available right now.",
  "cz_error_description": "No active quiz exists for today.",
  "cz_error_icon": "QuizUnavailableIcon",
  "statusCode": 404,
  "timestamp": "2026-08-30T11:06:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl http://localhost:4000/api/games/quiz \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **The correct answer is never sent here.** It comes back only in the response to `POST /api/games/quiz/:id/answer`, after the user has committed — so the answer cannot be read out of the payload.
- **Always exactly three options**, in the order given. Render them as sent; the order is not shuffled server-side.
- **A 404 is a normal state, not a failure.** Days can go unscheduled; show "no quiz today" rather than an error. `GET /api/daily/challenges` says the same thing more cheaply through `availability.quiz_available`.
- **The prize is a scratch card, and only a scratch card.** A right answer pays **no coins and no gems** — there is nothing to configure and nothing to display, so build the screen around "answer right and win a scratch card". That is the hook.
- **This is the only way to get a card.** There is no free daily allowance any more, so a user who does not answer, or answers wrongly, has nothing to scratch that day.
- **`already_attempted` is final for the day.** Once true, show `my_attempt` as a result card rather than a playable question; answering again returns `400 CZDGAME008`.
- `image_url` is a plain URL rendered above the question — prefer a wide crop, and handle `null`.
- The quiz rolls at **00:00 UTC**, not local midnight.
