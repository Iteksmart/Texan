// Admin panel test: create a user via Admin → Users & Roles, verify it is
// saved to the database, and sign in with it.
//
// Usage:
//   node tests/e2e/admin-users.mjs create   # admin creates the user, new user logs in
//   node tests/e2e/admin-users.mjs verify   # (after a server restart) new user still logs in
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const mode = process.argv[2] ?? 'create';
const stateFile = process.env.STATE_FILE ?? '/tmp/admin-user-test.json';

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name} ${extra}`); }
}

const browser = await chromium.launch({ executablePath: process.env.PW_EXECUTABLE_PATH || undefined, args: ['--no-proxy-server'] });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', m => {
  if (m.type() === 'error' && !/ERR_CERT_AUTHORITY_INVALID|Failed to fetch RSC payload/.test(m.text())) consoleErrors.push(m.text());
});
page.on('pageerror', e => consoleErrors.push(String(e)));

async function login(email, password) {
  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await Promise.all([
    page.waitForURL('**/app/dashboard', { timeout: 20000 }),
    page.click('button[type=submit]'),
  ]);
}

async function logout() {
  await page.click('.topbar button[type=submit]');
  await page.waitForURL('**/login', { timeout: 15000 });
}

if (mode === 'create') {
  const stamp = Date.now().toString(36);
  const newUser = { email: `qa.user.${stamp}@nextus.demo`, password: 'QaTest123!', name: `QA Test User ${stamp}` };
  writeFileSync(stateFile, JSON.stringify(newUser));

  // 1. Admin creates the user in Admin → Users & Roles
  await login('admin@nextus.demo', 'Demo123!');
  await page.goto(base + '/app/admin/users', { waitUntil: 'networkidle' });
  check('admin users page loads', (await page.textContent('h1'))?.includes('Users'), await page.textContent('h1'));

  await page.fill('form.card input[name=name]', newUser.name);
  await page.fill('form.card input[name=email]', newUser.email);
  await page.fill('form.card input[name=title]', 'QA Analyst');
  await page.selectOption('form.card select[name=role]', 'CASE_MANAGER');
  await page.fill('form.card input[name=password]', newUser.password);
  await page.click('form.card button[type=submit]');

  // Server action revalidates the page; the new row must appear
  await page.waitForSelector(`table.data td:has-text("${newUser.email}")`, { timeout: 20000 });
  check('new user appears in users table', true);
  const row = page.locator('table.data tr', { hasText: newUser.email });
  check('new user shows Case Manager role', /Case Manager/.test(await row.textContent()));
  check('new user shows Active status', /Active/.test(await row.textContent()));

  // 2. The new user can sign in immediately
  await logout();
  await login(newUser.email, newUser.password);
  check('new user signs in successfully', page.url().includes('/app/dashboard'), page.url());
  check('topbar shows the new user', (await page.textContent('.topbar'))?.includes(newUser.name));

  // 3. The saved record survives a fresh page load (fresh server round-trip)
  await page.goto(base + '/app/dashboard', { waitUntil: 'networkidle' });
  check('new user session still valid after reload', page.url().includes('/app/dashboard'), page.url());
} else {
  // After a full server restart: the created user must still exist in the DB
  const newUser = JSON.parse(readFileSync(stateFile, 'utf8'));
  await login(newUser.email, newUser.password);
  check('new user still signs in after server restart (data persisted)', page.url().includes('/app/dashboard'), page.url());
  check('topbar shows the new user after restart', (await page.textContent('.topbar'))?.includes(newUser.name));
}

check('no browser console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
await browser.close();
console.log(`\n${passed} passed, ${failed} failed`);
if (failures.length) { console.log('Failures:', failures); process.exit(1); }
