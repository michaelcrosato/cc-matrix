// a fake DualSense (standard mapping) through the real engine input path: menus, aiming, firing, a second pad joining
import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => {
  const mk = (i) => ({ id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: i, connected: true, mapping: 'standard', timestamp: performance.now(), axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: null });
  window.__pads = [mk(0), mk(1)]; window.__padOn = 1;
  navigator.getGamepads = () => { const out = [window.__pads[0], window.__padOn > 1 ? window.__pads[1] : null, null, null]; out.forEach(g => { if (g) g.timestamp = performance.now(); }); return out; };
  window.__btn = (pad, i, down) => { const b = window.__pads[pad].buttons[i]; b.pressed = down; b.value = down ? 1 : 0; };
  window.dispatchEvent(new Event('gamepadconnected'));
});
await p.goto(pathToFileURL(resolve(process.argv[2])).href); await p.waitForTimeout(3500);
const tap = async (pad, i, ms = 120) => { await p.evaluate(([a, c]) => window.__btn(a, c, true), [pad, i]); await p.waitForTimeout(ms); await p.evaluate(([a, c]) => window.__btn(a, c, false), [pad, i]); await p.waitForTimeout(120); };
const sc = () => p.evaluate(() => WP.game.sceneName);
console.log('scene', await sc(), 'device', await p.evaluate(() => WP.game.input.lastDevice));
await p.evaluate(() => { window.__padOn = 2; window.dispatchEvent(new Event('gamepadconnected')); });
await p.waitForTimeout(300); await tap(1, 9, 200);   // Options on the second pad: join
await p.waitForTimeout(300); console.log('players after the second pad joins:', await p.evaluate(() => WP.game.players.length), 'seats chip n =', await p.evaluate(() => WP.G.nSeats));
await tap(0, 0); await p.waitForTimeout(500); console.log('after X on START:', await sc());
for (let i = 0; i < 3 && (await sc()) === 'briefing'; i++) await tap(0, 0, 100);
await p.waitForTimeout(3500); console.log('scene', await sc(), 'seats', await p.evaluate(() => WP.G.sim.players.filter(q => q.active).length));
await p.evaluate(() => { WP.G.cheats = { inv: true }; WP.dev.refreshCheats(); });
const a0 = await p.evaluate(() => [WP.G.aim[0].x, WP.G.aim[0].y, WP.G.aim[1].x]);
await p.evaluate(() => { window.__pads[0].axes[0] = 1; window.__pads[1].axes[0] = -1; }); await p.waitForTimeout(500); await p.evaluate(() => { window.__pads[0].axes[0] = 0; window.__pads[1].axes[0] = 0; });
const a1 = await p.evaluate(() => [WP.G.aim[0].x, WP.G.aim[0].y, WP.G.aim[1].x]);
console.log('left stick moved P1 x', a0[0], '->', a1[0], ' P2 x', a0[2], '->', a1[2]);
await p.evaluate(() => window.__btn(0, 7, true)); await p.waitForTimeout(1500); await p.evaluate(() => window.__btn(0, 7, false));
console.log('R2 fired shots:', await p.evaluate(() => WP.G.sim.players[0].shots), ' P2 shots (not firing):', await p.evaluate(() => WP.G.sim.players[1].shots));
const g0 = await p.evaluate(() => WP.G.sim.players[0].grenades); await tap(0, 6); console.log('L2 grenade', g0, '->', await p.evaluate(() => WP.G.sim.players[0].grenades));
await p.evaluate(() => { WP.G.sim.players[0].mag = 10; }); await tap(0, 2); await p.waitForTimeout(300); console.log('square reload started:', await p.evaluate(() => WP.G.sim.players[0].reload > 0 || WP.G.sim.players[0].mag === 30));
await tap(0, 4); console.log('L1 snap moved crosshair (enemies present?)', await p.evaluate(() => WP.G.sim.ents.length));
await tap(0, 9, 200); await p.waitForTimeout(500); console.log('Options pauses:', await p.evaluate(() => WP.game.paused));
await p.screenshot({ path: 'shots/pad-pause.png' });
console.log('label shown', await p.evaluate(() => WP.game.input.label('fire')));
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 5).join('\n') : 'no errors'); await b.close();
