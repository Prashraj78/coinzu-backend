# GET /api/admin/achievements/:slug/users

The users who hold one medal — or, with `state=in_progress`, the ones still working towards it. Filterable and paginated.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/achievements/:slug/users` |
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
| `slug` | string | yes | The medal, e.g. `first-blood`. From `GET /api/admin/achievements`. |
| `page` | integer | no | 1-based page number. Default `1`. |
| `limit` | integer | no | Rows per page, max 100. Default `20`. |
| `search` | string | no | Case-insensitive match against the user's email or name. |
| `state` | string | no | `unlocked` (default) or `in_progress`. |
| `country` | string | no | ISO-3166 alpha-2 code. |
| `tier` | string | no | One loyalty tier. See [Enum values](#enum-values). |
| `kyc_status` | string | no | One KYC state. |
| `status` | string | no | One account status. |
| `date_from` | string (date) | no | Unlocked on/after this UTC date, `yyyy-MM-dd`. |
| `date_end` | string (date) | no | Unlocked on/before this UTC date, inclusive. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `medal.slug` | string | The medal this list is for. |
| `medal.title` | string | Its name. |
| `medal.emoji` | string \| null | Printed next to the name. |
| `medal.description` | string \| null | What earns it. |
| `medal.icon_url` | string \| null | Transparent PNG on R2. |
| `medal.rarity` | string | See [Enum values](#enum-values). |
| `medal.points` | integer | Engagement score. Medals never pay coins or gems. |
| `medal.criteria_type` | string | What is counted. |
| `medal.criteria_value` | integer | How many are needed. |
| `data[].cz_user_id` | string (uuid) | Links to `GET /api/admin/users/:cz_user_id`. |
| `data[].email` | string | Their email. |
| `data[].name` | string \| null | Their display name. |
| `data[].avatar_url` | string \| null | Their profile photo. |
| `data[].country` | string \| null | ISO country code. |
| `data[].tier` | string | Loyalty tier. |
| `data[].kyc_status` | string | KYC state. |
| `data[].status` | string | Account status. |
| `data[].joined_at` | string (date-time) | When they registered. |
| `data[].progress` | integer | How far along. |
| `data[].target` | integer | Same as `medal.criteria_value`, repeated for convenience. |
| `data[].progress_label` | string | Ready to print, e.g. `2/10`. |
| `data[].unlocked_at` | string (date-time) \| null | When they earned it. `null` while in progress. |
| `data[].is_unlocked` | boolean | Earned. |
| `total` | integer | Users matching the filters, all pages. |

```json
{
  "success": true,
  "data": {
    "medal": {
      "slug": "champion",
      "title": "Champion",
      "emoji": "👑",
      "description": "Complete 10 withdrawals.",
      "icon_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/achievements/champion.png",
      "rarity": "epic",
      "points": 250,
      "criteria_type": "withdrawal_completed",
      "criteria_value": 10
    },
    "data": [
      {
        "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
        "email": "prashantrajputaaaa@gmail.com",
        "name": "Prashant",
        "avatar_url": null,
        "country": "IN",
        "tier": "silver",
        "kyc_status": "verified",
        "status": "active",
        "joined_at": "2026-07-02T11:20:00.000Z",
        "progress": 2,
        "target": 10,
        "progress_label": "2/10",
        "unlocked_at": null,
        "is_unlocked": false
      }
    ],
    "total": 1
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `state`, `tier`, `kyc_status` or `status` is not one of the allowed values. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDCOMM004` | We could not find what you were looking for. | No medal exists with that slug. | `NotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM004",
  "cz_error_message": "We could not find what you were looking for.",
  "cz_error_description": "No medal exists with the slug \"nope\".",
  "cz_error_icon": "NotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-30T06:31:44.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `state` | `unlocked`, `in_progress` | Default `unlocked`. `in_progress` means progress above zero but not finished. |
| `tier` / `data[].tier` | `silver`, `gold`, `platinum`, `diamond` | |
| `kyc_status` / `data[].kyc_status` | `none`, `pending`, `verified`, `rejected`, `manual_review` | |
| `status` / `data[].status` | `active`, `suspended`, `banned`, `deleted` | |
| `medal.rarity` | `common`, `rare`, `epic`, `rarest` | |

## Example

```bash
# Who holds it
curl "$BASE/admin/achievements/verified/users?page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Who is close to it
curl "$BASE/admin/achievements/champion/users?state=in_progress" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'

# Indian holders who passed KYC, unlocked this month
curl "$BASE/admin/achievements/first-blood/users?country=IN&kyc_status=verified&date_from=2026-08-01" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **`state` changes what the list means.** `unlocked` is who has it; `in_progress` is who is part-way there — the more useful view when deciding whether a medal is set too high.
- Holders are ordered by `unlocked_at` descending, so the newest unlock is first. In-progress rows sort by progress instead, since they have no unlock date.
- `date_from` / `date_end` filter on `unlocked_at`, so they narrow nothing while `state=in_progress`.
- `data[].progress` is capped at the target, so a user with 300 completed offers reads `250/250` on a 250-offer medal.
- The medal itself is repeated in every response so the screen can render its header without a second call.
- All dates and times are UTC, ISO-8601 with a `Z` suffix.
