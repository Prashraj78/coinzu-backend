# POST /api/admin/avatars/image

Uploads an avatar image to the shared R2 bucket and returns its public URL, for `POST`/`PATCH /api/admin/avatars`.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/avatars/image` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `multipart/form-data` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `file` | file | yes | JPG or PNG, within the storage size limit | The avatar image. |

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `url` | string | Public URL of the stored image. |

```json
{
  "success": true,
  "data": { "url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/5f1c.png" }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDSTR001` | Please choose a file to upload. | No `file` part on the multipart request. | `FileRequiredIcon` |
| 400 | `CZDSTR002` | That file type is not supported. Please upload a JPG or PNG. | MIME type outside the allowed list. | `FileTypeInvalidIcon` |
| 400 | `CZDSTR003` | That file is too large. Please upload a smaller image. | Over the configured size limit. | `FileTooLargeIcon` |
| 500 | `CZDSTR004` | We could not upload that file. Please try again. | The R2 PutObject call failed. | `UploadFailedIcon` |
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
curl -X POST http://localhost:4000/api/admin/avatars/image \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -F 'file=@aria.png'
```

## Notes

- Stored under `avatar-library/` in the same R2 bucket Rewardtym uses, served from `R2_PUBLIC_URL`.
