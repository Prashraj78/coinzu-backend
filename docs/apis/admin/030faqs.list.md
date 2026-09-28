# GET /api/admin/faqs

Every FAQ with the category it sits in, inactive rows included. The Coinzu FAQs tab table.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/admin/faqs` |
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
| `category` | string | no | Category **slug**. The only server-side filter. Omit for every FAQ. |
| `is_active` | boolean | no | `true` for live FAQs, `false` for hidden ones. Omit for both. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_faq_id` | string (uuid) | Primary key. |
| `category_id` | string (uuid) | Category it belongs to. |
| `question` | string | The question. |
| `answer` | string | The answer. |
| `display_order` | number | Sort order inside the category, lowest first. |
| `is_active` | boolean | `false` hides it from the app without deleting it. |
| `data[].category_slug` | string | Slug of the category, joined in so the table can group without a second call. |
| `data[].category_name` | string | Display name of the category. |
| `total` | integer | FAQs matching the filters. |

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "cz_faq_id": "5a71c308-92e4-4bd7-8f60-1c3e07a9d254",
        "category_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
        "question": "How can I withdraw my earnings?",
        "answer": "Go to Wallet and tap Withdraw. Pick a payout method, enter the amount and confirm.",
        "display_order": 1,
        "is_active": true,
        "category_slug": "payment",
        "category_name": "Payment"
      }
    ],
    "total": 30
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `is_active` is not a boolean, or `category` is over 40 characters. | `ValidationFailedIcon` |
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
  "timestamp": "2026-08-29T08:03:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `category` / `data[].category_slug` | `account`, `rewards`, `payment`, `security`, `referrals` | The seeded set; see `028faqs.categories.md`. |

## Example

```bash
curl "$BASE/admin/faqs?category=payment&is_active=true" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Category is the only filter, by design.** There is no `search` param here or on the public endpoint: the FAQ set is small, returns in one unpaginated response, and both the app and the panel search it client-side.
- Not paginated. If the FAQ set ever grows past a few hundred rows, add pagination here first and to the public endpoint second.
- Ordered by category `display_order`, then the FAQ's own `display_order`, so grouping the response by `category_slug` gives you the finished layout.
- `category_slug` and `category_name` are joined in, so rendering the grouped table costs one query.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
