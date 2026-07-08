import { requireSession } from '@/lib/auth';
import { canImport, requirePermission } from '@/lib/rbac';
import { ImportForm } from './import-form';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const session = await requireSession();
  requirePermission(session, canImport(session));

  return (
    <>
      <h1 className="page-title">Spreadsheet Import</h1>
      <p className="page-sub">
        Upload the TCS Nexus OMS workbook (.xlsx). The Source Data sheet is parsed, firms become tenants,
        and cases (with their document checklists) are created or updated — no manual re-keying.
      </p>

      <div className="card">
        <ImportForm />
        <div className="small muted" style={{ marginTop: 14 }}>
          <b>How it maps:</b>
          <ul style={{ marginTop: 6 }}>
            <li><b>Client</b> column → tenant (firm) — new firms are onboarded automatically in ONBOARDING status</li>
            <li><b>Case ID</b> → case number (re-importing the same file updates cases instead of duplicating)</li>
            <li>Stage, status, priority, dates, QC, revenue, settlement → case fields</li>
            <li>All Yes/No tracker columns (police report, LORs, dec pages, ER records…) → document checklist</li>
            <li><b>Case Manager</b> → matched to platform case-manager accounts by first name</li>
          </ul>
        </div>
      </div>
    </>
  );
}
