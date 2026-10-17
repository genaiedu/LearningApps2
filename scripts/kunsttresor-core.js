(function (root) {
  'use strict';
  const count = root.KunstWallEnabled ? 7 : 4, limit = root.KunstWallEnabled ? 3 : 2;
  const baseFields = ['date', 'style', 'artist', 'technique'];
  const fields = [...baseFields,...(root.KunstWallEnabled ? ['title'] : [])];
  function fieldsFor(state) { return [...baseFields,...(state?.options?.title ? ['title'] : [])]; }
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function compatible(works, candidate, activeFields=fields) {
    return !works.some(work => work.id === candidate.id || activeFields.some(field => !(root.KunstWallEnabled&&field==='technique')&&(work[field] === candidate[field] || field==='title'&&galleryTitle(work)===galleryTitle(candidate))) || (work.artistIdentity && work.artistIdentity === candidate.artistIdentity));
  }
  function introSelection(pool, landmarkIds, recent = [], random = Math.random) {
    // Cropped cinematic detail shots are reserved for two-dimensional works.
    pool = pool.filter(isIntroImage);
    const landmarks = pool.filter(work => landmarkIds.includes(work.id) && !recent.includes(work.id));
    const fallback = pool.filter(work => landmarkIds.includes(work.id));
    const closing = shuffle(landmarks.length ? landmarks : fallback, random)[0];
    if (!closing) throw new Error('Die Hauptwerk-Auswahl fehlt.');
    const candidates = shuffle(pool.filter(work => work.id !== closing.id && !recent.includes(work.id)), random), chosen = [];
    for (const work of candidates) if (chosen.length < 5 && !chosen.some(other => other.artist === work.artist || other.style === work.style)) chosen.push(work);
    for (const work of candidates) if (chosen.length < 5 && !chosen.includes(work) && !chosen.some(other => other.artist === work.artist)) chosen.push(work);
    for (const work of candidates) if (chosen.length < 5 && !chosen.includes(work)) chosen.push(work);
    return [...chosen, closing];
  }
  function galleryTitle(work) { return work.titleDe || work.galleryTitle || work.title; }
  function heroSelection(pool, recent = [], random = Math.random) {
    pool = pool.filter(isIntroImage);
    const fresh = pool.filter(work => !recent.includes(work.id));
    const candidates = shuffle(fresh.length >= 3 ? fresh : pool,random), selected = [];
    const sameArtist = (a,b) => (a.artistIdentity || a.artist) === (b.artistIdentity || b.artist);
    for (const work of candidates) if (selected.length < 3 && !selected.some(other => sameArtist(other,work) || other.style === work.style)) selected.push(work);
    for (const work of candidates) if (selected.length < 3 && !selected.includes(work) && !selected.some(other => sameArtist(other,work))) selected.push(work);
    for (const work of candidates) if (selected.length < 3 && !selected.includes(work)) selected.push(work);
    return selected;
  }
  function validWork(work) {
    if (!work) return false;
    const named = Number.isInteger(work.artistDeath) && work.artistDeath <= 1955 && work.artistDeath !== 0;
    const anonymousAncient = work.artist === 'Unbekannter Künstler' && work.attribution === 'unknown'
      && work.artistDeath === null && Number.isInteger(work.dateStart) && Number.isInteger(work.dateEnd)
      && work.dateStart >= -10000 && work.dateEnd <= 600 && work.dateStart <= work.dateEnd
      && work.rightsBasis === 'Ancient work; museum Open Access';
    return Boolean(work.id && work.title && work.imageId && work.source && work.medium && work.styleOriginal && work.publicDomain === true && (named || anonymousAncient) && fields.every(field => typeof work[field] === 'string' && work[field].trim()));
  }
  function isIntroImage(work) {
    return work.introEligible !== false && !['sculpture','relief','object'].includes(work.artForm);
  }
  function canDownload(work) {
    if (!work?.imageDownloadAllowed || !/public domain|cc0|cc-zero/i.test(work.imageLicense || '')) return false;
    try {
      const url=new URL(work.imageOriginalURL);
      const museum = work.imageLicense === 'CC0' && work.downloadRightsChecked &&
        ((work.metadataProvider === 'Art Institute of Chicago' && url.hostname === 'www.artic.edu' && url.pathname.startsWith('/iiif/2/')) ||
         (work.metadataProvider === 'Cleveland Museum of Art' && url.hostname === 'openaccess-cdn.clevelandart.org') ||
         (work.metadataProvider === 'Metropolitan Museum of Art' && url.hostname === 'images.metmuseum.org'));
      return url.protocol==='https:' && (url.hostname==='upload.wikimedia.org' || Boolean(museum));
    } catch { return false; }
  }
  function room(pool, recent = [], random = Math.random, requireForgeryTarget = false) {
    const eligible = pool.filter(validWork);
    function find(candidates) {
      let visits = 0;
      function search(chosen, from) {
        if (chosen.length === count) return !requireForgeryTarget || chosen.some(isIntroImage) ? chosen : null;
        if (++visits > 15000) return null;
        for (let i = from; i < candidates.length; i++) {
          if (!compatible(chosen, candidates[i])) continue;
          // Keep a seven-work wall varied while allowing repeated techniques.
          if(root.KunstWallEnabled&&chosen.filter(work=>work.technique===candidates[i].technique).length>=3)continue;
          const result = search([...chosen, candidates[i]], i + 1);
          if (result) return result;
        }
        return null;
      }
      return search([], 0);
    }
    let selected = null;
    const artistKey = work => work.artistIdentity || work.artist;
    const byId = new Map(eligible.map(work => [work.id,work]));
    // First avoid all artists from the last six rooms, releasing the oldest
    // room only if four distinct answer sets cannot otherwise be assembled.
    // Fall back to work-only exclusions for small or constrained archives.
    for (const avoidArtists of [true,false]) {
      for (let keep = recent.length; keep >= 0 && !selected; keep = Math.max(0,keep - count)) {
        const blocked = keep ? recent.slice(-keep) : [];
        const artists = new Set(blocked.map(id=>byId.get(id)).filter(Boolean).map(artistKey));
        selected = find(shuffle(eligible.filter(work => !blocked.includes(work.id) && (!avoidArtists || !artists.has(artistKey(work)))),random));
        if (keep === 0) break;
      }
      if(selected) break;
    }
    if (!selected) throw new Error('Es gibt nicht genug eindeutig zuordenbare Werke für einen Raum.');
    return { works: shuffle(selected, random), options: Object.fromEntries(fields.map(field => [field, shuffle(selected.map(work => work[field]), random)])) };
  }
  function newState(pool, previous = null, random = Math.random, requireForgeryTarget = false) {
    const recent = previous ? [...previous.recent, ...previous.ids].slice(-count*6) : [];
    const next = room(pool, recent, random, requireForgeryTarget);
    return {version: 1, ids: next.works.map(work => work.id), options: next.options, choices: {}, attemptLog: [], attempts: 0, escaped: previous?.escaped || 0, phase: 'playing', recent,
      ...(root.KunstWallEnabled ? {joker:1,jokerUsed:[],excluded:{}} : {}),
      ...(previous?.runToken ? {runToken:previous.runToken, parentRoomToken:previous.phase === 'unlocked' ? previous.roomToken : previous.parentRoomToken || null} : {})};
  }
  function nextForgeryCooldown(random = Math.random) {
    return random() < .5 ? 4 : 5;
  }
  function forgeryPlan(cooldown, random = Math.random, everySeries = false) {
    cooldown = Number.isInteger(cooldown) && cooldown > 0 ? cooldown : 0;
    if (everySeries) return {cooldown, generate:true};
    // Four or five original rooms, then one forgery: intervals of five or six.
    return {cooldown:cooldown > 0 ? cooldown-1 : nextForgeryCooldown(random), generate:cooldown === 0};
  }
  function choose(state, workId, field, value) {
    const fields=fieldsFor(state);
    if (state.phase !== 'playing' || !state.ids.includes(workId) || !fields.includes(field) || (value && !state.options[field].includes(value))) return state;
    if (isExcluded(state,workId,field,value) || takenBy(state,workId,field,value)) return state;
    const choices = Object.fromEntries(Object.entries(state.choices).map(([id, selection]) => [id, {...selection}]));
    choices[workId] = {...choices[workId], [field]: value};
    return {...state, choices};
  }
  function capacity(state,field,value){return (state.options[field]||[]).filter(v=>v===value).length;}
  function isExcluded(state,id,field,value){return Boolean(value && state.excluded?.[id]?.[field]?.includes(value));}
  function exclusions(state,pool) {
    const byId=new Map(pool.map(work=>[work.id,work])),result={};
    // Keep every checked snapshot, not just the most recent feedback.
    for(const snapshot of [...(state.attemptLog||[]),...(state.review?[state.review]:[])])for(const id of state.ids)for(const field of fieldsFor(state)){
      const value=snapshot.choices?.[id]?.[field];
      if(value && state.options[field].includes(value) && value!==byId.get(id)?.[field]){
        result[id] ||= {};result[id][field] ||= [];
        if(!result[id][field].includes(value))result[id][field].push(value);
      }
    }
    return result;
  }
  function useJoker(state,id,pool) {
    const byId=new Map(pool.map(work=>[work.id,work])),work=byId.get(id),fields=fieldsFor(state);
    if(state.phase!=='playing' || state.joker!==1 || state.jokerUsed?.includes(id) || !state.ids.includes(id) || !work || fields.some(field=>!state.options[field].includes(work[field])))return state;
    let next=state;
    for(const field of fields){
      const value=work[field];
      // Free only an incorrectly occupied place; repeated techniques keep their quota.
      while(takenBy(next,id,field,value)){
        const owner=state.ids.find(other=>other!==id && next.choices[other]?.[field]===value && byId.get(other)?.[field]!==value);
        if(!owner)return state;
        next=choose(next,owner,field,'');
      }
      next=choose(next,id,field,value);
      if(next.choices[id]?.[field]!==value)return state;
    }
    return {...next,joker:0,jokerUsed:[...(state.jokerUsed||[]),id],forgeryMarks:{...state.forgeryMarks,[id]:state.forgery?.id===id}};
  }
  // A move is explicit and atomic: an unconfirmed selection never clears an answer.
  function transferChoice(state, workId, field, value, ownerId) {
    if (!takenBy(state,workId,field,value) || ownerId===workId || !state.ids.includes(ownerId) || state.choices[ownerId]?.[field]!==value) return state;
    const released=choose(state,ownerId,field,'');
    if (released===state) return state;
    const moved=choose(released,workId,field,value);
    return moved.choices[workId]?.[field]===value ? moved : state;
  }
  function remaining(state,field,value){return Math.max(0,capacity(state,field,value)-state.ids.filter(id=>state.choices[id]?.[field]===value).length);}
  function validValues(options,values){return values.every(v=>options.includes(v)&&values.filter(x=>x===v).length<=options.filter(x=>x===v).length);}
  function takenBy(state, workId, field, value) {
    if(!value)return null;
    const owners=state.ids.filter(id=>id!==workId&&state.choices[id]?.[field]===value);
    return owners.length>=capacity(state,field,value)?owners[0]||null:null;
  }
  function review(state, pool) {
    const fields=fieldsFor(state);
    if (!state.review?.choices || state.attempts < 1) return [];
    const byId = new Map(pool.map(work => [work.id,work]));
    return state.ids.flatMap(id => fields.map(field => {
      const value = state.review.choices[id]?.[field];
      return {id,field,value,correct:value === byId.get(id)?.[field],changed:value !== (state.choices[id]?.[field] || '')};
    }));
  }
  function filled(state) { const fields=fieldsFor(state);return state.ids.reduce((sum,id) => sum + fields.filter(field => Boolean(state.choices?.[id]?.[field])).length, 0); }
  function inspect(state, pool) {
    const fields=fieldsFor(state);
    if (state.phase !== 'playing' || state.attempts >= limit) return {state, checked: false};
    if (filled(state) !== count*fields.length) return {state, checked: false, incomplete: true};
    const byId = new Map(pool.map(work => [work.id, work]));
    const correct = state.ids.reduce((sum, id) => sum + fields.filter(field => state.choices[id][field] === byId.get(id)?.[field]).length, 0);
    const attempts = state.attempts + 1;
    const forgeryCorrect = state.ids.every(id => Boolean(state.forgeryMarks?.[id]) === (id === state.forgery?.id));
    const unlocked = correct === count*fields.length && forgeryCorrect;
    const review = {choices:Object.fromEntries(state.ids.map(id => [id,{...state.choices[id]}]))};
    const attemptLog = [...(state.attemptLog || []), {attempt: attempts, choices: review.choices, ...(state.forgery ? {forgeryMarks:{...state.forgeryMarks}} : {})}];
    const escaped=state.escaped+(unlocked?1:0);
    const next={...state,review,attemptLog,attempts,escaped,phase:unlocked?'unlocked':attempts===limit?'lost':'playing'};
    if(root.KunstWallEnabled){
      next.excluded=exclusions(next,pool);
      next.choices=Object.fromEntries(state.ids.map(id=>[id,Object.fromEntries(fields.map(field=>[field,isExcluded(next,id,field,state.choices[id][field])?'':state.choices[id][field]]))]));
      next.joker=state.joker ?? 1;
    }
    return {checked:true,correct,forgeryCorrect,state:next};
  }
  function restore(saved, pool) {
    const fields=fieldsFor(saved);
    if (!saved || saved.version !== 1 || !['playing','unlocked','lost'].includes(saved.phase) || !Number.isInteger(saved.escaped) || saved.escaped < 0 || !Number.isInteger(saved.attempts) || saved.attempts < 0 || saved.attempts > limit || !Array.isArray(saved.ids) || saved.ids.length !== count || !Array.isArray(saved.recent) || (saved.choices && (typeof saved.choices !== 'object' || Array.isArray(saved.choices)))) return null;
    if (saved.forgery && (!saved.ids.includes(saved.forgery.id) || typeof saved.forgery.image !== 'string' || saved.forgery.image.length > 1800030 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(saved.forgery.image))) return null;
    if (saved.forgeryMarks && (typeof saved.forgeryMarks !== 'object' || Array.isArray(saved.forgeryMarks) || Object.entries(saved.forgeryMarks).some(([id,value]) => !saved.ids.includes(id) || typeof value !== 'boolean'))) return null;
    if(saved.joker!==undefined && ![0,1].includes(saved.joker))return null;
    if(saved.jokerUsed!==undefined && (!Array.isArray(saved.jokerUsed) || saved.jokerUsed.length>1 || saved.jokerUsed.some(id=>!saved.ids.includes(id))))return null;
    if (saved.phase === 'unlocked' && saved.ids.some(id => Boolean(saved.forgeryMarks?.[id]) !== (saved.forgery?.id === id))) return null;
    const works = saved.ids.map(id => pool.find(work => work.id === id));
    if (works.some(work => !validWork(work))) return null;
    for (let i = 0; i < works.length; i++) if (!compatible(works.slice(0, i), works[i],fields)) return null;
    for (const field of fields) {
      const options = saved.options?.[field];
      if (!Array.isArray(options) || options.length !== count || (!(root.KunstWallEnabled&&field==='technique')&&new Set(options).size !== count) || !validValues(options,works.map(work=>work[field]))) return null;
      const values = saved.ids.map(id => saved.choices?.[id]?.[field]).filter(Boolean);
      if (!validValues(options,values)) return null;
    }
    if ((saved.phase === 'playing' && saved.attempts >= limit) || (saved.phase === 'lost' && saved.attempts !== limit)) return null;
    if (saved.phase === 'unlocked' && (saved.attempts < 1 || saved.escaped < 1 || filled(saved) !== count*fields.length || works.some(work => fields.some(field => saved.choices[work.id][field] !== work[field])))) return null;
    let review = null;
    if (saved.attempts > 0) {
      // Older saved rounds did not retain a review snapshot. Their current
      // complete assignment can still be marked without resetting an attempt.
      const choices = saved.review?.choices || saved.choices;
      const complete = saved.ids.every(id => fields.every(field => saved.options[field].includes(choices?.[id]?.[field])));
      const unique = fields.every(field => validValues(saved.options[field],saved.ids.map(id=>choices?.[id]?.[field])));
      if (complete && unique) review = {choices:Object.fromEntries(saved.ids.map(id => [id,{...choices[id]}]))};
    }
    // History is optional for version-1 saves. Never invent a first attempt from
    // an older save's final choices. Invalid history is discarded, not the game.
    const validSnapshot = choices => saved.ids.every(id => fields.every(field => saved.options[field].includes(choices?.[id]?.[field]))) && fields.every(field => validValues(saved.options[field],saved.ids.map(id=>choices?.[id]?.[field])));
    let attemptLog = saved.attemptLog;
    if (attemptLog !== undefined) {
      if (!Array.isArray(attemptLog) || attemptLog.length > saved.attempts || attemptLog.some((entry,index) => !Number.isInteger(entry?.attempt) || entry.attempt < 1 || entry.attempt > saved.attempts || (index > 0 && entry.attempt <= attemptLog[index-1].attempt) || !validSnapshot(entry.choices))) attemptLog = [];
      else attemptLog = attemptLog.map(entry => ({attempt:entry.attempt,choices:Object.fromEntries(saved.ids.map(id => [id,{...entry.choices[id]}])), ...(entry.forgeryMarks && typeof entry.forgeryMarks === 'object' && !Array.isArray(entry.forgeryMarks) && Object.entries(entry.forgeryMarks).every(([id,value])=>saved.ids.includes(id)&&typeof value==='boolean') ? {forgeryMarks:{...entry.forgeryMarks}} : {})}));
      const last = attemptLog.at(-1);
      if (last?.attempt === saved.attempts && review && saved.ids.some(id => fields.some(field => last.choices[id][field] !== review.choices[id][field]))) attemptLog = [];
    }
    const restored={...saved, choices: saved.choices || {}, review, ...(attemptLog === undefined ? {} : {attemptLog})};
    if(root.KunstWallEnabled){
      restored.jokerUsed=saved.jokerUsed || [];restored.joker=restored.jokerUsed.length?0:1;
      restored.excluded=exclusions(restored,pool);
      restored.choices=Object.fromEntries(saved.ids.map(id=>[id,Object.fromEntries(fields.map(field=>[field,isExcluded(restored,id,field,restored.choices[id]?.[field])?'':restored.choices[id]?.[field] || '']))]));
    }
    return restored;
  }
  function restoreUpdated(saved, pool, replacements = []) {
    const current = restore(saved,pool);
    if (current) return {state:current,updated:false,newRoom:false};
    const applicable = replacements.filter(entry => saved?.ids?.includes(entry.previous?.id) && pool.some(work => work.id === entry.id));
    if (!applicable.length) return {state:null,updated:false,newRoom:false};
    // Validate the old round against its actual historical answers before migrating it.
    const original = restore(saved,[...pool,...applicable.map(entry=>entry.previous)]);
    if (!original) return {state:null,updated:false,newRoom:false};
    const fields=fieldsFor(original);
    const idOf = id => applicable.find(entry=>entry.previous.id===id)?.id || id;
    const valueOf = (field,value) => {
      const replacement = applicable.find(entry=>entry.previous[field]===value);
      return replacement ? pool.find(work=>work.id===replacement.id)[field] : value;
    };
    const selections = choices => Object.fromEntries(Object.entries(choices || {}).map(([id,selection]) => [idOf(id),Object.fromEntries(Object.entries(selection).map(([field,value])=>[field,valueOf(field,value)]))]));
    const migrated = {...original,ids:original.ids.map(idOf),recent:original.recent.map(idOf),
      options:Object.fromEntries(fields.map(field=>[field,original.options[field].map(value=>valueOf(field,value))])),
      choices:selections(original.choices),review:original.review ? {choices:selections(original.review.choices)} : null,
      ...(original.jokerUsed ? {jokerUsed:original.jokerUsed.map(idOf)} : {}),
      ...(original.attemptLog ? {attemptLog:original.attemptLog.map(entry=>({...entry,choices:selections(entry.choices)}))} : {})};
    const restored = restore(migrated,pool);
    if (restored) return {state:restored,updated:true,newRoom:false};
    // A new date might duplicate a neighbour's answer. Use a fair, unique replacement
    // room instead: retain escaped rooms, and do not charge attempts for new questions.
    const next = newState(pool,original);
    if (original.phase === 'lost') { next.phase='lost'; next.attempts=limit; }
    return {state:next,updated:true,newRoom:true};
  }
  const api = {forgeryPlan,nextForgeryCooldown,fields,fieldsFor, shuffle, compatible, validWork, isIntroImage, canDownload, galleryTitle, heroSelection, introSelection, room, newState, choose, transferChoice, isExcluded, exclusions, useJoker, capacity, remaining, takenBy, review, filled, inspect, restore, restoreUpdated};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstTresor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
