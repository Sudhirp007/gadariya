# Pal Matrimony — Development Roadmap

**Version:** 1.0 · **Derived from:** Product Requirements Document v1.0
**Confirmed decisions:**

- Community: Pal community only (self-declared affiliation, moderation reviewed)
- Market: India + NRI
- Manager model: self-managed AND family-managed profiles
- Verification: Firebase Phone Authentication (Google/Firebase) + selfie (manual admin review for MVP) + optional ID check
- Platform: responsive website first; Android/iOS apps later
- Budget ceiling: ₹3,00,000 · Delivery target: 10–12 weeks
- Architecture: modular monolith → **Stack:** Next.js (React/TS) + Tailwind/shadcn + NestJS + PostgreSQL/Prisma + private S3-compatible storage + Firebase Auth (phone)

---

## 1. Delivery principle

Build in **slices that are individually testable and demoable**, not in layers. Every sprint ends with a runnable vertical slice (DB → API → UI) that a stakeholder can click through. Release payment against working milestones, and keep repo, cloud accounts, domain, and DB ownership under your control from day one.

---

## 2. Pre-development deliverables (freeze before writing code)

Before any application code, produce and freeze these four artifacts. They are the contract against which developers are quoted and paid.

| # | Artifact | Owner | Gate |
| - | -------- | ----- | ---- |
| 1 | Final PRD (this, signed off) | Product owner | All subsequent work |
| 2 | Database ERD: full PostgreSQL/Prisma schema, indexes, FK + security rules | Backend lead | Schema freeze |
| 3 | UI/UX wireframes + clickable prototype (registration, dashboard, discovery, biodata approval, chat, admin) | UI/UX | Design freeze |
| 4 | API contract: OpenAPI spec for all endpoints in Part 3 of PRD | Backend lead | API freeze |

**Why this matters at ₹3L budget:** a frozen spec lets you get fixed quotations, prevents scope creep, and lets QA write tests against a stable contract.

---

## 3. Sprint plan (10–12 weeks)

Seven sprints, each with a definition-of-done (DoD). Parallel frontend/backend assumed.

### Sprint 0 — Week 1: Foundation
- Deliverables: repo setup (monorepo: `apps/web`, `apps/api`), CI pipeline, lint/format/type-check, Docker compose for local PostgreSQL + Redis, DB migrations applied, deployment target (dev/staging/prod) provisioned.
- DoD: `npm run build` and migrations pass on a fresh checkout; staging URL responds over HTTPS.

### Sprint 1 — Weeks 2–3: Authentication & Registration
- **Epic 1 (Auth):** Firebase Phone Authentication (Google/Firebase) sign-in, session login/logout/refresh, duplicate-account handling, consent recording (terms + privacy + optional marketing).
- **Registration flow:** country-code select → Firebase Phone Authentication verification → profile-type (self/son/daughter/brother/sister/relative) → basic biodata → community declaration → visibility prefs → save as draft.
- DoD: user can register, verify phone via Firebase, choose account type, save draft profile; underage rejected; duplicate phone handled; consent timestamps stored.

### Sprint 2 — Weeks 4–5: Profile & Family Management
- **Epic 2 (Profile):** biodata edit, photo upload (private storage, moderation `PENDING`), education/career, family details, partner preferences, completion score.
- **Epic 3 (Family):** invite manager, accept invitation, grant/revoke permissions, access history.
- Admin: profile submission → admin approval queue.
- DoD: user/submit a profile for review; family manager can be invited and granted limited permissions; admin can approve/reject.

### Sprint 3 — Weeks 6–7: Discovery & Interests
- **Epic 5 (Discovery):** search/filter (age, location, education, profession, verified, photo), pagination, match cards, shortlists, recommended matches.
- **Epic 6 (Interests):** send/accept/decline/withdraw, received/sent lists, duplicate-interest guard, verify-before-send rule.
- DoD: only eligible published profiles appear; blocked excluded; verified can send interests; duplicate interests blocked; accept unlocks conversation eligibility.

### Sprint 4 — Weeks 8–9: Verification & Privacy
- **Epic 7 (Privacy):** profile visibility, photo visibility, biodata request/approve/revoke, watermarked biodata, consent records.
- **Epic 4 (Verification):** mobile badge, selfie submission (**OPTIONAL** — accounts are created by parents/guardians/siblings so selfie is an optional trust upgrade, never a gate), admin selfie review, identity-check request (optional), badge display, revoke on expiry.
- Admin: verification queue.
- DoD: selfie workflow works end-to-end but is optional; admin approves/rejects; badges accurate; biodata approval flow works; revoke works; phone number never returned by discovery APIs.

### Sprint 5 — Week 10: Biodata & Contact Exchange
- **Epic 8 (Contact exchange):** initiate request, bilateral approval, disclosure only after both approvals, audit record.
- Biodata share expiry + revoke + watermark.
- DoD: contact details exposed ONLY after both parties approve; withdrawal before disclosure blocks it; every disclosure logged.

### Sprint 6 — Week 11: Admin & Safety
- **Epic 9 (Admin/Safety):** admin dashboard, profile/verification/report queues, suspend/block, audit logs, admin role mgmt, MFA.
- Blocks, reports, support tickets.
- DoD: admin actions logged; MFA enforced; report → investigation → resolution loop works.

### Sprint 7 — Week 12: QA, Security & Launch
- Security testing (see SECURITY_WORKFLOW.md), performance/load sanity, responsive mobile checks, UAT with community members, production deploy, SSL, backups tested, monitoring (Sentry), terms + privacy published.
- DoD: MVP checklist (PRD §23) passes; production URL live over HTTPS; backups restore-tested.

---

## 4. Milestones & payment gates

Release developer payment against these working milestones, not calendar dates:

| Milestone | Evidence | Suggested payment % |
| --------- | -------- | ------------------- |
| M0 Pre-dev artifacts frozen | ERD + wireframes + API spec approved | 15% |
| M1 Sprint 1–2 done | register → save profile → submit for review | 20% |
| M2 Sprint 3–4 done | discovery + interests + selfie verification work | 20% |
| M3 Sprint 5–6 done | contact exchange + admin + auditing work | 20% |
| M4 Sprint 7 launch | live over HTTPS, checklist passes | 15% |
| M5 30-day warranty | no critical defects, backups proven | 10% |

---

## 5. Budget allocation (ceiling ₹3,00,000)

| Workstream | Budget |
| ---------- | ------ |
| Product requirements & architecture | ₹15,000 |
| UI/UX design + clickable prototype | ₹20,000 |
| Frontend development | ₹45,000 |
| Backend & database | ₹65,000 |
| Admin panel | ₹20,000 |
| Integration & privacy controls | ₹25,000 |
| QA & security testing | ₹20,000 |
| Deployment & documentation | ₹10,000 |
| Contingency | ₹30,000 |
| **Subtotal** | **₹2,50,000** |
| Reserve (SMS/third-party/unforeseen) | ₹50,000 |

**Assumptions to stay under ₹3L:** component library, single responsive web app, no native apps, Firebase Phone Authentication, manual admin selfie verification, optional manual ID check, PostgreSQL search (no OpenSearch), simple admin panel, no advanced chat / no paid AI.

**Recurring ops (~₹3,300–8,800/mo):** hosting, PostgreSQL + backups, object storage, Firebase Auth (phone), email, monitoring + domain (annual).

---

## 6. Team

| Role | Count |
| ---- | ----- |
| Product owner | 1 |
| UI/UX designer | 1 |
| Frontend developer | 1 |
| Backend developer | 2 |
| QA engineer | 1 |
| DevOps | part-time |

A single strong full-stack dev can cover some roles for a smaller crew.

---

## 7. Phase 2 (only after real users)

Native apps, WhatsApp notifications, horoscope matching, video intros, family group access, assisted matchmaking, AI recommendations, regional languages, community events, success stories, payment/subscriptions.

---

## 8. Risk register (top risks)

| Risk | Mitigation |
| ---- | ---------- |
| Budget overrun | Frozen spec + milestone payments + reserve |
| Firebase phone auth provisioning delays | Configure Firebase project + phone auth in Sprint 0 |
| Manual selfie review is slow | Define SLAs + train admins early; add provider later |
| Fake/duplicate profiles | Firebase phone verification + admin review + block/report + audit |
| Privacy incident | See SECURITY_WORKFLOW.md; incident-response runbook |
| Low initial community density | Launch with word-of-mouth + community sponsors; only verified discoverable |

---

*Roadmap v1.0. Aligns with PRD §19 (sprints), §20 (budget), §21 (ops), §24 (first milestone).*
