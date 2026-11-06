/** Browser, launch, and hub checks. They drive the built page. */
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, devices } from 'playwright';

const SCRATCH = process.env.SOC_SCRATCH
  || '/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-224040__x24ebb3/tmp/grok-goal-9c48352445aa/implementer';

const HTML = 'The-Second-Opinion-Clinic-Trauma-Center-Second-Opinion-grok-4.7-xhigh-20261104-224040.html';

const GPU = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-webgpu-adapter=swiftshader',
  '--use-vulkan=swiftshader',
  '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required',
  '--no-sandbox',
];

const ARENAS = [
  ['op1', 'forearm'],
  ['op2', 'stomach'],
  ['op3', 'ferry'],
  ['op4', 'bone'],
  ['op5', 'liver'],
  ['op6', 'kidney'],
  ['op7', 'lung'],
  ['op8', 'heart'],
  ['op9', 'chest'],
  ['op10', 'spine'],
];

function fileUrl(root, query = '') {
  const href = pathToFileURL(join(root, '..', HTML)).href;
  return query ? `${href}?${query}` : href;
}

async function browserApp() {
  return chromium.launch({ headless: true, args: GPU });
}

async function installPads(context, count) {
  await context.addInitScript((n) => {
    const make = (index) => ({
      connected: true,
      mapping: 'standard',
      index,
      id: 'stand-in',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      vibrationActuator: { playEffect: () => Promise.resolve('complete') },
    });
    const pads = [null, null, null, null];
    for (let i = 0; i < n; i++) pads[i] = make(i);
    window.__pads = pads;
    navigator.getGamepads = () => window.__pads;
  }, count);
}

async function poke(page, key, ready, arg) {
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press(key);
    if (!ready) {
      await page.waitForTimeout(200);
      return true;
    }
    try {
      await page.waitForFunction(ready, arg, { timeout: 700 });
      return true;
    } catch {
      /* the frame may have missed a short press */
    }
  }
  return false;
}

async function openPage(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__GAME__, { timeout: 45000 });
  return { page, errors };
}

function pressPad(page, index, button, down) {
  return page.evaluate(({ index, button, down }) => {
    const pad = window.__pads[index];
    pad.buttons[button].pressed = down;
    pad.buttons[button].value = down ? 1 : 0;
  }, { index, button, down });
}

export async function browser(root, check) {
  mkdirSync(SCRATCH, { recursive: true });
  const log = [];
  const note = (line) => log.push(line);
  const browser = await browserApp();
  try {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await installPads(context, 1);
    const { page, errors } = await openPage(context, fileUrl(root));
    await page.waitForTimeout(400);
    const alone = await page.evaluate(() => ({
      active: window.AIHub ? window.AIHub.active : null,
      seeded: window.AIHub ? window.AIHub.seeded : null,
      mode: window.__GAME__.app.mode,
    }));
    check('standalone hub flag', alone.active === false && alone.seeded !== true);
    note(`alone ${JSON.stringify(alone)}`);
    await poke(page, 'Enter');
    await poke(page, 'Space');
    await poke(page, 'Enter');
    await poke(page, 'Space');
    const afterKeys = await page.evaluate(() => ({
      mode: window.__GAME__.app.mode,
      focus: window.__GAME__.app.focus,
      canvas: !!document.querySelector('canvas'),
    }));
    check('keys still draw', afterKeys.canvas && afterKeys.mode !== 'title');
    note(`after keys ${JSON.stringify(afterKeys)}`);
    await context.close();

    const menuCtx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await installPads(menuCtx, 1);
    const menu = await openPage(menuCtx, fileUrl(root));
    await poke(menu.page, 'Enter', () => window.__GAME__.app.mode === 'menu');
    await poke(menu.page, 'ArrowDown', () => window.__GAME__.app.focus === 1);
    const focusKey = await menu.page.evaluate(() => window.__GAME__.app.focus);
    check('keyboard moves focus', focusKey === 1);
    const point = await menu.page.evaluate(() => {
      const art = window.__GAME__.art;
      const box = document.querySelector('canvas').getBoundingClientRect();
      const artY = 74 + 2 * 26;
      return { x: box.left + box.width * 0.4, y: box.top + (artY / art.h) * box.height };
    });
    await menu.page.mouse.move(point.x, point.y);
    let hovered = { focus: focusKey, device: 'key', confirm: 'ENTER' };
    try {
      await menu.page.waitForFunction(() => window.__GAME__.app.focus === 2 && window.__GAME__.prompts.device === 'mouse', { timeout: 2000 });
      hovered = await menu.page.evaluate(() => ({
        focus: window.__GAME__.app.focus,
        device: window.__GAME__.prompts.device,
        confirm: window.__GAME__.prompts.confirm,
      }));
    } catch {
      hovered = await menu.page.evaluate(() => ({
        focus: window.__GAME__.app.focus,
        device: window.__GAME__.prompts.device,
        confirm: window.__GAME__.prompts.confirm,
        pointer: window.__GAME__.app.ctx.input.pointer,
      }));
    }
    check('hover moves focus', hovered.focus === 2 && hovered.device === 'mouse' && hovered.confirm === 'ENTER');
    note(`hover ${JSON.stringify(hovered)} point ${point.x},${point.y}`);
    await menu.page.mouse.move(30, 8);
    await menu.page.waitForTimeout(150);

    const downOk = await poke(menu.page, 'ArrowDown', () => window.__GAME__.app.focus === 3);
    const beforeEnter = await menu.page.evaluate(() => ({ mode: window.__GAME__.app.mode, focus: window.__GAME__.app.focus }));
    note(`before settings ${JSON.stringify(beforeEnter)} down ${downOk}`);
    const enterOk = await poke(menu.page, 'Enter', () => window.__GAME__.app.mode === 'settings');
    const rightOk = await poke(menu.page, 'ArrowRight', () => window.__GAME__.app.settings.glyphs === 'xbox');
    const beforePad = await menu.page.evaluate(() => ({
      mode: window.__GAME__.app.mode,
      focus: window.__GAME__.app.focus,
      glyphs: window.__GAME__.app.settings.glyphs,
      device: window.__GAME__.prompts.device,
    }));
    note(`before pad ${JSON.stringify(beforePad)} enter ${enterOk} right ${rightOk}`);
    // Button 8 only marks the pad as the last device. Button 0 confirms the glyphs row and would toggle it.
    await pressPad(menu.page, 0, 8, true);
    try {
      await menu.page.waitForFunction(() => {
        const p = window.__GAME__.prompts;
        return p.glyphs === 'xbox' && p.device === 'pad' && p.confirm === 'A';
      }, { timeout: 2000 });
    } catch { /* recorded below */ }
    const xbox = await menu.page.evaluate(() => window.__GAME__.prompts);
    check('xbox glyphs', xbox.glyphs === 'xbox' && xbox.device === 'pad' && xbox.confirm === 'A');
    note(`xbox ${JSON.stringify(xbox)}`);
    await pressPad(menu.page, 0, 8, false);
    await poke(menu.page, 'ArrowLeft', () => window.__GAME__.prompts.device === 'key' && window.__GAME__.prompts.confirm === 'ENTER');
    const keyed = await menu.page.evaluate(() => window.__GAME__.prompts);
    check('key prompt', keyed.device === 'key' && keyed.confirm === 'ENTER');
    await menuCtx.close();

    const attract = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await installPads(attract, 1);
    const idle = await openPage(attract, fileUrl(root));
    await idle.page.waitForTimeout(11000);
    const started = await idle.page.evaluate(() => ({
      mode: window.__GAME__.app.mode,
      save: localStorage.getItem('soc:save:v1'),
      settings: localStorage.getItem('soc:settings'),
    }));
    check('attract after idle', started.mode === 'attract' && started.save == null);
    note(`attract ${JSON.stringify(started)}`);
    await idle.page.keyboard.press('Escape');
    await idle.page.waitForTimeout(200);
    const left = await idle.page.evaluate(() => ({
      mode: window.__GAME__.app.mode,
      save: localStorage.getItem('soc:save:v1'),
    }));
    check('key exits attract', left.mode === 'title' && left.save == null);
    await attract.close();

    const attractPad = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await installPads(attractPad, 1);
    const idlePad = await openPage(attractPad, fileUrl(root));
    await idlePad.page.waitForTimeout(11000);
    await pressPad(idlePad.page, 0, 0, true);
    await idlePad.page.waitForTimeout(300);
    const padLeft = await idlePad.page.evaluate(() => ({
      mode: window.__GAME__.app.mode,
      save: localStorage.getItem('soc:save:v1'),
    }));
    check('pad exits attract', padLeft.mode === 'title' && padLeft.save == null);
    note(`pad attract ${JSON.stringify(padLeft)}`);
    await attractPad.close();

    const dev = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await installPads(dev, 1);
    const devPage = await openPage(dev, fileUrl(root, 'op=op1&seed=1&bot=0&hold=1'));
    await poke(devPage.page, 'Escape', () => window.__GAME__.app.mode === 'pause');
    for (let i = 1; i <= 4; i++) await poke(devPage.page, 'ArrowDown', (n) => window.__GAME__.app.focus === n, i);
    await poke(devPage.page, 'Enter', () => window.__GAME__.app.mode === 'dev');
    await poke(devPage.page, 'ArrowRight', () => Math.abs(window.__GAME__.config.vitalsDrainMul - 1.1) < 0.001);
    const slid = await devPage.page.evaluate(() => window.__GAME__.config.vitalsDrainMul);
    await poke(devPage.page, 'End', () => window.__GAME__.app.focus === window.__GAME__.app.devRows().length - 1);
    await poke(devPage.page, 'Enter', () => Math.abs(window.__GAME__.config.vitalsDrainMul - 1) < 0.001);
    const reset = await devPage.page.evaluate(() => window.__GAME__.config.vitalsDrainMul);
    check('dev slider live', Math.abs(slid - 1.1) < 0.001 && Math.abs(reset - 1) < 0.001);
    note(`slider ${slid} reset ${reset}`);
    await dev.close();

    const coop = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await installPads(coop, 2);
    const coopPage = await openPage(coop, fileUrl(root, 'op=op1&seed=1&bot=0&seats=2'));
    const beforeSeats = await coopPage.page.evaluate(() => window.__GAME__.sim.seats.map((s) => s.x));
    await coopPage.page.evaluate(() => {
      window.__pads[0].axes[0] = 1;
      window.__pads[1].axes[0] = -1;
    });
    await coopPage.page.waitForTimeout(700);
    const seats = await coopPage.page.evaluate(() => window.__GAME__.sim.seats.map((s) => s.x));
    check('two pads two tips', seats[0] > beforeSeats[0] + 0.2 && seats[1] < beforeSeats[1] - 0.2);
    note(`seats ${beforeSeats.join(',')} -> ${seats.join(',')}`);
    await coop.close();

    const aim = await browser.newContext({ viewport: { width: 960, height: 540 } });
    await installPads(aim, 1);
    const aimPage = await openPage(aim, fileUrl(root, 'op=op1&seed=1&bot=0'));
    await aimPage.page.waitForTimeout(300);
    const aimed = await aimPage.page.evaluate(async () => {
      const g = window.__GAME__;
      const cam = g.app.ctx.camera.camera;
      const v = cam.position.clone();
      v.set(-3.1, 0.3, -1.1);
      v.project(cam);
      const box = document.querySelector('canvas').getBoundingClientRect();
      const x = box.left + ((v.x + 1) / 2) * box.width;
      const y = box.top + ((1 - v.y) / 2) * box.height;
      return { x, y, r: g.sim.entities.find((e) => e.id === 'p1').r };
    });
    await aimPage.page.mouse.move(aimed.x, aimed.y);
    await aimPage.page.mouse.down();
    await aimPage.page.waitForTimeout(800);
    await aimPage.page.mouse.up();
    const drained = await aimPage.page.evaluate(() => {
      const pool = window.__GAME__.sim.entities.find((e) => e.id === 'p1');
      return { r: pool.r, done: pool.done, device: window.__GAME__.app.device };
    });
    check('mouse drain', (drained.done === true || drained.r < aimed.r - 0.05) && drained.device === 'mouse');
    note(`mouse drain ${aimed.r} -> ${JSON.stringify(drained)}`);
    await aim.close();

    const phone = devices['Pixel 7'];
    const touch = await browser.newContext({ ...phone });
    const touchPage = await openPage(touch, fileUrl(root));
    await touchPage.page.waitForTimeout(500);
    const gate = await touchPage.page.evaluate(() => ({
      text: document.getElementById('touch-gate')?.textContent || '',
      stick: !!document.querySelector('[data-t="stick"]'),
      buttons: [...document.querySelectorAll('button')].map((b) => b.textContent),
    }));
    await touchPage.page.waitForTimeout(11000);
    const phoneMode = await touchPage.page.evaluate(() => window.__GAME__.app.mode);
    check('touch gate', gate.text === 'Controller or keyboard required' && gate.stick === false && phoneMode === 'attract');
    check('touch settings', gate.buttons.some((t) => t && t.includes('\u2699')));
    note(`touch ${JSON.stringify(gate)} mode ${phoneMode}`);
    await touch.close();

    const shot = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const shotPage = await openPage(shot, fileUrl(root));
    await shotPage.page.waitForTimeout(600);
    await shotPage.page.screenshot({ path: join(SCRATCH, 'title.png') });
    await shotPage.page.goto(fileUrl(root, 'scene=night'), { waitUntil: 'load' });
    await shotPage.page.waitForFunction(() => window.__GAME__ && window.__GAME__.app.mode === 'story');
    await shotPage.page.waitForTimeout(400);
    await shotPage.page.screenshot({ path: join(SCRATCH, 'bust.png') });
    for (const [op, arena] of ARENAS) {
      await shotPage.page.goto(fileUrl(root, `op=${op}&seed=1&god=1&hold=1&bot=0`), { waitUntil: 'load' });
      await shotPage.page.waitForFunction(() => window.__GAME__ && window.__GAME__.sim);
      await shotPage.page.waitForTimeout(400);
      await shotPage.page.screenshot({ path: join(SCRATCH, `arena-${arena}.png`) });
    }
    await shotPage.page.goto(fileUrl(root, 'op=op1&seed=1&bot=0&hold=1'), { waitUntil: 'load' });
    await shotPage.page.waitForFunction(() => window.__GAME__ && window.__GAME__.sim);
    await shotPage.page.waitForTimeout(300);
    await shotPage.page.screenshot({ path: join(SCRATCH, 'hud.png') });
    await poke(shotPage.page, 'Escape', () => window.__GAME__.app.mode === 'pause');
    for (let i = 1; i <= 4; i++) await poke(shotPage.page, 'ArrowDown', (n) => window.__GAME__.app.focus === n, i);
    await poke(shotPage.page, 'Enter', () => window.__GAME__.app.mode === 'dev');
    for (let i = 1; i <= 3; i++) await poke(shotPage.page, 'e', (n) => window.__GAME__.app.devTab === n, i);
    await poke(shotPage.page, 'ArrowDown', () => window.__GAME__.app.focus === 1);
    await poke(shotPage.page, 'Enter', () => window.__GAME__.app.mode === 'results');
    await shotPage.page.waitForTimeout(300);
    const rankMode = await shotPage.page.evaluate(() => window.__GAME__.app.mode);
    await shotPage.page.screenshot({ path: join(SCRATCH, 'results.png') });
    check('results stamp screen', rankMode === 'results');
    note(`results mode ${rankMode}`);
    note(`page errors ${errors.join(' | ')}`);
    check('browser page errors', errors.length === 0);
    await shot.close();
  } finally {
    await browser.close();
    writeFileSync(join(SCRATCH, 'browser.txt'), log.join('\n') + '\n');
  }
}

export async function launch(root, check) {
  mkdirSync(SCRATCH, { recursive: true });
  const browser = await browserApp();
  const runs = [];
  try {
    for (let n = 1; n <= 2; n++) {
      const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(fileUrl(root, 'op=op1&seed=1&bot=0&hold=1'), { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction(() => window.__GAME__ && window.__GAME__.sim, { timeout: 45000 });
      await page.waitForTimeout(600);
      const state = await page.evaluate(() => {
        const g = window.__GAME__;
        const eng = g.engine;
        const framing = eng.renderer ? eng.renderer.framing : null;
        const canvas = document.querySelector('canvas');
        const rect = canvas.getBoundingClientRect();
        const before = g.sim.entities.find((e) => e.id === 'p1');
        const r0 = before ? before.r : null;
        const done0 = before ? !!before.done : null;
        for (let i = 0; i < 45; i++) g.act({ tool: 'drain', place: true, x: -3.1, z: -1.1, use: true, seat: 0 });
        const after = g.sim.entities.find((e) => e.id === 'p1');
        return {
          music: g.music,
          fingerprint: g.app.fingerprint(),
          r0,
          r1: after ? after.r : null,
          done0,
          done: after ? after.done : null,
          framing,
          canvas: { w: rect.width, h: rect.height },
          view: { w: window.innerWidth, h: window.innerHeight },
          errors: (eng.errors || []).slice(0, 6),
          gpu: eng.renderer && eng.renderer.gpuErrors ? eng.renderer.gpuErrors.slice(0, 6) : [],
          active: window.AIHub ? window.AIHub.active : null,
          seeded: window.AIHub ? window.AIHub.seeded : null,
        };
      });
      await page.screenshot({ path: join(SCRATCH, `launch-${n}.png`) });
      const mean = execFileSync('magick', [join(SCRATCH, `launch-${n}.png`), '-format', '%[fx:mean]', 'info:'], { encoding: 'utf8' }).trim();
      state.mean = Number(mean);
      state.pageErrors = errors;
      runs.push(state);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const lines = runs.map((run, i) => `run ${i + 1}\n${JSON.stringify(run, null, 2)}`).join('\n');
  writeFileSync(join(SCRATCH, 'launch.txt'), lines + '\n');
  const a = runs[0];
  const b = runs[1];
  const cover = (run) => run.canvas.w >= run.view.w - 2 && run.canvas.h >= run.view.h - 2;
  const ox = (run) => {
    const f = run.framing || {};
    return (f.offsetX || 0) === 0 && (f.offsetY || 0) === 0;
  };
  check('launch no page errors', runs.every((run) => run.pageErrors.length === 0 && run.errors.length === 0 && run.gpu.length === 0));
  check('launch music 0.1', runs.every((run) => Math.abs(run.music - 0.1) < 0.001));
  check('launch fill', runs.every((run) => cover(run) && ox(run)));
  check('launch painted', runs.every((run) => run.mean > 0.02));
  check('launch drain', runs.every((run) => run.done0 === false && (run.done === true || (run.r1 != null && run.r1 < run.r0 - 0.05))));
  check('launch agree', a.fingerprint === b.fingerprint && a.r1 === b.r1);
  check('launch alone', runs.every((run) => run.active === false && run.seeded !== true));
}

function listenPort(child) {
  return new Promise((resolve, reject) => {
    const take = (buf) => {
      const text = String(buf);
      const match = text.match(/port\s+(\d+)/i) || text.match(/:(\d+)/);
      if (match) resolve(Number(match[1]));
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('exit', (code) => reject(new Error(`http server exited ${code}`)));
  });
}

export async function hub(root, check) {
  mkdirSync(SCRATCH, { recursive: true });
  const child = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: join(root, 'dist'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const log = [];
  let browser;
  try {
    const port = await listenPort(child);
    log.push(`port ${port} pid ${child.pid}`);
    browser = await browserApp();
    const urls = [
      `harness.html?game=game.html&auto=1&players=2`,
      `harness.html?game=game.html&auto=1&players=3&latency=150&jitter=50&loss=5`,
      `harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5`,
      `harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5&scenario=host-leave`,
      `harness.html?game=game.html&auto=1&players=2&scenario=server`,
    ];
    for (const path of urls) {
      const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(`http://127.0.0.1:${port}/${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => document.body.dataset.complete === 'true', { timeout: 150000 });
      const report = await page.evaluate(() => ({
        pass: window.__hubCheck ? window.__hubCheck.pass : false,
        checks: (window.__hubCheck && window.__hubCheck.checks) || [],
      }));
      const bad = report.checks.filter((row) => !row.pass).map((row) => `${row.name}: ${row.detail}`);
      log.push(`${path} pass=${report.pass} errors=${errors.length}`);
      for (const row of bad) log.push(`  ${row}`);
      check(`hub ${path}`, report.pass === true && errors.length === 0);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    if (child.pid) child.kill('SIGTERM');
    writeFileSync(join(SCRATCH, 'hub.txt'), log.join('\n') + '\n');
  }
}
