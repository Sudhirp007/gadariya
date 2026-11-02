# Pal Matrimony — Security & Privacy Workflow

**Version:** 1.0 · **Derived from:** PRD v1.0 (§13, §22, §23) + DPDP Act/Rules 2025 considerations
**Core principle:** *Trusted Profiles. Respectful Connections. Private by Design.* Security and privacy are features, not afterthoughts. **The frontend is never trusted — the backend re-checks authorization on every sensitive request.**

---

## 1. Data classification

| Class | Data | Handling |
| ----- | ---- | -------- |
| **Public (to eligible members)** | Profile ID, age, city, education, profession, badges | Allowed after permission check |
| **Restricted** | Photo, full biodata, location detail | Approval-controlled; served only with server-side check |
| **Private** | Phone, email, full address | Never in APIs; shown only after dual consent |
| **Highly sensitive** | Identity docs, selfie originals, verification data | Separate storage; staff-restricted; retention-limited; never exposed to members |
| **Operational** | Sessions, audit logs, consents | Encrypted at rest; access-logged |

**Field-level encryption at rest:** phone numbers stored encrypted; a keyed lookup hash enables duplicate detection without exposing the number. Messages stored encrypted. DOB stored securely; age computed dynamically (full DOB never shown).

---

## 2. Authentication & session security

- **Login:** OTP-based (P0) + optional password (later). OTP is single-use, time-limited, never returned by any API.
- **OTP abuse controls:** rate-limit per phone and per IP; exponential backoff; lockout after N failures; challenge expiry; admin unlock with audit.
- **Sessions:** short-lived access + refresh; `HttpOnly` + `Secure` + `SameSite` cookies; user-agent/device binding; logout revokes; idle timeout.
- **Password hashing (when added):** Argon2id.
- **Admin:** separate admin app; **MFA mandatory**; session risk checks.

---

## 3. Verification workflow (levels are independent badges)

| Level | Flow | Security point |
| ----- | ---- | -------------- |
| Mobile | OTP validated → timestamped badge | Never presented as identity verification |
| Selfie | User submits selfie via secure upload → admin reviews against profile photo → approve/reject/expire | Selfie stored separately; original kept only per retention policy; never shown to members |
| Identity (optional) | Compliant provider → store reference + outcome; avoid storing ID copies | Aadhaar never mandatory; ID never exposed |
| Admin review | Manual profile review | Logged; reason required for reject/suspend |

Verification status is time-stamped and revocable; revocation propagates to badges and dependent access (e.g., send-interest eligibility).

---

## 4. Authorization model (RBAC + business rules)

Roles: `MEMBER` · `FAMILY_MANAGER` (scoped to a profile) · `SUPPORT` · `VERIFICATION_ADMIN` · `MODERATOR` · `SUPER_ADMIN`.

- Family managers hold **per-permission scopes** (view/edit biodata, manage prefs, interests, biodata requests, approve contact exchange, visibility). They **never** inherit authority over the owner's private disclosure or verification docs.
- Every sensitive endpoint runs a **server-side permission check**; a 403 is returned on denial. Contact-details endpoint independently verifies **both** parties' approval before returning anything.

### Contact-exchange authorization state machine

```
INITIATED ──► A_APPROVED ──► BOTH_APPROVED ──► DISCLOSED
   │               │                │
   └───────────────┴────────────────┴──► REJECTED / WITHDRAWN
```
- Disclosure occurs **only** in `BOTH_APPROVED` / `DISCLOSED`.
- Either side can withdraw before disclosure (no partial disclosure).
- Owner selects the exact fields to disclose.

---

## 5. Privacy-by-default defaults

| Data | Default |
| ---- | ------- |
| Profile ID / age / city / education / profession | Visible to eligible members |
| Photo | Restricted / approval-controlled |
| Full biodata | Approval-controlled |
| Mobile / email | Hidden |
| Full address | Never public |
| Identity documents | Never public |

---

## 6. File & storage security

- Images/documents in **private object storage** (S3-compatible); never in the DB.
- **Short-lived signed URLs** with expiry; no anonymous or permanent public URLs.
- Upload validation: MIME/type allow-list, size caps, malware scanning for documents.
- Watermarked biodata PDFs (recipient ID embedded). UI states downloaded data cannot be recalled.

---

## 7. Application security controls

- HTTPS everywhere (HSTS); TLS in transit; encryption at rest.
- Server-side validation of all input; parameterized queries (Prisma); CSRF protection; rate limiting on auth/search/interests/messages.
- No sensitive data in logs; structured logging; secrets in a vault/env, never committed.
- Backend-only authorization for photos, biodata, contact details (frontend never trusted).
- Dependency scanning + SAST in CI; manual security review before launch.

---

## 8. Audit & logging

Logged events (append-only, tamper-evident where practical):
- Authentication events (login, OTP, lockout, logout, session revoke).
- Every consent grant/withdrawal (purpose, timestamp, policy version).
- Every biodata share approve/revoke/expiry.
- Every contact-exchange disclosure (who, what, to whom, when).
- Verification approve/reject/revoke + admin actions (approve/suspend/block).
- Any admin access to sensitive data (with reason).
- Data correction/deletion requests.

Retention: adhere to DPDP retention limits; implement soft-delete → retention-controlled permanent deletion.

---

## 9. Incident response & breach handling (India DPDP)

1. **Detect** via Sentry + audit-log alerts + monitoring.
2. **Contain** — revoke sessions/tokens, isolate affected storage, disable affected accounts.
3. **Assess** — determine data class and scope of exposure.
4. **Notify** — per DPDP obligations: notify Data Protection Board and affected users as required by the rules in force at the time.
5. **Remediate** — patch, improve controls, update runbook.
6. **Document & review** — post-incident report; update this document.
Pre-agree a response runbook and a legal point of contact before launch.

---

## 10. DPDP (India) compliance map

| DPDP requirement | Implementation |
| ---------------- | -------------- |
| Notice | Clear privacy notice: what's collected, why, purposes |
| Consent | Separate, informed consent per purpose; optional marketing separate; timestamped with policy version |
| Purpose limitation | Collect only necessary data; no sale of biodata/identity |
| Consent withdrawal | Easy withdrawal from account settings; effects honored |
| Access / correction | User can view and correct stored data |
| Erasure | Account-deletion request + retention policy; soft→permanent delete |
| Data breach | Incident response + notification process |
| Third-party processors | Documented processor agreements (SMS, verification, hosting, email) |
| Grievance | Transparent support/grievance channel; accountability |
| Overseas transfers | Assess applicable jurisdictions when serving NRI members |

**Pre-launch legal review required** of: privacy notice, terms, consent flows, retention/deletion, family-manager authority, verification procedures, grievance handling, overseas processing/transfers.

---

## 11. MVP security acceptance checklist

- [ ] HTTPS + HSTS live; TLS in transit; encryption at rest.
- [ ] Phone numbers encrypted; no phone in any discovery/response payload.
- [ ] OTP rate-limited + expiring; never echoed.
- [ ] Underage rejected; Aadhaar not mandatory.
- [ ] Sensitive endpoints all server-side authorized (no frontend-only checks).
- [ ] Photos/biodata/contact gated; dual-approval enforced; payment never overrides.
- [ ] Admin MFA enforced; admin actions audited.
- [ ] Audit trail present for consents, disclosures, verification, admin access.
- [ ] Backups tested (restore drill).
- [ ] SAST/dependency scan clean; manual review done.
- [ ] Incident-response runbook + legal contact defined.
- [ ] Privacy notice, terms, grievance process published.

---

*Security & privacy workflow v1.0 — align with legal counsel before launch.*
