import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoginEmailCandidates } from '../src/lib/login-email';
import { getDemoFallbackSession } from '../src/lib/demo-auth';
import isRedirectError from '../src/app/login/redirect';

test('legacy admin alias resolves to the seeded demo account', () => {
  assert.deepEqual(resolveLoginEmailCandidates('admin@nextup.demo'), [
    'admin@nextup.demo',
    'admin@nextus.demo',
  ]);
});

test('legacy admin@nextup.com fallback works with demo credentials', () => {
  const session = getDemoFallbackSession('admin@nextup.com', 'Demo123!');
  assert.ok(session);
  assert.equal(session?.email, 'admin@nextup.com');
  assert.equal(session?.role, 'SUPER_ADMIN');
});

test('redirect errors are treated as redirects and not as login failures', () => {
  const error = new Error('NEXT_REDIRECT');
  (error as Error & { digest?: string }).digest = 'NEXT_REDIRECT';
  assert.equal(isRedirectError(error), true);
  assert.equal(isRedirectError(new Error('boom')), false);
});
