import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const built = join(root, '..', 'WillyFit-WiiFit-muse-wonder-1.0-max-20261104-220235.html');
const pw = await import('playwright');
const browser = await pw.chromium.launch();
async function shot(url, file, keys, waitMs) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs=[]; page.on('pageerror', e=>errs.push(String(e).slice(0,200)));
  await page.goto(url); await page.waitForTimeout(3000);
  if (keys) { for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(600); } }
  await page.waitForTimeout(waitMs || 1000);
  await page.screenshot({ path: join(root, 'shots', file) });
  console.log(file, JSON.stringify(await page.evaluate(()=>window.G.game.debug.snapshot())), 'errs', JSON.stringify(errs).slice(0,200));
  await page.close();
}
await shot('file://' + built + '#act/stork/1', 'stork-card.png', null, 500);
await shot('file://' + built + '#act/stork/1', 'stork-play.png', ['Enter'], 8000);
await shot('file://' + built + '#island', 'island2.png', null, 500);
await browser.close();
