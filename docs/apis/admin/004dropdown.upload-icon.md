# POST /api/admin/dropdown/options/icon

Uploads a dropdown option icon and returns its public URL. Upload first, then send the returned `url` as `icon_url` to the create or update endpoint.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/dropdown/options/icon` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `multipart/form-data` |
| `Authorization` | yes | `Bearer <rewardtym_admin_access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `file` | file | yes | JPEG, PNG or WebP, at most 5 MB. | The icon image to upload. |

Sent as `multipart/form-data`, not JSON.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `url` | string | Public URL of the stored icon. |

```json
{
  "success": true,
  "data": {
    "url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/4b91e7d0-3c26-48fa-91b5-7e0d2c85a316.png"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDSTR001` | Please choose a file to upload. | No file was sent. | `FileRequiredIcon` |
| 400 | `CZDSTR002` | That file type is not supported. Please upload a JPG or PNG. | The file is not a JPEG, PNG or WebP. | `FileTypeInvalidIcon` |
| 400 | `CZDSTR003` | That file is too large. Please upload a smaller image. | The file is larger than the upload limit. | `FileTooLargeIcon` |
| 500 | `CZDSTR004` | We could not upload that file. Please try again. | The image could not be stored. | `UploadFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | The token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDSTR001",
  "cz_error_message": "Please choose a file to upload.",
  "cz_error_description": "No file was present on the multipart request.",
  "cz_error_icon": "FileRequiredIcon",
  "statusCode": 400,
  "timestamp": "2026-08-28T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl -X POST http://localhost:4000/api/admin/dropdown/options/icon \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>' \
  -F 'file=@gaming.png'
```

## Notes

- Send the image as `multipart/form-data` under the field name `file`.
- Uploading does not attach the icon to any option. Send the returned `url` as `icon_url` to `POST /api/admin/dropdown/options` or `PATCH /api/admin/dropdown/options/:id` to actually set it.
- Files are stored under `dropdown-icons/` with a generated name, so the original file name is never exposed. The old icon at a replaced URL is not deleted.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
