# DELETE /api/admin/faqs/:id

Removes a FAQ permanently. Prefer `is_active: false` unless you are sure.

## Overview

| Item | Value |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/admin/faqs/:id` |
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
| `id` | string (uuid) | yes | The `cz_faq_id` from `GET /api/admin/faqs`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_faq_id` | string (uuid) | The id that was removed, echoed back so the panel can drop the row. |

```json
{
  "success": true,
  "data": { "cz_faq_id": "5a71c308-92e4-4bd7-8f60-1c3e07a9d254" }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDSUP003` | We could not find that answer. | No FAQ exists for the given id. | `FaqNotFoundIcon` |
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
  "timestamp": "2026-08-29T08:07:04.183Z"
}
```

## Enum values

None.

## Example

```bash
curl -X DELETE $BASE/admin/faqs/5a71c308-92e4-4bd7-8f60-1c3e07a9d254 \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- This is a hard delete. The row is gone and the wording cannot be recovered from the API.
- `PATCH` with `is_active: false` achieves the same thing for users while keeping the content, and is the better default.
- Deleting leaves gaps in `display_order` within the category. That is harmless, since ordering only compares values.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
