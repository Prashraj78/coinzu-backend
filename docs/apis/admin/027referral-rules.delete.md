# DELETE /api/admin/referral-rules/:id

Removes a step from the referral reward ladder. Prefer `is_active: false` unless you want the step gone for good.

## Overview

| Item | Value |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/admin/referral-rules/:id` |
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
| `id` | string (uuid) | yes | The `cz_referral_rule_id` from `GET /api/admin/referral-rules`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_referral_rule_id` | string (uuid) | The id that was removed, echoed back so the panel can drop the row. |

```json
{
  "success": true,
  "data": { "cz_referral_rule_id": "7c1f0a2e-9b34-4d67-8e02-3f5a1c9d4b88" }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDREF004` | We could not find that referral rule. | No `referral_reward_rules` row exists for the given id. | `ReferralInvalidIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDREF004",
  "cz_error_message": "We could not find that referral rule.",
  "cz_error_description": "No referral_reward_rules row exists for the given id.",
  "cz_error_icon": "ReferralInvalidIcon",
  "statusCode": 404,
  "timestamp": "2026-08-29T07:24:06.810Z"
}
```

## Enum values

None.

## Example

```bash
curl -X DELETE $BASE/admin/referral-rules/7c1f0a2e-9b34-4d67-8e02-3f5a1c9d4b88 \
  -H 'Authorization: Bearer $ADMIN_TOKEN'
```

## Notes

- Deleting a rule does **not** delete the `referral_reward_payouts` rows it already produced, and never claws coins back. The payout history stays intact and auditable.
- Payouts are keyed on `(referral_id, rule_id)`. Re-adding a step later creates a **new** rule id, so a friend who cleared the old step can be paid again by the new one — delete a step only when you accept that.
- Freeing the trigger this way is the only route to changing a step's `trigger`: delete the rule, then `POST` a new one.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
