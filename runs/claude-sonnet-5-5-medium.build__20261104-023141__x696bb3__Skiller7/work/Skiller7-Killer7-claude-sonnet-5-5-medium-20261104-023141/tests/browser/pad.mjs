// A faked standard-mapping DualSense: L2 aims, the right stick turns the view, R2 fires, glyphs switch to the pad's.
import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 960, h: 540 }); let n = 0, bad = 0; const c = (w, ok, d = '') => { n++; if (!ok) { bad++; console.log('FAIL ' + w + ' ' + d); } };
await page.addInitScript(() => { window.__pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  navigator.getGamepads = () => [{ id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', axes: window.__pad.axes, buttons: window.__pad.buttons, timestamp: performance.now() }]; });
await page.reload(); await waitStarted(page); await page.waitForTimeout(1000);
const ev = (f, a) => page.evaluate(f, a);
await ev(() => { S7.newGame(); }); await page.waitForTimeout(800); await ev(() => { S7.game.debug.skipCutscene(); S7.st.flags.intro_done = true; S7.game.debug.teleport('00A', 'start'); S7.st.done['00A:card'] = true; S7.st.done['00A:tut_scan'] = true; S7.game.debug.skipCutscene(); });
const press = (i, on) => ev(([i, on]) => { __pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; }, [i, on]);
await press(0, true); await page.waitForTimeout(900); c('✕ runs the rail', (await ev(() => S7.st.s)) > 1); await press(0, false);
c('glyphs are the pad\'s', (await ev(() => S7.game.input.label('go'))) === '✕', await ev(() => S7.game.input.label('go')));
await press(6, true); await page.waitForTimeout(400); c('L2 aims', (await ev(() => S7.st.mode)) === 'aim');
const y0 = await ev(() => S7.st.aim.yaw); await ev(() => { __pad.axes[2] = 1; }); await page.waitForTimeout(500); await ev(() => { __pad.axes[2] = 0; }); c('right stick turns the view', Math.abs((await ev(() => S7.st.aim.yaw)) - y0) > .3);
const s0 = await ev(() => S7.st.stats.shots); await press(7, true); await page.waitForTimeout(150); await press(7, false); await page.waitForTimeout(200); c('R2 fires', (await ev(() => S7.st.stats.shots)) > s0);
c('no page errors', !errors.length, errors.join('|')); console.log(bad ? `${bad} of ${n} checks failed` : `all ${n} checks passed`); await browser.close();
