import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
await p.goto(pathToFileURL(resolve('game/index.html')).href); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__txt = []; const f = My3D2dge.font.text; My3D2dge.font.text = function (g, s, ...a) { window.__txt.push(String(s)); return f.call(this, g, s, ...a); }; __gd.game.settings.set('glyphs', 'xbox'); __gd.game.input.lastDevice = 'gamepad'; });
const BAD = /✕|○|□|△|\bR2\b|\bL2\b|\bR1\b|\bL1\b|Options|Create|\bSpace\b|\bEnter\b|\bEsc\b|Left click|Right click|Shift/;
const scenes = [['title', {}], ['menu', {}], ['select', {}], ['scores', {}], ['about', {}], ['over', {}], ['ending', {}]];
const bad = [];
const grab = async name => { await p.evaluate(() => { __gd.game.input.lastDevice = 'gamepad'; }); await p.waitForTimeout(300); await p.evaluate(() => { window.__txt.length = 0; __gd.game.input.lastDevice = 'gamepad'; }); await p.waitForTimeout(400); const t = await p.evaluate(() => { const x = window.__txt.splice(0); return x; }); for (const s of t) if (BAD.test(s)) bad.push(name + ': ' + s); return t.length; };
for (const [s, d] of scenes) { await p.evaluate(([s, d]) => __gd.game.go(s, d, { fade: 0 }), [s, d]); await p.waitForTimeout(300); await p.evaluate(() => { window.__txt.length = 0; }); console.log(s, await grab(s), 'strings'); }
for (let i = 0; i < 8; i++) { await p.evaluate(i => { __gd.game.go('howto', {}, { fade: 0 }); setTimeout(() => {}, 0); }, i); await p.waitForTimeout(250); await p.evaluate(() => { window.__txt.length = 0; }); for (let k = 0; k < i; k++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80); } await p.evaluate(() => { __gd.game.input.lastDevice = 'gamepad'; }); await grab('howto' + i); }
await p.evaluate(() => { __gd.game.debug.startRun([0, 1]); }); await p.waitForTimeout(800); await grab('floor card'); await p.evaluate(() => { __gd.W.cardT = 0; __gd.W.heroes[0].pickT = 3; __gd.W.heroes[0].hp = 150; __gd.W.heroes[1].down = true; __gd.W.contT = 5; __gd.W.contN = 5; }); await grab('hud');
console.log(bad.length ? 'NON-XBOX TEXT:\n' + bad.join('\n') : 'no PlayStation/keyboard names under Xbox glyphs on any screen checked'); console.log(errs.join('\n') || 'no page errors'); await b.close();
