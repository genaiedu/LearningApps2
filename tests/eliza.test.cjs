const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const core = require('../scripts/eliza-core.js');
const html = fs.readFileSync(path.join(__dirname, '../eliza.html'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../scripts/eliza.js'), 'utf8');

test('German rules prioritize family, identity, feelings, needs and wishes', () => {
  for (const [input, rule] of [
    ['Meine Mutter sagt, ich bin neugierig.', 'family'],
    ['Verstehst du mich?', 'identity'],
    ['Ich fühle mich unsicher.', 'feel'],
    ['Ich brauche Ruhe.', 'need'],
    ['Ich wünsche mir mehr Zeit.', 'wish'],
    ['Ich kann nicht schlafen.', 'cannot'],
    ['Ich bin neugierig.', 'am'],
    ['Ich denke, das ist wichtig.', 'think'],
    ['Warum?', 'why'], ['Hallo!', 'hello'], ['Ja.', 'yes'], ['Nein!', 'no']
  ]) assert.equal(new core.Eliza().respond(input).rule, rule, input);
});
test('Responses vary, repetition is recognized, and reset discards all state', () => {
  const e = new core.Eliza();
  const first = e.respond('Meine Mutter liest.').text;
  assert.equal(e.respond('Meine Mutter liest.').rule, 'repeat');
  assert.notEqual(e.respond('Mein Vater liest.').text, first);
  assert.ok(e.memories.length);
  e.reset();
  assert.equal(e.memories.length, 0); assert.equal(e.counts.size, 0); assert.equal(e.turn, 0); assert.equal(e.last, '');
  assert.equal(e.respond('Meine Mutter liest.').text, first);
});
test('Limited memory recalls actual input rather than inventing personal facts', () => {
  const e = new core.Eliza();
  e.respond('Meine Mutter liest gern.');
  e.respond('Ein Buch liegt dort.'); e.respond('Es regnet draußen.');
  const r = e.respond('Die Wolke zieht vorüber.');
  assert.equal(r.rule, 'memory'); assert.ok(r.text.includes('Meine Mutter liest gern'));
  for (let i = 0; i < 30; i++) e.respond('Meine Familie ' + i);
  assert.ok(e.memories.length <= 4);
});
test('Crisis terms bypass conversational reflection, even on repeated messages', () => {
  const e = new core.Eliza();
  for (const text of ['Ich will mich umbringen.', 'Ich möchte nicht mehr leben.', 'Ich will mir wehtun.', 'Ich denke an Suizid.']) {
    assert.equal(e.respond(text).rule, 'safety');
    assert.equal(e.respond(text).rule, 'safety');
    assert.match(e.respond(text).text, /Simulation.*nicht geeignet/);
  }
});
test('Unicode normalization, bounded input and single-pass reflection', () => {
  assert.equal(core.clean('  Ä\nÖ\tÜ  '), 'Ä Ö Ü');
  assert.equal(core.clean('x'.repeat(4000)).length, 1200);
  assert.equal(core.reflect('ich habe meine Idee'), 'Sie haben Ihre Idee');
  assert.equal(new core.Eliza().respond('Ich fu\u0308hle mich müde.').rule, 'feel');
  assert.equal(new core.Eliza().respond('   ').rule, 'empty');
});

function setup({ supported = true, reject = false, reduced = true } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/eliza.html', runScripts: 'outside-only' });
  const w = dom.window, d = w.document;
  w.ElizaCore = core;
  w.matchMedia = () => ({ matches: reduced, addEventListener() {} });
  Object.defineProperty(d, 'fullscreenEnabled', { value: supported });
  let fullscreen = null;
  Object.defineProperty(d, 'fullscreenElement', { get: () => fullscreen });
  const terminal = d.getElementById('terminal');
  terminal.requestFullscreen = async () => {
    if (reject) throw new Error('Denied');
    fullscreen = terminal; d.dispatchEvent(new w.Event('fullscreenchange'));
  };
  d.exitFullscreen = async () => { fullscreen = null; d.dispatchEvent(new w.Event('fullscreenchange')); };
  const audio = { starts: 0, resumed: 0, suspended: 0, closed: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), connect() { return this; }, disconnect() {}, start() { audio.starts++; }, stop() {} });
  w.AudioContext = class {
    constructor() { this.state = 'running'; this.sampleRate = 48000; this.currentTime = 0; this.destination = {}; }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { return node(); } createBiquadFilter() { return node(); }
    createGain() { return node(); } createOscillator() { return node(); }
    async resume() { audio.resumed++; this.state = 'running'; }
    async suspend() { audio.suspended++; this.state = 'suspended'; }
    async close() { audio.closed++; this.state = 'closed'; }
  };
  w.eval(source);
  const get = id => d.getElementById(id);
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
  const send = async value => { get('message').value = value; get('terminal-form').dispatchEvent(new w.Event('submit', { cancelable: true })); await settle(); };
  const start = async () => { get('start-eliza').click(); await settle(); };
  return { dom, w, d, get, send, start, settle, audio };
}
test('Only real fullscreen unlocks the conversation; escape discards DOM, input and memory', async () => {
  const app = setup();
  await app.start();
  assert.equal(app.d.fullscreenElement.id, 'terminal');
  assert.equal(app.get('terminal').hidden, false);
  assert.equal(app.get('terminal-form').hidden, false);
  assert.equal(app.get('introduction').inert, true);
  await app.send('Meine Mutter liest.');
  assert.match(app.get('transcript').textContent, /Familie/);
  await app.d.exitFullscreen();
  assert.equal(app.get('terminal').hidden, true);
  assert.equal(app.get('transcript').textContent, '');
  assert.equal(app.get('message').value, '');
  assert.equal(app.get('introduction').inert, false);
  assert.equal(app.audio.closed, 1);
  await app.start();
  assert.doesNotMatch(app.get('transcript').textContent, /Meine Mutter/);
  assert.equal(app.d.activeElement.id, 'message');
  app.dom.window.close();
});
test('Missing or denied fullscreen has no windowed fallback', async () => {
  for (const options of [{ supported: false }, { reject: true }]) {
    const app = setup(options); await app.start();
    assert.equal(app.get('terminal').hidden, true);
    assert.equal(app.get('terminal-form').hidden, true);
    assert.match(app.get('launch-status').textContent, /Vollbild/);
    await app.send('Ein Test'); assert.equal(app.get('transcript').textContent, '');
    app.dom.window.close();
  }
});
test('Plain text only, local commands, no dialog storage or network', async () => {
  const app = setup(); await app.start();
  await app.send('<img src=x onerror=alert(1)>');
  assert.equal(app.get('transcript').querySelector('img'), null);
  assert.ok(app.get('transcript').textContent.includes('<img'));
  await app.send('/hilfe'); assert.match(app.get('transcript').textContent, /\/neu/);
  await app.send('/neu'); assert.doesNotMatch(app.get('transcript').textContent, /<img/);
  await app.send('/ende'); assert.equal(app.get('terminal').hidden, true);
  assert.equal(app.get('transcript').textContent, '');
  assert.equal(app.w.localStorage.length, 0);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon|WebSocket/);
  assert.match(html, /connect-src 'none'/);
  app.dom.window.close();
});
test('Keyboard clicks are input-only, suppress repeats/modifiers and obey mute', async () => {
  const app = setup(); await app.start();
  assert.equal(app.audio.starts, 0);
  const key = options => app.get('message').dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'a', ...options }));
  key({}); assert.equal(app.audio.starts, 2);
  key({ repeat: true }); key({ metaKey: true }); key({ isComposing: true });
  assert.equal(app.audio.starts, 2);
  app.get('sound-toggle').click(); key({});
  assert.equal(app.audio.starts, 2); assert.equal(app.audio.suspended, 1);
  assert.equal(app.get('sound-toggle').getAttribute('aria-pressed'), 'false');
  await app.send('Hallo!'); assert.equal(app.audio.starts, 2);
  app.dom.window.close();
});
test('Typewriter output can be finished and cancelled without ghost replies after exit', async () => {
  const app = setup({ reduced: false }); await app.start();
  assert.equal(app.get('terminal-form').hidden, true);
  app.get('instant-toggle').click();
  assert.equal(app.get('terminal-form').hidden, false);
  assert.match(app.get('transcript').textContent, /Worüber möchten Sie sprechen/);
  app.get('instant-toggle').click();
  await app.send('Hallo'); assert.equal(app.get('terminal-form').hidden, true);
  await app.d.exitFullscreen();
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(app.get('transcript').textContent, '');
  assert.equal(app.get('terminal-form').hidden, true);
  app.dom.window.close();
});
test('Escape key explicitly ends the fullscreen session', async () => {
  const app = setup(); await app.start();
  await app.send('Eine Nachricht');
  app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
  await app.settle();
  assert.equal(app.get('terminal').hidden, true);
  assert.equal(app.get('transcript').textContent, '');
  assert.equal(app.d.fullscreenElement, null);
  app.dom.window.close();
});
