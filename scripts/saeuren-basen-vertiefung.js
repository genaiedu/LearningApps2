(()=>{
  'use strict';
  const C=window.AcidMission,$=id=>document.getElementById(id),f=n=>n.toLocaleString('de-DE',{maximumFractionDigits:3});
  $('blood-hint-button').onclick=()=>{$('blood-hint').hidden=false;$('blood-hint-button').disabled=true;};
  $('blood-solution-button').onclick=()=>{$('blood-solution').hidden=!$('blood-solution').hidden;$('blood-solution-button').textContent=$('blood-solution').hidden?'Lösungsweg anzeigen':'Lösungsweg schließen';if(!$('blood-solution').hidden)window.AcidTypeset.typeset([$('blood-solution')]);};
  function hagg(){
    const phosphate=$('hagg-system').value==='phosphoric',pKs=phosphate?[2.15,7.21,12.35]:[4.76],names=phosphate?['H₃PO₄','H₂PO₄⁻','HPO₄²⁻','PO₄³⁻']:['CH₃COOH','CH₃COO⁻'],colors=['#2875bb','#ce6343','#729b36','#ad67a4'],ct=Number($('hagg-c').value),pH=Number($('hagg-ph').value),x=p=>65+p/14*680,y=log=>390-(log+14)/14*340;
    $('hagg-label').textContent=f(pH);let svg='<rect width="800" height="470" fill="var(--white)"/>';
    for(let p=0;p<=14;p+=2)svg+='<path d="M'+x(p)+' 50V390" stroke="var(--line)"/><text x="'+x(p)+'" y="414" text-anchor="middle" fill="var(--muted)" font-size="13">'+p+'</text>';
    for(let log=-14;log<=0;log+=2)svg+='<path d="M65 '+y(log)+'H745" stroke="var(--line)"/><text x="53" y="'+(y(log)+4)+'" text-anchor="end" fill="var(--muted)" font-size="13">'+log+'</text>';
    const path=(fn,color,dash='')=>'<path d="'+Array.from({length:281},(_,i)=>{const p=i/20,log=Math.max(-14,Math.min(0,fn(p)));return (i?'L':'M')+x(p).toFixed(2)+' '+y(log).toFixed(2);}).join(' ')+'" stroke="'+color+'" stroke-width="2.5" fill="none" '+dash+'/>';
    names.forEach((_,i)=>{svg+=path(p=>Math.log10(ct*C.fractions(p,pKs)[i]),colors[i]);});svg+=path(p=>-p,'var(--muted)','stroke-dasharray="6 4"')+path(p=>p-14,'var(--muted)','stroke-dasharray="2 4"');
    pKs.forEach((pk,i)=>{svg+='<path d="M'+x(pk)+' 50V390" stroke="var(--red)" stroke-dasharray="4 6"/><text x="'+x(pk)+'" y="35" text-anchor="middle" fill="var(--ink)" font-size="13">pKₛ'+(i+1)+' '+f(pk)+'</text>';});
    svg+='<path d="M'+x(pH)+' 50V390" stroke="var(--ink)"/><text x="25" y="24" fill="var(--ink)" font-size="14">lg(c / mol·L⁻¹)</text><text x="410" y="445" text-anchor="middle" fill="var(--ink)" font-size="14">pH · Teilchenverteilung bei vorgegebenem pH</text>';$('hagg-chart').innerHTML=svg;
    const alpha=C.fractions(pH,pKs);$('hagg-values').replaceChildren(...names.map((name,i)=>{const el=document.createElement('div');el.innerHTML='<small>'+name+' · Linie '+(i+1)+'</small><strong>'+f(alpha[i]*100)+' %</strong><small>'+ (ct*alpha[i]).toExponential(3).replace('.',',')+' mol/L</small>';el.style.borderTop='4px solid '+colors[i];return el;}));
  }
  ['hagg-system','hagg-c','hagg-ph'].forEach(id=>$(id).addEventListener('input',hagg));document.addEventListener('atelier-view-change',hagg);hagg();
})();
