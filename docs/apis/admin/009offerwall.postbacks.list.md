# GET /api/admin/offerwall/postbacks

Postback audit log, newest first, filterable by partner and status — the Postbacks tab table.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/offerwall/postbacks` |
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
| `partner_id` | string (uuid) | no | Filter to one partner. |
| `status` | string | no | Filter to one status. See [Enum values](#enum-values). |
| `date_from` | string (date) | no | Only postbacks received on/after this UTC date (inclusive), `yyyy-MM-dd`. |
| `date_end` | string (date) | no | Only postbacks received on/before this UTC date (inclusive), `yyyy-MM-dd`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_offerwall_postback_id` | string (uuid) | Row id. |
| `data[].partner_id` | string (uuid) | The partner this hit belongs to. |
| `data[].partner_name` | string | Partner name at the time of the hit. |
| `data[].user_id` | string (uuid) \| null | `null` when the payload could not be matched to a user. |
| `data[].external_transaction_id` | string | The partner's own transaction id. |
| `data[].offer_name` | string \| null | The specific offer, when the partner sends one. |
| `data[].coins_credited` | integer | Coins originally credited. Stays at the credited amount when `status` flips to `reversed` (the audit record of what was reversed); `0` for anything that was never credited. |
| `data[].status` | string | See [Enum values](#enum-values). |
| `data[].wallet_transaction_id` | string (uuid) \| null | Currently always `null` — reserved for a future direct link to the ledger row. |
| `data[].raw_payload` | object | The exact inbound query/body, for replay or dispute resolution. |
| `data[].created_at` | string (date-time) | UTC. |
| `total` | integer | Row count matching the query. |

```json
{
  "success": true,
  "data": [
    {
      "cz_offerwall_postback_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "partner_id": "2f8b41c9-6d05-4a77-9e12-8c4b0d75a361",
      "partner_name": "RewardTym",
      "user_id": "e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361",
      "external_transaction_id": "RT-TX-55120",
      "offer_name": "Complete a survey",
      "coins_credited": 250,
      "status": "credited",
      "wallet_transaction_id": null,
      "raw_payload": {
        "userid": "e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361",
        "txn_id": "RT-TX-55120",
        "offer": "Complete a survey",
        "amount": "250",
        "status": "1"
      },
      "created_at": "2026-08-28T06:10:02.000Z"
    }
  ],
  "total": 1
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | The token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `page`, `limit`, `partner_id` or `status` failed validation. | `ValidationFailedIcon` |
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
  "timestamp": "2026-08-28T07:43:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `credited`, `reversed`, `duplicate`, `invalid_secret`, `user_not_found`, `invalid_payload` | `invalid_secret` is reserved for future use — an unauthorized postback is rejected before any row is written, so it currently never appears. |

## Example

```bash
curl "$BASE/admin/offerwall/postbacks?partner_id=2f8b41c9-6d05-4a77-9e12-8c4b0d75a361&status=credited&date_from=2026-08-01&date_end=2026-08-29&page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Every inbound postback writes or updates exactly one row here, whatever the outcome — this is the single audit trail for the whole offerwall feature.
- `partner_id`, `status`, `date_from` and `date_end` combine as `AND`. The dates filter on `created_at`, both inclusive, in UTC.
- A duplicate postback is recorded with its `external_transaction_id` suffixed (`_dup_<timestamp>`) so it does not collide with the original row's unique constraint, while still being visible here as `duplicate`.
- **Reversals update the original row in place** rather than adding a new one: `(partner_id, external_transaction_id)` is unique, and real advertisers reverse a conversion by re-hitting the same transaction id with a reversed status. When that happens to a `credited` row, its `status` flips to `reversed` and the wallet is debited the row's original `coins_credited` — never a value re-derived from the reversal payload, which often omits the payout field entirely. The debit itself lands as its own `wallet_transactions` row (`type: "reversal"`), which is what the user actually sees — see [016](../user/012wallet.transactions.md). A postback reusing a transaction id that is not currently `credited` (already reversed, or a repeat of the original) is recorded as `duplicate` instead.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses a **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products it may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in a database.
