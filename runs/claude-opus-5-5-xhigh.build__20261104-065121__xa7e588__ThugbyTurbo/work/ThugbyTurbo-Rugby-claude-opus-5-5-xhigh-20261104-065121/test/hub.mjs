// The AI Hub harness, in Chromium (node test/run.mjs --hub, or on its own: node test/hub.mjs): the built game served
// beside harness.html by a server bound to 127.0.0.1 on a port the OS picks (checked to be ours), run in the four
// configurations the hub runs; then the page on its own, outside a session. Only the server this started is stopped.
import { spawn } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { OUT } from '../build.mjs';

const dir = new URL('../hub/', import.meta.url);
const CONFIGS = [['players=2&auto=1', 'two players'], ['players=4&latency=150&jitter=50&loss=5&auto=1', 'four, lossy'], ['players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'host leaves'], ['players=2&scenario=server&auto=1', 'server']];
export async function runHub() {
  copyFileSync(OUT, new URL('game.html', dir));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  const fails = [];
  try {
    const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port from the server')), 10000); });
    const base = `http://127.0.0.1:${port}/`;
    const page0 = await (await fetch(base + 'game.html')).text();
    if (!page0.includes('<title>Thugby Turbo</title>')) throw new Error('the server on port ' + port + ' is not serving this game');
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    for (const [q, name] of CONFIGS) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(base + 'harness.html?game=game.html&' + q);
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 180000 }); }
      catch (e) { fails.push(`${name}: the harness did not complete`); await page.close(); continue; }
      const rep = await page.evaluate(() => window.__hubCheck);
      if (!rep.pass) for (const c of rep.checks.filter(c => !c.pass)) fails.push(`${name}: ${c.name}${c.detail ? ' (' + c.detail + ')' : ''}`);
      if (process.env.TT_VERBOSE) console.log(`${name} [${q}]: ${rep.pass ? 'PASS' : 'FAIL'} - ${rep.checks.length} checks: ${rep.checks.map(c => (c.pass ? 'ok ' : 'NO ') + c.name).join('; ')}`);
      await page.close();
    }
    // the game on its own, outside a session: the title, no errors
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(base + 'game.html'); await page.waitForTimeout(2500);
    const scene = await page.evaluate(() => window.__thugby && window.__thugby.game.sceneName);
    if (scene !== 'title') fails.push('standalone: scene ' + scene); if (errs.length) fails.push('standalone errors: ' + errs.slice(0, 2).join(' | '));
    await browser.close();
  } finally { srv.kill(); }
  return fails;
}
export const cases = { async 'the AI Hub harness passes in all four configurations, and the game runs on its own'() { const f = await runHub(); if (f.length) throw new Error(f.join('; ')); } };
if (process.argv[1] && process.argv[1].endsWith('hub.mjs')) { const f = await runHub(); for (const x of f) console.log('FAIL hub > ' + x); console.log(f.length ? f.length + ' failed' : 'hub: all passed'); process.exit(f.length ? 1 : 0); }
