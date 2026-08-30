# GET /api/wallet

Returns the coin and gem balances of the signed-in user.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/wallet` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `coin_balance` | number | Current coin balance. |
| `gem_balance` | number | Current gem balance. |
| `coin_value_usd` | string | What `coin_balance` is worth in USD, at the `coins_per_usd` rate. A string so the two decimals stay exact — render it as `=$<value> USD`. |
| `gem_value_coins` | number | What `gem_balance` converts to in coins right now, at the `coins_per_gem` rate, floored. Render it as `= <value> Coins`. |
| `can_withdraw` | boolean | Whether `coin_balance` has reached `min_withdrawal_coins`. Drives the enabled state of the Withdraw button. |
| `rates.coins_per_usd` | number | How many coins make one USD. |
| `rates.coins_per_gem` | number | How many coins one gem is worth. May be fractional — `0.025` means 40 gems buy 1 coin. |
| `rates.min_withdrawal_coins` | number | Smallest withdrawal the backend accepts. |
| `updated_at` | string (iso date) | When the balance last changed. |

```json
{
  "success": true,
  "data": {
    "coin_balance": 12000,
    "gem_balance": 12000,
    "coin_value_usd": "12.00",
    "gem_value_coins": 300,
    "can_withdraw": true,
    "rates": {
      "coins_per_usd": 1000,
      "coins_per_gem": 0.025,
      "min_withdrawal_coins": 5000
    },
    "updated_at": "2026-08-27T08:59:11.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "No Bearer token was provided in the Authorization header.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl http://localhost:4000/api/wallet \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- If the wallet row is missing it is created on the spot with zero balances, so this endpoint never 404s.
- This is the only call the Wallet screen needs for its balance card: `coin_balance` with `coin_value_usd` under it, `gem_balance` with `gem_value_coins` under it, and `can_withdraw` for the Withdraw button. Never compute those conversions client-side — the rates are admin-tunable and change without a release.
- `rates.coins_per_gem` is deliberately allowed to be fractional. At the current `0.025`, 12,000 gems convert to 300 coins.
- Balances only ever change together with a `wallet_transactions` row, so the ledger always explains the number shown here.
- Use `GET /api/wallet/transactions` to show the user where a balance came from.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
