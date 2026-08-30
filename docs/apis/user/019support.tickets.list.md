# GET /api/support/tickets

Lists the tickets of the signed-in user, newest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/support/tickets` |
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
| `data` | object[] | Tickets on this page. Fields are listed in `docs/018support.tickets.create.md`. |
| `total` | number | How many tickets this user raised. |

```json
{
  "success": true,
  "data": {
    "data": [
  {
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
    ],
    "total": 4
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
| `status` | `open`, `in_progress`, `resolved` | — |
| `type` | `email_support`, `report_problem`, `feedback` | — |

## Example

```bash
curl 'http://localhost:4000/api/support/tickets?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- `admin_response` is filled in as soon as support replies, so the same list doubles as the conversation view.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
