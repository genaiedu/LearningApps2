(() => {
  'use strict';
  const $ = id => document.getElementById(id), core = window.KunstTresor;
  const keys = {game:'kunsttresor-game-v1', best:'kunsttresor-best-v1', images:'kunsttresor-images-v1', hero:'kunsttresor-hero-v1'};
  const labels = {date:'Entstehungszeit', style:'Stilrichtung', artist:'Künstler', technique:'Technik'};
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key,value) { try { localStorage.setItem(key,value); } catch { /* Private browsers may deny storage. */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* The round still works in memory. */ } }
  };
  let pool = [], landmarkIds = [], heroWorks = [], wikiCatalogue = {artists:{},works:{}}, state = null, best = Math.max(0, Number(store.get(keys.best)) || 0);
  let imagesAllowed = store.get(keys.images) === 'yes', pendingStart = false, imageEpoch = 0;
  let ready = new Set(), failed = new Set(), zoom = 100, zoomEpoch = 0, zoomLoad = null;
  const imageTimers = new Set();
  let introTimer = null, pendingIntro = false, previousIntro = [], introEpoch = 0, introSoundEnabled = true;
  const introAudio = new Audio('../LearningApps/assets/kunst-der-fuge/fuge-orchester-suno.mp3');
  introAudio.preload='metadata'; introAudio.volume=.65;
  const introSeconds=46; // Five 7-second chapters followed by an 11-second full-artwork finale.
  let introFadeTimer=null;
  function startIntroAudio() {
    if (!introSoundEnabled) return;
    introAudio.play().then(()=>{ $('intro-sound').textContent='♫ Musik ausschalten'; $('intro-sound').setAttribute('aria-pressed','true'); })
      .catch(()=>{ $('intro-sound').textContent='♫ Musik einschalten'; $('intro-sound').setAttribute('aria-pressed','false'); });
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
    if (state) store.set(keys.game, JSON.stringify(state));
    if (state && state.escaped > best) { best = state.escaped; store.set(keys.best, String(best)); }
  }
  function open(id) { if (!$(id).open) $(id).showModal(); }
  function close(id) { if ($(id).open) $(id).close(); }
  function toGame() { $('spiel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'}); }
  function stopImages() {
    imageEpoch++;
    imageTimers.forEach(clearTimeout); imageTimers.clear();
    document.querySelectorAll('.mini-frame img, #art-grid img, #solutions img, #zoom-image').forEach(img => { img.removeAttribute('src'); if (img.id !== 'zoom-image') img.remove(); });
    ready.clear(); failed.clear(); close('image-dialog'); close('solution-dialog');
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
  function prepareLaunch() {
    $('launch-privacy').hidden = imagesAllowed;
    $('launch-start').textContent = imagesAllowed ? 'Vollbild & Musik starten →' : 'Kunstbilder erlauben & starten →';
    open('launch-dialog');
  }
  async function launchGallery() {
    close('launch-dialog');
    if (!imagesAllowed) { imagesAllowed = true; store.set(keys.images,'yes'); heroImages(); }
    introSoundEnabled = true;
    if (!state) { state = core.newState(pool); save(); }
    render();
    // Keep the focus inside the fullscreen target when the film dialog closes later.
    $('fullscreen').focus({preventScroll:true});
    introAudio.volume=.65; introAudio.currentTime=0;
    // Unlock audio and request fullscreen before the first await loses transient activation.
    startIntroAudio();
    await enterFullscreen();
    // The film must be added to the browser's top layer AFTER fullscreen, not below it.
    showIntro({audioPrimed:true});
  }
  function finishIntro({enterGame = false, keepAudio = false} = {}) {
    introEpoch++; clearTimeout(introTimer); introTimer=null;
    clearInterval(introFadeTimer); introFadeTimer=null;
    if (!keepAudio) { introAudio.pause(); introAudio.currentTime=0; }
    close('intro-dialog'); $('intro-slides').replaceChildren(); $('intro-dialog').classList.remove('is-running','is-finale');
    if (enterGame && imagesAllowed && pool.length) {
      if (!state) { state = core.newState(pool); save(); render(); }
      toGame();
    }
  }
  function showIntro({audioPrimed = false} = {}) {
    if (!pool.length) return;
    if (!imagesAllowed) { pendingIntro=true; askForImages(false); return; }
    finishIntro({keepAudio:audioPrimed});
    introAudio.volume=.65;
    const chosen=core.introSelection(pool,landmarkIds,previousIntro);
    previousIntro=chosen.map(work=>work.id);
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
      const slide=node('div',finale?'intro-slide intro-slide--full':'intro-slide'), image=node('img'); slide.dataset.id=work.id;
      slide.style.setProperty('--chapter-duration',(finale?11000:7000)+'ms');
      const closeUp=index===1 || index===3, start=closeUp?1.65+Math.random()*.35:1.08+Math.random()*.12;
      slide.style.setProperty('--scale-start',start); slide.style.setProperty('--scale-end',start+.12+Math.random()*.16);
      slide.style.setProperty('--pan-x-start',(Math.random()*10-5)+'%'); slide.style.setProperty('--pan-x-end',(Math.random()*10-5)+'%');
      slide.style.setProperty('--pan-y-start',(Math.random()*8-4)+'%'); slide.style.setProperty('--pan-y-end',(Math.random()*8-4)+'%');
      image.alt=''; image.referrerPolicy='no-referrer'; image.src=work.imageLargeURL||imageURL(work); slide.append(image); $('intro-slides').append(slide);
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
    const slides=[...$('intro-slides').children], epoch=++introEpoch;
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
    open('intro-dialog'); $('intro-dialog').classList.add('is-running'); frame();
    if (!audioPrimed) startIntroAudio();
  }
  function start() {
    if (!pool.length) return;
    if (!imagesAllowed) { askForImages(true); return; }
    if (!state) state = core.newState(pool);
    save(); render(); toGame(); void enterFullscreen();
  }
  function newRound() {
    const previous = state;
    state = core.newState(pool, previous);
    state.escaped = 0;
    save(); if (imagesAllowed) { render(); toGame(); } else askForImages(true);
  }
  function update() {
    $('best').textContent = number(best);
    if (!state) return;
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
    $('show-solution').textContent = 'Zuordnungen, Quellen & Wikipedia';
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
      if (ok) { loaded = true; ready.add(work.id); failed.delete(work.id); button.disabled = false; }
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
    close('result-dialog'); close('solution-dialog');
    state = core.newState(pool,state); save(); render(); toGame();
  }
  function inspect() {
    if (ready.size !== 4 || failed.size || !imagesAllowed) return;
    const checked = core.inspect(state,pool);
    if (!checked.checked) return;
    state = checked.state; save(); update();
    if (state.phase === 'playing') {
      $('lock-visual').classList.remove('shake'); void $('lock-visual').offsetWidth; $('lock-visual').classList.add('shake');
      $('feedback').textContent = checked.correct + ' von 16 Zuordnungen passen. Das Schloss bleibt zu. Du hast noch genau einen Prüfversuch.';
      $('review-summary').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
    } else {
      $('lock-title').textContent = state.phase === 'unlocked' ? 'Der Schlüssel passt.' : 'Das Schloss bleibt zu.';
      $('feedback').textContent = state.phase === 'unlocked' ? 'Alle 16 Zuordnungen sind richtig. Ein neuer Raum wartet – vorher kannst du die Künstler und Stile in Wikipedia erkunden.' : 'Der zweite Prüfversuch war nicht vollständig richtig. Die Runde ist beendet.';
      $('result-kicker').textContent = state.phase === 'unlocked' ? 'Raum gelöst · Das Schloss öffnet sich' : 'Zwei Versuche · Spiel beendet';
      $('result-title').textContent = state.phase === 'unlocked' ? 'Eine Tür weiter.' : 'Bis hierher. Und beim nächsten Mal?';
      $('result-text').textContent = state.phase === 'unlocked' ? 'Vier Werke, 16 richtige Spuren. Du kannst jetzt über die Künstler, Stile und Techniken weiterlesen. Oder wagst du den nächsten Raum?' : checked.correct + ' von 16 Zuordnungen waren im letzten Versuch richtig. Sieh dir die Lösungen an und entdecke, was dir beim nächsten Rundgang helfen könnte.';
      $('result-number').textContent = number(state.escaped);
      $('result-action').textContent = state.phase === 'unlocked' ? 'Nächster Raum →' : 'Neue Runde beginnen ↻';
      $('result-solution').textContent = 'Lösungen & Wikipedia entdecken';
      open('result-dialog');
    }
  }
  function showImage(work,letter) {
    if (!imagesAllowed) return;
    cancelZoomLoad();
    const epoch = zoomEpoch;
    $('image-title').textContent = 'Vergrößerte Kunstansicht';
    $('zoom-image').alt = 'Vergrößerte Ansicht: ' + core.galleryTitle(work);
    $('zoom-image').onload = setZoom;
    $('zoom-image').referrerPolicy = 'no-referrer'; $('zoom-image').src = imageURL(work);
    zoom = 100; open('image-dialog');
    $('zoom-view').scrollTop = $('zoom-view').scrollLeft = 0; setZoom(false);
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
  function setZoom(keepCenter = true) {
    $('zoom-label').textContent = zoom + ' %'; $('zoom-out').disabled = zoom <= 100; $('zoom-in').disabled = zoom >= 300;
    const view = $('zoom-view'), image = $('zoom-image'), stage = $('zoom-stage');
    const previousWidth = image.clientWidth, previousHeight = image.clientHeight;
    const centerX = keepCenter && previousWidth ? (view.scrollLeft + view.clientWidth / 2 - Math.max(0,(stage.clientWidth - previousWidth) / 2)) / previousWidth : .5;
    const centerY = keepCenter && previousHeight ? (view.scrollTop + view.clientHeight / 2 - Math.max(0,(stage.clientHeight - previousHeight) / 2)) / previousHeight : .5;
    view.classList.toggle('is-zoomed',zoom > 100);
    if (image.naturalWidth && image.naturalHeight && view.clientWidth && view.clientHeight) {
      const fit = Math.min(view.clientWidth / image.naturalWidth,view.clientHeight / image.naturalHeight);
      const width = image.naturalWidth * fit * zoom / 100, height = image.naturalHeight * fit * zoom / 100;
      const stageWidth = Math.max(width,view.clientWidth), stageHeight = Math.max(height,view.clientHeight);
      image.style.width = width + 'px'; image.style.height = height + 'px';
      stage.style.width = stageWidth + 'px'; stage.style.height = stageHeight + 'px';
      view.scrollLeft = Math.max(0,(stageWidth-width)/2 + centerX*width - view.clientWidth/2);
      view.scrollTop = Math.max(0,(stageHeight-height)/2 + centerY*height - view.clientHeight/2);
    } else { image.style.width = '100%'; image.style.height = '100%'; stage.style.width = '100%'; stage.style.height = '100%'; }
  }
  window.addEventListener('resize',() => { if ($('image-dialog').open) setZoom(); });
  let pan = null;
  $('zoom-view').addEventListener('pointerdown',event => {
    if (zoom <= 100 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const view = $('zoom-view');
    pan = {pointer:event.pointerId,x:event.clientX,y:event.clientY,left:view.scrollLeft,top:view.scrollTop};
    view.setPointerCapture(event.pointerId); view.classList.add('is-panning'); event.preventDefault();
  });
  $('zoom-view').addEventListener('pointermove',event => {
    if (!pan || pan.pointer !== event.pointerId) return;
    $('zoom-view').scrollLeft = pan.left + pan.x - event.clientX;
    $('zoom-view').scrollTop = pan.top + pan.y - event.clientY;
  });
  const stopPan = () => { pan = null; $('zoom-view').classList.remove('is-panning'); };
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => $('zoom-view').addEventListener(type,stopPan));
  $('image-dialog').addEventListener('close',() => { stopPan(); cancelZoomLoad(); });
  const techniqueArticle = {
    'Öl auf Leinwand':'Ölmalerei', 'Öl auf Holz':'Tafelmalerei', 'Öl auf Papier / Karton':'Ölmalerei', 'Öl und Metallauflage':'Blattgold',
    Tempera:'Temperamalerei', Pastell:'Pastellmalerei', Aquarell:'Aquarell', Radierung:'Radierung',
    'Radierung mit Aquatinta':'Aquatinta', 'Kaltnadelradierung':'Kaltnadelradierung', Lithografie:'Lithografie',
    Holzschnitt:'Holzschnitt', Kupferstich:'Kupferstich', Kreidezeichnung:'Zeichnung (Kunst)',
    Tuschezeichnung:'Tuschezeichnung', Graphitzeichnung:'Zeichnung (Kunst)',
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
  function solutions() {
    if (!state || state.phase === 'playing') return;
    close('result-dialog'); $('solutions').replaceChildren();
    state.ids.forEach((id,index) => {
      const work = workById(id), card = node('article','solution-card');
      if (imagesAllowed) {
        const imageButton = node('button','solution-image'); imageButton.type = 'button';
        imageButton.setAttribute('aria-label','Werk ' + 'ABCD'[index] + ' in der Lösung vergrößern');
        const img = node('img'); img.alt = core.galleryTitle(work); img.referrerPolicy = 'no-referrer'; img.src = imageURL(work);
        imageButton.append(img,node('span',null,'⤢ Bild vergrößern'));
        imageButton.onclick = () => showImage(work,'ABCD'[index]); card.append(imageButton);
      }
      card.append(node('p','eyebrow','Werk ' + 'ABCD'[index]),node('h3',null,core.galleryTitle(work)));
      if (core.galleryTitle(work)!==work.title) card.append(node('p','small title-origin','Originaltitel der Werkquelle: ' + work.title + (work.titleDeTranslated ? ' · Eigene deutsche Übersetzung; kein offizieller Museumstitel.' : '')));
      const list = node('dl'); core.fields.forEach(field => list.append(node('dt',null,labels[field]),node('dd',null,work[field]))); card.append(list);
      card.append(node('p','small','Quellenangabe zur Technik: ' + work.medium + '. Dokumentierter Stil: ' + work.styleOriginal + '.'));
      const source = node('a','small',work.metadataProvider==='Wikidata'?'Werkdatensatz & Nachweise ↗':'Originalwerk & Museumsdaten ↗'); source.href = work.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.referrerPolicy = 'no-referrer'; card.append(source);
      if (work.catalogueSource) {
        const catalogue=node('a','small','Weiterführender Werknachweis ↗');
        catalogue.href=work.catalogueSource; catalogue.target='_blank'; catalogue.rel='noopener noreferrer'; catalogue.referrerPolicy='no-referrer'; card.append(catalogue);
      }
      const imageSource = node('a','small',' · Commons-Bildquelle & Rechte ↗'); imageSource.href = work.imageSource; imageSource.target = '_blank'; imageSource.rel = 'noopener noreferrer'; imageSource.referrerPolicy = 'no-referrer'; card.append(imageSource);
      card.append(node('p','small','Bild: ' + work.imageCredit + ' · ' + work.imageLicense + '.'));
      if (core.canDownload(work)) {
        const actions = node('div','image-download'), button = node('button',null,'↓ Bild herunterladen' + (work.imageBytes ? ' · ' + (work.imageBytes/1048576).toLocaleString('de-DE',{maximumFractionDigits:1}) + ' MB' : ''));
        button.type='button'; button.setAttribute('aria-label','Originalbild von Werk ' + 'ABCD'[index] + ' herunterladen');
        const status = node('p','small'); status.setAttribute('role','status');
        button.onclick = () => downloadImage(work,button,status);
        actions.append(button,node('p','small','Download erlaubt: Commons weist diese konkrete Bilddatei als ' + work.imageLicense + ' aus. Originalauflösung; Datei kann groß sein.'),status); card.append(actions);
      }
      const links = node('div','wiki-links'); links.append(node('p',null,'Weiterlesen in Wikipedia · Artikel im Fenster'));
      const artistArticle = wikiCatalogue.artists[work.artist];
      if (artistArticle) links.append(wikiButton('Künstler: ' + work.artist,artistArticle.title,artistArticle.language));
      links.append(wikiButton(work.style,styleArticle[work.style] || work.style),wikiButton(work.technique,techniqueArticle[work.technique] || work.technique));
      const workArticle = wikiCatalogue.works[work.id];
      if (workArticle) links.append(wikiButton('Wikipedia zum Werk: ' + core.galleryTitle(work),workArticle.title,workArticle.language));
      const year = work.date.match(/\b(1[3-9]\d{2})\b/)?.[1];
      if (year) links.append(wikiButton('Zeitkontext: ' + year,year));
      links.append(node('p','small','Artikel nach Möglichkeit auf Deutsch; sonst Englisch. Zeitkontext: Jahresartikel, kein Beleg für die Datierung des Werks.'));
      card.append(links); $('solutions').append(card);
    });
    open('solution-dialog');
  }
  function fullscreenLabel() {
    const active = document.fullscreenElement === $('spiel') || $('spiel').classList.contains('fullscreen-fallback');
    $('fullscreen').innerHTML = active ? '⤢ <span>Vollbild verlassen</span>' : '⛶ <span>Vollbild</span>';
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
  $('launch-read').onclick = () => close('launch-dialog');
  $('intro-replay').onclick = () => { if (!imagesAllowed) { pendingIntro=true; askForImages(false); } else void launchGallery(); };
  $('intro-skip').onclick = () => finishIntro({enterGame:true});
  $('intro-sound').onclick = () => {
    if (introAudio.paused) { introSoundEnabled = true; startIntroAudio(); }
    else { introSoundEnabled = false; introAudio.pause(); $('intro-sound').textContent='♫ Musik einschalten'; $('intro-sound').setAttribute('aria-pressed','false'); }
  };
  $('intro-dialog').addEventListener('cancel',() => finishIntro({enterGame:true}));
  document.addEventListener('visibilitychange',() => { if (document.hidden && $('intro-dialog').open) finishIntro(); });
  $('check').onclick = inspect; $('next-room').onclick = nextRoom;
  $('show-solution').onclick = $('result-solution').onclick = solutions;
  $('result-action').onclick = () => { close('result-dialog'); state.phase === 'unlocked' ? nextRoom() : newRound(); };
  $('play-again').onclick = newRound;
  $('restart-top').onclick = $('restart-game').onclick = () => { $('clear-best').checked = false; open('restart-dialog'); };
  $('restart-confirm').onclick = () => { if ($('clear-best').checked) { best = 0; store.remove(keys.best); } close('restart-dialog'); newRound(); };
  $('fullscreen').onclick = fullscreen;
  $('zoom-out').onclick = () => { zoom = Math.max(100,zoom - 25); setZoom(); };
  $('zoom-in').onclick = () => { zoom = Math.min(300,zoom + 25); setZoom(); };
  $('retry-images').onclick = render;
  $('replace-room').onclick = () => {
    if (!failed.size || !state || state.phase !== 'playing') return;
    const failedIds = [...failed], previous = state;
    try { state = core.newState(pool.filter(work => !failedIds.includes(work.id)),previous); }
    catch { state = core.newState(pool,previous); }
    state.attempts = previous.attempts; save(); render();
    $('feedback').textContent = 'Technischer Ersatzraum. Deine geöffnete Raumzahl und die bereits verbrauchten Prüfversuche bleiben unverändert.';
  };
  Promise.all(['data/kunstarchiv.json','data/kunstbilder.json','data/kunst-wikipedia.json','data/kunst-hauptwerke.json','data/kunst-titel-de.json'].map(url => fetch(url+'?v=20261009-titel-de',{credentials:'same-origin'}).then(response => { if (!response.ok) throw Error('Archiv'); return response.json(); })))
    .then(([data,media,wiki,landmarks,titles]) => {
      wikiCatalogue = wiki;
      const images = new Map(media.images.map(image => [image.id,image]));
      const translated=new Set(titles.ownTranslations);
      pool = data.works.filter(work => images.has(work.id) && wiki.artists[work.artist] && core.validWork(work)).map(work => ({...work,...images.get(work.id),titleDe:titles.titles[work.id],titleDeTranslated:translated.has(work.id),artistIdentity:wiki.artists[work.artist].language+':'+wiki.artists[work.artist].title}));
      landmarkIds = landmarks.works.map(work=>work.id).filter(id=>pool.some(work=>work.id===id));
      if(pool.length!==1000 || landmarkIds.length!==100 || pool.some(work=>!work.titleDe)) throw Error('Archiv unvollständig');
      core.room(pool); // Verify that a complete, unique room can actually be generated.
      try { state = core.restore(JSON.parse(store.get(keys.game)),pool); } catch { state = null; }
      if (!state) store.remove(keys.game);
      $('pool-count').textContent = pool.length;
      $('intro-count').textContent = pool.length;
      $('intro-replay').disabled=false;
      $('start-game').disabled = $('start-here').disabled = false;
      $('start-game').textContent = state ? 'Spiel fortsetzen →' : 'Galerie betreten →';
      $('start-here').textContent = state ? 'Spiel fortsetzen →' : 'Galerie betreten →';
      $('best').textContent = number(best); heroImages();
      if (state && imagesAllowed) render();
      prepareLaunch();
    }).catch(() => {
      $('start-game').textContent = $('start-here').textContent = 'Archiv nicht erreichbar';
      $('waiting').querySelector('p').textContent = 'Das lokale Werkarchiv konnte nicht geladen werden. Bitte lade die veröffentlichte Seite erneut. Eine direkt als Datei geöffnete Kopie benötigt einen Webserver.';
    });
})();
