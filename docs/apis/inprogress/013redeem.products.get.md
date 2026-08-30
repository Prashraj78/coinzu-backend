# GET /api/redeem/products/:id

Returns one gift card product by id.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/redeem/products/:id` |
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
| `id` | path | string (uuid) | yes | The `cz_gift_card_product_id` of the product. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_gift_card_product_id` | string (uuid) | Primary key of the product. |
| `provider_name` | string | Vendor the product came from. |
| `external_product_id` | string | The vendor's own id for the product. |
| `brand` | string | Brand of the gift card, for example `Amazon`. |
| `denomination` | string | Face value as the vendor prints it, for example `$10`. |
| `price_coins` | number | Coins charged for the card. |
| `category` | string \| null | Category slug, for example `shopping`. |
| `image_url` | string \| null | Brand logo. |
| `is_featured` | boolean | Featured products are listed first. |
| `is_active` | boolean | Inactive products cannot be ordered. |
| `synced_at` | string (iso date) \| null | When the vendor catalog last refreshed this row. |

```json
{
  "success": true,
  "data": {
      "cz_gift_card_product_id": "6c1d5a83-90b7-4f2e-8a41-3d7b0e29c5f6",
      "provider_name": "reloadly",
      "external_product_id": "amzn-us-10",
      "brand": "Amazon",
      "denomination": "$10",
      "price_coins": 10000,
      "category": "shopping",
      "image_url": "https://cdn.coinzu.app/giftcards/amazon.png",
      "is_featured": true,
      "is_active": true,
      "synced_at": "2026-08-27T03:00:00.000Z"
    }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDRDM001` | We could not find that gift card. | No product exists with that id. | `ProductNotFoundIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDRDM001",
  "cz_error_message": "We could not find that gift card.",
  "cz_error_description": "No gift card product exists for the given id.",
  "cz_error_icon": "ProductNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl http://localhost:4000/api/redeem/products/6c1d5a83-90b7-4f2e-8a41-3d7b0e29c5f6 \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Inactive products are still returned here, so check `is_active` before showing the order button.
- Ordering an inactive product fails with `CZDRDM002`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
