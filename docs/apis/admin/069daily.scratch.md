# GET /api/admin/daily/scratch-cards

The scratch prize pool with real odds, and which prizes are gated behind a medal tier.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/daily/scratch-cards` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_scratch_card_id` | string (uuid) | Primary key. Regenerated on every save. |
| `data[].label` | string | Printed on the card. |
| `data[].reward_coins` | integer | The **minimum** coins it pays. |
| `data[].reward_coins_max` | integer | The maximum. Equal to `reward_coins` when the prize pays an exact amount. |
| `data[].reward_gems` | integer | The minimum gems. |
| `data[].reward_gems_max` | integer | The maximum gems. |
| `data[].is_range` | boolean | `true` when either payout is a band. |
| `data[].probability_weight` | number | Relative weight, not a percentage. |
| `data[].chance_pct` | number | The weight as a percentage of the active pool. |
| `data[].min_medal_rarity` | string \| null | Only users whose best medal reaches this tier can win it. `null` means everyone. |
| `data[].is_active` | boolean | Inactive prizes are never drawn. |
| `total` | integer | Prizes, active or not. |
| `summary.active_prizes` | integer | Prizes in the draw. |
| `summary.total_weight` | number | Sum of active weights. |
| `summary.total_scratches` | integer | Cards scratched ever. |
| `summary.gated_prizes` | integer | Active prizes behind a medal tier. |
| `summary.range_prizes` | integer | Active prizes that pay a random amount inside a band. |
| `summary.expected_coins` | integer | What a card pays on average at these odds. A range counts as its midpoint. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_scratch_card_id": "8b1c2d3e-4f5a-4b6c-9d7e-0f1a2b3c4d5e",
        "label": "2000 coins",
        "reward_coins": 2000,
        "reward_coins_max": 2000,
        "reward_gems": 0,
        "reward_gems_max": 0,
        "is_range": false,
        "probability_weight": 3,
        "chance_pct": 3,
        "min_medal_rarity": "epic",
        "is_active": true
      }
    ],
    "total": 6,
    "summary": {
      "active_prizes": 6,
      "total_weight": 100,
      "total_scratches": 0,
      "gated_prizes": 1,
      "range_prizes": 1,
      "expected_coins": 193
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
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
  "timestamp": "2026-08-30T06:47:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].min_medal_rarity` | `common`, `rare`, `epic`, `rarest`, or `null` | The tier a user's **best** medal must reach. `null` means the prize is open to everyone. |

## Example

```bash
curl "$BASE/admin/daily/scratch-cards" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **`chance_pct` is the pool-wide figure, not what any one user sees.** A gated prize is dropped from the pool for users who do not reach its tier, and the remaining weights re-normalise — so a user with no medal has better odds on the ungated prizes than this table suggests.
- **The medal gate is how "odds based on the medal" works**: better medals open richer prizes rather than changing the weights themselves. A user's best medal is the rarest one they hold.
- **A prize can pay a band, and this is the only place bands exist.** With `reward_coins_max` above `reward_coins`, every card that lands on it draws a fresh random amount at scratch time — `is_range` marks those. `scratch_history` stores what was actually paid, not the band. The wheel has no equivalent: a wedge shows its value before the spin, so it pays exactly that.
- **The label is printed on the revealed card, so keep the band out of it.** A caption like `25-250` tells the user the mechanic instead of the prize; name it `Coin drop` and let `reward_coins` carry the figure.
- **`summary.expected_coins` is what one card costs on average**, across the ungated pool. A user with a good medal draws from a richer pool, so their real average is higher than this figure.
- A prize paying nothing is normal — give it zero rewards and a label like "Better luck".
- **This pool decides what a won card is worth, not how many cards exist.** A card is only ever won by answering the day's quiz correctly — there is no free allowance and no other source — so the number of cards played is bounded by how many users get the quiz right.
