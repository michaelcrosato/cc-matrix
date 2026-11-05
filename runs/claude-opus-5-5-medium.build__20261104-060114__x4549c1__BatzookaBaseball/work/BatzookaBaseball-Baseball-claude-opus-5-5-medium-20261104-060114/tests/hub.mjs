// The AI Hub harness, for real: serves hub/ on 127.0.0.1 (port 0: the OS picks), opens harness.html with the bundle, and
// requires window.__hubCheck.pass. node tests/hub.mjs [query...]. Stops only the server it started (by PID).
import { spawn } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { chromium } from 'playwright';
const DEV = new URL('../', import.meta.url).pathname, NAME = DEV.replace(/\/$/, '').split('/').pop();
copyFileSync(DEV + '../' + NAME + '.html', DEV + 'hub/game.html');
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: DEV + 'hub' });
const port = await new Promise((res, rej) => { srv.stdout.on('data', d => { const m = String(d).match(/port (\d+)/); if (m) res(+m[1]); }); srv.stderr.on('data', d => { const m = String(d).match(/port (\d+)/); if (m) res(+m[1]); }); setTimeout(() => rej(new Error('no port')), 8000); });
const queries = process.argv.slice(2).length ? process.argv.slice(2) : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1'];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failed = 0;
try {
  const p0 = await browser.newPage(); const html = await (await p0.goto(`http://127.0.0.1:${port}/game.html`)).text(); await p0.close();
  if (!html.includes('<title>Batzooka Baseball</title>')) throw new Error('the served page is not this game');
  for (const q of queries) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 300000 });
    const chk = await page.evaluate(() => window.__hubCheck);
    console.log('harness ' + q + ': pass=' + (chk && chk.pass)); for (const c of (chk && chk.checks) || []) console.log('  ' + (c.pass ? 'PASS ' : 'FAIL ') + c.name);
    if (!chk || !chk.pass) { failed++; console.log('FAIL hub ' + q + ': ' + JSON.stringify(chk && (chk.failed || chk.checks || chk)).slice(0, 1500)); }
    await page.close();
  }
} catch (e) { failed++; console.log('FAIL hub: ' + e.message); }
await browser.close(); srv.kill();
console.log(`${queries.length - failed} passed, ${failed} failed (hub harness)`);
process.exit(failed ? 1 : 0);
