# GET /api/wallet/transactions

Lists the wallet ledger of the signed-in user, newest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/wallet/transactions` |
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
| `data` | object[] | Ledger rows on this page. |
| `data[].cz_wallet_transaction_id` | string (uuid) | Primary key of the ledger row. |
| `data[].user_id` | string (uuid) | Owner of the wallet. |
| `data[].currency` | string | `coin` or `gem`. |
| `data[].type` | string | One of `earn`, `spend`, `withdrawal`, `convert_in`, `convert_out`, `reversal`. |
| `data[].amount` | number | Signed change. Positive credits, negative debits. |
| `data[].balance_after` | number | Balance snapshot right after this row was written. |
| `data[].source_type` | string | What caused the movement: `offer`, `daily_checkin`, `referral`, `game`, `streak`, `withdrawal`, `redeem`, `lucky_draw`, `achievement`, `challenge`, `convert`, `admin_adjustment` or `offerwall`. |
| `data[].source_id` | string (uuid) \| null | Primary key of the row that caused it, when there is one. |
| `data[].note` | string \| null | Human-readable context, safe to render straight into the ledger row. For `offer` rows this is the offer title, plus the milestone after a colon when the offer pays in steps — `"Coin Master — reach level 25: Reach level 10"`. For `offerwall` rows it is the partner name plus the offer name — `"AdGate Media - Complete a survey"`. A reversal on either path is prefixed `"Reversed: "`. `null` for movements that don't need one. |
| `data[].created_at` | string (iso date) | When the movement happened. |
| `total` | number | Total ledger rows for this user. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_wallet_transaction_id": "4b18d0c7-5a2e-4f19-9c33-71a0e6b2f8de",
        "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
        "currency": "coin",
        "type": "earn",
        "amount": 250,
        "balance_after": 12450,
        "source_type": "offer",
        "source_id": "6d3a91f2-0c48-4b7d-a5e1-9f2b7c60d413",
        "note": null,
        "created_at": "2026-08-27T08:59:11.000Z"
      },
      {
        "cz_wallet_transaction_id": "b6e8f3a1-2c19-4e7a-9b5d-3f0c8a61d2e7",
        "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
        "currency": "coin",
        "type": "earn",
        "amount": 500,
        "balance_after": 12950,
        "source_type": "offerwall",
        "source_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "note": "AdGate Media - Complete a survey",
        "created_at": "2026-08-27T09:10:02.000Z"
      },
      {
        "cz_wallet_transaction_id": "1a2d9c60-7b3e-4f5a-8e21-6d0b9c4f7a12",
        "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
        "currency": "coin",
        "type": "reversal",
        "amount": -500,
        "balance_after": 12450,
        "source_type": "offerwall",
        "source_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "note": "Reversed: AdGate Media - Complete a survey",
        "created_at": "2026-08-27T10:02:44.000Z"
      }
    ],
    "total": 137
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
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `currency` | `coin`, `gem` | — |
| `source_type` | `offer`, `daily_checkin`, `referral`, `game`, `streak`, `withdrawal`, `redeem`, `lucky_draw`, `achievement`, `challenge`, `convert`, `admin_adjustment`, `offerwall` | Says which feature moved the balance. |
| `type` | `earn`, `spend`, `withdrawal`, `convert_in`, `convert_out`, `reversal` | `reversal` is a debit written when an advertiser reverses an offerwall conversion that was already credited. |

## Example

```bash
curl 'http://localhost:4000/api/wallet/transactions?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes
- `source_type` separates the two earning paths: `offer` is Coinzu's own offer catalogue and `offerwall` is a third-party network. Both credit coins the same way and both carry a `note`, so the ledger reads identically to the user.
- An offer that pays in milestones writes **one row per milestone**, each with its own `note` and `source_id`, not a single row at the end.

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- The ledger is append-only. Rows are never edited or deleted, so a balance can always be replayed from it.
- A conversion writes two rows: one `convert_out` and one `convert_in`.
- **This is the only user-facing surface for offerwall earnings** — there is no separate offerwall summary endpoint. A credited offerwall postback shows up here as a `source_type: "offerwall"` row with `note` set to the partner name plus the offer name (or, for a multi-step offer, phrased as completing that milestone). Admins get the full postback audit trail from [062](../admin/009offerwall.postbacks.list.md) instead.
- When an advertiser reverses a conversion, the original `credited` row is not touched — the user instead sees a separate `type: "reversal"` debit row for the same `source_id`, with `note` prefixed `"Reversed: "`. This is the entry that explains the balance drop.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
