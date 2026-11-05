// gamepad (Playwright): a DualSense in the browser's standard mapping, given to the page through navigator.getGamepads,
// so the engine's own polling reads it as it would a real pad. The title by ✕, play by the d-pad, the sticks, ✕, △, ○,
// Create (the map) and Options (pause); prompts switch to PlayStation shapes; Options is ignored while Create is held.
import { open, bootWait } from '../shot.mjs';
export async function run(t) {
  process.env.TMPDIR = new URL('../../.tmp/', import.meta.url).pathname;
  const { browser, page, errors } = await open({ w: 1280, h: 720 });
  await page.addInitScript(() => {
    const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: null };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null], configurable: true });
    window.__pad = { set(i, on) { pad.buttons[i].pressed = on; pad.buttons[i].touched = on; pad.buttons[i].value = on ? 1 : 0; pad.timestamp++; }, axis(i, v) { pad.axes[i] = v; pad.timestamp++; } };
  });
  await page.reload();
  const snap = () => page.evaluate(() => window.__game.debug.snapshot());
  const S = fn => page.evaluate(fn);
  const hold = async (i, ms = 400) => { await page.evaluate(i => window.__pad.set(i, true), i); await page.waitForTimeout(ms); await page.evaluate(i => window.__pad.set(i, false), i); await page.waitForTimeout(250); };
  const idle = () => page.waitForFunction(() => { const P = window.__game.debug.S.party; return !P.tw && !P.queued; }, null, { timeout: 30000, polling: 50 });
  try {
    await bootWait(page); await page.waitForTimeout(600);
    await hold(0); t.check('pad ✕ on the title picks New Game', await S(() => window.__game.sceneName) === 'create');
    t.check('the last device is the gamepad', await S(() => window.__game.input.lastDevice) === 'gamepad');
    t.check('prompts show PlayStation shapes', await S(() => window.__game.debug.B.badgeOf('confirm').kind === 'ps' && window.__game.debug.B.badgeOf('confirm').text === '✕'));
    await hold(1); t.check('pad ○ backs out to the title', await S(() => window.__game.sceneName) === 'title');
    await S(() => { const D = window.__game.debug; D.warp('f1', 2, 14, 0); window.__game.go('play', null, { fade: 0 }); });
    await page.waitForFunction(() => window.__game.sceneName === 'play', null, { timeout: 20000 }); await page.waitForTimeout(500);
    await hold(12); await idle(); t.check('d-pad ↑ steps forward', (await snap()).cell[1] === 13);
    await hold(15); await idle(); t.check('d-pad → turns right', (await snap()).dir === 1);
    await hold(14); await idle();
    await S(() => window.__pad.axis(1, -1)); await page.waitForTimeout(500); await S(() => window.__pad.axis(1, 0)); await idle();
    t.check('the left stick steps forward', (await snap()).cell[1] <= 12);
    const d0 = (await snap()).dir; await S(() => window.__pad.axis(2, 1)); await page.waitForTimeout(300); await S(() => window.__pad.axis(2, 0)); await idle();
    t.check('a right-stick flick turns', (await snap()).dir === (d0 + 1) % 4);
    await S(() => window.__pad.axis(2, -1)); await page.waitForTimeout(300); await S(() => window.__pad.axis(2, 0)); await idle();
    await hold(0, 150); await page.waitForTimeout(400); t.check('a ✕ tap takes the item ahead into the Hand', !!(await snap()).hand);
    await hold(0, 900); await page.waitForTimeout(400); t.check('✕ held puts the Hand down', !(await snap()).hand);
    await hold(3); t.check('△ opens the Party screen', (await snap()).ui === 'party');
    await hold(5); t.check('R1 switches member there', await S(() => window.__game.debug.SCREENS.party.m === 1));
    await hold(1); t.check('○ closes it', !(await snap()).ui);
    await hold(8, 300); await page.waitForTimeout(300); t.check('Create (on release) opens the map', (await snap()).ui === 'map');
    await hold(1); t.check('○ closes the map', !(await snap()).ui);
    await hold(9); t.check('Options pauses into the menu', await S(() => window.__game.paused));
    await S(() => window.__game.resume()); await page.waitForTimeout(300);
    await S(() => window.__pad.set(8, true)); await page.waitForTimeout(250); await hold(9); await S(() => window.__pad.set(8, false)); await page.waitForTimeout(400);
    t.check('Options is ignored while Create is held (and the map stays shut)', !(await S(() => window.__game.paused)) && !(await snap()).ui);
    await hold(2); t.check('□ is Party Strike (the front row swings)', await S(() => window.__game.debug.S.party.members[0].cool.main > 0 || window.__game.debug.S.log.some(l => /swings at the air/.test(l.text))));
    t.check('no errors with the pad', !errors.length && !(await S(() => window.__game.errors.length)), errors.join(' | '));
  } finally { await browser.close(); }
}
