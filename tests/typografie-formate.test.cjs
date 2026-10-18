'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
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
  assert.ok(ui.includes("frame.src='typografie-atelier.html?format-preview=1&v=20261018-blocksatz2'"));assert.ok(!ui.includes('frame.src=current.scene'));
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
test('full-page preview is always visible and cannot recursively embed itself',()=>{
  assert.ok(!/<iframe id="format-frame"[^>]*src=/.test(html));
  assert.ok(!/<iframe id="format-frame"[^>]*hidden/.test(html));
  assert.ok(!/format-start|format-stop|format-placeholder|Vorschau schließen|Vorschau starten/.test(html));
  assert.ok(ui.includes("if(embedded){"));assert.ok(ui.includes('schedule();return;'));
  assert.ok(css.includes('html.format-preview .screen-format-lab{display:none}'));
  assert.ok(!ui.includes("frame.removeAttribute('src')"));assert.ok(ui.includes('event.source!==frame.contentWindow'));
  assert.ok(ui.includes('event.source!==parent||event.origin!==origin'));
  assert.ok(!/localStorage|sessionStorage/.test(ui));
});
test('preview loads automatically once and remains loaded across format changes and reset',()=>{
  const elements={},events={},messages=[],buttons=F.devices.map(d=>({dataset:{formatDevice:d.id},handlers:{},setAttribute(){},addEventListener(type,handler){this.handlers[type]=handler;}}));
  for(const id of ['format-stage','format-frame','format-device','format-size','format-scale','format-jump','format-status','format-rotate','format-scene','format-view','format-observation','format-reset'])elements[id]={style:{},dataset:{},handlers:{},attributes:{},setAttribute(key,value){this.attributes[key]=value;},getAttribute(key){return this.attributes[key]??null;},addEventListener(type,handler){this.handlers[type]=handler;}};
  const frame=elements['format-frame'];let navigations=0;
  Object.defineProperty(frame,'src',{get(){return this.attributes.src;},set(value){this.attributes.src=value;navigations++;}});
  frame.contentWindow={postMessage(message){messages.push(message);}};
  Object.assign(elements['format-stage'],{clientWidth:1000,clientHeight:600,scrollTo(){}});
  vm.runInNewContext(ui,{window:{TypoFormats:F},document:{getElementById:id=>elements[id],querySelectorAll:()=>buttons,body:{classList:{contains:()=>false}}},location:{origin:'https://example.test',search:''},URLSearchParams,ResizeObserver:class{observe(){}},addEventListener(type,handler){events[type]=handler;}});
  assert.equal(navigations,1);assert.equal(frame.src,'typografie-atelier.html?format-preview=1&v=20261018-blocksatz2');
  assert.equal(elements['format-jump'].disabled,true);frame.handlers.load();assert.equal(elements['format-jump'].disabled,false);
  buttons.find(b=>b.dataset.formatDevice==='phone').handlers.click();assert.equal(frame.style.width,'390px');
  elements['format-rotate'].handlers.click();assert.equal(frame.style.width,'844px');
  elements['format-reset'].handlers.click();assert.equal(frame.style.width,'1440px');assert.equal(navigations,1);
  assert.ok(messages.length>=4);assert.ok(messages.every(m=>m.type==='typography-format-config'));
  events.message({source:frame.contentWindow,origin:'https://example.test',data:{type:'typography-format-status',width:1440,height:900,contentWidth:1440}});
  assert.ok(elements['format-status'].textContent.includes('Kein horizontaler Seitenüberstand'));
});
test('preview navigation scrolls only its own window, respects sticky offsets and never reveals the outer iframe',()=>{
  const events={},scrolls=[],parent={postMessage(){}},root={classList:{add(){}}};
  const anchors={start:{top:0},webgrafik:{top:600},'hero-vergleich':{top:1200}};
  for(const anchor of Object.values(anchors))Object.assign(anchor,{getBoundingClientRect(){return {top:this.top};},scrollIntoView(){throw Error('Must not scroll ancestor frames');}});
  const window={TypoFormats:F,scrollY:25,scrollTo(options){scrolls.push({...options});}};
  vm.runInNewContext(ui,{window,parent,location:{origin:'https://example.test',search:'?format-preview=1'},URLSearchParams,
    document:{documentElement:root,body:{},getElementById:id=>anchors[id],fonts:{ready:Promise.resolve()}},
    getComputedStyle:element=>element===root?{scrollPaddingTop:'140px'}:{scrollMarginTop:'12px'},
    addEventListener(type,handler){events[type]=handler;},requestAnimationFrame:()=>1,ResizeObserver:class{observe(){}}});
  const send=(data,source=parent,origin='https://example.test')=>events.message({source,origin,data:{type:'typography-format-config',...data}});
  send({scene:'webgrafik',jump:true},{},'https://foreign.test');assert.equal(scrolls.length,0);
  send({scene:'webgrafik',jump:false});assert.equal(scrolls.length,0);
  send({scene:'webgrafik',jump:true});assert.deepEqual(scrolls.at(-1),{top:473,left:0,behavior:'instant'});
  send({scene:'herobereiche',jump:true});assert.equal(scrolls.at(-1).top,1073);
  send({scene:'start',jump:true});assert.equal(scrolls.at(-1).top,0);
});
test('plain openings and restored visits start at the top, while explicit chapter links remain intact',()=>{
  const startup=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  for(const hash of ['', '#katalog']){
    const events={},scrolls=[],frames=[],history={scrollRestoration:'auto'};
    vm.runInNewContext(startup,{history,location:{hash},window:{addEventListener(type,handler){events[type]=handler;},scrollTo(options){scrolls.push({...options});}},requestAnimationFrame:callback=>frames.push(callback)});
    assert.equal(history.scrollRestoration,'manual');
    for(const persisted of [false,true]){events.pageshow({persisted});while(frames.length)frames.shift()();}
    assert.equal(scrolls.length,hash?0:4);
    for(const scroll of scrolls)assert.deepEqual(scroll,{top:0,left:0,behavior:'instant'});
  }
});
test('the embedded page and its navigation script use the same fresh cache key',()=>{
  const version=html.match(/scripts\/typografie-formate\.js\?v=([^"&]+)/)[1];
  const url=new URL(ui.match(/frame.src='([^']+)'/)[1],'https://example.test/');
  assert.equal(url.searchParams.get('v'),version);assert.equal(url.searchParams.get('format-preview'),'1');
});
test('format comparison has named controls, inherited motion pause and an honest limit statement',()=>{
  for(const id of ['format-scene','format-view','format-rotate','format-jump','format-reset','format-size','format-scale','format-status'])assert.ok(html.includes('id="'+id+'"'));
  for(const d of F.devices)assert.ok(html.includes('data-format-device="'+d.id+'"'));
  assert.ok(!html.includes('Die Vorschau lädt'));
  for(const phrase of ['keine Lesbarkeitsprüfung','weder Safari noch einen Touchscreen','CSS-Pixel','Retina','400 % Browserzoom'])assert.ok(html.includes(phrase));
  assert.ok(ui.includes("addEventListener('typography-motion-change',()=>config())"));assert.ok(ui.includes('contentWidth:document.documentElement.scrollWidth'));
});
test('format chapter is the second screen chapter and all thirteen chapter numbers match navigation',()=>{
  const part=html.slice(html.indexOf('data-part="bildschirm"'),html.indexOf('id="entscheidungen"'));
  const chapters=[...part.matchAll(/<section[^>]*id="([^"]+)"[^>]*>\s*(?:<div class="wrap">\s*)?<div class="section-label">III\.(\d+)/g)];
  assert.equal(chapters.length,13);assert.equal(chapters[1][1],'bildschirmformate');
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
