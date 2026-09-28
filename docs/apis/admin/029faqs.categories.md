# GET /api/admin/faqs/categories

Every FAQ category, inactive ones included, for the category filter and the FAQ form's dropdown.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/faqs/categories` |
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
| `data[].cz_faq_category_id` | string (uuid) | Send this as `category_id` when creating a FAQ. |
| `data[].slug` | string | Stable key. The app sends it as `?category=`, and so does the admin list. |
| `data[].name` | string | Display name. |
| `data[].icon` | string \| null | Icon name for the app's category chip. |
| `data[].display_order` | number | Sort position, ascending. |
| `data[].is_active` | boolean | `false` hides the category and all of its FAQs from the app. |
| `total` | integer | Number of categories. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_faq_category_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
        "slug": "payment",
        "name": "Payment",
        "icon": "CreditCard",
        "display_order": 3,
        "is_active": true
      }
    ],
    "total": 5
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
  "timestamp": "2026-08-29T08:02:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `data[].slug` | `account`, `rewards`, `payment`, `security`, `referrals` | The seeded set. Slugs are data, not code, so treat this as the current list rather than a closed enum. |

## Example

```bash
curl "$BASE/admin/faqs/categories" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- The app gets its categories from the `categories` array on `GET /api/support/faqs`, which returns active ones only. This admin endpoint returns inactive categories too, so a hidden group is still visible and editable in the panel.
- There is no endpoint to create or rename a category. The five seeded categories cover the FAQs screen; adding one is a migration, because `slug` is a published contract the app codes against.
- Ordered by `display_order`.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
