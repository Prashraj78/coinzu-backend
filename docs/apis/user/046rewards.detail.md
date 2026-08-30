# GET /api/rewards/:slug

One reward's screen — the pot, the countdown, how many entries the user holds, the prize ladder, how it works, and the latest winners.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/rewards/:slug` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `slug` | string | yes | From `GET /api/rewards`, e.g. `daily_lucky_draw`. |

### Body

None.

## Response

### Success — `200`

Every field from the card, plus:

| Field | Type | Description |
|---|---|---|
| `min_entries` | integer | Fewest entries one purchase may buy. |
| `max_entries` | integer | Most entries one purchase may buy. |
| `entry_packs` | integer[] | The quick-pick buttons, in order, e.g. `[5,10,25,50,100,250]`. |
| `how_it_works[].title` | string | One step of the explainer strip. |
| `how_it_works[].description` | string \| null | Its supporting line. |
| `how_it_works[].icon_url` | string \| null | The step's icon. Admin-picked from the `reward_step_icon` dropdown type. |
| `terms_url` | string \| null | Behind "By entering you agree to our Terms". |
| `prizes[].cz_reward_prize_id` | string (uuid) | Primary key. |
| `prizes[].rank` | integer | 1 is the top prize. Already sorted. |
| `prizes[].label` | string | e.g. `1st Prize`. |
| `prizes[].reward_coins` | integer | What that rung shows. |
| `prizes[].reward_gems` | integer | The same in gems. |
| `draw` | object \| null | The open draw. `null` for an instant game, or when none is open. |
| `draw.cz_lucky_draw_id` | string (uuid) | This period's draw. |
| `draw.period_key` | string | `2026-08-30` daily, `2026-W35` weekly. |
| `draw.opens_at` | string (date-time) | When entries opened. |
| `draw.draw_date` | string (date-time) | When it settles. |
| `draw.seconds_remaining` | integer | Drives the "Next Draw In" countdown. |
| `draw.prize_pool_coins` | integer | **The real pot at the current turnout.** Grows as people join. |
| `draw.participants_count` | integer | The "12,364 Players joined today" line. |
| `draw.entries_count` | integer | Every entry sold this period. |
| `draw.my_entries` | integer | The "You have N Entries" line. |
| `draw.average_entries` | number | What the average player holds — the "Below Average" comparison. |
| `my_plays_today` | integer \| null | Instant games only: plays taken today. There is no cap. |
| `last_play` | object \| null | Instant games only: the user's most recent result. |
| `recent_winners[].cz_lucky_draw_winner_id` | string (uuid) | Primary key. |
| `recent_winners[].cz_lucky_draw_id` | string (uuid) | The draw they won. |
| `recent_winners[].game_slug` | string \| null | Which reward. Always this one here. |
| `recent_winners[].game_title` | string \| null | Its display name. |
| `recent_winners[].period_key` | string \| null | `2026-08-30` daily, `2026-W35` weekly. |
| `recent_winners[].draw_date` | string (date-time) | When that draw settled. |
| `recent_winners[].rank` | integer | 1 is first place. |
| `recent_winners[].masked_name` | string | Masked server-side, e.g. `prash@****.com`. |
| `recent_winners[].avatar_url` | string \| null | Their avatar. |
| `recent_winners[].country` | string \| null | Two-letter code. |
| `recent_winners[].prize_coins` | integer | Coins they were paid. |
| `recent_winners[].prize_gems` | integer | Gems they were paid. |
| `recent_winners[].entries_held` | integer | Entries they held when it settled. |

```json
{
  "success": true,
  "data": {
    "slug": "daily_lucky_draw",
    "kind": "draw",
    "cadence": "daily",
    "title": "Daily Lucky Draw",
    "subtitle": "Win up to 5,000 Coins",
    "headline_prize_coins": 5000,
    "entry_cost_gems": 10,
    "status": "live",
    "is_playable": true,
    "min_entries": 1,
    "max_entries": 250,
    "entry_packs": [5, 10, 25, 50, 100, 250],
    "how_it_works": [
      {
        "title": "Come back every day",
        "description": "A new draw opens at midnight UTC.",
        "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/903f4ecb-3ef5-409d-86b0-960ff4136e79.png"
      },
      {
        "title": "Tap \"Play Now\" to join the draw",
        "description": "More entries, more chance.",
        "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/2856f0dd-70c8-4b54-abd6-952c64a4f553.png"
      },
      {
        "title": "Win exciting coin rewards",
        "description": "Winners are paid automatically.",
        "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/dropdown-icons/a5ce6d4a-dfd0-4545-8765-d05555a2411a.png"
      }
    ],
    "terms_url": "https://coinzu.app/terms",
    "prizes": [
      { "cz_reward_prize_id": "…", "rank": 1, "label": "1st Prize", "reward_coins": 5000, "reward_gems": 0 },
      { "cz_reward_prize_id": "…", "rank": 2, "label": "2nd Prize", "reward_coins": 1000, "reward_gems": 0 }
    ],
    "draw": {
      "cz_lucky_draw_id": "d720adca-19fe-4a69-9c5c-7d33be558a7a",
      "period_key": "2026-08-30",
      "opens_at": "2026-08-30T00:00:00.000Z",
      "draw_date": "2026-08-31T00:00:00.000Z",
      "seconds_remaining": 43140,
      "prize_pool_coins": 500,
      "participants_count": 7,
      "entries_count": 56,
      "my_entries": 8,
      "average_entries": 8
    },
    "my_plays_today": null,
    "last_play": null,
    "recent_winners": [
      {
        "cz_lucky_draw_winner_id": "5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9",
        "cz_lucky_draw_id": "d720adca-19fe-4a69-9c5c-7d33be558a7a",
        "game_slug": "daily_lucky_draw",
        "game_title": "Daily Lucky Draw",
        "period_key": "2026-08-30",
        "draw_date": "2026-08-31T00:00:00.000Z",
        "rank": 1,
        "masked_name": "prash@****.com",
        "avatar_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatars/9f1c.png",
        "country": "IN",
        "prize_coins": 500,
        "prize_gems": 0,
        "entries_held": 5
      },
      {
        "cz_lucky_draw_winner_id": "6f7a8b9c-0d1e-4f2a-b3c4-d5e6f7a8b9c0",
        "cz_lucky_draw_id": "c619bcb9-08ed-4b58-8b4b-6c22a447d669",
        "game_slug": "daily_lucky_draw",
        "game_title": "Daily Lucky Draw",
        "period_key": "2026-08-29",
        "draw_date": "2026-08-30T00:00:00.000Z",
        "rank": 1,
        "masked_name": "pagef@****.com",
        "avatar_url": null,
        "country": "US",
        "prize_coins": 500,
        "prize_gems": 0,
        "entries_held": 25
      }
    ]
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDGAME018` | We could not find that reward. | No reward exists with that slug. | `NotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME018",
  "cz_error_message": "We could not find that reward.",
  "cz_error_description": "No reward game exists with that slug.",
  "cz_error_icon": "NotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-30T12:02:04.183Z"
}
```

## Enum values

Same as [`045rewards.list.md`](045rewards.list.md) — `slug`, `kind`, `cadence` and `status`.

## Example

```bash
curl http://localhost:4000/api/rewards/daily_lucky_draw \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **This is the only call the detail screen needs.** Hero, countdown, entry state, prize ladder, winners and the explainer all read from this one response.
- **Show `draw.prize_pool_coins`, not `headline_prize_coins`, as the live pot.** The headline is the marketing figure; the pot is what the current turnout has actually unlocked, and it climbs as more people join. Re-fetch after buying entries to show it move.
- **`prizes[]` is a ladder to display, not what a winner receives.** An admin sets it to communicate the shape of the prize; the money that is actually paid comes from the pot, split first-place-heavy across however many winners the turnout earns.
- **`draw` can be `null` on a live draw game** in the seconds between one period settling and the next opening. Show the card as "opening shortly" rather than erroring.
- **`average_entries` is what "Below Average" compares against.** Compare it to `my_entries` yourself; the server does not send a verdict.
- **`recent_winners` is the last three, newest draw first**, already masked and ready to render as the "Lucky Draw Winners 🏆" list. It is empty until the first draw settles — show the panel with an empty state rather than hiding it. "Show More" opens `GET /api/rewards/{slug}/winners`, which returns the identical row shape with paging and date filters.
- **`how_it_works[].icon_url` is admin-picked** from the `reward_step_icon` dropdown type, so the strip's artwork changes without an app release. Handle `null` — a step is valid with no icon.
- **`entry_packs` drives the quick-pick buttons.** Multiply each by `entry_cost_gems` to show the gem price. Anything between `min_entries` and `max_entries` is also valid, so keep the free-entry keypad.
- **On an instant game, `draw` is ** and `my_plays_today` / `last_play` are populated instead. There is no daily cap — a user can buy and spin as often as their gems allow.
- Everything is UTC.
