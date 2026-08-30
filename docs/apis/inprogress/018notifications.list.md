# GET /api/notifications

Lists the notifications of the signed-in user together with every broadcast, newest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/notifications` |
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
| `data` | object[] | Notifications on this page. |
| `data[].cz_notification_id` | string (uuid) | Primary key of the notification. |
| `data[].user_id` | string (uuid) \| null | Who it is for. `null` means it was sent to everybody. |
| `data[].title` | string | Headline. |
| `data[].body` | string | Message text. |
| `data[].type` | string | `in_app` or `push`. |
| `data[].read_at` | string (iso date) \| null | When it was marked read. `null` means unread. |
| `data[].created_at` | string (iso date) | When it was sent. |
| `total` | number | How many notifications this user can see. |
| `unread_count` | number | How many are still unread, across every page. Drives the bell badge. |

```json
{
  "success": true,
  "data": {
    "data": [
  {
      "cz_notification_id": "c30f7a95-4b12-4de8-96a3-2e5b8d740c1f",
      "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
      "title": "Gift card ready",
      "body": "Your Amazon $10 code is ready to view.",
      "type": "in_app",
      "read_at": null,
      "created_at": "2026-08-27T10:02:19.000Z"
    }
    ],
    "total": 31
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

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `type` | `push`, `in_app` | — |

## Example

```bash
curl 'http://localhost:4000/api/notifications?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- `unread_count` is folded into this response, so the bell badge needs no second call. The separate `unread-count` endpoint was removed. To refresh just the badge, call this with `limit=1`.

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- Rows with `user_id: null` are broadcasts sent to everybody and appear in every user's list.
- `read_at` being `null` is what marks a row unread.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
