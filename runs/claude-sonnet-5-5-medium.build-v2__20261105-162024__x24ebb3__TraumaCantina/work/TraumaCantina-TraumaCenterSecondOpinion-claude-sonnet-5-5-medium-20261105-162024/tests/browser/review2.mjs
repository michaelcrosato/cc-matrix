import { launch, ROOT, waitReady } from './lib.mjs';
const { browser, page, errs } = await launch({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + ROOT + '/dist/game.html'); await waitReady(page); await page.waitForTimeout(2500);
const shot = async (n, ms) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${ROOT}/check/r-${n}.png` }); };
for (const sc of ['ep8', 'ep10', 'end']) { await page.evaluate((sc) => window.__GAME__.go.story(window.__GAME__.ctx, sc, {}), sc); await shot('set-' + sc, 3500); for (let i = 0; i < 2; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(400); } await shot('bust-' + sc, 1500); }
await page.evaluate(() => window.__GAME__.go.operation(window.__GAME__.ctx, { opId: 'op3', noDive: true, noSave: true, cheats: { god: true } }));
await page.waitForTimeout(3500); for (const k of ['Tab', 'Tab']) { await page.keyboard.press(k); await page.waitForTimeout(1500); await shot('op3-table' + k + Math.random().toString(36).slice(2, 4), 500); }
console.log('errs', errs.slice(0, 5)); await browser.close();
