(function(){
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
