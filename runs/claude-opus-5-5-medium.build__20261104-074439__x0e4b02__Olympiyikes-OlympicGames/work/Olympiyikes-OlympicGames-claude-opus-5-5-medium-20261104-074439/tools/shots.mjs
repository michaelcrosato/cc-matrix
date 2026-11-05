// Screenshots of the bundle at deep links: node tools/shots.mjs [w]x[h] name=#hash:waitMs[:keys] ...
import { createRequire } from 'node:module';
const require = createRequire(new URL('../vendor/my-3d2dge/dist/handoff/package.json', import.meta.url));
const { chromium } = require('playwright');
const BUNDLE = new URL('../../Olympiyikes-OlympicGames-claude-opus-5-5-medium-20261104-074439.html', import.meta.url).href;
const [size, ...specs] = process.argv.slice(2); const [W, H] = size.split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const spec of specs) {
  const [name, rest] = spec.split('='); const [hash, wait, keys] = rest.split(':');
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BUNDLE + hash); await page.waitForTimeout(+wait || 1500);
  if (keys) for (const k of keys.split(',')) { if (k.startsWith('w')) await page.waitForTimeout(+k.slice(1)); else if (k.startsWith('h')) { await page.keyboard.down(k.slice(1)); } else if (k.startsWith('u')) { await page.keyboard.up(k.slice(1)); } else { await page.keyboard.press(k); await page.waitForTimeout(120); } }
  await page.screenshot({ path: new URL('../.tmp/shots/' + name + '.png', import.meta.url).pathname });
  const snap = await page.evaluate(() => { try { return JSON.stringify(window.__oly && window.__oly.game.debug.snapshot()).slice(0, 300); } catch (e) { return String(e); } });
  console.log(name, errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok', snap);
  await page.close();
}
await browser.close();
