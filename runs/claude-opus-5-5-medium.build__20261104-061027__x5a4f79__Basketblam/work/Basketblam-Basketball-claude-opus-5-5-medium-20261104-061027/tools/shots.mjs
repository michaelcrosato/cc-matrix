// screenshots of deep links: node tools/shots.mjs name#hash[@ms] ... (writes check-output/<name>.png)
import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const size = (process.env.SIZE || '1280x720').split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const spec of process.argv.slice(2)) {
  const [nh, ms = '2500'] = spec.split('@'), [name, hash = ''] = nh.split('#');
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300))); page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('my-3D2dge:')) errs.push(m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(resolve(process.env.PAGE || 'build/index.html')).href + (hash ? '#' + hash : ''));
  if (process.env.JS) { await page.waitForTimeout(600); await page.evaluate(process.env.JS); }
  await page.waitForTimeout(+ms);
  await page.screenshot({ path: `check-output/${name}.png` });
  console.log(name, errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok');
  await page.close();
}
await browser.close();
