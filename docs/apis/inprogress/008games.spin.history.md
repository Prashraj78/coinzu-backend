# GET /api/games/spin/history

Lists the past spins of the signed-in user, newest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/games/spin/history` |
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
| `data` | object[] | Spins on this page. |
| `data[].cz_spin_history_id` | string (uuid) | Primary key of the spin. |
| `data[].user_id` | string (uuid) | Who spun. |
| `data[].config_id` | string (uuid) | The segment that was won. |
| `data[].reward_coins` | number | Coins won. |
| `data[].reward_gems` | number | Gems won. |
| `data[].played_at` | string (iso date) | When the spin happened. |
| `total` | number | Total spins by this user. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_spin_history_id": "b90c14fe-7d25-4a83-9f61-2c07d5b84a13",
        "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
        "config_id": "7a9d0e12-58bc-4f36-8d24-1b6039e4c7f0",
        "reward_coins": 50,
        "reward_gems": 0,
        "played_at": "2026-08-27T09:04:12.000Z"
      }
    ],
    "total": 26
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
curl 'http://localhost:4000/api/games/spin/history?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- History rows are kept for good, so this is the full record of every spin.
- Match `config_id` against `GET /api/games/spin` to show the segment label.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
