import { chromium } from 'playwright'; import { GAME } from '../lib/browser.mjs';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
let n = 0, bad = 0; const c = (w, ok, d = '') => { n++; console.log((ok ? 'ok   ' : 'FAIL ') + w + (ok ? '' : ' ' + d)); if (!ok) bad++; };
await page.goto('file://' + GAME + '?backend=webgl'); await page.waitForFunction(() => window.S7 && S7.started && S7.game.sceneName, null, { timeout: 60000 }); await page.waitForTimeout(1000);
const ev = (f, a) => page.evaluate(f, a);
// Animalese: count oscillators created while a line is "spoken", per speaker; pitches differ by speaker
const v = await ev(async () => { const a = S7.game.audio; a._init(); const ctx = a.ctx; await ctx.resume(); const made = []; const orig = ctx.createOscillator.bind(ctx);
  ctx.createOscillator = () => { const o = orig(); const f = o.frequency.setValueAtTime.bind(o.frequency); o.frequency.setValueAtTime = (v, t) => { o._f = v; return f(v, t); }; made.push(o); return o; };
  const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
  for (const who of ['murmel', 'grau', 'rurik']) { made.length = 0; for (const ch of 'Hello guest') { S7.audio.speak(who, ch); await wait(60); } out[who] = { n: made.length, f: made.length ? made[0]._f : 0 }; }
  return { state: ctx.state, out }; });
c('the audio context runs', v.state === 'running', JSON.stringify(v)); c('Animalese blips are made for each spoken line', Object.values(v.out).every(x => x.n >= 6), JSON.stringify(v.out)); c('speakers have different pitches', v.out.murmel.f > v.out.grau.f * 2, JSON.stringify(v.out));
const l = await ev(() => { const ctx = S7.game.audio.ctx, made = []; const o = ctx.createOscillator.bind(ctx); ctx.createOscillator = () => { const x = o(); made.push(x); return x; }; S7.audio.laugh('giggle', .3, .8, 1); return made.length; }); c('laughter synth makes a burst of voices', l >= 5, l + '');
// sliders change the game live
await ev(() => { S7.newGame(); }); await page.waitForTimeout(800); await ev(() => { S7.game.debug.skipCutscene(); S7.game.debug.teleport('00A', 'start'); S7.st.done['00A:card'] = true; S7.st.done['00A:tut_scan'] = true; S7.game.debug.skipCutscene(); });
const sp = async () => { const s0 = await ev(() => S7.st.s); await page.keyboard.down('w'); await page.waitForTimeout(1000); await page.keyboard.up('w'); return Math.abs((await ev(() => S7.st.s)) - s0); };
const slow = await ev(() => { S7.setTune('walkSpeed', 1.5); return 1; }) && await sp(); await ev(() => { S7.resetTune(); S7.game.debug.teleport('00A', 'start'); S7.game.debug.skipCutscene(); }); const fast = await sp();
c('the walk-speed slider changes how far you run', fast > slow * 1.8, slow.toFixed(1) + ' vs ' + fast.toFixed(1));
// the dev panel's slider rows drive the same values
await ev(() => { S7.ui.push(new S7.screens.Dev()); const d = S7.ui.top(); d.tab = 3; }); await page.keyboard.press('ArrowDown'); for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
c('the dev panel slider moves a value', (await ev(() => S7.T('walkSpeed'))) > 3.6, await ev(() => S7.T('walkSpeed'))); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter'); await page.waitForTimeout(200); c('reset restores the default', (await ev(() => S7.T('walkSpeed'))) === 3.6); await ev(() => S7.ui.pop());
// mouse look: what the engine's pointer lock hands us (camera.mouse) turns the aim
await page.keyboard.down('Shift'); await page.waitForTimeout(400); const y0 = await ev(() => S7.st.aim.yaw); await ev(() => { S7.pres.world.camera.mouse[0] = 300; S7.pres.world.camera.mouse[1] = -120; }); await page.waitForTimeout(300); const y1 = await ev(() => S7.st.aim.yaw), p1 = await ev(() => S7.st.aim.pitch);
c('captured mouse movement turns the aim', y1 - y0 > .4 && p1 > .1, y0 + ' -> ' + y1 + ' pitch ' + p1); await page.keyboard.up('Shift');
c('no page errors', !errors.length, errors.join('|')); console.log(bad ? `${bad} of ${n} checks failed` : `all ${n} checks passed`); await browser.close();
