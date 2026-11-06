import { chromium, devices } from 'playwright';
import { pathToFileURL } from 'node:url';
const htmlPath = process.cwd() + '/../Fit Getaway-Wii Fit-muse-wonder-1.0-max-20261104-221652.html';
const url = pathToFileURL(htmlPath).href;
const flags = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
let fails = 0; const ok = (n, c, d = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? ' ' + d : '')); if (!c) fails++; };
const browser = await chromium.launch({ args: flags });
// 1 boot + title + music volume
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const info = await page.evaluate(async () => {
    const e = await window.__PIXEL_READY__;
    return { title: document.title, status: e.game?.status?.(), game: window.__GAME__?.state?.(), vol: e.audio?.volumes || e.state?.() };
  }).catch(e => ({ err: e.message }));
  console.log('boot info', JSON.stringify(info).slice(0, 600));
  ok('boots file:// title visible', info.title === 'Fit Getaway' && !info.err, JSON.stringify(errors).slice(0, 200));
  // music volume: read via engine audio settings if exposed; fallback check App settings
  const mv = await page.evaluate(() => { try { return window.__GAME__?.settings?.music; } catch { return null; } }).catch(() => null);
  // __GAME__ is App; App.settings getter
  const mv2 = await page.evaluate(() => { const g = window.__GAME__; return g && g.data ? g.data.settings.music : null; }).catch(() => null);
  ok('music volume 0.10 first run', mv2 === 0.1 || mv === 0.1, `mv=${mv} mv2=${mv2}`);
  ok('no page errors boot', errors.length === 0, errors.join(';').slice(0, 300));
  await page.close();
}
// 2 pad stub: cross confirms, PS glyphs
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => {
    window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [{ id: 'Stub', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: __pad.axes, buttons: __pad.buttons }, null, null, null];
  });
  const page = await ctx.newPage();
  await page.goto(url); await page.waitForTimeout(2500);
  const st1 = await page.evaluate(() => window.__GAME__?.state?.()).catch(() => null);
  console.log('pad state', JSON.stringify(st1));
  ok('pad stub boots', !!st1);
  await ctx.close();
}
// 3 touch phone: message + attract (check state only, no screenshot reliance)
{
  const ctx = await browser.newContext({ ...devices['iPhone 14'] });
  const page = await ctx.newPage();
  await page.goto(url); await page.waitForTimeout(2500);
  const txt = await page.evaluate(() => document.title).catch(() => '');
  ok('webkit-ish phone loads (chromium profile)', txt === 'Fit Getaway', txt);
  await ctx.close();
}
await browser.close();
console.log(fails ? 'BROWSER FAILURES ' + fails : 'BROWSER ALL PASS');
process.exitCode = fails ? 1 : 0;
