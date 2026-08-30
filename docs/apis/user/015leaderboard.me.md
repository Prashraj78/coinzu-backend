# GET /api/leaderboard/me

Returns where the signed-in user sits in the chosen window, even when they are outside the top list.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/leaderboard/me` |
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
| `limit` | query | number | no | Accepted for shape only, 1 to 100. It does not change the answer. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `rank` | number \| null | Placement, or `null` when the user is outside the top 1000 or earned nothing. |
| `total_coins` | number | Coins earned inside the window. `0` when the user has not earned yet. |
| `window` | string | The window the answer was measured over. |

```json
{
  "success": true,
  "data": {
    "rank": 128,
    "total_coins": 9450,
    "window": "week"
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
curl 'http://localhost:4000/api/leaderboard/me?window=week' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- The rank is looked up inside the top 1000 of the window. Below that, `rank` comes back `null` while `total_coins` stays `0`, so show "unranked" rather than a number.
- The counting rules are the same as `GET /api/leaderboard`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
