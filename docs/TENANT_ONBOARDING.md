# NextUS CSM — Tenant Onboarding Quick Guide

**Bring a new law firm onto the platform in about 5 minutes.**
You need a **Super Admin** login.

---

## Before you start (2-minute prep)

Collect from the firm:

- Firm name (exactly as it should appear on reports)
- Primary contact name, email, phone
- State of primary operation
- Agreed per-case monthly rate (for billing summaries)
- Who gets logins, with roles:
  - **Firm Admin** (manages their own users) — at least one
  - Attorneys / Staff / Accounting / read-only Client Viewers as needed

---

## Step 1 — Create the tenant (1 min)

**Administration → Tenants / Onboarding → “Onboard a New Firm”**

1. Enter firm name, contact details, state, and per-case rate.
2. (Recommended) Fill **First Firm-Admin Login** — name, email, temporary
   password (8+ chars) — so the firm has a working login immediately.
3. Click **Create tenant.**

The firm appears in the list with status **ONBOARDING**. Its data is isolated
from every other firm from this moment.

## Step 2 — Add the firm's users (1–2 min)

**Administration → Users & Roles → “Add User”** for each person:

| Person | Role | Firm scope |
|---|---|---|
| Office manager / operations lead | Firm Admin | the new firm |
| Attorneys | Attorney | the new firm |
| Paralegals / assistants | Staff | the new firm |
| Bookkeeper | Accounting | the new firm |
| Partners who only want visibility | Client Viewer | the new firm |

Give each a **temporary password** and tell them to note it — have them change it
at first opportunity. (Alternatively, the Firm Admin you created in Step 1 can
add their own colleagues themselves.)

## Step 3 — Load their cases (1 min)

Choose one:

- **Import** — if their cases are in the TCS Nexus workbook format:
  **Administration → Spreadsheet Import**, upload the `.xlsx`. Cases land in the
  right tenant automatically (matched by the firm name in the `Client` column).
  Re-uploading later updates rather than duplicates.
- **Manual** — **Case Work → All Cases → + New Case**, pick the firm in the
  Firm dropdown. The 40-item checklist and a suggested SOL date are created
  automatically.

## Step 4 — Verify isolation (30 sec)

1. Open a private/incognito window and sign in as the new **firm admin**.
2. Confirm the dashboard shows **only** the new firm's cases and the sidebar has
   no platform admin items.
3. Sign out.

## Step 5 — Activate (10 sec)

**Administration → Tenants** → click **Activate** on the firm.
(ONBOARDING firms already work; ACTIVE simply marks them live for your records.
**Suspend** instantly blocks all of a firm's logins if ever needed.)

---

## Done — hand-off checklist

- [ ] Firm shows in Admin → Tenants with correct rate and status ACTIVE
- [ ] Firm Admin can sign in and sees only their own portal
- [ ] Cases visible with checklists (spot-check one against the source)
- [ ] Case managers assigned on the files (edit each case's Overview tab, or
      include managers in the import)
- [ ] Firm contact told: their portal URL, who their Firm Admin is, and that
      passwords should be changed on first login
- [ ] Billing rate confirmed on **Business → Billing**

**Tip:** every onboarding action you just took is in **Administration → Audit
Trail** — filter by `TENANT_CREATE` / `USER_CREATE` for a record of the setup.
