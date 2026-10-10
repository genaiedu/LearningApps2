(function(){
  'use strict';
  const C=window.TypoMathPairs,params=new URLSearchParams(location.search);
  let state=C.settings({font:params.get('font'),body:params.get('body'),example:params.get('example')});
  const fontName='mathjax-'+state.font;
  const base=new URL(state.font==='newcm'?'../LearningApps/fonts/mathjax-newcm/':'fonts/mathjax/'+fontName+'/',location.href).href.replace(/\/$/,'');
  const targetOrigin=location.protocol==='file:'?'*':location.origin;
  function report(type,extra={}){if(parent!==window)parent.postMessage({type,font:state.font,...extra},targetOrigin);}
  let queue=Promise.resolve(),epoch=0;
  function height(){report('typografie-math-height',{height:Math.ceil(document.body.getBoundingClientRect().height)});}
  async function render(){
    const current=++epoch;
    queue=queue.then(async()=>{
      if(current!==epoch)return;
      const sample=document.getElementById('math-pair-sample'),status=document.getElementById('pair-status');
      sample.setAttribute('aria-busy','true');
      try{
        await MathJax.startup.promise;if(current!==epoch)return;
        await document.fonts.load('22px "'+C.bodies[state.body].name+'"');
        if(current!==epoch)return;
        MathJax.typesetClear([sample]);
        sample.style.fontFamily='"'+C.bodies[state.body].name+'", '+(C.bodies[state.body].group==='serif'?'serif':'sans-serif');
        document.getElementById('pair-inline').textContent='\\(x^2\\)';
        document.getElementById('pair-display').textContent='\\['+C.examples[state.example][0]+'\\]';
        await MathJax.typesetPromise([sample]);
        if(current!==epoch)return;
        status.textContent='';sample.setAttribute('aria-busy','false');height();
        report('typografie-math-rendered',{body:state.body,example:state.example});
      }catch(_){
        status.textContent='Die lokale Formelprobe konnte nicht gesetzt werden. Der TeX-Ausdruck bleibt lesbar.';
        sample.setAttribute('aria-busy','false');height();report('typografie-math-error');
      }
    });
    return queue;
  }
  window.MathJax={
    loader:{paths:{[fontName]:base,fonts:new URL('fonts/mathjax/',location.href).href}},
    output:{...(state.font==='newcm'?{}:{font:fontName}),displayOverflow:'scroll'},
    chtml:{fontURL:base+'/chtml/woff2',dynamicPrefix:base+'/chtml/dynamic',matchFontHeight:false},
    tex:{inlineMath:[['\\(','\\)']],displayMath:[['\\[','\\]']]},
    options:{enableEnrichment:false,enableSpeech:false,enableBraille:false,enableExplorer:false,menuOptions:{settings:{enrich:false,speech:false,braille:false,assistiveMml:true}}},
    startup:{typeset:false,pageReady(){
      requestAnimationFrame(()=>{report('typografie-math-ready');render();});
      return Promise.resolve();
    }}
  };
  addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='typografie-math-settings')return;
    state=C.settings({font:state.font,body:event.data.body,example:event.data.example});render();
  });
  addEventListener('DOMContentLoaded',()=>{
    if(window.ResizeObserver)new ResizeObserver(height).observe(document.body);
    height();
  });
  addEventListener('error',event=>{
    if(event.target?.tagName!=='SCRIPT')return;
    const status=document.getElementById('pair-status');
    if(status)status.textContent='Der lokale Formelsatz konnte nicht geladen werden. Bitte lade die Seite erneut.';
    report('typografie-math-error');
  },true);
})();
