# KYC — identity verification by face scan

One selfie, one automatic decision, and a human queue for anything the machine is not sure about. This document is the contract the app and the admin panel integrate against.

- Base path: `/api`
- Every timestamp is UTC, ISO-8601 with a `Z` suffix.
- Success bodies are wrapped as `{ "success": true, "data": ... }`.
- Error bodies are `{ "success": false, "cz_error_code", "cz_error_message", "cz_error_description", "statusCode", "timestamp" }`.

## What the check actually is

The selfie is sent to AWS Rekognition `DetectFaces` with `Attributes: ['ALL']`. That call answers one question: *is there a face in this picture, and what does it look like*. It is **not** a document match and **not** a liveness session — no other Rekognition API is used.

The backend then applies these rules, in this order:

| Condition | Result |
|---|---|
| No face found | `rejected`, `reason_code: CZDKYC004` |
| More than one face found | `rejected`, `reason_code: CZDKYC005` |
| One face, confidence ≥ threshold, eyes open, no sunglasses, face not obscured, sharpness ≥ 20 | `verified` |
| One face, anything else | `manual_review` |

The threshold is the `kyc_confidence_threshold` app setting, default `90`. Admins change it through `PUT /api/admin/settings`.

"Eyes open", "sunglasses" and "face obscured" only count when Rekognition reports them with at least 90% confidence of its own, so a hesitant guess never costs a user their verification.

A borderline photo is never a failure. It becomes `manual_review` and a person looks at it.

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/kyc/verify` | user token | Submit a selfie and get the decision. |
| `GET` | `/api/kyc/status` | user token | Current KYC state and the newest attempt. |
| `GET` | `/api/kyc/attempts` | user token | Past attempts, newest first. |
| `GET` | `/api/admin/kyc/queue` | admin token | Attempts waiting on a human, newest first. |
| `POST` | `/api/admin/kyc/:id/approve` | admin token | Approve one attempt. |
| `POST` | `/api/admin/kyc/:id/reject` | admin token | Reject one attempt, with an optional reason. |
| `GET` | `/api/admin/kyc` | admin token | Every attempt, filterable by status, oldest first. |
| `GET` | `/api/admin/kyc/:id` | admin token | One attempt in full. |
| `PATCH` | `/api/admin/kyc/:id/review` | admin token | Approve or reject in a single call with a body. |

**User token** — the Coinzu access token from sign-in. **Admin token** — a Rewardtym admin access token whose `product_access` claim is `both` or `coinzu`. There is no Coinzu admin account; the same Rewardtym token opens both products.

---

## `POST /api/kyc/verify`

Submit the selfie.

**Auth:** user token. **Content-Type:** `multipart/form-data`.

### Request

| Field | Type | Required | Rules |
|---|---|---|---|
| `file` | file | yes | `image/jpeg`, `image/png` or `image/webp`, at most 5 MB. |

The form field name is exactly `file`. Nothing else is accepted on the request.

```bash
curl -X POST http://localhost:4000/api/kyc/verify \
  -H 'Authorization: Bearer <access_token>' \
  -F 'file=@selfie.jpg'
```

### Response — `201`, every outcome

```json
{
  "success": true,
  "data": {
    "cz_kyc_verification_id": "65681e52-8ce4-44f2-a5d5-f4b7465f21de",
    "status": "verified",
    "reason_code": null,
    "message": "Your identity is verified. Withdrawals are unlocked.",
    "selfie_url": "https://cdn.coinzu.app/kyc/0e2d46f5-a4ff-4b1c-b52a-5336a78d3726.jpg"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `cz_kyc_verification_id` | string (uuid) | Primary key of this attempt. |
| `status` | `verified` \| `manual_review` \| `rejected` | The decision. |
| `reason_code` | `CZDKYC004` \| `CZDKYC005` \| `null` | Only set when `status` is `rejected`. |
| `message` | string | Show it to the user as-is. |
| `selfie_url` | string | Public URL of the stored photo. |

The confidence score and the raw Rekognition payload are deliberately **not** in this response. They live on the row for admins and audits only. Do not build UI that expects them.

### The three outcomes

**`verified`** — done. `message` is *"Your identity is verified. Withdrawals are unlocked."* The account `kyc_status` is now `verified` and withdrawals are open.

**`manual_review`** — `reason_code` is `null`, `message` is *"Thanks — a team member is checking your photo. This usually takes a day."* Nothing more is asked of the user. Show a waiting state and stop; do not offer a retry, do not treat it as an error.

**`rejected`** — the photo could not be judged at all. `reason_code` says which:

| `reason_code` | Meaning | `message` |
|---|---|---|
| `CZDKYC004` | No face in the picture | We could not find a face in that photo. Please retake it in good light with your face clearly visible. |
| `CZDKYC005` | More than one face | We found more than one face in that photo. Please retake it with only you in the frame. |

Show `message`, put the camera back up, let them try again immediately.

### Errors

| Status | `cz_error_code` | Meaning |
|---|---|---|
| 400 | `CZDKYC002` | Already verified. Do not show the camera at all in this state. |
| 400 | `CZDKYC003` | An attempt is still `pending`. Wait for it. |
| 400 | `CZDSTR001` | No file was sent. |
| 400 | `CZDSTR002` | Not a JPEG, PNG or WebP. |
| 400 | `CZDSTR003` | Larger than 5 MB. |
| 500 | `CZDSTR004` | The photo could not be stored. |
| 503 | `CZDKYC007` | Face detection is unavailable. **Nothing was recorded** — offer a retry. |
| 400 | `CZDCOMM001` | Validation failed, or an unknown field was sent. |
| 401 | `CZDAUTH005` / `CZDAUTH003` / `CZDAUTH004` | Missing / expired / invalid token. |
| 429 | `CZDCOMM005` | Rate limited. |
| 500 | `CZDCOMM002` | Unhandled server error. |

A rejection is **not** an error. It arrives as `200`-family success with `status: "rejected"`. Only the codes above are error bodies.

---

## `GET /api/kyc/status`

**Auth:** user token.

```json
{
  "success": true,
  "data": {
    "kyc_status": "rejected",
    "latest_attempt": {
      "cz_kyc_verification_id": "a0ec74fb-5054-4849-b694-ff101062032d",
      "selfie_url": "https://cdn.coinzu.app/kyc/a6ac892c-a90f-471f-b05f-953cdb3270d3.jpg",
      "status": "rejected",
      "rejection_code": "CZDKYC004",
      "rejection_reason": "We could not find a face in that photo. Please retake it in good light with your face clearly visible.",
      "reviewed_at": "2026-08-27T12:09:15.155Z",
      "created_at": "2026-08-27T12:09:15.341Z"
    },
    "reason_code": "CZDKYC004",
    "reason": "We could not find a face in that photo. Please retake it in good light with your face clearly visible.",
    "can_retry": true
  }
}
```

| Field | Type | Description |
|---|---|---|
| `kyc_status` | `none` \| `pending` \| `verified` \| `rejected` \| `manual_review` | State on the account. `none` means never submitted. |
| `latest_attempt` | object \| null | `null` when the user never submitted a selfie. |
| `latest_attempt.cz_kyc_verification_id` | string (uuid) | — |
| `latest_attempt.status` | `pending` \| `verified` \| `rejected` \| `manual_review` | — |
| `latest_attempt.rejection_code` | string \| null | `CZDKYC004`, `CZDKYC005` or `null`. |
| `latest_attempt.rejection_reason` | string \| null | The sentence, machine-written or admin-written. |
| `latest_attempt.selfie_url` | string | — |
| `latest_attempt.reviewed_at` | string \| null | When it was settled. |
| `latest_attempt.created_at` | string | When it was submitted. |
| `reason_code` | string \| null | Mirrors `latest_attempt.rejection_code`. Only set when rejected. |
| `reason` | string \| null | The actionable sentence. Only set when rejected. Show it verbatim. |
| `can_retry` | boolean | `false` once verified, or while an attempt is `pending`. |

When an admin rejects an attempt, `reason` carries what they wrote — that is the actionable message for a rejection that did not come from the machine.

### Errors

`401` `CZDAUTH005` / `CZDAUTH003` / `CZDAUTH004`, `429` `CZDCOMM005`, `500` `CZDCOMM002`.

---

## `GET /api/kyc/attempts`

**Auth:** user token. Query: `page` (1-based, default 1), `limit` (default 20).

Returns `{ "data": [ ... ], "total": n }`, newest first. Each row carries the same seven fields as `latest_attempt` above. Score and raw payload are not included.

---

## `GET /api/admin/kyc/queue`

**Auth:** admin token. Query: `page`, `limit`.

Only `status: "manual_review"` rows, newest first. Each row is the **whole** database row, including the admin-only fields:

| Field | Type | Description |
|---|---|---|
| `cz_kyc_verification_id` | string (uuid) | — |
| `user_id` | string (uuid) | Who submitted it. |
| `selfie_url` | string | The photo to look at. |
| `rekognition_score` | number \| null | Face confidence 0–100. |
| `rekognition_response` | object \| null | The raw `DetectFaces` payload. |
| `status` | string | Always `manual_review` here. |
| `rejection_code` | string \| null | Always `null` here. |
| `rejection_reason` | string \| null | Always `null` here. |
| `reviewed_by` | string \| null | Always `null` here. |
| `reviewed_at` | string \| null | When the automatic check ran. |
| `created_at` | string | When it was submitted. |

`rekognition_response.FaceDetails[0]` is what tells the reviewer why the machine hesitated — read `Confidence`, `EyesOpen`, `Sunglasses`, `FaceOccluded` and `Quality.Sharpness`.

---

## `POST /api/admin/kyc/:id/approve`

**Auth:** admin token. No body. Returns the whole updated row with `status: "verified"`, `rejection_code: null`, `rejection_reason: null`, `reviewed_by` set to the acting admin, `reviewed_at` set to now.

## `POST /api/admin/kyc/:id/reject`

**Auth:** admin token. Body:

| Field | Type | Required | Rules |
|---|---|---|---|
| `reason` | string | no | At most 500 characters. Stored as `rejection_reason`, shown to the user word for word. |

`{}` is a valid body. Returns the whole updated row with `status: "rejected"` and `rejection_code: null` — the code is reserved for automatic rejections.

Both routes set the user's `kyc_status` to match and send a notification. `reviewed_by` holds the **Rewardtym** admin id from the token's `sub` claim — a string like `lt_admin_9f2c4a1b7e6d8035`, not a Coinzu uuid.

### Errors on the admin routes

| Status | `cz_error_code` | Meaning |
|---|---|---|
| 404 | `CZDKYC001` | No attempt with that id. |
| 403 | `CZDAUTH007` | The token's `product_access` does not cover Coinzu. |
| 400 | `CZDCOMM001` | Validation failed. |
| 401 | `CZDAUTH005` / `CZDAUTH003` / `CZDAUTH004` | Missing / expired / invalid token. |

---

## All enum values

| Field | Where | Every allowed value |
|---|---|---|
| `kyc_status` | `GET /kyc/status`, user record | `none`, `pending`, `verified`, `rejected`, `manual_review` |
| `status` | attempt rows, `POST /kyc/verify` | `pending`, `verified`, `rejected`, `manual_review` |
| `reason_code` / `rejection_code` | attempt rows, `POST /kyc/verify` | `CZDKYC004`, `CZDKYC005`, `null` |

`pending` exists on the column but no route ever produces it today; it is there for a row an admin has not settled. `none` is only ever on `kyc_status`, never on an attempt.

---

# Frontend integration guide

This is a face scan and nothing more. Getting it right is mostly about the photo you send.

## The whole flow

```
1. GET /api/kyc/status
     kyc_status === "verified"      → show "Verified", no camera
     kyc_status === "manual_review" → show "Under review", no camera, poll
     kyc_status === "pending"       → show "Under review", no camera, poll
     otherwise (none / rejected)    → show the camera, and the `reason` if present

2. Capture a selfie with the front camera

3. POST /api/kyc/verify  (multipart, field name `file`)

4. status === "verified"      → success screen, withdrawals unlocked
   status === "manual_review" → "we're checking it" screen, then poll step 1
   status === "rejected"      → show `message`, back to step 2
```

## Step 2 — the capture, in detail

Use the **front camera** and hold the user's hand through it. Rekognition can only judge what it is given.

```js
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'user',
    width: { ideal: 1080 },
    height: { ideal: 1080 },
  },
  audio: false,
});
video.srcObject = stream;
```

Draw an oval guide on the preview and ask the user to fill it. On screen, before the shutter:

- Only you in the frame
- Look straight at the camera, eyes open
- Take off sunglasses, hats and masks
- Find good, even light — no strong backlight
- Hold still so the photo is sharp

Those five lines map one-to-one onto the rules the backend applies. Every one of them that the user ignores is a `manual_review` or a `rejected`.

Then grab the frame and encode it:

```js
const canvas = document.createElement('canvas');
canvas.width = 1080;
canvas.height = 1080;
canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

const blob = await new Promise((resolve) =>
  canvas.toBlob(resolve, 'image/jpeg', 0.92),
);

const body = new FormData();
body.append('file', blob, 'selfie.jpg');

const res = await fetch(`${BASE}/kyc/verify`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body,
});
const json = await res.json();
```

Do **not** set `Content-Type` yourself — the browser adds the multipart boundary. Setting it by hand breaks the upload.

**Stop the camera** when you are done, or the indicator light stays on:

```js
stream.getTracks().forEach((track) => track.stop());
```

### Photo requirements the backend enforces

| Rule | Limit | Failure |
|---|---|---|
| MIME type | `image/jpeg`, `image/png`, `image/webp` | `CZDSTR002` |
| Size | 5 MB | `CZDSTR003` |
| Field name | `file` | `CZDSTR001` |

Around 1080×1080 at JPEG quality 0.9 lands well under 5 MB while staying sharp enough. If a device produces something bigger, downscale on the client before uploading rather than letting the request fail. Do not upscale a small or blurry capture — sharpness below 20 sends the attempt to manual review, and upscaling does not add any.

### Mirroring

Previews are usually mirrored with `transform: scaleX(-1)` so the user sees themselves the natural way. That is CSS only — the canvas frame is unmirrored, which is what you want. Do not mirror the pixels you upload.

### Native apps

Same rules. Use the front camera, capture a still (not a video frame from a low-resolution preview stream), and send it as `multipart/form-data` under the field name `file`. On iOS, HEIC must be converted to JPEG before uploading — the backend only accepts JPEG, PNG and WebP.

## Step 4 — handling each outcome

Branch on `data.status` and nothing else.

```js
switch (json.data.status) {
  case 'verified':
    // Withdrawals are open. kyc_status is already "verified".
    showVerified(json.data.message);
    break;

  case 'manual_review':
    // Nothing more is asked of the user. No retry button.
    showUnderReview(json.data.message);
    startPollingStatus();
    break;

  case 'rejected':
    // json.data.message already says what to fix.
    showRetry(json.data.message);
    break;
}
```

Show `message` as it is. It is written for the user and it already names the problem — "we could not find a face", "more than one face in the frame". Never invent your own wording from `reason_code`, and never show `reason_code` on screen.

## Polling after `manual_review`

A human decision has no push behind it. Poll `GET /api/kyc/status` and read `kyc_status`:

- when the app returns to the foreground, and
- every 60 seconds while the review screen is open — no faster, the global rate limit is 120 requests per minute per IP.

Stop polling when `kyc_status` becomes `verified` or `rejected`. Reviews usually settle within a day, so it is fine to drop the poll after a few minutes and re-check on the next app open.

## Retry rules

- After `rejected`, the user can submit again immediately. `can_retry` is `true`.
- After `manual_review`, do not offer a retry — a person already has the photo.
- After `verified`, hide the entry point entirely. A second submit returns `CZDKYC002`.
- While `kyc_status` is `pending`, a submit returns `CZDKYC003`. Show the waiting state instead of the camera.
- On `CZDKYC007`, nothing at all was recorded. Show "please try again in a moment" and keep the camera open — this is the one error where an instant retry is exactly right.

## Where KYC bites elsewhere

Withdrawals require `kyc_status: "verified"` while the `withdrawal_requires_kyc` setting is on. `POST /api/wallet/withdrawals` fails with `CZDWLT007` otherwise. Check `kyc_status` before showing the withdrawal form and send the user here first.

## Permissions

Ask for the camera permission at the moment the user taps "Verify", not on app start, and explain why in one line first. If the permission is denied, offer a file picker as a fallback — the endpoint takes any JPEG/PNG/WebP, however it was produced. A saved photo of the user's face passes exactly the same check.

## Quick reference — the whole contract

| | |
|---|---|
| Submit | `POST /api/kyc/verify`, multipart, field `file` |
| Read back | `data.status`, `data.reason_code`, `data.message` |
| Poll | `GET /api/kyc/status` → `kyc_status`, `reason`, `can_retry` |
| History | `GET /api/kyc/attempts?page=1&limit=20` |
| Statuses | `none`, `pending`, `verified`, `rejected`, `manual_review` |
| Reason codes | `CZDKYC004` (no face), `CZDKYC005` (many faces) |
| Limits | JPEG/PNG/WebP, 5 MB |
