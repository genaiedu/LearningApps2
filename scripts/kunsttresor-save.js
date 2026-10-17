(function (root) {
  'use strict';
  const APP = 'kunsttresor', VERSION = 1, MAX_FILE_BYTES = 8*1024*1024, MAX_PAYLOAD_BYTES = 5*1024*1024;
  const header = {app:APP, version:VERSION, protection:'AES-256-GCM'};
  const encoder = new TextEncoder(), additionalData = encoder.encode(JSON.stringify(header));
  // A browser-delivered key is necessarily public. This is an opaque, authenticated
  // transfer format against casual edits, NOT a secret vault or server-backed anti-cheat.
  const keyBytes = new Uint8Array([119,191,36,203,4,167,112,53,97,236,21,88,240,136,173,11,56,155,69,208,26,113,194,81,170,249,33,14,98,67,217,153]);
  function cryptoAPI() {
    if (!root.crypto?.subtle || !root.crypto.getRandomValues) throw Error('Speichern und Laden benötigt einen aktuellen Browser und HTTPS. Bitte öffne die veröffentlichte Kunsttresor-Seite.');
    return root.crypto;
  }
  const base64 = bytes => root.btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''));
  function bytes(value) {
    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw Error('Ungültiges Dateiformat.');
    return Uint8Array.from(root.atob(value),letter=>letter.charCodeAt(0));
  }
  async function key(crypto) { return crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt','decrypt']); }
  async function encode(payload) {
    const crypto = cryptoAPI(), plain = encoder.encode(JSON.stringify(payload));
    if (plain.byteLength > MAX_PAYLOAD_BYTES) throw Error('Der Spielstand ist zu groß für dieses Dateiformat.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData,tagLength:128},await key(crypto),plain);
    return JSON.stringify({...header, iv:base64(iv), data:base64(new Uint8Array(sealed))},null,2);
  }
  async function decode(text) {
    if (typeof text !== 'string' || encoder.encode(text).byteLength > MAX_FILE_BYTES) throw Error('Die Datei ist zu groß. Erlaubt sind höchstens 8 MB.');
    let envelope;
    try { envelope = JSON.parse(text); } catch { throw Error('Die Datei ist keine gültige JSON-Datei.'); }
    if (envelope?.app !== APP || envelope.version !== VERSION || envelope.protection !== header.protection || Object.keys(envelope).sort().join(',') !== 'app,data,iv,protection,version') throw Error('Das ist keine unterstützte Kunsttresor-Spielstandsdatei.');
    const iv = bytes(envelope.iv), data = bytes(envelope.data);
    if (iv.length !== 12 || data.length < 16 || data.length > MAX_PAYLOAD_BYTES+16) throw Error('Ungültiges Dateiformat.');
    const crypto = cryptoAPI();
    let plain;
    try { plain = await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData,tagLength:128},await key(crypto),data); }
    catch { throw Error('Die Datei wurde verändert oder ist beschädigt. Dein bisheriger Spielstand bleibt unverändert.'); }
    try { return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain)); }
    catch { throw Error('Der gespeicherte Inhalt ist ungültig.'); }
  }
  function validate(payload, pool, replacements, core, progress, history=root.KunstHistory || (typeof require==='function' ? require('./kunsttresor-history.js') : null), gallery=root.KunstGallery || (typeof require==='function' ? require('./kunsttresor-gallery.js') : null)) {
    if (!payload || payload.app !== APP || payload.version !== VERSION || !Number.isSafeInteger(payload.savedAt) || payload.savedAt < 0 || payload.savedAt > Date.now()+300000 || !progress.integer(payload.best)) throw Error('Die Spielstandsdaten sind ungültig.');
    const profile = progress.restore(payload.progress);
    const knownStyles = new Set([...pool,...replacements.map(entry=>entry.previous)].map(work=>work.style));
    const knownTechniques = new Set([...pool,...replacements.map(entry=>entry.previous)].map(work=>work.technique));
    if (!profile || profile.record < payload.best || profile.events.some(event=>event.styles.some(value=>!knownStyles.has(value)) || event.techniques.some(value=>!knownTechniques.has(value)))) throw Error('Die Abzeichensammlung passt nicht zum Werkarchiv.');
    const workHistory=payload.history===undefined ? history.fresh(payload.savedAt) : history.restore(payload.history);
    const knownIds=new Set([...pool,...replacements.map(entry=>entry.previous)].map(work=>work.id));
    if(!workHistory || workHistory.rooms.some(room=>room.ids.some(id=>!knownIds.has(id))))throw Error('Die Bildhistorie passt nicht zum Werkarchiv.');
    let state = null, updated = false, newRoom = false;
    if (payload.state !== null) {
      const saved = payload.state;
      if ((saved?.runToken !== undefined && !progress.tokenPattern.test(saved.runToken)) || (saved?.parentRoomToken !== undefined && saved.parentRoomToken !== null && !progress.tokenPattern.test(saved.parentRoomToken))) throw Error('Die Angaben zum Rundgang sind ungültig.');
      if(saved?.historyToken!==undefined&&!progress.tokenPattern.test(saved.historyToken))throw Error('Die Kennung der Bildhistorie ist ungültig.');
      if (!saved || !progress.tokenPattern.test(saved.roomToken) || !progress.integer(saved.escaped) || payload.best < saved.escaped || !Array.isArray(saved.recent) || saved.recent.length > (root.KunstWallEnabled?42:24) || saved.recent.some(id=>typeof id !== 'string' || id.length > 128)) throw Error('Der gespeicherte Raum ist ungültig.');
      const restored = core.restoreUpdated(saved,pool,replacements);
      if (!restored.state) throw Error('Der gespeicherte Raum passt nicht zum Werkarchiv.');
      state = restored.state; updated = restored.updated; newRoom = restored.newRoom;
      // Only known game fields survive an import. Do not retain arbitrary file data.
      state = {version:1, roomToken:state.roomToken || progress.token(), runToken:state.runToken || progress.token(), parentRoomToken:state.parentRoomToken || null, ...(state.historyToken ? {historyToken:state.historyToken} : {}), ids:state.ids, options:state.options,
        choices:Object.fromEntries(state.ids.map(id=>[id,Object.fromEntries(core.fields.filter(field=>state.choices[id]?.[field]).map(field=>[field,state.choices[id][field]]))])),
        attemptLog:state.attemptLog || [], attempts:state.attempts, escaped:state.escaped, phase:state.phase, recent:state.recent, review:state.review,
        ...(state.joker!==undefined ? {joker:state.joker,jokerUsed:state.jokerUsed,excluded:state.excluded,locked:state.locked,dateHints:state.dateHints} : {}),
        ...(state.forgery ? {forgery:{id:state.forgery.id,image:state.forgery.image},forgeryMarks:state.forgeryMarks,forgeryMode:true,forgeryPrepared:true} : {})};
      const recorded=workHistory.rooms.find(entry=>entry.id===(state.historyToken||state.roomToken));
      if(recorded && JSON.stringify(recorded.ids)!==JSON.stringify(state.ids)) {
        if(!updated)throw Error('Der gespeicherte Raum widerspricht der Bildhistorie.');
        state.historyToken=progress.token(); // Archive replacement is a new encounter, not a new badge win.
      }
    }
    const collection=payload.gallery===undefined ? gallery.fresh() : gallery.restore(payload.gallery,pool,workHistory);
    if(!collection)throw Error('Die persönliche Galerie oder die Filmauswahl passt nicht zu deinen gewonnenen Räumen.');
    return {state, progress:profile, history:workHistory, gallery:collection, legacyGallery:payload.gallery===undefined, legacyHistory:payload.history===undefined, best:payload.best, savedAt:payload.savedAt, updated, newRoom};
  }
  const api = {APP, VERSION, MAX_FILE_BYTES, encode, decode, validate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstSave = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
