const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const env={BB_SANDBOX_WEBHOOK_ENABLED:'true',BB_HANDYPAY_TEST_KEY:'hp_test_fixture',BB_HANDYPAY_WEBHOOK_SECRET:'fixture',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-service'};
const refundFields={amount:1900,amount_refunded:500,refunded:false,currency:'usd',status:'succeeded'};
const oid='22222222-2222-4222-8222-222222222222';
async function handler(e=env,fetcher){return (await import('../supabase/functions/viability-payment-webhook/handler.mjs')).createHandler(e,fetcher);}
function request(event,secret='fixture'){const body=JSON.stringify(event);return new Request('https://fixture/webhook',{method:'POST',body,headers:{'x-handypay-signature':'sha256='+crypto.createHmac('sha256',secret).update(body).digest('hex')}});}
const event={id:'evt_fixture',type:'checkout.session.completed',livemode:false,data:{id:'cs_fixture',payment_intent:'pi_fixture'}};
test('public unsigned callbacks fail before any external request',async()=>{let calls=0;const h=await handler(env,async()=>{calls++});assert.equal((await h(new Request('https://fixture',{method:'POST',body:'{}'}))).status,401);assert.equal(calls,0);});
test('a live key cannot activate the sandbox receiver',async()=>{const h=await handler({...env,BB_HANDYPAY_TEST_KEY:'hp_live_fixture'});assert.equal((await h(request(event))).status,503);});
test('wrong HMAC cannot reach provider or database',async()=>{let calls=0;const h=await handler(env,async()=>{calls++});assert.equal((await h(request(event,'wrong'))).status,401);assert.equal(calls,0);});
test('live events cannot reach provider or database',async()=>{let calls=0;const h=await handler(env,async()=>{calls++});assert.equal((await h(request({...event,livemode:true}))).status,400);assert.equal(calls,0);});
test('verified sandbox delivery checks provider and order before finalizing',async()=>{const calls=[];const h=await handler(env,async(url,opts)=>{calls.push({url,opts});if(url.includes('api.handypay.me')){assert.equal(opts.headers.Accept,'application/json');return Response.json({success:true,data:{id:'cs_fixture',status:'complete',payment_status:'paid',metadata:{order_id:oid},amount_total:1900,currency:'usd'}});}if(url.includes('/rpc/'))return Response.json(oid);return Response.json([{id:oid,amount:1900,currency:'usd',mode:'test'}]);});const r=await h(request(event));assert.equal(r.status,200);assert.equal((await r.json()).report_id,oid);assert.equal(calls.length,3);assert.equal(JSON.parse(calls[2].opts.body).p_mode,'test');});
test('sandbox refund cannot revoke a live order',async()=>{let writes=0;const h=await handler(env,async(url)=>{if(url.includes('/rpc/'))writes++;assert.ok(url.includes('mode=eq.test'));return Response.json([]);});assert.equal((await h(request({id:'evt_refund',type:'charge.refunded',livemode:false,data:{...refundFields,payment_intent:'pi_live'}}))).status,409);assert.equal(writes,0);});
test('oversized signed-looking deliveries fail before provider calls',async()=>{let calls=0;const h=await handler(env,async()=>{calls++});const r=new Request('https://fixture',{method:'POST',body:'x'.repeat(1048577),headers:{'x-handypay-signature':'sha256='+'0'.repeat(64)}});assert.equal((await h(r)).status,413);assert.equal(calls,0);});

for(const type of ['charge.refunded','charge.dispute.created']){
 test(type+' waits for payment reconciliation without acknowledging success',async()=>{
  let writes=0;
  const h=await handler(env,async url=>{if(url.includes('/rpc/'))writes++;return Response.json([]);});
  const r=await h(request({id:'evt_early',type,livemode:false,data:{...refundFields,payment_intent:'pi_fixture'}}));
  assert.equal(r.status,409);assert.equal(writes,0);
 });
 test(type+' preserves event identity and raw-body hash for database deduplication',async()=>{
  const payload={id:'evt_repeated',type,livemode:false,data:{...refundFields,payment_intent:'pi_fixture'}};
  const received=[];
  const h=await handler(env,async(url,options)=>{
   if(url.includes('/rpc/')){received.push(JSON.parse(options.body));return Response.json(true);}
   return Response.json([{id:oid}]);
  });
  assert.equal((await h(request(payload))).status,200);
  assert.equal((await h(request(payload))).status,200);
  assert.deepEqual(received[0],received[1]);
  assert.equal(received[0].p_event,payload.id);
  assert.equal(received[0].p_hash,crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'));
 });
}
test('database failure during revocation returns a retryable failure without leaking details',async()=>{
 const h=await handler(env,async url=>url.includes('/rpc/')?new Response('private database details',{status:500}):Response.json([{id:oid}]));
 const r=await h(request({id:'evt_retry',type:'charge.refunded',livemode:false,data:{...refundFields,payment_intent:'pi_fixture'}}));
 assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/private database/);
});
test('refund without canonical payment reference cannot reach database',async()=>{
 let calls=0;const h=await handler(env,async()=>{calls++;});
 assert.equal((await h(request({id:'evt_bad_refund',type:'charge.refunded',data:{payment_intent:'unverified'}}))).status,422);
 assert.equal(calls,0);
});
for(const total of [500,1000,1900])test('refund total '+total+' is passed once as a cumulative amount',async()=>{
 let rpc;const h=await handler(env,async(url,options)=>{
  if(url.includes('/rpc/')){assert.ok(url.endsWith('/bb_record_refund'));rpc=JSON.parse(options.body);return Response.json(true);}
  return Response.json([{id:oid}]);
 });
 const r=await h(request({id:'evt_total',type:'charge.refunded',livemode:false,data:{...refundFields,payment_intent:'pi_fixture',amount_refunded:total,refunded:total===1900}}));
 assert.equal(r.status,200);assert.equal(rpc.p_refunded,total);assert.equal(rpc.p_amount,1900);assert.equal(rpc.p_currency,'usd');assert.equal(rpc.p_mode,'test');
});
for(const invalid of [{amount_refunded:undefined},{amount_refunded:0},{amount_refunded:-1},{amount_refunded:2000},{amount_refunded:1.5},{amount_refunded:'500'},{currency:'bad currency'},{refunded:true},{status:'pending'},{amount:undefined}])test('invalid refund is rejected before database: '+JSON.stringify(invalid),async()=>{
 let calls=0;const h=await handler(env,async()=>{calls++;});
 assert.equal((await h(request({id:'evt_invalid',type:'charge.refunded',livemode:false,data:{...refundFields,payment_intent:'pi_fixture',...invalid}}))).status,422);assert.equal(calls,0);
});
