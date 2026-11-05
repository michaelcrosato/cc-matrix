// node tools/shot.mjs <page.html#hash> <out.png> [wait:1500] [press:Enter] [hold:KeyD:600] [js:expr] ...  : a screenshot after the steps; prints page errors
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [file, out, ...steps] = process.argv.slice(2);
const fm = file.match(/^([^?#]*)(\?[^#]*)?(?:#(.*))?$/), fp = fm[1], query = fm[2] || '', hash = fm[3];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push(String(e && e.stack || e).split('\n').slice(0, 3).join(' | '))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(resolve(fp)).href + query + (hash ? '#' + hash : ''));
let n = 0;
for (const s of steps.length ? steps : ['wait:1500']) {
  const [k, a, b] = s.split(':');
  if (k === 'wait') await page.waitForTimeout(+a); else if (k === 'press') { await page.keyboard.press(a); await page.waitForTimeout(150); } else if (k === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(+b || 400); await page.keyboard.up(a); }
  else if (k === 'js') { const r = await page.evaluate(s.slice(3)); if (r !== undefined) console.log('js:', JSON.stringify(r)); }
  else if (k === 'shot') { await page.screenshot({ path: out.replace('.png', '-' + (++n) + '.png') }); }
}
await page.screenshot({ path: out });
const snap = await page.evaluate(() => { const g = window.My3D2dge && window.My3D2dge.current; return g && g.debug && g.debug.snapshot(); });
console.log('snapshot', JSON.stringify(snap)); if (errors.length) console.log('ERRORS:\n' + errors.join('\n')); await browser.close();
