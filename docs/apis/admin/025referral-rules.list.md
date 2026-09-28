# GET /api/admin/referral-rules

The referral reward ladder — every step that pays a referrer — plus the full list of triggers available to add. The Referral Rewards tab is generated from this.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/referral-rules` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

None. The ladder is short by design and is never paginated.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_referral_rule_id` | string (uuid) | Pass to `PATCH`/`DELETE /api/admin/referral-rules/:id`. |
| `data[].trigger` | string | What the invited friend must do. See [Enum values](#enum-values). |
| `data[].threshold` | number | Only meaningful when `uses_threshold` is `true` — offers the friend must complete. Always `1` otherwise. |
| `data[].reward_coins` | number | Coins paid to the referrer when this step clears. |
| `data[].reward_gems` | number | Gems paid to the referrer when this step clears. A step may pay coins, gems, or both. |
| `data[].label` | string \| null | Admin-written label shown to the referrer. Falls back to `trigger_label` when `null`. |
| `data[].display_order` | number | Sort position in the panel, ascending. |
| `data[].is_active` | boolean | `false` pauses the step — it stops paying without losing its configuration. |
| `data[].created_at` | string (date-time) | When the step was added. |
| `data[].updated_at` | string (date-time) | Last change. |
| `data[].trigger_label` | string | Built-in name of the trigger, e.g. `Friend completes offers`. |
| `data[].trigger_description` | string | Built-in help text explaining when the trigger fires. |
| `data[].uses_threshold` | boolean | Whether `threshold` applies to this trigger. |
| `data[].threshold_unit` | string \| null | What the threshold counts, e.g. `offers`. `null` on single-event triggers. |
| `data[].threshold_template` | string \| null | Sentence with `{n}` where the threshold goes, e.g. `Friend hits a {n}-day streak`. Use it to preview a step's default label. `null` on single-event triggers. |
| `data[].default_label` | string | The label this step uses when `label` is `null` — the template already filled in. Use as the form placeholder. |
| `data[].repeatable` | boolean | `true` when the trigger can hold **many** steps, one per threshold. `false` means one step only. |
| `caps.max_coins_per_friend` | number | Admin ceiling on coins one friend can earn a referrer. `0` means uncapped. |
| `caps.max_gems_per_friend` | number | Same ceiling for gems. `0` means uncapped. |
| `caps.ladder_total_coins` | number | What every active step adds up to in coins, before the cap. |
| `caps.ladder_total_gems` | number | Same for gems. |
| `caps.effective_max_coins` | number | The real ceiling — the lower of the cap and the ladder total. |
| `caps.effective_max_gems` | number | Same for gems. |
| `total` | integer | Number of steps in the ladder. |
| `triggers[].trigger` | string | Every trigger the system supports, including ones already used. |
| `triggers[].label` | string | Its built-in name. |
| `triggers[].description` | string | Its built-in help text. |
| `triggers[].uses_threshold` | boolean | Whether it reads `threshold`. |
| `triggers[].threshold_unit` | string \| null | What its threshold counts. |
| `triggers[].threshold_template` | string \| null | Same template, for previewing a step you have not created yet. |
| `triggers[].repeatable` | boolean | Whether it accepts more than one step. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_referral_rule_id": "7c1f0a2e-9b34-4d67-8e02-3f5a1c9d4b88",
        "trigger": "offers_completed",
        "threshold": 10,
        "reward_coins": 1000,
        "reward_gems": 200,
        "label": "Friend completes 10 offers",
        "display_order": 0,
        "is_active": true,
        "created_at": "2026-08-29T07:12:04.118Z",
        "updated_at": "2026-08-29T07:12:04.118Z",
        "trigger_label": "Friend completes offers",
        "trigger_description": "Pays each time the friend reaches an offer count you set. Add one step per milestone — 1, 5, 10, 25 and so on.",
        "uses_threshold": true,
        "threshold_unit": "offers",
        "repeatable": true
      }
    ],
    "total": 1,
    "triggers": [
      {
        "trigger": "signup",
        "label": "Friend signs up",
        "description": "Pays the moment an invited friend creates their account with the code.",
        "uses_threshold": false,
        "threshold_unit": null,
        "repeatable": false
      },
      {
        "trigger": "kyc_verified",
        "label": "Friend completes KYC",
        "description": "Pays when the invited friend passes identity verification.",
        "uses_threshold": false,
        "threshold_unit": null,
        "repeatable": false
      },
      {
        "trigger": "first_withdrawal",
        "label": "Friend’s first withdrawal",
        "description": "Pays when the invited friend requests their first payout.",
        "uses_threshold": false,
        "threshold_unit": null,
        "repeatable": false
      },
      {
        "trigger": "offers_completed",
        "label": "Friend completes offers",
        "description": "Pays each time the friend reaches an offer count you set. Add one step per milestone — 1, 5, 10, 25 and so on.",
        "uses_threshold": true,
        "threshold_unit": "offers",
        "repeatable": true
      }
    ],
    "caps": {
      "max_coins_per_friend": 3000,
      "max_gems_per_friend": 0,
      "ladder_total_coins": 10800,
      "ladder_total_gems": 1800,
      "effective_max_coins": 3000,
      "effective_max_gems": 1800
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
  "timestamp": "2026-08-29T07:14:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].trigger` / `triggers[].trigger` | See the trigger reference below. | Six are single-event, six are repeatable. |

### Trigger reference

| Trigger | Kind | Threshold counts | Fires when |
|---|---|---|---|
| `signup` | single | — | The friend creates their account with the code. |
| `email_verified` | single | — | The friend confirms their email address. |
| `onboarding_completed` | single | — | The friend finishes the last onboarding step. |
| `kyc_verified` | single | — | The friend passes identity verification. |
| `first_withdrawal` | single | — | The friend requests their first payout. |
| `first_redeem` | single | — | The friend redeems their first gift card. |
| `offers_completed` | repeatable | `offers` | The friend's approved-offer count reaches the step's threshold. |
| `daily_checkins` | repeatable | `check-ins` | The friend's total check-in count reaches the threshold. |
| `streak_reached` | repeatable | `day streak` | The friend's consecutive-day streak reaches the threshold. |
| `withdrawals_completed` | repeatable | `withdrawals` | The friend's total withdrawal count reaches the threshold. |
| `redeems_completed` | repeatable | `gift cards` | The friend's total gift-card order count reaches the threshold. |
| `referrals_made` | repeatable | `invites` | The friend has themselves invited that many people — a second-level reward. |

A **single** trigger holds exactly one step; a **repeatable** one holds a step per threshold, which is what lets the ladder run long.

## Example

```bash
curl "$BASE/admin/referral-rules" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **How many steps a trigger holds depends on `repeatable`.** Six triggers are repeatable — add one step per milestone, each with its own threshold and reward — so a ladder of 15–20 rungs is normal. The six single-event triggers hold exactly one step each and should drop out of the "add step" picker once used. `POST` rejects a clash with `CZDREF005`.
- **Caps are the ceiling, the ladder is the plan.** `caps.effective_max_*` is what one friend can actually earn. When a cap is lower than the ladder total, a step that would cross it pays only the remainder and later steps pay nothing — `ladder_total_*` versus `effective_max_*` is how the panel warns about that.
- Ordered by `display_order`, then a built-in trigger order (signup → KYC → first withdrawal → offers), then `threshold`. Set `display_order` to override.
- Each step pays **once per invited friend**, enforced by a unique index on `(referral_id, rule_id)`. Reaching several milestones at once settles them all in one call — a friend jumping to 12 offers clears the 1, 5 and 10 steps together.
- Pausing a step with `is_active: false` stops future payouts but never claws back coins already paid.
- This replaced the old flat `referral_reward_coins` and `referral_qualify_offers` settings, which no longer exist. The migration carried their values across as the first `offers_completed` rule.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
