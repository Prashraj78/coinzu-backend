# POST /api/admin/referral-rules

Adds one step to the referral reward ladder. A trigger that already has a rule is rejected — edit the existing one instead.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/referral-rules` |
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

None.

### Body

| Name | Type | Required | Rules | Description |
|---|---|---|---|---|
| `trigger` | string | yes | One of the enum values below. | What the invited friend must do. A repeatable trigger accepts many steps, one per `threshold`. |
| `reward_coins` | number | yes | Integer, 0 or more. | Coins paid to the referrer when this step clears. |
| `reward_gems` | number | no | Integer, 0 or more. Default `0`. | Gems paid to the referrer. A step may pay coins, gems, or both. |
| `threshold` | number | no | Integer, 1 or more. Default `1`. | Offers the friend must complete. **Only read for `offers_completed`** — forced to `1` on every other trigger. |
| `label` | string | no | Max 120 chars. | Label shown to the referrer. Defaults to the trigger's built-in name. |
| `display_order` | number | no | Integer, 0 or more. Default `0`. | Sort position in the panel. |
| `is_active` | boolean | no | Default `true`. | `false` adds the step paused. |

```json
{
  "trigger": "offers_completed",
  "reward_coins": 500,
  "reward_gems": 100,
  "threshold": 10,
  "label": "Friend completes 10 offers",
  "display_order": 3,
  "is_active": true
}
```

## Response

### Success — `201`

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
    "threshold": 10,
    "reward_coins": 500,
    "reward_gems": 100,
    "label": "Friend completes 10 offers",
    "display_order": 3,
    "is_active": true,
    "created_at": "2026-08-29T07:12:04.118Z",
    "updated_at": "2026-08-29T07:12:04.118Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 409 | `CZDREF005` | A rule for that step already exists. | A single-event trigger already has its step, or a repeatable trigger already pays at this `threshold`. `cz_error_description` says which. | `DuplicateOptionIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `trigger` is not one of the allowed values, or `reward_coins` is missing or negative. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDREF005",
  "cz_error_message": "A rule for that step already exists.",
  "cz_error_description": "A referral_reward_rules row already uses this trigger.",
  "cz_error_icon": "DuplicateOptionIcon",
  "statusCode": 409,
  "timestamp": "2026-08-29T07:15:17.672Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `trigger` | `signup`, `email_verified`, `onboarding_completed`, `kyc_verified`, `first_withdrawal`, `first_redeem`, `offers_completed`, `daily_checkins`, `streak_reached`, `withdrawals_completed`, `redeems_completed`, `referrals_made` | Only `offers_completed` reads `threshold`. |

## Example

```bash
curl -X POST $BASE/admin/referral-rules \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "trigger": "kyc_verified", "reward_coins": 250, "label": "Friend completes KYC" }'
```

## Notes

- `offers_completed` is **repeatable** — add a step per milestone (1, 5, 10, 25, 50 …) to build a ladder of any length. The other triggers are single events and hold one step each, so drop them from the picker once used.
- A step must pay something: `reward_coins` and `reward_gems` cannot both be `0`, or the step will never fire.
- Adding a step does **not** pay retroactively. Friends who already cleared the trigger before the rule existed are not backfilled.
- `threshold` is silently forced to `1` on `signup`, `kyc_verified` and `first_withdrawal` — sending a different value is accepted and ignored rather than rejected.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
