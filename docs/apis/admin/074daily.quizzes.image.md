# POST /api/admin/daily/quizzes/image

Uploads a quiz image to R2 and returns its public URL, ready to pass as `image_url` when scheduling the quiz.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/daily/quizzes/image` |
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

`multipart/form-data` with a single part.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `file` | file | yes | JPEG, PNG or WebP, up to 5 MB. | The image shown above the question. |

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `url` | string | The public R2 URL. Pass it as `image_url` on the quiz. |

```json
{
  "success": true,
  "data": {
    "url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/quiz-images/6b1f0f0a9a4e4a2c.png"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | No file was sent, the type is not an allowed image, or it is over 5 MB. | `ValidationFailedIcon` |
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
  "cz_error_description": "Only JPEG, PNG and WebP images are accepted.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T10:47:24.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST "$BASE/admin/daily/quizzes/image" \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -F 'file=@octopus.png'
```

## Notes

- **Upload first, then schedule.** This route only stores the file; nothing is attached to a quiz until you pass the returned URL as `image_url` on `POST /api/admin/daily/quizzes`.
- Files land under the `quiz-images/` prefix in the same R2 bucket Rewardtym uses. The name is generated, so uploading the same file twice gives two URLs.
- **Nothing is cleaned up.** Replacing a quiz's image leaves the old object in the bucket; deleting a quiz does not delete its image.
- The app renders the image above the question at full width, so prefer a wide crop over a square one.
