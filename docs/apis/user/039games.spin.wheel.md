# GET /api/games/spin

The wheel face to draw, and how many spins the signed-in user has left today.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/games/spin` |
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
| `data[].cz_spin_wheel_config_id` | string (uuid) | The segment. `POST /api/games/spin` returns the one that won, so the app knows where to stop the wheel. |
| `data[].label` | string | The caption printed on the wedge, e.g. `1000` or `Better luck`. |
| `data[].reward_coins` | integer | Coins this wedge pays. Exact — this is what lands if it wins. |
| `data[].reward_gems` | integer | Gems it pays. |
| `data[].display_order` | integer | Clockwise order. `data[]` is already sorted by it. |
| `total` | integer | Segments on the wheel. |
| `spins_used` | integer | Spins taken today. |
| `spins_left` | integer | Spins remaining today. `0` means the wheel is spent. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_spin_wheel_config_id": "41a9cf85-dead-41a0-8ac8-06782928c414",
        "label": "10",
        "reward_coins": 10,
        "reward_gems": 0,
        "display_order": 1
      },
      {
        "cz_spin_wheel_config_id": "bfdb1e29-7bb3-469c-a35a-dbcb396e4e94",
        "label": "100",
        "reward_coins": 100,
        "reward_gems": 0,
        "display_order": 2
      },
      {
        "cz_spin_wheel_config_id": "c7785b4f-306a-4614-b2b4-1107e717bfd2",
        "label": "50 gems",
        "reward_coins": 0,
        "reward_gems": 50,
        "display_order": 3
      }
    ],
    "total": 8,
    "spins_used": 0,
    "spins_left": 1
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
  "timestamp": "2026-08-30T11:02:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl http://localhost:4000/api/games/spin \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **Each wedge shows exactly what it pays.** `reward_coins` and `reward_gems` are the real amounts — a wheel segment never pays a random amount, so what is printed on the wedge is what lands. (Scratch cards are the opposite: their prize is hidden until scratched and can be a band.)
- **A wedge can pay coins, gems, both, or nothing.** Render `0` as an empty slot, not as "0 coins" — use the `label` for a losing wedge.
- **The odds are never sent.** How likely each wedge is remains admin-only, so the wheel cannot be gamed by reading the payload.
- **`label` is free text the admin writes** — a caption to render, not something to parse. Prefer it over the raw numbers when it says something like "Better luck".
- **The result is always one of these segments.** `POST /api/games/spin` returns a `cz_spin_wheel_config_id` from this list, so the app can animate to that wedge and the amount it shows will match `reward_coins`.
- **One spin a day**, fixed in code and the same for everyone. Gate the button on `spins_left > 0`; spinning with none left returns `400 CZDGAME005`.
- **The order is the wheel's order.** Lay the wedges out in `display_order` so the id that comes back from a spin maps to a position you can animate to.
- Segments can be added, removed or reordered by an admin at any time, and their ids are regenerated on every save — so load this before each spin rather than caching the face.
- The allowance resets at **00:00 UTC**, not local midnight.
