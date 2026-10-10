import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileName } from './profile-name.ts';

test('handles provider-specific and standard OIDC name claims', () => {
  assert.deepEqual(profileName({ first_name: ' DEMO ', last_name: ' User ' }), { firstName: 'DEMO', lastName: 'User' });
  assert.deepEqual(profileName({ given_name: 'DEMO', family_name: 'User' }), { firstName: 'DEMO', lastName: 'User' });
});
test('keeps the full name and supports provider username when a name is absent', () => {
  assert.deepEqual(profileName({ first_name: '', name: 'DEMO Full Name' }), { firstName: 'DEMO Full Name', lastName: null });
  assert.deepEqual(profileName({ preferred_username: 'DEMO-user' }), { firstName: 'DEMO-user', lastName: null });
});
test('never invents a name from email or non-string claims', () => {
  assert.deepEqual(profileName({ first_name: 123, name: ' ', email: 'demo@example.com' }), { firstName: null, lastName: null });
});
