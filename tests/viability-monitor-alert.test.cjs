const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/viability-monitor-alert');
const secret='a'.repeat(64);
async function invoke({auth='Bearer '+secret,method='POST',environment='preview',responses=[]}={}){
 const original={...process.env},oldFetch=global.fetch,calls=[];
 Object.assign(process.env,{BB_MONITOR_SECRET:secret,VERCEL_ENV:environment,BREVO_API_KEY:'fake-key',BREVO_SENDER_EMAIL:'sender@example.com',SUPABASE_URL:'https://database.example.com',SUPABASE_SERVICE_ROLE_KEY:'fake-service'});
 global.fetch=async(url,options)=>{calls.push({url,options});const next=responses.shift();if(!next)throw Error('unexpected network call');return {ok:next.ok!==false,json:async()=>next.data};};
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 try{await handler({method,headers:{authorization:auth}},res);return {code:res.code,body:res.body,calls};}
 finally{global.fetch=oldFetch;for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);}
}
test('rejects missing, incorrect, unicode and non-string credentials without network',async()=>{
 for(const auth of ['', 'Bearer '+ 'b'.repeat(64),'Bearer '+'é'.repeat(64),['Bearer '+secret]]){const r=await invoke({auth});assert.equal(r.code,401);assert.equal(r.calls.length,0);}
});
test('rejects GET and production use',async()=>{assert.equal((await invoke({method:'GET'})).code,405);const r=await invoke({environment:'production'});assert.equal(r.code,503);assert.equal(r.calls.length,0);});
test('clean checks do not send email',async()=>{const r=await invoke({responses:[{data:1},{data:[{findings:[]}]}]});assert.deepEqual(r.body,{checked:true,alert_sent:false});assert.equal(r.calls.length,2);});
test('concurrent skipped check sends nothing',async()=>{assert.deepEqual((await invoke({responses:[{data:null}]})).body,{skipped:true});});
test('findings send only aggregate information to fixed recipient',async()=>{
 const r=await invoke({responses:[{data:2},{data:[{findings:[{mode:'test',issue:'paid_without_active_report',order_count:1,private:'excluded'}]}]},{data:{}}]});
 assert.equal(r.body.alert_sent,true);const email=JSON.parse(r.calls[2].options.body);assert.deepEqual(email.to,[{email:'letstalkhow@gmail.com'}]);assert.ok(!email.textContent.includes('excluded'));assert.equal(r.calls[2].url,'https://api.brevo.com/v3/smtp/email');
});
test('database and email errors do not claim successful delivery',async()=>{
 for(const responses of [[{ok:false}],[{data:1},{data:[]}],[{data:1},{data:[{findings:[{mode:'test',issue:'review',order_count:1}]}]},{ok:false}]]){const r=await invoke({responses});assert.equal(r.code,502);assert.deepEqual(r.body,{error:'Monitoring or alert delivery failed'});}
});
