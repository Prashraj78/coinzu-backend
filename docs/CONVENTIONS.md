# API conventions

Base URL: `/api` · Auth: `Authorization: Bearer <access_token>`

## Success

Every successful response, always:

```json
{ "success": true, "data": { } }
```

`data` is the endpoint payload — object, array, or `null`. Never a hand-built envelope; the interceptor adds it.

List endpoints:

```json
{ "success": true, "data": { "data": [], "total": 0 } }
```

## Error

Every failed response, always:

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH001",
  "cz_error_message": "Invalid email or password.",
  "cz_error_description": "Login failed. Invalid email or password.",
  "cz_error_icon": "InvalidCredentialsIcon",
  "statusCode": 401,
  "timestamp": "2026-08-27T07:43:04.183Z"
}
```

| Field | For | Notes |
|---|---|---|
| `cz_error_code` | branching | Stable contract. Switch on this, never on message text. |
| `cz_error_message` | end user | Safe to render in the UI as-is. |
| `cz_error_description` | developer | Logs/debugging. Do not show to users. |
| `cz_error_icon` | end user | A `CzErrorIcon` name. Look it up in the `error_icon` dropdown group for its image URL. See [ERROR_CODES.md](ERROR_CODES.md#error-icons). |
| `statusCode` | transport | Mirrors the HTTP status. |
| `timestamp` | support | ISO-8601 UTC. |

## Frontend integration

- Check `success` first.
- On failure, switch on `cz_error_code`; fall back to rendering `cz_error_message`.
- Fetch `GET /api/dropdown?types=error_icon` once on app load, cache `{value: icon_url}`, and look up `cz_error_icon` in it to render the error sheet's icon.
- `CZDAUTH003` / `CZDAUTH004` / `CZDAUTH005` → clear the session and redirect to sign-in.
- `CZDAUTH006` → refresh failed; full re-login required.
- `CZDCOMM005` → rate limited; back off and retry.

## Status codes

| Status | When |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 400 | Validation failure |
| 401 | Missing / invalid / expired token, bad credentials |
| 403 | Authenticated but not permitted |
| 404 | Resource does not exist |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Unexpected server error |

## Requests

- JSON bodies; `Content-Type: application/json`.
- All field names `snake_case`.
- Unknown fields are **rejected** (400), not ignored.
- Pagination: `?page=1&limit=20` — `page` is 1-based, `limit` defaults to `20` and values above `100` are capped at `100`. List responses are `{ data, total }`, where `total` ignores `page` and `limit`.
- Ids are uuid v4, named `cz_<entity>_id`. The prefix is on the **column**, not the table — tables are plain (`users`, `wallets`), and the primary key of `users` is `cz_user_id`.
- Money and balances are **integers**. Never send or expect a fractional coin or gem.

## Time zone

The whole API is **UTC**, with no exceptions.

- The Node process sets `TZ=UTC` before anything else loads, and the Postgres session is opened with `-c timezone=UTC`.
- Every timestamp in a response is ISO-8601 with a `Z` suffix, e.g. `2026-08-27T09:12:44.183Z`.
- Every date-only field (a draw date, a check-in day) is the **UTC** calendar day, `YYYY-MM-DD`. A user in UTC+13 rolls over to a new streak day at their 13:00, not their midnight.
- Send UTC. A timestamp you send with an offset is converted to UTC on the way in and comes back as UTC, so what you read will not string-match what you wrote.
- Convert to the user's local zone only at render time, in the client.

## Authentication

Two kinds of Bearer token are accepted on the same routes, both verified with
the shared `JWT_AUTH_TOKEN` secret. Verification is stateless — no database row
is read to authenticate a request.

| Caller | Token | Recognised by | Reaches |
|---|---|---|---|
| Coinzu user | Coinzu access token from `POST /api/auth/login`, `/register`, `/google` or `/refresh` | a `cz_user_id` claim | every non-admin route |
| Rewardtym admin | The admin's **Rewardtym** access token, unchanged | a `type: "admin"` claim | `/api/admin/*` |

- Coinzu has no admin table and no admin sign-in. Admins sign in to Rewardtym and reuse that token here.
- A token carrying `is_active: false` is refused as `401 CZDAUTH004`.
- Send it as `Authorization: Bearer <token>` on every request. Routes marked public in their doc take no token.

### Which admins reach Coinzu

Rewardtym and Coinzu share one admin account per person. Rewardtym decides, per
account, which of the two products that person may open and stamps the answer on
the token as `product_access`. There are exactly three cases and no read-only
level — access to a product means full write access inside it.

| `product_access` | Rewardtym APIs | Coinzu `/api/admin/*` |
|---|---|---|
| `both` | yes | yes |
| `rewardtym` | yes | `403 CZDAUTH007` |
| `coinzu` | `403 LTDADM011` | yes |

- Coinzu reads the claim and stops. It never calls Rewardtym and never reads a database row to answer this.
- Coinzu access is granted per admin in Rewardtym, and only by an admin who already holds both products. Most admins are `rewardtym` and will never reach these routes.
- Changing an admin's `product_access` in Rewardtym bumps their token version, so the old token dies at once and they must sign in again.
- A token Rewardtym issued **before** this claim existed carries no `product_access`. Those fall back to the older rule: the `role` claim must be listed in the `ADMIN_ROLES` env var (default `super_admin`, `coinzu_admin`). The fallback retires itself as old tokens expire.

## Fixed-value fields

Every enum-style field is a lowercase `snake_case` string stored as `varchar`,
not a Postgres enum, so values can be added without a migration. Handle an
unrecognised value gracefully instead of crashing. `docs/ENUMS.md` lists every
field and every value; each endpoint doc repeats the subset that applies to it.
