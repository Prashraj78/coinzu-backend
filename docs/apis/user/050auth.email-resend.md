# POST /api/auth/email/resend

Resends the "Confirm my email" link to the signed-in user. Called from the app's "Verify your email" waiting screen when the user taps **Resend email**. A no-op once the account is already verified.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/email/resend` |
| **Auth** | Bearer token required (the session issued at register/login). |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP, plus a per-user resend cooldown of 30 minutes (`VERIFY_RESEND_COOLDOWN_MINUTES`). |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |
| `Content-Type` | yes | `application/json` |

### Path / query params

None.

### Body

None. The target address is the signed-in user's own email, read from the token — a caller can never resend to an address they are not authenticated as.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `sent` | boolean | `true` when a fresh link was emailed. `false` when the account was already verified, so nothing was sent. |

```json
{
  "success": true,
  "data": {
    "sent": true
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | No Bearer token in the Authorization header. | `SignInRequiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token is malformed or has been revoked. | `SessionInvalidIcon` |
| 404 | `CZDUSER002` | We could not find that account. | The token's user no longer exists. | `AccountNotFoundIcon` |
| 429 | `CZDAUTH016` | You just requested a link. Please wait a while before asking for another. | A link was resent within the last 30 minutes. Response also carries `retry_after_seconds`. | `TooManyAttemptsIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Global IP rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "No Bearer token was provided in the Authorization header.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-09-27T17:47:35.503Z"
}
```

## Enum values

None.

## Example

```bash
curl -X POST http://localhost:4000/api/auth/email/resend \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

## Notes

- Returning `{ "sent": false }` rather than an error when already verified keeps the waiting-screen flow simple: the app polls `GET /api/users/me`, and a resend racing with a verify never surfaces a spurious error.
- Each successful call issues a new `verify_email` link token in Redis (TTL `LINK_TOKEN_TTL_MINUTES`, default 30). Older links for the same user keep working until their own TTL expires or one is consumed.
- A per-user cooldown (`VERIFY_RESEND_COOLDOWN_MINUTES`, default 30) is set in Redis on each successful resend. A second resend inside that window returns `429 CZDAUTH016` with `retry_after_seconds` giving the exact wait remaining. The initial link sent at register does **not** start the cooldown, so the first resend is always allowed. When Redis is disabled (dev), the cooldown is skipped.
- The email is only delivered when a SendGrid API key is configured; otherwise the message is logged. See `src/external/sendgrid-mail.external.ts`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
