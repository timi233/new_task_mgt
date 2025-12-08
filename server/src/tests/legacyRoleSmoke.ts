import assert from 'node:assert';
import { resolveLegacyRole } from '../middlewares/auth';
import { FunctionalRole, ResponsibilityRole, Role } from '../types';

const cases = [
  { input: { role: Role.SALES }, expected: Role.SALES },
  { input: { role: null, responsibilityRole: ResponsibilityRole.SYSTEM_ADMIN }, expected: Role.SYSTEM_ADMIN },
  { input: { role: null, responsibilityRole: ResponsibilityRole.ADMIN }, expected: Role.ADMIN },
  { input: { role: null, responsibilityRole: ResponsibilityRole.AUDITOR }, expected: Role.AUDITOR },
  { input: { role: null, functionalRole: FunctionalRole.TECHNICIAN }, expected: Role.TECHNICIAN },
  { input: { role: null, functionalRole: FunctionalRole.SALES }, expected: Role.SALES },
];

cases.forEach(({ input, expected }) => {
  const actual = resolveLegacyRole(input);
  assert.strictEqual(
    actual,
    expected,
    `Expected ${expected} for payload ${JSON.stringify(input)}, but received ${actual}`
  );
});

const emptyPayloadResult = resolveLegacyRole({ role: null });
assert.strictEqual(emptyPayloadResult, null, 'Expected null role when no mapping could be derived');

console.log('Legacy role mapping smoke test passed');
