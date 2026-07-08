'use client';

import { useState } from 'react';

interface ProviderOption {
  key: string;
  label: string;
  vendor: string;
  modes: string[];
  authNote: string;
  credentialFields: { key: string; label: string; placeholder?: string; secret?: boolean }[];
}

// Client component so the credential fields adapt to the chosen provider.
export function ConnectorForm({
  providers,
  tenants,
  needsTenant,
  action,
  initialProvider,
}: {
  providers: ProviderOption[];
  tenants: { id: string; name: string }[];
  needsTenant: boolean;
  action: (formData: FormData) => void;
  initialProvider?: string;
}) {
  const [providerKey, setProviderKey] = useState(
    providers.some((p) => p.key === initialProvider) ? initialProvider! : providers[0]?.key ?? '',
  );
  const provider = providers.find((p) => p.key === providerKey);

  return (
    <form action={action} className="card">
      <h2>Add Connector</h2>
      <div className="form-grid">
        <label className="field">
          Provider
          <select name="provider" value={providerKey} onChange={(e) => setProviderKey(e.target.value)}>
            {providers.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </label>
        {needsTenant ? (
          <label className="field">
            Firm (tenant) *
            <select name="tenantId" required>
              <option value="">Select firm…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          Display name
          <input name="name" placeholder={provider ? `${provider.label} sync` : ''} />
        </label>
        {provider?.credentialFields.map((f) => (
          <label className="field" key={f.key}>
            {f.label}
            <input
              name={`cred_${f.key}`}
              type={f.secret ? 'password' : 'text'}
              placeholder={f.placeholder ?? ''}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {provider ? (
        <p className="small muted" style={{ marginTop: 10 }}>
          <b>{provider.vendor}</b> — {provider.authNote}{' '}
          {provider.modes.includes('api')
            ? 'Supports API pull sync and inbound webhook.'
            : 'Inbound webhook only — the external system pushes to us.'}
          {' '}Credentials are encrypted at rest; the webhook URL and secret are generated after you save.
        </p>
      ) : null}
      <div style={{ marginTop: 12 }}>
        <button className="btn" type="submit">Create connector</button>
      </div>
    </form>
  );
}
