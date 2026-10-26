const {test}=require('node:test'),assert=require('node:assert/strict');
const {reconcileOrders}=require('../lib/viability-reconciliation');
const order={id:'22222222-2222-4222-8222-222222222222',mode:'test',provider_session:'cs_test_fixture',amount:1900,currency:'usd',status:'pending'};
const session={id:order.provider_session,metadata:{order_id:order.id},amount_total:1900,currency:'usd',payment_status:'paid',status:'complete'};
test('detects settled payment missed by local callback without mutating order',async()=>{const before=JSON.stringify(order);assert.deepEqual(await reconcileOrders([order],{mode:'test',getSession:async()=>session}),[{order_id:order.id,issue:'paid_at_provider_pending_locally'}]);assert.equal(JSON.stringify(order),before);});
test('mismatched provider order is not treated as settled',async()=>{const result=await reconcileOrders([order],{mode:'test',getSession:async()=>({...session,amount_total:100})});assert.equal(result[0].issue,'provider_order_mismatch');});
test('provider failure is flagged without leaking provider errors',async()=>{const result=await reconcileOrders([order],{mode:'test',getSession:async()=>{throw new Error('secret')}});assert.equal(result[0].issue,'provider_unavailable');assert.ok(!JSON.stringify(result).includes('secret'));});
test('does not contact provider for a different payment mode',async()=>{let called=false;assert.deepEqual(await reconcileOrders([order],{mode:'live',getSession:async()=>{called=true}}),[]);assert.equal(called,false);});
test('matching paid order has no settlement finding',async()=>{assert.deepEqual(await reconcileOrders([{...order,status:'paid'}],{mode:'test',getSession:async()=>session}),[]);});
