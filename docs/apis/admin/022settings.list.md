# GET /api/admin/settings

Every tunable platform setting, grouped, with its current value, its default and the bounds it accepts. The Configuration Settings tab is generated from this response.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/settings` |
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
| `data[].group` | string | Machine key of the group. One of the `group` enum values below. |
| `data[].label` | string | Group heading, e.g. `Currency & rates`. |
| `data[].description` | string | What the group controls. |
| `data[].settings[].setting_key` | `coins_per_usd`, `coins_per_gem`, `min_withdrawal_coins`, `withdrawal_requires_kyc`, `kyc_confidence_threshold`, `referral_max_coins_per_friend`, `referral_max_gems_per_friend`, `push_quiet_hours_start`, `push_quiet_hours_end` | The key to send back on `PATCH /api/admin/settings`. |
| `data[].settings[].setting_value` | string | Current value. **Always a string**, whatever `value_type` says. |
| `data[].settings[].default_value` | string | The value used when no row has been saved. |
| `data[].settings[].is_default` | boolean | `true` when no `app_settings` row exists yet and `default_value` is in force. |
| `data[].settings[].updated_at` | string (date-time) \| null | When it was last saved. `null` while `is_default` is `true`. |
| `data[].settings[].label` | string | Field label for the form. |
| `data[].settings[].description` | string | Help text explaining what the value does. |
| `data[].settings[].value_type` | string | How to parse and validate it. See [Enum values](#enum-values). |
| `data[].settings[].unit` | string \| undefined | Suffix to render after the input, e.g. `coins`. Absent for booleans. |
| `data[].settings[].min` | number \| undefined | Smallest accepted value. Absent for booleans. |
| `data[].settings[].max` | number \| undefined | Largest accepted value. Absent for booleans. |
| `total` | integer | Number of groups returned. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "group": "currency",
        "label": "Currency & rates",
        "description": "What a coin and a gem are worth. These drive the Wallet screen, Convert, and every payout.",
        "settings": [
          {
            "setting_key": "coins_per_usd",
            "setting_value": "1000",
            "default_value": "1000",
            "is_default": true,
            "updated_at": null,
            "group": "currency",
            "label": "Coins per USD",
            "description": "How many coins make one US dollar. Drives the cash value shown on the Wallet screen and the payout amount on every withdrawal.",
            "value_type": "integer",
            "unit": "coins",
            "min": 1,
            "max": 1000000
          },
          {
            "setting_key": "coins_per_gem",
            "setting_value": "0.025",
            "default_value": "0.025",
            "is_default": false,
            "updated_at": "2026-08-29T06:41:12.884Z",
            "group": "currency",
            "label": "Coins per gem",
            "description": "What one gem is worth in coins. May be fractional — 0.025 means 40 gems buy 1 coin. Drives both directions of Convert.",
            "value_type": "decimal",
            "unit": "coins",
            "min": 0.000001,
            "max": 1000000
          }
        ]
      }
    ],
    "total": 3
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
  "timestamp": "2026-08-29T06:43:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].group` | `currency`, `withdrawals`, `referrals`, `notifications` | One subtab of the Configuration Settings tab each. |
| `data[].settings[].value_type` | `integer`, `decimal`, `boolean` | `integer` rejects decimals; `decimal` accepts them; `boolean` accepts only the strings `"true"` and `"false"`. |
| `data[].settings[].setting_key` | `coins_per_usd`, `coins_per_gem`, `min_withdrawal_coins`, `withdrawal_requires_kyc`, `kyc_confidence_threshold`, `referral_max_coins_per_friend`, `referral_max_gems_per_friend`, `push_quiet_hours_start`, `push_quiet_hours_end` | The full catalogue. A key not listed here is rejected by `PATCH` with `CZDADM004`. |

## Example

```bash
curl "$BASE/admin/settings" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **The `rewards` group is gone.** The daily chest reward and the free scratch allowance moved to `PATCH /api/admin/daily/config`; `checkin_base_coins`, `daily_spin_limit` and the two streak targets were retired outright. Sending any of those keys to `PATCH /api/admin/settings` returns `CZDADM004`.
- The `notifications` group holds the push quiet-hours window: `push_quiet_hours_start` and `push_quiet_hours_end`, each an hour of the user's own day, `0`–`23`. Marketing pushes that opt into quiet hours are held back for anyone whose local time falls inside it; `transaction` and `system` messages ignore it. A window that wraps midnight (22 → 8) is normal, and setting both to the same hour switches quiet hours off platform-wide.
- Every value is a **string** on the wire, including numbers and booleans, because `app_settings.setting_value` is a text column. Parse using `value_type`.
- A setting with `is_default: true` has no database row at all — the value comes from `SettingDefaults` in code. Saving it once creates the row and flips the flag.
- Render the form from this response rather than hard-coding fields: `label`, `description`, `unit`, `min` and `max` are the whole spec, so a new setting appears in the panel with no frontend change.
- `coins_per_gem` is deliberately allowed to be fractional. At `0.025`, 40 gems buy 1 coin and 12,000 gems convert to 300 coins.
- Values are cached in the API for 30 seconds, but a successful `PATCH` clears that cache immediately, so a saved change reaches the app on its next request.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
