import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { loadCases } from '@/lib/case-queries';
import { audit } from '@/lib/audit';
import { fmtDateInput } from '@/lib/metrics';
import { canViewRevenueForecast } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const showRevenueForecast = canViewRevenueForecast(session);

  const p = req.nextUrl.searchParams;
  const scored = await loadCases(session, {
    tenantId: p.get('tenantId'),
    managerId: p.get('managerId'),
    includeClosed: true,
  });

  const header = [
    'Case Number', 'Firm', 'Client', 'Case Manager', 'Stage', 'Status', 'Priority',
    'Health', 'SLA Status', 'SOL Status', 'SOL Days Remaining', 'Open Date', 'Next Due',
    'Last Client Contact', 'Overall Completion %', 'Intake %', 'Investigation %',
    'Insurance %', 'Medical %', 'Liens %', 'Demand %', 'Missing Critical Items',
    'Ready for Demand', 'QC Score',
  ];
  if (showRevenueForecast) header.push('Revenue Forecast');
  header.push('Settlement Value');
  const lines = [header.join(',')];
  for (const { case: c, metrics: m } of scored) {
    const pct = (cat: string) => m.stats.find((s) => s.category === cat)?.pct ?? '';
    const row = [
      c.caseNumber, c.tenant?.name, c.clientName, c.caseManager?.name ?? '', c.stage,
      c.status, c.priority, m.health, m.sla, m.sol, m.solDays ?? '',
      fmtDateInput(c.openDate), fmtDateInput(c.nextDue), fmtDateInput(c.lastClientContact),
      m.overallPct, pct('INTAKE'), pct('INVESTIGATION'), pct('INSURANCE'), pct('MEDICAL'),
      pct('LIENS'), pct('DEMAND'), m.criticalMissing, m.readyForDemand ? 'Yes' : 'No',
      c.qcScore ?? '',
    ];
    if (showRevenueForecast) row.push(c.revenueForecast);
    row.push(c.settlementValue ?? '');
    lines.push(row.map(csvCell).join(','));
  }

  await audit(session, 'REPORT_EXPORT', 'Report', null, { rows: scored.length });

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nextus-report.csv"`,
    },
  });
}
