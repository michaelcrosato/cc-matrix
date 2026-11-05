import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const file = resolve(process.argv[2]);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e)));
await page.goto(pathToFileURL(file).href); await page.waitForTimeout(1800);
await page.evaluate(() => {
  const G = My3D2dge.current; window.__log = [];
  G.debug.startMatch({ mode: 'quick', overs: 2, wickets: 3, diff: 0, opp: 'witt', ground: 'green', chaos: 'none', seed: 21 });
  setInterval(() => {
    const M = G.debug.match(); if (!M) return;
    if (M.ph === 'flight' && !M.swing && M.ball.phase === 'delivery') {
      const tl = (M.ball.y - 364) / Math.max(40, Math.abs(M.ball.vy));
      if (tl < .13) { G.input.press('KeyJ'); setTimeout(() => G.input.release('KeyJ'), 40); window.__log.push('press tl=' + tl.toFixed(3)); }
    }
    if (M.ph === 'inplay') { G.input.press('Space'); }
    else G.input.release('Space');
    if (M.ph === 'setup' && M.sideBowl().ctrl === 'p1') { G.input.press('KeyJ'); setTimeout(() => G.input.release('KeyJ'), 40); }
  }, 8);
});
await page.waitForTimeout(40000);
console.log(await page.evaluate(() => JSON.stringify({ log: window.__log.slice(0, 12), snap: My3D2dge.current.debug.snapshot() })));
console.log(errs.join('\n') || 'no errors');
await browser.close();
