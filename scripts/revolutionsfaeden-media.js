(() => {
  'use strict';
  const D=window.REVOLUTION,A=window.RevolutionApp,$=s=>document.querySelector(s),esc=A?.escape;if(!A)return;
  let pending=null,controller=null,version=0;
  const filePage=im=>'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(im.file.replaceAll(' ','_'));
  const caption=im=>`<strong>${esc(im.title)}</strong> · ${esc(im.creator)} · Entstehung: ${esc(im.year)}<br>${esc(im.reading)}<br><a href="${esc(filePage(im))}" target="_blank" rel="noopener noreferrer">Originaldatei, Nachweis und Lizenz ↗</a> · ${esc(im.license)}`;
  function renderImages(){
    const consent=A.consent()===true;
    document.querySelectorAll('[data-image]').forEach(el=>{
      const im=D.images[el.dataset.image];if(!im||el.dataset.ready===String(consent))return;el.dataset.ready=String(consent);
      el.innerHTML=`<figure class="art-figure"><button type="button" class="image-button" data-enlarge="${esc(el.dataset.image)}" aria-label="${esc(im.title)} · vergrößern">${consent?`<img src="${esc(im.src)}" alt="${esc(im.title)}" loading="${el.dataset.hero?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer">`:`<span class="image-placeholder">${esc(im.title)}<br><small>Bild nach Freigabe anzeigen</small></span>`}</button><figcaption>${caption(im)}</figcaption></figure>`;
      const img=el.querySelector('img');if(img)img.addEventListener('error',()=>{img.hidden=true;const note=document.createElement('span');note.className='image-placeholder';note.textContent='Bild konnte nicht geladen werden. Die verlinkte Commons-Bildseite bietet das Original.';img.after(note)},{once:true});
    });
    $('#media-status').textContent=consent?'Wikimedia-Bilder freigegeben. Artikel werden erst beim Öffnen abgerufen.':'Keine externen Bilder oder Artikel geladen. Texte und Werkzeuge bleiben nutzbar.';
  }
  function requestConsent(action){pending=action;$('#media-consent').returnValue='';$('#media-consent').showModal()}
  function revoke(){pending=null;A.setConsent(false);controller?.abort();version++;for(const id of ['wiki-dialog','image-dialog'])if($('#'+id).open)$('#'+id).close();$('#wiki-content').replaceChildren();$('#image-large').replaceChildren();renderImages()}
  $('#media-consent').addEventListener('close',()=>{const yes=$('#media-consent').returnValue==='allow';A.setConsent(yes);renderImages();const next=pending;pending=null;if(yes&&next){if(next.kind==='image')openImage(next.id);else openWiki(next.page)}});
  $('#media-allow').addEventListener('click',()=>requestConsent(null));$('#media-revoke').addEventListener('click',revoke);
  function openImage(id){if(A.consent()!==true){requestConsent({kind:'image',id});return}const im=D.images[id];if(im)showLarge(im.src,im.title,caption(im))}
  function showLarge(src,title,description){$('#image-title').textContent=title;const img=document.createElement('img');img.src=src;img.alt=title;img.referrerPolicy='no-referrer';$('#image-large').replaceChildren(img);$('#image-caption').innerHTML=description;if(!$('#image-dialog').open)$('#image-dialog').showModal()}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-enlarge]');if(b)openImage(b.dataset.enlarge);const w=e.target.closest('[data-wiki]');if(w)openWiki(w.dataset.wiki)});
  $('#image-close').addEventListener('click',()=>$('#image-dialog').close());$('#wiki-close').addEventListener('click',()=>$('#wiki-dialog').close());$('#image-dialog').addEventListener('close',()=>$('#image-large').replaceChildren());$('#wiki-dialog').addEventListener('close',()=>{controller?.abort();version++;$('#wiki-content').replaceChildren()});
  for(const id of ['image-dialog','wiki-dialog'])$('#'+id).addEventListener('click',e=>{if(e.target===$('#'+id))$('#'+id).close()});
  const allowed=new Set(['DIV','P','H2','H3','H4','H5','H6','UL','OL','LI','DL','DT','DD','TABLE','CAPTION','THEAD','TBODY','TFOOT','TR','TH','TD','B','STRONG','I','EM','SPAN','BR','HR','BLOCKQUOTE','FIGURE','FIGCAPTION','A','IMG','SUP','SUB','SMALL']);
  const blocked=new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','SVG','VIDEO','AUDIO','TEMPLATE']);
  function sanitize(node,base){
    if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.nodeValue||'');if(node.nodeType!==Node.ELEMENT_NODE||blocked.has(node.tagName))return null;
    if(!allowed.has(node.tagName)){const frag=document.createDocumentFragment();node.childNodes.forEach(child=>{const clean=sanitize(child,base);if(clean)frag.append(clean)});return frag}
    const clean=document.createElement(node.tagName.toLowerCase());if(node.id)clean.id='revwiki-'+node.id;
    if(node.tagName==='A'){const href=node.getAttribute('href');if(href?.startsWith('#'))clean.href='#revwiki-'+href.slice(1);else if(href)try{const u=new URL(href,base);if(u.protocol==='https:'){clean.href=u.href;clean.target='_blank';clean.rel='noopener noreferrer'}}catch{}}
    if(['TD','TH'].includes(node.tagName))for(const attr of ['colspan','rowspan']){const value=node.getAttribute(attr);if(value&&/^\d{1,3}$/.test(value))clean.setAttribute(attr,value)}
    if(node.tagName==='IMG'){try{const u=new URL(node.getAttribute('src'),base);if(u.protocol!=='https:'||!u.hostname.endsWith('.wikimedia.org'))return null;clean.src=u.href}catch{return null}clean.alt=node.getAttribute('alt')||'Abbildung aus Wikipedia';clean.loading='lazy';clean.referrerPolicy='no-referrer';clean.tabIndex=0;clean.setAttribute('role','button');clean.title='Abbildung vergrößern'}
    node.childNodes.forEach(child=>{const childClean=sanitize(child,base);if(childClean)clean.append(childClean)});return clean;
  }
  async function openWiki(page){
    if(A.consent()!==true){requestConsent({kind:'wiki',page});return}controller?.abort();controller=new AbortController();const request=controller,epoch=++version,url='https://de.wikipedia.org/wiki/'+encodeURIComponent(page),history='https://de.wikipedia.org/w/index.php?title='+encodeURIComponent(page)+'&action=history';
    $('#wiki-title').textContent=page.replaceAll('_',' ');$('#wiki-status').textContent='Vollständiger Artikel wird geladen …';$('#wiki-content').replaceChildren();$('#wiki-credit').innerHTML=`<a href="${url}" target="_blank" rel="noopener noreferrer">Originalartikel ↗</a> · <a href="${history}" target="_blank" rel="noopener noreferrer">Autor:innen und Versionsgeschichte ↗</a> · Text: <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Bilder: jeweilige Bildseite.`;if(!$('#wiki-dialog').open)$('#wiki-dialog').showModal();const timeout=setTimeout(()=>request.abort(),20000);
    try{
      const endpoint='https://de.wikipedia.org/w/api.php?'+new URLSearchParams({action:'parse',page,prop:'text',redirects:'1',format:'json',formatversion:'2',origin:'*'}),r=await fetch(endpoint,{signal:request.signal,referrerPolicy:'no-referrer'});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(!data.parse?.text)throw new Error('Kein Artikel');if(epoch!==version||A.consent()!==true||!$('#wiki-dialog').open)return;
      const template=document.createElement('template');template.innerHTML=data.parse.text;const root=template.content.querySelector('.mw-parser-output')||template.content,frag=document.createDocumentFragment();root.childNodes.forEach(n=>{const safe=sanitize(n,url);if(safe)frag.append(safe)});$('#wiki-content').replaceChildren(frag);$('#wiki-content').scrollTop=0;$('#wiki-title').textContent=data.parse.title||page;$('#wiki-status').textContent='Vollständiger Wikipedia-Artikel. Artikelverweise öffnen hier, Bilder lassen sich vergrößern.';
    }catch{if(epoch===version&&$('#wiki-dialog').open)$('#wiki-status').textContent='Der Artikel konnte gerade nicht geladen werden. Der Link zum Original bleibt verfügbar.'}finally{clearTimeout(timeout)}
  }
  $('#wiki-content').addEventListener('click',e=>{
    const img=e.target.closest('img');if(img){e.preventDefault();const source=img.closest('a')?.href||img.src;showLarge(img.src,img.alt,`<p>Abbildung aus Wikipedia. <a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Original, Urheber und Lizenz prüfen ↗</a></p>`);return}
    const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href');if(href?.startsWith('#revwiki-')){e.preventDefault();document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({block:'start'});return}
    try{const u=new URL(a.href);if(u.hostname==='de.wikipedia.org'&&u.pathname.startsWith('/wiki/')&&!decodeURIComponent(u.pathname).includes(':')){e.preventDefault();openWiki(decodeURIComponent(u.pathname.slice(6)))}}catch{}
  });
  $('#wiki-content').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('img')){e.preventDefault();e.target.click()}});
  document.addEventListener('revolution-render',renderImages);renderImages();if(A.consent()===null)requestConsent(null);
})();
