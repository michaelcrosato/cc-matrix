// AI Hub harness: serve .hubtest on a 127.0.0.1 port the OS picks, run the harness's check, stop the server by PID.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
copyFileSync(ROOT + '../Crackmania-TrackMania2003-claude-sonnet-5-5-medium-20261104-050314.html', ROOT + '.hubtest/game.html');
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', ROOT + '.hubtest'], { stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { srv.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) res(+m[1]); }); srv.stderr.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) res(+m[1]); }); setTimeout(() => rej(new Error('no port')), 8000); });
const base = 'http://127.0.0.1:' + port;
let bad = 0;
try {
  const html = await (await fetch(base + '/game.html')).text(); if (!html.includes('<title>CRACKMANIA</title>')) throw new Error('not our game on port ' + port);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['players=2&auto=1&limit=45', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=45', 'players=2&auto=1&limit=45&scenario=host-leave'];
  for (const q of runs) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.goto(base + '/harness.html?game=game.html&' + q);
    await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).catch(() => {});
    const r = await p.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, checks: window.__hubCheck && window.__hubCheck.checks || window.__hubCheck }));
    if (!r.pass) { bad++; console.log('FAIL hub ' + q, JSON.stringify(r.checks).slice(0, 1500)); }
    await p.context().close();
  }
  await b.close();
} catch (e) { bad++; console.log('FAIL hub: ' + e.message); }
finally { srv.kill('SIGTERM'); }
console.log(`hub: ${bad ? bad + ' failed' : 'all passed'}`);
process.exit(bad ? 1 : 0);
