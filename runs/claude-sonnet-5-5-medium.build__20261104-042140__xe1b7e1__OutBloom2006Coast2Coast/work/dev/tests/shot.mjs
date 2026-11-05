// screenshots of what only eyes can check:  node tests/shot.mjs scene[:json] ...
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url), file = readdirSync(root).find(f => /^OutBloom.*\.html$/.test(f));
const jobs = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(new URL(file, root).href);
await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName, null, { timeout: 30000 });
await page.waitForTimeout(1500);
for (const job of jobs) {
  const [name, data, wait, tag, js] = job.split('|');
  await page.evaluate(([n, d]) => { const g = My3D2dge.current; g.debug.go(n, d ? JSON.parse(d) : undefined); }, [name, data || '']);
  await page.waitForTimeout(Number(wait || 2500));
  if (js) { await page.evaluate(code => { const g = My3D2dge.current, R = g.scene.race; eval(code); }, js); await page.waitForTimeout(500); }
  await page.screenshot({ path: `.cache/shots/${tag || name}.png` });
  console.log('shot', tag || name);
}
console.log('errors', JSON.stringify(errs.slice(0, 8)), JSON.stringify(await page.evaluate(() => My3D2dge.current.errors.map(e => e.message).slice(0, 5))));
await browser.close();
