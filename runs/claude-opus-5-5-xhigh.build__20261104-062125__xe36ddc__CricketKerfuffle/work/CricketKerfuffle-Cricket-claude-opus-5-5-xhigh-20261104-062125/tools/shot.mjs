// node tools/shot.mjs <hash> <out.png> [--size 427x240] [--steps "wait:1000 key:KeyJ wait:500 eval:js"] : a screenshot of
// the bundle (file://) at a deep link, after scripted steps; prints page errors. Used for the look checks (test/out/).
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../engine/package.json', import.meta.url));
const { chromium } = require('playwright');
const args = process.argv.slice(2), hash = args[0] || '', out = args[1] || 'test/out/shot.png';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [w, h] = opt('size', '427x240').split('x').map(Number), scale = +opt('scale', 3);
const file = new URL('../../CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125.html', import.meta.url);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w * scale, height: h * scale } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text()); });
await page.goto(file.href + (hash ? '#' + hash : ''));
await page.waitForTimeout(1500);
const steps = (opt('steps', '') || '').split(' ').filter(Boolean);
let n = 0; const shots = [];
for (const s of steps) {
  const [k, ...rest] = s.split(':'), v = rest.join(':');
  if (k === 'wait') await page.waitForTimeout(+v);
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'down') await page.keyboard.down(v);
  else if (k === 'up') await page.keyboard.up(v);
  else if (k === 'eval') await page.evaluate(v);
  else if (k === 'shot') { shots.push((await page.screenshot()).toString('base64')); n++; }
}
shots.push((await page.screenshot()).toString('base64'));
if (shots.length > 1) {
  const sheet = await browser.newPage({ viewport: { width: w * 4, height: Math.ceil(shots.length / 2) * h * 2 } });
  await sheet.setContent('<body style="margin:0;background:#000;display:grid;grid-template-columns:1fr 1fr;gap:0">' + shots.map(b => '<img style="width:' + (w * 2) + 'px;height:' + (h * 2) + 'px;image-rendering:pixelated" src="data:image/png;base64,' + b + '">').join('') + '</body>');
  await sheet.waitForTimeout(200); await sheet.screenshot({ path: out, fullPage: true });
} else await page.screenshot({ path: out });
const snap = await page.evaluate(() => { try { const s = window.__game.debug.snapshot(); return { scene: s.scene, phase: s.match && s.match.phase, cam: s.director.cam, errors: s.errors }; } catch (e) { return String(e); } });
console.log(JSON.stringify(snap)); if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
await browser.close();
