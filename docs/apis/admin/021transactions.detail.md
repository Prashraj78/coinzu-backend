# GET /api/admin/transactions/:cz_wallet_transaction_id

One wallet movement with the user it belongs to, their live balance, and the row that caused it — the detail page a Transactions tab row opens.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/transactions/:cz_wallet_transaction_id` |
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
| `cz_wallet_transaction_id` | string (uuid) | yes | From a `GET /api/admin/transactions` row. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `transaction.cz_wallet_transaction_id` | string (uuid) | Primary key of the ledger row. |
| `transaction.currency` | string | `coin` or `gem`. |
| `transaction.type` | string | The movement type. |
| `transaction.amount` | number | Signed change. Positive credits, negative debits. |
| `transaction.balance_after` | number | Balance snapshot at the moment this row was written. |
| `transaction.source_type` | string | What caused the movement. |
| `transaction.source_id` | string (uuid) \| null | Primary key of the causing row, when there is one. |
| `transaction.note` | string \| null | Human-readable context. |
| `transaction.created_at` | string (date-time) | When the movement happened. |
| `user.cz_user_id` | string (uuid) | Whose wallet moved. Open their profile at `GET /api/admin/users/:cz_user_id`. |
| `user.email` | string | Their email. |
| `user.name` | string \| null | Their display name. |
| `user.avatar_url` | string \| null | Their profile photo. |
| `wallet_now.coin_balance` | number | The user's coin balance **today**, for comparison against `transaction.balance_after`. |
| `wallet_now.gem_balance` | number | The user's gem balance today. |
| `source` | object \| null | The row that caused the movement. `null` when `source_id` is null or the source type carries no linkable row. Its shape depends on `source.kind` — see below. |

#### `source.kind: "offer_completion"`

Coinzu's own offers, credited by `GET|POST /api/offers/postback/:provider_id`.

| Field | Type | Description |
|---|---|---|
| `source.cz_offer_completion_id` | string (uuid) | The completion row. |
| `source.offer_title` | string \| null | The offer the user completed. `null` only if the offer row was deleted. |
| `source.goal_id` | string \| null | The milestone the provider named, when the offer pays in steps. `null` for a single-payout offer. |
| `source.goal_title` | string \| null | That milestone's title from `offers.goals`. `null` when the offer has no matching goal entry. |
| `source.external_transaction_id` | string | The provider's own transaction id. |
| `source.payout_coins` | number | Coins this completion paid. |
| `source.status` | string | Completion state. |
| `source.credited_at` | string (date-time) \| null | When the coins landed. `null` while still pending. |
| `source.created_at` | string (date-time) | When the postback arrived. |

#### `source.kind: "offerwall_postback"`

| Field | Type | Description |
|---|---|---|
| `source.cz_offerwall_postback_id` | string (uuid) | The postback row. |
| `source.partner_name` | string | Offerwall network that reported the conversion. |
| `source.offer_name` | string \| null | The offer the user completed. |
| `source.external_transaction_id` | string | The partner's own transaction id. |
| `source.coins_credited` | number | Coins the postback credited. |
| `source.status` | string | Delivery outcome. |
| `source.created_at` | string (date-time) | When the postback arrived. |

#### `source.kind: "withdrawal_request"`

| Field | Type | Description |
|---|---|---|
| `source.cz_withdrawal_request_id` | string (uuid) | The payout request. |
| `source.amount_coins` | number | Coins taken out of the wallet. |
| `source.amount_usd` | string | Cash value, two decimals exact. |
| `source.method` | string | How the user is paid. |
| `source.status` | string | Review state. |
| `source.rejection_reason` | string \| null | Why it was rejected, when it was. |
| `source.created_at` | string (date-time) | When it was requested. |

#### `source.kind: "gift_card_order"`

| Field | Type | Description |
|---|---|---|
| `source.cz_gift_card_order_id` | string (uuid) | The order. |
| `source.price_coins` | number | Coins charged. |
| `source.status` | string | Fulfilment state. |
| `source.failure_reason` | string \| null | Why a `failed` order failed. |
| `source.created_at` | string (date-time) | When it was placed. |

```json
{
  "success": true,
  "data": {
    "transaction": {
      "cz_wallet_transaction_id": "9ebe339a-89b0-4a9a-bce7-268439611263",
      "currency": "coin",
      "type": "earn",
      "amount": 4100,
      "balance_after": 13050,
      "source_type": "offerwall",
      "source_id": "894d32b4-21b6-4418-aa4c-e4b8477c50d6",
      "note": "AdGate Media - Subscribe to a streaming trial",
      "created_at": "2026-08-21T10:30:00.000Z"
    },
    "user": {
      "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
      "email": "prashantrajputaaaa@gmail.com",
      "name": "Prashant",
      "avatar_url": null
    },
    "wallet_now": { "coin_balance": 8750, "gem_balance": 2000 },
    "source": {
      "kind": "offerwall_postback",
      "cz_offerwall_postback_id": "894d32b4-21b6-4418-aa4c-e4b8477c50d6",
      "partner_name": "AdGate Media",
      "offer_name": "Subscribe to a streaming trial",
      "external_transaction_id": "seed-5-812733",
      "coins_credited": 4100,
      "status": "credited",
      "created_at": "2026-08-21T10:30:00.000Z"
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDWLT010` | We could not find that transaction. | No `wallet_transactions` row exists for the given id. | `WalletNotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDWLT010",
  "cz_error_message": "We could not find that transaction.",
  "cz_error_description": "No wallet_transactions row exists for the given id.",
  "cz_error_icon": "WalletNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T06:26:06.810Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `transaction.currency` | `coin`, `gem` | |
| `transaction.type` | `earn`, `spend`, `withdrawal`, `convert_in`, `convert_out`, `reversal` | |
| `transaction.source_type` | `offer`, `daily_checkin`, `referral`, `game`, `streak`, `withdrawal`, `redeem`, `lucky_draw`, `achievement`, `challenge`, `convert`, `admin_adjustment`, `offerwall` | |
| `source.kind` | `offer_completion`, `offerwall_postback`, `withdrawal_request`, `gift_card_order` | Absent when `source` is `null`. |
| `source.status` (offer) | `pending`, `approved`, `reversed` | |
| `source.status` (offerwall) | `credited`, `reversed`, `duplicate`, `invalid_secret`, `user_not_found`, `invalid_payload` | |
| `source.method` (withdrawal) | `paypal`, `bank`, `crypto` | |
| `source.status` (withdrawal) | `pending`, `approved`, `rejected`, `paid` | |
| `source.status` (gift card) | `pending`, `fulfilled`, `failed` | |

## Example

```bash
curl "$BASE/admin/transactions/9ebe339a-89b0-4a9a-bce7-268439611263" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- `source` is resolved for `offer`, `offerwall`, `withdrawal` and `redeem` movements. Every other `source_type` returns `null` — those movements are fully described by `type`, `amount` and `note`, with no separate row to open.
- `offer` and `offerwall` are two different earning paths and both are first-class here. `offer` is Coinzu's own offer catalogue, credited through `/api/offers/postback/:provider_id`; `offerwall` is a third-party network posting back through `/api/offerwall/postback/:slug/:token`. They resolve to different `source.kind` values and are counted separately in `earning_summary.by_source`.
- A `source_id` that points at a deleted row also returns `null` rather than erroring.
- `transaction.balance_after` is historical and `wallet_now` is live; showing both is how the panel makes an old row make sense.
- `source.amount_usd` is a string so its two decimals stay exact. Never parse it into a float for display.
- A withdrawal's `destination_details_encrypted` is deliberately **not** returned — payout account details stay encrypted and are never exposed to the panel.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
