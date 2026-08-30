# GET /api/admin/push-templates

Saved push messages, most used first. Feeds the "start from a template" picker in the composer and the Templates screen.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/push-templates` |
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
| `search` | string | no | Case-insensitive match against the template name, title or body. Max 120 characters. |
| `category` | string | no | One message category. See [Enum values](#enum-values). |
| `is_active` | boolean | no | `true` returns only templates the composer offers; `false` only hidden ones. Omit for both. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_push_template_id` | string (uuid) | Primary key. |
| `data[].name` | string | Admin-facing name. Never shown to a user. |
| `data[].emoji` | string \| null | Shown before the title on the device. |
| `data[].title` | string | Notification title the composer fills in. |
| `data[].body` | string | Notification body the composer fills in. |
| `data[].image_url` | string \| null | Large image. |
| `data[].deep_link` | string \| null | Where the app navigates on tap. |
| `data[].category` | string | What the message is about. See [Enum values](#enum-values). |
| `data[].buttons[]` | array | Action buttons, each `{ id, label, deep_link }`. Up to 3. |
| `data[].is_active` | boolean | `false` hides it from the composer without deleting it. |
| `data[].use_count` | integer | How many campaigns have been created from it. |
| `data[].created_by` | string \| null | Rewardtym admin id that saved it. |
| `data[].created_at` | string (date-time) | When it was saved. |
| `data[].updated_at` | string (date-time) | Last edit. |
| `total` | integer | Templates matching the filters, all pages. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
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
        "use_count": 1,
        "created_by": "lt_admin_9f2c",
        "created_at": "2026-08-29T09:40:11.204Z",
        "updated_at": "2026-08-29T09:40:11.204Z"
      }
    ],
    "total": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `category` is not one of the allowed values, or `is_active` is not a boolean. | `ValidationFailedIcon` |
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
| `category` / `data[].category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | `transaction` and `system` cannot be muted by a user and ignore quiet hours. |

## Example

```bash
curl "$BASE/admin/push-templates?is_active=true&category=promotion&page=1&limit=50" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Ordered by `use_count` descending, then newest first, so the messages an admin actually reuses sit at the top of the picker.
- The composer calls this with `is_active=true` and a high limit; the Templates screen calls it unfiltered so hidden templates stay reachable.
- A template holds only the message — never an audience, a schedule or delivery settings. Those are chosen per campaign.
- `use_count` is bumped by `POST /api/admin/push` when a campaign names the template. Duplicating a campaign does not bump it.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
