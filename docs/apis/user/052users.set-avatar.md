# PATCH /api/users/me/avatar

Sets the signed-in user's profile picture to a library avatar, or back to their Google photo. Called when the user confirms a choice in the avatar picker.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/users/me/avatar` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

Send exactly one of the two fields.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `cz_avatar_id` | uuid | one of | An active avatar from `GET /api/avatars` | Wear this library avatar. |
| `use_google` | boolean | one of | `true` | Switch back to the Google profile photo. |

```json
{ "cz_avatar_id": "e658401f-6bac-46e1-9897-22b312ad35f5" }
```

## Response

### Success — `200`

The full profile, same shape as `GET /api/users/me`. The fields this endpoint changes:

| Field | Type | Description |
|---|---|---|
| `avatar_url` | string \| null | The picture to show everywhere (profile, leaderboard, winners). |
| `avatar_id` | uuid \| null | The library avatar in use; `null` when it is the Google photo. |
| `google_avatar_url` | string \| null | The Google photo on file, unchanged by this call. |
| `profile_completion_pct` | integer | Recomputed; a picture counts toward it. |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "d59034c7-808d-4100-bd7a-4d7b6c3f5756",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/png?seed=Luna&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf",
    "avatar_id": "e658401f-6bac-46e1-9897-22b312ad35f5",
    "google_avatar_url": null,
    "profile_completion_pct": 57
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDUSER010` | Please choose an avatar or your Google photo. | Both fields sent, or neither. | `ValidationFailedIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `cz_avatar_id` is not a UUID, or an unknown field was sent. | `ValidationFailedIcon` |
| 404 | `CZDUSER008` | That avatar isn’t available any more. Please pick another one. | Unknown or hidden avatar. | `NotFoundIcon` |
| 404 | `CZDUSER009` | We couldn’t find a Google photo on your account. Pick an avatar instead. | `use_google` on an account with no Google photo. | `NotFoundIcon` |
| 404 | `CZDUSER002` | We could not find that account. | The token's user no longer exists. | `AccountNotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | No Bearer token in the Authorization header. | `SignInRequiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token is malformed or has been revoked. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Global IP rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDUSER009",
  "cz_error_message": "We couldn’t find a Google photo on your account. Pick an avatar instead.",
  "cz_error_description": "use_google was sent but the user has no google_avatar_url (not a Google account, or Google returned no picture).",
  "cz_error_icon": "NotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-09-28T16:20:00.000Z"
}
```

## Enum values

None.

## Example

```bash
curl -X PATCH http://localhost:4000/api/users/me/avatar \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{"use_google": true}'
```

## Notes

- `google_avatar_url` is refreshed on every Google sign-in, and becomes the picture only when the user has none yet, so a picked avatar is never overwritten by a login.
- Deleting an avatar in the panel clears `avatar_id` for the users wearing it but leaves their `avatar_url`, so nobody loses their picture mid-session.
