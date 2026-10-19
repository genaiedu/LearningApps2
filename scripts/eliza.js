(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const terminal = $('terminal'), screen = $('screen'), transcript = $('transcript');
  const form = $('terminal-form'), input = $('message'), introduction = $('introduction');
  const engine = new ElizaCore.Eliza();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, opening = false, printing = null, timer = null, follow = true;
  let instant = reduced.matches, sound = true, audio = null, noise = null;
  const status = message => { $('launch-status').textContent = message; };

  function updateSound() {
    $('sound-toggle').textContent = 'Tastaturton: ' + (sound ? 'an' : 'aus');
    $('sound-toggle').setAttribute('aria-pressed', String(sound));
  }
  function updateInstant() {
    $('instant-toggle').textContent = 'Sofortausgabe: ' + (instant ? 'an' : 'aus');
    $('instant-toggle').setAttribute('aria-pressed', String(instant));
  }
  function prepareAudio() {
    if (!sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      if (!audio || audio.state === 'closed') {
        audio = new Audio();
        noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * .04), audio.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      audio.resume().catch(() => { sound = false; updateSound(); });
    } catch { sound = false; updateSound(); }
  }
  function clickKey() {
    if (!sound || !audio || audio.state !== 'running') return;
    try {
      const t = audio.currentTime, source = audio.createBufferSource();
      source.buffer = noise;
      const filter = audio.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 1700 + Math.random() * 600; filter.Q.value = .8;
      const gain = audio.createGain();
      gain.gain.setValueAtTime(.038, t); gain.gain.exponentialRampToValueAtTime(.0001, t + .035);
      source.connect(filter).connect(gain).connect(audio.destination);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(t); source.stop(t + .04);
      const body = audio.createOscillator(), envelope = audio.createGain();
      body.type = 'triangle'; body.frequency.setValueAtTime(170 + Math.random() * 35, t);
      body.frequency.exponentialRampToValueAtTime(75, t + .025);
      envelope.gain.setValueAtTime(.018, t); envelope.gain.exponentialRampToValueAtTime(.0001, t + .028);
      body.connect(envelope).connect(audio.destination);
      body.onended = () => { body.disconnect(); envelope.disconnect(); };
      body.start(t); body.stop(t + .03);
    } catch { /* Sound is optional; a failed audio device must not stop typing. */ }
  }
  function scrollToEnd(force = false) {
    if (force || follow) screen.scrollTop = screen.scrollHeight;
    $('latest').hidden = screen.scrollHeight - screen.clientHeight - screen.scrollTop < 60;
  }
  screen.addEventListener('scroll', () => {
    follow = screen.scrollHeight - screen.clientHeight - screen.scrollTop < 60;
    $('latest').hidden = follow;
  }, { passive: true });
  $('latest').addEventListener('click', () => { follow = true; scrollToEnd(true); input.focus({ preventScroll: true }); });
  function row(kind, text) {
    const p = document.createElement('p');
    p.className = 'terminal-entry ' + kind;
    p.textContent = text;
    transcript.append(p);
    return p;
  }
  function ready() {
    if (!active) return;
    form.hidden = false; input.disabled = false;
    resizeInput(); scrollToEnd();
    input.focus({ preventScroll: true });
  }
  function finishPrinting() {
    if (!printing) return;
    clearInterval(timer); timer = null;
    const done = printing;
    printing = null;
    done.element.textContent = done.text;
    done.element.classList.remove('typing');
    $('spoken-response').textContent = done.text;
    scrollToEnd();
    ready();
  }
  function write(text) {
    if (!active) return;
    form.hidden = true; input.disabled = true;
    const element = row('eliza', '');
    printing = { element, text, position: 0 };
    element.classList.add('typing');
    if (instant || reduced.matches) { finishPrinting(); return; }
    const letters = Array.from(text);
    timer = setInterval(() => {
      if (!active || !printing) { clearInterval(timer); return; }
      printing.position = Math.min(letters.length, printing.position + 3);
      element.textContent = letters.slice(0, printing.position).join('');
      scrollToEnd();
      if (printing.position >= letters.length) finishPrinting();
    }, 22);
  }
  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    $('input-wrap').classList.toggle('has-text', !!input.value);
  }
  function discard() {
    active = false; opening = false;
    clearInterval(timer); timer = null; printing = null;
    engine.reset(); transcript.replaceChildren(); input.value = '';
    $('spoken-response').textContent = ''; form.hidden = true;
    terminal.hidden = true; introduction.inert = false;
    document.body.classList.remove('eliza-running');
    if (audio) { audio.close().catch(() => {}); audio = null; noise = null; }
    $('start-eliza').focus({ preventScroll: true });
  }
  async function end() {
    if (!active && !opening) return;
    discard();
    if (document.fullscreenElement === terminal) {
      try { await document.exitFullscreen(); } catch { /* fullscreenchange also handles browser exit. */ }
    }
    status('Gespräch beendet. Der Verlauf wurde verworfen.');
  }
  $('start-eliza').addEventListener('click', async () => {
    if (active || opening) return;
    status('');
    if (!terminal.requestFullscreen || !document.fullscreenEnabled) {
      status('Dieser Browser unterstützt hier keinen echten Vollbildmodus. Öffne die App bitte direkt in einem aktuellen Browser mit Vollbildunterstützung. ELIZA startet bewusst nicht im Fenster.');
      return;
    }
    opening = true; terminal.hidden = false;
    // Both audio and fullscreen are requested directly from this click.
    prepareAudio();
    try {
      await terminal.requestFullscreen();
      if (document.fullscreenElement !== terminal) throw new Error('No fullscreen');
      opening = false; active = true; follow = true;
      introduction.inert = true; document.body.classList.add('eliza-running');
      engine.reset(); transcript.replaceChildren(); input.value = ''; screen.scrollTop = 0;
      row('system', 'ELIZA / DEUTSCHES REGELWERK\nEine neue Interpretation des historischen Prinzips.\nLokal · keine Speicherung · keine Therapie\n\nEnter sendet. /hilfe zeigt die Befehle.');
      write('ELIZA > Guten Tag. Ich bin ELIZA, eine Gesprächssimulation ohne Verständnis. Worüber möchten Sie sprechen?');
    } catch {
      discard();
      status('Der Vollbildstart wurde nicht erlaubt. Bitte klicke erneut auf „ELIZA im Vollbild starten“ und erlaube den Vollbildmodus.');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (active && document.fullscreenElement !== terminal) {
      discard(); status('Vollbild beendet. Der Gesprächsverlauf wurde verworfen.');
    }
  });
  $('end-eliza').addEventListener('click', end);
  document.addEventListener('keydown', event => {
    if (active && event.key === 'Escape' && !event.isComposing) {
      event.preventDefault(); end();
    }
  });
  $('sound-toggle').addEventListener('click', () => {
    sound = !sound;
    if (sound) prepareAudio();
    else audio?.suspend().catch(() => {});
    updateSound();
  });
  $('instant-toggle').addEventListener('click', () => {
    instant = !instant; updateInstant();
    if (instant) finishPrinting();
  });
  reduced.addEventListener('change', () => { if (reduced.matches) finishPrinting(); });
  input.addEventListener('input', () => { resizeInput(); follow = true; scrollToEnd(true); });
  input.addEventListener('keydown', event => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!event.repeat && (event.key.length === 1 || ['Enter', 'Backspace', 'Delete', 'Tab'].includes(event.key))) clickKey();
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!active || printing || document.fullscreenElement !== terminal) return;
    const text = ElizaCore.clean(input.value);
    if (!text) return;
    const command = text.toLocaleLowerCase('de');
    if (command === '/ende') { end(); return; }
    follow = true; row('user', 'SIE > ' + text); input.value = ''; resizeInput();
    if (command === '/hilfe') {
      write('ELIZA > Schreiben Sie einen Satz und drücken Sie Enter.\n/neu verwirft den bisherigen Dialog.\n/ende beendet das Vollbild und verwirft das Gespräch.\n/hilfe zeigt diese Hilfe.\n\nIch antworte nach festen Regeln – nicht mit psychologischem Verständnis.');
    } else if (command === '/neu') {
      engine.reset(); transcript.replaceChildren();
      row('system', 'NEUES GESPRÄCH / Vorheriger Verlauf verworfen.');
      write('ELIZA > Worüber möchten Sie sprechen?');
    } else if (/^\//.test(command)) {
      write('ELIZA > Diesen Befehl kenne ich nicht. Mit /hilfe sehen Sie die verfügbaren Befehle.');
    } else {
      write('ELIZA > ' + engine.respond(text).text);
    }
  });
  // Do not leave private conversation text in a back/forward-cache snapshot.
  addEventListener('pagehide', () => { if (active || opening) discard(); });
  window.visualViewport?.addEventListener('resize', () => { if (active) scrollToEnd(); });
  addEventListener('resize', () => { if (active) { resizeInput(); scrollToEnd(); } });
  updateSound(); updateInstant();
})();
