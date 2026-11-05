// the AI Hub harness's own checks, in Chromium, on a local server (127.0.0.1, a port the OS picks), stopped by its PID
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { build, NAME } from '../../tools/build.mjs';
export default async t => {
  build();
  const root = new URL('../../', import.meta.url), dir = new URL('test-output/hub-serve/', root);
  mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('hub/' + f, root), new URL(f, dir));
  copyFileSync(new URL('../' + NAME + '.html', root), new URL('game.html', dir));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('no port')), 8000); srv.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) { clearTimeout(to); res(+m[1]); } }); });
  const b = await chromium.launch();
  try {
    const p0 = await b.newPage(); await p0.goto(`http://127.0.0.1:${port}/game.html`); t('the served page is our game', (await p0.title()) === 'Ahead or Alive: Xtreme Beach Volleyball'); await p0.close();
    const runs = [['4 players, 150 ms ± 50, 5% loss', 'players=4&latency=150&jitter=50&loss=5&auto=1'], ['host leaves', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'], ['server hosts', 'players=2&scenario=server&auto=1'], ['one player', 'players=1&auto=1']];
    for (const [name, q] of runs) {
      const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
      await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
      await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 180000 }).catch(() => {});
      const rep = await p.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, fails: window.__hubCheck.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail) } : null);
      t('hub harness: ' + name, rep && rep.pass, rep ? rep.fails.join(' | ') : 'no report');
      await p.close();
    }
  } finally { await b.close(); srv.kill('SIGTERM'); }
};
