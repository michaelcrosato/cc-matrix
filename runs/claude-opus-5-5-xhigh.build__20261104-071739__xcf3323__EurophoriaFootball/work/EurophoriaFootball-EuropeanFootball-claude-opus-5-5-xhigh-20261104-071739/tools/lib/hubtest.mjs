// The AI Hub's own harness (lib/hub/harness.html) in Chromium: a server for the work root on 127.0.0.1 and a port the
// OS picks (stopped by its PID), the page checked to be ours, then the four scenarios the hub runs.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const NAME = 'EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739';
export async function run({ check }) {
  const S = 'hub', root = new URL('../../../', import.meta.url).pathname;
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let port = null; const got = new Promise(res => { const on = d => { const m = /port (\d+)/.exec(String(d)); if (m && !port) { port = +m[1]; res(); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
  await Promise.race([got, new Promise(r => setTimeout(r, 8000))]);
  if (!port) { check(S, 'server started', false, 'no port'); srv.kill(); return; }
  const base = 'http://127.0.0.1:' + port;
  let browser;
  try {
    const page0 = await (await fetch(base + '/' + NAME + '.html')).text();
    if (!/<title>Europhoria Football<\/title>/.test(page0)) { check(S, 'the served page is ours', false, page0.slice(0, 80)); return; }
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const scen = [['2 players', '&players=2&auto=1'], ['4 players, latency 150, jitter 50, loss 5', '&players=4&latency=150&jitter=50&loss=5&auto=1'], ['host leaves', '&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'], ['server', '&players=2&scenario=server&auto=1']];
    const only = process.argv.find(a => a.startsWith('--scenario='));
    for (const [name, q] of scen) {
      if (only && !name.includes(only.slice(11))) continue;
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      const url = base + '/' + NAME + '/tools/harness/harness.html?game=/' + NAME + '.html' + q;
      await page.goto(url);
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }); } catch (e) { /* report below */ }
      const rep = await page.evaluate(() => window.__hubCheck || null);
      const failed = rep ? (rep.checks || []).filter(c => !c.pass).map(c => c.name + (c.detail ? ' (' + c.detail + ')' : '')) : ['no report'];
      check(S, 'harness: ' + name, rep && rep.pass === true, failed.join('; ').slice(0, 400));
      if (process.argv.includes('--report') && rep) console.log(name, JSON.stringify((rep.checks || []).map(c => (c.pass ? 'ok ' : 'NO ') + c.name)));
      await page.close();
    }
    // the game alone (no session) reaches the title with no errors
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(base + '/' + NAME + '.html'); await page.waitForTimeout(2500);
    const sc = await page.evaluate(() => My3D2dge.current.sceneName); check(S, 'outside a session the game reaches the title', sc === 'title' && !errs.length, sc + ' ' + errs.join('|'));
  } catch (e) { check(S, 'hub run', false, e.stack); }
  finally { if (browser) await browser.close(); try { process.kill(srv.pid); } catch (e) { /* gone */ } }
}
