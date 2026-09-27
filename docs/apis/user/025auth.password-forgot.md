# POST /api/auth/password/forgot

Emails a password-reset link to the account with this email. If no account uses the email, it returns `404 CZDAUTH017` so the app can prompt the user to create an account. (This deliberately trades away email-enumeration protection for a guided sign-up flow — a product decision for this app.)

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/password/forgot` |
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
| `email` | string | yes | Valid email address. | The account email to send the reset link to. |

```json
{
  "email": "user@coinzu.app"
}
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `sent` | boolean | Always `true`. Does not indicate whether an email was actually sent. |

```json
{
  "success": true,
  "data": { "sent": true }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 404 | `CZDAUTH017` | We couldn't find an account with that email. Please check it, or create a new account. | No user row exists for the submitted email. | `AccountNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "email must be an email",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-28T14:46:59.937Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl -X POST http://localhost:4000/api/auth/password/forgot \
  -H 'Content-Type: application/json' \
  -d '{ "email": "user@coinzu.app" }'
```

## Notes

- If no account matches the email, the call returns `404 CZDAUTH017` instead of sending anything. The app uses this to surface a "Create an account" prompt. Note this makes the endpoint an email-enumeration oracle — an accepted trade-off for the guided sign-up flow; the global throttle + FFraud IP layer limit abuse.
- On a match, issues a single-use token via the same Redis-backed `LinkTokenService` used for email verification (`link:reset_password:<token>`, TTL `LINK_TOKEN_TTL_MINUTES`, default 30) and emails a "Reset password" button linking to `GET /api/auth/password/reset?token=...`.
- Calling this again for the same email issues a brand-new token; it does not invalidate a still-valid earlier one (each token lives under its own random key).
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
