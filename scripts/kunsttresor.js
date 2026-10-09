(() => {
  'use strict';
  const $ = id => document.getElementById(id), core = window.KunstTresor;
  const keys = {game:'kunsttresor-game-v1', best:'kunsttresor-best-v1', images:'kunsttresor-images-v1'};
  const labels = {date:'Entstehungszeit', style:'Stilrichtung', artist:'Künstler', technique:'Technik'};
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key,value) { try { localStorage.setItem(key,value); } catch { /* Private browsers may deny storage. */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* The round still works in memory. */ } }
  };
  let pool = [], wikiCatalogue = {artists:{},works:{}}, state = null, best = Math.max(0, Number(store.get(keys.best)) || 0);
  let imagesAllowed = store.get(keys.images) === 'yes', pendingStart = false, imageEpoch = 0;
  let ready = new Set(), failed = new Set(), zoom = 100;
  const imageTimers = new Set();
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
    const featured = [pool.find(work => work.id === 'aic-28560'), pool.find(work => work.id === 'aic-20684'), pool.find(work => work.technique === 'Aquarell')].filter(Boolean);
    [...document.querySelectorAll('.mini-frame')].forEach((slot,index) => {
      if (slot.querySelector('img')) return;
      const img = node('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
      img.src = imageURL(featured[index] || pool[index]); slot.append(img);
    });
  }
  function askForImages(start) {
    pendingStart = start; open('consent-dialog');
  }
  function start() {
    if (!pool.length) return;
    if (!imagesAllowed) { askForImages(true); return; }
    if (!state) state = core.newState(pool);
    save(); render(); toGame();
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
    });
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
  function loadWorkImage(work, button, epoch) {
    const img = node('img'); img.alt = 'Kunstwerk ' + button.dataset.letter + ' · zu untersuchende Museumsabbildung';
    img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
    let finished = false;
    const finish = ok => {
      if (finished) return; finished = true; clearTimeout(timer); imageTimers.delete(timer);
      if (epoch !== imageEpoch || !imagesAllowed) return;
      button.querySelector('.image-loading')?.remove();
      if (ok) { ready.add(work.id); failed.delete(work.id); button.disabled = false; }
      else { failed.add(work.id); button.append(node('div','image-loading','Bild nicht erreichbar')); button.disabled = true; }
      update();
    };
    const timer = setTimeout(() => finish(false), 30000); imageTimers.add(timer);
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
      const heading = node('div','work-number'); heading.append(node('b',null,'WERK ' + letter),node('span',null,'Original · Museum'));
      const picture = node('button','artwork-button'); picture.type = 'button'; picture.dataset.letter = letter;
      picture.disabled = true; picture.setAttribute('aria-label','Werk ' + letter + ' vergrößern');
      picture.append(node('div','image-loading','Museumsbild wird geladen …'),node('span',null,'⤢ Bild vergrößern'));
      picture.addEventListener('click',() => showImage(work,letter));
      const assignments = node('div','assignments');
      for (const field of core.fields) {
        const label = node('label'); label.append(node('span',null,labels[field]));
        const select = node('select'); select.dataset.work = id; select.dataset.field = field;
        select.id = 'answer-' + letter + '-' + field; select.setAttribute('aria-label','Werk ' + letter + ': ' + labels[field]);
        const empty = node('option',null,'Zuordnen …'); empty.value = ''; select.append(empty);
        state.options[field].forEach(value => { const display = field === 'artist' ? wikiCatalogue.artists[value]?.title || value : value; const option = node('option',null,display); option.value = value; select.append(option); });
        select.addEventListener('change',() => {
          const wasTaken = select.value && state.ids.some(other => other !== id && state.choices[other]?.[field] === select.value);
          state = core.choose(state,id,field,select.value); save(); update();
          if (wasTaken) $('feedback').textContent = 'Diese Antwort wurde neu zugeordnet. Ihre vorherige Zuordnung ist jetzt wieder leer.';
          else if (state.attempts === 0) $('feedback').textContent = core.filled(state) === 16 ? 'Alle Antworten sind vergeben. Bereit für die erste Prüfung?' : 'Die Auswahl allein zählt noch nicht als Versuch. Ordne alle 16 Antworten zu.';
        });
        label.append(select); assignments.append(label);
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
    $('image-title').textContent = 'Werk ' + letter;
    $('zoom-image').alt = 'Vergrößerte Ansicht von Werk ' + letter;
    $('zoom-image').referrerPolicy = 'no-referrer'; $('zoom-image').src = imageURL(work);
    zoom = 100; setZoom(); open('image-dialog');
  }
  function setZoom() {
    $('zoom-label').textContent = zoom + ' %'; $('zoom-out').disabled = zoom <= 100; $('zoom-in').disabled = zoom >= 300;
    $('zoom-view').classList.toggle('is-zoomed',zoom > 100); $('zoom-image').style.width = zoom + '%';
  }
  const techniqueArticle = {
    'Öl auf Leinwand':'Ölmalerei', 'Öl auf Holz':'Tafelmalerei', 'Öl auf Papier / Karton':'Ölmalerei',
    Tempera:'Temperamalerei', Pastell:'Pastellmalerei', Aquarell:'Aquarell', Radierung:'Radierung',
    'Radierung mit Aquatinta':'Aquatinta', 'Kaltnadelradierung':'Kaltnadelradierung', Lithografie:'Lithografie',
    Holzschnitt:'Holzschnitt', Kupferstich:'Kupferstich', Kreidezeichnung:'Zeichnung (Kunst)',
    Tuschezeichnung:'Tuschezeichnung', Graphitzeichnung:'Zeichnung (Kunst)'
  };
  const styleArticle = {Realismus:'Realismus (Kunst)',Symbolismus:'Symbolismus (Bildende Kunst)'};
  function wikiButton(text,title,language = 'de') {
    const button = node('button',null,text + ' ↗'); button.type = 'button'; button.dataset.wiki = title;
    if (language === 'en') button.dataset.wikiLanguage = 'en';
    return button;
  }
  function solutions() {
    if (!state || state.phase === 'playing') return;
    close('result-dialog'); $('solutions').replaceChildren();
    state.ids.forEach((id,index) => {
      const work = workById(id), card = node('article','solution-card');
      if (imagesAllowed) { const img = node('img'); img.alt = work.title; img.referrerPolicy = 'no-referrer'; img.src = imageURL(work); card.append(img); }
      card.append(node('p','eyebrow','Werk ' + 'ABCD'[index]),node('h3',null,work.title));
      const list = node('dl'); core.fields.forEach(field => list.append(node('dt',null,labels[field]),node('dd',null,work[field]))); card.append(list);
      card.append(node('p','small','Museumsangabe zur Technik: ' + work.medium + '. Dokumentierter Stil: ' + work.styleOriginal + '.'));
      const source = node('a','small','Originalwerk & Museumsdaten ↗'); source.href = work.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.referrerPolicy = 'no-referrer'; card.append(source);
      const imageSource = node('a','small',' · Commons-Bildquelle & Rechte ↗'); imageSource.href = work.imageSource; imageSource.target = '_blank'; imageSource.rel = 'noopener noreferrer'; imageSource.referrerPolicy = 'no-referrer'; card.append(imageSource);
      card.append(node('p','small','Bild: ' + work.imageCredit + ' · ' + work.imageLicense + '.'));
      const links = node('div','wiki-links'); links.append(node('p',null,'Weiterlesen in Wikipedia · Artikel im Fenster'));
      const artistArticle = wikiCatalogue.artists[work.artist];
      if (artistArticle) links.append(wikiButton('Künstler: ' + work.artist,artistArticle.title,artistArticle.language));
      links.append(wikiButton(work.style,styleArticle[work.style] || work.style),wikiButton(work.technique,techniqueArticle[work.technique] || work.technique));
      const workArticle = wikiCatalogue.works[work.id];
      if (workArticle) links.append(wikiButton('Über das Werk',workArticle.title,workArticle.language));
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
  async function fullscreen() {
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if ($('spiel').classList.contains('fullscreen-fallback')) { $('spiel').classList.remove('fullscreen-fallback'); document.body.classList.remove('has-fullscreen'); fullscreenLabel(); return; }
    try { if (!$('spiel').requestFullscreen) throw Error(); await $('spiel').requestFullscreen(); }
    catch { $('spiel').classList.add('fullscreen-fallback'); document.body.classList.add('has-fullscreen'); }
    fullscreenLabel();
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
  };
  $('consent-no').onclick = () => {
    imagesAllowed = false; store.remove(keys.images); pendingStart = false; close('consent-dialog');
    stopImages(); render();
  };
  $('image-settings').onclick = () => askForImages(false);
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
  Promise.all(['data/kunstarchiv.json','data/kunstbilder.json','data/kunst-wikipedia.json'].map(url => fetch(url,{credentials:'same-origin'}).then(response => { if (!response.ok) throw Error('Archiv'); return response.json(); })))
    .then(([data,media,wiki]) => {
      wikiCatalogue = wiki;
      const images = new Map(media.images.map(image => [image.id,image]));
      pool = data.works.filter(work => images.has(work.id) && wiki.artists[work.artist] && core.validWork(work)).map(work => ({...work,...images.get(work.id)}));
      core.room(pool); // Verify that a complete, unique room can actually be generated.
      try { state = core.restore(JSON.parse(store.get(keys.game)),pool); } catch { state = null; }
      if (!state) store.remove(keys.game);
      $('pool-count').textContent = pool.length;
      $('start-game').disabled = $('start-here').disabled = false;
      $('start-game').textContent = state ? 'Spiel fortsetzen →' : 'Galerie betreten →';
      $('start-here').textContent = state ? 'Spiel fortsetzen →' : 'Galerie betreten →';
      $('best').textContent = number(best); heroImages();
      if (state && imagesAllowed) render();
    }).catch(() => {
      $('start-game').textContent = $('start-here').textContent = 'Archiv nicht erreichbar';
      $('waiting').querySelector('p').textContent = 'Das lokale Werkarchiv konnte nicht geladen werden. Bitte lade die veröffentlichte Seite erneut. Eine direkt als Datei geöffnete Kopie benötigt einen Webserver.';
    });
})();
