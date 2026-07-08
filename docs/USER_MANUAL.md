# NextUS CSM — Instruction Manual

**Version 1.0 · iTechSmart**

NextUS CSM is a multi-tenant case & client management platform for personal-injury
law firm operations. This manual covers every screen, every role, and every
calculated metric in the system.

---

## Table of Contents

1. [Concepts & Terminology](#1-concepts--terminology)
2. [Signing In & Sessions](#2-signing-in--sessions)
3. [Roles & Permissions](#3-roles--permissions)
4. [The Dashboard](#4-the-dashboard)
5. [Working Cases](#5-working-cases)
6. [The Document Checklist](#6-the-document-checklist)
7. [Trackers](#7-trackers)
8. [Currently Treating](#8-currently-treating)
9. [Alerts & Automation](#9-alerts--automation)
10. [Team Workload](#10-team-workload)
11. [Firm Portals](#11-firm-portals)
12. [Report Builder & Exports](#12-report-builder--exports)
13. [Billing](#13-billing)
14. [Administration](#14-administration)
15. [Calculated Metrics Reference](#15-calculated-metrics-reference)
16. [Theme & Accessibility](#16-theme--accessibility)

---

## 1. Concepts & Terminology

| Term | Meaning |
|---|---|
| **Tenant / Firm** | A law firm client of your operation. All of a firm's data is isolated from every other firm. |
| **Platform user** | A member of *your* staff (case managers, executives, admins). Platform users work across all firms. |
| **Firm user** | An employee of one law firm (attorney, firm admin, accounting). Firm users see only their own firm's data — always. |
| **Case** | One injured client's file (e.g. `TCS-1001`), owned by exactly one tenant. |
| **Checklist** | The 40 document/task items per case, grouped into six categories (Intake, Investigation, Insurance, Medical, Liens/Subro, Demand). |
| **1P / 3P** | First-party / third-party insurance carrier. |
| **SOL** | Statute of limitations — the filing deadline for the claim. |
| **SLA** | Service-level agreement — the internal due date for the next action on a file. |
| **PHI** | Protected health information. Treat every case screen as containing PHI. |

## 2. Signing In & Sessions

1. Browse to the application URL and click **Sign in** (or go to `/login`).
2. Enter your email and password. Failed attempts are recorded in the audit trail.
3. **Idle timeout:** for HIPAA safety your session expires after 30 minutes of
   inactivity (configurable). Activity extends it automatically. When it expires
   you are returned to the login page — unsaved form fields are lost, so save often.
4. **Sign out** from the top-right button when leaving your desk. Never share accounts;
   the audit trail identifies actions by *your* login.

## 3. Roles & Permissions

| Role | Scope | Can do |
|---|---|---|
| **Super Admin** | Platform | Everything: tenants, users, audit, import, all case work |
| **Executive** | Platform | Dashboards, reports, billing, audit (read); cases read-only |
| **Case Manager** | Platform | Full case work on all firms' files |
| **Firm Admin** | One firm | Manage their firm's users; full case work on their firm's files; firm audit |
| **Attorney** | One firm | Full case work on their firm's files |
| **Staff** | One firm | Case work (checklists, treatment, notes) on their firm's files |
| **Accounting** | Platform or firm | Billing and reports; cases read-only |
| **Client Viewer** | One firm | Read-only portal (dashboards, cases, reports) |

Notes:
- Any signed-in user may add **notes** to a case in their scope.
- Permissions are enforced on the server. Hiding a menu item is cosmetic; the
  underlying action is refused even if requested directly.

## 4. The Dashboard

What you see depends on who you are:

- **Platform users** get the **Executive Portal** — company-wide numbers across
  all firms, plus a **Firm Performance** table with per-firm drill-down links.
- **Firm users** get the same layout scoped to their firm only.

Sections:

| Section | What it tells you |
|---|---|
| **Stat tiles** | Active cases, Red/Yellow/Green counts, overdue SLAs, average QC, revenue forecast, average file completion, ready-for-demand count, SOL < 90 days, missing critical items |
| **Case Pipeline** | Active cases by stage (Intake → Disbursement) |
| **Status Distribution** | Cases by working status (New, In Progress, Waiting on…) |
| **SOL Risk** | Files by statute window: Expired, 0–30, 31–60, 61–90 days, Missing SOL |
| **Completion by Category** | Average checklist completion for each of the six categories |
| **Files Needing Attention** | The ten worst-health files, ranked. Start your day here. |

## 5. Working Cases

### Finding cases
**Case Work → All Cases.** Filter by search text (case # or client name), firm
(platform users), manager, stage, status, priority, and health. Click any case
number anywhere in the app to open the file.

### Creating a case
**All Cases → + New Case.**
- **Firm** (platform users choose; firm users' cases are created in their own firm).
- **Case #** is auto-assigned if left blank.
- **Date of incident + State** → the SOL date is auto-suggested from the state's
  personal-injury statute (editable — always confirm with the attorney).
- The full 40-item document checklist is created automatically.

### The case file
Each case opens with a header (health, SLA, SOL, client-contact badges and a
**Ready for Demand** badge when earned), six stat tiles, and five tabs:

| Tab | Contents |
|---|---|
| **Overview** | All core fields (stage, status, priority, dates, QC score, revenue forecast, settlement, lien status…). Click **Save changes** after editing. **Log client contact today** stamps the last-contact date in one click. |
| **Checklist** | The six document categories — see §6 |
| **Treatment** | Provider entries — see §8 |
| **Notes** | Time-stamped, author-attributed case notes |
| **Activity** | The HIPAA audit trail for this file (admin/exec/firm-admin only) |

Every edit updates the file's **Last Activity** date, which feeds the
no-activity alert.

## 6. The Document Checklist

Each item holds one of four values:

| Value | Meaning | Counts toward completion? |
|---|---|---|
| **Yes** | Received / done | ✔ Complete |
| **No** | Not yet requested or received | ✘ Missing |
| **Pending** | Requested, awaiting response | ✘ Missing (still outstanding) |
| **N/A** | Doesn't apply to this case | Excluded from the math |

Items flagged **critical** (police report, LORs, dec pages, ER record/bill,
demand receipts, subro letter, lien ledger…) drive the **Missing Critical
Items** counters and health/alerting. Changing a value saves instantly and is
recorded in the audit trail.

**Category completion %** = Yes ÷ (Total − N/A). **Overall %** = same formula
across all categories combined.

## 7. Trackers

The trackers replicate the spreadsheet's tabs as live grids across every active
case in your scope — one row per case, one column per checklist item:

- **Intake Tracker** — onboarding items + client-contact status
- **Investigation** — police report, witnesses, media, searches
- **Insurance** — 1P/3P LORs, acknowledgments, dec pages
- **Medical Records** — EMS/urgent care/ER records & bills
- **Liens / Subro** — subro letter, acknowledgment, lien ledger
- **Demand** — demand sent, 1P/3P receipt confirmations, Medpay/PIP
- **SOL & Critical** — incident date, SOL date & countdown, critical-missing
  counts, stale-contact flags, sorted most-urgent first

Trackers are read-only views for scanning; click a case number to jump into its
checklist and make changes.

## 8. Currently Treating

**Case Work → Currently Treating** shows every treatment entry across active files:
provider, type, date of service, whether the **bill** and **record** for that DOS
are in, next appointment, attendance, MRI, surgery consult, and a Done-Treating flag.

Tiles at the top: total entries, bills missing, records missing, appointments in
the next 7 days, done-treating count.

Add or edit entries from the case's **Treatment** tab. A case's treatment gaps
(missing bills/records) surface automatically in Alerts.

## 9. Alerts & Automation

**Overview → Alerts & Automation** runs these rules live on every active case:

| Alert | Trigger | Severity | Owner |
|---|---|---|---|
| Overdue SLA | Next-due date has passed | Critical | Operations |
| Red File Health | Health computed Red | High | QC Lead |
| No Activity > 10 Days | No edits/notes in 10+ days | High | Case Manager |
| SOL Expired / < 30 Days | Statute window | Critical | Attorney |
| SOL < 90 Days | Statute window | High | Attorney |
| Missing SOL Date | No SOL on file | Critical | Case Manager |
| Stale / No Client Contact | Last contact > 14 days, or never | High | Case Manager |
| Missing Critical Items | Any critical checklist item not Yes/N-A | High (Critical at 5+) | Case Manager |
| Treatment Bills/Records Missing | Any outstanding DOS documents | Monitor | Case Manager |

There is nothing to configure or run — the list is always current.

## 10. Team Workload

**Overview → Team Workload** (platform users) is the case-manager scorecard:
active files, **capacity %** (against 25 files per manager — highlighted red
when over), red files, overdue SLAs, critical-priority count, ready-for-demand,
average QC, average completion, and revenue. Click a manager to open their queue.

## 11. Firm Portals

- **Platform users:** **Overview → Firm Portals** lists every firm with headline
  metrics; click through for that firm's full portal (exactly what the firm's own
  users see).
- **Firm users:** your dashboard *is* your portal. You cannot see, search, or
  reach any other firm's data.

## 12. Report Builder & Exports

**Business → Report Builder.** Filter by firm, case manager, and month, then:

- Read the summary tiles (cases, red files, ready-for-demand, completion, QC,
  revenue forecast, settlements).
- Review **Monthly Case Flow** (opened vs closed).
- **Download CSV** — the full case list with every computed metric (one row per
  case), suitable for Excel, client reporting, or BI tools. Exports are recorded
  in the audit trail.

## 13. Billing

**Business → Billing** (Accounting, Executive, Super Admin, Firm Admin):
per-firm **monthly service fee** (active cases × the firm's per-case rate,
configurable in Admin → Tenants), revenue forecast, and settlements in the
pipeline. Use the CSV report for invoice backup detail.

## 14. Administration

### Tenants / Onboarding (Super Admin)
Create, activate, and suspend firms. See the **Tenant Onboarding Quick Guide**
(`docs/TENANT_ONBOARDING.md`) for the 5-minute procedure.

### Users & Roles (Super Admin, Firm Admin)
Create users with a role and scope; deactivate immediately when someone leaves
(deactivation blocks login instantly but preserves history). Firm admins manage
only their own firm's users and cannot create platform roles.

### Audit Trail (Super Admin, Executive, Firm Admin)
Every login (including failures), export, and data change with user, timestamp,
IP, and details. Filter by text or action type. Firm admins see only their
firm's entries.

### Spreadsheet Import (Super Admin)
Upload the original TCS Nexus OMS workbook — see the Setup Guide §6 for the
column mapping and re-import behavior.

## 15. Calculated Metrics Reference

| Metric | Rule |
|---|---|
| **Category %** | Yes ÷ (items − N/A) |
| **Overall %** | Yes ÷ (all items − N/A) across all six categories |
| **SLA status** | Overdue = next-due in the past · At Risk = due within 2 days · On Track otherwise · No Due Date if empty |
| **SOL window** | From days remaining: Expired · 0–30 · 31–60 · 61–90 · Clear · Missing SOL if no date |
| **Client contact** | OK ≤ 14 days · Stale > 14 days · Missing if never logged |
| **File health — Red** | Overdue SLA, or SOL expired/<30 days, or no contact ever, or ≥ 5 critical missing, or no activity > 10 days |
| **File health — Yellow** | SLA at risk, or SOL 31–60 days, or stale contact, or any critical missing, or QC < 85 |
| **File health — Green** | None of the above |
| **Ready for Demand** | Medical 100% **and** Insurance 100% **and** no critical Demand items missing **and** Overall ≥ 85% |
| **Capacity %** | Manager's active files ÷ 25 |
| **Monthly service fee** | Firm's active cases × per-case rate |

## 16. Theme & Accessibility

- The **☾ / ☀ toggle** (top-right, and on the website) switches dark/light mode;
  your choice is remembered per browser and otherwise follows your system setting.
- Status is never conveyed by color alone — every badge carries text; every chart
  bar carries its value.
- All tables scroll horizontally on narrow screens without breaking the page.

---

*For installation see `docs/SETUP_GUIDE.md`. For a hands-on tour see
`docs/WALKTHROUGH.md`. For compliance posture see `HIPAA.md`.*
