# PUT /api/admin/daily/spin-wheel

Replaces the whole wheel in one transaction, so the odds are never half-written.

## Overview

| Item | Value |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/admin/daily/spin-wheel` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `segments` | object[] | yes | 2–20 entries. | The whole wheel. |
| `segments[].label` | string | yes | 1–60 characters. | Printed on the segment. |
| `segments[].reward_coins` | integer | yes | 0–100,000,000. | Coins it pays. Exact. |
| `segments[].reward_gems` | integer | yes | 0–100,000,000. | Gems it pays. |
| `segments[].probability_weight` | number | yes | 0–1,000,000. | Relative weight, not a percentage. |
| `segments[].display_order` | integer | no | ≥ 0. | Defaults to array position. |
| `segments[].is_active` | boolean | no | Default `true`. | Inactive segments are never drawn. |

```json
{
  "segments": [
    { "label": "10",   "reward_coins": 10,   "reward_gems": 0,  "probability_weight": 30 },
    { "label": "1000", "reward_coins": 1000, "reward_gems": 0,  "probability_weight": 12 },
    { "label": "Better luck", "reward_coins": 0, "reward_gems": 0, "probability_weight": 15 }
  ]
}
```

## Response

### Success — `200`

Identical to `GET /api/admin/daily/spin-wheel`.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | Fewer than 2 or more than 20 segments, no active segment, every active weight at 0, or a field out of range. | `ValidationFailedIcon` |
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
  "cz_error_description": "At least one active segment needs a weight above 0.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T06:47:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X PUT "$BASE/admin/daily/spin-wheel" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "segments": [ { "label": "10", "reward_coins": 10, "reward_gems": 0, "probability_weight": 30 }, ...more ] }'
```

## Notes

- **All or nothing.** The write clears the wheel and re-inserts it inside a transaction, so a rejected payload leaves the old wheel exactly as it was.
- **Send every segment, every time.** This is a `PUT`: anything you leave out is deleted. `cz_spin_wheel_config_id` values are regenerated each save, so never store them.
- **A segment pays exactly what it says.** There is no payout band on the wheel: the wedge advertises its value to the user before they spin, so it has to be honest. Bands belong to the [scratch pool](069daily.scratch.save.md), where the prize is hidden until it is scratched.
- **The label is what the user reads on the wedge.** Name it for the prize (`1000`, `50 gems`, `Better luck`), not for a mechanic.
- **A wheel with no winning weight is refused**, because the draw would have nothing to pick.
- Spins already taken keep what they paid; `spin_history` is the record and is never rewritten.
