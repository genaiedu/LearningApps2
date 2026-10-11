'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'typografie-atelier.html'),'utf8'),css=fs.readFileSync(path.join(root,'styles/typografie-atelier.css'),'utf8');
test('the closing voice is the final reading content, after the glossary',()=>{
  const voice=html.match(/<aside class="author-essay author-comment closing-voice"[\s\S]*?<\/aside>/)[0];
  assert.equal((html.match(/id="schlussstimme"/g)||[]).length,1);
  assert.ok(html.indexOf(voice)>html.indexOf('class="glossary-back"'));
  assert.match(html.slice(html.indexOf(voice)+voice.length),/^\s*<\/div>\s*<\/main>/);
  assert.equal((voice.match(/<p>/g)||[]).length,3);
  assert.equal((voice.match(/aria-hidden="true">„<\/span>/g)||[]).length,1);
  assert.ok(!/Claus|Unterberg|Meinung|Autorenkommentar|“|”/.test(voice));
  for(const phrase of ['keine Schnörkelei','Kulturtechniken','Lust auf das Lesen','Schulen gelehrt','für ihren Inhalt und für ihre Form'])assert.ok(voice.includes(phrase));
});
test('only the closing modifier centers the box, preserving the hanging quotation and serif format',()=>{
  assert.equal((html.match(/class="author-essay author-comment closing-voice"/g)||[]).length,1);
  assert.match(css,/\.author-comment\.closing-voice\{margin:35px auto 30px;text-align:left\}/);
  assert.match(css,/\.author-comment\{[^}]*width:min\(100%,850px\)[^}]*background:#e2e8dd[^}]*Cardo,Georgia,serif/);
  assert.match(css,/\.author-comment \.comment-opening\{[^}]*left:10px;top:-68px/);
});
