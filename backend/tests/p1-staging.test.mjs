/**
 * DESTRUCTIVE STAGING TEST: creates orders, payment transitions, shipments,
 * refunds and reviews; requires isolated disposable staging database/fixtures.
 * Never use with production or a production database clone containing users.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = process.env.P1_STAGING_API_URL?.replace(/\/$/,'');
const allow = process.env.P1_STAGING_ALLOW_WRITE === 'true';
if (!allow || !base || !/^https?:\/\//.test(base) || /(^|\/\/)(www\.)?sickosoul\.shop([/:]|$)/i.test(base) ||
    !process.env.P1_STAGING_PRODUCT_ID || !process.env.P1_STAGING_VARIANT_ID || !process.env.P1_STAGING_CUSTOMER_EMAIL || !process.env.P1_STAGING_CUSTOMER_PHONE ||
    !process.env.P1_STAGING_ADMIN_EMAIL || !process.env.P1_STAGING_ADMIN_PASSWORD ||
    !process.env.P1_STAGING_SUPPORT_EMAIL || !process.env.P1_STAGING_SUPPORT_PASSWORD ||
    !process.env.P1_STAGING_ORDER_MANAGER_EMAIL || !process.env.P1_STAGING_ORDER_MANAGER_PASSWORD ||
    !process.env.P1_STAGING_INVENTORY_MANAGER_EMAIL || !process.env.P1_STAGING_INVENTORY_MANAGER_PASSWORD ||
    !process.env.P1_STAGING_TEST_INBOX_URL || !process.env.P1_STAGING_TEST_INBOX_BEARER) {
  throw new Error('P1 staging test requires explicit write opt-in, NON-production staging API and full admin/support + catalog fixtures. Never run on production.');
}
async function http(method,path,data,token) {
 const response=await fetch(base+path,{method, headers: {'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 return {status:response.status,body:await response.json().catch(()=>({}))};
}
const staffLogin = async (email,password) => {
 const r=await http('POST','/admin/auth/login',{email,password});assert.equal(r.status,200,JSON.stringify(r.body));assert.ok(r.body.data?.token);return r.body.data.token;
};
const orderPayload = ()=>({ idempotencyKey:randomUUID(),source:'BUY_NOW',customer:{name:'P1 Isolated Tester',email:process.env.P1_STAGING_CUSTOMER_EMAIL,phone:process.env.P1_STAGING_CUSTOMER_PHONE},shipping:{address:'P1 STAGING DATA ONLY ROAD 124',city:'Dhaka',district:'Dhaka'},paymentMethod:'COD',items:[{productId:process.env.P1_STAGING_PRODUCT_ID,variantId:process.env.P1_STAGING_VARIANT_ID,quantity:1}]});

test('P1 staging: end-to-end order > admin > shipment > payment > refund > review', {concurrency:false},async t=>{
  const admin=await staffLogin(process.env.P1_STAGING_ADMIN_EMAIL,process.env.P1_STAGING_ADMIN_PASSWORD);
  const support=await staffLogin(process.env.P1_STAGING_SUPPORT_EMAIL,process.env.P1_STAGING_SUPPORT_PASSWORD);
  const orderManager=await staffLogin(process.env.P1_STAGING_ORDER_MANAGER_EMAIL,process.env.P1_STAGING_ORDER_MANAGER_PASSWORD);
  const inventoryManager=await staffLogin(process.env.P1_STAGING_INVENTORY_MANAGER_EMAIL,process.env.P1_STAGING_INVENTORY_MANAGER_PASSWORD);
  await t.test('support RBAC: customer/order/inventory mutations denied',async()=>{
    for(const path of ['/admin/orders','/admin/payments','/admin/inventory','/admin/refunds']) {
      const response=await http('GET',path,undefined,support);assert.equal(response.status,403,`${path} should deny SUPPORT`);
    }
    assert.equal((await http('GET','/admin/reviews',undefined,support)).status,200);
    assert.equal((await http('GET','/admin/orders')).status,401);
    assert.equal((await http('GET','/admin/orders',undefined,orderManager)).status,200);
    assert.equal((await http('GET','/admin/inventory',undefined,orderManager)).status,403);
    assert.equal((await http('GET','/admin/inventory',undefined,inventoryManager)).status,200);
    assert.equal((await http('GET','/admin/orders',undefined,inventoryManager)).status,403);
    assert.equal((await http('GET','/admin/reviews',undefined,inventoryManager)).status,403);
    assert.equal((await http('PATCH','/admin/orders/UNREAL-STAGE/status',{status:'CONFIRMED'},support)).status,403);
  });
  const payload=orderPayload();
  const first=await http('POST','/orders',payload);
  assert.equal(first.status,201,JSON.stringify(first.body));
  const reference=first.body.reference, access=first.body.accessToken;
  assert.ok(reference && access);
  await t.test('idempotent checkout replay and mismatch are safe',async()=>{
    const replay=await http('POST','/orders',payload);
    assert.equal(replay.status,201,JSON.stringify(replay.body));assert.equal(replay.body.reference,reference);
    const altered={...payload,customer:{...payload.customer,name:'Changed staging tester'}};
    const mismatch=await http('POST','/orders',altered);
    assert.equal(mismatch.status,409);assert.equal(mismatch.body.error?.code,'IDEMPOTENCY_KEY_REUSED');
  });
  await t.test('order notification is in outbox, P0 access still mandatory',async()=>{
    assert.equal((await http('GET',`/orders/${reference}`)).status,401);
    assert.equal((await http('GET',`/orders/${reference}`,undefined,access)).status,200);
    const outbox=await http('GET','/admin/email/outbox',undefined,admin);
    assert.equal(outbox.status,200);assert.ok(outbox.body.data?.some(e=>e.eventType==='ORDER_RECEIVED' && e.subject?.includes(reference)),'Missing order-received email job');
  });
  await t.test('review with reference but without verified access cannot get badge',async()=>{
    const review={displayName:'Staging reviewer',email:payload.customer.email,rating:5,text:'A real staging test review for authorization.',orderReference:reference};
    assert.equal((await http('POST',`/products/${payload.items[0].productId}/reviews`,review)).status,401);
  });
  for(const status of ['CONFIRMED','PROCESSING']) {
    const updated=await http('PATCH',`/admin/orders/${reference}/status`,{status,note:'P1 staging test'},admin);
    assert.equal(updated.status,200,`${status}: ${JSON.stringify(updated.body)}`);
  }
  await t.test('manual shipped status is blocked; shipment owns transitions',async()=>{
    const invalid=await http('PATCH',`/admin/orders/${reference}/status`,{status:'SHIPPED'},admin);
    assert.equal(invalid.status,409);
  });
  let shipment=await http('POST','/admin/shipments',{orderReference:reference,courierName:'P1 staging courier',trackingCode:`STAGE-${randomUUID().slice(0,8)}`,shippingCost:0},admin);
  assert.equal(shipment.status,201,JSON.stringify(shipment.body));
  const id=shipment.body.data?.id;assert.ok(id);
  for(const status of ['READY','DISPATCHED','DELIVERED']) {
    shipment=await http('PATCH',`/admin/shipments/${id}`,{status,note:'P1 staging lifecycle'},admin);
    assert.equal(shipment.status,200,`${status}: ${JSON.stringify(shipment.body)}`);
  }
  const paymentList=await http('GET','/admin/payments',undefined,admin);
  assert.equal(paymentList.status,200);
  const payment=paymentList.body.data?.find(p=>p.orderReference===reference);
  assert.ok(payment?.id,'Initial COD payment should exist');
  const marked=await http('PATCH',`/admin/payments/${payment.id}`,{status:'PAID'},admin);
  assert.equal(marked.status,200,JSON.stringify(marked.body));
  await t.test('paid delivered customer can request refund with access only',async()=>{
    const refund={amount:1,reason:'Isolated staging refund request'};
    assert.equal((await http('POST',`/orders/${reference}/refunds`,refund)).status,401);
    assert.equal((await http('POST',`/orders/${reference}/refunds`,refund,access)).status,201);
  });
  await t.test('verified review requires email-recovery token and stays moderated',async()=>{
    const review={displayName:'Staging reviewer',email:payload.customer.email,rating:5,text:'Isolated staging test purchased this specific garment.',orderReference:reference};
    const unverified=await http('POST',`/products/${payload.items[0].productId}/reviews`,review,access);
    assert.equal(unverified.status,403,'Checkout token must not prove control of an email inbox');
    // Staging inbox/test email worker must provide a freshly issued recovery link token.
    const recovery=await http('POST','/orders/lookup',{reference,identifier:payload.customer.email});
    assert.equal(recovery.status,200);
    const inboxUrl=process.env.P1_STAGING_TEST_INBOX_URL;
    const inboxToken=process.env.P1_STAGING_TEST_INBOX_BEARER;
    assert.ok(inboxUrl && inboxToken,'Set test-inbox API URL and bearer token; inbox must contain recovery email for freshly created order.');
    let recoveryToken='';
    for(let i=0;i<8;i++) {
      const inbox=await fetch(`${inboxUrl}?reference=${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${inboxToken}`},signal:AbortSignal.timeout(10000)});
      assert.equal(inbox.status,200,'Private staging inbox query failed');
      const body=await inbox.json();
      if(body.accessLink) { recoveryToken=new URL(body.accessLink).hash.slice('#access='.length);break; }
      await new Promise(resolve=>setTimeout(resolve,2500));
    }
    assert.ok(recoveryToken,'Staging inbox did not receive the verified-access email in time.');
    const response=await http('POST',`/products/${payload.items[0].productId}/reviews`,review,recoveryToken);
    assert.equal(response.status,201,JSON.stringify(response.body));assert.equal(response.body.verifiedPurchase,true);assert.equal(response.body.status,'PENDING');
    const unauth=await http('POST',`/products/${payload.items[0].productId}/reviews`,review);
    assert.equal(unauth.status,401);
    const moderated=await http('PATCH',`/admin/reviews/${response.body.id}`,{status:'APPROVED',note:'Staging test moderation'},support);
    assert.equal(moderated.status,200,JSON.stringify(moderated.body));
  });
});
