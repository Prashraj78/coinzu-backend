# POST /api/wallet/withdrawals

Asks for a cash payout. The coins leave the wallet straight away and an admin reviews the request.

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

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `amount_coins` | number | yes | Whole number, at least 1. | Coins to withdraw. Must also be at least the `min_withdrawal_coins` setting. |
| `method` | string | yes | One of `paypal`, `bank`, `crypto`. | How the user wants to be paid. |
| `destination_details` | object | yes | Object of string values. | Payout account details. Encrypted before it is stored. |

```json
{
  "amount_coins": 5000,
  "method": "paypal",
  "destination_details": { "paypal_email": "user@coinzu.app" }
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_withdrawal_request_id` | string (uuid) | Primary key of the request. |
| `user_id` | string (uuid) | Who asked for the payout. |
| `amount_coins` | number | Coins taken out of the wallet. |
| `amount_usd` | string | Cash value, using the `coins_per_usd` setting. Sent as a string to keep two decimals exact. |
| `method` | string | One of `paypal`, `bank`, `crypto`. |
| `destination_details_encrypted` | string | Payout account details, AES-256-GCM encrypted. Not readable by the client. |
| `status` | string | One of `pending`, `approved`, `rejected`, `paid`. |
| `reviewed_by` | string (uuid) \| null | Admin who reviewed the request. |
| `reviewed_at` | string (iso date) \| null | When it was reviewed. |
| `rejection_reason` | string \| null | Why it was rejected, when the admin gave a reason. |
| `created_at` | string (iso date) | When the request was made. |

```json
{
  "success": true,
  "data": {
      "cz_withdrawal_request_id": "9c1e5f30-77aa-4d21-8b6f-3e02a4d19b55",
      "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
      "amount_coins": 5000,
      "amount_usd": "5.00",
      "method": "paypal",
      "destination_details_encrypted": "9f2c...:8a11...:c4d7...",
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "rejection_reason": null,
      "created_at": "2026-08-27T09:02:41.000Z"
    }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDWLT004` | This amount is below the minimum withdrawal. | The amount is below the `min_withdrawal_coins` setting. | `BelowMinimumWithdrawalIcon` |
| 403 | `CZDWLT007` | Please complete identity verification before withdrawing. | The `withdrawal_requires_kyc` setting is on and the user is not `verified`. | `KycRequiredIcon` |
| 409 | `CZDWLT009` | You already have a withdrawal being reviewed. | The user already has a withdrawal in `pending`. | `WithdrawalPendingIcon` |
| 400 | `CZDWLT002` | You do not have enough coins for this. | The coin balance is lower than `amount_coins`. | `InsufficientCoinsIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDWLT004",
  "cz_error_message": "This amount is below the minimum withdrawal.",
  "cz_error_description": "amount_coins is under the min_withdrawal_coins setting.",
  "cz_error_icon": "BelowMinimumWithdrawalIcon",
  "statusCode": 400,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `method` | `paypal`, `bank`, `crypto` | — |
| `status` | `pending`, `approved`, `rejected`, `paid` | — |

## Example

```bash
curl -X POST http://localhost:4000/api/wallet/withdrawals \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{
    "amount_coins": 5000,
    "method": "paypal",
    "destination_details": { "paypal_email": "user@coinzu.app" }
  }'
```

## Notes

- The coins are debited immediately, so the user cannot spend the same balance twice while the request waits. A rejection credits them back.
- `destination_details` is encrypted with AES-256-GCM using `ENCRYPTION_KEY`; only the payout operator decrypts it.
- Only one `pending` request is allowed at a time. Wait for the review before asking again.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
