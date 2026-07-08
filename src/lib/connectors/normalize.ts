import 'server-only';
import { db } from '@/lib/db';
import { CHECKLIST_TEMPLATE, STAGES, STATUSES, PRIORITIES } from '@/lib/constants';

// The neutral case shape every connector (API pull or inbound webhook)
// normalizes to before we touch the database.
export interface NormalizedCase {
  caseNumber: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  stage?: string;
  status?: string;
  priority?: string;
  openDate?: string;
  dateOfIncident?: string;
  solDate?: string;
  nextDue?: string;
  state?: string;
  revenueForecast?: number;
  settlementValue?: number;
  caseManager?: string;
  notes?: string;
}

function asDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function inList(v: string | undefined, list: readonly string[]): string | undefined {
  if (!v) return undefined;
  return list.find((x) => x.toLowerCase() === v.toLowerCase());
}

export function coerceNormalizedCase(raw: unknown): NormalizedCase | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const caseNumber = r.caseNumber ?? r.case_number ?? r.id;
  const clientName = r.clientName ?? r.client_name ?? r.client ?? r.name;
  if (!caseNumber || !clientName) return null;
  const str = (k: string[]) => {
    for (const key of k) if (r[key] != null && r[key] !== '') return String(r[key]);
    return undefined;
  };
  const num = (k: string[]) => {
    for (const key of k) {
      const n = Number(r[key]);
      if (r[key] != null && Number.isFinite(n)) return n;
    }
    return undefined;
  };
  return {
    caseNumber: String(caseNumber).slice(0, 64),
    clientName: String(clientName).slice(0, 200),
    clientPhone: str(['clientPhone', 'client_phone', 'phone']),
    clientEmail: str(['clientEmail', 'client_email', 'email']),
    stage: str(['stage']),
    status: str(['status', 'case_status']),
    priority: str(['priority']),
    openDate: str(['openDate', 'open_date', 'date_opened', 'created_at', 'createdDate']),
    dateOfIncident: str(['dateOfIncident', 'date_of_incident', 'incident_date', 'incidentDate']),
    solDate: str(['solDate', 'sol_date', 'statute_of_limitations']),
    nextDue: str(['nextDue', 'next_due']),
    state: str(['state', 'incident_state']),
    revenueForecast: num(['revenueForecast', 'revenue_forecast']),
    settlementValue: num(['settlementValue', 'settlement_value', 'settlement']),
    caseManager: str(['caseManager', 'case_manager']),
    notes: str(['notes', 'description']),
  };
}

export interface UpsertSummary {
  created: number;
  updated: number;
  skipped: number;
}

/** Upsert normalized external cases into a tenant. Never crosses tenants. */
export async function upsertNormalizedCases(tenantId: string, items: NormalizedCase[]): Promise<UpsertSummary> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item?.caseNumber || !item?.clientName) {
      skipped++;
      continue;
    }
    let managerId: string | null | undefined;
    if (item.caseManager) {
      const mgr = await db.user.findFirst({
        where: { role: 'CASE_MANAGER', active: true, name: { startsWith: item.caseManager.split(' ')[0] } },
      });
      managerId = mgr?.id ?? undefined;
    }

    const core = {
      clientName: item.clientName,
      clientPhone: item.clientPhone ?? undefined,
      clientEmail: item.clientEmail ?? undefined,
      stage: inList(item.stage, STAGES),
      status: inList(item.status, STATUSES),
      priority: inList(item.priority, PRIORITIES),
      openDate: asDate(item.openDate) ?? undefined,
      dateOfIncident: asDate(item.dateOfIncident) ?? undefined,
      solDate: asDate(item.solDate) ?? undefined,
      nextDue: asDate(item.nextDue) ?? undefined,
      state: item.state ?? undefined,
      revenueForecast: item.revenueForecast ?? undefined,
      settlementValue: item.settlementValue ?? undefined,
      caseManagerId: managerId,
      notes: item.notes ?? undefined,
      lastActivity: new Date(),
    };

    const existing = await db.case.findUnique({
      where: { tenantId_caseNumber: { tenantId, caseNumber: item.caseNumber } },
    });
    if (existing) {
      await db.case.update({ where: { id: existing.id }, data: core });
      updated++;
    } else {
      await db.case.create({
        data: {
          tenantId,
          caseNumber: item.caseNumber,
          ...core,
          clientName: item.clientName,
          checklist: {
            create: CHECKLIST_TEMPLATE.map((t, idx) => ({
              category: t.category,
              key: t.key,
              label: t.label,
              critical: t.critical,
              sortOrder: idx,
            })),
          },
        },
      });
      created++;
    }
  }
  return { created, updated, skipped };
}
