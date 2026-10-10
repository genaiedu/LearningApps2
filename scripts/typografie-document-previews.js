(function(){
  'use strict';
  const $=id=>document.getElementById(id), dialog=$('word-preview-dialog');
  const names={ 'brief-a4':'Sachlicher Brief','kurzbericht-a4':'Kurzbericht',
    'einladung-a4':'Einladung','ergebnisprotokoll-a4':'Ergebnisprotokoll' };
  const ids=new Set(Object.keys(names).flatMap(id=>[id,id+'-modern']));
  let manifest,epoch=0;
  async function open(id){
    if(!ids.has(id))return;
    const ticket=++epoch,base=id.replace(/-modern$/,''),variant=id.endsWith('-modern')?'Modern':'Klassisch';
    $('word-preview-title').textContent=names[base]+' · '+variant;
    $('word-preview-download').href='downloads/typografie/'+id+'.docx?v=20261010-ttf';
    $('word-preview-pages').replaceChildren();$('word-preview-transcript').replaceChildren();
    $('word-preview-text').open=false;$('word-preview-status').textContent='Satzansicht wird geladen …';
    $('word-preview-zoom').value='1';$('word-preview-pages').style.setProperty('--document-zoom','1');
    dialog.showModal();
    try{
      if(!manifest)manifest=fetch('data/typografie-document-previews.json?v=20261010-ttf').then(r=>{if(!r.ok)throw Error('Vorschau nicht verfügbar');return r.json();}).catch(e=>{manifest=null;throw e;});
      const entry=(await manifest).documents[id];
      if(ticket!==epoch||!dialog.open)return;
      if(!entry?.pages?.length)throw Error('Vorschau fehlt');
      entry.pages.forEach((page,index)=>{
        if(page.src!=='downloads/typografie/vorschau/'+id+'-'+(index+1)+'.png')throw Error('Ungültiger Vorschaupfad');
        const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
        img.src=page.src+'?v=20261010-ttf';img.alt=names[base]+' · '+variant+' · Seite '+(index+1)+' von '+entry.pages.length;
        img.width=page.width;img.height=page.height;img.decoding='async';
        img.onerror=()=>{if(ticket===epoch)$('word-preview-status').textContent='Eine Seite konnte nicht geladen werden. Die Worddatei bleibt unten verfügbar.';};
        caption.textContent='Seite '+(index+1)+' von '+entry.pages.length;
        figure.append(img,caption);$('word-preview-pages').append(figure);
      });
      for(const text of entry.text){const p=document.createElement('p');p.textContent=text;$('word-preview-transcript').append(p);}
      $('word-preview-status').textContent='Feste Satzansicht aus der Worddatei · '+entry.pages.length+(entry.pages.length===1?' Seite':' Seiten')+'. Der Text ist unten auch lesbar verfügbar.';
    }catch(e){if(ticket===epoch)$('word-preview-status').textContent='Die Satzansicht ist gerade nicht verfügbar. Du kannst weiterhin die Worddatei herunterladen.';}
  }
  document.querySelectorAll('#word .download-actions a[download]').forEach(download=>{
    const id=download.getAttribute('href').split('/').pop().replace(/\.docx$/,'');
    if(!ids.has(id))return;
    if(id.endsWith('-modern'))download.href+='?v=20261010-ttf';
    const button=document.createElement('button');button.type='button';button.className='word-preview-button';
    button.dataset.wordPreview=id;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','word-preview-dialog');
    const variant=id.endsWith('-modern')?'Modern':'Klassisch';
    button.textContent=variant+' ansehen ↗';button.setAttribute('aria-label',names[id.replace(/-modern$/,'')]+' '+variant.toLowerCase()+' ansehen');
    button.addEventListener('click',()=>open(id));download.before(button);
    download.textContent='Word '+variant.toLowerCase()+' ↓';
  });
  $('word-preview-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{epoch++;$('word-preview-pages').replaceChildren();});
  $('word-preview-zoom').onchange=()=>{
    const value=$('word-preview-zoom').value;
    if(['1','1.25','1.5','2'].includes(value))$('word-preview-pages').style.setProperty('--document-zoom',value);
  };
})();
