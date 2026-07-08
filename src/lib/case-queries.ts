import 'server-only';
import { db } from './db';
import type { Session } from './auth';
import { tenantScope } from './rbac';
import type { Note } from '@prisma/client';
import { computeMetrics, type CaseWithDetail, type CaseMetrics } from './metrics';

export type CaseDetail = CaseWithDetail & { caseNotes: Note[] };

export interface ScoredCase {
  case: CaseWithDetail;
  metrics: CaseMetrics;
}

export interface CaseFilters {
  tenantId?: string | null;
  managerId?: string | null;
  stage?: string | null;
  status?: string | null;
  priority?: string | null;
  health?: string | null;
  q?: string | null;
  includeClosed?: boolean;
}

/** The one gateway for reading cases - always tenant-scoped via session. */
export async function loadCases(session: Session, filters: CaseFilters = {}): Promise<ScoredCase[]> {
  const where: Record<string, unknown> = {
    ...tenantScope(session, filters.tenantId),
  };
  if (!filters.includeClosed) where.closedAt = null;
  if (filters.managerId) where.caseManagerId = filters.managerId;
  if (filters.stage) where.stage = filters.stage;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.q) {
    where.OR = [
      { caseNumber: { contains: filters.q } },
      { clientName: { contains: filters.q } },
    ];
  }

  const cases = await db.case.findMany({
    where,
    include: {
      checklist: true,
      treatments: true,
      caseManager: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { caseNumber: 'asc' },
  });

  const now = new Date();
  let scored = cases.map((c) => ({ case: c as CaseWithDetail, metrics: computeMetrics(c as CaseWithDetail, now) }));
  if (filters.health) scored = scored.filter((s) => s.metrics.health === filters.health);
  return scored;
}

/** Load one case, enforcing tenant scope. Returns null if out of scope. */
export async function loadCase(
  session: Session,
  id: string,
): Promise<{ case: CaseDetail; metrics: CaseMetrics } | null> {
  const c = await db.case.findFirst({
    where: { id, ...tenantScope(session) },
    include: {
      checklist: { orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
      treatments: { orderBy: { dosDate: 'desc' } },
      caseNotes: { orderBy: { createdAt: 'desc' } },
      caseManager: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
  });
  if (!c) return null;
  return { case: c as CaseDetail, metrics: computeMetrics(c as CaseDetail) };
}
