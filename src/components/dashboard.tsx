// Shared dashboard renderer: works company-wide (platform users) or for a
// single firm (tenant users / firm portal drill-down).
import Link from 'next/link';
import { STAGES, STATUSES, CATEGORY_LABELS, type ChecklistCategory } from '@/lib/constants';
import { fmtMoney, type CaseMetrics } from '@/lib/metrics';
import type { ScoredCase } from '@/lib/case-queries';
import { Tile, BarList, HealthBadge, SlaBadge, SolBadge, Meter } from '@/components/ui';

type DashboardViewMode = 'pipeline' | 'graph' | 'line' | 'pie';
type BasicRow = { label: string; value: number };

export function Dashboard({
  scored,
  title,
  showFirmColumn,
  showRevenueForecast,
  viewMode,
}: {
  scored: ScoredCase[];
  title: string;
  showFirmColumn: boolean;
  showRevenueForecast: boolean;
  viewMode?: string;
}) {
  const active = scored;
  const count = (fn: (s: ScoredCase) => boolean) => active.filter(fn).length;
  const selectedView = normalizeViewMode(viewMode);

  const red = count((s) => s.metrics.health === 'Red');
  const yellow = count((s) => s.metrics.health === 'Yellow');
  const green = count((s) => s.metrics.health === 'Green');
  const overdue = count((s) => s.metrics.sla === 'Overdue');
  const ready = count((s) => s.metrics.readyForDemand);
  const sol90 = count((s) => ['Expired', '0-30 Days', '31-60 Days', '61-90 Days'].includes(s.metrics.sol));
  const criticalMissing = active.reduce((sum, s) => sum + s.metrics.criticalMissing, 0);
  const revenue = active.reduce((sum, s) => sum + s.case.revenueForecast, 0);
  const qcScores = active.map((s) => s.case.qcScore).filter((q): q is number => q !== null);
  const avgQc = qcScores.length ? (qcScores.reduce((a, b) => a + b, 0) / qcScores.length).toFixed(1) : '-';
  const avgCompletion = active.length
    ? Math.round(active.reduce((sum, s) => sum + s.metrics.overallPct, 0) / active.length)
    : 0;

  const byStage = STAGES.filter((st) => st !== 'Closed').map((stage) => ({
    label: stage,
    value: count((s) => s.case.stage === stage),
  }));
  const byStatus = STATUSES.filter((st) => st !== 'Closed')
    .map((status) => ({ label: status, value: count((s) => s.case.status === status) }))
    .filter((r) => r.value > 0);
  const solRows = [
    { label: 'Expired', window: 'Expired', status: 'critical' as const },
    { label: '0-30 Days', window: '0-30 Days', status: 'critical' as const },
    { label: '31-60 Days', window: '31-60 Days', status: 'serious' as const },
    { label: '61-90 Days', window: '61-90 Days', status: 'warning' as const },
    { label: 'Missing SOL', window: 'Missing SOL', status: 'critical' as const },
  ].map((r) => ({ label: r.label, value: count((s) => s.metrics.sol === r.window), status: r.status }));

  const categories = Object.keys(CATEGORY_LABELS) as ChecklistCategory[];
  const completionRows = categories.map((cat) => {
    const pcts = active.map((s) => s.metrics.stats.find((c) => c.category === cat)!.pct);
    return {
      label: CATEGORY_LABELS[cat],
      value: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
    };
  });

  const worst = [...active]
    .sort((a, b) => healthRank(b.metrics) - healthRank(a.metrics))
    .slice(0, 10);

  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-sub">Live operational metrics computed from case data. No formulas to maintain.</p>

      <div className="view-switcher" aria-label="Dashboard view">
        {(['pipeline', 'graph', 'line', 'pie'] as DashboardViewMode[]).map((mode) => (
          <Link className={selectedView === mode ? 'active' : ''} href={`/app/dashboard?view=${mode}`} key={mode}>
            {mode === 'pipeline' ? 'Pipeline' : mode === 'graph' ? 'Graph Charts' : mode === 'line' ? 'Line Charts' : 'Pie Charts'}
          </Link>
        ))}
      </div>

      <div className="tiles">
        <Tile label="Active Cases" value={active.length} />
        <Tile label="Red Files" value={red} tone={red > 0 ? 'alert' : 'good'} />
        <Tile label="Yellow Files" value={yellow} />
        <Tile label="Green Files" value={green} tone="good" />
        <Tile label="Overdue SLA" value={overdue} tone={overdue > 0 ? 'alert' : 'good'} />
        <Tile label="Avg QC Score" value={avgQc} />
        {showRevenueForecast ? <Tile label="Revenue Forecast" value={fmtMoney(revenue)} /> : null}
      </div>
      <div className="tiles">
        <Tile label="Avg File Completion" value={`${avgCompletion}%`} />
        <Tile label="Ready for Demand" value={ready} tone="good" />
        <Tile label="SOL < 90 Days" value={sol90} tone={sol90 > 0 ? 'alert' : 'good'} />
        <Tile label="Missing Critical Items" value={criticalMissing} tone={criticalMissing > 0 ? 'alert' : 'good'} />
      </div>

      <DashboardCharts
        byStage={byStage}
        byStatus={byStatus}
        solRows={solRows}
        completionRows={completionRows}
        selectedView={selectedView}
      />

      <div className="card">
        <h2>Files Needing Attention <span className="hint">- worst health first</span></h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Case</th>
                {showFirmColumn ? <th>Firm</th> : null}
                <th>Manager</th>
                <th>Stage</th>
                <th>Health</th>
                <th>SLA</th>
                <th>SOL</th>
                <th>Completion</th>
                <th className="num">Critical Missing</th>
              </tr>
            </thead>
            <tbody>
              {worst.map(({ case: c, metrics: m }) => (
                <tr key={c.id}>
                  <td><Link href={`/app/cases/${c.id}`}>{c.caseNumber}</Link></td>
                  {showFirmColumn ? <td>{c.tenant?.name}</td> : null}
                  <td>{c.caseManager?.name ?? '-'}</td>
                  <td>{c.stage}</td>
                  <td><HealthBadge health={m.health} /></td>
                  <td><SlaBadge sla={m.sla} /></td>
                  <td><SolBadge sol={m.sol} days={m.solDays} /></td>
                  <td style={{ minWidth: 120 }}><Meter pct={m.overallPct} /></td>
                  <td className="num">{m.criticalMissing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function healthRank(m: CaseMetrics) {
  const health = m.health === 'Red' ? 2 : m.health === 'Yellow' ? 1 : 0;
  return health * 1000 + m.criticalMissing * 10 + (m.sla === 'Overdue' ? 100 : 0);
}

export function FirmPerformanceTable({
  groups,
  showRevenueForecast,
}: {
  groups: { name: string; href?: string; scored: ScoredCase[] }[];
  showRevenueForecast: boolean;
}) {
  return (
    <div className="card">
      <h2>Firm Performance</h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Firm</th>
              <th className="num">Active</th>
              <th className="num">Red</th>
              <th className="num">Overdue SLA</th>
              <th className="num">Ready for Demand</th>
              <th className="num">SOL &lt; 90</th>
              <th className="num">Avg Completion</th>
              {showRevenueForecast ? <th className="num">Revenue Forecast</th> : null}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const red = g.scored.filter((s) => s.metrics.health === 'Red').length;
              const overdue = g.scored.filter((s) => s.metrics.sla === 'Overdue').length;
              const ready = g.scored.filter((s) => s.metrics.readyForDemand).length;
              const sol = g.scored.filter((s) => ['Expired', '0-30 Days', '31-60 Days', '61-90 Days'].includes(s.metrics.sol)).length;
              const comp = g.scored.length ? Math.round(g.scored.reduce((a, s) => a + s.metrics.overallPct, 0) / g.scored.length) : 0;
              const rev = g.scored.reduce((a, s) => a + s.case.revenueForecast, 0);
              return (
                <tr key={g.name}>
                  <td>{g.href ? <Link href={g.href}>{g.name}</Link> : g.name}</td>
                  <td className="num">{g.scored.length}</td>
                  <td className="num">{red}</td>
                  <td className="num">{overdue}</td>
                  <td className="num">{ready}</td>
                  <td className="num">{sol}</td>
                  <td className="num">{comp}%</td>
                  {showRevenueForecast ? <td className="num">{fmtMoney(rev)}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function normalizeViewMode(viewMode?: string): DashboardViewMode {
  return viewMode === 'graph' || viewMode === 'line' || viewMode === 'pie' ? viewMode : 'pipeline';
}

function DashboardCharts({
  byStage,
  byStatus,
  solRows,
  completionRows,
  selectedView,
}: {
  byStage: BasicRow[];
  byStatus: BasicRow[];
  solRows: (BasicRow & { status: 'critical' | 'serious' | 'warning' })[];
  completionRows: BasicRow[];
  selectedView: DashboardViewMode;
}) {
  if (selectedView === 'graph') {
    return (
      <div className="grid-2">
        <GraphCard title="Case Pipeline" rows={byStage} />
        <GraphCard title="Status Distribution" rows={byStatus} />
        <GraphCard title="SOL Risk" rows={solRows} />
        <GraphCard title="Completion by Category" rows={completionRows} percent />
      </div>
    );
  }

  if (selectedView === 'line') {
    return (
      <div className="grid-2">
        <LineCard title="Pipeline Trend" rows={byStage} />
        <LineCard title="Status Trend" rows={byStatus} />
        <LineCard title="SOL Risk Trend" rows={solRows} />
        <LineCard title="Completion Trend" rows={completionRows} percent />
      </div>
    );
  }

  if (selectedView === 'pie') {
    return (
      <div className="grid-2">
        <PieCard title="Case Pipeline" rows={byStage} />
        <PieCard title="Status Distribution" rows={byStatus} />
        <PieCard title="SOL Risk" rows={solRows} />
        <PieCard title="Completion by Category" rows={completionRows} percent />
      </div>
    );
  }

  return (
    <div className="grid-2">
      <div className="card">
        <h2>Case Pipeline <span className="hint">- cases by stage</span></h2>
        <BarList rows={byStage} />
      </div>
      <div className="card">
        <h2>Status Distribution</h2>
        <BarList rows={byStatus} />
      </div>
      <div className="card">
        <h2>SOL Risk <span className="hint">- statute of limitations windows</span></h2>
        <BarList rows={solRows} statusColors />
      </div>
      <div className="card">
        <h2>Completion by Category <span className="hint">- avg % across active files</span></h2>
        {completionRows.map((r) => (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, alignItems: 'center', margin: '8px 0' }}>
            <span className="small" style={{ color: 'var(--ink-2)' }}>{r.label}</span>
            <Meter pct={r.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

function GraphCard({ title, rows, percent }: { title: string; rows: BasicRow[]; percent?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="card chart-card">
      <h2>{title}</h2>
      <div className="column-chart">
        {rows.map((row, index) => (
          <div className="column-item" key={row.label}>
            <div className="column-value">{percent ? `${row.value}%` : row.value}</div>
            <div className={`column-fill s${(index % 5) + 1}`} style={{ height: `${Math.max(8, (row.value / max) * 100)}%` }} />
            <span>{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineCard({ title, rows, percent }: { title: string; rows: BasicRow[]; percent?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const padded = rows.length > 1 ? rows : [{ label: 'Start', value: 0 }, ...rows, { label: 'End', value: rows[0]?.value ?? 0 }];
  const primaryPoints = smoothSeries(padded.map((row, index) => {
    const x = padded.length === 1 ? 50 : (index / (padded.length - 1)) * 100;
    const y = 88 - (row.value / max) * 68;
    return { x, y };
  }));
  const benchmarkPoints = smoothSeries(padded.map((row, index) => {
    const x = padded.length === 1 ? 50 : (index / (padded.length - 1)) * 100;
    const y = 38 + Math.sin(index * 0.9) * 2 + (percent ? 0 : 4);
    return { x, y };
  }));
  const areaPath = `${primaryPoints} L 100 94 L 0 94 Z`;

  return (
    <div className="card chart-card signal-card">
      <div className="signal-head">
        <h2>{title}</h2>
        <span>{percent ? 'Completion %' : 'Case volume'}</span>
      </div>
      <svg className="signal-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={title}>
        <defs>
          <linearGradient id={`area-${slug(title)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-line-1)" stopOpacity="0.36" />
            <stop offset="100%" stopColor="var(--chart-line-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 38, 56, 74, 92].map((y) => <line className="signal-grid" key={y} x1="0" x2="100" y1={y} y2={y} />)}
        {[0, 25, 50, 75, 100].map((x) => <line className="signal-grid soft" key={x} x1={x} x2={x} y1="14" y2="94" />)}
        <path className="signal-area" d={areaPath} fill={`url(#area-${slug(title)})`} />
        <path className="signal-benchmark" d={benchmarkPoints} />
        <path className="signal-primary" d={primaryPoints} />
      </svg>
      <div className="signal-axis y">
        <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
      </div>
      <div className="signal-axis x">
        {sampleLabels(padded).map((row, index) => <span key={`${row.label}-${index}`}>{row.label}</span>)}
      </div>
      <div className="chart-legend-list">
        {rows.slice(0, 6).map((row) => <span key={row.label}>{row.label}: {percent ? `${row.value}%` : row.value}</span>)}
        {rows.length > 6 ? <span>+{rows.length - 6} more</span> : null}
      </div>
    </div>
  );
}

function smoothSeries(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  return points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function sampleLabels(rows: BasicRow[]) {
  if (rows.length <= 3) return rows;
  return [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]];
}

function PieCard({ title, rows, percent }: { title: string; rows: BasicRow[]; percent?: boolean }) {
  const total = Math.max(1, rows.reduce((sum, row) => sum + row.value, 0));
  let cursor = 0;
  const gradient = rows.map((row, index) => {
    const start = cursor;
    cursor += (row.value / total) * 100;
    return `var(--series-${(index % 5) + 1}) ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className="card chart-card pie-card">
      <h2>{title}</h2>
      <div className="pie-chart" style={{ background: `conic-gradient(${gradient || 'var(--grid) 0 100%'})` }} />
      <div className="chart-legend-list">
        {rows.map((row) => <span key={row.label}>{row.label}: {percent ? `${row.value}%` : row.value}</span>)}
      </div>
    </div>
  );
}
