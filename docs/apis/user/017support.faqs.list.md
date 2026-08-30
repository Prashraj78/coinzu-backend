# GET /api/support/faqs

Lists or searches the active FAQs, in display order. Public.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/support/faqs` |
| **Auth** | Public — no token required. |
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
| `category` | query | string | no | Category **slug**, e.g. `payment`. Take it from the `categories` array this same endpoint returns. Omit to get every FAQ. |
| `category_id` | query | string (uuid) | no | The same filter by id, for callers that already hold one. Sent together with `category`, both apply. |

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `data` | object[] | FAQs. |
| `data[].cz_faq_id` | string (uuid) | Primary key of the FAQ. |
| `data[].category_id` | string (uuid) | The category it belongs to. |
| `data[].question` | string | The question. |
| `data[].answer` | string | The answer. |
| `data[].display_order` | number | Sort order inside the category, lowest first. |
| `data[].is_active` | boolean | Always `true` here. Hidden FAQs are filtered out server-side and never returned. |
| `total` | number | How many FAQs match. |
| `categories` | object[] | Every active category, for the "Browse by category" chips. Always the full set, never filtered by `category`. |
| `categories[].cz_faq_category_id` | string (uuid) | Primary key. |
| `categories[].slug` | string | Send this back as `?category=`. |
| `categories[].name` | string | Display name for the chip. |
| `categories[].icon` | string \| null | Icon name for the chip. |
| `categories[].display_order` | number | Chip order, ascending. |
| `categories[].is_active` | boolean | Always `true` here. |

```json
{
  "success": true,
  "data": {
    "data": [
  {
      "cz_faq_id": "5a71c308-92e4-4bd7-8f60-1c3e07a9d254",
      "category_id": "0f1b2c3d-4e5f-6789-abcd-ef0123456789",
      "question": "How long do withdrawals take?",
      "answer": "Most withdrawals settle within 48 hours.",
      "display_order": 1,
      "is_active": true
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
curl 'http://localhost:4000/api/support/faqs?search=withdraw'
```

## Notes

- **This is the only FAQ endpoint.** Categories ride along in `categories`, so the chips and the list come from one call. The separate `faq-categories` and `faqs/:id` endpoints were removed: the first is folded in here, and the second was pointless once the full list is returned in one response.
- **There is no search parameter.** The whole FAQ set is small and comes back in one unpaginated response, so the app filters it on the device as the user types. That keeps search instant and works offline once the list is cached.
- Fetch the list once per session and keep it. Re-fetch only when the user pulls to refresh.
- A FAQ inside a category the admin has switched off is excluded too, not just FAQs switched off individually.
- Ordered by category `display_order`, then the FAQ's own `display_order`, so the response is already in the order the screen should render.
- Admins manage this content from the Coinzu FAQs tab. Anything they add or edit is live on the next request, with no release.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
