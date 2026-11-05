// The AI Hub harness on the bundle: 2 players; 4 players with latency, jitter and loss; and host-leave. Serves
// test/.serve on 127.0.0.1 (a port the OS picks), confirms the page is ours, and stops the server by its own PID.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
const require = createRequire(new URL('../engine/package.json', import.meta.url));
const { chromium } = require('playwright');
const root = new URL('../', import.meta.url), serve = new URL('test/.serve/', root);
const NAME = 'DenshaDeHalo-DenshaDeGo-claude-opus-5-5-medium-20261104-050235';
mkdirSync(serve, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/aihub/' + f, root), new URL(f, serve));
copyFileSync(new URL('../' + NAME + '.html', root), new URL('game.html', serve));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', serve.pathname], { stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { const on = d => { const m = String(d).match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 10000); });
let fails = 0;
try {
  const page0 = await (await fetch(`http://127.0.0.1:${port}/game.html`)).text();
  if (!page0.includes('<title>Densha de Halo!</title>')) throw new Error('the server is not serving our page');
  const b = await chromium.launch();
  for (const q of (process.argv[2] ? [process.argv[2]] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'])) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}&limit=60`);
    await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 300000 }).catch(() => {});
    const r = await p.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, items: JSON.stringify(window.__hubCheck).slice(0, 3000) } : null);
    if (!r || !r.pass) { fails++; console.log('FAIL hub harness: ' + q + ' ' + (r ? r.items : 'no result')); }
    if (process.env.SHOT) await p.screenshot({ path: new URL('shots/hub-' + fails + '.png', root).pathname });
    await p.close();
  }
  await b.close();
} finally { srv.kill(); }
console.log(fails ? fails + ' harness run(s) failed' : 'harness: all passed');
process.exit(fails ? 1 : 0);
