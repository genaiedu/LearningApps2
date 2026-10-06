/* SPDX-License-Identifier: GPL-3.0-or-later
   Sanitizer reused from the internal chess/PSE reader; OrbitalLabor adaptation. */
import './wikipedia-math.js';
export function wikipediaArticle(value) {
  try {
    const url = new URL(value, 'https://de.wikipedia.org/wiki/');
    if (url.protocol !== 'https:' || !['de.wikipedia.org','en.wikipedia.org'].includes(url.hostname) || url.port || url.username || url.password || !url.pathname.startsWith('/wiki/')) return null;
    const title = decodeURIComponent(url.pathname.slice(6)).replace(/_/g, ' ');
    if (!title.trim() || title.includes(':')) return null;
    return {title, fragment: decodeURIComponent(url.hash.slice(1)), language:url.hostname.slice(0,2)};
  } catch (_) { return null; }
}
export function wikipediaResource(value, language='de') {
  if (!value || value.startsWith('#')) return '';
  try {
    const url = new URL(value, 'https://'+(language==='en'?'en':'de')+'.wikipedia.org/wiki/');
    const host = url.hostname;
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && (['de.wikipedia.org','en.wikipedia.org','wikimedia.org'].includes(host) || host.endsWith('.wikimedia.org')) ? url.href : '';
  } catch (_) { return ''; }
}

export function renderWikipediaArticle(document, html, articleTitle, language='de') {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  for(const el of template.content.querySelectorAll('*'))for(const a of [...el.attributes])if(/^on/i.test(a.name)||a.name==='style'||a.name==='srcset')el.removeAttribute(a.name);
  window.WikiMath.prepare(template.content);
  template.content.querySelectorAll('script,style,iframe,object,embed,source,annotation-xml').forEach(el=>el.remove());
  for(const img of template.content.querySelectorAll('img'))if(!wikipediaResource(img.getAttribute('src'),language))img.remove();
  const body = document.createElement('div'), ids = new Map();
  body.className = 'chess-wiki-article';
  const original = template.content.querySelector('.mw-parser-output') || template.content;
  body.append(...original.childNodes);
  // Wikipedia diagrams contain 8x8 images inside a coordinate-labelled table.
  // Rebuild their layout with local CSS instead of trusting arbitrary inline styles.
  const boards = new Set([...body.querySelectorAll('img')].filter(img => /\/Chess_[^/]+/i.test(img.getAttribute('src') || '')).map(img => img.closest('table')).filter(Boolean));
  body.querySelectorAll('script,style,link,meta,base,noscript,iframe,object,embed,form,input,button,audio,video,source,svg,canvas,template,.mw-editsection,.navbox,.vertical-navbox,.metadata,.noprint,.authority-control,.catlinks').forEach(node => node.remove());
  const tags = new Set('p div span a img figure figcaption h1 h2 h3 h4 h5 h6 ul ol li dl dt dd table thead tbody tfoot tr th td caption colgroup col b strong i em small sub sup br hr blockquote pre code abbr cite q s u mark'.split(' '));
  const classes = /^(?:thumb|thumbinner|thumbcaption|tright|tleft|infobox|wikitable|gallery|gallerybox|gallerytext|reference|references|mw-heading[\w-]*)$/;
  for (const node of [...body.querySelectorAll('*')]) {
    if(window.WikiMath.isPrepared(node))continue;
    if (!tags.has(node.localName)) { node.replaceWith(...node.childNodes); continue; }
    const old = Object.fromEntries([...node.attributes].map(attr => [attr.name, attr.value]));
    [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
    if (old.id && !ids.has(old.id)) { const id = 'chess-wiki-anchor-' + ids.size; ids.set(old.id, id); node.id = id; }
    const safeClasses = (old.class || '').split(/\s+/).filter(name => classes.test(name));
    if (safeClasses.length) node.className = safeClasses.join(' ');
    for (const attr of ['title', 'lang', 'dir', 'scope']) if (old[attr]) node.setAttribute(attr, old[attr]);
    for (const attr of ['colspan', 'rowspan']) if (/^\d{1,2}$/.test(old[attr] || '')) node.setAttribute(attr, old[attr]);
    if (node.localName === 'img') {
      const src = wikipediaResource(old.src,language);
      if (!src) { node.remove(); continue; }
      node.src = src;
      const srcset = (old.srcset || '').split(',').map(entry => {
        const [source, size = ''] = entry.trim().split(/\s+/);
        const safe = wikipediaResource(source,language);
        return safe && (!size || /^(?:\d+(?:\.\d+)?x|\d+w)$/.test(size)) ? `${safe} ${size}`.trim() : '';
      }).filter(Boolean).join(', ');
      if (srcset) node.srcset = srcset;
      for (const attr of ['width', 'height']) if (/^\d{1,4}$/.test(old[attr] || '')) node.setAttribute(attr, old[attr]);
      node.alt = old.alt || `Abbildung aus dem Wikipedia-Artikel „${articleTitle}“`;
      node.loading = 'lazy'; node.decoding = 'async'; node.referrerPolicy = 'no-referrer';
    }
    if (node.localName === 'a' && old.href) {
      if (old.href.startsWith('#')) node.dataset.fragment = old.href.slice(1);
      else {
        const url = wikipediaResource(old.href,language);
        if (url) {
          node.href = url;
          if (wikipediaArticle(url)) { node.dataset.chessWikiLink = ''; node.dataset.externalConsentSkip = ''; node.removeAttribute('target'); }
          else { node.target = '_blank'; node.rel = 'noopener noreferrer'; node.referrerPolicy = 'no-referrer'; }
        }
      }
    }
  }
  for (const link of body.querySelectorAll('[data-fragment]')) {
    let fragment = link.dataset.fragment;
    try { fragment = decodeURIComponent(fragment); } catch (_) { /* literal ID */ }
    const id = ids.get(fragment);
    if (id) { link.href = '#' + id; link.dataset.chessWikiAnchor = id; }
    delete link.dataset.fragment;
  }
  for (const board of boards) if (body.contains(board)) board.classList.add('chess-wiki-diagram');
  return {body, ids};
}


const $=id=>document.getElementById(id);
let allowed=false, version=0, controller=null, opener=null;
document.body.insertAdjacentHTML('beforeend', `<dialog id="orbital-wiki-reader" class="orbital-wiki-reader" aria-labelledby="orbital-wiki-title"><div class="orbital-wiki-shell"><header><div><p class="eyebrow">Wikipedia · im OrbitalLabor lesen</p><h2 id="orbital-wiki-title">Artikel</h2></div><button type="button" class="button button--secondary" id="orbital-wiki-close" aria-label="Lesefenster schließen">Schließen ×</button></header><p id="orbital-wiki-status" role="status"></p><article id="orbital-wiki-content" tabindex="0"></article><footer id="orbital-wiki-source"></footer></div></dialog>`);
const reader=$('orbital-wiki-reader'), content=$('orbital-wiki-content');
async function permission(){
  if(allowed)return true;
  if(!window.ExternalConsent)return false;
  allowed=await ExternalConsent.request('https://de.wikipedia.org/',{
    title:'Wikipedia-Inhalte im OrbitalLabor erlauben?',
    message:'Nach Freigabe werden die Graphit- und Rydberg-Bilder geladen; Artikel und Porträts erst nach deinem Klick. Dazu verbindet sich die App mit de.wikipedia.org, en.wikipedia.org, commons.wikimedia.org, upload.wikimedia.org und gegebenenfalls weiteren Wikimedia-Bildservern. Dabei können deine IP-Adresse sowie Browser- und Gerätedaten übertragen werden. Alle lokalen Modelle und Fragen funktionieren auch ohne Wikipedia. Die Freigabe gilt bis zum erneuten Laden der App oder bis du sie unten zurücknimmst. Andere externe Fachquellen öffnen nur nach gesonderter Bestätigung.',
    providerText:'Wikipedia / Wikimedia · Artikel, Porträts und Abbildungen',
    acceptLabel:'Zustimmen und Inhalt laden'
  });
  if(allowed)loadEvidenceImages();
  return allowed;
}
function textFromHtml(value){const t=document.createElement('template');t.innerHTML=String(value||'');return t.content.textContent.replace(/\s+/g,' ').trim();}
async function query(host,params,signal){
  const url=new URL('https://'+host+'/w/api.php');
  url.search=new URLSearchParams({...params,format:'json',formatversion:'2',origin:'*'});
  const response=await fetch(url,{credentials:'omit',mode:'cors',referrerPolicy:'no-referrer',signal});
  if(!response.ok)throw new Error('Wikimedia nicht erreichbar');
  return response.json();
}
function sourceLink(label,url){
  const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.dataset.externalConsentSkip='';return a;
}
async function article(value){
  const parsed=wikipediaArticle(value);if(!parsed)return;
  const focus=document.activeElement;
  if(!await permission())return;
  if(!reader.open)opener=focus;
  const current=++version;controller?.abort();controller=new AbortController();
  const abort=controller,timer=setTimeout(()=>abort.abort(),15000);
  $('orbital-wiki-title').textContent=parsed.title;$('orbital-wiki-status').textContent='Artikel wird geladen …';content.replaceChildren();$('orbital-wiki-source').replaceChildren();content.setAttribute('aria-busy','true');
  if(!reader.open)reader.showModal();
  try{
    const data=await query(parsed.language+'.wikipedia.org',{action:'parse',page:parsed.title,prop:'text|revid',redirects:'1',disableeditsection:'1'},abort.signal);
    if(current!==version||!reader.open)return;
    if(!data.parse?.text)throw new Error('Kein Artikel');
    const page=data.parse,rendered=renderWikipediaArticle(document,page.text,page.title,parsed.language);
    content.replaceChildren(rendered.body);content.scrollTop=0;$('orbital-wiki-title').textContent=page.title;
    $('orbital-wiki-status').textContent='Artikellinks bleiben in diesem Lesefenster. Bildseiten öffnen extern.';
    const source=$('orbital-wiki-source');source.append(document.createTextNode('Quelle: Wikipedia · Darstellung angepasst · Bilder: jeweilige Bildseite. '),
      sourceLink('Originalartikel','https://'+parsed.language+'.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_'))),
      sourceLink('Autorinnen und Autoren','https://'+parsed.language+'.wikipedia.org/w/index.php?title='+encodeURIComponent(page.title)+'&action=history'),
      sourceLink('Text: CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/deed.de'));
    content.focus({preventScroll:true});
    if(rendered.ids.has(parsed.fragment))document.getElementById(rendered.ids.get(parsed.fragment))?.scrollIntoView({block:'start'});
  }catch(_){if(current===version&&reader.open){$('orbital-wiki-status').textContent='Wikipedia konnte gerade nicht geladen werden. Die App funktioniert weiterhin.';const retry=document.createElement('button');retry.className='button button--secondary';retry.textContent='Erneut laden';retry.onclick=()=>article(value);content.append(retry);}}
  finally{clearTimeout(timer);if(current===version)content.removeAttribute('aria-busy');}
}
$('orbital-wiki-close').onclick=()=>reader.close();
reader.addEventListener('close',()=>{version++;controller?.abort();content.replaceChildren();opener?.focus({preventScroll:true});});
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(!link)return;
  if(link.dataset.chessWikiAnchor&&content.contains(link)){event.preventDefault();document.getElementById(link.dataset.chessWikiAnchor)?.scrollIntoView({block:'start'});return;}
  if(!wikipediaArticle(link.href)||$('orbital-wiki-source').contains(link))return;
  // Shared external-consent.js ignores marked links; handled here in-app.
  event.preventDefault();article(link.href);
});
content.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(link&&wikipediaArticle(link.href))link.dataset.externalConsentSkip='';
},true);
async function portrait(card){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
  try{
    const data=await query('de.wikipedia.org',{action:'query',titles:card.dataset.scientist,redirects:'1',prop:'pageimages',pithumbsize:'320'},abort.signal);
    const page=data.query?.pages?.[0],url=wikipediaResource(page?.thumbnail?.source);
    if(!url||!page?.pageimage)throw new Error('Kein Porträt');
    const meta=await query('commons.wikimedia.org',{action:'query',titles:'File:'+page.pageimage,prop:'imageinfo',iiprop:'extmetadata|url'},abort.signal);
    const info=meta.query?.pages?.[0]?.imageinfo?.[0],m=info?.extmetadata;
    const license=textFromHtml(m?.LicenseShortName?.value);
    const rawCredit=textFromHtml(m?.Artist?.value).replace(/Unknown authorUnknown author/g,'Urheber nicht angegeben');
    const credit=rawCredit||(/Public domain/i.test(license)?'Urheber nicht angegeben':'');
    if(!info?.descriptionurl||!credit||!license)throw new Error('Bildnachweis fehlt');
    if(!allowed)return false;
    const image=document.createElement('img');image.alt='Porträt von '+card.dataset.scientist;image.referrerPolicy='no-referrer';image.decoding='async';
    image.addEventListener('error',()=>{image.replaceWith(document.createTextNode('Porträt derzeit nicht verfügbar.'));},{once:true});
    image.src=url;card.querySelector('.scientist-portrait').replaceChildren(image);
    const p=document.createElement('p');p.className='portrait-credit';p.append(document.createTextNode(credit+' · '+license+' · '),sourceLink('Bildquelle und Lizenz',info.descriptionurl));card.querySelector('.portrait-credit')?.remove();card.querySelector('.scientist-portrait').after(p);return true;
  }catch(_){return false;}finally{clearTimeout(timer);}
}
$('load-scientist-images').onclick=async()=>{
  if(!await permission())return;
  const button=$('load-scientist-images');button.disabled=true;$('portrait-status').textContent='Porträts und Bildnachweise werden geladen …';
  const results=await Promise.all([...document.querySelectorAll('[data-scientist]')].map(portrait));
  button.disabled=false;
  $('portrait-status').textContent=results.every(Boolean)?'Sechs Porträts aus Wikimedia Commons geladen; Bildnachweise stehen jeweils am Bild.':results.filter(Boolean).length+' von 6 Porträts geladen. Fehlende Bilder oder Bildnachweise sind momentan nicht erreichbar; du kannst es erneut versuchen.';
};
const revoke=document.createElement('button');revoke.type='button';revoke.className='button button--secondary';revoke.id='orbital-wiki-revoke';revoke.textContent='Wikipedia-Zustimmung zurücknehmen';
$('quellen').append(revoke);
revoke.onclick=()=>{allowed=false;version++;controller?.abort();if(reader.open)reader.close();
 document.querySelectorAll('.scientist-portrait').forEach(host=>{host.replaceChildren(document.createTextNode('Porträt nicht geladen'));});document.querySelectorAll('.portrait-credit').forEach(p=>p.remove());resetEvidenceImages();$('portrait-status').textContent='Zustimmung zurückgenommen. Ohne erneute Freigabe werden keine Wikipedia-Inhalte geladen.';};

function resetEvidenceImages(){
  document.querySelectorAll('[data-wikimedia-figure]').forEach(figure=>{
    const slot=figure.querySelector('.evidence-image-slot'),note=document.createElement('p'),button=document.createElement('button');
    note.textContent='Wikimedia-Bild noch nicht geladen.';button.type='button';button.className='button button--secondary';button.dataset.loadEvidence='';button.textContent='W · Bild laden';slot.replaceChildren(note,button);
  });
}
function loadEvidenceImages(){
  if(!allowed)return;
  document.querySelectorAll('[data-wikimedia-figure]').forEach(figure=>{
    const slot=figure.querySelector('.evidence-image-slot');if(slot.querySelector('img'))return;
    const url=wikipediaResource(figure.dataset.imageSrc);if(!url||new URL(url).hostname!=='upload.wikimedia.org')return;
    const image=document.createElement('img');image.alt=figure.dataset.imageAlt;image.referrerPolicy='no-referrer';image.decoding='async';image.loading='lazy';
    image.addEventListener('error',()=>{if(!allowed||!slot.contains(image))return;const note=document.createElement('p'),retry=document.createElement('button');note.textContent='Das Wikimedia-Bild ist gerade nicht erreichbar. Die Erklärung bleibt nutzbar.';retry.type='button';retry.className='button button--secondary';retry.dataset.loadEvidence='';retry.textContent='W · Erneut laden';slot.replaceChildren(note,retry);},{once:true});
    image.src=url;slot.replaceChildren(image);
  });
}
document.addEventListener('click',async event=>{if(event.target.closest('[data-load-evidence]')&&await permission())loadEvidenceImages();});
// Consent precedes all Wikimedia requests, also when a deep link opens the app.
const start=$('wiki-start-dialog');
start.addEventListener('close',()=>{allowed=start.returnValue==='allow';if(allowed)loadEvidenceImages();});
start.showModal();
$('wiki-start-title').tabIndex=-1;$('wiki-start-title').focus({preventScroll:true});start.scrollTop=0;
