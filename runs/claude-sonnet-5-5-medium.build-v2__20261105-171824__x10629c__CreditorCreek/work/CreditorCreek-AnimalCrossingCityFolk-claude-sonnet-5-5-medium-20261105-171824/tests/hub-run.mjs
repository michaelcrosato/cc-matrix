// AI Hub harness: serve tests/hub on 127.0.0.1:<os port>, run the four scenarios, assert __hubCheck.pass.
import { spawn } from 'node:child_process'; import { chromium } from 'playwright'; import { resolve, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'hub'); const only = process.argv[2];
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
let port = await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no port')), 8000); srv.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) { clearTimeout(t); res(+m[1]); } }); });
let fails = 0, count = 0; const scenarios = [['players=2', 'two players'], ['players=4&latency=150&jitter=50&loss=5', 'four players, bad network'], ['players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'host leaves'], ['players=2&scenario=server', 'server copy']];
let b;
try {
  b = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'] });
  for (const [q, name] of scenarios) {
    if (only && !name.includes(only)) continue; count++;
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    try {
      await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&auto=1&limit=30&${q}`); const title = await p.title();
      await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 });
      const r = await p.evaluate(() => ({ pass: window.__hubCheck?.pass, checks: window.__hubCheck?.checks ?? window.__hubCheck }));
      if (!r.pass) { fails++; const arr = Array.isArray(r.checks) ? r.checks : (r.checks?.checks ?? []); const bad = JSON.stringify(arr.filter(c => c && c.pass === false)).slice(0, 700) || JSON.stringify(r.checks).slice(0, 400); console.log('FAIL hub', name, bad, errs); }
    } catch (e) { fails++; console.log('FAIL hub', name, String(e).slice(0, 200), errs); }
    await p.close();
  }
} finally { await b?.close(); srv.kill(); }
console.log(`hub: ${count} scenarios, ${fails} failures`);
process.exit(fails ? 1 : 0);
