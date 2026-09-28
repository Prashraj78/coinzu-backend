# POST /api/admin/avatars

Adds an avatar to the library. Upload the image with `POST /api/admin/avatars/image` first and send its URL here.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/avatars` |
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
| `label` | string | yes | 1–60 chars | Name shown under the avatar. |
| `image_url` | string | yes | URL, ≤ 500 chars | Upload with `POST /api/admin/avatars/image` first. |
| `display_order` | integer | no | ≥ 0 | Picker position. Default `0`. |
| `is_active` | boolean | no | | Default `true`. |

```json
{ "label": "Aria", "image_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/5f1c.png", "display_order": 13 }
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_avatar_id` | uuid | Avatar id. |
| `label` | string | Name shown in the picker. |
| `image_url` | string | Image URL. |
| `display_order` | integer | Picker position, lowest first. |
| `is_active` | boolean | `false` hides it from the picker. |
| `created_at` / `updated_at` | ISO-8601 UTC | Timestamps. |

```json
{
  "success": true,
  "data": {
    "cz_avatar_id": "17fd2983-d166-40f1-a10b-6f1544d04613",
    "label": "Aria",
    "image_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/5f1c.png",
    "display_order": 1,
    "is_active": true,
    "created_at": "2026-09-28T16:20:00.000Z",
    "updated_at": "2026-09-28T16:20:00.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | Missing `label`/`image_url`, bad URL, or an unknown field. | `ValidationFailedIcon` |
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
curl -X POST http://localhost:4000/api/admin/avatars \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"label":"Aria","image_url":"https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/5f1c.png"}'
```

## Notes

- New avatars are live straight away unless `is_active` is `false`.
- Use square images of at least 256×256; the app shows them in circles from 28pt to 96pt.
