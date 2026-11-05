// The AI Hub harness, automated: node tools/hub-check.mjs [scenario ...]
// Serves dist/hub on 127.0.0.1 at a port the OS picks (python3 -m http.server 0), checks the page there is ours, runs the
// harness's conformance (?auto=1) for each scenario, prints PASS / FAIL with the failing checks, and stops the server by
// its own PID. Scenarios: two, four-lossy, host-leave, server.
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../engine/node_modules/playwright/index.mjs';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL = { two: 'players=2&auto=1', 'four-lossy': 'players=4&latency=150&jitter=50&loss=5&auto=1', 'host-leave': 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', server: 'players=2&scenario=server&auto=1' };
const pick = process.argv.slice(2).filter(a => ALL[a]); const scenarios = pick.length ? pick : Object.keys(ALL);
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: join(DEV, 'dist/hub'), env: Object.assign({}, process.env, { TMPDIR: join(DEV, '.tmp') }) });
let port;
try { port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 8000); }); } catch (e) { srv.kill('SIGTERM'); console.log(String(e)); process.exit(1); }
let failed = 0;
try {
  const html = await (await fetch(`http://127.0.0.1:${port}/game.html`)).text();
  if (!/<title>Brigantime: The Legend of Forseasons<\/title>/.test(html)) throw new Error('the page on port ' + port + ' is not this game');
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const sc of scenarios) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${ALL[sc]}`);
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 });
    const rep = await page.evaluate(() => window.__hubCheck);
    const bad = rep.checks.filter(c => !c.pass);
    console.log(`${sc}: ${rep.pass ? 'PASS' : 'FAIL'} (${rep.checks.length - bad.length}/${rep.checks.length})` + (bad.length ? '\n  ' + bad.map(c => c.name + ' — ' + c.detail).join('\n  ') : '') + (errs.length ? '\n  page errors: ' + errs.slice(0, 3).join(' | ') : ''));
    if (!rep.pass) { failed++; console.log('  log tail: ' + rep.log.slice(-8).join(' / ').slice(0, 900)); }
    await page.close();
  }
  await browser.close();
} catch (e) { failed++; console.log('hub-check: ' + (e.stack || e)); }
finally { srv.kill('SIGTERM'); }
process.exit(failed ? 1 : 0);
