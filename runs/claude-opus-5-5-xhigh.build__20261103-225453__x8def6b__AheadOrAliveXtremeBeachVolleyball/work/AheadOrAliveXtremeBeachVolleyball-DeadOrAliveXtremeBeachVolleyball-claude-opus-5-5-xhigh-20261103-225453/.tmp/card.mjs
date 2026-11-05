import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const dir = process.argv[2];
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise(res => { let b = ''; const on = d => { b += d; const m = /port (\d+)/.exec(b); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
const br = await chromium.launch(), p = await br.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2`); await p.waitForTimeout(6000);
await p.screenshot({ path: 'test-output/hub-card.png' });
await br.close(); srv.kill('SIGTERM'); console.log('ok', !!el);
