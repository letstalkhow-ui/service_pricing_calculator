(function(){
  const style=document.createElement('style');
  style.textContent=`
  .interpretation-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px;display:grid;gap:16px}
  .interpretation-head{display:flex;align-items:flex-start;gap:14px}
  .interpretation-mark{background:var(--yellow);border-radius:8px;padding:7px 9px;font-size:12px;font-weight:900;letter-spacing:.4px;flex:0 0 auto}
  .interpretation-card h3{margin:0 0 5px;font-size:22px}
  .interpretation-card p{margin:0;color:#666;font-size:14px;line-height:1.55}
  .interpretation-message{background:#f7f4ea;border-radius:12px;padding:16px;display:grid;gap:5px}
  .interpretation-message strong{font-size:16px}
  .interpretation-message span{color:#555;font-size:13px;line-height:1.5}
  .interpretation-next{border-top:1px solid var(--line);padding-top:14px;display:grid;gap:5px}
  .interpretation-next strong{font-size:13px}
  .interpretation-next span{font-size:13px;color:#666;line-height:1.5}
  .interpretation-card.below-cost .interpretation-message{background:#fff1ef;color:#b42318}
  .interpretation-card.below-cost .interpretation-message span{color:#8a2018}
  .interpretation-card.below-recommended .interpretation-message{background:#fff8cf;color:#5f5200}
  .interpretation-card.below-recommended .interpretation-message span{color:#5f5200}
  .interpretation-card.on-target .interpretation-message{background:#edf8f2;color:#16784a}
  .interpretation-card.on-target .interpretation-message span{color:#12643e}
  @media(max-width:560px){.interpretation-card{padding:19px;border-radius:14px}.interpretation-card h3{font-size:20px}}
  `;
  document.head.appendChild(style);

  const inputs=document.querySelector('.inputs');
  const results=document.querySelector('.results');
  const exampleBanner=document.getElementById('exampleBanner');
  if(!inputs||!results) return;

  const card=document.createElement('section');
  card.className='interpretation-card';
  card.innerHTML=`
    <div class="interpretation-head">
      <div class="interpretation-mark">INSIGHT</div>
      <div><h3>What your result means</h3><p>A simple reading of your current price based on the numbers you entered.</p></div>
    </div>
    <div class="interpretation-message" id="interpretationMessage">
      <strong>Complete the calculator to see your pricing position.</strong>
      <span>Once your costs, time, capacity and current price are entered, we will translate the result into plain English.</span>
    </div>
    <div class="interpretation-next"><strong>Try this next</strong><span>Adjust your price, profit goal or paid client time above and see how your result changes.</span></div>`;
  inputs.appendChild(card);

  function placeCard(){
    const exampleActive=exampleBanner&&exampleBanner.classList.contains('active');
    if(exampleActive){
      if(card.parentElement!==results||card!==results.lastElementChild) results.appendChild(card);
    }else if(card.parentElement!==inputs){
      inputs.appendChild(card);
    }
  }

  function value(id){return Math.max(0,Number(document.getElementById(id)?.value)||0)}
  function getPosition(){
    try{
      const directTotal=direct.reduce((s,x)=>s+Math.max(0,x[1]||0)*Math.max(0,x[2]||0),0);
      const hours=acts.reduce((s,x)=>s+Math.max(0,x[1]||0),0);
      const compRate=value('comp');
      const monthlyOverhead=overhead.reduce((s,x)=>s+Math.max(0,x[1]||0),0);
      const working=value('working');
      const util=Math.min(100,value('util'));
      const billableHours=working*util/100;
      const margin=Math.min(95,value('margin'))/100;
      const current=value('current');
      const isHourly=document.getElementById('ptype').value==='hourly';
      if(working<=0||util<=0||hours<=0||billableHours<=0||current<=0) return null;

      const compensation=hours*compRate;
      const overheadPerHour=monthlyOverhead/billableHours;
      const allocatedOverhead=hours*overheadPerHour;
      const floor=directTotal+compensation;
      const breakEven=floor+allocatedOverhead;
      const recommended=breakEven/(1-margin);
      const suggestedPrice=isHourly?recommended/hours:recommended;
      const breakEvenPrice=isHourly?(directTotal/hours)+compRate+overheadPerHour:breakEven;

      if(current<breakEvenPrice) return 'below-cost';
      if(current<suggestedPrice) return 'below-recommended';
      return 'on-target';
    }catch(e){return null}
  }

  function updateInterpretation(){
    placeCard();
    const message=document.getElementById('interpretationMessage');
    const position=getPosition();
    card.classList.remove('below-cost','below-recommended','on-target');
    if(!position){
      message.innerHTML='<strong>Complete the calculator to see your pricing position.</strong><span>Once your costs, time, capacity and current price are entered, we will translate the result into plain English.</span>';
      return;
    }
    card.classList.add(position);
    if(position==='below-cost'){
      message.innerHTML='<strong>Your current price is below the cost-covering level.</strong><span>You may be losing money every time you deliver the service because the price does not fully cover your time, direct costs and share of business expenses.</span>';
    }else if(position==='below-recommended'){
      message.innerHTML='<strong>Your current price covers your costs, but it is below your target.</strong><span>The service can support its costs, but the profit left for the business is lower than the profit goal you selected.</span>';
    }else{
      message.innerHTML='<strong>Your current price is supporting your target.</strong><span>Based on the information entered, your price covers the service costs, your time, your share of business expenses and your selected profit goal.</span>';
    }
  }

  document.addEventListener('input',updateInterpretation);
  document.addEventListener('change',updateInterpretation);
  const observer=new MutationObserver(updateInterpretation);
  observer.observe(document.getElementById('directRows'),{childList:true,subtree:true});
  observer.observe(document.getElementById('activityRows'),{childList:true,subtree:true});
  observer.observe(document.getElementById('overheadRows'),{childList:true,subtree:true});
  if(exampleBanner){
    const exampleObserver=new MutationObserver(updateInterpretation);
    exampleObserver.observe(exampleBanner,{attributes:true,attributeFilter:['class']});
  }
  updateInterpretation();
})();
