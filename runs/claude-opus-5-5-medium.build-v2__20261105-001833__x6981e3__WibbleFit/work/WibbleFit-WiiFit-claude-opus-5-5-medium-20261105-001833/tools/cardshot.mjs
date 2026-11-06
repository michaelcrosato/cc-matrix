// A look at the session card and round inside the harness.
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
const root = new URL('../', import.meta.url).pathname, dir = `${root}.build/hubshot`; mkdirSync(dir, { recursive: true });
copyFileSync(`${root}.build/game.html`, `${dir}/game.html`); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(`${root}vendor/hub/${f}`, `${dir}/${f}`);
const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((res) => { let o = ''; const on = (d) => { o += d; const m = o.match(/port (\d+)/); if (m) res(+m[1]); }; server.stdout.on('data', on); server.stderr.on('data', on); });
const b = await chromium.launch({ args: FLAGS }); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2`);
const grab = `(async () => { const e = window.__PIXEL_ENGINE__; if (!e) return null; const was = e.manual; const f = await e.renderer.capture().catch(() => null); if (!f) return null; const c = document.createElement('canvas'); c.width = f.width; c.height = f.height; const g = c.getContext('2d'); g.putImageData(new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height), 0, 0); g.imageSmoothingEnabled = false; if (e.hud.canvas?.width) g.drawImage(e.hud.canvas, 0, 0, f.width, f.height); return c.toDataURL(); })()`;
let got = 0;
for (let i = 0; i < 90 && got < 1; i++) {
  await p.waitForTimeout(1000);
  const fr = p.frames().find((f) => f.url().includes('aihub=1')); if (!fr) continue;
  const st = await fr.evaluate(() => window.__GAME__?.scene?.status?.(window.__GAME__.ctx) ?? null).catch(() => null);
  if (i % 10 === 0) console.log('st', st);
  if (st?.startsWith('medley | card')) { await fr.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.step(1); }).catch(() => {}); const url = await fr.evaluate(grab).catch(() => null); if (url) { writeFileSync(`${root}.shots/card.png`, Buffer.from(url.split(',')[1], 'base64')); got++; console.log('card', st); } }
}
await b.close(); server.kill();
