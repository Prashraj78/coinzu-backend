# GET /api/admin/referrals/:cz_user_id

One user's referral summary plus a paginated list of everyone they invited — the detail page a row on `GET /api/admin/referrals` navigates to.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/referrals/:cz_user_id` |
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
| `cz_user_id` | string (uuid) | yes | The referring user's id, from a `GET /api/admin/referrals` row. |
| `page` | integer | no | 1-based page number for the `invited` list. Default `1`. |
| `limit` | integer | no | Rows per page for the `invited` list, max 100. Default `20`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `user.cz_user_id` | string (uuid) | The referring user's id. |
| `user.email` | string | Their account email. |
| `user.name` | string \| null | Their display name. |
| `user.referral_code` | string | The code they share with friends. |
| `user.joined_at` | string (date-time) | When their own account was created. |
| `total_invited` | number | Everyone who signed up with their code, all pages. |
| `total_qualified` | number | How many of them cleared the activation bar and paid out, all pages. |
| `coins_earned` | number | Sum of `reward_coins` across every referral they made, all pages. |
| `gems_earned` | number | Always `0`. There is no gem reward wired into the referral programme yet. |
| `invited.data[].cz_referral_id` | string (uuid) | The referral record's id. |
| `invited.data[].status` | string | `pending` or `qualified`. |
| `invited.data[].reward_coins` | number | Coins this specific referral paid out. `0` until qualified. |
| `invited.data[].qualified_at` | string (date-time) \| null | When it qualified, if it has. |
| `invited.data[].created_at` | string (date-time) | When the referred user signed up. |
| `invited.data[].cz_user_id` | string (uuid) | The referred (invited) user's id. |
| `invited.data[].email` | string | The referred user's email. |
| `invited.data[].name` | string \| null | The referred user's display name. |
| `invited.total` | integer | Total invited rows, all pages. |

```json
{
  "success": true,
  "data": {
    "user": {
      "cz_user_id": "f2eae717-1142-4c8b-b9d5-09d495d7b217",
      "email": "shubham@coinzu.app",
      "name": "Shubham",
      "referral_code": "AJSLE5XD",
      "joined_at": "2026-08-20T10:11:02.000Z"
    },
    "total_invited": 1,
    "total_qualified": 0,
    "coins_earned": 0,
    "gems_earned": 0,
    "invited": {
      "data": [
        {
          "cz_referral_id": "8ee86f06-bd48-4124-9cc8-c3eb46651e7f",
          "status": "pending",
          "reward_coins": 0,
          "qualified_at": null,
          "created_at": "2026-08-29T04:25:33.517Z",
          "cz_user_id": "9666a426-693e-4e4f-8e79-e00e07a5202f",
          "email": "referred@coinzu.app",
          "name": null
        }
      ],
      "total": 1
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDUSER002` | We could not find that account. | No user exists with that `cz_user_id`. | `AccountNotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
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
  "timestamp": "2026-08-29T04:26:06.810Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `invited.data[].status` | `pending`, `qualified` | `qualified` once the referred user clears the activation bar and the referrer is paid. |

## Example

```bash
curl "$BASE/admin/referrals/f2eae717-1142-4c8b-b9d5-09d495d7b217?page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- `total_invited`/`total_qualified`/`coins_earned` are computed over every referral this user has ever made, not just the current `invited` page.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
