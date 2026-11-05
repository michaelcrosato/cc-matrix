import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright'; import { FILE } from './browser.mjs';
const dev = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), root = path.resolve(dev, '..'), out = path.join(dev, 'tests/out/hub');
export async function runHarness(only) {
  let pass = 0, fail = 0; const fails = []; fs.mkdirSync(out, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) fs.copyFileSync(path.join(dev, 'hub', f), path.join(out, f)); fs.copyFileSync(path.join(root, FILE), path.join(out, FILE));
  const srv = http.createServer((q, r) => { const p = path.join(out, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'index.html'); if (!p.startsWith(out) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'text/plain' }); r.end(fs.readFileSync(p)); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port; const base = 'http://127.0.0.1:' + port + '/';
  const html = await (await fetch(base + FILE)).text(); if (!html.includes('<title>Eye of the Bolt-Holder</title>')) { fails.push('FAIL harness: the served page is not the game'); fail++; }
  const cases = [['players=2&auto=1'], ['players=4&latency=150&jitter=50&loss=5&auto=1'], ['scenario=host-leave&auto=1']].filter((c, i) => !only || only.includes(i));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  for (const [qs] of cases) {
    const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); await page.goto(base + 'harness.html?game=' + encodeURIComponent(FILE) + '&' + qs);
    try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 280000 }); const chk = await page.evaluate(() => window.__hubCheck); if (chk && chk.pass) pass++; else { fail++; fails.push('FAIL harness ' + qs + ': ' + JSON.stringify(((chk && (Array.isArray(chk) ? chk : chk.rows || chk.checks)) || [chk]).filter(r => r && r.pass === false)).slice(0, 900)); } } catch (e) { fail++; fails.push('FAIL harness ' + qs + ': timeout ' + (await page.evaluate(() => JSON.stringify(window.__hubCheck || {}).slice(0, 200)).catch(() => ''))); }
    await page.close();
  }
  await b.close(); srv.close(); return { pass, fail, fails };
}
if (process.argv[1].endsWith('harness.test.mjs')) { const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null; const r = await runHarness(only); console.log(r.fails.join('\n')); console.log(`${r.pass} passed, ${r.fail} failed`); }
