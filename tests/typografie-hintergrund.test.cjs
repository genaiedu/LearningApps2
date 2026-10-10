'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const B=require('../scripts/typografie-hintergrund-core.js'),C=require('../scripts/typografie-core.js');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'scripts/typografie-hintergrund.js'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-hintergrund.css'),'utf8');
test('background settings admit only local choices and bounded numbers',()=>{
  assert.deepEqual(B.settings(),B.defaults);
  const s=B.settings({glyph:'<img onerror=bad()>',font:'url(evil)',theme:'toString',size:Infinity,x:999,y:-3,width:'320;',mode:'sticky',strength:999,speed:-3});
  assert.equal(s.glyph,'&');assert.equal(s.font,'Cardo');assert.equal(s.theme,'paper');assert.equal(s.size,170);assert.equal(s.x,130);assert.equal(s.y,10);assert.equal(s.width,960);assert.equal(s.mode,'normal');assert.equal(s.strength,100);assert.equal(s.speed,0);
});
test('white and black mixtures are real colors, monotonic and visibly distinguished from luminance percentages',()=>{
  for(const {background} of Object.values(B.themes)){
    assert.equal(B.color(background,'lighter',0),background);assert.equal(B.color(background,'darker',0),background);
    for(const strength of [2,8,20,40]){assert.ok(C.luminance(B.color(background,'lighter',strength))>C.luminance(background));assert.ok(C.luminance(B.color(background,'darker',strength))<C.luminance(background));}
  }
  assert.equal(B.color('#eeeeee','lighter',100),'#ffffff');assert.equal(B.color('#eeeeee','darker',100),'#000000');
  assert.throws(()=>B.color('url(evil)','lighter',8));assert.ok(html.includes('nicht eine Zunahme der Leuchtdichte um acht Prozent'));
});
test('the displayed glyph travels at the selected ratio, normal speed is not parallax',()=>{
  for(const scroll of [0,100,640])for(const speed of [0,.3,.6,1]){
    const g=B.geometry({mode:'parallax',speed},600,500,scroll);
    assert.equal(g.shift,scroll*(1-speed));assert.ok(Math.abs((-scroll+g.shift)-(-scroll*speed))<1e-10);
  }
  assert.equal(B.geometry({mode:'normal',speed:0},600,500,100).shift,0);
  assert.equal(B.geometry({mode:'parallax',speed:.3},600,500,100,false).shift,0);
  const g=B.geometry({size:250,x:5,y:50},320,500);assert.equal(g.fontSize,800);assert.equal(g.left,5);assert.equal(g.top,250);
});
test('every interactive background control has a real label and all clipping stays inside the laboratory',()=>{
  const part=html.match(/<section class="chapter wrap web-chapter" id="hintergrund">([\s\S]*?)<\/section>/)[1];
  for(const key of ['glyph','font','theme','tone','strength','size','x','y','width','mode','speed','shield','visible'])assert.ok(new RegExp('<label[^>]*>[\\s\\S]*?id="bg-'+key+'"').test(part),key);
  for(const id of ['bg-reset','bg-scroll','bg-next','bg-top','bg-report'])assert.ok(part.includes('id="'+id+'"'));
  assert.ok(part.includes('aria-hidden="true"'));assert.ok(part.includes('tabindex="0" role="region"'));
  for(const marker of ['overflow-x:hidden','pointer-events:none','minmax(0,1fr)','max-width:100%','@media(max-width:450px)'])assert.ok(css.includes(marker));
  assert.ok(!/fetch\(|localStorage|sessionStorage/.test(ui));
});
test('motion preferences and the site pause override parallax without removing text or other controls',()=>{
  for(const marker of ['prefers-reduced-motion: reduce',"document.body.classList.contains('motion-paused')","addEventListener('typography-motion-change',update)","reduced.addEventListener('change',update)","{passive:true}"])assert.ok(ui.includes(marker));
  assert.ok(!ui.includes('setInterval'));assert.ok(!css.includes('animation:'));assert.ok(html.includes('Animation from Interactions (AAA)'));
  assert.ok(ui.includes('Math.min(worst,over)'));assert.ok(ui.includes('current.visible&&!current.shield'));
});
test('repeated ideas explicitly refer back to the print chapters and background has its own place in navigation',()=>{
  const web=html.slice(html.indexOf('data-part="bildschirm"'),html.indexOf('id="entscheidungen"'));
  for(const target of ['richtung','druckfarbe','komposition','bild-und-text'])assert.ok(web.includes('href="#'+target+'"'));
  assert.ok(web.includes('nicht als neue Regeln, sondern unter veränderten Bedingungen'));
  assert.ok(html.includes('href="#hintergrund">III.4 Zeichen im Hintergrund &amp; Parallaxe'));
  const chapters=[...web.matchAll(/<section[^>]*id="([^"]+)"[^>]*>\s*(?:<div class="wrap">\s*)?<div class="section-label">III\.(\d+)/g)];
  assert.equal(chapters.length,10);chapters.forEach((m,i)=>assert.equal(Number(m[2]),i+1));
});
test('the downloadable lab is the real chapter and uses only embedded local fonts and scripts',()=>{
  const doc=fs.readFileSync(path.join(root,'downloads/typografie/hintergrund/hintergrund-werkstatt.html'),'utf8');
  assert.equal((doc.match(/data:font\/woff2;base64,/g)||[]).length,3);assert.ok(doc.includes('SIL OPEN FONT LICENSE'));
  for(const marker of ['id="bg-scroll"','id="bg-speed"','id="offline-motion-pause"','Der Raum<br>zwischen den Worten.'])assert.ok(doc.includes(marker));
  assert.ok(!/<script[^>]+src=|<link[^>]+href=|<iframe|fetch\(|localStorage|sessionStorage/.test(doc));
  assert.ok(!/url\((?!data:)/.test(doc));
});
