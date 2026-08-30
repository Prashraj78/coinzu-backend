# GET /api/admin/offerwall/partners

Lists every offerwall partner, inactive included, ranked highest first and paginated — the Partners tab table.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/offerwall/partners` |
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

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data[].cz_offerwall_partner_id` | string (uuid) | Partner id. |
| `data[].name` | string | Display name. |
| `data[].slug` | string | URL-safe id used in the postback path. |
| `data[].logo_url` | string \| null | Logo shown in the app and admin. |
| `data[].description` | string \| null | Short blurb. |
| `data[].click_url_template` | string | Offer URL opened in the app iframe, with `{USER_ID}` where the user id goes. |
| `data[].postback_method` | string | `get` or `post`. |
| `data[].postback_auth_type` | string | `token` or `hmac_sha256`. |
| `data[].postback_field_mapping` | object | Which field on the partner's postback carries each meaning. |
| `data[].coins_per_payout_unit` | integer | Coins credited per 1 unit of payout the partner sends. |
| `data[].revenue_share_percent` | integer \| null | Percent of the payout field passed to the user. `null` means the payout field is already the final amount. |
| `data[].rank` | integer | Higher shows first in the app. |
| `data[].badge_label` | string \| null | e.g. `Trending`, `Featured`. |
| `data[].is_active` | boolean | Whether the app lists it. |
| `data[].created_at` | string (date-time) | UTC. |
| `data[].updated_at` | string (date-time) | UTC. |
| `total` | integer | Total partner rows, all pages. |
| `active_count` | integer | Total partners with `is_active: true`, all pages — powers the "Active" stat tile. |

```json
{
  "success": true,
  "data": [
    {
      "cz_offerwall_partner_id": "2f8b41c9-6d05-4a77-9e12-8c4b0d75a361",
      "name": "AdGate Media",
      "slug": "adgate-media",
      "logo_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/offerwall-logos/17cc263c-a51d-41d8-b0c7-05fd6a5b31e4.png",
      "description": "Surveys, offers and app installs.",
      "click_url_template": "https://wall.adgatemedia.com/wall?userid={USER_ID}&app=coinzu",
      "postback_method": "post",
      "postback_auth_type": "hmac_sha256",
      "postback_field_mapping": {
        "user_id": "user_id",
        "external_transaction_id": "conversion_id",
        "offer_name": "campaign_name",
        "payout": "payout_amount",
        "status": "status",
        "approved_value": "approved",
        "reversed_value": "reversed"
      },
      "coins_per_payout_unit": 1,
      "revenue_share_percent": null,
      "rank": 100,
      "badge_label": "Trending",
      "is_active": true,
      "created_at": "2026-08-28T06:00:00.000Z",
      "updated_at": "2026-08-28T06:00:00.000Z"
    }
  ],
  "total": 1,
  "active_count": 1
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

| Field | Allowed values | Notes |
|---|---|---|
| `postback_method` | `get`, `post` | Which HTTP verb the partner calls the postback with. |
| `postback_auth_type` | `token`, `hmac_sha256` | How the postback is authenticated. |

## Example

```bash
curl "$BASE/admin/offerwall/partners?page=1&limit=20" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Unlike the app-facing `GET /api/offerwall`, this returns every partner regardless of `is_active`, so the admin table can show a toggle for hidden ones.
- `active_count` is computed over every partner, not just the current page, so the stat tile stays correct while paging.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
