import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoginEmailCandidates } from '../src/lib/login-email';

test('legacy admin alias resolves to the seeded demo account', () => {
  assert.deepEqual(resolveLoginEmailCandidates('admin@nextup.demo'), [
    'admin@nextup.demo',
    'admin@nextus.demo',
  ]);
});
