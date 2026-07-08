import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { isPlatform, canEditCases } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { db } from '@/lib/db';
import { STAGES, STATUSES, PRIORITIES } from '@/lib/constants';
import { fmtDate } from '@/lib/metrics';
import { HealthBadge, SlaBadge, SolBadge, Meter } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === 'string' && v !== '' ? v : undefined);

export default async function CasesPage({ searchParams }: { searchParams: Search }) {
  const session = await requireSession();
  const platform = isPlatform(session);

  const scored = await loadCases(session, {
    tenantId: s(searchParams.tenantId),
    managerId: s(searchParams.managerId),
    stage: s(searchParams.stage),
    status: s(searchParams.status),
    priority: s(searchParams.priority),
    health: s(searchParams.health),
    q: s(searchParams.q),
    includeClosed: s(searchParams.closed) === '1',
  });

  const tenants = platform ? await db.tenant.findMany({ orderBy: { name: 'asc' } }) : [];
  const managers = await db.user.findMany({
    where: { role: 'CASE_MANAGER', active: true },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 className="page-title">Cases</h1>
          <p className="page-sub">{scored.length} file{scored.length === 1 ? '' : 's'} in view</p>
        </div>
        {canEditCases(session) ? (
          <Link className="btn" href="/app/cases/new">+ New Case</Link>
        ) : null}
      </div>

      <form className="filters" method="get">
        <label className="field">
          Search
          <input name="q" defaultValue={s(searchParams.q) ?? ''} placeholder="Case # or client name" />
        </label>
        {platform ? (
          <label className="field">
            Firm
            <select name="tenantId" defaultValue={s(searchParams.tenantId) ?? ''}>
              <option value="">All firms</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          Manager
          <select name="managerId" defaultValue={s(searchParams.managerId) ?? ''}>
            <option value="">All managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Stage
          <select name="stage" defaultValue={s(searchParams.stage) ?? ''}>
            <option value="">All stages</option>
            {STAGES.map((st) => <option key={st}>{st}</option>)}
          </select>
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={s(searchParams.status) ?? ''}>
            <option value="">All statuses</option>
            {STATUSES.map((st) => <option key={st}>{st}</option>)}
          </select>
        </label>
        <label className="field">
          Priority
          <select name="priority" defaultValue={s(searchParams.priority) ?? ''}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="field">
          Health
          <select name="health" defaultValue={s(searchParams.health) ?? ''}>
            <option value="">All health</option>
            <option>Red</option>
            <option>Yellow</option>
            <option>Green</option>
          </select>
        </label>
        <button className="btn secondary" type="submit">Filter</button>
      </form>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Case</th>
                <th>Client</th>
                {platform ? <th>Firm</th> : null}
                <th>Manager</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Health</th>
                <th>SLA</th>
                <th>SOL</th>
                <th>Next Due</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {scored.map(({ case: c, metrics: m }) => (
                <tr key={c.id}>
                  <td className="nowrap"><Link href={`/app/cases/${c.id}`}>{c.caseNumber}</Link></td>
                  <td>{c.clientName}</td>
                  {platform ? <td>{c.tenant?.name}</td> : null}
                  <td>{c.caseManager?.name ?? '—'}</td>
                  <td>{c.stage}</td>
                  <td>{c.status}</td>
                  <td>{c.priority}</td>
                  <td><HealthBadge health={m.health} /></td>
                  <td><SlaBadge sla={m.sla} /></td>
                  <td><SolBadge sol={m.sol} days={m.solDays} /></td>
                  <td className="nowrap">{fmtDate(c.nextDue)}</td>
                  <td style={{ minWidth: 110 }}><Meter pct={m.overallPct} /></td>
                </tr>
              ))}
              {scored.length === 0 ? (
                <tr><td colSpan={12} className="muted">No cases match these filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
