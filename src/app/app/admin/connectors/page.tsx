import { headers } from 'next/headers';
import { requireSession } from '@/lib/auth';
import { canManageConnectors, requirePermission, isPlatform } from '@/lib/rbac';
import { db } from '@/lib/db';
import { PROVIDERS, providerMeta } from '@/lib/connectors/registry';
import { fmtDate } from '@/lib/metrics';
import { createConnectorAction, syncConnectorAction, toggleConnectorAction, deleteConnectorAction } from './actions';
import { ConnectorForm } from './connector-form';

export const dynamic = 'force-dynamic';

function statusBadge(status: string) {
  const cls =
    status === 'ACTIVE' ? 'badge-green' : status === 'CONFIGURED' ? 'badge-blue' : status === 'ERROR' ? 'badge-red' : 'badge-gray';
  return (
    <span className={`badge ${cls}`}>
      <span className="dot" /> {status}
    </span>
  );
}

export default async function ConnectorsPage({ searchParams }: { searchParams?: { provider?: string } }) {
  const session = await requireSession();
  requirePermission(session, canManageConnectors(session));
  const platform = isPlatform(session);

  const connectors = await db.connector.findMany({
    where: platform ? {} : { tenantId: session.tenantId! },
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const tenants = platform ? await db.tenant.findMany({ where: { status: { not: 'SUSPENDED' } }, orderBy: { name: 'asc' } }) : [];

  const h = headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;

  return (
    <>
      <h1 className="page-title">Data Connectors</h1>
      <p className="page-sub">
        Ingest cases from the systems your firms already use — Clio, CASEpeer, Litify, Filevine, MyCase,
        Smokeball, PracticePanther, Lawmatics, Neos, SmartAdvocate — or any tool via the universal webhook.
      </p>

      <div className="card">
        <h2>Configured Connectors</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Connector</th>
                {platform ? <th>Firm</th> : null}
                <th>Status</th>
                <th>Last Sync</th>
                <th>Last Result</th>
                <th>Webhook Endpoint</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((c) => {
                const meta = providerMeta(c.provider);
                const apiCapable = meta?.modes.includes('api');
                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.name}</b>
                      <div className="small muted">{meta?.label ?? c.provider}</div>
                    </td>
                    {platform ? <td>{c.tenant.name}</td> : null}
                    <td>{statusBadge(c.status)}</td>
                    <td className="nowrap">{c.lastSyncAt ? fmtDate(c.lastSyncAt) : 'Never'}</td>
                    <td className="small muted" style={{ maxWidth: 260 }}>{c.lastSyncResult ?? '—'}</td>
                    <td className="small">
                      <div className="mono" style={{ fontSize: 11 }}>{origin}/api/connectors/{c.id}</div>
                      <div className="muted">
                        Header <code className="mono">X-NextUS-Token: {c.webhookSecret}</code>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {apiCapable ? (
                          <form action={syncConnectorAction}>
                            <input type="hidden" name="connectorId" value={c.id} />
                            <button className="btn small" type="submit">Sync now</button>
                          </form>
                        ) : null}
                        <form action={toggleConnectorAction}>
                          <input type="hidden" name="connectorId" value={c.id} />
                          <button className="btn small secondary" type="submit">
                            {c.status === 'DISABLED' ? 'Enable' : 'Disable'}
                          </button>
                        </form>
                        <form action={deleteConnectorAction}>
                          <input type="hidden" name="connectorId" value={c.id} />
                          <button className="btn small danger" type="submit">Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {connectors.length === 0 ? (
                <tr><td colSpan={7} className="muted">No connectors yet — add one below.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <ConnectorForm
        providers={PROVIDERS.map((p) => ({
          key: p.key, label: p.label, vendor: p.vendor, modes: p.modes,
          authNote: p.authNote, credentialFields: p.credentialFields,
        }))}
        tenants={tenants.map((t) => ({ id: t.id, name: t.name }))}
        needsTenant={platform}
        action={createConnectorAction}
        initialProvider={searchParams?.provider}
      />

      <div className="card">
        <h2>How ingestion works</h2>
        <ul className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>
          <li><b>API sync (pull):</b> for providers with credentials configured, <i>Sync now</i> pulls matters/cases from the vendor's REST API and creates or updates cases in that firm's tenant (matched by case number — re-syncs never duplicate).</li>
          <li><b>Webhook (push):</b> every connector has a unique URL + secret. The vendor's automation (Clio webhooks, Salesforce/Litify flows, Zapier, Make, or a custom script) POSTs JSON — single case or <code className="mono">{'{"cases":[...]}'}</code> — and it lands in the right firm instantly.</li>
          <li><b>Isolation:</b> a connector belongs to one firm; ingested data cannot cross tenants.</li>
          <li><b>Audit:</b> every sync and ingest is written to the audit trail with counts.</li>
          <li>Full field reference and per-vendor setup steps: <code>docs/CONNECTORS.md</code>.</li>
        </ul>
      </div>
    </>
  );
}
