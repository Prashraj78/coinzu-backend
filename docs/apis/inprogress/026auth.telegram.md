# POST /api/auth/telegram

Signs in with Telegram Login (web, OIDC `id_token`), creating the account on first use.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/auth/telegram` |
| **Auth** | Public. |
| **Role** | anyone |
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
| `id_token` | string | yes | Signed by Telegram. | The JWT `Telegram.Login.auth` returns. Verified against `https://oauth.telegram.org/.well-known/jwks.json` (RS256 / ES256), `iss` = `https://oauth.telegram.org`, `aud` = `TELEGRAM_LOGIN_CLIENT_ID`, not expired. |
| `nonce` | string | no | 8–128 characters. | The nonce the page passed to `Telegram.Login.auth`; must equal the token's `nonce` claim. |
| `referral_code` | string | no | 6–12 characters. | Attached only when the account is created. |
| `device` | object | no | `RegisterDeviceDto`. | Device signals; `platform_type: "web"` marks a web sign-up. |

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6Im9pZGMtMSJ9...",
  "nonce": "5f1c0e9a2b7d4c3e8a6b1f0d9c2e7a4b",
  "referral_code": "K7M2PQ4X",
  "device": { "device_id": "b7e2b6b0-1a2b-4c3d-9e4f-5a6b7c8d9e0f", "platform_type": "web" }
}
```

## Response

### Success — `200`

Same shape as `POST /api/auth/google`: `{ user, access_token, refresh_token }`.

```json
{
  "success": true,
  "data": {
    "user": { "cz_user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40", "email": "tg123456789@telegram.coinzu.invalid", "onboarding_completed": true },
    "access_token": "eyJhbGciOi…",
    "refresh_token": "eyJhbGciOi…"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | When | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH019` | We could not sign you in with Telegram. Please try again. | Bad signature, wrong `iss`/`aud`, expired token, or nonce mismatch. | `GoogleSignInFailedIcon` |
| 503 | `CZDAUTH020` | Telegram sign-in is not available right now. Please continue with Google. | `TELEGRAM_LOGIN_CLIENT_ID` is not set. | `GoogleSignInFailedIcon` |
| 401 | `CZDAUTH018` | This account was deleted. Please contact support to reopen it. | The account was soft-deleted. | `AccountInactiveIcon` |
| 409 | `CZDUSER011` | This device is already registered with another account. | New account on a device another account owns. | `PermissionDeniedIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field has the wrong type. | `ValidationFailedIcon` |

## Enum values

| Field | Values |
|---|---|
| `device.platform_type` | `ios`, `android`, `web` |

## Example

```bash
curl -X POST $BASE/auth/telegram \
  -H 'Content-Type: application/json' \
  -d '{ "id_token": "eyJhbGciOiJSUzI1NiIs...", "nonce": "5f1c0e9a2b7d4c3e" }'
```

## Notes

- Accounts are matched on `telegram_id`. Telegram shares no email, so a new account's email is `tg<id>@telegram.coinzu.invalid`. The `.invalid` domain is reserved and never routable; the mail sender skips it.
- A new account gets `contact = { platform: "telegram", value: "@username" }` (or the id when there is no username) and has onboarding completed, so the web contact sheet never shows. Web sign-ups get no welcome bonus; the `onboarding_completed` referral reward still fires.
- The bot's Client ID comes from the @BotFather mini app (bot > Login Widget), where the web origin must be listed under Allowed URLs. The id_token's `id` (or `sub`) is the Telegram user id; `name`, `preferred_username` and `picture` fill the new account.
