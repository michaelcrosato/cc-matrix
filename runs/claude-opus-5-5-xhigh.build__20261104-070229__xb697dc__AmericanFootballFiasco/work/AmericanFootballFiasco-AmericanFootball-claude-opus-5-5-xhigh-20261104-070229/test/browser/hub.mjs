// The AI Hub harness on the bundle: serve harness.html, bridge.js, round.js and the deliverable from a fresh folder on a
// port the OS picks (127.0.0.1), check the page is our game, run the hub's four configurations, stop the server by its PID.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, readFileSync } from 'node:fs';
const NAME = 'AmericanFootballFiasco-AmericanFootball-claude-opus-5-5-xhigh-20261104-070229.html';
const root = new URL('../../', import.meta.url), serve = new URL('test/hub/serve/', root);
mkdirSync(serve, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('test/hub/' + f, root), new URL(f, serve));
copyFileSync(new URL('../' + NAME, root), new URL(NAME, serve));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: serve.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 10000); });
const base = 'http://127.0.0.1:' + port + '/';
const out = [];
try {
  const html = await (await fetch(base + NAME)).text();
  if (!html.includes('AMERICAN FOOTBALL FIASCO')) throw new Error('the served page is not our game');
  const browser = await chromium.launch();
  const configs = (process.argv[2] ? [process.argv[2]] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']);
  for (const q of configs) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + 'harness.html?game=' + NAME + '&' + q + '&limit=' + (process.env.LIMIT || 90));
    const t0 = Date.now();
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 400000 }).catch(() => {});
    const r = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, checks: window.__hubCheck && (window.__hubCheck.checks || window.__hubCheck.results || window.__hubCheck) }));
    const failed = r.checks && Array.isArray(r.checks) ? r.checks.filter(c => !c.pass && !c.ok).map(c => c.name || c.label || JSON.stringify(c)) : [];
    out.push({ q, pass: r.pass === true, secs: Math.round((Date.now() - t0) / 1000), failed: failed.length ? failed : (r.pass ? [] : [JSON.stringify(r.checks).slice(0, 1500)]), errs: errs.slice(0, 3) });
    if (process.env.SHOT) await page.screenshot({ path: new URL('shots/hub-' + q.replace(/\W+/g, '_') + '.png', root).pathname });
    await page.close();
  }
  await browser.close();
} finally { process.kill(srv.pid); }
for (const o of out) console.log((o.pass ? 'PASS ' : 'FAIL ') + o.q + ' (' + o.secs + ' s)' + (o.pass ? '' : ' :: ' + o.failed.join(' | ') + (o.errs.length ? ' errors: ' + o.errs.join(' | ') : '')));
process.exit(out.every(o => o.pass) ? 0 : 1);
