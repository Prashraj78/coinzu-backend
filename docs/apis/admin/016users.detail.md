# GET /api/admin/users/:cz_user_id

One user's full profile — wallet, KYC, referral stats, and recent activity — the detail page a row on `GET /api/admin/users` or `GET /api/admin/referrals` navigates to.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/users/:cz_user_id` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `cz_user_id` | string (uuid) | yes | The user's id, from a `GET /api/admin/users` or `GET /api/admin/referrals` row. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `user.cz_user_id` | string (uuid) | The user's id. |
| `user.email` | string | Account email. |
| `user.phone` | string \| null | Account phone. |
| `user.google_id` | string \| null | Set if the account was created or linked via Google sign-in. |
| `user.name` | string \| null | Display name. |
| `user.gender` | string \| null | Free text, from onboarding. |
| `user.age_range` | string \| null | Onboarding age bracket. |
| `user.country` | string \| null | ISO country code. |
| `user.avatar_url` | string \| null | Profile photo. |
| `user.interests` | string[] | Free-text interests picked in onboarding. |
| `user.primary_goal` | string \| null | Free text, from onboarding. |
| `user.referral_code` | string | The code this user shares with friends. |
| `user.referred_by` | string (uuid) \| null | The `cz_user_id` of whoever referred this user, if any. See `referred_by` below for their email/name. |
| `user.tier` | string | Loyalty tier. |
| `user.kyc_status` | string | Identity check state. |
| `user.profile_completion_pct` | number | 0–100. |
| `user.role` | string | `user` — admins are Rewardtym tokens, never a row here. |
| `user.status` | string | Account state. |
| `user.onboarding_completed` | boolean | Whether onboarding finished. |
| `user.notifications_enabled` | boolean | Push notification preference. |
| `user.email_verified_at` | string (date-time) \| null | When the email was verified, if it has been. |
| `user.phone_verified_at` | string (date-time) \| null | Always `null` today — phone OTP is retired. |
| `user.last_login_at` | string (date-time) \| null | Last sign-in. |
| `user.created_at` | string (date-time) | When the account was created. |
| `user.updated_at` | string (date-time) | Last profile update. |
| `wallet.coin_balance` | number | Current coin balance. |
| `wallet.gem_balance` | number | Current gem balance. |
| `wallet.updated_at` | string (date-time) | When the wallet last moved. |
| `kyc.kyc_status` | string | Same value as `user.kyc_status`, repeated for convenience. |
| `kyc.latest_attempt` | object \| null | The most recent `kyc_verifications` row, or `null` if never attempted. |
| `kyc.reason_code` | string \| null | Machine-readable rejection reason for the latest attempt. |
| `kyc.reason` | string \| null | Human-readable rejection reason for the latest attempt. |
| `kyc.can_retry` | boolean | Whether the user may submit another selfie. |
| `referral_summary.referral_code` | string | Same value as `user.referral_code`, repeated for convenience. |
| `referral_summary.total_invited` | number | Everyone who signed up with this user's code. |
| `referral_summary.total_qualified` | number | How many of them cleared the activation bar and paid out. |
| `referral_summary.milestones[].invites_required` | number | Invites needed to unlock this milestone. |
| `referral_summary.milestones[].reward_type` | string | What the milestone pays out. |
| `referral_summary.milestones[].reward_value` | number | The milestone's reward amount, in its `reward_type` unit. |
| `referral_summary.milestones[].reward_coins` | number | The milestone's reward, expressed in coins. |
| `referral_summary.milestones[].is_unlocked` | boolean | Whether `total_qualified` has reached `invites_required`. |
| `earning_summary.coins_earned` | number | Lifetime coins credited, across every source. |
| `earning_summary.coins_spent` | number | Lifetime coins debited (withdrawals, redeems, conversions), as a positive number. |
| `earning_summary.gems_earned` | number | Lifetime gems credited. |
| `earning_summary.transaction_count` | integer | Total `wallet_transactions` rows for this user. |
| `earning_summary.last_activity_at` | string (date-time) \| null | When the wallet last moved. `null` if it never has. |
| `earning_summary.by_source[].source_type` | string | Where the coins came from. Same vocabulary as `recent_wallet_transactions.data[].source_type`. |
| `earning_summary.by_source[].coins` | number | Coins earned from that source, lifetime. |
| `earning_summary.by_source[].count` | integer | How many credits came from that source. |
| `devices.data[].cz_device_id` | string (uuid) | Primary key of the install. |
| `devices.data[].device_id` | string | The app-supplied install id. |
| `devices.data[].platform_type` | string | `ios`, `android` or `web`. |
| `devices.data[].fingerprint` | string \| null | `sha256(user_agent\|asn\|platform_type\|device_id)` — a coarse fraud-matching signal, not a true device fingerprint. |
| `devices.data[].ip_address` | string \| null | Last IP seen for this install, server-derived. |
| `devices.data[].country_code` | string \| null | ISO country resolved from that IP. |
| `devices.data[].asn` | string \| null | Autonomous system number of the IP. |
| `devices.data[].isp` | string \| null | Network operator behind the IP. |
| `devices.data[].is_vpn` | boolean | Whether the IP resolved to a VPN or proxy. |
| `devices.data[].user_agent` | string \| null | Raw user agent last seen. |
| `devices.data[].push_token` | string \| null | Push notification token, when registered. |
| `devices.data[].device_info` | object | Free-form, app-supplied: `app_version`, `os_version`, `model`, `brand`, `locale`, `timezone` and similar. Keys are not guaranteed. |
| `devices.data[].last_seen_at` | string (date-time) | Last sign-in from this install. |
| `devices.data[].created_at` | string (date-time) | When the install was first registered. |
| `devices.total` | integer | How many installs this user has signed in from. Not paginated — every device is returned. |
| `referred_by.cz_user_id` | string (uuid) | Only present if `user.referred_by` is set. |
| `referred_by.email` | string | The referrer's email. |
| `referred_by.name` | string \| null | The referrer's display name. |
| `referred_by` | null | `null` if this user was not referred by anyone. |
| `recent_wallet_transactions.data[]` | array | The 20 most recent `wallet_transactions` rows, newest first. See `../user/012wallet.transactions.md` for the row shape. |
| `recent_wallet_transactions.total` | integer | Total wallet transactions for this user, all pages. |
| `recent_withdrawals.data[]` | array | The 20 most recent `withdrawal_requests` rows, newest first. See `../inprogress/002wallet.withdrawals.list.md` for the row shape. |
| `recent_withdrawals.total` | integer | Total withdrawal requests for this user, all pages. |
| `recent_redeem_orders.data[]` | array | The 20 most recent gift card orders, newest first, each merged with `brand`/`denomination`/`image_url` from its product. Same row shape as `../inprogress/033redeem.orders.list.md`. |
| `recent_redeem_orders.total` | integer | Total gift card orders for this user, all pages. |

```json
{
  "success": true,
  "data": {
    "user": {
      "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
      "email": "prashantrajputaaaa@gmail.com",
      "phone": null,
      "google_id": null,
      "name": "Prashant",
      "gender": null,
      "age_range": null,
      "country": null,
      "avatar_url": null,
      "interests": [],
      "primary_goal": null,
      "referral_code": "5VYYWDEA",
      "referred_by": null,
      "tier": "silver",
      "kyc_status": "none",
      "profile_completion_pct": 29,
      "role": "user",
      "status": "active",
      "onboarding_completed": false,
      "notifications_enabled": false,
      "email_verified_at": "2026-08-28T15:32:41.358Z",
      "phone_verified_at": null,
      "last_login_at": null,
      "created_at": "2026-08-28T15:27:07.831Z",
      "updated_at": "2026-08-28T15:33:19.102Z"
    },
    "wallet": {
      "coin_balance": 0,
      "gem_balance": 0,
      "updated_at": "2026-08-28T15:27:08.430Z"
    },
    "kyc": {
      "kyc_status": "none",
      "latest_attempt": null,
      "reason_code": null,
      "reason": null,
      "can_retry": true
    },
    "referral_summary": {
      "referral_code": "5VYYWDEA",
      "total_invited": 0,
      "total_qualified": 0,
      "milestones": []
    },
    "earning_summary": {
      "coins_earned": 0,
      "coins_spent": 0,
      "gems_earned": 0,
      "transaction_count": 0,
      "last_activity_at": null,
      "by_source": []
    },
    "devices": {
      "data": [
        {
          "cz_device_id": "b41c8a3e-9f27-4d10-bb52-6e0c3a8d1f44",
          "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
          "device_id": "8F2A1C90-4B7E-11EF-9C21-0242AC120002",
          "platform_type": "android",
          "fingerprint": "9c1e7f0b2a5d8341e6b0c2f4a7d9e13b5c8f0a2d4e6b8c0f2a4d6e8b0c2f4a6d",
          "ip_address": "203.0.113.42",
          "country_code": "IN",
          "asn": "AS55836",
          "isp": "Reliance Jio Infocomm",
          "is_vpn": false,
          "user_agent": "Coinzu/1.4.2 (Android 14; Pixel 7)",
          "push_token": null,
          "device_info": {
            "app_version": "1.4.2",
            "os_version": "14",
            "model": "Pixel 7",
            "brand": "Google",
            "locale": "en-IN",
            "timezone": "Asia/Kolkata"
          },
          "last_seen_at": "2026-08-28T15:33:19.102Z",
          "created_at": "2026-08-28T15:27:07.831Z",
          "updated_at": "2026-08-28T15:33:19.102Z"
        }
      ],
      "total": 1
    },
    "referred_by": null,
    "recent_wallet_transactions": { "data": [], "total": 0 },
    "recent_withdrawals": { "data": [], "total": 0 },
    "recent_redeem_orders": { "data": [], "total": 0 }
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDUSER002` | We could not find that account. | No user exists with that `cz_user_id`. | `AccountNotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDUSER002",
  "cz_error_message": "We could not find that account.",
  "cz_error_description": "No user exists for the given identifier.",
  "cz_error_icon": "AccountNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T04:26:06.810Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `user.tier` | `silver`, `gold`, `platinum`, `diamond` | Ordered lowest to highest. |
| `user.kyc_status` / `kyc.kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | |
| `user.role` | `user`, `admin` | Always `user` on this endpoint. |
| `user.status` | `active`, `suspended`, `banned`, `deleted` | |
| `kyc.reason_code` | `CZDKYC004`, `CZDKYC005`, `null` | `CZDKYC004` = no face found, `CZDKYC005` = more than one face found, `null` = not an automatic rejection. |
| `recent_wallet_transactions.data[].currency` | `coin`, `gem` | |
| `recent_wallet_transactions.data[].type` | `earn`, `spend`, `withdrawal`, `convert_in`, `convert_out`, `reversal` | |
| `recent_wallet_transactions.data[].source_type` | `offer`, `daily_checkin`, `referral`, `game`, `streak`, `withdrawal`, `redeem`, `lucky_draw`, `achievement`, `challenge`, `convert`, `admin_adjustment`, `offerwall` | |
| `recent_withdrawals.data[].method` | `paypal`, `bank`, `crypto` | |
| `recent_withdrawals.data[].status` | `pending`, `approved`, `rejected`, `paid` | |
| `recent_redeem_orders.data[].status` | `pending`, `fulfilled`, `failed` | |
| `devices.data[].platform_type` | `ios`, `android`, `web` | |
| `earning_summary.by_source[].source_type` | `offer`, `daily_checkin`, `referral`, `game`, `streak`, `withdrawal`, `redeem`, `lucky_draw`, `achievement`, `challenge`, `convert`, `admin_adjustment`, `offerwall` | Only sources that actually credited this user appear. |

## Example

```bash
curl "$BASE/admin/users/ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- This composes the per-user queries every module already owns (profile, wallet, KYC status, referral summary, earning summary, devices, recent wallet transactions, recent withdrawals, recent redeem orders) into one response.
- `devices` is the fraud surface: install id, IP, ASN, ISP, VPN flag, coarse fingerprint and user agent, one row per install. `fingerprint` hashes user agent, ASN, platform and device id — treat two accounts sharing one as a signal, not proof.
- `earning_summary.by_source` is a grouped aggregate over the whole ledger, so it stays correct no matter how long the history is — unlike the capped `recent_*` lists, which only show the newest rows.
- The three activity lists are capped at the 20 most recent rows each and are not paginated on this endpoint — a user with thousands of transactions still returns a bounded payload. Use the app-facing list endpoints (`../user/012wallet.transactions.md`, `../inprogress/002wallet.withdrawals.list.md`, `../inprogress/033redeem.orders.list.md`) with this user's token for the full history, or add pagination here if the panel needs it later.
- `recent_withdrawals.data[].destination_details_encrypted` is returned as ciphertext, same as `../inprogress/002wallet.withdrawals.list.md` — the panel should show `method` instead.
- `recent_redeem_orders.data[]` never includes `redeemed_code_encrypted` — that column is `select: false` on the entity and is excluded even here.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
