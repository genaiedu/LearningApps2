'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8');
const section=html.slice(html.indexOf('<section class="chapter wrap" id="details">'),html.indexOf('<section class="chapter wrap" id="lucide">'));
const voice=section.match(/<aside class="author-essay author-comment" id="gedankenstrich-randstimme"[\s\S]*?<\/aside>/)?.[0];

test('the dash voice follows its punctuation explanation within Feinsatz, before optical alignment',()=>{
  assert.ok(voice);
  assert.ok(section.indexOf('class="micro-compare"')<section.indexOf('id="gedankenstrich-randstimme"'));
  assert.ok(section.indexOf('Der <strong>Gedankenstrich</strong>')<section.indexOf('id="gedankenstrich-randstimme"'));
  assert.ok(section.indexOf('id="gedankenstrich-randstimme"')<section.indexOf('class="optical-proof panel"'));
  assert.equal((html.match(/id="gedankenstrich-randstimme"/g)||[]).length,1);
});

test('the new voice reuses the shared margin format without visible attribution or closing quotation marks',()=>{
  assert.ok(voice.includes('data-randstimme="gedankenstrich"'));
  assert.equal((voice.match(/aria-hidden="true">„<\/span>/g)||[]).length,1);
  assert.equal((voice.match(/<p>/g)||[]).length,3);
  assert.ok(!/Claus|Unterberg|Autorenkommentar|<h[1-6]|“|”/.test(voice));
});

test('the requested stance distinguishes punctuation, keyboard access and perceived AI authorship',()=>{
  for(const phrase of ['etwas anderes als ein Bindestrich','deutlich länger –','Zeichen des Innehaltens','Ach ja, da war ja noch was.','keine eigene Taste','Tastenkürzel oder die Zeicheneingabe','Bei KI-erzeugtem Text fällt diese Hürde weg','vermeintliches KI-Indiz','kein verlässlicher KI-Nachweis','absichtlich den kurzen Bindestrich','keine Entschuldigung für Geschmacklosigkeit'])assert.ok(voice.includes(phrase),phrase);
  assert.ok(!/nicht über die Tastatur|KI verwendet ihn immer korrekt|beweist.*KI/.test(voice));
  assert.ok(section.includes('"Gute Typografie" - das kostet'));
  assert.ok(section.includes('„Gute Typografie“ – das kostet'));
});
