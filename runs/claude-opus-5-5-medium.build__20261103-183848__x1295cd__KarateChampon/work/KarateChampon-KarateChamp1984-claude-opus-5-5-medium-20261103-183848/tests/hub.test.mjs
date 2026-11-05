// Browser: the AI Hub's own harness, served on 127.0.0.1 at a port the OS picks (python3 -m http.server 0); the four runs
// the hub runs. The server is ours: it is stopped by its PID.
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { chromium } from '../engine/node_modules/playwright/index.mjs';
const root = new URL('../', import.meta.url), NAME = 'KarateChampon-KarateChamp1984-claude-opus-5-5-medium-20261103-183848.html';
export default async t => {
  const dir = new URL('tests/out/hub/', root); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/aihub/' + f, root), new URL(f, dir)); copyFileSync(new URL('../' + NAME, root), new URL('game.html', dir));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  let port; try { port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 10000); }); } catch (e) { srv.kill(); throw e; }
  const base = 'http://127.0.0.1:' + port + '/';
  const br = await chromium.launch();
  try {
    const pg0 = await br.newPage(); await pg0.goto(base + 'game.html'); t.check('the served page is our game', /Karate Champon/.test(await pg0.title()), await pg0.title()); await pg0.close();
    const runs = [['2 players', 'players=2&auto=1'], ['4 players, latency 150, jitter 50, loss 5', 'players=4&latency=150&jitter=50&loss=5&auto=1'], ['host leaves', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'], ['server', 'players=2&scenario=server&auto=1']];
    for (const [name, q] of runs) {
      const pg = await br.newPage({ viewport: { width: 1400, height: 900 } }); await pg.goto(base + 'harness.html?game=game.html&' + q);
      await pg.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).catch(() => {});
      const r = await pg.evaluate(() => window.__hubCheck || null);
      const bad = r && (r.checks || r.results || []).filter ? (r.checks || r.results || []).filter(c => c && (c.ok === false || c.pass === false || c.status === 'fail')) : [];
      t.check('harness: ' + name, r && r.pass === true, r ? JSON.stringify(bad.length ? bad : r).slice(0, 900) : 'no report');
      await pg.close();
    }
  } finally { await br.close(); srv.kill(); }
};
