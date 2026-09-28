# GET /api/avatars

Lists the avatars a user can pick as their profile picture. Called by the app's avatar picker on Edit Profile.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/avatars` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_avatar_id` | uuid | Send this to `PATCH /api/users/me/avatar`. |
| `data[].label` | string | Name shown under the avatar. |
| `data[].image_url` | string | Full URL of the square image (256px or larger). |
| `data[].display_order` | integer | Position in the picker, lowest first. |
| `total` | integer | Number of avatars returned (the list is not paginated). |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_avatar_id": "17fd2983-d166-40f1-a10b-6f1544d04613",
        "label": "Aria",
        "image_url": "https://api.dicebear.com/9.x/lorelei/png?seed=Aria&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf",
        "display_order": 1
      }
    ],
    "total": 12
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | No Bearer token in the Authorization header. | `SignInRequiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token is malformed or has been revoked. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Global IP rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "No Bearer token was provided in the Authorization header.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-09-28T16:20:00.000Z"
}
```

## Enum values

None.

## Example

```bash
curl http://localhost:4000/api/avatars \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

## Notes

- Only active avatars are listed. Hiding one in the panel removes it from the picker; users already wearing it keep the picture.
- The starter set (12, DiceBear's CC0 Lorelei and Notionists styles) is seeded by migration `1800800000000-avatars`. Admins replace or extend it with `POST /api/admin/avatars`.
- A Google account's photo is not in this list. The app offers it separately from `google_avatar_url` on `GET /api/users/me`.
