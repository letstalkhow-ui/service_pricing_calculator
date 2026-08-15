(function(){
  const section=document.querySelector('[data-guide="2"]');
  if(!section) return;

  const style=document.createElement('style');
  style.textContent=`
    .time-scope-note{margin:0 0 22px!important}
    @media(max-width:560px){.time-scope-note{margin-bottom:20px!important}}
  `;
  document.head.appendChild(style);

  const description=section.querySelector('.section-head p');
  if(description){
    description.textContent='Enter the time needed to deliver this service once for one client.';
  }

  if(!section.querySelector('.time-scope-note')){
    const scopeNote=document.createElement('div');
    scopeNote.className='info time-scope-note';
    scopeNote.innerHTML='<strong>Use one client and one delivery.</strong><br>Count all the time needed to complete this service once, including preparation, meetings, delivery, admin, revisions and follow up. Do not enter the total time you spend on all clients for the whole month.';
    const head=section.querySelector('.section-head');
    if(head) head.insertAdjacentElement('afterend',scopeNote);
  }
})();
