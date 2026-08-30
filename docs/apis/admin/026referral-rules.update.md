# PATCH /api/admin/referral-rules/:id

Changes what a step pays, what it requires, or whether it is live. The `trigger` is the step's identity and is never editable.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/referral-rules/:id` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |
| `Content-Type` | yes | `application/json` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string (uuid) | yes | The `cz_referral_rule_id` from `GET /api/admin/referral-rules`. |

### Body

Every field is optional; send only what changes.

| Name | Type | Required | Rules | Description |
|---|---|---|---|---|
| `reward_coins` | number | no | Integer, 0 or more. | Coins paid to the referrer. |
| `reward_gems` | number | no | Integer, 0 or more. | Gems paid to the referrer. |
| `threshold` | number | no | Integer, 1 or more. | Offers required. Ignored and reset to `1` on triggers that do not use it. |
| `label` | string | no | Max 120 chars. | Label shown to the referrer. |
| `display_order` | number | no | Integer, 0 or more. | Sort position. |
| `is_active` | boolean | no | — | `false` pauses the step without deleting it. |

```json
{ "reward_coins": 750, "reward_gems": 150, "threshold": 15, "is_active": true }
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_referral_rule_id` | string (uuid) | Primary key of the step. |
| `trigger` | string | What the invited friend must do. |
| `threshold` | number | Offers required. Forced to `1` on triggers that do not use it. |
| `reward_coins` | number | Coins paid to the referrer. |
| `reward_gems` | number | Gems paid to the referrer. |
| `label` | string \\| null | Admin-written label shown to the referrer. |
| `display_order` | number | Sort position, ascending. |
| `is_active` | boolean | Whether the step currently pays. |
| `created_at` | string (date-time) | When the step was added. |
| `updated_at` | string (date-time) | Last change. |

```json
{
  "success": true,
  "data": {
    "cz_referral_rule_id": "7c1f0a2e-9b34-4d67-8e02-3f5a1c9d4b88",
    "trigger": "offers_completed",
    "threshold": 15,
    "reward_coins": 750,
    "reward_gems": 150,
    "label": "Friend completes 15 offers",
    "display_order": 3,
    "is_active": true,
    "created_at": "2026-08-29T07:12:04.118Z",
    "updated_at": "2026-08-29T07:22:40.905Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDREF004` | We could not find that referral rule. | No `referral_reward_rules` row exists for the given id. | `ReferralInvalidIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field is the wrong type or below its minimum. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDREF004",
  "cz_error_message": "We could not find that referral rule.",
  "cz_error_description": "No referral_reward_rules row exists for the given id.",
  "cz_error_icon": "ReferralInvalidIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T07:22:06.810Z"
}
```

## Enum values

None in the request body — `trigger` cannot be changed here.

## Example

```bash
curl -X PATCH $BASE/admin/referral-rules/7c1f0a2e-9b34-4d67-8e02-3f5a1c9d4b88 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "reward_coins": 750, "is_active": false }'
```

## Notes

- Raising `reward_coins` affects future payouts only. A friend who already cleared the step keeps what they paid — the unique `(referral_id, trigger)` index means it can never pay a second time.
- Raising `threshold` on `offers_completed` does not reverse a payout already made at the old, lower bar.
- Payouts are also clamped by the per-friend caps in Configuration Settings → Referral rewards. Raising a step's reward above the remaining cap headroom means it pays only the remainder.
- `is_active: false` is the safe way to stop a step: it keeps the row, the history and the configuration. Use `DELETE` only when you want the step gone entirely.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
