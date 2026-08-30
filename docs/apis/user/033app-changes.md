# App changes — what the mobile app must configure

A running, numbered sequence of backend changes that need work **inside the app**. Newest entries are appended at the bottom, so the app developer can work down the list and tick items off.

Each entry says what changed, what the app has to do, and which docs to read. An entry is only added when the backend side is already live — nothing here is speculative.

| # | Change | Area | Blocking? |
|---|---|---|---|
| [APP-001](#app-001--register-the-device-on-every-signed-in-launch) | Register the device on every signed-in launch | Fraud + push | Yes |
| [APP-002](#app-002--send-the-device-timezone) | Send the device timezone | Push targeting | Yes |
| [APP-003](#app-003--firebase-sdk-and-push-permission) | Firebase SDK and push permission | Push | Yes |
| [APP-004](#app-004--handle-the-message-in-all-three-app-states) | Handle the message in all three app states | Push | Yes |
| [APP-005](#app-005--report-delivered-opened-and-clicked) | Report delivered, opened and clicked | Push analytics | Yes |
| [APP-006](#app-006--route-on-deep_link) | Route on `deep_link` | Push | Yes |
| [APP-007](#app-007--create-the-android-notification-channels) | Create the Android notification channels | Push | Recommended |
| [APP-008](#app-008--render-the-action-buttons) | Render the action buttons | Push | Optional |
| [APP-009](#app-009--notification-preferences-screen) | Notification preferences screen | Push consent | Yes |
| [APP-010](#app-010--kyc-outcome-can-now-change-after-submission) | KYC outcome can now change after submission | KYC | Yes |
| [APP-011](#app-011--daily-check-in-is-now-the-streak-board) | Daily check-in is now the streak board | Rewards | Yes |

---

## APP-001 — Register the device on every signed-in launch

**Why:** the backend can only push to a device it holds a token for, and the same row carries the fraud signals (IP, ASN, ISP, VPN flag, fingerprint).

**What to do:** call `POST /api/users/me/device` with a persistent per-install `device_id`:

```js
await api.post('/api/users/me/device', {
  device_id,                  // IDFV on iOS, an app-generated UUID on Android/web
  platform_type: 'android',   // or 'ios' / 'web'
  push_token,                 // once you have it — see APP-003
  device_info: { app_version, os_version, model, brand, locale, timezone },
});
```

Call it right after permission is granted, on every signed-in launch, and from `onTokenRefresh`. It is an upsert on `cz_user_id` + `device_id`, so repeating it is cheap and safe. `POST /api/auth/register` accepts the same shape under an optional `device` field for the very first call.

**Docs:** [`apis/user/028users.register-device.md`](028users.register-device.md)

---

## APP-002 — Send the device timezone

**Why:** quiet hours are evaluated per device against `device_info.timezone`. A device that never sends one is treated as **UTC**, which means an Indian user can receive a marketing push at 3:30am local.

**What to do:** always include the IANA timezone in `device_info`:

```js
device_info: {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // "Asia/Kolkata"
  // …the rest
}
```

Re-send it when the device timezone changes — travel and DST both move it.

**Docs:** [`apis/user/028users.register-device.md`](028users.register-device.md), [`PUSH_NOTIFICATIONS.md`](../../PUSH_NOTIFICATIONS.md)

---

## APP-003 — Firebase SDK and push permission

**Why:** FCM is the only route to an Android or iOS device. The Firebase project is live (`coinzu-307d6`) and the backend credentials are configured and verified.

**What to do:**

1. Drop `google-services.json` into the Android project and `GoogleService-Info.plist` into the iOS project. Both come from the Firebase console.
2. Install the messaging SDK — `@react-native-firebase/messaging`, `firebase_messaging`, or the native equivalent.
3. iOS: enable the **Push Notifications** capability and **Background Modes → Remote notifications** in Xcode. The APNs auth key must be uploaded to Firebase or iOS pushes silently never arrive.
4. Ask for permission **after** the user has earned their first coins, with a one-line explanation. Not on first launch — the OS only asks once and a denial is close to permanent.
5. `getToken()`, then send it via APP-001.

**Docs:** [`PUSH_NOTIFICATIONS.md`](../../PUSH_NOTIFICATIONS.md) sections 1–3

---

## APP-004 — Handle the message in all three app states

**Why:** the OS draws a banner only when the app is backgrounded or killed. In the foreground nothing appears unless the app draws it.

**What to do:**

| App state | OS behaviour | App must |
|---|---|---|
| Foreground | No banner | Draw your own from `onMessage` |
| Background | Banner shown | Handle the tap |
| Killed | Banner shown | Read the launch notification at startup |

Register `onMessage`, `setBackgroundMessageHandler`, `onNotificationOpenedApp` and `getInitialNotification`. Missing the last one means a tap from a killed app opens the home screen instead of the intended destination.

**Docs:** [`PUSH_NOTIFICATIONS.md`](../../PUSH_NOTIFICATIONS.md) step 5

---

## APP-005 — Report delivered, opened and clicked

**Why:** without this the admin panel only knows FCM *accepted* the message, never that anyone saw it. **Every campaign shows a 0% open rate until the app implements this.**

**What to do:** call `POST /api/notifications/push-events` from the handlers in APP-004.

```js
async function reportPushEvent(data, event, button_id) {
  if (!data?.campaign_id) return;  // a test send carries no campaign_id
  try {
    await api.post('/api/notifications/push-events', {
      cz_push_campaign_id: data.campaign_id,
      event,                        // 'delivered' | 'opened' | 'clicked'
      ...(button_id ? { button_id } : {}),
    });
  } catch { /* fire and forget — never block the UI */ }
}
```

- `campaign_id` is in the FCM **`data`** payload, not `notification`.
- **Safe to retry.** One row is kept per user, campaign and event, so a repeat returns `counted: false` rather than an error. You cannot double-count.
- Send `delivered` from every state, `opened` on a notification tap, `clicked` on an action-button tap. `opened` and `clicked` are independent — send both if both happened.

**Docs:** [`apis/user/031notifications.push-event.md`](031notifications.push-event.md)

---

## APP-006 — Route on `deep_link`

**Why:** the admin types a destination free-form per campaign, and a tap that lands nowhere wastes the send.

**What to do:** read `data.deep_link` and route, falling back to the home screen for anything unrecognised. The agreed scheme:

| `deep_link` | Screen |
|---|---|
| `coinzu://offers` | Offerwall |
| `coinzu://wallet` | Wallet |
| `coinzu://withdrawals` | Withdrawal history |
| `coinzu://referrals` | Refer & Earn |
| `coinzu://kyc` | Identity verification |
| `coinzu://faq` | FAQ |

Add to this table rather than inventing values ad hoc — the admin composer offers these as suggestions.

**Docs:** [`PUSH_NOTIFICATIONS.md`](../../PUSH_NOTIFICATIONS.md) step 6

---

## APP-007 — Create the Android notification channels

**Why:** Android 8+ requires a channel, and the admin can name one per campaign in `android_channel_id`. A campaign naming a channel that does not exist falls back to the default one, which usually means no sound and low importance.

**What to do:** create these at app start. Channel ids and importance **cannot be changed after creation**, so get them right first time.

| Channel id | Name shown in Android settings | Importance |
|---|---|---|
| `transactions` | Payouts and account activity | High |
| `rewards` | Streaks and earnings | Default |
| `promotions` | Offers and bonuses | Default |
| `system` | Security and service notices | High |

These mirror the campaign categories. Channels are also the user's own mute control on Android, which is separate from the server-side preference in APP-009.

**Docs:** [`PUSH_NOTIFICATIONS.md`](../../PUSH_NOTIFICATIONS.md) step 8

---

## APP-008 — Render the action buttons

**Why:** a campaign can carry up to 3 tappable actions. FCM does not draw them — the app does.

**What to do:** read the `buttons` key from the `data` payload. It is a **JSON string**:

```json
{ "buttons": "[{\"id\":\"open_offers\",\"label\":\"Browse offers\",\"deep_link\":\"coinzu://offers\"}]" }
```

Register notification actions (Android: actions on the channel; iOS: `UNNotificationCategory`). On tap, route to that button's `deep_link` and report `clicked` with its `id`.

**Nothing breaks if you skip this** — the notification still shows and tapping the body still routes on `deep_link`. Optional until the team starts using buttons.

**Docs:** [`PUSH_NOTIFICATIONS.md`](../../PUSH_NOTIFICATIONS.md) step 7

---

## APP-009 — Notification preferences screen

**Why:** users must be able to mute marketing. The opt-out is enforced server-side when an audience is resolved, so a muted user is dropped no matter what the admin selected.

**What to do:** a settings screen with one toggle per row, PATCHing only the row that moved:

```js
await api.patch('/api/users/me/notification-preferences', { promotion: false });
```

| Toggle | Field |
|---|---|
| All notifications | `notifications_enabled` |
| Announcements | `announcement` |
| Promotions | `promotion` |
| Rewards | `reward` |
| Quiet hours | `quiet_hours` |

Three rules that are easy to get wrong:

- The endpoint **merges** — sending one key never wipes the others.
- A **missing key means opted in**. A new account has `notification_preferences: {}`, so render an unset category as **on**.
- Do **not** offer a toggle for `transaction` or `system`. They cannot be muted and the API rejects those field names with a 400.

Read the current values from `GET /api/users/me` (`notifications_enabled`, `notification_preferences`).

**Docs:** [`apis/user/032users.notification-preferences.md`](032users.notification-preferences.md)

---

## APP-010 — KYC outcome can now change after submission

**Why:** an attempt the face check could not settle now waits at `manual_review` for a super admin, and an automatic rejection can be **overridden** to verified. Both change `kyc_status` after the user has already seen a result.

**What to do:**

- Do not cache `kyc_status` from the submission response as final. Re-read `GET /api/users/me` when the app foregrounds and on the KYC and Wallet screens.
- Handle `manual_review` as its own state — "We are checking this, we will let you know" — not as a rejection and not as a retry prompt.
- The user gets an in-app notification when a decision lands (`Identity verified` / `Verification unsuccessful`), so the inbox in APP-004 covers the notification side.
- Attempts and admin reviewer identities are **never** exposed to the app. `POST /api/kyc/verify` returns the decision for that one submission and nothing more.

| `kyc_status` | What the app should show |
|---|---|
| `none` | Not started — offer the flow |
| `pending` | Submitted, waiting on the check |
| `manual_review` | Being reviewed by a person; no action available |
| `verified` | Done; withdrawals open |
| `rejected` | Show `rejection_reason`, offer a retry |

**Docs:** [`apis/user/016kyc.selfie.md`](016kyc.selfie.md), [`ENUMS.md`](../../ENUMS.md#kyc-decisions)

---

## Appendix — the payload the app receives

Every campaign push carries this in the FCM **`data`** payload:

| Key | Always present | Meaning |
|---|---|---|
| `campaign_id` | yes, on campaigns | Report it back via APP-005. Absent on a test send. |
| `category` | yes | `announcement`, `promotion`, `reward`, `transaction`, `system`. |
| `deep_link` | only when set | Where to route on tap. |
| `buttons` | only when set | JSON string of up to 3 actions. |

The `notification` block carries `title` (with the emoji already joined on), `body` and optionally `imageUrl`.

---

## APP-011 — Daily check-in is now the streak board

**Why:** `GET /api/daily/checkin` and `POST /api/daily/checkin` have been **removed**. They were a second daily reward path over the same action as the 30-day streak, so a user could collect twice. The streak board absorbed them.

**What to do:** replace both calls with the streak pair.

| Old | New |
|---|---|
| `GET /api/daily/checkin` | `GET /api/daily/streak` |
| `POST /api/daily/checkin` | `POST /api/daily/streak/claim` |

```js
// On app open — the whole Rewards screen in one call.
const board = await api.get('/api/daily/streak');
// board.can_claim_today, board.claimable_day, board.data[] = 30 tiles

// When the user taps today's tile.
const claim = await api.post('/api/daily/streak/claim');
// claim.reward_coins, claim.reward_gems, claim.cycle_completed
```

Everything the old check-in did still happens on claim: the check-in row is written, `total_checkins` comes back in the response, and challenges, achievements and referral rules all advance.

**Rendering the board:**

- A tile can pay **coins, gems, both, or nothing**. Render a `0` as an empty slot, not "0 coins".
- `is_milestone` is the gold border; `is_claimed` is the green tick; exactly one tile has `is_today` when a claim is available.
- `total_coins` / `total_gems` drive the "Win up to" banner — read them rather than hard-coding 5,000 and 2,000, because an admin can retune any day from the Daily Streak tab at any time.
- `cycle_completed: true` on the claim response is the Streak Champion moment. The board wraps to day 1 the next day.
- A missed day resets the run overnight, so `claimable_day` goes back to `1`. `longest_day` is the all-time record and never resets — that is the number worth showing off.
- Claiming twice in a UTC day returns `400 CZDGAME015`; treat it as "already collected today", not an error.

**Docs:** [`034daily.streak.board.md`](034daily.streak.board.md), [`035daily.streak.claim.md`](035daily.streak.claim.md)

## APP-012 — Daily Challenges is one call, and the per-challenge claim is gone

**Why:** the Daily Challenge screen used to need a call per concern and a claim per tile. It is now a single call that returns the whole screen, and the only thing left to claim is the master chest. `POST /api/daily/challenges/:id/claim` has been **removed** — a tile pays itself the moment it is finished.

**What to do:**

| Old | New |
|---|---|
| `GET /api/daily/challenges` (flat list) | `GET /api/daily/challenges` — same path, much richer body |
| `POST /api/daily/challenges/:id/claim` | nothing; the reward lands on completion |
| — | `POST /api/daily/challenges/chest` for the master chest |

```js
// The whole screen.
const board = await api.get('/api/daily/challenges');
// board.data[] = the 5 tiles, board.master_chest, board.calendar[],
// board.availability, board.max_earning, board.streak_days

// A finished day, read-only.
const past = await api.get('/api/daily/challenges?date=2026-08-29');

// The chest, once every tile is done.
if (board.master_chest.can_claim) await api.post('/api/daily/challenges/chest');
```

**Draw the five tiles statically.** Spin the Lucky Wheel, Take the Quiz, Play Any 2 New Games, Invite a Friend and Complete Any Offer are fixed — the layout never changes shape. This response supplies **state**, not structure: progress, rewards, and what is playable.

**Route on `action`, never on `type` or on the title.** An admin can retitle a tile at any time.

| `action` | Where the tap goes |
|---|---|
| `spin` | The spin wheel |
| `quiz` | The quiz, using `availability.quiz_id` |
| `offers` | The offer wall — **both** "play any 2 new games" and "complete any offer" |
| `referrals` | Refer & Earn |
| `games` | The games list |

**Rendering:**

- `max_earning.coins` / `.gems` are the "win up to" header figure — every tile plus the chest. Read them; an admin retunes rewards from the Daily Challenges tab.
- `progress_label` is pre-formatted (`1/2`). Never build it locally — "play any 2 new games" completes only on the second one.
- `master_chest.percent` drives the ring; gate the Claim button on `can_claim`, not on your own count.
- `availability` decides what is tappable now: `spin_available` and `spins_left`, `quiz_available` and `quiz_id`, and `scratch_cards_left`.
- **A past day is view-only.** `is_read_only: true`, every tile's `is_playable` is `false`, and all of `availability` is zeroed. Show what was finished and hide the play buttons — yesterday's spin cannot be taken today.
- **A future day cannot be opened.** `calendar[].is_locked` marks them; requesting one is a `400 CZDGAME001`.
- The strip runs 7 days back to 3 days ahead. `calendar[].completed` / `.total` fill each day's little ring.

**The games behind the tiles:**

- **Spin** can pay coins, gems, or nothing. The segment is drawn server-side from admin-managed weights, so never predict the result client-side — animate to whatever comes back.
- **Quiz** is one per day, three options, image optional. A correct answer pays and — when the admin has enabled it — grants an extra scratch card: watch `scratch_card_granted` on the answer response and refresh `availability.scratch_cards_left`.
- **Scratch** prizes can be gated behind a medal tier, so two users can draw from different pools. The odds are never sent to the app.

- Everything resets at **00:00 UTC**, not local midnight.

**Docs:** [`037daily.challenges.board.md`](037daily.challenges.board.md), [`038daily.challenges.chest.md`](038daily.challenges.chest.md)

## APP-013 — The spin wheel no longer sends amounts, and the quiz sends more

**Why:** a wheel segment can now be configured to pay a **random amount inside a band** rather than a fixed number, so any figure printed on a wedge in advance would be a guess. The band and the odds are admin-only and are no longer sent to the app at all.

**What changed on `GET /api/games/spin`:** each segment now carries only what the app needs to draw the wheel.

| Was | Now |
|---|---|
| `cz_spin_wheel_config_id`, `label`, `reward_coins`, `reward_gems`, `probability_weight`, `display_order`, `is_active` | `cz_spin_wheel_config_id`, `label`, `display_order` |

```js
// Draw the face from the label alone.
const wheel = await api.get('/api/games/spin');
// wheel.data[] = { cz_spin_wheel_config_id, label, display_order }
// wheel.spins_left gates the button

// The real figure only exists after the spin.
const result = await api.post('/api/games/spin');
// result.cz_spin_wheel_config_id -> which wedge to stop on
// result.reward_coins / result.reward_gems -> what was actually credited
```

- **Print `label`, never a number.** It is free text the admin writes; do not parse it.
- **Animate to whatever `POST` returns.** Never pick a wedge locally, and never re-request hoping for a different result — the draw is server-side and final.
- **Two users on the same wedge can win different amounts.** Show `result.reward_coins`, not anything cached from the face.
- **A spin can pay nothing.** Both rewards `0` is a normal outcome; show the wedge's label rather than "0 coins".
- **One spin a day, for everyone.** This was a configurable setting and is now fixed in code, so stop reading a limit from anywhere and just use `spins_left`.

**What changed on `GET /api/games/quiz`:** three fields were added and `my_attempt` was trimmed.

| Field | Note |
|---|---|
| `image_url` | New. Shown above the question, `null` when the admin set none. Prefer a wide crop. |
| `reward_gems` | New. A quiz can pay gems as well as coins. |
| `grants_scratch_card` | New. Worth teasing before they answer — "answer right and win a scratch card". |
| `my_attempt` | No longer echoes `user_id` and `quiz_id`; it carries `cz_quiz_attempt_id`, `selected_option`, `is_correct`, `reward_coins`, `attempted_at`. |

**On answering**, `POST /api/games/quiz/:id/answer` returns `scratch_card_granted`. When it is `true`, refresh `GET /api/games/scratch` — `cards_left` will have gone up — and consider sending the user straight there.

**Docs:** [`039games.spin.wheel.md`](039games.spin.wheel.md), [`040games.spin.play.md`](040games.spin.play.md), [`041games.quiz.today.md`](041games.quiz.today.md), [`042games.quiz.answer.md`](042games.quiz.answer.md)

## APP-014 — The wheel shows its payouts again, and a won card follows you home

**Why:** two corrections to APP-013 and one new behaviour.

**1. `GET /api/games/spin` sends `reward_coins` and `reward_gems` again.** Payout bands turned out to belong to the scratch card alone — a wheel wedge is visible *before* the spin, so it has to be honest about what it pays. Print the amount on the wedge; the spin result will match it exactly.

| Field | Note |
|---|---|
| `reward_coins`, `reward_gems` | Back, and exact. What the wedge shows is what lands. |
| `probability_weight` | Still **not** sent. The odds stay admin-only. |

**2. Scratch cards are the ones that pay a random amount.** A prize can be configured as a band — 25 to 250 coins, say — and the exact figure is drawn at the moment the card is scratched. Never cache an amount against a `cz_scratch_card_id`; reveal what `POST /api/games/scratch` returns.

**3. A won card keeps the quiz tile alive.** Answering the quiz correctly can grant a scratch card, and until that card is scratched the quiz tile on the daily board points at the card, not the answered question.

```js
const board = await api.get('/api/daily/challenges');
const quiz = board.data.find(t => t.type === 'quiz');
// After a correct answer with a card still unscratched:
//   quiz.action                 === 'scratch'        <- route here, not to the quiz
//   quiz.is_highlighted         === true
//   quiz.highlight_reason       === 'scratch_card_ready'
//   quiz.pending_scratch_cards  === 1
//   quiz.has_pending_action     === true             <- keep the tile tappable
//   quiz.is_completed           === true
//   quiz.is_playable            === false
```

- **Read `action` every render.** It is not static. Hard-coding the quiz tile to the quiz screen sends the user to a question they have already answered instead of the prize they have not opened.
- **`is_playable: false` no longer means "not tappable".** Use `is_playable || has_pending_action` to decide, and `is_highlighted` to draw the eye — a badge, a glow, a "1 card ready" pill from `pending_scratch_cards`.
- Everything reverts once the card is scratched: `action` goes back to `quiz`, the highlight clears.

**New on `availability`:** `scratch_cards_pending` (cards won today, not yet scratched) and `scratch_available` (there is a card to open right now). `scratch_cards_left` now correctly subtracts cards already scratched, so it matches `GET /api/games/scratch` → `cards_left`. Do not add `scratch_cards_pending` to it — pending cards are already counted in.

**Docs:** [`037daily.challenges.board.md`](037daily.challenges.board.md), [`039games.spin.wheel.md`](039games.spin.wheel.md), [`043games.scratch.status.md`](043games.scratch.status.md), [`044games.scratch.play.md`](044games.scratch.play.md)

## APP-015 — The quiz pays nothing, and the scratch card is the whole prize

**Why:** the quiz and the scratch card were paying twice for one action. Now the quiz hands over a card and stops; whatever the user wins is decided when they scratch it. A card cannot be obtained any other way.

**This supersedes the reward fields introduced in APP-013.** Remove every quiz reward from the UI.

**`GET /api/games/quiz` — three fields removed:**

| Removed | Note |
|---|---|
| `reward_coins`, `reward_gems` | The quiz pays no currency. Delete any "win 50 coins" copy. |
| `grants_scratch_card` | Gone as a flag — a right answer **always** wins one card. |
| `my_attempt.reward_coins` | Gone for the same reason. |

**`POST /api/games/quiz/:id/answer` — two fields removed:**

| Removed | Note |
|---|---|
| `reward_coins`, `reward_gems` | Nothing reaches the wallet from this call. Do not refresh the balance after answering. |

`scratch_card_granted` stays and now simply mirrors `is_correct`.

```js
const res = await api.post(`/api/games/quiz/${id}/answer`);
// { cz_quiz_attempt_id, is_correct, correct_option, scratch_card_granted }
if (res.scratch_card_granted) {
  // The prize is the card, not a number. Send them to Scratch & Win.
}
```

**`GET /api/games/scratch` — `daily_limit` removed.** There is no free allowance any more: `cards_left` equals `granted_cards`, and both are `0` until the quiz is answered correctly.

**Two failure modes, and they mean different things:**

| Code | Meaning | What the app should do |
|---|---|---|
| `CZDGAME017` | No card won today | Send the user to the quiz |
| `CZDGAME010` | Card already scratched | Say "come back tomorrow" |

**Build the screens around this:**

- **The quiz screen's prize is a card, not a number.** "Answer right and win a scratch card" — there is nothing to show a coin figure for, before or after.
- **A wrong answer wins nothing**, and still spends the day's one attempt. No consolation payout.
- **An empty scratch screen means "go answer the quiz"**, not "come back tomorrow" — unless `cards_used` is already above zero.
- **Cards expire at 00:00 UTC.** An unscratched card is gone; a "scratch it before midnight" nudge is worth having.
- **The "Take the Quiz" daily challenge tile still pays its own reward**, like the other four tiles. That is the daily board's economy and is separate from the quiz itself — it is set per tile in the admin.

**Docs:** [`041games.quiz.today.md`](041games.quiz.today.md), [`042games.quiz.answer.md`](042games.quiz.answer.md), [`043games.scratch.status.md`](043games.scratch.status.md), [`044games.scratch.play.md`](044games.scratch.play.md)

## APP-016 — Rewards: buy entries, spin, and see who won

**Why:** the new Rewards screen. Four cards, two mechanics, one shared shape.

**The five old `lucky-draw` endpoints are removed.** They allowed one entry per user per draw, which is the opposite of how the new draws work. Replace them:

| Was | Now |
|---|---|
| `GET /api/lucky-draw` | `GET /api/rewards` |
| `GET /api/lucky-draw/:id` | `GET /api/rewards/:slug` |
| `POST /api/lucky-draw/:id/enter` | `POST /api/rewards/:slug/entries` with `{ count }` |
| `GET /api/lucky-draw/:id/winners` | `GET /api/rewards/:slug/winners` |
| `GET /api/lucky-draw/mine` | no direct replacement — `draw.my_entries` on the detail response covers the screens we have |

**Address everything by `slug`**, never by id: `wheel_of_fortune`, `daily_lucky_draw`, `mystery_box`, `weekly_lucky_draw`.

**Two mechanics, and `kind` tells you which:**

```js
const { data: cards } = await api.get('/api/rewards');

for (const card of cards) {
  if (!card.is_playable) continue;            // coming_soon renders greyed
  if (card.kind === 'instant') {
    // One tap, result immediately.
    const res = await api.post(`/api/rewards/${card.slug}/play`);
    // res.cz_reward_prize_id -> which wedge to stop on
    // res.reward_coins / res.reward_gems -> what was credited
  } else {
    // Open the detail screen; the user buys entries and waits.
    const detail = await api.get(`/api/rewards/${card.slug}`);
  }
}
```

**Building the screens:**

- **The countdown comes from `seconds_remaining`, not from `ends_at` against the device clock.** It is computed server-side, so a phone with a wrong clock still counts down correctly. Re-fetch at 0 rather than assuming the draw settled.
- **`headline_prize_coins` is the marketing line; `draw.prize_pool_coins` is the real pot.** The pot scales with turnout and climbs as people join — show it as the live figure, and never present the headline as what will be paid.
- **`prizes[]` on a draw is a display ladder**, not what a winner receives. The money comes from the pot, split first-place-heavy.
- **Buy Entries**: `entry_packs` gives the quick-pick buttons, `entry_cost_gems × count` gives the price, and anything between `min_entries` and `max_entries` is valid — so keep the free-entry keypad. Entries **stack**: `my_entries` is the running total across every purchase.
- **`average_entries` is what "Below Average" compares against.** Do the comparison yourself; the server sends the number, not a verdict.
- **Winners are masked server-side.** `masked_name` is all you get and all you should show — never try to reconstruct the address.
- **`draw` can be `null` on a live draw game** for the seconds between one period settling and the next opening. Render "opening shortly", not an error.
- **The Mystery Box is `coming_soon`.** Render the card greyed; `play` on it returns `400 CZDGAME019`. When it goes live nothing in the app changes.

**Errors worth branching on:** `CZDGAME019` coming soon · `CZDGAME020` paused · `CZDGAME021` instant, not a draw · `CZDGAME022` draw, not instant · `CZDGAME023` entry count out of range (the description gives the range) · `CZDGAME024` not configured yet · `CZDWLT003` not enough gems — this one should open the "Add Gems" sheet.

**The paid wheel is not the free daily spin.** `POST /api/games/spin` is the once-a-day free wheel on the Daily Challenges board. `POST /api/rewards/wheel_of_fortune/play` is paid, unlimited, and has its own segments and odds.

Everything rolls at **00:00 UTC**; the weekly draw settles at 00:00 UTC on Monday.

**Docs:** [`045rewards.list.md`](045rewards.list.md), [`046rewards.detail.md`](046rewards.detail.md), [`047rewards.buy-entries.md`](047rewards.buy-entries.md), [`048rewards.play.md`](048rewards.play.md), [`049rewards.winners.md`](049rewards.winners.md)
