// Runs the AI Hub harness (hub/harness.html) against the built game, served from 127.0.0.1 on a port the OS picks.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';
const require = createRequire(process.env.PW_DIR || '/tmp/s55pw/'); const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..'), name = basename(root) + '.html';
copyFileSync(resolve(root, '..', name), resolve(root, 'hub', name));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: resolve(root, 'hub') });
let port = 0; await new Promise(res => { srv.stdout.on('data', d => { const m = String(d).match(/port (\d+)/); if (m) { port = +m[1]; res(); } }); srv.stderr.on('data', d => { const m = String(d).match(/port (\d+)/); if (m) { port = +m[1]; res(); } }); });
console.log('serving on', port, 'pid', srv.pid);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const players = process.argv[2] || '2';
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${port}/harness.html?game=${encodeURIComponent(name)}&players=${players}&auto=1&limit=40` + (process.argv[3] || ''));
const t0 = Date.now(); while (Date.now() - t0 < 480000) { const done = await page.evaluate(() => document.body.dataset.complete === 'true').catch(() => false); if (done) break; await page.waitForTimeout(5000); if ((Date.now() - t0) % 30000 < 5200) { const c = await page.evaluate(() => window.__hubCheck ? JSON.stringify(window.__hubCheck).slice(0, 400) : 'no report yet').catch(() => '?'); console.log(Math.round((Date.now() - t0) / 1000) + 's', c); } }
const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, check: window.__hubCheck }));
console.log('pass:', res.pass); console.log(JSON.stringify(res.check).slice(0, 2500)); console.log('page errors', errs.length ? errs : 'none');
await browser.close(); srv.kill();
