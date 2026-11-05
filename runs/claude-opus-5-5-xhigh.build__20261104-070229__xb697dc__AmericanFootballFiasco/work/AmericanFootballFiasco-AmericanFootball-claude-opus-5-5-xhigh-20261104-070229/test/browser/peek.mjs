// A quick look: open the dev page (or the bundle) at deep links, wait, screenshot. node test/browser/peek.mjs [page] [hash:wait:keys ...]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const page0 = process.argv[2] || 'index.html', shots = process.argv.slice(3);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
for (const s of shots) {
  const [hash, wait = '3000', keys = '', name = hash || 'title'] = s.split(':');
  await page.goto('about:blank'); await page.goto(pathToFileURL(resolve(page0)).href + (hash ? '#' + hash : ''));
  await page.waitForTimeout(+wait);
  for (const k of keys.split(',').filter(Boolean)) { if (k.startsWith('w')) await page.waitForTimeout(+k.slice(1)); else { await page.keyboard.down(k); await page.waitForTimeout(80); await page.keyboard.up(k); } }
  await page.screenshot({ path: 'shots/peek-' + name.replace(/\W/g, '_') + '.png' });
  const snap = await page.evaluate(() => window.FF && FF.game.debug.snapshot());
  console.log(name, JSON.stringify(snap));
}
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
