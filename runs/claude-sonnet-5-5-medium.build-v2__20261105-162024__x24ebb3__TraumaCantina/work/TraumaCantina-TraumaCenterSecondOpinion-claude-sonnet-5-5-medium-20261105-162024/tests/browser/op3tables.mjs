import { launch, ROOT, waitReady } from './lib.mjs';
const { browser, page, errs } = await launch({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + ROOT + '/dist/game.html'); await waitReady(page); await page.waitForTimeout(2500);
await page.evaluate(() => window.__GAME__.go.operation(window.__GAME__.ctx, { opId: 'op3', noDive: true, noSave: true, cheats: { god: true } })); await page.waitForTimeout(3000);
for (const tb of [0, 1, 2]) { await page.evaluate((tb) => { window.__GAME__.op.sim.seats[0].tb = tb; }, tb); await page.waitForTimeout(2500); await page.screenshot({ path: `${ROOT}/check/o3-table${tb}.png` }); }
console.log('errs', errs); await browser.close();
