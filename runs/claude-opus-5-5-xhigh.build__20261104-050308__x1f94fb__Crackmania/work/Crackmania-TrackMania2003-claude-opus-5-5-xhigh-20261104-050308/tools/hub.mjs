// the AI Hub harness (PLAN §9.6): the built file served beside harness.html on 127.0.0.1 (an OS-picked port, our own
// server, stopped by its PID), three runs: 2 players; 4 players with latency, jitter and loss; the host leaving
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OUT_NAME } from './build-name.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), DIR = ROOT + '.hubtest/';
export async function hub() {
  const fails = []; let n = 0; const check = (name, ok, detail = '') => { n++; if (!ok) fails.push([name, detail]); return ok; };
  mkdirSync(DIR, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(ROOT + 'tools/hub/' + f, DIR + f);
  copyFileSync(ROOT + '../' + OUT_NAME, DIR + 'game.html');
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', DIR], { stdio: ['ignore', 'pipe', 'pipe'] });
  let port; try { port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 10000); }); } catch (e) { srv.kill('SIGTERM'); throw e; }
  try {
    const base = 'http://127.0.0.1:' + port + '/';
    const html = await (await fetch(base + 'game.html')).text(); if (!check('the server serves our game', /<title>CRACKMANIA<\/title>/.test(html))) return { n, fails };
    const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
    for (const q of (process.env.HUBQ ? [process.env.HUBQ] : ['players=2&auto=1&limit=45', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=45', 'players=2&auto=1&limit=45&scenario=host-leave'])) {
      const page = await b.newPage({ viewport: { width: 1400, height: 900 } });
      await page.goto(base + 'harness.html?game=game.html&' + q);
      const done = await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000 }).then(() => true, () => false);
      const rep = await page.evaluate(() => window.__hubCheck && { pass: window.__hubCheck.pass, checks: window.__hubCheck.checks }).catch(() => null);
      check('harness ' + q + ' completes', done);
      if (rep) for (const c of rep.checks) check(q + ': ' + c.name, c.pass, c.detail);
      check('harness ' + q + ' passes', rep && rep.pass);
      await page.close();
    }
    await b.close();
  } finally { srv.kill('SIGTERM'); }
  return { n, fails };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) { const r = await hub(); for (const [c, d] of r.fails) console.log('FAIL hub: ' + c + (d ? ': ' + d : '')); console.log(r.n + ' checks, ' + r.fails.length + ' failed'); }
