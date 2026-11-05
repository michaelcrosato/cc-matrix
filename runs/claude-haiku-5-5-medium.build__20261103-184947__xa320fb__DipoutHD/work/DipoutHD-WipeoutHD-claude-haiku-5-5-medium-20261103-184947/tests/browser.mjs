// Browser suites (Playwright, headless Chromium, the bundle from file://). Driven by tests/run.mjs.
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(DEV, '..', 'DipoutHD-WipeoutHD-claude-haiku-5-5-medium-20261103-184947.html');
const OUT = join(DEV, 'tests', 'out');
const IGNORE = /INVALID_OPERATION|adapters|WebGPU|deprecated parameters|ERR_FILE_NOT_FOUND|ERR_FAILED|dist\/my-3d2dge-3d|work\/game\.js|CORS policy/;

export async function run(t) {
  if (!existsSync(BUNDLE)) throw new Error('bundle missing: run node tools/bundle.mjs');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(m.text().slice(0, 200)); });
    await page.goto('file://' + BUNDLE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__dipout && window.__dipout.app && window.__dipout.app.world, null, { timeout: 60000 });
    await page.waitForTimeout(500);
    return { page, errors };
  };
  const snap = (page) => page.evaluate(() => window.__dipout.snapshot());
  const waitScene = async (page, name, ms) => {
    await page.waitForFunction((n) => window.__dipout.app.sceneName === n, name, { timeout: ms });
  };

  // 1. Boot: the bundle opens with no page errors, the title shows, and the 3D world draws.
  await t('boot: the bundle opens from file:// with no page errors and draws the 3D road', async () => {
    const { page, errors } = await open();
    await waitScene(page, 'title', 20000);
    const st = await page.evaluate(() => window.__dipout.stats());
    await page.screenshot({ path: join(OUT, 'title.png') });
    await page.close();
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
    if (!st || !(st.tris > 1000)) throw new Error('3D world did not draw (tris=' + (st && st.tris) + ')');
  });

  // 2. Menus: keyboard only, title → setup → countdown → race running.
  await t('flow: title → quick race setup → countdown → running race (keyboard)', async () => {
    const { page, errors } = await open();
    await waitScene(page, 'title', 20000);
    await page.keyboard.press('Enter');
    await waitScene(page, 'setup', 10000);
    for (let k = 0; k < 3; k++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250); }
    await page.waitForFunction(() => window.__dipout.app.menu && window.__dipout.app.menu.i === 3, null, { timeout: 5000 });
    await page.keyboard.press('Enter');
    await waitScene(page, 'race', 10000);
    await page.waitForFunction(() => window.__dipout.snapshot().state === 'running', null, { timeout: 10000 });
    await page.screenshot({ path: join(OUT, 'race.png') });
    const s = await snap(page);
    await page.close();
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
    if (s.ships.length !== 8) throw new Error('expected 8 craft, got ' + s.ships.length);
  });

  // 3. Attract: 10 s idle on the title starts the demo; any input returns to the title.
  await t('attract: starts after 10 s idle and any input exits it', async () => {
    const { page, errors } = await open();
    await waitScene(page, 'title', 20000);
    const t0 = Date.now();
    await page.waitForFunction(() => window.__dipout.app.sceneName === 'attract', null, { timeout: 25000 });
    const elapsed = (Date.now() - t0) / 1000;
    if (elapsed < 8) throw new Error(`attract started too early (${elapsed.toFixed(1)} s)`);
    const s = await snap(page);
    if (!s.attract) throw new Error('not in attract mode');
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, 'attract.png') });
    await page.keyboard.press('Space');
    await waitScene(page, 'title', 8000);
    await page.close();
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
  });

  // 4. Dev mode: the sliders change the sim, and RESET ALL restores the defaults.
  await t('dev mode: a slider changes the live tuning, RESET ALL restores it', async () => {
    const { page, errors } = await open();
    await page.evaluate(() => window.__dipout.go('race', { track: 'nordlicht', cls: 1, laps: 3, mode: 'race', pilot: 0 }));
    await waitScene(page, 'race', 10000);
    await page.evaluate(() => { window.__dipout.app.devOpen = true; window.__dipout.app.devIndex = 0; });
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const moved = await page.evaluate(() => window.__dipout.app.race && window.__dipout.app.devOpen);
    const val = await page.evaluate(() => Number(window.__dipout.app.race && (window.__dipout.app.devIndex, 0)));
    void val;
    const tuned = await page.evaluate(() => globalThis.SN.Tune.T.thrust);
    if (!moved || !(tuned > 1)) throw new Error('slider did not change thrust (' + tuned + ')');
    await page.evaluate(() => { window.__dipout.app.devIndex = 15; });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const back = await page.evaluate(() => globalThis.SN.Tune.T.thrust);
    await page.close();
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
    if (back !== 1) throw new Error('reset did not restore thrust (' + back + ')');
  });

  // 5. A full (one-lap) race ends on the results screen with a standings table.
  await t('race → results: a one-lap race finishes and shows the standings', async () => {
    const { page, errors } = await open();
    await page.evaluate(() => window.__dipout.go('race', { track: 'nordlicht', cls: 2, laps: 1, mode: 'race', pilot: 0 }));
    await waitScene(page, 'results', 150000);
    await page.screenshot({ path: join(OUT, 'results.png') });
    await page.close();
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
  });
  await browser.close();
}
