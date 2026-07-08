import { requireSession } from '@/lib/auth';
import { canViewRevenueForecast, isPlatform } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { db } from '@/lib/db';
import { fmtMoney } from '@/lib/metrics';
import { Tile } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === 'string' && v !== '' ? v : undefined);

// Report Builder: filter by firm / case manager / month, get summary metrics
// plus a CSV export (replaces the Report Builder & Printable Client Report tabs).
export default async function ReportsPage({ searchParams }: { searchParams: Search }) {
  const session = await requireSession();
  const platform = isPlatform(session);
  const showRevenueForecast = canViewRevenueForecast(session);

  const tenantId = s(searchParams.tenantId);
  const managerId = s(searchParams.managerId);
  const month = s(searchParams.month); // YYYY-MM

  let scored = await loadCases(session, { tenantId, managerId, includeClosed: true });
  if (month) {
    const [y, mo] = month.split('-').map(Number);
    scored = scored.filter(({ case: c }) => {
      const opened = c.openDate.getFullYear() === y && c.openDate.getMonth() + 1 === mo;
      const active = c.openDate <= new Date(y, mo, 0) && (!c.closedAt || c.closedAt >= new Date(y, mo - 1, 1));
      return opened || active;
    });
  }
  const active = scored.filter((x) => !x.case.closedAt);

  const tenants = platform ? await db.tenant.findMany({ orderBy: { name: 'asc' } }) : [];
  const managers = await db.user.findMany({ where: { role: 'CASE_MANAGER' }, orderBy: { name: 'asc' } });

  const revenue = active.reduce((a, x) => a + x.case.revenueForecast, 0);
  const settlements = scored.reduce((a, x) => a + (x.case.settlementValue ?? 0), 0);
  const ready = active.filter((x) => x.metrics.readyForDemand).length;
  const red = active.filter((x) => x.metrics.health === 'Red').length;
  const avgComp = active.length ? Math.round(active.reduce((a, x) => a + x.metrics.overallPct, 0) / active.length) : 0;
  const qc = active.map((x) => x.case.qcScore).filter((q): q is number => q !== null);
  const avgQc = qc.length ? (qc.reduce((a, b) => a + b, 0) / qc.length).toFixed(1) : '—';

  const exportParams = new URLSearchParams();
  if (tenantId) exportParams.set('tenantId', tenantId);
  if (managerId) exportParams.set('managerId', managerId);
  if (month) exportParams.set('month', month);

  return (
    <>
      <h1 className="page-title">Report Builder</h1>
      <p className="page-sub">Filter by firm, case manager, and month — then export the underlying case list as CSV.</p>

      <form className="filters" method="get">
        {platform ? (
          <label className="field">
            Firm
            <select name="tenantId" defaultValue={tenantId ?? ''}>
              <option value="">All firms</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="field">
          Case manager
          <select name="managerId" defaultValue={managerId ?? ''}>
            <option value="">All managers</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="field">
          Month
          <input type="month" name="month" defaultValue={month ?? ''} />
        </label>
        <button className="btn secondary" type="submit">Run report</button>
        <a className="btn" href={`/app/reports/export?${exportParams.toString()}`}>Download CSV</a>
      </form>

      <div className="tiles">
        <Tile label="Cases in Report" value={scored.length} />
        <Tile label="Active" value={active.length} />
        <Tile label="Red Files" value={red} tone={red ? 'alert' : 'good'} />
        <Tile label="Ready for Demand" value={ready} tone="good" />
        <Tile label="Avg Completion" value={`${avgComp}%`} />
        <Tile label="Avg QC" value={avgQc} />
        {showRevenueForecast ? <Tile label="Revenue Forecast" value={fmtMoney(revenue)} /> : null}
        <Tile label="Settlement Value" value={fmtMoney(settlements)} />
      </div>

      <div className="card">
        <h2>Monthly Case Flow <span className="hint">— opened vs closed</span></h2>
        <MonthlyFlow scored={scored} />
      </div>
    </>
  );
}

function MonthlyFlow({ scored }: { scored: Awaited<ReturnType<typeof loadCases>> }) {
  const months = new Map<string, { opened: number; closed: number }>();
  for (const { case: c } of scored) {
    const key = `${c.openDate.getFullYear()}-${String(c.openDate.getMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) months.set(key, { opened: 0, closed: 0 });
    months.get(key)!.opened++;
    if (c.closedAt) {
      const ck = `${c.closedAt.getFullYear()}-${String(c.closedAt.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(ck)) months.set(ck, { opened: 0, closed: 0 });
      months.get(ck)!.closed++;
    }
  }
  const rows = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(1, ...rows.flatMap(([, v]) => [v.opened, v.closed]));
  return (
    <div>
      <div className="legend">
        <span className="key"><span className="swatch" style={{ background: 'var(--series-1)' }} /> Opened</span>
        <span className="key"><span className="swatch" style={{ background: 'var(--series-2)' }} /> Closed</span>
      </div>
      {rows.map(([label, v]) => (
        <div key={label} style={{ marginBottom: 6 }}>
          <div className="hbar-row" title={`${label} opened: ${v.opened}`}>
            <span className="hbar-label">{label}</span>
            <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(v.opened / max) * 100}%` }} /></div>
            <span className="hbar-value">{v.opened}</span>
          </div>
          <div className="hbar-row" style={{ marginTop: -4 }} title={`${label} closed: ${v.closed}`}>
            <span className="hbar-label" />
            <div className="hbar-track"><div className="hbar-fill s2" style={{ width: `${(v.closed / max) * 100}%` }} /></div>
            <span className="hbar-value">{v.closed}</span>
          </div>
        </div>
      ))}
      {rows.length === 0 ? <p className="muted">No data for this filter.</p> : null}
    </div>
  );
}
