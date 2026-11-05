// A browser run of the bundled file: boot, screenshots of the title and of play, console errors. Usage: node tests/browser/look.mjs [steps]
import { chromium } from 'playwright';
import { NAME } from '../../tools/build.mjs';
const root = new URL('../../..', import.meta.url).pathname, out = new URL('../../shots/', import.meta.url).pathname;
const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--autoplay-policy=no-user-gesture-required'];
const browser = await chromium.launch({ args: ARGS });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
const errs = []; page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 300)); });
await page.goto('file://' + root + NAME + '.html' + (process.env.Q || '?backend=webgl'));
await page.waitForFunction(() => window.B && window.B.game && window.B.game.sceneName === 'title', null, { timeout: 90000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out + 'title.png' });
const script = process.argv[2] || '';
for (const step of script.split(';').filter(Boolean)) {
  const i = step.indexOf('='), k = step.slice(0, i), v = step.slice(i + 1);
  if (k === 'wait') await page.waitForTimeout(+v);
  else if (k === 'key') await page.keyboard.press(v);
  else if (k === 'shot') await page.screenshot({ path: out + v + '.png' });
  else if (k === 'eval') console.log(JSON.stringify(await page.evaluate(v)));
}
console.log(JSON.stringify(await page.evaluate(() => ({ scene: B.game.sceneName, snap: B.game.debug.snapshot(), errors: B.game.errors.map(e => e.where + ': ' + e.message), backend: window.My3D2dge.World3D && window.My3D2dge.World3D.backend }))).slice(0, 1500));
console.log(errs.slice(0, 20).join('\n'));
await browser.close();
