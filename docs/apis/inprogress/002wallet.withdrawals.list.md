# GET /api/wallet/withdrawals

Lists the withdrawal requests of the signed-in user, newest first — the withdrawal history on the web withdraw page.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/wallet/withdrawals` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | number | no | 1-based page number. Defaults to `1`. |
| `limit` | query | number | no | Rows per page. Values above 100 are capped at 100. Defaults to `20`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Withdrawal requests on this page, newest first. |
| `data[].cz_withdrawal_request_id` | string (uuid) | Request id. |
| `data[].status` | string | `pending`, `approved`, `rejected` or `paid`. |
| `data[].amount_coins` | number | Coins taken from the wallet. |
| `data[].gross_usd` | string | `amount_coins / coins_per_usd` at request time. |
| `data[].fee_percent` | string \| null | Fee percent used. `null` on pre-USDT rows. |
| `data[].fee_usd` | string \| null | Fee in USD. `null` on pre-USDT rows. |
| `data[].payout_usd` | string \| null | USDT sent (`gross_usd − fee_usd`). `null` on pre-USDT rows. |
| `data[].network` | string \| null | `BEP20` or `TRC20`. `null` on pre-USDT rows. |
| `data[].wallet_address` | string \| null | Destination address. |
| `data[].tx_hash` | string \| null | On-chain transaction hash, set when `paid`. |
| `data[].explorer_url` | string \| null | BscScan (`https://bscscan.com/tx/<hash>`) or TronScan (`https://tronscan.org/#/transaction/<hash>`) link, set when `paid`. |
| `data[].rejection_reason` | string \| null | The admin's note, set when `rejected`. Show it to the user. |
| `data[].created_at` | string (iso date) | When the request was made. |
| `data[].reviewed_at` | string (iso date) \| null | When an admin paid or rejected it. |
| `data[].paid_at` | string (iso date) \| null | When it was paid. |
| `total` | number | Total requests made by this user. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_withdrawal_request_id": "9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55",
        "status": "paid",
        "amount_coins": 10000,
        "gross_usd": "10.00",
        "fee_percent": "7.00",
        "fee_usd": "0.70",
        "payout_usd": "9.30",
        "network": "BEP20",
        "wallet_address": "0x8d12A197cB00D4747a1fe03395095ce2A5CC6819",
        "tx_hash": "0x3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a",
        "explorer_url": "https://bscscan.com/tx/0x3f1c8a5e9b2d4c6f8a1b3d5e7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a",
        "rejection_reason": null,
        "created_at": "2026-11-20T09:02:41.000Z",
        "reviewed_at": "2026-11-20T14:30:00.000Z",
        "paid_at": "2026-11-20T14:30:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
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
  "timestamp": "2026-11-21T09:12:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `pending`, `approved`, `rejected`, `paid` | `approved` is reserved and never set. |
| `network` | `BEP20`, `TRC20` | `null` on pre-USDT rows. |

## Example

```bash
curl 'http://localhost:4000/api/wallet/withdrawals?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- Works on every platform (read-only), so the app can still show old history.
- The response no longer carries `user_id`, `method`, `amount_usd` (now `gross_usd`) or `destination_details_encrypted`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
