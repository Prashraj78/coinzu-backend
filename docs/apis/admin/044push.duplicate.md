# POST /api/admin/push/:cz_push_campaign_id/duplicate

Copies an existing campaign — wording, emoji, buttons, audience and delivery settings — into a fresh draft. Nothing is sent.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/push/:cz_push_campaign_id/duplicate` |
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
| `cz_push_campaign_id` | string (uuid) | yes | The campaign to copy. Any status; a sent, failed or cancelled one copies fine. |

### Body

None.

## Response

### Success — `201`

Identical to `GET /api/admin/push/:cz_push_campaign_id`, describing the **new** campaign — note the new `cz_push_campaign_id`.

| Field | Type | Description |
|---|---|---|
| `campaign` | object | The new draft. Same shape as one row of `GET /api/admin/push`. |
| `audience_now` | object | What the copied filters reach right now. Same shape as `POST /api/admin/push/preview`. |

Copied across: `emoji`, `title`, `body`, `image_url`, `deep_link`, `category`, `cz_push_template_id`, `buttons`, `priority`, `ttl_seconds`, `collapse_key`, `android_channel_id`, `sound`, `badge`, `respect_quiet_hours`, `audience`, `audience_type`.

Reset on the copy: `status` becomes `draft`, `scheduled_at` is `null`, `created_by` is the admin making the copy, every counter (`targeted_*`, `sent_count`, `failed_count`, `delivered_count`, `opened_count`, `clicked_count`, `skipped_*`, `pruned_tokens`) is `0`, `dry_run` is `false`, `error` and `sent_at` are `null`.

```json
{
  "success": true,
  "data": {
    "campaign": {
      "cz_push_campaign_id": "8a1f30d2-6c4b-4a11-9d2e-70f5b3c9e881",
      "emoji": "🎉",
      "title": "Double coins all weekend",
      "body": "Every offer you finish before Sunday pays twice.",
      "category": "promotion",
      "audience_type": "country",
      "audience": { "countries": ["IN"] },
      "status": "draft",
      "scheduled_at": null,
      "respect_quiet_hours": true,
      "priority": "high",
      "ttl_seconds": 86400,
      "badge": 1,
      "buttons": [
        { "id": "open_offers", "label": "Browse offers", "deep_link": "coinzu://offers" }
      ],
      "targeted_users": 0,
      "targeted_devices": 0,
      "sent_count": 0,
      "failed_count": 0,
      "opened_count": 0,
      "clicked_count": 0,
      "dry_run": false,
      "error": null,
      "created_by": "lt_admin_9f2c",
      "sent_at": null,
      "created_at": "2026-08-29T09:52:14.002Z",
      "updated_at": "2026-08-29T09:52:14.002Z"
    },
    "audience_now": {
      "targeted_users": 3,
      "targeted_devices": 3,
      "matched_users": 5,
      "skipped_muted": 1,
      "skipped_quiet_hours": 1,
      "by_platform": [{ "platform": "android", "devices": 1 }],
      "category": "promotion",
      "quiet_hours": { "start": 22, "end": 8, "applied": true },
      "firebase_configured": true
    }
  }
}
```

> The `campaign` object above is abbreviated. It carries every field listed in `GET /api/admin/push`.

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
  "timestamp": "2026-08-29T09:52:14.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `campaign.status` | `draft`, `scheduled`, `sending`, `sent`, `partial`, `failed`, `cancelled` | This route always returns `draft`. |
| `campaign.category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | Copied from the source. |
| `campaign.audience_type` | `all`, `users`, `country`, `platform`, `segment` | Copied from the source. |
| `campaign.priority` | `high`, `normal` | Copied from the source. |

## Example

```bash
curl -X POST "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5/duplicate" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **The copy is a draft and is never sent by this call.** Send it with `POST /api/admin/push/:cz_push_campaign_id/send`, or schedule it by creating a new campaign with `scheduled_at`.
- The source campaign is untouched — its counters, status and history all stay as they were.
- The message cannot be edited on an existing campaign. Duplicating is how you reuse a good send with a small change: copy it, then create a new campaign with the edited wording. For a message you send often, save a template instead (`POST /api/admin/push-templates`).
- `cz_push_template_id` is carried over, so a copy stays attributed to the template it came from. Duplicating does **not** bump that template's `use_count` — only creating a campaign from it does.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
