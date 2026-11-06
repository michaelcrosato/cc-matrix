import { launch, ROOT, waitReady } from './lib.mjs';
const { browser, page, errs } = await launch({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + ROOT + '/dist/game.html'); await waitReady(page); await page.waitForTimeout(2500);
await page.evaluate(() => window.__GAME__.go.operation(window.__GAME__.ctx, { opId: 'op6', noDive: true, noSave: true, botAll: true, startStage: 4, cheats: { god: true } }));
let shotA = false;
for (let i = 0; i < 40; i++) { await page.waitForTimeout(1500); const st = await page.evaluate(() => { const s = window.__GAME__.op.sim; return [s.stage, !!s.flags['done:unart'], !!s.flags['done:newK']]; });
  if (!shotA && st[2] && !st[1]) { await page.screenshot({ path: ROOT + '/check/k6-grey.png' }); shotA = true; console.log('grey shot', st); }
  if (st[1]) { await page.waitForTimeout(5000); await page.screenshot({ path: ROOT + '/check/k6-pink.png' }); console.log('pink shot', st); break; } }
console.log('errs', errs); await browser.close();
