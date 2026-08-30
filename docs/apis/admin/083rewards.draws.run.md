# POST /api/admin/rewards/draws/run

Settles every draw whose deadline has passed and opens the next period for any live draw game that has none. The manual version of the 00:00 UTC job.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/rewards/draws/run` |
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

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `settled` | integer | Draws closed and paid out on this pass. |
| `opened` | integer | New periods opened. |
| `ran_at` | string (date-time) | When the pass ran. |

```json
{
  "success": true,
  "data": { "settled": 1, "opened": 1, "ran_at": "2026-08-30T12:04:53.842Z" }
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
  "cz_error_code": "CZDAUTH007",
  "cz_error_message": "You do not have permission to do that.",
  "cz_error_description": "Admin product access does not include Coinzu.",
  "cz_error_icon": "PermissionDeniedIcon",
  "statusCode": 403,
  "timestamp": "2026-08-30T12:26:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
curl -X POST "$BASE/admin/rewards/draws/run" -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **This pays real money, so it is worth understanding before pressing.** Any draw past its deadline is settled: winners are drawn weighted by entries held, coins are credited, and a notification goes out. There is no undo.
- **It is safe to run when nothing is due.** `settled: 0, opened: 0` means everything is already in order. It is also safe to run twice — a pass never overlaps itself, and a settled draw is never settled again.
- **Both cadences are handled in one pass**, so a weekly draw closing on the same midnight as a daily one is never missed.
- **The next period starts where the last one ended**, not at the current wall clock. Settling ahead of midnight rolls the new draw forward to the next free period rather than reopening the one just closed.
- **Use it when `summary.draws_missing` is above 0** on the [games list](076rewards.games.md) — a live draw game with no open instance cannot be entered by anybody.
- The same runner is registered as the `reward_draw_settle` cron job, schedulable from Configuration Settings → Scheduled Jobs.
