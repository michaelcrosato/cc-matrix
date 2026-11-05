(() => {
// ---- 00-head.js ----
/* KARATE CHAMPON: a point-sparring karate game inspired by Karate Champ (1984).
 * CORE LOOP: Read your opponent from your mark. Commit to one technique with two sticks. Land it clean before they land
 * theirs. The referee stops the fight, scores it and resets. First to 2 points takes the round, best of 3 takes the
 * match. Win to earn a belt and the next stage, with a bonus stage after every second win.
 * Built on my-3D2dge (v0.85.2, extended: engine/CHANGES.md). All content is data (KC.DATA); every system reads KC.TUNE
 * live so the dev panel's sliders apply at once. */
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const KC = {}; if (typeof window !== 'undefined') window.KC = KC;
KC.VERSION = '1.0.0';
KC.ABOUT = {"sourceInformation":{"date":"2026-11-03 18:38:48","source":"Karate Champ (1984 arcade by Data East; known in Japan as Karate Do)","plan":"PLAN.md","genre":"1-on-1 point-sparring karate fighting with arcade bonus stages and a mimic-the-master drill","perspective":"2D side view on a single arena (optional Tatami 2.5D camera)","tech":"my-3D2dge v0.85.2 (full engine, modified: right-stick codes, standard-setting defaults, a voice bus), AI Hub session client 1.4.0, Web Audio; tests on Node","artDirection":"the engine's native HD rigs drawn as PS1-era pixel art at 320x240, white-gi vs red-gi fighters on Japanese stages","animation":"the engine's procedural Humanoid rig plus new karate poses, spins, somersaults, blocks, bows and referee signals","audio":"code-generated chip music in Japanese pentatonic scales, synthesized sound effects, and Animalese-style gibberish voices","online":"AI Hub shared-world sessions (Kachinuki, winner stays on, 2-4 players) plus local versus and local Kachinuki","testing":"headless Node suites driving game.advance and game.debug (data, input, technique, bout, AI, bonus, drill, story full playthrough, versus, attract, dev, UI, audio, smoke, online with a fake hub), browser checks with Playwright 1.63.0 (engine check.mjs, session bytes, and a direct inspection of the shipped file feature by feature) and the real AI Hub harness (2p; 4p with latency 150, jitter 50, loss 5; host-leave; server), behind one command: node tests/run.mjs (all suites)","research":"the research summarized in PLAN.md (Wikipedia, TASVideos, Shacknews, arcade-history); no new research","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-opus-5-5, reasoning effort medium","usage":"session time about 1 h 25 min (18:38:48 start, files and clock checked at 19:59:49, plus the final checks); API cost and token counts unknown (not visible to the agent in this session)"},"testingFeedback":["27 game issues, each listed with its fix in ISSUES.md in the dev folder: scene flags that persisted between visits, a crossed-fighters deadlock, an impossible reverse-punch drill, two crashes, CPU timing bugs, lost buffered presses, lunge and jump-kick imbalance, attract-demo timing, a storage fallback, missing font glyphs, and layout overlaps; and, from driving the shipped file in Chromium, unbound keys that did not exit the attract mode and touch controls re-enabled on phones.","5: a crash at load, the walk-back deadlock that froze a bout after fighters crossed, cutscenes that never ended after the first (story blocked), the reverse-punch drill that could not be passed (story blocked), and a Pots Ahoy! crash when the hero blocked.","The scripted full playthrough of the Champon Road (story suite): it found three of the five game-breaking bugs. Close second: driving the shipped HTML in Chromium (tests/inspect.mjs), which caught two TASK.md violations the headless suites missed.","The early mirror CPU-vs-CPU balance tables before the AI could actually react: they mostly measured an AI bug (late blocks), not balance, and had to be rerun after each fix."],"engineFeedback":["The procedural Humanoid rig: a fully dressed 3D fighter from a few options, with attack specs, poses and a solvePose hook I could wrap to add bows, blocks, somersaults and referee signals.","Yes: the side view is 1.5 px per world unit (I assumed 1), the right stick could not be bound to actions, scene objects keep their fields between visits, and E.store has no in-memory fallback in Node, so state leaked or vanished until I found each.","The point-sparring rules: KC.Bout (referee phases, scoring by timing and spacing, aiuchi, hantei) and the twin-stick technique system; the engine's fight module is built around life bars, so neither could be reused.","Making karate animations read in profile: spins as continuous facing angles, back kicks aimed behind the rig, and somersaults by rotating every joint after the pose is solved.","EC1: right-stick codes PadRAxisUp/Down/Left/Right (4-way, hysteresis) so the right stick can be the technique stick; EC2: game-level defaults for standard settings, so glyphs default to PlayStation; EC5: a voice bus with its own volume slider for the gibberish voices. Recorded in engine/CHANGES.md.","Let the right stick, and any analog axis, be bound as actions out of the box, with its own glyphs, so twin-stick controls need no engine edit."],"promptFeedback":["It asks for a complete, testable vertical slice with real infrastructure (attract mode, dev sliders, online, 10-foot UX), and the plan turned a 1984 arcade game into a clear data-driven design.","The plan used file names and a date for a different run (max effort, 17:47:43) from TASK.md's; TASK.md wins, but the clash had to be noticed. Its scope (online netcode with prediction, EC4 live pause, mocap fallbacks) is also larger than a medium-effort build can follow line by line.","Balancing a fighting game whose CPU must be beatable but not passive, and making a twin-stick scheme play well on a keyboard, both while keeping every mode (story, versus, Kachinuki, online, attract) on one rules engine.","Give the plan the run's own file names and date, and mark which plan items are must-have versus optional polish, so a builder can scope without second-guessing."],"aiHub":{"name":"Karate Champon","tagline":"Two sticks. One clean strike.","description":"A point-sparring karate tournament inspired by Karate Champ: land one clean technique and let the referee call it. Climb from white belt to Champ, break boards, smash flying pots and stop a charging bull.","type":"Game","genre":"Fighting","source":"Karate Champ (1984)","series":"","players":"1–4","controls":"Left stick/WASD: move, jump, crouch · Right stick, face buttons or IJKL: techniques · Options/Esc: pause","tags":["2d","arcade","versus","retro","pixel art","comedy"]}};
const HUB = typeof AIHub !== 'undefined' ? AIHub : null, SESSION = !!(HUB && HUB.active);
KC.SESSION = SESSION;

/* ---- TUNING: the live variables (dev panel sliders) ---- */
KC.TUNE_SPEC = [
  ['gameSpeed', 'GAME SPEED', .25, 2, .05, 1], ['techSpeed', 'TECHNIQUE SPEED', .5, 1.5, .05, 1], ['walk', 'WALK SPEED', 40, 120, 2, 72],
  ['jump', 'JUMP POWER', 250, 450, 5, 360], ['gravity', 'GRAVITY', 700, 1400, 10, 1100], ['hitstop', 'HIT-STOP (S)', 0, .3, .01, .10],
  ['fullAt', 'FULL POINT AT', 300, 1000, 50, 600], ['counterMul', 'COUNTER X', 1, 3, .1, 2], ['reachScale', 'REACH X', .7, 1.4, .05, 1],
  ['blockWindow', 'BLOCK FRAMES', 6, 30, 1, 14], ['clock', 'ROUND CLOCK (S)', 10, 99, 1, 30], ['pointsToWin', 'POINTS TO WIN', 1, 5, .5, 2],
  ['roundsToWin', 'ROUNDS TO WIN', 1, 3, 1, 2], ['cpuLevel', 'CPU LEVEL (0=AUTO)', 0, 10, 1, 0], ['cpuReact', 'CPU REACTION X', .5, 2, .05, 1],
  ['cpuAggression', 'CPU AGGRESSION (-1=AUTO)', -1, 1, .05, -1], ['refPace', 'REFEREE PACE X', .5, 2, .05, 1], ['potSpeed', 'POT SPEED X', .5, 2, .05, 1],
  ['bullSpeed', 'BULL SPEED X', .5, 2, .05, 1], ['kiSpeed', 'KI GAUGE SPEED X', .5, 2, .05, 1], ['sessionTarget', 'ONLINE BOUT WINS', 1, 10, 1, 5]
];
KC.TUNE_DEFAULTS = {}; for (const s of KC.TUNE_SPEC) KC.TUNE_DEFAULTS[s[0]] = s[5];
const TUNE = KC.TUNE = Object.assign({}, KC.TUNE_DEFAULTS);
KC.tuneChanged = () => KC.TUNE_SPEC.some(s => Math.abs(TUNE[s[0]] - s[5]) > 1e-9);
// dev toggles (KC.Dev): read live by the systems
const DEV = KC.DEVT = { boxes: false, frames: false, inputs: false, thoughts: false, invincible: false, p2: 'cpu', infTime: false, freezeCpu: false,
  slowmo: false, frameStep: false, fps: false, muteVoices: false, skipCut: false, unlocked: false, enabled: false };

/* ---- UTIL ---- */
const U = KC.U = {
  rng: seed => E.rng(seed >>> 0 || 1),
  hash: s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; },
  steps: f => Math.max(1, Math.round(f * 2)),                         // 60 fps frames -> 120 Hz steps
  pad: (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, '0'),
  // names from the hub drawn in the pixel font: uppercased, unsupported characters as ?, 10 long at most
  name: s => String(s || '').toUpperCase().replace(/[^A-Z0-9 .!?'\-]/g, '?').slice(0, 10) || '?',
  lerpAng: (a, b, k) => a + E.angDiff(a, b) * k,
  ease: k => k * k * (3 - 2 * k)
};
const FIX = s => String(s).replace(/·/g, '•').replace(/[—–]/g, '-').replace(/…/g, '...');
const T = (g, s, x, y, c, o) => E.font.text(g, FIX(s), Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o));
const TW = (s, o) => E.font.width(FIX(s), o || {});
KC.T = T; KC.TW = TW;
const BIG = { scale: 2 };
const TITLE_COLS = ['#fff6d0', '#ffd060', '#e8782a'];
KC.title = (g, s, x, y, scale = 3, colors = TITLE_COLS, o = {}) => E.font.title(g, FIX(s), Math.round(x), Math.round(y), Object.assign({ scale, colors, align: 'center', depth: Math.max(1, scale - 1) }, o));
const box = (g, x, y, w, h, o) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#1c1830', '#0c0a18'], border: '#e8d8a8' }, o));
KC.box = box;

/* ---- GLYPHS: controller badges, keycaps, stick and mouse icons drawn in pixels (the 5x7 font has no ✕ ○ □ △) ---- */
const PS = { 0: ['✕', '#7aa7ff'], 1: ['○', '#ff6a6a'], 2: ['□', '#ff8ad8'], 3: ['△', '#5ad8a0'] };
const XB = { 0: ['A', '#5ad86a'], 1: ['B', '#ff5a5a'], 2: ['X', '#5a9aff'], 3: ['Y', '#f0d040'] };
function drawPsSym(g, i, cx, cy, s, c) {   // a PlayStation symbol drawn as lines
  const r = Math.max(2, Math.round(s * .3));
  if (i === 0) { px.line(g, cx - r, cy - r, cx + r, cy + r, c, s > 12 ? 2 : 1); px.line(g, cx + r, cy - r, cx - r, cy + r, c, s > 12 ? 2 : 1); }
  else if (i === 1) { px.disc(g, cx, cy, r + 1, c); px.disc(g, cx, cy, r - (s > 12 ? 1 : 0), '#16141e'); }
  else if (i === 2) { px.rect(g, cx - r, cy - r, r * 2 + 1, r * 2 + 1, c); px.rect(g, cx - r + 1, cy - r + 1, r * 2 - 1, r * 2 - 1, '#16141e'); }
  else { px.line(g, cx, cy - r - 1, cx - r - 1, cy + r, c); px.line(g, cx, cy - r - 1, cx + r + 1, cy + r, c); px.line(g, cx - r - 1, cy + r, cx + r + 1, cy + r, c); }
}
const ARROW = { u: '↑', d: '↓', l: '←', r: '→', n: '•' };
/** draw one glyph at (x, y) (top left), size s (its height); returns its width. code: 'pad0'..'pad3' (face buttons, PS or
 *  Xbox by the setting), 'L:u' / 'R:r' (a stick and a direction), 'key:I' (a keycap), 'mouse:0' / 'mouse:2', 'btn:L1' */
KC.glyph = (g, x, y, code, s = 11) => {
  x = Math.round(x); y = Math.round(y);
  const [kind, v] = code.split(':');
  if (kind.startsWith('pad')) {
    const i = +kind.slice(3), xbox = KC.padFamily() === 'xbox', [sym, c] = (xbox ? XB : PS)[i];
    px.disc(g, x + s / 2, y + s / 2, s / 2, '#16141e'); px.disc(g, x + s / 2, y + s / 2, s / 2 - 1, '#2c2838');
    if (xbox) T(g, sym, x + s / 2 - TW(sym) / 2 + .5, y + s / 2 - 3, c, { shadow: null });
    else drawPsSym(g, i, Math.round(x + s / 2), Math.round(y + s / 2), s, c);
    return s;
  }
  if (kind === 'L' || kind === 'R') {
    px.disc(g, x + s / 2, y + s / 2, s / 2, '#16141e'); px.disc(g, x + s / 2, y + s / 2, s / 2 - 1, '#3a3650');
    const d = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0], n: [0, 0] }[v] || [0, 0], k = s * .22;
    px.disc(g, x + s / 2 + d[0] * k, y + s / 2 + d[1] * k, Math.max(2, s / 2 - 3), '#8a86a8');
    T(g, kind, x + s / 2 - 2 + d[0] * k, y + s / 2 - 3 + d[1] * k, '#fff', { shadow: null, font: s < 12 ? 'tiny' : undefined });
    if (v && v !== 'n') T(g, ARROW[v], x + s + 1, y + s / 2 - 3, '#ffd060');
    return s + (v && v !== 'n' ? 8 : 0);
  }
  if (kind === 'key') {
    const w = Math.max(s, TW(v) + 6);
    px.rect(g, x, y + 1, w, s, '#5a5468'); px.rect(g, x, y, w, s - 1, '#e8e4f0'); px.rect(g, x + 1, y + 1, w - 2, s - 3, '#d0ccdc');
    T(g, v, x + w / 2 - TW(v) / 2, y + s / 2 - 4, '#1a1624', { shadow: null });
    return w;
  }
  if (kind === 'mouse') {
    const w = Math.round(s * .75);
    px.rect(g, x, y, w, s, '#e8e4f0'); px.rect(g, x + 1, y + 1, w - 2, s - 2, '#c8c4d4');
    px.rect(g, v === '2' ? x + w / 2 : x + 1, y + 1, w / 2 - 1, s * .45, '#ff8a4a'); px.rect(g, x + w / 2, y, 1, s * .45, '#5a5468');
    return w;
  }
  if (kind === 'btn') {
    const w = TW(v) + 6; px.rect(g, x, y, w, s, '#16141e'); px.rect(g, x + 1, y + 1, w - 2, s - 2, '#3a3650'); T(g, v, x + 3, y + s / 2 - 4, '#fff', { shadow: null }); return w;
  }
  return 0;
};
KC.padFamily = () => (game.settings.glyphs === 'xbox' ? 'xbox' : game.settings.glyphs === 'playstation' ? 'playstation' : game.input.padStyle() === 'xbox' ? 'xbox' : 'playstation');
// the device prompts follow: the last used ('gamepad' | 'keyboard' | 'mouse')
KC.dev = (inp = game.input) => inp.lastDevice === 'gamepad' ? 'pad' : inp.lastDevice === 'mouse' ? 'mouse' : 'key';
/** a row of glyph codes and words: [['pad0', 'SELECT'], ['pad1', 'BACK']] centred at y; returns nothing */
KC.promptRow = (g, items, cx, y, s = 11) => {
  const parts = items.filter(Boolean), widths = parts.map(([c, w]) => glyphW(c, s) + 3 + TW(w) + 10), total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  parts.forEach(([c, w], i) => { const gw = KC.glyph(g, x, y, c, s); T(g, w, x + gw + 3, y + s / 2 - 4, '#f4ecd8'); x += widths[i]; });
};
function glyphW(c, s) { const [k, v] = c.split(':'); return k === 'key' ? Math.max(s, TW(v) + 6) : k === 'mouse' ? Math.round(s * .75) : k === 'btn' ? TW(v) + 6 : (k === 'L' || k === 'R') && v && v !== 'n' ? s + 8 : s; }
KC.glyphW = glyphW;
// confirm / back glyphs by device
KC.ok = () => KC.dev() === 'pad' ? 'pad0' : KC.dev() === 'mouse' ? 'mouse:0' : 'key:ENTER';
KC.back = () => KC.dev() === 'pad' ? 'pad1' : KC.dev() === 'mouse' ? 'mouse:2' : 'key:ESC';
KC.startG = () => KC.dev() === 'pad' ? 'btn:OPTIONS' : 'key:ENTER';
KC.bar = (g, items) => { const W = g.canvas ? g.canvas.width : game.W; px.blend(g, .6, 'normal', () => px.rect(g, 0, game.H - 18, game.W, 18, '#08060e')); KC.promptRow(g, items, game.W / 2, game.H - 15); };

/* ---- MENU: a 10-foot menu (scale-2 text, a pulsing bar, ▸ cursor, hold to repeat; hover moves the focus, click picks) ---- */
class Menu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.t = 0; this.rects = []; this.scale = o.scale || 2; }
  get sel() { return this.items[this.i]; }
  _ok(i) { const it = this.items[i]; return it && !it.disabled && !it.hidden; }
  move(d) { const n = this.items.length; for (let k = 1; k <= n; k++) { const j = (this.i + d * k + n * 4) % n; if (this._ok(j)) { this.i = j; game.audio.sfx('menuMove'); if (this.o.onMove) this.o.onMove(this.i); KC.Attract.poke(); return; } } }
  update(dt, inputs = game.players) {
    this.t += dt; if (!this._ok(this.i)) this.move(1);
    for (const I of inputs) {
      if (I.repeat('up', .35, .09)) this.move(-1); else if (I.repeat('down', .35, .09)) this.move(1);
      const it = this.items[this.i];
      if (it && it.adjust) { if (I.repeat('left', .35, .09)) { it.adjust(-1); game.audio.sfx('menuMove'); } else if (I.repeat('right', .35, .09)) { it.adjust(1); game.audio.sfx('menuMove'); } }
      if (I.pressed('confirm')) { I.consume && I.consume('confirm'); return this.pick(); }
      if (I.pressed('cancel') && this.o.onCancel) { game.audio.sfx('menuBack'); this.o.onCancel(); return true; }
    }
    const I = game.input, p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (p && (this._lp === undefined || this._lp[0] !== p[0] || this._lp[1] !== p[1])) { this._lp = p.slice(); const k = this.hit(p); if (k >= 0 && k !== this.i && this._ok(k)) { this.i = k; game.audio.sfx('menuMove'); if (this.o.onMove) this.o.onMove(k); } }
    if (c) { const k = this.hit(c); if (k >= 0 && this._ok(k)) { this.i = k; return this.pick(); } }
    return false;
  }
  hit(p) { return this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) return false; game.audio.sfx('menuOk'); KC.Attract.poke(); if (it.fn) it.fn(); else if (this.o.onPick) this.o.onPick(this.i, it); return true; }
  draw(g, cx, y, o = {}) {
    const sc = o.scale || this.scale, lh = o.lh || sc * 9 + 6, vis = this.items.filter(it => !it.hidden);
    const w = o.w || Math.max(...vis.map(it => TW(this.label(it), { scale: sc }))) + 40;
    if (o.box !== false) box(g, cx - w / 2 - 6, y - 8, w + 12, vis.length * lh + 12, { alpha: o.alpha === undefined ? .85 : o.alpha });
    this.rects = []; let row = 0;
    this.items.forEach((it, i) => {
      if (it.hidden) { this.rects[i] = null; return; }
      const yy = y + row++ * lh, on = i === this.i, lab = this.label(it);
      this.rects[i] = [cx - w / 2, yy - 3, w, lh];
      if (on) { const pulse = .35 + .2 * Math.sin(this.t * 6); px.blend(g, pulse, 'add', () => px.rect(g, cx - w / 2, yy - 3, w, lh - 2, '#e8a040')); T(g, '▸', cx - w / 2 + 4 + Math.round(Math.sin(this.t * 8)), yy, '#ffe08a', { scale: sc }); }
      T(g, lab, cx - TW(lab, { scale: sc }) / 2, yy, it.disabled ? '#6a6488' : on ? '#fff6d0' : '#d8d0e8', { scale: sc });
    });
  }
  label(it) { return typeof it.label === 'function' ? it.label() : it.label; }
}
KC.Menu = Menu;

// ---- 02-data.js ----
/* ---- DATA: designers extend the game by editing these tables (KC.validateData checks them at boot) ---- */
const M = E.MOVES, mv = (base, o) => Object.assign({}, M[base], o || {});
KC.DATA = {};
/* TECHNIQUES. L posture: n neutral, t toward, a away, u up, d down. R technique: u high, t toward, d low, a away/spin.
 * f: [startup, active, recovery] in 60 fps frames. reach: [min, max] contact gap between push boxes. travel: x toward
 * the foe over startup+active. pts: [lo, hi]; points = lo + round((hi-lo) * quality / 100) * 100. */
KC.DATA.techniques = [
  { id: 'frontKick', name: 'FRONT KICK', jp: 'MAE-GERI', L: 'n', R: 't', height: 'mid', f: [11, 5, 28], travel: 0, reach: [6, 30], pts: [100, 200], closeAlt: 'revPunch', closeGap: 12, move: mv('kick', { z0: .6, z1: .9 }), kiai: 'light', bull: true },
  { id: 'revPunch', name: 'REVERSE PUNCH', jp: 'GYAKU-ZUKI', L: 'n', R: 't', alt: true, height: 'mid', f: [6, 4, 18], travel: 4, reach: [0, 14], pts: [100, 200], move: mv('cross'), kiai: 'light' },
  { id: 'roundKick', name: 'ROUND KICK', jp: 'MAWASHI-GERI', L: 'n', R: 'u', height: 'high', f: [10, 5, 22], travel: 0, reach: [6, 30], pts: [300, 600], move: mv('roundhouse'), kiai: 'heavy' },
  { id: 'lowKick', name: 'LOW KICK', jp: 'GEDAN-GERI', L: 'n', R: 'd', height: 'low', f: [10, 5, 28], travel: 0, reach: [4, 28], pts: [100, 200], unblockable: true, move: mv('kick', { z0: .1, z1: .25 }), kiai: 'light' },
  { id: 'backKick', name: 'BACK KICK', jp: 'USHIRO-GERI', L: 'n', R: 'a', height: 'mid', f: [13, 5, 23], travel: 6, reach: [10, 34], pts: [200, 400], spin: .5, move: mv('kick', { z0: .55, z1: .75, reach: 7.5 }), kiai: 'heavy', bull: true },
  { id: 'upLunge', name: 'UPPER LUNGE PUNCH', jp: 'JODAN OI-ZUKI', L: 't', R: 'u', height: 'high', f: [15, 5, 26], travel: 30, reach: [18, 44], pts: [500, 1000], closeAlt: 'roundKick', closeGap: 18, move: mv('cross', { z0: -.3, z1: .4, lunge: 4 }), kiai: 'heavy', bull: true },
  { id: 'midLunge', name: 'MIDDLE LUNGE PUNCH', jp: 'CHUDAN OI-ZUKI', L: 't', R: 't', height: 'mid', f: [14, 5, 26], travel: 30, reach: [18, 44], pts: [200, 400], closeAlt: 'frontKick', closeGap: 18, move: mv('cross', { lunge: 4 }), kiai: 'heavy' },
  { id: 'frontSweep', name: 'FRONT FOOT SWEEP', jp: 'ASHI-BARAI', L: 't', R: 'd', height: 'low', f: [16, 8, 36], travel: 10, reach: [4, 34], pts: [200, 400], unblockable: true, knock: true, move: mv('sweep'), kiai: 'heavy' },
  { id: 'turnBackKick', name: 'TURN BACK KICK', jp: 'URA-GERI', L: 't', R: 'a', height: 'mid', f: [17, 5, 26], travel: 12, reach: [12, 40], pts: [500, 1000], spin: 1, move: mv('kick', { z0: .6, z1: .8, reach: 7.5 }), kiai: 'heavy' },
  { id: 'backRound', name: 'BACK ROUND KICK', jp: 'USHIRO-MAWASHI', L: 'a', R: 'u', height: 'high', f: [15, 5, 23], travel: 0, reach: [8, 34], pts: [500, 1000], spin: 1, move: mv('roundhouse', { z0: 1.1, z1: 1.5 }), kiai: 'heavy' },
  { id: 'backSweep', name: 'BACK FOOT SWEEP', jp: 'USHIRO-BARAI', L: 'a', R: 'd', height: 'low', f: [16, 8, 36], travel: 0, reach: [6, 34], pts: [100, 200], unblockable: true, knock: true, spin: 1, move: mv('sweep'), kiai: 'light' },
  { id: 'jumpSide', name: 'JUMPING SIDE KICK', jp: 'TOBI YOKO-GERI', L: 'u', R: 't', height: 'air', f: [16, 10, 26], travel: 0, air: { vz: 330, vx: 150 }, reach: [0, 30], pts: [300, 700], move: mv('flyingkick'), kiai: 'heavy' },
  { id: 'jumpBack', name: 'JUMPING BACK KICK', jp: 'TOBI USHIRO-GERI', L: 'u', R: 'a', height: 'air', f: [14, 8, 22], travel: 0, air: { vz: 340, vx: 50 }, reach: [0, 40], pts: [500, 1000], spin: .5, move: mv('flyingkick', { z0: .6, z1: .7 }), kiai: 'heavy' },
  { id: 'upperPunch', name: 'UPPER PUNCH', jp: 'AGE-ZUKI', L: 'd', R: 'u', height: 'rising', f: [8, 7, 30], travel: 0, reach: [0, 18], pts: [300, 600], move: mv('uppercut'), kiai: 'heavy', bull: true },
  { id: 'squatPunch', name: 'SQUATTING REVERSE LUNGE PUNCH', short: 'SQUAT PUNCH', jp: 'GEDAN GYAKU-ZUKI', L: 'd', R: 't', height: 'midlow', f: [13, 5, 30], travel: 20, reach: [10, 44], pts: [400, 800], move: mv('cross', { crouch: .9, z0: -2.2, z1: -2, lunge: 3 }), kiai: 'heavy', bull: true },
  // evasive and defensive actions
  { id: 'block', name: 'BLOCK', jp: 'UKE', L: 'a', R: 't', kind: 'block', f: [1, 14, 4] },
  { id: 'frontFlip', name: 'FRONT SOMERSAULT', jp: 'ZENPO KAITEN', L: 'u', R: 'u', kind: 'flip', f: [6, 40, 12], air: { vz: 370, vx: 140 } },
  { id: 'backFlip', name: 'BACK SOMERSAULT', jp: 'KOHO KAITEN', L: 'a', R: 'a', kind: 'flip', f: [6, 40, 12], air: { vz: 370, vx: -126 } },
  { id: 'jump', name: 'JUMP', jp: 'TOBI', L: 'u', R: 'd', kind: 'jump', f: [4, 39, 5], air: { vz: 0, vx: 0 } },
  { id: 'crouch', name: 'CROUCH', jp: 'SHAGAMI', L: 'd', R: 'd', kind: 'crouch', f: [3, 0, 5] },
  { id: 'backRoll', name: 'BACK ROLL', jp: 'KOHO UKEMI', L: 'd', R: 'a', kind: 'roll', f: [4, 28, 8], travel: -90 }
];
KC.TECH = {}; for (const t of KC.DATA.techniques) KC.TECH[t.id] = t;
KC.SCORING = KC.DATA.techniques.filter(t => t.pts).map(t => t.id);
// the posture x technique matrix (block sits at away + toward; revPunch is the close form of frontKick)
KC.MATRIX = { n: { u: 'roundKick', t: 'frontKick', d: 'lowKick', a: 'backKick' }, t: { u: 'upLunge', t: 'midLunge', d: 'frontSweep', a: 'turnBackKick' },
  a: { u: 'backRound', t: 'block', d: 'backSweep', a: 'backFlip' }, u: { u: 'frontFlip', t: 'jumpSide', d: 'jump', a: 'jumpBack' },
  d: { u: 'upperPunch', t: 'squatPunch', d: 'crouch', a: 'backRoll' } };
KC.POSTURES = [['n', 'NEUTRAL', 'L:n'], ['t', 'STEP IN', 'L:r'], ['a', 'STEP BACK', 'L:l'], ['u', 'JUMP', 'L:u'], ['d', 'CROUCH', 'L:d']];

/* ROSTER: rig (beyond the gi), stats, AI personality, voice, lines */
const BELT = KC.BELT = { white: '#f4f4ee', yellow: '#f0c830', green: '#3aa050', blue: '#2f5fd0', brown: '#6a4024', black: '#16161c', gold: '#e8c040' };
KC.RANKS = [['WHITE BELT', 'white'], ['YELLOW BELT', 'yellow'], ['GREEN BELT', 'green'], ['BLUE BELT', 'blue'], ['BROWN BELT', 'brown'],
  ['BLACK BELT 1ST DAN', 'black'], ['3RD DAN', 'black'], ['5TH DAN', 'black'], ['8TH DAN', 'black'], ['CHAMP', 'gold']];
KC.DATA.roster = [
  { id: 'taro', name: 'TARO', full: 'TARO MOYASHI', title: 'THE BEAN SPROUT', style: 'ALL-ROUNDER', belt: 'white',
    rig: { size: 1.95, build: 'heroic', hair: 'spiky', hat: { style: 'band', color: '#f4f4f4' }, colors: { skin: '#f0c49a', hair: '#1a1418' } },
    stats: { walk: 1, reach: 1, speed: 1 }, signature: 'roundKick', voice: { f0: 190, formant: 1.05, rate: 15, wave: 'square' },
    ai: { level: 5, aggression: .55, patience: .35, jump: .15, block: .35, gap: 40, weights: { roundKick: 2, frontKick: 2, upLunge: 2, frontSweep: 2, jumpSide: 1, backKick: 1 } },
    quotes: { intro: 'I WILL BE CHAMP!', win: 'OSU!', lose: 'AGAIN...' } },
  { id: 'kamaboko', name: 'KAMABOKO', full: 'KAMABOKO', title: 'DOJO CLASSMATE', style: 'CLUMSY BRAWLER', belt: 'white',
    rig: { size: 1.85, hair: 'short', hat: { style: 'band', color: '#ff7aa8' }, colors: { skin: '#f4caa8', hair: '#3a2a20' } },
    stats: { walk: .95, reach: .92, speed: .95 }, signature: 'frontKick', voice: { f0: 240, formant: 1.15, rate: 17, wave: 'square' },
    ai: { level: 1, aggression: .7, patience: .2, jump: .05, block: .1, gap: 30, weights: { frontKick: 3, lowKick: 2, revPunch: 2, roundKick: 1 } },
    quotes: { intro: 'I ATE THREE BOWLS. I AM READY!', win: 'MORE NOODLES!', lose: 'MY TUMMY...' }, tip: 'KAMABOKO KICKS FIRST. BLOCK, THEN STRIKE.' },
  { id: 'negi', name: 'NEGI', full: 'SENPAI NEGI', title: 'DOJO SENIOR', style: 'TEXTBOOK', belt: 'black',
    rig: { size: 2.1, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#3aa050' }, colors: { skin: '#e8b890', hair: '#16141a' } },
    stats: { walk: 1, reach: 1.04, speed: 1 }, signature: 'backKick', voice: { f0: 150, formant: 1, rate: 13, wave: 'sawtooth' },
    ai: { level: 2, aggression: .5, patience: .4, jump: .1, block: .35, gap: 36, weights: { roundKick: 2, frontKick: 2, backKick: 2, midLunge: 1 } },
    quotes: { intro: 'SHOW ME WHAT I TAUGHT YOU.', win: 'TRAIN HARDER.', lose: 'GOOD. VERY GOOD.' }, tip: 'NEGI IS PATIENT. LUNGE IN FROM FAR.' },
  { id: 'ebi', name: 'EBI', full: 'EBI', title: 'HARBOR FISHERMAN', style: 'JUMPER', belt: 'brown',
    rig: { size: 1.95, build: 'heroic', hair: 'short', hat: { style: 'band', color: '#ff8a2a' }, colors: { skin: '#c98a5a', hair: '#2a1a10' } },
    stats: { walk: 1.1, reach: .98, speed: 1.05 }, signature: 'jumpSide', voice: { f0: 210, formant: 1.08, rate: 19, wave: 'square' },
    ai: { level: 3, aggression: .6, patience: .2, jump: .35, block: .2, gap: 70, weights: { jumpSide: 4, frontFlip: 2, lowKick: 1, roundKick: 1 } },
    quotes: { intro: 'THE SEA MADE ME QUICK. CATCH ME!', win: 'TOO SLOW!', lose: 'THE TIDE TURNS...' }, tip: 'EBI JUMPS A LOT. UPPER PUNCH CATCHES JUMPERS.' },
  { id: 'kikurage', name: 'KIKURAGE', full: 'KIKURAGE', title: 'BAMBOO HERMIT', style: 'COUNTER-PUNCHER', belt: 'black',
    rig: { size: 1.9, hunch: .3, hood: true, outfit: 'robe', sleeves: 'long', hair: 'long', colors: { skin: '#d8b090', hair: '#5a4030', beard: '#d0d0c8' }, beard: true },
    stats: { walk: .9, reach: 1, speed: .95 }, signature: 'revPunch', voice: { f0: 110, formant: .92, rate: 9, wave: 'sawtooth' },
    ai: { level: 4, aggression: .25, patience: .8, jump: .05, block: .65, gap: 40, weights: { revPunch: 3, upperPunch: 3, squatPunch: 2, backSweep: 1 } },
    quotes: { intro: 'THE BAMBOO BENDS. IT DOES NOT BREAK.', win: 'PATIENCE WINS.', lose: 'THE WIND WAS STRONG.' }, tip: 'KIKURAGE BLOCKS MIDS. GO LOW.' },
  { id: 'ika', name: 'IKA', full: 'IKA', title: 'LOG-BRIDGE ACROBAT', style: 'CROSS-UPS', belt: 'black',
    rig: { size: 1.95, build: 'heroic', hair: 'long', sleeves: 'long', colors: { skin: '#e8d8f0', hair: '#f4f0f8' } },
    stats: { walk: 1.05, reach: 1.02, speed: 1.02 }, signature: 'backRound', voice: { f0: 200, formant: 1.1, rate: 14, wave: 'triangle', vib: 6 },
    ai: { level: 5, aggression: .5, patience: .3, jump: .25, block: .3, gap: 44, weights: { backRound: 3, turnBackKick: 3, backKick: 2, frontFlip: 2, backFlip: 2 } },
    quotes: { intro: 'EIGHT ARMS. TWO LEGS. WATCH THEM ALL.', win: 'INK IN YOUR EYES!', lose: 'TANGLED...' }, tip: 'IKA FLIPS OVER YOU. TURN AND STRIKE.' },
  { id: 'buta', name: 'BUTA', full: 'CAPTAIN BUTA', title: "SHIP'S CAPTAIN", style: 'POWER LUNGER', belt: 'black',
    rig: { size: 2.3, build: 'bulky', hair: 'bald', hat: { style: 'cap', color: '#1e2a5a' }, stubble: '#5a3a2a', colors: { skin: '#e0a080', hair: '#3a2a20' } },
    stats: { walk: .83, reach: 1.1, speed: .92 }, signature: 'upLunge', voice: { f0: 85, formant: .85, rate: 11, wave: 'sawtooth' },
    ai: { level: 6, aggression: .8, patience: .2, jump: .05, block: .2, gap: 60, weights: { upLunge: 4, midLunge: 3, frontSweep: 2, roundKick: 1 } },
    quotes: { intro: 'WELCOME ABOARD. NOW WALK THE PLANK!', win: 'OVERBOARD!', lose: 'ABANDON SHIP...' }, tip: 'BUTA LUNGES FROM FAR. BLOCK, THEN COUNTER.' },
  { id: 'asari', name: 'ASARI', full: 'ASARI', title: 'NIGHT-MARKET KEEPER', style: 'LOW GAME', belt: 'black',
    rig: { size: 1.9, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#2ab0a0' }, colors: { skin: '#f0c8a8', hair: '#2a1a24' } },
    stats: { walk: 1, reach: .96, speed: 1.04 }, signature: 'squatPunch', voice: { f0: 170, formant: 1, rate: 15, wave: 'square' },
    ai: { level: 7, aggression: .4, patience: .5, jump: .05, block: .5, gap: 34, crouch: .5, weights: { squatPunch: 3, backSweep: 3, frontSweep: 2, lowKick: 2, backRoll: 2 } },
    quotes: { intro: 'MY SHELL IS SHUT. GO HOME.', win: 'CLAMMED UP!', lose: 'MY SHELL... CRACKED.' }, tip: 'ASARI CROUCHES. JUMPING KICKS HIT HER.' },
  { id: 'kyabetsu', name: 'KYABETSU', full: 'MASTER KYABETSU', title: 'FUJI GARDEN MASTER', style: 'PUNISHER', belt: 'black', unlock: 'kyabetsu',
    rig: { size: 1.95, hair: 'bald', hunch: .2, build: 'heroic', colors: { skin: '#e0b898', hair: '#e8e8e0', beard: '#f4f4ee' }, beard: true },
    stats: { walk: .95, reach: 1.02, speed: 1.03 }, signature: 'turnBackKick', voice: { f0: 120, formant: .9, rate: 10, wave: 'sawtooth', vib: 5 },
    ai: { level: 8, aggression: .4, patience: .7, jump: .1, block: .6, gap: 42, readBonus: .05, habit: true, weights: { roundKick: 2, revPunch: 2, upperPunch: 2, turnBackKick: 1 } },
    quotes: { intro: 'MANY LAYERS, YOUNG ONE. PEEL THEM.', win: 'ANOTHER LAYER.', lose: 'THE CORE IS SWEET.' }, tip: 'KYABETSU PUNISHES MISSES. BE PATIENT.' },
  { id: 'mei', name: 'MEI', full: 'MEI', title: 'THE IRON LADLE', style: 'CHAMPION', belt: 'gold', unlock: 'mei',
    rig: { size: 1.95, build: 'heroic', hair: 'ponytail', colors: { skin: '#f4d0b0', hair: '#141018' } },
    stats: { walk: 1.05, reach: 1, speed: 1.05 }, signature: 'frontSweep', voice: { f0: 290, formant: 1.18, rate: 16, wave: 'square' },
    ai: { level: 9, aggression: .65, patience: .4, jump: .2, block: .5, gap: 46, habit: true, weights: { jumpSide: 3, roundKick: 3, frontSweep: 3, turnBackKick: 2, backRound: 2 } },
    quotes: { intro: 'THE GOLDEN BOWL STAYS IN MY SHOP.', win: 'NEXT CUSTOMER!', lose: 'NEXT YEAR I TAKE IT BACK.' }, tip: 'MEI WATCHES YOUR HABITS. MIX HIGH AND LOW.' }
];
KC.ROSTER = {}; for (const f of KC.DATA.roster) KC.ROSTER[f.id] = f;
KC.DATA.genkotsu = { id: 'genkotsu', name: 'GENKOTSU', voice: { f0: 105, formant: .9, rate: 10, wave: 'sawtooth', rough: .18 } };

/* STAGES: painters in 35-stage.js read these */
KC.DATA.stages = [
  { id: 'dojo', name: 'HON-DOJO', sub: "SENPAI NEGI'S DOJO", music: 'dojo', ambient: .55, crowd: 'seiza', floor: 'planks' },
  { id: 'harbor', name: 'NAGASAKI PIER', sub: 'DAWN AT THE HARBOR', music: 'harbor', ambient: .7, crowd: 'dock', floor: 'deck', mei: true },
  { id: 'bamboo', name: 'BAMBOO FOREST', sub: 'THE HERMIT WAITS', music: 'bamboo', ambient: .6, crowd: null, floor: 'dirt', weather: 'leaves' },
  { id: 'log', name: 'LOG BRIDGE', sub: 'A TRUNK OVER THE GORGE', music: 'gorge', ambient: .6, crowd: null, floor: 'log' },
  { id: 'ship', name: "SHIP'S STERN", sub: 'SUNSET ON THE BAY', music: 'ship', ambient: .55, crowd: 'crew', floor: 'deck', mei: true },
  { id: 'market', name: 'CHAMPON STREET', sub: 'THE NIGHT MARKET', music: 'market', ambient: .35, crowd: 'street', floor: 'stone', mei: true },
  { id: 'fuji', name: 'FUJI GARDEN', sub: 'DUSK UNDER THE MOUNTAIN', music: 'fuji', ambient: .6, crowd: 'garden', floor: 'gravel', mei: true },
  { id: 'stadium', name: 'NATIONAL STADIUM', sub: "THE CHAMPON CUP '84", music: 'stadium', ambient: .45, crowd: 'stadium', floor: 'mat', mei: false },
  { id: 'courtyard', name: 'DOJO COURTYARD', sub: 'BONUS STAGE', music: 'bonus', ambient: .75, crowd: null, floor: 'earth', bonus: true },
  { id: 'fishmarket', name: 'FISH-MARKET ALLEY', sub: 'BONUS STAGE', music: 'bonus', ambient: .7, crowd: null, floor: 'wet', bonus: true },
  { id: 'pasture', name: 'FUJI PASTURE', sub: 'BONUS STAGE', music: 'bonus', ambient: .8, crowd: null, floor: 'grass', bonus: true }
];
KC.STAGE = {}; for (const s of KC.DATA.stages) KC.STAGE[s.id] = s;
KC.FIGHT_STAGES = KC.DATA.stages.filter(s => !s.bonus).map(s => s.id);

/* THE CHAMPON ROAD (story ladder) */
KC.DATA.ladder = [
  { kind: 'cutscene', id: 'prologue', stage: 'harbor', script: 'prologue', label: 'PROLOGUE' },
  { kind: 'practice', id: 'lessonI', stage: 'dojo', lesson: 'I', label: 'LESSON I' },
  { kind: 'match', id: 'm1', stage: 'dojo', opponent: 'kamaboko', promote: 1, hints: true, label: 'KAMABOKO' },
  { kind: 'match', id: 'm2', stage: 'dojo', opponent: 'negi', promote: 2, hints: true, label: 'SENPAI NEGI' },
  { kind: 'bonus', id: 'b1', bonus: 'boards', stage: 'courtyard', label: 'BREAK THE BOARDS' },
  { kind: 'match', id: 'm3', stage: 'harbor', opponent: 'ebi', promote: 3, hints: true, pre: 'harborMei', post: 'harborAfter', label: 'EBI' },
  { kind: 'practice', id: 'lessonII', stage: 'harbor', lesson: 'II', label: 'LESSON II' },
  { kind: 'match', id: 'm4', stage: 'bamboo', opponent: 'kikurage', promote: 4, label: 'KIKURAGE' },
  { kind: 'bonus', id: 'b2', bonus: 'pots', stage: 'fishmarket', label: 'POTS AHOY!', pre: 'potsIntro' },
  { kind: 'match', id: 'm5', stage: 'log', opponent: 'ika', promote: 5, label: 'IKA' },
  { kind: 'practice', id: 'lessonIII', stage: 'log', lesson: 'III', label: 'LESSON III' },
  { kind: 'match', id: 'm6', stage: 'ship', opponent: 'buta', promote: 6, label: 'CAPTAIN BUTA' },
  { kind: 'bonus', id: 'b3', bonus: 'bull', stage: 'pasture', label: 'STOP THE BULL' },
  { kind: 'match', id: 'm7', stage: 'market', opponent: 'asari', promote: 7, post: 'marketMei', label: 'ASARI' },
  { kind: 'match', id: 'm8', stage: 'fuji', opponent: 'kyabetsu', promote: 8, label: 'MASTER KYABETSU', unlock: 'kyabetsu' },
  { kind: 'match', id: 'm9', stage: 'stadium', opponent: 'mei', promote: 9, pre: 'finalEntrance', final: true, label: 'MEI' },
  { kind: 'ending', id: 'ending', stage: 'stadium', script: 'ending', label: 'THE GOLDEN BOWL', unlock: 'mei' }
];
KC.DATA.lessons = {
  I: { title: 'LESSON I', stage: 'dojo', intro: 'WATCH. THEN DO.', drills: ['frontKick', 'roundKick', 'lowKick', 'backKick', 'block', 'jump', 'crouch'] },
  II: { title: 'LESSON II', stage: 'harbor', intro: 'STEP IN. STRIKE THROUGH.', drills: ['midLunge', 'upLunge', 'revPunch', 'frontSweep', 'upperPunch', 'squatPunch'] },
  III: { title: 'LESSON III', stage: 'log', intro: 'TURN YOUR BACK. NEVER YOUR EYES.', drills: ['backRound', 'turnBackKick', 'backSweep', 'jumpSide', 'jumpBack', 'frontFlip', 'backFlip', 'backRoll'] },
  ALL: { title: 'ALL TECHNIQUES', stage: 'dojo', intro: 'EVERY TECHNIQUE. ONE BY ONE.', drills: ['frontKick', 'revPunch', 'roundKick', 'lowKick', 'backKick', 'upLunge', 'midLunge', 'frontSweep', 'turnBackKick', 'backRound', 'backSweep', 'jumpSide', 'jumpBack', 'upperPunch', 'squatPunch', 'block', 'frontFlip', 'backFlip', 'jump', 'crouch', 'backRoll'] }
};
KC.DATA.bonus = {
  boards: { stage: 'courtyard', title: 'BREAK THE BOARDS', n: 5, mat: 'pine', rise: 55, wobble: 6 },
  pots: { stage: 'fishmarket', title: 'POTS AHOY!', n: 16, i0: 1.4, i1: .8, v0: 150, v1: 230 },
  bull: { stage: 'pasture', title: 'STOP THE BULL', charges: [150, 190, 240] }
};
KC.MATS = { pine: ['PINE', 1, '#d8b070'], tile: ['ROOF TILE', 1.5, '#a85a40'], ice: ['ICE', 2, '#bfe8ff'] };

/* TEXT (terse, ALL CAPS; voices are gibberish, these are the subtitles) */
KC.CALLS = {
  begin: ['BEGIN!', 'HAJIME!'], stop: ['STOP!', 'YAME!'], white: ['WHITE!', 'SHIRO!'], red: ['RED!', 'AKA!'], half: ['HALF POINT!', 'WAZA-ARI!'],
  full: ['FULL POINT!', 'IPPON!'], nopoint: ['NO POINT!', 'TORIMASEN!'], aiuchi: ['AIUCHI!', 'AIUCHI!'], time: ['TIME!', 'SOREMADE!'], judges: ['JUDGES!', 'HANTEI!'],
  whiteWins: ['WHITE WINS!', 'SHIRO NO KACHI!'], redWins: ['RED WINS!', 'AKA NO KACHI!'], bow: ['BOW!', 'REI!'], decide: ['DECIDING ROUND!', 'SHOBU!'],
  forfeit: ['FORFEIT!', 'KIKEN!'], matchPoint: ['MATCH POINT!', 'MATCH POINT!'], perfect: ['PERFECT!', 'PERFECT!'], weak: ['WEAK!', 'WEAK!']
};
// fixed syllable counts and stress per call, so each call has a rhythm
KC.CALL_RHYTHM = { begin: [3, 1], stop: [2, 0], full: [3, 0], half: [3, 0], white: [2, 0], red: [2, 0], bow: [1, 0], time: [2, 0], judges: [3, 0], nopoint: [3, 1], aiuchi: [3, 1], decide: [4, 2], forfeit: [3, 0], matchPoint: [3, 0], whiteWins: [4, 0], redWins: [4, 0], perfect: [3, 1], weak: [1, 0] };
KC.SCRIPTS = {
  prologue: [['CARD', 'NAGASAKI HARBOR. SPRING 1984.'], ['CARD', 'THE CHAMPON CUP RETURNS.'], ['CARD', 'THE PRIZE: THE GOLDEN BOWL.'],
    ['taro', 'I AM TARO MOYASHI. WHITE BELT.'], ['taro', 'I WILL BE CHAMP!'], ['negi', 'FIRST, YOU LEARN TO KICK.']],
  harborMei: [['mei', 'YOU ARE THE NEW ONE? YOU LOOK LIKE A BEAN SPROUT.'], ['taro', '...I AM A BEAN SPROUT.'], ['mei', 'EAT. THEN FIGHT.']],
  harborAfter: [['mei', 'NOT BAD, MOYASHI.']],
  potsIntro: [['mei', "DON'T BREAK MY BOWLS! BLOCK TO CATCH!"]],
  marketMei: [['mei', "THE FINAL IS TOMORROW. DON'T BE LATE."]],
  finalEntrance: [['genkotsu', 'THE FINAL. THE CHAMPION ENTERS.'], ['mei', 'SURPRISE, MOYASHI. THE GOLDEN BOWL IS MINE.'], ['taro', '...YOU?'], ['mei', 'WHO DO YOU THINK MAKES THE BEST CHAMPON?']],
  ending: [['genkotsu', 'WHITE WINS! A NEW CHAMP!'], ['mei', 'A BEAN SPROUT BECAME A CHAMP.'], ['mei', 'NEXT YEAR I TAKE IT BACK.'], ['taro', 'OSU!'], ['CARD', 'YOU ARE THE KARATE CHAMPON.']],
  lessonEndI: [['negi', 'YOU ARE READY. FIGHT KAMABOKO.']],
  lessonEndII: [['negi', 'GOOD. NOW THE BAMBOO FOREST.']],
  lessonEndIII: [['negi', 'NOW YOU SPIN LIKE THE SEA.']]
};
KC.HINTS = ['THE REFEREE STOPS THE FIGHT AFTER EVERY CLEAN HIT.', 'FIRST TO 2 POINTS WINS THE ROUND.', 'CLEAN, FULL-REACH STRIKES SCORE FULL POINTS.',
  'HIT THEM DURING THEIR TECHNIQUE: DOUBLE POINTS!', "LOW KICKS AND SWEEPS CAN'T BE BLOCKED. JUMP THEM.", 'CROUCH UNDER HIGH KICKS.'];

KC.validateData = () => {
  const errs = [], T = KC.TECH;
  for (const p in KC.MATRIX) for (const r in KC.MATRIX[p]) if (!T[KC.MATRIX[p][r]]) errs.push('matrix ' + p + r);
  for (const t of KC.DATA.techniques) { if (t.closeAlt && !T[t.closeAlt]) errs.push('closeAlt ' + t.id); if (t.pts && !(t.reach && t.reach[1] > t.reach[0])) errs.push('reach ' + t.id); if (!(t.f && t.f.length === 3)) errs.push('frames ' + t.id); }
  for (const n of KC.DATA.ladder) { if (n.opponent && !KC.ROSTER[n.opponent]) errs.push('opponent ' + n.id); if (n.stage && !KC.STAGE[n.stage]) errs.push('stage ' + n.id); if (n.lesson && !KC.DATA.lessons[n.lesson]) errs.push('lesson ' + n.id); if (n.bonus && !KC.DATA.bonus[n.bonus]) errs.push('bonus ' + n.id); for (const k of ['pre', 'post', 'script']) if (n[k] && !KC.SCRIPTS[n[k]]) errs.push('script ' + n.id); }
  for (const l in KC.DATA.lessons) for (const d of KC.DATA.lessons[l].drills) if (!T[d]) errs.push('drill ' + d);
  for (const f of KC.DATA.roster) for (const w in f.ai.weights) if (!T[w]) errs.push('weight ' + f.id + ':' + w);
  if (errs.length) throw new Error('KC data: ' + errs.join(', '));
  return true;
};

// ---- 05-game.js ----
/* ---- THE GAME: input presets, settings, the pause menu ---- */
const MENU_K = { start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'],
  l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], dev: ['F2', 'Backquote'], l3: ['Pad10'], r3: ['Pad11'], more: ['KeyT', 'Pad3'], slow: ['KeyZ', 'Pad6'], copy: ['KeyC', 'Pad7'], click: ['Mouse0'] };
const KC_KEYS = KC.KEYS = Object.assign({
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'PadRAxisUp', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'PadRAxisDown', 'Pad0'],
  tLeft: ['KeyJ', 'Numpad4', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'PadRAxisRight', 'Pad1']
}, MENU_K);
// two on one keyboard: P1 WASD + T F G H, P2 arrows + I J K L / numpad (each keeps its pad codes)
const padOnly = a => KC_KEYS[a].filter(c => c.startsWith('Pad'));
KC.KEYS_P1HALF = Object.assign({}, KC_KEYS, { up: ['KeyW', ...padOnly('up')], down: ['KeyS', ...padOnly('down')], left: ['KeyA', ...padOnly('left')], right: ['KeyD', ...padOnly('right')],
  tUp: ['KeyT', ...padOnly('tUp')], tDown: ['KeyG', ...padOnly('tDown')], tLeft: ['KeyF', ...padOnly('tLeft')], tRight: ['KeyH', ...padOnly('tRight')], start: ['Digit1', 'Pad9'], confirm: ['Space', 'Pad0'], cancel: ['Escape', 'Pad1'] });
KC.KEYS_P2HALF = Object.assign({}, KC_KEYS, { up: ['ArrowUp', ...padOnly('up')], down: ['ArrowDown', ...padOnly('down')], left: ['ArrowLeft', ...padOnly('left')], right: ['ArrowRight', ...padOnly('right')],
  tUp: ['KeyI', 'Numpad8', ...padOnly('tUp')], tDown: ['KeyK', 'Numpad5', 'Numpad2', ...padOnly('tDown')], tLeft: ['KeyJ', 'Numpad4', ...padOnly('tLeft')], tRight: ['KeyL', 'Numpad6', ...padOnly('tRight')],
  start: ['Digit2', 'Enter', 'Pad9'], pause: ['Digit2', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Backspace', 'Pad1'] });
KC.KEYS_PAD = Object.assign({}, KC_KEYS);
// give each player its map: a half keyboard when two share it
KC.applyMaps = () => {
  const P = game.players, I = P[0], sharing = P.some(q => q !== I && q.half);
  const want = sharing ? KC.KEYS_P1HALF : KC_KEYS; if (I._kcMap !== want) { I.use(want); I._kcMap = want; }
  for (const q of P.slice(1)) { const w = q.half ? KC.KEYS_P2HALF : KC.KEYS_PAD; if (q._kcMap !== w) { q.use(w); q._kcMap = w; } }
};

const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal' },
  { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English' },
  { key: 'hints', label: 'Tutorial hints', value: true },
  { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side' },
  { key: 'techNames', label: 'Technique names', value: true },
  { key: 'inputDisplay', label: 'Input display', value: false },
  { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern', help: 'Classic: a white and red recolour (unlocked by finishing the Champon Road)' }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', id: 'karate-champon', input: KC_KEYS,
  defaults: { glyphs: 'playstation' },   // (EC2: PlayStation symbols by default)
  autoPause: !SESSION,
  menu: { items: () => SESSION ? [] : [['Move list', () => KC.openMoveList()], KC.canRetry() && ['Retry match', () => KC.retryMatch()], ['Dev mode', () => KC.Dev.open()]].filter(Boolean),
    settings: SETTINGS, controls: { tUp: 'Technique ↑ high', tDown: 'Technique ↓ low', tLeft: 'Technique ← spin', tRight: 'Technique → toward', l1: false, r1: false, dev: false, l3: false, r3: false, more: false, slow: false, copy: false, click: false },
    quit: SESSION ? false : 'title' } });
KC.game = game;
game.cam.smooth = .15;
KC.canRetry = () => !!(game.sceneName === 'fight' && KC.F && KC.F.mode !== 'attract' && KC.F.mode !== 'online');
KC.retryMatch = () => { game.resume && game.resume(); KC.F && KC.F.retry(); };
KC.openMoveList = () => { game.resume && game.resume(); KC.MoveList.open(game.sceneName); };
KC.calls = id => (KC.CALLS[id] || [id, id])[game.settings.calls === 'Japanese' ? 1 : 0];
KC.diff = () => game.settings.difficulty;
// saved data (E.store), mirrored in memory so it lasts the visit where storage is blocked
const MEM = {};
KC.store = (k, v) => { if (v === undefined) { const NO = {}, s = E.store.get('kc:' + k, NO); return s !== NO ? s : k in MEM ? MEM[k] : null; } MEM[k] = v; return E.store.set('kc:' + k, v); };
KC.unlocks = () => Object.assign({ kyabetsu: false, mei: false, classic: false }, KC.store('unlocks') || {});
KC.unlock = k => { const u = KC.unlocks(); if (!u[k]) { u[k] = true; KC.store('unlocks', u); } };
KC.isUnlocked = id => { const f = KC.ROSTER[id]; return !f.unlock || DEV.unlocked || KC.unlocks()[f.unlock]; };

// ---- 20-audio.js ----
/* ---- AUDIO: everything is synthesized. KC.Voice (Animalese/Simlish-style gibberish), the songs, the sound effects ---- */
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
const CONS = c => 'PBTDKGCQ'.includes(c) ? 'plo' : 'SFZXHJV'.includes(c) ? 'fri' : 'MNLRWY'.includes(c) ? 'nas' : null;
KC.Voice = {
  log: [],   // the last plans spoken (tests read them)
  /** the syllable plan for a line (deterministic: a hash of the line): [{ v, c, stress }], and its pace */
  plan(text, who, call) {
    const prof = (KC.ROSTER[who] || (who === 'genkotsu' ? KC.DATA.genkotsu : null) || { voice: { f0: 180, formant: 1, rate: 14, wave: 'square' } }).voice;
    const clean = String(text).toUpperCase().replace(/[^A-Z]/g, ''), vow = clean.replace(/[^AEIOU]/g, '') || 'A', h = U.hash(text + who);
    let n = call && KC.CALL_RHYTHM[call] ? KC.CALL_RHYTHM[call][0] : clamp(Math.ceil(clean.length / 2), 1, 26), stress = call && KC.CALL_RHYTHM[call] ? KC.CALL_RHYTHM[call][1] : h % Math.max(1, n);
    const syl = [];
    for (let i = 0; i < n; i++) { const ch = clean[(i * 2 + (h >> 3)) % Math.max(1, clean.length)] || 'A'; syl.push({ v: vow[(i + h) % vow.length].toLowerCase(), c: CONS(ch), stress: i === stress }); }
    const rate = call ? 9 : prof.rate, end = /\?\s*$/.test(text) ? 'q' : /!\s*$/.test(text) ? 'x' : /\.\.\.|…/.test(text) ? 's' : '.';
    return { syl, rate: end === 's' ? rate * .7 : rate, prof, end, dur: n / (end === 's' ? rate * .7 : rate) + .1 };
  },
  /** speak a line in a speaker's gibberish voice; returns its length in seconds (headless too: it drives timings) */
  speak(text, who, o = {}) {
    const P = this.plan(text, who, o.call); this.log.push({ text, who, n: P.syl.length, dur: P.dur }); if (this.log.length > 20) this.log.shift();
    if (DEV.muteVoices) return P.dur;
    const A = game.audio, c = A.ctx || (A._init && A._init()), bus = c && A.bus && A.bus('voice');
    if (!c || !bus || A.muted) return P.dur;
    try {
      let t = c.currentTime + .02; const step = 1 / P.rate, pr = P.prof, n = P.syl.length;
      const out = o.reverb ? this._reverb(c, bus) : bus;
      P.syl.forEach((s, i) => {
        const decl = 1 - .18 * i / Math.max(1, n - 1), endK = i === n - 1 ? (P.end === 'q' ? 1.25 : P.end === 'x' ? .82 : P.end === 's' ? .85 : .95) : 1;
        const jitter = 1 + ((U.hash(text + i) % 60) - 30) / 1000, f = pr.f0 * decl * endK * jitter * (s.stress ? 1.15 : 1) * (o.call ? 1.05 : 1);
        const vol = (o.call ? .5 : .32) * (s.stress ? 1.25 : 1), hold = step * .72;
        if (s.c) this._cons(c, out, t, s.c, vol);
        const osc = c.createOscillator(); osc.type = pr.wave === 'sawtooth' ? 'sawtooth' : pr.wave === 'triangle' ? 'triangle' : 'square'; osc.frequency.setValueAtTime(f, t);
        if (P.end === 'x' && i === n - 1) osc.frequency.linearRampToValueAtTime(f * .7, t + hold);
        if (P.end === 'q' && i === n - 1) osc.frequency.linearRampToValueAtTime(f * 1.3, t + hold);
        if (pr.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = pr.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + hold + .05); }
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, t + hold - .03); g.gain.linearRampToValueAtTime(0, t + hold);
        const [F1, F2] = FORMANTS[s.v] || FORMANTS.a;
        for (const [F, q, k] of [[F1 * pr.formant, 6, 1], [F2 * pr.formant, 9, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = q; const gg = c.createGain(); gg.gain.value = k * 2.2; osc.connect(bp); bp.connect(gg); gg.connect(g); }
        if (pr.rough) { const ns = c.createBufferSource(); ns.buffer = A._noise; const ng = c.createGain(); ng.gain.value = pr.rough; ns.connect(ng); ng.connect(g); ns.start(t); ns.stop(t + hold); }
        g.connect(out); osc.start(t); osc.stop(t + hold + .02);
        t += step;
      });
    } catch (e) { game.fail('voice', e); }
    return P.dur;
  },
  _cons(c, out, t, kind, vol) {
    const A = game.audio;
    if (kind === 'nas') { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 160; const g = c.createGain(); g.gain.setValueAtTime(vol * .6, t); g.gain.linearRampToValueAtTime(0, t + .02); o.connect(g); g.connect(out); o.start(t); o.stop(t + .03); return; }
    const s = c.createBufferSource(); s.buffer = A._noise; const f = c.createBiquadFilter(); f.type = kind === 'fri' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'fri' ? 3500 : 1800;
    const g = c.createGain(), d = kind === 'fri' ? .025 : .008; g.gain.setValueAtTime(vol * .7, t); g.gain.linearRampToValueAtTime(0, t + d); s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + d + .01);
  },
  _reverb(c, bus) {
    if (this._rv && this._rv.c === c) return this._rv.input;
    const input = c.createGain(), d = c.createDelay(), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = .09; fb.gain.value = .35; wet.gain.value = .45;
    input.connect(bus); input.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(bus); this._rv = { c, input }; return input;
  },
  /** a kiai: one or two loud syllables with a pitch drop */
  kiai(who, heavy) {
    if (DEV.muteVoices) return;
    const A = game.audio, c = A.ctx, bus = c && A.bus && A.bus('voice'); if (!c || !bus || A.muted) return;
    const pr = (KC.ROSTER[who] || { voice: { f0: 180, formant: 1, wave: 'square' } }).voice, t = c.currentTime + .005, d = heavy ? .2 : .11;
    const o = c.createOscillator(); o.type = pr.wave === 'sawtooth' ? 'sawtooth' : 'square'; o.frequency.setValueAtTime(pr.f0 * 1.35, t); o.frequency.exponentialRampToValueAtTime(pr.f0 * .8, t + d);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 * pr.formant; bp.Q.value = 3; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(heavy ? .6 : .4, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(bp); bp.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .02);
    this._cons(c, bus, t, 'plo', .5);
  },
  /** the crowd: tiny random blips over a noise bed, k 0..1 */
  crowd(k = .5, kind = 'cheer') {
    const A = game.audio, c = A.ctx, bus = c && A.bus && A.bus('voice'); if (!c || !bus || A.muted || DEV.muteVoices) return;
    const t = c.currentTime + .01, dur = .6 + k * 1.2, s = c.createBufferSource(); s.buffer = A._noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'ooh' ? 500 : 1100; f.Q.value = .8;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12 * k + .04, t + .15); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur);
    const r = U.rng((game.time * 1000) | 0);
    for (let i = 0; i < 6 + k * 14; i++) {
      const o = c.createOscillator(); o.type = 'square'; const tt = t + r() * dur * .7, f0 = 120 + r() * 180; o.frequency.setValueAtTime(f0, tt); o.frequency.linearRampToValueAtTime(f0 * (kind === 'ooh' ? .8 : 1.2), tt + .08);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'ooh' ? 450 : 900; bp.Q.value = 4; const gg = c.createGain(); gg.gain.setValueAtTime(0, tt); gg.gain.linearRampToValueAtTime(.05, tt + .01); gg.gain.linearRampToValueAtTime(0, tt + .09);
      o.connect(bp); bp.connect(gg); gg.connect(bus); o.start(tt); o.stop(tt + .1);
    }
  }
};

/* SONGS (Japanese pentatonic colour: in D Eb G A Bb, yo D E G A B), steps per beat 2 unless said */
const S = (bpm, tracks, steps = 2) => ({ bpm, steps, tracks });
const tr = (wave, vol, notes, o) => Object.assign({ wave, vol, notes }, o || {});
KC.SONGS = {
  title: S(132, [tr('square', .1, 'D5 - E5 G5 A5 - G5 E5 | D5 - B4 - A4 - . . | G4 A4 B4 D5 E5 - D5 B4 | A4 - - - D5 . D5 . | D5 - E5 G5 A5 - B5 A5 | G5 - E5 - D5 - . . | E5 G5 A5 B5 D6 - B5 A5 | G5 - - - . . D5 E5'),
    tr('triangle', .26, 'D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . D3 . | E2 . E2 B2 E2 . B2 . | A2 . A2 E3 A2 . A2 . | D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . D3 . | C3 . C3 G2 A2 . A2 . | D3 . A2 . D3 . . .'),
    tr('drums', .1, 'k h s h k k s h | k h s h k h s s')]),
  dojo: S(96, [tr('pulse12', .11, 'D5 . A4 . G4 A4 D5 . | Eb5 . D5 . A4 . . . | G4 . A4 Bb4 A4 . G4 . | D4 . . . . . . . | D5 . Eb5 D5 A4 . G4 . | A4 . Bb4 . A4 G4 D4 . | G4 A4 D5 . Eb5 . D5 . | A4 - - - . . . .'),
    tr('triangle', .22, 'D2 . . . A2 . . . | Bb2 . . . A2 . . . | G2 . . . A2 . . . | D2 . . . D2 . . .'), tr('drums', .09, 'k . . . o . . . | k . k . o . . t')]),
  harbor: S(120, [tr('square', .09, 'G4 A4 B4 D5 E5 . D5 B4 | A4 . G4 . E4 . . . | G4 A4 B4 D5 G5 . E5 D5 | E5 - - - . . . . | D5 E5 G5 . E5 D5 B4 . | A4 B4 D5 . B4 A4 G4 . | E4 G4 A4 . G4 E4 D4 . | G4 - - - . . . .'),
    tr('triangle', .26, 'G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 .'), tr('drums', .1, 'k h s h k h s h')]),
  bamboo: S(84, [tr('triangle', .16, 'D5 - - - Eb5 - D5 - | A4 - - - - - . . | G4 - A4 - Bb4 - A4 - | D4 - - - - - . . | A4 - - - Bb4 - A4 G4 | D5 - - - - - . . | Eb5 - D5 - A4 - G4 - | A4 - - - - - - -', { vib: [5, .012] }),
    tr('sine', .16, 'D3 - - - - - - - | G2 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -'), tr('drums', .05, 'h . . h . . h . | h . h . . . h .')]),
  gorge: S(140, [tr('pulse', .1, 'D4 D4 A4 D4 Bb4 D4 A4 G4 | D4 D4 A4 D4 Eb5 D5 A4 G4 | C4 C4 G4 C4 A4 C4 G4 F4 | D4 D4 A4 D4 Bb4 A4 G4 A4'),
    tr('square', .07, 'D5 - - - Eb5 - D5 - | A5 - - - G5 - - - | C5 - - - D5 - Eb5 - | D5 - - - - - . .'), tr('drums', .1, 'k t k t s t k t | k t k k s t t t')]),
  ship: S(110, [tr('square', .09, 'D5 . A4 D5 E5 F#5 | G5 . F#5 E5 . D5 | A4 . F#4 A4 B4 C#5 | D5 - - . . . | F#5 . E5 D5 . A4 | B4 . A4 G4 . F#4 | E4 F#4 G4 A4 . C#5 | D5 - - . . .'),
    tr('pulse', .1, 'D3 . A3 . A3 . | G2 . G3 . G3 . | A2 . E3 . E3 . | D3 . A3 . A3 .'), tr('drums', .09, 'k . h s . h | k . h s h h')], 3),
  market: S(124, [tr('sine', .13, 'A5 G5 E5 D5 E5 . G5 . | A5 . B5 A5 G5 E5 D5 . | E5 G5 A5 . G5 E5 D5 B4 | D5 - - - . . . . | G5 A5 B5 . A5 G5 E5 . | D5 E5 G5 . E5 D5 B4 . | A4 B4 D5 E5 G5 E5 D5 B4 | D5 - - - . . . .', { vib: [6, .01] }),
    tr('triangle', .24, 'D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | E2 . B2 . A2 . E3 . | D3 . A2 . D3 . . .'), tr('drums', .11, 'k h h k s h h h | k h k h s h c h')]),
  fuji: S(100, [tr('square', .07, 'D4 G4 B4 D5 D4 G4 B4 D5 | C4 E4 A4 C5 C4 E4 A4 C5 | B3 D4 G4 B4 B3 D4 G4 B4 | A3 D4 F#4 A4 A3 D4 F#4 A4'),
    tr('triangle', .2, 'G2 - - - - - - - | A2 - - - - - - - | E2 - - - - - - - | D2 - - - - - - -'), tr('pulse12', .08, 'D5 - - - B4 - - - | E5 - - - C5 - - - | D5 - B4 - G4 - - - | A4 - - - - - - -'), tr('drums', .06, 'k . . . s . . . ')]),
  stadium: S(150, [tr('square', .1, 'D5 D5 A5 . G5 . F5 E5 | D5 . C5 . A4 . . . | D5 D5 A5 . G5 . A5 C6 | D6 - - - . . . . | F5 . E5 . D5 . C5 . | D5 . E5 . F5 . A5 . | G5 . F5 . E5 . C5 . | D5 - - - . . D5 E5'),
    tr('pulse', .07, 'A4 A4 F5 . E5 . D5 C5 | A4 . G4 . F4 . . . | A4 A4 F5 . E5 . F5 A5 | A5 - - - . . . .'), tr('triangle', .26, 'D2 D3 D2 D3 D2 D3 D2 D3 | Bb1 Bb2 Bb1 Bb2 C2 C3 C2 C3'), tr('drums', .12, 'k h s h k k s h | k h s k k h s s')]),
  bonus: S(160, [tr('square', .09, 'G4 . B4 . D5 . B4 . | C5 . E5 . G5 . E5 . | D5 . F#5 . A5 . F#5 . | G5 . . . D5 . G4 .'), tr('triangle', .22, 'G2 . G3 . C3 . C3 . | D3 . D3 . G2 . . .'), tr('drums', .1, 'k h s h')]),
  practice: S(90, [tr('pulse', .08, 'D5 . . A4 . . G4 . | A4 . . . . . . . | B4 . . A4 . . G4 . | E4 . . . D4 . . .'), tr('triangle', .18, 'D3 - - - G2 - - - | A2 - - - D3 - - -'), tr('drums', .05, 'h . . . h . . .')]),
  select: S(128, [tr('square', .09, 'D5 . A4 . D5 E5 G5 . | A5 . G5 . E5 . D5 . | B4 . G4 . B4 D5 E5 . | D5 - - - . . . .'), tr('triangle', .24, 'D3 D3 . D3 A2 A2 . A2 | G2 G2 . G2 A2 A2 . A2'), tr('drums', .1, 'k . s . k k s .')]),
  session: S(110, [tr('pulse', .09, 'G4 . D5 . B4 . A4 . | G4 . E4 . D4 . . . | G4 . A4 . B4 . D5 . | E5 - - - D5 . . .'), tr('triangle', .22, 'G2 . . G2 D3 . . . | C3 . . C3 D3 . . .'), tr('drums', .08, 'k . h . s . h .')]),
  continue: S(120, [tr('square', .09, 'A4 . . . A4 . . . | Bb4 . . . A4 . . . '), tr('triangle', .22, 'D3 . D3 . D3 . D3 . | D3 . D3 . Eb3 . D3 .'), tr('drums', .1, 't . t . t . t .')]),
  gameover: S(80, [tr('square', .1, 'D5 - A4 - Bb4 - G4 - | A4 - - - D4 - - - | . . . . . . . .'), tr('triangle', .2, 'D3 - - - G2 - - - | D2 - - - - - - - | . . . . . . . .')]),
  ending: S(104, [tr('square', .09, 'D5 - E5 G5 A5 - G5 E5 | D5 - B4 - A4 - - - | G4 A4 B4 D5 E5 - D5 B4 | A4 - - - - - . . | B4 - D5 E5 G5 - E5 D5 | E5 - G5 - A5 - - - | B5 A5 G5 E5 D5 - E5 - | D5 - - - - - . .'),
    tr('triangle', .22, 'G2 - D3 - G2 - D3 - | E2 - B2 - E2 - B2 - | C3 - G2 - C3 - G2 - | D3 - A2 - D3 - A2 -'), tr('drums', .06, 'k . h . s . h .')])
};
KC.STINGS = {
  promotion: S(150, [tr('square', .12, 'D5 F#5 A5 D6 - - A5 D6 | - - - - . . . .'), tr('triangle', .22, 'D3 - A3 - D3 - - - | D2 - - - . . . .')], 4),
  victory: S(160, [tr('square', .12, 'G5 . G5 . G5 . D6 - - - B5 . D6 - - -'), tr('triangle', .22, 'G2 . G2 . G2 . D3 - - - G2 . G2 - - -')], 4),
  defeat: S(120, [tr('square', .1, 'A4 - G4 - Eb4 - D4 - - - - -'), tr('triangle', .2, 'D3 - - - Bb2 - - - D2 - - -')], 4),
  perfect: S(170, [tr('square', .12, 'D5 E5 G5 A5 B5 D6 E6 G6 - - - -'), tr('pulse12', .1, 'B5 D6 E6 G6 A6 - - - - - - -')], 4)
};

/* SOUND EFFECTS */
KC.SFX = {
  whooshL: { wave: 'noise', freq: 1400, to: 500, dur: .12, vol: .16, q: .8 }, whooshH: { wave: 'noise', freq: 900, to: 260, dur: .2, vol: .22, q: .7 },
  thwackHalf: [{ wave: 'noise', freq: 2200, to: 600, dur: .07, vol: .4 }, { wave: 'sine', freq: 140, to: 60, dur: .12, vol: .45 }],
  thwackFull: [{ wave: 'noise', freq: 3000, to: 400, dur: .12, vol: .55 }, { wave: 'sine', freq: 120, to: 40, dur: .25, vol: .6 }, { wave: 'square', freq: 90, to: 50, dur: .08, vol: .15 }],
  clack: [{ wave: 'square', freq: 1600, to: 900, dur: .03, vol: .22 }, { wave: 'noise', freq: 3000, dur: .04, vol: .25, q: 4 }],
  thudFall: [{ wave: 'sine', freq: 90, to: 35, dur: .3, vol: .6 }, { wave: 'noise', freq: 300, dur: .2, vol: .3 }],
  land: { wave: 'noise', freq: 400, to: 150, dur: .08, vol: .2 }, stepBare: { wave: 'noise', freq: 600, dur: .03, vol: .07 }, pivot: { wave: 'noise', freq: 2400, dur: .04, vol: .06 },
  flagSnap: { wave: 'noise', freq: 1500, to: 3000, dur: .06, vol: .2, q: 2 }, whistle: { wave: 'sine', freq: 2500, dur: .5, vol: .18, vib: [18, .03], hold: true },
  gong: [{ wave: 'sine', freq: 110, dur: 1.4, vol: .4 }, { wave: 'sine', freq: 233, dur: 1.1, vol: .2 }, { wave: 'triangle', freq: 330, dur: .8, vol: .1 }],
  taikoHit: [{ wave: 'sine', freq: 95, to: 55, dur: .35, vol: .6 }, { wave: 'noise', freq: 200, dur: .1, vol: .2 }],
  boardCrack: [{ wave: 'noise', freq: 2500, to: 700, dur: .12, vol: .5, q: 2 }, { wave: 'square', freq: 200, to: 80, dur: .1, vol: .2 }],
  potShatter: [{ wave: 'noise', freq: 4000, to: 1500, dur: .25, vol: .45, q: 1.5 }, { wave: 'triangle', freq: 1800, to: 2400, dur: .06, vol: .1 }],
  bowlDing: { wave: 'sine', freq: 1568, dur: .6, vol: .25, arp: [0, 7, 12], step: .07 }, bowlSplash: { wave: 'noise', freq: 900, to: 300, dur: .35, vol: .35 },
  bullSnort: { wave: 'noise', freq: 500, to: 200, dur: .35, vol: .35, q: 3 }, bullStomp: { wave: 'sine', freq: 70, to: 40, dur: .15, vol: .5 },
  bullBellow: [{ wave: 'sawtooth', freq: 110, to: 70, dur: .8, vol: .25, vib: [7, .05] }, { wave: 'noise', freq: 300, dur: .6, vol: .15 }],
  bullThud: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .7 }, { wave: 'noise', freq: 800, to: 200, dur: .2, vol: .4 }], dizzy: { wave: 'triangle', freq: 900, to: 1400, dur: .5, vol: .1, arp: [0, 4, 7, 4], step: .06, loop: true },
  gull: { wave: 'triangle', freq: 1400, to: 1000, dur: .25, vol: .06, vib: [12, .05] }, cameraFlash: { wave: 'noise', freq: 5000, dur: .03, vol: .08 },
  beltTie: { wave: 'noise', freq: 1200, to: 2400, dur: .15, vol: .15 }, scoreTick: { wave: 'square', freq: 1800, dur: .02, vol: .06 },
  menuMove: { wave: 'square', freq: 880, dur: .03, vol: .08 }, menuOk: { wave: 'square', freq: 660, to: 1320, dur: .08, vol: .12 }, menuBack: { wave: 'square', freq: 660, to: 330, dur: .08, vol: .1 },
  countBeep: { wave: 'square', freq: 1046, dur: .08, vol: .14 }, kiCharge: { wave: 'sine', freq: 300, to: 900, dur: .2, vol: .08 }
};
KC.music = id => { const s = KC.SONGS[id]; game.audio.music(s ? s : null); KC.musicId = id; };
KC.sting = id => { const s = KC.STINGS[id]; if (s) game.audio.sting(s, { at: 'now' }); };
KC.sfx = (id, o) => game.audio.sfx(id, o);

// ---- 30-karateka.js ----
/* ---- KARATEKA: one fighter. Body, state machine, the twin-stick technique system, boxes, pose and draw ----
 * state st: idle walk crouch tech hurt down auto pose. A technique runs in 120 Hz steps through phases s (startup),
 * a (active), r (recovery); air techniques launch after a short prep and land into recovery. Everything that poses the
 * rig is serializable state (st, tech, k, face, x, z...), so online guests, replays and the attract mode pose the same. */
const GI = { white: { cloth: '#f2eee4', pants: '#f2eee4' }, red: { cloth: '#c8302a', pants: '#c8302a' } };
const CLASSIC = { white: { cloth: '#ffffff', pants: '#ffffff' }, red: { cloth: '#ff2020', pants: '#ff2020' } };
/** read a human intent from an input: posture (screen u d l r n; vertical wins) and the technique press edge */
KC.readIntent = I => {
  if (!I || KC.Dev.active) return KC.NEUTRAL;
  const up = I.down('up'), dn = I.down('down'), lf = I.down('left'), rt = I.down('right');
  const posture = up ? 'u' : dn ? 'd' : lf && !rt ? 'l' : rt && !lf ? 'r' : 'n';
  const press = I.pressed('tUp') ? 'u' : I.pressed('tDown') ? 'd' : I.pressed('tLeft') ? 'l' : I.pressed('tRight') ? 'r' : null;
  return { posture, press };
};
KC.NEUTRAL = { posture: 'n', press: null };
// rotate joints (local frame [f, r, z]) about a pivot in the f-z plane: + bends forward
const rotJ = (J, keys, pv, a) => { const c = Math.cos(a), s = Math.sin(a); for (const k of keys) { const p = J[k]; if (!p) continue; const df = p[0] - pv[0], dz = p[2] - pv[2]; p[0] = pv[0] + df * c + dz * s; p[2] = pv[2] - df * s + dz * c; } };
const UPPER = ['shC', 'shL', 'shR', 'head', 'elbowL', 'handL', 'elbowR', 'handR', 'bladeDir'];
const ALLJ = ['hipL', 'hipR', 'kneeL', 'footL', 'kneeR', 'footR', 'hipC', 'shC', 'shL', 'shR', 'head', 'elbowL', 'handL', 'elbowR', 'handR'];
const ST_CODES = ['idle', 'walk', 'crouch', 'tech', 'hurt', 'down', 'auto', 'pose'];
const TECH_IDS = KC.DATA.techniques.map(t => t.id);

class Karateka {
  constructor(id, side, o = {}) {
    const R = KC.ROSTER[id]; this.id = id; this.R = R; this.side = side; this.name = o.name || R.name;
    this.x = o.x === undefined ? (side ? 250 : 150) : o.x; this.z = 0; this.vx = 0; this.vz = 0; this.face = side ? -1 : 1; this.ang = side ? Math.PI : 0;
    this.st = 'idle'; this.tech = null; this.k = 0; this.ph = ''; this.air = false; this.launched = false; this.hitDone = false; this.extraR = 0; this.blocked = false;
    this.posture = 'n'; this.buf = null; this.t = 0; this.stT = 0; this.poseName = null; this.frozen = false; this.kime = false; this.downW = 0; this.hurtT = 0;
    this.autoX = null; this.pivotT = 0; this.belt = o.belt || R.belt; this.size = R.rig.size; this.w = 8 * this.size; this.lastTech = null; this.history = []; this.flipU = 0;
    this.stats = { full: 0, half: 0, blocks: 0, best: null, bestPts: 0, attempts: 0, thrown: {} };
    this.buildRig(o.palette);
  }
  buildRig(palette) {
    const R = this.R, sideC = (palette === 'Classic' ? CLASSIC : GI)[this.side ? 'red' : 'white'], skin = R.rig.colors.skin;
    const colors = Object.assign({ trim: '#d8d0c0', eye: '#2a1a14' }, R.rig.colors, sideC, { boot: skin, glove: skin, belt: BELT[this.belt] || BELT.white });
    this.rig = new E.Humanoid(Object.assign({ weapon: null, outfit: 'shirt', sleeves: 'short' }, R.rig, { colors, speedRef: 50 }));
    const base = this.rig.solvePose, self = this;
    this.rig.solvePose = function () { base.call(this); self._post(this); };
    this.rig.update(1 / 120, this.rigState());
  }
  setBelt(b) { this.belt = b; this.rig.C.belt = BELT[b] || BELT.white; }
  get T() { return this.tech ? KC.TECH[this.tech] : null; }
  spd() { return (this.R.stats.speed || 1) * TUNE.techSpeed; }
  steps(i, t = this.T) { return Math.max(1, Math.round(U.steps(i === 1 && t.kind === 'block' ? TUNE.blockWindow : t.f[i]) / this.spd())); }
  get S() { return this.steps(0); } get A() { return this.steps(1); } get Rr() { return this.steps(2) + this.extraR; }
  free() { return !this.frozen && (this.st === 'idle' || this.st === 'walk' || this.st === 'crouch'); }
  grounded() { return this.z <= .01 && !this.air; }
  isAir() { return this.z > 3 || (this.air && this.launched); }
  isLow() { const t = this.T; return this.st === 'crouch' || (this.st === 'tech' && t && (t.L === 'd' || t.id === 'frontSweep' || t.id === 'backSweep' || t.kind === 'roll' || t.kind === 'crouch' || (t.kind === 'flip' && !this.launched) || (t.kind === 'jump' && !this.launched))); }
  inTech() { return this.st === 'tech' && this.T && (this.T.pts || this.T.kind === 'block' || this.T.kind === 'flip'); }
  hittable() { return !['down', 'auto', 'pose'].includes(this.st) && !this.invuln; }
  gapTo(o) { return Math.abs(o.x - this.x) - (this.w + o.w) / 2; }
  reach(t = this.T) { const k = (this.R.stats.reach || 1) * TUNE.reachScale; return [t.reach[0] * k, t.reach[1] * k]; }

  /** start a technique (by id) toward the foe; k: steps already elapsed (the posture upgrade keeps them) */
  start(id, foe, k = 0) {
    let t = KC.TECH[id]; if (!t) return false; this.reqTech = id;
    if (foe && t.closeAlt) { const g = this.gapTo(foe); if (g < t.closeGap) { t = KC.TECH[t.closeAlt]; if (t.closeAlt && g < t.closeGap) t = KC.TECH[t.closeAlt]; } }
    if (t.kind === 'crouch') { this.st = 'crouch'; return true; }
    this.st = 'tech'; this.tech = t.id; this.k = k; this.ph = 's'; this.hitDone = false; this.extraR = 0; this.launched = false; this.blocked = false; this.flipU = 0; this.blockH = null;
    this.techFace = this.face; this.startX = this.x; this.vx = 0; this.lastTech = t.id; this.history.push(t.id); if (this.history.length > 40) this.history.shift();
    this.stats.thrown[t.id] = (this.stats.thrown[t.id] || 0) + 1;
    if (t.pts && foe && this.gapTo(foe) <= this.reach(t)[1] + (t.travel || 0) + 30) this.stats.attempts++;
    if (this.onStart) this.onStart(this, t);
    return true;
  }
  /** one step of control: intent { posture, press } in screen directions, against foe */
  control(intent, foe, dt) {
    const toward = foe ? Math.sign(foe.x - this.x) || this.face : this.face;
    const rel = d => d === 'l' || d === 'r' ? ((d === 'r') === (toward > 0) ? 't' : 'a') : d;
    const P = rel(intent.posture), R = rel(intent.press); this.posture = P;
    if (R) this.buf = { R, P, t: .15 };
    else if (this.buf) { this.buf.t -= dt; if (this.buf.t <= 0) this.buf = null; }
    if (this.frozen) return;
    // the posture upgrade: a standing technique started with L neutral swaps to the posture's variant within 4 frames
    if (this.st === 'tech' && this.T && this.k <= 8 && this.upgradeR && P !== 'n' && this.T.L === 'n') {
      const id = KC.MATRIX[P][this.upgradeR]; if (id && id !== this.tech && KC.TECH[id].kind !== 'crouch') { const k = this.k; this.upgradeR = null; this.start(id, foe, Math.min(k, 6)); return; }
    }
    // a plain jump still on the ground takes a technique press: it becomes that air move
    if (this.st === 'tech' && this.tech === 'jump' && !this.launched && this.buf) { const id = KC.MATRIX.u[this.buf.R]; if (id !== 'jump') { this.buf = null; this.start(id, foe, 0); return; } }
    if (!this.free()) return;
    if (this.buf) { const bp = P === 'n' ? this.buf.P : P, id = KC.MATRIX[bp][this.buf.R]; this.upgradeR = bp === 'n' ? this.buf.R : null; this.buf = null; if (id === 'crouch') { this.st = 'crouch'; return; } this.start(id, foe); return; }
    if (P === 'u') { this.upgradeR = null; this.start('jump', foe); return; }
    if (P === 'd') { this.st = 'crouch'; this.vx = 0; return; }
    if (P === 't' || P === 'a') { this.st = 'walk'; this.vx = toward * (P === 't' ? 1 : -.78) * TUNE.walk * (this.R.stats.walk || 1); return; }
    this.st = 'idle'; this.vx = 0;
  }
  /** physics and the technique clock, one step */
  step(dt, foe, arena) {
    this.t += dt; this.stT += dt; if (this.hurtT > 0) this.hurtT -= dt;
    if (this.frozen && !this.kime && this.st !== 'down' && this.st !== 'hurt') { this.vx = 0; }
    const t = this.T;
    if (this.st === 'tech' && t && !this.frozen) {
      this.k++; const S = this.S, A = this.A;
      if (t.air) {
        const prep = t.kind === 'jump' || t.kind === 'flip' ? S : Math.min(S, U.steps(4));
        if (!this.launched && this.k >= prep) { this.launched = true; this.air = true; this.vz = t.kind === 'jump' ? TUNE.jump : t.air.vz * TUNE.jump / 360; this.vx = (t.air.vx || 0) * this.techFace; game.audio.sfx('whooshL', { vol: .5 }); }
        if (this.launched && this.air) { this.ph = t.kind ? 'a' : this.k < S ? 's' : this.k < S + A ? 'a' : 'r'; if (t.kind === 'flip') this.flipU = clamp(this.flipU + dt / .68, 0, .999); }
        else if (!this.launched) this.ph = 's';
        else { this.ph = 'r'; if (this.k >= this.landK + this.steps(2) * (t.pts ? .3 : 1) + this.extraR) this.endTech(foe); }
      } else if (t.kind === 'block') {
        this.ph = this.k < S ? 's' : this.k < S + A ? 'a' : 'r'; if (this.k >= S + A + this.Rr) this.endTech(foe);
      } else {
        const tot = S + A, trav = t.travel || 0;
        if (this.k <= tot && trav) { const d = trav / tot * this.techFace; this.x += d; }
        this.ph = this.k < S ? 's' : this.k < tot ? 'a' : 'r';
        if (this.kime && this.ph === 'r') this.k = Math.min(this.k, tot + 2);
        if (this.k >= tot + this.Rr && !this.kime) this.endTech(foe);
      }
      if (this.ph === 'a' && this.k === S && t.pts) { KC.Voice.kiai(this.id, t.kiai === 'heavy'); game.audio.sfx(t.kiai === 'heavy' ? 'whooshH' : 'whooshL'); }
    }
    // body motion
    if (this.air || this.z > 0) {
      this.vz -= TUNE.gravity * dt; this.z += this.vz * dt; this.x += this.vx * dt;
      if (this.z <= 0 && this.vz < 0) { this.z = 0; this.vz = 0; this.air = false; this.landK = this.k; this.vx = 0; this.rig.land(.4); game.audio.sfx('land'); if (this.st !== 'tech') this.st = 'idle'; if (this.onLand) this.onLand(this); }
    } else if (this.st === 'walk' || this.st === 'auto' || this.st === 'hurt' || this.st === 'down') {
      if (this.st === 'auto' && this.autoX !== null) { const d = this.autoX - this.x, sp = TUNE.walk * 2 * dt; if (Math.abs(d) <= sp) { this.x = this.autoX; this.autoX = null; this.st = 'idle'; this.vx = 0; } else { this.vx = Math.sign(d) * TUNE.walk * 2; this.x += this.vx * dt; } }
      else if (this.st === 'walk' && !this.frozen) this.x += this.vx * dt;
      else if ((this.st === 'hurt' || this.st === 'down') && this.slide) { const s = this.slide * Math.min(1, dt * 8); this.x += s; this.slide -= s; }
    }
    if (arena) this.x = clamp(this.x, arena[0] + this.w / 2, arena[1] - this.w / 2);
    // facing: free and grounded fighters turn to the foe (a short pivot)
    if (foe && this.grounded() && (this.free() || this.st === 'auto' && this.autoX === null)) { const want = Math.sign(foe.x - this.x) || this.face; if (want !== this.face) { this.face = want; this.pivotT = U.steps(6) / 120; game.audio.sfx('pivot'); } }
    if (this.pivotT > 0) this.pivotT = Math.max(0, this.pivotT - dt);
  }
  endTech(foe) { this.st = this.posture === 'd' ? 'crouch' : 'idle'; this.tech = null; this.ph = ''; this.k = 0; this.extraR = 0; this.launched = false; this.flipU = 0; this.kime = false; if (foe) { const want = Math.sign(foe.x - this.x) || this.face; if (want !== this.face) { this.face = want; this.pivotT = U.steps(6) / 120; } } }
  // reactions (the bout calls these)
  hurt(dir, full, sweep) { this.st = full || sweep ? 'down' : 'hurt'; this.tech = null; this.ph = ''; this.air = false; this.z = Math.max(0, this.z); this.vz = 0; this.vx = 0; this.slide = dir * (full || sweep ? 18 : 10); this.stT = 0; this.hurtT = .3; this.kime = false; }
  toMark(x) { this.st = 'auto'; this.autoX = x; this.tech = null; this.ph = ''; this.frozen = false; this.kime = false; this.z = 0; this.vz = 0; this.air = false; this.poseName = null; }
  setPose(p) { this.st = 'pose'; this.poseName = p; this.tech = null; this.ph = ''; this.vx = 0; this.stT = 0; }
  reset(x) { Object.assign(this, { x, z: 0, vx: 0, vz: 0, st: 'idle', tech: null, ph: '', k: 0, air: false, launched: false, frozen: false, kime: false, buf: null, poseName: null, slide: 0, autoX: null, flipU: 0, extraR: 0 }); }

  /** the rig's input, from serializable state only */
  rigState() {
    const t = this.T, base = this.face > 0 ? 0 : Math.PI, s = { x: this.x, y: 0, z: this.z, vx: this.st === 'walk' || this.st === 'auto' ? this.vx : 0, vy: 0, facing: base, stance: 'guard' };
    if (this.pivotT > 0) s.facing = base + (this.face > 0 ? -1 : 1) * Math.PI * (this.pivotT / (U.steps(6) / 120));
    if (this.st === 'crouch') s.pose = 'crouch';
    if (this.st === 'hurt') { s.hurt = true; s.expr = 'wince'; }
    if (this.st === 'down') { s.down = 1; s.expr = 'wince'; }
    if (this.st === 'pose') { const p = this.poseName; if (p === 'win') { s.pose = 'cheer'; s.expr = 'shout'; } else if (p === 'lose' || p === 'seiza' || p === 'kneel') s.pose = 'kneel'; else if (p === 'wave' || p === 'hips' || p === 'cheer') s.pose = p; else if (p === 'down') s.down = 1; }
    if (this.st === 'tech' && t) {
      const S = this.S, A = this.A, k = this.k;
      if (t.move) {
        let phase, u;
        if (t.air) { phase = !this.launched ? 'wind' : k < S ? 'wind' : k < S + A ? 'active' : 'recover'; u = phase === 'wind' ? clamp(k / S, 0, 1) : phase === 'active' ? clamp((k - S) / A, 0, 1) : this.air ? 0 : clamp((k - this.landK) / 12, 0, 1); s.air = this.air; }
        else { phase = k < S ? 'wind' : k < S + A ? 'active' : 'recover'; u = phase === 'wind' ? k / S : phase === 'active' ? (k - S) / A : this.kime ? 0 : clamp((k - S - A) / Math.max(1, this.Rr), 0, 1); }
        const spec = t.spin === .5 ? Object.assign({}, t.move, { a0: Math.PI + (t.move.a0 || 0), a1: Math.PI + (t.move.a1 || 0) }) : t.move;
        s.attack = { spec, phase, u };
        if (t.spin) { const turnSteps = t.spin === 1 ? S + A * .5 : S; s.facing = base + (this.techFace > 0 ? 1 : -1) * Math.PI * 2 * t.spin * U.ease(clamp(k / turnSteps, 0, 1)); if (t.spin === .5 && this.ph === 'r') s.facing = base + Math.PI * (1 - U.ease(clamp((k - S - A) / Math.max(1, this.Rr), 0, 1))); }
        if (t.L === 'd' && t.id !== 'upperPunch') s.pose = 'crouch';
        if (t.id === 'upperPunch' && phase === 'wind') s.pose = 'crouch';
        s.expr = phase === 'active' ? 'shout' : 'angry';
      } else if (t.kind === 'block') s.pose = 'guard';
      else if (t.kind === 'flip' || t.kind === 'jump') { s.air = this.air; if (!this.launched) s.pose = 'crouch'; }
      else if (t.kind === 'roll') { s.pose = 'crouch'; }
    }
    return s;
  }
  // rig post-processing: bows, blocks, flips and rolls rotate or place joints after the engine solves the pose
  _post(rig) {
    const J = rig.J, t = this.T;
    if (this.st === 'pose' && this.poseName === 'bow') rotJ(J, UPPER, J.hipC, .55 * clamp(this.stT / .3, 0, 1) * (this.stT < .7 ? 1 : clamp(1 - (this.stT - .7) / .25, 0, 1)));
    if (this.st === 'pose' && this.poseName === 'yoi') { J.handR[0] = 2.5; J.handR[2] = 13; J.handL[0] = 2.5; J.handL[2] = 13; J.handR[1] = 1.2; J.handL[1] = -1.2; J.elbowR[0] = 1; J.elbowL[0] = 1; }
    if (this.st === 'tech' && t && t.kind === 'block' && this.ph !== 'r') {
      const hi = this.blockH === 'high', sh = J.shR;
      if (hi) { J.elbowR = [sh[0] + 3, sh[1] - .5, sh[2] + 2]; J.handR = [sh[0] + 3.5, sh[1] - 4, sh[2] + 5]; }
      else { J.elbowR = [sh[0] + 3.5, sh[1], sh[2] - 3]; J.handR = [sh[0] + 5, sh[1] - 4.5, sh[2] - 2]; }
    }
    if (this.st === 'tech' && t && t.kind === 'flip' && this.launched && this.air) { const a = (t.air.vx > 0 ? 1 : -1) * Math.PI * 2 * this.flipU, pv = [J.hipC[0], 0, J.hipC[2] + 2]; rotJ(J, ALLJ, pv, a); }
    if (this.st === 'tech' && t && t.kind === 'roll') { const u = clamp((this.k - this.S) / this.A, 0, 1); if (u > 0 && u < 1) rotJ(J, ALLJ, [0, 0, 7], -Math.PI * 2 * u); }
    if (this.st === 'tech' && t && t.kind === 'jump' && this.launched) { for (const k of ['kneeL', 'kneeR']) { J[k][0] += 3; J[k][2] += 3; } for (const k of ['footL', 'footR']) { J[k][2] += 5; J[k][0] -= 1; } }
  }
  update(dt) { this.rig.update(dt, this.rigState()); }
  draw(r, o = {}) {
    const R = this.R, flash = this.hurtT > .2 ? '#ffffff' : null;
    r.shadow(this.x, 0, 10 * this.size / 2, .45);
    r.actor(this.x, 0, this.z, (g, ox, oy) => {
      this.rig.draw(g, ox, oy, r.view);
      if (R.rig.beard) { const h = this.rig.worldOffset(this.rig.J.head), a = r.w(this.x + h[0], h[1], this.z + h[2]), b = r.w(this.x, 0, this.z); const hx = Math.round(ox + a[0] - b[0]), hy = Math.round(oy + a[1] - b[1]); px.ell(g, hx + this.face * 2, hy + 7, 4, 4, R.rig.colors.beard || '#e8e8e0'); px.rect(g, hx + this.face * 2 - 2, hy + 9, 4, 4, E.shade(R.rig.colors.beard || '#e8e8e0', -.1)); }
    }, { flash, flashMix: .6, ghost: this.st === 'tech' && this.T && this.T.kind === 'flip' && this.air ? { color: this.side ? '#ff8070' : '#d0e0ff', life: .15, alpha: .35, owner: this } : undefined, key: this });
    if (this.st === 'tech' && this.ph === 'a' && this.T && this.T.pts) this.rig.drawSmear(r, this.side ? ['#ffffff', '#ffd0c8', '#ff8a7a', '#c8302a'] : undefined);
  }
  // online: the state that poses the fighter (and the puppet that applies it)
  snap() { return [Math.round(this.x * 10) / 10, Math.round(this.z * 10) / 10, this.face, ST_CODES.indexOf(this.st), this.tech ? TECH_IDS.indexOf(this.tech) : -1, this.k, (this.air ? 1 : 0) | (this.launched ? 2 : 0) | (this.kime ? 4 : 0) | (this.frozen ? 8 : 0), Math.round(this.flipU * 1000), ['', 'win', 'lose', 'bow', 'seiza', 'kneel', 'yoi'].indexOf(this.poseName || ''), this.landK || 0, this.blockH === 'high' ? 1 : 0]; }
  apply(a) {
    this.x = a[0]; this.z = a[1]; this.face = a[2]; this.st = ST_CODES[a[3]] || 'idle'; this.tech = a[4] >= 0 ? TECH_IDS[a[4]] : null; this.k = a[5];
    this.air = !!(a[6] & 1); this.launched = !!(a[6] & 2); this.kime = !!(a[6] & 4); this.frozen = !!(a[6] & 8); this.flipU = a[7] / 1000; this.poseName = ['', 'win', 'lose', 'bow', 'seiza', 'kneel', 'yoi'][a[8]] || null; this.landK = a[9]; this.blockH = a[10] ? 'high' : 'mid';
    if (this.tech) { const S = this.S, A = this.A; this.ph = this.k < S ? 's' : this.k < S + A ? 'a' : 'r'; } else this.ph = '';
  }
}
KC.Karateka = Karateka;

// ---- 31-bout.js ----
/* ---- BOUT: the rules (KC.Bout), the referee and judges (KC.Referee), the fight HUD ----
 * Phases: intro rei card ready hajime fight yame award reset roundEnd time hantei matchEnd over. Deterministic: no
 * Math.random; the hantei's noise comes from the bout's own seeded stream. Events on bout.on(name, fn): call point
 * block whiff aiuchi roundEnd matchEnd phase bonus. */
const PH_T = { intro: 1.2, rei: 1.1, card: .9, ready: .45, hajime: .6, yame: .9, award: 1.3, reset: 1.2, roundEnd: 2.0, time: .8, hantei: 2.4, matchEnd: 2.6 };
const PHASES = ['intro', 'rei', 'card', 'ready', 'hajime', 'fight', 'yame', 'award', 'reset', 'roundEnd', 'time', 'hantei', 'matchEnd', 'over', 'spar'];

class Referee {
  constructor() {
    this.rig = new E.Humanoid({ size: 1.55, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', stubble: '#e8e8e8',
      colors: { skin: '#e8b898', hair: '#d8d8d8', cloth: '#f4f4f0', coat: '#1e2a52', pants: '#6a6a72', boot: '#1a1a20', belt: '#1e2a52', trim: '#c8302a', glove: '#e8b898' } });
    this.judges = [0, 1].map(i => new E.Humanoid({ size: 1.45, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e8c0a0', hair: '#3a3030', cloth: '#f4f4f0', coat: '#2a2a3a', pants: '#4a4a52', boot: '#1a1a20', glove: '#e8c0a0' } }));
    this.x = 200; this.sig = null; this.side = 0; this.t = 0; this.flags = [0, 0, 0]; this.votes = null;
    const base = this.rig.solvePose, self = this; this.rig.solvePose = function () { base.call(this); self._post(this.J); };
    this.judges.forEach((j, i) => { const b = j.solvePose; j.solvePose = function () { b.call(this); self._postJudge(this.J, i); }; });
  }
  signal(sig, side = 0) { if (sig !== this.sig || side !== this.side) { this.sig = sig; this.side = side; this.t = 0; if (sig) game.audio.sfx('flagSnap', { vol: .5 }); } }
  // the referee faces the camera; +r is his right (screen left in side view), so the white side (left) is +r
  _post(J) {
    const k = clamp(this.t / .2, 0, 1), s = this.side ? -1 : 1, sh = [J.shR, J.shL];
    const arm = (h, e, to) => { const S = h === 'R' ? J.shR : J.shL; J['elbow' + h] = [lerp(J['elbow' + h][0], (S[0] + to[0]) / 2, k), lerp(J['elbow' + h][1], (S[1] + to[1]) / 2, k), lerp(J['elbow' + h][2], (S[2] + to[2]) / 2, k)]; J['hand' + h] = [lerp(J['hand' + h][0], to[0], k), lerp(J['hand' + h][1], to[1], k), lerp(J['hand' + h][2], to[2], k)]; };
    const sideArm = s > 0 ? 'R' : 'L', S0 = s > 0 ? J.shR : J.shL;
    switch (this.sig) {
      case 'hajime': { const d = clamp(this.t / .35, 0, 1); arm('R', 0, [3, J.shR[1] + 1, J.shR[2] + 6 - 14 * d]); arm('L', 0, [3, J.shL[1] - 1, J.shL[2] + 6 - 14 * d]); break; }
      case 'yame': arm('R', 0, [6, J.shR[1] - 2, J.shR[2] + 4]); break;
      case 'half': arm(sideArm, 0, [1, S0[1] + s * 8, S0[2] - 5]); break;
      case 'full': case 'winner': arm(sideArm, 0, [1, S0[1] + s * 5, S0[2] + 8]); break;
      case 'aiuchi': { const w = Math.sin(this.t * 14) * .8; arm('R', 0, [5, 1 + w, J.shR[2] - 3]); arm('L', 0, [5, -1 - w, J.shL[2] - 3]); break; }
      case 'hantei': arm('R', 0, [4, J.shR[1] + 3, J.shR[2] + 2]); break;
      case 'bow': rotJ(J, UPPER, J.hipC, .5 * Math.sin(clamp(this.t / .9, 0, 1) * Math.PI)); break;
    }
  }
  _postJudge(J, i) { const up = this.flags[i]; if (up) { const s = up === 1 ? 1 : -1; const h = s > 0 ? 'R' : 'L', S0 = J['sh' + h]; J['elbow' + h] = [S0[0] + 1, S0[1] + s * 2, S0[2] + 3]; J['hand' + h] = [S0[0] + 1, S0[1] + s * 3, S0[2] + 8]; } }
  update(dt, cx) { this.t += dt; this.x = lerp(this.x, cx, Math.min(1, dt * 3)); this.rig.update(dt, { x: this.x, y: 14, z: 0, facing: Math.PI / 2, expr: this.sig === 'yame' || this.sig === 'full' ? 'shout' : null }); this.judges.forEach((j, i) => j.update(dt, { x: i ? 384 : 16, y: 34, z: 0, facing: Math.PI / 2, pose: this.flags[i] ? null : 'hips' })); }
  draw(r) {
    r.shadow(this.x, 14, 9, .35);
    r.actor(this.x, 14, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this.rig });
    this.judges.forEach((j, i) => {
      const x = i ? 384 : 16; r.shadow(x, 34, 7, .3);
      r.actor(x, 34, 0, (g, ox, oy) => {
        j.draw(g, ox, oy, r.view);
        // two flags: red in the right hand, white in the left (the raised one waves)
        for (const [h, c] of [['R', '#e83a2a'], ['L', '#f8f8f0']]) {
          const hp = j.worldOffset(j.J['hand' + h]), a = r.w(x + hp[0], 34 + hp[1], hp[2]), b = r.w(x, 34, 0), sx = Math.round(ox + a[0] - b[0]), sy = Math.round(oy + a[1] - b[1]);
          const raised = this.flags[i] === (h === 'R' ? 1 : 2), wav = Math.round(Math.sin(this.t * 12 + i) * (raised ? 2 : 0));
          px.rect(g, sx, sy - 9, 1, 10, '#8a6a40'); px.rect(g, sx + 1, sy - 9 + wav * 0, 6, 4 + (wav > 0 ? 1 : 0), c); px.rect(g, sx + 1, sy - 5, 6, 1, E.shade(c, -.25));
        }
      }, { key: j });
    });
  }
  head() { const h = this.rig.worldOffset(this.rig.J.head); return [this.x + h[0], 14 + h[1], h[2]]; }
}
KC.Referee = Referee;

class Bout {
  /** o: { fighters: [white, red], ctrl: [fn(f, foe) -> intent, ...], mode, roundsToWin, pointsToWin, clock, seed, intro, spar, names } */
  constructor(o) {
    this.o = o; this.f = o.fighters; this.ctrl = o.ctrl || [null, null]; this.ref = o.spar ? null : new Referee(); this.arena = [0, 400]; this.marks = o.marks || [150, 250];
    this.ev = {}; this.rng = U.rng(o.seed || 1); this.phase = o.spar ? 'spar' : o.intro === false ? 'card' : 'intro'; this.pt = 0; this.round = 1; this.points = [0, 0]; this.roundWins = [0, 0];
    this.clock = this.clockMax(); this.call = null; this.calls = []; this.stopT = 0; this.pending = null; this.lastPoint = null; this.winner = -1; this.matchWinner = -1;
    this.conceded = [0, 0]; this.roundStats = [this.blankStats(), this.blankStats()]; this.fightT = 0; this.lastScorer = -1; this.popups = []; this.slow = 0; this.steps = 0; this.time = 0;
    if (this.phase === 'intro') { this.f[0].reset(-20); this.f[1].reset(420); this.f[0].toMark(this.marks[0]); this.f[1].toMark(this.marks[1]); }
    else { this.f[0].reset(this.marks[0]); this.f[1].reset(this.marks[1]); }
    this.f.forEach((f, i) => { f.face = i ? -1 : 1; f.bout = this; });
    this.enterPhase(this.phase);
  }
  blankStats() { return { techPts: 0, attempts: 0, blocks: 0 }; }
  get roundsToWin() { return this.o.roundsToWin || TUNE.roundsToWin; }
  get pointsToWin() { return this.o.pointsToWin || TUNE.pointsToWin; }
  clockMax() { return this.o.clock || TUNE.clock; }
  on(e, fn) { (this.ev[e] = this.ev[e] || []).push(fn); return this; }
  emit(e, d) { for (const fn of this.ev[e] || []) try { fn(d, this); } catch (err) { game.fail('bout ' + e, err); } }
  pace(k) { return k * TUNE.refPace; }
  say(id, side, o = {}) {
    const text = id === 'raw' ? o.text : KC.calls(id); this.call = { id, text, t: 0, side };
    const dur = KC.Voice.speak(text, 'genkotsu', { call: id, reverb: this.o.stage === 'stadium' });
    this.calls.push(id); if (this.calls.length > 60) this.calls.shift(); this.emit('call', { id, text, side }); return dur;
  }
  enterPhase(p) {
    this.phase = p; this.pt = 0; const F = this.f, R = this.ref; this.emit('phase', p);
    if (p === 'intro') { R && R.signal(null); }
    if (p === 'rei') { F.forEach(f => f.setPose('bow')); R && R.signal('bow'); this.say('bow'); }
    if (p === 'card') { F.forEach((f, i) => { if (f.st !== 'auto') f.toMark(this.marks[i]); }); game.audio.sfx('gong'); this.cardText = this.isDeciding() ? KC.calls('decide') : 'ROUND ' + this.round; if (this.isDeciding()) this.say('decide'); R && R.signal(null); }
    if (p === 'ready') { F.forEach((f, i) => { f.reset(this.marks[i]); f.face = i ? -1 : 1; f.setPose('yoi'); }); R && R.signal(null); if (this.mp()) this.say('matchPoint'); }
    if (p === 'hajime') { R && R.signal('hajime'); this.say('begin'); }
    if (p === 'fight') { F.forEach(f => { f.st = 'idle'; f.poseName = null; f.frozen = false; }); this.fightT = 0; }
    if (p === 'yame') { R && R.signal('yame'); this.say('stop'); F.forEach(f => { f.frozen = true; }); }
    if (p === 'award') {
      const lp = this.lastPoint; if (!lp) return;
      if (lp.aiuchi) { R && R.signal('aiuchi'); this.say('aiuchi'); }
      else { R && R.signal(lp.full ? 'full' : 'half', lp.side); const d = this.say(lp.side ? 'red' : 'white', lp.side); this.later = { t: Math.min(.5, d), fn: () => { if (this.phase === 'award') this.say(lp.full ? 'full' : 'half', lp.side); } }; }
    }
    if (p === 'reset') { F.forEach((f, i) => f.toMark(this.marks[i])); R && R.signal(null); }
    if (p === 'time') { F.forEach(f => { f.frozen = true; }); R && R.signal('yame'); this.say('time'); }
    if (p === 'hantei') { R && R.signal('hantei'); this.say('judges'); game.audio.sfx('whistle'); this.votes = this.judge(); R && (R.flags = [0, 0, 0]); }
    if (p === 'roundEnd') {
      const w = this.winner; this.roundWins[w]++;
      F[w].setPose('win'); F[1 - w].setPose('lose'); R && R.signal('winner', w); this.say(w ? 'redWins' : 'whiteWins', w);
      const bonus = Math.max(0, Math.floor(this.clock)) * 100; this.emit('roundEnd', { winner: w, round: this.round, bonus, points: this.points.slice() });
    }
    if (p === 'matchEnd') { F.forEach((f, i) => f.toMark(this.marks[i])); R && R.signal(null); }
    if (p === 'over') { this.emit('matchEnd', { winner: this.matchWinner, roundWins: this.roundWins.slice(), perfect: this.conceded[this.matchWinner] === 0, stats: this.f.map(f => f.stats) }); }
  }
  isDeciding() { return this.roundsToWin > 1 && this.roundWins[0] === this.roundsToWin - 1 && this.roundWins[1] === this.roundsToWin - 1; }
  mp() { return this.points.some(p => p >= this.pointsToWin - .5) && this.pointsToWin > .5; }
  judge() {
    const sc = [0, 1].map(i => this.roundStats[i].techPts + 60 * this.roundStats[i].attempts + 40 * this.roundStats[i].blocks);
    const votes = [0, 1, 2].map(() => { const a = sc[0] + (this.rng() * 240 - 120), b = sc[1] + (this.rng() * 240 - 120); return a > b ? 0 : b > a ? 1 : this.lastScorer >= 0 ? this.lastScorer : 0; });
    return votes;
  }
  intent(i) { const c = this.ctrl[i]; if (!c) return KC.NEUTRAL; try { return c(this.f[i], this.f[1 - i], this) || KC.NEUTRAL; } catch (e) { game.fail('controller', e); return KC.NEUTRAL; } }
  canControl() { return this.phase === 'fight' || this.phase === 'spar' || (this.phase === 'hajime' && this.pt >= this.pace(.35)); }
  update(dt) {
    if (this.puppet) { this.presentUpdate(dt); return; }
    this.time += dt; this.pt += dt; this.steps++; this.dt = dt; const F = this.f;
    if (this.call) this.call.t += dt;
    if (this.later) { this.later.t -= dt; if (this.later.t <= 0) { const f = this.later.fn; this.later = null; f(); } }
    if (this.slow > 0) { this.slow -= dt; }
    if (this.stopT > 0) { this.stopT -= dt; this.presentUpdate(dt); return; }   // the bout's own hit-stop (never game.freeze: it would stall networking)
    if (this.director) this.director(this, dt);
    const ctl = this.canControl();
    if (ctl && this.phase === 'hajime') { this.enterPhase('fight'); }
    const ints = [0, 1].map(i => ctl ? this.intent(i) : KC.NEUTRAL);
    if (ctl) { if (DEV.freezeCpu && this.o.cpu) this.o.cpu.forEach((c, i) => { if (c) ints[i] = KC.NEUTRAL; }); F.forEach((f, i) => f.control(ints[i], F[1 - i], dt)); }
    F.forEach((f, i) => f.step(dt, F[1 - i], this.arena));
    this.push();
    if (this.phase === 'fight' || this.phase === 'spar') this.detect();
    if (this.pending) { if (--this.pending.steps <= 0) this.resolve(); }
    this.phaseUpdate(dt);
    this.presentUpdate(dt);
  }
  presentUpdate(dt) { const F = this.f; F.forEach(f => f.update(dt)); if (this.ref) this.ref.update(dt, (F[0].x + F[1].x) / 2); for (const p of this.popups) p.t += dt; this.popups = this.popups.filter(p => p.t < 1.6); }
  push() {
    const [a, b] = this.f; if (a.z > 8 || b.z > 8 || a.st === 'auto' || b.st === 'auto') return;   // (walking back to the marks they pass each other)
    const need = (a.w + b.w) / 2, d = b.x - a.x, ad = Math.abs(d);
    if (ad < need) {
      const s = Math.sign(d) || (a.face > 0 ? 1 : -1), over = need - ad; let da = -s * over / 2, db = s * over / 2;
      const lo = this.arena[0], hi = this.arena[1];
      if (a.x + da < lo + a.w / 2 || a.x + da > hi - a.w / 2) { db += da - clamp(a.x + da, lo + a.w / 2, hi - a.w / 2) + a.x; da = clamp(a.x + da, lo + a.w / 2, hi - a.w / 2) - a.x; }
      if (b.x + db < lo + b.w / 2 || b.x + db > hi - b.w / 2) { da -= (b.x + db) - clamp(b.x + db, lo + b.w / 2, hi - b.w / 2); db = clamp(b.x + db, lo + b.w / 2, hi - b.w / 2) - b.x; }
      a.x += da; b.x += db;
    }
  }
  /** can a's active technique hit b now? null | { block } | { hit info } */
  check(a, b) {
    const t = a.T; if (!t || !t.pts || a.ph !== 'a' || a.hitDone) return null;
    if (!b.hittable() || (DEV.invincible && b.side === 0 && this.o.cpu && this.o.cpu[a.side])) return null;
    const dir = Math.sign(b.x - a.x) || a.techFace; if (dir !== a.techFace) return null;   // the foe is behind (crossed over)
    const gap = a.gapTo(b), [mn, mx] = a.reach(t); if (gap > mx) return null;
    const air = b.isAir(), low = !air && b.isLow(), h = t.height;
    if (t.air && !a.air) return null;
    if (air) { if (!(h === 'high' || h === 'air' || h === 'rising')) return null; if (b.T && b.T.kind === 'flip' && !(h === 'high' || h === 'rising')) return null; }
    else if (low) { if (h === 'high' || h === 'mid' || h === 'rising') return null; }
    // a block in its guard frames stops high, mid and air techniques from the front
    if (b.st === 'tech' && b.tech === 'block' && b.ph === 'a' && h !== 'low' && Math.sign(a.x - b.x) === b.face) return { block: true, gap };
    const S = a.S, A = a.A, frac = A > 1 ? (a.k - S) / (A - 1) : 0;
    const tq = frac <= .4 ? 1 : lerp(1, .3, (frac - .4) / .6), top = mx - .3 * (mx - mn), sq = gap >= top ? 1 : clamp((gap - mn) / Math.max(1, top - mn), 0, 1);
    let q = .5 * tq + .5 * sq; if (a.R.signature === t.id) q += .1; if (t.id === 'upperPunch' && air) q += .25; q = clamp(q, 0, 1);
    const [lo, hi] = t.pts; let pts = clamp(lo + Math.round((hi - lo) * q / 100) * 100, lo, hi);
    const counter = (b.st === 'tech' && b.T && (b.T.pts || b.blocked)) || b.recoil > 0 || (Math.sign(a.x - b.x) !== b.face && b.st === 'tech');
    if (counter) pts = Math.min(1000, Math.round(pts * TUNE.counterMul / 100) * 100);
    return { pts, full: pts >= TUNE.fullAt, counter, q, tq, sq, gap, tech: t.id, sweep: !!t.knock, air };
  }
  detect() {
    const F = this.f;
    for (let i = 0; i < 2; i++) {
      const a = F[i], b = F[1 - i], res = this.check(a, b); if (!res) continue;
      a.hitDone = true;
      if (res.block) { this.blockHit(a, b); continue; }
      res.side = i; this.lastHit = res;
      if (this.phase === 'spar') { this.sparHit(res); continue; }
      if (this.pending && this.pending.side !== i) { this.pending.aiuchi = true; continue; }
      if (!this.pending) { this.pending = { side: i, res, steps: 6 }; F.forEach(f => { if (f !== a) f.frozen = false; }); }
    }
    if (this.phase === 'fight' && !this.pending) {
      if (!DEV.infTime) this.clock -= this.dt || 1 / 120;
      this.fightT += 1 / 120;
      if (this.clock <= 0) { this.clock = 0; this.timeUp(); }
      if (!DEV.infTime && this.fightT > this.clockMax() + 5) { this.fightT = 0; throw new Error('bout soft-lock: fight phase too long'); }
    }
    // a whiff: an active technique ended with no contact
    for (const f of F) if (f.st === 'tech' && f.T && f.T.pts && f.ph === 'r' && !f.hitDone && !f._whiffed) { f._whiffed = true; this.emit('whiff', { side: f.side, tech: f.tech }); }
    for (const f of F) if (f.ph === 's') f._whiffed = false;
  }
  blockHit(a, b) {
    a.blocked = true; a.extraR += U.steps(10); a.x -= a.techFace * 14; b.blockH = a.T.height === 'high' || a.T.height === 'air' ? 'high' : 'mid';
    b.k = Math.max(b.k, b.S + b.A - U.steps(6)); this.roundStats[b.side].blocks++; b.stats.blocks++;
    const hx = (a.x + b.x) / 2, hz = a.T.height === 'high' || a.T.height === 'air' ? 48 : 32;
    game.particles.sparks(hx, 0, hz, 10, a.techFace > 0 ? Math.PI : 0); game.particles.glints(hx, 0, hz, 6, '#7ab8ff');
    game.audio.sfx('clack'); this.stopT = .05; KC.Voice.crowd(.4, 'ooh'); this.emit('block', { side: b.side, by: a.side, tech: a.tech });
  }
  sparHit(res) {
    const a = this.f[res.side], b = this.f[1 - res.side]; this.lastPoint = res; a.stats[res.full ? 'full' : 'half']++;
    this.hitFx(res); b.hurt(res.side ? -1 : 1, false, false); this.emit('point', Object.assign({ spar: true }, res));
    this.popups.push({ t: 0, x: b.x, z: 60, text: (game.settings.techNames ? KC.TECH[res.tech].short || KC.TECH[res.tech].name : '') + ' ' + res.pts, full: res.full });
    game.after(.5, () => { if (b.st === 'hurt') b.st = 'idle'; });
  }
  hitFx(res) {
    const a = this.f[res.side], b = this.f[1 - res.side], hx = b.x - a.techFace * b.w / 3, hz = res.tech === 'lowKick' || KC.TECH[res.tech].knock ? 12 : KC.TECH[res.tech].height === 'high' ? 50 : 36;
    game.particles.impact(hx, 0, hz, res.full ? 1.4 : .9, res.full ? '#ffe070' : '#ffffff');
    game.particles.sparks(hx, 0, hz, res.full ? 14 : 8, a.techFace > 0 ? 0 : Math.PI); game.particles.dust(b.x, 0, 2, 6);
    game.shake(res.full ? 4 : 2); if (res.full) game.flash('#ffffff', .08);
    game.audio.sfx(res.full ? 'thwackFull' : 'thwackHalf'); for (const p of game.players) p.rumble(res.full ? .8 : .4, res.full ? .25 : .12);
    this.stopT = TUNE.hitstop;
  }
  resolve() {
    const P = this.pending; this.pending = null; const F = this.f;
    if (P.aiuchi) { this.lastPoint = { aiuchi: true }; F.forEach(f => { f.frozen = true; }); game.audio.sfx('clack'); this.stopT = TUNE.hitstop; this.emit('aiuchi', {}); this.enterPhase('yame'); return; }
    const r = P.res, a = F[r.side], b = F[1 - r.side];
    this.points[r.side] = Math.min(this.pointsToWin, this.points[r.side] + (r.full ? 1 : .5)); this.conceded[1 - r.side] += r.full ? 1 : .5; this.lastScorer = r.side;
    this.roundStats[r.side].techPts += r.pts; a.stats[r.full ? 'full' : 'half']++; if (r.pts > a.stats.bestPts) { a.stats.bestPts = r.pts; a.stats.best = r.tech; }
    this.lastPoint = Object.assign({ side: r.side }, r);
    this.hitFx(r); b.hurt(r.side ? -1 : 1, r.full, r.sweep); a.kime = true; a.frozen = true; b.frozen = true;
    if (r.full && !game.reduceMotion && !this.o.online) this.slow = .35;
    KC.Voice.crowd(r.full ? 1 : .55, 'cheer');
    this.popups.push({ t: 0, x: b.x, z: 66, text: (game.settings.techNames ? (KC.TECH[r.tech].short || KC.TECH[r.tech].name) + ' • ' : '') + r.pts + (r.counter ? ' COUNTER!' : ''), full: r.full });
    this.emit('point', Object.assign({}, this.lastPoint));
    this.enterPhase('yame');
  }
  timeUp() { this.enterPhase('time'); }
  phaseUpdate(dt) {
    const p = this.phase, t = this.pt, F = this.f, pc = k => this.pace(k);
    if (p === 'intro' && t >= pc(PH_T.intro) && (F.every(f => f.st !== 'auto') || t >= pc(PH_T.intro) + 3)) this.enterPhase('rei');
    else if (p === 'rei' && t >= pc(PH_T.rei)) this.enterPhase('card');
    else if (p === 'card' && t >= pc(PH_T.card) && (F.every(f => f.st !== 'auto') || t >= pc(PH_T.card) + 2.5)) this.enterPhase('ready');
    else if (p === 'ready' && t >= pc(PH_T.ready)) this.enterPhase('hajime');
    else if (p === 'yame' && t >= pc(PH_T.yame)) this.enterPhase('award');
    else if (p === 'award' && (t >= pc(PH_T.award) || (t >= pc(.6) && this.skip))) {
      this.skip = false;
      if (this.points[0] >= this.pointsToWin || this.points[1] >= this.pointsToWin) { this.winner = this.points[0] >= this.pointsToWin ? 0 : 1; this.enterPhase('roundEnd'); }
      else this.enterPhase('reset');
    }
    else if (p === 'reset' && (F.every(f => f.st !== 'auto') || t >= pc(PH_T.reset) + 2)) { F.forEach((f, i) => f.reset(this.marks[i])); this.enterPhase('ready'); }
    else if (p === 'time' && t >= pc(PH_T.time)) { if (this.points[0] !== this.points[1]) { this.winner = this.points[0] > this.points[1] ? 0 : 1; this.enterPhase('roundEnd'); } else this.enterPhase('hantei'); }
    else if (p === 'hantei') {
      const R = this.ref, n = Math.min(3, Math.floor(t / pc(.5)));
      if (R) for (let i = 0; i < n; i++) if (i < 2 && !R.flags[i]) { R.flags[i] = this.votes[i] ? 1 : 2; game.audio.sfx('flagSnap'); } else if (i === 2 && R.sig !== 'winner') { R.signal('full', this.votes[2]); }
      if (t >= pc(PH_T.hantei)) { const w = this.votes.filter(v => v === 1).length >= 2 ? 1 : 0; this.winner = w; if (R) R.flags = [0, 0, 0]; this.emit('hantei', { votes: this.votes.slice(), winner: w }); this.enterPhase('roundEnd'); }
    }
    else if (p === 'roundEnd' && t >= pc(PH_T.roundEnd)) {
      if (this.roundWins[this.winner] >= this.roundsToWin) { this.matchWinner = this.winner; this.enterPhase('matchEnd'); }
      else { this.round++; this.points = [0, 0]; this.clock = this.clockMax(); this.roundStats = [this.blankStats(), this.blankStats()]; this.enterPhase('card'); }
    }
    else if (p === 'matchEnd') {
      if (this.pt > pc(.9) && !this._bowed && (F.every(f => f.st !== 'auto') || this.pt > pc(3.5))) { this._bowed = true; F.forEach(f => f.setPose('bow')); this.say('bow'); if (this.ref) this.ref.signal('bow'); }
      if (this._bowed && this.pt > pc(1.9) && this.ref && this.ref.sig !== 'winner') { this.ref.signal('winner', this.matchWinner); F[this.matchWinner].setPose('win'); }
      if (t >= pc(PH_T.matchEnd) + (this._bowed ? 0 : 1)) this.enterPhase('over');
    }
  }
  // the dev panel's actions
  forceRound(side) { if (!['fight', 'ready', 'hajime'].includes(this.phase)) return; this.points[side] = this.pointsToWin; this.winner = side; this.f.forEach(f => { f.frozen = true; }); this.enterPhase('roundEnd'); }
  forceMatch(side) { this.roundWins[side] = this.roundsToWin - 1; this.forceRound(side); }
  /** the state a guest needs */
  snapshot() { return { ph: PHASES.indexOf(this.phase), pt: Math.round(this.pt * 100) / 100, c: Math.round(this.clock * 10) / 10, sc: this.points.slice(), rw: this.roundWins.slice(), rd: this.round, w: this.winner, f: this.f.map(f => f.snap()), sig: this.ref ? [this.ref.sig || '', this.ref.side, this.ref.flags.slice()] : null, card: this.cardText }; }
  applySnapshot(s) {
    const was = this.phase; this.phase = PHASES[s.ph] || 'fight'; if (was !== this.phase) this.pt = 0; this.clock = s.c; this.points = s.sc; this.roundWins = s.rw; this.round = s.rd; this.winner = s.w; this.cardText = s.card;
    s.f.forEach((a, i) => this.f[i].apply(a)); if (this.ref && s.sig) { if (s.sig[0] !== (this.ref.sig || '') || s.sig[1] !== this.ref.side) this.ref.signal(s.sig[0] || null, s.sig[1]); this.ref.flags = s.sig[2]; }
  }
  draw(r) { if (this.ref) this.ref.draw(r); this.f.forEach(f => f.draw(r)); }
}
KC.Bout = Bout;

/* ---- THE FIGHT HUD ---- */
KC.HUD = {
  draw(r, B, o = {}) {
    r.overlay(g => {
      const W = r.W, H = r.H, F = B.f, ca = game.cornerArea && game.cornerArea(), topY = 4;
      if (!B.ref) return;
      // clock
      const cs = String(Math.ceil(Math.max(0, B.clock))); box(g, W / 2 - 18, topY, 36, 22, { alpha: .8 });
      KC.title(g, DEV.infTime ? '--' : cs, W / 2, topY + 4, 2, B.clock <= 5 && B.phase === 'fight' ? ['#ffffff', '#ff8060', '#c02020'] : TITLE_COLS);
      // the sides: name, belt or tag, point slots, round pips
      F.forEach((f, i) => {
        const left = i === 0, x = left ? 8 : W - 8 - (ca && !left ? 0 : 0), al = left ? 1 : -1, nm = (o.names && o.names[i]) || f.name, sideC = left ? '#fff6e8' : '#ff5a4a';
        const nx = left ? x : x - TW(nm, BIG);
        T(g, nm, nx, topY + (ca && !left ? 30 : 2), sideC, BIG);
        const y2 = topY + (ca && !left ? 30 : 2) + 18;
        T(g, left ? 'WHITE' : 'RED', left ? x : x - TW(left ? 'WHITE' : 'RED'), y2, sideC);
        // point slots: a half point half-fills a circle (shape, not just colour)
        const n = Math.min(5, Math.ceil(B.pointsToWin));
        for (let k = 0; k < n; k++) {
          const cx = left ? x + 48 + k * 16 : x - 48 - k * 16, cy = y2 + 3, v = clamp(B.points[i] - k, 0, 1);
          px.disc(g, cx, cy, 6, '#1a1424'); px.disc(g, cx, cy, 5, '#3a3248');
          if (v >= 1) px.disc(g, cx, cy, 5, '#ffd060'); else if (v >= .5) { px.disc(g, cx, cy, 5, '#ffd060'); px.rect(g, left ? cx : cx - 5, cy - 5, 6, 11, '#3a3248'); px.rect(g, cx, cy - 5, 1, 11, '#1a1424'); }
        }
        for (let k = 0; k < B.roundsToWin; k++) { const rx = left ? x + k * 9 : x - 6 - k * 9; px.rect(g, rx, y2 + 12, 6, 6, '#1a1424'); px.rect(g, rx + 1, y2 + 13, 4, 4, k < B.roundWins[i] ? sideC : '#3a3248'); }
        // the belt colour (story) under the name
        px.rect(g, left ? x + 36 + 46 : x - 36 - 46 - 10, y2 + 13, 10, 3, BELT[f.belt] || '#fff');
      });
      // scores
      if (o.score !== undefined) { T(g, '1P ' + U.pad(o.score, 7), 8, H - 12, '#fff6e8'); T(g, 'HI ' + U.pad(Math.max(o.hi || 0, o.score), 7), W - 8 - TW('HI 0000000'), H - 12, '#ffd060'); }
      // the referee's call
      if (B.call && B.call.t < 1.4) { const c = B.call, sc = c.text.length > 12 ? 2 : 3, y = H * .32 - (c.t < .1 ? (1 - c.t / .1) * 8 : 0); KC.title(g, c.text, W / 2, y, sc, c.side === 1 && (c.id === 'red' || c.id === 'redWins') ? ['#ffe0d8', '#ff7060', '#c02020'] : ['#fff6d0', '#ffd060', '#e8782a']); }
      if (B.phase === 'card' && B.cardText) KC.title(g, B.cardText, W / 2, H * .45, 3);
      // popups over the scorer
      for (const p of B.popups) { const s = r.w(p.x, 0, p.z + p.t * 14); T(g, p.text, s[0] - TW(p.text) / 2, s[1] - 10, p.full ? '#ffe070' : '#ffffff', { outline: '#000' }); }
      if (KC.tuneChanged() || DEV.enabled && KC.Dev.badge) { box(g, W / 2 - 14, topY + 26, 28, 12, { bg: ['#5a1a1a', '#3a0a0a'], border: '#ff8a6a' }); T(g, 'DEV', W / 2 - 8, topY + 28, '#ffd0c0'); }
      if (o.hint) { const ta = game.input.touchArea && game.input.touchArea(), y = ta ? ta.y0 - 14 : H - 30; box(g, 8, y - 3, W - 16, 13, { alpha: .7 }); T(g, o.hint, W / 2 - TW(o.hint) / 2, y, '#e8f0ff'); }
      if (game.settings.inputDisplay || DEV.inputs) KC.HUD.inputs(g, F[0], 8, H - 60);
      if (DEV.frames && B.f[0].lastTech) KC.HUD.frames(g, B, W - 150, H - 60);
    });
  },
  inputs(g, f, x, y) {
    const h = (f._inLog || []).slice(-12);
    h.forEach((e, i) => { const yy = y - i * 13 + 40; KC.glyph(g, x, yy - 120 + 80, 'L:' + e.p, 10); KC.glyph(g, x + 20, yy - 40, 'R:' + e.r, 10); });
  },
  frames(g, B, x, y) {
    const f = B.f[0], t = KC.TECH[f.lastTech]; if (!t || !t.f) return; box(g, x, y, 142, 44, { alpha: .8 });
    T(g, t.short || t.name, x + 4, y + 3, '#ffd060'); T(g, 'S ' + f.steps(0, t) + '  A ' + f.steps(1, t) + '  R ' + f.steps(2, t) + ' (STEPS)', x + 4, y + 13, '#fff');
    const h = B.lastHit; if (h && !h.block) T(g, 'Q ' + h.q.toFixed(2) + ' T' + h.tq.toFixed(2) + ' S' + h.sq.toFixed(2) + (h.counter ? ' X2' : ''), x + 4, y + 23, '#a8e8ff');
    if (h && h.gap !== undefined) T(g, 'GAP ' + h.gap.toFixed(1) + '  ' + h.pts + (h.full ? ' FULL' : ' HALF'), x + 4, y + 33, '#a8e8ff');
  }
};

// ---- 33-ai.js ----
/* ---- CPU AI (KC.KarateAI): the same intents a human makes, so it obeys the same rules. Perception with a reaction
 * delay, a decision tick, personalities and levels, a habit tracker, and a showcase mode (the attract mode). All its
 * randomness is its own seeded stream: the same seed and inputs give the same match. */
class KarateAI {
  constructor(o = {}) {
    this.id = o.id || 'taro'; this.P = Object.assign({}, KC.ROSTER[this.id].ai, o.ai || {}); this.rng = U.rng(o.seed || 7); this.showcase = !!o.showcase;
    this.setLevel(o.level || this.P.level); this.obs = []; this.plan = null; this.nextT = 0; this.t = 0; this.habit = {}; this.thought = ''; this.showI = o.showI || 0; this.cheat = !!o.cheat;
  }
  setLevel(L) {
    L = clamp(Math.round(L), 1, 10); this.level = L; const k = (L - 1) / 9;
    this.react = lerp(.55, .12, k) * TUNE.cpuReact; this.think = lerp(.5, .14, k); this.readP = clamp(lerp(.25, .92, k) + (this.P.readBonus || 0), 0, .98); this.mistake = lerp(.3, .02, k);
    if (this.showcase) { this.react = .1; this.readP = 1; this.mistake = 0; this.think = .25; }
  }
  aggression() { return TUNE.cpuAggression >= 0 ? TUNE.cpuAggression : clamp(this.P.aggression * (.7 + this.level * .05), 0, 1); }
  observe(f, foe) {
    this.obs.push({ t: this.t, tech: foe.st === 'tech' ? foe.tech : null, ph: foe.ph, air: foe.isAir(), low: foe.isLow(), down: foe.st === 'down', gap: f.gapTo(foe), recov: foe.st === 'tech' && foe.ph === 'r' && foe.T && !!foe.T.pts, k: foe.k, x: foe.x, vz: foe.vz });
    while (this.obs.length > 2 && this.obs[1].t <= this.t - this.react) this.obs.shift();
    if (foe.st === 'tech' && foe.k === 1 && foe.T && foe.T.pts) this.habit[foe.tech] = (this.habit[foe.tech] || 0) + 1;
  }
  seen() { return this.obs[0]; }
  /** the controller: (fighter, foe, bout) -> intent */
  control(f, foe, bout) {
    const dt = 1 / 120; this.t += dt; this.observe(f, foe);
    const toward = Math.sign(foe.x - f.x) || f.face, scr = d => d === 't' ? (toward > 0 ? 'r' : 'l') : d === 'a' ? (toward > 0 ? 'l' : 'r') : d;
    // reading a technique as it starts (the arcade CPU read its foe's stick at once): a level-scaled chance, once each
    if (foe.st === 'tech' && foe.k <= 2 && foe.T && foe.T.pts && this.lastSeen !== foe.history.length) { this.lastSeen = foe.history.length; if (this.rng() < this.readP * .85 && (f.free() || f.st === 'walk')) this.reactTo(f, foe); }
    const P = this.plan;
    if (P && P.kind === 'delay') { if (this.t >= P.until) { this.plan = P.then; return this.control(f, foe, bout); } return { posture: 'n', press: null }; }
    if (P && P.kind === 'tech') { this.plan = null; const t = KC.TECH[P.id]; return { posture: scr(t.L), press: scr(t.R) }; }
    if (P && P.until > this.t) {
      if (P.kind === 'walk') { const g = f.gapTo(foe); if ((P.dir === 't' && g < (P.stopGap || 0)) || (P.dir === 'a' && g > 120)) { this.plan = null; return KC.NEUTRAL; } return { posture: scr(P.dir), press: null }; }
      if (P.kind === 'hold') return { posture: scr(P.posture), press: null };
    } else if (P) this.plan = null;
    const nearlyFree = f.st === 'tech' && f.ph === 'r' && f.T && !f.T.air && !f.T.kind && f.S + f.A + f.Rr - f.k <= 16;   // (a press in the last 16 steps of recovery is buffered)
    if (!f.free() && !nearlyFree) return { posture: f.posture === 'd' ? 'd' : 'n', press: null };
    if (this.t < this.nextT) return { posture: f.st === 'crouch' && this.rng() < .95 ? 'd' : 'n', press: null };
    this.nextT = this.t + this.think * (.75 + this.rng() * .5);
    this.decide(f, foe, bout);
    return this.plan && this.plan.kind === 'tech' ? this.control(f, foe, bout) : this.plan ? { posture: scr(this.plan.dir || this.plan.posture), press: null } : KC.NEUTRAL;
  }
  reactTo(f, foe) {
    const t = foe.T, h = t.height, gap = f.gapTo(foe), rnd = () => this.rng(), near = gap < KC.ROSTER[foe.id].stats.reach * t.reach[1] * TUNE.reachScale + (t.travel || 0) + (t.air ? t.air.vx * .45 : 0) + 6;
    if (!near) return;
    if (h === 'low') { this.plan = { kind: 'tech', id: rnd() < .6 ? 'jump' : 'frontFlip' }; this.thought = 'JUMP THE LOW'; }
    else if (h === 'high') { this.plan = rnd() < .45 && this.inRange(f, 'squatPunch', gap) ? { kind: 'tech', id: 'squatPunch' } : { kind: 'hold', posture: 'd', until: this.t + .45 }; this.thought = 'DUCK THE HIGH'; }
    else if (h === 'rising') { this.plan = { kind: 'walk', dir: 'a', until: this.t + .3 }; this.thought = 'STEP BACK'; }
    else if (rnd() < Math.max(this.P.block, .35) || gap < 30) { const wait = Math.max(0, foe.S - foe.k - U.steps(t.air ? 4 : 6)) / 120; this.plan = wait > 0 ? { kind: 'delay', until: this.t + wait, then: { kind: 'tech', id: 'block' } } : { kind: 'tech', id: 'block' }; this.thought = 'BLOCK'; }
    else { this.plan = { kind: 'tech', id: 'backFlip' }; this.thought = 'EVADE'; }
    this.nextT = this.t + .3;
  }
  inRange(f, id, gap) { const t = KC.TECH[id]; if (!t.pts) return false; const [mn, mx] = f.reach(t), trav = t.travel || 0, air = t.air ? t.air.vx * .25 : 0; return gap <= mx + trav + air && gap >= mn - 6; }
  pickWeighted(f, gap, weights) {
    const opts = Object.keys(weights).filter(id => this.inRange(f, id, gap) || (KC.TECH[id] && !KC.TECH[id].pts)); if (!opts.length) return null;
    let sum = 0; for (const id of opts) sum += weights[id]; let r = this.rng() * sum; for (const id of opts) { r -= weights[id]; if (r <= 0) return id; } return opts[0];
  }
  decide(f, foe, bout) {
    const o = this.seen(), gap = f.gapTo(foe), rnd = () => this.rng();
    if (!o) return;
    if (this.showcase) return this.showcaseDecide(f, foe, gap, o);
    // 4. mistakes
    if (rnd() < this.mistake * .5) { const ids = Object.keys(this.P.weights); this.plan = { kind: 'tech', id: ids[Math.floor(rnd() * ids.length)] }; this.thought = 'MISTAKE'; return; }
    // 1. punish a foe in recovery
    if (o.recov && f.free()) {
      const opts = KC.SCORING.filter(id => this.inRange(f, id, gap) && !KC.TECH[id].air).sort((a, b) => KC.TECH[b].pts[1] - KC.TECH[a].pts[1]).slice(0, 4), best = opts[Math.floor(rnd() * opts.length)];
      if (best && rnd() < this.readP) { this.plan = { kind: 'tech', id: best }; this.thought = 'PUNISH ' + best; return; }
    }
    if (o.air && Math.abs(o.gap) < 80 && rnd() < this.readP) { if (gap <= 24) { this.plan = { kind: 'tech', id: 'upperPunch' }; this.thought = 'ANTI-AIR'; } else if (gap < 50 && rnd() < .4 + this.P.block) { this.plan = { kind: 'tech', id: 'block' }; this.thought = 'BLOCK THE JUMP'; } else { this.plan = { kind: 'walk', dir: 'a', until: this.t + .25 }; this.thought = 'BACK OFF'; } return; }
    // the habit tracker: pre-load the counter to the foe's favourite
    if (this.P.habit && this.level >= 8) {
      const fav = Object.keys(this.habit).sort((a, b) => this.habit[b] - this.habit[a])[0];
      if (fav && this.habit[fav] >= 3 && gap < 60 && rnd() < .25) { const h = KC.TECH[fav].height; this.plan = h === 'low' ? { kind: 'tech', id: 'jump' } : h === 'high' ? { kind: 'hold', posture: 'd', until: this.t + .4 } : { kind: 'tech', id: 'block' }; this.thought = 'READ ' + fav; return; }
    }
    if (this.P.crouch && rnd() < this.P.crouch * .3) { this.plan = { kind: 'hold', posture: 'd', until: this.t + .4 + rnd() * .4 }; this.thought = 'LOW'; return; }
    // 3. proactive: space toward its distance, throw what reaches
    const want = this.P.gap, id = this.pickWeighted(f, gap, this.P.weights);
    if (id && rnd() < this.aggression() * (o.down ? 0 : 1)) { this.plan = { kind: 'tech', id }; this.thought = 'ATTACK ' + id; return; }
    if (rnd() < this.P.jump * .4 && gap > 30 && gap < 90) { this.plan = { kind: 'tech', id: rnd() < .5 ? 'jumpSide' : 'frontFlip' }; this.thought = 'JUMP IN'; return; }
    if (gap > want + 8) { this.plan = { kind: 'walk', dir: 't', until: this.t + .2 + rnd() * .3, stopGap: want - 4 }; this.thought = 'CLOSE IN'; return; }
    if (gap < want - 12 && rnd() < .5 + this.P.patience * .4) { this.plan = { kind: 'walk', dir: 'a', until: this.t + .15 + rnd() * .2 }; this.thought = 'MAKE SPACE'; return; }
    if (rnd() < this.P.patience) { this.plan = { kind: 'walk', dir: rnd() < .5 ? 't' : 'a', until: this.t + .12 }; this.thought = 'FEINT'; return; }
    this.plan = { kind: 'walk', dir: 't', until: this.t + .15, stopGap: 4 }; this.thought = 'PRESS';
  }
  // the attract mode's CPU: every technique in turn, each from its own range; perfect reads
  showcaseDecide(f, foe, gap, o) {
    if (o.tech && o.ph === 's' && KC.TECH[o.tech].pts && this.rng() < .5) { const h = KC.TECH[o.tech].height; this.plan = h === 'low' ? { kind: 'tech', id: 'jump' } : h === 'high' ? { kind: 'hold', posture: 'd', until: this.t + .4 } : { kind: 'tech', id: 'block' }; return; }
    const list = KC.SCORING, id = list[this.showI % list.length], t = KC.TECH[id], [mn, mx] = f.reach(t), trav = t.travel || 0, want = (mn + mx) / 2 + trav * .8 + (t.air ? 30 : 0);
    if (gap > want + 6) { this.plan = { kind: 'walk', dir: 't', until: this.t + .15, stopGap: want }; return; }
    if (gap < want - 14 && gap < mn) { this.plan = { kind: 'walk', dir: 'a', until: this.t + .12 }; return; }
    this.showI++; this.plan = { kind: 'tech', id };
  }
}
KC.KarateAI = KarateAI;
/** a CPU for an opponent in a story or versus match: its personality, level by the opponent, difficulty and tuning */
KC.cpuFor = (id, seed, levelOverride) => {
  let L = levelOverride || KC.ROSTER[id].ai.level, d = KC.diff();
  if (TUNE.cpuLevel > 0) L = TUNE.cpuLevel;
  const ai = new KarateAI({ id, seed, level: d === 'Easy' ? Math.max(1, L - 2) : d === 'Hard' ? Math.min(10, L + 1) : L });
  if (d === 'Easy') ai.react *= 1.25; if (d === 'Hard') ai.react *= .85;
  return ai;
};

// ---- 35-stage.js ----
/* ---- STAGES: painters for the 8 fight stages and 3 bonus locations (backdrop, custom layers, floor, props, crowd,
 * lights, weather). The arena is x 0-400; the world is painted from -160 to 560 so a wide screen never shows emptiness. */
E.SHAPES.toro = { about: 'stone lantern (toro)', tags: 'japan garden', mats: { s: 'granite', f: 'flame' }, lights: [[0, 0, 22, '#ffc070', 50]],
  parts: [['cyl', 's', [0, 0, 0], 5, 3, { seg: 6 }], ['cyl', 's', [0, 0, 3], 2, 12, { seg: 6 }], ['box', 's', [0, 0, 15], [9, 9, 2]], ['box', 'f', [0, 0, 17], [5, 5, 5]], ['cyl', 's', [0, 0, 22], 8, 4, { r2: 1, seg: 4 }]] };
E.SHAPES.torii = { about: 'vermilion torii gate', tags: 'japan shrine', mats: { v: '#d8402a', k: '#1a1416' },
  parts: [['mirror', 'x', ['cyl', 'v', [14, 0, 0], 2.2, 40]], ['box', 'k', [0, 0, 40], [42, 4, 3]], ['box', 'v', [0, 0, 32], [34, 3, 2.5]], ['box', 'k', [0, 0, 43], [46, 5, 2]]] };
E.SHAPES.cinder = { about: 'cinder block', tags: 'dojo', mats: { c: 'stone' }, parts: [['box', 'c', [0, 0, 0], [10, 8, 8]]] };
E.SHAPES.taiko = { about: 'taiko drum on a stand', tags: 'dojo japan', mats: { w: 'walnut', h: 'linen', b: 'gold' },
  parts: [['box', 'w', [0, 0, 0], [16, 6, 6]], ['lathe', 'w', [0, 0, 6], [[0, 0], [7, 0], [8.5, 6], [7, 12], [0, 12]]], ['cyl', 'h', [0, 0, 18], 7, .5]] };
E.SHAPES.cart = E.SHAPES.cart || E.SHAPES.cart;
E.SHAPES.champonBowl = { about: 'a steaming bowl of champon', tags: 'food', mats: { b: '#e8e0d0', s: '#d8a050', r: '#c8302a' }, parts: [['lathe', 'b', [0, 0, 0], [[0, 0], [2, 0], [5, 3], [5.5, 4.5], [0, 4.5]]], ['cyl', 's', [0, 0, 4], 5, .5], ['box', 'r', [0, 0, 4.4], [6, .5, .4]]] };
E.SHAPES.goldenBowl = { about: 'the Golden Bowl trophy on a plinth', tags: 'trophy', mats: { g: 'gold', p: 'marble' },
  parts: [['box', 'p', [0, 0, 0], [12, 12, 10]], ['cyl', 'g', [0, 0, 10], 2, 4], ['lathe', 'g', [0, 0, 14], [[0, 0], [3, 0], [8, 6], [9, 9], [0, 9]]], ['mirror', 'x', ['box', 'g', [9, 0, 19], [2, 1, 4]]]] };
E.SHAPES.noodleCart = { about: "Mei's noodle cart", tags: 'food stall', mats: { w: 'oak', c: '#c8302a', p: 'iron' }, lights: [[-8, 0, 30, '#ffb060', 50]],
  parts: [['box', 'w', [0, 0, 5], [30, 14, 14]], ['mirror', 'x', ['cyl', 'p', [13, 8, 0], 5, 1.5, { sq: .3 }]], ['mirror', 'x', ['box', 'w', [14, 0, 19], [1.5, 1.5, 16]]], ['box', 'c', [0, 0, 35], [34, 18, 2]], ['cyl', 'p', [6, 0, 19], 5, 6]] };
E.SHAPES.shipWheel = { about: "ship's wheel on a post", tags: 'ship', mats: { w: 'walnut' }, parts: [['box', 'w', [0, 0, 0], [4, 4, 18]], ['cyl', 'w', [0, -3, 24], 8, 1.2, { seg: 8, rot: [90, 0, 0] }], ['cyl', 'w', [0, -3, 24], 2, 2, { rot: [90, 0, 0] }]] };
const KANJI = { // calligraphy strokes for 空 手 道 麺 (12x12 grid)
  '空': [[6, 0, 6, 2], [1, 3, 11, 3], [1, 3, 1, 5], [11, 3, 11, 5], [4, 5, 2, 7], [8, 5, 10, 7], [2, 8, 10, 8], [6, 8, 6, 11], [1, 11, 11, 11]],
  '手': [[9, 0, 3, 2], [2, 4, 10, 4], [1, 7, 11, 7], [6, 1, 6, 11], [6, 11, 4, 10]],
  '道': [[3, 0, 4, 2], [8, 0, 7, 2], [5, 2, 11, 2], [6, 3, 6, 4], [5, 4, 10, 4], [5, 4, 5, 9], [10, 4, 10, 9], [5, 6, 10, 6], [5, 9, 10, 9], [0, 4, 2, 5], [1, 7, 2, 10], [2, 10, 11, 11]],
  '麺': [[0, 2, 5, 2], [2, 0, 2, 11], [0, 6, 5, 4], [3, 7, 5, 11], [6, 1, 11, 1], [8, 1, 8, 3], [6, 3, 11, 3], [6, 3, 6, 11], [11, 3, 11, 11], [6, 11, 11, 11], [8, 5, 8, 9], [10, 5, 10, 9]]
};
KC.kanji = (g, ch, x, y, s, c) => { for (const [a, b, cc, d] of KANJI[ch] || []) px.line(g, Math.round(x + a * s), Math.round(y + b * s), Math.round(x + cc * s), Math.round(y + d * s), c, Math.max(1, Math.round(s))); };

const BG = {
  dojo: new E.Backdrop({ sky: ['#1a1018', '#2a1a20'], layers: [] }),
  harbor: new E.Backdrop({ sky: ['#2a3a6a', '#d87a6a', '#ffc890'], sun: { x: .7, y: .62, r: 16, color: '#fff0c0' }, layers: [{ kind: 'hills', color: '#5a4a6a', y: .6, height: .12, parallax: .08 }, { kind: 'sea', color: '#3a5a8a', y: .66, height: .34, parallax: .15 }] }),
  bamboo: new E.Backdrop({ sky: ['#3a6a4a', '#8ab870', '#d0e8a0'], layers: [{ kind: 'forest', color: '#2a4a2a', y: .52, height: .3, parallax: .1 }, { kind: 'fog', color: '#d8f0c0', y: .55, height: .1, parallax: .2 }] }),
  log: new E.Backdrop({ sky: ['#4a6a9a', '#a8c0d8', '#e8e0c8'], layers: [{ kind: 'mountains', color: '#6a6a7a', y: .45, height: .3, parallax: .05 }, { kind: 'mountains', color: '#4a4a52', y: .55, height: .3, parallax: .12, seed: 3 }, { kind: 'forest', color: '#2a3a2a', y: .64, height: .12, parallax: .2 }, { kind: 'fog', color: '#e8f0f8', y: .7, height: .2, parallax: .3 }] }),
  ship: new E.Backdrop({ sky: ['#2a1a4a', '#c84a3a', '#ffa850'], sun: { x: .3, y: .6, r: 22, color: '#ffd080' }, layers: [{ kind: 'hills', color: '#3a2a4a', y: .58, height: .08, parallax: .05 }, { kind: 'sea', color: '#6a3a5a', y: .62, height: .4, parallax: .1 }] }),
  market: new E.Backdrop('city-night'),
  fuji: new E.Backdrop({ sky: ['#2a2050', '#a85a8a', '#f8b8a0'], stars: true, starsY: .3, layers: [{ kind: 'hills', color: '#4a3a5a', y: .64, height: .1, parallax: .12 }] }),
  stadium: new E.Backdrop({ sky: ['#06060e', '#141428'], layers: [] }),
  courtyard: new E.Backdrop({ sky: ['#6aa0e0', '#b8d8f0', '#f0f0e0'], layers: [{ kind: 'mountains', color: '#8aa0b8', y: .5, height: .2, parallax: .05 }, { kind: 'forest', color: '#3a5a3a', y: .6, height: .14, parallax: .15 }] }),
  fishmarket: new E.Backdrop({ sky: ['#7ab0e0', '#c8e0f0', '#f8f0e0'], layers: [{ kind: 'sea', color: '#4a7aa8', y: .55, height: .3, parallax: .06 }, { kind: 'city', color: '#6a6a7a', y: .6, height: .14, parallax: .15 }] }),
  pasture: new E.Backdrop({ sky: ['#5a9ae0', '#a8d0f0', '#e8f4f8'], layers: [{ kind: 'clouds', color: '#ffffff', y: .2, height: .1, parallax: .03 }, { kind: 'hills', color: '#6a9a5a', y: .6, height: .14, parallax: .12 }] })
};
// a crowd of silhouettes in parallax rows, plus front-row rigs (and Mei)
const CROWD_PAL = ['#5a3a6a', '#3a4a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a', '#3a3a4a', '#6a5a4a'];
const CROWD = Array.from({ length: 90 }, (_, i) => ({ x: -160 + i * 8 + E.hash2(i, 3) * 6, row: i % 3, h: 16 + E.hash2(i, 5) * 8, c: CROWD_PAL[Math.floor(E.hash2(i, 7) * CROWD_PAL.length)], ph: E.hash2(i, 9) * 6 }));
const FRONT = Array.from({ length: 8 }, (_, i) => new E.Humanoid({ style: 'classic', size: 1.1, weapon: null, colors: { cloth: CROWD_PAL[i % 7], pants: '#2a2a3a', skin: ['#f0c8a0', '#d8a078', '#f4d8b8'][i % 3], hair: ['#1a1418', '#4a2a18', '#2a2020'][i % 3] } }));
const SEIZA = Array.from({ length: 6 }, (_, i) => new E.Humanoid({ size: 1.5, weapon: null, hair: ['short', 'spiky', 'ponytail'][i % 3], colors: { cloth: '#f2eee4', pants: '#f2eee4', belt: [BELT.white, BELT.yellow, BELT.green][i % 3], skin: '#f0c8a0', boot: '#f0c8a0', glove: '#f0c8a0', hair: '#1a1418' } }));
const MEI_FAN = new E.Humanoid({ size: 1.7, build: 'heroic', weapon: null, hair: 'ponytail', outfit: 'robe', colors: { skin: '#f4d0b0', hair: '#141018', cloth: '#f4ecd8', coat: '#e8e0d0', pants: '#3a2a4a', trim: '#c8302a', belt: '#c8302a', boot: '#3a2a2a' } });
KC.MEI_FAN = MEI_FAN;

class Stage {
  constructor(id, o = {}) { this.id = id; this.S = KC.STAGE[id]; this.bg = BG[id]; this.t = 0; this.cheer = 0; this.meiCheer = 0; this.mei = o.mei !== undefined ? o.mei : false; this.flashes = []; this.sway = 0; }
  enter() {
    const L = game.lights; L.enabled = true; L.ambient = this.S.ambient;
    game.weather = this.S.weather === 'leaves' ? { kind: 'leaves', amount: .4, wind: .2 } : this.id === 'fuji' ? { kind: 'leaves', amount: .35, wind: .3 } : this.id === 'log' ? null : null;
    game.particles.ground = () => 0;
  }
  react(kind) { if (kind === 'point') { this.cheer = 1; this.meiCheer = 1.5; } else if (kind === 'full') { this.cheer = 1.4; this.meiCheer = 2; } else if (kind === 'block') this.cheer = Math.max(this.cheer, .4); }
  update(dt) {
    this.t += dt; this.cheer = Math.max(0, this.cheer - dt * .7); this.meiCheer = Math.max(0, this.meiCheer - dt);
    if (this.id === 'stadium' && E.hash2(Math.floor(this.t * 9), 2) > .93) this.flashes.push({ x: -100 + E.hash2(Math.floor(this.t * 9), 4) * 600, t: 0 });
    this.flashes.forEach(f => f.t += dt); this.flashes = this.flashes.filter(f => f.t < .12);
    this.sway = this.id === 'ship' && !game.reduceMotion ? Math.sin(this.t * .9) * .5 : 0;
    if (this.mei) MEI_FAN.update(dt, { x: 330, y: 70, z: 0, facing: Math.PI / 2 + .3, pose: this.meiCheer > 0 ? 'cheer' : 'wave', expr: this.meiCheer > 0 ? 'shout' : 'smile' });
    FRONT.forEach((h, i) => h.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: this.cheer > .3 && i % 2 ? 'cheer' : i % 3 === 0 ? 'wave' : null }));
    SEIZA.forEach(h => h.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'kneel' }));
    if (this.id === 'market' || this.id === 'harbor') if (E.hash2(Math.floor(this.t * 4), 7) > .85) game.particles.smoke(this.id === 'harbor' ? -40 : 470, 60, 40, 1, { size: .6, color: '#e8e8e8' });
    if (this.id === 'log' && E.hash2(Math.floor(this.t * 6), 1) > .7) game.particles.smoke(-60 + E.hash2(Math.floor(this.t * 6), 3) * 520, -10, -10, 1, { size: 1.2, color: '#e8f0f8' });
  }
  draw(r) {
    const g = r.ctx, W = r.bw || r.W, H = r.bh || r.H, s = this.S, t = this.t, sx = x => r.w(x, 0, 0)[0], fy = Math.round(r.w(0, 0, 0)[1]) + Math.round(this.sway);
    const par = (x, k) => Math.round((sx(x) - W / 2) * k + W / 2);
    this.bg.draw(r);
    const L = game.lights, light = (x, y, z, rad, k, c) => L.add(x, y, z, rad, k, { color: c });
    switch (this.id) {
      case 'dojo': {
        px.rect(g, 0, 0, W, fy, '#3a2418');
        for (let k = -6; k < 14; k++) { const x = par(k * 60, .85); px.rect(g, x, fy - 120, 56, 92, '#e8d8b0'); for (let gx = 0; gx < 4; gx++) px.rect(g, x + gx * 14, fy - 120, 1, 92, '#8a6a48'); for (let gy = 0; gy < 6; gy++) px.rect(g, x, fy - 120 + gy * 16, 56, 1, '#8a6a48'); px.blend(g, .25 + .1 * Math.sin(t + k), 'add', () => px.rect(g, x + 2, fy - 118, 52, 88, '#ffb860')); px.rect(g, x + 56, fy - 124, 4, 124, '#5a3a24'); }
        px.rect(g, 0, fy - 128, W, 8, '#4a2e1c'); px.rect(g, 0, fy - 30, W, 30, '#5a3a24'); px.rect(g, 0, fy - 30, W, 2, '#7a5234');
        // the kamidana shelf and scrolls with kanji
        const kx = par(200, .9); px.rect(g, kx - 30, fy - 150, 60, 6, '#6a4228'); px.rect(g, kx - 20, fy - 162, 40, 12, '#8a5a30'); px.rect(g, kx - 4, fy - 170, 8, 8, '#e8e0c8');
        ['空', '手', '道'].forEach((ch, i) => { const x = par(80 + i * 120, .9); px.rect(g, x - 9, fy - 116, 18, 52, '#f4ecd8'); px.rect(g, x - 10, fy - 118, 20, 3, '#4a2a18'); px.rect(g, x - 10, fy - 64, 20, 3, '#4a2a18'); KC.kanji(g, ch, x - 7, fy - 104, 1.2, '#1a1418'); });
        r.prop('lantern', -60, 50, 64, { anchor: 'top', light: true, size: 1.4 }); r.prop('lantern', 200, 50, 70, { anchor: 'top', light: true, size: 1.4 }); r.prop('lantern', 460, 50, 64, { anchor: 'top', light: true, size: 1.4 });
        r.shape('taiko', -90, 40, 0); r.prop('banner', 520, 60, 0, { size: 1.4, color: '#c8302a' });
        light(-60, 40, 60, 90, .8, '#ffb060'); light(200, 40, 66, 110, .8, '#ffc070'); light(460, 40, 60, 90, .8, '#ffb060');
        break; }
      case 'harbor': {
        const lx = par(500, .25); px.rect(g, lx - 5, fy - 92, 10, 60, '#e8e4dc'); px.rect(g, lx - 5, fy - 80, 10, 6, '#c8302a'); px.rect(g, lx - 7, fy - 98, 14, 7, '#3a3a4a'); px.blend(g, .4 + .3 * Math.sin(t * 2), 'add', () => px.disc(g, lx, fy - 95, 8, '#ffe8a0'));
        for (let k = 0; k < 3; k++) { const bx = par(-60 + k * 220, .3), by = fy - 36; px.poly(g, [[bx - 22, by], [bx + 22, by], [bx + 16, by + 6], [bx - 16, by + 6]], '#2a2a3a'); px.rect(g, bx - 1, by - 26, 2, 26, '#2a2a3a'); px.poly(g, [[bx + 1, by - 24], [bx + 14, by - 4], [bx + 1, by - 4]], '#d8d0c0'); }
        px.rect(g, 0, fy - 8, W, 8, '#5a4030'); for (let k = -10; k < 30; k++) px.rect(g, sx(k * 24), fy - 14, 4, 14, '#4a3020');
        r.shape('crate', -110, 50, 0); r.shape('crate', -96, 52, 14); r.shape('barrel', 480, 46, 0); r.shape('barrel', 500, 54, 0); r.shape('noodleCart', -40, 60, 0);
        for (let k = 0; k < 3; k++) { const gx = par(((t * 20 + k * 150) % 700) - 150, .5), gy = 40 + k * 14 + Math.sin(t * 2 + k) * 4, w = Math.sin(t * 8 + k) > 0 ? 3 : 1; px.line(g, gx - 5, gy - w, gx, gy, '#f8f8f8'); px.line(g, gx, gy, gx + 5, gy - w, '#f8f8f8'); }
        light(-40, 60, 30, 80, .6, '#ffb060');
        break; }
      case 'bamboo': {
        for (const [k, par0, c, n] of [[0, .4, '#3a6a3a', 30], [1, .65, '#4a8a3a', 22], [2, .9, '#5aa048', 14]]) for (let i = 0; i < n; i++) { const x = par(-200 + i * (800 / n) + E.hash2(i, k) * 20, par0), w = 3 + k * 2; px.rect(g, x, 0, w, fy, c); px.rect(g, x + w - 1, 0, 1, fy, E.shade(c, -.2)); for (let j = 0; j < 6; j++) px.rect(g, x - 1, (j * 40 + i * 13) % fy, w + 2, 2, E.shade(c, .15)); if (k === 2 && i % 2) px.poly(g, [[x + w, 30 + i * 7], [x + w + 12, 26 + i * 7], [x + w + 4, 33 + i * 7]], '#6ab858'); }
        px.blend(g, .15, 'add', () => { for (let k = 0; k < 4; k++) { const x = par(k * 140, .7); px.poly(g, [[x, 0], [x + 30, 0], [x + 70, fy], [x + 40, fy]], '#fff8c0'); } });
        r.shape('toro', -80, 40, 0); r.shape('toro', 480, 40, 0); r.prop('rock', 520, 30, 0, { size: 1.4 }); r.prop('bush', -120, 30, 0, { size: 1.4 });
        light(-80, 40, 22, 60, .5, '#ffc070'); light(480, 40, 22, 60, .5, '#ffc070');
        break; }
      case 'log': {
        const wx = par(470, .35); for (let y = 30; y < fy + 60; y += 2) { const sh = (y + Math.floor(t * 60)) % 8 < 4; px.rect(g, wx - 10, y, 20, 2, sh ? '#c8e0f0' : '#e8f4ff'); } px.blend(g, .4, 'add', () => px.ell(g, wx, fy + 30, 26, 8, '#ffffff'));
        // the gorge below and the log itself (bark), ropes along it
        px.rect(g, 0, fy + 4, W, H - fy, '#1a1a24'); px.blend(g, .5, 'normal', () => { for (let y = fy + 10; y < H; y += 6) px.rect(g, 0, y, W, 3, '#2a3040'); });
        px.rect(g, sx(-140), fy - 4, sx(540) - sx(-140), 14, '#6a4a30'); for (let k = -140; k < 540; k += 12) px.rect(g, sx(k), fy + (k % 24 === 0 ? -2 : 2), 7, 2, '#4a301c'); px.rect(g, sx(-140), fy - 5, sx(540) - sx(-140), 2, '#8a6a48');
        px.line(g, sx(-140), fy - 32, sx(540), fy - 30, '#c8b080'); for (let k = -140; k < 560; k += 70) px.rect(g, sx(k), fy - 34, 2, 30, '#5a4028');
        r.prop('pine', -120, 50, 0, { size: 1.6 }); r.prop('pine', 540, 50, 0, { size: 1.6 }); r.prop('vines', -40, 60, 120, { anchor: 'top', size: 1.4 });
        break; }
      case 'ship': {
        px.rect(g, 0, fy - 12, W, 12, '#5a3420'); px.rect(g, 0, fy - 14, W, 2, '#8a5a34'); for (let k = -10; k < 30; k++) px.rect(g, sx(k * 30), fy - 26, 3, 14, '#4a2a18'); px.rect(g, 0, fy - 27, W, 2, '#8a5a34');
        const mx = sx(330); px.rect(g, mx - 3, 0, 6, fy - 12, '#4a2a18'); px.rect(g, mx - 40, 30, 80, 3, '#4a2a18'); px.line(g, mx, 10, sx(100), fy - 26, '#2a1a10'); px.line(g, mx, 10, sx(520), fy - 26, '#2a1a10');
        px.poly(g, [[mx - 36, 34], [mx + 36, 34], [mx + 30, 90], [mx - 30, 90]], '#e8dcc8'); px.poly(g, [[mx - 30, 90], [mx + 30, 90], [mx + 30, 92], [mx - 30, 92]], '#b8a888');
        r.shape('shipWheel', 480, 30, 0); r.shape('barrel', -90, 40, 0); r.shape('barrel', -110, 50, 0); r.prop('lantern', 130, 40, 60, { anchor: 'top', light: true, size: 1.3 }); r.prop('lantern', 300, 40, 60, { anchor: 'top', light: true, size: 1.3 });
        light(130, 40, 56, 80, .7, '#ffa040'); light(300, 40, 56, 80, .7, '#ffa040');
        break; }
      case 'market': {
        for (let k = -3; k < 10; k++) { const x = sx(k * 70), y = 26 + (k % 2) * 4; px.line(g, x, y, x + 70, y + 4, '#2a1a1a'); for (let j = 0; j < 3; j++) { const lx = x + 12 + j * 22, ly = y + 6 + j; px.blend(g, .35, 'add', () => px.disc(g, lx, ly + 4, 9, '#ff6a3a')); px.ell(g, lx, ly + 4, 4, 5, '#e83a2a'); px.rect(g, lx - 3, ly + 1, 6, 1, '#ffd060'); } }
        const shx = sx(470); px.rect(g, shx - 50, fy - 110, 100, 110, '#3a2a24'); px.rect(g, shx - 54, fy - 116, 108, 8, '#1a1416'); px.rect(g, shx - 40, fy - 96, 80, 40, '#ffcf80'); for (let k = 0; k < 4; k++) { px.rect(g, shx - 40 + k * 20, fy - 104, 18, 30, '#1e2a52'); } KC.kanji(g, '麺', shx - 8, fy - 100, 1.3, '#f4ecd8'); T(g, 'CHAMPON-TEI', shx - 32, fy - 66, '#3a1a10', { shadow: null });
        r.prop('awning', -90, 50, 0, { size: 1.4, color: '#c8302a' }); r.prop('streetlamp', 140, 60, 0, { light: true, size: 1.3 }); r.prop('crate', -120, 40, 0, { size: 1.3 });
        light(470, 50, 40, 100, .9, '#ffc080'); light(140, 60, 50, 90, .7, '#ffd090'); for (let k = 0; k < 5; k++) light(-60 + k * 130, 40, 70, 60, .5, '#ff7040');
        break; }
      case 'fuji': {
        const fx = par(300, .12), fyy = Math.round(H * .64); px.poly(g, [[fx - 140, fyy], [fx - 22, fyy - 96], [fx + 22, fyy - 96], [fx + 140, fyy]], '#6a5a8a'); px.poly(g, [[fx - 140, fyy], [fx, fyy - 96], [fx, fyy]], '#5a4a7a');
        px.poly(g, [[fx - 40, fyy - 64], [fx - 22, fyy - 96], [fx + 22, fyy - 96], [fx + 40, fyy - 64], [fx + 26, fyy - 70], [fx + 12, fyy - 62], [fx - 4, fyy - 72], [fx - 20, fyy - 64]], '#f4f0f8');
        const pg = par(-60, .3); for (let k = 0; k < 4; k++) { px.rect(g, pg - 14 + k * 2, fyy - 30 - k * 14, 28 - k * 4, 3, '#2a1a2a'); px.rect(g, pg - 9 + k * 2, fyy - 27 - k * 14, 18 - k * 4, 11, '#3a2a3a'); }
        for (let k = 0; k < 5; k++) { const cx = par(-120 + k * 170, .6), cy = fy - 70; px.rect(g, cx - 2, cy + 10, 4, 60, '#4a2a2a'); for (let j = 0; j < 7; j++) px.disc(g, cx + Math.cos(j) * 16, cy + Math.sin(j * 2) * 8, 11, j % 2 ? '#f8b8c8' : '#f0a0b8'); }
        r.shape('torii', 470, 60, 0, { scale: 1.6 }); r.shape('toro', -60, 40, 0); r.shape('toro', 420, 30, 0); r.prop('flowers', 520, 20, 0, { size: 1.3 });
        light(-60, 40, 22, 60, .5, '#ffc070'); light(420, 30, 22, 60, .5, '#ffc070');
        break; }
      case 'stadium': {
        for (let row = 0; row < 7; row++) { const y = fy - 150 + row * 18, k = .6 + row * .05; px.rect(g, 0, y, W, 18, row % 2 ? '#1a1830' : '#201c38'); for (let i = 0; i < 70; i++) { const x = Math.round((((i * 13 + row * 7) % 70) * 10 - 100 - (sx(200) - W / 2) * k * .3 + W / 2 - 300)), bob = Math.abs(Math.sin(t * (3 + this.cheer * 6) + i + row)) * (1 + this.cheer * 3); px.rect(g, x, y + 6 - bob, 6, 10, CROWD_PAL[(i + row) % 7]); px.disc(g, x + 3, y + 4 - bob, 3, '#d8b090'); } }
        for (const f of this.flashes) px.blend(g, .8, 'add', () => px.disc(g, par(f.x, .6), fy - 120 + (f.x % 90), 4, '#ffffff'));
        const sbx = par(200, .7), sby = Math.max(30, fy - 196); box(g, sbx - 60, sby, 120, 40, { bg: ['#101018', '#000008'], border: '#5a5a7a' }); T(g, "CHAMPON CUP '84", sbx - 42, sby + 6, '#ffd060', { shadow: null }); T(g, 'WHITE      RED', sbx - 40, sby + 20, '#ff8a6a', { shadow: null });
        for (const bx of [-100, 500]) { const x = par(bx, .8); px.rect(g, x - 20, fy - 150, 40, 60, '#c8302a'); T(g, 'CHAMPON', x - 18, fy - 130, '#ffe8a0', { shadow: null }); }
        px.rect(g, 0, fy - 20, W, 20, '#2a2a40');
        r.shape('goldenBowl', 470, 40, 0, { scale: 1.2 }); r.shape('chair', -70, 40, 0); r.shape('chair', 520, 40, 0);
        px.blend(g, .12, 'add', () => { for (const cx of [130, 270]) { const a = sx(cx); px.poly(g, [[a - 6, 0], [a + 6, 0], [a + 50, fy + 10], [a - 50, fy + 10]], '#e8f0ff'); } });
        light(130, 0, 60, 120, .9, '#e8f0ff'); light(270, 0, 60, 120, .9, '#e8f0ff'); light(470, 40, 30, 50, .6, '#ffd060');
        break; }
      case 'courtyard': { px.rect(g, 0, fy - 70, W, 70, '#c8b898'); for (let k = -6; k < 16; k++) px.rect(g, sx(k * 40), fy - 70, 2, 70, '#a89878'); px.rect(g, 0, fy - 76, W, 6, '#5a4a40'); r.prop('pine', -80, 40, 0, { size: 1.6 }); r.prop('pine', 500, 40, 0, { size: 1.6 }); r.shape('barrel', 420, 40, 0); break; }
      case 'fishmarket': { for (let k = -4; k < 12; k++) { const x = sx(k * 70); px.poly(g, [[x, fy - 90], [x + 70, fy - 90], [x + 60, fy - 76], [x + 10, fy - 76]], k % 2 ? '#5a6a8a' : '#6a5a5a'); px.rect(g, x + 10, fy - 76, 50, 76, '#4a4038'); } r.shape('crate', -90, 40, 0); r.shape('crate', 480, 40, 0); r.prop('sign', 520, 50, 0, { size: 1.3 }); break; }
      case 'pasture': { const fx = par(300, .1), fyy = Math.round(H * .62); px.poly(g, [[fx - 120, fyy], [fx - 18, fyy - 80], [fx + 18, fyy - 80], [fx + 120, fyy]], '#7a8ab0'); px.poly(g, [[fx - 34, fyy - 54], [fx - 18, fyy - 80], [fx + 18, fyy - 80], [fx + 34, fyy - 54], [fx, fyy - 60]], '#f4f4f8'); for (let k = -10; k < 40; k++) { const x = sx(k * 16); px.rect(g, x, fy - 22, 3, 22, '#8a6a40'); px.rect(g, x + 1, fy - 22, 1, 22, '#a88a5a'); } px.rect(g, 0, fy - 18, W, 2, '#9a7a4a'); px.rect(g, 0, fy - 10, W, 2, '#8a6a40'); r.prop('rock', 520, 40, 0, { size: 1.3 }); r.prop('tree', -100, 50, 0, { size: 1.5 }); break; }
    }
    // crowd silhouettes and the front row
    const cw = s.crowd;
    if (cw && cw !== 'stadium' && cw !== 'seiza') {
      for (const p of CROWD) { if (cw === 'garden' && p.row > 0) continue; const k = [.7, .82, .94][p.row], x = Math.round((sx(p.x) - W / 2) * k + W / 2), bob = Math.abs(Math.sin(t * (3 + this.cheer * 6) + p.ph)) * (1 + this.cheer * 4), y = fy - 32 - p.row * 8 - p.h + 18 - bob; const c = E.shade(p.c, -.1 * (2 - p.row)); px.rect(g, x - 5, y + 6, 10, p.h, c); px.disc(g, x, y + 3, 4, E.shade(c, .15)); if (this.cheer > .3 && E.hash2(Math.floor(p.ph * 10), 1) > .5) { px.rect(g, x - 7, y - 4 - bob, 2, 8, c); px.rect(g, x + 5, y - 4 - bob, 2, 8, c); } }
      FRONT.forEach((h, i) => { const x = -120 + i * 40 + (i > 3 ? 360 : 0) - (i > 3 ? 160 : 0); r.actor(x, 64, 0, (g2, ox, oy) => h.draw(g2, ox, oy, r.view), { every: 2, key: h }); });
    }
    if (cw === 'seiza') SEIZA.forEach((h, i) => { const x = i < 3 ? -110 + i * 24 : 450 + (i - 3) * 24; r.actor(x, 56, 0, (g2, ox, oy) => h.draw(g2, ox, oy, r.view), { every: 2, key: h }); });
    if (this.mei) r.actor(330, 70, 0, (g2, ox, oy) => { MEI_FAN.draw(g2, ox, oy, r.view); if (this.meiCheer > 0) { const hy = oy - 70; px.disc(g2, ox - 2, hy - 4, 2, '#ff5a8a'); px.disc(g2, ox + 2, hy - 4, 2, '#ff5a8a'); px.poly(g2, [[ox - 4, hy - 3], [ox + 4, hy - 3], [ox, hy + 2]], '#ff5a8a'); } }, { key: MEI_FAN });
    this.floor(r, fy);
  }
  floor(r, fy) {
    const g = r.ctx, W = r.bw || r.W, H = r.bh || r.H, f = this.S.floor, sx = x => r.w(x, 0, 0)[0], top = Math.round(Math.min(fy, r.w(0, 90, 0)[1]));
    if (f === 'log') return;
    const C = { planks: ['#a8784a', '#6a4428'], deck: ['#8a6440', '#4a3020'], dirt: ['#7a6040', '#4a3a24'], stone: ['#5a5460', '#2a2830'], gravel: ['#c8c0b0', '#8a8478'], mat: ['#2a4aa8', '#16264a'], earth: ['#a88a60', '#6a5438'], wet: ['#6a7480', '#3a4048'], grass: ['#6aa84a', '#3a6a2a'] }[f] || ['#7a6a5a', '#3a3028'];
    for (let y = top; y < H; y++) { const k = (y - top) / Math.max(1, H - top); px.rect(g, 0, y, W, 1, E.mix(C[0], C[1], k)); }
    if (f === 'planks' || f === 'deck') for (let k = -14; k <= 22; k++) { const x0 = sx(k * 30); px.line(g, Math.round(x0), top, Math.round(W / 2 + (x0 - W / 2) * 1.8), H, E.shade(C[1], -.1)); }
    if (f === 'planks') { px.rect(g, 0, top, W, 2, '#c89868'); }
    if (f === 'gravel') for (let y = top + 4; y < H; y += 5) for (let x = (y % 10); x < W; x += 10) px.rect(g, x, y, 4, 1, '#a8a090');
    if (f === 'stone') for (let y = top; y < H; y += 8) { px.rect(g, 0, y, W, 1, '#3a3640'); for (let x = (y % 16) * 2; x < W; x += 32) px.rect(g, x, y, 1, 8, '#3a3640'); }
    if (f === 'mat') { px.rect(g, sx(150) - 1, top, 3, H - top, '#f4f4f4'); px.rect(g, sx(250) - 1, top, 3, H - top, '#e8302a'); px.rect(g, sx(0), top, 2, H - top, '#e8c040'); px.rect(g, sx(400), top, 2, H - top, '#e8c040'); }
    if (f === 'wet') px.blend(g, .2, 'add', () => { for (let k = 0; k < 8; k++) px.ell(g, sx(k * 60 - 40), top + 10 + k % 3 * 6, 14, 2, '#c8e0ff'); });
    if (f === 'grass') for (let x = 0; x < W; x += 3) px.rect(g, x, top - (x * 7 % 3), 1, 3, '#4a8a3a');
    // start marks (Karate Champ's two spots)
    if (!this.S.bonus && f !== 'mat') { px.rect(g, sx(150) - 6, top + 3, 12, 2, '#f4f0e8'); px.rect(g, sx(250) - 6, top + 3, 12, 2, '#e8402a'); }
  }
}
KC.Stage = Stage;
KC.stageCam = (fighters, view) => {
  // the camera frames both fighters, clamped so the arena edges stay on screen
  const mid = fighters.length ? fighters.reduce((a, f) => a + f.x, 0) / fighters.length : 200, sc = 1.5, half = game.W / sc / 2;
  const cx = half * 2 >= 520 ? 200 : clamp(mid, -40 + half, 440 - half);
  game.focus(cx, view === 'brawler' ? 20 : 0, 62 + Math.max(0, (game.H - 240) / 4));
};

// ---- 40-bonus.js ----
/* ---- BONUS STAGES: BREAK THE BOARDS (tameshiwari), POTS AHOY! (evade), STOP THE BULL. Each runs with the hero's
 * Karateka and the same twin-stick input; numbers live in KC.DATA.bonus and the dev sliders. ---- */
const CHOP = Object.assign({}, M.overhead, { blade: 0, plane: 'side', reach: 7, crouch: .6, lunge: 1.5 });
const BOARDS = {
  start(B) { const p = B.params; Object.assign(B, { n: p.n || 5, mat: p.mat || 'pine', ki: 0, over: 0, state: 'ready', power: 0, broken: 0, chopT: 0, splits: [], held: false }); B.hero.x = 170; B.hero.face = 1; },
  update(B, dt, ctl) {
    const h = B.hero;
    if (B.state === 'ready') { if (B.t > 1.6) B.state = 'breathe'; return; }
    if (B.state === 'breathe') {
      const hold = ctl.hold;
      if (hold) { B.held = true; const wob = .06 * Math.sin(B.t * 2.2 * Math.PI * 2); B.ki = clamp(B.ki + (.55 * TUNE.kiSpeed + wob) * dt * 100 / 100, 0, 1.15); if (B.ki > 1) { B.over += dt; if (B.over > .3) { B.ki = .6; B.over = 0; B.say('TOO MUCH!'); game.audio.sfx('menuBack'); } } else B.over = 0; if (Math.floor(B.t * 8) !== Math.floor((B.t - dt) * 8)) game.audio.sfx('kiCharge', { pitch: .6 + B.ki }); h.setPose('yoi'); }
      else if (B.held) { B.power = Math.round(clamp(B.ki, 0, 1) * 100); B.state = 'chop'; B.chopT = 0; h.st = 'pose'; h.poseName = 'chop'; KC.Voice.kiai(h.id, true); }
      return;
    }
    if (B.state === 'chop') {
      B.chopT += dt;
      if (B.chopT > .18 && !B.resolved) {
        B.resolved = true; const N = B.n, perfect = B.power >= 95; B.broken = perfect ? N : Math.min(N, Math.floor(B.power / 100 * (N + .99)));
        const mult = KC.MATS[B.mat][1]; B.points = Math.round(B.broken * 200 * mult) + (perfect ? 2000 : 0); B.perfect = perfect;
        for (let i = 0; i < B.broken; i++) B.splits.push({ i, t: 0 });
        if (B.broken) { game.audio.sfx('boardCrack'); game.particles.bits(212, 0, 20 + B.n * 3, 12 + B.broken * 3, [KC.MATS[B.mat][2], E.shade(KC.MATS[B.mat][2], -.2), '#ffffff']); game.particles.dust(212, 0, 4, 10); game.shake(perfect ? 5 : 3); }
        if (!game.reduceMotion) { game.timeScale = .3; game.after(.12, () => { game.timeScale = 1; }); }
        B.callout(perfect ? 'perfect' : B.broken < N / 2 ? 'weak' : null, perfect ? null : B.broken + ' / ' + N + ' BOARDS');
      }
      B.splits.forEach(s => s.t += dt);
      if (B.chopT > 2.6) B.finish();
    }
  },
  rig(B, h) { if (B.state === 'chop') return { attack: { spec: CHOP, phase: B.chopT < .12 ? 'wind' : B.chopT < .22 ? 'active' : 'recover', u: B.chopT < .12 ? B.chopT / .12 : B.chopT < .22 ? (B.chopT - .12) / .1 : 0 }, expr: 'shout' }; return null; },
  draw(B, r) {
    const N = B.n, col = KC.MATS[B.mat][2];
    r.shape('cinder', 200, 0, 0); r.shape('cinder', 224, 0, 0);
    r.queue(212, -2, 8, g => {
      for (let i = 0; i < N; i++) {
        const z = 8 + i * 3, sp = B.splits.find(s => s.i === N - 1 - i), a = r.w(196, 0, z), b = r.w(228, 0, z + 2.5);
        if (sp) { const k = Math.min(1, sp.t * 3), dx = k * 10, dz = k * k * -6; px.rect(g, Math.round(a[0] - dx), Math.round(b[1] - dz), Math.round((b[0] - a[0]) / 2 - 1), Math.max(2, Math.round(a[1] - b[1])), col); px.rect(g, Math.round((a[0] + b[0]) / 2 + 1 + dx), Math.round(b[1] - dz), Math.round((b[0] - a[0]) / 2 - 1), Math.max(2, Math.round(a[1] - b[1])), E.shade(col, -.1)); }
        else { px.rect(g, Math.round(a[0]), Math.round(b[1]), Math.round(b[0] - a[0]), Math.max(2, Math.round(a[1] - b[1])), col); px.rect(g, Math.round(a[0]), Math.round(a[1]) - 1, Math.round(b[0] - a[0]), 1, E.shade(col, -.3)); }
      }
    });
  },
  hud(B, g, W, H) {
    if (B.state === 'breathe' || B.state === 'ready') {
      const x = 22, y = H / 2 - 60, h = 110; box(g, x - 4, y - 18, 30, h + 34, { alpha: .8 }); T(g, 'KI', x + 5, y - 13, '#ffd060');
      px.rect(g, x, y, 22, h, '#1a1424'); const v = clamp(B.ki, 0, 1.15) / 1.15; px.rect(g, x + 2, y + h - Math.round(v * h), 18, Math.round(v * h), B.ki > 1 ? '#ff4a3a' : B.ki >= .95 ? '#ffe070' : '#5ab0ff');
      const p95 = y + h - Math.round(.95 / 1.15 * h), p100 = y + h - Math.round(1 / 1.15 * h); px.rect(g, x - 2, p95, 26, 1, '#ffe070'); px.rect(g, x - 2, p100, 26, 1, '#ff4a3a');
      T(g, Math.round(B.ki * 100) + '%', x - 2, y + h + 4, '#fff');
      const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'R:d' : 'key:K', 'HOLD TO BREATHE'], [d === 'pad' ? 'pad0' : 'key:K', 'RELEASE TO CHOP']], W / 2, H - 40);
      T(g, KC.MATS[B.mat][0] + ' x' + B.n + '   95%+ = PERFECT', W / 2 - TW(KC.MATS[B.mat][0] + ' x' + B.n + '   95%+ = PERFECT') / 2, 56, '#e8e0ff');
    }
  },
  auto(B) { return { hold: B.ki < .97 } }   // the attract mode's perfect breath
};

/* POTS AHOY!: objects from both edges at three heights. Break pots with a technique of their height (bonsai: kicks
 * only), dodge boulders, catch champon bowls with a block. The first hit ends it. */
const LANES = { H: 50, M: 34, L: 9 };
const POTS = {
  start(B) {
    const p = B.params, r = U.rng(1000 + (B.visit || 0) * 77), n = p.n || 16; B.objs = []; B.state = 'ready'; B.handled = 0; B.points = 0; B.next = 0;
    let t = 1.2;
    for (let i = 0; i < n; i++) {
      const k = i / Math.max(1, n - 1), kindR = r(), kind = i === 3 || i === 11 ? 'bowl' : kindR < .55 ? 'pot' : kindR < .72 ? 'bonsai' : kindR < .9 ? 'boulder' : 'bowl', lane = kind === 'bowl' ? (r() < .5 ? 'H' : 'M') : ['H', 'M', 'L'][Math.floor(r() * 3)];
      B.objs.push({ i, kind, lane, side: r() < .5 ? -1 : 1, at: t, v: lerp(p.v0 || 150, p.v1 || 230, k), st: 'wait', x: 0, z: LANES[lane], rot: 0 });
      t += lerp(p.i0 || 1.4, p.i1 || .8, k);
    }
    B.hero.x = 200;
  },
  phantom(B) { const o = B.objs.find(o => o.st === 'tele' || o.st === 'fly'); return o ? { x: 200 + o.side * 100 } : null; },
  update(B, dt) {
    if (B.state === 'ready') { if (B.t > 1.6) { B.state = 'play'; B.t0 = B.t; } return; }
    if (B.state !== 'play') { if (B.t - B.endT > 2.4) B.finish(); return; }
    const h = B.hero, el = (B.t - B.t0) * TUNE.potSpeed;
    for (const o of B.objs) {
      if (o.st === 'wait' && el >= o.at - .7) { o.st = 'tele'; o.x = 200 + o.side * 260; }
      if (o.st === 'tele' && el >= o.at) { o.st = 'fly'; game.audio.sfx('whooshL', { vol: .4 }); }
      if (o.st !== 'fly') continue;
      o.x -= o.side * o.v * TUNE.potSpeed * dt; o.rot += dt * 8 * -o.side; const t = h.T;
      const dist = (o.x - h.x) * o.side - h.w / 2;   // from the hero's edge facing it
      // a technique of the right height in its active frames breaks it
      if (t && h.st === 'tech' && h.ph === 'a' && Math.sign(o.x - h.x) === h.techFace) {
        const mx = t.pts ? h.reach(t)[1] : 0; if (t.pts && dist <= mx + 6 && dist >= -6) {
          const ht = t.height, hit = o.lane === 'H' ? ['high', 'rising', 'air'].includes(ht) : o.lane === 'M' ? ['mid', 'midlow', 'air'].includes(ht) : ['low', 'midlow'].includes(ht);
          if (hit && o.kind !== 'boulder' && (o.kind !== 'bonsai' || t.move.kick)) { o.st = 'broken'; B.handled++; game.particles.bits(o.x, 0, o.z, 14, o.kind === 'bowl' ? ['#e8e0d0', '#d8a050'] : o.kind === 'bonsai' ? ['#5a8a3a', '#a86a40'] : ['#c8784a', '#8a4a2a']); game.audio.sfx('potShatter');
            if (o.kind === 'bowl') { B.points = Math.max(0, B.points - 500); B.say('MOTTAINAI!'); game.audio.sfx('bowlSplash'); } else { B.points += 200; B.popup(o.x, o.z, '200'); } continue; }
        }
        if (t.kind === 'block' && o.kind === 'bowl' && dist <= 14 && dist >= -6) { o.st = 'caught'; B.handled++; B.points += 1000; B.say('NICE CATCH!'); game.audio.sfx('bowlDing'); B.popup(o.x, o.z, '1000'); continue; }
      }
      if (dist < 2 && dist > -h.w) {
        const air = h.z > (o.lane === 'L' ? 4 : 18), low = h.isLow();
        const dodged = o.lane === 'L' ? air : o.lane === 'H' ? low || (h.st === 'tech' && h.T && h.T.kind === 'roll') : air && h.z > 14;
        if (dodged || DEV.invincible || B.cheat) { if (!o.dodged) { o.dodged = true; } }
        else if (o.kind === 'bowl') { o.st = 'passed'; B.handled++; game.audio.sfx('bowlSplash'); B.popup(o.x, o.z, 'SPLASH'); }
        else { o.st = 'hit'; B.hitBy = o; h.hurt(-o.side, true, false); game.audio.sfx('thwackFull'); game.shake(4); B.say(o.kind === 'boulder' ? 'OUCH!' : 'CLONK!'); B.state = 'over'; B.endT = B.t; return; }
      }
      if ((o.x - 200) * o.side < -280) { if (o.st === 'fly') { o.st = 'passed'; B.handled++; } }
    }
    if (B.objs.every(o => o.st !== 'wait' && o.st !== 'tele' && o.st !== 'fly')) { B.perfect = B.objs.every(o => o.st === 'broken' && o.kind !== 'bowl' || o.st === 'caught' || o.kind === 'boulder' && o.st === 'passed'); if (B.perfect) { B.points += 3000; B.callout('perfect'); } B.state = 'over'; B.endT = B.t; }
  },
  draw(B, r) {
    for (const o of B.objs) {
      if (o.st !== 'fly') continue;
      r.queue(o.x, 0, o.z, g => {
        const [x, y] = r.w(o.x, 0, o.z), X = Math.round(x), Y = Math.round(y);
        if (o.kind === 'pot') { px.ell(g, X, Y, 8, 9, '#b8683a'); px.ell(g, X - 2, Y - 2, 5, 6, '#d8884a'); px.rect(g, X - 5, Y - 10, 10, 3, '#8a4a2a'); }
        else if (o.kind === 'bonsai') { px.rect(g, X - 7, Y + 1, 14, 7, '#6a4a7a'); px.rect(g, X - 1, Y - 6, 2, 8, '#6a4a30'); px.disc(g, X - 4, Y - 8, 5, '#4a8a3a'); px.disc(g, X + 4, Y - 7, 5, '#5aa048'); }
        else if (o.kind === 'boulder') { px.disc(g, X, Y, 10, '#6a6a72'); px.disc(g, X - 3, Y - 3, 6, '#8a8a92'); px.rect(g, X + 2 + Math.round(Math.sin(o.rot) * 3), Y + 1, 3, 2, '#4a4a52'); }
        else { px.ell(g, X, Y + 2, 9, 5, '#e8e0d0'); px.ell(g, X, Y - 1, 8, 2, '#d8a050'); px.rect(g, X - 3, Y - 2, 2, 1, '#c8302a'); px.rect(g, X + 2, Y - 1, 2, 1, '#3a8a3a'); if (Math.floor(B.t * 6) % 2) px.blend(g, .4, 'add', () => px.rect(g, X - 1, Y - 10, 2, 6, '#ffffff')); }
      });
    }
  },
  hud(B, g, W, H, r) {
    for (const o of B.objs) if (o.st === 'tele') {
      const x = o.side > 0 ? W - 22 : 6, y = Math.round(r.w(0, 0, o.z)[1]) - 6, blink = Math.floor(B.t * 10) % 2;
      box(g, x - 2, y - 2, 20, 16, { bg: o.kind === 'boulder' ? ['#5a1a1a', '#2a0a0a'] : o.kind === 'bowl' ? ['#1a4a2a', '#0a2a14'] : ['#2a2440', '#14101c'], border: blink ? '#ffd060' : '#8a7aa0' });
      T(g, o.side > 0 ? '←' : '→', x + 4, y + 2, '#fff'); T(g, o.lane, x + 10, y + 2, '#ffd060');
    }
    const left = B.objs.filter(o => o.st === 'wait' || o.st === 'tele' || o.st === 'fly').length; T(g, 'LEFT ' + left, W / 2 - 20, 56, '#e8e0ff');
    if (B.state !== 'over') { const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'R:u' : 'key:I', 'HIGH'], [d === 'pad' ? 'R:r' : 'key:L', 'MID'], [d === 'pad' ? 'R:d' : 'key:K', 'LOW'], [d === 'pad' ? 'L:l' : 'key:A', '+'], [d === 'pad' ? 'R:r' : 'key:L', 'BLOCK = CATCH']], W / 2, H - 40, 10); }
  },
  // the attract mode / autopilot: perfect reads
  auto(B) {
    const h = B.hero, o = B.objs.filter(o => o.st === 'fly').sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0]; if (!o) return KC.NEUTRAL;
    const dist = (o.x - h.x) * o.side - h.w / 2, scr = d => d === 't' ? (o.side > 0 ? 'r' : 'l') : d === 'a' ? (o.side > 0 ? 'l' : 'r') : d;
    if (!h.free()) return { posture: h.posture === 'd' ? 'd' : 'n', press: null };
    if (o.kind === 'boulder') { if (dist < 34) return o.lane === 'H' ? { posture: 'd', press: null } : o.lane === 'L' ? { posture: 'u', press: null } : { posture: scr('a'), press: scr('a') }; return KC.NEUTRAL; }
    if (o.kind === 'bowl') return dist < 16 ? { posture: scr('a'), press: scr('t') } : KC.NEUTRAL;
    const id = o.lane === 'H' ? 'roundKick' : o.lane === 'M' ? 'frontKick' : 'lowKick', t = KC.TECH[id], lead = o.v * TUNE.potSpeed * (U.steps(t.f[0]) / 120);
    return dist < lead + 22 ? { posture: 'n', press: scr(t.R) } : KC.NEUTRAL;
  }
};

/* STOP THE BULL: a custom quadruped. It paws twice and snorts, lowers its head and charges; strike its head in the window
 * with one of the five bull techniques (upper punch, upper lunge, squat punch, front kick, back kick). */
class Bull {
  constructor() { this.x = 420; this.st = 'idle'; this.t = 0; this.ph = 0; this.head = 0; this.v = 0; this.stars = 0; }
  headX() { return this.x - 36; }
  update(dt) {
    this.t += dt; const run = this.st === 'charge' ? 1 : this.st === 'walkBack' || this.st === 'walk' ? .4 : 0; this.ph += dt * (run ? 4 + this.v / 40 : 0) * Math.PI;
    this.head = approach(this.head, this.st === 'charge' || this.st === 'paw' && this.t > .8 ? 1 : 0, dt * 4);
    if (this.st === 'charge' && Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) { game.audio.sfx('bullStomp', { vol: .5 }); game.particles.dust(this.x + 20, 0, 2, 3); }
    if ((this.st === 'paw' || this.st === 'charge') && E.hash2(Math.floor(this.t * 8), 3) > .8) game.particles.smoke(this.headX() - 6, 0, 26, 1, { size: .5, color: '#e8e8f0' });
  }
  draw(r) {
    const legPh = this.ph, x0 = this.x, red = this.st === 'charge' || this.st === 'paw';
    r.queue(x0, 2, 30, g => {
      const P = (x, z) => { const p = r.w(x, 2, z); return [Math.round(p[0]), Math.round(p[1])]; }, tn = E.tones('#4a2e22');
      // legs: two segments each, gallop phases
      [[-24, 0], [-18, .5], [18, .25], [24, .75]].forEach(([dx, off], i) => {
        const a = Math.sin(legPh + off * Math.PI * 2) * (this.st === 'idle' || this.st === 'stopped' ? 0 : .6), paw = this.st === 'paw' && i === 0 ? Math.max(0, Math.sin(this.t * 10)) * 8 : 0;
        const hip = P(x0 + dx, 30), knee = P(x0 + dx + Math.sin(a) * 8, 16 + paw * .5), hoof = P(x0 + dx + Math.sin(a * 1.4) * 12 - (i === 0 ? paw : 0), Math.max(0, -Math.cos(a) * 2 + 2) + paw * .6);
        px.line(g, hip[0], hip[1], knee[0], knee[1], i % 2 ? tn.sh : tn.base, 5); px.line(g, knee[0], knee[1], hoof[0], hoof[1], i % 2 ? tn.sh : tn.base, 4); px.rect(g, hoof[0] - 3, hoof[1] - 2, 6, 3, '#1a1414');
      });
      const c = P(x0, 34); px.ell(g, c[0], c[1], 40, 20, tn.base); px.ell(g, c[0] + 6, c[1] - 6, 30, 12, tn.lt); px.ell(g, c[0] + 18, c[1] - 10, 16, 10, tn.base); px.ell(g, c[0] - 10, c[1] + 10, 28, 6, tn.sh);
      // tail: a pendulum
      const tl = P(x0 + 34, 38), te = P(x0 + 40 + Math.sin(this.t * 4) * 3, 22); px.line(g, tl[0], tl[1], te[0], te[1], tn.sh, 2); px.disc(g, te[0], te[1], 2, '#1a1414');
      // neck and head (lowered when charging), horns, nose ring, eyes
      const hd = this.head, hx = x0 - 34, hz = 40 - hd * 16, H = P(hx, hz), N = P(x0 - 18, 42);
      px.line(g, N[0], N[1], H[0] + 6, H[1], tn.base, 12);
      px.rect(g, H[0] - 10, H[1] - 8, 18, 16, tn.base); px.rect(g, H[0] - 14, H[1] - 2, 8, 9, tn.lt); px.disc(g, H[0] - 11, H[1] + 5, 4, '#c89a8a');
      px.ell(g, H[0] - 11, H[1] + 8, 3, 2, '#e8c040'); px.rect(g, H[0] - 3, H[1] - 5, 3, 3, red ? '#ff2a1a' : '#f8f0e0'); px.dot(g, H[0] - 2, H[1] - 4, '#000');
      for (const s of [-1, 1]) { px.line(g, H[0] + 2, H[1] - 8, H[0] + 2 - 6 * s * .3 - 6, H[1] - 14 - 4 * s, '#e8dcc0', 2); px.line(g, H[0] - 4, H[1] - 14 - 4 * s, H[0] - 9, H[1] - 18 - 3 * s, '#fff8e8', 2); }
      if (this.st === 'stopped') for (let k = 0; k < 3; k++) { const a = this.t * 5 + k * 2.1, sx = H[0] + Math.cos(a) * 12, sy = H[1] - 20 + Math.sin(a) * 4; T(g, '★', sx - 3, sy - 3, '#ffe060', { shadow: null }); }
    });
    r.shadow(x0, 2, 30, .4);
  }
}
KC.Bull = Bull;
const BULL = {
  start(B) { B.bull = new Bull(); B.charge = 0; B.state = 'ready'; B.points = 0; B.hero.x = 140; B.hero.face = 1; B.bstate('idle'); },
  update(B, dt) {
    const b = B.bull, h = B.hero, sp = (B.params.charges || [150, 190, 240])[B.charge] * TUNE.bullSpeed; b.update(dt);
    if (B.state === 'ready') { if (B.t > 1.6) { B.state = 'play'; B.bstate('paw'); } return; }
    if (B.state === 'over') { if (B.t - B.endT > 2.6) B.finish(); if (b.st === 'trample') { b.x -= 200 * dt; } return; }
    b.st0 = (b.st0 || 0) + dt;
    if (b.st === 'paw') { if (b.st0 > 1.2) { B.bstate('charge'); game.audio.sfx('bullBellow'); } else if (Math.floor(b.st0 * 2.5) !== Math.floor((b.st0 - dt) * 2.5)) game.audio.sfx('bullSnort'); }
    else if (b.st === 'charge') {
      b.v = sp; b.x -= sp * dt; const front = h.x + h.w / 2 * h.face, d = b.headX() - front, t = h.T;
      if (t && h.st === 'tech' && h.ph === 'a' && t.pts && d >= 8 && d <= 40 && !h.hitDone) {
        h.hitDone = true;
        if (t.bull) { B.bstate('stopped'); game.audio.sfx('bullThud'); game.audio.sfx('dizzy'); game.shake(4); game.particles.impact(b.headX(), 0, 26, 1.4, '#ffe070'); const perfect = Math.abs(d - 24) <= 6; B.points += 3000 + (perfect ? 1000 : 0); B.say(perfect ? 'PERFECT THUD!' : 'THUD!'); B.popup(b.headX(), 30, String(3000 + (perfect ? 1000 : 0))); B.perfects = (B.perfects || 0) + (perfect ? 1 : 0); b.v = 0; return; }
      }
      if (d < 2) { if (B.cheat || DEV.invincible) { B.bstate('stopped'); B.points += 3000; return; } B.bstate('trample'); h.hurt(-1, true, false); h.z = 0; game.audio.sfx('thwackFull'); game.audio.sfx('bullBellow'); B.say('TRAMPLED!'); B.state = 'over'; B.endT = B.t; game.shake(5); }
    } else if (b.st === 'stopped') { if (b.st0 > 1.5) B.bstate('walkBack'); }
    else if (b.st === 'walkBack') { b.v = 60; b.x += 60 * dt; if (b.x >= 420) { b.x = 420; B.charge++; if (B.charge >= (B.params.charges || [1, 1, 1]).length) { B.state = 'over'; B.endT = B.t; if (B.perfects === 3) { B.points += 2000; B.callout('perfect'); } else B.say('BULL STOPPED!'); } else B.bstate('paw'); } }
  },
  draw(B, r) { B.bull.draw(r); },
  hud(B, g, W, H) { T(g, 'CHARGE ' + Math.min(3, B.charge + 1) + ' / ' + (B.params.charges || [1, 1, 1]).length, W / 2 - 30, 56, '#e8e0ff'); if (B.state === 'play') { const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'L:d' : 'key:S', '+'], [d === 'pad' ? 'R:u' : 'key:I', 'UPPER PUNCH'], [d === 'pad' ? 'R:r' : 'key:L', 'FRONT KICK']], W / 2, H - 40); T(g, 'HIT THE HEAD AS IT ARRIVES: 5 TECHNIQUES WORK', W / 2 - TW('HIT THE HEAD AS IT ARRIVES: 5 TECHNIQUES WORK') / 2, H - 54, '#c8c0e0'); } },
  auto(B) { const b = B.bull, h = B.hero; if (b.st !== 'charge' || !h.free()) return KC.NEUTRAL; const front = h.x + h.w / 2, d = b.headX() - front, lead = b.v * (U.steps(KC.TECH.frontKick.f[0]) / 120) / h.spd(); return d < lead + 26 ? { posture: 'n', press: 'r' } : KC.NEUTRAL; }
};
const approach = E.approach;
KC.BONUS_KINDS = { boards: BOARDS, pots: POTS, bull: BULL };

// ---- 50-scenes.js ----
/* ---- SCENES I: title and main menu, the touch gate, the Champon Road, cutscenes, VS cards, promotions, continue,
 * game over, ending and credits, initials, records, about, the dojo and bonus menus ---- */
const scenes = KC.scenes = {};
const cab = KC.cab = new E.Arcade(game, { id: 'karate-champon', hud: false, idle: 999 });
const SC = (o) => Object.assign({ view: 'side', input: KC_KEYS, touch: [], camera: { zoom: false }, propSize: 1.4 }, o);
// a portrait rig per speaker (cutscenes): Mei in her apron, Genkotsu the referee
KC.portraits = {};
KC.portrait = id => {
  if (KC.portraits[id]) return KC.portraits[id];
  let rig;
  if (id === 'genkotsu') rig = new Referee().rig;
  else if (id === 'meiApron') rig = KC.MEI_FAN;
  else { const k = new Karateka(id, 0); rig = k.rig; }
  return (KC.portraits[id] = rig);
};

/* ---- the attract-mode idle timer: 10 s with no input on the title or any menu starts it; any input exits ---- */
KC.Attract = {
  idle: 0, on: false,
  poke() { this.idle = 0; },
  anyInput() {
    if (KC._raw) { KC._raw = false; return true; }   // any key, button or tap, bound or not (raw page events)
    const I = game.input; if (I.anyPressed()) return true;
    const p = I.pointer && I.pointer(); if (p && this._lp && (p[0] !== this._lp[0] || p[1] !== this._lp[1])) { this._lp = p.slice(); return true; } if (p) this._lp = p.slice();
    if (I.clicked && I.clicked()) return true;
    if (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3) return true; if (I.padAim) return true;
    for (const q of game.players.slice(1)) if (q.anyPressed()) return true;
    return false;
  },
  tick(dt) { if (this.anyInput()) this.idle = 0; else this.idle += dt; if (this.idle >= 10 && !SESSION) { this.idle = 0; game.go('attract', { loop: (this.loop = (this.loop || 0) + 1) }); return true; } return false; }
};

/* ---- the touch-only gate ---- */
KC.touchOnly = () => { try { return typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches === false && (navigator.maxTouchPoints || 0) > 0 && !KC._gateLifted; } catch (e) { return false; } };
if (typeof addEventListener === 'function') { for (const ev of ['keydown', 'pointerdown', 'touchstart', 'wheel']) addEventListener(ev, () => { KC._raw = true; }, { capture: true }); addEventListener('keydown', () => { KC._gateLifted = true; }); addEventListener('gamepadconnected', () => { KC._gateLifted = true; }); }
game.input.touchEnabled = false;

/* ---- TITLE + MAIN MENU ---- */
const titleStage = new Stage('dojo');
let titleFighters = null;
const mainItems = () => {
  const save = KC.store('save');
  return [
    { label: () => 'CONTINUE', hidden: !save || save.done, fn: () => KC.Story.resume(), id: 'continue' },
    { label: 'CHAMPON ROAD', fn: () => KC.Story.newGame(), id: 'road' },
    { label: 'VERSUS', fn: () => game.go('versus'), id: 'versus' },
    { label: 'DOJO', fn: () => game.go('dojoMenu'), id: 'dojo' },
    { label: 'BONUS GAMES', fn: () => game.go('bonusMenu'), id: 'bonus' },
    { label: 'RECORDS', fn: () => game.go('records'), id: 'records' },
    { label: 'OPTIONS', fn: () => game.menu('settings'), id: 'options' },
    { label: 'ABOUT', fn: () => game.go('about'), id: 'about' }
  ];
};
const VIGNETTE = { continue: 'PICK UP YOUR CLIMB', road: 'WHITE BELT TO CHAMP. 9 MATCHES.', versus: '2 PLAYERS. 3-4: WINNER STAYS ON', dojo: 'LESSONS, FREE SPAR, MOVE LIST', bonus: 'BOARDS, POTS AND A BULL', records: 'THE TOP TEN', options: 'DIFFICULTY, CALLS, CAMERA...', about: 'SOURCE, CREDITS, FEEDBACK' };
scenes.title = SC({
  enter(d) {
    KC.applyMaps(); titleStage.enter(); game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players.length);
    titleFighters = [new Karateka('taro', 0, { x: 160 }), new Karateka('mei', 1, { x: 240 })]; titleFighters[1].setBelt('gold');
    this.mode = d && d.menu ? 'menu' : 'press'; this.t = 0; this.menu = new Menu(mainItems(), { onCancel: () => { this.mode = 'press'; } }); this.bowT = 0;
    KC.music('title'); KC.Attract.poke(); game.timeScale = 1;
  },
  update(dt) {
    this.t += dt; titleStage.update(dt); this.bowT += dt;
    titleFighters.forEach((f, i) => { if (this.bowT > 6) { f.setPose('bow'); } if (f.st === 'pose' && f.stT > 1.1) { f.st = 'idle'; f.poseName = null; } f.face = i ? -1 : 1; f.update(dt); });
    if (this.bowT > 6.2) this.bowT = 0;
    KC.stageCam(titleFighters);
    if (KC.Attract.tick(dt)) return;
    if (KC.touchOnly()) { if (game.input.clicked && game.input.clicked()) KC.Attract.poke(); return; }
    if (this.mode === 'press') { if (game.input.pressed('start') || game.input.pressed('confirm') || (game.input.clicked && game.input.clicked())) { KC.sfx('menuOk'); this.mode = 'menu'; this.menu.items = mainItems(); game.input.consumeAll(); } return; }
    if (game.input.pressed('dev') && DEV.enabled) KC.Dev.open();
    this.menu.update(dt);
  },
  draw(r) {
    titleStage.draw(r); titleFighters.forEach(f => f.draw(r));
    r.overlay(g => {
      const W = r.W, H = r.H, ca = game.cornerArea && game.cornerArea();
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0614'));
      const menu = this.mode === 'menu', ly = menu ? 4 : 14, s1 = menu ? 2 : 3, s2 = menu ? 3 : 4; KC.title(g, 'KARATE', W / 2, ly, s1, ['#fffbe8', '#ffe08a', '#e0662a']);
      KC.title(g, 'CHAMPON', W / 2, ly + (menu ? 18 : 28), s2, ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a']);
      // the O of CHAMPON is a noodle bowl: chopsticks and steam
      const ow = TW('CHAMPON', { scale: s2 }), ox = W / 2 - ow / 2 + TW('CHAMP', { scale: s2 }) + 3 * s2, oy = ly + (menu ? 40 : 58);
      px.line(g, ox + 2, oy - 22, ox + 14, oy - 6, '#c8302a', 2); px.line(g, ox + 6, oy - 24, ox + 16, oy - 8, '#e8b860', 2);
      for (let k = 0; k < 3; k++) { const sy = oy - 26 - ((this.t * 14 + k * 6) % 16); px.blend(g, .5, 'add', () => px.rect(g, ox - 4 + k * 5 + Math.round(Math.sin(this.t * 3 + k) * 2), sy, 1, 4, '#ffffff')); }
      T(g, E.versionLabel().replace(/·/g, '-') + ' - GAME ' + KC.VERSION, 4, H - 10, '#6a6488', { font: 'tiny' });
      if (KC.touchOnly()) {
        box(g, W / 2 - 130, H / 2 + 6, 260, 44); KC.title(g, 'CONTROLLER OR KEYBOARD', W / 2, H / 2 + 12, 2); KC.title(g, 'REQUIRED', W / 2, H / 2 + 30, 2);
        T(g, 'SETTINGS: THE MENU BUTTON, TOP RIGHT', W / 2 - TW('SETTINGS: THE MENU BUTTON, TOP RIGHT') / 2, H / 2 + 56, '#c8c0e0'); return;
      }
      if (this.mode === 'press') { if (Math.floor(this.t * 2) % 2 === 0) { const gl = KC.dev() === 'pad' ? 'btn:OPTIONS' : 'key:ENTER'; KC.promptRow(g, [[gl, 'PRESS START']], W / 2, H * .62, 13); } T(g, '© 2026 KARATE CHAMPON. INSPIRED BY KARATE CHAMP (1984)', W / 2 - TW('© 2026 KARATE CHAMPON. INSPIRED BY KARATE CHAMP (1984)') / 2, H - 24, '#a89ac8'); return; }
      this.menu.draw(g, W / 2 - (W > 380 ? 60 : 0), 56, { scale: 2, lh: Math.min(24, Math.floor((H - 82) / Math.max(1, this.menu.items.filter(i => !i.hidden).length))) });
      if (W > 380) { const it = this.menu.sel, v = VIGNETTE[it && it.id] || ''; box(g, W - 132, 62, 124, 50, { alpha: .8 }); E.font.text(g, v, W - 126, 68, '#e8e0ff', { wrap: 112, shadow: '#000', outline: false }); const save = KC.store('save'); if (it && it.id === 'continue' && save) T(g, KC.RANKS[save.rank][0] + ' · ' + (KC.STAGE[KC.DATA.ladder[save.node].stage] || {}).name, W - 126, 98, '#ffd060', { font: 'tiny' }); }
      KC.bar(g, [[KC.ok(), 'SELECT'], [KC.back(), 'BACK']]);
    });
  }
});

/* ---- THE STORY: the Champon Road state, its ladder, saves and the flow between nodes ---- */
KC.Story = {
  s: null,
  newGame() { this.s = { node: 0, rank: 0, score: 0, conts: 0, lostRounds: {}, easier: false, done: false, stats: { full: 0, half: 0, perfect: 0 } }; this.save(); this.go(); },
  resume() { const s = KC.store('save'); if (!s) return this.newGame(); this.s = s; this.go(); },
  save() { if (this.s) KC.store('save', this.s); },
  node() { return KC.DATA.ladder[this.s.node]; },
  add(pts) { if (this.s) this.s.score += pts; },
  hi() { const t = cab.table('story'); return Math.max(t.length ? t[0].score : 0, this.s ? this.s.score : 0); },
  /** go to the current node */
  go() {
    const n = this.node(); if (!n) return game.go('title');
    if (n.kind === 'cutscene') return game.go('cutscene', { script: n.script, stage: n.stage, then: () => this.done() });
    if (n.kind === 'practice') return game.go('practice', { lesson: n.lesson, story: true });
    if (n.kind === 'ending') { return game.go('cutscene', { script: 'ending', stage: 'stadium', ending: true, then: () => { this.s.done = true; this.save(); KC.unlock('mei'); KC.unlock('classic'); game.go('credits', { story: true }); } }); }
    game.go('road');
  },
  /** the road's GO: a node's pre-cutscene, then its VS card or bonus */
  start() {
    const n = this.node(), next = () => n.kind === 'match' ? game.go('vs', { node: n }) : game.go('bonus', { kind: n.bonus, story: true, visit: this.s.node });
    if (n.pre && !DEV.skipCut) game.go('cutscene', { script: n.pre, stage: n.stage, then: next }); else next();
  },
  done() { this.s.node++; this.s.lostRounds = {}; this.s.easier = false; this.save(); this.go(); },
  matchWon(res) {
    const n = this.node(), s = this.s; s.stats.full += res.full || 0; s.stats.half += res.half || 0;
    if (n.unlock) KC.unlock(n.unlock);
    const after = () => game.go('promotion', { rank: n.promote, then: () => this.done() });
    if (n.post && !DEV.skipCut) game.go('cutscene', { script: n.post, stage: n.stage, then: after }); else after();
  },
  matchLost() { game.go('continue'); },
  gameOver() { game.go('gameover', { score: this.s.score, mode: 'story', rank: this.s.rank }); KC.store('save', null); }
};

/* ---- THE CHAMPON ROAD SCREEN: a painted scroll from the dojo to the stadium ---- */
const ROAD_X = n => 40 + n * 60;
scenes.road = SC({
  enter() { this.t = 0; this.cam = 0; this.hover = -1; KC.music('select'); game.lights.enabled = false; game.weather = null; },
  update(dt) {
    this.t += dt; const s = KC.Story.s, i = s.node; this.cam = lerp(this.cam, ROAD_X(i) - game.W / 2, Math.min(1, dt * 3));
    const p = game.input.pointer && game.input.pointer(), c = game.input.clicked && game.input.clicked();
    this.hover = -1; if (p) KC.DATA.ladder.forEach((n, k) => { const x = ROAD_X(k) - this.cam, y = this.nodeY(k); if (Math.abs(p[0] - x) < 14 && Math.abs(p[1] - y) < 14) this.hover = k; });
    if (game.input.pressed('confirm') || (c && this.hover === i)) { KC.sfx('menuOk'); KC.Story.start(); }
    if (game.input.pressed('cancel')) { game.go('title', { menu: true }); }
  },
  nodeY(k) { return Math.round(game.H * .5 + Math.sin(k * 1.3) * 22); },
  draw(r) {
    r.sky(['#2a1a10', '#6a4a2a', '#c8a070']);
    r.overlay(g => {
      const W = r.W, H = r.H, s = KC.Story.s, L = KC.DATA.ladder;
      px.rect(g, 0, 40, W, H - 80, '#e8d8b0'); for (let y = 44; y < H - 40; y += 6) px.rect(g, 0, y, W, 1, '#dccca4'); px.rect(g, 0, 38, W, 4, '#6a3a1a'); px.rect(g, 0, H - 42, W, 4, '#6a3a1a');
      // the painted road
      for (let k = 0; k < L.length - 1; k++) { const a = [ROAD_X(k) - this.cam, this.nodeY(k)], b = [ROAD_X(k + 1) - this.cam, this.nodeY(k + 1)]; px.line(g, a[0], a[1], b[0], b[1], k < s.node ? '#8a5a2a' : '#b8a078', 3); }
      L.forEach((n, k) => {
        const x = ROAD_X(k) - this.cam, y = this.nodeY(k); if (x < -30 || x > W + 30) return;
        const done = k < s.node, next = k === s.node, rr = n.kind === 'match' ? 10 : 7, pulse = next ? 2 + Math.round(Math.sin(this.t * 6) * 2) : 0;
        px.disc(g, x, y, rr + pulse + 2, '#3a2010'); px.disc(g, x, y, rr + pulse, done ? '#8a6a3a' : next ? '#e8402a' : '#f4ecd8');
        if (n.kind === 'match') { const f = KC.ROSTER[n.opponent]; if (done) { px.rect(g, x - 6, y - 2, 12, 4, BELT[KC.RANKS[n.promote][1]]); } else T(g, f.name[0], x - 2, y - 3, next ? '#fff' : '#3a2010', { shadow: null }); }
        else if (n.kind === 'bonus') { if (n.bonus === 'boards') px.rect(g, x - 5, y - 2, 10, 4, '#c89a5a'); else if (n.bonus === 'pots') px.ell(g, x, y, 4, 5, '#b8683a'); else { px.rect(g, x - 5, y - 2, 10, 5, '#4a2e22'); px.rect(g, x - 6, y - 4, 2, 2, '#e8dcc0'); px.rect(g, x + 4, y - 4, 2, 2, '#e8dcc0'); } }
        else T(g, n.kind === 'practice' ? 'L' : n.kind === 'ending' ? '★' : '•', x - 2, y - 3, '#3a2010', { shadow: null });
        if (k === this.hover || next) { const lab = n.label; T(g, lab, x - TW(lab) / 2, y + rr + 6, next ? '#a8301a' : '#4a3020', { shadow: null }); }
      });
      const n = KC.Story.node(), st = KC.STAGE[n.stage];
      KC.title(g, 'THE CHAMPON ROAD', W / 2, 8, 2);
      const line = 'NEXT: ' + (st ? st.name : '') + (n.opponent ? ' — ' + KC.ROSTER[n.opponent].full : n.kind === 'bonus' ? ' — ' + KC.DATA.bonus[n.bonus].title : '');
      T(g, line, W / 2 - TW(line, BIG) / 2, H - 78, '#3a1a08', Object.assign({ shadow: null }, BIG));
      T(g, KC.RANKS[s.rank][0], 10, 46, '#3a1a08', { shadow: null }); px.rect(g, 10, 56, 30, 4, BELT[KC.RANKS[s.rank][1]]);
      T(g, 'SCORE ' + U.pad(s.score, 7), W - 10 - TW('SCORE 0000000'), 46, '#3a1a08', { shadow: null });
      // the rank road: ten belts from white to Champ
      for (let k = 0; k < 10; k++) { const x = W / 2 - 100 + k * 20; px.rect(g, x, H - 54, 16, 5, BELT[KC.RANKS[k][1]]); if (k === s.rank) { px.rect(g, x - 1, H - 56, 18, 1, '#e8402a'); px.rect(g, x - 1, H - 48, 18, 1, '#e8402a'); } }
      KC.bar(g, [[KC.ok(), 'GO'], [KC.back(), 'TITLE']]);
    });
  }
});

/* ---- CUTSCENES: title cards and lines with portraits and gibberish voices ---- */
scenes.cutscene = SC({
  enter(d) {
    this.d = d; this.done = false; this.lines = (KC.SCRIPTS[d.script] || []).slice(); this.i = -1; this.t = 0; this.stage = new Stage(d.stage || 'harbor', { mei: false }); this.stage.enter();
    this.talk = new E.Dialog(game, { speed: 40 }); this.card = null;
    const who = new Set(this.lines.map(l => l[0]).filter(w => w !== 'CARD'));
    this.actors = [...who].filter(w => w !== 'genkotsu').map((w, i) => { const k = new Karateka(w, i % 2, { x: i % 2 ? 250 : 150 }); if (w === 'mei') k.setBelt(d.script === 'finalEntrance' || d.ending ? 'gold' : 'white'); return k; });
    if (who.has('genkotsu')) this.ref = new Referee(); else this.ref = null;
    if (d.ending) { const tr = this.actors.find(a => a.id === 'taro'); if (tr) tr.setBelt('gold'); }
    KC.music(d.ending ? 'ending' : d.script === 'finalEntrance' ? 'stadium' : 'practice');
    if (DEV.skipCut) { game.after(.05, () => this.finish()); return; }
    this.next();
  },
  next() {
    this.i++; const L = this.lines[this.i]; if (!L) return this.finish();
    const [who, text] = L;
    if (who === 'CARD') { this.card = { text, t: 0 }; KC.Voice.speak(text, 'genkotsu'); return; }
    this.card = null; const name = who === 'genkotsu' ? 'JUDGE GENKOTSU' : KC.ROSTER[who].full;
    KC.Voice.speak(text, who);
    this.talk.say([text], { name, portrait: KC.portrait(who === 'mei' && this.d.script === 'harborMei' ? 'meiApron' : who), onDone: () => this.next() });
    const a = this.actors.find(a => a.id === who); if (a) { a.setPose(text.includes('!') ? 'win' : 'hips'); }
  },
  finish() { if (this.done) return; this.done = true; const then = this.d.then; if (then) then(); else game.go('title'); },
  update(dt) {
    this.t += dt; this.stage.update(dt); this.actors.forEach(a => { if (a.st === 'pose' && a.stT > 1.2) { a.st = 'idle'; a.poseName = null; } a.update(dt); }); if (this.ref) this.ref.update(dt, 200);
    KC.stageCam(this.actors.length ? this.actors : [{ x: 200 }]);
    if (game.input.pressed('start') || game.input.pressed('pause')) { game.input.consumeAll(); this.talk.close && this.talk.close(); return this.finish(); }
    if (this.card) { this.card.t += dt; if (this.card.t > 2.2 || (this.card.t > .4 && (game.input.pressed('confirm') || (game.input.clicked && game.input.clicked())))) { game.input.consumeAll(); this.next(); } return; }
    this.talk.update(dt);
  },
  draw(r) {
    this.stage.draw(r); this.actors.forEach(a => a.draw(r)); if (this.ref) this.ref.draw(r);
    if (this.d.ending) r.shape('goldenBowl', 200, -10, 0, { scale: 1.3 });
    this.talk.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.card) { px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); const n = Math.floor(this.card.t * 30); KC.title(g, this.card.text.slice(0, n), W / 2, H / 2 - 10, this.card.text.length > 22 ? 2 : 3); }
      KC.promptRow(g, [[KC.ok(), 'NEXT'], [KC.startG(), 'SKIP']], W / 2, 6, 10);
    });
  }
});

/* ---- VS CARD: split panels, the taunt typed with its voice ---- */
scenes.vs = SC({
  enter(d) { this.d = d; this.t = 0; const n = d.node; this.p = [new Karateka('taro', 0), new Karateka(n.opponent, 1)]; this.p[0].setBelt(KC.RANKS[KC.Story.s.rank][1]); KC.Voice.speak(KC.ROSTER[n.opponent].quotes.intro, n.opponent); game.audio.sfx('gong'); KC.music(null); },
  update(dt) { this.t += dt; this.p.forEach(f => f.update(dt)); if (this.t > 3 || (this.t > .6 && (game.input.pressed('confirm') || game.input.pressed('start')))) { game.input.consumeAll(); const n = this.d.node; game.go('fight', { mode: 'story', stage: n.stage, white: 'taro', red: n.opponent, node: n }); } },
  draw(r) {
    r.sky(['#05040a', '#05040a']);
    r.overlay(g => {
      const W = r.W, H = r.H, k = Math.min(1, this.t * 4), n = this.d.node, f = KC.ROSTER[n.opponent];
      px.poly(g, [[0, 0], [W / 2 + 20 - (1 - k) * W, 0], [W / 2 - 20 - (1 - k) * W, H], [0, H]], '#e8e4dc'); px.poly(g, [[W, 0], [W / 2 + 20 + (1 - k) * W, 0], [W / 2 - 20 + (1 - k) * W, H], [W, H]], '#a8201a');
      this.p[0].rig.drawPortrait(g, W * .25 - 40, 40, 80, { zoom: 3, turn: .5, bg: '#c8c4bc', frame: true });
      this.p[1].rig.drawPortrait(g, W * .75 - 40, 40, 80, { zoom: 3, turn: -.5, bg: '#781410', frame: true });
      T(g, 'TARO', W * .25 - TW('TARO', BIG) / 2, 126, '#1a1418', Object.assign({ shadow: null }, BIG)); T(g, KC.RANKS[KC.Story.s.rank][0], W * .25 - TW(KC.RANKS[KC.Story.s.rank][0]) / 2, 146, '#3a2a20', { shadow: null });
      T(g, f.full, W * .75 - TW(f.full, BIG) / 2, 126, '#fff6e8', BIG); T(g, f.title, W * .75 - TW(f.title) / 2, 146, '#ffd0c0');
      KC.title(g, 'VS', W / 2, H / 2 - 20, 4);
      const q = f.quotes.intro, nn = Math.floor(Math.max(0, this.t - .3) * 28); box(g, 20, H - 56, W - 40, 26, { alpha: .9 }); T(g, '"' + q.slice(0, nn) + (nn < q.length ? '' : '"'), W / 2 - TW('"' + q + '"') / 2, H - 48, '#fff6d0');
      T(g, KC.STAGE[n.stage].name, W / 2 - TW(KC.STAGE[n.stage].name) / 2, H - 22, '#c8c0e0');
    });
  }
});

/* ---- PROMOTION: Genkotsu presents the belt; it flies to the waist; the rank road lights up ---- */
scenes.promotion = SC({
  enter(d) {
    this.d = d; this.t = 0; this.stage = new Stage('dojo'); this.stage.enter(); this.hero = new Karateka('taro', 0, { x: 170 }); this.hero.setBelt(KC.RANKS[d.rank - 1 >= 0 ? d.rank - 1 : 0][1]); this.ref = new Referee();
    const s = KC.Story.s; s.rank = Math.max(s.rank, d.rank); const bonus = 1000 * d.rank; KC.Story.add(bonus); this.bonus = bonus; KC.Story.save();
    KC.music(null); KC.sting('promotion'); KC.Voice.speak('PROMOTED! ' + KC.RANKS[d.rank][0], 'genkotsu'); this.tied = false;
  },
  update(dt) {
    this.t += dt; this.stage.update(dt); this.ref.update(dt, 230); this.hero.update(dt); KC.stageCam([this.hero, { x: 230 }]);
    if (this.t > 1.2 && !this.tied) { this.tied = true; this.hero.setBelt(KC.RANKS[this.d.rank][1]); game.audio.sfx('beltTie'); game.particles.glints(this.hero.x, 0, 30, 12, '#ffe070'); this.hero.setPose('win'); KC.Voice.speak('OSU!', 'taro'); }
    if (this.t > 1.2) this.ref.signal('winner', 0);
    if (this.t > 4.2 || (this.t > 1.5 && (game.input.pressed('confirm') || game.input.pressed('start')))) { game.input.consumeAll(); this.d.then(); }
  },
  draw(r) {
    this.stage.draw(r); this.hero.draw(r); this.ref.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, rk = KC.RANKS[this.d.rank];
      if (this.t < 1.2) { const k = this.t / 1.2, s = r.w(lerp(230, this.hero.x, k), 0, lerp(70, 30, k)); px.rect(g, s[0] - 8, s[1] - 2, 16, 4, BELT[rk[1]]); if (rk[1] === 'gold' || rk[1] === 'black') px.rect(g, s[0] - 8, s[1] - 2, 16, 1, '#ffffff'); }
      KC.title(g, 'PROMOTED!', W / 2, 30, 3); KC.title(g, rk[0], W / 2, 60, 2, ['#ffffff', BELT[rk[1]] === '#16161c' ? '#8a8aa0' : BELT[rk[1]], '#3a3a4a']);
      for (let k = 0; k < 10; k++) { const x = W / 2 - 110 + k * 22, on = k === this.d.rank && Math.floor(this.t * 4) % 2; px.rect(g, x, H - 48, 18, 6, BELT[KC.RANKS[k][1]]); if (k <= this.d.rank) px.rect(g, x, H - 40, 18, 1, '#ffd060'); if (on) px.rect(g, x - 2, H - 50, 22, 10, '#ffffff'); }
      T(g, 'RANK BONUS +' + this.bonus, W / 2 - TW('RANK BONUS +' + this.bonus) / 2, H - 30, '#ffd060');
    });
  }
});

/* ---- CONTINUE? 10 s; GAME OVER; initials ---- */
scenes['continue'] = SC({
  enter() { this.t = 10; this.stage = new Stage('harbor'); this.stage.enter(); this.hero = new Karateka('taro', 0, { x: 190 }); this.hero.setPose('lose'); this.lastBeep = 10; KC.music('continue'); KC.Voice.speak('GET UP, MOYASHI!', 'mei');
    const n = KC.Story.node(); this.menu = new Menu([{ label: 'CONTINUE', fn: () => this.pick(false) }, { label: 'CONTINUE (EASIER)', fn: () => this.pick(true), hidden: KC.diff() === 'Easy' && !KC.Story.s.easier }, { label: 'GIVE UP', fn: () => KC.Story.gameOver() }]); this.tip = KC.ROSTER[n.opponent] && KC.ROSTER[n.opponent].tip; },
  pick(easier) { const s = KC.Story.s; s.score = 0; s.conts++; s.easier = easier || s.easier; KC.Story.save(); KC.Story.start(); },
  update(dt) { this.t -= dt; this.stage.update(dt); this.hero.update(dt); KC.stageCam([this.hero]); if (Math.ceil(this.t) < this.lastBeep) { this.lastBeep = Math.ceil(this.t); KC.sfx('countBeep'); } if (this.t <= 0) return KC.Story.gameOver(); this.menu.update(dt); },
  draw(r) {
    this.stage.draw(r); this.hero.draw(r);
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, 'CONTINUE?', W / 2, 24, 3); KC.title(g, String(Math.max(0, Math.ceil(this.t) - 1)), W / 2, 56, 5, ['#ffffff', '#ff8060', '#c02020']);
      T(g, 'MEI: "GET UP, MOYASHI!"', W / 2 - TW('MEI: "GET UP, MOYASHI!"') / 2, 108, '#ffd0e0'); if (this.tip) T(g, 'TIP: ' + this.tip, W / 2 - TW('TIP: ' + this.tip) / 2, 120, '#a8e8ff');
      this.menu.draw(g, W / 2, 140); KC.bar(g, [[KC.ok(), 'SELECT']]); });
  }
});
scenes.gameover = SC({
  enter(d) { this.d = d; this.t = 0; this.stage = new Stage('harbor'); this.stage.enter(); game.weather = { kind: 'rain', amount: .7, wind: .1 }; this.hero = new Karateka('taro', 0, { x: 190 }); this.hero.setPose('kneel'); KC.music('gameover'); KC.Voice.speak('TRAIN. RETURN.', 'genkotsu'); },
  update(dt) { this.t += dt; this.stage.update(dt); this.hero.update(dt); KC.stageCam([this.hero]); if (this.t > 4 || (this.t > 1 && (game.input.pressed('confirm') || game.input.pressed('start')))) { game.input.consumeAll(); KC.initials(this.d.score, this.d.mode, () => game.go('title')); } },
  draw(r) { this.stage.draw(r); this.hero.draw(r); r.overlay(g => { KC.title(g, 'GAME OVER', r.W / 2, r.H * .3, 4, ['#ffffff', '#a0a0c0', '#4a4a6a']); T(g, 'GENKOTSU: "TRAIN. RETURN."', r.W / 2 - TW('GENKOTSU: "TRAIN. RETURN."') / 2, r.H * .3 + 44, '#c8c0e0'); }); }
});
/** the initials entry when the score makes the top ten (never while tuning values are changed: dev mode) */
KC.initials = (score, mode, then) => { if (score > 0 && cab.qualifies(score, mode) && !KC.tuneChanged()) game.go('initials', { score, mode, then }); else then(); };
scenes.initials = SC({
  enter(d) { this.d = d; KC.music('select'); cab.enter(d.score, d.mode, () => { this.done = true; }); this.done = false; },
  update(dt) { cab.update(dt); if (this.done) { this.done = false; game.go('records', { mode: this.d.mode, then: this.d.then }); } },
  draw(r) { r.sky(['#10081a', '#2a1440']); r.overlay(g => { KC.title(g, 'NEW RECORD!', r.W / 2, 20, 3); T(g, 'ENTER YOUR INITIALS', r.W / 2 - TW('ENTER YOUR INITIALS') / 2, 52, '#e8e0ff'); }); cab.draw(r); }
});

/* ---- ENDING CREDITS: the cast parade, each bowing with their name ---- */
const CREDITS = ['KARATE CHAMPON', 'AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984)', 'DESIGN, CODE, ART, MUSIC AND VOICES: CLAUDE (ANTHROPIC)', 'ENGINE: MY-3D2DGE V0.85.2', 'PLAN: PLAN.MD', 'THANK YOU FOR PLAYING. OSU!'];
scenes.credits = SC({
  enter(d) { this.d = d || {}; this.t = 0; this.stage = new Stage('stadium'); this.stage.enter(); this.cast = KC.DATA.roster.map((f, i) => new Karateka(f.id, i % 2, { x: -40 })); this.i = 0; KC.music('ending'); },
  update(dt) {
    this.t += dt; this.stage.update(dt); const per = 2.2, k = Math.floor(this.t / per);
    this.cast.forEach((c, i) => { const u = this.t / per - i; if (u < 0) { c.x = -60; return; } c.x = u < .4 ? lerp(-60, 200, u / .4) : u < 1 ? 200 : lerp(200, 460, (u - 1) / .4); c.st = u < .4 || u > 1 ? 'walk' : 'pose'; c.vx = 70; c.poseName = 'bow'; c.stT = (u - .4) * per; c.face = 1; c.update(dt); });
    KC.stageCam([{ x: 200 }]);
    if (this.t > this.cast.length * per + 6 || (this.t > 1 && game.input.pressed('start'))) { game.input.consumeAll(); if (this.d.story) KC.initials(KC.Story.s.score, 'story', () => game.go('title')); else game.go(this.d.back || 'title', { menu: true }); }
  },
  draw(r) {
    this.stage.draw(r); this.cast.forEach(c => c.draw(r));
    r.overlay(g => { const W = r.W, H = r.H, per = 2.2, k = Math.floor(this.t / per), c = this.cast[k]; if (c) { const f = KC.ROSTER[c.id]; KC.title(g, f.full, W / 2, H * .2, 3); T(g, f.title, W / 2 - TW(f.title) / 2, H * .2 + 30, '#ffd0c0'); }
      const ci = Math.floor(this.t / 3) % CREDITS.length; T(g, CREDITS[ci], W / 2 - TW(CREDITS[ci]) / 2, H - 30, '#e8e0ff'); KC.promptRow(g, [[KC.startG(), 'SKIP']], W - 60, 6, 10); });
  }
});

/* ---- RECORDS: one table per page; L1/R1, Q/E or click the tabs ---- */
const REC_MODES = [['story', 'CHAMPON ROAD'], ['boards', 'BOARDS'], ['pots', 'POTS AHOY!'], ['bull', 'STOP THE BULL']];
scenes.records = SC({
  enter(d) { this.d = d || {}; this.i = Math.max(0, REC_MODES.findIndex(m => m[0] === this.d.mode)); this.t = 0; KC.music('select'); },
  update(dt) {
    this.t += dt; if (KC.Attract.tick(dt)) return; const I = game.input, c = I.clicked && I.clicked();
    if (I.pressed('l1') || I.pressed('left')) { this.i = (this.i + 3) % 4; KC.sfx('menuMove'); } if (I.pressed('r1') || I.pressed('right')) { this.i = (this.i + 1) % 4; KC.sfx('menuMove'); }
    if (c && c[1] < 40) { const k = Math.floor(c[0] / (game.W / 4)); if (k >= 0 && k < 4) { this.i = k; KC.sfx('menuMove'); } }
    if (I.pressed('cancel') || I.pressed('confirm') || (c && c[1] > game.H - 20)) { if (this.d.then) this.d.then(); else game.go('title', { menu: true }); }
  },
  draw(r) {
    r.sky(['#10081a', '#2a1440', '#3a1a30']);
    r.overlay(g => {
      const W = r.W, H = r.H, m = REC_MODES[this.i], tb = cab.table(m[0]);
      REC_MODES.forEach((mm, k) => { const x = k * W / 4, on = k === this.i; box(g, x + 2, 4, W / 4 - 4, 22, { alpha: on ? .95 : .5, border: on ? '#ffd060' : '#5a5070' }); T(g, mm[1], x + W / 8 - TW(mm[1]) / 2, 11, on ? '#ffd060' : '#a8a0c0'); });
      KC.title(g, m[1], W / 2, 34, 2);
      for (let k = 0; k < 10; k++) { const e = tb[k], y = 54 + k * 16, col = k === 0 ? '#ffd060' : '#f4ecd8'; T(g, (k + 1) + '.', W / 2 - 110, y, col, BIG); T(g, e ? e.name : '---', W / 2 - 70, y, col, BIG); T(g, e ? U.pad(e.score, 7) : '-------', W / 2 + 10, y, col, BIG); }
      KC.bar(g, [[KC.dev() === 'pad' ? 'btn:L1' : 'key:Q', ''], [KC.dev() === 'pad' ? 'btn:R1' : 'key:E', 'PAGE'], [KC.back(), 'BACK']]);
    });
  }
});

/* ---- ABOUT: paged, at most 8 lines a page (the same text as the chat reply and exit-interview.json) ---- */
KC.aboutPages = () => {
  const A = KC.ABOUT, pages = [], wrapW = Math.min(game.W - 48, 400), push = (title, lines) => { const all = []; for (const l of lines) all.push(...E.font.wrap(l, wrapW)); for (let i = 0; i < all.length; i += 8) pages.push({ title: title + (all.length > 8 ? ' ' + (i / 8 + 1) + '/' + Math.ceil(all.length / 8) : ''), lines: all.slice(i, i + 8) }); };
  const si = A.sourceInformation, L = { date: 'DATE', source: 'SOURCE', plan: 'PLAN', genre: 'GENRE', perspective: 'PERSPECTIVE', tech: 'TECH', artDirection: 'ART DIRECTION', animation: 'ANIMATION', audio: 'AUDIO', online: 'ONLINE', testing: 'TESTING', research: 'RESEARCH', environment: 'ENVIRONMENT', model: 'MODEL', usage: 'USAGE' };
  push('SOURCE INFORMATION', Object.keys(L).map(k => L[k] + ': ' + si[k]));
  const TQ = ['ISSUES CAUGHT', 'CRITICAL', 'MOST HELPFUL TEST', 'LEAST HELPFUL TEST'], EQ = ['LIKED MOST', 'STUCK OR GUESSED WRONG', 'BUILT MYSELF', 'HARDEST PART', 'ENGINE CHANGES', 'ONE CHANGE'], PQ = ['LIKED MOST', 'CONFUSING', 'HARDEST', 'WOULD CHANGE'];
  push('TESTING FEEDBACK', A.testingFeedback.map((a, i) => TQ[i] + ': ' + a));
  push('ENGINE FEEDBACK', A.engineFeedback.map((a, i) => EQ[i] + ': ' + a));
  push('PROMPT FEEDBACK', A.promptFeedback.map((a, i) => PQ[i] + ': ' + a));
  push('CREDITS', ['GAME: KARATE CHAMPON, AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (DATA EAST, 1984).', 'MADE BY CLAUDE (ANTHROPIC, CLAUDE-OPUS-5-5) FOR MICHAEL CROSATO.', 'ENGINE: MY-3D2DGE V0.85.2 (MIT), EXTENDED.', 'ONLINE: AI HUB SESSION CLIENT 1.4.0.', 'ALL ART, MUSIC, SOUND AND VOICES ARE GENERATED IN CODE.', 'THANKS: THE ARCADE PIONEERS OF 1984.']);
  return pages;
};
scenes.about = SC({
  enter(d) { this.d = d || {}; this.p = 0; this.pages = KC.aboutPages(); KC.music('select'); },
  update(dt) {
    if (KC.Attract.tick(dt)) return; const I = game.input, c = I.clicked && I.clicked();
    if (I.repeat('right', .35, .12) || I.pressed('r1') || I.pressed('confirm') || (c && c[0] > game.W / 2 && c[1] < game.H - 20)) { this.p = Math.min(this.pages.length - 1, this.p + 1); KC.sfx('menuMove'); }
    if (I.repeat('left', .35, .12) || I.pressed('l1') || (c && c[0] <= game.W / 2 && c[1] < game.H - 20)) { this.p = Math.max(0, this.p - 1); KC.sfx('menuMove'); }
    if (I.pressed('cancel') || (c && c[1] >= game.H - 20)) game.go(this.d.back || 'title', { menu: true });
  },
  draw(r) {
    r.sky(['#0a0814', '#1a1030']);
    r.overlay(g => { const W = r.W, H = r.H, pg = this.pages[this.p]; KC.title(g, pg.title, W / 2, 10, 2); box(g, 14, 34, W - 28, H - 60, { alpha: .9 });
      pg.lines.forEach((l, i) => { const k = l.indexOf(': '), head = /^[A-Z][A-Z .]+: /.test(l) ? l.slice(0, k + 2) : ''; T(g, head, 22, 44 + i * 19, '#ffd060'); T(g, l.slice(head.length), 22 + TW(head), 44 + i * 19, '#f4ecd8'); });
      T(g, (this.p + 1) + ' / ' + this.pages.length, W - 60, H - 40, '#a8a0c0'); KC.bar(g, [[KC.dev() === 'pad' ? 'L:l' : 'key:A', ''], [KC.dev() === 'pad' ? 'L:r' : 'key:D', 'PAGE'], [KC.back(), 'BACK']]); });
  }
});

/* ---- the DOJO and BONUS GAMES menus ---- */
const menuScene = (title, items, sub) => SC({
  enter() { this.menu = new Menu(items(), { onCancel: () => game.go('title', { menu: true }) }); this.stage = new Stage(sub); this.stage.enter(); this.f = [new Karateka('negi', 1, { x: 260 }), new Karateka('taro', 0, { x: 140 })]; KC.music(sub === 'dojo' ? 'practice' : 'bonus'); KC.Attract.poke(); },
  update(dt) { this.stage.update(dt); this.f.forEach(f => f.update(dt)); KC.stageCam(this.f); if (KC.Attract.tick(dt)) return; this.menu.update(dt); },
  draw(r) { this.stage.draw(r); this.f.forEach(f => f.draw(r)); r.overlay(g => { px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0614')); KC.title(g, title, r.W / 2, 16, 3); this.menu.draw(g, r.W / 2, 64); KC.bar(g, [[KC.ok(), 'SELECT'], [KC.back(), 'BACK']]); }); }
});
scenes.dojoMenu = menuScene('DOJO', () => [
  { label: 'LESSON I: BASICS', fn: () => game.go('practice', { lesson: 'I' }) }, { label: 'LESSON II: STEP IN', fn: () => game.go('practice', { lesson: 'II' }) },
  { label: 'LESSON III: SPINS', fn: () => game.go('practice', { lesson: 'III' }) }, { label: 'ALL TECHNIQUES (21)', fn: () => game.go('practice', { lesson: 'ALL' }) },
  { label: 'FREE SPAR', fn: () => game.go('fight', { mode: 'freeSpar', stage: 'dojo', white: 'taro', red: 'negi' }) }, { label: 'MOVE LIST', fn: () => KC.MoveList.open('dojoMenu') }], 'dojo');
let bonusDiff = 1;
scenes.bonusMenu = menuScene('BONUS GAMES', () => [
  { label: 'BREAK THE BOARDS', fn: () => game.go('bonus', { kind: 'boards', diff: bonusDiff }) }, { label: 'POTS AHOY!', fn: () => game.go('bonus', { kind: 'pots', diff: bonusDiff }) },
  { label: 'STOP THE BULL', fn: () => game.go('bonus', { kind: 'bull', diff: bonusDiff }) },
  { label: () => '← ' + ['EASY', 'NORMAL', 'HARD'][bonusDiff] + ' →', adjust: d => { bonusDiff = clamp(bonusDiff + d, 0, 2); }, fn: () => { bonusDiff = (bonusDiff + 1) % 3; } }], 'courtyard');

// ---- 51-attract.js ----
/* ---- ATTRACT MODE: after 10 s without input on the title or any menu. A looping, AI-played demo that cheats freely:
 * 1 an exhibition bout whose director forces a half point, a block and counter, an aiuchi, a sweep, a somersault
 * cross-up and a time-out hantei; 2 a bonus reel (a perfect board break, Pots Ahoy! with perfect reads and a bowl catch,
 * one bull charge); 3 HOW TO FIGHT (Senpai demonstrates every technique with its stick prompts); 4 the high scores;
 * 5 the title. Any input exits to the title. Deterministic per loop index. ---- */
Object.assign(KC.Attract, {
  step: null, t: 0,
  start(loop) { this.on = true; this.loop = loop || 1; this.t = 0; this.visited = []; this.exhibition(); },
  stop() { if (!this.on) return; this.on = false; this.step = null; game.audio.musicVolume = game.settings.music; game.audio.applyVolume(); game.timeScale = 1; },
  mark(step) { this.step = step; this.visited.push(step); this.t = 0; game.audio.musicVolume = game.settings.music * .5; game.audio.applyVolume(); },
  exitCheck() { if (this.anyInput()) { this.stop(); game.input.consumeAll(); game.go('title'); return true; } return false; },
  banner(r) { if (!this.on) return; r.overlay(g => { const W = r.W, H = r.H; if (Math.floor(game.real * 2) % 2 === 0) { box(g, W / 2 - 90, H - 34, 180, 18, { bg: ['#5a1010', '#2a0808'], border: '#ffd060' }); T(g, 'DEMO — PRESS START', W / 2 - TW('DEMO — PRESS START') / 2, H - 29, '#fff6d0'); } }); },
  exhibition() {
    this.mark('bout'); const r = U.rng(this.loop * 31 + 7), ids = KC.DATA.roster.map(f => f.id), st = KC.FIGHT_STAGES[this.loop % KC.FIGHT_STAGES.length];
    const a = ids[Math.floor(r() * ids.length)], b = ids.filter(x => x !== a)[Math.floor(r() * (ids.length - 1))], dir = KC.Director(), self = this;
    game.go('fight', { mode: 'attract', stage: st, white: a, red: b, ctrl: [dir.ctl(0), dir.ctl(1)], rounds: 1, points: 5, clock: 99, seed: this.loop, intro: true, onOver: () => self.bonusReel(), director: dir });
  },
  bonusReel() {
    this.mark('bonus'); const self = this;
    game.go('bonus', { kind: 'boards', auto: true, cheat: true, params: { n: 7, mat: 'tile' }, onDone: () => {
      game.go('bonus', { kind: 'pots', auto: true, cheat: true, visit: this.loop, params: { n: 12 }, onDone: () => {
        game.go('bonus', { kind: 'bull', auto: true, cheat: true, params: { charges: [170] }, onDone: () => self.howTo() }); } }); } });
  },
  howTo() { this.mark('howto'); const self = this; game.go('practice', { lesson: 'ALL', autopilot: true, onDone: () => self.scores() }); game.after(30, () => { if (this.on && this.step === 'howto') self.scores(); }); },
  scores() { this.mark('scores'); game.go('attractScores'); }
});
scenes.attract = SC({ enter(d) { KC.Attract.start(d && d.loop); }, update() {}, draw(r) { r.sky(['#000', '#000']); } });
scenes.attractScores = SC({
  enter() { this.t = 0; this.title = false; KC.music('title'); },
  update(dt) { this.t += dt; if (this.t >= 6 && !this.title) { this.title = true; KC.Attract.mark('title'); } if (this.t > 11) { KC.Attract.loop++; KC.Attract.exhibition(); } },
  draw(r) {
    if (this.t < 6) { r.sky(['#10081a', '#2a1440']); r.overlay(g => { const W = r.W, tb = cab.table('story'); KC.title(g, 'HIGH SCORES', W / 2, 10, 3); for (let k = 0; k < 10; k++) { const e = tb[k], y = 46 + k * 15; T(g, (k + 1) + '. ' + (e ? e.name : '---') + '   ' + (e ? U.pad(e.score, 7) : '-------'), W / 2 - 90, y, k ? '#f4ecd8' : '#ffd060', BIG); } }); }
    else { r.sky(['#1a1018', '#2a1a20']); r.overlay(g => { KC.title(g, 'KARATE', r.W / 2, r.H * .25, 3); KC.title(g, 'CHAMPON', r.W / 2, r.H * .25 + 28, 4); T(g, 'TWO STICKS. ONE CLEAN STRIKE.', r.W / 2 - TW('TWO STICKS. ONE CLEAN STRIKE.') / 2, r.H * .6, '#ffd060'); }); }
  }
});

/* the exhibition's director: scripted exchanges, each from the marks. It cheats: it sets the clock and the score. */
KC.Director = () => {
  const D = { ex: 0, t: 0, phase: null, shown: {} };
  const EX = [
    // 1. red walks in and lands a front kick: HALF POINT
    { w: [['wait', 9]], r: [['walkTo', 20], ['tech', 'frontKick']] },
    // 2. red round kick, white blocks, then counters with a middle lunge in red's recoil: COUNTER, FULL POINT
    { w: [['react', 'block'], ['wait', .25], ['tech', 'midLunge']], r: [['walkTo', 24], ['tech', 'roundKick']] },
    // 3. both strike on the same step: AIUCHI
    { w: [['walkTo', 22], ['sync', 'frontKick']], r: [['walkTo', 22], ['sync', 'frontKick']] },
    // 4. white sweeps: unblockable, knocked down
    { w: [['walkTo', 18], ['tech', 'frontSweep']], r: [['wait', 9]] },
    // 5. red somersaults over white (a cross-up), turns and strikes white in recovery
    { w: [['wait', .55], ['tech', 'roundKick']], r: [['walkTo', 40], ['tech', 'frontFlip'], ['land'], ['wait', .05], ['tech', 'frontKick']] },
    // 6. the clock runs down with both feinting: TIME, then the judges decide (the director evens the score)
    { setup: B => { B.clock = 6; B.points = [Math.max(...B.points), Math.max(...B.points)]; }, w: [['feint']], r: [['feint']] }
  ];
  D.reset = B => { D.prog = [0, 0]; D.t = 0; D.tsub = [0, 0]; D.syncT = 0; const e = EX[D.ex]; if (e && e.setup) e.setup(B); };
  D.ctl = side => (f, foe, B) => {
    if (B.phase !== 'fight') return KC.NEUTRAL;
    if (D.boutPhaseSeen !== B.steps && side === 0) { D.boutPhaseSeen = B.steps; }
    const e = EX[Math.min(D.ex, EX.length - 1)], script = side ? e.r : e.w, i = D.prog[side], cmd = script[i];
    const toward = Math.sign(foe.x - f.x) || f.face, scr = d => d === 't' ? (toward > 0 ? 'r' : 'l') : d === 'a' ? (toward > 0 ? 'l' : 'r') : d;
    const next = () => { D.prog[side]++; D.tsub[side] = 0; };
    D.tsub[side] += 1 / 120;
    if (!cmd) return KC.NEUTRAL;
    const tech = id => { const t = KC.TECH[id]; next(); return { posture: scr(t.L), press: scr(t.R) }; };
    switch (cmd[0]) {
      case 'wait': if (D.tsub[side] >= cmd[1]) next(); return KC.NEUTRAL;
      case 'walkTo': if (f.gapTo(foe) <= cmd[1] || D.tsub[side] > 3) { next(); return KC.NEUTRAL; } return { posture: scr('t'), press: null };
      case 'tech': return f.free() || (f.st === 'tech' && f.ph === 'r') ? tech(cmd[1]) : KC.NEUTRAL;
      case 'react': if (foe.st === 'tech' && foe.ph === 's' && foe.T && foe.T.pts) return tech(cmd[1]); return KC.NEUTRAL;
      case 'land': if (f.grounded() && f.st !== 'tech') next(); return KC.NEUTRAL;
      case 'sync': {   // both strike on the same step: each fires its startup ahead of a shared moment
        if (!D.syncT) { const other = (side ? e.w : e.r)[D.prog[1 - side]]; if (!other || other[0] !== 'sync' || !f.free() || !foe.free()) return KC.NEUTRAL; const S = f.steps(0, KC.TECH[cmd[1]]), So = foe.steps(0, KC.TECH[other[1]]); D.syncS = side ? [So, S] : [S, So]; D.syncT = B.steps + 6 + Math.max(S, So); }
        if (B.steps >= D.syncT - D.syncS[side]) return tech(cmd[1]); return KC.NEUTRAL; }
      case 'feint': return { posture: Math.floor(D.tsub[side] * 2 + side) % 2 ? scr('t') : scr('a'), press: null };
    }
    return KC.NEUTRAL;
  };
  D.hook = B => {
    if (B.phase !== D.phase) { if (B.phase === 'ready') { if (D.phase === 'reset') D.ex++; D.reset(B); } D.phase = B.phase; D.shown[B.phase] = true; }
    if (B.phase === 'fight' && D.tsub[0] > 6 && D.tsub[1] > 6 && D.ex < EX.length - 1) { D.ex++; D.reset(B); }
  };
  return D;
};

// ---- 53-play.js ----
/* ---- SCENES II: the fight (every mode: story, versus, kachinuki, attract, free spar), bonus stages, practice drills,
 * versus setup, character and stage select, results, local Kachinuki, and the move list ---- */
const human = (pi) => (f, foe) => { const I = game.players[pi]; if (!I || KC.MoveList.active || game.paused) return KC.NEUTRAL; const it = KC.readIntent(I); if (it.press) { (f._inLog = f._inLog || []).push({ p: it.posture, r: it.press }); if (f._inLog.length > 12) f._inLog.shift(); } return it; };
KC.human = human;
const DUMMY_MODES = ['STAND', 'CROUCH', 'JUMP', 'BLOCK', 'ATTACK'];
const dummyCtl = (F) => { const ai = new KarateAI({ id: 'negi', level: 3, seed: 5 }); let t = 0; return (f, foe, b) => { t += 1 / 120; const m = DUMMY_MODES[F.dummy]; if (m === 'CROUCH') return { posture: 'd', press: null }; if (m === 'JUMP') return { posture: t % 1.4 < .05 ? 'u' : 'n', press: null }; if (m === 'BLOCK') { if (foe.st === 'tech' && foe.ph === 's' && foe.T && foe.T.pts) { const tw = Math.sign(foe.x - f.x) > 0 ? 'r' : 'l'; return { posture: tw === 'r' ? 'l' : 'r', press: tw }; } return KC.NEUTRAL; } if (m === 'ATTACK') return ai.control(f, foe, b); return KC.NEUTRAL; }; };

scenes.fight = SC({
  views: ['side', 'brawler'], pausable: !SESSION,
  enter(d) {
    KC.F = this; this.d = d; this.mode = d.mode; this.t = 0; this.result = null; this.perfect = false; this.score = null; this._auto = false; this.hintI = 0; this.tipT = 0; this.dummy = 0; this.kn = d.kachinuki || null;
    KC.applyMaps(); game.setView(game.settings.camera === 'Tatami 2.5D' ? 'brawler' : 'side');
    const story = this.mode === 'story', node = d.node, ladderI = story ? KC.DATA.ladder.indexOf(node) : -1;
    this.stage = new Stage(d.stage, { mei: story && KC.STAGE[d.stage].mei && ladderI > 5 && d.red !== 'mei' }); this.stage.enter();
    const pal = game.settings.palette === 'Classic' && (KC.unlocks().classic || DEV.unlocked) ? 'Classic' : 'Modern';
    const W = new Karateka(d.white, 0, { palette: pal }), R = new Karateka(d.red, 1, { palette: pal });
    if (story) { W.setBelt(KC.RANKS[KC.Story.s.rank][1]); R.setBelt(KC.ROSTER[d.red].belt); }
    if (d.red === 'mei' || d.white === 'mei') (d.red === 'mei' ? R : W).setBelt('gold');
    if (d.belts) { W.setBelt(d.belts[0]); R.setBelt(d.belts[1]); }
    const lvl = d.cpuLevel, cpu = d.cpu || (story ? [false, true] : this.mode === 'versus' ? [false, !game.players[1] || d.p2cpu] : [false, false]);
    this.cpu = cpu; this.ai = [null, null];
    const ctrl = [0, 1].map(i => {
      if (d.ctrl && d.ctrl[i]) return d.ctrl[i];
      if (this.mode === 'freeSpar' && i === 1) return dummyCtl(this);
      if (cpu[i]) { const ai = KC.cpuFor(i ? d.red : d.white, (d.seed || 11) + i * 101, lvl); if (story && KC.Story.s.easier) { ai.setLevel(ai.level - 2); } this.ai[i] = ai; return (f, foe, b) => ai.control(f, foe, b); }
      return human(d.pad && d.pad[i] !== undefined ? d.pad[i] : i);
    });
    this.bout = new Bout({ fighters: [W, R], ctrl, cpu, seed: d.seed || 1, stage: d.stage, roundsToWin: d.rounds, pointsToWin: d.points, clock: d.clock, spar: this.mode === 'freeSpar', intro: d.intro, online: this.mode === 'online' });
    const B = this.bout;
    B.on('point', p => { this.stage.react(p.full ? 'full' : 'point'); if (story && p.side === 0 && !p.spar) KC.Story.add(p.pts); if (this.mode === 'versus' || this.kn) (this.score = this.score || [0, 0])[p.side] += p.pts; });
    B.on('block', () => this.stage.react('block'));
    B.on('roundEnd', e => { if (story && e.winner === 0) KC.Story.add(e.bonus); if (story && e.winner === 1) { const s = KC.Story.s, id = node.id; s.lostRounds[id] = (s.lostRounds[id] || 0) + 1; if (s.lostRounds[id] >= 2 && KC.ROSTER[d.red].tip) this.tipT = 4; } KC.sting(e.winner === 0 || this.mode !== 'story' ? 'victory' : 'defeat'); });
    B.on('matchEnd', e => this.over(e));
    if (this.mode === 'freeSpar') { DEV.boxes = true; DEV.frames = true; }
    if (d.director) B.director = b => d.director.hook(b);
    KC.music(KC.STAGE[d.stage].music); game.timeScale = 1;
    if (this.kn) this.seiza = this.kn.queue.slice(2).map((pi, k) => { const f = new Karateka(this.kn.fighters[pi], k % 2, { x: k % 2 ? 420 + k * 6 : -20 - k * 6 }); f.setPose('seiza'); return f; });
  },
  exit() { game.timeScale = 1; if (this.mode === 'freeSpar') { DEV.boxes = false; DEV.frames = false; } game.setView('side'); },
  retry() { game.go('fight', this.d); },
  over(e) {
    const B = this.bout, w = e.winner;
    if (this.mode === 'story') { if (w === 0) { if (e.perfect) { KC.Story.add(5000); this.perfect = true; KC.sting('perfect'); } this.result = { t: 0, won: true, stats: e.stats[0] }; } else this.result = { t: 0, won: false }; }
    else if (this.mode === 'versus') this.result = { t: 0, versus: true, e };
    else if (this.kn) this.result = { t: 0, kn: true, w };
    else if (this.d.onOver) this.d.onOver(e);
  },
  update(dt) {
    const B = this.bout; this.t += dt;
    if (KC.MoveList.active) { KC.MoveList.update(dt); return; }
    game.timeScale = TUNE.gameSpeed * (B.slow > 0 ? .35 : 1) * (DEV.slowmo ? .25 : 1);
    if (B.phase === 'award' && game.input.pressed('start')) B.skip = true;
    if (this.mode === 'freeSpar') { if (game.input.pressed('l1') || game.input.pressed('r1')) { this.dummy = (this.dummy + (game.input.pressed('l1') ? 4 : 1)) % 5; KC.sfx('menuMove'); } const c = game.input.clicked && game.input.clicked(); if (c) { const s = game.r && game.r.w ? game.r.w(B.f[1].x, 0, 30) : null; if (s && Math.abs(c[0] - s[0]) < 24 && Math.abs(c[1] - s[1]) < 50) { this.dummy = (this.dummy + 1) % 5; KC.sfx('menuMove'); } } if (game.input.pressed('cancel')) return game.go('dojoMenu'); }
    if (game.input.pressed('dev') && DEV.enabled) KC.Dev.toggle();
    if (!(DEV.frameStep && !game.input.pressed('r1'))) B.update(dt);
    this.stage.update(dt); if (this.seiza) this.seiza.forEach(f => f.update(dt));
    KC.stageCam(B.f, game.view.id);
    if (this.tipT > 0) this.tipT -= dt;
    if (this.mode === 'story' && this.d.node && this.d.node.hints && game.settings.hints) this.hintI = Math.floor(this.t / 6) % KC.HINTS.length;
    if (this.result) {
      const R = this.result; R.t += dt;
      if (R.t > 2.2 || (R.t > .8 && game.input.pressed('start'))) {
        const res = this.result; this.result = null;
        if (this.mode === 'story') { if (res.won) KC.Story.matchWon(res.stats || {}); else KC.Story.matchLost(); }
        else if (res.versus) game.go('results', { e: res.e, d: this.d, score: this.score || [0, 0] });
        else if (res.kn) KC.Kachinuki.boutOver(this.kn, res.w, this.d);
      }
    }
  },
  draw(r) {
    const B = this.bout; this.stage.draw(r);
    if (this.seiza) this.seiza.forEach(f => f.draw(r));
    B.draw(r);
    if (DEV.boxes) r.overlay(g => B.f.forEach(f => { const a = r.w(f.x - f.w / 2, 0, f.z + (f.isLow() ? 34 : 56)), b = r.w(f.x + f.w / 2, 0, f.z); px.rect(g, a[0], a[1], b[0] - a[0], 1, '#5aff8a'); px.rect(g, a[0], b[1], b[0] - a[0], 1, '#5aff8a'); px.rect(g, a[0], a[1], 1, b[1] - a[1], '#5aff8a'); px.rect(g, b[0], a[1], 1, b[1] - a[1], '#5aff8a'); if (f.st === 'tech' && f.ph === 'a' && f.T && f.T.reach) { const [mn, mx] = f.reach(); const e = f.x + f.face * f.w / 2, h = f.T.height === 'high' || f.T.height === 'air' ? 48 : f.T.height === 'low' ? 10 : 32, c0 = r.w(e + f.face * mn, 0, h), c1 = r.w(e + f.face * mx, 0, h); px.rect(g, Math.min(c0[0], c1[0]), c0[1] - 2, Math.abs(c1[0] - c0[0]) + 1, 4, '#ff4a4a'); } }));
    const story = this.mode === 'story';
    KC.HUD.draw(r, B, { score: story ? KC.Story.s.score : undefined, hi: story ? KC.Story.hi() : 0, hint: story && this.d.node && this.d.node.hints && game.settings.hints && B.phase === 'fight' ? KC.HINTS[this.hintI] : null, names: this.d.names });
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.mode === 'freeSpar') { box(g, W / 2 - 120, H - 52, 240, 34, { alpha: .85 }); KC.title(g, 'DUMMY: ' + DUMMY_MODES[this.dummy], W / 2, H - 48, 1); KC.promptRow(g, [[KC.dev() === 'pad' ? 'btn:L1' : 'key:Q', ''], [KC.dev() === 'pad' ? 'btn:R1' : 'key:E', 'CHANGE (OR CLICK IT)'], [KC.back(), 'EXIT']], W / 2, H - 34, 10); const p = B.popups[B.popups.length - 1]; if (p && p.t < 1.4) KC.title(g, p.text, W / 2, 50, 2); }
      if (this.tipT > 0) { box(g, 20, H * .62, W - 40, 26, { bg: ['#1a3a5a', '#0a1a2a'], border: '#a8e8ff' }); const tip = 'TIP: ' + KC.ROSTER[this.d.red].tip; T(g, tip, W / 2 - TW(tip) / 2, H * .62 + 9, '#e8f8ff'); }
      if (this.kn) { const K = this.kn; T(g, 'KACHINUKI • STREAK ' + K.streak + ' • FIRST TO ' + K.target, W / 2 - TW('KACHINUKI • STREAK ' + K.streak + ' • FIRST TO ' + K.target) / 2, 46, '#ffd060'); }
      if (this.result) { const R = this.result; if (R.won) { KC.title(g, this.perfect ? 'PERFECT!' : 'YOU WIN!', W / 2, H * .55, 3); } else if (R.won === false) KC.title(g, 'DEFEATED', W / 2, H * .55, 3, ['#ffffff', '#a0a0c0', '#4a4a6a']); }
      if (this.ai[1] && DEV.thoughts) { const a = this.ai[1]; box(g, W - 150, 50, 142, 26, { alpha: .8 }); T(g, 'CPU L' + a.level + ': ' + a.thought, W - 146, 54, '#a8ffa8'); T(g, 'REACT ' + a.react.toFixed(2) + ' READ ' + a.readP.toFixed(2), W - 146, 64, '#a8ffa8'); }
      if (DEV.frameStep) T(g, 'FRAME STEP: ' + (KC.dev() === 'pad' ? 'R1' : 'E') + ' ADVANCES', W / 2 - 60, H - 70, '#ff8a6a');
    });
    if (KC.MoveList.active) KC.MoveList.draw(r);
  }
});

/* ---- BONUS ---- */
const BONUS_DIFF = { boards: [{ n: 3, mat: 'pine' }, { n: 5, mat: 'pine' }, { n: 7, mat: 'tile' }, { n: 10, mat: 'ice' }], pots: [{ v0: 120, v1: 180, i0: 1.6, i1: 1 }, {}, { v0: 180, v1: 270, i0: 1.2, i1: .65 }], bull: [{ charges: [130, 160, 200] }, {}, { charges: [180, 230, 280] }] };
scenes.bonus = SC({
  pausable: true,
  enter(d) {
    this.d = d; const P = KC.DATA.bonus[d.kind], kind = KC.BONUS_KINDS[d.kind], diff = d.diff === undefined ? 1 : d.diff;
    const params = Object.assign({}, P, (BONUS_DIFF[d.kind] || [])[d.kind === 'boards' ? [0, 1, 3][diff] : diff] || {}, d.params || {});
    this.stage = new Stage(P.stage); this.stage.enter(); KC.applyMaps();
    const hero = new Karateka('taro', 0, { x: 170 }); if (KC.Story.s && d.story) hero.setBelt(KC.RANKS[KC.Story.s.rank][1]);
    const B = this.B = { kind: d.kind, K: kind, params, hero, t: 0, points: 0, visit: d.visit || 0, msgs: [], pops: [], cheat: !!d.cheat, auto: !!d.auto,
      say: (txt) => { B.msgs.push({ text: txt, t: 0 }); KC.Voice.speak(txt, 'genkotsu', { call: 'raw' }); },
      callout: (id, extra) => { if (id) { B.msgs.push({ text: KC.calls(id), t: 0 }); KC.Voice.speak(KC.calls(id), 'genkotsu', { call: id }); } if (extra) B.msgs.push({ text: extra, t: -.6 }); if (id === 'perfect') KC.sting('perfect'); },
      popup: (x, z, text) => B.pops.push({ x, z, text, t: 0 }),
      finish: () => this.finish(), bstate: st => { B.bull.st = st; B.bull.st0 = 0; } };
    kind.start(B); this.done = false; KC.music('bonus');
    B.msgs.push({ text: 'BONUS STAGE!', t: 0 }); B.msgs.push({ text: P.title, t: -.8 }); KC.Voice.speak('BONUS STAGE! ' + P.title, 'genkotsu');
  },
  finish() {
    if (this.done) return; this.done = true; const B = this.B, d = this.d;
    if (d.onDone) return d.onDone(B);
    if (d.story) { KC.Story.add(B.points); KC.Story.done(); return; }
    KC.initials(B.points, d.kind, () => game.go('bonusMenu'));
  },
  update(dt) {
    const B = this.B, h = B.hero; B.t += dt; this.stage.update(dt);
    if (KC.MoveList.active) { KC.MoveList.update(dt); return; }
    const I = game.input, auto = B.auto || this.d.autopilot;
    let it = auto ? B.K.auto(B) : KC.readIntent(I);
    if (B.kind === 'boards') { const ctl = auto ? B.K.auto(B) : { hold: I.down('tDown') }; B.K.update(B, dt, ctl); }
    else {
      const foe = B.kind === 'pots' ? (B.K.phantom(B) || { x: h.x + h.face * 50 }) : { x: B.bull ? B.bull.x : 400 };
      if (B.state === 'play' && h.st !== 'down' && h.st !== 'hurt') { h.control(it, foe, dt); } else if (h.st === 'idle' || h.st === 'walk') h.vx = 0;
      if (h.st === 'walk') { h.st = 'idle'; h.vx = 0; }   // (bonus stages: the hero holds the mark)
      h.step(dt, foe, [0, 400]); B.K.update(B, dt);
    }
    const extra = B.K.rig && B.K.rig(B, h);
    if (extra) h.rig.update(dt, Object.assign(h.rigState(), extra)); else h.update(dt);
    B.msgs.forEach(m => m.t += dt); B.msgs = B.msgs.filter(m => m.t < 1.6); B.pops.forEach(p => p.t += dt); B.pops = B.pops.filter(p => p.t < 1.2);
    KC.stageCam([h, { x: B.kind === 'bull' ? 260 : 200 }]);
  },
  draw(r) {
    const B = this.B; this.stage.draw(r); B.K.draw(B, r); B.hero.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, KC.DATA.bonus[B.kind].title, W / 2, 6, 2); T(g, 'BONUS ' + U.pad(B.points, 6), W / 2 - TW('BONUS 000000') / 2, 30, '#ffd060');
      B.K.hud(B, g, W, H, r);
      const m = B.msgs.filter(m => m.t >= 0)[0]; if (m) KC.title(g, m.text, W / 2, H * .3, m.text.length > 14 ? 2 : 3);
      for (const p of B.pops) { const s = r.w(p.x, 0, p.z + p.t * 20); T(g, p.text, s[0] - TW(p.text) / 2, s[1], '#ffe070', { outline: '#000' }); }
      if (B.state === 'over' && B.t - B.endT > .8) { box(g, W / 2 - 80, H * .5, 160, 30); KC.title(g, 'TOTAL ' + B.points, W / 2, H * .5 + 8, 2); }
    });
    if (KC.MoveList.active) KC.MoveList.draw(r);
  }
});

/* ---- PRACTICE: Senpai's drill. WATCH, then NOW YOU: copy the technique within 4 s ---- */
scenes.practice = SC({
  pausable: true,
  enter(d) {
    this.d = d; const L = this.L = KC.DATA.lessons[d.lesson]; this.stage = new Stage(L.stage); this.stage.enter(); KC.applyMaps();
    this.hero = new Karateka('taro', 0, { x: 140 }); this.senpai = new Karateka('negi', 1, { x: 270 }); if (KC.Story.s && d.story) this.hero.setBelt(KC.RANKS[KC.Story.s.rank][1]);
    this.i = 0; this.fin = false; this.crouchT = 0; this.youCrouch = 0; this.state = 'intro'; this.st = 0; this.points = 0; this.good = 0; this.misses = 0; this.msg = null; KC.music('practice');
    this.hero.onStart = (f, t) => this.attempt(t.id, f.reqTech); KC.Voice.speak(L.intro, 'negi'); this.msg = { text: L.intro, t: 0 };
  },
  setS(state) { this.state = state; this.st = 0; },
  attempt(id, req) {
    if (this.state !== 'you') return; const want = this.L.drills[this.i], W = KC.TECH[want], R = KC.TECH[req || id] || KC.TECH[id];
    // the drill checks the stick input: the same posture and technique cell (a reverse punch is front kick's cell, close in)
    const ok = id === want || (R && R.L === W.L && R.R === W.R);
    if (ok) { const sharp = this.st * 60 <= 50 * (1 / 1) && this.st < 50 / 60; const pts = sharp ? 400 : 200; this.points += pts; this.good++; this.say(sharp ? 'SHARP!' : 'GOOD!', 'negi'); game.audio.sfx('menuOk'); this.result = sharp ? 'sharp' : 'good'; this.setS('praise'); }
    else { this.misses++; this.say('NO. WATCH AGAIN.', 'negi'); game.audio.sfx('menuBack'); this.result = 'wrong'; this.setS('watch'); this.senpaiDo(); }
  },
  say(text, who) { this.msg = { text, t: 0 }; KC.Voice.speak(text, who); },
  senpaiDo() { const s = this.senpai, id = this.L.drills[this.i]; s.reset(270); s.face = -1; if (id === 'crouch') { s.st = 'crouch'; this.crouchT = .9; } else s.start(id, { x: 140 }); },
  update(dt) {
    this.st += dt; this.stage.update(dt); if (this.msg) this.msg.t += dt;
    if (KC.MoveList.active) { KC.MoveList.update(dt); return; }
    const I = game.input, h = this.hero, s = this.senpai, phantom = { x: 270, w: 16 };
    if (I.pressed('start') && this.state !== 'end') { game.input.consumeAll(); this.say('SKIP.', 'negi'); this.next(); }
    if (this.state === 'intro' && this.st > 1.6) { this.setS('watch'); this.senpaiDo(); this.say('WATCH.', 'negi'); }
    else if (this.state === 'watch' && this.st > 1.4 && s.st !== 'tech') { this.setS('you'); this.say('NOW YOU.', 'negi'); h.reset(140); }
    else if (this.state === 'you') {
      if (this.L.drills[this.i] === 'crouch' && h.st === 'crouch') { this.youCrouch = (this.youCrouch || 0) + dt; if (this.youCrouch > .3) { this.youCrouch = 0; this.attempt('crouch'); } }
      if (this.st > 4 && !(this.misses >= 3)) { this.misses++; this.say('WATCH AGAIN.', 'negi'); this.setS('watch'); this.senpaiDo(); }
    }
    else if (this.state === 'praise' && this.st > 1.2) this.next();
    else if (this.state === 'end' && this.st > 3) this.finish();
    if (this.crouchT > 0) { this.crouchT -= dt; if (this.crouchT <= 0) s.st = 'idle'; }
    const intent = this.state === 'you' || this.state === 'watch' || this.state === 'praise' ? (this.d.autopilot ? this.autoIntent() : KC.readIntent(I)) : KC.NEUTRAL;
    h.control(intent, phantom, dt); if (h.st === 'walk') { h.st = 'idle'; h.vx = 0; }
    h.step(dt, phantom, [0, 400]); s.step(dt, { x: 140 }, [0, 400]); if (s.st === 'idle' || s.st === 'walk') s.x = lerp(s.x, 270, dt * 4); if (h.st === 'idle') h.x = lerp(h.x, 140, dt * 4);
    h.update(dt); s.update(dt); KC.stageCam([h, s]);
  },
  autoIntent() { if (this.state !== 'you' || this.st < .2 || !this.hero.free()) return KC.NEUTRAL; const t = KC.TECH[this.L.drills[this.i]], scr = d => d === 't' ? 'r' : d === 'a' ? 'l' : d; return { posture: scr(t.L), press: t.kind === 'crouch' ? null : scr(t.R) }; },
  next() { this.i++; this.misses = 0; this.result = null; if (this.i >= this.L.drills.length) { this.setS('end'); this.say('LESSON COMPLETE.', 'negi'); this.senpai.setPose('bow'); } else { this.setS('watch'); this.senpaiDo(); } },
  finish() {
    if (this.fin) return; this.fin = true;
    if (this.d.onDone) return this.d.onDone(this);
    if (this.d.story) { KC.Story.add(this.points); const sc = 'lessonEnd' + this.d.lesson; if (KC.SCRIPTS[sc] && !DEV.skipCut) game.go('cutscene', { script: sc, stage: this.L.stage, then: () => KC.Story.done() }); else KC.Story.done(); return; }
    game.go('dojoMenu');
  },
  draw(r) {
    this.stage.draw(r); this.hero.draw(r); this.senpai.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, t = KC.TECH[this.L.drills[this.i]];
      if (this.state !== 'end' && t) {
        box(g, W / 2 - 150, 6, 300, 44, { alpha: .9 }); const title = this.L.title + '-' + (this.i + 1) + ': ' + t.name; T(g, title, W / 2 - TW(title) / 2, 11, '#ffd060');
        const items = KC.promptFor(t.id, KC.dev()); KC.promptRow(g, items, W / 2, 26, 13);
        if (this.misses >= 3 && Math.floor(this.st * 3) % 2 === 0) { const hint = KC.hintFor(t); box(g, W / 2 - 150, 54, 300, 16, { bg: ['#3a2a0a', '#1a1404'], border: '#ffd060' }); T(g, hint, W / 2 - TW(hint) / 2, 58, '#ffe8a0'); }
        if (this.state === 'you') { const left = Math.max(0, 4 - this.st); E.ui.bar(g, W / 2 - 50, 74, 100, 4, left / 4, '#5ab0ff'); }
      }
      if (this.msg && this.msg.t < 1.4) KC.title(g, this.msg.text, W / 2, H * .36, this.msg.text.length > 14 ? 2 : 3);
      if (this.state === 'end') { box(g, W / 2 - 100, H * .5, 200, 40); KC.title(g, 'LESSON COMPLETE ' + this.good + '/' + this.L.drills.length, W / 2, H * .5 + 6, 2); T(g, '+' + this.points, W / 2 - 12, H * .5 + 26, '#ffd060'); }
      T(g, 'POINTS ' + this.points, 8, H - 30, '#ffd060');
      KC.bar(g, [[KC.startG(), 'SKIP DRILL'], [KC.dev() === 'pad' ? 'btn:OPTIONS' : 'key:ESC', 'PAUSE']]);
    });
    if (KC.MoveList.active) KC.MoveList.draw(r);
  }
});
// prompts for a technique on a device: [['L:r', '+'], ['R:u', 'UPPER LUNGE PUNCH']]
KC.promptFor = (id, dev) => {
  const t = KC.TECH[id]; if (!t) return [];
  const pd = { n: null, t: 'r', a: 'l', u: 'u', d: 'd' }, kk = { u: 'W', d: 'S', l: 'A', r: 'D' }, rk = { u: 'I', d: 'K', l: 'J', r: 'L' };
  const L = pd[t.L], R = t.kind === 'crouch' ? null : pd[t.R];
  const out = [];
  if (dev === 'pad') { if (L) out.push(['L:' + L, '+']); if (R) out.push(['R:' + R, t.alt ? 'CLOSE IN' : '']); }
  else { if (L) out.push(['key:' + kk[L], '+']); if (R) out.push(['key:' + rk[R], t.alt ? 'CLOSE IN' : '']); }
  if (!R && t.kind === 'crouch') out.push([dev === 'pad' ? 'L:d' : 'key:S', 'HOLD']);
  return out;
};
KC.hintFor = t => { const P = { n: '', t: 'HOLD L TOWARD, ', a: 'HOLD L AWAY, ', u: 'PUSH L UP, ', d: 'HOLD L DOWN, ' }, R = { u: 'PUSH R UP', t: 'PUSH R TOWARD', d: 'PUSH R DOWN', a: 'PUSH R AWAY' }; return t.kind === 'crouch' ? 'HOLD L DOWN' : (P[t.L] + 'THEN ' + R[t.R]).replace(/^THEN /, ''); };

/* ---- VERSUS: setup (P2 joins, rules), select, stage select, results ---- */
const VS = KC.VS = { p2: 'cpu', level: 5, rounds: 2, points: 2, clock: 30, picks: ['taro', 'ebi'], stage: 'dojo', randomStage: false };
scenes.versus = SC({
  enter() {
    game.allowJoin({ max: 4, onJoin: () => { KC.applyMaps(); this.refresh(); } }); KC.applyMaps(); KC.music('select'); this.refresh(); KC.Attract.poke();
  },
  refresh() {
    const n = game.players.length;
    this.menu = new Menu([
      { label: () => n >= 3 ? 'START KACHINUKI (' + n + ' PLAYERS)' : 'CHARACTER SELECT', fn: () => n >= 3 ? KC.Kachinuki.startLocal() : game.go('select') },
      { label: () => 'RED: ' + (game.players[1] ? (VS.p2 === 'cpu' ? 'CPU' : 'PLAYER 2') : 'CPU'), adjust: () => { if (game.players[1]) VS.p2 = VS.p2 === 'cpu' ? 'human' : 'cpu'; }, fn: () => { if (game.players[1]) VS.p2 = VS.p2 === 'cpu' ? 'human' : 'cpu'; } },
      { label: () => 'CPU LEVEL: ' + VS.level, adjust: d => { VS.level = clamp(VS.level + d, 1, 10); }, fn: () => { VS.level = VS.level % 10 + 1; } },
      { label: () => 'ROUNDS TO WIN: ' + VS.rounds, adjust: d => { VS.rounds = clamp(VS.rounds + d, 1, 3); }, fn: () => { VS.rounds = VS.rounds % 3 + 1; } },
      { label: () => 'POINTS TO WIN: ' + VS.points, adjust: d => { VS.points = clamp(VS.points + d, 1, 5); }, fn: () => { VS.points = VS.points % 5 + 1; } },
      { label: () => 'CLOCK: ' + VS.clock, adjust: d => { const o = [30, 60, 99]; VS.clock = o[clamp(o.indexOf(VS.clock) + d, 0, 2)]; }, fn: () => { const o = [30, 60, 99]; VS.clock = o[(o.indexOf(VS.clock) + 1) % 3]; } }
    ], { onCancel: () => { game.allowJoin(false); game.go('title', { menu: true }); } });
    if (game.players[1] && this._n !== n) VS.p2 = 'human'; this._n = n;
  },
  update(dt) { if (KC.Attract.tick(dt)) return; KC.applyMaps(); this.menu.update(dt); },
  draw(r) {
    r.sky(['#1a0a10', '#3a1420', '#5a1a20']);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, 'VERSUS', W / 2, 8, 3);
      const n = game.players.length; game.players.forEach((p, i) => { box(g, 10 + i * (W - 20) / 4, 38, (W - 20) / 4 - 6, 20, { border: E.PLAYER_COLORS[i] }); T(g, p.name + ' ' + (p.device === 'gamepad' || p.lastDevice === 'gamepad' ? 'PAD' : p.half ? 'KEYS (HALF)' : 'KEYS'), 16 + i * (W - 20) / 4, 44, '#fff'); });
      if (n < 4) T(g, n < 2 ? 'PLAYER 2: PRESS 2 ON THE KEYBOARD OR OPTIONS ON A PAD' : 'MORE PLAYERS: OPTIONS ON A PAD (3-4 = KACHINUKI)', W / 2 - TW(n < 2 ? 'PLAYER 2: PRESS 2 ON THE KEYBOARD OR OPTIONS ON A PAD' : 'MORE PLAYERS: OPTIONS ON A PAD (3-4 = KACHINUKI)') / 2, 62, '#ff8a6a');
      this.menu.draw(g, W / 2, 80, { scale: 2 });
      if (game.players.some(q => q.half)) T(g, 'P1: WASD + T F G H    P2: ARROWS + I J K L', W / 2 - TW('P1: WASD + T F G H    P2: ARROWS + I J K L') / 2, H - 30, '#c8c0e0');
      KC.bar(g, [[KC.ok(), 'SELECT'], [KC.dev() === 'pad' ? 'L:l' : 'key:A', ''], [KC.dev() === 'pad' ? 'L:r' : 'key:D', 'CHANGE'], [KC.back(), 'BACK']]);
    });
  }
});
const SEL_IDS = KC.DATA.roster.map(f => f.id);
scenes.select = SC({
  enter() { this.cur = [SEL_IDS.indexOf(VS.picks[0]), SEL_IDS.indexOf(VS.picks[1])]; this.done = [false, false]; this.cpu2 = !game.players[1] || VS.p2 === 'cpu'; this.prev = SEL_IDS.map(id => new Karateka(id, 0)); this.t = 0; KC.music('select'); },
  cols() { return 5; },
  update(dt) {
    this.t += dt; this.prev.forEach(p => p.update(dt)); KC.applyMaps();
    const active = this.done[0] ? (this.cpu2 ? 0 : 1) : 0;
    const handle = (i, I) => {
      if (this.done[i]) { if (I.pressed('cancel')) { this.done[i] = false; KC.sfx('menuBack'); } return; }
      let c = this.cur[i]; if (I.repeat('left', .3, .1)) c = (c + 9) % 10; if (I.repeat('right', .3, .1)) c = (c + 1) % 10; if (I.repeat('up', .3, .1) || I.repeat('down', .3, .1)) c = (c + 5) % 10;
      if (c !== this.cur[i]) { this.cur[i] = c; KC.sfx('menuMove'); }
      if (I.pressed('confirm')) { if (KC.isUnlocked(SEL_IDS[c])) { this.done[i] = true; KC.sfx('menuOk'); KC.Voice.speak(KC.ROSTER[SEL_IDS[c]].quotes.intro, SEL_IDS[c]); } else KC.sfx('menuBack'); }
      if (I.pressed('cancel') && i === 0) game.go('versus');
    };
    if (this.cpu2) { handle(this.done[0] ? 1 : 0, game.input); }
    else { handle(0, game.players[0]); if (game.players[1]) handle(1, game.players[1]); }
    // the mouse: hover moves P1's (or the CPU pick's) cursor, a click picks
    const I = game.input, p = I.pointer && I.pointer(), c = I.clicked && I.clicked(), k = this.cellAt(c || p);
    if (k >= 0) { const who = this.done[0] && this.cpu2 ? 1 : 0; if (!this.done[who]) { if (k !== this.cur[who] && p && !c) { this.cur[who] = k; } if (c && KC.isUnlocked(SEL_IDS[k])) { this.cur[who] = k; this.done[who] = true; KC.sfx('menuOk'); } } }
    if (this.done[0] && this.done[1]) { VS.picks = [SEL_IDS[this.cur[0]], SEL_IDS[this.cur[1]]]; game.go('stageSelect'); }
  },
  cell(k) { const W = game.W, cw = 38, x0 = W / 2 - cw * 2.5; return [x0 + (k % 5) * cw, 120 + Math.floor(k / 5) * 46, cw - 4, 42]; },
  cellAt(p) { if (!p) return -1; for (let k = 0; k < 10; k++) { const [x, y, w, h] = this.cell(k); if (p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) return k; } return -1; },
  draw(r) {
    r.sky(['#0a0a1a', '#1a1438']);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, 'CHOOSE YOUR FIGHTER', W / 2, 6, 2);
      for (let k = 0; k < 10; k++) {
        const [x, y, w, h] = this.cell(k), id = SEL_IDS[k], lock = !KC.isUnlocked(id);
        this.prev[k].rig.drawPortrait(g, x, y, w, { zoom: 2.2, turn: .4, bg: '#2a2440', frame: true, tint: lock ? '#000000' : undefined });
        if (lock) KC.title(g, '?', x + w / 2, y + 12, 2); T(g, lock ? '???' : KC.ROSTER[id].name, x + w / 2 - TW(lock ? '???' : KC.ROSTER[id].name, { font: 'tiny' }) / 2, y + h - 6, '#fff', { font: 'tiny' });
        [0, 1].forEach(i => { if (this.cur[i] === k) { const c = i ? '#ff4a3a' : '#ffffff', pulse = this.done[i] ? 0 : Math.floor(this.t * 6) % 2; px.rect(g, x - 2 - pulse, y - 2 - pulse, w + 4 + pulse * 2, 2, c); px.rect(g, x - 2 - pulse, y + h - pulse, w + 4 + pulse * 2, 2, c); px.rect(g, x - 2 - pulse, y - 2, 2, h + 2, c); px.rect(g, x + w + pulse, y - 2, 2, h + 2, c); T(g, i ? (this.cpu2 ? 'CPU' : '2P') : '1P', x + (i ? w - 12 : 1), y + 1, c, { font: 'tiny' }); } });
      }
      // the big portraits each side: name, style, three stat bars
      [0, 1].forEach(i => { const id = SEL_IDS[this.cur[i]], f = KC.ROSTER[id], x = i ? W - 100 : 8, lock = !KC.isUnlocked(id); this.prev[this.cur[i]].rig.drawPortrait(g, x, 30, 84, { zoom: 3, turn: i ? -.5 : .5, bg: i ? '#5a1410' : '#c8c4bc', frame: true, tint: lock ? '#000000' : undefined });
        T(g, lock ? '???' : f.full, x, 118, i ? '#ff7060' : '#fff6e8', { scale: f.full.length > 9 ? 1 : 2 }); if (!lock) { T(g, f.style, x, 136, '#c8c0e0'); [['WALK', f.stats.walk], ['REACH', f.stats.reach], ['SPEED', f.stats.speed]].forEach(([n, v], k) => { T(g, n, x, 150 + k * 10, '#a8a0c0', { font: 'tiny' }); E.ui.bar(g, x + 34, 150 + k * 10, 50, 4, clamp((v - .8) / .35, 0, 1), i ? '#ff7060' : '#e8e4dc'); }); } });
      if (this.done[0] && this.cpu2 && !this.done[1]) T(g, 'NOW PICK THE CPU', W / 2 - TW('NOW PICK THE CPU') / 2, 28, '#ff8a6a');
      KC.bar(g, [[KC.ok(), 'PICK'], [KC.back(), 'BACK']]);
    });
  }
});
scenes.stageSelect = SC({
  enter() { this.list = KC.FIGHT_STAGES.concat(['random']); this.i = Math.max(0, this.list.indexOf(VS.stage)); this.make(); KC.music('select'); },
  make() { const id = this.list[this.i]; this.stage = new Stage(id === 'random' ? 'stadium' : id); this.stage.enter(); },
  update(dt) {
    this.stage.update(dt); KC.stageCam([{ x: 200 }]); const I = game.input, c = I.clicked && I.clicked(), n = this.list.length;
    let d = 0; if (I.repeat('left', .3, .12)) d = -1; if (I.repeat('right', .3, .12)) d = 1; if (c && c[1] < game.H - 20) { if (c[0] < 60) d = -1; else if (c[0] > game.W - 60) d = 1; else return this.go(); }
    if (d) { this.i = (this.i + d + n) % n; this.make(); KC.sfx('menuMove'); }
    if (I.pressed('confirm')) this.go(); if (I.pressed('cancel')) game.go('select');
  },
  go() { let id = this.list[this.i]; if (id === 'random') id = KC.FIGHT_STAGES[Math.floor(Math.random() * KC.FIGHT_STAGES.length)]; VS.stage = this.list[this.i]; KC.sfx('menuOk');
    const p2human = game.players[1] && VS.p2 === 'human'; game.go('fight', { mode: 'versus', stage: id, white: VS.picks[0], red: VS.picks[1], cpu: [false, !p2human], cpuLevel: VS.level, rounds: VS.rounds, points: VS.points, clock: VS.clock, seed: Math.floor(Math.random() * 1e6) }); },
  draw(r) { this.stage.draw(r); r.overlay(g => { const W = r.W, H = r.H, id = this.list[this.i], nm = id === 'random' ? 'RANDOM' : KC.STAGE[id].name; box(g, W / 2 - 110, 10, 220, 46, { alpha: .85 }); KC.title(g, nm, W / 2, 16, 2); T(g, '← ' + (this.i + 1) + '/' + this.list.length + ' →', W / 2 - 22, 40, '#ffd060'); KC.title(g, '←', 24, H / 2, 3); KC.title(g, '→', W - 24, H / 2, 3); KC.bar(g, [[KC.ok(), 'FIGHT HERE'], [KC.back(), 'BACK']]); }); }
});
scenes.results = SC({
  enter(d) { this.d = d; const e = d.e, w = e.winner; this.f = [new Karateka(d.d.white, 0), new Karateka(d.d.red, 1)]; this.f[w].setPose('win'); this.f[1 - w].setPose('lose'); this.stage = new Stage(d.d.stage); this.stage.enter(); KC.Voice.speak(KC.ROSTER[this.f[w].id].quotes.win, this.f[w].id);
    this.menu = new Menu([{ label: 'REMATCH', fn: () => game.go('fight', Object.assign({}, d.d, { seed: d.d.seed + 1 })) }, { label: 'CHARACTER SELECT', fn: () => game.go('select') }, { label: 'STAGE SELECT', fn: () => game.go('stageSelect') }, { label: 'MAIN MENU', fn: () => { game.allowJoin(false); game.go('title', { menu: true }); } }]); KC.music('select'); },
  update(dt) { this.stage.update(dt); this.f.forEach(f => f.update(dt)); KC.stageCam(this.f); this.menu.update(dt); },
  draw(r) {
    this.stage.draw(r); this.f.forEach(f => f.draw(r));
    r.overlay(g => { const W = r.W, H = r.H, e = this.d.e, w = e.winner, s = e.stats; px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0614'));
      KC.title(g, (w ? 'RED' : 'WHITE') + ' WINS ' + e.roundWins[w] + '-' + e.roundWins[1 - w], W / 2, 10, 3, w ? ['#ffe0d8', '#ff7060', '#c02020'] : TITLE_COLS);
      const lines = [['FULL POINTS', s[0].full, s[1].full], ['HALF POINTS', s[0].half, s[1].half], ['BLOCKS', s[0].blocks, s[1].blocks], ['BEST', s[0].best ? KC.TECH[s[0].best].short || KC.TECH[s[0].best].name : '-', s[1].best ? KC.TECH[s[1].best].short || KC.TECH[s[1].best].name : '-']];
      lines.forEach(([n, a, b], k) => { const y = 46 + k * 14; T(g, String(a), W / 2 - 150, y, '#fff6e8'); T(g, n, W / 2 - TW(n) / 2, y, '#ffd060'); T(g, String(b), W / 2 + 150 - TW(String(b)), y, '#ff7060'); });
      this.menu.draw(g, W / 2, 110); KC.bar(g, [[KC.ok(), 'SELECT']]); });
  }
});

/* ---- KACHINUKI (winner stays on): local 3-4 players, and the same rules online (60-online.js) ---- */
const KN_FIGHTERS = ['taro', 'ebi', 'ika', 'asari'];
KC.Kachinuki = {
  /** the rules: a queue in join order; white (queue[0]) vs red (queue[1]); the winner stays, the loser to the back */
  make(n, target) { return { queue: Array.from({ length: n }, (_, i) => i), wins: Array(n).fill(0), streak: 0, best: Array(n).fill(0), full: Array(n).fill(0), half: Array(n).fill(0), blocks: Array(n).fill(0), pts: Array(n).fill(0), conceded: Array(n).fill(0), target: target || 5, champion: -1, fighters: Array.from({ length: n }, (_, i) => KN_FIGHTERS[i % 4]), bouts: 0, holder: -1 }; },
  result(K, wSide) {
    const a = K.queue[0], b = K.queue[1], winner = wSide ? b : a, loser = wSide ? a : b; K.wins[winner]++; K.bouts++;
    K.streak = K.holder === winner ? K.streak + 1 : 1; K.holder = winner; K.best[winner] = Math.max(K.best[winner], K.streak);
    K.queue = [winner].concat(K.queue.filter(p => p !== winner && p !== loser), [loser]);
    if (K.wins[winner] >= K.target) K.champion = winner;
    return winner;
  },
  standings(K, ids) {
    const order = ids.slice().sort((x, y) => K.wins[y] - K.wins[x] || K.pts[y] - K.pts[x] || K.conceded[x] - K.conceded[y]), out = [];
    for (const p of order) { const last = out[out.length - 1], q = last && last[0]; if (last && K.wins[q] === K.wins[p] && K.pts[q] === K.pts[p] && K.conceded[q] === K.conceded[p]) last.push(p); else out.push([p]); }
    return out;
  },
  startLocal() { const n = game.players.length; this.K = this.make(n, 5); this.bout(this.K); },
  bout(K) { const a = K.queue[0], b = K.queue[1]; game.go('fight', { mode: 'kachinuki', kachinuki: K, stage: 'stadium', white: K.fighters[a], red: K.fighters[b], cpu: [false, false], pad: [a, b], rounds: 1, points: 2, names: ['P' + (a + 1), 'P' + (b + 1)], seed: K.bouts + 1, intro: K.bouts === 0 }); },
  boutOver(K, wSide, d) {
    const F = KC.F, B = F && F.bout, a = K.queue[0], b = K.queue[1];
    if (B) { [a, b].forEach((p, i) => { K.full[p] += B.f[i].stats.full; K.half[p] += B.f[i].stats.half; K.blocks[p] += B.f[i].stats.blocks; }); K.pts[a] += B.f[0].stats.full + B.f[0].stats.half * .5; K.pts[b] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[a] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[b] += B.f[0].stats.full + B.f[0].stats.half * .5; }
    this.result(K, wSide);
    if (K.champion >= 0) game.go('knResults', { K }); else this.bout(K);
  }
};
scenes.knResults = SC({
  enter(d) { this.K = d.K; this.menu = new Menu([{ label: 'AGAIN', fn: () => KC.Kachinuki.startLocal() }, { label: 'MAIN MENU', fn: () => { game.allowJoin(false); game.go('title', { menu: true }); } }]); KC.sting('victory'); KC.music('select'); },
  update(dt) { this.menu.update(dt); },
  draw(r) { r.sky(['#1a0a10', '#3a1420']); r.overlay(g => { const W = r.W, K = this.K; KC.title(g, 'P' + (K.champion + 1) + ' IS CHAMPION!', W / 2, 10, 3); KC.Kachinuki.standings(K, K.queue.slice().sort()).forEach((grp, k) => grp.forEach((p, j) => { const y = 44 + (k + j) * 14; T(g, (k + 1) + '. P' + (p + 1) + '  WINS ' + K.wins[p] + '  FULL ' + K.full[p] + '  HALF ' + K.half[p] + '  BEST STREAK ' + K.best[p], 30, y, E.PLAYER_COLORS[p]); })); this.menu.draw(g, W / 2, 120); }); }
});

/* ---- MOVE LIST: one posture row at a time; the four techniques around a big R-stick; R (or a click) previews ---- */
KC.MoveList = {
  active: false, row: 0, sel: null, back: null, t: 0,
  open(from) { if (from === 'dojoMenu' || from === 'title') { game.go('movelist', { back: from }); return; } this.active = true; this.row = 0; this.sel = null; this.t = 0; this.make(); game.input.consumeAll(); },
  make() { this.prev = new Karateka('taro', 0, { x: 200 }); this.phantom = { x: 250 }; },
  close() { this.active = false; game.input.consumeAll(); if (this.back) { const b = this.back; this.back = null; game.go(b); } },
  update(dt) {
    this.t += dt; const I = game.input, P = KC.POSTURES;
    if (I.repeat('up', .3, .12)) { this.row = (this.row + P.length - 1) % P.length; KC.sfx('menuMove'); } if (I.repeat('down', .3, .12)) { this.row = (this.row + 1) % P.length; KC.sfx('menuMove'); }
    const d = I.pressed('tUp') ? 'u' : I.pressed('tDown') ? 'd' : I.pressed('tLeft') ? 'a' : I.pressed('tRight') ? 't' : null;
    const c = I.clicked && I.clicked(); if (c && this.rects) for (const k in this.rects) { const r = this.rects[k]; if (c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]) this.play(k); }
    if (d) this.play(d);
    if (I.pressed('cancel') || I.pressed('pause')) { KC.sfx('menuBack'); this.close(); return; }
    const p = this.prev; p.step(dt, this.phantom, [0, 400]); if (p.st === 'walk' || p.st === 'idle') { p.x = 200; p.st = 'idle'; } if (p.st === 'crouch' && this.crouchT !== undefined) { this.crouchT -= dt; if (this.crouchT < 0) p.st = 'idle'; } p.update(dt);
  },
  play(dir) { const id = KC.MATRIX[KC.POSTURES[this.row][0]][dir]; this.sel = id; const p = this.prev; p.reset(200); p.face = 1; if (id === 'crouch') { p.st = 'crouch'; this.crouchT = 1; } else p.start(id, this.phantom); KC.sfx('menuOk'); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, P = KC.POSTURES[this.row], cx = W / 2 + 60, cy = H / 2 + 6;
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, W, H, '#08060e')); KC.title(g, 'MOVE LIST', W / 2, 6, 2);
      KC.POSTURES.forEach((pp, k) => { const y = 40 + k * 26, on = k === this.row; box(g, 8, y, 96, 22, { alpha: on ? .95 : .5, border: on ? '#ffd060' : '#4a4060' }); KC.glyph(g, 14, y + 5, pp[2], 12); T(g, pp[1], 32, y + 7, on ? '#ffd060' : '#c8c0e0'); });
      // the R-stick and the four techniques in their directions
      px.disc(g, cx, cy, 20, '#16141e'); px.disc(g, cx, cy, 18, '#3a3650'); T(g, 'R', cx - 2, cy - 3, '#fff');
      this.rects = {};
      [['u', 0, -46], ['t', 70, 0], ['d', 0, 46], ['a', -70, 0]].forEach(([d, dx, dy]) => {
        const id = KC.MATRIX[P[0]][d], t = KC.TECH[id], nm = t.short || t.name, w = Math.max(70, TW(nm) + 8), x = cx + dx - w / 2, y = cy + dy - 10, on = this.sel === id;
        box(g, x, y, w, 22, { alpha: .9, border: t.pts ? (on ? '#ffd060' : '#a89060') : '#5a6a8a' }); T(g, nm, x + w / 2 - TW(nm) / 2, y + 3, t.pts ? '#fff6d0' : '#a8c8ff'); T(g, t.pts ? t.pts[0] + '-' + t.pts[1] + (t.pts[1] >= 600 ? ' ★FULL' : '') : (t.kind || 'move').toUpperCase(), x + w / 2 - 30, y + 12, '#ffd060', { font: 'tiny' });
        this.rects[d] = [x, y, w, 22];
        const arrow = { u: '↑', t: '→', d: '↓', a: '←' }[d]; T(g, arrow, cx + dx * .32 - 3, cy + dy * .5 - 3, '#ffd060');
      });
      // the live preview
      const bx = 112, by = H - 100; box(g, bx, by, 90, 80, { bg: ['#1a1830', '#0c0a18'] });
      const sv = r.view; this.prev.rig.draw(g, bx + 45, by + 74, sv);
      if (this.sel) { const t = KC.TECH[this.sel]; T(g, t.jp, bx + 4, by + 3, '#a8a0c0', { font: 'tiny' }); }
      KC.bar(g, [[KC.dev() === 'pad' ? 'L:u' : 'key:W', 'POSTURE'], [KC.dev() === 'pad' ? 'R:r' : 'key:L', 'PREVIEW'], [KC.back(), 'CLOSE']]);
    });
  }
};
scenes.movelist = SC({ enter(d) { KC.MoveList.back = d.back === 'title' ? 'title' : d.back; KC.MoveList.active = true; KC.MoveList.make(); KC.MoveList.row = 0; KC.MoveList.sel = null; this.stage = new Stage('dojo'); this.stage.enter(); }, update(dt) { if (!KC.MoveList.active) return; KC.MoveList.update(dt); }, draw(r) { this.stage.draw(r); KC.MoveList.draw(r); } });

// ---- 60-online.js ----
/* ---- ONLINE: AI Hub Session Protocol v1, shared-world. The host (AIHub.isHost) runs the authoritative Kachinuki and
 * Bout at 120 Hz; guests send their input and draw the world from snapshots; spectators send heartbeats. A server host
 * (no player of its own) runs the same code with no local input. Network cadence uses real time, never game time.
 * Messages: in (guest -> host: posture, held technique, press edges), hb, s (host -> all snapshot, unreliable),
 * ev (host -> all events, reliable). ---- */
const PCODE = ['n', 'u', 'd', 'l', 'r'];
const Net = KC.Net = {
  info: null, role: null, me: null, players: [], K: null, bout: null, state: 'connect', card: null, startAt: null, over: null, sent: 0, sentLog: [], inputs: {}, lat: {}, left: new Set(), names: {},
  now() { return HUB ? HUB.time() : 0; },
  real() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); },
  async connect() {
    let info = null; try { info = await HUB.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
    if (!info) { this.state = 'off'; game.go('title'); return; }
    this.info = info; this.me = info.me; this.players = info.players.map(p => p.id); this.role = info.server ? 'server' : info.isHost ? 'host' : 'guest';
    info.players.forEach(p => { this.names[p.id] = U.name(p.name); });
    this.colors = {}; info.players.forEach(p => { this.colors[p.id] = p.color; });
    HUB.on('card', c => { this.card = c; }); HUB.on('start', s => { this.state = 'countdown'; KC.music('stadium'); });
    HUB.on('message', (d, from) => this.onMsg(d, from)); HUB.on('leave', e => this.onLeave(e)); HUB.on('time-up', e => this.timeUp(e)); HUB.on('end', e => this.end(e));
    this.state = 'card'; this.K = KC.Kachinuki.make(this.players.length, TUNE.sessionTarget); this.K.ids = this.players.slice(); this.K.queue = this.players.map((p, i) => i);
    HUB.ready();
  },
  isFighter(id) { if (!this.K) return false; const q = this.K.queue; return this.K.ids[q[0]] === id || this.K.ids[q[1]] === id; },
  send(d, reliable = true) { if (this.state === 'ended' || !HUB) return; try { if (HUB.send(d, { reliable }) !== false) { this.sent++; this.sentLog.push(this.real()); } } catch (e) { game.fail('hub send', e); } },
  onMsg(d, from) {
    if (!d || this.state === 'ended') return;
    if (this.role !== 'guest') {
      if (d.t === 'in') { const I = this.inputs[from] || (this.inputs[from] = { p: 'n', edges: [] }); I.p = PCODE[d.p] || 'n'; for (const e of d.e || []) I.edges.push(PCODE[e[0]]); const l = this.now() - d.a; if (isFinite(l)) this.lat[from] = lerp(this.lat[from] === undefined ? l : this.lat[from], clamp(l, 0, 150), .2); }
      if (d.t === 'hb') { const l = this.now() - d.a; if (isFinite(l)) this.lat[from] = lerp(this.lat[from] === undefined ? l : this.lat[from], clamp(l, 0, 150), .2); }
      return;
    }
    if (d.t === 's') { if (!this.snapT || d.a >= this.snapT) { this.snapT = d.a; this.snap = d; this.applySnap(d); } }
    if (d.t === 'ev') for (const e of d.list || []) this.event(e);
  },
  // the host: a controller for a fighter played by a remote copy
  remote(id) { return () => { const I = this.inputs[id]; if (!I) return KC.NEUTRAL; const press = I.edges.shift() || null; return { posture: I.p, press }; }; },
  // the host's own fighter, through a fairness delay (the opponent's one-way latency)
  local(oppId) {
    const buf = [];
    return (f) => { const it = game.paused || this.menuOpen || KC.MoveList.active ? KC.NEUTRAL : KC.readIntent(game.input); buf.push({ t: this.real(), it }); const delay = clamp(this.lat[oppId] || 0, 0, 150); let out = KC.NEUTRAL, press = null; while (buf.length && buf[0].t <= this.real() - delay) { const b = buf.shift(); out = b.it; press = press || b.it.press; } return { posture: out.posture, press }; };
  },
  newBout() {
    const K = this.K, a = K.queue[0], b = K.queue[1], ids = K.ids, fids = [KN_FIGHTERS[a % 4], KN_FIGHTERS[b % 4]];
    const ctrl = [ids[a], ids[b]].map((pid, i) => this.role === 'host' && pid === this.me ? this.local(ids[i ? a : b]) : this.remote(pid));
    const W = new Karateka(fids[0], 0), R = new Karateka(fids[1], 1);
    this.bout = new Bout({ fighters: [W, R], ctrl, seed: 1000 + K.bouts, stage: 'stadium', roundsToWin: 1, pointsToWin: 2, clock: 30, intro: K.bouts === 0, online: true });
    const B = this.bout, evq = this.evq = [];
    B.on('call', c => evq.push({ k: 'call', id: c.id, text: c.text, side: c.side }));
    B.on('point', p => { evq.push({ k: 'point', side: p.side, pts: p.pts, full: p.full, tech: p.tech, counter: p.counter }); const pid = ids[K.queue[p.side]]; });
    B.on('block', p => evq.push({ k: 'block', side: p.side }));
    B.on('matchEnd', e => this.boutOver(e.winner));
    this.boutIds = [ids[a], ids[b]]; evq.push({ k: 'bout', a: ids[a], b: ids[b] });
  },
  boutOver(wSide, forfeit) {
    if (this.over || !this.bout) return; const K = this.K, B = this.bout, qa = K.queue[0], qb = K.queue[1];
    [qa, qb].forEach((p, i) => { K.full[p] += B.f[i].stats.full; K.half[p] += B.f[i].stats.half; K.blocks[p] += B.f[i].stats.blocks; });
    K.pts[qa] += B.f[0].stats.full + B.f[0].stats.half * .5; K.pts[qb] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[qa] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[qb] += B.f[0].stats.full + B.f[0].stats.half * .5;
    const w = KC.Kachinuki.result(K, wSide); this.evq.push({ k: 'boutEnd', w: K.ids[w], forfeit: !!forfeit });
    // skip players who left: they go to the back and sit out
    K.queue = K.queue.filter(p => !this.left.has(K.ids[p])).concat(K.queue.filter(p => this.left.has(K.ids[p])));
    const active = K.queue.filter(p => !this.left.has(K.ids[p]));
    if (K.champion >= 0 || active.length < 2) return this.finish();
    this.flushEv(); this.newBout();
  },
  standings() { const K = this.K, ids = this.players.filter(id => !this.left.has(id)), idx = ids.map(id => K.ids.indexOf(id)); return KC.Kachinuki.standings(K, idx).map(g => g.map(i => K.ids[i])); },
  finish() {
    if (this.over || this.role === 'guest') return; const K = this.K, S = this.standings(), scores = {}, stats = {}, awards = [];
    for (const id of this.players) { const i = K.ids.indexOf(id); scores[id] = K.wins[i]; stats[id] = { 'Bouts won': K.wins[i], 'Full points': K.full[i], 'Half points': K.half[i], 'Best streak': K.best[i] }; }
    const top = (arr, title, detail, min = 1) => { let best = -1, bi = -1; arr.forEach((v, i) => { if (v > best) { best = v; bi = i; } }); if (best >= min) awards.push({ id: K.ids[bi], title, detail: detail(best) }); };
    top(K.full, 'IPPON HUNTER', v => v + ' full points'); top(K.blocks, 'IRON WALL', v => v + ' blocks'); top(K.best, 'KACHINUKI', v => v + ' wins in a row', 3);
    this.over = { standings: S, scores }; this.evq && this.evq.push({ k: 'over', standings: S }); this.flushEv();
    try { HUB.finish({ standings: S, scores, stats, awards }); } catch (e) { game.fail('hub finish', e); }
  },
  onLeave(e) {
    this.left.add(e.id); if (this.role === 'guest') return;
    const active = this.players.filter(id => !this.left.has(id));
    if (active.length < 2) return this.finish();
    if (this.bout && this.boutIds && this.boutIds.includes(e.id) && this.state === 'play') { const side = this.boutIds.indexOf(e.id); this.bout.say('forfeit'); this.boutOver(1 - side, true); }
  },
  // time-up: a bout in progress counts only if a side leads on points
  timeUp() { if (this.role === 'guest' || this.over) return; const B = this.bout; if (B && this.state === 'play' && B.points[0] !== B.points[1] && B.phase !== 'over') { const K = this.K; K.wins[K.queue[B.points[0] > B.points[1] ? 0 : 1]]++; } this.finish(); },
  end(e) { this.state = 'ended'; this.endInfo = e; game.audio.music(null); try { const vb = game.audio.bus && game.audio.ctx && game.audio.bus('voice'); if (vb) vb.gain.value = 0; } catch (err) { /* no audio */ } game.audio.mute(true); },
  flushEv() { if (this.evq && this.evq.length && this.role !== 'guest') { this.send({ t: 'ev', list: this.evq.splice(0, 40) }, true); } },
  // the guest: a puppet bout drawn from snapshots
  applySnap(d) {
    if (!this.pbout || this.pids === undefined || d.ids[0] !== this.pids[0] || d.ids[1] !== this.pids[1]) {
      this.pids = d.ids.slice(); const fi = d.ids.map(id => KN_FIGHTERS[this.players.indexOf(id) % 4]);
      this.pbout = new Bout({ fighters: [new Karateka(fi[0], 0), new Karateka(fi[1], 1)], stage: 'stadium', roundsToWin: 1, pointsToWin: 2, clock: 30, intro: false }); this.pbout.puppet = true;
    }
    // a predicted wind-up holds for up to 250 ms; a snapshot that confirms any technique (or the window ends) takes over
    const pr = this.pred, keep = pr && this.real() - pr.t <= 250 && d.b.f[pr.side][4] < 0 ? this.pbout.f[pr.side].snap() : null;
    this.pbout.applySnapshot(d.b); if (keep) this.pbout.f[pr.side].apply(keep); else if (pr && d.b.f[pr.side][4] >= 0) { this.pred = null; this.confirmed = (this.confirmed || 0) + 1; } if (d.w) this.K.wins = d.w; if (d.q) this.K.queue = d.q;
  },
  event(e) {
    if (e.k === 'call') { const B = this.pbout; if (B) { B.call = { id: e.id, text: e.text, t: 0, side: e.side }; } KC.Voice.speak(e.text, 'genkotsu', { call: e.id, reverb: true }); }
    if (e.k === 'point') { game.audio.sfx(e.full ? 'thwackFull' : 'thwackHalf'); game.shake(e.full ? 4 : 2); KC.Voice.crowd(e.full ? 1 : .5); if (this.pbout) this.pbout.popups.push({ t: 0, x: this.pbout.f[1 - e.side].x, z: 66, text: (KC.TECH[e.tech].short || KC.TECH[e.tech].name) + ' • ' + e.pts, full: e.full }); this.stage && this.stage.react(e.full ? 'full' : 'point'); }
    if (e.k === 'block') game.audio.sfx('clack');
    if (e.k === 'over') this.over = { standings: e.standings };
  },
  // each step
  update(dt) {
    if (this.state === 'ended' || this.state === 'connect' || this.state === 'off') return;
    const now = this.now(), real = this.real();
    if (this.state === 'card') {
      const I = game.input, c = I.clicked && I.clicked();
      if (I.pressed('confirm') || (c && this.readyBtn && KC.inRect(c, this.readyBtn))) { HUB.answer('ready'); KC.sfx('menuOk'); }
      if (I.pressed('more') || (c && this.moreBtn && KC.inRect(c, this.moreBtn))) { HUB.answer('more'); KC.sfx('menuMove'); }
    }
    if (this.state === 'countdown') { const s = Math.ceil(-now / 1000); if (s !== this.lastCount && s > 0 && s <= 3) { this.lastCount = s; game.audio.sfx('taikoHit'); } if (now >= 0) { this.state = 'play'; if (this.role !== 'guest') this.newBout(); } }
    if (this.state !== 'play') { this.heartbeat(real, now); return; }
    if (this.role !== 'guest') {
      if (!this.over && this.bout) this.bout.update(dt);
      if (!this.lastSnap || real - this.lastSnap >= 83) { this.lastSnap = real; const B = this.bout; if (B) this.send({ t: 's', a: now, b: B.snapshot(), ids: this.boutIds, q: this.K.queue, w: this.K.wins }, false); }
      if (this.evq && this.evq.length && (!this.lastEv || real - this.lastEv >= 120)) { this.lastEv = real; this.flushEv(); }
      this.renderBout = this.bout;
    } else {
      // guests: send input on change (press edges coalesced), at most 15 a second; spectators send heartbeats
      const fighting = this.pids && this.pids.includes(this.me), it = fighting && !game.paused && !this.menuOpen && !KC.MoveList.active ? KC.readIntent(game.input) : KC.NEUTRAL;
      if (it.press) { (this.edges = this.edges || []).push(it.press); const side = this.pids.indexOf(this.me), pf = this.pbout && this.pbout.f[side]; if (pf && pf.free()) { pf.control(it, this.pbout.f[1 - side], dt); if (pf.st === 'tech') { this.pred = { side, t: real, tech: pf.tech }; game.audio.sfx('whooshL', { vol: .5 }); } } }
      if (this.pred && this.pbout) { const pf = this.pbout.f[this.pred.side]; if (real - this.pred.t > 250) this.pred = null; else if (pf.st === 'tech') pf.step(dt, this.pbout.f[1 - this.pred.side], [0, 400]); }
      const pc = PCODE.indexOf(it.posture);
      if (fighting && (pc !== this.lastP || (this.edges && this.edges.length)) && (!this.lastIn || real - this.lastIn >= 66)) { this.lastIn = real; this.lastP = pc; this.send({ t: 'in', s: (this.seq = (this.seq || 0) + 1), a: now, p: pc, e: (this.edges || []).splice(0).map(d => [PCODE.indexOf(d), Math.round(now)]) }, true); }
      if (this.pbout) { this.pbout.presentUpdate(dt); if (this.pbout.call) this.pbout.call.t += dt; }
      this.renderBout = this.pbout;
    }
    this.heartbeat(real, now);
  },
  heartbeat(real, now) { if (this.role === 'guest' && this.state !== 'ended' && this.state !== 'connect' && (!this.lastHb || real - this.lastHb >= 500)) { this.lastHb = real; this.send({ t: 'hb', a: isFinite(now) ? now : 0 }, false); } }
};
KC.inRect = (p, r) => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];

scenes.session = SC({
  pausable: false,
  enter() { this.stage = new Stage('stadium'); this.stage.enter(); Net.stage = this.stage; KC.music('session'); this.t = 0; this.kneel = []; if (Net.state === 'connect' && !this.started) { this.started = true; Net.connect(); } },
  update(dt) {
    this.t += dt; this.stage.update(dt);
    const I = game.input, create = (typeof navigator !== 'undefined' && (() => { try { const p = navigator.getGamepads && Array.from(navigator.getGamepads() || []).find(x => x); return !!(p && p.buttons[8] && p.buttons[8].pressed); } catch (e) { return false; } })());
    if (Net.state !== 'ended' && I.pressed('pause') && !create) { Net.menuOpen = !Net.menuOpen; if (Net.menuOpen) this.menu = new Menu([{ label: 'RESUME', fn: () => { Net.menuOpen = false; } }, { label: () => 'SOUND: ' + (game.settings.sound ? 'ON' : 'OFF'), fn: () => game.settings.set('sound', !game.settings.sound) }, { label: () => 'BUTTON SYMBOLS: ' + (KC.padFamily() === 'xbox' ? 'XBOX' : 'PLAYSTATION'), fn: () => game.settings.set('glyphs', KC.padFamily() === 'xbox' ? 'playstation' : 'xbox') }, { label: 'MOVE LIST', fn: () => { Net.menuOpen = false; KC.MoveList.active = true; KC.MoveList.make(); } }], { onCancel: () => { Net.menuOpen = false; } }); I.consumeAll(); }
    if (Net.menuOpen && this.menu) this.menu.update(dt); else if (KC.MoveList.active) KC.MoveList.update(dt);
    Net.update(dt);
    if (Net.players.length && this.kneel.length !== Net.players.length) this.kneel = Net.players.map((id, i) => { const k = new Karateka(KN_FIGHTERS[i % 4], i % 2, { x: 120 + i * 54 }); k.setPose('seiza'); k.rig.C.belt = Net.colors[id] || '#fff'; return k; });
    const B = Net.renderBout;
    if (B) { KC.stageCam(B.f); } else KC.stageCam([{ x: 200 }]);
    if (Net.state !== 'play' || !B) this.kneel.forEach(k => k.update(dt));
  },
  draw(r) {
    this.stage.draw(r); const B = Net.renderBout;
    if (KC.MoveList.active) { KC.MoveList.draw(r); }
    if (B && Net.state === 'play') { B.draw(r); const nm = (Net.pids || Net.boutIds || []).map(id => Net.names[id] || '?'); KC.HUD.draw(r, B, { names: nm }); }
    else this.kneel.forEach(k => k.draw(r));
    r.overlay(g => {
      const W = r.W, H = r.H, ids = Net.players;
      if (Net.state === 'card' || Net.state === 'connect') {
        px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
        KC.title(g, 'KARATE CHAMPON', W / 2, 8, 3); KC.title(g, 'KACHINUKI! WINNER STAYS ON.', W / 2, 38, 2);
        T(g, 'FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.', W / 2 - TW('FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.') / 2, 58, '#e8e0ff');
        const c = Net.card || {}, ready = c.ready || [];
        ids.forEach((id, i) => { const x = 20 + i * (W - 40) / 4, on = ready.includes(id); box(g, x, 72, (W - 40) / 4 - 6, 22, { border: Net.colors[id] || '#fff' }); T(g, Net.names[id] + (id === Net.me ? ' (YOU)' : ''), x + 5, 76, Net.colors[id] || '#fff'); T(g, on ? 'READY' : '...', x + 5, 85, on ? '#5aff8a' : '#a8a0c0', { font: 'tiny' }); });
        const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'L:n' : 'key:W', 'MOVE'], [d === 'pad' ? 'R:n' : 'key:I', 'STRIKE (OR FACE BUTTONS / IJKL)']], W / 2, 102, 11);
        this.readyBtn = [W / 2 - 110, H - 64, 100, 24]; this.moreBtn = [W / 2 + 10, H - 64, 100, 24]; Net.readyBtn = this.readyBtn; Net.moreBtn = this.moreBtn;
        box(g, ...this.readyBtn, { border: '#5aff8a' }); KC.glyph(g, this.readyBtn[0] + 6, this.readyBtn[1] + 6, d === 'pad' ? 'pad0' : 'key:ENTER', 11); T(g, 'READY', this.readyBtn[0] + 44, this.readyBtn[1] + 8, '#fff');
        box(g, ...this.moreBtn, { border: c.asked ? '#ffd060' : '#8a7aa0' }); KC.glyph(g, this.moreBtn[0] + 6, this.moreBtn[1] + 6, d === 'pad' ? 'pad3' : 'key:T', 11); T(g, 'MORE TIME', this.moreBtn[0] + 26, this.moreBtn[1] + 8, '#fff');
        const left = c.left; T(g, c.paused ? 'PAUSED: MORE TIME ASKED' : c.starting ? 'STARTING...' : left != null ? 'STARTS IN ' + Math.ceil(left / 1000) : '', W / 2 - 50, H - 34, '#ffd060');
      }
      if (Net.state === 'countdown') { const s = Math.ceil(-Net.now() / 1000); KC.title(g, s > 0 ? String(s) : KC.calls('begin'), W / 2, H * .35, 5); }
      if (Net.state === 'play' && Net.K) { const K = Net.K, q = K.queue; T(g, 'BOUT WINS: ' + Net.players.map(id => Net.names[id] + ' ' + (K.wins[Net.players.indexOf(id)] || 0)).join('  '), 8, H - 12, '#ffd060', { font: 'tiny' }); const nx = q[2] !== undefined ? Net.players[q[2]] : null; if (nx !== null && nx !== undefined) T(g, nx === Net.me ? 'NEXT: YOU' : 'NEXT: ' + Net.names[nx], W - 90, H - 12, '#ff8a6a', { font: 'tiny' }); }
      if (Net.menuOpen && this.menu) { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, 'PAUSED (THE BOUT GOES ON)', W / 2, 30, 2); this.menu.draw(g, W / 2, 70); }
      if (Net.state === 'ended' || Net.over) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 40, W, 110, '#05040a')); KC.title(g, Net.endInfo && Net.endInfo.reason === 'host-left' ? 'HOST LEFT' : 'ROUND OVER', W / 2, 50, 3); const S = (Net.endInfo && Net.endInfo.standings) || (Net.over && Net.over.standings) || []; S.forEach((grp, k) => T(g, (k + 1) + '. ' + grp.map(id => Net.names[id] || '?').join(', '), W / 2 - 60, 84 + k * 12, '#fff6d0')); }
    });
  }
});

// ---- 70-dev.js ----
/* ---- DEV MODE: reached from the pause menu (then F2, ` or L3+R3 toggle it; ?dev=1 in the address enables it).
 * Tabs: TUNING (live sliders, RESET ALL at the top), TOGGLES, WARP, INFO. 8 rows a page; up/down select, left/right
 * adjust (hold to accelerate), T or △ resets the focused value, L1/R1 or Q/E or a click change tabs; the mouse drags a
 * slider and clicks a toggle. Stored under 'kc:dev'. While any tuning value is changed the HUD shows DEV and no high
 * scores are recorded. ---- */
const TOGGLES = [['boxes', 'HIT, HURT AND PUSH BOXES'], ['frames', 'FRAME DATA'], ['inputs', 'INPUT DISPLAY'], ['thoughts', 'AI THOUGHTS'], ['invincible', 'P1 INVINCIBLE'],
  ['freezeCpu', 'FREEZE CPU'], ['infTime', 'INFINITE TIME'], ['slowmo', 'SLOW MOTION 0.25X'], ['frameStep', 'FRAME STEP (R1 / E)'], ['fps', 'FPS AND STATS'], ['muteVoices', 'MUTE VOICES'], ['skipCut', 'SKIP CUTSCENES'], ['unlocked', 'UNLOCK ALL']];
const Dev = KC.Dev = {
  active: false, tab: 0, row: 0, scroll: 0, badge: false, held: 0, msg: null,
  TABS: ['TUNING', 'TOGGLES', 'WARP', 'INFO'],
  load() { const s = KC.store('dev'); if (s) { Object.assign(TUNE, s.tune || {}); for (const k of Object.keys(s.toggles || {})) if (k in DEV) DEV[k] = s.toggles[k]; } },
  save() { const tg = {}; TOGGLES.forEach(([k]) => { tg[k] = DEV[k]; }); KC.store('dev', { tune: TUNE, toggles: tg }); },
  open() { if (SESSION) return; DEV.enabled = true; this.active = true; if (game.paused) game.resume(); game.input.consumeAll(); },
  toggle() { if (this.active) this.close(); else this.open(); },
  close() { this.active = false; game.input.consumeAll(); this.save(); },
  rows() {
    if (this.tab === 0) return [{ label: 'RESET ALL TO DEFAULTS', act: () => { KC.resetTune(); this.note('ALL VALUES RESET'); } }, { label: 'COPY TUNING JSON', act: () => this.copy(JSON.stringify(TUNE, null, 1)) }].concat(KC.TUNE_SPEC.map(s => ({ spec: s })));
    if (this.tab === 1) return TOGGLES.map(([k, l]) => ({ toggle: k, label: l })).concat([{ label: () => 'P2 CONTROL: ' + DEV.p2.toUpperCase(), act: () => { const o = ['cpu', 'pad2', 'dummy']; DEV.p2 = o[(o.indexOf(DEV.p2) + 1) % 3]; } }]);
    if (this.tab === 2) return this.warps();
    return [];
  },
  warps() {
    const w = [], go = (label, fn) => w.push({ label, act: () => { this.close(); KC.Attract.stop(); fn(); } });
    go('TECHNIQUE LAB', () => game.go('lab', { tech: 'frontKick' }));
    KC.DATA.ladder.forEach((n, i) => go('ROAD ' + (i + 1) + ': ' + n.label, () => { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.node = i; KC.Story.s.rank = Math.max(0, (KC.DATA.ladder.slice(0, i).filter(x => x.promote).pop() || { promote: 0 }).promote); KC.Story.go(); }));
    KC.FIGHT_STAGES.forEach(s => go('QUICK BOUT: ' + KC.STAGE[s].name, () => game.go('fight', { mode: 'versus', stage: s, white: 'taro', red: 'ebi', cpu: [false, true], cpuLevel: 5, seed: 3 })));
    ['boards', 'pots', 'bull'].forEach(k => go('BONUS: ' + KC.DATA.bonus[k].title, () => game.go('bonus', { kind: k })));
    ['I', 'II', 'III', 'ALL'].forEach(k => go('LESSON ' + k, () => game.go('practice', { lesson: k })));
    go('ENDING', () => { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.node = KC.DATA.ladder.length - 1; KC.Story.go(); }); go('CREDITS', () => game.go('credits', {})); go('ATTRACT MODE', () => game.go('attract', { loop: 1 }));
    w.push({ label: () => 'SET RANK: ' + (KC.Story.s ? KC.RANKS[KC.Story.s.rank][0] : '-'), act: () => { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.rank = (KC.Story.s.rank + 1) % 10; KC.Story.save(); } });
    w.push({ label: '+10,000 SCORE', act: () => { if (KC.Story.s) { KC.Story.add(10000); KC.Story.save(); this.note('+10000'); } } });
    w.push({ label: 'WIN THIS ROUND', act: () => KC.F && KC.F.bout.forceRound(0) }); w.push({ label: 'LOSE THIS ROUND', act: () => KC.F && KC.F.bout.forceRound(1) });
    w.push({ label: 'WIN THE MATCH', act: () => KC.F && KC.F.bout.forceMatch(0) }); w.push({ label: 'LOSE THE MATCH', act: () => KC.F && KC.F.bout.forceMatch(1) });
    Object.keys(KC.CALLS).forEach(id => w.push({ label: 'CALL: ' + KC.calls(id), act: () => { const B = KC.F && game.sceneName === 'fight' ? KC.F.bout : null; if (B) B.say(id); else KC.Voice.speak(KC.calls(id), 'genkotsu', { call: id }); } }));
    w.push({ label: 'RESET THE SAVE', act: () => { KC.store('save', null); KC.store('unlocks', null); this.note('SAVE ERASED'); } });
    return w;
  },
  note(t) { this.msg = { t: 0, text: t }; },
  copy(s) { try { navigator.clipboard.writeText(s); this.note('COPIED TO THE CLIPBOARD'); } catch (e) { this.note('COPY FAILED'); } this.lastCopy = s; },
  adjust(spec, d, fast) { const [k, , mn, mx, st] = spec; TUNE[k] = clamp(Math.round((TUNE[k] + d * st * (fast ? 5 : 1)) / st) * st, mn, mx); TUNE[k] = Math.round(TUNE[k] * 1000) / 1000; this.save(); },
  update(dt) {
    const I = game.input, rows = this.rows(), n = rows.length;
    if (I.pressed('dev') || I.pressed('cancel') || (I.down('l3') && I.pressed('r3'))) { this.close(); return; }
    if (I.pressed('l1')) { this.tab = (this.tab + 3) % 4; this.row = 0; this.scroll = 0; } if (I.pressed('r1')) { this.tab = (this.tab + 1) % 4; this.row = 0; this.scroll = 0; }
    if (n) { if (I.repeat('up', .3, .07)) this.row = (this.row + n - 1) % n; if (I.repeat('down', .3, .07)) this.row = (this.row + 1) % n; }
    if (this.row < this.scroll) this.scroll = this.row; if (this.row >= this.scroll + 8) this.scroll = this.row - 7;
    const it = rows[this.row];
    if (it) {
      const l = I.down('left'), r = I.down('right'); if (l || r) this.held += dt; else this.held = 0;
      if (it.spec && (I.repeat('left', .25, .05) || I.repeat('right', .25, .05))) this.adjust(it.spec, I.down('left') ? -1 : 1, this.held > 1);
      if (it.spec && I.pressed('more')) { TUNE[it.spec[0]] = it.spec[5]; this.save(); }
      if (I.pressed('confirm')) { if (it.toggle) { DEV[it.toggle] = !DEV[it.toggle]; this.save(); } else if (it.act) it.act(); KC.sfx('menuOk'); }
    }
    // the mouse: tabs, rows, slider drags
    const c = I.clicked && I.clicked(), p = I.pointer && I.pointer(), L = this.layout;
    if (L && c) { if (c[1] >= L.y0 - 18 && c[1] < L.y0 - 4) { const k = Math.floor((c[0] - L.x) / (L.w / 4)); if (k >= 0 && k < 4) { this.tab = k; this.row = 0; this.scroll = 0; } } else { const k = Math.floor((c[1] - L.y0) / 16); if (k >= 0 && k < 8 && rows[this.scroll + k]) { this.row = this.scroll + k; const it2 = rows[this.row]; if (it2.toggle) { DEV[it2.toggle] = !DEV[it2.toggle]; this.save(); } else if (it2.act) it2.act(); } } }
    if (L && p && I.down('click') && it && it.spec && p[0] > L.x + L.w - 114) { const sx = L.x + L.w - 110, k = clamp((p[0] - sx) / 100, 0, 1); const [key, , mn, mx, st] = it.spec; TUNE[key] = Math.round((mn + (mx - mn) * k) / st) * st; }
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 2) this.msg = null; }
  },
  draw(r) {
    if (!this.active && !DEV.fps) return;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (DEV.fps) { T(g, 'FPS ' + Math.round(game.fps || 0) + ' T ' + game.time.toFixed(1) + ' ' + (game.sceneName || ''), 4, 30, '#5aff8a', { font: 'tiny' }); }
      if (!this.active) return;
      const w = Math.min(W - 20, 380), x = W / 2 - w / 2, y0 = 52; this.layout = { x, w, y0 };
      box(g, x - 4, y0 - 40, w + 8, 8 * 16 + 70, { alpha: .95, bg: ['#101828', '#05080e'], border: '#5aff8a' });
      T(g, 'DEV MODE', x, y0 - 36, '#5aff8a'); T(g, 'L1/R1 OR Q/E: TABS   T/△: RESET VALUE   ESC: CLOSE', x + 60, y0 - 36, '#8ab0a0', { font: 'tiny' });
      this.TABS.forEach((t, k) => { const tx = x + k * w / 4, on = k === this.tab; px.rect(g, tx, y0 - 18, w / 4 - 2, 13, on ? '#2a5a3a' : '#16241c'); T(g, t, tx + 4, y0 - 15, on ? '#ffffff' : '#7a9a8a'); });
      const rows = this.rows();
      if (this.tab === 3) { this.info().forEach((l, k) => T(g, l, x + 4, y0 + k * 12, '#c8f8d8')); }
      for (let k = 0; k < 8; k++) {
        const i = this.scroll + k, it = rows[i]; if (!it) break; const y = y0 + k * 16, on = i === this.row;
        if (on) px.rect(g, x, y - 2, w, 14, '#1e3a2a');
        if (it.spec) { const [key, label, mn, mx] = it.spec, v = TUNE[key], ch = Math.abs(v - it.spec[5]) > 1e-9; T(g, label, x + 4, y, ch ? '#ffd060' : '#e8f8f0'); const sx = x + w - 110; px.rect(g, sx, y + 3, 100, 3, '#2a3a32'); px.rect(g, sx + Math.round((v - mn) / (mx - mn) * 100) - 2, y, 4, 9, on ? '#5aff8a' : '#a8c8b8'); T(g, String(Math.round(v * 100) / 100), sx - 34, y, '#a8ffc8'); }
        else if (it.toggle) { T(g, it.label, x + 4, y, '#e8f8f0'); T(g, DEV[it.toggle] ? 'ON' : 'OFF', x + w - 30, y, DEV[it.toggle] ? '#5aff8a' : '#6a8a7a'); }
        else T(g, typeof it.label === 'function' ? it.label() : it.label, x + 4, y, '#ffe8a0');
      }
      if (rows.length > 8) T(g, (this.row + 1) + '/' + rows.length, x + w - 30, y0 + 8 * 16 + 2, '#7a9a8a', { font: 'tiny' });
      if (this.msg) T(g, this.msg.text, x + 4, y0 + 8 * 16 + 2, '#ffd060');
    });
  },
  info() {
    const B = KC.F && game.sceneName === 'fight' ? KC.F.bout : null, h = B && B.lastHit, ai = KC.F && KC.F.ai && KC.F.ai[1];
    return ['VERSION ' + KC.VERSION + ' · ' + E.versionLabel(), 'SCENE ' + game.sceneName + (KC.F && game.sceneName === 'fight' ? ' (' + KC.F.mode + ')' : ''), 'BOUT ' + (B ? B.phase + ' ROUND ' + B.round + ' CLOCK ' + B.clock.toFixed(1) + ' PTS ' + B.points.join('-') : '-'),
      'SEED ' + (KC.F && KC.F.d ? KC.F.d.seed : '-') + '   FPS ' + Math.round(game.fps || 0), 'AI ' + (ai ? 'L' + ai.level + ' ' + ai.thought : '-'),
      'LAST HIT ' + (h && !h.block ? h.tech + ' ' + h.pts + (h.full ? ' FULL' : ' HALF') : '-'), h && !h.block ? '  TIMING ' + h.tq.toFixed(2) + ' SPACING ' + h.sq.toFixed(2) + ' Q ' + h.q.toFixed(2) + (h.counter ? ' COUNTER' : '') : '', 'TUNED: ' + (KC.tuneChanged() ? 'YES (NO HIGH SCORES)' : 'NO')];
  }
};
KC.resetTune = () => { Object.assign(TUNE, KC.TUNE_DEFAULTS); Dev.save(); };

/* ---- TECHNIQUE LAB (#lab/<techId>): the hero against a standing dummy; frame data and the measured contact gap ---- */
KC.Lab = {
  /** the largest gap at which a technique (from a standstill) still lands on a standing dummy, by simulation */
  measure(id) {
    const t = KC.TECH[id]; if (!t.pts) return null;
    const hits = gap => {
      const a = new Karateka('taro', 0, { x: 100 }), b = new Karateka('negi', 1, { x: 100 }); b.R = Object.assign({}, b.R, { stats: { walk: 1, reach: 1, speed: 1 } }); a.R = Object.assign({}, a.R, { stats: { walk: 1, reach: 1, speed: 1 }, signature: null });
      b.x = a.x + (a.w + b.w) / 2 + gap; const B = { o: {}, arena: [-1000, 1000] }; a.start(id, b);
      for (let k = 0; k < 400; k++) { a.step(1 / 120, b, [-1000, 1000]); const r = Bout.prototype.check.call(B, a, b); if (r && !r.block) return true; if (a.st !== 'tech') break; }
      return false;
    };
    let lo = -1; for (let g = 0; g <= 200; g += 4) if (hits(g)) lo = g; if (lo < 0) return { max: -1 }; let hi = lo + 4;
    for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (hits(m)) lo = m; else hi = m; }
    return { max: Math.round(lo * 10) / 10, table: t.reach[1] * TUNE.reachScale + (t.travel || 0) + (t.air ? 0 : 0) };
  }
};
const LAB_TECHS = KC.SCORING.concat(['block', 'frontFlip', 'backFlip', 'jump', 'backRoll']);
scenes.lab = SC({
  pausable: true,
  enter(d) { this.i = Math.max(0, LAB_TECHS.indexOf((d && d.tech) || 'frontKick')); this.stage = new Stage('dojo'); this.stage.enter(); this.reset(); this.slow = false; this.boxes = true; KC.music('practice'); this.row = 0; },
  reset() { this.a = new Karateka('taro', 0, { x: 160 }); this.b = new Karateka('negi', 1, { x: 220 }); this.m = KC.Lab.measure(LAB_TECHS[this.i]); this.t = 0; this.played = false; },
  play() { const id = LAB_TECHS[this.i], t = KC.TECH[id]; this.a.reset(160); this.b.reset(160 + (this.a.w + this.b.w) / 2 + (t.reach ? Math.max(0, (t.reach[0] + t.reach[1]) / 2 + (t.travel || 0) * .5) : 40)); this.a.face = 1; this.b.face = -1; this.a.start(id, this.b); this.hit = null; this.bout = { o: {}, arena: [0, 400] }; this.played = true; },
  update(dt) {
    const I = game.input, id = LAB_TECHS[this.i], t = KC.TECH[id];
    if (I.pressed('l1') || I.pressed('left')) { this.i = (this.i + LAB_TECHS.length - 1) % LAB_TECHS.length; this.reset(); } if (I.pressed('r1') || I.pressed('right')) { this.i = (this.i + 1) % LAB_TECHS.length; this.reset(); }
    if (I.pressed('confirm')) this.play(); if (I.pressed('slow')) this.slow = !this.slow;
    if (I.repeat('up', .3, .1)) this.row = (this.row + 4) % 5; if (I.repeat('down', .3, .1)) this.row = (this.row + 1) % 5;
    if (t.f && (I.pressed('tLeft') || I.pressed('tRight'))) { const d = I.pressed('tLeft') ? -1 : 1; if (this.row < 3) t.f[this.row] = Math.max(1, t.f[this.row] + d); else if (t.reach) t.reach[this.row - 3] = Math.max(0, t.reach[this.row - 3] + d * 2); this.m = KC.Lab.measure(id); }
    if (I.pressed('copy')) Dev.copy(JSON.stringify(Object.assign({}, t, { move: undefined })));
    if (I.pressed('cancel')) game.go('title', { menu: true });
    const sdt = dt * (this.slow ? .25 : 1); this.t += sdt;
    this.a.step(sdt, this.b, [0, 400]); this.b.step(sdt, this.a, [0, 400]);
    if (this.played && !this.hit) { const r = Bout.prototype.check.call(this.bout, this.a, this.b); if (r) { this.hit = r; this.a.hitDone = true; game.particles.impact(this.b.x - 8, 0, 36, 1, '#ffe070'); game.audio.sfx(r.full ? 'thwackFull' : 'thwackHalf'); } }
    if (this.a.st !== 'tech' && this.played && this.t > 0) { this.wait = (this.wait || 0) + sdt; if (this.wait > 1) { this.wait = 0; this.play(); } }
    this.a.update(sdt); this.b.update(sdt); KC.stageCam([this.a, this.b]);
  },
  draw(r) {
    this.stage.draw(r); this.a.draw(r); this.b.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, id = LAB_TECHS[this.i], t = KC.TECH[id];
      KC.title(g, 'TECHNIQUE LAB', W / 2, 4, 2); box(g, 6, 28, 170, 100, { alpha: .9 });
      T(g, t.name, 10, 32, '#ffd060'); const rows = ['STARTUP ' + t.f[0], 'ACTIVE ' + t.f[1], 'RECOVERY ' + t.f[2], 'REACH MIN ' + (t.reach ? t.reach[0] : '-'), 'REACH MAX ' + (t.reach ? t.reach[1] : '-')];
      rows.forEach((l, k) => T(g, (k === this.row ? '▸ ' : '  ') + l + (k < 3 ? ' F (' + this.a.steps(k, t) + ' STEPS)' : ''), 10, 44 + k * 10, k === this.row ? '#fff' : '#c8c0e0'));
      if (this.m) T(g, 'MEASURED GAP ' + this.m.max + ' (TABLE ' + this.m.table + ')', 10, 98, Math.abs(this.m.max - this.m.table) <= 4 ? '#5aff8a' : '#ff8a6a');
      if (this.hit && !this.hit.block) T(g, 'HIT ' + this.hit.pts + (this.hit.full ? ' FULL' : ' HALF') + ' GAP ' + this.hit.gap.toFixed(1), 10, 110, '#a8e8ff');
      if (this.boxes && t.reach) { const f = this.a, [mn, mx] = f.reach(t), e = f.x + f.w / 2, c0 = r.w(e + mn, 0, 30), c1 = r.w(e + mx + (t.travel || 0), 0, 30); px.rect(g, c0[0], c0[1], c1[0] - c0[0], 2, '#ff4a4a'); }
      KC.bar(g, [[KC.ok(), 'PLAY'], [KC.dev() === 'pad' ? 'btn:L1' : 'key:Q', ''], [KC.dev() === 'pad' ? 'btn:R1' : 'key:E', 'TECHNIQUE'], [KC.dev() === 'pad' ? 'btn:L2' : 'key:Z', 'SLOW'], [KC.dev() === 'pad' ? 'btn:R2' : 'key:C', 'COPY JSON'], [KC.dev() === 'pad' ? 'R:l' : 'key:J', 'ADJUST']]);
    });
  }
});

// ---- 90-start.js ----
/* ---- DEBUG: game.debug for tests and the engine's tools; game.stateHash for replays ---- */
game.debug = {
  snapshot() {
    const F = KC.F && game.sceneName === 'fight' ? KC.F : null, B = F && F.bout, S = KC.Story.s, sc = game.scene || {};
    return { scene: game.sceneName, mode: F ? F.mode : null, node: S ? S.node : null, rank: S ? S.rank : null, score: S ? S.score : null, settings: { difficulty: game.settings.difficulty, calls: game.settings.calls, glyphs: game.settings.glyphs },
      bout: B ? { phase: B.phase, clock: Math.round(B.clock * 100) / 100, points: B.points.slice(), roundWins: B.roundWins.slice(), round: B.round, lastCall: B.calls[B.calls.length - 1] || null, lastPoint: B.lastPoint, calls: B.calls.slice(), fighters: B.f.map(f => ({ id: f.id, x: Math.round(f.x * 10) / 10, z: Math.round(f.z * 10) / 10, state: f.st, tech: f.tech, phase: f.ph, facing: f.face, belt: f.belt })) } : null,
      bonus: game.sceneName === 'bonus' ? { kind: sc.B.kind, state: sc.B.state, points: sc.B.points, objectsLeft: sc.B.objs ? sc.B.objs.filter(o => o.st === 'wait' || o.st === 'tele' || o.st === 'fly').length : null, broken: sc.B.broken, charge: sc.B.charge, bull: sc.B.bull && sc.B.bull.st } : null,
      drill: game.sceneName === 'practice' ? { lesson: sc.d.lesson, index: sc.i, state: sc.state, result: sc.result, points: sc.points, misses: sc.misses, good: sc.good } : null,
      attract: { on: KC.Attract.on, step: KC.Attract.step, idle: KC.Attract.idle, visited: (KC.Attract.visited || []).slice() },
      online: KC.Net.info ? { role: KC.Net.role, me: KC.Net.me, state: KC.Net.state, queue: KC.Net.K && KC.Net.K.queue, wins: KC.Net.K && KC.Net.K.wins, standings: KC.Net.over && KC.Net.over.standings } : null,
      dev: { on: KC.Dev.active, enabled: DEV.enabled, tuneChanged: KC.tuneChanged() }, errors: game.errors.length };
  },
  warp(to, data) { KC.Attract.stop(); if (typeof to === 'number') { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.node = to; KC.Story.go(); } else game.go(to, data || {}, { fade: 0 }); },
  setTune(k, v) { TUNE[k] = v; }, resetTune() { KC.resetTune(); },
  control(side, ctrl) { const B = KC.F && KC.F.bout; if (B) B.ctrl[side] = typeof ctrl === 'function' ? ctrl : () => ctrl; },
  autopilot(side, level) { const B = KC.F && KC.F.bout; if (!B) return; if (level === false) { B.ctrl[side] = human(side); return; } const ai = new KarateAI({ id: B.f[side].id, level, seed: 77 + side }); B.ctrl[side] = (f, foe, b) => ai.control(f, foe, b); KC.F.ai[side] = ai; },
  exportTuning() { return JSON.stringify(TUNE); }, forceCall(id) { const B = KC.F && KC.F.bout; if (B) B.say(id); }
};
game.stateHash = () => { const B = KC.F && KC.F.bout; return B ? JSON.stringify([B.f.map(f => [Math.round(f.x), Math.round(f.z), f.st, f.tech]), B.phase, Math.round(B.clock * 10), B.points]) : game.sceneName; };

/* ---- every scene: the dev panel over it (play scenes keep running under it), the attract mode's banner and exit ---- */
const LIVE = new Set(['fight', 'bonus', 'practice', 'lab']);
for (const k in scenes) {
  const s = scenes[k], up = s.update, dr = s.draw;
  s.update = function (dt) {
    game.input.touchEnabled = false;   // controller or keyboard only: no touch buttons or stick ever show
    if (KC._raw && !KC.Attract.on && k !== 'attract') { KC._raw = false; KC.Attract.poke(); }
    if (KC.Attract.on && k !== 'attract' && KC.Attract.exitCheck()) return;
    if (!KC.Attract.on && DEV.enabled && !SESSION && !KC.Dev.active && (game.input.pressed('dev') || (game.input.down('l3') && game.input.pressed('r3')))) { KC.Dev.open(); return; }
    if (KC.Dev.active) { KC.Dev.update(dt); if (!LIVE.has(k)) return; }
    up.call(this, dt);
  };
  s.draw = function (r) { dr.call(this, r); KC.Dev.draw(r); KC.Attract.banner(r); };
}

/* ---- BOOT: heavy setup in steps, then the first scene (or a deep link) ---- */
const sfxDefs = () => { for (const k in KC.SFX) game.audio.define(k, KC.SFX[k]); };
const steps = [
  ['Sweeping the dojo floor', () => KC.validateData()],
  ['Folding the gi', () => { for (const f of KC.DATA.roster) KC.portrait(f.id); KC.portrait('genkotsu'); }],
  ['Simmering the broth', sfxDefs],
  ['Tuning the referee\'s whistle', () => { KC.Voice.plan('HAJIME!', 'genkotsu', 'begin'); }],
  ['Raking the gravel', () => { KC.Dev.load(); if (typeof location !== 'undefined' && /[?&]dev=1/.test(location.search || '')) DEV.enabled = true; }]
];
const link = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/');
  if (SESSION) return ['session', {}];
  switch (h[0]) {
    case 'title': return ['title', {}]; case 'menu': return ['title', { menu: true }];
    case 'road': KC.Story.newGame(); KC.Story.s.node = +h[1] || 0; return null;
    case 'fight': return ['fight', { mode: 'versus', stage: h[1] || 'dojo', white: 'taro', red: h[2] || 'ebi', cpu: [false, true], cpuLevel: 5, seed: 3 }];
    case 'versus': return ['versus', {}]; case 'kachinuki': return null;
    case 'bonus': return ['bonus', { kind: h[1] || 'boards' }]; case 'practice': return ['practice', { lesson: h[1] || 'I' }];
    case 'lab': return ['lab', { tech: h[1] || 'frontKick' }]; case 'attract': return ['attract', { loop: 1 }]; case 'about': return ['about', {}];
    case 'ending': KC.Story.newGame(); KC.Story.s.node = KC.DATA.ladder.length - 1; return null; case 'credits': return ['credits', {}];
    case 'records': return ['records', {}]; case 'movelist': return ['movelist', { back: 'title' }]; case 'freespar': return ['fight', { mode: 'freeSpar', stage: 'dojo', white: 'taro', red: 'negi' }];
    case 'stage': return ['stageSelect', {}];
  }
  return ['title', {}];
};
scenes.boot = SC({ enter() { const l = link(); if (l) game.go(l[0], l[1], { fade: 0 }); else KC.Story.go(); }, update() {}, draw(r) { r.sky(['#05040a', '#05040a']); } });
game.start({ scenes, scene: 'boot', boot: { title: 'KARATE CHAMPON', steps } });

})();
