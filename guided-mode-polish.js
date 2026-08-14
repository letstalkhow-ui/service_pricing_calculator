(function(){
  try{
    if(Array.isArray(guideSteps)){
      if(guideSteps[0]) guideSteps[0].text='Start by telling us what service you want to price, whether you charge a fixed price or by the hour, and which currency you use.';
      if(guideSteps[1]) guideSteps[1].text='Add the costs that only happen when you deliver this service, such as materials, printing, transport or freelancer fees.';
      if(guideSteps[2]) guideSteps[2].text='Enter the total time needed to deliver this service once for one client, including preparation, meetings, delivery, admin, revisions and follow up. Then enter what you want to earn per hour.';
      if(guideSteps[3]) guideSteps[3].text='Add the regular expenses your business pays each month, such as rent, internet, salaries, software, insurance and marketing.';
      if(guideSteps[4]) guideSteps[4].text='Enter how many hours you work each month, estimate what percentage of that time can actually be charged to clients, then choose the profit percentage you want the business to keep.';
      if(guideSteps[5]) guideSteps[5].text='See the price your business needs, what that price covers, and how much work you need each month to cover your costs.';
      if(guideSteps[6]) guideSteps[6].text='Compare what you charge now with what your business needs, so you can see whether your current price is too low, covering your costs, or supporting your profit goal.';
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
