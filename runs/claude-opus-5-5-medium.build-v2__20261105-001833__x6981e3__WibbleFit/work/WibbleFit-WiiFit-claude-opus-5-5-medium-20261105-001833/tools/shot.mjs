// tools/shot.mjs <scene[:json-args]>... [--size 1920x1080] [--frames 60] [--js "code"] : screenshots for composition and legibility only.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const argv = process.argv.slice(2); const shots = []; let size = '960x540', frames = 60, js = null, setup = null, out = '.shots';
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a === '--size') size = argv[++i]; else if (a === '--frames') frames = +argv[++i]; else if (a === '--js') js = argv[++i]; else if (a === '--setup') setup = argv[++i]; else if (a === '--out') out = argv[++i]; else shots.push(a); }
mkdirSync(out, { recursive: true });
const [w, h] = size.split('x').map(Number);
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
const browser = await chromium.launch({ args: FLAGS });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
const file = new URL('../.build/game.html', import.meta.url).href;
await page.goto(file); await page.evaluate(() => window.__PIXEL_READY__);
if (setup) await page.evaluate(setup);
const grab = `async (name) => { const e = window.__PIXEL_ENGINE__; const f = await e.renderer.capture(); const c = document.createElement('canvas'); c.width = f.width; c.height = f.height; const g = c.getContext('2d'); g.putImageData(new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height), 0, 0); g.imageSmoothingEnabled = false; if (e.hud.canvas?.width) g.drawImage(e.hud.canvas, 0, 0, f.width, f.height); return c.toDataURL('image/png'); }`;
for (const s of shots) {
  const [spec, after] = s.split('@@'); const [id, raw] = spec.split(/:(.*)/); const args = raw ? JSON.parse(raw) : {};
  await page.evaluate(async ({ id, args, frames }) => {
    const A = window.__GAME__, e = window.__PIXEL_ENGINE__;
    e.manual = false;
    if (A.scene?.id !== id || Object.keys(args).length) { A.go(id, args); }
    const t0 = performance.now();
    while ((A.loading || A.scene?.id !== id) && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 50));
    if (id === 'activity') { A.devDriver = args.skill ?? 'good'; A.scene.onDriverChange?.(); A.scene.firstTime = false; if (!args.intro) A.scene.afterIntro(); }
    for (let i = 0; i < frames; i++) { e.step(1); if (i % 20 === 0) await new Promise((r) => setTimeout(r, 0)); }
  }, { id, args, frames });
  if (js) await page.evaluate(js);
  if (after) { await page.evaluate(after); await page.evaluate(async () => { const e = window.__PIXEL_ENGINE__; for (let i = 0; i < 90; i++) { e.step(1); if (i % 20 === 0) await new Promise((r) => setTimeout(r, 0)); } }); }
  const url = await page.evaluate(`(${grab})()`);
  const name = `${out}/${id}${args.id ? `-${args.id}` : ''}${after ? `-${shots.indexOf(s)}` : ''}.png`;
  writeFileSync(name, Buffer.from(url.split(',')[1], 'base64'));
  console.log('shot', name, await page.evaluate(() => window.__GAME__.scene?.status?.(window.__GAME__.ctx)));
}
if (errs.length) console.log('ERRORS', errs.slice(0, 6).join('\n'));
await browser.close();
