const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const P = require('../scripts/uvvis-presentation.js');
const records = require('../data/uvvis-spectra.json').substances;
const C = require('../scripts/uvvis-core.js');
const source = fs.readFileSync(path.join(__dirname, '../scripts/uvvis-presentation.js'), 'utf8');
test('35 stages cover theory, structures, HOMO/LUMO, complete measurement and calibration', () => {
  assert.equal(P.slides.length, 35);
  assert.deepEqual(P.slides.filter(s=>s.visual==='instrument').map(s=>s.step), [0,1,2,3,4,5,6,7,8,9]);
  for (const visual of ['energy','photons','epsilon','benzene-normalized','benzene-absolute','mo','orbitals','resonance-base','resonance-acid','ph','calibration','calculation']) assert.ok(P.slides.some(s=>s.visual===visual), visual);
  assert.ok(P.slides.some(s=>s.visual==='orbitals'&&s.variant==='lumo'));
  assert.ok(P.slides[4].aside.includes('Photonenergie in Joule'));
  assert.ok(!JSON.stringify(P.slides).includes('Absorbanz'));
  const r=records.find(r=>r.id==='N05');
  assert.ok(C.measure(r,699,{c:5,factor:1,path:1,pH:7,material:'quartz',bandwidth:1,realistic:false}));
  assert.ok(699 <= r.points.at(-1)[0]-.5); // finite bandwidth must stay within the data
  assert.ok(source.includes("change('range-end',699)"));
});
test('charts preserve data and label axes and units without requiring interaction', () => {
  const dom = new JSDOM(P.chartSVG([{points:[[380,0],[500,.6],[699,0]],color:'#806796'}],{lo:380,hi:699,label:'Extinktion E'}));
  assert.ok(dom.window.document.querySelector('svg[role="img"]'));
  assert.ok(dom.window.document.body.textContent.includes('Extinktion E'));
  assert.ok(dom.window.document.body.textContent.includes('Wellenlänge λ / nm'));
  assert.equal(dom.window.document.querySelectorAll('button,input,select').length,0);
  assert.equal(dom.window.document.querySelectorAll('.show-curve').length,1);
  dom.window.close();
});
test('next-only theory, backward navigation, fullscreen fallback and model restoration', async () => {
  const html=fs.readFileSync(path.join(__dirname,'../uvvis-labor.html'),'utf8');
  const dom=new JSDOM(html,{url:'https://example.test/uvvis-labor.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document;
  w.fetch=async()=>({ok:true,json:async()=>({substances:records})});
  w.matchMedia=()=>({matches:true});
  w.UVVis=C;
  w.UVVisIndicators={...require('../scripts/uvvis-indicators'),ready:async()=>({records,manifest:require('../data/uvvis-indicator-structures.json')})};
  w.UVVisCuvette={...require('../scripts/uvvis-cuvette.js'),scene:()=>({update(){}})};
  w.UVVisSpectrumColors=require('../scripts/uvvis-spectrum-colors.js');
  const mo=d.createElement('div');mo.id='amino-energy';mo.innerHTML='<svg viewBox="0 0 100 100"><text>HOMO LUMO</text></svg>';d.querySelector('#farbstoffe').append(mo);
  const grid=d.createElement('div');grid.id='amino-orbital-grid';
  grid.innerHTML=[0,1].map(i=>'<figure><select><option value="0">HOMO</option><option value="1">LUMO</option></select><button data-frontier="homo">HOMO</button><button data-frontier="lumo">LUMO</button><canvas></canvas></figure>').join('');d.querySelector('#farbstoffe').append(grid);
  grid.querySelectorAll('figure').forEach(f=>{f.querySelector('[data-frontier="lumo"]').onclick=()=>f.querySelector('select').value='1';f.querySelector('[data-frontier="homo"]').onclick=()=>f.querySelector('select').value='0';});
  const originalParent=grid.parentNode;
  d.querySelector('#probability-run').onclick=()=>{};
  w.eval(source);d.querySelector('#uvvis-show-start').click();
  const flush=()=>new Promise(resolve=>setTimeout(resolve,3));await flush();
  const shell=d.querySelector('#uvvis-show'),next=d.querySelector('#show-next');
  assert.equal(d.querySelector('#start').nextElementSibling.id,'praesentation');
  assert.equal(shell.hidden,false);
  d.dispatchEvent(new w.Event('fullscreenchange'));
  assert.equal(shell.hidden,false); // losing native fullscreen must not destroy the presentation
  for(let i=1;i<=21;i++){next.click();await flush();assert.equal(Number(shell.dataset.slide),i);assert.ok(!d.querySelector('.show-error'), 'slide '+i);}
  for(let i=0;i<6;i++){d.querySelector('#show-prev').click();await flush();}
  assert.equal(shell.dataset.slide,'15');
  assert.ok(shell.contains(grid));
  assert.equal(grid.querySelector('select').value,'1');
  d.querySelector('#show-close').click();await flush();
  assert.equal(shell.hidden,true);
  assert.equal(grid.parentNode,originalParent);
  assert.equal(grid.querySelector('select').value,'0');
  assert.equal(Boolean(d.querySelector('main').inert),false);
  assert.equal(d.querySelectorAll('.show-instrument').length,0);
  dom.window.close();
});
test('isolated instrument retains the original renderer and does not mount duplicate orbital scenes', () => {
  const main=fs.readFileSync(path.join(__dirname,'../scripts/uvvis-labor.js'),'utf8');
  assert.ok(source.includes("frame.src='uvvis-labor.html?deck-instrument=1"));
  assert.ok(main.includes("if(new URLSearchParams(location.search).has('deck-instrument'))window.UVVisLabDemo="));
  assert.ok(main.includes("if(!new URLSearchParams(location.search).has('deck-instrument'))aux()"));
  assert.ok(main.includes('device();window.UVVisOptics.mount();window.UVVisDevice3D.mount();'));
  assert.ok(!source.includes('parking.append(instrumentHost)'));
  assert.ok(source.includes('node!==instrumentHost'));
  assert.ok(source.includes("node.classList.add('show-mo')"));
  const css=fs.readFileSync(path.join(__dirname,'../styles/uvvis-presentation.css'),'utf8');
  assert.ok(css.includes('.show-mo .mo-hit{fill:transparent;stroke:transparent}'));
  assert.ok(css.includes('.show-mo .mo-line{stroke:currentColor;stroke-width:4}'));
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
  assert.match(css,/\.show-equation math\{[^}]*display:math/);
  assert.doesNotMatch(css,/\.show-equation math\{[^}]*display:block/);
  assert.match(css,/\.show-energy\{font-family:"Fira Math","Fira Sans",sans-serif/);
  assert.ok(source.includes('class="show-calculation"'));
  assert.ok(source.includes('<p>Ergebnis</p>'));
  assert.match(css,/\.show-calculation\{font-size:clamp\(22px,3vw,42px\)/);
});
