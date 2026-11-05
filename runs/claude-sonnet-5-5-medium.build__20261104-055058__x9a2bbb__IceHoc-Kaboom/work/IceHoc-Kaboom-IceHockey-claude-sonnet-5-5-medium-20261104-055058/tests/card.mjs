import { chromium } from 'playwright'; import { spawn } from 'node:child_process';
const root = new URL('..', import.meta.url).pathname; const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: root + 'hub', stdio: ['ignore', 'pipe', 'pipe'] });
try { const port = await new Promise((res, rej) => { let buf = ''; const f = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
  await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2`); await p.waitForTimeout(7000); await p.screenshot({ path: 'shots/card.png' }); await b.close(); } finally { srv.kill(); }
