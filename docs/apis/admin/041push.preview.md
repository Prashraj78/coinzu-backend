# POST /api/admin/push/preview

Who an audience actually reaches, and who drops out on the way — without sending anything. Powers the live reach counter in the composer.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/push/preview` |
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

Every field is optional and every one combines as `AND`. An empty body `{}` means everyone with a live push token, treated as an `announcement` with quiet hours respected.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `cz_user_ids` | string[] | no | Up to 1000 uuids. | Target exactly these users. |
| `countries` | string[] | no | Up to 250, each exactly 2 characters. | ISO-3166 alpha-2 codes. Matched against the profile country, falling back to the device's own geo. |
| `platforms` | string[] | no | See [Enum values](#enum-values). | Device platforms. |
| `statuses` | string[] | no | See [Enum values](#enum-values). | Account statuses. |
| `kyc_statuses` | string[] | no | See [Enum values](#enum-values). | KYC statuses. |
| `tiers` | string[] | no | See [Enum values](#enum-values). | Loyalty tiers. |
| `min_coins` | integer | no | ≥ 1. | Lifetime coins earned, at least this many. |
| `category` | string | no | Default `announcement`. | What the message is about. Users who muted this category drop out. |
| `respect_quiet_hours` | boolean | no | Default `true`. | Leave out anyone whose local time is inside the platform quiet hours. |

```json
{
  "countries": ["IN", "US"],
  "platforms": ["android", "ios"],
  "category": "promotion",
  "respect_quiet_hours": true
}
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `targeted_users` | integer | Distinct users this reaches after consent and quiet hours. The number that actually gets pushed. |
| `targeted_devices` | integer | Distinct live push tokens it reaches. One user can hold several. |
| `matched_users` | integer | Users who matched the filters **before** consent and quiet hours were applied. |
| `skipped_muted` | integer | Of those, how many muted this category. |
| `skipped_quiet_hours` | integer | Of those, how many are currently inside their quiet hours. |
| `by_platform[].platform` | string | Device platform. See [Enum values](#enum-values). |
| `by_platform[].devices` | integer | Live tokens on that platform inside the final audience. |
| `category` | string | The category this count was computed for. Echoes the request, or `announcement`. |
| `quiet_hours.start` | integer | Hour of the user's own day when quiet hours begin, 0–23. From platform settings. |
| `quiet_hours.end` | integer | Hour when they lift, 0–23. |
| `quiet_hours.applied` | boolean | `false` when the category always delivers, the request opted out, or start equals end. |
| `firebase_configured` | boolean | `false` when Firebase credentials are missing, so a send would be a dry run. |

```json
{
  "success": true,
  "data": {
    "targeted_users": 3,
    "targeted_devices": 3,
    "matched_users": 5,
    "skipped_muted": 1,
    "skipped_quiet_hours": 1,
    "by_platform": [
      { "platform": "android", "devices": 1 },
      { "platform": "ios", "devices": 1 },
      { "platform": "web", "devices": 1 }
    ],
    "category": "promotion",
    "quiet_hours": { "start": 22, "end": 8, "applied": true },
    "firebase_configured": true
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation (bad uuid, country code not 2 characters, unknown platform or category), or an unknown field was sent. | `ValidationFailedIcon` |
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
  "cz_error_description": "each value in countries must be exactly 2 characters",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-29T09:24:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `category` | `announcement`, `promotion`, `reward`, `transaction`, `system` | `transaction` and `system` cannot be muted and ignore quiet hours, so their `skipped_*` counts are always `0`. |
| `platforms[]` / `by_platform[].platform` | `ios`, `android`, `web` | Same values as the `platform` enum in `docs/ENUMS.md`. |
| `statuses[]` | `active`, `suspended`, `banned`, `deleted` | Only `active` accounts are ever reached, whatever this says — the filter can narrow that set but never widen it. |
| `kyc_statuses[]` | `none`, `pending`, `verified`, `rejected`, `manual_review` | |
| `tiers[]` | `silver`, `gold`, `platinum`, `diamond` | |

## Example

```bash
# Everyone with a live push token
curl -X POST "$BASE/admin/push/preview" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{}'

# A promotion to Android and iOS in India or the US
curl -X POST "$BASE/admin/push/preview" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "countries": ["IN","US"], "platforms": ["android","ios"], "category": "promotion" }'

# A payout notice — nobody can mute it and the hour does not matter
curl -X POST "$BASE/admin/push/preview" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "category": "transaction" }'
```

## Notes

- Read-only. It never writes a campaign, never queues anything, and is safe to call on every keystroke — the composer debounces it by 300 ms.
- `matched_users − skipped_muted − skipped_quiet_hours = targeted_users`. That is the whole drop-off, and it is what the composer shows under the reach number.
- Only devices with a non-empty `push_token` on an `active` account are counted, so the number is the real reach and not the registered-user count.
- Filters are `AND`, values inside one filter are `OR`. `countries: ["IN","US"], platforms: ["android"]` means Android devices in India **or** the United States.
- Country matching is `COALESCE(profile country, device country)`, so a user who never set a country is still reachable through the geo recorded on their device.
- `min_coins` sums lifetime `earn` coin transactions; it does not read the current balance, so spending coins never drops a user out of the audience.
- Quiet hours are evaluated per device against the IANA timezone the app reported in `device_info.timezone`. A device that never sent one is treated as UTC. A user who set `quiet_hours: false` in their own preferences is never held back.
- `quiet_hours.start` and `.end` come from the `push_quiet_hours_start` / `push_quiet_hours_end` settings, tunable under Configuration Settings → Notifications. A window that wraps midnight (22 → 8) is normal; setting both to the same hour switches quiet hours off platform-wide.
