# GET /api/referrals/invite

Everything the "Invite a Friend" screen needs: the signed-in user's shareable invite link and the reward/stats numbers shown on that screen.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/referrals/invite` |
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
| `referral_code` | string \| null | The code this user shares with friends. |
| `referral_link` | string \| null | The full shareable link — `<FRONTEND_URL>/ref/<referral_code>`. |
| `reward_steps` | object[] | **The reward ladder, in the order a friend clears it.** Render this as the "how it works" list — every step, what it needs and what it pays. Admin-editable, so never hardcode it. |
| `reward_steps[].step` | number | 1-based position in the ladder, for numbering the list. |
| `reward_steps[].cz_referral_rule_id` | string (uuid) | Stable id of the step. |
| `friends[].status` | `pending`, `qualified` | |
| `reward_steps[].trigger` | string | What the friend has to do. See [Enum values](#enum-values). |
| `reward_steps[].label` | string | Ready-to-render title, e.g. `Friend completes 10 offers`. Admin-written, falling back to the trigger's built-in name. |
| `reward_steps[].description` | string | Ready-to-render explanation of when the step pays. |
| `reward_steps[].threshold` | number \| null | How many of `threshold_unit` the friend needs. `null` on single-event steps. |
| `reward_steps[].threshold_unit` | string \| null | What the threshold counts, e.g. `offers`. `null` on single-event steps. |
| `reward_steps[].reward_coins` | number | Coins this step pays the referrer. |
| `reward_steps[].reward_gems` | number | Gems this step pays the referrer. A step may pay coins, gems, or both. |
| `max_per_friend` | object | The ceiling for the "earn up to X per friend" banner. |
| `max_per_friend.coins` | number | Most coins one friend can ever earn this user, after the admin's cap. |
| `max_per_friend.gems` | number | Most gems one friend can ever earn this user, after the admin's cap. |
| `max_per_friend.is_capped` | boolean | `true` when an admin cap bites — the ladder adds up to more than the ceiling allows. |
| `stats` | object | The user's real, live referral numbers. |
| `stats.friends_invited` | number | Everyone who signed up with this user's code. |
| `stats.friends_qualified` | number | How many of them have cleared at least one paying step. |
| `stats.coins_earned` | number | Coins this user has actually been paid by the referral programme, lifetime. |
| `stats.gems_earned` | number | Gems this user has actually been paid by the referral programme, lifetime. |
| `friends` | object[] | The people this user invited, newest first, capped at 20. |
| `friends[].cz_referral_id` | string (uuid) | Primary key of the referral. |
| `friends[].name` | string \| null | The friend's display name, `null` if they never set one. |
| `friends[].avatar_url` | string \| null | Their profile photo. |
| `friends[].status` | string | `pending` until they clear a paying step, then `qualified`. |
| `friends[].reward_coins` | number | Coins this friend has earned the referrer so far. |
| `friends[].qualified_at` | string (date-time) \| null | When they first cleared a paying step. |
| `friends[].joined_at` | string (date-time) | When they signed up with the code. |

```json
{
  "success": true,
  "data": {
    "referral_code": "AJSLE5XD",
    "referral_link": "https://app.coinzu.app/ref/AJSLE5XD",
    "reward_steps": [
      {
        "step": 1,
        "cz_referral_rule_id": "db5f97ce-2773-403c-997e-3e1462f4c1c5",
        "trigger": "signup",
        "label": "Friend signs up",
        "description": "Pays the moment an invited friend creates their account with the code.",
        "threshold": null,
        "threshold_unit": null,
        "reward_coins": 50,
        "reward_gems": 0
      },
      {
        "step": 2,
        "cz_referral_rule_id": "0afefab9-97c6-4df2-98a8-e4dd6a7f3863",
        "trigger": "kyc_verified",
        "label": "Friend completes KYC",
        "description": "Pays when the invited friend passes identity verification.",
        "threshold": null,
        "threshold_unit": null,
        "reward_coins": 250,
        "reward_gems": 0
      },
      {
        "step": 3,
        "cz_referral_rule_id": "17907aa6-b42a-49f2-9305-e40df2b3d694",
        "trigger": "offers_completed",
        "label": "Friend completes 5 offers",
        "description": "Pays each time the friend reaches an offer count you set. Add one step per milestone — 1, 5, 10, 25 and so on.",
        "threshold": 5,
        "threshold_unit": "offers",
        "reward_coins": 500,
        "reward_gems": 100
      }
    ],
    "max_per_friend": { "coins": 3000, "gems": 1800, "is_capped": true },
    "stats": {
      "friends_invited": 12,
      "friends_qualified": 5,
      "coins_earned": 2400,
      "gems_earned": 300
    },
    "friends": [
      {
        "cz_referral_id": "b81f0c2a-7d34-4e91-9a02-5c6d1e8f4a37",
        "name": "Asha",
        "avatar_url": null,
        "status": "qualified",
        "reward_coins": 325,
        "qualified_at": "2026-08-27T09:14:02.118Z",
        "joined_at": "2026-08-26T18:02:44.900Z"
      }
    ]
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
  "cz_error_description": "No Bearer token was provided in the Authorization header.",
  "cz_error_icon": "SignInRequiredIcon",
  "statusCode": 401,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `friends[].status` | `pending`, `qualified` | |
| `reward_steps[].trigger` | `signup`, `email_verified`, `onboarding_completed`, `kyc_verified`, `first_withdrawal`, `first_redeem`, `offers_completed`, `daily_checkins`, `streak_reached`, `withdrawals_completed`, `redeems_completed`, `referrals_made` | The six repeatable ones — `offers_completed`, `daily_checkins`, `streak_reached`, `withdrawals_completed`, `redeems_completed`, `referrals_made` — carry a `threshold` and can appear several times, once per milestone. See `../admin/024referral-rules.list.md` for what each fires on. |

## Example

```bash
curl http://localhost:4000/api/referrals/invite \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- **This is the only referral endpoint.** The screen's link, ladder, ceiling, counters and invited-friends list all come from this one call. The old `/summary`, `/tiers` and `/` list endpoints were removed because every field they returned is here or was superseded by `reward_steps`.
- `friends` is capped at the 20 most recent. It is meant for the screen's list, not for a full audit of the programme.

- **Render `reward_steps` as the screen's "how it works" list.** Each entry already carries a finished `label`, `description`, `threshold` and reward — assemble nothing client-side. An admin adding, editing, pausing or reordering a step in Configuration Settings → Referral rewards changes this response immediately, with no app release.
- The ladder is ordered the way a friend clears it: the admin's `display_order`, then signup → KYC → first withdrawal → offers milestones, then ascending threshold.
- A `trigger` can appear more than once. Six of the twelve are repeatable — offers, check-ins, streaks, withdrawals, gift cards and second-level invites — so the ladder is usually 10–20 rungs, not four.
- **Every step pays at most once per invited friend.** Reaching several milestones at once settles them together: a friend who jumps straight to 12 offers clears the 1, 5 and 10 steps in one go.
- `max_per_friend` is the honest ceiling, not the ladder total. When `is_capped` is `true` the admin's cap is lower than the ladder adds up to, so late steps pay a reduced amount or nothing — show `max_per_friend` in the banner rather than summing `reward_steps` yourself.
- A step can pay coins, gems, or both. Do not assume `reward_gems` is `0`.
- `stats` are real counts and real lifetime payouts, computed per request. They are no longer placeholders.
- An empty `reward_steps` array means the admin has not configured the programme yet — hide the rewards section rather than showing zeroes.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
