// node tests/hub.mjs : runs the AI Hub harness in all 4 configurations against hub/game.html
import { chromium } from 'playwright'; import { spawn, execSync } from 'node:child_process'; import { copyFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname; copyFileSync(root + '../IceHoc-Kaboom-IceHockey-claude-sonnet-5-5-medium-20261104-055058.html', root + 'hub/game.html');
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: root + 'hub', stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { let buf = ''; const f = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
const base = `http://127.0.0.1:${port}/`; let ok = true;
try {
  const title = await (await fetch(base + 'game.html')).text(); if (!/<title>Ice Hoc-Kaboom<\/title>/.test(title)) throw new Error('wrong page served');
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const cfgs = [['players=2&auto=1', 'two players'], ['players=4&latency=150&jitter=50&loss=5&auto=1', 'four players, lossy'], ['players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'host leaves'], ['players=2&scenario=server&auto=1', 'server host']];
  for (const [q, name] of cfgs) {
    const p = await b.newPage({ viewport: { width: 1000, height: 700 } }); const errs = []; p.on('pageerror', e => errs.push(String(e))); 
    await p.goto(base + 'harness.html?game=game.html&' + q); 
    try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 }); } catch (e) { console.log('TIMEOUT', name); }
    const r = await p.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, fails: (window.__hubCheck.checks || window.__hubCheck.items || []).filter(c => c && c.ok === false).map(c => c.name || c.label || JSON.stringify(c)).slice(0, 8), raw: Object.keys(window.__hubCheck) } : null);
    console.log(name, JSON.stringify(r), 'pageerrors', errs.length, errs.slice(0, 2).join(' | ')); if (!r || !r.pass) ok = false; await p.close();
  }
  await b.close();
} finally { srv.kill(); }
process.exit(ok ? 0 : 1);
