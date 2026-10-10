const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const G=require('../scripts/typografie-bild-core.js'),root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-bilder.css'),'utf8'),ui=fs.readFileSync(path.join(root,'scripts/typografie-bilder.js'),'utf8');
test('three image studies share the same real text and own locally hosted illustration',()=>{
  assert.equal(G.studies.length,3);assert.equal(new Set(G.studies.map(s=>s.mode)).size,3);
  const texts=G.studies.map(s=>G.markup(s.id).match(/<p>[\s\S]*?<\/p>/)[0]);assert.equal(new Set(texts).size,1);
  for(const s of G.studies){const m=G.markup(s.id);assert.equal((m.match(/<img /g)||[]).length,1);assert.ok(m.includes('Abb. 1'));assert.ok(m.includes('width="1200" height="720"'));assert.ok(m.includes('alt="'+G.alt+'"'));}
  const svg=fs.readFileSync(path.join(root,G.image),'utf8');assert.ok(!/<script|<foreignObject|href=|https?:/.test(svg.replace('http://www.w3.org/2000/svg','')));assert.ok(svg.includes('viewBox="0 0 1200 720"'));
});
test('crop options allow only known sizes, focus and fit; hostile input cannot become styles',()=>{
  assert.deepEqual(G.crop(),{fit:'contain',position:'center',width:1000});
  assert.deepEqual(G.crop({fit:'url(evil)',position:'right;display:none',width:'320;'}),G.crop());
  for(const fit of ['contain','cover'])for(const position of ['left','center','right'])for(const width of [320,600,1000])assert.deepEqual(G.crop({fit,position,width}),{fit,position,width});
  assert.ok(!G.figure('" onerror="bad()').includes('src="" onerror='));
});
test('the new hero preserves unique live IDs and the former hero remains a real template',()=>{
  assert.equal((html.match(/id="hero-letter"/g)||[]).length,1);assert.equal((html.match(/id="hero-font"/g)||[]).length,1);assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.ok(html.includes('<section class="editorial-hero" id="start"'));
  const old=html.match(/<template id="previous-hero-template">([\s\S]*?)<\/template>/)[1];assert.ok(old.includes('Alles beginnt'));assert.ok(old.includes('hero-specimen'));assert.ok(!old.includes('id="hero-'));
  assert.ok(ui.includes("fragment.removeAttribute('id')"));assert.ok(ui.includes("querySelectorAll('[id]')"));assert.ok(ui.includes('heading.replaceWith(replacement)'));
});
test('new controls are resettable, named and connected; images and captions remain real content',()=>{
  for(const id of ['image-width','image-fit','image-position','image-reset','hero-study','hero-width','image-study-close']){assert.ok(html.includes('id="'+id+'"'));assert.ok(ui.includes("$('"+id+"')"));}
  assert.ok(html.includes('srcset'));assert.ok(html.includes('object-position'));assert.ok(html.includes('alt=""'));
  assert.ok(html.includes('Bildnachweis'));assert.ok(html.includes('Beschnittzugabe'));assert.ok(html.includes('300 ppi'));
  for(const source of ['Responsive_images','decision-tree','pause-stop-hide','prefers-reduced-motion','printers-marks-bleeds'])assert.ok(html.includes(source));
  assert.ok(css.includes('@container image-frame (max-width:480px)'));assert.ok(css.includes('@container hero-example (max-width:650px)'));
});
test('motion starts stopped, respects reduced motion and master pause, and retains static explanation',()=>{
  assert.ok(html.includes('id="animation-canvas" data-moving="false"'));assert.ok(html.includes('<desc id="motion-graphic-desc">'));
  const kinetic=fs.readFileSync(path.join(root,'scripts/typografie-bewegung.js'),'utf8');
  assert.ok(kinetic.includes('moving=M.running(s)'));assert.ok(kinetic.includes("addEventListener('typography-motion-change'"));assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(html.includes('Pause, Stop, Hide (A)'));assert.ok(html.includes('Animation from Interactions (AAA)'));
});
test('six offline documents contain local fonts, licenses, embedded vector artwork and no network assets',()=>{
  const out=path.join(root,'downloads/typografie/bildstudien'),files=fs.readdirSync(out).filter(s=>/^\d\d-.*\.html$/.test(s));assert.equal(files.length,6);
  for(const file of files){const doc=fs.readFileSync(path.join(out,file),'utf8');assert.equal((doc.match(/data:font\/woff2;base64,/g)||[]).length,5);assert.ok(doc.includes('SIL OPEN FONT LICENSE'));if(!file.includes('hero-bisher')&&!file.includes('hero-editorial'))assert.ok(doc.includes('data:image/svg+xml;base64,'));assert.ok(!/<script\b|<link[^>]+href=|<img[^>]+src="https?:|fetch\(/.test(doc));}
  assert.ok(fs.statSync(path.join(out,'bild-und-hero-studien-6-html.zip')).size>0);
});
