const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const W=require('../scripts/typografie-web-core.js'),C=require('../scripts/typografie-core.js'),root=path.resolve(__dirname,'..');
test('13 unique studies cover direction, color and composition',()=>{assert.equal(W.studies.length,13);assert.equal(new Set(W.studies.map(s=>s.id)).size,13);assert.equal(W.studies.filter(s=>s.group==='richtung').length,5);for(const group of ['farbe','raum'])assert.equal(W.studies.filter(s=>s.group===group).length,4);});
test('shear followed by rotation keeps H stems vertical at every allowed angle',()=>{
  for(let angle=-22;angle<=22;angle++){
    const [a,b,c,d,e,f]=W.uprightMatrix(angle),r=angle*Math.PI/180;
    assert.equal(c,0);assert.ok(d>0);assert.equal(e,0);assert.equal(f,0);
    assert.ok(Math.abs(b/a-Math.tan(r))<1e-12);
    assert.ok(Math.abs(a*d-b*c-1)<1e-12);
    // Compare to R(angle) * shearX(angle), not shearX(angle) * R(angle).
    assert.ok(Math.abs(Math.cos(r)*Math.tan(r)-Math.sin(r)-c)<1e-12);
    assert.ok(Math.abs(Math.sin(r)*Math.tan(r)+Math.cos(r)-d)<1e-12);
    assert.ok(W.markup('13-aufrechte-diagonale',{angle}).includes('--wt-upright:matrix('+[a,b,c,d,e,f].join(',')+')'));
  }
  const css=fs.readFileSync(path.join(root,'styles/typografie-web-studies.css'),'utf8');
  assert.ok(css.includes('.wt-title-zone .wt-upright{transform:var(--wt-upright)}'));
  assert.ok(css.includes('.wt-mode-upright .wt-title-zone{padding-top:calc('));
  assert.ok(W.markup('13-aufrechte-diagonale').includes('class="wt-upright"'));
  const ui=fs.readFileSync(path.join(root,'scripts/typografie-bildschirm.js'),'utf8');
  assert.ok(ui.includes("['shear','rotate','upright'].includes(s.mode)"));
});
test('settings clamp every numeric style and do not interpolate hostile values',()=>{assert.deepEqual(W.settings(),{size:19,leading:1.65,measure:64,angle:-12,space:false});assert.equal(W.settings({size:999,leading:0,measure:2,angle:Infinity}).size,30);for(const s of W.studies){const html=W.markup(s.id,{size:'url(evil)',angle:'99;display:none',uid:'"><script>'});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('evil'));assert.equal((html.match(/<article/g)||[]).length,1);}});
test('unknown studies use a safe fallback, and main content precedes the aside',()=>{assert.equal(W.find('unknown').id,'01-leseartikel');for(const s of W.studies){const html=W.markup(s.id);if(html.includes('<aside'))assert.ok(html.indexOf('wt-main')<html.indexOf('<aside'));assert.ok(html.includes('wt-info'));assert.ok(html.includes('Eigene Lehrstudie'));}});
test('every rendered instance can use its own IDs and banner has complete transcript',()=>{const a=W.markup('11-goldene-teilung',{uid:'one'}),b=W.markup('11-goldene-teilung',{uid:'two'});assert.ok(a.includes('id="one-info"'));assert.ok(a.includes('href="#one-info"'));assert.ok(b.includes('id="two-info"'));const banner=W.markup('05-banderole');assert.ok(banner.includes('<details'));assert.ok(banner.includes('Den überdeckten Text vollständig lesen'));assert.equal((banner.match(/Alles wird größer\./g)||[]).length,2);});
test('CSS transforms affect titles, not the whole article, and spacing is applied to paragraphs',()=>{const css=fs.readFileSync(path.join(root,'styles/typografie-web-studies.css'),'utf8');assert.ok(css.includes('.wt-title-zone .wt-shear'));assert.ok(css.includes('.wt-title-zone .wt-rotate'));assert.ok(!css.includes('.wt-root .wt-shear{'));assert.ok(css.includes('.wt-spacing .wt-copy p{line-height:1.5;letter-spacing:.12em;word-spacing:.16em'));assert.ok(css.includes('@container wt (max-width:560px)'));assert.ok(css.includes('writing-mode:horizontal-tb;transform:none'));});
test('mode classes never collide with positioned rail or banner elements; rotation reserves room',()=>{for(const s of W.studies){const doc=W.markup(s.id),article=doc.match(/<article class="([^"]+)"/)[1];assert.ok(article.includes('wt-mode-'));assert.ok(!/\bwt-(?:rail|banner|rotate|shear)\b/.test(article));}assert.ok(W.markup('04-drehung',{angle:22}).includes('--wt-turn-room:135px'));});
test('all three direction studies use the actual text baseline, not a guessed line-box edge',()=>{const css=fs.readFileSync(path.join(root,'styles/typografie-web-studies.css'),'utf8');assert.ok(css.includes('vertical-align:baseline;width:0;height:0'));for(const id of ['03-scherung','04-drehung','13-aufrechte-diagonale'])assert.ok(W.markup(id).includes('<span class="wt-baseline-anchor" aria-hidden="true"></span>Haltung.'));});
test('print and screen explain and demonstrate the same third transformation',()=>{
  const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
  for(const marker of ['class="upright-word"','web-direction-stage upright','id="web-scheren-drehen"','transform: rotate(-14deg) skewX(-14deg);','Die Querstriche des H steigen'])assert.ok(html.includes(marker));
  for(const file of ['typografie-seite.css','typografie-bildschirm.css'])assert.ok(fs.readFileSync(path.join(root,'styles',file),'utf8').includes('transform:rotate(-14deg) skewX(-14deg)'));
  assert.ok(html.includes('webstudien-13-html.zip'));
});
test('color examples retain luminance contrast; counterexample is explicitly poor',()=>{assert.ok(C.contrast('#f3eee3','#18251f')>12);assert.ok(C.contrast('#1b514d','#fffcf5')>8);assert.ok(C.contrast('#b54b49','#30833d')<1.5);});
test('all offline studies include fonts, licenses, live HTML and no network assets',()=>{for(const s of W.studies){const doc=fs.readFileSync(path.join(root,'downloads/typografie/webstudien',s.id+'.html'),'utf8');assert.ok(doc.includes('<html lang="de">'));assert.ok(doc.includes('data:font/woff2;base64,'));assert.ok(doc.includes('SIL OPEN FONT LICENSE'));assert.ok(doc.includes('Source Sans 3'));assert.ok(doc.includes('Cardo'));assert.ok(!/<script|<iframe/.test(doc));assert.ok(!/(?:src|href)="https?:/.test(doc.replace(/<a\b[^>]*>/g,'')));assert.ok(doc.includes('<article'));assert.ok(doc.includes('@container wt'));}});
test('third part has twelve chapters, live HTML workshops and real download collections',()=>{const html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),part=html.slice(html.indexOf('data-part="bildschirm"'),html.indexOf('id="entscheidungen"'));assert.deepEqual([...part.matchAll(/<section[^>]*id="([^"]+)"/g)].map(m=>m[1]),['webtext','bildschirmformate','webrichtung','farbe','hintergrund','weblayout','webgrafik','herobereiche','bewegte-grafik','interaktiv','webwerkstatt','webstudien']);for(const id of ['web-study','web-width','web-size','web-leading','web-measure','web-spacing','web-reset'])assert.ok(part.includes('id="'+id+'"'));assert.ok(part.includes('Die Downloads sind zusätzliche Arbeitsdateien'));for(const source of ['text-spacing.html','reflow.html','transform','@container','17510822'])assert.ok(part.includes(source));});
