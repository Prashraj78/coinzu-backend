# GET /api/daily/challenges

The whole Daily Challenge screen in one call — the five tiles with progress, the master chest, the day strip, and what can be played right now. Pass `?date=` to look back at a finished day.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/daily/challenges` |
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
| `date` | string (date) | no | A past UTC date, `yyyy-MM-dd`. Defaults to today. A future date is rejected. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `date` | string (date) | The day this board describes. |
| `is_today` | boolean | Whether that is today. |
| `is_read_only` | boolean | `true` for any past day — nothing on it can be played or claimed. |
| `streak_days` | integer | The user's current streak, for the header. |
| `master_chest.reward_coins` | integer | Coins the chest pays. |
| `master_chest.reward_gems` | integer | Gems the chest pays. |
| `master_chest.completed` | integer | Tiles finished. |
| `master_chest.total` | integer | Tiles on the board. |
| `master_chest.progress_label` | string | Ready to print, e.g. `3/5`. |
| `master_chest.percent` | integer | 0–100, for the ring. |
| `master_chest.is_unlocked` | boolean | Every tile is finished. |
| `master_chest.is_claimed` | boolean | Already taken today. |
| `master_chest.can_claim` | boolean | The Claim button's enabled state. |
| `master_chest.claimed_at` | string (date-time) \| null | When it was taken. |
| `max_earning.coins` | integer | Every tile plus the chest — the "win up to" figure in the header. |
| `max_earning.gems` | integer | The same in gems. |
| `availability.spin_available` | boolean | The wheel can be spun now. |
| `availability.spins_left` | integer | Spins remaining today. |
| `availability.quiz_available` | boolean | Today's quiz exists and is unanswered. |
| `availability.quiz_id` | string (uuid) \| null | Pass to `POST /api/games/quiz/:id/answer`. |
| `availability.scratch_cards_left` | integer | Cards still available — won from today's quiz and not yet scratched. |
| `availability.scratch_cards_pending` | integer | Cards **won** today that have not been scratched yet. Drives the quiz tile's highlight. |
| `availability.scratch_available` | boolean | There is at least one card to scratch right now. |
| `calendar[].date` | string (date) | A day in the strip. |
| `calendar[].label` | string | Day of the month, e.g. `30`. |
| `calendar[].completed` | integer | Tiles finished that day. |
| `calendar[].total` | integer | Tiles that day. |
| `calendar[].is_today` | boolean | Highlight this one. |
| `calendar[].is_locked` | boolean | A future day — cannot be opened. |
| `calendar[].is_viewable` | boolean | Can be opened read-only via `?date=`. |
| `data[].cz_daily_challenge_id` | string (uuid) | Primary key. |
| `data[].type` | string | Which tile. See [Enum values](#enum-values). |
| `data[].title` | string | e.g. `Spin the Lucky Wheel`. |
| `data[].description` | string \| null | e.g. `Spin the wheel 1 time`. |
| `data[].icon_url` | string \| null | Tile artwork, when set. |
| `data[].action` | string \| null | Where a tap should send the app. **Not static** — see the notes. See [Enum values](#enum-values). |
| `data[].is_highlighted` | boolean | Draw attention to this tile; something is waiting on it. |
| `data[].highlight_reason` | string \| null | Why. See [Enum values](#enum-values). |
| `data[].pending_scratch_cards` | integer | Unscratched cards this tile won. Only ever non-zero on the quiz tile. |
| `data[].reward_coins` | integer | Coins for finishing it. |
| `data[].reward_gems` | integer | Gems for finishing it. |
| `data[].target` | integer | How many actions finish it — `2` for "play any 2 new games". |
| `data[].progress` | integer | How far along, capped at `target`. |
| `data[].progress_label` | string | Ready to print, e.g. `1/2`. |
| `data[].is_completed` | boolean | Finished. |
| `data[].completed_at` | string (date-time) \| null | When it was finished. |
| `data[].is_playable` | boolean | `false` on a past day, or once finished. |
| `data[].has_pending_action` | boolean | Finished, but still has something to collect. Keep the tile tappable when this is `true`. |
| `total` | integer | Tiles returned. |

```json
{
  "success": true,
  "data": {
    "date": "2026-08-30",
    "is_today": true,
    "is_read_only": false,
    "streak_days": 2,
    "master_chest": {
      "reward_coins": 1000,
      "reward_gems": 1000,
      "completed": 2,
      "total": 5,
      "progress_label": "2/5",
      "percent": 40,
      "is_unlocked": false,
      "is_claimed": false,
      "can_claim": false,
      "claimed_at": null
    },
    "max_earning": { "coins": 1500, "gems": 1030 },
    "availability": {
      "spin_available": false,
      "spins_left": 0,
      "quiz_available": false,
      "quiz_id": "75130136-b35f-4e3b-b8ff-b672a1964aeb",
      "scratch_cards_left": 2,
      "scratch_cards_pending": 1,
      "scratch_available": true
    },
    "calendar": [
      { "date": "2026-08-29", "label": "29", "completed": 0, "total": 5, "is_today": false, "is_locked": false, "is_viewable": true },
      { "date": "2026-08-30", "label": "30", "completed": 2, "total": 5, "is_today": true,  "is_locked": false, "is_viewable": true },
      { "date": "2026-08-31", "label": "31", "completed": 0, "total": 5, "is_today": false, "is_locked": true,  "is_viewable": false }
    ],
    "data": [
      {
        "cz_daily_challenge_id": "0f1e2d3c-4b5a-4c6d-8e7f-9a0b1c2d3e4f",
        "type": "spin",
        "title": "Spin the Lucky Wheel",
        "description": "Spin the wheel 1 time",
        "icon_url": null,
        "action": "spin",
        "is_highlighted": false,
        "highlight_reason": null,
        "pending_scratch_cards": 0,
        "reward_coins": 50,
        "reward_gems": 0,
        "target": 1,
        "progress": 1,
        "progress_label": "1/1",
        "is_completed": true,
        "completed_at": "2026-08-30T06:41:02.114Z",
        "is_playable": false,
        "has_pending_action": false
      },
      {
        "cz_daily_challenge_id": "7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
        "type": "quiz",
        "title": "Take the Quiz",
        "description": "Answer today's question",
        "icon_url": null,
        "action": "scratch",
        "is_highlighted": true,
        "highlight_reason": "scratch_card_ready",
        "pending_scratch_cards": 1,
        "reward_coins": 50,
        "reward_gems": 0,
        "target": 1,
        "progress": 1,
        "progress_label": "1/1",
        "is_completed": true,
        "completed_at": "2026-08-30T10:27:35.449Z",
        "is_playable": false,
        "has_pending_action": true
      }
    ],
    "total": 5
  }
}
```

> `calendar` and `data` are abbreviated above. The strip runs 7 days back to 3 days ahead, and `data` carries all five tiles.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDGAME001` | We could not find that challenge. | `date` is in the future. The description says so. | `ChallengeNotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDGAME001",
  "cz_error_message": "We could not find that challenge.",
  "cz_error_description": "That day has not started yet.",
  "cz_error_icon": "ChallengeNotFoundIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T06:41:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].type` | `spin`, `quiz`, `game_install`, `invite`, `offer` | The five fixed tiles. `scratch` and `checkin` exist in the schema but are not on this board. |
| `data[].action` | `spin`, `quiz`, `scratch`, `offers`, `referrals`, `games` | Where a tap goes. `offers` is the offer wall, `referrals` is Refer & Earn, `scratch` is the Scratch & Win screen. |
| `data[].highlight_reason` | `scratch_card_ready`, or `null` | `scratch_card_ready`: the quiz was answered correctly and the card it won has not been scratched. |

## Example

```bash
# Today
curl http://localhost:4000/api/daily/challenges \
  -H 'Authorization: Bearer <access_token>'

# Look back at a finished day
curl "http://localhost:4000/api/daily/challenges?date=2026-08-29" \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **The five tiles are fixed, so the app can draw them statically.** Their order, titles and artwork still come from here, but the layout never changes shape — this response supplies state, not structure.
- **Route on `action`, not on `type`.** Tapping `Play Any 2 New Games` or `Complete Any Offer` opens the **offer wall** (`action: "offers"`); `Invite a Friends` opens **Refer & Earn** (`action: "referrals"`). Spin and quiz open their own screens.
- **`action` is not static — read it every time.** Once the user answers the quiz correctly, the card it won is the thing still worth collecting, so the quiz tile's `action` switches from `quiz` to `scratch` and it starts pointing at the Scratch & Win screen instead of the answered question. It reverts once the card is scratched. Hard-coding the quiz tile to the quiz screen sends the user to a dead end.
- **A finished tile can still be tappable.** `is_playable` is `false` once a tile is done, but `has_pending_action` is `true` while something is left to collect — keep the tile live when either is set, and use `is_highlighted` to draw the eye (a badge, a glow, a pulse). `pending_scratch_cards` gives the count for a "1 card ready" pill.
- **A past day is read-only.** `is_read_only` is `true`, every tile's `is_playable` is `false`, and everything under `availability` is zeroed. Show what was finished; hide the play buttons. Yesterday's spin cannot be taken today.
- **A future day cannot be opened at all.** `calendar[].is_locked` marks them; requesting one is a 400.
- **`progress` is a count, not a flag.** "Play any 2 new games" reads `1/2` after the first, and only completes on the second.
- **`max_earning` is the header figure** — every tile plus the chest. Read it rather than summing client-side, so an admin's change lands immediately.
- **The chest pays once a day and only when everything is done.** Poll `master_chest.can_claim` for the button state, then call `POST /api/daily/challenges/chest`.
- **`scratch_cards_left` and `scratch_cards_pending` are the same number**, because every card is won from the quiz and there is no free allowance. Both match `cards_left` from `GET /api/games/scratch`. Do not add them together.
- **Progress is written by the game endpoints, not by this one.** Spinning, answering the quiz, completing an offer and inviting a friend each advance their own tile; this call only reports the result.
- Everything resets at **00:00 UTC**, not local midnight.
