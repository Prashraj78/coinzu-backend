# POST /api/offerwall/postback/:slug/:token

Server-to-server callback an offerwall partner calls to report a reward (POST version). Identical behaviour to the GET version; partners pick whichever verb they support.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/offerwall/postback/:slug/:token` |
| **Auth** | Public — no token required. Documented here, not in `docs/apis/`, because the URL itself is admin-managed (built from [059](006offerwall.partners.create.md)/[061](008offerwall.partners.postback-url.md)) even though the partner calling it never holds an admin token. |
| **Role** | none |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `slug` | path | string | yes | The offerwall partner's `slug`. |
| `token` | path | string | yes | Must equal the partner's `postback_secret` when `postback_auth_type` is `token`. Ignored (but still required in the path) when `postback_auth_type` is `hmac_sha256` — that mode is verified from a `signature` field in the body instead. |

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| *(mapped)* | object | yes | — | Every body field is read by name from the partner's own `postback_field_mapping` — there are no fixed field names. At minimum the partner must send whatever field is mapped to `user_id` and to `external_transaction_id`. When `postback_auth_type` is `hmac_sha256`, the body must also carry a `signature` field: HMAC-SHA256, keyed with the partner's `postback_secret`, over `JSON.stringify` of every other field with its keys sorted alphabetically. |

```json
{
  "userid": "e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361",
  "txn_id": "RT-TX-55120",
  "offer": "Complete a survey",
  "amount": 250,
  "status": "1"
}
```

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
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | The body was not valid JSON. | `ValidationFailedIcon` |
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
curl -X POST http://localhost:4000/api/offerwall/postback/adgate-media/9f2c8a11c4d7b3e5b0d75a3612ff9021 \
  -H 'Content-Type: application/json' \
  -d '{
    "userid": "e3b0c442-98fc-4e1e-8b1e-8c4b0d75a361",
    "txn_id": "RT-TX-55120",
    "offer": "Complete a survey",
    "amount": 250,
    "status": "1"
  }'
```

## Notes

- Identical to the GET version; unlike an unrecognized field on a normal endpoint, this body is not validated against a DTO — field names are entirely partner-defined via `postback_field_mapping`.
- Repeats are safe. A second postback with the same `external_transaction_id` for that partner returns `{ "status": "duplicate" }` and changes no balance.
- The whole inbound body is stored on the `offerwall_postbacks` row as `raw_payload`, so a disputed reward can be replayed exactly as it arrived.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
