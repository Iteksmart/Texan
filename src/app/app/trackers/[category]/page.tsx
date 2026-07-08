import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { isPlatform } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { CATEGORY_LABELS, CHECKLIST_TEMPLATE, type ChecklistCategory } from '@/lib/constants';
import { fmtDate } from '@/lib/metrics';
import { Tile, HealthBadge, SolBadge, ContactBadge, ValueBadge, Meter } from '@/components/ui';

export const dynamic = 'force-dynamic';

// URL slug -> checklist category ('sol' is the special SOL & Critical view)
const SLUG_TO_CATEGORY: Record<string, ChecklistCategory | 'SOL'> = {
  intake: 'INTAKE',
  investigation: 'INVESTIGATION',
  insurance: 'INSURANCE',
  medical: 'MEDICAL',
  liens: 'LIENS',
  demand: 'DEMAND',
  sol: 'SOL',
};

const DESCRIPTIONS: Record<string, string> = {
  intake: 'Client onboarding, contact, documents, and statute-of-limitations basics.',
  investigation: 'Police reports, evidence, media, searches, and liability documentation.',
  insurance: 'First-party and third-party LORs, acknowledgments, and dec pages.',
  medical: 'Provider records and bills status by case.',
  liens: 'Subrogation letters, acknowledgments, and lien ledger completion.',
  demand: 'Demand readiness, receipt confirmations, and Medpay/PIP demand status.',
  sol: 'SOL countdown, stale client contact, and missing critical item monitoring.',
};

export default async function TrackerPage({ params }: { params: { category: string } }) {
  const target = SLUG_TO_CATEGORY[params.category];
  if (!target) notFound();

  const session = await requireSession();
  const scored = await loadCases(session);
  const platform = isPlatform(session);
  const title = target === 'SOL' ? 'SOL & Critical Alerts' : `${CATEGORY_LABELS[target]} Tracker`;

  // header tiles (mirrors the spreadsheet tracker headers)
  const red = scored.filter((s) => s.metrics.health === 'Red').length;
  const overdue = scored.filter((s) => s.metrics.sla === 'Overdue').length;
  const ready = scored.filter((s) => s.metrics.readyForDemand).length;

  if (target === 'SOL') {
    const rows = [...scored].sort((a, b) => (a.metrics.solDays ?? -9999) - (b.metrics.solDays ?? -9999));
    return (
      <>
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{DESCRIPTIONS[params.category]}</p>
        <div className="tiles">
          <Tile label="Active Cases" value={scored.length} />
          <Tile label="Missing / Expired SOL" value={scored.filter((s) => ['Missing SOL', 'Expired'].includes(s.metrics.sol)).length} tone="alert" />
          <Tile label="SOL < 90 Days" value={scored.filter((s) => ['0-30 Days', '31-60 Days', '61-90 Days'].includes(s.metrics.sol)).length} />
          <Tile label="Stale Client Contact" value={scored.filter((s) => s.metrics.contact !== 'OK').length} />
          <Tile label="Missing Critical Items" value={scored.reduce((a, s) => a + s.metrics.criticalMissing, 0)} />
        </div>
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Case</th>
                  {platform ? <th>Firm</th> : null}
                  <th>Manager</th>
                  <th>Health</th>
                  <th>Date of Incident</th>
                  <th>SOL Date</th>
                  <th>State</th>
                  <th className="num">Days Left</th>
                  <th>SOL Status</th>
                  <th className="num">Critical Missing</th>
                  <th>Client Contact</th>
                  <th>Overall %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ case: c, metrics: m }) => (
                  <tr key={c.id}>
                    <td className="nowrap"><Link href={`/app/cases/${c.id}`}>{c.caseNumber}</Link></td>
                    {platform ? <td>{c.tenant?.name}</td> : null}
                    <td>{c.caseManager?.name ?? '—'}</td>
                    <td><HealthBadge health={m.health} /></td>
                    <td className="nowrap">{fmtDate(c.dateOfIncident)}</td>
                    <td className="nowrap">{fmtDate(c.solDate)}</td>
                    <td>{c.state ?? '—'}</td>
                    <td className="num">{m.solDays ?? '—'}</td>
                    <td><SolBadge sol={m.sol} days={m.solDays} /></td>
                    <td className="num">{m.criticalMissing}</td>
                    <td><ContactBadge contact={m.contact} /></td>
                    <td style={{ minWidth: 100 }}><Meter pct={m.overallPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  const items = CHECKLIST_TEMPLATE.filter((t) => t.category === target);
  const totalMissing = scored.reduce(
    (a, s) => a + s.metrics.stats.find((st) => st.category === target)!.missing,
    0,
  );
  const avg = scored.length
    ? Math.round(scored.reduce((a, s) => a + s.metrics.stats.find((st) => st.category === target)!.pct, 0) / scored.length)
    : 0;

  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-sub">{DESCRIPTIONS[params.category]} Click a case to update its checklist.</p>
      <div className="tiles">
        <Tile label="Active Cases" value={scored.length} />
        <Tile label="Avg Completion" value={`${avg}%`} />
        <Tile label="Red Files" value={red} tone={red ? 'alert' : 'good'} />
        <Tile label="Overdue SLA" value={overdue} />
        <Tile label="Missing Items" value={totalMissing} />
        <Tile label="Ready for Demand" value={ready} tone="good" />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Case</th>
                {platform ? <th>Firm</th> : null}
                <th>Manager</th>
                <th>Health</th>
                {items.map((i) => (
                  <th key={i.key} title={i.label}>
                    {i.label.length > 18 ? `${i.label.slice(0, 17)}…` : i.label}
                  </th>
                ))}
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {scored.map(({ case: c, metrics: m }) => {
                const stat = m.stats.find((st) => st.category === target)!;
                return (
                  <tr key={c.id}>
                    <td className="nowrap"><Link href={`/app/cases/${c.id}?tab=checklist`}>{c.caseNumber}</Link></td>
                    {platform ? <td>{c.tenant?.name}</td> : null}
                    <td>{c.caseManager?.name ?? '—'}</td>
                    <td><HealthBadge health={m.health} /></td>
                    {items.map((i) => {
                      const item = c.checklist.find((ci) => ci.key === i.key);
                      return <td key={i.key}>{item ? <ValueBadge value={item.value} /> : '—'}</td>;
                    })}
                    <td style={{ minWidth: 100 }}><Meter pct={stat.pct} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
