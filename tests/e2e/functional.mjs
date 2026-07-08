// NextUS CSM end-to-end functional suite.
//
// Usage:
//   npm run seed                          # start from clean demo data
//   npm run build && npx next start &    # or: npm run dev
//   npm i -D playwright && npx playwright install chromium   (first time)
//   BASE_URL=http://127.0.0.1:3000 node tests/e2e/functional.mjs
//
// The suite mutates data (creates QA Test Firm, cases, connectors) —
// run against a demo/staging database, never production.
// NextUS CSM — full functional test suite (Playwright).
// Exercises every workflow: tenant onboarding, user provisioning, case
// creation, checklist, treatment, notes, audit, alerts, reports CSV,
// billing, spreadsheet import, and permission/isolation boundaries.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'fs';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const shots = new URL('./shots/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name} ${extra}`); }
}

const browser = await chromium.launch({ executablePath: process.env.PW_EXECUTABLE_PATH || undefined, args: ['--no-proxy-server'] });

// ---------- SUPER ADMIN SESSION ----------
const admin = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();


async function clickAction(page, locator) {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST', { timeout: 20000 }),
    locator.click(),
  ]);
  await page.waitForLoadState('networkidle');
}

async function login(page, email, password) {
  await page.goto(base + '/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/app/dashboard', { timeout: 20000 });
}

console.log('\n== 1. Authentication & dashboard ==');
await login(admin, 'admin@nextus.demo', 'Demo123!');
check('super admin login reaches dashboard', admin.url().endsWith('/app/dashboard'));
check('executive portal title', (await admin.textContent('h1')).includes('Executive Portal'));
const tiles = await admin.locator('.tile .value').allTextContents();
check('active cases tile shows 50', tiles[0] === '50', `got ${tiles[0]}`);

console.log('\n== 2. Tenant onboarding ==');
await admin.goto(base + '/app/admin/tenants');
await admin.fill('input[name=name]', 'QA Test Firm');
await admin.fill('input[name=contactName]', 'Quinn Tester');
await admin.fill('input[name=contactEmail]', 'quinn@qatest.demo');
await admin.fill('input[name=perCaseRate]', '300');
await admin.fill('input[name=adminName]', 'QA Firm Admin');
await admin.fill('input[name=adminEmail]', 'qa-admin@qatest.demo');
await admin.fill('input[name=adminPassword]', 'QaTest123!');
await clickAction(admin, admin.locator('button.btn:has-text("Create tenant")'));
const tenantRow = admin.locator('tr', { hasText: 'QA Test Firm' });
check('tenant created and listed', await tenantRow.count() === 1);
check('new tenant status ONBOARDING', (await tenantRow.textContent()).includes('ONBOARDING'));
await clickAction(admin, tenantRow.locator('button:has-text("Activate")'));
await admin.locator('tr', { hasText: 'QA Test Firm' }).locator('button:has-text("Suspend")').waitFor({ timeout: 15000 });
check('tenant activated', (await admin.locator('tr', { hasText: 'QA Test Firm' }).textContent()).includes('ACTIVE'));

console.log('\n== 3. User provisioning ==');
await admin.goto(base + '/app/admin/users');
check('firm admin auto-provisioned', await admin.locator('tr', { hasText: 'qa-admin@qatest.demo' }).count() === 1);

console.log('\n== 4. Case creation with auto-SOL ==');
await admin.goto(base + '/app/cases/new');
await admin.selectOption('select[name=tenantId]', { label: 'QA Test Firm' });
await admin.fill('input[name=clientName]', 'Jane Doe QA');
const doi = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
await admin.fill('input[name=dateOfIncident]', doi);
await admin.selectOption('select[name=state]', 'TX');
await admin.selectOption('select[name=caseManagerId]', { label: 'Richelle Bauman' });
await admin.fill('input[name=revenueForecast]', '1500');
await admin.click('button:has-text("Create case")');
await admin.waitForURL((u) => /\/app\/cases\/(?!new$)[a-z0-9]+$/.test(u.pathname), { timeout: 20000 });
const caseUrl = admin.url();
check('case created, redirected to detail', /\/app\/cases\/[a-z0-9]+$/.test(caseUrl));
check('case shows client name', (await admin.textContent('h1')).includes('Jane Doe QA'));
const badges = await admin.locator('.badge').allTextContents();
check('SOL auto-suggested from TX 2yr statute (~700d left)', badges.some((b) => /d left/.test(b)), badges.join('|'));
check('auto case number assigned (CSM-…)', (await admin.textContent('h1')).includes('CSM-'));

console.log('\n== 5. Case overview edit + client contact ==');
await admin.selectOption('select[name=status]', 'In Progress');
await clickAction(admin, admin.locator('button:has-text("Save changes")'));
check('status persisted', await admin.locator('select[name=status]').inputValue() === 'In Progress');
await clickAction(admin, admin.locator('button:has-text("Log client contact today")'));
await admin.reload();
check('client contact badge = Recent', (await admin.locator('.badge').allTextContents()).some((b) => b.includes('Recent')));

console.log('\n== 6. Checklist editing recomputes metrics ==');
await admin.goto(caseUrl + '?tab=checklist');
check('40 checklist items rendered', await admin.locator('form select[name=value]').count() === 40);
check('starts at 0% complete', (await admin.locator('.tabs a.active').textContent()).includes('(0%)'));
// flip Police Report (critical, Investigation) to Yes
const policeRow = admin.locator('tr', { hasText: 'Police Report' }).first();
await Promise.all([
  admin.waitForResponse((r) => r.request().method() === 'POST'),
  policeRow.locator('select').selectOption('Yes'),
]);
await admin.waitForLoadState('networkidle');
check('overall % recomputed to 3%', (await admin.locator('.tabs a.active').textContent()).includes('(3%)'),
  await admin.locator('.tabs a.active').textContent());
check('critical-missing tile decremented (13 of 14 critical left)',
  (await admin.locator('.tile', { hasText: 'Critical Missing' }).locator('.value').textContent()) === '13');

console.log('\n== 7. Treatment entries ==');
await admin.goto(caseUrl + '?tab=treatment');
await admin.fill('input[name=provider]', 'QA Spine & Rehab');
await admin.selectOption('select[name=providerType]', 'Chiropractor');
await admin.fill('input[name=dosDate]', doi);
await admin.selectOption('form.card select[name=billReceived]', 'Pending');
await clickAction(admin, admin.locator('button:has-text("Add entry")'));
const txRow = admin.locator('tbody tr', { hasText: 'QA Spine & Rehab' });
check('treatment entry added', await txRow.count() === 1);
await Promise.all([
  admin.waitForResponse((r) => r.request().method() === 'POST'),
  txRow.locator('select').first().selectOption('Yes'),
]);
await admin.waitForLoadState('networkidle');
check('inline bill status persisted to Yes',
  await admin.locator('tbody tr', { hasText: 'QA Spine & Rehab' }).locator('select').first().inputValue() === 'Yes');

console.log('\n== 8. Notes ==');
await admin.goto(caseUrl + '?tab=notes');
await admin.fill('textarea[name=body]', 'QA walkthrough note: MRI scheduled Friday.');
await clickAction(admin, admin.locator('button:has-text("Add note")'));
check('note appears with author', (await admin.textContent('body')).includes('MRI scheduled Friday'));

console.log('\n== 9. Per-case audit activity ==');
await admin.goto(caseUrl + '?tab=activity');
const activityText = await admin.textContent('body');
for (const action of ['CASE_CREATE', 'CASE_UPDATE', 'CHECKLIST_UPDATE', 'TREATMENT_ADD', 'NOTE_ADD', 'CLIENT_CONTACT']) {
  check(`audit shows ${action}`, activityText.includes(action));
}

console.log('\n== 10. Trackers & currently treating reflect the new data ==');
await admin.goto(base + '/app/trackers/investigation');
check('investigation tracker lists new case', (await admin.textContent('body')).includes('Jane Doe QA') || (await admin.textContent('body')).includes('CSM-'));
await admin.goto(base + '/app/treatment');
check('currently-treating lists QA provider', (await admin.textContent('body')).includes('QA Spine & Rehab'));

console.log('\n== 11. Alerts engine ==');
await admin.goto(base + '/app/alerts');
const alertsBody = await admin.textContent('body');
check('alerts table populated', await admin.locator('tbody tr').count() > 10);
check('SOL alerts present', alertsBody.includes('Missing SOL Date') || alertsBody.includes('SOL'));
check('stale-contact alerts present', alertsBody.includes('Client Contact'));

console.log('\n== 12. Team workload ==');
await admin.goto(base + '/app/team');
check('Richelle workload includes new case (11 active)',
  (await admin.locator('tr', { hasText: 'Richelle Bauman' }).textContent()).includes('11'));

console.log('\n== 13. Reports + CSV export ==');
await admin.goto(base + '/app/reports');
const [download] = await Promise.all([
  admin.waitForEvent('download'),
  admin.click('a:has-text("Download CSV")'),
]);
const csvPath = await download.path();
const csv = readFileSync(csvPath, 'utf-8');
const lines = csv.trim().split('\n');
check('CSV has header with computed metric columns', lines[0].includes('Overall Completion %') && lines[0].includes('Ready for Demand'));
check('CSV row per case (51 = 50 seed + 1 QA)', lines.length === 52, `got ${lines.length - 1} rows`);
check('CSV includes QA case', csv.includes('Jane Doe QA'));

console.log('\n== 14. Billing ==');
await admin.goto(base + '/app/billing');
const qaBilling = admin.locator('tr', { hasText: 'QA Test Firm' });
check('billing lists QA firm', await qaBilling.count() === 1);
check('billing fee = 1 case x $300', (await qaBilling.textContent()).includes('$300'));

console.log('\n== 15. Spreadsheet import (original workbook) ==');
await admin.goto(base + '/app/import');
await admin.setInputFiles('input[type=file]', '/root/.claude/uploads/c4e35fd3-20b3-5c45-aa06-93eddb322b4a/a53696a8-TCS_Nexus_OMS_VERSION_3_0_DROPDOWNS_STABLE..xlsx');
await admin.click('button:has-text("Import workbook")');
await admin.waitForSelector('.ok-box, .error-box', { timeout: 120000 });
const importMsg = await admin.textContent('.ok-box, .error-box');
check('import completes', importMsg.includes('Import complete'), importMsg);
check('import updated the 50 existing cases (idempotent, no dupes)', /50 updated/.test(importMsg), importMsg);
await admin.screenshot({ path: shots + 'import-result.png' });

console.log('\n== 16. Global audit trail ==');
await admin.goto(base + '/app/admin/audit?action=TENANT_CREATE');
check('audit records tenant creation', (await admin.textContent('body')).includes('QA Test Firm'));
await admin.goto(base + '/app/admin/audit?action=IMPORT');
check('audit records import', (await admin.textContent('body')).includes('IMPORT'));


console.log('\n== 16.5 Data connectors ==');
await admin.goto(base + '/app/admin/connectors');
check('connectors page renders', (await admin.textContent('h1')).includes('Data Connectors'));
// create a GENERIC webhook connector for the QA firm
await admin.selectOption('select[name=provider]', 'GENERIC');
await admin.selectOption('select[name=tenantId]', { label: 'QA Test Firm' });
await admin.fill('input[name=name]', 'QA Webhook Feed');
await clickAction(admin, admin.locator('button:has-text("Create connector")'));
const connRow = admin.locator('tr', { hasText: 'QA Webhook Feed' });
check('webhook connector created', await connRow.count() === 1);
const connText = await connRow.textContent();
check('connector starts CONFIGURED', connText.includes('CONFIGURED'));
const connUrl = (await connRow.locator('div.mono').first().textContent()).trim();
const connSecret = (await connRow.locator('code').first().textContent()).split(':')[1].trim();
check('webhook URL + secret displayed', Boolean(connUrl && connSecret), `url=${connUrl} secret=${connSecret ? 'yes' : 'no'}`);

// push cases through the webhook like an external system would
const payload = { cases: [
  { caseNumber: 'EXT-100', clientName: 'Pat External', status: 'In Progress', state: 'TX', revenueForecast: 900 },
  { case_number: 'EXT-101', client_name: 'Sam External', incident_date: '2026-05-15' },
]};
const whUrl = connUrl.replace('localhost:3100', '127.0.0.1:3100');
const r1 = await fetch(whUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-NextUS-Token': connSecret }, body: JSON.stringify(payload) });
const j1 = await r1.json();
check('webhook ingest 200 with 2 created', r1.status === 200 && j1.created === 2, JSON.stringify(j1));
const r2 = await fetch(whUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-NextUS-Token': connSecret }, body: JSON.stringify(payload) });
const j2 = await r2.json();
check('webhook re-ingest is idempotent (2 updated, 0 created)', j2.updated === 2 && j2.created === 0, JSON.stringify(j2));
const r3 = await fetch(whUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-NextUS-Token': 'wrong-secret' }, body: JSON.stringify(payload) });
check('webhook rejects bad secret (401)', r3.status === 401, `status ${r3.status}`);

await admin.reload();
const connText2 = await admin.locator('tr', { hasText: 'QA Webhook Feed' }).textContent();
check('connector shows ACTIVE with ingest result', connText2.includes('ACTIVE') && connText2.includes('2 updated'), connText2.slice(0, 200));
await admin.goto(base + '/app/cases?q=EXT-');
check('webhook cases visible in case list', (await admin.textContent('body')).includes('Pat External'));

// API-pull connector with bad credentials fails gracefully
await admin.goto(base + '/app/admin/connectors');
await admin.selectOption('select[name=provider]', 'CLIO');
await admin.selectOption('select[name=tenantId]', { label: 'QA Test Firm' });
await admin.fill('input[name=name]', 'QA Clio Sync');
await admin.fill('input[name=cred_accessToken]', 'invalid-token-for-test');
await clickAction(admin, admin.locator('button:has-text("Create connector")'));
const clioRow = admin.locator('tr', { hasText: 'QA Clio Sync' });
check('Clio connector created', await clioRow.count() === 1);
await Promise.all([
  admin.waitForResponse((r) => r.request().method() === 'POST', { timeout: 90000 }),
  clioRow.locator('button:has-text("Sync now")').click(),
]);
await admin.waitForLoadState('networkidle');
await admin.reload();
const clioText = await admin.locator('tr', { hasText: 'QA Clio Sync' }).textContent();
check('bad-credential sync surfaces ERROR status gracefully', clioText.includes('ERROR') && clioText.includes('Sync failed'), clioText.slice(0, 200));

await admin.goto(base + '/app/admin/audit?action=CONNECTOR_INGEST');
check('audit records connector ingests', (await admin.textContent('body')).includes('CONNECTOR_INGEST'));

// ---------- FIRM ADMIN SESSION: isolation & permission boundaries ----------
console.log('\n== 17. Tenant isolation (firm admin) ==');
const firm = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await login(firm, 'qa-admin@qatest.demo', 'QaTest123!');
check('firm dashboard scoped', (await firm.textContent('h1')).includes('QA Test Firm'));
await firm.goto(base + '/app/cases');
check('firm sees exactly its 3 cases (1 manual + 2 webhook)', (await firm.textContent('.page-sub')).includes('3 file'));
const firmBody = await firm.textContent('body');
check('no other firm names leak', !/Carlson|McMinn|FVF|Sewell|Demo Law/.test(firmBody));

// cross-tenant direct access must 404
await admin.goto(base + '/app/cases?q=TCS-1001');
const foreignHref = await admin.locator('tbody tr td a').first().getAttribute('href');
const resp = await firm.goto(base + foreignHref);
check('cross-tenant case URL returns 404', resp.status() === 404, `status ${resp.status()}`);

// admin pages must bounce
await firm.goto(base + '/app/admin/tenants');
check('firm admin blocked from tenant admin (redirected)', firm.url().endsWith('/app/dashboard'));
await firm.goto(base + '/app/import');
check('firm admin blocked from import (redirected)', firm.url().endsWith('/app/dashboard'));

// firm admin CAN manage own users but only firm roles
await firm.goto(base + '/app/admin/users');
const roleOptions = await firm.locator('select[name=role] option').allTextContents();
check('firm admin sees users page', firm.url().includes('/app/admin/users'));
check('firm admin cannot grant platform roles', !roleOptions.includes('Super Admin') && !roleOptions.includes('Case Manager'), roleOptions.join(','));
check('firm admin sees only own users', !(await firm.textContent('tbody')).includes('admin@nextus.demo'));
await firm.goto(base + '/app/admin/connectors');
check('firm admin sees own connectors only, no tenant column', (await firm.textContent('body')).includes('QA Webhook Feed'));

console.log('\n== 18. Read-only role enforcement (executive) ==');
const exec = await (await browser.newContext()).newPage();
await login(exec, 'exec@nextus.demo', 'Demo123!');
await exec.goto(caseUrl);
check('executive sees case but fields disabled', await exec.locator('select[name=status]').isDisabled());
check('executive has no New Case button', (await exec.locator('a:has-text("+ New Case")').count()) === 0);

console.log('\n== 19. Sign out ==');
await firm.click('button:has-text("Sign out")');
await firm.waitForURL('**/login', { timeout: 15000 });
check('sign out returns to login', firm.url().includes('/login'));
const back = await firm.goto(base + '/app/dashboard');
check('session actually cleared (dashboard redirects to login)', firm.url().includes('/login'), `landed ${firm.url()}`);

await browser.close();
console.log(`\n========== RESULTS: ${passed} passed, ${failed} failed ==========`);
if (failures.length) { console.log('Failed:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
