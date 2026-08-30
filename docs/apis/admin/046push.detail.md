# GET /api/admin/push/:cz_push_campaign_id

One campaign in full — the message, the stored audience, the delivery counters from when it ran, and what the same filters reach today. The campaign detail page.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/push/:cz_push_campaign_id` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `cz_push_campaign_id` | string (uuid) | yes | The campaign to open. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `campaign.cz_push_campaign_id` | string (uuid) | Primary key. |
| `campaign.emoji` | string \| null | Shown before the title on the device. |
| `campaign.title` | string | Notification title. |
| `campaign.body` | string | Notification body. |
| `campaign.image_url` | string \| null | Large image attached to the notification. |
| `campaign.deep_link` | string \| null | Where the app navigates on tap, delivered as the `deep_link` key in the FCM `data` payload. |
| `campaign.category` | string | What the message is about. Drives consent and quiet hours. See [Enum values](#enum-values). |
| `campaign.cz_push_template_id` | string (uuid) \| null | The template it was composed from, if any. |
| `campaign.audience_type` | string | Shape of the targeting. See [Enum values](#enum-values). |
| `campaign.audience` | object | The filters exactly as stored. Same fields as the body of `POST /api/admin/push/preview`. |
| `campaign.status` | string | Send state. See [Enum values](#enum-values). |
| `campaign.scheduled_at` | string (date-time) \| null | When the dispatcher should run it. |
| `campaign.respect_quiet_hours` | boolean | Whether people inside their quiet hours were held back. |
| `campaign.priority` | string | `high` wakes a dozing device; `normal` waits. |
| `campaign.ttl_seconds` | integer \| null | How long FCM keeps retrying an offline device. |
| `campaign.collapse_key` | string \| null | A newer message with the same key replaces an undelivered older one. |
| `campaign.android_channel_id` | string \| null | Android notification channel. |
| `campaign.sound` | string \| null | Sound file name. `null` means `default`. |
| `campaign.badge` | integer \| null | iOS app-icon badge number. |
| `campaign.buttons[]` | array | Action buttons, each `{ id, label, deep_link }`. |
| `campaign.targeted_users` | integer | Distinct users the audience resolved to when it last ran. |
| `campaign.targeted_devices` | integer | Distinct live push tokens it resolved to. |
| `campaign.sent_count` | integer | Tokens FCM accepted. `0` on a dry run. |
| `campaign.failed_count` | integer | Tokens FCM rejected or could not reach. |
| `campaign.delivered_count` | integer | Arrivals the app itself confirmed, via `POST /api/notifications/push-events`. |
| `campaign.opened_count` | integer | Distinct users who opened it. |
| `campaign.clicked_count` | integer | Distinct users who tapped it or one of its buttons. |
| `campaign.skipped_muted` | integer | Users left out because they muted this category. |
| `campaign.skipped_quiet_hours` | integer | Users left out because it was the middle of their night. |
| `campaign.pruned_tokens` | integer | Dead tokens cleared from `user_devices` by that run. |
| `campaign.dry_run` | boolean | `true` when Firebase was not configured at send time. |
| `campaign.error` | string \| null | Transport error text when the whole send failed. |
| `campaign.created_by` | string \| null | Rewardtym admin id that created it. |
| `campaign.sent_at` | string (date-time) \| null | When it last ran. `null` for a draft or a pending schedule. |
| `campaign.created_at` | string (date-time) | When it was created. |
| `campaign.updated_at` | string (date-time) | Last write. |
| `audience_now.targeted_users` | integer | Distinct users the same filters reach **right now**, after consent and quiet hours. |
| `audience_now.targeted_devices` | integer | Live push tokens they reach right now. |
| `audience_now.matched_users` | integer | Users matching the filters before consent and quiet hours. |
| `audience_now.skipped_muted` | integer | Of those, how many mute this category today. |
| `audience_now.skipped_quiet_hours` | integer | Of those, how many are inside their quiet hours right now. |
| `audience_now.by_platform[].platform` | string | Device platform. See [Enum values](#enum-values). |
| `audience_now.by_platform[].devices` | integer | Live tokens on that platform. |
| `audience_now.category` | string | The category the count was computed for. |
| `audience_now.quiet_hours.start` | integer | Hour of the user's own day when quiet hours begin, 0–23. |
| `audience_now.quiet_hours.end` | integer | Hour when they lift, 0–23. |
| `audience_now.quiet_hours.applied` | boolean | `false` when the category always delivers or the campaign opted out. |
| `audience_now.firebase_configured` | boolean | `false` when Firebase credentials are missing, so a resend would be a dry run. |

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
      "status": "sent",
      "scheduled_at": null,
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
      "targeted_users": 3,
      "targeted_devices": 3,
      "sent_count": 3,
      "failed_count": 0,
      "delivered_count": 3,
      "opened_count": 1,
      "clicked_count": 1,
      "skipped_muted": 1,
      "skipped_quiet_hours": 1,
      "pruned_tokens": 0,
      "dry_run": false,
      "error": null,
      "created_by": "lt_admin_9f2c",
      "sent_at": "2026-08-29T09:43:29.597Z",
      "created_at": "2026-08-29T09:43:28.166Z",
      "updated_at": "2026-08-29T09:43:29.826Z"
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
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `cz_push_campaign_id` is not a uuid. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDNOTIF001` | We could not find that notification. | No campaign exists for that id. | `NotificationNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDNOTIF001",
  "cz_error_message": "We could not find that notification.",
  "cz_error_description": "No notification exists for the given id and user.",
  "cz_error_icon": "NotificationNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `campaign.status` | `draft`, `scheduled`, `sending`, `sent`, `partial`, `failed`, `cancelled` | `partial` means some tokens were accepted and some were not; `failed` means none were. |
| `campaign.category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | `transaction` and `system` cannot be muted and ignore quiet hours. |
| `campaign.audience_type` | `all`, `users`, `country`, `platform`, `segment` | Derived from the filters. |
| `campaign.priority` | `high`, `normal` | |
| `campaign.audience.platforms[]` / `audience_now.by_platform[].platform` | `ios`, `android`, `web` | Same values as the `platform` enum in `docs/ENUMS.md`. |
| `campaign.audience.statuses[]` | `active`, `suspended`, `banned`, `deleted` | |
| `campaign.audience.kyc_statuses[]` | `none`, `pending`, `verified`, `rejected`, `manual_review` | |
| `campaign.audience.tiers[]` | `silver`, `gold`, `platinum`, `diamond` | |

## Example

```bash
curl "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- `campaign.*` counters are a snapshot from the last run; `audience_now` is computed fresh on every request. The two differing is normal and is exactly what tells an admin whether a resend is worth it.
- `campaign.targeted_devices` can exceed `targeted_users` — one person with a phone and a tablet is two tokens.
- `sent_count` of `0` with `dry_run: true` is not a failure. It means Firebase was not connected, so nothing left the server.
- Read-only. Resending is `POST /api/admin/push/:cz_push_campaign_id/send`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
