# GET /api/leaderboard

Returns the top coin earners for today, this week, or all time.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/leaderboard` |
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
| `window` | query | string | no | One of `today`, `week`, `all_time`. Defaults to `all_time`. |
| `limit` | query | number | no | Rows to return, 1 to 100. Defaults to `50`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Rows, highest earner first. |
| `data[].rank` | number | Placement, starting at 1. |
| `data[].cz_user_id` | string (uuid) | The user. |
| `data[].name` | string \| null | Display name. |
| `data[].avatar_url` | string \| null | Avatar. |
| `data[].total_coins` | number | Coins earned inside the window. |
| `total` | number | How many rows were returned. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "rank": 1,
        "cz_user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
        "name": "Ada Lovelace",
        "avatar_url": "https://cdn.coinzu.app/avatars/0f7c2b9e.png",
        "total_coins": 184300
      }
    ],
    "total": 50
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
| `window` | `today`, `week`, `all_time` | — |

## Example

```bash
curl 'http://localhost:4000/api/leaderboard?window=week&limit=50' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Only users who earned more than zero appear.** A `HAVING SUM(amount) > 0` keeps empty accounts off the board, so the list is never padded with people at 0 coins.

- Ranks are summed from the wallet ledger rather than a leaderboard table, so they can never drift from the balances users actually see.
- Only `earn` rows in coins count. Spending coins does not lower a rank.
- Suspended and banned accounts are left out.
- `today` and `week` are measured in UTC, and a week starts on Monday.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
