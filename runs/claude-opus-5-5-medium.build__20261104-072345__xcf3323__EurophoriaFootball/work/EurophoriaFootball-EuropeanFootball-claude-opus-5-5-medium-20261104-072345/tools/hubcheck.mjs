// the AI Hub harness in Chromium: for each scenario, serves the work root on 127.0.0.1 (a port the OS picks), checks the
// page is ours, runs the scenario and prints failed checklist lines; stops only the server it started, by its PID.
// Then the game alone (file://) must reach its title with no errors.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), ROOT = join(DEV, '..'), NAME = basename(DEV);
let failed = 0;
const out = (ok, line) => { if (!ok) { failed++; console.log('FAIL hub ' + line); } };
async function serve() {
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', ROOT], { stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => { srv.kill(); rej(new Error('no port')); }, 8000); });
  const base = `http://127.0.0.1:${port}`, html = await (await fetch(`${base}/${NAME}.html`)).text();
  if (!/<title>Europhoria Football<\/title>/.test(html)) { srv.kill(); throw new Error('the page on port ' + port + ' is not our game'); }
  return { base, stop: () => srv.kill(), pid: srv.pid };
}
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const runs = process.argv[2] ? [process.argv[2]] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&scenario=server&auto=1'];
for (const q of runs) {
  let s = null;
  try {
    s = await serve();
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(`${s.base}/${NAME}/tools/harness/harness.html?game=/${NAME}.html&${q}`);
    try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }); } catch (e) { out(false, q + ': timed out'); }
    const rep = await page.evaluate(() => window.__hubCheck || null);
    out(rep && rep.pass === true, q + ': pass=' + (rep && rep.pass)); if (process.env.VERBOSE) console.log(q, rep && rep.pass);
    if (rep && !rep.pass) console.log(JSON.stringify(rep).slice(0, 2000));
    if (process.env.SHOT) await page.screenshot({ path: join(DEV, 'shots', 'hub_' + q.replace(/[^a-z0-9]+/gi, '_') + '.png') });
    await page.close();
  } catch (e) { out(false, q + ': ' + e.message.split('\n')[0]); }
  finally { if (s) s.stop(); }
}
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('file://' + join(ROOT, NAME + '.html')); await page.waitForTimeout(2500);
const sc = await page.evaluate(() => window.My3D2dge.current.sceneName);
out(sc === 'title' && !errs.length, 'outside a session: ' + sc + ' ' + errs.join(' | '));
await browser.close();
console.log(`hub harness: ${failed ? failed + ' failed' : 'all passed'}`);
process.exit(failed ? 1 : 0);
