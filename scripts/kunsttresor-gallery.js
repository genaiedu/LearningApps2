(function(root) {
  'use strict';
  const UNLOCK=20, MIN=6, MAX=10, DEFAULT=8;
  const modes=['both','style','technique','none','custom'];
  const fields=['date','style','artist','technique'];
  const text=(value,max)=>typeof value==='string' && value.length<=max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
  function fresh() { return {version:1,liked:[],film:{name:'Meine Galerie',motto:'Kunst bleibt, wenn wir genauer hinsehen.',items:[]}}; }
  function winningRoom(state,pool) {
    return state?.phase==='unlocked' && /^[a-f0-9]{32}$/.test(state.historyToken||state.roomToken) && [1,2].includes(state.attempts)
      && state.ids?.length===4 && new Set(state.ids).size===4 && state.ids.every(id=>{
        const work=pool.find(w=>w.id===id);return work && fields.every(field=>state.choices?.[id]?.[field]===work[field]);
      });
  }
  function restore(raw,pool,history) {
    if(!raw || raw.version!==1 || !Array.isArray(raw.liked) || raw.liked.length>pool.length || !raw.film) return null;
    const seen=new Set(), liked=[];
    for(const entry of raw.liked) {
      const room=history.rooms.find(r=>r.id===entry?.room), index=room?.ids.indexOf(entry?.id);
      if(!entry || !pool.some(w=>w.id===entry.id) || seen.has(entry.id) || !Number.isSafeInteger(entry.at) || entry.at<0 || entry.at>Date.now()+300000
        || !room || index<0 || !(room.seen&(1<<index)) || !room.checks.at(-1)?.every(mask=>mask===15)) return null;
      seen.add(entry.id);liked.push({id:entry.id,room:entry.room,at:entry.at});
    }
    const f=raw.film;
    if(!text(f.name,80) || !f.name.trim() || !text(f.motto,180) || !Array.isArray(f.items) || f.items.length>MAX) return null;
    const ids=new Set(), items=[];
    for(const item of f.items) {
      if(!item || !seen.has(item.id) || ids.has(item.id) || !modes.includes(item.caption) || !text(item.text,240) || ![0,1].includes(item.variant)) return null;
      ids.add(item.id);items.push({id:item.id,caption:item.caption,text:item.text,variant:item.variant});
    }
    return {version:1,liked,film:{name:f.name,motto:f.motto,items}};
  }
  function like(gallery,id,state,pool,at=Date.now()) {
    if(!winningRoom(state,pool) || !state.ids.includes(id)) throw Error('Neue Lieblingswerke kannst du erst nach einem vollständig gewonnenen Raum sammeln.');
    if(gallery.liked.some(entry=>entry.id===id)) return gallery;
    return {...gallery,liked:[...gallery.liked,{id,room:state.historyToken||state.roomToken,at}]};
  }
  function remove(gallery,id) {
    return {...gallery,liked:gallery.liked.filter(entry=>entry.id!==id),film:{...gallery.film,items:gallery.film.items.filter(item=>item.id!==id)}};
  }
  function removeFromFilm(gallery,id) {
    return {...gallery,film:{...gallery.film,items:gallery.film.items.filter(item=>item.id!==id)}};
  }
  function merge(left,right) {
    const liked=new Map(left.liked.map(entry=>[entry.id,entry]));
    right.liked.forEach(entry=>{if(!liked.has(entry.id))liked.set(entry.id,entry);});
    return {version:1,liked:[...liked.values()],film:structuredClone(right.film)};
  }
  const item=id=>({id,caption:'both',text:'',variant:0});
  function automatic(gallery,random=Math.random) {
    if(gallery.liked.length<UNLOCK) throw Error('Der Kunstfilm wird ab 20 Lieblingswerken freigeschaltet.');
    const candidates=gallery.liked.map(entry=>entry.id);
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    return {...gallery,film:{...gallery.film,items:candidates.slice(0,DEFAULT).map(item)}};
  }
  function validateFilm(gallery) {
    if(gallery.liked.length<UNLOCK) throw Error('Für deinen Kunstfilm fehlen noch '+(UNLOCK-gallery.liked.length)+' Lieblingswerke.');
    if(gallery.film.items.length<MIN || gallery.film.items.length>MAX) throw Error('Wähle 6 bis 10 Werke für deinen Film.');
    if(gallery.film.items.some(i=>!gallery.liked.some(l=>l.id===i.id)))throw Error('Im Film sind nur gelikte Kunstwerke erlaubt.');
    if(gallery.film.items.some(i=>i.caption==='custom'&&!i.text.trim()))throw Error('Trage deine eigenen Einblendungen ein oder wähle eine andere Textart.');
    if(!gallery.film.name.trim())throw Error('Gib deiner Galerie einen Namen.');
    return true;
  }
  function timeline(items,duration) {
    if(items.length<MIN || items.length>MAX || !Number.isFinite(duration) || duration<60 || duration>600)throw Error('Ungeeignete Filmlänge.');
    const opening=6, ending=8, body=duration-opening-ending;
    const detail=body*.6/items.length, full=body*.4/items.length;
    let at=0;
    const frames=[{phase:'opening',start:0,end:opening}];at=opening;
    for(const entry of items){frames.push({phase:'detail',id:entry.id,start:at,end:at+detail});at+=detail;}
    for(const entry of items){frames.push({phase:'full',id:entry.id,start:at,end:at+full});at+=full;}
    frames.push({phase:'ending',start:duration-ending,end:duration});
    return frames;
  }
  function frameAt(frames,time) {return frames.find(frame=>time>=frame.start&&time<frame.end)||frames.at(-1);}
  function caption(work,item,texts) {
    if(item.caption==='none')return '';
    if(item.caption==='custom')return item.text;
    const style=texts?.styles?.[work.style]?.[item.variant]||work.style;
    const technique=texts?.techniques?.[work.technique]?.[item.variant]||work.technique;
    return item.caption==='style'?style:item.caption==='technique'?technique:style+'\n'+technique;
  }
  const api={UNLOCK,MIN,MAX,DEFAULT,modes,fresh,winningRoom,restore,like,remove,removeFromFilm,merge,item,automatic,validateFilm,timeline,frameAt,caption};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KunstGallery=api;
})(typeof globalThis!=='undefined'?globalThis:this);
