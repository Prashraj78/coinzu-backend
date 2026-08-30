# POST /api/admin/push/:cz_push_campaign_id/cancel

Stops a campaign that has not gone out yet — a draft, or one queued for a future time. Anything already sent cannot be recalled.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/push/:cz_push_campaign_id/cancel` |
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
| `cz_push_campaign_id` | string (uuid) | yes | The campaign to stop. |

### Body

None.

## Response

### Success — `201`

Identical to `GET /api/admin/push/:cz_push_campaign_id`, with `campaign.status` now `cancelled` and `campaign.scheduled_at` cleared.

| Field | Type | Description |
|---|---|---|
| `campaign` | object | The campaign, now `cancelled`. Same shape as one row of `GET /api/admin/push`. |
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
      "category": "promotion",
      "audience_type": "country",
      "audience": { "countries": ["IN"] },
      "status": "cancelled",
      "scheduled_at": null,
      "targeted_users": 0,
      "targeted_devices": 0,
      "sent_count": 0,
      "failed_count": 0,
      "sent_at": null,
      "created_at": "2026-08-29T09:43:28.166Z",
      "updated_at": "2026-08-29T09:51:02.410Z"
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
| 409 | `CZDNOTIF002` | That campaign can no longer be cancelled. | The campaign is not a `draft` or `scheduled` — it has already run, or is already cancelled. | `TicketResolvedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDNOTIF002",
  "cz_error_message": "That campaign can no longer be cancelled.",
  "cz_error_description": "Only a draft or a scheduled campaign can be cancelled.",
  "cz_error_icon": "TicketResolvedIcon",
  "statusCode": 409,
  "timestamp": "2026-08-29T09:51:02.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `campaign.status` | `draft`, `scheduled`, `sending`, `sent`, `partial`, `failed`, `cancelled` | Only `draft` and `scheduled` may be cancelled; this route always returns `cancelled`. |
| `campaign.category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | |
| `campaign.audience_type` | `all`, `users`, `country`, `platform`, `segment` | |

## Example

```bash
curl -X POST "$BASE/admin/push/60dc116b-1ae4-4e25-b87d-1f217c2e2da5/cancel" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Cancelling clears `scheduled_at`.** The dispatcher only ever picks up rows with `status = 'scheduled'`, so a cancelled campaign is inert even if the clock passes its old send time.
- A cancelled campaign is not deleted. It stays in the list with its wording and audience intact, so it can still be duplicated into a fresh draft with `POST /api/admin/push/:cz_push_campaign_id/duplicate`.
- Cancelling is not a send-stop button: once `POST /api/admin/push/:cz_push_campaign_id/send` has handed tokens to FCM there is nothing to cancel, and the call is a 409.
- There is a small race at the send minute — a campaign the dispatcher has already picked up will finish sending even if a cancel lands mid-flight. Cancel with a minute to spare.
- A cancelled campaign can be revived by sending it directly; `POST .../send` does not check the status.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
