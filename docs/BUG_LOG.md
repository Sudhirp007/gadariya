# Pal Matrimony (`gadariya.org`) — Comprehensive Engineering Bug & Incident Log

> **Purpose:** Permanent engineering register of all historical deployment defects, user-reported production errors, and security/functional bugs uncovered during end-to-end QA and security audits, along with root-cause analyses, code fixes, and regression guardrails.

---

## Summary Matrix

| ID | Category | Reported / Discovered By | Severity | Status |
| :--- | :--- | :--- | :--- | :--- |
| `BUG-H01` | DNS & SSL Deployment | User (Screenshot) | High | **RESOLVED** |
| `BUG-H02` | i18n Dictionary Keys (`/register`) | User (Screenshot) | Medium | **RESOLVED** |
| `BUG-H03` | Firebase Origin Validation (`t is not iterable`) | User (Screenshot) | High | **RESOLVED** |
| `BUG-H04` | DB Schema Mismatch (`verification_requests.metadata`) | User (Screenshot) | Critical | **RESOLVED** |
| `BUG-H05` | Google-Only Registration Blocked by Phone Check | User | Medium | **RESOLVED** |
| `BUG-001` | `(EMAXCONNSESSION) max clients reached in session mode (pool_size: 15)` | User (#1) | Critical | **RESOLVED** |
| `BUG-002` | Upload Photo Button Added Empty Card Without File Picker or Binary Storage | User (#2) | High | **RESOLVED** |
| `BUG-003` | Wrong Profile (`राजेश PAL100001`) Shown on `/profile` | User (#3) | Critical | **RESOLVED** |
| `BUG-004` | Discovery Age Filter (`18–29`) Not Filtering Properly + 67 Test Profiles Leaked | User (#4) | High | **RESOLVED** |
| `BUG-005` | Google Sign-In Pending Activation in Firebase Console | User (#5) | Medium | **MITIGATED (Console Toggle Required)** |
| `BUG-006` | Header Kept Showing `Sign In` / `Register Free` & No `Sign Out` When Logged In | User (#6) | High | **RESOLVED** |
| `BUG-007` | Profile Edits Not Saved Reliably to PostgreSQL | User (#7) | Critical | **RESOLVED** |
| `BUG-008` | No Admin Login Provision in UI, Serverless MFA Loss & Incomplete Moderation Views | User (#8) | High | **RESOLVED** |
| `BUG-009` | Unauthenticated Requests Silently Fell Back to Demo Profile `PAL100001` | Security Audit | Critical | **RESOLVED** |
| `BUG-010` | Missing `Approve` / `Decline` / `Withdraw` Buttons on Contact Exchange Tab | E2E QA Audit | High | **RESOLVED** |
| `BUG-011` | Watermarked Biodata PDF Crashed (`500`) on `₹` Symbol or Devanagari Text | E2E QA Audit | High | **RESOLVED** |
| `BUG-012` | Integration Tests Polluted Live DB (`Candidate A`/`B`) & Mutated `LIMIT 1` Profile | DB Audit | High | **RESOLVED** |
| `BUG-013` | Parallel Test Cleanup Race (`LIKE '%@pal.in'`) Killed Concurrent Test Fixtures | Test Runner Audit | Medium | **RESOLVED** |

---

## Part 1 — Historical Deployment & Onboarding Bugs (`BUG-H01` to `BUG-H05`)

### `BUG-H01` — External Domain DNS & `ERR_SSL_PROTOCOL_ERROR` on `gadariya.org`
- **Symptom:** Hostinger hPanel did not show a "Change Nameservers" button because `gadariya.org` was registered externally and managed via Hostinger DNS zone; `www.gadariya.org` initially threw `ERR_SSL_PROTOCOL_ERROR`.
- **Root Cause:** Apex `@` and `www` records were not yet pointed to Vercel's Anycast edge (`76.76.21.21` / `cname.vercel-dns.com`), preventing Let's Encrypt HTTP-01 certificate issuance.
- **Fix:** Configured `A @ -> 76.76.21.21` and `CNAME www -> cname.vercel-dns.com` directly in the DNS zone and attached both `gadariya.org` and `www.gadariya.org` to the Vercel project with automatic TLS 1.3 + HSTS.

### `BUG-H02` — Raw Translation Keys (`manager.self`, `register.name`, `profile.height`) on `/register`
- **Symptom:** Registration Step 1 and Step 2 displayed raw dot-separated i18n keys instead of human labels.
- **Root Cause:** `src/app/register/page.tsx` referenced `manager.*`, `register.name`, and `profile.height`, whereas `messages/en.json` and `messages/hi.json` stored those labels under `register.firstName` and `register.height`.
- **Fix:** Added complete `manager.*`, `register.name`, `profile.height`, `profile.maritalStatus`, and `profile.neverMarried` keys to both `messages/en.json` and `messages/hi.json`, enforced by `src/lib/i18n/i18n.test.mjs` + Playwright Journey 2.

### `BUG-H03` — Firebase Google Sign-In Runtime Crash (`TypeError: t is not iterable`)
- **Symptom:** Clicking "Continue with Google" threw `t is not iterable` or `The requested action is invalid`.
- **Root Cause:** Firebase Web SDK v13 queries `identitytoolkit.googleapis.com/v1/projects` during popup origin validation and iterates `for (let e of authorizedDomains)`. When the Identity Toolkit project config omits `authorizedDomains`, `t` is `undefined`. Additionally, `appVerificationDisabledForTesting = true` had been left active globally, breaking real carrier reCAPTCHA tokens.
- **Fix:** Added a safe Identity Toolkit `authorizedDomains` normalizer in `src/lib/firebase/client.ts`, restricted `appVerificationDisabledForTesting` strictly to explicit CI test numbers, and mapped Firebase error codes to clear user guidance in `src/app/login/page.tsx` and `src/app/register/page.tsx`.

### `BUG-H04` — `column "metadata" of relation "verification_requests" does not exist`
- **Symptom:** Submitting Step 4 of `/register` failed with PostgreSQL error `column "metadata" of relation "verification_requests" does not exist`.
- **Root Cause:** `src/app/api/auth/register/route.ts` attempted to insert into a nonexistent `metadata` column on `public.verification_requests` instead of `reviewer_notes`.
- **Fix:** Updated the `INSERT` in `src/app/api/auth/register/route.ts` to write `(id, profile_id, verification_type, status, reviewer_notes, verified_at)`.

### `BUG-H05` — Google-Only Registration Blocked by Mandatory 10-Digit Phone Check
- **Symptom:** Candidates authenticating with Google (where Google OAuth does not return a mobile number) were blocked by phone length validation.
- **Root Cause:** Registration validation previously required a 10-digit phone number even when a verified Google email was present.
- **Fix:** Updated `src/app/api/auth/register/route.ts` and `src/app/register/page.tsx` to permit verified Google email registration using deterministic HMAC blind indexing (`hashPhoneNumber("google:" + email)`) and AES-256-GCM encryption at rest.

---

## Part 2 — Current User-Reported Production Errors (`BUG-001` to `BUG-008`)

### `BUG-001` (User Error #1) — `(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`
- **Symptom:** Red error banner on `/profile` and silent empty results on `/discovery` due to Supabase pooler rejecting connections with `EMAXCONNSESSION`.
- **Root Cause (Dual):**
  1. `DATABASE_URL` used Supabase Supavisor port `:5432` (**Session Mode**), which holds backend PostgreSQL connections pinned for the client lifetime and caps total clients at `15`.
  2. In `src/lib/db/index.ts`, `getPool()` cached `globalThis.__dbPool` **only** when `process.env.NODE_ENV !== "production"`! In Vercel production (`NODE_ENV === "production"`), **every single `db.query()` call instantiated a brand-new `new Pool()`** that was never closed, exhausting all 15 session slots within 2–3 page loads.
- **Fix:**
  - `normalizeConnectionString()` in `src/lib/db/index.ts` automatically upgrades `.pooler.supabase.com:5432` to `.pooler.supabase.com:6543` (**Supavisor Transaction Mode**).
  - `getPool()` now unconditionally caches the singleton `globalThis.__dbPool` across both development and production with `max: 3, idleTimeoutMillis: 5000, allowExitOnIdle: true`.
  - Consolidated `getFullProfile()` from 6 sequential SQL queries into 3 (`LEFT JOIN`) and `getAdminDashboardStats()` from 4 queries into 1 scalar-subquery `SELECT`.

### `BUG-002` (User Error #2) — Upload Photo Button Only Added a Placeholder Card With No File Picker or Image Upload
- **Symptom:** Clicking `Upload Photo` on `/profile -> Private Photos` immediately POSTed a fake storage key without opening a file selector or storing/displaying any photo.
- **Root Cause:** `src/app/profile/page.tsx` had `handlePhotoUpload` wired to a plain `<button>` sending a dummy filename string, and `public.profile_photos` had no column or route to store/serve compressed binary images.
- **Fix:**
  - Added `image_data TEXT` to `public.profile_photos` (live migration applied) and removed the 3 empty simulated photo rows from `PAL100070`.
  - Created client-side `<canvas>` compressor `src/lib/media/compress-image.ts` (resizes up to `900px` JPEG `0.82`).
  - Rebuilt `/profile -> Private Photos` (`src/app/profile/page.tsx`) with a real `<input type="file" accept="image/jpeg,image/png,image/webp">`, live preview before upload, per-photo privacy selector (`PUBLIC_TO_MEMBERS`, `BLURRED`, `APPROVAL_REQUIRED`), and `Delete` button.
  - Built `src/app/api/profile/photo/[photoId]/route.ts` serving decoded binary images with strict privacy enforcement (owner, admin, or approved members / `biodata_shares` grant).

### `BUG-003` (User Error #3) — Wrong Information (`राजेश PAL100001`) Shown on `/profile`
- **Symptom:** `/profile` intermittently rendered `राजेश (28 वर्ष) PAL100001 • Agra, Uttar Pradesh` instead of the logged-in user (`Sudhir PAL100070`) or when `/api/profile` failed.
- **Root Cause:**
  1. `src/app/profile/page.tsx` initialized `useState` with hardcoded `राजेश` / `PAL100001` / `Agra` defaults! Whenever `GET /api/profile` threw `500 EMAXCONNSESSION`, the catch block left the hardcoded `राजेश` state on screen!
  2. `GET /api/profile` fell back to `db.seedDemoProfileIfEmpty()` (`PAL100001`) whenever `pal_session` was absent.
- **Fix:** Removed all hardcoded `राजेश` initial state in `src/app/profile/page.tsx` (replaced with clean loading skeleton + redirect to `/login` on `401`) and removed `seedDemoProfileIfEmpty()` fallback from `/api/profile`.

### `BUG-004` (User Error #4) — Discovery Age Filter Not Working Properly
- **Symptom:** Setting Age `18` to `29` on `/discovery` still showed `31 years` / out-of-range profiles and dozens of duplicate `Candidate A` / `Candidate B` cards.
- **Root Cause:**
  1. `Number(e.target.value) || 70` in `src/app/discovery/page.tsx` jumped `maxAge` to `70` while typing, firing overlapping un-cancelled `fetch` requests whose responses arrived out of order.
  2. When `GET /api/discovery` failed with `EMAXCONNSESSION`, the frontend silently ignored `!res.ok` and kept stale unfiltered cards on screen.
  3. Repeated runs of `discovery.test.mjs` had leaked 67 `Candidate A` (31yo) and `Candidate B` (29yo) rows into the live database.
- **Fix:** Rewrote `src/app/discovery/page.tsx` with string-buffered numeric inputs, `250ms` debounce, `AbortController` cancellation of in-flight requests, and explicit error banners; purged all 67 leaked test rows and seeded 4 realistic `PUBLISHED` sample profiles (`PAL100071`–`PAL100074` spanning ages 24–32).

### `BUG-005` (User Error #5) — `Google Sign-In is pending activation in the Firebase console.`
- **Symptom:** Clicking "Continue with Google" displays `Google Sign-In is pending activation in the Firebase console. Please sign in using Phone verification.`
- **Root Cause:** In Firebase project `studio-1427447382-cd5d2`, Phone Auth is enabled and active, whereas the Google OAuth Sign-In provider (`google.com` IdP config) is currently disabled. Google Cloud's Identity Platform blocks automated/CLI creation of Web OAuth Client IDs without an interactive project-owner consent click in the browser console.
- **Action Required by Project Owner (30-Second One-Time Toggle):**
  1. Open: https://console.firebase.google.com/project/studio-1427447382-cd5d2/authentication/providers
  2. Click **Google** -> toggle **Enable** ON -> select support email (`05sudhirpal@gmail.com`) -> click **Save**.
  3. Under **Authentication -> Settings -> Authorized domains**, ensure `gadariya.org`, `www.gadariya.org`, and `gadariya-livid.vercel.app` are listed. (Code is 100% wired and ready the instant the toggle is saved.)

### `BUG-006` (User Error #6) — Header Showed `Sign In` & `Register Free` After Logging In and Had No `Sign Out`
- **Symptom:** Even when logged in on `/profile`, the top navigation bar still showed `Sign In` and `Register Free` with no way to log out.
- **Root Cause:** `src/components/AppHeader.tsx` had hardcoded `<Link href="/login">` and `<Link href="/register">` buttons and never queried session state.
- **Fix:** Created `GET /api/auth/me` (`src/app/api/auth/me/route.ts`) and updated `src/components/AppHeader.tsx` to synchronize auth state on route changes and custom `pal-auth-changed` events—displaying the member's `firstName` + `PAL######` badge, `Interests` & `Verification` links, `Admin` console badge (when admin authenticated), and a working `Sign Out` button (`POST /api/auth/logout`).

### `BUG-007` (User Error #7) — Information Provided on `/profile` Was Not Saved
- **Symptom:** Editing Career/Family/Preference fields on `/profile` and clicking `Save` failed to persist data reliably.
- **Root Cause (Triple):**
  1. `EMAXCONNSESSION` (`BUG-001`) caused `PUT /api/profile` to fail at connection acquisition.
  2. Unselected `<select>` dropdowns sent empty strings `""` (or `null`), causing Zod `z.enum(...)` in `src/app/api/profile/route.ts` and PostgreSQL `CHECK` constraints (`employed_in`, `diet`, `family_type`, `family_values`) to reject the entire save payload!
  3. Core `public.profiles` fields (`firstName`, `heightCm`, `maritalStatus`, `state`, `city`, `subCommunity`, `isDiscoverable`) were not included in `updateFullProfile()`.
- **Fix:** Added `emptyToUndefined` Zod preprocessors on all enum fields in `src/app/api/profile/route.ts`, normalized empty strings to `NULL` before SQL `UPSERT` in `src/lib/db/index.ts`, added core `public.profiles` editing & persistence, and restored `Sudhir`'s (`PAL100070`) entered `B.Tech in Civil Engineering` / `IIT Delhi` record in PostgreSQL.

### `BUG-008` (User Error #8) — No Admin Login Provision in UI, Serverless MFA Failure & Missing Moderation Views
- **Symptom:** No link in the web app to reach Admin Login, Admin MFA failed intermittently on Vercel serverless functions, and Admins had no view to browse all registered users or moderate uploaded photos/selfies.
- **Root Cause:**
  1. No link to `/admin/login` existed in `AppFooter` or `AppHeader`.
  2. `src/lib/admin/mfa.ts` stored MFA challenges only in process-local `Map` memory—so on Vercel serverless, `POST /api/admin/login` on Lambda A and `POST /api/admin/mfa/verify` on Lambda B failed!
  3. `/admin` only queried `PENDING_REVIEW` profiles and lacked a Photo Moderation queue or Selfie image viewer.
- **Fix:**
  - Added **Admin Portal** link in `src/components/AppFooter.tsx` and live `Admin` pill in `src/components/AppHeader.tsx`.
  - Upgraded `src/lib/admin/mfa.ts`, `/api/admin/login`, and `/api/admin/mfa/verify` with a **stateless HMAC-SHA256 `HttpOnly` challenge cookie** (`pal_admin_mfa_challenge`, 5-min TTL) so Admin MFA works reliably across all serverless instances.
  - Expanded `/admin` (`src/app/admin/page.tsx`) to 5 full tabs: **Overview & Immutable Security Audit Trail**, **All Registered Members** (`ALL` / `PENDING_REVIEW` / `PUBLISHED` / `SUSPENDED` / `REJECTED` + search + Publish/Suspend/Reject actions), **Photo Moderation Queue** (live image preview + Approve/Reject), **Selfie Verifications** (live selfie preview + Award Badge/Reject), and **Abuse Reports**.

---

## Part 3 — Additional Bugs Discovered & Fixed During Full User/Admin Audit (`BUG-009` to `BUG-014`)

### `BUG-009` — Unauthenticated API Fallback to Demo Profile `PAL100001` (Security / Privacy Defect)
- **Root Cause:** 9 protected API routes (`/api/profile`, `/api/profile/photo`, `/api/profile/managers`, `/api/interests`, `/api/shortlists`, `/api/contact-exchange`, `/api/contact-exchange/[requestId]`, `/api/verification/status`, `/api/verification/selfie`) called `await db.seedDemoProfileIfEmpty()` when `session?.profileId` was null instead of returning `401 Unauthorized`.
- **Fix:** Removed `seedDemoProfileIfEmpty()` from all API routes; every protected endpoint now strictly enforces `401 Authentication required`.

### `BUG-010` — Missing `Approve & Share Contact` / `Decline` / `Withdraw` Buttons on `/connections`
- **Root Cause:** `PUT /api/contact-exchange` implemented the bilateral state machine (`SENDER_APPROVED -> BOTH_APPROVED`), but `src/app/connections/page.tsx` Tab 4 only rendered a static lock message with no buttons for the receiver to approve/decline or the sender to withdraw!
- **Fix:** Wired `myProfileId` and `handleRespondExchange` in `src/app/connections/page.tsx` with **Approve & Share Contact**, **Decline**, and **Withdraw Request** buttons, verified end-to-end in Playwright Journey 9.

### `BUG-011` — Watermarked Biodata PDF `500` Crash on `₹` Symbol or Devanagari Characters
- **Root Cause:** `pdf-lib`'s `StandardFonts.Helvetica` uses `WinAnsi` encoding (`0x20–0xFF`) and throws an unhandled encoding exception whenever candidate income contains `₹` (`U+20B9`), em-dashes `—`, or Devanagari script (`राजेश`).
- **Fix:** Implemented `sanitizePdfText()` in `src/lib/biodata/pdf-generator.ts` (`₹ -> Rs. `, smart punctuation normalization, safe ASCII fallback for non-WinAnsi glyphs) + added unit regression test `M6-05` and Playwright Journey 8 check.

### `BUG-012` — Integration Test Suites Leaking Test Profiles & Mutating Real Member Rows
- **Root Cause:** `discovery.test.mjs` inserted `Candidate A` and `Candidate B` without `t.after` deletion; `verification.test.mjs` ran `SELECT id FROM public.profiles LIMIT 1` and mutated a real user's `SELFIE` badge; `db.test.mjs` left `test_hash_brother_999` in `profile_managers`.
- **Fix:** Refactored `discovery.test.mjs`, `verification.test.mjs`, `db.test.mjs`, and `admin.test.mjs` to use isolated UUID fixtures, `t.after()` deterministic cleanup, and Supavisor Transaction Mode (`:6543`).

### `BUG-013` — Parallel Test Cleanup Race in `privacy.test.mjs`
- **Root Cause:** `privacy.test.mjs` executed `DELETE FROM public.users WHERE email LIKE '%@pal.in'` in `t.after`, deleting `@pal.in` test users belonging to concurrently executing suites (`messages.test.mjs`, `discovery.test.mjs`).
- **Fix:** Scoped `privacy.test.mjs` cleanup strictly to `DELETE FROM public.users WHERE id = ANY($1::uuid[])` using its own `createdUserIds` array.

### `BUG-014` — Synthetic `google:` Placeholder & Demo Fallback Phone in `getDisclosedContact`
- **Root Cause:** In `src/lib/db/index.ts`, `getDisclosedContact()` decrypted `phone_encrypted` without filtering out the `google:<email>` synthetic blind-index placeholder used by Google-only accounts, and fell back to `"+91 98765 43210"` on decryption failure.
- **Fix:** Updated `getDisclosedContact()` to map `google:` placeholders and failed decryptions cleanly to `null` (displaying `"Not shared"` for phone while disclosing verified email), eliminating all synthetic/demo phone output.

---

## Part 4 — Verification Gate Evidence (`D-016`)
- **TypeScript (`npm run typecheck`):** `0` errors (`Exit Code 0`).
- **Unit & Integration Suites (`npm test`):** `47/47` tests **PASSED** across all 10 suites (`0` leaked DB rows).
- **Production Bundle (`npm run build`):** `41/41` static & dynamic routes compiled cleanly (`Exit Code 0`).
- **Playwright Browser User & Admin E2E (`npm run test:e2e` / `e2e/full_user_and_admin_e2e.mjs`):** `11/11` journeys **PASSED** against `next start` (`0` console/page errors, `0` DB leaks, real user `PAL100070` verified intact).

