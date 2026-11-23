# GET /api/users/me/telegram/status

Whether the signed-in user must, and does, belong to the Coinzu Telegram channel. The web app shows its Telegram gate until `joined` is true, and polls this while the user joins.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/users/me/telegram/status` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |
| `X-Device-Type` | no | `web`, `ios` or `android`. Only `web` can be `required`. Falls back to the User-Agent. |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `required` | boolean | `true` on the web when `TELEGRAM_CHANNEL_ID` is set. The app is never gated. |
| `linked` | boolean | A Telegram account is known: the one the user signed in with, or one linked through `POST /api/users/me/telegram/link`. |
| `joined` | boolean | That Telegram account is in the channel. |
| `channel_url` | string | Link to open the channel (`TELEGRAM_CHANNEL_URL`). |

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
| 403 | `CZDAUTH021` | Your account has been blocked for activity that breaks our rules. Contact support if you think this is a mistake. | The account is suspended, banned or deleted. | `AccountInactiveIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH003",
  "cz_error_message": "Your session has expired. Please sign in again.",
  "cz_error_description": "Access token has expired.",
  "cz_error_icon": "SessionExpiredIcon",
  "statusCode": 401,
  "timestamp": "2026-11-23T10:04:12.511Z"
}
```

## Enum values

None.

## Example

```bash
curl http://localhost:4000/api/users/me/telegram/status \
  -H 'X-Device-Type: web' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- A confirmed membership is trusted for 6 hours, then checked with Telegram again; a user who left is gated again.
- When the check with Telegram fails (outage), `joined` is `true`, so an outage never locks users out.
- Several Coinzu accounts may share one Telegram account.
- The bot in `TELEGRAM_BOT_TOKEN` must be an admin of the channel, or every check fails open.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
