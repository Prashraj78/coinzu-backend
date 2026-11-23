# POST /api/wallet/withdrawals

Asks for a USDT payout from the website. The coins leave the wallet straight away and an admin sends the USDT by hand.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/wallet/withdrawals` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |
| `X-Device-Type` | no | `web`. The platform is read from this header, then the User-Agent; anything resolving to `ios` / `android` is refused. |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `amount_coins` | number | yes | Whole number, at least 1. At least `min_withdrawal_coins`, at most the coin balance. | Coins to withdraw. There is no cap other than the balance. |
| `network` | string | yes | `BEP20` or `TRC20`. | USDT chain to pay on. |
| `wallet_address` | string | yes | Max 64 chars, trimmed. BEP20 `^0x[a-fA-F0-9]{40}$`, TRC20 `^T[1-9A-HJ-NP-Za-km-z]{33}$`. | Where the USDT is sent. |

```json
{
  "amount_coins": 10000,
  "network": "TRC20",
  "wallet_address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE"
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_withdrawal_request_id` | string (uuid) | Primary key of the request. |
| `status` | string | Always `pending` here. |
| `amount_coins` | number | Coins taken out of the wallet. |
| `gross_usd` | string | `amount_coins / coins_per_usd`, two decimals. |
| `fee_percent` | string \| null | The `usdt_withdrawal_fee_percent` used, e.g. `"7.00"`. `null` only on pre-USDT rows. |
| `fee_usd` | string \| null | `round(gross_usd × fee_percent / 100, 2)`. |
| `payout_usd` | string \| null | `gross_usd − fee_usd`. The USDT amount the user receives. |
| `network` | string \| null | `BEP20` or `TRC20`. |
| `wallet_address` | string \| null | Destination address as stored (trimmed). |
| `tx_hash` | string \| null | `null` until paid. |
| `explorer_url` | string \| null | `null` until paid. |
| `rejection_reason` | string \| null | `null` until rejected. |
| `created_at` | string (iso date) | When the request was made. |
| `reviewed_at` | string (iso date) \| null | `null` until reviewed. |
| `paid_at` | string (iso date) \| null | `null` until paid. |

All money fields are strings so two decimals stay exact.

```json
{
  "success": true,
  "data": {
    "cz_withdrawal_request_id": "9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55",
    "status": "pending",
    "amount_coins": 10000,
    "gross_usd": "10.00",
    "fee_percent": "7.00",
    "fee_usd": "0.70",
    "payout_usd": "9.30",
    "network": "TRC20",
    "wallet_address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    "tx_hash": null,
    "explorer_url": null,
    "rejection_reason": null,
    "created_at": "2026-11-21T09:02:41.000Z",
    "reviewed_at": null,
    "paid_at": null
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 403 | `CZDWLT011` | Cash withdrawals are available on the website. In the app, redeem your coins for gift cards. | The request came from the iOS or Android app. | `WrongPlatformIcon` |
| 400 | `CZDWLT012` | That wallet address does not look right for the selected network. Please check it and try again. | `wallet_address` does not match the `network` format. | `WalletAddressInvalidIcon` |
| 400 | `CZDWLT004` | This amount is below the minimum you can withdraw. | The amount is below the `min_withdrawal_coins` setting. | `BelowMinimumWithdrawalIcon` |
| 403 | `CZDWLT007` | Please complete identity verification before withdrawing. | `withdrawal_requires_kyc_web` is on and the user is not `verified`. | `KycRequiredIcon` |
| 403 | `CZDWLT014` | Please join our Telegram channel to withdraw. | `TELEGRAM_CHANNEL_ID` is set and the user's Telegram account is not in the channel (checked fresh on every request; a failed check lets it through). | `KycRequiredIcon` |
| 409 | `CZDWLT009` | You already have a withdrawal being reviewed. | The user already has a `pending` withdrawal (also returned when two submits race). | `WithdrawalPendingIcon` |
| 400 | `CZDWLT002` | You do not have enough coins for this. | The coin balance is lower than `amount_coins`. | `InsufficientCoinsIcon` |
| 403 | `CZDAUTH021` | Your account has been blocked for activity that breaks our rules. Contact support if you think this is a mistake. | The account is suspended, banned or deleted. | `AccountInactiveIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDWLT011",
  "cz_error_message": "Cash withdrawals are available on the website. In the app, redeem your coins for gift cards.",
  "cz_error_description": "USDT withdrawals are web only; the request came from the iOS or Android app (X-Device-Type / User-Agent).",
  "cz_error_icon": "WrongPlatformIcon",
  "statusCode": 403,
  "timestamp": "2026-11-21T09:12:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `network` | `BEP20`, `TRC20` | BEP20 = BNB Smart Chain, TRC20 = Tron. |
| `status` | `pending`, `approved`, `rejected`, `paid` | Always `pending` on this response. `approved` is reserved and never set. |

## Example

```bash
curl -X POST http://localhost:4000/api/wallet/withdrawals \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Type: web' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{ "amount_coins": 10000, "network": "TRC20", "wallet_address": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE" }'
```

## Notes

- **Web only.** The app gets `CZDWLT011`; it redeems gift cards instead (which in turn refuse the web with `CZDRDM007`).
- The old body (`method`, `destination_details`) is gone; sending it fails with `CZDCOMM001`.
- The request row and the coin debit (ledger `type` `withdrawal`, `source_type` `withdrawal`) commit in one transaction. A rejection credits the coins back (`type` `reversal`).
- One `pending` request per user, enforced by a partial unique index, so two simultaneous submits cannot both land.
- Referral and achievement rewards for withdrawing fire when an admin marks the request **paid**, not on submission.
- The user gets a "Withdrawal submitted" notification. Call `GET /api/wallet/withdrawals/form` first to render the page.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
