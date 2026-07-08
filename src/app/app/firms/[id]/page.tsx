import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { canViewRevenueForecast, isPlatform, requirePermission } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { db } from '@/lib/db';
import { Dashboard } from '@/components/dashboard';

export const dynamic = 'force-dynamic';

export default async function FirmPortalPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  requirePermission(session, isPlatform(session));

  const tenant = await db.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) notFound();

  const scored = await loadCases(session, { tenantId: tenant.id });
  return (
    <Dashboard
      scored={scored}
      title={`${tenant.name} - Client Portal`}
      showFirmColumn={false}
      showRevenueForecast={canViewRevenueForecast(session)}
    />
  );
}
