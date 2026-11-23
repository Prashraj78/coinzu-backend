# GET /api/users/me/network-check

Whether the request's IP is a VPN, proxy, Tor exit or datacenter network. The app and the web show a blocking "turn off your VPN" sheet while `blocked` is true and re-check until it clears.

## Overview

| Item | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/users/me/network-check` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Authorization` | yes | `Bearer <access_token>` |

### Path / query params

None.

### Body

None.

## Response

### Success — `200`

| Field | Type | Description |
|---|---|---|
| `blocked` | boolean | `true` when the IP is flagged and `NETWORK_BLOCK_ENABLED` is on (default). |

```json
{
  "success": true,
  "data": { "blocked": true }
}
```

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 403 | `CZDAUTH021` | Your account has been blocked for activity that breaks our rules. Contact support if you think this is a mistake. | The account is suspended, banned or deleted. | `AccountInactiveIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token has expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDAUTH003",
  "cz_error_message": "Your session has expired. Please sign in again.",
  "cz_error_description": "Access token has expired.",
  "cz_error_icon": "SessionExpiredIcon",
  "statusCode": 401,
  "timestamp": "2026-11-23T10:04:12.511Z"
}
```

## Enum values

None.

## Example

```bash
curl http://localhost:4000/api/users/me/network-check \
  -H 'Authorization: Bearer <access_token>'
```

## Notes

- Uses the IP lookup the backend already runs for offers and device signals (ip-api.com, falling back to ipwho.is), cached 6 hours per IP in Redis.
- Flagged = ip-api `proxy` (VPN / proxy / Tor) or `hosting` (datacenter, which includes iCloud Private Relay and Cloudflare WARP).
- Loopback IPs and a failed lookup never block.
- `NETWORK_BLOCK_ENABLED=false` turns blocking off without an app release.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
