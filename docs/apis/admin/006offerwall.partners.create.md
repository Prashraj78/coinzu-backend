# POST /api/admin/offerwall/partners

Onboards a new offerwall partner — the "Add partner" action on the Partners tab.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/offerwall/partners` |
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

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `name` | string | yes | max 120 chars | Display name. |
| `slug` | string | yes | `^[a-z0-9-]{2,60}$`, unique | URL-safe id, used in the postback path. |
| `logo_url` | string | no | max 500 chars | Logo shown in the app and admin. Upload via [063](010offerwall.partners.upload-logo.md) first, then send the returned URL here. |
| `description` | string | no | — | Short blurb. |
| `click_url_template` | string | yes | contains `{USER_ID}` | Opened inside the app's iframe on click. `{USER_ID}` is replaced with `cz_user_id`. |
| `postback_method` | string | no | `get` or `post`, default `get` | Which verb the partner calls the postback with. |
| `postback_auth_type` | string | no | `token` or `hmac_sha256`, default `token` | How the postback is authenticated. |
| `postback_secret` | string | no | max 100 chars, auto-generated (32 hex chars) when omitted | Path token (mode `token`) or HMAC key (mode `hmac_sha256`). |
| `postback_field_mapping` | object | yes | below | Which field on the partner's postback carries each meaning. |
| `postback_field_mapping.user_id` | string | yes | max 60 chars | Field carrying our `cz_user_id`. |
| `postback_field_mapping.external_transaction_id` | string | yes | max 60 chars | Field carrying the partner's transaction id. |
| `postback_field_mapping.offer_name` | string | no | max 60 chars | Field carrying the offer's name, if the partner sends one. |
| `postback_field_mapping.milestone_name` | string | no | max 60 chars | Field carrying which milestone/goal was just completed, for multi-step offers. |
| `postback_field_mapping.payout` | string | no | max 60 chars | Field carrying the reward amount. |
| `postback_field_mapping.status` | string | no | max 60 chars | Field carrying the conversion status. |
| `postback_field_mapping.approved_value` | string | no | max 60 chars | Value of `status` that means approved. |
| `postback_field_mapping.reversed_value` | string | no | max 60 chars, default `reversed` | Value of `status` that means reversed. |
| `coins_per_payout_unit` | integer | no | `>= 0`, default `1` | Coins credited per 1 unit of the payout the partner sends, after `revenue_share_percent` is applied. |
| `revenue_share_percent` | integer | no | `0`–`100` | Percent of the `payout` field passed to the user, for partners that send a raw dollar amount with no rev-share already applied. E.g. a $1,000 payout with `revenue_share_percent: 50` credits the user coins for $500. Omit when the payout field is already the final, rev-share-adjusted amount. |
| `rank` | integer | no | — | Higher shows first in the app's offerwall list. |
| `badge_label` | string | no | max 40 chars | e.g. `Trending`, `Featured`. |
| `is_active` | boolean | no | default `true` | Whether the app lists it. |

```json
{
  "name": "AdGate Media",
  "slug": "adgate-media",
  "logo_url": "https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/offerwall-logos/adgate.png",
  "description": "General offers wall, strong on surveys.",
  "click_url_template": "https://wall.adgatemedia.com/wall?userid={USER_ID}&app=coinzu",
  "postback_method": "get",
  "postback_auth_type": "token",
  "postback_field_mapping": {
    "user_id": "uid",
    "external_transaction_id": "txn_id",
    "offer_name": "offer_name",
    "milestone_name": "goal_name",
    "payout": "payout",
    "status": "status",
    "approved_value": "1",
    "reversed_value": "0"
  },
  "coins_per_payout_unit": 1,
  "revenue_share_percent": 50,
  "rank": 10,
  "badge_label": "Trending"
}
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_offerwall_partner_id` | string (uuid) | The new partner's id. |
| *(all fields above)* | — | Echoed back, plus `created_at` / `updated_at`. |

`postback_secret` **is** included in this one response — the only time the raw secret is returned outside [061](008offerwall.partners.postback-url.md) — so the admin can copy it immediately after creating the partner.

```json
{
  "success": true,
  "data": {
    "cz_offerwall_partner_id": "2f8b41c9-6d05-4a77-9e12-8c4b0d75a361",
    "name": "AdGate Media",
    "slug": "adgate-media",
    "postback_secret": "9f2c8a11c4d7b3e5b0d75a3612ff9021",
    "postback_method": "get",
    "postback_auth_type": "token",
    "coins_per_payout_unit": 1,
    "revenue_share_percent": 50,
    "rank": 10,
    "is_active": true,
    "created_at": "2026-08-28T06:00:00.000Z",
    "updated_at": "2026-08-28T06:00:00.000Z"
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
| 409 | `CZDOFW003` | That offerwall slug is already in use. | A partner with this `slug` already exists. | `DuplicateOptionIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, an unknown field was sent, or `click_url_template` is missing. | `ValidationFailedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDOFW003",
  "cz_error_message": "That offerwall slug is already in use.",
  "cz_error_description": "An offerwall_partners row already has this slug.",
  "cz_error_icon": "DuplicateOptionIcon",
  "statusCode": 409,
  "timestamp": "2026-08-28T07:43:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `postback_method` | `get`, `post` | Independent of `postback_auth_type` — either method works with either auth type. |
| `postback_auth_type` | `token`, `hmac_sha256` | `hmac_sha256` for a partner that signs its own outbound webhook, e.g. RewardTym. Optional — most partners use the default `token`. |

## Example

```bash
curl -X POST $BASE/admin/offerwall/partners \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "name": "AdGate Media",
    "slug": "adgate-media",
    "click_url_template": "https://wall.adgatemedia.com/wall?userid={USER_ID}&app=coinzu",
    "postback_field_mapping": {
      "user_id": "uid",
      "external_transaction_id": "txn_id",
      "offer_name": "offer_name",
      "payout": "payout"
    },
    "coins_per_payout_unit": 1,
    "revenue_share_percent": 50,
    "rank": 10,
    "badge_label": "Trending"
  }'
```

## Notes

- `postback_secret` is stored with `select: false` — every other endpoint returns the partner and omits it. Only this create response and [061](008offerwall.partners.postback-url.md) reveal it.
- Give the returned postback URL (build it as `{API_BASE_URL}/api/offerwall/postback/{slug}/{postback_secret}`, or read it back from [061](008offerwall.partners.postback-url.md)) to the partner as their callback / webhook URL.
- Every partner is an iframe integration — `click_url_template` never opens an external browser tab, it's always opened inside the app's own iframe, with `{USER_ID}` replaced by `cz_user_id`.
- A partner may sign its own outbound webhook (e.g. HMAC-SHA256 over `JSON.stringify` of the payload with keys sorted alphabetically — the pattern RewardTym itself uses, see `PartnerWebhookDispatcherService.signPayload` in rewardtym-backend). `postback_auth_type` and `postback_method` are independent, optional settings — pick whichever combination the partner actually sends.
- `revenue_share_percent` only matters for partners whose `payout` field is a raw dollar amount rather than an already-adjusted final payout. Leave it `null` when the partner's payout is already final.
- `postback_field_mapping.milestone_name` is for multi-step offers that report which specific goal was just completed — set it only if the partner's postback carries that field. When present, the credited amount's wallet note and push notification are phrased as completing that milestone rather than a plain offer completion.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
