/**
 * P0 release gate. Runs ONLY on an isolated staging API/database with seeded
 * product+variant fixtures. NEVER point this at production: it creates records.
 * Node 20+ built-in test runner; no external test dependencies.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.P0_STAGING_API_URL?.replace(/\/$/, '');
const productId = process.env.P0_STAGING_PRODUCT_ID;
const variantId = process.env.P0_STAGING_VARIANT_ID;
const email = process.env.P0_STAGING_CUSTOMER_EMAIL;
const phone = process.env.P0_STAGING_CUSTOMER_PHONE;
let adminToken = process.env.P0_STAGING_ADMIN_TOKEN;

// Explicit opt-in plus a forbidden production hostname list. A CI job with no
// staging credentials FAILS CLOSED; never silently reports these tests passing.
if (process.env.P0_STAGING_ALLOW_WRITE !== 'true' ||
    (!base || !productId || !variantId || !email || !phone || !(adminToken || (process.env.P0_STAGING_ADMIN_EMAIL && process.env.P0_STAGING_ADMIN_PASSWORD))) ||
    !/^https?:\/\//.test(base) ||
    /(^|\/\/)(www\.)?sickosoul\.shop([/:]|$)/i.test(base)) {
  throw new Error('P0 staging gate requires P0_STAGING_ALLOW_WRITE=true, a NON-production P0_STAGING_API_URL, staging product/variant/customer fixtures AND P0_STAGING_ADMIN_TOKEN.');
}

async function request(method, path, data, token) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const checkout = (source, cartToken) => ({
  idempotencyKey: randomUUID(), source,
  ...(cartToken ? {cartToken} : {}),
  customer: { name: 'P0 Staging Shopper', email, phone },
  shipping: { address: 'STAGING TEST ADDRESS 123', city: 'Dhaka', district: 'Dhaka' },
  paymentMethod: 'COD', items: [{ productId, variantId, quantity: 1 }],
});

// Keep HTTP write tests serial to prevent fixture stock conflicts.
test('P0 staging: order authorization, refund authorization, cart, complaint, review', { concurrency: false }, async (t) => {
  if (!adminToken) {
    const login = await request('POST', '/admin/auth/login', {
      email: process.env.P0_STAGING_ADMIN_EMAIL, password: process.env.P0_STAGING_ADMIN_PASSWORD,
    });
    assert.equal(login.status, 200, 'Staging admin login must work');
    adminToken = login.body.data?.token ?? login.body.data?.accessToken;
    assert.ok(adminToken, 'Staging admin auth token required');
  }
  let res = await request('POST', '/carts', {});
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const cartToken = res.body.data?.token ?? res.body.data?.cartToken;
  assert.ok(cartToken, 'Cart has a server token');
  res = await request('POST', `/carts/${encodeURIComponent(cartToken)}/items`, { variantId, quantity: 1 });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const cartItems = res.body.data?.items;
  assert.ok(cartItems?.length, 'Cart includes item');
  const itemId = cartItems[0]?.id;
  assert.ok(itemId);
  res = await request('PATCH', `/carts/${encodeURIComponent(cartToken)}/items/${itemId}`, { quantity: 1 });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  const payload = checkout('CART', cartToken);
  res = await request('POST', '/orders', payload);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const reference = res.body.reference;
  const access = res.body.accessToken;
  assert.ok(reference && access, 'Order includes private access token');

  await t.test('reference alone never reveals order/customer details', async () => {
    const forbidden = await request('GET', `/orders/${encodeURIComponent(reference)}`);
    assert.equal(forbidden.status, 401);
    assert.ok(!JSON.stringify(forbidden.body).includes(email));
    const allowed = await request('GET', `/orders/${encodeURIComponent(reference)}`, undefined, access);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.reference, reference);
  });
  await t.test('unauthorized refunds are blocked; unpaid requests do not create refunds', async () => {
    const forged = await request('POST', `/orders/${reference}/refunds`, { amount: 1, reason: 'Test forged request' });
    assert.equal(forged.status, 401);
    const unpaid = await request('POST', `/orders/${reference}/refunds`, { amount: 1, reason: 'Test not paid request' }, access);
    assert.equal(unpaid.status, 409);
  });
  await t.test('legacy order lookup does not disclose order data', async () => {
    const lookup = await request('POST', '/orders/lookup', { reference, identifier: email });
    assert.equal(lookup.status, 200);
    assert.ok(!JSON.stringify(lookup.body).includes(phone));
    assert.ok(!lookup.body.accessToken);
  });
  await t.test('complaint reading and replies require same-case access', async () => {
    const categoryResult = await request('GET', '/complaints/categories');
    assert.equal(categoryResult.status, 200);
    const code = categoryResult.body.data?.[0]?.code;
    assert.ok(code, 'Seed a public complaint category');
    const created = await request('POST', '/complaints', {
      category: code, contactEmail: email, contactName: 'P0 Tester',
      message: 'Isolated staging privacy regression test.'
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const caseRef = created.body.reference;
    assert.ok(caseRef);
    assert.equal(created.body.accessToken, undefined, 'Submission does not prove mailbox ownership');
    const unauth = await request('GET', `/complaints/${caseRef}`);
    assert.equal(unauth.status, 401);
    const wrongScope = await request('GET', `/complaints/${caseRef}`, undefined, access);
    assert.equal(wrongScope.status, 401);
    const forged = await request('POST', `/complaints/${caseRef}/messages`, { message: 'Forged reply' });
    assert.equal(forged.status, 401);
    const recovery = await request('POST', '/complaints/access', { caseReference: caseRef, email });
    assert.equal(recovery.status, 200);
    assert.ok(!recovery.body.accessToken, 'Recovery token delivered only by email');
  });
  await t.test('replay same idempotency key does not double reserve stock', async () => {
    const again = await request('POST', '/orders', payload);
    assert.equal(again.status, 201);
    assert.equal(again.body.reference, reference);
  });
  await t.test('product-wise reviews enter the moderation workflow', async () => {
    const review = await request('POST', `/products/${encodeURIComponent(productId)}/reviews`, {
      displayName: 'P0 QA', email, rating: 4,
      title: 'Staging', text: 'This test review belongs to staging data only.'
    });
    assert.equal(review.status, 201, JSON.stringify(review.body));
    assert.equal(review.body.status, 'PENDING');
  });
  await t.test('admin progression: confirm, ship, pay, deliver and process refund', async () => {
    const got = await request('GET', `/admin/orders/${reference}`, undefined, adminToken);
    assert.equal(got.status, 200, JSON.stringify(got.body));
    const confirmed = await request('PATCH', `/admin/orders/${reference}/status`, { status: 'CONFIRMED' }, adminToken);
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    const processing = await request('PATCH', `/admin/orders/${reference}/status`, { status: 'PROCESSING' }, adminToken);
    assert.equal(processing.status, 200, JSON.stringify(processing.body));
    const shipment = await request('POST', '/admin/shipments', {
      orderReference: reference, courierName: 'P0 Staging Courier', shippingCost: 0,
    }, adminToken);
    assert.equal(shipment.status, 201, JSON.stringify(shipment.body));
    const shipmentId = shipment.body.data?.id;
    assert.ok(shipmentId);
    for (const status of ['READY', 'DISPATCHED', 'DELIVERED']) {
      const moved = await request('PATCH', `/admin/shipments/${shipmentId}`, { status }, adminToken);
      assert.equal(moved.status, 200, JSON.stringify(moved.body));
    }
    const current = await request('GET', `/orders/${reference}`, undefined, access);
    assert.equal(current.status, 200);
    assert.equal(current.body.status, 'DELIVERED');
    assert.ok(current.body.payments?.length, 'Payment record was created');
    const firstPayment = current.body.payments[0];
    const payment = await request('PATCH', `/admin/payments/${firstPayment.id}`, { status: 'PAID' }, adminToken);
    assert.equal(payment.status, 200, JSON.stringify(payment.body));
    const paid = await request('GET', `/orders/${reference}`, undefined, access);
    assert.equal(paid.status, 200);
    assert.equal(paid.body.paymentStatus, 'PAID');
    const refund = await request('POST', `/orders/${reference}/refunds`, { amount: 1, reason: 'Staging refundable item' }, access);
    assert.equal(refund.status, 201, JSON.stringify(refund.body));
    const repeated = await request('POST', `/orders/${reference}/refunds`, { amount: 1, reason: 'Duplicate staging request' }, access);
    assert.equal(repeated.status, 409);
    const updated = await request('PATCH', `/admin/refunds/${refund.body.id}`, { status: 'REJECTED' }, adminToken);
    assert.equal(updated.status, 200);
  });
});
