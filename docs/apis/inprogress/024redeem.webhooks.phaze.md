# POST /api/redeem/webhooks/phaze

Phaze calls this whenever a gift card order changes status. The payload is only a nudge: the backend re-reads the order from Phaze and settles it from that answer. Not called by the app.

## Overview

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/redeem/webhooks/phaze` |
| **Auth** | Public — no token required. Authenticated by the shared secret header Phaze was registered with (`POST /api/admin/redeem/phaze/webhook`). |
| **Role** | none |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `x-phaze-webhook-key` | yes | The value of `PHAZE_WEBHOOK_SECRET`. The header name is `PHAZE_WEBHOOK_HEADER` (default `x-phaze-webhook-key`). |

### Path / query params

None.

### Body

Phaze's transaction object. Only `orderId` is read; every other field is ignored.

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `orderId` | string | yes | — | Our `cz_gift_card_order_id`, sent to Phaze as `orderId` at purchase. |

```json
{ "orderId": "6f1c2b9e-3a7d-4c11-9a52-0d8e2f7b1c44", "status": "processed", "vouchers": [{ "code": "J56-67AJU-876" }] }
```

## Response

### Success — `200`

Returned for any authenticated call, including an unknown or already settled `orderId`, so Phaze does not retry.

| Field | Type | Description |
|---|---|---|
| `received` | boolean | Always `true`. |

```json
{ "success": true, "data": { "received": true } }
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 401 | `CZDRDM006` | We could not verify this request. | The secret header is missing or wrong. | `RequestUnverifiedIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDRDM006",
  "cz_error_message": "We could not verify this request.",
  "cz_error_description": "The gift-card vendor webhook did not carry the shared secret we registered.",
  "cz_error_icon": "RequestUnverifiedIcon",
  "statusCode": 401
}
```

## Enum values

Phaze `status` (read from the re-fetched order, not the payload):

| Value | Meaning |
|---|---|
| `pending` | Phaze is still issuing the card. The order stays `pending`. |
| `processed` | Issued. The order becomes `fulfilled` and the code is stored encrypted. |
| `failed` | Phaze refused. The order becomes `failed` and the coins are refunded. |

## Notes

- Pending orders are also polled by the `gift_card_order_poll` cron, so a missed webhook only delays a code, never loses it.
- A webhook for an order that is not `pending` (already settled) is a no-op.
