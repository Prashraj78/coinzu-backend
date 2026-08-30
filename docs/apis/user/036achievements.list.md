# GET /api/achievements

The whole Achievements screen in one call — lifetime coins and gems earned, the 24-medal board with per-medal progress, the current and rarest medals, and the headline progress figure.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/achievements` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None. The board is the same for everyone; only the progress differs.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `earned.coins` | integer | **The user's lifetime wallet earnings in coins**, across every source — offers, streaks, referrals, everything. Not medal winnings: medals pay nothing. |
| `earned.gems` | integer | The same figure in gems. |
| `progress.unlocked` | integer | Medals earned. |
| `progress.total` | integer | Medals on the board. |
| `progress.label` | string | Ready to print, e.g. `18/36`. |
| `progress.percent` | integer | 0–100, for the header bar. |
| `progress.points` | integer | Points from earned medals. |
| `progress.points_available` | integer | Points on the whole board. |
| `current_medal` | object \| null | Most recently earned. `null` until the first unlock. Same shape as `data[]`. |
| `rarest_medal` | object \| null | Rarest earned, ties broken on points. Same shape as `data[]`. |
| `data[].cz_achievement_id` | string (uuid) | Primary key. |
| `data[].slug` | string \| null | Stable key. Also names the artwork file on R2. |
| `data[].title` | string | Medal name, e.g. `First Blood`. |
| `data[].emoji` | string \| null | Printed next to the name on the detail sheet. |
| `data[].description` | string \| null | What earns it, e.g. `Complete your first offer.` |
| `data[].icon_url` | string \| null | Transparent PNG on R2. Draw it on any background. |
| `data[].rarity` | string | See [Enum values](#enum-values). |
| `data[].points` | integer | Engagement score this medal is worth. Not currency — see the notes. |
| `data[].criteria_type` | string | What is counted, e.g. `complete_offer`. |
| `data[].target` | integer | How many are needed. |
| `data[].progress` | integer | How far along, capped at `target`. |
| `data[].progress_pct` | integer | 0–100, for the bar under the medal. |
| `data[].progress_label` | string | Ready to print, e.g. `1/1`. |
| `data[].is_unlocked` | boolean | Earned. |
| `data[].unlocked_at` | string (date-time) \| null | When it was earned. |
| `data[].display_order` | integer | Board order. `data[]` is already sorted by it. |
| `total` | integer | Medals returned. |

```json
{
  "success": true,
  "data": {
    "earned": { "coins": 19265, "gems": 15610 },
    "progress": {
      "unlocked": 3,
      "total": 24,
      "label": "3/24",
      "percent": 13,
      "points": 230,
      "points_available": 4315
    },
    "current_medal": {
      "slug": "gem-cutter",
      "title": "Gem Cutter",
      "emoji": "💠",
      "rarity": "common",
      "progress_label": "1/1",
      "is_unlocked": true
    },
    "rarest_medal": {
      "slug": "verified",
      "title": "Verified",
      "emoji": "✅",
      "rarity": "rare",
      "progress_label": "1/1",
      "is_unlocked": true
    },
    "data": [
      {
        "cz_achievement_id": "6b1f0f0a-9a4e-4a2c-8f0b-0c5d1e2a3b4c",
        "slug": "first-blood",
        "title": "First Blood",
        "emoji": "🔥",
        "description": "Complete your first offer.",
        "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/achievements/first-blood.png",
        "rarity": "common",
        "points": 25,
        "criteria_type": "complete_offer",
        "target": 1,
        "progress": 0,
        "progress_pct": 0,
        "progress_label": "0/1",
        "is_unlocked": false,
        "unlocked_at": null,
        "display_order": 1
      }
    ],
    "total": 24
  }
}
```

> `current_medal` and `rarest_medal` are abbreviated above; both carry every field listed for `data[]`.

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
  "timestamp": "2026-08-30T06:24:04.183Z"
}
```

## Enum values

Every value this endpoint can send for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `data[].rarity` | `common`, `rare`, `epic`, `rarest` | Drives the tile treatment. The four `rarest` medals close the board — the app groups them under "Rarest of Rare". |
| `data[].criteria_type` | `complete_offer`, `complete_challenge`, `daily_checkin`, `play_quiz`, `play_scratch`, `play_spin`, `redeem_gift_card`, `kyc_verified`, `onboarding_completed`, `convert_currency`, `withdrawal_completed`, `refer_friend`, `enter_lucky_draw` | What the medal counts. Not shown to the user — `description` is the human wording. |

## Example

```bash
curl http://localhost:4000/api/achievements \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **This is the only call the screen needs.** The header tiles, the progress bar, the medal grid and the detail sheet all read from this one response — there is no per-medal endpoint.
- **`icon_url` is a transparent PNG**, rendered at 128px. Draw it on the dark achievement background without a plate behind it; never assume a white ground.
- **`progress` is capped at `target`**, so a user with 300 completed offers shows `250/250` on a 250-offer medal rather than overflowing the bar.
- `progress_label` and `progress.label` are pre-formatted so the app never has to build `"1/1"` itself and can't drift from the server's rounding.
- **`current_medal` is the newest unlock**, ties broken on rarity — right for "what did I just earn". **`rarest_medal` is the best one held**, ties broken on points — right for a profile badge.
- **Medals never pay out.** Unlocking one credits no coins and no gems — the board exists for engagement, not earning. `points` is a score for the header total and nothing more; it is not a spendable currency and does not appear in the wallet.
- **`earned` is the wallet, not the board.** It is the user's lifetime earnings from every real source, shown at the top of the screen as context for how far they have come. Two users with identical medals can have very different `earned` figures.
- The board is admin-managed. Medals, their targets and their artwork can all change from the Achievements tab, so read `total` and `points_available` rather than hard-coding 24 and 4315.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
