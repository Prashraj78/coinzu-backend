# DELETE /api/admin/daily/quizzes/:cz_quiz_id

Removes a scheduled quiz. The day then has none, and the Take the Quiz tile is unplayable on it.

## Overview

| Item | Value |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/admin/daily/quizzes/:cz_quiz_id` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `cz_quiz_id` | string (uuid) | yes | The quiz to remove. |

### Body

None.

## Response

### Success — `200`

Identical to `GET /api/admin/daily/quizzes`, with the quiz gone and `summary.missing_days` updated.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
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
  "cz_error_code": "CZDCOMM004",
  "cz_error_message": "We could not find what you were looking for.",
  "cz_error_description": "No quiz exists with that id.",
  "cz_error_icon": "NotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-30T06:55:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X DELETE "$BASE/admin/daily/quizzes/75130136-b35f-4e3b-b8ff-b672a1964aeb" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Permanent, and there is no soft delete.** To keep the row but stop it running, post the same date with `is_active: false` instead.
- **Attempts are kept.** `quiz_attempts` rows survive, so what users were paid is never rewritten — but the attempt then points at a quiz that no longer exists.
- **Deleting today's quiz mid-day** makes the tile unplayable for anyone who has not answered yet, and puts the master chest out of reach for them. Prefer editing over deleting on a live day.
