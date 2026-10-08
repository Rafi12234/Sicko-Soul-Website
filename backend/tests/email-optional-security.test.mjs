import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');

test('private order, refund and case paths always require scoped capability', () => {
  const orders=read('../src/modules/orders/orders.controller.ts');
  const complaints=read('../src/modules/complaints/complaints.controller.ts');
  const refunds=read('../src/modules/refunds/refunds.controller.ts');
  assert.match(orders,/requireCustomerAccess\(req, "order", reference\)/);
  assert.match(complaints,/requireCustomerAccess\(req, "complaint", caseReference\)/);
  assert.match(refunds,/requireCustomerAccess\(req, "order", reference\)/);
});
test('access cannot be recovered using only a known email / reference', () => {
  const orders=read('../src/modules/orders/orders.routes.ts');
  const complaints=read('../src/modules/complaints/complaints.routes.ts');
  assert.doesNotMatch(orders,/\/lookup/);
  assert.doesNotMatch(complaints,/\/access/);
  const service=read('../src/modules/customer-access/customer-access.ts');
  assert.match(service,/claims.kind !== kind \|\| claims.reference !== reference/);
  assert.match(service,/algorithms: \["HS256"\]/);
});
test('complaint creator receives new-case-only token, customer email not tied to an existing profile', () => {
  const service=read('../src/modules/complaints/complaints.service.ts');
  assert.match(service,/accessToken: signCustomerAccess\("complaint", complaint.case_reference\)/);
  assert.match(service,/Anonymous case contact email is not proof of customer identity/);
});
test('no-email mode does not leak private access links into logs or email queue', () => {
  const email=read('../src/modules/email/email.service.ts');
  const logger=read('../src/middleware/request-logger.ts');
  assert.match(email,/if \(!env.EMAIL_WORKER_ENABLED\) return;/);
  assert.doesNotMatch(logger,/path: req.originalUrl/);
  assert.doesNotMatch(logger,/accessToken/);
});
test('anti-abuse protections remain enforced for all major customer write operations', () => {
  for (const [file,matcher] of [
    ['../src/modules/orders/orders.routes.ts',/checkoutRateLimit/],
    ['../src/modules/carts/carts.routes.ts',/cartCreationRateLimit/],
    ['../src/modules/complaints/complaints.routes.ts',/complaintWriteRateLimit/],
    ['../src/modules/refunds/refunds.routes.ts',/refundRateLimit/],
    ['../src/modules/reviews/reviews.routes.ts',/reviewWriteRateLimit/],
  ]) assert.match(read(file),matcher,file);
  const expiry=read('../src/modules/orders/orders.expiry.ts');
  assert.match(expiry,/releaseReservedStock\(/);
});
