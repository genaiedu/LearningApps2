(function (root) {
  'use strict';
  const MAX_EVENTS = 5000;
  const tokenPattern = /^[a-f0-9]{32}$/;
  const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
  const badges = [
    {id:'first-door', level:0, title:'Die erste Tür', description:'Einen Raum vollständig lösen.', metric:'wins', target:1, symbol:'door'},
    {id:'clear-eye', level:0, title:'Sicherer Blick', description:'Alle 16 Antworten beim ersten Prüfversuch richtig zuordnen.', metric:'first', target:1, symbol:'eye'},
    {id:'second-look', level:0, title:'Der zweite Blick', description:'Nach einem Fehlversuch alle Antworten richtig korrigieren.', metric:'corrections', target:1, symbol:'return'},
    {id:'three-doors', level:1, title:'Im Fluss', description:'Drei Räume in einer Runde öffnen.', metric:'record', target:3, symbol:'door'},
    {id:'five-doors', level:1, title:'Langer Rundgang', description:'Fünf Räume in einer Runde öffnen.', metric:'record', target:5, symbol:'route'},
    {id:'five-firsts', level:1, title:'Fünf klare Blicke', description:'Insgesamt fünf Räume im ersten Prüfversuch lösen.', metric:'first', target:5, symbol:'eye'},
    {id:'twenty-five-doors', level:2, title:'Schlüsselmeister', description:'25 Räume in einer einzigen Runde öffnen.', metric:'record', target:25, symbol:'key'},
    {id:'hundred-rooms', level:2, title:'Galeriekenner', description:'Insgesamt 100 Räume lösen, über beliebig viele Runden.', metric:'wins', target:100, symbol:'gallery'},
    {id:'thirty-five-styles', level:2, title:'Durch die Kunstgeschichte', description:'In gelösten Räumen 35 verschiedene Stilrichtungen erkennen.', metric:'styles', target:35, symbol:'gallery'},
    {id:'twelve-techniques', level:2, title:'Spurensucher', description:'In gelösten Räumen zwölf verschiedene Techniken erkennen.', metric:'techniques', target:12, symbol:'search'},
    {id:'master-eye', level:3, title:'Meisterblick', description:'25 aufeinanderfolgende Räume in einer Runde ausschließlich im ersten Prüfversuch lösen. 400 richtige Zuordnungen ohne Fehlprüfung. Eine gelungene Korrektur unterbricht diese Serie, nimmt dir aber kein anderes Abzeichen.', metric:'perfectStreak', target:25, symbol:'eye'},
    {id:'five-hundred', level:3, title:'Ein Leben in der Galerie', description:'500 Räume insgesamt lösen. 2.000 untersuchte Werke und 8.000 richtige Zuordnungen am Ende der Prüfungen.', metric:'wins', target:500, symbol:'key'}
  ];
  function token() {
    // Identity for replay-safe progress accounting, not an anti-cheat secret.
    if (root.crypto?.getRandomValues) return Array.from(root.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2,'0')).join('');
    return Array.from({length:32},()=>Math.floor(Math.random()*16).toString(16)).join('');
  }
  function fresh(record = 0) { return {version:1, record:integer(record) ? record : 0, events:[]}; }
  function validStrings(values) { return Array.isArray(values) && values.length === 4 && values.every(value => typeof value === 'string' && value.length > 0 && value.length <= 512) && new Set(values).size === 4; }
  function restore(value) {
    if (!value || value.version !== 1 || !integer(value.record) || !Array.isArray(value.events) || value.events.length > MAX_EVENTS) return null;
    const ids = new Set(), events = [];
    for (const event of value.events) {
      if (!event || !tokenPattern.test(event.id) || ids.has(event.id) || !Number.isSafeInteger(event.at) || event.at < 0 || event.at > Date.now()+300000 || !integer(event.depth) || event.depth < 1 || event.depth > value.record || typeof event.first !== 'boolean' || typeof event.corrected !== 'boolean' || (event.first && event.corrected) || !validStrings(event.styles) || !validStrings(event.techniques)) return null;
      ids.add(event.id);
      if ((event.runToken !== undefined && !tokenPattern.test(event.runToken)) || (event.parentRoomToken !== undefined && event.parentRoomToken !== null && !tokenPattern.test(event.parentRoomToken)) || event.parentRoomToken === event.id) return null;
      events.push({id:event.id, runToken:event.runToken || event.id, parentRoomToken:event.parentRoomToken || null, at:event.at, depth:event.depth, first:event.first, corrected:event.corrected, styles:[...event.styles], techniques:[...event.techniques]});
    }
    const byId = new Map(events.map(event=>[event.id,event]));
    if (events.some(event=>{const parent=byId.get(event.parentRoomToken);return parent && (parent.runToken !== event.runToken || parent.depth+1 !== event.depth);})) return null;
    return {version:1, record:value.record, events};
  }
  function statistics(profile) {
    const byId = new Map(profile.events.map(event=>[event.id,event])), streaks = new Map();
    let perfectStreak = 0;
    for (const event of [...profile.events].sort((a,b)=>a.depth-b.depth)) {
      const parent = byId.get(event.parentRoomToken);
      const connected = parent && parent.runToken === event.runToken && parent.depth+1 === event.depth;
      const streak = event.first ? 1 + (connected ? streaks.get(parent.id) || 0 : 0) : 0;
      streaks.set(event.id,streak); perfectStreak = Math.max(perfectStreak,streak);
    }
    return {wins:profile.events.length, first:profile.events.filter(event=>event.first).length, corrections:profile.events.filter(event=>event.corrected).length, record:profile.record,
      styles:new Set(profile.events.flatMap(event=>event.styles)).size, techniques:new Set(profile.events.flatMap(event=>event.techniques)).size, perfectStreak};
  }
  function collection(profile) {
    const stats = statistics(profile);
    return badges.map(badge=>({...badge, value:stats[badge.metric], earned:stats[badge.metric] >= badge.target}));
  }
  function recordWin(profile, state, pool, at = Date.now()) {
    const works = state?.ids?.map(id=>pool.find(work=>work.id === id)) || [];
    if (state?.phase !== 'unlocked' || !tokenPattern.test(state.roomToken) || ![1,2].includes(state.attempts) || !integer(state.escaped) || state.escaped < 1 || works.length !== 4 || new Set(state.ids).size !== 4 || works.some(work=>!work || ['date','style','artist','technique'].some(field=>state.choices?.[work.id]?.[field] !== work[field])) || ['date','style','artist','technique'].some(field=>new Set(works.map(work=>work[field])).size !== 4) || profile.events.some(event=>event.id === state.roomToken)) return {profile, earned:[]};
    if (profile.events.length >= MAX_EVENTS) throw Error('Die Abzeichensammlung enthält bereits 5.000 gelöste Räume. Dein Spielstand und Rekord bleiben erhalten.');
    const firstTry = state.attemptLog?.find(entry=>entry.attempt === 1);
    const corrected = state.attempts === 2 && Boolean(firstTry && works.some(work=>['date','style','artist','technique'].some(field=>firstTry.choices?.[work.id]?.[field] !== work[field])));
    const next = {version:1, record:Math.max(profile.record,state.escaped), events:[...profile.events,{id:state.roomToken, runToken:state.runToken || state.roomToken, parentRoomToken:state.parentRoomToken || null, at, depth:state.escaped, first:state.attempts === 1, corrected, styles:works.map(work=>work.style), techniques:works.map(work=>work.technique)}]};
    const previous = new Set(collection(profile).filter(badge=>badge.earned).map(badge=>badge.id));
    return {profile:next, earned:collection(next).filter(badge=>badge.earned && !previous.has(badge.id))};
  }
  function merge(left, right) {
    const a = restore(left), b = restore(right);
    if (!a || !b) throw Error('Die Abzeichensammlung ist ungültig.');
    const entries = new Map(a.events.map(event=>[event.id,event]));
    for (const event of b.events) {
      if (entries.has(event.id) && JSON.stringify(entries.get(event.id)) !== JSON.stringify(event)) throw Error('Die Datei enthält widersprüchliche Angaben zu einem bereits gelösten Raum.');
      entries.set(event.id,event);
    }
    if (entries.size > MAX_EVENTS) throw Error('Diese beiden Sammlungen sind zusammen zu groß.');
    const merged = restore({version:1, record:Math.max(a.record,b.record), events:[...entries.values()].sort((x,y)=>x.at-y.at || x.id.localeCompare(y.id))});
    if (!merged) throw Error('Die Datei enthält widersprüchliche Angaben zum Verlauf eines Rundgangs.');
    return merged;
  }
  const api = {badges, token, tokenPattern, integer, fresh, restore, statistics, collection, recordWin, merge, MAX_EVENTS};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstProgress = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
