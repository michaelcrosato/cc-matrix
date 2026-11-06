// Menu and drama screens at 1080p, for looking at.
import { launch, openGame } from './lib.mjs';
const b = await launch();
const { page, errors } = await openGame(b, '', { viewport: { width: 1920, height: 1080 } });
const shot = (n) => page.screenshot({ path: `tests/tmp/s-${n}.png` });
const key = async (k, wait = 900) => { await page.keyboard.press(k, { delay: 150 }); await page.waitForTimeout(wait); };
await page.waitForTimeout(1000);
await key('Enter', 1500); await shot('main');
const list = process.argv.slice(2);
const want = (n) => !list.length || list.includes(n);
if (want('settings')) { await page.evaluate(() => window.__GAME__.stage.overlay('SettingsOverlay')); await page.waitForTimeout(1200); await shot('settings'); await page.evaluate(() => { window.__TRAUMA_APP__.overlays.length = 0; }); }
if (want('about')) { await page.evaluate(() => window.__GAME__.stage.overlay('AboutOverlay')); await page.waitForTimeout(1200); await shot('about'); await page.evaluate(() => { window.__TRAUMA_APP__.overlays.length = 0; }); }
// A results screen: finish op1 with the dev action.
if (want('results')) {
  await page.evaluate(async () => { window.__TRAUMA_APP__.newRun('resident'); });
  await page.goto(page.url() + '?op=op1&stage=4&bot=1');
  await page.waitForFunction(() => window.__GAME__?.stage?.sim, null, { timeout: 60000 });
  await page.waitForFunction(() => window.__GAME__.stage.name === 'results', null, { timeout: 120000 });
  await page.waitForTimeout(9000);
  await shot('results');
}
if (want('pause')) {
  await page.goto(page.url().split('?')[0] + '?op=op5&stage=3');
  await page.waitForFunction(() => window.__GAME__?.stage?.sim, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await key('Escape', 1200); await shot('pause');
  await page.evaluate(async () => { const m = window.__TRAUMA_APP__.overlays[0]; m.menu.items[4].onConfirm(); });
  await page.waitForTimeout(900); await shot('dev');
  await page.evaluate(() => { const o = window.__TRAUMA_APP__.overlays[1]; o.tab = 2; o.build(); });
  await page.waitForTimeout(900); await shot('devjump');
}
if (want('code')) {
  await page.goto(page.url().split('?')[0] + '?op=op5&stage=3&bot=0.7');
  await page.waitForFunction(() => window.__GAME__?.stage?.sim, null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  await shot('introit');
  await page.evaluate(async () => { const s = window.__GAME__.stage.sim; s.seats[0].bot.idle = true; s.tables[0].vitals = 0; });
  await page.waitForTimeout(1500); await shot('codeblue');
}
console.log(errors.slice(0, 6), await page.evaluate(() => window.__PIXEL_ENGINE__.errors.slice(0, 5)));
await b.close();
