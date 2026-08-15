(function(){
  const estimator=document.getElementById('estimator');
  if(!estimator) return;

  const left=estimator.firstElementChild;
  const results=document.querySelector('.results');
  const exampleBanner=document.getElementById('exampleBanner');
  const progressWrap=document.querySelector('.progress-wrap');
  const startButton=document.querySelector('.hero-actions .btn-primary');
  const summaryStep=document.querySelector('.panel[data-step="4"]');
  const summaryPrimary=summaryStep?summaryStep.querySelector('.nav .btn-yellow'):null;
  const directCard=results?results.querySelector('.primary'):null;
  const monthlyCard=directCard?directCard.nextElementSibling:null;
  const nextCard=document.getElementById('nextCard');
  const leadCard=document.getElementById('leadCard');

  if(left && progressWrap){
    const context=document.createElement('div');
    context.className='estimator-context';
    if(exampleBanner) context.appendChild(exampleBanner);
    context.appendChild(progressWrap);
    left.insertBefore(context,left.firstChild);
  }

  if(exampleBanner){
    exampleBanner.innerHTML='<span><strong>Example calculation:</strong> Social Media Management Business. These figures are for learning only and are not recommended BusinessBoosts cost benchmarks.</span><div class="example-actions"><button type="button" id="useOwnNumbers">Use my own numbers</button></div>';
  }

  const summaryDashboard=document.createElement('div');
  summaryDashboard.className='summary-dashboard';
  const summaryTop=document.createElement('div');
  summaryTop.className='summary-top';
  const summaryBody=document.createElement('div');
  summaryBody.className='summary-body';
  const summaryLeft=document.createElement('div');
  summaryLeft.className='summary-left';
  summaryBody.appendChild(summaryLeft);
  summaryDashboard.appendChild(summaryTop);
  summaryDashboard.appendChild(summaryBody);

  const style=document.createElement('style');
  style.textContent=`
    .estimator-context{margin:0 0 14px}
    .estimator-context .example-banner{margin:0 0 10px;width:100%;align-items:center;justify-content:space-between;gap:14px}
    .estimator-context .example-banner.active{display:flex}
    .estimator-context .example-banner span{font-size:13px;line-height:1.5}
    .estimator-context .example-actions{display:flex;gap:8px;flex:0 0 auto}
    .estimator-context .example-actions button{background:#fff;color:#111;border:0;border-radius:8px;padding:8px 11px;font-weight:800;cursor:pointer;white-space:nowrap}
    .estimator-context .progress-wrap{padding:0;width:100%;margin:0}
    .estimator-context .progress{max-width:none;width:100%}
    .helper button:focus,.helper button:focus-visible{outline:none!important;box-shadow:none!important}

    .summary-dashboard{display:none}
    .layout.summary-mode{display:block;padding-bottom:60px}
    .layout.summary-mode>div:first-child{width:100%}
    .layout.summary-mode>.results{display:none}
    .layout.summary-mode .summary-dashboard{display:grid;gap:18px}
    .layout.summary-mode .summary-top{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(330px,.75fr);gap:18px;align-items:stretch}
    .layout.summary-mode .summary-body{display:grid;grid-template-columns:minmax(0,.95fr) minmax(420px,1.05fr);gap:18px;align-items:start}
    .layout.summary-mode .summary-left{display:grid;gap:18px}
    .layout.summary-mode .summary-top>.panel,.layout.summary-mode .summary-top>.result-card,.layout.summary-mode .summary-body .result-card{height:100%}

    .layout.summary-mode .panel[data-step="4"]{padding:18px 20px}
    .layout.summary-mode .panel[data-step="4"] .section-head{margin-bottom:10px;gap:11px;align-items:flex-start}
    .layout.summary-mode .panel[data-step="4"] .section-head b{padding:5px 7px;font-size:12px;border-radius:7px}
    .layout.summary-mode .panel[data-step="4"] .section-head h2{font-size:22px;line-height:1.15;margin:0 0 3px}
    .layout.summary-mode .panel[data-step="4"] .section-head p{font-size:12px;line-height:1.4}
    .layout.summary-mode .panel[data-step="4"] .notice{margin-top:8px;padding:9px 11px;font-size:11px;line-height:1.4}
    .layout.summary-mode .panel[data-step="4"] .nav{margin-top:12px;justify-content:flex-start}
    .layout.summary-mode .panel[data-step="4"] .btn{padding:9px 13px;font-size:13px}
    .layout.summary-mode:not(.example-summary) .panel[data-step="4"] .nav .btn-yellow{display:none!important}

    .layout.summary-mode .summary-top .primary{display:flex;flex-direction:column;justify-content:center;min-height:190px}
    .layout.summary-mode .summary-left>.result-card{height:auto}
    .layout.summary-mode #nextCard{display:block}
    .layout.summary-mode #leadCard{display:block;height:100%}
    .layout.summary-mode #leadCard form{display:grid}

    .layout.example-summary #nextCard,.layout.example-summary #leadCard{display:none!important}
    .layout.example-summary .summary-body{grid-template-columns:1fr}
    .layout.example-summary .estimator-context .example-actions{display:none}

    @media(max-width:1050px){
      .layout.summary-mode .summary-top{grid-template-columns:1fr 1fr}
      .layout.summary-mode .summary-body{grid-template-columns:1fr 1fr}
    }
    @media(max-width:760px){
      .estimator-context .example-banner.active{align-items:flex-start;flex-direction:column}
      .estimator-context .example-actions,.estimator-context .example-actions button{width:100%}
      .layout.summary-mode .summary-top,.layout.summary-mode .summary-body{grid-template-columns:1fr}
      .layout.summary-mode .panel[data-step="4"]{padding:14px 16px}
      .layout.summary-mode .panel[data-step="4"] .section-head h2{font-size:19px}
      .layout.summary-mode .summary-top .primary{min-height:0}
    }
  `;
  document.head.appendChild(style);

  function isExampleMode(){
    return !!(exampleBanner && exampleBanner.classList.contains('active'));
  }

  function startFresh(){
    window.location.replace('/tools/cost-estimator?start=fresh');
  }

  function mountSummary(){
    if(!left || !summaryStep || !directCard || !monthlyCard || !nextCard || !leadCard) return;
    if(!summaryDashboard.isConnected) left.appendChild(summaryDashboard);
    summaryTop.appendChild(summaryStep);
    summaryTop.appendChild(directCard);
    summaryLeft.appendChild(monthlyCard);
    summaryLeft.appendChild(nextCard);
    summaryBody.appendChild(leadCard);
  }

  function restoreSummary(){
    if(!left || !results || !summaryStep || !directCard || !monthlyCard || !nextCard || !leadCard) return;
    left.appendChild(summaryStep);
    results.appendChild(directCard);
    results.appendChild(monthlyCard);
    results.appendChild(nextCard);
    results.appendChild(leadCard);
    if(summaryDashboard.isConnected) summaryDashboard.remove();
  }

  function syncSummaryLayout(){
    const onSummary=!!(summaryStep&&summaryStep.classList.contains('active'));
    const exampleSummary=onSummary&&isExampleMode();
    estimator.classList.toggle('summary-mode',onSummary);
    estimator.classList.toggle('example-summary',exampleSummary);

    if(onSummary) mountSummary();
    else restoreSummary();

    if(summaryPrimary){
      summaryPrimary.textContent=exampleSummary?'Use my own numbers':'Use these costs in my Pricing Calculator';
    }
  }

  if(summaryPrimary){
    summaryPrimary.addEventListener('click',function(event){
      if(isExampleMode()){
        event.preventDefault();
        event.stopImmediatePropagation();
        startFresh();
      }
    },true);
  }

  if(startButton){
    startButton.addEventListener('click',function(event){
      if(isExampleMode()){
        event.preventDefault();
        event.stopImmediatePropagation();
        startFresh();
      }
    },true);
  }

  const useOwnNumbers=document.getElementById('useOwnNumbers');
  if(useOwnNumbers){
    useOwnNumbers.addEventListener('click',function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      startFresh();
    },true);
  }

  if(exampleBanner){
    new MutationObserver(syncSummaryLayout).observe(exampleBanner,{attributes:true,attributeFilter:['class']});
  }
  const observer=new MutationObserver(syncSummaryLayout);
  document.querySelectorAll('.panel').forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));
  syncSummaryLayout();
})();
