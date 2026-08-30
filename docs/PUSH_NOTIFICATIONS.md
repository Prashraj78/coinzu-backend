# Push notifications — setup and app integration

Everything needed to take push from "nothing configured" to "a banner on the device". Two audiences: whoever owns the Firebase project and the backend env, and the app developer who has to make the phone receive the message.

---

## 1. Do we need a Firebase account?

**Yes — one Firebase project, free.** FCM is the only way to reach an Android or iOS device, and Apple's APNs is reached *through* FCM so there is nothing separate to build for iOS.

The module is already finished and usable without it. With no credentials every send is a **dry run**: the audience is resolved, the campaign row records exactly who it would have reached, and every targeted user still gets an in-app notification row. Only the device banner is skipped, and the campaign is flagged `dry_run: true`. Adding the credentials turns real delivery on with **no code change and no redeploy of the app**.

### What to create

1. Go to <https://console.firebase.google.com>, **Add project**. Call it `coinzu` (or anything — the name is not user-visible).
2. Google Analytics is optional. Skip it.
3. Add the apps: **Add app → Android** and **Add app → iOS**.
   - Android needs the package name (e.g. `com.coinzu.app`) and gives back `google-services.json`.
   - iOS needs the bundle id and gives back `GoogleService-Info.plist`.
   - Both files go to the **app** developer, not the backend.
4. For iOS only: **Project settings → Cloud Messaging → APNs Authentication Key**, upload the `.p8` key from the Apple Developer account along with its Key ID and Team ID. Without this, iOS pushes silently do not arrive.
5. **Project settings → Service accounts → Generate new private key**. This downloads a JSON file. That file is the backend's credential — keep it out of git.

### Backend env

Three values, all from that service-account JSON:

```bash
FIREBASE_PROJECT_ID=coinzu-1a2b3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@coinzu-1a2b3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

- `FIREBASE_PRIVATE_KEY` is the `private_key` field of the JSON, copied verbatim **with its `\n` escapes intact**, wrapped in double quotes. `env.ts` turns those back into real newlines.
- All three must be set. Any one missing and the module stays in dry-run mode.
- The admin panel shows a banner while they are missing, and the list endpoint reports it as `summary.firebase_configured: false`.

Restart the API after setting them. Confirm with:

```bash
curl -X POST "$BASE/admin/push/preview" \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer $ADMIN_TOKEN' \
  -d '{}'
# firebase_configured must now be true
```

---

## 2. What the app developer has to do

The backend can only push to a device it has a token for. Getting that token and handing it over is the app's job, and it is the whole integration — there is no push-specific endpoint to call.

### Step 1 — Add the Firebase SDK

Drop `google-services.json` into the Android project and `GoogleService-Info.plist` into the iOS project, then install the messaging SDK:

| Stack | Package |
|---|---|
| React Native | `@react-native-firebase/app` + `@react-native-firebase/messaging` |
| Flutter | `firebase_core` + `firebase_messaging` |
| Native Android | `com.google.firebase:firebase-messaging` |
| Native iOS | `FirebaseMessaging` |

iOS additionally needs the **Push Notifications** capability and **Background Modes → Remote notifications** turned on in Xcode.

### Step 2 — Ask for permission, at the right moment

iOS and Android 13+ both require an explicit grant, and the user only gets asked once. Do **not** fire it on first launch — ask after the user has earned their first coins, with a one-line in-app explanation of what they will get. A denial is close to permanent.

```js
const status = await messaging().requestPermission();
const granted =
  status === messaging.AuthorizationStatus.AUTHORIZED ||
  status === messaging.AuthorizationStatus.PROVISIONAL;
```

### Step 3 — Get the token and send it to the backend

```js
const push_token = await messaging().getToken();

await api.post('/api/users/me/device', {
  device_id,          // the app's persistent per-install id
  platform_type: 'android',  // or 'ios' / 'web'
  push_token,
  device_info: { app_version, os_version, model, brand, locale, timezone },
});
```

That is `POST /api/users/me/device` — see [`apis/user/028users.register-device.md`](apis/user/028users.register-device.md). It already existed for fraud signals; `push_token` is just another field on it. **There is no separate push-registration endpoint, and none is needed.**

Call it:

- right after permission is granted,
- on every app launch where the user is signed in (it is an upsert on `cz_user_id` + `device_id`, so this is cheap and idempotent),
- and from `onTokenRefresh`, below.

`POST /api/auth/register` accepts the same shape under an optional `device` field, so the very first call can happen at sign-up.

### Step 4 — Handle token refresh

FCM rotates tokens on reinstall, restore-from-backup and occasionally on its own. A stale token means the user silently stops receiving pushes.

```js
messaging().onTokenRefresh(async (push_token) => {
  await api.post('/api/users/me/device', { device_id, push_token });
});
```

### Step 5 — Handle the message in all three states

| App state | What happens | What the app must do |
|---|---|---|
| Foreground | The OS does **not** draw a banner | Show your own in-app toast or banner from `onMessage` |
| Background | The OS draws the banner | Nothing, until the user taps |
| Killed | The OS draws the banner | Read the launch notification on startup |

```js
// Foreground
messaging().onMessage((msg) => {
  reportPushEvent(msg.data, 'delivered');
  showInAppBanner(msg.notification, msg.data);
});

// Arrived while backgrounded — register a background handler too
messaging().setBackgroundMessageHandler(async (msg) => {
  await reportPushEvent(msg.data, 'delivered');
});

// Tapped while backgrounded
messaging().onNotificationOpenedApp((msg) => {
  reportPushEvent(msg.data, 'opened');
  route(msg.data?.deep_link);
});

// Tapped from a killed app
const initial = await messaging().getInitialNotification();
if (initial) {
  reportPushEvent(initial.data, 'opened');
  route(initial.data?.deep_link);
}
```

### Step 6 — Report delivered, opened and clicked

**This is what turns a send into an open rate.** Without it the admin panel only knows FCM accepted the message, never that anyone saw it — every campaign shows 0% open.

```js
async function reportPushEvent(data, event, button_id) {
  if (!data?.campaign_id) return; // a test send carries no campaign_id
  try {
    await api.post('/api/notifications/push-events', {
      cz_push_campaign_id: data.campaign_id,
      event,                       // 'delivered' | 'opened' | 'clicked'
      ...(button_id ? { button_id } : {}),
    });
  } catch {
    // Fire and forget. Never block the UI, never retry aggressively.
  }
}
```

See [`apis/user/031notifications.push-event.md`](apis/user/031notifications.push-event.md).

- `campaign_id` arrives in the FCM **`data`** payload, not `notification`. A push without it was not a campaign — a test send — and must not be reported.
- The endpoint is **safe to retry**: one row is kept per user, campaign and event, so a repeat returns `counted: false` instead of an error. You cannot double-count.
- `opened` and `clicked` are independent. Send both if both happened.

### Step 7 — Render the action buttons

A campaign can carry up to 3 buttons. They reach the device in the `data` payload as a **JSON string** under the key `buttons`:

```json
{ "buttons": "[{\"id\":\"open_offers\",\"label\":\"Browse offers\",\"deep_link\":\"coinzu://offers\"}]" }
```

FCM does not draw these — the app does, by registering notification actions (Android: notification actions on the channel; iOS: `UNNotificationCategory` actions). When one is tapped, route to its `deep_link` and report `clicked` with that button's `id`.

If you do not implement buttons yet, nothing breaks: the notification still shows, and tapping the body still routes on `deep_link`.

### Step 8 — Create the Android notification channels

Android 8+ requires a channel, and the admin can name one per campaign in `android_channel_id`. Create the channels the team plans to use at app start; a campaign naming a channel that does not exist falls back to the default one, which usually means no sound and low importance.

A sensible starting set, matching the campaign categories:

| Channel id | Name shown in Android settings | Importance |
|---|---|---|
| `transactions` | Payouts and account activity | High |
| `rewards` | Streaks and earnings | Default |
| `promotions` | Offers and bonuses | Default |
| `system` | Security and service notices | High |

Channels are the user's own mute control on Android and cannot be changed after creation — pick the ids and importances deliberately.

### Step 9 — Build the notification preferences screen

Users can mute categories server-side, which is what keeps marketing pushes compliant. One toggle per row, PATCHing only the row that moved:

```js
await api.patch('/api/users/me/notification-preferences', { promotion: false });
```

See [`apis/user/032users.notification-preferences.md`](apis/user/032users.notification-preferences.md).

| Toggle | Field | Notes |
|---|---|---|
| All notifications | `notifications_enabled` | Master switch. |
| Announcements | `announcement` | Product news. |
| Promotions | `promotion` | Offers and bonuses. |
| Rewards | `reward` | Streaks and earning nudges. |
| Quiet hours | `quiet_hours` | On by default. Off means "interrupt me any time". |

- The endpoint **merges** — sending one key never wipes the others.
- A **missing key means opted in**, so render an unset category as on. A new account has `notification_preferences: {}`.
- Do **not** offer a toggle for `transaction` or `system`; they cannot be muted and the API rejects those fields.
- Read the current values from `GET /api/users/me` (`notifications_enabled`, `notification_preferences`).

### Step 10 — Send the device timezone

Quiet hours are evaluated per device against `device_info.timezone` from `POST /api/users/me/device`. A device that never sends one is treated as **UTC**, which means an Indian user could get a marketing push at 3:30am local. Always include it:

```js
device_info: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, /* … */ }
```

### Step 11 — Show the in-app inbox

Every campaign push is **also** written to the notification feed, so a dismissed banner is never a lost message. The bell screen reads `GET /api/notifications` and marks entries read with `PATCH /api/notifications/:cz_notification_id/read`. Pushed rows arrive with `type: "push"` and the emoji already joined onto the title.

A **test send** deliberately writes no in-app row.

### Step 12 — Sign-out

On sign-out, call `messaging().deleteToken()` so the device stops receiving notifications meant for the previous account. The next sign-in gets a fresh token and re-registers through step 3.

---

## 3. Integration checklist

**Getting push to arrive**
- [ ] `google-services.json` in the Android project
- [ ] `GoogleService-Info.plist` in the iOS project
- [ ] APNs auth key uploaded to Firebase (iOS)
- [ ] Push Notifications + Background Modes capabilities enabled (iOS)
- [ ] Permission requested at a sensible moment, not on first launch
- [ ] `push_token` sent to `POST /api/users/me/device`
- [ ] `device_info.timezone` sent with it, or quiet hours cannot work
- [ ] `onTokenRefresh` re-posts the token
- [ ] `deleteToken()` on sign-out

**Handling it well**
- [ ] Foreground, background and killed-state handlers all wired
- [ ] `deep_link` routing, with a safe fallback to home
- [ ] Android notification channels created at app start
- [ ] Action buttons rendered from the `buttons` data key

**Making it measurable and compliant**
- [ ] `delivered`, `opened` and `clicked` reported to `POST /api/notifications/push-events`
- [ ] Notification preferences screen wired to `PATCH /api/users/me/notification-preferences`
- [ ] Unset categories rendered as **on**
- [ ] No toggle offered for `transaction` or `system`
- [ ] In-app inbox reads `GET /api/notifications`

---

## 4. How the backend side behaves

Worth knowing when a campaign result looks odd.

- **Only reachable devices are counted.** A device is in the audience only if it has a non-empty `push_token` and its account `status` is `active`. Registered-user counts and reach are different numbers, deliberately.
- **Consent is enforced server-side.** A user who muted the campaign's category is dropped no matter what the admin selected. The admin sees the count as `skipped_muted`, never the identities. `transaction` and `system` cannot be muted.
- **Quiet hours are per device, per timezone.** Marketing is held back for anyone whose local time falls in the platform window (`push_quiet_hours_start` / `push_quiet_hours_end`, default 22:00–08:00, tunable under Configuration Settings → Notifications). A device with no reported timezone is treated as UTC. Those users land in `skipped_quiet_hours`; they are **skipped, not deferred** — schedule the campaign for a better hour instead.
- **Filters are `AND`, values inside a filter are `OR`.** `countries: ["IN","US"], platforms: ["android"]` means Android devices in India or the US.
- **Country falls back to the device.** Matching is `COALESCE(profile country, device geo)`, so a user who never picked a country is still reachable.
- **`min_coins` is lifetime earnings**, summed from `earn` coin transactions — not the current balance, so spending coins never drops a user out of a segment.
- **Scheduling is polled every minute.** A campaign with a future `scheduled_at` sits at `scheduled` until a dispatcher picks it up, then sends within a minute of the stated time. Its audience is resolved *then*, not when it was composed.
- **Sending is synchronous and batched** at 500 tokens per FCM call. The response comes back once every batch has answered, so the counters are final.
- **Dead tokens are pruned.** A token FCM reports as unregistered is cleared from `user_devices` in the same call and counted in `pruned_tokens`. This is why `targeted_devices` can shrink between runs. A **test send never prunes**, so it cannot quietly change the real audience.
- **Resending re-resolves the audience** from the stored filters rather than replaying the old token list, so new installs are included and uninstalls are skipped.
- **A transport failure is recorded, not thrown.** The campaign goes to `status: "failed"` with the error text in `error`; the API still returns 200/201.
- **`sent_count` is not `delivered_count`.** The first is FCM's acceptance, the second is the app's own confirmation and only counts installs that report back. Use `sent_count` as the denominator for an open rate.
- **One user, several devices.** `targeted_devices` exceeding `targeted_users` is normal — a phone and a tablet are two tokens, one in-app row.

## 5. Related docs

| Doc | What it covers |
|---|---|
| [`apis/user/028users.register-device.md`](apis/user/028users.register-device.md) | Registering a device and its push token |
| [`apis/user/031notifications.push-event.md`](apis/user/031notifications.push-event.md) | Reporting delivered, opened and clicked |
| [`apis/user/032users.notification-preferences.md`](apis/user/032users.notification-preferences.md) | Per-category opt-outs and quiet hours |
| [`apis/admin/039push.list.md`](apis/admin/039push.list.md) | Campaign list, filters, lifetime totals |
| [`apis/admin/040push.preview.md`](apis/admin/040push.preview.md) | Audience reach and drop-off, without sending |
| [`apis/admin/041push.create.md`](apis/admin/041push.create.md) | Create, schedule or draft |
| [`apis/admin/042push.send.md`](apis/admin/042push.send.md) | Run a draft, or resend |
| [`apis/admin/043push.cancel.md`](apis/admin/043push.cancel.md) | Stop a scheduled campaign |
| [`apis/admin/044push.duplicate.md`](apis/admin/044push.duplicate.md) | Copy a campaign into a draft |
| [`apis/admin/045push.test.md`](apis/admin/045push.test.md) | Test send to a few accounts |
| [`apis/admin/046push.detail.md`](apis/admin/046push.detail.md) | One campaign's results |
| [`apis/admin/047push-templates.list.md`](apis/admin/047push-templates.list.md) | Saved message templates |
| [`ENUMS.md`](ENUMS.md#push-campaigns) | Every fixed value a campaign can carry |
