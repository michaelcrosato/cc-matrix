/** @file Browser acceptance: native controls, medical UI, live tools, audio, idle demo and responsive/touch layouts. */
import { readFileSync, mkdirSync, writeFileSync, globSync } from 'node:fs';
import { chromium, webkit, devices } from '@playwright/test';
import { args, executablePath, ready, url, virtualPad, pad } from './browser.mjs';
let passed = 0,
  failed = 0;
const check = (name, ok, why = '') => {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${why ? ': ' + String(why).slice(0, 300) : ''}`);
  }
};
const run = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    check(name, false, e.message);
  }
};
mkdirSync('out/page', { recursive: true });
const browser = await chromium.launch({ executablePath, args });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.addInitScript(virtualPad);
const page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await run('packaged boot', async () => {
  await ready(page);
  check('ready from file', await page.evaluate(() => window.__engine.ready));
  check('title name', (await page.title()) === 'Bar Cry');
  check('music initially 10%', await page.evaluate(() => window.__game.audio.volume('music') === 0.1));
  await page.screenshot({ path: 'out/page/title-desktop.png' });
});
await run('mouse and keyboard route', async () => {
  await page.getByRole('button', { name: 'Co-op', exact: true }).hover();
  check(
    'hover moves focus',
    await page.getByRole('button', { name: 'Co-op', exact: true }).evaluate((e) => e === document.activeElement),
  );
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  check('merc choice', await page.evaluate(() => window.__game.screen() === 'merc'));
  await page.screenshot({ path: 'out/page/merc.png' });
  await page.getByRole('button', { name: 'Take the warrant' }).click();
  await page.waitForFunction(() => window.__game.context.c?.mode === 'story', undefined, { timeout: 60000 });
  check('first-person play', await page.evaluate(() => window.__game.screen() === 'play'));
  const before = await page.evaluate(() => window.__game.context.p.actor.z);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  await page.waitForFunction((z) => window.__game.context.p.actor.z !== z, before, { timeout: 20000 });
  check('keyboard actually moves', true);
  await page.keyboard.press('Escape');
  check('keyboard pause', await page.evaluate(() => window.__game.screen() === 'pause'));
  const tick = await page.evaluate(() => window.__engine.info().tick);
  await page.waitForTimeout(350);
  check('pause stops simulation', await page.evaluate((t) => window.__engine.info().tick === t, tick));
  await page.screenshot({ path: 'out/page/pause.png' });
});
await run('live developer tools', async () => {
  await page.getByRole('button', { name: 'Dev Mode', exact: true }).click();
  check('dev reachable from pause', await page.evaluate(() => window.__game.screen() === 'dev'));
  const range = page.getByRole('slider', { name: 'Wear per shot' });
  await range.evaluate((el) => {
    el.value = '0.02';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  check(
    'live wear slider',
    await page.evaluate(() => window.__engine.state('campaign').settings['game.wear.perShot'] === 0.02),
  );
  await page.getByRole('button', { name: 'Reset to defaults', exact: true }).click();
  check(
    'balance reset',
    await page.evaluate(() => Math.abs(window.__game.context.frame.setting('game.wear.perShot') - 0.0012) < 1e-10),
  );
  await page.screenshot({ path: 'out/page/dev.png' });
});
await run('map remains live and medicine acts in the world', async () => {
  await page.evaluate(() => {
    window.__game.open('play');
    window.__engine.actions.run('place', { place: 'mission' });
    window.__game.open('map');
  });
  await page.waitForFunction(() => window.__game.screen() === 'map');
  const tick = await page.evaluate(() => window.__engine.info().tick);
  await page.waitForTimeout(700);
  check('map does not pause', await page.evaluate((t) => window.__engine.info().tick > t, tick));
  await page.screenshot({ path: 'out/page/map.png' });
  await page.evaluate(() => {
    window.__game.open('map');
    window.__engine.actions.run('hurt', { hp: 12 });
    window.__engine.step(1, { p: ['heal'] });
  });
  await page.waitForFunction(() => window.__game.context.p.seat.data.action.startsWith('surgery'), undefined, {
    timeout: 20000,
  });
  check('critical press becomes surgery', true);
  await page.screenshot({ path: 'out/page/medical.png' });
  await page.evaluate(() => {
    window.__engine.step(180);
    window.__game.open('pause');
  });
});
await run('credits mirror the interview', async () => {
  const interview = JSON.parse(readFileSync('../exit-interview.json', 'utf8'));
  await page.evaluate(() => window.__game.open('about'));
  const text = await page.locator('[data-screen="about"]').textContent();
  for (const value of Object.values(interview.sourceInformation))
    check('About source value', text.includes(value), value);
  for (const name of ['testingFeedback', 'engineFeedback', 'promptFeedback'])
    for (const value of interview[name]) check(`About ${name}`, text.includes(value), value);
  await page.screenshot({ path: 'out/page/about.png' });
});
await run('synthesized audio', async () => {
  const report = await page.evaluate(() => window.__game.audioCheck());
  writeFileSync('out/page/audio.json', JSON.stringify(report, null, 2));
  for (const item of [...report.songs, ...report.effects])
    check('non-silent unclipped ' + item.id, item.peak > 0.00001 && item.peak <= 1.01 && item.rms > 0);
  check('offline formant voice', report.offline.peak > 0.00001 && report.offline.peak <= 1.01);
});
await run('standard-pad menus and glyphs', async () => {
  await page.evaluate(() => window.__game.context.quit());
  if (await page.getByRole('button', { name: 'Continue', exact: true }).count()) await pad(page, 13);
  await pad(page, 0);
  check('pad selects New Game', await page.evaluate(() => window.__game.screen() === 'merc'));
  await pad(page, 13);
  await pad(page, 13);
  await pad(page, 0);
  await page.waitForFunction(() => window.__game.context.c?.mode === 'story', undefined, { timeout: 60000 });
  await pad(page, 9);
  check('pad opens pause', await page.evaluate(() => window.__game.screen() === 'pause'));
  check('PlayStation is default', (await page.locator('[data-glyph="back"]').last().textContent()) === '○');
  await page.evaluate(() => window.__game.open('settings'));
  await page.locator('[data-next]').click();
  await page.getByLabel('Button glyphs').selectOption('Xbox');
  await pad(page, 12);
  check('Xbox option', (await page.locator('[data-glyph="back"]').last().textContent()) === 'B');
  await page.keyboard.press('ArrowDown');
  check('keyboard glyph returns', (await page.locator('[data-glyph="back"]').last().textContent()) === 'Esc');
});
await run('volume persists', async () => {
  await page.evaluate(() => {
    window.__game.audio.volume('music', 0.22);
    window.__game.context.store.set('audio.music', 0.22);
  });
  await ready(page);
  check('stored music volume', await page.evaluate(() => window.__game.audio.volume('music') === 0.22));
});
await run('ten-second idle demo and exits', async () => {
  await page.evaluate(() => {
    window.__engine.set('game.attract', 'auto');
    window.__game.attract.last = performance.now();
  });
  const begin = Date.now();
  await page.waitForFunction(() => window.__game.attract.active, undefined, { timeout: 22000 });
  check('real ten-second idle', Date.now() - begin >= 9500);
  await page.keyboard.press('Space');
  check(
    'key exits demo',
    await page.evaluate(() => !window.__game.attract.active && window.__game.screen() === 'title'),
  );
  await page.evaluate(() => window.__game.attract.start());
  await page.mouse.move(800, 160);
  check('pointer exits demo', await page.evaluate(() => !window.__game.attract.active));
  await page.evaluate(() => window.__game.attract.start());
  await pad(page, 0, 700);
  check(
    'pad exits to title',
    await page.evaluate(() => !window.__game.attract.active && window.__game.screen() === 'title'),
  );
  await page.evaluate(() => window.__engine.set('game.attract', 'off'));
});
await run('tablet and wide-screen visual layout', async () => {
  for (const [name, width, height] of [
    ['tablet', 768, 1024],
    ['wide', 2560, 1080],
    ['small-desktop', 1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    check(
      'no horizontal overflow ' + name,
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.screenshot({ path: `out/page/${name}.png` });
  }
});
const engineErrors = await page.evaluate(() => window.__engine.errors ?? []);
writeFileSync('out/page/engine-errors.json', JSON.stringify(engineErrors, null, 2));
check('no page errors', errors.length === 0, errors.join('; '));
check('no handled engine errors', engineErrors.length === 0, JSON.stringify(engineErrors));
await context.close();
await run('phone notice over a running Chromium world', async () => {
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const p = await phone.newPage();
  try {
    await ready(p, '?game.attract=on');
    check(
      'exact phone notice',
      await p.getByRole('heading', { name: 'Controller or keyboard required', exact: true }).isVisible(),
    );
    check('phone settings', await p.getByRole('button', { name: 'Settings', exact: true }).last().isVisible());
    await p.waitForFunction(() => window.__game.attract.active, undefined, { timeout: 20000 });
    check('touch attract runs', true);
    check('no phone overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.screenshot({ path: 'out/page/phone-chromium.png' });
    await p.locator('#touch-settings').tap();
    check('touch can adjust Settings', await p.locator('[data-screen="settings"]').isVisible());
  } finally {
    await phone.close();
  }
});
await browser.close();
await run('WebKit small-phone and tablet notice', async () => {
  const safari = await webkit.launch({
    executablePath: globSync('/home/micha/.cache/ms-playwright/webkit-*/pw_run.sh')[0],
  });
  try {
    for (const [name, size] of [
      ['small-phone', { width: 375, height: 667 }],
      ['tablet', { width: 768, height: 1024 }],
    ]) {
      const c = await safari.newContext({ viewport: size, isMobile: true, hasTouch: true });
      const p = await c.newPage();
      await p.goto(url, { waitUntil: 'domcontentloaded' });
      check(
        'WebKit notice ' + name,
        await p.getByRole('heading', { name: 'Controller or keyboard required', exact: true }).isVisible(),
      );
      check('WebKit settings ' + name, await p.locator('#touch-settings').isVisible());
      check('WebKit no overflow ' + name, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await p.screenshot({ path: `out/page/webkit-${name}.png` });
      await p.locator('#touch-settings').tap();
      await p.waitForSelector('[data-screen="settings"]');
      check('WebKit settings usable ' + name, true);
      await c.close();
    }
  } finally {
    await safari.close();
  }
});
console.log(`COUNT ${passed} ${failed}`);
