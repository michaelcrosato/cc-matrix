// The hub's harness: serve dist/ on an OS-picked port, run each scenario, stop the server by PID.
import { spawn } from 'node:child_process';
import { launch } from './lib.mjs';

const SCENARIOS = ['players=2', 'players=3&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'players=2&scenario=server'];
export async function run(ok) {
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: 'dist', stdio: ['ignore', 'pipe', 'ignore'] });
  const port = await new Promise((res, rej) => { srv.stdout.on('data', (d) => { const m = String(d).match(/port (\d+)/); if (m) res(+m[1]); }); setTimeout(() => rej(new Error('no port')), 8000); });
  const b = await launch();
  try {
    for (const sc of SCENARIOS) {
      const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&auto=1&${sc}`);
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 280000 }).catch(() => {});
      const r = await page.evaluate(() => window.__hubCheck);
      const failed = (r?.results ?? r?.checks ?? []).filter?.((c) => c.pass === false || c.ok === false).map((c) => `${c.name ?? c.label}: ${c.detail ?? ''}`) ?? [];
      ok(`hub ${sc}`, r?.pass === true, failed.slice(0, 5).join(' | ') || JSON.stringify(r)?.slice(0, 300));
      await ctx.close();
    }
  } finally { await b.close(); srv.kill(); }
}
