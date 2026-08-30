# POST /api/notifications/push-events

Reports that a push notification arrived, was opened, or had a button tapped. This is what turns a send into an open rate — without it the admin panel only knows FCM accepted the message, not that anyone saw it.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/notifications/push-events` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `cz_push_campaign_id` | string (uuid) | yes | Must be a real campaign. | Read it from the FCM `data` payload key `campaign_id`. |
| `event` | string | yes | See [Enum values](#enum-values). | What happened. |
| `button_id` | string | no | Max 40 characters. | Which action button was tapped. Only meaningful with `event: "clicked"`. |

```json
{
  "cz_push_campaign_id": "60dc116b-1ae4-4e25-b87d-1f217c2e2da5",
  "event": "opened"
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `recorded` | boolean | Always `true` when the call succeeded. |
| `counted` | boolean | `true` when this was the first time this user reported this event for this campaign, so a counter moved. `false` on a repeat — the call still succeeded. |

```json
{
  "success": true,
  "data": { "recorded": true, "counted": true }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `cz_push_campaign_id` is not a uuid, `event` is not one of the allowed values, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 404 | `CZDNOTIF001` | We could not find that notification. | No campaign exists with that id. | `NotificationNotFoundIcon` |
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
  "timestamp": "2026-08-29T10:05:31.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `event` | `delivered`, `opened`, `clicked` | `delivered` when the message reaches the device, `opened` when the user taps the notification itself, `clicked` when they tap one of its action buttons. |

## Example

```bash
# The notification arrived
curl -X POST http://localhost:4000/api/notifications/push-events \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "cz_push_campaign_id": "60dc116b-1ae4-4e25-b87d-1f217c2e2da5", "event": "delivered" }'

# The user tapped an action button
curl -X POST http://localhost:4000/api/notifications/push-events \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{
    "cz_push_campaign_id": "60dc116b-1ae4-4e25-b87d-1f217c2e2da5",
    "event": "clicked",
    "button_id": "open_offers"
  }'
```

## Notes

- **Safe to retry.** One row is kept per user, campaign and event, so a repeat is accepted and returns `counted: false` rather than an error. Fire and forget — never block the UI on this call, and never queue a retry that could double-count, because it cannot.
- **Where the id comes from:** every push carries `campaign_id` in the FCM **`data`** payload (not `notification`). A push with no `campaign_id` was not sent by a campaign — a test send, for instance — and must not be reported.
- **When to call each event:**
  - `delivered` — from the message handler, in every app state, as soon as the payload arrives.
  - `opened` — when the user taps the notification and the app comes to the foreground, including a cold start from a killed app.
  - `clicked` — when the user taps an action button, with the `id` from that button.
- `opened` and `clicked` count **distinct users**, not taps, so the same person reopening the notification does not inflate the rate.
- A `clicked` event does not imply an `opened` one. Send both if both happened; the counters are independent.
- This endpoint records engagement only. Marking the in-app copy as read is a separate call, `PATCH /api/notifications/:cz_notification_id/read`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
