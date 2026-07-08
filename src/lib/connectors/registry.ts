// Registry of supported external case-management systems.
//
// Every provider supports the universal inbound WEBHOOK (push JSON to us —
// works today via the vendor's own webhooks/automations or Zapier/Make).
// Providers with `mode: 'api'` additionally have a pull adapter that calls
// the vendor's REST API using tenant-supplied credentials.

export type ConnectorMode = 'api' | 'webhook';

export interface CredentialField {
  key: 'accessToken' | 'apiKey' | 'instanceUrl' | 'baseUrl' | 'realmId' | 'clientId' | 'clientSecret';
  label: string;
  placeholder?: string;
  secret?: boolean;
}

export interface ProviderMeta {
  key: string;
  label: string;
  vendor: string;
  modes: ConnectorMode[];
  authNote: string;
  docsUrl: string;
  credentialFields: CredentialField[];
  /** default REST collection path + response/field mapping for generic-REST adapters */
  rest?: {
    defaultBaseUrl?: string;
    casesPath: string;
    listKeys: string[]; // where the array lives in the response body
    fieldMap: Record<string, string>; // NormalizedCase field -> dotted path in item
  };
}

export const PROVIDERS: ProviderMeta[] = [
  {
    key: 'QUICKBOOKS',
    label: 'QuickBooks Online',
    vendor: 'Intuit QuickBooks',
    modes: ['webhook'],
    authNote: 'QuickBooks Online OAuth connection. Add the company ID/realm ID and OAuth app details, then use the generated connector record to track billing export setup.',
    docsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
    credentialFields: [
      { key: 'realmId', label: 'Company ID / Realm ID', placeholder: '1234567890' },
      { key: 'clientId', label: 'OAuth client ID', secret: true },
      { key: 'clientSecret', label: 'OAuth client secret', secret: true },
      { key: 'accessToken', label: 'OAuth access token', secret: true },
    ],
  },
  {
    key: 'CLIO',
    label: 'Clio Manage',
    vendor: 'Clio',
    modes: ['api', 'webhook'],
    authNote: 'OAuth 2.0 — paste an access token generated for your Clio account (Settings → Developer Applications).',
    docsUrl: 'https://docs.developers.clio.com/',
    credentialFields: [
      { key: 'baseUrl', label: 'Region base URL', placeholder: 'https://app.clio.com' },
      { key: 'accessToken', label: 'OAuth access token', secret: true },
    ],
  },
  {
    key: 'CASEPEER',
    label: 'CASEpeer',
    vendor: 'CASEpeer (AffiniPay)',
    modes: ['api', 'webhook'],
    authNote: 'API key issued by CASEpeer support for your account; confirm your API base URL with them.',
    docsUrl: 'https://www.casepeer.com/',
    credentialFields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://api.casepeer.com' },
      { key: 'apiKey', label: 'API key', secret: true },
    ],
    rest: {
      casesPath: '/v1/cases',
      listKeys: ['results', 'data', 'cases'],
      fieldMap: {
        caseNumber: 'case_number',
        clientName: 'client_name',
        status: 'status',
        openDate: 'date_opened',
        dateOfIncident: 'date_of_incident',
        state: 'state',
      },
    },
  },
  {
    key: 'LITIFY',
    label: 'Litify',
    vendor: 'Litify (Salesforce)',
    modes: ['api', 'webhook'],
    authNote: 'Salesforce instance URL + OAuth access token with read access to litify_pm__Matter__c.',
    docsUrl: 'https://developer.salesforce.com/docs/apis',
    credentialFields: [
      { key: 'instanceUrl', label: 'Salesforce instance URL', placeholder: 'https://yourfirm.my.salesforce.com' },
      { key: 'accessToken', label: 'OAuth access token', secret: true },
    ],
  },
  {
    key: 'FILEVINE',
    label: 'Filevine',
    vendor: 'Filevine',
    modes: ['api', 'webhook'],
    authNote: 'Filevine API key + base URL (api.filevine.io); Personal Access Tokens supported.',
    docsUrl: 'https://developer.filevine.io/',
    credentialFields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://api.filevine.io' },
      { key: 'apiKey', label: 'API key / PAT', secret: true },
    ],
    rest: {
      casesPath: '/core/projects',
      listKeys: ['items', 'data'],
      fieldMap: {
        caseNumber: 'projectId.native',
        clientName: 'clientName',
        status: 'phaseName',
        openDate: 'createdDate',
      },
    },
  },
  {
    key: 'MYCASE',
    label: 'MyCase',
    vendor: 'MyCase (AffiniPay)',
    modes: ['api', 'webhook'],
    authNote: 'MyCase External API OAuth token (MyCase → Settings → API).',
    docsUrl: 'https://developers.mycase.com/',
    credentialFields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://external-integrations.mycase.com' },
      { key: 'accessToken', label: 'OAuth access token', secret: true },
    ],
    rest: {
      casesPath: '/v1/cases',
      listKeys: ['data', 'cases'],
      fieldMap: {
        caseNumber: 'case_number',
        clientName: 'name',
        status: 'case_stage',
        openDate: 'open_date',
        solDate: 'sol_date',
      },
    },
  },
  {
    key: 'SMOKEBALL',
    label: 'Smokeball',
    vendor: 'Smokeball',
    modes: ['api', 'webhook'],
    authNote: 'Smokeball API OAuth credentials (api.smokeball.com).',
    docsUrl: 'https://www.smokeball.com/api',
    credentialFields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://api.smokeball.com' },
      { key: 'accessToken', label: 'OAuth access token', secret: true },
    ],
    rest: {
      casesPath: '/matters',
      listKeys: ['value', 'items', 'data'],
      fieldMap: {
        caseNumber: 'number',
        clientName: 'clientName',
        status: 'status',
        openDate: 'openedDate',
      },
    },
  },
  {
    key: 'PRACTICEPANTHER',
    label: 'PracticePanther',
    vendor: 'PracticePanther',
    modes: ['api', 'webhook'],
    authNote: 'OAuth 2.0 access token (PracticePanther → Settings → API).',
    docsUrl: 'https://app.practicepanther.com/swagger',
    credentialFields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://app.practicepanther.com' },
      { key: 'accessToken', label: 'OAuth access token', secret: true },
    ],
    rest: {
      casesPath: '/api/v2/matter',
      listKeys: [],
      fieldMap: {
        caseNumber: 'number',
        clientName: 'display_name',
        status: 'status',
        openDate: 'open_date',
      },
    },
  },
  {
    key: 'LAWMATICS',
    label: 'Lawmatics',
    vendor: 'Lawmatics',
    modes: ['api', 'webhook'],
    authNote: 'Lawmatics REST bearer token (Settings → Integrations → API).',
    docsUrl: 'https://docs.lawmatics.com/',
    credentialFields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://api.lawmatics.com' },
      { key: 'accessToken', label: 'Bearer token', secret: true },
    ],
    rest: {
      casesPath: '/v1/matters',
      listKeys: ['data'],
      fieldMap: {
        caseNumber: 'id',
        clientName: 'attributes.name',
        status: 'attributes.status',
        openDate: 'attributes.created_at',
      },
    },
  },
  {
    key: 'NEOS',
    label: 'Neos',
    vendor: 'Assembly Neos',
    modes: ['api', 'webhook'],
    authNote: 'Neos API key from Assembly support (api.neosconnect.com).',
    docsUrl: 'https://developer.assemblysoftware.com/',
    credentialFields: [
      { key: 'baseUrl', label: 'API base URL', placeholder: 'https://api.neosconnect.com' },
      { key: 'apiKey', label: 'API key', secret: true },
    ],
    rest: {
      casesPath: '/v1/cases',
      listKeys: ['items', 'data'],
      fieldMap: {
        caseNumber: 'caseNumber',
        clientName: 'clientName',
        status: 'caseStatus',
        openDate: 'dateOpened',
        dateOfIncident: 'incidentDate',
      },
    },
  },
  {
    key: 'SMARTADVOCATE',
    label: 'SmartAdvocate',
    vendor: 'SmartAdvocate',
    modes: ['api', 'webhook'],
    authNote: 'SmartAdvocate REST API credentials (your server URL + API key).',
    docsUrl: 'https://www.smartadvocate.com/',
    credentialFields: [
      { key: 'baseUrl', label: 'Server API URL', placeholder: 'https://yourserver.smartadvocate.com/CaseSyncAPI' },
      { key: 'apiKey', label: 'API key', secret: true },
    ],
    rest: {
      casesPath: '/case/CaseInfo',
      listKeys: [],
      fieldMap: {
        caseNumber: 'caseNumber',
        clientName: 'plaintiffName',
        status: 'caseStatus',
        openDate: 'retainedDate',
        dateOfIncident: 'incidentDate',
        state: 'incidentState',
      },
    },
  },
  {
    key: 'GENERIC',
    label: 'Generic Webhook / Zapier / Make',
    vendor: 'Any system',
    modes: ['webhook'],
    authNote: 'No vendor credentials needed — the external system (or Zapier/Make) POSTs JSON to your webhook URL with the secret header.',
    docsUrl: '',
    credentialFields: [],
  },
];

export function providerMeta(key: string): ProviderMeta | undefined {
  return PROVIDERS.find((p) => p.key === key);
}
