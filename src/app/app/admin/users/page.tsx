import { requireSession } from '@/lib/auth';
import { canManageUsers, requirePermission } from '@/lib/rbac';
import { db } from '@/lib/db';
import { ROLES, ROLE_LABELS, type Role } from '@/lib/constants';
import { fmtDate } from '@/lib/metrics';
import { createUserAction, toggleUserAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await requireSession();
  requirePermission(session, canManageUsers(session));
  const firmAdmin = session.role === 'FIRM_ADMIN';

  const users = await db.user.findMany({
    where: firmAdmin ? { tenantId: session.tenantId } : {},
    include: { tenant: { select: { name: true } } },
    orderBy: [{ tenantId: 'asc' }, { name: 'asc' }],
  });
  const tenants = firmAdmin ? [] : await db.tenant.findMany({ orderBy: { name: 'asc' } });

  const allowedRoles: Role[] = firmAdmin
    ? ['FIRM_ADMIN', 'ATTORNEY', 'STAFF', 'ACCOUNTING', 'CLIENT_VIEWER']
    : [...ROLES];

  return (
    <>
      <h1 className="page-title">Users &amp; Roles</h1>
      <p className="page-sub">
        Role-based access: attorneys, case managers, staff, accounting, executives, and read-only client viewers.
      </p>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}{u.title ? <div className="small muted">{u.title}</div> : null}</td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-purple"><span className="dot" /> {ROLE_LABELS[u.role as Role] ?? u.role}</span></td>
                  <td>{u.tenant?.name ?? 'Platform (all firms)'}</td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-green' : 'badge-gray'}`}>
                      <span className="dot" /> {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="nowrap">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'Never'}</td>
                  <td>
                    {u.id !== session.userId ? (
                      <form action={toggleUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button className={`btn small ${u.active ? 'danger' : ''}`} type="submit">
                          {u.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </form>
                    ) : <span className="muted small">you</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form action={createUserAction} className="card">
        <h2>Add User</h2>
        <div className="form-grid">
          <label className="field">Name * <input name="name" required /></label>
          <label className="field">Email * <input name="email" type="email" required /></label>
          <label className="field">Title <input name="title" /></label>
          <label className="field">
            Role
            <select name="role">
              {allowedRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>
          {!firmAdmin ? (
            <label className="field">
              Firm scope
              <select name="tenantId">
                <option value="">Platform (all firms)</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          ) : null}
          <label className="field">Temporary password * <input name="password" type="password" minLength={8} required placeholder="8+ characters" /></label>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn" type="submit">Create user</button>
        </div>
      </form>
    </>
  );
}
