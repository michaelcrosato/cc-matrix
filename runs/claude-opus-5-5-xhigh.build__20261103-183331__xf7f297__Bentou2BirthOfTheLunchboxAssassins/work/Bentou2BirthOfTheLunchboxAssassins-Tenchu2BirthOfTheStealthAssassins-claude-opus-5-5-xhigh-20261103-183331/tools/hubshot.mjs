import { createRequire } from 'node:module'; import { join } from 'node:path'; import { spawn } from 'node:child_process';
const dev = new URL('..', import.meta.url).pathname, require = createRequire(join(dev, 'handoff', 'package.json')), { chromium } = require('playwright');
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: join(dev, '.hubtest'), stdio: ['ignore', 'pipe', 'pipe'] });
let port; await new Promise(res => { const on = d => { const m = /port (\d+)/.exec(String(d)); if (m) { port = +m[1]; res(); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto('http://127.0.0.1:' + port + '/harness.html?game=game.html&players=2'); await p.waitForTimeout(6000);
await p.screenshot({ path: join(dev, 'shots', 'hubcard.png') });
await p.waitForTimeout(16000); await p.screenshot({ path: join(dev, 'shots', 'hubround.png') });
await b.close(); srv.kill();
