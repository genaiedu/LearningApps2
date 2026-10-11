/* Layout decisions shared by the live and offline navigation study. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TypoNavigation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const defaults=Object.freeze({mode:'top',width:'wide',side:'overlay',size:18});
  function settings(o={}){
    const size=Number(o.size);
    return {mode:['top','bottom','side'].includes(o.mode)?o.mode:defaults.mode,
      width:['wide','phone'].includes(o.width)?o.width:defaults.width,
      side:['overlay','push'].includes(o.side)?o.side:defaults.side,
      size:Number.isFinite(size)?Math.min(26,Math.max(18,size)):defaults.size};
  }
  function geometry(o,available,open=false){
    const s=settings(o),a=Number(available),width=Math.max(0,Math.min(s.width==='phone'?390:900,Number.isFinite(a)?a:900));
    return {width,compact:width<620,push:s.mode==='side'&&s.side==='push'&&open&&width>=620};
  }
  function activeIndex(tops,threshold){
    let index=0;
    tops.forEach((top,i)=>{if(Number.isFinite(top)&&top<=threshold)index=i;});
    return index;
  }
  return {defaults,settings,geometry,activeIndex};
});
