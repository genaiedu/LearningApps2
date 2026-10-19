(function(){
  'use strict';
  const C=window.TypoSchoolScreen,$=id=>document.getElementById(id);
  if(!C||!$('tablet-lab'))return;
  document.documentElement.classList.add('school-screen-ready');
  const decimal=(n,d=1)=>n.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
  const texDecimal=(n,d)=>Number(n).toFixed(d).replace('.','{,}');
  let mathQueue=Promise.resolve(),mathEpoch=0;
  function projection(){
    const inputs=['projection-distance','projection-width'];
    if(inputs.some(id=>!$(id).checkValidity())){mathEpoch++;$('projection-result').textContent='Bitte gültige positive Maße eingeben.';$('projection-work').textContent='';$('projection-equation').textContent='';return;}
    const r=C.projection({distance:$('projection-distance').value,width:$('projection-width').value,aspect:$('projection-aspect').value,document:$('projection-document').value,font:$('projection-font').value});
    const proof=$('projection-proof');proof.style.fontFamily='"'+(r.font||'Fira Sans')+'"';proof.classList.toggle('projection-washed',$('projection-wash').checked);
    if(!r.supported){mathEpoch++;$('projection-result').textContent='Diese Entfernung liegt außerhalb der hier übernommenen AVIXA-Tabelle (Verhältnis 0,8 bis 10). Kein Punktwert wird hochgerechnet. Bitte die Anlage vor Ort prüfen.';$('projection-work').textContent='';$('projection-equation').textContent='';return;}
    $('projection-result').textContent='Orientierung für dieses Beispiel: '+decimal(r.elementMm/10,2)+' cm Kleinbuchstabenhöhe im Bild; dafür rund '+Math.ceil(r.points)+' pt '+r.font+' im auf diese Breite vergrößerten A4-Dokument. Keine garantierte Mindestlesegröße.';
    proof.style.setProperty('--projection-sample-size',Math.min(52,Math.max(18,r.points*96/72))+'px');
    const lines=[
      'Bildhöhe: '+decimal(r.width,2)+' m × '+$('projection-aspect').value.split(':').reverse().join(' / ')+' = '+decimal(r.height,2)+' m.',
      'Entfernung / Bildhöhe: '+decimal(r.distance,2)+' m / '+decimal(r.height,2)+' m ≈ '+decimal(r.ratio,2)+'. Tabellenstufe: '+decimal(r.elementFraction*100,2)+' % Bildhöhe.',
      'Elementhöhe: '+decimal(r.height*100,2)+' cm × '+decimal(r.elementFraction,4)+' = '+decimal(r.elementMm/10,2)+' cm.',
      'Vergrößerung des Dokuments: '+decimal(r.width*1000,0)+' mm / '+r.documentWidth+' mm ≈ '+decimal(r.enlargement,2)+'. Kleinbuchstabenhöhe der Schrift: '+decimal(r.xHeight,3)+' der Schriftgröße.'
    ];
    const work=$('projection-work');work.replaceChildren();for(const line of lines){const p=document.createElement('p');p.textContent=line;work.append(p);}
    const epoch=++mathEpoch;
    mathQueue=mathQueue.then(async()=>{
      try{
        if(!window.MathJax?.startup?.promise)return;
        await window.MathJax.startup.promise;if(epoch!==mathEpoch)return;
        const target=$('projection-equation');window.MathJax.typesetClear?.([target]);
        target.textContent='\\[p=\\frac{'+texDecimal(r.elementMm,2)+'\\,\\mathrm{mm}}{'+texDecimal(r.enlargement,4)+'\\cdot '+texDecimal(r.xHeight,3)+'\\cdot (25{,}4\\,\\mathrm{mm}/72\\,\\mathrm{pt})}\\approx '+texDecimal(r.points,1)+'\\,\\mathrm{pt}\\]';
        await window.MathJax.typesetPromise([target]);
      }catch(_){$('projection-equation').textContent='Schriftgröße: etwa '+decimal(r.points)+' pt. Der Rechenweg steht darüber.';}
    });
  }
  for(const id of ['projection-distance','projection-width','projection-aspect','projection-document','projection-font','projection-wash'])$(id).addEventListener('input',projection);
  function tablet(){
    const size=Number($('tablet-size').value),whole=$('tablet-fit').value==='whole',font=$('tablet-font').value;
    for(const [id,landscape]of [['portrait',false],['landscape',true]]){
      const r=C.tabletPage({size,landscape,whole}),screen=$('tablet-'+id),copy=screen.querySelector('.tablet-page');
      screen.style.aspectRatio=r.width+' / '+r.height;
      copy.style.fontFamily='"'+font+'"';copy.style.fontSize=(size*96/72)+'px';
      screen.dataset.factor=String(r.factor);screen.dataset.whole=String(whole);
      $('tablet-'+id+'-result').textContent=decimal(r.factor*100)+' % · '+size+' pt wirken physisch wie etwa '+decimal(r.effective)+' pt auf Papier.'+(r.scroll?' Die Seite muss nach unten gescrollt werden.':' Die ganze Seite passt in das idealisierte Display.');
      const available=screen.clientWidth,scale=whole?Math.min(available/(210*96/25.4),screen.clientHeight/(297*96/25.4)):available/(210*96/25.4);
      copy.style.transform='scale('+scale+')';
      screen.querySelector('.tablet-page-shell').style.height=(1122.5197*scale)+'px';
    }
    const r=C.tabletPage({size});$('tablet-calculation').textContent='Hochformat, an Breite angepasst: '+decimal(r.width,1)+' mm / 210 mm ≈ '+decimal(r.factor,3)+'. '+size+' pt × '+decimal(r.factor,3)+' ≈ '+decimal(r.effective)+' pt. Die Punktgröße in der PDF-Datei bleibt '+size+' pt.';
  }
  for(const id of ['tablet-size','tablet-fit','tablet-font'])$(id).addEventListener('change',tablet);
  new ResizeObserver(tablet).observe($('tablet-lab'));document.fonts?.ready.then(tablet);tablet();projection();
  const spacing=$('school-spacing');spacing.addEventListener('change',()=>{$('school-spacing-proof').classList.toggle('school-spacing-on',spacing.checked);$('school-spacing-status').textContent=spacing.checked?'Prüfabstände eingeschaltet. Bleiben Inhalt und Verweis erreichbar?':'Normale Abstände. Die Prüfung ist auf diesen Beispielabsatz begrenzt.';});
})();
