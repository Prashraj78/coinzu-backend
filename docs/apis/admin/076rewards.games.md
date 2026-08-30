# GET /api/admin/rewards/games

Every reward card with its configuration and its live figures. The Rewards tab's first screen.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/rewards/games` |
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
| `data[].cz_reward_game_id` | string (uuid) | Primary key. |
| `data[].slug` | string | Stable key the app addresses it by. Not editable. |
| `data[].kind` | string | `instant` or `draw`. Not editable — it decides the whole mechanic. |
| `data[].cadence` | string | `none`, `daily` or `weekly`. |
| `data[].title` / `.subtitle` / `.icon_url` | — | What the card shows. |
| `data[].headline_prize_coins` | integer | The big number. Display only. |
| `data[].entry_cost_gems` | integer | Gems per entry, or per play. |
| `data[].min_entries` / `.max_entries` | integer | Bounds on one purchase. |
| `data[].entry_packs` | integer[] | Quick-pick buttons on Buy Entries. |
| `data[].how_it_works` | object[] | The explainer strip. |
| `data[].terms_url` | string \| null | Behind the T&C link. |
| `data[].status` | string | `live`, `coming_soon` or `paused`. |
| `data[].prize_count` / `.rule_count` | integer | How much is configured. |
| `data[].open_draw` | object \| null | The running instance: period, deadline, turnout, pot. |
| `data[].total_plays` / `.total_entries` / `.total_players` | integer | Lifetime. |
| `data[].gems_collected` / `.coins_paid` | integer | Lifetime. |
| `summary.live_games` / `.coming_soon` | integer | Card counts. |
| `summary.gems_collected` / `.coins_paid` | integer | Lifetime across everything. |
| `summary.open_draws` | integer | Draw instances currently accepting entries. |
| `summary.draws_missing` | integer | **Live draw games with no open instance.** Should be 0. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_reward_game_id": "…",
        "slug": "daily_lucky_draw",
        "kind": "draw",
        "cadence": "daily",
        "title": "Daily Lucky Draw",
        "subtitle": "Win up to 5,000 Coins",
        "headline_prize_coins": 5000,
        "entry_cost_gems": 10,
        "min_entries": 1,
        "max_entries": 250,
        "entry_packs": [5, 10, 25, 50, 100, 250],
        "status": "live",
        "prize_count": 4,
        "rule_count": 5,
        "open_draw": {
          "cz_lucky_draw_id": "…",
          "period_key": "2026-08-31",
          "draw_date": "2026-09-01T00:00:00.000Z",
          "participants_count": 0,
          "entries_count": 0,
          "prize_pool_coins": 500
        },
        "total_plays": 0,
        "total_entries": 56,
        "total_players": 7,
        "gems_collected": 560,
        "coins_paid": 0
      }
    ],
    "total": 4,
    "summary": {
      "live_games": 3,
      "coming_soon": 1,
      "gems_collected": 610,
      "coins_paid": 220,
      "open_draws": 2,
      "draws_missing": 0
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
  "timestamp": "2026-08-30T12:12:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].kind` | `instant`, `draw` | Fixed per game. |
| `data[].cadence` | `none`, `daily`, `weekly` | `none` on an instant game. |
| `data[].status` | `live`, `coming_soon`, `paused` | Only `live` is playable. |

## Example

```bash
curl "$BASE/admin/rewards/games" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **`summary.draws_missing` is the one to watch.** A live draw game with no open instance cannot be entered by anybody — the card is visible but dead. Run [`POST /api/admin/rewards/draws/run`](083rewards.draws.run.md) to open one.
- **`kind` and `slug` are not editable.** The slug is the app's address for the card, and the kind decides whether it is played or entered. Changing either would break a shipped client.
- **`headline_prize_coins` is marketing copy, not a payout.** What a draw actually pays comes from the [payout rules](080rewards.rules.md); what a wheel pays comes from the [prizes](078rewards.prizes.md).
- **Setting a game to `paused` hides it from the app entirely** — it is filtered out of the user's list rather than shown greyed. Use `coming_soon` for a card you want visible but unplayable.
- `gems_collected` and `coins_paid` are lifetime figures, so a paused game still shows what it did. Use the [dashboard](075rewards.dashboard.md) for a date range.
