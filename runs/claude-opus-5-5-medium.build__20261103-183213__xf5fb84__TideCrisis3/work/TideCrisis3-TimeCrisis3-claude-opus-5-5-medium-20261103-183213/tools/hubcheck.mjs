// The AI Hub harness in Chromium: copies the bundle and the harness files into hubtest/, serves them on 127.0.0.1 on a
// port the OS picks, confirms the page is ours, runs the four scenarios the hub runs, prints PASS/FAIL lines, and stops
// only the server it started (by its PID).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname, NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-medium-20261103-183213';
const dir = root + 'hubtest/'; mkdirSync(dir, { recursive: true });
copyFileSync(root + '../' + NAME + '.html', dir + 'game.html');
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(root + 'hub/' + f, dir + f);
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
process.on('exit', () => { try { srv.kill(); } catch (e) { /* already stopped */ } });
const port = await new Promise((res, rej) => { const tm = setTimeout(() => { srv.kill(); rej(new Error('no port')); }, 8000); const on = d => { const m = /port (\d+)/.exec(String(d)); if (m) { clearTimeout(tm); res(+m[1]); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
const base = `http://127.0.0.1:${port}/`;
const scen = (process.argv[2] ? [process.argv[2]] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const p0 = await b.newPage(); await p0.goto(base + 'game.html'); const title = await p0.title(); await p0.close();
  if (!/Tide Crisis 3/.test(title)) { console.log('FAIL hub: the served page is not the game (' + title + ')'); }
  for (const q of scen) {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + 'harness.html?game=game.html&' + q);
    try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: +(process.env.HUBWAIT || 240000) }); } catch (e) { console.log('FAIL hub ' + q + ': timed out'); }
    const res = await p.evaluate(() => JSON.stringify(window.__hubCheck || null));
    const r = JSON.parse(res || 'null');
    if (r && r.pass) console.log('PASS hub ' + q); else { console.log('FAIL hub ' + q + ': ' + JSON.stringify(r && (r.failed || r.checks || r)).slice(0, 900)); }
    if (process.env.SHOT) await p.screenshot({ path: root + '.tmp/hub-' + scen.indexOf(q) + '.png' });
    if (errs.length) console.log('FAIL hub ' + q + ' page errors: ' + errs.slice(0, 3).join(' | '));
    await p.close();
  }
} finally { await b.close(); srv.kill(); }
