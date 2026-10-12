/* One rendering queue for this page, including its shared formula dialog. */
(()=>{
  'use strict';
  const versions=new WeakMap();
  let nativeTypeset,nativeClear;
  const ready=Promise.resolve(window.MathJax?.startup?.promise).then(()=>{
    const mj=window.MathJax;
    if(typeof mj?.typesetPromise==='function'){
      nativeTypeset=mj.typesetPromise.bind(mj);
      nativeClear=mj.typesetClear?.bind(mj);
      // Install only after startup: startup itself calls typesetPromise.
      mj.typesetPromise=elements=>typeset(elements);
    }
    return document.fonts?.ready;
  });
  let queue=ready.catch(error=>console.warn('Formelsatz konnte nicht starten:',error));
  function enqueue(work){
    queue=queue.then(work).catch(error=>console.warn('Formelsatz:',error));
    return queue;
  }
  function visible(root){
    return root?.isConnected&&!root.closest?.('[hidden],dialog:not([open]),details:not([open])');
  }
  function roots(elements){
    return (elements||[document.body]).flatMap(element=>typeof element==='string'?
      Array.from(document.querySelectorAll(element)):[element]).filter(visible);
  }
  function typeset(elements){
    return enqueue(()=>{
      const attached=roots(elements);
      if(nativeTypeset&&attached.length)return nativeTypeset(attached);
    });
  }
  function update(root,write){
    const version=(versions.get(root)||0)+1;versions.set(root,version);
    return enqueue(async()=>{
      // Ignore obsolete slider states and removed cards, not the latest input.
      if(!root.isConnected||versions.get(root)!==version)return;
      nativeClear?.([root]);
      write();
      if(nativeTypeset&&visible(root))await nativeTypeset([root]);
    });
  }
  async function whenIdle(){
    let current;
    do{current=queue;await current;}while(current!==queue);
  }
  window.AcidTypeset={typeset,update,replace:(root,html)=>update(root,()=>{root.innerHTML=html;}),whenIdle};
  // Closed explanatory panels and the shared dialog are measured on opening.
  document.addEventListener('toggle',event=>{
    if(event.target.matches?.('details[open],dialog[open]'))typeset([event.target]);
  },true);
})();
