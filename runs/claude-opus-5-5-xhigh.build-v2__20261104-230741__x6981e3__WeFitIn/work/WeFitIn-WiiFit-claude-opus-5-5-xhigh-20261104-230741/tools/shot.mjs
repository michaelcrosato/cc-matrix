// A screenshot of the built game, only for what a script can't judge: composition and legibility.
// node tools/shot.mjs <out-name> "<js run in the page, awaited>" [--size 1920x1080] [--frames 30]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { BASE_NAME } from '../src/data/title.js';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const [W, H] = flag('size', '1920x1080').split('x').map(Number);
const frames = Number(flag('frames', 30));
const shots = [];
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
for (let i = 0; i < positional.length; i += 2) shots.push([positional[i], positional[i + 1] ?? '']);

const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
const browser = await chromium.launch({ args: FLAGS });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console ${m.text()}`); });
await page.goto(pathToFileURL(join(DEV, '..', `${BASE_NAME}.html`)).href);
await page.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 60000 });
await page.evaluate(() => window.__PIXEL_READY__);
mkdirSync(join(DEV, '.shots'), { recursive: true });
for (const [name, js] of shots) {
  // Manual time: a scene change only advances when frames are stepped, so go() steps until it lands.
  if (js) await page.evaluate(`(async () => { const G = window.__GAME__, e = window.__PIXEL_ENGINE__;
    const wait = () => new Promise((r) => setTimeout(r, 0));
    const go = async (id, args) => { let done = false; G.go(id, args).then(() => { done = true; }); for (let i = 0; !done && i < 4000; i++) { e.step(1); await wait(); } };
    ${js} })()`);
  const dataUrl = await page.evaluate(async (n) => {
    const e = window.__PIXEL_ENGINE__;
    e.step(n);
    const f = await e.renderer.capture();
    const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
    const g = c.getContext('2d'); g.putImageData(new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height), 0, 0);
    g.imageSmoothingEnabled = false;
    if (e.hud.canvas?.width) g.drawImage(e.hud.canvas, 0, 0, f.width, f.height);
    return c.toDataURL('image/png');
  }, frames);
  const out = join(DEV, '.shots', `${name}.png`);
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(out);
}
if (errors.length) console.log(errors.slice(0, 8).join('\n'));
await browser.close();
