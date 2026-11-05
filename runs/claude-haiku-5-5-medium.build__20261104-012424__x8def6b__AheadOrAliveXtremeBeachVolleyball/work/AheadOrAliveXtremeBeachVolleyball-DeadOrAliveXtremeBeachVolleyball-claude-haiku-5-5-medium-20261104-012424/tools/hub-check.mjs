// Runs the AI Hub harness against the deliverable: copies the page and the harness into test-output/hub-serve, starts a
// Python server on 127.0.0.1 with a port the OS picks, checks the served page is ours, runs one scenario and stops the
// server by its own PID. Usage: node tools/hub-check.mjs [players] [scenario] [latency] [jitter] [loss]
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.resolve(DEV, '..');
const [players = '4', scenario = 'standard', latency = '0', jitter = '0', loss = '0'] = process.argv.slice(2);
const game = fs.readdirSync(WORK).find(f => f.endsWith('.html') && f.startsWith('AheadOrAlive'));
const dir = path.join(DEV, 'test-output', 'hub-serve');
fs.mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) fs.copyFileSync(path.join(DEV, 'hub', f), path.join(dir, f));
fs.copyFileSync(path.join(WORK, game), path.join(dir, game));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('no port')), 10000);
  const onData = d => { const m = /port (\d+)/.exec(String(d)); if (m) { clearTimeout(t); resolve(m[1]); } };
  srv.stdout.on('data', onData); srv.stderr.on('data', onData);
});
let code = 1;
try {
  const base = `http://127.0.0.1:${port}`;
  const head = await (await fetch(`${base}/${game}`)).text();
  if (!/AHEAD OR ALIVE|Ahead or Alive/.test(head)) throw new Error('the served page is not the game');
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const q = `harness.html?game=${encodeURIComponent(game)}&players=${players}&latency=${latency}&jitter=${jitter}&loss=${loss}&auto=1&scenario=${scenario}`;
  await page.goto(`${base}/${q}`);
  await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000, polling: 1000 });
  const rep = await page.evaluate(() => window.__hubCheck);
  console.log(`hub ${players} players, scenario ${scenario}: ${rep && rep.pass ? 'pass' : 'FAIL'}`);
  for (const c of (rep && rep.checks) || []) if (!c.pass) console.log('  FAIL ' + (c.name || '') + ': ' + (c.detail || ''));
  if (process.env.HUBLOG) console.log(JSON.stringify((rep && rep.checks) || [], null, 0).slice(0, 3000));
  if (process.env.HUBLOG) for (const l of ((rep && rep.log) || []).slice(-60)) console.log('  log ' + l.slice(0, 220));
  code = rep && rep.pass ? 0 : 1;
  await browser.close();
} catch (e) {
  console.log('hub check error: ' + e.message.slice(0, 300));
} finally {
  srv.kill('SIGTERM');
}
process.exit(code);
