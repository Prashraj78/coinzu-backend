# GET /api/admin/withdrawals/summary

Header tiles for the Withdrawals tab: what is waiting, and what was paid or rejected today / this month.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/withdrawals/summary` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <rewardtym_admin_access_token>` |

### Path / query params

Same optional filters as `GET /api/admin/withdrawals`, except `status` (ignored — the tiles split by status themselves) and `page`/`limit` (accepted, ignored).

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `search` | query | string | no | Max 120. Case-insensitive contains on user email, name, `cz_user_id`, `wallet_address` or `tx_hash`. |
| `status` | query | string | no | `pending`, `approved`, `rejected`, `paid`. |
| `network` | query | string | no | `BEP20`, `TRC20`. |
| `signup_platform` | query | string | no | `app`, `web` (the user's `users.signup_platform`). |
| `kyc_status` | query | string | no | `none`, `pending`, `verified`, `rejected`, `manual_review` (the user's current status). |
| `min_usd` | query | number | no | Payout USD at least this (`payout_usd`, or `gross_usd` on pre-USDT rows). |
| `max_usd` | query | number | no | Payout USD at most this. |
| `date_from` | query | string | no | `yyyy-MM-dd`. Requested on/after this UTC date (inclusive, on `created_at`). |
| `date_end` | query | string | no | `yyyy-MM-dd`. Requested on/before this UTC date (inclusive). |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `pending.count` | number | Requests in `pending`. |
| `pending.payout_usd` | string | Sum of their `payout_usd` — USDT needed to clear the queue. |
| `paid_today.count` | number | Paid since 00:00 UTC today (`paid_at`). |
| `paid_today.payout_usd` | string | USDT sent today. |
| `paid_this_month.count` | number | Paid since the 1st of this month, UTC. |
| `paid_this_month.payout_usd` | string | USDT sent this month. |
| `rejected_this_month.count` | number | Rejected since the 1st of this month, UTC (`reviewed_at`). |

```json
{
  "success": true,
  "data": {
    "pending": { "count": 4, "payout_usd": "61.38" },
    "paid_today": { "count": 2, "payout_usd": "18.60" },
    "paid_this_month": { "count": 37, "payout_usd": "512.04" },
    "rejected_this_month": { "count": 3 }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A filter is not one of its allowed values or a date is not `yyyy-MM-dd`. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH007",
  "cz_error_message": "You do not have permission to do that.",
  "cz_error_description": "The token is not an admin token for Coinzu.",
  "cz_error_icon": "PermissionDeniedIcon",
  "statusCode": 403,
  "timestamp": "2026-11-21T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `network` | `BEP20`, `TRC20` | — |
| `signup_platform` | `app`, `web` | — |
| `kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | — |

## Example

```bash
curl http://localhost:4000/api/admin/withdrawals/summary \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>'
```

## Notes

- USD sums use `payout_usd` (what was or will be sent), falling back to `gross_usd` on pre-USDT rows.
- `date_from`/`date_end` narrow by `created_at` like the list; combined with "today"/"this month" they intersect.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
