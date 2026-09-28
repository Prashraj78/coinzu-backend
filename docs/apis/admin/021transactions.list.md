# GET /api/admin/transactions

Every wallet movement across every user — earnings, conversions, withdrawals, redeems and reversals — in one filterable list. The Transactions tab table.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/transactions` |
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
| `search` | string | no | Case-insensitive substring match against the user's `email`, the user's `name`, or the row's `note`. |
| `cz_user_id` | string (uuid) | no | Only this user's ledger. |
| `currency` | string | no | `coin` or `gem`. |
| `type` | string | no | One movement type. See [Enum values](#enum-values). |
| `source_type` | string | no | What caused the movement. See [Enum values](#enum-values). |
| `date_from` | string (date) | no | Moved on/after this UTC date (inclusive), `yyyy-MM-dd`. |
| `date_end` | string (date) | no | Moved on/before this UTC date (inclusive), `yyyy-MM-dd`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_wallet_transaction_id` | string (uuid) | Use this to open `GET /api/admin/transactions/:cz_wallet_transaction_id`. |
| `data[].currency` | string | `coin` or `gem`. |
| `data[].type` | string | The movement type. |
| `data[].amount` | number | Signed change. Positive credits, negative debits. |
| `data[].balance_after` | number | Balance of that currency right after this row was written. |
| `data[].source_type` | string | What caused the movement. |
| `data[].source_id` | string (uuid) \| null | Primary key of the row that caused it, when there is one. |
| `data[].note` | string \| null | Human-readable context. For `offerwall` rows this is the partner name plus the offer name; a reversal is prefixed `"Reversed: "`. |
| `data[].created_at` | string (date-time) | When the movement happened. |
| `data[].user.cz_user_id` | string (uuid) | Whose wallet moved. |
| `data[].user.email` | string | Their email. |
| `data[].user.name` | string \| null | Their display name. |
| `data[].user.avatar_url` | string \| null | Their profile photo. |
| `total` | integer | Total rows matching the filters, all pages. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_wallet_transaction_id": "9ebe339a-89b0-4a9a-bce7-268439611263",
        "currency": "coin",
        "type": "earn",
        "amount": 4100,
        "balance_after": 13050,
        "source_type": "offerwall",
        "source_id": "894d32b4-21b6-4418-aa4c-e4b8477c50d6",
        "note": "AdGate Media - Subscribe to a streaming trial",
        "created_at": "2026-08-21T10:30:00.000Z",
        "user": {
          "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
          "email": "prashantrajputaaaa@gmail.com",
          "name": "Prashant",
          "avatar_url": null
        }
      }
    ],
    "total": 22
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A filter is not one of its allowed values, or a date is not `yyyy-MM-dd`. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH005",
  "cz_error_message": "Please sign in to continue.",
  "cz_error_description": "Authorization header is missing.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-29T06:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `currency` / `data[].currency` | `coin`, `gem` | |
| `type` / `data[].type` | `earn`, `spend`, `withdrawal`, `convert_in`, `convert_out`, `reversal` | A conversion writes two rows: `convert_out` on the currency spent, `convert_in` on the one received. |
| `source_type` / `data[].source_type` | `offer`, `daily_checkin`, `referral`, `game`, `streak`, `withdrawal`, `redeem`, `lucky_draw`, `achievement`, `challenge`, `convert`, `admin_adjustment`, `offerwall` | |

## Example

```bash
curl "$BASE/admin/transactions?page=1&limit=20&currency=coin&type=earn&source_type=offerwall&date_from=2026-08-01&date_end=2026-08-29" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Newest first. Every filter combines as `AND`; the dates filter on `created_at`, both inclusive, in UTC.
- The user is joined in so the table can show who moved without an N+1 — one query for the page, one for the count.
- A conversion appears as **two** rows, not one. Filter `source_type=convert` to see both halves of every swap.
- `balance_after` is a snapshot at write time, so an old row's value will not match the wallet's balance today. `GET /api/admin/transactions/:id` returns the live balance alongside it.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
