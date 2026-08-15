(function(){
  const raw=localStorage.getItem('bbCostEstimatorTransfer');
  if(!raw) return;
  let payload;
  try{payload=JSON.parse(raw)}catch(_){localStorage.removeItem('bbCostEstimatorTransfer');return}
  if(!payload||payload.version!==1) return;

  const guideWelcome=document.getElementById('guideWelcome');
  if(guideWelcome) guideWelcome.classList.add('hidden');

  const style=document.createElement('style');
  style.textContent=`
    .cost-transfer-overlay{position:fixed;inset:0;z-index:140;background:rgba(0,0,0,.58);display:grid;place-items:center;padding:20px}
    .cost-transfer-card{width:min(620px,100%);background:#fff;border:2px solid #111;border-radius:18px;padding:26px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
    .cost-transfer-mark{display:inline-flex;background:#111;color:var(--yellow);font-size:11px;font-weight:900;letter-spacing:.8px;padding:7px 9px;border-radius:7px}
    .cost-transfer-card h2{font-size:28px;letter-spacing:-.8px;margin:16px 0 10px}
    .cost-transfer-card p{color:#666;line-height:1.55;margin:0}
    .cost-transfer-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}
    .cost-transfer-summary div{background:#faf8f2;border-radius:12px;padding:13px}
    .cost-transfer-summary span{display:block;font-size:11px;color:#777;margin-bottom:5px}
    .cost-transfer-summary strong{font-size:18px}
    .cost-transfer-actions{display:flex;gap:10px;margin-top:20px}
    .cost-transfer-actions button{flex:1;border-radius:10px;padding:12px 14px;font-weight:800;cursor:pointer}
    .cost-transfer-yes{background:var(--yellow);color:#111;border:2px solid #111}
    .cost-transfer-no{background:#fff;color:#333;border:1px solid #d8d2c7}
    .cost-transfer-toast{position:fixed;z-index:150;left:50%;top:18px;transform:translate(-50%,-18px);width:min(560px,calc(100vw - 32px));background:#111;color:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 12px 36px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:.2s}
    .cost-transfer-toast.active{opacity:1;transform:translate(-50%,0)}
    .cost-transfer-toast strong{display:block;color:var(--yellow);margin-bottom:3px}
    .cost-transfer-toast span{font-size:12px;color:#ddd}
    @media(max-width:560px){.cost-transfer-card{padding:22px}.cost-transfer-card h2{font-size:25px}.cost-transfer-summary{grid-template-columns:1fr}.cost-transfer-actions{display:grid}.cost-transfer-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  const currency=payload.currency||'MUR';
  const fmt=v=>`${currency} ${Math.round(Number(v)||0).toLocaleString('en-US')}`;
  const overlay=document.createElement('div');
  overlay.className='cost-transfer-overlay';
  overlay.innerHTML=`<div class="cost-transfer-card"><span class="cost-transfer-mark">COST ESTIMATOR RESULTS FOUND</span><h2>Use the costs you just estimated?</h2><p>We found figures from your Business Cost Estimator. You can add them to Sections 2 and 4 of this pricing calculator, then review or change any number before continuing.</p><div class="cost-transfer-summary"><div><span>Direct service cost</span><strong>${fmt(payload.directTotal)}</strong></div><div><span>Monthly business expenses</span><strong>${fmt(payload.monthlyTotal)}</strong></div></div><div class="cost-transfer-actions"><button class="cost-transfer-yes" type="button">Yes, use my costs</button><button class="cost-transfer-no" type="button">No, start fresh</button></div></div>`;
  document.body.appendChild(overlay);

  const close=()=>overlay.remove();
  overlay.querySelector('.cost-transfer-no').addEventListener('click',()=>{localStorage.removeItem('bbCostEstimatorTransfer');close()});
  overlay.querySelector('.cost-transfer-yes').addEventListener('click',()=>{
    try{
      if(Array.isArray(payload.direct)&&payload.direct.length) direct=payload.direct.map(x=>[String(x[0]||''),Math.max(0,Number(x[1])||0),Math.max(0,Number(x[2])||0)]);
      if(Array.isArray(payload.overhead)&&payload.overhead.length) overhead=payload.overhead.map(x=>[String(x[0]||''),Math.max(0,Number(x[1])||0)]);
      if(payload.serviceName&&document.getElementById('service')) document.getElementById('service').value=payload.serviceName;
      if(payload.currency&&document.getElementById('currency')) document.getElementById('currency').value=payload.currency;
      if(typeof render==='function') render();
      localStorage.removeItem('bbCostEstimatorTransfer');
      close();
      const toast=document.createElement('div');toast.className='cost-transfer-toast';toast.innerHTML='<strong>Your estimated costs have been added.</strong><span>Review Sections 2 and 4 before continuing with your pricing calculation.</span>';document.body.appendChild(toast);requestAnimationFrame(()=>toast.classList.add('active'));setTimeout(()=>{toast.classList.remove('active');setTimeout(()=>toast.remove(),250)},4200);
      const target=document.querySelector('[data-guide="1"]');if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),250);
    }catch(err){console.error('Cost estimator transfer failed',err);localStorage.removeItem('bbCostEstimatorTransfer');close()}
  });
})();