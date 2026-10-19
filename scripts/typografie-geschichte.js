(function(){
  'use strict';
  const imageFiles=['griechisches-alphabet.jpg','trajan-inschrift.jpg','karolingische-minuskel.jpg','gutenberg-bibel.jpg','zeitung-linotype.jpg','computer-vt100.jpg'];
  const base='assets/typografie/geschichte/';
  function externalURL(value){
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
  }
  function resolution(value){const n=Number(value);return Number.isFinite(n)?Math.max(12,Math.min(64,Math.round(n))):16;}
  if(typeof module==='object'&&module.exports){module.exports={externalURL,resolution,imageFiles,base};return;}
  const external=document.getElementById('history-external-dialog');
  const open=document.getElementById('history-external-open');
  let acknowledged=false,pending=null,source=null;
  if(external&&open){
    document.addEventListener('click',event=>{
      const link=event.target.closest('a[data-history-external]')||event.target.closest('a[data-source-external]');
      if(!link)return;
      const url=externalURL(link.href);
      if(!url){event.preventDefault();return;}
      if(acknowledged)return;
      event.preventDefault();pending=url;source=link;open.href=url;
      document.getElementById('history-external-name').textContent=new URL(url).hostname;
      external.showModal();
    });
    open.addEventListener('click',event=>{
      if(!pending){event.preventDefault();return;}
      acknowledged=true;external.close(); // Preserve the native new-tab link action.
    });
    document.getElementById('history-external-cancel').addEventListener('click',()=>external.close());
    external.addEventListener('close',()=>{pending=null;source?.focus();source=null;});
  }
  const dialog=document.getElementById('history-image-dialog');
  if(dialog){
    const picture=document.getElementById('history-image-large');
    const caption=document.getElementById('history-image-caption');
    let trigger=null;
    document.addEventListener('click',event=>{
      const link=event.target.closest('a[data-history-image]');
      if(!link)return;
      const file=link.getAttribute('href');
      if(!imageFiles.some(name=>file===base+name))return;
      event.preventDefault();trigger=link;
      const small=link.querySelector('img');
      picture.src=file;picture.alt=small.alt;
      const original=link.closest('figure').querySelector('figcaption');
      caption.replaceChildren(...Array.from(original.childNodes,child=>child.cloneNode(true)));
      dialog.showModal();
    });
    document.getElementById('history-image-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{picture.removeAttribute('src');caption.replaceChildren();trigger?.focus();trigger=null;});
  }
  const canvas=document.getElementById('history-raster');
  const slider=document.getElementById('history-resolution');
  if(!canvas||!slider)return;
  const status=document.getElementById('history-raster-status');
  const ctx=canvas.getContext('2d');
  const buffer=document.createElement('canvas');
  const sample=buffer.getContext('2d');
  if(!ctx||!sample){status.textContent='Dieser Browser unterstützt das Rasterexperiment nicht.';return;}
  let fontReady=false;
  function render(){
    const n=resolution(slider.value);document.getElementById('history-resolution-value').textContent=n+' Pixel';
    if(!fontReady)return;
    const style=getComputedStyle(canvas);
    buffer.width=n;buffer.height=n;
    sample.clearRect(0,0,n,n);sample.fillStyle=style.color;sample.font='400 '+(n*.88)+'px "Fira Sans"';
    sample.textAlign='center';sample.fillText('a',n*.5,n*.75);
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(buffer,0,0,canvas.width,canvas.height);
    canvas.setAttribute('aria-label','Fira-Sans-a: Rasterhöhe '+n+' Pixel, stark vergrößert');
    status.textContent='Beide Proben: Fira Sans Regular, lokal geladen. Links '+n+' × '+n+' Bildpunkte.';
  }
  slider.addEventListener('input',render);
  const observer=new MutationObserver(render);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-palette','style']});
  if(document.fonts){document.fonts.load('400 88px "Fira Sans"','a').then(fonts=>{
    fontReady=fonts.length>0;if(fontReady)render();else status.textContent='Fira Sans konnte nicht geladen werden; keine Vergleichsprobe mit Ersatzschrift.';
  }).catch(()=>{status.textContent='Fira Sans konnte nicht geladen werden; bitte die Seite neu laden.';});}
  else{status.textContent='Dieser Browser kann die lokale Schrift für das Experiment nicht prüfen.';}
})();
