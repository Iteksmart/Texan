'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { canEditCases, tenantScope } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { CHECKLIST_TEMPLATE, SOL_YEARS_BY_STATE, YES_NO } from '@/lib/constants';

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v === null || v === '') return null;
  return String(v);
}

function date(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  return v ? new Date(`${v}T00:00:00`) : null;
}

function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function requireEditor() {
  const session = await requireSession();
  if (!canEditCases(session)) throw new Error('You do not have permission to edit cases.');
  return session;
}

/** Load a case only if it's inside the caller's tenant scope. */
async function scopedCase(session: Awaited<ReturnType<typeof requireSession>>, caseId: string) {
  const c = await db.case.findFirst({ where: { id: caseId, ...tenantScope(session) } });
  if (!c) throw new Error('Case not found or out of scope.');
  return c;
}

export async function createCaseAction(formData: FormData) {
  const session = await requireEditor();

  // tenant users can only create in their own tenant
  const tenantId = session.tenantId ?? str(formData, 'tenantId');
  if (!tenantId) throw new Error('A firm is required.');

  const dateOfIncident = date(formData, 'dateOfIncident');
  const state = str(formData, 'state') ?? 'Other';
  let solDate = date(formData, 'solDate');
  if (!solDate && dateOfIncident) {
    solDate = new Date(dateOfIncident);
    solDate.setFullYear(solDate.getFullYear() + (SOL_YEARS_BY_STATE[state] ?? 2));
  }

  // auto-number per tenant: highest numeric suffix + 1
  let caseNumber = str(formData, 'caseNumber');
  if (!caseNumber) {
    const last = await db.case.findMany({
      where: { tenantId },
      select: { caseNumber: true },
    });
    const max = last.reduce((m, c) => {
      const n = Number(c.caseNumber.replace(/\D+/g, ''));
      return Number.isFinite(n) && n > m ? n : m;
    }, 1000);
    caseNumber = `CSM-${max + 1}`;
  }

  const created = await db.case.create({
    data: {
      caseNumber,
      tenantId,
      clientName: str(formData, 'clientName') ?? 'Unknown Client',
      clientPhone: str(formData, 'clientPhone'),
      clientEmail: str(formData, 'clientEmail'),
      caseManagerId: str(formData, 'caseManagerId'),
      stage: str(formData, 'stage') ?? 'Intake',
      status: str(formData, 'status') ?? 'New',
      priority: str(formData, 'priority') ?? 'Normal',
      nextDue: date(formData, 'nextDue'),
      slaDays: num(formData, 'slaDays') ?? 7,
      revenueForecast: num(formData, 'revenueForecast') ?? 0,
      dateOfIncident,
      solDate,
      state,
      notes: str(formData, 'notes'),
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

  await audit(session, 'CASE_CREATE', 'Case', created.id, { caseNumber }, tenantId);
  revalidatePath('/app', 'layout');
  redirect(`/app/cases/${created.id}`);
}

export async function updateCaseAction(formData: FormData) {
  const session = await requireEditor();
  const caseId = String(formData.get('caseId'));
  const existing = await scopedCase(session, caseId);

  const data = {
    clientName: str(formData, 'clientName') ?? existing.clientName,
    clientPhone: str(formData, 'clientPhone'),
    clientEmail: str(formData, 'clientEmail'),
    caseManagerId: str(formData, 'caseManagerId'),
    stage: str(formData, 'stage') ?? existing.stage,
    status: str(formData, 'status') ?? existing.status,
    priority: str(formData, 'priority') ?? existing.priority,
    nextDue: date(formData, 'nextDue'),
    slaDays: num(formData, 'slaDays') ?? existing.slaDays,
    qcScore: num(formData, 'qcScore'),
    revenueForecast: num(formData, 'revenueForecast') ?? existing.revenueForecast,
    settlementValue: num(formData, 'settlementValue'),
    openIssues: num(formData, 'openIssues') ?? existing.openIssues,
    lienStatus: str(formData, 'lienStatus'),
    lastClientContact: date(formData, 'lastClientContact'),
    dateOfIncident: date(formData, 'dateOfIncident'),
    solDate: date(formData, 'solDate'),
    state: str(formData, 'state'),
    notes: str(formData, 'notes'),
    lastActivity: new Date(),
    closedAt: str(formData, 'stage') === 'Closed' ? (existing.closedAt ?? new Date()) : null,
  };

  await db.case.update({ where: { id: caseId }, data });
  await audit(session, 'CASE_UPDATE', 'Case', caseId, { caseNumber: existing.caseNumber }, existing.tenantId);
  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath('/app/dashboard');
}

export async function setChecklistValueAction(formData: FormData) {
  const session = await requireEditor();
  const caseId = String(formData.get('caseId'));
  const key = String(formData.get('key'));
  const value = String(formData.get('value'));
  if (!(YES_NO as readonly string[]).includes(value)) throw new Error('Invalid value');

  const existing = await scopedCase(session, caseId);
  await db.checklistItem.update({
    where: { caseId_key: { caseId, key } },
    data: { value },
  });
  await db.case.update({ where: { id: caseId }, data: { lastActivity: new Date() } });
  await audit(session, 'CHECKLIST_UPDATE', 'ChecklistItem', `${caseId}:${key}`, { key, value, caseNumber: existing.caseNumber }, existing.tenantId);
  revalidatePath(`/app/cases/${caseId}`);
}

export async function addTreatmentAction(formData: FormData) {
  const session = await requireEditor();
  const caseId = String(formData.get('caseId'));
  const existing = await scopedCase(session, caseId);

  await db.treatmentEntry.create({
    data: {
      caseId,
      provider: str(formData, 'provider') ?? 'Unknown Provider',
      providerType: str(formData, 'providerType') ?? 'Other',
      dosDate: date(formData, 'dosDate'),
      billReceived: str(formData, 'billReceived') ?? 'No',
      recordReceived: str(formData, 'recordReceived') ?? 'No',
      nextApptDate: date(formData, 'nextApptDate'),
      attended: str(formData, 'attended') ?? 'Pending',
      mri: str(formData, 'mri') ?? 'N/A',
      surgeryConsult: str(formData, 'surgeryConsult') ?? 'N/A',
      doneTreating: formData.get('doneTreating') === 'on',
      notes: str(formData, 'notes'),
    },
  });
  await db.case.update({ where: { id: caseId }, data: { lastActivity: new Date() } });
  await audit(session, 'TREATMENT_ADD', 'TreatmentEntry', caseId, { caseNumber: existing.caseNumber }, existing.tenantId);
  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath('/app/treatment');
}

export async function updateTreatmentAction(formData: FormData) {
  const session = await requireEditor();
  const id = String(formData.get('treatmentId'));
  const entry = await db.treatmentEntry.findUnique({ where: { id }, include: { case: true } });
  if (!entry) throw new Error('Treatment entry not found.');
  await scopedCase(session, entry.caseId);

  const field = String(formData.get('field'));
  const value = String(formData.get('value'));
  const allowed = ['billReceived', 'recordReceived', 'attended', 'mri', 'surgeryConsult'];
  if (field === 'doneTreating') {
    await db.treatmentEntry.update({ where: { id }, data: { doneTreating: value === 'true' } });
  } else if (allowed.includes(field) && (YES_NO as readonly string[]).includes(value)) {
    await db.treatmentEntry.update({ where: { id }, data: { [field]: value } });
  } else {
    throw new Error('Invalid field');
  }
  await audit(session, 'TREATMENT_UPDATE', 'TreatmentEntry', id, { field, value }, entry.case.tenantId);
  revalidatePath(`/app/cases/${entry.caseId}`);
  revalidatePath('/app/treatment');
}

export async function addNoteAction(formData: FormData) {
  const session = await requireSession(); // any signed-in role may note
  const caseId = String(formData.get('caseId'));
  const body = str(formData, 'body');
  if (!body) return;
  const existing = await scopedCase(session, caseId);

  await db.note.create({
    data: { caseId, body, authorId: session.userId, authorName: session.name },
  });
  await db.case.update({ where: { id: caseId }, data: { lastActivity: new Date() } });
  await audit(session, 'NOTE_ADD', 'Note', caseId, { caseNumber: existing.caseNumber }, existing.tenantId);
  revalidatePath(`/app/cases/${caseId}`);
}

export async function logClientContactAction(formData: FormData) {
  const session = await requireEditor();
  const caseId = String(formData.get('caseId'));
  const existing = await scopedCase(session, caseId);
  await db.case.update({
    where: { id: caseId },
    data: { lastClientContact: new Date(), lastActivity: new Date() },
  });
  await audit(session, 'CLIENT_CONTACT', 'Case', caseId, { caseNumber: existing.caseNumber }, existing.tenantId);
  revalidatePath(`/app/cases/${caseId}`);
}
