const crypto=require('node:crypto');
const platform=require('./viability-platform');
const Report=require('../viability-report');
const Financial=require('../viability-engine');
const PUBLIC_COUNTRIES={MUS:true,ZAF:true,GBR:true,USA:true,FRA:true};
const qs=values=>new URLSearchParams(values).toString();
function draftInput(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new platform.HttpError(400,'Enter the business inputs.');
 if((value.capacitySteps?.length||0)>20||(value.additionalStreams?.length||0)>20)throw new platform.HttpError(400,'Too many cost steps or extra income streams.');
 const input=JSON.parse(JSON.stringify(value));if(input.market)delete input.market.snapshot;try{Financial.normalize(input);require('../viability-cash-engine').run(input);require('../viability-market-engine').market(input);}catch(error){throw new platform.HttpError(400,error.message);}return input;
}
function profile(value){const p={};for(const key of ['businessName','offer','area','country','stage','currency']){p[key]=String(value?.[key]||'').slice(0,key==='businessName'?160:300);}return p;}
async function countrySnapshot(country,fetcher){if(!PUBLIC_COUNTRIES[country])return null;try{const y=new Date().getUTCFullYear(),url='https://api.worldbank.org/v2/country/'+country+'/indicator/SP.POP.TOTL;NY.GNP.PCAP.PP.CD;NY.GDP.PCAP.PP.CD;PA.NUS.PPP?source=2&format=json&date='+(y-10)+':'+y+'&per_page=1000';const response=await fetcher(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)return null;return require('../api/viability-market-data').parseSnapshot(await response.json(),country);}catch{return null;}}
function purchasedSnapshot(snapshot,order){const result=JSON.parse(JSON.stringify(snapshot));result.status='purchased';result.report_version='report-v1.0.0';result.reference='report-'+order;result.purchase={order_id:order,generated_on_server:true};return result;}
function createService({env=process.env,fetcher=fetch,db:provided}={}){
 const config=platform.settings(env),db=provided||platform.client(config,fetcher);
 const ownedDraft=async(user,id)=>{if(!platform.uuid(id))throw new platform.HttpError(400,'Invalid simulation reference.');const rows=await db.rest('bb_simulations?'+qs({id:'eq.'+id,owner_id:'eq.'+user.id,select:'*'}),{token:user.token});if(rows?.length!==1)throw new platform.HttpError(404,'Simulation not found.');return rows[0];};
 async function handypay(path,options={}){const r=await fetcher('https://api.handypay.me/api/v1'+path,{method:options.method||'GET',headers:{Authorization:'Bearer '+env.HANDYPAY_API_KEY,Accept:'application/json',...(options.data?{'Content-Type':'application/json'}:{})},body:options.data?JSON.stringify(options.data):undefined,signal:AbortSignal.timeout(8000)});const v=await r.json();if(!r.ok||v.success!==true||!v.data)throw new platform.HttpError(502,'Payment provider could not complete this request.');return v.data;}
 async function handle(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const action=String(req.query?.action||'status');
  if(req.method==='GET'&&action==='status')return {accounts_available:config.configured,checkout_available:config.checkout,payment_mode:config.checkout?config.mode:null,price:config.checkout?{amount_minor:config.amount,currency:config.currency}:null};
  if(!config.configured)throw new platform.HttpError(503,'Account saving is not enabled in this preview yet.');
  if(req.method==='POST')platform.originCheck(req,config);else if(req.method!=='GET')throw new platform.HttpError(405,'Method not allowed.');
  if(req.method==='POST'&&action==='sign-out'){const c=platform.cookies(req);if(c['__Host-bb_access'])try{await db.request('/auth/v1/logout',{method:'POST',token:c['__Host-bb_access']});}catch{}platform.sessionCookies(res,{},true);return {signed_out:true};}
  if(req.method==='POST'&&['send-code','verify-code'].includes(action)){
   const data=platform.body(req),email=String(data.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new platform.HttpError(400,'Enter a valid email address.');
   await db.rate(req,email,action==='send-code'?'send':'verify');
   if(action==='send-code'){await db.request('/auth/v1/otp',{method:'POST',data:{email,create_user:true}});return {sent:true};}
   if(!/^\d{6,10}$/.test(String(data.code||'')))throw new platform.HttpError(400,'Enter the code from your email.');
   const session=await db.request('/auth/v1/verify',{method:'POST',data:{email,token:String(data.code),type:'email'}});
   if(!session.user?.email_confirmed_at)throw new platform.HttpError(401,'Email verification failed.');platform.sessionCookies(res,session);return {signed_in:true};
  }
  const user=await db.user(req,res);
  if(req.method==='GET'&&action==='sandbox-api-check'){
   if(env.VERCEL_ENV!=='preview'||!env.HANDYPAY_API_KEY?.startsWith('hp_test_'))throw new platform.HttpError(404,'Not found.');
   await db.rate(req,user.email,'provider-check');
   const response=await fetcher('https://api.handypay.me/api/v1/webhook-endpoints',{headers:{Authorization:'Bearer '+env.HANDYPAY_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
   const text=await response.text();let result;try{result=JSON.parse(text);}catch{}
   return {mode:'test',http_status:response.status,success:response.ok&&result?.success===true,response_format:result?'json':'non-json',provider_code:/^[a-z_]{1,64}$/.test(result?.error?.code||'')?result.error.code:null,edge_error_1010:!result&&text.trim()==='error code: 1010'};
  }
  if(req.method==='GET'&&action==='me')return {email:user.email};
  if(req.method==='GET'&&action==='list'){
   const drafts=await db.rest('bb_simulations?'+qs({owner_id:'eq.'+user.id,select:'id,title,created_at,updated_at',order:'updated_at.desc',limit:'100'}),{token:user.token});
   const reports=await db.rest('bb_reports?'+qs({owner_id:'eq.'+user.id,select:'id,title,created_at',order:'created_at.desc',limit:'100'}),{token:user.token});return {drafts,reports};
  }
  if(req.method==='GET'&&action==='draft')return await ownedDraft(user,String(req.query.id||''));
  if(req.method==='POST'&&action==='save'){
   const data=platform.body(req),input=draftInput(data.input),p=profile(data.profile),title=p.businessName||p.offer||'Untitled business';
   const form={};for(const [key,value]of Object.entries(data.form||{})){if(Object.keys(form).length>=100||typeof value!=='string'||value.length>1000)throw new platform.HttpError(400,'Invalid form data.');form[key]=value;}
   const row={owner_id:user.id,title:title.slice(0,160),input_json:input,profile_json:p,form_json:form,updated_at:new Date().toISOString()};
   if(data.id){await ownedDraft(user,data.id);const result=await db.rest('bb_simulations?'+qs({id:'eq.'+data.id,owner_id:'eq.'+user.id}),{method:'PATCH',token:user.token,data:row,headers:{Prefer:'return=representation'}});return {id:result[0].id};}
   const result=await db.rest('bb_simulations',{method:'POST',token:user.token,data:row,headers:{Prefer:'return=representation'}});return {id:result[0].id};
  }
  if(req.method==='GET'&&action==='report'){
   const id=String(req.query.id||'');if(!platform.uuid(id))throw new platform.HttpError(404,'Report not found.');
   const reports=await db.rest('bb_reports?'+qs({id:'eq.'+id,owner_id:'eq.'+user.id,select:'snapshot'}),{token:user.token});if(reports?.length!==1)throw new platform.HttpError(404,'Report not found or access is not active.');return {snapshot:reports[0].snapshot};
  }
  if(req.method==='GET'&&action==='order'){
   const id=String(req.query.id||'');if(!platform.uuid(id))throw new platform.HttpError(404,'Order not found.');
   const rows=await db.rest('bb_checkout_orders?'+qs({id:'eq.'+id,owner_id:'eq.'+user.id,select:'id,status'}),{service:true});if(rows?.length!==1)throw new platform.HttpError(404,'Order not found.');return rows[0];
  }
  if(req.method==='POST'&&action==='checkout'){
   if(!config.checkout)throw new platform.HttpError(503,'Checkout is not enabled yet.');
   const data=platform.body(req);if(!platform.uuid(data.requestId))throw new platform.HttpError(400,'Invalid checkout reference.');
   const draft=await ownedDraft(user,data.simulationId),orderId=data.requestId;
   const previous=await db.rest('bb_checkout_orders?'+qs({id:'eq.'+orderId,select:'id,owner_id,simulation_id,status,checkout_url'}),{service:true});
   if(previous?.length){const p=previous[0];if(p.owner_id!==user.id||p.simulation_id!==draft.id)throw new platform.HttpError(409,'Checkout reference is already in use.');if(p.checkout_url&&p.status==='pending')return {checkout_url:p.checkout_url};throw new platform.HttpError(409,'Checkout is being prepared or has already completed. Check your account before retrying.');}
   const input=draftInput(draft.input_json);if(input.market){input.market.snapshot=await countrySnapshot(input.market.country,fetcher);if(input.market.population)input.market.populationSource='User-provided: '+(input.market.populationSource||'estimate');}
   const snapshot=Report.create(input,draft.profile_json);if(snapshot.assessment.market_results.status!=='ready')throw new platform.HttpError(422,'Complete the market assessment before purchasing a full report.');
   const order={id:orderId,owner_id:user.id,simulation_id:draft.id,snapshot:purchasedSnapshot(snapshot,orderId),amount:config.amount,currency:config.currency,mode:config.mode};
   const inserted=await db.rest('bb_checkout_orders',{method:'POST',service:true,data:order,headers:{Prefer:'resolution=ignore-duplicates,return=representation'}});if(!inserted?.length)throw new platform.HttpError(409,'This checkout request is already being prepared.');
   const session=await handypay('/payment-sessions',{method:'POST',data:{line_items:[{amount:config.amount,currency:config.currency,name:'BusinessBoosts Business Viability Report',quantity:1}],customer_email:user.email,metadata:{order_id:orderId},success_url:config.origin+'/account?order='+orderId+'&session_id={CHECKOUT_SESSION_ID}',cancel_url:config.origin+'/account?checkout=cancelled',pass_fees_to_customer:false}});
   const url=new URL(session.url);if(url.protocol!=='https:'||!(url.hostname==='checkout.stripe.com'||url.hostname==='handypay.me'||url.hostname.endsWith('.handypay.me'))||!/^cs_[A-Za-z0-9_]+$/.test(session.id))throw new platform.HttpError(502,'The payment provider returned an invalid checkout.');
   await db.rest('bb_checkout_orders?'+qs({id:'eq.'+orderId,owner_id:'eq.'+user.id}),{method:'PATCH',service:true,data:{provider_session:session.id,checkout_url:url.toString()}});return {checkout_url:url.toString()};
  }
  throw new platform.HttpError(400,'Unknown account action.');
 }
 async function webhook(raw,header){
  if(!config.checkout)throw new platform.HttpError(503,'Payment processing is not configured.');
  if(!platform.signature(raw,env.HANDYPAY_WEBHOOK_SECRET,header))throw new platform.HttpError(401,'Invalid payment signature.');
  let event;try{event=JSON.parse(raw.toString('utf8'));}catch{throw new platform.HttpError(400,'Invalid event.');}
  if(typeof event.id!=='string'||!/^evt_[A-Za-z0-9_]+$/.test(event.id))throw new platform.HttpError(400,'Invalid event reference.');
  if(typeof event.livemode==='boolean'&&event.livemode!==(config.mode==='live'))throw new platform.HttpError(400,'Payment mode mismatch.');
  const hash=crypto.createHash('sha256').update(raw).digest('hex'),data=event.data;
  if(['charge.refunded','charge.dispute.created'].includes(event.type)){
   const intent=data?.payment_intent;if(typeof intent!=='string'||!/^pi_[A-Za-z0-9_]+$/.test(intent))throw new platform.HttpError(422,'Payment reference needs reconciliation.');
   const revoked=await db.rpc('bb_revoke_purchase',{p_event:event.id,p_hash:hash,p_intent:intent,p_type:event.type});if(!revoked)throw new platform.HttpError(409,'Payment has not yet been reconciled.');return {received:true};
  }
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return {received:true,ignored:true};
  if(!/^cs_[A-Za-z0-9_]+$/.test(data?.id||''))throw new platform.HttpError(400,'Invalid checkout session.');
  const session=await handypay('/payment-sessions/'+encodeURIComponent(data.id));
  if(session.id!==data.id||session.payment_status!=='paid'||session.status!=='complete')throw new platform.HttpError(409,'Payment is not settled.');
  const orderId=session.metadata?.order_id;if(!platform.uuid(orderId))throw new platform.HttpError(422,'Payment does not match a report order.');
  const rows=await db.rest('bb_checkout_orders?'+qs({id:'eq.'+orderId,provider_session:'eq.'+session.id,select:'id,amount,currency,mode'}),{service:true});const order=rows?.[0];
  if(!order||session.amount_total!==order.amount||String(session.currency).toLowerCase()!==order.currency||order.mode!==config.mode)throw new platform.HttpError(409,'Payment amount, currency or order mismatch.');
  // Require a canonical intent reference for refund/dispute reconciliation. Verify merchant payload before activation.
  const intent=data.payment_intent||session.payment_intent;if(typeof intent!=='string'||!/^pi_[A-Za-z0-9_]+$/.test(intent))throw new platform.HttpError(422,'Payment intent reference needs reconciliation.');
  const reportId=await db.rpc('bb_finalize_purchase',{p_order:orderId,p_event:event.id,p_hash:hash,p_session:session.id,p_amount:order.amount,p_currency:order.currency,p_mode:order.mode,p_intent:intent});return {received:true,report_id:reportId};
 }
 return {handle,webhook,config};
}
module.exports={createService,draftInput,profile,purchasedSnapshot};
