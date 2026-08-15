(function(){
  const welcome=document.getElementById('guideWelcome');
  if(!welcome) return;

  const card=welcome.querySelector('.welcome-card');
  const mark=welcome.querySelector('.welcome-mark');
  const title=welcome.querySelector('h2');
  const copy=welcome.querySelector('p');
  const primary=welcome.querySelector('.guide-primary');
  const example=welcome.querySelector('.guide-example');
  const normal=welcome.querySelector('.guide-secondary');

  if(mark) mark.textContent='RECOMMENDED FOR FIRST-TIME USERS';
  if(title) title.textContent='Not sure what to enter? Start here.';
  if(copy) copy.textContent='Use the guided calculation and we will take you through each section step by step, in simple English. You can still change any number as you go.';
  if(primary) primary.textContent='Guide me step by step';
  if(example) example.textContent='Show me an example first';
  if(normal) normal.textContent='I know my numbers, calculate on my own';

  const style=document.createElement('style');
  style.textContent=`
    .welcome-card{position:relative;overflow:hidden;border:2px solid #111}
    .welcome-card:before{content:'';position:absolute;left:0;right:0;top:0;height:8px;background:var(--yellow)}
    .welcome-mark{background:#111;color:var(--yellow);letter-spacing:.8px}
    .welcome-card h2{max-width:560px}
    .welcome-card p{max-width:610px}
    .welcome-actions{align-items:stretch;display:grid;grid-template-columns:1.15fr 1fr 1.35fr}
    .welcome-actions button{width:100%;min-width:0;white-space:normal;line-height:1.25;text-align:center}
    .welcome-actions .guide-primary{background:var(--yellow);color:#111;border:2px solid #111;box-shadow:0 5px 0 #111;font-size:14px}
    .welcome-actions .guide-primary:hover{transform:translateY(-1px)}
    .welcome-actions .guide-example{background:#fff;border:1px solid #cfc9bc}
    .welcome-actions .guide-secondary{background:#fff;color:#555;border:1px solid #e3ded4}
    @media(max-width:760px){
      .welcome-actions{grid-template-columns:1fr}
    }
    @media(max-width:560px){
      .guide-welcome{padding:14px;align-items:center}
      .welcome-card{padding:28px 22px 22px;border-radius:18px}
      .welcome-mark{font-size:10px;line-height:1.25;text-align:center}
      .welcome-card h2{font-size:28px;line-height:1.05;margin:16px 0 10px}
      .welcome-card p{font-size:15px;line-height:1.55}
      .welcome-actions{gap:10px;margin-top:20px}
      .welcome-actions button{min-height:50px}
      .welcome-actions .guide-primary{font-size:16px;min-height:56px}
      .welcome-actions .guide-secondary{font-size:12px;background:transparent;border-style:dashed}
    }
  `;
  document.head.appendChild(style);
})();
