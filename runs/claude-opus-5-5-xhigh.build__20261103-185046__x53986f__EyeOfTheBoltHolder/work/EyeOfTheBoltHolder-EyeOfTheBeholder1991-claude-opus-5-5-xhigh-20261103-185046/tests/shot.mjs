// A browser look: open the bundle from file://, run steps, print errors and the snapshot, save screenshots to shots/.
// node tests/shot.mjs [name] [hash] [steps...]   steps: wait:ms key:Code down:Code up:Code shot:name eval:js
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const ROOT = new URL('../../', import.meta.url), FILE = new URL('EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-xhigh-20261103-185046.html', ROOT);
export const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist'];
export async function open(o = {}) {
  const browser = await chromium.launch({ args: ARGS });
  const ctx = await browser.newContext(o.ctx || { viewport: { width: o.w || 1280, height: o.h || 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(FILE.href + '?backend=' + (o.backend || 'webgl') + (o.hash ? '#' + o.hash : ''));
  return { browser, page, errors };
}
export async function bootWait(page, ms = 120000) { await page.waitForFunction(() => window.__game && window.__game.sceneName && window.__game.sceneName !== 'start', null, { timeout: ms, polling: 100 }); }
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [name = 'boot', hash = '', ...steps] = process.argv.slice(2);
  const { browser, page, errors } = await open({ hash });
  const t0 = Date.now();
  try { await bootWait(page); } catch (e) { console.log('boot timeout', e.message); }
  console.log('booted in', ((Date.now() - t0) / 1000).toFixed(1), 's; scene', await page.evaluate(() => window.__game && window.__game.sceneName));
  for (const s of steps) {
    const [k, ...v] = s.split(':'); const a = v.join(':');
    if (k === 'wait') await page.waitForTimeout(+a);
    else if (k === 'key') await page.keyboard.press(a);
    else if (k === 'down') await page.keyboard.down(a);
    else if (k === 'up') await page.keyboard.up(a);
    else if (k === 'shot') await page.screenshot({ path: fileURLToPath(new URL('../shots/' + a + '.png', import.meta.url)) });
    else if (k === 'eval') console.log('eval', JSON.stringify(await page.evaluate(a)));
    else if (k === 'click') { const [x, y] = a.split(',').map(Number); await page.mouse.click(x, y); }
    else if (k === 'move') { const [x, y] = a.split(',').map(Number); await page.mouse.move(x, y); }
  }
  await page.screenshot({ path: fileURLToPath(new URL('../shots/' + name + '.png', import.meta.url)) });
  console.log('snapshot', JSON.stringify(await page.evaluate(() => window.__game && window.__game.debug && window.__game.debug.snapshot())).slice(0, 600));
  console.log('errors', errors.length ? errors.slice(0, 12).join('\n') : 'none');
  const gerr = await page.evaluate(() => window.__game && window.__game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  if (gerr && gerr.length) console.log('game.errors', gerr.slice(0, 8).join('\n'));
  await browser.close();
}
