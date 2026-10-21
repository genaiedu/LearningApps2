(function(root) {
  'use strict';
  const UNLOCK=20, MIN=6, MAX=10, DEFAULT=8;
  const modes=['both','style','technique','none','custom'];
  const fields=['date','style','artist','technique'];
  const text=(value,max)=>typeof value==='string' && value.length<=max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
  function fresh() { return {version:1,liked:[],film:{name:'Meine Galerie',motto:'Kunst bleibt, wenn wir genauer hinsehen.',items:[]}}; }
  function winningRoom(state,pool) {
    const count=state?.ids?.length,limit=count===7?3:2,fields=['date','style','artist','technique',...(state?.options?.title?['title']:[])];
    return state?.phase==='unlocked' && /^[a-f0-9]{32}$/.test(state.historyToken||state.roomToken) && Number.isInteger(state.attempts) && state.attempts>=1 && state.attempts<=limit
      && [4,7].includes(count) && new Set(state.ids).size===count && state.ids.every(id=>{
        const work=pool.find(w=>w.id===id);return work && fields.every(field=>state.choices?.[id]?.[field]===work[field]);
      });
  }
  function restore(raw,pool,history) {
    if(!raw || raw.version!==1 || !Array.isArray(raw.liked) || raw.liked.length>pool.length || !raw.film) return null;
    const seen=new Set(), liked=[];
    for(const entry of raw.liked) {
      if(entry?.source==='curated') {
        if(!pool.some(w=>w.id===entry.id)||seen.has(entry.id)||!Number.isSafeInteger(entry.at)||entry.at<0||entry.at>Date.now()+300000)return null;
        seen.add(entry.id);liked.push({id:entry.id,source:'curated',at:entry.at});continue;
      }
      const room=history.rooms.find(r=>r.id===entry?.room), index=room?.ids.indexOf(entry?.id);
      if(!entry || !pool.some(w=>w.id===entry.id) || seen.has(entry.id) || !Number.isSafeInteger(entry.at) || entry.at<0 || entry.at>Date.now()+300000
        || !room || index<0 || !(room.seen&(1<<index)) || !room.checks.at(-1)?.every(mask=>mask===(room.fieldCount===5?31:15))) return null;
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
  const viewFields=['artist','style','technique'];
  const dateCore=root.KunstTresor||(typeof require==='function'?require('./kunsttresor-core.js'):null);
  const collator=new Intl.Collator('de',{sensitivity:'base',numeric:true});
  const artistOrder=root.KunstArtistOrder||(typeof require==='function'?require('./kunsttresor-artist-order.js'):null);
  const compareArtists=(left,right)=>artistOrder?artistOrder.compare(left,right):collator.compare(left,right);
  function viewYear(work){
    if(Number.isFinite(work.dateStart))return work.dateStart;
    const period=dateCore?.dateWindow(work.date);
    return Number.isFinite(period?.start)?period.start:Number.isFinite(period?.end)?period.end:null;
  }
  const searchable=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss');
  function matchesView(work,view,except) {
    if(view.onlyFilm&&(!Array.isArray(view.filmIds)||!view.filmIds.includes(work.id)))return false;
    if(viewFields.some(field=>field!==except&&view[field]&&work[field]!==view[field]))return false;
    const words=searchable(view.search).trim().split(/\s+/).filter(Boolean);
    const haystack=searchable([work.titleDe,work.title,work.artist,work.style,work.technique,work.date].join(' '));
    return words.every(word=>haystack.includes(word));
  }
  function viewWorks(works,view={}) {
    const result=works.filter(work=>matchesView(work,view));
    if(!view.sort||view.sort==='collection')return result;
    const title=work=>work.titleDe||work.title;
    const compare=(a,b)=>collator.compare(a,b);
    const secondary=(a,b)=>compare(title(a),title(b))||compare(a.artist,b.artist)||compare(a.id,b.id);
    if(viewFields.includes(view.sort))result.sort((a,b)=>(view.sort==='artist'?compareArtists(a.artist,b.artist):compare(a[view.sort],b[view.sort]))||secondary(a,b));
    else if(view.sort==='title')result.sort(secondary);
    else if(['date-asc','date-desc'].includes(view.sort))result.sort((a,b)=>{
      const left=viewYear(a),right=viewYear(b);
      return left===null?right===null?secondary(a,b):1:right===null?-1:(view.sort==='date-desc'?-1:1)*(left-right)||secondary(a,b);
    });
    return result;
  }
  function viewFacets(works,view={},field) {
    if(!viewFields.includes(field))return [];
    const counts=new Map(works.map(work=>[work[field],0]));
    for(const work of works)if(matchesView(work,view,field))counts.set(work[field],counts.get(work[field])+1);
    return [...counts].sort((a,b)=>field==='artist'?compareArtists(a[0],b[0]):collator.compare(a[0],b[0])).map(([value,count])=>({value,count}));
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
    if(gallery.film.items.some(i=>i.caption==='custom'&&!cleanCaption(i.text).trim()))throw Error('Trage deine eigenen Einblendungen ein oder wähle eine andere Textart.');
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
  function cleanCaption(value){
    // Editorial labels are not part of the film essay. Keep ordinary content,
    // including meaningful numbers such as “2. Weltkrieg”, exactly as written.
    let result=value;
    for(let i=0;i<3;i++)result=result.replace(/^\s*(?:(?:KI[\s-]*)?(?:Text(?:vorschlag)?|Vorschl(?:ag)?\.?|Variante|Entwurf|Einblendung|Bildtext|Caption)|Motto)\s*(?:(?:Nr\.?\s*)?\d{1,2})?\s*[:：]\s*/i,'');
    return result;
  }
  function caption(work,item,texts) {
    if(item.caption==='none')return '';
    if(item.caption==='custom')return cleanCaption(item.text);
    const style=texts?.styles?.[work.style]?.[item.variant]||work.style;
    const technique=texts?.techniques?.[work.technique]?.[item.variant]||work.technique;
    return item.caption==='style'?style:item.caption==='technique'?technique:style+'\n'+technique;
  }
  const api={UNLOCK,MIN,MAX,DEFAULT,modes,fresh,winningRoom,restore,like,remove,removeFromFilm,viewWorks,viewFacets,merge,item,automatic,validateFilm,timeline,frameAt,cleanCaption,caption};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KunstGallery=api;
})(typeof globalThis!=='undefined'?globalThis:this);
