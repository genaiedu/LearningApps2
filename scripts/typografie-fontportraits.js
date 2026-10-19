/* Editorial font portraits. All type specimens use the existing local fonts. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 let data=null,byId=new Map(),active=null,trail=[],opener=null,openingRect=null,motion=null;
 const dialog=el('dialog','font-portrait-dialog');dialog.id='font-portrait-dialog';dialog.setAttribute('aria-labelledby','font-portrait-title');
 const shell=el('div','font-portrait-shell'),tools=el('div','font-portrait-tools'),back=el('button',null,'← Zur vorigen Schrift'),close=el('button',null,'Schließen ×'),content=el('div','font-portrait-content');
 back.type=close.type='button';back.hidden=true;tools.append(back,close);shell.append(tools,content);dialog.append(shell);document.body.append(dialog);
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-paused');
 function font(n,f,weight=400){n.style.fontFamily='"'+f.name+'", '+(f.group==='serif'?'serif':'sans-serif');n.style.fontWeight=String(window.TypoCore?.fontWeight?.(f,weight)||weight);n.style.fontSynthesis='none';return n;}
 const weightNames={100:'Thin',200:'Extra Light',300:'Light',400:'Regular',500:'Medium',600:'Semibold',700:'Bold',800:'Extra Bold',900:'Black',1000:'Extra Black'};
 function weights(f,style){const result=new Set();for(const file of f.files.filter(r=>r.style===style)){if(Array.isArray(file.weight)){for(let w=Math.ceil(file.weight[0]/100)*100;w<=file.weight[1];w+=100)result.add(w);}else result.add(file.weight);}return [...result].sort((a,b)=>a-b);}
 function proof(f,text,style='normal',weight=400,compact=false){const wrap=el('div',compact?'font-proof font-proof-compact':'font-proof'),label=el('span','font-proof-label',(weightNames[weight]||weight)+(style==='italic'?' · Kursiv':' · Aufrecht'));const sample=font(el('span',compact?'font-sample':'font-portrait-specimen font-sample',text),f,weight);sample.style.fontStyle=style;wrap.append(label,sample);return wrap;}
 function specimens(f,text){const root=el('section','font-cut-overview'),primary=el('div','font-cut-primary'),normal=weights(f,'normal'),italic=weights(f,'italic'),regular=normal.includes(400)?400:normal[0];primary.append(proof(f,text,'normal',regular));if(italic.length)primary.append(proof(f,text,'italic',italic.includes(400)?400:italic[0]));root.append(primary);const extra=[];for(const [style,list] of [['normal',normal],['italic',italic]])for(const w of list)if(w!==(style==='normal'?regular:(italic.includes(400)?400:italic[0])))extra.push([style,w]);if(extra.length){const details=el('details','font-cut-details');details.append(el('summary',null,'Weitere Schnitte ansehen ('+extra.length+')'));const grid=el('div','font-cut-grid');for(const [style,w]of extra)grid.append(proof(f,text,style,w));details.append(grid);root.append(details);}return root;}
 function link(f,label){const a=el('a','font-portrait-source',label);a.href=f.portrait.source;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function partnerButton(id,role,reason){const f=byId.get(id),button=el('button','font-partner');button.type='button';button.dataset.fontOpen=id;button.setAttribute('aria-haspopup','dialog');button.append(font(el('strong',null,f.name),f),el('span','font-partner-role',role));if(reason)button.append(el('span','font-partner-reason',reason));button.onclick=()=>open(id);return button;}
 function block(title,text){const section=el('section','font-portrait-block');section.append(el('h3',null,title),el('p',null,text));return section;}
 function fill(id){
  const f=byId.get(id);active=id;const p=f.portrait;content.replaceChildren();
  content.append(el('p','eyebrow',f.classification+' · '+f.designer));const h=font(el('h2',null,f.name),f);h.id='font-portrait-title';content.append(h);
  content.append(specimens(f,$('specimen-input').value||'Lesen heißt weiterdenken.'));
  content.append(el('p','font-portrait-character',p.character));
  if(window.TypoSchool&&f.files.every(file=>file.coverage)){
   const file=window.TypoSchool.referenceFile(f),section=el('section','font-coverage-summary');section.append(el('h3',null,'Zeichenabdeckung dieser lokalen Fassung'));
   const groups=Object.entries(file.coverage.testMissing),complete=groups.filter(([,missing])=>!missing).map(([label])=>label),missing=groups.filter(([,chars])=>chars);
   section.append(el('p',null,'Vollständige Proben im aufrechten Referenzschnitt: '+(complete.join(', ')||'keine der sechs Proben')+'. Keine Zusage für alle Zeichen dieser Sprachen.'));
   for(const [label,chars]of missing)section.append(el('p','small',label+': nicht enthalten '+chars+'.'));
   if(f.files.some(other=>JSON.stringify(other.coverage.testMissing)!==JSON.stringify(file.coverage.testMissing)))section.append(el('p','small','Die Zeichenvorräte der Schnitte unterscheiden sich. Den gewünschten Schnitt einzeln prüfen.'));
   const check=el('a',null,'Eigene erfundene Namensprobe prüfen →');check.href='#namen-werkstatt';check.onclick=()=>dialog.close();section.append(check);content.append(section);
  }
  const grid=el('div','font-portrait-reading');grid.append(block('Geschichte & Herkunft',p.history),block('Welche Aufgabe passt?',p.use),block('Bewusst einsetzen',p.caution));content.append(grid);
  const heading=el('h3',null,'Gute Partner, klare Rollen');content.append(heading,el('p','small','Unsere Beispielpaare zeigen Formkontrast und klare Aufgaben, nicht möglichst viele Schriften. Jede Partnerin lässt sich hier direkt öffnen.'));
  const partners=el('div','font-partners');for(const pair of p.pairings)partners.append(partnerButton(pair.id,pair.role,pair.reason));content.append(partners);
  const foot=el('div','font-portrait-links');foot.append(link(f,'Herkunft nachlesen · offizielles Fontprojekt ↗'));const download=el('a','font-google-download');window.TypoFontLinks.link(download,f.name);foot.append(download);const licence=el('a',null,'Lizenz · '+f.license);licence.href=f.licensePath;foot.append(licence);content.append(foot,el('p','small font-portrait-note','Geschichte nach den verlinkten Fontprojekten; Einsatz- und Paarungshinweise erläutern unsere Gestaltungsbeispiele.'));
  back.hidden=!trail.length;dialog.scrollTop=0;
 }
 function open(id,button){
  if(!byId.has(id))return;
  motion?.cancel();
  if(dialog.open){if(active===id)return;trail.push(active);fill(id);if(!reduced())content.animate?.([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});close.focus({preventScroll:true});return;}
  trail=[];opener=button||document.activeElement;openingRect=opener?.getBoundingClientRect();fill(id);dialog.showModal();document.documentElement.classList.add('font-portrait-open');close.focus({preventScroll:true});
  if(!reduced()&&openingRect&&shell.animate){const r=shell.getBoundingClientRect(),x=openingRect.left+openingRect.width/2-r.left-r.width/2,y=openingRect.top+openingRect.height/2-r.top-r.height/2,sx=Math.max(.12,openingRect.width/r.width),sy=Math.max(.12,Math.min(1,openingRect.height/r.height));motion=shell.animate([{transform:`translate(${x}px,${y}px) scale(${sx},${sy})`,opacity:.3},{transform:'translate(0,0) scale(1,1)',opacity:1}],{duration:360,easing:'cubic-bezier(.2,.75,.2,1)'});}
 }
 close.onclick=()=>dialog.close();back.onclick=()=>{const id=trail.pop();if(id)fill(id);};dialog.addEventListener('close',()=>{motion?.cancel();document.documentElement.classList.remove('font-portrait-open');(opener?.isConnected?opener:$('font-search')).focus({preventScroll:true});active=null;trail=[];});dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 function combinations(){
  const root=$('font-combinations');root.replaceChildren();root.append(el('p','eyebrow','Wenige Mittel · deutliche Aufgaben'),el('h3','font-combinations-title','Schriften im Zusammenspiel'),el('p','font-combinations-intro',data.portraitNote));
  const grid=el('div','font-combination-grid');for(const c of data.combinations){
   const card=el('article','font-combination'),spec=el('div','font-combination-proof');spec.append(font(el('p','font-combination-kicker',c.context),byId.get(c.accent),600),font(el('h4',null,c.sample),byId.get(c.heading),600),font(el('p','font-combination-body','Gute Gestaltung hilft dem Gedanken. Eine klare Rangordnung führt durch den Text; genügend Raum lässt die einzelnen Stimmen wirken.'),byId.get(c.body)),font(el('p','font-combination-caption','Notizen zur Gestaltung · Atelier 01'),byId.get(c.accent)));
   card.append(spec,el('h4','font-combination-name',c.title),el('p',null,c.why),el('p','small',c.tip));const roles=el('div','font-combination-roles');for(const [key,role]of [['heading','Titel'],['body','Lesetext'],['accent','Angaben / Orientierung']])roles.append(partnerButton(c[key],role));card.append(roles);grid.append(card);
  }root.append(grid);
 }
 function render(catalogue,options){
  if(data!==catalogue){data=catalogue;byId=new Map(data.families.map(f=>[f.id,f]));combinations();}
  const {term='',group='all',sample='Lesen heißt weiterdenken.'}=options,list=data.families.filter(f=>(group==='all'||f.group===group)&&[f.name,f.designer,f.classification,f.advice,f.portrait.history,f.portrait.use].join(' ').toLocaleLowerCase('de').includes(term)).sort((a,b)=>a.name.localeCompare(b.name,'de',{sensitivity:'base',numeric:true}));
  $('font-grid').replaceChildren();$('catalog-status').textContent=list.length+' von '+data.families.length+' Schriftporträts · zum Öffnen anklicken';
  for(const f of list){const card=el('article','font-card font-portrait-card'),button=el('button','font-portrait-trigger');button.type='button';button.dataset.fontOpen=f.id;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',f.name+' · Schriftporträt öffnen');button.append(el('span','font-portrait-name',f.name),el('span','font-category',f.classification),proof(f,sample,'normal',weights(f,'normal').includes(400)?400:weights(f,'normal')[0],true),...(weights(f,'italic').length?[proof(f,sample,'italic',weights(f,'italic').includes(400)?400:weights(f,'italic')[0],true)]:[]),el('span','font-advice',f.portrait.character),el('span','font-portrait-more','Geschichte, Einsatz & Partner ↗'));button.onclick=()=>open(f.id,button);card.append(button);$('font-grid').append(card);}
  if(!list.length)$('font-grid').append(el('p','small','Keine passende Schrift gefunden. Ändere den Suchbegriff oder die Schriftgruppe.'));
 }
 window.TypoFontPortraits={render};
})();
