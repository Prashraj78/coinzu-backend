# PATCH /api/admin/rewards/games/:cz_reward_game_id

Edits one reward card — its wording, its price, how many entries a purchase may buy, and whether it is live.

## Overview

| Item | Value |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/admin/rewards/games/:cz_reward_game_id` |
| **Auth** | Bearer **Rewardtym** admin access token required. |
| **Role** | admin |
| **Rate limit** | default (120/min) |

## Request

### Headers

| Header | Required | Value |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `Authorization` | yes | `Bearer <admin_access_token>` |

### Path / query params

| Name | Type | Required | Description |
|---|---|---|---|
| `cz_reward_game_id` | string (uuid) | yes | The card to edit. |

### Body

Every field optional; only what you send changes.

| Field | Type | Rules | Description |
|---|---|---|---|
| `title` | string | Max 120. | The card's name. |
| `subtitle` | string | Max 255. | The line under it. |
| `icon_url` | string | Max 500. | Card artwork. |
| `headline_prize_coins` | integer | 0–100,000,000. | The big number. Display only. |
| `entry_cost_gems` | integer | 0–1,000,000. | Gems per entry, or per play. |
| `min_entries` | integer | 1–10,000. | Fewest per purchase. |
| `max_entries` | integer | 1–10,000. | Most per purchase. |
| `entry_packs` | integer[] | Up to 10 positive integers. | Quick-pick buttons, in order. |
| `how_it_works` | object[] | Up to 6 `{ title, description?, icon_url? }`. | The explainer strip. Pick each `icon_url` from the `reward_step_icon` dropdown type. |
| `terms_url` | string | Max 500. | The T&C link. |
| `status` | string | See [Enum values](#enum-values). | |
| `cadence` | string | See [Enum values](#enum-values). | Draw games only. |
| `display_order` | integer | ≥ 0. | Card order. |

```json
{ "entry_cost_gems": 15, "entry_packs": [5, 10, 25, 50, 100, 250], "status": "live" }
```

## Response

### Success — `200`

Identical to `GET /api/admin/rewards/games`, so the tab re-renders from the response.

### Errors

| Status | `cz_error_code` | `cz_error_message` | Cause | Icon |
|---|---|---|---|---|
| 400 | `CZDCOMM001` | Please check the details you entered and try again. | A value out of range, an unknown status or cadence, `min_entries` above `max_entries`, or an unknown field. | `ValidationFailedIcon` |
| 404 | `CZDCOMM004` | We could not find what you were looking for. | No reward game exists with that id. | `NotFoundIcon` |
| 401 | `CZDAUTH005` | Please sign in to continue. | Authorization header is missing. | `SignInRequiredIcon` |
| 401 | `CZDAUTH003` | Your session has expired. Please sign in again. | Access token expired. | `SessionExpiredIcon` |
| 401 | `CZDAUTH004` | Your session is no longer valid. Please sign in again. | Access token could not be verified. | `SessionInvalidIcon` |
| 403 | `CZDAUTH007` | You do not have permission to do that. | Token `product_access` claim is neither `both` nor `coinzu`, or — on a token issued before that claim existed — the `role` claim is not listed in `ADMIN_ROLES`. | `PermissionDeniedIcon` |
| 429 | `CZDCOMM005` | Too many requests. Please slow down and try again. | Rate limit exceeded. | `RateLimitedIcon` |
| 500 | `CZDCOMM002` | Something went wrong. Please try again. | Unhandled server error. | `ServerErrorIcon` |

```json
{
  "success": false,
  "cz_error_code": "CZDCOMM001",
  "cz_error_message": "Please check the details you entered and try again.",
  "cz_error_description": "min_entries cannot be above max_entries.",
  "cz_error_icon": "ValidationFailedIcon",
  "statusCode": 400,
  "timestamp": "2026-08-30T12:14:04.183Z"
}
```

## Enum values

| Field | Allowed values | Notes |
|---|---|---|
| `status` | `live`, `coming_soon`, `paused` | `paused` hides the card from the app; `coming_soon` shows it unplayable. |
| `cadence` | `none`, `daily`, `weekly` | Changing it takes effect on the **next** draw, not the open one. |

## Notes

- **`slug` and `kind` cannot be changed.** The slug is how a shipped app addresses the card, and the kind decides the mechanic. Neither is in the body.
- **Changes are live immediately**, including for a draw already accepting entries. Raising `entry_cost_gems` mid-period means later buyers pay more than earlier ones for the same draw — each purchase records the price it paid, so the ledger stays honest, but prefer changing price between periods.
- **Changing `cadence` does not move the open draw.** The current instance keeps its deadline; the new cadence applies to the one opened after it settles.
- **Step icons come from the dropdown master data.** `how_it_works[].icon_url` should be one of the `reward_step_icon` options, so the artwork is managed in one place and reused across rewards. Nothing enforces it — any R2 URL is accepted — but picking from the list is what keeps the strip consistent.
- **`entry_packs` are a convenience, not a constraint.** Anything between `min_entries` and `max_entries` is a valid purchase, so the app keeps its free-entry keypad regardless.
- Setting a live draw game to `paused` leaves its open draw in place but unreachable. Set it back to `live` and entries resume; the deadline did not move.
