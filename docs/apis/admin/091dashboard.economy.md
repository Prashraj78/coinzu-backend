# GET /api/admin/dashboard/economy

The money view of Coinzu for a date range: coins and gems in and out, where they came from and went, revenue against reward cost, gift cards, withdrawals, outstanding balances and a daily trend. Powers the Economy section of the admin Dashboard.

## Overview

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/dashboard/economy` |
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
| `date_from` | string (`YYYY-MM-DD`) | no | First UTC day included. Defaults to today. |
| `date_end` | string (`YYYY-MM-DD`) | no | Last UTC day included. Defaults to today. Swapped with `date_from` if earlier; the range is capped at 366 days. |

### Body

None.

```json
{ }
```

## Response

### Success — `200`

Every USD value uses today's `coins_per_usd` and `coins_per_gem`.

| Field | Type | Description |
|---|---|---|
| `range` | object | `date_from`, `date_end` (UTC days used) and `days`. |
| `rates` | object | `coins_per_usd`, `coins_per_gem`. |
| `summary.revenue_usd` | number | What partner networks paid for completed offers (ledger `revenue_usd`). |
| `summary.tracked_conversions` | integer | Ledger rows carrying revenue. |
| `summary.rewards_usd` | number | Value of every coin and gem rewarded (type `earn`, refunds excluded). |
| `summary.offer_rewards_usd` / `promo_rewards_usd` | number | Rewards for offers (`rewardtym`, `offer`, `offerwall`) vs everything else. |
| `summary.profit_usd` | number | `revenue_usd − rewards_usd`. |
| `summary.offer_margin_usd` | number | `revenue_usd − offer_rewards_usd`. |
| `summary.cash_out_usd` | number | `gift_cards_usd` (fulfilled orders) + `withdrawals_paid_usd`. |
| `summary.acquisition_usd` | number | Joining bonus + referral rewards. |
| `summary.cost_per_new_user_usd` | number | `acquisition_usd / users.new_signups`. |
| `summary.reversed_usd` | number | Value clawed back by reversals. |
| `coins` / `gems` | object | `earned` (rewards) and `spent` (net spending) totals. |
| `rewards[]` | array | One row per program that handed out coins or gems: `key`, `label`, `coins`, `gems`, `usd`, `users`, `transactions`. Games are split by game (`spin`, `scratch`, `game:<reward game title>`, `game` for older or unlinked rows). Sorted by `usd`. |
| `spending[]` | array | Same shape, for coins and gems users spent (gift cards, withdrawals, draw entries, gem conversion), net of refunds. |
| `users` | object | `new_signups`, `active` (any wallet movement), `earners` (completed a paid offer). |
| `gift_cards` | object | `orders`, `fulfilled`, `pending`, `failed`, `value_usd`. |
| `withdrawals` | object | `requests`, `pending`, `paid`, `requested_usd`, `paid_usd`. |
| `liability` | object | Coins and gems in all wallets now (not range-limited), `wallets` with a balance, `usd`. |
| `daily[]` | array | Per UTC day: `revenue_usd`, `rewards_usd`, `coins_earned`, `coins_spent`, `signups`. Covers the range, or the last 14 days when the range is shorter. |

```json
{
  "success": true,
  "data": {
    "range": { "date_from": "2026-08-14", "date_end": "2026-11-11", "days": 90 },
    "rates": { "coins_per_usd": 1000, "coins_per_gem": 0.025 },
    "summary": { "revenue_usd": 0, "tracked_conversions": 0, "rewards_usd": 43.06, "offer_rewards_usd": 20, "promo_rewards_usd": 23.06, "profit_usd": -43.06, "offer_margin_usd": -20, "cash_out_usd": 2.4, "gift_cards_usd": 2.4, "withdrawals_paid_usd": 0, "acquisition_usd": 0.3, "cost_per_new_user_usd": 0.02, "reversed_usd": 0 },
    "coins": { "earned": 42753, "spent": 2400 },
    "gems": { "earned": 12250, "spent": 8250 },
    "rewards": [{ "key": "offerwall", "label": "Offerwalls", "coins": 19996, "gems": 0, "usd": 20, "users": 5, "transactions": 40 }],
    "spending": [{ "key": "redeem", "label": "Gift cards", "coins": 2400, "gems": 0, "usd": 2.4, "users": 3, "transactions": 9 }],
    "users": { "new_signups": 13, "active": 12, "earners": 0 },
    "gift_cards": { "orders": 9, "fulfilled": 3, "pending": 0, "failed": 6, "value_usd": 2.4 },
    "withdrawals": { "requests": 0, "pending": 0, "paid": 0, "requested_usd": 0, "paid_usd": 0 },
    "liability": { "coins": 40486, "gems": 4200, "wallets": 12, "usd": 40.59 },
    "daily": [{ "date": "2026-11-11", "revenue_usd": 0, "rewards_usd": 11.05, "coins_earned": 11000, "coins_spent": 0, "signups": 1 }]
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `date_from` or `date_end` is not a `YYYY-MM-DD` date. | `ValidationFailedIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "statusCode": 400
}
```

## Enum values

`rewards[].key` / `spending[].key`: `welcome_bonus`, `referral`, `rewardtym`, `offer`, `offerwall`, `spin`, `scratch`, `game:<reward game title>`, `game`, `daily_checkin`, `streak`, `challenge`, `achievement`, `lucky_draw`, `admin_adjustment`, `redeem`, `withdrawal`, `convert`.

## Notes

- Revenue is stored per RewardTym conversion (`publisher_payout_usd` from the webhook) from the `1801100000000-ledger-revenue` migration onward; earlier conversions report no revenue.
- All days are UTC.
