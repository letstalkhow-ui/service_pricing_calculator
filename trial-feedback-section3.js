(function(){
  const section=document.querySelector('[data-guide="2"]');
  if(!section) return;

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
