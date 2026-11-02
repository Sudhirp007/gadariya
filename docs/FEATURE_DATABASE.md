# Pal Matrimony — Feature Database

**Version:** 1.0 · **Derived from:** PRD v1.0 (Modules A–D, §4–§11, §18)
**Legend:** P0 = required for MVP launch · P1 = short-term add · P2 = Phase 2 (post-launch)
Each feature carries an ID, priority, acceptance criteria, and dependencies. This is the single source of truth for the development backlog and QA.

---

## Module A — Registration & Account

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| A-01 | Mobile registration (India/NRI country codes) | P0 | Register with country code + phone; phone stored encrypted with lookup hash | — |
| A-02 | Firebase phone verification | P0 | Phone verified via Firebase Phone Authentication (Google/Firebase); verification token validated server-side; never echoed in API | A-01 |
| A-03 | Consent capture | P0 | Terms + privacy accepted; optional marketing opt-in as separate consent; timestamped | A-02 |
| A-04 | Account type selection | P0 | Self / son / daughter / brother/sister / relative/guardian | A-03 |
| A-05 | Login / logout / session refresh | P0 | Secure session; logout revokes; refresh short-lived | A-02 |
| A-06 | Underage rejection | P0 | DOB < 18 rejected at registration and profile creation | A-04 |
| A-07 | Duplicate account handling | P0 | Same verified phone cannot create second account; secure linking/notice | A-02 |
| A-08 | Auth abuse protection | P0 | Firebase handles rate-limit/lockout server-side; app enforces per-IP limits; admin unlock | A-02 |
| A-09 | Progressive profile completion score | P1 | Score increments as fields complete; informational only | — |
| A-10 | Account deletion request | P0 | User-initiated deletion workflow with retention control | — |
| A-11 | Email (optional) verification | P1 | Optional email capture + verify for recovery/notifications | A-05 |

---

## Module B — Profile & Biodata

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| B-01 | Create profile (unique public ID PAL######) | P0 | Unique public ID issued; gender/dob/height/marital status captured | A-04 |
| B-02 | Edit biodata | P0 | Edit basic, education, career, family, about-me; audit trail | B-01 |
| B-03 | Education & profession | P0 | Highest qualification, institution, occupation, industry, employer, income range (optional) | B-01 |
| B-04 | Family details | P0 | Parents' occupations, siblings, family background, family location | B-01 |
| B-05 | Partner preferences | P0 | Age/height range, education, profession, location, marital status, lifestyle | B-01 |
| B-06 | Community declaration | P0 | Pal self-identification mandatory; mod-reviewed; never used to infer caste/religion | B-01 |
| B-07 | Profile photo upload | P0 | Private storage; visible only per privacy; moderation `PENDING`; malware/type validation | B-01 |
| B-08 | Profile submit for review | P0 | Submit changes draft → pending review | B-02 |
| B-09 | Profile publish/unpublish | P0 | Published = discoverable; can hide from discovery | B-08 |
| B-10 | Profile completion percentage | P1 | Basic 20 / education-career 15 / family 15 / prefs 15 / about 10 / photo 10 / verified 15 | B-01 |
| B-11 | Biodata PDF (watermarked) | P1 | Downloadable after approval, watermarked with recipient ID; no permanent public URL | D-04 |

---

## Module C — Family Management

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| C-01 | Invite family manager | P0 | Owner invites by phone; invite token single-use + expiry | B-01 |
| C-02 | Accept manager invitation | P0 | Invitee registers/links and accepts | C-01 |
| C-03 | Grant permissions | P0 | Per-permission scope: view/edit biodata, manage prefs, send/respond interests, request biodata, approve contact exchange, manage visibility | C-02 |
| C-04 | Revoke permissions / manager | P0 | Owner can revoke any permission or remove manager; takes effect immediately | C-03 |
| C-05 | Manager access history | P0 | Log every manager action and permission change | C-03 |
| C-06 | Adult-owner authority | P0 | Managers never inherit authority to disclose owner's phone / private data / verification docs | C-03, E-XX |

---

## Module D — Privacy & Biodata Sharing

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| D-01 | Default visibility rules | P0 | Profile ID/age/city/education/profession visible to eligible members; photo restricted; phone/email/address/ID never public | B-08 |
| D-02 | Photo privacy | P0 | Blur/hide/approval-only; approval gates viewing | B-07 |
| D-03 | Request biodata | P0 | Recipient gets in-platform request; owner approves/rejects | B-08 |
| D-04 | Approve/revoke biodata share | P0 | Approval creates recipient-specific access; revoke kills future access; expiry supported | D-03 |
| D-05 | Watermark biodata export | P1 | Exported PDF carries recipient ID; no anonymous download | B-11 |
| D-06 | Consent records | P0 | Purpose, granted flag, timestamp, policy version stored for each consent | A-03 |
| D-07 | Honest limitation notice | P0 | UI states downloaded data cannot be recalled | D-05 |

---

## Module E — Verification

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| E-01 | Mobile verification badge | P0 | Badge only after successful Firebase phone verification; timestamped; distinct from ID verification | A-02 |
| E-02 | Selfie submission | P0 | Secure selfie upload; stored separately; retention-limited | B-07 |
| E-03 | Admin selfie review | P0 | Admin compares selfie to profile photo; approve/reject/expire/revoke | E-02 |
| E-04 | Optional identity check | P1 | Provider reference + outcome stored; no ID copy kept when avoidable; Aadhaar never mandatory | E-03 |
| E-05 | Verification status display | P0 | Badges: mobile / selfie / identity / education / profession / admin-reviewed; no fake "100% verified" | E-01..E-04 |
| E-06 | Verification revoke on expiry/invalid | P0 | Expire/revoke propagates to badge + access | E-03 |

---

## Module F — Discovery & Matching

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| F-01 | Search & filters | P0 | Gender, age range, city/state/country, height, marital status, education, profession, verified-only, photo-only | B-09 |
| F-02 | Match cards | P0 | ID, display name, age, height, city, education, profession, verification badges, photo-per-privacy, interest/shortlist buttons | F-01 |
| F-03 | Eligibility filtering | P0 | Only active + published + adult + not-blocked + not-hidden returned | F-01 |
| F-04 | Pagination | P0 | Never load full directory; page/limit enforced | F-01 |
| F-05 | Shortlist | P1 | Add/remove/view shortlisted profiles | F-02 |
| F-06 | Recommended matches | P1 | Preference-based suggestions | F-01, B-05 |
| F-07 | New profiles view | P1 | Recently published/verified | F-01 |

---

## Module G — Interests & Communication

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| G-01 | Send interest | P0 | Only verified senders; no duplicate active interest between pair | E-05, B-09 |
| G-02 | Receive/accept/decline | P0 | Recipient notified; accept → eligible conversation | G-01 |
| G-03 | Withdraw interest | P0 | Sender can withdraw; state recorded | G-01 |
| G-04 | In-app chat (after mutual interest) | P0 | Conversation only after accept; messages encrypted at rest; no contact leak | G-02 |
| G-05 | Rate limits on interests/messages | P0 | Per-user caps; anti-spam | G-01, G-04 |
| G-06 | Block | P0 | Blocked pair cannot interact; cannot reconnect via new account | G-01 |
| G-07 | Report | P0 | Report → admin queue; category + description | G-01, Admin |
| G-08 | Notifications (email) | P1 | Interest, biodata, contact-exchange, verification events | — |

---

## Module H — Contact Exchange (dual approval)

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| H-01 | Initiate contact-exchange request | P0 | Only eligible pair (active + verified + existing interaction) | G-02, E-05 |
| H-02 | Independent bilateral approval | P0 | Each side approves their own disclosure; details hidden until BOTH approve | H-01 |
| H-03 | Reject / withdraw | P0 | Either side can stop before disclosure; no partial disclosure | H-02 |
| H-04 | Disclose only approved fields | P0 | Owner selects which fields to share; only those revealed | H-02 |
| H-05 | Disclosure audit | P0 | Every disclosure logged (who, what, when, to whom) | H-04 |
| H-06 | Payment never overrides consent | P0 | Premium does not unlock phone/private data | H-02 |

---

## Module I — Administration & Governance

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| I-01 | Admin login + MFA | P0 | Separate admin app; MFA required | Auth |
| I-02 | Dashboard stats | P0 | Totals: profiles, pending verification, reports, new registrations | — |
| I-03 | Profile approval queue | P0 | Approve/reject/suspend; reason required | B-08 |
| I-04 | Verification queue | P0 | Review selfie/identity; approve/reject/revoke | E-03 |
| I-05 | Report resolution | P0 | Investigate → action (warn/suspend/block) logged | G-07 |
| I-06 | Suspend/block management | P0 | Apply + lift; audit | I-03 |
| I-07 | Contact-exchange & biodata audit view | P0 | Admin can review disclosure/access logs | H-05, D-04 |
| I-08 | Admin roles & permissions | P0 | RBAC: support, verification admin, moderator, super admin | I-01 |
| I-09 | Audit logs | P0 | Every sensitive admin action + data access logged | — |
| I-10 | Support tickets | P1 | Grievance handling flow | — |
| I-11 | Community category management | P1 | Manage sub-community options (self-declared) | B-06 |

---

## Module J — Billing & Monetization (Phase 2)

| ID | Feature | Priority | Acceptance criteria | Depends on |
| -- | ------- | -------- | -------------------- | ---------- |
| J-01 | Free registration + discovery evergreen | P0 | Never charge for registration, discovery, or verification | — |
| J-02 | Premium plans (3/6/12-month) | P2 | Advanced filters, more interests, chat limits, profile boost, assisted matchmaking | — |
| J-03 | Payments (Razorpay) | P2 | Subscriptions; no sale of biodata/identity | J-02 |

---

## Key invariants (must never be broken)

1. Phone / email / address / identity documents are never returned by discovery or match APIs.
2. Premium membership never overrides consent or unlocks private data.
3. Family managers never inherit authority over the adult owner's private disclosure.
4. Verification is never presented as government identity verification.
5. Frontend never enforces privacy alone — backend re-checks permission on every sensitive request.
6. Underage profiles are rejected; Aadhaar is never mandatory.

---

## MVP cut summary

- **P0 features:** all A-01..A-08, A-10; B-01..B-09; C-01..C-06; D-01..D-04, D-06, D-07; E-01..E-03, E-05, E-06; F-01..F-05; G-01..G-07; H-01..H-06; I-01..I-09 → **MVP launchable**.
- **P1 (short-term):** A-09, A-11, B-10, B-11, D-05, E-04, F-06, F-07, G-08, I-10, I-11.
- **P2 (post-launch):** Module J, native apps, AI matchmaking, horoscope, video, WhatsApp, multi-language, community events.
