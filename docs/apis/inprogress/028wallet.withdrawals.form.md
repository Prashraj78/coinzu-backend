# GET /api/wallet/withdrawals/form

Everything the web withdraw page needs in one call: balance, rate, minimum, fee, KYC need, pending request, last address for prefill, and whether the user may withdraw right now.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/wallet/withdrawals/form` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |
| `X-Device-Type` | no | `web`. Picks which KYC setting applies and sets `reason` `not_web` for `ios` / `android`. Falls back to the User-Agent. |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `coin_balance` | number | Current coin balance. |
| `coins_per_usd` | number | `coins_per_usd` setting. |
| `min_withdrawal_coins` | number | `min_withdrawal_coins` setting. |
| `max_withdrawal_coins` | number | Equal to `coin_balance` — the whole balance may be withdrawn. |
| `fee_percent` | number | `usdt_withdrawal_fee_percent` setting, e.g. `7`. |
| `requires_kyc` | boolean | Whether face verification is required on this platform. |
| `kyc_status` | string | The user's `kyc_status`. |
| `has_pending` | boolean | A `pending` request exists. |
| `pending` | object \| null | That request, same shape as a `GET /api/wallet/withdrawals` row. |
| `last_destination` | object \| null | `{ network, wallet_address }` of the most recent USDT request, for prefill. |
| `networks` | string[] | Always `["BEP20", "TRC20"]`. |
| `can_withdraw` | boolean | All checks pass right now. |
| `reason` | string \| null | First failing check when `can_withdraw` is false, else `null`. |

Preview the amounts the same way the server does, in whole cents: `gross_c = round(coins × 100 / coins_per_usd)`, `fee_c = round(gross_c × fee_percent / 100)`, `payout_c = gross_c − fee_c`; divide each by 100 for USD.

```json
{
  "success": true,
  "data": {
    "coin_balance": 25000,
    "coins_per_usd": 1000,
    "min_withdrawal_coins": 5000,
    "max_withdrawal_coins": 25000,
    "fee_percent": 7,
    "requires_kyc": false,
    "kyc_status": "none",
    "has_pending": false,
    "pending": null,
    "last_destination": { "network": "TRC20", "wallet_address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE" },
    "networks": ["BEP20", "TRC20"],
    "can_withdraw": true,
    "reason": null
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 403 | `CZDAUTH021` | Your account has been blocked for activity that breaks our rules. Contact support if you think this is a mistake. | The account is suspended, banned or deleted. | `AccountInactiveIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH003",
  "cz_error_message": "Your session has expired. Please sign in again.",
  "cz_error_description": "Access token has expired.",
  "cz_error_icon": "SessionExpiredIcon",
  "statusCode": 401,
  "timestamp": "2026-11-21T09:12:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | — |
| `networks[]`, `last_destination.network`, `pending.network` | `BEP20`, `TRC20` | — |
| `pending.status` | `pending` | Only pending requests appear here. |
| `reason` | `not_web`, `pending_exists`, `kyc_required`, `below_minimum` | Checked in that order; `null` when `can_withdraw` is true. |

## Example

```bash
curl http://localhost:4000/api/wallet/withdrawals/form \
  -H 'X-Device-Type: web' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- `can_withdraw` is advisory; `POST /api/wallet/withdrawals` re-checks everything.
- `below_minimum` compares the balance with the minimum; an amount the user types still has to be between `min_withdrawal_coins` and `max_withdrawal_coins`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
