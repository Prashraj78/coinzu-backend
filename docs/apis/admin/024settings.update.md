# PATCH /api/admin/settings

Saves one or more platform settings in a single call. Every item is validated against the catalogue **before** anything is written, so a bad value leaves all settings untouched.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/settings` |
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
| `settings` | array | yes | 1–50 items, no duplicate `setting_key`. | The settings to save. Send only what changed. |
| `settings[].setting_key` | string | yes | Max 80 chars, must exist in the catalogue. | Key from `GET /api/admin/settings`. |
| `settings[].setting_value` | string | yes | Max 255 chars, must satisfy the key's `value_type`, `min` and `max`. | Always a string — `"12"`, `"0.025"` or `"true"`. |

```json
{
  "settings": [
    { "setting_key": "coins_per_gem", "setting_value": "0.025" },
    { "setting_key": "coins_per_usd", "setting_value": "1000" }
  ]
}
```

## Response

### Success — `200`

Returns the **full refreshed catalogue**, identical in shape to `GET /api/admin/settings`, so the form can re-hydrate from the response without a second call.

| Field | Type | Description |
|---|---|---|
| `data[]` | array | Every group with its settings. See `022settings.list.md` for the full field list. |
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
| 404 | `CZDADM004` | We could not find that setting. | A `setting_key` has no catalogue entry. `cz_error_description` names it. | `SettingNotFoundIcon` |
| 400 | `CZDADM005` | Please check the value you entered and try again. | A value is the wrong type, outside its `min`/`max`, or a `setting_key` appears twice. `cz_error_description` names the key and the reason. | `ValidationFailedIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `settings` is missing, empty, over 50 items, or an item is missing a field. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDADM005",
  "cz_error_message": "Please check the value you entered and try again.",
  "cz_error_description": "\"kyc_confidence_threshold\": must be at most 100.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-29T06:44:17.672Z"
}
```

## Enum values

Same as `022settings.list.md` — `setting_key`, `value_type` and `group` share one catalogue.

| Field | Allowed values | Notes |
|---|---|---|
| `settings[].setting_value` (booleans) | `"true"`, `"false"` | Exact lowercase strings. `"1"`, `"yes"` and `"True"` are all rejected. |

## Example

```bash
curl -X PATCH $BASE/admin/settings \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "settings": [
      { "setting_key": "coins_per_gem", "setting_value": "0.025" },
      { "setting_key": "withdrawal_requires_kyc", "setting_value": "true" }
    ]
  }'
```

## Notes

- **All or nothing on validation.** Every item is checked first; the first failure aborts the whole call and nothing is written. The writes themselves are sequential upserts, not one transaction — validation is what keeps a half-applied save from happening in practice.
- Saving a value equal to its default still creates a row; `is_default` flips to `false` and `updated_at` is set. That is intentional — it records that an admin confirmed the value.
- A successful save clears the 30-second settings cache immediately, so the change reaches the app and every other endpoint on the next request. No restart, no release.
- Changing `coins_per_usd` re-prices **every** future withdrawal, and changing `coins_per_gem` re-prices Convert in both directions. Neither touches balances or history already recorded.
- `cz_error_description` always names the offending key and why it failed, so the panel can highlight the exact field.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
