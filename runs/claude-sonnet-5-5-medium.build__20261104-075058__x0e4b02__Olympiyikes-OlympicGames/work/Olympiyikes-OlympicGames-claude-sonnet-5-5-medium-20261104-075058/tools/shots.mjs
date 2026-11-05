// screenshot helper: node tools/shots.mjs <page> <outPrefix> <script>
//   script = comma list of steps: wait:ms | press:Key | hold:Key:ms | shot:name | size:WxH | click:x,y | eval:js
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..');
const require = createRequire(path.join(root, 'vendor/my-3d2dge/dist/handoff/package.json'));
const { chromium } = require('playwright');
const [, , page = 'index.html', prefix = '.tmp/shot', script = 'wait:1500,shot:a'] = process.argv;
const url = page.startsWith('http') || page.startsWith('file:') ? page : pathToFileURL(path.resolve(root, page.split('#')[0])).href + (page.includes('#') ? '#' + page.split('#')[1] : '');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let w = 1280, h = 720; const ctxp = await browser.newContext(process.env.TOUCH ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } : { viewport: { width: w, height: h } }); const p = await ctxp.newPage();
const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto(url);
for (const st of script.split(/,(?=(?:wait|press|hold|shot|size|click|eval|mash):)/).map(s => s.trim()).filter(Boolean)) {
  const [k, ...a] = st.split(':');
  if (k === 'wait') await p.waitForTimeout(+a[0]);
  else if (k === 'press') await p.keyboard.press(a[0]);
  else if (k === 'hold') { await p.keyboard.down(a[0]); await p.waitForTimeout(+a[1] || 300); await p.keyboard.up(a[0]); }
  else if (k === 'shot') { await p.screenshot({ path: prefix + '-' + a[0] + '.png' }); }
  else if (k === 'size') { const [W, H] = a[0].split('x'); await p.setViewportSize({ width: +W, height: +H }); }
  else if (k === 'click') { const [x, y] = a[0].split('|').map(Number); await p.mouse.click(x, y); }
  else if (k === 'eval') { const r = await p.evaluate(a.join(':')); if (r !== undefined) console.log('eval ->', JSON.stringify(r)); }
  else if (k === 'mash') { const n = +a[0]; for (let i = 0; i < n; i++) { await p.keyboard.press(i % 2 ? 'KeyJ' : 'KeyK'); await p.waitForTimeout(70); } }
}
if (errs.length) console.log([...new Set(errs.map(e => e.split('\n')[0] + ' ' + (e.match(/src\/[^)]+/) || [''])[0]))].slice(0, 6).join('\n')); else console.log('no page errors');
await browser.close();
