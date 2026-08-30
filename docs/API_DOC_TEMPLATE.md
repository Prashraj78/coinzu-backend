# API doc template

One file per endpoint. Which folder depends on who calls it:

| Endpoint | File | Numbers |
|---|---|---|
| App API — what the app integrates against | `docs/apis/NNN<module>.<action>.md`, e.g. `apis/user/002auth.login.md` | `001`–`076` |
| Admin API — panel only, `/api/admin/*` | `docs/apis/admin/NNN<module>.<action>.md`, e.g. `003users.list.md` | `001`–`057`, with `001`–`053` retired |

Admin docs never go in `docs/apis/` directly. The folder already says "admin",
so the filename does not repeat it — the `<module>` in an admin filename is the
feature it manages (`users`, `kyc`, `settings`).

`NNN` is a zero-padded sequence, counted separately per folder, so the files
sort in reading order and a **new endpoint takes the next number in its folder
and lands at the bottom**. Never renumber an existing file — a doc link is a
shared reference.

Copy this structure exactly. Fill every section; write "None." rather than
deleting one. Add the curl to `docs/CURLS.md` (part 1 for app, part 2 for
admin) and a row to `docs/README.md`, both in the same position.

---

# <Method> <path>

<One sentence on what this does and when the frontend calls it.>

## Overview

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/...` |
| **Auth** | Bearer access token required. / Bearer **Rewardtym** admin access token required. / Public — no token required. |
| **Role** | any signed-in user / admin / none |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|

```json
{ }
```

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|

```json
{ "success": true, "data": {} }
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|

```json
{
  "success": false,
  "cz_error_code": "",
  "cz_error_message": "",
  "cz_error_description": "",
  "cz_error_icon": "",
  "statusCode": 400,
  "timestamp": "2026-08-27T07:43:04.183Z"
}
```

## Enum values

Every fixed-value field this endpoint sends or accepts, with **all** of its
values spelled out. Copy the values from `docs/ENUMS.md` — do not write
"see the entity". Write "None. This endpoint has no fields with a fixed set of
values." when there are none.

| Field | Allowed values | Notes |
|---|---|---|

## Example

```bash
curl -X POST http://localhost:4000/api/... \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Notes

<Side effects, ordering, idempotency, gotchas. "None." if genuinely none.>

Two bullets are mandatory on every doc:

- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.

and, on admin endpoints only:

- Admin access uses the **Rewardtym admin token**. There is no Coinzu admin account or Coinzu admin sign-in. The token must carry `type: "admin"` and a `product_access` claim of `both` or `coinzu` — Rewardtym decides per admin account which products they may open. A token issued before that claim existed falls back to the older rule: its `role` claim must be listed in the `ADMIN_ROLES` env var. It is verified with the shared `JWT_AUTH_TOKEN` secret and never looked up in the database.
