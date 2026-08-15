(function(){
  const estimator=document.getElementById('estimator');
  if(!estimator) return;

  const left=estimator.firstElementChild;
  const exampleBanner=document.getElementById('exampleBanner');
  const progressWrap=document.querySelector('.progress-wrap');

  // Keep context visible with every estimator step instead of leaving it above the scrolled workflow.
  if(left && progressWrap){
    const context=document.createElement('div');
    context.className='estimator-context';
    if(exampleBanner) context.appendChild(exampleBanner);
    context.appendChild(progressWrap);
    left.insertBefore(context,left.firstChild);
  }

  const style=document.createElement('style');
  style.textContent=`
    .estimator-context{margin:0 0 14px}
    .estimator-context .example-banner{margin:0 0 10px;width:100%}
    .estimator-context .progress-wrap{padding:0;width:100%;margin:0}
    .estimator-context .progress{max-width:none;width:100%}
    .helper button:focus,.helper button:focus-visible{outline:none!important;box-shadow:none!important}
    .layout.summary-mode{grid-template-columns:1fr}
    .layout.summary-mode .results{position:static;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}
    .layout.summary-mode .result-card{height:100%}
    .layout.summary-mode #leadCard{grid-column:1/-1;height:auto}
    @media(max-width:1100px){
      .layout.summary-mode .results{grid-template-columns:1fr 1fr}
      .layout.summary-mode #leadCard{grid-column:1/-1}
    }
    @media(max-width:760px){
      .layout.summary-mode .results{grid-template-columns:1fr}
      .layout.summary-mode #leadCard{grid-column:1}
    }
  `;
  document.head.appendChild(style);

  function syncSummaryLayout(){
    const step4=document.querySelector('.panel[data-step="4"]');
    estimator.classList.toggle('summary-mode',!!(step4&&step4.classList.contains('active')));
  }

  const observer=new MutationObserver(syncSummaryLayout);
  document.querySelectorAll('.panel').forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));
  syncSummaryLayout();
})();
