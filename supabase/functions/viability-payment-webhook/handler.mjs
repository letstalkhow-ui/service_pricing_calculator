import { Buffer } from 'node:buffer';
import { processWebhook } from '../_shared/viability-webhook.mjs';

const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Temporary sandbox evidence: only allowlisted amounts/flags, never customer data or credentials.
export function refundEvidence(data,depth=0){
 const out={};
 for(const key of ['amount','amount_refunded','amount_remaining','refund_amount','amount_total'])if(Number.isSafeInteger(data?.[key])&&data[key]>=0)out[key]=data[key];
 if(typeof data?.refunded==='boolean')out.refunded=data.refunded;
 if(typeof data?.currency==='string'&&/^[a-z]{3}$/i.test(data.currency))out.currency=data.currency;
 if(['pending','succeeded','failed','canceled','complete','refunded','partially_refunded'].includes(data?.status))out.status=data.status;
 if(depth<2&&data?.object&&typeof data.object==='object')out.object=refundEvidence(data.object,depth+1);
 if(depth<2&&Array.isArray(data?.refunds?.data))out.refunds=data.refunds.data.slice(0,10).map(value=>refundEvidence(value,depth+1));
 return out;
}
export function createHandler(env,fetcher=fetch,diagnostic=value=>console.info(JSON.stringify(value))){
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
     if(name==='bb_revoke_purchase'){
      const rows=await db.rest('bb_checkout_orders?'+new URLSearchParams({payment_intent:'eq.'+data.p_intent,mode:'eq.test',select:'id'}));
      if(rows?.length!==1)throw Object.assign(new Error('Sandbox payment reference needs reconciliation.'),{status:409});
      // This path is reached only after HMAC verification and matching a sandbox order.
      if(data.p_type==='charge.refunded'&&rows[0].id==='353dffc1-506f-49da-ab4b-f794096ca055'){
       const event=JSON.parse(raw.toString('utf8'));
       diagnostic({tag:'bb_sandbox_refund_evidence',event_id:data.p_event,fields:refundEvidence(event.data)});
      }
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
