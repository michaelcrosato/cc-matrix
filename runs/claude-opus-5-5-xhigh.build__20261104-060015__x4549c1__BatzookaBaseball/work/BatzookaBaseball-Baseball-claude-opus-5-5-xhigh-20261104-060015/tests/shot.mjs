// Screenshots for what a script can't judge (the look). Usage:
//   node tests/shot.mjs <hash> <out.png> [--size 1280x720] [--steps "wait:1500 press:Enter wait:500 shot:name eval:js"]
// Steps: wait:ms, press:Key, down:Key, up:Key, shot:name (another picture), eval:<js> (run in the page), mouse:x,y.
import { chromium } from 'playwright';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [hash = '', out = 'shot.png'] = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
const [w, h] = opt('size', '1280x720').split('x').map(Number);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + resolve(root, '..', NAME + '.html') + (hash ? '#' + hash : ''));
await page.waitForTimeout(1200);
const outDir = dirname(resolve(out));
for (const st of (opt('steps', '') || '').split(' ').filter(Boolean)) {
  const [k, ...rest] = st.split(':'), v = rest.join(':');
  if (k === 'wait') await page.waitForTimeout(+v);
  else if (k === 'press') await page.keyboard.press(v);
  else if (k === 'down') await page.keyboard.down(v);
  else if (k === 'up') await page.keyboard.up(v);
  else if (k === 'shot') await page.screenshot({ path: join(outDir, v + '.png') });
  else if (k === 'eval') console.log('eval:', JSON.stringify(await page.evaluate(v)));
  else if (k === 'mouse') { const [x, y] = v.split(',').map(Number); await page.mouse.move(x, y); }
  else if (k === 'click') { const [x, y] = v.split(',').map(Number); await page.mouse.click(x, y); }
}
await page.screenshot({ path: resolve(out) });
const snap = await page.evaluate(() => { try { return JSON.stringify(My3D2dge.current.debug.snapshot()); } catch (e) { return String(e); } });
const gerr = await page.evaluate(() => { try { return My3D2dge.current.errors.map(e => e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')); } catch (e) { return []; } });
console.log('snapshot', snap.slice(0, 600));
if (errors.length || gerr.length) console.log('ERRORS', [...new Set(errors)].slice(0, 6).join('\n'), gerr.slice(0, 6).join('\n'));
await browser.close();
