(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const lab = $('labor');
  if (!lab || !window.UVVisLab) return;
  const fmt = n => Number.isFinite(n) ? n.toLocaleString('de-DE', {maximumFractionDigits: 3}) : '—';
  const launch = document.createElement('button');
  launch.id = 'measurement-assistant';
  launch.className = 'primary';
  launch.textContent = 'Messassistent · Schritt für Schritt';
  launch.setAttribute('aria-controls', 'measurement-coach');
  launch.setAttribute('aria-expanded', 'false');
  lab.querySelector('.modebar').prepend(launch);
  const note = document.createElement('p');
  note.className = 'small';
  note.textContent = 'Noch nie gemessen? Der Messassistent zeigt dir die Bedienelemente und begleitet deine eigene Messung – auch im Vollbild.';
  lab.querySelector('.modebar').after(note);
  const coach = document.createElement('aside');
  coach.id = 'measurement-coach';
  coach.hidden = true;
  coach.setAttribute('role', 'dialog');
  coach.setAttribute('aria-modal', 'false');
  coach.setAttribute('aria-labelledby', 'coach-heading');
  coach.innerHTML = '<header class="coach-header"><strong id="coach-heading">Dein Messassistent</strong><button id="coach-fold" aria-label="Messassistent einklappen" aria-expanded="true">−</button><button id="coach-close" aria-label="Messassistent schließen">×</button></header><div id="coach-body"><div id="coach-welcome"><p>Ich zeige dir zuerst, was du tun sollst. Du bedienst dann das echte Labor. Erst wenn der Schritt erledigt ist, wird „Weiter“ frei.</p><p>Was möchtest du lernen?</p><button id="coach-spectrum" class="primary">Meine erste Spektrenmessung</button><button id="coach-concentration">Eine unbekannte Konzentration bestimmen</button><p class="small">Beginne am besten mit Kristallviolett: Die Substanz ist beim ersten Öffnen bereits ausgewählt. Eine Konzentrationsbestimmung benötigt eine Substanz mit ε-Messkurve.</p><p class="small">Der Assistent löscht keine Messdaten, verändert keine Einstellungen und startet keine Messung automatisch. Du kannst ihn jederzeit schließen.</p></div><div id="coach-guide" hidden><p id="coach-counter" class="eyebrow"></p><progress id="coach-progress" max="1" value="0" aria-label="Fortschritt des Messassistenten"></progress><h3 id="coach-title"></h3><div id="coach-mini" aria-hidden="true"></div><p id="coach-instruction"></p><details id="coach-why"><summary>Warum dieser Schritt?</summary><p id="coach-reason"></p></details><p id="coach-notice" class="coach-notice" hidden></p><p id="coach-status" role="status" aria-live="polite"></p><button id="coach-show">Bedienelement zeigen</button><div class="coach-navigation"><button id="coach-back">Zurück</button><button id="coach-next" class="primary">Weiter</button></div><button id="coach-restart" class="coach-restart">Andere Anleitung wählen</button></div></div>';
  lab.append(coach);
  const setupTools = document.createElement('div');
  setupTools.className = 'coach-setup-tools'; setupTools.hidden = true;
  for (const [id, text, target] of [['coach-library', 'Substanzbibliothek zeigen', 'search'], ['coach-settings', 'Messbedingungen zeigen', 'path']]) {
    const button = document.createElement('button'); button.id = id; button.textContent = text;
    button.onclick = () => showTarget(target); setupTools.append(button);
  }
  $('coach-instruction').after(setupTools);
  let flow = null, steps = [], index = 0, recordId = null, configuration = null;
  let highlight = null, baselineCurve = null, lastRender = '', pending = false, showRequest = 0;
  const signature = s => JSON.stringify([s.settings, flow === 'concentration' ? s.wavelength : null, $('range-start').value, $('range-end').value]);
  const snapshot = () => window.UVVisLab.snapshot();
  const prepared = s => s.blankReady && s.inserted && !s.lidOpen;
  const step = (title, target, instruction, reason, done, icon = 'setup') => ({title, target, instruction, reason, done, icon});
  function createSteps(kind) {
    const sequence = [
      step('1 · Den Messmodus auswählen', kind === 'spectrum' ? 'explore-mode' : 'unknown-mode',
        kind === 'spectrum' ? 'Klicke auf „Spektren erforschen“. Wir nehmen eine Kurve auf: Absorbanz A über der Wellenlänge λ.' : 'Klicke auf „Unbekannte Konzentration“. Wir vergleichen die Probe mit Lösungen bekannter Konzentration (Standards).',
        'Ein Spektrum beantwortet: Bei welchen Wellenlängen absorbiert der Stoff? Die Kalibrierung beantwortet: Wie viel Stoff ist in der Probe?',
        s => !!s.record && s.mode === (kind === 'spectrum' ? 'explore' : 'unknown') && (kind === 'spectrum' || s.record.unit === 'epsilon')),
      step('2 · Substanz und Einstellungen prüfen', kind === 'spectrum' ? s => s.record?.unit === 'epsilon' ? 'concentration' : 'factor' : 'wavelength',
        s => 'Ausgewählt: ' + (s.record?.name || 'noch keine Substanz') + '. Wähle bei Bedarf eine andere Struktur in der Bibliothek. Für den ersten Versuch lassen wir die vorgeschlagenen Werte, die Quarzküvette und 1 cm Schichtdicke unverändert. ' + (kind === 'spectrum' ? 'Der vorgeschlagene Scanbereich passt zu den vorhandenen Messdaten. Lies Konzentration bzw. Probenfaktor und Bereich ab; bestätige dann mit „Weiter“.' : 'Stelle die Messwellenlänge beim Gerät auf ein Absorptionsmaximum, hier etwa ' + fmt(s.peak) + ' nm. Die Zahl steht im Eingabefeld „λ / nm“. Merke dir diesen Wert: Alle Standards und die unbekannte Probe werden bei derselben Wellenlänge gemessen. Bestätige mit „Weiter“.'),
        'Die Bibliothek legt auch das Lösungsmittel fest. Verwende für Blank und Probe dieselbe Matrix und Küvettenart. Die Angaben werden nicht automatisch vom Assistenten verändert.',
        s => !!s.record && s.settingsValid && s.rangeValid && (kind === 'spectrum' || s.standardSuggestion > 0 && s.standardSuggestion * 2 <= 10000)),
      step('3 · Den Probenraum öffnen', 'lid', 'Klicke auf „Probenraum öffnen“. Der Deckel hebt sich. Wenn bereits ein gültiger Blank vorliegt, kannst du diesen vorbereitenden Schritt überspringen.',
        'Die Küvette wird nur bei geöffnetem Probenraum eingesetzt. Während der Messung muss der Deckel geschlossen sein: Fremdlicht würde das Signal verfälschen.', s => s.lidOpen || s.blankReady, 'blank'),
      step('4 · Den Blank einsetzen', 'insert', s => 'Klicke auf „Blank einsetzen“. Der Blank enthält ' + (s.record?.solvent || 'das Lösungsmittel') + ' mit derselben Lösungsmittel-/Puffermatrix, aber ohne den untersuchten Stoff. Die Schaltfläche setzt in der Simulation diese Referenz ein.',
        'Auch Küvette und Lösungsmittel schwächen Licht. Wir wollen später nur den zusätzlichen Beitrag des gelösten Stoffes messen.', s => s.blankReady || s.inserted && s.lidOpen, 'blank'),
      step('5 · Für den Blindwert schließen', 'lid', 'Klicke auf „Probenraum schließen“. Lass die eingesetzte Blank-Küvette im Gerät.',
        'Einsetzen und Messen sind zwei verschiedene Handlungen. Erst mit geschlossenem Deckel ist die Messschaltfläche freigegeben.', s => s.blankReady || s.inserted && !s.lidOpen, 'blank'),
      step('6 · Den Blindwert messen', 'blank', 'Klicke auf „1 · Blank messen“. Das Gerät speichert die Referenz. Danach ist in dieser Simulation der Probenplatz wieder frei.',
        'Für diese Referenz gilt A = 0 bzw. T = 100 %. In einem realen Zweistrahlgerät bleibt zusätzlich die Referenzküvette im Referenzweg; das Modell vereinfacht den Küvettenwechsel.', s => s.blankReady, 'blank'),
      step('7 · Für die Probe wieder öffnen', 'lid', 'Öffne den Probenraum erneut. Jetzt kommt die Lösung mit dem untersuchten Stoff hinein, nicht noch einmal der Blank.',
        'Blank und Probe werden unter denselben optischen Bedingungen verglichen. Eine später geänderte Matrix oder Schichtdicke benötigt einen neuen Blank.', s => s.blankReady && (s.lidOpen || s.inserted), 'sample'),
      step('8 · Die Probe einsetzen', 'insert', 'Klicke auf „2 · Probe einsetzen“. Die Probe hat die zuvor ausgewählte Zusammensetzung. In einem echten Versuch: transparente Küvettenfenster im Strahlengang, keine Fingerabdrücke und keine Luftblasen.',
        'Der Stoff in der Probe absorbiert zusätzlich zum Lösungsmittel. In der Konzentrationsbestimmung repräsentiert dieser Platz anschließend die zu messende unbekannte Lösung.', s => s.blankReady && s.inserted, 'sample'),
      step('9 · Den Probenraum schließen', 'lid', 'Schließe den Probenraum. Nun ist die Probe messbereit. Öffne den Deckel während einer Messung nicht.',
        'Der Detektor erfasst I für die Probe. Aus I/I₀ berechnet das Gerät Transmission und Absorbanz.', prepared, 'sample')
    ];
    if (kind === 'spectrum') sequence.push(
      step('10 · Das Spektrum aufnehmen', 'scan', s => s.scanning ? 'Der Scan läuft. Die Wellenlänge wandert durch den eingestellten Bereich und die Kurve wächst. Warte auf das Ende; „Weiter“ wird dann freigegeben.' : 'Klicke auf „3 · Scan starten“. Beobachte, wie die Kurve Punkt für Punkt entsteht. „Scan stoppen“ bricht ab und speichert nur einen Teilscan; dieser zählt hier nicht als vollständige Messung.',
        'Bei jeder Wellenlänge werden Referenz- und Probenlicht verglichen. Viele solcher Einzelmessungen ergeben das Spektrum.', s => !s.scanning && s.lastCurve?.complete && s.lastCurve.id !== baselineCurve, 'scan'),
      step('11 · Die Kurve lesen', 'spectrum', 'Waagerecht: Wellenlänge in nm. Senkrecht: Absorbanz A. Wo die Kurve hoch ist, absorbiert die Probe stark. Die gestrichelte Linie zeigt nur die aktuell eingestellte Wellenlänge – sie ist keine zweite Messkurve. Klicke auf die Bande: Das Gerät zeigt A und T an dieser Stelle. Bestätige dann mit „Weiter“.',
        'Ein Maximum ist nicht die Farbe, die die Lösung durchlässt, sondern der Bereich besonders starker Absorption. A = 1 bedeutet zum Beispiel T = 10 %. Die Diagrammauswahl kann auch auf Transmission umgeschaltet werden.', s => !!s.lastCurve?.complete, 'plot'),
      step('12 · Messung geschafft', 'export', 'Deine Messkurve ist gespeichert. Du kannst sie als CSV exportieren. Für einen Vergleich ändere zum Beispiel die Konzentration und starte einen weiteren Scan; die bisherige Kurve bleibt stehen. Beim Wechsel der Substanz brauchst du einen neuen Blank. Der Assistent ist beendet, wenn du „Fertig“ klickst.',
        'Vergleiche die Intensität nur bei bekannten Konzentrationen und Schichtdicken. Eine kleinere Absorbanz kann allein durch Verdünnen entstehen.', () => true, 'plot')
    );
    else sequence.push(
      step('10 · Den Nullstandard messen', 'standard-blank', 'Klicke unten im Konzentrationsmodul auf „Blank als Standard“. In der Tabelle entsteht der Messpunkt c = 0 µmol/L. Die Schaltflächen für Standards fassen in diesem Modell den Küvettenwechsel und die Einzelmessung zusammen.',
        'Der Nullstandard prüft die Basislinie der Kalibrierung. Die erste Blank-Messung oben war dagegen nötig, um das Gerät überhaupt abzugleichen.', s => s.standards.some(r => r.c === 0), 'calibration'),
      step('11 · Den ersten Standard messen', 'standard-c', s => 'Trage im Feld „Standard / µmol L⁻¹“ beispielsweise ' + fmt(s.standardSuggestion) + ' ein. Klicke danach auf „Standard messen“. Das ist eine bekannte Konzentration, noch nicht deine gesuchte Probe. Prüfe den neuen Tabellenpunkt.',
        'Wir wählen eine gut messbare Absorbanz von ungefähr 0,3. Die vorgeschlagene Konzentration wird aus den aktuellen Stoffdaten und Messbedingungen bestimmt; andere geeignete Werte sind möglich.', s => s.standards.filter(r => r.c > 0).length >= 1, 'calibration'),
      step('12 · Einen zweiten Standard messen', 'standard-c', s => 'Trage eine andere Konzentration ein, zum Beispiel ' + fmt(s.standardSuggestion * 2) + ' µmol/L, und klicke wieder auf „Standard messen“. Zusammen mit c = 0 brauchen wir mindestens drei verschiedene Konzentrationsstufen. Derselbe Wert ersetzt nur seinen alten Messpunkt.',
        'Nun kann das Gerät eine Gerade A = m · c + b anpassen. Bei A > 2 solltest du niedrigere Konzentrationen einsetzen, weil dann zu wenig Licht ankommt.', s => s.standards.length >= 3 && !!s.fit && s.fit.slope > 0 && s.fit.r2 >= .99, 'calibration'),
      step('13 · Die Kalibrierung kontrollieren', 'calibration-result', s => 'Lies die Gleichung A = m · c + b unter dem Diagramm ab. Hier steht die Konzentration auf der waagerechten Achse. Die Steigung m und der Achsenabschnitt b werden später zum Rechnen gebraucht. R² sollte nahe 1 liegen; aktuell: ' + fmt(s.fit?.r2) + '. Bestätige mit „Weiter“.',
        'Das ist ein anderes Diagramm als das Spektrum: Die Wellenlänge bleibt fest, die Konzentration wird variiert. Für die unbekannte Probe nicht außerhalb des Kalibrierbereichs extrapolieren.', s => !!s.fit && s.fit.slope > 0 && s.fit.r2 >= .99, 'calibration'),
      step('14 · Die unbekannte Probe messen', 'unknown-measure', 'Lass zunächst „Vorverdünnung der unbekannten Probe“ auf „Keine · Faktor 1“. Klicke auf „Unbekannte Probe messen“. Unter der Schaltfläche erscheint ihre Absorbanz A. Der Assistent kennt die versteckte Konzentration nicht.',
        'Jetzt bestimmen wir die Konzentration aus der gemessenen Absorbanz und deiner Kalibriergeraden. Für diese Einzelmessung ist kein Spektrenscan erforderlich.', s => s.unknownMeasured, 'sample'),
      step('15 · Berechnen und prüfen', 'answer-c', 'Rechne zunächst cMesslösung = (A − b) / m. Multipliziere anschließend mit dem Verdünnungsfaktor F: cOriginal = F · cMesslösung. Trage das Ergebnis in µmol/L ins Antwortfeld ein und klicke auf „Ergebnis prüfen“. Bei F = 1 sind beide Konzentrationen gleich.',
        'Verwende die ausgegebene Steigung mit c in µmol/L, nicht mol/L. Das Programm akzeptiert eine kleine Rundungsabweichung und gibt bei einem Fehler Hinweise.', s => s.unknownMeasured && s.feedback.startsWith('Richtig:'), 'calibration'),
      step('16 · Bestimmung geschafft', 'unknown-feedback', 'Du hast eine unbekannte Konzentration mit deiner eigenen Kalibrierung bestimmt. „Neue unbekannte Probe“ behält die Kalibrierung. Änderungen an Wellenlänge oder Messbedingungen löschen sie dagegen: Die Standards müssen dann neu gemessen werden.',
        'Eine Kalibrierung gilt nur für ihre festgelegten Bedingungen. In einem echten Labor gehören auch Wiederholungsmessungen, Unsicherheiten und die Kontrolle möglicher Störstoffe dazu.', () => true, 'calibration')
    );
    return sequence;
  }
  function clearHighlight() { highlight?.classList.remove('coach-target'); highlight = null; }
  function welcome() {
    flow = null; lastRender = ''; clearHighlight();
    $('coach-welcome').hidden = false; $('coach-guide').hidden = true;
    $('coach-body').hidden = false; syncFold();
  }
  function syncFold() {
    const folded = $('coach-body').hidden;
    $('coach-fold').textContent = folded ? '+' : '−';
    $('coach-fold').setAttribute('aria-expanded', String(!folded));
    $('coach-fold').setAttribute('aria-label', 'Messassistent ' + (folded ? 'ausklappen' : 'einklappen'));
  }
  function open() {
    coach.hidden = false; launch.setAttribute('aria-expanded', 'true');
    coach.style.left = ''; coach.style.right = '16px';
    refresh(); $('coach-heading').tabIndex = -1; $('coach-heading').focus({preventScroll: true});
  }
  function close() { coach.hidden = true; clearHighlight(); launch.setAttribute('aria-expanded', 'false'); launch.focus({preventScroll: true}); }
  function start(kind) {
    flow = kind; steps = createSteps(kind); index = 0; recordId = snapshot().record?.id;
    configuration = null; baselineCurve = snapshot().lastCurve?.id ?? null; lastRender = '';
    $('coach-welcome').hidden = true; $('coach-guide').hidden = false;
    $('coach-notice').hidden = true; refresh(); showTarget();
  }
  function notice(text) { $('coach-notice').textContent = text; $('coach-notice').hidden = false; }
  function refresh() {
    if (coach.hidden) return;
    const s = snapshot();
    $('coach-spectrum').disabled = !s.record || s.scanning;
    $('coach-concentration').disabled = !s.record || s.scanning;
    if (!flow) return;
    if (index > 1 && recordId !== s.record?.id) {
      index = 1; configuration = null; notice('Substanz gewechselt: Prüfe die neuen Einstellungen. Anschließend beginnen wir mit einem passenden Blank.');
    }
    if (index > 1 && s.mode !== (flow === 'spectrum' ? 'explore' : 'unknown')) {
      index = 0; configuration = null; notice('Messmodus geändert: Wähle zuerst wieder den Modus dieser Anleitung.');
    }
    if (index > 1 && configuration && signature(s) !== configuration && !s.scanning && !(flow === 'spectrum' && index >= 9)) {
      index = 1; configuration = null; notice('Messbedingungen geändert: Prüfe die Einstellungen. Für die Konzentrationsbestimmung müssen alle Standards bei denselben Bedingungen gemessen werden.');
    }
    if (index > 5 && !s.blankReady) {
      index = 2; notice('Der Blindwert ist nicht mehr gültig. Wir setzen zuerst wieder einen passenden Blank ein.');
    }
    const current = steps[index], done = !!current.done(s);
    const instruction = typeof current.instruction === 'function' ? current.instruction(s) : current.instruction;
    const key = JSON.stringify([index, done, instruction, s.scanning, s.lidOpen, s.inserted, s.blankReady, s.standards.length, s.feedback]);
    if (key === lastRender) return;
    lastRender = key;
    clearHighlight();
    $('coach-counter').textContent = (flow === 'spectrum' ? 'Spektrenmessung' : 'Konzentrationsbestimmung') + ' · Schritt ' + (index + 1) + ' / ' + steps.length;
    $('coach-progress').max = steps.length; $('coach-progress').value = index + (done ? 1 : 0);
    $('coach-title').textContent = current.title;
    $('coach-instruction').textContent = instruction;
    setupTools.hidden = index !== 1 && !(index === 0 && flow === 'concentration' && s.record?.unit !== 'epsilon');
    $('coach-settings').hidden = index !== 1;
    $('coach-reason').textContent = current.reason;
    const labels = {setup: ['Stoff', 'Einstellungen', 'Gerät'], blank: ['Lösungsmittel', 'Blank', 'A = 0'], sample: ['Probe', 'Küvette', 'Detektor'], scan: ['λ ₁', 'λ ₂', 'λ ₃ …'], plot: ['Wellenlänge λ', 'Absorbanz A', 'Bande'], calibration: ['bekanntes c', 'gemessenes A', 'Kalibrierung']};
    $('coach-mini').replaceChildren(...labels[current.icon].map(text => {const span = document.createElement('span'); span.textContent = text; return span;}));
    $('coach-back').disabled = index === 0 || s.scanning;
    $('coach-next').disabled = !done;
    $('coach-next').textContent = index === steps.length - 1 ? 'Fertig' : 'Weiter';
    $('coach-status').textContent = done ? (index === steps.length - 1 ? 'Geschafft. Du kannst jetzt selbstständig weiterarbeiten.' : '✓ Bereit für den nächsten Schritt. Klicke auf „Weiter“.') : s.scanning ? 'Die Messung läuft. Ich warte auf den vollständigen Scan.' : (flow === 'concentration' && index === 0 && s.record?.unit !== 'epsilon' ? 'Wähle zunächst eine ε-Substanz, z. B. Kristallviolett, in der Bibliothek.' : 'Ich warte, bis du diesen Schritt am Gerät ausgeführt hast.');
    $('coach-status').classList.toggle('coach-done', done);
    const target = $(typeof current.target === 'function' ? current.target(s) : current.target);
    if (target && !target.closest('[hidden]')) { highlight = target; target.classList.add('coach-target'); }
  }
  function showTarget(override) {
    if (!flow || coach.hidden) return;
    const current = steps[index];
    const targetId = typeof override === 'string' ? override : (typeof current.target === 'function' ? current.target(snapshot()) : current.target);
    const target = $(targetId); if (!target) return;
    for (let p = target.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    if (target.closest('[hidden]')) return;
    $('coach-body').hidden = false; syncFold();
    // Leave the actual control clickable. There is deliberately no modal backdrop.
    target.scrollIntoView({block: 'center', behavior: 'instant'});
    const request = ++showRequest;
    requestAnimationFrame(() => {
      if (request !== showRequest || coach.hidden) return;
      const rect = target.getBoundingClientRect(), narrow = innerWidth < 850;
      coach.style.left = !narrow && rect.left + rect.width / 2 > innerWidth / 2 ? '16px' : '';
      coach.style.right = coach.style.left ? '' : '16px';
      if (narrow) {
        const desired = Math.max(50, (coach.getBoundingClientRect().top - 20) / 2);
        const delta = rect.top + Math.min(rect.height / 2, 70) - desired;
        if (document.fullscreenElement === lab || lab.classList.contains('pseudo-fullscreen')) lab.scrollTop += delta;
        else window.scrollBy(0, delta);
      }
      clearHighlight(); highlight = target; target.classList.add('coach-target');
      if (['BUTTON', 'INPUT', 'SELECT'].includes(target.tagName)) target.focus({preventScroll: true});
    });
  }
  function scheduleRefresh() {
    if (pending || coach.hidden) return;
    pending = true; queueMicrotask(() => { pending = false; refresh(); });
  }
  launch.onclick = open;
  $('coach-close').onclick = close;
  $('coach-fold').onclick = () => { $('coach-body').hidden = !$('coach-body').hidden; syncFold(); };
  $('coach-spectrum').onclick = () => start('spectrum');
  $('coach-concentration').onclick = () => start('concentration');
  $('coach-restart').onclick = welcome;
  $('coach-show').onclick = showTarget;
  $('coach-back').onclick = () => { if (index && !snapshot().scanning) { index--; lastRender = ''; refresh(); showTarget(); } };
  $('coach-next').onclick = () => {
    const s = snapshot(); if (!flow || !steps[index].done(s)) return;
    if (index === steps.length - 1) { welcome(); close(); return; }
    if (index === 1) { recordId = s.record.id; configuration = signature(s); }
    if (flow === 'spectrum' && index === 8) baselineCurve = s.lastCurve?.id ?? null;
    index++; lastRender = ''; $('coach-notice').hidden = true; $('coach-why').open = false;
    refresh(); showTarget();
  };
  document.addEventListener('uvvis:state', scheduleRefresh);
  document.addEventListener('uvvis:reset', () => { if (!coach.hidden) { welcome(); open(); } });
  for (const event of ['click', 'change', 'input']) lab.addEventListener(event, scheduleRefresh);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !coach.hidden && !document.querySelector('dialog[open]')) close();
  });
  document.addEventListener('fullscreenchange', () => { if (!coach.hidden) { coach.style.left = ''; coach.style.right = '16px'; } });
  welcome();
})();
