# SocialLink (`bolt_hookup`) — Agent Notes

Nigeria-only social discovery & specialized consultation marketplace. Built on Next.js 16 (App Router), Firebase (Client + Admin SDK), Paystack, and Tailwind 4. All transactions in Nigerian Naira (NGN).

Working dir is `bolt_hookup` but the brand is **SocialLink**. Do not use "hookup", "escort", "client/john", "fetish", "price for sex", or "prostitution" anywhere — see Lexicon below.

---

## Strict Lexicon (Paystack compliance — non-negotiable)

| Avoid | Required | Variable |
|---|---|---|
| Escort / Hookup / Companion | Consultant | `consultant` |
| Client / John / Guest | Member | `member` |
| Fetish / Kink | Special Interest / Theme | `themes` |
| Price for sex / Meet | Hourly Retainer / Session Fee | `retainer` / `sessionFee` |
| Prostitution / Sex work | Social Discovery / Consultation | `socialService` |
| Pimping / Brothel | Agency / Social Club | `agency` / `club` |

UI copy, database fields, variable names, and API params must use the required terms.

---

## Repo Layout

```
src/app/                Next.js App Router
  (auth)/               login, onboarding         (public)
  (dashboard)/          dashboard, explore, bookings, messages, profile, wallet  (gated)
  admin/                disputes, users           (ADMIN role)
  api/auth/             verify-session            (internal, used by middleware)
  api/webhooks/paystack/                          (Paystack HMAC verify)
src/actions/            Server Actions ("use server"); wallet mutations use adminDb.runTransaction
src/components/ui/      shadcn (base-nova style) — add via `npx shadcn add`, do not hand-edit
src/hooks/              Real-time listeners (useBookingListener pattern with onSnapshot)
src/lib/                firebase.ts (client) + firebase-admin.ts (admin) with scoped helpers
src/middleware.ts       Gates protected paths via __session cookie
src/store/              Zustand stores (auth-store.ts only today)
src/types/index.ts      Single source of truth for Firestore document types
functions/              Separate Firebase Cloud Functions TS project (excluded from root tsconfig)
firebase.json           Deploy rules + emulators config
firestore.rules / storage.rules / firestore.indexes.json
cors.json               Firebase Storage CORS
```

---

## Firestore Namespace (critical quirk)

**Every collection is scoped under `stores/{firestoreNamespace}/{collection}` — never at the root.**

`firestoreNamespace` comes from `NEXT_PUBLIC_FIREBASE_NAMESPACE` (default `"sociallink"`; functions also read `FIREBASE_NAMESPACE`).

- Client: `getScopedCollectionRef(db, "users")` → `stores/sociallink/users`
- Admin: `adminCollection("users")` → same path

Do **not** use raw `collection(db, "users")` — it will silently miss data. Helpers: `src/lib/firebase.ts` (`getScopedCollectionRef`, `getScopedDocRef`) and `src/lib/firebase-admin.ts` (`adminCollection`, `adminDoc`).

---

## Commands

```bash
# Root (Next.js)
npm run dev              # next dev
npm run build            # next build
npm run start            # next start
npm run lint             # eslint (flat config: eslint.config.mjs)
npx tsc --noEmit         # typecheck — there is NO `typecheck` script in package.json

# Cloud Functions (separate npm project)
cd functions
npm run build            # tsc -> lib/
npm run serve            # build + firebase emulators:start --only functions
npm run deploy           # firebase deploy --only functions

# Firebase rules / indexes
firebase deploy --only firestore
firebase deploy --only storage
firebase deploy --only firestore:indexes
firebase emulators:start # full emulator suite (auth:9099, firestore:8080, functions:5001, storage:9199, ui:4000)
```

**Lockfiles**: both `bun.lock` and `package-lock.json` are present. Pick one and delete the other — default is npm. **No tests are configured** (no Jest/Vitest, no `test` script, no test files). Don't add tests without asking.

---

## Auth & Routing Flow

1. **OTP request** — `POST` to server action `sendPhoneOtp` (src/actions/auth.actions.ts). Phone is normalized to E.164 (`src/lib/phone.ts`). Code is HMAC-SHA256 hashed with `OTP_SIGNING_SECRET` and stored in `auth_otps/{phoneHash}` with 60 s resend cooldown and 5-attempt lockout.
2. **SMS delivery** — BulkSMSNigeria (`BULKSMSNIGERIA_API_TOKEN`). Sender ID defaults to "SocialLink".
3. **OTP verify** — `verifyPhoneOtp` validates hash with `crypto.timingSafeEqual`, deletes the challenge, creates/updates a Firebase Auth user with the phone number, returns a custom token.
4. **Sign-in** — Client exchanges the custom token via `signInWithCustomToken`, then calls `createSessionCookie(idToken)` server action which sets the `__session` HTTP-only cookie (14 days).
5. **Middleware** — `src/middleware.ts` gates `/dashboard`, `/explore`, `/bookings`, `/wallet`, `/profile`, `/messages`. Without `__session`, redirect to `/login?redirect=...`. With cookie, POSTs to `/api/auth/verify-session` to validate server-side.
6. **Real-time user doc** — `src/hooks/use-auth.ts` subscribes to `users/{uid}` via `onSnapshot`; `wallet` updates live.

OTP collection `auth_otps` and `auth_phone_index` are server-only — no client SDK access (firestore.rules: `allow read, write: if false`).

---

## Server Action Conventions

- Every file in `src/actions/` starts with `"use server"`.
- All wallet mutations **must** use `adminDb.runTransaction`. Insufficient-balance checks happen inside the transaction.
- Authentication: `adminAuth.verifyIdToken(idToken)` at the top of every action that needs the caller.
- Notifications: write to `users/{uid}/notifications` sub-collection AND send FCM push via `adminMessaging.sendEachForMulticast`. FCM failure is best-effort and never breaks the main flow.
- Discord webhook (`DISCORD_WEBHOOK_URL`) fires on dispute creation — also best-effort.
- Constants: `PLATFORM_COMMISSION = 0.15`, auto-cancel `30 min`, auto-release `24 h` — keep these in sync between `src/actions/booking.actions.ts` and `functions/src/index.ts`.

---

## Firestore Schema (current)

All paths under `stores/sociallink/`:

```
users/{uid}
  uid, phoneNumber, role (MEMBER|CONSULTANT|ADMIN), banned?
  wallet: { availableBalance, escrowBalance }
  fcmTokens: string[]
  notifications/{notifId}   (sub-collection; owner-readable, create via Server Action only)

profiles/{uid}              (consultant/member public profile)
  displayName, bio, services[], themes[], location (GeoPoint), locationLabel, isOnline,
  averageRating, totalReviews, avatarUrl, blurAvatar, galleryUrls

bookings/{bookingId}
  memberId, consultantId, selectedServices[], amountLocked, status
  status: REQUESTED|ACCEPTED|ACTIVE|COMPLETED|SETTLED|CANCELLED|DISPUTED|REFUNDED
  receipt: { totalAmount, platformFee, consultantPayout }
  chatId?, acceptedAt?, completedAt?, settledAt?, cancelledReason?, settledReason?

chats/{chatId}
  bookingId, memberId, consultantId, isActive
  messages/{messageId}      (sub-collection; participants-only when isActive=true)

wallet_transactions/{txId}
  userId, type (DEPOSIT|ESCROW_LOCK|ESCROW_RELEASE|PAYOUT|REFUND|COMMISSION), amount, reference?, bookingId?, description

reports/{reportId}
  reporterId, reportedId, bookingId, reason (NO_SHOW|SAFETY_CONCERN|FRAUD|OTHER), detailedDescription, evidenceUrls[], status (OPEN|RESOLVED|DISMISSED), adminNotes?, resolvedBy?

payouts/{payoutId}
  consultantId, amount, bankCode, accountNumber, accountName, paystackTransferCode?, status (PENDING|PROCESSING|SUCCESS|FAILED)

platform/wallet             (single doc; totalCommissionEarned)

pending_transactions/{ref}  (Paystack funding in-flight; admin-only access)
reviews/{reviewId}          (auth-readable; reviews aggregate via Cloud Function)

auth_otps/{phoneHash}       (server-only)
auth_phone_index/{phoneHash} (server-only)
```

Cloud Function `aggregateRatingsOnReviewCreate` recomputes `averageRating` and `totalReviews` on the reviewed user's profile.

---

## Security & Atomicity Rules

1. **No client-side wallet math — ever.** All debits/credits/escrow-locks/releases go through Server Actions using `firebase-admin`.
2. **Atomic transactions**: every state change touching two or more docs uses `adminDb.runTransaction` (or `db.batch()` for cancellations). Read-and-check inside the transaction to prevent TOCTOU races.
3. **Webhook signature verification**: `src/actions/wallet.actions.ts:verifyPaystackSignature` computes HMAC-SHA512 of the raw body with `PAYSTACK_SECRET_KEY` and compares to the `x-paystack-signature` header. Reject on mismatch before any DB write.
4. **Booking visibility**: only `memberId`, `consultantId`, or ADMIN can read a booking (firestore.rules).
5. **Chat**: participants-only, only when `isActive == true`. Chat closes automatically when booking moves to COMPLETED/SETTLED/CANCELLED/DISPUTED.
6. **Webhook routes** (`src/app/api/webhooks/`) must `await request.text()` for the raw body — Next.js auto-parses JSON otherwise and the HMAC will mismatch.

---

## Operational Gotchas

- `src/middleware.ts` calls `/api/auth/verify-session` via internal `fetch` — do not remove or rename that route.
- `next.config.ts` sets `Service-Worker-Allowed: /` on `sw.js` and `firebase-messaging-sw.js` — PWA + FCM push require this.
- `FIREBASE_PRIVATE_KEY` env value keeps `\\n` escapes; `src/lib/firebase-admin.ts` already does `.replace(/\\n/g, "\n")`.
- Root layout registers a service worker and PWA install prompt — keep them.
- `src/app/(dashboard)/layout.tsx` wraps everything in `DashboardShell`. The `(dashboard)` route group has its own layout distinct from root.
- `src/lib/firebase.ts` line 60 throws at module import if `NEXT_PUBLIC_FIREBASE_*` env is missing. Missing config will break the entire app, not just the Firebase code.
- VAPID key (`NEXT_PUBLIC_FIREBASE_VAPID_KEY`) is required for FCM web push — without it, `usePushNotifications` silently no-ops.
- Paystack webhook URL must be configured in Paystack dashboard to point at `/api/webhooks/paystack` with `charge.success`, `transfer.success`, `transfer.failed`, `transfer.reversed` events.

---

## TODO — Security Cleanup Required

These are pre-existing issues, not your problem to silently fix. Flag them to the user before doing anything destructive.

- [ ] **`factors-98397-firebase-adminsdk-fbsvc-0b060b8898.json`** at repo root contains a live Firebase Admin private key. Add to `.gitignore`, rotate the key in Firebase Console, and purge from git history (`git filter-repo --path factors-98397-firebase-adminsdk-fbsvc-0b060b8898.json --invert-paths`).
- [ ] **`.env.local`** is tracked by git and contains the same Admin private key, Paystack test keys, BulkSMSNigeria token, OTP signing secret, and Google Maps key. Add a hard guard in `.gitignore` (already there but the file is already tracked), rotate every secret, and purge from history.
- [ ] **`firestore.rules` lines 42 and 54** have TEMP debug rules `allow read, write: if isAuthenticated();` on `users/{uid}` and `profiles/{uid}`. Tighten before production: users should read/write only their own doc; profiles should be world-readable but only owner-writable (and admin-writable for moderation).
- [ ] **Two lockfiles** (`bun.lock` + `package-lock.json`). Pick one package manager and delete the other.
- [ ] `cors.json` has `origin: ["*"]` — restrict to your domain in production.
