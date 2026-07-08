import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { isPlatform } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { PROVIDER_TYPES } from '@/lib/constants';
import { fmtDate, daysBetween } from '@/lib/metrics';
import { Tile, ValueBadge, BarList } from '@/components/ui';

export const dynamic = 'force-dynamic';

// "Currently Treating" tracker: every treatment entry across active cases.
export default async function TreatmentPage() {
  const session = await requireSession();
  const scored = await loadCases(session);
  const platform = isPlatform(session);
  const now = new Date();

  const rows = scored.flatMap((s) =>
    s.case.treatments.map((t) => ({ t, c: s.case })),
  );

  const billsMissing = rows.filter(({ t }) => t.billReceived !== 'Yes' && t.billReceived !== 'N/A').length;
  const recordsMissing = rows.filter(({ t }) => t.recordReceived !== 'Yes' && t.recordReceived !== 'N/A').length;
  const next7 = rows.filter(({ t }) => t.nextApptDate && daysBetween(now, t.nextApptDate) >= 0 && daysBetween(now, t.nextApptDate) <= 7).length;
  const done = rows.filter(({ t }) => t.doneTreating).length;

  const byType = PROVIDER_TYPES.map((pt) => ({
    label: pt,
    value: rows.filter(({ t }) => t.providerType === pt).length,
  }));

  return (
    <>
      <h1 className="page-title">Currently Treating</h1>
      <p className="page-sub">Provider visits, appointment attendance, and outstanding bills &amp; records across all active files.</p>

      <div className="tiles">
        <Tile label="Treatment Entries" value={rows.length} />
        <Tile label="Bills Missing" value={billsMissing} tone={billsMissing ? 'alert' : 'good'} />
        <Tile label="Records Missing" value={recordsMissing} tone={recordsMissing ? 'alert' : 'good'} />
        <Tile label="Appointments Next 7 Days" value={next7} />
        <Tile label="Done Treating" value={done} tone="good" />
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Entries by Provider Type</h2>
          <BarList rows={byType} />
        </div>
        <div className="card">
          <h2>Follow-up Queue <span className="hint">— missing bills or records first</span></h2>
          <p className="small muted">
            {billsMissing + recordsMissing} outstanding document requests. Open a case&apos;s Treatment tab to update inline.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Case</th>
                {platform ? <th>Firm</th> : null}
                <th>Client</th>
                <th>Provider</th>
                <th>Type</th>
                <th>DOS</th>
                <th>Bill</th>
                <th>Record</th>
                <th>Next Appt</th>
                <th>Attended</th>
                <th>MRI</th>
                <th>Surgery</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort((a, b) => Number(a.t.doneTreating) - Number(b.t.doneTreating))
                .map(({ t, c }) => (
                  <tr key={t.id}>
                    <td className="nowrap"><Link href={`/app/cases/${c.id}?tab=treatment`}>{c.caseNumber}</Link></td>
                    {platform ? <td>{c.tenant?.name}</td> : null}
                    <td>{c.clientName}</td>
                    <td>{t.provider}</td>
                    <td>{t.providerType}</td>
                    <td className="nowrap">{fmtDate(t.dosDate)}</td>
                    <td><ValueBadge value={t.billReceived} /></td>
                    <td><ValueBadge value={t.recordReceived} /></td>
                    <td className="nowrap">{fmtDate(t.nextApptDate)}</td>
                    <td><ValueBadge value={t.attended} /></td>
                    <td><ValueBadge value={t.mri} /></td>
                    <td><ValueBadge value={t.surgeryConsult} /></td>
                    <td>
                      {t.doneTreating ? (
                        <span className="badge badge-green"><span className="dot" /> Done Treating</span>
                      ) : (
                        <span className="badge badge-blue"><span className="dot" /> Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              {rows.length === 0 ? <tr><td colSpan={13} className="muted">No treatment entries.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
