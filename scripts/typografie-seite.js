/* Part II: original page studies. No remote fonts, images or persistent user data. */
(function(){
  'use strict';
  const P=window.TypoPage,C=window.TypoCore;if(!P||!C)return;
  const $=id=>document.getElementById(id),byId=id=>P.studies.find(s=>s.id===id);
  const base='downloads/typografie/seitenstudien/';
  const link=(id,type)=>{const a=document.createElement('a');a.href=base+id+'.'+type;a.download='';a.textContent=type.toUpperCase()+' ↓';a.setAttribute('aria-label',byId(id).title+' als '+type.toUpperCase()+' herunterladen');return a;};
  function downloads(id,target){target.replaceChildren(link(id,'pdf'),link(id,'svg'));}
  function render(target,page){target.innerHTML=P.svg(page);}
  const modal=$('page-study-dialog');let lastFocus=null;
  function enlarge(page,study){lastFocus=document.activeElement;$('page-study-dialog-title').textContent=study.title;render($('page-study-dialog-proof'),page);$('page-study-dialog-note').textContent=study.note;downloads(study.id,$('page-study-dialog-downloads'));modal.showModal();$('page-study-dialog-close').focus();}
  $('page-study-dialog-close').addEventListener('click',()=>modal.close());modal.addEventListener('close',()=>lastFocus?.focus());
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
  function figure(study,compact=false){
    const f=document.createElement('figure');f.className=compact?'page-study-card':'page-live';
    const b=document.createElement('button');b.type='button';b.className='page-preview-button';b.setAttribute('aria-label',study.title+' groß ansehen');
    const proof=document.createElement('div');proof.className='page-proof';render(proof,P.scene(study));b.append(proof);b.addEventListener('click',()=>enlarge(P.scene(study),study));f.append(b);
    const caption=document.createElement('figcaption');const name=document.createElement('h4');name.textContent=study.title;caption.append(name);const p=document.createElement('p');p.textContent=study.note;caption.append(p);f.append(caption);
    const d=document.createElement('div');d.className='page-downloads';downloads(study.id,d);f.append(d);return f;
  }
  document.querySelectorAll('[data-page-pair]').forEach(el=>el.dataset.pagePair.split(',').forEach(id=>el.append(figure(byId(id)))));
  document.querySelectorAll('[data-page-study]').forEach(el=>{const study=byId(el.dataset.pageStudy);render(el,P.scene(study));const b=document.createElement('button');b.type='button';b.textContent='Banderole groß ansehen ↗';b.addEventListener('click',()=>enlarge(P.scene(study),study));el.after(b);});
  let directionPage;
  function direction(){const study=byId($('page-direction').value),adjustable=['skew','rotate'].includes(study.mode);$('page-angle').disabled=!adjustable;$('page-direction-guides').disabled=!adjustable;const angle=Number($('page-angle').value);$('page-angle-value').textContent=angle+'°';directionPage=P.scene(study,{angle,guides:$('page-direction-guides').checked});render($('page-direction-proof'),directionPage);$('page-direction-caption').textContent=study.note;downloads(study.id,$('page-direction-downloads'));}
  ['page-direction','page-angle','page-direction-guides'].forEach(id=>$(id).addEventListener('input',direction));
  $('page-direction-reset').addEventListener('click',()=>{$('page-direction').value='01-leseseite';$('page-angle').value=-14;$('page-direction-guides').checked=true;direction();});
  $('page-direction-enlarge').addEventListener('click',()=>enlarge(directionPage,byId($('page-direction').value)));direction();
  let colorPage;
  function defaultColors(){const s=P.scene(byId($('page-color-preset').value));$('page-foreground').value=s.foreground;$('page-background').value=s.background;}
  function color(){
    const study=byId($('page-color-preset').value),fg=$('page-foreground').value,bg=$('page-background').value;
    colorPage=P.scene(study,{foreground:fg,background:bg,gray:$('page-grayscale').checked});render($('page-color-proof'),colorPage);$('page-color-caption').textContent=study.note;
    const ratio=C.contrast(fg,bg),report=$('page-contrast');report.replaceChildren();
    const b=document.createElement('b');b.textContent=ratio.toLocaleString('de-DE',{maximumFractionDigits:2})+':1 · Lesetext';report.append(b);
    const p=document.createElement('p');p.textContent=ratio>=4.5?'✓ Farbminimum für normalen Webtext erreicht.':ratio>=3?'△ Nur das Farbminimum für große Webschrift erreicht; für normalen Lesetext zu wenig.':'✕ Auch für große Webschrift zu wenig Helligkeitskontrast.';report.append(p);report.dataset.state=ratio>=4.5?'pass':'warning';
    if(study.mode==='colored'||study.mode==='field'){
      const t=document.createElement('p'),r=study.mode==='colored'?C.contrast(P.colors.red,bg):C.contrast(P.colors.paper,P.colors.blue);
      t.textContent='Titel'+(study.mode==='field'?' im festen blauen Feld':' in festem Ziegelrot')+': '+r.toLocaleString('de-DE',{maximumFractionDigits:2})+':1 · '+(r>=4.5?'auch für normalen Webtext ausreichend.':r>=3?'nur für große Webschrift ausreichend.':'zu wenig Kontrast.');report.append(t);
    }
  }
  $('page-color-preset').addEventListener('input',()=>{defaultColors();color();});['page-foreground','page-background','page-grayscale'].forEach(id=>$(id).addEventListener('input',color));
  $('page-color-reset').addEventListener('click',()=>{$('page-color-preset').value='07-positiv';$('page-grayscale').checked=false;defaultColors();color();});
  $('page-color-enlarge').addEventListener('click',()=>enlarge(colorPage,byId($('page-color-preset').value)));defaultColors();color();
  let layoutId='13-mittelsymmetrie',layoutPage;
  const layoutOptions=$('page-layout-options');P.studies.filter(s=>s.group==='raum').forEach(s=>{const b=document.createElement('button');b.type='button';b.dataset.layout=s.id;b.textContent=s.title;b.addEventListener('click',()=>{layoutId=s.id;composition();});layoutOptions.append(b);});
  function composition(){const study=byId(layoutId);layoutPage=P.scene(study,{guides:$('page-composition-guides').checked});render($('page-composition-proof'),layoutPage);$('page-composition-caption').textContent=study.note;$('page-composition-note').textContent=study.task;layoutOptions.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layoutId)));}
  $('page-composition-guides').addEventListener('input',composition);$('page-composition-reset').addEventListener('click',()=>{layoutId='13-mittelsymmetrie';$('page-composition-guides').checked=true;composition();});$('page-composition-enlarge').addEventListener('click',()=>enlarge(layoutPage,byId(layoutId)));composition();
  function gallery(filter='all'){const el=$('page-study-gallery');el.replaceChildren();const studies=P.studies.filter(s=>filter==='all'||s.group===filter);studies.forEach(s=>el.append(figure(s,true)));$('page-gallery-status').textContent=studies.length+' Studien angezeigt. Die Vorschaubilder öffnen die große Ansicht.';document.querySelectorAll('[data-study-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studyFilter===filter)));}
  document.querySelectorAll('[data-study-filter]').forEach(b=>b.addEventListener('click',()=>gallery(b.dataset.studyFilter)));gallery();
})();
