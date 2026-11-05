// hub (browser): the real AI Hub harness, served from 127.0.0.1 on a port the OS picks: 2 players; 4 with latency 150,
// jitter 50 and 5% loss; the same with the host leaving; 2 with a server copy. window.__hubCheck.pass must be true.
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { chromium } from 'playwright';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), name = basename(root), bundle = join(root, '..', name + '.html');
export default async t => {
  const dir = join(root, '.tmp', 'hubsrv'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(root, 'vendor/aihub', f), join(dir, f));
  copyFileSync(bundle, join(dir, 'game.html'));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 10000); });
  try {
    const base = 'http://127.0.0.1:' + port + '/', page0 = await (await fetch(base + 'game.html')).text();
    t.check('the server serves our game', page0.includes('<title>Karate Champon</title>'));
    const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
    const runs = [['2 players', 'players=2'], ['4 players, latency 150, jitter 50, loss 5', 'players=4&latency=150&jitter=50&loss=5'], ['host leaves', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave'], ['server', 'players=2&scenario=server']];
    for (const [label, q] of runs) {
      const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
      await p.goto(base + 'harness.html?game=game.html&' + q + '&auto=1');
      try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }); } catch (e) { /* reported below */ }
      const r = await p.evaluate(() => window.__hubCheck || null);
      const fails = r && r.checks ? r.checks.filter(c => !c.pass && !c.ok).map(c => (c.name || c.label) + ': ' + (c.detail || '')) : [];
      t.check('hub harness: ' + label, !!(r && r.pass), r ? fails.slice(0, 5).join(' | ') || JSON.stringify(r).slice(0, 300) : 'no result');
      await p.close();
    }
    await b.close();
  } finally { srv.kill('SIGTERM'); }
};
