# POST /api/users/me/device

Registers or refreshes the calling app install as a device — the source of fraud signals (IP, ASN, ISP, VPN flag, country, fingerprint, reinstall-surviving `hardware_id`, SIM country/carrier, emulator/root flags) and, once the app has FCM/APNs, the target for push notifications. On every call the server computes a per-device `risk_score` + `risk_flags` and a user-level `fraud_score` + `fraud_flags` — **scored and stored only; nothing is blocked on them yet, and none of it is ever returned in the response.**

## Overview

| Item | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/users/me/device` |
| **Auth** | Bearer access token required. |
| **Role** | any signed-in user |
| **Rate limit** | Global default: 120 requests per minute per IP. |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <access_token>` |
| `X-Device-Type` | no | `ios`, `android` or `web`. Used to resolve `platform_type` when the body omits it, before falling back to User-Agent sniffing. |

### Path / query params

None.

### Body

| Field | Type | Required | Rules | Description |
|---|---|---|---|---|
| `device_id` | string | yes | 1–255 characters. | The app's persistent per-install id (an app-generated UUID). Rows are upserted on `cz_user_id` + `device_id`. Resets on reinstall — use `hardware_id` for reinstall-surviving linkage. |
| `platform_type` | string | no | One of `ios`, `android`, `web`. | Falls back to the `X-Device-Type` header, then to User-Agent sniffing, when omitted. |
| `hardware_id` | string | no | 1–255 characters. | Reinstall-surviving device id — `ANDROID_ID` (SSAID) on Android, `IDFV` on iOS, omitted on web. The strongest cross-account signal: many accounts on one `hardware_id` = one physical device. |
| `sim_country_code` | string | no | Exactly 2 characters. | SIM ISO 3166-1 alpha-2 country. Omitted on wifi-only / eSIM / web. |
| `carrier` | string | no | 1–120 characters. | SIM carrier name. |
| `mcc_mnc` | string | no | 1–15 characters. | Mobile country code + network code, `"MCC-MNC"`. |
| `is_emulator` | boolean | no | — | `true` when the app runs on an emulator, not real hardware. |
| `is_rooted` | boolean | no | — | `true` when the device appears rooted / jailbroken. |
| `push_token` | string | no | 1–255 characters. | FCM/APNs push token. Send it again whenever it rotates. |
| `device_info` | object | no | Any JSON object. | Free-form device metadata — app version, OS version, model, brand, locale, timezone, screen size, RAM, etc. The app can add fields here at any time with no backend change. |

```json
{
  "device_id": "b7e2b6b0-1a2b-4c3d-9e4f-5a6b7c8d9e0f",
  "platform_type": "android",
  "hardware_id": "ff8a1c2d3e4f5a6b",
  "sim_country_code": "IN",
  "carrier": "Airtel",
  "mcc_mnc": "404-45",
  "is_emulator": false,
  "is_rooted": false,
  "push_token": "fcm-or-apns-token",
  "device_info": {
    "app_version": "1.4.2",
    "os_version": "17.4",
    "model": "Pixel 8",
    "brand": "Google",
    "locale": "en-US",
    "timezone": "Asia/Kolkata"
  }
}
```

## Response

### Success — `201`

| Field | Type | Description |
|---|---|---|
| `cz_device_id` | string (uuid) | Primary key of the device row. |
| `device_id` | string | Echo of the id sent in the request. |
| `platform_type` | string | The resolved platform — one of `ios`, `android`, `web`. |
| `registered` | boolean | Always `true`. |

```json
{
  "success": true,
  "data": {
    "cz_device_id": "5b2a86e1-2e11-4c3d-9e4f-5a6b7c8d9e0f",
    "device_id": "b7e2b6b0-1a2b-4c3d-9e4f-5a6b7c8d9e0f",
    "platform_type": "android",
    "registered": true
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
  "cz_error_description": "device_id must be 1-255 characters.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-28T09:12:44.183Z"
}
```

## Enum values

Every value this endpoint can send or accept for its fixed-value fields.

| Field | Allowed values | Notes |
|---|---|---|
| `platform_type` | `ios`, `android`, `web` | Same values as the `platform` enum in `docs/ENUMS.md`. |
| `risk_flags` (internal, not in the response) | `SHARED_HARDWARE_ID`, `EMULATOR`, `ROOTED`, `SIM_IP_COUNTRY_MISMATCH`, `VPN` | Server-computed fraud flags stored on the device row and unioned into the user's `fraud_flags`. See the `risk_flags` section in `docs/ENUMS.md`. |

## Example

```bash
curl -X POST http://localhost:4000/api/users/me/device \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{
    "device_id": "b7e2b6b0-1a2b-4c3d-9e4f-5a6b7c8d9e0f",
    "platform_type": "android",
    "hardware_id": "ff8a1c2d3e4f5a6b",
    "sim_country_code": "IN",
    "carrier": "Airtel",
    "mcc_mnc": "404-45",
    "is_emulator": false,
    "is_rooted": false,
    "push_token": "fcm-or-apns-token",
    "device_info": { "app_version": "1.4.2", "os_version": "17.4", "model": "Pixel 8" }
  }'
```

## Notes

- Idempotent: calling it again for the same `device_id` updates the existing row (`last_seen_at`, IP, push token, etc.) instead of creating a duplicate.
- `POST /api/auth/register` accepts the same shape under an optional `device` field, so the very first call can happen at sign-up. Call this endpoint again on later logins or whenever the push token rotates to keep the row fresh.
- `ip_address`, `country_code`, `asn`, `isp`, `is_vpn`, `user_agent` and `fingerprint` are computed by the server from the request and IP geolocation lookups — they are never accepted from the request body and are never returned in the response, to avoid handing fraud-detection internals back to the device being scored.
- IP geolocation (ASN, ISP, VPN-hosting flag, country) is looked up through free third-party providers with a 6-hour cache; if every provider fails, those fields are stored as `null` rather than blocking the request.
- `fingerprint` is `sha256(user_agent|asn|platform_type|device_id)`, a coarse fraud-matching signal, not a precise per-device fingerprint.
- `hardware_id`, `sim_country_code`, `carrier`, `mcc_mnc`, `is_emulator` and `is_rooted` are supplied by the client (the OS exposes them). They are stored as sent; on web and before the app's native rebuild they arrive omitted and the row keeps the reduced field set.
- **Fraud scoring is stored, not enforced.** On each call the server sets the device's `risk_score` (0–100) and `risk_flags` (see the `risk_flags` enum), then recomputes the user aggregate `fraud_score` = MAX of the user's device scores and `fraud_flags` = union of their flags. `SHARED_HARDWARE_ID` fires when more than one account has been seen on the same `hardware_id`. Nothing is blocked on these yet — thresholds are meant to be tuned on real data first. All of it is server-only and never returned.
- All dates and times are UTC, ISO-8601 with a `Z` suffix. Send UTC, read UTC, convert only for display.
