// Opens the bundled HTML from file:// in headless Chromium (WebGL 2), waits for the title, and reports page and console
// errors. Prints only failures and a one-line count. Usage: node tests/browser-smoke.mjs [seconds]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '..', '..', 'EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-haiku-5-5-medium-20261103-202616.html');
const secs = +(process.argv[2] || 8);
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
await page.goto(pathToFileURL(file).href + '?backend=webgl#', { waitUntil: 'load' });
await page.waitForTimeout(secs * 1000);
const state = await page.evaluate(() => { try { return { scene: window.__game && window.__game.game && window.__game.game.scene && window.__game.game.scene.name, has: !!window.__game }; } catch (e) { return { err: String(e) }; } }).catch(e => ({ err: String(e) }));
await page.screenshot({ path: path.resolve(here, '..', 'shots', 'smoke.png') });
await browser.close();
for (const e of errs.slice(0, 20)) console.log('FAIL ' + e);
console.log(`${errs.length} error(s) · state ${JSON.stringify(state)} · ${secs}s`);
process.exit(errs.length ? 1 : 0);
