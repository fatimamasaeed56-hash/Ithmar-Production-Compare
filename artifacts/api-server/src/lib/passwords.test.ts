import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
// @ts-expect-error Native Node test runner loads TypeScript source without transpiling paths.
import { strongPassword, hashPassword, verifyPassword } from './passwords.ts';

test('password policy requires >8 characters, letters, numbers, and symbols', () => {
  assert.equal(strongPassword('Abcd123!'), false);
  assert.equal(strongPassword('abcdefghi!'), false);
  assert.equal(strongPassword('123456789!'), false);
  assert.equal(strongPassword('abcdefgh123'), false);
  assert.equal(strongPassword('abcdefgh1 '), false);
  assert.equal(strongPassword('كلمةقوية123!'), true);
  assert.equal(strongPassword('a1😀😀😀😀'), false);
  assert.equal(strongPassword('A'.repeat(129) + '1!'), false);
});

test('salted hashes verify correctly and never store the original password', async () => {
  const password = randomBytes(18).toString('base64url') + 'Az1!';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password + 'x', first), false);
  assert.equal(await verifyPassword(password), false);
});
