# PUT /api/admin/daily/scratch-cards

Replaces the whole scratch prize pool in one transaction.

## Overview

| Item | Value |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/daily/scratch-cards` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `cards` | object[] | yes | 2–20 entries. | The whole pool. |
| `cards[].label` | string | yes | 1–60 characters. | Printed on the card. |
| `cards[].reward_coins` | integer | yes | 0–100,000,000. | The **minimum** coins it pays. |
| `cards[].reward_coins_max` | integer | no | 0–100,000,000. | The maximum. Omit for an exact payout. |
| `cards[].reward_gems` | integer | yes | 0–100,000,000. | The minimum gems. |
| `cards[].reward_gems_max` | integer | no | 0–100,000,000. | The maximum gems. |
| `cards[].probability_weight` | number | yes | 0–1,000,000. | Relative weight. |
| `cards[].min_medal_rarity` | string | no | See [Enum values](#enum-values). | Gate it behind a medal tier. Omit for everyone. |
| `cards[].is_active` | boolean | no | Default `true`. | Inactive prizes are never drawn. |

```json
{
  "cards": [
    { "label": "Coin drop", "reward_coins": 25, "reward_coins_max": 250, "reward_gems": 0, "probability_weight": 34 },
    { "label": "2000 coins", "reward_coins": 2000, "reward_gems": 0, "probability_weight": 3, "min_medal_rarity": "epic" },
    { "label": "Better luck", "reward_coins": 0, "reward_gems": 0, "probability_weight": 10 }
  ]
}
```

## Response

### Success — `200`

Identical to `GET /api/admin/daily/scratch-cards`.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | Fewer than 2 or more than 20 prizes, an unknown rarity, a field out of range, or **every active prize gated behind a medal**. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "At least one active prize must be open to everyone, or an unmedalled user could never win.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T06:50:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `cards[].min_medal_rarity` | `common`, `rare`, `epic`, `rarest` | Omit entirely for a prize everyone can win. |

## Example

```bash
curl -X PUT "$BASE/admin/daily/scratch-cards" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "cards": [ { "label": "25 coins", "reward_coins": 25, "reward_gems": 0, "probability_weight": 34 }, ...more ] }'
```

## Notes

- **All or nothing**, in a transaction — a rejected payload leaves the old pool untouched.
- **Send every prize, every time.** This is a `PUT`; anything omitted is deleted, and ids are regenerated on each save.
- **A range makes each card pay a random amount**, drawn server-side at scratch time — the card is hidden until scratched, so there is nothing to contradict. A max at or below its min is dropped, turning the prize back into an exact payout.
- **Name the prize, not the band.** `label` is printed on the revealed card, so `Coin drop` reads better than `25-250`; the real figure comes back in `reward_coins`.
- **At least one active prize must be ungated.** Otherwise a user with no medal would draw from an empty pool and could never win — the save is refused rather than shipping that.
- Gating changes who can win a prize, not its weight. For gated users the remaining weights re-normalise automatically at draw time.
