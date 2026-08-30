# POST /api/auth/password/reset

Consumes a password-reset link token and sets the new password. This is what the browser page at `GET /api/auth/password/reset?token=...` submits to.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/password/reset` |
| **Auth** | Public — no token required. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `token` | string | yes | 64 lowercase hex characters. | The `token` query param from the reset-password link. |
| `password` | string | yes | Minimum 8 characters. | The new password. |

```json
{
  "token": "bb4587ed1a5dc5d1e42453d14f05913d6b96eb25dcfa14ba6589f5421491b2a",
  "password": "N3wS3curePassw0rd"
}
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `reset` | boolean | Always `true`. |

```json
{
  "success": true,
  "data": { "reset": true }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDAUTH015` | This link has expired or was already used. Please request a new one. | No Redis key exists for this token: it expired, was already consumed, or the format was invalid. | `OtpExpiredIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH015",
  "cz_error_message": "This link has expired or was already used. Please request a new one.",
  "cz_error_description": "The Redis key for this email/reset link token was evicted by its TTL, was already consumed, or never existed.",
  "cz_error_icon": "OtpExpiredIcon",
  "statusCode": 400,
  "timestamp": "2026-08-28T14:47:50.566Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl -X POST http://localhost:4000/api/auth/password/reset \
  -H 'Content-Type: application/json' \
  -d '{ "token": "bb4587ed1a5dc5d1e42453d14f05913d6b96eb25dcfa14ba6589f5421491b2a", "password": "N3wS3curePassw0rd" }'
```

## Notes

- The token is consumed on first successful use and cannot be replayed — a second call with the same token returns `CZDAUTH015`.
- Does not sign the user in — no tokens are returned. The reset-password page prompts the user to open the app and log in with the new password, matching how the change would look from a session-security standpoint (a password change should not silently re-authenticate the caller).
- Password confirmation (matching the two fields) is a client-side check on the page only; this endpoint accepts a single `password` value.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
