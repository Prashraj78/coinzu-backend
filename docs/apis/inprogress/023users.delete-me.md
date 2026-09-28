# DELETE /api/users/me

Permanently deletes the signed-in user's account and every row that references it. The app's Account screen calls this from its Delete button, after the user confirms.

## Overview

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/users/me` |
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
| `cz_user_id` | string (uuid) | The account that was deleted. |
| `email` | string | Its email, echoed for the confirmation copy. |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "b9f2d0c4-5a61-4f3e-9d0a-7c2e1b8a4f10",
    "email": "ada@example.com"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 404 | `CZDUSER002` | We could not find that account. | The account in the token was already deleted. | `AccountNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDUSER002",
  "cz_error_message": "We could not find that account.",
  "cz_error_description": "No user exists for the given identifier.",
  "cz_error_icon": "AccountNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-09-28T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl -X DELETE http://localhost:4000/api/users/me \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Irreversible.** It runs the same wipe as `DELETE /api/admin/users`: wallet, ledger, offers, games, tickets, devices and the user row all go in one transaction. There is no soft-delete and no undo, so confirm in the app first.
- Anyone this user referred keeps their account; only the `referred_by` link is cleared.
- The access and refresh tokens stay signed but point at nothing, so every later call returns `CZDUSER002` or `CZDAUTH`. The app should clear its stored session and go back to the welcome screen as soon as this returns.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
