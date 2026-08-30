# GET /api/redeem/orders

Lists the gift card orders of the signed-in user, newest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/redeem/orders` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

| Name | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | number | no | 1-based page number. Defaults to `1`. |
| `limit` | query | number | no | Rows per page. Values above 100 are capped at 100. Defaults to `20`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Orders on this page. Fields are listed in `docs/034redeem.orders.get.md`. |
| `total` | number | Total orders by this user. |

```json
{
  "success": true,
  "data": {
    "data": [
  {
      "cz_gift_card_order_id": "a91f4e07-2c68-4b35-9d80-51e6f3b7a2c4",
      "user_id": "0f7c2b9e-1d4a-4c8b-9f3e-2a6d5b8c1e40",
      "product_id": "6c1d5a83-90b7-4f2e-8a41-3d7b0e29c5f6",
      "price_coins": 10000,
      "status": "fulfilled",
      "provider_order_id": "ord_88213",
      "failure_reason": null,
      "created_at": "2026-08-27T10:02:11.000Z",
      "fulfilled_at": "2026-08-27T10:02:19.000Z",
      "brand": "Amazon",
      "denomination": "$10",
      "image_url": "https://cdn.coinzu.app/giftcards/amazon.png"
    }
    ],
    "total": 12
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "One or more fields in the request are invalid.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `pending`, `fulfilled`, `failed` | — |

## Example

```bash
curl 'http://localhost:4000/api/redeem/orders?page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- Brand, denomination and image are joined in so the history screen needs no extra call.
- Codes are never included; reveal them one order at a time.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
