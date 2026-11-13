import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin can choose exactly Confirm, Reject, Out of Stock, Hold without phone gate', () => {
  const component = file('../frontend/src/components/admin/OrdersManager.tsx');
  const actions = component.split('const actions = (order: Order) =>')[1].split('  return <>')[0];
  for (const text of ['>Confirm</button>', '>Reject</button>', '>Out of Stock</button>','>Hold</button>']) {
    // Edit Hold is an alternate label within the same button.
    if (text === '>Hold</button>') assert.match(actions, /: "Hold"/);
    else assert.ok(actions.includes(text), text);
  }
  assert.doesNotMatch(actions, /hasPhoneAgreement|<a href=\{`tel:|Record call|saveCall|CALL_AGAIN/);
  assert.match(actions, /disabled=\{busy\}/);
});

test('backend does not require a call record and still sells atomically', () => {
  const service = file('src/modules/orders/orders.service.ts');
  const update = service.split('export async function updateOrderStatus(')[1].split('export async function recordOrderCall(')[0];
  assert.doesNotMatch(update, /CUSTOMER_PHONE_AGREEMENT_REQUIRED|CUSTOMER_CALL_REQUIRED|order_call_attempts\.findFirst|order_call_attempts\.count/);
  assert.match(update, /sellAvailableStock\(tx, quantities, order\.order_id, audit\.staff\.id\)/);
  assert.match(update, /INVALID_ORDER_STATUS_TRANSITION/);
  assert.match(update, /ORDER_CONFIRMED/);
  assert.match(update, /REJECTION_REASON_REQUIRED/);
});

test('hold is an explicit persistent status with restock and customer wait dates', () => {
  const schema = file('prisma/schema.prisma');
  const validation = file('src/modules/orders/orders.schema.ts');
  const service = file('src/modules/orders/orders.service.ts');
  const mapper = file('src/modules/orders/orders.mapper.ts');
  const sql = file('../sql/01_MANUAL_ORDER_HOLD_WORKBENCH.sql');
  for (const code of [schema, validation, service, sql]) assert.match(code, /ON_HOLD/);
  for (const col of ['hold_expected_restock_at','hold_customer_wait_until']) {
    assert.match(schema, new RegExp(col));
    assert.match(sql, new RegExp(col));
    assert.match(mapper, new RegExp(col));
  }
  assert.match(service, /releasesLegacyHold/);
  assert.match(service, /reservation_released_at: now/);
  assert.match(service, /ORDER_ON_HOLD/);
  assert.match(service, /order-on-hold/);
  assert.match(service, /trackingUrl: privateOrderTrackingUrl\(order\.order_reference\)/);
  assert.match(service, /ON_HOLD: \["CONFIRMED", "CANCELLED", "REJECTED", "OUT_OF_STOCK"\]/);
  assert.match(file('src/modules/orders/orders.expiry.ts'), /"ON_HOLD"/);
});

test('hold email includes private tracking link and no confirmation claim', () => {
  const templates = file('src/modules/email/email.templates.ts');
  assert.match(templates, /case "order-on-hold":/);
  assert.match(templates, /ON HOLD/);
  assert.match(templates, /no stock is reserved yet/);
  assert.match(templates, /str\(payload\.expectedRestockDate\)/);
  assert.match(templates, /str\(payload\.customerWaitUntil\)/);
  assert.match(templates, /safeTrackingUrl\(payload\)/);
});

test('customer sees hold as waiting not terminal or confirmed', () => {
  const page = file('../frontend/src/components/commerce/OrderFile.tsx');
  assert.match(page, /order\.status === "ON_HOLD"/);
  assert.match(page, /isWaitingForRestock \?/);
  assert.match(page, /no items have been reserved/);
  assert.match(page, /holdCustomerWaitUntil/);
});
