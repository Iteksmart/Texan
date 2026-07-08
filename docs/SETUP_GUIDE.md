# NextUS CSM — Setup & Deployment Guide

**Version 1.0 · iTechSmart**

This guide takes you from a clean machine to a running NextUS CSM instance —
first as a local evaluation, then as a production deployment suitable for PHI.

---

## Table of Contents

1. [Requirements](#1-requirements)
2. [Local Evaluation Setup (10 minutes)](#2-local-evaluation-setup-10-minutes)
3. [Configuration Reference](#3-configuration-reference)
4. [Production Deployment](#4-production-deployment)
5. [Going Live Checklist (HIPAA)](#5-going-live-checklist-hipaa)
6. [Migrating From the Spreadsheet](#6-migrating-from-the-spreadsheet)
7. [Operations & Maintenance](#7-operations--maintenance)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Requirements

| Component | Minimum | Notes |
|---|---|---|
| Node.js | 18.17+ (20/22 LTS recommended) | `node --version` |
| npm | 9+ | ships with Node |
| Database | SQLite (bundled) for evaluation; **PostgreSQL 14+ for production** | |
| OS | macOS, Linux, or Windows (WSL recommended) | |
| Browser | Any modern evergreen browser | |

No other services are required — auth, sessions, and the metrics engine are built in.

## 2. Local Evaluation Setup (10 minutes)

```bash
# 1. Get the code
git clone <your-repo-url> nextus-csm && cd nextus-csm

# 2. Install dependencies (also downloads the Prisma database engines)
npm install

# 3. One-command bootstrap: creates .env, the SQLite database, and demo data
npm run setup

# 4. Run it
npm run dev
# → http://localhost:3000
```

Sign in with the demo accounts (password `Demo123!`):

| Email | Role |
|---|---|
| `admin@nextus.demo` | Super Admin (platform) |
| `exec@nextus.demo` | Executive |
| `richelle@nextus.demo` | Case Manager |
| `accounting@nextus.demo` | Accounting |
| `admin@carlson-law-firm.demo` | Firm Admin (sees Carlson only) |

The seed loads the 5 firms and 50 sample cases from the original TCS Nexus
workbook. Re-run `npm run seed` at any time to reset the demo data
(**destructive** — wipes all data).

## 3. Configuration Reference

All configuration lives in `.env` (never commit it; `.env.example` is the template):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Prisma connection string. Production: `postgresql://user:pass@host:5432/nextus?sslmode=require` |
| `AUTH_SECRET` | dev placeholder | Signs session tokens. **Must be changed** — generate with `openssl rand -base64 48` |
| `SESSION_IDLE_MINUTES` | `30` | HIPAA idle timeout. Keep ≤ 30 for PHI environments |

Business constants (stages, statuses, the 40-item checklist template, critical
flags, SOL years per state, provider types, capacity threshold) are versioned in
`src/lib/constants.ts` — edit and redeploy to change them platform-wide.

## 4. Production Deployment

### 4.1 Switch to PostgreSQL

1. Edit `prisma/schema.prisma`: `provider = "postgresql"` (the schema is already
   Postgres-compatible — no other changes).
2. Set `DATABASE_URL` to your Postgres instance (require SSL).
3. Apply the schema: `npx prisma db push` (or adopt `prisma migrate` for
   change-controlled migrations).
4. **Do not run the demo seed in production.** Create the first admin instead:

```bash
node --env-file=.env -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const db = new PrismaClient();
  await db.user.create({ data: {
    email: 'you@yourcompany.com',
    name: 'Your Name',
    role: 'SUPER_ADMIN',
    passwordHash: await bcrypt.hash('CHANGE-THIS-PASSWORD', 12),
  }});
  console.log('admin created'); await db.\$disconnect();
})()"
```

### 4.2 Build & run

```bash
npm run build       # prisma generate + next build
npm start           # serves on PORT (default 3000)
```

Run under a process manager (systemd, PM2, or a container). Example Dockerfile
outline: `node:22-slim` → `npm ci` → `npm run build` → `CMD npm start`.

### 4.3 In front of the app

- Terminate **TLS** at your load balancer / reverse proxy (nginx, Caddy, ALB);
  redirect all HTTP → HTTPS. The app already sends HSTS and hardening headers.
- Optionally place your SSO/IdP or an MFA gateway in front (recommended before
  real PHI — see the checklist).

### 4.4 Hosting notes

- **A server or container platform** (Render, Fly.io, ECS, a VM) with managed
  Postgres is the recommended shape. Vercel also works (use Vercel Postgres/Neon);
  confirm your plan's ability to sign a BAA before putting PHI on it.
- The app is stateless — scale horizontally; sessions live in signed cookies.

## 5. Going Live Checklist (HIPAA)

Complete **every** item before real client data enters the system.
Full detail: `HIPAA.md`.

- [ ] PostgreSQL with encryption at rest; TLS-only connections
- [ ] HTTPS everywhere; HTTP redirected
- [ ] Strong `AUTH_SECRET` set; `.env` excluded from source control
- [ ] `SESSION_IDLE_MINUTES` ≤ 30
- [ ] MFA or SSO in front of the app
- [ ] BAAs signed with hosting, database, and any email/storage vendors
- [ ] Automated encrypted backups + a tested restore
- [ ] Audit-log archival job to immutable storage (6-year retention)
- [ ] Demo seed data absent; real admin account created; password policy set
- [ ] Off-boarding procedure: deactivate users same-day (Admin → Users)
- [ ] Documented security risk assessment covering app + infrastructure

## 6. Migrating From the Spreadsheet

Sign in as a Super Admin → **Administration → Spreadsheet Import** → upload the
TCS Nexus OMS `.xlsx`.

| Workbook | Becomes |
|---|---|
| `Client` column (firm names) | Tenants — unknown firms are auto-created in ONBOARDING status |
| `Case ID` | Case number (unique per firm) |
| Stage / Status / Priority / dates / QC / revenue / settlement | Case fields |
| The ~40 Yes/No tracker columns | Document checklist values |
| `Case Manager` | Matched to platform case-manager accounts by first name — create those users **before** importing |

Behavior and safety:

- **Idempotent:** re-importing the same file updates existing cases (matched by
  firm + case number) instead of duplicating them.
- Rows without a Case ID or firm are skipped and counted in the result message.
- Every import is written to the audit trail with row counts.
- Recommended order: (1) create case-manager users, (2) import, (3) review
  Admin → Tenants and activate each firm, (4) spot-check 2–3 cases against the
  workbook, (5) retire the spreadsheet.

## 7. Operations & Maintenance

| Task | How |
|---|---|
| Inspect data directly | `npm run db:studio` (Prisma Studio) — restrict to admins |
| Reset demo environment | `npm run seed` (destructive) |
| Change business rules | Edit `src/lib/constants.ts` / `src/lib/metrics.ts`, redeploy |
| Update dependencies | `npm update`, then `npm run build` and smoke-test |
| Backups | Database-level (pg_dump / managed snapshots); the app itself is stateless |

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `PrismaClientInitializationError` on start | `DATABASE_URL` wrong or DB unreachable; for SQLite run `npx prisma db push` once |
| Login always bounces back | `AUTH_SECRET` changed after users signed in (old cookies invalid — sign in again), or cookies blocked; over plain HTTP in production the secure cookie is refused — use HTTPS |
| Signed out too often | Raise `SESSION_IDLE_MINUTES` (mind HIPAA) |
| Corporate proxy blocks Prisma engine download during `npm install` | Set `NODE_EXTRA_CA_CERTS` to your proxy CA, or pre-download engines into `node_modules/@prisma/engines` (see Prisma docs on `PRISMA_QUERY_ENGINE_LIBRARY`) |
| Import says rows skipped | Those rows lacked a `Case ID` or `Client` value in the workbook |
| Google Fonts blocked (air-gapped) | The UI falls back to system fonts automatically; optionally self-host the fonts |
