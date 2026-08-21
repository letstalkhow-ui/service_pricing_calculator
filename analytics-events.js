(function(){
  const fired=new Set();
  function track(eventName,parameters){
    if(typeof window.gtag!=='function') return false;
    window.gtag('event',eventName,Object.assign({page_path:window.location.pathname},parameters||{}));
    return true;
  }
  function trackOnce(eventName,parameters,key){
    const eventKey=key||eventName;
    if(fired.has(eventKey)||!track(eventName,parameters)) return false;
    fired.add(eventKey);
    return true;
  }
  window.BBAnalytics={track,trackOnce};
})();
