import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { isPlatform, canManageTenants, canViewBilling, canViewAudit, canImport, canManageUsers, canManageConnectors } from '@/lib/rbac';
import { ROLE_LABELS } from '@/lib/constants';
import { ThemeToggle } from '@/components/theme-toggle';
import { logoutAction } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const platform = isPlatform(session);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="portal-brand">
          <span className="portal-mark">ULS</span>
          <span>
            <b>United Legal</b>
            <small>Support Services</small>
          </span>
        </div>

        <div className="section">Overview</div>
        <Link href="/app/dashboard">Dashboard</Link>
        {platform ? <Link href="/app/firms">Firm Portals</Link> : null}
        {platform ? <Link href="/app/team">Team Workload</Link> : null}
        <Link href="/app/alerts">Alerts &amp; Automation</Link>

        <div className="section">Case Work</div>
        <Link href="/app/cases">All Cases</Link>
        <Link href="/app/trackers/intake">Intake Tracker</Link>
        <Link href="/app/trackers/investigation">Investigation</Link>
        <Link href="/app/trackers/insurance">Insurance</Link>
        <Link href="/app/trackers/medical">Medical Records</Link>
        <Link href="/app/trackers/liens">Liens / Subro</Link>
        <Link href="/app/trackers/demand">Demand</Link>
        <Link href="/app/trackers/sol">SOL &amp; Critical</Link>
        <Link href="/app/treatment">Currently Treating</Link>

        <div className="section">Business</div>
        <Link href="/app/reports">Report Builder</Link>
        {canViewBilling(session) ? <Link href="/app/billing">Billing</Link> : null}

        {(canManageTenants(session) || canManageUsers(session) || canViewAudit(session) || canImport(session)) ? (
          <>
            <div className="section">Administration</div>
            {canManageTenants(session) ? <Link href="/app/admin/tenants">Tenants / Onboarding</Link> : null}
            {canManageUsers(session) ? <Link href="/app/admin/users">Users &amp; Roles</Link> : null}
            {canManageConnectors(session) ? <Link href="/app/admin/connectors">Data Connectors</Link> : null}
            {canViewAudit(session) ? <Link href="/app/admin/audit">Audit Trail</Link> : null}
            {canImport(session) ? <Link href="/app/import">Spreadsheet Import</Link> : null}
          </>
        ) : null}

        <div className="sidebar-credit">Created By: iTechSmart Inc.</div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="who">
            <b>{session.name}</b> · {ROLE_LABELS[session.role]}
            {session.tenantName ? <> · {session.tenantName}</> : <> · Platform</>}
          </div>
          <div className="actions">
            <ThemeToggle />
            <form action={logoutAction}>
              <button className="btn secondary small" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
