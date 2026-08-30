# PATCH /api/admin/push-templates/:cz_push_template_id

Edits a saved template, or hides it from the composer without deleting it. Every field is optional; only what you send changes.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/push-templates/:cz_push_template_id` |
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

| Name | Type | Required | Description |
|---|---|---|---|
| `cz_push_template_id` | string (uuid) | yes | The template to edit. |

### Body

Same fields as `POST /api/admin/push-templates`, all optional.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `name` | string | no | 1–120 characters. | Admin-facing name. |
| `emoji` | string | no | Max 16 characters. | Shown before the title. |
| `title` | string | no | 1–120 characters. | Notification title. |
| `body` | string | no | 1–500 characters. | Notification body. |
| `image_url` | string | no | Max 500 characters. | Large image. |
| `deep_link` | string | no | Max 255 characters. | Where the app navigates on tap. |
| `category` | string | no | See [Enum values](#enum-values). | What the message is about. |
| `buttons` | object[] | no | Up to 3. | Action buttons. Replaces the whole list. |
| `is_active` | boolean | no | | `false` hides it from the composer. |

```json
{ "body": "Every offer you finish before Sunday pays twice. Ends midnight.", "is_active": true }
```

## Response

### Success — `200`

The updated template. Same shape as one row of `GET /api/admin/push-templates`.

```json
{
  "success": true,
  "data": {
    "cz_push_template_id": "4675facb-3f13-4f59-b51a-d7293f579460",
    "name": "Weekend double coins",
    "emoji": "🎉",
    "title": "Double coins all weekend",
    "body": "Every offer you finish before Sunday pays twice. Ends midnight.",
    "image_url": null,
    "deep_link": "coinzu://offers",
    "category": "promotion",
    "buttons": [
      { "id": "open_offers", "label": "Browse offers", "deep_link": "coinzu://offers" }
    ],
    "is_active": true,
    "use_count": 1,
    "created_by": "lt_admin_9f2c",
    "created_at": "2026-08-29T09:40:11.204Z",
    "updated_at": "2026-08-29T10:02:44.912Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field is too long, more than 3 buttons, an unknown category, or an unknown field. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDNOTIF003` | We could not find that template. | No template exists with that id. | `NotificationNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDNOTIF003",
  "cz_error_message": "We could not find that template.",
  "cz_error_description": "No push template exists with that id.",
  "cz_error_icon": "NotificationNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T10:02:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | `transaction` and `system` cannot be muted by a user and ignore quiet hours. |

## Example

```bash
# Reword it
curl -X PATCH "$BASE/admin/push-templates/4675facb-3f13-4f59-b51a-d7293f579460" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "body": "Every offer you finish before Sunday pays twice. Ends midnight." }'

# Retire it without losing it
curl -X PATCH "$BASE/admin/push-templates/4675facb-3f13-4f59-b51a-d7293f579460" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "is_active": false }'
```

## Notes

- **Editing a template never touches a campaign.** Campaigns copy the wording at creation time, so a past send keeps the words it actually went out with.
- `buttons` is replaced wholesale, not merged. Send the full list, or an empty array to clear them.
- `use_count`, `created_by` and `created_at` cannot be changed here.
- Prefer `is_active: false` over deleting a template that has been used — the campaigns that came from it keep pointing at its id.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
