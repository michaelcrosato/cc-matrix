// Screenshots for what a script can't judge: node tools/shot.mjs <page.html#hash> --steps "wait:1500 press:Enter wait:500 shot:name" [--size 1280x720]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2), file = args[0], opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const [w, h] = opt('size', '1280x720').split('x').map(Number), out = opt('out', '.tmp/shots');
mkdirSync(out, { recursive: true });
const [path, hash] = file.split('#');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await page.goto(pathToFileURL(resolve(path)).href + (hash ? '#' + hash : ''));
for (const s of opt('steps', 'wait:2000 shot:shot').split(' ')) {
  const [k, v, v2] = s.split(':');
  if (k === 'wait') await page.waitForTimeout(+v);
  else if (k === 'press') await page.keyboard.press(v);
  else if (k === 'down') await page.keyboard.down(v);
  else if (k === 'up') await page.keyboard.up(v);
  else if (k === 'shot') await page.screenshot({ path: out + '/' + v + '.png' });
  else if (k === 'eval') console.log(v, JSON.stringify(await page.evaluate(v.replace(/~/g, ' '))));
  else if (k === 'click') await page.mouse.click(+v, +v2);
  else if (k === 'move') await page.mouse.move(+v, +v2);
}
const snap = await page.evaluate(() => { const g = window.My3D2dge && window.My3D2dge.current; return g ? { snap: g.debug && g.debug.snapshot(), errors: g.errors.map(e => e.where + ': ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]) } : null; });
console.log(JSON.stringify(snap && snap.snap));
for (const e of (snap ? snap.errors : []).concat(errs)) console.log('ERR', e);
await browser.close();
