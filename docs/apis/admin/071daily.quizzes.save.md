# POST /api/admin/daily/quizzes

Schedules a quiz for a date. One quiz per day — posting a date that already has one replaces it. There is no reward to set: a right answer wins a scratch card.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/daily/quizzes` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `date` | string (date) | yes | `yyyy-MM-dd`. | The day it runs. Can be up to any date ahead. |
| `question` | string | yes | 1–500 characters. | The question. |
| `options` | string[] | yes | Exactly 3, each 1–120 characters. | The answers. |
| `correct_option` | string | yes | Must be one of `options`. | The right answer. |
| `image_url` | string | no | Max 500. | Shown above the question. |
| `is_active` | boolean | no | Default `true`. | `false` schedules it without running it. |

```json
{
  "date": "2026-09-19",
  "question": "Which sea creature has eight arms?",
  "options": ["SQUID", "OCTOPUS", "CRAB"],
  "correct_option": "OCTOPUS",
  "image_url": "https://cdn.coinzu.app/quiz/octopus.png"
}
```

## Response

### Success — `201`

Identical to `GET /api/admin/daily/quizzes`, so the schedule re-renders from the response.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `correct_option` is not one of the options, there are not exactly 3 options, or a field is out of range. | `ValidationFailedIcon` |
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
  "cz_error_description": "correct_option must be one of the options.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T06:53:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST "$BASE/admin/daily/quizzes" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "date": "2026-09-19",
    "question": "Which sea creature has eight arms?",
    "options": ["SQUID", "OCTOPUS", "CRAB"],
    "correct_option": "OCTOPUS"
  }'
```

## Notes

- **Upsert by date.** There is no separate update route: post the same date again with new content and it replaces what was there. That also makes the editor and the scheduler the same call.
- **The prize is fixed and is not yours to set.** A right answer wins exactly one scratch card and pays no coins and no gems; what the card turns out to be worth is configured in the [scratch pool](069daily.scratch.save.md). Sending `reward_coins`, `reward_gems` or `grants_scratch_card` is a 400.
- **Scheduling a quiz is what switches Scratch & Win on for that day.** No quiz means no cards, for anybody.
- **Exactly three options**, matching the app's layout. `correct_option` must be one of them — checked server-side, so a typo cannot ship an unanswerable quiz.
- **Editing a past quiz does not rewrite attempts.** Users keep what they were paid; `accuracy_pct` for that day will then describe a question nobody actually saw, so prefer scheduling ahead.
- A quiz can be scheduled arbitrarily far out. The tab tracks the next 15 days because that is the horizon the board needs covered.
- `image_url` is a plain URL — upload the file through `POST /api/storage/upload` first and pass the URL it returns.
