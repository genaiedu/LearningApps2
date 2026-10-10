(function(){
  'use strict';
  const C=window.Schriftenraum,$=id=>document.getElementById(id),stage=$('font-space-stage');
  if(!C||!stage)return;
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const svg=(tag,attrs)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
  let view=C.defaultView(),selected=null,outlines=null;
  const initialAnchor=['#strichkontrast','#strichabschluesse','#schriftenraum','#font-space-stage'].includes(location.hash)?location.hash.slice(1):null;
  let userMoved=false;
  if(initialAnchor)['pointerdown','wheel','keydown','touchstart'].forEach(type=>addEventListener(type,()=>{userMoved=true;},{once:true,passive:true}));
  const rows=new Map();
  C.fields.forEach(f=>{
    const c=C.cells.find(c=>c.id===f.cell),s=f.specimen&&C.specimens[f.specimen];
    const row=el('article','space-field');row.dataset.field=f.cell+'-'+f.layer;
    row.append(el('span','feature-caption',C.labels(c).join(' · ')),el('h5','',f.layer==='quer'?'Quer geschnitten':'Schräg geschnitten'));
    const button=el('button','space-field-button');button.type='button';
    if(s){const word=el('span','space-field-word','Form');word.style.fontFamily='"'+s.name+'"';button.append(word,el('span','',s.name+' · Detail: '+s.glyph));}
    else{button.append(el('span','space-open-label','Offenes Feld'),el('span','',C.empty));}
    button.setAttribute('aria-label',f.label+(s?' · '+s.name:' · '+C.empty));
    button.addEventListener('click',()=>showField(c.id,f.layer));
    row.append(button);
    if(s){const download=el('a','space-field-download');window.TypoFontLinks.link(download,s.name);row.append(download);}
    $('font-space-fields').append(row);rows.set(row.dataset.field,row);
  });
  function renderFixed(){
    const target=$('space-fixed');target.replaceChildren();
    Object.entries(C.dimensions).filter(([key])=>key!==view.x&&key!==view.y).forEach(([key,d])=>{
      const label=el('label','',d.name),select=el('select');select.id='space-fixed-'+key;select.dataset.spaceFixed=key;
      const options=key==='terminal'?['all','quer','schraeg']:['false','true'];
      options.forEach(value=>{const option=el('option','',value==='all'?'Gesamtform · keine Abschlussauswahl':d.ends[value==='true'||value==='schraeg'?1:0]);option.value=value;select.append(option);});
      select.value=String(view.fixed[key]);
      select.addEventListener('change',()=>{view.fixed[key]=key==='terminal'?select.value:select.value==='true';clearDetail();renderPlot();});
      label.append(select);target.append(label);
    });
  }
  function clearDetail(){selected=null;$('font-space-detail').hidden=true;}
  function renderPlot(){
    const x=C.dimensions[view.x],y=C.dimensions[view.y],entries=C.quadrants(view),target=$('space-quadrants');
    $('space-x').value=view.x;$('space-y').value=view.y;
    $('space-x-name').textContent='x · '+x.name;$('space-y-name').textContent='y · '+y.name;
    $('space-x-low').textContent=x.ends[0];$('space-x-high').textContent=x.ends[1];
    $('space-y-low').textContent=y.ends[0];$('space-y-high').textContent=y.ends[1];
    stage.setAttribute('aria-label','Vierfeldervergleich: x = '+x.name+', y = '+y.name+'. Konstant: '+C.fixedLabels(view).join(' · '));
    target.replaceChildren();
    entries.forEach(entry=>{
      const s=entry.specimen,card=el('article','space-quadrant');card.dataset.field=entry.id;card.classList.toggle('space-quadrant-empty',!s);
      card.append(el('p','space-quadrant-label',entry.label));
      const button=el('button','space-quadrant-button');button.type='button';button.dataset.field=entry.id;
      button.setAttribute('aria-pressed',String(selected===entry.id));button.setAttribute('aria-controls','font-space-detail');
      button.setAttribute('aria-label',entry.label+' · '+(s?s.name+' · Schrift unter der Lupe':C.empty));
      if(s){
        const sample=el('span','space-quadrant-sample'),word=el('span','space-word','Form'),letters=el('span','space-letters','a g e t');
        sample.style.fontFamily='"'+s.name+'"';sample.append(word,letters);
        button.append(sample,el('span','space-name',s.name),el('span','space-terminal',entry.layer==='all'?'Gesamtform · unter der Lupe ↗':'Belegte Kante: '+s.glyph+' · Lupe ↗'));
      }else button.append(el('span','space-open-label','Offenes Feld'),el('span','space-quadrant-empty-note',C.empty));
      button.addEventListener('click',()=>{selected=entry.id;renderSelection();$('font-space-detail').hidden=false;renderDetail();focusDetail();});
      card.append(button);
      if(s){const download=el('a','space-quadrant-download');window.TypoFontLinks.link(download,s.name,'Google Fonts · Download ↗');card.append(download);}
      target.append(card);
    });
    renderSelection();
    const count=entries.filter(e=>e.specimen).length;
    const open=4-count;
    $('font-space-status').textContent='Vier Felder · '+count+(count===1?' belegtes Beispiel':' belegte Beispiele')+(open?' · '+open+(open===1?' offenes Feld':' offene Felder'):'')+'. Konstant: '+C.fixedLabels(view).join(' · ')+'.';
  }
  function renderSelection(){
    document.querySelectorAll('.space-quadrant-button').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.field===selected)));
    rows.forEach((row,key)=>row.classList.toggle('space-field-selected',key===selected));
  }
  for(const axis of ['x','y'])$('space-'+axis).addEventListener('change',()=>{view=C.changeAxis(view,axis,$('space-'+axis).value);clearDetail();renderFixed();renderPlot();});
  function selection(){
    const field=selected&&C.fields.find(f=>f.cell+'-'+f.layer===selected);
    const entry=C.quadrants(view).find(e=>e.id===selected);
    if(entry)return entry;
    if(!field)return null;
    const cell=C.cells.find(c=>c.id===field.cell),key=field.specimen;
    return {cell,layer:field.layer,key,specimen:key?C.specimens[key]:null};
  }
  function showField(cellId,layer){
    const cell=C.cells.find(c=>c.id===cellId);
    view=C.defaultView();view.fixed.contrast=cell.contrast;view.fixed.terminal=layer;
    selected=cellId+'-'+layer;renderFixed();renderPlot();$('font-space-detail').hidden=false;renderDetail();focusDetail();
  }
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
    const entry=selection();if(!entry)return;const {key,specimen:s}=entry;
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
    const entry=selection();if(!entry)return;const {cell:c,layer,key,specimen:s}=entry;
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
  $('space-podkova-link').addEventListener('click',()=>showField('serif-static-low','schraeg'));
  $('space-reset').addEventListener('click',()=>{view=C.defaultView();clearDetail();renderFixed();renderPlot();});
  renderFixed();renderPlot();
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
