# POST /api/admin/push/test

A real send of a draft message to a handful of named accounts, so an admin can see it on their own phone before it goes to everyone. Nothing is recorded as a campaign and no in-app copy is written.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/push/test` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None.

### Body

The message fields from `POST /api/admin/push`, plus the accounts to try it on. There are **no audience filters** — a test goes exactly to the users you name.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `cz_user_ids` | string[] | yes | 1–10 uuids. | Who to send the test to. |
| `emoji` | string | no | Max 16 characters. | Shown before the title. |
| `title` | string | yes | 1–120 characters. | Notification title. |
| `body` | string | yes | 1–500 characters. | Notification body. |
| `image_url` | string | no | Max 500 characters. | Large image. |
| `deep_link` | string | no | Max 255 characters. | Where the app navigates on tap. |
| `buttons` | object[] | no | Up to 3. | Action buttons: `id`, `label`, optional `deep_link`. |
| `priority` | string | no | Default `high`. | See [Enum values](#enum-values). |
| `ttl_seconds` | integer | no | 0–2419200. | How long FCM keeps retrying. |
| `collapse_key` | string | no | Max 64 characters. | Replaces an undelivered message with the same key. |
| `android_channel_id` | string | no | Max 64 characters. | Android notification channel. |
| `sound` | string | no | Max 64 characters. | Defaults to `default`. |
| `badge` | integer | no | 0–9999. | iOS app-icon badge number. |

```json
{
  "cz_user_ids": ["ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2"],
  "emoji": "🎉",
  "title": "Double coins all weekend",
  "body": "Every offer you finish before Sunday pays twice.",
  "deep_link": "coinzu://offers"
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `targeted_users` | integer | How many of the named users had at least one live device. |
| `targeted_devices` | integer | Distinct push tokens the test went to. |
| `sent_count` | integer | Tokens FCM accepted. `0` on a dry run. |
| `failed_count` | integer | Tokens FCM rejected or could not reach. |
| `dry_run` | boolean | `true` when Firebase is not configured, so nothing was delivered. |
| `users_without_a_device[]` | string[] | The `cz_user_ids` that have no registered device with a live push token — the usual reason a test seems to vanish. |

```json
{
  "success": true,
  "data": {
    "targeted_users": 1,
    "targeted_devices": 1,
    "sent_count": 1,
    "failed_count": 0,
    "dry_run": false,
    "users_without_a_device": []
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `cz_user_ids` is empty or over 10, a uuid is malformed, `title`/`body` is missing or too long, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "cz_user_ids must contain no more than 10 elements",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-29T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `priority` | `high`, `normal` | |

## Example

```bash
curl -X POST "$BASE/admin/push/test" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "cz_user_ids": ["ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2"],
    "emoji": "🎉",
    "title": "Double coins all weekend",
    "body": "Every offer you finish before Sunday pays twice.",
    "deep_link": "coinzu://offers"
  }'
```

## Notes

- **A test is a real push.** The named users get a genuine banner on their phone, so only use accounts you control.
- **Nothing is recorded.** No campaign row, no in-app `notifications` copy, no open or click tracking. It will not appear in `GET /api/admin/push` and will not move any lifetime total.
- **Consent and quiet hours are not applied.** A test has no category and goes to the named users regardless of what they muted or what hour it is locally — the point is to see the message, not to model the send. Preview the real audience with `POST /api/admin/push/preview` instead.
- A banned or deleted account is still excluded, and a device must still have a live `push_token`.
- `users_without_a_device` is the answer to "I sent a test and nothing arrived": that account has never registered a device through `POST /api/users/me/device`, or its token was pruned as dead.
- Dead tokens are **not** pruned by a test, so a test cannot quietly change the real audience.
- With no Firebase credentials this returns `dry_run: true` and delivers nothing.
