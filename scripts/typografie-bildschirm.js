(()=>{
  'use strict';
  const W=window.TypoWeb,$=id=>document.getElementById(id),base='downloads/typografie/webstudien/';
  if(!W||!$('web-study'))return;
  const groupNames={richtung:'Richtung',farbe:'Farbe',raum:'Raum'},choice=$('web-study');
  for(const s of W.studies){const o=document.createElement('option');o.value=s.id;o.textContent=s.title;choice.append(o);}
  function render(){
    const s=W.find(choice.value),options={size:$('web-size').value,leading:$('web-leading').value,measure:$('web-measure').value,angle:$('web-angle').value,space:$('web-spacing').checked,uid:'web-live'};
    $('web-study-proof').innerHTML=W.markup(s.id,options);$('web-study-proof').style.width=$('web-width').value+'px';
    for(const [id,value,suffix] of [['web-size-value',options.size,' px'],['web-leading-value',Number(options.leading).toFixed(2).replace('.',','),''],['web-measure-value',options.measure,' ch'],['web-angle-value',options.angle,'°']])$(id).textContent=value+suffix;
    $('web-angle').disabled=!['shear','rotate'].includes(s.mode);
    $('web-study-caption').textContent=s.note;$('web-study-download').href=base+s.id+'.html';
    $('web-study-download').download=s.id+'.html';updateWidth();
  }
  function updateWidth(){const width=Math.round($('web-study-proof').getBoundingClientRect().width);$('web-workshop-status').textContent='Aktuelle Beispielbreite: '+width+' CSS-Pixel'+(width<=560?' · schmale Anordnung':' · breite Anordnung')+'. '+($('web-spacing').checked?'Prüfabstände eingesetzt. Sie übersteuern den Zeilenabstand der Absatzprobe.':'Die Schrift wird nicht als Bild verkleinert; der Text bricht wirklich neu um.');}
  for(const id of ['web-study','web-width','web-size','web-leading','web-measure','web-angle','web-spacing'])$(id).addEventListener('input',render);
  function reset(){choice.value='02-randklammer';for(const [id,value] of [['web-width',840],['web-size',19],['web-leading',1.65],['web-measure',64],['web-angle',-12]])$(id).value=value;$('web-spacing').checked=false;render();}
  $('web-reset').onclick=reset;new ResizeObserver(updateWidth).observe($('web-study-proof'));
  document.querySelectorAll('[data-web-study]').forEach((e,i)=>{e.innerHTML=W.markup(e.dataset.webStudy,{uid:'web-exhibit-'+i});});
  const dialog=$('web-study-dialog');let opener=null;
  function open(id,button){const s=W.find(id);opener=button;$('web-dialog-title').textContent=s.title;$('web-dialog-note').textContent=s.note;$('web-dialog-study').innerHTML=W.markup(s.id,{uid:'web-dialog'});$('web-dialog-download').href=base+s.id+'.html';$('web-dialog-download').download=s.id+'.html';dialog.showModal();$('web-dialog-close').focus();}
  $('web-dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{opener?.focus();opener=null;});
  let filter='all';
  function gallery(){
    $('web-study-gallery').replaceChildren();const list=W.studies.filter(s=>filter==='all'||s.group===filter);
    for(const s of list){const card=document.createElement('article');card.className='web-study-card';
      const stamp=document.createElement('div');stamp.className='web-stamp '+s.mode;stamp.setAttribute('aria-hidden','true');const lettering=document.createElement('span');lettering.textContent=s.mode==='banner'?'Nicht so.':s.mode==='golden'?'1,618 : 1':'Form.';stamp.append(lettering);
      const label=document.createElement('span');label.className='feature-caption';label.textContent=s.id.slice(0,2)+' / '+groupNames[s.group];
      const heading=document.createElement('h3');heading.textContent=s.title;const note=document.createElement('p');note.textContent=s.note;
      const actions=document.createElement('div');actions.className='actions';const button=document.createElement('button');button.type='button';button.textContent='Webbeispiel ansehen ↗';button.setAttribute('aria-label',s.title+' · Webbeispiel ansehen');button.onclick=()=>open(s.id,button);
      const link=document.createElement('a');link.href=base+s.id+'.html';link.download=s.id+'.html';link.textContent='HTML ↓';link.setAttribute('aria-label',s.title+' · HTML herunterladen');actions.append(button,link);card.append(stamp,label,heading,note,actions);$('web-study-gallery').append(card);
    }
    $('web-gallery-status').textContent=list.length+' von '+W.studies.length+' Webstudien · alle mit eingebetteten lokalen Fonts.';
    document.querySelectorAll('[data-web-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.webFilter===filter)));
  }
  document.querySelectorAll('[data-web-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.webFilter;gallery();});
  $('web-study-enlarge').onclick=()=>open(choice.value,$('web-study-enlarge'));
  document.querySelectorAll('[data-web-contrast]').forEach(e=>{const [fg,bg]=e.dataset.webContrast.split(',');e.textContent=window.TypoCore.contrast(fg,bg).toFixed(2).replace('.',',')+':1 · Text / Grund';});
  reset();gallery();
})();
