import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
await p.addInitScript(() => { window.__pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 }; navigator.getGamepads = () => window.__pad.on ? [window.__pad] : [null, null, null, null]; });
await p.goto(pathToFileURL(resolve('game/index.html')).href); await p.waitForTimeout(1500);
const ev = f => p.evaluate(f), key = async (k, w = 300) => { await p.keyboard.press(k); await p.waitForTimeout(w); };
// class select: keyboard 2 joins, a pad joins with Menu/Options
await key('Enter'); await key('Enter'); await key('Digit2'); console.log('select slots after "2":', await ev(() => __gd.game.players.length));
await ev(() => { __pad.on = true; }); await p.waitForTimeout(200); await ev(() => { __pad.buttons[9].pressed = true; }); await p.waitForTimeout(150); await ev(() => { __pad.buttons[9].pressed = false; }); await p.waitForTimeout(400);
console.log('players after pad Start:', await ev(() => __gd.game.players.length));
await ev(() => __gd.game.settings.set('glyphs', 'xbox')); await ev(() => { __gd.game.input.lastDevice = 'gamepad'; }); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/coop-select-xbox.png' });
// lock all three (p1 keyboard Enter; p2 right half '.', pad confirm A) and start
await key('KeyF'); await key('Period'); await ev(() => { __pad.buttons[0].pressed = true; }); await p.waitForTimeout(150); await ev(() => { __pad.buttons[0].pressed = false; }); await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/coop-select-locked.png' });
console.log('locks', await ev(() => __gd.game.sceneName )); await key('Digit2', 800); console.log('scene', await ev(() => __gd.game.sceneName), 'heroes', await ev(() => __gd.W.heroes.map(h => h.C.id + ':' + (h.input && h.input.device)).join(' ')));
await p.waitForTimeout(5600); await key('Enter', 300);
const x0 = await ev(() => __gd.W.heroes.map(h => Math.round(h.x)));
await p.keyboard.down('KeyD'); await p.keyboard.down('ArrowLeft'); await ev(() => { __pad.axes = [0, 1, 0, 0]; }); await p.waitForTimeout(800); await p.keyboard.up('KeyD'); await p.keyboard.up('ArrowLeft'); await ev(() => { __pad.axes = [0, 0, 0, 0]; });
console.log('x before', x0, 'after', await ev(() => __gd.W.heroes.map(h => Math.round(h.x))));
await p.screenshot({ path: 'shots/coop-play-xbox.png' });
// pause by P2 (right half, Digit2 is its pause) and look for Drop out
await key('Digit2', 700); console.log('paused', await ev(() => __gd.game.paused + ' by P' + __gd.game.pausedBy), 'items:', await ev(() => [...document.querySelectorAll('.esh-btns button')].map(b => b.textContent).join(' | ')));
console.log('map', await ev(() => __gd.W.heroes.map(h => __gd.game.players.indexOf(h.input)).join(','))); await p.getByRole('button', { name: /Drop out/i }).click(); await p.waitForTimeout(500);
console.log('errors', await ev(() => __gd.game.errors.map(e => e.message))); console.log('after drop out: heroes', await ev(() => __gd.W.heroes.length), 'players', await ev(() => __gd.game.players.length), 'paused', await ev(() => __gd.game.paused));
console.log(errs.join('\n') || 'no page errors'); await b.close();
