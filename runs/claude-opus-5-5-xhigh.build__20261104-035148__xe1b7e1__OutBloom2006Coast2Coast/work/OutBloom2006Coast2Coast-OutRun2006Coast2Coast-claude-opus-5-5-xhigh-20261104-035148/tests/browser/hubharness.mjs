// the AI Hub harness: our bundle served from 127.0.0.1 on an OS-picked port next to harness.html, bridge.js and
// round.js; 2 players, then 4 with latency, jitter and loss, then the host leaving; each must pass
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url), up = new URL('../../../', import.meta.url), dir = new URL('.cache/hubtest/', root);
const NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-xhigh-20261104-035148.html';
export default async function (t) {
  mkdirSync(dir, { recursive: true });
  copyFileSync(new URL(NAME, up), new URL('game.html', dir));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/hub/' + f, root), new URL(f, dir));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 8000); });
  try {
    const b = await chromium.launch();
    const p0 = await b.newPage(); await p0.goto(`http://127.0.0.1:${port}/game.html`); await p0.waitForTimeout(1500); const title = await p0.title(); await p0.close();
    t('the server serves our game', title === 'OutBloom 2006: Coast 2 Coast', title);
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave']) {
      const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
      await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
      let done = false; for (let i = 0; i < 240 && !done; i++) { await p.waitForTimeout(1000); done = await p.evaluate(() => document.body.dataset.complete === 'true'); }
      const res = await p.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, fails: (window.__hubCheck.checks || window.__hubCheck.results || []).filter ? (window.__hubCheck.checks || window.__hubCheck.results || []).filter(c => c && (c.ok === false || c.pass === false)).map(c => c.name + ': ' + (c.detail || '')).slice(0, 6) : [] } : null);
      t('harness ' + q + ' passes', res && res.pass === true, JSON.stringify(res) + (done ? '' : ' (not complete)'));
      await p.close();
    }
    await b.close();
  } finally { srv.kill(); }
}
