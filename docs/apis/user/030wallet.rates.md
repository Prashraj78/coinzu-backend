# GET /api/wallet/rates

Every currency definition the app needs to explain money to a user — what a coin is worth, what a gem is worth, how Convert works in both directions, and the withdrawal floor. Send an amount to get the exact converted figure back instead of computing it client-side.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/wallet/rates` |
| **Auth** | Bearer user access token required. |
| **Role** | user |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `gem_amount` | integer | no | Gems to price. Whole number, 1 or more. Fills `convert.gem_to_coin.preview`. |
| `coin_amount` | integer | no | Coins to price. Whole number, 1 or more. Fills `convert.coin_to_gem.preview`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `coin.coins_per_usd` | number | How many coins make one US dollar. |
| `coin.usd_per_coin` | string | What a single coin is worth, six decimals, exact as a string. |
| `coin.definition` | string | Ready-to-render sentence, e.g. `1,000 coins = $1.00`. |
| `gem.coins_per_gem` | number | What one gem is worth in coins. Fractional by design. |
| `gem.gems_per_coin` | number | The inverse — how many gems buy one coin. |
| `gem.definition` | string | Ready-to-render sentence, e.g. `40 gems = 1 coin`. |
| `convert.gem_to_coin.rate` | number | Same value as `gem.coins_per_gem`, repeated where it is applied. |
| `convert.gem_to_coin.formula` | string | The exact server formula: `floor(gems * coins_per_gem)`. |
| `convert.gem_to_coin.definition` | string | Sentence form of the direction. |
| `convert.gem_to_coin.preview` | object \| null | `null` unless `gem_amount` was sent. |
| `convert.gem_to_coin.preview.from_gems` | number | The `gem_amount` you sent, echoed. |
| `convert.gem_to_coin.preview.to_coins` | number | Coins that conversion would credit, already floored. |
| `convert.coin_to_gem.rate` | number | Same value again — one rate drives both directions. |
| `convert.coin_to_gem.formula` | string | The exact server formula: `floor(coins / coins_per_gem)`. |
| `convert.coin_to_gem.definition` | string | Sentence form of the direction. |
| `convert.coin_to_gem.preview` | object \| null | `null` unless `coin_amount` was sent. |
| `convert.coin_to_gem.preview.from_coins` | number | The `coin_amount` you sent, echoed. |
| `convert.coin_to_gem.preview.to_gems` | number | Gems that conversion would credit, already floored. |
| `withdrawal.min_withdrawal_coins` | number | Smallest payout the backend accepts. |
| `withdrawal.min_withdrawal_usd` | string | That floor in dollars, two decimals exact. |
| `withdrawal.requires_kyc` | boolean | Whether identity verification is required before a payout. |

```json
{
  "success": true,
  "data": {
    "coin": {
      "coins_per_usd": 1000,
      "usd_per_coin": "0.001000",
      "definition": "1,000 coins = $1.00"
    },
    "gem": {
      "coins_per_gem": 0.025,
      "gems_per_coin": 40,
      "definition": "40 gems = 1 coin"
    },
    "convert": {
      "gem_to_coin": {
        "rate": 0.025,
        "formula": "floor(gems * coins_per_gem)",
        "definition": "40 gems convert to 1 coin",
        "preview": { "from_gems": 12000, "to_coins": 300 }
      },
      "coin_to_gem": {
        "rate": 0.025,
        "formula": "floor(coins / coins_per_gem)",
        "definition": "1 coin converts to 40 gems",
        "preview": { "from_coins": 500, "to_gems": 20000 }
      }
    },
    "withdrawal": {
      "min_withdrawal_coins": 5000,
      "min_withdrawal_usd": "5.00",
      "requires_kyc": true
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `gem_amount` or `coin_amount` is not a whole number of at least 1. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | No Bearer token was provided in the Authorization header. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "gem_amount must not be less than 1",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-29T06:58:44.183Z"
}
```

## Enum values

None. Every field here is a number, a string or a boolean.

## Example

```bash
# Definitions only
curl "$BASE/wallet/rates" \
  -H 'Authorization: Bearer $TOKEN'

# Definitions plus an exact preview for both directions
curl "$BASE/wallet/rates?gem_amount=12000&coin_amount=500" \
  -H 'Authorization: Bearer $TOKEN'
```

## Notes

- **Never compute a conversion on the client.** Send the amount and read `preview` — the server applies the same `Math.floor` that `POST /api/wallet/convert` will, so the number you show is the number the user gets. Multiplying locally will disagree at the boundaries.
- The `definition` strings are written to be rendered as-is. Use them for the explainer copy on the Convert screen instead of assembling sentences from the raw numbers.
- One rate, `coins_per_gem`, drives both directions: gems → coins multiplies by it, coins → gems divides by it. It is fractional on purpose — `0.025` means 40 gems buy 1 coin.
- Both directions floor, so a user never receives a fractional coin or gem. Converting 10 gems at `0.025` yields `0` coins, and `POST /api/wallet/convert` rejects that with `CZDWLT008` rather than taking the gems for nothing — surface the preview before letting the user confirm.
- Rates are admin-tunable from the Configuration Settings tab and are read live. Fetch this on the Convert and Wallet screens rather than caching values into the app binary.
- `usd_per_coin`, `min_withdrawal_usd` and every other money string stay strings so their decimals are exact. Do not parse them into floats for display.
- `GET /api/wallet` already returns the two conversions for the *current balance*; this endpoint is for the general rate book and for pricing an arbitrary amount.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
