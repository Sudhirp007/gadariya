# PAL MATRIMONY — Designer ↔ Builder Handoff (Chat Protocol)

**Version:** 1.0 · **Budget:** under ₹10,000 (development) · **Build by:** external coding agent/tool

---

## 0. How to read & use this document

This is **both a spec and the chat interface** between two agents:

- **Designer (me)** — the reasoning/logical brain. Owns product decisions, scope, security rules, and answers questions.
- **Builder (you, the coding agent)** — does the development. Reads this doc, asks questions via the protocol, and reports progress.

You (Builder) should treat this document as your active brief. Use **Section 8 (Protocol)** to ask me anything and to report status. I will reply in this same format. Do not invent product rules; ask via the protocol if anything is ambiguous. Everything you need to build is here.

---

## 1. Roles & working boundary

| Role | Who | Responsibility |
| ---- | --- | -------------- |
| Designer | Me (reasoning brain) | Product scope, privacy/security rules, priorities, decision-making, answering your questions |
| Builder | You (coding agent) | Implementing code from this spec, raising questions, running tests, reporting status |
| Owner | User | Pays for build; final acceptance |

**Working rule:** I decide *what & why*. You decide *how to implement within constraints*, but you must never weaken a security/consent rule to make implementation easier. If a rule is impossible under the budget, stop and ask me.

---

## 2. Hard constraints (must-not-violate)

1. **Budget for development: under ₹10,000.** No paid subscriptions required to run the MVP. Use free tiers.
2. **No paid third-party SaaS required for the MVP** (no AWS spend, no paid AI, no paid SMS as a dependency).
3. **Privacy invariants (non-negotiable, from PRD):**
   - Phone / email / address / identity documents are **never** returned by discovery or match APIs.
   - Contact details are revealed **only after both parties explicitly approve** a contact exchange.
   - Premium/payment (none in MVP) must never override consent.
   - Family managers never inherit authority over the owner's private disclosure.
   - The backend (not the frontend) enforces every permission.
   - Underage profiles rejected; Aadhaar never required.
4. **Build order:** follow Section 6. Do not skip ahead to optional items.
5. **No fictional data in production.** Use clearly-labeled seed/sample data only for dev.
6. **Live domain: `http://gadariya.org/`** — the production site must be reachable at this domain.
   - ⚠️ **Security requirement:** although the user gave `http://`, a matrimonial platform carrying private data **must be served over HTTPS**. Set up SSL/TLS (free via Vercel/Let's Encrypt) with automatic redirect from HTTP → HTTPS. Do not ship production on cleartext HTTP.
7. **Bilingual requirement (Hindi-primary + English):** the site must support **two languages**:
   - **Primary: Hindi (hi)** — the default interface language.
   - **Secondary: English (en)** — a toggle lets the user switch to English.
   - Language choice is per-user and should persist (e.g., in a cookie / user profile setting).
   - All UI strings, labels, messages, and public-facing content must be available in both languages.
   - For MVP: implement the language toggle at the UI level (i18n) for all interface text. Deep content translation (user-generated biodata) is out of scope — only the platform UI/public pages are bilingual.

---

## 2A. Bilingual (i18n) implementation guidance

- Use a lightweight i18n approach that fits the free stack, e.g. `next-intl` (works with Next.js App Router, free, no SaaS).
- Structure locale files: `messages/hi.json` and `messages/en.json` (or `locale/hi|en`).
- Set default locale to `hi`; the toggle switches active locale and persists the choice.
- All public pages (landing, how-it-works, privacy, terms, registration/OTP screens, dashboard, profile, discovery cards, admin UI labels) must render from the active locale's string table.
- Server-side components and API messages should use the locale-aware lookup; keep URL routing clean (e.g., `/` for default locale with an `/en` prefix option or a cookie-based toggle — decide at implementation; propose via protocol if needed).
- Date/number formatting should follow the active locale.
- **Do not** use the AI service to translate dynamic user content in MVP; bilingual applies to interface strings only.

---

## 3. Rescaled MVP scope (fits budget)

We cut the ₹3L PRD down to the **smallest trust-first product** that proves the core value: *verified members discover each other and exchange contact only by mutual consent.*

### 3.1 IN SCOPE (MVP)

| Area | What we build |
| ---- | ------------- |
| Registration | Mobile OTP via free email/OTP provider; profile type (self/son/daughter/relative); basic biodata; Pal community declaration; consent capture |
| Profile | Unique public ID, photo upload (private), education/profession, family details, partner preferences, completion % |
| Verification | Mobile badge + **manual admin selfie verification** (moderator reviews; no paid provider) |
| Discovery | Search/filter by age, city, education, profession, verified-only; pagination; match cards; shortlist |
| Interests | Send / accept / decline / withdraw; no duplicates; verify-before-send |
| Privacy | Photo & biodata approval-controlled; phone hidden; request+approve biodata; revoke; watermarked PDF (simple) |
| Contact exchange | Dual-approval state machine; contacts revealed only after both approve; audit log |
| Communication | Simple in-app messages **after mutual interest** (basic; no real-time websockets) |
| Admin | Separate login + MFA; approval queues; reports; blocks; audit view; role model |
| Notifications | Email-based notifications only |

### 3.2 OUT OF SCOPE for this budget (do NOT build)

- Native Android/iOS apps
- Real-time chat (websockets) — use simple polling or Supabase realtime if free
- AI matchmaking / recommendations engine
- Horoscope, video, WhatsApp integration
- Payments / premium subscriptions / profile boost
- Identity provider integration (Aadhaar/KYC). — manual admin check only
- Multi-language, advanced analytics, OpenSearch
- SMS gateway as dependency (use email OTP to stay free; phone can be an optional field later)

---

## 4. Free-tier technology stack

| Layer | Choice (free tier) | Why |
| ----- | ------------------ | --- |
| Frontend | Next.js (App Router) + TypeScript | One deployable app; API routes cover backend |
| Styling | Tailwind CSS + shadcn/ui | Fast, familiar |
| Backend | Next.js API routes or a tiny Node/NestJS service | Avoids a second paid host; keep monolith |
| Database | Supabase (PostgreSQL free tier) | Auth, DB, and storage in one free service |
| Auth/OTP | Supabase Auth (email OTP) | Free; avoids SMS cost |
| Storage | Supabase Storage (private buckets) | Photos/watermarked biodata |
| Email | Resend free tier (100/day) or Supabase email | Notifications/OTP |
| Hosting | Vercel free tier (frontend + API) | Free, easy; auto-HTTPS + HTTP→HTTPS redirect |
| Monitoring | Vercel analytics/app, minimal | Keep free |
| i18n/bilingual | next-intl (or equivalent free lib) | Hindi-primary + English toggle, per-user persisted |

> If the Builder has a cheaper/better free alternative that meets the same constraints, propose it via the protocol; I will decide.

---

## 5. Data model (minimal, from PRD §14)

Keep these tables (trim to essentials). Use UUID PKs. Follow PRD schema as the base, trimmed to scope:

- `users` (phone_encrypted, phone_lookup_hash, status)
- `profiles` (public_id, owner_user_id, managed_by, gender, dob, height, marital_status, country/state/city, community_declaration, publication_status, is_discoverable)
- `profile_details`, `family_details`, `profile_preferences`
- `profile_managers` + `manager_permissions` (family access, RBAC)
- `profile_photos` (storage_key, visibility, moderation_status)
- `verification_requests` (+ events; manual review)
- `interests`, `shortlists`
- `conversations`, `messages` (encrypted at rest)
- `privacy_settings`, `biodata_shares`, `contact_exchange_requests`, `contact_disclosures`
- `blocks`, `reports`, `audit_logs`, `admin_users`

**Key security fields:** phone stored encrypted with a keyed lookup hash; messages encrypted; DOB stored, age computed; photos in private storage via short-lived signed URLs.

---

## 6. Build order (milestones)

Build in this order; each milestone is independently runnable and demoable.

| M | Milestone | Definition of done |
| - | --------- | ------------------ |
| M0 | Scaffold & infra | Repo; Next.js + Supabase connected; DB migrations; free-tier hosting staging URL live over HTTPS; **i18n skeleton with hindi (default) + english locale files + toggle** |
| M1 | Auth & registration | Email OTP send/verify; account type; basic biodata save; underage + duplicate handling; consent recorded |
| M2 | Profile & family | Edit biodata; photo upload (private); family manager invite/permissions; completion %; submit for review |
| M3 | Admin core | Admin login + MFA; approval queue; approve/reject; suspend/block; audit log |
| M4 | Verification | Mobile badge; selfie upload; admin selfie review; badges display; revoke |
| M5 | Discovery & interests | Search/filter; pagination; match cards; shortlist; send/accept/decline/withdraw; verify-before-send; duplicates blocked |
| M6 | Privacy & biodata | Photo/biodata approval; request/approve/revoke biodata; watermarked PDF; consent records |
| M7 | Contact exchange | Dual approval state machine; reveal only after both; audit; in-app messages after mutual interest |
| M8 | Safety & launch | Reports; blocks; final security pass; responsive checks; deploy production; SSL; backups; terms/privacy published |

---

## 7. Security / privacy rules the Builder must implement

1. HTTPS everywhere; encryption at rest and in transit.
2. Phone numbers encrypted; lookup hash for duplicates; never exposed in any API response.
3. OTP single-use, time-limited, rate-limited; never echoed.
4. Server-side authorization on every sensitive endpoint (frontend never trusted).
5. Contact-details endpoint verifies **both** approvals before returning data.
6. Admin MFA; admin actions audited; sensitive access logged with reason.
7. Private storage; short-lived signed URLs; no public/static biodata URLs.
8. Underage and duplicate validation at registration.
9. Soft-delete → retention-controlled permanent deletion.
10. Audit log for consents, disclosures, verification, admin actions.
11. Incident-response note + reachable admin contact.

---

## 8. CHAT PROTOCOL (this is the interface we use)

> **Active Communication & Sign-off Log:** All live exchanges, architectural proposals, and formal milestone sign-offs between Designer/PM (Codvian) and Builder/Tech Lead (Antigravity) are recorded in [AGENT_COMMUNICATION_CHAIN.md](./AGENT_COMMUNICATION_CHAIN.md).

We communicate only through structured messages. Keep each message short and in the format below.

### 8.1 Message envelope

```
[FROM] designer | builder
[RE] <topic>
[TYPE] question | decision | status | report | blocked | done
[ID] <short unique id, e.g., Q3 or S1>
---
<body, max ~10 lines>
```

### 8.2 Message types

| TYPE | Who sends | Meaning |
| ---- | --------- | ------- |
| `question` | builder | I need a product/decision answer. Always give an ID, and 2–3 options with my recommendation if possible. |
| `decision` | designer | I answer a question; I state the chosen option + rationale + any constraint. |
| `status` | builder | Brief progress update (what's done, what's next). |
| `report` | builder | Milestone detail, including what was tested and the accepted result. |
| `blocked` | builder | I cannot proceed; I state exactly what blocks me and ask for a decision. |
| `done` | builder | A milestone is complete; provide evidence (e.g., what the build/tests show). |

### 8.3 Rules of the channel

- One topic per message. Use IDs to refer to earlier messages.
- The designer answers `question`/`blocked` messages with a `decision`.
- The builder never changes a security rule on its own.
- If a rule can't be met under budget, send `blocked` and ask.
- Every `done` must include what was verified (tests/build/run).

### 8.4 Example exchange (illustrative)

```
[FROM] builder
[RE] M1 auth
[TYPE] question
[ID] Q3
---
Should email-OTP be the only login for MVP, or do we also add a password
fallback? I recommend email OTP only to keep it simple and free. Option B:
OTP + password.
```

```
[FROM] designer
[RE] Q3
[TYPE] decision
[ID] D3
---
Chosen: A — email OTP only for MVP. Add password in a later phase. Keep
session tokens secure and revocable.
```

---

## 9. Open decisions the designer will answer

The Builder should NOT guess these; ask via protocol when you reach them:

1. Public display name: full name vs first name + profile ID → **default: first name + profile ID**.
2. Discovery requires login? → **default: yes (member-only)**.
3. Chat after mutual interest only, or also after approval? → **default: after mutual interest**.
4. Model-declaration review: manual moderation by admin? → **default: yes, light moderation**.
5. Biodata export: view-only inside platform vs watermarked downloadable PDF? → **default: view inside platform + optional watermarked download**.
6. Contact-exchange authority when family-managed: owner's approval still required? → **yes, always**.
7. Deployment target free tier details (Supabase vs other) → ask me if changing.
8. Bilingual toggle routing: cookie-based locale vs `/en` URL prefix → **default: cookie-based toggle, Hindi default, no URL prefix in MVP** (simpler; revisit at scale).
9. Real domain `gadariya.org`: confirm DNS + Vercel setup for production when we reach M8 → ask me before configuring.

---

## 10. Acceptance test checklist (for Builder to run)

- [ ] Register with OTP works; OTP expires; rate-limited.
- [ ] Underage rejected, duplicate phone handled.
- [ ] Profile created with unique public ID.
- [ ] Search returns only eligible published profiles; pagination works.
- [ ] Private photo/biodata requires permission.
- [ ] Phone number never appears in any API/response.
- [ ] Contact shown only after both approve; audit logged.
- [ ] Unverified cannot send interests.
- [ ] Block prevents interaction.
- [ ] Admin approval + MFA + audit works.
- [ ] Backups restore-tested; SSL enforced.
- [ ] Production reachable at `https://gadariya.org` (HTTP auto-redirects to HTTPS).
- [ ] Default language is Hindi; toggle switches all UI to English and persists per user.
- [ ] All public/interface strings render in the active locale (no untranslated placeholders).

---

## 11. Final note

Build the smallest honest product that proves trust-first matchmaking. Ask before you guess. When a milestone is done, send me a `report`/`done` with what you verified. I will respond with decisions and next steps. Keep all ownership (repo, Supabase project, Vercel, domain) under the owner's control from day one.

**Version 1.0 · Pal Matrimony · Designer↔Builder protocol**
