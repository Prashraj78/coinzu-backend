# PATCH /api/admin/withdrawals/:cz_withdrawal_request_id/pay

Marks a pending withdrawal paid after the admin has sent the USDT by hand, recording the on-chain transaction hash.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/withdrawals/:cz_withdrawal_request_id/pay` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <rewardtym_admin_access_token>` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `cz_withdrawal_request_id` | path | string (uuid) | yes | The request. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `tx_hash` | string | yes | Max 100, trimmed. BEP20 `^0x[a-fA-F0-9]{64}$`, TRC20 `^[a-fA-F0-9]{64}$` (the request's network). | Hash of the USDT transfer. |
| `note` | string | no | Max 500. | Internal note, stored as `admin_note`. |

```json
{ "tx_hash": "0x3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a", "note": "Sent from treasury wallet #2." }
```

## Response

### Success — `200`

The updated row, same shape as a `GET /api/admin/withdrawals` row, with `status` `paid` and `tx_hash`, `tx_explorer_url`, `admin_note`, `paid_at`, `reviewed_at`, `reviewed_by` set.

```json
{
  "success": true,
  "data": {
    "cz_withdrawal_request_id": "9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55",
    "status": "paid",
    "network": "BEP20",
    "wallet_address": "0x8d12A197cB00D4747a1fe03395095ce2A5CC6819",
    "amount_coins": 10000,
    "gross_usd": "10.00",
    "fee_percent": "7.00",
    "fee_usd": "0.70",
    "payout_usd": "9.30",
    "tx_hash": "0x3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a",
    "address_explorer_url": "https://bscscan.com/address/0x8d12A197cB00D4747a1fe03395095ce2A5CC6819",
    "tx_explorer_url": "https://bscscan.com/tx/0x3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a",
    "rejection_reason": null,
    "admin_note": "Sent from treasury wallet #2.",
    "created_at": "2026-11-21T09:02:41.000Z",
    "reviewed_at": "2026-11-21T14:30:00.000Z",
    "paid_at": "2026-11-21T14:30:00.000Z",
    "reviewed_by": "lt_admin_7f3a",
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
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDWLT005` | We could not find that withdrawal. | No withdrawal with that id (or the id is not a uuid). | `WithdrawalNotFoundIcon` |
| 409 | `CZDWLT006` | This withdrawal has already been reviewed. | The request is no longer `pending` — another admin paid or rejected it first. Refresh the row. | `WithdrawalReviewedIcon` |
| 400 | `CZDWLT013` | That transaction hash does not look right for this network. Please check it and try again. | `tx_hash` does not match the request's network format. | `ValidationFailedIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `tx_hash` missing, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDWLT006",
  "cz_error_message": "This withdrawal has already been reviewed.",
  "cz_error_description": "Withdrawal status is no longer pending (another admin paid or rejected it first).",
  "cz_error_icon": "WithdrawalReviewedIcon",
  "statusCode": 409,
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
curl -X PATCH http://localhost:4000/api/admin/withdrawals/9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55/pay \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>' \
  -d '{ "tx_hash": "0x3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a" }'
```

## Notes

- Only from `pending`. The update is conditional (`WHERE id = :id AND status = 'pending'`), so if two admins click at once exactly one wins and the other gets `CZDWLT006`.
- Coins are not touched — they left the wallet on submission.
- The user gets a "Withdrawal paid" notification. Then the withdrawal rewards fire: achievement progress `withdrawal_completed` (count of paid withdrawals), referral triggers `first_withdrawal` (on the first paid one) and `withdrawals_completed`. A reward failure is logged and never undoes the payment.
- Send the USDT **before** calling this; there is no undo.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
