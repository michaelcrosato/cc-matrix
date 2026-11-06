/** @file Browser acceptance against the final file: actual pad menus, a complete shift, developer controls and attract. */
import { chromium } from '@playwright/test';
import { readFileSync, globSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { base } = JSON.parse(readFileSync('identity.json', 'utf8'));
const url = pathToFileURL(resolve('..', base + '.html')).href;
const errors = [];
let page;
const checks = [];
const check = (name, ok, detail = '') => {
  const item = { name, ok: !!ok, detail };
  checks.push(item);
  console.log(JSON.stringify(item));
};
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ?? globSync(`${homedir()}/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`)[0],
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader'],
});
try {
  const context = await browser.newContext({ viewport: { width: 640, height: 360 } });
  await context.addInitScript(() => {
    window.testPads = [];
    navigator.getGamepads = () => window.testPads;
    window.pad = (index, button, value = 1) => {
      let p = window.testPads[index];
      if (!p)
        p = window.testPads[index] = {
          id: 'Standard test controller',
          index,
          connected: true,
          mapping: 'standard',
          axes: [0, 0, 0, 0],
          buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
        };
      p.buttons[button] = { pressed: value > 0.5, touched: value > 0, value };
    };
  });
  page = await context.newPage();
  page.setDefaultTimeout(90000);
  const requests = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log(JSON.stringify({ name: 'runtime exception', ok: false, detail: e.message }));
  });
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await page.goto(url);
  await page.waitForFunction(() => !!window.__surgery && window.__engine?.ready);
  check(
    'portable WebGPU boot',
    errors.length === 0 && (await page.locator('[data-game="title"]').count()) === 1,
    errors.join(' | '),
  );
  check('no external requests', requests.length === 0, requests.join(' | '));
  const pad = async (button, index = 0) => {
    await page.evaluate(([i, b]) => window.pad(i, b, 1), [index, button]);
    await page.waitForFunction(([i, b]) => window.__surgery.hands.previousPads[i]?.[b] > 0.5, [index, button]);
    await page.evaluate(([i, b]) => window.pad(i, b, 0), [index, button]);
    await page.waitForFunction(([i, b]) => (window.__surgery.hands.previousPads[i]?.[b] ?? 0) < 0.5, [index, button]);
  };
  const pick = async (action) => {
    for (let i = 0; i < 30; i++) {
      const active = await page.evaluate(() => document.activeElement?.getAttribute('data-action'));
      if (active === action) {
        await pad(0);
        return;
      }
      await pad(13);
    }
    throw new Error('Pad could not focus ' + action);
  };
  await pad(0);
  check(
    'pad starts a new story',
    await page.evaluate(() => window.__surgery.director.screen === 'story'),
    JSON.stringify(
      await page.evaluate(() => ({
        screen: window.__surgery.director.screen,
        attract: window.__surgery.attract,
        focus: document.activeElement?.outerHTML.slice(0, 200),
      })),
    ),
  );
  if (await page.evaluate(() => window.__surgery.director.screen !== 'story'))
    throw new Error('The default pad accept did not start the story');
  let ops = 0;
  await page.evaluate(() => {
    window.__surgery.autoplay(true);
    window.__engine.timeScale(4);
  });
  for (let guard = 0; guard < 260; guard++) {
    const state = await page.evaluate(() => ({
      screen: window.__surgery.director.screen,
      part: window.__surgery.director.part,
      index: window.__surgery.director.caseIndex,
      ready: window.__engine.ready,
    }));
    if (state.screen === 'credits') break;
    if (state.screen === 'story') {
      await pad(0);
    } else if (state.screen === 'briefing') {
      await pick('operate');
      await page.waitForFunction(() => window.__surgery.state?.status === 'playing' && window.__engine.ready);
    } else if (state.screen === 'op') {
      for (let step = 0; step < 120; step++) {
        const running = await page.evaluate(
          () => window.__surgery.director.screen === 'op' && window.__surgery.state?.status === 'playing',
        );
        if (!running) break;
        await page.evaluate(() => {
          window.__engine.pause();
          window.__engine.timeScale(4);
          window.__engine.step(240);
        });
        await page.waitForTimeout(30);
      }
      await page.waitForFunction(() => ['debrief', 'failed'].includes(window.__surgery.director.screen));
      const result = await page.evaluate(() => ({
        screen: window.__surgery.director.screen,
        id: window.__surgery.state?.caseId,
        reason: window.__surgery.state?.reason,
      }));
      check('browser surgeon completes ' + result.id, result.screen === 'debrief', result.reason);
      if (result.screen === 'failed') throw new Error('Operation failed: ' + result.id);
      ops++;
    } else if (state.screen === 'debrief' || state.screen === 'postcard') {
      await pick('next-result');
    } else await page.waitForTimeout(150);
  }
  check(
    'whole shift reaches credits',
    ops === 8 && (await page.evaluate(() => window.__surgery.director.screen === 'credits')),
  );
  check(
    'eight postcards and Attending unlocked',
    await page.evaluate(
      () =>
        Object.keys(window.__surgery.director.progress.postcards).length === 8 &&
        window.__surgery.director.progress.ended,
    ),
  );
  await page.evaluate(() => {
    window.__surgery.autoplay(false);
    window.__engine.timeScale(1);
    window.__surgery.case('first-cut');
  });
  await page.waitForFunction(
    () => window.__surgery.state?.caseId === 'first-cut' && window.__surgery.meshes.sheet > 0 && window.__engine.ready,
  );
  await page.keyboard.press('Escape');
  await page.locator('[data-action="dev"]').click();
  await page.locator('[data-action="dev-tab:1"]').click();
  const slider = page.locator('[data-balance="vitalsDrain"]');
  await slider.evaluate((el) => {
    el.value = '1.7';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  check(
    'live developer balance',
    await page.evaluate(() => Number(window.__surgery.ui.c.get('game.vitalsDrain')) === 1.7),
  );
  await page.locator('[data-action="balance-reset:vitalsDrain"]').click();
  check('developer reset', await page.evaluate(() => Number(window.__surgery.ui.c.get('game.vitalsDrain')) === 1));
  await page.evaluate(() => {
    window.__surgery.ui.action('board');
    window.__surgery.ui.action('scrub');
  });
  await pad(0, 1);
  await pad(0, 2);
  check(
    'two independent pads claim couch seats',
    await page.evaluate(
      () =>
        window.__surgery.hands.devices.includes(1) &&
        window.__surgery.hands.devices.includes(2) &&
        window.__surgery.director.screen === 'scrub',
    ),
  );
  await page.evaluate(() => {
    window.__surgery.case('first-cut');
  });
  await page.waitForFunction(() => window.__surgery.state?.caseId === 'first-cut' && window.__engine.ready);
  const ids = await page.evaluate(() => [
    window.__surgery.hands.devices.indexOf(1),
    window.__surgery.hands.devices.indexOf(2),
  ]);
  const before = await page.evaluate(() => window.__surgery.state.seats.map((s) => s.x));
  await page.evaluate(() => {
    window.testPads[1].axes[0] = 0.8;
    window.testPads[2].axes[0] = -0.8;
  });
  await page.waitForFunction(
    ([a, b]) => window.__surgery.state?.seats[a]?.x < -0.05 && window.__surgery.state?.seats[b]?.x > 0.05,
    ids,
  );
  await page.evaluate(() => {
    window.testPads[1].axes[0] = 0;
    window.testPads[2].axes[0] = 0;
  });
  const after = await page.evaluate(() => window.__surgery.state.seats.map((s) => s.x));
  check(
    'couch cursors move independently',
    after[ids[0]] < before[ids[0]] && after[ids[1]] > before[ids[1]],
    JSON.stringify({ before, after }),
  );
  await page.evaluate(() => {
    window.__surgery.ui.action('pause');
    window.__surgery.ui.action('settings');
    window.__surgery.ui.settingsTab = 1;
    window.__surgery.ui.render(true);
    window.__surgery.prefs.glyphs = 'Xbox';
  });
  await page.evaluate(() => {
    window.__surgery.ui.action('back');
    window.__surgery.ui.action('resume');
  });
  await pad(7, 1);
  check(
    'controller prompts use Xbox glyph choice',
    (await page.locator('[data-game="prompts"]').innerText()).includes('RT'),
  );
  check(
    'music defaults to ten percent',
    await page.evaluate(() => window.__surgery.sound.audio.volume('music') === 0.1),
  );
  await page.evaluate(() => {
    window.__surgery.ui.action('board');
    window.__surgery.ui.action('back');
  });
  const saved = await page.evaluate(() => JSON.stringify(window.__surgery.ui.c.d.progress));
  for (const device of ['key', 'mouse', 'pad', 'stick']) {
    await page.waitForFunction(() => window.__surgery.attract, { timeout: 22000 });
    check('attract begins after idle: ' + device, (await page.locator('.demo-banner').count()) === 1);
    if (device === 'key') await page.keyboard.press('Enter');
    if (device === 'mouse') await page.mouse.move(Math.random() * 400 + 20, 60);
    if (device === 'pad') await pad(0);
    if (device === 'stick') {
      await page.evaluate(() => (window.testPads[0].axes[0] = 0.9));
      await page.waitForFunction(() => !window.__surgery.attract);
      await page.evaluate(() => (window.testPads[0].axes[0] = 0));
    }
    await page.waitForTimeout(100);
    check(
      'attract wake consumes ' + device,
      await page.evaluate(() => !window.__surgery.attract && window.__surgery.director.screen === 'title'),
    );
  }
  check(
    'attract saves no progress',
    (await page.evaluate(() => JSON.stringify(window.__surgery.ui.c.d.progress))) === saved,
  );
  check('no browser errors after a whole shift', errors.length === 0, errors.join(' | '));
  await context.close();
  for (const profile of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      hasTouch: true,
      isMobile: true,
    });
    const p = await ctx.newPage();
    await p.goto(url);
    await p.waitForFunction(() => !!window.__surgery && window.__engine.ready);
    await p.locator('[data-touch-settings]').waitFor();
    check(
      profile.name + ' requires hardware controls',
      (await p.locator('.touch-cover h2').innerText()) === 'Controller or keyboard required',
    );
    await p.locator('[data-touch-settings]').tap();
    check(profile.name + ' settings accepts taps', (await p.locator('[data-game="settings"]').count()) === 1);
    check(
      profile.name + ' has no virtual controls',
      (await p.locator('[data-touch-stick],[data-touch-button]').count()) === 0,
    );
    await ctx.close();
  }
} catch (error) {
  check(
    'browser acceptance',
    false,
    String(error.stack ?? error).slice(0, 1200) +
      ' | ' +
      errors.join(' | ') +
      ' | ' +
      (page
        ? await page
            .locator('body')
            .innerText()
            .catch(() => '')
        : ''
      ).slice(0, 800),
  );
} finally {
  await browser.close();
}
process.exitCode = checks.some((c) => !c.ok) ? 1 : 0;
