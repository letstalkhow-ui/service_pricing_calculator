import { Buffer } from 'node:buffer';
import { processWebhook } from '../_shared/viability-webhook.mjs';

const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createHandler(env,fetcher=fetch){
 return async request=>{
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  // Reject unsigned traffic before reading a body or accessing any credential/database.
  const signature=request.headers.get('x-handypay-signature');
  if(!/^sha256=[a-f0-9]{64}$/i.test(signature||''))return json({error:'Invalid payment signature.'},401);
  const key=env.BB_HANDYPAY_TEST_KEY,secret=env.BB_HANDYPAY_WEBHOOK_SECRET;
  if(env.BB_SANDBOX_WEBHOOK_ENABLED!=='true'||!key?.startsWith('hp_test_')||!secret||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return json({error:'Sandbox payment processing is not configured.'},503);
  try{
   const reader=request.body?.getReader();if(!reader)return json({error:'Invalid event.'},400);
   const chunks=[];let length=0;
   try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>1048576){await reader.cancel();return json({error:'Payload too large.'},413);}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
   const raw=Buffer.concat(chunks);
   async function api(url,options){
    const response=await fetcher(url,{...options,signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Object.assign(new Error('Payment verification is temporarily unavailable.'),{status:502});
    try{return await response.json();}catch{throw Object.assign(new Error('Invalid payment service response.'),{status:502});}
   }
   const db={
    rest:async path=>api(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+path,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,Accept:'application/json'}}),
    rpc:async(name,data)=>{
     // The sandbox receiver must never mutate a live order, including refunds/disputes.
     if(name==='bb_revoke_purchase'||name==='bb_record_refund'){
      const rows=await db.rest('bb_checkout_orders?'+new URLSearchParams({payment_intent:'eq.'+data.p_intent,mode:'eq.test',select:'id'}));
      if(rows?.length!==1)throw Object.assign(new Error('Sandbox payment reference needs reconciliation.'),{status:409});

     }
     return api(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data)});
    }
   };
   const handypay=async path=>{
    const value=await api('https://api.handypay.me/api/v1'+path,{headers:{Authorization:'Bearer '+key,Accept:'application/json'}});
    if(value?.success!==true||!value.data)throw Object.assign(new Error('Payment verification is temporarily unavailable.'),{status:502});return value.data;
   };
   const result=await processWebhook(raw,signature,{config:{checkout:true,mode:'test'},env:{HANDYPAY_WEBHOOK_SECRET:secret},db,handypay});
   return json(result);
  }catch(error){return json({error:error.status?error.message:'Payment processing is temporarily unavailable.'},error.status||500);}
 };
}
