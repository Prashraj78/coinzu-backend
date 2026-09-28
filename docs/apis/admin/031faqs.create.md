# POST /api/admin/faqs

Adds one question and answer to a category. It is live on the app's next request.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/admin/faqs` |
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

None.

### Body

| Name | Type | Required | Rules | Description |
|---|---|---|---|---|
| `category_id` | string (uuid) | yes | Must exist. | From `GET /api/admin/faqs/categories`. |
| `question` | string | yes | 1 to 255 characters. | The question, as a user would ask it. |
| `answer` | string | yes | 1 to 4000 characters. | The answer. Line breaks are preserved. |
| `display_order` | number | no | Integer, 0 or more. Default `0`. | Sort position inside the category. |
| `is_active` | boolean | no | Default `true`. | `false` creates it hidden. |

```json
{
  "category_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
  "question": "How can I withdraw my earnings?",
  "answer": "Go to Wallet and tap Withdraw. Pick a payout method, enter the amount and confirm.",
  "display_order": 1,
  "is_active": true
}
```

## Response

### Success — `201`

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
    "answer": "Go to Wallet and tap Withdraw. Pick a payout method, enter the amount and confirm.",
    "display_order": 1,
    "is_active": true
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDSUP004` | We could not find that help topic. | No FAQ category exists for `category_id`. | `FaqTopicNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `question` or `answer` is empty or over its limit, or `category_id` is not a uuid. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDSUP004",
  "cz_error_message": "We could not find that help topic.",
  "cz_error_description": "No FAQ category exists for the given id.",
  "cz_error_icon": "FaqTopicNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T08:05:04.183Z"
}
```

## Enum values

None. `category_id` is a uuid, not a fixed set.

## Example

```bash
curl -X POST $BASE/admin/faqs \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{
    "category_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
    "question": "How can I withdraw my earnings?",
    "answer": "Go to Wallet and tap Withdraw. Pick a payout method, enter the amount and confirm."
  }'
```

## Notes

- Write answers as plain sentences a user would actually say back. Avoid dashes as connectors, avoid marketing language, and keep one idea per sentence. The seeded FAQs are the house style to match.
- Duplicate questions are allowed. Nothing stops two FAQs sharing wording, so check the list before adding.
- `display_order` is per category and does not have to be unique. Ties fall back to insertion order.
- New FAQs reach the app on its next fetch of `GET /api/support/faqs`. There is no cache to clear and no release to ship.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
