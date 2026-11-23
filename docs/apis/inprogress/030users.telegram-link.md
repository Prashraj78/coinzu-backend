# POST /api/users/me/telegram/link

Connects a Telegram account to the signed-in user (Google or email sign-ups) so the channel check has someone to look up. Returns the same status as `GET /api/users/me/telegram/status`.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/users/me/telegram/link` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |
| `Content-Type` | yes | `application/json` |
| `X-Device-Type` | no | `web`. Decides `required` in the response. |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `id_token` | string | yes | — | The OIDC `id_token` from `Telegram.Login.auth`. |
| `nonce` | string | no | 8 to 128 characters | The nonce passed to `Telegram.Login.auth`; must match the token. |

```json
{ "id_token": "eyJhbGciOiJSUzI1NiIs...", "nonce": "b7c2e19f04aa4d1c" }
```

## Response

### Success — `200`

Same body as `GET /api/users/me/telegram/status`.

```json
{
  "success": true,
  "data": {
    "required": true,
    "linked": true,
    "joined": false,
    "channel_url": "https://t.me/coinzuonline"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `id_token` is missing or `nonce` is out of range. | `ValidationFailedIcon` |
| 401 | `CZDAUTH019` | We could not sign you in with Telegram. Please try again. | The `id_token` failed verification: bad signature, wrong iss/aud, expired, or nonce mismatch. | `GoogleSignInFailedIcon` |
| 503 | `CZDAUTH020` | Telegram sign-in is not available right now. Please continue with Google. | `TELEGRAM_LOGIN_CLIENT_ID` is not set on the server. | `GoogleSignInFailedIcon` |
| 403 | `CZDAUTH021` | Your account has been blocked for activity that breaks our rules. Contact support if you think this is a mistake. | The account is suspended, banned or deleted. | `AccountInactiveIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH019",
  "cz_error_message": "We could not sign you in with Telegram. Please try again.",
  "cz_error_description": "Telegram id_token failed verification.",
  "cz_error_icon": "GoogleSignInFailedIcon",
  "statusCode": 401,
  "timestamp": "2026-11-23T10:04:12.511Z"
}
```

## Enum values

None.

## Example

```bash
curl -X POST http://localhost:4000/api/users/me/telegram/link \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Type: web' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "id_token": "<telegram id_token>", "nonce": "<nonce>" }'
```

## Notes

- Not unique: the same Telegram account can be linked to several Coinzu accounts.
- Linking again replaces the previous Telegram account and forces a fresh channel check.
- When the user has no contact yet, the Telegram handle (or id) is saved as their contact and onboarding completes, as with `POST /api/users/me/onboarding/contacts`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
