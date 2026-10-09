const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'kurslisten.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
function model() {
  const context = vm.createContext({ window: { crypto: webcrypto }, crypto: webcrypto,
    TextEncoder, TextDecoder, btoa, atob });
  vm.runInContext(scripts[1], context);
  vm.runInContext(scripts[2].slice(0, scripts[2].indexOf("document.addEventListener('click'")), context);
  return context;
}
test('all uploaded script blocks parse and all seven fonts resolve locally', () => {
  assert.equal(scripts.length, 3);
  scripts.forEach((s, i) => new vm.Script(s, { filename: `kurslisten-script-${i}.js` }));
  const fonts = [...html.matchAll(/src: url\('([^']+\.woff2)'\)/g)];
  assert.equal(fonts.length, 7);
  fonts.forEach(m => assert.ok(fs.existsSync(path.resolve(root, m[1])), m[1]));
  assert.doesNotMatch(html, /url\('\/Fonts\//);
});
test('publication starts with no courses and contains no private key', () => {
  const app = model();
  assert.equal(app.state.courses.length, 0);
  assert.equal(app.privateKey, null);
  assert.equal(app.PUBLIC_KEY.jwk.kty, 'RSA');
  for (const field of ['d', 'p', 'q', 'dp', 'dq', 'qi']) assert.equal(app.PUBLIC_KEY.jwk[field], undefined);
});
test('grade conversion, rounding and explicit overrides remain functional', () => {
  const app = model();
  assert.equal(app.toPoints('2−').val, 10);
  assert.equal(app.toPoints(16).ok, false);
  const pupil = app.blankStudent('Testperson');
  Object.assign(pupil, { k1: 10, k2: 11, s1: 12, s2: 13 });
  const result = app.calc(pupil);
  assert.equal(result.kG, 11);
  assert.equal(result.sG, 13);
  assert.equal(result.end, 12);
  pupil.endo = 9;
  assert.equal(app.calc(pupil).end, 9);
});
test('hybrid encryption protects content and can be decrypted with the matching key', async () => {
  const app = model();
  const keys = await webcrypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  app.PUBLIC_KEY = { keyId: 'test-only', jwk: await webcrypto.subtle.exportKey('jwk', keys.publicKey) };
  app.privateKey = keys.privateKey;
  const plain = { format: 'kursliste', courses: [{ students: [{ name: 'Fiktive Testperson', k1: 10 }] }] };
  const encrypted = await app.encryptPayload(plain);
  assert.equal(encrypted.format, 'kursliste-verschluesselt');
  assert.equal(Buffer.from(encrypted.key, 'base64').length, 384);
  assert.equal(Buffer.from(encrypted.iv, 'base64').length, 12);
  assert.ok(!JSON.stringify(encrypted).includes('Fiktive Testperson'));
  assert.deepEqual(JSON.parse(JSON.stringify(await app.decryptPayload(encrypted))), plain);
  encrypted.data = 'AAAA';
  await assert.rejects(app.decryptPayload(encrypted), /Entschlüsseln fehlgeschlagen/);
});
