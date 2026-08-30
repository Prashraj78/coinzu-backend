# GET /api/admin/daily/challenges

The five daily tiles, the master chest, and how the last week went. The Daily Challenges tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/daily/challenges` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None. The board is a fixed handful of tiles.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_daily_challenge_id` | string (uuid) | Primary key. |
| `data[].type` | string | Which tile. See [Enum values](#enum-values). |
| `data[].title` | string | Shown on the tile. |
| `data[].description` | string \| null | The line under the title. |
| `data[].icon_url` | string \| null | Tile artwork. |
| `data[].action` | string \| null | Where a tap sends the app. |
| `data[].target_count` | integer | How many actions finish it. |
| `data[].reward_coins` | integer | Coins for finishing it. |
| `data[].reward_gems` | integer | Gems for finishing it. |
| `data[].display_order` | integer | Board order. |
| `data[].is_active` | boolean | Inactive tiles are off the board. |
| `data[].completions_today` | integer | Users who finished it today. |
| `data[].completions_7d` | integer | Users who finished it in the last 7 days. |
| `total` | integer | Tiles, active or not. |
| `chest.reward_coins` | integer | The `daily_chest_coins` setting. |
| `chest.reward_gems` | integer | The `daily_chest_gems` setting. |
| `chest.claims_7d` | integer | Chests taken in the last 7 days. |
| `config.chest_coins` | integer | Coins the chest pays. Editable via `PATCH /api/admin/daily/config`. |
| `config.chest_gems` | integer | Gems the chest pays. |
| `config.spin_limit` | integer | Always `1`. Fixed in code, not editable. |
| `config.scratch_source` | string | Always `"quiz"` — a card is only won by answering the quiz correctly. |
| `summary.active_challenges` | integer | Tiles on the board. |
| `summary.max_daily_coins` | integer | Every active tile plus the chest. |
| `summary.max_daily_gems` | integer | The same in gems. |
| `summary.completions_7d` | integer | Every completion in the last 7 days. |
| `summary.scheduled_quizzes` | integer | Quizzes scheduled today or later. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_daily_challenge_id": "0f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f",
        "type": "spin",
        "title": "Spin the Lucky Wheel",
        "description": "Spin the wheel 1 time",
        "icon_url": null,
        "action": "spin",
        "target_count": 1,
        "reward_coins": 50,
        "reward_gems": 0,
        "display_order": 1,
        "is_active": true,
        "completions_today": 1,
        "completions_7d": 1
      }
    ],
    "total": 5,
    "chest": { "reward_coins": 1000, "reward_gems": 1000, "claims_7d": 0 },
    "config": {
      "chest_coins": 1000,
      "chest_gems": 1000,
      "spin_limit": 1,
      "scratch_source": "quiz"
    },
    "summary": {
      "active_challenges": 5,
      "max_daily_coins": 1500,
      "max_daily_gems": 1030,
      "completions_7d": 2,
      "scheduled_quizzes": 16
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
  "timestamp": "2026-08-30T06:41:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].type` | `spin`, `quiz`, `game_install`, `invite`, `offer`, `scratch`, `checkin` | The board uses the first five; the last two exist in the schema but are inactive. |
| `data[].action` | `spin`, `quiz`, `offers`, `referrals`, `games` | Where a tap goes in the app. |

## Example

```bash
curl "$BASE/admin/daily/challenges" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- The chest amounts come back under `config`, and are changed through [`PATCH /api/admin/daily/config`](064daily.config.md). They are **not** in the settings catalogue — `PATCH /api/admin/settings` rejects them.
- `summary.max_daily_coins` is the figure the app shows as "win up to". It counts active tiles only, plus the chest.
- `completions_7d` counts progress rows that reached `completed` or `claimed`; a tile someone started but did not finish is not counted.
- Deactivating a tile removes it from every user's board immediately, including today's. Progress already recorded is kept.
