import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { isPlatform, requirePermission } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { fmtMoney } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

const CAPACITY = 25; // active files per case manager before capacity alert

// Employee Portal replacement: workload, quality, and escalations per case manager.
export default async function TeamPage() {
  const session = await requireSession();
  requirePermission(session, isPlatform(session));

  const scored = await loadCases(session);
  const byManager = new Map<string, { id: string | null; cases: typeof scored }>();
  for (const s of scored) {
    const name = s.case.caseManager?.name ?? 'Unassigned';
    if (!byManager.has(name)) byManager.set(name, { id: s.case.caseManager?.id ?? null, cases: [] });
    byManager.get(name)!.cases.push(s);
  }

  const rows = [...byManager.entries()].sort((a, b) => b[1].cases.length - a[1].cases.length);

  return (
    <>
      <h1 className="page-title">Team Workload</h1>
      <p className="page-sub">Case manager scorecard: workload, quality, and files needing escalation.</p>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Case Manager</th>
                <th className="num">Active</th>
                <th className="num">Capacity</th>
                <th className="num">Red Files</th>
                <th className="num">Overdue SLA</th>
                <th className="num">Critical Priority</th>
                <th className="num">Ready for Demand</th>
                <th className="num">Avg QC</th>
                <th className="num">Avg Completion</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, { id, cases }]) => {
                const red = cases.filter((s) => s.metrics.health === 'Red').length;
                const overdue = cases.filter((s) => s.metrics.sla === 'Overdue').length;
                const critical = cases.filter((s) => s.case.priority === 'Critical').length;
                const ready = cases.filter((s) => s.metrics.readyForDemand).length;
                const qc = cases.map((s) => s.case.qcScore).filter((q): q is number => q !== null);
                const avgQc = qc.length ? (qc.reduce((a, b) => a + b, 0) / qc.length).toFixed(1) : '—';
                const comp = cases.length ? Math.round(cases.reduce((a, s) => a + s.metrics.overallPct, 0) / cases.length) : 0;
                const rev = cases.reduce((a, s) => a + s.case.revenueForecast, 0);
                const capacityPct = Math.round((cases.length / CAPACITY) * 100);
                return (
                  <tr key={name}>
                    <td>{id ? <Link href={`/app/cases?managerId=${id}`}>{name}</Link> : name}</td>
                    <td className="num">{cases.length}</td>
                    <td className="num" style={capacityPct > 100 ? { color: 'var(--status-critical-text)', fontWeight: 700 } : undefined}>
                      {capacityPct}%
                    </td>
                    <td className="num">{red}</td>
                    <td className="num">{overdue}</td>
                    <td className="num">{critical}</td>
                    <td className="num">{ready}</td>
                    <td className="num">{avgQc}</td>
                    <td className="num">{comp}%</td>
                    <td className="num">{fmtMoney(rev)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted small">Capacity assumes {CAPACITY} active files per case manager. Click a manager to see their queue.</p>
    </>
  );
}
