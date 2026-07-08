# NextUS CSM — Guided Walkthrough

**A 15-minute hands-on tour using the demo data.**
Prereq: the app is running with demo data (`npm run setup && npm run dev`,
see `docs/SETUP_GUIDE.md`). All demo passwords are `Demo123!`.

The demo contains exactly what the TCS Nexus spreadsheet contained: 5 law firms
and 50 cases (TCS-1001…TCS-1050), plus checklists and treatment entries.

---

## Part 1 — The website & signing in (1 min)

1. Open `http://localhost:3000`. This is the **public marketing site** — the
   page prospective firms see. Try the **☾ / ☀** toggle: the whole product has
   matching light and dark themes.
2. Click **Sign in** and log in as the platform owner:
   `admin@nextus.demo` / `Demo123!`.

## Part 2 — The executive view (2 min)

You land on the **Executive Portal** — the whole operation at a glance.

- Read the tiles: 50 active cases, red/yellow/green health, overdue SLAs,
  revenue forecast.
- **Case Pipeline** shows where the 50 files sit from Intake to Disbursement —
  this replaces the spreadsheet's Executive Portal tab.
- **SOL Risk**: note files with *Missing SOL* — those are landmines the system
  now surfaces automatically.
- Scroll to **Files Needing Attention**: this ranked list is where a supervisor
  starts every morning.
- Bottom: **Firm Performance** — one row per law firm. Click **Carlson Law
  Firm** to see exactly what that client sees in their portal, then come back.

## Part 3 — Work a case end-to-end (5 min)

1. Go to **Case Work → All Cases**. Filter Health = **Red**, then open the
   first case.
2. **Read the header**: health, SLA, SOL countdown and client-contact badges —
   every one of these was a spreadsheet formula; now they're computed live.
3. **Overview tab**: change **Status** to *In Progress*, set **Next due** to
   next week, click **Save changes**. Then click **Log client contact today** —
   watch the contact badge turn green.
4. **Checklist tab**: six categories, 40 items. Flip **Police Report** to
   **Yes** — the Investigation meter and the Overall % tiles update instantly.
   Flip an item that doesn't apply to **N/A** — it leaves the math entirely.
   Items tagged **critical** feed the alerting.
5. **Treatment tab**: click **Add Treatment Entry** — provider *Lakeside Spine &
   Rehab*, type *Chiropractor*, a date of service, bill **Pending**. The entry
   appears; change the bill to **Yes** right in the row.
6. **Notes tab**: add “Spoke with client; MRI scheduled Friday.” Notes are
   time-stamped and attributed to you.
7. **Activity tab**: every change you just made is already in the file's audit
   trail — user, action, timestamp, IP. This is your HIPAA accountability story.

## Part 4 — The trackers (2 min)

1. **Case Work → Intake Tracker**: the spreadsheet's grid, live — one row per
   case, one badge per document. The case you just edited shows its new values.
2. **SOL & Critical**: sorted most-dangerous first. This view alone justifies
   retiring the workbook — expired and missing SOLs can't hide in a tab.
3. **Currently Treating**: your new treatment entry is here, and the *Bills
   Missing* tile counts every outstanding provider bill across all firms.

## Part 5 — Alerts, team, reports, billing (2 min)

1. **Overview → Alerts & Automation**: the standing rules (overdue SLA, red
   files, stale contact, SOL windows, missing criticals) with severity and
   owner. Nothing to run — it's always current.
2. **Overview → Team Workload**: Richelle carries the demo load — capacity %
   turns red past 25 files. Click a manager to see their queue.
3. **Business → Report Builder**: filter to *Carlson Law Firm*, click
   **Download CSV** — open it: one row per case with every computed metric.
   That's the monthly client report, generated in one click.
4. **Business → Billing**: per-firm monthly fees (active cases × rate),
   forecasts, settlements.

## Part 6 — Onboard a firm & prove isolation (3 min)

1. **Administration → Tenants / Onboarding**: create firm “Walkthrough Test
   Firm”, and in the firm-admin section give it `admin@walkthrough.demo` /
   `Walkthrough1!`. Click **Create tenant**.
2. **Case Work → All Cases → + New Case**: Firm = Walkthrough Test Firm, client
   “Jane Demo”, date of incident = 30 days ago, state TX. Notice the case is
   created with a full checklist and a suggested SOL two years out.
3. Open a **private/incognito window**, sign in as
   `admin@walkthrough.demo` / `Walkthrough1!`:
   - Their dashboard shows **1 case** — Jane Demo only.
   - No admin menus, no other firms, no way to reach TCS-1001 even by URL.
4. Back in your admin window: **Administration → Audit Trail** — the tenant
   creation, user creation, case creation, and both logins are all recorded.

## Part 7 — The escape hatch from Excel (1 min)

**Administration → Spreadsheet Import**: upload the original TCS Nexus OMS
`.xlsx`. Firms in the workbook become tenants; the 50 cases update in place
(no duplicates). This is the one-click migration path — and it also means that
during transition, anyone still updating the spreadsheet can be synced in.

---

## Where to go next

- Full feature reference: `docs/USER_MANUAL.md`
- Onboarding a real firm: `docs/TENANT_ONBOARDING.md`
- Production deployment & HIPAA: `docs/SETUP_GUIDE.md` + `HIPAA.md`
