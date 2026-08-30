# My Profile screen — API map

Maps the "My Profile" screen (avatar, coins/gems/tier, personal info, interests, profile
completion) to the exact backend calls. Companion to `docs/flows/auth-onboarding.md`.

## Load the screen

Two calls, fired together, cover every value on this screen:

| Screen element | Source | Doc |
|---|---|---|
| Avatar, Name, Email, Tier badge, Full Name, Gender, Interests chips, Profile Completion % | `GET /api/users/me` | `docs/../apis/user/005users.me.md` |
| Coins, Gems | `GET /api/wallet` | `docs/../apis/user/011wallet.balance.md` |

| Screen field | API field |
|---|---|
| Avatar | `avatar_url` |
| Name (under avatar) | `name` |
| Badge next to name | `tier` (render the matching badge icon for `silver`/`gold`/`platinum`/`diamond`) |
| Email (under avatar, underlined) | `email` |
| "Coins" stat | `GET /api/wallet` → `coin_balance` |
| "Gems" stat | `GET /api/wallet` → `gem_balance` |
| "Tier" stat | `tier` (same value as the badge) |
| Personal Information → Full Name | `name` |
| Personal Information → Email Address | `email` — **display only**, see note #2 |
| Personal Information → Phone Number | `phone` |
| Personal Information → Gender | `gender` |
| Interests chips | `interests` |
| Profile Completion bar + % | `profile_completion_pct` |

## Edit Profile screen — saving edits

"Save Changes" is one call:

| Call | Doc |
|---|---|
| `PATCH /api/users/me` | `docs/../apis/user/006users.update-me.md` |

Send only the fields the user actually changed (`name`, `gender`, `interests`, `avatar_url`,
`age_range`, `country`, `phone` — whichever the screen let them touch); it's a partial
update.

- **Email Address is not sent** — it's rendered read-only on this screen (see note #2) and
  is not part of this endpoint's body at all.
- **Phone Number** is sent as a single E.164 string. Combine the "+91" country-code picker
  and the digits field into one value client-side before sending, e.g. `+919875643266`.
  There is **no OTP verification step for phone** — it is a deliberate product decision,
  not a gap. Drop the "Send OTP" / "Resend OTP" / "Verify" buttons the mockup shows next
  to this field; the number is taken and stored as-is the moment "Save Changes" succeeds.
  `phone_verified_at` stays `null` forever since nothing sets it.
- A `409 CZDUSER007` (`PhoneAlreadyLinkedIcon`) means that phone number is already saved
  on a different account — show that inline on the Phone Number field, the same way a
  duplicate-email error would be shown on Sign up.

Avatar editing is two calls, not one:
1. `POST /api/storage/avatar` (`docs/../apis/user/020storage.avatar.md`) — upload the picked image,
   get back a `url`.
2. `PATCH /api/users/me` with `{ "avatar_url": url }` — persist it, either alone right after
   upload or bundled into the same "Save Changes" call as the other edited fields.

Interests can be edited either through this same `PATCH /api/users/me` call (send the full
new `interests` array) or through `POST /api/users/me/onboarding/interests`
(`docs/../apis/user/009users.onboarding-interests.md`) if you want to reuse that screen's
component — both end up setting the same column. Prefer `PATCH /api/users/me` from this
screen since it's a plain edit, not the onboarding step.

## Notes / former gaps

1. **Resolved — Phone Number is now supported.** `PATCH /api/users/me` accepts an
   optional `phone` field (E.164, unique per account, `409 CZDUSER007` on conflict) and
   `GET /api/users/me`/`PATCH /api/users/me` now return the real value instead of a
   hardcoded `null`. It is stored **unverified, by design** — see the Edit Profile
   section above. `phone_verified_at` still always reads `null`; nothing in the backend
   sends or checks an OTP for it.
2. **Email Address is intentionally not editable**, confirmed by product. It sits inside
   the same "Personal Information" card as the editable fields and has the same row
   style — style it differently from Full Name/Gender/Phone Number (e.g. dimmed, no
   underline, no cursor) so it doesn't look tappable, since tapping it can't do anything:
   there is no change-email endpoint anywhere in the API (`../apis/user/006users.update-me.md`'s notes)
   — only `PATCH /api/users/me` for the fields it lists.
3. The mockup's header email (`leadtymtech@gmail.com`) and the Personal Information row's
   email (`Leader.mtech@gmail.com`) are two different strings — almost certainly a design
   placeholder mismatch, not a backend concern, but worth a fresh design pass since both
   should always render the same `email` value.
4. `age_range` and `country` (collected at onboarding, editable via `PATCH /api/users/me`)
   have no row on this screen at all — fine if that's deliberate, but they're the two
   onboarding-1 fields with no way to review/edit them post-onboarding otherwise.
