(function(root) {
  'use strict';
  function create({pool,getGallery,setGallery,getState,imagesAllowed,requestImages,showImage,stopIntro,saveFile,texts,aiAllowed=()=>false,requestAIConsent=()=>{},filmAIEndpoint=''}) {
    const model=root.KunstGallery, $=id=>document.getElementById(id);
    const byId=new Map(pool.map(work=>[work.id,work]));
    const title=work=>root.KunstTresor.galleryTitle(work);
    let loadingEpoch=0, cache=new Map(), preparations=[], raf=0, film=null, frames=[], activeFrame=null;
    let loading=false, musicReady=false, silent=false, clock=0, anchor=0, paused=true, complete=false;
    const likeReadiness=new WeakMap();
    const audio=new Audio('../LearningApps/assets/kunst-der-fuge/fuge-orchester-suno.mp3');audio.preload='metadata';audio.volume=.65;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let filterTimer=0,layoutFrame=0;
    const filmAI=root.KunstFilmKI,filmAIClient=filmAI?.createClient({endpoint:filmAIEndpoint});
    let textEpoch=0,textBusy=false,textSource='',textUndo=null;
    const filmFingerprint=()=>JSON.stringify(getGallery().film);
    function textStatus(message){$('film-ai-status').textContent=message;}
    function updateTextUndo(){
      if(textUndo&&textUndo.source!==filmFingerprint())textUndo=null;
      $('film-ai-undo').hidden=!textUndo;$('film-ai-undo').disabled=textBusy;
    }
    function stopTextAI(message=''){
      const wasBusy=textBusy;
      textEpoch++;filmAIClient?.cancel();textBusy=false;textSource='';
      $('film-ai-cancel').hidden=true;
      $('film-ai-generate').disabled=false;$('film-ai-generate').textContent='Texte von KI erstellen lassen';
      if(wasBusy)renderEditor();
      updateTextUndo();
      if(message)textStatus(message);
    }
    async function generateFilmTexts(){
      if(textBusy)return;
      const g=getGallery();
      if(g.liked.length<model.UNLOCK||g.film.items.length<model.MIN||g.film.items.length>model.MAX){textStatus('Wähle zuerst 6 bis 10 Werke für deinen freigeschalteten Kunstfilm.');return;}
      if(!filmAIClient||!filmAIEndpoint){textStatus('Die KI-Textredaktion ist gerade nicht erreichbar. Deine bisherigen Texte bleiben erhalten.');return;}
      if(!aiAllowed()){textStatus('Bitte schalte die KI in „Datenschutz & Freigabe“ ein. Klicke danach hier erneut, um nur für diese Bildfolge Texte anzufordern.');requestAIConsent();return;}
      const replaceMotto=$('film-ai-use-motto').checked;
      stopTextAI();textSource=filmFingerprint();const source=textSource,ticket=++textEpoch;
      textBusy=true;$('film-ai-generate').disabled=true;$('film-ai-generate').textContent='Die KI textet deine Bildfolge …';$('film-ai-cancel').hidden=false;
      renderEditor();updateTextUndo();
      textStatus('Eigene Texte / KI-Texte ist ausgewählt. Die KI erstellt die Einblendungen und setzt sie anschließend direkt in die Textfelder ein. Bis dahin bleiben deine bisherigen Texte gespeichert.');
      const result=await filmAIClient.request(filmAI.payload(g.film.items.map(item=>item.id),Math.floor(Math.random()*1000001)));
      if(ticket!==textEpoch)return;
      if(source!==filmFingerprint()||!aiAllowed()){stopTextAI('Die Auswahl oder Freigabe hat sich geändert. Bitte fordere bei Bedarf neue Texte an.');return;}
      if(result.status!=='ready'){stopTextAI(filmAI.failureNotice(result.reason));return;}
      let checked;
      try{
        checked=filmAI.parseResponse(result.data,g.film.items.map(item=>item.id));
        checked=filmAI.parseResponse({motto:model.cleanCaption(checked.motto),works:checked.works.map(work=>({...work,text:model.cleanCaption(work.text)}))},g.film.items.map(item=>item.id));
      }
      catch{stopTextAI(filmAI.failureNotice('invalid_response'));return;}
      const current=getGallery(),previous=structuredClone(current.film);
      const next={...current,film:{...current.film,motto:replaceMotto?checked.motto:current.film.motto,items:current.film.items.map(item=>({...item,caption:'custom',text:checked.works.find(work=>work.id===item.id).text}))}};
      stopTextAI();
      if(change(next,'KI-Filmtexte direkt in die Textfelder eingesetzt.')){
        textUndo={film:previous,source:filmFingerprint()};updateTextUndo();
        textStatus('KI-Filmtexte eingesetzt und gespeichert. „Eigene Texte / KI-Texte“ ist für alle Werke ausgewählt; die Texte werden im Film eingeblendet und bleiben bearbeitbar. Bitte prüfe sie, KI kann irren.');
      }else textStatus('Die KI-Texte konnten nicht gespeichert werden. Deine bisherigen Texte bleiben erhalten.');
    }
    function node(tag,cls,text) {const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
    function button(label,fn,cls) {const e=node('button',cls,label);e.type='button';e.onclick=fn;return e;}
    function status(message) {$('gallery-status').textContent=message;}
    function change(next,message,{render=true}={}) {
      try{setGallery(next);refresh();if(render&&$('gallery-dialog').open)renderGallery();if(message)status(message);return true;}
      catch(error){status(error.message);return false;}
    }
    function progressText() {
      const n=getGallery().liked.length,left=Math.max(0,model.UNLOCK-n);
      return n+' Lieblingswerk'+(n===1?'':'e')+' · '+(left?'Noch '+left+' bis zu deinem eigenen Kunstfilm.':'Dein Kunstfilm ist freigeschaltet.');
    }
    function layoutGallery(){
      const grid=$('gallery-grid'),cards=[...grid.querySelectorAll('.gallery-card')],width=grid.clientWidth;
      if(!$('gallery-dialog').open||!width||!cards.length){grid.style.height='';return;}
      const gap=8,ratios=cards.map(card=>{const img=card.querySelector('img');return img?.naturalWidth?img.naturalWidth/img.naturalHeight:Number(card.dataset.galleryAspect)||1;});
      const rows=root.KunstWallLayout.rows(ratios,width,{gap,target:innerWidth<=760?210:320});let y=0;
      // Batch writes and measurements: a complete archive must not force a
      // separate page reflow for each of its 1,800+ cards.
      for(const row of rows){
        for(const item of row.items){const card=cards[item.index];
          Object.assign(card.style,{left:item.x+'px',width:item.width+'px'});
          card.querySelector('.gallery-image').style.height=row.height+'px';
        }
      }
      const heights=cards.map(card=>card.getBoundingClientRect().height);
      for(const row of rows){
        const height=Math.max(row.height,...row.items.map(item=>heights[item.index]));
        for(const item of row.items)cards[item.index].style.top=y+'px';
        y+=height+gap;
      }
      grid.style.height=y-gap+'px';
    }
    function scheduleGalleryLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;layoutGallery();});}
    function refresh() {
      const gallery=getGallery(), unlocked=gallery.liked.length>=model.UNLOCK;
      if(textBusy&&textSource!==filmFingerprint())stopTextAI('Deine Filmgestaltung hat sich geändert. Die offene KI-Anfrage wurde abgebrochen; deine Änderungen bleiben erhalten.');
      updateTextUndo();
      $('gallery-progress').textContent=progressText();$('gallery-summary').textContent=progressText();
      $('gallery-count').textContent=gallery.liked.length;
      $('gallery-film-filter-count').textContent='('+gallery.film.items.length+')';
      $('gallery-clear-film').disabled=!gallery.film.items.length;
      document.querySelectorAll('[data-gallery-access]').forEach(button=>{button.disabled=false;button.title=progressText();});
      const winning=model.winningRoom(getState(),pool);
      document.querySelectorAll('[data-gallery-like]').forEach(b=>{
        const liked=gallery.liked.some(entry=>entry.id===b.dataset.galleryLike);
        b.setAttribute('aria-pressed',String(liked));b.classList.toggle('is-liked',liked);
        b.querySelector('span').textContent=liked?'In deiner Galerie':'Für meine Galerie merken';
        const note=b.querySelector('.gallery-like-note');note.hidden=!liked;
        note.textContent=unlocked?'Dein Kunstfilm ist freigeschaltet.':'Noch '+(model.UNLOCK-gallery.liked.length)+' Lieblingswerke bis zum Kunstfilm.';
        b.disabled=!winning || !getState()?.ids.includes(b.dataset.galleryLike) || !likeReadiness.get(b)?.();
        b.hidden=b.disabled || !b.closest('#solutions');
        b.title=winning?'Ein Lieblingswerk aus deinem gewonnenen Raum.':'Als Belohnung erst nach einem gewonnenen Raum verfügbar.';
      });
      $('gallery-edit-open').disabled=!unlocked;$('gallery-play').disabled=!unlocked;
      if(!unlocked)$('gallery-editor').hidden=true;
    }
    function likeButton(id,{ready=()=>true}={}) {
      const b=button('',()=>{
        const g=getGallery(), liked=g.liked.some(entry=>entry.id===id);
        if(!ready())return;
        try{const next=liked?model.remove(g,id):model.like(g,id,getState(),pool);
          if(change(next,null,{render:false})){$('gallery-progress').textContent=progressText();status(progressText());}
        }catch(error){$('gallery-progress').textContent=error.message;}
      },'gallery-like');
      b.dataset.galleryLike=id;b.hidden=true;likeReadiness.set(b,ready);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
      const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d','M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z');svg.append(p);
      const note=node('small','gallery-like-note');note.hidden=true;b.append(svg,node('span',null,'Für meine Galerie merken'),note);return b;
    }
    function imageButton(work) {
      const b=button('',()=>imagesAllowed()?showImage(work,b):requestImages(),'gallery-image');
      b.setAttribute('aria-label',title(work)+' vergrößern');
      if(imagesAllowed()){const img=node('img');img.alt=title(work);img.loading='lazy';img.referrerPolicy='no-referrer';img.onload=scheduleGalleryLayout;img.onerror=scheduleGalleryLayout;img.src=work.imageURL;b.append(img);}
      else b.append(node('span',null,'Kunstbilder erlauben'));
      return b;
    }
    function currentView(){return {search:$('gallery-search').value,artist:$('gallery-filter-artist').value,style:$('gallery-filter-style').value,technique:$('gallery-filter-technique').value,sort:$('gallery-sort').value,onlyFilm:$('gallery-filter-film').checked,filmIds:getGallery().film.items.map(item=>item.id)};}
    function renderFilters(works){
      const view=currentView();
      // A removed work may have been the last member of a filter. Keep all
      // still-valid selections, but never leave an invisible stale value.
      for(const field of ['artist','style','technique'])if(view[field]&&!works.some(work=>work[field]===view[field]))view[field]='';
      for(const [field,all] of [['artist','Alle Künstler'],['style','Alle Stile'],['technique','Alle Techniken']]){
        const select=$('gallery-filter-'+field),first=node('option',null,all);first.value='';select.replaceChildren(first);
        for(const {value,count} of model.viewFacets(works,view,field)){const option=node('option',null,value+' · '+count);option.value=value;option.disabled=count===0&&value!==view[field];select.append(option);}
        select.value=view[field];
      }
      $('gallery-filter-reset').disabled=!view.search&&!view.artist&&!view.style&&!view.technique&&!view.onlyFilm&&view.sort==='collection';
      return view;
    }
    function renderGallery({editor=true}={}) {
      const gallery=getGallery(), selected=new Set(gallery.film.items.map(item=>item.id));
      const entries=new Map(gallery.liked.map(entry=>[entry.id,entry]));
      const works=gallery.liked.map(entry=>byId.get(entry.id)),view=renderFilters(works),visible=model.viewWorks(works,view);
      $('gallery-results').textContent=visible.length.toLocaleString('de-DE')+' von '+works.length.toLocaleString('de-DE')+' Werken angezeigt'+(view.onlyFilm?' · Nur Bilder im Film':'')+' · Filter ändern weder deine Sammlung noch die Filmauswahl.';
      $('gallery-grid').replaceChildren();
      if(!gallery.liked.length)$('gallery-grid').append(node('p','gallery-empty','Deine Galerie beginnt nach der ersten gewonnenen Tür. Markiere dann die Werke, die du behalten möchtest, mit dem Herz.'));
      else if(!visible.length)$('gallery-grid').append(node('p','gallery-empty',view.onlyFilm&&!gallery.film.items.length?'Dein Film enthält noch keine Bilder. Schalte „Nur Bilder im Film“ aus, um neue Werke auszuwählen.':'Keine Werke passen zu dieser Kombination. Ändere die Filter oder wähle „Ansicht zurücksetzen“.'));
      for(const work of visible){const entry=entries.get(work.id),card=node('article','gallery-card');card.dataset.work=work.id;
        if(work.imageWidth&&work.imageHeight)card.dataset.galleryAspect=String(work.imageWidth/work.imageHeight);
        const visual=node('div','gallery-visual');visual.append(imageButton(work));
        card.append(visual);
        const details=node('details','gallery-card-details'),summary=node('summary'),actions=node('div','gallery-card-actions');
        summary.title=title(work)+' · '+work.artist+' · '+work.date;summary.setAttribute('aria-label','Werkdetails & Auswahl: '+summary.title);
        summary.append(node('h3',null,title(work)),node('span','gallery-artist',work.artist+' · '+work.date));
        details.append(summary);details.addEventListener('toggle',layoutGallery);
        actions.append(button('Aus Galerie entfernen',()=>{if(change(model.remove(getGallery(),entry.id),null))status('Werk entfernt. '+progressText());}));
        if(gallery.liked.length>=model.UNLOCK){const add=button(selected.has(entry.id)?'Aus Film entfernen':'Zum Film hinzufügen',()=>{
          const g=getGallery();
          if(g.film.items.some(item=>item.id===entry.id)){change(model.removeFromFilm(g,entry.id),'Aus dem Film entfernt; das Werk bleibt in deiner Galerie.');return;}
          if(g.film.items.length>=model.MAX){status('Im Film sind höchstens 10 Werke möglich. Entferne zunächst ein Werk aus der Filmauswahl.');return;}
          change({...g,film:{...g.film,items:[...g.film.items,model.item(entry.id)]}},'Werk zum Film hinzugefügt.');
        });add.title=selected.has(entry.id)?'Nur aus dem Film entfernen. Das Werk bleibt gelikt und in deiner Galerie.':'Dieses Lieblingswerk in deinen Film aufnehmen.';actions.append(add);}
        details.append(actions);card.append(details);$('gallery-grid').append(card);
        const sources=node('p','gallery-source');
        for(const [label,url] of [['Werkquelle',work.source],['Bildrechte: '+work.imageLicense,work.imageSource]]){const link=node('a',null,label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';sources.append(link,node('span',null,' '));}details.append(sources);
      }
      if(editor)renderEditor();refresh();layoutGallery();
    }
    function editItem(index,patch) {
      const g=getGallery(), items=g.film.items.map((item,i)=>i===index?{...item,...patch}:item);
      return change({...g,film:{...g.film,items}},'Filmgestaltung im Browser gespeichert.',{render:false});
    }
    function renderEditor() {
      const g=getGallery();$('gallery-name').value=g.film.name;$('gallery-motto').value=g.film.motto;
      if(!textBusy)$('film-ai-use-motto').checked=g.film.motto===model.fresh().film.motto;
      $('film-ai-use-motto').disabled=textBusy;
      $('film-selection-count').textContent=g.film.items.length+' / 10 Werke · mindestens 6 · rund 2 Minuten 8 Sekunden';
      $('film-selection').replaceChildren();
      if(!g.film.items.length)$('film-selection').append(node('p',null,'Lass 8 Werke zusammenstellen oder füge sie oben aus deiner Galerie hinzu.'));
      g.film.items.forEach((item,index)=>{
        const work=byId.get(item.id), card=node('li','film-edit-card');card.dataset.work=item.id;
        const head=node('div','film-edit-head');head.append(node('b','film-order',String(index+1).padStart(2,'0')),node('h3',null,title(work)));
        const tools=node('div','film-edit-tools');
        for(const [label,delta] of [['Nach vorn',-1],['Nach hinten',1]]){const b=button(label,()=>{
          const current=getGallery(),items=[...current.film.items],other=index+delta;
          [items[index],items[other]]=[items[other],items[index]];change({...current,film:{...current.film,items}},'Reihenfolge gespeichert.');
        });b.disabled=index+delta<0 || index+delta>=g.film.items.length;b.setAttribute('aria-label',title(work)+' · '+label);tools.append(b);}
        tools.append(button('Aus Film entfernen',()=>change(model.removeFromFilm(getGallery(),item.id),'Aus dem Film entfernt; das Werk bleibt in deiner Galerie.')));head.append(tools);card.append(head);
        const label=node('label',null,'Einblendung für dieses Werk'), select=node('select');select.setAttribute('aria-label','Einblendung für '+title(work));
        for(const [value,name] of [['both','Stil / Epoche und Material'],['style','Stil / Epoche'],['technique','Material / Technik'],['none','Nur Werkangaben'],['custom','Eigene Texte / KI-Texte']]){const option=node('option',null,name);option.value=value;select.append(option);}select.value=textBusy?'custom':item.caption;label.append(select);
        const variantLabel=node('label',null,'Formulierung'), variant=node('select');variant.setAttribute('aria-label','Formulierung für '+title(work));
        for(const [value,name] of [[0,'Erste Variante'],[1,'Zweite Variante']]){const option=node('option',null,name);option.value=value;variant.append(option);}variant.value=item.variant;variantLabel.append(variant);
        const ownLabel=node('label',null,'Mein eingeblendeter Text'), input=node('textarea');input.maxLength=240;input.rows=3;input.value=model.cleanCaption(item.text);input.readOnly=textBusy;input.placeholder=textBusy?'Die KI erstellt diesen Filmtext …':'Hier deinen eigenen Text eingeben oder oben KI-Texte erstellen lassen.';input.setAttribute('aria-busy',String(textBusy));input.setAttribute('aria-label','Eigener Filmtext für '+title(work));ownLabel.append(input);
        const preview=node('p','film-caption-preview');
        function previewText(){const updated=getGallery().film.items[index];preview.textContent=textBusy?'KI-Text wird erstellt …':model.caption(work,updated,texts)||'Keine zusätzliche Einblendung.';ownLabel.hidden=!textBusy&&updated.caption!=='custom';variantLabel.hidden=textBusy||['none','custom'].includes(updated.caption);}
        select.onchange=()=>{editItem(index,{caption:select.value});previewText();};variant.onchange=()=>{editItem(index,{variant:Number(variant.value)});previewText();};input.oninput=()=>{editItem(index,{caption:'custom',text:input.value});previewText();};
        card.append(label,variantLabel,ownLabel,preview);previewText();$('film-selection').append(card);
      });
    }
    function openGallery() {renderGallery();status('');$('gallery-dialog').showModal();layoutGallery();}
    function applyView(){clearTimeout(filterTimer);renderGallery({editor:false});}
    $('gallery-search').oninput=()=>{clearTimeout(filterTimer);filterTimer=setTimeout(applyView,140);};
    for(const id of ['gallery-filter-artist','gallery-filter-style','gallery-filter-technique','gallery-sort'])$(id).onchange=applyView;
    $('gallery-filter-film').onchange=applyView;
    $('gallery-filter-reset').onclick=()=>{
      for(const id of ['gallery-search','gallery-filter-artist','gallery-filter-style','gallery-filter-technique'])$(id).value='';
      $('gallery-sort').value='collection';$('gallery-filter-film').checked=false;applyView();
    };
    $('gallery-clear-film').onclick=()=>{
      const n=getGallery().film.items.length;if(!n)return;
      $('gallery-clear-description').textContent='Alle '+n+' Bilder aus der aktuellen Filmauswahl entfernen? Deine Lieblingswerke bleiben vollständig in der Galerie. Name und Schlussmotto bleiben erhalten. Einblendungstexte zu den entfernten Filmbildern werden gelöscht; sichere deinen Film vorher als JSON, wenn du sie behalten möchtest.';
      $('gallery-clear-dialog').showModal();$('gallery-clear-cancel').focus();
    };
    $('gallery-clear-confirm').onclick=()=>{
      const g=getGallery();if(!g.film.items.length){$('gallery-clear-dialog').close();return;}
      $('gallery-filter-film').checked=false;
      if(change({...g,film:{...g.film,items:[]}},'Filmauswahl geleert. Alle Lieblingswerke, Name und Schlussmotto bleiben erhalten. Du kannst jetzt neue Bilder zum Film hinzufügen.')){$('gallery-clear-dialog').close();}
    };
    $('gallery-clear-dialog').addEventListener('close',()=>($('gallery-clear-film').disabled?$('gallery-filter-film'):$('gallery-clear-film')).focus({preventScroll:true}));
    $('film-ai-generate').onclick=()=>void generateFilmTexts();
    $('film-ai-permission').onclick=requestAIConsent;
    $('film-ai-cancel').onclick=()=>stopTextAI('Anfrage im Browser abgebrochen. Deine bisherigen Texte bleiben unverändert. Bereits übertragene Daten lassen sich damit nicht zurückrufen.');
    $('film-ai-undo').onclick=()=>{
      if(textBusy||!textUndo)return;
      if(textUndo.source!==filmFingerprint()){updateTextUndo();return;}
      const previous=textUndo.film,g=getGallery();
      if(change({...g,film:structuredClone(previous)},'Vorherige Filmtexte wiederhergestellt.'))textStatus('KI-Übernahme rückgängig gemacht. Deine vorherigen Texte und Einstellungen sind wiederhergestellt.');
    };
    $('gallery-dialog').addEventListener('close',()=>{textUndo=null;stopTextAI();});
    addEventListener('resize',layoutGallery);
    document.fonts?.ready.then(layoutGallery);
    function stopFilm() {
      textUndo=null;
      stopTextAI();
      loadingEpoch++;loading=false;cancelAnimationFrame(raf);audio.pause();paused=true;
      preparations.forEach(p=>p.cancel());preparations=[];cache.clear();film=null;
      $('gallery-film-stage').replaceChildren();$('gallery-film-dialog').classList.remove('is-detail','is-full','is-ending','is-opening');
      if($('gallery-film-dialog').open)$('gallery-film-dialog').close();
    }
    async function audioMetadata() {
      if(Number.isFinite(audio.duration)&&audio.duration>60)return true;
      return new Promise(resolve=>{
        const timer=setTimeout(()=>finish(false),15000);
        const done=()=>finish(Number.isFinite(audio.duration)&&audio.duration>60&&audio.duration<600), error=()=>finish(false);
        function finish(ok){clearTimeout(timer);audio.removeEventListener('loadedmetadata',done);audio.removeEventListener('error',error);resolve(ok);}
        audio.addEventListener('loadedmetadata',done);audio.addEventListener('error',error);audio.load();
      });
    }
    async function prepareFilm() {
      try{model.validateFilm(getGallery());}catch(error){status(error.message);$('gallery-editor').hidden=false;return;}
      if(!imagesAllowed()){status('Bitte erlaube zuerst die Kunstbilder.');requestImages();return;}
      stopIntro();stopFilm();film=structuredClone(getGallery().film);const epoch=++loadingEpoch;
      loading=true;complete=false;clock=0;silent=false;activeFrame=null;
      $('gallery-film-loading').hidden=false;$('gallery-film-copy').hidden=true;$('gallery-film-caption').textContent='';
      $('gallery-film-start').hidden=true;$('gallery-film-silent').hidden=true;$('gallery-film-retry').hidden=true;
      $('gallery-film-pause').hidden=true;$('gallery-film-sound').hidden=true;
      $('gallery-film-dialog').showModal();$('gallery-film-loading-text').textContent='Die ausgewählten Werke werden vollständig geladen. Musik und Kamerafahrt starten erst danach.';
      let loaded=0;
      const metadata=audioMetadata();
      const tasks=film.items.map(async item=>{
        const work=byId.get(item.id), preparation=root.KunstIntro.prepare([work]);preparations.push(preparation);
        let timer;const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve('timeout'),20000);});
        const result=await Promise.race([preparation.ready,timeout]);clearTimeout(timer);
        if(epoch!==loadingEpoch)return;
        if(result!=='ready')throw Error(title(work));
        cache.set(item.id,preparation.image);loaded++;
        $('gallery-film-loading-text').textContent=loaded+' von '+film.items.length+' Werken geladen. Der Film wartet auf alle Bilder.';
      });
      try{await Promise.all(tasks);musicReady=await metadata;if(epoch!==loadingEpoch)return;loading=false;
        $('gallery-film-loading-text').textContent=musicReady?'Alle Bilder sind da. Starte deinen Film mit der vollständigen Orchesterfassung.':'Die Musik ist gerade nicht erreichbar. Du kannst erneut laden oder den Film bewusst ohne Musik abspielen.';
        $('gallery-film-start').hidden=!musicReady;$('gallery-film-silent').hidden=musicReady;$('gallery-film-retry').hidden=musicReady;
      }catch(error){if(epoch!==loadingEpoch)return;loading=false;$('gallery-film-loading-text').textContent='Dieses Werk ist gerade nicht erreichbar: '+error.message+'. Kein Bild wird stillschweigend übersprungen. Du kannst erneut laden oder die Auswahl im Editor ändern.';$('gallery-film-retry').hidden=false;}
    }
    function showFrame(frame) {
      activeFrame=frame;const dialog=$('gallery-film-dialog');
      for(const phase of ['opening','detail','full','ending'])dialog.classList.toggle('is-'+phase,frame.phase===phase);
      const id=frame.id || film.items[frame.phase==='opening'?0:film.items.length-1].id, work=byId.get(id), img=cache.get(id);
      const stage=$('gallery-film-stage'),old=stage.lastElementChild,slide=node('div','gallery-film-slide');
      if(old){old.classList.add('is-outgoing');setTimeout(()=>old.remove(),750);}
      slide.append(img);stage.append(slide);
      $('gallery-film-copy').hidden=frame.phase==='full';
      $('gallery-film-kicker').textContent=frame.phase==='opening'?'Deine persönliche Galerie':frame.phase==='ending'?'Ein eigener Blick':work.style+' · '+work.date;
      $('gallery-film-heading').textContent=['opening','ending'].includes(frame.phase)?film.name:model.caption(work,film.items.find(item=>item.id===id),texts);
      $('gallery-film-motto').textContent=frame.phase==='ending'?film.motto:'';
      $('gallery-film-copy').classList.toggle('has-long-title',film.name.length>45);
      $('gallery-film-copy').classList.toggle('has-long-motto',film.motto.length>80);
      $('gallery-film-caption').textContent=frame.id?title(work)+' · '+work.artist+' · '+work.date+' · '+work.technique:'';
    }
    function renderTime(time) {
      const frame=model.frameAt(frames,time);if(frame!==activeFrame)showFrame(frame);
      const image=$('gallery-film-stage').lastElementChild.querySelector('img');
      if(frame.phase==='detail'&&!reduced.matches){const t=Math.min(1,Math.max(0,(time-frame.start)/(frame.end-frame.start))),index=film.items.findIndex(i=>i.id===frame.id),sign=index%2?-1:1;
        image.style.transform='scale('+(1.5+.35*t)+') translate('+(sign*(-3+6*t))+'%, '+(2-4*t)+'%)';
      }else image.style.transform='none';
      $('gallery-film-meter').value=time;$('gallery-film-time').textContent=Math.floor(time/60)+':'+String(Math.floor(time%60)).padStart(2,'0')+' / '+Math.floor(frames.at(-1).end/60)+':'+String(Math.floor(frames.at(-1).end%60)).padStart(2,'0');
    }
    function tick() {
      if(paused||!film)return;
      clock=silent?Math.min(frames.at(-1).end,clock+(performance.now()-anchor)/1000):audio.currentTime;anchor=performance.now();renderTime(clock);
      if(clock>=frames.at(-1).end){finishFilm();return;}raf=requestAnimationFrame(tick);
    }
    function finishFilm() {paused=true;complete=true;cancelAnimationFrame(raf);audio.pause();renderTime(frames.at(-1).end);$('gallery-film-pause').textContent='Noch einmal abspielen';}
    async function startFilm(withoutMusic=false) {
      if(!film||loading||cache.size!==film.items.length)return;
      const epoch=loadingEpoch;silent=withoutMusic;audio.currentTime=0;audio.muted=false;
      if(!silent){try{await audio.play();}catch{$('gallery-film-loading-text').textContent='Die Musik konnte nicht starten. Versuche es erneut oder spiele bewusst ohne Musik.';$('gallery-film-silent').hidden=false;return;}if(epoch!==loadingEpoch){audio.pause();return;}}
      frames=model.timeline(film.items,silent?128.4:audio.duration);clock=0;anchor=performance.now();paused=false;complete=false;activeFrame=null;
      $('gallery-film-loading').hidden=true;$('gallery-film-copy').hidden=false;$('gallery-film-pause').hidden=false;$('gallery-film-pause').textContent='Pause';
      $('gallery-film-sound').hidden=silent;$('gallery-film-sound').textContent='Musik aus';$('gallery-film-sound').setAttribute('aria-pressed','true');
      $('gallery-film-meter').max=frames.at(-1).end;tick();
    }
    async function pauseFilm() {
      if(complete){await startFilm(silent);return;}
      if(paused){try{if(!silent)await audio.play();}catch{return;}paused=false;anchor=performance.now();$('gallery-film-pause').textContent='Pause';tick();}
      else{paused=true;audio.pause();cancelAnimationFrame(raf);$('gallery-film-pause').textContent='Weiter abspielen';}
    }
    audio.addEventListener('ended',()=>{if(film&&!silent)finishFilm();});
    document.querySelectorAll('[data-gallery-access]').forEach(button=>button.onclick=openGallery);
    $('open-gallery').onclick=openGallery;$('gallery-edit-open').onclick=()=>{$('gallery-editor').hidden=false;$('gallery-editor').scrollIntoView({block:'start'});};
    $('gallery-export').onclick=async()=>status(await saveFile());
    $('gallery-auto').onclick=()=>change(model.automatic(getGallery()),'8 Lieblingswerke ausgewählt. Du kannst sie austauschen und neu ordnen.');
    $('gallery-name').oninput=()=>{const g=getGallery();change({...g,film:{...g.film,name:$('gallery-name').value.trim()||'Meine Galerie'}},'Galerie-Name gespeichert.',{render:false});};
    $('gallery-motto').oninput=()=>{const g=getGallery();change({...g,film:{...g.film,motto:$('gallery-motto').value}},'Schlussmotto gespeichert.',{render:false});};
    $('gallery-play').onclick=()=>{if(!getGallery().film.items.length)change(model.automatic(getGallery()),null);void prepareFilm();};
    $('gallery-film-start').onclick=()=>void startFilm();$('gallery-film-silent').onclick=()=>void startFilm(true);
    $('gallery-film-retry').onclick=()=>void prepareFilm();$('gallery-film-pause').onclick=()=>void pauseFilm();
    $('gallery-film-sound').onclick=()=>{audio.muted=!audio.muted;$('gallery-film-sound').textContent=audio.muted?'Musik an':'Musik aus';$('gallery-film-sound').setAttribute('aria-pressed',String(!audio.muted));};
    $('gallery-film-stop').onclick=stopFilm;$('gallery-film-dialog').addEventListener('cancel',event=>{event.preventDefault();stopFilm();});
    $('gallery-film-dialog').addEventListener('close',()=>{if(film)stopFilm();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&film&&!paused&&!loading)void pauseFilm();});
    return {refresh,renderGallery,likeButton,stopFilm,stopTextAI,open:openGallery,stopImages(){stopFilm();$('gallery-grid').querySelectorAll('img').forEach(img=>img.removeAttribute('src'));}};
  }
  root.KunstGalleryUI={create};
})(typeof globalThis!=='undefined'?globalThis:this);
