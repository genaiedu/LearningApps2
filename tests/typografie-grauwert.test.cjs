'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('typografie-atelier.html'),script=read('scripts/typografie-grauwert.js'),css=read('styles/typografie-grauwert.css');
function setup(t,execute=true){
  const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window,q=selector=>w.document.querySelector(selector);
  t.after(()=>w.close());
  // The existing workshop binds its reset handler before this enhancement loads.
  q('#book-reset').onclick=()=>{q('#book-headings').value='restrained';q('#book-body').classList.remove('loud');};
  q('#book-headings').oninput=()=>q('#book-body').classList.toggle('loud',q('#book-headings').value==='loud');
  if(execute)w.eval(script);
  return{w,q};
}
test('grey value is introduced before the live typesetting lab, without renumbering part II',t=>{
  const {q}=setup(t,false),section=q('#satzlabor');
  assert.ok(section.contains(q('#grauwert')));
  assert.ok(section.innerHTML.indexOf('id="grauwert"')<section.innerHTML.indexOf('id="body-font"'));
  for(const term of ['Grauwert des Satzes','Wortabstände','Zeilenabstand','ausreichenden Kontrast','weder möglichst dicht noch möglichst hell','keine Grauwert-Messung'])assert.ok(section.textContent.includes(term),term);
  const chapters=[...q('[aria-label="Inhalt von Teil II"]').querySelectorAll('a')];
  assert.equal(chapters.length,12);assert.ok(chapters[2].href.endsWith('#satzlabor'));
  assert.equal(q('#glossar-grauwert a').getAttribute('href'),'#grauwert');
  assert.ok(q('#druckfarbe .grauwert-color-note').textContent.includes('keine graue Schriftfarbe'));
  assert.equal(q('#grauwert .source-note a').hostname,'learn.microsoft.com');
});
test('both specimens contain exactly the same words, with clearly labelled deliberate disturbances',t=>{
  const {q}=setup(t,false),paragraphs=selector=>[...q(selector).querySelectorAll('p')].map(p=>p.textContent);
  assert.deepEqual(paragraphs('.grauwert-uneven'),paragraphs('.grauwert-even'));
  assert.equal(paragraphs('.grauwert-even').length,2);
  assert.ok(q('.grauwert-uneven .grauwert-heavy'));assert.ok(q('.grauwert-uneven .grauwert-wide'));
  assert.equal(q('.grauwert-even').querySelectorAll('span').length,0);
  assert.ok(q('.grauwert-example .grauwert-caption').textContent.includes('Absichtlich überzeichnet'));
  assert.ok(q('#grauwert-controls').hidden,'No unusable controls when JavaScript is unavailable');
  assert.ok(css.includes('font-family:"EB Garamond",Georgia,serif'));assert.ok(css.includes('font-synthesis:none'));
  const audit=JSON.parse(read('data/typografie-fontaudit.json'));
  for(const file of audit.families.find(f=>f.id==='ebgaramond').files)for(const feature of ['liga','onum','pnum'])assert.ok(file.features.includes(feature));
});
test('distance view is reversible, announces its purpose and changes neither text nor colour nor size',t=>{
  const {q}=setup(t),before=q('#grauwert-proofs').textContent;
  assert.equal(q('#grauwert-controls').hidden,false);
  q('#grauwert-distance').click();
  assert.ok(q('#grauwert-proofs').classList.contains('is-distance'));
  assert.equal(q('#grauwert-distance').getAttribute('aria-pressed'),'true');assert.equal(q('#grauwert-read').getAttribute('aria-pressed'),'false');
  assert.ok(q('#grauwert-view-note').textContent.includes('Schriftfarbe und Schriftgröße bleiben unverändert'));
  assert.equal(q('#grauwert-view-note').getAttribute('role'),'status');
  q('#grauwert-read').click();
  assert.equal(q('#grauwert-proofs').classList.contains('is-distance'),false);
  assert.equal(q('#grauwert-distance').getAttribute('aria-pressed'),'false');assert.equal(q('#grauwert-read').getAttribute('aria-pressed'),'true');
  assert.equal(q('#grauwert-proofs').textContent,before);
  assert.ok(!/\.style|innerHTML|fetch\(|localStorage|setInterval|requestAnimationFrame/.test(script));
});
test('book feedback follows the existing exaggeration and reset without changing its text',t=>{
  const {q,w}=setup(t),before=q('#book-body').textContent;
  assert.equal(q('#book-body').querySelectorAll('.grauwert-book-emphasis').length,3);
  q('#book-headings').value='loud';q('#book-headings').dispatchEvent(new w.Event('input'));
  assert.ok(q('#book-body').classList.contains('loud'));
  assert.ok(q('#book-grauwert-note').textContent.startsWith('Zu viele Auszeichnungen:'));
  q('#book-reset').click();
  assert.equal(q('#book-body').classList.contains('loud'),false);
  assert.ok(q('#book-grauwert-note').textContent.startsWith('Zurückhaltender Buchsatz:'));
  assert.equal(q('#book-body').textContent,before);
});
test('comparison uses semantic palette roles, stacks on small screens and prints unblurred',()=>{
  for(const role of ['white','ink','muted','red','line','surface','button-bg','button-ink'])assert.ok(css.includes('var(--'+role+')'));
  assert.ok(!/#(?:[\da-f]{3}){1,2}\b|url\(|@import|animation:|transition:/.test(css));
  assert.ok(css.includes('@media(max-width:760px){.grauwert-proofs{grid-template-columns:1fr'));
  assert.ok(css.includes('@media print'));assert.ok(css.includes('filter:none!important'));
  assert.ok(html.includes('styles/typografie-grauwert.css?v=20261018-grauwert'));
  assert.ok(html.includes('scripts/typografie-grauwert.js?v=20261018-grauwert'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});
