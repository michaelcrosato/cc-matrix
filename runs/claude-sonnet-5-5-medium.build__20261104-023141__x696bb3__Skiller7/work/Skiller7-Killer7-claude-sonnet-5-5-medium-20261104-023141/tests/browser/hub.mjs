// The AI Hub conformance run: the harness plays the hub, loads the game 2-4 times on a simulated network and checks it.
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), name = 'Skiller7-Killer7-claude-sonnet-5-5-medium-20261104-023141.html';
const dir = path.join(root, 'tests/out/hub'); fs.mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) fs.copyFileSync(path.join(root, 'vendor/aihub', f), path.join(dir, f));
fs.copyFileSync(path.resolve(root, '..', name), path.join(dir, name));
const players = process.argv[2] || '2', extra = process.argv[3] || '';
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
let port = null; await new Promise(res => { const on = d => { const m = /port (\d+)/.exec(String(d)) || /:(\d+)\//.exec(String(d)); if (m && !port) { port = m[1]; res(); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(res, 5000); });
let out = 0;
try {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 800 } })).newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|AudioContext/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  // confirm the page served is our game before trusting a result
  const r = await fetch(`http://127.0.0.1:${port}/${name}`); const txt = await r.text(); if (!/<title>Skiller7/.test(txt)) throw new Error('the served page is not Skiller7');
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=${name}&players=${players}&auto=1${extra}`);
  await page.waitForFunction(() => window.__hubCheck && window.__hubCheck.done, null, { timeout: 280000 });
  const rep = await page.evaluate(() => window.__hubCheck);
  for (const c of rep.checks) if (!c.pass) { console.log('FAIL ' + c.name + ': ' + c.detail); out = 1; }
  console.log(`hub ${players} players${extra}: ${rep.pass ? 'PASS' : 'FAIL'} (${rep.checks.length} checks)`); if (errs.length) console.log('page messages', errs.slice(0, 8)); if (!rep.pass) { out = 1; console.log((rep.log || []).slice(-40).join('\n')); }
  await browser.close();
} catch (e) { console.log('hub test error', e.message); out = 1; }
srv.kill('SIGTERM'); process.exit(out);
