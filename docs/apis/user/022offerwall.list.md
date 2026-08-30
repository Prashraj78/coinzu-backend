# GET /api/offerwall

Returns every active offerwall, ranked, with the signed-in user's id already appended into each partner's own click URL.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/offerwall` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | default (120/min) |

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
| `data[].cz_offerwall_partner_id` | string (uuid) | The partner's id. |
| `data[].name` | string | Partner display name. |
| `data[].logo_url` | string \| null | Logo shown as the tappable tile. |
| `data[].description` | string \| null | Short blurb shown under the logo. |
| `data[].badge_label` | string \| null | Admin-set badge, e.g. `Trending`, `Featured`. `null` when the partner has none. |
| `data[].rank` | integer | Higher ranks appear first. The array is already sorted by this. |
| `data[].offer_url` | string | Where to open the iframe when the user taps the logo — the partner's `click_url_template` with `{USER_ID}` replaced by the caller's `cz_user_id`. |
| `total` | integer | Row count. |

```json
{
  "success": true,
  "data": [
    {
      "cz_offerwall_partner_id": "2f8b41c9-6d05-4a77-9e12-8c4b0d75a361",
      "name": "AdGate Media",
      "logo_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/offerwall-logos/adgate.png",
      "description": "Surveys, offers and app installs.",
      "badge_label": "Trending",
      "rank": 100,
      "offer_url": "https://wall.adgatemedia.com/wall?userid=e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361&app=coinzu"
    }
  ],
  "total": 1
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
curl http://localhost:4000/api/offerwall \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Only `is_active: true` partners are returned. An admin hides a partner from the app by deactivating it — no delete.
- Ordering is by `rank` descending, then `name` ascending as a tiebreaker.
- `offer_url` is built fresh on every call — a partner's `click_url_template` can change at any time with no client update needed.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
