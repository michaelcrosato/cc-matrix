// node test/browser/shot.mjs <page#hash> <name> "wait:1500 key:Enter wait:500 shot:a ..." [--size 1280x720]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const [page0, name = 'shot', script = 'wait:3000 shot:a'] = process.argv.slice(2);
const size = (process.argv.find(a => /^\d+x\d+$/.test(a)) || '1280x720').split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
const errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 600)));
page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /my-3D2dge/.test(m.text()))) errs.push(m.text().slice(0, 300)); });
page.on('requestfailed', r => errs.push('request failed: ' + r.url().slice(-80)));
const [file, hash] = page0.split('#');
await page.goto('file://' + resolve(file) + (hash ? '#' + hash : ''));
for (const step of script.split(/\s+/).filter(Boolean)) {
  const [k, v, v2] = step.split(':');
  if (k === 'wait') await page.waitForTimeout(+v);
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'down') await page.keyboard.down(v);
  else if (k === 'up') await page.keyboard.up(v);
  else if (k === 'click') await page.mouse.click(+v, +v2);
  else if (k === 'move') await page.mouse.move(+v, +v2);
  else if (k === 'eval') console.log(await page.evaluate(decodeURIComponent(v)));
  else if (k === 'shot') await page.screenshot({ path: `shots/${name}-${v}.png` });
  else if (k === 'fps') console.log('fps', await page.evaluate(() => { const g = window.FF.game; return JSON.stringify({ fps: Math.round(g.fps || 0), draw: g._drawMs, upd: g._updMs, scene: g.sceneName, phase: window.FF.sim.phase }); }));
}
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 8).join('\n') : 'no errors');
await browser.close();
