> [!WARNING]
> **This repository has moved to [github.com/iTechSmartINC/Texan](https://github.com/iTechSmartINC/Texan)** as part of the iTechSmart Inc rebrand.
> Please update your links and git remotes. This copy is kept as a redirect and is no longer updated.

# NextUS CSM — Multi-Tenant Case Management for Injury Law Firms

NextUS CSM replaces the **TCS Nexus OMS spreadsheet** (multi-tab Excel workbook) with a
secure, multi-tenant web application. Each law firm you serve is an isolated **tenant**;
your operations team manages every firm from one command center while each firm signs
into its own portal and sees only its own data.

Built with Next.js 14 (App Router), TypeScript, and Prisma. Styled with the iTechSmart
purple-neon theme, with full **light and dark modes**.

The web portal is branded **United Legal Support Services**. The root URL routes straight
to the secure sign-in page (the former public marketing website has been removed).

## What it replaces

| Spreadsheet tab | In the app |
|---|---|
| Source Data (92 columns) | Cases + document checklist + treatment entries (relational data) |
| Executive Portal / Metrics Dashboard | `/app/dashboard` — live company-wide KPIs, pipeline, SOL risk |
| Client Portal | `/app/firms` → per-firm portal (and what tenant users see when they log in) |
| Employee Portal | `/app/team` — case manager workload, capacity, QC scorecard |
| Intake / Investigation / Insurance / Medical / Liens / Demand trackers | `/app/trackers/*` grid views |
| SOL & Critical Alerts | `/app/trackers/sol` + `/app/alerts` |
| Currently Treating | `/app/treatment` |
| Report Builder / Printable Client Report | `/app/reports` + CSV export |
| Alerts & Automation | `/app/alerts` — rules run live on every page load |
| Settings dropdown lists | `src/lib/constants.ts` (stages, statuses, checklist template, SOL by state) |

All spreadsheet formulas (completion %, file health, SLA/SOL status, ready-for-demand,
missing critical items) are computed in `src/lib/metrics.ts` — one tested source of truth.

## Quick start

```bash
npm install
npm run setup     # copies .env.example → .env, creates the SQLite db, seeds demo data
npm run dev       # http://localhost:3000
```

Demo logins (password `Demo123!`):

| Account | Role | Sees |
|---|---|---|
| `admin@nextus.demo` | Super Admin | Everything + tenant onboarding, users, audit, import |
| `exec@nextus.demo` | Executive | Company-wide dashboards, reports, billing, audit |
| `richelle@nextus.demo` | Case Manager | All firms' case work (platform staff) |
| `accounting@nextus.demo` | Accounting | Billing + reports |
| `admin@carlson-law-firm.demo` | Firm Admin | Carlson Law Firm's portal only (tenant isolation) |

## Key features

- **Tenant onboarding** — create a firm in Admin → Tenants; it's isolated instantly and can
  be handed a firm-admin login. Suspend/reactivate at any time.
- **Role-based access** — Super Admin, Executive, Firm Admin, Attorney, Case Manager,
  Staff, Accounting, Client Viewer. Enforced server-side in `src/lib/rbac.ts`.
- **Tenant isolation** — every case query flows through `tenantScope()`; tenant users are
  pinned to their own firm no matter what they request.
- **HIPAA guardrails** — audit trail on every action, 30-minute idle session timeout,
  security headers, minimum-necessary role views. See `HIPAA.md` for the full posture
  and production checklist.
- **Case workspace** — overview, 40-item document checklist (Yes/No/Pending/N-A with
  critical flags), treatment entries, notes, and per-file audit activity.
- **Automation** — SLA status, SOL countdown by state, stale-contact detection,
  red/yellow/green health, ready-for-demand, and a live alert queue with owners.
- **Spreadsheet import** — upload the original workbook at `/app/import`; firms become
  tenants and cases (incl. checklist values) are created or updated idempotently.
- **Data connectors** — ingest cases from Clio, CASEpeer, Litify, Filevine, MyCase,
  Smokeball, PracticePanther, Lawmatics, Neos, and SmartAdvocate via API sync, plus a
  universal per-firm webhook (Zapier/Make ready). See `docs/CONNECTORS.md`.
- **Reports** — filter by firm/manager/month, export CSV; per-firm billing summaries.

## Documentation

| Document | Purpose |
|---|---|
| `docs/USER_MANUAL.md` | Full instruction manual — every screen, role, and metric |
| `docs/SETUP_GUIDE.md` | Installation, configuration, production deployment |
| `docs/TENANT_ONBOARDING.md` | 5-minute quick guide to onboard a new law firm |
| `docs/WALKTHROUGH.md` | Hands-on guided tour with the demo data |
| `docs/CONNECTORS.md` | Data connectors: Clio, CASEpeer, Litify, webhooks |
| `docs/CLIENT_HANDOFF_MANUAL.md` | Client handoff manual: Vercel deploy, Squarespace DNS, platform instructions |
| `HIPAA.md` | Security posture and go-live compliance checklist |

## Production notes

- Set `DATABASE_URL` to a managed PostgreSQL connection string (on Vercel: attach a
  Postgres database via Storage). The build switches the Prisma provider and creates
  the tables automatically; without one the app runs a self-seeding, non-persistent
  demo database.
- Set a strong `AUTH_SECRET` (`openssl rand -base64 48`).
- Serve over HTTPS only; see `HIPAA.md` before handling real PHI.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | .env + db push + seed (first run) |
| `npm run seed` | Re-seed demo data (destructive) |
| `npm run db:studio` | Prisma Studio data browser |
