# DELETE /api/users/me

Deactivates the signed-in user's account (soft delete): the account is marked `deleted` so sign-in is refused, but the row and all of its data are kept. The app's Account screen calls this from its Delete button, after the user confirms. A permanent wipe is admin-only — see `DELETE /api/admin/users`.

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
| `cz_user_id` | string (uuid) | The account that was deactivated. |
| `email` | string | Its email, echoed for the confirmation copy. |
| `status` | string | Always `deleted`. |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "b9f2d0c4-5a61-4f3e-9d0a-7c2e1b8a4f10",
    "email": "ada@example.com",
    "status": "deleted"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 404 | `CZDUSER002` | We could not find that account. | The account in the token no longer exists (admin hard delete). | `AccountNotFoundIcon` |
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

- `status`: `deleted` (the only value this endpoint returns).

## Example

```bash
curl -X DELETE http://localhost:4000/api/users/me \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Soft delete.** The account's `status` becomes `deleted` and `deleted_at` is stamped; no rows are removed. Login (password and Google) already refuses any account whose status is not `active`, so a deactivated account can no longer sign in (`CZDAUTH` `ACCOUNT_INACTIVE`). Calling it again on an already-deleted account is a no-op and still returns `200`.
- **Not the same as the admin delete.** `DELETE /api/admin/users` is the irreversible hard wipe (wallet, ledger, offers, games, tickets, devices and the user row in one transaction). This user-facing endpoint never does that.
- The access token stays signed until it expires and the guard does not read the database per request, so a retained token could still reach protected routes until expiry — same as a `banned`/`suspended` account today. The app clears its stored session and returns to the welcome screen as soon as this returns, which is the normal path.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
