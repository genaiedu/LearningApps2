const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {grades, areas, compose: composeWithGeneral} = require('../scripts/chemie-assessment.js');
const root = path.join(__dirname, '..');
const working = 'chemie-curriculum-arbeitskopie.html';
const html = fs.readFileSync(path.join(root, working), 'utf8');
const generalSection = html.slice(html.indexOf('id="abitur-bewertung"'),html.indexOf('<!-- chemie-assessment:formulations -->'));
const generalByPoints = Object.fromEntries([...generalSection.matchAll(/<tr><td>[^<]*· (\d+)[^<]*<\/td><td>([^<]+)<\/td><\/tr>/g)].map(m=>[Number(m[1]),m[2]]));
const compose = (points, selected) => composeWithGeneral(points, selected, generalByPoints[Number(points)]);
const fragment = name => html.match(new RegExp(`<!-- chemie-assessment:${name} -->([\\s\\S]*?)<!-- /chemie-assessment:${name} -->`))[1];

test('Sixteen grade levels have distinct chemistry formulations and matching static rows', () => {
  assert.deepEqual(grades.map(g => g.points), Array.from({length:16}, (_,i) => 15-i));
  assert.equal(new Set(grades.map(g => g.text)).size, 16);
  for (const grade of grades) {
    assert.ok(fragment('formulations').includes(grade.text));
    assert.equal(compose(String(grade.points), []), generalByPoints[grade.points]+'\n\n'+grade.text);
  }
  assert.equal((fragment('formulations').match(/<th scope="row">/g) || []).length,16);
});

test('Drafts use the selected chemistry areas and correct grade bands only', () => {
  for (const points of [15,13,12,10,9,7,6,4,3,1,0]) {
    const band = points>=13?1:points>=10?2:points>=7?3:points>=4?4:points>=1?5:6;
    const draft = compose(points,['model','calculation','model','unknown']);
    assert.equal(draft, [generalByPoints[points],grades.find(g=>g.points===points).text,areas.model[band],areas.calculation[band]].join('\n\n'));
  }
  for (const value of [-1,16,4.5,'not-a-grade']) assert.throws(()=>compose(value,[]),RangeError);
});

test('Every draft begins with the exact unchanged general formulation for its point level', () => {
  assert.equal(Object.keys(generalByPoints).length,16);
  for (const grade of grades) assert.equal(compose(grade.points,['reaction']).split('\n\n')[0],generalByPoints[grade.points]);
  assert.throws(()=>composeWithGeneral(11,[],undefined),/allgemeine Formulierung/);
  assert.match(fragment('formulations'),/zuerst die allgemeine Formulierung/);
});

test('AFB matrix covers seven chemical perspectives without treating topics as fixed levels', () => {
  assert.equal((fragment('afb').match(/<th scope="row">/g)||[]).length,7);
  assert.match(fragment('afb'),/keine amtliche Liste fester Inhaltszuordnungen/);
  assert.match(fragment('afb'),/keine feste Zuordnung einer AFB-Stufe zu einer Note/);
  assert.match(fragment('afb'),/Eine aufwendige Rechnung ist nicht allein deshalb AFB III/);
  assert.ok(html.indexOf('id="chemie-afb"') < html.indexOf('id="klausuren-3"'));
});

test('Oral examination guidance links to AFB definitions and omits the rejected disclaimer', () => {
  assert.match(fragment('oral'),/href="#klausuren-2"/);
  assert.match(fragment('oral'),/in 13\.2/);
  assert.doesNotMatch(fragment('oral'),/Schulische Arbeitshilfe, keine neue Prüfungsordnung|angekündigten schulischen Vorlage|Präsentationsprüfung im fünften Abiturfach/);
  assert.match(fragment('oral'),/weder ein starres Frage-Antwort-Skript/);
  assert.equal((fragment('oral').match(/type="checkbox"/g)||[]).length,11);
  assert.ok(html.indexOf('id="muedlich-erwartungshorizont"') < html.indexOf('id="abitur-bewertung"'));
  assert.ok(html.indexOf('id="abitur-bewertung"') < html.indexOf('id="chemische-formulierungshilfen"'));
  const general = html.slice(html.indexOf('id="abitur-bewertung"'),html.indexOf('<!-- chemie-assessment:formulations -->'));
  assert.equal((general.match(/<tr>/g)||[]).length,17);
});

test('AFB definitions exist only in the canonical table in 13.2', () => {
  for (const definition of [
    'Gelerntes im vertrauten Zusammenhang wiedergeben und geübte Verfahren sicher einsetzen.',
    'Bekanntes selbstständig ordnen, erklären und auf vergleichbare neue Situationen übertragen.',
    'Komplexe neue Probleme eigenständig bearbeiten, Methoden auswählen, Lösungen begründen und das Vorgehen reflektieren.'
  ]) assert.equal(html.split(definition).length - 1, 1);
  for (const name of ['afb', 'oral', 'gkl', 'formulations']) {
    assert.match(fragment(name), /href="#klausuren-2"/);
    assert.doesNotMatch(fragment(name), /AFB I betrifft|AFB II verlangt|AFB III verlangt|Definition und Abgrenzung/);
  }
  assert.match(fragment('afb'), /Maßgeblich ist ausschließlich/);
  assert.match(fragment('afb'), /sie definiert die Anforderungsbereiche nicht erneut/);
});

test('GKL receives only a short AFB reference, with existing individual assessment preserved', () => {
  assert.match(fragment('gkl'),/id="gkl-afb-verweis"/);
  assert.match(fragment('gkl'),/href="#klausuren-2"/);
  assert.match(fragment('gkl'),/Abschnitt 13\.2/);
  assert.equal((fragment('gkl').match(/<p/g)||[]).length,1);
  assert.doesNotMatch(fragment('gkl'),/checkbox|Erwartungshorizont|Bepunktung/);
  assert.match(html,/Arbeitsjournal, gekennzeichnete Arbeitsergebnisse, Beobachtungen und individuelles Fachgespräch/);
});

test('New IDs are unique and chapter links point to existing definitions', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for (const id of ['klausuren-2','chemie-afb','gkl-afb-verweis','muedlich-erwartungshorizont','chemische-formulierungshilfen']) assert.ok(ids.includes(id));
  for (const file of ['chemie-curriculum.html','chemie-curriculum-2026.html','chemie-gkl.html']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/chemie-assessment|chemische-formulierungshilfen|gkl-afb-verweis/);
  }
});

test('Edited drafts are preserved on cancellation; reset and copy work without storage', async () => {
  const handlers = {}, output={value:'Eigene fachliche Beobachtung'}, status={textContent:''};
  const select={value:'15'}, inputs=[{value:'model',checked:true},{value:'experiment',checked:false}];
  const panel={hidden:true},question={textContent:''};
  const controls=Object.fromEntries(['compose','clear','copy','confirm','cancel'].map(key=>[key,{addEventListener:(event,fn)=>{handlers[key]=fn;}}]));
  const builder={querySelector:selector=>selector==='textarea'?output:selector==='[role="status"]'?status:selector==='select'?select:selector==='[data-confirmation]'?panel:selector==='[data-confirmation-message]'?question:controls[selector.match(/data-(\w+)/)[1]],
    querySelectorAll:selector=>selector==='input:checked'?inputs.filter(i=>i.checked):inputs};
  let copied='';
  const source=fs.readFileSync(path.join(root,'scripts/chemie-assessment.js'),'utf8');
  assert.doesNotMatch(source,/\bconfirm\s*\(|\balert\s*\(/);
  const generalRows=Object.entries(generalByPoints).map(([points,text])=>({querySelectorAll:()=>[{textContent:'Punktstufe · '+points},{textContent:text}]}));
  const context={document:{querySelectorAll:selector=>selector==='#abitur-bewertung ~ .table-wrap tbody tr'?generalRows:[builder]},navigator:{clipboard:{writeText:async text=>{copied=text;}}}};
  vm.runInNewContext(source,context);
  handlers.compose(); assert.equal(output.value,'Eigene fachliche Beobachtung');
  assert.equal(panel.hidden,false); handlers.cancel(); assert.equal(panel.hidden,true);
  handlers.clear(); assert.equal(output.value,'Eigene fachliche Beobachtung');
  handlers.cancel(); handlers.compose(); handlers.confirm(); assert.equal(output.value,compose(15,['model']));
  await handlers.copy(); assert.equal(copied,output.value);
  handlers.clear(); handlers.confirm(); assert.equal(output.value,''); assert.equal(select.value,'11');
  assert.ok(inputs.every(i=>!i.checked));
});

test('Rebuilding is byte-idempotent and never writes the other curricula or standalone GKL', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'chemie-assessment-test-'));
  try {
    fs.mkdirSync(path.join(temp,'scripts'));
    for (const file of ['build-chemie-assessment.cjs','chemie-assessment.js']) fs.copyFileSync(path.join(root,'scripts',file),path.join(temp,'scripts',file));
    fs.copyFileSync(path.join(root,working),path.join(temp,working));
    for (const file of ['chemie-curriculum.html','chemie-curriculum-2026.html','chemie-gkl.html']) fs.writeFileSync(path.join(temp,file),'MUST STAY UNCHANGED');
    execFileSync(process.execPath,[path.join(temp,'scripts/build-chemie-assessment.cjs')]);
    assert.equal(fs.readFileSync(path.join(temp,working),'utf8'),html);
    execFileSync(process.execPath,[path.join(temp,'scripts/build-chemie-assessment.cjs')]);
    assert.equal(fs.readFileSync(path.join(temp,working),'utf8'),html);
    for (const file of ['chemie-curriculum.html','chemie-curriculum-2026.html','chemie-gkl.html']) assert.equal(fs.readFileSync(path.join(temp,file),'utf8'),'MUST STAY UNCHANGED');
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
