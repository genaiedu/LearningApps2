(function(root,factory) {
  if(typeof module==='object' && module.exports) module.exports=factory();
  else root.KunstIntro=factory();
})(typeof globalThis!=='undefined' ? globalThis : this,function() {
  'use strict';
  // Keep the very same image element for preloading and the first film frame.
  // A network response alone is not enough: wait for its pixels to be decoded.
  function prepare(works,{createImage=()=>new Image()}={}) {
    if(!works.length) throw Error('Keine Vorspannbilder vorhanden.');
    const image=createImage(), sources=[...new Set([works[0].imageLargeURL,works[0].imageURL].filter(Boolean))];
    let settle, sourceIndex=0, request=0;
    const preparation={works:[...works],image,status:'loading',ready:new Promise(resolve=>{settle=resolve;}),cancel};
    image.alt=''; image.referrerPolicy='no-referrer'; image.decoding='async'; image.fetchPriority='high';
    function finish(status) {
      if(preparation.status!=='loading') return;
      preparation.status=status;
      image.onload=image.onerror=null;
      settle(status);
    }
    function cancel() {
      request++;
      finish('cancelled');
      image.onload=image.onerror=null;
      image.removeAttribute('src');
    }
    function load() {
      if(preparation.status!=='loading') return;
      if(sourceIndex===sources.length) { finish('failed'); return; }
      const current=++request;
      const failed=()=>{
        if(current!==request || preparation.status!=='loading') return;
        sourceIndex++; load(); // Try the smaller original if the large version is unavailable.
      };
      image.onerror=failed;
      image.onload=async()=>{
        if(current!==request || preparation.status!=='loading') return;
        try {
          if(!image.naturalWidth) throw Error('Leeres Bild.');
          if(typeof image.decode==='function') await image.decode();
          if(current===request) finish('ready');
        } catch { failed(); }
      };
      image.src=sources[sourceIndex];
    }
    load();
    return preparation;
  }
  return {prepare};
});
