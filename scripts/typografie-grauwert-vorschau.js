/* A screen-only reading aid. It never enters the document's layout settings. */
(()=>{
  'use strict';
  const pages=document.getElementById('print-pages');
  if(pages){
    if(parent===window||new URLSearchParams(location.search).get('embedded')!=='1')return;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='grauwert-preview-toggle';toggle.textContent='Grauwert';toggle.setAttribute('aria-controls','print-pages');
    function apply(distant){pages.classList.toggle('grauwert-distance',distant);toggle.setAttribute('aria-pressed',String(distant));toggle.setAttribute('aria-label',distant?'Grauwert-Ansicht ausschalten: Text scharf zeigen':'Grauwert beurteilen: Druckseiten leicht unscharf zeigen');}
    toggle.addEventListener('click',()=>{const distant=!pages.classList.contains('grauwert-distance');apply(distant);parent.postMessage({type:'typography-grauwert-state',distant},location.origin);});
    document.querySelector('.reader-navigation')?.append(toggle);apply(false);
    addEventListener('message',event=>{
      if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='typography-grauwert')return;
      apply(event.data.distant===true);
    });
    return;
  }
  const stage=document.getElementById('longtext-stage');if(!stage)return;
  const node=(tag,cls,text)=>{const element=document.createElement(tag);if(cls)element.className=cls;if(text)element.textContent=text;return element;};
  const tools=node('div','longtext-grauwert-tools'),heading=node('h4','','Den Grauwert der Seite beurteilen'),group=node('div','longtext-grauwert-buttons'),read=node('button','','Lesen'),distance=node('button','','Blick aus der Entfernung'),note=node('p','','Die Grauwert-Ansicht steht bereit, sobald die Druckseiten gesetzt sind.');
  tools.id='longtext-grauwert';heading.id='longtext-grauwert-title';note.id='longtext-grauwert-note';note.setAttribute('role','status');
  group.setAttribute('role','group');group.setAttribute('aria-labelledby',heading.id);
  for(const [button,id,pressed] of [[read,'longtext-grauwert-read',true],[distance,'longtext-grauwert-distance',false]]){button.id=id;button.type='button';button.disabled=true;button.setAttribute('aria-pressed',String(pressed));button.setAttribute('aria-controls',stage.id);}
  group.append(read,distance);tools.append(heading,group,note);stage.before(tools);
  let distant=false;
  const frame=()=>stage.querySelector('.longtext-print-frame');
  function send(){frame()?.contentWindow?.postMessage({type:'typography-grauwert',distant},location.origin);}
  function explain(){note.textContent=distant?
    'Die Druckseiten sind jetzt leicht unscharf: Achte auf helle Löcher, dunkle Flecken und den Zeilenrhythmus. Ein gleichmäßiger, ausgewogener Grauwert unterstützt ruhiges Lesen. Schrift und Umbruch bleiben unverändert; Druck und exportierte Dokumente bleiben scharf.':
    'Lies den Text oder wähle „Blick aus der Entfernung“, um die Verteilung von Zeichen und Zwischenräumen zu beurteilen. Die Unschärfe betrifft nur diese Vorschau, nicht den Druck oder exportierte Dokumente.';}
  function setView(value){distant=value;read.setAttribute('aria-pressed',String(!distant));distance.setAttribute('aria-pressed',String(distant));explain();send();}
  read.addEventListener('click',()=>setView(false));distance.addEventListener('click',()=>setView(true));
  addEventListener('message',event=>{
    if(!frame()||event.source!==frame().contentWindow||event.origin!==location.origin)return;
    if(event.data?.type==='typography-paginated'){read.disabled=distance.disabled=false;explain();send();}
    if(event.data?.type==='typography-ready')send();
    if(event.data?.type==='typography-grauwert-state'&&typeof event.data.distant==='boolean')setView(event.data.distant);
    if(event.data?.type==='typography-error'){read.disabled=distance.disabled=true;note.textContent='Die Grauwert-Ansicht benötigt fertig gesetzte Druckseiten. Stelle zunächst die Druckvorschau wieder her.';}
  });
  // A cached preview may finish before this optional enhancement loads.
  try{if(frame()?.contentDocument?.documentElement.dataset.ready==='true'){read.disabled=distance.disabled=false;explain();send();}}catch(_){}
})();
