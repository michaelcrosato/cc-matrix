// runs the AI Hub harness (vendor/hub/harness.html) against the bundled game, headless Chromium, our own 127.0.0.1 server on an OS-picked port
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..');
const require = createRequire(path.join(root, 'vendor/my-3d2dge/dist/handoff/package.json'));
const { chromium } = require('playwright');
const qs = process.argv[2] || 'players=2&auto=1';
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: path.join(root, 'vendor/hub') });
let port = await new Promise(res => { srv.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) res(+m[1]); }); srv.stderr.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) res(+m[1]); }); });
let code = 1;
try {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=oly-game.html&${qs}`);
  await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }).catch(() => {});
  const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, check: window.__hubCheck }));
  const bad = []; const walk = (o, p) => { if (o && typeof o === 'object') for (const k in o) { if (o[k] === false || (o[k] && o[k].ok === false)) bad.push(p + k); else walk(o[k], p + k + '.'); } };
  console.log('hub check pass =', res.pass); if (!res.pass) { console.log(JSON.stringify(res.check).slice(0, 1800)); }
  if (errs.length) console.log('page errors:', errs.slice(0, 3));
  code = res.pass ? 0 : 1; await browser.close();
} finally { srv.kill(); }
process.exit(code);
