// Sign-in smoke test for the United Legal Support Services portal rebrand.
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3000';
const shots = process.env.SHOTS_DIR;

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; failures.push(name); console.log(`  FAIL  ${name} ${extra}`); }
}

const browser = await chromium.launch({ executablePath: process.env.PW_EXECUTABLE_PATH || undefined, args: ['--no-proxy-server'] });
const page = await browser.newPage();

// Ignore noise that is not an app failure: external font fetches blocked by
// sandboxed test environments, and Next.js prefetches aborted when the test
// navigates away mid-flight (Next falls back to a full navigation on its own).
const IGNORED_CONSOLE = [/ERR_CERT_AUTHORITY_INVALID/, /Failed to fetch RSC payload/];
const consoleErrors = [];
page.on('console', m => {
  if (m.type() === 'error' && !IGNORED_CONSOLE.some(re => re.test(m.text()))) consoleErrors.push(m.text());
});
page.on('pageerror', e => consoleErrors.push(String(e)));
const failedRequests = [];
page.on('response', r => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });

// 1. Root URL redirects to the sign-in portal (website removed)
await page.goto(base + '/', { waitUntil: 'networkidle' });
check('root redirects to /login', page.url().endsWith('/login'), page.url());

// 2. Login page branding
check('login title', (await page.title()).includes('United Legal Support Services'), await page.title());
const h1 = (await page.textContent('.login-card h1'))?.trim();
check('login h1 says United Legal Support Services', h1 === 'United Legal Support Services', h1);
const body = await page.textContent('body');
check('no Texan branding on login page', !/texan/i.test(body));
if (shots) await page.screenshot({ path: shots + '/login.png', fullPage: true });

// 3. Sign in as platform admin
await page.fill('input[name=email]', 'admin@nextus.demo');
await page.fill('input[name=password]', 'Demo123!');
await Promise.all([
  page.waitForURL('**/app/dashboard', { timeout: 20000 }),
  page.click('button[type=submit]'),
]);
await page.waitForLoadState('networkidle');
check('signed in, landed on /app/dashboard', page.url().includes('/app/dashboard'), page.url());
check('no error box shown', (await page.locator('.error-box').count()) === 0);

// 4. Portal branding after sign-in
const brand = (await page.textContent('.portal-brand'))?.replace(/\s+/g, ' ').trim();
check('sidebar brand is United Legal Support Services', /United Legal.*Support Services/i.test(brand ?? ''), brand);
check('sidebar mark is ULS', (await page.textContent('.portal-mark'))?.trim() === 'ULS');
const sidebar = await page.textContent('.sidebar');
check('no "Texan Website" link in sidebar', !/texan/i.test(sidebar ?? ''));
check('topbar shows signed-in user', /Platform Admin/.test((await page.textContent('.topbar')) ?? ''));
if (shots) await page.screenshot({ path: shots + '/dashboard.png', fullPage: false });

// 5. Root URL now goes to dashboard while signed in
await page.goto(base + '/', { waitUntil: 'networkidle' });
check('root redirects to dashboard when signed in', page.url().includes('/app/dashboard'), page.url());

// 6. Sign out returns to login
await page.click('.topbar button[type=submit]');
await page.waitForURL('**/login', { timeout: 15000 });
check('sign out returns to /login', page.url().endsWith('/login'), page.url());

// 7. A firm (tenant) user can also sign in
await page.fill('input[name=email]', 'admin@carlson-law-firm.demo');
await page.fill('input[name=password]', 'Demo123!');
await Promise.all([
  page.waitForURL('**/app/dashboard', { timeout: 20000 }),
  page.click('button[type=submit]'),
]);
check('firm admin signs in successfully', page.url().includes('/app/dashboard'), page.url());
check('firm admin sees tenant name', /Carlson/.test((await page.textContent('.topbar')) ?? ''));

// 8. Bad credentials are rejected with the error message (no crash)
await page.click('.topbar button[type=submit]');
await page.waitForURL('**/login');
await page.fill('input[name=email]', 'admin@nextus.demo');
await page.fill('input[name=password]', 'wrong-password');
await page.click('button[type=submit]');
await page.waitForSelector('.error-box', { timeout: 15000 });
check('bad password shows error message', /Invalid credentials/.test((await page.textContent('.error-box')) ?? ''));

// 9. No console errors or failed requests anywhere in the flow
check('no browser console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
check('no failed HTTP requests', failedRequests.length === 0, failedRequests.join(' | '));

await browser.close();
console.log(`\n${passed} passed, ${failed} failed`);
if (failures.length) { console.log('Failures:', failures); process.exit(1); }
