const crypto=require('node:crypto');
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function settings(env=process.env){
 const configured=!!(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY&&env.SUPABASE_SERVICE_ROLE_KEY&&env.AUTH_RATE_LIMIT_SALT);
 const mode=env.HANDYPAY_API_KEY?.startsWith('hp_test_')?'test':env.HANDYPAY_API_KEY?.startsWith('hp_live_')?'live':null;
 const amount=Number(env.VIABILITY_REPORT_AMOUNT_MINOR),currency=String(env.VIABILITY_REPORT_CURRENCY||'').toLowerCase();
 const origins=[env.VIABILITY_APP_ORIGIN,...[env.VERCEL_URL,env.VERCEL_BRANCH_URL].filter(Boolean).map(h=>'https://'+h)].filter(Boolean).map(x=>new URL(x).origin);
 const externalSandboxCallback=mode==='test'&&env.VERCEL_ENV==='preview'&&env.VIABILITY_SANDBOX_CALLBACK_URL==='https://bfftokfwhhzeoxqtkycv.supabase.co/functions/v1/viability-payment-webhook';
 const checkout=configured&&env.VIABILITY_CHECKOUT_ENABLED==='true'&&!!mode&&(!!env.HANDYPAY_WEBHOOK_SECRET||externalSandboxCallback)&&Number.isSafeInteger(amount)&&amount>0&&/^[a-z]{3}$/.test(currency)&&origins.length>0&&(mode==='test'||(env.VERCEL_ENV==='production'&&env.VIABILITY_LIVE_PAYMENTS_ENABLED==='true'));
 return {configured,checkout,mode,amount,currency,origins,origin:origins[0],env};
}
function originCheck(req,config){if(!config.origins.includes(req.headers?.origin))throw new HttpError(403,'Request origin is not allowed.');if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Use a JSON request.');}
function body(req){let result=req.body;if(typeof result==='string'||Buffer.isBuffer(result)){if(Buffer.byteLength(result)>65536)throw new HttpError(413,'Request is too large.');try{result=JSON.parse(result)}catch{throw new HttpError(400,'Invalid JSON.')}}if(!result||typeof result!=='object'||Array.isArray(result)||Buffer.byteLength(JSON.stringify(result))>65536)throw new HttpError(400,'Invalid request.');return result;}
function cookies(req){const result={};for(const item of String(req.headers?.cookie||'').split(';')){const i=item.indexOf('=');if(i>0)result[item.slice(0,i).trim()]=item.slice(i+1);}return result;}
function sessionCookies(res,data,clear=false){const access=clear?'':data.access_token,refresh=clear?'':data.refresh_token;if(!clear&&(typeof access!=='string'||typeof refresh!=='string'||!/^[A-Za-z0-9_.~-]+$/.test(access)||!/^[A-Za-z0-9_.~-]+$/.test(refresh)))throw new HttpError(502,'Invalid sign-in response.');res.setHeader('Set-Cookie',[`__Host-bb_access=${access}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear?0:Math.min(3600,Number(data.expires_in)||3600)}`,`__Host-bb_refresh=${refresh}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear?0:2592000}`]);}
function client(config,fetcher=fetch){
 async function request(path,{method='GET',data,token,service=false,headers={}}={}){
  const key=service?config.env.SUPABASE_SERVICE_ROLE_KEY:config.env.SUPABASE_ANON_KEY;
  const r=await fetcher(config.env.SUPABASE_URL.replace(/\/$/,'')+path,{method,headers:{apikey:key,Authorization:'Bearer '+(token||key),'Content-Type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(10000)});
  const text=await r.text();let value;try{value=text?JSON.parse(text):null}catch{throw new HttpError(502,'The account service returned an invalid response.');}
  if(!r.ok)throw new HttpError(r.status===401||r.status===403?401:502,'The account service could not complete this request.');return value;
 }
 const rest=(table,options={})=>request('/rest/v1/'+table,options);
 const rpc=(name,data)=>rest('rpc/'+name,{method:'POST',data,service:true});
 async function user(req,res){
  const c=cookies(req);let token=c['__Host-bb_access'];
  if(!token&&!c['__Host-bb_refresh'])throw new HttpError(401,'Sign in to continue.');
  let account;
  try{account=await request('/auth/v1/user',{token});}catch(error){
   if(error.status!==401||!c['__Host-bb_refresh'])throw error;
   const renewed=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:c['__Host-bb_refresh']}});sessionCookies(res,renewed);token=renewed.access_token;account=await request('/auth/v1/user',{token});
  }
  if(!uuid(account?.id)||!account.email_confirmed_at)throw new HttpError(401,'Verify your email to continue.');return {id:account.id,email:account.email,token};
 }
 async function rate(req,email,kind){
  const ip=req.headers?.['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown';
  for(const [label,value,limit]of [['ip',ip,kind==='send'?20:40],['email',email,kind==='send'?5:10]]){
   const hash=crypto.createHmac('sha256',config.env.AUTH_RATE_LIMIT_SALT).update(String(value)).digest('hex');
   if(!await rpc('bb_rate_limit',{p_bucket:kind+':'+label+':'+hash,p_seconds:3600,p_limit:limit}))throw new HttpError(429,'Too many attempts. Please wait and try again.');
  }
 }
 return {request,rest,rpc,user,rate};
}
function signature(raw,secret,header){if(typeof header!=='string'||!/^sha256=[a-f0-9]{64}$/i.test(header))return false;const actual=Buffer.from(header.slice(7),'hex'),expected=crypto.createHmac('sha256',secret).update(raw).digest();return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}
module.exports={HttpError,uuid,settings,originCheck,body,cookies,sessionCookies,client,signature};
