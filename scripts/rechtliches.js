/* Eine Palette: Schiefergrau. Gemeinsame Hell-/Dunkelwahl für beide Rechtstexte. */
/* Symbole: Lucide, ISC; Lizenz: LearningApps/fonts/chess/LUCIDE-LICENSE.txt. */
(function(){
  'use strict';
  const key='learningapps2-legal-theme',root=document.documentElement;
  try{const saved=localStorage.getItem(key);if(saved==='light'||saved==='dark')root.dataset.theme=saved;}catch{}
  const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6.25 6.25 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>';
  const sun='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.getElementById('theme-toggle');
    function update(){const dark=root.dataset.theme==='dark';button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',dark?'Helle Darstellung einschalten':'Dunkle Darstellung einschalten');document.getElementById('theme-icon').innerHTML=dark?sun:moon;document.getElementById('theme-label').textContent=dark?'Hell':'Dunkel';}
    button.hidden=false;update();
    button.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(key,root.dataset.theme);}catch{}update();});
    const contents=document.querySelector('.contents');if(contents)contents.open=matchMedia('(min-width: 900px)').matches;
    window.addEventListener('storage',e=>{if(e.key===key&&(e.newValue==='light'||e.newValue==='dark')){root.dataset.theme=e.newValue;update();}});
  });
})();
