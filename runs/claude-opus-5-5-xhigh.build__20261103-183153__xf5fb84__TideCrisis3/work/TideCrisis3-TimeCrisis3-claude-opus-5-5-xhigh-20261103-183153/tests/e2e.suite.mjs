// e2e (runs with --browser): the bundle in headless Chromium driven like a player, with real key presses, mouse moves and
// clicks, touch taps and a DualSense (navigator.getGamepads answered by a stub pad): the attract mode after 10 s idle, the
// About screen paged through to the end, prompts that follow the device (PlayStation glyphs, Xbox from Settings, keys),
// dev mode opened from the pause menu (sliders, reset, actions, the perf overlay), detail per stage (lights, shadows,
// actors) and a touch-only phone (the notice, the settings button, the attract mode). Screenshots go to shots/e2e_*.png.
import { resolve } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
const NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153';
const PAD = () => {   // a standard-mapping DualSense, off until window.__padOn
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: null };
  window.__padOn = false; window.__pad = pad;
  navigator.getGamepads = () => window.__padOn ? [pad, null, null, null] : [null, null, null, null];
  window.__btn = (i, on) => { pad.buttons[i].pressed = on; pad.buttons[i].value = on ? 1 : 0; pad.timestamp++; };
};
export default async t => {
  process.env.TMPDIR = resolve(new URL('.tmp', t.root).pathname); mkdirSync(process.env.TMPDIR, { recursive: true }); mkdirSync(new URL('shots', t.root).pathname, { recursive: true });
  const { chromium } = await import('playwright'), b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const file = 'file://' + resolve(new URL('../' + NAME + '.html', t.root).pathname), shot = (page, n) => page.screenshot({ path: new URL('shots/e2e_' + n + '.png', t.root).pathname });
  const ex = JSON.parse(readFileSync(new URL('../exit-interview.json', t.root), 'utf8'));
  const variety = page => page.evaluate(() => { const c = document.getElementById('screen'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data, s = new Set(); for (let i = 0; i < d.length; i += 4 * 61) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size; });
  const sceneIs = (page, n, ms = 8000) => page.waitForFunction(n => TC.game.sceneName === n, n, { timeout: ms }).then(() => true, () => false);
  const tap = async (page, key, wait = 140) => { await page.keyboard.press(key); await page.waitForTimeout(wait); };
  const btn = async (page, i, wait = 160) => { await page.evaluate(i => window.__btn(i, true), i); await page.waitForTimeout(90); await page.evaluate(i => window.__btn(i, false), i); await page.waitForTimeout(wait); };
  try {
    // ---- a desktop: keyboard, mouse and a pad ----
    const page = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.addInitScript(PAD);
    await page.goto(file);
    t.check('e2e: the page is our game', (await page.title()) === 'Tide Crisis 3');
    t.check('e2e: boots to the title', await sceneIs(page, 'title', 30000));
    const t0 = Date.now();
    // attract: 10 s without input
    const att = await sceneIs(page, 'attract', 16000), idle = (Date.now() - t0) / 1000;
    t.check('e2e: 10 s idle on the title starts the attract mode', att && idle > 9 && idle < 14, idle.toFixed(1) + ' s');
    await page.waitForTimeout(5000);
    const demo = await page.evaluate(() => ({ state: TC.Attract.state, shots: TC.Attract.play ? TC.Attract.play.sim.players[0].stats.shots : 0, god: TC.Attract.play && TC.Attract.play.sim.cheats.god }));
    t.check('e2e: the attract demo plays itself (a bot shooting, cheating)', demo.state === 'demo' && demo.shots > 0 && demo.god, JSON.stringify(demo));
    await shot(page, 'attract'); t.check('e2e: the demo is drawn', (await variety(page)) > 60);
    await tap(page, 'KeyA', 300); t.check('e2e: any key leaves the attract mode for the title', await sceneIs(page, 'title', 3000)); await page.waitForTimeout(700);
    // the menu: the mouse hovers ABOUT (focus follows) and clicks it
    await tap(page, 'Enter', 400); t.check('e2e: title -> menu (Enter)', await sceneIs(page, 'menu', 3000));
    t.check('e2e: keyboard prompts after a key', await page.evaluate(() => TC.promptFamily(TC.game.input) === 'kbm'));
    await page.waitForTimeout(200);
    const css = (page, r) => page.evaluate(r => { const c = document.getElementById('screen').getBoundingClientRect(), W = TC.game.screen.W, H = TC.game.screen.H; return [c.left + (r[0] + r[2] / 2) * c.width / W, c.top + (r[1] + r[3] / 2) * c.height / H]; }, r);
    const aboutR = await page.evaluate(() => TC.scenes.menu.m.rects[6]);
    const [ax, ay] = await css(page, aboutR); await page.mouse.move(ax - 30, ay - 40); await page.waitForTimeout(100); await page.mouse.move(ax, ay, { steps: 4 }); await page.waitForTimeout(250);
    t.check('e2e: hovering ABOUT moves the menu focus to it', await page.evaluate(() => TC.scenes.menu.m.i === 6 && TC.scenes.menu.m.items[6].label === 'ABOUT'));
    await shot(page, 'menu_hover');
    await page.mouse.click(ax, ay); t.check('e2e: clicking ABOUT opens the About screen', await sceneIs(page, 'about', 3000));
    await tap(page, 'Escape', 300); t.check('e2e: Escape goes back to the menu', await sceneIs(page, 'menu', 3000));
    // About with the keyboard, every page in turn
    await tap(page, 'ArrowUp'); t.check('e2e: up from ARCADE wraps to ABOUT', await page.evaluate(() => TC.scenes.menu.m.i === 6));
    await tap(page, 'Enter', 300); t.check('e2e: Enter opens About', await sceneIs(page, 'about', 3000));
    const n = await page.evaluate(() => TC.aboutFlow(TC.game.screen.W, TC.game.screen.H).length); let order = true;
    for (let k = 0; k < n; k++) { if ((await page.evaluate(() => TC.scenes.about.i)) !== k) order = false; await shot(page, 'about_' + String(k).padStart(2, '0')); await tap(page, 'ArrowRight', 160); }
    t.check('e2e: Right pages through all ' + n + ' About pages and wraps to the first', order && (await page.evaluate(() => TC.scenes.about.i)) === 0);
    await tap(page, 'ArrowLeft'); t.check('e2e: Left from the first page goes to the last', (await page.evaluate(() => TC.scenes.about.i)) === n - 1);
    const shown = await page.evaluate(() => TC.aboutFlow(TC.game.screen.W, TC.game.screen.H).flatMap(p => p.lines.map(l => l.text)).join(' ').replace(/\s+/g, ' '));
    const want = [].concat(Object.values(ex.sourceInformation), ex.testingFeedback, ex.engineFeedback, ex.promptFeedback).map(v => String(v).replace(/\s+/g, ' ').trim()), missing = want.filter(v => !shown.includes(v));
    t.check('e2e: the About pages at this window size hold every exit-interview answer', missing.length === 0, missing.map(m => m.slice(0, 40)).join(' | '));
    const titles = await page.evaluate(() => TC.aboutFlow(TC.game.screen.W, TC.game.screen.H).map(p => p.title).join('|'));
    t.check('e2e: the pages include Source Information and the three feedback sections', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(h => titles.includes(h)), titles);
    await tap(page, 'Escape', 300); t.check('e2e: back to the menu', await sceneIs(page, 'menu', 3000));
    // a DualSense: prompts switch to PlayStation glyphs; Settings switches them to Xbox; a key switches them back
    await page.evaluate(() => { window.__padOn = true; }); await page.waitForTimeout(200);
    for (let k = 0; k < 4; k++) await btn(page, 13);
    t.check('e2e: the pad d-pad moves the menu (to RECORDS)', await page.evaluate(() => TC.scenes.menu.m.i === 4));
    t.check('e2e: prompts follow the pad', await page.evaluate(() => TC.game.input.lastDevice === 'gamepad' && TC.promptFamily(TC.game.input) === 'pad'));
    await btn(page, 0, 400); t.check('e2e: Cross picks RECORDS', await sceneIs(page, 'records', 3000));
    t.check('e2e: PlayStation glyphs by default (back is Circle)', await page.evaluate(() => TC.game.input.label('cancel', 'gamepad') === '○' || /circle|○/i.test(TC.game.input.label('cancel', 'gamepad'))), await page.evaluate(() => TC.game.input.label('cancel', 'gamepad')));
    await shot(page, 'pad_playstation');
    await page.evaluate(() => TC.game.settings.set('glyphs', 'xbox')); await page.waitForTimeout(150);
    t.check('e2e: the Xbox option shows A B X Y (back is B)', await page.evaluate(() => TC.game.input.label('cancel', 'gamepad') === 'B'), await page.evaluate(() => TC.game.input.label('cancel', 'gamepad')));
    await shot(page, 'pad_xbox'); await page.evaluate(() => TC.game.settings.set('glyphs', 'playstation'));
    await tap(page, 'ArrowRight', 200);
    t.check('e2e: a key press switches the prompts back to keys', await page.evaluate(() => TC.game.input.lastDevice === 'keyboard' && TC.promptFamily(TC.game.input) === 'kbm'));
    await shot(page, 'keys_records');
    await btn(page, 1, 400); t.check('e2e: Circle goes back to the menu', await sceneIs(page, 'menu', 3000));
    // About with the DualSense: d-pad up wraps to ABOUT, Cross opens it, R1 pages forward through every page, L1 back, Circle out
    await page.waitForTimeout(300); await btn(page, 12); t.check('e2e pad: d-pad up from ARCADE wraps to ABOUT', await page.evaluate(() => TC.scenes.menu.m.i === 6));
    await btn(page, 0, 400); t.check('e2e pad: Cross opens About', await sceneIs(page, 'about', 3000));
    const pn = await page.evaluate(() => TC.aboutFlow(TC.game.screen.W, TC.game.screen.H).length); let porder = true;
    for (let k = 0; k < pn; k++) { if ((await page.evaluate(() => TC.scenes.about.i)) !== k) porder = false; if (k === 5) await shot(page, 'pad_about'); await btn(page, 5, 120); }
    t.check('e2e pad: R1 pages through all ' + pn + ' About pages and wraps to the first', porder && (await page.evaluate(() => TC.scenes.about.i)) === 0);
    await btn(page, 4); t.check('e2e pad: L1 from the first page goes to the last', (await page.evaluate(() => TC.scenes.about.i)) === pn - 1);
    t.check('e2e pad: the About prompts are PlayStation glyphs', await page.evaluate(() => TC.promptFamily(TC.game.input) === 'pad' && TC.game.input.label('next', 'gamepad') === 'R1'));
    await btn(page, 1, 400); t.check('e2e pad: Circle leaves About for the menu', await sceneIs(page, 'menu', 3000));
    await page.evaluate(() => { window.__padOn = false; }); await page.waitForTimeout(150);
    // into a stage with the keyboard: STAGE SELECT -> stage 1 -> NORMAL -> skip the briefing
    await tap(page, 'ArrowDown'); await tap(page, 'ArrowDown');
    t.check('e2e: STAGE SELECT focused', await page.evaluate(() => TC.scenes.menu.m.items[TC.scenes.menu.m.i].label === 'STAGE SELECT'));
    await tap(page, 'Enter', 300); await tap(page, 'Enter', 300); await tap(page, 'Enter', 400);
    t.check('e2e: stage 1, Normal -> the briefing', await sceneIs(page, 'briefing', 3000));
    await page.waitForTimeout(800);
    await tap(page, 'Escape', 600); t.check('e2e: Escape skips the briefing into play', await sceneIs(page, 'play', 5000));
    if (await page.evaluate(() => !!TC.play.sim.cut)) { await page.keyboard.down('Enter'); await page.waitForTimeout(1300); await page.keyboard.up('Enter'); }
    const inAction = await page.waitForFunction(() => TC.play.sim.phase === 'action', null, { timeout: 20000 }).then(() => true, () => false);
    t.check('e2e: the first area reaches ACTION', inAction);
    // the pause menu (the engine's HTML menu), focus moved with the arrow keys to Dev mode
    await tap(page, 'Escape', 400); t.check('e2e: Escape pauses', await page.evaluate(() => TC.game.paused === true));
    let label = ''; for (let k = 0; k < 12 && label !== 'Dev mode'; k++) { label = await page.evaluate(() => (document.activeElement && document.activeElement.textContent || '').trim()); if (label !== 'Dev mode') await tap(page, 'ArrowDown', 120); }
    t.check('e2e: the pause menu has Dev mode, reached with the arrow keys', label === 'Dev mode', label);
    await shot(page, 'pause'); await tap(page, 'Enter', 300);
    t.check('e2e: Dev mode opens from the pause menu', await page.evaluate(() => TC.dev.open && !TC.game.paused));
    const f0 = await page.evaluate(() => TC.play.sim.t); await page.waitForTimeout(500);
    t.check('e2e: the game is frozen while the panel is open', (await page.evaluate(() => TC.play.sim.t)) === f0);
    await shot(page, 'dev_player');
    // a live slider: down to "Invulnerability after a hit", right raises it; RESET (with its confirmation) restores it
    for (let k = 0; k < 3; k++) await tap(page, 'ArrowDown', 120);
    const v0 = await page.evaluate(() => TC.tune.player.iframes); await tap(page, 'ArrowRight', 160); const v1 = await page.evaluate(() => TC.tune.player.iframes);
    t.check('e2e: Right moves the focused slider (a live value)', TC_near(v1 - v0, .1), v0 + ' -> ' + v1);
    await shot(page, 'dev_slider');
    for (let k = 0; k < 8 && !(await page.evaluate(() => TC.dev.items()[TC.dev.i][0] === 'r')); k++) await tap(page, 'ArrowDown', 120);
    await tap(page, 'Enter', 160); t.check('e2e: RESET asks first', await page.evaluate(() => TC.dev.confirmReset === true));
    await tap(page, 'Enter', 160); t.check('e2e: RESET restores every default', await page.evaluate(() => JSON.stringify(TC.tune) === JSON.stringify(TC.TUNE)));
    // VIEW: the perf overlay; ACTIONS: kill all, spawn, bot plays
    for (let k = 0; k < 4; k++) await tap(page, 'KeyE', 140);
    t.check('e2e: E switches tabs (VIEW)', await page.evaluate(() => TC.DEVTABS[TC.dev.tab][0] === 'VIEW'));
    for (let k = 0; k < 12 && !(await page.evaluate(() => TC.dev.items()[TC.dev.i][1] === 'view.perf')); k++) await tap(page, 'ArrowDown', 120);
    await tap(page, 'Enter', 160); t.check('e2e: Enter toggles the perf overlay', await page.evaluate(() => TC.tune.view.perf === true));
    await tap(page, 'KeyE', 140); t.check('e2e: ACTIONS tab', await page.evaluate(() => TC.DEVTABS[TC.dev.tab][0] === 'ACTIONS'));
    const goTo = async id => { for (let k = 0; k < 20 && !(await page.evaluate(id => TC.dev.items()[TC.dev.i][1] === id, id)); k++) await tap(page, 'ArrowDown', 100); };
    await goTo('kill'); await tap(page, 'Enter', 200);
    t.check('e2e: Kill all', await page.evaluate(() => TC.play.sim.enemies.every(e => !e.alive || e.civ || e.ally)));
    await goTo('spawn'); await tap(page, 'ArrowRight', 120); await tap(page, 'Enter', 200);
    t.check('e2e: Spawn enemy (the type chosen with Right)', await page.evaluate(() => TC.play.sim.enemies.some(e => e.alive && e.type === 'marine')));
    await goTo('bot'); await tap(page, 'Enter', 200); t.check('e2e: Bot plays', await page.evaluate(() => !!TC.play.bots[0]));
    await shot(page, 'dev_actions');
    await tap(page, 'Escape', 300); t.check('e2e: Escape closes the panel and the game runs', await page.evaluate(() => !TC.dev.open && !TC.game.paused), await page.evaluate(() => 'open ' + TC.dev.open + ' paused ' + TC.game.paused + ' ' + TC.game.pauseReason));
    await page.waitForTimeout(4000);
    t.check('e2e: the bot plays the area', await page.evaluate(() => TC.play.sim.players[0].stats.shots > 0));
    await shot(page, 'play_perf');
    // detail per stage, read from the renderer (the perf overlay's numbers): geometry, actors, dynamic lights, shadows
    for (const [stage, scene] of [[1, '1-2'], [2, '2-1'], [3, '3-3']]) {
      await page.evaluate(([stage, scene]) => { TC.debug.start({ stage, scene, cheats: { god: true } }); TC.tune.view.perf = true; }, [stage, scene]);
      await page.waitForTimeout(400); await page.evaluate(() => TC.debug.bot(true, 'expert')); await page.waitForTimeout(3000);
      const st = { tris: 0, actors: 0, lights: 0, shadows: 0 };   // the most over 2 s of frames (muzzle flashes come and go)
      for (let k = 0; k < 40; k++) { const f = await page.evaluate(() => { const R = TC.play.r3; return { tris: R.stats.tris, actors: R.stats.actors, lights: R.dyn.length, shadows: R.stats.shadows }; }); for (const q in st) st[q] = Math.max(st[q], f[q]); await page.waitForTimeout(50); }
      t.check('e2e: stage ' + stage + ' (' + scene + ') is drawn with detail, enemies, lights and shadows', st.tris > 400 && st.actors >= 2 && st.lights >= 1 && st.shadows >= 2, JSON.stringify(st));
      await shot(page, 'detail_' + scene);
    }
    await page.evaluate(() => { TC.tune.view.perf = false; });
    t.check('e2e: no errors on the desktop page', errs.length === 0 && (await page.evaluate(() => TC.game.errors.length)) === 0, errs.slice(0, 2).join(' | '));
    await page.close();
    // ---- audio, heard: analysers on the engine's music and sfx buses in a real page; no audio files, no speech engine ----
    const au = await b.newPage({ viewport: { width: 1280, height: 720 } }), reqs = [], aerr = [];
    au.on('request', r => reqs.push(r.url())); au.on('pageerror', e => aerr.push(e.message));
    await au.addInitScript(() => { window.__speak = 0; window.__media = 0; if (window.speechSynthesis) speechSynthesis.speak = () => { window.__speak++; }; const pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__media++; return pl.apply(this, arguments); }; });
    await au.goto(file); await sceneIs(au, 'title', 30000); await au.waitForTimeout(800);
    await au.keyboard.press('Enter'); await sceneIs(au, 'menu', 3000);   // a key press: the browser lets sound start
    await au.evaluate(() => { const A = TC.game.audio, c = A.ctx, tap = bus => { const an = c.createAnalyser(); an.fftSize = 2048; const z = c.createGain(); z.gain.value = 0; bus.connect(an); an.connect(z); z.connect(c.destination); return an; };
      window.__an = { music: tap(A.bus('music')), sfx: tap(A.bus('sfx')) }; window.__rms = an => { const d = new Float32Array(an.fftSize); an.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); }; });
    const level = async (bus, ms) => { let mx = 0, sum = 0, n = 0; for (let t = 0; t < ms; t += 40) { const r = await au.evaluate(b => window.__rms(window.__an[b]), bus); mx = Math.max(mx, r); sum += r; n++; await au.waitForTimeout(40); } return { max: mx, mean: sum / n }; };
    t.check('e2e audio: the sound engine runs (Web Audio)', await au.evaluate(() => TC.game.audio.ctx.state === 'running'));
    const mus = await level('music', 1500); t.check('e2e audio: the menu theme plays, synthesized on the music bus', mus.mean > .003, JSON.stringify(mus));
    const quiet = await level('sfx', 400);
    // a voice line: Animalese-style syllables on the sfx bus, drawn as a spectrogram (shots/e2e_voice_spectrogram.png)
    await au.evaluate(() => { const C = TC.game.audio.ctx, co = C.createOscillator.bind(C); window.__osc = []; C.createOscillator = () => { const o = co(), st = o.start.bind(o); o.start = w => { window.__osc.push([w === undefined ? C.currentTime : w, o.type]); return st(w); }; return o; }; });
    const line = 'Hostiles on the pier! Stay low, agents.', t0a = await au.evaluate(() => TC.game.audio.ctx.currentTime), dur = await au.evaluate(l => TC.Voice.say(l, 'kai'), line), syl = await au.evaluate(l => TC.Voice.syllables(l).filter(s => !s.pause).length, line);
    const env = await au.evaluate(async d => { const an = window.__an.sfx, f = new Uint8Array(an.frequencyBinCount), cv = document.createElement('canvas'), cols = Math.ceil(d * 1000 / 15); cv.width = cols * 3; cv.height = 256; cv.id = 'spec'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;image-rendering:pixelated'; document.body.appendChild(cv); const g = cv.getContext('2d'), out = [];
      for (let k = 0; k < cols; k++) { an.getByteFrequencyData(f); let e = 0; for (let i = 0; i < 256; i++) { const v = f[i]; e += v; g.fillStyle = 'rgb(' + v + ',' + (v >> 1) + ',' + (255 - v >> 2) + ')'; g.fillRect(k * 3, 255 - i, 3, 1); } out.push(e / 256); await new Promise(r => setTimeout(r, 15)); }
      return out; }, dur + .3);
    await au.locator('#spec').screenshot({ path: new URL('shots/e2e_voice_spectrogram.png', t.root).pathname }); await au.evaluate(() => document.getElementById('spec').remove());
    const hi = Math.max(...env), osc = (await au.evaluate(() => window.__osc)).filter(([w]) => w >= t0a - .01 && w <= t0a + dur + .2), starts = [...new Set(osc.map(([w]) => w.toFixed(3)))].map(Number).sort((a, b) => a - b);
    t.check('e2e audio: a voice line sounds on the sfx bus (louder than the quiet before it)', hi > 8 && quiet.max < .02, 'peak ' + hi.toFixed(1) + ' quiet ' + quiet.max.toFixed(4));
    t.check('e2e audio: the voice is synthesized syllable by syllable (one voiced source per syllable, spread over the line: gibberish, not words)', starts.length >= syl && starts.length <= syl * 3 && starts[starts.length - 1] - starts[0] > dur * .7 && osc.every(([, ty]) => ['sawtooth', 'square', 'triangle', 'sine', 'custom'].includes(ty)), starts.length + ' source starts for ' + syl + ' syllables over ' + (starts.length ? (starts[starts.length - 1] - starts[0]).toFixed(2) : 0) + ' of ' + dur.toFixed(2) + ' s');
    // a shot: start an area and click; the handgun's sound on the sfx bus
    await au.evaluate(() => { TC.debug.start({ stage: 1, scene: '1-1', cheats: { god: true } }); }); await au.waitForFunction(() => TC.play && TC.play.sim.phase === 'action', null, { timeout: 15000 }).catch(() => {});
    await au.evaluate(() => { const A = TC.game.audio; window.__an.sfx.disconnect(); const an = A.ctx.createAnalyser(); an.fftSize = 2048; A.bus('sfx').connect(an); const z = A.ctx.createGain(); z.gain.value = 0; an.connect(z); z.connect(A.ctx.destination); window.__an.sfx = an; });
    await au.evaluate(() => { TC.dev.run(['a', 'kill'], TC.play); TC.Audio3.ambience(null); }); await au.waitForTimeout(2500);   // enemies down and the pier's ambience off: the shot is measured against quiet
    const before = await level('sfx', 400); await au.mouse.click(640, 300); const shotL = await level('sfx', 400);
    t.check('e2e audio: a shot is heard', shotL.max > before.max * 2 && shotL.max > .01, 'before ' + before.max.toFixed(4) + ' shot ' + shotL.max.toFixed(4));
    const html = readFileSync(new URL('../' + NAME + '.html', t.root), 'utf8');
    t.check('e2e audio: no audio files (no requests besides the page, none in the bundle, no media elements played)', reqs.every(u => u.startsWith('file://') && u.endsWith('.html')) && !/data:audio|\.(mp3|ogg|wav|m4a|flac)\b|<audio/i.test(html) && (await au.evaluate(() => window.__media)) === 0, reqs.filter(u => !u.endsWith('.html')).slice(0, 3).join(' '));
    t.check('e2e audio: no speech engine (speechSynthesis never used)', (await au.evaluate(() => window.__speak)) === 0);
    t.check('e2e audio: no errors', aerr.length === 0 && (await au.evaluate(() => TC.game.errors.length)) === 0, aerr.slice(0, 2).join(' | '));
    await au.close();
    // ---- a phone with touch only ----
    const ctx = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 915, height: 412 }, deviceScaleFactor: 2 }), ph = await ctx.newPage(), perr = [];
    ph.on('pageerror', e => perr.push(e.message));
    await ph.goto(file); t.check('e2e touch: boots to the title', await sceneIs(ph, 'title', 30000));
    const t1 = Date.now(); await ph.waitForTimeout(600);
    t.check('e2e touch: detected as touch-only', await ph.evaluate(() => TC.touchOnly()));
    await shot(ph, 'touch_title');
    const gear = await ph.evaluate(() => TC.scenes.title.gear), [gx, gy] = await css(ph, gear);
    await ph.touchscreen.tap(gx, gy); await ph.waitForTimeout(500);
    t.check('e2e touch: the settings button opens Settings', await ph.evaluate(() => TC.game.paused && TC.game.shell._stack.some(s => s.name === 'settings') && /settings/i.test(document.body.innerText)));
    await shot(ph, 'touch_settings');
    await ph.getByRole('button', { name: 'Close' }).first().tap(); await ph.waitForTimeout(400);
    t.check('e2e touch: a tap on Close shuts it', await ph.evaluate(() => !TC.game.paused && !TC.game.shell._stack.length));
    const att2 = await sceneIs(ph, 'attract', 16000), idle2 = (Date.now() - t1) / 1000;
    t.check('e2e touch: the attract mode still runs', att2 && idle2 > 9, idle2.toFixed(1) + ' s');
    await ph.waitForTimeout(3000); await shot(ph, 'touch_attract');
    t.check('e2e touch: the demo plays under the notice', await ph.evaluate(() => TC.Attract.state === 'demo' && TC.touchOnly()));
    t.check('e2e touch: no errors', perr.length === 0, perr.slice(0, 2).join(' | '));
    await ctx.close();
  } finally { await b.close(); }
};
function TC_near(a, b) { return Math.abs(a - b) < 1e-6; }
