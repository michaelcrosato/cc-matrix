import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const htmlPath = process.cwd() + '/../Fit Getaway-Wii Fit-muse-wonder-1.0-max-20261104-221652.html';
const url = pathToFileURL(htmlPath).href;
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(url);
await page.waitForTimeout(3000);
await page.evaluate(async () => { await window.__GAME__.go('still-tree'); });
await page.waitForTimeout(2500);
// step forward into play and capture composite (PLAN recipe)
const dataUrl = await page.evaluate(async () => {
  const e = window.__PIXEL_ENGINE__;
  e.step(240);
  const f = await e.renderer.capture();
  const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
  const g = c.getContext('2d'); g.putImageData(new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height), 0, 0);
  g.imageSmoothingEnabled = false; if (e.hud.canvas?.width) g.drawImage(e.hud.canvas, 0, 0, f.width, f.height);
  return { url: c.toDataURL('image/png'), status: e.game.status() };
});
console.log('status', dataUrl.status);
writeFileSync('check/activity.png', Buffer.from(dataUrl.url.split(',')[1], 'base64'));
await browser.close();
console.log('wrote check/activity.png');
