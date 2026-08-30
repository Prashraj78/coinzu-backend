# GET /api/offers/categories

Lists the categories that currently have live offers.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/offers/categories` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | string[] | Distinct category slugs. |
| `total` | number | How many categories were returned. |

```json
{
  "success": true,
  "data": {
    "data": ["games", "shopping", "surveys", "finance"],
    "total": 4
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "No Bearer token was provided in the Authorization header.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl http://localhost:4000/api/offers/categories \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Categories come from the offers themselves, so the list changes as providers sync.
- Offers with no category are skipped.
- Feed a value straight back into `GET /api/offers?category=<slug>`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
