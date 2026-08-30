# GET /api/admin/achievements

Every medal on the board with how many users hold it and how many are part-way there. The Achievements tab's grid.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/achievements` |
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
| `search` | string | no | Case-insensitive match against title, description or slug. Max 120 characters. |
| `rarity` | string | no | One tier. See [Enum values](#enum-values). |

The board is 24 rows, so there is no paging.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_achievement_id` | string (uuid) | Primary key. |
| `data[].slug` | string | Stable key. Used in `GET /api/admin/achievements/:slug/users` and names the artwork on R2. |
| `data[].title` | string | Medal name. |
| `data[].emoji` | string \| null | Printed next to the name. |
| `data[].description` | string \| null | What earns it. |
| `data[].icon_url` | string \| null | Transparent PNG on R2. |
| `data[].rarity` | string | See [Enum values](#enum-values). |
| `data[].points` | integer | Engagement score. Medals never pay coins or gems. |
| `data[].criteria_type` | string | What is counted. |
| `data[].criteria_value` | integer | How many are needed. |
| `data[].is_active` | boolean | Inactive medals are hidden from the app. |
| `data[].display_order` | integer | Board order. `data[]` is already sorted by it. |
| `data[].unlocked_users` | integer | Users who have earned it. |
| `data[].in_progress_users` | integer | Users part-way there but not finished. |
| `data[].unlock_rate` | number | `unlocked_users` as a percentage of active accounts, one decimal. |
| `total` | integer | Medals returned. |
| `summary.medals` | integer | Medals on the board. |
| `summary.active_users` | integer | Active accounts — the denominator for `unlock_rate`. |
| `summary.total_unlocks` | integer | Every unlock across every medal. |
| `summary.never_unlocked` | integer | Medals no user has earned. |
| `summary.points_available` | integer | Points across the whole board. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_achievement_id": "6b1f0f0a-9a4e-4a2c-8f0b-0c5d1e2a3b4c",
        "slug": "verified",
        "title": "Verified",
        "emoji": "✅",
        "description": "Pass identity verification.",
        "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/achievements/verified.png",
        "rarity": "rare",
        "points": 100,
        "criteria_type": "kyc_verified",
        "criteria_value": 1,
        "is_active": true,
        "display_order": 3,
        "unlocked_users": 1,
        "in_progress_users": 0,
        "unlock_rate": 14.3
      }
    ],
    "total": 24,
    "summary": {
      "medals": 24,
      "active_users": 7,
      "total_unlocks": 4,
      "never_unlocked": 20,
      "points_available": 4315
    }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `rarity` is not one of the allowed values. | `ValidationFailedIcon` |
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
  "timestamp": "2026-08-30T06:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `rarity` / `data[].rarity` | `common`, `rare`, `epic`, `rarest` | The four `rarest` medals close the board. |
| `data[].criteria_type` | `complete_offer`, `complete_challenge`, `daily_checkin`, `play_quiz`, `play_scratch`, `play_spin`, `redeem_gift_card`, `kyc_verified`, `onboarding_completed`, `convert_currency`, `withdrawal_completed`, `refer_friend`, `enter_lucky_draw` | Each has a live hook that advances progress. |

## Example

```bash
curl "$BASE/admin/achievements?rarity=rarest" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Counts come from one grouped query**, not one per medal, so the grid is a single round trip however many medals exist.
- `summary.never_unlocked` is the number worth watching: a medal nobody has earned usually means its `criteria_type` has no live hook, or its `criteria_value` is out of reach.
- `unlock_rate` is measured against **active** accounts only, so suspended and deleted users do not depress it.
- `in_progress_users` counts users with progress above zero who have not finished. Someone who has never touched the criteria is in neither count.
- Ordered by `display_order`, which is the same order the app draws the board in.
- Medals are seeded from `src/database/seeds/achievement-medals.seed.ts`; the artwork lives on R2 under `achievements/<slug>.png`.
