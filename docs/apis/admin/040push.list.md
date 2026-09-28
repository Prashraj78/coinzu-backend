# GET /api/admin/push

Every push campaign, newest first, filterable, plus lifetime delivery and engagement totals and whether Firebase is connected. The Push Notifications tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/push` |
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
| `page` | integer | no | 1-based page number. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `search` | string | no | Case-insensitive match against the campaign title or body. Max 120 characters. |
| `status` | string | no | One send state. See [Enum values](#enum-values). |
| `category` | string | no | One message category. See [Enum values](#enum-values). |
| `audience_type` | string | no | One audience shape. See [Enum values](#enum-values). |
| `date_from` | string (date) | no | Created on/after this UTC date (inclusive), `yyyy-MM-dd`. |
| `date_end` | string (date) | no | Created on/before this UTC date (inclusive), `yyyy-MM-dd`. |

### Body

None.

## Response

### Success — `200`

`data[]` carries the full campaign object; the table below names its fields without the `data[].` prefix.

| Field | Type | Description |
|---|---|---|
| `cz_push_campaign_id` | string (uuid) | Primary key of the campaign. |
| `emoji` | string \| null | Shown before the title on the device. Stored separately so it stays editable. |
| `title` | string | Notification title. |
| `body` | string | Notification body. |
| `image_url` | string \| null | Large image attached to the notification. |
| `deep_link` | string \| null | Where the app navigates on tap. Delivered in the FCM `data` payload as `deep_link`. |
| `category` | string | What the message is about. Drives consent and quiet hours. See [Enum values](#enum-values). |
| `cz_push_template_id` | string (uuid) \| null | The template it was composed from, if any. |
| `audience_type` | string | Shape of the targeting, derived from the filters. See [Enum values](#enum-values). |
| `audience` | object | The filters exactly as stored. Keys the admin did not set are absent. Same fields as the body of `POST /api/admin/push/preview`. |
| `status` | string | Send state. See [Enum values](#enum-values). |
| `scheduled_at` | string (date-time) \| null | When the dispatcher should run it. `null` when it was sent by hand. |
| `respect_quiet_hours` | boolean | Whether people inside their quiet hours were held back. |
| `priority` | string | `high` wakes a dozing device; `normal` waits for the next window. |
| `ttl_seconds` | integer \| null | How long FCM keeps retrying an offline device. `null` means FCM's default of 4 weeks. |
| `collapse_key` | string \| null | A newer message with the same key replaces an undelivered older one. |
| `android_channel_id` | string \| null | Android notification channel. Must already exist in the app. |
| `sound` | string \| null | Sound file name. `null` means `default`. |
| `badge` | integer \| null | iOS app-icon badge number. |
| `buttons[]` | array | Action buttons, each `{ id, label, deep_link }`. Up to 3. |
| `targeted_users` | integer | Distinct users the audience resolved to at send time. |
| `targeted_devices` | integer | Distinct live push tokens it resolved to. |
| `sent_count` | integer | Tokens FCM accepted. `0` on a dry run. |
| `failed_count` | integer | Tokens FCM rejected or could not reach. |
| `delivered_count` | integer | Arrivals the app itself confirmed, via `POST /api/notifications/push-events`. |
| `opened_count` | integer | Distinct users who opened it. |
| `clicked_count` | integer | Distinct users who tapped it or one of its buttons. |
| `skipped_muted` | integer | Users left out because they muted this category. |
| `skipped_quiet_hours` | integer | Users left out because it was the middle of their night. |
| `pruned_tokens` | integer | Dead tokens cleared from `user_devices` by this run. |
| `dry_run` | boolean | `true` when Firebase was not configured, so nothing was delivered. |
| `error` | string \| null | Transport error text when the whole send failed. |
| `created_by` | string \| null | Rewardtym admin id that created the campaign. |
| `sent_at` | string (date-time) \| null | When the send ran. `null` for a draft or a pending schedule. |
| `created_at` | string (date-time) | When the campaign was created. |
| `updated_at` | string (date-time) | Last write. |
| `total` | integer | Campaigns matching the filters, all pages. |
| `summary.campaigns` | integer | Every campaign ever, ignoring the filters. |
| `summary.scheduled` | integer | Campaigns currently waiting on their send time. |
| `summary.total_sent` | integer | Lifetime accepted deliveries across all campaigns. |
| `summary.total_failed` | integer | Lifetime failed deliveries. |
| `summary.total_opened` | integer | Lifetime opens. |
| `summary.total_clicked` | integer | Lifetime tap-throughs. |
| `summary.open_rate` | number | `total_opened / total_sent` as a percentage, one decimal. `0` when nothing has been sent. |
| `summary.firebase_configured` | boolean | `false` when the Firebase credentials are missing, meaning every send is a dry run. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_push_campaign_id": "60dc116b-1ae4-4e25-b87d-1f217c2e2da5",
        "emoji": "🎉",
        "title": "Double coins all weekend",
        "body": "Every offer you finish before Sunday pays twice.",
        "image_url": null,
        "deep_link": "coinzu://offers",
        "category": "promotion",
        "cz_push_template_id": "4675facb-3f13-4f59-b51a-d7293f579460",
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
      }
    ],
    "total": 1,
    "summary": {
      "campaigns": 4,
      "scheduled": 1,
      "total_sent": 3,
      "total_failed": 0,
      "total_opened": 1,
      "total_clicked": 1,
      "open_rate": 33.3,
      "firebase_configured": true
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `status`, `category` or `audience_type` is not one of the allowed values, or a date is not `yyyy-MM-dd`. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "Authorization header is missing.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-29T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `draft`, `scheduled`, `sending`, `sent`, `partial`, `failed`, `cancelled` | `partial` means some tokens were accepted and some were not. `scheduled` is waiting on its send time; `cancelled` was stopped before it ran. |
| `category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | `transaction` and `system` cannot be muted by a user and ignore quiet hours. |
| `audience_type` | `all`, `users`, `country`, `platform`, `segment` | Derived, never sent by the admin: no filters is `all`, exactly one filter names itself, two or more is `segment`. |
| `priority` | `high`, `normal` | |
| `audience.platforms[]` | `ios`, `android`, `web` | Same values as the `platform` enum in `docs/ENUMS.md`. |
| `audience.statuses[]` | `active`, `suspended`, `banned`, `deleted` | Only `active` accounts are ever pushed to, whatever this says. |
| `audience.kyc_statuses[]` | `none`, `pending`, `verified`, `rejected`, `manual_review` | |
| `audience.tiers[]` | `silver`, `gold`, `platinum`, `diamond` | |

## Example

```bash
curl "$BASE/admin/push?status=sent&category=promotion&date_from=2026-08-01&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Newest first, by `created_at`. Every filter combines as `AND`; the dates filter on `created_at`, both inclusive, in UTC.
- `summary` is computed over the **whole** table, not the filtered page, so the header tiles stay stable while filtering.
- `sent_count` is FCM's acceptance; `delivered_count` is the app's own confirmation. The second is always lower — it only counts installs that report back — so use `sent_count` as the denominator for an open rate.
- `opened_count` and `clicked_count` are **distinct users**, not events: the same person reopening a notification is counted once.
- `targeted_users` and `targeted_devices` are a snapshot from send time. Use `GET /api/admin/push/:cz_push_campaign_id` to see what the same filters reach today.
- `summary.firebase_configured` reads the backend env, never the database. It is the single signal the tab uses to warn that sends are dry runs.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu`. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
