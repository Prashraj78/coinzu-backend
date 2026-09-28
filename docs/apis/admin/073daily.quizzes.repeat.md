# POST /api/admin/daily/quizzes/:cz_quiz_id/repeat

Copies a quiz onto another day. A question that landed well is worth running again on a day that has none.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/daily/quizzes/:cz_quiz_id/repeat` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `cz_quiz_id` | string (uuid) | yes | The quiz to copy. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `date` | string (date) | yes | `yyyy-MM-dd`, and not the day it already runs on. | The day to copy it onto. |

```json
{ "date": "2026-09-20" }
```

## Response

### Success — `201`

Identical to `GET /api/admin/daily/quizzes`, so the schedule re-renders from the response.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `date` is malformed, or is the day the quiz already runs on. | `ValidationFailedIcon` |
| 404 | `CZDCOMM004` | We could not find what you were looking for. | No quiz exists with that id. | `NotFoundIcon` |
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
  "cz_error_description": "That is the day the quiz already runs on.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T10:47:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST "$BASE/admin/daily/quizzes/75130136-b35f-4e3b-b8ff-b672a1964aeb/repeat" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "date": "2026-09-20" }'
```

## Notes

- **It copies, it does not move.** The original keeps running on its own day; the target day gets an independent quiz with its own id and its own attempts.
- **Everything comes across**: question, the three options, the correct answer, the image and the active flag. There are no rewards to copy — every quiz wins the same thing, one scratch card.
- **The target day is upserted.** If that day already has a quiz, this one replaces it — the same rule as `POST /api/admin/daily/quizzes`. Check `summary.missing_days` first if you meant to fill a gap rather than overwrite.
- Repeating a question people have already seen makes it trivially easy; `accuracy_pct` on the copy will run high, so prefer this for filling gaps far ahead rather than for the coming week.
