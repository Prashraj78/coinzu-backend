# GET /api/support/tickets/:id

Returns one of the signed-in user’s tickets.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/support/tickets/:id` |
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
| `id` | path | string (uuid) | yes | The `cz_support_ticket_id` of the ticket. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_support_ticket_id` | string (uuid) | Primary key of the ticket. |
| `user_id` | string (uuid) | Who raised it. |
| `type` | string | `email_support`, `report_problem` or `feedback`. |
| `category` | string \| null | Free-text topic, for example `Withdrawals`. |
| `subject` | string \| null | Short title. |
| `description` | string | What the user wrote. |
| `rating` | number \| null | Star rating from 1 to 5, feedback only. |
| `attachment_urls` | string[] | Uploaded screenshots. Empty array when none. |
| `status` | string | `open`, `in_progress` or `resolved`. |
| `admin_response` | string \| null | The reply from support. |
| `resolved_by` | string (uuid) \| null | The admin who resolved it. |
| `created_at` | string (iso date) | When it was raised. |
| `updated_at` | string (iso date) | When it last changed. |

```json
{
  "success": true,
  "data": {
      "cz_support_ticket_id": "9e0b4a72-63d5-4c81-a297-5f14c8e0b3d6",
      "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
      "type": "report_problem",
      "category": "Withdrawals",
      "subject": "Coins missing after offer",
      "description": "I completed the offer yesterday but got no coins.",
      "rating": null,
      "attachment_urls": ["https://cdn.coinzu.app/support/a.png"],
      "status": "open",
      "admin_response": null,
      "resolved_by": null,
      "created_at": "2026-08-27T07:55:12.000Z",
      "updated_at": "2026-08-27T07:55:12.000Z"
    }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDSUP001` | We could not find that request. | No ticket with that id belongs to this user. | `TicketNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDSUP001",
  "cz_error_message": "We could not find that request.",
  "cz_error_description": "No support ticket exists for the given id and user.",
  "cz_error_icon": "TicketNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `open`, `in_progress`, `resolved` | — |
| `type` | `email_support`, `report_problem`, `feedback` | — |

## Example

```bash
curl http://localhost:4000/api/support/tickets/9e0b4a72-63d5-4c81-a297-5f14c8e0b3d6 \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- A ticket belonging to another user returns `CZDSUP001`, the same as a ticket that does not exist.
- `resolved_by` is an internal admin id and is not meant to be shown to the user.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
