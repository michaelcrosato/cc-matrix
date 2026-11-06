// The hub's own checks: serve dist/ on an OS-picked port, run the harness scenarios, print failures.
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { launch, ROOT } from './lib.mjs';

const SCENARIOS = ['auto=1&players=2', 'auto=1&players=3&latency=150&jitter=50&loss=5', 'auto=1&players=4&latency=150&jitter=50&loss=5', 'auto=1&players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'auto=1&players=2&scenario=server'];

export async function runHub(only) {
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: join(ROOT, 'dist'), stdio: ['ignore', 'pipe', 'ignore'] });
  const port = await new Promise((res, rej) => {
    srv.stdout.on('data', (d) => { const m = String(d).match(/port (\d+)/); if (m) res(Number(m[1])); });
    setTimeout(() => rej(new Error('no port')), 8000);
  });
  const fails = [];
  let count = 0;
  const b = await launch(['--no-sandbox']);
  try {
    const list = only ? SCENARIOS.filter((s) => only.some((o) => s.includes(o))) : SCENARIOS;
    for (const sc of list) {
      count++;
      const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${sc}`);
      try {
        await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 });
        const rep = await page.evaluate(() => window.__hubCheck);
        if (!rep.pass) fails.push(`hub ${sc}: ${rep.checks.filter((c) => !c.pass).map((c) => `${c.name} [${c.detail}]`).join('; ')}`);
      } catch (e) {
        const rep = await page.evaluate(() => window.__hubCheck).catch(() => null);
        fails.push(`hub ${sc}: timeout ${rep ? JSON.stringify(rep.checks.filter((c) => !c.pass)) : e.message}`);
      }
      await ctx.close();
    }
  } finally {
    await b.close();
    srv.kill();
  }
  return { count, fails };
}
if (process.argv[1]?.endsWith('hub.mjs')) {
  const r = await runHub(process.argv.slice(2).length ? process.argv.slice(2) : null);
  for (const f of r.fails) console.log(f);
  console.log(`${r.count - r.fails.length}/${r.count} hub scenarios passed`);
  process.exit(r.fails.length ? 1 : 0);
}
