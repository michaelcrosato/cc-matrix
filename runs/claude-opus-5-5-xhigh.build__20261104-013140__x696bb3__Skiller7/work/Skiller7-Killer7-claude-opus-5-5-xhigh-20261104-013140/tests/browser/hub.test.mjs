// The AI Hub harness (§14.5): the built game beside harness.html, bridge.js and round.js, served on a port the OS picks
// (127.0.0.1), checked to be ours, then the hub's own checks: 2 players auto; 4 players with latency 150, jitter 50,
// loss 5; host-leave. The server is stopped by its own PID.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { launch, routeCDN, ROOT } from '../lib/browser.mjs';
const NAME = path.basename(ROOT) + '.html';
export default async (T) => {
  const dir = path.join(ROOT, 'tests/out/hub');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, '..', NAME), path.join(dir, NAME));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) fs.copyFileSync(path.join(ROOT, 'vendor/aihub', f), path.join(dir, f));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  let port = null;
  try {
    port = await new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('no port')), 10000);
      const on = d => { const m = String(d).match(/port (\d+)/); if (m) { clearTimeout(to); res(+m[1]); } };
      srv.stdout.on('data', on); srv.stderr.on('data', on);
    });
    const base = `http://127.0.0.1:${port}/`;
    const own = await (await fetch(base + NAME)).text();
    T.check('the served page is ours', /<title>Skiller7/.test(own));
    const b = await launch();
    try {
      for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1']) {
        const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); await routeCDN(ctx);
        const page = await ctx.newPage(); const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await page.goto(base + 'harness.html?game=' + encodeURIComponent(NAME) + '&' + q);
        await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 300000 }).catch(() => {});
        const r = await page.evaluate(() => ({ done: document.body.dataset.complete, check: window.__hubCheck ? { pass: window.__hubCheck.pass, failed: (window.__hubCheck.checks || []).filter(c => !c.pass).map(c => c.name + (c.detail ? ': ' + c.detail : '')), log: (window.__hubCheck.log || []).slice(-6) } : null }));
        T.check('the hub harness passes: ' + q, r.check && r.check.pass === true, JSON.stringify(r));
        await ctx.close();
      }
    } finally { await b.close(); }
  } finally { srv.kill('SIGTERM'); }
};
