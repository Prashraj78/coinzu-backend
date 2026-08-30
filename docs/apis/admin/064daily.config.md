# PATCH /api/admin/daily/config

Sets the master chest reward. It used to live under Configuration Settings → Rewards; that tab is gone, and it belongs beside the board it governs.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/daily/config` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None.

### Body

Every field optional; only what you send changes.

| Field | Type | Rules | Description |
|---|---|---|---|
| `chest_coins` | integer | 0–1,000,000. | Coins the master chest pays when every tile is finished. |
| `chest_gems` | integer | 0–1,000,000. | The gem half of the same chest. |

```json
{ "chest_coins": 1200, "chest_gems": 800 }
```

## Response

### Success — `200`

Identical to `GET /api/admin/daily/challenges`, so the tab re-renders from the response. The `config` block echoes the new values:

| Field | Type | Description |
|---|---|---|
| `config.chest_coins` | integer | Coins the chest pays. |
| `config.chest_gems` | integer | Gems the chest pays. |
| `config.spin_limit` | integer | Always `1`. Fixed in code, shown for completeness, and not editable. |
| `config.scratch_source` | string | Always `"quiz"`. A scratch card can only be won by answering the quiz correctly. |

```json
{
  "success": true,
  "data": {
    "config": {
      "chest_coins": 1200,
      "chest_gems": 800,
      "spin_limit": 1,
      "scratch_source": "quiz"
    },
    "chest": { "reward_coins": 1200, "reward_gems": 800, "claims_7d": 0 },
    "summary": { "max_daily_coins": 1700, "max_daily_gems": 830 }
  }
}
```

> Abbreviated — the full body is the challenge overview.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A value is negative, over its ceiling, not an integer, or an unknown field was sent. | `ValidationFailedIcon` |
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
  "cz_error_description": "chest_coins must not be less than 0",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T11:12:04.183Z"
}
```

## Enum values

This endpoint has no fixed-value string fields.

## Example

```bash
# Raise the chest
curl -X PATCH "$BASE/admin/daily/config" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "chest_coins": 1200, "chest_gems": 800 }'

# Chest only
curl -X PATCH "$BASE/admin/daily/config" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "chest_coins": 1500 }'
```

## Notes

- **These are settings rows, not challenge rows.** They are stored as `daily_chest_coins` and `daily_chest_gems`, but they are deliberately **not** in the Configuration catalogue — `PATCH /api/admin/settings` rejects both with `CZDADM004`. This route is the only way to change them.
- **The chest pays once a day**, and only when every active tile is finished. Raising it raises `summary.max_daily_coins`, which is the "win up to" figure the app shows in the header.
- **Changes are live immediately, including mid-day.** A user who has not yet claimed today's chest gets the new amount; one who already claimed keeps what they were paid.
- **`spin_limit` is fixed at 1** and is not settable. It was a configuration key and is no longer — one spin a day, for everyone.
- **`scratch_source` is fixed at `"quiz"`.** There is no free scratch allowance: a card exists only because the user answered the day's quiz correctly. The old `daily_scratch_limit` key is retired, and sending `scratch_limit` here is a 400.
