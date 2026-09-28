# DELETE /api/admin/avatars/:id

Removes an avatar from the library for good. Prefer hiding it (`is_active: false`) unless it must go.

## Overview

| Item | Value |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/admin/avatars/:id` |
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
| `id` | uuid | yes | `cz_avatar_id`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `deleted` | boolean | Always `true`. |

```json
{
  "success": true,
  "data": { "deleted": true }
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
curl -X DELETE http://localhost:4000/api/admin/avatars/17fd2983-d166-40f1-a10b-6f1544d04613 \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Users wearing it keep their picture: the foreign key clears their `avatar_id`, their `avatar_url` stays.
