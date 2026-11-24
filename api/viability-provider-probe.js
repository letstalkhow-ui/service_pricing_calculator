const crypto=require('node:crypto');
// Operator-only sandbox probe. Fixed GET endpoints; never returns provider records.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const secret=process.env.BB_MONITOR_SECRET,auth=req.headers.authorization;
 const expected=Buffer.from('Bearer '+(secret||'')),supplied=Buffer.from(typeof auth==='string'?auth:'');
 if(!secret||secret.length<32||expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))return res.status(401).json({error:'Unauthorized'});
 if(process.env.VERCEL_ENV!=='preview'||!process.env.HANDYPAY_API_KEY?.startsWith('hp_test_'))return res.status(503).json({error:'Sandbox only'});
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
