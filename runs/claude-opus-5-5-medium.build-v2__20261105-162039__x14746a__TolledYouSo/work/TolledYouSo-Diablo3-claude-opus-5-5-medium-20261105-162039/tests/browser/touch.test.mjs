// Touch-only: phone and tablet profiles. Message present and wrapped, settings button present, no touch controls, attract running, a tap doesn't start a game.
import { devices, webkit } from 'playwright';
import { pathToFileURL } from 'node:url';
import { ok, eq, guarded } from '../lib.mjs';
import { HTML, openGame, step } from '../../tools/browser.mjs';
await guarded(async () => {
  for (const name of ['Pixel 7', 'Galaxy Tab S4']) {
    const d = devices[name]; const { browser, page, errors } = await openGame({ width: d.viewport.width, height: d.viewport.height, context: { ...d, viewport: d.viewport } });
    eq(await page.evaluate(() => G.touchOnly), true, `${name}: detected as touch-only`);
    await step(page, 10);
    eq(await page.evaluate(() => G.shell.state), 'touch', `${name}: touch screen`);
    const msg = await page.evaluate(() => G.ui.drawnText.map((t) => t.text).join(' ')); ok(msg.replace(/\s+/g, ' ').includes('CONTROLLER OR KEYBOARD REQUIRED'), `${name}: message`);
    const inside = await page.evaluate(() => G.ui.drawnText.every((t) => t.x >= 0 && t.x + t.w <= G.ui.W)); ok(inside, `${name}: message wrapped to the screen`);
    eq(await page.evaluate(() => E.touch), null, `${name}: no touch controls`);
    ok(await page.evaluate(() => !!document.querySelector('.settings-button')), `${name}: settings button present`);
    await step(page, 620); eq(await page.evaluate(() => G.shell.state), 'attract', `${name}: attract runs`);
    const b = await page.evaluate(() => ({ s: G.ui.drawnText.map((t) => t.text).join(' ') })); ok(b.s.includes('DEMO'), `${name}: demo tag`);
    await page.touchscreen.tap(d.viewport.width / 2, d.viewport.height / 2); await page.waitForTimeout(60); await step(page, 3);
    eq(await page.evaluate(() => G.shell.state), 'touch', `${name}: a tap returns to the message`);
    await page.touchscreen.tap(d.viewport.width / 2, d.viewport.height / 2); await page.waitForTimeout(60); await step(page, 5);
    eq(await page.evaluate(() => G.shell.state), 'touch', `${name}: a tap does not start a game`);
    eq(errors.length, 0, `${name}: no page errors: ${errors[0]}`); await browser.close();
  }
  // WebKit with an iPhone profile: no WebGPU here, so it can only show the no-WebGPU page. It must, cleanly.
  { const b = await webkit.launch(); const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto(pathToFileURL(HTML).href); await p.waitForFunction(() => document.body.innerText.includes('WebGPU') || window.__GAME__, null, { timeout: 60000 }); const t = await p.evaluate(() => document.body.innerText); ok(t.includes('This game needs WebGPU') && t.includes('Tolled You So'), `no-WebGPU page: ${t.slice(0, 120)}`); eq(errs.length, 0, `WebKit page errors: ${errs[0]}`); await b.close(); }
});
