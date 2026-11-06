// Browser helpers: real Chromium on the built html, via file:// unless a server is needed.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { BASE_NAME } from '../../src/data/title.js';

export const DEV = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const HTML = join(DEV, '..', `${BASE_NAME}.html`);
export const FILE_URL = pathToFileURL(HTML).href;
export const WEBGPU_FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];

export const launch = () => chromium.launch({ args: WEBGPU_FLAGS });

export const READY = () => window.__PIXEL_READY__ !== undefined;
export async function bootPage(page, url = FILE_URL) {
  await page.goto(url);
  await page.waitForFunction(READY, null, { timeout: 90000 });
  await page.evaluate(() => window.__PIXEL_READY__);
}

/** Copy the game and harness into a temp folder in the dev folder, and serve it on an OS-picked port. */
export async function serveHarness() {
  const dir = join(DEV, '.harness');
  mkdirSync(dir, { recursive: true });
  copyFileSync(HTML, join(dir, 'game.html'));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(DEV, 'vendor', 'hub', f), join(dir, f));
  const child = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((resolve, reject) => {
    const onData = (d) => { const m = /port (\d+)/.exec(String(d)); if (m) resolve(Number(m[1])); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    setTimeout(() => reject(new Error('no port')), 15000);
  });
  return { port, stop: () => { child.kill('SIGTERM'); rmSync(dir, { recursive: true, force: true }); } };
}
export const PAD_INIT = () => {
  window.__pads = [0, 1, 2, 3].map(() => ({ buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] }));
  window.__padCount = 1;
  navigator.getGamepads = () => [0, 1, 2, 3].map((i) => (i < window.__padCount ? { id: 'Stub', index: i, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pads[i].axes, buttons: window.__pads[i].buttons } : null));
};
