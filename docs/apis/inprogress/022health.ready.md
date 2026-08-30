# GET /api/health/ready

Readiness probe. Runs a trivial query to confirm the database answers.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/health/ready` |
| **Auth** | Public — no token required. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Accept` | no | `application/json` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `status` | string | `ok` when the database answered, `degraded` when it did not. |
| `database` | string | `up` or `down`. |

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "up"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM005",
  "cz_error_message": "Too many requests. Please slow down and try again.",
  "cz_error_description": "Rate limit exceeded for this client.",
  "cz_error_icon": "RateLimitedIcon",
  "statusCode": 429,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl http://localhost:4000/api/health/ready
```

## Notes

- A database that is down still returns HTTP 200 with `status: "degraded"`, so check the body rather than the status code.
- The query is `SELECT 1`, so the check costs almost nothing and is safe to poll.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
