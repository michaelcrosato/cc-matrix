// the AI Hub harness's own conformance run (lib/hub/harness.html ?auto=1) against the bundled game: two players, four
// on a bad network, and the host leaving. Serves a copy of the harness and the game from tests/out/hub on 127.0.0.1 at
// a port the OS picks, checks the page there is this game before trusting anything, and stops only that server (by
// its PID). Prints JSON lines for tests/run.mjs.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), dir = join(root, 'tests/out/hub'), GAME = 'BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html';
const out = [], ok = (name, pass, detail = '') => out.push({ suite: 'hub', name, pass: !!pass, detail: pass ? '' : String(detail).slice(0, 900) });
mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(root, 'hub', f), join(dir, f));
copyFileSync(join(root, '..', GAME), join(dir, 'game.html'));
const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
let b = null;
try {
  const port = await new Promise((res, rej) => {
    let buf = ''; const t = setTimeout(() => rej(new Error('the server printed no port: ' + buf)), 10000);
    server.stdout.on('data', d => { buf += d; const m = buf.match(/port (\d+)/); if (m) { clearTimeout(t); res(Number(m[1])); } });
    server.on('exit', c => rej(new Error('the server quit (' + c + ')')));
  });
  const base = 'http://127.0.0.1:' + port + '/';
  b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  { const p = await b.newPage(); await p.goto(base + 'game.html'); const title = await p.title(), mine = await p.evaluate(() => !!(window.My3D2dge && document.querySelector('meta[name="hub:session"]')));
    ok('hub: the served page is this game', title === 'Big Buck Hunt-Off' && mine, title); await p.close();
    if (title !== 'Big Buck Hunt-Off') throw new Error('port ' + port + ' is not serving this game'); }
  for (const q of ['players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=2&scenario=host-leave']) {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } }), errs = [];
    p.on('pageerror', e => errs.push(String(e.message || e)));
    await p.goto(base + 'harness.html?game=game.html&auto=1&' + q);
    let rep = null;
    try { await p.waitForFunction(() => window.__hubCheck && window.__hubCheck.done, null, { timeout: 150000, polling: 500 }); rep = await p.evaluate(() => ({ pass: window.__hubCheck.pass, checks: window.__hubCheck.checks })); }
    catch (e) { rep = await p.evaluate(() => window.__hubCheck ? { pass: false, checks: window.__hubCheck.checks } : null).catch(() => null); }
    const bad = rep ? rep.checks.filter(c => !c.pass).map(c => c.name + (c.detail ? ': ' + c.detail : '')) : ['no report'];
    ok('hub harness ' + q + ': every conformance check passes (' + (rep ? rep.checks.length : 0) + ' checks)', rep && rep.pass && !bad.length && !errs.length, bad.concat(errs).join(' | '));
    await p.close();
  }
} catch (e) { ok('hub harness ran', false, e.stack || e); }
if (b) await b.close();
server.kill();   // the server this script started, by its own PID
for (const r of out) process.stdout.write(JSON.stringify(r) + '\n');
