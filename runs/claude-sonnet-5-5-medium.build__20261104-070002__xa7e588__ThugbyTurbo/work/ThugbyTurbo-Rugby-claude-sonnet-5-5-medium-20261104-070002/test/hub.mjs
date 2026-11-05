// node test/hub.mjs — runs the AI Hub harness (lib/hub/harness.html) against the built game: 2 players, 4 players with a flaky network
import { chromium } from '../tools/node_modules/playwright/index.mjs'; import { spawn } from 'node:child_process'; import { copyFileSync } from 'node:fs';
copyFileSync(new URL('../../ThugbyTurbo-Rugby-claude-sonnet-5-5-medium-20261104-070002.html', import.meta.url), new URL('../hub/game.html', import.meta.url));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: new URL('../hub/', import.meta.url).pathname }); let port = 0;
await new Promise(res => { srv.stderr.on('data', d => { const m = String(d).match(/port (\d+)/) || String(d).match(/:(\d+)\//); if (m && !port) { port = +m[1]; res(); } }); srv.stdout.on('data', d => { const m = String(d).match(/port (\d+)/); if (m && !port) { port = +m[1]; res(); } }); setTimeout(res, 4000); });
let fails = [], n = 0;
try {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
  for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}&limit=60`); let done = false; for (let i = 0; i < 100 && !done; i++) { await p.waitForTimeout(1000); done = await p.evaluate(() => document.body.dataset.complete === 'true'); }
    const r = await p.evaluate(() => window.__hubCheck); n++;
    if (!done || !r || !r.pass) fails.push(q + ': ' + JSON.stringify(r && (r.failed || r.checks && r.checks.filter(c => !c.pass)) || r).slice(0, 600) + (errs.length ? ' ERR ' + errs.join('|') : ''));
    await p.close();
  }
  await b.close();
} finally { srv.kill(); }
console.log(fails.length ? fails.join('\n') + '\n' + fails.length + ' FAILED of ' + n : 'all ' + n + ' hub harness runs passed'); process.exit(fails.length ? 1 : 0);
