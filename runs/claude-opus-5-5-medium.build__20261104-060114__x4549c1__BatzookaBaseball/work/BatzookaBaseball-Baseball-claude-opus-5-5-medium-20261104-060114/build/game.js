(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E, TAU = Math.PI * 2;
const ABOUT_DATA = {"sourceInformation":{"date":"2026-11-04 06:01:14","source":"Baseball (the sport), in the over-the-top arcade style","plan":"PLAN.md","genre":"Arcade sports (baseball), with a slapstick brawler mini-game (the Rhubarb) and a short story Tour with light team upgrades","perspective":"Plate Cam: a Mode 7 pseudo-3D view from behind the catcher for every pitch and swing; Broadcast Cam: a three-quarter ground view of the park for play in the field (High and Isometric options); Moonshot Cam: a Mode 7 chase camera on home runs","tech":"my-3D2dge v0.85.2 handoff engine (the full engine with its Mode 7 module; five small changes listed in ENGINE-CHANGES.md); vanilla JavaScript in one IIFE built from 28 source files; AI Hub Session client 1.4.0 pasted unmodified; one self-contained HTML file with no CDN or network requests; Node 24 and Playwright 1.63.0 (Chromium) for the tests","artDirection":"The engine's native look: HD Humanoid rigs drawn as pixel art at res ps1 (expanded to fill the screen), six parks painted from code (mowing patterns, chalk, dirt, warning tracks, cornfields, a bay, lava, regolith, graveyards, neon), Backdrop skies, code-drawn ballpark props, crowds of about 900 fans per park, night lighting and particles","animation":"Built on the engine's native rig animation system, with new animations made for baseball: the batting stance, contact and power swings, the squared bunt, the pitcher's windup and delivery, fielders' throws, the catcher's crouch, diving catches, jumps and wall climbs to rob homers, feet-first slides, the home-run trot, umpire calls, celebrations, Rhubarb punch combos, shoves and tosses with knockdowns, and dancing and racing mascots (all shown in the Animation Gallery)","audio":"The engine's chip synth only: 14 original songs (a ballpark-organ tune per park with hype layers, title, menus, Tour map, Derby, Rhubarb, training, credits, hub card), 7 stings, 45 sound effects, and Animalese-style babble voices for 16 characters (one syllable per letter, with subtitles)","online":"AI Hub Session Protocol v1 in ghost mode for 1-4 players: an online Batzooka Derby round with the game's own card, ready with no key press, progress every second, one result, time-up handling, and other players shown as ghost batters and home-run comets; local multiplayer for 1-4 on one machine","testing":"Headless as allowed: one command (node tests/run.mjs, 106 checks across 13 suites, including a scripted playthrough of the Tour, all eight lessons, a four-player Exhibition, a hot-seat Derby and the About pages by an input-driven bot), seeded CPU-vs-CPU balance sims, the engine's check.mjs in Chromium, Playwright screenshots for the look, and the real AI Hub harness (2 players; 4 players with latency, jitter and loss; host leave) served on 127.0.0.1 with an OS-picked port","research":"Read the engine's API card, API index, AI guide and asset card, the sports and kart kits, the Mode 7 module's header, and the AI Hub README; no other research","environment":"Claude Code CLI (headless); Linux (WSL2); browser unknown (tests ran in Playwright Chromium)","model":"Anthropic, claude-opus-5-5, reasoning effort medium","usage":"Cost and token counts unknown (no usage meter in the session); session time about 1 hour 20 minutes by the machine clock (06:01 to about 07:20)"},"testingFeedback":["About 28 issues: 12 code bugs (two syntax errors, two NaN pitch speeds that froze games, a crash when fielders were missing, a bunt flag that never reset, late swings being called strikes before they could connect, a pitch type with no aim, absurd home-run distances, a wrong deep link pairing a team with itself, a long commentary line, a story scene that skipped itself headless), a badly unbalanced first version (.600 batting average), and about 15 layout problems found in screenshots (overflowing menus, missing font glyphs, the catcher filling the Plate Cam, overlapping HUD pieces).","6 were game-breaking: the two syntax errors (nothing loaded), the two NaN pitches (the game froze mid-pitch), the crash on contact with no fielders set, and the late-swing bug (a swing inside the timing window but after the plate crossing could never make contact).","The seeded CPU-vs-CPU simulations: they found both NaN freezes and the stuck bunt flag, and gave the numbers (runs, K%, HR%, average) used to balance the game; second was the bot-played Derby, which exposed the late-swing ordering bug.","The engine's check.mjs sweep over the deep links: it reported no errors, but by then the headless suites and scenario screenshots had already covered the same pages, and its random key presses left the snapshots in odd states."],"engineFeedback":["The Mode 7 module: a Plate Cam from behind the catcher, with the park's own floor, a turning Backdrop sky and rigs as distance-scaled billboards, took a few dozen lines. Close behind: headless fixed-step advance with input.tap and hold, which made bot-driven playthrough tests easy.","A few wrong guesses: menu.settings must be an array when the game is constructed (I passed a function); E.Dialog has no width or position option that fits a TV HUD, so I wrote my own radio box; a // comment I appended mid-line in the engine broke the build; promises from a mock in a headless test needed an await.","The baseball itself: a parametric pitch flight with a known plate crossing, the contact model (timing and reticle offset to spray, launch and exit speed), batted-ball physics with the fence, poles and foul territory, fielders assigned by intercept time with covers and throws, baserunners racing the ball, and the rules engine (forces, tags, tag-ups, the third-out rule, walk-offs, mercy, extra innings).","Drawing the ballpark's vertical parts in Mode 7: the fence, the foul walls and the stands had to be hand-projected quads gathered as billboards, because Mode 7 has a floor and billboards but no walls.","Five small changes, all marked BATZOOKA: a 'bat' weapon for Humanoid (rest pose, tip, HD and classic drawing); a 'mitt' option drawn on the glove hand; the glyphs ✕ ○ □ △ · ✓ ■ ● — added to the 5x7 font; the Button symbols setting defaulting to PlayStation with an Xbox choice; and a fix to my own broken comment.","A Mode 7 wall primitive (for example m7.quad or m7.wall) that projects and depth-sorts world-space polygons with the billboards, so stadium walls, stands and buildings need no hand-built quads."],"promptFeedback":["The requirements are concrete and checkable: 10 seconds to the attract mode, dev sliders with a reset, PlayStation glyphs by default with an Xbox option, a touch-only card, and an online protocol with a real harness to pass.","PLAN.md's deliverable names (claude-opus-5-5-max with another timestamp) disagree with TASK.md's; TASK.md wins, so the files use TASK.md's names. It was also not clear how much of the plan's very large scope is required versus aspirational.","Scope: the plan describes six teams, six parks, a Tour with cutscenes, eight lessons, a Derby, the online round, attract and dev modes and mocap animation, all in one session; choosing what to build fully and testing all of it was the hard part.","Say which plan items are required and which are optional (or give a time budget), and keep the plan's file names in step with TASK.md's."],"aiHub":{"name":"Batzooka Baseball","tagline":"Swing for the moon. Literally.","description":"Over-the-top arcade baseball: fireball pitches, a rocket-powered bat, wall-climbing catches and bench-clearing rhubarbs on a barnstorming tour to save a cornfield ballpark. Online, it's a two-minute home-run derby against the ghosts of your friends.","type":"Game","genre":"Sports","source":"Baseball (over-the-top arcade style)","series":"","players":"1–4","controls":"Stick/WASD/mouse aim · ✕/Space/click swing · □/J/right-click power · R1/E Batzooka","tags":["arcade","comedy","versus","pixel art","boss fights","retro"]}};

/* ===== 00-core.js ===== */
/* BATZOOKA BASEBALL: the spine. One namespace (BZ), registries for content as data, an event bus every system listens
 * to, seeded random streams, the live-tuning table (BZ.TUNE, the dev sliders) and unit helpers. */
const BZ = { version: '1.0.0', cosmetic: true };
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* ---- registries: BZ.def('parks', 'kernel', {...}); BZ.get('parks', 'kernel'); BZ.all('parks') ---- */
const REG = {};
BZ.def = (kind, id, spec) => { (REG[kind] = REG[kind] || new Map()).set(id, Object.assign({ id }, spec)); return spec; };
BZ.get = (kind, id) => REG[kind] && REG[kind].get(id);
BZ.all = kind => REG[kind] ? [...REG[kind].values()] : [];

/* ---- the bus: every outcome is an event; listeners never edit the rules ---- */
BZ.bus = {
  h: {}, log: [],
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const l = this.h[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data = {}) {
    this.log.push({ ev, t: +(BZ.game ? BZ.game.time : 0).toFixed(2), data }); if (this.log.length > 200) this.log.shift();
    for (const fn of (this.h[ev] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus ' + ev, e); else throw e; } }
    for (const fn of (this.h['*'] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus *', e); else throw e; } }
  }
};
const emit = (ev, d) => BZ.bus.emit(ev, d);

/* ---- random streams: play (rules, pitches, contact, AI: seeded per match), fx (cosmetic), deal (the Derby's pitches) ---- */
BZ.rng = { play: E.rng(1), fx: E.rng(2), deal: E.rng(3) };
BZ.seed = s => { BZ.rng.play = E.rng(s >>> 0 || 1); BZ.rng.fx = E.rng((s * 7 + 3) >>> 0 || 2); };
const R = () => BZ.rng.play(), RF = () => BZ.rng.fx();
const gauss = (rnd = R) => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

/* ---- live tuning: every balance number, described for the dev sliders (label, group, min, max, step) ---- */
const TUNE_META = [
  ['Pitching', 'pitchSpeed', 'Pitch speed', 1, .5, 2, .05], ['Pitching', 'pitchBreak', 'Pitch break', 1, 0, 2.5, .05],
  ['Pitching', 'aftertouch', 'Aftertouch', 1, 0, 3, .1], ['Pitching', 'releaseWindow', 'Release window', 1, .3, 3, .05],
  ['Pitching', 'staminaDrain', 'Stamina drain', 1, 0, 3, .1],
  ['Batting', 'swingTiming', 'Swing timing window', 1, .3, 3, .05], ['Batting', 'sweetSpot', 'Sweet spot size', 1, .4, 2.5, .05],
  ['Batting', 'exitVelocity', 'Exit velocity', 1, .5, 2, .05], ['Batting', 'launchSpread', 'Launch spread', 1, 0, 2, .05],
  ['Ball', 'gravity', 'Gravity', 1, .3, 2.5, .05], ['Ball', 'drag', 'Air drag', .05, 0, .3, .01], ['Ball', 'bounce', 'Bounce', 1, .3, 1.5, .05],
  ['Ball', 'rollFriction', 'Roll friction', 1, .3, 3, .1], ['Ball', 'wind', 'Wind', 1, 0, 3, .1],
  ['Players', 'runSpeed', 'Runner speed', 1, .5, 2, .05], ['Players', 'fielderSpeed', 'Fielder speed', 1, .5, 2, .05],
  ['Players', 'throwSpeed', 'Throw speed', 1, .5, 2, .05], ['Players', 'catchRadius', 'Catch radius', 1, .5, 2.5, .05],
  ['Players', 'turboPower', 'Turbo boost', 1, 0, 2, .05], ['Players', 'turboDrain', 'Turbo drain', 1, 0, 3, .1],
  ['Over the top', 'meterGain', 'Meter gain', 1, 0, 5, .1], ['Over the top', 'batzookaPower', 'Batzooka power', 1.6, 1, 3, .05],
  ['Over the top', 'rhubarbChance', 'Rhubarb chance', .4, 0, 1, .05], ['Over the top', 'hazardRate', 'Hazard rate', 1, 0, 4, .1],
  ['CPU', 'cpuBat', 'CPU batting skill', 1, 0, 2, .05], ['CPU', 'cpuPitch', 'CPU pitching skill', 1, 0, 2, .05],
  ['CPU', 'cpuField', 'CPU fielding skill', 1, 0, 2, .05], ['CPU', 'cpuRun', 'CPU running skill', 1, 0, 2, .05],
  ['Camera', 'plateDist', 'Plate cam distance', 72, 40, 140, 2], ['Camera', 'plateHeight', 'Plate cam height', 36, 16, 90, 1],
  ['Camera', 'plateFov', 'Plate cam FOV', 46, 30, 80, 1], ['Camera', 'fieldZoom', 'Field cam zoom', 1, .4, 2, .05],
  ['Camera', 'heightSquash', 'Fly ball squash', .45, .2, 1, .05],
  ['Game', 'gameSpeed', 'Game speed', 1, .25, 2, .05]
].map(([group, key, label, def, min, max, step]) => ({ group, key, label, def, min, max, step }));
const TUNE = {};
BZ.TUNE = TUNE; BZ.TUNE_META = TUNE_META;
BZ.resetTune = group => { for (const m of TUNE_META) if (!group || m.group === group) TUNE[m.key] = m.def; };
BZ.resetTune();

/* ---- units and helpers: 16 U a tile; feet = U x .32; mph = U/s x .26 ---- */
const feet = u => Math.round(u * .32), mph = v => Math.round(v * .26);
const statF = s => 1 + .03 * ((s === undefined ? 5 : s) - 5);
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const smooth01 = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
const wrapText = (s, w, o) => E.font.wrap(s, w, o);

/* ---- the game itself: res ps1, expand; the pause menu's extra items come from a function (evaluated on each open) ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#06070c', fullscreen: 'button',
  menu: {
    items: () => BZ.pauseItems ? BZ.pauseItems() : [],
    settings: [],
    quit: false
  }
});
BZ.game = game;
const A = game.audio, P = game.particles, LIGHTS = game.lights;
const SCENES = BZ.SCENES = {};

/* ===== 01-input.js ===== */
/* INPUT: one positional preset (actions named by the button's place, because the same button swings, throws home and
 * punches), the glyph icon renderer (PlayStation by default, Xbox by setting, keycaps and mouse buttons), the prompt
 * builder, idle tracking for the attract mode, and touch-only detection. */
const KEYS = {
  south: ['Space', 'KeyK', 'Mouse0', 'Pad0'], east: ['KeyL', 'Pad1'], west: ['KeyJ', 'Mouse2', 'Pad2'], north: ['KeyI', 'Pad3'],
  l1: ['KeyQ', 'Tab', 'Pad4'], r1: ['KeyE', 'Pad5'], l2: ['ShiftLeft', 'Pad6'], r2: ['KeyC', 'ControlLeft', 'Pad7'], view: ['KeyV', 'Pad11'],
  num1: ['Digit1'], num2: ['Digit2'], num3: ['Digit3'], num4: ['Digit4'], num5: ['Digit5'],
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyK', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1'],
  create: ['Pad8'], pinNext: ['Backslash'], pinDown: ['BracketLeft'], pinUp: ['BracketRight']
};
BZ.KEYS = KEYS;
const FACE = ['south', 'east', 'west', 'north'];
// base buttons by position: ○ first, △ second, □ third, ✕ home (keyboard 1-4 too)
const BASE_BTN = { east: 1, north: 2, west: 3, south: 4 }, BASE_NUM = { num1: 1, num2: 2, num3: 3, num4: 4 };
/** which base (1-4) input I picked this step with a base button, or 0 */
function basePressed(I) {
  for (const a in BASE_NUM) if (I.pressed(a)) return BASE_NUM[a];
  for (const a in BASE_BTN) if (I.pressed(a) && !(a === 'south' && I.lastDevice === 'mouse')) return BASE_BTN[a];
  return 0;
}

/* ---- glyph icons ---- */
const PS_COL = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#f08ad8', '△': '#4fe0b0' }, XB_COL = { A: '#6cc04a', B: '#e8584a', X: '#4a8ef0', Y: '#f4c430' };
function iconInfo(I, a) {
  const dev = I.lastDevice === 'touch' ? 'keyboard' : I.lastDevice, m = I.map[a] || [];
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  if (dev === 'gamepad') { const c = real.find(c => c.startsWith('Pad')); if (c) return { kind: 'pad', code: c, label: I.codeLabel(c), fam: I.padStyle() }; }
  if (dev === 'mouse') { const c = real.find(c => c.startsWith('Mouse')); if (c) return { kind: 'mouse', code: c, label: c === 'Mouse0' ? 'L' : 'R' }; }
  const k = real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => c.startsWith('Mouse'));
  if (!k) return { kind: 'key', label: a.toUpperCase() };
  if (k.startsWith('Mouse')) return { kind: 'mouse', code: k, label: k === 'Mouse0' ? 'L' : 'R' };
  return { kind: 'key', code: k, label: I.codeLabel(k) };
}
/** draw action a's icon for input I at (x, y) (top left); returns its width */
function glyph(g, I, a, x, y, s = 11) {
  const f = iconInfo(I, a);
  if (f.kind === 'pad') {
    const L = f.label, n = +f.code.slice(3);
    if (n <= 3) {
      const cx = x + s / 2, cy = y + s / 2, r = s / 2;
      px.disc(g, cx, cy, r, '#e8e6f0'); px.disc(g, cx, cy, r - 1, '#1b1d26');
      if (f.fam === 'playstation') {
        const c = PS_COL[L] || '#fff', q = Math.max(2, Math.round(r * .5));
        if (L === '✕') { px.line(g, cx - q, cy - q, cx + q, cy + q, c, 2); px.line(g, cx - q, cy + q, cx + q, cy - q, c, 2); }
        else if (L === '○') { px.disc(g, cx, cy, q + .5, c); px.disc(g, cx, cy, q - 1.2, '#1b1d26'); }
        else if (L === '□') { px.rect(g, cx - q, cy - q, q * 2, q * 2, c); px.rect(g, cx - q + 1.5, cy - q + 1.5, q * 2 - 3, q * 2 - 3, '#1b1d26'); }
        else { px.poly(g, [[cx, cy - q - 1], [cx + q + 1, cy + q], [cx - q - 1, cy + q]], c); px.poly(g, [[cx, cy - q + 2], [cx + q - 1.5, cy + q - 1.5], [cx - q + 1.5, cy + q - 1.5]], '#1b1d26'); }
      } else E.font.text(g, L, cx, cy - 3, XB_COL[L] || '#fff', { align: 'center', outline: false });
      return s;
    }
    const w = E.font.width(L) + 6;
    E.ui.box(g, x, y + 1, w, s - 2, { bg: '#2a2c3a', border: '#c8c8d8', gradient: false });
    E.font.text(g, L, x + 3, y + s / 2 - 3, '#ffffff', { outline: false });
    return w;
  }
  if (f.kind === 'mouse') {
    const w = 8, h = s; px.rect(g, x + 1, y, w - 2, h, '#e8e6f0'); px.rect(g, x, y + 2, w, h - 4, '#e8e6f0'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#2a2c3a');
    px.rect(g, f.label === 'L' ? x + 1 : x + w / 2, y + 1, w / 2 - 1, 4, '#ffd36a'); px.line(g, x + w / 2, y + 1, x + w / 2, y + 5, '#e8e6f0');
    return w;
  }
  const L = f.label.length > 6 ? f.label.slice(0, 6) : f.label, w = Math.max(s, E.font.width(L) + 6);
  E.ui.box(g, x, y, w, s, { bg: ['#f4f2ea', '#c8c4b8'], border: '#5a5650', gradient: true });
  E.font.text(g, L, x + w / 2, y + s / 2 - 3, '#1a1820', { align: 'center', outline: false });
  return w;
}
function glyphW(I, a, s = 11) {
  const f = iconInfo(I, a);
  if (f.kind === 'pad') return +f.code.slice(3) <= 3 ? s : E.font.width(f.label) + 6;
  if (f.kind === 'mouse') return 8;
  const L = f.label.length > 6 ? f.label.slice(0, 6) : f.label; return Math.max(s, E.font.width(L) + 6);
}
/** a row of prompts [[action, verb, enabled, why]] at (x, y); align 'left' | 'center' | 'right'; returns its width */
function promptRow(g, I, items, x, y, align = 'center', s = 11) {
  const parts = items.filter(Boolean).map(([a, verb, on = true, why]) => ({ a, t: on ? verb : verb + (why ? ' (' + why + ')' : ''), on }));
  const ws = parts.map(p => p.a ? glyphW(I, p.a, s) : -3);
  let total = 0; parts.forEach((p, i) => { total += ws[i] + 3 + E.font.width(p.t) + 10; });
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  parts.forEach((p, i) => {
    const w = p.a ? glyph(g, I, p.a, cx, y, s) : -3;
    E.font.text(g, p.t, cx + w + 3, y + s / 2 - 3, p.on ? '#ffffff' : '#8a8898', { shadow: '#000', outline: false });
    cx += ws[i] + 3 + E.font.width(p.t) + 10;
  });
  return total;
}
BZ.glyph = glyph; BZ.promptRow = promptRow;

/* ---- idle tracking (the attract mode): any key, button, click, stick past the dead zone, mouse moved over 4 px ---- */
const IDLE = { t: 0, px: null };
function anyInput(I = game.input) {
  for (const p of game.players) {
    if (p.anyPressed()) return true;
    const m = p.move(); if (Math.hypot(m[0], m[1]) > .3) return true;
  }
  const pt = I.pointer && I.pointer();
  if (pt) { if (IDLE.px && Math.hypot(pt[0] - IDLE.px[0], pt[1] - IDLE.px[1]) > 4) { IDLE.px = pt.slice(); return true; } if (!IDLE.px) IDLE.px = pt.slice(); }
  if (I.clicked && I.clicked()) return true;
  return false;
}
function idleTick(dt) { if (anyInput()) { IDLE.t = 0; return false; } IDLE.t += dt / Math.max(.01, game.timeScale || 1); return IDLE.t >= 10; }
BZ.idle = IDLE;

/* ---- touch-only devices: no touch controls; a card that asks for a controller or keyboard ---- */
BZ.touchOnly = false;
function detectTouch() {
  try {
    if (typeof matchMedia !== 'undefined' && typeof navigator !== 'undefined')
      BZ.touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0;
    if (typeof location !== 'undefined' && location.hash === '#touch') BZ.touchOnly = true;
    if (typeof addEventListener !== 'undefined') {
      addEventListener('keydown', () => { BZ.touchOnly = false; });
      addEventListener('gamepadconnected', () => { BZ.touchOnly = false; });
    }
  } catch (e) { BZ.touchOnly = false; }
}
game.input.touchEnabled = false;
BZ.wheel = 0;
if (typeof addEventListener !== 'undefined') addEventListener('wheel', e => { if (M && M.phase === 'select') BZ.wheel += Math.sign(e.deltaY); }, { passive: true });

/* ===== 02-audio.js ===== */
/* AUDIO: every sound is the engine's chip synth. Sound effects, the original songs (the ballpark organ is a square and a
 * triangle an octave apart with a slow vibrato), stings, and BABBLE: Animalese-style gibberish voices that play one
 * syllable per letter of what a character says. */
const SFX = {
  tink: { wave: 'triangle', freq: 1800, to: 1200, dur: .08, vol: .25 },
  crack: [{ wave: 'noise', freq: 2400, to: 600, dur: .07, vol: .45 }, { wave: 'square', freq: 220, to: 90, dur: .1, vol: .25 }],
  krakoom: [{ wave: 'noise', freq: 3000, to: 120, dur: .5, vol: .55 }, { wave: 'saw', freq: 110, to: 30, dur: .6, vol: .4 }, { wave: 'triangle', freq: 880, to: 1760, dur: .4, vol: .2, vib: [12, .04] }],
  mitt: [{ wave: 'noise', freq: 900, to: 300, dur: .05, vol: .45 }, { wave: 'sine', freq: 140, to: 80, dur: .07, vol: .35 }],
  glove: { wave: 'noise', freq: 600, to: 250, dur: .05, vol: .3 },
  whoosh: { wave: 'noise', freq: 400, to: 1800, dur: .18, vol: .16 },
  foultip: { wave: 'noise', freq: 2600, to: 1400, dur: .05, vol: .3 },
  thud: { wave: 'sine', freq: 120, to: 60, dur: .1, vol: .3 },
  bounce: { wave: 'sine', freq: 200, to: 120, dur: .06, vol: .2 },
  clang: [{ wave: 'square', freq: 520, to: 480, dur: .25, vol: .18, vib: [20, .02] }, { wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .25 }],
  ping: { wave: 'triangle', freq: 2400, to: 2300, dur: .4, vol: .25 },
  cheer: { wave: 'noise', freq: 700, to: 1100, dur: 1.4, vol: .22 },
  roar: [{ wave: 'noise', freq: 500, to: 1300, dur: 2.2, vol: .28 }, { wave: 'noise', freq: 900, to: 700, dur: 1.8, vol: .15 }],
  groan: { wave: 'noise', freq: 700, to: 250, dur: 1.0, vol: .18 },
  oooh: { wave: 'triangle', freq: 300, to: 420, dur: .6, vol: .18, vib: [5, .05] },
  boo: { wave: 'saw', freq: 140, to: 110, dur: .8, vol: .1, vib: [4, .03] },
  organ: [{ wave: 'square', freq: 'C5', dur: .12, vol: .12 }, { wave: 'triangle', freq: 'C4', dur: .12, vol: .2 }],
  charge: [{ wave: 'saw', freq: 120, to: 900, dur: .6, vol: .2 }, { wave: 'noise', freq: 300, to: 2000, dur: .6, vol: .15 }],
  rocket: { wave: 'noise', freq: 900, to: 300, dur: .5, vol: .25 },
  firework: [{ wave: 'noise', freq: 800, to: 80, dur: .45, vol: .35 }, { wave: 'noise', freq: 5000, to: 3000, dur: .3, vol: .1 }],
  fizzle: [{ wave: 'noise', freq: 1500, to: 200, dur: .5, vol: .25 }, { wave: 'square', freq: 400, to: 100, dur: .4, vol: .12 }],
  slide: { wave: 'noise', freq: 500, to: 180, dur: .3, vol: .22 },
  thump: { wave: 'sine', freq: 90, to: 50, dur: .12, vol: .35 },
  crash: [{ wave: 'noise', freq: 1500, to: 100, dur: .35, vol: .45 }, { wave: 'square', freq: 160, to: 60, dur: .2, vol: .2 }],
  bonk: { wave: 'square', freq: 700, to: 300, dur: .08, vol: .2 },
  whistle: { wave: 'triangle', freq: 600, to: 1900, dur: .5, vol: .18 },
  ump: { wave: 'square', freq: 2200, vib: [30, .05], dur: .3, vol: .12 },
  pow: [{ wave: 'noise', freq: 1600, to: 300, dur: .1, vol: .35 }, { wave: 'square', freq: 300, to: 120, dur: .08, vol: .2 }],
  ding: { wave: 'triangle', freq: 'E6', dur: .4, vol: .25, arp: [0, 4, 7, 12], step: .06 },
  turbo: { wave: 'noise', freq: 300, to: 1500, dur: .25, vol: .14 },
  menu: { wave: 'square', freq: 'E5', dur: .04, vol: .12 },
  ok: { wave: 'square', freq: 'C5', dur: .1, vol: .15, arp: [0, 7], step: .05 },
  back: { wave: 'square', freq: 'G4', to: 'C4', dur: .1, vol: .12 },
  gull: { wave: 'saw', freq: 1400, to: 900, dur: .25, vol: .12, vib: [20, .08] },
  horn: [{ wave: 'saw', freq: 110, dur: .9, vol: .2 }, { wave: 'square', freq: 165, dur: .9, vol: .12 }],
  rumble: { wave: 'noise', freq: 120, to: 60, dur: 1.4, vol: .3 },
  meteor: { wave: 'noise', freq: 2400, to: 200, dur: .9, vol: .25 },
  ghost: { wave: 'sine', freq: 500, to: 300, dur: 1.2, vol: .15, vib: [6, .08] },
  drone: { wave: 'saw', freq: 220, to: 240, dur: .4, vol: .08, vib: [30, .05] },
  splash: { wave: 'noise', freq: 1200, to: 200, dur: .5, vol: .3 },
  pop: { wave: 'square', freq: 900, to: 1500, dur: .05, vol: .2 },
  sizzle: { wave: 'noise', freq: 4000, to: 2000, dur: .4, vol: .15 },
  laser: { wave: 'saw', freq: 1600, to: 300, dur: .25, vol: .2 },
  step: { wave: 'noise', freq: 300, to: 200, dur: .03, vol: .06 },
  coin: { wave: 'square', freq: 'B5', dur: .2, vol: .15, arp: [0, 5], step: .07 }
};
for (const k in SFX) A.define(k, SFX[k]);
const sfx = (name, o) => { if (!BZ.mute) A.sfx(name, o); };

/* ---- songs: all original. Organ = a square lead over a triangle an octave down ---- */
const organ = (lead, low, bass, drums, bpm, steps = 4, extra = []) => ({ bpm, steps, tracks: [
  { name: 'base', wave: 'square', vol: .06, notes: lead }, { name: 'base2', wave: 'triangle', vol: .12, notes: low },
  { name: 'bass', wave: 'triangle', vol: .26, notes: bass }, { name: 'drums', wave: 'drums', vol: .1, notes: drums }].concat(extra) });
const SONGS = {
  title: organ('C5 E5 G5 C6 | B5 G5 E5 G5 | A5 F5 C5 F5 | G5 - - . | C5 E5 G5 C6 | D6 C6 B5 A5 | G5 E5 F5 D5 | C5 - - .',
    'C4 E4 G4 C5 | B4 G4 E4 G4 | A4 F4 C4 F4 | G4 - - . | C4 E4 G4 C5 | D5 C5 B4 A4 | G4 E4 F4 D4 | C4 - - .',
    'C3 C3 G2 G2 | E2 E2 G2 G2 | F2 F2 A2 A2 | G2 G2 B2 G2 | C3 C3 G2 G2 | D3 D3 A2 A2 | G2 G2 G2 G2 | C3 G2 C3 .',
    'k h s h k k s h', 140, 2),
  menu: organ('E5 . G5 . A5 . G5 E5 | D5 . E5 . C5 . . . | E5 . G5 . A5 . C6 A5 | G5 . E5 . D5 . . .',
    'C4 . E4 . F4 . E4 C4 | B3 . C4 . A3 . . . | C4 . E4 . F4 . A4 F4 | E4 . C4 . B3 . . .',
    'C3 . G2 . F2 . G2 . | G2 . E2 . A2 . G2 . | C3 . G2 . F2 . A2 . | G2 . G2 . G2 . B2 .',
    'k . h . s . h . | k . h k s . h .', 100, 2),
  tourmap: organ('G4 B4 D5 B4 | C5 E5 G5 E5 | D5 B4 G4 B4 | A4 - G4 . | G4 B4 D5 G5 | E5 C5 A4 C5 | D5 E5 F#5 D5 | G5 - - .',
    'G3 . B3 . | C4 . E4 . | D4 . G3 . | A3 . G3 . | G3 . B3 . | E4 . A3 . | D4 . F#4 . | G4 . . .',
    'G2 B2 D3 B2 | C3 E3 G3 E3 | D3 B2 G2 B2 | D3 F#2 G2 . | G2 B2 D3 B2 | A2 C3 E3 C3 | D3 D3 D3 D3 | G2 D3 G2 .',
    'k h s h', 120, 2),
  kernel: organ('C5 . E5 G5 . E5 | F5 . A5 C6 . A5 | G5 . E5 C5 . E5 | D5 - - . . . | C5 . E5 G5 . E5 | F5 . A5 C6 . A5 | G5 F5 E5 D5 E5 D5 | C5 - - . . .',
    'C4 . . E4 . . | F4 . . A4 . . | E4 . . C4 . . | G3 - - . . . | C4 . . E4 . . | F4 . . A4 . . | E4 . . G3 . . | C4 - - . . .',
    'C3 . G2 . C3 . | F2 . C3 . F2 . | C3 . G2 . E2 . | G2 . D3 . G2 . | C3 . G2 . C3 . | F2 . C3 . F2 . | G2 . G2 . G2 . | C3 . G2 . C3 .',
    'k . h s . h', 116, 3, [{ name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'C6 . G5 . E5 . | F6 . C6 . A5 . | G6 . E6 . C6 . | D6 . B5 . G5 .' }]),
  barnacle: organ('D5 . F#5 A5 . F#5 | G5 . E5 C#5 . E5 | D5 . F#5 A5 . D6 | C#6 - A5 . . . | B5 . G5 E5 . G5 | A5 . F#5 D5 . F#5 | E5 F#5 G5 E5 C#5 E5 | D5 - - . . .',
    'D4 . . A3 . . | E4 . . A3 . . | D4 . . F#4 . . | A4 - - . . . | G4 . . E4 . . | F#4 . . D4 . . | A3 . . C#4 . . | D4 - - . . .',
    'D3 . A2 . D3 . | A2 . E2 . A2 . | D3 . A2 . D3 . | A2 . C#3 . E3 . | G2 . D3 . G2 . | D3 . A2 . D3 . | A2 . A2 . A2 . | D3 . A2 . D3 .',
    'k . h s . h', 112, 3, [{ name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'A5 . D6 . F#6 . | G5 . C#6 . E6 . | A5 . D6 . F#6 . | E6 . C#6 . A5 .' }]),
  caldera: { bpm: 132, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .06, notes: 'A4 . C5 . E5 . D5 C5 | B4 . . . G#4 . . . | A4 . C5 . E5 . A5 G5 | F5 . E5 . D5 . E5 . ' },
    { name: 'bass', wave: 'saw', vol: .14, notes: 'A2 A2 . A2 A2 . A2 . | E2 E2 . E2 G#2 . E2 . | A2 A2 . A2 C3 . A2 . | F2 F2 . E2 E2 . E2 .' },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . t k s . t . | k k t . s . t t' },
    { name: 'hype', wave: 'square', vol: .05, on: false, notes: 'A5 E6 A5 E6 C6 E6 C6 E6 | B5 E6 B5 E6 G#5 E6 G#5 E6' }] },
  tranquility: { bpm: 104, steps: 4, tracks: [
    { name: 'base', wave: 'sine', vol: .12, notes: 'E5 B5 G5 B5 E6 B5 G5 B5 | D5 A5 F#5 A5 D6 A5 F#5 A5 | C5 G5 E5 G5 C6 G5 E5 G5 | B4 F#5 D#5 F#5 B5 F#5 D#5 F#5' },
    { name: 'pad', wave: 'triangle', vol: .14, notes: 'E4 - - - - - - - | D4 - - - - - - - | C4 - - - - - - - | B3 - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'E2 . . . E2 . . . | D2 . . . D2 . . . | C2 . . . C2 . . . | B1 . . . B1 . . .' },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k . . h . . s . | k . h . . . s h' },
    { name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'B5 . E6 . G6 . E6 . | A5 . D6 . F#6 . D6 .' }] },
  boneyard: organ('E5 . . G5 . . | F#5 . . D#5 . . | E5 . . B4 . . | C5 - - B4 - - | E5 . . G5 . . | A5 . . F#5 . . | G5 . F#5 E5 . D#5 | E5 - - . . .',
    'E4 . . B3 . . | D#4 . . B3 . . | E4 . . G3 . . | A3 - - B3 - - | E4 . . B3 . . | C4 . . D#4 . . | E4 . . B3 . . | E4 - - . . .',
    'E2 . . B2 . . | B1 . . F#2 . . | E2 . . E2 . . | A2 . . B2 . . | E2 . . B2 . . | A2 . . B2 . . | E2 . B1 . B1 . | E2 . . . . .',
    'k . . h . . | s . . h . .', 90, 3, [{ name: 'theremin', wave: 'sine', vol: .07, notes: 'B5 - - - - - | A5 - - - - - | G5 - - - - - | F#5 - - - - -' }, { name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'E6 . . B5 . . | F#6 . . D#6 . .' }]),
  megadome: { bpm: 118, steps: 4, tracks: [
    { name: 'base', wave: 'pulse', vol: .07, notes: 'A4 . E5 . A5 . E5 . | F4 . C5 . F5 . C5 . | C5 . G5 . C6 . G5 . | G4 . D5 . G5 . B5 .' },
    { name: 'lead', wave: 'saw', vol: .05, notes: 'E5 - - - D5 - C5 - | C5 - - - - - . . | E5 - - - G5 - E5 - | D5 - - - B4 - - -' },
    { name: 'bass', wave: 'square', vol: .14, notes: 'A2 A2 A3 A2 A2 A2 A3 A2 | F2 F2 F3 F2 F2 F2 F3 F2 | C3 C3 C4 C3 C3 C3 C4 C3 | G2 G2 G3 G2 G2 G2 G3 G2' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h . | k . h k s . h h' },
    { name: 'hype', wave: 'square', vol: .05, on: false, notes: 'A5 C6 E6 A6 E6 C6 A5 E5 | F5 A5 C6 F6 C6 A5 F5 C5' }] },
  derby: { bpm: 160, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'E5 E5 G5 E5 | A5 G5 E5 D5 | E5 E5 G5 E5 | B5 A5 G5 A5 | C6 B5 A5 G5 | A5 G5 E5 D5 | E5 G5 D5 B4 | E5 - E5 .' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'E2 E3 E2 E3 | A2 A3 A2 A3 | E2 E3 E2 E3 | B2 B3 B2 B3 | C3 C4 C3 C4 | A2 A3 A2 A3 | E2 E3 B2 B3 | E2 E3 E2 .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k s k s | k s k k s s' }] },
  rhubarb: { bpm: 180, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'C5 D#5 F5 F#5 | G5 F#5 F5 D#5 | C5 D#5 F5 F#5 | G5 A#5 G5 . | C6 A#5 G5 F#5 | F5 D#5 C5 D#5 | F5 F#5 G5 F#5 | C5 - C5 .' },
    { name: 'bass', wave: 'saw', vol: .14, notes: 'C2 C3 C2 C3 | C2 C3 C2 C3 | F2 F3 F2 F3 | G2 G3 G2 G3' },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k k s . k s s s' }] },
  training: organ('G5 . E5 . C5 . E5 . | F5 . D5 . B4 . D5 . | E5 . G5 . C6 . G5 . | F5 E5 D5 C5 D5 . . .',
    'C4 . . . E4 . . . | D4 . . . G3 . . . | C4 . . . E4 . . . | G3 . . . G3 . . .',
    'C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . E3 . | G2 . G2 . G2 . G2 .', 'k . h . s . h .', 112, 2),
  credits: organ('C5 E5 G5 C6 | B5 G5 E5 G5 | A5 F5 C5 F5 | G5 - - . | E5 G5 C6 E6 | D6 C6 B5 A5 | G5 E5 F5 D5 | C5 - - .',
    'C4 . G3 . | B3 . G3 . | A3 . F3 . | G3 - - . | C4 . G3 . | D4 . A3 . | G3 . G3 . | C4 - - .',
    'C3 G2 C3 G2 | E2 B2 E2 B2 | F2 C3 F2 C3 | G2 D3 G2 D3 | C3 G2 C3 G2 | D3 A2 D3 A2 | G2 D3 G2 B2 | C3 G2 C3 .', 'k h s h', 104, 2),
  hubcard: { bpm: 110, steps: 2, tracks: [
    { name: 'base', wave: 'triangle', vol: .12, notes: 'C5 E5 G5 E5 | A4 C5 E5 C5 | F4 A4 C5 A4 | G4 B4 D5 B4' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'C3 - - . | A2 - - . | F2 - - . | G2 - - .' }] }
};
const STINGS = {
  homer: { bpm: 180, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - E6 - G6 - - - . . . .' }, { wave: 'triangle', vol: .2, notes: 'C4 . G4 . C5 - - . E5 - - - . . . .' }] },
  strikeout: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .1, notes: 'G5 E5 C5 G4 - - . .' }] },
  inning: { bpm: 160, steps: 2, tracks: [{ wave: 'square', vol: .08, notes: 'C5 . C5 E5 G5 - - .' }, { wave: 'triangle', vol: .15, notes: 'C4 . C4 C4 E4 - - .' }] },
  victory: { bpm: 150, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 C5 C5 C5 G#4 . A#4 . C5 . A#4 C5 - - - .' }, { wave: 'triangle', vol: .2, notes: 'C4 C4 C4 C4 G#3 . A#3 . C4 . A#3 C4 - - - .' }] },
  defeat: { bpm: 90, steps: 2, tracks: [{ wave: 'triangle', vol: .15, notes: 'E4 D#4 D4 C#4 - - - .' }] },
  batzooka: { bpm: 220, steps: 2, tracks: [{ wave: 'saw', vol: .1, notes: 'C4 D#4 G4 C5 D#5 G5 C6 - - - . .' }] },
  charge: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .1, notes: 'G4 C5 E5 G5 . E5 G5 - - .' }, { wave: 'drums', vol: .12, notes: 'k . k . s . k k s .' }] }
};
let curSong = null;
function music(name, o) { if (curSong === name) return; curSong = name; A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); }
function sting(name) { if (!BZ.mute) A.sting(STINGS[name], { at: 'now' }); }
function layer(name, v) { try { A.layer(name, v, .8); } catch (e) { /* the song has no such layer */ } }
BZ.SONGS = SONGS; BZ.STINGS = STINGS;

/* ---- BABBLE: gibberish voices, one syllable a letter. Vowels set the pitch contour; caps are louder and slower ---- */
const VOICES = {
  hap: { wave: 'pulse', base: 190, rate: 20, range: 7 }, lou: { wave: 'square', base: 120, rate: 15, vib: [6, .02] },
  pa: { wave: 'triangle', base: 150, rate: 9, echo: true }, ump: { wave: 'square', base: 260, rate: 14, hold: true },
  dot: { wave: 'pulse12', base: 300, rate: 22 }, ike: { wave: 'triangle', base: 170, rate: 12, vib: [5, .04] },
  mort: { wave: 'saw', base: 140, rate: 16 }, robo: { wave: 'saw', base: 90, rate: 18, quant: true }, bones: { wave: 'triangle', base: 220, rate: 18, clack: true },
  brine: { wave: 'pulse', base: 200, rate: 17 }, iggy: { wave: 'square', base: 230, rate: 22 }, cosmo: { wave: 'sine', base: 210, rate: 15, vib: [7, .05] },
  kid: { wave: 'pulse', base: 260, rate: 21 }, hank: { wave: 'square', base: 140, rate: 13 }, pip: { wave: 'pulse12', base: 330, rate: 22 }, vendor: { wave: 'square', base: 240, rate: 16 }
};
const VOWEL = { a: 0, e: 4, i: 7, o: 2, u: -3, y: 5 };
const babble = {
  q: [], t: 0, v: null,
  say(text, voice) { const V = VOICES[voice] || VOICES.hap; this.q = []; this.v = V; let lift = 0, caps = false;
    for (const w of String(text).split(/(\s+)/)) {
      caps = w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w);
      for (const ch of w) {
        if (/\s/.test(ch)) { this.q.push({ gap: .04 }); continue; }
        if ('.,!?'.includes(ch)) { this.q.push({ gap: ch === ',' ? .08 : .14 }); if (ch === '!') lift = 4; continue; }
        const c = ch.toLowerCase(); if (c < 'a' || c > 'z') continue;
        const vow = c in VOWEL, semis = (vow ? VOWEL[c] : (c.charCodeAt(0) * 7) % 5 - 2) + (lift > 0 ? 3 : 0); if (lift > 0) lift--;
        this.q.push({ c, vow, semis, caps });
      }
    }
  },
  stop() { this.q = []; },
  update(dt) {
    if (!this.q.length || !this.v) return; this.t -= dt; if (this.t > 0) return;
    const n = this.q.shift(), V = this.v; if (n.gap) { this.t = n.gap; return; }
    let semis = n.semis * (V.range ? V.range / 7 : 1); if (V.quant) semis = [0, 4, 7][Math.abs(Math.round(semis)) % 3];
    const freq = V.base * Math.pow(2, semis / 12), dur = (1 / V.rate) * (n.vow ? 1.3 : .8) * (n.caps ? 1.4 : 1) * (V.hold && n.vow ? 1.8 : 1);
    const vol = (game.settings.voices === undefined ? .8 : game.settings.voices) * (n.caps ? .2 : .13);
    if (vol > 0 && !BZ.mute) {
      A.sfx({ wave: V.wave, freq, to: freq * 1.06, dur, vol, vib: V.vib || (V.hold && n.vow ? [7, .04] : undefined) }, { vary: 0 });
      if ('szx'.includes(n.c)) A.sfx({ wave: 'noise', freq: 4000, dur: .01, vol: vol * .5 }, { vary: 0 });
      if (V.clack && n.vow) A.sfx({ wave: 'noise', freq: 2400, to: 1800, dur: .015, vol: vol * .6 }, { vary: 0 });
      if (V.echo) game.after(.12, () => A.sfx({ wave: V.wave, freq, dur, vol: vol * .4 }, { vary: 0 }));
    }
    this.t = dur;
  }
};
BZ.babble = babble;

/* ===== 05-park.js ===== */
/* THE BALLPARK: units and geometry (home plate H in the south, center field north, x east), the six parks as data, the
 * floor painted from analytic geometry (shared by the Broadcast Cam's TileMap and the Plate Cam's Mode 7 floor), the
 * fence R(theta), stands, light towers and park props. */
const HX = 1300, HY = 1720, T16 = 16;
const BASES = [[0, 0], [212, -212], [0, -424], [-212, -212]];          // home, 1B, 2B, 3B, offsets from H
const basePos = b => ({ x: HX + BASES[b % 4][0], y: HY + BASES[b % 4][1] });
const RUBBER = { x: HX, y: HY - 205 };
const POS_SPOTS = { P: [0, -200], C: [0, 16], '1B': [225, -275], '2B': [105, -395], SS: [-105, -395], '3B': [-225, -275], LF: [-420, -760], CF: [0, -900], RF: [420, -760] };
const POS_ORDER = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const thetaOf = (x, y) => Math.atan2(x - HX, -(y - HY));             // spray angle: 0 = straight-away center, + = right field
const rOf = (x, y) => Math.hypot(x - HX, y - HY);
const dirOf = th => [Math.sin(th), -Math.cos(th)];
const D45 = Math.PI / 4;

/* ---- the parks ---- */
const PARKS = {
  kernel: { name: 'KERNEL FIELD', team: 'COM', fence: [980, 1080, 1180, 1060, 950], fh: 40, mow: 'stripes', grass: [70, 150, 60], dirt: [176, 118, 72],
    ground: 'corn', groundCol: [150, 140, 60], night: false, ambient: .9, sky: { sky: ['#2a3a7a', '#e08a5a', '#ffd08a'], sun: { x: .2, y: .55, r: 15, color: '#ffe8b0' },
      layers: [{ kind: 'clouds', color: '#ffc8a0', y: .3, height: .12, parallax: .04, drift: 3 }, { kind: 'hills', color: '#6a7a4a', y: .62, height: .14, parallax: .08 }, { kind: 'forest', color: '#3a4a2a', y: .72, height: .1, parallax: .15 }] },
    fenceCol: '#2a5a3a', topCol: '#f2c230', standCol: '#8a5a3a', weather: { kind: 'leaves', amount: .15, wind: .2 }, song: 'kernel', mascot: { base: '#f4ecd8', dk: '#c8b890', lt: '#fffbe8' }, hazard: 'silo', wind: true },
  barnacle: { name: 'BARNACLE BAY PARK', team: 'HCK', fence: [1000, 1100, 1150, 1000, 900], fh: 40, mow: 'checker', grass: [60, 160, 90], dirt: [196, 150, 100],
    ground: 'sea', groundCol: [40, 110, 190], night: false, ambient: 1, sky: 'ocean', fenceCol: '#1f6a8a', topCol: '#ff7a5c', standCol: '#d8c8a0', weather: null, song: 'barnacle',
    mascot: { base: '#8a4ad0', dk: '#5a2a90', lt: '#b88af0' }, hazard: 'gulls', wind: true },
  caldera: { name: 'CALDERA FIELD', team: 'MCE', fence: [920, 1060, 1200, 1100, 1000], fh: 50, mow: 'burnt', grass: [70, 110, 40], dirt: [120, 70, 50],
    ground: 'lava', groundCol: [60, 30, 30], night: true, ambient: .6, sky: { sky: ['#1a0408', '#5a1010', '#c0401a'], moon: { x: .7, y: .25, r: 9, color: '#ffb080' }, stars: 20,
      layers: [{ kind: 'mountains', color: '#3a1410', y: .5, height: .4, parallax: .05 }, { kind: 'fog', color: '#802a10', y: .7, height: .1, parallax: .1, drift: 5 }] },
    fenceCol: '#2b2b30', topCol: '#ff6a1a', standCol: '#3a3034', weather: { kind: 'ash', amount: .5, wind: .1 }, song: 'caldera', mascot: { base: '#ff7a2a', dk: '#c03a10', lt: '#ffc070' }, hazard: 'vents', wind: true },
  tranquility: { name: 'TRANQUILITY DOME', team: 'MBM', fence: [1350, 1450, 1550, 1450, 1350], fh: 60, mow: 'turf', grass: [60, 170, 110], dirt: [150, 150, 160],
    ground: 'regolith', groundCol: [120, 120, 130], night: true, ambient: .65, sky: { sky: ['#000004', '#05061a', '#10102a'], stars: 200, moon: { x: .75, y: .22, r: 22, color: '#5aa0ff' },
      layers: [{ kind: 'mountains', color: '#3a3a48', y: .6, height: .2, parallax: .04 }] },
    fenceCol: '#4a4a6a', topCol: '#6a4cff', standCol: '#5a5a70', weather: null, song: 'tranquility', mascot: { base: '#a8a8b0', dk: '#6a6a78', lt: '#e0e0e8' }, hazard: 'lowgrav', wind: false,
    gravityMul: .55, evMul: .8, jumpMul: 2, ofDepth: 200 },
  boneyard: { name: 'BONEYARD BALLPARK', team: 'HMH', fence: [1000, 1080, 1120, 1080, 1000], fh: 36, mow: 'dead', grass: [80, 110, 60], dirt: [110, 90, 80],
    ground: 'graves', groundCol: [50, 60, 50], night: true, ambient: .5, sky: { sky: ['#05040e', '#1a1630', '#2a3040'], moon: { x: .5, y: .2, r: 18, color: '#f4f0d8' }, stars: 60,
      layers: [{ kind: 'forest', color: '#10121a', y: .66, height: .2, parallax: .06 }, { kind: 'fog', color: '#5a6a70', y: .74, height: .12, parallax: .1, drift: 4 }] },
    fenceCol: '#1a1630', topCol: '#7dffb0', standCol: '#2a2638', weather: { kind: 'leaves', amount: .3, wind: .3 }, song: 'boneyard', mascot: { base: '#f0f0f8', dk: '#a8a8c0', lt: '#ffffff', ghost: true }, hazard: 'fog', wind: true },
  megadome: { name: 'MEGAMAX MEGADOME', team: 'MMX', fence: [1000, 1060, 1100, 1060, 1000], fh: 40, megaWall: true, mow: 'neon', grass: [50, 140, 90], dirt: [90, 80, 100],
    ground: 'neon', groundCol: [30, 20, 50], night: true, ambient: .65, sky: 'city-night', fenceCol: '#e01e3c', topCol: '#2de2e6', standCol: '#3a3050', weather: null, song: 'megadome',
    mascot: { base: '#b8c0cc', dk: '#7a8290', lt: '#ffffff', wings: true }, hazard: 'drones', wind: false }
};
for (const id in PARKS) { const p = PARKS[id]; p.id = id; p.gravityMul = p.gravityMul || 1; p.evMul = p.evMul || 1; p.jumpMul = p.jumpMul || 1; p.ofDepth = p.ofDepth || 0; BZ.def('parks', id, p); }
const PARK_ORDER = ['kernel', 'barnacle', 'caldera', 'tranquility', 'boneyard', 'megadome'];

/* ---- fence R(theta) (Catmull-Rom over five control distances) and height Hf(theta) ---- */
function fenceR(park, th) {
  const c = park.fence, u = clamp((th + D45) / (Math.PI / 8), 0, 4), i = Math.min(3, Math.floor(u)), t = u - i;
  const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(4, i + 2)];
  return .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}
const fenceH = (park, th) => park.megaWall && th < -.35 && th > -D45 - .05 ? 90 : park.fh;

/* ---- the floor: one function paints every pixel of the park (both cameras) ---- */
function floorColor(park, x, y) {
  const dx = x - HX, dy = y - HY, r = Math.hypot(dx, dy), th = Math.atan2(dx, -dy), n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
  const R = fenceR(park, clamp(th, -D45, D45));
  // chalk: foul lines out to the fence, the batter's and catcher's boxes
  const perpL = Math.abs(dx - dy) / Math.SQRT2, perpR = Math.abs(dx + dy) / Math.SQRT2, along = -dy;
  const g = park.grass, d = park.dirt;
  const dirtC = () => [d[0] + n * 18, d[1] + n * 14, d[2] + n * 12];
  const fair = Math.abs(th) <= D45 + .001;
  if (r < R + 2 && along > -2 && ((perpL < 1.4 && dx <= 1) || (perpR < 1.4 && dx >= -1))) return [236 + n * 10, 236 + n * 10, 228];
  const bx = Math.abs(Math.abs(dx) - 18), boxEdge = (Math.abs(dx) > 11 && Math.abs(dx) < 25 && Math.abs(dy + 4) < 12) && (Math.abs(Math.abs(dx) - 11.5) < .8 || Math.abs(Math.abs(dx) - 24.5) < .8 || Math.abs(Math.abs(dy + 4) - 11.5) < .8);
  if (boxEdge && bx < 8) return [230, 230, 222];
  // beyond the fence: the park's own ground
  if (fair && r > R + 6 || (!fair && r > 300 && Math.min(perpL, perpR) > 92)) return beyond(park, x, y, n);
  // dirt: the infield arc, the basepaths, the home circle, the mound; the warning track
  const mound = Math.hypot(dx, dy + 200) < 26, homeC = r < 44;
  const inSq = Math.abs(dx) + Math.abs(dy + 212) < 212 - 22;
  const pathL = perpL < 11 && along > 0 && along < 300 && dx < 0, pathR = perpR < 11 && along > 0 && along < 300 && dx > 0;
  const pathTop = (Math.abs(Math.abs(dx) - (424 + dy) ) < 11 && dy < -212 && dy > -430);
  const arc = r < 470 && Math.abs(th) < .87 && !inSq;
  if (mound || homeC || ((arc || pathL || pathR || pathTop) && !inSq) || (r < 470 && r > 200 && Math.abs(th) < .87 && !inSq)) {
    if (Math.hypot(dx, dy + 205) < 2.5 && Math.abs(dy + 205) < 1.2) return [245, 245, 240];
    return dirtC();
  }
  if (fair && r > R - 48 && r < R + 6) return [d[0] * .8 + n * 14, d[1] * .78 + n * 12, d[2] * .8 + n * 10];
  // grass with the park's mowing pattern
  let k = 1;
  if (park.mow === 'stripes') k = Math.floor((x - HX + 2000) / 48) % 2 ? 1.12 : .92;
  else if (park.mow === 'checker') k = (Math.floor((x + 2000) / 64) + Math.floor((y + 2000) / 64)) % 2 ? 1.1 : .92;
  else if (park.mow === 'burnt') k = .85 + E.noise2(x * .01, y * .01) * .35;
  else if (park.mow === 'turf') k = Math.floor((-dy + 4000) / 40) % 2 ? 1.08 : .96;
  else if (park.mow === 'dead') k = .8 + E.noise2(x * .02, y * .02) * .5;
  else if (park.mow === 'neon') { if ((Math.abs(((x + 4000) % 96) - 48) < 1 || Math.abs(((y + 4000) % 96) - 48) < 1)) return [60, 230, 240]; k = 1; }
  const m = E.noise2(x * .05, y * .05) * .15;
  return [g[0] * (k + m) + n * 16, g[1] * (k + m) + n * 22, g[2] * (k + m) + n * 14];
}
function beyond(park, x, y, n) {
  const c = park.groundCol;
  switch (park.ground) {
    case 'corn': { const row = Math.floor(x / 10) % 2, h = E.noise2(x * .05, y * .05); return row ? [120 + h * 60 + n * 30, 140 + h * 40 + n * 20, 40] : [70 + n * 20, 100 + n * 20, 30]; }
    case 'sea': { const w = Math.sin(x * .05 + y * .03 + E.noise2(x * .01, y * .01) * 4); return w > .85 ? [200, 230, 250] : [30 + w * 10, 100 + w * 15, 180 + w * 15]; }
    case 'lava': { const h = E.noise2(x * .02, y * .02), hot = h > .55; return hot ? [255, 120 + h * 120, 30, 1] : [50 + n * 20 + h * 40, 30 + n * 10, 28]; }
    case 'regolith': { const cr = E.noise2(x * .015, y * .015); return [c[0] + cr * 40 + n * 22, c[1] + cr * 40 + n * 22, c[2] + cr * 40 + n * 22]; }
    case 'graves': { const h = E.noise2(x * .03, y * .03); return [40 + h * 30 + n * 14, 52 + h * 30 + n * 14, 40 + h * 20 + n * 10]; }
    case 'neon': { const grid = (Math.abs(((x + 4000) % 64) - 32) < 1 || Math.abs(((y + 4000) % 64) - 32) < 1); return grid ? [255, 60, 200, 1] : [30 + n * 10, 20 + n * 8, 50 + n * 12]; }
  }
  return c;
}

/* ---- the TileMap: fence ring, foul walls, backstop and stands, built from the geometry; floor painted by floorColor ---- */
function buildMap(park) {
  const X0 = 0, Y0 = 0, cols = Math.ceil(2 * HX / T16), rows = Math.ceil((HY + 300) / T16), out = [];   // (map coordinates are world coordinates)
  const stands = [];
  for (let cy = 0; cy < rows; cy++) {
    let s = '';
    for (let cx = 0; cx < cols; cx++) {
      const x = X0 + cx * T16 + 8, y = Y0 + cy * T16 + 8, dx = x - HX, dy = y - HY, r = Math.hypot(dx, dy), th = Math.atan2(dx, -dy);
      let ch = '.';
      if (Math.abs(th) <= D45 + .02) {
        const R = fenceR(park, clamp(th, -D45, D45));
        if (r >= R && r < R + 16) ch = 'F';
        else if (r >= R + 40 && r < R + 40 + 48 && Math.abs(th) < D45 - .05) { const tier = Math.min(2, Math.floor((r - R - 40) / 16)); ch = String(tier + 1); }
      } else {
        const pOut = dx < 0 ? Math.abs(dx - dy) / Math.SQRT2 : Math.abs(dx + dy) / Math.SQRT2, along = dx < 0 ? (-dx - dy) / Math.SQRT2 : (dx - dy) / Math.SQRT2;
        if (r >= 110 && r < 118 && along < 80) ch = 'B';
        else if (r >= 134 && r < 182 && along < 80) ch = String(Math.min(3, Math.floor((r - 134) / 16) + 1));
        else if (along >= 80 && pOut >= 70 && pOut < 78) ch = 'W';
        else if (along >= 60 && pOut >= 92 && pOut < 140) ch = String(Math.min(3, Math.floor((pOut - 92) / 16) + 1));
      }
      if ('123'.includes(ch)) stands.push({ x, y, tier: +ch });
      s += ch;
    }
    out.push(s);
  }
  const fc = park.fenceCol, sc = park.standCol;
  const types = {
    1: { h: 0, top: fc, side: fc },
    10: { h: park.fh, top: park.topCol, side: fc, face: 'plank', roof: 'plain', cut: true, cutH: 10 },
    11: { h: 14, top: park.topCol, side: fc, face: 'plank', roof: 'plain', cut: true, cutH: 8 },
    12: { h: 44, top: '#cfd2da', side: '#5a5e6a', face: 'none', roof: 'plain', cut: true, cutH: 10 },
    13: { h: 26, top: E.shade(sc, .1), side: sc, face: 'stone', roof: 'slab', cut: true, cutH: 8 },
    14: { h: 40, top: E.shade(sc, .05), side: E.shade(sc, -.1), face: 'stone', roof: 'slab', cut: true, cutH: 10 },
    15: { h: 54, top: sc, side: E.shade(sc, -.2), face: 'stone', roof: 'slab', cut: true, cutH: 12 }
  };
  const map = new E.TileMap({ rows: out, legend: { F: 10, W: 11, B: 12, 1: 13, 2: 14, 3: 15, '.': { floor: 'field' } }, types, ao: 3,
    floorTex: (x, y) => floorColor(park, x, y), outside: '#' + park.groundCol.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('') });
  map.ox = X0; map.oy = Y0; map.stands = stands;
  return map;
}

/* ---- a park's built pieces, cached per park: the map, the Mode 7 view, the backdrop, the fence polyline, props, crowd ---- */
const PARK_CACHE = {};
function parkKit(id) {
  if (PARK_CACHE[id]) return PARK_CACHE[id];
  const park = PARKS[id], kit = { park };
  kit.map = HEADLESS ? null : buildMap(park);
  kit.bg = HEADLESS ? null : new E.Backdrop(park.sky);
  kit.m7 = HEADLESS ? null : new E.Mode7({ floor: (x, y) => floorColor(park, x, y), size: [4000, 4000], outside: '#' + park.groundCol.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''), sky: kit.bg, far: 5200 });
  kit.fence = []; for (let i = 0; i <= 48; i++) { const th = -D45 + i * (Math.PI / 2) / 48, R = fenceR(park, th), [ux, uy] = dirOf(th); kit.fence.push({ x: HX + ux * R, y: HY + uy * R, th, h: fenceH(park, th) }); }
  kit.props = parkProps(park); kit.fans = makeFans(park, kit);
  PARK_CACHE[id] = kit; return kit;
}
/* the fans: seats on the outfield bleachers and along the foul lines (both cameras); colors from the home team */
function makeFans(park, kit) {
  const fans = [], rnd = E.rng(park.id.length * 77 + 5);
  for (let i = 0; i < 900; i++) {
    const u = rnd(); let x, y, z, th;
    if (u < .55) { th = -D45 + .06 + rnd() * (Math.PI / 2 - .12); const R = fenceR(park, th), tier = Math.floor(rnd() * 3), [ux, uy] = dirOf(th); x = HX + ux * (R + 46 + tier * 16 + rnd() * 8); y = HY + uy * (R + 46 + tier * 16 + rnd() * 8); z = [26, 40, 54][tier]; }
    else { const side = rnd() < .5 ? -1 : 1, along = 160 + rnd() * 560, tier = Math.floor(rnd() * 3), off = 98 + tier * 16 + rnd() * 8;
      const lx = side * along / Math.SQRT2, ly = -along / Math.SQRT2, nx = side / Math.SQRT2, ny = 1 / Math.SQRT2; x = HX + lx + nx * off; y = HY + ly + ny * off; z = [26, 40, 54][tier]; }
    fans.push({ x, y, z, ph: rnd() * TAU, shirt: ['#e8443a', '#3b82f6', '#f2c230', '#f4ecd8', '#22c55e', '#ff7a5c', '#8a4ad0', '#ffffff'][Math.floor(rnd() * 8)], skin: ['#f0c8a8', '#e0a880', '#a87050', '#6a4028'][Math.floor(rnd() * 4)], cap: rnd() < .4 });
  }
  return fans;
}
/* props per park: light towers, the scoreboard, and the park's own pieces (drawn by drawProp) */
function parkProps(park) {
  const L = [], at = (th, r, kind, o = {}) => { const [ux, uy] = dirOf(th); L.push(Object.assign({ x: HX + ux * r, y: HY + uy * r, kind }, o)); };
  const R = th => fenceR(park, th);
  for (const th of [-.95, -.4, .4, .95]) at(th, Math.abs(th) > .8 ? 720 : R(th) + 140, 'tower', { h: 170 });
  at(.08, R(.08) + 120, park.id === 'megadome' ? 'megatron' : 'scoreboard', { h: 110 });
  if (park.id === 'kernel') { at(.55, R(.55) + 170, 'silo', { h: 150 }); at(-.6, R(-.6) + 230, 'windmill', { h: 130 }); for (let i = 0; i < 8; i++) at(-.75 + i * .2, R(-.75 + i * .2) + 300, 'hay', { h: 14 }); }
  if (park.id === 'barnacle') { at(-.7, R(-.7) + 260, 'lighthouse', { h: 180 }); at(.55, R(.55) + 240, 'boat', { h: 30 }); at(.3, R(.3) + 330, 'boat', { h: 30 }); at(.75, R(.75) + 160, 'buoy', { h: 16 }); }
  if (park.id === 'caldera') { for (const th of [-.38, .38]) at(th, R(th) - 120, 'vent', { h: 14, vent: true }); at(0, R(0) + 420, 'volcano', { h: 300 }); for (let i = 0; i < 6; i++) at(-.8 + i * .32, R(-.8 + i * .32) + 160, 'basalt', { h: 70 }); }
  if (park.id === 'tranquility') { at(-.5, R(-.5) + 200, 'habitat', { h: 60 }); at(.5, R(.5) + 220, 'dish', { h: 90 }); at(.2, R(.2) + 300, 'habitat', { h: 60 }); at(-.15, R(-.15) + 260, 'antenna', { h: 120 }); }
  if (park.id === 'boneyard') { for (let i = 0; i < 14; i++) at(-.8 + i * .12, R(-.8 + i * .12) + 110 + (i % 3) * 40, 'tomb', { h: 20, seed: i }); at(-.45, R(-.45) + 240, 'crypt', { h: 60 }); at(.6, R(.6) + 220, 'deadtree', { h: 90 }); }
  if (park.id === 'megadome') { at(-.7, R(-.7) + 180, 'holo', { h: 140 }); at(.7, R(.7) + 180, 'holo', { h: 140, alt: true }); at(.45, R(.45) + 160, 'luxbox', { h: 100 }); }
  return L;
}
/* draw one prop at screen (sx, sy) with k screen pixels per world unit */
function drawProp(g, p, sx, sy, k, t) {
  const H = p.h * k;
  const W = n => Math.max(1, n * k);
  switch (p.kind) {
    case 'tower': {
      px.rect(g, sx - W(3), sy - H, W(6), H, '#5a5e6a'); px.rect(g, sx - W(2), sy - H, W(1.5), H, '#8a8e9a');
      px.rect(g, sx - W(22), sy - H - W(18), W(44), W(18), '#2a2c34');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) px.disc(g, sx - W(16) + i * W(10.5), sy - H - W(13) + j * W(8), Math.max(1, W(3.4)), '#fffbe0');
      break;
    }
    case 'scoreboard': case 'megatron': {
      const mega = p.kind === 'megatron', bw = W(mega ? 120 : 100), bh = W(mega ? 70 : 56);
      px.rect(g, sx - W(3), sy - H + bh, W(6), H - bh, '#3a3a44');
      px.rect(g, sx - bw / 2 - W(3), sy - H - W(3), bw + W(6), bh + W(6), mega ? '#e01e3c' : '#7a2a1a');
      px.rect(g, sx - bw / 2, sy - H, bw, bh, '#101418');
      if (BZ.M && k > .08) { const M = BZ.M; const tx = sx - bw / 2 + W(6), sc = k > .5 ? 2 : 1;
        if (k > .25) { E.font.text(g, M.teams[0].def.abbr + ' ' + M.teams[0].runs, tx, sy - H + W(8), '#ffd36a', { scale: sc, outline: false }); E.font.text(g, M.teams[1].def.abbr + ' ' + M.teams[1].runs, tx, sy - H + W(8) + 9 * sc, '#ffd36a', { scale: sc, outline: false }); }
        else for (let i = 0; i < 6; i++) px.rect(g, tx + i * W(14), sy - H + W(10), W(10), W(6), i % 2 ? '#ffd36a' : '#e8e0c0');
      }
      if (mega) for (let i = 0; i < 6; i++) px.disc(g, sx - bw / 2 + i * bw / 5, sy - H - W(3), Math.max(1, W(2)), (Math.floor(t * 4) + i) % 2 ? '#2de2e6' : '#ff3ad0');
      break;
    }
    case 'silo': px.rect(g, sx - W(18), sy - H, W(36), H, p.popped ? '#c8b890' : '#c84a2a'); px.rect(g, sx - W(14), sy - H, W(6), H, '#e06a4a'); px.disc(g, sx, sy - H, W(18), '#9aa0a8'); for (let i = 1; i < 5; i++) px.rect(g, sx - W(18), sy - H + i * H / 5, W(36), Math.max(1, W(1.5)), '#8a2a1a'); break;
    case 'windmill': { px.poly(g, [[sx - W(10), sy], [sx + W(10), sy], [sx + W(3), sy - H], [sx - W(3), sy - H]], '#7a6a5a'); const a = t * 1.4; for (let i = 0; i < 4; i++) { const b = a + i * Math.PI / 2; px.line(g, sx, sy - H, sx + Math.cos(b) * W(40), sy - H + Math.sin(b) * W(40), '#e8e0d0', Math.max(1, W(4))); } break; }
    case 'hay': px.rect(g, sx - W(10), sy - H, W(20), H, '#d8b850'); px.rect(g, sx - W(10), sy - H, W(20), Math.max(1, W(3)), '#f0d878'); break;
    case 'lighthouse': px.poly(g, [[sx - W(16), sy], [sx + W(16), sy], [sx + W(9), sy - H], [sx - W(9), sy - H]], '#f4f0e8'); for (let i = 1; i < 4; i++) px.rect(g, sx - W(15 - i * 2), sy - i * H / 4, W(30 - i * 4), W(12), '#d83a2a'); px.rect(g, sx - W(10), sy - H - W(16), W(20), W(16), '#ffe880'); px.rect(g, sx - W(12), sy - H - W(22), W(24), W(6), '#3a3a44'); break;
    case 'boat': { const bob = Math.sin(t * 1.5 + p.x) * W(2); px.poly(g, [[sx - W(30), sy - W(12) + bob], [sx + W(30), sy - W(12) + bob], [sx + W(22), sy + bob], [sx - W(22), sy + bob]], '#8a3a2a'); px.rect(g, sx - W(1), sy - W(50) + bob, W(2), W(38), '#5a4a3a'); px.poly(g, [[sx + W(1), sy - W(48) + bob], [sx + W(22), sy - W(16) + bob], [sx + W(1), sy - W(16) + bob]], '#f4f0e8'); break; }
    case 'buoy': px.disc(g, sx, sy - W(8) + Math.sin(t * 2) * W(2), W(7), '#ff5a3a'); break;
    case 'vent': { const hot = BZ.hz && BZ.hz.ventHot; px.poly(g, [[sx - W(30), sy], [sx + W(30), sy], [sx + W(10), sy - W(14)], [sx - W(10), sy - W(14)]], '#3a2420'); px.ell ? px.ell(g, sx, sy - W(14), W(10), W(3), hot ? '#ffe060' : '#ff6a1a') : px.rect(g, sx - W(10), sy - W(16), W(20), W(4), hot ? '#ffe060' : '#ff6a1a'); break; }
    case 'volcano': px.poly(g, [[sx - W(420), sy], [sx + W(420), sy], [sx + W(70), sy - H], [sx - W(70), sy - H]], '#3a1a14'); px.poly(g, [[sx - W(70), sy - H], [sx + W(70), sy - H], [sx + W(40), sy - H + W(30)], [sx - W(40), sy - H + W(30)]], '#ff6a1a'); break;
    case 'basalt': px.rect(g, sx - W(8), sy - H, W(16), H, '#2a2428'); px.rect(g, sx - W(8), sy - H, W(5), H, '#3a3438'); break;
    case 'habitat': px.rect(g, sx - W(40), sy - H * .7, W(80), H * .7, '#c8ccd8'); px.disc(g, sx, sy - H * .7, W(40), '#d8dce8'); for (let i = 0; i < 3; i++) px.rect(g, sx - W(28) + i * W(20), sy - H * .5, W(10), W(8), '#ffd87a'); break;
    case 'dish': px.rect(g, sx - W(3), sy - H * .6, W(6), H * .6, '#8a8e9a'); px.disc(g, sx, sy - H * .75, W(30), '#e0e4ec'); px.disc(g, sx + W(4), sy - H * .78, W(22), '#b8bcc8'); break;
    case 'antenna': px.rect(g, sx - W(2), sy - H, W(4), H, '#9aa0a8'); px.disc(g, sx, sy - H, Math.max(1, W(4)), Math.floor(t * 2) % 2 ? '#ff3a3a' : '#5a1a1a'); break;
    case 'tomb': { const sh = p.seed % 3; if (sh === 0) { px.rect(g, sx - W(6), sy - H, W(12), H, '#8a8a90'); px.disc(g, sx, sy - H, W(6), '#8a8a90'); } else if (sh === 1) { px.rect(g, sx - W(1.5), sy - H - W(6), W(3), H + W(6), '#7a7a80'); px.rect(g, sx - W(6), sy - H, W(12), W(3), '#7a7a80'); } else px.rect(g, sx - W(8), sy - H * .7, W(16), H * .7, '#6a6a72'); break; }
    case 'crypt': px.rect(g, sx - W(36), sy - H, W(72), H, '#5a5a62'); px.poly(g, [[sx - W(40), sy - H], [sx + W(40), sy - H], [sx, sy - H - W(26)]], '#4a4a52'); px.rect(g, sx - W(10), sy - W(30), W(20), W(30), '#1a1a20'); break;
    case 'deadtree': px.rect(g, sx - W(4), sy - H, W(8), H, '#3a2a24'); for (let i = 0; i < 4; i++) px.line(g, sx, sy - H * (.5 + i * .12), sx + (i % 2 ? 1 : -1) * W(30), sy - H * (.65 + i * .12), '#3a2a24', Math.max(1, W(3))); break;
    case 'holo': { px.rect(g, sx - W(3), sy - H, W(6), H, '#3a3a50'); const c = p.alt ? '#2de2e6' : '#ff3ad0'; px.blend(g, .5, 'add', () => px.rect(g, sx - W(50), sy - H - W(50), W(100), W(50), c)); if (k > .25) E.font.text(g, p.alt ? 'SYNERGY' : 'MEGAMAX', sx, sy - H - W(30), '#ffffff', { align: 'center', outline: false, scale: k > .8 ? 2 : 1 }); break; }
    case 'luxbox': px.rect(g, sx - W(50), sy - H, W(100), W(40), '#2a2a3a'); px.rect(g, sx - W(46), sy - H + W(6), W(92), W(22), '#ffd87a'); px.rect(g, sx - W(3), sy - H + W(40), W(6), H - W(40), '#3a3a44'); break;
  }

}
BZ.PARKS = PARKS; BZ.parkKit = parkKit;

/* ===== 06-teams.js ===== */
/* TEAMS AND RIGS: six original teams as data (ratings 1-10; 5 is the x1.0 baseline), their pitch repertoires and supers,
 * and the rig factory that dresses an E.Humanoid for each job (batter, fielder, catcher, pitcher, runner). */
const SKINS = ['#f0c8a8', '#e0a880', '#c88a60', '#a87050', '#7a4a2a', '#5a3420'];
const HAIRS = ['#2a1a10', '#5a3a1a', '#a0602a', '#e0b050', '#1a1a1a', '#c8402a', '#8a8a8a'];
const mkP = (name, pos, bt, st, look = {}) => ({ name, pos, bats: bt[0], throws: bt[2], pow: st[0], con: st[1], spd: st[2], arm: st[3], glv: st[4], vel: st[0], ctl: st[1], brk: st[2], sta: st[3], look });
const TEAMS = {
  COM: { name: 'COMETS', city: 'KERNEL FALLS', abbr: 'COM', park: 'kernel', colors: { cloth: '#f4ecd8', pants: '#f4ecd8', trim: '#1e2a5a', belt: '#1e2a5a', boot: '#1a1a22', hat: '#1e2a5a', sock: '#f2c230' },
    chip: '#1e2a5a', chip2: '#f2c230', superPitch: 'cornpopper', voice: 'dot', stars: [4, 4, 3], hero: true,
    roster: [mkP('DOT "DYNAMITE" DELGADO', 'CF', 'R/R', [9, 8, 7, 7, 7], { build: 'heroic', hair: 'ponytail', skin: 3, hairC: 0, voice: 'dot' }), mkP('PEP PORTER', 'SS', 'L/R', [4, 8, 9, 7, 9], { hair: 'short', skin: 0, hairC: 2 }),
      mkP('PIP PORTER', '2B', 'R/R', [4, 7, 9, 6, 8], { hair: 'spiky', skin: 0, hairC: 2, voice: 'pip' }), mkP('MOOSE MAGNUSSON', '1B', 'L/L', [9, 5, 3, 5, 6], { build: 'bulky', hair: 'long', skin: 0, hairC: 3 }),
      mkP('SUNNY SATO', '3B', 'R/R', [6, 7, 6, 8, 8], { hair: 'short', skin: 1, hairC: 4, expr: 'smile' }), mkP('ROSA "RADAR" REYES', 'C', 'R/R', [6, 6, 4, 9, 8], { hair: 'ponytail', skin: 2, hairC: 0 }),
      mkP('LEFTY LUNA', 'LF', 'L/L', [5, 8, 8, 6, 7], { hair: 'spiky', skin: 2, hairC: 4 }), mkP('HANK "HAMBONE" HOLLIS', 'RF', 'R/R', [8, 5, 5, 9, 6], { build: 'bulky', hair: 'bald', skin: 4, hairC: 4, voice: 'hank' }),
      mkP('GRANDPA IKE KOWALSKI', 'P', 'R/R', [4, 8, 9, 6, 6], { hair: 'bald', skin: 0, hairC: 6, hunch: .3, voice: 'ike', pitches: ['heater', 'curve', 'knuckler', 'butterfly'] }),
      mkP('KID KERNEL', 'RP', 'R/R', [9, 5, 5, 4, 5], { hair: 'spiky', skin: 1, hairC: 3, voice: 'kid', pitches: ['heater', 'slider', 'changeup', 'kernelcannon'] })] },
  HCK: { name: 'KRAKENS', city: 'HARBOR CITY', abbr: 'HCK', park: 'barnacle', colors: { cloth: '#1f8a8a', pants: '#e8d8b0', trim: '#ff7a5c', belt: '#ff7a5c', boot: '#1a2a2a', hat: '#1f8a8a' },
    chip: '#1f8a8a', chip2: '#ff7a5c', superPitch: 'tidalwave', voice: 'brine', stars: [3, 3, 4], captainName: 'CAPTAIN BETTINA BRINE',
    names: ['"BARNACLE" BARNEY FINN', 'CORAL QUINN', 'SKIP MARLIN', 'WADE WATERS', 'GIL GRUBER', 'SHELLY SHOALS', 'DASH SEABORNE', 'HOOK HARDY', 'CAPTAIN BETTINA BRINE', 'RIP TIDEWELL'],
    sig: 'riptide', aceStats: [7, 7, 8, 7, 6], aceBT: 'R/L' },
  MCE: { name: 'ERUPTORS', city: 'MAGMA CITY', abbr: 'MCE', park: 'caldera', colors: { cloth: '#2b2b30', pants: '#2b2b30', trim: '#ff6a1a', belt: '#ffd040', boot: '#1a1a1a', hat: '#ff6a1a' },
    chip: '#ff6a1a', chip2: '#2b2b30', superPitch: 'meteorheater', voice: 'iggy', stars: [5, 3, 4], captainName: 'IGGY "THE IGNITER" BLAZE',
    names: ['BASALT BRUNO', 'MAGNUS HOLT', 'CINDER ELLIS', 'ASHLEY PYRE', '"HOT CORNER" HECTOR FLORES', 'EMBER OKAFOR', 'FLINT ROCHA', 'SOL VULCAN', 'IGGY "THE IGNITER" BLAZE', 'SCORCH MCGEE'],
    sig: 'magmasinker', aceStats: [9, 6, 7, 7, 6], aceBT: 'R/R' },
  MBM: { name: 'METEORS', city: 'MOONBASE', abbr: 'MBM', park: 'tranquility', colors: { cloth: '#c8d0e0', pants: '#c8d0e0', trim: '#6a4cff', belt: '#6a4cff', boot: '#3a3a4a', hat: '#6a4cff' },
    chip: '#6a4cff', chip2: '#c8d0e0', superPitch: 'blackhole', voice: 'cosmo', stars: [4, 4, 4], captainName: 'COMMANDER COSMO VEGA',
    names: ['ORBIT OKOYE', 'NOVA NAKAMURA', 'STELLA PETROV', 'QUASAR DIAZ', 'ROCKET RHODES', 'ASTRA BELL', 'HALLEY BROOKS', 'GUS GRAVITAS', 'COMMANDER COSMO VEGA', 'PULSAR PENN'],
    sig: 'zerog', aceStats: [6, 8, 9, 8, 7], aceBT: 'L/L' },
  HMH: { name: 'HAUNTS', city: 'HOLLOWMOOR', abbr: 'HMH', park: 'boneyard', colors: { cloth: '#e8e0c8', pants: '#1a1630', trim: '#7dffb0', belt: '#7dffb0', boot: '#1a1630', hat: '#1a1630', bone: '#e8e0c8' },
    chip: '#7dffb0', chip2: '#1a1630', superPitch: 'banshee', voice: 'bones', stars: [3, 5, 5], skeleton: true, captainName: 'COUNT RATTLEBONES',
    names: ['MORT GRAVES', 'BONEY MALONE', "WAILIN' WINNIE", 'SKELLY KELLY', 'EZEKIEL TOMB', 'SHADE MURPHY', "WISP O'HARA", 'DIGGER DOYLE', 'COUNT RATTLEBONES', 'SPOOK HENNESSY'],
    sig: 'phantomfork', aceStats: [7, 8, 9, 9, 7], aceBT: 'R/R' },
  MMX: { name: 'MECHANICALS', city: 'MEGAMAX', abbr: 'MMX', park: 'megadome', colors: { cloth: '#b8c0cc', pants: '#b8c0cc', trim: '#e01e3c', belt: '#2de2e6', boot: '#3a3a44', hat: '#e01e3c', skin: '#9aa4b4' },
    chip: '#e01e3c', chip2: '#2de2e6', superPitch: 'overclock', voice: 'robo', stars: [5, 4, 5], robot: true, boss: true, locked: true, captainName: 'ENFORCER-9000',
    names: ['BACKSTOP-X', 'FORKLIFT', 'SERVO', 'SPROCKET', 'TORQUE', 'ROUTER', 'BYTE', 'PISTON', 'ENFORCER-9000', 'SPARE PART'],
    sig: 'gigavolt', aceStats: [10, 8, 6, 10, 6], aceBT: 'R/R' }
};
const TEAM_ORDER = ['COM', 'HCK', 'MCE', 'MBM', 'HMH', 'MMX'];
// the rivals' rosters are built from their names, positions and a seeded spread of ratings around the team's stars
(function buildRosters() {
  const POS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'P', 'RP'];
  for (const id of TEAM_ORDER) {
    const T = TEAMS[id]; T.id = id;
    if (!T.roster) {
      const rnd = E.rng(id.charCodeAt(0) * 31 + id.charCodeAt(2)), [pw, sp, pi] = T.stars;
      T.roster = T.names.map((n, i) => {
        const pos = POS[i], st = pos === 'P' ? T.aceStats : [3, 4, 5, 6, 7].map(() => 0).map((_, k) => clamp(Math.round([pw + 2, 6, sp + 2, 6, 6][k] + (rnd() * 4 - 2)), 2, 9));
        const bt = pos === 'P' ? T.aceBT : rnd() < .3 ? 'L/L' : rnd() < .2 ? 'L/R' : 'R/R';
        const look = { build: rnd() < .25 ? 'bulky' : rnd() < .5 ? 'heroic' : undefined, hair: ['short', 'spiky', 'long', 'ponytail', 'bald'][Math.floor(rnd() * 5)], skin: Math.floor(rnd() * 6), hairC: Math.floor(rnd() * 7) };
        if (pos === 'P') Object.assign(look, { build: id === 'MMX' ? 'bulky' : 'heroic', voice: T.voice, size: id === 'MMX' ? 1.9 : 1.3, pitches: ['heater', id === 'HCK' || id === 'HMH' ? 'curve' : 'slider', id === 'MCE' ? 'sinker' : 'changeup', T.sig], captain: true });
        if (pos === 'RP') look.pitches = ['heater', 'slider', 'changeup', T.sig];
        return mkP(n, pos === 'RP' ? 'RP' : pos, bt, st, look);
      });
    }
    T.roster.forEach((p, i) => { p.team = id; p.idx = i; p.id = id + i; p.look.pitches = p.look.pitches || (p.pos === 'P' || p.pos === 'RP' ? ['heater', 'curve', 'changeup', 'heater'] : null); });
    T.captain = T.roster.find(p => p.look.captain) || T.roster[0];
    BZ.def('teams', id, T);
  }
})();
/** the batting order: the eight position players and the pitcher, by a classic shape (speed first, power fourth) */
function lineupOf(T) {
  const hitters = T.roster.filter(p => p.pos !== 'RP' && p.pos !== 'P');
  const by = (f) => hitters.slice().sort((a, b) => f(b) - f(a));
  const lead = by(p => p.spd + p.con)[0], power = by(p => p.pow).filter(p => p !== lead).slice(0, 3), rest = hitters.filter(p => p !== lead && !power.includes(p));
  const order = [lead, rest[0], power[1], power[0], power[2], ...rest.slice(1)].filter(Boolean);
  order.push(T.roster.find(p => p.pos === 'P'));
  return order;
}

/* ---- rigs: one per player per job, cached ---- */
function makeRig(p, job) {
  p.rigs = p.rigs || {};
  if (p.rigs[job]) return p.rigs[job];
  const T = TEAMS[p.team], L = p.look, C = T.colors, size = L.size || (L.build === 'bulky' ? 1.32 : 1.24);
  const colors = Object.assign({}, C, { skin: C.skin || SKINS[L.skin || 0], hair: HAIRS[L.hairC || 0], glove: job === 'bat' ? '#f4f4f0' : undefined, mitt: '#8a4a22', bat: T.id === 'HMH' ? '#d8d0b8' : T.robot ? '#8a94a8' : '#c89a5a', metal: '#8a94a8', plate: C.trim });
  const o = { size, build: T.skeleton ? 'skeleton' : L.build, hair: L.hair || 'short', hunch: L.hunch || 0, colors, outfit: 'shirt', sleeves: job === 'bat' ? 'long' : 'short' };
  if (T.robot) { o.eyeGlow = '#ff3a3a'; o.hair = 'bald'; }
  if (job === 'bat') Object.assign(o, { weapon: 'bat', hat: { style: 'helmet', color: C.hat } });
  else if (job === 'run') Object.assign(o, { weapon: null, hat: { style: 'helmet', color: C.hat } });
  else if (job === 'catch') Object.assign(o, { weapon: null, hat: { style: 'helmet', color: '#2a2a30' }, armor: true, mitt: p.throws === 'L' ? 'right' : 'left', mittSize: 1.6 });
  else if (job === 'brawl') Object.assign(o, { weapon: null, hat: { style: 'cap', color: C.hat }, stance: 'guard' });
  else Object.assign(o, { weapon: null, hat: { style: 'cap', color: C.hat }, mitt: p.throws === 'L' ? 'right' : 'left' });
  return p.rigs[job] = new E.Humanoid(o);
}
/* non-players: the announcers, the umpire, the villain */
const CAST = {};
function castRig(id) {
  if (CAST[id]) return CAST[id];
  const S = {
    hap: { hair: 'short', hat: 'band', colors: { cloth: '#c84a2a', hair: '#5a3a1a', skin: '#f0c8a8', hat: '#2a2a30' } },
    lou: { build: 'bulky', hair: 'bald', colors: { cloth: '#2a5ab8', skin: '#c88a60', hair: '#3a2a1a' } },
    pa: { hair: 'long', colors: { cloth: '#8a2a6a', hair: '#e0b050', skin: '#f0c8a8' } },
    ump: { hat: { style: 'cap', color: '#1a1a2a' }, outfit: 'coat', colors: { cloth: '#1a2040', coat: '#1a2040', skin: '#e0a880', hair: '#5a3a1a', pants: '#5a5a66' } },
    mort: { outfit: 'coat', hat: { style: 'crown', color: '#1a1a1a' }, hair: 'short', colors: { cloth: '#2a2a2a', coat: '#3a2a4a', skin: '#f0d0b0', hair: '#c8c8c8', trim: '#ffd040' } },
    vendor: { hat: { style: 'cap', color: '#e8443a' }, colors: { cloth: '#ffffff', skin: '#a87050' } }
  }[id] || {};
  return CAST[id] = new E.Humanoid(Object.assign({ size: 1.2, weapon: null }, S));
}
BZ.TEAMS = TEAMS;

/* ===== 10-rules.js ===== */
/* RULES: the match state BZ.M, the count, outs, forces, scoring (the third-out rule), half-innings, game end (walk-offs,
 * skipping the bottom of the last inning, extra innings with the Bonus Runner, the mercy rule), line scores and stats.
 * Kept: balls/strikes/walks/strikeouts, fouls (a strike unless two; a two-strike foul bunt is a strikeout), HBP, fair and
 * foul, caught flies (fair or foul), tag-ups, force and tag outs, home runs (and off the pole), ground-rule doubles,
 * inside-the-park homers, errors, steals, wild pitches, double plays, walk-offs. Dropped (the House Rules card): balks,
 * the infield fly rule, appeals, interference, check swings, dropped third strikes, intentional walks. Pickoffs and
 * replays are in 19-replay.js. */
const DIFF = {
  rookie: { name: 'ROOKIE', swingSd: .085, aimSd: 4.6, disc: .45, relQ: .5, after: 0, react: .34, pitchMul: .85, assist: 1.25 },
  pro: { name: 'PRO', swingSd: .072, aimSd: 3.6, disc: .6, relQ: .68, after: .3, react: .25, pitchMul: 1, assist: 1 },
  allstar: { name: 'ALL-STAR', swingSd: .052, aimSd: 2.8, disc: .72, relQ: .8, after: .6, react: .19, pitchMul: 1.07, assist: 1 },
  batzooka: { name: 'BATZOOKA', swingSd: .04, aimSd: 2.1, disc: .82, relQ: .9, after: .9, react: .14, pitchMul: 1.15, assist: .9 }
};
const DIFF_ORDER = ['rookie', 'pro', 'allstar', 'batzooka'];
let M = null;

/** a new match. o: { mode, park, away, home, innings, difficulty, seed, ctrl: [[cap, co], [cap, co]] (inputs or null), fast, cheats } */
function newMatch(o) {
  const seed = o.seed === undefined ? (Math.random() * 1e9) >>> 0 : o.seed; BZ.seed(seed);
  const park = PARKS[o.park || TEAMS[o.home || 'HCK'].park];
  const side = (id, s) => {
    const T = TEAMS[id], lineup = lineupOf(T), pitcher = T.roster.find(p => p.pos === 'P');
    return { def: T, lineup, order: 0, pitcher, bullpen: T.roster.filter(p => p.pos === 'RP'), runs: 0, hits: 0, errors: 0, meter: o.meters ? o.meters[s] : 0, turbo: 100, line: [], side: s,
      ctrl: { cap: (o.ctrl && o.ctrl[s] && o.ctrl[s][0]) || null, co: (o.ctrl && o.ctrl[s] && o.ctrl[s][1]) || null }, stamina: {}, upg: (o.upgrades && o.upgrades[s]) || null };
  };
  M = BZ.M = {
    mode: o.mode || 'exhibition', park, parkId: park.id, seed, innings: o.innings || 3, diff: DIFF[o.difficulty || 'pro'], diffId: o.difficulty || 'pro',
    teams: [side(o.away || 'COM', 0), side(o.home || 'HCK', 1)], inning: 1, half: 0, outs: 0, balls: 0, strikes: 0,
    runners: [], fielders: [], ball: null, phase: 'pregame', phaseT: 0, t: 0, play: null, pitch: null, swing: null,
    reticle: { x: 0, z: 17, tx: 0, tz: 17 }, target: { x: 0, z: 17 }, stats: {}, fast: !!o.fast, cheats: Object.assign({}, o.cheats || {}), over: false, winner: -1,
    events: [], lastContact: null, mercy: o.mercy !== false, comeback: o.comeback !== false, rhubarbs: o.rhubarbs !== false, cam: 'plate', moon: null, replay: null,
    hazard: null, wind: { x: 0, y: 0 }, lesson: o.lesson || null, tour: o.tour || null, onEnd: o.onEnd || null, derby: null, bonusRunner: false, armed: false, hype: 0, shows: o.shows !== false,
    pitchCount: 0, superUsed: [false, false], bannerT: 0, banner: null, lineScoreShown: 0, playId: 0, lastPlay: null, boss: null
  };
  if (park.wind) { const a = R() * TAU, s = R() * 12 * TUNE.wind; M.wind = { x: Math.cos(a) * s, y: Math.sin(a) * s }; }
  for (const t of M.teams) { t.stamina[t.pitcher.id] = 100; for (const b of t.bullpen) t.stamina[b.id] = 100; t.line = []; }
  if (o.setup) o.setup(M);
  emit('matchStart', { M });
  return M;
}
const offense = () => M.teams[M.half], defense = () => M.teams[1 - M.half];
const batterNow = () => offense().lineup[offense().order % 9];
const pStat = p => M.stats[p.id] = M.stats[p.id] || { ab: 0, h: 0, d: 0, tr: 0, hr: 0, rbi: 0, bb: 0, k: 0, sb: 0, pk: 0, ip: 0, pitches: 0, r: 0, longest: 0 };
const isHuman = (s, duty) => { const c = M.teams[s].ctrl; return !!(duty === 'field' || duty === 'run' ? (c.co || c.cap) : c.cap); };
const inputOf = (s, duty) => { const c = M.teams[s].ctrl; return duty === 'field' || duty === 'run' ? (c.co || c.cap) : c.cap; };

/* ---- the count ---- */
function callBall() {
  M.balls++; pStat(defense().pitcher).pitches++;
  if (M.balls >= 4) { emit('call', { kind: 'ball', four: true }); walk(); return 'walk'; }
  emit('call', { kind: 'ball' }); return 'ball';
}
function callStrike(swinging, bunt) {
  M.strikes++;
  if (M.strikes >= 3) { const b = batterNow(); pStat(b).ab++; pStat(b).k++; pStat(defense().pitcher).k = (pStat(defense().pitcher).k || 0) + 1; emit('call', { kind: 'strike', swinging, three: true }); emit('strikeout', { batter: b, swinging, pitcher: defense().pitcher }); meterGain(1 - M.half, 12, 'strikeout'); outMade('k', null); return 'k'; }
  emit('call', { kind: 'strike', swinging }); return 'strike';
}
function callFoul(bunt) {
  if (M.strikes < 2) { M.strikes++; emit('call', { kind: 'foul' }); return 'foul'; }
  if (bunt) return callStrike(true, true);
  emit('call', { kind: 'foul', two: true }); return 'foul';
}
/** a walk (or a hit-by-pitch): the batter takes first, and the force chain pushes runners up */
function walk(hbp) {
  const b = batterNow(); pStat(b).bb++;
  const runOn = [0, 1, 2].map(i => runnerOn(i + 1));
  let push = true; const moves = [];
  for (let i = 0; i < 3 && push; i++) { if (runOn[i]) moves.push(runOn[i]); else push = false; }
  for (let i = moves.length - 1; i >= 0; i--) { const r = moves[i]; if (r.base === 3) scoreRun(r, true); else { r.base++; r.target = r.base; placeRunner(r); } }
  addRunner(b, 1);
  emit(hbp ? 'hbp' : 'walk', { batter: b });
  nextBatter();
}
function runnerOn(base) { return M.runners.find(r => r.base === base && r.state !== 'out' && r.state !== 'scored'); }
function addRunner(p, base) { const r = { p, base, target: base, prog: 0, state: 'onBase', x: 0, y: 0, forced: false, mustTag: false, tagBase: base, lead: 0, turbo: false, slide: 0, rig: null, steal: false, safeT: 0 }; placeRunner(r); M.runners.push(r); return r; }
function placeRunner(r) { const b = basePos(r.base); r.x = b.x; r.y = b.y; r.prog = 0; r.target = r.base; r.state = 'onBase'; }
function nextBatter() { const o = offense(); o.order = (o.order + 1) % 9; M.balls = 0; M.strikes = 0; M.armed = false; emit('batterUp', { batter: batterNow() }); }

/* ---- scoring ---- */
function scoreRun(r, earned) {
  r.state = 'scored'; const o = offense(); o.runs++; o.line[M.inning - 1] = (o.line[M.inning - 1] || 0) + 1; pStat(r.p).r++;
  if (M.play) M.play.runs.push(r); if (M.play && M.play.batter && !M.play.noRbi) pStat(M.play.batter).rbi++; else if (!M.play) pStat(batterNow()).rbi++;
  emit('run', { runner: r.p, team: M.half });
  const lead = M.teams[0].runs - M.teams[1].runs, before = lead + (M.half ? 1 : -1);
  if (M.half === 1 && M.inning >= M.innings && M.teams[1].runs > M.teams[0].runs) M.walkoff = true;
  if (Math.sign(before) !== Math.sign(lead)) emit(lead === 0 ? 'tieGame' : 'leadChange', {});
}
/** an out: how ('k', 'fly', 'force', 'tag', 'cs' ...); r the runner (or null for the batter on a strikeout) */
function outMade(how, r, forceType) {
  M.outs++;
  if (r) r.state = 'out';
  emit('out', { how, runner: r && r.p, outs: M.outs });
  if (M.play) M.play.outs.push({ how, force: !!forceType, r });
  if (M.outs >= 3 && M.play && forceType) {   // the third out a force (or the batter-runner before first): no runs on the play
    for (const s of M.play.runs) { const o = offense(); o.runs--; o.line[M.inning - 1]--; s.state = 'out'; }
    M.play.runs = []; M.walkoff = false;
  }
  if (how === 'k') { nextBatter(); }
}
function meterGain(s, n, why) {
  const t = M.teams[s]; if (!t) return;
  let k = TUNE.meterGain * (t.upg ? 1 + .1 * (t.upg.hype || 0) : 1);
  if (M.comeback && M.teams[1 - s].runs - t.runs >= 3) k *= 1.5;
  const was = t.meter; t.meter = clamp(t.meter + n * k, 0, 100);
  if (M.cheats.infMeter) t.meter = 100;
  if (was < 100 && t.meter >= 100) emit('meterFull', { team: s });
  emit('meter', { team: s, value: t.meter, why });
}

/* ---- half-innings and the end of the game ---- */
function halfOver() {
  const o = offense(); o.line[M.inning - 1] = o.line[M.inning - 1] || 0;
  emit('halfEnd', { inning: M.inning, half: M.half });
  M.runners = []; M.outs = 0; M.balls = 0; M.strikes = 0; M.armed = false;
  if (gameOverCheck(true)) return true;
  if (M.half === 0) M.half = 1; else { M.half = 0; M.inning++; emit('inningEnd', {}); }
  if (M.half === 1 && M.inning >= M.innings && M.teams[1].runs > M.teams[0].runs) return gameOverCheck(true);
  if (M.inning > M.innings) { M.bonusRunner = true; }
  return false;
}
/** the game is over: after the top of the last inning with the home team ahead, after any full last inning not tied,
 *  on a walk-off, or by the mercy rule (10 runs after two full innings) */
function gameOverCheck(atHalfEnd) {
  const [a, h] = [M.teams[0].runs, M.teams[1].runs];
  let over = false;
  if (M.walkoff) over = true;
  else if (atHalfEnd && M.inning >= M.innings) {
    if (M.half === 0 && h > a) over = true;
    if (M.half === 1 && a !== h) over = true;
  }
  if (!over && atHalfEnd && M.mercy && M.innings > 2 && M.inning >= 2 && M.half === 1 && Math.abs(a - h) >= 10) over = true;
  if (!over && M.inning > M.innings + 3 && atHalfEnd && M.half === 1 && a !== h) over = true;
  if (over) { M.over = true; M.winner = a > h ? 0 : 1; emit('gameEnd', { winner: M.winner, walkoff: !!M.walkoff }); }
  return over;
}

/* ===== 11-pitch.js ===== */
/* PITCHING: the catalog (speed factor, break in U at the plate, lateness k, special paths), the parametric flight (the
 * plate crossing is known at release), the windup with the target marker and the release ring, aftertouch, stamina,
 * calls at the zone, the catcher and wild pitches, and the CPU pitcher. */
const PITCHES = {
  heater: { name: 'HEATER', spd: 1, bx: 0, bz: 1.5, k: 1, kind: 'heat', cost: 1.2 },
  curve: { name: 'CURVE', spd: .74, bx: 7, bz: -10, k: 2.2, kind: 'break', cost: 1.6 },
  slider: { name: 'SLIDER', spd: .86, bx: 9, bz: -3, k: 2, kind: 'break', cost: 1.6 },
  changeup: { name: 'CHANGEUP', spd: .66, bx: -3, bz: -6, k: 1.6, kind: 'off', cost: 1 },
  sinker: { name: 'SINKER', spd: .92, bx: -4, bz: -6, k: 1.8, kind: 'off', cost: 1 },
  knuckler: { name: 'KNUCKLER', spd: .6, bx: 0, bz: -3, k: 1.5, kind: 'off', cost: 1, wobble: 2.2 },
  butterfly: { name: 'BUTTERFLY KNUCKLER', spd: .58, bx: 0, bz: -4, k: 1.5, kind: 'sig', cost: 2.2, wobble: 3.6 },
  kernelcannon: { name: 'KERNEL CANNON', spd: 1.15, bx: 0, bz: 2, k: 1, kind: 'sig', cost: 2.2 },
  riptide: { name: 'RIPTIDE CURVE', spd: .78, bx: 6, bz: -8, k: 2, kind: 'sig', cost: 2.2, wave: 4 },
  magmasinker: { name: 'MAGMA SINKER', spd: .9, bx: -2, bz: -10, k: 3, kind: 'sig', cost: 2.2, trail: 'ember' },
  zerog: { name: 'ZERO-G FLOATER', spd: .62, bx: 0, bz: -14, k: 4, kind: 'sig', cost: 2.2 },
  phantomfork: { name: 'PHANTOM FORKBALL', spd: .84, bx: 0, bz: -8, k: 3, kind: 'sig', cost: 2.2, hide: [.35, .8] },
  gigavolt: { name: 'GIGAVOLT HEATER', spd: 1.25, bx: 0, bz: 1, k: 1, kind: 'sig', cost: 2.2, zig: 2, trail: 'spark' },
  // team supers (x1.35 unless stated; the meter pays for them)
  cornpopper: { name: 'CORN POPPER', spd: 1.1, bx: 0, bz: 0, k: 1, kind: 'super', cost: 5, pops: true, trail: 'popcorn' },
  tidalwave: { name: 'TIDAL WAVE', spd: 1.2, bx: 0, bz: 0, k: 1, kind: 'super', cost: 5, tide: 10, trail: 'wave' },
  meteorheater: { name: 'METEOR HEATER', spd: 1.35, bx: 0, bz: 1, k: 1, kind: 'super', cost: 5, trail: 'fire' },
  blackhole: { name: 'BLACK HOLE BALL', spd: 1.15, bx: 0, bz: -3, k: 2, kind: 'super', cost: 5, trail: 'void', pull: true },
  banshee: { name: 'BANSHEE BALL', spd: 1.2, bx: 0, bz: -2, k: 2, kind: 'super', cost: 5, hide: [.08, .85], scream: true },
  overclock: { name: 'OVERCLOCK LASER', spd: 1.5, bx: 0, bz: 0, k: 1, kind: 'super', cost: 5, trail: 'laser', strict: true },
  pitchomatic: { name: 'PITCH-O-MATIC', spd: .8, bx: 0, bz: -1, k: 1.5, kind: 'heat', cost: 0 }
};
const PLATE_Y = HY - 6, BASE_SPEED = 340;
const zoneOf = p => { const k = ((p && p.look && p.look.size) || 1.24) / 1.24; return { x0: -6, x1: 6, z0: 9 * k, z1: 25 * k }; };
const releaseOf = p => ({ x: HX + (p && p.throws === 'L' ? 5 : -5), y: HY - 193, z: 26 });
const pitchesOf = p => (p.look.pitches || ['heater', 'curve', 'changeup', 'heater']);
const stamOf = (s, p) => { const t = M.teams[s]; return t.stamina[p.id] === undefined ? (t.stamina[p.id] = 100) : t.stamina[p.id]; };

/** launch a pitch from the defense's pitcher: type, the aim point (x, z relative to the plate's centre), release
 *  quality q 0..1; o: { cpu, forced } */
function throwPitch(type, aimX, aimZ, q, o = {}) {
  const s = 1 - M.half, D = defense(), pit = D.pitcher, def = PITCHES[type] || PITCHES.heater, st = stamOf(s, pit);
  const fat = st < 15 ? [.85, 2] : st < 40 ? [.92, 1.4] : [1, 1];
  const upg = D.upg ? 1 + .03 * (D.upg.arm || 0) : 1, boss = (M.boss && pit.look.captain && TEAMS[pit.team].boss) ? M.boss.speed : 1;
  const speed = BASE_SPEED * def.spd * (def.kind === 'super' && def.spd === 1 ? 1.35 : 1) * statF(pit.vel) * (1 + .08 * q) * fat[0] * TUNE.pitchSpeed * (o.cpu ? M.diff.pitchMul * (.85 + .15 * TUNE.cpuPitch) : 1) * upg * boss;
  const rel = releaseOf(pit), missR = lerp(5, .5, q) * fat[1] * (1.25 - .05 * pit.ctl) * (M.cheats.allStrikes ? 0 : 1);
  const ma = R() * TAU, mr = Math.sqrt(R()) * missR, side = pit.throws === 'L' ? -1 : 1;
  let cross = { x: HX + aimX + Math.cos(ma) * mr, z: aimZ + Math.sin(ma) * mr };
  if (M.cheats.allStrikes || o.forced) { const Z = zoneOf(batterNow()); cross.x = HX + clamp(cross.x - HX, Z.x0 + 1, Z.x1 - 1); cross.z = clamp(cross.z, Z.z0 + 1, Z.z1 - 1); }
  if (o.forced && o.x !== undefined) cross = { x: HX + o.x, z: o.z };
  const brk = statF(pit.brk) * (1 + .2 * q) * TUNE.pitchBreak, dist = Math.hypot(PLATE_Y - rel.y, cross.x - rel.x, cross.z - rel.z);
  const pseed = R() * 1000;
  M.pitch = { type, def, rel, cross, T: dist / speed, t: 0, q, speed, bx: def.bx * brk * side, bz: def.bz * brk, k: def.k || 1, seed: pseed, sag: 1.5 + 400 / speed,
    after: 0, crossed: false, done: false, cpu: !!o.cpu, by: pit, pops: def.pops ? [0, 1, 2].map(() => (R() - .5) * 6) : null };
  D.stamina[pit.id] = Math.max(0, st - def.cost * TUNE.staminaDrain);
  pStat(pit).pitches++; M.pitchCount++;
  if (def.kind === 'super') { D.meter = M.cheats.infMeter ? 100 : 0; emit('super', { kind: 'pitch', type, team: s }); sfx('charge'); }
  emit('release', { type, speed, q, cpu: !!o.cpu });
  sfx('whoosh', { pitch: speed / 340 });
  return M.pitch;
}
/** where the pitch is at u (0 release, 1 the plate; past 1 it flies on to the catcher) */
function pitchPos(pt, u) {
  const uu = Math.min(u, 1), d = pt.def, k = pt.k;
  let x = lerp(pt.rel.x, pt.cross.x, uu) + pt.bx * (Math.pow(uu, k) - uu);
  let z = lerp(pt.rel.z, pt.cross.z, uu) + 4 * uu * (1 - uu) * pt.sag + pt.bz * (Math.pow(uu, k) - uu);
  const y = lerp(pt.rel.y, PLATE_Y, u);
  const env = Math.sin(Math.PI * uu);
  if (d.wobble) { x += d.wobble * Math.sin(uu * 11 + pt.seed) * env; z += d.wobble * .7 * Math.sin(uu * 13 + pt.seed * 2) * env; }
  if (d.wave) z += d.wave * Math.sin(uu * TAU) * env;
  if (d.zig) x += d.zig * (Math.floor(uu * 14) % 2 ? 1 : -1) * env;
  if (d.tide) z += d.tide * env;
  if (pt.pops) pt.pops.forEach((j, i) => { const at = [.3, .55, .8][i]; if (uu > at) x += j * (1 - uu) / (1 - at); });
  if (u > 1) { const du = u - 1; const p1 = pitchPos(pt, .98), vx = (x - p1.x) / .02, vz = (z - p1.z) / .02; x += vx * du; z = Math.max(1.5, z + vz * du); }
  return { x, y, z };
}
const pitchHidden = (pt, u) => !!(pt.def.hide && u > pt.def.hide[0] && u < pt.def.hide[1]);
function inZone(x, z, p) { const Z = zoneOf(p); const r = 1.6; return x - HX >= Z.x0 - r && x - HX <= Z.x1 + r && z >= Z.z0 - r && z <= Z.z1 + r; }
/** does a pitch crossing at (x, z) hit the batter? */
function hitsBatter(x, z, p) { const box = p.bats === 'L' ? 18 : -18, dx = x - HX; return z > 4 && z < 34 && Math.abs(dx - box) < 7 && Math.sign(dx) === Math.sign(box); }

/* ---- the CPU pitcher: a pitch mix by the count, aim at the edges by level, release quality, aftertouch ---- */
function cpuPitchChoice() {
  const D = defense(), pit = D.pitcher, list = pitchesOf(pit), b = M.balls, s = M.strikes, Z = zoneOf(batterNow());
  if (D.meter >= 100 && s === 2 && !M.cheats.noCpuSuper) return { type: TEAMS[pit.team].superPitch, slot: 4, x: (R() - .5) * 6, z: lerp(Z.z0 + 2, Z.z1 - 2, R()), q: M.diff.relQ };
  const r = R(); let slot;
  if (b >= 3 || b - s >= 2) slot = r < .65 ? 0 : r < .85 ? 2 : 1;
  else if (s === 2) slot = r < .3 ? 1 : r < .55 ? 3 : r < .8 ? 2 : 0;
  else slot = r < .4 ? 0 : r < .62 ? 1 : r < .82 ? 2 : 3;
  const skill = clamp(TUNE.cpuPitch, 0, 2), edge = (.35 + DIFF_ORDER.indexOf(M.diffId) * .15) * skill;
  const wantBall = s === 2 && b < 3 && R() < .35 * skill;
  const ax = (R() < .5 ? -1 : 1) * (wantBall ? 9 : 1 + Math.pow(R(), 1.2 - .3 * edge) * 9.5);
  const az = wantBall ? (R() < .5 ? Z.z0 - 4 : Z.z1 + 3) : R() < .2 + .1 * edge ? (R() < .5 ? Z.z0 - 2.5 : Z.z1 + 2.5) : lerp(Z.z0 + 1, Z.z1 - 1, R());
  return { type: list[slot] || 'heater', slot, x: ax + gauss() * M.diff.aimSd * .4, z: az + gauss() * M.diff.aimSd * .4, q: clamp(M.diff.relQ * (.8 + .2 * skill) + gauss() * .12, 0, 1) };
}

/* ===== 12-bat.js ===== */
/* BATTING: the sweet-spot reticle on the zone plane, swing types (contact, power, Batzooka, bunt), and the contact
 * model: timing error e (+ late) and the reticle's offset from the ball give quality Q, spray angle, launch angle and
 * exit speed. Early pulls, late goes the other way; swinging over the ball drives a grounder, under it lofts a fly. */
const SWINGS = {
  contact: { delay: .10, r: 4.2, ev: 750, loft: 2 },
  power: { delay: .14, r: 2.8, ev: 900, loft: 9 },
  batzooka: { delay: .16, r: 6.3, ev: 780, loft: 0 },
  bunt: { delay: 0, r: 6, ev: 160, loft: 0 }
};
const swingWindow = () => .09 * TUNE.swingTiming * (M.swing && M.swing.human ? M.diff.assist : 1) * (M.lesson && M.lesson.slow ? 1.3 : 1);
/** a swing starts: kind 'contact' | 'power' | 'bunt'; the Batzooka is armed beforehand (M.armed) */
function startSwing(kind, human) {
  if (M.swing || !M.pitch || M.pitch.crossed && kind !== 'bunt') return false;
  const bz = M.armed && kind !== 'bunt';
  M.swing = { kind: bz ? 'batzooka' : kind, at: M.pitch.t, human: !!human, done: false, armedWas: bz, anim: 0 };
  if (bz) { M.armed = false; offense().meter = M.cheats.infMeter ? 100 : 0; emit('super', { kind: 'bat', team: M.half }); }
  emit('swing', { kind: M.swing.kind });
  if (kind !== 'bunt') sfx('whoosh', { pitch: .6 });
  return true;
}
/** resolve a swing when the bat reaches the zone plane: returns 'miss' | 'foul' | 'contact' (and launches the ball) */
function resolveSwing() {
  const sw = M.swing, pt = M.pitch, S = SWINGS[sw.kind], b = batterNow();
  const cr = pitchPos(pt, 1), e = sw.at + S.delay - pt.T, win = swingWindow();
  const assist = sw.human ? M.diff.assist * (game.settings.batAssist === 'big' ? 1.25 : 1) : 1, r = S.r * statF(b.con) * TUNE.sweetSpot * assist * (M.lesson && M.lesson.bigSpot ? 1.4 : 1);
  let rx = M.reticle.x, rz = M.reticle.z;
  if (pt.def.pull && Math.hypot(rx - (cr.x - HX), rz - cr.z) < 10) { rx += clamp(cr.x - HX - rx, -3, 3); rz += clamp(cr.z - rz, -3, 3); }
  const dx = cr.x - HX - rx, dz = cr.z - rz, d = Math.hypot(dx, dz), dn = d / r;
  let te = e;
  const forced = M.force && M.force.contact; if (forced) { M.force.contact = null; if (forced === 'perfect') { te = 0; } }
  const perfect = M.cheats.perfectContact && (sw.human || M.cheats.perfectAll) || forced === 'perfect';
  const eff = perfect ? { e: 0, d: 0, dn: 0 } : { e: te, d, dn };
  M.lastContact = { timingMs: Math.round(eff.e * 1000), dx: +dx.toFixed(1), dz: +dz.toFixed(1), Q: 0, EV: 0, launch: 0, spray: 0, swing: sw.kind };
  if (Math.abs(eff.e) > win || eff.dn > 1.6 || (pt.def.strict && Math.abs(eff.e) > win * .55 && !perfect)) { emit('miss', { e: eff.e, d: eff.d, kind: sw.kind }); return 'miss'; }
  const grade = Math.abs(eff.e) < .022 * TUNE.swingTiming * assist ? 'PERFECT' : Math.abs(eff.e) < .05 * TUNE.swingTiming * assist ? 'GOOD' : 'OK';
  if (eff.dn > 1) {   // a foul tip: back over the screen, or a weak dribbler
    if (R() < .3) launch(cr, 260 + R() * 120, (R() - .5) * 60 * Math.PI / 180 + (eff.e < 0 ? -.3 : .3), -5 * Math.PI / 180, 0, sw.kind, .1, grade);
    else { M.lastContact.Q = .05; emit('foulTip', {}); sfx('foultip'); return 'foul'; }
    return 'contact';
  }
  const timing = 1 - Math.pow(Math.abs(eff.e) / win, 1.5), Q = (1 - Math.min(eff.dn, 1)) * timing;
  const lefty = b.bats === 'L' ? -1 : 1;
  let th = (eff.e / win) * 48 * lefty + (perfect ? 0 : (dx / r) * 10) + (R() - .5) * 8;
  let phi = 12 - (perfect ? -8 : ((rz - cr.z) / r) * 35 * TUNE.launchSpread) + S.loft;
  if (Q < .35 && !perfect) phi = 12 + (phi - 12) * (1 + (.35 - Q) * 5);   // weak contact: topped into the dirt or popped up
  if (sw.kind === 'batzooka') phi = clamp(phi, 28, 38);
  if (perfect && sw.kind !== 'batzooka') phi = clamp(phi, 18, 30);
  const fungo = M.force && M.force.fungo; if (fungo) { M.force.fungo = false; phi = 42; }
  const upg = offense().upg ? 1 + .05 * (offense().upg.lumber || 0) : 1;
  const evMax = sw.kind === 'batzooka' ? S.ev * TUNE.batzookaPower : S.ev;
  const EV = lerp(220, evMax, Math.pow(Q, 1.3)) * statF(b.pow) * (.9 + .1 * pt.speed / BASE_SPEED) * TUNE.exitVelocity * M.park.evMul * upg * (sw.human ? 1 : .96 + .04 * TUNE.cpuBat) * (M.derby ? 1.2 : 1);
  launch(cr, fungo ? Math.min(EV, 640) : EV, th * Math.PI / 180, phi * Math.PI / 180, 3 * eff.e * Math.sign(eff.e || 1) * lefty, sw.kind, Q, grade);
  return 'contact';
}
/** a bunt: the ball meets a squared bat inside its radius; it dribbles where the reticle points */
function resolveBunt() {
  const pt = M.pitch, cr = pitchPos(pt, 1), b = batterNow(), d = Math.hypot(cr.x - HX - M.reticle.x, cr.z - M.reticle.z);
  if (d > SWINGS.bunt.r * TUNE.sweetSpot * statF(b.con)) return 'miss';
  const th = clamp(M.reticle.x / 6, -1, 1) * 40 * Math.PI / 180 + (R() - .5) * .3, phi = (R() * 10 - 4) * Math.PI / 180;
  M.lastContact = { timingMs: 0, dx: 0, dz: 0, Q: .2, EV: 160, launch: Math.round(phi * 57), spray: Math.round(th * 57), swing: 'bunt' };
  launch(cr, 150 + R() * 40, th, phi, 0, 'bunt', .2, 'BUNT');
  return 'contact';
}
function launch(cr, EV, th, phi, spin, kind, Q, grade) {
  const vx = EV * Math.cos(phi) * Math.sin(th), vy = -EV * Math.cos(phi) * Math.cos(th), vz = EV * Math.sin(phi);
  Object.assign(M.lastContact, { Q: +Q.toFixed(2), EV: Math.round(EV), launch: Math.round(phi * 57.3), spray: Math.round(th * 57.3), grade });
  if (M.force && M.force.homer) { M.force.homer = false; const R0 = fenceR(M.park, clamp(th, -.7, .7)); const v = Math.sqrt(R0 * 1.25 * 520 * M.park.gravityMul * TUNE.gravity / Math.sin(2 * .55)) * 1.12; return launch(cr, v, clamp(th, -.6, .6), .55, 0, kind, 1, 'PERFECT'); }
  newBall({ x: cr.x, y: PLATE_Y, z: Math.max(cr.z, 4), vx, vy, vz, spin, mode: 'batted', kind, Q, boost: kind === 'batzooka' ? .5 : 0 });
  emit('contact', { Q, EV, kind, grade, launch: phi, spray: th });
}

/* ---- the CPU batter: reads the pitch with an aim error, decides to swing from P(in zone) and its discipline ---- */
function cpuBatPlan() {
  const pt = M.pitch, cr = pitchPos(pt, 1), b = batterNow(), D = M.diff, skill = clamp(TUNE.cpuBat, 0, 2);
  const err = D.aimSd * (1.6 - .6 * skill), px = cr.x - HX + gauss() * err * .75, pz = cr.z + gauss() * err * .75, zone = inZone(cr.x, cr.z, b);
  const disc = D.disc * (.7 + .3 * skill) * (pt.def.kind === 'super' ? .7 : 1);
  let swing = zone ? R() < .82 - .15 * (M.balls - M.strikes < 0 ? 0 : 0) + (M.strikes === 2 ? .12 : 0) : R() > disc + (M.strikes === 2 ? -.15 : 0);
  if (M.cheats.cpuNoSwing) swing = false;
  const hitterCount = (M.balls === 2 && M.strikes === 0) || (M.balls === 3 && M.strikes === 1);
  let kind = hitterCount || (b.pow >= 8 && R() < .35) ? 'power' : 'contact';
  const T = offense(); if (T.meter >= 100 && !M.cheats.noCpuSuper && (M.runners.length || M.inning >= M.innings)) { M.armed = true; kind = 'contact'; }
  if (M.runners.some(r => r.base === 1) && M.outs === 0 && b.pow <= 5 && R() < .2 && zone) kind = 'bunt';
  const sd = D.swingSd * (1.5 - .5 * skill) * (pt.def.wobble ? 1.4 : 1) * (pitchHidden(pt, .6) ? 1.3 : 1);
  return { swing, kind, at: pt.T - SWINGS[kind === 'bunt' ? 'contact' : (M.armed ? 'batzooka' : kind)].delay + gauss() * sd, aim: [clamp(px, -12, 12), clamp(pz, 0, 40)], react: D.react * .6 };
}

/* ===== 13-ball.js ===== */
/* BALL PHYSICS at 120 Hz: gravity, drag, sidespin, wind above 60 U; bounces and rolling by surface; the fence (home run,
 * ground-rule double, a bounce off it), the poles, the foul walls and backstop; fair or foul; and prediction (the same
 * integrator forward, no randomness) for the fielders, the landing marker and the cameras. */
function newBall(o) {
  const b = Object.assign({ x: HX, y: PLATE_Y, z: 10, vx: 0, vy: 0, vz: 0, spin: 0, mode: 'batted', bounced: false, touched: false, fair: null, rolling: false, dead: false, holder: null, kind: 'contact', Q: 0, boost: 0, apex: 0, trail: [], t: 0, overFence: false, inStands: false, hidden: false }, o);
  M.ball = b; M.play = { batter: batterNow(), runs: [], outs: [], contact: true, kind: b.kind, Q: b.Q, firstFielder: null, caughtFly: false, hit: null, t: 0, id: ++M.playId, maxR: 0 };
  b.pred = predict(b, 8);
  return b;
}
const surfaceAt = (x, y) => { const r = rOf(x, y), th = thetaOf(x, y), R0 = fenceR(M.park, clamp(th, -D45, D45)); if (Math.abs(th) <= D45 && r > R0 - 48) return 'track'; if (r < 470 && Math.abs(th) < .87 && !(Math.abs(x - HX) + Math.abs(y - HY + 212) < 190)) return 'dirt'; return 'grass'; };
const REST = { grass: .42, dirt: .5, track: .45 }, SLIDE = { grass: .82, dirt: .9, track: .86 }, ROLL = { grass: 260, dirt: 180, track: 220 };
/** one physics step of a free ball b (dt seconds). sim: a prediction (no events). Returns an event name or null */
function ballStep(b, dt, sim) {
  const g = 520 * M.park.gravityMul * TUNE.gravity, sp = Math.hypot(b.vx, b.vy, b.vz);
  if (!b.rolling) {
    let ax = -TUNE.drag * b.vx, ay = -TUNE.drag * b.vy, az = -g - TUNE.drag * b.vz;
    if (b.spin && sp > 50) { const h = Math.hypot(b.vx, b.vy) || 1; ax += -b.vy / h * b.spin * sp * .004 * 60; ay += b.vx / h * b.spin * sp * .004 * 60; }
    const we = clamp((b.z - 60) / 100, 0, 1) * TUNE.wind; ax += M.wind.x * we * 2; ay += M.wind.y * we * 2;
    if (b.boost > 0) { const k = 900 * dt / (sp || 1); b.vx += b.vx * k; b.vy += b.vy * k; b.vz += b.vz * k * .3; b.boost -= dt; }
    b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.t += dt;
  if (b.z > b.apex) b.apex = b.z;
  const r = rOf(b.x, b.y), th = thetaOf(b.x, b.y), fairNow = Math.abs(th) <= D45 + .002;
  // the fence: home run, ground-rule double, or a bounce off it
  if (fairNow && b.fair !== false) {
    const R0 = fenceR(M.park, clamp(th, -D45, D45)), Hf = fenceH(M.park, th);
    if (r > R0 - 1.6) {
      if (b.z >= Hf) { if (!b.bounced && !b.touched) return 'homer'; return 'grd'; }
      const ux = (b.x - HX) / r, uy = (b.y - HY) / r, vr = b.vx * ux + b.vy * uy;
      if (vr > 0) { const tx = b.vx - vr * ux, ty = b.vy - vr * uy; b.vx = tx * .8 - vr * .35 * ux; b.vy = ty * .8 - vr * .35 * uy; b.x = HX + ux * (R0 - 2); b.y = HY + uy * (R0 - 2); b.fair = true; if (!sim) return 'fence'; }
    }
  }
  // the poles: within 3 U of a pole below 150 U is a home run
  for (const s of [-1, 1]) { const R0 = fenceR(M.park, s * D45), px0 = HX + Math.sin(s * D45) * R0, py0 = HY - Math.cos(s * D45) * R0; if (!b.bounced && b.z < 150 && Math.hypot(b.x - px0, b.y - py0) < 3) return 'pole'; }
  // out of play in foul territory: past the foul walls (70 U outside the lines), the backstop, or the stands
  if (!fairNow) {
    const pOut = b.x < HX ? Math.abs((b.x - HX) - (b.y - HY)) / Math.SQRT2 : Math.abs((b.x - HX) + (b.y - HY)) / Math.SQRT2, along = b.x < HX ? (-(b.x - HX) - (b.y - HY)) / Math.SQRT2 : ((b.x - HX) - (b.y - HY)) / Math.SQRT2;
    if ((along >= 80 && pOut > 70) || (along < 80 && r > 110) || (r > fenceR(M.park, Math.sign(th) * D45) + 10)) { if (b.z < 120 || !b.bounced) return b.fair === true && b.bounced ? 'grd' : 'outFoul'; }
  }
  // the ground
  if (b.z <= 0) {
    b.z = 0;
    if (!b.bounced) { b.bounced = true; b.firstLand = { x: b.x, y: b.y, t: b.t }; if (b.fair === null && r > 300) b.fair = fairNow; }
    const surf = surfaceAt(b.x, b.y);
    if (!b.rolling) {
      if (Math.abs(b.vz) < 25) { b.rolling = true; b.vz = 0; }
      else { b.vz = -b.vz * REST[surf] * TUNE.bounce * (M.park.id === 'megadome' ? 1.1 : 1); b.vx *= SLIDE[surf]; b.vy *= SLIDE[surf]; if (!sim) { emit('bounce', { x: b.x, y: b.y, v: Math.abs(b.vz) }); } }
    }
    if (b.rolling) { const h = Math.hypot(b.vx, b.vy); if (h > 0) { const nh = Math.max(0, h - ROLL[surf] * TUNE.rollFriction * dt); b.vx *= nh / h; b.vy *= nh / h; } if (h < 1) { b.vx = b.vy = 0; b.stopped = true; } }
  }
  // fair or foul past the bags (r 300) on the ground, or where it stops
  if (b.fair === null && b.bounced && (r > 300 || b.stopped)) b.fair = fairNow;
  return null;
}
/** forward simulation: samples every 1/30 s with { t, x, y, z, vz }, the first landing point and time */
function predict(b, secs) {
  const c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, spin: b.spin, boost: b.boost, bounced: b.bounced, rolling: b.rolling, fair: b.fair, touched: b.touched, apex: b.z, t: 0, stopped: false };
  const out = { samples: [], land: null, end: null, homer: false }, dt = 1 / 120;
  for (let i = 0; i < secs * 120; i++) {
    const ev = ballStep(c, dt, true);
    if (i % 4 === 0) out.samples.push({ t: c.t, x: c.x, y: c.y, z: c.z, vz: c.vz });
    if (!out.land && c.bounced) out.land = { x: c.x, y: c.y, t: c.t };
    if (ev === 'homer' || ev === 'pole') { out.homer = true; out.end = { x: c.x, y: c.y, t: c.t }; break; }
    if (ev === 'grd' || ev === 'outFoul') { out.end = { x: c.x, y: c.y, t: c.t, ev }; break; }
    if (c.stopped) { out.end = { x: c.x, y: c.y, t: c.t }; break; }
  }
  if (!out.land) out.land = out.end || { x: c.x, y: c.y, t: c.t };
  out.apex = c.apex;
  return out;
}
/** a home run's carry: the same flight with no fence in the way, to the ground (feet from home plate) */
function carryFeet(b) {
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz; const g = 520 * M.park.gravityMul * TUNE.gravity, dt = 1 / 60;
  for (let i = 0; i < 1200 && z > 0; i++) { vx -= TUNE.drag * vx * dt; vy -= TUNE.drag * vy * dt; vz -= (g + TUNE.drag * vz) * dt; x += vx * dt; y += vy * dt; z += vz * dt; }
  return feet(rOf(x, y));
}
/** the drawn height in the Broadcast Cam: true below 40 U, squashed above (so high flies stay near their shadows) */
const drawZ = z => z < 40 ? z : 40 + (z - 40) * TUNE.heightSquash;

/* ===== 14-play.js ===== */
/* THE PLAY AFTER CONTACT: fielders (assignment by intercept time, covers by role, chase, catch, dive, jump, wall climb,
 * throws, relays, force and tag outs) and baserunners (forces, halfway on flies, tag-ups, extra bases by a time race,
 * orders from a human, steals, slides, the bowl-over), and when a play is over. */
const FSPEED = 132, RSPEED = 120, THROW = 600;
const fSpeed = F => FSPEED * statF(F.p.spd) * TUNE.fielderSpeed * (defense().upg ? 1 + .04 * (defense().upg.cleats || 0) : 1) * (F.turbo ? 1.35 * TUNE.turboPower : 1) * (F.human ? 1 : .9 + .1 * TUNE.cpuField);
const rSpeed = r => RSPEED * statF(r.p.spd) * TUNE.runSpeed * (offense().upg ? 1 + .04 * (offense().upg.cleats || 0) : 1) * (r.turbo ? 1.35 * TUNE.turboPower : 1) * (r.burner > 0 ? 1.8 : 1) * (r.human ? 1 : .92 + .08 * TUNE.cpuRun);
const tSpeed = F => THROW * statF(F.p.arm) * TUNE.throwSpeed * (defense().upg ? 1 + .05 * (defense().upg.arm || 0) : 1);
const catchR = F => 9 * statF(F.p.glv) * TUNE.catchRadius * (defense().upg ? 1 + (defense().upg.glove || 0) / 9 : 1);

/** the nine fielders at their spots for the coming pitch */
function setFielders() {
  const D = defense(), dp = M.park.ofDepth;
  const byPos = {}; for (const p of D.def.roster) if (p.pos !== 'RP') byPos[p.pos] = p;
  byPos.P = D.pitcher;
  M.fielders = POS_ORDER.map(pos => {
    const [ox, oy] = POS_SPOTS[pos], deep = ['LF', 'CF', 'RF'].includes(pos) ? dp : 0, d = Math.hypot(ox, oy) || 1;
    const x = HX + ox + (deep ? ox / d * deep : 0), y = HY + oy + (deep ? oy / d * deep : 0);
    const old = M.fielders.find(f => f.pos === pos && f.p === byPos[pos]);
    const F = old || { p: byPos[pos], pos, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, hasBall: false, job: 'idle', rig: null, stun: 0, dive: 0, vz: 0, climb: 0, turbo: false };
    Object.assign(F, { x, y, z: 0, homeX: x, homeY: y, job: 'idle', hasBall: false, tx: x, ty: y, base: 0, stun: 0, dive: 0, climb: 0, vz: 0, react: 0, hold: 0, human: false, cooldown: 0, facing: pos === 'C' ? -Math.PI / 2 : Math.PI / 2 });
    if (!HEADLESS || BZ.cosmetic) F.rig = makeRig(F.p, pos === 'C' ? 'catch' : 'field');
    return F;
  });
}
const fielder = pos => M.fielders.find(f => f.pos === pos);
const holderF = () => M.fielders.find(f => f.hasBall);

/* ---- assignment at contact ---- */
function interceptOf(F, pred, react) {
  const sp = fSpeed(F);
  for (const s of pred.samples) {
    if (s.z > 34 && !(s.z < 70 && F.pos !== 'C')) continue;
    if (s.z > 34) continue;
    const r = rOf(s.x, s.y), th = thetaOf(s.x, s.y);
    if (Math.abs(th) <= D45 && r > fenceR(M.park, th) - 4) continue;
    const ft = react + Math.hypot(s.x - F.x, s.y - F.y) / sp;
    if (ft <= s.t + .02) return { t: s.t, x: s.x, y: s.y };
  }
  const e = pred.end || pred.land; return { t: react + Math.hypot(e.x - F.x, e.y - F.y) / sp + 5, x: e.x, y: e.y };
}
function assignFielders(keepChaser) {
  if (!M.fielders.length) setFielders();
  const b = M.ball, pred = b.pred = predict(b, 6), react = M.diff.react / Math.max(.3, TUNE.cpuField);
  let best = null;
  for (const F of M.fielders) {
    if (F.pos === 'C' && rOf(pred.land.x, pred.land.y) > 120) continue;
    if (F.pos === 'P' && rOf(pred.land.x, pred.land.y) > 380 && b.z < 1) continue;
    const it = interceptOf(F, pred, F.human ? 0 : react);
    F.it = it; if (!best || it.t < best.it.t) best = F;
  }
  const th = thetaOf(pred.land.x, pred.land.y), deep = rOf(pred.land.x, pred.land.y) > 520;
  if (!best) best = nearestTo(pred.land.x, pred.land.y, null);
  const chaser = keepChaser && M.fielders.find(f => f.job === 'chase') || best;
  for (const F of M.fielders) { if (F.job !== 'chase' || F !== chaser) F.job = 'idle'; F.base = 0; }
  chaser.job = 'chase'; chaser.react = chaser.human ? 0 : react;
  const cover = (pos, base) => { const F = fielder(pos); if (F && F !== chaser) { F.job = 'cover'; F.base = base; } };
  cover('C', 4); cover('3B', 3); cover('1B', 1);
  if (chaser.pos === '1B') cover('P', 1);
  if (th < 0) { cover('2B', 2); if (chaser.pos === '3B') cover('SS', 3); else if (deep) { const F = fielder('SS'); if (F && F !== chaser) { F.job = 'cutoff'; } } }
  else { cover('SS', 2); if (deep) { const F = fielder('2B'); if (F && F !== chaser) F.job = 'cutoff'; } }
  if (chaser.pos === '2B' || chaser.pos === 'SS') cover(chaser.pos === '2B' ? 'SS' : '2B', 2);
  if (chaser.pos === '3B') cover('SS', 3);
  if (chaser.pos === 'C') cover('P', 4);
  for (const F of M.fielders) if (F.job === 'idle' && ['LF', 'CF', 'RF'].includes(F.pos)) F.job = 'backup';
  emit('chaser', { pos: chaser.pos });
  return chaser;
}

/* ---- the defense's human: who they control, and switching (L1) ---- */
function defHumanInput() { return inputOf(1 - M.half, 'field'); }
function pickControlled() {
  const I = defHumanInput(); for (const F of M.fielders) F.human = false;
  if (!I || M.cheats.autoplay) return null;
  const h = holderF(); const c = h || M.fielders.find(f => f.job === 'chase') || null;
  if (c) c.human = true; return c;
}

/* ---- each step of the defense ---- */
function fieldersStep(dt) {
  const b = M.ball, I = defHumanInput(), setting = game.settings.fielding || 'assisted';
  for (const F of M.fielders) {
    F.cooldown = Math.max(0, F.cooldown - dt); F.stun = Math.max(0, F.stun - dt); F.react = Math.max(0, F.react - dt);
    let tx = F.homeX, ty = F.homeY, run = 0, manual = false;
    if (F.human && I && setting !== 'auto' && !M.cheats.autoplay) {
      const mv = I.move(); F.turbo = I.down('l2') && turboUse(1 - M.half, dt);
      if (Math.hypot(mv[0], mv[1]) > .2 || setting === 'manual') { manual = true; const sp = fSpeed(F); F.vx = mv[0] * sp; F.vy = mv[1] * sp; }
    } else F.turbo = false;
    if (F.hasBall) {
      if (!manual) { F.vx = approach(F.vx, 0, 600 * dt); F.vy = approach(F.vy, 0, 600 * dt); if (F.runTo) { tx = F.runTo.x; ty = F.runTo.y; run = 1; } else { tx = F.x; ty = F.y; } }
    } else if (F.job === 'chase' && b && b.mode !== 'held' && b.mode !== 'dead') {
      if (F.react <= 0) { const it = F.it || { x: b.x, y: b.y }; tx = it.x; ty = it.y; run = 1; if (Math.hypot(b.x - F.x, b.y - F.y) < 40 && b.z < 40) { tx = b.x; ty = b.y; } }
      else { tx = F.x; ty = F.y; }
    } else if (F.job === 'cover') { const bp = basePos(F.base), off = F.base === 1 ? [-6, 0] : F.base === 3 ? [6, 0] : F.base === 4 ? [0, 8] : [0, 6]; tx = bp.x + off[0]; ty = bp.y + off[1]; run = 1; }
    else if (F.job === 'cutoff') { const ch = M.fielders.find(f => f.job === 'chase') || F; const tb = basePos(2); tx = lerp(ch.x, tb.x, .5); ty = lerp(ch.y, tb.y, .5); run = 1; }
    else if (F.job === 'backup' && b) { tx = lerp(F.homeX, b.x, .4); ty = lerp(F.homeY, b.y, .4); run = 1; }
    else if (F.job === 'tag' && F.tagRunner) { tx = F.tagRunner.x; ty = F.tagRunner.y; run = 1; }
    if (!manual) {
      if (F.stun > 0 || F.dive > 0) { /* sliding */ } else {
        const dx = tx - F.x, dy = ty - F.y, d = Math.hypot(dx, dy), sp = run ? fSpeed(F) : fSpeed(F) * .6;
        if (d > 2) { const v = Math.min(sp, d / dt); F.vx = approach(F.vx, dx / d * v, 1200 * dt); F.vy = approach(F.vy, dy / d * v, 1200 * dt); } else { F.vx = approach(F.vx, 0, 900 * dt); F.vy = approach(F.vy, 0, 900 * dt); }
      }
    }
    if (F.dive > 0) { F.dive -= dt; F.vx *= Math.exp(-dt * 3); F.vy *= Math.exp(-dt * 3); }
    F.x += F.vx * dt; F.y += F.vy * dt;
    // fielders stay inside the fence
    const th = thetaOf(F.x, F.y), r = rOf(F.x, F.y);
    if (Math.abs(th) <= D45 && !M.cheats.noclip) { const R0 = fenceR(M.park, th) - 6; if (r > R0) { F.x = HX + (F.x - HX) / r * R0; F.y = HY + (F.y - HY) / r * R0; } }
    // jumping and the wall climb
    if (F.vz || F.z > 0) { F.vz -= 700 * M.park.gravityMul * dt; F.z += F.vz * dt; if (F.z <= 0) { F.z = 0; F.vz = 0; F.climb = 0; } }
    if (Math.hypot(F.vx, F.vy) > 8) F.facing = Math.atan2(F.vy, F.vx);
    else if (b) F.facing = E.approachAng(F.facing, Math.atan2(b.y - F.y, b.x - F.x), dt * 6);
    // a human's athletic moves: dive (R2), jump or wall climb (R1)
    if (F.human && I && !F.hasBall && F.stun <= 0) {
      if (I.pressed('r2') && F.dive <= 0 && F.z === 0) { F.dive = .55; const a = F.facing; F.vx = Math.cos(a) * 190; F.vy = Math.sin(a) * 190; emit('dive', { pos: F.pos }); sfx('slide'); }
      if (I.pressed('r1') && F.z === 0) jumpOrClimb(F);
    }
    // CPU athletics: dive for a ball just out of reach, climb for a ball heading over the wall
    if (!F.human && F.job === 'chase' && b && b.mode === 'batted' && !b.bounced && F.z === 0 && F.dive <= 0) {
      const d = Math.hypot(b.x - F.x, b.y - F.y), cr = catchR(F);
      if (b.z < 30 && b.vz < 0 && d > cr && d < cr + 26 && b.z > 3 && R() < .5 * TUNE.cpuField) { const a = Math.atan2(b.y - F.y, b.x - F.x); F.dive = .55; F.vx = Math.cos(a) * 190; F.vy = Math.sin(a) * 190; emit('dive', { pos: F.pos }); }
      const thb = thetaOf(b.x, b.y), Rb = fenceR(M.park, clamp(thb, -D45, D45));
      if (Math.abs(thb) < D45 && rOf(F.x, F.y) > Rb - 30 && d < 40 && b.z > 30 && b.z < fenceH(M.park, thb) + 40 && rOf(b.x, b.y) > Rb - 50 && R() < .25 * TUNE.cpuField) jumpOrClimb(F);
    }
    if (b && !F.hasBall && F.stun <= 0 && (F.job === 'chase' || Math.hypot(b.x - F.x, b.y - F.y) < 14 || F.job === 'cover' || F.human)) tryCatch(F, b);
  }
}
function jumpOrClimb(F) {
  const th = thetaOf(F.x, F.y), R0 = fenceR(M.park, clamp(th, -D45, D45));
  if (Math.abs(th) <= D45 && rOf(F.x, F.y) > R0 - 24) { F.climb = 1; F.vz = 330 * (M.park.jumpMul > 1 ? 1.5 : 1) + (M.park.id === 'boneyard' && F.p.team === 'HMH' ? 60 : 0); emit('climb', { pos: F.pos }); sfx('slide', { pitch: 1.6 }); }
  else { F.vz = 260 * M.park.jumpMul; emit('jump', { pos: F.pos }); }
}
/** reach: the glove's height range, bigger in a jump, a climb or a dive */
function tryCatch(F, b) {
  if (b.mode === 'held' || b.mode === 'dead' || F.cooldown > 0) return;
  if (b.mode === 'thrown' && b.to !== F && Math.hypot(b.x - F.x, b.y - F.y) > 10) return;
  const d = Math.hypot(b.x - F.x, b.y - F.y), cr = catchR(F) * (F.dive > 0 ? 1.6 : 1), zTop = F.z + (F.climb ? 40 : F.z > 0 ? 36 : 34);
  if (d > cr || b.z > zTop || b.z < F.z - 4) return;
  if (b.mode === 'thrown') { if (b.t < b.T * .7 && b.to === F) return; return receive(F, b); }
  const air = !b.bounced && !b.touched, fast = Math.hypot(b.vx, b.vy, b.vz);
  let p = clamp(.985 + .006 * (F.p.glv - 5) - (fast > 600 ? .05 + (fast - 600) / 4000 : 0) - (F.dive > 0 ? .08 : 0) - (F.human ? 0 : .02 * (1 - TUNE.cpuField)) + (defense().upg ? .02 * (defense().upg.glove || 0) : 0), .5, .995);
  if (!air) p = Math.min(.995, p + .005);
  if (M.cheats.noErrors) p = 1;
  if (R() > p) { // an error: the ball pops loose
    b.touched = true; b.vz = 80; const a = R() * TAU; b.vx = Math.cos(a) * 60; b.vy = Math.sin(a) * 60; b.z = Math.max(b.z, 4); b.rolling = false; b.bounced = true;
    F.stun = .6; F.cooldown = .5; defense().errors++; if (M.play) M.play.error = true; emit('error', { pos: F.pos, x: F.x, y: F.y }); sfx('clang');
    if (b.fair === null) b.fair = Math.abs(thetaOf(b.x, b.y)) <= D45;
    return;
  }
  if (b.fair === null) b.fair = Math.abs(thetaOf(b.x, b.y)) <= D45;
  const wasFair = b.fair;
  holdBall(F, b);
  if (M.play && !M.play.firstFielder) M.play.firstFielder = F.pos;
  if (air && M.play) {
    M.play.caughtFly = true; emit('catch', { fly: true, dive: F.dive > 0, wall: F.climb > 0, pos: F.pos, robbed: F.climb > 0 && F.z > fenceH(M.park, thetaOf(F.x, F.y)) - 10, foul: !wasFair });
    sfx('glove'); flyCaught(F);
  } else { emit('fielded', { pos: F.pos }); sfx('glove'); if (!wasFair && M.play) { M.ball.foulDead = true; } }
}
function holdBall(F, b) {
  for (const f of M.fielders) f.hasBall = false;
  F.hasBall = true; b.mode = 'held'; b.holder = F; b.vx = b.vy = b.vz = 0; F.hold = 0; F.thinking = .06 + (F.human ? 0 : M.diff.react * .3); F.job = 'hold'; F.runTo = null; F.tagRunner = null;
  if (M.fielders.some(f => f.human)) pickControlled();
}
function receive(F, b) {
  const ok = M.cheats.noErrors || R() < .985 + .004 * (F.p.glv - 5);
  if (!ok) { b.mode = 'batted'; b.touched = true; b.bounced = true; b.vx = (R() - .5) * 120; b.vy = (R() - .5) * 120; b.vz = 40; defense().errors++; if (M.play) M.play.error = true; emit('error', { pos: F.pos, x: F.x, y: F.y }); F.stun = .4; F.cooldown = .4; assignFielders(); return; }
  holdBall(F, b); sfx('mitt'); emit('received', { pos: F.pos });
  outsAtBase(F);
}
/** the fielder with the ball at a base: force outs; and tags on runners within reach */
function outsAtBase(F) {
  for (let base = 1; base <= 4; base++) {
    const bp = basePos(base); if (Math.hypot(F.x - bp.x, F.y - bp.y) > 10) continue;
    for (const r of M.runners) {
      if (r.state === 'out' || r.state === 'scored') continue;
      const forcedHere = (r.forced && r.target === base && r.state === 'running') || (r.mustTag && r.tagBase === base && !r.tagged && r.state !== 'onBase');
      if (forcedHere) { const tgt = r.mustTag ? 'doubled' : 'force'; runnerOut(r, tgt, true); }
    }
  }
}
function tagCheck(F) {
  for (const r of M.runners) {
    if (r.state !== 'running' && r.state !== 'returning') continue;
    if (Math.hypot(r.x - F.x, r.y - F.y) < 10 && !onABase(r)) runnerOut(r, 'tag', r.forced && r.p === M.play?.batter && r.base === 0);
  }
}
const onABase = r => { for (let b = 1; b <= 4; b++) { const bp = basePos(b); if (Math.hypot(r.x - bp.x, r.y - bp.y) < 5) return true; } return false; };
function runnerOut(r, how, force) {
  if (r.state === 'out') return;
  const batterBefore1st = M.play && r.p === M.play.batter && r.base === 0;
  outMade(how, r, force || batterBefore1st);
  emit(how === 'tag' ? 'tagOut' : 'forceOut', { runner: r.p, base: r.target });
  if (M.play) { M.play.outCount = (M.play.outCount || 0) + 1; if (M.play.outCount === 2) emit('doublePlay', {}); if (M.play.outCount === 3) emit('triplePlay', {}); }
  sfx('ump');
}
function flyCaught(F) {
  const bat = M.runners.find(r => M.play && r.p === M.play.batter && r.state !== 'out');
  if (bat) { bat.forced = false; runnerOut(bat, 'fly', false); }
  else outMade('fly', null, false);
  for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored' && r !== bat) { r.mustTag = true; r.forced = false; if (r.base !== r.tagBase || r.prog > 0) { r.order = null; sendBack(r); } else { r.tagged = true; r.state = 'onBase'; } }
  meterGain(1 - M.half, F.dive > 0 || F.climb > 0 ? 20 : 3, 'catch');
}

/* ---- throws ---- */
function throwTo(F, base, o = {}) {
  const b = M.ball, bp = basePos(base), recv = coverAt(base) || nearestTo(bp.x, bp.y, F);
  const laser = !!o.laser, sp = laser ? 1400 : tSpeed(F) * (o.power === undefined ? 1 : .85 + .35 * o.power);
  let tx = bp.x, ty = bp.y; const wildP = laser ? 0 : (o.power > .85 ? (o.power - .85) * .8 : 0) + (F.human ? 0 : .01 * (1.2 - TUNE.cpuField));
  if (R() < wildP && !M.cheats.noErrors) { const a = R() * TAU, m = 30 + R() * 30; tx += Math.cos(a) * m; ty += Math.sin(a) * m; o.wild = true; }
  const d = Math.hypot(tx - F.x, ty - F.y), T = Math.max(.12, d / sp);
  F.hasBall = false; F.cooldown = .4; F.throwAnim = .35; F.job = 'idle';
  Object.assign(b, { mode: 'thrown', from: { x: F.x, y: F.y, z: 22 }, toPt: { x: tx, y: ty, z: 20 }, T, t: 0, to: recv, holder: null, laser, x: F.x, y: F.y, z: 22, apexT: laser ? 2 : clamp(d / 40, 6, 40) });
  if (recv && recv !== F) { recv.job = 'cover'; recv.base = base; }
  emit('throw', { base, laser, wild: !!o.wild, from: F.pos }); sfx(laser ? 'laser' : 'whoosh', { pitch: 1.3 });
}
const coverAt = base => M.fielders.find(f => f.job === 'cover' && f.base === base && !f.hasBall);
const nearestTo = (x, y, not) => M.fielders.filter(f => f !== not).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
function thrownStep(b, dt) {
  b.t += dt; const u = Math.min(1, b.t / b.T);
  b.x = lerp(b.from.x, b.toPt.x, u); b.y = lerp(b.from.y, b.toPt.y, u); b.z = lerp(b.from.z, b.toPt.z, u) + 4 * u * (1 - u) * b.apexT;
  b.vx = (b.toPt.x - b.from.x) / b.T; b.vy = (b.toPt.y - b.from.y) / b.T; b.vz = 0;
  if (u >= 1) { // nobody took it: it drops and rolls on
    const recv = b.to; if (recv && Math.hypot(recv.x - b.x, recv.y - b.y) < catchR(recv) + 6 && !recv.hasBall) return receive(recv, b);
    b.mode = 'batted'; b.bounced = true; b.touched = true; b.vz = 30; b.vx *= .3; b.vy *= .3; b.rolling = false; b.fair = true; assignFielders();
  }
}
/** the CPU's (and the assisted human's) choice of throw: the lead runner it can get, else hold the runners */
function decideThrow(F) {
  const opts = [];
  for (const r of M.runners) {
    if (r.state !== 'running' && r.state !== 'returning') continue;
    const tb = r.state === 'returning' ? r.tagBase : r.target, bp = basePos(tb), rt = runnerTimeLeft(r);
    const nearBase = Math.hypot(F.x - bp.x, F.y - bp.y) < 8;
    const tt = nearBase ? 0 : .22 + Math.hypot(F.x - bp.x, F.y - bp.y) / tSpeed(F);
    const forced = (r.forced && r.state === 'running') || (r.mustTag && r.state === 'returning');
    const need = forced ? 0 : .35;   // a tag needs the ball there a bit sooner
    if (tt + need < rt) opts.push({ base: tb, score: tb * 10 + (forced ? 5 : 0) - tt, r, nearBase });
  }
  opts.sort((a, b) => b.score - a.score);
  if (opts.length) return opts[0];
  const lead = M.runners.filter(r => r.state === 'running').sort((a, b) => b.target - a.target)[0];
  if (lead && rOf(F.x, F.y) > 470) return { base: Math.min(4, lead.target + (lead.prog > .6 ? 1 : 0)), hold: true };
  if (rOf(F.x, F.y) > 470) return { base: 2, hold: true };
  return null;
}
function holderStep(F, dt) {
  const b = M.ball; b.x = F.x + Math.cos(F.facing) * 4; b.y = F.y + Math.sin(F.facing) * 4; b.z = F.z + 16;
  F.hold += dt; F.thinking -= dt;
  outsAtBase(F); tagCheck(F);
  const I = F.human ? defHumanInput() : null;
  if (I) {
    const base = basePressed(I), laser = I.down('r1') && defense().meter >= 50;
    if (base) { if (laser) { defense().meter -= M.cheats.infMeter ? 0 : 50; emit('super', { kind: 'laser', team: 1 - M.half }); } throwTo(F, base, { laser, power: .7 }); return; }
    const mb = mouseBase(I); if (mb) { throwTo(F, mb, { power: .7 }); return; }
    if ((game.settings.fielding || 'assisted') === 'manual' || F.hold < 1.6) return;
  }
  if (F.thinking > 0) return;
  const choice = decideThrow(F);
  if (!choice) { F.runTo = null; return; }
  if (choice.nearBase) { const bp = basePos(choice.base); F.runTo = { x: bp.x, y: bp.y }; return; }
  // close enough to run it there itself (a tag or a force on the bag)
  const bp = basePos(choice.base);
  if (Math.hypot(F.x - bp.x, F.y - bp.y) < 30 && !choice.hold) { F.runTo = { x: bp.x, y: bp.y }; return; }
  if (choice.hold && F.hold < .5) return;
  if (choice.hold && rOf(F.x, F.y) < 470) return;
  throwTo(F, choice.base, { power: .75 });
}
/** the mouse: a click on a base in the field throws there (only on a base: a stray click never throws) */
function mouseBase(I) {
  if (I !== game.input || !BZ.mouseWorld) return 0;
  const c = I.clicked && I.clicked(); if (!c) return 0;
  const w = BZ.mouseWorld(c[0], c[1]); if (!w) return 0;
  for (let k = 1; k <= 4; k++) { const bp = basePos(k); if (Math.hypot(w[0] - bp.x, w[1] - bp.y) < 30) return k; }
  return 0;
}

/* ---- baserunners ---- */
function runnerTimeLeft(r) {
  const tb = r.state === 'returning' ? r.tagBase : r.target, bp = basePos(tb);
  return Math.hypot(bp.x - r.x, bp.y - r.y) / rSpeed(r);
}
function sendBack(r) { r.state = 'returning'; r.from = r.base; }
function startRunners() {
  const bat = batterNow();
  for (const r of M.runners) { r.tagBase = r.base; r.mustTag = false; r.tagged = false; r.order = null; r.halfway = false; r.startBase = r.base; }
  const occ = [1, 2, 3].map(k => !!runnerOn(k));
  const br = addRunner(bat, 0); br.target = 1; br.state = 'running'; br.forced = true; br.delay = .35; br.startBase = 0; br.tagBase = 0;
  for (const r of M.runners) if (r !== br) r.forced = r.base === 1 || (r.base === 2 && occ[0]) || (r.base === 3 && occ[0] && occ[1]);
  const air = M.ball && M.ball.vz > 60 && !M.ball.bounced;
  for (const r of M.runners) if (r !== br) {
    r.from = r.base;
    if (air) { r.halfway = true; r.state = 'running'; r.target = r.base + 1; }
    else if (r.forced || r.steal) { r.state = 'running'; r.target = r.base + 1; }
    else { r.state = 'onBase'; }
  }
  pStat(bat);
}
function runnersStep(dt) {
  const I = inputOf(M.half, 'run'), b = M.ball;
  // human orders: R1 all go, L1 all back; with a base button only the runner heading there
  if (I && !M.cheats.autoplay && M.phase === 'inPlay') {
    const go = I.pressed('r1'), back = I.pressed('l1'), base = basePressed(I);
    if (go || back) {
      for (const r of M.runners) if (r.state === 'onBase' || r.state === 'running' || r.state === 'returning') {
        if (base && r.target !== base && r.base + 1 !== base) continue;
        r.order = go ? 'go' : 'back'; if (go && r.state === 'onBase' && r.base < 4) { r.state = 'running'; r.target = r.base + 1; r.from = r.base; r.halfway = false; }
        if (back && (r.state === 'running') && !r.forced) sendBack(r);
      }
      if (go) emit('order', { go: true }); else emit('order', { go: false });
    }
    const mb = mouseBase(I); if (mb) { const r = M.runners.find(r => (r.state === 'onBase' || r.state === 'running') && (r.base + 1 === mb || r.target === mb)); if (r) { r.order = 'go'; if (r.state === 'onBase') { r.state = 'running'; r.target = mb; r.from = r.base; r.halfway = false; } emit('order', { go: true }); } }
    const burner = I.down('r1') && I.down('l2') && offense().meter >= 50 && !M.burnUsed;
    if (burner) { M.burnUsed = true; offense().meter -= M.cheats.infMeter ? 0 : 50; for (const r of M.runners) r.burner = 3; emit('super', { kind: 'burners', team: M.half }); sfx('rocket'); }
  }
  for (const r of M.runners) {
    if (r.state === 'out' || r.state === 'scored') continue;
    r.human = !!I; r.burner = Math.max(0, (r.burner || 0) - dt);
    r.turbo = (I && I.down('l2') && turboUse(M.half, dt)) || (!I && r.state === 'running' && runnerTimeLeft(r) < 1.2 && offense().turbo > 30 && turboUse(M.half, dt));
    if (r.delay > 0) { r.delay -= dt; continue; }
    if (r.state === 'onBase') {
      if (r.mustTag) r.tagged = true;
      // AI: tag up after a deep catch, or advance when the ball is loose in the outfield
      if (!r.order && !(I && game.settings.baserunning === 'manual') && aiShouldGo(r)) { r.state = 'running'; r.target = Math.min(4, r.base + 1); r.from = r.base; r.mustTag = false; }
      continue;
    }
    if (r.state === 'running' && r.halfway && !r.order) {
      const from = basePos(r.base), to = basePos(r.target), seg = Math.hypot(to.x - from.x, to.y - from.y), done = Math.hypot(r.x - from.x, r.y - from.y) / seg;
      if (b && b.mode === 'batted' && !b.bounced && !b.touched) { if (done > .35) continue; }
      else r.halfway = false;
    }
    if (r.state === 'running' && !r.forced && !r.order && b && b.mode === 'held' && aiShouldReturn(r)) sendBack(r);
    const tb = r.state === 'returning' ? r.tagBase : r.target, bp = basePos(tb), dx = bp.x - r.x, dy = bp.y - r.y, d = Math.hypot(dx, dy), sp = rSpeed(r);
    if (d <= sp * dt + .5) {
      r.x = bp.x; r.y = bp.y;
      if (r.state === 'returning') { r.base = tb; r.state = 'onBase'; r.tagged = true; r.order = null; continue; }
      r.base = tb; r.forced = false; r.order = r.order === 'go' ? null : r.order; r.halfway = false;
      if (tb === 4) { scoreRun(r); continue; }
      r.state = 'onBase';
      if (r.p === M.play?.batter) r.reached = tb;
      // keep going? (the AI's time race)
      if (!r.order && !(I && game.settings.baserunning === 'manual') && aiShouldGo(r)) { r.state = 'running'; r.target = tb + 1; r.from = tb; }
      continue;
    }
    if (d < 28 && !r.slid && holderNear(bp, 120)) { r.slid = true; r.slide = .5; emit('slide', { base: tb }); sfx('slide'); }
    if (r.slide > 0) r.slide -= dt;
    r.x += dx / d * sp * dt; r.y += dy / d * sp * dt; r.facing = Math.atan2(dy, dx);
    // the bowl-over at home: a turbo runner into a catcher holding the ball
    if (tb === 4 && r.turbo && d < 14) { const C = M.fielders.find(f => f.hasBall && Math.hypot(f.x - bp.x, f.y - bp.y) < 14); if (C) bowlOver(r, C); }
  }
}
const holderNear = (bp, d) => { const h = holderF(); const b = M.ball; return (h && Math.hypot(h.x - bp.x, h.y - bp.y) < d) || (b && b.mode === 'thrown' && Math.hypot(b.toPt.x - bp.x, b.toPt.y - bp.y) < 20); };
function bowlOver(r, C) {
  const roll = r.p.pow + 1 + Math.floor(R() * 6), def = C.p.pow + 2 + Math.floor(R() * 6);
  emit('bowlOver', { runner: r.p, won: roll > def }); sfx('crash'); game.shake(4); meterGain(roll > def ? M.half : 1 - M.half, 10, 'collision');
  if (roll > def) { C.hasBall = false; C.stun = 1.2; const b = M.ball; b.mode = 'batted'; b.bounced = true; b.touched = true; b.vx = (R() - .5) * 140; b.vy = 60; b.vz = 70; b.z = 10; }
  else { runnerOut(r, 'tag', false); }
  if (M.rhubarbs && R() < .25 * TUNE.rhubarbChance / .4) M.pendingRhubarb = true;
}
/** the AI runner's time race: go if it beats the ball to the next base by its margin */
function aiShouldGo(r) {
  if (r.base >= 4) return false;
  const next = r.base + 1, occ = M.runners.find(o => o !== r && o.state !== 'out' && o.state !== 'scored' && (o.base === next && o.state === 'onBase'));
  if (occ) return false;
  if (r.mustTag && !r.tagged) return false;
  const b = M.ball; if (!b || b.mode === 'dead') return false;
  const bp = basePos(next), rt = Math.hypot(bp.x - r.x, bp.y - r.y) / rSpeed(r);
  let bt;
  if (b.mode === 'held') { const h = holderF(); bt = h ? .3 + Math.hypot(h.x - bp.x, h.y - bp.y) / tSpeed(h) : 0; if (h && rOf(h.x, h.y) < 470 && r.mustTag !== true) bt = Math.min(bt, 1); }
  else if (b.mode === 'thrown') bt = (b.T - b.t) + Math.hypot(b.toPt.x - bp.x, b.toPt.y - bp.y) / THROW;
  else { if (!b.bounced && !b.touched) return false; const ch = M.fielders.find(f => f.job === 'chase') || nearestTo(b.x, b.y); bt = Math.hypot(ch.x - b.x, ch.y - b.y) / FSPEED + .4 + Math.hypot(b.x - bp.x, b.y - bp.y) / THROW; }
  const margin = (r.mustTag ? .1 : .45) / Math.max(.4, TUNE.cpuRun) + (next === 4 ? .15 : 0);
  return rt + margin < bt;
}
function aiShouldReturn(r) {
  const h = holderF(); if (!h) return false;
  const bp = basePos(r.target), back = basePos(r.base), ahead = Math.hypot(bp.x - r.x, bp.y - r.y) / rSpeed(r), ball = .25 + Math.hypot(h.x - bp.x, h.y - bp.y) / tSpeed(h);
  const behind = Math.hypot(back.x - r.x, back.y - r.y) / rSpeed(r);
  return ahead > ball + .1 && behind < ahead;
}
function turboUse(s, dt) { const t = M.teams[s]; if (M.cheats.infTurbo) return true; if (t.turbo <= 0) return false; t.turbo = Math.max(0, t.turbo - 40 * TUNE.turboDrain * dt); return true; }

/* ===== 16-supers.js ===== */
/* THE OVER-THE-TOP LAYER: meter gains from the bus, the boss's rules (Overclock, Short Circuit, Rally Cap), the six park
 * hazards (always telegraphed), and the Rhubarb, a 12-second bench-clearing brawl. */
BZ.bus.on('doublePlay', () => M && meterGain(1 - M.half, 15, 'dp'));
BZ.bus.on('safeSteal', () => M && meterGain(M.half, 10, 'steal'));
BZ.bus.on('slide', () => M && meterGain(M.half, 2, 'slide'));
BZ.bus.on('homer', d => {
  if (!M || !M.boss) return;
  const pit = defense().pitcher; if (TEAMS[pit.team].boss && pit.look.captain) { M.boss.circuit = 2; M.boss.speed = .85; emit('shortCircuit', {}); }
});
BZ.bus.on('halfStart', () => {
  if (!M || !M.boss) return;
  M.boss.speed = M.boss.circuit > 0 ? .85 : 1 + .05 * (M.inning - 1);
  // the Rally Cap: the Comets trail entering their last turn at bat
  const com = M.teams.findIndex(t => t.def.id === 'COM');
  if (com === M.half && M.inning >= M.innings && M.teams[com].runs < M.teams[1 - com].runs && !M.boss.rally) { M.boss.rally = true; M.teams[com].meter = 100; emit('rallyCap', {}); }
});

/* ---- hazards ---- */
function hazardInit() {
  const id = M.park.hazard;
  M.hz = BZ.hz = { id, t: 0, vent: 25, ventWarn: 0, ventHot: 0, meteor: 40, craters: [], gulls: [], drones: [], told: {}, flash: 0 };
  if (id === 'gulls') for (let i = 0; i < 3; i++) M.hz.gulls.push({ a: i * 2.1, r: 300 + i * 120, z: 220 + i * 25, sp: .35 + i * .08, cx: HX + (i - 1) * 200, cy: HY - 700, carry: null, blob: HEADLESS ? null : new E.Blob({ R: 4, wings: true, colors: { dk: '#a8b0b8', base: '#f4f4f0', lt: '#ffffff', eye: '#1a1a1a' } }) });
  if (id === 'drones') for (let i = 0; i < 3; i++) M.hz.drones.push({ a: i * 2.1, r: 260 + i * 70, z: 170 + i * 35, sp: .5 + i * .1, cx: HX + (i - 1) * 260, cy: HY - 760, alive: true, x: 0, y: 0, respawn: 0, blob: HEADLESS ? null : new E.Blob({ R: 6, wings: true, face: 'front', colors: { dk: '#5a6270', base: '#b8c0cc', lt: '#ffffff', eye: '#e01e3c' } }) });
  if (id === 'vents') M.hz.vents = PARKS.caldera && parkProps(M.park).filter(p => p.vent);
}
function hazardStep(dt) {
  if (!M.hz || M.hz.match !== M) { hazardInit(); M.hz.match = M; }
  const h = M.hz, rate = TUNE.hazardRate; h.t += dt; h.flash = Math.max(0, h.flash - dt);
  const live = M.phase !== 'pregame' && M.phase !== 'halfEnd' && M.phase !== 'rhubarb' && !M.lesson?.noHazard;
  if (h.id === 'vents' && rate > 0 && live) {
    h.vent -= dt * rate;
    if (h.vent < 3 && h.ventWarn <= 0) { h.ventWarn = 3; emit('hazardWarn', { kind: 'vents' }); sfx('rumble'); }
    if (h.ventWarn > 0) { h.ventWarn -= dt; if (h.ventWarn <= 0) { h.ventHot = 3; h.vent = 25; emit('hazard', { kind: 'vents' }); sfx('explode'); if (!HEADLESS) for (const v of h.vents || []) P.fire(v.x, v.y, 10, 30, { size: 1.6 }); } }
    if (h.ventHot > 0) h.ventHot -= dt;
    // CPU fielders keep 30 U from a vent about to blow
    if (h.ventWarn > 0 || h.ventHot > 0) for (const F of M.fielders) for (const v of h.vents || []) { const d = Math.hypot(F.x - v.x, F.y - v.y); if (d < 34) { if (F.human && h.ventHot > 0) { F.vx += (F.x - v.x) / d * 300; F.vy += (F.y - v.y) / d * 300; F.stun = .4; } else if (!F.human) { F.x += (F.x - v.x) / (d || 1) * 60 * dt; F.y += (F.y - v.y) / (d || 1) * 60 * dt; } } }
  }
  if (h.id === 'lowgrav' && rate > 0 && live) {
    h.meteor -= dt * rate;
    if (h.meteor < 2.5 && !h.warned) { h.warned = true; emit('hazardWarn', { kind: 'meteor' }); sfx('meteor'); }
    if (h.meteor <= 0) { h.meteor = 40; h.warned = false; for (let i = 0; i < 3; i++) { const th = (R() - .5) * 1.2, r = 520 + R() * 400, [ux, uy] = dirOf(th); h.craters.push({ x: HX + ux * r, y: HY + uy * r, r: 26 }); } emit('hazard', { kind: 'meteor' }); game.shake(4); sfx('explode'); }
  }
  for (const g of h.gulls) { g.a += g.sp * dt; g.x = g.cx + Math.cos(g.a) * g.r; g.y = g.cy + Math.sin(g.a) * g.r * .6; if (g.blob) g.blob.update(dt, { flap: 1 }); if (g.carry) { g.carry.t -= dt; } if (R() < dt * .05) sfx('gull', { vol: .4 }); }
  for (const d of h.drones) { d.a += d.sp * dt; d.x = d.cx + Math.cos(d.a) * d.r; d.y = d.cy + Math.sin(d.a * 1.3) * d.r * .5; if (!d.alive) { d.respawn -= dt; if (d.respawn <= 0) d.alive = true; } if (d.blob) d.blob.update(dt, { flap: .8 }); }
}
function hazardBall(b, dt) {
  const h = M.hz; if (!h || TUNE.hazardRate <= 0) return;
  if (h.id === 'fog') { const was = b.hidden; b.hidden = b.z > 120 && b.vz !== 0; if (b.hidden && !was) { emit('hazard', { kind: 'fog' }); sfx('ghost'); } }
  if (h.id === 'gulls' && !b.snatched && b.z > 180 && !b.bounced) {
    for (const g of h.gulls) if (Math.hypot(g.x - b.x, g.y - b.y) < 60 && R() < .25 * dt * 6 * TUNE.hazardRate) {
      b.snatched = true; g.carry = { t: .8 + R() * .6 }; const a = R() * TAU, m = 60 + R() * 80; b.x += Math.cos(a) * m; b.y += Math.sin(a) * m; b.z = 150; b.vx *= .2; b.vy *= .2; b.vz = 0;
      emit('hazard', { kind: 'gull' }); sfx('gull'); assignFielders(true); break;
    }
  }
  if (h.id === 'vents' && h.ventHot > 0) for (const v of h.vents || []) if (Math.hypot(b.x - v.x, b.y - v.y) < 30 && b.z < 24) { b.vz = 600; b.vx += (R() - .5) * 200; b.vy += (R() - .5) * 200; b.bounced = true; b.rolling = false; emit('hazard', { kind: 'ventLaunch' }); sfx('explode'); assignFielders(true); }
  if (h.id === 'lowgrav' && b.rolling) for (const c of h.craters) if (Math.hypot(b.x - c.x, b.y - c.y) < c.r && !b.cratered) { b.cratered = true; const a = (R() < .5 ? -1 : 1) * .7, cs = Math.cos(a), sn = Math.sin(a); const vx = b.vx * cs - b.vy * sn; b.vy = b.vx * sn + b.vy * cs; b.vx = vx; emit('hazard', { kind: 'crater' }); assignFielders(true); }
  if (h.id === 'drones') for (const d of h.drones) if (d.alive && Math.hypot(d.x - b.x, d.y - b.y) < 16 && Math.abs(d.z - b.z) < 16) {
    if (b.kind === 'batzooka') { d.alive = false; d.respawn = 30; emit('droneDown', {}); emit('fanBucks', { n: 150, why: 'DRONE' }); if (!HEADLESS) P.explosion(d.x, d.y, d.z, 1); }
    else { b.vz = -Math.abs(b.vz) * .5 - 50; b.vx = -b.vx * .4 + (R() - .5) * 100; b.vy = -b.vy * .4; emit('hazard', { kind: 'drone' }); sfx('clang'); assignFielders(true); }
  }
}
BZ.bus.on('homer', d => {
  if (!M) return;
  const kit = PARK_CACHE[M.parkId]; const props = kit ? kit.props : parkProps(M.park);
  if (M.park.hazard === 'silo') { const s = props.find(p => p.kind === 'silo'); if (s && Math.abs(thetaOf(s.x, s.y) - thetaOf(d.x, d.y)) < .12) { s.popped = true; emit('siloPop', {}); emit('fanBucks', { n: 300, why: 'SILO SHOT' }); meterGain(M.half, 20, 'target'); } }
  if (M.park.id === 'megadome' && Math.abs(thetaOf(d.x, d.y) - .08) < .14) { emit('megatron', {}); emit('fanBucks', { n: 300, why: 'MEGA-TRON' }); }
  if (M.park.id === 'barnacle' && thetaOf(d.x, d.y) > .3) { emit('splash', {}); sfx('horn'); }
});

/* ---- the Rhubarb ---- */
BZ.bus.on('rhubarbStart', () => { BZ.rhubarbSeen = (BZ.rhubarbSeen || 0) + 1; });
function startRhubarb(after, batter) {
  const off = offense(), def = defense();
  const pick = (T, first) => { const L = [first, ...T.def.roster.filter(p => p !== first)].filter(Boolean).slice(0, 6); return L; };
  const fighters = [];
  const mk = (p, side, i) => {
    const a = (side ? 1 : -1), x = HX + a * (30 + (i % 3) * 22) + (R() - .5) * 10, y = HY - 40 - Math.floor(i / 3) * 30 + (R() - .5) * 10;
    return { p, side, x, y, vx: 0, vy: 0, facing: side ? Math.PI : 0, hp: 3, down: 0, kd: 0, combo: new E.Combo(['jab', 'cross', 'hook'], { window: .35 }), move: null, wind: 0, dodge: 0, rig: HEADLESS && !BZ.cosmetic ? null : makeRig(p, 'brawl'), human: null, stun: 0, hits: 0, shoves: 0, tosses: 0 };
  };
  pick(off, batter).forEach((p, i) => fighters.push(mk(p, M.half, i)));
  pick(def, def.pitcher).forEach((p, i) => fighters.push(mk(p, 1 - M.half, i)));
  const hb = inputOf(M.half, 'bat'), hp = inputOf(1 - M.half, 'pitch');
  if (hb && !M.cheats.autoplay) fighters.find(f => f.side === M.half).human = hb;
  if (hp && !M.cheats.autoplay) fighters.find(f => f.side === 1 - M.half).human = hp;
  M.rhubarb = { t: M.lesson && M.lesson.rhubarbLen ? M.lesson.rhubarbLen : 12, fighters, after, kd: [0, 0], intro: 1.2, end: 0 };
  M.prevCam = M.cam; M.cam = 'broadcast'; setPhase('rhubarb');
  emit('rhubarbStart', {}); sfx('whistle'); music('rhubarb');
}
function rhubarbStep(dt) {
  const RB = M.rhubarb; if (!RB) return setPhase('walkUp');
  if (RB.intro > 0) { RB.intro -= dt; for (const f of RB.fighters) rigFighter(f, dt); return; }
  if (RB.end > 0) { RB.end -= dt; for (const f of RB.fighters) { f.vx = f.vy = 0; f.down = Math.max(0, f.down - dt); rigFighter(f, dt); } if (RB.end <= 0) finishRhubarb(); return; }
  RB.t -= dt;
  for (const f of RB.fighters) {
    f.stun = Math.max(0, f.stun - dt); f.dodge = Math.max(0, f.dodge - dt);
    if (f.down > 0) { f.down -= dt; if (f.down <= 0) f.hp = 3; f.vx *= .9; f.vy *= .9; }
    else if (f.stun <= 0) {
      const foes = RB.fighters.filter(o => o.side !== f.side && o.down <= 0);
      const near = foes.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      if (f.human) {
        const I = f.human, mv = I.move(); f.vx = mv[0] * 110; f.vy = mv[1] * 110;
        if (Math.hypot(mv[0], mv[1]) > .2) f.facing = Math.atan2(mv[1], mv[0]); else if (near) f.facing = Math.atan2(near.y - f.y, near.x - f.x);
        if (I.pressed('south')) f.combo.press();
        if (I.pressed('west') && !f.move) { f.move = new E.Attack('bash'); f.move.start(); f.moveKind = 'shove'; }
        if (I.pressed('north') && !f.move) { f.move = new E.Attack('throw'); f.move.start(); f.moveKind = 'toss'; }
        if (I.pressed('east') && f.dodge <= 0) { f.dodge = .35; f.vx = Math.cos(f.facing) * -260; f.vy = Math.sin(f.facing) * -260; sfx('turbo'); }
      } else if (near) {
        const dx = near.x - f.x, dy = near.y - f.y, d = Math.hypot(dx, dy); f.facing = Math.atan2(dy, dx);
        if (d > 16) { f.vx = dx / d * 80; f.vy = dy / d * 80; } else { f.vx *= .8; f.vy *= .8; f.wind += dt; if (f.wind > .25 + R() * .4) { f.wind = 0; if (R() < .8) f.combo.press(); else if (!f.move) { f.move = new E.Attack('bash'); f.move.start(); f.moveKind = 'shove'; } } }
      } else { f.vx *= .9; f.vy *= .9; }
    }
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.x = clamp(f.x, HX - 150, HX + 150); f.y = clamp(f.y, HY - 160, HY + 60);
    f.combo.update(dt); if (f.move) { f.move.update(dt); if (!f.move.busy) f.move = null; }
    const foes = RB.fighters.filter(o => o.side !== f.side && o.down <= 0 && o.dodge <= 0);
    const test = o => Math.hypot(o.x - f.x, o.y - f.y) < 16 && Math.abs(E.angDiff(Math.atan2(o.y - f.y, o.x - f.x), f.facing)) < 1;
    f.combo.hits(foes, test, o => hitFighter(f, o, 'punch'));
    if (f.move) f.move.hits(foes, test, o => hitFighter(f, o, f.moveKind));
    rigFighter(f, dt);
  }
  if (RB.t <= 0) { RB.end = 1.6; emit('rhubarbEnd', { kd: RB.kd }); sfx('whistle'); }
}
function hitFighter(f, o, kind) {
  o.hp -= kind === 'punch' ? 1 : 2; o.stun = .25; sfx(kind === 'punch' ? 'bonk' : 'pow'); if (f.human) f.human.rumble(.4, .1);
  const a = Math.atan2(o.y - f.y, o.x - f.x), k = kind === 'toss' ? 300 : kind === 'shove' ? 160 : 60; o.vx = Math.cos(a) * k; o.vy = Math.sin(a) * k;
  if (kind === 'punch') f.hits++; else if (kind === 'shove') f.shoves++; else f.tosses++;
  emit('brawlHit', { kind, human: !!f.human });
  if (!HEADLESS && P.impact) P.impact(o.x, o.y, 18, 1, '#ffffff');
  if (o.hp <= 0) { o.down = 2; o.kd++; M.rhubarb.kd[f.side]++; emit('knockdown', { side: f.side }); sfx('thump'); }
}
function rigFighter(f, dt) {
  if (!f.rig) return;
  const st = (f.move && f.move.state) || f.combo.state;
  f.rig.update(dt, { x: f.x, y: f.y, z: 0, vx: f.vx, vy: f.vy, facing: f.facing, attack: st, hurt: f.stun > 0, down: f.down > 0 ? 1 : 0, expr: f.down > 0 ? 'wince' : 'angry', stance: 'guard' });
}
function finishRhubarb() {
  const RB = M.rhubarb, [a, b] = [RB.kd[0], RB.kd[1]];
  if (a > b) meterGain(0, 50, 'rhubarb'); else if (b > a) meterGain(1, 50, 'rhubarb'); else { meterGain(0, 20, 'rhubarb'); meterGain(1, 20, 'rhubarb'); }
  emit('rhubarbOver', { kd: RB.kd, winner: a === b ? -1 : a > b ? 0 : 1 });
  M.rhubarb = null; M.cam = 'plate'; music(M.park.song);
  if (RB.after) { const r = RB.after(); M.lastCall = r; setPhase('afterPitch'); }
  else setPhase('playOver');
}

/* ===== 19-replay.js ===== */
/* PICKOFFS AND REPLAYS. Pickoffs: before the pitch, the pitcher holds L1 and presses a base button to throw over; a
 * runner with an extra lead (R1 for the offense when the Batzooka isn't ready) is easier to catch. Replays: the last 8 s
 * of a play are recorded at 30 Hz; after a big play (homer, diving or wall catch, double play, collision) it plays again
 * at half speed with a REPLAY banner (skippable; Settings, Replays). */
function tryPickoff(base, cpu) {
  const r = runnerOn(base); if (!r || M.outs >= 3) return false;
  const p = clamp(.08 + (r.lead > 0 ? .3 : 0) - .02 * (r.p.spd - 5) + .02 * (defense().pitcher.arm - 5), .02, .6);
  emit('pickoff', { base, cpu }); sfx('whoosh', { pitch: 1.4 });
  if (R() < p) { M.runners = M.runners.filter(x => x !== r); outMade('pickoff', r, false); emit('pickedOff', { runner: r.p }); stamp('PICKED OFF!', RED); sfx('ump'); }
  else { stamp('SAFE!', GREEN, { scale: 2 }); sfx('glove'); r.lead = 0; placeRunner(r); }
  return true;
}
function leadStep() { for (const r of M.runners) if (r.state === 'onBase' && r.lead > 0 && r.base < 3) { const a = basePos(r.base), b = basePos(r.base + 1), d = Math.hypot(b.x - a.x, b.y - a.y); r.x = a.x + (b.x - a.x) / d * 12; r.y = a.y + (b.y - a.y) / d * 12; } }
const REPLAY_LOG = [];
let replayAcc = 0;
function recordFrame(dt) {
  if (M.fast) return; replayAcc += dt; if (replayAcc < 1 / 30) return; replayAcc = 0;
  const b = M.ball;
  REPLAY_LOG.push({ ball: b && b.mode !== 'held' ? [b.x, b.y, b.z, !!b.hidden] : b && b.holder ? [b.holder.x, b.holder.y, b.holder.z + 16, false] : null,
    actors: M.fielders.map(F => [F.rig, F.x, F.y, F.z, F.facing, F.vx, F.vy]).concat(M.runners.filter(r => r.state !== 'out' && r.state !== 'scored').map(r => [r.rig, r.x, r.y, 0, r.facing || 0, Math.cos(r.facing || 0) * (r.state === 'running' ? 120 : 0), Math.sin(r.facing || 0) * (r.state === 'running' ? 120 : 0)])) });
  if (REPLAY_LOG.length > 240) REPLAY_LOG.shift();
}
BZ.bus.on('contact', () => { REPLAY_LOG.length = 0; });
for (const ev of ['homer', 'doublePlay', 'bowlOver']) BZ.bus.on(ev, () => { if (M && M.play) M.play.big = true; });
BZ.bus.on('catch', d => { if (M && M.play && (d.dive || d.wall)) M.play.big = true; });
function startReplay() { M.replay = { frames: REPLAY_LOG.slice(), t: 0 }; M.cam = 'broadcast'; setPhase('replay'); emit('replay', {}); }
function replayStep(dt) {
  const R_ = M.replay; R_.t += dt * .5; const i = Math.floor(R_.t * 30);
  if (!R_ || i >= R_.frames.length || (M.phaseT > .4 && skipPressed())) { M.replay = null; setPhase('playOver'); return; }
  R_.cur = R_.frames[i];
  for (const [rig, x, y, z, f, vx, vy] of R_.cur.actors) if (rig) rig.update(dt * .5, { x, y, z, vx, vy, facing: f, air: z > 2 });
  if (R_.cur.ball) { CAMS.x += (R_.cur.ball[0] - CAMS.x) * .05; CAMS.y += (R_.cur.ball[1] - CAMS.y) * .05; }
}
function replayDraw(r) {
  const f = M.replay && M.replay.cur; if (!f) return;
  for (const [rig, x, y, z] of f.actors) if (rig) { r.shadow(x, y, 5); r.actor(x, y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
  if (f.ball && !f.ball[3]) { const [x, y, z] = f.ball; r.shadow(x, y, 2.5, .5); r.queue(x, y, drawZ(z), g => { const s = r.w(x, y, drawZ(z)); ballDraw(g, s[0], s[1], (r.view.zoom || 1) * 1.2, null, 1, 0); }); }
  r.overlay(g => { if (Math.floor(game.real * 2) % 2) E.font.title(g, 'REPLAY', SAFE + 6, r.H - SAFE - 30, { scale: 2, colors: RED }); px.rect(g, 0, 0, r.W, 3, '#e8443a'); px.rect(g, 0, r.H - 3, r.W, 3, '#e8443a'); });
}

/* ===== 20-match.js ===== */
/* THE MATCH: its phases (pregame, halfStart, walkUp, select, windup, flight, afterPitch, inPlay, homer, playOver,
 * halfEnd, rhubarb, final), the human and CPU sides of the duel at the plate, steals, wild pitches, the home-run trot,
 * and the update order. The simulation runs only in matchUpdate (fixed steps); drawing only reads M. */
const PH = { pregame: 2.2, halfStart: 1.6, walkUp: .9, afterPitch: .8, playOver: 1.1, halfEnd: 2.4, homer: 4.2 };
const phT = k => M.fast ? 0 : PH[k];
function setPhase(p) { M.phase = p; M.phaseT = 0; emit('phase', { phase: p }); }
const batIn = () => inputOf(M.half, 'bat'), pitIn = () => inputOf(1 - M.half, 'pitch');
const autoBat = () => !batIn() || M.cheats.autoplay, autoPit = () => !pitIn() || M.cheats.autoplay;

function matchUpdate(dt) {
  if (!M || M.over && M.phase === 'final') return;
  M.t += dt; M.phaseT += dt; if (M.play) M.play.t += dt;
  for (const t of M.teams) { if (M.cheats.infMeter) t.meter = 100; if (M.cheats.infTurbo) t.turbo = 100; }
  hazardStep(dt);
  if (M.derby) { derbyTick(dt); if (M.derby.done && M.phase !== 'final' && M.phase !== 'inPlay') return toFinal(); }
  switch (M.phase) {
    case 'pregame': if (M.phaseT >= phT('pregame') || skipPressed()) { setPhase('halfStart'); halfStartSetup(); } break;
    case 'halfStart': if (M.phaseT >= phT('halfStart') || skipPressed()) { setPhase('walkUp'); emit('batterUp', { batter: batterNow() }); } break;
    case 'walkUp': reticleStep(dt); if (M.phaseT >= phT('walkUp')) beginSelect(); break;
    case 'select': selectStep(dt); break;
    case 'windup': windupStep(dt); break;
    case 'flight': flightStep(dt); break;
    case 'afterPitch': reticleStep(dt); if (M.phaseT >= phT('afterPitch')) afterPitchDone(); break;
    case 'inPlay': inPlayStep(dt); recordFrame(dt); break;
    case 'homer': homerStep(dt); recordFrame(dt); break;
    case 'playOver': if (M.phaseT >= phT('playOver')) playOverDone(); else { fieldersIdle(dt); } break;
    case 'halfEnd': if (M.phaseT >= phT('halfEnd') + (M.show ? M.show.len : 0) || (M.phaseT > .6 && skipPressed())) halfEndDone(); break;
    case 'rhubarb': rhubarbStep(dt); break;
    case 'replay': replayStep(dt); break;
  }
  for (const t of M.teams) t.turbo = Math.min(100, t.turbo + 10 * dt);
}
function skipPressed() { if (M.fast) return true; for (const I of game.players) if (I.pressed('south') || I.pressed('confirm')) { I.consumeAll(); return true; } return false; }
function halfStartSetup() {
  setFielders(); M.runners = []; M.burnUsed = false;
  if (M.bonusRunner && !M.derby) { const o = offense(), prev = o.lineup[(o.order + 8) % 9]; addRunner(prev, 2); emit('bonusRunner', {}); }
  emit('halfStart', { inning: M.inning, half: M.half });
  if (M.boss && M.boss.circuit > 0) M.boss.circuit--;
}
function beginSelect() {
  setPhase('select'); M.pickTried = false; M.pitch = null; M.swing = null; M.ball = null; M.bunting = false; M.cpuSel = null; M.cpuBat = null; M.relPress = null; M.sel = M.sel || 0;
  for (const r of M.runners) { r.steal = false; r.lead = 0; }
  const D = defense(), pit = D.pitcher;
  // the CPU calls the bullpen when its pitcher is spent
  if (!pitIn() && stamOf(1 - M.half, pit) < 20 && D.bullpen.length) pitchingChange(1 - M.half);
  else if (pitIn() && stamOf(1 - M.half, pit) < 20 && D.bullpen.length && !M.toldBullpen) { M.toldBullpen = true; emit('bullpenReady', {}); }
  for (const t of M.teams) t.turbo = Math.min(100, t.turbo + 15);
  // the Tour's scripted Rhubarb at Caldera Field: Iggy plunks one in the 2nd inning
  if (M.tour && M.tour.scriptedRhubarb && !M.tour.rhubarbDone && M.inning >= Math.min(2, M.innings) && M.rhubarbs && !M.fast) { M.tour.rhubarbDone = true; emit('hbpHit', { hard: true, scripted: true }); startRhubarb(() => { walk(true); return 'walk'; }, batterNow()); return; }
  M.target.x = 0; M.target.z = 17; M.reticle.x = 0; M.reticle.z = 17;
}
function pitchingChange(s) {
  const T = M.teams[s]; if (!T.bullpen.length) return false;
  const old = T.pitcher; T.pitcher = T.bullpen.shift(); T.stamina[T.pitcher.id] = T.stamina[T.pitcher.id] || 100;
  const F = M.fielders.find(f => f.pos === 'P'); if (F && s === 1 - M.half) { F.p = T.pitcher; F.rig = HEADLESS && !BZ.cosmetic ? null : makeRig(T.pitcher, 'field'); }
  emit('pitchingChange', { team: s, out: old, in: T.pitcher }); return true;
}

/* ---- before the pitch: the pitcher picks (a face button; R1 the super); the batter may arm the Batzooka or order a steal ---- */
function selectStep(dt) {
  reticleStep(dt);
  const s = 1 - M.half, D = defense(), pit = D.pitcher, list = pitchesOf(pit);
  // the offense: Batzooka (R1), steals (L1 held + a base button)
  const BI = batIn();
  if (BI && !M.cheats.autoplay) {
    if (BI.pressed('r1') && offense().meter >= 100 && !M.armed) { M.armed = true; emit('armed', {}); sfx('charge'); }
    else if (BI.pressed('r1') && offense().meter < 100) { for (const r of M.runners) if (r.state === 'onBase' && r.base < 3) r.lead = 12; emit('lead', {}); }
    if (BI.down('l1')) { const b = basePressed(BI); if (b >= 2) { const r = runnerOn(b - 1); if (r && !runnerOn(b)) { r.steal = true; emit('stealCall', { base: b }); } } }
  } else if (!M.cpuStealDone) {
    M.cpuStealDone = true;
    const r1 = runnerOn(1), r2 = runnerOn(2);
    if (r1 && !r2 && r1.p.spd >= 7 && M.outs < 2 && R() < .14 * TUNE.cpuRun) r1.steal = true;
    if (offense().meter >= 100 && !M.cheats.noCpuSuper && (M.runners.length || M.inning >= M.innings) && R() < .7) M.armed = true;
  }
  leadStep();
  if (autoPit()) {
    if (!M.cpuSel && !M.derby && !M.pickTried && !(M.force && M.force.nextPitch)) { M.pickTried = true; const r1 = runnerOn(1); if (r1 && r1.p.spd >= 7 && R() < .05 + (r1.lead ? .25 : 0)) tryPickoff(1, true); }
    if (!M.cpuSel) M.cpuSel = M.derby ? derbyPitchChoice() : Object.assign(cpuPitchChoice(), { wait: M.fast ? 0 : .5 + R() * .5 });
    M.cpuSel.wait -= dt; if (M.cpuSel.wait <= 0) startWindup(M.cpuSel.type, true);
    return;
  }
  const I = pitIn();
  const slots = ['south', 'east', 'west', 'north'];
  if (I.down('l1')) { const b = basePressed(I); if (b && b < 4) { I.consumeAll(); tryPickoff(b, false); } return; }
  if (I.lastDevice === 'mouse' && I.pressed('south')) { I.consume('south'); startWindup(list[M.sel] || 'heater', false, 'south'); return; }
  for (let i = 0; i < 4; i++) if (I.pressed(slots[i]) || I.pressed('num' + (i + 1))) { M.sel = i; I.consume(slots[i]); startWindup(list[i] || 'heater', false, slots[i]); return; }
  if ((I.pressed('r1') || I.pressed('num5')) && D.meter >= 100) { startWindup(TEAMS[pit.team].superPitch, false, 'r1'); return; }
  // the mouse wheel picks a pitch, the left button throws it
  if (BZ.wheel) { M.sel = (M.sel + BZ.wheel + 4) % 4; BZ.wheel = 0; sfx('menu'); }
}
function startWindup(type, cpu, btn) {
  setPhase('windup'); M.pitchType = type; M.relBtn = btn; M.relPress = null;
  const pit = defense().pitcher, tempo = clamp(1.1 - .02 * pit.vel, .8, 1.1) * (M.boss && M.boss.circuit > 0 && TEAMS[pit.team].boss ? 1.3 : 1);
  M.windT = M.fast ? 0 : .9 * tempo;
  if (cpu) { M.target.x = M.cpuSel.x; M.target.z = M.cpuSel.z; }
  else if (game.settings.pitchAssist === 'auto') { const c = cpuPitchChoice(); M.target.x = clamp(c.x, -7, 7); M.target.z = c.z; }
  for (const r of M.runners) if (r.steal) { r.state = 'running'; r.target = r.base + 1; r.from = r.base; r.forced = false; r.tagBase = r.base; }
  emit('windup', { type, cpu });
}
function windupStep(dt) {
  reticleStep(dt);
  const I = autoPit() ? null : pitIn();
  if (I) {
    const mv = I.move(); M.target.x = clamp(M.target.x + mv[0] * 22 * dt, -14, 14); M.target.z = clamp(M.target.z - mv[1] * 22 * dt, 1, 36);
    if (I === game.input && I.lastDevice === 'mouse' && BZ.zoneFromPointer) { const z = BZ.zoneFromPointer(); if (z) { M.target.x = clamp(z[0], -14, 14); M.target.z = clamp(z[1], 1, 36); } }
    const ringStart = M.windT - .45;
    if (M.relPress === null && M.phaseT >= ringStart - .05 && (I.pressed('south') || I.pressed('east') || I.pressed('west') || I.pressed('north') || I.pressed('r1') || [1, 2, 3, 4, 5].some(n => I.pressed('num' + n)))) M.relPress = M.phaseT;
  }
  for (const r of M.runners) if (r.steal && r.state === 'running') runnerAdvanceTick(r, dt);
  if (M.phaseT >= M.windT) {
    let q;
    if (autoPit()) q = M.cpuSel ? M.cpuSel.q : .7;
    else if (M.relPress === null) q = .3;
    else { const e = Math.abs(M.relPress - M.windT), w = .04 * TUNE.releaseWindow; q = e <= w ? 1 : clamp(1 - (e - w) / (.2 - w), 0, 1); }
    M.relQ = q;
    const forced = M.force && M.force.nextPitch; if (forced) M.force.nextPitch = null;
    throwPitch(forced ? forced.type || M.pitchType : M.pitchType, forced && forced.x !== undefined ? forced.x : M.target.x, forced && forced.z !== undefined ? forced.z : M.target.z, forced && forced.q !== undefined ? forced.q : q, { cpu: autoPit(), forced: !!forced, x: forced && forced.x, z: forced && forced.z });
    setPhase('flight');
    if (autoBat()) M.cpuBat = cpuBatPlan();
  }
}
function runnerAdvanceTick(r, dt) { const bp = basePos(r.target), dx = bp.x - r.x, dy = bp.y - r.y, d = Math.hypot(dx, dy), sp = rSpeed(r); if (d > 1) { r.x += dx / d * Math.min(d, sp * dt); r.y += dy / d * Math.min(d, sp * dt); r.facing = Math.atan2(dy, dx); } }

/* ---- the reticle: the stick (eased), or the mouse placing it; the CPU's moves to its read ---- */
function reticleStep(dt) {
  const I = autoBat() ? null : batIn(), ret = M.reticle;
  if (I) {
    const mv = I.move(); ret.x = clamp(ret.x + mv[0] * 80 * dt, -12, 12); ret.z = clamp(ret.z - mv[1] * 80 * dt, 3, 31);
    if (I === game.input && I.lastDevice === 'mouse' && BZ.zoneFromPointer) { const z = BZ.zoneFromPointer(); if (z) { ret.x = clamp(z[0], -12, 12); ret.z = clamp(z[1], 3, 31); } }
  } else if (M.cpuBat && M.pitch && M.pitch.t > M.cpuBat.react) {
    const [ax, az] = M.cpuBat.aim, d = Math.hypot(ax - ret.x, az - ret.z), s = 160 * dt;
    if (d > s) { ret.x += (ax - ret.x) / d * s; ret.z += (az - ret.z) / d * s; } else { ret.x = ax; ret.z = az; }
  } else if (!I) { ret.x = approach(ret.x, 0, 30 * dt); ret.z = approach(ret.z, 17, 30 * dt); }
}

/* ---- the pitch in flight: swings, bunts, aftertouch, the crossing and the call ---- */
function flightStep(dt) {
  const pt = M.pitch; pt.t += dt; const u = pt.t / pt.T;
  reticleStep(dt);
  for (const r of M.runners) if (r.steal && r.state === 'running') runnerAdvanceTick(r, dt);
  // aftertouch: the first 40% of the flight
  const PI_ = autoPit() ? null : pitIn();
  if (u < .4) {
    if (PI_) { const mv = PI_.move(), lim = 4 * statF(pt.by.brk) * TUNE.aftertouch, k = 14 * TUNE.aftertouch * dt; if (Math.hypot(mv[0], mv[1]) > .3) { pt.after += dt; pt.cross.x = clamp(pt.cross.x + mv[0] * k, HX + M.target.x - lim - 6, HX + M.target.x + lim + 6); pt.cross.z = clamp(pt.cross.z - mv[1] * k * .75, M.target.z - 3 - 6, M.target.z + 3 + 6); } }
    else if (M.cpuSel && R() < M.diff.after * dt * 2) pt.cross.x += (R() - .5) * 2;
  }
  // the batter
  const BI = autoBat() ? null : batIn();
  if (BI) {
    if (BI.down('north') && !M.swing) { M.bunting = true; }
    else M.bunting = false;
    if (!M.swing && !M.bunting) { if (BI.pressed('south')) startSwing('contact', true); else if (BI.pressed('west')) startSwing('power', true); }
  } else if (M.cpuBat && M.cpuBat.swing) {
    if (M.cpuBat.kind === 'bunt') M.bunting = u > .3;
    else if (!M.swing && pt.t >= M.cpuBat.at) startSwing(M.cpuBat.kind, false);
  }
  if (M.swing && !M.swing.done && pt.t >= M.swing.at + SWINGS[M.swing.kind].delay) {
    M.swing.done = true; const res = resolveSwing();
    if (res === 'contact') return contactMade();
    if (res === 'foul') { if (M.derby) { derbyOut('FOUL TIP'); return endPitch('out'); } const c = callFoul(false); M.swing.result = 'foul'; return endPitch(c); }
  }
  if (u >= 1 && !pt.crossed) {
    pt.crossed = true;
    if (M.bunting) { const res = resolveBunt(); M.swing = { kind: 'bunt', done: true, at: pt.t }; if (res === 'contact') return contactMade(); M.swing.result = 'miss'; }
  }
  // the call waits for a late swing still on its way (a swing inside the window can still connect after the crossing)
  if (pt.crossed && !pt.called && !(M.swing && !M.swing.done)) {
    pt.called = true; const cr = pitchPos(pt, 1), b = batterNow();
    emit('pitchCross', { x: cr.x - HX, z: cr.z, inZone: inZone(cr.x, cr.z, b) });
    M.lastCross = { x: cr.x - HX, z: cr.z, t: M.t };
    if (M.derby) return derbyCross(cr, !!M.swing, inZone(cr.x, cr.z, b));
    if (M.swing && M.swing.kind === 'bunt') { pt.call = callStrike(true, true); }
    else if (M.swing) { pt.call = callStrike(true); if (M.swing.kind === 'batzooka') emit('fizzle', {}); }
    else if (hitsBatter(cr.x, cr.z, b)) { pt.call = 'hbp'; return hitByPitch(); }
    else pt.call = inZone(cr.x, cr.z, b) ? callStrike(false) : callBall();
  }
  if (u >= 1.12 && pt.called) {
    const cr = pitchPos(pt, 1), wild = (Math.abs(cr.x - HX) > 16 || cr.z < 2 || cr.z > 36);
    sfx('mitt'); emit('caught', {});
    if (wild && M.runners.some(r => r.state === 'onBase') && R() < .35 * (1 - (defense().def.roster.find(p => p.pos === 'C').glv) / 10) && !M.derby) { wildPitch(); }
    endPitch(pt.call);
  }
}
function wildPitch() {
  emit('wildPitch', {});
  for (const r of M.runners.slice().sort((a, b) => b.base - a.base)) if (r.state === 'onBase') { if (r.base === 3) scoreRun(r); else if (!runnerOn(r.base + 1)) { r.base++; placeRunner(r); } }
}
function hitByPitch() {
  const hard = M.pitch.speed >= .9 * BASE_SPEED; sfx('thump'); game.shake(2);
  emit('hbpHit', { hard });
  const b = batterNow();
  if (M.rhubarbs && hard && (R() < TUNE.rhubarbChance || M.forceRhubarb || (M.tour && M.tour.scriptedRhubarb && !M.tour.rhubarbDone))) { if (M.tour) M.tour.rhubarbDone = true; M.forceRhubarb = false; startRhubarb(() => { walk(true); return 'walk'; }, b); return; }
  walk(true); endPitch('walk');
}
function endPitch(call) { M.lastCall = call; checkWalkoff(); setPhase('afterPitch'); }
function checkWalkoff() { if (M.walkoff && !M.over) { M.over = true; M.winner = 1; emit('gameEnd', { winner: 1, walkoff: true }); emit('walkoff', { team: 1 }); } }
function afterPitchDone() {
  // a steal: the catcher has the ball and throws
  const stealing = M.runners.filter(r => r.steal && r.state === 'running');
  if (stealing.length && M.outs < 3) { startStealPlay(); return; }
  for (const r of M.runners) if (r.steal) { r.steal = false; }
  if (M.derby) { if (M.derby.done) return toFinal(); M.balls = 0; M.strikes = 0; return beginSelect(); }
  if (M.outs >= 3) return toHalfEnd();
  if (M.over) return toFinal();
  if (M.lastCall === 'walk' || M.lastCall === 'k' || M.lastCall === 'hbp') { setPhase('walkUp'); M.cpuStealDone = false; return; }
  beginSelect();
}
function startStealPlay() {
  const C = fielder('C'), b = M.ball = { x: C.x, y: C.y, z: 16, vx: 0, vy: 0, vz: 0, mode: 'held', holder: C, bounced: true, touched: true, fair: true, trail: [], t: 0 };
  M.play = { batter: batterNow(), runs: [], outs: [], steal: true, noRbi: true, t: 0, id: ++M.playId };
  for (const F of M.fielders) { F.job = 'idle'; F.hasBall = false; }
  C.hasBall = true; C.hold = 0; C.thinking = M.diff.react; b.holder = C;
  const r = M.runners.find(r => r.steal && r.state === 'running'), base = r ? r.target : 2;
  // the covering man: the second baseman takes a steal of second against a righty, the shortstop against a lefty
  const F = fielder(base === 2 ? (batterNow().bats === 'L' ? 'SS' : '2B') : base === 3 ? '3B' : 'C'); if (F) { F.job = 'cover'; F.base = base; }
  for (const r of M.runners) r.startBase = r.base;
  pickControlled(); M.cam = 'broadcast'; setPhase('inPlay');
}

/* ---- contact: the ball is live ---- */
function contactMade() {
  const b = M.ball; M.cam = 'broadcast'; sfx(b.kind === 'batzooka' ? 'krakoom' : b.Q > .6 ? 'crack' : 'tink');
  if (!M.fast) { game.freeze(b.kind === 'batzooka' ? .14 : .06); if (b.kind === 'batzooka') game.flash('#ffd36a', .15); else game.flash('#ffffff', .05, .5); game.shake(b.kind === 'batzooka' ? 6 : 1.5); for (const I of game.players) I.rumble(b.Q, .12); }
  meterGain(M.half, 6 + 9 * b.Q, 'contact');
  for (const r of M.runners) { r.startBase = r.base; r.startX = r.x; r.startY = r.y; }
  if (M.derby) { setPhase('inPlay'); return; }
  startRunners(); assignFielders(); pickControlled();
  setPhase('inPlay');
}
function inPlayStep(dt) {
  const b = M.ball;
  if (M.derby) return derbyBallStep(dt);
  if (b.mode === 'batted') {
    const ev = ballStep(b, dt, false);
    if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 24) b.trail.shift(); }
    hazardBall(b, dt);
    if (ev === 'homer' || ev === 'pole') return homeRun(ev === 'pole');
    if (ev === 'grd') return groundRuleDouble();
    if (ev === 'outFoul' || (b.fair === false && (b.bounced || b.stopped))) return foulBall();
    if (ev === 'fence') { emit('fenceHit', {}); sfx('clang'); assignFielders(true); }
    if (b.bounced && !b.reassigned) { b.reassigned = true; assignFielders(true); }
    M.retarget = (M.retarget || 0) - dt; if (M.retarget <= 0) { M.retarget = .25; const ch = M.fielders.find(f => f.job === 'chase'); if (ch) { const pr = predict(b, 4); ch.it = interceptOf(ch, pr, 0); } }
    if (M.play) M.play.maxR = Math.max(M.play.maxR, rOf(b.x, b.y));
  } else if (b.mode === 'thrown') thrownStep(b, dt);
  if (b.mode === 'held') { const F = b.holder; if (F) holderStep(F, dt); if (M.ball.foulDead) return foulBall(); }
  fieldersStep(dt);
  runnersStep(dt);
  if (M.outs >= 3) return endPlay();
  if (M.walkoff) return endPlay();
  // over: the ball held in the infield (or by the pitcher) and nobody running for 0.6 s
  const moving = M.runners.some(r => r.state === 'running' || r.state === 'returning' || r.delay > 0);
  const h = holderF();
  if (h && !moving && (rOf(h.x, h.y) < 470 || h.pos === 'P')) { M.quiet = (M.quiet || 0) + dt; if (M.quiet > .6 || M.fast) return endPlay(); } else M.quiet = 0;
  if (h && moving && h.hold > 4 && rOf(h.x, h.y) < 470) { // a rundown that never ends: the runner takes the nearer base
    for (const r of M.runners) if (r.state === 'running' || r.state === 'returning') { const nb = runnerTimeLeft(r) < 1.5 ? (r.state === 'returning' ? r.tagBase : r.target) : r.base; r.base = nb; if (nb === 4) scoreRun(r); else placeRunner(r); }
  }
  if (M.play && (M.play.t > 20 || (M.play.t > 9 && h && rOf(h.x, h.y) < 470))) { for (const r of M.runners) if (r.state === 'running' || r.state === 'returning') { r.base = Math.max(r.base, r.state === 'returning' ? r.tagBase : r.base); if (r.base === 4) scoreRun(r); else placeRunner(r); } endPlay(); }
}
function fieldersIdle(dt) {
  for (const F of M.fielders) { const dx = F.homeX - F.x, dy = F.homeY - F.y, d = Math.hypot(dx, dy); if (d > 3) { F.x += dx / d * Math.min(d, 90 * dt); F.y += dy / d * Math.min(d, 90 * dt); F.facing = Math.atan2(dy, dx); } F.vx = d > 3 ? dx / d * 90 : 0; F.vy = d > 3 ? dy / d * 90 : 0; F.z = Math.max(0, F.z - 200 * dt); }
}
function foulBall() {
  M.ball.mode = 'dead'; sfx('ump');
  M.runners = M.runners.filter(r => r.p !== (M.play && M.play.batter) && r.state !== 'out');
  for (const r of M.runners) { r.base = r.startBase; placeRunner(r); r.steal = false; }
  const c = callFoul(M.ball.kind === 'bunt'); M.play = null; M.cam = 'broadcast';
  for (const F of M.fielders) F.hasBall = false;
  endPitch(c);
}
function groundRuleDouble() {
  M.ball.mode = 'dead'; emit('groundRuleDouble', {});
  const bat = M.play.batter;
  for (const r of M.runners.filter(r => r.state !== 'out' && r.state !== 'scored')) {
    if (r.p === bat) { r.base = 2; placeRunner(r); continue; }
    const nb = r.startBase + 2; if (nb >= 4) scoreRun(r); else { r.base = nb; placeRunner(r); }
  }
  for (const r of M.runners) if (r.p === bat) r.reached = 2;
  endPlay();
}
function homeRun(pole) {
  const b = M.ball; b.mode = 'homer'; b.homerT = 0;
  const dist = carryFeet(b), bat = M.play.batter;
  M.play.hr = { dist, pole, batzooka: b.kind === 'batzooka' };
  pStat(bat).longest = Math.max(pStat(bat).longest, dist);
  emit('homer', { batter: bat, dist, batzooka: b.kind === 'batzooka', pole, x: b.x, y: b.y, team: M.half });
  meterGain(M.half, 25, 'homer');
  M.cam = M.fast ? 'broadcast' : 'moonshot'; setPhase('homer');
  if (!M.fast) { game.flash('#fff6c0', .1); sting('homer'); }
}
function homerStep(dt) {
  const b = M.ball, slow = M.phaseT < 2.2 && !M.fast;
  game.timeScale = slow ? .45 * TUNE.gameSpeed : TUNE.gameSpeed;
  if (b.z > -20) { b.vz -= 520 * M.park.gravityMul * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 30) b.trail.shift(); } }
  if (M.phaseT > 2.2 && M.cam === 'moonshot') { M.cam = 'broadcast'; emit('fireworks', { x: b.x, y: b.y }); }
  // the trot: the batter and runners jog the bases
  if (M.phaseT > 2.2 || M.fast) for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored') {
    if (r.state === 'onBase' || r.state === 'running') { r.state = 'running'; r.forced = false; r.order = 'go'; }
    if (r.delay > 0) r.delay = 0;
    const bp = basePos(r.target), dx = bp.x - r.x, dy = bp.y - r.y, d = Math.hypot(dx, dy), sp = 260;
    if (d <= sp * dt || M.fast) { r.x = bp.x; r.y = bp.y; r.base = r.target; if (r.target >= 4) scoreRun(r); else r.target++; }
    else { r.x += dx / d * sp * dt; r.y += dy / d * sp * dt; r.facing = Math.atan2(dy, dx); }
  }
  fieldersIdle(dt * .5);
  const left = M.runners.some(r => r.state !== 'out' && r.state !== 'scored');
  if ((!left && M.phaseT > 2.5) || M.phaseT > 9 || (M.phaseT > 2.4 && skipPressed())) {
    for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored') scoreRun(r);
    game.timeScale = TUNE.gameSpeed; endPlay();
  }
}
/** the play is over: what the batter got, then the next batter (or the side retired, or the end) */
function endPlay() {
  const P_ = M.play; game.timeScale = TUNE.gameSpeed;
  if (P_ && !P_.steal) {
    const bat = P_.batter, st = pStat(bat), br = M.runners.find(r => r.p === bat);
    st.ab++;
    let hit = 0;
    if (P_.hr) hit = 4;
    else if (br && br.state !== 'out' && !P_.caughtFly && !P_.error) hit = br.state === 'scored' ? 4 : br.reached || br.base || 1;
    if (P_.outs.some(o => o.r && o.r.p !== bat && o.force)) hit = 0;
    if (hit) { offense().hits++; st.h++; if (hit === 2) st.d++; if (hit === 3) st.tr++; if (hit === 4) st.hr++; P_.hit = hit; emit('hit', { bases: hit, batter: bat, inside: hit === 4 && !P_.hr }); meterGain(M.half, hit === 1 ? 10 : hit < 4 ? 15 : 0, 'hit'); }
    nextBatter();
  }
  for (const r of M.runners) { r.steal = false; if (r.state === 'running' || r.state === 'returning') { r.base = r.state === 'returning' ? r.tagBase : r.base; placeRunner(r); } }
  M.runners = M.runners.filter(r => r.state !== 'out' && r.state !== 'scored');
  for (const r of M.runners) { r.forced = false; r.mustTag = false; r.order = null; r.slid = false; r.delay = 0; }
  M.lastPlay = P_; M.play = null; M.quiet = 0; M.cpuStealDone = false;
  if (M.ball) M.ball.mode = M.ball.mode === 'homer' ? 'dead' : M.ball.mode;
  for (const F of M.fielders) { F.job = 'idle'; F.human = false; F.runTo = null; }
  checkWalkoff();
  emit('playOver', { hit: P_ && P_.hit });
  if (M.pendingRhubarb && !M.fast) { M.pendingRhubarb = false; startRhubarb(null, null); return; }
  if (P_ && P_.big && !M.fast && !M.lesson && !M.derby && (game.settings.replays || 'big') !== 'off' && REPLAY_LOG.length > 10) return startReplay();
  setPhase('playOver');
}
function playOverDone() {
  if (M.over) return toFinal();
  if (M.outs >= 3) return toHalfEnd();
  M.ball = null; M.cam = 'plate'; setPhase('walkUp');
}
function toHalfEnd() {
  M.cam = 'broadcast'; setPhase('halfEnd'); M.show = M.shows && !M.fast && !M.derby && !M.lesson ? pickShow() : null; sting('inning');
}
function halfEndDone() {
  M.show = null;
  if (halfOver() || M.over) return toFinal();
  setPhase('halfStart'); halfStartSetup(); M.cam = 'plate';
}
function toFinal() {
  if (!M.over) { M.over = true; M.winner = M.teams[0].runs > M.teams[1].runs ? 0 : 1; emit('gameEnd', { winner: M.winner }); }
  setPhase('final'); game.timeScale = TUNE.gameSpeed;
  if (M.onEnd) { const f = M.onEnd; M.onEnd = null; f(M); }
}

/* ===== 21-draw.js ===== */
/* CAMERAS AND THE WORLD: the Plate Cam (Mode 7 from behind the catcher: the floor is the park, the sky its Backdrop, rigs
 * and props as billboards, the fence and stands as projected quads), the Broadcast Cam (a three-quarter ground view of
 * the park's TileMap) and the Moonshot Cam (Mode 7 chasing a home run). Rigs are animated here (cosmetic only). */
const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 52, 1, 1), HIGHVIEW = new E.View('high', 'High', 0, 70, 1, 1);
E.VIEWS.broadcast = BROADCAST; E.VIEWS.high = HIGHVIEW;
const fieldView = () => ({ broadcast: 'broadcast', high: 'high', iso: 'iso' })[game.settings.fieldCam || 'broadcast'] || 'broadcast';
const SWING_SPEC = { rel: true, hand: 'both', a0: 2.3, a1: -2.5, z0: -1, z1: -3, reach: 6, lunge: 2.2, twist: 2.2, lean: .25, hold: .35 };
const BUNT_SPEC = { rel: true, hand: 'both', a0: .3, a1: .3, z0: -2, z1: -2, reach: 4, lunge: 0, hold: 1 };
const PITCH_SPEC = { rel: true, hand: 'R', a0: -2.6, a1: 1.2, z0: 5, z1: -3, reach: 7, lunge: 2.4, lean: .6, twist: 1.4, crouch: .2 };
const THROW_SPEC = E.MOVES && E.MOVES.throw ? E.MOVES.throw : PITCH_SPEC;
const UMP = { rig: null };

/* ---- rig animation (cosmetic) ---- */
function animateRigs(dt) {
  if (!M || HEADLESS && !BZ.cosmetic) return;
  const t = M.t;
  for (const F of M.fielders) {
    if (!F.rig) continue;
    let attack = null, pose = null;
    if (F.pos === 'P' && (M.phase === 'windup' || (M.phase === 'flight' && M.pitch && M.pitch.t < .35))) {
      const W = M.windT || .9, tt = M.phase === 'windup' ? M.phaseT : W + M.pitch.t;
      attack = tt < W ? { spec: PITCH_SPEC, phase: 'wind', u: clamp(tt / W, 0, 1) } : tt < W + .1 ? { spec: PITCH_SPEC, phase: 'active', u: (tt - W) / .1 } : { spec: PITCH_SPEC, phase: 'recover', u: clamp((tt - W - .1) / .25, 0, 1) };
    }
    if (F.throwAnim > 0) { F.throwAnim -= dt; attack = { spec: THROW_SPEC, phase: F.throwAnim > .2 ? 'active' : 'recover', u: F.throwAnim > .2 ? 1 - (F.throwAnim - .2) / .15 : 1 - F.throwAnim / .2 }; }
    if (F.pos === 'C' && ['select', 'windup', 'flight', 'afterPitch', 'walkUp'].includes(M.phase)) pose = 'crouch';
    if (M.phase === 'playOver' && M.lastPlay && M.lastPlay.caughtFly && F.hasBall) pose = 'cheer';
    F.rig.update(dt, { x: F.x, y: F.y, z: F.z, vx: F.vx, vy: F.vy, facing: F.facing, attack, pose, air: F.z > 2, climb: F.climb > 0 && F.z > 2, vz: F.vz, down: F.dive > 0 ? clamp(F.dive / .3, 0, 1) * .8 : 0, sprint: F.turbo });
  }
  for (const r of M.runners) {
    if (r.state === 'out' || r.state === 'scored') continue;
    const rig = r.rig || (r.rig = makeRig(r.p, 'run'));
    const moving = r.state === 'running' || r.state === 'returning', sp = moving ? rSpeed(r) : 0, f = r.facing || 0;
    rig.update(dt, { x: r.x, y: r.y, z: 0, vx: Math.cos(f) * sp, vy: Math.sin(f) * sp, facing: f, down: r.slide > 0 ? .7 : 0, sprint: r.turbo, pose: M.phase === 'homer' && moving ? null : null });
  }
  // the batter: stance and waggle, the swing (or the squared bunt)
  const b = batterNow(), rig = makeRig(b, 'bat'), lefty = b.bats === 'L', bx = HX + (lefty ? 18 : -18), by = HY - 4;
  let attack = null;
  if (M.swing) { const S = SWINGS[M.swing.kind] || SWINGS.contact, el = (M.pitch ? M.pitch.t : 0) - M.swing.at, D_ = S.delay || .1;
    attack = M.swing.kind === 'bunt' ? { spec: BUNT_SPEC, phase: 'active', u: 1 } : el < D_ * .6 ? { spec: SWING_SPEC, phase: 'wind', u: clamp(el / (D_ * .6), 0, 1) } : el < D_ + .06 ? { spec: SWING_SPEC, phase: 'active', u: clamp((el - D_ * .6) / (D_ * .4 + .06), 0, 1) } : { spec: SWING_SPEC, phase: 'recover', u: clamp((el - D_ - .06) / .35, 0, 1) }; }
  else if (M.bunting) attack = { spec: BUNT_SPEC, phase: 'active', u: 1 };
  const atBat = ['walkUp', 'select', 'windup', 'flight', 'afterPitch'].includes(M.phase);
  if (atBat) rig.update(dt, { x: bx, y: by, z: 0, vx: 0, vy: 0, facing: lefty ? Math.PI : 0, attack, crouch: .3, expr: M.armed ? 'shout' : b.look.expr || null });
  M.batRig = atBat ? { rig, x: bx, y: by } : null;
  if (!UMP.rig) UMP.rig = castRig('ump');
  UMP.rig.update(dt, { x: HX, y: HY + 30, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, pose: 'crouch' });
  if (M.rhubarb) for (const f of M.rhubarb.fighters) if (!f.rig) f.rig = makeRig(f.p, 'brawl');
}

/* ---- the Plate Cam and the Moonshot Cam (Mode 7) ---- */
function plateCam(kit) {
  const b = batterNow(), side = b.bats === 'L' ? -4 : 4, m7 = kit.m7;
  const close = game.settings.plateCam === 'close';
  if (M.cam === 'moonshot' && M.ball) {
    const B = M.ball, a = Math.atan2(B.vy, B.vx), back = 70;
    const h = clamp(B.z + 12, 10, 170), pitch = clamp(Math.atan2(h - B.z, back) * 57.3, -20, 30);
    m7.cam = { x: B.x - Math.cos(a) * back, y: B.y - Math.sin(a) * back, h, angle: a, pitch, fov: 62 };
  } else m7.cam = { x: HX + side, y: HY + (close ? 52 : TUNE.plateDist), h: close ? 30 : TUNE.plateHeight, angle: -Math.PI / 2, pitch: 9, fov: close ? 42 : TUNE.plateFov };
  return m7;
}
function drawPlate(r, kit) {
  const m7 = plateCam(kit), t = game.time, park = kit.park;
  // props, the fence and stands, the poles
  for (const p of kit.props) m7.add(p.x, p.y, 0, (g, sx, sy, k) => drawProp(g, p, sx, sy, k, t));
  const fc = park.fenceCol, tc = park.topCol, sc = park.standCol;
  for (let i = 0; i < kit.fence.length - 1; i++) {
    const a = kit.fence[i], c = kit.fence[i + 1], mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
    m7.add(mx, my, 0, g => {
      const pr = (x, y, z) => m7.project(x, y, z);
      const p0 = pr(a.x, a.y, 0), p1 = pr(c.x, c.y, 0), p2 = pr(c.x, c.y, c.h), p3 = pr(a.x, a.y, a.h); if (!p0 || !p1 || !p2 || !p3) return;
      px.poly(g, [[p0[0], p0[1]], [p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]], i % 2 ? fc : E.shade(fc, .06));
      px.line(g, p3[0], p3[1], p2[0], p2[1], tc, Math.max(1, Math.round(p2[2] * 3)));
    });
    const ux = (a.x - HX) / rOf(a.x, a.y), uy = (a.y - HY) / rOf(a.x, a.y), vx = (c.x - HX) / rOf(c.x, c.y), vy = (c.y - HY) / rOf(c.x, c.y), Ra = rOf(a.x, a.y), Rc = rOf(c.x, c.y);
    m7.add(mx + ux * 60, my + uy * 60, 0, g => {
      const pr = (u, v, R0, z) => m7.project(HX + u * R0, HY + v * R0, z);
      const q0 = pr(ux, uy, Ra + 40, 6), q1 = pr(vx, vy, Rc + 40, 6), q2 = pr(vx, vy, Rc + 90, 60), q3 = pr(ux, uy, Ra + 90, 60); if (!q0 || !q1 || !q2 || !q3) return;
      px.poly(g, [[q0[0], q0[1]], [q1[0], q1[1]], [q2[0], q2[1]], [q3[0], q3[1]]], i % 2 ? sc : E.shade(sc, -.08));
      const b0 = pr(ux, uy, Ra + 40, 0), b1 = pr(vx, vy, Rc + 40, 0); if (b0 && b1) px.poly(g, [[b0[0], b0[1]], [b1[0], b1[1]], [q1[0], q1[1]], [q0[0], q0[1]]], E.shade(sc, -.25));
    });
  }
  for (const s of [-1, 1]) { const R0 = fenceR(park, s * D45), x = HX + Math.sin(s * D45) * R0, y = HY - Math.cos(s * D45) * R0; m7.add(x, y, 0, g => { const a = m7.project(x, y, 0), c = m7.project(x, y, 150); if (a && c) px.line(g, a[0], a[1], c[0], c[1], '#ffd040', Math.max(1, Math.round(a[2] * 3))); }); }
  // the foul walls and their stands along the lines
  for (const s of [-1, 1]) for (let i = 0; i < 12; i++) {
    const al0 = 90 + i * 60, al1 = al0 + 60, lx = d => HX + s * d / Math.SQRT2, ly = d => HY - d / Math.SQRT2, nx = s / Math.SQRT2, ny = 1 / Math.SQRT2;
    m7.add(lx(al0 + 30) + nx * 100, ly(al0 + 30) + ny * 100, 0, g => {
      const pr = (d, o, z) => m7.project(lx(d) + nx * o, ly(d) + ny * o, z);
      const w0 = pr(al0, 70, 0), w1 = pr(al1, 70, 0), w2 = pr(al1, 70, 14), w3 = pr(al0, 70, 14), s2 = pr(al1, 140, 56), s3 = pr(al0, 140, 56);
      if (w0 && w1 && w2 && w3) px.poly(g, [[w0[0], w0[1]], [w1[0], w1[1]], [w2[0], w2[1]], [w3[0], w3[1]]], fc);
      if (w2 && w3 && s2 && s3) px.poly(g, [[w3[0], w3[1]], [w2[0], w2[1]], [s2[0], s2[1]], [s3[0], s3[1]]], i % 2 ? sc : E.shade(sc, -.08));
    });
  }
  // the crowd
  const hype = M ? offense().meter / 100 : .3;
  for (const f of kit.fans) m7.add(f.x, f.y, f.z, (g, sx, sy, k) => fanDraw(g, f, sx, sy, k, t, hype));
  // players
  if (M) {
    for (const F of M.fielders) if (F.rig && !(F.pos === 'C' && M.cam === 'plate')) m7.rig(F.rig, F.x, F.y, F.z);
    for (const r of M.runners) if (r.rig && r.state !== 'out' && r.state !== 'scored') m7.rig(r.rig, r.x, r.y, 0);
    if (M.batRig && M.cam === 'plate') m7.rig(M.batRig.rig, M.batRig.x, M.batRig.y, 0);
    // the catcher is out of the shot: his mitt pops into frame on the catch (the umpire is a cut-in on the calls)
    if (M.phase === 'afterPitch' && M.lastCross && M.t - M.lastCross.t < .6) { const c = M.lastCross; m7.add(HX + c.x, PLATE_Y + 10, 0, g => { const p = m7.project(HX + c.x, PLATE_Y + 10, Math.max(2, c.z - 3)); if (p) { px.disc(g, p[0], p[1], Math.max(3, 4 * p[2]), '#7a3a1a'); px.disc(g, p[0] - p[2], p[1] - p[2], Math.max(2, 2.6 * p[2]), '#a85a2a'); } }); }
    hazardDrawM7(m7, t);
    const pt = M.pitch, b = M.ball;
    if (pt && (M.phase === 'flight') && !(b && b.mode === 'batted')) {
      const u = pt.t / pt.T, p = pitchPos(pt, u), hidden = pitchHidden(pt, u);
      if (!hidden) m7.add(p.x, p.y, p.z, (g, sx, sy, k) => ballDraw(g, sx, sy, k, pt.def.trail, pt.def.pull ? .5 : 1, pt.t));
      else m7.add(p.x, p.y, p.z, (g, sx, sy, k) => { if (RF() < .3) px.blend(g, .3, 'add', () => px.disc(g, sx, sy, Math.max(1, 2 * k), '#c0f0ff')); });
      m7.add(p.x, p.y, 0, (g, sx, sy, k) => px.blend(g, .35, 'multiply', () => px.disc(g, sx, sy, Math.max(1, 1.6 * k), '#202020')));
    }
    if (b && (b.mode === 'batted' || b.mode === 'homer' || b.mode === 'thrown' || b.mode === 'dead')) {
      if (!b.hidden) m7.add(b.x, b.y, Math.max(0, b.z), (g, sx, sy, k) => ballDraw(g, sx, sy, k, b.kind === 'batzooka' ? 'fire' : null, 1, b.t));
      m7.add(b.x, b.y, 0, (g, sx, sy, k) => px.blend(g, .35, 'multiply', () => px.disc(g, sx, sy, Math.max(1, 1.6 * k), '#202020')));
    }
  }
  m7.draw(r);
  if (M && M.cam === 'plate') r.overlay(g => zoneOverlay(g, m7));
}
function fanDraw(g, f, sx, sy, k, t, hype) {
  const C = BZ.CROWD, jumpSide = C.jump > 0 && (M ? (C.side === 1 ? f.shirt !== '#3b82f6' : true) : true);
  const wave = C.waveOn ? Math.max(0, Math.sin(Math.atan2(f.y - HY, f.x - HX) * 3 - C.wave * 3)) : 0;
  const bob = (Math.sin(t * 3 + f.ph) * .5 + .5) * (1 + hype * 2) + (jumpSide ? Math.abs(Math.sin(t * 9 + f.ph)) * 4 : 0) + wave * 5;
  const h = Math.max(1, 6 * k), w = Math.max(1, 3 * k), y = sy - bob * k;
  if (h < 1.5) { px.dot(g, sx, y - 1, f.shirt); return; }
  px.rect(g, sx - w / 2, y - h, w, h * .7, f.shirt); px.disc(g, sx, y - h - w * .4, Math.max(.6, w * .45), f.skin);
  if (f.cap) px.rect(g, sx - w / 2, y - h - w * .8, w, Math.max(1, w * .35), M ? M.teams[1].def.chip : '#1e2a5a');
  if (wave > .6 || (jumpSide && C.jump > 1)) { px.line(g, sx - w / 2, y - h, sx - w, y - h - w * 1.4, f.skin); px.line(g, sx + w / 2, y - h, sx + w, y - h - w * 1.4, f.skin); }
}
function ballDraw(g, sx, sy, k, trail, scale = 1, tt = 0) {
  const rad = Math.max(1.2, 1.6 * k * scale);
  if (trail === 'fire') { px.blend(g, .7, 'add', () => { for (let i = 1; i < 5; i++) px.disc(g, sx + (RF() - .5) * rad, sy + i * rad * .6, rad * (1.2 - i * .18), i < 2 ? '#ffe060' : '#ff6a1a'); }); }
  else if (trail === 'laser') px.blend(g, .8, 'add', () => px.disc(g, sx, sy, rad * 1.8, '#ff2a4a'));
  else if (trail === 'void') px.disc(g, sx, sy, rad * 2.2, '#1a0a2a');
  else if (trail === 'spark') px.blend(g, .7, 'add', () => { px.line(g, sx - rad * 2, sy - rad, sx + rad * 2, sy + rad, '#7ff0ff'); });
  else if (trail === 'wave') px.blend(g, .5, 'add', () => px.disc(g, sx, sy + rad, rad * 2.4, '#3ac0ff'));
  else if (trail === 'popcorn') px.blend(g, .7, 'normal', () => { for (let i = 0; i < 3; i++) px.disc(g, sx + Math.sin(tt * 20 + i * 2) * rad * 2, sy + Math.cos(tt * 20 + i * 2) * rad * 2, rad * .6, '#fff4c0'); });
  else if (trail === 'ember') px.blend(g, .6, 'add', () => px.disc(g, sx, sy - rad, rad * 1.4, '#ff8a3a'));
  px.disc(g, sx, sy, rad, '#f4f4f0'); if (rad > 2) { px.line(g, sx - rad * .5, sy - rad * .6, sx - rad * .3, sy + rad * .6, '#d83a3a'); px.line(g, sx + rad * .5, sy - rad * .6, sx + rad * .3, sy + rad * .6, '#d83a3a'); }
  px.dot(g, sx - rad * .4, sy - rad * .4, '#ffffff');
}
/* the zone, the reticle, the pitch target and its release ring, the crossing dot (projected on the plate's plane) */
function zoneOverlay(g, m7) {
  const b = batterNow(), Z = zoneOf(b), P_ = (x, z) => m7.project(HX + x, PLATE_Y, z);
  const show = game.settings.zone || 'pitch', live = ['windup', 'flight'].includes(M.phase) || (M.phase === 'select');
  const human = !autoBat() || !autoPit();
  if (show === 'always' || M.cheats.showZone || (show === 'pitch' && live && human)) {
    const c = ['#ffffff'], a = P_(Z.x0, Z.z0), d = P_(Z.x1, Z.z1); if (a && d) {
      px.blend(g, .5, 'normal', () => { for (let i = 0; i <= 3; i++) { const xx = lerp(a[0], d[0], i / 3), yy = lerp(a[1], d[1], i / 3); px.line(g, xx, a[1], xx, d[1], c[0]); px.line(g, a[0], yy, d[0], yy, c[0]); } });
    }
  }
  // the batter's reticle (human batting, or the dev's view of the CPU's)
  if (!autoBat() || M.cheats.showAI) {
    const kind = M.armed ? 'batzooka' : 'contact', BI = batIn(), power = BI && BI.down('west'), S = SWINGS[power ? 'power' : kind];
    const rr = S.r * statF(b.con) * TUNE.sweetSpot * (batIn() ? M.diff.assist * (game.settings.batAssist === 'big' ? 1.25 : 1) : 1), c = P_(M.reticle.x, M.reticle.z), e = P_(M.reticle.x + rr, M.reticle.z);
    if (c && e) { const rad = Math.abs(e[0] - c[0]), col = M.armed ? '#ff8a2a' : power ? '#ff4a4a' : '#ffe680';
      px.blend(g, .35, 'normal', () => ringDraw(g, c[0], c[1], rad * 1.6, '#ffffff'));
      ringDraw(g, c[0], c[1], rad, col); if (power || M.armed) ringDraw(g, c[0], c[1], rad - 1, col); px.disc(g, c[0], c[1], 1, col);
      if (M.armed) px.blend(g, .5, 'add', () => { for (let i = 0; i < 8; i++) { const a = game.time * 6 + i * .8; px.disc(g, c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad, 1.5, '#ffb030'); } }); }
  }
  // the pitcher's target marker and release ring
  if (!autoPit() && (M.phase === 'windup')) {
    const c = P_(M.target.x, M.target.z), e = P_(M.target.x + 1.6, M.target.z); if (c && e) {
      const rad = Math.max(2, Math.abs(e[0] - c[0])); ringDraw(g, c[0], c[1], rad, '#7aa7ff'); px.line(g, c[0] - rad - 2, c[1], c[0] + rad + 2, c[1], '#7aa7ff'); px.line(g, c[0], c[1] - rad - 2, c[0], c[1] + rad + 2, '#7aa7ff');
      const rs = M.windT - .45, u = clamp((M.phaseT - rs) / .45, 0, 1); if (M.phaseT >= rs) ringDraw(g, c[0], c[1], rad + (1 - u) * 26, u > .9 ? '#4fe0b0' : '#ffffff');
    }
  }
  if (M.lastCross && M.t - M.lastCross.t < 1.5 && M.phase !== 'flight') { const c = P_(M.lastCross.x, M.lastCross.z); if (c) { px.disc(g, c[0], c[1], 2.5, '#ff3a3a'); px.disc(g, c[0], c[1], 1.2, '#ffffff'); } }
  // dev: the predicted path and the timing bar
  if (M.cheats.showAI && M.pitch && M.phase === 'flight') { for (let u = 0; u <= 1; u += .05) { const p = pitchPos(M.pitch, u), q = m7.project(p.x, p.y, p.z); if (q) px.dot(g, q[0], q[1], '#ff00ff'); } }
}
function ringDraw(g, cx, cy, r, c) { const n = Math.max(12, Math.round(r * 2)); for (let i = 0; i < n; i++) { const a = i / n * TAU; px.dot(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); } }
BZ.zoneFromPointer = () => {
  if (!M || M.cam !== 'plate' || HEADLESS) return null;
  const kit = PARK_CACHE[M.parkId]; if (!kit) return null; const m7 = kit.m7, p = game.input.pointer(); if (!p) return null;
  const o = m7.project(HX, PLATE_Y, 17), ex = m7.project(HX + 1, PLATE_Y, 17), ez = m7.project(HX, PLATE_Y, 18); if (!o || !ex || !ez) return null;
  return [(p[0] - o[0]) / (ex[0] - o[0]), 17 + (p[1] - o[1]) / (ez[1] - o[1])];
};

/* ---- the Broadcast Cam ---- */
const CAMS = { x: HX, y: HY - 300, z: 1, tz: 1 };
function broadcastFocus(dt) {
  if (!M) return;
  let pts = [];
  const b = M.ball;
  if (M.phase === 'rhubarb' && M.rhubarb) { pts = M.rhubarb.fighters.map(f => [f.x, f.y]); }
  else if (M.phase === 'halfEnd' && M.show) { const s = M.show; pts = s.kind === 'race' ? [[HX, HY - 900], [HX, HY - 600]] : s.kind === 'tshirt' ? [[HX, HY - 100], [HX - 250, HY - 250]] : [[HX - 150, HY - 200], [HX + 150, HY - 250]]; }
  else if (b && (b.mode === 'batted' || b.mode === 'homer')) { pts.push([b.x, b.y]); if (b.pred && b.mode === 'batted' && !b.bounced) pts.push([b.pred.land.x, b.pred.land.y]); const ch = M.fielders.find(f => f.job === 'chase'); if (ch) pts.push([ch.x, ch.y]); }
  else if (b && b.mode === 'thrown') { pts.push([b.x, b.y], [b.toPt.x, b.toPt.y]); }
  else if (b && b.mode === 'held' && b.holder) { pts.push([b.holder.x, b.holder.y]); const lead = M.runners.filter(r => r.state === 'running').sort((a, c) => c.target - a.target)[0]; if (lead) pts.push([lead.x, lead.y], [basePos(lead.target).x, basePos(lead.target).y]); }
  if (!pts.length) pts = [[HX, HY - 212], [HX, HY]];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, W = (game.W || 427) - 96, H = ((game.H || 240) - 96) / Math.sin(52 * Math.PI / 180);
  const z = clamp(Math.min(W / Math.max(1, x1 - x0), H / Math.max(1, y1 - y0)), .5, 1.1) * TUNE.fieldZoom;
  const k = 1 - Math.exp(-dt / .15); CAMS.x += (cx - CAMS.x) * k; CAMS.y += (cy - CAMS.y) * k; CAMS.z += (z - CAMS.z) * k;
}
function drawBroadcast(r, kit) {
  const park = kit.park, t = game.time, map = kit.map;
  const zq = Math.round(clamp(CAMS.z, .4, 2.2) * 20) / 20; if (Math.abs((game.zoom || 1) - zq) > .001) game.setZoom(zq);
  game.focus(CAMS.x, CAMS.y, 0);
  if (park.night) { LIGHTS.enabled = true; LIGHTS.ambient = park.ambient; for (const p of kit.props) if (p.kind === 'tower') LIGHTS.add(p.x, p.y, p.h, 900, .9, { color: park.id === 'caldera' ? '#ffb070' : '#e8f0ff' }); if (park.ground === 'lava') for (const f of kit.fence) if (Math.round(f.th * 20) % 4 === 0) LIGHTS.add(f.x, f.y, 10, 120, .5, { color: '#ff6a1a' }); }
  else LIGHTS.enabled = false;
  map.drawFloor(r); map.queueWalls(r);
  for (const p of kit.props) r.queue(p.x, p.y, 0, g => { const s = r.w(p.x, p.y, 0); drawProp(g, p, s[0], s[1], (r.view.zoom || 1) * .9, t); }, { bias: 2 });
  // fans, in groups
  const hype = M ? offense().meter / 100 : .3, zf = r.view.zoom || 1;
  for (let i = 0; i < kit.fans.length; i += 10) { const f0 = kit.fans[i]; r.queue(f0.x, f0.y, f0.z, g => { for (let j = i; j < Math.min(i + 10, kit.fans.length); j++) { const f = kit.fans[j], s = r.w(f.x, f.y, f.z); fanDraw(g, f, s[0], s[1], zf * .9, t, hype); } }); }
  // the bases
  for (let k = 1; k <= 3; k++) { const bp = basePos(k); r.queue(bp.x, bp.y, 0, g => { const s = r.w(bp.x, bp.y, 0); px.rect(g, s[0] - 3 * zf, s[1] - 2 * zf, 6 * zf, 4 * zf, '#ffffff'); }, { bias: -5 }); }
  if (!M) return;
  if (M.replay) { replayDraw(r); return; }
  for (const F of M.fielders) if (F.rig) { r.shadow(F.x, F.y, 5); r.actor(F.x, F.y, F.z, (g, ox, oy) => F.rig.draw(g, ox, oy, r.view)); }
  for (const R_ of M.runners) if (R_.rig && R_.state !== 'out' && R_.state !== 'scored') { r.shadow(R_.x, R_.y, 5); r.actor(R_.x, R_.y, 0, (g, ox, oy) => R_.rig.draw(g, ox, oy, r.view)); }
  if (M.batRig) r.actor(M.batRig.x, M.batRig.y, 0, (g, ox, oy) => M.batRig.rig.draw(g, ox, oy, r.view));
  if (UMP.rig && M.phase !== 'rhubarb') r.actor(HX, HY + 30, 0, (g, ox, oy) => UMP.rig.draw(g, ox, oy, r.view));
  if (M.rhubarb) { for (const f of M.rhubarb.fighters) if (f.rig) { r.shadow(f.x, f.y, 5); r.actor(f.x, f.y, 0, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view)); }
    // fight clouds where the AI scrums
    for (let i = 0; i < 3; i++) { const cx = HX + Math.sin(t * .7 + i * 2) * 70, cy = HY - 60 + Math.cos(t * .5 + i) * 40; r.queue(cx, cy, 10, g => { const s = r.w(cx, cy, 10); for (let j = 0; j < 6; j++) px.disc(g, s[0] + Math.sin(t * 7 + j) * 9 * zf, s[1] + Math.cos(t * 6 + j * 1.7) * 6 * zf, (7 + Math.sin(t * 9 + j) * 2) * zf, j % 2 ? '#d8d0c0' : '#b8b0a0'); if (Math.floor(t * 6 + i) % 3 === 0) E.font.text(g, ['POW', 'BONK', 'OOF'][i], s[0], s[1] - 18 * zf, '#ffe060', { align: 'center' }); }); } }
  const b = M.ball;
  if (b && b.mode !== 'dead') {
    if (b.pred && b.mode === 'batted' && !b.bounced && b.vz !== 0) { const L = b.pred.land; r.decal(() => r.groundRing(L.x, L.y, 7 + Math.sin(t * 8) * 2, '#ffe060')); r.queue(L.x, L.y, 0, g => { const s = r.w(L.x, L.y, 0); px.line(g, s[0] - 4, s[1] - 3, s[0] + 4, s[1] + 3, '#ffe060'); px.line(g, s[0] - 4, s[1] + 3, s[0] + 4, s[1] - 3, '#ffe060'); }); }
    r.shadow(b.x, b.y, 2.5, .5);
    if (!b.hidden) {
      const dz = drawZ(b.z);
      if (b.trail && b.trail.length > 2 && (Math.hypot(b.vx, b.vy, b.vz) > 450 || b.kind === 'batzooka')) r.queue(b.x, b.y, dz, g => { for (let i = 0; i < b.trail.length; i += 2) { const [x, y, z] = b.trail[i], s = r.w(x, y, drawZ(z)); px.blend(g, .4, 'add', () => px.disc(g, s[0], s[1], 1 + i / 10, b.kind === 'batzooka' ? '#ff8a2a' : '#ffffff')); } }, { emissive: true });
      if (b.laser && b.mode === 'thrown') r.queue(b.x, b.y, dz, g => { const a = r.w(b.from.x, b.from.y, b.from.z), c = r.w(b.x, b.y, b.z); px.blend(g, .8, 'add', () => px.line(g, a[0], a[1], c[0], c[1], '#ff2a4a', 2)); }, { emissive: true });
      r.queue(b.x, b.y, dz, g => { const s = r.w(b.x, b.y, dz); ballDraw(g, s[0], s[1], zf * 1.2, b.kind === 'batzooka' ? 'fire' : null, 1, b.t); }, { emissive: b.kind === 'batzooka' });
    }
  }
  // throw targets: a ring per base with its button, when the human's fielder holds the ball
  const h = holderF(), I = defHumanInput();
  if (h && h.human && I && M.phase === 'inPlay') for (let k = 1; k <= 4; k++) { const bp = basePos(k); r.decal(() => r.groundRing(bp.x, bp.y, 12 + (BZ.hoverBase === k ? 4 : 0), '#ffffff')); r.queue(bp.x, bp.y, 30, g => { const s = r.w(bp.x, bp.y, 30); glyph(g, I, I.lastDevice === 'keyboard' ? 'num' + k : ['east', 'north', 'west', 'south'][k - 1], s[0] - 5, s[1] - 5, 11); }); }
  for (const F of M.fielders) if (F.human) { const I2 = defHumanInput(); r.queue(F.x, F.y, 46, g => { const s = r.w(F.x, F.y, 46); px.poly(g, [[s[0] - 4, s[1] - 5], [s[0] + 4, s[1] - 5], [s[0], s[1]]], I2 ? I2.color || '#4a8aff' : '#4a8aff'); }); }
  hazardDrawBroadcast(r, t);
  if (M.show) showDraw(r, M.show, t);
  for (const p of BZ.CROWD.pops) r.textAt(p.x, p.y, p.z, p.text, '#ffe680');
}
BZ.mouseWorld = () => { const g = game.mouseGround && game.mouseGround(); return g ? [g[0] !== undefined ? g[0] : g.x, g[1] !== undefined ? g[1] : g.y] : null; };
function drawMatchWorld(r) {
  if (!M) return;
  const kit = parkKit(M.parkId);
  if (M.cam === 'plate' || M.cam === 'moonshot') { LIGHTS.enabled = false; drawPlate(r, kit); }
  else { if (game.view.id !== fieldView() && game.baseView !== E.VIEWS[fieldView()]) game.setView(fieldView()); drawBroadcast(r, kit); }
}
/* hazards and shows, drawn */
function hazardDrawM7(m7, t) {
  const h = M.hz; if (!h) return;
  for (const g of h.gulls) if (g.blob) m7.add(g.x, g.y, g.z, (G, sx, sy, k) => g.blob.draw(G, Math.round(sx), Math.round(sy), m7.view(k)));
  for (const d of h.drones) if (d.alive && d.blob) m7.add(d.x, d.y, d.z, (G, sx, sy, k) => { d.blob.draw(G, Math.round(sx), Math.round(sy), m7.view(k)); px.blend(G, .5, 'add', () => px.disc(G, sx, sy - 6 * k, Math.max(1, 2 * k), '#e01e3c')); });
  if (h.ventHot > 0 || h.ventWarn > 0) for (const v of h.vents || []) m7.add(v.x, v.y, 0, (G, sx, sy, k) => { const hgt = h.ventHot > 0 ? 120 : 20; px.blend(G, .6, 'add', () => { for (let i = 0; i < 6; i++) px.disc(G, sx + Math.sin(t * 9 + i) * 8 * k, sy - i * hgt / 6 * k, (14 - i) * k, h.ventHot > 0 ? '#ff8a2a' : '#8a8a8a'); }); });
}
function hazardDrawBroadcast(r, t) {
  const h = M.hz; if (!h) return; const zf = r.view.zoom || 1;
  for (const g of h.gulls) if (g.blob) r.actor(g.x, g.y, drawZ(g.z), (G, ox, oy) => g.blob.draw(G, ox, oy, r.view));
  for (const d of h.drones) if (d.alive && d.blob) r.actor(d.x, d.y, drawZ(d.z), (G, ox, oy) => d.blob.draw(G, ox, oy, r.view));
  for (const c of h.craters) r.decal(() => r.groundDisc ? r.groundDisc(c.x, c.y, c.r, '#5a5a66') : null);
  if (h.ventHot > 0 || h.ventWarn > 0) for (const v of h.vents || []) r.queue(v.x, v.y, 0, g => { const s = r.w(v.x, v.y, 0); px.blend(g, .6, 'add', () => { for (let i = 0; i < 6; i++) px.disc(g, s[0] + Math.sin(t * 9 + i) * 8 * zf, s[1] - i * (h.ventHot > 0 ? 18 : 4) * zf, (12 - i) * zf, h.ventHot > 0 ? '#ff8a2a' : '#8a8a8a'); }); }, { emissive: true });
  else for (const v of h.vents || []) r.queue(v.x, v.y, 0, g => { const s = r.w(v.x, v.y, 0); px.disc(g, s[0], s[1], 10 * zf, '#3a2420'); px.disc(g, s[0], s[1], 5 * zf, '#ff6a1a'); }, { emissive: true });
}
const MASCOTS = {};
function mascotOf(id) { if (MASCOTS[id]) return MASCOTS[id]; const m = PARKS[id].mascot; return MASCOTS[id] = new E.Blob({ R: 9, feet: true, mouth: true, wings: !!m.wings, face: 'front', colors: { dk: m.dk, base: m.base, lt: m.lt, eye: '#1a1a1a' } }); }
function showDraw(r, s, t) {
  const u = s.t / s.len;
  if (s.kind === 'race') {
    const ids = [M.parkId, ...PARK_ORDER.filter(p => p !== M.parkId)].slice(0, 3);
    ids.forEach((id, i) => { const bl = mascotOf(id), tripped = i === s.trip && u > .5 && u < .7; const th = -.7 + clamp(u * (1 + i * .08) * (tripped ? .6 : 1), 0, 1) * 1.4, R0 = fenceR(M.park, th) - 24 - i * 12, [ux, uy] = dirOf(th);
      bl.update(1 / 60, { walk: tripped ? 0 : 1, squash: tripped ? -.4 : Math.sin(t * 14 + i) * .15 }); r.actor(HX + ux * R0, HY + uy * R0, 0, (g, ox, oy) => bl.draw(g, ox, oy, r.view)); });
  } else if (s.kind === 'tshirt') {
    for (let i = 0; i < 5; i++) { const k = ((u * 2 + i * .2) % 1), x = lerp(HX, HX + (i - 2) * 160, k), y = lerp(HY - 30, HY - 420 - i * 50, k), z = Math.sin(k * Math.PI) * 140; r.queue(x, y, drawZ(z), g => { const p = r.w(x, y, drawZ(z)); px.rect(g, p[0] - 3, p[1] - 3, 6, 5, ['#e8443a', '#3b82f6', '#f2c230', '#22c55e', '#ffffff'][i]); }); }
    const bl = mascotOf(M.parkId); bl.update(1 / 60, { squash: Math.sin(t * 10) * .2 }); r.actor(HX, HY - 30, 0, (g, ox, oy) => bl.draw(g, ox, oy, r.view));
  } else {
    for (let i = 0; i < 4; i++) { const bl = mascotOf(s.kind === 'dance' ? M.parkId : PARK_ORDER[i]); bl.update(1 / 60, { squash: Math.sin(t * 12 + i) * .3 }); const x = HX - 150 + i * 100, y = HY - 220 + Math.sin(t * 3 + i) * 20; r.actor(x, y, Math.abs(Math.sin(t * 6 + i)) * 10, (g, ox, oy) => bl.draw(g, ox, oy, r.view)); }
  }
}

/* ===== 22-hud.js ===== */
/* HUD, 10-foot rules: big, bold and few things at once, anchored to r.W / r.H with a 12 px safe margin, clear of the
 * corner buttons. Scorebug, meters, the player card, prompts in the last device's glyphs, call stamps, pitch info, the
 * radar, the pitch-select diamond, banners, the line score, timing feedback and the Derby and Rhubarb panels. */
const SAFE = 12;
const STAMPS = [];
function stamp(text, colors, o = {}) { STAMPS.length = 0; STAMPS.push({ text, colors: colors || ['#ffffff', '#ffe680', '#ff9a2a'], t: 0, life: o.life || 1.4, scale: o.scale || 3, sub: o.sub || '', ump: !!o.ump }); }
const GOLD = ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], RED = ['#ffffff', '#ff9a9a', '#e8443a'], BLUE = ['#ffffff', '#a8c8ff', '#3b82f6'], GREEN = ['#ffffff', '#a8ffd0', '#22c55e'];
BZ.bus.on('call', d => { if (!M || M.derby) return; if (d.kind === 'strike') { stamp(d.three ? 'STRIKE THREE!' : 'STEE-RIKE!', RED, { ump: true }); if (!M.fast) babble.say(d.three ? 'STEE-RIIIKE THREE!' : 'STEE-RIIIKE!', 'ump'); } else if (d.kind === 'ball') { stamp(d.four ? 'BALL FOUR' : 'BALL', BLUE, { scale: d.four ? 3 : 2, ump: true }); if (!M.fast) babble.say('BALL!', 'ump'); } else stamp('FOUL BALL', ['#ffffff', '#ffe680', '#c8a040'], { scale: 2, ump: true }); });
BZ.bus.on('out', d => { if (M && d.how !== 'k') stamp('YER OUT!', RED); });
BZ.bus.on('hit', d => stamp(d.bases === 1 ? 'SINGLE!' : d.bases === 2 ? 'DOUBLE!' : d.bases === 3 ? 'TRIPLE!' : 'INSIDE-THE-PARK!', GREEN));
BZ.bus.on('homer', d => stamp(d.batzooka ? 'BATZOOKA!!!' : 'HOME RUN!', GOLD, { scale: 4, life: 2.2, sub: d.dist + ' FT' + (d.golden ? '  x2 GOLDEN!' : '') }));
BZ.bus.on('doublePlay', () => stamp('DOUBLE PLAY!', GOLD));
BZ.bus.on('triplePlay', () => stamp('TRIPLE PLAY!!', GOLD, { scale: 4 }));
BZ.bus.on('groundRuleDouble', () => stamp('GROUND-RULE DOUBLE', GREEN, { scale: 2 }));
BZ.bus.on('error', () => stamp('CLANK! ERROR', RED, { scale: 2 }));
BZ.bus.on('fizzle', () => stamp('FIZZLE!', ['#ffffff', '#c8c8c8', '#6a6a6a']));
BZ.bus.on('walk', () => stamp('TAKE YOUR BASE', BLUE, { scale: 2 }));
BZ.bus.on('hbp', () => stamp('HIT BY PITCH', BLUE, { scale: 2 }));
BZ.bus.on('rhubarbStart', () => stamp('RHUBARB!', RED, { scale: 4, life: 1.6 }));
BZ.bus.on('rhubarbEnd', () => stamp('BREAK IT UP!', BLUE, { scale: 3 }));
BZ.bus.on('catch', d => { if (d.robbed) stamp('ROBBED!', GOLD, { scale: 4 }); else if (d.dive) stamp('WHAT A GRAB!', GREEN); });
BZ.bus.on('meterFull', d => { if (M && d.team === M.half && !M.fast) stamp('BATZOOKA READY!', GOLD, { scale: 2, life: 1.6 }); sfx('ding'); });
BZ.bus.on('bowlOver', d => stamp('COLLISION!', RED, { scale: 3, sub: d.won ? 'SAFE!' : 'OUT!' }));
BZ.bus.on('steal', () => {});
BZ.bus.on('derbyOut', d => stamp(d.why, RED, { scale: 2, life: 1 }));
BZ.bus.on('walkoff', () => stamp('WALK-OFF!', GOLD, { scale: 4, life: 2.5 }));
BZ.bus.on('super', d => { if (d.kind === 'laser') stamp('LASER ARM!', RED, { scale: 2 }); if (d.kind === 'burners') stamp('AFTERBURNERS!', GOLD, { scale: 2 }); if (d.kind === 'pitch') stamp(PITCHES[d.type].name + '!', GOLD, { scale: 2 }); });
const FEED = { text: '', t: 0 };
BZ.bus.on('contact', d => { if (M && M.lastContact) FEED.text = M.lastContact.grade === 'PERFECT' ? 'PERFECT!' : (M.lastContact.timingMs < -10 ? 'EARLY ' + -M.lastContact.timingMs + ' MS' : M.lastContact.timingMs > 10 ? 'LATE ' + M.lastContact.timingMs + ' MS' : 'ON TIME') + (M.lastContact.launch < 0 ? ' · TOPPED' : M.lastContact.launch > 40 ? ' · UNDER IT' : ''); FEED.t = 1.6; });
BZ.bus.on('miss', d => { FEED.text = Math.abs(d.e) > swingWindow() ? (d.e < 0 ? 'EARLY ' : 'LATE ') + Math.round(Math.abs(d.e) * 1000) + ' MS' : 'MISSED THE BALL'; FEED.t = 1.4; });

function hudTick(dt) { radioTick(dt); for (const s of STAMPS) s.t += dt; while (STAMPS.length && STAMPS[0].t > STAMPS[0].life) STAMPS.shift(); FEED.t = Math.max(0, FEED.t - dt); }
const text = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
function cornerW() { const ca = game.cornerArea && game.cornerArea(); return ca && ca.y0 < 40 ? Math.max(0, game.W - ca.x0) : 0; }

function drawHUD(r) {
  if (!M) return;
  r.overlay(g => {
    const W = r.W, H = r.H, cine = M.phase === 'homer' && M.cam === 'moonshot';
    if (!cine && !M.derby) scorebug(g, W, H);
    if (M.derby) derbyHUD(g, W, H);
    if (!cine) meters(g, W, H);
    // stamps
    for (const s of STAMPS) {
      const k = Math.min(1, s.t / .12), sc = Math.max(2, Math.round(s.scale * (k < 1 ? .6 + .4 * k : 1))), y = Math.round(H * .3);
      E.font.title(g, s.text, W / 2, y, { scale: sc, colors: s.colors, align: 'center', depth: 2 });
      if (s.sub) text(g, s.sub, W / 2, y + sc * 9 + 2, '#ffffff', { align: 'center', scale: 2 });
      if (s.ump && M.cam === 'plate') { try { castRig('ump').drawPortrait(g, W / 2 - E.font.width(s.text, { scale: sc }) / 2 - 40, y - 4, 34, { bg: '#1a2040' }); } catch (e) { /* first frame */ } }
    }
    // banners by phase
    if (M.phase === 'pregame') banner(g, W, H, 'PLAY BALL!', M.teams[0].def.city + ' ' + M.teams[0].def.name + '  AT  ' + M.teams[1].def.city + ' ' + M.teams[1].def.name);
    if (M.phase === 'halfStart' && !M.derby) banner(g, W, H, (M.half ? 'BOTTOM ' : 'TOP ') + ordinal(M.inning), M.bonusRunner ? 'BONUS RUNNER ON SECOND' : offense().def.name + ' BATTING');
    if (M.phase === 'halfEnd') { if (M.show && M.phaseT > 1.4) banner(g, W, H, M.show.title, 'BETWEEN INNINGS', true); else { banner(g, W, H, 'SIDE RETIRED', '', true); lineScore(g, W, H); } }
    if (M.phase === 'rhubarb' && M.rhubarb) rhubarbHUD(g, W, H);
    // the at-bat
    if (['select', 'windup', 'flight', 'afterPitch', 'walkUp'].includes(M.phase)) {
      card(g, W, H);
      if (M.phase === 'select' && !autoPit()) pitchMenu(g, W, H);
      if (M.pitch && M.phase === 'afterPitch' && M.pitch.speed) text(g, M.pitch.def.name + '  ' + mph(M.pitch.speed) + ' MPH' + (M.pitch.def.kind === 'super' ? '!!' : ''), W / 2, H * .2 + 34, '#e8e0ff', { align: 'center' });
      if (FEED.t > 0 && ((game.settings.timingFeedback !== false && game.settings.batAssist !== 'off') || M.diffId === 'rookie' || M.lesson)) text(g, FEED.text, W / 2, H * .62, FEED.text === 'PERFECT!' ? '#4fe0b0' : '#ffe680', { align: 'center', scale: 2 });
    }
    if (M.cam === 'broadcast' && M.phase === 'inPlay') radar(g, W, H);
    promptsDraw(g, W, H);
    radioDraw(g, W, H);
    if (M.cheats.showAI && M.phase === 'flight' && M.pitch) timingBar(g, W, H);
  });
}
function scorebug(g, W, H) {
  const x = SAFE, y = SAFE, w = 118, h = 46;
  E.ui.box(g, x, y, w, h, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .9 });
  M.teams.forEach((t, i) => {
    const yy = y + 5 + i * 19; px.rect(g, x + 4, yy, 4, 14, t.def.chip); px.rect(g, x + 8, yy, 2, 14, t.def.chip2);
    text(g, t.def.abbr, x + 14, yy + 1, i === M.half ? '#ffe680' : '#ffffff', { scale: 2 });
    text(g, String(t.runs), x + 74, yy + 1, '#ffffff', { scale: 2, align: 'right' });
  });
  // inning, outs, count, bases
  const ix = x + 80; text(g, (M.half ? '↓' : '↑') + M.inning, ix, y + 5, '#ffe680', { scale: 1 });
  for (let i = 0; i < 2; i++) px.disc(g, ix + 3 + i * 7, y + 17, 2.5, i < M.outs ? '#ff4a4a' : '#3a3c4a');
  const bx = ix + 26, by = y + 14, D_ = (k, dx, dy) => { const on = !!runnerOn(k); px.poly(g, [[bx + dx, by + dy - 4], [bx + dx + 4, by + dy], [bx + dx, by + dy + 4], [bx + dx - 4, by + dy]], on ? '#ffe680' : '#3a3c4a'); };
  D_(2, 0, -5); D_(3, -6, 1); D_(1, 6, 1);
  const cy = y + 32; text(g, 'B', ix, cy, '#a8c8ff'); for (let i = 0; i < 3; i++) px.disc(g, ix + 10 + i * 6, cy + 3, 2, i < M.balls ? '#3b82f6' : '#3a3c4a');
  text(g, 'S', ix, cy + 8, '#ff9a9a'); for (let i = 0; i < 2; i++) px.disc(g, ix + 10 + i * 6, cy + 11, 2, i < M.strikes ? '#e8443a' : '#3a3c4a');
}
function meters(g, W, H) {
  const cw = cornerW(), x1 = W - SAFE - cw, w = 96, x = x1 - w, y = SAFE;
  const T = offense(), full = T.meter >= 100;
  E.ui.box(g, x, y, w, 30, { bg: ['#1a1c2a', '#0c0d14'], border: full ? (Math.floor(game.real * 6) % 2 ? '#ffe680' : '#ff8a2a') : '#c8c8d8', alpha: .9 });
  text(g, M.armed ? 'ARMED!' : full ? 'BATZOOKA READY' : 'BATZOOKA', x + 4, y + 3, full ? '#ffe680' : '#ffffff');
  // the bat-shaped gauge: a handle then a fat barrel, filling with flame
  const gx = x + 4, gy = y + 13, gw = w - 8, f = T.meter / 100;
  px.rect(g, gx, gy + 2, gw * .3, 4, '#3a2a1a'); px.rect(g, gx + gw * .3, gy, gw * .7, 8, '#3a2a1a');
  const fw = gw * f; px.rect(g, gx, gy + 2, Math.min(fw, gw * .3), 4, '#ff8a2a'); if (fw > gw * .3) px.rect(g, gx + gw * .3, gy, fw - gw * .3, 8, full ? '#ffe060' : '#ff8a2a');
  if (full) px.blend(g, .5, 'add', () => { for (let i = 0; i < 6; i++) px.disc(g, gx + gw * .3 + RF() * gw * .7, gy + RF() * 8, 2, '#ffb030'); });
  text(g, T.def.abbr, x + w - 4, y + 3, '#c8c8d8', { align: 'right' });
  // turbo and wind
  E.ui.bar(g, x, y + 34, w, 4, (M.teams[M.cam === 'broadcast' && M.phase === 'inPlay' && defHumanInput() ? 1 - M.half : M.half].turbo) / 100, '#4fe0b0');
  if (M.park.wind && (M.wind.x || M.wind.y)) { const a = Math.atan2(M.wind.y, M.wind.x), s = Math.hypot(M.wind.x, M.wind.y), cx = x + 8, cy = y + 48; px.line(g, cx - Math.cos(a) * 5, cy + Math.sin(a) * -5, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, '#ffffff'); px.disc(g, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 1.5, '#ffffff'); text(g, 'WIND ' + Math.round(s * 1.2) + ' MPH', cx + 9, cy - 3, '#c8c8d8'); }
}
function card(g, W, H) {
  const human = !autoPit() && autoBat(), p = human ? defense().pitcher : batterNow(), x = SAFE, y = H - SAFE - 58 - (game.players.length > 2 ? 16 : 0), w = 150;
  E.ui.box(g, x, y, w, 40, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .88 });
  const rig = p.rigs && (p.rigs.bat || p.rigs.field); if (rig) try { rig.drawPortrait(g, x + 3, y + 3, 34, { bg: TEAMS[p.team].chip }); } catch (e) { /* portrait before its first update */ }
  text(g, p.name.length > 22 ? p.name.slice(0, 22) : p.name, x + 41, y + 5, '#ffffff');
  if (human) { const st = stamOf(1 - M.half, p); text(g, 'STAMINA', x + 41, y + 16, '#c8c8d8'); E.ui.bar(g, x + 41, y + 26, w - 48, 5, st / 100, st < 40 ? '#e8443a' : '#4fe0b0'); }
  else { const s = pStat(p); text(g, (s.ab ? (s.h / s.ab).toFixed(3).replace(/^0/, '') : '---') + '  ' + s.h + '-' + s.ab + '  HR ' + s.hr, x + 41, y + 16, '#c8c8d8'); text(g, 'POW ' + p.pow + ' CON ' + p.con + ' SPD ' + p.spd + '  ' + (p.bats === 'L' ? 'LEFTY' : 'RIGHTY'), x + 41, y + 27, '#8a8ca8'); }
}
function pitchMenu(g, W, H) {
  const I = pitIn(), list = pitchesOf(defense().pitcher), cx = W - SAFE - 70 - cornerW() * 0, cy = H - SAFE - 74;
  const pos = [[0, 24], [36, 0], [-36, 0], [0, -24]], acts = ['south', 'east', 'west', 'north'];
  E.ui.box(g, cx - 72, cy - 40, 144, 86, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .85 });
  list.forEach((id, i) => { const [dx, dy] = pos[i], sel = M.sel === i; glyph(g, I, I.lastDevice === 'keyboard' ? 'num' + (i + 1) : acts[i], cx + dx - 5, cy + dy - 5, 11); text(g, PITCHES[id].name.split(' ')[0], cx + dx, cy + dy + 7, sel ? '#ffe680' : '#ffffff', { align: 'center' }); });
  const sup = TEAMS[defense().pitcher.team].superPitch, ok = defense().meter >= 100;
  glyph(g, I, I.lastDevice === 'keyboard' ? 'num5' : 'r1', cx - 60, cy + 30, 11); text(g, PITCHES[sup].name + (ok ? '' : ' ' + Math.floor(defense().meter) + '%'), cx - 44, cy + 32, ok ? '#ffe680' : '#6a6c80');
}
function radar(g, W, H) {
  const cw = cornerW(), s = 0.055, w = 80, h = 74, x = W - SAFE - cw - w, y = SAFE + 62, ox = x + w / 2, oy = y + h - 6;
  E.ui.box(g, x, y, w, h, { bg: ['#0c2014', '#06100a'], border: '#5a8a6a', alpha: .75 });
  const P_ = (wx, wy) => [ox + (wx - HX) * s, oy + (wy - HY) * s];
  for (let i = 0; i <= 20; i++) { const th = -D45 + i * Math.PI / 40, R0 = fenceR(M.park, th), [ux, uy] = dirOf(th), p = P_(HX + ux * R0, HY + uy * R0); px.dot(g, p[0], p[1], '#c8e8c8'); }
  for (let k = 0; k < 4; k++) { const bp = basePos(k), p = P_(bp.x, bp.y); px.rect(g, p[0] - 1, p[1] - 1, 2, 2, runnerOn(k) ? '#ffe680' : '#ffffff'); }
  for (const F of M.fielders) { const p = P_(F.x, F.y); px.disc(g, p[0], p[1], 1.5, F.human ? '#4a8aff' : defense().def.chip); }
  for (const r of M.runners) if (r.state !== 'out' && r.state !== 'scored') { const p = P_(r.x, r.y); px.disc(g, p[0], p[1], 1.5, offense().def.chip2 || '#ffffff'); }
  if (M.ball) { const p = P_(M.ball.x, M.ball.y); px.disc(g, p[0], p[1], 1.6, '#ffffff'); }
}
function banner(g, W, H, big, small, low) {
  const y = low ? H * .14 : H * .36;
  E.ui.box(g, W / 2 - 150, y - 6, 300, small ? 52 : 40, { bg: ['#2a1c3a', '#120c1c'], border: '#ffe680', alpha: .9 });
  E.font.title(g, big, W / 2, y, { scale: 3, colors: GOLD, align: 'center', depth: 2 });
  if (small) text(g, small, W / 2, y + 32, '#ffffff', { align: 'center' });
}
function lineScore(g, W, H) {
  const n = Math.max(M.innings, M.inning), cols = Math.min(n, 9), x = W / 2 - (60 + cols * 14 + 40) / 2, y = H * .14 + 56;
  E.ui.box(g, x, y, 60 + cols * 14 + 46, 40, { bg: ['#1a1c2a', '#0c0d14'], border: '#c8c8d8', alpha: .92 });
  for (let i = 0; i < cols; i++) text(g, String(n - cols + i + 1), x + 58 + i * 14, y + 4, '#8a8ca8', { align: 'center' });
  text(g, 'R  H  E', x + 60 + cols * 14 + 4, y + 4, '#8a8ca8');
  M.teams.forEach((t, k) => { const yy = y + 15 + k * 11; text(g, t.def.abbr, x + 6, yy, '#ffffff'); for (let i = 0; i < cols; i++) { const v = t.line[n - cols + i]; text(g, v === undefined ? '-' : String(v), x + 58 + i * 14, yy, '#ffffff', { align: 'center' }); } text(g, t.runs + '  ' + t.hits + '  ' + t.errors, x + 60 + cols * 14 + 4, yy, '#ffe680'); });
}
function derbyHUD(g, W, H) {
  const D = M.derby, x = SAFE, y = SAFE;
  E.ui.box(g, x, y, 132, 58, { bg: ['#1a1c2a', '#0c0d14'], border: '#ffe680', alpha: .9 });
  text(g, 'BATZOOKA DERBY', x + 5, y + 4, '#ffe680');
  text(g, fmt(D.score) + ' FT', x + 5, y + 15, '#ffffff', { scale: 2 });
  text(g, 'HR ' + D.hrs + (D.maxOuts < 99 ? '   OUTS ' + D.outs + '/' + D.maxOuts : '   OUTS ' + D.outs), x + 5, y + 33, '#c8c8d8');
  if (D.clock) { const s = Math.ceil(D.time); text(g, Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), x + 5, y + 44, s < 15 ? '#ff6a6a' : '#ffffff'); }
  if (D.golden && ['select', 'windup', 'flight'].includes(M.phase)) E.font.title(g, 'GOLDEN BALL x2', W / 2, H * .12, { scale: 2, colors: GOLD, align: 'center' });
  if (BZ.derbyLabel) text(g, BZ.derbyLabel, W / 2, SAFE, '#ffffff', { align: 'center', scale: 2 });
}
function rhubarbHUD(g, W, H) {
  const RB = M.rhubarb; E.ui.box(g, W / 2 - 70, SAFE, 140, 30, { bg: ['#3a1018', '#1a060c'], border: '#ff6a6a', alpha: .9 });
  text(g, M.teams[0].def.abbr + ' ' + RB.kd[0] + '  KNOCKDOWNS  ' + RB.kd[1] + ' ' + M.teams[1].def.abbr, W / 2, SAFE + 4, '#ffffff', { align: 'center' });
  text(g, String(Math.max(0, Math.ceil(RB.t))), W / 2, SAFE + 15, '#ffe680', { align: 'center', scale: 1 });
}
function timingBar(g, W, H) {
  const pt = M.pitch, x = W / 2 - 80, y = H - 70; px.rect(g, x, y, 160, 6, '#20222e');
  const win = swingWindow(), at = pt.T - SWINGS.contact.delay, k = 160 / (pt.T + .1);
  px.rect(g, x + (at - win) * k, y, win * 2 * k, 6, '#3a6a4a'); px.rect(g, x + (at - .022) * k, y, .044 * k, 6, '#4fe0b0'); px.rect(g, x + pt.t * k, y - 2, 1, 10, '#ffffff');
}
/* ---- prompts for the context, per human, at their side of the screen ---- */
function promptsFor(I) {
  if (!M || !I) return null;
  const sB = M.teams.findIndex(t => t.ctrl.cap === I || t.ctrl.co === I); if (sB < 0) return null;
  const off = sB === M.half, T = M.teams[sB], ph = M.phase, bat = off && inputOf(sB, 'bat') === I, pit = !off && inputOf(sB, 'pitch') === I, fld = !off && inputOf(sB, 'field') === I, run = off && inputOf(sB, 'run') === I;
  const pct = n => Math.floor(n) + '%';
  if (ph === 'rhubarb') return [['south', 'PUNCH'], ['west', 'SHOVE'], ['north', 'TOSS'], ['east', 'DODGE']];
  if (['pregame', 'halfStart', 'halfEnd', 'replay'].includes(ph)) return [['south', 'SKIP']];
  if (ph === 'homer') return M.phaseT > 2.4 ? [['south', 'SKIP TROT']] : null;
  if (bat && ['select', 'windup', 'flight', 'walkUp'].includes(ph)) return [['south', 'SWING'], ['west', 'POWER'], ['north', 'BUNT (HOLD)'], ['r1', M.armed ? 'ARMED!' : 'BATZOOKA', T.meter >= 100, pct(T.meter)], M.runners.length && ph === 'select' ? ['l1', '+ BASE: STEAL'] : null];
  if (pit && ph === 'select') return [M.runners.length ? ['l1', '+ BASE: PICKOFF'] : null, ['r1', 'SUPER PITCH', T.meter >= 100, pct(T.meter)]];
  if (pit && ph === 'windup') return [['south', 'RELEASE ON THE RING'], ['up', 'AIM']];
  if (pit && ph === 'flight') return [['up', 'AFTERTOUCH']];
  if (fld && ph === 'inPlay') { const h = holderF(); if (h && h.human) return [['east', '1ST'], ['north', '2ND'], ['west', '3RD'], ['south', 'HOME'], ['r1', '+ BASE: LASER', T.meter >= 50, pct(T.meter)]]; return [['r2', 'DIVE'], ['r1', 'JUMP / CLIMB'], ['l2', 'TURBO'], ['l1', 'SWITCH']]; }
  if (run && ph === 'inPlay') return [['r1', 'ALL GO'], ['l1', 'ALL BACK'], ['l2', 'TURBO'], ['r1', '+ L2: AFTERBURNERS', T.meter >= 50 && !M.burnUsed, pct(T.meter)]];
  return null;
}
function promptsDraw(g, W, H) {
  const ps = game.players;
  ps.forEach((I, i) => {
    const items = promptsFor(I); if (!items) return;
    const y = H - SAFE - 12 - (i >= 2 ? 16 : 0), solo = ps.length === 1;
    if (solo) promptRow(g, I, items, W / 2, y, 'center');
    else { text(g, I.name || 'P' + (i + 1), i % 2 ? W - SAFE : SAFE, y - 10, I.color || '#fff', { align: i % 2 ? 'right' : 'left' }); promptRow(g, I, items.slice(0, 3), i % 2 ? W - SAFE : SAFE, y, i % 2 ? 'right' : 'left'); }
  });
}
BZ.promptsFor = promptsFor;

/* ===== 23-talk.js ===== */
/* COMMENTARY: HAP HARRIGAN (play-by-play), "BIG" LOU BOMBECK (color, tall tales from '79), GLORIA VOX (the PA) and
 * UMPIRE BARB HAMMERSMITH. Old-time radio, turned up: short punchy lines, baseball slang, warm hyperbole, never mean.
 * Lines carry a priority; at most one every 2.5 s; no repeats within 20; {batter} {pitcher} {team} {dist} {park}. */
const LINES = {
  batter_up: [[3, 'pa', 'Now batting... {batter}!'], [3, 'pa', 'Stepping in... number {num}... {batter}!'], [3, 'pa', 'Let\'s hear it for... {batter}!'], [3, 'pa', 'At the plate... {batter}... of the {team}!'], [3, 'pa', 'Your batter... {batter}!'], [3, 'pa', 'Here comes... {batter}!']],
  strike_called: [[1, 'hap', 'Strike, right on the black. You could hang a picture on that one.'], [1, 'hap', 'Caught looking! Barb rings him up with feeling.'], [1, 'lou', 'He watched that one go by like a parade.'], [1, 'hap', 'Painted the corner. Somebody frame it.'], [1, 'lou', 'In 1979 I took a pitch like that. Still thinking about it.'], [1, 'hap', 'Strike! The bat never left the shoulder.'], [1, 'hap', 'Called strike. That one had a ticket and a seat number.'], [1, 'lou', 'You can\'t hit it with your eyes, kid.'], [1, 'hap', 'Right down Broadway, and nobody waved.'], [1, 'hap', 'Strike on the inside corner. Chin music with a happy ending.']],
  strike_swinging: [[1, 'hap', 'Swing and a miss! He unscrewed himself from the box!'], [1, 'lou', 'He swung so hard the breeze cooled the third row.'], [1, 'hap', 'Whiff! That bat went looking and came home empty.'], [1, 'hap', 'Swung through it! That pitch had a trap door.'], [1, 'lou', 'Missed it by a county mile. Maybe two counties.'], [1, 'hap', 'Fanned the air! The ball was gone before the thought.'], [1, 'lou', 'That\'s a lot of swing for no souvenir.'], [1, 'hap', 'Swing and nothing! Uncle Charlie strikes again.'], [1, 'hap', 'Big cut, no contact. The crowd felt the wind, though.'], [1, 'lou', 'He was early. He was so early he was yesterday.']],
  ball: [[1, 'hap', 'Ball, low. That one was dragging its feet.'], [1, 'hap', 'Ball, outside. Missed by a whisker and a half.'], [1, 'lou', 'Wide. The catcher had to lean into next week.'], [1, 'hap', 'Ball. Barb wasn\'t buying it.'], [1, 'hap', 'High and tight. Ball.'], [1, 'lou', 'That pitch got lost on the way to the plate.'], [1, 'hap', 'In the dirt, ball. Good block back there.'], [1, 'hap', 'Ball. The batter didn\'t even blink.'], [1, 'lou', 'He\'s nibbling. Nibble nibble.'], [1, 'hap', 'Just off the plate. Ball.']],
  foul: [[1, 'hap', 'Fouled straight back! Duck, Lou!'], [1, 'lou', 'I\'ve been ducking since \'79.'], [1, 'hap', 'Foul ball into the seats! Somebody got a souvenir with mustard.'], [1, 'hap', 'Just foul! Missed the line by a hair.'], [1, 'hap', 'Fought that one off. Still alive.'], [1, 'lou', 'Foul ball. Keep your eyes up, folks, they bite.'], [1, 'hap', 'Foul tip! He got a piece, just a piece.'], [1, 'hap', 'Hooked foul. Right idea, wrong zip code.'], [1, 'lou', 'That\'s a foul. That\'s also my seat.'], [1, 'hap', 'Spoiled it! A battle at the plate.']],
  strikeout: [[2, 'hap', 'Strike three! Back to the dugout to think about what he\'s done.'], [2, 'hap', 'Punched out! Barb nearly threw her shoulder out with that one.'], [2, 'lou', 'Struck out. Happens to the best. Happened to me twice a game.'], [2, 'hap', 'He struck him out! Grab a seat, friend.'], [2, 'hap', 'K! Sit down, son, the bench is warm.'], [2, 'lou', 'That\'s a backwards K for the scorebook.'], [2, 'hap', 'Three strikes, he\'s out! The pitcher strikes a pose.']],
  walk: [[2, 'hap', 'Ball four. Take your base, and take a sandwich while you\'re at it.'], [2, 'lou', 'A free pass. The best kind of free.'], [2, 'hap', 'He walks! Patience pays at the plate.'], [2, 'hap', 'Ball four, and the trot is on.'], [2, 'lou', 'Walk him? I wouldn\'t have walked me either.'], [2, 'hap', 'Base on balls. The pitcher talks to his glove.']],
  single: [[2, 'hap', 'Seeing-eye single through the right side! That ball had a map and a flashlight.'], [2, 'hap', 'Base hit! A frozen rope into center.'], [2, 'lou', 'A Texas leaguer! Dropped in like a lost pigeon.'], [2, 'hap', 'Worm-burner through the hole! Base hit.'], [2, 'hap', 'Lined into left for a single. Clean as a whistle.'], [2, 'lou', 'That\'s a hit. I\'ve seen it. I\'ve done it. Twice.'], [2, 'hap', 'Bloop and a blessing! He\'s on.'], [2, 'hap', 'Up the middle, base hit! Right past the pitcher\'s ear.'], [2, 'lou', 'Single! Hit \'em where they ain\'t, I always said.'], [2, 'hap', 'Grounder finds grass! He\'s safe at first.']],
  double: [[2, 'hap', 'Into the gap! {batter} is digging for second like there\'s buried treasure!'], [2, 'hap', 'Off the wall, and in with a double!'], [2, 'lou', 'Two-bagger! That\'s what we call a doubles hitter, folks.'], [2, 'hap', 'Down the line, fair ball! He\'s in standing up.'], [2, 'hap', 'Split the outfielders! Stand-up double!'], [2, 'lou', 'He\'ll be at second before the ball gets home.']],
  triple: [[2, 'hap', 'Off the wall, he\'s rounding second, he\'s going for three! He\'s SAFE!'], [2, 'lou', 'A triple! Rarest bird in the ballpark.'], [2, 'hap', 'All the way to third! Legs like a jackrabbit!'], [2, 'hap', 'Triple! The relay is late and the crowd is loud!'], [2, 'lou', 'Three bases. I never hit a triple. I ran out of gas at two.'], [2, 'hap', 'Into the corner, and he\'s off to the races! Triple!']],
  homer: [[3, 'hap', 'Swung on and BELTED! Deep! Way back! That ball has left the zip code!'], [3, 'hap', '{dist} feet! They\'ll need a passport to bring that one back!'], [3, 'lou', 'That\'s a tater, folks! Mashed like Sunday potatoes!'], [3, 'hap', 'GOODBYE BASEBALL! A moonshot for {batter}!'], [3, 'lou', 'That ball had a map and a lunch box.'], [3, 'hap', 'It\'s outta here! Dinger! {dist} feet of pure joy!'], [3, 'lou', 'I hit one that far in \'79. In a dream. Still counts.'], [3, 'hap', 'Gone! Somebody call the airport, there\'s a ball in the flight path!']],
  batzooka_ready: [[3, 'hap', 'The crowd is ROARING! You know what that means... it\'s BATZOOKA TIME!'], [3, 'lou', 'The bat is humming, folks. Stand back.'], [3, 'hap', 'Meter\'s full! Grandma Delgado\'s secret recipe is cooking!'], [3, 'hap', 'Listen to this place! The Batzooka is READY!'], [3, 'lou', 'When the crowd gets loud, the lumber gets loud.'], [3, 'hap', 'Full meter! Somebody hold onto their hats!']],
  batzooka_hit: [[3, 'hap', 'KA-BLAMMO! That\'s not a home run, that\'s a space program!'], [3, 'lou', 'That ball is going to land in next season!'], [3, 'hap', 'BATZOOKA! Rocket boosters ENGAGED!'], [3, 'hap', 'Fire, smoke and a baseball headed for orbit!'], [3, 'lou', 'I felt that one in my fillings.'], [3, 'hap', 'Liftoff! We have liftoff at the ballpark!']],
  fizzle: [[3, 'hap', 'Fizzle! That\'s the loudest nothing I\'ve ever heard.'], [3, 'lou', 'All boom and no ball. Happens to the best rockets.'], [3, 'hap', 'Pfffft. The Batzooka coughs and the pitcher grins.'], [3, 'hap', 'Missed! The smoke clears and the ball is in the mitt.'], [3, 'lou', 'That\'s a dud. Like my 1980 season.'], [3, 'hap', 'Swing and a FIZZLE! The crowd goes quiet as a library.']],
  super_pitch: [[3, 'hap', '{pitcher} just threw a pitch that\'s probably illegal in three states!'], [3, 'lou', 'What in the name of rosin was THAT?'], [3, 'hap', 'Super pitch! The ball is doing things balls shouldn\'t do!'], [3, 'lou', 'They didn\'t have those pitches in \'79. We had spitballs and hope.'], [3, 'hap', 'Here comes the special! Hold onto your hot dogs!'], [3, 'hap', 'That pitch had a soundtrack!']],
  catch_dive: [[2, 'hap', 'Laid out like a welcome mat! What a grab!'], [2, 'lou', 'He dove like he dropped his wallet!'], [2, 'hap', 'Diving catch! Full extension, full grass stains!'], [2, 'hap', 'Snow cone at the end of the glove! Unbelievable!'], [2, 'lou', 'That\'s a highlight. That\'s a poster. That\'s a lunch box.'], [2, 'hap', 'He sold out and he got it!']],
  robbery: [[3, 'hap', 'He climbed the wall and STOLE it! Call the sheriff!'], [3, 'lou', 'Robbery! In broad daylight! Well, stadium light.'], [3, 'hap', 'Up the fence like a spider and he\'s got it! Home run ROBBED!'], [3, 'lou', 'That\'s grand larceny with a glove.'], [3, 'hap', 'Taken away! He brought that one back from the bleachers!'], [3, 'hap', 'NO! He climbed the ladder and snatched it!']],
  catch_fly: [[1, 'hap', 'Can of corn. Easy out.'], [1, 'hap', 'Under it, and he squeezes it.'], [1, 'lou', 'A lazy fly. Even I could catch that. Probably.'], [1, 'hap', 'Fly ball, caught. Two hands, like Mama taught.'], [1, 'hap', 'Pop-up, put away.'], [1, 'lou', 'He camped under that like a tent.']],
  ground_out: [[1, 'hap', 'Grounder, scooped and fired. Out at first.'], [1, 'hap', 'Routine play, routine out.'], [1, 'lou', 'Chopped it right at him. Out.'], [1, 'hap', 'Fielded cleanly, thrown out by a step.'], [1, 'hap', 'Bang-bang at first... OUT!'], [1, 'lou', 'That\'s a ground ball with no ambition.']],
  error: [[2, 'hap', 'Clank! You could hear that one in the next county.'], [2, 'lou', 'Glove\'s got a hole in it. A big hole. A ball-sized hole.'], [2, 'hap', 'Booted it! An error on the play.'], [2, 'lou', 'Butterfingers! I know the feeling. I invented the feeling.'], [2, 'hap', 'Dropped it! The crowd groans.'], [2, 'hap', 'Off the heel of the glove. That\'ll be an E in the book.']],
  double_play: [[2, 'hap', 'Two for the price of one! Around the horn and back for a nap!'], [2, 'lou', 'Double play! Tidy as a church picnic.'], [2, 'hap', 'Six-four-three, and two are gone!'], [2, 'hap', 'Turned two! Smooth as butter.'], [2, 'lou', 'That\'s a twin killing. Nobody actually gets hurt, folks.'], [2, 'hap', 'Double play! The pitcher tips his cap.']],
  steal: [[2, 'hap', 'He\'s stealing! ...SAFE! Lock up your valuables, folks.'], [2, 'lou', 'Stolen base! He\'s got wheels and a getaway car.'], [2, 'hap', 'Swipes the bag! Not even close!'], [2, 'hap', 'He\'s running... and he\'s in! A stolen base!'], [2, 'lou', 'Nobody stole bases in \'79. We were too heavy.'], [2, 'hap', 'Grand theft second base!']],
  bowl_over: [[3, 'hap', 'COLLISION AT THE PLATE! Somebody check the catcher\'s warranty!'], [3, 'lou', 'He ran through that catcher like a screen door!'], [3, 'hap', 'Boom! Dust everywhere! What\'s the call?!'], [3, 'lou', 'That\'s football. That\'s a different channel.'], [3, 'hap', 'He bowled him over! The crowd is on its feet!'], [3, 'hap', 'Freight train at home plate!']],
  rhubarb_start: [[3, 'hap', 'Here come the benches! It\'s a rhubarb, folks, a genuine dust-up!'], [3, 'lou', 'Uh-oh, the benches are emptying! Somebody fetch a referee!'], [3, 'hap', 'They\'re pouring out of both dugouts! Cartoon dust cloud!'], [3, 'lou', 'In \'79 we settled this with a pie-eating contest.'], [3, 'hap', 'It\'s a donnybrook at the dish!'], [3, 'hap', 'Everybody\'s in it! Even the bat boy!']],
  rhubarb_end: [[3, 'ump', 'Everybody back in your dugouts before I eject the ballpark!'], [3, 'hap', 'Barb\'s breaking it up. Everybody\'s dusting off.'], [3, 'lou', 'Nobody\'s going home, though everybody\'s going home dirty.'], [3, 'hap', 'Order restored! Mostly. Somebody find that cap.'], [3, 'ump', 'That\'s ENOUGH! Play ball!'], [3, 'hap', 'The dust settles. Let\'s play some baseball.']],
  walkoff: [[3, 'hap', 'WALK-OFF! The {team} win it! Pile on, pile on!'], [3, 'lou', 'Game over! Pop the corn and dance in the aisles!'], [3, 'hap', 'They win it in their last at-bat! Pandemonium!'], [3, 'lou', 'A walk-off! The sweetest words in baseball!'], [3, 'hap', 'That\'s the ballgame! The {team} walk it off!'], [3, 'hap', 'Home team wins! Somebody tell the organist!']],
  lead_change: [[2, 'hap', 'And just like that, we\'ve got ourselves a brand-new ballgame!'], [2, 'lou', 'Lead change! Hold onto your peanuts.'], [2, 'hap', 'The {team} take the lead!'], [2, 'hap', 'Flip the scoreboard! New leader!'], [2, 'lou', 'The momentum just switched dugouts.'], [2, 'hap', 'They\'re out in front now!']],
  tie: [[2, 'hap', 'All tied up! Anybody\'s ballgame!'], [2, 'lou', 'Even Steven! My favorite cousin.'], [2, 'hap', 'Knotted up! The tension in here could hold a bat up.'], [2, 'hap', 'We are TIED!'], [2, 'lou', 'Tie game. Nobody leave.'], [2, 'hap', 'The equalizer! Even ballgame!']],
  inning: [[1, 'hap', 'Side retired. Stretch those legs, folks.'], [1, 'lou', 'Time for a hot dog. Or three. I\'m not counting.'], [1, 'hap', 'Three up, three down... or something like it.'], [1, 'hap', 'And that\'ll do it for the half-inning.'], [1, 'lou', 'Change of scenery, change of luck.'], [1, 'hap', 'Teams change sides, the organ warms up.']],
  between: [[1, 'hap', 'Time for the Mascot Race! My money\'s on the popcorn.'], [1, 'lou', 'The mascots are racing. One of them always trips. Always.'], [1, 'hap', 'Dance Cam! Show us your moves, folks!'], [1, 'hap', 'T-shirt cannon! Hands up in the bleachers!'], [1, 'lou', 'The grounds crew is dancing. Best footwork in the park.'], [1, 'hap', 'Between innings fun, and the vendor is SOLD OUT again.']],
  hazard_gull: [[2, 'hap', 'A seagull just stole a fly ball! Is that legal? Barb says it\'s in play!'], [2, 'lou', 'Those gulls have better hands than my old infield.'], [2, 'hap', 'Bird in the flight path! The ball\'s been relocated!'], [2, 'lou', 'That gull should get a contract.'], [2, 'hap', 'Snatched out of the sky! Only at Barnacle Bay!'], [2, 'hap', 'The gull drops it like a hot clam!']],
  hazard_vents: [[2, 'hap', 'The ground just sneezed lava, and the baseball went with it!'], [2, 'lou', 'Don\'t stand on anything that\'s glowing, folks.'], [2, 'hap', 'ERUPTION! The vents are live in the gaps!'], [2, 'lou', 'That\'s a hot corner. Literally.'], [2, 'hap', 'Lava vent! The outfielders are dancing!'], [2, 'hap', 'Caldera Field clears its throat!']],
  hazard_meteor: [[2, 'hap', 'Meteor shower in the outfield! The grounds crew is going to need a bigger rake!'], [2, 'lou', 'Gravity took the day off and the sky\'s falling. Normal moon stuff.'], [2, 'hap', 'Craters in the outfield! Watch those hops!'], [2, 'lou', 'No air, no wind, no excuses.'], [2, 'hap', 'Incoming! Space rocks on the warning track!'], [2, 'hap', 'Meteor strike! The lunar lawn takes another hit!']],
  hazard_fog: [[2, 'hap', 'Where\'d it go?! The ball just turned into a rumor!'], [2, 'lou', 'Phantom fog! Watch the shadow, kid, watch the shadow!'], [2, 'hap', 'Lost in the spooky soup!'], [2, 'lou', 'I lost a ball in fog once. Found it in \'82.'], [2, 'hap', 'Into the mist! Somebody turn on the lanterns!'], [2, 'hap', 'Now you see it, now you... don\'t!']],
  hazard_drone: [[2, 'hap', 'Off the security drone! Corporate airspace, folks!'], [2, 'lou', 'Those drones don\'t pay for tickets either.'], [2, 'hap', 'Deflected! MegaMax\'s robots are playing defense!'], [2, 'lou', 'A drone with a glove. What\'s next, a robot umpire?'], [2, 'hap', 'Pinball in the sky!'], [2, 'hap', 'Clang! Right off the flying toaster!']],
  drone_down: [[3, 'hap', 'The Batzooka just KNOCKED A DRONE OUT OF THE SKY!'], [3, 'lou', 'Somebody owes MegaMax a new drone. Not me.'], [3, 'hap', 'Drone down! Sparks and confetti!'], [3, 'hap', 'Kaboom! One less robot in the outfield!'], [3, 'lou', 'That\'s what you get for watching.'], [3, 'hap', 'Downed! The crowd loves it!']],
  silo: [[3, 'hap', 'OFF THE SILO! It\'s raining POPCORN at Kernel Field!'], [3, 'lou', 'Free snacks for everybody!'], [3, 'hap', 'Silo shot! The whole county smells like butter!'], [3, 'hap', 'Popped the silo! What a blast!'], [3, 'lou', 'That\'s the best thing to happen to corn since butter.'], [3, 'hap', 'Kernels everywhere! Fan Bucks for the Comets!']],
  megatron: [[3, 'hap', 'OFF THE MEGA-TRON! Sparks are flying in center field!'], [3, 'lou', 'MegaMax is going to need a bigger TV.'], [3, 'hap', 'Right off the big screen!'], [3, 'hap', 'Picture\'s fuzzy now! Nice shot!'], [3, 'lou', 'That\'s what I call a high-definition home run.'], [3, 'hap', 'Jumbotron JACKPOT!']],
  short_circuit: [[3, 'lou', 'He\'s smoking! I mean really smoking! Somebody unplug that fella!'], [3, 'hap', 'ENFORCER-9000 is short-circuiting!'], [3, 'hap', 'Sparks on the mound! The big robot is rattled!'], [3, 'lou', 'Have you tried turning him off and on again?'], [3, 'hap', 'Error 404: fastball not found!'], [3, 'hap', 'The machine is glitching!']],
  rally_cap: [[3, 'hap', 'Listen! Krakens, Eruptors, Meteors, even the Haunts! They\'re ALL chanting for the Comets!'], [3, 'lou', 'Rally caps on! The whole league is here!'], [3, 'hap', 'The meter\'s FULL! Kernel Field magic in the MegaDome!'], [3, 'hap', 'RALLY CAPS! Inside out and upside down!'], [3, 'lou', 'I\'ve got goosebumps on my goosebumps.'], [3, 'hap', 'This crowd will not let them lose!']]
};
const TALK = { next: 0, recent: [], last: null, prio: 0 };
const WHO = { hap: 'HAP HARRIGAN', lou: '"BIG" LOU BOMBECK', pa: 'GLORIA VOX (PA)', ump: 'UMPIRE BARB', dot: 'DOT', ike: 'GRANDPA IKE', mort: 'MORTIMER MEGAMAX' };
function say(tag, vars = {}) {
  if (!M || M.fast) return;
  const mode = game.settings.commentary || 'on'; if (mode === 'off') return;
  const pool = LINES[tag]; if (!pool) return;
  const prio = pool[0][0]; if (mode === 'big' && prio < 3) return;
  if (game.real < TALK.next && prio <= TALK.prio) return;
  const opts = pool.filter(l => !TALK.recent.includes(l[2])); const L = (opts.length ? opts : pool)[Math.floor(RF() * (opts.length || pool.length))];
  TALK.recent.push(L[2]); if (TALK.recent.length > 20) TALK.recent.shift();
  const b = M.ball && M.play ? M.play.batter : batterNow();
  const v = Object.assign({ batter: b ? b.name : '', pitcher: defense().pitcher.name, team: offense().def.name, num: b ? (b.idx + 1) * 3 % 50 + 2 : 7, park: M.park.name, dist: '' }, vars);
  const line = L[2].replace(/\{(\w+)\}/g, (_, k) => v[k] !== undefined ? v[k] : '');
  radio(L[1], line); TALK.next = game.real + 2.5; TALK.prio = prio;
}
/* the radio box: top centre, between the scorebug and the meters, typing at the voice's pace; non-modal */
const RADIO = { who: null, line: '', t: 0, life: 0 };
function radio(who, line, o = {}) {
  BZ.lastLine = { who, line };
  Object.assign(RADIO, { who, line, t: 0, life: 1.6 + line.length / 30 });
  babble.say(line, who);
}
function radioTick(dt) { if (RADIO.who) { RADIO.t += dt; if (RADIO.t > RADIO.life) RADIO.who = null; } }
function radioDraw(g, W, H) {
  if (!RADIO.who) return;
  const x0 = SAFE + 124, x1 = W - SAFE - cornerW() - 102, w = Math.max(150, x1 - x0), x = x0 + Math.max(0, (x1 - x0 - w) / 2), shown = RADIO.line.slice(0, Math.floor(RADIO.t * 40));
  const lines = wrapText(shown, w - 34), h = 14 + Math.max(2, wrapText(RADIO.line, w - 34).length) * 9;
  E.ui.box(g, x, SAFE, w, h, { bg: ['#1a1c2a', '#0c0d14'], border: '#e8c070', alpha: .88 });
  const rig = portraitOf(RADIO.who); try { rig.drawPortrait(g, x + 3, SAFE + 3, 24, { bg: '#2a2c3a' }); } catch (e) { /* first frame */ }
  E.font.text(g, WHO[RADIO.who] || RADIO.who.toUpperCase(), x + 30, SAFE + 3, '#ffd36a', { shadow: '#000', outline: false });
  lines.forEach((l, i) => E.font.text(g, l, x + 30, SAFE + 12 + i * 9, '#ffffff', { shadow: '#000', outline: false }));
}
function portraitOf(who) {
  if (['hap', 'lou', 'pa', 'ump', 'mort'].includes(who)) return castRig(who);
  const p = { dot: TEAMS.COM.roster[0], ike: TEAMS.COM.roster[8], hank: TEAMS.COM.roster[7], pip: TEAMS.COM.roster[2], kid: TEAMS.COM.roster[9] }[who];
  if (p) return makeRig(p, 'field');
  const t = { brine: 'HCK', iggy: 'MCE', cosmo: 'MBM', bones: 'HMH', robo: 'MMX' }[who]; if (t) return makeRig(TEAMS[t].captain, 'field');
  return castRig('hap');
}
BZ.bus.on('batterUp', d => { if (M && M.phase !== 'final' && !M.derby && RF() < .5) say('batter_up', { batter: d.batter.name.replace(/"[^"]*" /, '') }); });
BZ.bus.on('call', d => { if (!M || M.derby) return; if (d.kind === 'strike' && !d.three) say(d.swinging ? 'strike_swinging' : 'strike_called'); else if (d.kind === 'ball' && !d.four && RF() < .5) say('ball'); else if (d.kind === 'foul' && RF() < .6) say('foul'); });
BZ.bus.on('strikeout', () => say('strikeout'));
BZ.bus.on('walk', () => say('walk'));
BZ.bus.on('hit', d => say(['', 'single', 'double', 'triple', 'triple'][d.bases]));
BZ.bus.on('homer', d => say(d.batzooka ? 'batzooka_hit' : 'homer', { dist: d.dist }));
BZ.bus.on('meterFull', d => { if (M && d.team === M.half) say('batzooka_ready'); });
BZ.bus.on('fizzle', () => say('fizzle'));
BZ.bus.on('super', d => { if (d.kind === 'pitch') say('super_pitch'); });
BZ.bus.on('catch', d => say(d.robbed ? 'robbery' : d.dive || d.wall ? 'catch_dive' : 'catch_fly'));
BZ.bus.on('forceOut', () => { if (RF() < .5) say('ground_out'); });
BZ.bus.on('error', () => say('error'));
BZ.bus.on('doublePlay', () => say('double_play'));
BZ.bus.on('safeSteal', () => say('steal'));
BZ.bus.on('bowlOver', () => say('bowl_over'));
BZ.bus.on('rhubarbStart', () => say('rhubarb_start'));
BZ.bus.on('rhubarbEnd', () => say('rhubarb_end'));
BZ.bus.on('walkoff', () => say('walkoff', { team: M.teams[1].def.name }));
BZ.bus.on('leadChange', () => say('lead_change'));
BZ.bus.on('tieGame', () => say('tie'));
BZ.bus.on('halfEnd', () => say(M && M.show ? 'between' : 'inning'));
BZ.bus.on('hazard', d => say({ gull: 'hazard_gull', vents: 'hazard_vents', ventLaunch: 'hazard_vents', meteor: 'hazard_meteor', fog: 'hazard_fog', drone: 'hazard_drone' }[d.kind]));
BZ.bus.on('droneDown', () => say('drone_down'));
BZ.bus.on('siloPop', () => say('silo'));
BZ.bus.on('megatron', () => say('megatron'));
BZ.bus.on('shortCircuit', () => say('short_circuit'));
BZ.bus.on('rallyCap', () => say('rally_cap'));
BZ.bus.on('bullpenReady', () => radio('lou', 'Bullpen\'s ready! Pitching Change is in the pause menu.'));
BZ.bus.on('pitchingChange', d => { if (M && !M.fast) radio('pa', 'Now pitching... ' + d.in.name + '!'); });
// steals: a runner safe at the base he stole
BZ.bus.on('playOver', () => { const P_ = M && M.lastPlay; if (P_ && P_.steal) { const ok = !P_.outs.length; emit(ok ? 'safeSteal' : 'caughtStealing', {}); if (ok) { for (const r of M.runners) pStat(r.p).sb++; } } });
BZ.LINES = LINES;

/* ===== 24-crowd.js ===== */
/* CROWD AND BALLPARK LIFE: hype (follows the batting team's meter), reactions by side, the wave above 70, fireworks or
 * confetti after homers and wins, vendors, and the between-innings shows (Mascot Race, Dance Cam, T-Shirt Cannon,
 * Grounds Crew Shuffle), each about 4 s and skippable. */
const SHOWS = [['race', 'THE MASCOT RACE'], ['dance', 'DANCE CAM'], ['tshirt', 'T-SHIRT CANNON'], ['rakers', 'GROUNDS CREW SHUFFLE']];
function pickShow() { const i = Math.floor(RF() * SHOWS.length); return { kind: SHOWS[i][0], title: SHOWS[i][1], len: 4.2, t: 0, trip: Math.floor(RF() * 3) }; }
const CROWD = { jump: 0, side: 0, groan: 0, wave: 0, waveOn: false, pops: [] };
BZ.CROWD = CROWD;
BZ.bus.on('homer', d => { CROWD.jump = 2.5; CROWD.side = d.team; sfx('roar'); });
BZ.bus.on('hit', d => { CROWD.jump = 1.2; CROWD.side = M ? M.half : 0; sfx('cheer'); });
BZ.bus.on('catch', d => { CROWD.jump = d.dive || d.wall ? 1.5 : .6; CROWD.side = M ? 1 - M.half : 1; if (d.dive || d.wall) sfx('roar'); });
BZ.bus.on('strikeout', () => { CROWD.jump = .8; CROWD.side = M ? 1 - M.half : 1; CROWD.groan = 1; sfx('oooh'); });
BZ.bus.on('error', () => { CROWD.groan = 1.2; sfx('groan'); });
BZ.bus.on('bowlOver', () => { CROWD.jump = 1.2; sfx('oooh'); });
BZ.bus.on('rhubarbStart', () => { CROWD.jump = 12; sfx('roar'); });
function celebrate(x, y) {
  if (HEADLESS || !M) return;
  const night = M.park.night;
  for (let i = 0; i < 5; i++) game.after(i * .25, () => { const px_ = x + (RF() - .5) * 300, py_ = y + (RF() - .5) * 200, z = 140 + RF() * 80;
    if (night) { P.explosion(px_, py_, z, .6, { debris: false, shake: 0, freeze: false }); P.glints(px_, py_, z, 14, ['#ff5a5a', '#5ab0ff', '#ffe060', '#7dffb0'][i % 4]); sfx('firework'); }
    else { P.bits(px_, py_, z, 26, ['#ff5a5a', '#5ab0ff', '#ffe060', '#7dffb0', '#ffffff']); sfx('pop'); } });
}
BZ.bus.on('fireworks', d => celebrate(d.x, d.y));
BZ.bus.on('gameEnd', () => { if (M && !M.fast) celebrate(HX, HY - 700); });
BZ.bus.on('siloPop', () => { if (!HEADLESS) { const kit = PARK_CACHE.kernel, s = kit && kit.props.find(p => p.kind === 'silo'); if (s) P.bits(s.x, s.y, 120, 60, ['#fff4c0', '#ffe080', '#ffffff']); } });
function crowdStep(dt) {
  CROWD.jump = Math.max(0, CROWD.jump - dt); CROWD.groan = Math.max(0, CROWD.groan - dt);
  const hype = M ? offense().meter : 0; CROWD.waveOn = hype > 70; if (CROWD.waveOn) CROWD.wave += dt * 1.2;
  if (M && M.show) M.show.t += dt;
  for (const p of CROWD.pops) p.t -= dt; CROWD.pops = CROWD.pops.filter(p => p.t > 0);
  if (M && !M.fast && RF() < dt * .08 && CROWD.pops.length < 2) { const kit = PARK_CACHE[M.parkId]; if (kit && kit.fans.length) { const f = kit.fans[Math.floor(RF() * kit.fans.length)], t = ['PEANUTS!', 'GET YER DOGS!', 'COLD LEMONADE!', 'POPCORN!', 'PEANUTS! PEANUTS!'][Math.floor(RF() * 5)]; CROWD.pops.push({ x: f.x, y: f.y, z: f.z + 20, text: t, t: 1.8 }); if (RF() < .3 && !BZ.babble.q.length) BZ.babble.say(t, 'vendor'); } }
}

/* ===== 30-ui.js ===== */
/* 10-FOOT UI: big cards (never tables), at most about 7 items a screen, an obvious focus (10% bigger, a bright border, a
 * gentle bob), a legend of glyph icons at the bottom, and every screen driven the same way by the D-pad or stick, the
 * keyboard (arrows/WASD, Enter/Space, Escape) and the mouse (hover moves the focus, a click selects). */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ w: 200, h: 22, gap: 6, cols: 1, align: 'center' }, o); this.rects = []; this.t = 0; }
  get cur() { return this.items[this.i]; }
  visible() { return this.items.filter(it => !it.hidden); }
  update(I, dt) {
    this.t += dt; const vis = this.items.map((it, k) => [it, k]).filter(([it]) => !it.hidden); if (!vis.length) return;
    if (this.items[this.i] && this.items[this.i].hidden) this.i = vis[0][1];
    const pos = vis.findIndex(([, k]) => k === this.i), cols = this.o.cols;
    const mv = (d) => { let p = clamp(pos + d, 0, vis.length - 1); this.i = vis[p][1]; sfx('menu'); };
    if (I.repeat('up', .3, .1)) mv(-cols); if (I.repeat('down', .3, .1)) mv(cols);
    if (cols > 1) { if (I.repeat('left', .3, .1)) mv(-1); if (I.repeat('right', .3, .1)) mv(1); }
    const it = this.items[this.i];
    if (it && it.adjust) { if (I.repeat('left', .3, .12)) { it.adjust(-1); sfx('menu'); } if (I.repeat('right', .3, .12)) { it.adjust(1); sfx('menu'); } }
    // the mouse: hover focuses, click selects
    const pt = I.pointer && I.pointer(), cl = I.clicked && I.clicked();
    if (pt && I.lastDevice === 'mouse') for (const r of this.rects) if (pt[0] >= r.x && pt[0] < r.x + r.w && pt[1] >= r.y && pt[1] < r.y + r.h && this.i !== r.k) { this.i = r.k; }
    if (cl && !BZ.touchOnly) for (const r of this.rects) if (cl[0] >= r.x && cl[0] < r.x + r.w && cl[1] >= r.y && cl[1] < r.y + r.h) {
      this.i = r.k; const it2 = this.items[r.k];
      if (it2.adjust && r.arrow) { it2.adjust(r.arrow); sfx('menu'); return; }
      return this.pick(I);
    }
    if (I.pressed('confirm') || I.pressed('start')) { I.consume('confirm'); I.consume('start'); return this.pick(I); }
    if (I.pressed('cancel') && this.o.onBack) { I.consume('cancel'); sfx('back'); this.o.onBack(); return 'back'; }
  }
  pick(I) { const it = this.items[this.i]; if (!it || it.disabled) { sfx('back'); return; } sfx('ok'); if (it.act) it.act(I); return 'pick'; }
  draw(g, x, y) {
    const o = this.o, vis = this.items.map((it, k) => [it, k]).filter(([it]) => !it.hidden); this.rects = [];
    vis.forEach(([it, k], n) => {
      const col = n % o.cols, row = Math.floor(n / o.cols), foc = k === this.i, w = o.w, h = o.h;
      let bx = (o.align === 'center' ? x - (o.cols * w + (o.cols - 1) * o.gap) / 2 : x) + col * (w + o.gap), by = y + row * (h + o.gap);
      const s = foc ? 1.06 : 1, dw = w * s, dh = h * s, dx = bx - (dw - w) / 2, dy = by - (dh - h) / 2 + (foc ? Math.sin(this.t * 4) * 1 : 0);
      E.ui.box(g, dx, dy, dw, dh, { bg: it.disabled ? ['#2a2a34', '#1a1a22'] : foc ? ['#4a3a7a', '#2a1c4a'] : ['#24263a', '#14151f'], border: foc ? '#ffe680' : '#6a6c88', alpha: .95 });
      if (foc) px.rect(g, dx + 2, dy + 2, 3, dh - 4, '#ffe680');
      const tc = it.disabled ? '#6a6c80' : foc ? '#ffffff' : '#d8d8e8';
      if (it.adjust) {
        E.font.text(g, it.label, dx + 10, dy + dh / 2 - 3.5, tc, { shadow: '#000', outline: false });
        const v = typeof it.value === 'function' ? it.value() : it.value || '';
        E.font.text(g, '←  ' + v + '  →', dx + dw - 10, dy + dh / 2 - 3.5, foc ? '#ffe680' : '#a8a8c8', { align: 'right', shadow: '#000', outline: false });
        this.rects.push({ x: dx + dw - 26 - E.font.width(v), y: dy, w: 14, h: dh, k, arrow: -1 }, { x: dx + dw - 16, y: dy, w: 16, h: dh, k, arrow: 1 });
      } else {
        const sc = o.big ? 2 : 1;
        E.font.text(g, it.label, o.textAlign === 'left' ? dx + 10 : dx + dw / 2, dy + (it.sub && !o.noSub ? 4 : dh / 2 - 3.5 * sc), tc, { align: o.textAlign === 'left' ? 'left' : 'center', scale: sc, shadow: '#000', outline: false });
        if (it.sub && !o.noSub) E.font.text(g, it.sub, o.textAlign === 'left' ? dx + 10 : dx + dw / 2, dy + dh - 11, it.disabled ? '#5a5c70' : '#a8a8c8', { align: o.textAlign === 'left' ? 'left' : 'center', shadow: '#000', outline: false });
      }
      this.rects.push({ x: dx, y: dy, w: dw, h: dh, k });
    });
  }
}
/* the legend at the bottom of a screen: glyph icons for what the buttons do here */
function legend(g, W, H, items) { promptRow(g, game.input, items, W / 2, H - SAFE - 12, 'center'); }
function panel(g, x, y, w, h, o = {}) { E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1e2032', '#0e0f18'], border: '#8a8ca8', alpha: .94 }, o)); }
function title(g, s, x, y, sc = 3) { E.font.title(g, s, x, y, { scale: sc, colors: GOLD, align: 'center', depth: 2 }); }
function para(g, s, x, y, w, c = '#e8e8f0', o = {}) { const lines = wrapText(s, w, o); lines.forEach((l, i) => E.font.text(g, l, x, y + i * (o.scale ? 9 * o.scale : 10), c, Object.assign({ shadow: '#000', outline: false }, o))); return lines.length; }
/* a backdrop for menu screens: the title's park, slowly panning, under a dark veil */
const MENUBG = { t: 0 };
function menuBackdrop(r, dim = .55) {
  MENUBG.t += 1 / 60;
  const kit = parkKit(MENUBG.park || 'kernel');
  if (game.view !== E.VIEWS.broadcast && game.baseView !== E.VIEWS.broadcast) game.setView('broadcast');
  if (Math.abs((game.zoom || 1) - .8) > .01) game.setZoom(.8);
  game.focus(HX + Math.sin(MENUBG.t * .05) * 300, HY - 500 + Math.cos(MENUBG.t * .04) * 200, 0);
  LIGHTS.enabled = !!kit.park.night; if (kit.park.night) { LIGHTS.ambient = kit.park.ambient; for (const p of kit.props) if (p.kind === 'tower') LIGHTS.add(p.x, p.y, p.h, 900, .9, { color: '#e8f0ff' }); }
  const keep = M; M = null; try { drawBroadcast(r, kit); } finally { M = keep; }
  r.overlay(g => px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0a16')));
}

/* ===== 31-derby.js ===== */
/* THE BATZOOKA DERBY: the Pitch-O-Matic 3000 throws; any swing that isn't a home run is an out, a taken strike is an out,
 * balls are free. Each homer scores its distance in feet (x2 on every fifth pitch, the Golden Ball) plus target bonuses
 * (the blimp, the MEGA-TRON, drones). Three in a row fill the meter for one Batzooka swing. 10 outs or 2:00. */
function newDerby(o) {
  const m = newMatch({ mode: 'derby', park: o.park || 'megadome', away: o.team || 'COM', home: 'MMX', innings: 99, difficulty: 'pro', seed: o.seed, ctrl: [[o.input || null, null], [null, null]], fast: o.fast, cheats: o.cheats, shows: false, mercy: false, rhubarbs: false });
  m.derby = { outs: 0, maxOuts: o.outs || 10, time: o.time === undefined ? 120 : o.time, score: 0, hrs: 0, streak: 0, pitchN: 0, longest: 0, golden: false, done: false, last: null, hits: [], batter: o.batter || null, onHit: o.onHit || null, clock: !o.noClock };
  m.mercy = false; m.cheats.noCpuSuper = true;
  if (o.batter) { const T = m.teams[0]; T.lineup = [o.batter, ...T.lineup.filter(p => p !== o.batter)].slice(0, 9); T.order = 0; }
  m.phase = 'halfStart'; m.phaseT = 0; halfStartSetup(); setPhase('walkUp');
  if (o.deal) BZ.rng.deal = o.deal;
  return m;
}
/** the Pitch-O-Matic's pitch: 80% in the zone, small breaks, from the deal stream (the same on every hub copy) */
function derbyPitchChoice() {
  const d = BZ.rng.deal, Z = zoneOf(batterNow()), inZ = d() < .8;
  M.derby.pitchN++; M.derby.golden = M.derby.pitchN % 5 === 0;
  const x = inZ ? lerp(-5, 5, d()) : (d() < .5 ? -1 : 1) * (8 + d() * 4), z = inZ ? lerp(Z.z0 + 1, Z.z1 - 1, d()) : (d() < .5 ? Z.z0 - 5 : Z.z1 + 4);
  return { type: 'pitchomatic', slot: 0, x, z, q: 1, wait: M.fast ? 0 : .7 };
}
function derbyCross(cr, swung, inZ) {
  const D = M.derby;
  if (swung || inZ) { derbyOut(swung ? 'WHIFF' : 'STRIKE'); }
  else emit('derbyBall', {});
  return endPitch(swung ? 'out' : inZ ? 'out' : 'ball');
}
function derbyOut(why) { const D = M.derby; D.outs++; D.streak = 0; emit('derbyOut', { why, outs: D.outs }); if (D.outs >= D.maxOuts) derbyDone(); }
function derbyBallStep(dt) {
  const b = M.ball;
  if (b.mode === 'homer') { b.vz -= 520 * M.park.gravityMul * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 30) b.trail.shift(); } if (M.phaseT > (M.fast ? 0 : 1.8)) { M.cam = 'plate'; endPitch('hr'); } return; }
  const ev = ballStep(b, dt, false); hazardBall(b, dt);
  if (b.trail) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 24) b.trail.shift(); }
  if (ev === 'homer' || ev === 'pole') {
    const D = M.derby, dist = carryFeet(b);
    let pts = dist * (D.golden ? 2 : 1), bonus = 0, tag = '';
    if (M.park.id === 'megadome' && Math.abs(thetaOf(b.x, b.y) - .08) < .14) { bonus += 300; tag = 'MEGA-TRON +300'; }
    if (b.z > 160 && Math.abs(thetaOf(b.x, b.y) + .3) < .12) { bonus += 500; tag = 'BLIMP +500'; }
    if (Math.abs(thetaOf(b.x, b.y)) < .05) { bonus += 200; tag = tag || 'BULLSEYE +200'; }
    D.score += pts + bonus; D.hrs++; D.streak++; D.longest = Math.max(D.longest, dist); D.last = { dist, pts: pts + bonus, golden: D.golden, tag };
    D.hits.push({ dist, x: b.x, y: b.y });
    if (D.streak >= 3) { offense().meter = 100; D.streak = 0; emit('meterFull', { team: 0 }); }
    emit('homer', { batter: batterNow(), dist, batzooka: b.kind === 'batzooka', x: b.x, y: b.y, team: 0, derby: true, golden: D.golden });
    emit('derbyHit', { dist, pts: pts + bonus, tag });
    if (D.onHit) D.onHit({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, dist, bz: b.kind === 'batzooka' });
    b.mode = 'homer'; M.phaseT = 0; M.cam = M.fast ? 'plate' : 'moonshot'; if (!M.fast) sting('homer');
    return;
  }
  if (ev === 'grd' || ev === 'outFoul' || b.stopped || (b.bounced && M.phaseT > 1.2) || M.phaseT > 6) {
    if (M.derby.onHit && !b.sent) { b.sent = true; M.derby.onHit({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, dist: 0, bz: false, out: true }); }
    derbyOut(b.fair === false || ev === 'outFoul' ? 'FOUL' : 'NO DOUBT... NOT'); M.cam = 'plate'; return endPitch('out');
  }
}
function derbyTick(dt) {
  const D = M.derby; if (!D || D.done) return;
  if (D.clock && M.phase !== 'walkUp' && M.phase !== 'halfStart') D.time -= dt / Math.max(.01, game.timeScale || 1) * (game.timeScale ? game.timeScale : 1);
  if (D.time <= 0 && D.clock) { D.time = 0; derbyDone(); }
}
function derbyDone() { const D = M.derby; if (D.done) return; D.done = true; emit('derbyEnd', { score: D.score, hrs: D.hrs, longest: D.longest }); }

/* ---- the Derby's screens: setup (1-4 players, hot seat), the rounds, the initials and the Moonshot Leaders table ---- */
const DB = { n: 1, park: 'megadome', len: 'time', turn: 0, scores: [], menu: null, entry: null };
const derbyTable = () => { try { return E.store.get('bz:derby', null) || [{ n: 'DOT', s: 3200 }, { n: 'IKE', s: 2400 }, { n: 'LOU', s: 1979 }, { n: 'HAP', s: 1500 }, { n: 'PIP', s: 1100 }, { n: 'PEP', s: 900 }, { n: 'MOO', s: 700 }, { n: 'HNK', s: 500 }]; } catch (e) { return []; } };
const derbySave = t => { try { E.store.set('bz:derby', t); } catch (e) { /* storage blocked: the table lasts the visit */ } };
SCENES.derbySetup = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('derby'); DB.len = game.settings.derbyLength || 'time'; MENUBG.park = DB.park;
    DB.menu = new BigMenu([
      { label: 'BATTERS', adjust: d => { DB.n = clamp(DB.n + d, 1, 4); }, value: () => DB.n + (DB.n > 1 ? ' (HOT SEAT)' : '') },
      { label: 'PARK', adjust: d => { DB.park = cycle(parksUnlocked(), DB.park, d); MENUBG.park = DB.park; }, value: () => PARKS[DB.park].name },
      { label: 'LENGTH', adjust: d => { DB.len = DB.len === 'time' ? 'outs' : 'time'; }, value: () => DB.len === 'time' ? '2:00' : '10 OUTS' },
      { label: 'PLAY BALL!', act: () => { DB.turn = 0; DB.scores = []; game.go('derby'); } }
    ], { w: 260, h: 22, gap: 4, onBack: () => game.go('title') });
  },
  update(dt) { commonTick(dt); if (idleTick(dt)) return game.go('attract'); DB.menu.update(game.input, dt); },
  draw(r) {
    menuBackdrop(r, .55);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'BATZOOKA DERBY', W / 2, 10, 3);
      para(g, 'The Pitch-O-Matic 3000 serves them up. Any swing that isn\'t a homer is an out; so is a taken strike. Score the feet. Every 5th pitch is a GOLDEN BALL worth double. Three in a row fills the Batzooka.', W / 2 - 150, 40, 300, '#e8e8f0');
      DB.menu.draw(g, W / 2, 86); legend(g, W, H, [['confirm', 'SELECT'], [null, '←→ CHANGE'], ['cancel', 'BACK']]);
    });
  }
};
const DERBY_BATTERS = () => [TEAMS.COM.roster[0], TEAMS.COM.roster[3], TEAMS.COM.roster[7], TEAMS.COM.roster[4]];
SCENES.derby = {
  pausable: true, input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter() {
    const bat = DERBY_BATTERS()[DB.turn % 4];
    newDerby({ park: DB.park, input: game.input, batter: bat, outs: DB.len === 'outs' ? 10 : 99, time: DB.len === 'time' ? 120 : 9999, noClock: DB.len !== 'time', deal: E.rng(4242 + DB.turn) });
    M.onEnd = m => game.after(1.6, () => { DB.scores[DB.turn] = { n: DB.turn + 1, s: m.derby.score, hrs: m.derby.hrs, longest: m.derby.longest }; DB.turn++; if (DB.turn < DB.n) game.go('derby'); else game.go('derbyResults'); });
    BZ.derbyLabel = DB.n > 1 ? 'PLAYER ' + (DB.turn + 1) + ' UP' : '';
    music('derby'); game.setView('broadcast'); game.weather = M.park.weather; CAMS.z = 1; game.timeScale = TUNE.gameSpeed;
  },
  exit() { BZ.derbyLabel = ''; game.weather = null; },
  update(dt) {
    commonTick(dt); radioTick(dt);
    if (BZ.dev && BZ.dev.open) return devUpdate(dt);
    if (PLAYBOOK.open) return playbookUpdate(dt);
    matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt);
  },
  draw(r) { drawMatchWorld(r); drawHUD(r);  if (PLAYBOOK.open) playbookDraw(r); devDraw(r); }
};
SCENES.derbyResults = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('menu'); const best = DB.scores.slice().sort((a, b) => b.s - a.s)[0];
    SAVE.derbyBest = Math.max(SAVE.derbyBest || 0, best ? best.s : 0);
    const T = derbyTable(); DB.entry = best && (T.length < 8 || best.s > T[T.length - 1].s) ? { letters: [0, 0, 0], at: 0, score: best.s, done: false } : null;
    DB.menu = new BigMenu([{ label: 'AGAIN', act: () => { DB.turn = 0; DB.scores = []; game.go('derby'); } }, { label: 'SETUP', act: () => game.go('derbySetup') }, { label: 'TITLE', act: () => game.go('title') }], { w: 110, h: 20, gap: 4, cols: 3, onBack: () => game.go('title') });
  },
  update(dt) {
    commonTick(dt); const I = game.input, e = DB.entry;
    if (e && !e.done) {
      if (I.repeat('up', .3, .1)) { e.letters[e.at] = (e.letters[e.at] + 1) % 26; sfx('menu'); }
      if (I.repeat('down', .3, .1)) { e.letters[e.at] = (e.letters[e.at] + 25) % 26; sfx('menu'); }
      if (I.pressed('right')) e.at = Math.min(2, e.at + 1); if (I.pressed('left')) e.at = Math.max(0, e.at - 1);
      if (I.pressed('confirm')) { I.consumeAll(); if (e.at < 2) e.at++; else { e.done = true; const T = derbyTable(); T.push({ n: e.letters.map(c => String.fromCharCode(65 + c)).join(''), s: e.score }); T.sort((a, b) => b.s - a.s); derbySave(T.slice(0, 8)); sfx('coin'); } }
      return;
    }
    DB.menu.update(I, dt);
  },
  draw(r) {
    menuBackdrop(r, .65);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'MOONSHOT LEADERS', W / 2, 8, 3);
      DB.scores.forEach((s, i) => text(g, 'PLAYER ' + s.n + ':  ' + fmt(s.s) + ' FT   ' + s.hrs + ' HR   LONGEST ' + s.longest + ' FT', W / 2, 36 + i * 11, '#ffe680', { align: 'center' }));
      const e = DB.entry;
      if (e && !e.done) { const y = 86; text(g, 'NEW RECORD! YOUR INITIALS', W / 2, y, '#ffffff', { align: 'center' }); e.letters.forEach((c, i) => { const x = W / 2 - 30 + i * 30; panel(g, x - 11, y + 12, 22, 26, { border: i === e.at ? '#ffe680' : '#6a6c88' }); text(g, String.fromCharCode(65 + c), x, y + 18, '#ffffff', { align: 'center', scale: 2 }); }); legend(g, W, H, [[null, '↑↓ LETTER'], [null, '→ NEXT'], ['confirm', 'OK']]); return; }
      drawLeaders(g, W / 2, 84);
      DB.menu.draw(g, W / 2, H - 50); legend(g, W, H, [['confirm', 'SELECT'], ['cancel', 'TITLE']]);
    });
  }
};
function drawLeaders(g, cx, y) { const T = derbyTable(); panel(g, cx - 90, y - 4, 180, T.length * 11 + 8, { border: '#ffe680' }); T.forEach((t, i) => text(g, (i + 1) + '.  ' + t.n + '   ' + fmt(t.s) + ' FT', cx - 80, y + i * 11, i ? '#ffffff' : '#ffe680')); }

/* ===== 32-training.js ===== */
/* SPRING TRAINING: eight lessons taught by Grandpa Ike, each a real match set up as a drill, with goals counted from the
 * bus, prompts in the player's own glyphs, slow pitches where they help, and LESSON PASSED! Then the House Rules card. */
const P1 = () => game.input;
const ikePitches = m => { m.teams[1].pitcher = TEAMS.COM.roster[8]; m.teams[1].stamina[m.teams[1].pitcher.id] = 100; };
const LESSONS = [
  { id: 'bp', name: 'BATTING PRACTICE', intro: ['Aim the sweet spot where the pitch will cross, and swing as it gets there.', 'Contact swing: the big ring. Three fair balls and we\'re done.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { allStrikes: true, noCpuSuper: true }, tune: { pitchSpeed: .7 }, setup: ikePitches }), slow: true, bigSpot: true,
    goals: [['fair', 'FAIR BALLS', 3]] },
  { id: 'power', name: 'POWER AND BUNTS', intro: ['Power swing: the small red ring. Hit it square and it flies.', 'Then square around and bunt: hold the bunt button and let the ball hit the bat.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { allStrikes: true, noCpuSuper: true }, tune: { pitchSpeed: .75, exitVelocity: 1.3 }, setup: ikePitches }), slow: true,
    goals: [['powerHit', 'POWER-SWING EXTRA-BASE HIT OR HOMER', 1], ['bunt', 'FAIR BUNT', 1]] },
  { id: 'zone', name: 'READING THE ZONE', intro: ['A good eye wins at-bats. Take the balls, hit the strikes.', 'Watch the zone grid. Curves fall, sliders slide.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { noCpuSuper: true }, tune: { pitchSpeed: .85 } }),
    goals: [['takeBall', 'BALLS TAKEN', 2], ['hitStrike', 'STRIKES HIT FAIR', 2]] },
  { id: 'mound', name: 'ON THE MOUND', intro: ['Your turn to pitch. Pick a pitch with its button, aim during the windup...', '...and press again when the ring meets the target. Steer it early with the stick.'],
    cfg: () => ({ away: 'HCK', home: 'COM', park: 'kernel', ctrl: [[null, null], [P1(), null]], cheats: { noCpuSuper: true, cpuNoSwing: true } }),
    goals: [['strikeTypes', 'STRIKES WITH 3 DIFFERENT PITCHES', 3], ['perfect', 'PERFECT RELEASE', 1], ['after', 'AFTERTOUCH', 1]] },
  { id: 'field', name: 'LEATHER AND LASERS', intro: ['Fielding! The chaser runs to the ball by himself. You pick the throw.', 'Each base has its button: circle first, triangle second, square third, cross home. Or click the base.'],
    cfg: () => ({ away: 'HCK', home: 'COM', park: 'kernel', ctrl: [[null, null], [P1(), null]], cheats: { noCpuSuper: true, allStrikes: true }, tune: { cpuBat: 1.3 } }),
    goals: [['flyCatch', 'FLY BALLS CAUGHT', 2], ['throwOut', 'OUTS ON YOUR THROWS', 2]] },
  { id: 'wheels', name: 'WHEELS', intro: ['On the bases! Hold L1 and press a base button before the pitch to steal.', 'Turbo with L2. Runners go all on R1, back on L1.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { noCpuSuper: true, cpuNoSwing: false } }),
    goals: [['steal', 'STOLEN BASE', 1], ['turbo', 'TURBO USED', 1], ['score', 'RUN SCORED', 1]] },
  { id: 'batzooka', name: 'BATZOOKA!', intro: ['Your grandma\'s bat. The meter is full: arm it with R1, then swing.', 'Big ring, big loft, big boom. Miss it and it fizzles.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { infMeter: true, allStrikes: true, noCpuSuper: true }, tune: { pitchSpeed: .8 } }), slow: true,
    goals: [['bzHomer', 'BATZOOKA HOME RUN', 1]] },
  { id: 'rhubarb', name: 'RHUBARB 101', intro: ['Sometimes the benches empty. It\'s all slapstick, but you might as well win it.', 'Punch, shove and toss. Practice on the grounds crew.'],
    cfg: () => ({ away: 'COM', home: 'HCK', park: 'kernel', ctrl: [[P1(), null], [null, null]], cheats: { noCpuSuper: true } }),
    goals: [['punch', 'PUNCHES LANDED', 5], ['shove', 'SHOVES', 1], ['toss', 'TOSSES', 1]], rhubarbLen: 30 }
];
function lessonEnter(L) {
  M.lesson = { def: L, goals: L.goals.map(([id, label, need]) => ({ id, label, need, n: 0 })), slow: L.slow, bigSpot: L.bigSpot, passed: false, intro: 0, types: new Set(), rhubarbLen: L.rhubarbLen, noHazard: true };
  M.innings = 99; M.mercy = false; M.shows = false; M.phase = 'halfStart'; M.phaseT = 0; setFielders();
  M.lesson.introOpen = true; babble.say(L.intro.join(' '), 'ike');
  if (L.id === 'wheels') { const r = addRunner(offense().lineup[8], 1); r.p = TEAMS.COM.roster[0]; }
}
function lessonGoal(id, k = 1) { if (!M || !M.lesson || M.lesson.passed) return; const g = M.lesson.goals.find(g => g.id === id); if (!g || g.n >= g.need) return; g.n = Math.min(g.need, g.n + k); sfx('coin'); if (M.lesson.goals.every(g => g.n >= g.need)) lessonPassed(); }
function lessonPassed() {
  const L = M.lesson; L.passed = true; L.doneT = 0; stamp('LESSON PASSED!', GREEN, { scale: 3, life: 3 }); sting('victory');
  if (!SAVE.training.done.includes(L.def.id)) SAVE.training.done.push(L.def.id); autosave(); emit('lesson', { id: L.def.id, passed: true });
}
function lessonTick(dt) {
  const L = M.lesson;
  if (L.passed) { L.doneT += dt; if (L.doneT > 3) { M.lesson = null; game.go('lessons', { justPassed: L.def.id }); } return; }
  if (M.outs >= 2) M.outs = 0;
  if (M.phase === 'halfEnd' || M.half !== 0) { M.half = 0; M.outs = 0; M.inning = 1; setPhase('walkUp'); M.cam = 'plate'; setFielders(); }
  if (L.def.id === 'rhubarb' && M.phase === 'walkUp' && !M.rhubarb && !L.brawled) { L.brawled = true; startRhubarb(null, batterNow()); }
  if (L.def.id === 'rhubarb' && L.brawled && M.phase !== 'rhubarb' && !L.passed) { L.brawled = false; }
  if (L.def.id === 'wheels' && M.phase === 'walkUp' && !M.runners.length) addRunner(offense().lineup[0], 1);
  // Ike's fungo drill: every other ball is a lofted fly to the outfield
  if (L.def.id === 'field' && M.phase === 'select' && !L.fed) { L.fed = true; const fly = L.goals[0].n < L.goals[0].need && M.pitchCount % 2 === 0; M.force = Object.assign(M.force || {}, { contact: 'perfect', fungo: fly }); }
  if (M.phase !== 'select') L.fed = false;
  if (L.def.id === 'wheels') { const I = P1(); if (I.down('l2') && M.phase === 'inPlay') lessonGoal('turbo'); }
  for (const t of M.teams) t.runs = Math.min(t.runs, 9);
}
BZ.bus.on('playOver', d => { if (!M || !M.lesson) return; const P_ = M.lastPlay; if (!P_ || P_.steal) return; lessonGoal('fair'); if (P_.kind === 'bunt') lessonGoal('bunt'); if ((P_.hit >= 2 || P_.hr) && M.lastContact && M.lastContact.swing === 'power') lessonGoal('powerHit'); if (P_.inZone) lessonGoal('hitStrike'); });
BZ.bus.on('contact', () => { if (M && M.lesson && M.pitch) { const cr = pitchPos(M.pitch, 1); if (inZone(cr.x, cr.z, batterNow()) && M.play) M.play.inZone = true; } });
BZ.bus.on('call', d => { if (!M || !M.lesson) return; if (d.kind === 'ball' && !M.swing) lessonGoal('takeBall'); if (d.kind === 'strike' && M.lesson.def.id === 'mound') { if (!M.lesson.types.has(M.pitchType)) { M.lesson.types.add(M.pitchType); lessonGoal('strikeTypes'); } } });
BZ.bus.on('release', d => { if (!M || !M.lesson || d.cpu) return; if (d.q >= .95) lessonGoal('perfect'); });
BZ.bus.on('pitchCross', () => { if (M && M.lesson && M.pitch && M.pitch.after > .08 && !M.pitch.cpu) lessonGoal('after'); });
BZ.bus.on('catch', d => { if (M && M.lesson && d.fly) lessonGoal('flyCatch'); });
BZ.bus.on('received', () => { if (M && M.lesson) M.lesson.lastRecv = M.t; });
BZ.bus.on('forceOut', () => { if (M && M.lesson && M.lesson.lastRecv && M.t - M.lesson.lastRecv < .2) lessonGoal('throwOut'); });
BZ.bus.on('tagOut', () => { if (M && M.lesson && M.lesson.def.id === 'field') lessonGoal('throwOut'); });
BZ.bus.on('safeSteal', () => lessonGoal('steal'));
BZ.bus.on('run', d => { if (M && M.lesson && d.team === 0) lessonGoal('score'); });
BZ.bus.on('homer', d => { if (M && M.lesson && d.batzooka) lessonGoal('bzHomer'); if (M && M.lesson && M.lastContact && M.lastContact.swing === 'power') lessonGoal('powerHit'); });
BZ.bus.on('brawlHit', d => { if (!M || !M.lesson || !d.human) return; lessonGoal(d.kind === 'punch' ? 'punch' : d.kind); });
function lessonDraw(r) {
  r.overlay(g => {
    const L = M.lesson, W = r.W, x = W - SAFE - 150 - cornerW(), y = SAFE + 62;
    if (L.introOpen) { const H = r.H; panel(g, W / 2 - 160, H / 2 - 50, 320, 96, { border: '#4fe0b0' }); try { portraitOf('ike').drawPortrait(g, W / 2 - 152, H / 2 - 42, 36, { bg: '#1e2a5a' }); } catch (e) { /* first frame */ } text(g, 'GRANDPA IKE: ' + L.def.name, W / 2 - 110, H / 2 - 42, '#ffd36a'); L.def.intro.forEach((l, i) => para(g, l, W / 2 - 110, H / 2 - 28 + i * 24, 262)); promptRow(g, game.input, [['confirm', 'LET\'S GO']], W / 2, H / 2 + 30, 'center'); }
    panel(g, x, y, 150, 14 + L.goals.length * 12, { border: '#4fe0b0' });
    text(g, L.def.name, x + 6, y + 3, '#4fe0b0');
    L.goals.forEach((gl, i) => text(g, (gl.n >= gl.need ? '✓ ' : '') + gl.n + ' / ' + gl.need + '  ' + gl.label, x + 6, y + 14 + i * 12, gl.n >= gl.need ? '#4fe0b0' : '#ffffff'));
  });
}
const LS = { menu: null };
SCENES.lessons = {
  input: KEYS, camera: { zoom: false },
  enter(d) {
    IDLE.t = 0; music('training'); MENUBG.park = 'kernel'; LS.fromTour = (d && d.fromTour) || LS.fromTour;
    const items = LESSONS.map((L, i) => ({ label: (SAVE.training.done.includes(L.id) ? '✓ ' : '') + (i + 1) + '. ' + L.name, act: () => game.go('match', Object.assign(L.cfg(), { mode: 'training', innings: 99, lesson: L, onEnd: () => game.go('lessons') })) }));
    items.push({ label: 'HOUSE RULES', act: () => { PLAYBOOK.open = true; PLAYBOOK.page = PB_PAGES.length - 1; } });
    items.push({ label: LS.fromTour ? 'ON TO THE TOUR MAP' : 'BACK', act: () => { if (LS.fromTour) { LS.fromTour = false; autosave(); game.go('tourMap'); } else game.go('title'); } });
    LS.menu = new BigMenu(items, { w: 170, h: 18, gap: 3, cols: 2, textAlign: 'left', onBack: () => { if (LS.fromTour) { LS.fromTour = false; game.go('tourMap'); } else game.go('title'); } });
    if (d && d.justPassed) { const i = LESSONS.findIndex(L => L.id === d.justPassed); LS.menu.i = Math.min(i + 1, items.length - 1); }
  },
  update(dt) { commonTick(dt); if (PLAYBOOK.open) return playbookUpdate(dt); if (idleTick(dt)) return game.go('attract'); LS.menu.update(game.input, dt); },
  draw(r) {
    menuBackdrop(r, .55);
    r.overlay(g => { title(g, 'SPRING TRAINING', r.W / 2, 10, 3); text(g, 'with Grandpa Ike', r.W / 2, 36, '#c8c8d8', { align: 'center' }); LS.menu.draw(g, r.W / 2, 54); legend(g, r.W, r.H, [['confirm', 'START'], ['cancel', 'BACK']]); });
    if (PLAYBOOK.open) playbookDraw(r);
  }
};

/* ===== 33-tour.js ===== */
/* THE TOUR: Kernel Field is about to become a parking lot. Mortimer Megamax bets the deed on the Kaboom Cup, a
 * barnstorming tour of the wildest parks in baseball. Five road games (each with its cutscenes, rival and hazard), the
 * MegaDome boss, the Tour Map, the Clubhouse (Fan Bucks buy team upgrades), rewards from beaten rivals, saves, the ending
 * and the credits. */
const STOPS = [
  { park: 'barnacle', rival: 'HCK', reward: 'lumber', rewardName: 'BARNACLE GRIP TAPE', pin: [.2, .62],
    pre: [['brine', 'Ahoy, corn-pickers! The tide\'s coming in, and it\'s bringing a whole ocean of hurt!'], ['dot', 'We brought sunscreen.'], ['lou', 'Watch the gulls, folks. They\'ve got better hands than my old infield.']],
    win: [['brine', 'Blast it all. Take this. Barnacle Grip Tape. Sticks to anything, except a lead.'], ['ike', 'Lumber\'s a little sweeter now, kid.']], loss: [['brine', 'Back to the shallow end, landlubbers!']] },
  { park: 'caldera', rival: 'MCE', reward: 'cleats', rewardName: 'MAGMA CLEATS', pin: [.36, .3], rhubarb: true,
    pre: [['iggy', 'Hope you packed sunscreen. SPF one million.'], ['ike', 'Don\'t stand on anything that\'s glowing.'], ['hap', 'Word is Iggy throws inside when he\'s mad. Iggy is always mad.']],
    win: [['iggy', 'You\'ve got fire, Delgado. Here. Magma Cleats. They\'re only a little bit on fire.']], loss: [['iggy', 'Too hot for you? Thought so!']] },
  { park: 'tranquility', rival: 'MBM', reward: 'glove', rewardName: 'ZERO-G GLOVES', pin: [.55, .18],
    pre: [['cosmo', 'Welcome to the Moon, Comets. Up here every pop fly is a field trip.'], ['hank', 'Is there a snack bar on the Moon?'], ['lou', 'Gravity took the day off, folks. Somebody tell the baseball.']],
    win: [['cosmo', 'Mission accomplished, for you. Zero-G Gloves. They catch whatever gravity drops.']], loss: [['cosmo', 'Houston, you have a problem.']] },
  { park: 'boneyard', rival: 'HMH', reward: 'hype', rewardName: 'PHANTOM PINE TAR', pin: [.72, .4],
    pre: [['bones', 'We\'ve been dying to play you. Literally. Since 1887.'], ['pip', 'I\'m not scared.'], ['dot', 'Pip, you\'re holding Pep\'s hand.'], ['pip', 'He\'s holding MINE.']],
    win: [['bones', 'A fine game, mortals. Phantom Pine Tar. It makes the crowd scream louder.']], loss: [['bones', 'Rest in pieces, Comets. Heh heh heh.']] },
  { park: 'megadome', rival: 'MMX', reward: null, rewardName: 'THE KABOOM CUP', pin: [.86, .7], boss: true,
    pre: [['mort', 'Meet my ace. Ninety thousand horsepower. Zero feelings. ENFORCER-9000!'], ['robo', 'PREPARE. TO. BE. STRUCK. OUT.'], ['dot', 'Then let\'s give him some feelings.'], ['ike', 'Swing when they roar, kid.']],
    win: [['hap', 'The Batzooka\'s last blast rattles the MEGA-TRON! It\'s raining sparks in the MegaDome!'], ['mort', 'My jumbotron! My deed! My... reputation!'], ['hap', 'And the deed flutters into the backblast... and it\'s CONFETTI!'], ['dot', 'Kernel Field stays. Same time next season?'], ['robo', '...I. LIKE. BASEBALL.']],
    loss: [['mort', 'Pave it! Pave it all!']] }
];
const PROLOGUE = [['hap', 'Good evening, baseball fans, from Kernel Field, where the corn is high and the stakes are higher!'], ['mort', 'Enjoy your little cornfield, Comets. Monday it\'s a parking lot. Premium spaces only.'], ['dot', 'Over my dead batting glove.'],
  ['mort', 'Win the Kaboom Cup and I\'ll tear up the deed. Lose, and I pave the park AND hang that bat in my lobby.'], ['ike', 'Your grandma\'s BATZOOKA. Hickory, duct tape and a surplus bottle rocket. Summer of \'62.'], ['dot', 'What does it do?'],
  ['ike', 'Nothin\'. Till the crowd gets loud. Then it does EVERYTHING.'], ['lou', 'Folks, I haven\'t seen a bat that dangerous since I swung at my own shadow in \'79!']];
const UPGRADES = [['lumber', 'LUMBER', 'Exit speed +5% a tier', [400, 800, 1400]], ['glove', 'GLUE GLOVES', 'Catch radius and sure hands', [300, 700, 1200]], ['cleats', 'JET CLEATS', 'Run and field speed +4%', [300, 700, 1200]], ['arm', 'CANNON ARMS', 'Throws +5%, pitches +3%', [400, 800, 1400]], ['hype', 'HYPE MACHINE', 'Meter gain +10%', [500, 1000, 1600]]];

/* ---- the cutscene runner: the park as a stage, the speakers standing on it, their lines with portraits and babble.
 * Confirm advances a line; holding cancel for 1 s skips the scene ---- */
const STORY = { steps: [], i: 0, park: 'kernel', onDone: null, hold: 0, talk: null, cast: [] };
SCENES.story = {
  input: KEYS, camera: { zoom: false },
  enter(d) { Object.assign(STORY, { steps: d.steps, i: -1, park: d.park || 'kernel', onDone: d.onDone, hold: 0, title: d.title || '' }); MENUBG.park = STORY.park; music(d.song || 'tourmap'); STORY.talk = HEADLESS ? null : new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffe680', voice: null }); IDLE.t = 0; nextLine(); },
  update(dt) {
    commonTick(dt); const I = game.input;
    if (I.down('cancel') || I.down('east')) { STORY.hold += dt; if (STORY.hold > 1) { STORY.hold = 0; return endStory(); } } else STORY.hold = 0;
    if (STORY.talk) { STORY.talk.update(dt); if (!STORY.talk.open) nextLine(); }
    else if (I.pressed('confirm') || I.pressed('south')) { I.consumeAll(); nextLine(); }
  },
  draw(r) {
    menuBackdrop(r, .25);
    r.overlay(g => {
      const W = r.W, H = r.H, cur = STORY.steps[STORY.i];
      if (STORY.title) title(g, STORY.title, W / 2, 10, 2);
      // the speaker, big, on the left
      if (cur) { const rig = portraitOf(cur[0]); try { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: /!/.test(cur[1]) ? 'cheer' : null, expr: /!/.test(cur[1]) ? 'shout' : 'smile' }); rig.draw(g, Math.round(W * .2), Math.round(H * .66), E.VIEWS.side); } catch (e) { /* first frame */ } }
      if (STORY.hold > 0) { const a = STORY.hold * TAU; for (let k = 0; k < 24; k++) if (k / 24 * TAU < a) px.dot(g, W - 30 + Math.cos(k / 24 * TAU) * 8, 20 + Math.sin(k / 24 * TAU) * 8, '#ffe680'); }
      promptRow(g, game.input, [['confirm', 'NEXT'], ['cancel', 'HOLD: SKIP']], W / 2, 38, 'center');
    });
    if (STORY.talk) STORY.talk.draw(r);
  }
};
function nextLine() {
  STORY.i++; const s = STORY.steps[STORY.i]; if (!s) return endStory();
  if (STORY.talk) STORY.talk.say(s[1], { name: WHO[s[0]] || ({ brine: 'CAPTAIN BRINE', iggy: 'IGGY BLAZE', cosmo: 'COMMANDER COSMO', bones: 'COUNT RATTLEBONES', robo: 'ENFORCER-9000', hank: 'HANK HOLLIS', pip: 'PIP PORTER', kid: 'KID KERNEL' }[s[0]] || s[0].toUpperCase()), portrait: portraitOf(s[0]) });
  babble.say(s[1], s[0]);
}
function endStory() { babble.stop(); const f = STORY.onDone; STORY.onDone = null; if (STORY.talk) STORY.talk.close(); if (f) f(); else game.go('title'); }

/* ---- the Tour menu, map and clubhouse ---- */
const TOUR = { menu: null, map: null, club: null, busX: 0, msg: '', msgT: 0 };
SCENES.tourMenu = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('tourmap'); const has = game.saves && game.saves.latest && game.saves.latest();
    TOUR.menu = new BigMenu([
      { label: 'CONTINUE', hidden: !has, act: () => { game.saves.load(has.slot); game.go('tourMap'); } },
      { label: 'NEW TOUR', sub: 'Prologue: Last Game at Kernel Field?', act: () => newTour() },
      { label: 'LOAD', hidden: !has, act: () => { game.saves.show('load'); } },
      { label: 'BACK', act: () => game.go('title') }
    ], { w: 220, h: 26, gap: 5, onBack: () => game.go('title') });
  },
  update(dt) { commonTick(dt); if (idleTick(dt)) return game.go('attract'); TOUR.menu.update(game.input, dt); if (BZ.justLoaded) { BZ.justLoaded = false; if (game.saves.shown === undefined || true) game.go('tourMap'); } },
  draw(r) { menuBackdrop(r, .5); r.overlay(g => { title(g, 'THE KABOOM CUP TOUR', r.W / 2, 14, 3); TOUR.menu.draw(g, r.W / 2, 60); legend(g, r.W, r.H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
function newTour() {
  SAVE = SAVE_DEF(); SAVE.tour.started = true;
  game.go('story', { steps: PROLOGUE, park: 'kernel', title: 'LAST GAME AT KERNEL FIELD?', song: 'title', onDone: () => game.go('offerTraining') });
}
SCENES.offerTraining = {
  input: KEYS, camera: { zoom: false },
  enter() { TOUR.offer = new BigMenu([{ label: 'PLAY', sub: 'Learn the ropes with Grandpa Ike', act: () => game.go('lessons', { fromTour: true }) }, { label: 'SKIP', sub: 'Straight to the Tour Map', act: () => { autosave(); game.go('tourMap'); } }], { w: 220, h: 26, gap: 6, onBack: () => game.go('tourMap') }); },
  update(dt) { commonTick(dt); TOUR.offer.update(game.input, dt); },
  draw(r) { menuBackdrop(r, .5); r.overlay(g => { title(g, 'SPRING TRAINING?', r.W / 2, 20, 3); TOUR.offer.draw(g, r.W / 2, 70); legend(g, r.W, r.H, [['confirm', 'SELECT']]); }); }
};
function autosave() { try { if (game.saves && !hubActive()) { game.saves.canSave = true; game.saves.autosave(); } } catch (e) { game.fail('autosave', e); } }
SCENES.tourMap = {
  input: KEYS, camera: { zoom: false },
  enter() {
    IDLE.t = 0; music('tourmap'); if (game.saves) game.saves.canSave = true; TOUR.busX = TOUR.busX || 0;
    const T = SAVE.tour, done = T.done;
    TOUR.map = new BigMenu([
      { label: done ? 'REPLAY THE FINAL' : 'PLAY: ' + PARKS[STOPS[T.stop].park].name, sub: done ? 'The Kaboom Cup is yours' : 'vs the ' + TEAMS[STOPS[T.stop].rival].city + ' ' + TEAMS[STOPS[T.stop].rival].name, act: () => playStop(done ? 4 : T.stop) },
      { label: 'CLUBHOUSE', sub: fmt(SAVE.fb) + ' Fan Bucks', act: () => game.go('clubhouse') },
      { label: 'SAVE', act: () => { game.saves.show('save'); } },
      { label: 'TITLE', act: () => game.go('title') }
    ], { w: 150, h: 18, gap: 3, cols: 2, noSub: true, onBack: () => game.go('title') });
  },
  exit() { if (game.saves) game.saves.canSave = false; },
  update(dt) { commonTick(dt); TOUR.map.update(game.input, dt); TOUR.busX = approach(TOUR.busX, SAVE.tour.stop, dt * .8); TOUR.msgT = Math.max(0, TOUR.msgT - dt); },
  draw(r) {
    r.sky(['#2a4a2a', '#3a6a3a', '#4a7a3a']);
    r.overlay(g => {
      const W = r.W, H = r.H, mx = 30, my = 40, mw = W - 60, mh = H - 122;
      // the county map: fields, a river, the dotted road between the pins
      panel(g, mx - 6, my - 6, mw + 12, mh + 12, { bg: ['#6a8a4a', '#4a6a3a'], border: '#e8d8a0' });
      for (let i = 0; i < 14; i++) { const x = mx + E.hash2(i, 3) * mw, y = my + E.hash2(i, 7) * mh; px.rect(g, x, y, 30, 18, i % 2 ? '#7a9a4a' : '#8aa25a'); }
      px.line(g, mx, my + mh * .85, mx + mw, my + mh * .2, '#4a7ab8', 4);
      const pins = [[.08, .8], ...STOPS.map(s => s.pin)].map(([u, v]) => [mx + u * mw, my + v * mh]);
      for (let i = 0; i < pins.length - 1; i++) { const [a, b] = [pins[i], pins[i + 1]]; for (let t = 0; t < 1; t += .05) px.disc(g, lerp(a[0], b[0], t), lerp(a[1], b[1], t), 1, '#f4ecd8'); }
      pins.forEach(([x, y], i) => { const beaten = i === 0 || SAVE.tour.beaten.includes(i - 1), cur = i - 1 === SAVE.tour.stop && !SAVE.tour.done; px.disc(g, x, y, cur ? 7 : 5, beaten ? '#ffe680' : cur ? '#ff6a3a' : '#c8c8c8'); px.disc(g, x, y, 2.5, '#2a2a30'); text(g, i === 0 ? 'KERNEL FIELD' : PARKS[STOPS[i - 1].park].name.replace(' PARK', '').replace(' BALLPARK', ''), x, y + 9, '#ffffff', { align: 'center' }); });
      // the bus
      const p0 = pins[Math.min(5, SAVE.tour.done ? 5 : SAVE.tour.stop)], bob = Math.sin(game.real * 6) * 1;
      px.rect(g, p0[0] - 10, p0[1] - 20 + bob, 20, 9, '#f2c230'); px.rect(g, p0[0] - 8, p0[1] - 18 + bob, 4, 3, '#a8d8ff'); px.rect(g, p0[0] - 2, p0[1] - 18 + bob, 4, 3, '#a8d8ff'); px.rect(g, p0[0] + 4, p0[1] - 18 + bob, 4, 3, '#a8d8ff'); px.disc(g, p0[0] - 6, p0[1] - 11 + bob, 2, '#2a2a30'); px.disc(g, p0[0] + 6, p0[1] - 11 + bob, 2, '#2a2a30');
      title(g, 'TOUR MAP', W / 2, 8, 2); text(g, 'WINS ' + SAVE.tour.wins + '  LOSSES ' + SAVE.tour.losses + '   ' + fmt(SAVE.fb) + ' FB', W / 2, 28, '#ffe680', { align: 'center' });
      TOUR.map.draw(g, W / 2, H - 66); if (TOUR.map.cur && TOUR.map.cur.sub) text(g, TOUR.map.cur.sub, W / 2, my + mh + 4, '#ffe680', { align: 'center' });
      if (TOUR.msgT > 0) text(g, TOUR.msg, W / 2, my + mh / 2, '#ffffff', { align: 'center', scale: 2 });
      legend(g, W, H, [['confirm', 'SELECT'], ['cancel', 'TITLE']]);
    });
  }
};
function playStop(i) {
  const S = STOPS[i];
  game.go('story', { steps: S.pre, park: S.park, title: 'STOP ' + (i + 1) + ': ' + PARKS[S.park].name, song: 'tourmap', onDone: () => {
    const quick = game.settings.tourLength === 'quick';
    game.go('match', { mode: 'tour', away: 'COM', home: S.rival, park: S.park, innings: quick ? 1 : 3, difficulty: game.settings.difficulty, ctrl: [[game.input, null], [null, null]], boss: !!S.boss, tour: { stop: i, scriptedRhubarb: !!S.rhubarb }, upgrades: [SAVE.upgrades, null],
      onEnd: m => game.after(2.4, () => { const r = tourResult(i, m); game.go('results', { cfg: { mode: 'tour', next: () => postStop(i, r) } }); RES.fbTarget = r.fb; }) });
  } });
}
const FB_EVENTS = [];
BZ.bus.on('fanBucks', d => { if (M && M.mode === 'tour') FB_EVENTS.push(d.n); });
BZ.bus.on('matchStart', () => { FB_EVENTS.length = 0; });
function tourResult(i, m) {
  const com = m.teams.findIndex(t => t.def.id === 'COM'), won = m.winner === com;
  let fb = won ? 500 : 150; for (const p of m.teams[com].def.roster) { const s = m.stats[p.id]; if (s) fb += s.hr * 50; }
  fb += BZ.bus.log.filter(e => e.ev === 'homer' && e.data.batzooka && e.data.team === com).length * 100;
  if (won && m.teams[1 - com].runs === 0) fb += 200;
  fb += FB_EVENTS.reduce((a, b) => a + b, 0);
  SAVE.fb += fb; if (won) SAVE.tour.wins++; else SAVE.tour.losses++;
  emit('tourStop', { stop: i, won, fb });
  return { won, fb };
}
function postStop(i, res) {
  const S = STOPS[i];
  if (!res.won) return game.go('story', { steps: S.loss.concat([['ike', 'RAIN CHECK. We\'ll get \'em next time, kid. Maybe hit the Clubhouse first.']]), park: S.park, title: 'RAIN CHECK', onDone: () => { autosave(); game.go('tourMap'); } });
  if (!SAVE.tour.beaten.includes(i)) { SAVE.tour.beaten.push(i); if (S.reward) SAVE.upgrades[S.reward] = Math.min(3, SAVE.upgrades[S.reward] + 1); }
  if (i === 4) { SAVE.tour.done = true; SAVE.unlocked = true; autosave(); return game.go('story', { steps: S.win, park: 'megadome', title: 'THE KABOOM CUP!', song: 'credits', onDone: () => game.go('credits', { ending: true }) }); }
  SAVE.tour.stop = Math.max(SAVE.tour.stop, i + 1);
  autosave();
  game.go('story', { steps: S.win.concat([['hap', 'The Comets pick up ' + S.rewardName + '! Next stop: ' + PARKS[STOPS[i + 1].park].name + '!']]), park: S.park, title: 'VICTORY!', song: 'tourmap', onDone: () => game.go('tourMap') });
}
SCENES.clubhouse = {
  input: KEYS, camera: { zoom: false },
  enter() { IDLE.t = 0; music('menu'); TOUR.club = new BigMenu(UPGRADES.map(([k, n, d, cost]) => ({ label: n, sub: '', key: k, act: () => buy(k, cost) })).concat([{ label: 'BACK TO THE MAP', act: () => game.go('tourMap') }]), { w: 270, h: 26, gap: 4, onBack: () => game.go('tourMap') }); TOUR.ike = 'Spend those Fan Bucks wisely, kid.'; },
  update(dt) { commonTick(dt); TOUR.club.update(game.input, dt); },
  draw(r) {
    menuBackdrop(r, .65);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'CLUBHOUSE', W / 2, 8, 3); text(g, fmt(SAVE.fb) + ' FAN BUCKS', W / 2, 32, '#ffe680', { align: 'center', scale: 2 });
      UPGRADES.forEach(([k, n, d, cost], i) => { const it = TOUR.club.items[i], t = SAVE.upgrades[k]; it.sub = d + '   ' + '■'.repeat(t) + '□'.repeat(3 - t) + '   ' + (t >= 3 ? 'MAXED' : fmt(cost[t]) + ' FB'); it.disabled = t >= 3 || SAVE.fb < cost[t]; });
      TOUR.club.draw(g, W / 2, 52);
      panel(g, SAFE, H - 64, W - SAFE * 2, 24, { border: '#ffe680' }); text(g, 'GRANDPA IKE: ' + TOUR.ike, SAFE + 8, H - 57, '#ffffff');
      legend(g, W, H, [['confirm', 'BUY'], ['cancel', 'BACK']]);
    });
  }
};
function buy(k, cost) {
  const t = SAVE.upgrades[k]; if (t >= 3 || SAVE.fb < cost[t]) { sfx('back'); return; }
  SAVE.fb -= cost[t]; SAVE.upgrades[k]++; sfx('coin'); emit('purchase', { k, tier: SAVE.upgrades[k] });
  TOUR.ike = { lumber: 'Heavier wood, harder hits. Grandma would approve.', glove: 'Glue on the gloves. Don\'t touch your face.', cleats: 'Faster feet. Try not to outrun the ball.', arm: 'Cannon arms! Aim them at the bag, not the bleachers.', hype: 'Louder crowd, hotter Batzooka. Now we\'re cooking.' }[k];
  babble.say(TOUR.ike, 'ike'); autosave();
}
/* ---- credits: they roll over a blooper reel of mascots and pratfalls; then the title ---- */
SCENES.credits = {
  input: KEYS, camera: { zoom: false },
  enter(d) { this.t = 0; this.ending = d && d.ending; music('credits'); MENUBG.park = 'kernel'; },
  update(dt) { commonTick(dt); this.t += dt; const I = game.input; if (I.pressed('confirm') || I.pressed('cancel') || this.t > 48) { I.consumeAll(); game.go(this.ending ? 'title' : 'about'); } },
  draw(r) {
    menuBackdrop(r, .55);
    r.overlay(g => {
      const W = r.W, H = r.H, lines = creditLines(this.ending);
      lines.forEach((l, i) => { const y = H - this.t * 22 + i * 14; if (y > -20 && y < H + 10) (l.startsWith('#') ? (s => E.font.title(g, s, W / 2, y, { scale: 2, colors: GOLD, align: 'center' })) : (s => text(g, s, W / 2, y, '#ffffff', { align: 'center' })))(l.replace(/^#/, '')); });
      // the blooper reel: mascots tumbling along the bottom
      PARK_ORDER.forEach((id, i) => { const bl = mascotOf(id), x = ((this.t * 40 + i * 70) % (W + 60)) - 30; bl.update(1 / 60, { walk: 1, squash: Math.sin(this.t * 10 + i) * .3 }); try { bl.draw(g, Math.round(x), H - 26 - Math.abs(Math.sin(this.t * 5 + i)) * 10, E.VIEWS.side); } catch (e) { /* none */ } });
    });
  }
};
function creditLines(ending) {
  const L = ending ? ['#THE END?', 'Kernel Field is saved!', 'Exhibition: everything unlocked.', ''] : [];
  return L.concat(['#BATZOOKA BASEBALL', '', 'Design, code, art, music and writing', 'Claude (claude-opus-5-5, Anthropic)', 'built from PLAN.md', '', '#ENGINE', 'my-3D2dge v0.85.2 (MIT)', 'github.com/michaelcrosato/my-3d2dge', '', '#ONLINE', 'AI Hub Session client 1.4.0', 'michaelcrosato/ai-hub', '', '#STARRING', 'Dot "Dynamite" Delgado', 'Grandpa Ike Kowalski', 'Hap Harrigan and "Big" Lou Bombeck', 'Gloria Vox on the PA', 'Umpire Barb Hammersmith', 'Mortimer Megamax', 'ENFORCER-9000', '', '#MASCOTS', 'Popcorn Pete, Squidge, Sparky', 'Moonpie, Boo and Mr. Synergy', '', 'All sounds, music and voices', 'synthesized in code', '', '#THANKS FOR PLAYING!']);
}

/* ===== 34-menus.js ===== */
/* SCREENS: the title (with its mode menu), Options, Team Select with joining (1-4 players), the match scene, results,
 * the Playbook (help per context), the pause menu's items, and the save data. */
const SAVE_DEF = () => ({ v: 1, tour: { stop: 0, beaten: [], wins: 0, losses: 0, started: false, done: false }, fb: 0, upgrades: { lumber: 0, glove: 0, cleats: 0, arm: 0, hype: 0 }, unlocked: false, training: { done: [] }, derbyBest: 0 });
let SAVE = SAVE_DEF();
BZ.save = () => SAVE;
function initSaves() {
  const S = game.saves; if (!S) return;
  S.write = () => ({ data: JSON.parse(JSON.stringify(SAVE)), place: SAVE.tour.done ? 'TOUR COMPLETE' : 'TOUR STOP ' + (SAVE.tour.stop + 1), level: fmt(SAVE.fb) + ' FB' });
  S.read = s => { SAVE = Object.assign(SAVE_DEF(), s.data || {}); SAVE.tour = Object.assign(SAVE_DEF().tour, SAVE.tour); SAVE.upgrades = Object.assign(SAVE_DEF().upgrades, SAVE.upgrades); BZ.justLoaded = true; };
}
const hubActive = () => typeof AIHub !== 'undefined' && AIHub && AIHub.active;
const teamsUnlocked = () => TEAM_ORDER.filter(id => !TEAMS[id].locked || SAVE.unlocked || SAVE.tour.stop >= 4 || SAVE.tour.done);
const parksUnlocked = () => PARK_ORDER.filter(id => id !== 'megadome' || SAVE.unlocked || SAVE.tour.stop >= 4 || SAVE.tour.done);

/* ---- settings (the engine's screens show them; the game reads game.settings.x) ---- */
function defineSettings() {
  const D = (key, label, value, options, group = 'Game', help) => game.settings.define(Object.assign({ key, label, value, group, help }, options ? { options } : {}));
  D('difficulty', 'Difficulty', 'pro', [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star'], ['batzooka', 'Batzooka']]);
  D('innings', 'Exhibition innings', 3, [[1, '1'], [3, '3'], [5, '5'], [9, '9']]);
  D('tourLength', 'Tour game length', 'standard', [['standard', 'Standard (3 innings)'], ['quick', 'Quick (1 inning)']]);
  D('mercy', 'Mercy rule (10 runs)', true); D('comeback', 'Comeback Boost', true); D('rhubarbs', 'Rhubarbs', true);
  D('derbyLength', 'Derby length', 'time', [['time', '2:00'], ['outs', '10 outs']]);
  D('batAssist', 'Batting assist', 'hints', [['off', 'Off'], ['hints', 'Timing hints'], ['big', 'Big sweet spot']], 'Assists');
  D('pitchAssist', 'Pitching assist', 'off', [['off', 'Off'], ['auto', 'Auto-aim']], 'Assists');
  D('fielding', 'Fielding', 'assisted', [['manual', 'Manual'], ['assisted', 'Assisted'], ['auto', 'Auto']], 'Assists');
  D('baserunning', 'Baserunning', 'auto', [['manual', 'Manual'], ['auto', 'Auto']], 'Assists');
  D('timingFeedback', 'Timing feedback', true, null, 'Display');
  D('zone', 'Strike zone', 'pitch', [['always', 'Always'], ['pitch', 'During the pitch'], ['off', 'Off']], 'Display');
  D('plateCam', 'Plate Cam', 'classic', [['classic', 'Classic'], ['close', 'Close']], 'Display');
  D('fieldCam', 'Field camera', 'broadcast', [['broadcast', 'Broadcast'], ['high', 'High'], ['iso', 'Isometric']], 'Display');
  D('replays', 'Replays', 'big', [['big', 'Big plays'], ['off', 'Off']], 'Display');
  D('commentary', 'Commentary', 'on', [['on', 'On'], ['big', 'Big plays only'], ['off', 'Off']], 'Sound');
  game.settings.define({ key: 'voices', label: 'Voices', type: 'slider', value: .8, min: 0, max: 1, step: .05, group: 'Sound' });
  D('keepTune', 'Keep dev tuning between visits', false, null, 'Developer');
}

/* ---- the title ---- */
const TITLE = { menu: null, sub: null, dot: null };
function titleMenu() {
  const go = (s, d) => () => game.go(s, d);
  TITLE.menu = new BigMenu([
    { label: 'CONTINUE', sub: 'Pick up the Tour', act: () => { const l = game.saves.latest && game.saves.latest(); if (l) { game.saves.load(l.slot); } game.go('tourMap'); } },
    { label: 'TOUR', sub: 'Save Kernel Field', act: go('tourMenu') },
    { label: 'EXHIBITION', sub: '1-4 players', act: go('teamSelect') },
    { label: 'BATZOOKA DERBY', sub: 'Home-run derby', act: go('derbySetup') },
    { label: 'SPRING TRAINING', sub: 'Learn the game', act: go('lessons') },
    { label: 'OPTIONS', sub: 'Settings · Controls · Playbook', act: () => { TITLE.sub = optionsMenu(); } },
    { label: 'ABOUT', sub: 'Credits and source', act: go('about') }
  ], { w: 168, h: 18, gap: 3, noSub: true });
}
function optionsMenu() {
  return new BigMenu([
    { label: 'SETTINGS', act: () => { TITLE.sub = null; game.menu('settings'); } },
    { label: 'CONTROLS', act: () => { TITLE.sub = null; game.menu('controls'); } },
    { label: 'PLAYBOOK', act: () => { TITLE.sub = null; PLAYBOOK.open = true; PLAYBOOK.page = 0; } },
    { label: 'BACK', act: () => { TITLE.sub = null; } }
  ], { w: 168, h: 18, gap: 3, onBack: () => { TITLE.sub = null; } });
}
SCENES.title = {
  input: KEYS, camera: { zoom: false },
  enter() {
    if (!TITLE.menu) titleMenu(); MENUBG.park = 'kernel'; music('title'); IDLE.t = 0; M = BZ.M = null; game.weather = { kind: 'leaves', amount: .1, wind: .2 };
    game.allowJoin(false); for (let i = game.players.length - 1; i >= 1; i--) game.removePlayer(game.players[i]);
    const has = game.saves && game.saves.latest && game.saves.latest(); TITLE.menu.items[0].hidden = !has; if (!has && TITLE.menu.i === 0) TITLE.menu.i = 1;
    if (!TITLE.dot && !HEADLESS) { TITLE.dot = makeRig(TEAMS.COM.roster[0], 'bat'); }
  },
  update(dt) {
    commonTick(dt);
    if (idleTick(dt) && !PLAYBOOK.open) return game.go('attract');
    if (PLAYBOOK.open) return playbookUpdate(dt);
    const I = game.input;
    if (BZ.touchOnly) { const c = I.clicked && I.clicked(); if (c && TITLE.touchBtn && c[0] >= TITLE.touchBtn.x && c[0] < TITLE.touchBtn.x + TITLE.touchBtn.w && c[1] >= TITLE.touchBtn.y && c[1] < TITLE.touchBtn.y + TITLE.touchBtn.h) game.menu('settings'); return; }
    if (TITLE.sub) TITLE.sub.update(I, dt); else TITLE.menu.update(I, dt);
    if (TITLE.dot) TITLE.dot.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: game.time % 6 < 1.5 ? 'cheer' : null, expr: 'smile' });
  },
  draw(r) {
    menuBackdrop(r, .35);
    r.overlay(g => {
      const W = r.W, H = r.H, top = 12;
      E.font.title(g, 'BATZOOKA', W / 2, top - 4, { scale: 4, colors: GOLD, align: 'center', depth: 3 });
      E.font.title(g, 'BASEBALL', W / 2, top + 28, { scale: 2, colors: ['#ffffff', '#c8d8ff', '#6a8adf'], align: 'center', depth: 2 });
      px.blend(g, .7, 'add', () => { for (let i = 0; i < 26; i++) { const x = W / 2 - 110 + i * 8.5 + Math.sin(game.real * 8 + i) * 2, y = top + 48 + Math.sin(i * .5 + game.real * 3) * 2; px.disc(g, x, y, 2.6 - i / 13, i % 3 ? '#ff8a2a' : '#ffe060'); } });
      if (TITLE.dot) { try { TITLE.dot.draw(g, Math.round(W * .17), Math.round(H * .78), E.VIEWS.side); } catch (e) { /* first frame */ } }
      if (BZ.touchOnly) {
        panel(g, W / 2 - 120, H / 2 - 34, 240, 96, { border: '#ffe680' });
        text(g, 'Controller or keyboard required', W / 2, H / 2 - 24, '#ffffff', { align: 'center' });
        // a controller and a keyboard, drawn
        px.rect(g, W / 2 - 60, H / 2 - 8, 40, 18, '#c8c8d8'); px.disc(g, W / 2 - 52, H / 2 + 1, 3, '#2a2c3a'); px.disc(g, W / 2 - 28, H / 2 + 1, 3, '#2a2c3a');
        px.rect(g, W / 2 + 14, H / 2 - 6, 48, 16, '#c8c8d8'); for (let i = 0; i < 8; i++) px.rect(g, W / 2 + 17 + i * 5.5, H / 2 - 3, 4, 4, '#2a2c3a');
        TITLE.touchBtn = { x: W / 2 - 50, y: H / 2 + 26, w: 100, h: 26 }; E.ui.box(g, TITLE.touchBtn.x, TITLE.touchBtn.y, 100, 26, { bg: ['#4a3a7a', '#2a1c4a'], border: '#ffe680' }); text(g, 'SETTINGS', W / 2, H / 2 + 35, '#ffffff', { align: 'center' });
      } else {
        const mn = TITLE.sub || TITLE.menu; mn.draw(g, W / 2, top + 56);
        if (mn.cur && mn.cur.sub) text(g, mn.cur.sub, W / 2, H - 38, '#ffe680', { align: 'center' });
        legend(g, W, H, [['confirm', 'SELECT'], TITLE.sub ? ['cancel', 'BACK'] : null]);
      }
      text(g, 'v' + BZ.version + ' · ' + (E.versionLabel ? E.versionLabel() : ''), W - SAFE, H - 10, '#6a6c88', { align: 'right' });
    });
    if (PLAYBOOK.open) playbookDraw(r);
  }
};

/* ---- Team Select (Exhibition): two big cards, park, innings, difficulty; players join and pick sides ---- */
const TS = { away: 'COM', home: 'HCK', park: 'barnacle', innings: 3, diff: 'pro', sides: {}, menu: null, rigs: {} };
function cycle(list, cur, d) { const i = list.indexOf(cur); return list[(i + d + list.length) % list.length]; }
SCENES.teamSelect = {
  input: KEYS, camera: { zoom: false },
  enter() {
    MENUBG.park = TS.park; IDLE.t = 0; music('menu'); TS.innings = game.settings.innings || 3; TS.diff = game.settings.difficulty || 'pro';
    game.allowJoin({ max: 4, onJoin: (I, n) => { TS.sides[n] = n % 2 ? 1 : 0; sfx('ok'); } }); TS.sides[1] = TS.sides[1] === undefined ? 0 : TS.sides[1];
    TS.menu = new BigMenu([
      { label: 'AWAY', adjust: d => { TS.away = cycle(teamsUnlocked(), TS.away, d); }, value: () => TEAMS[TS.away].name },
      { label: 'HOME', adjust: d => { TS.home = cycle(teamsUnlocked(), TS.home, d); TS.park = TEAMS[TS.home].park; MENUBG.park = TS.park; }, value: () => TEAMS[TS.home].name },
      { label: 'PARK', adjust: d => { TS.park = cycle(parksUnlocked(), TS.park, d); MENUBG.park = TS.park; }, value: () => PARKS[TS.park].name },
      { label: 'INNINGS', adjust: d => { TS.innings = cycle([1, 3, 5, 9], TS.innings, d); }, value: () => String(TS.innings) },
      { label: 'DIFFICULTY', adjust: d => { TS.diff = cycle(DIFF_ORDER, TS.diff, d); }, value: () => DIFF[TS.diff].name },
      { label: 'P1 SIDE', adjust: d => { TS.sides[1] = TS.sides[1] === 0 ? 1 : TS.sides[1] === 1 ? -1 : 0; }, value: () => TS.sides[1] === 0 ? 'AWAY' : TS.sides[1] === 1 ? 'HOME' : 'WATCH (CPU VS CPU)' },
      { label: 'PLAY BALL!', act: () => startExhibition() }
    ], { w: 190, h: 18, gap: 3, onBack: () => game.go('title') });
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    commonTick(dt); if (idleTick(dt) && game.players.length === 1) return game.go('attract');
    TS.menu.update(game.input, dt);
    for (let i = 1; i < game.players.length; i++) { const I = game.players[i], n = I.player; if (I.pressed('left')) TS.sides[n] = 0; if (I.pressed('right')) TS.sides[n] = 1; if (I.pressed('cancel')) { game.removePlayer(I); delete TS.sides[n]; } }
    for (const id of [TS.away, TS.home]) { const rig = TS.rigs[id] || (TS.rigs[id] = HEADLESS ? null : makeRig(TEAMS[id].captain, 'bat')); if (rig) rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(game.time) * .6, expr: 'smile' }); }
  },
  draw(r) {
    menuBackdrop(r, .6);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'EXHIBITION', W / 2, 8, 3);
      [TS.away, TS.home].forEach((id, s) => {
        const T = TEAMS[id], cw = Math.min(100, (W - 190) / 2 - 18), x = s ? W - SAFE - cw : SAFE, y = 36;
        panel(g, x, y, cw, 110, { border: T.chip }); text(g, s ? 'HOME' : 'AWAY', x + cw / 2, y + 4, '#a8a8c8', { align: 'center' });
        if (TS.rigs[id]) try { TS.rigs[id].draw(g, Math.round(x + cw / 2), y + 74, E.VIEWS.side); } catch (e) { /* not posed yet */ }
        text(g, T.name, x + cw / 2, y + 80, '#ffffff', { align: 'center', scale: 1 });
        text(g, 'POW ' + '★'.repeat(T.stars[0]), x + cw / 2, y + 90, '#ffe680', { align: 'center' }); text(g, 'SPD ' + '★'.repeat(T.stars[1]), x + cw / 2, y + 99, '#ffe680', { align: 'center' });
        text(g, 'PIT ' + '★'.repeat(T.stars[2]), x + cw / 2, y + 108, '#ffe680', { align: 'center' });
      });
      TS.menu.draw(g, W / 2, 38);
      // the players' cards, slid to their sides
      const ps = game.players; ps.forEach((I, i) => { const n = I.player, sd = TS.sides[n], x = sd === 0 ? SAFE + 8 + i * 26 : sd === 1 ? W - SAFE - 34 - i * 26 : W / 2 - 13, y = 152;
        E.ui.box(g, x, y, 24, 18, { bg: I.color || E.PLAYER_COLORS[i], border: '#ffffff' }); text(g, 'P' + n, x + 12, y + 5, '#ffffff', { align: 'center' }); });
      para(g, ps.length < 4 ? 'More players: START on a free pad, or 2 on the keyboard. P2-P4: ←/→ picks a side.' : 'Four players in!', W / 2 - 150, 176, 300, '#c8c8d8');
      legend(g, W, H, [['confirm', 'SELECT'], [null, '←→ CHANGE'], ['cancel', 'BACK']]);
    });
  }
};
function sideCtrl() {
  const ctrl = [[null, null], [null, null]];
  for (const I of game.players) { const sd = TS.sides[I.player]; if (sd === 0 || sd === 1) { if (!ctrl[sd][0]) ctrl[sd][0] = I; else if (!ctrl[sd][1]) ctrl[sd][1] = I; } }
  return ctrl;
}
function startExhibition() {
  const cfg = { mode: 'exhibition', away: TS.away, home: TS.home, park: TS.park, innings: TS.innings, difficulty: TS.diff, ctrl: sideCtrl() };
  BZ.lastExhibition = cfg; game.go('match', cfg);
}

/* ---- the match scene: exhibition, tour and lessons all play here ---- */
SCENES.match = {
  pausable: true, input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter(cfg) {
    BZ.matchCfg = cfg = cfg || BZ.matchCfg || { away: 'COM', home: 'HCK' };
    const s = game.settings;
    newMatch(Object.assign({ difficulty: s.difficulty, mercy: s.mercy, comeback: s.comeback, rhubarbs: s.rhubarbs, innings: s.innings }, cfg, { onEnd: cfg.onEnd || (m => game.after(2.2, () => game.go('results', { cfg }))) }));
    if (cfg.boss) M.boss = { speed: 1, circuit: 0, rally: false };
    if (cfg.tune) Object.assign(TUNE, cfg.tune);
    music(M.park.song); game.setView(fieldView()); game.weather = M.park.weather; CAMS.x = HX; CAMS.y = HY - 300; CAMS.z = 1;
    if (cfg.lesson) lessonEnter(cfg.lesson);
    game.timeScale = TUNE.gameSpeed;
    if (cfg.after) cfg.after(M);
  },
  exit() { game.timeScale = 1; RADIO.who = null; game.weather = null; if (BZ.matchCfg && BZ.matchCfg.tune) BZ.resetTune(); },
  update(dt) {
    commonTick(dt); radioTick(dt);
    if (BZ.dev && BZ.dev.open) return devUpdate(dt);
    if (PLAYBOOK.open) return playbookUpdate(dt);
    if (!M) return;
    if (M.lesson && M.lesson.introOpen) { const I = game.input; if (I.pressed('confirm') || I.pressed('south')) { I.consumeAll(); M.lesson.introOpen = false; } return; }
    if (M.lesson) lessonTick(dt);
    matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt);
    if (M.fielders.some(f => f.human) && defHumanInput() && defHumanInput().pressed('l1') && !holderF()) switchFielder();
    pinTick();
  },
  draw(r) { drawMatchWorld(r); drawHUD(r); if (M && M.lesson) lessonDraw(r);  if (PLAYBOOK.open) playbookDraw(r); devDraw(r); pinDraw(r); },
  back() { if (PLAYBOOK.open) { PLAYBOOK.open = false; return true; } if (BZ.dev && BZ.dev.open) { BZ.dev.open = false; return true; } return false; }
};
function switchFielder() {
  const b = M.ball; if (!b) return; const cur = M.fielders.find(f => f.human);
  const list = M.fielders.slice().sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
  const nxt = list[(list.indexOf(cur) + 1) % 3]; for (const F of M.fielders) F.human = false; nxt.human = true; nxt.job = 'chase'; nxt.react = 0; sfx('menu');
}

/* ---- results ---- */
const RES = { menu: null, cfg: null, stars: [], fbShown: 0 };
SCENES.results = {
  input: KEYS, camera: { zoom: false },
  enter(d) {
    RES.cfg = d.cfg; const m = M; RES.m = m; RES.fbShown = 0; music(null); sting(m.winner === humanSide() || humanSide() < 0 ? 'victory' : 'defeat'); MENUBG.park = m.parkId;
    // the three stars: hits, homers, strikeouts
    const all = []; for (const t of m.teams) for (const p of t.def.roster) { const s = m.stats[p.id]; if (s) all.push({ p, sc: s.h * 2 + s.hr * 4 + s.rbi * 2 + s.k * 1.5 + s.sb, line: (s.ab ? s.h + '-' + s.ab : '') + (s.hr ? ', ' + s.hr + ' HR' : '') + (s.rbi ? ', ' + s.rbi + ' RBI' : '') + (s.k && p.pos === 'P' ? s.k + ' K' : '') }); }
    RES.stars = all.sort((a, b) => b.sc - a.sc).slice(0, 3);
    const items = d.cfg.mode === 'tour' ? [{ label: 'CONTINUE', act: () => d.cfg.next && d.cfg.next(m) }] :
      [{ label: 'REMATCH', act: () => game.go('match', BZ.lastExhibition || d.cfg) }, { label: 'CHANGE TEAMS', act: () => game.go('teamSelect') }, { label: 'TITLE', act: () => game.go('title') }];
    RES.menu = new BigMenu(items, { w: 112, h: 20, gap: 4, cols: items.length, onBack: d.cfg.mode === 'tour' ? null : () => game.go('title') });
  },
  update(dt) { commonTick(dt); RES.menu.update(game.input, dt); RES.fbShown = Math.min(RES.fbTarget || 0, RES.fbShown + dt * 900); },
  draw(r) {
    menuBackdrop(r, .65);
    r.overlay(g => {
      const W = r.W, H = r.H, m = RES.m, hs = humanSide();
      title(g, 'FINAL', W / 2, 10, 3);
      text(g, m.teams[0].def.name + '  ' + m.teams[0].runs + '   -   ' + m.teams[1].runs + '  ' + m.teams[1].def.name, W / 2, 40, '#ffffff', { align: 'center', scale: 2 });
      if (hs >= 0) E.font.title(g, m.winner === hs ? 'YOU WIN!' : 'TOUGH LOSS', W / 2, 60, { scale: 2, colors: m.winner === hs ? GREEN : RED, align: 'center' });
      text(g, 'R ' + m.teams[0].runs + '  H ' + m.teams[0].hits + '  E ' + m.teams[0].errors + '      R ' + m.teams[1].runs + '  H ' + m.teams[1].hits + '  E ' + m.teams[1].errors, W / 2, 82, '#c8c8d8', { align: 'center' });
      RES.stars.forEach((s, i) => { const x = W / 2 - 165 + i * 112, y = 96; panel(g, x, y, 106, 52, { border: '#ffe680' }); text(g, '★'.repeat(3 - i), x + 53, y + 4, '#ffe680', { align: 'center' }); const rig = s.p.rigs && (s.p.rigs.bat || s.p.rigs.field); if (rig) try { rig.drawPortrait(g, x + 4, y + 14, 34, { bg: TEAMS[s.p.team].chip }); } catch (e) { /* none */ } text(g, s.p.name.replace(/"[^"]*" /, '').slice(0, 14), x + 42, y + 18, '#ffffff'); text(g, s.line.slice(0, 16), x + 42, y + 30, '#c8c8d8'); });
      if (RES.cfg.mode === 'tour' && RES.fbTarget) text(g, '+' + fmt(RES.fbShown) + ' FAN BUCKS', W / 2, 156, '#ffe680', { align: 'center', scale: 2 });
      RES.menu.draw(g, W / 2, H - 52);
      legend(g, W, H, [['confirm', 'SELECT']]);
    });
  }
};
const humanSide = () => M ? M.teams.findIndex(t => t.ctrl.cap) : -1;

/* ---- the Playbook: one page per context, the buttons in the player's own glyphs ---- */
const PLAYBOOK = { open: false, page: 0 };
const PB_PAGES = [
  ['BATTING', [['up', 'Aim the sweet spot (stick, WASD or the mouse)'], ['south', 'Contact swing: big sweet spot'], ['west', 'Power swing: small spot, big hits'], ['north', 'Bunt: hold to square around'], ['r1', 'Arm the BATZOOKA (meter full)'], ['l1', 'Hold + a base button: steal']]],
  ['PITCHING', [['l1', '+ a base button: pickoff throw'], ['south', 'Heater (keyboard: 1)'], ['east', 'Breaking ball (2)'], ['west', 'Off-speed (3)'], ['north', 'Signature pitch (4)'], ['r1', 'Team super pitch (5), meter full'], ['up', 'Aim during the windup; press again on the ring; steer early in flight']]],
  ['FIELDING', [['up', 'Run (the chaser runs by itself on Assisted)'], ['east', 'Throw to 1st (keyboard 1, or click the base)'], ['north', 'Throw to 2nd (2)'], ['west', 'Throw to 3rd (3)'], ['south', 'Throw home (4)'], ['r2', 'Dive'], ['r1', 'Jump; climb the wall near the fence'], ['l1', 'Switch fielder']]],
  ['RUNNING', [['r1', 'Before the pitch: take an extra lead'], ['r1', 'All runners go'], ['l1', 'All runners back'], ['l2', 'Turbo'], ['r1', '+ L2 with half a meter: Afterburners'], ['east', 'With R1 or L1: only the runner to that base']]],
  ['SUPERS', [['r1', 'BATZOOKA: the crowd fills the meter; arm it, then swing'], ['r1', 'Super pitch: every team has one'], ['r1', '+ a base: LASER ARM throw (half a meter)'], ['l2', 'Turbo for runners and fielders']]],
  ['RHUBARB', [['south', 'Punch combo'], ['west', 'Shove'], ['north', 'Grab and toss'], ['east', 'Dodge'], ['up', 'Move. Most knockdowns in 12 seconds wins +50 meter']]],
  ['HOUSE RULES', [[null, 'What you CAN\'T do in Batzooka Baseball:'], [null, 'No balks, no infield fly rule, no appeals'], [null, 'No check swings: every swing is committed'], [null, 'No dropped third strikes, no intentional walks'], [null, 'No substitutions but a pitching change (pause menu)'], [null, 'No arguing with the umpire. Believe us, we tried.']]]
];
function playbookUpdate(dt) {
  const I = game.input;
  if (I.pressed('right') || I.pressed('r1')) { PLAYBOOK.page = (PLAYBOOK.page + 1) % PB_PAGES.length; sfx('menu'); }
  if (I.pressed('left') || I.pressed('l1')) { PLAYBOOK.page = (PLAYBOOK.page + PB_PAGES.length - 1) % PB_PAGES.length; sfx('menu'); }
  const c = I.clicked && I.clicked(); if (c) { PLAYBOOK.page = (PLAYBOOK.page + (c[0] > game.W / 2 ? 1 : -1) + PB_PAGES.length) % PB_PAGES.length; }
  if (I.pressed('cancel') || I.pressed('confirm')) { I.consumeAll(); PLAYBOOK.open = false; sfx('back'); }
}
function playbookDraw(r) {
  r.overlay(g => {
    const W = r.W, H = r.H, [name, rows] = PB_PAGES[PLAYBOOK.page], I = game.input;
    px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
    title(g, 'PLAYBOOK', W / 2, 10, 2); text(g, '← ' + name + ' →   ' + (PLAYBOOK.page + 1) + '/' + PB_PAGES.length, W / 2, 30, '#ffe680', { align: 'center', scale: 2 });
    panel(g, W / 2 - 170, 50, 340, rows.length * 18 + 12);
    rows.forEach(([a, t], i) => { const y = 58 + i * 18; let x = W / 2 - 160; if (a) x += glyph(g, I, a, x, y, 11) + 6; text(g, t, x, y + 2, '#ffffff'); });
    legend(g, W, H, [[null, '←→ PAGE'], ['cancel', 'CLOSE']]);
  });
}

/* ---- the pause menu's own items (hidden in AI Hub sessions) ---- */
BZ.pauseItems = () => {
  const hub = hubActive() && BZ.hub && BZ.hub.phase !== 'off';
  const inMatch = game.sceneName === 'match' && M;
  const defHuman = inMatch && M.teams[1 - M.half].ctrl.cap && M.teams[1 - M.half].bullpen.length;
  return [
    !hub && ['Playbook', () => { game.resume(); PLAYBOOK.open = true; PLAYBOOK.page = 0; }],
    !hub && defHuman && ['Pitching Change', () => { game.resume(); pitchingChange(1 - M.half); }],
    !hub && inMatch && ['Restart', () => { game.resume(); game.go('match', BZ.matchCfg); }],
    !hub && ['Dev Mode', () => { game.resume(); devOpen(); }],
    !hub && game.sceneName !== 'title' && ['Quit to title', () => { game.resume(); game.go('title'); }]
  ].filter(Boolean);
};

/* ===== 35-attract.js ===== */
/* ATTRACT MODE: after 10 s with no input on the title or a top menu, a looping highlight reel played by the real game:
 * CPU against CPU with cheats on (forced pitches and contact, full meters), one caption card per segment. Any input
 * returns to the title. Each segment has a time limit and moves on by itself. Never in an AI Hub session. */
const ATT_SEGS = [
  { cap: 'PLAY BALL!', park: 'kernel', away: 'HCK', home: 'COM', len: 16, setup: m => { m.force = { contact: null }; m.attractForce = [{ at: 2, contact: 'perfect' }]; } },
  { cap: 'SUPER PITCHES', park: 'caldera', away: 'COM', home: 'MCE', len: 14, setup: m => { m.teams[1].meter = 100; m.strikes = 2; m.cheats.cpuNoSwing = true; m.hz && (m.hz.vent = 6); } },
  { cap: 'LEATHER AND LASERS', park: 'barnacle', away: 'COM', home: 'HCK', len: 16, setup: m => { m.teams[1].meter = 100; m.attractForce = [{ at: 0, contact: 'perfect' }]; } },
  { cap: 'WHEELS', park: 'kernel', away: 'COM', home: 'HCK', len: 14, setup: m => { m.attractRunner = 1; m.attractSteal = true; m.cheats.cpuNoSwing = true; } },
  { cap: 'BATZOOKA!', park: 'megadome', away: 'COM', home: 'MMX', len: 18, setup: m => { m.teams[0].meter = 100; m.cheats.infMeter = true; m.attractForce = [{ at: 0, homer: true }]; m.attractArm = true; } },
  { cap: 'RHUBARB!', park: 'caldera', away: 'COM', home: 'MCE', len: 16, setup: m => { m.attractRhubarb = true; } },
  { cap: 'SIX WILD PARKS', park: 'tranquility', away: 'COM', home: 'MBM', len: 14, setup: m => { m.attractForce = [{ at: 0, homer: true }]; } },
  { cap: 'SIX WILD PARKS', park: 'boneyard', away: 'COM', home: 'HMH', len: 14, setup: m => { m.teams[1].meter = 100; m.strikes = 2; m.cheats.cpuNoSwing = true; } },
  { cap: '1-4 PLAYERS · PLAY ONLINE IN AI HUB', park: 'megadome', derby: true, len: 16 },
  { cap: 'MOONSHOT LEADERS', table: true, len: 8 }
];
const ATT = { seg: 0, t: 0, card: 0 };
BZ.attract = ATT;
SCENES.attract = {
  input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter() { ATT.seg = -1; IDLE.t = 0; IDLE.px = null; BZ.mute = false; nextSeg(); },
  exit() { game.timeScale = 1; game.weather = null; RADIO.who = null; },
  update(dt) {
    commonTick(dt); radioTick(dt);
    if (ATT.t > .4 && anyInput()) { for (const I of game.players) I.consumeAll(); IDLE.t = 0; return game.go('title'); }
    ATT.t += dt / Math.max(.05, game.timeScale); ATT.card = Math.max(0, ATT.card - dt);
    const S = ATT_SEGS[ATT.seg];
    if (!S.table && M) {
      // the director's forces: at the n-th pitch, perfect contact or a home run; arm the Batzooka; steals; a rhubarb
      if (M.attractForce && M.phase === 'select') { const f = M.attractForce.find(f => f.at <= M.pitchCount && !f.used); if (f) { f.used = true; M.force = Object.assign(M.force || {}, f.contact ? { contact: f.contact } : {}, f.homer ? { homer: true, contact: 'perfect' } : {}); } }
      if (M.attractArm && M.phase === 'select') M.armed = true;
      if (M.attractRunner && M.phase === 'walkUp' && !M.runners.length) { addRunner(offense().lineup[0], M.attractRunner); }
      if (M.attractSteal && M.phase === 'select') { const r = runnerOn(1); if (r && !runnerOn(2)) r.steal = true; }
      if (M.attractRhubarb && M.phase === 'select' && !M.rhubarb) { M.attractRhubarb = false; startRhubarb(() => { walk(true); return 'walk'; }, batterNow()); }
      matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt);
      if (S.derby) ghostsStep(dt);
    }
    if (ATT.t > S.len || (M && M.phase === 'final')) nextSeg();
  },
  draw(r) {
    const S = ATT_SEGS[ATT.seg];
    if (S.table || !M) menuBackdrop(r, .6); else { drawMatchWorld(r); drawHUD(r); if (S.derby) ghostsDraw(r);  }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (S.table) { title(g, 'MOONSHOT LEADERS', W / 2, 20, 3); drawLeaders(g, W / 2, 60); E.font.title(g, 'BATZOOKA BASEBALL', W / 2, H - 70, { scale: 2, colors: GOLD, align: 'center' }); }
      E.ui.box(g, W - SAFE - 84 - cornerW(), H - SAFE - 38, 84, 16, { bg: ['#e8443a', '#a82a20'], border: '#ffffff' }); text(g, 'DEMO PLAY', W - SAFE - 42 - cornerW(), H - SAFE - 34, '#ffffff', { align: 'center' });
      if (ATT.card > 0 || S.table) E.font.title(g, S.cap, W / 2, H * .3, { scale: S.cap.length > 20 ? 2 : 3, colors: GOLD, align: 'center', depth: 2 });
      if (Math.floor(game.real * 2) % 2) { const touch = BZ.touchOnly, I = game.input; if (touch) text(g, 'TOUCH TO RETURN', W / 2, H - 30, '#ffffff', { align: 'center', scale: 2 }); else { const w = E.font.width('PRESS ANY BUTTON', { scale: 2 }); glyph(g, I, I.lastDevice === 'keyboard' ? 'start' : 'south', W / 2 - w / 2 - 16, H - 32, 11); text(g, 'PRESS ANY BUTTON', W / 2 + 0, H - 30, '#ffffff', { align: 'center', scale: 2 }); } }
    });
  }
};
function nextSeg() {
  ATT.seg = (ATT.seg + 1) % ATT_SEGS.length; ATT.t = 0; ATT.card = 2.2; const S = ATT_SEGS[ATT.seg];
  game.timeScale = 1;
  if (S.table) { M = BZ.M = null; MENUBG.park = 'kernel'; music('title'); return; }
  if (S.derby) { newDerby({ park: 'megadome', input: null, batter: TEAMS.COM.roster[0], time: 999, outs: 99, noClock: true, deal: E.rng(77 + ATT.seg) }); M.cheats.perfectContact = true; M.cheats.perfectAll = true; M.attractForce = [0, 1, 2, 3, 4, 5].map(i => ({ at: i, homer: i % 2 === 0, contact: 'perfect' })); ghostsFake(); }
  else {
    newMatch({ mode: 'attract', away: S.away, home: S.home, park: S.park, innings: 3, difficulty: 'allstar', ctrl: [[null, null], [null, null]], cheats: { noErrors: false }, shows: false, seed: 900 + ATT.seg });
    M.phase = 'halfStart'; M.phaseT = 0; halfStartSetup(); setPhase('walkUp'); M.cam = 'plate';
    if (S.setup) S.setup(M);
  }
  music(M.park.song); game.setView('broadcast'); game.weather = M.park.weather; CAMS.z = 1;
}

/* ===== 36-dev.js ===== */
/* DEV MODE (from the pause menu): a 10-foot panel over the frozen game with six tabs. TUNE: every balance number as a
 * live slider, by group, with reset per value, per group and for all, and pins (up to 3 shown while playing; [ and ]
 * adjust, \ picks the next). SITUATION: inning, outs, count, score, runners, meters, park. CHEATS. TRIGGERS. WARP. INFO.
 * L1/R1 or Q/E change tabs; up/down move; left/right change (hold to speed up); confirm toggles or runs; north (I)
 * resets a value or pins it; cancel closes. The mouse hovers, clicks and drags. */
const DEV = { open: false, tab: 0, i: 0, scroll: 0, pins: [], pinI: 0, hold: 0, rows: [], drag: null, sit: null, msg: '', msgT: 0 };
BZ.dev = DEV;
const DEV_TABS = ['TUNE', 'SITUATION', 'CHEATS', 'TRIGGERS', 'WARP', 'INFO'];
function devOpen() { DEV.open = true; DEV.i = 0; DEV.scroll = 0; DEV.sit = M ? { inning: M.inning, half: M.half, outs: M.outs, balls: M.balls, strikes: M.strikes, a: M.teams[0].runs, h: M.teams[1].runs, r1: !!runnerOn(1), r2: !!runnerOn(2), r3: !!runnerOn(3), m0: Math.round(M.teams[0].meter), m1: Math.round(M.teams[1].meter), park: M.parkId } : null; emit('devOpen', {}); }
function keepTune() { if (game.settings.keepTune) try { E.store.set('bz:tune', TUNE); } catch (e) { /* storage blocked */ } }
function devRows() {
  const tab = DEV_TABS[DEV.tab], R_ = [];
  if (tab === 'TUNE') {
    R_.push({ label: 'RESET ALL TO DEFAULTS', act: () => { BZ.resetTune(); keepTune(); devMsg('Every value back to its default'); } });
    let grp = null;
    for (const m of TUNE_META) {
      if (m.group !== grp) { grp = m.group; const gname = grp; R_.push({ label: '— ' + grp.toUpperCase() + ' —  (confirm: reset group)', act: () => { BZ.resetTune(gname); keepTune(); devMsg(gname + ' reset'); } }); }
      R_.push({ label: m.label, meta: m, value: () => TUNE[m.key], adjust: d => { TUNE[m.key] = +clamp(TUNE[m.key] + d * m.step, m.min, m.max).toFixed(3); if (m.key === 'gameSpeed') game.timeScale = TUNE.gameSpeed; keepTune(); },
        reset: () => { TUNE[m.key] = m.def; keepTune(); }, pin: () => { const k = DEV.pins.indexOf(m.key); if (k >= 0) DEV.pins.splice(k, 1); else { DEV.pins.push(m.key); if (DEV.pins.length > 3) DEV.pins.shift(); } }, pinned: () => DEV.pins.includes(m.key) });
    }
  } else if (tab === 'SITUATION') {
    const S = DEV.sit; if (!S) { R_.push({ label: 'No match running: warp to one first' }); return R_; }
    const num = (k, label, lo, hi) => R_.push({ label, value: () => S[k], adjust: d => { S[k] = clamp(S[k] + d, lo, hi); } });
    const tog = (k, label) => R_.push({ label, value: () => S[k] ? 'YES' : 'NO', adjust: () => { S[k] = !S[k]; }, act: () => { S[k] = !S[k]; } });
    num('inning', 'Inning', 1, 9); R_.push({ label: 'Half', value: () => S.half ? 'BOTTOM' : 'TOP', adjust: () => { S.half = 1 - S.half; } });
    num('outs', 'Outs', 0, 2); num('balls', 'Balls', 0, 3); num('strikes', 'Strikes', 0, 2); num('a', 'Away runs', 0, 30); num('h', 'Home runs', 0, 30);
    tog('r1', 'Runner on 1st'); tog('r2', 'Runner on 2nd'); tog('r3', 'Runner on 3rd'); num('m0', 'Away meter', 0, 100); num('m1', 'Home meter', 0, 100);
    R_.push({ label: 'Park', value: () => PARKS[S.park].name, adjust: d => { S.park = cycle(PARK_ORDER, S.park, d); } });
    R_.push({ label: 'APPLY', act: () => applySituation() });
  } else if (tab === 'CHEATS') {
    const c = k => M ? !!M.cheats[k] : false, t = (k, label) => R_.push({ label, value: () => c(k) ? 'ON' : 'OFF', act: () => { if (M) M.cheats[k] = !M.cheats[k]; }, adjust: () => { if (M) M.cheats[k] = !M.cheats[k]; } });
    t('perfectContact', 'Perfect contact always (humans)'); t('allStrikes', 'Every pitch a strike'); t('infMeter', 'Infinite meter'); t('infTurbo', 'Infinite turbo');
    t('noclip', 'Fielders ignore walls (no clip)'); t('autoplay', 'The CPU plays my side'); t('noErrors', 'No errors'); t('showZone', 'Show the zone always'); t('showAI', 'Show pitch path, timing bar, reticle');
    R_.push({ label: 'Slow motion x0.25', value: () => TUNE.gameSpeed === .25 ? 'ON' : 'OFF', act: () => { TUNE.gameSpeed = TUNE.gameSpeed === .25 ? 1 : .25; game.timeScale = TUNE.gameSpeed; } });
    R_.push({ label: 'Unlock everything (save)', act: () => { SAVE.unlocked = true; autosave(); devMsg('Every team and park unlocked'); } });
    R_.push({ label: '+5,000 Fan Bucks', act: () => { SAVE.fb += 5000; autosave(); devMsg('Fan Bucks: ' + fmt(SAVE.fb)); } });
    R_.push({ label: 'Reset the save', act: () => { SAVE = SAVE_DEF(); autosave(); devMsg('Save reset'); } });
  } else if (tab === 'TRIGGERS') {
    const need = f => () => { if (!M) return devMsg('No match running'); f(); DEV.open = false; };
    const pitches = Object.keys(PITCHES);
    DEV.fp = DEV.fp || 'heater';
    R_.push({ label: 'Force next pitch', value: () => PITCHES[DEV.fp].name, adjust: d => { DEV.fp = cycle(pitches, DEV.fp, d); }, act: need(() => { M.force = Object.assign(M.force || {}, { nextPitch: { type: DEV.fp, x: 0, z: 17, q: 1 } }); }) });
    R_.push({ label: 'Force a home run on the next contact', act: need(() => { M.force = Object.assign(M.force || {}, { homer: true, contact: 'perfect' }); }) });
    R_.push({ label: 'Hazard now', act: need(() => { const h = M.hz; if (!h) return; if (h.id === 'vents') h.vent = 3; else if (h.id === 'lowgrav') h.meteor = 2.5; else emit('hazard', { kind: { gulls: 'gull', fog: 'fog', drones: 'drone', silo: 'gull' }[h.id] || 'gull' }); }) });
    R_.push({ label: 'Rhubarb now', act: need(() => { if (['select', 'walkUp'].includes(M.phase)) startRhubarb(() => { walk(true); return 'walk'; }, batterNow()); else M.pendingRhubarb = true; }) });
    R_.push({ label: 'Fill both meters (Batzooka ready)', act: need(() => { M.teams[0].meter = M.teams[1].meter = 100; emit('meterFull', { team: M.half }); }) });
    R_.push({ label: 'End the half-inning', act: need(() => { M.outs = 3; if (['select', 'walkUp', 'afterPitch'].includes(M.phase)) toHalfEnd(); }) });
    R_.push({ label: 'Walk-off now', act: need(() => { M.half = 1; M.inning = Math.max(M.inning, M.innings); M.teams[1].runs = M.teams[0].runs + 1; M.walkoff = true; checkWalkoff(); toFinal(); }) });
    R_.push({ label: 'Win the game', act: need(() => { const s = Math.max(0, humanSide()); M.teams[s].runs = M.teams[1 - s].runs + 3; M.winner = s; M.over = true; toFinal(); }) });
    R_.push({ label: 'Lose the game', act: need(() => { const s = Math.max(0, humanSide()); M.teams[1 - s].runs = M.teams[s].runs + 3; M.winner = 1 - s; M.over = true; toFinal(); }) });
  } else if (tab === 'WARP') {
    const w = (label, f) => R_.push({ label, act: () => { DEV.open = false; game.resume(); f(); } });
    w('Title', () => game.go('title')); w('Attract mode', () => game.go('attract')); w('Animation gallery', () => game.go('gallery')); w('AI Hub card (mocked)', () => game.go('hubDerby', { mock: true })); w('Credits', () => game.go('credits'));
    DEV.ws = DEV.ws || 0; R_.push({ label: 'Tour stop', value: () => (DEV.ws + 1) + ': ' + PARKS[STOPS[DEV.ws].park].name, adjust: d => { DEV.ws = (DEV.ws + d + 5) % 5; }, act: () => { DEV.open = false; SAVE.tour.started = true; SAVE.tour.stop = Math.max(SAVE.tour.stop, DEV.ws); playStop(DEV.ws); } });
    DEV.wl = DEV.wl || 0; R_.push({ label: 'Lesson', value: () => LESSONS[DEV.wl].name, adjust: d => { DEV.wl = (DEV.wl + d + LESSONS.length) % LESSONS.length; }, act: () => { DEV.open = false; const L = LESSONS[DEV.wl]; game.go('match', Object.assign(L.cfg(), { mode: 'training', innings: 99, lesson: L })); } });
    DEV.wp = DEV.wp || 'kernel'; R_.push({ label: 'Exhibition at', value: () => PARKS[DEV.wp].name, adjust: d => { DEV.wp = cycle(PARK_ORDER, DEV.wp, d); }, act: () => { DEV.open = false; game.go('match', { mode: 'exhibition', away: 'COM', home: PARKS[DEV.wp].team, park: DEV.wp, innings: 3, ctrl: [[game.input, null], [null, null]] }); } });
    w('Derby', () => { DB.turn = 0; DB.scores = []; DB.n = 1; game.go('derby'); });
  } else {
    R_.push({ label: 'Frame step (one 1/120 s step)', act: () => { if (M) { matchUpdate(1 / 120); animateRigs(1 / 120); } } });
    R_.push({ label: 'Copy snapshot (JSON to the clipboard)', act: () => { const s = JSON.stringify(game.debug.snapshot()); try { navigator.clipboard.writeText(s); devMsg('Snapshot copied'); } catch (e) { devMsg('Clipboard blocked'); } } });
  }
  return R_;
}
function devMsg(s) { DEV.msg = s; DEV.msgT = 2; }
function applySituation() {
  const S = DEV.sit; if (!M || !S) return;
  Object.assign(M, { inning: S.inning, half: S.half, outs: S.outs, balls: S.balls, strikes: S.strikes }); M.teams[0].runs = S.a; M.teams[1].runs = S.h; M.teams[0].meter = S.m0; M.teams[1].meter = S.m1;
  if (S.park !== M.parkId) { M.park = PARKS[S.park]; M.parkId = S.park; M.hz = null; music(M.park.song); game.weather = M.park.weather; }
  M.runners = []; const o = offense(); [S.r1, S.r2, S.r3].forEach((on, i) => { if (on) addRunner(o.lineup[(o.order + 8 - i) % 9], i + 1); });
  M.ball = null; M.play = null; setFielders(); M.cam = 'plate'; setPhase('walkUp'); DEV.open = false; devMsg('Situation applied');
}
function devUpdate(dt) {
  const I = game.input; DEV.msgT = Math.max(0, DEV.msgT - dt);
  if (I.pressed('r1')) { DEV.tab = (DEV.tab + 1) % DEV_TABS.length; DEV.i = 0; DEV.scroll = 0; sfx('menu'); }
  if (I.pressed('l1')) { DEV.tab = (DEV.tab + DEV_TABS.length - 1) % DEV_TABS.length; DEV.i = 0; DEV.scroll = 0; sfx('menu'); }
  const rows = DEV.rows = devRows();
  if (I.repeat('down', .25, .06)) DEV.i = Math.min(rows.length - 1, DEV.i + 1);
  if (I.repeat('up', .25, .06)) DEV.i = Math.max(0, DEV.i - 1);
  const row = rows[DEV.i];
  if (row && row.adjust) { const l = I.down('left'), r = I.down('right'); if (l || r) { DEV.hold += dt; const fast = DEV.hold > .6 ? 4 : 1; if (I.pressed('left') || I.pressed('right') || (DEV.hold > .3 && Math.floor(DEV.hold * 12) !== Math.floor((DEV.hold - dt) * 12))) row.adjust((r ? 1 : -1) * fast); } else DEV.hold = 0; }
  if (I.pressed('south') || I.pressed('confirm')) { I.consumeAll(); if (row && row.act) row.act(); }
  if (I.pressed('north') && row) { if (row.reset && !I.down('l2')) row.reset(); if (row.pin && I.down('l2')) row.pin(); }
  if (I.pressed('r2') && row && row.pin) row.pin();
  if (I.pressed('cancel')) { I.consumeAll(); DEV.open = false; sfx('back'); }
  // the mouse
  const pt = I.pointer && I.pointer(), cl = I.clicked && I.clicked();
  if (pt && DEV.rects) {
    for (const rc of DEV.rects) if (pt[0] >= rc.x && pt[0] < rc.x + rc.w && pt[1] >= rc.y && pt[1] < rc.y + rc.h) { if (I.lastDevice === 'mouse') DEV.i = rc.k; if (cl) { const rw = rows[rc.k]; if (rw && rw.meta && pt[0] > rc.sx) { const m = rw.meta, u = clamp((pt[0] - rc.sx) / rc.sw, 0, 1); TUNE[m.key] = +(Math.round((m.min + u * (m.max - m.min)) / m.step) * m.step).toFixed(3); keepTune(); } else if (rw && rw.act) rw.act(); } }
    for (const tb of DEV.tabRects || []) if (cl && cl[0] >= tb.x && cl[0] < tb.x + tb.w && cl[1] >= tb.y && cl[1] < tb.y + tb.h) { DEV.tab = tb.k; DEV.i = 0; DEV.scroll = 0; }
  }
}
function devDraw(r) {
  if (!DEV.open) return;
  r.overlay(g => {
    const W = r.W, H = r.H, x = 16, y = 12, w = W - 32, h = H - 24;
    px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
    panel(g, x, y, w, h, { border: '#4fe0b0' });
    DEV.tabRects = [];
    const tw = Math.floor((w - 12) / DEV_TABS.length);
    DEV_TABS.forEach((t, k) => { const bx = x + 6 + k * tw; E.ui.box(g, bx, y + 5, tw - 3, 16, { bg: k === DEV.tab ? ['#2a6a4a', '#1a4a32'] : ['#20222e', '#14151f'], border: k === DEV.tab ? '#4fe0b0' : '#4a4c60' }); text(g, t, bx + tw / 2, y + 9, '#ffffff', { align: 'center' }); DEV.tabRects.push({ x: bx, y: y + 5, w: tw - 3, h: 16, k }); });
    const rows = DEV.rows.length ? DEV.rows : devRows(), rh = 13, top = y + 28, vis = Math.floor((h - 60) / rh);
    if (DEV.i < DEV.scroll) DEV.scroll = DEV.i; if (DEV.i >= DEV.scroll + vis) DEV.scroll = DEV.i - vis + 1;
    DEV.rects = [];
    for (let k = DEV.scroll; k < Math.min(rows.length, DEV.scroll + vis); k++) {
      const rw = rows[k], yy = top + (k - DEV.scroll) * rh, foc = k === DEV.i;
      if (foc) px.rect(g, x + 4, yy - 2, w - 8, rh, '#2a3a4a');
      text(g, (rw.pinned && rw.pinned() ? '● ' : '') + rw.label, x + 10, yy, foc ? '#ffe680' : '#e8e8f0');
      const sx = x + w * .55, sw = w * .3;
      if (rw.meta) { const m = rw.meta, u = (TUNE[m.key] - m.min) / (m.max - m.min); px.rect(g, sx, yy + 2, sw, 4, '#3a3c4a'); px.rect(g, sx, yy + 2, sw * u, 4, TUNE[m.key] === m.def ? '#4fe0b0' : '#ffb347'); px.rect(g, sx + sw * (m.def - m.min) / (m.max - m.min), yy, 1, 8, '#ffffff'); text(g, String(+TUNE[m.key].toFixed(3)), x + w - 12, yy, '#ffffff', { align: 'right' }); }
      else if (rw.value) text(g, String(rw.value()), x + w - 12, yy, '#a8ffd0', { align: 'right' });
      DEV.rects.push({ x: x + 4, y: yy - 2, w: w - 8, h: rh, k, sx, sw });
    }
    if (DEV_TABS[DEV.tab] === 'INFO') devInfo(g, x + 10, top + 30, w - 20);
    if (DEV.msgT > 0) text(g, DEV.msg, W / 2, y + h - 30, '#ffe680', { align: 'center' });
    promptRow(g, game.input, [['l1', 'TAB'], ['r1', 'TAB'], [null, '←→ CHANGE'], ['confirm', 'DO'], ['north', 'RESET'], ['r2', 'PIN'], ['cancel', 'CLOSE']], W / 2, y + h - 16, 'center');
  });
}
function devInfo(g, x, y, w) {
  const s = game.debug.snapshot(), lc = M && M.lastContact, lines = [
    'FPS ' + game.fps + '   SCENE ' + s.scene + '   PHASE ' + (s.phase || '-') + '   CAM ' + (s.cam || '-'),
    'BALL ' + (s.ball ? s.ball.x + ', ' + s.ball.y + ', ' + s.ball.z + ' ' + s.ball.mode : '-'),
    'LAST CONTACT ' + (lc ? 'timing ' + lc.timingMs + ' ms, offset ' + lc.dx + '/' + lc.dz + ', Q ' + lc.Q + ', EV ' + lc.EV + ', launch ' + lc.launch + ', spray ' + lc.spray : '-'),
    'SEED ' + (M ? M.seed : '-') + '   DEVICE ' + game.input.lastDevice + '   GLYPHS ' + game.input.glyphs,
    'EVENTS ' + BZ.bus.log.slice(-8).map(e => e.ev).join(' '),
    'ENGINE ' + (E.versionLabel ? E.versionLabel() : E.version) + '   GAME ' + BZ.version
  ];
  lines.forEach((l, i) => para(g, l, x, y + i * 12, w, '#c8e8d8'));
}
/* ---- pinned sliders: a thin strip while playing; [ and ] (or Create + the D-pad) adjust, \ picks the next ---- */
function pinTick() {
  if (!DEV.pins.length) return; const I = game.input, m = TUNE_META.find(t => t.key === DEV.pins[DEV.pinI % DEV.pins.length]); if (!m) return;
  const create = I.down('create');
  if (I.pressed('pinNext') || (create && I.pressed('down'))) DEV.pinI = (DEV.pinI + 1) % DEV.pins.length;
  const d = (I.pressed('pinUp') || (create && I.pressed('right')) ? 1 : 0) - (I.pressed('pinDown') || (create && I.pressed('left')) ? 1 : 0);
  if (d) { TUNE[m.key] = +clamp(TUNE[m.key] + d * m.step, m.min, m.max).toFixed(3); keepTune(); }
}
function pinDraw(r) {
  if (!DEV.pins.length || DEV.open) return;
  r.overlay(g => { const s = DEV.pins.map((k, i) => { const m = TUNE_META.find(t => t.key === k); return (i === DEV.pinI % DEV.pins.length ? '▸' : '') + m.label + ' ' + (+TUNE[k].toFixed(2)); }).join('   '); px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, 10, '#000000')); text(g, s, r.W / 2, 1, '#4fe0b0', { align: 'center' }); });
}

/* ===== 37-about.js ===== */
/* ABOUT / CREDITS: pages turned by L1/R1, left/right or clicks: About, Source Information, Testing Feedback, Engine
 * Feedback, Prompt Feedback, Credits. The text lives in ABOUT_DATA (95-about-data.js), the same words as the build's
 * final report and exit-interview.json. */
const AB = { page: 0, scroll: 0 };
SCENES.about = {
  input: KEYS, camera: { zoom: false },
  enter() { AB.page = 0; AB.scroll = 0; IDLE.t = 0; music('menu'); MENUBG.park = 'kernel'; },
  update(dt) {
    commonTick(dt); if (idleTick(dt)) return game.go('attract');
    const I = game.input, n = aboutPages().length;
    if (I.pressed('right') || I.pressed('r1')) { AB.page = (AB.page + 1) % n; AB.scroll = 0; sfx('menu'); }
    if (I.pressed('left') || I.pressed('l1')) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; sfx('menu'); }
    if (I.repeat('down', .25, .08)) AB.scroll++; if (I.repeat('up', .25, .08)) AB.scroll = Math.max(0, AB.scroll - 1);
    const c = I.clicked && I.clicked(); if (c) { AB.page = (AB.page + (c[0] > game.W / 2 ? 1 : n - 1)) % n; AB.scroll = 0; }
    if (I.pressed('cancel')) { I.consumeAll(); game.go('title'); }
    if (I.pressed('confirm') && AB.page === n - 1) { I.consumeAll(); game.go('credits'); }
  },
  draw(r) {
    menuBackdrop(r, .72);
    r.overlay(g => {
      const W = r.W, H = r.H, pages = aboutPages(), [name, lines] = pages[AB.page];
      title(g, name, W / 2, 8, 2);
      text(g, '← ' + (AB.page + 1) + ' / ' + pages.length + ' →', W / 2, 28, '#a8a8c8', { align: 'center' });
      const x = 24, w = W - 48, y0 = 42, maxY = H - 34;
      panel(g, x - 8, y0 - 6, w + 16, maxY - y0 + 8);
      let y = y0, skip = AB.scroll;
      for (const L of lines) {
        const [head, body] = Array.isArray(L) ? L : [null, L];
        const wrapped = wrapText((head ? head + ': ' : '') + body, w);
        for (let i = 0; i < wrapped.length; i++) { if (skip > 0) { skip--; continue; } if (y > maxY - 10) break; text(g, wrapped[i], x, y, i === 0 && head ? '#ffe680' : '#e8e8f0'); y += 10; }
        y += 3;
      }
      if (y > maxY - 10) text(g, '↓ more', W - 30, maxY - 10, '#ffe680');
      legend(g, W, H, [[null, '←→ PAGE'], [null, '↑↓ SCROLL'], AB.page === pages.length - 1 ? ['confirm', 'ROLL CREDITS'] : null, ['cancel', 'BACK']]);
    });
  }
};
function aboutPages() {
  const D = ABOUT_DATA, si = D.sourceInformation;
  return [
    ['ABOUT', [['BATZOOKA BASEBALL', 'An original over-the-top arcade baseball game.'], ['Version', 'Game ' + BZ.version + ' · engine ' + (E.versionLabel ? E.versionLabel() : E.version)], ['Controls', D.aiHub.controls], ['Story', 'Kernel Field is about to become a parking lot. Win the Kaboom Cup on a barnstorming tour of the wildest parks in baseball, swinging Grandma Delgado\'s rocket-powered bat.']]],
    ['SOURCE INFORMATION', [['Date', si.date], ['Source', si.source], ['Plan', si.plan], ['Genre', si.genre], ['Perspective', si.perspective], ['Tech', si.tech], ['Art Direction', si.artDirection], ['Animation', si.animation], ['Audio', si.audio], ['Online', si.online], ['Testing', si.testing], ['Research', si.research], ['Environment', si.environment], ['Model', si.model], ['Usage', si.usage]]],
    ['TESTING FEEDBACK', D.testingFeedback.map((a, i) => [['Issues caught', 'Critical issues', 'Most helpful test', 'Least helpful test'][i], a])],
    ['ENGINE FEEDBACK', D.engineFeedback.map((a, i) => [['Liked most', 'Stuck or guessed wrong', 'Built myself', 'Hardest part', 'Engine changes', 'One change'][i], a])],
    ['PROMPT FEEDBACK', D.promptFeedback.map((a, i) => [['Liked most', 'Confusing', 'Hardest', 'Would change'][i], a])],
    ['CREDITS', [['Design, code, art, music and writing', 'Claude (claude-opus-5-5, Anthropic), building from PLAN.md'], ['Engine', 'my-3D2dge v0.85.2 (MIT), github.com/michaelcrosato/my-3d2dge'], ['Online', 'AI Hub Session client 1.4.0 (michaelcrosato/ai-hub)'], ['Sound', 'Every sound, song and voice synthesized in code: no audio files'], ['Thanks', 'Thanks for playing!']]]
  ];
}

/* ---- the animation gallery (dev WARP): every baseball motion on rigs, in turn, at normal speed or slowed ---- */
const GAL = { t: 0, slow: false, rigs: null };
SCENES.gallery = {
  input: KEYS, view: 'brawler', camera: { zoom: false },
  enter() { GAL.t = 0; music('training'); const p = TEAMS.COM.roster; GAL.rigs = [['SWING', makeRig(p[0], 'bat')], ['BUNT', makeRig(p[1], 'bat')], ['PITCH', makeRig(p[8], 'field')], ['THROW', makeRig(p[4], 'field')], ['CATCHER', makeRig(p[5], 'catch')], ['DIVE', makeRig(p[2], 'field')], ['SLIDE', makeRig(p[6], 'run')], ['CLIMB', makeRig(p[7], 'field')], ['PUNCH', makeRig(p[3], 'brawl')], ['CHEER', makeRig(TEAMS.HCK.roster[0], 'field')], ['UMPIRE', castRig('ump')]]; },
  update(dt) {
    commonTick(dt); const I = game.input; if (I.pressed('south') || I.pressed('confirm')) GAL.slow = !GAL.slow; if (I.pressed('cancel')) { I.consumeAll(); return game.go('title'); }
    const d = dt * (GAL.slow ? .25 : 1); GAL.t += d; const u = (GAL.t % 1.6) / 1.6;
    const ph = (spec, a, b) => u < a ? { spec, phase: 'wind', u: u / a } : u < b ? { spec, phase: 'active', u: (u - a) / (b - a) } : { spec, phase: 'recover', u: Math.min(1, (u - b) / (1 - b)) };
    GAL.rigs.forEach(([n, rig], i) => {
      const st = { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 };
      if (n === 'SWING') st.attack = ph(SWING_SPEC, .35, .5);
      if (n === 'BUNT') st.attack = { spec: BUNT_SPEC, phase: 'active', u: 1 };
      if (n === 'PITCH') st.attack = ph(PITCH_SPEC, .55, .65);
      if (n === 'THROW') st.attack = ph(THROW_SPEC, .4, .55);
      if (n === 'CATCHER') st.pose = 'crouch';
      if (n === 'DIVE') st.down = u < .3 ? 0 : Math.min(.8, (u - .3) * 3);
      if (n === 'SLIDE') { st.down = u > .2 && u < .7 ? .7 : 0; st.vx = 80; }
      if (n === 'CLIMB') { st.climb = true; st.vz = 40; st.z = 0; }
      if (n === 'PUNCH') st.attack = ph(E.MOVES.cross || E.MOVES.jab, .3, .45);
      if (n === 'CHEER') st.pose = 'cheer';
      if (n === 'UMPIRE') { st.attack = ph(E.MOVES.cross, .3, .4); st.expr = 'shout'; }
      rig.update(d, st);
    });
  },
  draw(r) {
    r.sky(['#1a3060', '#3a6aa0', '#7aa8e0']);
    r.overlay(g => {
      const W = r.W, H = r.H; title(g, 'ANIMATION GALLERY', W / 2, 8, 2);
      GAL.rigs.forEach(([n, rig], i) => { const col = i % 6, row = Math.floor(i / 6), x = 30 + col * ((W - 60) / 5), y = 110 + row * 90; px.rect(g, x - 24, y, 48, 3, '#3a6a3a'); try { rig.draw(g, Math.round(x), y, E.VIEWS.brawler); } catch (e) { /* first frame */ } text(g, n, x, y + 8, '#ffffff', { align: 'center' }); });
      legend(g, W, H, [['south', GAL.slow ? 'NORMAL SPEED' : 'SLOW x0.25'], ['cancel', 'BACK']]);
    });
  }
};

/* ===== 38-bot.js ===== */
/* THE BOT: plays a human's side through the real controls (input.hold / input.tap), for the tests and the scripted
 * playthrough. Batting: steers the reticle to the pitch's crossing and swings on time at strikes. Pitching: picks a
 * pitch and releases on the ring. Fielding and running ride the assists. Rhubarbs: punches, shoves and tosses. */
const BOT = { on: false, held: new Set(), pace: 0 };
function botHold(I, a, on) { if (on && !BOT.held.has(I.player + a)) { I.hold(a); BOT.held.add(I.player + a); } if (!on && BOT.held.has(I.player + a)) { I.hold(a, false); BOT.held.delete(I.player + a); } }
function botStep(dt) {
  for (const I of game.players) botInput(I, dt);
}
function botInput(I, dt) {
  const scene = game.sceneName; BOT.pace += dt;
  const dirs = ['up', 'down', 'left', 'right'], stop = () => dirs.forEach(d => botHold(I, d, false));
  if (!M || !['match', 'derby', 'hubDerby', 'attract'].includes(scene)) { stop(); return; }
  if (M.lesson && M.lesson.introOpen) { I.tap('confirm'); return; }
  const side = M.teams.findIndex(t => t.ctrl.cap === I || t.ctrl.co === I); if (side < 0) { stop(); return; }
  const ph = M.phase;
  if (['pregame', 'halfStart', 'halfEnd'].includes(ph) || (ph === 'homer' && M.phaseT > 2.5)) { if (BOT.pace > .3) { BOT.pace = 0; I.tap('south'); } return; }
  if (ph === 'rhubarb' && M.rhubarb) { const f = M.rhubarb.fighters.find(f => f.human === I); if (f) { const foe = M.rhubarb.fighters.filter(o => o.side !== f.side && o.down <= 0).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0]; if (foe) { botHold(I, 'left', foe.x < f.x - 8); botHold(I, 'right', foe.x > f.x + 8); botHold(I, 'up', foe.y < f.y - 8); botHold(I, 'down', foe.y > f.y + 8); } if (BOT.pace > .18) { BOT.pace = 0; const r = RF(); I.tap(r < .7 ? 'south' : r < .85 ? 'west' : 'north'); } } return; }
  const lid = M.lesson && M.lesson.def.id, goal = id => M.lesson && M.lesson.goals.find(g => g.id === id && g.n < g.need);
  if (side === M.half) {
    // batting: the Batzooka when it's full; steals with a runner on first; turbo on the bases
    if (ph === 'select' && offense().meter >= 100 && !M.armed && I === inputOf(side, 'bat')) I.tap('r1');
    if (ph === 'select' && runnerOn(1) && !runnerOn(2) && (lid === 'wheels' || RF() < .002)) { botHold(I, 'l1', true); I.tap('north'); return; }
    botHold(I, 'l1', false); botHold(I, 'l2', ph === 'inPlay' && I === inputOf(side, 'run'));
    if (ph === 'flight' && lid === 'power' && !goal('powerHit') && goal('bunt')) { botHold(I, 'north', true); return; }
    botHold(I, 'north', false);
    if (ph === 'flight' && M.pitch && I === inputOf(side, 'bat')) {
      const cr = pitchPos(M.pitch, 1), tx = cr.x - HX, tz = cr.z - (lid === 'power' ? .4 : 0), ret = M.reticle;
      botHold(I, 'left', ret.x > tx + 1); botHold(I, 'right', ret.x < tx - 1); botHold(I, 'up', ret.z < tz - .6); botHold(I, 'down', ret.z > tz + .6);
      const delay = SWINGS[M.armed ? 'batzooka' : 'contact'].delay;
      const kind = (lid === 'power' && goal('powerHit')) || (M.derby && !M.armed) ? 'west' : 'south', dl = kind === 'west' && !M.armed ? SWINGS.power.delay : delay;
      if (!M.swing && M.pitch.t >= M.pitch.T - dl - 1 / 240 && (inZone(cr.x, cr.z, batterNow()) || M.strikes === 2 || M.derby) && !(lid === 'zone' && goal('takeBall') && !inZone(cr.x, cr.z, batterNow()))) I.tap(kind);
    } else stop();
  } else {
    stop();
    if (ph === 'select' && I === inputOf(side, 'pitch') && BOT.pace > .4) { BOT.pace = 0; I.tap(defense().meter >= 100 ? 'r1' : ['south', 'east', 'west', 'north'][Math.floor(RF() * 4)]); }
    if (ph === 'windup' && I === inputOf(side, 'pitch') && M.relPress === null && M.phaseT >= M.windT - 1 / 120 * 1.5) I.tap('south');
    // aftertouch early in the flight
    botHold(I, 'right', ph === 'flight' && M.pitch && M.pitch.t / M.pitch.T < .35 && I === inputOf(side, 'pitch'));
    // fielding: throw where the out is
    const h = holderF(); if (ph === 'inPlay' && h && h.human && I === inputOf(side, 'field') && h.hold > .05) { const c = decideThrow(h); if (c && !c.nearBase) I.tap(['east', 'north', 'west', 'south'][c.base - 1]); }
  }
}
BZ.bot = { step: botStep, input: botInput };

/* ===== 40-hub.js ===== */
/* AI HUB (Session Protocol v1, mode ghost, 1-4 players): everyone plays the same Batzooka Derby round on their own device
 * from the same pitch sequence (AIHub.rng('pitches')), and sees the others as ghosts: their home runs fly through the sky
 * as comets in their seat colours and their batters stand as holograms in the on-deck circles. Ghosts never change the
 * local round. The game shows its own card (no Math.random on it), calls ready() with no key press, reports progress
 * every second and one result, answers time-up at once, and after end takes no input, sends nothing and goes quiet. */
const SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const HUB = { phase: 'off', api: null, info: null, card: null, ghosts: {}, sent: 0, lastProg: -1, lastG: 0, reported: false, ended: false, standings: null, score: 0, mock: false, roundMs: 120000 };
BZ.hub = HUB;
function hubApi() { return HUB.api || (typeof AIHub !== 'undefined' ? AIHub : null); }
function hubSend(data, reliable = true) { const A_ = hubApi(); if (!A_ || HUB.ended || !A_.send) return; try { A_.send(data, { reliable }); HUB.sent++; } catch (e) { game.fail('hub send', e); } }
function mockHub() {
  // a stand-in session for the dev warp and the headless tests: two ghost players, a 20 s card, the start, and the end
  const h = { active: true, me: 0, handlers: {}, t0: 0, started: false, answers: [], results: [], progs: [], sent: [], rngs: {},
    on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return () => {}; }, fire(ev, ...a) { for (const f of this.handlers[ev] || []) f(...a); },
    connect() { return Promise.resolve({ me: 0, players: [{ id: 0, name: 'YOU', color: SEAT[0] }, { id: 1, name: 'GHOSTY', color: SEAT[1] }, { id: 2, name: 'COMET KID', color: SEAT[2] }], mode: 'ghost', round: 1, limitMs: 125000, seed: 7 }); },
    ready() { this.readyCalled = true; }, answer(a) { this.answers.push(a); if (a === 'ready') this.fire('card', { left: null, paused: false, starting: true, ready: [0], asking: 0, asked: false }); },
    time() { return this.started ? (game.real - this.t0) * 1000 - 3000 : -Infinity; },
    start() { this.started = true; this.t0 = game.real; this.fire('start', { in: 3000 }); },
    progress(p) { this.progs.push(p); }, result(r) { this.results.push(r); }, send(d) { this.sent.push(d); return true; },
    rng(label) { return this.rngs[label] || (this.rngs[label] = E.rng(label.length * 97 + 7)); }
  };
  return h;
}
function hubConnect(mock) {
  HUB.mock = !!mock; HUB.api = mock ? mockHub() : null; HUB.phase = 'loading'; HUB.ended = false; HUB.reported = false; HUB.ghosts = {}; HUB.sent = 0; HUB.card = null; HUB.standings = null;
  const A_ = hubApi(); if (!A_) { HUB.phase = 'off'; return game.go('title'); }
  A_.on('card', c => { HUB.card = c; }); A_.on('start', () => { HUB.phase = 'countdown'; buildRound(); });
  A_.on('message', (d, from) => ghostMsg(d, from)); A_.on('leave', d => { delete HUB.ghosts[d.id]; });
  A_.on('time-up', () => { if (M && M.derby) derbyDone(); hubReport(); });
  A_.on('end', d => { HUB.ended = true; HUB.phase = 'end'; HUB.standings = d && d.standings; music(null); BZ.mute = true; A.music(null); });
  A_.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
    if (!info) { HUB.phase = 'off'; return game.go('title'); }
    HUB.info = info; for (const p of info.players || []) if (p.id !== info.me) HUB.ghosts[p.id] = { id: p.id, name: p.name, color: p.color || SEAT[p.id % 4], sc: 0, o: 0, s: 0, rx: 0, rz: 17, comets: [], swing: 0 };
    HUB.roundMs = info.limitMs ? Math.min(120000, info.limitMs - 5000) : 120000;
    HUB.phase = 'card'; A_.ready();
    if (HUB.mock) game.after(.1, () => {});
  }).catch(e => { game.fail('hub connect', e); HUB.phase = 'off'; game.go('title'); });
}
function buildRound() {
  const A_ = hubApi(); BZ.rng.deal = A_.rng('pitches'); const pr = A_.rng('park');
  newDerby({ park: 'megadome', input: game.input, batter: TEAMS.COM.roster[0], time: HUB.roundMs / 1000, noClock: true, outs: 10, seed: Math.floor(pr() * 1e9), deal: BZ.rng.deal,
    onHit: h => hubSend({ t: 'hit', n: M.derby.hrs, p: [Math.round(h.x), Math.round(h.y), Math.round(h.z)], v: [Math.round(h.vx), Math.round(h.vy), Math.round(h.vz)], kind: h.bz ? 'bz' : 'hr', dist: h.dist, bz: !!h.bz, out: !!h.out }) });
  M.onEnd = () => { hubReport(); hubSend({ t: 'done', score: Math.round(M.derby.score) }); HUB.phase = 'done'; };
  M.phase = 'halfStart'; M.phaseT = 0; music('derby'); game.setView('broadcast');
}
function hubReport() {
  if (HUB.reported || !M || !M.derby) return; HUB.reported = true; const D = M.derby, A_ = hubApi();
  try { A_.result({ score: Math.round(D.score), stats: { 'Home runs': D.hrs, 'Longest': D.longest + ' ft', 'Outs': D.outs }, awards: D.longest ? [{ title: 'Moonshot', detail: D.longest + ' ft' }] : [] }); } catch (e) { game.fail('hub result', e); }
}
function ghostMsg(d, from) {
  const G = HUB.ghosts[from]; if (!G || !d || typeof d !== 'object') return;
  if (d.t === 'g') { G.s = d.s; G.rx = d.rx; G.rz = d.rz; G.sc = d.sc; G.o = d.o; if (d.s) G.swing = .35; }
  else if (d.t === 'hit' && Array.isArray(d.p) && Array.isArray(d.v) && !d.out) G.comets.push({ x: d.p[0], y: d.p[1], z: d.p[2], vx: d.v[0], vy: d.v[1], vz: d.v[2], life: 4, trail: [] });
  else if (d.t === 'done') G.done = true, G.sc = d.score;
}
function ghostsStep(dt) {
  for (const id in HUB.ghosts) { const G = HUB.ghosts[id]; G.swing = Math.max(0, G.swing - dt);
    for (const c of G.comets) { c.vz -= 520 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.life -= dt; c.trail.push([c.x, c.y, c.z]); if (c.trail.length > 18) c.trail.shift(); }
    G.comets = G.comets.filter(c => c.life > 0 && c.z > -40);
    if (G.fake) { G.ft = (G.ft || 0) - dt; if (G.ft <= 0) { G.ft = 1.5 + RF() * 2; const th = (RF() - .5) * 1.2, v = 900 + RF() * 200; G.comets.push({ x: HX, y: PLATE_Y, z: 17, vx: v * .85 * Math.sin(th), vy: -v * .85 * Math.cos(th), vz: v * .55, life: 4, trail: [] }); G.sc += 380 + Math.floor(RF() * 120); G.swing = .35; } } }
}
function ghostsFake() { HUB.ghosts = {}; [['GHOSTY', 1], ['COMET KID', 2], ['MOONBEAM', 3]].forEach(([n, k]) => { HUB.ghosts[k] = { id: k, name: n, color: SEAT[k], sc: 0, o: 0, comets: [], swing: 0, fake: true, ft: k * .7 }; }); }
function ghostsDraw(r) {
  if (!M) return; const kit = parkKit(M.parkId), m7 = kit.m7, plate = M.cam === 'plate' || M.cam === 'moonshot';
  r.overlay(g => {
    const W = r.W; let k = 0;
    for (const id in HUB.ghosts) {
      const G = HUB.ghosts[id];
      for (const c of G.comets) for (let i = 0; i < c.trail.length; i++) { const [x, y, z] = c.trail[i], p = plate ? m7.project(x, y, z) : r.w(x, y, drawZ(z)); if (p) px.blend(g, .3 + i / c.trail.length * .5, 'add', () => px.disc(g, p[0], p[1], 1 + i / 6, G.color)); }
      // their hologram batter in an on-deck circle, and their score
      const ox = HX + (k % 2 ? 78 : -78), oy = HY - 21 - Math.floor(k / 2) * 30, p = plate ? m7.project(ox, oy, 0) : r.w(ox, oy, 0);
      if (p) { const s = plate ? p[2] : 1; px.blend(g, .45, 'add', () => { px.rect(g, p[0] - 3 * s, p[1] - 26 * s, 6 * s, 20 * s, G.color); px.disc(g, p[0], p[1] - 29 * s, 3.5 * s, G.color); if (G.swing > 0) px.line(g, p[0], p[1] - 18 * s, p[0] + 14 * s, p[1] - 22 * s, '#ffffff', Math.max(1, s)); }); }
      text(g, G.name + '  ' + fmt(G.sc) + ' FT', W - SAFE - cornerW(), SAFE + 66 + k * 10, G.color, { align: 'right' }); k++;
    }
  });
}
/* ---- the hubDerby scene: loading, the card, the countdown, the round, the end overlay ---- */
SCENES.hubDerby = {
  input: KEYS, view: 'broadcast', camera: { zoom: false },
  enter(d) { hubConnect(d && d.mock); music('hubcard'); MENUBG.park = 'megadome'; if (HUB.mock) HUB.mockT = 0; },
  exit() { if (HUB.mock) { HUB.phase = 'off'; HUB.api = null; BZ.mute = false; } },
  update(dt) {
    const A_ = hubApi(); if (HUB.ended) { return; }
    commonTick(dt);
    if (HUB.phase === 'card') {
      const I = game.input, c = I.clicked && I.clicked();
      if (I.pressed('confirm') || I.pressed('south') || (c && HUB.readyBtn && inR(c, HUB.readyBtn))) { I.consumeAll(); A_.answer('ready'); }
      if (I.pressed('north') || (c && HUB.moreBtn && inR(c, HUB.moreBtn))) { I.consumeAll(); A_.answer('more'); }
      if (HUB.mock) { HUB.mockT += dt; if (HUB.mockT > 3 && !A_.started) A_.start(); }
      return;
    }
    if (HUB.phase === 'countdown' || HUB.phase === 'round' || HUB.phase === 'done') {
      const t = A_.time();
      if (t < 0) { HUB.phase = 'countdown'; return; }
      if (HUB.phase === 'countdown') HUB.phase = 'round';
      if (M && M.derby) { M.derby.time = Math.max(0, (HUB.roundMs - t) / 1000); if (M.derby.time <= 0) derbyDone(); }
      if (M) { matchUpdate(dt); animateRigs(dt); broadcastFocus(dt); hudTick(dt); }
      ghostsStep(dt);
      const sec = Math.floor(t / 1000), D = M && M.derby;
      if (D && sec !== HUB.lastProg) { HUB.lastProg = sec; HUB.score = Math.round(D.score); try { A_.progress({ score: HUB.score, label: fmt(D.score) + ' ft · ' + D.hrs + ' HR · ' + D.outs + ' outs' }); } catch (e) { game.fail('hub progress', e); } }
      HUB.lastG += dt; if (HUB.lastG >= .1 && D && !D.done) { HUB.lastG = 0; hubSend({ t: 'g', area: 'derby', s: M.swing ? 1 : 0, rx: +M.reticle.x.toFixed(1), rz: +M.reticle.z.toFixed(1), sc: Math.round(D.score), o: D.outs }, false); }
      if (D && D.done && !HUB.reported) { hubReport(); hubSend({ t: 'done', score: Math.round(D.score) }); HUB.phase = 'done'; }
    }
  },
  draw(r) {
    if (HUB.phase === 'round' || HUB.phase === 'done' || (HUB.phase === 'end' && M)) { drawMatchWorld(r); drawHUD(r); ghostsDraw(r); }
    else { r.sky(['#07081c', '#1c1a48', '#5a2a5a']); }
    r.overlay(g => {
      const W = r.W, H = r.H, A_ = hubApi();
      if (HUB.phase === 'loading') text(g, 'CONNECTING...', W / 2, H / 2, '#ffffff', { align: 'center', scale: 2 });
      if (HUB.phase === 'card') hubCard(g, W, H);
      if (HUB.phase === 'countdown') { const t = A_ ? A_.time() : 0; E.font.title(g, t < -2000 ? '3' : t < -1000 ? '2' : t < 0 ? '1' : 'PLAY BALL!', W / 2, H / 2 - 20, { scale: 5, colors: GOLD, align: 'center' }); }
      if (HUB.phase === 'done' && !HUB.ended) banner(g, W, H, 'ROUND DONE', fmt(M.derby.score) + ' FT  ·  WAITING FOR THE OTHERS');
      if (HUB.phase === 'end') { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c')); title(g, 'ROUND OVER', W / 2, 30, 4); const pl = (HUB.info && HUB.info.players) || []; (HUB.standings || []).forEach((grp, i) => (Array.isArray(grp) ? grp : [grp]).forEach((id, j) => { const p = pl.find(q => q.id === id); if (p) text(g, (i + 1) + '.  ' + String(p.name).slice(0, 18), W / 2 - 60, 80 + (i + j) * 14, p.color || SEAT[id % 4], { scale: 1 }); })); }
    });
  }
};
const inR = (c, b) => c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h;
function hubCard(g, W, H) {
  const c = HUB.card || {}, pl = (HUB.info && HUB.info.players) || [], I = game.input;
  E.font.title(g, 'BATZOOKA', W / 2, 10, { scale: 4, colors: GOLD, align: 'center', depth: 3 }); text(g, 'BATZOOKA DERBY · ONLINE', W / 2, 46, '#c8d8ff', { align: 'center', scale: 2 });
  pl.forEach((p, i) => { const x = W / 2 - (pl.length - 1) * 40 + i * 80, y = 100, col = p.color || SEAT[p.id % 4], ready = (c.ready || []).includes(p.id);
    px.rect(g, x - 6, y - 30, 12, 26, col); px.disc(g, x, y - 34, 6, '#f0c8a8'); px.rect(g, x - 7, y - 41, 14, 4, col); px.line(g, x + 6, y - 22, x + 18, y - 40, '#c89a5a', 2);
    text(g, String(p.name).slice(0, 12), x, y + 2, col, { align: 'center' }); text(g, ready ? '✓ READY' : '...', x, y + 12, ready ? '#4fe0b0' : '#8a8ca8', { align: 'center' }); });
  text(g, 'HOW TO WIN: hit the most home-run feet in 2:00', W / 2, 132, '#ffffff', { align: 'center' });
  promptRow(g, I, [['up', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['r1', 'BATZOOKA']], W / 2, 146, 'center');
  const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
  text(g, c.starting ? 'Starting...' : c.paused ? 'Waiting for more time...' : left !== null ? 'Starting in ' + left + ' s' : '', W / 2, 166, '#ffe680', { align: 'center' });
  if (c.asked) text(g, 'You asked for more time', W / 2, 176, '#a8a8c8', { align: 'center' });
  HUB.readyBtn = { x: W / 2 - 110, y: H - 50, w: 100, h: 24 }; HUB.moreBtn = { x: W / 2 + 10, y: H - 50, w: 100, h: 24 };
  E.ui.box(g, HUB.readyBtn.x, HUB.readyBtn.y, 100, 24, { bg: ['#2a6a4a', '#1a4a32'], border: '#4fe0b0' }); const gw = glyph(g, I, 'confirm', HUB.readyBtn.x + 6, HUB.readyBtn.y + 6, 11); text(g, 'READY', HUB.readyBtn.x + 6 + gw + (100 - 12 - gw) / 2, HUB.readyBtn.y + 8, '#ffffff', { align: 'center' });
  E.ui.box(g, HUB.moreBtn.x, HUB.moreBtn.y, 100, 24, { bg: ['#4a3a7a', '#2a1c4a'], border: '#ffe680' }); const gm = glyph(g, I, 'north', HUB.moreBtn.x + 6, HUB.moreBtn.y + 6, 11); text(g, (I.lastDevice === 'gamepad' ? '' : '/ M  ') + 'MORE TIME', HUB.moreBtn.x + 6 + gm + (100 - 12 - gm) / 2, HUB.moreBtn.y + 8, '#ffffff', { align: 'center' });
}
// the card's "More time" key: M (the keyboard has no triangle)
if (typeof addEventListener !== 'undefined') addEventListener('keydown', e => { if (HUB.phase === 'card' && e.code === 'KeyM') { const A_ = hubApi(); if (A_) A_.answer('more'); } });

/* ===== 90-start.js ===== */
/* START: the scenes table, deep links, game.debug (the tests', the dev mode's and the attract director's handle) and the
 * boot. Every scene's update first runs the common tick (babble voices, the crowd). */
function commonTick(dt) { babble.update(dt); crowdStep(dt); }
game.debug = {
  snapshot() {
    const b = M && M.ball;
    return { scene: game.sceneName, phase: M && M.phase, inning: M && M.inning, half: M && M.half, outs: M && M.outs, balls: M && M.balls, strikes: M && M.strikes,
      score: M ? [M.teams[0].runs, M.teams[1].runs] : null, bases: M ? [1, 2, 3].map(k => runnerOn(k) ? runnerOn(k).p.name : null) : null,
      ball: b ? { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), mode: b.mode } : null, lastContact: M && M.lastContact, cam: M && M.cam,
      meters: M ? M.teams.map(t => Math.round(t.meter)) : null, device: game.input.lastDevice, glyphs: game.input.glyphs, touchOnly: BZ.touchOnly, errors: game.errors.length,
      attract: { on: game.sceneName === 'attract', segment: ATT.seg }, dev: { open: DEV.open, tab: DEV_TABS[DEV.tab] }, hub: { phase: HUB.phase, score: HUB.score, sent: HUB.sent },
      tour: { stop: SAVE.tour.stop, fb: SAVE.fb, done: SAVE.tour.done }, derby: M && M.derby ? { score: M.derby.score, hrs: M.derby.hrs, outs: M.derby.outs } : null };
  },
  BZ, tune: TUNE, resetTune: BZ.resetTune, events: BZ.bus.log,
  match: o => newMatch(o), M: () => M, save: () => SAVE, setSave: s => { SAVE = s; },
  force(o) { M.force = Object.assign(M.force || {}, o); if (o.rhubarb) M.forceRhubarb = true; },
  warp: (scene, data) => game.go(scene, data, { fade: 0 }),
  step(dt) { matchUpdate(dt); }, botStep: dt => botStep(dt),
  fns: { startRhubarb, devOpen, devUpdate, playStop, newDerby, derbyDone, lessonGoal, pitchingChange, hubConnect, startExhibition, applySituation, devRows, promptsFor, iconInfo, nextSeg }
};
SCENES.boot = { enter() { game.go(firstScene(), null, { fade: 0 }); }, update() {} };
function firstScene() {
  if (hubActive()) return 'hubDerby';
  const h = typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '';
  const [s, a] = h.split('/');
  if (s === 'match') { const ht = a ? PARKS[a].team : 'HCK'; BZ.matchCfg = { mode: 'exhibition', away: ht === 'COM' ? 'HCK' : 'COM', home: ht, park: a || 'barnacle', innings: 3, ctrl: [[game.input, null], [null, null]] }; return 'match'; }
  if (s === 'derby') { DB.turn = 0; DB.scores = []; return 'derby'; }
  if (s === 'hubcard') { BZ.hubMockBoot = true; return 'hubMock'; }
  if (s === 'tour') { SAVE.tour.started = true; return 'tourMap'; }
  if (['title', 'attract', 'about', 'gallery', 'credits', 'lessons', 'teamSelect', 'derbySetup', 'clubhouse', 'tourMap'].includes(s)) return s;
  if (s === 'touch') { BZ.touchOnly = true; return 'title'; }
  return 'title';
}
SCENES.hubMock = { enter() { game.go('hubDerby', { mock: true }, { fade: 0 }); }, update() {} };
for (const k in SCENES) BZ.def('scenes', k, SCENES[k]);
function bootGame() {
  detectTouch(); initSaves(); defineSettings();
  if (game.settings.keepTune) { try { const t = E.store.get('bz:tune', null); if (t) for (const m of TUNE_META) if (typeof t[m.key] === 'number') TUNE[m.key] = clamp(t[m.key], m.min, m.max); } catch (e) { /* storage blocked */ } }
  game.input.use(KEYS);
  game.start({ scenes: SCENES, scene: 'boot', boot: HEADLESS ? false : { title: 'BATZOOKA BASEBALL', steps: [['Building the ballparks', () => { for (const id of PARK_ORDER) parkKit(id); }], ['Dressing the teams', () => { for (const id of TEAM_ORDER) for (const p of TEAMS[id].roster) { makeRig(p, 'bat'); makeRig(p, 'field'); } }], ['Tuning the organ', () => {}]] } });
}
bootGame();
if (typeof window !== 'undefined') window.BZ = BZ;
Object.assign(BZ, { newTour, playStop, DB, LESSONS, LINES, ABOUT: ABOUT_DATA, lessonCfg: n => Object.assign(LESSONS[n].cfg(), { mode: 'training', innings: 99, lesson: LESSONS[n] }) });

})();
