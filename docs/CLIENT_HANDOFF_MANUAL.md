# United Legal Support Services Platform Handoff Manual

Prepared by: iTechSmart Inc.  
Last updated: July 7, 2026

This manual explains how to deploy the United Legal Support Services portal to Vercel, point a Squarespace-managed domain to the Vercel deployment, and operate the platform after launch.

Important: do not use demo data, SQLite, or shared demo accounts for production. Production should use a managed PostgreSQL database, a strong `AUTH_SECRET`, HTTPS, least-privilege user roles, and signed BAAs where real PHI will be stored.

---

## 1. Go-Live Overview

The platform is the secure sign-in portal (the former public marketing website has been retired; the root URL redirects to the sign-in page):

| Area | URL after launch | Purpose |
|---|---|---|
| Client/Firm Portal | `https://yourdomain.com/login` (root URL redirects here) | Secure sign-in for United Legal Support Services staff, admins, law firm users, and client/firm portal users |

Recommended launch flow:

1. Push the final code to the GitHub repository.
2. Import the repository into Vercel.
3. Attach a production PostgreSQL database.
4. Add environment variables in Vercel.
5. Deploy and smoke test the temporary `vercel.app` URL.
6. Add the custom domain in Vercel.
7. Update DNS in Squarespace.
8. Wait for propagation and confirm SSL is active.
9. Create real admin/users and remove demo-only data.

---

## 2. Vercel Deployment Instructions

### 2.1 Create the Vercel project

1. Sign in to Vercel.
2. Click **Add New** then **Project**.
3. Import the GitHub repository for this platform.
4. Keep the framework preset as **Next.js**.
5. Use these settings unless the repository changes:

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | Leave default |
| Node version | Node 20 or newer |

The app's build command already runs Prisma generation before the Next.js build.

### 2.2 Use PostgreSQL for production

The local demo uses SQLite for easy setup. Do not use SQLite on Vercel for production because serverless deployments do not provide a persistent local database.

Use one of these managed PostgreSQL options:

| Option | Notes |
|---|---|
| Vercel-integrated PostgreSQL provider | Easiest from inside Vercel if available on the account |
| Neon | Common serverless PostgreSQL choice for Vercel |
| Supabase PostgreSQL | Good managed Postgres option |
| AWS RDS / Azure / GCP | Strong enterprise option if the client already uses cloud infrastructure |

Connecting PostgreSQL is automatic — no code changes are needed:

1. In the Vercel project, open **Storage** and create (or connect) a Postgres
   database (e.g. Neon). Vercel adds the connection string to the project's
   environment variables automatically.
2. **Redeploy** the project.

During the build, the app detects the PostgreSQL connection string, switches
the Prisma provider, and creates the tables (`prisma db push`). On the first
request against an empty database it seeds the demo firms, cases, and logins
so the portal is immediately usable — and from then on, everything created in
the portal (users, firms, cases, notes) is saved permanently.

After go-live on a real database:

1. Sign in as `admin@nextus.demo` and create your own `SUPER_ADMIN` account
   with a strong password (Admin → Users & Roles).
2. Sign in with the new account and deactivate the demo accounts
   (`admin@nextus.demo`, `exec@nextus.demo`, etc.), since their demo password
   is public.

For a stricter production release process, convert to Prisma migrations before go-live.

### 2.3 Add Vercel environment variables

In Vercel:

1. Open the project.
2. Go to **Settings**.
3. Open **Environment Variables**.
4. Add these variables for **Production** and **Preview** as needed.

| Variable | Required | Example | Notes |
|---|---:|---|---|
| `DATABASE_URL` | For production | `postgresql://user:password@host/db?sslmode=require` | Managed PostgreSQL connection string. Optional for demos: when unset, the app automatically uses a temporary self-seeding demo database |
| `AUTH_SECRET` | Yes | Long random secret | Generate a unique production value |
| `SESSION_IDLE_MINUTES` | Recommended | `30` | Keep at or below 30 for PHI-minded environments |

Demo-only shortcut: if `DATABASE_URL` is not set at all, the app automatically
creates and seeds a temporary demo database (demo logins, password `Demo123!`)
on first request — so a fresh Vercel import works with zero configuration. The
data is ephemeral — it resets whenever Vercel recycles the serverless
instance — so never use this mode for real client data.

Generate `AUTH_SECRET` with one of these:

```bash
openssl rand -base64 48
```

or with Node:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 2.4 Deploy

1. Click **Deploy** in Vercel.
2. Wait for the build to finish.
3. Open the generated `https://project-name.vercel.app` URL.
4. Test:
   - The root URL redirects to `/login`.
   - A real admin can sign in.
   - Dashboard, cases, reports, billing, and admin areas load based on role.

### 2.5 Production checklist before real data

Complete this before entering real law firm/client information:

- PostgreSQL database is live and encrypted.
- `AUTH_SECRET` is unique and not copied from local/dev.
- Demo seed data is not used for production.
- First real `SUPER_ADMIN` account is created.
- All users have individual accounts; no shared logins.
- HTTPS works on the custom domain.
- Session idle timeout is configured.
- Hosting/database/email vendors are reviewed for HIPAA obligations and BAAs.
- Backup and restore process is documented.

---

## 3. Squarespace Domain DNS to Vercel

This section is for a domain purchased or managed through Squarespace.

### 3.1 Add the domain in Vercel first

In Vercel:

1. Open the project.
2. Go to **Settings** then **Domains**.
3. Click **Add Domain**.
4. Add the preferred domain, for example:
   - `unitedlegalsupportservices.com`
   - `www.unitedlegalsupportservices.com`
5. Follow the DNS instructions Vercel displays for that exact domain.

Vercel normally asks for:

| Domain type | DNS record |
|---|---|
| Apex/root domain, such as `unitedlegalsupportservices.com` | `A` record pointing to Vercel |
| `www` subdomain, such as `www.unitedlegalsupportservices.com` | `CNAME` record pointing to Vercel |

Use the exact values Vercel shows in the project. If Vercel asks for a verification TXT record, add that in Squarespace too.

Common Vercel values are:

| Type | Host/Name | Value/Data |
|---|---|---|
| `A` | `@` or blank/root | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` or the project-specific CNAME shown by Vercel |

If Vercel displays a project-specific CNAME, use Vercel's displayed value instead of guessing.

### 3.2 Edit DNS in Squarespace

In Squarespace:

1. Open the Squarespace account.
2. Open the **Domains Dashboard**.
3. Click the domain name.
4. Click **DNS** in the side panel.
5. Add or edit the records Vercel requested.
6. Save changes.
7. If Squarespace asks for account password or two-factor authentication, complete it.

Before changing records, screenshot or export the current DNS records. This protects email, SPF/DKIM/DMARC, Google Workspace, Microsoft 365, or other services already using the domain.

### 3.3 Recommended DNS record setup

For a typical launch where both root and `www` should work:

| Type | Host/Name | Value/Data | Purpose |
|---|---|---|---|
| `A` | `@` | Value shown by Vercel, commonly `76.76.21.21` | Sends root domain to Vercel |
| `CNAME` | `www` | Value shown by Vercel | Sends `www` to Vercel |
| `TXT` | As shown by Vercel | As shown by Vercel | Only needed if Vercel requires domain verification |

Do not delete email records unless intentionally moving email. Keep existing `MX`, `TXT` SPF, `DKIM`, and `DMARC` records.

### 3.4 Propagation and SSL

DNS changes can take minutes, but allow 24-48 hours for full propagation.

After DNS is updated:

1. Return to Vercel **Settings > Domains**.
2. Wait until Vercel marks the domain as valid/configured.
3. Confirm the SSL certificate is active.
4. Test these URLs:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com`
   - `https://yourdomain.com/login`

### 3.5 Troubleshooting DNS

| Issue | What to check |
|---|---|
| Vercel says invalid configuration | Compare Squarespace DNS records to the exact Vercel instructions |
| Root domain works, `www` does not | Confirm `www` CNAME exists |
| `www` works, root does not | Confirm root/apex `A` record exists |
| Email stopped working | Restore MX/SPF/DKIM/DMARC records from the pre-change screenshot |
| Browser shows SSL warning | Wait for Vercel certificate issuance, then recheck Vercel domain status |
| Old Squarespace site still loads | DNS propagation may still be happening, or old A/CNAME records are still present |

---

## 4. Platform Branding and Navigation

Portal branding:

- The public marketing website has been removed; visiting the root URL redirects to the sign-in portal.
- The sign-in page and authenticated portal are branded for **United Legal Support Services**.
- The creator credit must remain visible as: **Created By: iTechSmart Inc.**
- Product naming such as NextUS/NextUp should not be shown as the top portal brand for the client-facing dashboard.

---

## 5. User Roles

| Role | Intended user | Access |
|---|---|---|
| `SUPER_ADMIN` | iTechSmart or United Legal Support Services platform owner | Full platform, tenants, users, audit, import, connectors |
| `EXECUTIVE` | United Legal Support Services executive/admin leader | Executive dashboard, reports, billing, audit visibility |
| `CASE_MANAGER` | United Legal Support Services operations staff | Case work across assigned firm files |
| `ACCOUNTING` | Billing/accounting user | Billing and reports |
| `FIRM_ADMIN` | Law firm admin | Their firm's portal, users, cases, and reports |
| `ATTORNEY` | Law firm attorney | Their firm's cases and related work |
| `STAFF` | Law firm staff | Case work for their firm |
| `CLIENT_VIEWER` | Read-only firm/client viewer | Dashboard and case visibility without admin control |

Revenue Forecast is admin-only for employee views. Super Admin users can see it; normal employee/staff views should not.

---

## 6. Daily Platform Instructions

### 6.1 Sign in

1. Go to `https://yourdomain.com/login`.
2. Enter the assigned email and password.
3. Use **Sign out** when done.

Never share logins. Each user's activity is tracked separately in the audit trail.

### 6.2 Dashboard

The dashboard gives a live operational view. Depending on role, users can see:

- Active cases.
- Case health.
- Pipeline by stage.
- Completion and QC metrics.
- Alerts and workload summaries.
- Revenue Forecast for authorized admin users only.

Dashboard view options include:

- Pipeline view.
- Graph chart view.
- Line chart view.
- Pie chart view.

Use the view controls on the dashboard to switch how the same data is displayed.

### 6.3 Firm Portals

Platform users can open **Firm Portals** from the sidebar to review each law firm's scoped portal.

Firm users see only their own firm's data. They should not be able to access another firm's cases, reports, or user records.

### 6.4 Cases

Use **All Cases** to search and manage case files.

Typical case workflow:

1. Open **All Cases**.
2. Search by case number, client name, firm, manager, stage, status, priority, or health.
3. Open the case.
4. Review overview fields.
5. Update checklist items.
6. Add treatment entries or notes.
7. Save changes.

Each case includes:

- Overview.
- Checklist.
- Treatment.
- Notes.
- Activity.

### 6.5 Trackers

Trackers mirror the operational spreadsheet tabs as live views:

- Intake Tracker.
- Investigation.
- Insurance.
- Medical Records.
- Liens / Subro.
- Demand.
- SOL & Critical.

Use trackers to scan many cases quickly, then click into a case when action is needed.

### 6.6 Alerts and automation

Open **Alerts & Automation** to review cases needing attention.

Alerts include:

- Overdue SLA.
- Red file health.
- No activity.
- SOL risk.
- Missing SOL.
- Stale client contact.
- Missing critical checklist items.
- Treatment records or bills missing.

### 6.7 Billing

Open **Billing** to review billing summaries.

The Billing tab includes a QuickBooks connector card under NextUp/connectors, allowing the team to plan or manage QuickBooks integration from the billing workflow.

### 6.8 Report Builder

Open **Report Builder** to:

- Filter by firm.
- Filter by case manager.
- Filter by month.
- Review summary metrics.
- Export CSV reports.

Exports are tracked in the audit trail.

### 6.9 Administration

Admin users can access:

- **Tenants / Onboarding** for law firm setup.
- **Users & Roles** for account management.
- **Data Connectors** for connector configuration.
- **Audit Trail** for compliance and activity history.
- **Spreadsheet Import** for importing case workbook data.

---

## 7. Law Firm Demo Link Workflow

Recommended demo process:

1. A law firm requests a demo through your sales/contact workflow.
2. United Legal Support Services receives the inquiry.
3. United Legal Support Services schedules a guided walkthrough.
4. United Legal Support Services or iTechSmart creates a demo tenant or demo-safe account.
5. The law firm receives the demo link:

```text
https://yourdomain.com/login
```

Do not provide production credentials in any public-facing text. Demo credentials should be shared privately and changed or removed after the demo.

---

## 8. Tenant and User Onboarding

### 8.1 Add a new law firm

1. Sign in as a Super Admin.
2. Open **Tenants / Onboarding**.
3. Add the firm name and billing details.
4. Set the firm status.
5. Save.

### 8.2 Add a firm user

1. Open **Users & Roles**.
2. Create a new user.
3. Assign the correct firm.
4. Assign the correct role.
5. Send the login URL privately.

### 8.3 Offboard a user

1. Open **Users & Roles**.
2. Deactivate the user's account.
3. Confirm they can no longer sign in.
4. Review audit records if needed.

---

## 9. Data Connectors

The platform includes connector areas for legal and billing systems.

Supported/represented connector categories include:

- Legal case systems such as Clio, Filevine, CASEpeer, Litify, MyCase, Smokeball, PracticePanther, Lawmatics, Neos, and SmartAdvocate.
- Webhook-style integrations through Zapier or Make.
- QuickBooks connector visibility under Billing.

Before activating a real connector:

1. Confirm the vendor account has API access.
2. Confirm the vendor and workflow are approved for any PHI/PII involved.
3. Store credentials only in secure environment variables or encrypted connector settings.
4. Test with demo-safe data first.

---

## 10. Security and Compliance Notes

Before production PHI:

- Require individual user accounts.
- Use least-privilege roles.
- Use HTTPS only.
- Keep `SESSION_IDLE_MINUTES` at or below 30.
- Review the audit trail regularly.
- Maintain encrypted database backups.
- Confirm vendor BAAs where applicable.
- Do not email PHI in plain text.
- Remove demo data from production.

---

## 11. Maintenance Instructions

### 11.1 Routine checks

Weekly:

- Confirm Vercel deployments are healthy.
- Confirm database backups are running.
- Review error logs.
- Review admin/audit activity.
- Deactivate users who no longer need access.

Monthly:

- Review roles and permissions.
- Test a database restore process.
- Review connector health.
- Review outstanding alerts and old cases.

### 11.2 Updating the platform

1. Make code changes in a branch.
2. Open a preview deployment in Vercel.
3. Test public website and authenticated portal.
4. Confirm build passes.
5. Merge to production branch.
6. Vercel deploys automatically.
7. Smoke test production after deployment.

### 11.3 Rollback

If a deployment causes issues:

1. Open Vercel project.
2. Go to **Deployments**.
3. Select a previous working deployment.
4. Promote or rollback to that deployment.
5. Re-test the public website and portal.

---

## 12. Launch Acceptance Checklist

Use this list before announcing the site:

- Root URL redirects to the sign-in portal.
- `/login` works.
- Dashboard loads for admin.
- Employee/staff users do not see Revenue Forecast.
- Admin users can see Revenue Forecast where intended.
- Dashboard chart view options work.
- Billing includes QuickBooks connector card.
- Sign-in page and portal top branding say United Legal Support Services.
- Sidebar credit says Created By: iTechSmart Inc.
- Squarespace DNS points to Vercel.
- Root and `www` domains load over HTTPS.
- Production database is PostgreSQL.
- Demo data and demo credentials are removed from production.

---

## 13. Official References

- Vercel custom domains: https://vercel.com/docs/domains/working-with-domains/add-a-domain
- Squarespace DNS records: https://support.squarespace.com/hc/en-us/articles/360002101888-Edit-your-domain-s-DNS-records
- Existing project setup guide: `docs/SETUP_GUIDE.md`
- Existing platform user manual: `docs/USER_MANUAL.md`
- HIPAA checklist: `HIPAA.md`
