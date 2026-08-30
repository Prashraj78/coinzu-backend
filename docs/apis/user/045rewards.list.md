# GET /api/rewards

The Rewards screen: every card, what it costs, what it heads with, and how long is left on it.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/rewards` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_reward_game_id` | string (uuid) | Primary key. |
| `data[].slug` | string | Stable key. **Use this in every other reward call**, never the uuid. See [Enum values](#enum-values). |
| `data[].kind` | string | `instant` plays at once; `draw` settles at the end of its period. |
| `data[].cadence` | string | `none`, `daily` or `weekly`. |
| `data[].title` | string | e.g. `Daily Lucky Draw`. |
| `data[].subtitle` | string \| null | e.g. `Win up to 5,000 Coins`. |
| `data[].icon_url` | string \| null | The card artwork, admin-managed. Handle `null`. |
| `data[].headline_prize_coins` | integer | The big number on the card. **Display only** — see the notes. |
| `data[].entry_cost_gems` | integer | Gems one entry, or one play, costs. |
| `data[].status` | string | See [Enum values](#enum-values). |
| `data[].is_playable` | boolean | `true` only when `status` is `live`. Gate the button on this. |
| `data[].ends_at` | string (date-time) \| null | When the open draw settles. `null` for an instant game. |
| `data[].seconds_remaining` | integer \| null | Seconds to `ends_at`. Drives the countdown. |
| `data[].my_entries` | integer | Entries the user holds in the open draw. |
| `data[].cz_lucky_draw_id` | string (uuid) \| null | The open draw, when there is one. |
| `data[].display_order` | integer | Card order. `data[]` is already sorted by it. |
| `total` | integer | Cards returned. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_reward_game_id": "a1b2c3d4-0000-4000-8000-000000000001",
        "slug": "wheel_of_fortune",
        "kind": "instant",
        "cadence": "none",
        "title": "Wheel of Fortune",
        "subtitle": "Spin as many times as you like",
        "icon_url": null,
        "headline_prize_coins": 5000,
        "entry_cost_gems": 10,
        "status": "live",
        "is_playable": true,
        "ends_at": null,
        "seconds_remaining": null,
        "my_entries": 0,
        "cz_lucky_draw_id": null,
        "display_order": 1
      },
      {
        "cz_reward_game_id": "a1b2c3d4-0000-4000-8000-000000000002",
        "slug": "daily_lucky_draw",
        "kind": "draw",
        "cadence": "daily",
        "title": "Daily Lucky Draw",
        "subtitle": "Win up to 5,000 Coins",
        "icon_url": null,
        "headline_prize_coins": 5000,
        "entry_cost_gems": 10,
        "status": "live",
        "is_playable": true,
        "ends_at": "2026-08-31T00:00:00.000Z",
        "seconds_remaining": 43140,
        "my_entries": 8,
        "cz_lucky_draw_id": "d720adca-19fe-4a69-9c5c-7d33be558a7a",
        "display_order": 2
      },
      {
        "cz_reward_game_id": "a1b2c3d4-0000-4000-8000-000000000003",
        "slug": "mystery_box",
        "kind": "instant",
        "cadence": "none",
        "title": "Mystery Box",
        "subtitle": "Something big is on its way",
        "icon_url": null,
        "headline_prize_coins": 5000,
        "entry_cost_gems": 25,
        "status": "coming_soon",
        "is_playable": false,
        "ends_at": null,
        "seconds_remaining": null,
        "my_entries": 0,
        "cz_lucky_draw_id": null,
        "display_order": 3
      }
    ],
    "total": 4
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
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
  "timestamp": "2026-08-30T12:00:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].slug` | `wheel_of_fortune`, `daily_lucky_draw`, `mystery_box`, `weekly_lucky_draw` | The set is admin-managed, so treat it as open and render whatever comes back. |
| `data[].kind` | `instant`, `draw` | Decides which endpoint the button calls. |
| `data[].cadence` | `none`, `daily`, `weekly` | `none` on an instant game. |
| `data[].status` | `live`, `coming_soon`, `paused` | A `paused` game is not returned at all. |

## Example

```bash
curl http://localhost:4000/api/rewards \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Address every other reward call by `slug`, not by id.** Ids are stable, but the slug is what the routes take and what reads in a log.
- **`kind` decides what the button does.** `instant` → `POST /api/rewards/{slug}/play`, one tap, result immediately. `draw` → open the detail screen, where the user buys entries and waits for the settlement.
- **`headline_prize_coins` is a marketing line, not a promise.** A draw's real pot scales with how many people join, and is on the detail response as `draw.prize_pool_coins`. Never present the headline as the amount that will be paid.
- **Drive the countdown from `seconds_remaining`, not from `ends_at` against the device clock.** The value is computed server-side, so a phone with a wrong clock still counts down correctly. Re-fetch when it reaches 0 rather than assuming the draw settled.
- **A `coming_soon` card still renders** — that is the Mystery Box. Show it greyed with its subtitle; calling `play` on it returns `400 CZDGAME019`.
- **`my_entries` is the "You have N entries" line** for the open draw only. It resets to 0 when the next period opens.
- Everything rolls at **00:00 UTC**. A weekly draw settles at 00:00 UTC on Monday.
