# GET /api/games/quiz/history

Lists the past quiz attempts of the signed-in user, newest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/games/quiz/history` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | number | no | 1-based page number. Defaults to `1`. |
| `limit` | query | number | no | Rows per page. Values above 100 are capped at 100. Defaults to `20`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Attempts on this page. |
| `data[].cz_quiz_attempt_id` | string (uuid) | Primary key of the attempt. |
| `data[].user_id` | string (uuid) | Who answered. |
| `data[].quiz_id` | string (uuid) | The quiz that was answered. |
| `data[].selected_option` | string | What the user picked. |
| `data[].is_correct` | boolean | Whether it was right. |
| `data[].reward_coins` | number | Coins paid. |
| `data[].attempted_at` | string (iso date) | When it was answered. |
| `total` | number | Total attempts by this user. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_quiz_attempt_id": "1d4f8027-63ca-4e91-b57d-9028fa16c3b4",
        "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
        "quiz_id": "e5b71c48-2a09-4d6f-88b3-05fc71a9d2e6",
        "selected_option": "Bitcoin",
        "is_correct": true,
        "reward_coins": 100,
        "attempted_at": "2026-08-27T09:06:44.000Z"
      }
    ],
    "total": 18
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "One or more fields in the request are invalid.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl 'http://localhost:4000/api/games/quiz/history?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- The attempt rows do not carry the question text; fetch the quiz by `quiz_id` if the screen needs it.
- Wrong answers are listed too, with `reward_coins: 0`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
