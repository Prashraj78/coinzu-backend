# GET /api/offerwall/postback/:slug/:token

Server-to-server callback an offerwall partner calls to report a reward (GET version). This is the URL admins hand to each partner.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/offerwall/postback/:slug/:token` |
| **Auth** | Public — no token required. Documented here, not in `docs/apis/`, because the URL itself is admin-managed (built from [059](006offerwall.partners.create.md)/[061](008offerwall.partners.postback-url.md)) even though the partner calling it never holds an admin token. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Accept` | no | `application/json` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `slug` | path | string | yes | The offerwall partner's `slug`. |
| `token` | path | string | yes | Must equal the partner's `postback_secret` when `postback_auth_type` is `token`. Ignored (but still required in the path) when `postback_auth_type` is `hmac_sha256` — that mode is verified from a `signature` field in the query instead. |
| *(mapped)* | query | string | yes | Every other query field is read by name from the partner's own `postback_field_mapping` — there are no fixed field names. At minimum the partner must send whatever field is mapped to `user_id` and to `external_transaction_id`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `status` | string | What was recorded. See [Enum values](#enum-values). |

```json
{
  "success": true,
  "data": { "status": "credited" }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDOFW004` | We could not verify this request. | The `token` did not match the partner's `postback_secret`, or the HMAC `signature` did not match. | `RequestUnverifiedIcon` |
| 403 | `CZDOFW002` | This offerwall is temporarily unavailable. | The partner is set inactive by an admin. | `OfferUnavailableIcon` |
| 404 | `CZDOFW001` | We could not find that offerwall. | No partner exists with that `slug`. | `ProviderNotFoundIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDOFW004",
  "cz_error_message": "We could not verify this request.",
  "cz_error_description": "The postback token or signature did not match the partner.",
  "cz_error_icon": "RequestUnverifiedIcon",
  "statusCode": 401,
  "timestamp": "2026-08-28T07:43:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` (response) | `credited`, `reversed`, `duplicate`, `user_not_found`, `invalid_payload` | `credited` and `reversed` update the wallet; the other three are logged for audit but change nothing. |

## Example

```bash
curl 'http://localhost:4000/api/offerwall/postback/adgate-media/9f2c8a11c4d7b3e5b0d75a3612ff9021?userid=e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361&txn_id=RT-TX-55120&offer=Complete+a+survey&amount=250&status=1'
```

The exact query field names above (`userid`, `txn_id`, `offer`, `amount`, `status`) come from that partner's `postback_field_mapping` — a different partner can use entirely different names for the same meanings.

## Notes

- This endpoint is public because partners call it without a user token. The path `token` (or the HMAC signature) is what authenticates it.
- Every field name is configurable per partner through `postback_field_mapping`, so onboarding a new partner's own naming is a database row, not a code change.
- A repeat postback with an `external_transaction_id` already seen for that partner is recorded as `duplicate` and changes no balance.
- Crediting is `payout_field_value × coins_per_payout_unit`, rounded down. When the partner sends no `payout` mapping, `0` coins are credited but the reward still counts and appears in history.
- Whichever value `postback_field_mapping.status` reads that equals `reversed_value` triggers a debit instead of a credit, reversing a previously credited reward.
- The whole inbound query is stored on the `offerwall_postbacks` row as `raw_payload`, so a disputed reward can be replayed exactly as it arrived.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
