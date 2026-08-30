# GET /api/admin/daily/spin-wheel

The wheel's segments with the odds their weights actually produce, plus what a spin pays on average.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/daily/spin-wheel` |
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
| `data[].cz_spin_wheel_config_id` | string (uuid) | Primary key. Regenerated on every save. |
| `data[].label` | string | Printed on the segment, e.g. `1000`. |
| `data[].reward_coins` | integer | Coins this segment pays. Exact. `0` for a losing segment. |
| `data[].reward_gems` | integer | Gems it pays. |
| `data[].probability_weight` | number | Relative weight, not a percentage. |
| `data[].chance_pct` | number | The weight as a real percentage of the active pool. `0` when inactive. |
| `data[].display_order` | integer | Order around the wheel. |
| `data[].is_active` | boolean | Inactive segments are never drawn. |
| `total` | integer | Segments, active or not. |
| `summary.active_segments` | integer | Segments in the draw. |
| `summary.total_weight` | number | Sum of active weights. Need not be 100. |
| `summary.total_spins` | integer | Spins ever taken. |
| `summary.expected_coins` | integer | What a spin pays on average at these odds. |
| `summary.expected_gems` | integer | The same in gems. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_spin_wheel_config_id": "2718021f-b5ad-4094-b483-6486c2eb578b",
        "label": "1000",
        "reward_coins": 1000,
        "reward_gems": 0,
        "probability_weight": 12,
        "chance_pct": 12,
        "display_order": 3,
        "is_active": true
      }
    ],
    "total": 8,
    "summary": {
      "active_segments": 8,
      "total_weight": 100,
      "total_spins": 1,
      "expected_coins": 2047,
      "expected_gems": 8
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
  "timestamp": "2026-08-30T06:44:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl "$BASE/admin/daily/spin-wheel" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Weights are relative.** A segment's real chance is its weight over the sum of active weights, which is what `chance_pct` reports — seeding them to add to 100 is a convenience, not a requirement.
- **A wheel segment always pays an exact amount.** The wedge shows the user what it is worth before they spin, so a band would be a lie — payout bands belong to the [scratch pool](068daily.scratch.md), where the prize is hidden until it is scratched.
- **The user-facing wheel sends `reward_coins` and `reward_gems`, but never the weights.** The payout is printed on the wedge; the odds stay here.
- **`expected_coins` is the cost of a spin to the business.** With a 1,000,000-coin segment at 0.1%, the average is dominated by the jackpot even though almost nobody wins it — watch this number when adding a big prize.
- A segment paying nothing is normal: give it `reward_coins: 0` and `reward_gems: 0` and a label like "Better luck".
- **A user gets one spin a day**, fixed in code and the same for everyone. It is no longer a setting.
