import { launch, ROOT, waitReady } from './lib.mjs';
const { browser, page, errs } = await launch({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + ROOT + '/dist/game.html'); await waitReady(page); await page.waitForTimeout(2500);
const shot = async (n, ms) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${ROOT}/check/r-${n}.png` }); };
const op = async (id, st, ms = 5000) => { await page.evaluate(([id, st]) => window.__GAME__.go.operation(window.__GAME__.ctx, { opId: id, noDive: true, noSave: true, botAll: true, startStage: st, cheats: { god: true } }), [id, st]); await shot('arena-' + id, ms); };
for (const [id, st] of [['op1', 1], ['op2', 1], ['op3', 0], ['op4', 2], ['op5', 1], ['op6', 7], ['op7', 1], ['op8', 1], ['op9', 0], ['op10', 1]]) await op(id, st);
for (const sc of ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep9']) { await page.evaluate((sc) => window.__GAME__.go.story(window.__GAME__.ctx, sc, {}), sc); await shot('set-' + sc, 3500); for (let i = 0; i < 3; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(400); } await shot('bust-' + sc, 1500); }
console.log('errs', errs.slice(0, 5)); await browser.close();
