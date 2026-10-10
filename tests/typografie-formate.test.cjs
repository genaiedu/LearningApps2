'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const F=require('../scripts/typografie-formate-core.js'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),ui=fs.readFileSync(path.join(root,'scripts/typografie-formate.js'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-formate.css'),'utf8');
test('four real viewport profiles include the large portrait monitor, tablet and phone',()=>{
  assert.deepEqual(F.devices.map(d=>[d.id,d.width,d.height]),[['desktop',1440,900],['portrait',900,1440],['tablet',768,1024],['phone',390,844]]);
  assert.equal(F.dimensions({device:'tablet',rotated:true}).width,1024);assert.equal(F.dimensions({device:'tablet',rotated:true}).height,768);
  assert.equal(F.dimensions({device:'phone',rotated:true}).width,844);assert.equal(F.dimensions({device:'phone',rotated:true}).height,390);
  assert.equal(F.settings({device:'portrait',rotated:true}).rotated,false);
});
test('unknown profiles and navigation targets cannot select arbitrary URLs or elements',()=>{
  assert.deepEqual(F.settings({device:'toString',scene:'javascript:evil',view:'url(evil)',rotated:'true'}),F.settings());
  assert.equal(F.settings({device:'phone',scene:'herobereiche',view:'actual',rotated:true}).scene,'herobereiche');
  assert.ok(ui.includes("frame.src='typografie-atelier.html?format-preview=1'"));assert.ok(!ui.includes('frame.src=current.scene'));
});
test('overview scales a fully laid-out viewport while actual-size view never changes its dimensions',()=>{
  assert.equal(F.scale({device:'desktop'},720,900),.5);
  assert.equal(F.scale({device:'portrait'},1200,720),.5);
  assert.equal(F.scale({device:'phone'},1000,2000),1);
  assert.equal(F.scale({device:'desktop',view:'actual'},320,400),1);
  for(const d of F.devices)for(const width of [240,600,1600])for(const height of [300,700,2000]){
    const s=F.scale({device:d.id},width,height);assert.ok(d.width*s<=width+1e-9);assert.ok(d.height*s<=height+1e-9);
  }
  assert.ok(ui.includes("frame.style.width=d.width+'px'"));assert.ok(ui.includes("frame.style.height=d.height+'px'"));assert.ok(css.includes('transform-origin:0 0'));
});
test('full-page preview is opt-in, stops cleanly and cannot recursively embed itself',()=>{
  assert.ok(!/<iframe id="format-frame"[^>]*src=/.test(html));
  assert.ok(ui.includes("if(embedded){"));assert.ok(ui.includes('schedule();return;'));
  assert.ok(css.includes('html.format-preview .screen-format-lab{display:none}'));
  assert.ok(ui.includes("frame.removeAttribute('src')"));assert.ok(ui.includes('event.source!==frame.contentWindow'));
  assert.ok(ui.includes('event.source!==parent||event.origin!==origin'));
  assert.ok(!/localStorage|sessionStorage/.test(ui));
});
test('format comparison has named controls, inherited motion pause and an honest limit statement',()=>{
  for(const id of ['format-scene','format-view','format-rotate','format-start','format-stop','format-jump','format-reset','format-size','format-scale','format-status'])assert.ok(html.includes('id="'+id+'"'));
  for(const d of F.devices)assert.ok(html.includes('data-format-device="'+d.id+'"'));
  for(const phrase of ['die vollständige, aktuelle Seite','keine Lesbarkeitsprüfung','weder Safari noch einen Touchscreen','CSS-Pixel','Retina','400 % Browserzoom'])assert.ok(html.includes(phrase));
  assert.ok(ui.includes("addEventListener('typography-motion-change',()=>config())"));assert.ok(ui.includes('contentWidth:document.documentElement.scrollWidth'));
});
test('format chapter is the second screen chapter and all twelve chapter numbers match navigation',()=>{
  const part=html.slice(html.indexOf('data-part="bildschirm"'),html.indexOf('id="entscheidungen"'));
  const chapters=[...part.matchAll(/<section[^>]*id="([^"]+)"[^>]*>\s*(?:<div class="wrap">\s*)?<div class="section-label">III\.(\d+)/g)];
  assert.equal(chapters.length,12);assert.equal(chapters[1][1],'bildschirmformate');
  chapters.forEach((m,i)=>{assert.equal(Number(m[2]),i+1);assert.ok(part.includes('href="#'+m[1]+'">III.'+(i+1)+' '));});
});
test('reader-facing hero labels describe design principles, including offline downloads',()=>{
  const part=html.slice(html.indexOf('id="herobereiche"'),html.indexOf('id="bewegte-grafik"'));
  assert.ok(!/Der frühere|Der neue Einstieg|Bisheriger Hero|Neuer Hero|Bisher ·|Neu ·/.test(part));
  const heroUI=fs.readFileSync(path.join(root,'scripts/typografie-bilder.js'),'utf8');assert.ok(!/Der bisherige Auftakt|Der neue Auftakt/.test(heroUI));
  for(const file of ['04-hero-bisher.html','05-hero-editorial.html','06-hero-bild.html','LESEN.html']){
    const doc=fs.readFileSync(path.join(root,'downloads/typografie/bildstudien',file),'utf8');assert.ok(!/Der bisherige Hero|Der neue redaktionelle Hero|den bisherigen Einstieg/.test(doc));
  }
});
