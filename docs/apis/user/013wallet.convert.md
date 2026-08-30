# POST /api/wallet/convert

Converts coins into gems, or gems back into coins, at the admin-set rate.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/wallet/convert` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `from_currency` | string | yes | `coin` or `gem`. | What you are spending. The other currency is what you receive. |
| `amount` | number | yes | Whole number, at least 1. | How much of `from_currency` to convert. |

```json
{
  "from_currency": "coin",
  "amount": 500
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_user_id` | string (uuid) | Owner of the wallet. This is also the primary key. |
| `coin_balance` | number | Current coin balance. |
| `gem_balance` | number | Current gem balance. |
| `updated_at` | string (iso date) | When the balance last changed. |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
    "coin_balance": 12450,
    "gem_balance": 24,
    "updated_at": "2026-08-27T08:59:11.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDWLT008` | Please enter a valid amount to convert. | The amount is not a positive whole number, or it is too small to buy a single unit of the other currency. | `InvalidAmountIcon` |
| 400 | `CZDWLT002` | You do not have enough coins for this. | Converting from coins, and the coin balance is lower than `amount`. | `InsufficientCoinsIcon` |
| 400 | `CZDWLT003` | You do not have enough gems for this. | Converting from gems, and the gem balance is lower than `amount`. | `InsufficientGemsIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDWLT008",
  "cz_error_message": "Please enter a valid amount to convert.",
  "cz_error_description": "Conversion amount is zero, negative, or not a whole number.",
  "cz_error_icon": "InvalidAmountIcon",
  "statusCode": 400,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `from_currency` | `coin`, `gem` | — |

## Example

```bash
curl -X POST http://localhost:4000/api/wallet/convert \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "from_currency": "coin", "amount": 500 }'
```

## Notes

- The rate is the `coins_per_gem` setting. Coins to gems rounds down, so 550 coins at 100 coins per gem gives 5 gems and 50 coins are still spent.
- Both sides of the conversion run in one database transaction; a failure leaves the wallet untouched.
- The response is the updated wallet, not the ledger rows. Fetch `GET /api/wallet/transactions` to show the pair.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
