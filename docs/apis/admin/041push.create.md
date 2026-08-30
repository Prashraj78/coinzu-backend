# POST /api/admin/push

Creates a push campaign and either sends it now, queues it for a time, or saves it as a draft.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/push` |
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

Every audience field from `POST /api/admin/push/preview` at the top level, plus the message and delivery fields below.

**Message**

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `emoji` | string | no | Max 16 characters. | Shown before the title on the device. Stored separately so it stays editable. |
| `title` | string | yes | 1–120 characters. | Notification title. |
| `body` | string | yes | 1–500 characters. | Notification body. |
| `image_url` | string | no | Max 500 characters. | Large image shown with the notification. |
| `deep_link` | string | no | Max 255 characters. | Where the app navigates on tap. Delivered in the FCM `data` payload as `deep_link`. |
| `buttons` | object[] | no | Up to 3. | Action buttons. Each needs `id` (max 40) and `label` (max 30); `deep_link` (max 255) is optional. |
| `cz_push_template_id` | string (uuid) | no | | The template this was composed from. Bumps that template's `use_count`. |

**Audience** — see `POST /api/admin/push/preview` for the full table

| Field | Type | Required | Description |
|---|---|---|---|
| `cz_user_ids` | string[] | no | Target exactly these users. Up to 1000. |
| `countries` | string[] | no | ISO-3166 alpha-2 codes. Up to 250. |
| `platforms` | string[] | no | Device platforms. |
| `statuses` | string[] | no | Account statuses. |
| `kyc_statuses` | string[] | no | KYC statuses. |
| `tiers` | string[] | no | Loyalty tiers. |
| `min_coins` | integer | no | Lifetime coins earned, at least this many. |
| `category` | string | no | Default `announcement`. Drives consent and quiet hours. |
| `respect_quiet_hours` | boolean | no | Default `true`. Ignored for `transaction` and `system`. |

**Delivery**

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `send_now` | boolean | no | Default `true`. | `false` saves a draft. Ignored when `scheduled_at` is in the future. |
| `scheduled_at` | string (date-time) | no | Must be in the future. | UTC send time. Takes precedence over `send_now`. |
| `priority` | string | no | Default `high`. | `high` wakes a dozing device; `normal` waits for the next window. |
| `ttl_seconds` | integer | no | 0–2419200. | How long FCM keeps retrying an offline device. Omit for FCM's default of 4 weeks. |
| `collapse_key` | string | no | Max 64 characters. | A newer message with the same key replaces an undelivered older one. |
| `android_channel_id` | string | no | Max 64 characters. | Must already exist in the app, or Android uses the default channel. |
| `sound` | string | no | Max 64 characters. | Defaults to `default`. |
| `badge` | integer | no | 0–9999. | iOS app-icon badge number. |

```json
{
  "emoji": "🎉",
  "title": "Double coins all weekend",
  "body": "Every offer you finish before Sunday pays twice.",
  "deep_link": "coinzu://offers",
  "category": "promotion",
  "countries": ["IN"],
  "buttons": [
    { "id": "open_offers", "label": "Browse offers", "deep_link": "coinzu://offers" }
  ],
  "priority": "high",
  "ttl_seconds": 86400,
  "badge": 1,
  "scheduled_at": "2026-09-01T09:00:00.000Z"
}
```

## Response

### Success — `201`

Identical to `GET /api/admin/push/:cz_push_campaign_id`.

| Field | Type | Description |
|---|---|---|
| `campaign` | object | The stored campaign. Same shape as one row of `GET /api/admin/push`. `status` is `sent`/`partial`/`failed` when it went out now, `scheduled` when queued, `draft` when saved. |
| `audience_now` | object | What the same filters reach right now. Same shape as `POST /api/admin/push/preview`. |

```json
{
  "success": true,
  "data": {
    "campaign": {
      "cz_push_campaign_id": "60dc116b-1ae4-4e25-b87d-1f217c2e2da5",
      "emoji": "🎉",
      "title": "Double coins all weekend",
      "body": "Every offer you finish before Sunday pays twice.",
      "image_url": null,
      "deep_link": "coinzu://offers",
      "category": "promotion",
      "cz_push_template_id": null,
      "audience_type": "country",
      "audience": { "countries": ["IN"] },
      "status": "scheduled",
      "scheduled_at": "2026-09-01T09:00:00.000Z",
      "respect_quiet_hours": true,
      "priority": "high",
      "ttl_seconds": 86400,
      "collapse_key": null,
      "android_channel_id": null,
      "sound": null,
      "badge": 1,
      "buttons": [
        { "id": "open_offers", "label": "Browse offers", "deep_link": "coinzu://offers" }
      ],
      "targeted_users": 0,
      "targeted_devices": 0,
      "sent_count": 0,
      "failed_count": 0,
      "delivered_count": 0,
      "opened_count": 0,
      "clicked_count": 0,
      "skipped_muted": 0,
      "skipped_quiet_hours": 0,
      "pruned_tokens": 0,
      "dry_run": false,
      "error": null,
      "created_by": "lt_admin_9f2c",
      "sent_at": null,
      "created_at": "2026-08-29T09:43:28.166Z",
      "updated_at": "2026-08-29T09:43:28.166Z"
    },
    "audience_now": {
      "targeted_users": 3,
      "targeted_devices": 3,
      "matched_users": 5,
      "skipped_muted": 1,
      "skipped_quiet_hours": 1,
      "by_platform": [
        { "platform": "android", "devices": 1 },
        { "platform": "ios", "devices": 1 },
        { "platform": "web", "devices": 1 }
      ],
      "category": "promotion",
      "quiet_hours": { "start": 22, "end": 8, "applied": true },
      "firebase_configured": true
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `title` or `body` is missing or too long, more than 3 buttons, an unknown category or priority, a malformed `scheduled_at`, or an unknown field. | `ValidationFailedIcon` |
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
  "cz_error_description": "title should not be empty",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-29T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | `transaction` and `system` cannot be muted and ignore `respect_quiet_hours`. |
| `priority` | `high`, `normal` | |
| `platforms[]` | `ios`, `android`, `web` | Same values as the `platform` enum in `docs/ENUMS.md`. |
| `statuses[]` | `active`, `suspended`, `banned`, `deleted` | Only `active` accounts are ever pushed to, whatever this says. |
| `kyc_statuses[]` | `none`, `pending`, `verified`, `rejected`, `manual_review` | |
| `tiers[]` | `silver`, `gold`, `platinum`, `diamond` | |
| `campaign.status` | `draft`, `scheduled`, `sending`, `sent`, `partial`, `failed`, `cancelled` | This route returns `draft`, `scheduled`, `sent`, `partial` or `failed`. |
| `campaign.audience_type` | `all`, `users`, `country`, `platform`, `segment` | Derived from the filters, never sent by the admin. |

## Example

```bash
# Send now, to one country
curl -X POST "$BASE/admin/push" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "emoji": "🎉", "title": "Double coins all weekend",
        "body": "Every offer you finish before Sunday pays twice.",
        "deep_link": "coinzu://offers", "category": "promotion", "countries": ["IN"] }'

# Queue it for Friday morning
curl -X POST "$BASE/admin/push" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "title": "Weekend bonus", "body": "Double coins start now.",
        "category": "promotion", "scheduled_at": "2026-09-01T09:00:00.000Z" }'

# A payout notice to one person — nobody can mute it, the hour does not matter
curl -X POST "$BASE/admin/push" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "emoji": "💰", "title": "Your withdrawal is on its way",
        "body": "We have sent your payout. It should land within 24 hours.",
        "category": "transaction",
        "cz_user_ids": ["ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2"] }'
```

## Notes

- **Not idempotent.** Every call creates a new campaign, and with `send_now` unset it also sends. Preview first with `POST /api/admin/push/preview`, and try the wording with `POST /api/admin/push/test`.
- **`scheduled_at` wins over `send_now`.** A future `scheduled_at` always parks the campaign as `scheduled`; a past one is ignored and normal `send_now` rules apply. A dispatcher polls every minute, so delivery lands within a minute of the stated time.
- Sending is synchronous: the response comes back after FCM has answered for every batch, so `sent_count` and `failed_count` are final. Tokens go out in batches of 500.
- **Consent is enforced on the server, not the client.** A user who muted the category is dropped no matter what the composer sent, and the count lands in `skipped_muted`.
- Every targeted user also gets an in-app `notifications` row of type `push`, titled with the emoji already joined on, so the message survives a dismissed banner and shows up in `GET /api/notifications`. This happens on a dry run too, and it does **not** happen for `POST /api/admin/push/test`.
- Tokens FCM reports as dead are cleared from `user_devices` in the same call and counted in `pruned_tokens`.
- With no Firebase credentials the send is a **dry run**: the audience is resolved, the counters and in-app copies are written, `dry_run` is `true`, and nothing leaves the server. Add the credentials and use `POST /api/admin/push/:cz_push_campaign_id/send` to deliver it for real — no code change.
- `emoji` is stored on its own and joined onto the title at send time, so it can be changed later without re-parsing the title.
- `buttons` reach the device inside the FCM `data` payload as a JSON string under the key `buttons`. The app renders them; FCM does not.
- `created_by` is taken from the admin token, never from the body.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
