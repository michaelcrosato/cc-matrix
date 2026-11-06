// All four scenarios the hub uses, against the built file, one at a time.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve(import.meta.dirname, '..', '..'), site = resolve(root, 'tests/.site');
mkdirSync(site, { recursive: true });
copyFileSync(resolve(root, '..', `${basename(root)}.html`), resolve(site, 'game.html'));
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(resolve(root, 'vendor/hub', f), resolve(site, f));
const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: site, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res) => { let b = ''; const on = (d) => { b += d; const m = /port (\d+)/.exec(b); if (m) res(+m[1]); }; server.stdout.on('data', on); server.stderr.on('data', on); });
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
let pass = 0, fail = 0;
const only = process.env.HUB_ONLY;
const SCEN = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&auto=1&scenario=server'];
const browser = await chromium.launch({ args: FLAGS });
try {
  const ctx0 = await browser.newContext(); const p0 = await ctx0.newPage(); await p0.goto(`http://127.0.0.1:${port}/game.html?notgame=1`, { waitUntil: 'commit' }); const title = await p0.title().catch(() => ''); await ctx0.close();
  if (!/Far Dry Season/.test(title)) { console.log(`FAIL page title is ${title}`); fail++; }
  for (const sc of SCEN) {
    if (only && !sc.includes(only)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${sc}`);
    try {
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 280000 });
      const r = await page.evaluate(() => window.__hubCheck);
      if (r.pass) pass++; else { fail++; for (const c of r.checks.filter((k) => !k.ok && !k.pass)) console.log(`FAIL ${sc}: ${c.name}: ${String(c.detail ?? '').slice(0, 240)}`); }
    } catch (e) { fail++; const r = await page.evaluate(() => JSON.stringify(window.__hubCheck?.checks?.slice?.(-6) ?? null)).catch(() => ''); console.log(`FAIL ${sc}: timed out ${String(e).slice(0, 80)} ${String(r).slice(0, 500)}`); }
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(`${pass} passed, ${fail} failed`);
