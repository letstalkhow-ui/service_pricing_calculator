(function(){
  try{
    if(Array.isArray(guideSteps)){
      if(guideSteps[0]) guideSteps[0].text='Start by telling us what service you want to price, whether you charge a fixed price or by the hour, and which currency you use.';
      if(guideSteps[1]) guideSteps[1].text='Add the costs that only happen when you deliver this service, such as materials, printing, transport or freelancer fees.';
      if(guideSteps[2]) guideSteps[2].text='Enter the total time needed to deliver this service once for one client, including preparation, meetings, delivery, admin, revisions and follow up. Then enter what you want to earn per hour.';
    }

    const timeSection=document.querySelector('[data-guide="2"]');
    const timeNote=timeSection&&timeSection.querySelector('.guide-note');
    if(timeNote){
      timeNote.innerHTML='<strong>Think about one client and one delivery of this service.</strong>Enter the total time needed to deliver the service once for that client. Include preparation, meetings, delivery, admin, revisions and follow up, not only the hours spent directly with the client.';
    }
  }catch(e){}

  window.finishGuide=function(){
    clearGuide();
    const toast=document.getElementById('completionToast');
    if(toast){
      toast.classList.add('active');
      clearTimeout(completionTimer);
      completionTimer=setTimeout(()=>toast.classList.remove('active'),4500);
    }
  };
})();
