import { requireSession } from '@/lib/auth';
import { canViewRevenueForecast, isPlatform } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { Dashboard, FirmPerformanceTable } from '@/components/dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams?: { view?: string } }) {
  const session = await requireSession();
  const scored = await loadCases(session);

  const platform = isPlatform(session);
  const title = platform ? 'Executive Portal — Company-wide' : `${session.tenantName} — Firm Dashboard`;

  let firmGroups: { name: string; href: string; scored: typeof scored }[] = [];
  if (platform) {
    const byFirm = new Map<string, typeof scored>();
    for (const s of scored) {
      const key = s.case.tenant?.name ?? 'Unknown';
      if (!byFirm.has(key)) byFirm.set(key, []);
      byFirm.get(key)!.push(s);
    }
    firmGroups = [...byFirm.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, cases]) => ({ name, href: `/app/firms/${cases[0].case.tenant?.id}`, scored: cases }));
  }

  return (
    <>
      <Dashboard
        scored={scored}
        title={title}
        showFirmColumn={platform}
        showRevenueForecast={canViewRevenueForecast(session)}
        viewMode={searchParams?.view}
      />
      {platform ? <FirmPerformanceTable groups={firmGroups} showRevenueForecast={canViewRevenueForecast(session)} /> : null}
    </>
  );
}
