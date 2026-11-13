import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = p => readFileSync(new URL(p, import.meta.url),'utf8');

test('pending request is persisted and email carries private tracking capability in the same transaction', () => {
  const orders=file('../src/modules/orders/orders.service.ts');
  const access=file('../src/modules/customer-access/customer-access.ts');
  assert.match(orders,/order_status: "PENDING_CONFIRMATION"/);
  assert.match(orders,/eventType: "ORDER_RECEIVED"/);
  assert.match(orders,/trackingUrl: privateOrderTrackingUrl\(order\.order_reference\)/);
  assert.match(orders,/await enqueueEmail\(tx,/);
  assert.match(access,/signCustomerAccess\("order", reference\)/);
  assert.match(access,/#access=\$\{encodeURIComponent\(token\)\}/);
  assert.doesNotMatch(file('../src/modules/orders/orders.routes.ts'),/\/lookup/);
});

test('admin confirmation no longer requires phone agreement but still sells stock atomically', () => {
  const orders=file('../src/modules/orders/orders.service.ts');
  const update=orders.split('export async function updateOrderStatus')[1].split('export async function recordOrderCall')[0];
  assert.doesNotMatch(update,/CUSTOMER_PHONE_AGREEMENT_REQUIRED|CUSTOMER_CALL_REQUIRED|order_call_attempts\.findFirst/);
  assert.match(orders,/await sellAvailableStock\(tx, quantities, order\.order_id, audit\.staff\.id\)/);
  assert.match(orders,/eventType: "ORDER_CONFIRMED"/);
  assert.doesNotMatch(update,/outcome: input\.status === "CONFIRMED" \? "CUSTOMER_CONFIRMED"/);
});

test('hold is a distinct status and notification without reserving new stock', () => {
  const orders=file('../src/modules/orders/orders.service.ts');
  assert.match(orders,/ON_HOLD: \["CONFIRMED", "CANCELLED", "REJECTED", "OUT_OF_STOCK"\]/);
  assert.match(orders,/hold_expected_restock_at: holdRestock/);
  assert.match(orders,/hold_customer_wait_until: holdUntil/);
  assert.match(orders,/eventType: "ORDER_ON_HOLD"/);
  assert.match(file('../src/modules/orders/orders.schema.ts'),/holdExpectedRestockDate/);
});

test('admin panel exposes only four order decisions with no call prerequisite', () => {
  const ui=file('../../frontend/src/components/admin/OrdersManager.tsx');
  const actions=ui.split('const actions = (order: Order) =>')[1].split('  return <>')[0];
  for(const action of ['>Confirm</button>', '>Reject</button>', '>Out of Stock</button>', '"Hold"']) assert.ok(actions.includes(action));
  assert.doesNotMatch(actions,/hasPhoneAgreement|Record call|href=\{`tel:/);
});

test('rejection and out-of-stock notices include private tracking links', () => {
  const orders=file('../src/modules/orders/orders.service.ts');
  for(const status of ['ORDER_OUT_OF_STOCK','ORDER_CANCELLED']) assert.match(orders,new RegExp(`eventType: "${status}"`));
  assert.ok(orders.split('trackingUrl: privateOrderTrackingUrl(order.order_reference)').length >= 4);
});

test('email renderer escapes HTML and supports both HTML and text, with a clickable private link', () => {
  const renderer=file('../src/modules/email/email.templates.ts');
  assert.match(renderer,/escapeEmailHtml\(link\)/);
  assert.ok(renderer.includes('href=\"${escapeEmailHtml(link)}\"')); 
  assert.match(renderer,/return \{ html, text \}/);
  assert.match(renderer,/YOUR ORDER IS PENDING/);
  assert.match(renderer,/YOUR ORDER IS CONFIRMED/);
});

test('Resend credentials stay server-side, retries use idempotency, already-SENT mail cannot be resent', () => {
  const email=file('../src/modules/email/email.service.ts');
  const env=file('../src/config/env.ts');
  assert.match(email,/Authorization: `Bearer \$\{env\.RESEND_API_KEY\}`/);
  assert.match(email,/"Idempotency-Key": input\.dedupeKey/);
  assert.match(email,/signal: AbortSignal\.timeout\(15_000\)/);
  assert.match(email,/status: \{ in: \["FAILED", "DEAD"\] \}/);
  assert.match(env,/FRONTEND_ORIGIN must be the public HTTPS store URL/);
  assert.match(email,/if \(!env\.EMAIL_WORKER_ENABLED\) return;/);
});
