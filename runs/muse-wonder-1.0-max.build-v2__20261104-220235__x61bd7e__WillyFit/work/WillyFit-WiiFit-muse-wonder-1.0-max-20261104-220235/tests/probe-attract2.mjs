import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const built = join(root, '..', 'WillyFit-WiiFit-muse-wonder-1.0-max-20261104-220235.html');
const pw = await import('playwright');
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e=>console.log('PAGEERR', String(e).slice(0,200)));
await page.goto('file://' + built);
await page.evaluate(() => { window.__log = []; const g = window.G.game; const orig = g.go.bind(g); g.go = (n, d) => { window.__log.push('go:' + n + '@' + g.real.toFixed(1)); return orig(n, d); }; });
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => ({ scene: window.G.game.debug.snapshot().scene, real: window.G.game.real.toFixed(1), log: window.__log.join(' ') }));
  console.log(s.real, s.scene, '|', s.log);
  if (i > 22) break;
}
await browser.close();
