// The AI Hub harness: serve harness + game from 127.0.0.1 on a port the OS picks, confirm it's our page, run the hub's
// own conformance check three ways (2 players; 4 on a bad network; host leaves). Prints FAIL lines and "CHECKS n".
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), DIR = ROOT + '.hubtest/';
mkdirSync(DIR, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(ROOT + 'tools/hub/' + f, DIR + f);
copyFileSync(ROOT + '../Crackmania-TrackMania2003-claude-opus-5-5-medium-20261104-050311.html', DIR + 'game.html');
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', DIR], { stdio: ['ignore', 'pipe', 'pipe'] });
let n = 0; const check = (name, ok, d = '') => { n++; if (!ok) console.log('FAIL hub: ' + name + (d ? ': ' + d : '')); };
const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 10000); });
try {
  const base = 'http://127.0.0.1:' + port + '/';
  const html = await (await fetch(base + 'game.html')).text();
  check('our page is served', /<title>CRACKMANIA<\/title>/.test(html));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  for (const q of ['players=2&auto=1&limit=45', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=45', 'players=2&auto=1&limit=45&scenario=host-leave']) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    await p.goto(base + 'harness.html?game=game.html&' + q);
    try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000, polling: 1000 }); } catch (e) { check(q + ': finished', false, 'timed out'); await p.close(); continue; }
    const r = await p.evaluate(() => window.__hubCheck);
    check(q + ': pass', r.pass, '');
    for (const c of r.checks) if (!c.pass) console.log('FAIL hub: ' + q + ': ' + c.name + ': ' + String(c.detail).slice(0, 300));
    await p.close();
  }
  await b.close();
} finally { srv.kill('SIGTERM'); }
console.log('CHECKS ' + n);
