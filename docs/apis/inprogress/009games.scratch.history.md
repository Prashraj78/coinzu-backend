# GET /api/games/scratch/history

Lists the past scratch cards of the signed-in user, newest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/games/scratch/history` |
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
| `data` | object[] | Plays on this page. |
| `data[].cz_scratch_history_id` | string (uuid) | Primary key of the play. |
| `data[].user_id` | string (uuid) | Who played. |
| `data[].card_id` | string (uuid) | The prize that was won. |
| `data[].reward_coins` | number | Coins won. |
| `data[].reward_gems` | number | Gems won. |
| `data[].played_at` | string (iso date) | When the card was scratched. |
| `total` | number | Total plays by this user. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_scratch_history_id": "6c02a7f9-31b8-4de5-9047-8f1c25a06db3",
        "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
        "card_id": "3c8e5a17-9f04-42db-b6e1-70da28c5f931",
        "reward_coins": 100,
        "reward_gems": 0,
        "played_at": "2026-08-27T09:08:50.000Z"
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

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl 'http://localhost:4000/api/games/scratch/history?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- Rows are counted against the daily limit by `played_at`, using the UTC day.
- History is kept for good, so this is the full record of every card.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
