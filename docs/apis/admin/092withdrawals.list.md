# GET /api/admin/withdrawals

The USDT withdrawal queue with each request's user, filterable, newest first. The Withdrawals tab table.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/withdrawals` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <rewardtym_admin_access_token>` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | number | no | 1-based. Default `1`. |
| `limit` | query | number | no | Default `20`, max `100`. |
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
| `data` | object[] | Rows, newest `created_at` first. Each row has the fields below. |
| `total` | number | Rows matching the filters, before paging. |
| `cz_withdrawal_request_id` | string (uuid) | Request id. |
| `status` | string | `pending`, `approved`, `rejected`, `paid`. |
| `network` | string \| null | `BEP20` / `TRC20`. `null` on pre-USDT rows. |
| `wallet_address` | string \| null | Destination address, plain text, for search and copy. |
| `amount_coins` | number | Coins debited. |
| `gross_usd` | string | `amount_coins / coins_per_usd` at request time. |
| `fee_percent` | string \| null | Fee percent applied. |
| `fee_usd` | string \| null | Fee kept. |
| `payout_usd` | string \| null | **The USDT amount to send.** |
| `tx_hash` | string \| null | Set when `paid`. |
| `address_explorer_url` | string \| null | BscScan `https://bscscan.com/address/<addr>` / TronScan `https://tronscan.org/#/address/<addr>`. |
| `tx_explorer_url` | string \| null | BscScan `https://bscscan.com/tx/<hash>` / TronScan `https://tronscan.org/#/transaction/<hash>`. Set when `paid`. |
| `rejection_reason` | string \| null | Shown to the user. Set when `rejected`. |
| `admin_note` | string \| null | Pay note, or the reject note (same as `rejection_reason`). |
| `created_at` | string (iso date) | Requested at. |
| `reviewed_at` | string (iso date) \| null | Paid/rejected at. |
| `paid_at` | string (iso date) \| null | Paid at. |
| `reviewed_by` | string \| null | Rewardtym admin id (`sub` of the admin token). |
| `user.cz_user_id` | string (uuid) | — |
| `user.name` | string \| null | — |
| `user.email` | string | — |
| `user.avatar_url` | string \| null | — |
| `user.signup_platform` | string | `app` or `web`. |
| `user.kyc_status` | string | Current KYC status. |
| `user.status` | string | Account status — `suspended`/`banned` means blocked. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
            "cz_withdrawal_request_id": "9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55",
            "status": "pending",
            "network": "TRC20",
            "wallet_address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
            "amount_coins": 10000,
            "gross_usd": "10.00",
            "fee_percent": "7.00",
            "fee_usd": "0.70",
            "payout_usd": "9.30",
            "tx_hash": null,
            "address_explorer_url": "https://tronscan.org/#/address/TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
            "tx_explorer_url": null,
            "rejection_reason": null,
            "admin_note": null,
            "created_at": "2026-11-21T09:02:41.000Z",
            "reviewed_at": null,
            "paid_at": null,
            "reviewed_by": null,
            "user": {
              "cz_user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
              "name": "Asha Rao",
              "email": "asha@example.com",
              "avatar_url": null,
              "signup_platform": "web",
              "kyc_status": "none",
              "status": "active"
            }
          }
    ],
    "total": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A filter is not one of its allowed values, a date is not `yyyy-MM-dd`, or `min_usd`/`max_usd` is negative. | `ValidationFailedIcon` |
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
  "cz_error_description": "One or more fields in the request are invalid.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-11-21T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` (query + response) | `pending`, `approved`, `rejected`, `paid` | `approved` is reserved and never set. |
| `network` (query + response) | `BEP20`, `TRC20` | — |
| `signup_platform` / `user.signup_platform` | `app`, `web` | — |
| `kyc_status` / `user.kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | — |
| `user.status` | `active`, `suspended`, `banned`, `deleted` | — |

## Example

```bash
curl "http://localhost:4000/api/admin/withdrawals?status=pending&network=TRC20&page=1&limit=20" \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>'
```

## Notes

- Every filter combines as `AND`. Money values are strings with two decimals.
- Pay with `PATCH /api/admin/withdrawals/:id/pay`, reject with `PATCH /api/admin/withdrawals/:id/reject`. Header tiles come from `GET /api/admin/withdrawals/summary`.
- **Blocking the user from withdrawing:** there is no withdrawal-specific block. The panel suspends the account through the admin user-status endpoint `PATCH /api/admin/users/:cz_user_id/status`. ([097](097users.status.md)); blocking in Rewardtym also works, through its `user.blocked` webhook. Either way the auth guard's in-memory blocked list is updated at once, so the block bites on the user's next request. Rejecting their pending withdrawal is a separate action.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
