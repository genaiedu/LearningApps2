(function(){
  'use strict';
  const C=window.Schriftenraum,$=id=>document.getElementById(id),stage=$('font-space-stage');
  if(!C||!stage)return;
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const svg=(tag,attrs)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
  let yaw=-.64,pitch=-.4,layer='all',selected='serif-static-low',outlines=null,request=0;
  const initialAnchor=['#strichkontrast','#strichabschluesse','#schriftenraum'].includes(location.hash)?location.hash.slice(1):null;
  let userMoved=false;
  if(initialAnchor)['pointerdown','wheel','keydown','touchstart'].forEach(type=>addEventListener(type,()=>{userMoved=true;},{once:true,passive:true}));
  const nodes=new Map(),rows=new Map(),edges=[];
  C.cells.forEach(c=>{
    const button=el('button','space-node');button.type='button';button.dataset.cell=c.id;
    button.append(el('span','space-word'),el('span','space-name'),el('span','space-terminal'));
    button.addEventListener('click',()=>{selected=c.id;renderSelection();renderDetail();focusDetail();});
    $('font-space-nodes').append(button);nodes.set(c.id,button);
  });
  C.cells.forEach((a,i)=>C.cells.slice(i+1).forEach(b=>{
    if(!C.adjacent(a,b))return;
    const axis=a.serif!==b.serif?'serif':a.contrast!==b.contrast?'contrast':'dynamic';
    const line=svg('line',{class:'space-edge space-edge-'+axis});$('font-space-wire').append(line);edges.push({a,b,line});
  }));
  C.fields.forEach(f=>{
    const c=C.cells.find(c=>c.id===f.cell),s=f.specimen&&C.specimens[f.specimen];
    const row=el('article','space-field');row.dataset.field=f.cell+'-'+f.layer;
    row.append(el('span','feature-caption',C.labels(c).join(' · ')),el('h5','',f.layer==='quer'?'Quer geschnitten':'Schräg geschnitten'));
    const button=el('button','space-field-button');button.type='button';
    if(s){const word=el('span','space-field-word','Form');word.style.fontFamily='"'+s.name+'"';button.append(word,el('span','',s.name+' · Detail: '+s.glyph));}
    else{button.append(el('span','space-open-label','Offenes Feld'),el('span','',C.empty));}
    button.setAttribute('aria-label',f.label+(s?' · '+s.name:' · '+C.empty));
    button.addEventListener('click',()=>{selected=c.id;setLayer(f.layer);focusDetail();});
    row.append(button);$('font-space-fields').append(row);rows.set(row.dataset.field,row);
  });
  function position(){
    stage.setAttribute('aria-label',matchMedia('(max-width: 600px)').matches?'Acht Schriftformfelder. Tab führt zu den Vergleichsproben.':'Drehbarer Schriftenwürfel. Pfeiltasten drehen, Tab führt zu den acht Vergleichsproben.');
    const w=stage.clientWidth,h=stage.clientHeight,scale=Math.min(w*.265,h*.275);
    const points=new Map(C.cells.map(c=>{const p=C.project(c,yaw,pitch);return[c.id,{x:w/2+p.x*scale,y:h/2+p.y*scale,z:p.z}];}));
    nodes.forEach((n,id)=>{const p=points.get(id);n.style.left=p.x+'px';n.style.top=p.y+'px';n.style.zIndex=String(Math.round((p.z+3)*10));});
    edges.forEach(({a,b,line})=>{const p=points.get(a.id),q=points.get(b.id);Object.entries({x1:p.x,y1:p.y,x2:q.x,y2:q.y}).forEach(([k,v])=>line.setAttribute(k,v));});
  }
  function renderSelection(){
    C.cells.forEach(c=>{
      const n=nodes.get(c.id),key=layer==='all'?c.base:c[layer],s=key&&C.specimens[key];
      n.classList.toggle('space-node-empty',!s);n.setAttribute('aria-pressed',String(c.id===selected));
      const word=n.querySelector('.space-word');word.textContent=s?'Form':'Offen';word.style.fontFamily=s?'"'+s.name+'"':'var(--sans)';
      n.querySelector('.space-name').textContent=s?s.name:'Kein belegtes Beispiel';
      n.querySelector('.space-terminal').textContent=s?(layer==='all'?'Gesamtform':'Detail: '+s.glyph):'Feld untersuchen';
      n.setAttribute('aria-label',C.labels(c).join(' · ')+(layer==='all'?'':layer==='quer'?' · quer geschnitten':' · schräg geschnitten')+' · '+(s?s.name:C.empty));
      n.title=n.getAttribute('aria-label');
    });
    rows.forEach((row,key)=>row.classList.toggle('space-field-selected',key===selected+'-'+layer));
    document.querySelectorAll('[data-space-layer]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.spaceLayer===layer)));
    $('font-space-status').textContent=layer==='all'?'Acht Formfelder. Wähle eine Schrift, um sie genauer zu betrachten.':(layer==='quer'?'Quer':'Schräg')+' geschnitten: Die Zuordnung bezieht sich ausschließlich auf die benannte Einzelkante. Offene Felder bleiben auswählbar.';
  }
  function setLayer(next){layer=next;renderSelection();renderDetail();}
  document.querySelectorAll('[data-space-layer]').forEach(n=>n.addEventListener('click',()=>setLayer(n.dataset.spaceLayer)));
  function drawOutline(target,family,character,edge,zoom=false){
    target.replaceChildren();const g=family.glyphs[character];if(!g)return;
    const [x0,y0,x1,y1]=g.bounds,width=x1-x0,height=y1-y0,pad=Math.max(width,height)*.12;
    let box=[x0-pad,-y1-pad,width+2*pad,height+2*pad];
    if(zoom&&edge){const [a,b,c,d]=edge,span=Math.max(Math.abs(c-a),Math.abs(d-b)),margin=span*.55;box=[Math.min(a,c)-margin,-Math.max(b,d)-margin,Math.abs(c-a)+margin*2,Math.abs(d-b)+margin*2];}
    target.setAttribute('viewBox',box.join(' '));
    target.append(svg('path',{d:g.path,transform:'scale(1,-1)',fill:'currentColor'}));
    if(edge){
      const [a,b,c,d]=edge,stroke=zoom?Math.max(Math.abs(c-a),Math.abs(d-b))*.018:Math.max(width,height)*.008;
      const reference=(Math.abs(c-a)>=Math.abs(d-b))?[a,-b,c,-b]:[a,-b,a,-d];
      target.append(svg('line',{x1:reference[0],y1:reference[1],x2:reference[2],y2:reference[3],class:'terminal-reference','stroke-width':stroke,'stroke-dasharray':stroke*3+' '+stroke*2}));
      target.append(svg('line',{x1:a,y1:-b,x2:c,y2:-d,class:'terminal-edge','stroke-width':stroke,'stroke-linecap':'butt'}));
      [ [a,b],[c,d] ].forEach(([x,y])=>target.append(svg('circle',{cx:x,cy:-y,r:stroke*1.1,class:'terminal-endpoint'})));
    }
  }
  function renderGlyph(){
    const c=C.cells.find(c=>c.id===selected),key=layer==='all'?c.base:c[layer],s=key&&C.specimens[key];
    if(!s)return;
    const character=$('space-glyph').value,family=outlines&&outlines.find(f=>f.id===(s.fontId||key)),edge=character===s.glyph?s.edge:null;
    $('space-outline-loading').hidden=Boolean(family);$('space-outline-wrap').hidden=!family;
    $('space-terminal-zoom').hidden=!edge||!family;
    $('space-outline-wrap').classList.toggle('space-outline-single',!edge);
    $('space-glyph-note').textContent=character===s.glyph?s.note:'Freie Zeichenprobe. Für diesen Buchstaben wird keine konkrete Abschlusskante behauptet; wähle '+s.glyph+' für den belegten Vergleich.';
    if(family){drawOutline($('space-glyph-outline'),family,character,edge);if(edge)drawOutline($('space-terminal-outline'),family,character,edge,true);}
    $('space-edge-key').hidden=!edge;
  }
  function renderDetail(){
    const c=C.cells.find(c=>c.id===selected),key=layer==='all'?c.base:c[layer],s=key&&C.specimens[key];
    $('space-detail-kicker').textContent=C.labels(c).join(' · ')+(layer==='all'?'':' · '+(layer==='quer'?'quer':'schräg'));
    $('space-detail-heading').textContent=s?s.name:'Ein offenes Feld';
    $('space-cell-description').textContent=c.comment;
    $('space-empty').hidden=Boolean(s);$('space-empty').textContent=C.empty;
    $('space-detail-occupied').hidden=!s;
    if(!s)return;
    ['space-detail-form','space-detail-alphabet','space-detail-sentence'].forEach(id=>{$(id).style.fontFamily='"'+s.name+'"';});
    $('space-glyph').value=s.glyph;renderGlyph();
    const fontId=s.fontId||key,family=outlines&&outlines.find(f=>f.id===fontId);
    const source=$('space-font-source'),license=$('space-font-license'),download=$('space-font-download');
    source.href=family?family.fontProject:'https://github.com/google/fonts';
    license.href=family?family.licensePath:'#schrift-downloads';license.textContent=family?family.license:'Lizenz';
    download.href='fonts/typografie/'+fontId+'/'+fontId+'-desktop.zip';
  }
  $('space-glyph').addEventListener('change',renderGlyph);
  function focusDetail(){
    $('font-space-detail').scrollIntoView({block:'start',behavior:'instant'});
    $('space-detail-heading').focus({preventScroll:true});
  }
  $('space-podkova-link').addEventListener('click',()=>{selected='serif-static-low';setLayer('schraeg');focusDetail();});
  function rotate(dx,dy){yaw=C.normalize(yaw+dx);pitch=Math.max(-1.05,Math.min(1.05,pitch+dy));position();}
  document.querySelectorAll('[data-space-rotate]').forEach(n=>n.addEventListener('click',()=>{const [x,y]=n.dataset.spaceRotate.split(',').map(Number);rotate(x,y);}));
  $('space-reset').addEventListener('click',()=>{yaw=-.64;pitch=-.4;position();});
  stage.addEventListener('keydown',e=>{if(e.target!==stage)return;const moves={ArrowLeft:[-.16,0],ArrowRight:[.16,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};if(moves[e.key]){e.preventDefault();rotate(...moves[e.key]);}});
  let drag=null;
  stage.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.button!==0||matchMedia('(max-width: 600px)').matches)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);stage.classList.add('space-dragging');});
  stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;rotate((e.clientX-drag.x)*.006,(e.clientY-drag.y)*.006);drag.x=e.clientX;drag.y=e.clientY;});
  const endDrag=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;stage.classList.remove('space-dragging');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>stage.addEventListener(type,endDrag));
  const resize=()=>{cancelAnimationFrame(request);request=requestAnimationFrame(position);};
  new ResizeObserver(resize).observe(stage);
  renderSelection();renderDetail();position();
  fetch('data/typografie-schriftenraum.json',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{
    outlines=data.families;renderDetail();
    const pod=outlines.find(f=>f.id==='podkova'),rob=outlines.find(f=>f.id==='robotoslab');
    drawOutline($('terminal-podkova'),pod,'t',C.specimens.podkova.edge);
    drawOutline($('terminal-roboto'),rob,'t',C.specimens.robotoslab.edge);
    $('terminal-intro-loading').hidden=true;$('terminal-intro-proof').hidden=false;
  }).catch(()=>{
    $('space-outline-loading').textContent='Die Konturdaten konnten nicht geladen werden. Bitte die Seite neu laden; bis dahin steht keine verifizierte Detailzeichnung zur Verfügung.';
    $('terminal-intro-loading').textContent='Die Originalkonturen konnten nicht geladen werden. Der Textvergleich bleibt verfügbar.';
  });
  const families=[...new Set(Object.values(C.specimens).map(s=>s.name))];
  Promise.all(families.map(async name=>{try{return(await document.fonts.load('400 32px "'+name+'"','Form')).length>0;}catch{return false;}})).then(loaded=>{
    $('space-font-loading').textContent=loaded.every(Boolean)?'Alle Vergleichsschriften lokal geladen. Originalformen · Regular / Gewicht 400.':'Nicht alle lokalen Schriftdateien konnten geladen werden. Ersatzschriften sind kein verlässlicher Vergleich; bitte neu laden.';
    // Local font swapping can move a deep-link target. Align once after loading,
    // never after the reader has scrolled, typed or clicked.
    if(initialAnchor)document.fonts.ready.then(()=>requestAnimationFrame(()=>{if(!userMoved&&location.hash==='#'+initialAnchor)$(initialAnchor).scrollIntoView({block:'start',behavior:'instant'});}));
  });
})();
