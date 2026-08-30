# POST /api/storage/avatar

Uploads an avatar image and returns its public URL.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/storage/avatar` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `multipart/form-data` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `file` | file | yes | JPEG, PNG or WebP, at most 5 MB. | The image to upload. |

Sent as `multipart/form-data`, not JSON.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `url` | string | Public URL of the stored image. |

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.coinzu.app/avatars/4b91e7d0-3c26-48fa-91b5-7e0d2c85a316.png"
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
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
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
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl -X POST http://localhost:4000/api/storage/avatar \
  -H 'Authorization: Bearer <access_token>' \
  -F 'file=@avatar.png'
```

## Notes

- Send the image as `multipart/form-data` under the field name `file`.
- Uploading does not change the profile. Send the returned `url` as `avatar_url` to `PATCH /api/users/me` to actually set it.
- The size limit comes from `S3_MAX_FILE_BYTES` and is 5 MB unless it is overridden.
- Files are stored under `avatars/` with a generated name, so the original file name is never exposed.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
