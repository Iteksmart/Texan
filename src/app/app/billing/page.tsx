import { requireSession } from '@/lib/auth';
import { canViewBilling, canViewRevenueForecast, requirePermission, isPlatform } from '@/lib/rbac';
import { loadCases } from '@/lib/case-queries';
import { db } from '@/lib/db';
import { fmtMoney } from '@/lib/metrics';
import { Tile } from '@/components/ui';

export const dynamic = 'force-dynamic';

// Billing summary per law firm: active-case fees, settlements, and billing connectors.
export default async function BillingPage() {
  const session = await requireSession();
  requirePermission(session, canViewBilling(session));
  const showRevenueForecast = canViewRevenueForecast(session);

  const scored = await loadCases(session, { includeClosed: false });
  const tenants = await db.tenant.findMany({
    where: isPlatform(session) ? {} : { id: session.tenantId! },
    orderBy: { name: 'asc' },
  });

  const rows = tenants.map((t) => {
    const cases = scored.filter((s) => s.case.tenantId === t.id);
    const monthlyFee = cases.length * t.perCaseRate;
    const revenue = cases.reduce((a, s) => a + s.case.revenueForecast, 0);
    const settlements = cases.reduce((a, s) => a + (s.case.settlementValue ?? 0), 0);
    return { tenant: t, active: cases.length, monthlyFee, revenue, settlements };
  });

  const totalFees = rows.reduce((a, r) => a + r.monthlyFee, 0);
  const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);
  const totalSettlements = rows.reduce((a, r) => a + r.settlements, 0);

  return (
    <>
      <h1 className="page-title">Billing</h1>
      <p className="page-sub">
        Monthly service fees per firm, settlement pipeline totals, and accounting connectors for NextUp.
      </p>

      <div className="tiles">
        <Tile label="Billable Firms" value={rows.length} />
        <Tile label="Active Cases" value={rows.reduce((a, r) => a + r.active, 0)} />
        <Tile label="Monthly Service Fees" value={fmtMoney(totalFees)} tone="good" />
        {showRevenueForecast ? <Tile label="Revenue Forecast" value={fmtMoney(totalRevenue)} /> : null}
        <Tile label="Settlements in Pipeline" value={fmtMoney(totalSettlements)} />
      </div>

      <div className="card connector-card">
        <div>
          <h2>QuickBooks Connector for NextUp</h2>
          <p className="muted small">
            Sync firm billing summaries, monthly service fees, and settlement invoice notes into QuickBooks Online.
          </p>
        </div>
        <div className="connector-meta">
          <span className="badge badge-blue"><span className="dot" /> Available</span>
          <button className="btn small" type="button">Connect QuickBooks</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Firm</th>
                <th>Status</th>
                <th className="num">Active Cases</th>
                <th className="num">Per-Case Rate</th>
                <th className="num">Monthly Fee</th>
                {showRevenueForecast ? <th className="num">Revenue Forecast</th> : null}
                <th className="num">Settlements</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tenant.id}>
                  <td>{r.tenant.name}</td>
                  <td>
                    <span className={`badge ${r.tenant.status === 'ACTIVE' ? 'badge-green' : r.tenant.status === 'ONBOARDING' ? 'badge-blue' : 'badge-red'}`}>
                      <span className="dot" /> {r.tenant.status}
                    </span>
                  </td>
                  <td className="num">{r.active}</td>
                  <td className="num">{fmtMoney(r.tenant.perCaseRate)}</td>
                  <td className="num">{fmtMoney(r.monthlyFee)}</td>
                  {showRevenueForecast ? <td className="num">{fmtMoney(r.revenue)}</td> : null}
                  <td className="num">{fmtMoney(r.settlements)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted small">
        Connect QuickBooks or your invoicing system to turn these summaries into real invoices. Rates are configurable per tenant in Admin - Tenants.
      </p>
    </>
  );
}
