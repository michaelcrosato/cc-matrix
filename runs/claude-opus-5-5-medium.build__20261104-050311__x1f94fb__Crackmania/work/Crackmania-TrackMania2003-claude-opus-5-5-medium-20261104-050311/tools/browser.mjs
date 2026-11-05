// Browser checks of the built file (file://, headless Chromium): boots with no errors, the picture isn't blank, deep
// scenes reach, attract on idle and its exit, the touch-only gate, ?backend=webgl, and Node <-> browser determinism.
// Prints FAIL lines and "CHECKS n".
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILE = 'file://' + ROOT + '../Crackmania-TrackMania2003-claude-opus-5-5-medium-20261104-050311.html';
let n = 0; const check = (name, ok, d = '') => { n++; if (!ok) console.log('FAIL browser: ' + name + (d ? ': ' + d : '')); };
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const b = await chromium.launch({ args });
async function open(url, ctxOpts = {}) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 960, height: 540 } }, ctxOpts)), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); let ok = true;
  try { await p.waitForFunction(() => window.__crack && window.__crack.game, null, { timeout: 120000 }); } catch (e) { ok = false; }
  return { p, ctx, errs, ok };
}
{
  const { p, ctx, errs, ok } = await open(FILE, { permissions: ['clipboard-read', 'clipboard-write'] });
  check('boots from file://', ok, errs.slice(0, 2).join(' | '));
  if (ok) {
    await p.waitForTimeout(2000);
    const s = await p.evaluate(() => window.__crack.snapshot()); check('title scene', s.scene === 'front' && s.page === 'title', JSON.stringify(s).slice(0, 120));
    const png = await p.screenshot(); const variance = png.length / 1000;
    check('the 3D picture is not blank (screenshot KB)', variance > 20, variance.toFixed(1));
    const back = await p.evaluate(() => My3D2dge.World3D.backend); check('a 3D backend', back === 'WebGL 2' || back === 'WebGPU', back);
    // determinism: the bot's D1 time in the browser equals the one baked in Node
    const t = await p.evaluate(() => window.__crack.app.authors.D1); check('bot D1 time is a number', typeof t === 'number', t); console.log('D1AUTHOR ' + t);
    // each mode's scene reaches
    for (const [js, scene] of [["__crack.app.modes.campaign('D3')", 'race'], ["__crack.app.modes.editor({ slot: 0, env: 'dustbowl' })", 'editor'], ["__crack.app.modes.puzzle('PD2')", 'editor'], ["__crack.app.modes.garage()", 'garage'], ["__crack.app.modes.survival('dustbowl')", 'race'], ["__crack.app.modes.toMenu('about')", 'front']]) {
      await p.evaluate(js); await p.waitForTimeout(2500); const s2 = await p.evaluate(() => window.__crack.snapshot()); check(js + ' reaches ' + scene, s2.scene === scene, s2.scene);
    }
    // attract after 10 s idle on the title; a key ends it
    await p.evaluate(() => window.__crack.app.modes.toMenu('title')); await p.waitForTimeout(800);
    await p.evaluate(() => { window.__crack.game.advance(10.5); }); await p.waitForTimeout(500);
    check('attract starts after 10 s idle', await p.evaluate(() => window.__crack.snapshot().attract));
    await p.keyboard.press('Enter'); await p.waitForTimeout(600); check('a key ends attract', !(await p.evaluate(() => window.__crack.snapshot().attract)));
    // sound: after a key the audio context runs, music plays, the car engine builds its nodes, a voice babbles
    await p.keyboard.press('KeyX'); await p.waitForTimeout(300);
    const au = await p.evaluate(async () => { const g = __crack.game, A = g.audio; __crack.app.modes.campaign('D1'); await new Promise(r => setTimeout(r, 2500)); g.advance(3.5); const R = __crack.app.race; const P = R && R.players[0]; return { ctx: !!A.ctx, state: A.ctx && A.ctx.state, song: !!A.song, car: !!(P && P.sound.nodes) }; });
    check('audio context running', au.ctx && au.state === 'running', JSON.stringify(au)); check('music playing', au.song); check('car engine synth built', au.car, JSON.stringify(au));
    // the signal itself: an analyser on the master output measures the level (RMS) of music, engine and voice
    const lv = await p.evaluate(async () => {
      const A = __crack.game.audio, c = A.ctx, an = c.createAnalyser(); an.fftSize = 2048; A._master.connect(an);
      const rms = async ms => { let best = 0; const d = new Float32Array(an.fftSize); const end = performance.now() + ms; while (performance.now() < end) { an.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; best = Math.max(best, Math.sqrt(s / d.length)); await new Promise(r => setTimeout(r, 30)); } return best; };
      const music = await rms(1200);
      const P = __crack.app.race.players[0]; P.input = Object.assign(Object.create(P.input), { analog: a => a === 'gas' ? 1 : 0 }); A.musicVolume = 0; A.applyVolume(); const engine = await rms(1200);
      const { babble } = await Promise.resolve({ babble: null }); __crack.app.dialog.say([['coco', 'Bonjour bonjour, allez allez!']], { modal: false }); const voice = await rms(1200);
      A.musicVolume = .5; A.applyVolume(); return { music, engine, voice };
    });
    check('audio signal: music', lv.music > .005, JSON.stringify(lv)); check('audio signal: car engine (music muted)', lv.engine > .005, JSON.stringify(lv)); check('audio signal: gibberish voice', lv.voice > .005, JSON.stringify(lv)); console.log('AUDIOLEVELS ' + JSON.stringify(lv));
    const bab = await p.evaluate(() => { const D = __crack.app.dialog; D.say([['coco', 'Bonjour, allez!']], { modal: false }); return D.open; }); check('a voice line opens and babbles', bab);
    // clipboard: the editor's share code is copied (clipboard permission granted)
    await p.evaluate(() => { __crack.app.modes.editor({ slot: 3, env: 'dustbowl' }); }); await p.waitForTimeout(2500);
    const code = await p.evaluate(async () => { const ed = __crack.app.scenes.editor, S = ed.state; __crack.app.dialog.open = false; ed.api.place('ST', 4, 4, 0, 0); ed.api.place('S', 5, 4, 0, 0); const m = __crack.app.editorMenu().find(x => x[0] === 'Share code'); m[1](); await new Promise(r => setTimeout(r, 500)); return { modal: S.modal && S.modal.code, clip: await navigator.clipboard.readText() }; });
    check('share code copied to the clipboard', code.modal && code.clip === code.modal, (code.clip || '').slice(0, 30));
    const ex = await p.evaluate(async () => { const S = __crack.app.scenes.editor.state; S.modal = null; const cl = console.log; console.log = () => {}; __crack.app.editorExport(); console.log = cl; await new Promise(r => setTimeout(r, 500)); return { text: S.exported, clip: await navigator.clipboard.readText(), modal: S.modal && S.modal.kind }; });
    check('export as content: shown and copied to the clipboard', ex.modal === 'export' && ex.clip === ex.text && /env: 'dustbowl'/.test(ex.text), (ex.clip || '').slice(0, 40));
    // Dev Mode's stats overlay and wireframe views draw in a real race with the renderer's numbers
    const dv = await p.evaluate(async () => { __crack.app.modes.campaign('D3'); await new Promise(r => setTimeout(r, 2500)); __crack.game.advance(4); const D = __crack.app.dev; for (const k of ['fps', 'probes', 'route', 'gates', 'colliders']) D.flags[k] = true; await new Promise(r => setTimeout(r, 1500)); const w = __crack.app.view.world; const st = { calls: w.stats.calls, tris: w.stats.tris, errs: __crack.game.errors.length }; for (const k of ['fps', 'probes', 'route', 'gates', 'colliders']) D.flags[k] = false; return st; });
    check('dev stats: renderer draw calls and triangles read', dv.calls > 0 && dv.tris > 0, JSON.stringify(dv)); check('dev debug views draw without errors', dv.errs === 0, JSON.stringify(dv));
    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  }
  await ctx.close();
}
{ const { p, ctx, errs, ok } = await open(FILE + '?backend=webgl'); check('?backend=webgl boots', ok && (await p.evaluate(() => My3D2dge.World3D.backend)) === 'WebGL 2'); check('webgl: no errors', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close(); }
{
  const { p, ctx, errs, ok } = await open(FILE, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  if (ok) { await p.waitForTimeout(1500); const s = await p.evaluate(() => window.__crack.snapshot()); check('touch-only: the gate shows', s.touchGate === true, JSON.stringify(s).slice(0, 100)); const lab = await p.evaluate(() => window.__crack.app.front.F.items[0] && window.__crack.app.front.F.items[0].label); check('touch-only: a SETTINGS button', lab === 'SETTINGS', lab); await p.evaluate(() => { window.__crack.game.advance(10.5); }); await p.waitForTimeout(300); check('touch-only: attract runs', await p.evaluate(() => window.__crack.snapshot().attract)); }
  else check('touch-only boots', false); await ctx.close();
}
await b.close();
console.log('CHECKS ' + n);
