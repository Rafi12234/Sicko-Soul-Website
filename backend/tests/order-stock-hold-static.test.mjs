import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

test('manually managed stock-hold schema is declared and checked read-only', () => {
  // The owner runs SQL in phpMyAdmin; it is not a CI dependency.
  const schema = read('prisma/schema.prisma');
  const deploy = read('../deploy/cpanel/deploy-cpanel.sh');
  assert.match(schema, /reservation_released_at\s+DateTime\?/);
  assert.match(schema, /idx_orders_pending_hold/);
  assert.match(deploy, /Checking manually managed database schema/);
  assert.match(deploy, /INFORMATION_SCHEMA\.COLUMNS/);
  assert.match(deploy, /COLUMN_NAME = 'reservation_released_at'/);
  assert.doesNotMatch(deploy, /npm run migrate:production|prisma migrate deploy|ALTER TABLE|DROP TABLE/);
});

test('expired hold releases inventory once; does not auto-reject or cancel COD order', () => {
  const worker = read('src/modules/orders/orders.expiry.ts');
  assert.match(worker, /reservation_released_at: null/);
  assert.match(worker, /FOR UPDATE/);
  assert.match(worker, /order\.reservation_released_at !== null/);
  assert.match(worker, /releaseReservedStock\(/);
  assert.match(worker, /data: \{ reservation_released_at: new Date\(\) \}/);
  assert.doesNotMatch(worker, /order_status: "REJECTED"|order_status: "CANCELLED"|to_status: "REJECTED"|cancelled_at: new Date\(\)/);
  assert.doesNotMatch(worker, /enqueueEmail\(/);
});

test('confirmation after hold release re-checks available inventory transactionally', () => {
  const service = read('src/modules/orders/orders.service.ts');
  assert.match(service, /SELECT order_id FROM orders WHERE order_reference = \$\{reference\} FOR UPDATE/);
  assert.match(service, /if \(order\.reservation_released_at !== null\) \{[\s\S]*?await lockAndVerifyAvailableStock\(tx, quantities\);\s*await reserveStock\(tx, quantities, order\.order_id\);/);
  assert.match(service, /await consumeReservedStock\(tx, quantities, order\.order_id, audit\.staff\.id\)/);
});

test('cancel or reject of a released order never releases inventory twice', () => {
  const service = read('src/modules/orders/orders.service.ts');
  assert.match(service, /\(input\.status === "CANCELLED" \|\| input\.status === "REJECTED"\) &&\s*order\.reservation_released_at === null/);
});

test('admin UI exposes expired stock hold without changing pending order status', () => {
  const mapper = read('src/modules/orders/orders.mapper.ts');
  const admin = read('../frontend/src/components/admin/AdminConsole.tsx');
  assert.match(mapper, /stockHoldStatus: row\.order_status === "PENDING_CONFIRMATION"/);
  assert.match(admin, /STOCK HOLD EXPIRED — ORDER STILL PENDING/);
  assert.match(admin, /stockHoldStatus/);
});

test('production deployment never applies database migrations automatically', () => {
  const deploy = read('../deploy/cpanel/deploy-cpanel.sh');
  assert.doesNotMatch(deploy, /npm run migrate:production|prisma migrate deploy|Applying forward-compatible database migrations/);
  assert.match(deploy, /Checking manually managed database schema/);
});
