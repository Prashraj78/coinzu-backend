# POST /api/admin/push/:cz_push_campaign_id/send

Runs an existing campaign — a draft for the first time, or one that has already been sent, again. The audience is re-resolved from its stored filters, so the recipient list is always current.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/push/:cz_push_campaign_id/send` |
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
| `cz_push_campaign_id` | string (uuid) | yes | The campaign to run. |

### Body

None.

## Response

### Success — `201`

Identical to `GET /api/admin/push/:cz_push_campaign_id`.

| Field | Type | Description |
|---|---|---|
| `campaign` | object | The campaign with its counters rewritten by this run. Same shape as one row of `GET /api/admin/push`. |
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
curl -X POST "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5/send" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Not idempotent.** Calling it twice delivers the notification twice. The counters are overwritten by the latest run, they do not accumulate.
- The audience is re-resolved from the stored filters, never replayed from the old token list: anyone who installed since the last run is included, anyone who uninstalled is skipped.
- Every targeted user gets a fresh in-app `notifications` row, so a resend appears again in the app's notification feed.
- A transport failure sets `status` to `failed` and puts the error text in `campaign.error` rather than throwing a 500 — the campaign row is always the record of what happened.
- With no Firebase credentials this is a dry run; see `POST /api/admin/push`.
- The campaign's message cannot be edited. To change the wording, create a new campaign.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
