(()=>{
  'use strict';
  const C=window.AcidMission,T=window.AcidTasks,M=window.AcidTypeset,$=id=>document.getElementById(id),KEY='protonen-mission-v1';
  const format=(n,d=2)=>n.toLocaleString('de-DE',{maximumFractionDigits:d}),sci=n=>n.toExponential(2).replace('.',',');
  const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seed=()=>{const x=new Uint32Array(1);crypto.getRandomValues(x);return x[0];};
  const tex=n=>String(Number(n.toPrecision(5))).replace(/e([+-]?\d+)/,'\\cdot10^{$1}').replace('.', '{,}');
  const qty=(n,u='mol/L')=>tex(n)+'\\ \\mathrm{'+u+'}';
  const calc=(formula,substitution)=>'\\['+formula+'\\]\\['+substitution+'\\]';
  function calculationPanel(id,html){M.replace($(id),html);}
  function equilibriumMath(s,c,r){
    const acid=s.type.endsWith('acid'),weak=s.type.startsWith('weak'),sub=acid?'s':'b',ion=acid?'x':'y';
    let html='<h4>Den angezeigten Wert nachvollziehen</h4><p>c₀ ist die Anfangskonzentration der Probe. h = c(H₃O⁺) und y = c(OH⁻) sind Gleichgewichtskonzentrationen. Kₛ/pKₛ beschreiben die Säurestärke, Kᵦ/pKᵦ die Basenstärke. K<sub>w</sub> ist das Ionenprodukt des Wassers; pK<sub>w</sub> ≈ 14 bei 25 °C. Konzentrationen im Logarithmus und in den Radikaltermen werden als Zahlenwerte in mol/L eingesetzt.</p><p class="small">Modellannahme: Die Wasserkonzentration ist in dieser verdünnten Lösung näherungsweise konstant, nicht exakt unveränderlich. Ihr Faktor aus dem vollständigen MWG steckt in Kₛ/Kᵦ, ihr Quadrat in K<sub>w</sub>. Diese Näherung lässt den Ionenbeitrag der Autoprotolyse bestehen. Herleitungen: <a href="#ks-derivation">Kₛ</a> · <a href="#kb-derivation">Kᵦ</a> · <a href="#kw-derivation">K<sub>w</sub></a>.</p>';
    if(weak){
      const k=10**(-s.pK),x=C.quadratic(k,c),approx=Math.sqrt(k*c),fraction=(acid?r.acidIon:r.baseIon)/c;
      html+=calc('K_\\mathrm{'+sub+'}=10^{-\\mathrm{p}K_\\mathrm{'+sub+'}}\\ \\mathrm{mol/L}','K_\\mathrm{'+sub+'}=10^{-'+tex(s.pK)+'}\\ \\mathrm{mol/L}='+qty(k));
      html+='<p>Wurzelnäherung: Anfangskonzentration statt Restkonzentration einsetzen, nur bei kleinem Umsatz und vernachlässigbarem Wasserbeitrag:</p>'+calc(ion+'\\approx\\sqrt{K_\\mathrm{'+sub+'}c_0}',ion+'\\approx\\sqrt{('+tex(k)+')\\cdot'+tex(c)+'}\\ \\mathrm{mol/L}='+qty(approx));
      html+='<p>Quadratische Konzentrationsrechnung: Die Restkonzentration wird beibehalten, der Wasserbeitrag noch vernachlässigt:</p>'+calc(ion+'=\\frac{\\sqrt{K_\\mathrm{'+sub+'}^2+4K_\\mathrm{'+sub+'}c_0}-K_\\mathrm{'+sub+'}}2',ion+'=\\frac{\\sqrt{('+tex(k)+')^2+4\\cdot('+tex(k)+')\\cdot'+tex(c)+'}-'+tex(k)+'}{2}\\ \\mathrm{mol/L}='+qty(x));
      html+='<p>α ist der protolysierte Anteil. Für die vollständige numerische Bilanz verwenden wir die Konzentration des tatsächlich entstandenen Partners, nicht automatisch h, denn h enthält auch den Wasserbeitrag:</p>'+calc('\\alpha=\\frac{c(\\mathrm{'+(acid?'A^-':'BH^+')+'})}{c_0}','\\alpha=\\frac{'+qty(acid?r.acidIon:r.baseIon)+'}{'+qty(c)+'}='+tex(fraction)+'='+tex(100*fraction)+'\\ \\%');
    }else html+='<p>Für starke Partner gilt oberhalb des Wasserbeitrags näherungsweise die vollständige Bereitstellung der Ionen:</p>'+calc('c(\\mathrm{'+(acid?'H_3O^+':'OH^-')+'})\\approx c_0','c(\\mathrm{'+(acid?'H_3O^+':'OH^-')+'})\\approx'+qty(c));
    html+='<p>Die angezeigte Hauptzahl stammt aus der vollständigen Massen-, Ladungs- und Wasserbilanz. Deren berechnete Oxoniumionen-Konzentration ist h:</p>'+calc('h=c(\\mathrm{H_3O^+})','h='+qty(r.h))+calc('\\mathrm{pH}=-\\lg h','\\mathrm{pH}=-\\lg('+tex(r.h)+')='+tex(r.pH))+calc('\\mathrm{pOH}=\\mathrm{p}K_\\mathrm{w}-\\mathrm{pH}','\\mathrm{pOH}\\approx14-'+tex(r.pH)+'='+tex(r.pOH));
    calculationPanel('eq-calculation',html);
  }
  function bufferMath(s,ha,a,volume,change,r){
    let html='<h4>Erst Mengen, dann pH</h4><p>n<sub>HA,0</sub> und n<sub>A,0</sub> sind die Anfangsmengen der Säure HA und ihrer konjugierten Base A⁻. Δn ist die vorzeichenbehaftete Zugabe: positiv für OH⁻, negativ für H₃O⁺. Der Index 1 bezeichnet die stöchiometrisch berechneten Restmengen vor der anschließenden Gleichgewichtskorrektur. V ist das feste Gesamtvolumen, pKₛ gehört zur gewählten Säure.</p><p class="small">Für Kₛ und K<sub>w</sub> wird die Wasserkonzentration in der verdünnten Lösung nur näherungsweise als konstant behandelt. Die entsprechenden Wasserfaktoren aus dem vollständigen MWG sind in diese Konstanten aufgenommen. <a href="#ks-derivation">Kₛ herleiten</a> · <a href="#kw-derivation">K<sub>w</sub> herleiten</a>. Die Mengenrechnung ist eine zusätzliche Näherung.</p>';
    html+=calc('n_{\\mathrm{HA},1}=n_{\\mathrm{HA},0}-\\Delta n','n_{\\mathrm{HA},1}='+qty(ha,'mmol')+'-('+qty(change,'mmol')+')='+qty(r.remainingHA,'mmol'));
    html+=calc('n_{\\mathrm{A},1}=n_{\\mathrm{A},0}+\\Delta n','n_{\\mathrm{A},1}='+qty(a,'mmol')+'+('+qty(change,'mmol')+')='+qty(r.remainingA,'mmol'));
    if(!r.exhausted)html+=calc('\\mathrm{pH}_\\mathrm{HH}\\approx\\mathrm{p}K_\\mathrm{s}+\\lg\\frac{n_{\\mathrm{A},1}}{n_{\\mathrm{HA},1}}','\\mathrm{pH}_\\mathrm{HH}\\approx'+tex(s.pK)+'+\\lg\\frac{'+qty(r.remainingA,'mmol')+'}{'+qty(r.remainingHA,'mmol')+'}='+tex(r.hh));
    if(!r.exhausted&&Math.abs(r.hh-r.pH)>.05)html+='<p><strong>Die Mengen-Näherung weicht hier merklich ab.</strong> Positive Restmengen allein garantieren noch keine verlässliche Puffernäherung. Die anschließende Protolyse verändert ihr Verhältnis; verwende den Bilanzwert.</p>';
    if(r.exhausted)html+='<p>Mindestens ein Vorrat ist verbraucht; ein negatives Ergebnis der einfachen Mengenrechnung ist kein realer Teilchenbestand. Die Puffergleichung wird hier nicht eingesetzt.</p>';
    html+='<p>h ist die aus der vollständigen Bilanz berechnete H₃O⁺-Konzentration. Bei sehr großem Überschuss oder Verdünnung kann der tatsächliche pH von der Mengen-Näherung abweichen. Unter dem Logarithmus steht der Zahlenwert in mol/L:</p>'+calc('h=c(\\mathrm{H_3O^+})','h='+qty(r.h))+calc('\\mathrm{pH}_\\mathrm{Bilanz}=-\\lg h','\\mathrm{pH}_\\mathrm{Bilanz}=-\\lg('+tex(r.h)+')='+tex(r.pH));
    calculationPanel('buf-calculation',html);
  }
  let state,tasks,storageOK=true;
  function fresh(previous=[]){const n=seed(),selected=T.select(n,previous);return {version:2,seed:n,ids:selected.map(t=>t.id),answers:{}};}
  try{const saved=JSON.parse(localStorage.getItem(KEY));if([1,2].includes(saved?.version)&&Number.isInteger(saved.seed)&&Array.isArray(saved.ids)&&saved.ids.length===32&&new Set(saved.ids).size===32&&saved.answers&&typeof saved.answers==='object'){
    const available=new Map(T.bank(saved.seed).map(t=>[t.id,t]));if(saved.ids.every(id=>available.has(id))&&T.groups.every(([g])=>saved.ids.filter(id=>available.get(id).group===g).length===4)){state=saved;if(state.version===1){for(const id of state.ids)if(/^(saeuren|basen)-1-/.test(id))delete state.answers[id];state.version=2;}}
  }}catch{storageOK=false;}
  if(!state)state=fresh();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;}$('storage-warning').hidden=storageOK;if(!storageOK)$('storage-warning').textContent='Der Browser kann den Lernstand nicht dauerhaft speichern. Diese Runde funktioniert trotzdem; nach dem Schließen kann der Fortschritt verloren gehen.';}
  function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
  function resultFor(task){let a=state.answers[task.id];if(!a||!Number.isInteger(a.attempts)||a.attempts<0||a.attempts>2)a={attempts:0,value:'',hint:false};return a;}
  function answerText(task){return task.kind==='choice'?task.answer:(['pH','pOH','pK'].includes(task.unit)?format(task.answer,2):T.f(task.answer,4))+(task.unit&&!['pH','pOH','pK','Faktor','Verhältnis'].includes(task.unit)?' '+task.unit:'');}
  function updateTask(task,card){
    const a=resultFor(task),done=!!a.done;card.classList.toggle('is-solved',!!a.solved);
    card.querySelector('input,select').disabled=done;card.querySelector('.check-task').disabled=done;
    const feedback=card.querySelector('.task-feedback');feedback.textContent=a.solved?`✓ Gelöst im ${a.attempts}. Versuch · ${a.attempts===1?'1':'0,5'} Punkte.`:done?'Zwei Versuche genutzt · Vergleiche jetzt den Lösungsweg.':a.attempts===1?'Noch nicht richtig. Nutze den Hinweis und prüfe deinen Ansatz – ein Versuch bleibt.':'';
    const explanation=card.querySelector('.task-solution');explanation.hidden=!done;explanation.querySelector('strong').textContent='Ergebnis: '+answerText(task);explanation.querySelector('.solution-comment').textContent=task.explanation;if(done&&task.math&&!explanation.querySelector('.math')){const block=node('div','math');block.textContent=task.math;const key=node('p','formula-key',task.symbols);explanation.prepend(key,block);if(card.isConnected)M.typeset([key,block]);}
    card.querySelector('.task-hint').hidden=!a.hint;
  }
  function dashboard(){
    const results=tasks.map(resultFor),score=results.reduce((n,a)=>n+(a.solved?(a.attempts===1?1:.5):0),0),finished=results.filter(a=>a.done).length,solved=results.filter(a=>a.solved).length;
    $('score').textContent=format(score,1)+' / 32';$('score-top').textContent=format(score,1);$('finished').textContent=finished+' / 32';$('solved').textContent=solved+' / 32';$('player-bar').style.width=score/32*100+'%';
    const rank=score>=28?'Gleichgewichts-Profi':score>=20?'Puffer-Stratege':score>=10?'pH-Entdecker':'Protonen-Spürnase';$('rank-top').textContent=rank;
    $('badges').replaceChildren();T.groups.forEach(([g,label])=>{const group=tasks.filter(t=>t.group===g),count=group.filter(t=>resultFor(t).solved).length,b=node('div','badge'+(count>=3?' earned':''));b.append(node('strong',null,(count>=3?'✦ ':'◇ ')+label.slice(5)),node('span',null,count+'/4 gelöst · Abzeichen ab 3'));$('badges').append(b);});
    $('summary-title').textContent=finished===32?'Runde abgeschlossen · '+rank:'Dein Lernweg wächst.';
    $('summary-text').textContent=`${solved} gelöst, ${finished-solved} weitere bearbeitet. ${format(score/32*100,0)} % der möglichen Punkte. ${finished===32?'Prüfe besonders die Erklärungen zu deinen schwierigen Aufgaben. Eine neue Runde bietet andere Varianten.':'Die Abzeichen würdigen jeweils drei richtig gelöste Missionen eines Themenbereichs.'}`;
    $('random-task').disabled=finished===32;
  }
  function renderTasks(){
    const bank=new Map(T.bank(state.seed).map(t=>[t.id,t]));tasks=state.ids.map(id=>bank.get(id));
    M.update($('task-groups'),()=>{
    $('task-groups').replaceChildren();
    let index=0;
    T.groups.forEach(([g,title])=>{const section=node('section','task-group'),grid=node('div','task-grid');section.append(node('h3',null,title));
      tasks.filter(t=>t.group===g).forEach(task=>{
        const card=node('article','task-card');card.id='task-'+task.id;
        card.append(node('span','task-number','MISSION '+String(++index).padStart(2,'0')),node('h4',null,task.title),node('p',null,task.prompt));C.substances.filter(s=>s.structure&&task.prompt.includes(s.name)).forEach(s=>card.append(node('p','equation',s.structure)));
        const form=node('form'),label=node('label',null,task.kind==='choice'?'Deine Entscheidung':'Dein Ergebnis · '+task.unit),input=node(task.kind==='choice'?'select':'input');input.id='input-'+task.id;label.htmlFor=input.id;
        if(task.kind==='choice'){const empty=node('option',null,'Bitte auswählen …');empty.value='';input.append(empty);task.options.forEach(o=>{const option=node('option',null,o);option.value=o;input.append(option);});}
        else{input.type='text';input.inputMode='decimal';input.autocomplete='off';input.spellcheck=false;input.placeholder=['pH','pOH','pK'].includes(task.unit)?'z. B. 3,25':'z. B. 1,2e-3';}
        const a=resultFor(task);input.value=a.value||'';
        input.addEventListener('change',()=>{state.answers[task.id]={...resultFor(task),value:input.value};save();});
        label.append(input);form.append(label);
        const actions=node('div','task-actions'),check=node('button','check-task primary','Prüfen'),hint=node('button',null,'Strategiehinweis');check.type='submit';hint.type='button';actions.append(check,hint);form.append(actions);
        const hintText=node('p','task-hint',task.hint);hintText.hidden=true;form.append(hintText);
        const feedback=node('p','task-feedback');feedback.setAttribute('role','status');feedback.id='feedback-'+task.id;input.setAttribute('aria-describedby',feedback.id);form.append(feedback);
        const solution=node('div','task-solution');solution.hidden=true;solution.append(node('strong'),node('p','solution-comment'));card.append(form,solution);
        hint.onclick=()=>{state.answers[task.id]={...resultFor(task),hint:true};save();updateTask(task,card);};
        form.onsubmit=event=>{event.preventDefault();const previous=resultFor(task);if(previous.done)return;
          if(!input.value||(task.kind==='number'&&!Number.isFinite(C.parseNumber(input.value)))){feedback.textContent='Bitte gib zuerst eine gültige Zahl oder Auswahl ein. Das verbraucht keinen Versuch.';return;}
          const attempts=previous.attempts+1,correct=C.accepts(task,input.value);state.answers[task.id]={...previous,value:input.value,attempts,done:correct||attempts===2,solved:correct};save();updateTask(task,card);dashboard();
        };
        updateTask(task,card);grid.append(card);
      });section.append(grid);$('task-groups').append(section);
    });dashboard();save();
    });
  }
  function values(id,items){$(id).replaceChildren(...items.map(([title,value])=>{const box=node('div');box.append(node('small',null,title),node('strong',null,value));return box;}));}
  function fillSubstances(id){C.substances.forEach(s=>{const option=node('option',null,s.name+' · '+s.formula);option.value=s.id;$(id).append(option);});$(id).value='acetic';}
  fillSubstances('eq-substance');fillSubstances('tit-substance');
  function equilibrium(){
    const s=C.get($('eq-substance').value),c=10**Number($('eq-log').value),r=C.solution(s.id,c),acid=s.type.endsWith('acid'),weak=s.type.startsWith('weak');
    $('eq-structure').textContent=s.structure||'';equilibriumMath(s,c,r);
    $('eq-c').textContent=sci(c)+' mol/L';$('eq-ph').textContent=format(r.pH,2);$('eq-poh').textContent='pOH '+format(r.pOH,2)+' · '+(r.pH<6.999?'sauer':r.pH>7.001?'basisch':'nahe neutral');$('eq-marker').style.left=Math.max(0,Math.min(100,r.pH/14*100))+'%';
    const fraction=weak?(acid?r.acidIon:r.baseIon)/c:1,count=Math.round(fraction*48);$('eq-particles').replaceChildren();for(let i=0;i<48;i++)$('eq-particles').append(node('i',i<count?'ion':'',i<count?(acid?'A⁻':'BH⁺'):(acid?'HA':'B')));
    $('eq-particle-caption').textContent=weak?`Protolysierter Anteil: ${format(fraction*100,2)} %. 48 Modellpunkte; unter rund 2 % ist ein einzelner Punkt bereits zu grob. Der Zahlenwert bleibt maßgeblich.`:'Im Modell praktisch vollständig umgesetzt. Für Laugen zeigt A⁻/BH⁺ hier symbolisch die vollständige Bereitstellung von OH⁻; das Hydroxid ist kein B-Molekül.';
    if(!weak){$('eq-particles').replaceChildren();for(let i=0;i<48;i++)$('eq-particles').append(node('i','ion',acid?'H₃O⁺':'OH⁻'));$('eq-particle-caption').textContent='48 schematische Produktpunkte: praktisch vollständige Bereitstellung der dargestellten Ionen; keine absolute Teilchenzählung.';}
    values('eq-values',[['c(H₃O⁺) / mol·L⁻¹',sci(r.h)],['c(OH⁻) / mol·L⁻¹',sci(r.oh)],['Stoffstärke',weak?(acid?'pKₛ ':'pKb ')+format(s.pK,2):'starker Partner']]);
    const reference=C.solution(acid?'hcl':'naoh',c),compare=$('eq-compare').checked?` Der starke ${acid?'Säure':'Basen'}partner gleicher c₀ hätte pH ${format(reference.pH,2)}.`:'';
    const x=weak?C.quadratic(10**(-s.pK),c):c,approx=acid?-Math.log10(weak?Math.sqrt(10**(-s.pK)*c):c):14+Math.log10(weak?Math.sqrt(10**(-s.pK)*c):c);
    $('eq-explanation').textContent=`${s.name}: ${weak?'Gleichgewicht statt vollständiger Umsetzung.':'Praktisch vollständige Umsetzung.'}${compare} ${weak?`Wurzelnäherung: pH ${format(approx,2)}. Anteil nach quadratischer Rechnung: ${format(x/c*100,2)} %. `:''}${(weak?x:c)<1e-6?'Der Wasserbeitrag ist hier relevant: Verwende die numerische Bilanz, nicht blind eine einfache pH-Formel.':weak&&Math.sqrt(10**(-s.pK)*c)/c>.05?'Die 5-%-Faustregel für die Wurzelnäherung ist nicht erfüllt.':'In diesem Bereich ist die einfache Näherung meist gut verwendbar.'}`;
  }
  ['eq-substance','eq-log','eq-compare'].forEach(id=>$(id).addEventListener('input',equilibrium));
  const reactionLab=window.AcidReactionLab.init();
  const reaction=kind=>reactionLab.select(kind);
  function chart(id,{xmin=0,xmax=50,xlabel='Zugegebenes Volumen / mL',series=[],marker,vertical=[]}){
    const x=n=>65+(n-xmin)/(xmax-xmin)*695,y=n=>365-n/14*320;let html='<rect width="800" height="430" fill="#fcfcf6"/>';
    for(let p=0;p<=14;p+=2)html+=`<path d="M65 ${y(p)} H760" stroke="#dce4d7"/><text x="50" y="${y(p)+5}" text-anchor="end" font-size="13" fill="#526b66">${p}</text>`;
    for(let i=0;i<=5;i++){const n=xmin+(xmax-xmin)*i/5;html+=`<path d="M${x(n)} 45 V365" stroke="#e6eadf"/><text x="${x(n)}" y="389" text-anchor="middle" font-size="13" fill="#526b66">${format(n,1)}</text>`;}
    html+='<path d="M65 45 V365 H760" fill="none" stroke="#526b66"/><text x="20" y="28" font-size="14" fill="#163b38">pH</text><text x="412" y="417" text-anchor="middle" font-size="14" fill="#163b38">'+escape(xlabel)+'</text>';
    vertical.forEach(({at,label})=>{if(at>=xmin&&at<=xmax)html+=`<path d="M${x(at)} 45 V365" stroke="#b78e50" stroke-dasharray="5 5"/><text x="${x(at)+4}" y="28" font-size="11" fill="#765b30">${escape(label)}</text>`;});
    series.forEach(s=>{if(s.dots)s.points.forEach(p=>{html+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="4" fill="${s.color||'var(--red)'}"/>`;});html+=`<path d="${s.points.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(2)+' '+y(p[1]).toFixed(2)).join(' ')}" fill="none" stroke="${s.color||'#186b57'}" stroke-width="3" ${s.dashed?'stroke-dasharray="7 5"':''}/>`;});
    if(marker)html+=`<circle cx="${x(marker[0])}" cy="${y(marker[1])}" r="6" fill="#c48239" stroke="#fff" stroke-width="2"/><text x="${Math.min(685,Math.max(75,x(marker[0])+12))}" y="${Math.max(53,y(marker[1])-12)}" font-size="15" font-weight="600" fill="#163b38">pH ${format(marker[1],2)}</text>`;
    html=html.replaceAll('#fcfcf6','var(--white)').replaceAll('#dce4d7','var(--line)').replaceAll('#e6eadf','var(--line)').replaceAll('#526b66','var(--muted)').replaceAll('#163b38','var(--ink)').replaceAll('#186b57','var(--red)').replaceAll('#c48239','var(--red)').replaceAll('#765b30','var(--muted)').replaceAll('#b78e50','var(--red)');$(id).innerHTML=html;
  }
  window.AcidTitration.init({chart,values,format});
  const stopPour=()=>window.AcidTitration.stop();
  const titration=reset=>window.AcidTitration.render(reset);
  function buffer(){
    const s=C.get($('buf-substance').value),ha=Number($('buf-ha').value),a=Number($('buf-a').value),volume=Number($('buf-v').value),change=Number($('buf-change').value);
    if(![ha,a].every(n=>Number.isFinite(n)&&n>=.5&&n<=10)||!Number.isFinite(volume)||volume<50||volume>500){$('buf-explanation').textContent='Bitte HA und A⁻ zwischen 0,5 und 10 mmol sowie ein Volumen von 50–500 mL eingeben.';return;}
    const conf={pKa:s.pK,ha,a,volume},r=C.buffer({...conf,change}),plain=C.solve({diff:change/volume});bufferMath(s,ha,a,volume,change,r);
    $('buf-change-label').textContent=change===0?'keine Zugabe':format(Math.abs(change),1)+' mmol '+(change>0?'OH⁻':'H₃O⁺');
    const xs=Array.from({length:361},(_,i)=>-12+24*i/360),series=[{points:xs.map(n=>[n,C.buffer({...conf,change:n}).pH])},{points:xs.map(n=>[n,C.solve({diff:n/volume}).pH]),color:'#89988d',dashed:true}];
    chart('buffer-chart',{xmin:-12,xmax:12,xlabel:'Zugabe / mmol · negativ: H₃O⁺ · positiv: OH⁻',series,marker:[change,r.pH],vertical:[{at:-a,label:'A⁻-Vorrat'},{at:ha,label:'HA-Vorrat'}]});
    values('buf-values',[['pH des Puffers',format(r.pH,2)],['pH der Wasser-Vergleichsprobe',format(plain.pH,2)],['HH-Näherung',r.hh===null?'nicht anwendbar':format(r.hh,2)],['HA nach Mengenrechnung',format(Math.max(0,r.remainingHA),2)+' mmol'],['A⁻ nach Mengenrechnung',format(Math.max(0,r.remainingA),2)+' mmol'],['Gesamtvolumen',format(volume)+' mL']]);
    $('buf-explanation').textContent=r.exhausted?'Ein Vorrat ist stöchiometrisch aufgebraucht. Die Henderson–Hasselbalch-Mengenrechnung ist hier nicht mehr sinnvoll. Die numerische Bilanz beschreibt den Übergang zum Überschuss der starken Säure/Base.':`${change<0?'H₃O⁺ wird durch A⁻ abgefangen; HA entsteht.':change>0?'OH⁻ wird durch HA abgefangen; A⁻ entsteht.':'Ohne Zugabe bestimmt das Verhältnis der beiden Partner den pH.'} Beide Mengen sind noch positiv. ${r.remainingA/r.remainingHA<.1||r.remainingA/r.remainingHA>10?'Das Verhältnis liegt außerhalb des üblichen Bereichs 1:10 bis 10:1; eine Seite ist nur noch schwach vertreten.':'Beide Partner sind in nennenswerten Mengen vorhanden.'}`;
  }
  ['buf-substance','buf-ha','buf-a','buf-v','buf-change'].forEach(id=>$(id).addEventListener('input',buffer));$('buf-reset').onclick=()=>{$('buf-change').value='0';buffer();};
  function resetLabs(){stopPour();$('eq-substance').value='acetic';$('eq-log').value='-1';$('eq-compare').checked=true;window.AcidTitration.clearPractical();$('tit-substance').value='hcl';$('tit-c').value='0.1';$('tit-v').value='25';$('tit-ct').value='0.1';$('buf-substance').value='acetic';$('buf-ha').value='5';$('buf-a').value='5';$('buf-v').value='100';$('buf-change').value='0';reaction('acid');equilibrium();titration(true);buffer();}
  $('reset-open').onclick=()=>$('reset-dialog').showModal();
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('reset-confirm').onclick=()=>{const old=state.ids;state=fresh(old);renderTasks();resetLabs();$('reset-dialog').close();$('training').scrollIntoView({behavior:'smooth'});};
  $('random-task').onclick=()=>{const candidates=tasks.filter(t=>!resultFor(t).done),t=candidates[Math.floor(Math.random()*candidates.length)];if(t){$('task-'+t.id).scrollIntoView({behavior:'smooth',block:'center'});$('input-'+t.id).focus({preventScroll:true});}};
  async function fullscreen(id){const lab=$(id);if(document.fullscreenElement){await document.exitFullscreen();return;}if(lab.classList.contains('fullscreen-fallback')){lab.classList.remove('fullscreen-fallback');document.body.classList.remove('has-fullscreen');fullLabels();return;}try{if(!lab.requestFullscreen)throw Error();await lab.requestFullscreen();}catch{lab.classList.add('fullscreen-fallback');document.body.classList.add('has-fullscreen');}fullLabels();}
  function fullLabels(){document.querySelectorAll('[data-fullscreen]').forEach(b=>b.textContent=document.fullscreenElement===$(b.dataset.fullscreen)||$(b.dataset.fullscreen).classList.contains('fullscreen-fallback')?'⛶ Vollbild verlassen':'⛶ Vollbild');}
  document.querySelectorAll('[data-fullscreen]').forEach(b=>b.onclick=()=>fullscreen(b.dataset.fullscreen));document.addEventListener('fullscreenchange',fullLabels);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){stopPour();const active=document.querySelector('.fullscreen-fallback');if(active&&!document.querySelector('dialog[open]'))fullscreen(active.id);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPour();});
  const progress=()=>{$('page-progress').style.width=100*window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'%';};window.addEventListener('scroll',progress,{passive:true});
  document.addEventListener('atelier-view-change',()=>{equilibrium();buffer();});renderTasks();resetLabs();progress();
})();
