# DELETE /api/admin/push-templates/:cz_push_template_id

Removes a saved template permanently. Campaigns already created from it are untouched.

## Overview

| Item | Value |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/admin/push-templates/:cz_push_template_id` |
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
| `cz_push_template_id` | string (uuid) | yes | The template to delete. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `deleted` | boolean | Always `true`. |

```json
{
  "success": true,
  "data": { "deleted": true }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `cz_push_template_id` is not a uuid. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 404 | `CZDNOTIF003` | We could not find that template. | No template exists with that id, or it was already deleted. | `NotificationNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDNOTIF003",
  "cz_error_message": "We could not find that template.",
  "cz_error_description": "No push template exists with that id.",
  "cz_error_icon": "NotificationNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T10:03:12.183Z"
}
```

## Enum values

This endpoint has no fixed-value fields.

## Example

```bash
curl -X DELETE "$BASE/admin/push-templates/4675facb-3f13-4f59-b51a-d7293f579460" \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- **Permanent.** There is no soft delete and no undo. To retire a template but keep it, use `PATCH /api/admin/push-templates/:cz_push_template_id` with `is_active: false` instead.
- Campaigns created from the template keep their own copy of the wording and keep the now-dangling `cz_push_template_id`. Nothing about a past or scheduled send changes.
- Deleting is not blocked by `use_count`, so a heavily used template can be removed by mistake. Prefer deactivating.
