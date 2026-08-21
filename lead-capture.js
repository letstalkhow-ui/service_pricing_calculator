(function(){
  const style=document.createElement('style');
  style.textContent=`
  .lead-capture-card{border:2px solid #111;background:#fffdf7}
  .lead-capture-card h3{margin-bottom:7px}
  .lead-capture-card>p{margin:0 0 16px;color:#666;font-size:13px;line-height:1.5}
  .lead-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .lead-grid .full{grid-column:1/-1}
  .lead-submit{width:100%;margin-top:14px;border:1px solid #111;background:#111;color:#fff;border-radius:10px;padding:12px 14px;font-weight:800;cursor:pointer}
  .lead-submit:disabled{opacity:.55;cursor:not-allowed}
  .lead-consent{display:flex;grid-template-columns:18px 1fr;gap:8px;align-items:start;margin-top:13px;font-size:11px;font-weight:400;color:#666;line-height:1.45}
  .lead-consent input{width:16px;height:16px;margin:1px 0 0;padding:0;background:#fff}
  .lead-status{display:none;margin-top:12px;border-radius:10px;padding:11px 12px;font-size:12px;line-height:1.45}
  .lead-status.success{display:block;background:#edf8f2;color:#16784a}
  .lead-status.error{display:block;background:#fff1ef;color:#b42318}
  .lead-hp{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important}
  @media(max-width:560px){.lead-grid{grid-template-columns:1fr}.lead-grid .full{grid-column:1}.lead-capture-card{margin-bottom:12px}}
  `;
  document.head.appendChild(style);

  const privacy=document.querySelector('.privacy-note');
  if(privacy) privacy.textContent='Your calculation stays in your browser unless you choose to email your result. If you request an email, the details needed to send it are securely processed.';

  const results=document.querySelector('.results');
  if(!results) return;

  const card=document.createElement('div');
  card.className='result-card lead-capture-card';
  card.innerHTML=`
    <h3>Email me my pricing result</h3>
    <p>Get a copy of your recommended price, cost-covering price, current-price comparison and key pricing figures by email.</p>
    <form id="pricingLeadForm" novalidate>
      <div class="lead-grid">
        <label>First name<input id="leadFirstName" autocomplete="given-name" required></label>
        <label>Email<input id="leadEmail" type="email" autocomplete="email" required></label>
        <label>Business name <span style="font-weight:400;color:#888">(optional)</span><input id="leadCompany" autocomplete="organization"></label>
        <label>Business type <span style="font-weight:400;color:#888">(optional)</span><select id="leadBusinessType"><option value="">Choose one</option><option>Solo / Freelancer</option><option>Service Business</option><option>Agency / Consultancy</option><option>Retail / Product Business</option><option>Other</option></select></label>
        <label class="lead-hp" aria-hidden="true">Website<input id="leadWebsite" tabindex="-1" autocomplete="off"></label>
      </div>
      <label class="lead-consent"><input id="leadConsent" type="checkbox" required><span>By requesting your result, you agree to receive your calculator summary and occasional BusinessBoosts tools, insights and offers by email. You can unsubscribe at any time.</span></label>
      <button class="lead-submit" id="leadSubmit" type="submit">Send my pricing result</button>
      <div id="leadStatus" class="lead-status" role="status" aria-live="polite"></div>
    </form>`;
  results.appendChild(card);

  function value(id){return Math.max(0,Number(document.getElementById(id)?.value)||0)}
  function calculatePayload(){
    try{
      const directTotal=direct.reduce((s,x)=>s+Math.max(0,x[1]||0)*Math.max(0,x[2]||0),0);
      const hours=acts.reduce((s,x)=>s+Math.max(0,x[1]||0),0);
      const compRate=value('comp');
      const comp=hours*compRate;
      const monthlyOverhead=overhead.reduce((s,x)=>s+Math.max(0,x[1]||0),0);
      const working=value('working');
      const util=Math.min(100,value('util'));
      const billableHours=working*util/100;
      const margin=Math.min(95,value('margin'))/100;
      const isHourly=document.getElementById('ptype').value==='hourly';
      const currentPrice=value('current');
      if(working<=0||util<=0||hours<=0||billableHours<=0) return null;

      const overheadPerHour=monthlyOverhead/billableHours;
      const allocatedOverhead=hours*overheadPerHour;
      const floor=directTotal+comp;
      const breakEven=floor+allocatedOverhead;
      const recommended=breakEven/(1-margin);
      const hourlyRecommended=recommended/hours;
      const directPerHour=directTotal/hours;
      const breakEvenHourly=directPerHour+compRate+overheadPerHour;
      const suggestedPrice=isHourly?hourlyRecommended:recommended;
      const breakEvenPrice=isHourly?breakEvenHourly:breakEven;
      let pricingStatus='';
      if(currentPrice>0){
        if(currentPrice<breakEvenPrice) pricingStatus='Below Cost';
        else if(currentPrice<suggestedPrice) pricingStatus='Below Recommended';
        else pricingStatus='At or Above Recommended';
      }
      return {
        serviceName:document.getElementById('service').value.trim()||'Your service',
        pricingMode:isHourly?'hourly':'fixed',
        currency:document.getElementById('currency').value,
        currentPrice:currentPrice||null,
        suggestedPrice,
        breakEvenPrice,
        priceGap:currentPrice>0?suggestedPrice-currentPrice:null,
        pricingStatus
      };
    }catch(e){return null}
  }

  const form=document.getElementById('pricingLeadForm');
  const submit=document.getElementById('leadSubmit');
  const status=document.getElementById('leadStatus');
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    status.className='lead-status';
    status.textContent='';
    if(!form.reportValidity()) return;
    const result=calculatePayload();
    if(!result){
      status.className='lead-status error';
      status.textContent='Please complete the calculator first so we can email a valid pricing result.';
      return;
    }
    submit.disabled=true;
    submit.textContent='Sending...';
    try{
      const response=await fetch('/api/send-pricing-result',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          firstName:document.getElementById('leadFirstName').value.trim(),
          email:document.getElementById('leadEmail').value.trim(),
          company:document.getElementById('leadCompany').value.trim(),
          businessType:document.getElementById('leadBusinessType').value,
          website:document.getElementById('leadWebsite').value,
          ...result
        })
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok) throw new Error(data.error||'We could not send your result.');
      status.className='lead-status success';
      status.textContent='Your result is on its way. Check your inbox shortly.';
      submit.textContent='Result sent';
      if(window.BBAnalytics) window.BBAnalytics.track('email_result_requested',{
        tool_name:'service_pricing_calculator',
        result_type:'pricing_result'
      });
    }catch(err){
      status.className='lead-status error';
      status.textContent=err.message||'We could not email your result right now. Please try again shortly.';
      submit.disabled=false;
      submit.textContent='Send my pricing result';
    }
  });
})();
