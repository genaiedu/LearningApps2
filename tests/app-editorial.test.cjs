'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const css=read('styles/app-editorial.css'),audit=JSON.parse(read('data/typografie-fontaudit.json'));

test('both apps opt into the shared standard without external fonts or additional font copies',()=>{
  for(const [page,skin]of [['spiegelwelt','science'],['kunsttresor','gallery']]){
    const html=read(page+'.html');
    assert.ok(html.includes('class="editorial-app app-'+skin+'"'));
    assert.ok(html.includes('href="styles/app-editorial.css?v=20261011-heading-air"'));
    assert.ok(html.indexOf('styles/'+page+'.css')<html.indexOf('styles/app-editorial.css'));
    assert.ok(html.includes('class="'+(skin==='science'?'wordmark':'brand')+' editorial-wordmark"'));
    assert.ok(!/fonts\.googleapis|fonts\.gstatic|@import/.test(html+read('styles/'+page+'.css')+css));
    assert.ok(!read('styles/'+page+'.css').includes('--serif:var(--serif)'));
  }
});

test('the actual local reading fonts have German coverage, real italic/bold cuts and required features',()=>{
  const faces=[...css.matchAll(/@font-face\{([^}]+)\}/g)];assert.equal(faces.length,9);
  const used=[];
  for(const [rule,body]of faces){
    const asset=body.match(/src:url\('([^']+)'\)/)[1];
    assert.ok(asset.startsWith('../fonts/typografie/'));
    const absolute=path.resolve(root,'styles',asset),relative=path.relative(root,absolute);
    assert.equal(fs.readFileSync(absolute).subarray(0,4).toString(),'wOF2');
    const family=audit.families.find(f=>f.files.some(file=>file.path===relative));assert.ok(family,relative);assert.equal(family.germanMissing,'');
    const file=family.files.find(file=>file.path===relative);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex'),file.sha256,'Feature audit must match the actual asset');
    for(const feature of ['kern','liga','onum','pnum','lnum','tnum'])assert.ok(file.features.includes(feature),relative+' '+feature);
    assert.ok(fs.existsSync(path.join(root,'fonts/typografie',family.id,'OFL.txt')));
    used.push(rule);
  }
  for(const weight of [400,600,700])for(const style of ['normal','italic'])assert.ok(used.some(rule=>rule.includes('font-family:"Fira Sans"')&&rule.includes('font-weight:'+weight+';')&&rule.includes('font-style:'+style+';')));
  for(const style of ['normal','italic'])assert.ok(used.some(rule=>rule.includes('font-family:"EB Garamond"')&&rule.includes('font-weight:400 800;')&&rule.includes('font-style:'+style+';')));
});

test('prose shaping is explicit while data, controls, mathematics and the handwritten film remain distinct',()=>{
  for(const marker of ['font-synthesis:none','font-kerning:normal','font-variant-ligatures:common-ligatures','font-variant-numeric:oldstyle-nums proportional-nums','font-variant-numeric:lining-nums tabular-nums','--background:','--foreground:','--accent:'])assert.ok(css.includes(marker),marker);
  assert.ok(css.includes('font-style:italic;font-weight:400'));
  assert.ok(css.includes('.hero-stats b,.score-strip b,.result-score b'));
  assert.ok(css.includes('.film-counter,.big-value,.comparison,.pairs,.timeline'));
  const art=read('styles/kunsttresor.css'),nobel=read('spiegelwelt.html'),js=read('scripts/spiegelwelt.js');
  assert.ok(art.includes("'Dancing Script',cursive"));
  assert.ok(art.includes('art-finale-title 2s 2s both'));assert.ok(art.includes('art-finale-signature 1.6s 6.5s both'));
  assert.ok(nobel.includes('MathJax'));assert.ok(nobel.includes('../LearningApps/fonts/mathjax-newcm'));
  assert.ok(js.includes("font='Fira Sans'"));assert.ok(js.includes("'EB Garamond'"));assert.ok(!js.includes("'Outfit'"));
  assert.ok(js.includes('document.fonts.ready.then(()=>{fitFilm();paint();})'));
});

test('wordmarks contrast weight, local icons follow interactive states, and responsive rules remain shared',()=>{
  assert.ok(read('spiegelwelt.html').includes('<strong>SPIEGEL</strong><span>WELT</span>'));
  assert.ok(read('kunsttresor.html').includes('<strong>KUNST</strong><span>TRESOR</span>'));
  assert.ok(css.includes('.editorial-wordmark strong{font-weight:700}'));
  assert.ok(css.includes('.editorial-wordmark span{font-weight:400;color:inherit}'));
  for(const icon of ['maximize','minimize','restart','pause','play']){
    assert.ok(css.includes('../assets/ui/'+icon+'.svg'));
    const svg=read('assets/ui/'+icon+'.svg');assert.ok(svg.includes('Lucide, ISC license'));assert.ok(svg.includes('viewBox="0 0 24 24"'));assert.ok(!/<script|https?:\/\/(?!www.w3.org\/2000\/svg)/.test(svg));
  }
  assert.ok(fs.existsSync(path.join(root,'fonts/typografie/LUCIDE-LICENSE.txt')));
  assert.ok(css.includes('#motion-toggle[aria-pressed="true"]'));assert.ok(css.includes('#film-fullscreen[aria-pressed="true"]'));
  for(const size of ['1000','700'])assert.ok(css.includes('@media(max-width:'+size+'px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});

test('only large strong Sans headings receive a minimal tracking correction',()=>{
  const atelier=read('styles/typografie-atelier.css');
  for(const sheet of [css,atelier])assert.ok(sheet.includes('--large-heading-space:clamp(0px,calc(1em - 40px),.01em)'));
  for(const selector of ['.app-science .film-copy h2','.app-gallery h1','.app-gallery .launch-dialog h2']){
    const rule=css.split(selector+'{')[1].split('}')[0];
    assert.ok(rule.includes('font-weight:600;letter-spacing:calc(-.035em + var(--large-heading-space))'));
  }
  assert.ok(atelier.includes('h2{font-size:clamp(40px,5.5vw,72px);letter-spacing:calc(-.03em + var(--large-heading-space));'));
  assert.ok(css.includes('.app-gallery .launch-dialog h2 em{font-style:italic;font-weight:400;letter-spacing:-.015em}'));
  assert.ok(css.includes('.app-gallery .intro-copy h2{font-family:var(--reading-serif);font-weight:400;letter-spacing:-.025em}'));
  assert.ok(css.includes('.app-gallery .hero-rules h2{font-size:17px;line-height:1.4;letter-spacing:0}'));
  assert.ok(css.includes('.editorial-wordmark{display:inline-flex;align-items:baseline;gap:.42em;'));
  assert.ok(!css.match(/:where\(p,li,dd,figcaption\)\{[^}]*large-heading-space/));
  for(const size of [16,27,32,38,40,43,54,76,100]){
    const extra=Math.max(0,Math.min(size-40,size*.01));
    assert.ok(extra>=0&&extra<=size*.01);
    if(size<=40)assert.equal(extra,0);
    else assert.equal(extra,size*.01);
  }
});
