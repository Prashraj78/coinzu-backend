# GET /api/health

Liveness probe. Answers as long as the process is running.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/health` |
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
| `status` | string | Always `ok`. |
| `service` | string | Always `coinzu-backend`. |
| `env` | string | The `NODE_ENV` the process booted with. |
| `uptime_seconds` | number | How long the process has been up. |
| `timestamp` | string (iso date) | Server time when the check ran. |

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "coinzu-backend",
    "env": "development",
    "uptime_seconds": 3184,
    "timestamp": "2026-08-27T12:51:07.412Z"
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
curl http://localhost:4000/api/health
```

## Notes

- Public, so a load balancer can call it without a token.
- The database is not touched here. Use `GET /api/health/ready` when the check should depend on the database.
- A restart resets `uptime_seconds`, which makes it a simple way to spot a crash loop.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
