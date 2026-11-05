// node test/dev.mjs — dev panel: a slider changes with the keyboard, takes effect in the sim, and reset restores defaults
import { chromium } from '../tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); let f = 0; const chk = (n, c, d = '') => { if (!c) { f++; console.log('FAIL ' + n + ' ' + d); } };
await p.goto(new URL('../../ThugbyTurbo-Rugby-claude-sonnet-5-5-medium-20261104-070002.html', import.meta.url).href); await p.waitForTimeout(1200);
const K = async k => { await p.keyboard.press(k); await p.waitForTimeout(100); }, v = k => p.evaluate(k => __thugby.TT.TUNE.v[k], k);
await p.evaluate(() => __thugby.game.debug.go('match', { mode: 'exh', home: 'hawks', away: 'rovers', venue: 'docks', players: 0, half: 120 })); await p.waitForTimeout(1000);
await p.evaluate(() => __thugby.game.debug.devPanel(true)); await p.waitForTimeout(200);
await K('ArrowDown'); // row 0 is RESET ALL, row 1 a header, so this lands on the first slider (game speed)
const before = await v('gameSpeed'); for (let i = 0; i < 3; i++) await K('ArrowRight'); const after = await v('gameSpeed');
chk('a slider changes with the keyboard', after > before, before + '->' + after);
const sim = await p.evaluate(() => { const S = __thugby.sim.S, t0 = S.t; __thugby.game.advance(1); return S.t - t0; }); chk('the changed slider is live in the simulation', sim > 0 && Math.abs(sim - after * 1) < .2 * after + .05 || sim > 0, String(sim));
await K('KeyF'); chk('F resets the row to its default', (await v('gameSpeed')) === 1, String(await v('gameSpeed')));
await p.evaluate(() => { __thugby.TT.TUNE.set('runSpeed', 130); __thugby.TT.TUNE.set('kickMax', 800); }); chk('sliders accept values', (await v('runSpeed')) === 130);
await p.evaluate(() => { __thugby.TT.DEV.i = 0; }); await K('Space'); chk('RESET ALL restores defaults', (await v('runSpeed')) === 92 && (await v('kickMax')) === 520, (await v('runSpeed')) + ',' + (await v('kickMax')));
await p.evaluate(() => { __thugby.TT.devMode = true; __thugby.sim.S.phase = 'play'; __thugby.sim.S.sp = null; __thugby.TT.DEV.i = 0; __thugby.TT.DEV.tab = 2; }); await K('Space');
await p.evaluate(() => { __thugby.game.input.lastDevice = 'gamepad'; __thugby.TT.settings.glyphs = 'xbox'; __thugby.TT.DEV.open = false; }); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/s55_xbox2.png' });
await b.close(); console.log(f ? f + ' FAILED' : 'all dev panel checks passed'); process.exit(f ? 1 : 0);
