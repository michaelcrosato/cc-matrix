import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const FILE = fileURLToPath(new URL('..', import.meta.url)) + '../Crackmania-TrackMania2003-claude-sonnet-5-5-medium-20261104-050314.html';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let bad = 0; const ck = (n, ok, d = '') => { if (!ok) { bad++; console.log('FAIL ' + n + ' ' + d); } };
// touch-only device
const t = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage(); const errs = [];
t.on('pageerror', e => errs.push(e.message)); await t.goto('file://' + FILE + '?backend=webgl'); await t.waitForFunction(() => window.__crack && window.__crack.game.sceneName, null, { timeout: 90000 }); await t.waitForTimeout(3000);
ck('touch-only flag in a real touch context', await t.evaluate(() => window.__crack.S.touchOnly()));
await t.screenshot({ path: 'check-output/touch.png' });
await t.evaluate(() => { const S = window.__crack.S; S.idle = 9.8; }); await t.waitForTimeout(6000);
ck('attract runs on touch-only', (await t.evaluate(() => window.__crack.game.sceneName)) === 'attract');
ck('touch no errors', !errs.length, errs.join());
// voices: real audio context, gibberish scheduled
const d = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); await d.goto('file://' + FILE + '?backend=webgl'); await d.waitForFunction(() => window.__crack && window.__crack.game.sceneName, null, { timeout: 90000 });
await d.keyboard.press('Enter'); await d.waitForTimeout(500);
const r = await d.evaluate(async () => { const g = window.__crack.game, A = g.audio; A._init(); await A.ctx.resume(); let n = 0; const o = A._voice.bind(A); A._voice = (...a) => { n++; return o(...a); }; const { } = {}; A.sfx([{ wave: 'triangle', freq: 440, dur: .06, vol: .1 }, { wave: 'square', freq: 500, dur: .06, vol: .1, delay: .07 }]); return { state: A.ctx.state, voices: n }; });
ck('web audio runs and plays synthesized voices', r.state === 'running' && r.voices >= 2, JSON.stringify(r));
console.log(`browser2: ${bad ? bad + ' failed' : 'ok'}`); await b.close(); process.exit(bad ? 1 : 0);
