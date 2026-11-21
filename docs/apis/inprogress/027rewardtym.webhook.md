# POST /api/rewardtym/webhook

RewardTym's signed server-to-server webhook. It credits a Coinzu user for a completed offer milestone, and keeps Coinzu in step when RewardTym blocks or unblocks a Coinzu user. The app never calls it.

## Overview

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/rewardtym/webhook` |
| **Auth** | Public — no token required. Every body must carry a valid `signature` (HMAC-SHA256 with `REWARDTYM_WEBHOOK_SECRET`). |
| **Role** | none |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |

### Path / query params

None.

### Body

`signature` is the hex HMAC-SHA256 of `JSON.stringify` of every other field with keys sorted alphabetically. A missing, wrong or unconfigured signature is rejected with `CZDOFR006`.

Conversion event (no `event_name`, or a conversion event name):

| Field | Type | Required | Notes |
|---|---|---|---|
| `conversion_id` | string | yes | RewardTym's conversion id. Idempotency key. |
| `user_id` | uuid | yes | The Coinzu `cz_user_id`. |
| `status` | string | no | `approved` (default) credits, `reversed` debits. |
| `coinzu_coins` | int | no | Coins to credit. |
| `coinzu_gems` | int | no | Gems to credit. |
| `campaign_name` | string | no | Offer name for the ledger note. |
| `level_number` | int | no | Milestone level. |
| `publisher_payout_usd` | number | no | Coinzu's revenue for this conversion. |
| `signature` | string | yes | See above. |

Account event:

| Field | Type | Required | Notes |
|---|---|---|---|
| `event_name` | string | yes | `user.blocked` or `user.unblocked`. |
| `user_id` | uuid | yes | The Coinzu `cz_user_id`. |
| `reason` | string | no | RewardTym's internal block reason. Logged only. |
| `source` | string | no | `api`. |
| `timestamp` | string | no | ISO-8601. |
| `signature` | string | yes | See above. |

```json
{
  "event_name": "user.blocked",
  "user_id": "60e238af-6b7b-49b5-b38b-209df277b9cd",
  "reason": "Automatic: VPN / hosting IP",
  "source": "api",
  "timestamp": "2026-11-21T08:00:00.000Z",
  "signature": "3f1c…"
}
```

## Behaviour

- `user.blocked` sets an `active` account to `suspended` and adds it to the in-memory blocked list, so its very next authenticated request is refused with `CZDAUTH021`.
- `user.unblocked` restores only an account RewardTym suspended (`suspended` → `active`); `banned` and `deleted` accounts are never touched.
- Both are idempotent: a retried delivery changes nothing.
- RewardTym sends account events for every block or unblock of a Coinzu user: its pre-redirect fraud gate on web clicks (`/v3/r?platform=web`), conversion-time fraud, and its admin panel. Deliveries are stored and retried on RewardTym's side.

## Response

### Success — `200`

```json
{ "success": true, "data": { "status": "user_blocked" } }
```

`data.status` is one of `credited`, `reversed`, `duplicate`, `not_payable`, `user_not_found`, `invalid_payload`, `user_blocked`, `user_unblocked`.

## Enum values

| Field | Values |
|---|---|
| `event_name` | `user.blocked`, `user.unblocked` (account events); conversion events carry RewardTym's conversion event name. |
| `status` (request) | `approved`, `reversed` |
| account `status` | `active`, `suspended`, `banned`, `deleted` |

## Errors

| Status | Code | Message | Description | Icon |
|---|---|---|---|---|
| 401 | `CZDOFR006` | We could not verify this request. | Postback secret or signature did not match the provider. | `RequestUnverifiedIcon` |

## Notes

None.
