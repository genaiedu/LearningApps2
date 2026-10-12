(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AcidMath=api;})(typeof window==='object'?window:this,function(){
  'use strict';
  // Templates are mathematical notation, never arbitrary learner input.
  const formulas={
    ph:['\\mathrm{pH}=-\\lg c(\\mathrm{H_3O^+})','c(\\mathrm{H_3O^+})=10^{-\\mathrm{pH}}\\ \\mathrm{mol/L}','\\mathrm{pOH}=14-\\mathrm{pH}','c(\\mathrm{OH^-})=10^{-(14-\\mathrm{pH})}\\ \\mathrm{mol/L}','c_2=\\frac{c_1}{F},\\quad\\mathrm{pH}=-\\lg c_2','F=10^{|\\Delta\\mathrm{pH}|}','\\mathrm{pH}_\\mathrm{neutral}=\\frac{\\mathrm{p}K_\\mathrm w}{2}',null,'\\mathrm{pOH}=-\\lg c(\\mathrm{OH^-})','c(\\mathrm{H_3O^+})=\\frac{c_0+\\sqrt{c_0^2+4K_\\mathrm w}}2,\\quad\\mathrm{pH}=-\\lg c(\\mathrm{H_3O^+})'],
    saeuren:['\\mathrm{pH}=-\\lg c_0','K_\\mathrm s=\\frac{x^2}{c_0-x}\\approx\\frac{x^2}{c_0},\\quad x\\approx\\sqrt{K_\\mathrm s c_0},\\quad\\mathrm{pH}\\approx\\frac12(\\mathrm{p}K_\\mathrm s-\\lg c_0)','x^2+K_\\mathrm s x-K_\\mathrm s c_0=0,\\quad x=-\\frac{K_\\mathrm s}2+\\sqrt{\\frac{K_\\mathrm s^2}4+K_\\mathrm s c_0},\\quad\\mathrm{pH}=-\\lg x','\\alpha=\\frac{x}{c_0}','c(\\mathrm{H_3O^+})=10^{-\\mathrm{pH}}\\ \\mathrm{mol/L},\\quad K_\\mathrm s=\\frac{c(\\mathrm{H_3O^+})^2}{c_0-c(\\mathrm{H_3O^+})}','\\mathrm{p}K_\\mathrm s=-\\lg K_\\mathrm s',null,'\\Delta\\mathrm{pH}=\\frac12\\lg F','c=\\frac nV,\\quad\\mathrm{pH}=-\\lg c'],
    basen:['\\mathrm{pOH}=-\\lg c_0,\\quad\\mathrm{pH}=14-\\mathrm{pOH}','y\\approx\\sqrt{K_\\mathrm b c_0},\\quad\\mathrm{pOH}\\approx\\frac12(\\mathrm{p}K_\\mathrm b-\\lg c_0),\\quad\\mathrm{pH}=14-\\mathrm{pOH}','y^2+K_\\mathrm b y-K_\\mathrm b c_0=0,\\quad y=\\frac{\\sqrt{K_\\mathrm b^2+4K_\\mathrm b c_0}-K_\\mathrm b}2,\\quad\\mathrm{pH}=14+\\lg y','\\mathrm{p}K_\\mathrm b=-\\lg K_\\mathrm b','c_2=\\frac{c_1}{F},\\quad\\mathrm{pH}=14+\\lg c_2','c(\\mathrm{OH^-})=2c_0,\\quad\\mathrm{pH}=14+\\lg(2c_0)','\\alpha=\\frac{y}{c_0}',null,'n=cV'],
    konstanten:['\\mathrm{p}K_\\mathrm b=\\mathrm{p}K_\\mathrm w-\\mathrm{p}K_\\mathrm s','K_\\mathrm b=\\frac{K_\\mathrm w}{K_\\mathrm s}','\\mathrm{p}K_\\mathrm s=\\mathrm{p}K_\\mathrm w-\\mathrm{p}K_\\mathrm b','\\mathrm{p}K_\\mathrm w=\\mathrm{pH}+\\mathrm{pOH}','K_\\mathrm s=\\frac{c(\\mathrm{H_3O^+})\\,c(\\mathrm{A^-})}{c(\\mathrm{HA})}','K_\\mathrm s=K_\\mathrm c\\,c(\\mathrm{H_2O})','c(\\mathrm{OH^-})=\\frac{K_\\mathrm w}{c(\\mathrm{H_3O^+})}',null,'\\mathrm{p}K_\\mathrm b=\\mathrm{p}K_\\mathrm w-\\mathrm{p}K_\\mathrm s'],
    titration:['c_\\mathrm A V_\\mathrm A=c_\\mathrm B V_\\mathrm{Ä},\\quad c_\\mathrm A=\\frac{c_\\mathrm B V_\\mathrm{Ä}}{V_\\mathrm A}','V_\\mathrm{Ä}=\\frac{c_\\mathrm A V_\\mathrm A}{c_\\mathrm B}','c_0=\\frac{c(\\mathrm{HCl})V(\\mathrm{HCl})}{V(\\mathrm B)}','2c_\\mathrm A V_\\mathrm A=c_\\mathrm B V_\\mathrm{Ä},\\quad c_\\mathrm A=\\frac{c_\\mathrm B V_\\mathrm{Ä}}{2V_\\mathrm A}','V=V_\\mathrm{Ende}-V_\\mathrm{Anfang}','c_\\mathrm{Original}=F\\,c_\\mathrm{verdünnt}','n=cV',null,'\\overline V=\\frac{V_1+V_2+V_3}{3}','c_\\mathrm A=\\frac{c_\\mathrm B V_\\mathrm{Ä}}{V_\\mathrm A}'],
    kurven:["\\mathrm{pH}\\approx\\frac12(\\mathrm{p}K_\\mathrm s-\\lg c_0)","\\mathrm{pH}_\\mathrm{HÄP}\\approx\\mathrm{p}K_\\mathrm s","c(\\mathrm{H_3O^+})=\\frac{n_0-n(\\mathrm{OH^-})}{V_\\mathrm{gesamt}},\\quad\\mathrm{pH}=-\\lg c(\\mathrm{H_3O^+})","c(\\mathrm{OH^-})=\\frac{n_\\mathrm{NaOH}-n_0}{V_\\mathrm{gesamt}},\\quad\\mathrm{pH}=14+\\lg c(\\mathrm{OH^-})","c(\\mathrm{A^-})=\\frac{n_0}{V_\\mathrm{gesamt}},\\quad\\mathrm{p}K_\\mathrm b=14-\\mathrm{p}K_\\mathrm s,\\quad\\mathrm{pH}\\approx14-\\frac12(\\mathrm{p}K_\\mathrm b-\\lg c(\\mathrm{A^-}))","\\mathrm{pH}\\approx\\mathrm{p}K_\\mathrm s+\\lg\\frac{V}{V_\\mathrm{Ä}-V}","\\mathrm{pH}_\\mathrm{HÄP}\\approx14-\\mathrm{p}K_\\mathrm b"],
    puffer:['\\mathrm{pH}\\approx\\mathrm{p}K_\\mathrm s+\\lg\\frac{n(\\mathrm{A^-})}{n(\\mathrm{HA})}','n_\\mathrm A^{\\prime}=n_\\mathrm A-n_\\mathrm{Zugabe},\\quad n_\\mathrm{HA}^{\\prime}=n_\\mathrm{HA}+n_\\mathrm{Zugabe},\\quad\\mathrm{pH}\\approx\\mathrm{p}K_\\mathrm s+\\lg\\frac{n_\\mathrm A^{\\prime}}{n_\\mathrm{HA}^{\\prime}}','n_\\mathrm A^{\\prime}=n_\\mathrm A+n_\\mathrm{Zugabe},\\quad n_\\mathrm{HA}^{\\prime}=n_\\mathrm{HA}-n_\\mathrm{Zugabe},\\quad\\mathrm{pH}\\approx\\mathrm{p}K_\\mathrm s+\\lg\\frac{n_\\mathrm A^{\\prime}}{n_\\mathrm{HA}^{\\prime}}','\\frac{n(\\mathrm{A^-})}{n(\\mathrm{HA})}=10^{\\mathrm{pH}-\\mathrm{p}K_\\mathrm s}','\\mathrm{pH}\\approx\\mathrm{p}K_\\mathrm s\\Longrightarrow\\lg\\frac{n(\\mathrm{A^-})}{n(\\mathrm{HA})}=0\\Longrightarrow n(\\mathrm{A^-})=n(\\mathrm{HA})',null,null,'\\mathrm{pH}\\approx\\mathrm{p}K_\\mathrm s+\\lg\\frac{n(\\mathrm{A^-})}{n(\\mathrm{HA})}',null,'\\Delta\\mathrm{pH}=\\lg\\frac{r_2}{r_1}']
  };
  const tex=n=>String(Number(n.toPrecision(6))).replace(/e([+-]?\d+)/,'\\cdot10^{$1}').replace('.', '{,}');
  const q=(n,u='mol/L')=>tex(n)+'\\ \\mathrm{'+u+'}';
  const keys={
    ph:'c(H₃O⁺) ist die Oxoniumionen-Konzentration; c(OH⁻) die Hydroxidionen-Konzentration. c₁ und c₂ stehen für vor und nach Verdünnung, F = V₂/V₁ für den Verdünnungsfaktor. ΔpH ist End-pH minus Anfangs-pH.',
    saeuren:'c₀ ist die Anfangskonzentration der Säure; c(H₃O⁺) die Oxoniumionen-Konzentration. x bezeichnet hier die durch Protolyse entstehende Konzentration ohne Wasserbeitrag. Kₛ ist die Säurekonstante, pKₛ ihr negativer normierter Logarithmus. α ist der protolysierte Anteil, F der Verdünnungsfaktor. n ist die Stoffmenge, V das Lösungsvolumen; 1 mmol = 10⁻³ mol.',
    basen:'c₀ ist die Anfangskonzentration der Base; y = c(OH⁻) die Hydroxidionen-Konzentration. Kᵦ und pKᵦ beschreiben die Basenstärke, α den protolysierten Anteil. c₁ und c₂ stehen für vor und nach Verdünnung, F für den Verdünnungsfaktor. n ist die Stoffmenge, V das Lösungsvolumen.',
    konstanten:'Kₛ und Kᵦ gehören zu Säure und Base desselben konjugierten Paares. pKₛ und pKᵦ sind ihre negativen normierten Logarithmen. c(H₃O⁺) und c(A⁻) sind Gleichgewichtskonzentrationen. K_c bezeichnet die schulische Konstante mit Wasser im Nenner.',
    titration:'c_A und V_A sind Konzentration und Volumen der Säureprobe, c_B die NaOH-Konzentration, V_Ä das NaOH-Volumen am ÄP. Bei Basenproben steht c₀ für deren Konzentration, V(B) für ihr Volumen; c(HCl) und V(HCl) gehören zur Säure-Maßlösung. V_Anfang und V_Ende sind Bürettenablesungen, V̄ der Mittelwert, F der Verdünnungsfaktor, n eine Stoffmenge.',
    kurven:'c₀ und V₀ sind Anfangskonzentration und Anfangsvolumen; n₀ = c₀V₀ die Anfangsstoffmenge. n_B,zu ist die zugegebene OH⁻-Menge, nicht das freie OH⁻. n_NaOH bezeichnet dieselbe Zugabe. V_gesamt = V₀ + V_B ist das Mischungsvolumen, V_Ä das Äquivalenzvolumen, V bzw. V_B die bisherige Zugabe. HA ist die Säure, A⁻ ihr konjugierter Partner. pKₛ gehört zur Säure, pKᵦ zur Base.',
    puffer:'HA ist die schwache Säure, A⁻ ihre konjugierte Base; pKₛ gehört zu HA. n bezeichnet Stoffmengen in mmol. Ein Strich (′) kennzeichnet den Zustand nach Zugabe; n_Zugabe ist die zugegebene starke Säure oder Base. r = n(A⁻)/n(HA) ist das Mengenverhältnis; r₁ und r₂ gehören zu den beiden verglichenen Puffern.'
  };
  function worked(task){
    if(task.kind!=='number')return {math:'',symbols:'',calculationSteps:[]};
    const p=task.parameters;if(!p)throw Error('Fehlende Rechengrößen: '+task.id);
    const i=Number(task.id.split('-')[1]),v=p.variant,N=tex,A=task.answer;
    const F=[10,20,50][v],c2=p.c/F,h=10**(-p.p),poh=14-p.p,pkb=14-p.pKa;
    const PH=(c)=>'\\mathrm{pH}=-\\lg('+N(c)+')='+N(-Math.log10(c));
    const root=(k,c)=>'\\frac{\\sqrt{('+N(k)+')^2+4\\cdot('+N(k)+')\\cdot'+N(c)+'}-'+N(k)+'}{2}\\ \\mathrm{mol/L}';
    const weakK=(pk,base=false)=>'K_\\mathrm{'+(base?'b':'s')+'}=10^{-\\mathrm{p}K_\\mathrm{'+(base?'b':'s')+'}}\\ \\mathrm{mol/L}=10^{-'+N(pk)+'}\\ \\mathrm{mol/L}='+q(10**(-pk));
    const subs={
      ph:[
        PH(h),
        'c(\\mathrm{H_3O^+})=10^{-'+N(p.p)+'}\\ \\mathrm{mol/L}='+q(A),
        '\\mathrm{pOH}=14-'+N(p.p)+'='+N(A),
        '\\mathrm{pOH}=14-'+N(p.p)+'='+N(poh)+',\\quad c(\\mathrm{OH^-})=10^{-'+N(poh)+'}\\ \\mathrm{mol/L}='+q(A),
        'c_2=\\frac{'+q(p.c)+'}{'+F+'}='+q(c2)+',\\quad\\mathrm{pH}=-\\lg('+N(c2)+')='+N(A),
        'F=10^{|-'+(v+1)+'|}='+N(A),
        '\\mathrm{pH}_\\mathrm{neutral}=\\frac{'+N([13.26,12.8,14.94][v])+'}{2}='+N(A),
        null,
        '\\mathrm{pOH}=-\\lg('+N(p.c)+')='+N(A),
        'c(\\mathrm{H_3O^+})=\\frac{'+N([1e-8,2e-8,5e-8][v])+'+\\sqrt{('+N([1e-8,2e-8,5e-8][v])+')^2+4\\cdot10^{-14}}}{2}\\ \\mathrm{mol/L}='+q(10**(-A))+',\\quad'+PH(10**(-A))
      ],
      saeuren:[
        '\\mathrm{pH}\\approx-\\lg('+N(p.c)+')='+N(A),
        weakK(p.pKa)+',\\quad x\\approx\\sqrt{'+N(p.ka)+'\\cdot'+N(p.c)+'}\\ \\mathrm{mol/L},\\quad\\mathrm{pH}\\approx\\frac{'+N(p.pKa)+'-\\lg('+N(p.c)+')}{2}='+N(A),
        weakK(p.pKa)+',\\quad x='+root(p.ka,p.c)+'='+q(p.x)+',\\quad'+PH(p.x),
        '\\alpha=\\frac{'+q(p.x)+'}{'+q(p.c)+'}='+N(A/100)+'='+N(A)+'\\ \\%',
        'c(\\mathrm{H_3O^+})=10^{-'+N(Number((-Math.log10(p.x)).toFixed(2)))+'}\\ \\mathrm{mol/L}='+q(10**(-Number((-Math.log10(p.x)).toFixed(2))))+',\\quad K_\\mathrm{s}=\\frac{('+N(10**(-Number((-Math.log10(p.x)).toFixed(2))))+')^2}{'+N(p.c)+'-'+N(10**(-Number((-Math.log10(p.x)).toFixed(2))))+'}\\ \\mathrm{mol/L}='+q(A),
        '\\mathrm{p}K_\\mathrm{s}=-\\lg('+N(10**(-p.pk))+')='+N(A),
        null,
        '\\Delta\\mathrm{pH}=\\tfrac12\\lg('+[10,100,1000][v]+')='+N(A),
        'n='+q(p.c*1000,'mmol')+'='+q(p.c,'mol')+',\\quad c=\\frac{'+q(p.c,'mol')+'}{1{,}00\\ \\mathrm{L}}='+q(p.c)+',\\quad\\mathrm{pH}\\approx-\\lg('+N(p.c)+')='+N(A)
      ],
      basen:[
        '\\mathrm{pOH}\\approx-\\lg('+N(p.c)+')='+N(-Math.log10(p.c))+',\\quad\\mathrm{pH}\\approx14-'+N(-Math.log10(p.c))+'='+N(A),
        weakK(p.pKb,true)+',\\quad y\\approx\\sqrt{'+N(p.kb)+'\\cdot'+N(p.c)+'}\\ \\mathrm{mol/L},\\quad\\mathrm{pOH}\\approx\\frac{'+N(p.pKb)+'-\\lg('+N(p.c)+')}{2},\\quad\\mathrm{pH}\\approx14-\\frac{'+N(p.pKb)+'-\\lg('+N(p.c)+')}{2}='+N(A),
        weakK(p.pKb,true)+',\\quad y='+root(p.kb,p.c)+'='+q(p.y)+',\\quad\\mathrm{pH}\\approx14+\\lg('+N(p.y)+')='+N(A),
        '\\mathrm{p}K_\\mathrm{b}=-\\lg('+N(p.kb)+')='+N(A),
        'c_2=\\frac{'+q(p.c)+'}{'+F+'}='+q(c2)+',\\quad\\mathrm{pH}\\approx14+\\lg('+N(c2)+')='+N(A),
        'c(\\mathrm{OH^-})=2\\cdot'+q(p.c/10)+'='+q(p.c/5)+',\\quad\\mathrm{pH}\\approx14+\\lg('+N(p.c/5)+')='+N(A),
        '\\alpha=\\frac{'+q(p.y)+'}{'+q(p.c)+'}='+N(A/100)+'='+N(A)+'\\ \\%',
        null,
        'n='+q(p.c)+'\\cdot'+q([20,50,100][v]/1000,'L')+'='+q(A/1000,'mol')+'='+q(A,'mmol')
      ],
      konstanten:[
        '\\mathrm{p}K_\\mathrm{b}\\approx14-'+N(p.pKa)+'='+N(A),
        'K_\\mathrm{b}=\\frac{10^{-14}\\ (\\mathrm{mol/L})^2}{'+q(p.ka)+'}='+q(A),
        '\\mathrm{p}K_\\mathrm{s}\\approx14-'+N(p.pKb)+'='+N(A),
        '\\mathrm{p}K_\\mathrm{w}='+N(p.p)+'+'+N(14-p.p)+'='+N(A),
        'K_\\mathrm{s}=\\frac{'+q(p.x)+'\\cdot'+q(p.x)+'}{'+q(p.c-p.x)+'}='+q(A),
        'K_\\mathrm{s}='+N(p.ka/55.5)+'\\cdot55{,}5\\ \\mathrm{mol/L}='+q(A),
        'c(\\mathrm{OH^-})=\\frac{10^{-14}\\ (\\mathrm{mol/L})^2}{'+q(h)+'}='+q(A),
        null,
        '\\mathrm{p}K_\\mathrm{b}='+N([13.3,13.6,14.4][v])+'-'+N(p.pk)+'='+N(A)
      ],
      titration:[
        'c_\\mathrm{A}=\\frac{'+q(p.ct)+'\\cdot'+q(p.veq,'mL')+'}{'+q(p.va,'mL')+'}='+q(A),
        'V_\\mathrm{Ä}=\\frac{'+q(p.ca)+'\\cdot'+q(p.va,'mL')+'}{'+q(p.ct)+'}='+q(A,'mL'),
        'c_0=\\frac{'+q(p.ct)+'\\cdot'+q(p.veq,'mL')+'}{'+q(p.va,'mL')+'}='+q(A),
        'c_\\mathrm{A}=\\frac{'+q(p.ct)+'\\cdot'+q(p.veq,'mL')+'}{2\\cdot'+q(p.va,'mL')+'}='+q(A),
        'V='+q(p.veq+[1.2,2.4,3.1][v],'mL')+'-'+q([1.2,2.4,3.1][v],'mL')+'='+q(A,'mL'),
        'c_\\mathrm{Original}='+[5,10,20][v]+'\\cdot'+q(p.ca)+'='+q(A),
        'n='+q(p.ct)+'\\cdot'+q(p.veq/1000,'L')+'='+q(A/1000,'mol')+'='+q(A,'mmol'),
        null,
        '\\overline V=\\frac{'+q(p.veq-.2,'mL')+'+'+q(p.veq,'mL')+'+'+q(p.veq+.2,'mL')+'}{3}='+q(A,'mL')
      ],
      kurven:[
        '\\mathrm{pH}\\approx\\tfrac12('+N(p.pKa)+'-\\lg0{,}100)='+N(A),
        '\\mathrm{pH(HÄP)}\\approx'+N(p.pKa)+'+\\lg1='+N(A),
        null,null,
        'c(\\mathrm{A^-})=0{,}0500\\ \\mathrm{mol/L},\\quad\\mathrm{p}K_\\mathrm{b}\\approx14-'+N(p.pKa)+'='+N(pkb)+',\\quad\\mathrm{pH}\\approx14-\\frac{'+N(pkb)+'-\\lg0{,}0500}{2}='+N(A),
        '\\mathrm{pH}\\approx'+N(p.pKa)+'+\\lg\\frac{'+q([5,10,20][v],'mL')+'}{'+q(25,'mL')+'-'+q([5,10,20][v],'mL')+'}='+N(A),
        '\\mathrm{pOH(HÄP)}\\approx'+N(p.pKb)+',\\quad\\mathrm{pH(HÄP)}\\approx14-'+N(p.pKb)+'='+N(A)
      ],
      puffer:[
        '\\mathrm{pH}\\approx'+N(p.pKa)+'+\\lg\\frac{'+q(p.a,'mmol')+'}{'+q(p.ha,'mmol')+'}='+N(A),
        'n_\\mathrm{A}^{\\prime}=(10-'+p.delta+')\\ \\mathrm{mmol}='+q(10-p.delta,'mmol')+',\\quad n_\\mathrm{HA}^{\\prime}=(10+'+p.delta+')\\ \\mathrm{mmol}='+q(10+p.delta,'mmol')+',\\quad\\mathrm{pH}\\approx'+N(p.pKa)+'+\\lg\\frac{'+q(10-p.delta,'mmol')+'}{'+q(10+p.delta,'mmol')+'}='+N(A),
        'n_\\mathrm{A}^{\\prime}=(10+'+p.delta+')\\ \\mathrm{mmol}='+q(10+p.delta,'mmol')+',\\quad n_\\mathrm{HA}^{\\prime}=(10-'+p.delta+')\\ \\mathrm{mmol}='+q(10-p.delta,'mmol')+',\\quad\\mathrm{pH}\\approx'+N(p.pKa)+'+\\lg\\frac{'+q(10+p.delta,'mmol')+'}{'+q(10-p.delta,'mmol')+'}='+N(A),
        '\\frac{n(\\mathrm{A^-})}{n(\\mathrm{HA})}=10^{'+N(p.pKa+[.3,.6,1][v])+'-'+N(p.pKa)+'}='+N(A),
        'n(\\mathrm{A^-})=n(\\mathrm{HA})='+q(p.ha,'mmol'),
        null,null,
        '\\mathrm{pH}\\approx'+N(p.pKa)+'+\\lg('+N([.1,1,10][v])+')='+N(A),
        null,
        '\\Delta\\mathrm{pH}=\\lg\\frac{'+[2,5,10][v]+'}{1}='+N(A)
      ]
    };
    let formula=formulas[task.group]?.[i],sub=subs[task.group]?.[i];
    if(task.group==='kurven'&&(i===2||i===3)){
      const vb=(i===2?[5,10,15]:[30,35,40])[v]/1000,nt=.1*vb,n0=.0025,total=.025+vb,ion=i===2?'H_3O^+':'OH^-',rest=Math.abs(n0-nt);
      formula='n_0=c_0V_0,\\quad n_{\\mathrm{B,zu}}=c_\\mathrm{B}V_\\mathrm{B},\\quad V_\\mathrm{gesamt}=V_0+V_\\mathrm{B},\\quad '+formulas.kurven[i].replaceAll('n(\\mathrm{OH^-})','n_{\\mathrm{B,zu}}');
      sub='n_0='+q(.1)+'\\cdot'+q(.025,'L')+'='+q(n0,'mol')+',\\quad n_{\\mathrm{B,zu}}='+q(.1)+'\\cdot'+q(vb,'L')+'='+q(nt,'mol')+',\\quad V_\\mathrm{gesamt}='+q(.025,'L')+'+'+q(vb,'L')+'='+q(total,'L')+',\\quad c(\\mathrm{'+ion+'})\\approx\\frac{'+q(i===2?n0:nt,'mol')+'-'+q(i===2?nt:n0,'mol')+'}{'+q(total,'L')+'}='+q(rest/total)+',\\quad\\mathrm{pH}\\approx'+(i===2?'-':'14+')+'\\lg('+N(rest/total)+')='+N(A);
    }

    let interpretation='';
    if((task.group==='saeuren'||task.group==='basen')&&i===1){
      const base=task.group==='basen',c=base?p.cApproxBase:p.cApproxAcid,k=base?p.kb:p.ka,pk=base?p.pKb:p.pKa,ion=base?'y':'x',subscript=base?'b':'s',z=Math.sqrt(k*c);
      formula='K_\\mathrm{'+subscript+'}=10^{-\\mathrm{p}K_\\mathrm{'+subscript+'}}\\ \\mathrm{mol/L},\\quad '+ion+'\\approx\\sqrt{K_\\mathrm{'+subscript+'}c_0},\\quad \\alpha_\\mathrm{Näherung}=\\frac{'+ion+'}{c_0},\\quad \\mathrm{'+(base?'pOH':'pH')+'}\\approx-\\lg '+ion+(base?',\\quad \\mathrm{pH}=\\mathrm{p}K_\\mathrm{w}-\\mathrm{pOH}':'');
      sub=weakK(pk,base)+',\\quad '+ion+'\\approx\\sqrt{'+q(k)+'\\cdot'+q(c)+'}='+q(z)+',\\quad \\alpha_\\mathrm{Näherung}=\\frac{'+q(z)+'}{'+q(c)+'}='+N(z/c)+'='+N(100*z/c)+'\\,\\%';
      sub+=',\\quad \\mathrm{'+(base?'pOH':'pH')+'}\\approx-\\lg('+N(z)+')='+N(-Math.log10(z))+(base?',\\quad\\mathrm{pH}\\approx14-('+N(-Math.log10(z))+')='+N(A):'');
      interpretation='Der geschätzte Protolyseanteil liegt unter 5 %, der Wasserbeitrag ist klein. Die Wurzelnäherung ist für diese Aufgabe geeignet.';
    }
    if(task.group==='kurven'&&i===4){
      formula='n_0=c_0V_0,\\quad V_\\mathrm{Ä}=\\frac{n_0}{c_\\mathrm{B}},\\quad c_\\mathrm{t}=\\frac{n_0}{V_0+V_\\mathrm{Ä}},\\quad\\mathrm{p}K_\\mathrm{b}=\\mathrm{p}K_\\mathrm{w}-\\mathrm{p}K_\\mathrm{s},\\quad\\mathrm{pOH}\\approx\\frac12(\\mathrm{p}K_\\mathrm{b}-\\lg c_\\mathrm{t}),\\quad\\mathrm{pH}=\\mathrm{p}K_\\mathrm{w}-\\mathrm{pOH}';
      sub='n_0='+q(.1)+'\\cdot'+q(.025,'L')+'='+q(.0025,'mol')+',\\quad V_\\mathrm{Ä}=\\frac{'+q(.0025,'mol')+'}{'+q(.1)+'}='+q(.025,'L')+',\\quad c_\\mathrm{t}=\\frac{'+q(.0025,'mol')+'}{'+q(.025,'L')+'+'+q(.025,'L')+'}='+q(.05)+',\\quad\\mathrm{p}K_\\mathrm{b}=14-'+N(p.pKa)+'='+N(pkb)+',\\quad\\mathrm{pOH}\\approx\\tfrac12('+N(pkb)+'-\\lg0{,}0500)='+N(14-A)+',\\quad\\mathrm{pH}\\approx14-'+N(14-A)+'='+N(A);
      interpretation='Am Äquivalenzpunkt bestimmt die konjugierte Base den pH. Die Lösung ist basisch, obwohl die stöchiometrische Neutralisation abgeschlossen ist.';
    }

    if(!formula||!sub)throw Error('Fehlender Rechenweg: '+task.id);
    formula=formula.replaceAll('14','\\mathrm{p}K_\\mathrm{w}');
    const unit=task.unit==='mol/L'?'\\ \\mathrm{mol/L}':['mL','mmol'].includes(task.unit)?'\\ \\mathrm{'+task.unit+'}':task.unit==='%'?'\\ \\%':'';
    const blocks=source=>source.split(/,\\quad /).map(line=>'\\['+line+'\\]').join('');
    const specific={
      titration:[
        'c_A ist die gesuchte Säurekonzentration, V_A das Volumen der Säureprobe. c_B ist die NaOH-Konzentration, V_Ä ihr Verbrauch am ÄP. Die Volumeneinheit mL kürzt sich im Quotienten.',
        'c_A und V_A sind Konzentration und Volumen der Säureprobe; c_B gehört zur NaOH-Maßlösung. V_Ä ist das gesuchte Äquivalenzvolumen.',
        'c₀ ist die gesuchte Konzentration der Base B, V(B) ihr Probenvolumen. c(HCl) und V(HCl) gehören zur verbrauchten HCl-Maßlösung.',
        'c_A und V_A gehören zur zweiprotonigen Säureprobe; c_B und V_Ä zur NaOH-Maßlösung. Der Koeffizient 2 steht für beide vollständig neutralisierten Protonen je Säuremolekül.',
        'V_Anfang und V_Ende sind die beiden Ablesungen an der Bürette; V ist das dazwischen abgegebene Volumen. Nicht den Endstand allein verwenden.',
        'F ist der Verdünnungsfaktor; c_verdünnt die gemessene Konzentration, c_Original die gesuchte ursprüngliche Konzentration.',
        'c ist die Maßlösungs-Konzentration, V das verbrauchte Volumen, n die gesuchte Stoffmenge. mL werden in L und anschließend mol in mmol umgerechnet.',
        null,
        'V₁, V₂ und V₃ sind die drei gemessenen Verbrauchswerte in mL. V̄ ist ihr arithmetischer Mittelwert; 3 ist die Zahl der Messungen.'
      ],
      kurven:[
        'c₀ = 0,100 mol/L ist die Anfangskonzentration der Säureprobe; pKₛ beschreibt die Säurestärke. Gesucht ist ihr Anfangs-pH nach der Wurzelnäherung.',
        'pKₛ gehört zur schwachen Säure HA. Am HÄP sind die Mengen HA und ihrer konjugierten Base A⁻ näherungsweise gleich; deshalb ist das Verhältnis 1.',
        keys.kurven,keys.kurven,
        'cₜ = 0,0500 mol/L ist die analytische Gesamtkonzentration; c(A⁻) ≈ cₜ gilt bei kleinem Hydrolyseanteil. pKᵦ gehört zu A⁻, pKₛ zur anfänglichen Säure. pOH wird aus der Basenreaktion berechnet.',
        'pKₛ gehört zur schwachen Säure. V ist das bisher zugegebene NaOH-Volumen, V_Ä ihr Äquivalenzvolumen. c_B(V_Ä − V) ist die näherungsweise noch nicht umgesetzte Säuremenge; beide Volumina müssen dieselbe Einheit haben.',
        'pKᵦ gehört zur schwachen Base B. Am HÄP sind B und BH⁺ näherungsweise gleich häufig; deshalb gilt pOH ≈ pKᵦ. pH folgt aus dem Wasser-Gleichgewicht.'
      ],
      puffer:[
        'HA ist die schwache Säure, A⁻ ihre konjugierte Base; pKₛ gehört zu HA. n(HA) und n(A⁻) sind ihre Stoffmengen im gleichen Volumen, hier in mmol.',
        'n_A und n_HA sind die Anfangsmengen von A⁻ und HA; der Strich (′) kennzeichnet die Mengen nach Zugabe. n_Zugabe ist die HCl-Menge. HCl verbraucht A⁻ und bildet HA. pKₛ gehört zu HA.',
        'n_A und n_HA sind die Anfangsmengen von A⁻ und HA; der Strich (′) kennzeichnet die Mengen nach Zugabe. n_Zugabe ist die NaOH-Menge. NaOH verbraucht HA und bildet A⁻. pKₛ gehört zu HA.',
        'n(A⁻)/n(HA) ist das gesuchte Stoffmengenverhältnis aus konjugierter Base und Säure. pH ist der Zielwert, pKₛ gehört zur Säure HA.',
        'n(HA) ist die vorhandene Säuremenge, n(A⁻) die gesuchte Menge der konjugierten Base. Beim Ziel-pH gleich pKₛ sind beide Mengen näherungsweise gleich.',
        null,null,
        'n(A⁻)/n(HA) ist das vorgegebene Stoffmengenverhältnis aus konjugierter Base und Säure. pKₛ gehört zur Säure; gesucht ist der zugehörige Puffer-pH.',
        null,
        'r₁ und r₂ sind die Stoffmengenverhältnisse A⁻/HA im ersten und zweiten Puffer. ΔpH = pH₂ − pH₁ ist ihre pH-Differenz; beide Puffer haben denselben pKₛ.'
      ],
      ph:[
        'c(H₃O⁺) ist die Oxoniumionen-Konzentration; lg der Zehnerlogarithmus. pH ist der gesuchte negative Logarithmus des normierten Konzentrationswertes.',
        'pH ist der vorgegebene negative Logarithmus; c(H₃O⁺) die daraus gesuchte Oxoniumionen-Konzentration.',
        'pH und pOH beschreiben die Oxonium- bzw. Hydroxidionen-Konzentration als negative normierte Logarithmen. pK_w gehört zum Ionenprodukt des Wassers.',
        'pH ist vorgegeben; pOH beschreibt die Hydroxidionen-Konzentration c(OH⁻). pK_w gehört zum Ionenprodukt des Wassers.',
        'c₁ und c₂ sind die HCl-Konzentrationen vor und nach dem Verdünnen. F = V₂/V₁ ist der Verdünnungsfaktor; die Stoffmenge bleibt gleich.',
        'ΔpH ist End-pH minus Anfangs-pH, beim Sinken also negativ. F ist der Faktor, um den die H₃O⁺-Konzentration zunimmt.',
        'pK_w gehört zum Ionenprodukt des Wassers bei der angegebenen Temperatur. Im neutralen Wasser sind H₃O⁺- und OH⁻-Konzentration gleich.',
        null,
        'c(OH⁻) ist die Hydroxidionen-Konzentration. pOH ist ihr negativer normierter Zehnerlogarithmus; lg bedeutet Zehnerlogarithmus.',
        'c₀ ist die zugesetzte HCl-Konzentration; c(H₃O⁺) enthält auch den Wasserbeitrag. K_w ist das Ionenprodukt des Wassers.'
      ],
      saeuren:[
        'c₀ ist die Anfangskonzentration der einprotonigen starken HCl; ihre H₃O⁺-Konzentration entspricht ihr hier näherungsweise.',
        'c₀ ist die Anfangskonzentration der Säure; Kₛ und pKₛ beschreiben ihre Säurestärke. x ist die entstehende H₃O⁺-Konzentration; α_Näherung = x/c₀ ist der damit geschätzte protolysierte Anteil.',
        'c₀ ist die Anfangskonzentration der Säure; Kₛ und pKₛ beschreiben ihre Säurestärke. x ist die gesuchte H₃O⁺-Konzentration ohne Wasserbeitrag.',
        'x ist die quadratisch berechnete H₃O⁺-Konzentration, c₀ die Anfangskonzentration. α = x/c₀ ist der protolysierte Anteil; 0,01 entspricht 1 %.',
        'c(H₃O⁺) wird aus dem vorgegebenen pH berechnet. c₀ ist die Anfangskonzentration, c₀ − c(H₃O⁺) die verbleibende Säure-Konzentration, Kₛ die gesuchte Säurekonstante.',
        'Kₛ ist die vorgegebene Säurekonstante; pKₛ ihr negativer normierter Zehnerlogarithmus.',
        null,
        'F = V₂/V₁ ist der Verdünnungsfaktor; ΔpH = pH₂ − pH₁ beschreibt die dadurch bewirkte pH-Änderung in der Wurzelnäherung.',
        'n ist die gelöste HCl-Stoffmenge, V = 1,00 L das Endvolumen, c die resultierende Konzentration. 1 mmol = 10⁻³ mol.'
      ],
      basen:[
        'c₀ ist die NaOH-Anfangskonzentration und näherungsweise c(OH⁻). pOH beschreibt deren negativen normierten Logarithmus; pH folgt aus dem Wasser-Gleichgewicht.',
        'c₀ ist die Anfangskonzentration der Base; Kᵦ/pKᵦ beschreiben ihre Basenstärke. y = c(OH⁻) ist die entstehende Hydroxidionen-Konzentration; α_Näherung = y/c₀ ist der damit geschätzte protolysierte Anteil.',
        'c₀ ist die Anfangskonzentration der Base; Kᵦ/pKᵦ beschreiben ihre Basenstärke. y = c(OH⁻) wird ohne Wurzelnäherung berechnet.',
        'Kᵦ ist die vorgegebene Basenkonstante; pKᵦ ihr negativer normierter Zehnerlogarithmus.',
        'c₁ und c₂ sind die NaOH-Konzentrationen vor und nach Verdünnung; F = V₂/V₁ ist der Verdünnungsfaktor.',
        'c₀ ist die Ca(OH)₂-Konzentration; c(OH⁻) die daraus bereitgestellte Hydroxidionen-Konzentration. Der Koeffizient 2 gehört zu den zwei OH⁻ je Formeleinheit.',
        'y = c(OH⁻) ist die entstandene Hydroxidionen-Konzentration, c₀ die Anfangskonzentration der Base. α = y/c₀ ist der protolysierte Anteil; 0,01 entspricht 1 %.',
        null,
        'c ist die NaOH-Konzentration, V das Lösungsvolumen, n die gesuchte OH⁻-Stoffmenge. V wird von mL in L umgerechnet; das Ergebnis von mol in mmol.'
      ],
      konstanten:[
        'pKₛ gehört zur gegebenen Säure, pKᵦ zur gesuchten konjugierten Base. pK_w beschreibt das Ionenprodukt des Wassers bei der vorgegebenen Temperatur.',
        'Kₛ gehört zur gegebenen Säure, Kᵦ zur konjugierten Base, K_w zum Ionenprodukt des Wassers. Es muss genau dasselbe konjugierte Paar sein.',
        'pKᵦ gehört zur gegebenen Base B, pKₛ zur gesuchten konjugierten Säure BH⁺; pK_w beschreibt das Ionenprodukt des Wassers.',
        'pH und pOH sind die angegebenen negativen normierten Logarithmen der Ionenkonzentrationen. pK_w ist der gesuchte negative normierte Logarithmus ihres Produkts.',
        'c(H₃O⁺), c(A⁻) und c(HA) sind die vorgegebenen Gleichgewichtskonzentrationen. Kₛ ist die daraus gesuchte Säurekonstante.',
        'HA ist die Säure, A⁻ ihre konjugierte Base, c(X) jeweils eine Gleichgewichtskonzentration. K_c gehört zum vollständigen Konzentrations-MWG der Reaktion HA + H₂O ⇌ H₃O⁺ + A⁻. c_W,ref = 55,5 mol/L ist der näherungsweise konstante Wasserwert. c(H₂O) ≈ c_W,ref ist eine sehr gute Näherung für verdünnte Lösungen; Wasser ist nicht exakt unveränderlich.',
        'c(H₃O⁺) ist die vorgegebene Oxoniumionen-Konzentration. K_w ist das Ionenprodukt, c(OH⁻) die gesuchte Hydroxidionen-Konzentration.',
        null,
        'pKₛ gehört zur gegebenen Säure, pKᵦ zur konjugierten Base. pK_w ist ausdrücklich der Wert bei der angegebenen anderen Temperatur.'
      ]
    };
    let symbols=specific[task.group]?.[i]||keys[task.group];
    if(task.group==='konstanten'&&i===5){
      formula='K_\\mathrm{c}=\\frac{c(\\mathrm{H_3O^+})c(\\mathrm{A^-})}{c(\\mathrm{HA})c(\\mathrm{H_2O})},\\quad c(\\mathrm{H_2O})\\approx c_{\\mathrm{W,ref}},\\quad K_\\mathrm{s}:=K_\\mathrm{c}c_{\\mathrm{W,ref}}';
    }
    if(formula.includes('K_\\mathrm{w}'))symbols+=' pK_w ist der negative normierte Logarithmus des Ionenprodukts K_w. '+((task.group==='ph'&&i===6)||(task.group==='konstanten'&&i===8)?'Hier gilt der vorgegebene Temperaturwert.':'Bei 25 °C: pK_w ≈ 14, K_w = 10⁻¹⁴ (mol/L)².');
    if(/K_|p\\}K_|pK/.test(formula))symbols+=' Die Konzentrationskonstanten enthalten den Wasserfaktor aus dem vollständigen MWG: einen Faktor für Kₛ/Kᵦ, dessen Quadrat für K_w. Dabei wird die Wasserkonzentration in verdünnten Lösungen nur näherungsweise als konstant behandelt. Das vernachlässigt noch nicht den Ionenbeitrag der Autoprotolyse.';
    if(formula.includes('\\lg'))symbols+=' Konzentrationswerte im Logarithmus werden auf 1 mol/L bezogen; pH, pOH und pK sind einheitenlos.';
    if(formula.includes('\\sqrt'))symbols+=' In den Radikaltermen werden Zahlenwerte der Konzentrationsgrößen in mol/L eingesetzt.';
    const symbolNames={'c_W,ref':'c_{\\mathrm{W,ref}}','α_Näherung':'\\alpha_\\mathrm{Näherung}','pK_w':'\\mathrm{p}K_\\mathrm{w}','K_w':'K_\\mathrm{w}','K_c':'K_\\mathrm{c}','c_A':'c_\\mathrm{A}','V_A':'V_\\mathrm{A}','c_B':'c_\\mathrm{B}','V_B':'V_\\mathrm{B}','V_Ä':'V_\\mathrm{Ä}','V_Anfang':'V_\\mathrm{Anfang}','V_Ende':'V_\\mathrm{Ende}','V_gesamt':'V_\\mathrm{gesamt}','c_verdünnt':'c_\\mathrm{verdünnt}','c_Original':'c_\\mathrm{Original}','n_B,zu':'n_{\\mathrm{B,zu}}','n_NaOH':'n_\\mathrm{NaOH}','n_Zugabe':'n_\\mathrm{Zugabe}','n_HA':'n_\\mathrm{HA}','n_A':'n_\\mathrm{A}','α_%':'\\alpha_\\%'};
    symbols=symbols.replace(/c_W,ref|α_Näherung|pK_w|K_w|K_c|c_A|V_Anfang|V_Ende|V_gesamt|V_A|c_B|V_B|V_Ä|c_verdünnt|c_Original|n_B,zu|n_NaOH|n_Zugabe|n_HA|n_A|α_%/g,name=>'\\('+symbolNames[name]+'\\)');
    const rounded=['pH','pOH','pK'].includes(task.unit)?task.answer.toFixed(2).replace('.',','):Number(task.answer.toPrecision(3)).toLocaleString('de-DE',{maximumSignificantDigits:3});
    const response=['pH','pOH','pK'].includes(task.unit)?'Der gesuchte '+task.unit+'-Wert beträgt '+rounded+'.':'Die gesuchte Größe beträgt '+rounded+(task.unit?' '+task.unit:'')+'.';
    return {symbols,calculationSteps:[{formula,substitution:sub}],math:blocks(formula)+blocks(sub)+'\\[\\boxed{\\text{Ergebnis: }'+N(['pH','pOH','pK'].includes(task.unit)?Number(A.toFixed(2)):Number(A.toPrecision(3)))+unit+'}\\]',explanation:'Antwort: '+response+' '+(interpretation||'Es gelten die genannten Modellbedingungen; erst das Endergebnis runden.')};
  }
  function solution(task){return worked(task).math;}
  return {solution,worked};
});
