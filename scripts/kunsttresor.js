(() => {
  'use strict';
  const $ = id => document.getElementById(id), core = window.KunstTresor, curator = window.KunstKurator;
  const progress = window.KunstProgress, transfers = window.KunstSave, history = window.KunstHistory;
  const keys = {game:'kunsttresor-game-v1', best:'kunsttresor-best-v1', progress:'kunsttresor-progress-v1', history:'kunsttresor-history-v1', images:'kunsttresor-images-v1', hero:'kunsttresor-hero-v1'};
  const labels = {date:'Entstehungszeit', style:'Stilrichtung', artist:'Künstler', technique:'Technik'};
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key,value) { try { localStorage.setItem(key,value); return true; } catch { return false; } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* The round still works in memory. */ } }
  };
  let pool = [], landmarkIds = [], heroWorks = [], wikiCatalogue = {artists:{},works:{}}, state = null, best = progress.integer(Number(store.get(keys.best))) ? Number(store.get(keys.best)) : 0;
  let artKnowledge = null, archiveReplacements = [], pendingImport = null, transferBusy = false, fileEpoch = 0;
  // Renew permission because relevant earlier mistakes, not just wins, are now sent.
  const ki=window.KunstKI, aiConsentKey='kunsttresor-ai-consent-v2', aiEnabledKey='kunsttresor-ai-enabled-v1';
  const aiEndpoint=window.KunstKIConfig?.endpoint || '';
  const aiClient=ki?.createClient({endpoint:aiEndpoint,fetcher:(...args)=>fetch(...args)});
  let aiAllowed=store.get(aiConsentKey)==='yes', aiEnabled=store.get(aiEnabledKey)!=='no', aiDisplayEpoch=0, aiBaseline=new Map();
  let playerProgress = progress.fresh(best);
  try { playerProgress = progress.restore(JSON.parse(store.get(keys.progress))) || playerProgress; } catch { /* Older browsers have no collection yet. */ }
  playerProgress.record = Math.max(playerProgress.record,best);
  let workHistory=history.fresh(), historyBlocked=false;
  const storedHistory=store.get(keys.history);
  if(storedHistory!==null) {
    try { const restored=history.restore(JSON.parse(storedHistory)); if(!restored)throw Error('history');workHistory=restored; }
    catch { historyBlocked=true; } // Never overwrite a damaged history silently.
  }
  let imagesAllowed = store.get(keys.images) === 'yes', pendingStart = false, imageEpoch = 0;
  let ready = new Set(), failed = new Set(), zoomEpoch = 0, zoomLoad = null;
  const imageTimers = new Set();
  let introTimer = null, pendingIntro = false, previousIntro = [], introEpoch = 0, introSoundEnabled = true;
  let introPreparation=null, introWaitTimer=null, launchEpoch=0, introAudioEpoch=0;
  const introAudio = new Audio('../LearningApps/assets/kunst-der-fuge/fuge-orchester-suno.mp3');
  introAudio.preload='metadata'; introAudio.volume=.65;
  const introSeconds=46; // Five 7-second chapters followed by an 11-second full-artwork finale.
  let introFadeTimer=null;
  function startIntroAudio() {
    if (!introSoundEnabled) return;
    const epoch=++introAudioEpoch;
    introAudio.play().then(()=>{ if(epoch!==introAudioEpoch)return; $('intro-sound').textContent='♫ Musik ausschalten'; $('intro-sound').setAttribute('aria-pressed','true'); })
      .catch(()=>{ if(epoch!==introAudioEpoch)return; $('intro-sound').textContent='♫ Musik einschalten'; $('intro-sound').setAttribute('aria-pressed','false'); });
  }
  const imageURL = work => work.imageURL;
  const workById = id => pool.find(work => work.id === id);
  const number = value => String(value).padStart(2, '0');
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function save() {
    if (state) {
      if (!progress.tokenPattern.test(state.roomToken)) state.roomToken = progress.token();
      if (!progress.tokenPattern.test(state.runToken)) state.runToken = progress.token();
      if (state.parentRoomToken === undefined) state.parentRoomToken = null;
      const oldHistory=workHistory.rooms.find(entry=>entry.id===(state.historyToken||state.roomToken));
      if(oldHistory && JSON.stringify(oldHistory.ids)!==JSON.stringify(state.ids)) state.historyToken=progress.token();
      rememberWork();
      if (store.set(keys.game, JSON.stringify(state)) === false) storageWarning();
    }
    if (state && state.escaped > best) { best = state.escaped; if (store.set(keys.best, String(best)) === false) storageWarning(); }
    playerProgress.record = Math.max(playerProgress.record,best);
    saveProgress();
  }
  function storageWarning() {
    $('progress-notice').hidden = false;
    $('progress-notice').textContent = 'Der Browser kann deinen Fortschritt gerade nicht dauerhaft speichern. Sichere ihn bitte unter „Spielstand“ als Datei.';
  }
  function saveProgress() { if (store.set(keys.progress,JSON.stringify(playerProgress)) === false) storageWarning(); }
  function rememberWork(shownId) {
    if(historyBlocked) {
      $('progress-notice').hidden=false;
      $('progress-notice').textContent='Deine vorhandene Bildhistorie konnte nicht gelesen werden und wird nicht überschrieben. Lade bitte eine gültige Spielstandsdatei; das Spiel und deine Abzeichen bleiben verfügbar.';
      return;
    }
    try {
      const next=history.track(workHistory,state,pool,{shownId});
      if(next!==workHistory) { workHistory=next; if(!store.set(keys.history,JSON.stringify(workHistory)))storageWarning(); }
      refreshHistory();
    } catch(error) { $('progress-notice').hidden=false;$('progress-notice').textContent=error.message; }
  }
  function refreshHistory() {
    const seen=new Set(workHistory.rooms.flatMap(entry=>entry.ids.filter((id,index)=>entry.seen&(1<<index))));
    const rooms=workHistory.rooms.length;
    $('history-summary').textContent=seen.size+(seen.size===1?' verschiedenes Werk in ':' verschiedene Werke in ')+rooms+(rooms===1?' gespeichertem Raum.':' gespeicherten Räumen.')+' Die Bildhistorie beginnt mit dieser Funktion; ältere Begegnungen sind nicht rekonstruierbar.';
  }
  function previousWorks() { return historyBlocked ? undefined : history.summarize(workHistory,state.ids,state.historyToken||state.roomToken); }
  function refreshBadges() {
    const collection = progress.collection(playerProgress), stats = progress.statistics(playerProgress);
    $('badge-count').textContent = collection.filter(badge=>badge.earned).length + ' / ' + collection.length;
    $('badge-summary').textContent = stats.wins + (stats.wins === 1 ? ' gelöster Raum' : ' gelöste Räume') + ' · ' + stats.first + ' im ersten Versuch · ' + stats.styles + ' Stilrichtungen · ' + stats.techniques + ' Techniken';
    $('badge-grid').replaceChildren();
    const paths = {door:'M8 20V4h8v16M4 20h16M12 12h.01', eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0', return:'M7 7H3V3M3 7a9 9 0 1 1-1 9M8 12l3 3 5-6', route:'M5 3v14a4 4 0 0 0 8 0V7a4 4 0 0 1 8 0v14', key:'M14 4a6 6 0 1 1-4 10l-7 7H1v-3l7-7a6 6 0 0 1 6-7M16 8h.01', gallery:'M3 3h18v18H3zM7 7h10v10H7z', search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0M15 15l6 6M7 10l2 2 3-4'};
    const levelTitles = ['Einsteigen','Dranbleiben','Vertiefen','Meisterklasse'];
    let currentLevel = -1;
    for (const badge of collection) {
      if (badge.level !== currentLevel) { currentLevel = badge.level; $('badge-grid').append(node('h3','badge-tier-heading',levelTitles[badge.level])); }
      const card = node('article','badge-card' + (badge.earned ? ' is-earned' : ''));
      const seal = node('div','badge-seal'); seal.setAttribute('aria-hidden','true');
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'), path = document.createElementNS(svg.namespaceURI,'path');
      svg.setAttribute('viewBox','0 0 24 24'); path.setAttribute('d',paths[badge.symbol]); svg.append(path); seal.append(svg);
      const copy = node('div','badge-copy'); copy.append(node('p','badge-state',badge.earned ? '✓ Erworben' : 'Noch zu entdecken'),node('h3','',badge.title),node('p','',badge.description));
      const meter = node('progress'); meter.max = badge.target; meter.value = Math.min(badge.value,badge.target); meter.setAttribute('aria-label',badge.title + ': ' + meter.value + ' von ' + badge.target);
      copy.append(meter,node('span','badge-value',(badge.metric === 'perfectStreak' ? 'Beste Serie: ' : '') + meter.value + ' / ' + badge.target)); card.append(seal,copy); $('badge-grid').append(card);
    }
  }
  function awardProgress() {
    if (state.phase !== 'unlocked') return [];
    try {
      const result = progress.recordWin(playerProgress,state,pool);
      playerProgress = result.profile; saveProgress(); refreshBadges();
      return result.earned;
    } catch (error) { $('progress-notice').textContent = error.message; $('progress-notice').hidden = false; return []; }
  }
  function setTransferBusy(busy) {
    transferBusy = busy;
    for (const id of ['export-save','choose-save','confirm-import']) $(id).disabled = busy;
    $('save-dialog').setAttribute('aria-busy',String(busy));
  }
  async function exportSave() {
    if (transferBusy || !pool.length) return;
    setTransferBusy(true); $('save-status').textContent = 'Deine Datei wird vorbereitet …';
    try {
      save();
      if(historyBlocked)throw Error('Die vorhandene Bildhistorie ist beschädigt. Sie wird durch eine neue Datei nicht überschrieben.');
      const payload = {app:transfers.APP,version:transfers.VERSION,savedAt:Date.now(),state,best,progress:playerProgress,history:workHistory};
      transfers.validate(payload,pool,archiveReplacements,core,progress,history);
      const text = await transfers.encode(payload), blob = new Blob([text],{type:'application/json'}), url = URL.createObjectURL(blob);
      const link = node('a'); link.href = url; link.download = 'kunsttresor-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
      document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
      $('save-status').textContent = 'Die JSON-Datei ist vorbereitet. Bewahre sie auf, um diesen Stand später oder auf einem anderen Gerät zu laden.';
    } catch (error) { $('save-status').textContent = error.message; }
    finally { setTransferBusy(false); }
  }
  async function readSaveFile() {
    const file = $('save-file').files?.[0]; $('save-file').value = '';
    if (!file || transferBusy) return;
    const epoch = ++fileEpoch; pendingImport = null; $('import-preview').hidden = true;
    setTransferBusy(true); $('save-status').textContent = 'Die Datei wird geprüft. Dein bisheriger Stand bleibt unverändert.';
    try {
      if (file.size > transfers.MAX_FILE_BYTES) throw Error('Die Datei ist zu groß. Erlaubt sind höchstens 8 MB.');
      const decoded = await transfers.decode(await file.text()), candidate = transfers.validate(decoded,pool,archiveReplacements,core,progress,history);
      progress.merge(playerProgress,candidate.progress); // Check conflicts before offering replacement.
      history.merge(workHistory,candidate.history);
      if (epoch !== fileEpoch) return;
      pendingImport = candidate;
      const phase = !candidate.state ? 'Kein laufender Raum' : candidate.state.phase === 'playing' ? 'Laufender Raum · ' + candidate.state.attempts + ' von 2 Versuchen verbraucht' : candidate.state.phase === 'unlocked' ? 'Gelöster Raum' : 'Beendete Runde';
      const earned = progress.collection(candidate.progress).filter(badge=>badge.earned).length;
      $('import-description').textContent = new Date(candidate.savedAt).toLocaleString('de-DE') + ' · ' + phase + ' · ' + (candidate.state?.escaped || 0) + ' geöffnete Räume · Rekord ' + candidate.best + ' · ' + earned + ' Abzeichen · ' + candidate.history.rooms.length + ' Räume in der Bildhistorie.' + (candidate.legacyHistory ? ' Diese ältere Datei enthält noch keine Bildhistorie; dein vorhandener Verlauf bleibt erhalten.' : '') + (candidate.updated ? ' Der Raum wird an das aktualisierte Werkarchiv angepasst.' : '');
      $('save-status').textContent = 'Datei und Inhalt sind geprüft. Übernehmen wird erst mit deiner Bestätigung wirksam.';
      $('import-preview').hidden = false;
    } catch (error) { if (epoch === fileEpoch) $('save-status').textContent = error.message; }
    finally { setTransferBusy(false); }
  }
  function confirmImport() {
    if (!pendingImport || transferBusy) return;
    try {
      const candidate = pendingImport, merged = progress.merge(playerProgress,candidate.progress), mergedHistory=history.merge(workHistory,candidate.history), nextBest = Math.max(best,candidate.best);
      const entries = [[keys.game,candidate.state ? JSON.stringify(candidate.state) : null],[keys.best,String(nextBest)],[keys.progress,JSON.stringify(merged)],[keys.history,JSON.stringify(mergedHistory)]];
      const old = entries.map(([key])=>[key,store.get(key)]);
      try {
        for (const [key,value] of entries) {
          if (value === null) { localStorage.removeItem(key); } else if (!store.set(key,value)) throw Error('Der Browser kann die Datei nicht dauerhaft übernehmen. Bitte erlaube lokalen Browserspeicher.');
        }
      } catch (error) {
        for (const [key,value] of old) { if (value === null) store.remove(key); else store.set(key,value); }
        throw error;
      }
      finishIntro(); close('result-dialog');
      state = candidate.state; best = nextBest; playerProgress = merged; workHistory=mergedHistory;historyBlocked=false;pendingImport = null;
      aiClient?.clear(); refreshHistory();
      $('import-preview').hidden = true; $('archive-update').hidden = true;
      refreshBadges(); render();
      $('progress-notice').hidden = false;
      $('progress-notice').textContent = 'Spielstand übernommen. Deine Bildhistorie, gesammelten Abzeichen und dein höherer Rekord bleiben erhalten.';
      close('save-dialog'); toGame();
    } catch (error) { $('save-status').textContent = error.message; }
  }
  function open(id) { if (!$(id).open) $(id).showModal(); }
  function close(id) { if ($(id).open) $(id).close(); }
  function toGame() { $('spiel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'}); }
  function stopImages() {
    imageEpoch++;
    imageTimers.forEach(clearTimeout); imageTimers.clear();
    document.querySelectorAll('.mini-frame img, #art-grid img, #solutions img, #zoom-image').forEach(img => { img.removeAttribute('src'); if (img.id !== 'zoom-image') img.remove(); });
    ready.clear(); failed.clear(); close('image-dialog'); close('solution-dialog'); close('art-glossary-dialog');
  }
  function heroImages() {
    if (!imagesAllowed || !pool.length) return;
    if (!heroWorks.length) {
      let recent = [];
      try { const saved=JSON.parse(store.get(keys.hero)); if (Array.isArray(saved)) recent=saved; } catch { /* No previous selection. */ }
      heroWorks=core.heroSelection(pool,recent);
      store.set(keys.hero,JSON.stringify(heroWorks.map(work=>work.id)));
    }
    [...document.querySelectorAll('.mini-frame')].forEach((slot,index) => {
      if (slot.querySelector('img')) return;
      const img = node('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
      img.src = imageURL(heroWorks[index]); slot.append(img);
    });
  }
  function askForImages(start) {
    pendingStart = start; open('consent-dialog');
  }
  function prepareIntro() {
    // Never make an external image request before the existing image permission.
    if (!imagesAllowed || !pool.length) return null;
    if (!introPreparation || introPreparation.status==='cancelled' || introPreparation.status==='failed') {
      introPreparation=window.KunstIntro.prepare(core.introSelection(pool,landmarkIds,previousIntro));
    }
    return introPreparation;
  }
  function prepareLaunch() {
    prepareIntro();
    $('launch-privacy').hidden = imagesAllowed;
    $('launch-start').textContent = imagesAllowed ? 'Vollbild & Musik starten →' : 'Kunstbilder erlauben & starten →';
    $('launch-skip').textContent = imagesAllowed ? 'Ohne Vorspann direkt spielen →' : 'Kunstbilder erlauben · direkt spielen →';
    open('launch-dialog');
  }
  async function launchGallery(withIntro = true) {
    close('launch-dialog');
    if (!imagesAllowed) { imagesAllowed = true; store.set(keys.images,'yes'); heroImages(); }
    if (!state) { state = core.newState(pool); save(); }
    render();
    // Keep the focus inside the fullscreen target when the film dialog closes later.
    $('fullscreen').focus({preventScroll:true});
    if (withIntro === false) {
      finishIntro();
      await enterFullscreen();
      toGame();
      return;
    }
    introSoundEnabled = true;
    introAudio.volume=0; introAudio.currentTime=0;
    // Unlock audio and request fullscreen before the first await loses transient activation.
    // Stay silent until the first decoded image and the film are ready together.
    startIntroAudio();
    prepareIntro();
    const launch=++launchEpoch;
    await enterFullscreen();
    if (launch!==launchEpoch || !imagesAllowed) return;
    // The film must be added to the browser's top layer AFTER fullscreen, not below it.
    showIntro({audioPrimed:true});
  }
  function finishIntro({enterGame = false, keepAudio = false, keepPreparation = false} = {}) {
    launchEpoch++;
    introEpoch++; clearTimeout(introTimer); introTimer=null;
    clearTimeout(introWaitTimer); introWaitTimer=null;
    clearInterval(introFadeTimer); introFadeTimer=null;
    if (!keepAudio) { introAudioEpoch++; introAudio.pause(); introAudio.currentTime=0; }
    if (!keepPreparation) { introPreparation?.cancel(); introPreparation=null; }
    close('intro-dialog'); $('intro-slides').replaceChildren(); $('intro-dialog').classList.remove('is-running','is-finale','is-loading');
    $('intro-slides').setAttribute('aria-busy','false'); $('intro-loading').hidden=true;
    if (enterGame && imagesAllowed && pool.length) {
      if (!state) { state = core.newState(pool); save(); render(); }
      toGame();
    }
  }
  function showIntro({audioPrimed = false} = {}) {
    if (!pool.length) return;
    if (!imagesAllowed) { pendingIntro=true; askForImages(false); return; }
    finishIntro({keepAudio:audioPrimed,keepPreparation:true});
    const preparation=prepareIntro(), chosen=preparation.works, epoch=++introEpoch;
    introAudio.volume=0;
    const chapters=[
      {title:pool.length+' Werke. Unzählige Spuren.',text:'Ein Raum wird still. Farben bleiben. In dieser Galerie warten '+pool.length+' echte Kunstwerke auf deinen Blick – und hinter jeder Tür eine neue Auswahl.'},
      {title:'Vier Bilder. Vier Fragen.',text:'Wann entstand das Werk? Welcher Stil? Von wem? Wie gemacht? Ordne Zeit, Stil, Künstler und Technik zu. Jede Antwort passt genau einmal.'},
      {title:'Sehen heißt näher kommen.',text:'Ein Pinselstrich. Eine Linie. Ein unscheinbares Detail. Vergrößere jedes Bild und verschiebe den Ausschnitt mit Maus oder Finger.'},
      {title:'Zwei Versuche. Eine Entscheidung.',text:'Fülle alle 16 Felder und prüfe das Schloss. Nach dem ersten Fehlversuch siehst du genau, welche Zuordnungen falsch waren. Du darfst einmal nachbessern.'},
      {title:'Wie weit trägt dein Blick?',text:'Alles richtig öffnet die nächste Tür. Ein zweiter Fehlversuch beendet die Runde. Nach der Auflösung kannst du weiterlesen – und freigegebene Bilder herunterladen.'},
      {title:'1000 Kunstwerke',text:'Quiz Edition'}
    ];
    chosen.forEach((work,index)=>{
      const finale=index===chosen.length-1;
      const slide=node('div',finale?'intro-slide intro-slide--full':'intro-slide'), image=index===0?preparation.image:node('img'); slide.dataset.id=work.id;
      slide.style.setProperty('--chapter-duration',(finale?11000:7000)+'ms');
      const closeUp=index===1 || index===3, start=closeUp?1.65+Math.random()*.35:1.08+Math.random()*.12;
      slide.style.setProperty('--scale-start',start); slide.style.setProperty('--scale-end',start+.12+Math.random()*.16);
      slide.style.setProperty('--pan-x-start',(Math.random()*10-5)+'%'); slide.style.setProperty('--pan-x-end',(Math.random()*10-5)+'%');
      slide.style.setProperty('--pan-y-start',(Math.random()*8-4)+'%'); slide.style.setProperty('--pan-y-end',(Math.random()*8-4)+'%');
      if(index!==0) { image.alt=''; image.referrerPolicy='no-referrer'; image.src=work.imageLargeURL||imageURL(work); }
      slide.append(image); $('intro-slides').append(slide);
      if (finale) {
        const alternatives=core.shuffle(pool.filter(other=>landmarkIds.includes(other.id) && !chosen.some(selected=>selected.id===other.id)));
        image.onerror=()=>{
          if(epoch!==introEpoch) return;
          const replacement=alternatives.shift();
          if (!replacement) return;
          slide.dataset.id=replacement.id; chosen[index]=replacement;
          previousIntro[index]=replacement.id;
          image.src=replacement.imageLargeURL||imageURL(replacement);
          if ($('intro-dialog').classList.contains('is-finale')) $('intro-art-caption').textContent=core.galleryTitle(replacement)+' · '+replacement.artist;
        };
      }
    });
    const slides=[...$('intro-slides').children];
    const durations=[7000,7000,7000,7000,7000,11000];
    $('intro-progress-bar').style.width='0%';
    let index=0;
    function frame() {
      if (epoch!==introEpoch) return;
      const finale=index===slides.length-1, chapterMs=durations[index];
      $('intro-dialog').style.setProperty('--chapter-duration',chapterMs+'ms');
      $('intro-dialog').classList.toggle('is-finale',finale);
      slides.forEach((slide,i)=>{
        // Keep the pan running while this slide fades out; only opacity follows is-active.
        if (i===index) slide.classList.add('is-started');
        slide.classList.toggle('is-active',i===index);
      });
      $('intro-copy').classList.remove('is-visible');
      $('intro-chapter').textContent='Die Galerie der verschlossenen Türen · '+String(index+1).padStart(2,'0')+' / 06';
      $('intro-heading').textContent=chapters[index].title; $('intro-text').textContent=chapters[index].text;
      void $('intro-copy').offsetWidth; $('intro-copy').classList.add('is-visible');
      $('intro-progress-bar').style.width=durations.slice(0,index+1).reduce((a,b)=>a+b,0)/(introSeconds*1000)*100+'%';
      $('intro-art-caption').textContent=finale ? core.galleryTitle(chosen[index])+' · '+chosen[index].artist : '';
      if (finale) {
        const fadeStart=performance.now();
        introFadeTimer=setInterval(()=>{ introAudio.volume=Math.max(0,.65*(1-(performance.now()-fadeStart)/chapterMs)); },80);
      }
      introTimer=setTimeout(()=>{ index++; index<slides.length?frame():finishIntro({enterGame:true}); },chapterMs);
    }
    $('intro-dialog').classList.add('is-loading');
    $('intro-slides').setAttribute('aria-busy','true');
    $('intro-copy').classList.remove('is-visible'); $('intro-art-caption').textContent='';
    $('intro-loading-title').textContent='Das erste Bild wird geladen …';
    $('intro-loading-text').textContent='Der Vorspann wartet auf das Bild. Du verpasst nichts – oder gehst direkt ins Spiel.';
    $('intro-retry').hidden=true;
    open('intro-dialog');
    introWaitTimer=setTimeout(()=>{ if(epoch===introEpoch) $('intro-loading').hidden=false; },450);
    preparation.ready.then(status=>{
      if(epoch!==introEpoch || !imagesAllowed || !$('intro-dialog').open) return;
      clearTimeout(introWaitTimer); introWaitTimer=null;
      $('intro-slides').setAttribute('aria-busy','false');
      if(status!=='ready') {
        $('intro-loading').hidden=false; $('intro-retry').hidden=false;
        $('intro-loading-title').textContent='Das erste Bild ist gerade nicht erreichbar.';
        $('intro-loading-text').textContent='Du kannst es noch einmal versuchen oder den Vorspann überspringen. Das ist kein Fehlversuch.';
        return;
      }
      previousIntro=chosen.map(work=>work.id);
      $('intro-loading').hidden=true; $('intro-dialog').classList.remove('is-loading');
      $('intro-dialog').classList.add('is-running');
      introAudio.currentTime=0; introAudio.volume=.65;
      frame(); startIntroAudio();
    });
  }
  function start() {
    if (!pool.length) return;
    if (!imagesAllowed) { askForImages(true); return; }
    if (!state) state = core.newState(pool);
    save(); render(); toGame(); void enterFullscreen();
  }
  function newRound() {
    $('archive-update').hidden = true;
    const previous = state;
    state = core.newState(pool, previous);
    delete state.runToken; delete state.parentRoomToken;
    state.escaped = 0;
    save(); if (imagesAllowed) { render(); toGame(); } else askForImages(true);
  }
  function update() {
    $('best').textContent = number(best);
    if (!state) {
      $('room-kicker').textContent = 'Die Galerie wartet'; $('game-title').textContent = 'Der erste Schlüssel.';
      $('escaped').textContent = '00'; $('filled-label').textContent = '0 / 16 zugeordnet'; $('filled-bar').style.width = '0%';
      $('attempts').setAttribute('aria-label','Zwei Versuche verfügbar');
      [...$('attempts').children].forEach(dot=>dot.classList.remove('used'));
      $('review-summary').hidden = true; $('start-game').textContent = 'Galerie betreten →';
      return;
    }
    const done = core.filled(state), playing = state.phase === 'playing';
    $('room-kicker').textContent = 'Raum ' + number(state.phase === 'unlocked' ? state.escaped : state.escaped + 1) + ' · Vier Spuren pro Werk';
    $('game-title').textContent = state.phase === 'unlocked' ? 'Die Tür ist offen.' : state.phase === 'lost' ? 'Hier endet dein Rundgang.' : 'Lies die Bilder.';
    $('escaped').textContent = number(state.escaped);
    $('filled-label').textContent = done + ' / 16 zugeordnet'; $('filled-bar').style.width = done / 16 * 100 + '%';
    const remaining = 2 - state.attempts;
    $('attempts').setAttribute('aria-label', remaining + ' von zwei Versuchen verfügbar');
    [...$('attempts').children].forEach((dot,index) => dot.classList.toggle('used', index < state.attempts));
    document.querySelectorAll('#art-grid select').forEach(select => {
      select.value = state.choices[select.dataset.work]?.[select.dataset.field] || '';
      select.disabled = !playing;
      [...select.options].forEach(option => {
        const owner = core.takenBy(state,select.dataset.work,select.dataset.field,option.value);
        option.disabled = Boolean(owner);
        if (option.dataset.label) option.textContent = option.dataset.label + (owner ? ' · bei Werk ' + 'ABCD'[state.ids.indexOf(owner)] : '');
      });
    });
    renderReview();
    document.querySelectorAll('.art-card').forEach(card => card.classList.toggle('is-solved', state.phase === 'unlocked'));
    $('check').hidden = !playing;
    $('check').disabled = !imagesAllowed || done !== 16 || ready.size !== 4 || failed.size > 0;
    $('check').textContent = 'Schloss prüfen · Versuch ' + (state.attempts + 1) + ' von 2';
    $('next-room').hidden = state.phase !== 'unlocked'; $('play-again').hidden = state.phase !== 'lost';
    $('show-solution').hidden = playing;
    $('show-solution').textContent = 'Mit dem Kurator zu den Lösungen';
    $('lock-visual').classList.toggle('is-open', state.phase === 'unlocked');
    $('lock-visual').classList.toggle('is-lost', state.phase === 'lost');
    $('technical-note').hidden = failed.size === 0;
    $('start-game').textContent = state ? 'Zum aktuellen Raum →' : 'Galerie betreten →';
  }
  function renderReview() {
    const results = core.review(state,pool), byField = new Map(results.map(result => [result.id + ':' + result.field,result]));
    document.querySelectorAll('#art-grid select').forEach(select => {
      const result = byField.get(select.dataset.work + ':' + select.dataset.field);
      const label = select.closest('label'), message = $(select.id + '-result');
      label.classList.toggle('is-incorrect',Boolean(result && !result.changed && !result.correct));
      label.classList.toggle('is-correct',Boolean(result && !result.changed && result.correct));
      label.classList.toggle('is-revised',Boolean(result?.changed));
      select.setAttribute('aria-invalid',result && !result.changed && !result.correct ? 'true' : 'false');
      message.hidden = !result;
      message.textContent = !result ? '' : result.changed ? '↻ Geändert · noch nicht geprüft' : result.correct ? '✓ Richtig bei der Prüfung' : '✕ Falsch bei der Prüfung';
    });
    const visible = results.length > 0 && state.phase === 'playing';
    $('review-summary').hidden = !visible;
    const chronologyHint = curator?.roomHint(state,artKnowledge) || '';
    $('chronology-hint').hidden = !visible || !chronologyHint;
    $('chronology-hint').textContent = chronologyHint;
    if (visible) {
      const wrong = results.filter(result => !result.correct).length, changed = results.filter(result => result.changed).length;
      $('review-title').textContent = 'Erste Prüfung: ' + wrong + ' von 16 Zuordnungen waren falsch.';
      $('review-help').textContent = (changed ? changed + ' Zuordnungen geändert, aber noch nicht erneut geprüft. ' : '') + 'Rückmeldung zur ersten Prüfung: ✕ falsch, ✓ richtig, ↻ geändert und noch ungeprüft. Du hast noch einen Versuch. Zum Tauschen zuerst eine bisherige Zuordnung auf „Zuordnen …“ setzen; danach ist die Antwort wieder frei.';
    }
  }
  function loadWorkImage(work, button, epoch) {
    const img = node('img'); img.alt = core.galleryTitle(work) + ' · zu untersuchende Kunstabbildung';
    img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
    let loaded = false;
    const finish = (ok,slow = false) => {
      if (loaded) return;
      clearTimeout(timer); imageTimers.delete(timer);
      if (epoch !== imageEpoch || !imagesAllowed) return;
      button.querySelector('.image-loading')?.remove();
      if (ok) { loaded = true; ready.add(work.id); failed.delete(work.id); button.disabled = false; rememberWork(work.id); }
      else { failed.add(work.id); button.append(node('div','image-loading',slow ? 'Bild lädt ungewöhnlich lange …' : 'Bild nicht erreichbar')); button.disabled = true; }
      update();
    };
    // A timeout is feedback, not a permanent veto: a later successful onload recovers.
    const timer = setTimeout(() => finish(false,true), 30000); imageTimers.add(timer);
    img.onload = () => finish(img.naturalWidth > 0); img.onerror = () => finish(false);
    button.append(img); img.src = imageURL(work);
  }
  function render() {
    stopImages(); heroImages();
    $('art-grid').replaceChildren();
    if (!state || !imagesAllowed) {
      $('waiting').hidden = false; $('art-grid').hidden = true; $('lock-panel').hidden = true;
      $('start-here').textContent = 'Galerie betreten →'; update(); return;
    }
    const epoch = imageEpoch;
    $('waiting').hidden = true; $('art-grid').hidden = false; $('lock-panel').hidden = false;
    state.ids.forEach((id,index) => {
      const work = workById(id), letter = 'ABCD'[index];
      const card = node('article','art-card'); card.dataset.id = id;
      const heading = node('div','work-heading');
      const marker=node('span','work-marker',letter); marker.setAttribute('aria-label','Werk '+letter);
      const title=node('h3','work-title',core.galleryTitle(work)); title.id='work-title-'+letter;
      heading.append(marker,title);
      const picture = node('button','artwork-button'); picture.type = 'button'; picture.dataset.letter = letter;
      picture.disabled = true; picture.setAttribute('aria-label',core.galleryTitle(work) + ' vergrößern');
      picture.append(node('div','image-loading','Museumsbild wird geladen …'),node('span',null,'⤢ Bild vergrößern'));
      picture.addEventListener('click',() => showImage(work,letter));
      const assignments = node('div','assignments');
      for (const field of core.fields) {
        const label = node('label'); label.append(node('span',null,labels[field]));
        const select = node('select'); select.dataset.work = id; select.dataset.field = field;
        select.id = 'answer-' + letter + '-' + field; select.setAttribute('aria-label','Werk ' + letter + ': ' + labels[field]);
        const empty = node('option',null,'Zuordnen …'); empty.value = ''; select.append(empty);
        state.options[field].forEach(value => { const display = field === 'artist' ? wikiCatalogue.artists[value]?.title || value : value; const option = node('option',null,display); option.value = value; option.dataset.label = display; select.append(option); });
        select.addEventListener('change',() => {
          state = core.choose(state,id,field,select.value); save(); update();
          if (state.attempts === 0) $('feedback').textContent = core.filled(state) === 16 ? 'Alle Antworten sind vergeben. Bereit für die erste Prüfung?' : 'Die Auswahl allein zählt noch nicht als Versuch. Ordne alle 16 Antworten zu.';
          else $('feedback').textContent = core.filled(state) === 16 ? 'Alle Felder sind zugeordnet. Neue Antworten werden erst bei der zweiten Prüfung bewertet.' : 'Zum Tauschen sind Antworten vorübergehend frei. Fülle vor der zweiten Prüfung wieder alle 16 Felder aus.';
        });
        const result = node('small','answer-result'); result.id = select.id + '-result'; result.hidden = true;
        select.setAttribute('aria-describedby',result.id);
        label.append(select,result); assignments.append(label);
      }
      card.append(heading,picture,assignments); $('art-grid').append(card); loadWorkImage(work,picture,epoch);
    });
    $('lock-title').textContent = state.phase === 'unlocked' ? 'Der Schlüssel passt.' : state.phase === 'lost' ? 'Das Schloss bleibt zu.' : 'Das Schloss wartet auf deinen Schlüssel.';
    $('feedback').textContent = state.phase === 'unlocked' ? 'Alle 16 Zuordnungen stimmen. Erfahre mehr über die Werke – oder gehe in den nächsten Raum.' : state.phase === 'lost' ? 'Auch der zweite Versuch war nicht vollständig richtig. Die Runde ist beendet. Du kannst jetzt alle Zuordnungen nachlesen.' : state.attempts === 1 ? 'Der erste Prüfversuch war nicht vollständig richtig. Du hast noch genau einen Versuch. Prüfe deine Zuordnungen sorgfältig.' : 'Ordne erst alle 16 Antworten zu. Die Auswahl allein zählt noch nicht als Versuch.';
    update();
  }
  function nextRoom() {
    if (state?.phase !== 'unlocked') return;
    close('result-dialog'); close('solution-dialog'); close('art-glossary-dialog');
    state = core.newState(pool,state); save(); render(); toGame();
  }
  function inspect() {
    if (ready.size !== 4 || failed.size || !imagesAllowed) return;
    const checked = core.inspect(state,pool);
    if (!checked.checked) return;
    state = checked.state;
    const earned = awardProgress(); save(); update();
    if (state.phase === 'playing') {
      $('lock-visual').classList.remove('shake'); void $('lock-visual').offsetWidth; $('lock-visual').classList.add('shake');
      $('feedback').textContent = checked.correct + ' von 16 Zuordnungen passen. Das Schloss bleibt zu. Du hast noch genau einen Prüfversuch.';
      $('review-summary').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
    } else {
      $('lock-title').textContent = state.phase === 'unlocked' ? 'Der Schlüssel passt.' : 'Das Schloss bleibt zu.';
      $('feedback').textContent = state.phase === 'unlocked' ? 'Alle 16 Zuordnungen sind richtig. Ein neuer Raum wartet – vorher kannst du mit dem Kurator die Spuren in den Bildern erkunden.' : 'Der zweite Prüfversuch war nicht vollständig richtig. Die Runde ist beendet.';
      $('result-kicker').textContent = state.phase === 'unlocked' ? 'Raum gelöst · Das Schloss öffnet sich' : 'Zwei Versuche · Spiel beendet';
      $('result-title').textContent = state.phase === 'unlocked' ? 'Eine Tür weiter.' : 'Bis hierher. Und beim nächsten Mal?';
      $('result-text').textContent = state.phase === 'unlocked' ? 'Vier Werke, 16 richtige Spuren. Geh noch einmal mit dem Kurator zu den Bildern: Welche Beobachtungen stützen deine Lösung? Oder wagst du den nächsten Raum?' : checked.correct + ' von 16 Zuordnungen waren im letzten Versuch richtig. Der Kurator begleitet dich noch einmal zu den Bildern – mit Hinweisen, die dir beim nächsten Rundgang helfen können.';
      $('result-number').textContent = number(state.escaped);
      $('result-badges').hidden = !earned.length;
      $('result-badges').textContent = earned.length ? 'Neu in deiner Sammlung: ' + earned.map(badge=>badge.title).join(' · ') : '';
      $('result-action').textContent = state.phase === 'unlocked' ? 'Nächster Raum →' : 'Neue Runde beginnen ↻';
      $('result-solution').textContent = 'Mit dem Kurator noch einmal hinsehen';
      open('result-dialog');
    }
  }
  function showImage(work,letter) {
    if (!imagesAllowed) return;
    cancelZoomLoad();
    const epoch = zoomEpoch;
    $('image-title').textContent = 'Vergrößerte Kunstansicht';
    $('zoom-image').alt = 'Vergrößerte Ansicht: ' + core.galleryTitle(work);
    $('zoom-image').onload = () => imageViewer.layout();
    $('zoom-image').referrerPolicy = 'no-referrer'; $('zoom-image').src = imageURL(work);
    open('image-dialog'); imageViewer.reset();
    const large = work.imageLargeURL || imageURL(work);
    if (large !== imageURL(work)) {
      zoomLoad = new Image(); zoomLoad.referrerPolicy = 'no-referrer';
      zoomLoad.onload = () => { if (epoch === zoomEpoch && $('image-dialog').open && imagesAllowed) $('zoom-image').src = large; };
      zoomLoad.src = large;
    }
  }
  function cancelZoomLoad() {
    zoomEpoch++;
    if (zoomLoad) { zoomLoad.onload = null; zoomLoad.removeAttribute('src'); zoomLoad = null; }
  }
  const imageViewer = window.KunstTresorZoom.create({view:$('zoom-view'),image:$('zoom-image'),stage:$('zoom-stage'),label:$('zoom-label'),zoomIn:$('zoom-in'),zoomOut:$('zoom-out')});
  window.addEventListener('resize',() => { if ($('image-dialog').open) imageViewer.layout(); });
  window.addEventListener('blur',() => imageViewer.cancel());
  $('image-dialog').addEventListener('close',() => { imageViewer.cancel(); cancelZoomLoad(); });
  const techniqueArticle = {
    'Öl auf Leinwand':'Ölmalerei', 'Öl auf Holz':'Tafelmalerei', 'Öl auf Papier / Karton':'Ölmalerei', 'Öl und Metallauflage':'Blattgold',
    Tempera:'Temperamalerei', Pastell:'Pastellmalerei', Aquarell:'Aquarell', Radierung:'Radierung',
    'Radierung mit Aquatinta':'Aquatinta', 'Kaltnadelradierung':'Kaltnadelradierung', Lithografie:'Lithografie',
    Holzschnitt:'Holzschnitt', Kupferstich:'Kupferstich', Kreidezeichnung:'Zeichnung (Kunst)',
    Tuschezeichnung:'Tuschezeichnung', Graphitzeichnung:'Zeichnung (Kunst)', Kohlezeichnung:'Zeichenkohle', Gouache:'Gouache',
    'Fotogravüre':'Heliogravüre', 'Platindruck':'Platindruck', 'Gummidruck':'Gummidruck', 'Silbergelatineabzug':'Gelatineverfahren'
  };
  const styleArticle = {Realismus:'Realismus (Kunst)',Symbolismus:'Symbolismus (Bildende Kunst)'};
  function wikiButton(text,title,language = 'de') {
    const button = node('button',null,text + ' ↗'); button.type = 'button'; button.dataset.wiki = title;
    if (language === 'en') button.dataset.wikiLanguage = 'en';
    return button;
  }
  async function downloadImage(work, button, status) {
    if (!core.canDownload(work) || !state || state.phase === 'playing') return;
    if (work.imageBytes > 40*1048576) {
      status.replaceChildren(node('span',null,'Diese Originaldatei ist größer als 40 MB. '));
      const link=node('a',null,'Originalbild direkt öffnen und speichern ↗'); link.href=work.imageOriginalURL; link.target='_blank'; link.rel='noopener noreferrer'; link.referrerPolicy='no-referrer'; status.append(link); return;
    }
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),60000);
    button.disabled = true; status.textContent = 'Die freigegebene Originaldatei wird von Wikimedia Commons geladen …';
    try {
      const response = await fetch(work.imageOriginalURL,{credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
      if (!response.ok) throw Error('Download');
      const blob = await response.blob(), url = URL.createObjectURL(blob);
      const link = node('a'); link.href = url;
      const extension = new URL(work.imageOriginalURL).pathname.match(/\.([a-z0-9]{2,6})$/i)?.[1] || 'jpg';
      link.download = core.galleryTitle(work).replace(/[\\/<>:"|?*]/g,'-').slice(0,120) + '.' + extension;
      document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
      status.textContent = 'Download angefordert. Auf dem iPad lässt sich eine geöffnete Bilddatei über „Teilen“ oder „In Dateien sichern“ speichern.';
    } catch {
      status.replaceChildren(node('span',null,'Der direkte Download war nicht möglich. '));
      const link = node('a',null,'Originalbild öffnen und speichern ↗'); link.href = work.imageOriginalURL; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer'; status.append(link);
    } finally { clearTimeout(timeout); button.disabled = false; }
  }
  function referenceLink(reference) {
    const link=node('a',null,reference.title+' ↗'); link.href=reference.url; link.target='_blank'; link.rel='noopener noreferrer'; link.referrerPolicy='no-referrer'; return link;
  }
  function renderCurator(work) {
    const container=node('div','curator-reading'), explanation=curator?.explain(work,state,artKnowledge,pool);
    if(!explanation) {
      container.append(node('p',null,'Die Kuratorenhinweise konnten nicht geladen werden. Die Werkangaben und Quellen stehen dir trotzdem zur Verfügung. Bitte lade die Seite erneut, um auch die Erklärungen zu lesen.'));
      return container;
    }
    const opening=node('p','curator-opening',explanation.opening); opening.dataset.curatorWork=work.id;
    aiBaseline.set(work.id,explanation.opening); container.append(opening);
    const previous=previousWorks()?.find(entry=>entry.id===work.id), historyNote=history.note(previous);
    if(historyNote) container.append(node('p','curator-history',historyNote));
    if(explanation.temporal) container.append(node('p','curator-time',explanation.temporal));
    if(explanation.mistake) container.append(node('p','curator-comparison',explanation.mistake));
    if(explanation.workNote) container.append(node('p','curator-work-note',explanation.workNote));
    explanation.sections.forEach(section => {
      const block=node('section','curator-section');
      block.append(node('h4',null,section.label+' · '+section.answer));
      section.paragraphs.forEach(paragraph=>block.append(node('p',null,paragraph)));
      const glossaryButton=node('button','curator-glossary-link',section.answer+' im Glossar'); glossaryButton.type='button';
      glossaryButton.onclick=()=>showArtGlossary(section.answer,section.field==='style'?'styles':'techniques'); block.append(glossaryButton);
      container.append(block);
    });
    const references=node('details','curator-references'); references.append(node('summary',null,'Museumsquellen zu diesen Hinweisen'));
    const list=node('ul'); explanation.sources.forEach(reference=>{const item=node('li');item.append(referenceLink(reference));list.append(item);}); references.append(list); container.append(references);
    return container;
  }
  function renderArtGlossary(expand=false) {
    const list=$('art-glossary-entries'); list.replaceChildren();
    if(!artKnowledge) { $('art-glossary-count').textContent='Das Glossar konnte nicht geladen werden. Bitte lade die Seite erneut.'; return; }
    const search=$('art-glossary-search').value.trim().toLocaleLowerCase('de'), category=$('art-glossary-category').value;
    const entries=['techniques','styles'].filter(group=>!category || category===group).flatMap(group=>Object.entries(artKnowledge[group]).map(([name,profile])=>({name,profile,group}))).filter(entry=>(entry.name+' '+(entry.profile.kind || '')).toLocaleLowerCase('de').includes(search)).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    $('art-glossary-count').textContent=entries.length+' von 55 Begriffen';
    if(!entries.length) list.append(node('p',null,'Dazu gibt es hier keinen Eintrag. Versuche einen kürzeren Suchbegriff oder wechsle zu „Alle Begriffe“.'));
    entries.forEach(({name,profile,group})=>{
      const entry=node('details','art-glossary-entry'); entry.open=expand && name.toLocaleLowerCase('de')===search;
      const summary=node('summary'); summary.append(node('span',null,name),node('small',null,profile.kind || 'Material / Technik')); entry.append(summary);
      const body=node('div','art-glossary-body'); body.append(node('p',null,profile.definition));
      body.append(node('h3',null,'Mögliche Erkennungsmerkmale')); const clues=node('ul'); profile.clues.forEach(clue=>clues.append(node('li',null,clue))); body.append(clues);
      body.append(node('p',null,'Zeitkontext: '+profile.period+'.'),node('p',null,'Wichtige Vergleichsnamen: '+profile.artists.join(', ')+'.'));
      if(profile.origin) body.append(node('p',null,profile.origin.statement));
      body.append(node('p','glossary-caution',profile.caution));
      const references=node('ul','glossary-sources'); profile.sources.forEach(id=>{const item=node('li');item.append(referenceLink(artKnowledge.sources[id]));references.append(item);});body.append(references);
      // Existing archive records provide individual material examples, not a
      // frequency claim about the artist's entire career.
      if(group==='techniques') {
        const examples=profile.artists.map(artist=>pool.find(work=>curator.artistKey(work.artistIdentity || work.artist)===curator.artistKey(artist) && work.technique===name)).filter(Boolean);
        if(examples.length) { const examplesList=node('ul','glossary-sources'); examples.forEach(work=>{const item=node('li');item.append(referenceLink({title:work.artist+' · '+core.galleryTitle(work)+' · Werkbeleg',url:work.source}));examplesList.append(item);});body.append(examplesList); }
      }
      entry.append(body);list.append(entry);
    });
  }
  function showArtGlossary(term='',category='') {
    if(!state || state.phase==='playing') return;
    $('art-glossary-search').value=term; $('art-glossary-category').value=category; renderArtGlossary(Boolean(term)); open('art-glossary-dialog'); $('art-glossary-dialog').scrollTop=0;
    if(!term) $('art-glossary-search').focus();
  }
  function solutions() {
    if (!state || state.phase === 'playing') return;
    aiClient?.cancel(); aiDisplayEpoch++; aiBaseline=new Map();
    close('result-dialog'); $('solutions').replaceChildren();
    state.ids.forEach((id,index) => {
      const work = workById(id), card = node('article','solution-card'), overview=node('div','solution-overview'), sources=node('footer','solution-sources');
      if (imagesAllowed) {
        const imageButton = node('button','solution-image'); imageButton.type = 'button';
        imageButton.setAttribute('aria-label','Werk ' + 'ABCD'[index] + ' in der Lösung vergrößern');
        const img = node('img'); img.alt = core.galleryTitle(work); img.referrerPolicy = 'no-referrer'; img.src = imageURL(work);
        imageButton.append(img,node('span',null,'⤢ Bild vergrößern'));
        imageButton.onclick = () => showImage(work,'ABCD'[index]); overview.append(imageButton);
      }
      overview.append(node('p','eyebrow','Werk ' + 'ABCD'[index]),node('h3',null,core.galleryTitle(work)));
      if (core.galleryTitle(work)!==work.title) overview.append(node('p','small title-origin','Originaltitel der Werkquelle: ' + work.title + (work.titleDeTranslated ? ' · Eigene deutsche Übersetzung; kein offizieller Museumstitel.' : '')));
      const list = node('dl'); core.fields.forEach(field => list.append(node('dt',null,labels[field]),node('dd',null,work[field]))); overview.append(list);
      card.append(overview,renderCurator(work));
      sources.append(node('p','small','Quellenangabe zur Technik: ' + work.medium + '. ' + (work.metadataProvider==='Cleveland Museum of Art' ? 'Stilzuordnung: ' + work.styleSource : 'Dokumentierter Stil: ' + work.styleOriginal) + '.'));
      const source = node('a','small',work.metadataProvider==='Wikidata'?'Werkdatensatz & Nachweise ↗':'Originalwerk & Museumsdaten ↗'); source.href = work.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.referrerPolicy = 'no-referrer'; sources.append(source);
      if (work.catalogueSource) {
        const catalogue=node('a','small','Weiterführender Werknachweis ↗');
        catalogue.href=work.catalogueSource; catalogue.target='_blank'; catalogue.rel='noopener noreferrer'; catalogue.referrerPolicy='no-referrer'; sources.append(catalogue);
      }
      const imageSource = node('a','small',' · Commons-Bildquelle & Rechte ↗'); imageSource.href = work.imageSource; imageSource.target = '_blank'; imageSource.rel = 'noopener noreferrer'; imageSource.referrerPolicy = 'no-referrer'; sources.append(imageSource);
      sources.append(node('p','small','Bild: ' + work.imageCredit + ' · ' + work.imageLicense + '.'));
      if (core.canDownload(work)) {
        const actions = node('div','image-download'), button = node('button',null,'↓ Bild herunterladen' + (work.imageBytes ? ' · ' + (work.imageBytes/1048576).toLocaleString('de-DE',{maximumFractionDigits:1}) + ' MB' : ''));
        button.type='button'; button.setAttribute('aria-label','Originalbild von Werk ' + 'ABCD'[index] + ' herunterladen');
        const status = node('p','small'); status.setAttribute('role','status');
        button.onclick = () => downloadImage(work,button,status);
        actions.append(button,node('p','small','Download erlaubt: Commons weist diese konkrete Bilddatei als ' + work.imageLicense + ' aus. Originalauflösung; Datei kann groß sein.'),status); sources.append(actions);
      }
      const links = node('div','wiki-links'); links.append(node('p',null,'Weiterlesen in Wikipedia · Artikel im Fenster'));
      const artistArticle = wikiCatalogue.artists[work.artist];
      if (artistArticle) links.append(wikiButton('Künstler: ' + work.artist,artistArticle.title,artistArticle.language));
      const movementArticle = wikiCatalogue.styles?.[work.style];
      links.append(wikiButton(work.style,movementArticle?.title || styleArticle[work.style] || work.style,movementArticle?.language || 'de'),wikiButton(work.technique,techniqueArticle[work.technique] || work.technique));
      const workArticle = wikiCatalogue.works[work.id];
      if (workArticle) links.append(wikiButton('Wikipedia zum Werk: ' + core.galleryTitle(work),workArticle.title,workArticle.language));
      const year = work.date.match(/\b(1[3-9]\d{2})\b/)?.[1];
      if (year) links.append(wikiButton('Zeitkontext: ' + year,year));
      links.append(node('p','small','Artikel nach Möglichkeit auf Deutsch; sonst Englisch. Zeitkontext: Jahresartikel, kein Beleg für die Datierung des Werks.'));
      sources.append(links); card.append(sources); $('solutions').append(card);
    });
    open('solution-dialog');
    void requestAI();
  }
  function resetAIReading() {
    $('ai-intro').hidden=true; $('ai-intro').textContent=''; $('ai-retry').hidden=true;
    $('solutions').querySelectorAll('[data-curator-work]').forEach(element=>{
      element.textContent=aiBaseline.get(element.dataset.curatorWork) || element.textContent;
      element.classList.remove('is-ai');
    });
  }
  async function requestAI(retry=false) {
    resetAIReading();
    if (!state || state.phase==='playing' || !$('solution-dialog').open) return;
    if (!aiAllowed || !aiEnabled) { $('ai-status').textContent='Redaktionelle Kuratorenhinweise · KI-Antworten sind ausgeschaltet.'; return; }
    if (!aiClient || !aiEndpoint) { $('ai-status').textContent='Der KI-Dienst ist noch nicht freigeschaltet. Du liest die vollständigen redaktionellen Hinweise.'; return; }
    const input=ki.payload(state,playerProgress,previousWorks()), roomToken=state.roomToken, epoch=++aiDisplayEpoch;
    await aiClient.request(input,result=> {
      if (epoch!==aiDisplayEpoch || !aiAllowed || !aiEnabled || state?.roomToken!==roomToken || !$('solution-dialog').open) return;
      if (result.status==='pending') { $('ai-status').textContent='Die KI formuliert deine persönliche Ansprache. Die redaktionellen Hinweise kannst du bereits lesen.'; return; }
      if (result.status!=='ready') {
        resetAIReading(); $('ai-status').textContent='Die KI ist gerade nicht verfügbar. Hier bleiben die vollständigen redaktionellen Kuratorenhinweise.';
        $('ai-retry').hidden=false; return;
      }
      $('ai-status').textContent='Persönliche Ansprachen mit KI formuliert · Sachhinweise und Museumsquellen bleiben redaktionell. KI kann irren.';
      $('ai-intro').textContent=result.data.intro; $('ai-intro').hidden=false;
      const byId=new Map(result.data.works.map(work=>[work.id,work.text]));
      $('solutions').querySelectorAll('[data-curator-work]').forEach(element=>{
        element.textContent=byId.get(element.dataset.curatorWork); element.classList.add('is-ai');
      });
    },{retry});
  }
  function updateAIToggles() {
    const active=aiAllowed && aiEnabled;
    document.querySelectorAll('[data-ai-toggle]').forEach(button=>{
      button.textContent='KI-Antworten: ' + (active ? 'An' : 'Aus');
      button.setAttribute('aria-pressed',String(active));
      button.disabled=!aiEndpoint;
    });
  }
  function setAIEnabled(enabled) {
    aiEnabled=enabled; store.set(aiEnabledKey,enabled ? 'yes' : 'no');
    aiDisplayEpoch++; aiClient?.cancel(); updateAIToggles();
    if (enabled) { void requestAI(); return; }
    resetAIReading(); $('ai-status').textContent='Redaktionelle Kuratorenhinweise · KI-Antworten sind ausgeschaltet.';
  }
  function toggleAI() {
    if (!aiEndpoint) return;
    if (!aiAllowed) { aiSettings(); return; }
    setAIEnabled(!aiEnabled);
  }
  function aiSettings() {
    $('ai-enable').disabled=!aiEndpoint;
    $('ai-disable').textContent=aiAllowed ? 'Freigabe widerrufen' : 'Ohne KI fortfahren';
    $('ai-availability').textContent=aiEndpoint ? (aiAllowed ? 'Freigabe vorhanden · KI-Antworten sind gerade ' + (aiEnabled ? 'eingeschaltet.' : 'ausgeschaltet.') : 'Bisher keine Freigabe. Es wird noch keine KI-Anfrage gesendet.') : 'Der geschützte Rückmeldedienst wird noch eingerichtet. Bis dahin bleiben die redaktionellen Texte aktiv.';
    open('ai-dialog');
  }
  function fullscreenLabel() {
    const active = document.fullscreenElement === $('spiel') || $('spiel').classList.contains('fullscreen-fallback');
    $('fullscreen').innerHTML = active ? '<span>Vollbild verlassen</span>' : '<span>Vollbild</span>';
    $('fullscreen').setAttribute('aria-label',active ? 'Vollbild verlassen' : 'Spiel im Vollbild öffnen');
  }
  async function enterFullscreen() {
    if (document.fullscreenElement === $('spiel') || $('spiel').classList.contains('fullscreen-fallback')) return;
    try {
      if (!$('spiel').requestFullscreen) throw Error();
      await $('spiel').requestFullscreen();
    }
    catch { $('spiel').classList.add('fullscreen-fallback'); document.body.classList.add('has-fullscreen'); }
    fullscreenLabel();
  }
  async function fullscreen() {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if ($('spiel').classList.contains('fullscreen-fallback')) { $('spiel').classList.remove('fullscreen-fallback'); document.body.classList.remove('has-fullscreen'); fullscreenLabel(); return; }
    await enterFullscreen();
  }
  document.addEventListener('fullscreenchange',fullscreenLabel);
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]') && $('spiel').classList.contains('fullscreen-fallback')) fullscreen();
  });
  document.addEventListener('click',event => { const button = event.target.closest('[data-close]'); if (button) close(button.dataset.close); });
  $('start-game').onclick = $('start-here').onclick = start;
  $('consent-yes').onclick = () => {
    imagesAllowed = true; store.set(keys.images,'yes'); close('consent-dialog'); heroImages();
    if (pendingStart) { pendingStart = false; start(); } else if (state) render();
    if (pendingIntro) { pendingIntro=false; void launchGallery(); }
  };
  $('consent-no').onclick = () => {
    imagesAllowed = false; store.remove(keys.images); pendingStart = false; close('consent-dialog');
    pendingIntro=false; finishIntro();
    stopImages(); render();
  };
  $('image-settings').onclick = () => askForImages(false);
  $('launch-start').onclick = launchGallery;
  $('launch-skip').onclick = () => launchGallery(false);
  $('launch-read').onclick = () => close('launch-dialog');
  $('intro-replay').onclick = () => { if (!imagesAllowed) { pendingIntro=true; askForImages(false); } else void launchGallery(); };
  $('intro-skip').onclick = () => finishIntro({enterGame:true});
  $('intro-loading-skip').onclick = $('intro-skip').onclick;
  $('intro-retry').onclick = () => { finishIntro(); void launchGallery(); };
  $('intro-sound').onclick = () => {
    if (introAudio.paused) { introSoundEnabled = true; startIntroAudio(); }
    else { introSoundEnabled = false; introAudio.pause(); $('intro-sound').textContent='♫ Musik einschalten'; $('intro-sound').setAttribute('aria-pressed','false'); }
  };
  $('intro-dialog').addEventListener('cancel',() => finishIntro({enterGame:true}));
  document.addEventListener('visibilitychange',() => { if (document.hidden && $('intro-dialog').open) finishIntro(); });
  $('check').onclick = inspect; $('next-room').onclick = nextRoom;
  $('open-badges').onclick = () => { refreshBadges(); open('badges-dialog'); };
  $('open-save').onclick = () => { if (!transferBusy) { pendingImport=null; $('import-preview').hidden=true; $('save-status').textContent=''; } open('save-dialog'); };
  $('export-save').onclick = exportSave;
  $('choose-save').onclick = () => { if (!transferBusy) $('save-file').click(); };
  $('save-file').onchange = readSaveFile;
  $('confirm-import').onclick = confirmImport;
  $('cancel-import').onclick = () => { pendingImport=null; $('import-preview').hidden=true; $('save-status').textContent='Nicht übernommen. Dein bisheriger Spielstand bleibt unverändert.'; };
  $('save-dialog').addEventListener('close',()=>{ fileEpoch++; pendingImport=null; $('import-preview').hidden=true; });
  $('show-solution').onclick = $('result-solution').onclick = solutions;
  $('ai-settings').onclick=aiSettings;
  $('ai-settings-footer').onclick=aiSettings;
  document.querySelectorAll('[data-ai-toggle]').forEach(button=>{ button.onclick=toggleAI; });
  updateAIToggles();
  $('ai-enable').onclick=()=> { if (!aiEndpoint) return; aiAllowed=true; store.set(aiConsentKey,'yes'); close('ai-dialog'); setAIEnabled(true); };
  $('ai-disable').onclick=()=> { aiAllowed=false; store.remove(aiConsentKey); aiClient?.clear(); close('ai-dialog'); setAIEnabled(false); };
  $('ai-retry').onclick=()=>void requestAI(true);
  $('solution-dialog').addEventListener('close',()=>{aiDisplayEpoch++;aiClient?.cancel();});
  $('open-art-glossary').onclick=()=>showArtGlossary();
  $('art-glossary-search').oninput=()=>renderArtGlossary();
  $('art-glossary-category').onchange=()=>renderArtGlossary();
  $('result-action').onclick = () => { close('result-dialog'); state.phase === 'unlocked' ? nextRoom() : newRound(); };
  $('play-again').onclick = newRound;
  $('restart-top').onclick = $('restart-game').onclick = () => { $('clear-best').checked = false; open('restart-dialog'); };
  $('restart-confirm').onclick = () => { if ($('clear-best').checked) { best = 0; store.remove(keys.best); } close('restart-dialog'); newRound(); };
  $('fullscreen').onclick = fullscreen;
  $('retry-images').onclick = render;
  $('replace-room').onclick = () => {
    if (!failed.size || !state || state.phase !== 'playing') return;
    const failedIds = [...failed], previous = state;
    try { state = core.newState(pool.filter(work => !failedIds.includes(work.id)),previous); }
    catch { state = core.newState(pool,previous); }
    state.attempts = previous.attempts; save(); render();
    $('feedback').textContent = 'Technischer Ersatzraum. Deine geöffnete Raumzahl und die bereits verbrauchten Prüfversuche bleiben unverändert.';
  };
  const knowledgeRequest=fetch('data/kunst-glossar.json?v=20261011-kurator',{credentials:'same-origin'}).then(response=>{if(!response.ok)throw Error('Glossar');return response.json();}).catch(()=>null);
  Promise.all([...['data/kunstarchiv.json','data/kunstbilder.json','data/kunst-wikipedia.json','data/kunst-hauptwerke.json','data/kunst-titel-de.json'].map(url => fetch(url+'?v=20261009-vielfalt',{credentials:'same-origin'}).then(response => { if (!response.ok) throw Error('Archiv'); return response.json(); })),knowledgeRequest])
    .then(([data,media,wiki,landmarks,titles,knowledge]) => {
      wikiCatalogue = wiki;
      archiveReplacements = data.replacements || [];
      artKnowledge=knowledge;
      const images = new Map(media.images.map(image => [image.id,image]));
      const translated=new Set(titles.ownTranslations);
      pool = data.works.filter(work => images.has(work.id) && wiki.artists[work.artist] && core.validWork(work)).map(work => ({...work,...images.get(work.id),titleDe:titles.titles[work.id],titleDeTranslated:translated.has(work.id),artistIdentity:wiki.artists[work.artist].language+':'+wiki.artists[work.artist].title}));
      landmarkIds = landmarks.works.map(work=>work.id).filter(id=>pool.some(work=>work.id===id));
      if(pool.length<1000 || pool.length!==data.works.length || images.size!==pool.length || landmarkIds.length!==100 || pool.some(work=>!work.titleDe)) throw Error('Archiv unvollständig');
      core.room(pool); // Verify that a complete, unique room can actually be generated.
      try {
        const restored = core.restoreUpdated(JSON.parse(store.get(keys.game)),pool,data.replacements);
        state = restored.state;
        if (restored.updated) {
          save(); $('archive-update').hidden=false;
          $('archive-update').textContent=restored.newRoom
            ? 'Das Schwarzweißwerk wurde ersetzt. Damit alle Antworten weiterhin eindeutig sind, wurde dieser Raum neu zusammengestellt. Bereits geöffnete Türen und dein Rekord bleiben erhalten; neue Fragen kosten keinen Prüfversuch. Eine beendete Runde bleibt beendet.'
            : 'Das Schwarzweißwerk wurde durch „Sonnenuntergang an der Oise“ (1866) ersetzt. Deine bisherigen Zuordnungen, Prüfversuche und geöffneten Türen bleiben erhalten; die Jahresauswahl wurde passend aktualisiert.';
        }
      } catch { state = null; }
      if (!state) store.remove(keys.game);
      $('pool-count').textContent = pool.length;
      $('intro-count').textContent = pool.length;
      $('archive-count').textContent = pool.length.toLocaleString('de-DE');
      $('intro-replay').disabled=false;
      $('start-game').disabled = $('start-here').disabled = false;
      $('start-game').textContent = state ? 'Spiel fortsetzen →' : 'Galerie betreten →';
      $('start-here').textContent = state ? 'Spiel fortsetzen →' : 'Galerie betreten →';
      if (state) save(); else saveProgress();
      $('open-save').disabled = false;
      refreshBadges(); refreshHistory();
      $('best').textContent = number(best); prepareLaunch(); heroImages();
      if (state && imagesAllowed) render();
    }).catch(() => {
      $('start-game').textContent = $('start-here').textContent = 'Archiv nicht erreichbar';
      $('waiting').querySelector('p').textContent = 'Das lokale Werkarchiv konnte nicht geladen werden. Bitte lade die veröffentlichte Seite erneut. Eine direkt als Datei geöffnete Kopie benötigt einen Webserver.';
    });
})();
