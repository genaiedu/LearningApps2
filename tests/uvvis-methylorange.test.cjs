const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'uvvis-labor.html'), 'utf8');
assert.equal((html.match(/id="methylorange-mesomerie"/g) || []).length, 1);
assert.ok(html.indexOf('id="methylorange-mesomerie"') < html.indexOf('<h3>pH verändert die chemische Form</h3>'));
assert.ok(html.includes('Protonierung ist keine Mesomerie.'));
assert.ok(html.includes('Die Gesamtladung beträgt deshalb in beiden Fällen −1.'));
for (const kind of ['neutral', 'charge']) {
  const asset = 'assets/uvvis-methylorange-' + kind + '.svg';
  assert.ok(html.includes('href="' + asset + '"'));
  const svg = fs.readFileSync(path.join(root, asset), 'utf8');
  assert.ok(svg.includes('SO₃⁻'));
  assert.equal(svg.includes('>⁺</text>'), kind === 'charge');
  assert.equal(svg.includes('>⁻</text>'), kind === 'charge');
}
console.log('PASS methyl orange resonance figures, conserved charge, enlargement and separation from protonation.');
for (const kind of ['neutral', 'charge']) {
  const asset = 'assets/uvvis-methylorange-protonated-' + kind + '.svg';
  assert.ok(html.includes('href="' + asset + '"'));
  const svg = fs.readFileSync(path.join(root, asset), 'utf8');
  assert.ok(svg.includes('<path d="M410,140L410,160"/>'));
  assert.ok(svg.includes('<text x="410" y="187" fill="#8c465e">H</text>'));
  assert.ok(svg.includes('SO₃⁻'));
  assert.equal((svg.match(/>⁺<\/text>/g) || []).length, 1);
  assert.ok(!svg.includes('>⁻</text>'));
  assert.equal(svg.includes('<text x="121" y="100" fill="#255aa2">⁺</text>'), kind === 'charge');
  assert.equal(svg.includes('<text x="427" y="100" fill="#8c465e">⁺</text>'), kind === 'neutral');
}
assert.ok(html.includes('Gesamtladung 0'));
assert.ok(html.includes('Keine Protonenwanderung:'));
console.log('PASS protonated resonance structures preserve the N–H bond, net charge zero and correct formal-charge locations.');
