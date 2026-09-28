# PATCH /api/admin/faqs/:id

Edits a FAQ, moves it to another category, reorders it, or hides it from the app.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/faqs/:id` |
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

| Name | Type | Required | Description |
|---|---|---|---|
| `id` | string (uuid) | yes | The `cz_faq_id` from `GET /api/admin/faqs`. |

### Body

Every field is optional; send only what changes.

| Name | Type | Required | Rules | Description |
|---|---|---|---|---|
| `category_id` | string (uuid) | no | Must exist. | Moves the FAQ to another category. |
| `question` | string | no | Up to 255 characters. | The question. |
| `answer` | string | no | Up to 4000 characters. | The answer. |
| `display_order` | number | no | Integer, 0 or more. | Sort position inside the category. |
| `is_active` | boolean | no | — | `false` hides it from the app, keeping the row. |

```json
{ "answer": "Go to Wallet and tap Withdraw, then pick a payout method.", "is_active": true }
```

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

```json
{
  "success": true,
  "data": {
    "cz_faq_id": "5a71c308-92e4-4bd7-8f60-1c3e07a9d254",
    "category_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
    "question": "How can I withdraw my earnings?",
    "answer": "Go to Wallet and tap Withdraw, then pick a payout method.",
    "display_order": 1,
    "is_active": true
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDSUP003` | We could not find that answer. | No FAQ exists for the given id. | `FaqNotFoundIcon` |
| 404 | `CZDSUP004` | We could not find that help topic. | The `category_id` you are moving it to does not exist. | `FaqTopicNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field is the wrong type or over its length limit. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDSUP003",
  "cz_error_message": "We could not find that answer.",
  "cz_error_description": "No FAQ exists for the given id.",
  "cz_error_icon": "FaqNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T08:06:04.183Z"
}
```

## Enum values

None.

## Example

```bash
curl -X PATCH $BASE/admin/faqs/5a71c308-92e4-4bd7-8f60-1c3e07a9d254 \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "is_active": false }'
```

## Notes

- `is_active: false` is the safe way to retire a FAQ. It keeps the wording so you can bring it back, and the app stops showing it immediately.
- Write answers as plain sentences a user would actually say back. Avoid dashes as connectors, avoid marketing language, and keep one idea per sentence. The seeded FAQs are the house style to match.
- Moving a FAQ to another category does not renumber `display_order`. Set it in the same call if the position matters.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
