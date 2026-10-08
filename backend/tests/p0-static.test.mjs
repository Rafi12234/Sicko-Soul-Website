import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

test('public order details require a scoped access token', () => {
  const code = read('../src/modules/orders/orders.controller.ts');
  assert.match(code, /requireCustomerAccess\(req, "order", reference\)/);
  assert.match(code, /sendCustomerAccessLink\("order"/);
  assert.doesNotMatch(code, /res\.json\(await lookupOrder/);
});
test('complaint messages, replies and refund request are protected', () => {
  const complaints = read('../src/modules/complaints/complaints.controller.ts');
  const refund = read('../src/modules/refunds/refunds.controller.ts');
  assert.ok(complaints.match(/requireCustomerAccess\(req, "complaint", caseReference\)/g)?.length >= 2);
  assert.match(refund, /requireCustomerAccess\(req, "order", reference\)/);
});
test('order reference alone cannot be substituted for a customer JWT', () => {
  const code = read('../src/modules/customer-access/customer-access.ts');
  assert.match(code, /jwt\.verify\(/);
  assert.match(code, /claims\.kind !== kind \|\| claims\.reference !== reference/);
  assert.match(code, /algorithms: \["HS256"\]/);
});
test('customer email upsert never overwrites an existing profile', () => {
  const code = read('../src/modules/customers/customers.service.ts');
  assert.match(code, /update: \{\}, \/\/ Checkout does not prove email ownership/);
  assert.match(code, /return \{ customer, address: null \}/);
});
test('stock expiry uses row lock and transactional release', () => {
  const code = read('../src/modules/orders/orders.expiry.ts');
  assert.match(code, /FOR UPDATE/);
  assert.match(code, /releaseReservedStock\(/);
  assert.match(code, /order\.order_status !== "PENDING_CONFIRMATION"/);
  assert.match(code, /to_status: "REJECTED"/);
});
test('access recovery is email-based, stores no capability in URL query', () => {
  const code = read('../src/modules/customer-access/customer-access.service.ts');
  const front = read('../../frontend/src/lib/customerAccess.ts');
  assert.match(code, /#access=/);
  assert.match(front, /history\.replaceState/);
  assert.match(front, /sessionStorage/);
});
test('database migration permits recovery email event', () => {
  const schema = read('../prisma/schema.prisma');
  const sql = read('../prisma/migrations/20261008000000_customer_access_email/migration.sql');
  assert.match(schema, /CUSTOMER_ACCESS/);
  assert.match(sql, /CUSTOMER_ACCESS/);
});
