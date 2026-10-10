(function(){
  'use strict';
  const C=window.Schriftenraum,$=id=>document.getElementById(id),stage=$('font-space-stage');
  if(!C||!stage)return;
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const svg=(tag,attrs)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
  const initialRotation=()=>C.multiply(C.axisAngle([1,0,0],-.3),C.axisAngle([0,1,0],-.48));
  let rotation=initialRotation(),flat=false,layer='all',selected='serif-static-low',outlines=null,request=0;
  const initialAnchor=['#strichkontrast','#strichabschluesse','#schriftenraum','#font-space-stage'].includes(location.hash)?location.hash.slice(1):null;
  let userMoved=false;
  if(initialAnchor)['pointerdown','wheel','keydown','touchstart'].forEach(type=>addEventListener(type,()=>{userMoved=true;},{once:true,passive:true}));
  const nodes=new Map(),planes=new Map(),downloads=new Map(),rows=new Map();
  C.cells.forEach(c=>{
    const plane=el('article','space-face');plane.dataset.cell=c.id;plane.classList.toggle('space-face-down',!c.contrast);
    const button=el('button','space-node');button.type='button';button.dataset.cell=c.id;
    const copy=el('span','space-face-copy');copy.append(el('span','space-word'),el('span','space-name'),el('span','space-terminal'));
    const border=svg('svg',{viewBox:'0 0 100 100',preserveAspectRatio:'none',class:'space-face-border','aria-hidden':'true'});
    border.append(svg('polygon',{points:c.contrast?'50,0 100,100 0,100':'0,0 100,0 50,100'}));button.append(border,copy);
    button.addEventListener('click',()=>{if(performance.now()<suppressClickUntil)return;selected=c.id;renderSelection();renderDetail();focusDetail();});
    const download=el('a','space-flat-download');plane.append(button,download);
    $('font-space-solid').append(plane);nodes.set(c.id,button);planes.set(c.id,plane);downloads.set(c.id,download);
  });
  C.fields.forEach(f=>{
    const c=C.cells.find(c=>c.id===f.cell),s=f.specimen&&C.specimens[f.specimen];
    const row=el('article','space-field');row.dataset.field=f.cell+'-'+f.layer;
    row.append(el('span','feature-caption',C.labels(c).join(' · ')),el('h5','',f.layer==='quer'?'Quer geschnitten':'Schräg geschnitten'));
    const button=el('button','space-field-button');button.type='button';
    if(s){const word=el('span','space-field-word','Form');word.style.fontFamily='"'+s.name+'"';button.append(word,el('span','',s.name+' · Detail: '+s.glyph));}
    else{button.append(el('span','space-open-label','Offenes Feld'),el('span','',C.empty));}
    button.setAttribute('aria-label',f.label+(s?' · '+s.name:' · '+C.empty));
    button.addEventListener('click',()=>{selected=c.id;setLayer(f.layer);focusDetail();});
    row.append(button);
    if(s){const download=el('a','space-field-download');window.TypoFontLinks.link(download,s.name);row.append(download);}
    $('font-space-fields').append(row);rows.set(row.dataset.field,row);
  });
  function position(){
    if(flat){nodes.forEach(n=>{n.tabIndex=0;n.removeAttribute('aria-hidden');});return;}
    const radius=Math.min(stage.clientWidth*.45,stage.clientHeight*.385),distance=radius*6;
    stage.style.perspective=distance+'px';
    stage.style.setProperty('--face-word-size',Math.max(26,radius*.20)+'px');
    stage.style.setProperty('--face-name-size',Math.max(12,radius*.063)+'px');
    stage.style.setProperty('--face-note-size',Math.max(10,radius*.045)+'px');
    $('font-space-solid').style.transform='matrix3d('+C.rotationMatrix(rotation).join(',')+')';
    C.cells.forEach(c=>{
      const f=C.faceFrame(c,radius),plane=planes.get(c.id),node=nodes.get(c.id);
      plane.style.width=f.width+'px';plane.style.height=f.height+'px';
      plane.style.transform='matrix3d('+[...f.u,0,...f.v,0,...f.normal,0,...f.origin,1].join(',')+')';
      const normal=C.rotatePoint(f.normal,rotation),center=C.rotatePoint(f.center,rotation);
      const front=normal[2]*distance-C.dot(normal,center)>0;
      plane.classList.toggle('space-face-back',!front);
      node.tabIndex=front?0:-1;node.setAttribute('aria-hidden',String(!front));
      const light=.5+.5*C.dot(normal,[-.35,-.4,.846]);
      plane.style.setProperty('--face-alpha',String(front?.22+light*.22:.1));
    });
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
      const download=downloads.get(c.id);download.hidden=!s;if(s)window.TypoFontLinks.link(download,s.name);
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
    window.TypoFontLinks.link(download,s.name);
  }
  $('space-glyph').addEventListener('change',renderGlyph);
  function focusDetail(){
    $('font-space-detail').scrollIntoView({block:'start',behavior:'instant'});
    $('space-detail-heading').focus({preventScroll:true});
  }
  $('space-podkova-link').addEventListener('click',()=>{selected='serif-static-low';setLayer('schraeg');focusDetail();});
  $('space-reset').addEventListener('click',()=>{rotation=initialRotation();position();});
  $('space-flat-toggle').addEventListener('click',()=>{
    flat=!flat;stage.classList.toggle('space-flat',flat);
    $('space-flat-toggle').setAttribute('aria-pressed',String(flat));
    $('space-flat-toggle').textContent=flat?'Zum Oktaeder':'Flache Ansicht';
    stage.setAttribute('aria-label',flat?'Acht Schriftproben mit Google-Fonts-Links.':'Frei drehbarer Schriftenoktaeder. Zum Drehen ziehen oder wischen; eine Fläche anklicken für die Originalkonturen.');
    position();
  });
  let drag=null,suppressClickUntil=0;
  const ball=(x,y)=>{const r=stage.getBoundingClientRect();return C.trackball(x-r.left-r.width/2,y-r.top-r.height*.48,Math.min(r.width,r.height)*.46);};
  stage.addEventListener('pointerdown',e=>{
    if(flat||drag||e.button!==0)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:ball(e.clientX,e.clientY),rotation:[...rotation],moved:false};
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;
    if(!drag.moved){drag.moved=true;stage.setPointerCapture(e.pointerId);stage.classList.add('space-dragging');}
    rotation=C.multiply(C.turnBetween(drag.start,ball(e.clientX,e.clientY)),drag.rotation);
    cancelAnimationFrame(request);request=requestAnimationFrame(position);
  });
  const endDrag=e=>{if(!drag||e.pointerId!==drag.id)return;if(drag.moved)suppressClickUntil=performance.now()+250;drag=null;stage.classList.remove('space-dragging');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);};
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
