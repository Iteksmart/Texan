# NextUS CSM — Data Connectors Guide

Connectors let each firm's cases flow into NextUS CSM from the case-management
system they already use — no re-keying. Manage them at
**Administration → Data Connectors** (Super Admins for any firm; Firm Admins
for their own firm).

Every connector is bound to **one tenant**: ingested data can never land in
another firm.

---

## Two ingestion modes

### 1. API sync (pull)

For providers with a REST API, NextUS stores the firm's credentials
(**encrypted at rest**, AES-256-GCM) and pulls cases on demand with the
**Sync now** button. Cases are matched by case number — re-syncing updates
records and never duplicates them.

### 2. Universal webhook (push)

Every connector — regardless of provider — gets a unique endpoint and secret:

```
POST https://<your-domain>/api/connectors/<connector-id>
Header:  X-NextUS-Token: <webhook secret>
Body:    {"cases": [ { ... }, { ... } ]}     (or a single case object)
```

Accepted case fields (aliases in parentheses are auto-recognized):

| Field | Required | Notes |
|---|---|---|
| `caseNumber` (`case_number`, `id`) | ✔ | Unique per firm — the upsert key |
| `clientName` (`client_name`, `client`, `name`) | ✔ | |
| `status`, `stage`, `priority` | | Matched to NextUS values case-insensitively; unknown values ignored |
| `openDate`, `dateOfIncident`, `solDate`, `nextDue` | | ISO dates |
| `state` | | Two-letter state |
| `revenueForecast`, `settlementValue` | | Numbers |
| `caseManager` | | Matched to an active case-manager account by first name |
| `clientPhone`, `clientEmail`, `notes` | | |

Response: `{"ok":true,"created":N,"updated":N,"skipped":N}`. Limit: 1,000
cases per request. Every ingest is recorded in the audit trail.

Test a webhook with curl:

```bash
curl -X POST https://<domain>/api/connectors/<id> \
  -H "X-NextUS-Token: <secret>" -H "Content-Type: application/json" \
  -d '{"cases":[{"caseNumber":"EXT-100","clientName":"Pat Example","status":"In Progress"}]}'
```

---

## Supported providers

| Provider | API pull | Webhook | What to collect from the firm |
|---|---|---|---|
| **Clio Manage** | ✔ (Matters API v4) | ✔ | OAuth access token (Clio → Settings → Developer Applications); region base URL |
| **CASEpeer** | ✔ (REST) | ✔ | API key + base URL from CASEpeer support |
| **Litify** | ✔ (Salesforce SOQL on `litify_pm__Matter__c`) | ✔ | Salesforce instance URL + OAuth token with Matter read access |
| **Filevine** | ✔ (Projects API) | ✔ | API key / Personal Access Token |
| **MyCase** | ✔ (External API) | ✔ | OAuth token (MyCase → Settings → API) |
| **Smokeball** | ✔ (Matters API) | ✔ | OAuth credentials |
| **PracticePanther** | ✔ (API v2 Matters) | ✔ | OAuth access token |
| **Lawmatics** | ✔ (REST v1) | ✔ | Bearer token (Settings → Integrations → API) |
| **Neos (Assembly)** | ✔ (REST) | ✔ | API key from Assembly |
| **SmartAdvocate** | ✔ (CaseSyncAPI) | ✔ | Server API URL + API key |
| **Generic / Zapier / Make** | — | ✔ | Nothing — point the automation at the webhook URL |

Notes:

- Vendor APIs evolve; each adapter's endpoint path and field mapping live in
  `src/lib/connectors/registry.ts` and `src/lib/connectors/adapters.ts` — adjust
  there if a vendor changes shape, without touching the rest of the app.
- OAuth tokens from most vendors **expire**; for always-on sync, use the vendor's
  webhook/automation push (mode 2) or schedule token refresh in your deployment.
- If a sync fails, the connector shows status **ERROR** with the exact message
  under *Last Result* (bad token, wrong URL, unexpected response shape…).

---

## Setup walkthrough (example: Clio for “Carlson Law Firm”)

1. **Administration → Data Connectors → Add Connector.**
2. Provider *Clio Manage*, Firm *Carlson Law Firm*, paste the access token.
3. Click **Create connector** → it appears with status CONFIGURED and a webhook
   URL + secret.
4. Click **Sync now** → status turns ACTIVE and *Last Result* shows
   “N fetched — N created/updated”.
5. (Optional, for real-time pushes) In Clio, register a webhook/automation that
   POSTs matter changes to the connector URL with the `X-NextUS-Token` header —
   or wire it through Zapier/Make in a few clicks.
6. Verify in **All Cases** filtered to the firm, and in the **Audit Trail**
   (`CONNECTOR_SYNC` / `CONNECTOR_INGEST`).

## Zapier / Make recipe (works for any vendor)

1. Trigger: “New/updated matter” in the vendor app.
2. Action: **Webhooks → POST**, URL = connector URL, header
   `X-NextUS-Token: <secret>`, JSON body mapping the vendor fields to the
   accepted fields above.
3. Turn it on — cases appear in the right firm in real time.

## Security model

- Credentials encrypted at rest (AES-256-GCM, key derived from `AUTH_SECRET`).
- Webhook secrets are 192-bit random, compared in constant time.
- A connector writes only to its own tenant; payloads are validated and capped.
- Disable a connector to instantly block its webhook and syncs; delete to remove
  it (ingested cases remain).
- All connector activity is in the audit trail.
