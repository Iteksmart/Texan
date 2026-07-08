import { requireSession } from '@/lib/auth';
import { canViewRevenueForecast, isPlatform, requirePermission } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { FirmPerformanceTable } from '@/components/dashboard';

export const dynamic = 'force-dynamic';

// Platform view listing every firm (tenant) with drill-down portals —
// replaces the Client Portal sheet's firm dropdown.
export default async function FirmsPage() {
  const session = await requireSession();
  requirePermission(session, isPlatform(session));

  const scored = await loadCases(session);
  const byFirm = new Map<string, typeof scored>();
  for (const s of scored) {
    const key = s.case.tenant?.name ?? 'Unknown';
    if (!byFirm.has(key)) byFirm.set(key, []);
    byFirm.get(key)!.push(s);
  }
  const groups = [...byFirm.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, cases]) => ({ name, href: `/app/firms/${cases[0].case.tenant?.id}`, scored: cases }));

  return (
    <>
      <h1 className="page-title">Firm Portals</h1>
      <p className="page-sub">Select a law firm to open its client-facing portal view.</p>
      <FirmPerformanceTable groups={groups} showRevenueForecast={canViewRevenueForecast(session)} />
    </>
  );
}
