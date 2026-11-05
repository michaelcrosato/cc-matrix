// node tools/hubcheck.mjs [players=2] [extra query]: serves the harness next to the game on 127.0.0.1 (OS-picked port) and runs the AI Hub checks
import { chromium } from 'playwright';
import { spawn } from 'node:child_process'; import { mkdtempSync, copyFileSync, readFileSync } from 'node:fs'; import { tmpdir } from 'node:os';
import { resolve, basename, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..'), game = basename(DEV) + '.html';
const dir = mkdtempSync(resolve(process.env.TMPDIR || tmpdir(), 'aoa-hub-'));
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(resolve(DEV, 'hub', f), resolve(dir, f)); copyFileSync(resolve(DEV, '..', game), resolve(dir, 'game.html'));
const srv = spawn('python3', ['-I', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { let b = ''; const f = d => { b += d; const m = b.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
const players = process.argv[2] || '2', extra = process.argv[3] || '';
const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await br.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=${players}&auto=1${extra}`);
try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 }); } catch (e) { errs.push('timeout waiting for complete'); }
const res = await p.evaluate(() => window.__hubCheck || null);
console.log(res ? 'pass=' + res.pass + ' ' + (res.scenario || '') + ' players=' + res.players + ' failing: ' + JSON.stringify((res.checks || []).filter(c => !c.pass)) : 'no result'); console.log('page errors:', errs.slice(0, 5));
await p.screenshot({ path: resolve(DEV, 'test-output/hub.png') });
await br.close(); srv.kill();
