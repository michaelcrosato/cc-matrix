// The hub's own harness: copy harness.html, bridge.js, round.js beside the built page; serve on an OS-picked 127.0.0.1 port.
import { spawn } from 'node:child_process';
import { launch, ROOT } from './lib.mjs';
const CASES = [
  'players=2', 'players=3&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'players=2&scenario=server',
];
export async function run(T) {
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: ROOT + '/dist', stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('server did not start')), 10000); srv.stdout.on('data', (d) => { const m = /port (\d+)/.exec(String(d)); if (m) { clearTimeout(t); res(+m[1]); } }); });
  try {
    const only = process.env.HUBCASE; const list = only ? [CASES[+only]] : CASES;
    for (const c of list) {
      const { browser, page, errs } = await launch({ viewport: { width: 1600, height: 1000 } });
      const url = `http://127.0.0.1:${port}/harness.html?game=game.html&auto=1&${c}`;
      await page.goto(url);
      let ok = false; try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); ok = true; } catch {}
      const res = await page.evaluate(() => ({ pass: window.__hubCheck?.pass, fails: (window.__hubCheck?.checks || window.__hubCheck?.items || []).filter?.((x) => x && x.ok === false).map((x) => x.name || x.label || JSON.stringify(x)).slice(0, 6), raw: JSON.stringify(window.__hubCheck || {}).slice(0, 600) }));
      T.ok(ok && res.pass === true, `hub harness ${c}: ${ok ? 'complete' : 'TIMEOUT'} pass=${res.pass} ${res.pass ? '' : res.raw}`);
      await browser.close();
    }
  } finally { srv.kill(); }
}
