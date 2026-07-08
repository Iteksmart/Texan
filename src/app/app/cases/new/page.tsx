import { requireSession } from '@/lib/auth';
import { isPlatform, canEditCases, canViewRevenueForecast, requirePermission } from '@/lib/rbac';
import { db } from '@/lib/db';
import { STAGES, STATUSES, PRIORITIES, STATES } from '@/lib/constants';
import { createCaseAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewCasePage() {
  const session = await requireSession();
  requirePermission(session, canEditCases(session));
  const platform = isPlatform(session);
  const showRevenueForecast = canViewRevenueForecast(session);

  const tenants = platform ? await db.tenant.findMany({ where: { status: { not: 'SUSPENDED' } }, orderBy: { name: 'asc' } }) : [];
  const managers = await db.user.findMany({ where: { role: 'CASE_MANAGER', active: true }, orderBy: { name: 'asc' } });

  return (
    <>
      <h1 className="page-title">New Case</h1>
      <p className="page-sub">The full document checklist is created automatically; SOL is suggested from the incident date and state.</p>

      <form action={createCaseAction} className="card">
        <div className="form-grid">
          {platform ? (
            <label className="field">
              Firm (tenant) *
              <select name="tenantId" required>
                <option value="">Select firm…</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          ) : null}
          <label className="field">Case # <input name="caseNumber" placeholder="Auto-assigned if blank" /></label>
          <label className="field">Client name * <input name="clientName" required /></label>
          <label className="field">Client phone <input name="clientPhone" /></label>
          <label className="field">Client email <input name="clientEmail" type="email" /></label>
          <label className="field">
            Case manager
            <select name="caseManagerId">
              <option value="">Unassigned</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field">
            Stage
            <select name="stage" defaultValue="Intake">{STAGES.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="field">
            Status
            <select name="status" defaultValue="New">{STATUSES.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="field">
            Priority
            <select name="priority" defaultValue="Normal">{PRIORITIES.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="field">Date of incident <input name="dateOfIncident" type="date" /></label>
          <label className="field">
            State
            <select name="state" defaultValue="TX">{STATES.map((v) => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="field">SOL date (blank = auto) <input name="solDate" type="date" /></label>
          <label className="field">Next due <input name="nextDue" type="date" /></label>
          <label className="field">SLA days <input name="slaDays" type="number" defaultValue={7} min={1} /></label>
          {showRevenueForecast ? (
            <label className="field">Revenue forecast ($) <input name="revenueForecast" type="number" step="0.01" defaultValue={0} /></label>
          ) : null}
        </div>
        <label className="field" style={{ marginTop: 12 }}>
          Notes
          <textarea name="notes" rows={3} />
        </label>
        <div style={{ marginTop: 14 }}>
          <button className="btn" type="submit">Create case</button>
        </div>
      </form>
    </>
  );
}
