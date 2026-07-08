// The calculation engine that replaces the spreadsheet formulas:
// completion percentages, SLA / SOL status, file health, demand readiness,
// alerts. Pure functions over a case + its checklist/treatments.

import type { Case, ChecklistItem, TreatmentEntry } from '@prisma/client';
import { CATEGORY_LABELS, type ChecklistCategory } from './constants';

export type CaseWithDetail = Case & {
  checklist: ChecklistItem[];
  treatments: TreatmentEntry[];
  caseManager?: { id: string; name: string } | null;
  tenant?: { id: string; name: string } | null;
};

export const DAY_MS = 86_400_000;

export function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export interface CategoryStats {
  category: ChecklistCategory;
  label: string;
  total: number;
  yes: number;
  pending: number;
  missing: number; // No + Pending
  na: number;
  pct: number; // yes / (total - na), 0..100
  criticalMissing: number;
}

export function categoryStats(items: ChecklistItem[]): CategoryStats[] {
  const cats = Object.keys(CATEGORY_LABELS) as ChecklistCategory[];
  return cats.map((category) => {
    const rows = items.filter((i) => i.category === category);
    const yes = rows.filter((i) => i.value === 'Yes').length;
    const na = rows.filter((i) => i.value === 'N/A').length;
    const pending = rows.filter((i) => i.value === 'Pending').length;
    const denom = rows.length - na;
    return {
      category,
      label: CATEGORY_LABELS[category],
      total: rows.length,
      yes,
      pending,
      na,
      missing: rows.length - na - yes,
      pct: denom > 0 ? Math.round((yes / denom) * 100) : 100,
      criticalMissing: rows.filter((i) => i.critical && i.value !== 'Yes' && i.value !== 'N/A').length,
    };
  });
}

export function overallCompletion(stats: CategoryStats[]) {
  const total = stats.reduce((s, c) => s + c.total - c.na, 0);
  const yes = stats.reduce((s, c) => s + c.yes, 0);
  return total > 0 ? Math.round((yes / total) * 100) : 0;
}

export function missingCriticalCount(stats: CategoryStats[]) {
  return stats.reduce((s, c) => s + c.criticalMissing, 0);
}

export type SlaStatus = 'On Track' | 'At Risk' | 'Overdue' | 'No Due Date';

export function slaStatus(c: Case, now = new Date()): SlaStatus {
  if (!c.nextDue) return 'No Due Date';
  const days = daysBetween(now, c.nextDue);
  if (days < 0) return 'Overdue';
  if (days <= 2) return 'At Risk';
  return 'On Track';
}

export type SolWindow = 'Missing SOL' | 'Expired' | '0-30 Days' | '31-60 Days' | '61-90 Days' | 'Clear';

export function solDaysRemaining(c: Case, now = new Date()): number | null {
  if (!c.solDate) return null;
  return daysBetween(now, c.solDate);
}

export function solWindow(c: Case, now = new Date()): SolWindow {
  const days = solDaysRemaining(c, now);
  if (days === null) return 'Missing SOL';
  if (days < 0) return 'Expired';
  if (days <= 30) return '0-30 Days';
  if (days <= 60) return '31-60 Days';
  if (days <= 90) return '61-90 Days';
  return 'Clear';
}

export function daysSinceActivity(c: Case, now = new Date()) {
  return daysBetween(c.lastActivity, now);
}

export type ContactAlert = 'OK' | 'Stale' | 'Missing';

export function contactAlert(c: Case, now = new Date()): ContactAlert {
  if (!c.lastClientContact) return 'Missing';
  return daysBetween(c.lastClientContact, now) > 14 ? 'Stale' : 'OK';
}

export type Health = 'Green' | 'Yellow' | 'Red';

export interface CaseMetrics {
  stats: CategoryStats[];
  overallPct: number;
  criticalMissing: number;
  sla: SlaStatus;
  sol: SolWindow;
  solDays: number | null;
  contact: ContactAlert;
  daysSinceActivity: number;
  health: Health;
  readyForDemand: boolean;
  treatment: TreatmentSummary;
}

export interface TreatmentSummary {
  entries: number;
  billsMissing: number;
  recordsMissing: number;
  next7Days: number;
  doneTreating: boolean;
  activeTreatment: boolean;
}

export function treatmentSummary(treatments: TreatmentEntry[], now = new Date()): TreatmentSummary {
  const billsMissing = treatments.filter((t) => t.billReceived === 'No' || t.billReceived === 'Pending').length;
  const recordsMissing = treatments.filter((t) => t.recordReceived === 'No' || t.recordReceived === 'Pending').length;
  const next7Days = treatments.filter(
    (t) => t.nextApptDate && daysBetween(now, t.nextApptDate) >= 0 && daysBetween(now, t.nextApptDate) <= 7,
  ).length;
  const doneTreating = treatments.length > 0 && treatments.every((t) => t.doneTreating);
  return {
    entries: treatments.length,
    billsMissing,
    recordsMissing,
    next7Days,
    doneTreating,
    activeTreatment: treatments.length > 0 && !doneTreating,
  };
}

export function computeMetrics(c: CaseWithDetail, now = new Date()): CaseMetrics {
  const stats = categoryStats(c.checklist);
  const overallPct = overallCompletion(stats);
  const criticalMissing = missingCriticalCount(stats);
  const sla = slaStatus(c, now);
  const sol = solWindow(c, now);
  const contact = contactAlert(c, now);
  const demand = stats.find((s) => s.category === 'DEMAND')!;
  const medical = stats.find((s) => s.category === 'MEDICAL')!;
  const insurance = stats.find((s) => s.category === 'INSURANCE')!;

  const readyForDemand =
    medical.pct === 100 && insurance.pct === 100 && demand.criticalMissing === 0 && overallPct >= 85;

  let health: Health = 'Green';
  const idle = daysSinceActivity(c, now);
  if (
    sla === 'Overdue' ||
    sol === 'Expired' ||
    sol === '0-30 Days' ||
    contact === 'Missing' ||
    criticalMissing >= 5 ||
    idle > 10
  ) {
    health = 'Red';
  } else if (
    sla === 'At Risk' ||
    sol === '31-60 Days' ||
    contact === 'Stale' ||
    criticalMissing > 0 ||
    (c.qcScore !== null && c.qcScore < 85)
  ) {
    health = 'Yellow';
  }

  return {
    stats,
    overallPct,
    criticalMissing,
    sla,
    sol,
    solDays: solDaysRemaining(c, now),
    contact,
    daysSinceActivity: idle,
    health,
    readyForDemand,
    treatment: treatmentSummary(c.treatments, now),
  };
}

export interface CaseAlert {
  caseId: string;
  caseNumber: string;
  tenantName: string;
  type: string;
  severity: 'Critical' | 'High' | 'Monitor';
  action: string;
  owner: string;
}

/** The "Alerts & Automation" sheet rules, computed live. */
export function caseAlerts(c: CaseWithDetail, m: CaseMetrics): CaseAlert[] {
  const base = { caseId: c.id, caseNumber: c.caseNumber, tenantName: c.tenant?.name ?? '' };
  const alerts: CaseAlert[] = [];
  if (m.sla === 'Overdue')
    alerts.push({ ...base, type: 'Overdue SLA', severity: 'Critical', action: 'Review file immediately and assign next action', owner: 'Operations' });
  if (m.health === 'Red')
    alerts.push({ ...base, type: 'Red File Health', severity: 'High', action: 'Escalate to QC Lead / Executive if unresolved', owner: 'QC Lead' });
  if (m.daysSinceActivity > 10)
    alerts.push({ ...base, type: 'No Activity > 10 Days', severity: 'High', action: 'Case manager must update file same day', owner: 'Case Manager' });
  if (m.sol === 'Expired' || m.sol === '0-30 Days')
    alerts.push({ ...base, type: `SOL ${m.sol === 'Expired' ? 'Expired' : '< 30 Days'}`, severity: 'Critical', action: 'Attorney review required today', owner: 'Attorney' });
  else if (m.sol === '31-60 Days' || m.sol === '61-90 Days')
    alerts.push({ ...base, type: 'SOL < 90 Days', severity: 'High', action: 'Confirm filing plan with attorney', owner: 'Attorney' });
  else if (m.sol === 'Missing SOL')
    alerts.push({ ...base, type: 'Missing SOL Date', severity: 'Critical', action: 'Enter date of incident and statute of limitations', owner: 'Case Manager' });
  if (m.contact !== 'OK')
    alerts.push({ ...base, type: m.contact === 'Missing' ? 'No Client Contact Logged' : 'Stale Client Contact > 14 Days', severity: 'High', action: 'Contact client and log communication', owner: 'Case Manager' });
  if (m.criticalMissing > 0)
    alerts.push({ ...base, type: `${m.criticalMissing} Missing Critical Item${m.criticalMissing > 1 ? 's' : ''}`, severity: m.criticalMissing >= 5 ? 'Critical' : 'High', action: 'Collect missing critical documents', owner: 'Case Manager' });
  if (m.treatment.billsMissing + m.treatment.recordsMissing > 0)
    alerts.push({ ...base, type: 'Treatment Bills/Records Missing', severity: 'Monitor', action: 'Request outstanding bills and records from providers', owner: 'Case Manager' });
  return alerts;
}

export function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtDate(d: Date | null | undefined) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateInput(d: Date | null | undefined) {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}
