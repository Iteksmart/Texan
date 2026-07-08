import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { canEditCases, canViewAudit, canViewRevenueForecast, isPlatform } from '@/lib/rbac';
import { loadCase } from '@/lib/case-queries';
import { db } from '@/lib/db';
import {
  STAGES, STATUSES, PRIORITIES, STATES, YES_NO, PROVIDER_TYPES,
  CATEGORY_LABELS, type ChecklistCategory,
} from '@/lib/constants';
import { fmtDate, fmtDateInput, fmtMoney } from '@/lib/metrics';
import { HealthBadge, SlaBadge, SolBadge, ContactBadge, ValueBadge, Meter, Tile } from '@/components/ui';
import { AutoSelect } from '@/components/auto-select';
import {
  updateCaseAction, setChecklistValueAction, addTreatmentAction,
  updateTreatmentAction, addNoteAction, logClientContactAction,
} from '../actions';

export const dynamic = 'force-dynamic';

const TABS = ['overview', 'checklist', 'treatment', 'notes', 'activity'] as const;
type Tab = (typeof TABS)[number];

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const session = await requireSession();
  const result = await loadCase(session, params.id);
  if (!result) notFound();
  const { case: c, metrics: m } = result;
  const editable = canEditCases(session);
  const showRevenueForecast = canViewRevenueForecast(session);
  const tab: Tab = (TABS as readonly string[]).includes(searchParams.tab ?? '') ? (searchParams.tab as Tab) : 'overview';

  const managers = await db.user.findMany({ where: { role: 'CASE_MANAGER', active: true }, orderBy: { name: 'asc' } });
  const auditRows =
    tab === 'activity' && canViewAudit(session)
      ? await db.auditLog.findMany({
          where: { entityId: { contains: c.id } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">
            {c.caseNumber} — {c.clientName}
          </h1>
          <p className="page-sub">
            {isPlatform(session) ? <>{c.tenant?.name} · </> : null}
            {c.stage} · {c.status} · Manager: {c.caseManager?.name ?? 'Unassigned'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <HealthBadge health={m.health} />
          <SlaBadge sla={m.sla} />
          <SolBadge sol={m.sol} days={m.solDays} />
          <ContactBadge contact={m.contact} />
          {m.readyForDemand ? <span className="badge badge-purple"><span className="dot" /> Ready for Demand</span> : null}
        </div>
      </div>

      <div className="tiles">
        <Tile label="Overall Completion" value={`${m.overallPct}%`} />
        <Tile label="Critical Missing" value={m.criticalMissing} tone={m.criticalMissing ? 'alert' : 'good'} />
        <Tile label="Days Since Activity" value={m.daysSinceActivity} tone={m.daysSinceActivity > 10 ? 'alert' : undefined} />
        <Tile label="QC Score" value={c.qcScore ?? '—'} />
        {showRevenueForecast ? <Tile label="Revenue Forecast" value={fmtMoney(c.revenueForecast)} /> : null}
        <Tile label="Settlement" value={fmtMoney(c.settlementValue)} />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t} className={t === tab ? 'active' : ''} href={`/app/cases/${c.id}?tab=${t}`}>
            {t === 'overview' ? 'Overview' : t === 'checklist' ? `Checklist (${m.overallPct}%)` : t === 'treatment' ? `Treatment (${c.treatments.length})` : t === 'notes' ? `Notes (${c.caseNotes.length})` : 'Activity'}
          </Link>
        ))}
      </div>

      {tab === 'overview' ? (
        <form action={updateCaseAction} className="card">
          <input type="hidden" name="caseId" value={c.id} />
          <div className="form-grid">
            <label className="field">Client name <input name="clientName" defaultValue={c.clientName} disabled={!editable} /></label>
            <label className="field">Client phone <input name="clientPhone" defaultValue={c.clientPhone ?? ''} disabled={!editable} /></label>
            <label className="field">Client email <input name="clientEmail" defaultValue={c.clientEmail ?? ''} disabled={!editable} /></label>
            <label className="field">
              Case manager
              <select name="caseManagerId" defaultValue={c.caseManagerId ?? ''} disabled={!editable}>
                <option value="">Unassigned</option>
                {managers.map((mgr) => <option key={mgr.id} value={mgr.id}>{mgr.name}</option>)}
              </select>
            </label>
            <label className="field">
              Stage
              <select name="stage" defaultValue={c.stage} disabled={!editable}>{STAGES.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field">
              Status
              <select name="status" defaultValue={c.status} disabled={!editable}>{STATUSES.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field">
              Priority
              <select name="priority" defaultValue={c.priority} disabled={!editable}>{PRIORITIES.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field">Date of incident <input name="dateOfIncident" type="date" defaultValue={fmtDateInput(c.dateOfIncident)} disabled={!editable} /></label>
            <label className="field">
              State
              <select name="state" defaultValue={c.state ?? 'Other'} disabled={!editable}>{STATES.map((v) => <option key={v}>{v}</option>)}</select>
            </label>
            <label className="field">SOL date <input name="solDate" type="date" defaultValue={fmtDateInput(c.solDate)} disabled={!editable} /></label>
            <label className="field">Next due <input name="nextDue" type="date" defaultValue={fmtDateInput(c.nextDue)} disabled={!editable} /></label>
            <label className="field">SLA days <input name="slaDays" type="number" min={1} defaultValue={c.slaDays} disabled={!editable} /></label>
            <label className="field">QC score <input name="qcScore" type="number" min={0} max={100} defaultValue={c.qcScore ?? ''} disabled={!editable} /></label>
            {showRevenueForecast ? (
              <label className="field">Revenue forecast <input name="revenueForecast" type="number" step="0.01" defaultValue={c.revenueForecast} disabled={!editable} /></label>
            ) : null}
            <label className="field">Settlement value <input name="settlementValue" type="number" step="0.01" defaultValue={c.settlementValue ?? ''} disabled={!editable} /></label>
            <label className="field">Open issues <input name="openIssues" type="number" min={0} defaultValue={c.openIssues} disabled={!editable} /></label>
            <label className="field">Lien status <input name="lienStatus" defaultValue={c.lienStatus ?? ''} disabled={!editable} /></label>
            <label className="field">Last client contact <input name="lastClientContact" type="date" defaultValue={fmtDateInput(c.lastClientContact)} disabled={!editable} /></label>
          </div>
          <label className="field" style={{ marginTop: 12 }}>
            Notes
            <textarea name="notes" rows={3} defaultValue={c.notes ?? ''} disabled={!editable} />
          </label>
          {editable ? (
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button className="btn" type="submit">Save changes</button>
              <button className="btn secondary" formAction={logClientContactAction} type="submit">Log client contact today</button>
            </div>
          ) : null}
        </form>
      ) : null}

      {tab === 'checklist' ? (
        <div className="grid-2">
          {(Object.keys(CATEGORY_LABELS) as ChecklistCategory[]).map((cat) => {
            const stat = m.stats.find((s) => s.category === cat)!;
            const items = c.checklist.filter((i) => i.category === cat);
            return (
              <div className="card" key={cat}>
                <h2>
                  {CATEGORY_LABELS[cat]} <span className="hint">— {stat.yes}/{stat.total - stat.na} complete{stat.criticalMissing ? `, ${stat.criticalMissing} critical missing` : ''}</span>
                </h2>
                <Meter pct={stat.pct} />
                <table className="data" style={{ marginTop: 10 }}>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.key}>
                        <td>
                          {item.label}
                          {item.critical ? <span className="badge badge-purple" style={{ marginLeft: 6 }}>critical</span> : null}
                        </td>
                        <td className="right" style={{ width: 110 }}>
                          {editable ? (
                            <form action={setChecklistValueAction}>
                              <input type="hidden" name="caseId" value={c.id} />
                              <input type="hidden" name="key" value={item.key} />
                              <AutoSelect name="value" defaultValue={item.value} options={YES_NO} />
                            </form>
                          ) : (
                            <ValueBadge value={item.value} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'treatment' ? (
        <>
          <div className="card">
            <h2>Treatment Entries <span className="hint">— providers, appointments, bills &amp; records</span></h2>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Type</th>
                    <th>DOS</th>
                    <th>Bill</th>
                    <th>Record</th>
                    <th>Next Appt</th>
                    <th>Attended</th>
                    <th>MRI</th>
                    <th>Surgery Consult</th>
                    <th>Done</th>
                  </tr>
                </thead>
                <tbody>
                  {c.treatments.map((t) => (
                    <tr key={t.id}>
                      <td>{t.provider}</td>
                      <td>{t.providerType}</td>
                      <td className="nowrap">{fmtDate(t.dosDate)}</td>
                      {(['billReceived', 'recordReceived'] as const).map((f) => (
                        <td key={f}>
                          {editable ? (
                            <form action={updateTreatmentAction}>
                              <input type="hidden" name="treatmentId" value={t.id} />
                              <input type="hidden" name="field" value={f} />
                              <AutoSelect name="value" defaultValue={t[f]} options={YES_NO} />
                            </form>
                          ) : (
                            <ValueBadge value={t[f]} />
                          )}
                        </td>
                      ))}
                      <td className="nowrap">{fmtDate(t.nextApptDate)}</td>
                      {(['attended', 'mri', 'surgeryConsult'] as const).map((f) => (
                        <td key={f}>
                          {editable ? (
                            <form action={updateTreatmentAction}>
                              <input type="hidden" name="treatmentId" value={t.id} />
                              <input type="hidden" name="field" value={f} />
                              <AutoSelect name="value" defaultValue={t[f]} options={YES_NO} />
                            </form>
                          ) : (
                            <ValueBadge value={t[f]} />
                          )}
                        </td>
                      ))}
                      <td>
                        {editable ? (
                          <form action={updateTreatmentAction}>
                            <input type="hidden" name="treatmentId" value={t.id} />
                            <input type="hidden" name="field" value="doneTreating" />
                            <AutoSelect name="value" defaultValue={t.doneTreating ? 'true' : 'false'} options={['false', 'true']} />
                          </form>
                        ) : t.doneTreating ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                  {c.treatments.length === 0 ? (
                    <tr><td colSpan={10} className="muted">No treatment entries yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {editable ? (
            <form action={addTreatmentAction} className="card">
              <input type="hidden" name="caseId" value={c.id} />
              <h2>Add Treatment Entry</h2>
              <div className="form-grid">
                <label className="field">Provider * <input name="provider" required /></label>
                <label className="field">
                  Provider type
                  <select name="providerType">{PROVIDER_TYPES.map((v) => <option key={v}>{v}</option>)}</select>
                </label>
                <label className="field">Date of service <input name="dosDate" type="date" /></label>
                <label className="field">Next appointment <input name="nextApptDate" type="date" /></label>
                <label className="field">
                  Bill received
                  <select name="billReceived">{YES_NO.map((v) => <option key={v}>{v}</option>)}</select>
                </label>
                <label className="field">
                  Record received
                  <select name="recordReceived">{YES_NO.map((v) => <option key={v}>{v}</option>)}</select>
                </label>
              </div>
              <div style={{ marginTop: 14 }}>
                <button className="btn" type="submit">Add entry</button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}

      {tab === 'notes' ? (
        <>
          <form action={addNoteAction} className="card">
            <input type="hidden" name="caseId" value={c.id} />
            <h2>Add Note</h2>
            <label className="field">
              <textarea name="body" rows={3} required placeholder="Log a call, update, or next step…" />
            </label>
            <div style={{ marginTop: 10 }}>
              <button className="btn" type="submit">Add note</button>
            </div>
          </form>
          <div className="card">
            <h2>Case Notes</h2>
            {c.caseNotes
              .slice()
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((n) => (
                <div key={n.id} style={{ borderBottom: '1px solid var(--grid)', padding: '10px 0' }}>
                  <div className="small muted">
                    <b style={{ color: 'var(--ink-2)' }}>{n.authorName}</b> · {fmtDate(n.createdAt)}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
                </div>
              ))}
            {c.caseNotes.length === 0 ? <p className="muted">No notes yet.</p> : null}
          </div>
        </>
      ) : null}

      {tab === 'activity' ? (
        <div className="card">
          <h2>Audit Activity <span className="hint">— HIPAA audit trail for this file</span></h2>
          {canViewAudit(session) ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>When</th><th>User</th><th>Action</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {auditRows.map((a) => (
                    <tr key={a.id}>
                      <td className="nowrap">{a.createdAt.toLocaleString()}</td>
                      <td>{a.userEmail}</td>
                      <td>{a.action}</td>
                      <td className="small muted">{a.details ?? ''}</td>
                    </tr>
                  ))}
                  {auditRows.length === 0 ? <tr><td colSpan={4} className="muted">No recorded activity yet.</td></tr> : null}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Your role does not include audit access. Ask an administrator.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
