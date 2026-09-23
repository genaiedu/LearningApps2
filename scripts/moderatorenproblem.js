(function () {
  'use strict';
  const E = window.MontyEngine, S = window.MontyScenes;
  const $ = id => document.getElementById(id);
  const storageKey = 'learningapps2.monty.lab.v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let movement = !reducedMotion.matches;
  let lab = { switch: [], stay: [] }, demoRound = 0, labGame;
  let storageAvailable = true;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved && ['switch', 'stay'].every(key => Array.isArray(saved[key]) && saved[key].length <= 10 && saved[key].every(r => {
      try { const checked = E.decide(r.prize, r.first, r.opened, key === 'switch'); return checked.won === r.won && checked.final === r.final; }
      catch { return false; }
    })) && (saved.stay.length === 0 || saved.switch.length === 10)) lab = saved;
  } catch { storageAvailable = false; }
  function saveLab() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(lab)); }
    catch { storageAvailable = false; }
    if (!storageAvailable) document.querySelector('.data-note').textContent = 'Speicherung ist in diesem Browser nicht verfügbar. Die Ergebnisse bleiben bis zum Neuladen der Seite sichtbar.';
  }
  function shuffledBag(length) {
    let bag = [];
    return () => {
      if (!bag.length) {
        bag = Array.from({ length }, (_, i) => i);
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
      }
      return bag.pop();
    };
  }
  const nextPrize = shuffledBag(S.prizes.length), nextZonk = shuffledBag(S.zonks.length);
  const pauseObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('scene-paused', !entry.isIntersecting);
  }, { rootMargin: '50px' }) : null;

  function makeButton(text, action, secondary = false) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    if (secondary) b.className = 'secondary';
    b.addEventListener('click', action);
    return b;
  }
  class Game {
    constructor(prefix, strategy, finish, next) {
      this.prefix = prefix; this.strategy = strategy; this.finish = finish; this.next = next;
      this.board = $(prefix + '-doors'); this.message = $(prefix + '-message'); this.actions = $(prefix + '-actions');
      this.prize = E.pick([0, 1, 2]); this.prizeArt = nextPrize();
      this.zonkArt = [nextZonk(), nextZonk(), nextZonk()];
      this.first = null; this.opened = null; this.final = null; this.phase = 'choose'; this.timers = [];
      this.board.querySelectorAll('.door-inner').forEach(el => pauseObserver?.unobserve(el));
      this.board.innerHTML = [0, 1, 2].map(i => `<div class="door" data-door="${i}"><button type="button" class="door-button" aria-label="Tor ${i+1} wählen"><span class="door-inner" aria-hidden="true"></span><span class="shutter" aria-hidden="true"><span class="door-number">0${i+1}</span></span></button><div class="door-foot" aria-hidden="true">TOR ${i+1}</div></div>`).join('');
      this.doors = [...this.board.children];
      this.doors.forEach((door, i) => door.querySelector('button').addEventListener('click', () => this.choose(i)));
      this.say(strategy ? 'Wähle dein erstes Tor. Der Moderator öffnet danach ein anderes.' : 'Hinter einem Tor wartet ein Gewinn. Wähle dein Tor.');
      this.actions.replaceChildren(); this.update();
    }
    destroy() { this.timers.forEach(clearTimeout); this.timers = []; }
    later(action, delay) { this.timers.push(setTimeout(action, movement && !reducedMotion.matches ? delay : 30)); }
    say(text) { this.message.textContent = text; }
    setActions(buttons, focus = true) {
      this.actions.replaceChildren(...buttons);
      if (focus && buttons[0]) buttons[0].focus({ preventScroll: true });
    }
    update() {
      this.doors.forEach((door, i) => {
        door.classList.toggle('chosen', i === this.first && this.final === null);
        door.classList.toggle('final', i === this.final);
        door.classList.toggle('lost', i === this.final && this.final !== this.prize);
        const button = door.querySelector('button');
        button.disabled = this.phase !== 'choose';
        button.setAttribute('aria-label', this.phase === 'choose' ? `Tor ${i+1} wählen` : `Tor ${i+1}${door.classList.contains('open') ? ': '+(i===this.prize ? S.prizes[this.prizeArt].name : 'Zonk') : ', geschlossen'}${i===this.first?', deine erste Wahl':''}${i===this.final?', deine endgültige Wahl':''}`);
        door.querySelector('.door-foot').textContent = i === this.final ? (this.final === this.prize ? 'DEIN GEWINN' : 'DEIN ERGEBNIS') : i === this.first ? 'DEINE ERSTE WAHL' : i === this.opened ? 'VOM MODERATOR GEÖFFNET' : `TOR ${i+1}`;
      });
      if (this.prefix === 'demo') {
        const step = this.phase === 'opening' ? 'reveal' : ['decide','revealing','done'].includes(this.phase) ? 'decide' : this.phase;
        document.querySelectorAll('.steps li').forEach(li => {
          li.classList.toggle('current', li.dataset.phase === step);
          if (li.dataset.phase === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        });
      }
    }
    open(i) {
      const door = this.doors[i]; if (door.classList.contains('open')) return;
      const inner = door.querySelector('.door-inner');
      inner.classList.toggle('is-zonk',i !== this.prize);
      inner.innerHTML = S.scene(i === this.prize ? 'prize' : 'zonk', i === this.prize ? this.prizeArt : this.zonkArt[i]).html;
      door.classList.add('open'); pauseObserver?.observe(inner);
    }
    choose(i) {
      if (this.phase !== 'choose') return;
      this.first = i; this.phase = 'reveal';
      this.say(`Du hast Tor ${i+1} gewählt. Ich zeige dir jetzt hinter einem anderen Tor einen Zonk.`);
      this.setActions([makeButton('Moderator öffnet ein Tor', () => this.reveal())]); this.update();
    }
    reveal() {
      if (this.phase !== 'reveal') return;
      this.phase = 'opening'; this.opened = E.reveal(this.prize, this.first);
      this.open(this.opened); this.actions.replaceChildren(); this.say(`Tor ${this.opened+1} öffnet sich …`); this.update();
      this.later(() => {
        this.phase = 'decide';
        const other = [0,1,2].find(i => i !== this.first && i !== this.opened);
        if (this.strategy) {
          const switching = this.strategy === 'switch';
          this.say(`Ein Zonk! In dieser Reihe ${switching ? 'wechselst du jedes Mal zum anderen geschlossenen Tor' : 'bleibst du jedes Mal bei deiner ersten Wahl'}.`);
          this.setActions([makeButton(switching ? `Zu Tor ${other+1} wechseln` : `Bei Tor ${this.first+1} bleiben`, () => this.decide(switching))]);
        } else {
          this.say(`Tor ${this.opened+1} ist ein Zonk. Bleibst du bei Tor ${this.first+1} oder wechselst du zu Tor ${other+1}?`);
          this.setActions([makeButton(`Bei Tor ${this.first+1} bleiben`, () => this.decide(false), true), makeButton(`Zu Tor ${other+1} wechseln`, () => this.decide(true))]);
        }
        this.update();
      }, 1050);
    }
    decide(switching) {
      if (this.phase !== 'decide') return;
      this.phase = 'revealing';
      const result = E.decide(this.prize, this.first, this.opened, switching); this.final = result.final;
      this.say(`Deine Entscheidung steht: Tor ${this.final+1}. Wir öffnen die Tore …`);
      this.actions.replaceChildren(); this.open(this.final); this.update();
      this.later(() => { [0,1,2].forEach(i => this.open(i)); this.update(); }, 250);
      this.later(() => {
        this.phase = 'done';
        this.say(result.won ? `Gewonnen! ${S.prizes[this.prizeArt].name} wartet hinter Tor ${this.prize+1}.` : `Zonk! Der Gewinn war hinter Tor ${this.prize+1}. In der nächsten Runde wird neu ausgelost.`);
        const record = { prize:this.prize, first:this.first, opened:this.opened, final:this.final, won:result.won };
        if (this.finish) this.finish(record);
        const label = this.prefix === 'demo' ? 'Noch eine Runde' : lab.switch.length + lab.stay.length === 20 ? 'Zur Auswertung' : this.strategy === 'switch' && lab.switch.length === 10 ? 'Weiter: zehnmal bleiben' : 'Nächster Versuch';
        this.setActions([makeButton(label, this.next)]); this.update();
      }, 1350);
    }
  }
  let demoGame;
  function startDemo() {
    demoGame?.destroy(); demoRound++;
    $('demo-round').textContent = 'Runde ' + String(demoRound).padStart(2, '0');
    demoGame = new Game('demo', null, null, startDemo);
  }
  function countWins(records) { return records.filter(r => r.won).length; }
  function updateResults() {
    for (const key of ['switch', 'stay']) {
      const records = lab[key], wins = countWins(records), root = $('result-'+key);
      root.querySelector('.result-ratio').textContent = `${wins} / ${records.length}`;
      root.querySelector('.result-bar').style.width = (records.length ? wins/records.length*100 : 0) + '%';
      root.querySelector('.result-caption').textContent = records.length ? `${wins} ${wins===1?'Gewinn':'Gewinne'} bei ${records.length} ${records.length===1?'Versuch':'Versuchen'} · ${Math.round(wins/records.length*100)} %` : 'Noch kein Ergebnis';
      root.querySelector('.result-dots').innerHTML = Array.from({length:10}, (_,i) => {
        const r = records[i], name = `Versuch ${i+1}: ${r ? r.won ? 'Gewinn' : 'Zonk' : 'offen'}`;
        return `<span class="trial-dot ${r ? r.won?'win':'loss' : ''}" title="${name}" aria-label="${name}">${r ? r.won?'●':'×' : '○'}</span>`;
      }).join('');
      root.querySelector('.result-dots').setAttribute('aria-label', `${key==='switch'?'Wechseln':'Bleiben'}: ${records.length} von 10 Versuchen`);
      $(key+'-progress').textContent = records.length + ' von 10 Versuchen';
      $(key+'-step').classList.toggle('done', records.length===10);
      $(key+'-step').classList.toggle('active', key==='switch' ? records.length<10 : lab.switch.length===10 && records.length<10);
    }
    const complete = lab.switch.length===10 && lab.stay.length===10;
    $('lab-summary').hidden = !complete;
    if (complete) {
      const sw = countWins(lab.switch), st = countWins(lab.stay);
      $('summary-title').textContent = sw===st ? 'In deiner Reihe: Gleichstand.' : `${sw>st?'Wechseln':'Bleiben'} liegt in deiner Reihe vorn.`;
      $('summary-copy').textContent = `Mit Wechsel hast du ${sw} von 10 Mal gewonnen (${sw*10} %), ohne Wechsel ${st} von 10 Mal (${st*10} %). Welche Vermutung passt zu deinen Daten? Vergleiche deine Ergebnisse auch mit anderen aus der Klasse.`;
    }
  }
  function startLab() {
    labGame?.destroy();
    if (lab.switch.length===10 && lab.stay.length===10) {
      $('lab-game').hidden = true;
      document.querySelector('.lab-layout').classList.add('completed');
      updateResults(); return;
    }
    $('lab-game').hidden = false; document.querySelector('.lab-layout').classList.remove('completed');
    const strategy = lab.switch.length<10 ? 'switch':'stay';
    $('lab-strategy').textContent = strategy==='switch'?'IMMER WECHSELN':'IMMER BLEIBEN';
    $('lab-round').textContent = `Versuch ${lab[strategy].length+1} / 10`;
    labGame = new Game('lab', strategy, record => {
      if (lab[strategy].length >= 10) return;
      lab[strategy].push(record); saveLab(); updateResults();
    }, () => {
      startLab();
      if (lab.switch.length+lab.stay.length===20) $('lab-summary').scrollIntoView({behavior:movement?'smooth':'instant',block:'center'});
    });
    updateResults();
  }
  $('reset-lab').addEventListener('click', () => {
    if ((lab.switch.length || lab.stay.length) && !window.confirm('Diese Versuchsreihe mit ihren Ergebnissen zurücksetzen?')) return;
    labGame?.destroy(); lab={switch:[],stay:[]}; saveLab();
    $('erklaerung').hidden=true; $('simulation-result').textContent='Noch keine Simulation gestartet.'; startLab();
  });
  $('show-explanation').addEventListener('click', () => {
    $('erklaerung').hidden=false; $('erklaerung').scrollIntoView({behavior:movement?'smooth':'instant',block:'start'});
  });
  $('simulate').addEventListener('click', () => {
    const r=E.simulate(1000);
    $('simulation-result').innerHTML=`<strong>1.000 gemeinsame Auslosungen</strong><p>Wechseln: ${r.switchWins} Gewinne · ${(r.switchWins/10).toLocaleString('de-DE')} %</p><div class="sim-bar" style="width:${r.switchWins/10}%"></div><p>Bleiben: ${r.stayWins} Gewinne · ${(r.stayWins/10).toLocaleString('de-DE')} %</p><div class="sim-bar stay" style="width:${r.stayWins/10}%"></div><small>Neue Zufallsdaten – keine garantierten Quoten.</small>`;
    $('simulate').textContent='Noch einmal 1.000 simulieren';
  });
  $('export-results').addEventListener('click', () => {
    const lines=['DREI TORE – Mein Versuchsprotokoll', 'Regel: Der Moderator kennt den Gewinn, öffnet immer ein anderes Nietentor und bietet immer einen Wechsel an.', ''];
    for (const key of ['switch','stay']) {
      const records=lab[key], wins=countWins(records);
      lines.push(key==='switch'?'IMMER WECHSELN':'IMMER BLEIBEN', `${wins} Gewinne bei ${records.length} Versuchen (${Math.round(wins/records.length*100)} %)`, 'Versuch | Erstes Tor | Moderator öffnet | Letztes Tor | Gewinntor | Ergebnis');
      records.forEach((r,i)=>lines.push(`${i+1} | ${r.first+1} | ${r.opened+1} | ${r.final+1} | ${r.prize+1} | ${r.won?'Gewinn':'Zonk'}`)); lines.push('');
    }
    lines.push('Zehn Versuche pro Strategie erlauben nur einen ersten Vergleich. Zufallsschwankungen können das Ergebnis deutlich beeinflussen.');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='drei-tore-versuchsprotokoll.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  });
  function setMotion() {
    document.body.classList.toggle('motion-off',!movement);
    $('motion-toggle').setAttribute('aria-pressed',String(movement));
    $('motion-toggle').textContent=movement?'Bewegung an':'Bewegung aus';
  }
  $('motion-toggle').addEventListener('click',()=>{movement=!movement;setMotion();});
  reducedMotion.addEventListener?.('change',()=>{movement=!reducedMotion.matches;setMotion();});
  function fullscreenState() {
    const active=Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.body.classList.contains('presentation'));
    $('fullscreen').textContent=active?'Vollbild verlassen':'⛶ Vollbild';
    $('fullscreen').setAttribute('aria-pressed',String(active));
  }
  $('fullscreen').addEventListener('click',async()=>{
    if(document.fullscreenElement || document.webkitFullscreenElement){
      try { if(document.exitFullscreen) await document.exitFullscreen(); else document.webkitExitFullscreen(); } catch {}
    } else if(document.body.classList.contains('presentation')) {
      document.body.classList.remove('presentation'); $('spiel').scrollIntoView({block:'start'});
    } else {
      try {
        if($('spiel').requestFullscreen) await $('spiel').requestFullscreen();
        else if($('spiel').webkitRequestFullscreen) $('spiel').webkitRequestFullscreen();
        else document.body.classList.add('presentation');
      } catch { document.body.classList.add('presentation'); }
    }
    fullscreenState();
  });
  document.addEventListener('fullscreenchange',fullscreenState);document.addEventListener('webkitfullscreenchange',fullscreenState);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('presentation');fullscreenState();}});
  setMotion(); startDemo(); startLab();
})();
