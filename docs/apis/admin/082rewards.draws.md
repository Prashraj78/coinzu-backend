# GET /api/admin/rewards/draws

Every draw instance, open or settled, with its turnout, its pot and who won.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/rewards/draws` |
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
| `page` | integer | no | 1-based. Default `1`. |
| `limit` | integer | no | 1–100. Default `20`. |
| `slug` | string | no | One reward, e.g. `weekly_lucky_draw`. |
| `status` | string | no | `open`, `drawing` or `resolved`. |
| `date_from` / `date_to` | string (date) | no | Filter on the draw's own date. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_lucky_draw_id` | string (uuid) | Primary key. |
| `data[].game_slug` | string \| null | Which reward. |
| `data[].title` / `.type` / `.period_key` | — | What and when. |
| `data[].status` | string | `open` or `resolved`. |
| `data[].draw_date` | string (date-time) | When it settles, or settled. |
| `data[].settled_at` | string (date-time) \| null | When the job actually ran. |
| `data[].prize_pool_coins` | integer | The pot the turnout earned. |
| `data[].winners_count` | integer | Seats actually paid. |
| `data[].participants_count` / `.entries_count` | integer | Turnout. |
| `data[].entry_cost_gems` | integer | Price at the time. |
| `data[].gems_collected` | integer | `entries_count × entry_cost_gems`. |
| `data[].winners[].rank` | integer | 1 is first place. |
| `data[].winners[].cz_user_id` / `.name` / `.email` | — | **Unmasked — admin only.** |
| `data[].winners[].masked_name` | string | What the app shows publicly. |
| `data[].winners[].prize_coins` | integer | What they were paid. |
| `data[].winners[].entries_held` | integer | How many entries they held. |
| `total` / `page` / `limit` | integer | Pagination. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_lucky_draw_id": "d720adca-19fe-4a69-9c5c-7d33be558a7a",
        "game_slug": "daily_lucky_draw",
        "title": "Daily Lucky Draw",
        "type": "daily",
        "period_key": "2026-08-30",
        "status": "resolved",
        "draw_date": "2026-08-30T12:03:00.000Z",
        "settled_at": "2026-08-30T12:04:53.000Z",
        "prize_pool_coins": 500,
        "winners_count": 1,
        "participants_count": 7,
        "entries_count": 56,
        "entry_cost_gems": 10,
        "gems_collected": 560,
        "winners": [
          {
            "rank": 1,
            "cz_user_id": "dbc6dd8c-b845-4708-b315-845234f6d35e",
            "name": "Prashant",
            "email": "prashant@example.com",
            "masked_name": "prash@****.com",
            "prize_coins": 500,
            "entries_held": 5
          }
        ]
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | An unknown status, a malformed date, or an unknown query field. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "status must be one of the following values: open, drawing, resolved",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `open`, `drawing`, `resolved` | `drawing` is transient and rarely seen. |
| `data[].type` | `daily`, `weekly` | Matches the game's cadence at the time it opened. |

## Example

```bash
curl "$BASE/admin/rewards/draws?slug=daily_lucky_draw&status=resolved" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **This is the only place a winner's real identity appears.** `name` and `email` are unmasked here for support and audit; the app only ever receives `masked_name`. Do not surface the raw values outside the admin panel.
- **`gems_collected` against `prize_pool_coins`** is the per-draw margin — worth scanning down the column after changing a payout band.
- **A settled draw with no winners had no entries.** The job closes it cleanly with a zero pot rather than paying an empty pot out.
- **`entry_cost_gems` is the price the draw opened with.** Each purchase also records what it actually paid, so a mid-period price change does not distort the history.
- Ordered by draw date, newest first.
