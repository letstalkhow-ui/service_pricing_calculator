// Operator-only: credentials come from the environment, never command arguments.
const {reconcileOrders}=require('../lib/viability-reconciliation');
async function main(){
 const env=process.env,mode=env.BB_RECONCILIATION_MODE;
 if(!['test','live'].includes(mode)||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||!env.HANDYPAY_API_KEY?.startsWith(mode==='test'?'hp_test_':'hp_live_'))throw new Error('Missing or mismatched operator configuration');
 const base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:')throw new Error('HTTPS required');
 async function json(url,headers){const r=await fetch(url,{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Read failed');return r.json();}
 const limit=100,findings=[];let offset=0;
 while(true){
  const q=new URLSearchParams({select:'id,mode,provider_session,amount,currency,status',mode:'eq.'+mode,order:'created_at.asc,id.asc',limit:String(limit),offset:String(offset)});
  const orders=await json(base.origin+'/rest/v1/bb_checkout_orders?'+q,{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY});
  if(!Array.isArray(orders))throw new Error('Invalid database response');
  findings.push(...await reconcileOrders(orders,{mode,getSession:async id=>{const result=await json('https://api.handypay.me/api/v1/payment-sessions/'+encodeURIComponent(id),{Authorization:'Bearer '+env.HANDYPAY_API_KEY,Accept:'application/json'});if(result.success!==true||!result.data)throw new Error('Invalid provider response');return result.data;}}));
  if(orders.length<limit)break;offset+=limit;
 }
 console.log(JSON.stringify({mode,findings,scope:'checkout settlement only; refunds and disputes need separate comparison'}));
 if(findings.length)process.exitCode=2;
}
main().catch(()=>{console.error('Payment reconciliation could not complete. Check operator configuration and provider availability.');process.exitCode=1;});
