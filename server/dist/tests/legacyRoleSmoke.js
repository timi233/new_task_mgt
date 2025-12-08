"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const auth_1 = require("../middlewares/auth");
const types_1 = require("../types");
const cases = [
    { input: { role: types_1.Role.SALES }, expected: types_1.Role.SALES },
    { input: { role: null, responsibilityRole: types_1.ResponsibilityRole.SYSTEM_ADMIN }, expected: types_1.Role.SYSTEM_ADMIN },
    { input: { role: null, responsibilityRole: types_1.ResponsibilityRole.ADMIN }, expected: types_1.Role.ADMIN },
    { input: { role: null, responsibilityRole: types_1.ResponsibilityRole.AUDITOR }, expected: types_1.Role.AUDITOR },
    { input: { role: null, functionalRole: types_1.FunctionalRole.TECHNICIAN }, expected: types_1.Role.TECHNICIAN },
    { input: { role: null, functionalRole: types_1.FunctionalRole.SALES }, expected: types_1.Role.SALES },
];
cases.forEach(({ input, expected }) => {
    const actual = (0, auth_1.resolveLegacyRole)(input);
    node_assert_1.default.strictEqual(actual, expected, `Expected ${expected} for payload ${JSON.stringify(input)}, but received ${actual}`);
});
const emptyPayloadResult = (0, auth_1.resolveLegacyRole)({ role: null });
node_assert_1.default.strictEqual(emptyPayloadResult, null, 'Expected null role when no mapping could be derived');
console.log('Legacy role mapping smoke test passed');
//# sourceMappingURL=legacyRoleSmoke.js.map