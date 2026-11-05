// The AI Hub harness's own checks, in a browser: 2 players; 4 with latency, jitter and loss; the host leaving; server mode.
// Then the game alone (outside a session) must reach its title. Prints PASS/FAIL lines.
import { createRequire } from 'node:module';
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/hub-serve.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..'), name = path.basename(root);
const require = createRequire(path.join(root, 'engine/package.json'));
const { chromium } = require('playwright');
const dir = path.join(root, 'check-output', 'hub'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
copyFileSync(path.resolve(root, '..', name + '.html'), path.join(dir, 'game.html'));
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(path.join(root, 'vendor/aihub', f), path.join(dir, f));
const only = process.argv.slice(2);
const srv = await serve(dir);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.goto(srv.url + 'game.html');
  const title = await page.title();
  if (!/Dragon Quilt Builders/.test(title)) { console.log('FAIL the server is serving our game (title: ' + title + ')'); process.exit(1); }
  await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 30000 }).then(() => console.log('PASS standalone: the game alone reaches its title'), () => console.log('FAIL standalone: the game alone reaches its title'));
  await page.close();
  const runs = [['2 players', '&players=2&auto=1'], ['4 players, latency, loss', '&players=4&latency=150&jitter=50&loss=5&auto=1'], ['host leaves', '&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'], ['server mode', '&players=2&scenario=server&auto=1']];
  for (const [label, q] of runs) {
    if (only.length && !only.some(o => label.startsWith(o))) continue;
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await p.goto(srv.url + 'harness.html?game=game.html' + q);
    try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }); } catch (e) { console.log('FAIL ' + label + ': the harness did not complete'); await p.close(); continue; }
    const r = await p.evaluate(() => window.__hubCheck);
    console.log((r.pass ? 'PASS ' : 'FAIL ') + label + (r.pass ? '' : ': ' + r.checks.filter(c => !c.pass).map(c => c.name + (c.detail ? ' (' + c.detail + ')' : '')).join('; ')));
    await p.close();
  }
} finally { await browser.close(); srv.stop(); }
