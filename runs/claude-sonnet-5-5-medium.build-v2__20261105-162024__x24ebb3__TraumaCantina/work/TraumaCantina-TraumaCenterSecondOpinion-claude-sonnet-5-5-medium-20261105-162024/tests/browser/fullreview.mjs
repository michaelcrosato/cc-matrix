// One clean 1080p review pass on the built page: every arena, Op 3 table, story set and bust.
import { launch, ROOT, waitReady } from './lib.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync(ROOT + '/check/final', { recursive: true });
const { browser, page, errs } = await launch({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + ROOT + '/dist/game.html'); await waitReady(page); await page.waitForTimeout(2500);
const shot = async (n, ms) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${ROOT}/check/final/${n}.png` }); };
for (const [id, st] of [['op1', 1], ['op2', 1], ['op4', 2], ['op5', 1], ['op6', 7], ['op7', 1], ['op8', 1], ['op9', 0], ['op10', 1]]) { await page.evaluate(([id, st]) => window.__GAME__.go.operation(window.__GAME__.ctx, { opId: id, noDive: true, noSave: true, botAll: true, startStage: st, cheats: { god: true } }), [id, st]); await shot('arena-' + id, 5000); }
await page.evaluate(() => window.__GAME__.go.operation(window.__GAME__.ctx, { opId: 'op3', noDive: true, noSave: true, cheats: { god: true } })); await page.waitForTimeout(3000);
for (const tb of [0, 1, 2]) { await page.evaluate((tb) => { window.__GAME__.op.sim.seats[0].tb = tb; }, tb); await shot('arena-op3-table' + tb, 2500); }
for (const sc of ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8', 'ep9', 'ep10', 'end']) {
  await page.evaluate((sc) => window.__GAME__.go.story(window.__GAME__.ctx, sc, {}), sc); await shot('set-' + sc, 3500);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(400); }
  await shot('bust-' + sc, 1500);
}
console.log('errs', errs); await browser.close();
