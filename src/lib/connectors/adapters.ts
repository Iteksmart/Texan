import 'server-only';
import type { Connector } from '@prisma/client';
import { providerMeta } from './registry';
import { decryptJson } from './crypto';
import type { NormalizedCase } from './normalize';

// API pull adapters. Each fetches cases/matters from the vendor's REST API
// using the tenant's stored credentials and returns NormalizedCase[].
// Network errors and non-2xx responses throw with a readable message that is
// stored on the connector as lastSyncResult.

interface Creds {
  accessToken?: string;
  apiKey?: string;
  instanceUrl?: string;
  baseUrl?: string;
}

function creds(connector: Connector): Creds {
  return decryptJson<Creds>(connector.credentials) ?? {};
}

async function getJson(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    // never hang a request thread on a slow vendor
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}: ${body}`);
  }
  return res.json();
}

function dig(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

// ---- Clio Manage: GET /api/v4/matters ----
async function fetchClio(connector: Connector): Promise<NormalizedCase[]> {
  const c = creds(connector);
  if (!c.accessToken) throw new Error('Missing Clio access token — edit the connector credentials.');
  const base = (c.baseUrl || connector.baseUrl || 'https://app.clio.com').replace(/\/$/, '');
  const url = `${base}/api/v4/matters.json?fields=id,display_number,description,status,open_date,close_date,client{name,primary_email_address,primary_phone_number}&limit=200`;
  const body = (await getJson(url, c.accessToken)) as { data?: Record<string, unknown>[] };
  return (body.data ?? []).map((m) => ({
    caseNumber: String(m.display_number ?? m.id),
    clientName: String(dig(m, 'client.name') ?? 'Unknown Client'),
    clientEmail: dig(m, 'client.primary_email_address') as string | undefined,
    clientPhone: dig(m, 'client.primary_phone_number') as string | undefined,
    status: m.status === 'open' ? 'In Progress' : m.status === 'pending' ? 'New' : m.status === 'closed' ? 'Closed' : undefined,
    openDate: m.open_date as string | undefined,
    notes: m.description as string | undefined,
  }));
}

// ---- Litify (Salesforce): SOQL query on litify_pm__Matter__c ----
async function fetchLitify(connector: Connector): Promise<NormalizedCase[]> {
  const c = creds(connector);
  if (!c.accessToken || !c.instanceUrl) throw new Error('Missing Salesforce instance URL or access token.');
  const soql = encodeURIComponent(
    'SELECT Name, litify_pm__Display_Name__c, litify_pm__Status__c, litify_pm__Open_Date__c, ' +
      'litify_pm__Incident_date__c, litify_pm__Client__r.Name FROM litify_pm__Matter__c LIMIT 200',
  );
  const url = `${c.instanceUrl.replace(/\/$/, '')}/services/data/v59.0/query?q=${soql}`;
  const body = (await getJson(url, c.accessToken)) as { records?: Record<string, unknown>[] };
  return (body.records ?? []).map((m) => ({
    caseNumber: String(m.Name),
    clientName: String(dig(m, 'litify_pm__Client__r.Name') ?? m.litify_pm__Display_Name__c ?? 'Unknown Client'),
    status: m.litify_pm__Status__c as string | undefined,
    openDate: m.litify_pm__Open_Date__c as string | undefined,
    dateOfIncident: m.litify_pm__Incident_date__c as string | undefined,
  }));
}

// ---- Generic REST (CASEpeer, Filevine, MyCase, Smokeball, PracticePanther,
//      Lawmatics, Neos, SmartAdvocate): registry-configured path + field map ----
async function fetchGenericRest(connector: Connector): Promise<NormalizedCase[]> {
  const meta = providerMeta(connector.provider);
  if (!meta?.rest) throw new Error(`${connector.provider} has no API adapter — use the inbound webhook instead.`);
  const c = creds(connector);
  const token = c.accessToken || c.apiKey;
  if (!token) throw new Error(`Missing ${meta.label} credentials — edit the connector.`);
  const base = (c.baseUrl || connector.baseUrl || meta.rest.defaultBaseUrl || '').replace(/\/$/, '');
  if (!base) throw new Error('Missing API base URL — edit the connector.');

  const body = await getJson(`${base}${meta.rest.casesPath}`, token);
  let list: unknown[] | undefined;
  if (Array.isArray(body)) list = body;
  else for (const k of meta.rest.listKeys) {
    const v = (body as Record<string, unknown>)[k];
    if (Array.isArray(v)) { list = v; break; }
  }
  if (!list) throw new Error(`Unexpected ${meta.label} response shape — adjust the field mapping in registry.ts.`);

  return list.map((item) => {
    const out: Record<string, unknown> = {};
    for (const [field, path] of Object.entries(meta.rest!.fieldMap)) {
      const v = dig(item, path);
      if (v !== undefined && v !== null && v !== '') out[field] = v;
    }
    return out as unknown as NormalizedCase;
  });
}

export async function fetchExternalCases(connector: Connector): Promise<NormalizedCase[]> {
  switch (connector.provider) {
    case 'CLIO':
      return fetchClio(connector);
    case 'LITIFY':
      return fetchLitify(connector);
    case 'GENERIC':
      throw new Error('The generic connector is inbound-only: have the external system POST to the webhook URL.');
    default:
      return fetchGenericRest(connector);
  }
}
