// Runs the real AI Hub harness against the deliverable: 4 scenarios. Serves a copy from 127.0.0.1 on an OS-picked port, checks it is MASH TV, kills the server by PID.
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), NAME = 'MashTV-SmashTV-claude-sonnet-5-5-medium-20261104-050302.html';
const serve = path.join(DEV, '.serve'); rmSync(serve, { recursive: true, force: true }); mkdirSync(serve, { recursive: true });
copyFileSync(path.join(DEV, '..', NAME), path.join(serve, NAME)); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(path.join(DEV, 'vendor/hub', f), path.join(serve, f));
import http from 'node:http';
import { readFileSync } from 'node:fs';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => { try { const f = path.join(serve, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')); const body = readFileSync(f); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' }); res.end(body); } catch (e) { res.writeHead(404); res.end(); } });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let failed = 0; const out = [];
try {
  const only = process.argv[2];
  const runs = [['2 players', 'players=2&auto=1'], ['4 players lossy', 'players=4&latency=150&jitter=50&loss=5&auto=1'], ['host-leave', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1'], ['server', 'players=2&scenario=server&auto=1']];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page0 = await b.newPage(); await page0.goto(`http://127.0.0.1:${port}/${NAME}`); await page0.waitForTimeout(1500);
  const title = await page0.title(), hasMT = await page0.evaluate(() => typeof window.MT === 'object'); if (title !== 'MASH TV' || !hasMT) { console.log('FAIL: the served page is not MASH TV', title, hasMT); failed++; } await page0.close();
  for (const [label, q] of runs) {
    if (only && !label.includes(only)) continue;
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${port}/harness.html?game=${NAME}&${q}`, { timeout: 180000, waitUntil: "domcontentloaded" });
    try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); } catch (e) { out.push(`${label}: TIMEOUT`); failed++; }
    const rep = await p.evaluate(() => window.__hubCheck && ({ pass: window.__hubCheck.pass, checks: window.__hubCheck.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail) }));
    if (!rep || !rep.pass) { failed++; out.push(`${label}: FAIL ${rep ? rep.checks.join(' | ') : 'no report'}`); } else out.push(`${label}: PASS`);
    if (errs.length) out.push('  page errors: ' + errs.slice(0, 3).join(' | '));
    await p.close();
  }
  await b.close();
} finally { srv.close(); rmSync(serve, { recursive: true, force: true }); }
console.log(out.join('\n')); console.log(`hub: ${failed ? failed + ' failed' : 'all passed'}`); process.exit(failed ? 1 : 0);
