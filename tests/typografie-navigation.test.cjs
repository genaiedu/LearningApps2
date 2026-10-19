'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const N=require('../scripts/typografie-navigation-core.js'),read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
const html=read('typografie-atelier.html'),css=read('styles/typografie-navigation.css'),ui=read('scripts/typografie-navigation.js');
test('navigation study follows interaction and keeps section numbering and targets consistent',()=>{
  const section=html.match(/<section[^>]*id="websteuerung"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.ok(html.indexOf('id="interaktiv"')<html.indexOf('id="websteuerung"'));
  assert.ok(html.indexOf('id="websteuerung"')<html.indexOf('id="webwerkstatt"'));
  for(const word of ['Navigation','Werkzeuge','position: fixed','position: sticky','nichtmodalen','modales','Browserzoom','Escape','Tastatur','Bildschirmtastatur'])assert.ok(section.includes(word),word);
  for(const source of ['disclosure-navigation','dialog-modal','focus-not-obscured-minimum','reflow.html','target-size-minimum','/Properties/position','/Values/env'])assert.ok(section.includes(source));
  assert.ok(html.includes('href="#websteuerung">11 ·'));
  assert.match(html,/<div class="section-label">Vertiefung 12 <span>Eine Idee/);
  assert.match(html,/<div class="section-label">Vertiefung 13 <span>Bearbeiten/);
});
test('all layout choices are sanitized and numeric bounds remain finite',()=>{
  assert.deepEqual(N.settings(),N.defaults);
  assert.deepEqual(N.settings({mode:'evil',side:'garbage',width:'999px',size:Infinity}),N.defaults);
  assert.equal(N.settings({size:9}).size,18);assert.equal(N.settings({size:999}).size,26);
  assert.equal(N.geometry({},Infinity).width,900);assert.equal(N.geometry({},-10).width,0);
  for(const mode of ['top','bottom','side'])for(const side of ['overlay','push'])for(const width of ['wide','phone'])for(const available of [250,390,619,620,900,1400])for(const open of [true,false]){
    const g=N.geometry({mode,side,width},available,open);
    assert.ok(g.width<=available);assert.ok(g.width<=(width==='phone'?390:900));
    assert.equal(g.push,mode==='side'&&side==='push'&&open&&g.width>=620);
  }
});
test('the location marker follows section tops without requiring chapter clicks',()=>{
  for(const [threshold,index]of [[-100,0],[0,0],[200,1],[899,1],[900,2]])assert.equal(N.activeIndex([0,200,900],threshold),index);
  assert.equal(N.activeIndex([NaN,Infinity,500],100),0);
  assert.ok(ui.includes("viewport.addEventListener('scroll',currentChapter"));
  assert.ok(ui.includes("setAttribute('aria-current','location')"));
});
test('example is scoped, keyboard-safe and reserves measured space for controls',()=>{
  assert.ok(ui.includes("root.addEventListener('keydown'"));assert.ok(ui.includes("event.key==='Escape'"));
  assert.ok(ui.includes("setAttribute('aria-expanded'"));assert.ok(ui.includes('drawer.hidden='));
  assert.ok(ui.includes('target.focus({preventScroll:true})'));assert.ok(ui.includes('trigger.focus({preventScroll:true})'));
  assert.ok(ui.includes("root.addEventListener('focusin'"));assert.ok(ui.includes('event.preventDefault();close();reserve()'));
  assert.ok(ui.includes('bar.getBoundingClientRect().height'));assert.ok(ui.includes('new ResizeObserver(reserve).observe(bar)'));
  assert.ok(ui.includes('shell.clientWidth-(parseFloat(padding.paddingLeft)||0)-(parseFloat(padding.paddingRight)||0)'));
  assert.ok(css.includes('scroll-padding-block:calc(var(--nav-top) + 12px)'));
  assert.ok(css.includes('min-height:44px'));assert.ok(css.includes('overscroll-behavior-y:contain'));
  assert.ok(!/fetch\(|localStorage|window\.scroll|location\.hash|innerHTML|role="menu"/.test(ui));
  assert.ok(!css.includes('position:fixed'));
});
test('offline study is the identical live markup, fully self-contained and licensed',()=>{
  const doc=read('downloads/typografie/websteuerung.html'),demo=html.match(/<!-- navigation-demo:start -->([\s\S]*?)<!-- navigation-demo:end -->/)[1];
  assert.ok(doc.includes(demo));assert.ok(doc.includes(css));assert.ok(doc.includes(ui));
  assert.ok(doc.includes('data:font/woff2;base64,'));assert.ok(doc.includes('Fira Sans'));assert.ok(doc.includes('EB Garamond'));
  assert.ok(doc.includes('SIL OPEN FONT LICENSE'));assert.ok(doc.includes('data-palette="graphite"'));
  for(const name of ['Graphit','Papier &amp; Wald','Schieferblau','Pflaume','Hell','Dunkel'])assert.ok(doc.includes(name));
  assert.ok(!/(?:src|href)="https?:/.test(doc.replace(/<a\b[^>]*>/g,'')));
  const ids=[...doc.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const target of doc.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(target[1]));
  assert.ok(doc.includes('class="nav-demo-controls" hidden'));
});
