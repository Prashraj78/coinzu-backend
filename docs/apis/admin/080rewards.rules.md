# GET /api/admin/rewards/games/:cz_reward_game_id/payout-rules

How a draw's pot scales with turnout. This is the whole of "x participants pays out y", and it is the admin's to set.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/rewards/games/:cz_reward_game_id/payout-rules` |
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
| `cz_reward_game_id` | string (uuid) | yes | A draw game. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_reward_payout_rule_id` | string (uuid) | Primary key. Regenerated on every save. |
| `data[].min_participants` | integer | Inclusive floor for this band. |
| `data[].max_participants` | integer \| null | Derived: one below the next band's floor. `null` on the last. |
| `data[].prize_pool_coins` | integer | Coins shared across the winners. |
| `data[].winners_count` | integer | How many winners share it. |
| `data[].coins_per_winner` | integer | `prize_pool_coins / winners_count`, for reference. |
| `data[].is_active` | boolean | Inactive bands are skipped at settlement. |
| `game` | object | The reward this belongs to. |
| `summary.active_rules` | integer | Bands in play. |
| `summary.lowest_floor` | integer \| null | Should be `0`. |
| `summary.max_pool_coins` | integer | The biggest pot configured. |

```json
{
  "success": true,
  "data": {
    "data": [
      { "min_participants": 0, "max_participants": 9, "prize_pool_coins": 500, "winners_count": 1, "coins_per_winner": 500, "is_active": true },
      { "min_participants": 10, "max_participants": 49, "prize_pool_coins": 2000, "winners_count": 2, "coins_per_winner": 1000, "is_active": true },
      { "min_participants": 50, "max_participants": 249, "prize_pool_coins": 5000, "winners_count": 3, "coins_per_winner": 1666, "is_active": true },
      { "min_participants": 250, "max_participants": 999, "prize_pool_coins": 15000, "winners_count": 5, "coins_per_winner": 3000, "is_active": true },
      { "min_participants": 1000, "max_participants": null, "prize_pool_coins": 50000, "winners_count": 10, "coins_per_winner": 5000, "is_active": true }
    ],
    "total": 5,
    "game": { "slug": "daily_lucky_draw", "kind": "draw", "title": "Daily Lucky Draw" },
    "summary": { "active_rules": 5, "lowest_floor": 0, "max_pool_coins": 50000 }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDCOMM004` | We could not find what you were looking for. | No reward game exists with that id. | `NotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM004",
  "cz_error_message": "We could not find what you were looking for.",
  "cz_error_description": "No reward game exists with that id.",
  "cz_error_icon": "NotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-30T12:20:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl "$BASE/admin/rewards/games/$GAME_ID/payout-rules" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **The band whose floor the turnout clears wins, highest match first.** 7 players against the ladder above matches the `0+` band and pays 500 coins to one winner; 60 players matches `50+` and pays 5,000 across three.
- **This decides the money; the [prize ladder](078rewards.prizes.md) only decides the display.** The two are deliberately separate — the app can advertise "1st Prize 5,000 Coins" while a quiet day actually pays 500, because the pot is honest about turnout.
- **`max_participants` is derived, not stored.** It is always one below the next band's floor, so bands can never overlap or leave a gap.
- **The pot is split first-place-heavy** at settlement, weighted 3:2:1 and so on, with any rounding remainder going to first place.
- **Winners are capped at the number of players.** A band promising 10 winners on a day with 4 players pays 4.
- The pot the user sees live on the detail screen is computed with these same rules against the current turnout, so it climbs visibly as a band is crossed.
