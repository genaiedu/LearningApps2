(function (root) {
  'use strict';
  const fields = ['date', 'style', 'artist', 'technique'];
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function compatible(works, candidate) {
    return !works.some(work => work.id === candidate.id || fields.some(field => work[field] === candidate[field]));
  }
  function introSelection(pool, landmarkIds, recent = [], random = Math.random) {
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
  function galleryTitle(work) { return work.galleryTitle || work.title; }
  function validWork(work) {
    return Boolean(work && work.id && work.title && work.imageId && work.source && work.medium && work.styleOriginal && work.publicDomain === true && work.artistDeath <= 1955 && fields.every(field => typeof work[field] === 'string' && work[field].trim()));
  }
  function canDownload(work) {
    if (!work?.imageDownloadAllowed || !/public domain|cc0|cc-zero/i.test(work.imageLicense || '')) return false;
    try { const url=new URL(work.imageOriginalURL); return url.protocol==='https:' && url.hostname==='upload.wikimedia.org'; } catch { return false; }
  }
  function room(pool, recent = [], random = Math.random) {
    const eligible = pool.filter(validWork);
    function find(candidates) {
      let visits = 0;
      function search(chosen, from) {
        if (chosen.length === 4) return chosen;
        if (++visits > 15000) return null;
        for (let i = from; i < candidates.length; i++) {
          if (!compatible(chosen, candidates[i])) continue;
          const result = search([...chosen, candidates[i]], i + 1);
          if (result) return result;
        }
        return null;
      }
      return search([], 0);
    }
    let selected = null;
    // If a rare style/technique combination exhausts the fresh pool, release
    // the oldest room first instead of immediately repeating recent works.
    for (let keep = recent.length; keep >= 0 && !selected; keep = Math.max(0,keep - 4)) {
      const blocked = keep ? recent.slice(-keep) : [];
      selected = find(shuffle(eligible.filter(work => !blocked.includes(work.id)),random));
      if (keep === 0) break;
    }
    if (!selected) throw new Error('Es gibt nicht genug eindeutig zuordenbare Werke für einen Raum.');
    return { works: shuffle(selected, random), options: Object.fromEntries(fields.map(field => [field, shuffle(selected.map(work => work[field]), random)])) };
  }
  function newState(pool, previous = null, random = Math.random) {
    const recent = previous ? [...previous.recent, ...previous.ids].slice(-24) : [];
    const next = room(pool, recent, random);
    return {version: 1, ids: next.works.map(work => work.id), options: next.options, choices: {}, attempts: 0, escaped: previous?.escaped || 0, phase: 'playing', recent};
  }
  function choose(state, workId, field, value) {
    if (state.phase !== 'playing' || !state.ids.includes(workId) || !fields.includes(field) || (value && !state.options[field].includes(value))) return state;
    if (takenBy(state,workId,field,value)) return state;
    const choices = Object.fromEntries(Object.entries(state.choices).map(([id, selection]) => [id, {...selection}]));
    choices[workId] = {...choices[workId], [field]: value};
    return {...state, choices};
  }
  function takenBy(state, workId, field, value) {
    return value ? state.ids.find(id => id !== workId && state.choices[id]?.[field] === value) || null : null;
  }
  function review(state, pool) {
    if (!state.review?.choices || state.attempts < 1) return [];
    const byId = new Map(pool.map(work => [work.id,work]));
    return state.ids.flatMap(id => fields.map(field => {
      const value = state.review.choices[id]?.[field];
      return {id,field,value,correct:value === byId.get(id)?.[field],changed:value !== (state.choices[id]?.[field] || '')};
    }));
  }
  function filled(state) { return state.ids.reduce((sum,id) => sum + fields.filter(field => Boolean(state.choices?.[id]?.[field])).length, 0); }
  function inspect(state, pool) {
    if (state.phase !== 'playing' || state.attempts >= 2) return {state, checked: false};
    if (filled(state) !== 16) return {state, checked: false, incomplete: true};
    const byId = new Map(pool.map(work => [work.id, work]));
    const correct = state.ids.reduce((sum, id) => sum + fields.filter(field => state.choices[id][field] === byId.get(id)?.[field]).length, 0);
    const attempts = state.attempts + 1;
    const unlocked = correct === 16;
    const review = {choices:Object.fromEntries(state.ids.map(id => [id,{...state.choices[id]}]))};
    return {checked: true, correct, state: {...state, review, attempts, escaped: state.escaped + (unlocked ? 1 : 0), phase: unlocked ? 'unlocked' : attempts === 2 ? 'lost' : 'playing'}};
  }
  function restore(saved, pool) {
    if (!saved || saved.version !== 1 || !['playing','unlocked','lost'].includes(saved.phase) || !Number.isInteger(saved.escaped) || saved.escaped < 0 || !Number.isInteger(saved.attempts) || saved.attempts < 0 || saved.attempts > 2 || !Array.isArray(saved.ids) || saved.ids.length !== 4 || !Array.isArray(saved.recent) || (saved.choices && (typeof saved.choices !== 'object' || Array.isArray(saved.choices)))) return null;
    const works = saved.ids.map(id => pool.find(work => work.id === id));
    if (works.some(work => !validWork(work))) return null;
    for (let i = 0; i < works.length; i++) if (!compatible(works.slice(0, i), works[i])) return null;
    for (const field of fields) {
      const options = saved.options?.[field];
      if (!Array.isArray(options) || options.length !== 4 || new Set(options).size !== 4 || !works.every(work => options.includes(work[field]))) return null;
      const values = saved.ids.map(id => saved.choices?.[id]?.[field]).filter(Boolean);
      if (new Set(values).size !== values.length || values.some(value => !options.includes(value))) return null;
    }
    if ((saved.phase === 'playing' && saved.attempts > 1) || (saved.phase === 'lost' && saved.attempts !== 2)) return null;
    if (saved.phase === 'unlocked' && (saved.attempts < 1 || saved.escaped < 1 || filled(saved) !== 16 || works.some(work => fields.some(field => saved.choices[work.id][field] !== work[field])))) return null;
    let review = null;
    if (saved.attempts > 0) {
      // Older saved rounds did not retain a review snapshot. Their current
      // complete assignment can still be marked without resetting an attempt.
      const choices = saved.review?.choices || saved.choices;
      const complete = saved.ids.every(id => fields.every(field => saved.options[field].includes(choices?.[id]?.[field])));
      const unique = fields.every(field => new Set(saved.ids.map(id => choices?.[id]?.[field])).size === 4);
      if (complete && unique) review = {choices:Object.fromEntries(saved.ids.map(id => [id,{...choices[id]}]))};
    }
    return {...saved, choices: saved.choices || {}, review};
  }
  const api = {fields, shuffle, compatible, validWork, canDownload, galleryTitle, introSelection, room, newState, choose, takenBy, review, filled, inspect, restore};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstTresor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
