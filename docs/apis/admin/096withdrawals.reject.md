# PATCH /api/admin/withdrawals/:cz_withdrawal_request_id/reject

Rejects a pending withdrawal and returns its coins to the user's wallet. The note is shown to the user.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/withdrawals/:cz_withdrawal_request_id/reject` |
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
| `note` | string | yes | Non-empty, max 500. | Why it was rejected. Stored as `rejection_reason` (and `admin_note`) and shown to the user. |

```json
{ "note": "The wallet address belongs to an exchange that does not accept TRC20." }
```

## Response

### Success — `200`

The updated row, same shape as a `GET /api/admin/withdrawals` row, with `status` `rejected` and `rejection_reason`, `admin_note`, `reviewed_at`, `reviewed_by` set.

```json
{
  "success": true,
  "data": {
    "cz_withdrawal_request_id": "9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55",
    "status": "rejected",
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
    "rejection_reason": "The wallet address belongs to an exchange that does not accept TRC20.",
    "admin_note": "The wallet address belongs to an exchange that does not accept TRC20.",
    "created_at": "2026-11-21T09:02:41.000Z",
    "reviewed_at": "2026-11-21T14:30:00.000Z",
    "paid_at": null,
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
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `note` missing or empty, or an unknown field was sent. | `ValidationFailedIcon` |
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
curl -X PATCH http://localhost:4000/api/admin/withdrawals/9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55/reject \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <rewardtym_admin_access_token>' \
  -d '{ "note": "The wallet address belongs to an exchange that does not accept TRC20." }'
```

## Notes

- Only from `pending`, with a conditional update, so a lost race returns `CZDWLT006` and refunds nothing.
- The status change and the refund commit in one transaction: a ledger credit of `amount_coins` with `type` `reversal`, `source_type` `withdrawal`, `source_id` = this request.
- The user gets a "Withdrawal rejected" notification quoting the note. No withdrawal rewards fire.
- **Blocking the user from withdrawing:** there is no withdrawal-specific block. The panel suspends the account through the admin user-status endpoint `PATCH /api/admin/users/:cz_user_id/status`. ([097](097users.status.md)); blocking in Rewardtym also works, through its `user.blocked` webhook. Either way the auth guard's in-memory blocked list is updated at once, so the block bites on the user's next request. Rejecting their pending withdrawal is a separate action.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
