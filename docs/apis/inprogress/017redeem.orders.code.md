# GET /api/redeem/orders/:id/code

Reveals the gift card code of a fulfilled order.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/redeem/orders/:id/code` |
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
| `id` | path | string (uuid) | yes | The `cz_gift_card_order_id` of the order. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `cz_gift_card_order_id` | string (uuid) | The order the code belongs to. |
| `code` | string | The gift card code, in plain text. |
| `fulfilled_at` | string (iso date) \| null | When the code arrived from the vendor. |

```json
{
  "success": true,
  "data": {
    "cz_gift_card_order_id": "a91f4e07-2c68-4b35-9d80-51e6f3b7a2c4",
    "code": "AMZN-4F72-9KD3-1QW8",
    "fulfilled_at": "2026-08-27T10:02:19.000Z"
  }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 404 | `CZDRDM003` | We could not find that order. | No order with that id belongs to this user. | `OrderNotFoundIcon` |
| 400 | `CZDRDM005` | Your gift card code is not ready yet. Please check back soon. | The order is not fulfilled yet, so there is no code to show. | `CodeNotReadyIcon` |
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A field failed validation, or an unknown field was sent. | `ValidationFailedIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDRDM003",
  "cz_error_message": "We could not find that order.",
  "cz_error_description": "No gift card order exists for the given id and user.",
  "cz_error_icon": "OrderNotFoundIcon",
  "statusCode": 404,
  "timestamp": "2026-08-27T09:12:44.183Z"
}
```

## Enum values

None. This endpoint has no fields with a fixed set of values.

## Example

```bash
curl http://localhost:4000/api/redeem/orders/a91f4e07-2c68-4b35-9d80-51e6f3b7a2c4/code \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Codes are stored encrypted with `ENCRYPTION_KEY` and decrypted only here, so this is the only endpoint that ever returns one.
- The code column is excluded from every other query by default; it is added back explicitly for this call.
- The code can be revealed as many times as the user likes; nothing is consumed by reading it.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
