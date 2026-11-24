const crypto=require('node:crypto');
// Operator-only sandbox probe. Fixed GET endpoints; never returns provider records.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const secret=process.env.BB_MONITOR_SECRET,auth=req.headers.authorization;
 const expected=Buffer.from('Bearer '+(secret||'')),supplied=Buffer.from(typeof auth==='string'?auth:'');
 if(!secret||secret.length<32||expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))return res.status(401).json({error:'Unauthorized'});
 if(process.env.VERCEL_ENV!=='preview'||!process.env.HANDYPAY_API_KEY?.startsWith('hp_test_'))return res.status(503).json({error:'Sandbox only'});
 if(req.body?.dispute_review===true){
  try{
   if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Configuration');
   async function read(url,headers){const r=await fetch(url,{headers,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Read');return r.json();}
   const provider=await read('https://api.handypay.me/api/v1/disputes?limit=100',{Authorization:'Bearer '+process.env.HANDYPAY_API_KEY,Accept:'application/json'});
   if(provider?.success!==true)throw Error('Provider');
   const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY};
   const db=(table,query)=>read(process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+table+'?'+new URLSearchParams(query),headers);
   const result=await require('./viability-disputes').reconcileDisputes(provider.data,{
    getOrders:pi=>db('bb_checkout_orders',{payment_intent:'eq.'+pi,mode:'eq.test',select:'id,mode,payment_intent,amount,currency',limit:'2'}),
    hasActiveAccess:async id=>{const reports=await db('bb_reports',{order_id:'eq.'+id,select:'id'});if(!Array.isArray(reports))throw Error('Reports');for(const report of reports){const rows=await db('bb_entitlements',{report_id:'eq.'+report.id,active:'eq.true',select:'active',limit:'1'});if(!Array.isArray(rows))throw Error('Access');if(rows.length)return true;}return false;}
   });return res.status(200).json({mode:'test',...result});
  }catch{return res.status(502).json({error:'Dispute review incomplete'});}
 }
 const results=[];
 for(const path of ['/disputes?limit=1','/test-payments?limit=1']){
  try{
   const response=await fetch('https://api.handypay.me/api/v1'+path,{headers:{Authorization:'Bearer '+process.env.HANDYPAY_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
   const json=await response.json().catch(()=>null),data=json?.data;
   const valid=response.ok&&json?.success===true&&Array.isArray(data?.data)&&typeof data.has_more==='boolean';
   results.push({endpoint:path,http_status:response.status,valid_list:valid,count:valid?data.data.length:null,has_more:valid?data.has_more:null});
  }catch{results.push({endpoint:path,error:'Read unavailable'});}
 }
 return res.status(200).json({mode:'test',results,scope:'API availability only; no reconciliation performed'});
};

