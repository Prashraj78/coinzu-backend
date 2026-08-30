# PATCH /api/notifications/:id/read

Marks one notification as read.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/notifications/:id/read` |
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
| `id` | path | string (uuid) | yes | The `cz_notification_id` to mark read. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_notification_id` | string (uuid) | Primary key of the notification. |
| `user_id` | string (uuid) \| null | Who it is for. `null` means it was sent to everybody. |
| `title` | string | Headline. |
| `body` | string | Message text. |
| `type` | string | `in_app` or `push`. |
| `read_at` | string (iso date) \| null | When it was marked read. `null` means unread. |
| `created_at` | string (iso date) | When it was sent. |

```json
{
  "success": true,
  "data": {
      "cz_notification_id": "c30f7a95-4b12-4de8-96a3-2e5b8d740c1f",
      "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
      "title": "Gift card ready",
      "body": "Your Amazon $10 code is ready to view.",
      "type": "in_app",
      "read_at": "2026-08-27T10:05:00.000Z",
      "created_at": "2026-08-27T10:02:19.000Z"
    }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDNOTIF001` | We could not find that notification. | No notification with that id is visible to this user. | `NotificationNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDNOTIF001",
  "cz_error_message": "We could not find that notification.",
  "cz_error_description": "No notification exists for the given id and user.",
  "cz_error_icon": "NotificationNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `type` | `push`, `in_app` | — |

## Example

```bash
curl -X PATCH http://localhost:4000/api/notifications/c30f7a95-4b12-4de8-96a3-2e5b8d740c1f/read \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- A notification belonging to another user returns `CZDNOTIF001`, the same as one that does not exist.
- Marking a broadcast read sets `read_at` on the shared row, so it is marked read for everybody. Broadcasts are best treated as read-once announcements.
- Marking an already read notification read again simply moves `read_at` forward.
- There is no bulk "mark all read" endpoint; call this once per row.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
