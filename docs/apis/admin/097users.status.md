# PATCH /api/admin/users/:cz_user_id/status

Blocks (suspends or bans) a user, or restores them. The admin panel's Withdrawals screen calls it for "Block user".

## Overview

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/users/:cz_user_id/status` |
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

| Param | Type | Notes |
|---|---|---|
| `cz_user_id` | uuid | The user to change. |

### Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | string | yes | `active`, `suspended` or `banned`. |

```json
{ "status": "suspended" }
```

## Behaviour

- `suspended` / `banned`: sign-in is refused and every authenticated request is refused with `CZDAUTH021` from the user's very next request (the auth guard's in-memory blocked list is updated at once).
- `active`: restores the account immediately.
- Does not touch pending withdrawals; reject them separately (`PATCH /api/admin/withdrawals/:id/reject`, which refunds the coins).

## Response

### Success — `200`

```json
{ "success": true, "data": { "cz_user_id": "60e238af-6b7b-49b5-b38b-209df277b9cd", "status": "suspended" } }
```

## Enum values

| Field | Values |
|---|---|
| `status` | `active`, `suspended`, `banned` |

## Errors

| Status | Code | Message | Description | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `status` is missing or not one of the allowed values. | — |
| 404 | `CZDUSER002` | We could not find that account. | No user with that `cz_user_id`. | `AccountNotFoundIcon` |

## Notes

None.
