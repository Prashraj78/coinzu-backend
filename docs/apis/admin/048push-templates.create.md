# POST /api/admin/push-templates

Saves a reusable push message, so a send an admin makes often is picked from a list rather than retyped.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/push-templates` |
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

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `name` | string | yes | 1–120 characters. | Admin-facing name. Never shown to a user. |
| `emoji` | string | no | Max 16 characters. | Shown before the title on the device. |
| `title` | string | yes | 1–120 characters. | Notification title. |
| `body` | string | yes | 1–500 characters. | Notification body. |
| `image_url` | string | no | Max 500 characters. | Large image. |
| `deep_link` | string | no | Max 255 characters. | Where the app navigates on tap. |
| `category` | string | no | Default `announcement`. | What the message is about. See [Enum values](#enum-values). |
| `buttons` | object[] | no | Up to 3. | Action buttons. Each needs `id` (max 40) and `label` (max 30); `deep_link` (max 255) is optional. |
| `is_active` | boolean | no | Default `true`. | `false` saves it hidden from the composer. |

```json
{
  "name": "Weekend double coins",
  "emoji": "🎉",
  "title": "Double coins all weekend",
  "body": "Every offer you finish before Sunday pays twice.",
  "category": "promotion",
  "deep_link": "coinzu://offers",
  "buttons": [
    { "id": "open_offers", "label": "Browse offers", "deep_link": "coinzu://offers" }
  ]
}
```

## Response

### Success — `201`

The stored template. Same shape as one row of `GET /api/admin/push-templates`.

```json
{
  "success": true,
  "data": {
    "cz_push_template_id": "4675facb-3f13-4f59-b51a-d7293f579460",
    "name": "Weekend double coins",
    "emoji": "🎉",
    "title": "Double coins all weekend",
    "body": "Every offer you finish before Sunday pays twice.",
    "image_url": null,
    "deep_link": "coinzu://offers",
    "category": "promotion",
    "buttons": [
      { "id": "open_offers", "label": "Browse offers", "deep_link": "coinzu://offers" }
    ],
    "is_active": true,
    "use_count": 0,
    "created_by": "lt_admin_9f2c",
    "created_at": "2026-08-29T09:40:11.204Z",
    "updated_at": "2026-08-29T09:40:11.204Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `name`, `title` or `body` is missing or too long, more than 3 buttons, an unknown category, or an unknown field. | `ValidationFailedIcon` |
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
  "cz_error_description": "name should not be empty",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-29T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | `transaction` and `system` cannot be muted by a user and ignore quiet hours. |

## Example

```bash
curl -X POST "$BASE/admin/push-templates" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "name": "Weekend double coins",
    "emoji": "🎉",
    "title": "Double coins all weekend",
    "body": "Every offer you finish before Sunday pays twice.",
    "category": "promotion",
    "deep_link": "coinzu://offers"
  }'
```

## Notes

- **Names are not unique.** Two templates may share a name; they are told apart by id.
- A template holds only the message. The audience, schedule and delivery settings are chosen fresh on every campaign, so the same template can go to different people each time.
- Saving a template sends nothing. Use it by passing `cz_push_template_id` to `POST /api/admin/push`, which also bumps its `use_count`.
- `category` is copied onto the campaign when the composer applies the template, and can still be changed there.
- `created_by` is taken from the admin token, never from the body.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
