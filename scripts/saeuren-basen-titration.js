(()=>{
  'use strict';
  const C=window.AcidMission,M=window.AcidTypeset,$=id=>document.getElementById(id);
  let helpers,added=0,busy=false,timer=null,practical=null;
  const cases={hcl:{id:'hcl',c:.074,target:1,title:'Bestimme die Konzentration einer Salzsäureprobe.'},acetic:{id:'acetic',c:.086,target:1,title:'Bestimme die Konzentration einer Essigsäureprobe.'},phosphate1:{id:'phosphoric',c:.062,target:1,title:'Bestimme Phosphorsäure über den ersten Äquivalenzbereich.'},phosphate2:{id:'phosphoric',c:.062,target:2,title:'Bestimme Phosphorsäure über den zweiten Äquivalenzbereich.'}};
  const f=n=>helpers.format(n,3),tex=n=>String(Number(n.toPrecision(5))).replace(/e([+-]?\d+)/,'\\cdot10^{$1}').replace('.', '{,}');
  const math=html=>M.replace($('tit-point-math'),html);
  function config(){const c=practical?cases[practical].c:Number($('tit-c').value),v=Number($('tit-v').value),ct=Number($('tit-ct').value);if(![c,ct].every(n=>Number.isFinite(n)&&n>=.001&&n<=.2)||!Number.isFinite(v)||v<5||v>50)return null;return{id:$('tit-substance').value,c,v,ct};}
  function spec(conf){const s=C.get(conf.id),unit=conf.c*conf.v/conf.ct;return{s,unit,max:(s.pKs?3.5:2)*unit,targets:s.pKs?[unit,2*unit]:[unit],acid:s.type.endsWith('acid')};}
  function suitable(conf,sp,v,ind){const a=C.titration({...conf,added:v-sp.unit*.015}).pH,b=C.titration({...conf,added:v+sp.unit*.015}).pH;return ind.high>=Math.min(a,b)&&ind.low<=Math.max(a,b);}
  function indicator(){return C.indicators.find(i=>i.id===$('tit-indicator').value);}
  function color(pH){const ind=indicator(),t=Math.max(0,Math.min(1,(pH-ind.low)/(ind.high-ind.low))),a=ind.acid.match(/\w\w/g).map(x=>parseInt(x,16)),b=ind.base.match(/\w\w/g).map(x=>parseInt(x,16));if(ind.id==='phenolphthalein')return 'rgba(198,38,134,'+.65*t+')';return 'rgb('+a.map((x,i)=>Math.round(x+(b[i]-x)*t)).join(',')+')';}
  function status(text){$('tit-status').textContent=text;}
  function controls(){const locked=busy||!config();$('tit-add').disabled=locked;$('tit-endpoint').disabled=locked;$('tit-play').disabled=!config();}
  function stop(){clearTimeout(timer);timer=null;busy=false;$('titration-lab').classList.remove('is-pouring');$('tit-play').textContent='▶ Zugeben';if(helpers)controls();}
  function restart(){stop();added=0;$('practical-answer').hidden=true;status('Die vollständige Kurve ist sichtbar. Gib Portionen zu oder wähle das Volumen mit dem Schieberegler.');render();}
  function setPractical(id){practical=id;$('tit-dose-custom').value='';const c=cases[id];$('tit-substance').value=c.id;$('tit-v').value=25;$('tit-ct').value=.1;$('tit-c-label').hidden=true;['tit-substance','tit-v','tit-ct'].forEach(id=>$(id).disabled=true);$('tit-endpoint').hidden=false;$('practical-prompt').textContent=c.title+' Untersuche 25,0 mL Probe mit NaOH (0,100 mol/L). Wähle anhand der sichtbaren Kurve einen geeigneten Indikator für Stufe '+c.target+'. Lies den Verbrauch ab oder gib die Maßlösung portionsweise zu; berechne daraus c₀. Alle Übungsfälle sind direkt auswählbar.';restart();}
  function clearPractical(){practical=null;$('practical-prompt').textContent='Freies Labor: Vergleiche zuerst HCl, dann Essigsäure und schließlich Phosphorsäure. Du kannst jederzeit zwischen den Proben wechseln.';$('tit-c-label').hidden=false;['tit-substance','tit-v','tit-ct'].forEach(id=>$(id).disabled=false);$('tit-endpoint').hidden=true;$('practical-answer').hidden=true;}
  function render(reset=false){
    if(!helpers)return;if(reset){restart();return;}const conf=config();if(!conf){stop();$('tit-validity').textContent='Modellbereich: c 0,001–0,2 mol/L; V₀ 5–50 mL.';return;}
    $('tit-validity').textContent='';const sp=spec(conf);added=Math.max(0,Math.min(sp.max,added));const r=C.titration({...conf,added}),ind=indicator();
    $('tit-structure').textContent=({acetic:'Essigsäure: CH₃—C(=O)—OH',formic:'Ameisensäure: H—C(=O)—OH',methylamine:'Methylamin: CH₃—NH₂'}[conf.id]||'');
    $('tit-indicator-note').textContent=ind.name+': pH '+f(ind.low)+'–'+f(ind.high)+' · '+ind.description+'. '+(sp.s.pKs?'Phosphorsäure: erster und zweiter Äquivalenzbereich sind getrennt; die Indikatorwahl bestimmt die erfasste Stufe.':conf.id==='ammonia'?'Achtung: Phenolphthalein ist für den sauren Äquivalenzbereich von NH₃/HCl ungeeignet.':'Prüfe, ob der Umschlagbereich im steilen Abschnitt liegt.');
    $('tit-added-label').textContent=f(added)+' mL';$('flask-ph').textContent='pH '+f(r.pH);$('flask-liquid').style.background=color(r.pH);$('burette-liquid').style.height=(85-65*added/sp.max)+'%';$('tit-added').max=sp.max;$('tit-added').step=sp.unit/500;$('tit-added').value=added;
    const xs=new Set(Array.from({length:401},(_,i)=>sp.max*i/400));sp.targets.forEach(v=>[.5,.98,.995,.999,1,1.001,1.005,1.02].forEach(f=>xs.add(v*f)));
    helpers.chart('titration-chart',{xmax:sp.max,series:[{points:[...xs].sort((a,b)=>a-b).map(v=>[v,C.titration({...conf,added:v}).pH])}],marker:[added,r.pH],vertical:sp.s.pKs?sp.s.pKs.map((_,i)=>({at:(i+1)*sp.unit,label:'ÄP '+(i+1)})):[{at:sp.unit,label:'ÄP'},...(sp.s.type.startsWith('weak')?[{at:sp.unit/2,label:'½ ÄP'}]:[])]});
    const svg=$('titration-chart'),y=p=>365-p/14*320,shade=document.createElementNS('http://www.w3.org/2000/svg','rect');shade.setAttribute('x',65);shade.setAttribute('width',695);shade.setAttribute('y',y(ind.high));shade.setAttribute('height',y(ind.low)-y(ind.high));shade.setAttribute('fill','var(--red)');shade.setAttribute('opacity','.12');svg.insertBefore(shade,svg.children[1]);
    helpers.values('tit-results',[['Maßlösung',sp.acid?'NaOH':'HCl'],['Erster VÄ / mL',f(sp.unit)],['pH',f(r.pH)],['Gesamtvolumen / mL',f(conf.v+added)],['Anfangsmenge / mmol',f(r.n*1000)]]);
    pointMath(conf,r,sp);
    $('tit-explanation').textContent='Der markierte Punkt zeigt das aktuelle Volumen und den pH-Wert; das hinterlegte Band ist der Umschlagbereich des gewählten Indikators. Der ÄP folgt aus der Stoffbilanz. Auch über den ÄP hinaus kannst du frei weiter titrieren und mit dem Schieberegler zu jedem Punkt zurückkehren.';
    controls();document.querySelectorAll('[data-practical]').forEach(b=>{b.disabled=false;b.setAttribute('aria-pressed',String(practical===b.dataset.practical));});
  }
  function addDose(){
    const conf=config();if(!conf||busy||timer)return;const sp=spec(conf),dose=Number($('tit-dose-custom').value.trim()||$('tit-dose').value);if(!Number.isFinite(dose)||dose<=0){status('Wähle eine positive Portionsgröße in mL.');return;}
    const next=Math.min(sp.max,Number((added+dose).toFixed(9)));if(next===added){status('Das Ende des dargestellten Modellbereichs ist erreicht. Mit dem Schieberegler kannst du zu jedem Volumen zurückkehren.');return;}
    busy=true;controls();$('titration-lab').classList.add('is-pouring');status('Der Hahn ist offen · Maßlösung fließt …');
    timer=setTimeout(()=>{timer=null;busy=false;added=next;$('titration-lab').classList.remove('is-pouring');status('Zugabe beendet. Vergleiche den Punkt auf der Kurve mit der Farbe im Kolben.');render();},matchMedia('(prefers-reduced-motion:reduce)').matches?120:650);
  }
  function endpoint(){
    const conf=config();if(!conf||!practical||busy)return;const sp=spec(conf),target=cases[practical].target,ind=indicator(),value=conf.ct*added/(target*conf.v),matches=suitable(conf,sp,target*sp.unit,ind),near=Math.abs(added-target*sp.unit)<=sp.unit*.015;
    $('practical-answer').hidden=false;const el=$('practical-solution');
    M.replace(el,'<p>c₀ ist die gesuchte Anfangskonzentration der Probe, V₀ ihr Anfangsvolumen. Die Äquivalenzbedingung wird hier näherungsweise auf deinen beobachteten Endpunkt übertragen. c<sub>B</sub> ist die NaOH-Konzentration, V<sub>End</sub> der von dir gewählte Verbrauch. j ist die Anzahl der umgesetzten Protonen pro Säuremolekül; für diese Stufe gilt j = '+target+'.</p>'+calculation('j\\,c_0V_0\\approx c_\\mathrm{B}V_\\mathrm{End},\\quad c_0\\approx\\frac{c_\\mathrm{B}V_\\mathrm{End}}{jV_0}','c_0\\approx\\frac{'+quantity(conf.ct)+'\\cdot'+quantity(added,'mL')+'}{'+target+'\\cdot'+quantity(conf.v,'mL')+'}='+quantity(value))+'<p>Aus dem gewählten Verbrauch folgt für Stufe '+target+' c₀ ≈ '+f(value)+' mol/L. Der vorgegebene Modellwert ist '+f(conf.c)+' mol/L. '+(matches?'Der Umschlagbereich überlappt den gewünschten Sprung; das allein garantiert noch keinen genauen Endpunkt. Prüfe die gesamte Umschlagspanne.':'Der gewählte Indikatorbereich liegt nicht am gewünschten Sprung.')+' '+(near?'Der Verbrauch liegt nahe am stöchiometrischen Punkt.':'Der Verbrauch weicht vom stöchiometrischen Punkt ab. Mit dem Schieberegler kannst du ihn ohne neuen Durchgang korrigieren.')+'</p>');
    status('Der gewählte Verbrauch ist ausgewertet. Du kannst frei weiter untersuchen oder einen anderen Punkt wählen.');render();
  }
  const quantity=(n,unit='mol/L')=>tex(n)+'\\ \\mathrm{'+unit+'}';
  const calculation=(formula,substitution)=>'\\['+formula+'\\]\\['+substitution+'\\]';
  function initialPoint(conf,sp){
    const s=sp.s,acid=sp.acid,ion=acid?'x':'y';let out='';
    if(s.type.startsWith('weak')){
      const k=10**(-s.pK),x=C.quadratic(k,conf.c),sub=acid?'s':'b';
      out=calculation('K_\\mathrm{'+sub+'}=10^{-\\mathrm{p}K_\\mathrm{'+sub+'}}\\ \\mathrm{mol/L}','K_\\mathrm{'+sub+'}=10^{-'+tex(s.pK)+'}\\ \\mathrm{mol/L}='+quantity(k));
      out+=calculation(ion+'=\\frac{\\sqrt{K_\\mathrm{'+sub+'}^2+4K_\\mathrm{'+sub+'}c_0}-K_\\mathrm{'+sub+'}}2',ion+'=\\frac{\\sqrt{('+tex(k)+')^2+4\\cdot('+tex(k)+')\\cdot'+tex(conf.c)+'}-'+tex(k)+'}{2}\\ \\mathrm{mol/L}='+quantity(x));
      out+=calculation('\\mathrm{'+(acid?'pH':'pOH')+'}=-\\lg '+ion,'\\mathrm{'+(acid?'pH':'pOH')+'}=-\\lg('+tex(x)+')='+tex(-Math.log10(x)));
      if(!acid)out+=calculation('\\mathrm{pH}=\\mathrm{p}K_\\mathrm{w}-\\mathrm{pOH}','\\mathrm{pH}\\approx14-'+tex(-Math.log10(x))+'='+tex(14+Math.log10(x)));
    }else{
      out=calculation('\\mathrm{'+(acid?'pH':'pOH')+'}\\approx-\\lg c_0','\\mathrm{'+(acid?'pH':'pOH')+'}\\approx-\\lg('+tex(conf.c)+')='+tex(-Math.log10(conf.c)));
      if(!acid)out+=calculation('\\mathrm{pH}=\\mathrm{p}K_\\mathrm{w}-\\mathrm{pOH}','\\mathrm{pH}\\approx14-'+tex(-Math.log10(conf.c))+'='+tex(14+Math.log10(conf.c)));
    }
    return out;
  }
  function excessPoint(sp,q,n0,nt,total,multiplier=1){
    const ion=(q<1?sp.acid:!sp.acid)?'H_3O^+':'OH^-',rest=Math.abs(nt-multiplier*n0),c=rest/total;
    let out=calculation('c(\\mathrm{'+ion+'})\\approx\\frac{|n_\\mathrm{Maßlösung}-'+(multiplier===1?'':multiplier)+'n_0|}{V_\\mathrm{gesamt}}','c(\\mathrm{'+ion+'})\\approx\\frac{|'+quantity(nt,'mol')+'-'+quantity(multiplier*n0,'mol')+'|}{'+quantity(total,'L')+'}='+quantity(c));
    out+=ion==='OH^-'?calculation('\\mathrm{pH}=\\mathrm{p}K_\\mathrm{w}+\\lg c(\\mathrm{OH^-})','\\mathrm{pH}\\approx14+\\lg('+tex(c)+')='+tex(14+Math.log10(c))):calculation('\\mathrm{pH}=-\\lg c(\\mathrm{H_3O^+})','\\mathrm{pH}=-\\lg('+tex(c)+')='+tex(-Math.log10(c)));
    return out;
  }
  function phosphatePoint(conf,sp,q,n0,nt,total){
    const ks=sp.s.pKs,j=Math.round(q);let out='<p>Die Indizes s1, s2 und s3 bezeichnen die drei Protonenabgaben. c_P ist die gesamte Phosphat-Konzentration aller Formen. j bezeichnet die betrachtete Stufe; r ihr stöchiometrisches Verhältnis aus deprotonierter und protonierter Form. Die Gleichgewichts- und Wasserbeiträge können diese Mengenrechnung merklich verändern.</p>';
    if(q===0)return out+initialPoint(conf,{...sp,s:{...sp.s,type:'weak-acid',pK:ks[0]}});
    if(j>=1&&j<=2&&Math.abs(q-j)<1e-8){
      return out+calculation('\\mathrm{pH}\\approx\\frac{\\mathrm{p}K_{\\mathrm{s}'+j+'}+\\mathrm{p}K_{\\mathrm{s}'+(j+1)+'}}2','\\mathrm{pH}\\approx\\frac{'+tex(ks[j-1])+'+'+tex(ks[j])+'}{2}='+tex((ks[j-1]+ks[j])/2));
    }
    if(Math.abs(q-3)<1e-6){
      const c=n0/total,k=C.KW/10**(-ks[2]),y=C.quadratic(k,c);
      out+=calculation('c_\\mathrm{P}=\\frac{n_0}{V_\\mathrm{gesamt}}','c_\\mathrm{P}=\\frac{'+quantity(n0,'mol')+'}{'+quantity(total,'L')+'}='+quantity(c));
      out+=calculation('K_{\\mathrm{b3}}=\\frac{K_\\mathrm{w}}{K_{\\mathrm{s3}}}','K_{\\mathrm{b3}}=\\frac{10^{-14}\\ (\\mathrm{mol/L})^2}{'+quantity(10**(-ks[2]))+'}='+quantity(k));
      out+=calculation('y=\\frac{\\sqrt{K_{\\mathrm{b3}}^2+4K_{\\mathrm{b3}}c_\\mathrm{P}}-K_{\\mathrm{b3}}}2','y=\\frac{\\sqrt{('+tex(k)+')^2+4\\cdot('+tex(k)+')\\cdot'+tex(c)+'}-'+tex(k)+'}{2}\\ \\mathrm{mol/L}='+quantity(y));
      out+=calculation('\\mathrm{pOH}=-\\lg y','\\mathrm{pOH}=-\\lg('+tex(y)+')='+tex(-Math.log10(y)));
      return out+calculation('\\mathrm{pH}=\\mathrm{p}K_\\mathrm{w}-\\mathrm{pOH}','\\mathrm{pH}\\approx14-'+tex(-Math.log10(y))+'='+tex(14+Math.log10(y)));
    }
    if(q<3){
      const j=Math.floor(q)+1,ratio=(nt-(j-1)*n0)/(j*n0-nt);
      out+=calculation('r=\\frac{n_\\mathrm{Maßlösung}-(j-1)n_0}{jn_0-n_\\mathrm{Maßlösung}}','r=\\frac{'+quantity(nt,'mol')+'-('+j+'-1)\\cdot'+quantity(n0,'mol')+'}{'+j+'\\cdot'+quantity(n0,'mol')+'-'+quantity(nt,'mol')+'}='+tex(ratio));
      return out+calculation('\\mathrm{pH}\\approx\\mathrm{p}K_{\\mathrm{s}'+j+'}+\\lg r','\\mathrm{pH}\\approx'+tex(ks[j-1])+'+\\lg('+tex(ratio)+')='+tex(ks[j-1]+Math.log10(ratio)));
    }
    return out+excessPoint(sp,q,n0,nt,total,3);
  }


  function balanceMath(conf,r,sp){
    const ct=r.n/r.total,titrant=r.nt/r.total;
    let html='<h4>Welche Bilanz trägt die Kurve?</h4><p>c<sub>t</sub> ist die analytische Gesamtkonzentration der Probe im Mischungsvolumen; c<sub>Z</sub> die Konzentration des durch die Maßlösung eingebrachten Zuschauerions (Na⁺ bei NaOH, Cl⁻ bei HCl). h = c(H₃O⁺) ist die gesuchte Gleichgewichtsgröße. Wasser und alle Säureformen bleiben in der Rechnung.</p>';
    html+=calculation('c_\\mathrm{t}=\\frac{n_0}{V_\\mathrm{gesamt}},\\quad c_\\mathrm{Z}=\\frac{n_\\mathrm{Maßlösung}}{V_\\mathrm{gesamt}}','c_\\mathrm{t}='+quantity(ct)+',\\quad c_\\mathrm{Z}='+quantity(titrant));
    if(sp.s.pKs){
      html+='<p>α₀ bis α₃ sind die Anteile H₃PO₄, H₂PO₄⁻, HPO₄²⁻ und PO₄³⁻. K₁, K₂, K₃ stehen kurz für die drei Säurekonstanten in mol/L. D ist der gemeinsame Nenner; die Anteile addieren sich zu 1.</p>';
      html+=String.raw`\[D=h^3+K_1h^2+K_1K_2h+K_1K_2K_3\]\[\alpha_0=\frac{h^3}{D},\quad\alpha_1=\frac{K_1h^2}{D}\]\[\alpha_2=\frac{K_1K_2h}{D},\quad\alpha_3=\frac{K_1K_2K_3}{D}\]\[h+c_\mathrm{Z}=\frac{K_\mathrm{w}}h+c_\mathrm{t}(\alpha_1+2\alpha_2+3\alpha_3)\]`;
    }else if(sp.s.type==='weak-acid'){
      html+='<p>Aus Stoffbilanz und MWG folgt c(A⁻) = c<sub>t</sub>Kₛ/(h + Kₛ). Positive und negative Ladungen müssen sich ausgleichen:</p>';
      html+=String.raw`\[h+c_\mathrm{Z}=\frac{K_\mathrm{w}}h+\frac{c_\mathrm{t}K_\mathrm{s}}{h+K_\mathrm{s}}\]`;
    }else if(sp.s.type==='weak-base'){
      html+='<p>Die Stoffbilanz umfasst B und BH⁺. Das Basengleichgewicht liefert c(BH⁺) = c<sub>t</sub>Kᵦh/(K<sub>w</sub> + Kᵦh). Ladungsbilanz:</p>';
      html+=String.raw`\[h+\frac{c_\mathrm{t}K_\mathrm{b}h}{K_\mathrm{w}+K_\mathrm{b}h}=\frac{K_\mathrm{w}}h+c_\mathrm{Z}\]`;
    }else{
      html+='<p>d ist die Konzentrationsdifferenz starker Base minus starker Säure nach dem Mischen; sie darf positiv oder negativ sein. Die Wasserbilanz verhindert einen unzulässigen Logarithmus von null am ÄP.</p>';
      html+=calculation('d='+ (sp.acid?'c_\\mathrm{Z}-c_\\mathrm{t}':'c_\\mathrm{t}-c_\\mathrm{Z}'),'d='+quantity(sp.acid?titrant-ct:ct-titrant));
      html+=String.raw`\[h+d=\frac{K_\mathrm{w}}h\quad\Longrightarrow\quad h=\frac{-d+\sqrt{d^2+4K_\mathrm{w}}}{2}\]`;
    }
    return html+'<p>Die App bestimmt daraus h numerisch und setzt anschließend in die pH-Formel ein. Das ist innerhalb des idealen Konzentrationsmodells vollständig, keine Aktivitätskorrektur realer Lösungen.</p>';
  }

  function pointMath(conf,r,sp){const s=sp.s,q=added/sp.unit,n0=conf.c*conf.v/1000,nt=conf.ct*added/1000,total=(conf.v+added)/1000;let formula='';
    if(s.pKs){formula=phosphatePoint(conf,sp,q,n0,nt,total);
    }else if(added===0){formula=initialPoint(conf,sp);
    }else if(Math.abs(q-1)<1e-6){
      if(s.type.startsWith('weak')){
        const partner=sp.acid?'A^-':'BH^+',pk=sp.acid?'b':'s',initialPk=sp.acid?'s':'b',concentration=n0/total;
        formula='<h4>Äquivalenzpunkt (ÄP)</h4><p>'+ (sp.acid?'A⁻ ist die konjugierte Base der Säureprobe; bei Essigsäure ist das Acetat.':'BH⁺ ist die konjugierte Säure der Baseprobe; bei Ammoniak ist das Ammonium.')+' Ihre Stoffmenge entspricht näherungsweise n₀. Ihre Konzentration folgt aus dieser Menge im Gesamtvolumen, also Probe plus Maßlösung.</p>'+String.raw`\[\begin{aligned}&V_\mathrm{gesamt}=V_0+V_\mathrm{Ä}\\&=${tex(total)}\ \mathrm{L}\end{aligned}\]\[\begin{aligned}&c(\mathrm{${partner}})\approx\frac{n_0}{V_\mathrm{gesamt}}\\&=\frac{${tex(n0)}\ \mathrm{mol}}{${tex(total)}\ \mathrm{L}}\\&=${tex(concentration)}\ \mathrm{mol/L}\end{aligned}\]`;
        formula+='<p>pK'+(sp.acid?'ᵦ':'ₛ')+' gehört zum konjugierten Partner, nicht zur Maßlösung. pK'+(sp.acid?'ₛ':'ᵦ')+' = '+f(s.pK)+' gehört zur anfänglich eingesetzten Probe. Für genau dieses Paar ist ihre Summe pK<sub>w</sub> ≈ 14 bei 25 °C.</p>'+String.raw`\[\mathrm{p}K_\mathrm{${pk}}(\mathrm{${partner}})=\mathrm{p}K_\mathrm{w}-\mathrm{p}K_\mathrm{${initialPk}}=14-${tex(s.pK)}=${tex(14-s.pK)}\]`;
        formula+=sp.acid?String.raw`\[\begin{aligned}&\mathrm{pOH}\approx\frac12\bigl(\mathrm{p}K_\mathrm{b}-\lg c(\mathrm{A^-})\bigr)\\&=\frac12\bigl(${tex(14-s.pK)}-\lg${tex(concentration)}\bigr)\end{aligned}\]\[\mathrm{pH}=\mathrm{p}K_\mathrm{w}-\mathrm{pOH}\approx14-\mathrm{pOH}\]`:String.raw`\[\begin{aligned}&\mathrm{pH}\approx\frac12\bigl(\mathrm{p}K_\mathrm{s}-\lg c(\mathrm{BH^+})\bigr)\\&=\frac12\bigl(${tex(14-s.pK)}-\lg${tex(concentration)}\bigr)\end{aligned}\]`;
        formula+='<p class="small">Unter dem Logarithmus steht der Zahlenwert der Konzentration in mol/L. pH und pOH haben keine Einheit.</p>';
      }else formula=String.raw`\[c(\mathrm{H_3O^+})=c(\mathrm{OH^-})=\sqrt{K_\mathrm{w}}\]\[c(\mathrm{H_3O^+})=\sqrt{10^{-14}\,(\mathrm{mol/L})^2}=10^{-7}\ \mathrm{mol/L}\]\[\mathrm{pH}=\frac{\mathrm{p}K_\mathrm{w}}2=\frac{14}{2}=7\]`;
    }else if(s.type.startsWith('weak')&&Math.abs(q-.5)<1e-6){
      formula='<h4>Halbäquivalenzpunkt (HÄP)</h4>'+String.raw`\[V_\mathrm{HÄP}=\frac{V_\mathrm{Ä}}2=${tex(added)}\ \mathrm{mL}\]\[n_\mathrm{umgesetzt}=\frac{n_0}2=${tex(nt)}\ \mathrm{mol}\]`;
      if(sp.acid)formula+=String.raw`\[\begin{aligned}&n(\mathrm{HA})\approx n_0-n_\mathrm{umgesetzt}\\&=${tex(n0-nt)}\ \mathrm{mol}\\&n(\mathrm{A^-})\approx n_\mathrm{umgesetzt}\\&=${tex(nt)}\ \mathrm{mol}\end{aligned}\]\[\frac{n(\mathrm{A^-})}{n(\mathrm{HA})}\approx\frac{${tex(nt)}}{${tex(n0-nt)}}=1\]\[\begin{aligned}\mathrm{pH(HÄP)}&\approx\mathrm{p}K_\mathrm{s}+\lg1\\&=${tex(s.pK)}+0=${tex(s.pK)}\end{aligned}\]\[\boxed{\mathrm{pH(HÄP)}\approx\mathrm{p}K_\mathrm{s}=${tex(s.pK)}}\]`;
      else formula+=String.raw`\[\begin{aligned}&n(\mathrm{B})\approx n_0-n_\mathrm{umgesetzt}\\&=${tex(n0-nt)}\ \mathrm{mol}\\&n(\mathrm{BH^+})\approx n_\mathrm{umgesetzt}\\&=${tex(nt)}\ \mathrm{mol}\end{aligned}\]\[\frac{n(\mathrm{BH^+})}{n(\mathrm{B})}\approx\frac{${tex(nt)}}{${tex(n0-nt)}}=1\]\[\begin{aligned}\mathrm{pOH(HÄP)}&\approx\mathrm{p}K_\mathrm{b}+\lg1\\&=${tex(s.pK)}+0=${tex(s.pK)}\end{aligned}\]\[\boxed{\mathrm{pH(HÄP)}\approx\mathrm{p}K_\mathrm{w}-\mathrm{p}K_\mathrm{b}=14-${tex(s.pK)}=${tex(14-s.pK)}}\]`;
      formula+='<p>Das Mengenverhältnis ist näherungsweise 1 : 1. Deshalb ist lg 1 = 0. Die vollständige Bilanz darunter berücksichtigt zusätzlich die Gleichgewichtskorrekturen.</p>';
    }else if(q<1&&s.type.startsWith('weak')){formula=String.raw`\[${sp.acid?'\\mathrm{pH}':'\\mathrm{pOH}'}\approx${sp.acid?'\\mathrm{p}K_\\mathrm{s}':'\\mathrm{p}K_\\mathrm{b}'}+\lg\frac{n_\mathrm{umgesetzt}}{n_0-n_\mathrm{umgesetzt}}=${tex(s.pK)}+\lg\frac{${tex(nt)}}{${tex(n0-nt)}}\]`;if(!sp.acid)formula+=String.raw`\[\mathrm{pH}=\mathrm{p}K_\mathrm{w}-\mathrm{pOH}=14-\mathrm{pOH}\]`;
    }else{formula=excessPoint(sp,q,n0,nt,total);}
    const estimate=C.titrationEstimate({...conf,added});
    const balance=balanceMath(conf,r,sp);
    if(!estimate.usable)formula='<h4>Hier reicht die einfache Näherung nicht.</h4><p>Die Vernachlässigung weiterer Protolyse- oder Wasserbeiträge verändert den pH merklich. Deshalb verwenden wir an diesem Punkt die vollständige Bilanz statt einer Puffer-, Ampholyt- oder reinen Überschussformel.</p>'+balance;
    else formula+='<p>Ergebnis dieses vereinfachten Ansatzes: pH ≈ '+f(estimate.pH)+'. Der Vergleich mit der Bilanz darunter zeigt die verbleibende Näherungsabweichung.</p><details><summary>Die vollständige Bilanz nachvollziehen (Vertiefung)</summary>'+balance+'</details>';
    const definitions='<p><strong>Bezeichnungen für diese Probe:</strong> n₀ ist die anfänglich eingesetzte Stoffmenge der '+(sp.acid?'Säure':'Base')+' ('+s.name+'). c₀ und V₀ bezeichnen deren Anfangskonzentration und Anfangsvolumen. Die Stoffmenge der Maßlösung zählt die insgesamt zugegebene '+(sp.acid?'NaOH':'HCl')+', nicht die frei im Kolben verbliebenen Ionen.</p>'+calculation('n_0=c_0V_0','n_0='+quantity(conf.c)+'\\cdot'+quantity(conf.v/1000,'L')+'='+quantity(n0,'mol'))+calculation('n_\\mathrm{Maßlösung}=c_\\mathrm{Maßlösung}V_\\mathrm{zu}','n_\\mathrm{Maßlösung}='+quantity(conf.ct)+'\\cdot'+quantity(added/1000,'L')+'='+quantity(nt,'mol'))+calculation('V_\\mathrm{gesamt}=V_0+V_\\mathrm{zu}','V_\\mathrm{gesamt}='+quantity(conf.v/1000,'L')+'+'+quantity(added/1000,'L')+'='+quantity(total,'L'))+'<p class="small">HA ist die schwache Säure, A⁻ ihre konjugierte Base; B ist eine schwache Base, BH⁺ ihre konjugierte Säure. x bzw. h bezeichnet c(H₃O⁺), y die OH⁻-Konzentration. Kₛ und pKₛ beschreiben die Säurestärke, Kᵦ und pKᵦ die Basenstärke. K<sub>w</sub> ist das Ionenprodukt des Wassers; bei 25 °C ist pK<sub>w</sub> ≈ 14. Unter dem Logarithmus und in den Radikaltermen werden Zahlenwerte der Konzentrationsgrößen in mol/L eingesetzt. Volumina im Produkt cV in L einsetzen. Vor dem ÄP entspricht n<sub>umgesetzt</sub> in der vereinfachten Mengenrechnung der zugegebenen Maßlösung. <a href="#titration-symbols">Bezeichnungen und Einheiten nachlesen</a>.</p>';
    math(definitions+'<p>Rechenansatz für diesen Punkt. Die Näherungen gelten nur bei dominierendem Stoffbeitrag und hinreichend kleinen Gleichgewichtskorrekturen.</p>'+formula+'<p>h<sub>Bilanz</sub> ist die aus Massen-, Ladungs- und Wasserbilanz numerisch berechnete Oxoniumionen-Konzentration.</p>'+calculation('h_\\mathrm{Bilanz}=c(\\mathrm{H_3O^+})','h_\\mathrm{Bilanz}='+quantity(r.h))+calculation('\\mathrm{pH}_\\mathrm{vollständige\\ Bilanz}=-\\lg h_\\mathrm{Bilanz}','\\mathrm{pH}_\\mathrm{vollständige\\ Bilanz}=-\\lg('+tex(r.h)+')='+tex(r.pH))+'<p>Am HÄP einer schwachen, einprotonigen Säure stammt pH ≈ pKₛ aus dem annähernd gleichen Partnerverhältnis. Bei Phosphorsäure, sehr großer Verdünnung und am Übergang zum Wasserbeitrag ist die Abweichung sichtbar. <a href="#equilibrium-lab">Im Protolyse-Labor nachprüfen</a>.</p>');
  }
  function init(h){
    helpers=h;const select=$('tit-substance');select.replaceChildren();
    for(const [label,items] of [['1 · Starke Säuren',C.substances.filter(s=>s.type==='strong-acid')],['2 · Schwache Säuren',C.substances.filter(s=>s.type==='weak-acid')],['3 · Mehrprotonige Säuren',C.polySubstances],['4 · Basen als zusätzlicher Vergleich',C.substances.filter(s=>s.type.endsWith('base'))]]){const group=document.createElement('optgroup');group.label=label;items.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name+' · '+s.formula;group.append(o);});select.append(group);}
    C.indicators.forEach(i=>{const o=document.createElement('option');o.value=i.id;o.textContent=i.name;$('tit-indicator').append(o);});
    ['tit-substance','tit-c','tit-v','tit-ct'].forEach(id=>$(id).addEventListener('change',restart));
    $('tit-indicator').addEventListener('change',()=>{render();});
    $('tit-dose').addEventListener('change',()=>{$('tit-dose-custom').value='';});
    $('tit-add').onclick=addDose;$('tit-endpoint').onclick=endpoint;$('tit-reset').onclick=restart;
    document.querySelectorAll('[data-practical]').forEach(b=>b.onclick=()=>setPractical(b.dataset.practical));
    $('tit-free').onclick=()=>{clearPractical();restart();};
    $('tit-added').oninput=()=>{stop();added=Number($('tit-added').value);status('Volumen frei gewählt. Beobachte Kurve, pH und Indikatorfarbe.');render();};
    document.querySelectorAll('[data-point]').forEach(b=>b.onclick=()=>{const conf=config();if(!conf)return;stop();const sp=spec(conf);added=sp.unit*({start:0,half:.5,eq:1,after:sp.s.pKs?3.3:1.3}[b.dataset.point]);status('Charakteristischer Punkt gewählt.');render();});
    $('tit-play').onclick=()=>{if(timer){stop();status('Zugabe angehalten.');return;}const conf=config();if(!conf)return;const sp=spec(conf);if(added>=sp.max)added=0;const tick=()=>{added=Math.min(sp.max,added+sp.max/120);busy=true;$('titration-lab').classList.add('is-pouring');$('tit-play').textContent='Ⅱ Anhalten';status('Maßlösung fließt · die Kurve bleibt vollständig sichtbar.');render();if(added>=sp.max){stop();status('Zugabe beendet. Wähle mit dem Schieberegler einen Punkt zum Vergleichen.');}else timer=setTimeout(tick,120);};tick();};
    document.addEventListener('atelier-view-change',()=>render());clearPractical();
  }
  window.AcidTitration={init,render,stop,clearPractical};
})();
