'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const script = read('scripts/lesepfad.js');
const css = read('styles/lesepfad.css');

test('only the two text-heavy apps opt into a local progressive reading layer', () => {
  for (const [page, app] of [['typografie-atelier', 'typografie'], ['spiegelwelt', 'spiegelwelt']]) {
    const html = read(page + '.html');
    assert.ok(html.includes('data-reading-app="' + app + '"'));
    assert.match(html, /href="styles\/lesepfad\.css\?v=[\w-]+"/);
    assert.ok(html.includes('defer src="scripts/lesepfad.js?v=' + (app === 'typografie' ? '20261019-vorwort' : '20261011-leserhythmus') + '"'));
    assert.ok(html.indexOf('scripts/lesepfad.js') > html.indexOf('scripts/schroedinger-wikipedia.js'));
  }
  assert.ok(!read('kunsttresor.html').includes('lesepfad'));
  assert.ok(!/https?:|@import|@font-face|localStorage|sessionStorage/.test(script + css));
  assert.ok(script.includes("if (!chapterNav) return"));
  assert.ok(script.includes("classList.contains('reading-ready')"));
});

test('original paragraphs, voices and live controls are moved without copying or rewriting', () => {
  assert.ok(script.includes('station.append(number, ...siblings)'));
  assert.ok(script.includes('track.append(controls, ...text)'));
  assert.ok(script.includes('pair.append(visual, track)'));
  assert.ok(!/innerHTML|outerHTML|replaceChildren|cloneNode|\.remove\(|\.textContent\s*=\s*['"]/.test(script));
  assert.ok(!/\.author-comment|\.author-essay/.test(css));
  const html = read('typografie-atelier.html');
  assert.equal((html.match(/<aside class="author-essay author-comment/g) || []).length, 19);
  for (const phrase of ['Du, der du diesen Text liest, bist mir wichtig.', 'Die Form wird zur Aussage.', 'Gute Typografie ist keine Schnörkelei']) {
    assert.ok(html.includes(phrase), phrase);
  }
});

test('multiline and emphasized headings retain every word in the navigation', () => {
  const expression = script.match(/const readingText = (.*);\n/)[1];
  const readingText = vm.runInNewContext('const readingText = ' + expression + '; readingText');
  const text = value => ({nodeType: 3, textContent: value});
  const heading = {nodeType: 1, nodeName: 'H2', childNodes: [text('Schrift.'), {nodeType: 1, nodeName: 'BR'}, {nodeType: 1, nodeName: 'EM', childNodes: [text(' Form.')]}, text(' Wirkung.')]};
  assert.equal(readingText(heading).replace(/\s+/g, ' ').trim(), 'Schrift. Form. Wirkung.');
  for (const label of ['I · Zeichen', 'II · Papier', 'III · Bildschirm', 'Nachschlagen & Weiterdenken']) assert.ok(script.includes(label));
  assert.ok(script.includes("'h3.subchapter[id],.history-station[id]'"));
});

test('native menu closes on Escape and restores keyboard orientation without erasing anchor history', () => {
  assert.ok(script.includes("make('details', 'reading-menu')"));
  assert.ok(script.includes("event.key === 'Escape'"));
  assert.ok(script.includes('summary.focus()'));
  assert.ok(script.includes("link.setAttribute('aria-current', 'location')"));
  assert.ok(script.includes('item.element.focus({ preventScroll: true })'));
  assert.ok(!/replaceState|pushState/.test(script));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('overscroll-behavior:contain'));
});

test('anchor clearance is applied once and oversized companion figures never stick', () => {
  assert.ok(css.includes('scroll-padding-top:var(--reading-offset,140px)'));
  assert.ok(css.includes('scroll-margin-top:0'));
  assert.ok(!css.includes('scroll-margin-top:var(--reading-offset'));
  assert.ok(script.includes("'--reading-offset', total + 24 + 'px'"));
  assert.ok(script.includes('innerHeight - total - 40'));
  assert.ok(css.includes('.reading-visual.reading-visual-tall{position:static}'));
  assert.ok(script.includes('observer.observe(visual)'));
});

test('models stack on small screens; original content survives printing and reduced motion', () => {
  for (const id of ['spiegel', 'mischung', 'kagan', 'soai']) assert.ok(script.includes("'" + id + "'"));
  assert.ok(css.includes('@media(max-width:800px)'));
  assert.ok(css.includes('.reading-pair{grid-template-columns:1fr'));
  assert.ok(css.includes('.reading-pair .reading-visual{position:static}'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('@media print'));
  assert.ok(css.includes('.reading-compass,.reading-next,.reading-route{display:none}'));
});

test('chapter numbers are legible orientation marks while retaining their accent and numeral style', () => {
  const rule = css.match(/\.reading-station-number\{([^}]+)\}/)[1];
  assert.ok(rule.includes('font:500 20px/1.4 var(--reading-sans)'));
  assert.ok(rule.includes('font-variant-numeric:lining-nums tabular-nums'));
  assert.ok(rule.includes('color:var(--reading-accent)'));
  const mobile = css.slice(css.indexOf('@media(max-width:760px)'));
  assert.ok(mobile.includes('.reading-station-number{font-size:18px}'));
});
