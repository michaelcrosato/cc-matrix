// browser/play: TASK.md's behaviours in the single file, in Chromium, through real input: the page loads nothing but
// itself; music and voices are made by oscillators (no audio decoded, no media element, no speech synthesis) and a voice
// line is gibberish blips, one or more a syllable; a (fake) standard-mapping DualSense drives the title menu; the mouse
// hovers to move the focus, clicks to pick, and clicks in the world to strike; Escape opens the pause menu, its Dev Mode
// opens the dev screens, a balance slider moved with the keys changes the game at once, and Reset page restores it
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { NAME } from '../../tools/name.mjs';
const INIT = () => {   // in the page, before anything runs: count audio sources and outside fetches; a fake pad
  const A = window.__au = { osc: 0, buffers: 0, decode: 0, media: 0, speech: 0, fetch: 0 };
  const P = (window.BaseAudioContext || window.AudioContext).prototype, wrap = (o, k, n) => { const f = o[k]; if (f) o[k] = function (...a) { A[n]++; return f.apply(this, a); }; };
  wrap(P, 'createOscillator', 'osc'); wrap(P, 'createBufferSource', 'buffers'); wrap(P, 'decodeAudioData', 'decode');
  wrap(HTMLMediaElement.prototype, 'play', 'media'); if (window.speechSynthesis) wrap(window.speechSynthesis, 'speak', 'speech');
  wrap(window, 'fetch', 'fetch'); wrap(XMLHttpRequest.prototype, 'open', 'fetch');
  const pad = () => ({ id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: window.__padPress === i, touched: false, value: window.__padPress === i ? 1 : 0 })) });
  navigator.getGamepads = () => (window.__padOn ? [pad()] : [null]);
};
const G = 'window.My3D2dge.current';
export default async function ({ dev, check }) {
  const require = createRequire(join(dev, 'handoff', 'package.json')), { chromium } = require('playwright');
  const url = pathToFileURL(join(dev, '..', NAME + '.html')).href;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const reqs = [], errs = []; page.on('request', r => reqs.push(r.url())); page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(INIT);
    const ev = (f, a) => page.evaluate(f, a), scene = () => ev(G + '.sceneName');
    const toPage = async (x, y) => ev(([x, y]) => { const g = window.My3D2dge.current, c = g.screen.canvas.getBoundingClientRect(), W = g.renderer ? g.renderer.W : g.W, H = g.renderer ? g.renderer.H : g.H;
      return [c.left + x * c.width / W, c.top + y * c.height / H]; }, [x, y]);
    const padPress = async i => { await ev(i => { window.__padOn = true; window.__padPress = i; }, i); await page.waitForTimeout(160); await ev(() => { window.__padPress = -1; }); await page.waitForTimeout(260); };
    await page.goto(url); await page.waitForTimeout(2500);
    // a DualSense on the title menu: cross opens it, the d-pad moves the cursor, cross picks
    await padPress(0);
    check('pad: cross opens the title menu', await ev(G + '.scene.pressed') === true, '');
    const i0 = await ev(G + '.scene.menu.i'); await padPress(13);
    check('pad: d-pad down moves the menu cursor', await ev(G + '.scene.menu.i') === i0 + 1, i0);
    const pick = await ev(G + '.scene.menu.selected'); await padPress(0); await page.waitForTimeout(900);
    check('pad: cross picks the entry (' + pick + ' opens character select)', await scene() === 'charSelect', await scene());
    await padPress(1); await page.waitForTimeout(900);
    check('pad: circle goes back to the title', await scene() === 'title', await scene());
    await ev(() => { window.__padOn = false; });
    // the mouse on the title menu: hover moves the focus, a click picks
    await page.mouse.move(5, 5); await page.waitForTimeout(150);
    if (!(await ev(G + '.scene.pressed'))) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); }
    const box = await ev(G + '.scene.menu._box'), items = await ev(G + '.scene.menu.items'), kA = items.indexOf('About'), kW = items.indexOf('Workshop');
    let at = await toPage(box.x + box.w / 2, box.y + box.rowH * (kW + .5)); await page.mouse.move(at[0], at[1], { steps: 4 }); await page.waitForTimeout(200);
    check('mouse: hovering Workshop moves the focus to it', await ev(G + '.scene.menu.i') === kW, await ev(G + '.scene.menu.i') + ' want ' + kW);
    at = await toPage(box.x + box.w / 2, box.y + box.rowH * (kA + .5)); await page.mouse.move(at[0], at[1], { steps: 4 }); await page.waitForTimeout(150); await page.mouse.click(at[0], at[1]); await page.waitForTimeout(1200);
    check('mouse: a click on About opens it', await scene() === 'about', await scene());
    // audio: all of it from code
    const a0 = await ev(() => Object.assign({}, window.__au));
    const say = await ev(() => { const B = window.__BENTOU, line = 'Rice that is never tested is only seed.', sy = B.Voice.syllables(line); B.Voice.say(line, 'granny'); return { n: sy.length, sy: sy.map(s => s.s || s.text || s.syl || '').join(' ') }; });
    await page.waitForTimeout(400); const a1 = await ev(() => Object.assign({}, window.__au));
    check('voice: a spoken line is synthesized blips, at least one oscillator a syllable', a1.osc - a0.osc >= say.n && say.n >= 8, (a1.osc - a0.osc) + ' oscillators for ' + say.n + ' syllables');
    await ev(() => window.__BENTOU.Music.play('boss', { restart: true })); await page.waitForTimeout(3000);
    const a2 = await ev(() => Object.assign({}, window.__au)), mn = a2.osc - a1.osc + a2.buffers - a1.buffers, st = await ev(() => { const S = window.My3D2dge.current.audio.song; return S ? S.next : -1; });
    check('music: the step sequencer runs the score (the boss song, 140 bpm: about 28 steps in 3 s) and its notes are oscillators', st >= 20 && mn >= 5, st + ' steps, ' + (a2.osc - a1.osc) + ' oscillators, ' + (a2.buffers - a1.buffers) + ' buffer sources in 3 s');
    // a mission: a click in the world strikes; Escape -> pause -> Dev Mode -> a slider live -> Reset page
    await page.goto('about:blank'); await page.goto(url + '#m1'); await page.waitForTimeout(3000);
    await ev(() => { const B = window.__BENTOU; if (B.Cutscene && B.Cutscene.active) B.Cutscene.clear(); });
    await page.waitForTimeout(300);
    check('the mission plays from the single file', await scene() === 'mission', await scene());
    // art: the game's own shapes (src/20-assets.js) drawn in the mission, the view turned once each way to see more
    const OWN = [...readFileSync(join(dev, 'src', '20-assets.js'), 'utf8').matchAll(/^  ([a-zA-Z]+): \{ about: /gm)].map(m => m[1]);
    await ev(() => { const r = window.My3D2dge.current.r, f = r.shape; window.__props = new Set(); r.shape = function (n, ...a) { window.__props.add(n); return f.call(this, n, ...a); }; });
    await page.waitForTimeout(400); await page.keyboard.press('KeyQ'); await page.waitForTimeout(500); await page.keyboard.press('KeyE'); await page.waitForTimeout(400); await page.keyboard.press('KeyE'); await page.waitForTimeout(500); await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
    const drawnOwn = await ev(own => own.filter(n => window.__props.has(n)), OWN);
    check('art: the game\'s own Japanese props are drawn in the mission (at least 6 kinds)', OWN.length >= 20 && drawnOwn.length >= 6, drawnOwn.length + ' of ' + OWN.length + ': ' + drawnOwn.join(','));
    const mid = await toPage(await ev(G + '.W') * .55, await ev(G + '.H') * .5);
    await page.mouse.move(mid[0], mid[1], { steps: 3 }); await page.waitForTimeout(120); await page.mouse.down(); await page.waitForTimeout(40); await page.mouse.up();
    let busy = false; for (let k = 0; k < 8 && !busy; k++) { busy = await ev(() => window.__BENTOU.M.hero.combo.busy); if (!busy) await page.waitForTimeout(25); }
    check('mouse: a click in the world strikes', busy, '');
    await page.waitForTimeout(700); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    check('Escape pauses: the pause menu', await ev(G + '.paused') && await ev(G + '.shell.screen') === 'pause', await ev(G + '.shell.screen'));
    await page.screenshot({ path: join(dev, 'shots', 'pause.png') });
    await page.locator('button', { hasText: /dev mode/i }).first().click(); await page.waitForTimeout(400);
    check('the pause menu\'s Dev Mode opens the dev screens', await ev(G + '.shell.screen') === 'dev' && /Cheats/.test(await ev(() => document.body.innerText)), await ev(G + '.shell.screen'));
    for (let k = 0; k < 4; k++) { await page.locator('button', { hasText: /next page/i }).first().click(); await page.waitForTimeout(250); }
    const sl = await ev(() => { const B = window.__BENTOU, r = B.TUNE.find(t => t[6] === B.TUNE_PAGES[0]); return { key: r[0], label: r[5], def: B.tuneDefault(r[0]), v: B.T(r[0]) }; });
    const rng = page.locator('input[type=range]').first(); const nR = await page.locator('input[type=range]').count();
    check('a Balance page: live sliders (at most 8)', nR >= 1 && nR <= 8, nR);
    await page.screenshot({ path: join(dev, 'shots', 'dev-balance.png') });
    await rng.focus(); for (let k = 0; k < 4; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60); }
    const v1 = await ev(k => window.__BENTOU.T(k), sl.key);
    check('a slider moved with the keys changes the game live (' + sl.label + ')', v1 !== sl.def, sl.def + ' -> ' + v1);
    const rb = page.locator('button', { hasText: /reset page/i }).first(), bb = await rb.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 3 }); await page.waitForTimeout(150);
    check('mouse: hovering a menu button focuses it', await ev(() => /reset page/i.test(document.activeElement && document.activeElement.textContent || '')), await ev(() => document.activeElement && document.activeElement.textContent));
    await rb.click(); await page.waitForTimeout(300);
    check('Reset page restores the default', await ev(k => window.__BENTOU.T(k), sl.key) === sl.def, await ev(k => window.__BENTOU.T(k), sl.key));
    // audio and files over the whole visit
    const au = await ev(() => window.__au);
    check('audio: nothing decoded, no media element, no speech synthesis, no fetch', au.decode === 0 && au.media === 0 && au.speech === 0 && au.fetch === 0, JSON.stringify(au));
    const other = reqs.filter(u => !u.startsWith(url) && !/^(data|blob|about):/.test(u));
    check('the single file: the page loads nothing but itself', !other.length, other.slice(0, 4).join(' | '));
    check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
}
