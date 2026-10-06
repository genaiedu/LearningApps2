const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
  fs.readFile(file, (e, bytes) => {
    res.writeHead(e ? 404 : 200, {'Content-Type': ({'.css':'text/css','.js':'text/javascript','.wasm':'application/wasm','.html':'text/html','.json':'application/json'})[path.extname(file)] || 'application/octet-stream'});
    res.end(e ? 'Not found' : bytes);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--no-sandbox']});
  try {
    const p = await browser.newPage({viewport:{width:1750,height:1100}}), errors = [], external = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', r => {if (!r.url().startsWith(origin) && !/^(data|blob):/.test(r.url())) external.push(r.url());});
    const state = () => p.evaluate(() => UVVisLab.snapshot());
    const next = async n => {
      await p.locator('#coach-next').click();
      assert.match(await p.locator('#coach-counter').textContent(), new RegExp('Schritt ' + n + ' /'));
    };
    const reset = async () => {
      await p.locator('#lab-reset').click();
      await p.locator('#reset-dialog button[value="reset"]').click();
    };
    await p.goto(origin + '/LearningApps2/uvvis-labor.html');
    await p.getByRole('button', {name:'Ohne Wikipedia beginnen',exact:true}).click();
    await p.waitForFunction(() => UVVisLab.snapshot().record?.id === 'L03');
    const before = await state();
    await p.locator('#measurement-assistant').click();
    assert.deepEqual(await state(), before, 'Opening the coach does not mutate the lab');
    await p.locator('#coach-spectrum').click();
    await next(2); await next(3);
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    await p.screenshot({path:'/tmp/uvvis-assistant-open.png'});
    await p.locator('#lid').click(); await next(4);
    await p.locator('#insert').click(); await next(5);
    await p.locator('#lid').click(); await next(6);
    await p.locator('#blank').click(); await next(7);
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    await p.locator('#lid').click(); await next(8);
    await p.locator('#insert').click(); await next(9);
    await p.locator('#lid').click(); await next(10);
    await p.locator('#scan-speed').selectOption('2000');
    await p.locator('#scan').click();
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    await p.waitForTimeout(350);
    await p.locator('#stop').click();
    assert.equal(await p.locator('#coach-next').isEnabled(), false, 'Partial scan does not complete the guided measurement');
    await p.locator('#scan').click();
    await p.waitForFunction(() => !UVVisLab.snapshot().scanning);
    assert.equal(await p.locator('#coach-next').isEnabled(), true);
    assert.match(await p.locator('#coach-counter').textContent(), /Schritt 10 /, 'No automatic step advance');
    await next(11); await next(12); await p.locator('#coach-next').click();
    assert.equal(await p.locator('#measurement-coach').isVisible(), false);
    assert.equal(await p.locator('.legend-item').count(), 2);
    await p.locator('#wavelength').fill('591'); await p.locator('#wavelength').press('Tab');
    await p.locator('#measurement-assistant').click(); await p.locator('#coach-concentration').click();
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    await p.locator('#unknown-mode').click(); await next(2); await next(3);
    // A valid blank and inserted sample can be reused without erasing previous curves.
    for (let n = 4; n <= 10; n++) await next(n);
    await p.locator('#standard-blank').click(); await next(11);
    const c = (await state()).standardSuggestion;
    await p.locator('#standard-c').fill(String(c)); await p.locator('#standard-measure').click(); await next(12);
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    await p.locator('#standard-c').fill(String(c * 2)); await p.locator('#standard-measure').click(); await next(13);
    await next(14); await p.locator('#unknown-measure').click(); await next(15);
    const measured = await state();
    assert.equal(Object.hasOwn(measured, 'unknownOriginal'), false);
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    await p.locator('#answer-c').fill('999'); await p.locator('#check-c').click();
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    await p.locator('#answer-c').fill(String((measured.unknownA - measured.fit.intercept) / measured.fit.slope));
    await p.locator('#check-c').click(); await next(16);
    await p.locator('#coach-next').click();
    assert.equal(await p.locator('.legend-item').count(), 2);
    await p.locator('#measurement-assistant').click(); await p.locator('#coach-concentration').click();
    await next(2); await next(3);
    await p.locator('#wavelength').fill('600'); await p.locator('#wavelength').press('Tab');
    await p.waitForFunction(() => document.getElementById('coach-counter').textContent.includes('Schritt 2 /'));
    assert.equal(await p.locator('#standards tr').count(), 0);
    await reset();
    await p.locator('#coach-welcome').waitFor({state:'visible'});
    assert.equal(await p.locator('#coach-welcome').isVisible(), true);
    await p.locator('#explore-mode').click();
    await p.locator('#fullscreen').click();
    await p.locator('#coach-spectrum').click(); await next(2); await next(3);
    assert.equal(await p.evaluate(() => document.getElementById('labor').contains(document.getElementById('measurement-coach'))), true);
    await p.locator('#coach-show').click(); await p.locator('#lid').click();
    await p.screenshot({path:'/tmp/uvvis-assistant-fullscreen.png'});
    await p.locator('#coach-fold').click();
    assert.equal(await p.locator('#coach-body').isVisible(), false);
    await p.locator('#coach-fold').click();
    await p.locator('#fullscreen').click();
    for (const width of [390,768]) {
      await p.setViewportSize({width,height:900});
      await p.locator('#coach-show').click();
      await p.waitForTimeout(100);
      const layout = await p.evaluate(() => {
        const t = document.getElementById('lid').getBoundingClientRect(), c = document.getElementById('measurement-coach').getBoundingClientRect();
        return {overflow:document.documentElement.scrollWidth > innerWidth + 1, targetVisible:t.top >= 0 && t.bottom < c.top, coachVisible:c.bottom <= innerHeight && c.left >= 0};
      });
      assert.equal(layout.overflow, false); assert.equal(layout.targetVisible, true); assert.equal(layout.coachVisible, true);
      await p.locator('#lid').click();
      if (width === 390) await p.screenshot({path:'/tmp/uvvis-assistant-mobile.png'});
    }
    await p.locator('#coach-close').click();
    assert.equal(await p.locator('.coach-target').count(), 0);
    await p.locator('#search').fill('Methylorange');
    await p.locator('[data-id="PH-J03"]').click();
    await p.locator('#measurement-assistant').click(); await p.locator('#coach-restart').click();
    await p.locator('#coach-concentration').click();
    assert.equal(await p.locator('#coach-next').isEnabled(), false);
    assert.equal(await p.locator('#coach-library').isVisible(), true);
    await p.locator('#coach-library').click();
    await p.waitForFunction(() => document.getElementById('search').classList.contains('coach-target'));
    assert.equal(await p.locator('#search').evaluate(el => el.classList.contains('coach-target')), true);
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log('PASS guided spectrum + unknown calibration, real action gates, no auto-advance, no secret disclosure/mutations, invalidation, reset, fullscreen, mobile targets and no external requests/errors.');
  } finally {await browser.close(); server.close();}
})().catch(e => {console.error(e); server.close(); process.exitCode = 1;});
