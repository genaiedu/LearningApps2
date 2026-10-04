const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles/curriculum-ui.css'), 'utf8');

test('Every curriculum uses the updated shared scrollable table of contents', () => {
  const pages = ['physik-curriculum.html', 'biologie-curriculum.html',
    'chemie-curriculum.html', 'chemie-curriculum-2026.html',
    'chemie-curriculum-arbeitskopie.html', 'mensch-und-umwelt-curriculum.html',
    'projektkurs-wissenschaftskommunikation.html'];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /styles\/curriculum-ui\.css\?v=20261004-scroll/, page);
    assert.match(html, /scripts\/curriculum-ui\.js/, page);
  }
});

test('Mobile drawer has an explicit viewport height rather than its content height', () => {
  const mobile = css.slice(css.indexOf('@media screen and (max-width: 900px)'));
  const drawer = mobile.match(/body\.curriculum-mobile-toc-open \.layout\.curriculum-toc-collapsed > aside\s*\{([^}]+)\}/)[1];
  assert.match(drawer, /box-sizing:\s*border-box/);
  assert.match(drawer, /height:\s*100vh/);
  assert.match(drawer, /height:\s*100dvh/);
  assert.match(drawer, /max-height:\s*100dvh/);
  assert.match(drawer, /overflow-y:\s*auto/);
  assert.match(drawer, /overscroll-behavior-y:\s*contain/);
  assert.match(drawer, /safe-area-inset-bottom/);
  assert.match(mobile, /\.curriculum-toc-toggle\s*\{\s*position:\s*sticky/);
});

test('Desktop table of contents remains scrollable on short screens', () => {
  const sidebar = css.match(/\.layout > aside\s*\{([^}]+)\}/)[1];
  assert.match(sidebar, /max-height:\s*calc\(100dvh - 2rem\)/);
  assert.match(sidebar, /overflow-y:\s*auto/);
});

test('Sources are the final chapter, with matching sequential headings and navigation', () => {
  for (const page of ['physik-curriculum.html', 'biologie-curriculum.html',
    'chemie-curriculum.html', 'chemie-curriculum-2026.html',
    'chemie-curriculum-arbeitskopie.html', 'mensch-und-umwelt-curriculum.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const headings = [...html.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>(\d+) ([^<]+)<\/h2>/g)];
    assert.equal(headings.at(-1)[1], 'quellen', page);
    headings.forEach((heading, index) => {
      assert.equal(Number(heading[2]), index + 1, page + ': ' + heading[3]);
      assert.ok(html.includes(`<a href="#${heading[1]}">${heading[2]} ${heading[3]}</a>`), page);
    });
    const nav = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)[1];
    const numberedLinks = [...nav.matchAll(/<a href="#[^"]+">(\d+) /g)].map(m => Number(m[1]));
    assert.deepEqual(numberedLinks, headings.map(h => Number(h[2])), page);
    const source = html.match(/<section[^>]*><h2 id="quellen">[\s\S]*?<\/section>/)[0];
    assert.ok(html.includes(source + '</main>'), page);
  }
});
