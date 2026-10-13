(()=>{
  'use strict';
  const E=window.AcidEntry,C=window.AcidMission,M=window.AcidTypeset,$=id=>document.getElementById(id);
  const course=$('acid-simple'),switcher=$('acid-mode-switch'),KEY='protonen-mission-einstieg-v1';
  if(!course||!switcher||!E)return;
  const newSeed=()=>{const value=new Uint32Array(1);crypto.getRandomValues(value);return value[0];};
  let state,storageOK=true,rendered=false;
  try{state=E.restore(JSON.parse(localStorage.getItem(KEY)),newSeed());}catch{state=E.fresh(newSeed());}
  const fullSections=Array.from(document.querySelector('main').children).filter(el=>el!==course);
  const hiddenBefore=new Map(fullSections.map(el=>[el,el.hidden]));
  const fullIds=new Set(fullSections.flatMap(el=>[el.id,...Array.from(el.querySelectorAll('[id]'),child=>child.id)]));
  const fullPlayer=document.querySelector('.player'),fullReset=$('reset-open'),brand=document.querySelector('.brand'),skip=document.querySelector('.skip');
  const labHomes=['concept-lab','titration-lab'].map(id=>{
    const lab=$(id),home=document.createComment('Original position of '+id);lab.before(home);return {lab,home};
  });
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;}
    $('simple-storage-warning').hidden=storageOK;
  }
  function node(tag,className,text){
    const element=document.createElement(tag);if(className)element.className=className;
    if(text!==undefined){if(window.AcidNotation)window.AcidNotation.text(element,text);else element.textContent=text;}return element;
  }
  function entry(slot){return state.entries[slot]||(state.entries[slot]={seed:state.seed,value:'',hint:false,revealed:false,studied:false,solved:false,attempts:0});}
  function progress(){
    const entries=E.slots.map(({stem})=>entry(stem)),solved=entries.filter(e=>e.solved&&!e.studied).length,practised=entries.filter(e=>e.solved||e.studied).length;
    $('simple-progress').textContent=`${practised} / ${E.slots.length} geübt · ${solved} selbst gelöst`;
    $('simple-progress-bar').value=practised;$('simple-progress-bar').max=E.slots.length;
    $('simple-completion').textContent=practised===E.slots.length?'Du hast alle Einstiegsaufgaben bearbeitet. Wiederhole die Aufgaben mit Hilfen; danach wartet der Transfer in der ausführlichen Ansicht.':'Dein Fortschritt bleibt gespeichert. Du kannst jederzeit unterbrechen oder zur ausführlichen Ansicht wechseln.';
    for(const lesson of E.lessons){const count=lesson.stems.filter(stem=>entry(stem).solved||entry(stem).studied).length;$('simple-count-'+lesson.id).textContent=count+' / '+lesson.stems.length+' geübt';}
  }
  function answer(item){
    if(item.kind==='choice')return item.answer;
    const value=Number(item.answer.toPrecision(3)),text=value!==0&&Math.abs(value)<.001?value.toExponential(2).replace('.',','):value.toLocaleString('de-DE',{maximumSignificantDigits:3});
    return text+(item.unit&&!['pH','pOH','pK','Faktor','Verhältnis'].includes(item.unit)?' '+item.unit:'');
  }
  function renderCard(slot){
    const saved=entry(slot),item=E.task(slot,saved.seed),card=node('article','simple-task');card.id='simple-task-'+slot;
    const number=E.slots.findIndex(spec=>spec.stem===slot)+1;
    card.append(node('p','eyebrow','Übung '+String(number).padStart(2,'0')),node('h4',null,item.title),node('p',null,item.prompt));
    C.substances.filter(s=>s.structure&&item.prompt.includes(s.name)).forEach(s=>card.append(node('p','equation',s.structure)));
    const form=node('form'),label=node('label',null,item.kind==='choice'?'Deine Entscheidung':'Dein Ergebnis · '+item.unit),input=node(item.kind==='choice'?'select':'input');
    input.id='simple-input-'+slot;label.htmlFor=input.id;
    if(item.kind==='choice'){
      const empty=node('option',null,'Bitte auswählen …');empty.value='';input.append(empty);
      for(const value of item.options){const option=node('option',null,value);option.value=value;input.append(option);}
    }else{input.type='text';input.inputMode='decimal';input.autocomplete='off';input.spellcheck=false;input.placeholder='Zahl, auch z. B. 1,2e-3';}
    input.value=saved.value;label.append(input);form.append(label);
    const actions=node('div','simple-task-actions'),check=node('button','primary','Prüfen'),hint=node('button',null,'Hinweis'),reveal=node('button',null,'Lösungsweg'),variant=node('button',null,'Neue Variante');
    check.type='submit';hint.type=reveal.type=variant.type='button';actions.append(check,hint,reveal,variant);form.append(actions);
    const feedback=node('p','simple-feedback');feedback.id='simple-feedback-'+slot;feedback.setAttribute('role','status');input.setAttribute('aria-describedby',feedback.id);
    const hintText=node('p','simple-hint',item.hint);hintText.hidden=!saved.hint;
    const solution=node('section','simple-solution');solution.hidden=!saved.revealed;
    solution.append(node('h5',null,'Lösungsweg'),node('p','formula-key',item.symbols||'Vergleiche die Rollen der Teilchen und die passende Reaktion.'));
    if(item.math){const math=node('div','math');math.textContent=item.math;solution.append(math);}
    solution.append(node('strong',null,'Ergebnis: '+answer(item)),node('p',null,item.explanation));
    card.append(form,feedback,hintText,solution);
    function update(){
      input.disabled=check.disabled=saved.solved;card.classList.toggle('is-solved',saved.solved);card.classList.toggle('has-solution',saved.revealed);
      hint.setAttribute('aria-expanded',String(saved.hint));hint.setAttribute('aria-controls','simple-hint-'+slot);hintText.id='simple-hint-'+slot;
      reveal.setAttribute('aria-expanded',String(saved.revealed));reveal.setAttribute('aria-controls','simple-solution-'+slot);solution.id='simple-solution-'+slot;
      if(saved.solved)feedback.textContent='✓ Richtig. Du kannst den Lösungsweg vergleichen oder eine neue Variante üben.';
      else if(saved.revealed)feedback.textContent='Mit Lösungsweg geübt. Rechne selbst nach; du kannst weiterhin antworten.';
      else if(saved.attempts)feedback.textContent='Noch nicht richtig. Prüfe Ansatz und Einheiten; du hast weitere Versuche.';
      hintText.hidden=!saved.hint;solution.hidden=!saved.revealed;
      if(card.isConnected&&(saved.revealed||saved.hint))M.typeset([card]);
    }
    input.addEventListener('input',()=>{saved.value=input.value;save();});
    hint.onclick=()=>{saved.hint=!saved.hint;update();save();};
    reveal.onclick=()=>{saved.revealed=!saved.revealed;if(saved.revealed)saved.studied=true;update();progress();save();};
    form.onsubmit=event=>{
      event.preventDefault();if(saved.solved)return;
      if(!input.value||(item.kind==='number'&&!Number.isFinite(C.parseNumber(input.value)))){feedback.textContent='Gib zuerst eine gültige Zahl oder Auswahl ein. Dezimalkomma und e-Schreibweise sind möglich.';return;}
      saved.value=input.value;saved.attempts++;saved.solved=E.accepts(item,input.value);if(saved.solved)saved.revealed=true;update();progress();save();
    };
    variant.onclick=()=>{
      let seed=newSeed(),next=E.task(slot,seed);for(let attempt=0;attempt<8&&next.prompt===item.prompt;attempt++)next=E.task(slot,seed=newSeed());
      state.entries[slot]={seed,value:'',hint:false,revealed:false,studied:false,solved:false,attempts:0};
      // Clear MathJax's registration before replacing a previously typeset card.
      M.update(card,()=>{const replacement=renderCard(slot);card.replaceWith(replacement);replacement.querySelector('input,select').focus({preventScroll:true});});
      progress();save();
    };
    update();return card;
  }
  function render(){
    const svg=$('simple-curve-chart'),x=volume=>60+volume/50*600,y=pH=>255-pH/14*215;
    function shape(tag,attributes,text){const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);if(text!==undefined)element.textContent=text;svg.append(element);return element;}
    for(const pH of [0,2,4,6,8,10,12,14]){shape('line',{x1:60,x2:660,y1:y(pH),y2:y(pH),class:'curve-grid'});shape('text',{x:45,y:y(pH)+6,'text-anchor':'end'},pH);}
    for(const volume of [0,10,20,30,40,50]){shape('text',{x:x(volume),y:280,'text-anchor':'middle'},volume);}
    shape('text',{x:60,y:23},'pH');shape('text',{x:360,y:306,'text-anchor':'middle'},'Zugegebenes NaOH-Volumen / mL');
    for(const [volume,label] of [[12.5,'HÄP'],[25,'ÄP']]){shape('line',{x1:x(volume),x2:x(volume),y1:35,y2:255,class:'curve-guide-line'});shape('text',{x:x(volume),y:23,'text-anchor':'middle'},label);}
    for(const id of ['hcl','acetic']){
      const points=Array.from({length:251},(_,i)=>{const volume=i/5,pH=C.titration({id,c:.1,v:25,ct:.1,added:volume}).pH;return (i?'L':'M')+x(volume).toFixed(2)+' '+y(pH).toFixed(2);}).join(' ');
      shape('path',{d:points,class:id==='acetic'?'curve-weak':'curve-strong'});
    }
    for(const volume of [12.5,25])shape('circle',{cx:x(volume),cy:y(C.titration({id:'acetic',c:.1,v:25,ct:.1,added:volume}).pH),r:5,class:'curve-dot'});
    for(const lesson of E.lessons){const grid=$('simple-tasks-'+lesson.id);grid.replaceChildren(...lesson.stems.map(renderCard));}
    rendered=true;progress();save();
  }
  function setMode(simple,{jump=false,target=null}={}){
    if(document.fullscreenElement||document.body.classList.contains('has-fullscreen'))return;
    if($('reaction-play')?.getAttribute('aria-pressed')==='true')$('reaction-play').click();
    if($('tit-play')?.textContent.includes('Anhalten'))$('tit-play').click();
    state.mode=simple?'simple':'full';document.body.dataset.learningMode=state.mode;
    switcher.setAttribute('aria-checked',String(simple));
    switcher.title=simple?'Zur ausführlichen Ansicht wechseln':'Den vereinfachten Lernweg einschalten';
    course.hidden=!simple;for(const el of fullSections)el.hidden=simple||hiddenBefore.get(el);
    fullPlayer.hidden=fullReset.hidden=simple;brand.href=simple?'#simple-start':'#start';skip.href=simple?'#simple-protonen':'#konzepte';
    for(const {lab,home} of labHomes){if(simple)$(lab.id==='concept-lab'?'simple-reaction-slot':'simple-titration-slot').append(lab);else home.after(lab);}
    if(simple&&!rendered)render();
    document.dispatchEvent(new CustomEvent('acid-learning-mode-change',{detail:{mode:state.mode}}));
    save();M.typeset([simple?course:document.querySelector('main')]);
    if(jump){const destination=$(target||(simple?'simple-start':'start'));if(destination){history.replaceState(null,'','#'+destination.id);destination.scrollIntoView({behavior:'instant',block:'start'});}}
  }
  switcher.disabled=false;switcher.onclick=()=>setMode(state.mode!=='simple',{jump:true});
  course.addEventListener('click',event=>{const link=event.target.closest('[data-full-target]');if(link){event.preventDefault();setMode(false,{jump:true,target:link.dataset.fullTarget});}});
  document.addEventListener('fullscreenchange',()=>{switcher.disabled=!!document.fullscreenElement;});
  // Hash links stay useful after reload and when navigating back between modes.
  function followHash(){
    const target=location.hash.slice(1);if(!target)return;
    const simple=target.startsWith('simple-');if((simple&&state.mode!=='simple')||(!simple&&state.mode==='simple'&&fullIds.has(target)))setMode(simple);
    const element=$(target),details=element?.closest('details');if(details)details.open=true;
  }
  const hash=location.hash.slice(1),requested=hash.startsWith('simple-')?true:hash&&fullIds.has(hash)?false:state.mode==='simple';
  setMode(requested);addEventListener('hashchange',followHash);addEventListener('popstate',followHash);
})();
