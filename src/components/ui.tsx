// Small shared server-rendered UI pieces: stat tiles, badges, bars, meters.
import type { Health, SlaStatus, SolWindow, ContactAlert } from '@/lib/metrics';

export function Tile({ label, value, delta, tone }: { label: string; value: React.ReactNode; delta?: string; tone?: 'alert' | 'good' }) {
  return (
    <div className={`tile ${tone ?? ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta ? <div className="delta">{delta}</div> : null}
    </div>
  );
}

const HEALTH_CLASS: Record<Health, string> = { Green: 'badge-green', Yellow: 'badge-yellow', Red: 'badge-red' };

export function HealthBadge({ health }: { health: Health }) {
  return (
    <span className={`badge ${HEALTH_CLASS[health]}`}>
      <span className="dot" /> {health}
    </span>
  );
}

export function SlaBadge({ sla }: { sla: SlaStatus }) {
  const cls = sla === 'Overdue' ? 'badge-red' : sla === 'At Risk' ? 'badge-yellow' : sla === 'On Track' ? 'badge-green' : 'badge-gray';
  return (
    <span className={`badge ${cls}`}>
      <span className="dot" /> {sla}
    </span>
  );
}

export function SolBadge({ sol, days }: { sol: SolWindow; days: number | null }) {
  const cls =
    sol === 'Expired' || sol === '0-30 Days' || sol === 'Missing SOL'
      ? 'badge-red'
      : sol === '31-60 Days'
        ? 'badge-orange'
        : sol === '61-90 Days'
          ? 'badge-yellow'
          : 'badge-green';
  return (
    <span className={`badge ${cls}`}>
      <span className="dot" /> {sol === 'Clear' && days !== null ? `${days}d left` : sol}
    </span>
  );
}

export function ContactBadge({ contact }: { contact: ContactAlert }) {
  const cls = contact === 'OK' ? 'badge-green' : contact === 'Stale' ? 'badge-yellow' : 'badge-red';
  return (
    <span className={`badge ${cls}`}>
      <span className="dot" /> {contact === 'OK' ? 'Recent' : contact === 'Stale' ? 'Stale >14d' : 'No contact'}
    </span>
  );
}

export function ValueBadge({ value }: { value: string }) {
  const cls = value === 'Yes' ? 'badge-green' : value === 'Pending' ? 'badge-yellow' : value === 'N/A' ? 'badge-gray' : 'badge-red';
  return (
    <span className={`badge ${cls}`}>
      <span className="dot" /> {value}
    </span>
  );
}

export function Meter({ pct }: { pct: number }) {
  return (
    <div className="meter">
      <div className="track">
        <div className="fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <span className="pct">{pct}%</span>
    </div>
  );
}

/** Horizontal bar list. Single series by default (no legend needed). */
export function BarList({
  rows,
  statusColors,
}: {
  rows: { label: string; value: number; status?: 'good' | 'warning' | 'serious' | 'critical'; series?: 2 }[];
  statusColors?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      {rows.map((r) => (
        <div className="hbar-row" key={r.label} title={`${r.label}: ${r.value}`}>
          <span className="hbar-label">{r.label}</span>
          <div className="hbar-track">
            <div
              className={`hbar-fill ${r.series === 2 ? 's2' : ''} ${statusColors && r.status ? `status-${r.status}` : ''}`}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <span className="hbar-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
