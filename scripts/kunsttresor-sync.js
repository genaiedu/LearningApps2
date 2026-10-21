(function (root) {
  'use strict';
  const API_BASE = 'https://learningapps-lerncode.spunky-snipe-1289.chatgpt.site';
  const SESSION_KEY = 'kunsttresor-lerncode-session-v1';
  const CONNECTION_KEY = 'kunsttresor-lerncode-connection-v2';
  const VIEW_KEY = 'kunsttresor-lerncode-view-v1';
  const META_PREFIX = 'kunsttresor-lerncode-meta-v1:';
  const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{26}$/;
  const PROFILE_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
  const memoryStores = new Map();
  function normalizeCode(value) {
    let code = String(value || '').toUpperCase().replace(/[\s-]/g, '');
    if (code.length === 28 && code.startsWith('LK')) code = code.slice(2);
    if (!CODE_PATTERN.test(code)) throw Error('Bitte gib den vollständigen Lerncode von deiner Codekarte ein.');
    return code;
  }
  function formatCode(value) {
    const code = normalizeCode(value);
    return 'LK-' + [code.slice(0, 5), code.slice(5, 10), code.slice(10, 15), code.slice(15, 20), code.slice(20)].join('-');
  }
  function readJSON(storage, key) {
    try { return JSON.parse(storage.getItem(key)); } catch { return null; }
  }
  function writeJSON(storage, key, value) {
    try { if (value === null) storage.removeItem(key); else storage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  function storageOrMemory(name) {
    try { if (root[name]) return root[name]; } catch { /* Keep this page usable without browser storage. */ }
    if (!memoryStores.has(name)) {
      const values = new Map();
      memoryStores.set(name, {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)});
    }
    return memoryStores.get(name);
  }
  function storedConnection(local = storageOrMemory('localStorage'), session = storageOrMemory('sessionStorage')) {
    const saved = readJSON(local, CONNECTION_KEY), legacy = saved ? null : readJSON(session, SESSION_KEY);
    const value = saved || legacy;
    try {
      if (!value || !PROFILE_PATTERN.test(value.profileId)) return null;
      const result = {profileId: value.profileId, code: normalizeCode(value.code), enabled: value.enabled !== false};
      if (legacy && writeJSON(local, CONNECTION_KEY, result)) {
        writeJSON(local, VIEW_KEY, {profileId: result.profileId});
        writeJSON(session, SESSION_KEY, null);
      }
      return result;
    } catch { return null; }
  }
  function storedProfileId(local = storageOrMemory('localStorage'), session = storageOrMemory('sessionStorage')) {
    const remembered = storedConnection(local, session);
    if (remembered) return remembered.profileId;
    const view = readJSON(local, VIEW_KEY);
    return view && PROFILE_PATTERN.test(view.profileId) ? view.profileId : null;
  }
  function scopedKey(key, profileId) {
    if (profileId === null || profileId === undefined) return key;
    if (!PROFILE_PATTERN.test(profileId)) throw Error('Die Kennung des Lernprofils ist ungültig.');
    return key + '::profil:' + profileId;
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }
  async function fingerprint(payload, crypto = root.crypto) {
    const {savedAt, ...content} = payload;
    const bytes = new TextEncoder().encode(canonical(content));
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  function createController(options) {
    const {adapter, onStatus = () => {}, fetcher = root.fetch.bind(root), crypto = root.crypto,
      local = storageOrMemory('localStorage'), session = storageOrMemory('sessionStorage'), apiBase = API_BASE, delay = 900} = options;
    let connection = null, generation = 0, timer = null, inFlight = null, pendingChoice = null, viewChanges = 0;
    let enabled = false, ready = false, dirty = false, conflict = false, destroyed = false, switching = false, storageIssue = null;
    const requests = new Set();
    let status = {kind: 'disconnected', message: 'Ohne Lerncode: Dein Spielstand bleibt auf diesem Gerät.', enabled: false, ready: false};
    function publish(kind, message) {
      if (storageIssue) { kind = 'error'; message = storageIssue; }
      status = {kind, message, profileId: connection?.profileId || null, dirty, enabled, ready,
        conflicted: conflict, awaitingChoice: Boolean(pendingChoice), remoteAvailable: Boolean(pendingChoice?.remote.state)};
      onStatus({...status});
    }
    function current(epoch, active) { return !destroyed && generation === epoch && connection === active; }
    function validEpoch(epoch) { return !destroyed && generation === epoch; }
    function invalidate() {
      generation++; clearTimeout(timer); timer = null; inFlight = null;
      for (const abort of requests) abort.abort();
      requests.clear(); switching = false;
      return generation;
    }
    function metaFor(profileId) {
      const value = readJSON(local, META_PREFIX + profileId);
      return value && Number.isSafeInteger(value.revision) && value.revision >= 0 ? value : null;
    }
    function remember(active) {
      writeJSON(local, META_PREFIX + active.profileId, {revision: active.revision, ackHash: active.ackHash || null,
        pendingHash: active.pendingHash || null, pendingMutation: active.pendingMutation || null, updatedAt: active.updatedAt || null});
    }
    function rememberConnection() {
      // The user explicitly chose persistent browser login. Keep the secret out
      // of URLs and retain separate game keys for every profile.
      const profileId = adapter.getProfileId();
      const view = profileId ? {profileId} : null;
      const viewSaved = writeJSON(local, VIEW_KEY, view);
      const connectionSaved = writeJSON(local, CONNECTION_KEY, connection ? {profileId: connection.profileId, code: connection.code, enabled} : null);
      const legacyRemoved = writeJSON(session, SESSION_KEY, null);
      if (viewSaved && connectionSaved && legacyRemoved) { storageIssue = null; return true; }
      // A full storage area must not leave an old code marked as enabled after
      // switching or pausing. Removal still works when the write quota is full.
      enabled = false; ready = false;
      const removed = writeJSON(local, CONNECTION_KEY, null);
      writeJSON(session, SESSION_KEY, null);
      writeJSON(local, VIEW_KEY, view);
      storageIssue = removed
        ? 'Der Browser konnte die Verbindung nicht dauerhaft merken. Die Synchronisierung ist ausgeschaltet und der gespeicherte Code wurde entfernt. Dein sichtbarer Spielstand bleibt lokal. Bitte schaffe Platz im Browserspeicher und verbinde den Code erneut.'
        : 'Der Browser kann die Verbindung gerade nicht speichern oder den alten Code entfernen. Die Synchronisierung dieser Seite ist ausgeschaltet. Bitte lösche den gespeicherten Code in den Browserdaten, bevor du die Seite erneut öffnest.';
      return false;
    }
    async function request(code, method = 'GET', body) {
      const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 25000);
      requests.add(abort);
      try {
        const response = await fetcher(apiBase.replace(/\/$/, '') + '/api/state/kunsttresor', {
          method, mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
          headers: {Authorization: 'Bearer ' + code, ...(body ? {'Content-Type': 'application/json'} : {})},
          ...(body ? {body: JSON.stringify(body)} : {}), signal: abort.signal
        });
        let result;
        try { result = await response.json(); } catch { throw Error('Der Speicherdienst hat keine lesbare Antwort geliefert.'); }
        if (!response.ok) {
          const error = Error(result.message || 'Der Lernstand konnte gerade nicht synchronisiert werden.');
          error.code = result.error; error.status = response.status; error.details = result;
          throw error;
        }
        if (!PROFILE_PATTERN.test(result.profileId) || result.appId !== 'kunsttresor' || !Number.isSafeInteger(result.revision) || result.revision < 0) throw Error('Die Antwort des Speicherdienstes ist ungültig.');
        if (method === 'GET' && result.state !== null) adapter.validateSnapshot(result.state);
        return result;
      } catch (error) {
        if (error.name === 'AbortError') throw Error('Der Speicherdienst antwortet gerade nicht. Dein Stand bleibt auf diesem Gerät.');
        throw error;
      } finally { clearTimeout(timeout); requests.delete(abort); }
    }
    function establish(code, remote, payload, hash) {
      adapter.replaceSnapshot(remote.profileId, payload);
      connection = {code, profileId: remote.profileId, revision: remote.revision, ackHash: hash,
        updatedAt: remote.updatedAt, pendingHash: null, pendingMutation: null, changes: 0, needsCheck: false};
      enabled = true; ready = true; conflict = false;
      rememberConnection(); remember(connection);
      return connection;
    }
    function offerChoice(code, remote, epoch, message) {
      pendingChoice = {code, remote, epoch}; switching = false; enabled = false; ready = false;
      rememberConnection();
      publish('choice', message || (remote.state === null
        ? 'Dieser Code hat noch keinen Spielstand. Lade deinen aktuellen Stand hoch oder beginne mit einem leeren Profil.'
        : 'Was möchtest du zuerst tun: deinen aktuellen Spielstand hochladen oder den gespeicherten Stand herunterladen?'));
    }
    async function connect(value) {
      const code = normalizeCode(value), epoch = invalidate();
      pendingChoice = null; conflict = false; enabled = false; ready = false; switching = true;
      if (connection) connection.needsCheck = true;
      rememberConnection();
      publish('connecting', 'Der Lerncode wird geprüft. Dein sichtbarer Spielstand bleibt bis zur Auswahl unverändert …');
      try {
        const remote = await request(code);
        if (!validEpoch(epoch)) return;
        offerChoice(code, remote, epoch);
      } catch (error) {
        if (!validEpoch(epoch)) return;
        switching = false;
        publish('error', error.message + ' Dein bisheriger Stand bleibt lokal; die Verbindung ist ausgeschaltet.');
      }
    }
    async function chooseDirection(direction) {
      if (!pendingChoice || destroyed || switching) return;
      if (!['upload', 'download', 'fresh'].includes(direction)) throw Error('Bitte wähle Hochladen oder Herunterladen.');
      const pending = pendingChoice, epoch = generation, serial = viewChanges;
      if (pending.epoch !== epoch) return;
      if (direction === 'download' && pending.remote.state === null) {
        publish('choice', 'Für diesen Code gibt es noch nichts herunterzuladen. Du kannst deinen Stand hochladen oder leer beginnen.'); return;
      }
      switching = true;
      publish('connecting', direction === 'upload' ? 'Der aktuelle Spielstand wird zum Hochladen vorbereitet …' : 'Der gespeicherte Stand wird frisch geprüft …');
      try {
        const remote = await request(pending.code);
        if (!validEpoch(epoch) || pendingChoice !== pending) return;
        if (remote.profileId !== pending.remote.profileId) throw Error('Der Lerncode wurde einem anderen Profil zugeordnet.');
        if ((direction === 'fresh' && remote.state !== null) || (direction === 'download' && remote.state === null)) {
          offerChoice(pending.code, remote, epoch, 'Der gespeicherte Stand hat sich geändert. Bitte wähle die Richtung erneut.'); return;
        }
        const hash = remote.state ? await fingerprint(remote.state, crypto) : null;
        if (!validEpoch(epoch) || pendingChoice !== pending) return;
        if (direction !== 'upload' && serial !== viewChanges) {
          offerChoice(pending.code, remote, epoch, 'Du hast während des Ladens weitergespielt. Wähle erneut, damit keine neue Eingabe verloren geht.'); return;
        }
        const payload = direction === 'upload' ? clone(adapter.getSnapshot()) : direction === 'fresh' ? adapter.freshSnapshot() : remote.state;
        const active = establish(pending.code, remote, payload, hash);
        pendingChoice = null; switching = false; dirty = direction !== 'download';
        if (dirty) {
          active.changes++;
          publish('pending', 'Dein ausgewählter Stand wird hochgeladen …');
          await flush();
        } else publish('saved', 'Gespeicherten Stand heruntergeladen. Änderungen werden jetzt automatisch hochgeladen.');
      } catch (error) {
        if (!validEpoch(epoch)) return;
        switching = false; publish('error', error.message);
      }
    }
    function schedule() {
      clearTimeout(timer);
      if (!connection || !enabled || !ready || conflict || pendingChoice || destroyed || switching) return;
      timer = setTimeout(() => { void flush(); }, delay);
    }
    function changed() {
      viewChanges++;
      if (!connection || destroyed || adapter.getProfileId() !== connection.profileId) return;
      connection.changes++; dirty = true;
      if (enabled && ready && !conflict && !switching && !pendingChoice) {
        publish('pending', 'Änderungen werden hochgeladen …'); schedule();
      } else if (!enabled && !pendingChoice && !switching) publish('paused', 'Verbindung ausgeschaltet. Dein aktueller Stand wird nur in diesem Browser gespeichert.');
    }
    async function flush() {
      if (!connection || !enabled || !ready || !dirty || conflict || pendingChoice || destroyed || switching) return;
      if (inFlight && current(inFlight.epoch, inFlight.active)) return inFlight.operation;
      const active = connection, epoch = generation;
      const operation = (async () => {
        try {
          if (adapter.getProfileId() !== active.profileId) throw Error('Der angezeigte Spielstand gehört nicht zum verbundenen Lerncode.');
          const serial = active.changes, payload = clone(adapter.getSnapshot()), hash = await fingerprint(payload, crypto);
          if (!current(epoch, active) || !enabled || !ready) return;
          if (hash === active.ackHash) {
            dirty = active.changes !== serial;
            publish(dirty ? 'pending' : 'saved', dirty ? 'Weitere Änderungen werden hochgeladen …' : 'Lernstand gespeichert.'); return;
          }
          if (active.needsCheck) {
            const remote = await request(active.code);
            const remoteHash = remote.state ? await fingerprint(remote.state, crypto) : null;
            if (!current(epoch, active) || !enabled || !ready) return;
            if (remote.profileId !== active.profileId) throw Error('Der Lerncode wurde einem anderen Profil zugeordnet.');
            if (remoteHash === hash) {
              active.revision = remote.revision; active.ackHash = hash; active.updatedAt = remote.updatedAt;
              active.pendingHash = null; active.pendingMutation = null; active.needsCheck = false;
              remember(active); dirty = active.changes !== serial;
              publish(dirty ? 'pending' : 'saved', dirty ? 'Weitere Änderungen werden hochgeladen …' : 'Lernstand gespeichert.'); return;
            }
            if (remote.revision !== active.revision && remoteHash !== active.pendingHash) {
              conflict = true; publish('conflict', 'Auf einem anderen Gerät wurde ein neuerer Stand gespeichert. Bitte wähle deinen nächsten Schritt.'); return;
            }
            active.revision = remote.revision; active.ackHash = remoteHash; active.needsCheck = false;
          }
          const mutationId = active.pendingHash === hash && active.pendingMutation ? active.pendingMutation : crypto.randomUUID();
          active.pendingHash = hash; active.pendingMutation = mutationId; remember(active);
          publish('saving', 'Lernstand wird hochgeladen …');
          const saved = await request(active.code, 'PUT', {state: payload, baseRevision: active.revision, mutationId});
          if (!current(epoch, active) || !enabled || !ready) return;
          if (saved.profileId !== active.profileId || saved.revision <= active.revision) throw Error('Die Speicherbestätigung passt nicht zu diesem Lernprofil.');
          active.revision = saved.revision; active.updatedAt = saved.updatedAt; active.ackHash = hash;
          active.pendingHash = null; active.pendingMutation = null; remember(active);
          dirty = active.changes !== serial;
          publish(dirty ? 'pending' : 'saved', dirty ? 'Weitere Änderungen werden hochgeladen …' : 'Lernstand gespeichert.');
        } catch (error) {
          if (!current(epoch, active) || !enabled) return;
          dirty = true;
          if (error.status === 409 && error.code === 'revision_conflict') {
            conflict = true; publish('conflict', 'Auf einem anderen Gerät wurde ein neuerer Stand gespeichert. Bitte wähle, welchen du weiterverwenden möchtest.');
          } else {
            active.needsCheck = true; publish('offline', error.message || 'Noch nicht synchronisiert. Dein Stand bleibt auf diesem Gerät.');
          }
        }
      })();
      const pendingOperation = {operation, epoch, active}; inFlight = pendingOperation;
      try { await operation; }
      finally {
        if (inFlight === pendingOperation) inFlight = null;
        if (current(epoch, active) && enabled && ready && dirty && !conflict && status.kind === 'pending') schedule();
      }
    }
    async function downloadCurrent(startup) {
      if (!connection || !enabled || destroyed || switching) return;
      const active = connection, epoch = generation, serial = viewChanges;
      switching = true;
      publish('connecting', startup ? 'Zuerst wird dein aktueller Datenbankstand heruntergeladen. Bis dahin wird nichts hochgeladen …' : 'Der gespeicherte Stand wird geprüft …');
      try {
        const remote = await request(active.code);
        const hash = remote.state ? await fingerprint(remote.state, crypto) : null;
        if (!current(epoch, active) || !enabled) return;
        if (remote.profileId !== active.profileId) throw Error('Die Antwort gehört nicht zu diesem Lernprofil.');
        if (remote.state === null) {
          offerChoice(active.code, remote, epoch, 'Für diesen Code ist noch kein Spielstand gespeichert. Bitte wähle, wie du beginnen möchtest.'); return;
        }
        if (serial !== viewChanges) {
          switching = false;
          if (startup) offerChoice(active.code, remote, epoch, 'Du hast während des Startladens weitergespielt. Bitte wähle, welchen Stand du weiterverwenden möchtest.');
          else { publish('pending', 'Deine neuen Eingaben bleiben erhalten und werden geprüft …'); schedule(); }
          return;
        }
        // A fresh page always adopts the database first, including when its
        // old local cache has unsent edits. No upload is allowed before this.
        if (startup || hash !== active.ackHash) adapter.replaceSnapshot(active.profileId, remote.state);
        active.revision = remote.revision; active.ackHash = hash; active.updatedAt = remote.updatedAt;
        active.pendingHash = null; active.pendingMutation = null; active.needsCheck = false;
        ready = true; dirty = false; switching = false; remember(active); rememberConnection();
        publish('saved', startup ? 'Aktuellen Datenbankstand heruntergeladen. Änderungen werden automatisch hochgeladen.' : 'Lernstand ist aktuell.');
      } catch (error) {
        if (!current(epoch, active) || !enabled) return;
        switching = false;
        publish('offline', error.message + (startup ? ' Dein lokaler Stand bleibt sichtbar. Hochladen wartet auf einen erfolgreichen Download.' : ' Dein Stand bleibt auf diesem Gerät.'));
        if (!startup && dirty) schedule();
      }
    }
    async function resolveConflict(useLocal) {
      if (!connection || !enabled || !ready || !conflict || destroyed || switching) return;
      const active = connection, epoch = generation, serial = viewChanges;
      switching = true; publish('connecting', 'Der aktuelle gespeicherte Stand wird geprüft …');
      try {
        const remote = await request(active.code);
        const hash = remote.state ? await fingerprint(remote.state, crypto) : null;
        if (!current(epoch, active) || !enabled) return;
        if (remote.profileId !== active.profileId) throw Error('Die Antwort gehört nicht zu diesem Lernprofil.');
        if (!useLocal && serial !== viewChanges) {
          switching = false; publish('conflict', 'Du hast während des Ladens weitergespielt. Bitte wähle erneut.'); return;
        }
        if (!useLocal) { adapter.replaceSnapshot(active.profileId, remote.state || adapter.freshSnapshot()); dirty = false; }
        else dirty = true;
        active.revision = remote.revision; active.ackHash = hash; active.updatedAt = remote.updatedAt;
        active.pendingHash = null; active.pendingMutation = null; active.needsCheck = false;
        conflict = false; switching = false; remember(active);
        publish(useLocal ? 'pending' : 'saved', useLocal ? 'Dein ausgewählter Stand wird hochgeladen …' : 'Gespeicherten Stand heruntergeladen.');
        if (useLocal) await flush();
      } catch (error) { if (current(epoch, active)) { switching = false; publish('error', error.message); } }
    }
    function cancelChoice() {
      invalidate(); pendingChoice = null; conflict = false; enabled = false; ready = false; rememberConnection();
      publish(connection ? 'paused' : 'disconnected', 'Auswahl abgebrochen. Dein sichtbarer Spielstand bleibt lokal; die Datenbankverbindung ist ausgeschaltet.');
    }
    function setEnabled(value) {
      if (destroyed) return;
      if (value) {
        if (!connection) { publish('disconnected', 'Gib zuerst deinen Lerncode ein und wähle Hochladen oder Herunterladen.'); return; }
        if (enabled && ready) return;
        return connect(connection.code);
      }
      invalidate(); enabled = false; ready = false; pendingChoice = null; conflict = false;
      if (connection) connection.needsCheck = true;
      rememberConnection();
      publish(connection ? 'paused' : 'disconnected', 'Verbindung ausgeschaltet. Dein sichtbarer Spielstand bleibt erhalten und wird nur in diesem Browser gespeichert.');
    }
    function disconnect() {
      invalidate(); connection = null; pendingChoice = null; enabled = false; ready = false; dirty = false; conflict = false;
      rememberConnection();
      publish('disconnected', 'Code vergessen. Dein sichtbarer Spielstand bleibt lokal erhalten. Für die Datenbank musst du den Code erneut eingeben.');
    }
    function destroy() { invalidate(); destroyed = true; pendingChoice = null; }
    async function resume() {
      const remembered = storedConnection(local, session);
      if (!remembered || destroyed) { publish('disconnected', 'Ohne Lerncode: Dein Spielstand bleibt auf diesem Gerät.'); return; }
      const metadata = metaFor(remembered.profileId);
      connection = {...remembered, revision: metadata?.revision || 0, ackHash: metadata?.ackHash || null,
        pendingHash: metadata?.pendingHash || null, pendingMutation: metadata?.pendingMutation || null,
        updatedAt: metadata?.updatedAt || null, changes: 0, needsCheck: true};
      enabled = remembered.enabled; ready = false; dirty = false;
      if (!enabled) { publish('paused', 'Verbindung ausgeschaltet. Dein lokaler Stand ist geöffnet; es werden keine Daten übertragen.'); return; }
      return downloadCurrent(true);
    }
    async function refresh() {
      if (destroyed || !enabled || switching || pendingChoice || conflict || (inFlight && current(inFlight.epoch, inFlight.active))) return;
      if (!ready) return downloadCurrent(true);
      if (dirty) return flush();
      return downloadCurrent(false);
    }
    return {connect, chooseDirection, setEnabled, changed, flush, resolveConflict, cancelChoice, disconnect, destroy, resume, refresh,
      initialize: useCurrent => chooseDirection(useCurrent ? 'upload' : 'fresh'), cancelNew: cancelChoice,
      getStatus: () => ({...status}), hasUnsavedChanges: () => !destroyed && enabled && dirty, getProfileId: () => connection?.profileId || null};
  }
  function mount(adapter, container = root.document.getElementById('save-dialog')) {
    if (!container) throw Error('Das Menü für deinen Lernstand fehlt.');
    const panel = root.document.createElement('section');
    panel.id = 'kunst-lerncode-panel'; panel.className = 'lerncode-panel'; panel.setAttribute('aria-labelledby', 'lerncode-heading');
    panel.innerHTML = '<p class="eyebrow">Ein Code. Dein Spielstand.</p><h3 id="lerncode-heading">Auf jedem Gerät weiterspielen.</h3>' +
      '<p>Verbinde deinen Kunsttresor ohne Namen und ohne E-Mail-Adresse. Du bestimmst beim Verbinden, welcher Spielstand übernommen wird.</p>' +
      '<form id="lerncode-form"><label for="lerncode-input">Dein persönlicher Lerncode</label><div class="lerncode-input-row"><input id="lerncode-input" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="48" placeholder="LK-…" aria-describedby="lerncode-hint"><button type="button" id="lerncode-reveal" aria-label="Lerncode anzeigen" aria-pressed="false">Zeigen</button><button type="submit" class="primary" id="lerncode-connect">Verbinden</button></div></form>' +
      '<p id="lerncode-hint" class="small">Ein Code gehört zu einem eigenen Profil. Bewahre ihn wie ein Passwort auf. Beim Verbinden wählst du immer zuerst Hochladen oder Herunterladen.</p>' +
      '<a class="lerncode-get" href="../LearningApps/lerncode.html" target="_blank" rel="noopener">Noch keinen Code? Lerncode holen ↗</a>' +
      '<p id="lerncode-status" class="lerncode-status" role="status" aria-live="polite"></p>' +
      '<div id="lerncode-choice" class="lerncode-choice" hidden><h4>Welchen Spielstand möchtest du übernehmen?</h4><div class="lerncode-directions"><button type="button" class="primary" id="lerncode-upload">↑ Aktuellen Spielstand hochladen</button><p>Der gerade sichtbare Stand wird für diesen Code in der Datenbank gespeichert und ersetzt dessen bisherigen Stand.</p><button type="button" id="lerncode-download">↓ Gespeicherten Stand herunterladen</button><p>Der Datenbankstand dieses Codes ersetzt den gerade sichtbaren Spielstand.</p></div><p id="lerncode-empty" class="small" hidden>Für diesen Code ist noch kein Spielstand gespeichert. Herunterladen ist erst nach dem ersten Speichern möglich.</p><div class="dialog-actions"><button type="button" id="lerncode-fresh" hidden>Mit leerem Profil beginnen</button><button type="button" id="lerncode-cancel">Abbrechen</button></div></div>' +
      '<div id="lerncode-conflict" class="lerncode-choice" hidden><h4>Zwei unterschiedliche Spielstände.</h4><p>Die automatische Synchronisierung wartet auf deine Entscheidung. Du kannst deinen aktuellen Stand vorher mit „Als JSON speichern“ sichern.</p><div class="dialog-actions"><button type="button" class="primary" id="lerncode-load">Gespeicherten Stand herunterladen</button><button type="button" id="lerncode-keep">Diesen Stand stattdessen hochladen</button></div><p class="small">Die gewählte Fassung ersetzt den anderen Stand dieses Codes. Spielstände anderer Codes bleiben getrennt.</p></div>' +
      '<div id="lerncode-connected" hidden><label class="lerncode-switch" for="lerncode-enabled"><input type="checkbox" role="switch" id="lerncode-enabled" aria-describedby="lerncode-switch-hint"><span class="lerncode-switch-track" aria-hidden="true"></span><span>Mit Datenbank verbunden</span></label><p id="lerncode-switch-hint" class="small">Eingeschaltet: Änderungen werden automatisch hochgeladen. Ausgeschaltet: Du spielst mit dem sichtbaren Stand lokal weiter. Beim erneuten Einschalten wählst du die Richtung.</p><div class="lerncode-actions"><button type="button" id="lerncode-sync">Jetzt synchronisieren</button><button type="button" id="lerncode-disconnect">Code vergessen / Abmelden</button></div></div>' +
      '<p class="small lerncode-memory">Dieser Browser merkt sich deinen Code und den Schalter dauerhaft. Ist die Verbindung beim nächsten Öffnen eingeschaltet, wird zuerst der aktuelle Datenbankstand geladen. Auf gemeinsam genutzten Geräten anschließend „Code vergessen“ wählen.</p>' +
      '<p class="small lerncode-scope">Synchronisiert wird der Inhalt deiner JSON-Spielstandsdatei: Raum, Versuche, Rekord, Abzeichen, Bildhistorie, Galerie und Filmgestaltung. Geräte-Einstellungen und Freigaben bleiben auf diesem Gerät. Bitte trage auch in eigenen Filmtexten keine Namen ein.</p>';
    const intro = container.querySelector(':scope > p');
    if (intro) intro.after(panel); else container.append(panel);
    const find = id => panel.querySelector('#' + id), form = find('lerncode-form'), input = find('lerncode-input');
    const controller = createController({adapter, onStatus(value) {
      panel.dataset.state = value.kind;
      find('lerncode-status').textContent = value.message;
      find('lerncode-choice').hidden = !value.awaitingChoice;
      find('lerncode-conflict').hidden = !value.conflicted;
      find('lerncode-connected').hidden = !value.profileId;
      find('lerncode-enabled').checked = value.enabled;
      find('lerncode-enabled').setAttribute('aria-checked', String(value.enabled));
      find('lerncode-empty').hidden = value.remoteAvailable;
      find('lerncode-fresh').hidden = value.remoteAvailable;
      const busy = value.kind === 'connecting' || value.kind === 'saving';
      find('lerncode-connect').disabled = busy;
      find('lerncode-upload').disabled = busy;
      find('lerncode-download').disabled = busy || !value.remoteAvailable;
      find('lerncode-fresh').disabled = busy;
      find('lerncode-sync').disabled = busy || !value.enabled || value.awaitingChoice || value.conflicted;
      panel.setAttribute('aria-busy', String(busy));
      const trigger = root.document.getElementById('open-save');
      if (trigger) { trigger.dataset.syncState = value.kind; trigger.setAttribute('aria-label', 'Spielstand. ' + value.message); trigger.title = value.message; }
    }});
    form.addEventListener('submit', async event => {
      event.preventDefault();
      try { await controller.connect(input.value); if (controller.getStatus().kind !== 'error') input.value = ''; }
      catch (error) { find('lerncode-status').textContent = error.message; input.focus(); }
    });
    find('lerncode-reveal').onclick = () => {
      const reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password';
      find('lerncode-reveal').textContent = reveal ? 'Verbergen' : 'Zeigen';
      find('lerncode-reveal').setAttribute('aria-pressed', String(reveal));
      find('lerncode-reveal').setAttribute('aria-label', reveal ? 'Lerncode verbergen' : 'Lerncode anzeigen');
    };
    find('lerncode-upload').onclick = () => void controller.chooseDirection('upload');
    find('lerncode-download').onclick = () => void controller.chooseDirection('download');
    find('lerncode-fresh').onclick = () => void controller.chooseDirection('fresh');
    find('lerncode-cancel').onclick = () => controller.cancelChoice();
    find('lerncode-enabled').onchange = event => void controller.setEnabled(event.target.checked);
    find('lerncode-sync').onclick = () => void controller.refresh();
    find('lerncode-load').onclick = () => {
      if (root.confirm('Den Datenbankstand herunterladen? Dein aktuell angezeigter Stand wird dadurch ersetzt.')) void controller.resolveConflict(false);
    };
    find('lerncode-keep').onclick = () => {
      if (root.confirm('Diesen angezeigten Stand hochladen? Er ersetzt den gespeicherten Stand dieses Lerncodes.')) void controller.resolveConflict(true);
    };
    find('lerncode-disconnect').onclick = () => {
      controller.disconnect(); input.value = ''; input.type = 'password';
      find('lerncode-reveal').textContent = 'Zeigen'; find('lerncode-reveal').setAttribute('aria-pressed', 'false');
      find('lerncode-reveal').setAttribute('aria-label', 'Lerncode anzeigen'); input.focus();
    };
    root.addEventListener('online', () => void controller.refresh());
    root.document.addEventListener('visibilitychange', () => { if (root.document.visibilityState === 'hidden') void controller.flush(); else void controller.refresh(); });
    root.addEventListener('beforeunload', event => { if (controller.hasUnsavedChanges()) { event.preventDefault(); event.returnValue = ''; } });
    void controller.resume();
    return controller;
  }
  const api = {API_BASE, SESSION_KEY, CONNECTION_KEY, VIEW_KEY, META_PREFIX, normalizeCode, formatCode, scopedKey, storedConnection, storedProfileId, fingerprint, createController, mount};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstLerncode = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
