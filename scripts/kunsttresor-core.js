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
    const anonymousGoldhelm = work.id === 'wd-Q1195610' && work.artist === 'Unbekannter Künstler'
      && work.attribution === 'unknown' && work.artistDeath === null && work.dateStart === 1650 && work.dateEnd === 1660
      && work.rightsBasis === 'Reviewed anonymous 17th-century painting; museum attribution and PD image'
      && work.catalogueSource === 'https://search.smb.museum/object/obj-865524';
    return Boolean(work.id && work.title && work.imageId && work.source && work.medium && work.styleOriginal && work.publicDomain === true && (named || anonymousAncient || anonymousGoldhelm) && fields.every(field => typeof work[field] === 'string' && work[field].trim()));
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
  function room(pool, recent = [], random = Math.random, requireForgeryTarget = false, encounters) {
    const eligible = pool.filter(validWork);
    const visitsOf=work=>Number.isSafeInteger(encounters?.[work.id])&&encounters[work.id]>0?encounters[work.id]:0;
    const least=encounters?Math.min(...eligible.map(visitsOf)):0;
    const fresh=new Set(eligible.filter(work=>visitsOf(work)===least).map(work=>work.id));
    const artistKey = work => work.artistIdentity || work.artist;
    function freshCapacity(candidates,slots=count,techniqueCap=count,chosen=[]) {
      // A distinct-value count alone misses correlations: e.g. five styles all
      // belonging to the same artist. Small bipartite matchings give safe upper
      // bounds without exploring thousands of impossible seven-work rooms.
      let upper=Math.min(slots,candidates.length);
      for(const field of ['artist','date','title','technique']){
        if(field==='title'&&!root.KunstWallEnabled)continue;
        const graph=new Map(),owners=new Map();
        for(const work of candidates){
          if(!graph.has(work.style))graph.set(work.style,new Set());
          if(field==='technique'){
            const used=chosen.filter(other=>other.technique===work.technique).length,capacity=root.KunstWallEnabled?techniqueCap-used:1;
            for(let i=0;i<capacity;i++)graph.get(work.style).add(work.technique+'\u0000'+i);
          }else graph.get(work.style).add(field==='artist'?artistKey(work):field==='title'?galleryTitle(work):work[field]);
        }
        function match(style,visited){for(const value of graph.get(style)){if(visited.has(value))continue;visited.add(value);if(!owners.has(value)||match(owners.get(value),visited)){owners.set(value,style);return true;}}return false;}
        let size=0;for(const style of graph.keys()){if(match(style,new Set()))size++;if(size>=upper)break;}
        upper=Math.min(upper,size);if(!upper)break;
      }
      return upper;
    }
    function find(candidates,minimumFresh=0,techniqueCap=3) {
      let visits = 0;
      const visitLimit=encounters?120:15000;
      const remainingFresh=Array(candidates.length+1).fill(0);
      for(let i=candidates.length-1;i>=0;i--)remainingFresh[i]=remainingFresh[i+1]+Number(fresh.has(candidates[i].id));
      function search(chosen, from,usedFresh=0) {
        if(usedFresh+Math.min(count-chosen.length,remainingFresh[from])<minimumFresh)return null;
        if (chosen.length === count) return usedFresh>=minimumFresh&&(!requireForgeryTarget || chosen.some(isIntroImage)) ? chosen : null;
        if (++visits > visitLimit) return null;
        if(minimumFresh>usedFresh){
          const available=candidates.slice(from).filter(work=>fresh.has(work.id)&&compatible(chosen,work));
          if(usedFresh+freshCapacity(available,count-chosen.length,techniqueCap,chosen)<minimumFresh)return null;
        }
        for (let i = from; i < candidates.length; i++) {
          if(visits>visitLimit)return null;
          if (!compatible(chosen, candidates[i])) continue;
          const isFresh=fresh.has(candidates[i].id);
          if(!isFresh&&count-chosen.length===minimumFresh-usedFresh)continue;
          // Keep a seven-work wall varied while allowing repeated techniques.
          if(root.KunstWallEnabled&&chosen.filter(work=>work.technique===candidates[i].technique).length>=techniqueCap)continue;
          const result = search([...chosen, candidates[i]], i + 1,usedFresh+Number(isFresh));
          if (result) return result;
        }
        return null;
      }
      return search([], 0);
    }
    let selected = null;
    const byId = new Map(eligible.map(work => [work.id,work]));
    let maximumFresh=0,variedFresh=0;
    if(encounters){
      const unused=eligible.filter(work=>fresh.has(work.id)),techniques=new Map();
      for(const work of unused)techniques.set(work.technique,(techniques.get(work.technique)||0)+1);
      variedFresh=[...techniques.values()].reduce((n,total)=>n+Math.min(root.KunstWallEnabled?3:1,total),0);
      maximumFresh=Math.min(freshCapacity(unused),root.KunstWallEnabled?count:variedFresh);
      if(requireForgeryTarget&&!unused.some(isIntroImage))maximumFresh=Math.min(maximumFresh,count-1);
    }
    // First avoid all artists from the last six rooms, releasing the oldest
    // room only if four distinct answer sets cannot otherwise be assembled.
    // Fall back to work-only exclusions for small or constrained archives.
    // First maximise the least-seen tier, releasing recent-artist preferences
    // before repeating pictures. At the end of a constrained tier, add only the
    // fillers needed for an unambiguous room. Counts come from loaded quiz images
    // across all rounds and survive restart/import via the existing history.
    for(let minimumFresh=maximumFresh;minimumFresh>=0&&!selected;minimumFresh--)for(const techniqueCap of encounters&&root.KunstWallEnabled?[3,count]:[3])for (const avoidArtists of [true,false]) {
      if(selected)break;
      // Technique variety is a preference, never a reason to repeat a picture.
      if(encounters&&techniqueCap===3&&minimumFresh>variedFresh)continue;
      for (let keep = recent.length; keep >= 0 && !selected; keep = Math.max(0,keep - count)) {
        const blocked = keep ? recent.slice(-keep) : [];
        const artists = new Set(blocked.map(id=>byId.get(id)).filter(Boolean).map(artistKey));
        const candidates=shuffle(eligible.filter(work => !blocked.includes(work.id) && (!avoidArtists || !artists.has(artistKey(work)))),random);
        if(encounters)candidates.sort((a,b)=>visitsOf(a)-visitsOf(b));
        selected = find(candidates,minimumFresh,techniqueCap);
        if (keep === 0) break;
      }
      if(selected) break;
    }
    if (!selected) throw new Error('Es gibt nicht genug eindeutig zuordenbare Werke für einen Raum.');
    return { works: shuffle(selected, random), options: Object.fromEntries(fields.map(field => [field, shuffle(selected.map(work => work[field]), random)])) };
  }
  function newState(pool, previous = null, random = Math.random, requireForgeryTarget = false,encounters) {
    const recent = previous ? [...previous.recent, ...previous.ids].slice(-count*6) : [];
    const next = room(pool, recent, random, requireForgeryTarget,encounters);
    return {version: 1, ids: next.works.map(work => work.id), options: next.options, choices: {}, attemptLog: [], attempts: 0, escaped: previous?.escaped || 0, phase: 'playing', recent,
      ...(root.KunstWallEnabled ? {joker:1,jokerUsed:[],excluded:{},locked:{},dateHints:{}} : {}),
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
    if (isLocked(state,workId,field) || isExcluded(state,workId,field,value) || takenBy(state,workId,field,value)) return state;
    const choices = Object.fromEntries(Object.entries(state.choices).map(([id, selection]) => [id, {...selection}]));
    choices[workId] = {...choices[workId], [field]: value};
    return {...state, choices};
  }
  function capacity(state,field,value){return (state.options[field]||[]).filter(v=>v===value).length;}
  function isLocked(state,id,field){return Boolean(root.KunstWallEnabled && state.locked?.[id]?.[field]);}
  function confirmedOwners(state,id,field,value) {
    if(!root.KunstWallEnabled || !value || state.locked?.[id]?.[field]===value)return [];
    const owners=state.ids.filter(other=>other!==id && state.locked?.[other]?.[field]===value);
    return owners.length>=capacity(state,field,value)?owners:[];
  }
  function isExcluded(state,id,field,value){return Boolean(value && (state.excluded?.[id]?.[field]?.includes(value) || confirmedOwners(state,id,field,value).length));}
  function checkedSnapshots(state){return [...(state.attemptLog||[]),...(state.review?[state.review]:[])];}
  // Compare the displayed catalogue period, not an invented tolerance around
  // "um/ca.". Later casts, prints, frames and reworkings are separate dates.
  function dateWindow(value) {
    if(typeof value!=='string')return null;
    let text=value.split(/[;,]|\s*\(/)[0].trim(),approx=/\b(?:um|ca\.?|circa|around)\s/i.test(text);
    const bce=/v\.\s*Chr\.|BCE|B\.C\./i.test(text);
    const exactDay=/\b\d{1,2}\.\s*[A-Za-zÄÖÜäöü]+\s+\d{3,4}\b/.test(text),partialYear=/\b(?:early|late|spring|summer|autumn|winter|Anfang|Ende|Frühjahr|Sommer|Herbst|Winter)\b/i.test(text);
    if(exactDay){const year=Number(text.match(/\b\d{3,4}\b/)?.[0]);return year?{start:year,end:year,precision:3,approx:false}:null;}
    const after=/^(?:after|nach)\s+(\d{1,4})\b/i.exec(text),before=/^(?:before|vor)\s+(\d{1,4})\b/i.exec(text);
    if(after)return {start:(bce?-1:1)*Number(after[1])+1,end:Infinity,precision:0,approx};
    if(before)return {start:-Infinity,end:(bce?-1:1)*Number(before[1])-1,precision:0,approx};
    const decade=/\b(\d{3,4})s\b/.exec(text);
    if(decade)return {start:Number(decade[1]),end:Number(decade[1])+9,precision:0,approx};
    text=text.replace(/\b(?:um|ca\.?|circa|around|Modell|model|early|late)\s*/gi,'').trim();
    const range=/^(\d{1,4})\s*[–—/\-]\s*(\d{1,4})\b/.exec(text),single=/^(\d{1,4})(?:\s|$|\.)/.exec(text);
    if(!range&&!single)return null;
    let start=Number((range||single)[1]),end=range?Number(range[2]):start;
    if(!start||!end&&!range)return null;
    if(range&&range[2].length<range[1].length){const base=10**range[2].length;end=Math.floor(start/base)*base+end;if(!bce&&end<start)end+=base;}
    if(bce){start=-start;end=-end;}
    return {start:Math.min(start,end),end:Math.max(start,end),precision:range?0:approx?1:partialYear?3:2,approx};
  }
  function dateHint(value,actual) {
    if(value===actual)return null;
    const chosen=dateWindow(value),correct=dateWindow(actual);
    if(!chosen||!correct)return null;
    let kind,label;
    if(chosen.end<correct.start){kind='early';label='zu früh';}
    else if(chosen.start>correct.end){kind='late';label='zu spät';}
    else if(chosen.start>=correct.start&&chosen.end<=correct.end&&(chosen.start>correct.start||chosen.end<correct.end||chosen.precision>correct.precision||!chosen.approx&&correct.approx)){kind='precise';label='zu genau';}
    else if(chosen.start<=correct.start&&chosen.end>=correct.end&&(chosen.start<correct.start||chosen.end>correct.end||chosen.precision<correct.precision||chosen.approx&&!correct.approx)){kind='broad';label='zu ungenau';}
    else {kind='overlap';label=chosen.start===correct.start&&chosen.end===correct.end?'Datierung anders angegeben':'Zeitspannen überlappen';}
    return {value,kind,label,...(kind==='early'?{cutoff:chosen.end}:kind==='late'?{cutoff:chosen.start}:{})};
  }
  function dateFeedback(state,pool) {
    const byId=new Map(pool.map(work=>[work.id,work])),result={};
    for(const snapshot of checkedSnapshots(state))for(const id of state.ids){
      const value=snapshot.choices?.[id]?.date,work=byId.get(id);
      if(!value||!work||!state.options.date.includes(value)||value===work.date)continue;
      const hint=dateHint(value,work.date);
      if(hint){result[id] ||= [];if(!result[id].some(item=>item.value===value))result[id].push(hint);}
    }
    return result;
  }
  function rulesOut(hint,value) {
    const window=dateWindow(value);
    return Boolean(window && (hint.kind==='early'&&window.end<=hint.cutoff || hint.kind==='late'&&window.start>=hint.cutoff));
  }
  function dateHintFor(state,id,value) {
    const hints=state.dateHints?.[id] || [];
    return hints.find(hint=>hint.value===value) || hints.find(hint=>rulesOut(hint,value)) || null;
  }
  function confirmations(state,pool) {
    const byId=new Map(pool.map(work=>[work.id,work])),result={};
    for(const id of state.ids)for(const field of fieldsFor(state)){
      const value=byId.get(id)?.[field];
      if(value && (state.jokerUsed?.includes(id) || checkedSnapshots(state).some(snapshot=>snapshot.choices?.[id]?.[field]===value))){result[id] ||= {};result[id][field]=value;}
    }
    return result;
  }
  function exclusions(state,pool) {
    const byId=new Map(pool.map(work=>[work.id,work])),result={};
    const add=(id,field,value)=>{result[id] ||= {};result[id][field] ||= [];if(!result[id][field].includes(value))result[id][field].push(value);};
    // Keep every checked snapshot, not just the most recent feedback.
    for(const snapshot of checkedSnapshots(state))for(const id of state.ids)for(const field of fieldsFor(state)){
      const value=snapshot.choices?.[id]?.[field];
      if(value && state.options[field].includes(value) && value!==byId.get(id)?.[field]){
        add(id,field,value);
      }
    }
    for(const [id,hints]of Object.entries(dateFeedback(state,pool)))for(const value of state.options.date){
      // The real catalogue answer must remain available, also for uncertain dates.
      if(value!==byId.get(id)?.date&&hints.some(hint=>rulesOut(hint,value)))add(id,'date',value);
    }
    return result;
  }
  function applyFeedback(state,pool) {
    const next={...state,locked:confirmations(state,pool),dateHints:dateFeedback(state,pool),excluded:exclusions(state,pool)};
    // Migrate older rounds that allowed moving a previously green answer:
    // restore that confirmation and release conflicting unconfirmed choices.
    next.choices=Object.fromEntries(state.ids.map(id=>[id,Object.fromEntries(fieldsFor(state).map(field=>{
      const value=next.locked[id]?.[field] || state.choices[id]?.[field] || '';
      return [field,isExcluded(next,id,field,value)?'':value];
    }))]));
    for(const field of fieldsFor(state))for(const value of new Set(state.options[field])){
      const owners=state.ids.filter(id=>next.choices[id][field]===value),quota=capacity(state,field,value);
      // An older save may have moved a confirmed repeated technique elsewhere.
      // Reinstating it must not overfill the remaining quota.
      while(owners.length>quota){const index=owners.findIndex(id=>!isLocked(next,id,field));if(index<0)break;
        next.choices[owners[index]][field]='';owners.splice(index,1);
      }
    }
    return next;
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
    return applyFeedback({...next,joker:0,jokerUsed:[...(state.jokerUsed||[]),id],forgeryMarks:{...state.forgeryMarks,[id]:state.forgery?.id===id}},pool);
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
      next.joker=state.joker ?? 1;
      return {checked:true,correct,forgeryCorrect,state:applyFeedback(next,pool)};
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
      return applyFeedback(restored,pool);
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
  const api = {forgeryPlan,nextForgeryCooldown,fields,fieldsFor, shuffle, compatible, validWork, isIntroImage, canDownload, galleryTitle, heroSelection, introSelection, room, newState, choose, transferChoice, isLocked, confirmedOwners, isExcluded, exclusions, dateWindow, dateHint, dateHintFor, useJoker, capacity, remaining, takenBy, review, filled, inspect, restore, restoreUpdated};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KunstTresor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
