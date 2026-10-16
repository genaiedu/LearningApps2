const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../scripts/uvvis-labor.js'), 'utf8');
const start = source.indexOf('  device();window.UVVisOptics.mount();');
const end = source.indexOf('drawCalibration();', start);
assert.ok(start >= 0 && end > start);
const children = [];
const context = {
  device() { children.length = 0; },
  window: {
    UVVisOptics: { mount() { children.push('optics'); } },
    UVVisDevice3D: { mount() { children.push('spectrometer'); } },
  },
  document: { fonts: { ready: Promise.resolve() } },
};
vm.runInNewContext(source.slice(start, end), context);
setImmediate(() => {
  assert.deepEqual(children, ['optics', 'spectrometer']);
  console.log('PASS spectrometer and optical interior survive font readiness.');
});
