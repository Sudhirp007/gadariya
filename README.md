# gadariya

# Pal Matrimony (पाल वैवाहिक मंच)

> **Trusted Profiles. Respectful Connections. Private by Design.**  
> Dedicated community matrimonial platform for the Pal (Gadaria) community.

---

## 1. Architectural Highlights & Invariants

- **Zero Contact Leakage:** Mobile numbers, emails, and residential addresses are never exposed in public discovery, search APIs, or match cards.
- **Dual-Approval Contact Exchange:** Contact information is revealed dynamically **only** after both parties explicitly approve a bilateral exchange request (`BOTH_APPROVED`).
- **Cryptographic Blind Indexing:** Phone numbers are encrypted at rest using **AES-256-GCM** and indexed via **HMAC-SHA256** with an application pepper for duplicate prevention without storing raw plaintext phone numbers.
- **Underage Protection:** Strict database-level constraint rejecting registrations under 18 years (`dob <= CURRENT_DATE - INTERVAL '18 years'`).
- **Watermarked Biodata Exports:** Exported biodata PDFs dynamically embed the requesting party's unique ID (`PAL######`) and timestamp to prevent anonymous forwarding.
- **Inception Labs Mercury AI Guard:** Real-time pre-moderation screening free-text fields (About Me, Family Background) to prevent accidental or intentional contact leaks.

---

## 2. Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui + Radix UI
- **Database & Auth:** Supabase (PostgreSQL with Row Level Security + Supabase Auth)
- **Object Storage:** Supabase Storage (Private buckets with signed short-lived URLs)
- **Deployment:** Vercel (Edge network, HTTPS)
- **AI Pre-moderation:** Inception Labs Mercury (`platform.inceptionlabs.ai`)

---

## 3. Project Structure

```text
├── docs/                             # Architecture, PRD, and Agent Sign-off logs
│   ├── AGENT_COMMUNICATION_CHAIN.md  # Living log between Technical Lead & PM
│   ├── FEATURE_DATABASE.md           # P0/P1/P2 feature backlog
│   ├── HANDOFF_DESIGNER_BUILDER.md   # Designer ↔ Builder protocol spec
│   ├── ROADMAP.md                    # Sprint plan and pre-dev deliverables
│   └── SECURITY_WORKFLOW.md          # DPDP Act 2025 security controls
├── src/
│   ├── app/                          # Next.js 15 App Router pages & layouts
│   ├── lib/
│   │   ├── ai/                       # Inception Labs Mercury AI pre-moderation
│   │   ├── crypto/                   # AES-256-GCM & HMAC-SHA256 privacy engine
│   │   └── supabase/                 # Client & server SSR helpers
├── supabase/
│   └── migrations/                   # Full PostgreSQL schema with RLS & triggers
├── .env.example                      # Environment variables reference
└── package.json
```

---

## 4. Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm or pnpm

### Local Development

1. **Clone repository:**
   ```bash
   git clone https://github.com/Sudhirp007/gadariya.git
   cd gadariya
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Populate SUPABASE_URL, ENCRYPTION_MASTER_KEY, PHONE_PEPPER_KEY, MERCURY_API_KEY
   ```

4. **Run unit tests:**
   ```bash
   npm run test:crypto
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 5. Security & DPDP Compliance

This platform adheres to India's **Digital Personal Data Protection (DPDP) Act 2025**:
- Explicit, purposeful consent recorded with timestamp and policy version.
- Right to erasure and retention-controlled soft delete.
- Server-side verification on all endpoints (frontend is never trusted).
