# GET /api/rewards/winners

Who won, across every reward or one of them, filterable to any date. Identities are masked before they leave the server.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/rewards/winners` and `/api/rewards/:slug/winners` |
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
| `slug` | string | no | Path segment. Omit for every reward. |
| `page` | integer | no | 1-based. Default `1`. |
| `limit` | integer | no | 1–100. Default `20`. |
| `date` | string (date) | no | One exact draw day, `yyyy-MM-dd`. |
| `date_from` | string (date) | no | Range start. |
| `date_to` | string (date) | no | Range end, inclusive. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_lucky_draw_winner_id` | string (uuid) | Primary key. |
| `data[].cz_lucky_draw_id` | string (uuid) | The draw they won. |
| `data[].game_slug` | string \| null | Which reward. |
| `data[].game_title` | string \| null | Its display name. |
| `data[].period_key` | string \| null | `2026-08-30` daily, `2026-W35` weekly. |
| `data[].draw_date` | string (date-time) | When it settled. |
| `data[].rank` | integer | 1 is first place. |
| `data[].masked_name` | string | e.g. `Coinz@****.com`. **Masked server-side** — the real address is never sent. |
| `data[].avatar_url` | string \| null | Their avatar. |
| `data[].country` | string \| null | Two-letter code, e.g. `IN`. |
| `data[].prize_coins` | integer | Coins they were paid. |
| `data[].prize_gems` | integer | Gems they were paid. |
| `data[].entries_held` | integer | How many entries they held when it settled. |
| `total` | integer | Winners matching the filters. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_lucky_draw_winner_id": "5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9",
        "cz_lucky_draw_id": "d720adca-19fe-4a69-9c5c-7d33be558a7a",
        "game_slug": "daily_lucky_draw",
        "game_title": "Daily Lucky Draw",
        "period_key": "2026-08-30",
        "draw_date": "2026-08-31T00:00:00.000Z",
        "rank": 1,
        "masked_name": "prash@****.com",
        "avatar_url": null,
        "country": "IN",
        "prize_coins": 500,
        "prize_gems": 0,
        "entries_held": 5
      }
    ],
    "total": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A malformed date, or an unknown query field. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "date must be a valid ISO 8601 date string",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:05:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields beyond `game_slug`, which matches the reward slugs in [`045rewards.list.md`](045rewards.list.md).

## Example

```bash
# Everyone who has ever won
curl "http://localhost:4000/api/rewards/winners" \
  -H 'Authorization: Bearer <access_token>'

# Yesterday's daily draw
curl "http://localhost:4000/api/rewards/daily_lucky_draw/winners?date=2026-08-29" \
  -H 'Authorization: Bearer <access_token>'

# A whole month, paged
curl "http://localhost:4000/api/rewards/winners?date_from=2026-08-01&date_to=2026-08-31&page=2&limit=20" \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **The name is already masked — never try to unmask it, and never build your own.** `masked_name` keeps just enough of the address for a winner to recognise themselves; the raw email never leaves the server. A user with no email falls back to a masked display name, then to "Coinzu player".
- **Two paths, one shape.** `/api/rewards/winners` is the global feed for the Rewards screen; `/api/rewards/{slug}/winners` is the same list scoped to one card, which is what the detail screen's "Show More" opens.
- **`date` is the draw's day, not the day it was won on.** A daily draw for `2026-08-30` settles at 00:00 UTC on the 31st, and is filed under the 30th.
- **The detail response already carries the first three** as `recent_winners`, so the card does not need this call until the user taps "Show More".
- **Ordering is newest draw first, then rank ascending**, so first place always leads its own draw.
- `entries_held` is worth showing — it makes the "more entries, more chance" mechanic visible without claiming anything the server did not compute.
- Dates are UTC.
