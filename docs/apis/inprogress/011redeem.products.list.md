# GET /api/redeem/products

Lists the gift cards that can be ordered, featured first and then cheapest first.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/redeem/products` |
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
| `category` | query | string | no | Exact category slug, at most 60 characters. Use `GET /api/redeem/categories` for the list. |
| `brand` | query | string | no | Partial brand name, at most 120 characters. Matching is case-insensitive. |
| `is_featured` | query | boolean | no | Send `true` to return only featured products. |
| `page` | query | number | no | 1-based page number. Defaults to `1`. |
| `limit` | query | number | no | Rows per page. Values above 100 are capped at 100. Defaults to `20`. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | Products on this page. |
| `data[].cz_gift_card_product_id` | string (uuid) | Primary key of the product. |
| `data[].provider_name` | string | Vendor the product came from. |
| `data[].external_product_id` | string | The vendor's own id for the product. |
| `data[].brand` | string | Brand of the gift card, for example `Amazon`. |
| `data[].denomination` | string | Face value as the vendor prints it, for example `$10`. |
| `data[].price_coins` | number | Coins charged for the card. |
| `data[].category` | string \| null | Category slug, for example `shopping`. |
| `data[].image_url` | string \| null | Brand logo. |
| `data[].is_featured` | boolean | Featured products are listed first. |
| `data[].is_active` | boolean | Inactive products cannot be ordered. |
| `data[].synced_at` | string (iso date) \| null | When the vendor catalog last refreshed this row. |
| `total` | number | How many products match the filters. |

```json
{
  "success": true,
  "data": {
    "data": [
  {
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
    ],
    "total": 48
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

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl 'http://localhost:4000/api/redeem/products?category=shopping&page=1&limit=20' \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Lists always return `{ data, total }`. `total` is the count before `page`/`limit` are applied, so the client can build the pager.
- Only products with `is_active: true` are returned.
- `price_coins` is recalculated from the vendor price every catalog sync, so cache it for minutes, not days.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
