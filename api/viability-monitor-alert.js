const crypto=require('node:crypto');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const env=process.env,secret=env.BB_MONITOR_SECRET,auth=req.headers.authorization||'';
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!secret||secret.length<32||auth.length!==('Bearer '+secret).length||!crypto.timingSafeEqual(Buffer.from(auth),Buffer.from('Bearer '+secret)))return res.status(401).json({error:'Unauthorized'});
 if(env.VERCEL_ENV!=='preview'||!env.BREVO_API_KEY||!env.BREVO_SENDER_EMAIL||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:'Monitor not configured'});
 try{
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
  const base=env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/';
  const run=await fetch(base+'rpc/bb_run_payment_monitor',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(10000)});
  if(!run.ok)throw new Error('check');const id=await run.json();if(!id)return res.status(200).json({skipped:true});
  const response=await fetch(base+'bb_payment_monitor_runs?'+new URLSearchParams({id:'eq.'+id,select:'findings'}),{headers,signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('read');const rows=await response.json();const findings=rows?.[0]?.findings;if(!Array.isArray(findings))throw new Error('shape');
  if(!findings.length)return res.status(200).json({checked:true,alert_sent:false});
  const summary=findings.map(f=>({mode:f.mode,issue:f.issue,count:f.order_count}));
  const sent=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({sender:{name:'BusinessBoosts',email:env.BREVO_SENDER_EMAIL},to:[{email:'letstalkhow@gmail.com'}],subject:'BusinessBoosts: payment integrity review needed',textContent:'Database payment/access checks found issues. Review the private payment monitor before changing access. This is not a merchant settlement or refund reconciliation.\n\n'+JSON.stringify(summary),tags:['payment-monitor']}),signal:AbortSignal.timeout(10000)});
  if(!sent.ok)throw new Error('email');return res.status(200).json({checked:true,alert_sent:true});
 }catch{return res.status(502).json({error:'Monitoring or alert delivery failed'});}
};
