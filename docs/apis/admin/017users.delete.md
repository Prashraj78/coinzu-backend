# DELETE /api/admin/users

Hard-deletes a Coinzu user and every row that references them, matched by email. The Rewardtym admin panel's "Delete User" action calls this. **Irreversible** — there is no undo. This is the only endpoint that wipes data: the user-facing `DELETE /api/users/me` is a soft delete (marks the account `deleted`, keeps the rows).

## Overview

| Item | Value |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/admin/users` |
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

| Name | Type | Required | Description |
|---|---|---|---|
| `email` | string (email) | yes | Email of the account to delete. Case-insensitive. |

```json
{ "email": "someone@example.com" }
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_user_id` | string (uuid) | The id of the account that was deleted. |
| `email` | string | The stored email of the deleted account (canonical casing from the row). |

```json
{
  "success": true,
  "data": {
    "cz_user_id": "ca57bf15-2381-4a40-9bbe-c51b8ed2ccb2",
    "email": "someone@example.com"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDUSER002` | We could not find that account. | No user exists with that email. | `AccountNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | `email` missing or not a valid email. | `ValidationErrorIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDUSER002",
  "cz_error_message": "We could not find that account.",
  "cz_error_description": "No user exists for the given identifier.",
  "cz_error_icon": "AccountNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-09-28T04:26:06.810Z"
}
```

## Enum values

None.

## Example

```bash
curl -X DELETE "$BASE/admin/users" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{ "email": "someone@example.com" }'
```

## Notes

- Deletes in one transaction: every child table keyed on the user (`daily_checkins`, `daily_chest_claims`, `gift_card_orders`, `kyc_verifications`, `lucky_draw_entries`, `lucky_draw_winners`, `notifications`, `offer_clicks`, `offerwall_postbacks`, `push_campaign_events`, `quiz_attempts`, `reward_plays`, `scratch_card_grants`, `scratch_history`, `spin_history`, `support_tickets`, `user_achievements`, `user_challenge_progress`, `wallet_transactions`, `withdrawal_requests`, `user_devices`, `user_streaks`, `wallets`) is cleared first, admin-authored content (`push_campaigns`, `push_templates`) has its `created_by` detached to `NULL`, anyone this user referred has `referred_by` detached, then the `users` row is deleted last. If any step fails the whole delete rolls back.
- The database has no `ON DELETE CASCADE` on the user id, which is why every child table is listed explicitly. Adding a new table that references a user means adding it here (and in `scripts/delete-user.ts`, which this mirrors).
- Mirrors the `scripts/delete-user.ts` maintenance utility (`npm run delete:prashant`) — same table list and order — so the panel action and the CLI stay in step.
- There is no confirmation step server-side: the endpoint deletes on the first valid call. The panel is responsible for confirming intent before calling it.
- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu`. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
