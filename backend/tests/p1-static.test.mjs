import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
const includes = (path,patterns) => { const text=read(path); for(const pattern of patterns) assert.ok(text.includes(pattern), `${path} must contain ${pattern}`); };

test('P0 remains intact',()=> {
 includes('src/modules/orders/orders.controller.ts',['requireCustomerAccess(req, "order", reference)']);
 includes('src/modules/complaints/complaints.controller.ts',['requireCustomerAccess(req, "complaint", caseReference)']);
 includes('src/modules/refunds/refunds.controller.ts',['requireCustomerAccess']);
 includes('src/modules/orders/orders.service.ts',['shipping_address_id: null']);
});
test('P1 verified review cannot be claimed by an unverified reference',()=>includes('src/modules/reviews/reviews.controller.ts',['if (input.orderReference) requireVerifiedOrderReview(req, input.orderReference)']));
test('P1 rate limit is SQL shared and attached to relevant writes',()=> {
 includes('src/middleware/sensitive-rate-limit.ts',['INSERT INTO api_rate_limit_buckets','ON DUPLICATE KEY UPDATE','createHmac']);
 includes('src/modules/orders/orders.routes.ts',['checkoutRateLimit','accessRecoveryRateLimit']);
 includes('src/modules/reviews/reviews.routes.ts',['reviewWriteRateLimit']);
 includes('src/modules/carts/carts.routes.ts',['cartCreationRateLimit']);
 includes('src/modules/complaints/complaints.routes.ts',['complaintWriteRateLimit']);
 includes('src/modules/refunds/refunds.routes.ts',['refundRateLimit']);
});
test('P1 request logger never records originalUrl',()=> {
 const logger=read('src/middleware/request-logger.ts');
 assert.ok(!logger.includes('path: req.originalUrl'));includes('src/middleware/request-logger.ts',['req.route?.path']);
 const email=read('src/modules/email/email.service.ts');assert.ok(!email.includes('payload: input.payload'));
});
test('P1 idempotency checks payload equality and persists fingerprint',()=>includes('src/modules/orders/orders.service.ts',['checkoutFingerprint','request_fingerprint: fingerprint','validateReplay(raced, fingerprint)']));
test('P1 cart accumulated quantity is bounded',()=>includes('src/modules/carts/carts.service.ts',['if (nextQty > 20)','CART_ITEM_QUANTITY_LIMIT']));
test('P1 transaction enqueues order received email',()=>includes('src/modules/orders/orders.service.ts',['eventType: "ORDER_RECEIVED"','order-received:']));
test('P1 admin/shipment status transitions are coordinated',()=> {
 includes('src/modules/orders/orders.service.ts',['SHIPMENT_WORKFLOW_REQUIRED','SHIPMENT_MUST_BE_CANCELLED']);
 includes('src/modules/shipments/shipments.service.ts',['ORDER_NOT_SHIPPED','FOR UPDATE','const changed = shipment.status !== input.status']);
});
test('P1 schema migration and app provide new capabilities',()=>{
 includes('prisma/migrations/20261008010000_p1_order_replay_email/migration.sql',['request_fingerprint','ORDER_RECEIVED']);
 includes('prisma/migrations/20261008011000_p1_shared_rate_limits/migration.sql',['api_rate_limit_buckets']);
 includes('src/modules/orders/orders.schema.ts',['const paymentMethod = z.enum(["COD", "MANUAL"])']);
});
