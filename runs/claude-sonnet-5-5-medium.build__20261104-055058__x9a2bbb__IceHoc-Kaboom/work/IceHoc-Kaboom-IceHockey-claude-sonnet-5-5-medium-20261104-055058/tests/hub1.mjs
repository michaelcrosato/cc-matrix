import { chromium } from 'playwright'; import { spawn } from 'node:child_process';
const root = new URL('..', import.meta.url).pathname; const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: root + 'hub', stdio: ['ignore', 'pipe', 'pipe'] });
try { const port = await new Promise((res, rej) => { let buf = ''; const f = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&` + process.argv[2]); await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 });
  console.log(JSON.stringify(await p.evaluate(() => ({ pass: __hubCheck.pass, checks: __hubCheck.checks, log: (__hubCheck.log || []).slice(-8) })), null, 1).slice(0, 3500)); await b.close(); } finally { srv.kill(); }
