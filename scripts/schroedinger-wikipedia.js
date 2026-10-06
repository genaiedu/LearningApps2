(function(){
  'use strict';
  const $=id=>document.getElementById(id),dialog=$('consent'),reader=$('wiki-reader');
  let allowed=false,epoch=0,opener=null,articleVersion=0;
  const controllers=new Set();
  const plain=value=>{const t=document.createElement('template');t.innerHTML=String(value||'');return t.content.textContent.replace(/\s+/g,' ').trim();};
  function wikiURL(value){try{const u=new URL(value,'https://de.wikipedia.org/wiki/');if(u.protocol!=='https:'||u.username||u.password||u.port||!['de.wikipedia.org','en.wikipedia.org'].includes(u.hostname)||!u.pathname.startsWith('/wiki/'))return null;const title=decodeURIComponent(u.pathname.slice(6)).replace(/_/g,' ');if(!title.trim()||title.includes(':'))return null;return {title,language:u.hostname.slice(0,2),fragment:decodeURIComponent(u.hash.slice(1))};}catch(_){return null;}}
  function mediaURL(value,language='de'){try{const u=new URL(value,'https://'+language+'.wikipedia.org/');return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname.endsWith('.wikimedia.org')||['de.wikipedia.org','en.wikipedia.org'].includes(u.hostname))?u.href:'';}catch(_){return '';}}
  async function query(host,params){if(!allowed)throw Error('Keine Zustimmung');const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),15000);try{const u=new URL('https://'+host+'/w/api.php');u.search=new URLSearchParams({...params,format:'json',formatversion:'2',origin:'*'});const r=await fetch(u,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',mode:'cors'});if(!r.ok)throw Error('Wikimedia nicht erreichbar');return await r.json();}finally{clearTimeout(timer);controllers.delete(controller);}}
  function link(text,url){let safe;try{const u=new URL(url);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname.endsWith('.wikimedia.org')||['de.wikipedia.org','en.wikipedia.org','creativecommons.org'].includes(u.hostname)))safe=u.href;}catch(_){}const a=document.createElement(safe?'a':'span');a.textContent=text;if(safe){a.href=safe;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';}return a;}
  async function portraits(){const current=epoch;await Promise.all([...document.querySelectorAll('[data-portrait]')].map(async card=>{
    try{const data=await query('commons.wikimedia.org',{action:'query',titles:'File:'+card.dataset.portrait,prop:'imageinfo|categories',cllimit:'max',iiprop:'url|extmetadata',iiurlwidth:'380'}),page=data.query?.pages?.[0],info=page?.imageinfo?.[0],meta=info?.extmetadata;
      const license=plain(meta?.LicenseShortName?.value),artist=plain(meta?.Artist?.value),url=mediaURL(info?.thumburl||info?.url);
      if(!url||!license||!artist||page?.categories?.some(c=>/deletion|copyright violations|permission pending/i.test(c.title)))throw Error('Keine sichere Bildmetadatenbasis');
      if(!allowed||epoch!==current)return;const img=document.createElement('img');img.alt=card.querySelector('h3').textContent+' · historisches Porträt';img.referrerPolicy='no-referrer';img.decoding='async';img.onload=()=>{if(allowed&&epoch===current)card.querySelector('.portrait').replaceChildren(img);};img.onerror=()=>{if(allowed&&epoch===current)card.querySelector('.portrait').textContent='Porträt momentan nicht erreichbar.';};img.src=url;
      const credit=document.createElement('p');credit.className='portrait-credit';credit.append(document.createTextNode(artist+' · '+license+' (laut Commons) · '),link('Bildquelle und Lizenz',info.descriptionurl));card.querySelector('.portrait-credit')?.remove();card.querySelector('.portrait').after(credit);
    }catch(_){if(epoch===current&&allowed)card.querySelector('.portrait').textContent='Porträt momentan nicht verfügbar. Die Erklärung bleibt nutzbar.';}
  }));}
  function sanitize(html,language){
    const t=document.createElement('template');t.innerHTML=String(html||'');
    // Clean while still inert. Even detached img nodes can start requests and
    // retain onerror handlers after their parent was removed by sanitization.
    for(const el of t.content.querySelectorAll('*'))for(const a of [...el.attributes])if(/^on/i.test(a.name)||a.name==='style'||a.name==='srcset')el.removeAttribute(a.name);
    window.WikiMath?.prepare(t.content);
    t.content.querySelectorAll('script,style,iframe,object,embed,source,annotation-xml').forEach(el=>el.remove());
    for(const img of t.content.querySelectorAll('img'))if(!mediaURL(img.getAttribute('src'),language))img.remove();
    const body=document.createElement('div');const source=t.content.querySelector('.mw-parser-output')||t.content;body.append(...source.childNodes);
    body.querySelectorAll('script,style,link,meta,base,iframe,object,embed,form,input,button,audio,video,source,svg,canvas,template,noscript,.mw-editsection,.navbox,.metadata,.noprint').forEach(el=>el.remove());
    const tags=new Set('p div span a img figure figcaption h1 h2 h3 h4 h5 h6 ul ol li dl dt dd table thead tbody tfoot tr th td caption b strong i em small sub sup br hr blockquote pre code abbr cite q'.split(' ')),anchors=new Map();
    for(const el of [...body.querySelectorAll('*')]){
      if(window.WikiMath?.isPrepared(el))continue;
      if(!tags.has(el.localName)){el.replaceWith(...el.childNodes);continue;}const attrs=Object.fromEntries([...el.attributes].map(a=>[a.name,a.value]));[...el.attributes].forEach(a=>el.removeAttribute(a.name));
      if(attrs.id){const id='qm-wiki-anchor-'+anchors.size;anchors.set(attrs.id,id);el.id=id;}
      for(const a of ['colspan','rowspan','width','height'])if(/^\d{1,4}$/.test(attrs[a]||''))el.setAttribute(a,attrs[a]);
      if(/(?:^|\s)infobox(?:\s|$)/.test(attrs.class||''))el.className='infobox';
      if(el.localName==='img'){const url=mediaURL(attrs.src,language);if(!url){el.remove();continue;}el.src=url;el.alt=attrs.alt||'Abbildung aus Wikipedia';el.loading='lazy';el.referrerPolicy='no-referrer';}
      if(el.localName==='a'&&attrs.href){if(attrs.href.startsWith('#'))el.dataset.fragment=attrs.href.slice(1);else{const url=mediaURL(attrs.href,language);if(url){el.href=url;if(!wikiURL(url)){el.target='_blank';el.rel='noopener noreferrer';el.referrerPolicy='no-referrer';}}}}
    }
    for(const a of body.querySelectorAll('[data-fragment]')){let fragment=a.dataset.fragment;try{fragment=decodeURIComponent(fragment);}catch(_){}if(anchors.has(fragment))a.href='#'+anchors.get(fragment);delete a.dataset.fragment;}
    return {body,anchors};
  }
  async function permission(){if(allowed)return true;if(dialog.open)return false;dialog.returnValue='';dialog.showModal();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(allowed),{once:true}));}
  async function article(value){const parsed=wikiURL(value);if(!parsed||!await permission())return;const current=++articleVersion,consentEpoch=epoch;if(!reader.open)opener=document.activeElement;$('wiki-title').textContent=parsed.title;$('wiki-status').textContent='Artikel wird geladen …';$('wiki-content').replaceChildren();$('wiki-source').replaceChildren();if(!reader.open)reader.showModal();
    try{const data=await query(parsed.language+'.wikipedia.org',{action:'parse',page:parsed.title,prop:'text|revid',redirects:'1',disableeditsection:'1'});if(!allowed||epoch!==consentEpoch||current!==articleVersion||!reader.open)return;if(!data.parse?.text)throw Error();const page=data.parse,rendered=sanitize(page.text,parsed.language);$('wiki-title').textContent=page.title;$('wiki-content').replaceChildren(rendered.body);$('wiki-content').scrollTop=0;$('wiki-status').textContent='Wikipedia-Artikel und Artikellinks bleiben in diesem Fenster. Bildseiten öffnen extern.';$('wiki-source').append(document.createTextNode('Wikipedia · Version '+page.revid+' · Darstellung angepasst · '),link('Originalartikel','https://'+parsed.language+'.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_'))),document.createTextNode(' · '),link('Autorinnen und Autoren','https://'+parsed.language+'.wikipedia.org/w/index.php?title='+encodeURIComponent(page.title)+'&action=history'),document.createTextNode(' · '),link('Text: CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/deed.de'));$('wiki-content').focus();const id=rendered.anchors.get(parsed.fragment);if(id)document.getElementById(id)?.scrollIntoView();
    }catch(_){if(current===articleVersion&&reader.open){$('wiki-status').textContent='Wikipedia ist gerade nicht erreichbar. Die lokalen Modelle funktionieren trotzdem.';const retry=document.createElement('button');retry.textContent='Erneut laden';retry.onclick=()=>article(value);$('wiki-content').append(retry);}}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-wiki]');if(button){article('https://'+(button.dataset.wikiLanguage==='en'?'en':'de')+'.wikipedia.org/wiki/'+encodeURIComponent(button.dataset.wiki.replace(/ /g,'_'))+(button.dataset.wikiFragment?'#'+encodeURIComponent(button.dataset.wikiFragment):''));return;}const a=event.target.closest('#wiki-content a[href]');if(a&&wikiURL(a.href)){event.preventDefault();article(a.href);}});
  $('wiki-close').onclick=()=>reader.close();reader.addEventListener('close',()=>{articleVersion++;$('wiki-content').replaceChildren();opener?.focus({preventScroll:true});});
  function revoke(){allowed=false;epoch++;articleVersion++;controllers.forEach(c=>c.abort());if(reader.open)reader.close();document.querySelectorAll('.portrait').forEach(slot=>{slot.replaceChildren(document.createTextNode('Porträt nicht geladen'));});document.querySelectorAll('.portrait-credit').forEach(el=>el.remove());$('privacy-status').textContent='Zustimmung zurückgenommen. Wikipedia und Wikimedia werden erst nach erneuter Freigabe kontaktiert.';}
  $('wiki-revoke').onclick=revoke;$('wiki-settings').onclick=()=>{dialog.returnValue='';dialog.showModal();};
  dialog.addEventListener('close',()=>{if(dialog.returnValue==='allow'){allowed=true;epoch++;$('privacy-status').textContent='Wikipedia / Wikimedia freigegeben bis zum erneuten Laden. Zustimmung unten zurücknehmbar.';portraits();}else revoke();});
  dialog.showModal();
})();
