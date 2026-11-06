// 21. The four harness runs, on an OS-chosen port. 22. Outside a session.
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
const root = new URL('../../', import.meta.url).pathname, dir = `${root}.build/hubtest`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
copyFileSync(`${root}.build/game.html`, `${dir}/game.html`); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(`${root}vendor/hub/${f}`, `${dir}/${f}`);
const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res, rej) => { let out = ''; const on = (d) => { out += d; const m = out.match(/port (\d+)/); if (m) res(+m[1]); }; server.stdout.on('data', on); server.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 8000); });
let n = 0, fail = 0; const check = (name, c, d = '') => { n++; if (!c) { fail++; console.log(`FAIL ${name} ${String(d).slice(0, 700)}`); } };
const browser = await chromium.launch({ args: FLAGS });
try {
  for (const q of (process.argv[2] ? [process.argv[2]] : ['auto=1&players=1', 'auto=1&players=2', 'auto=1&players=4&latency=150&jitter=50&loss=5', 'auto=1&players=4&latency=150&jitter=50&loss=5&scenario=host-leave'])) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
    check(`served page is the harness ${q}`, /harness|hub/i.test(await page.title() + (await page.content()).slice(0, 2000)));
    try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); } catch { check(`complete ${q}`, false, 'timed out'); }
    const r = await page.evaluate(() => window.__hubCheck);
    check(`harness ${q}`, r?.pass === true, JSON.stringify((r?.checks ?? []).filter((c) => !c.pass && !c.ok).map((c) => [c.name, c.detail])));
    await page.close();
  }
  const page = await browser.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/game.html`); await page.evaluate(() => window.__PIXEL_READY__); await new Promise((r) => setTimeout(r, 600));
  check('title is the game', (await page.title()) === 'Wibble Fit'); check('AIHub.active false outside', await page.evaluate(() => window.AIHub?.active === false || !window.AIHub?.active)); check('normal boot', await page.evaluate(() => window.__GAME__.scene.id === 'title')); check('no errors outside', errs.length === 0, errs.join('|'));
} finally { await browser.close(); server.kill(); rmSync(dir, { recursive: true, force: true }); }
console.log(`${n - fail}/${n} passed`); process.exit(fail ? 1 : 0);
