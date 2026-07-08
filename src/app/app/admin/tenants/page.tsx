import { requireSession } from '@/lib/auth';
import { canManageTenants, requirePermission } from '@/lib/rbac';
import { db } from '@/lib/db';
import { STATES } from '@/lib/constants';
import { fmtMoney, fmtDate } from '@/lib/metrics';
import { createTenantAction, setTenantStatusAction } from '../actions';

export const dynamic = 'force-dynamic';

// Tenant onboarding: create a firm, its portal is isolated immediately,
// optionally provision its first firm-admin login.
export default async function TenantsPage() {
  const session = await requireSession();
  requirePermission(session, canManageTenants(session));

  const tenants = await db.tenant.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { cases: true, users: true } } },
  });

  return (
    <>
      <h1 className="page-title">Tenants — Law Firm Onboarding</h1>
      <p className="page-sub">
        Each firm is an isolated tenant: its users, cases, and reports are separated from every other firm.
      </p>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Firm</th>
                <th>Status</th>
                <th>Contact</th>
                <th className="num">Cases</th>
                <th className="num">Users</th>
                <th className="num">Per-Case Rate</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.name}</b><div className="small muted">{t.slug}</div></td>
                  <td>
                    <span className={`badge ${t.status === 'ACTIVE' ? 'badge-green' : t.status === 'ONBOARDING' ? 'badge-blue' : 'badge-red'}`}>
                      <span className="dot" /> {t.status}
                    </span>
                  </td>
                  <td>{t.contactName ?? '—'}<div className="small muted">{t.contactEmail ?? ''}</div></td>
                  <td className="num">{t._count.cases}</td>
                  <td className="num">{t._count.users}</td>
                  <td className="num">{fmtMoney(t.perCaseRate)}</td>
                  <td className="nowrap">{fmtDate(t.createdAt)}</td>
                  <td>
                    <form action={setTenantStatusAction} style={{ display: 'flex', gap: 6 }}>
                      <input type="hidden" name="tenantId" value={t.id} />
                      {t.status !== 'ACTIVE' ? (
                        <button className="btn small" name="status" value="ACTIVE" type="submit">Activate</button>
                      ) : (
                        <button className="btn small danger" name="status" value="SUSPENDED" type="submit">Suspend</button>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form action={createTenantAction} className="card">
        <h2>Onboard a New Firm</h2>
        <div className="form-grid">
          <label className="field">Firm name * <input name="name" required /></label>
          <label className="field">Contact name <input name="contactName" /></label>
          <label className="field">Contact email <input name="contactEmail" type="email" /></label>
          <label className="field">Phone <input name="phone" /></label>
          <label className="field">
            State
            <select name="state">{STATES.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="field">Per-case monthly rate ($) <input name="perCaseRate" type="number" defaultValue={250} step="25" /></label>
        </div>
        <h2 style={{ marginTop: 18 }}>First Firm-Admin Login <span className="hint">— optional, can be added later in Users</span></h2>
        <div className="form-grid">
          <label className="field">Admin name <input name="adminName" /></label>
          <label className="field">Admin email <input name="adminEmail" type="email" /></label>
          <label className="field">Temporary password <input name="adminPassword" type="password" minLength={8} placeholder="8+ characters" /></label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>Notes <textarea name="notes" rows={2} /></label>
        <div style={{ marginTop: 14 }}>
          <button className="btn" type="submit">Create tenant</button>
        </div>
      </form>
    </>
  );
}
