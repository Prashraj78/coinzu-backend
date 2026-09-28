# GET /api/admin/avatars

The avatar library, hidden avatars included, for the panel's Avatars page.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/avatars` |
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
| `page` | integer | no | 1-based page. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `is_active` | boolean | no | `true` for live avatars only, `false` for hidden ones. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_avatar_id` | uuid | Avatar id. |
| `data[].label` | string | Name shown in the picker. |
| `data[].image_url` | string | Image URL. |
| `data[].display_order` | integer | Picker position, lowest first. |
| `data[].is_active` | boolean | `false` hides it from the picker. |
| `data[].created_at` / `updated_at` | ISO-8601 UTC | Timestamps. |
| `total` | integer | Rows matching the filter. |

```json
{
  "success": true,
  "data": {
    "data": [
    {
      "cz_avatar_id": "17fd2983-d166-40f1-a10b-6f1544d04613",
      "label": "Aria",
      "image_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/5f1c.png",
      "display_order": 1,
      "is_active": true,
      "created_at": "2026-09-28T16:20:00.000Z",
      "updated_at": "2026-09-28T16:20:00.000Z"
    }
    ],
    "total": 12
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `:id` is not a UUID, or a body field fails validation. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | No Bearer token in the Authorization header. | `SignInRequiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token is malformed or has been revoked. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | A Coinzu user token, or an admin whose `product_access` excludes Coinzu. | `PermissionDeniedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH007",
  "cz_error_message": "You do not have permission to do that.",
  "cz_error_description": "The account lacks the role required for this action.",
  "cz_error_icon": "PermissionDeniedIcon",
  "statusCode": 403,
  "timestamp": "2026-09-28T16:20:00.000Z"
}
```

## Enum values

None.

## Example

```bash
curl 'http://localhost:4000/api/admin/avatars?is_active=true&limit=50' \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Ordered by `display_order`, then `label`, the same order the app's picker uses.
