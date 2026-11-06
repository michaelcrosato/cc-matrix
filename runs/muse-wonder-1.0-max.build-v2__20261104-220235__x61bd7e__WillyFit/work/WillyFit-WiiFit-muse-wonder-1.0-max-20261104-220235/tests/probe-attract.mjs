import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const built = join(root, '..', 'WillyFit-WiiFit-muse-wonder-1.0-max-20261104-220235.html');
const pw = await import('playwright');
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('file://' + built);
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(4000);
  console.log(i, JSON.stringify(await page.evaluate(() => ({ real: window.G.game.real, idle: window.G.idleSeconds(), snap: window.G.game.debug.snapshot(), paused: window.G.game.paused }))));
}
await page.keyboard.press('a');
await page.waitForTimeout(1200);
console.log('after key', JSON.stringify(await page.evaluate(() => window.G.game.debug.snapshot())));
await browser.close();
