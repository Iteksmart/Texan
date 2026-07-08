import { requireSession } from '@/lib/auth';
import { canViewAudit, requirePermission, isPlatform } from '@/lib/rbac';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === 'string' && v !== '' ? v : undefined);

// HIPAA audit trail viewer. Firm admins see only their tenant's entries.
export default async function AuditPage({ searchParams }: { searchParams: Search }) {
  const session = await requireSession();
  requirePermission(session, canViewAudit(session));

  const q = s(searchParams.q);
  const action = s(searchParams.action);

  const rows = await db.auditLog.findMany({
    where: {
      ...(isPlatform(session) ? {} : { tenantId: session.tenantId }),
      ...(action ? { action } : {}),
      ...(q ? { OR: [{ userEmail: { contains: q } }, { entityId: { contains: q } }, { details: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const actions = await db.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } });

  return (
    <>
      <h1 className="page-title">Audit Trail</h1>
      <p className="page-sub">Append-only record of every login, view export, and data change — required for HIPAA accountability.</p>

      <form className="filters" method="get">
        <label className="field">
          Search
          <input name="q" defaultValue={q ?? ''} placeholder="User email, case, details…" />
        </label>
        <label className="field">
          Action
          <select name="action" defaultValue={action ?? ''}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a.action}>{a.action}</option>)}
          </select>
        </label>
        <button className="btn secondary" type="submit">Filter</button>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{a.createdAt.toLocaleString()}</td>
                  <td>{a.userEmail}</td>
                  <td><span className="badge badge-blue"><span className="dot" /> {a.action}</span></td>
                  <td>{a.entity}</td>
                  <td className="small muted" style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.details ?? ''}</td>
                  <td className="small muted">{a.ip ?? ''}</td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={6} className="muted">No audit entries match.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted small">Showing the latest 200 entries. For production, archive audit logs to immutable storage (e.g. S3 object lock) on a schedule.</p>
    </>
  );
}
