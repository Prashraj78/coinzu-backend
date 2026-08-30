# POST /api/redeem/products/:id/order

Buys a gift card with coins. Coins are charged first, then the vendor is asked for the code.

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/redeem/products/:id/order` |
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
| `id` | path | string (uuid) | yes | The `cz_gift_card_product_id` to order. |

### Body

None.

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_gift_card_order_id` | string (uuid) | Primary key of the order. |
| `user_id` | string (uuid) | Who placed the order. |
| `product_id` | string (uuid) | Product that was ordered. |
| `price_coins` | number | Coins that were charged. |
| `status` | string | `pending`, `fulfilled` or `failed`. |
| `provider_order_id` | string \| null | The vendor's order id, once the vendor accepted it. |
| `failure_reason` | string \| null | Why a `failed` order failed. |
| `created_at` | string (iso date) | When the order was placed. |
| `fulfilled_at` | string (iso date) \| null | When the code arrived. |
| `brand` | string \| null | Brand of the ordered product. |
| `denomination` | string \| null | Face value of the ordered product. |
| `image_url` | string \| null | Brand logo of the ordered product. |

```json
{
  "success": true,
  "data": {
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
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDRDM001` | We could not find that gift card. | No product exists with that id. | `ProductNotFoundIcon` |
| 400 | `CZDRDM002` | This gift card is no longer available. | The product is not on sale any more. | `ProductUnavailableIcon` |
| 400 | `CZDWLT002` | You do not have enough coins for this. | The coin balance is lower than `price_coins`. | `InsufficientCoinsIcon` |
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

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `pending`, `fulfilled`, `failed` | — |

## Example

```bash
curl -X POST http://localhost:4000/api/redeem/products/6c1d5a83-90b7-4f2e-8a41-3d7b0e29c5f6/order \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- The response comes back as soon as the vendor answers. A slow vendor leaves `status: "pending"`, and a cron job polls the vendor until the order is `fulfilled` or `failed`.
- A `failed` order returns the coins automatically through a ledger credit and sends a notification. There is nothing for the client to retry.
- The code is never in this response. Call `GET /api/redeem/orders/:id/code` once `status` is `fulfilled`.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
