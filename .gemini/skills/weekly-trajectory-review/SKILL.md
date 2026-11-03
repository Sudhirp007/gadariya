---
name: weekly-trajectory-review
description: Executes the weekly trajectory review engine for Pal Matrimony (gadariya.org), querying live production telemetry, comparing against PROJECT_INTENT.md OKRs, and presenting an executive scorecard with proposed next-sprint actions.
---

# Weekly Trajectory Review Skill — Pal Matrimony (`gadariya.org`)

## Purpose
This skill establishes an automated, intent-driven audit cycle for **Pal Matrimony (`gadariya.org`)**. It ensures ongoing development remains strictly aligned with the canonical policies, privacy invariants, infrastructure thresholds, and measurable outcomes defined in `PROJECT_INTENT.md`, preventing autonomous agent drift.

## Workflow

### 1. Execute the Telemetry Review Engine
Run the review engine from the project root:
```powershell
python scripts/weekly_review_engine.py
```

The review engine automatically:
1. Probes production edge routing (`gadariya.org` and `gadariya-livid.vercel.app`).
2. Runs live health checks on critical endpoints (`/`, `/api/auth/me`, `/api/discovery`, `/discovery`, `/login`, `/admin/login`, and `/api/profile`).
3. Evaluates anonymous data access guards (asserting `401 Unauthorized` on unauthenticated calls to `/api/profile`).
4. Checks `.secrets/google-sa.json` for Google Search Console and Google Analytics 4 service credentials.
5. Evaluates live telemetry against the active sprint OKRs in `PROJECT_INTENT.md`.
6. Generates a timestamped markdown audit report in `reports/weekly/YYYY-Wxx-trajectory-review.md`.
7. Outputs a concise JSON summary to stdout.

### 2. Evaluate the Generated Report
Read the generated report in `reports/weekly/`:
* Inspect the **Executive Telemetry Scorecard** for latency regressions or endpoint failures.
* Check the status of each active sprint KR (`ACHIEVED`, `IN_PROGRESS`, or `ATTENTION_REQUIRED`).
* Review the **Architecture Inflection Signals** (Photo storage count vs 500 cap, chat polling rate vs 75k invocation cap, Supabase pool health).
* Verify that real user `Sudhir` (`PAL100070`) and published community profiles remain preserved.

### 3. Present the Weekly Scorecard to Developer
Present a concise, structured review to the developer including:
* **ISO Week & Date Range**
* **Active Production Edge & Health Summary** (7/7 endpoints passing, latency benchmarks)
* **Active Sprint OKR Status** (Achieved vs In Progress)
* **Inflection Trigger Audit** (Storage footprint, connection pool status)
* **3–4 Strategic Directives for the Next Sprint**

### 4. Non-Negotiable Operational Rules
- **ZERO AUTONOMOUS PRODUCTION PUSHES:** Unless explicitly commanded by the developer, never run `git push origin main`.
- **LOCAL-FIRST VETTING:** All modifications must be made locally, vetted with `npm test` and `npm run test:e2e`, and reviewed by the developer.
- **DEVELOPER CONFIRMATION MANDATE:** Do NOT autonomously update `PROJECT_INTENT.md` or change phase milestones without explicit developer sign-off.
