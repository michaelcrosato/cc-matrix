// screenshots for what scripts can't check: node test/shots.mjs name=hash[:js] ... (saved to test/out/<name>.png)
import { createRequire } from 'node:module';
const require = createRequire(new URL('../engine/package.json', import.meta.url));
const { chromium } = require('playwright');
const file = new URL('../dist/index.html', import.meta.url).href;
const size = (process.env.SIZE || '1280x720').split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /warn/.test(m.type())) errs.push(m.text()); });
for (const spec of process.argv.slice(2)) {
  const ei = spec.indexOf('='), name = spec.slice(0, ei), rest = spec.slice(ei + 1); const [hash, js, wait] = (rest || '').split('|');
  await page.goto(file + '?r=' + Math.random() + '#' + (hash || ''), { waitUntil: 'load' }); await page.waitForTimeout(+(process.env.PRE || 3500));
  if (js) await page.evaluate(js);
  await page.waitForTimeout(+(wait || 2500));
  await page.screenshot({ path: new URL('out/' + name + '.png', import.meta.url).pathname });
  const snap = await page.evaluate(() => { const g = My3D2dge.current; const s = g.debug.snapshot(); return { scene: s.scene, state: s.match && s.match.state, shot: s.director && s.director.shot, errors: g.errors.map(e => String(e.message || e)).slice(0, 3) }; });
  console.log(name, JSON.stringify(snap));
}
if (errs.length) console.log('PAGE ERRORS:', [...new Set(errs)].slice(0, 8).join('\n'));
await browser.close();
