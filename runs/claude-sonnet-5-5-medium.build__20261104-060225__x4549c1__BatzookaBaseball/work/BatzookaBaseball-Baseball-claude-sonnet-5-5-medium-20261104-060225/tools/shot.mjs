// node tools/shot.mjs <hash> <outprefix> [steps...]   steps: wait:ms | key:Code | hold:Code:ms | js:expr | shot:name
import { createRequire } from 'node:module';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire('/tmp/s55pw/');
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const file = resolve(root, '..', basename(root) + '.html');
const [hash, out, ...steps] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + (e.stack || e)));
page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /my-3D2dge/.test(m.text()))) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
await page.goto(pathToFileURL(file).href + '#' + (hash || 'title'));
await page.waitForTimeout(1500);
let n = 0;
for (const s of steps) {
  const [k, a, b] = s.split(':');
  if (k === 'wait') await page.waitForTimeout(+a);
  else if (k === 'adv') { await page.evaluate(sec => { const g = My3D2dge.current; g.advance(sec, { draw: true }); }, +a); }
  else if (k === 'until') { const max = +b || 60; const ex = a; const r = await page.evaluate(async ([ex, max]) => { const g = My3D2dge.current; let t = 0; while (t < max) { g.advance(.05, { draw: false }); t += .05; if (eval(ex)) break; } g.advance(.02, { draw: true }); return t; }, [ex, max]); console.log('until', ex, '->', r.toFixed(2)); }
  else if (k === 'key') { await page.keyboard.press(a); }
  else if (k === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(+b); await page.keyboard.up(a); }
  else if (k === 'js') { const r = await page.evaluate(s.slice(3)); if (r !== undefined) console.log('js ->', JSON.stringify(r)); }
  else if (k === 'shot') { await page.screenshot({ path: out + '-' + a + '.png' }); }
}
await page.screenshot({ path: out + '-final.png' });
console.log('errors:', errs.length ? '\n' + errs.slice(0, 12).join('\n') : 'none');
const snap = await page.evaluate(() => { try { return JSON.stringify(My3D2dge.current.debug.snapshot()); } catch (e) { return 'nosnap ' + e; } });
console.log('snapshot', snap);
await browser.close();
