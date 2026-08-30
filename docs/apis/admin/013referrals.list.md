# GET /api/admin/referrals

Every user with their referral code, invite counts, and coins earned from referrals — the Refer & Earn tab table. Paginated, newest account first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/referrals` |
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
| `page` | integer | no | 1-based page number. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `search` | string | no | Case-insensitive substring match against `email`, `name`, or `referral_code`. Omit to list everyone. |
| `date_from` | string (date) | no | Only users who joined on/after this UTC date (inclusive), `yyyy-MM-dd`. |
| `date_end` | string (date) | no | Only users who joined on/before this UTC date (inclusive), `yyyy-MM-dd`. |
| `has_referrals` | boolean | no | `true` keeps only users who invited at least one friend; `false` keeps only users who invited nobody. Omit to list everyone — the default. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_user_id` | string (uuid) | The user's id — use this to open the detail page, `GET /api/admin/referrals/:cz_user_id`. |
| `data[].email` | string | Account email. |
| `data[].name` | string \| null | Display name. |
| `data[].referral_code` | string | The code this user shares with friends. |
| `data[].friends_invited` | number | Everyone who signed up with this user's code. |
| `data[].qualified_invites` | number | How many of them cleared the activation bar and paid out. |
| `data[].coins_earned` | number | Sum of `reward_coins` across every referral this user made, qualified or not (unqualified rows are always `0`). |
| `data[].gems_earned` | number | Always `0`. There is no gem reward wired into the referral programme yet. |
| `data[].joined_at` | string (date-time) | When this user's own account was created. |
| `total` | integer | Total user rows, all pages. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_user_id": "f2eae717-1142-4c8b-b9d5-09d495d7b217",
        "email": "shubham@coinzu.app",
        "name": "Shubham",
        "referral_code": "AJSLE5XD",
        "friends_invited": 12,
        "qualified_invites": 5,
        "coins_earned": 2500,
        "gems_earned": 0,
        "joined_at": "2026-08-20T10:11:02.000Z"
      }
    ],
    "total": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header missing. | `SignInRequiredIcon` |
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
  "timestamp": "2026-08-28T07:43:04.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl "$BASE/admin/referrals?page=1&limit=20&search=shubham&date_from=2026-08-01&date_end=2026-08-29" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Every user is listed by default, including those with `friends_invited: 0` — this is the full user base viewed through the referral lens, not just active referrers. `search` and the date filters narrow that same full list; only `has_referrals` restricts it to referrers (or to non-referrers).
- `friends_invited`/`qualified_invites`/`coins_earned` are real, computed counts — unlike the app-facing `GET /api/referrals/invite`, whose stats are a static placeholder by product decision.
- `date_from`/`date_end` filter on `joined_at`, both inclusive, in UTC, and combine with `search` as `AND`.
- Tap a row's `cz_user_id` to open `GET /api/admin/referrals/:cz_user_id` for that user's full invite list.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
