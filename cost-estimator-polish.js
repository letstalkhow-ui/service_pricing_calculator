(function(){
  const estimator=document.getElementById('estimator');
  if(!estimator) return;

  const left=estimator.firstElementChild;
  const exampleBanner=document.getElementById('exampleBanner');
  const progressWrap=document.querySelector('.progress-wrap');
  const startButton=document.querySelector('.hero-actions .btn-primary');
  const summaryStep=document.querySelector('.panel[data-step="4"]');
  const summaryPrimary=summaryStep?summaryStep.querySelector('.nav .btn-yellow'):null;

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
    .layout.summary-mode{grid-template-columns:1fr}
    .layout.summary-mode .results{position:static;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}
    .layout.summary-mode .result-card{height:100%}
    .layout.summary-mode #leadCard{grid-column:1/-1;height:auto}
    .layout.example-summary #nextCard,.layout.example-summary #leadCard{display:none!important}
    .layout.example-summary .estimator-context .example-actions{display:none}
    @media(max-width:1100px){
      .layout.summary-mode .results{grid-template-columns:1fr 1fr}
      .layout.summary-mode #leadCard{grid-column:1/-1}
    }
    @media(max-width:760px){
      .estimator-context .example-banner.active{align-items:flex-start;flex-direction:column}
      .estimator-context .example-actions,.estimator-context .example-actions button{width:100%}
      .layout.summary-mode .results{grid-template-columns:1fr}
      .layout.summary-mode #leadCard{grid-column:1}
    }
  `;
  document.head.appendChild(style);

  function isExampleMode(){
    return !!(exampleBanner && exampleBanner.classList.contains('active'));
  }

  function forceStepOne(){
    document.querySelectorAll('.panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.step==='1'));
    document.querySelectorAll('.step-pill').forEach((pill,i)=>pill.classList.toggle('active',i===0));
    estimator.classList.remove('summary-mode','example-summary');
    requestAnimationFrame(()=>estimator.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function resetEstimatorForOwnNumbers(){
    estimateMode='both';
    direct=[{name:'',qty:1,unit:0}];
    monthly=[{name:'',amount:0,freq:'monthly'}];

    const service=document.getElementById('serviceName');
    const currency=document.getElementById('currency');
    if(service) service.value='';
    if(currency) currency.value='MUR';

    chooseEstimate('both');
    if(exampleBanner) exampleBanner.classList.remove('active');

    document.querySelectorAll('.helper.open').forEach(helper=>{
      helper.classList.remove('open');
      const toggle=helper.querySelector('button');
      if(toggle && toggle.lastElementChild) toggle.lastElementChild.textContent='+';
    });

    const leadForm=document.getElementById('leadForm');
    if(leadForm) leadForm.reset();
    const formStatus=document.getElementById('formStatus');
    if(formStatus){formStatus.textContent='';formStatus.className='status'}
    const sendBtn=document.getElementById('sendBtn');
    if(sendBtn){sendBtn.disabled=false;sendBtn.textContent='Send my cost summary'}

    const nextCard=document.getElementById('nextCard');
    const leadCard=document.getElementById('leadCard');
    if(nextCard) nextCard.classList.remove('active');
    if(leadCard) leadCard.classList.remove('active');

    renderDirect();
    renderMonthly();
    forceStepOne();
    calc();
  }

  function syncSummaryLayout(){
    const onSummary=!!(summaryStep&&summaryStep.classList.contains('active'));
    const exampleSummary=onSummary&&isExampleMode();
    estimator.classList.toggle('summary-mode',onSummary);
    estimator.classList.toggle('example-summary',exampleSummary);

    if(summaryPrimary){
      if(exampleSummary){
        summaryPrimary.textContent='Use my own numbers';
      }else{
        summaryPrimary.textContent='Use these costs in my Pricing Calculator';
      }
    }
  }

  if(summaryPrimary){
    summaryPrimary.addEventListener('click',function(event){
      if(isExampleMode()){
        event.preventDefault();
        event.stopImmediatePropagation();
        resetEstimatorForOwnNumbers();
      }
    },true);
  }

  if(startButton){
    startButton.addEventListener('click',function(event){
      if(isExampleMode()){
        event.preventDefault();
        event.stopImmediatePropagation();
        resetEstimatorForOwnNumbers();
      }
    },true);
  }

  const useOwnNumbers=document.getElementById('useOwnNumbers');
  if(useOwnNumbers) useOwnNumbers.addEventListener('click',function(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    resetEstimatorForOwnNumbers();
  },true);

  if(exampleBanner){
    new MutationObserver(syncSummaryLayout).observe(exampleBanner,{attributes:true,attributeFilter:['class']});
  }
  const observer=new MutationObserver(syncSummaryLayout);
  document.querySelectorAll('.panel').forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));
  syncSummaryLayout();
})();
