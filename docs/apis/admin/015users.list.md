# GET /api/admin/users

Every Coinzu user with their wallet balance, paginated and searchable by email, name, or phone — the Users tab table.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/users` |
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
| `page` | integer | no | 1-based page number. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `search` | string | no | Case-insensitive substring match against `email`, `name`, or `phone`. Omit to list everyone. |
| `status` | string | no | Exact match on account status. One of the `status` enum values below. |
| `kyc_status` | string | no | Exact match on KYC state. One of the `kyc_status` enum values below. |
| `tier` | string | no | Exact match on loyalty tier. One of the `tier` enum values below. |
| `country` | string | no | Exact match on ISO country code. |
| `date_from` | string (date) | no | Only users who joined on/after this UTC date (inclusive), `yyyy-MM-dd`. |
| `date_end` | string (date) | no | Only users who joined on/before this UTC date (inclusive), `yyyy-MM-dd`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_user_id` | string (uuid) | Use this to open the detail page, `GET /api/admin/users/:cz_user_id`. |
| `data[].email` | string | Account email. |
| `data[].phone` | string \| null | Account phone. |
| `data[].name` | string \| null | Display name. |
| `data[].country` | string \| null | ISO country code from onboarding. |
| `data[].avatar_url` | string \| null | Profile photo. |
| `data[].referral_code` | string | The code this user shares with friends. |
| `data[].tier` | string | Loyalty tier. |
| `data[].kyc_status` | string | Identity check state. |
| `data[].role` | string | `user` for every row — admins are Rewardtym tokens, never a row here. |
| `data[].status` | string | Account state. |
| `data[].last_login_at` | string (date-time) \| null | Last sign-in. `null` if never recorded. |
| `data[].joined_at` | string (date-time) | When the account was created. |
| `data[].coin_balance` | number | Current coin balance. |
| `data[].gem_balance` | number | Current gem balance. |
| `total` | integer | Total user rows matching `search` (or all users, if omitted), all pages. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
        "email": "prashantrajputaaaa@gmail.com",
        "phone": null,
        "name": "Prashant",
        "country": null,
        "avatar_url": null,
        "referral_code": "5VYYWDEA",
        "tier": "silver",
        "kyc_status": "none",
        "role": "user",
        "status": "active",
        "last_login_at": null,
        "joined_at": "2026-08-28T15:27:07.831Z",
        "coin_balance": 0,
        "gem_balance": 0
      }
    ],
    "total": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "Authorization header is missing.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-28T07:43:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].tier` | `silver`, `gold`, `platinum`, `diamond` | Ordered lowest to highest. Driven by lifetime coins earned; never set directly. |
| `data[].kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | `none` is the value on a fresh account. |
| `data[].role` | `user`, `admin` | Always `user` on this endpoint — see the field description above. |
| `data[].status` | `active`, `suspended`, `banned`, `deleted` | Account state. |

## Example

```bash
curl "$BASE/admin/users?page=1&limit=20&search=shubham&status=active&tier=gold&date_from=2026-08-01&date_end=2026-08-29" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Every user is listed, including a brand-new account with a zero wallet — wallets are created lazily on first use, and a user with no wallet row yet shows `coin_balance: 0, gem_balance: 0` here rather than a missing wallet.
- `search` matches `email`, `name`, and `phone` independently (an `OR`, not all three) — a query only needs to hit one field.
- `status`, `kyc_status`, `tier`, `country`, `date_from`, and `date_end` all combine with `search` and each other as `AND` filters — narrowing further whatever `search` (or its absence) already matched.
- `date_from`/`date_end` filter on `joined_at`, both inclusive, in UTC.
- Tap a row's `cz_user_id` to open `GET /api/admin/users/:cz_user_id` for that user's full profile.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
