# PATCH /api/admin/avatars/:id

Renames, reorders, replaces the image of, or hides one avatar. Only the fields sent change.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/avatars/:id` |
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
| `id` | uuid | yes | `cz_avatar_id`. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `label` | string | no | 1–60 chars | Name shown under the avatar. |
| `image_url` | string | no | URL, ≤ 500 chars | Upload with `POST /api/admin/avatars/image` first. |
| `display_order` | integer | no | ≥ 0 | Picker position. Default `0`. |
| `is_active` | boolean | no | | Default `true`. |

```json
{ "is_active": false }
```

## Response

### Success — `200`

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
    "is_active": false,
    "created_at": "2026-09-28T16:20:00.000Z",
    "updated_at": "2026-09-28T16:20:00.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `:id` is not a UUID, or a body field fails validation. | `ValidationFailedIcon` |
| 404 | `CZDUSER008` | That avatar isn’t available any more. Please pick another one. | No avatar with that id. | `NotFoundIcon` |
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
curl -X PATCH http://localhost:4000/api/admin/avatars/17fd2983-d166-40f1-a10b-6f1544d04613 \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"is_active": false}'
```

## Notes

- Hiding an avatar removes it from the picker; users already wearing it keep it.
- Changing `image_url` does not update users who already picked it (their `avatar_url` is a copy). Ask them to pick again, or add a new avatar instead.
