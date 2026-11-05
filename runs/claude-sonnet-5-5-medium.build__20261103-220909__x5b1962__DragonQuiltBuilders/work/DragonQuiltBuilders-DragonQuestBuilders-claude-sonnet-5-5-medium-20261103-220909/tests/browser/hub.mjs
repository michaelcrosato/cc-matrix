// AI Hub harness check: serves the game next to the hub's harness on 127.0.0.1 (port picked by the OS), runs the checks.
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process'; import { mkdirSync, copyFileSync, readFileSync } from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const name = path.basename(root);
const dir = path.join(root, 'check-output', 'hub'); mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(path.join(root, 'vendor/aihub', f), path.join(dir, f));
copyFileSync(path.resolve(root, '..', name + '.html'), path.join(dir, 'game.html'));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
let port; try { port = await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no port')), 8000); const on = d => { const m = /port (\d+)/.exec(String(d)); if (m) { clearTimeout(t); res(+m[1]); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); }); } catch (e) { srv.kill(); throw e; }
const out = [];
try {
  const base = 'http://127.0.0.1:' + port + '/';
  const title = (await (await fetch(base + 'game.html')).text()).match(/<title>(.*?)<\/title>/)[1];
  if (!/Dragon Quilt Builders/.test(title)) throw new Error('wrong page on port ' + port + ': ' + title);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await page.goto(base + 'harness.html?game=game.html&' + q);
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 }).catch(() => out.push('TIMEOUT ' + q));
    const r = await page.evaluate(() => window.__hubCheck && JSON.stringify({ pass: window.__hubCheck.pass, fails: (window.__hubCheck.checks || window.__hubCheck.items || []).filter(c => c && c.pass === false).map(c => c.name || c.label || JSON.stringify(c)).slice(0, 8) }));
    if (!r || !JSON.parse(r).pass) out.push('FAIL ' + q + ' ' + r + ' ' + errs.join('|'));
    await page.close();
  }
  await browser.close();
} catch (e) { out.push('ERROR ' + e.message); }
finally { srv.kill(); }
console.log(out.length ? out.join('\n') : '3 hub harness runs ok');
