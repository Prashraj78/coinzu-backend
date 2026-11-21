# GET /api/admin/withdrawals/:cz_withdrawal_request_id

One withdrawal with the context needed to decide on it: the user's balances, lifetime earnings and payouts, and their previous requests.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/withdrawals/:cz_withdrawal_request_id` |
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
| `cz_withdrawal_request_id` | path | string (uuid) | yes | The request. |

### Body

None.

## Response

### Success — `200`

Every field of a `GET /api/admin/withdrawals` row, plus:

| Field | Type | Description |
|---|---|---|
| `user_context.coin_balance` | number | Coins in the wallet now. |
| `user_context.gem_balance` | number | Gems in the wallet now. |
| `user_context.total_coins_earned` | number | Lifetime coin credits (every positive ledger entry, refunds included). |
| `user_context.lifetime_paid.count` | number | Withdrawals in `paid`, ever. |
| `user_context.lifetime_paid.payout_usd` | string | USDT sent to this user, ever. |
| `user_context.user_status` | string | Account status, same as `user.status`. |
| `user_context.previous_withdrawals` | object[] | Up to 10 of the user's other requests, newest first, in the `GET /api/wallet/withdrawals` row shape plus `admin_note`. |

```json
{
  "success": true,
  "data": {
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
    },
    "user_context": {
      "coin_balance": 15000,
      "gem_balance": 2400,
      "total_coins_earned": 61250,
      "lifetime_paid": {
        "count": 2,
        "payout_usd": "27.90"
      },
      "user_status": "active",
      "previous_withdrawals": [
        {
          "cz_withdrawal_request_id": "1b7d2c40-55e1-4a0a-9e2f-71c3b0a8d912",
          "status": "paid",
          "amount_coins": 15000,
          "gross_usd": "15.00",
          "fee_percent": "7.00",
          "fee_usd": "1.05",
          "payout_usd": "13.95",
          "network": "TRC20",
          "wallet_address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
          "tx_hash": "a3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5",
          "explorer_url": "https://tronscan.org/#/transaction/a3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5",
          "rejection_reason": null,
          "created_at": "2026-11-02T10:00:00.000Z",
          "reviewed_at": "2026-11-02T16:00:00.000Z",
          "paid_at": "2026-11-02T16:00:00.000Z",
          "admin_note": null
        }
      ]
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDWLT005` | We could not find that withdrawal. | No withdrawal with that id (or the id is not a uuid). | `WithdrawalNotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDWLT005",
  "cz_error_message": "We could not find that withdrawal.",
  "cz_error_description": "No withdrawal request exists for the given id.",
  "cz_error_icon": "WithdrawalNotFoundIcon",
  "statusCode": 404,
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
| `user_context.user_status` | `active`, `suspended`, `banned`, `deleted` | — |

## Example

```bash
curl http://localhost:4000/api/admin/withdrawals/9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55 \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>'
```

## Notes

- **Blocking the user from withdrawing:** there is no withdrawal-specific block. The panel suspends the account through the admin user-status endpoint `PATCH /api/admin/users/:cz_user_id/status`. ([097](097users.status.md)); blocking in Rewardtym also works, through its `user.blocked` webhook. Either way the auth guard's in-memory blocked list is updated at once, so the block bites on the user's next request. Rejecting their pending withdrawal is a separate action.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
