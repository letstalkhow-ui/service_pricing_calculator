(function(){
  const path=window.location.pathname.replace(/\/$/,'');
  const isPricing=path==='/tools/pricing'||path==='';
  const isCost=path==='/tools/cost-estimator';
  const topbar=document.querySelector('.topbar');
  const logo=document.querySelector('.brand-logo');
  const badge=topbar?topbar.querySelector('.badge'):null;

  if(logo){
    logo.src='/assets/businessboosts-logo-transparent.png?v=1';
    if(!logo.parentElement.matches('a')){
      const link=document.createElement('a');
      link.href='/';
      link.className='brand-home';
      link.setAttribute('aria-label','BusinessBoosts home');
      logo.parentNode.insertBefore(link,logo);
      link.appendChild(logo);
    }
  }

  if(badge) badge.remove();

  const style=document.createElement('style');
  style.textContent=`
    .brand-home{display:flex;align-items:center;flex:0 0 auto}
    .suite-right{display:flex;align-items:center;gap:12px;min-width:0}
    .tool-suite-nav{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.72);border:1px solid rgba(17,17,17,.16);border-radius:10px;padding:4px}
    .tool-suite-nav a{display:block;text-decoration:none;color:#222;font-size:12px;font-weight:800;padding:7px 10px;border-radius:7px;white-space:nowrap}
    .tool-suite-nav a:hover{background:#fff}
    .tool-suite-nav a.active{background:#111;color:#fff}
    .tool-crosslink{margin-top:16px;border:1px solid #ead36b;background:#fff9d8;border-radius:12px;padding:13px 14px;display:flex;justify-content:space-between;align-items:center;gap:14px}
    .tool-crosslink-copy{min-width:0}
    .tool-crosslink strong{display:block;font-size:13px;margin-bottom:3px;color:#111}
    .tool-crosslink span{display:block;font-size:12px;line-height:1.45;color:#665d34}
    .tool-crosslink a{flex:0 0 auto;text-decoration:none;background:#111;color:#fff;border-radius:8px;padding:9px 11px;font-size:12px;font-weight:800;white-space:nowrap}
    @media(max-width:820px){
      .suite-right{gap:7px}
      .tool-suite-nav a{font-size:11px;padding:7px 8px}
    }
    @media(max-width:620px){
      .topbar{gap:10px}
      .brand-logo{height:42px!important;max-width:150px}
      .tool-suite-nav{gap:2px;padding:3px}
      .tool-suite-nav a{font-size:10px;padding:6px 7px}
      .tool-crosslink{align-items:flex-start;flex-direction:column}
      .tool-crosslink a{width:100%;text-align:center}
    }
    @media(max-width:430px){
      .brand-logo{max-width:120px}
      .tool-suite-nav a{font-size:9px;padding:6px 5px}
    }
  `;
  document.head.appendChild(style);

  if(topbar){
    const nav=document.createElement('nav');
    nav.className='tool-suite-nav';
    nav.setAttribute('aria-label','BusinessBoosts tools');
    nav.innerHTML=`<a href="/tools/pricing"${isPricing?' class="active" aria-current="page"':''}>Pricing Calculator</a><a href="/tools/cost-estimator"${isCost?' class="active" aria-current="page"':''}>Cost Estimator</a>`;

    const right=document.createElement('div');
    right.className='suite-right';
    right.appendChild(nav);
    topbar.appendChild(right);
  }

  if(isPricing){
    const cards=[...document.querySelectorAll('.card')];
    const directCard=cards.find(card=>/spend to deliver this service/i.test(card.querySelector('h2')?.textContent||''));
    const overheadCard=cards.find(card=>/business.*cost|monthly.*expense|regular.*business/i.test(card.querySelector('h2')?.textContent||''));

    function addCostLink(card,copy){
      if(!card||card.querySelector('.tool-crosslink')) return;
      const box=document.createElement('div');
      box.className='tool-crosslink';
      box.innerHTML=`<div class="tool-crosslink-copy"><strong>Not sure about your costs?</strong><span>${copy}</span></div><a href="/tools/cost-estimator">Use Cost Estimator →</a>`;
      card.appendChild(box);
    }

    addCostLink(directCard,'Work through your direct service costs first, then bring them back into this calculator.');
    addCostLink(overheadCard,'Estimate your regular monthly business expenses before deciding what your service needs to contribute.');
  }
})();
