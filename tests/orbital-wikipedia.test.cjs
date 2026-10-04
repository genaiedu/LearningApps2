const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../scripts/orbital-labor-wikipedia.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../orbital-labor.html'),'utf8');
const context=vm.createContext({URL});
vm.runInContext(script.split('const $=id=>')[0].replaceAll('export function','function'),context);

test('German and English Wikipedia articles stay on their own language host',()=>{
  assert.equal(context.wikipediaArticle('https://en.wikipedia.org/wiki/Quantum_microscopy#Photoionization').language,'en');
  assert.equal(context.wikipediaArticle('https://de.wikipedia.org/wiki/Rydberg-Zustand').language,'de');
  assert.equal(context.wikipediaResource('/wiki/Hydrogen_atom','en'),'https://en.wikipedia.org/wiki/Hydrogen_atom');
  assert.equal(context.wikipediaResource('/wiki/Graphit'),'https://de.wikipedia.org/wiki/Graphit');
  for(const url of ['http://en.wikipedia.org/wiki/Atom','https://en.wikipedia.org.evil.test/wiki/Atom','https://de.wikipedia.org/wiki/File:Bad','https://user@en.wikipedia.org/wiki/Atom','javascript:alert(1)'])assert.equal(context.wikipediaArticle(url),null);
  for(const url of ['https://evilwikimedia.org/image.png','https://wikimedia.org.evil.test/x','data:image/png,whatever','javascript:alert(1)'])assert.equal(context.wikipediaResource(url),'');
  assert.equal(context.wikipediaResource('//upload.wikimedia.org/a.jpg'),'https://upload.wikimedia.org/a.jpg');
});

test('Evidence chapter follows all theory and precedes questions, with honest image types',()=>{
  assert.ok(html.indexOf('id="aromaten"')<html.indexOf('id="sichtbar-machen"'));
  assert.ok(html.indexOf('id="sichtbar-machen"')<html.indexOf('id="forschen"'));
  assert.equal((html.match(/data-wikimedia-figure/g)||[]).length,2);
  assert.match(html,/Messbild, keine Modellzeichnung/);
  assert.match(html,/Berechnete Darstellung, keine Messaufnahme/);
  assert.match(html,/Hweimer/);assert.match(html,/Frank Trixler/);assert.match(html,/CC BY-SA 4\.0/);
});

test('Startup disclaimer precedes Wikimedia loading and has an offline route',()=>{
  assert.match(html,/id="wiki-start-dialog"/);
  assert.match(html,/value="offline">Ohne externe Inhalte starten/);
  assert.match(html,/en\.wikipedia\.org, commons\.wikimedia\.org, upload\.wikimedia\.org/);
  assert.doesNotMatch(html,/<img[^>]*\ssrc="https:\/\/(?:upload|commons)\.wikimedia\.org/);
  assert.match(script,/let allowed=false/);
  assert.match(script,/function loadEvidenceImages\(\)\{\s*if\(!allowed\)return/);
  assert.match(script,/start\.showModal\(\)/);
  assert.match(script,/allowed=start\.returnValue==='allow';if\(allowed\)loadEvidenceImages/);
  assert.doesNotMatch(script,/sessionStorage\.getItem/);
  assert.match(script,/resetEvidenceImages\(\);\$\('portrait-status'\)/);
});
