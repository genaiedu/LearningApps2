/* Editorial font portraits. All type specimens use the existing local fonts. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 let data=null,byId=new Map(),active=null,trail=[],opener=null,openingRect=null,motion=null;
 const dialog=el('dialog','font-portrait-dialog');dialog.id='font-portrait-dialog';dialog.setAttribute('aria-labelledby','font-portrait-title');
 const shell=el('div','font-portrait-shell'),tools=el('div','font-portrait-tools'),back=el('button',null,'← Zur vorigen Schrift'),close=el('button',null,'Schließen ×'),content=el('div','font-portrait-content');
 back.type=close.type='button';back.hidden=true;tools.append(back,close);shell.append(tools,content);dialog.append(shell);document.body.append(dialog);
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-paused');
 function font(n,f,weight=400){n.style.fontFamily='"'+f.name+'", '+(f.group==='serif'?'serif':'sans-serif');n.style.fontWeight=String(window.TypoCore?.fontWeight?.(f,weight)||weight);n.style.fontSynthesis='none';return n;}
 function link(f,label){const a=el('a','font-portrait-source',label);a.href=f.portrait.source;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function partnerButton(id,role,reason){const f=byId.get(id),button=el('button','font-partner');button.type='button';button.dataset.fontOpen=id;button.setAttribute('aria-haspopup','dialog');button.append(font(el('strong',null,f.name),f),el('span','font-partner-role',role));if(reason)button.append(el('span','font-partner-reason',reason));button.onclick=()=>open(id);return button;}
 function block(title,text){const section=el('section','font-portrait-block');section.append(el('h3',null,title),el('p',null,text));return section;}
 function fill(id){
  const f=byId.get(id);active=id;const p=f.portrait;content.replaceChildren();
  content.append(el('p','eyebrow',f.classification+' · '+f.designer));const h=font(el('h2',null,f.name),f);h.id='font-portrait-title';content.append(h);
  const specimen=font(el('p','font-portrait-specimen font-sample',$('specimen-input').value||'Lesen heißt weiterdenken.'),f);content.append(specimen);
  content.append(el('p','font-portrait-character',p.character));
  const grid=el('div','font-portrait-reading');grid.append(block('Geschichte & Herkunft',p.history),block('Welche Aufgabe passt?',p.use),block('Bewusst einsetzen',p.caution));content.append(grid);
  const heading=el('h3',null,'Gute Partner, klare Rollen');content.append(heading,el('p','small','Unsere Vorschläge: Formkontrast und Hierarchie prüfen, nicht möglichst viele Schriften sammeln. Jede Partnerin lässt sich hier direkt öffnen.'));
  const partners=el('div','font-partners');for(const pair of p.pairings)partners.append(partnerButton(pair.id,pair.role,pair.reason));content.append(partners);
  const foot=el('div','font-portrait-links');foot.append(link(f,'Herkunft nachlesen · offizielles Fontprojekt ↗'));const download=el('a','font-google-download');window.TypoFontLinks.link(download,f.name);foot.append(download);const licence=el('a',null,'Lizenz · '+f.license);licence.href=f.licensePath;foot.append(licence);content.append(foot,el('p','small font-portrait-note','Geschichte nach den verlinkten Fontprojekten; Einsatz- und Paarungshinweise sind Empfehlungen des Ateliers.'));
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
  for(const f of list){const card=el('article','font-card font-portrait-card'),button=el('button','font-portrait-trigger');button.type='button';button.dataset.fontOpen=f.id;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',f.name+' · Schriftporträt öffnen');button.append(el('span','font-portrait-name',f.name),el('span','font-category',f.classification),font(el('span','font-sample',sample),f),el('span','font-advice',f.portrait.character),el('span','font-portrait-more','Geschichte, Einsatz & Partner ↗'));button.onclick=()=>open(f.id,button);card.append(button);$('font-grid').append(card);}
  if(!list.length)$('font-grid').append(el('p','small','Keine passende Schrift gefunden. Ändere den Suchbegriff oder die Schriftgruppe.'));
 }
 window.TypoFontPortraits={render};
})();
