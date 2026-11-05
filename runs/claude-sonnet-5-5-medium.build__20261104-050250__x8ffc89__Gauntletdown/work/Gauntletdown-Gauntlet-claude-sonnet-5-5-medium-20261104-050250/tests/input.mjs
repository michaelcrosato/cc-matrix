import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + (e.stack || e).toString().slice(0, 500))); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)); });
// a mock DualSense in the standard mapping
await p.addInitScript(() => { window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 }; navigator.getGamepads = () => window.__pad.on ? [window.__pad] : [null, null, null, null]; });
await p.goto(pathToFileURL(resolve('game/index.html')).href); await p.waitForTimeout(1500);
const st = () => p.evaluate(() => JSON.stringify(__gd.game.debug.snapshot()));
await p.evaluate(() => __gd.game.debug.startRun([0])); await p.waitForTimeout(500); await p.keyboard.press('Space'); await p.waitForTimeout(500);
// mouse aim and click
await p.mouse.move(900, 300); await p.waitForTimeout(100); await p.mouse.move(950, 320); await p.waitForTimeout(200);
await p.mouse.down(); await p.waitForTimeout(1500);
console.log('shots in flight (mouse fire):', await p.evaluate(() => __gd.W.shots.length + ' aim ' + JSON.stringify(__gd.W.heroes[0].aim.map(v => +v.toFixed(2))) + ' fired ' + __gd.W.heroes[0].shotsFired));
await p.mouse.up();
// gamepad: plug in, press Options on pad -> player 2 joins
await p.evaluate(() => { __pad.on = true; }); await p.waitForTimeout(200);
await p.evaluate(() => { __pad.buttons[9].pressed = true; }); await p.waitForTimeout(150); await p.evaluate(() => { __pad.buttons[9].pressed = false; }); await p.waitForTimeout(500);
console.log('players after Options:', await p.evaluate(() => __gd.game.players.length + ' heroes ' + __gd.W.heroes.length + ' ' + __gd.W.heroes.map(h => h.C.id)));
// left stick right + right stick up + R2
await p.evaluate(() => { __pad.axes = [1, 0, 0, -1]; __pad.buttons[7].pressed = true; __pad.buttons[7].value = 1; }); const x0 = await p.evaluate(() => __gd.W.heroes[1] && Math.round(__gd.W.heroes[1].x));
await p.waitForTimeout(1200);
console.log('p2 moved:', x0, '->', await p.evaluate(() => Math.round(__gd.W.heroes[1].x)), 'aim', await p.evaluate(() => JSON.stringify(__gd.W.heroes[1].aim.map(v => +v.toFixed(2)))), 'label fire:', await p.evaluate(() => __gd.game.players[1].label('fire') + ' / ' + __gd.game.players[1].label('magic')));
await p.evaluate(() => { __pad.axes = [0, 0, 0, 0]; __pad.buttons[7].pressed = false; __pad.buttons[3].pressed = true; }); await p.waitForTimeout(200); await p.evaluate(() => { __pad.buttons[3].pressed = false; });
await p.screenshot({ path: 'shots/input-pad.png' });
console.log(await st());
console.log(errs.length ? errs.join('\n') : 'no page errors');
await b.close();
