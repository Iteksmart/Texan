'use server';

import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { canImport } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { CHECKLIST_TEMPLATE } from '@/lib/constants';

// Maps spreadsheet Yes/No-ish cells to checklist values.
function asValue(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (['Yes', 'No', 'Pending', 'N/A'].includes(s)) return s;
  if (s === '1' || s.toLowerCase() === 'true') return 'Yes';
  if (s === '0' || s.toLowerCase() === 'false') return 'No';
  return null;
}

function asDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const parsed = new Date(String(v));
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Spreadsheet column header -> checklist template key
const COLUMN_TO_KEY: Record<string, string> = {
  'Intake': 'intake_packet',
  'Welcome Call Completed': 'welcome_call',
  'Meeting/Photo of Client': 'meeting_photo',
  "Driver's License Received": 'drivers_license',
  'Health Insurance Card Received': 'health_insurance_card',
  'Photos Received': 'photos_received',
  'Lost Wages': 'lost_wages',
  'Police Report': 'police_report',
  'Witness Statements': 'witness_statements',
  'Citation/Traffic Info': 'citation_info',
  'Facebook Searches': 'facebook_searches',
  'Google Earth Images': 'google_earth',
  '911 Calls': 'calls_911',
  'CAD': 'cad_report',
  'Dash Cam': 'dash_cam',
  'BWC': 'bwc',
  'Video Surveillance': 'video_surveillance',
  'HALO': 'halo',
  'Driver History Report': 'driver_history',
  'Letter of Representation to 1P': 'lor_1p',
  'Acknowledgment of LOR Received 1P': 'ack_1p',
  'Dec Page 1P': 'dec_page_1p',
  'Letter of Representation to 3P': 'lor_3p',
  'Acknowledgment of LOR Received 3P': 'ack_3p',
  'Dec Page 3P': 'dec_page_3p',
  'EMS Record': 'ems_record',
  'EMS Bill': 'ems_bill',
  'Urgent Care Record': 'urgent_care_record',
  'Urgent Care Bill': 'urgent_care_bill',
  'ER Record': 'er_record',
  'ER bill': 'er_bill',
  'ER Physician Bill': 'er_physician_bill',
  'ER Radiology Bill': 'er_radiology_bill',
  'Subrogation Letter Sent Out': 'subro_letter_sent',
  'Acknowledgment Letter Received': 'subro_ack_received',
  'Lien Ledger Received': 'lien_ledger_received',
  'Demand Sent': 'demand_sent',
  '3P Confirmed Receipt of Demand': 'receipt_3p',
  '1P Confirmed Receipt of Demand': 'receipt_1p',
  'Medpay/PIP Demand': 'medpay_pip',
};

export interface ImportResult {
  ok?: string;
  error?: string;
}

export async function importSpreadsheetAction(_prev: ImportResult | undefined, formData: FormData): Promise<ImportResult> {
  const session = await requireSession();
  if (!canImport(session)) return { error: 'Only platform super-admins can import.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose an .xlsx file to upload.' };
  if (file.size > 10 * 1024 * 1024) return { error: 'File too large (10 MB max).' };

  let rows: Record<string, unknown>[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const sheetName = wb.SheetNames.find((n) => n.trim().toLowerCase() === 'source data') ?? wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    // TCS Nexus workbook: title rows above, headers on row 4 (index 3)
    const probe = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, range: 0 }) as unknown as unknown[][];
    let headerRow = 0;
    for (let r = 0; r < Math.min(10, probe.length); r++) {
      const cells = (probe[r] ?? []).map((c) => String(c ?? ''));
      if (cells.includes('Case ID') && cells.includes('Client')) { headerRow = r; break; }
    }
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { range: headerRow, defval: null });
  } catch (e) {
    return { error: `Could not read the workbook: ${e instanceof Error ? e.message : 'unknown error'}` };
  }

  let createdTenants = 0;
  let createdCases = 0;
  let updatedCases = 0;
  let skipped = 0;

  const tenantCache = new Map<string, string>();

  for (const row of rows) {
    const caseNumber = row['Case ID'] ? String(row['Case ID']).trim() : null;
    const firmName = row['Client'] ? String(row['Client']).trim() : null;
    if (!caseNumber || !firmName) { skipped++; continue; }

    // find-or-create tenant per firm
    let tenantId = tenantCache.get(firmName);
    if (!tenantId) {
      const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let tenant = await db.tenant.findFirst({ where: { OR: [{ name: firmName }, { slug }] } });
      if (!tenant) {
        tenant = await db.tenant.create({ data: { name: firmName, slug, status: 'ONBOARDING' } });
        createdTenants++;
      }
      tenantId = tenant.id;
      tenantCache.set(firmName, tenantId);
    }

    // match case manager by name prefix
    let caseManagerId: string | null = null;
    if (row['Case Manager']) {
      const mgr = await db.user.findFirst({
        where: { role: 'CASE_MANAGER', name: { startsWith: String(row['Case Manager']).split(' ')[0] } },
      });
      caseManagerId = mgr?.id ?? null;
    }

    const core = {
      clientName: row['Client Name'] ? String(row['Client Name']) : `Client for ${caseNumber}`,
      caseManagerId,
      stage: String(row['Stage'] ?? 'Intake'),
      status: String(row['Status'] ?? 'New'),
      priority: String(row['Priority'] ?? 'Normal'),
      openDate: asDate(row['Open Date']) ?? new Date(),
      lastActivity: asDate(row['Last Activity']) ?? new Date(),
      nextDue: asDate(row['Next Due']),
      slaDays: Number(row['SLA Days'] ?? 7) || 7,
      qcScore: row['QC Score'] != null && row['QC Score'] !== '' ? Number(row['QC Score']) : null,
      revenueForecast: Number(row['Revenue Forecast'] ?? 0) || 0,
      settlementValue: row['Settlement Value'] != null && row['Settlement Value'] !== '' ? Number(row['Settlement Value']) : null,
      openIssues: Number(row['Open Issues'] ?? 0) || 0,
      lienStatus: row['Lien Status'] ? String(row['Lien Status']) : null,
      lastClientContact: asDate(row['Client Contact'] ?? row['Last Client Communication']),
      dateOfIncident: asDate(row['Date of Incident']),
      solDate: asDate(row['Statute of Limitations']),
      state: row['State where Incident Occurred'] ? String(row['State where Incident Occurred']) : null,
      notes: row['Notes'] ? String(row['Notes']) : null,
    };

    const checklistValues = CHECKLIST_TEMPLATE.map((t, idx) => {
      const header = Object.keys(COLUMN_TO_KEY).find((h) => COLUMN_TO_KEY[h] === t.key);
      const v = header ? asValue(row[header]) : null;
      return { template: t, idx, value: v ?? 'No' };
    });

    const existing = await db.case.findUnique({
      where: { tenantId_caseNumber: { tenantId, caseNumber } },
    });

    if (existing) {
      await db.case.update({ where: { id: existing.id }, data: core });
      for (const cv of checklistValues) {
        await db.checklistItem.upsert({
          where: { caseId_key: { caseId: existing.id, key: cv.template.key } },
          update: { value: cv.value },
          create: {
            caseId: existing.id, key: cv.template.key, label: cv.template.label,
            category: cv.template.category, critical: cv.template.critical,
            sortOrder: cv.idx, value: cv.value,
          },
        });
      }
      updatedCases++;
    } else {
      await db.case.create({
        data: {
          caseNumber,
          tenantId,
          ...core,
          checklist: {
            create: checklistValues.map((cv) => ({
              key: cv.template.key, label: cv.template.label, category: cv.template.category,
              critical: cv.template.critical, sortOrder: cv.idx, value: cv.value,
            })),
          },
        },
      });
      createdCases++;
    }
  }

  await audit(session, 'IMPORT', 'Spreadsheet', null, {
    file: file.name, createdTenants, createdCases, updatedCases, skipped,
  });
  revalidatePath('/app', 'layout');

  return {
    ok: `Import complete: ${createdCases} cases created, ${updatedCases} updated, ${createdTenants} new firm${createdTenants === 1 ? '' : 's'} onboarded${skipped ? `, ${skipped} rows skipped` : ''}.`,
  };
}
