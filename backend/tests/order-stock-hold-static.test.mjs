import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

test('schema matches the manually applied compatible phone-order SQL', () => {
  const schema = read('prisma/schema.prisma');
  const deploy = read('../deploy/cpanel/deploy-cpanel.sh');
  assert.match(schema, /stock_hold_created_at_checkout\s+Boolean\s+@default\(true\)/);
  assert.match(schema, /model order_call_attempts \{/);
  assert.match(schema, /OUT_OF_STOCK/);
  assert.match(schema, /ORDER_OUT_OF_STOCK/);
  assert.match(deploy, /stock_hold_created_at_checkout/);
  assert.match(deploy, /order_call_attempts/);
  assert.doesNotMatch(deploy, /npm run migrate:production|prisma migrate deploy|ALTER TABLE|DROP TABLE/);
});

test('checkout records a request with NO reservation and leaves legacy flag intact', () => {
  const service = read('src/modules/orders/orders.service.ts');
  const creation = service.split('export async function createOrder')[1].split('export async function getOrder')[0];
  assert.match(creation, /await lockAndVerifyAvailableStock/);
  assert.match(creation, /stock_hold_created_at_checkout: false/);
  assert.doesNotMatch(creation, /await reserveStock\(/);
  assert.match(creation, /order_status: "PENDING_CONFIRMATION"/);
});

test('legacy TTL worker only releases LEGACY holds and never cancels pending order', () => {
  const worker = read('src/modules/orders/orders.expiry.ts');
  assert.match(worker, /stock_hold_created_at_checkout: true/);
  assert.match(worker, /!order\.stock_hold_created_at_checkout/);
  assert.match(worker, /releaseReservedStock\(/);
  assert.match(worker, /FOR UPDATE/);
  assert.doesNotMatch(worker, /order_status: "REJECTED"|order_status: "CANCELLED"|to_status: "REJECTED"/);
});

test('phone confirmation deducts unreserved stock with row locks; old holds are consumed once', () => {
  const service = read('src/modules/orders/orders.service.ts');
  const inventory = read('src/modules/inventory/inventory.service.ts');
  assert.match(service, /if \(!order\.stock_hold_created_at_checkout\)/);
  assert.match(service, /await sellAvailableStock\(tx, quantities, order\.order_id, audit\.staff\.id\)/);
  assert.match(service, /if \(order\.reservation_released_at !== null\)/);
  assert.match(service, /await reserveStock\(tx, quantities, order\.order_id\)/);
  assert.match(service, /await consumeReservedStock\(tx, quantities, order\.order_id, audit\.staff\.id\)/);
  assert.match(inventory, /await lockAndVerifyAvailableStock\(tx, lines\)/);
  assert.match(inventory, /on_hand_qty: \{ decrement: line\.quantity \}/);
  assert.match(inventory, /reserved_delta: 0/);
  assert.match(read('src/modules/inventory/inventory.repository.ts'), /FOR UPDATE/);
});

test('reject and unavailable are terminal, never consume new stock, and send distinct emails', () => {
  const service = read('src/modules/orders/orders.service.ts');
  assert.match(service, /OUT_OF_STOCK: \[\]/);
  assert.match(service, /order\.stock_hold_created_at_checkout &&\s*order\.reservation_released_at === null/);
  assert.match(service, /eventType: "ORDER_OUT_OF_STOCK"/);
  assert.match(service, /eventType: "ORDER_CONFIRMED"/);
  assert.match(service, /eventType: "ORDER_CANCELLED"/);
});

test('call again is tracked and does not create a sale or alter pending order state', () => {
  const service = read('src/modules/orders/orders.service.ts');
  const calls = service.split('export async function recordOrderCall')[1].split('export async function listOrdersForAdmin')[0];
  assert.match(calls, /PENDING_CONFIRMATION/);
  assert.match(calls, /tx\.order_call_attempts\.create/);
  assert.doesNotMatch(calls, /reserveStock\(|sellAvailableStock\(|consumeReservedStock\(/);
  assert.match(read('src/modules/orders/orders.routes.ts'), /adminRecordOrderCallController/);
});

test('admin workflow offers phone actions and customer-facing status stays accurate', () => {
  const admin = read('../frontend/src/components/admin/OrdersManager.tsx');
  const mapper = read('src/modules/orders/orders.mapper.ts');
  const ui = read('../frontend/src/components/commerce/OrderIntake/index.tsx');
  for (const label of ['Confirm', 'Reject', 'Out of stock', 'Call again', "Today's orders"]) {
    assert.ok(admin.includes(label), label);
  }
  assert.match(mapper, /stockHoldStatus: row\.order_status === "PENDING_CONFIRMATION"/);
  assert.match(mapper, /"NONE"/);
  assert.match(ui, /stock is not guaranteed|Stock is not guaranteed/i);
});
