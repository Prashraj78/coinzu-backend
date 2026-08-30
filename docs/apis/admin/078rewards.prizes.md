# GET /api/admin/rewards/games/:cz_reward_game_id/prizes

The prize ladder for a draw, or the wheel face for an instant game. One table serves both.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/rewards/games/:cz_reward_game_id/prizes` |
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
| `cz_reward_game_id` | string (uuid) | yes | The reward. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_reward_prize_id` | string (uuid) | Primary key. Regenerated on every save. |
| `data[].rank` | integer | 1 is the top prize. Already sorted. |
| `data[].label` | string | e.g. `1st Prize`, or a wheel caption. |
| `data[].reward_coins` / `.reward_gems` | integer | What it shows, or pays. |
| `data[].probability_weight` | number \| null | Instant games only. `null` on a draw. |
| `data[].chance_pct` | number \| null | The weight as a real percentage. `null` on a draw. |
| `data[].is_active` | boolean | Inactive rows are neither shown nor drawn. |
| `game` | object | The reward this belongs to, same shape as the games list. |
| `summary.active_prizes` | integer | Rows in play. |
| `summary.total_weight` | number | Sum of active weights. `0` on a draw. |
| `summary.expected_coins` | integer | **Instant games:** what one play pays on average. `0` on a draw. |
| `summary.top_prize_coins` | integer | The biggest single payout. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_reward_prize_id": "…",
        "rank": 1,
        "label": "10 Coins",
        "reward_coins": 10,
        "reward_gems": 0,
        "probability_weight": 30,
        "chance_pct": 30,
        "is_active": true
      }
    ],
    "total": 7,
    "game": { "slug": "wheel_of_fortune", "kind": "instant", "title": "Wheel of Fortune" },
    "summary": {
      "active_prizes": 7,
      "total_weight": 100,
      "expected_coins": 244,
      "top_prize_coins": 5000
    }
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
  "timestamp": "2026-08-30T12:16:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields beyond `game.kind` (`instant`, `draw`).

## Example

```bash
curl "$BASE/admin/rewards/games/$GAME_ID/prizes" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **The two kinds use the same table for different jobs.** On an **instant** game these rows are the wheel: each carries a `probability_weight` and one is drawn per play. On a **draw** they are a display ladder — a ranked list the app shows as "what you could win" — and the money actually paid comes from the [payout rules](080rewards.rules.md) instead.
- **`expected_coins` is the cost of one spin to the business.** Compare it against the game's `entry_cost_gems` (converted at the configured rate) to see whether the wheel makes or loses money.
- **`chance_pct` is derived, never stored.** Weights are relative and need not add to 100.
- **The user-facing detail response sends the labels and amounts but never the weights**, so the odds stay here.
- Prize ids are regenerated on every save, so never store one.
