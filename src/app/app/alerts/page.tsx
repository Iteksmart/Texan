import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { isPlatform } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { caseAlerts, type CaseAlert } from '@/lib/metrics';
import { Tile } from '@/components/ui';

export const dynamic = 'force-dynamic';

// Alerts & Automation sheet replacement: rules run live over every active case.
export default async function AlertsPage() {
  const session = await requireSession();
  const scored = await loadCases(session);

  const all: CaseAlert[] = scored.flatMap((s) => caseAlerts(s.case, s.metrics));
  const critical = all.filter((a) => a.severity === 'Critical');
  const high = all.filter((a) => a.severity === 'High');
  const monitor = all.filter((a) => a.severity === 'Monitor');

  const severityBadge = (sev: CaseAlert['severity']) =>
    sev === 'Critical' ? 'badge-red' : sev === 'High' ? 'badge-orange' : 'badge-yellow';

  return (
    <>
      <h1 className="page-title">Alerts &amp; Automation</h1>
      <p className="page-sub">
        Overdue SLAs, red files, stale contact, SOL risk, and missing critical items — monitored automatically.
      </p>

      <div className="tiles">
        <Tile label="Critical Alerts" value={critical.length} tone={critical.length ? 'alert' : 'good'} />
        <Tile label="High Alerts" value={high.length} />
        <Tile label="Monitor" value={monitor.length} />
        <Tile label="Cases With Alerts" value={new Set(all.map((a) => a.caseId)).size} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Alert</th>
                <th>Case</th>
                {isPlatform(session) ? <th>Firm</th> : null}
                <th>Action Required</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {[...critical, ...high, ...monitor].map((a, i) => (
                <tr key={`${a.caseId}-${a.type}-${i}`}>
                  <td>
                    <span className={`badge ${severityBadge(a.severity)}`}>
                      <span className="dot" /> {a.severity}
                    </span>
                  </td>
                  <td>{a.type}</td>
                  <td><Link href={`/app/cases/${a.caseId}`}>{a.caseNumber}</Link></td>
                  {isPlatform(session) ? <td>{a.tenantName}</td> : null}
                  <td>{a.action}</td>
                  <td>{a.owner}</td>
                </tr>
              ))}
              {all.length === 0 ? (
                <tr><td colSpan={6} className="muted">No active alerts — all files healthy.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
