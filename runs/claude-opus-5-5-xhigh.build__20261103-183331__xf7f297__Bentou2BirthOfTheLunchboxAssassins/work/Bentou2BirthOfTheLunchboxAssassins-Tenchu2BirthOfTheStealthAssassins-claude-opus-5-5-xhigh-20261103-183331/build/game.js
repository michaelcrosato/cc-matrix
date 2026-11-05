(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
/* ---- 00-core.js ---- */
/* =====================================================================================================================
 * BENTOU 2: BIRTH OF THE LUNCHBOX ASSASSINS
 * An original isometric ninja stealth-action game, a playful riff on Tenchu 2: Birth of the Stealth Assassins.
 * CORE LOOP: take a mission at the shop, pack your bento of ninja tools, slip into a lantern-lit night location unseen,
 * silence guards with Silent Cuts, reach the target, survive the boss, escape, and earn a rank that unlocks new tools.
 * The source files are concatenated in order inside one IIFE (tools/build.mjs): E, px, clamp, lerp, approach, TAU are
 * in scope, and every file's top-level names are visible to the files after it.
 * Content (levels, enemies, tools, bosses, lines) is data in registries (B.def); systems talk through the event bus.
 * ===================================================================================================================== */
const B = {};                       // the shared namespace (window.__BENTOU)
B.version = '1.0.0';
if (typeof window !== 'undefined') window.__BENTOU = B;
const REG = {};
/** register a piece of content: B.def('tool', 'shuriken', {...}) */
B.def = (kind, id, spec) => { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; };
B.get = (kind, id) => (REG[kind] || {})[id];
B.all = kind => Object.values(REG[kind] || {});
B.ids = kind => Object.keys(REG[kind] || {});

/* ---- the event bus: noise, seen, detected, alert, bodyFound, silentCut, kill, damage, heroDeath, toolUsed, objective,
 * checkpoint, bell, boss, missionEnd ... Score, the HUD, the music, barks, the hub and the tests all listen ---- */
const BUS = {};
B.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => B.off(ev, fn); };
B.off = (ev, fn) => { const l = BUS[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
B.emit = (ev, data) => {
  const l = BUS[ev]; if (!l) return;
  for (const f of l.slice()) { try { f(data || {}); } catch (e) { if (typeof game !== 'undefined') game.fail('bus ' + ev, e); else throw e; } }
};

/* ---- randomness: rand() is gameplay (Math.random: seeded by the hub and the tests); crand is cosmetic (draw only) ---- */
const rand = () => Math.random();
const randR = (a, b) => a + (b - a) * Math.random();
const randI = (a, b) => Math.floor(a + (b - a + 1) * Math.random());
const pickR = list => list[Math.floor(Math.random() * list.length)];
const crandS = E.rng(20261103);
const crand = () => crandS();
const cpick = list => list[Math.floor(crandS() * list.length)];

/* ---- small helpers ---- */
const T16 = 16;
const D2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ANG = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const cellC = c => (c + .5) * T16;             // a cell's centre in world units
const toCell = v => Math.floor(v / T16);
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hasDOM = typeof document !== 'undefined' && typeof window !== 'undefined';
const safeMedia = q => { try { return !!(typeof matchMedia === 'function' && matchMedia(q).matches); } catch (e) { return false; } };
const deepCopy = o => JSON.parse(JSON.stringify(o));
B.util = { D2, ANG, cellC, toCell, fmtTime, deepCopy };

/* ---- 01-tune.js ---- */
/* ---- TUNE: every important balance number is a live game setting in group 'Dev' (the dev mode's slider pages; the
 * patched Shell keeps the group off the player's Settings). B.T(key) reads the live value, with the difficulty's
 * multiplier where it applies, so a change takes effect on the next step ---- */
const TUNE = [
  // [key, default, min, max, step, label, page]
  ['heroRun', 85, 60, 130, 1, 'Run speed', 'Hero'], ['heroSneak', 32, 18, 50, 1, 'Sneak speed', 'Hero'],
  ['heroSprint', 125, 90, 170, 1, 'Sprint speed', 'Hero'], ['heroHpMul', 1, .5, 2, .05, 'Hero health ×', 'Hero'],
  ['grappleRange', 112, 64, 200, 2, 'Grapple range', 'Hero'], ['grappleSpeed', 240, 120, 400, 5, 'Grapple pull speed', 'Hero'],
  ['breath', 12, 5, 30, .5, 'Breath (s)', 'Hero'], ['noiseRun', 60, 20, 140, 2, 'Running noise', 'Hero'],
  ['sightRange', 112, 60, 200, 2, 'Guard sight range', 'Guards'], ['sightFov', 1.5, .8, 2.4, .05, 'Guard field of view', 'Guards'],
  ['suspRise', 1.4, .4, 3, .05, 'Suspicion rise', 'Guards'], ['suspDecay', .3, .05, 1, .01, 'Suspicion decay', 'Guards'],
  ['darkness', .8, 0, 1, .01, 'Shadow strength', 'Guards'], ['crouchVis', .55, .2, 1, .01, 'Crouched visibility', 'Guards'],
  ['hearing', 1, .3, 2, .05, 'Hearing ×', 'Guards'], ['lookUp', 35, 15, 70, 1, 'Look-up limit (°)', 'Guards'],
  ['killRange', 18, 10, 30, 1, 'Silent Cut range', 'Combat'], ['killBackAngle', 60, 30, 90, 1, 'Back cut angle (°)', 'Combat'],
  ['parryWindow', .18, .05, .4, .01, 'Parry window (s)', 'Combat'], ['enemyDmg', 1, .25, 2, .05, 'Enemy damage ×', 'Combat'],
  ['enemyHp', 1, .5, 2, .05, 'Enemy health ×', 'Combat'], ['enemyWindup', 1, .6, 1.6, .05, 'Enemy wind-up ×', 'Combat'],
  ['smokeTime', 6, 2, 12, .5, 'Smoke time (s)', 'Combat'], ['baitRange', 80, 40, 160, 2, 'Bait range', 'Combat'],
  ['kiRange', 160, 80, 300, 4, 'Ki sense range', 'World'], ['alertShout', 160, 0, 320, 4, 'Alert shout radius', 'World'],
  ['bodyRange', 96, 40, 180, 2, 'Body spotting range', 'World'], ['reinforceDelay', 15, 5, 40, 1, 'Reinforcement delay (s)', 'World'],
  ['ambientNight', .38, .15, .7, .01, 'Night ambient light', 'World'], ['lanternRadius', 1, .5, 1.6, .05, 'Lantern radius ×', 'World'],
  ['parTimeMul', 1, .5, 2, .05, 'Par time ×', 'World'], ['slowmo', .3, .1, 1, .05, 'Silent Cut slow motion', 'World']
];
B.TUNE = TUNE;
B.TUNE_PAGES = ['Hero', 'Guards', 'Combat', 'World'];
const DIFF = {   // perception, damage taken, Ki range
  ninja: { see: 1, dmg: 1, ki: 1 }, novice: { see: .8, dmg: .6, ki: 1.2 }, master: { see: 1.2, dmg: 1.4, ki: .85 }
};
const DIFF_KEYS = { sightRange: 'see', suspRise: 'see', enemyDmg: 'dmg', kiRange: 'ki' };
/** a live balance value: B.T('sightRange') */
const T = key => {
  const S = typeof game !== 'undefined' ? game.settings : null, d = TUNE.find(t => t[0] === key);
  let v = S && S[key] !== undefined ? S[key] : d ? d[1] : 0;
  const dk = DIFF_KEYS[key]; if (dk && S) v *= (DIFF[S.difficulty] || DIFF.ninja)[dk];
  return v;
};
B.T = T;
B.tuneDefault = key => { const d = TUNE.find(t => t[0] === key); return d ? d[1] : undefined; };

/* ---- the player's own settings (group Game; Voices under Sound) ---- */
const GAME_SETTINGS = [
  { key: 'uiScale', label: 'Interface size', options: [[0, 'Auto'], [1, 'Normal'], [1.25, 'Large'], [1.5, 'Huge']], value: 0, help: 'How big menus and HUD text are', apply: g => { if (g.shell && g.shell._uiScale) g.shell._uiScale(); } },
  { key: 'difficulty', label: 'Difficulty', options: [['ninja', 'Ninja'], ['novice', 'Novice'], ['master', 'Grand Master']], value: 'ninja', help: 'How sharp the guards are and how hard they hit' },
  { key: 'camAngle', label: 'Camera angle', options: [['low', 'Low'], ['high', 'High']], value: 'low', apply: g => { if (g.scene && g.scene.isMission) g.setView(g.settings.camAngle === 'high' ? 'threequarter' : 'iso'); } },
  { key: 'invertTurn', label: 'Invert camera turn', value: false },
  { key: 'crouchHold', label: 'Crouch', options: [[false, 'Toggle'], [true, 'Hold']], value: false },
  { key: 'cones', label: 'Sight cones', value: true, help: 'The faint cones of guards you can see' },
  { key: 'marker', label: 'Objective marker', value: true },
  { key: 'showAll', label: 'Show all enemies (assist)', value: false, help: 'Turns Shadow Sight off: every guard is drawn' },
  { key: 'heartbeat', label: 'Ki heartbeat', value: true },
  { key: 'textSpeed', label: 'Text speed', options: [['normal', 'Normal'], ['slow', 'Slow'], ['fast', 'Fast']], value: 'normal' },
  { key: 'blood', label: 'Blood', options: [['ink', 'Ink'], ['off', 'Off']], value: 'ink' },
  { key: 'voices', label: 'Voices', group: 'Sound', value: .8, min: 0, max: 1, step: .05, type: 'slider', apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } }
];
const DEV_SETTINGS = TUNE.map(([key, value, min, max, step, label]) => ({ key, label, value, min, max, step, type: 'slider', group: 'Dev' }));

/* ---- 02-input.js ---- */
/* ---- INPUT: the action map (every action rebindable on the standard Controls screen), the player's intent (the hero
 * reads only intents: the player's, the autopilot's or a test's), device and touch-only detection, and the "any input"
 * clock that starts attract mode. In play the d-pad does not move the hero: it picks tools ---- */
B.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  jump: ['Space', 'Pad0'], crouch: ['KeyC', 'Pad1'], attack: ['Mouse0', 'KeyJ', 'Pad2'], interact: ['KeyF', 'Pad3'],
  block: ['Mouse2', 'KeyK', 'Pad4'], grapple: ['KeyG', 'Mouse1', 'Pad5'], focus: ['Tab', 'Pad6'], useTool: ['KeyR', 'Pad7'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'], toolPrev: ['BracketLeft', 'Pad14'], toolNext: ['BracketRight', 'Pad15'],
  heal: ['KeyH', 'Pad13'], lure: ['KeyV', 'Pad12'], camLeft: ['KeyQ'], camRight: ['KeyE'], camReset: ['KeyX', 'Pad11'],
  objectives: ['KeyM', 'Pad8'],
  tool1: ['Digit1'], tool2: ['Digit2'], tool3: ['Digit3'], tool4: ['Digit4'], tool5: ['Digit5'], tool6: ['Digit6'], tool7: ['Digit7'], tool8: ['Digit8'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const CONTROL_NAMES = { jump: 'Jump / climb', crouch: 'Crouch', attack: 'Strike / Silent Cut', interact: 'Interact', block: 'Block / parry',
  grapple: 'Grappling hook', focus: 'Ki Focus', useTool: 'Use tool', sprint: 'Sprint', toolPrev: 'Previous tool', toolNext: 'Next tool',
  heal: 'Eat rice ball', lure: 'Whistle', camLeft: 'Turn camera left', camRight: 'Turn camera right', camReset: 'Reset camera',
  objectives: 'Objectives', tool1: false, tool2: false, tool3: false, tool4: false, tool5: false, tool6: false, tool7: false, tool8: false };

/* ---- the "any input" clock: keys, buttons, a stick past the dead zone, a mouse move over 4 px, the wheel, a click or a
 * touch all reset it (attract mode starts after 10 s without any) ---- */
B.lastInput = 0;
B.noteInput = () => { B.lastInput = typeof game !== 'undefined' ? game.real : 0; B.inputSeen = true; };
B.wheel = 0;
B.sawKeyOrPad = false;
if (hasDOM) {
  let mx = null, my = null;
  addEventListener('keydown', () => { B.noteInput(); B.sawKeyOrPad = true; }, true);
  addEventListener('pointerdown', () => B.noteInput(), true);
  addEventListener('touchstart', () => B.noteInput(), { capture: true, passive: true });
  addEventListener('pointermove', e => { if (mx === null || Math.hypot(e.clientX - mx, e.clientY - my) > 4) { if (mx !== null) B.noteInput(); mx = e.clientX; my = e.clientY; } }, true);
  addEventListener('wheel', e => { B.noteInput(); B.wheel += Math.sign(e.deltaY); }, { capture: true, passive: true });
  addEventListener('gamepadconnected', () => { B.sawKeyOrPad = true; B.noteInput(); });
}
/** each step: buttons and sticks count as input too (the DOM events above do not see a gamepad) */
B.pollInput = () => {
  const I = game.input;
  if (I.anyPressed()) B.noteInput();
  const ax = I.padAxes || [];
  for (let i = 0; i < Math.min(4, ax.length); i++) if (Math.abs(ax[i] || 0) > .35) { B.noteInput(); break; }
  if (I.padIndex !== null && I.padIndex !== undefined) B.sawKeyOrPad = true;
};
/** touch-only: no fine pointer, a touch screen, no gamepad and no key pressed yet */
B.touchOnly = () => hasDOM && !B.sawKeyOrPad && !safeMedia('(any-pointer: fine)') && (navigator.maxTouchPoints || 0) > 0;

/** mouse mode: the mouse moved within the last 3 s and no key or stick since (cursor aiming, hover, the camera lean) */
B.mouseMode = () => { const I = game.input; return I.lastDevice === 'mouse' && I.mouse && I.mouse.t !== undefined && I.clock - I.mouse.t < 3; };

const held = (a, pads) => { const I = game.input, codes = I.map[a] || []; for (const c of codes) if (I.held.has(c) && (pads || !/^Pad1[2-5]$/.test(c))) return true; return false; };
/** the player's intent this step (the hero reads nothing else). Movement: the left stick and the keys, never the d-pad */
B.intentFromInput = () => {
  const I = game.input, P = a => I.pressed(a), D = a => I.down(a);
  let sx = 0, sy = 0;
  const ax = I.padAxes || [];
  if (I.padIndex !== null && I.padIndex !== undefined && ax.length >= 2) {
    const x = ax[0] || 0, y = ax[1] || 0, m = Math.hypot(x, y), dz = I.deadzone || .18;
    if (m > dz) { const k = Math.min(1, (m - dz) / (1 - dz)) / m; sx = x * k; sy = y * k; }
  }
  let kx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), ky = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  if (kx || ky) { const l = Math.hypot(kx, ky); sx = kx / l; sy = ky / l; }
  const g = game.view.screenDirToGround(sx, sy), len = Math.min(1, Math.hypot(sx, sy)), gl = Math.hypot(g[0], g[1]) || 1;
  const move = len > .05 ? [g[0] / gl * len, g[1] / gl * len] : [0, 0];
  let slot = -1; for (let i = 1; i <= 8; i++) if (P('tool' + i)) slot = i - 1;
  let toolDelta = (P('toolNext') ? 1 : 0) - (P('toolPrev') ? 1 : 0);
  if (B.wheel) { toolDelta += B.wheel > 0 ? 1 : -1; B.wheel = 0; }
  const aim = I.padAim, mm = B.mouseMode();
  const it = { move, walk: len > .05 && len < .55, sprint: D('sprint'), crouchPressed: P('crouch'), crouchDown: D('crouch'),
    jumpPressed: P('jump'), attackPressed: P('attack'), blockDown: D('block'), blockPressed: P('block'),
    interactPressed: P('interact'), interactDown: D('interact'), grapplePressed: P('grapple'), grappleDown: D('grapple'), grappleReleased: I.released('grapple'),
    usePressed: P('useTool'), focusDown: D('focus'), toolDelta, toolSlot: slot, healPressed: P('heal'), lurePressed: P('lure'),
    aimPoint: mm ? game.mouseGround() : null, mouseMode: mm, rstick: aim ? [aim[0], aim[1]] : null, player: true };
  return it;
};
/** an empty intent (cutscenes, menus, the hub's end) */
B.noIntent = () => ({ move: [0, 0], toolDelta: 0, toolSlot: -1, aimPoint: null });

/* ---- 03-glyphs.js ---- */
/* ---- GLYPHS: button icons drawn in game pixels for the device used last (PlayStation symbols by default, Xbox letters
 * in Settings, keycaps for the keyboard, a mouse with its button lit). Canvas text can embed {a:attack}, which draws that
 * action's icon inline. HTML text (the Shell) uses input.label() ---- */
const Glyph = {};
Glyph.device = () => { const d = typeof game !== 'undefined' ? game.input.lastDevice : 'keyboard'; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'keys'; };
Glyph.code = (a, dev = Glyph.device()) => {
  const codes = (game.input.map[a] || []).filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  if (dev === 'pad') return codes.find(c => /^Pad\d/.test(c)) || codes[0];
  if (dev === 'mouse') return codes.find(c => /^Mouse/.test(c)) || codes.find(c => !/^(Pad|Mouse)/.test(c)) || codes[0];
  return codes.find(c => !/^(Pad|Mouse)/.test(c)) || codes.find(c => /^Mouse/.test(c)) || codes[0];
};
Glyph.family = () => (game.input.padStyle && game.input.padStyle() === 'xbox') || game.settings.glyphs === 'xbox' ? 'xbox' : 'ps';
const PS_FACE = [['#7ab4ff', 'x'], ['#ff6a6a', 'o'], ['#ff8ad8', 'sq'], ['#5ae0a0', 'tri']];
const XB_FACE = [['#5ad05a', 'A'], ['#ff5a4a', 'B'], ['#4a9aff', 'X'], ['#f0c83a', 'Y']];
const PAD_NAMES = { ps: ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3'], xbox: ['', '', '', '', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] };
const tinyW = s => E.font.width(s, { font: 'tiny' });
const tinyT = (g, s, x, y, c) => E.font.text(g, s, x, y, c, { font: 'tiny', outline: false });
/** draw one code's icon with its top-left at (x, y), height 10; returns its width (dry: measure only) */
Glyph.drawCode = (g, code, x, y, dry = false) => {
  x = Math.round(x); y = Math.round(y);
  if (!code) return 0;
  const pm = /^Pad(\d+)$/.exec(code);
  if (pm) {
    const n = +pm[1], fam = Glyph.family();
    if (n <= 3) {   // a face button: a dark disc with its symbol
      if (dry) return 10;
      px.disc(g, x + 5, y + 5, 5, '#101018'); px.disc(g, x + 5, y + 5, 4, '#26263a');
      if (fam === 'xbox') { const [c, l] = XB_FACE[n]; px.disc(g, x + 5, y + 5, 4, c); tinyT(g, l, x + 4, y + 3, '#101018'); return 10; }
      const [c, s] = PS_FACE[n];
      if (s === 'x') { px.line(g, x + 3, y + 3, x + 7, y + 7, c); px.line(g, x + 7, y + 3, x + 3, y + 7, c); }
      else if (s === 'o') { px.disc(g, x + 5, y + 5, 3, c); px.disc(g, x + 5, y + 5, 2, '#26263a'); }
      else if (s === 'sq') { px.rect(g, x + 3, y + 3, 5, 5, c); px.rect(g, x + 4, y + 4, 3, 3, '#26263a'); }
      else { px.line(g, x + 5, y + 2, x + 2, y + 7, c); px.line(g, x + 5, y + 2, x + 8, y + 7, c); px.line(g, x + 2, y + 7, x + 8, y + 7, c); }
      return 10;
    }
    if (n >= 12 && n <= 15) {   // the d-pad: a cross with the used arm lit
      if (dry) return 10;
      px.rect(g, x + 3, y, 4, 10, '#101018'); px.rect(g, x, y + 3, 10, 4, '#101018'); px.rect(g, x + 4, y + 1, 2, 8, '#4a4a60'); px.rect(g, x + 1, y + 4, 8, 2, '#4a4a60');
      const lit = '#f4ead5'; if (n === 12) px.rect(g, x + 4, y + 1, 2, 3, lit); if (n === 13) px.rect(g, x + 4, y + 6, 2, 3, lit); if (n === 14) px.rect(g, x + 1, y + 4, 3, 2, lit); if (n === 15) px.rect(g, x + 6, y + 4, 3, 2, lit);
      return 10;
    }
    const name = (PAD_NAMES[fam] || PAD_NAMES.ps)[n] || 'PS', w = tinyW(name) + (n >= 8 && n <= 9 ? 8 : 6);
    if (dry) return w;
    if (n >= 10) { px.disc(g, x + w / 2, y + 5, 5, '#101018'); px.disc(g, x + w / 2, y + 5, 4, '#3a3a50'); tinyT(g, name, x + 3, y + 3, '#f4ead5'); return w; }   // a stick press: a ring
    px.rect(g, x + 1, y + 1, w - 2, 8, '#101018'); px.rect(g, x, y + 2, w, 6, '#101018'); px.rect(g, x + 1, y + 2, w - 2, 6, n >= 8 ? '#3a3a50' : '#4a4a62');
    tinyT(g, name, x + (n >= 8 ? 4 : 3), y + 3, '#f4ead5'); return w;
  }
  const mm = /^Mouse(\d)$/.exec(code);
  if (mm) {   // a mouse with its button lit
    if (dry) return 8;
    const b = +mm[1]; px.rect(g, x + 1, y, 6, 10, '#101018'); px.rect(g, x + 2, y + 1, 4, 8, '#d8d0c0'); px.rect(g, x + 2, y + 4, 4, 1, '#101018'); px.rect(g, x + 4, y + 1, 0 + 1, 3, '#101018');
    const lit = '#e8b04a'; if (b === 0) px.rect(g, x + 2, y + 1, 2, 3, lit); else if (b === 2) px.rect(g, x + 5, y + 1, 1, 3, lit); else px.rect(g, x + 4, y + 1, 1, 3, lit);
    return 8;
  }
  let label = String(game.input.codeLabel(code) || code).toUpperCase().replace('LEFT ', 'L').replace('RIGHT ', 'R');
  if (label.length > 6) label = label.slice(0, 6);
  const w = Math.max(10, tinyW(label) + 6);
  if (dry) return w;
  px.rect(g, x, y, w, 10, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 8, '#e8e0cc'); px.rect(g, x + 1, y + 7, w - 2, 2, '#a8a090');
  tinyT(g, label, x + Math.round((w - tinyW(label)) / 2), y + 2, '#1a1418'); return w;
};
/** an action's icon on the current device (or o.dev): returns its width */
Glyph.draw = (g, a, x, y, o = {}) => Glyph.drawCode(g, Glyph.code(a, o.dev), x, y, o.dry);
Glyph.width = (a, o = {}) => Glyph.drawCode(null, Glyph.code(a, o.dev), 0, 0, true);
/** canvas text with inline {a:action} icons: returns its width. o: { align: 'left' | 'center' | 'right', scale, shadow } */
Glyph.text = (g, str, x, y, color = '#f4ead5', o = {}) => {
  const parts = String(str).split(/(\{a:[a-zA-Z0-9]+\})/).filter(s => s.length), sc = o.scale || 1, opt = { shadow: o.shadow === undefined ? '#000' : o.shadow, outline: false, scale: sc };
  const meas = p => { const m = /^\{a:(\w+)\}$/.exec(p); return m ? Glyph.width(m[1], o) + 2 : E.font.width(p, opt); };
  const W = parts.reduce((s, p) => s + meas(p), 0);
  if (o.dry) return W;
  let cx = Math.round(o.align === 'center' ? x - W / 2 : o.align === 'right' ? x - W : x);
  for (const p of parts) {
    const m = /^\{a:(\w+)\}$/.exec(p);
    if (m) { cx += Glyph.draw(g, m[1], cx, y - 2 + (sc - 1) * 3, o) + 2; }
    else { E.font.text(g, p, cx, y, color, opt); cx += E.font.width(p, opt); }
  }
  return W;
};
/** the HTML (Shell) label of an action for the device used last: 'Space', '✕', 'Left click' */
Glyph.label = a => { const c = Glyph.code(a); return c ? game.input.codeLabel(c) : game.input.label(a); };
B.Glyph = Glyph;

/* ---- 05-game.js ---- */
/* ---- THE GAME: one E.Game for every scene (title, story, missions, Workshop, attract, the hub). The pause menu's items
 * come from B.pauseItems() each time it opens (a hub session gets Resume, Settings and Controls only) ---- */
const HUBACTIVE = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);
GAME_SETTINGS.forEach(s => { const ap = s.apply; if (ap) s.apply = (g, v) => { if (g.audio && g.settings) { try { ap(g, v); } catch (e) { /* not ready yet */ } } }; });
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso', 'threequarter'], input: B.INPUT, bg: '#05040a', id: 'bentou2',
  menu: { items: () => (B.pauseItems ? B.pauseItems() : []), settings: GAME_SETTINGS.concat(DEV_SETTINGS), controls: CONTROL_NAMES, quit: HUBACTIVE ? false : 'title' },
  camera: { zoom: false }, corner: !HUBACTIVE });   // (in a session the hub's own corner bar stands in for the engine's)
B.game = game;
const Pt = game.particles, Lt = game.lights, Au = game.audio;
Au.voiceVolume = game.settings.voices;
const ui = new E.Shell(game, { theme: { ink: '#f4ead5', paper: 'rgba(20,12,12,.92)', accent: '#e8b04a', muted: '#b8a890', danger: '#d8402a',
  line: 'rgba(232,176,74,.35)', font: 'system-ui, sans-serif', titleFont: 'Georgia, "Times New Roman", serif' } });
B.ui = ui;
E.style.propSize = 1.4;
if (hasDOM && typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'Tab' || e.code === 'Space') { if (!(ui.screen)) e.preventDefault(); } }, true);

/* ---- 04-camera.js ---- */
/* ---- CAMERA: follow with look-ahead (the mouse leans the view toward the cursor; Ki Focus + right stick scouts), 45°
 * turns (Q / E, a right-stick flick), zoom (- / =, right stick up and down), and cinematic overrides (the Silent Cut
 * zoom, boss intros, cutscenes) layered on the scene's own zoom ---- */
const Cam = { turnCd: 0, lean: [0, 0], cineK: 1, cineTo: 1, cineT: 0, focusK: 1, flick: 0, target: null, override: null };
Cam.base = () => (game.upright ? 1.35 : 1.15);
Cam.reset = () => { Cam.lean = [0, 0]; Cam.cineK = Cam.cineTo = 1; Cam.cineT = 0; Cam.focusK = 1; Cam.override = null; Cam.turnCd = 0; game.cam.free = null; game.setZoom(Cam.base()); };
/** a cinematic zoom: k times the base for `hold` seconds (game time), eased in and out */
Cam.cine = (k, hold = .6) => { if (game.reduceMotion) k = 1 + (k - 1) * .4; Cam.cineTo = k; Cam.cineT = hold; };
/** turn the view by ±45° (with a short whoosh); dir: -1 left, +1 right */
Cam.turn = dir => {
  if (Cam.turnCd > 0) return false;
  Cam.turnCd = .25; game.rotateView(45 * dir * (game.settings.invertTurn ? -1 : 1)); Au.sfx('whoosh', { vol: .25, pitch: 1.4 }); return true;
};
/** each step of play: aim the camera (call after the hero moved) */
Cam.update = (dt, hero, it) => {
  Cam.turnCd = Math.max(0, Cam.turnCd - dt / Math.max(.05, game.timeScale));
  if (Cam.cineT > 0) { Cam.cineT -= dt / Math.max(.05, game.timeScale); if (Cam.cineT <= 0) Cam.cineTo = 1; }
  Cam.cineK = approach(Cam.cineK, Cam.cineTo, dt / Math.max(.05, game.timeScale) * 5 * Math.max(.2, Math.abs(Cam.cineTo - Cam.cineK) * 3));
  Cam.focusK = approach(Cam.focusK, it && it.focusDown ? .9 : 1, dt * 1.2);
  const I = game.input, pl = it && it.player;
  if (pl) {
    if (I.pressed('camLeft')) Cam.turn(-1); if (I.pressed('camRight')) Cam.turn(1);
    if (I.pressed('camReset')) { game.resetCamera(); Cam.reset(); }
    const rs = it.rstick;
    if (rs && !it.focusDown) {
      if (Math.abs(rs[0]) > .7 && Math.abs(rs[0]) > Math.abs(rs[1])) { if (!Cam.flick) { Cam.flick = 1; Cam.turn(rs[0] > 0 ? 1 : -1); } }
      else if (Math.abs(rs[0]) < .3) Cam.flick = 0;
      if (Math.abs(rs[1]) > .5 && Math.abs(rs[1]) > Math.abs(rs[0])) game.zoomBy(1 - rs[1] * dt * .9);
    } else Cam.flick = 0;
  }
  game.setZoom(Cam.base() * Cam.cineK * Cam.focusK);
  if (Cam.override) { const o = Cam.override; game.focus(o.x, o.y, o.z || 0); return; }
  if (!hero) return;
  // look-ahead: the mouse leans up to 40 (140 with Focus); Focus + right stick scouts up to 140 on a pad; a hug peeks 48
  let lx = 0, ly = 0;
  if (it && it.aimPoint && it.mouseMode) { const dx = it.aimPoint.x - hero.x, dy = it.aimPoint.y - hero.y, d = Math.hypot(dx, dy) || 1, m = Math.min(d * .35, it.focusDown ? 140 : 40); lx = dx / d * m; ly = dy / d * m; }
  else if (it && it.focusDown && it.rstick) { const g = game.view.screenDirToGround(it.rstick[0], it.rstick[1]); lx = g[0] * 140; ly = g[1] * 140; }
  if (hero.peek) { lx += hero.peek[0] * 48; ly += hero.peek[1] * 48; }
  Cam.lean[0] = approach(Cam.lean[0], lx, dt * 220); Cam.lean[1] = approach(Cam.lean[1], ly, dt * 220);
  game.focus(hero.x + Cam.lean[0], hero.y + Cam.lean[1], (hero.drawZ !== undefined ? hero.drawZ : hero.z) + 18);
};
B.Cam = Cam;

/* ---- 10-audio.js ---- */
/* ---- AUDIO: every sound is synthesized (the engine's chip synth with the patched pluck envelopes). Music in Japanese
 * scales (Hirajoshi D E F A Bb; In E F A B C), one mission song in layers: drone + koto always, shamisen for tension,
 * taiko + fue for an alert. Stings are short voice lists ---- */
const SFX = {
  stepDirt: { wave: 'noise', freq: 900, to: 400, dur: .05, vol: .05, filter: 'lowpass' },
  stepGravel: [{ wave: 'noise', freq: 2600, to: 1800, dur: .07, vol: .07, filter: 'bandpass', q: 2 }, { wave: 'noise', freq: 1500, dur: .05, vol: .04, delay: .02 }],
  stepWood: [{ wave: 'triangle', freq: 180, to: 120, dur: .05, vol: .09 }, { wave: 'noise', freq: 1200, dur: .03, vol: .03 }],
  stepTatami: { wave: 'noise', freq: 600, to: 300, dur: .06, vol: .03, filter: 'lowpass' },
  splash: [{ wave: 'noise', freq: 1800, to: 500, dur: .25, vol: .12, filter: 'lowpass' }, { wave: 'noise', freq: 3200, dur: .12, vol: .05, delay: .04 }],
  swim: { wave: 'noise', freq: 700, to: 1200, dur: .22, vol: .05, filter: 'bandpass', q: 1.5 },
  dive: [{ wave: 'noise', freq: 2000, to: 300, dur: .35, vol: .12, filter: 'lowpass' }, { wave: 'sine', freq: 300, to: 120, dur: .3, vol: .06 }],
  bubble: { wave: 'sine', freq: 600, to: 1300, dur: .06, vol: .05 },
  grappleThrow: { wave: 'noise', freq: 1400, to: 3200, dur: .18, vol: .08, filter: 'bandpass', q: 3 },
  grappleClink: [{ wave: 'square', freq: 2400, dur: .04, vol: .06 }, { wave: 'triangle', freq: 1800, dur: .12, vol: .07, delay: .02 }],
  grappleZip: { wave: 'noise', freq: 800, to: 2600, dur: .3, vol: .07, filter: 'bandpass', q: 4 },
  shuriken: { wave: 'noise', freq: 4200, to: 2800, dur: .16, vol: .06, filter: 'bandpass', q: 6 },
  thunk: [{ wave: 'triangle', freq: 220, to: 90, dur: .06, vol: .12 }, { wave: 'noise', freq: 900, dur: .04, vol: .05 }],
  clash: [{ wave: 'square', freq: 1800, to: 1200, dur: .08, vol: .08 }, { wave: 'noise', freq: 5000, dur: .1, vol: .07, filter: 'highpass' }, { wave: 'triangle', freq: 2600, dur: .3, vol: .04, delay: .01 }],
  parry: [{ wave: 'triangle', freq: 2200, dur: .6, vol: .1 }, { wave: 'sine', freq: 3300, dur: .5, vol: .06 }, { wave: 'noise', freq: 6000, dur: .08, vol: .08, filter: 'highpass' }],
  cutTwang: [{ wave: 'saw', freq: 'D5', to: 'D4', dur: .45, vol: .1 }, { wave: 'pulse12', freq: 'A5', dur: .5, vol: .06, delay: .03 }, { wave: 'noise', freq: 400, to: 4000, dur: .35, vol: .06, filter: 'bandpass', delay: .1 }],
  thud: [{ wave: 'sine', freq: 110, to: 50, dur: .18, vol: .2 }, { wave: 'noise', freq: 400, dur: .08, vol: .06, filter: 'lowpass' }],
  bodyDrop: [{ wave: 'sine', freq: 90, to: 45, dur: .2, vol: .18 }, { wave: 'noise', freq: 600, to: 200, dur: .15, vol: .06, filter: 'lowpass' }],
  slash: { wave: 'noise', freq: 2200, to: 900, dur: .1, vol: .08, filter: 'bandpass', q: 2 },
  smoke: [{ wave: 'noise', freq: 1200, to: 300, dur: .5, vol: .12, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 70, dur: .2, vol: .08 }],
  caltrops: [{ wave: 'square', freq: 3000, dur: .02, vol: .04 }, { wave: 'square', freq: 3600, dur: .02, vol: .04, delay: .05 }, { wave: 'square', freq: 2700, dur: .02, vol: .04, delay: .09 }],
  firecracker: [{ wave: 'noise', freq: 3000, dur: .05, vol: .2 }, { wave: 'noise', freq: 2500, dur: .05, vol: .18, delay: .08 }, { wave: 'noise', freq: 3400, dur: .05, vol: .2, delay: .15 }, { wave: 'noise', freq: 2000, dur: .07, vol: .2, delay: .21 }],
  bell: [{ wave: 'sine', freq: 196, dur: 3.2, vol: .22 }, { wave: 'sine', freq: 470, dur: 2.4, vol: .09 }, { wave: 'sine', freq: 612, dur: 1.7, vol: .06 }, { wave: 'triangle', freq: 98, dur: 2.6, vol: .1 }, { wave: 'noise', freq: 2400, dur: .05, vol: .08 }],
  bark: [{ wave: 'square', freq: 520, to: 300, dur: .09, vol: .1 }, { wave: 'noise', freq: 900, dur: .07, vol: .08, filter: 'bandpass', q: 2 }, { wave: 'square', freq: 480, to: 280, dur: .08, vol: .09, delay: .16 }],
  growl: { wave: 'saw', freq: 90, to: 70, dur: .45, vol: .07, vib: [24, .06] },
  whine: { wave: 'sine', freq: 900, to: 600, dur: .4, vol: .06 },
  crunch: [{ wave: 'noise', freq: 1600, dur: .04, vol: .06 }, { wave: 'noise', freq: 1300, dur: .04, vol: .06, delay: .12 }, { wave: 'noise', freq: 1500, dur: .04, vol: .05, delay: .26 }],
  snore: { wave: 'saw', freq: 70, to: 90, dur: .8, vol: .04, vib: [18, .05] },
  heart: [{ wave: 'sine', freq: 62, to: 40, dur: .12, vol: .22 }, { wave: 'sine', freq: 58, to: 38, dur: .1, vol: .16, delay: .16 }],
  thunder: [{ wave: 'noise', freq: 300, to: 80, dur: 1.6, vol: .25, filter: 'lowpass' }, { wave: 'noise', freq: 900, to: 200, dur: .5, vol: .12, delay: .1 }],
  eat: [{ wave: 'noise', freq: 1400, dur: .04, vol: .05 }, { wave: 'triangle', freq: 'A5', to: 'E6', dur: .12, vol: .06, delay: .1 }],
  pickup: [{ wave: 'pulse12', freq: 'D5', dur: .5, vol: .08 }, { wave: 'pulse12', freq: 'A5', dur: .5, vol: .07, delay: .07 }],
  whistle: { wave: 'sine', freq: 1800, to: 2300, dur: .35, vol: .08, vib: [7, .02] },
  creak: { wave: 'saw', freq: 140, to: 190, dur: .14, vol: .03 },
  lever: [{ wave: 'square', freq: 160, to: 110, dur: .25, vol: .08 }, { wave: 'noise', freq: 500, dur: .2, vol: .05 }],
  gate: [{ wave: 'saw', freq: 70, to: 50, dur: 1.2, vol: .08 }, { wave: 'noise', freq: 300, dur: 1, vol: .05, filter: 'lowpass' }],
  arrow: { wave: 'noise', freq: 3000, to: 1500, dur: .2, vol: .06, filter: 'bandpass', q: 5 },
  bowDraw: { wave: 'saw', freq: 220, to: 330, dur: .5, vol: .025 },
  fire: { wave: 'noise', freq: 700, dur: .6, vol: .06, filter: 'lowpass' },
  roar: [{ wave: 'saw', freq: 80, to: 55, dur: 1, vol: .14, vib: [14, .08] }, { wave: 'noise', freq: 500, to: 200, dur: .9, vol: .1, filter: 'lowpass' }],
  vanish: [{ wave: 'noise', freq: 4000, to: 600, dur: .3, vol: .1, filter: 'bandpass' }, { wave: 'triangle', freq: 'A6', to: 'A5', dur: .25, vol: .05 }],
  shing: [{ wave: 'triangle', freq: 'E6', dur: .4, vol: .07 }, { wave: 'sine', freq: 'B6', dur: .3, vol: .04, delay: .02 }],
  stomp: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .25 }, { wave: 'noise', freq: 300, to: 100, dur: .4, vol: .12, filter: 'lowpass' }],
  // ---- interface ----
  uiMove: { wave: 'triangle', freq: 'A4', to: 'G4', dur: .04, vol: .06 },
  uiConfirm: [{ wave: 'pulse12', freq: 'D5', dur: .4, vol: .07 }, { wave: 'pulse12', freq: 'A5', dur: .45, vol: .05, delay: .05 }],
  uiBack: { wave: 'triangle', freq: 'A4', to: 'D4', dur: .1, vol: .06 },
  fusuma: { wave: 'noise', freq: 600, to: 1400, dur: .3, vol: .05, filter: 'bandpass', q: 1.2 },
  stamp: [{ wave: 'sine', freq: 90, to: 40, dur: .25, vol: .3 }, { wave: 'noise', freq: 500, dur: .1, vol: .15, filter: 'lowpass' }, { wave: 'square', freq: 120, to: 60, dur: .08, vol: .08 }],
  // ---- stings ----
  stingCut: [{ wave: 'noise', freq: 300, to: 3000, dur: .4, vol: .05, filter: 'bandpass' }, { wave: 'saw', freq: 'D4', dur: .6, vol: .07, delay: .35 }, { wave: 'pulse12', freq: 'D6', to: 'A5', dur: .7, vol: .05, delay: .36 }],
  stingAlert: [{ wave: 'square', freq: 'Bb5', dur: .12, vol: .08 }, { wave: 'square', freq: 'Bb5', dur: .3, vol: .08, delay: .14 }, { wave: 'noise', freq: 200, dur: .25, vol: .12, filter: 'lowpass', delay: .1 }],
  stingObjective: [{ wave: 'pulse12', freq: 'D5', dur: .4, vol: .06 }, { wave: 'pulse12', freq: 'F5', dur: .4, vol: .06, delay: .12 }, { wave: 'pulse12', freq: 'A5', dur: .7, vol: .06, delay: .24 }],
  stingTool: [{ wave: 'pulse12', freq: 'A4', dur: .5, vol: .06 }, { wave: 'pulse12', freq: 'D5', dur: .5, vol: .06, delay: .1 }, { wave: 'pulse12', freq: 'E5', dur: .5, vol: .06, delay: .2 }, { wave: 'pulse12', freq: 'A5', dur: 1, vol: .07, delay: .3 }],
  stingOver: [{ wave: 'pulse12', freq: 'A4', dur: .7, vol: .07 }, { wave: 'pulse12', freq: 'F4', dur: .7, vol: .07, delay: .3 }, { wave: 'pulse12', freq: 'E4', dur: .7, vol: .07, delay: .6 }, { wave: 'pulse12', freq: 'D4', dur: 1.4, vol: .07, delay: .9 }, { wave: 'triangle', freq: 'D2', dur: 2, vol: .12, delay: .9 }]
};
for (const k in SFX) Au.define(k, SFX[k]);
/** a sound in the world: quieter with distance from the camera's focus, silent past 320 */
const sfxAt = (name, x, y, o = {}) => {
  const h = B.M && B.M.hero, d = h ? Math.hypot(x - h.x, y - h.y) : 0, k = clamp(1 - d / 320, 0, 1);
  if (k > .02) Au.sfx(name, Object.assign({}, o, { vol: (o.vol === undefined ? 1 : o.vol) * k }));
};
B.sfxAt = sfxAt;

/* ---- SONGS (steps: 2 = eighth notes; 8 tokens a bar) ---- */
const KOTO = { name: 'koto', wave: 'pulse12', pluck: true, ring: 1.2 }, SHAM = { name: 'shamisen', wave: 'saw', pluck: true, ring: .35 };
const SHAKU = { name: 'shaku', wave: 'sine', attack: .09, vib: [5, .012] }, FUE = { name: 'fue', wave: 'pulse', vib: [6, .015], attack: .03 };
const DRONE = { name: 'drone', wave: 'triangle' }, TAIKO = { name: 'taiko', wave: 'drums' };
const tr = (base, o) => Object.assign({}, base, o);
const SONGS = {
  title: { bpm: 72, steps: 2, tracks: [
    tr(DRONE, { vol: .2, notes: 'D3 - - - - - - - | D3 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -' }),
    tr(KOTO, { vol: .1, notes: 'D5 . A4 . Bb4 A4 F4 . | E4 . F4 A4 D5 . . . | F5 . E5 D5 A4 . Bb4 . | A4 . F4 E4 D4 . . . | D5 . A4 . Bb4 A4 F4 . | E4 . F4 A4 D5 . E5 . | F5 . E5 D5 Bb4 . A4 . | E4 . F4 E4 D4 . . .' }),
    tr(SHAKU, { vol: .08, notes: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | A5 - - - F5 - E5 - | D5 - - - - - . . | Bb4 - - - A4 - F4 - | E4 - - - - - - . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .' }),
    tr(TAIKO, { vol: .1, notes: 'k . . . . . . . | . . . . . . . . | k . . . . . . . | . . . . k . t t' })] },
  shop: { bpm: 96, steps: 2, tracks: [
    tr(DRONE, { vol: .14, notes: 'D3 - - - - - - - | A2 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -' }),
    tr(SHAM, { vol: .08, notes: 'D4 . D4 F4 A4 . F4 . | E4 . E4 F4 E4 . D4 . | Bb3 . D4 F4 A4 . Bb4 . | A4 . F4 . E4 . . .' }),
    tr(KOTO, { vol: .07, notes: '. . A5 . . . F5 . | . . E5 . D5 . . . | . . F5 . . . A5 . | . . E5 . D5 . . .' }),
    tr(TAIKO, { vol: .07, notes: 'k . . t . . t . | k . t . . . c .' })] },
  training: { bpm: 84, steps: 2, tracks: [
    tr(DRONE, { vol: .16, notes: 'D2 - - - - - - - | D2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'D4 . . . A4 . . . | Bb4 . . A4 . . . . | F4 . . . E4 . . . | D4 . . . . . . . | A4 . . . D5 . . . | E5 . . D5 . . . . | Bb4 . . . A4 . . . | F4 . E4 . D4 . . .' }),
    tr(SHAKU, { vol: .05, notes: '. . . . . . . . | A4 - - - - - - - | . . . . . . . . | . . . . . . . . | . . . . . . . . | F4 - - - E4 - - - | . . . . . . . . | . . . . . . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'D4 D4 . F4 . E4 D4 . | A3 . A3 Bb3 A3 . F3 . | D4 D4 . F4 . A4 F4 . | E4 . D4 . A3 . . .' }),
    tr(TAIKO, { vol: .12, on: false, notes: 'k . . k . . t . | k . k . t . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'A5 - - - Bb5 A5 F5 - | E5 - - - D5 - - - | F5 - E5 - D5 - A4 - | Bb4 - A4 - - - - -' })] },
  m1: { bpm: 90, steps: 2, tracks: [
    tr(DRONE, { vol: .17, notes: 'D2 - - - - - - - | D2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'D4 . A3 . D4 . E4 . | F4 . E4 . D4 . A3 . | Bb3 . D4 . F4 . E4 . | D4 . . . A3 . . . | D4 . A3 . D4 . F4 . | A4 . F4 . E4 . D4 . | Bb3 . D4 . E4 . F4 . | E4 . D4 . A3 . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'D4 D4 . F4 . E4 D4 . | A3 . A3 Bb3 A3 . F3 . | D4 D4 . F4 . A4 F4 . | E4 . D4 . A3 . . .' }),
    tr(TAIKO, { vol: .13, on: false, notes: 'k . . k . . t . | k . k . t . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'A5 - - - Bb5 A5 F5 - | E5 - - - D5 - - - | F5 - E5 - D5 - A4 - | Bb4 - A4 - - - - -' })] },
  m2: { bpm: 78, steps: 2, tracks: [
    tr(DRONE, { vol: .17, notes: 'E2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - -' }),
    tr(KOTO, { vol: .07, ring: 1.6, notes: 'E5 . . . . . B4 . | . . C5 . . . . . | A4 . . . . F4 . . | E4 . . . . . . . | B5 . . . . . A5 . | . . F5 . . . . . | E5 . . . C5 . . . | B4 . . . . . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'E3 . E3 F3 . E3 . . | A3 . B3 . C4 . B3 . | E3 . E3 F3 . A3 . . | B3 . A3 . F3 . E3 .' }),
    tr(TAIKO, { vol: .13, on: false, notes: 'k . . . k . t . | k . t k . . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'B5 - - - C6 - B5 - | A5 - - - F5 - - - | E5 - F5 - A5 - B5 - | C6 - B5 - A5 - - -' })] },
  m3: { bpm: 88, steps: 2, tracks: [
    tr(DRONE, { vol: .16, notes: 'A1 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'A3 . E4 . A4 . B4 . | C5 . B4 . A4 . E4 . | F4 . E4 . C4 . B3 . | A3 . . . E4 . . .' }),
    { name: 'festival', wave: 'drums', vol: .05, notes: 'k . . . t . t . | k . t . . . t .' },
    tr(FUE, { name: 'fest', vol: .03, notes: 'E5 - F5 E5 C5 - - - | B4 - C5 - A4 - - - | . . . . . . . . | . . . . . . . . | A5 - - - B5 A5 E5 - | F5 - E5 - C5 - - - | . . . . . . . . | . . . . . . . .' }),
    tr(SHAM, { vol: .07, on: false, notes: 'A3 A3 . C4 . B3 A3 . | E3 . E3 F3 E3 . C3 . | A3 A3 . C4 . E4 C4 . | B3 . A3 . E3 . . .' }),
    tr(TAIKO, { vol: .13, on: false, notes: 'k . . k . . t . | k . k . t . t t' }),
    tr(FUE, { vol: .05, on: false, notes: 'E6 - - - F6 E6 C6 - | B5 - - - A5 - - - | C6 - B5 - A5 - E5 - | F5 - E5 - - - - -' })] },
  boss: { bpm: 140, steps: 4, tracks: [
    tr(TAIKO, { vol: .16, notes: 'k . . k . . k . k . t t k . t . | k . . k . . k . k t t t k k t t' }),
    tr(SHAM, { vol: .08, ring: .25, notes: 'D4 . D4 F4 . D4 E4 . D4 . A3 . Bb3 . A3 . | D4 . D4 F4 . A4 Bb4 . A4 . F4 . E4 . D4 . | D4 . D4 F4 . D4 E4 . D4 . A3 . Bb3 . A3 . | F4 . E4 F4 . E4 D4 . A3 . Bb3 . A3 . . .' }),
    { name: 'bass', wave: 'saw', vol: .06, notes: 'D2 . D2 . D2 . D3 . D2 . D2 . C3 . D3 . | Bb1 . Bb1 . Bb1 . Bb2 . A1 . A1 . A2 . A1 .' },
    tr(FUE, { vol: .05, notes: 'D6 - - - - - A5 - Bb5 - A5 - F5 - E5 - | D5 - - - - - - - . . . . . . . . | F6 - - - E6 - D6 - A5 - - - Bb5 - A5 - | E5 - - - - - - - . . . . . . . .' })] },
  results: { bpm: 80, steps: 2, tracks: [
    tr(DRONE, { vol: .13, notes: 'D3 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | D3 - - - - - - -' }),
    tr(KOTO, { vol: .08, notes: 'D5 . . A4 . . F4 . | G4 . . A4 . . D5 . | E5 . . D5 . . A4 . | D5 . . . . . . .' })] },
  ending: { bpm: 66, steps: 2, tracks: [
    tr(DRONE, { vol: .14, notes: 'D3 - - - - - - - | B2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - -' }),
    tr(KOTO, { vol: .06, notes: 'D4 F#4 A4 D5 A4 F#4 . . | B3 D4 F#4 B4 F#4 D4 . . | G3 B3 D4 G4 D4 B3 . . | A3 C#4 E4 A4 E4 C#4 . .' }),
    tr(SHAKU, { vol: .09, notes: 'A5 - - - - - F#5 - | E5 - - - D5 - - - | B4 - - - D5 - E5 - | F#5 - - - - - - - | A5 - - - B5 - A5 - | F#5 - - - E5 - D5 - | E5 - - - - - B4 - | D5 - - - - - - -' })] }
};
const Music = { cur: null, level: 0, layerT: 0 };
/** play a song by id (null stops) */
Music.play = (id, o = {}) => {
  if (Music.cur === id && Au.song && !o.restart) return;
  Music.cur = id; Music.level = 0;
  if (!id) { Au.stopMusic(.6); return; }
  Au.music(SONGS[id], { fade: o.fade === undefined ? .8 : o.fade, restart: true });
};
/** the mood of a mission song: 0 calm, 1 tension (the shamisen), 2 alert (taiko and fue). Alert fades out 4 s after it ends */
Music.mood = (lv, dt = 0) => {
  if (!Music.cur || !SONGS[Music.cur] || Music.cur === 'boss') return;
  if (lv >= 2) Music.layerT = 4; else if (Music.layerT > 0) { Music.layerT -= dt; if (Music.layerT > 0) lv = 2; }
  if (lv === Music.level) return;
  const was = Music.level; Music.level = lv;
  const has = n => SONGS[Music.cur].tracks.some(t => t.name === n && t.on === false);
  if (has('shamisen')) Au.layer('shamisen', lv >= 1 ? 1 : 0, lv >= 1 ? .6 : 2.5);
  if (has('taiko')) Au.layer('taiko', lv >= 2 ? 1 : 0, lv >= 2 ? .3 : 2.5);
  if (has('fue')) Au.layer('fue', lv >= 2 ? 1 : 0, lv >= 2 ? .8 : 2.5);
  if (lv === 2 && was < 2) Au.sfx('stingAlert');
};
B.Music = Music; B.SONGS = SONGS;

/* ---- 11-voice.js ---- */
/* ---- VOICES: Animalese-style gibberish from the text. Each vowel group becomes a syllable: an oscillator at the
 * speaker's pitch (±3% jitter) through two band-pass formants (F1, F2) and a short envelope; plosives, fricatives and
 * nasals add a burst of noise or a hum before it. Sentences fall in pitch, questions rise, exclamations are louder.
 * Everything plays on the voice bus (patch 8), so the Voices setting sets its volume. Headless: silent ---- */
const FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2100] };
const VOICES = {
  granny: { base: 205, formant: 1.05, rate: 9, wave: 'square', jitter: .06 },
  sojiro: { base: 108, formant: .9, rate: 10, wave: 'sawtooth', jitter: .02 },
  kaede: { base: 265, formant: 1.12, rate: 13, wave: 'pulse', jitter: .03 },
  takanori: { base: 140, formant: .95, rate: 10, wave: 'sawtooth', jitter: .02 },
  kurogane: { base: 82, formant: .85, rate: 8, wave: 'sawtooth', jitter: .02 },
  oni: { base: 70, formant: .8, rate: 7, wave: 'sawtooth', jitter: .04, growl: true },
  gonroku: { base: 72, formant: .8, rate: 7, wave: 'sawtooth', jitter: .03 },
  hotaru: { base: 240, formant: 1.1, rate: 14, wave: 'pulse', jitter: .03 },
  tobei: { base: 175, formant: 1, rate: 15, wave: 'square', jitter: .04 },
  ittetsu: { base: 96, formant: .88, rate: 9, wave: 'sawtooth', jitter: .02 },
  kanemori: { base: 150, formant: .98, rate: 12, wave: 'sawtooth', jitter: .05 },
  sakubei: { base: 130, formant: .95, rate: 11, wave: 'sawtooth', jitter: .03 },
  guard: { base: 120, formant: .92, rate: 11, wave: 'sawtooth', jitter: .03 },
  maid: { base: 260, formant: 1.1, rate: 13, wave: 'square', jitter: .03 },
  disciple: { base: 160, formant: 1, rate: 12, wave: 'sawtooth', jitter: .03 }
};
const Voice = { busy: 0, lastBark: -9, _pulse: null, _noise: null };
const PLOSIVE = 'ptkbdgc', FRIC = 'sfhzjx', NASAL = 'mnr';
/** text -> syllables: [{ v: vowel, c: leading consonant, end: '?' | '!' | '.' | ',' | null }] */
Voice.syllables = text => {
  const out = [], s = String(text).toLowerCase().replace(/\{[^}]*\}/g, '');
  let cons = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('aeiouy'.includes(ch)) { out.push({ v: ch, c: cons[0] || '', end: null }); cons = ''; while ('aeiouy'.includes(s[i + 1] || '')) i++; }
    else if (/[a-z]/.test(ch)) cons += ch;
    else { cons = ''; if (/[.,!?;:—-]/.test(ch) && out.length) out[out.length - 1].end = ch === ';' || ch === ':' || ch === '-' || ch === '—' ? ',' : ch; }
  }
  return out;
};
Voice._ready = () => { const c = Au.ctx; if (!c || !Au.voiceBus || game.headless) return null; if (!Voice._noise) { const b = c.createBuffer(1, c.sampleRate * .5, c.sampleRate), d = b.getChannelData(0); let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823 - 1; } Voice._noise = b; } return c; };
Voice._pw = c => { if (!Voice._pulse) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * .25); Voice._pulse = c.createPeriodicWave(re, im); } return Voice._pulse; };
/** one syllable at time t: pitch f0, vowel v, consonant c, gain k, length dur, stereo pan */
Voice._syl = (c, t, f0, v, cons, P, k, dur, pan) => {
  const out = c.createGain(); out.gain.value = 1; let node = out;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); out.connect(p); p.connect(Au.voiceBus); } else out.connect(Au.voiceBus);
  void node;
  const [F1, F2] = (FORMANTS[v] || FORMANTS.a).map(f => f * P.formant);
  let t0 = t;
  const noise = (len, type, freq, gain) => {
    const src = c.createBufferSource(); src.buffer = Voice._noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain * k, t0 + .004); g.gain.exponentialRampToValueAtTime(.0005, t0 + len);
    src.connect(f); f.connect(g); g.connect(out); src.start(t0, crand() * .3); src.stop(t0 + len + .02);
  };
  if (PLOSIVE.includes(cons)) { noise(.015 + crand() * .01, 'bandpass', 1500 + crand() * 2500, .5); t0 += .012; }
  else if (FRIC.includes(cons)) { noise(.04 + crand() * .02, 'highpass', 3500, .28); t0 += .03; }
  else if (NASAL.includes(cons)) { const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.frequency.value = f0; f.type = 'lowpass'; f.frequency.value = 400; g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.35 * k, t0 + .01); g.gain.linearRampToValueAtTime(.0001, t0 + .03); o.connect(f); f.connect(g); g.connect(out); o.start(t0); o.stop(t0 + .04); t0 += .02; }
  const osc = c.createOscillator();
  if (P.wave === 'pulse') osc.setPeriodicWave(Voice._pw(c)); else osc.type = P.wave;
  osc.frequency.setValueAtTime(f0, t0); osc.frequency.linearRampToValueAtTime(f0 * (1 + (crand() - .5) * .04), t0 + dur);
  const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), g2 = c.createGain(), env = c.createGain();
  b1.type = b2.type = 'bandpass'; b1.frequency.value = F1; b2.frequency.value = F2; b1.Q.value = 7; b2.Q.value = 9; g2.gain.value = .6;
  env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(.9 * k, t0 + .008); env.gain.setValueAtTime(.9 * k, t0 + Math.max(.01, dur - .025)); env.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(b1); osc.connect(b2); b1.connect(env); b2.connect(g2); g2.connect(env); env.connect(out);
  if (P.growl) { const o2 = c.createOscillator(), g3 = c.createGain(); o2.type = 'sawtooth'; o2.frequency.value = f0 / 2; g3.gain.setValueAtTime(0, t0); g3.gain.linearRampToValueAtTime(.12 * k, t0 + .01); g3.gain.linearRampToValueAtTime(0, t0 + dur); o2.connect(g3); g3.connect(out); o2.start(t0); o2.stop(t0 + dur + .02); }
  osc.start(t0); osc.stop(t0 + dur + .03);
};
/** speak a line now: profile id or object; o: { vol, pan, delay }. Returns its length in seconds */
Voice.say = (text, prof, o = {}) => {
  const P = typeof prof === 'string' ? VOICES[prof] || VOICES.guard : prof || VOICES.guard, sy = Voice.syllables(text);
  const len = sy.length / P.rate + sy.filter(s => s.end).length * .18;
  const c = Voice._ready(); if (!c || !sy.length) return len;
  let t = c.currentTime + .02 + (o.delay || 0); const n = sy.length, base = P.base * (o.pitch || 1), vol = (o.vol === undefined ? 1 : o.vol) * .5;
  sy.forEach((s, i) => {
    const q = n > 1 ? i / (n - 1) : 0, lastQ = sy.slice(i).find(x => x.end), endc = lastQ ? lastQ.end : '.';
    let f = base * (1 - .15 * q) * (1 + (crand() - .5) * 2 * (P.jitter || .03));
    const fromEnd = sy.slice(i).findIndex(x => x.end);
    if (endc === '?' && fromEnd >= 0 && fromEnd <= 1) f *= 1.25;
    const k = vol * (endc === '!' ? 1.4 : 1); if (endc === '!') f *= 1.2;
    const dur = (1 / P.rate) * (.75 + crand() * .2);
    Voice._syl(c, t, f, s.v, s.c, P, k, dur, o.pan || 0);
    t += 1 / P.rate + (s.end === ',' ? .12 : s.end ? .25 : 0);
  });
  return len;
};
/** follow an E.Dialog as it types: one syllable for each vowel group it reveals (call every update) */
Voice.dialogStep = (talk, prof) => {
  if (!talk.open || !talk.pages || !talk.pages.length) { Voice._dlg = null; return; }
  const page = talk.pages[talk.i], text = Array.isArray(page) ? page.join(' ') : String(page || '');
  const key = talk.i + ':' + text.length;
  if (!Voice._dlg || Voice._dlg.key !== key) Voice._dlg = { key, at: 0 };
  const D = Voice._dlg, shown = Math.min(text.length, Math.floor(talk.shown || 0));
  const c = Voice._ready();
  while (D.at < shown) {
    const ch = text[D.at].toLowerCase(), prev = D.at > 0 ? text[D.at - 1].toLowerCase() : ' ';
    if ('aeiouy'.includes(ch) && !'aeiouy'.includes(prev) && c) {
      const P = typeof prof === 'string' ? VOICES[prof] || VOICES.guard : prof || VOICES.guard, rest = text.slice(D.at);
      const endc = (rest.match(/[.!?]/) || ['.'])[0], q = D.at / Math.max(1, text.length);
      let f = P.base * (1 - .15 * q) * (1 + (crand() - .5) * 2 * (P.jitter || .03)); if (endc === '!') f *= 1.2; if (endc === '?' && rest.replace(/[^a-z]/gi, '').length < 5) f *= 1.25;
      let cons = ''; for (let j = D.at - 1; j >= 0 && /[a-z]/i.test(text[j]) && !'aeiouy'.includes(text[j].toLowerCase()); j--) cons = text[j].toLowerCase();
      Voice._syl(c, c.currentTime + .01, f, ch, cons, P, .5 * (endc === '!' ? 1.4 : 1), (1 / P.rate) * .85, 0);
    }
    D.at++;
  }
};
/** a bark in the world: quieter with distance (silent past 220), panned by where it is on the screen; at most one in 2 s */
Voice.bark = (text, prof, x, y, o = {}) => {
  const h = B.M && B.M.hero; if (!h) return 0;
  const d = Math.hypot(x - h.x, y - h.y); if (d > 220) return 0;
  if (!o.force && game.real - Voice.lastBark < 2) return 0;
  Voice.lastBark = game.real;
  let pan = 0; if (game.r && game.r.w) { try { const p = game.r.w(x, y, 20); pan = clamp((p[0] - game.W / 2) / (game.W / 2), -1, 1) * .8; } catch (e) { pan = 0; } }
  return Voice.say(text, prof, { vol: clamp(1 - d / 220, 0, 1), pan, pitch: o.pitch });
};
B.Voice = Voice; B.VOICES = VOICES;

/* ---- 20-assets.js ---- */
/* ---- ART: materials, Japanese props as data (E.SHAPES), floor textures by tag, wall types with baked face painters
 * (shoji, koshi slats, namako tiles, noren, vermilion pillars), kawara roof caps drawn over the flat walkable roofs,
 * string sprites (tool icons, the crest), the brush kanji of the Silent Cut, ink splats, petals and maple leaves ---- */
Object.assign(E.MATERIALS, {
  vermilion: { color: '#c83a22', pattern: 'glaze' }, lacquerBlack: { color: '#1e1616', pattern: 'glaze' }, lacquerRed: { color: '#8a1c1c', pattern: 'glaze' },
  paperGlow: { color: '#ffd8a0', pattern: 'none', glow: 1 }, redPaper: { color: '#e8603a', pattern: 'none', glow: 1 },
  bamboo: { color: '#7a9a4a', pattern: 'planks', bw: 2, dir: 'v' }, bambooDry: { color: '#b8a060', pattern: 'planks', bw: 2, dir: 'v' },
  kawara: { color: '#4a5468', pattern: 'shingles', course: 2.5, bw: 4 }, plasterW: { color: '#d8d0c0', pattern: 'noise', scale: 6 },
  indigo: { color: '#2a3a6a', pattern: 'cloth' }, ricestraw: { color: '#c8b070', pattern: 'thatch', course: 2 }, rope: { color: '#a08050', pattern: 'none' },
  goldLeaf: { color: '#e8b04a', pattern: 'metal' }, ishigaki: { color: '#6a6a72', pattern: 'stones', size: 6 }, darkwood: { color: '#4a3428', pattern: 'planks', bw: 3 },
  mapleLeaf: { color: '#b8341e', pattern: 'foliage', size: 3.5 }, cherryLeaf: { color: '#e8a0b8', pattern: 'foliage', size: 3.5 }, bambooLeaf: { color: '#4a7a3a', pattern: 'foliage', size: 3 },
  persimmon: { color: '#3e5a2e', pattern: 'foliage', size: 3.5 }, targetWhite: { color: '#e8e0d0', pattern: 'none' }, targetBlack: { color: '#1a1418', pattern: 'none' },
  drumHide: { color: '#d8c8a0', pattern: 'none' }, drumBody: { color: '#8a2a1a', pattern: 'glaze' }
});
const SH = E.SHAPES;
Object.assign(SH, {
  stoneLantern: { about: 'stone lantern (ishidoro)', tags: 'japan garden light', mats: { s: 'granite', f: 'flame' }, lights: [[0, 0, 15, '#ffb060', 64]],
    parts: [['cyl', 's', [0, 0, 0], 5, 2, { seg: 6 }], ['cyl', 's', [0, 0, 2], 1.8, 9, { seg: 6 }], ['cyl', 's', [0, 0, 11], 4.6, 1.5, { seg: 6 }], ['box', 'f', [0, 0, 12.5], [4, 4, 4]],
      ['mirror', 'xy', ['box', 's', [2.4, 2.4, 12.5], [1.3, 1.3, 4.4]]], ['cyl', 's', [0, 0, 16.9], 6.2, 3, { r2: 1, seg: 6 }], ['ball', 's', [0, 0, 20.6], 1.4]] },
  paperLantern: { about: 'red paper lantern on a post (chochin)', tags: 'japan festival light', mats: { w: 'walnut', p: 'redPaper', k: 'lacquerBlack' }, lights: [[0, 3, 21, '#ff9a50', 56]],
    parts: [['cyl', 'w', [0, 0, 0], 1, 26], ['box', 'w', [0, 1.5, 25], [1, 4, 1]], ['ball', 'p', [0, 3, 21], 3.2, { sz: 1.3 }], ['cyl', 'k', [0, 3, 24.4], 1.8, .8], ['cyl', 'k', [0, 3, 17.2], 1.8, .8]] },
  lanternString: { about: 'a string of festival lanterns between two posts', tags: 'japan festival light', mats: { w: 'walnut', p: 'redPaper', q: 'paperGlow' }, lights: [[0, 0, 26, '#ff9a50', 70]],
    parts: [['mirror', 'x', ['cyl', 'w', [24, 0, 0], 1, 32]], ['box', 'w', [0, 0, 31], [48, .5, .5]], ['row', 3, [16, 0, 0], ['ball', 'p', [0, 0, 27], 2.4, { sz: 1.3 }]], ['row', 2, [16, 0, 0], ['ball', 'q', [0, 0, 28], 2.2, { sz: 1.3 }]]] },
  torii: { about: 'vermilion torii gate', tags: 'japan shrine', mats: { v: 'vermilion', k: 'lacquerBlack' },
    parts: [['mirror', 'x', ['cyl', 'v', [13, 0, 0], 1.8, 38]], ['box', 'v', [0, 0, 29], [34, 2, 2.4]], ['box', 'v', [0, 0, 35], [38, 2.8, 1.8]], ['box', 'k', [0, 0, 36.8], [42, 3.4, 1.8]], ['box', 'v', [0, 0, 31.4], [2, 2, 3.6]]] },
  bamboo: { about: 'a cluster of bamboo stalks', tags: 'japan plant', mats: { b: 'bamboo', n: 'bambooDry', l: 'bambooLeaf' }, params: { seed: 1, n: 4 },
    make: p => { const R = E.rng(p.seed * 31 + 7), out = []; for (let i = 0; i < p.n; i++) { const a = R() * TAU, d = R() * 4.5, x = Math.cos(a) * d, y = Math.sin(a) * d, h = 34 + R() * 22;
      out.push(['cyl', 'b', [x, y, 0], .9, h, { seg: 6 }]); for (let z = 8; z < h - 4; z += 8) out.push(['cyl', 'n', [x, y, z], 1.15, .6, { seg: 6 }]); out.push(['ball', 'l', [x + R() * 3 - 1.5, y + R() * 3 - 1.5, h - 2], 4.2, { sz: .55 }]); }
      return out; } },
  maple: { about: 'red maple tree', tags: 'japan tree', parts: [['use', 'tree', [0, 0, 0], { h: 40, seed: 3, mats: { l: 'mapleLeaf' } }]] },
  cherry: { about: 'cherry tree in blossom', tags: 'japan tree', parts: [['use', 'tree', [0, 0, 0], { h: 42, seed: 5, mats: { l: 'cherryLeaf' } }]] },
  persimmonTree: { about: 'persimmon tree with orange fruit', tags: 'japan tree', mats: { f: '#e87a2a glaze' }, parts: [['use', 'tree', [0, 0, 0], { h: 46, seed: 8, mats: { l: 'persimmon' } }], ['ball', 'f', [5, 3, 34], 1.4], ['ball', 'f', [-4, -2, 38], 1.4], ['ball', 'f', [1, -5, 31], 1.4], ['ball', 'f', [-6, 4, 33], 1.3]] },
  bonsaiPine: { about: 'garden pine, low and wide', tags: 'japan tree', parts: [['use', 'pine', [0, 0, 0], { h: 26, tiers: 3 }]] },
  steppingStones: { about: 'three garden stepping stones', tags: 'japan garden', mats: { s: 'granite' }, parts: [['cyl', 's', [-6, -3, 0], 3.4, 1, { seg: 7, sq: .8 }], ['cyl', 's', [0, 2, 0], 3, 1, { seg: 7, sq: .8 }], ['cyl', 's', [6, -2, 0], 3.2, 1, { seg: 7, sq: .8 }]] },
  sakeBarrel: { about: 'straw-wrapped sake barrel (komodaru)', tags: 'japan container', mats: { s: 'ricestraw', r: 'rope', l: 'lacquerRed', w: 'oak' },
    parts: [['lathe', 's', [0, 0, 0], [[0, 0], [5.5, 0], [6, 6], [5.5, 12], [0, 12]]], ['row', 2, [0, 0, 6], ['cyl', 'r', [0, 0, 2.6], 6.15, .8]], ['box', 'l', [0, 5.6, 4], [5, 1, 4.5]], ['cyl', 'w', [0, 0, 12], 5.2, .6]] },
  riceBale: { about: 'rice straw bale (tawara)', tags: 'japan container farm', mats: { s: 'ricestraw', r: 'rope' },
    parts: [['prism', 's', [0, 0, 0], [[-4, 0], [4, 0], [5.2, 3.5], [4, 7], [-4, 7], [-5.2, 3.5]], 14, { axis: 'x' }], ['row', 3, [4.5, 0, 0], ['prism', 'r', [0, 0, -.1], [[-4.2, 0], [4.2, 0], [5.4, 3.5], [4.2, 7.2], [-4.2, 7.2], [-5.4, 3.5]], 1, { axis: 'x' }]]] },
  jubako: { about: 'stacked lacquer lunchboxes wrapped in cloth', tags: 'japan container', mats: { k: 'lacquerBlack', r: 'lacquerRed', c: 'indigo', g: 'goldLeaf' },
    parts: [['box', 'k', [0, 0, 0], [12, 12, 4]], ['box', 'r', [0, 0, 4], [12, 12, 4]], ['box', 'k', [0, 0, 8], [12, 12, 4]], ['box', 'g', [0, 0, 12], [12.4, 12.4, .8]], ['box', 'c', [0, 0, 5], [12.6, 2.4, 8.2]], ['box', 'c', [0, 0, 12.6], [3, 3, 1.6]]] },
  yatai: { about: 'noodle stall with a noren and a lantern', tags: 'japan town shop', mats: { w: 'darkwood', s: 'kawara', n: 'indigo', p: 'redPaper', b: 'oak' }, lights: [[14, -7, 22, '#ffb060', 70]],
    parts: [['box', 'b', [0, 0, 0], [30, 12, 12]], ['mirror', 'x', ['box', 'w', [13.5, 4.5, 12], [1.5, 1.5, 15]]], ['mirror', 'x', ['box', 'w', [13.5, -4.5, 12], [1.5, 1.5, 15]]], ['box', 's', [0, 0, 27], [34, 15, 1.5]],
      ['prism', 's', [0, 0, 28.5], [[-8, 0], [8, 0], [0, 4]], 34, { axis: 'x' }], ['row', 4, [7.2, 0, 0], ['box', 'n', [0, -6.6, 20.5], [6.4, .5, 6]]], ['ball', 'p', [14, -7, 22], 2.4, { sz: 1.3 }], ['row', 3, [6, 0, 0], ['cyl', 'w', [0, 2, 12], 1.6, 1.2]]] },
  weaponRack: { about: 'rack of spears', tags: 'japan castle', mats: { w: 'darkwood', s: 'walnut', t: 'steel' },
    parts: [['mirror', 'x', ['box', 'w', [8, 0, 0], [1.5, 3, 20]]], ['box', 'w', [0, 0, 6], [17, 2, 1.5]], ['box', 'w', [0, 0, 16], [17, 2, 1.5]], ['row', 4, [3.5, 0, 0], ['cyl', 's', [0, 1, 0], .5, 26]], ['row', 4, [3.5, 0, 0], ['cyl', 't', [0, 1, 26], .8, 3.4, { r2: 0, seg: 4 }]]] },
  mato: { about: 'archery target (mato) on a stand', tags: 'japan training', mats: { w: 'oak', a: 'targetWhite', k: 'targetBlack' },
    parts: [['mirror', 'x', ['box', 'w', [4.5, 0, 0], [1.2, 1.2, 15]]], ['prism', 'a', [0, 0, 0], [[0, 12], [4, 13.2], [5.6, 17], [4, 20.8], [0, 22], [-4, 20.8], [-5.6, 17], [-4, 13.2]], 1.2, { axis: 'y' }],
      ['prism', 'k', [0, -.4, 0], [[0, 14], [2.2, 14.8], [3, 17], [2.2, 19.2], [0, 20], [-2.2, 19.2], [-3, 17], [-2.2, 14.8]], 1.2, { axis: 'y' }], ['prism', 'a', [0, -.8, 0], [[0, 15.8], [1, 16.2], [1.2, 17], [1, 17.8], [0, 18.2], [-1, 17.8], [-1.2, 17], [-1, 16.2]], 1.2, { axis: 'y' }]] },
  taiko: { about: 'taiko drum on a stand', tags: 'japan festival', mats: { w: 'darkwood', d: 'drumBody', h: 'drumHide' },
    parts: [['mirror', 'x', ['box', 'w', [5, 0, 0], [1.5, 9, 7]]], ['prism', 'd', [0, 0, 0], [[-7, 5], [-5, 12], [-1, 15], [1, 15], [5, 12], [7, 5], [1, 1], [-1, 1]], 9, { axis: 'y' }],
      ['prism', 'h', [0, -4.6, 0], [[-5.5, 5.5], [-4, 11], [0, 13.5], [4, 11], [5.5, 5.5], [0, 2.5]], .4, { axis: 'y' }]] },
  hansho: { about: 'alarm bell (hansho) on a ladder frame', tags: 'japan castle alarm', mats: { w: 'darkwood', b: 'bronze', s: 'kawara' },
    parts: [['mirror', 'x', ['box', 'w', [7, 0, 0], [2, 2, 40]]], ['box', 'w', [0, 0, 37], [18, 2.6, 2.6]], ['prism', 's', [0, 0, 39.6], [[-4, 0], [4, 0], [0, 3.4]], 22, { axis: 'x' }],
      ['lathe', 'b', [0, 0, 23], [[0, 0], [5, 0], [4.6, 2], [3.8, 8], [3, 12], [1, 13.4], [0, 13.4]]], ['cyl', 'b', [0, 0, 36.4], .5, 1], ['row', 5, [0, 0, 6.5], ['box', 'w', [0, 3.6, 3], [14, 1, 1]]]] },
  waterBarrel: { about: 'water barrel', tags: 'japan container', parts: [['use', 'barrel', [0, 0, 0], {}]] },
  strawMat: { about: 'straw mat on the ground', tags: 'japan floor', mats: { s: 'ricestraw' }, parts: [['box', 's', [0, 0, 0], [22, 13, .8]]] },
  boat: { about: 'moored river boat', tags: 'japan water', mats: { w: 'darkwood', o: 'oak' },
    parts: [['prism', 'w', [0, 0, -3], [[-14, 0], [14, 0], [21, 6], [-19, 6]], 12, { axis: 'y' }], ['box', 'o', [0, 0, 3], [3, 11, 1]], ['box', 'o', [-8, 0, 3], [3, 11, 1]], ['cyl', 'o', [16, 0, 3], .6, 16, { rot: [0, -20, 0] }]] },
  riceBarge: { about: 'rice barge loaded with bales', tags: 'japan water', mats: { w: 'darkwood' },
    parts: [['prism', 'w', [0, 0, -3], [[-20, 0], [20, 0], [26, 7], [-24, 7]], 18, { axis: 'y' }], ['use', 'riceBale', [-8, -4, 4], {}], ['use', 'riceBale', [8, -4, 4], {}], ['use', 'riceBale', [0, 4, 4], {}], ['use', 'riceBale', [0, -4, 11], {}]] },
  mooringPost: { about: 'mooring post with a rope', tags: 'japan water', mats: { w: 'darkwood', r: 'rope' }, parts: [['cyl', 'w', [0, 0, 0], 1.8, 13, { seg: 8 }], ['cyl', 'r', [0, 0, 9], 2.3, 1.2], ['cyl', 'w', [0, 0, 13], 2.1, .8, { seg: 8 }]] },
  bambooCage: { about: 'bamboo prisoner cage', tags: 'japan prison', mats: { b: 'bambooDry', r: 'rope' },
    parts: [['row', 7, [2.8, 0, 0], ['cyl', 'b', [0, -9, 0], .6, 24]], ['row', 7, [2.8, 0, 0], ['cyl', 'b', [0, 9, 0], .6, 24]], ['row', 7, [0, 2.8, 0], ['cyl', 'b', [-9, 0, 0], .6, 24]], ['row', 7, [0, 2.8, 0], ['cyl', 'b', [9, 0, 0], .6, 24]],
      ['box', 'b', [0, 0, 23.5], [19.5, 19.5, 1.2]], ['box', 'r', [0, -9, 12], [19, 1.4, 1.2]], ['box', 'r', [0, 9, 12], [19, 1.4, 1.2]]] },
  lever: { about: 'water-gate lever', tags: 'japan machine', mats: { s: 'granite', i: 'iron', r: 'lacquerRed' }, parts: [['box', 's', [0, 0, 0], [8, 6, 5]], ['cyl', 'i', [0, 0, 5], .7, 12, { rot: [0, 28, 0] }], ['ball', 'r', [5.4, 0, 15.6], 1.5]] },
  leverDown: { about: 'water-gate lever, pulled', tags: 'japan machine', mats: { s: 'granite', i: 'iron', r: 'lacquerRed' }, parts: [['box', 's', [0, 0, 0], [8, 6, 5]], ['cyl', 'i', [0, 0, 5], .7, 12, { rot: [0, -50, 0] }], ['ball', 'r', [-8.8, 0, 12.7], 1.5]] },
  shachihoko: { about: 'golden tiger-fish roof ornament', tags: 'japan castle', mats: { g: 'goldLeaf' }, parts: [['box', 'g', [0, 0, 0], [3, 5, 4]], ['ball', 'g', [0, 1.5, 5], 2.4, { sz: 1.2 }], ['prism', 'g', [0, -1.6, 4], [[-1.6, 0], [1.6, 0], [0, 6]], 1.4, { axis: 'y' }], ['ball', 'g', [0, 3.4, 6.4], 1.2]] },
  dummy: { about: 'straw practice dummy', tags: 'japan training', mats: { w: 'oak', s: 'ricestraw', r: 'rope' }, parts: [['cyl', 'w', [0, 0, 0], 1.2, 26], ['cyl', 's', [0, 0, 9], 4, 11, { seg: 8 }], ['ball', 's', [0, 0, 24], 3], ['box', 'w', [0, 0, 17], [16, 1.5, 1.5]], ['cyl', 'r', [0, 0, 14], 4.3, 1]] },
  sakeFlask: { about: 'porcelain sake flask on a tray', tags: 'japan objective', mats: { p: 'porcelain', t: 'lacquerRed' }, parts: [['box', 't', [0, 0, 0], [10, 8, 1.5]], ['lathe', 'p', [0, 0, 1.5], [[0, 0], [2, 0], [2.6, 2], [2, 5], [.8, 7], [1.1, 8], [0, 8]]], ['cyl', 'p', [-3.4, 1.5, 1.5], 1.2, 1.5]] },
  strongbox: { about: 'iron-bound strongbox', tags: 'japan objective', parts: [['use', 'chest', [0, 0, 0], { mats: { w: 'darkwood', b: 'iron' } }]] },
  kotatsu: { about: 'low lacquer feast table', tags: 'japan interior', mats: { k: 'lacquerBlack', r: 'lacquerRed', b: 'porcelain' }, parts: [['box', 'k', [0, 0, 0], [26, 14, 5]], ['box', 'r', [0, 0, 5], [27, 15, .8]], ['row', 3, [7, 0, 0], ['cyl', 'b', [0, 0, 5.8], 2, 1.4]]] },
  folding: { about: 'gold folding screen (byobu)', tags: 'japan interior', mats: { g: 'goldLeaf', k: 'lacquerBlack' }, parts: [['row', 4, [7, 0, 0], ['box', 'g', [0, 0, 0], [6.6, 1, 18], { rot: 12 }]], ['row', 4, [7, 0, 0], ['box', 'k', [0, 0, 18], [6.8, 1.2, .8]]]] },
  hut: { about: 'reed fishing hut roof on posts', tags: 'japan village', mats: { w: 'oak', s: 'ricestraw' }, parts: [['mirror', 'xy', ['cyl', 'w', [9, 7, 0], 1.2, 18]], ['prism', 's', [0, 0, 18], [[-11, 0], [11, 0], [0, 9]], 24, { axis: 'x' }]] },
  nets: { about: 'fishing nets drying on poles', tags: 'japan village', mats: { w: 'oak', n: '#6a6a50 cloth' }, parts: [['mirror', 'x', ['cyl', 'w', [10, 0, 0], .8, 20]], ['box', 'n', [0, 0, 6], [19, .4, 13]], ['box', 'w', [0, 0, 19], [22, .8, .8]]] },
  cart: SH.cart
});

/* ---- FLOORS: textures by floor tag (night palettes) ---- */
const FLOOR = {
  earth: (x, y) => E.tex.dirt(x, y, { base: '#3a3430', dark: '#2c2622', light: '#4a4038' }),
  grass: (x, y) => E.tex.grass(x, y, { base: '#2e4a32', dark: '#203824', light: '#3e5e3a', flower: '#7a6a9a' }),
  bamboo: (x, y) => { const c = E.tex.grass(x, y, { base: '#2a3e26', dark: '#1c2c1a', light: '#4a5a2a', flower: '#6a7a3a' }); return c; },
  gravel: (x, y) => { const n = E.noise2 ? E.noise2(x * .7, y * .7) : 0, rake = Math.sin(y * Math.PI / 2.5) > .55 ? 14 : 0, sp = ((x * 73856093 ^ y * 19349663) >>> 0) % 7 === 0 ? 18 : 0, v = 104 + rake + sp + n * 10; return [v, v - 2, v - 6]; },
  boards: (x, y) => E.tex.planks(x, y, { base: '#6a4a30', dark: '#4a3220', line: '#2a1a10' }),
  tatami: (x, y) => { const bx = ((x % 32) + 32) % 32, by = ((y % 16) + 16) % 16, edge = bx < 1.5 || by < 1.5; if (edge) return [40, 34, 28]; const s = Math.sin(x * 2.1) > .3 ? 8 : 0; return [128 + s, 124 + s, 74]; },
  paving: (x, y) => E.tex.flagstone(x, y, { stones: ['#5a5a62', '#646470', '#56565e'].map(E.hex), mortar: E.hex('#2e2e34'), hi: E.hex('#74747e'), lo: E.hex('#44444c'), speck: E.hex('#4e4e56') }),
  water: (x, y) => E.tex.water(x, y, { base: '#1e3a5a', dark: '#14304a', light: '#4a7aa0' }),
  shallow: (x, y) => E.tex.water(x, y, { base: '#2e5a6a', dark: '#24485a', light: '#6a9ab0' }),
  door: (x, y) => E.tex.planks(x, y, { base: '#5a3a24', dark: '#3a2416', line: '#20140c' })
};
const floorTex = (x, y, tag) => (FLOOR[tag] || FLOOR.earth)(x, y);

/* ---- WALLS: one type per legend letter. Faces are materials with decorate painters baked once with the wall ---- */
const deco = {
  compound: f => { const t = E.tones('#4a5468'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, t.sh); f.line(f.u0, f.z1 - 3, f.u1, f.z1 - 3, t.deep); f.quad(f.u0, f.z0, f.u1, Math.min(f.z1, f.z0 + 4), '#5a5a62'); },
  shoji: f => { const lit = f.side === 'south' || f.side === 'east'; for (let u = f.u0; u < f.u1; u += 16) { f.quad(u + 1.5, f.z0 + 4, u + 14.5, f.z0 + 26, lit ? '#e8dcc0' : '#b8ac94'); for (let k = 1; k < 4; k++) f.line(u + 1.5 + k * 3.25, f.z0 + 4, u + 1.5 + k * 3.25, f.z0 + 26, '#4a3428'); for (let z = 9; z < 26; z += 5.5) f.line(u + 1.5, f.z0 + z, u + 14.5, f.z0 + z, '#4a3428'); }
    f.quad(f.u0, f.z0 + 28, f.u1, f.z0 + 31, '#3a2a20'); },
  machiya: f => { for (let u = f.u0; u < f.u1; u += 1.6) f.line(u, f.z0 + 2, u, f.z0 + 18, '#2a1e18'); f.quad(f.u0, f.z0 + 18, f.u1, f.z0 + 20, '#3a2a20'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#3a4250'); },
  inn: f => { for (let u = f.u0; u < f.u1; u += 1.6) f.line(u, f.z0 + 2, u, f.z0 + 20, '#2a1e18'); f.quad(f.u0, f.z0 + 30, f.u1, f.z0 + 33, '#2a2018'); for (let u = f.u0 + 2; u < f.u1; u += 4) f.line(u, f.z0 + 33, u, f.z0 + 38, '#3a2a20'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#3a4250'); },
  kura: f => { const zt = Math.min(f.z1, f.z0 + 14); f.quad(f.u0, f.z0, f.u1, zt, '#3e3e46'); for (let u = f.u0; u < f.u1; u += 4) { f.line(u, f.z0, u + 4, zt, '#d8d0c0'); f.line(u + 4, f.z0, u, zt, '#d8d0c0'); } f.quad(f.u0, f.z1 - 4, f.u1, f.z1, '#30343e'); },
  shop: f => { for (let u = f.u0; u < f.u1; u += 1.6) f.line(u, f.z0 + 2, u, f.z0 + 12, '#2a1e18'); const c = f.cx % 3 === 0 ? '#8a2a1a' : '#2a3a6a'; for (let u = f.u0 + 1; u < f.u1 - 1; u += 5) f.quad(u, f.z0 + 18, u + 4.4, f.z0 + 28, c); f.dot((f.u0 + f.u1) / 2, f.z0 + 24, '#f4ead5'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#3a4250'); },
  shrine: f => { f.quad(f.u0, f.z0, f.u0 + 2.5, f.z1, '#c83a22'); f.quad(f.u1 - 2.5, f.z0, f.u1, f.z1, '#c83a22'); f.quad(f.u0, f.z1 - 6, f.u1, f.z1 - 3, '#c83a22'); f.quad(f.u0, f.z1 - 3, f.u1, f.z1, '#2a2a34'); },
  tower: f => { f.quad(f.u0, f.z1 - 14, f.u1, f.z1 - 10, '#2a2018'); for (let u = f.u0 + 3; u < f.u1; u += 5) f.quad(u, f.z1 - 9, u + 2, f.z1 - 3, '#14100c'); },
  keep: f => { const zb = Math.min(f.z1, f.z0 + 24); f.quad(f.u0, f.z0, f.u1, zb, '#5e5e66'); for (let z = f.z0 + 4; z < zb; z += 5) f.line(f.u0, z, f.u1, z - 1, '#46464e'); for (let u = f.u0 + 4; u < f.u1; u += 8) f.quad(u, zb + 10, u + 3, zb + 16, '#2a2a30'); f.quad(f.u0, f.z1 - 5, f.u1, f.z1, '#3a4250'); f.line(f.u0, f.z1 - 5, f.u1, f.z1 - 5, '#e8e0d0'); },
  castle: f => { if (f.z1 - f.z0 > 30) for (let u = f.u0 + 6; u < f.u1; u += 16) f.quad(u, f.z1 - 14, u + 2, f.z1 - 6, '#1e1e24'); }
};
const WALLTYPES = {
  '#': { id: 1, h: 56, top: '#5a5a62', side: '#6a6a72', face: 'ishigaki', roof: 'slab', cut: true, cutH: 8, decorate: deco.castle, name: 'Castle wall' },
  W: { id: 2, h: 30, top: '#4a5468', side: '#d0c8b8', face: 'plaster', roof: 'tiles', cut: true, cutH: 6, decorate: deco.compound, name: 'Compound wall' },
  F: { id: 3, h: 14, top: '#8a9a4a', side: '#7a9a4a', face: 'bamboo', roof: 'plain', name: 'Bamboo fence' },
  H: { id: 4, h: 40, top: '#4a3428', side: '#5a4030', face: 'timber', roof: 'plain', cut: true, cutH: 6, decorate: deco.shoji, name: 'Hall wall' },
  A: { id: 5, h: 40, top: '#4a5468', side: '#c8bca8', face: 'plaster', roof: 'tiles', decorate: deco.machiya, name: 'Townhouse' },
  B: { id: 6, h: 64, top: '#46505e', side: '#b8a890', face: 'timber', roof: 'tiles', decorate: deco.inn, name: 'Two-story inn' },
  C: { id: 7, h: 48, top: '#3e4656', side: '#e0d8c8', face: 'plaster', roof: 'tiles', decorate: deco.kura, name: 'Storehouse (kura)' },
  D: { id: 8, h: 40, top: '#4a5468', side: '#6a4a34', face: 'timber', roof: 'tiles', decorate: deco.shop, name: 'Shop' },
  S: { id: 9, h: 56, top: '#2e3440', side: '#c8bca8', face: 'plaster', roof: 'tiles', decorate: deco.shrine, name: 'Shrine hall' },
  T: { id: 10, h: 80, top: '#4a3a2a', side: '#6a5a44', face: 'plank', roof: 'plain', decorate: deco.tower, name: 'Watchtower' },
  G: { id: 11, h: 64, top: '#3e4656', side: '#e4dccc', face: 'plaster', roof: 'tiles', decorate: deco.keep, name: 'Keep, first tier' },
  K: { id: 12, h: 112, top: '#3e4656', side: '#e4dccc', face: 'plaster', roof: 'tiles', decorate: deco.keep, name: 'Keep, second tier' },
  M: { id: 13, h: 160, top: '#3a4252', side: '#e8e0d0', face: 'plaster', roof: 'tiles', decorate: deco.keep, name: 'Keep, top tier' },
  P: { id: 14, h: 10, top: '#3e6a3a', side: '#6a5a4a', face: 'stone', roof: 'leaves', name: 'Planter' },
  R: { id: 15, h: 20, top: '#5a5a54', side: '#6a6a60', face: 'rock', roof: 'plain', name: 'Rocks' }
};
const FLOORCH = { '.': 'earth', ',': 'grass', '"': 'bamboo', ':': 'gravel', '=': 'boards', '_': 'tatami', '+': 'paving', '~': 'water', '-': 'shallow', d: 'door' };
const BUILDINGS = 'ABCDSTGKM';

/* ---- ROOF CAPS: eaves, hips and a ridge drawn over every building block's flat, walkable top ---- */
const Art = {};
Art.roofCap = (r, b) => {
  const { x0, y0, x1, y1, h } = b, long = x1 - x0 >= y1 - y0, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, inset = Math.min(x1 - x0, y1 - y0) * .3;
  const R0 = long ? [x0 + inset, my] : [mx, y0 + inset], R1 = long ? [x1 - inset, my] : [mx, y1 - inset], tz = h + Math.min(10, inset * .45);
  if (b.ring) { r.queue(mx, my, h, g => { const P = (x, y, z) => r.w(x, y, z), c = [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], d = [P(x0 + 4, y0 + 4, h + 1), P(x1 - 4, y0 + 4, h + 1), P(x1 - 4, y1 - 4, h + 1), P(x0 + 4, y1 - 4, h + 1)];
    for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4], p2 = d[i], q2 = d[(i + 1) % 4]; px.poly(g, [p, q, q2, p2].map(v => [v[0], v[1]]), i < 2 ? '#525c70' : '#3a4254'); px.line(g, p[0], p[1], q[0], q[1], '#181c24'); px.line(g, p2[0], p2[1], q2[0], q2[1], '#d8d0c0'); } }, { footprint: [x0, y0, x1, y1], bias: 1 }); return; }
  r.queue(mx, my, h, g => {
    const P = (x, y, z) => r.w(x, y, z), c = [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], a = P(R0[0], R0[1], tz), e = P(R1[0], R1[1], tz);
    const dk = b.dark || '#2a3040', lt = b.light || '#6a7488', ridge = b.ridge || '#d8d0c0';
    // hips: four slopes; the near ones lighter
    px.poly(g, [c[0], c[1], e, a].map(p => [p[0], p[1]]), lt === '#6a7488' ? '#525c70' : lt);
    px.poly(g, [c[3], c[2], e, a].map(p => [p[0], p[1]]), b.mid || '#46505e');
    px.poly(g, long ? [c[1], c[2], e] : [c[2], c[3], e], dk); px.poly(g, long ? [c[0], c[3], a] : [c[0], c[1], a], b.mid || '#46505e');
    for (const [p, q] of [[c[0], a], [c[1], long ? e : a], [c[2], e], [c[3], long ? a : e]]) px.line(g, p[0], p[1], q[0], q[1], '#20242e');
    px.line(g, a[0], a[1], e[0], e[1], ridge, 2); px.line(g, a[0], a[1] - 1, e[0], e[1] - 1, '#20242e');
    px.disc(g, a[0], a[1] - 1, 1.6, '#30343e'); px.disc(g, e[0], e[1] - 1, 1.6, '#30343e');
    for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; px.line(g, p[0], p[1], q[0], q[1], '#181c24'); }
    if (b.shachi) for (const p of [a, e]) { px.rect(g, p[0] - 1, p[1] - 7, 3, 6, '#e8b04a'); px.dot(g, p[0], p[1] - 8, '#fff0b0'); }
  }, { footprint: [x0, y0, x1, y1], bias: 1 });
};
/** a hall's visual roof: hides the interior, fades while the hero is inside */
Art.hallRoof = (r, b, alpha) => {
  if (alpha <= .02) return;
  const { x0, y0, x1, y1, h } = b, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, long = x1 - x0 >= y1 - y0, inset = Math.min(x1 - x0, y1 - y0) * .32, tz = h + 12;
  const R0 = long ? [x0 + inset, my] : [mx, y0 + inset], R1 = long ? [x1 - inset, my] : [mx, y1 - inset];
  r.queue(mx, my, h, g => {
    const P = (x, y, z) => r.w(x, y, z), E2 = 6, c = [P(x0 - E2, y0 - E2, h - 2), P(x1 + E2, y0 - E2, h - 2), P(x1 + E2, y1 + E2, h - 2), P(x0 - E2, y1 + E2, h - 2)], a = P(R0[0], R0[1], tz), e = P(R1[0], R1[1], tz);
    const draw = () => {
      px.poly(g, [c[0], c[1], e, a].map(p => [p[0], p[1]]), '#4a5266'); px.poly(g, [c[3], c[2], e, a].map(p => [p[0], p[1]]), '#3a4254');
      px.poly(g, long ? [c[1], c[2], e] : [c[2], c[3], e], '#2a303e'); px.poly(g, long ? [c[0], c[3], a] : [c[0], c[1], a], '#3e4658');
      for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; px.line(g, p[0], p[1], q[0], q[1], '#141820'); }
      px.line(g, a[0], a[1], e[0], e[1], '#d8d0c0', 2);
    };
    if (alpha >= .98) draw(); else px.blend(g, alpha, 'normal', draw);
  }, { footprint: [x0 - 6, y0 - 6, x1 + 6, y1 + 6], bias: 40, hides: true });
};

/* ---- SPRITES: tool icons (12 x 12), the clan crest ---- */
const ICON_PAL = { w: '#f4f0e6', W: '#c8c0b0', n: '#1e2a1e', o: '#14100c', p: '#8a4ab0', g: '#a8c070', G: '#6a8a40', k: '#f0a0b8', s: '#a07040', r: '#c8243a', R: '#7a1428', h: '#ffd0d8', m: '#9a9aa8', M: '#5a5a68', d: '#2a2a34', D: '#4a4a58', f: '#ffb040', F: '#ff6a2a', b: '#8a5a32', B: '#5a3a20', y: '#d8b860', Y: '#a88a40', c: '#e8e0d0', t: '#c83a22', q: '#7ab4ff' };
const ICONS = {
  riceball: ['.....oo.....', '....owwo....', '...owwwwo...', '..owwwWwwo..', '..owwwwwWo..', '.owwwwwwwWo.', '.owwwwwwwwo.', 'owwnnnnnnwWo', 'owwnnnnnnwwo', 'owwnnnnnnwwo', '.oonnnnnnoo.', '............'],
  poisonball: ['.....oo.....', '....oggo....', '...oggggo...', '..oggpggGo..', '..oggggpGo..', '.oggppgggGo.', '.ogggggggGo.', 'oggnnnnnnGGo', 'oggnnnnnnggo', 'oggnnnnnngGo', '.oonnnnnnoo.', '............'],
  dango: ['..........s.', '.......kkks.', '......kkhkk.', '......kkkkk.', '....wwwkkk..', '...wwcwww...', '...wwwww....', '.ggwwww.....', 'gGggg.......', 'gggGg.......', 'sggg........', 's...........'],
  plum: ['............', '.....G......', '....RG......', '...rrrrr....', '..rrhrrrr...', '.rrhrrrrRr..', '.rrrrrrrRr..', '.rrrrrrRRr..', '..rrrrRRr...', '...rRRRr....', '....RRR.....', '............'],
  shuriken: ['.....m......', '.....mm.....', '.....mM.....', '....mMMm....', 'mmmmMddMM...', '.MMMMdoMmmmm', '...MMddMMMM.', '....mMMm....', '.....Mm.....', '.....MM.....', '......M.....', '............'],
  smoke: ['.......f....', '......sF....', '.....s......', '....DDDD....', '..DDddddD...', '.Dddddddd...', '.Ddddddddd..', '.dddddddddd.', '.ddddddddd..', '..ddddddd...', '...ddddd....', '............'],
  caltrops: ['............', '..m....m....', '..Mm..mM....', '...MMM......', '..mMoMm.....', '.....M..m...', '......mmMm..', '......mMoMm.', '...m...MMM..', '..mMm..m..m.', '...M........', '............'],
  firecracker: ['.........f..', '........F...', '.......s....', '......s.....', '...rrrr.....', '..rrrrrr....', '..cccccc....', '..rRrrRr....', '..rrrrrr....', '..cccccc....', '..rRrrRr....', '...rrrr.....'],
  firepot: ['.....f......', '....fFf.....', '...fFFFf....', '....oFo.....', '...bbbbb....', '..bBbbbbb...', '.bbbbbbbbb..', '.bBbbbbbbb..', '.bbbbbbbBb..', '..bbbbbBb...', '...BBBBB....', '............'],
  cloak: ['.....yy.....', '....yYYy....', '....yyyy....', '...yYyyYy...', '...yyyyyy...', '..yYyyyyYy..', '..yyyYyyyy..', '.yYyyyyyyYy.', '.yyyYyyYyyy.', 'yYyyyyyyyyYy', 'y.y.y.y.y.y.', '............'],
  scroll: ['............', '..bb....bb..', '.bccccccccb.', '.bcdccdcccb.', '.bccccccccb.', '.bcdcccdccb.', '.bccccccccb.', '.bccdcccccb.', '.bccccccccb.', '..bb....bb..', '............', '............'],
  token: ['............', '....tttt....', '...tcccct...', '..tccttcct..', '..tcttttct..', '..tcttttct..', '..tccttcct..', '...tcccct...', '....tttt....', '.....tt.....', '.....tt.....', '............']
};
Art.icon = {};
for (const k in ICONS) Art.icon[k] = E.sprite(ICONS[k], ICON_PAL);
Art.crest = E.sprite(['....tttttt....', '..tt......tt..', '.t..........t.', '.t..cccccc..t.', 't...cttttc...t', 't...cccccc...t', 't............t', 't...cccccc...t', 't...cttttc...t', '.t..cccccc..t.', '.t..........t.', '..tt......tt..', '....tttttt....'], ICON_PAL);

/* ---- THE BRUSH KANJI of the Silent Cut: 静 and 斬 as strokes in a 32 x 32 box, drawn thick with a dark edge ---- */
const KANJI = {
  sei: [[[3, 4], [13, 4]], [[8, 1], [8, 12]], [[4, 8], [12, 8]], [[2, 12], [14, 12]], [[4, 15], [4, 26], [2, 30]], [[4, 15], [13, 15], [13, 28], [11, 30]], [[5, 20], [12, 20]], [[5, 24], [12, 24]],
    [[21, 2], [17, 7]], [[19, 5], [27, 5], [24, 9]], [[16, 11], [30, 11]], [[18, 15], [28, 15]], [[28, 11], [28, 23]], [[18, 19], [28, 19]], [[16, 23], [30, 23]], [[23, 8], [23, 29], [20, 27]]],
  zan: [[[2, 4], [14, 4]], [[3, 8], [13, 8]], [[3, 8], [3, 18]], [[13, 8], [13, 18]], [[3, 13], [13, 13]], [[3, 18], [13, 18]], [[1, 23], [15, 23]], [[8, 1], [8, 30]],
    [[28, 2], [19, 7]], [[19, 7], [19, 21], [16, 29]], [[19, 13], [30, 13]], [[25, 13], [25, 30]]]
};
/** draw a kanji at (x, y) scale s, color c with an edge color (the brush's dark rim), a jitter seed for the splash */
Art.kanji = (g, k, x, y, s, c = '#d02a20', edge = '#3a0806', seed = 1) => {
  const R = E.rng(seed), st = KANJI[k];
  for (const pass of [0, 1]) for (const stroke of st) {
    const pts = stroke.map(([a, b]) => [x + a * s + (R() - .5) * s * .4, y + b * s + (R() - .5) * s * .4]);
    for (let i = 0; i < pts.length - 1; i++) { const w = Math.max(1, Math.round(s * (pass ? 2.4 : 3.6) * (i === 0 ? 1 : .85))); px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pass ? c : edge, w); }
    if (pass) { const p = pts[pts.length - 1]; px.disc(g, p[0], p[1], s * 1.1, c); }
  }
};
/** an ink splat: a blob with drops */
Art.splat = (g, x, y, r, c, seed) => { const R = E.rng(seed); px.disc(g, x, y, r, c); for (let i = 0; i < 9; i++) { const a = R() * TAU, d = r * (1 + R() * 1.6); px.disc(g, x + Math.cos(a) * d, y + Math.sin(a) * d * .7, Math.max(1, r * (.15 + R() * .3)), c); } };
/** the moon: a disc with craters and a halo */
Art.moon = (g, x, y, r, tint = '#f4ecd0') => { const t = E.tones(tint); px.blend(g, .25, 'add', () => px.disc(g, x, y, r * 1.6, '#3a3a5a')); px.disc(g, x, y, r, t.base); px.disc(g, x + r * .25, y - r * .2, r * .7, t.lt); px.disc(g, x - r * .35, y + r * .2, r * .2, t.sh); px.disc(g, x + r * .3, y + r * .35, r * .14, t.sh); px.disc(g, x - r * .1, y - r * .45, r * .1, t.sh); };
/** the hanko rank stamp: a red square seal with the rank's initial */
Art.hanko = (g, x, y, s, text, a = 1) => { px.blend(g, a, 'normal', () => { px.rect(g, x - s, y - s, s * 2, s * 2, '#c8202a'); px.rect(g, x - s + 2, y - s + 2, s * 2 - 4, s * 2 - 4, '#f4ead5'); px.rect(g, x - s + 4, y - s + 4, s * 2 - 8, s * 2 - 8, '#c8202a'); E.font.title(g, text, x, y - 10, { align: 'center', scale: 3, colors: ['#f4ead5', '#ffd8c8'], depth: 0, outline: false }); }); };
B.Art = Art; B.WALLTYPES = WALLTYPES; B.FLOORCH = FLOORCH;

/* ---- WEATHER: falling petals and maple leaves (cosmetic, the weather's own random stream) ---- */
E.WEATHER.petals = Object.assign({}, E.WEATHER.leaves, { colors: ['#f4c0d0', '#e8a0b8', '#fff0f4', '#d888a8'], n: 40, fall: 18, sway: 30 });
E.WEATHER.maple = Object.assign({}, E.WEATHER.leaves, { colors: ['#c8341e', '#e8602a', '#a82a1a', '#e8a040'], n: 48, fall: 22 });

/* ---- 21-rigs.js ---- */
/* ---- RIGS: every character is an HD Humanoid dressed for the period (masks, jingasa, kabuto, yari, yumi, kanabo and
 * sashimono come from engine patch 3), plus a quadruped Hound drawn from its own 3D skeleton. New poses are joint
 * post-processing: rig._post(J, rig) runs after the rig solves its pose each step (the ninja run, the wall hug, eating,
 * sleeping, a hand over a mouth) ---- */
const FACTION = { kanemori: '#8a6a2a', redlantern: '#7a2228', kokaku: '#2a3a6a', trial: '#3e5a32', sakubei: '#5a4a3a' };
const H = o => { const r = new E.Humanoid(o); Rigs.post(r); return r; };
const Rigs = {};
Rigs.post = rig => {
  if (rig._postWrapped) return rig; rig._postWrapped = true;
  const base = rig.solvePose;
  rig.solvePose = function () { base.call(this); if (this._post) { try { this._post(this.J, this); } catch (e) { this._post = null; } } };
  return rig;
};
/** move one arm's hand to a target in the rig's frame (re-solved with the engine's IK) */
Rigs.arm = (rig, side, target, k = 1) => {
  const J = rig.J, o = rig.o, sh = J['sh' + side]; if (!sh) return;
  const cur = J['hand' + side], t = k >= 1 ? target : [lerp(cur[0], target[0], k), lerp(cur[1], target[1], k), lerp(cur[2], target[2], k)];
  const [el, hd] = E.ik3(sh, t, o.armUpper, o.armLower, [-1, side === 'R' ? .7 : -.7, -.2]); J['elbow' + side] = el; J['hand' + side] = hd;
};
/** poses as joint post-processing (k: 0..1 how much) */
Rigs.ninjaRun = k => (J, rig) => { if (k <= .01) return; Rigs.arm(rig, 'L', [J.shL[0] - 5.5, J.shL[1] - 1.8, J.shL[2] - 5], k); Rigs.arm(rig, 'R', [J.shR[0] - 5.2, J.shR[1] + 1.8, J.shR[2] - 5.4], k); };
Rigs.wallHug = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] - 1.2, J.shL[1] - 4, J.shL[2] - 4], k); Rigs.arm(rig, 'R', [J.shR[0] - 1.2, J.shR[1] + 4, J.shR[2] - 4], k); J.head = [J.head[0] - .6, J.head[1] + .8 * k, J.head[2]]; };
Rigs.eating = t => (J, rig) => { const bob = Math.sin(t * 9) * .8; Rigs.arm(rig, 'R', [J.head[0] + 2.2, J.head[1] + .4, J.head[2] - 2.2 + bob], 1); };
Rigs.sleeping = t => (J, rig) => { J.head = [J.head[0] + 1.4, J.head[1], J.head[2] - 1.2 + Math.sin(t * 1.6) * .5]; };
Rigs.mouthCover = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] + 6.5, J.shL[1] + 3, J.shL[2] + 2.5], k); };
Rigs.drag = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] - 4, J.shL[1] + 1, J.shL[2] - 8], k); Rigs.arm(rig, 'R', [J.shR[0] - 4, J.shR[1] - 1, J.shR[2] - 8], k); };
Rigs.handsUp = k => (J, rig) => { Rigs.arm(rig, 'L', [J.shL[0] + 1, J.shL[1], J.shL[2] + 9], k); Rigs.arm(rig, 'R', [J.shR[0] + 1, J.shR[1], J.shR[2] + 9], k); };
Rigs.swim = t => (J, rig) => { const a = Math.sin(t * 6), b = Math.cos(t * 6); Rigs.arm(rig, 'L', [J.shL[0] + 3 + a * 3, J.shL[1] - 3, J.shL[2] + b * 3], 1); Rigs.arm(rig, 'R', [J.shR[0] + 3 - a * 3, J.shR[1] + 3, J.shR[2] - b * 3], 1); };
Rigs.cower = t => (J, rig) => { Rigs.arm(rig, 'L', [J.head[0] + 1.5, J.head[1] - 1.5, J.head[2] + .5], 1); Rigs.arm(rig, 'R', [J.head[0] + 1.5, J.head[1] + 1.5, J.head[2] + .5 + Math.sin(t * 20) * .3], 1); };
Rigs.chat = t => (J, rig) => { const w = Math.sin(t * 2.3); if (w > .2) Rigs.arm(rig, 'R', [J.shR[0] + 5, J.shR[1] + 2, J.shR[2] - 1 + w * 2], (w - .2) / .8); };
Rigs.paddleTap = t => (J, rig) => { const u = Math.max(0, Math.sin(t * 7)); Rigs.arm(rig, 'R', [J.shR[0] + 4.5, J.shR[1] + .5, J.shR[2] + 1 + u * 3.5], 1); };   // Granny taps her rice paddle
Rigs.toast = k => (J, rig) => { Rigs.arm(rig, 'R', [J.head[0] + 3.2, J.head[1] + 1.6, J.head[2] - .6], k); };   // the lord raises his cup
Rigs.bow = k => (J) => { const d = 3.5 * k; for (const n of ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR']) { J[n] = [J[n][0] + d * (J[n][2] - J.hipC[2]) / 10, J[n][1], J.hipC[2] + (J[n][2] - J.hipC[2]) * (1 - .25 * k)]; } };
Rigs.combine = (...fs) => (J, rig) => { for (const f of fs) if (f) f(J, rig); };

/* ---- the cast ---- */
const CAST = {
  sojiro: () => H({ size: 1.25, build: 'heroic', hood: true, mask: { color: '#232a44' }, outfit: 'coat', sleeves: 'long', weapon: 'sword', bladeLen: 8, cape: { len: 4, width: 3, seg: 2 },
    colors: { hair: '#232a44', cloth: '#2a3050', coat: '#2a3050', pants: '#1e2236', belt: '#b0302a', boot: '#2a2a2e', glove: '#2a2a2e', cape: '#b0302a', capeIn: '#6a1a18', metal: '#d8dce8', trim: '#b0302a' } }),
  kaede: () => H({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#2a1a2a' }, outfit: 'tunic', sleeves: 'long', weapon: 'sword', bladeLen: 5.5, offhand: { len: 5.5 }, cape: { len: 3, width: 2, seg: 1.6 },
    colors: { hair: '#18141c', cloth: '#4a2a44', pants: '#2a1a2a', belt: '#2a8a8a', trim: '#2a8a8a', boot: '#221a22', glove: '#221a22', cape: '#2a8a8a', capeIn: '#1a5a5a', metal: '#e0e4f0' }, face: { eyes: 'big' } }),
  granny: () => H({ size: 1.0, build: 'chibi', hunch: .35, outfit: 'robe', hair: 'ponytail', weapon: 'staff', sleeves: 'long',
    colors: { hair: '#b8b0a8', cloth: '#5a4030', trim: '#e8dcc0', belt: '#e8dcc0', skin: '#e0c0a0', staff: '#c8a070', orb: '#f4ead5', pants: '#4a3426' } }),
  takanori: () => H({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'ponytail', weapon: null, sleeves: 'long', colors: { hair: '#1a1418', cloth: '#2a3a6a', trim: '#e8b04a', belt: '#e8b04a', pants: '#20284a' } }),
  kuroganeRobe: () => H({ size: 1.6, build: 'bulky', outfit: 'robe', hair: 'ponytail', weapon: null, sleeves: 'long', colors: { hair: '#2a2420', cloth: '#5a5a60', trim: '#2a2a30', belt: '#2a2a30', skin: '#c8a888' } }),
  kurogane: () => H({ size: 1.8, build: 'bulky', armor: true, hat: { style: 'kabuto', color: '#2a2a30', crest: '#c8a040' }, weapon: 'sword', bladeLen: 14, sleeves: 'long', outfit: 'coat',
    colors: { cloth: '#2a2a30', coat: '#2a2a30', plate: '#3a3a44', trim: '#8a1c1c', belt: '#8a1c1c', metal: '#d8dce8', pants: '#1e1e24', skin: '#c8a888' } }),
  kuroganeOni: () => H({ size: 2.1, build: 'bulky', armor: true, hat: { style: 'kabuto', color: '#1e1e24', crest: '#e8602a' }, mask: { style: 'oni', color: '#b0201a' }, eyeGlow: '#ff5a2a', weapon: 'sword', bladeLen: 15, sleeves: 'long', outfit: 'coat',
    colors: { cloth: '#1e1e24', coat: '#1e1e24', plate: '#4a1a1a', trim: '#e8602a', belt: '#e8602a', metal: '#ffb080', pants: '#141418' } }),
  kanemori: () => H({ size: 1.25, build: 'bulky', outfit: 'robe', hat: { style: 'band', color: '#2a1a10' }, hair: 'bald', weapon: null, sleeves: 'long', colors: { cloth: '#6a4422', trim: '#e8b04a', belt: '#e8b04a', skin: '#e0b890', pants: '#4a2e16' } }),
  gonroku: () => H({ size: 1.9, build: 'bulky', hair: 'spiky', sleeves: 'none', weapon: 'club', outfit: 'tunic', colors: { hair: '#2a1a10', cloth: '#5a4030', pants: '#3a2a1e', skin: '#c89070', metal: '#3a3a42', belt: '#2a1a10' } }),
  hotaru: () => H({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#1a1018' }, weapon: 'sword', bladeLen: 5, offhand: { len: 5 }, outfit: 'tunic', sleeves: 'long', cape: { len: 3.5, width: 2, seg: 1.7 },
    colors: { hair: '#2a0a10', cloth: '#8a1a2a', pants: '#3a0a14', belt: '#1a1018', trim: '#1a1018', cape: '#1a1018', capeIn: '#e83a2a', metal: '#e8e0f0', glove: '#1a1018' }, face: { eyes: 'big' } }),
  tobei: () => H({ size: 1.1, build: 'chibi', outfit: 'tunic', hat: { style: 'band', color: '#e8dcc0' }, weapon: null, cape: { len: 2.6, width: 4, seg: 1.4 }, colors: { cloth: '#6a5030', pants: '#3a5a3a', cape: '#3a6a3a', capeIn: '#2a4a2a', hair: '#1a1410', belt: '#3a6a3a' } }),
  ittetsu: () => H({ size: 1.4, build: 'bulky', hair: 'bald', outfit: 'robe', weapon: 'sword', bladeLen: 10, sleeves: 'long', colors: { cloth: '#6a5a40', trim: '#2a2a2a', belt: '#2a2a2a', metal: '#8a6a4a', skin: '#d8a880' } }),
  sakubei: () => H({ size: 1.2, build: 'bulky', outfit: 'robe', hat: { style: 'band', color: '#3a2a1a' }, weapon: null, sleeves: 'long', colors: { cloth: '#5a4a3a', trim: '#c8a040', belt: '#c8a040', skin: '#e0b890' } }),
  disciple: c => H({ size: 1.15, build: 'heroic', hood: true, mask: { color: '#1e1e22' }, weapon: 'sword', bladeLen: 6, outfit: 'tunic', sleeves: 'long', colors: { hair: c, cloth: c, pants: '#1e2220', belt: '#e8dcc0', metal: '#8a6a4a' } }),
  daikon: () => H({ size: 1.4, build: 'bulky', hat: { style: 'jingasa', color: '#8a7a50' }, armor: true, weapon: 'spear', colors: { cloth: '#e8e0c8', pants: '#5a6a3a', plate: '#6a6a50', metal: '#a8a8b0', skin: '#e8c8a0' } }),
  ashigaru: f => H({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#3a3430' }, armor: true, weapon: 'spear', sleeves: 'long', colors: { cloth: FACTION[f] || '#6a5a3a', pants: '#2a2622', plate: '#4a4640', metal: '#b8bcc8', belt: '#1e1a16', skin: '#d8b090' } }),
  archer: f => H({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#3a3430' }, armor: true, weapon: 'bow', sleeves: 'long', colors: { cloth: FACTION[f] || '#6a5a3a', pants: '#2a2622', plate: '#4a4640', staff: '#4a2a18', belt: '#1e1a16', skin: '#d8b090' } }),
  samurai: f => H({ size: 1.25, build: 'heroic', hat: { style: 'kabuto', color: '#2a2622', crest: '#c8a040' }, armor: true, sashimono: FACTION[f] || '#8a2a2a', weapon: 'sword', bladeLen: 9, sleeves: 'long', outfit: 'coat',
    colors: { cloth: FACTION[f] || '#6a5a3a', coat: shadeHex(FACTION[f] || '#6a5a3a', -.2), pants: '#1e1a18', plate: '#3a3634', metal: '#e0e4f0', belt: '#8a1c1c', skin: '#d8b090' } }),
  ninja: () => H({ size: 1.2, build: 'heroic', hood: true, mask: { color: '#1a1418' }, weapon: 'sword', bladeLen: 6, outfit: 'tunic', sleeves: 'long', colors: { hair: '#6a1a1a', cloth: '#1a1418', pants: '#141014', belt: '#c8242a', trim: '#c8242a', metal: '#c8ccd8', glove: '#141014' } }),
  merchant: () => H({ size: 1.1, build: 'chibi', outfit: 'robe', hat: { style: 'band', color: '#3a2a1a' }, weapon: null, colors: { cloth: '#6a5a3a', trim: '#3a2a1a', belt: '#3a2a1a' } }),
  maid: i => H({ size: 1.05, build: 'chibi', outfit: 'robe', hair: 'ponytail', weapon: null, sleeves: 'long', colors: { hair: '#1a1410', cloth: ['#c84a6a', '#4a8ac8', '#d8a03a'][i % 3], trim: '#f4ead5', belt: '#f4ead5' } }),
  monk: () => H({ size: 1.1, build: 'chibi', outfit: 'robe', hair: 'bald', weapon: 'staff', colors: { cloth: '#d88a2a', trim: '#8a4a1a', belt: '#8a4a1a', staff: '#6a4a2a', orb: '#e8d8a0' } }),
  drunk: () => H({ size: 1.1, build: 'chibi', outfit: 'tunic', hair: 'spiky', weapon: null, colors: { cloth: '#7a6a5a', pants: '#4a3a2a', skin: '#e8a890', hair: '#2a1a10' } }),
  noble: i => H({ size: 1.1, build: 'chibi', outfit: 'robe', hair: i % 2 ? 'ponytail' : 'short', weapon: null, sleeves: 'long', colors: { hair: '#14100c', cloth: ['#6a2a6a', '#2a5a6a', '#8a3a2a', '#3a6a3a'][i % 4], trim: '#e8b04a', belt: '#e8b04a' } }),
  servant: () => H({ size: 1.05, build: 'chibi', outfit: 'tunic', weapon: null, colors: { cloth: '#6a6a6a', pants: '#3a3a3a', belt: '#2a2a2a' } }),
  clerk: () => H({ size: 1.05, build: 'chibi', outfit: 'robe', hat: { style: 'band', color: '#2a2a2a' }, weapon: null, colors: { cloth: '#4a4a5a', trim: '#2a2a2a' } }),
  spirit: () => null
};
function shadeHex(h, k) { const t = E.tones(h); return k < 0 ? t.sh : t.lt; }
Rigs.make = (id, arg) => { const f = CAST[id]; if (!f) throw new Error('no rig ' + id); return f(arg); };
Rigs.CAST = CAST; Rigs.FACTION = FACTION;

/* ---- HOUND: a 3D skeleton (spine, head, four two-part legs on a trot, a curled tail) drawn through the view ---- */
class Hound {
  constructor(o = {}) { this.size = o.size || 1; this.C = Object.assign({ fur: '#c88a4a', cream: '#f0e0c0', dark: '#5a3a20', eye: '#1a1010', collar: '#c8242a' }, o.colors || {}); this.phase = 0; this.x = this.y = this.z = 0; this.facing = 0; this.state = 'walk'; this.speed = 0; this.t = 0; this.down = 0; this.hurtT = 0; }
  update(dt, s) { this.x = s.x; this.y = s.y; this.z = s.z || 0; this.facing = s.facing; this.speed = Math.hypot(s.vx || 0, s.vy || 0); this.state = s.state || 'walk'; this.t += dt; this.phase += dt * (2 + this.speed * .16); this.down = approach(this.down, s.down ? 1 : 0, dt * 3); this.hurtT = s.hurt ? .2 : Math.max(0, this.hurtT - dt); }
  draw(g, ox, oy, view) {
    const k = this.size, a = this.facing, ca = Math.cos(a), sa = Math.sin(a), dn = this.down;
    const P = (f, r, z) => { const wx = (f * ca - r * sa) * k, wy = (f * sa + r * ca) * k, q = view.p(wx, wy, z * k * (1 - dn * .6) + (dn ? 0 : 0)); return [ox + q[0], oy + q[1]]; };
    const fur = E.tones(this.C.fur), cr = E.tones(this.C.cream), sniff = this.state === 'sniff' || this.state === 'eat', bark = this.state === 'bark' && Math.floor(this.t * 8) % 2 === 0;
    const run = this.speed > 60, ph = this.phase, sw = run ? 3.2 : 2.2, lift = run ? 2.2 : 1.4, roll = dn ? Math.min(1, dn) : 0;
    const legs = [[5, -2.2, 0], [5, 2.2, Math.PI], [-5.5, -2.2, Math.PI], [-5.5, 2.2, 0]];
    const hz = 9 - roll * 6, headZ = sniff ? 5 : bark ? 13 : 11.5, headF = sniff ? 9.5 : 8.6;
    const draws = [];
    for (const [f, r, off] of legs) {
      const p = ph + off + (f < 0 ? .6 : 0), st = this.speed > 4 && !dn ? Math.sin(p) : 0, up = this.speed > 4 && !dn ? Math.max(0, Math.cos(p)) * lift : 0;
      const hip = P(f, r * (1 - roll), hz), knee = P(f + st * sw * .5 + (f > 0 ? .6 : -.8), r * (1 - roll) + roll * 3, hz * .5 + up), foot = P(f + st * sw, r * (1 - roll) + roll * 6, up * .6 + roll * 1);
      const far = (r < 0) !== (Math.sin(a - Math.atan2(view.fy || 1, view.fx || 0)) > 0);
      draws.push([far ? 0 : 3, () => { px.line(g, hip[0], hip[1], knee[0], knee[1], far ? fur.sh : fur.base, 2); px.line(g, knee[0], knee[1], foot[0], foot[1], far ? fur.sh : fur.base, 2); px.dot(g, foot[0], foot[1], cr.sh); }]);
    }
    const sp0 = P(-6.5, 0, hz + .5), sp1 = P(0, 0, hz + 1), sp2 = P(5.5, 0, hz + 1.6), head = P(headF, 0, headZ), snout = P(headF + 3.4, 0, headZ - 1.4), tail = P(-8.5, 0, hz + 4.5 - roll * 3), tip = P(-6.5, 1.5, hz + 7 - roll * 4);
    draws.push([1, () => {
      px.line(g, sp0[0], sp0[1], sp2[0], sp2[1], fur.sh, 6); px.line(g, sp0[0], sp0[1] - 1, sp2[0], sp2[1] - 1, fur.base, 4); px.line(g, sp0[0] + 1, sp0[1] + 1.5, sp2[0], sp2[1] + 1.5, cr.base, 2);
      px.disc(g, sp1[0], sp1[1] - 1, 1.2, fur.lt);
      px.line(g, sp0[0], sp0[1], tail[0], tail[1], fur.base, 2); px.line(g, tail[0], tail[1], tip[0], tip[1], cr.base, 2);
    }]);
    draws.push([2, () => {
      const nk = P(6, 0, hz + 2.2); px.line(g, nk[0], nk[1], head[0], head[1], fur.base, 4);
      px.disc(g, head[0], head[1], 3, fur.sh); px.disc(g, head[0] - .5, head[1] - .5, 2.3, fur.base);
      px.line(g, head[0], head[1], snout[0], snout[1], cr.base, 3); px.dot(g, snout[0], snout[1], '#1a1010');
      const e1 = P(headF + 1, -1.4, headZ + 1), e2 = P(headF + 1, 1.4, headZ + 1), ea = P(headF - 1, -1.6, headZ + 3.4), eb = P(headF - 1, 1.6, headZ + 3.4);
      px.line(g, P(headF - .5, -1.4, headZ + 1.5)[0], P(headF - .5, -1.4, headZ + 1.5)[1], ea[0], ea[1], fur.sh, 2); px.line(g, P(headF - .5, 1.4, headZ + 1.5)[0], P(headF - .5, 1.4, headZ + 1.5)[1], eb[0], eb[1], fur.sh, 2);
      if (!dn) { px.dot(g, e1[0], e1[1], this.C.eye); px.dot(g, e2[0], e2[1], this.C.eye); }
      if (bark) { const m = P(headF + 2.6, 0, headZ - 2.6); px.rect(g, m[0] - 1, m[1], 2, 2, '#5a1418'); }
      const col = P(6.2, 0, hz + 1.8); px.rect(g, col[0] - 1, col[1] - 1, 3, 2, this.C.collar);
    }]);
    draws.sort((p, q) => p[0] - q[0]); for (const d of draws) d[1]();
  }
}
B.Hound = Hound; B.Rigs = Rigs;

/* ---- 30-world.js ---- */
/* ---- WORLD: a level's JSON (the campaign and the Workshop share it exactly) becomes a TileMap for bodies and sight, a
 * nav map where deep water blocks (guards and hounds never swim), a baked light map, hiding spots, water, zones,
 * props, lights, building blocks (for the roof caps) and halls (whose roofs fade while the hero is inside) ---- */
const AMBIENT = { dusk: .45, night: .22, rain: .18, festival: .3 };
const SURF_NOISE = { earth: 1, grass: .8, bamboo: .9, gravel: 1.6, boards: 1.2, tatami: .6, paving: 1, water: .5, shallow: 1.4, door: 1.2, roof: 1.05 };
const SURF_STEP = { earth: 'stepDirt', grass: 'stepTatami', bamboo: 'stepTatami', gravel: 'stepGravel', boards: 'stepWood', tatami: 'stepTatami', paving: 'stepDirt', shallow: 'splash', door: 'stepWood', roof: 'stepWood' };
const LIGHT_KIND = { stoneLantern: { color: '#ffb060', z: 15 }, paperLantern: { color: '#ff9a50', z: 21 }, torch: { color: '#ffa040', z: 22 }, brazier: { color: '#ff8a30', z: 12 }, lanternString: { color: '#ff9a50', z: 26 }, window: { color: '#ffc880', z: 14 }, moonpool: { color: '#8a9ad8', z: 30 }, none: { color: '#ffb060', z: 18 } };
const FLOW_CACHE_MAX = 24;
class World {
  constructor(L) {
    this.L = L; this.id = L.id; this.w = L.size[0]; this.h = L.size[1];
    const rows = L.rows.map(r => (r + '#'.repeat(this.w)).slice(0, this.w));
    while (rows.length < this.h) rows.push('#'.repeat(this.w));
    this.rows = rows.slice(0, this.h);
    const legend = {}, navLegend = {}, types = {};
    for (const ch in WALLTYPES) { const t = WALLTYPES[ch]; legend[ch] = t.id; navLegend[ch] = t.id; types[t.id] = Object.assign({}, t); }
    for (const ch in FLOORCH) { if (ch === '.') continue; legend[ch] = { floor: FLOORCH[ch] }; navLegend[ch] = { floor: FLOORCH[ch], block: ch === '~' }; }
    this.types = types;
    this.map = new E.TileMap({ rows: this.rows, legend, types, floorTex: (x, y, tag) => floorTex(x, y, tag || 'earth'), ao: 4, outside: L.bigMoon ? false : '#08080e' });
    this.map.shimmer = true;
    this.nav = new E.TileMap({ rows: this.rows, legend: navLegend, types });
    this.time = L.time || 'night';
    this.moon = AMBIENT[this.time] || .22;
    this._findBlocks(); this._findHalls();
    this.zones = (L.zones || []).map(z => Object.assign({}, z));
    this.lights = (L.lights || []).map(l => Object.assign({ z: (LIGHT_KIND[l.kind] || LIGHT_KIND.none).z, r: 64, i: .9, color: (LIGHT_KIND[l.kind] || LIGHT_KIND.none).color }, l, { x: cellC(l.at[0]), y: cellC(l.at[1]) }));
    this.props = [];
    for (const l of this.lights) if (l.kind && l.kind !== 'none' && l.kind !== 'window' && l.kind !== 'moonpool') this.props.push({ id: l.kind, x: l.x, y: l.y, z: this.map.groundAt(l.x, l.y), o: { facing: l.facing || 0 }, core: l.kind === 'torch' || l.kind === 'brazier' });
    for (const p of L.props || []) { const [id, cx, cy, o] = p; const x = typeof cx === 'number' ? cellC(cx) : 0, y = cellC(cy); this.props.push({ id, x: o && o.dx ? x + o.dx : x, y: o && o.dy ? y + o.dy : y, z: (o && o.z !== undefined) ? o.z : this.map.groundAt(x, y), o: Object.assign({}, o || {}), core: !SH[id] && E.PROPS && E.PROPS.includes(id) }); }
    // bamboo groves and tall grass dress themselves (seeded by cell, so every copy is the same)
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx], hsh = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
      if (ch === '"' && (cx + cy) % 2 === 0) this.props.push({ id: 'bamboo', x: cellC(cx) + (hsh % 7) - 3, y: cellC(cy) + ((hsh >> 3) % 7) - 3, z: 0, o: { params: { seed: hsh % 97, n: 3 + hsh % 3 } }, deco: true });
      if (ch === ',' && hsh % 3 === 0) this.props.push({ id: 'grass', x: cellC(cx) + (hsh % 9) - 4, y: cellC(cy) + ((hsh >> 4) % 9) - 4, z: 0, o: { params: { h: 9, n: 7 } }, deco: true, grass: true });
    }
    for (const p of this.props) if (p.o.solid) this.map.solid(p.id, p.x, p.y, p.z, p.o);
    this.anchors = (L.anchors || []).map(([cx, cy, z, lx, ly]) => ({ x: cellC(cx), y: cellC(cy), z, tree: true, land: lx !== undefined ? { x: cellC(lx), y: cellC(ly) } : null }));
    this.dyn = []; this.dynStep = []; this.decals = []; this.flash = 0; this.flows = new Map(); this.roofAlpha = {};
    this.bake();
  }
  /** building blocks: connected cells of one building letter (their bounding boxes carry the roof caps) */
  _findBlocks() {
    this.blocks = []; const seen = new Set();
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx]; if (!BUILDINGS.includes(ch) || seen.has(cy * this.w + cx)) continue;
      let x0 = cx, x1 = cx, y0 = cy, y1 = cy; const st = [[cx, cy]]; seen.add(cy * this.w + cx);
      while (st.length) { const [a, b] = st.pop(); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = a + dx, ny = b + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const k = ny * this.w + nx; if (!seen.has(k) && this.rows[ny][nx] === ch) { seen.add(k); st.push([nx, ny]); } } }
      const t = WALLTYPES[ch];
      this.blocks.push({ ch, cx0: x0, cy0: y0, cx1: x1, cy1: y1, x0: x0 * T16, y0: y0 * T16, x1: (x1 + 1) * T16, y1: (y1 + 1) * T16, h: t.h, shachi: ch === 'M', ridge: ch === 'C' || ch === 'G' || ch === 'K' || ch === 'M' ? '#e8e0d0' : '#c8c0b0' });
    }
    // keep tiers stack: a lower tier's cap is covered by the tier above, so only caps not under a higher building draw
    this.caps = this.blocks.filter(b => b.ch !== 'T' && !this.blocks.some(o => o !== b && o.h > b.h && o.x0 <= b.x0 && o.x1 >= b.x1 && o.y0 <= b.y0 && o.y1 >= b.y1));
    for (const b of this.caps) b.ring = this.blocks.some(o => o !== b && o.h > b.h && o.x0 >= b.x0 && o.x1 <= b.x1 && o.y0 >= b.y0 && o.y1 <= b.y1);   // a keep tier with a tier above: an eave ring, no hips
  }
  /** halls: the bounding boxes of connected hall-wall (H) cells, with their tatami interiors */
  _findHalls() {
    this.halls = []; const seen = new Set();
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx]; if (ch !== 'H' || seen.has(cy * this.w + cx)) continue;
      let x0 = cx, x1 = cx, y0 = cy, y1 = cy; const st = [[cx, cy]]; seen.add(cy * this.w + cx);
      while (st.length) { const [a, b] = st.pop(); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = a + dx, ny = b + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const k = ny * this.w + nx; const c2 = this.rows[ny][nx]; if (!seen.has(k) && (c2 === 'H' || c2 === 'd') ) { seen.add(k); st.push([nx, ny]); } } }
      if (x1 - x0 >= 2 && y1 - y0 >= 2) this.halls.push({ i: this.halls.length, cx0: x0, cy0: y0, cx1: x1, cy1: y1, x0: x0 * T16, y0: y0 * T16, x1: (x1 + 1) * T16, y1: (y1 + 1) * T16, h: 40 });
    }
  }
  hallAt(x, y) { for (const h of this.halls) if (x > h.x0 + 4 && x < h.x1 - 4 && y > h.y0 + 4 && y < h.y1 - 4) return h; return null; }
  /** the light map: half cells, ambient moon plus each light's falloff where it can reach (map.ray from the flame) */
  bake() {
    const S = 8, gw = this.w * 2, gh = this.h * 2, G = this.light = new Float32Array(gw * gh), amb = this.moon, lr = T('lanternRadius');
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const top = this.map.height(gx >> 1, gy >> 1); G[gy * gw + gx] = amb + (top > 2 && top < 1e8 ? .1 : 0); }
    for (const l of this.lights) {
      const R = l.r * lr, lz = this.map.groundAt(l.x, l.y) + l.z;
      for (let gy = Math.max(0, Math.floor((l.y - R) / S)); gy <= Math.min(gh - 1, Math.floor((l.y + R) / S)); gy++)
        for (let gx = Math.max(0, Math.floor((l.x - R) / S)); gx <= Math.min(gw - 1, Math.floor((l.x + R) / S)); gx++) {
          const x = gx * S + S / 2, y = gy * S + S / 2, d = Math.hypot(x - l.x, y - l.y); if (d >= R) continue;
          const top = this.map.height(gx >> 1, gy >> 1), z = (top > 1e8 ? 0 : top) + 3;
          if (d > 10 && !this.map.ray({ x: l.x, y: l.y, z: lz }, { x, y, z }).clear) continue;
          G[gy * gw + gx] += l.i * (1 - d / R) * (1 - d / R);
        }
    }
    for (let i = 0; i < G.length; i++) G[i] = clamp(G[i], 0, 1);
    this._lr = lr; this._amb = T('ambientNight');
  }
  /** the light at a point (0..1): the baked map plus dynamic lights (hand lanterns, fire) and lightning */
  lightAt(x, y, z = 0) {
    if (Math.abs(this._lr - T('lanternRadius')) > .001) this.bake();
    const gw = this.w * 2, gx = clamp(Math.floor(x / 8), 0, gw - 1), gy = clamp(Math.floor(y / 8), 0, this.h * 2 - 1);
    let L = this.light[gy * gw + gx];
    for (const list of [this.dyn, this.dynStep]) for (const d of list) { const dd = Math.hypot(x - d.x, y - d.y); if (dd < d.r && (dd < 12 || this.map.los(d.x, d.y, x, y))) L += d.i * (1 - dd / d.r) * (1 - dd / d.r); }
    if (this.flash > 0) L = Math.max(L, .95);
    return clamp(L, 0, 1);
  }
  floorAt(x, y) { return this.map.floorAt(x, y) || 'earth'; }
  isDeep(x, y, z = 0) { return z < 3 && this.map.floorAt(x, y) === 'water' && this.map.heightAt(x, y) === 0; }
  isShallow(x, y, z = 0) { return z < 3 && this.map.floorAt(x, y) === 'shallow'; }
  isHide(x, y, z = 0) { const f = this.map.floorAt(x, y); return z < 3 && (f === 'grass' || f === 'bamboo'); }
  /** the surface under a body: its floor tag, or 'roof' up on a building */
  surface(x, y, z) { if (z > 3) return 'roof'; return this.floorAt(x, y); }
  zoneAt(x, y) { const cx = toCell(x), cy = toCell(y); return this.zones.find(z => cx >= z.rect[0] && cx <= z.rect[2] && cy >= z.rect[1] && cy <= z.rect[3]) || null; }
  /** change cells at runtime (a gate opens): both maps, and the light map again */
  setCells(cx, cy, w, h, ch) {
    for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
      const id = WALLTYPES[ch] ? WALLTYPES[ch].id : 0; this.map.set(x, y, id); this.nav.set(x, y, id);
      const fl = FLOORCH[ch]; if (!WALLTYPES[ch]) { this.map.setFloor(x, y, fl === 'earth' ? null : fl || null, false); this.nav.setFloor(x, y, fl === 'earth' ? null : fl || null, ch === '~'); }
      this.rows[y] = this.rows[y].slice(0, x) + ch + this.rows[y].slice(x + 1);
    }
    this.map.floors = {}; this.bake();
  }
  /** a shared flow field toward a goal cell (LRU of 24 per world); kind: 'walk' | 'ninja' | 'hound' */
  flow(tx, ty, kind = 'walk') {
    const cx = toCell(tx), cy = toCell(ty), key = cx + ',' + cy + ',' + kind;
    let f = this.flows.get(key);
    if (f) { this.flows.delete(key); this.flows.set(key, f); }
    else {
      f = new E.FlowField(this.nav, kind === 'ninja' ? { climb: 56, drop: 56, jump: 60 } : kind === 'roof' ? { climb: 0, drop: 0 } : { drop: 30 });
      this.flows.set(key, f); if (this.flows.size > FLOW_CACHE_MAX) this.flows.delete(this.flows.keys().next().value);
    }
    f.update(cellC(cx), cellC(cy));
    return f;
  }
  /** a direction to walk from a body toward a goal along the nav map: { move: [dx, dy], jump } */
  steer(body, goal, kind = 'walk', speed = 1) {
    const f = this.flow(goal.x, goal.y, kind), nx = f.next(body.x, body.y), d = Math.hypot(goal.x - body.x, goal.y - body.y);
    if (d < 4) return { move: [0, 0], jump: false, arrived: true };
    let tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y;
    if (!nx && toCell(goal.x) === toCell(body.x) && toCell(goal.y) === toCell(body.y)) { tx = goal.x; ty = goal.y; }
    if (nx && toCell(nx.x) === toCell(goal.x) && toCell(nx.y) === toCell(goal.y)) { tx = goal.x; ty = goal.y; }
    const l = Math.hypot(tx - body.x, ty - body.y) || 1;
    const jump = !!(nx && body.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < (body.r || 5) + 4);
    return { move: [(tx - body.x) / l * speed, (ty - body.y) / l * speed], jump, arrived: false, reach: f.d[toCell(body.y) * this.w + toCell(body.x)] < 1e8 };
  }
  /** can the nav map reach goal from body? */
  reachable(body, goal, kind = 'walk') { const f = this.flow(goal.x, goal.y, kind); const v = f.d[toCell(body.y) * this.w + toCell(body.x)]; return v !== undefined && v < 1e8; }
  /** draw the level: floor, walls, roof caps, props, lights, decals */
  draw(r, hero) {
    const M = this.map;
    if (this.L.bigMoon) { r.sky(['#05061a', '#10143a', '#22204a']); r.starfield && r.starfield({ count: 60, speed: 0 }); const g = r.ctx; Art.moon(g, Math.round(r.W * .78), Math.round(r.H * .2), Math.round(Math.min(r.W, r.H) * .16), '#fff4d8'); }
    M.drawFloor(r);
    for (const d of this.decals) if (d.kind === 'ink') r.decal(g => { const p = r.w(d.x, d.y, d.z || 0); px.blend(g, d.a === undefined ? .8 : d.a, 'normal', () => Art.splat(g, p[0], p[1], d.r, '#4a0a0c', d.seed)); });
    M.queueWalls(r);
    const fx = game.cam.tx || 0, fy = game.cam.ty || 0, reach = (r.W + r.H) / Math.max(.5, game.zoom) * .9;
    const M2 = B.M, on = M2 ? [M2.hero].concat(M2.guards, M2.bosses, M2.civs) : [];
    for (const b of this.caps) if (Math.abs((b.x0 + b.x1) / 2 - fx) < reach + 80 && Math.abs((b.y0 + b.y1) / 2 - fy) < reach + 80) {
      // someone standing on this roof: only its eave ring (a full cap would sort over them)
      const used = on.some(a => a && !a.sunk && a.x > b.x0 - 4 && a.x < b.x1 + 4 && a.y > b.y0 - 4 && a.y < b.y1 + 4 && Math.abs((a.z || 0) - b.h) < 6);
      Art.roofCap(r, used && !b.ring ? Object.assign({}, b, { ring: true }) : b);
    }
    const inside = hero ? this.hallAt(hero.x, hero.y) : null;
    for (const h of this.halls) {
      const a = this.roofAlpha[h.i] === undefined ? 1 : this.roofAlpha[h.i], to = inside === h || (B.Dev && B.Dev.flags.roofs) ? 0 : 1;
      this.roofAlpha[h.i] = approach(a, to, .08);
      Art.hallRoof(r, h, this.roofAlpha[h.i]);
    }
    for (const p of this.props) {
      if (Math.abs(p.x - fx) > reach || Math.abs(p.y - fy) > reach) continue;
      if (p.core) r.prop(p.id, p.x, p.y, p.z, Object.assign({ size: 1.3, light: false }, p.o));
      else if (p.id === 'nobori') Art.nobori(r, p);
      else r.shape(p.id, p.x, p.y, p.z, p.o);
    }
    const t = game.time, lr = T('lanternRadius');
    for (const l of this.lights) {
      if (Math.abs(l.x - fx) > reach * 1.3 || Math.abs(l.y - fy) > reach * 1.3) continue;
      const fl = l.kind === 'window' || l.kind === 'moonpool' ? 1 : .88 + .12 * Math.sin(t * 9 + l.x * .7) * Math.sin(t * 5.3 + l.y);
      Lt.add(l.x, l.y, this.map.groundAt(l.x, l.y) + l.z, l.r * lr * 1.15, l.i * fl, { color: l.color });
    }
    for (const list of [this.dyn, this.dynStep]) for (const d of list) Lt.add(d.x, d.y, d.z || 20, d.r * 1.1, d.i, { color: d.color || '#ffb060' });
  }
}
/** nobori: a tall festival banner on a pole, its cloth waving (drawn, not a shape) */
Art.nobori = (r, p) => {
  const c = p.o.color || '#c8342a';
  r.queue(p.x, p.y, p.z, g => {
    const P = (dx, dy, z) => r.w(p.x + dx, p.y + dy, p.z + z), t = game.time;
    const a = P(0, 0, 0), b = P(0, 0, 46); px.line(g, a[0], a[1], b[0], b[1], '#3a2a1e', 2);
    const pts = []; for (let i = 0; i <= 5; i++) { const z = 44 - i * 7, w = Math.sin(t * 2.4 - i * .7) * 1.6; pts.push([P(0, 0, z), P(7 + w, w * .6, z)]); }
    for (let i = 0; i < 5; i++) px.poly(g, [pts[i][0], pts[i][1], pts[i + 1][1], pts[i + 1][0]].map(q => [q[0], q[1]]), i % 2 ? c : E.tones(c).lt);
    const q = pts[2]; px.dot(g, (q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2, '#f4ead5');
  });
};
B.World = World; B.SURF_NOISE = SURF_NOISE; B.SURF_STEP = SURF_STEP;

/* ---- 31-actors.js ---- */
/* ---- ACTORS: every body in a mission is an E.Mover with a rig, health and status. Guards, the hero, bosses, civilians,
 * Tobei and the hub's ghosts share this base, so sight (E.sees), actions (E.ACTIONS) and damage treat them alike ---- */
const Actor = {};
let ACTOR_ID = 0;
Actor.make = (o) => {
  const b = new E.Mover(Object.assign({ r: 5, climbMax: 30, hopMax: 48, vault: 14 }, o.body || {}, { x: o.x, y: o.y, z: o.z || 0 }));
  b.facing = o.facing || 0;
  return Object.assign(b, { uid: ++ACTOR_ID, id: o.id || ('a' + ACTOR_ID), kind: o.kind || 'guard', rig: o.rig || null, hp: o.hp || 10, maxHp: o.hp || 10, alive: true, asleep: false,
    hurtT: 0, iframes: 0, flash: 0, status: {}, team: o.team || 'enemy', hidden: false, sunk: false, vis: 'visible', visA: 1, seen: false });
};
/** a body that can be dragged: dead, asleep or knocked out (not a boss, not sunk) */
Actor.isBody = a => a && !a.sunk && (!a.alive || a.asleep || (a.status && a.status.sleep > 0)) && a.kind !== 'boss' && a.kind !== 'escort';
/** draw an actor with its shadow; o: r.actor options */
Actor.draw = (r, a, o = {}) => {
  if (a.sunk || !a.rig) return;
  const z = a.drawZ !== undefined ? a.drawZ : a.z, M = B.M, ground = M ? M.world.map.groundAt(a.x, a.y, a.r, a.z) : 0;
  if (!a.noShadow) r.shadow(a.x, a.y, a.kind === 'boss' ? 10 : 6, .35, undefined, ground);
  const rig = a.rig;
  r.actor(a.x, a.y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), o);
};
B.Actor = Actor;

/* ---- 40-hero.js ---- */
/* ---- THE HERO: an E.Mover driven only by an intent (the player's, the autopilot's or a test's). Traversal is the
 * Mover's parkour (ledges up to 30, vaults, gap leaps, hop-downs; roofs need the grapple), plus swimming and diving,
 * the wall hug and peek, dragging bodies, the dodge roll, eating, the whistle and the noise every step makes ---- */
const CHARS = {
  sojiro: { name: 'Sojiro', hp: 100, dmg: 1.2, atk: 1, block: .85, cut: .9, pull: 1, noise: 1, runAdd: 0, combo: ['slash', 'backslash', 'overhead'], comboDmg: [14, 14, 24], voice: 'sojiro', weapon: 'Katana',
    bars: [.85, .6, .65], blurb: 'Steady and strong. His katana hits hard and his guard holds.' },
  kaede: { name: 'Kaede', hp: 80, dmg: .85, atk: 1.25, block: .7, cut: .7, pull: 1.15, noise: .8, runAdd: 7, combo: ['thrust', 'backslash', 'spin'], comboDmg: [9, 9, 18], voice: 'kaede', weapon: 'Twin kodachi',
    bars: [.55, .9, .9], blurb: 'Quick and quiet. Two short blades, light feet, a sharp tongue.' }
};
B.CHARS = CHARS;
const Hero = {};
Hero.make = (charId, at, M) => {
  const C = CHARS[charId] || CHARS.sojiro, trial = M.mode === 'trial' || M.mode === 'hub', stats = trial ? CHARS.sojiro : C;
  const h = Actor.make({ kind: 'hero', id: 'hero', x: at.x, y: at.y, z: at.z || 0, facing: at.facing || 0, team: 'hero', hp: Math.round(stats.hp * T('heroHpMul')),
    rig: Rigs.make(charId === 'kaede' ? 'kaede' : 'sojiro'),
    body: { climbAny: false, climbMax: 30, vault: 14, hopMax: 48, staminaMax: 100, jumpSpeed: 220, walk: 50 } });
  Object.assign(h, { char: charId, C: stats, look: C, crouchHeld: false, swim: false, dive: false, breath: T('breath'), hug: null, hugT: 0, peek: null, drag: null, eatT: 0,
    combo: new E.Combo(stats.combo.map(n => new E.Attack(n, { wind: E.MOVES[n].wind / stats.atk, recover: E.MOVES[n].recover / stats.atk })), { window: .3 }),
    jumpAtk: null, blocking: false, parryT: 9, softT: 0, cloakT: 0, sel: 0, bento: [], noiseT: 0, stepD: 0, dead: false, deadT: 0, aim: null, drawZ: undefined, cutsAt: 0, lastLand: 0 });
  h.tire = Object.assign({}, h.tire, { sprint: 20 });
  h.rig.update(0, h.rigState());
  return h;
};
/** apply the live tuning to the hero's speeds (the sliders take effect on the next step) */
Hero.tune = h => { const add = h.C.runAdd || 0; h.run = T('heroRun') + add; h.sneak = T('heroSneak'); h.sprintSpeed = T('heroSprint') + add; };
/** the selected bento compartment (skipping empty ones) */
Hero.slot = h => h.bento[h.sel] && h.bento[h.sel].n > 0 ? h.bento[h.sel] : null;
Hero.cycle = (h, d) => { const n = h.bento.length; if (!n) return; for (let k = 1; k <= n; k++) { const i = ((h.sel + d * k) % n + n) % n; if (h.bento[i] && h.bento[i].n > 0) { if (i !== h.sel) { h.sel = i; Au.sfx('uiMove', { vol: .5 }); h.selT = game.real; } return; } } };
Hero.count = (h, tool) => h.bento.reduce((s, c) => s + (c && c.tool === tool ? c.n : 0), 0);
Hero.take = (h, tool) => { if (B.M && B.M.cheats.infinite) return true; for (const c of h.bento) if (c && c.tool === tool && c.n > 0) { c.n--; return true; } return false; };
Hero.give = (h, tool, n) => {
  const spec = B.get('tool', tool); if (!spec) return 0; let left = n;
  for (const c of h.bento) if (c && c.tool === tool && c.n < spec.stack) { const k = Math.min(left, spec.stack - c.n); c.n += k; left -= k; if (!left) break; }
  for (let i = 0; i < h.bento.length && left > 0; i++) if (!h.bento[i] || h.bento[i].n <= 0) { const k = Math.min(left, spec.stack); h.bento[i] = { tool, n: k }; left -= k; }
  return n - left;
};

Hero.update = (h, dt, it, M) => {
  const W = M.world, map = W.map;
  Hero.tune(h);
  h.iframes = Math.max(0, h.iframes - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.softT = Math.max(0, h.softT - dt); h.cloakT = Math.max(0, h.cloakT - dt); h.parryT += dt;
  if (h.dead) { h.deadT += dt; h.update(dt, map, { move: [0, 0] }); h.rig._post = null; h.rig.update(dt, h.rigState({ pose: 'die' })); return; }
  // ---- cheats: no-clip flies through everything (jump rises, crouch sinks) ----
  if (M.cheats.noclip && !h.action) {
    const sp = it.sprint ? 220 : 120; h.x += (it.move[0] || 0) * sp * dt; h.y += (it.move[1] || 0) * sp * dt;
    if (it.jumpPressed || (it.player && game.input.down('jump'))) h.z += 140 * dt; if (it.player && game.input.down('crouch')) h.z = Math.max(0, h.z - 140 * dt);
    h.x = clamp(h.x, 2, W.w * T16 - 2); h.y = clamp(h.y, 2, W.h * T16 - 2); h.vx = h.vy = h.vz = 0; h.onGround = true;
    if (Math.hypot(it.move[0], it.move[1]) > .1) h.facing = Math.atan2(it.move[1], it.move[0]);
    h.rig.update(dt, h.rigState({ air: true })); return;
  }
  if (it.toolDelta) Hero.cycle(h, it.toolDelta);
  if (it.toolSlot >= 0 && h.bento[it.toolSlot] && h.bento[it.toolSlot].n > 0) h.sel = it.toolSlot;
  // ---- a playing action (a Silent Cut, the grapple, a climb, a roll) moves the body itself ----
  if (h.action) {
    const a = h.action;
    h.update(dt, map, { move: [0, 0] });
    if (h.action) { h.rig._post = a.spec && a.spec.post ? a.spec.post(a) : null; h.rig.update(dt, a.rigState()); h.drawZ = a.spec && a.spec.drawZ ? a.spec.drawZ(a) : undefined; return; }
  }
  // ---- water: swim on the surface, crouch dives (unseen, breath runs down) ----
  const deep = W.isDeep(h.x, h.y, h.z) && h.onGround;
  if (deep && !h.swim) { h.swim = true; sfxAt('splash', h.x, h.y); Pt.bits(h.x, h.y, 2, 8, ['#a8d8f0', '#ffffff']); B.noise(h.x, h.y, 0, 40, 'splash'); if (h.drag) Hero.dropBody(h, M); }
  if (!deep && h.swim) { h.swim = false; h.dive = false; }
  if (h.swim) {
    if (it.crouchPressed) { h.dive = !h.dive; if (h.dive) { Au.sfx('dive'); Pt.bits(h.x, h.y, 2, 6, ['#a8d8f0']); } }
    h.crouch = false;
    if (h.dive) { h.breath -= dt; if (h.breath <= 0) { h.breath = 0; B.damage(null, h, 8 * dt, { kind: 'drown', silent: true }); } if (crand() < dt * 3) Pt.add({ kind: 'glint', x: h.x + (crand() - .5) * 6, y: h.y + (crand() - .5) * 6, z: 2, color: '#c8e8ff', life: .5, vz: 18 }); }
    else h.breath = Math.min(T('breath'), h.breath + dt * 3);
  } else h.breath = Math.min(T('breath'), h.breath + dt * 4);
  // ---- crouch: a toggle (or held, by the setting); the Mover sneaks while crouched ----
  if (!h.swim) {
    if (game.settings.crouchHold && it.player) h.crouch = !!it.crouchDown;
    else if (it.crouchPressed) { if (h.hug) Hero.unhug(h); else h.crouch = !h.crouch; }
  }
  // ---- the wall hug: crouched, pushing into a wall face for .2 s; the stick then slides along it; at an end, a peek ----
  const mv = it.move || [0, 0], ml = Math.hypot(mv[0], mv[1]);
  let move = [mv[0], mv[1]];
  if (it.focusDown || (h.drag && !M.cheats.noclip)) { const k = Math.min(ml, .5); if (ml > 0) move = [mv[0] / ml * k, mv[1] / ml * k]; }
  h.peek = null;
  if (h.hug) {
    const hw = h.hug, tx = -hw.ny, ty = hw.nx, along = move[0] * tx + move[1] * ty, away = move[0] * hw.nx + move[1] * hw.ny;
    if (away > .6 || !h.crouch || h.swim) Hero.unhug(h);
    else {
      const ahead = map.wall({ x: h.x + tx * Math.sign(along || 1) * 8, y: h.y + ty * Math.sign(along || 1) * 8, z: h.z, r: h.r }, [-hw.nx, -hw.ny], { reach: h.r + 4 });
      const atEnd = !ahead || ahead.top - h.z < 20;
      if (Math.abs(along) > .2 && atEnd) { h.peek = [tx * Math.sign(along), ty * Math.sign(along)]; move = [0, 0]; }
      else move = [tx * along * .75, ty * along * .75];
      h.facing = Math.atan2(hw.ny, hw.nx);
    }
  } else if (h.crouch && ml > .3 && h.onGround && !h.swim && !h.drag) {
    const wl = map.wall(h, [mv[0], mv[1]], { reach: h.r + 3 });
    if (wl && wl.top - h.z >= 20) { h.hugT += dt; if (h.hugT > .2) { h.hug = { nx: wl.nx, ny: wl.ny, x: wl.x, y: wl.y }; h.hugT = 0; Au.sfx('stepTatami', { vol: .6 }); } } else h.hugT = 0;
  } else h.hugT = 0;
  // ---- block, parry, dodge roll ----
  h.blocking = !!it.blockDown && !h.swim && !h.drag && !h.eatT && h.onGround;
  if (it.blockPressed) h.parryT = 0;
  if (h.blocking && it.jumpPressed && ml > .3 && !h.action) { const d = h.dodge([mv[0], mv[1]], 34); if (d) { Au.sfx('whoosh', { vol: .6 }); B.noise(h.x, h.y, h.z, 20, 'roll'); h.combo.cancel(); h.rig.update(dt, h.rigState()); return; } }
  // ---- eating (a rice ball: .6 s, vulnerable) ----
  if (h.eatT > 0) { h.eatT -= dt; if (h.eatT <= 0) { h.hp = Math.min(h.maxHp, h.hp + 40); Au.sfx('eat'); Pt.glints(h.x, h.y, h.z + 20, 6, '#a8f0a0'); } move = [0, 0]; }
  if (it.healPressed && !h.eatT && h.hp < h.maxHp) { if (Hero.take(h, 'riceball')) { h.eatT = .6; Au.sfx('crunch'); B.emit('toolUsed', { tool: 'riceball' }); } else B.Hud.toast('No rice balls', 'Pack them in the bento.'); }
  if (it.lurePressed && !h.swim) { Au.sfx('whistle'); B.noise(h.x, h.y, h.z, 70, 'whistle'); B.emit('lure', {}); }
  // ---- the mouse: a left click on something usable in reach interacts instead of striking ----
  if (it.mouseMode && it.attackPressed && !SilentCut.find(h, M) && (Mission.nearInteract(M, h) || (M.escort && !M.escort.caged && Math.hypot(M.escort.x - h.x, M.escort.y - h.y) < 22) || (!h.drag && Hero.bodyNear(h, M))) && !Combat.targets(M).some(e => e.kind !== 'civ' && e.mind && e.mind.state === 'alert' && Math.hypot(e.x - h.x, e.y - h.y) < 40)) { it.attackPressed = false; it.interactPressed = true; it.interactDown = true; it.interactHold = true; }
  // ---- interact: drag a body, or whatever the mission offers here ----
  if (it.interactPressed && !h.eatT) {
    if (h.drag) Hero.dropBody(h, M);
    else if (!(M.interact && M.interact(h, it))) { const b = Hero.bodyNear(h, M); if (b && !h.swim) Hero.grabBody(h, b); }
  }
  // ---- the grappling hook, tools, strikes ----
  B.Grapple.update(h, it, dt, M);
  if (h.action) { h.rig.update(dt, h.action.rigState()); return; }
  if (it.usePressed && !h.drag && !h.eatT) B.Tools.use(h, it, M);
  if (it.attackPressed && !h.drag && !h.eatT && !h.swim) {
    if (!B.SilentCut.tryCut(h, M) && !B.Combat.tryRiposte(h, M)) {
      if (!h.onGround && !h.jumpAtk) { h.jumpAtk = new E.Attack('plunge'); h.jumpAtk.start(); Au.sfx('slash'); }
      else if (h.onGround && h.combo.press()) { B.Combat.faceTarget(h, it, M); Au.sfx('slash', { pitch: 1 + h.combo.step * .1 }); }
    }
  }
  else if (it.attackPressed && h.swim) B.SilentCut.tryCut(h, M);
  // ---- move ----
  // special gaits set the Mover's walk speed and pass a walking-length stick (its top speed is chosen by stick length)
  const wasGround = h.onGround, shallow = W.isShallow(h.x, h.y, h.z) ? .7 : 1;
  let sp = h.drag ? 24 : h.swim ? (h.dive ? 24 : 30) : h.hug ? 24 : h.blocking ? 26 : 0;
  if (!sp && shallow < 1) sp = (h.crouch ? h.sneak : Math.hypot(move[0], move[1]) < .55 ? 50 : h.run) * shallow;
  h.walk = sp || 50;
  if (sp) { h.sneak = Math.min(h.sneak, sp); const l = Math.hypot(move[0], move[1]); if (l > .05) move = [move[0] / l * .5, move[1] / l * .5]; }
  if ((h.combo.busy || h.eatT > 0) && h.onGround) { if (Math.hypot(move[0], move[1]) > .1) h.facing = E.approachAng(h.facing, Math.atan2(move[1], move[0]), dt * 4); move = [0, 0]; }
  const sprint = !!it.sprint && !h.swim && !h.drag && !h.blocking && !it.focusDown;
  const jumpPressed = !!it.jumpPressed && !h.blocking && !h.drag && !(h.hug);
  const zb = h.z;
  h.update(dt, map, { move, sprint, crouch: h.swim ? false : h.crouch, jumpPressed });
  if (h.action) { h.combo.cancel(); }
  if (h.swim && !W.isDeep(h.x, h.y, h.z)) { /* out of the water this step */ }
  // ---- landing, falls, hazards ----
  if (h.onGround && !wasGround && zb - h.z > -1) {
    const fall = h.fell || 0;
    if (fall > 6) { B.noise(h.x, h.y, h.z, h.action && h.action.name === 'roll' ? 20 : 50 * (h.softT > 0 ? .4 : 1), 'land'); Pt.dust(h.x, h.y, h.z, 4); }
    if (h.jumpAtk) { B.Combat.landAttack(h, M); h.jumpAtk = null; }
  }
  if (h.hurt) { B.damage(null, h, 15, { kind: 'fall' }); }
  if (h.inHazard) { h.inHazard = false; h.respawn(); B.damage(null, h, 10, { kind: 'fall' }); }
  if (h.jumpAtk) { h.jumpAtk.update(dt); if (!h.jumpAtk.busy && h.onGround) h.jumpAtk = null; }
  // ---- combat swings ----
  B.Combat.heroSwing(h, dt, M);
  // ---- noise and footsteps ----
  const speed = Math.hypot(h.vx, h.vy), surf = W.surface(h.x, h.y, h.z);
  h.noiseT -= dt;
  if (speed > 5 && h.onGround) {
    h.stepD += speed * dt;
    let loud = 0;
    if (h.swim) loud = h.dive ? 0 : 15;
    else if (h.sprinting) loud = (h.softT > 0 ? 30 : 110);
    else if (h.crouch || speed < 55) loud = surf === 'gravel' ? 12 : surf === 'shallow' ? 40 : 0;
    else loud = h.softT > 0 ? 0 : T('noiseRun') * (B.SURF_NOISE[surf] || 1);
    if (surf === 'shallow') loud = Math.max(loud, 40);
    loud *= h.C.noise;
    if (h.drag) loud = Math.max(loud, 10);
    if (loud > 0 && h.noiseT <= 0) { B.noise(h.x, h.y, h.z, loud, h.swim ? 'splash' : 'step'); h.noiseT = .25; }
    const stride = h.sprinting ? 18 : h.crouch ? 26 : 16;
    if (h.stepD > stride) {
      h.stepD = 0;
      if (h.swim) { if (!h.dive) Au.sfx('swim', { vol: .5 }); else Au.sfx('bubble', { vol: .4 }); }
      else { const v = h.crouch || speed < 55 ? .25 : h.sprinting ? .9 : .55; Au.sfx(B.SURF_STEP[surf] || 'stepDirt', { vol: v * (h.softT > 0 ? .3 : 1) }); if (surf === 'boards' && !h.crouch && crand() < .3) Au.sfx('creak', { vol: .6 }); }
    }
  }
  // ---- the dragged body follows 14 behind ----
  if (h.drag) { const b = h.drag, a = h.facing + Math.PI; b.x = approach(b.x, h.x + Math.cos(a) * 14, 80 * dt); b.y = approach(b.y, h.y + Math.sin(a) * 14, 80 * dt); b.z = h.z; b.facing = h.facing; }
  // ---- the rig: the ninja run (arms back), the hug, the drag, swimming, eating, blocking ----
  const runK = h.sprinting ? 1 : speed > 70 && !h.crouch && h.onGround && !h.combo.busy ? .7 : 0;
  h.rig._post = Rigs.combine(runK ? Rigs.ninjaRun(runK) : null, h.hug ? Rigs.wallHug(1) : null, h.drag ? Rigs.drag(1) : null, h.swim ? Rigs.swim(game.time) : null, h.eatT > 0 ? Rigs.eating(game.time) : null);
  h.drawZ = h.swim ? h.z - (h.dive ? 15 : 9) : undefined;
  const atk = h.jumpAtk ? h.jumpAtk.state : h.combo.state;
  h.rig.update(dt, h.rigState({ attack: atk, pose: h.blocking ? 'block' : h.eatT > 0 ? 'crouch' : h.swim ? null : null, hurt: h.hurtT > .2, crouch: h.crouch || h.hug || h.eatT > 0 ? true : undefined, down: h.swim ? (h.dive ? .55 : .35) : undefined }));
};
Hero.unhug = h => { h.hug = null; h.peek = null; };
Hero.bodyNear = (h, M) => { let best = null, bd = 18; for (const g of M.guards.concat(M.civs)) { if (!Actor.isBody(g) || g.dragged) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < bd && Math.abs(g.z - h.z) < 8) { bd = d; best = g; } } return best; };
Hero.grabBody = (h, b) => { h.drag = b; b.dragged = true; b.hidden = false; h.crouch = false; Hero.unhug(h); Au.sfx('bodyDrop', { vol: .5 }); B.emit('drag', { body: b }); };
Hero.dropBody = (h, M) => {
  const b = h.drag; if (!b) return; h.drag = null; b.dragged = false; const W = M.world;
  if (W.isDeep(b.x, b.y, 0)) { b.sunk = true; sfxAt('splash', b.x, b.y); Pt.bits(b.x, b.y, 2, 10, ['#a8d8f0', '#ffffff']); B.Hud.toast('The water keeps secrets', 'The body sinks.'); }
  else if (W.isHide(b.x, b.y, b.z) || W.lightAt(b.x, b.y, b.z) < .3) { b.hidden = true; B.Hud.toast('Hidden', 'The body lies in shadow.'); }
  else b.hidden = false;
  Au.sfx('bodyDrop', { vol: .6 }); B.emit('dropBody', { body: b });
};
B.Hero = Hero;

/* ---- 41-silentcut.js ---- */
/* ---- SILENT CUTS (静斬): five kinds, each its own paired E.ACTIONS choreography per character. Back (behind, unseen),
 * Side (calm, not looking), Front (asleep, eating, stunned, blinded or poisoned), From above (on a top over them), Undertow
 * (from the water). Never on an alert guard, never on a boss. Slow motion, a zoom, letterbox and the brush splash ---- */
const SilentCut = { slowT: 0, cand: null };
const CUT_NOISE = { back: 0, side: 15, front: 15, above: 0, undertow: 10 };
const CUT_LABEL = { back: 'Back', side: 'Side', front: 'Front', above: 'From above', undertow: 'Undertow' };
const lp = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z || 0, b.z || 0, u) });
/** the best Silent Cut available now: { kind, victim } or null */
SilentCut.find = (h, M) => {
  if (h.action || h.drag || h.dead || h.eatT > 0) return null;
  const W = M.world, kr = T('killRange'), back = T('killBackAngle') * Math.PI / 180;
  let best = null, bd = 1e9;
  for (const g of M.guards.concat(M.civs)) {
    if (!g.alive || g.kind === 'boss' || g.cutBy || g.sunk || g.asleep && g.kind === 'civ') continue;
    const st = g.mind ? g.mind.state : 'calm', alert = st === 'alert' || g.fighting || g.status.flee > 0;
    const d = Math.hypot(g.x - h.x, g.y - h.y), dz = h.z - g.z;
    const inc = g.asleep || g.status.sleep > 0 || g.status.eat > 0 || g.status.stun > 0 || g.status.blind > 0 || g.status.poison > 0;
    let kind = null;
    if (h.swim) { if (d <= 24 && !alert && Math.abs(dz) < 12 && !W.isDeep(g.x, g.y, g.z) && SilentCut.nearWater(W, g)) kind = 'undertow'; }
    else if (dz >= 14 && d <= 44 && h.onGround && !alert && (inc || st !== 'alert') && W.map.arcClear({ x: h.x, y: h.y, z: h.z }, { x: g.x, y: g.y, z: g.z }, 10)) kind = 'above';
    else if (Math.abs(dz) <= 10 && d <= kr && h.onGround) {
      const rel = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - h.y, g.x - h.x)));
      if (inc && !alert) kind = 'front';
      else if (rel < back && !alert && !g.seesHero) kind = 'back';
      else if (rel < Math.PI * 2 / 3 && st === 'calm' && !g.seesHero) kind = 'side';
    }
    if (kind && d < bd) { bd = d; best = { kind, victim: g }; }
  }
  return best;
};
SilentCut.nearWater = (W, g) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (W.isDeep(g.x + dx * 14, g.y + dy * 14, 0)) return true; return false; };
SilentCut.tryCut = (h, M) => { const c = SilentCut.find(h, M); if (!c) return false; SilentCut.run(h, c.kind, c.victim, M); return true; };
SilentCut.run = (h, kind, v, M) => {
  const ch = h.char === 'kaede' ? 'kaede' : 'sojiro', mark = !!v.mark;
  h.combo.cancel(); Hero.unhug(h); h.crouch = false;
  if (v.drag) { /* dragged bodies are never victims */ }
  const act = h.play('cut_' + kind + '_' + ch, { other: v, map: M.world.map, kind, speed: ch === 'kaede' ? 1.12 : 1 });
  v.cutBy = act; v.vx = v.vy = 0; if (v.atk) v.atk.cancel && v.atk.cancel(); v.fighting = false;
  act.cut = { kind, victim: v, mark, struck: false };
  SilentCut.active = act;
  // presentation: hit-stop, slow motion, a zoom, letterbox and the splash
  game.freeze(.05); SilentCut.slowT = .55; game.timeScale = T('slowmo'); B.Cam.cine(1.8, .9);
  B.Hud.letterbox(1.0); B.Hud.splash(kind, mark);
  Au.sfx('stingCut'); Au.sfx('cutTwang', { vol: .8 });
  if (CUT_NOISE[kind]) B.noise(v.x, v.y, v.z, CUT_NOISE[kind], 'grunt');
  if (!mark && v.kind !== 'civ') B.Voice.bark(pickR(B.Story.barks.hurt), v.voice || 'guard', v.x, v.y, { force: true });
};
/** each step: strike when the choreography reaches its blow, restore time after the slow motion */
SilentCut.update = (dtReal, M) => {
  if (SilentCut.slowT > 0) { SilentCut.slowT -= dtReal; if (SilentCut.slowT <= 0 && game.timeScale < 1) game.timeScale = (B.Dev && B.Dev.timeScale) || 1; }
  const act = SilentCut.active; if (!act) return;
  const c = act.cut, v = c.victim;
  if (!c.struck && (act.beat === 'drop' || act.beat === 'sink' || act.done)) {
    c.struck = true;
    if (c.mark) { v.alive = false; v.marked = true; B.emit('mark', { kind: c.kind, victim: v }); Pt.bits(v.x, v.y, v.z + 18, 14, ['#f4f0e6', '#d8d0c0']); }
    else {
      v.hp = 0; v.alive = false; B.emit('silentCut', { kind: c.kind, victim: v }); B.emit('kill', { victim: v, how: 'cut', kind: c.kind });
      if (game.settings.blood !== 'off') { Pt.bits(v.x, v.y, v.z + 16, 12, ['#8a0a10', '#c81a20', '#3a0406']); M.world.decals.push({ kind: 'ink', x: v.x + (crand() - .5) * 6, y: v.y + (crand() - .5) * 6, z: v.z, r: 3 + crand() * 2, seed: crand() * 999 | 0 }); }
    }
    Au.sfx('thud');
  }
  if (act.done) {
    if (c.kind === 'undertow' && !c.mark) { v.sunk = true; sfxAt('splash', v.x, v.y); }
    v.cutBy = null; SilentCut.active = null; v.vx = v.vy = 0;
    if (!c.struck) { c.struck = true; v.alive = false; }
  }
};
/* ---- the choreographies: beats per kind and character; at(A, beat, u) places both bodies and poses both rigs ---- */
const CUT_BEATS = {
  back: { sojiro: [['grab', .16], ['strike', .24], ['hold', .25], ['drop', .4], ['recover', .18]], kaede: [['hop', .14], ['strike', .16], ['strike2', .16], ['drop', .4], ['recover', .15]] },
  side: { sojiro: [['dash', .2], ['strike', .22], ['drop', .4], ['recover', .2]], kaede: [['dash', .16], ['spin', .3], ['drop', .4], ['recover', .16]] },
  front: { sojiro: [['step', .14], ['rising', .28], ['drop', .45], ['recover', .2]], kaede: [['step', .12], ['xcut', .26], ['drop', .4], ['recover', .16]] },
  above: { sojiro: [['leap', .38], ['strike', .18], ['drop', .45], ['recover', .25]], kaede: [['leap', .34], ['strike', .2], ['drop', .4], ['recover', .2]] },
  undertow: { sojiro: [['rise', .18], ['grab', .22], ['pull', .45], ['sink', .45]], kaede: [['rise', .16], ['grab', .2], ['pull', .42], ['sink', .42]] }
};
const MOVE_OF = { back: { sojiro: 'thrust', kaede: 'thrust' }, side: { sojiro: 'slash', kaede: 'spin' }, front: { sojiro: 'rising', kaede: 'slash' }, above: { sojiro: 'overhead', kaede: 'plunge' } };
const cutSpec = (kind, ch) => ({
  beats: CUT_BEATS[kind][ch],
  setup(A) {
    const v = A.o.other, gap = (A.body.r || 5) + (v.r || 5) - 1, f = v.facing || 0;
    A.vic = { x: v.x, y: v.y, z: v.z || 0, facing: f }; A.from = { x: A.start.x, y: A.start.y, z: A.start.z };
    A.behind = { x: v.x - Math.cos(f) * gap, y: v.y - Math.sin(f) * gap, z: v.z || 0 };
    A.front = { x: v.x + Math.cos(f) * gap, y: v.y + Math.sin(f) * gap, z: v.z || 0 };
    const a = Math.atan2(v.y - A.start.y, v.x - A.start.x); A.toward = a;
    A.past = { x: v.x + Math.cos(a) * 14, y: v.y + Math.sin(a) * 14, z: v.z || 0 };
    A.facing = kind === 'front' ? f + Math.PI : kind === 'side' || kind === 'above' || kind === 'undertow' ? a : f;
    if (kind === 'undertow') { A.wet = { x: A.start.x, y: A.start.y, z: A.start.z }; }
    A.mark = !!v.mark;
  },
  post(A) { if (kind === 'back' && ch === 'sojiro' && (A.beat === 'grab' || A.beat === 'strike' || A.beat === 'hold')) return Rigs.mouthCover(1); if (kind === 'undertow' && A.beat !== 'sink') return Rigs.handsUp(.6); return null; },
  drawZ(A) { if (kind !== 'undertow') return undefined; return A.body.z - (A.beat === 'rise' ? 9 - 4 * A._u : 6); },
  at(A, b, u) {
    A._u = u;
    const st = { facing: A.facing }, vs = { facing: kind === 'undertow' ? A.toward + Math.PI : A.vic.facing }, V = { x: A.vic.x, y: A.vic.y, z: A.vic.z };
    const mv = MOVE_OF[kind] && MOVE_OF[kind][ch], fall = A.mark ? null : 1;
    const victimDown = uu => A.mark ? { pose: 'kneel', expr: 'wince' } : { down: E.ease.inQuad(uu), hurt: uu < .3, expr: 'wince' };
    const out = (pos, s, o) => Object.assign(pos, { state: Object.assign(st, s), other: Object.assign(V, o || {}, { state: Object.assign(vs, (o && o.s) || {}) }) });
    if (kind === 'back') {
      if (b === 'grab' || b === 'hop') return out(Object.assign(lp(A.from, A.behind, E.ease.outQuad(u)), b === 'hop' ? { z: A.behind.z + Math.sin(u * Math.PI) * 5 } : {}), { stance: 'ready', air: b === 'hop' }, { s: { expr: 'shout' } });
      if (b === 'strike' || b === 'strike2') return out(lp(A.behind, A.behind, 0), { attack: E.move('thrust', u) }, { s: { hurt: u > .4, expr: 'wince' } });
      if (b === 'hold') return out(lp(A.behind, A.behind, 0), { attack: E.move('thrust', 1, 'recover') }, { s: { hurt: true, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.behind, A.behind, 0), { attack: E.move(mv, 1, 'recover') }, { s: victimDown(u) });
      return out(lp(A.behind, A.behind, 0), { crouch: u < .6 }, { s: victimDown(1) });
    }
    if (kind === 'side') {
      if (b === 'dash') return out(lp(A.from, A.past, E.ease.inQuad(u) * .55), { sprint: true }, {});
      if (b === 'strike' || b === 'spin') return out(lp(A.from, A.past, .55 + .45 * E.ease.outQuad(u)), { attack: E.move(mv, u) }, { s: { hurt: u > .5, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.past, A.past, 0), { attack: E.move(mv, 1, 'recover'), facing: A.facing + Math.PI * Math.min(1, u * 1.5) }, { s: victimDown(u) });
      return out(lp(A.past, A.past, 0), { facing: A.facing + Math.PI }, { s: victimDown(1) });
    }
    if (kind === 'front') {
      if (b === 'step') return out(lp(A.from, A.front, E.ease.outQuad(u)), { stance: 'ready' }, {});
      if (b === 'rising' || b === 'xcut') return out(lp(A.front, A.front, 0), { attack: E.move(mv, u) }, { s: { hurt: u > .5, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.front, A.front, 0), { attack: E.move(mv, 1, 'recover') }, { x: A.vic.x - Math.cos(A.vic.facing) * 3 * u, y: A.vic.y - Math.sin(A.vic.facing) * 3 * u, s: victimDown(u) });
      return out(lp(A.front, A.front, 0), {}, { x: A.vic.x - Math.cos(A.vic.facing) * 3, y: A.vic.y - Math.sin(A.vic.facing) * 3, s: victimDown(1) });
    }
    if (kind === 'above') {
      if (b === 'leap') { const p = lp(A.from, A.behind, u); p.z = lerp(A.from.z, A.behind.z, u * u) + Math.sin(u * Math.PI) * 12; return out(p, { air: true, attack: E.move(mv, Math.min(1, u * .4), 'wind') }, {}); }
      if (b === 'strike') return out(lp(A.behind, A.behind, 0), { attack: E.move(mv, u), land: u < .25 ? 1 : 0 }, { s: { hurt: u > .3, expr: 'wince' } });
      if (b === 'drop') return out(lp(A.behind, A.behind, 0), { attack: E.move(mv, 1, 'recover') }, { s: victimDown(u) });
      return out(lp(A.behind, A.behind, 0), { crouch: u < .5 }, { s: victimDown(1) });
    }
    // undertow: the ninja rises out of the water, grabs the ankles and pulls the victim under
    if (b === 'rise') return out(lp(A.wet, A.wet, 0), { attack: E.move('claw', u, 'wind') }, {});
    if (b === 'grab') return out(lp(A.wet, A.wet, 0), { attack: E.move('claw', u) }, { s: { hurt: true, expr: 'shout' } });
    if (b === 'pull') return out(lp(A.wet, A.wet, 0), { attack: E.move('claw', 1, 'recover') }, { x: lerp(A.vic.x, A.wet.x, E.ease.inQuad(u)), y: lerp(A.vic.y, A.wet.y, E.ease.inQuad(u)), s: Object.assign(victimDown(u * .8), { air: true }) });
    return out(lp(A.wet, A.wet, 0), {}, { x: A.wet.x, y: A.wet.y, z: -8 * u, s: victimDown(1) });
  }
});
for (const k in CUT_BEATS) for (const ch of ['sojiro', 'kaede']) E.ACTIONS['cut_' + k + '_' + ch] = cutSpec(k, ch);
SilentCut.LABEL = CUT_LABEL;
B.SilentCut = SilentCut;

/* ---- 42-grapple.js ---- */
/* ---- THE GRAPPLING HOOK (kaginawa): the only way onto the roofs. Anchors are the edges of tops 16..96 above the feet
 * within 112 (the sliders), with a clear rope line and room to land, plus the level's tree anchors (a swing to a landing).
 * The best one in a 70° cone glints; tap R1 / G fires; hold to aim in slow motion; the mouse picks the one under it ---- */
const Grapple = { cands: [], best: null, scanT: 0, holdT: 0, aiming: false, cd: 0, rope: null };
/** the anchors in reach of a body: [{ x, y, z (the hook), land: { x, y, z }, d, tree }] */
Grapple.anchors = (h, M) => {
  const W = M.world, map = W.map, range = T('grappleRange'), rise = 96, out = [], cx0 = toCell(h.x), cy0 = toCell(h.y), R = Math.ceil(range / 16) + 1;
  const hand = { x: h.x, y: h.y, z: h.z + 28 };
  for (let cy = cy0 - R; cy <= cy0 + R; cy++) for (let cx = cx0 - R; cx <= cx0 + R; cx++) {
    if (cx < 0 || cy < 0 || cx >= W.w || cy >= W.h) continue;
    const ch = W.rows[cy][cx]; if (!WALLTYPES[ch] || ch === 'H' || ch === 'F' || ch === 'P') continue;
    const top = map.height(cx, cy); if (top - h.z < 16 || top - h.z > rise) continue;
    for (const [nx, ny] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {   // a face toward a lower neighbour, facing the hero
      const nh = map.height(cx + nx, cy + ny); if (nh >= top - 8) continue;
      const ex = cellC(cx) + nx * 8, ey = cellC(cy) + ny * 8;
      if ((h.x - ex) * nx + (h.y - ey) * ny < 0) continue;
      const d = Math.hypot(ex - h.x, ey - h.y); if (d > range || d < 6) continue;
      const land = { x: ex - nx * 6, y: ey - ny * 6, z: top };
      if (!map.standable(land.x, land.y, top, 4)) continue;
      const hook = { x: ex + nx * 1.5, y: ey + ny * 1.5, z: top + 2 };
      if (!map.ray(hand, hook).clear) continue;
      out.push({ x: ex, y: ey, z: top, land, d, nx, ny, cx, cy });
    }
  }
  for (const a of W.anchors) {   // a tree crown: the rope swings the hero to its landing
    const d = Math.hypot(a.x - h.x, a.y - h.y); if (d > range || a.z - h.z < 16) continue;
    const land = a.land || { x: a.x, y: a.y + 24, z: 0 };
    out.push({ x: a.x, y: a.y, z: a.z, land: { x: land.x, y: land.y, z: map.groundAt(land.x, land.y) }, d, tree: true });
  }
  return out;
};
/** pick the best anchor: the cursor's (mouse mode), else by angle to the facing (or aim) and distance, within 70° */
Grapple.pick = (h, it, list) => {
  if (!list.length) return null;
  if (it && it.mouseMode && game.input.pointer()) {
    const [px0, py0] = game.input.pointer(); let best = null, bd = 30;
    for (const a of list) if (a.sx !== undefined) { const d = Math.hypot(a.sx - px0, a.sy - py0); if (d < bd) { bd = d; best = a; } }
    if (best) return best;
  }
  let f = h.facing; const mv = it && it.move; if (mv && Math.hypot(mv[0], mv[1]) > .3) f = Math.atan2(mv[1], mv[0]);
  let best = null, bs = 1e9;
  for (const a of list) { const da = Math.abs(E.angDiff(f, Math.atan2(a.y - h.y, a.x - h.x))); if (da > 1.22) continue; const s = da * 60 + a.d * .5; if (s < bs) { bs = s; best = a; } }
  return best;
};
Grapple.update = (h, it, dt, M) => {
  Grapple.cd = Math.max(0, Grapple.cd - dt);
  if (h.swim || h.drag || h.dead || h.action) { Grapple.aiming = false; Grapple.cands = []; Grapple.best = null; return; }
  Grapple.scanT -= dt; if (it.grapplePressed) Grapple.scanT = 0;
  if (Grapple.scanT <= 0 || Grapple.aiming) { Grapple.scanT = .1; const old = Grapple.cands; Grapple.cands = Grapple.anchors(h, M); for (const a of Grapple.cands) { const o = old.find(q => q.x === a.x && q.y === a.y && q.z === a.z); if (o) { a.sx = o.sx; a.sy = o.sy; } } Grapple.best = Grapple.pick(h, it, Grapple.cands); }
  if (it.grapplePressed) { Grapple.holdT = 0; Grapple.down = true; }
  if (Grapple.down && it.grappleDown !== false && (it.grappleDown || !it.player)) { Grapple.holdT += dt / Math.max(.05, game.timeScale); if (Grapple.holdT > .22 && !Grapple.aiming && it.player) { Grapple.aiming = true; game.timeScale = .5; } }
  const release = Grapple.down && (it.grappleReleased || (!it.grappleDown && !Grapple.aiming));
  if (Grapple.aiming) Grapple.best = Grapple.pick(h, it, Grapple.cands);
  if (release) {
    Grapple.down = false;
    if (Grapple.aiming) { Grapple.aiming = false; if (!SilentCut.slowT) game.timeScale = (B.Dev && B.Dev.timeScale) || 1; }
    if (Grapple.best && Grapple.cd <= 0) Grapple.fire(h, Grapple.best, M);
  }
};
Grapple.fire = (h, a, M) => {
  const dist = Math.hypot(a.x - h.x, a.y - h.y, a.z - h.z), pull = Math.max(.15, dist / (T('grappleSpeed') * (h.C.pull || 1)));
  h.combo.cancel(); Hero.unhug(h); h.crouch = false;
  const act = h.play('grapple', { to: a, pull, map: M.world.map });
  Grapple.cd = .3; Au.sfx('grappleThrow');
  B.emit('grapple', { at: a });
  return act;
};
E.ACTIONS.grapple = {
  beats: [['throw', .16], ['pull', .5], ['mantle', .2]],
  setup(A) {
    const a = A.o.to; A.beats = [['throw', .16], ['pull', A.o.pull], [a.tree ? 'drop' : 'mantle', a.tree ? .35 : .2]];
    A.facing = Math.atan2(a.y - A.start.y, a.x - A.start.x); A.hook = { x: a.x + (a.nx || 0) * 1.5, y: a.y + (a.ny || 0) * 1.5, z: a.z + 2 };
    A.hang = a.tree ? { x: a.x, y: a.y, z: a.z - 22 } : { x: a.x + (a.nx || 0) * 5, y: a.y + (a.ny || 0) * 5, z: a.z - 22 };
    A.land = a.land; A.tree = !!a.tree; A.clinked = false;
  },
  post(A) { return A.beat === 'pull' ? Rigs.handsUp(1) : null; },
  at(A, b, u) {
    if (b === 'throw') return { x: A.start.x, y: A.start.y, z: A.start.z, state: { facing: A.facing, attack: E.move('throw', u) } };
    if (b === 'pull') {
      if (!A.clinked) { A.clinked = true; Au.sfx('grappleClink'); Au.sfx('grappleZip'); B.noise(A.hook.x, A.hook.y, A.hook.z, 30, 'hook'); }
      const p0 = A.start, p2 = A.hang, c = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2, z: Math.max(p0.z, p2.z) + 10 }, k = E.ease.inOutQuad(u), m = 1 - k;
      return { x: m * m * p0.x + 2 * m * k * c.x + k * k * p2.x, y: m * m * p0.y + 2 * m * k * c.y + k * k * p2.y, z: m * m * p0.z + 2 * m * k * c.z + k * k * p2.z, state: { facing: A.facing, air: true } };
    }
    if (b === 'drop') { const p = lp(A.hang, A.land, u); p.z = lerp(A.hang.z, A.land.z, u * u) + Math.sin(u * Math.PI) * 6; return Object.assign(p, { state: { facing: A.facing, air: true } }); }
    const up = Math.min(1, u * 1.6), p = lp(A.hang, A.land, E.ease.outQuad(u));
    p.z = lerp(A.hang.z, A.land.z, E.ease.outQuad(up));
    return Object.assign(p, { state: { facing: A.facing, hang: u < .45, hangZ: 22 * (1 - up), crouch: u >= .45 } });
  }
};
/** draw the rope (while thrown and pulling), the anchor glints and the aim mode's anchors */
Grapple.draw = (r, h) => {
  const a = h.action;
  if (a && a.name === 'grapple' && (a.beat === 'throw' || a.beat === 'pull')) {
    const hand = h.rig.hand('R'), hk = a.hook, u = a.beat === 'throw' ? a.t / .16 : 1;
    const end = { x: lerp(hand[0], hk.x, u), y: lerp(hand[1], hk.y, u), z: lerp(hand[2], hk.z, u) };
    r.queue((hand[0] + end.x) / 2, (hand[1] + end.y) / 2, Math.max(hand[2], end.z), g => {
      const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8, sag = Math.sin(k * Math.PI) * (a.beat === 'throw' ? 2 : 4) * (1 - (a.beat === 'pull' ? Math.min(1, (a.t - .16) / .25) : 0)); pts.push(r.w(lerp(hand[0], end.x, k), lerp(hand[1], end.y, k), lerp(hand[2], end.z, k) - sag)); }
      for (let i = 0; i < 8; i++) { px.line(g, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, '#2a2018'); px.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#c8b080'); }
      const q = pts[8]; px.dot(g, q[0], q[1], '#ffffff'); px.dot(g, q[0] + 1, q[1] - 1, '#d8dce8');
    }, { bias: 2 });
  }
  if (h.action || h.dead) return;
  const show = Grapple.aiming ? Grapple.cands : Grapple.best ? [Grapple.best] : [];
  for (const c of Grapple.cands) { const p = r.w(c.x, c.y, c.z); c.sx = p[0]; c.sy = p[1]; }
  for (const c of show) {
    const best = c === Grapple.best, s = best ? 3 + Math.round(Math.sin(game.real * 8)) : 2;
    r.queue(c.x, c.y, c.z + 1, g => { const p = r.w(c.x, c.y, c.z + 1), col = best ? '#ffe08a' : '#b8a060'; px.line(g, p[0] - s, p[1], p[0], p[1] - s, col); px.line(g, p[0], p[1] - s, p[0] + s, p[1], col); px.line(g, p[0] + s, p[1], p[0], p[1] + s, col); px.line(g, p[0], p[1] + s, p[0] - s, p[1], col); if (best) px.dot(g, p[0], p[1], '#ffffff'); }, { emissive: true, bias: 3 });
  }
};
B.Grapple = Grapple;

/* ---- 43-combat.js ---- */
/* ---- COMBAT: one damage pipeline for every body (multipliers, a frontal block, i-frames, death events), the hero's
 * combos and jump attack, the block, the timed parry and its riposte, and enemy strikes with visible wind-ups. Hits get
 * hit-stop, shake, sparks and ink, never damage numbers ---- */
const Combat = {};
/** B.damage(src, dst, amount, { kind, angle, silent, unblockable }) -> damage dealt */
B.damage = (src, dst, amount, o = {}) => {
  const M = B.M; if (!M || !dst || !dst.alive || dst.dead) return 0;
  if (dst.kind === 'hero') {
    if (M.cheats.god || (dst.action && dst.action.invulnerable) || dst.iframes > 0 || dst.action && /^cut_|grapple/.test(dst.action.name)) return 0;
    amount *= T('enemyDmg') * (o.kind === 'fall' || o.kind === 'drown' ? 1 / T('enemyDmg') : 1);
    const ang = o.angle !== undefined ? o.angle : src ? Math.atan2(dst.y - src.y, dst.x - src.x) : null;
    if (dst.blocking && ang !== null && !o.unblockable && Math.abs(E.angDiff(dst.facing, ang + Math.PI)) < Math.PI / 3) {
      amount *= 1 - dst.C.block; Au.sfx('clash'); Pt.sparks(dst.x, dst.y, dst.z + 18, 8, ang + Math.PI); game.shake(1.5); dst.blockFx = .2;
      if (amount < .5) return 0;
    } else if (!o.silent) { dst.hurtT = .4; game.freeze(.05); game.shake(4); Au.sfx('hurt', { vol: .7 }); B.Hud.pulse(); game.input.rumble && game.input.rumble(.5, .15); }
    if (!o.silent) dst.iframes = .4;
    dst.hp -= amount; M.stats.damageTaken += amount;
    if (game.settings.blood !== 'off' && !o.silent && amount > 3) Pt.bits(dst.x, dst.y, dst.z + 16, 5, ['#8a0a10', '#c81a20']);
    B.emit('damage', { src, dst, amount, kind: o.kind });
    if (dst.hp <= 0) { dst.hp = 0; dst.dead = true; dst.combo.cancel(); if (dst.drag) Hero.dropBody(dst, M); Au.sfx('die'); B.emit('heroDeath', { by: src, kind: o.kind }); }
    return amount;
  }
  // an enemy, a boss, a civilian or Tobei (a prisoner in his cage is nobody's target)
  if (dst.kind === 'escort' && dst.caged) return 0;
  if (src && src.kind === 'hero') { amount *= src.C.dmg; if (dst.kind === 'boss' && !['riposte', 'fire', 'plunge'].includes(o.kind)) amount *= .45; if (M.cheats.oneHit && dst.kind !== 'escort') amount = 9999; }
  if (dst.guardFront && src && Math.abs(E.angDiff(dst.facing, Math.atan2(src.y - dst.y, src.x - dst.x))) < dst.guardFront.arc && !o.unblockable) {
    amount *= 1 - dst.guardFront.k; Au.sfx('clash'); Pt.sparks(dst.x, dst.y, dst.z + 20, 8, Math.atan2(src.y - dst.y, src.x - dst.x)); if (amount < 1) { dst.blockFx = .25; return 0; }
  }
  dst.hp -= amount; dst.hurtT = .3; dst.flash = .12;
  const ang = src ? Math.atan2(dst.y - src.y, dst.x - src.x) : 0;
  game.freeze(o.kind === 'riposte' ? .12 : .05); game.shake(o.kind === 'fire' ? 5 : 2.5); Au.sfx('hit', { vol: .8 });
  Pt.impact && Pt.impact(dst.x, dst.y, dst.z + 18, 1, '#ffffff'); Pt.sparks(dst.x, dst.y, dst.z + 18, 6, ang);
  if (game.settings.blood !== 'off' && dst.kind !== 'spirit') { Pt.bits(dst.x, dst.y, dst.z + 16, 6, ['#8a0a10', '#c81a20', '#3a0406']); if (crand() < .4) M.world.decals.push({ kind: 'ink', x: dst.x + (crand() - .5) * 8, y: dst.y + (crand() - .5) * 8, r: 2 + crand() * 2, seed: crand() * 999 | 0 }); }
  if (dst.kind !== 'boss' && src && src.kind === 'hero' && E.knockback) E.knockback(src, dst, 60);
  if (dst.onHit) dst.onHit(src, amount, o);
  B.emit('damage', { src, dst, amount, kind: o.kind });
  if (dst.hp <= 0 && dst.alive) {
    dst.hp = 0;
    if (dst.onDeath && dst.onDeath(src, o) === false) return amount;
    dst.alive = false; dst.fighting = false; if (dst.atk && dst.atk.cancel) dst.atk.cancel();
    Au.sfx('die', { vol: .5 }); B.emit('kill', { victim: dst, how: o.kind || 'strike', by: src });
  }
  return amount;
};
/** the enemies a strike can hit: guards, civilians, the active boss and its summons */
Combat.targets = M => M.guards.concat(M.civs, M.bosses, M.summons || []).filter(e => e.alive && !e.cutBy && !e.sunk && e.kind !== 'escort' && !e.untouchable);
/** face the cursor (mouse mode) or the nearest enemy within 40 in front (auto-aim) */
Combat.faceTarget = (h, it, M) => {
  if (it && it.aimPoint && it.mouseMode) { h.facing = Math.atan2(it.aimPoint.y - h.y, it.aimPoint.x - h.x); return; }
  let f = h.facing; const mv = it && it.move; if (mv && Math.hypot(mv[0], mv[1]) > .3) f = Math.atan2(mv[1], mv[0]);
  let best = null, bd = 44; for (const e of Combat.targets(M)) { const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < bd && Math.abs(e.z - h.z) < 12 && Math.abs(E.angDiff(f, Math.atan2(e.y - h.y, e.x - h.x))) < 1.3) { bd = d; best = e; } }
  h.facing = best ? Math.atan2(best.y - h.y, best.x - h.x) : f;
};
/** the hero's combo: each swing hits each target once in its arc */
Combat.heroSwing = (h, dt, M) => {
  const ph = h.combo.update(dt);
  if (ph === 'active') { Au.sfx('swing', { vol: .5 }); B.noise(h.x, h.y, h.z, 25, 'swing'); }
  if (!h.combo.busy) return;
  const step = Math.max(0, h.combo.step), dmg = h.C.comboDmg[step] || 12, spin = h.combo.current && h.combo.current.spec && h.combo.current.spec.spin;
  h.combo.hits(Combat.targets(M), e => E.inArc(h, h.facing, e, spin ? 24 : 21, spin ? Math.PI : 1.3, 12), e => {
    if (e.kind === 'civ') M.stats.civiliansHarmed += e.hp > 0 && !e.harmed ? (e.harmed = 1) : 0;
    if (e.mind && e.mind.state !== 'alert' && e.kind !== 'boss') { e.mind.level = 1.2; e.mind.last = { x: h.x, y: h.y, z: h.z }; }
    B.damage(h, e, dmg, { kind: 'strike' });
  });
};
/** a jump attack lands: a plunge onto whatever is under the hero */
Combat.landAttack = (h, M) => {
  Pt.dust(h.x, h.y, h.z, 8); game.shake(2); Au.sfx('stomp', { vol: .5 });
  for (const e of Combat.targets(M)) if (Math.hypot(e.x - h.x, e.y - h.y) < 18 && Math.abs(e.z - h.z) < 10) B.damage(h, e, 20, { kind: 'plunge' });
};
/** the riposte: a staggered enemy in reach dies at once (a boss loses 60) */
Combat.riposteTarget = (h, M) => { for (const e of Combat.targets(M)) if (e.status && e.status.stagger > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 24 && Math.abs(e.z - h.z) < 10) return e; return null; };
Combat.tryRiposte = (h, M) => {
  const e = Combat.riposteTarget(h, M); if (!e) return false;
  h.facing = Math.atan2(e.y - h.y, e.x - h.x); h.combo.cancel(); h.combo.press();
  game.flash('#ffffff', .1, .6); B.Cam.cine(1.4, .4); Au.sfx('clash'); Au.sfx('cutTwang', { vol: .5 });
  e.status.stagger = 0;
  B.damage(h, e, e.kind === 'boss' ? 60 / h.C.dmg : 999, { kind: 'riposte', unblockable: true });
  B.emit('riposte', { victim: e });
  return true;
};
/** an enemy's swing reaches its strike: a parry (block pressed within the window), a block, or a hit */
Combat.enemyStrike = (e, dmg, o = {}) => {
  const M = B.M, h = M.hero; if (!h || h.dead) return false;
  const reach = o.reach || 22, arc = o.arc || 1.1, d = Math.hypot(h.x - e.x, h.y - e.y);
  if (d > reach || Math.abs(h.z - e.z) > 12 || Math.abs(E.angDiff(e.facing, Math.atan2(h.y - e.y, h.x - e.x))) > arc) return false;
  const facing = Math.abs(E.angDiff(h.facing, Math.atan2(e.y - h.y, e.x - h.x))) < 1.2;
  if (o.parry !== false && h.parryT <= T('parryWindow') && facing && !h.swim) {
    e.status.stagger = o.stagger || 1.3; if (e.atk && e.atk.cancel) e.atk.cancel();
    Au.sfx('parry'); game.flash('#ffffff', .08, .5); Pt.sparks(e.x, e.y, e.z + 20, 14, Math.atan2(e.y - h.y, e.x - h.x)); game.freeze(.08);
    B.Hud.toast('Parried', '{a:attack} Riposte'); B.emit('parry', { by: h, enemy: e }); h.parryT = 9;
    return true;
  }
  B.damage(e, h, dmg, { kind: o.kind || 'melee', angle: Math.atan2(h.y - e.y, h.x - e.x), unblockable: o.unblockable });
  if (o.knock && !h.action) E.knockback(e, h, o.knock);
  return true;
};
B.Combat = Combat;

/* ---- 44-tools.js ---- */
/* ---- TOOLS and THE BENTO: 10 tools packed into 8 compartments (2 tiers x 4). Food tools are eaten or left as bait;
 * steel tools are thrown, lobbed or dropped. Stock is unlimited; packing limits you. Thrown tools fly to the cursor
 * (mouse) or auto-aim at the nearest visible guard in a 45° cone, else 80 ahead ---- */
B.def('tool', 'riceball', { name: 'Rice Ball', icon: 'riceball', stack: 3, use: 'eat', desc: 'Eat it: +40 health. Takes a moment.', unlock: null });
B.def('tool', 'poisonball', { name: 'Poison Rice Ball', icon: 'poisonball', stack: 2, use: 'bait', range: 48, desc: 'Leave it where a hungry guard will find it.', unlock: null });
B.def('tool', 'dango', { name: 'Sleep Dango', icon: 'dango', stack: 2, use: 'bait', range: 48, desc: 'The eater sleeps 25 s. A front cut is easy.', unlock: { mission: 'm1', rank: 'Ekiben' } });
B.def('tool', 'plum', { name: 'Sour Plum', icon: 'plum', stack: 3, use: 'self', desc: 'Full stamina and soft steps for 20 s.', unlock: { mission: 'training', rank: 'Ekiben' } });
B.def('tool', 'shuriken', { name: 'Shuriken', icon: 'shuriken', stack: 10, use: 'throw', range: 160, desc: 'Thrown star: 8 damage. Turns a calm guard.', unlock: null });
B.def('tool', 'smoke', { name: 'Smoke Bomb', icon: 'smoke', stack: 2, use: 'lob', range: 96, desc: 'A cloud that blinds and hides. Block + use: at your feet.', unlock: null });
B.def('tool', 'caltrops', { name: 'Caltrops', icon: 'caltrops', stack: 2, use: 'drop', desc: 'Spikes at your feet: pursuers stumble and limp.', unlock: null });
B.def('tool', 'firecracker', { name: 'Firecracker', icon: 'firecracker', stack: 3, use: 'lob', range: 128, desc: 'Pops where it lands. Guards go to look.', unlock: null });
B.def('tool', 'firepot', { name: 'Fire Pot', icon: 'firepot', stack: 1, use: 'lob', range: 112, desc: 'Explodes: 45 damage around it. Very loud.', unlock: { mission: 'm2', rank: 'Makunouchi' } });
B.def('tool', 'cloak', { name: 'Straw Cloak', icon: 'cloak', stack: 1, use: 'self', desc: 'For 15 s eyes slide off you, unless you are close.', unlock: { mission: 'any', rank: 'Grand Kaiseki' } });
const TOOL_ORDER = ['riceball', 'poisonball', 'dango', 'plum', 'shuriken', 'smoke', 'caltrops', 'firecracker', 'firepot', 'cloak'];
const Tools = {};
/** where a thrown tool goes: the cursor (clamped to range), the nearest visible guard in a 45° cone, or 80 ahead */
Tools.aim = (h, it, range, M) => {
  if (it && it.aimPoint && it.mouseMode) { const dx = it.aimPoint.x - h.x, dy = it.aimPoint.y - h.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); return { x: h.x + dx * k, y: h.y + dy * k, z: M.world.map.groundAt(h.x + dx * k, h.y + dy * k) }; }
  let f = h.facing; const mv = it && it.move; if (mv && Math.hypot(mv[0], mv[1]) > .3) f = Math.atan2(mv[1], mv[0]);
  let best = null, bd = range;
  for (const g of M.guards) { if (!g.alive || g.vis === 'hidden') continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < bd && Math.abs(E.angDiff(f, Math.atan2(g.y - h.y, g.x - h.x))) < .4) { bd = d; best = g; } }
  if (best) { h.facing = Math.atan2(best.y - h.y, best.x - h.x); return { x: best.x, y: best.y, z: best.z, target: best }; }
  const d = Math.min(80, range); h.facing = f; const x = h.x + Math.cos(f) * d, y = h.y + Math.sin(f) * d; return { x, y, z: M.world.map.groundAt(x, y) };
};
Tools.use = (h, it, M) => {
  const slot = Hero.slot(h); if (!slot) { B.Hud.toast('The bento is empty', ''); return false; }
  const spec = B.get('tool', slot.tool); if (!spec) return false;
  if (h.swim && slot.tool !== 'riceball') { B.Hud.toast('Not in the water', 'Only food works while swimming.'); return false; }
  if (Tools.cd > game.time) return false;
  const id = slot.tool;
  if (id === 'riceball') { if (h.hp >= h.maxHp || h.eatT > 0) return false; if (!Hero.take(h, id)) return false; h.eatT = .6; Au.sfx('crunch'); }
  else if (id === 'plum') { if (!Hero.take(h, id)) return false; h.stamina = h.staminaMax; h.exhausted = false; h.softT = 20; Au.sfx('eat'); B.Hud.toast('Sour Plum', 'Soft steps for 20 seconds.'); }
  else if (id === 'cloak') { if (!Hero.take(h, id)) return false; h.cloakT = 15; Au.sfx('fusuma'); Pt.smoke(h.x, h.y, h.z + 10, 6, { color: '#c8b070' }); B.Hud.toast('Straw Cloak', 'Eyes slide off you for 15 seconds.'); }
  else if (id === 'poisonball' || id === 'dango') {
    if (!Hero.take(h, id)) return false;
    const at = it && it.aimPoint && it.mouseMode ? Tools.aim(h, it, 48, M) : { x: h.x + Math.cos(h.facing) * 10, y: h.y + Math.sin(h.facing) * 10, z: h.z };
    if (Math.hypot(at.x - h.x, at.y - h.y) > 16) Tools.lob(h, at, id, M); else Tools.placeBait(at.x, at.y, at.z, id, M);
    Au.sfx('pickup', { vol: .3 });
  } else if (id === 'shuriken') {
    if (!Hero.take(h, id)) return false;
    const at = Tools.aim(h, it, 160, M), a = Math.atan2(at.y - h.y, at.x - h.x); h.facing = a;
    M.shots.fire({ x: h.x + Math.cos(a) * 6, y: h.y + Math.sin(a) * 6, z: h.z + 20, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, vz: 0, r: 2, team: 'hero', color: '#d8dce8', life: 160 / 300, dmg: 8, tool: 'shuriken', from: { x: h.x, y: h.y, z: h.z } });
    h.combo.cancel(); h.throwT = .2; Au.sfx('shuriken'); B.noise(h.x, h.y, h.z, 15, 'throw');
  } else if (id === 'caltrops') { if (!Hero.take(h, id)) return false; M.traps.push({ x: h.x, y: h.y, z: h.z, r: 24, t: 20 }); Au.sfx('caltrops'); }
  else if (id === 'smoke' || id === 'firecracker' || id === 'firepot') {
    if (!Hero.take(h, id)) return false;
    const feet = id === 'smoke' && h.blocking, at = feet ? { x: h.x, y: h.y, z: h.z } : Tools.aim(h, it, spec.range, M);
    if (feet) Tools.effect(id, at, M); else Tools.lob(h, at, id, M);
    Au.sfx('whoosh', { vol: .4 });
  }
  Tools.cd = game.time + .25;
  B.emit('toolUsed', { tool: id });
  return true;
};
/** a lobbed body flying to a ground point (E.arc), with a trail */
Tools.lob = (h, at, id, M) => {
  const from = { x: h.x, y: h.y, z: h.z + 22 }, to = { x: at.x, y: at.y, z: at.z || 0 }, v = E.arc(from, to, 700, { apex: 24 });
  M.lobs.push({ id, x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, t: 0, tmax: v.t + .05, to });
};
Tools.placeBait = (x, y, z, id, M) => { M.baits.push({ id, x, y, z, kind: id === 'dango' ? 'sleep' : id === 'poisonball' ? 'poison' : 'food', taken: null, t: 0 }); };
/** a tool's effect where it lands */
Tools.effect = (id, at, M) => {
  const W = M.world;
  if (id === 'smoke') { M.clouds.push({ x: at.x, y: at.y, z: at.z || 0, r: 40, t: T('smokeTime'), t0: T('smokeTime') }); Au.sfx('smoke'); Pt.smoke(at.x, at.y, (at.z || 0) + 8, 26, { size: 3, color: '#a8a8b0' }); }
  else if (id === 'firecracker') { M.timers.push({ t: .8, fn: () => { Au.sfx('firecracker'); Pt.sparks(at.x, at.y, (at.z || 0) + 4, 16, -Math.PI / 2); Pt.glints(at.x, at.y, (at.z || 0) + 6, 10, '#ffd060'); W.dyn.push({ x: at.x, y: at.y, z: 8, r: 40, i: .7, t: .3, color: '#ffd060' }); B.noise(at.x, at.y, at.z || 0, 140, 'firecracker'); } }); Au.sfx('caltrops', { vol: .5 }); }
  else if (id === 'firepot') {
    Pt.explosion(at.x, at.y, (at.z || 0) + 6, 1.3); Pt.fire(at.x, at.y, (at.z || 0) + 4, 18, { size: 2 }); W.dyn.push({ x: at.x, y: at.y, z: 10, r: 80, i: 1, t: 1, color: '#ff8a30' });
    B.noise(at.x, at.y, at.z || 0, 220, 'explosion');
    for (const e of Combat.targets(M).concat([M.hero])) { const d = Math.hypot(e.x - at.x, e.y - at.y); if (d < 32 && Math.abs(e.z - (at.z || 0)) < 24) B.damage(M.hero, e, 45 / (e.kind === 'hero' ? 1 : M.hero.C.dmg), { kind: 'fire', unblockable: true }); }
  }
  else if (id === 'poisonball' || id === 'dango') Tools.placeBait(at.x, at.y, at.z || 0, id, M);
};
/** each step: lobs in flight, clouds, caltrops, bait, thrown stars, timed effects and dynamic lights */
Tools.update = (dt, M) => {
  const W = M.world;
  for (const l of M.lobs) {
    l.t += dt; l.vz -= 700 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    const gz = W.map.groundAt(l.x, l.y, 0, l.z + 4);
    if (crand() < .5) Pt.add({ kind: 'spark', x: l.x, y: l.y, z: l.z, life: .2, color: l.id === 'firepot' ? '#ff8a30' : '#c8c0b0' });
    if (l.z <= gz || l.t > l.tmax + .6) { l.done = true; Tools.effect(l.id, { x: l.x, y: l.y, z: Math.max(gz, 0) }, M); }
  }
  E.prune(M.lobs, l => l.done);
  for (const c of M.clouds) {
    c.t -= dt; if (crand() < dt * 8) Pt.smoke(c.x + (crand() - .5) * c.r, c.y + (crand() - .5) * c.r, c.z + 6, 2, { size: 3, color: '#9a9aa4' });
    for (const g of M.guards.concat(M.civs)) if (g.alive && g.mind && g.kind !== 'boss' && Math.hypot(g.x - c.x, g.y - c.y) < c.r && Math.abs(g.z - c.z) < 20) {   // blinded: a cough, and the hero is lost (searching at most)
      if (!(g.status.blind > 0)) { B.Voice.bark('*cough* *cough*', g.voice || 'guard', g.x, g.y, { force: true }); g.say = { text: '*cough* *cough*', t: 1.5 }; g.blindN = (g.blindN || 0) + 1; }
      g.status.blind = 1.5; if (g.mind.level > .64) g.mind.level = .64; if (g.mind.state === 'alert') { g.mind.state = 'search'; g.target = null; g.atk && g.atk.cancel && g.atk.cancel(); }
    }
  }
  E.prune(M.clouds, c => c.t <= 0);
  for (const tr of M.traps) {
    tr.t -= dt;
    for (const g of M.guards) if (g.alive && !g.cutBy && g.kind !== 'boss' && Math.hypot(g.x - tr.x, g.y - tr.y) < tr.r && Math.abs(g.z - tr.z) < 6 && !(g.status.caltrop > 0)) {
      g.status.caltrop = 8; g.status.stun = 2; g.status.limp = 6; B.damage(M.hero, g, 6 / M.hero.C.dmg, { kind: 'caltrops' }); B.Voice.bark('Agh! My feet!', g.voice || 'guard', g.x, g.y, { force: true });
    }
  }
  E.prune(M.traps, t => t.t <= 0);
  for (const tm of M.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
  E.prune(M.timers, t => t.done);
  for (const b of M.baits) b.t += dt;
  E.prune(M.baits, b => b.gone);
  for (const d of W.dyn) if (d.t !== undefined) d.t -= dt;
  E.prune(W.dyn, d => d.t !== undefined && d.t <= 0);
  M.shots.update(dt, W.map);
  M.shots.hit(Combat.targets(M), (b, t) => {
    if (b.tool === 'shuriken') { Au.sfx('thunk'); B.damage(M.hero, t, b.dmg / M.hero.C.dmg, { kind: 'shuriken' }); if (t.alive && t.mind && t.mind.state === 'calm') { t.mind.hear(.7, b.from); t.mind.level = Math.max(t.mind.level, .7); } B.emit('shurikenHit', { target: t }); }
  }, 'hero');
  if (M.hero && !M.hero.dead) M.shots.hit([M.hero], (b, t) => { Au.sfx('thunk'); B.damage(b.owner || null, t, b.dmg, { kind: b.kind || 'arrow', angle: Math.atan2(b.vy, b.vx) }); }, 'enemy');
  if (M.escort && M.escort.alive) M.shots.hit([M.escort], (b, t) => { B.damage(b.owner || null, t, b.dmg * .6, { kind: 'arrow' }); }, 'enemy');
};
Tools.draw = (r, M) => {
  for (const l of M.lobs) r.queue(l.x, l.y, l.z, g => { const p = r.w(l.x, l.y, l.z); px.disc(g, p[0], p[1], 2, l.id === 'firepot' ? '#5a3a20' : l.id === 'smoke' ? '#2a2a34' : l.id === 'firecracker' ? '#c8243a' : '#f4f0e6'); px.dot(g, p[0] - 1, p[1] - 1, '#ffffff'); });
  for (const b of M.baits) if (!b.gone) r.queue(b.x, b.y, b.z, g => { const p = r.w(b.x, b.y, b.z + 2); px.sprite(g, Art.icon[b.id === 'dango' ? 'dango' : b.id === 'poisonball' ? 'poisonball' : 'riceball'], p[0] - 6, p[1] - 10); });
  for (const tr of M.traps) r.decal(g => { for (let i = 0; i < 9; i++) { const a = i * 2.4, d = (i % 3 + 1) * 6, p = r.w(tr.x + Math.cos(a) * d, tr.y + Math.sin(a) * d, tr.z); px.dot(g, p[0], p[1], '#9a9aa8'); px.dot(g, p[0] + 1, p[1], '#5a5a68'); } });
  for (const c of M.clouds) { const k = clamp(c.t / Math.min(1.5, c.t0), 0, 1); r.queue(c.x, c.y, c.z + 10, g => { const p = r.w(c.x, c.y, c.z + 10); px.blend(g, .45 * k, 'normal', () => { px.disc(g, p[0], p[1], c.r * .9 * (game.zoom || 1), '#8a8a94'); px.disc(g, p[0] - 6, p[1] - 4, c.r * .6 * (game.zoom || 1), '#a8a8b2'); }); }, { bias: 4 }); }
  M.shots.draw(r);
};
/* ---- THE BENTO: 8 compartments; the mission's suggested loadout, the last one remembered, unlocks gate the shelf ---- */
const Bento = {};
Bento.unlocked = (id, save) => { const t = B.get('tool', id); if (!t || !t.unlock) return true; if (B.M && B.M.cheats && B.M.cheats.unlockAll) return true; return !!(save && save.tools && save.tools.includes(id)); };
Bento.fromHint = (hint, save) => {
  const out = []; for (const [tool, n] of hint || []) { if (!Bento.unlocked(tool, save)) continue; const st = B.get('tool', tool).stack; let left = n; while (left > 0 && out.length < 8) { out.push({ tool, n: Math.min(st, left) }); left -= st; } }
  while (out.length < 8) out.push(null);
  return out.slice(0, 8);
};
Bento.full = slots => slots.map(s => s && { tool: s.tool, n: B.get('tool', s.tool).stack });
Bento.copy = slots => slots.map(s => s && { tool: s.tool, n: s.n });
B.Tools = Tools; B.Bento = Bento; B.TOOL_ORDER = TOOL_ORDER;

/* ---- 50-perception.js ---- */
/* ---- PERCEPTION: noise and hearing, exposure (light x cover x motion x crouch), sight with a look-up limit and smoke,
 * hound smell, and the hero's own senses: Shadow Sight (guards the ninja can't see are hidden unless the Ki senses them)
 * and the Ki Gauge (0..99 for the nearest sensed guard, colored by awareness) ---- */
const Perception = { sightT: 0, ki: 0, kiState: 'calm', lightNow: 0, exp: 1 };
const SEE_MIN = .18;   // below this exposure a guard cannot make the shape out
const AWARE_COLOR = { calm: '#5ad8c8', notice: '#f0d050', search: '#f09040', alert: '#ff4a3a' };
const AWARE_RANK = { calm: 0, notice: 1, search: 2, alert: 3 };
/** a noise in the world: every guard, hound and civilian that hears it reacts (sleepers wake at .5) */
B.noise = (x, y, z, loud, kind = 'noise', src = null) => {
  const M = B.M; if (!M || loud <= 0) return;
  M.noises.push({ x, y, z, loud, kind, t: .8 });
  const n = { x, y, z, loud };
  for (const g of M.guards.concat(M.civs)) {
    if (!g.alive || g.cutBy || g.kind === 'boss' || g === src) continue;
    let s = E.hears(g, n, M.world.map) * T('hearing') * (g.A && g.A.hear || 1);
    if (s <= .15) continue;
    B.Brain.hear(g, s, n, kind, M);
  }
  B.emit('noise', { x, y, z, loud, kind });
};
/** the hero's exposure for guards' eyes: light x cover x motion x the crouch, 0 while diving */
Perception.exposure = (h, M) => {
  const W = M.world;
  if (M.cheats.invisible) return 0;
  if (h.dive) return 0;
  const L = W.lightAt(h.x, h.y, h.z); Perception.lightNow = L;
  const lightF = lerp(1 - T('darkness'), 1, L);
  let cover = 1;
  if (W.isHide(h.x, h.y, h.z)) cover = h.crouch ? .15 : .6;
  if (h.hug) cover = Math.min(cover, .6);
  if (h.swim) cover = Math.min(cover, .8);
  const sp = Math.hypot(h.vx, h.vy), motion = sp < 4 ? .75 : h.sprinting ? 1.3 : sp > 70 ? 1.15 : 1;
  let e = lightF * cover * motion * (h.crouch ? T('crouchVis') / .6 : 1);
  if (h.cloakT > 0 && !h.sprinting && !h.combo.busy) e *= .15;
  if (W.flash > 0) e = Math.min(1, e * 2);
  return clamp(e, 0, 1);
};
/** does guard g see body t now? { seen, exposure, d } with the look-up limit and smoke clouds */
Perception.sees = (g, t, M, o = {}) => {
  const W = M.world, heightened = M.heightened > 0 ? 1.2 : 1, range = T('sightRange') * (g.sightMul || 1) * heightened * (o.rangeMul || 1);
  const res = E.sees(g, t, { map: W.map, range, fov: T('sightFov') * (g.fovMul || 1), eye: g.eye });
  if (!res.seen) return res;
  // the look-up limit: a hero well above a guard's eyes, steeply, is out of view (archers and ninja look up)
  if (!(g.A && g.A.looksUp)) { const dz = (t.z || 0) + 22 - ((g.z || 0) + 30), d = Math.max(1, res.d); if (dz > 16 && Math.atan2(dz, d) > T('lookUp') * Math.PI / 180) return { seen: false, exposure: 0, d: res.d }; }
  // too faint to make out: a shape in the dark is not a ninja (yet)
  if (res.exposure < SEE_MIN) return { seen: false, exposure: 0, d: res.d };
  for (const c of M.clouds) if (segCircle(g.x, g.y, t.x, t.y, c.x, c.y, c.r * .85) || Math.hypot(g.x - c.x, g.y - c.y) < c.r * .85) return { seen: false, exposure: 0, d: res.d };
  return res;
};
const segCircle = (x0, y0, x1, y1, cx, cy, r) => { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, u = clamp(((cx - x0) * dx + (cy - y0) * dy) / l2, 0, 1), px2 = x0 + dx * u - cx, py2 = y0 + dy * u - cy; return px2 * px2 + py2 * py2 < r * r; };
/** the hero's senses, 20 times a second: each guard visible, sensed (the Ki) or hidden; the Ki number and its color */
Perception.update = (dt, M) => {
  const h = M.hero; if (!h) return;
  h.exposure = Perception.exposure(h, M); Perception.exp = h.exposure;
  Perception.sightT -= dt; if (Perception.sightT > 0) return; Perception.sightT = .05;
  const W = M.world, focus = !!M.focus, kiR = (focus ? 220 : T('kiRange')), reveal = game.settings.showAll || M.cheats.reveal || M.mode === 'attract';
  const eye = h.peek ? { x: h.x + h.peek[0] * 10, y: h.y + h.peek[1] * 10, z: h.z, eye: h.crouch ? 18 : 30 } : { x: h.x, y: h.y, z: h.drawZ !== undefined ? Math.max(0, h.drawZ + 8) : h.z, eye: h.crouch ? 18 : 30 };
  let K = 0, KS = 'calm';
  for (const g of M.guards.concat(M.civs, M.bosses)) {
    if (!g.alive && !Actor.isBody(g)) { g.vis = 'visible'; continue; }
    const d = Math.hypot(g.x - h.x, g.y - h.y);
    let vis = 'hidden';
    if (reveal || g.kind === 'boss') vis = 'visible';
    else if (d < 200 && W.map.sight(eye, g, { eye: eye.eye })) vis = 'visible';
    else if (d < 26) vis = 'visible';
    else if (d < kiR && g.alive) vis = 'sensed';
    g.vis = vis;
    if (g.alive && g.kind !== 'civ' && vis !== 'hidden' && d < kiR) {
      const k = Math.round(99 * (1 - d / kiR)); if (k > K) K = k;
      const st = g.mind ? g.mind.state : 'calm'; if (AWARE_RANK[st] > AWARE_RANK[KS]) KS = st;
    }
  }
  Perception.ki = K; Perception.kiState = KS;
};
Perception.COLOR = AWARE_COLOR; Perception.RANK = AWARE_RANK;
B.Perception = Perception;

/* ---- 51-guard-brain.js ---- */
/* ---- GUARD MINDS: a state machine on the engine's E.Suspicion (calm, notice, search, alert) with the game's own states
 * on top: patrol, post, sleep, chat, eating bait, stunned, blinded, poisoned, staggered, fleeing, returning, running for
 * the bell. Order each step: perceive -> mind -> behavior -> move (the shared flow fields on the nav map) -> rig ---- */
const Brain = {};
const BARK_CD = 2;
Brain.bark = (g, cat, force) => {
  const lines = (g.A && g.A.barks && g.A.barks[cat]) || B.Story.barks[cat]; if (!lines || !lines.length) return;
  if (!force && g.barkT > 0) return;
  const text = pickR(lines), len = B.Voice.bark(text, g.voice || 'guard', g.x, g.y, { pitch: g.pitch || 1, force });
  if (len || force) { g.say = { text, t: clamp((len || 1) + 1, 1.5, 2.5) }; g.barkT = BARK_CD + 1.5; }
};
/** a noise reached this guard with strength s */
Brain.hear = (g, s, n, kind, M) => {
  if (g.disguised && kind !== 'explosion') return;
  if (g.asleep || g.status.sleep > 0) { if (s > .5 || kind === 'bell' || kind === 'explosion') { g.asleep = false; g.status.sleep = 0; g.mind.level = Math.max(g.mind.level, .7); Brain.bark(g, 'notice'); } else return; }
  if (g.status.eat > 0 && s < .6) return;
  if (g.kind === 'civ') { if (s > .5 && (kind === 'explosion' || kind === 'shout' || kind === 'scream')) Brain.scare(g, n, M); return; }
  const at = n.target || { x: n.x, y: n.y, z: n.z };
  if (kind === 'shout' || kind === 'bell') { g.mind.hear(Math.max(.7, s), at); g.mind.level = Math.max(g.mind.level, .7); g.mind.last = { x: at.x, y: at.y, z: at.z }; return; }
  g.mind.hear(s, at);
  if (g.A && g.A.hound && s > .3 && g.mind.state !== 'alert') { Brain.houndBark(g, M); }
};
Brain.houndBark = (g, M) => { if (g.barkHT > 0) return; g.barkHT = 2.5; g.barking = .6; sfxAt('bark', g.x, g.y); B.noise(g.x, g.y, g.z, 150, 'bark', g); };
Brain.scare = (c, from, M) => {
  if (!c.alive || c.status.flee > 0 || c.disguised) return;
  c.status.flee = 9; c.mind.level = 1.2; Brain.bark(c, 'civilian', true); B.noise(c.x, c.y, c.z, 160, 'scream', c);
  let best = null, bd = 1e9; for (const g of M.guards) if (g.alive && g.kind !== 'hound') { const d = Math.hypot(g.x - c.x, g.y - c.y); if (d < bd) { bd = d; best = g; } }
  c.fleeTo = best ? { x: best.x, y: best.y, z: best.z } : { x: c.home.x, y: c.home.y, z: c.home.z };
  if (best && from) { best.mind.hear(.9, { x: from.x, y: from.y, z: from.z || 0 }); best.mind.level = Math.max(best.mind.level, .75); }
  B.emit('scream', { civ: c });
};
const ST_BARK = { notice: 'notice', search: 'search', alert: 'alert' };
Brain.update = (g, dt, M) => {
  const W = M.world, h = M.hero;
  if (g.cutBy) { g.rig.update(dt, g.cutBy.otherState()); return; }
  if (!g.alive) { if (g.dragged) g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.facing, down: 1 }); else g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.facing, down: g.marked ? 0 : 1, pose: g.marked ? 'kneel' : undefined }); return; }
  for (const k in g.status) if (g.status[k] > 0) g.status[k] = Math.max(0, g.status[k] - dt);
  g.barkT -= dt; g.barkHT = (g.barkHT || 0) - dt; g.hurtT = Math.max(0, g.hurtT - dt); g.flash = Math.max(0, g.flash - dt); g.atkCd = Math.max(0, (g.atkCd || 0) - dt);
  if (g.say) { g.say.t -= dt; if (g.say.t <= 0) g.say = null; }
  if (g.barking > 0) g.barking -= dt;
  if (g.lantern) W.dynStep.push({ x: g.x + Math.cos(g.facing) * 6, y: g.y + Math.sin(g.facing) * 6, z: g.z + 16, r: 48, i: .8, color: '#ffc070' });
  if (M.cheats.freezeAI) { g.vx = g.vy = 0; Brain.rig(g, dt); return; }
  if (g.dragged) return;
  // ---- incapacitated ----
  if (g.status.poison > 0) { g.update(dt, W.map, { move: [0, 0] }); if (g.status.poison <= dt * 1.01) { g.alive = false; g.hp = 0; Au.sfx('bodyDrop'); B.emit('kill', { victim: g, how: 'poison' }); } Brain.rig(g, dt, { hurt: true, expr: 'wince', pose: 'kneel' }); return; }
  if (g.asleep || g.status.sleep > 0) {
    g.snoreT = (g.snoreT || 0) - dt; if (g.snoreT <= 0) { g.snoreT = 3; sfxAt('snore', g.x, g.y, { vol: .6 }); B.noise(g.x, g.y, g.z, 20, 'snore', g); }
    g.update(dt, W.map, { move: [0, 0] }); g.rig._post = Rigs.sleeping(game.time + g.uid); g.rig.update(dt, g.rigState({ pose: 'kneel', crouch: true })); return;
  }
  if (g.status.stun > 0 || g.status.stagger > 0) { g.update(dt, W.map, { move: [0, 0] }); Brain.rig(g, dt, { hurt: g.status.stagger > 0 ? false : true, pose: g.status.stagger > 0 ? 'guard' : undefined }); return; }
  if (g.status.eat > 0) {
    g.update(dt, W.map, { move: [0, 0] }); if (crand() < dt * 2) sfxAt('crunch', g.x, g.y, { vol: .5 });
    if (g.status.eat <= dt * 1.01) Brain.ate(g, M);
    g.rig._post = Rigs.eating(game.time); g.rig.update(dt, g.rigState({ crouch: true })); return;
  }
  if (g.kind === 'civ') { B.Enemies.civUpdate(g, dt, M); return; }
  // ---- perceive: the hero (and Tobei on an escort) ----
  const A = g.A, blind = g.status.blind > 0;
  g.mind.rise = T('suspRise') * (A.notice || 1) * (M.heightened > 0 ? 1.3 : 1); g.mind.decay = T('suspDecay');
  let seen = { seen: false, exposure: 0 }, tgt = h;
  if (!blind && h && !h.dead && (!h.swim || !h.dive)) seen = Perception.sees(g, h, M);
  if (seen.seen && seen.exposure < .03) seen = { seen: false, exposure: 0, d: seen.d };
  if (!seen.seen && M.escort && M.escort.alive && !M.escort.caged && !blind) { const s2 = Perception.sees(g, M.escort, M); if (s2.seen && s2.exposure > .05) { seen = s2; tgt = M.escort; } }
  g.seesHero = seen.seen && tgt === h;
  if (A.hound && h && !h.dive && !blind) { const d = Math.hypot(h.x - g.x, h.y - g.y); if (d < (h.crouch ? 40 : 60) && Math.abs(h.z - g.z) < 30 && g.mind.state !== 'alert') { g.mind.hear(.8, { x: h.x, y: h.y, z: h.z }); Brain.houndBark(g, M); } }
  const was = g.mind.state;
  if (blind) { if (g.mind.level > .64) g.mind.level = .64; g.mind.update(dt, false, tgt); if (g.mind.level > .64) g.mind.level = .64; }
  else g.mind.update(dt, seen, tgt);
  const st = g.mind.state;
  if (seen.seen) g.target = tgt; else if (st !== 'alert') g.target = null;
  if (st !== was) {
    if (ST_BARK[st] && AWARE_RANK[st] > AWARE_RANK[was]) Brain.bark(g, ST_BARK[st], st === 'alert');
    if (st === 'calm' && was !== 'calm') { Brain.bark(g, 'lost'); g.returning = true; g.searchPts = null; }
    if (st === 'alert') Brain.onAlert(g, seen.seen && tgt === h, M);
    if (st === 'search') { g.searchT = 4; g.searchPts = null; }
  }
  // ---- bodies: a guard who sees one runs to it, shouts, and the level is heightened ----
  g.bodyT = (g.bodyT || 0) - dt;
  if (g.bodyT <= 0 && !blind) { g.bodyT = .3; Brain.lookForBodies(g, M); }
  // ---- behavior ----
  let goal = null, run = false, face = null, kind = A.climbs ? 'ninja' : 'walk';
  if (A.hound) kind = 'walk';
  if (g.bellRun && M.alarm.rung === 0) {
    const b = g.bellRun; goal = b; run = true;
    if (Math.hypot(b.x - g.x, b.y - g.y) < 16) { g.ringT = (g.ringT || 0) + dt; face = ANG(g, b); goal = null; if (crand() < dt * 6) sfxAt('bell', b.x, b.y, { vol: .25 }); if (g.ringT >= 1.5) { B.Alarm.ring(M, g); g.bellRun = null; g.ringT = 0; } }
  } else if (st === 'alert' && g.target) {
    const t = g.target, d = Math.hypot(t.x - g.x, t.y - g.y), same = Math.abs(t.z - g.z) < 12;
    g.lastSeenT = seen.seen ? 0 : (g.lastSeenT || 0) + dt;
    if (A.ranged === 'bow') { B.Enemies.archer(g, t, dt, M, seen.seen); face = ANG(g, t); if (d < 24 && same) { goal = { x: g.x - (t.x - g.x), y: g.y - (t.y - g.y), z: g.z }; run = true; } }
    else if (A.hound) { if (d < 18 && same) B.Enemies.melee(g, t, dt, M); else { goal = t; run = true; } }
    else {
      if (A.ranged === 'shuriken' && d > 40 && d < 120 && seen.seen) B.Enemies.ninjaThrow(g, t, dt, M);
      if (d < (A.reach || 20) + 2 && same) { B.Enemies.melee(g, t, dt, M); face = ANG(g, t); }
      else if (!(g.atk && g.atk.busy)) { goal = W.reachable(g, t, kind) ? t : null; run = true; face = goal ? null : ANG(g, t); if (!goal && g.mind.last) goal = null; }
    }
    if (g.atk && g.atk.busy) goal = null;
  } else if (st === 'alert') { goal = g.mind.last; run = true; }
  else if (st === 'search' && g.mind.last) {
    const L = g.mind.last, d = Math.hypot(L.x - g.x, L.y - g.y);
    if (!g.searchPts && d > 10 && W.reachable(g, L, kind)) { goal = L; run = M.heightened > 0; }
    else {
      g.searchT -= dt; g.lookA = (g.lookA || 0) + dt;
      if (!g.searchPts) g.searchPts = [];
      if (g.searchT > 0 && !g.searchPts.length) face = g.facing + Math.sin(g.lookA * 1.6) * dt * 2.2;
      else {
        if (!g.searchPts.length) { for (let i = 0; i < 3; i++) { const a = rand() * TAU, r2 = 24 + rand() * 48, p = { x: L.x + Math.cos(a) * r2, y: L.y + Math.sin(a) * r2, z: L.z || 0 }; if (W.map.standable(p.x, p.y, W.map.groundAt(p.x, p.y), 4) && W.reachable(g, p, kind)) g.searchPts.push(p); } if (!g.searchPts.length) g.searchPts.push({ x: L.x, y: L.y, z: L.z }); g.searchT = 99; }
        goal = g.searchPts[0]; if (Math.hypot(goal.x - g.x, goal.y - g.y) < 8) { g.searchPts.shift(); g.searchT = 1.5; if (!g.searchPts.length) g.searchPts = [{ x: L.x, y: L.y, z: L.z }]; goal = null; }
      }
    }
  } else if (st === 'notice' && g.mind.last) { face = ANG(g, g.mind.last); }
  else {
    // calm: the bait, then the mode's routine (or the walk back to it)
    const bait = Brain.seeBait(g, M);
    if (bait) { goal = bait; if (Math.hypot(bait.x - g.x, bait.y - g.y) < 9) { goal = null; bait.taken = g; g.bait = bait; g.status.eat = 2; Brain.bark(g, 'bait', true); } }
    else if (g.returning) { goal = g.route ? g.route[g.ri || 0] : g.home; if (!goal || Math.hypot(goal.x - g.x, goal.y - g.y) < 8) { g.returning = false; goal = null; } }
    else { const r2 = Brain.routine(g, dt, M); goal = r2.goal; face = r2.face; }
    if (!goal && !bait) { g.idleT = (g.idleT || 0) - dt; if (g.idleT <= 0) { g.idleT = 12 + rand() * 13; if (g.mode !== 'sleep') Brain.bark(g, g.mode === 'chat' ? 'chat' : 'idle'); } }
  }
  // ---- move along the nav map ----
  let move = [0, 0], jump = false;
  if (goal) { const s = W.steer(g, goal, kind, run ? 1 : .5); move = s.move; jump = s.jump; if (s.arrived) move = [0, 0]; }
  if (g.status.limp > 0) move = [move[0] * .5, move[1] * .5];
  if (face !== null && Math.hypot(move[0], move[1]) < .05) g.facing = E.approachAng(g.facing, face, dt * 5);
  g.walk = A.walk; g.run = A.run * (g.status.limp > 0 ? .5 : 1) * (M.heightened > 0 && run ? 1.05 : 1);
  g.update(dt, W.map, { move, sprint: false, crouch: false, jumpPressed: jump });
  if (g.inHazard) { g.inHazard = false; g.respawn(); }
  Brain.rig(g, dt);
};
Brain.rig = (g, dt, extra = {}) => {
  const alert = g.mind && g.mind.state === 'alert';
  if (g.A && g.A.hound) { g.rig.update(dt, { x: g.x, y: g.y, z: g.z, vx: g.vx, vy: g.vy, facing: g.facing, state: g.barking > 0 ? 'bark' : g.status.eat > 0 ? 'eat' : g.mind && g.mind.state === 'search' ? 'sniff' : 'walk', hurt: g.hurtT > 0 }); return; }
  g.rig._post = g.mode === 'chat' && g.mind && g.mind.state === 'calm' ? Rigs.chat(game.time + g.uid) : g.cower ? Rigs.cower(game.time) : null;
  g.rig.update(dt, g.rigState(Object.assign({ attack: g.atk && g.atk.busy ? g.atk.state : null, stance: alert ? 'ready' : null, hurt: g.hurtT > .1, point: !!g.drawing, aim: g.aimUp || 0 }, extra)));
};
/** the calm routine of a guard's mode: patrol waypoints (wait, look), a post's sweeping gaze, a chat, sleep */
Brain.routine = (g, dt, M) => {
  if (g.mode === 'patrol' && g.route && g.route.length) {
    const p = g.route[g.ri];
    if (Math.hypot(p.x - g.x, p.y - g.y) < 6) {
      g.wait = (g.wait === undefined ? p.wait || 0 : g.wait) - dt;
      if (g.wait > 0) return { goal: null, face: p.look !== undefined && p.look !== null ? p.look * Math.PI / 180 : null };
      g.wait = undefined; g.ri = (g.ri + 1) % g.route.length; if (!g.loop && g.ri === 0) g.route.reverse();
    }
    return { goal: g.route[g.ri], face: null };
  }
  const home = g.home;
  if (Math.hypot(home.x - g.x, home.y - g.y) > 8) return { goal: home, face: null };
  if (g.mode === 'post') return { goal: null, face: home.facing + Math.sin(game.time * Math.PI / 4 + g.uid) * Math.PI / 3 };
  if (g.mode === 'chat' && g.partner) { const p = M.guards.find(o => o.id === g.partner); if (p && p.alive) return { goal: null, face: ANG(g, p) }; }
  return { goal: null, face: home.facing };
};
Brain.seeBait = (g, M) => {
  if (!M.baits.length || g.A.noBait) return null;
  for (const b of M.baits) {
    if (b.taken || b.gone) continue;
    const d = Math.hypot(b.x - g.x, b.y - g.y);
    if (g.A.hound ? d < 120 : (d < T('baitRange') && E.sees(g, { x: b.x, y: b.y, z: b.z, chest: 2 }, { map: M.world.map, range: T('baitRange'), fov: T('sightFov') }).seen)) { if (M.world.reachable(g, b)) return b; }
  }
  return null;
};
Brain.ate = (g, M) => {
  const b = g.bait; if (!b) return; b.gone = true; g.bait = null;
  B.emit('baitEaten', { guard: g, kind: b.kind });
  if (b.kind === 'poison') { g.status.poison = 3; Brain.bark(g, 'poisoned', true); }
  else if (b.kind === 'sleep' || M.flags.sleepHerb) { g.status.sleep = 25; Brain.bark(g, 'sleepy', true); }
};
Brain.lookForBodies = (g, M) => {
  const W = M.world, R = T('bodyRange');
  for (const b of M.guards.concat(M.civs)) {
    if (b === g || !Actor.isBody(b) || b.hidden || b.sunk || b.found || b.marked || b.dragged && M.hero && M.hero.drag === b && false) continue;
    if (b.alive) continue;
    const d = Math.hypot(b.x - g.x, b.y - g.y); if (d > R) continue;
    if (W.isHide(b.x, b.y, b.z) || W.lightAt(b.x, b.y, b.z) < .3 || W.isDeep(b.x, b.y, b.z)) continue;
    const s = E.sees(g, { x: b.x, y: b.y, z: b.z, chest: 3, exposure: .5 + W.lightAt(b.x, b.y, b.z) * .5 }, { map: W.map, range: R, fov: T('sightFov') });
    if (!s.seen || s.exposure < .35) continue;
    b.found = true; g.mind.level = Math.max(g.mind.level, .9); g.mind.last = { x: b.x, y: b.y, z: b.z };
    Brain.bark(g, 'body', true); B.noise(g.x, g.y, g.z, T('alertShout'), 'shout', g);
    M.heightened = Math.max(M.heightened, 90);
    const bell = B.Alarm.nearestBell(g, M); if (bell && M.alarm.rung === 0 && !M.alarm.runner) { g.bellRun = bell; M.alarm.runner = g; }
    B.emit('bodyFound', { guard: g, body: b });
    return;
  }
};
Brain.onAlert = (g, sawHero, M) => {
  if (sawHero && M.detectCd <= 0) { M.stats.detections++; M.detectCd = 5; B.emit('detected', { guard: g }); }
  if (T('alertShout') > 0) { const t = g.target || M.hero; B.noise(g.x, g.y, g.z, T('alertShout'), 'shout', g); for (const o of M.guards) if (o !== g && o.alive && o.mind && Math.hypot(o.x - g.x, o.y - g.y) < T('alertShout')) { o.mind.last = { x: t.x, y: t.y, z: t.z }; } }
  const bell = B.Alarm.nearestBell(g, M);
  if (bell && M.alarm.rung === 0 && !M.alarm.runner && !g.A.ranged && !g.A.hound && (g.A.bellRunner || !M.guards.some(o => o.alive && o.A.bellRunner && Math.hypot(o.x - bell.x, o.y - bell.y) < 240))) { g.bellRun = bell; M.alarm.runner = g; Brain.bark(g, 'bell', true); }
  B.emit('alert', { guard: g });
};
/* ---- THE ALARM: a bell rung after 1.5 s; everyone searches; the level stays heightened; two waves at most ---- */
const Alarm = {};
Alarm.nearestBell = (g, M) => { let best = null, bd = 240; for (const b of M.bells) { const d = Math.hypot(b.x - g.x, b.y - g.y); if (d < bd) { bd = d; best = b; } } return best; };
Alarm.ring = (M, by) => {
  if (M.alarm.rung >= 2) return;
  M.alarm.rung++; M.alarm.runner = null; M.heightened = Infinity;
  const at = by && by.bellRun ? by.bellRun : by;
  Au.sfx('bell'); game.shake(2); B.Hud.toast('The alarm bell rings!', 'The garrison is roused.');
  const last = M.hero ? { x: M.hero.x, y: M.hero.y, z: M.hero.z } : at;
  for (const g of M.guards) if (g.alive && g.mind) { g.asleep = false; g.status.sleep = 0; g.mind.hear(1, last); g.mind.level = Math.max(g.mind.level, .7); g.mind.last = Object.assign({}, last); }
  B.noise(at.x, at.y, at.z || 0, 400, 'bell');
  M.timers.push({ t: T('reinforceDelay'), fn: () => B.Enemies.reinforce(M) });
  B.emit('bell', { by });
};
/** the runner dies before the ring: the bell stays silent */
B.on('kill', e => { const M = B.M; if (M && M.alarm && M.alarm.runner === e.victim) { M.alarm.runner = null; B.Hud.toast('The bell stays silent.', ''); } });
B.Brain = Brain; B.Alarm = Alarm;

/* ---- 52-enemies.js ---- */
/* ---- ENEMIES and CIVILIANS: archetypes as data (rig, health, speeds, sight, moves, ranged, climbing, barks), spawned
 * from a level's guard list. Melee swings telegraph with long wind-ups; archers draw 1.6 s with a glint; Red Lantern
 * ninja climb and leap and throw stars; hounds smell and bark; civilians scream and run; disguised Red Lanterns pass
 * for servants until you come close (only Ki Focus shows their red aura) ---- */
B.def('enemy', 'ashigaru', { rig: 'ashigaru', hp: 40, walk: 30, run: 70, sightMul: 1, fovMul: 1, moves: [['thrust', 12, .42, 24], ['overhead', 10, .5, 20]], reach: 20, voice: 'guard', label: 'Ashigaru', bellRunner: false });
B.def('enemy', 'samurai', { rig: 'samurai', hp: 70, walk: 32, run: 75, sightMul: 1.05, fovMul: 1, moves: [['slash', 16, .36, 22], ['overhead', 22, .5, 22]], reach: 20, block: .5, voice: 'guard', label: 'Samurai', bellRunner: true });
B.def('enemy', 'archer', { rig: 'archer', hp: 30, walk: 28, run: 65, sightMul: 1.25, fovMul: 1.3 / 1.5, looksUp: true, ranged: 'bow', moves: [['bash', 8, .4, 18]], reach: 16, voice: 'guard', label: 'Archer', post: true });
B.def('enemy', 'ninja', { rig: 'ninja', hp: 50, walk: 40, run: 95, sightMul: 1.1, fovMul: 1.7 / 1.5, looksUp: true, climbs: true, ranged: 'shuriken', notice: 1.3, moves: [['slash', 10, .28, 20], ['backslash', 10, .28, 20]], reach: 20, voice: 'hotaru', label: 'Red Lantern ninja', barks: null, pitch: .75 });
B.def('enemy', 'hound', { rig: 'hound', hp: 20, walk: 45, run: 120, sightMul: .8, fovMul: 1.8 / 1.5, hound: true, hear: 1.5, moves: [['bite', 8, .25, 16]], reach: 16, voice: 'guard', label: 'Hound' });
B.def('enemy', 'daikon', { rig: 'daikon', hp: 60, walk: 26, run: 55, sightMul: .9, fovMul: 1, moves: [['thrust', 0, .5, 20]], reach: 20, voice: 'gonroku', label: 'Big Daikon', noBait: false, pitch: 1.3 });
B.def('enemy', 'disciple', { rig: 'disciple', hp: 30, walk: 30, run: 70, sightMul: .95, fovMul: 1, moves: [['slash', 0, .5, 20]], reach: 20, voice: 'disciple', label: 'Disciple' });
B.def('enemy', 'civ', { rig: 'servant', hp: 15, walk: 25, run: 80, sightMul: .9, fovMul: 1.6 / 1.5, civ: true, voice: 'maid', label: 'Civilian' });
const CIV_RIG = { merchant: 'merchant', maid: 'maid', monk: 'monk', drunk: 'drunk', noble: 'noble', servant: 'servant', clerk: 'clerk', kanemori: 'kanemori', sakubei: 'sakubei' };
const CIV_VOICE = { merchant: 'guard', maid: 'maid', monk: 'guard', drunk: 'guard', noble: 'maid', servant: 'maid', clerk: 'guard', kanemori: 'kanemori', sakubei: 'sakubei' };
const Enemies = {};
/** spawn a guard from a level's spec: { id, type, at: [cx, cy], z, facing (deg), mode, lantern, route: [[cx, cy, wait, look]], loop, partner, faction, disguised } */
Enemies.spawn = (s, M, faction) => {
  const A = B.get('enemy', s.type) || B.get('enemy', 'ashigaru'), W = M.world, x = cellC(s.at[0]), y = cellC(s.at[1]);
  const z = s.z !== undefined ? s.z : W.map.groundAt(x, y);
  const fac = s.faction || faction || 'kanemori';
  const rig = A.hound ? new Hound() : Rigs.make(A.rig, A.rig === 'disciple' ? s.color || '#3e5a32' : fac);
  const g = Actor.make({ kind: A.hound ? 'hound' : 'guard', id: s.id, x, y, z, facing: (s.facing || 0) * Math.PI / 180, hp: Math.round(A.hp * T('enemyHp')), rig,
    body: { walk: A.walk, run: A.run, climbMax: A.climbs ? 56 : 30, hopMax: A.climbs ? 64 : 34, jumpSpeed: A.climbs ? 250 : 200 } });
  Object.assign(g, { A, type: s.type, mode: s.mode || 'post', lantern: !!s.lantern, faction: fac, voice: A.voice, pitch: A.pitch || (.9 + ((g.uid * 37) % 30) / 100),
    mind: new E.Suspicion({ rise: T('suspRise'), decay: T('suspDecay'), forget: 7 }), home: { x, y, z, facing: (s.facing || 0) * Math.PI / 180 }, ri: 0, loop: s.loop !== false,
    route: s.route ? s.route.map(([cx, cy, wait, look]) => ({ x: cellC(cx), y: cellC(cy), z: W.map.groundAt(cellC(cx), cellC(cy)), wait: wait || 0, look: look === undefined ? null : look })) : null,
    partner: s.partner || null, sightMul: A.sightMul * (s.lantern ? 1.08 : 1), fovMul: A.fovMul, barkT: 1 + rand() * 4, idleT: 4 + rand() * 10, mark: !!s.mark, spec: s, target: null });
  if (s.mode === 'sleep') g.asleep = true;
  if (A.block) g.guardFront = { arc: 1, k: A.block };
  if (g.mode === 'patrol' && !g.route) g.mode = 'post';
  if (A.civ) Object.assign(g, { kind: 'civ', civType: s.type, team: 'civ' });
  return g;
};
Enemies.spawnCiv = (s, M) => {
  const W = M.world, x = cellC(s.at[0]), y = cellC(s.at[1]), z = s.z !== undefined ? s.z : W.map.groundAt(x, y), A = B.get('enemy', 'civ');
  const rigId = CIV_RIG[s.type] || 'servant';
  const c = Actor.make({ kind: 'civ', id: s.id, x, y, z, facing: (s.facing || 0) * Math.PI / 180, hp: A.hp, rig: Rigs.make(rigId, s.i || 0), team: 'civ', body: { walk: 25, run: 80 } });
  Object.assign(c, { A, civType: s.type, mode: s.mode || 'idle', voice: CIV_VOICE[s.type] || 'maid', mind: new E.Suspicion({ rise: T('suspRise') * 1.5, decay: .4, forget: 5 }), home: { x, y, z, facing: c.facing },
    route: s.route ? s.route.map(([cx, cy, wait]) => ({ x: cellC(cx), y: cellC(cy), z: 0, wait: wait || 2 })) : null, ri: 0, loop: true, disguised: !!s.disguised, target: s.target || false, barkT: 3, idleT: 6 + rand() * 8, spec: s, cowers: !!s.cowers, label: s.label });
  return c;
};
/** a melee enemy in reach: wind up (visible, longer than the hero's), then strike at the active moment */
Enemies.melee = (g, t, dt, M) => {
  g.fighting = true;
  if (!g.atk || !g.atk.busy) {
    if (g.atkCd > 0) return;
    const mv = g.A.moves[Math.floor(rand() * g.A.moves.length)], [name, dmg, wind, reach] = mv;
    const base = E.MOVES[name] || E.MOVES.slash;
    g.atk = new E.Attack(name === 'bite' ? 'thrust' : name, { wind: wind * T('enemyWindup'), recover: (base.recover || .3) * 1.4 });
    g.atk.dmg = dmg; g.atk.reach = reach; g.atk.start(); g.facing = ANG(g, t); g.atkCd = .5 + rand() * .7;
    sfxAt('swing', g.x, g.y, { vol: .4, pitch: .8 });
    if (name === 'overhead' || name === 'slash') B.Hud.telegraph(g, reach, 1.1, wind * T('enemyWindup'));
  }
  const ph = g.atk.update(dt);
  if (g.atk.phase === 'wind') g.facing = E.approachAng(g.facing, ANG(g, t), dt * 3);
  if (ph === 'active') {
    if (t.kind === 'hero') Combat.enemyStrike(g, g.atk.dmg, { reach: g.atk.reach + 4, arc: 1.1 });
    else if (Math.hypot(t.x - g.x, t.y - g.y) < g.atk.reach + 4) B.damage(g, t, g.atk.dmg * .7, { kind: 'melee' });
  }
};
/** an archer: draw 1.6 s (the point pose, a glint), loose an arrow at the target's chest, with a clear line */
Enemies.archer = (g, t, dt, M, seen) => {
  const W = M.world, d = Math.hypot(t.x - g.x, t.y - g.y);
  if (!seen || d > 230) { g.drawing = false; g.drawT = 0; return; }
  if (!W.map.sight(g, t)) { g.drawing = false; g.drawT = 0; return; }
  if (!g.drawing) { g.drawing = true; g.drawT = 0; sfxAt('bowDraw', g.x, g.y); }
  g.drawT += dt; g.aimUp = Math.atan2((t.z + 20) - (g.z + 26), Math.max(1, d));
  if (g.drawT >= 1.6 * T('enemyWindup')) {
    g.drawing = false; g.drawT = 0; g.atkCd = 1.2;
    const lead = .25, tx = t.x + (t.vx || 0) * lead * d / 260, ty = t.y + (t.vy || 0) * lead * d / 260, a = Math.atan2(ty - g.y, tx - g.x), dd = Math.hypot(tx - g.x, ty - g.y) || 1, tt = dd / 260;
    M.shots.fire({ x: g.x + Math.cos(a) * 6, y: g.y + Math.sin(a) * 6, z: g.z + 26, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, vz: ((t.z + 20) - (g.z + 26)) / tt, r: 2.5, team: 'enemy', color: '#e8dcc0', life: 1.2, dmg: 14, owner: g, kind: 'arrow' });
    sfxAt('arrow', g.x, g.y);
  }
};
/** a Red Lantern ninja at range: a fan of three stars every few seconds */
Enemies.ninjaThrow = (g, t, dt, M) => {
  g.throwT = (g.throwT || 2) - dt; if (g.throwT > 0) return; g.throwT = 3 + rand() * 1.5;
  const a = ANG(g, t);
  for (const k of [-1, 0, 1]) { const b = a + k * .14; M.shots.fire({ x: g.x, y: g.y, z: g.z + 20, vx: Math.cos(b) * 220, vy: Math.sin(b) * 220, vz: 0, r: 2, team: 'enemy', color: '#c8ccd8', life: .7, dmg: 6, owner: g, kind: 'shuriken' }); }
  sfxAt('shuriken', g.x, g.y); g.facing = a;
};
/** civilians: idle, wander or sit; seeing the hero or a body: a scream, then a run to the nearest guard */
Enemies.civUpdate = (c, dt, M) => {
  const W = M.world, h = M.hero;
  if (c.disguised && h && Math.hypot(h.x - c.x, h.y - c.y) < 24 && Math.abs(h.z - c.z) < 10 && !h.action) { Enemies.unmask(c, M); return; }
  let move = [0, 0], face = null;
  if (!c.disguised && !c.cowers) {
    const seen = h && !h.dead ? Perception.sees(c, h, M) : { seen: false };
    const armed = h && (h.combo.busy || h.drag);
    c.mind.update(dt, seen.seen ? Object.assign({}, seen, { exposure: seen.exposure * (armed ? 2 : 1) }) : seen, h);
    if (c.mind.state === 'alert' && !(c.status.flee > 0) && c.civType !== 'kanemori' && c.civType !== 'sakubei') Brain.scare(c, h, M);
    if (!(c.status.flee > 0)) for (const b of M.guards) if (!b.alive && !b.hidden && !b.sunk && !b.marked && Math.hypot(b.x - c.x, b.y - c.y) < 70 && W.map.sight(c, b)) { Brain.scare(c, b, M); break; }
  }
  if (c.status.flee > 0 && c.fleeTo) { const s = W.steer(c, c.fleeTo, 'walk', 1); move = s.move; c.cower = false; }
  else if (c.cowerAt) { const s = W.steer(c, c.cowerAt, 'walk', 1); move = s.move; c.cower = s.arrived || Math.hypot(c.cowerAt.x - c.x, c.cowerAt.y - c.y) < 10; if (c.cower && h) face = ANG(c, h); }
  else if (c.route) { const p = c.route[c.ri]; if (Math.hypot(p.x - c.x, p.y - c.y) < 6) { c.wait = (c.wait === undefined ? p.wait : c.wait) - dt; if (c.wait <= 0) { c.wait = undefined; c.ri = (c.ri + 1) % c.route.length; } } else move = W.steer(c, p, 'walk', .5).move; }
  else if (Math.hypot(c.home.x - c.x, c.home.y - c.y) > 8) move = W.steer(c, c.home, 'walk', .5).move;
  else face = c.home.facing;
  if (face !== null) c.facing = E.approachAng(c.facing, face, dt * 4);
  c.idleT -= dt; if (c.idleT <= 0 && !(c.status.flee > 0)) { c.idleT = 10 + rand() * 12; Brain.bark(c, c.civType === 'drunk' ? 'drunk' : c.civType === 'kanemori' ? 'kanemori' : 'civIdle'); }
  if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
  c.barkT -= dt;
  c.update(dt, W.map, { move });
  c.rig._post = c.cower ? Rigs.cower(game.time) : c.mode === 'sit' ? null : null;
  c.rig.update(dt, c.rigState({ crouch: c.cower || c.mode === 'sit' ? true : undefined, pose: c.mode === 'sit' && !c.status.flee ? 'kneel' : c.civType === 'drunk' && !c.status.flee ? undefined : undefined, hurt: c.hurtT > 0, expr: c.status.flee > 0 ? 'shout' : undefined }));
};
/** a disguised Red Lantern drops the servant's look: now a ninja, and alert */
Enemies.unmask = (c, M) => {
  const i = M.civs.indexOf(c); if (i >= 0) M.civs.splice(i, 1);
  const A = B.get('enemy', 'ninja'), rig = Rigs.make('ninja');
  Object.assign(c, { kind: 'guard', A, type: 'ninja', rig, disguised: false, unmasked: true, team: 'enemy', hp: Math.round(A.hp * T('enemyHp')), voice: A.voice, pitch: .75, mode: 'post', sightMul: A.sightMul, fovMul: A.fovMul, climbMax: 56, hopMax: 64, walk: A.walk, run: A.run, lantern: false, route: null });
  c.mind = new E.Suspicion({ rise: T('suspRise'), decay: T('suspDecay'), forget: 7 }); c.mind.level = 1.2; c.mind.state = 'alert'; c.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; c.target = M.hero;
  c.status = {}; Pt.smoke(c.x, c.y, c.z + 14, 12, { size: 2, color: '#6a1a1a' }); Au.sfx('vanish'); Brain.bark(c, 'unmask', true);
  M.guards.push(c); B.emit('unmask', { guard: c });
};
/** reinforcements: a samurai and an ashigaru of the level's faction from the nearest barracks door */
Enemies.reinforce = M => {
  if (!M.barracks.length || !M.hero) return;
  let best = M.barracks[0], bd = 1e9; for (const b of M.barracks) { const d = Math.hypot(b.x - M.hero.x, b.y - M.hero.y); if (d < bd) { bd = d; best = b; } }
  const cx = toCell(best.x), cy = toCell(best.y), f = M.level.faction;
  for (const [type, k] of [['samurai', 0], ['ashigaru', 1]]) {
    const g = Enemies.spawn({ id: 'r' + M.guards.length, type, at: [cx + k, cy], mode: 'post', facing: 90 }, M, f);
    g.mind.level = .8; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; M.guards.push(g);
  }
  B.Hud.toast('Reinforcements!', 'Fresh guards pour out of the barracks.'); sfxAt('gate', best.x, best.y); B.emit('reinforce', {});
};
B.Enemies = Enemies;

/* ---- 53-bosses.js ---- */
/* ---- BOSSES: a body with health, phases at health fractions and a move set picked by distance and phase. Every move
 * telegraphs (a wind-up pose, a red ground arc or ring, a sound). No stealth kills; parries work where noted. Brother
 * Ittetsu (the sparring lesson), Gonroku the Iron Ox, Hotaru of the Red Lantern, Chamberlain Kurogane and his oni mask ---- */
const Bosses = {};
const mv = (o) => Object.assign({ wind: .5, active: .2, recover: .5, range: 30, min: 0, weight: 1, phase: 0 }, o);
B.def('boss', 'ittetsu', { name: 'Brother Ittetsu', title: 'The Bokken Monk', rig: 'ittetsu', hp: 120, voice: 'ittetsu', walk: 30, run: 60, phases: [], spar: true,
  moves: [mv({ name: 'overhead', anim: 'overhead', wind: .75, dmg: 12, range: 24, parry: true, arc: 1, lesson: 'parry' }), mv({ name: 'thrust', anim: 'thrust', wind: .55, dmg: 10, range: 40, lunge: 140, arc: .6, lesson: 'dodge', parry: false }),
    mv({ name: 'combo', anim: 'slash', wind: .45, dmg: 6, range: 24, hits: 3, gap: .32, arc: 1.2, lesson: 'block', parry: true })] });
B.def('boss', 'gonroku', { name: 'Gonroku', title: 'The Iron Ox', rig: 'gonroku', hp: 300, voice: 'gonroku', walk: 34, run: 70, phases: [.5],
  moves: [mv({ name: 'smash', anim: 'overhead', wind: .55, dmg: 30, range: 30, arc: .55, stuck: 1.2, parry: false, decal: 'arc' }), mv({ name: 'sweep', anim: 'spin', wind: .4, dmg: 20, range: 30, arc: 1.05, parry: true, decal: 'arc' }),
    mv({ name: 'charge', anim: 'twohand', wind: .6, dmg: 24, range: 160, min: 50, charge: 160, dur: 1, parry: false, decal: 'line' }), mv({ name: 'quake', anim: 'overhead', wind: .7, dmg: 18, range: 70, ring: 60, phase: 1, parry: false, decal: 'ring', weight: 1.4 })] });
B.def('boss', 'hotaru', { name: 'Hotaru', title: 'Of the Red Lantern', rig: 'hotaru', hp: 220, voice: 'hotaru', walk: 50, run: 110, phases: [.5], climbs: false,
  moves: [mv({ name: 'fan', anim: 'throw', wind: .4, dmg: 7, range: 140, min: 30, stars: 4, parry: false }), mv({ name: 'dash', anim: 'slash', wind: .3, dmg: 14, range: 90, min: 0, lunge: 220, parry: true, arc: .8, decal: 'line' }),
    mv({ name: 'vanish', anim: 'cast', wind: .25, dmg: 16, range: 200, vanish: 1.2, parry: true, weight: .8 }), mv({ name: 'clones', anim: 'cast', wind: .5, range: 300, phase: 1, clones: 2, weight: .6, once: 8 })] });
B.def('boss', 'kurogane', { name: 'Chamberlain Kurogane', title: 'The Iron Seal', rig: 'kurogane', hp: 420, voice: 'kurogane', walk: 30, run: 66, phases: [.5],
  moves: [mv({ name: 'threecut', anim: 'slash', wind: .45, dmg: 14, range: 30, hits: 3, gap: .3, arc: 1.1, parry: true, decal: 'arc' }), mv({ name: 'lunge', anim: 'thrust', wind: .55, dmg: 22, range: 70, min: 25, lunge: 180, arc: .6, parry: true, decal: 'line' }),
    mv({ name: 'ironguard', anim: 'block', wind: .2, guard: 2, range: 60, parry: false, weight: .6, p0: true }),
    mv({ name: 'flame', anim: 'overhead', wind: .6, dmg: 12, range: 90, phase: 1, flame: 3, decal: 'line' }), mv({ name: 'volley', anim: 'cast', wind: .6, dmg: 15, range: 220, min: 40, phase: 1, balls: 3 }),
    mv({ name: 'roar', anim: 'cast', wind: .6, range: 44, ring: 40, phase: 1, roar: true, decal: 'ring' }), mv({ name: 'spirits', anim: 'cast', wind: .7, range: 300, phase: 1, spirits: 2, weight: .5, once: 12 })] });
/** spawn the boss of a level spec: { id, at: [cx, cy], z, arena: [cx0, cy0, cx1, cy1] } */
Bosses.spawn = (spec, M) => {
  const D = B.get('boss', spec.id), W = M.world, x = cellC(spec.at[0]), y = cellC(spec.at[1]), z = spec.z !== undefined ? spec.z : W.map.groundAt(x, y);
  const b = Actor.make({ kind: 'boss', id: spec.id, x, y, z, facing: (spec.facing || 90) * Math.PI / 180, hp: Math.round(D.hp * T('enemyHp')), rig: Rigs.make(D.rig), body: { walk: D.walk, run: D.run, climbMax: 20, hopMax: 20 } });
  Object.assign(b, { D, spec, A: { label: D.name }, voice: D.voice, phase: 0, active: false, cool: 1.2, move: null, mt: 0, used: {}, alive: true, home: { x, y, z }, mind: null, guardT: 0, defeated: false,
    arena: spec.arena ? { x0: spec.arena[0] * T16, y0: spec.arena[1] * T16, x1: (spec.arena[2] + 1) * T16, y1: (spec.arena[3] + 1) * T16 } : null });
  b.onDeath = (src, o) => Bosses.defeat(b, M);
  b.onHit = () => { if (b.move && b.move.def.name === 'vanish' && b.vanished) return; };
  return b;
};
/** the fight begins: walls close, the camera pans to the boss, the name card, a line, the boss song */
Bosses.start = (b, M) => {
  if (b.active || b.defeated) return;
  b.active = true; M.bossFight = b; B.emit('boss', { boss: b, phase: 'start' });
  const L = M.level.boss || {};
  for (const c of L.close || []) M.world.setCells(c[0], c[1], c[2], c[3], c[4] || '#');
  B.Music.play('boss', { fade: .5 }); Au.tempo && Au.tempo(b.id === 'kurogane' ? 148 : b.id === 'hotaru' ? 144 : 132);
  B.Hud.bossCard(b.D.name, b.D.title);
  if (M.mode !== 'attract' && M.mode !== 'hub') {
    M.cine = 2.2; B.Cam.override = { x: b.x, y: b.y, z: b.z + 20 }; B.Cam.cine(1.35, 2);
    M.timers.push({ t: 2.2, fn: () => { B.Cam.override = null; } });
  }
  const line = B.Story.lines[b.id + '_intro']; if (line) B.Cutscene.bark(b, line, b.voice);
};
Bosses.update = (b, dt, M) => {
  const h = M.hero, W = M.world;
  b.hurtT = Math.max(0, b.hurtT - dt); b.flash = Math.max(0, b.flash - dt);
  for (const k in b.status) if (b.status[k] > 0) b.status[k] = Math.max(0, b.status[k] - dt);
  if (b.say) { b.say.t -= dt; if (b.say.t <= 0) b.say = null; }
  if (b.D.spar && b.defeated) { b.update(dt, W.map, { move: [0, 0] }); b.rig.update(dt, b.rigState({ pose: 'kneel' })); return; }
  if (!b.alive) { b.rig.update(dt, { x: b.x, y: b.y, z: b.z, facing: b.facing, down: 1 }); return; }
  if (!b.active || M.cine > 0 || M.cheats.freezeAI || !h) { b.update(dt, W.map, { move: [0, 0] }); if (h && b.active) b.facing = E.approachAng(b.facing, ANG(b, h), dt * 2); Bosses.rig(b, dt); return; }
  // phases at health fractions
  const fr = b.hp / b.maxHp; while (b.phase < b.D.phases.length && fr <= b.D.phases[b.phase]) { b.phase++; Bosses.phase(b, M); }
  if (b.status.stagger > 0 || b.status.stun > 0) { b.move = null; b.update(dt, W.map, { move: [0, 0] }); Bosses.rig(b, dt, { hurt: true }); return; }
  b.guardFront = b.guardT > 0 ? { arc: 1.4, k: 1 } : null; b.guardT = Math.max(0, b.guardT - dt);
  const d = Math.hypot(h.x - b.x, h.y - b.y);
  let move = [0, 0];
  if (!b.move) {
    b.cool -= dt;
    // close in (or keep distance for ranged moves); pick a move when cool
    const want = b.D.id === 'hotaru' ? 50 : 22;
    if (d > want + 6 && !h.dead) { const s = W.steer(b, h, 'walk', d > 90 ? 1 : .5); move = s.move; }
    b.facing = E.approachAng(b.facing, ANG(b, h), dt * 4);
    if (b.cool <= 0 && !h.dead) Bosses.pick(b, d, M);
  } else move = Bosses.runMove(b, dt, d, M) || [0, 0];
  if (b.arena && !b.vanished) { b.x = clamp(b.x, b.arena.x0 + 6, b.arena.x1 - 6); b.y = clamp(b.y, b.arena.y0 + 6, b.arena.y1 - 6); }
  if (!b.vanished) b.update(dt, W.map, { move });
  Bosses.rig(b, dt);
};
Bosses.rig = (b, dt, extra = {}) => {
  const m = b.move, anim = m && m.def.anim, st = {};
  if (m && anim && anim !== 'block' && anim !== 'cast' && anim !== 'throw') { const ph = m.ph === 'wind' ? 'wind' : m.ph === 'active' ? 'active' : 'recover'; st.attack = E.move(anim, clamp(m.u, 0, 1), ph); }
  if (m && anim === 'throw') st.attack = E.move('throw', clamp(m.u, 0, 1), m.ph === 'wind' ? 'wind' : 'active');
  if (m && anim === 'cast') st.pose = 'cast';
  if (m && anim === 'block' || b.guardT > 0) st.pose = 'block';
  st.stance = 'ready'; st.expr = b.phase ? 'angry' : undefined;
  b.rig.update(dt, b.rigState(Object.assign(st, { hurt: b.hurtT > .15 }, extra)));
};
/** choose a move: in range, in phase, weighted; 'once' moves wait their own cooldown */
Bosses.pick = (b, d, M) => {
  const opts = b.D.moves.filter(m => m.phase <= b.phase && d <= m.range + 8 && d >= m.min && !(m.once && b.used[m.name] > game.time) && !(m.p0 && b.phase > 0 && b.id === 'kurogane' && false));
  if (!opts.length) { b.cool = .2; return; }
  let tot = 0; for (const m of opts) tot += m.weight; let r = rand() * tot, def = opts[0]; for (const m of opts) { r -= m.weight; if (r <= 0) { def = m; break; } }
  if (def.once) b.used[def.name] = game.time + def.once;
  b.moveLog = b.moveLog || {}; b.moveLog[def.name] = (b.moveLog[def.name] || 0) + 1;
  const k = b.phase ? .8 : 1;
  b.move = { def, ph: 'wind', t: 0, u: 0, hit: 0, wind: def.wind * T('enemyWindup') * k, from: { x: b.x, y: b.y }, aim: ANG(b, M.hero), hitDone: false };
  if (b.D.spar && def.lesson) B.Hud.lesson(def.lesson);
  if (def.decal === 'arc') B.Hud.telegraph(b, def.range, def.arc, b.move.wind);
  else if (def.decal === 'ring') B.Hud.telegraphRing(b, def.ring, b.move.wind);
  else if (def.decal === 'line') B.Hud.telegraphLine(b, b.move.aim, def.lunge ? def.lunge * .45 : def.charge ? def.charge : 80, b.move.wind);
  sfxAt(def.name === 'quake' || def.name === 'smash' ? 'stomp' : 'swing', b.x, b.y, { vol: .5, pitch: .7 });
  if (def.name === 'vanish') { Au.sfx('shing'); }
};
/** start one named move now (tests and the dev tools): its wind-up, telegraph and strike as in a fight */
Bosses.force = (b, name, M) => { const def = b.D.moves.find(m => m.name === name); if (!def) return false; b.cool = 0; const keep = b.D.moves; b.D.moves = [def]; const d = Math.hypot(M.hero.x - b.x, M.hero.y - b.y); const ph = b.phase; b.phase = Math.max(b.phase, def.phase); const r = def.range, mn = def.min; def.range = 1e9; def.min = 0; Bosses.pick(b, d, M); def.range = r; def.min = mn; b.D.moves = keep; b.phase = ph; return !!b.move; };
Bosses.runMove = (b, dt, d, M) => {
  const m = b.move, def = m.def, h = M.hero; m.t += dt;
  let move = null;
  if (m.ph === 'wind') {
    m.u = m.t / m.wind; b.facing = E.approachAng(b.facing, def.lunge || def.charge ? m.aim : ANG(b, h), dt * (def.charge ? 1 : 3)); if (!def.charge) m.aim = ANG(b, h);
    if (m.t >= m.wind) { m.ph = 'active'; m.t = 0; Bosses.strike(b, m, M); }
    return null;
  }
  if (m.ph === 'active') {
    const dur = def.dur || def.active || .2; m.u = m.t / dur;
    if (def.lunge && m.t < .25) { const sp = def.lunge; move = null; const nx = b.x + Math.cos(m.aim) * sp * dt, ny = b.y + Math.sin(m.aim) * sp * dt; if (M.world.map.standable(nx, ny, b.z, b.r)) { b.x = nx; b.y = ny; } if (!m.hitDone && Math.hypot(h.x - b.x, h.y - b.y) < 22) { m.hitDone = Combat.enemyStrike(b, def.dmg, { reach: 24, arc: 1.4, parry: def.parry, knock: 120 }); } }
    if (def.charge) {
      const nx = b.x + Math.cos(m.aim) * def.charge * dt, ny = b.y + Math.sin(m.aim) * def.charge * dt;
      if (!M.world.map.standable(nx, ny, b.z, b.r) || (b.arena && (nx < b.arena.x0 + 6 || nx > b.arena.x1 - 6 || ny < b.arena.y0 + 6 || ny > b.arena.y1 - 6))) { b.status.stun = 2; game.shake(5); Au.sfx('stomp'); Pt.dust(b.x, b.y, b.z, 10); B.Cutscene.bark(b, 'Nnngh...!', b.voice); b.move = null; b.cool = 2.4; return null; }
      b.x = nx; b.y = ny; if (crand() < .5) Pt.dust(b.x, b.y, b.z, 1);
      if (!m.hitDone && Math.hypot(h.x - b.x, h.y - b.y) < 20) m.hitDone = Combat.enemyStrike(b, def.dmg, { reach: 24, arc: Math.PI, parry: false, knock: 200 });
    }
    if (def.hits && m.hit < def.hits && m.t >= m.hit * def.gap) { m.hit++; b.facing = ANG(b, h); Combat.enemyStrike(b, def.dmg, { reach: def.range, arc: def.arc, parry: def.parry }); sfxAt('swing', b.x, b.y, { vol: .5 }); }
    if (m.t >= dur && (!def.hits || m.hit >= def.hits)) { m.ph = 'recover'; m.t = 0; }
    return move;
  }
  m.u = m.t / (def.stuck && !m.hitDone ? def.stuck : def.recover) ;
  if (m.u >= 1) { b.move = null; b.cool = (b.phase ? .55 : .9) + rand() * .5; }
  return null;
};
/** the moment a move lands (or begins its effect) */
Bosses.strike = (b, m, M) => {
  const def = m.def, h = M.hero, W = M.world;
  if (def.name === 'smash' || def.name === 'sweep' || def.name === 'overhead' && !def.hits) { m.hitDone = Combat.enemyStrike(b, def.dmg, { reach: def.range, arc: def.arc, parry: def.parry, knock: 140 }); if (def.name === 'smash') { game.shake(5); Pt.dust(b.x + Math.cos(b.facing) * 20, b.y + Math.sin(b.facing) * 20, b.z, 12); Au.sfx('stomp'); } }
  if (def.name === 'quake') {
    game.shake(6); Au.sfx('stomp'); Pt.ring && Pt.ring(b.x, b.y, 4, def.ring, '#e8b04a', .5);
    M.waves.push({ x: b.x, y: b.y, z: b.z, r: 0, max: def.ring, speed: 120, dmg: def.dmg, by: b, hit: false });
  }
  if (def.name === 'fan') { const n = def.stars + b.phase, a0 = ANG(b, h); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .18; M.shots.fire({ x: b.x, y: b.y, z: b.z + 20, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, vz: 0, r: 2, team: 'enemy', color: '#e8e0f0', life: .9, dmg: def.dmg, owner: b, kind: 'shuriken' }); } Au.sfx('shuriken'); Pt.glints(b.x, b.y, b.z + 20, 4, '#ffffff'); }
  if (def.name === 'vanish') {
    b.vanished = true; Pt.smoke(b.x, b.y, b.z + 12, 18, { size: 2.5, color: '#4a1a2a' }); Au.sfx('vanish'); b.untouchable = true;
    M.timers.push({ t: def.vanish, fn: () => { if (!b.alive) return; const a = h.facing + Math.PI; b.x = h.x + Math.cos(a) * 18; b.y = h.y + Math.sin(a) * 18; b.z = h.z; b.facing = ANG(b, h); b.vanished = false; b.untouchable = false; Au.sfx('shing'); Pt.smoke(b.x, b.y, b.z + 12, 10, { size: 2, color: '#4a1a2a' }); M.world.dyn.push({ x: b.x, y: b.y, z: 20, r: 40, i: .8, t: .5, color: '#ff3a2a' });
      M.timers.push({ t: .32, fn: () => { if (b.alive) Combat.enemyStrike(b, def.dmg, { reach: 26, arc: 1.4, parry: true }); } }); } });
  }
  if (def.name === 'clones') { Pt.smoke(b.x, b.y, b.z + 12, 14, { size: 2, color: '#6a1a2a' }); for (let i = 0; i < def.clones; i++) Bosses.clone(b, M, i); B.Cutscene.bark(b, B.Story.lines.hotaru_clones, b.voice); }
  if (def.name === 'ironguard') { b.guardT = def.guard; B.Hud.toast('Iron Guard', 'He blocks every blow from the front. Flank him, or use a tool.'); }
  if (def.name === 'flame') { const a = b.facing; for (let i = 1; i <= 6; i++) M.fires.push({ x: b.x + Math.cos(a) * i * 12, y: b.y + Math.sin(a) * i * 12, z: b.z, r: 9, t: def.flame, dmg: def.dmg }); Au.sfx('fire'); }
  if (def.name === 'volley') { for (let i = 0; i < def.balls; i++) { const tx = h.x + (rand() - .5) * 50, ty = h.y + (rand() - .5) * 50, from = { x: b.x, y: b.y, z: b.z + 30 }, v = E.arc(from, { x: tx, y: ty, z: h.z }, 600, { apex: 40 }); M.balls.push({ x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, dmg: def.dmg, by: b, mark: { x: tx, y: ty, z: h.z } }); B.Hud.telegraphRing({ x: tx, y: ty, z: h.z }, 20, v.t); } Au.sfx('fire'); }
  if (def.name === 'roar') { Au.sfx('roar'); game.shake(6); if (Math.hypot(h.x - b.x, h.y - b.y) < def.ring && !h.blocking) { h.stunT = 1.2; B.damage(b, h, 6, { kind: 'roar', unblockable: true }); B.Hud.toast('Stunned!', 'Block against the roar.'); } }
  if (def.name === 'spirits') { for (let i = 0; i < def.spirits; i++) Bosses.spirit(b, M, i); }
};
/** Hotaru's illusions: one hit pops them; they throw fans too */
Bosses.clone = (b, M, i) => {
  const a = rand() * TAU, x = clamp(b.x + Math.cos(a) * 40, b.arena ? b.arena.x0 + 8 : 0, b.arena ? b.arena.x1 - 8 : 1e9), y = clamp(b.y + Math.sin(a) * 40, b.arena ? b.arena.y0 + 8 : 0, b.arena ? b.arena.y1 - 8 : 1e9);
  const c = Actor.make({ kind: 'spirit', id: 'clone' + i, x, y, z: b.z, hp: 1, rig: Rigs.make('hotaru') }); c.clone = true; c.t = 0; c.throwT = 1 + i * .7; c.A = { label: 'Illusion' };
  c.onDeath = () => { Pt.smoke(c.x, c.y, c.z + 12, 10, { size: 2, color: '#6a1a2a' }); Au.sfx('vanish'); };
  M.summons.push(c);
};
/** Kurogane's spirit flames: blobs of fire that chase and burst */
Bosses.spirit = (b, M, i) => {
  const c = Actor.make({ kind: 'spirit', id: 'spirit' + i, x: b.x + (i ? 20 : -20), y: b.y, z: b.z, hp: 1, rig: new E.Blob({ R: 5, colors: { dk: '#8a1a0a', base: '#ff6a2a', lt: '#ffd070', spec: '#ffffff', eye: '#fff4c0', pupil: '#3a0a00' }, mouth: 'fangs' }) });
  c.spirit = true; c.t = 0; c.A = { label: 'Spirit flame' }; c.onDeath = () => { Pt.fire(c.x, c.y, c.z + 6, 8); };
  M.summons.push(c);
};
Bosses.updateSummons = (dt, M) => {
  const h = M.hero, W = M.world;
  for (const c of M.summons) {
    if (!c.alive) continue; c.t += dt; c.hurtT = Math.max(0, c.hurtT - dt);
    if (c.clone) {
      c.facing = ANG(c, h); c.throwT -= dt;
      if (c.throwT <= 0) { c.throwT = 2.2; const a0 = ANG(c, h); for (let k = -1; k <= 1; k++) { const a = a0 + k * .2; M.shots.fire({ x: c.x, y: c.y, z: c.z + 20, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, vz: 0, r: 2, team: 'enemy', color: '#e8e0f0', life: .8, dmg: 4, owner: c, kind: 'shuriken' }); } }
      c.rig.update(dt, c.rigState({ stance: 'ready', attack: c.throwT > 1.9 ? E.move('throw', (2.2 - c.throwT) / .3) : null }));
    } else if (c.spirit) {
      const a = ANG(c, h), sp = 46; c.x += Math.cos(a) * sp * dt; c.y += Math.sin(a) * sp * dt; c.z = approach(c.z, h.z + 6 + Math.sin(c.t * 4) * 3, 40 * dt);
      if (crand() < .5) Pt.fire(c.x, c.y, c.z + 4, 1);
      W.dynStep.push({ x: c.x, y: c.y, z: c.z + 8, r: 40, i: .7, color: '#ff7a3a' });
      c.rig.update(dt, { look: [Math.cos(a), Math.sin(a)], squash: Math.sin(c.t * 8) * .15 });
      if (Math.hypot(h.x - c.x, h.y - c.y) < 10) { B.damage(c, h, 10, { kind: 'fire', unblockable: false }); c.alive = false; Pt.fire(c.x, c.y, c.z, 10); Au.sfx('fire'); }
    }
  }
  E.prune(M.summons, c => !c.alive && c.t !== undefined && (c.deadT = (c.deadT || 0) + dt) > .2);
  for (const w of M.waves) { w.r += w.speed * dt; const d = Math.hypot(h.x - w.x, h.y - w.y); if (!w.hit && Math.abs(d - w.r) < 6 && h.onGround && Math.abs(h.z - w.z) < 8) { w.hit = true; B.damage(w.by, h, w.dmg, { kind: 'quake', unblockable: true }); } }
  E.prune(M.waves, w => w.r > w.max);
  for (const f of M.fires) { f.t -= dt; if (crand() < dt * 10) Pt.fire(f.x + (crand() - .5) * 8, f.y + (crand() - .5) * 8, f.z + 2, 1); W.dynStep.push({ x: f.x, y: f.y, z: f.z + 6, r: 30, i: .5, color: '#ff8a30' }); if (Math.hypot(h.x - f.x, h.y - f.y) < f.r && Math.abs(h.z - f.z) < 8 && h.iframes <= 0) B.damage(null, h, f.dmg * .5, { kind: 'fire', unblockable: true }); }
  E.prune(M.fires, f => f.t <= 0);
  for (const bl of M.balls) { bl.vz -= 600 * dt; bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.z += bl.vz * dt; if (crand() < .7) Pt.fire(bl.x, bl.y, bl.z, 1); const gz = W.map.groundAt(bl.x, bl.y, 0, bl.z + 4); if (bl.z <= gz) { bl.done = true; Pt.explosion(bl.x, bl.y, gz + 4, .7, { shake: 2 }); if (Math.hypot(h.x - bl.x, h.y - bl.y) < 20) B.damage(bl.by, h, bl.dmg, { kind: 'fire' }); } }
  E.prune(M.balls, bl => bl.done);
};
/** a phase change: Gonroku rages, Hotaru splits, Kurogane's mask wakes */
Bosses.phase = (b, M) => {
  game.flash('#ffffff', .15, .7); game.shake(5); b.move = null; b.cool = 1.4;
  const line = B.Story.lines[b.id + '_phase2']; if (line) B.Cutscene.bark(b, line, b.id === 'kurogane' ? 'oni' : b.voice);
  if (b.id === 'kurogane') {
    const rig = Rigs.make('kuroganeOni'); rig.update(0, b.rigState()); b.rig = rig; b.voice = 'oni'; b.walk = 38; b.run = 80;
    Pt.fire(b.x, b.y, b.z + 20, 30, { size: 2 }); Au.sfx('roar'); M.cine = 1.6; B.Cam.cine(1.5, 1.6); B.Hud.bossCard('The Oni of Shuten', 'The mask wakes');
  }
  if (b.id === 'gonroku') { b.walk = 42; b.run = 86; }
  B.emit('boss', { boss: b, phase: 'phase2' });
};
/** defeat: slow motion, a white flash, the line, a checkpoint, the arena opens */
Bosses.defeat = (b, M) => {
  if (b.defeated) return false;
  b.defeated = true; b.move = null; b.vanished = false; b.untouchable = false;
  for (const c of M.summons) c.alive = false;
  game.flash('#ffffff', .3, 1); game.timeScale = .35; M.timers.push({ t: .5, fn: () => { game.timeScale = (B.Dev && B.Dev.timeScale) || 1; } });
  const line = B.Story.lines[b.id + '_defeat']; if (line) B.Cutscene.bark(b, line, b.voice, 3.5);
  const L = M.level.boss || {}; for (const c of L.open || []) M.world.setCells(c[0], c[1], c[2], c[3], c[4] || '.');
  M.bossFight = null; B.Music.play(M.level.music || 'm1', { fade: 1.2 });
  B.emit('boss', { boss: b, phase: 'defeat' }); B.emit('bossDefeated', { boss: b });
  if (b.D.spar) { b.hp = 1; return false; }   // the monk kneels: "Well struck."
  if (b.id === 'hotaru') { Pt.smoke(b.x, b.y, b.z + 12, 30, { size: 3, color: '#3a1a2a' }); M.timers.push({ t: 1.2, fn: () => { b.sunk = true; } }); }
  M.timers.push({ t: .6, fn: () => B.Mission.checkpoint(M, 'boss') });
  return true;
};
B.Bosses = Bosses;

/* ---- 54-escort.js ---- */
/* ---- ESCORT: Tobei the courier follows within 20-40 on the ground nav map (he cannot grapple or climb), crouches and
 * swims with the hero, waits or follows on Interact, runs to the hero when a guard is alert on him, and is teleported
 * along when left far behind out of sight. If he falls, the mission fails ---- */
const Escort = {};
Escort.spawn = (spec, M) => {
  const W = M.world, x = cellC(spec.at[0]), y = cellC(spec.at[1]);
  const e = Actor.make({ kind: 'escort', id: spec.id || 'tobei', x, y, z: W.map.groundAt(x, y), hp: spec.hp || 60, rig: Rigs.make('tobei'), team: 'hero', body: { walk: 40, run: 82, climbMax: 14, hopMax: 34 } });
  Object.assign(e, { caged: spec.caged !== false, follow: false, wait: false, barkT: 4, voice: 'tobei', exposure: 1, A: { label: 'Tobei' }, crouch: false, swim: false, hpMax: spec.hp || 60 });
  e.onDeath = () => { B.emit('escortDeath', { escort: e }); return true; };
  return e;
};
Escort.update = (e, dt, M) => {
  const W = M.world, h = M.hero;
  e.hurtT = Math.max(0, e.hurtT - dt); e.barkT -= dt; if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
  if (!e.alive) { e.rig.update(dt, { x: e.x, y: e.y, z: e.z, facing: e.facing, down: 1 }); return; }
  if (e.caged) { e.update(dt, W.map, { move: [0, 0] }); e.rig._post = Rigs.cower(game.time); e.rig.update(dt, e.rigState({ crouch: true })); return; }
  // exposure: as the hero's (light, cover, crouch)
  const L = W.lightAt(e.x, e.y, e.z); e.exposure = lerp(1 - T('darkness'), 1, L) * (W.isHide(e.x, e.y, e.z) ? (e.crouch ? .15 : .6) : 1) * (e.crouch ? T('crouchVis') / .6 : 1) * (e.dive ? 0 : 1);
  const hunted = M.guards.some(g => g.alive && g.mind && g.mind.state === 'alert' && g.target === e);
  let move = [0, 0];
  const d = Math.hypot(h.x - e.x, h.y - e.y);
  if (e.follow && !e.wait) {
    // a far teleport when left behind and out of the hero's sight (never into a wall or the deep)
    if (d > 160 && !W.map.sight(h, e) && h.onGround && !W.isDeep(h.x, h.y, h.z) && Math.abs(h.z - W.map.groundAt(h.x, h.y)) < 2) { const a = h.facing + Math.PI; const nx = h.x + Math.cos(a) * 18, ny = h.y + Math.sin(a) * 18; if (W.map.standable(nx, ny, h.z, 4)) { e.x = nx; e.y = ny; e.z = h.z; } }
    const keep = hunted ? 10 : 26;
    if (d > keep + 8 || hunted) { const s = W.steer(e, h, 'walk', d > 60 || hunted ? 1 : .5); move = s.move; }
    e.crouch = h.crouch || h.dive || h.hug; e.swim = W.isDeep(e.x, e.y, e.z); e.dive = e.swim && h.dive;
    if (e.barkT <= 0 && rand() < dt * .1) { e.barkT = 18; Brain.bark(e, 'tobei'); }
  }
  // the escort swims where the hero swims: the nav map has no water, so he follows the hero's own line through it
  if (e.follow && !e.wait && (W.isDeep(h.x, h.y, h.z) || W.isDeep(e.x, e.y, e.z)) && d > 22) { const a = ANG(e, h); move = [Math.cos(a), Math.sin(a)]; }
  e.walk = e.swim ? 26 : 40;
  e.update(dt, W.map, { move, crouch: e.crouch && !e.swim });
  if (e.inHazard) { e.inHazard = false; e.respawn(); }
  e.drawZ = e.swim ? e.z - (e.dive ? 15 : 9) : undefined;
  e.rig._post = e.swim ? Rigs.swim(game.time) : null;
  e.rig.update(dt, e.rigState({ hurt: e.hurtT > .1, down: e.swim ? (e.dive ? .55 : .35) : undefined, expr: hunted ? 'shout' : undefined }));
};
/** Interact near Tobei: Wait here / Follow me */
Escort.toggle = (e, M) => {
  if (e.caged || !e.alive) return false;
  e.wait = !e.wait; Brain.bark(e, e.wait ? 'tobeiWait' : 'tobeiFollow', true);
  B.Hud.toast(e.wait ? 'Tobei waits' : 'Tobei follows', e.wait ? 'He hides where he stands.' : 'Keep him out of the light.');
  return true;
};
B.Escort = Escort;

/* ---- 60-mission.js ---- */
/* ---- MISSIONS: the runtime of one level: actors from its lists, objectives (assassinate, retrieve, rescue, escort,
 * reach, defeat, interact, stopTimer, flag), triggers (rect, at+r, when: objective / kill / alert / time / pickup / flag /
 * boss / interact) with actions (say, dialog, toast, tutorial, checkpoint, spawn, boss, objective, open, close, music,
 * flag, heal, cutscene), checkpoints (a snapshot restored on retry), timers and the generic fail hook ---- */
const Mission = {};
const CHEATS0 = () => ({ god: false, invisible: false, noclip: false, infinite: false, oneHit: false, freezeAI: false, reveal: false });
/** build a mission. o: { mode: 'story' | 'trial' | 'hub' | 'attract' | 'workshop', char, loadout, missionId, cheats, snapshot } */
Mission.create = (L, o = {}) => {
  if (typeof L === 'string') L = B.get('level', L);
  L = deepCopy(L);
  const M = { level: L, missionId: o.missionId || L.id, mode: o.mode || 'story', char: o.char || 'sojiro', world: new World(L), guards: [], civs: [], bosses: [], summons: [], escort: null,
    bells: [], barracks: [], pickups: [], interacts: [], objectives: [], triggers: [], timer: null, flags: {}, heightened: 0, alarm: { rung: 0, runner: null }, detectCd: 0,
    clouds: [], traps: [], baits: [], lobs: [], timers: [], waves: [], fires: [], balls: [], noises: [], shots: new E.Bullets(game, { plane: 'ground' }), cheats: Object.assign(CHEATS0(), o.cheats || {}),
    stats: { time: 0, silentCuts: 0, kills: 0, cleanKills: 0, detections: 0, civiliansHarmed: 0, optionalDone: 0, toolsUsed: 0, retries: 0, damageTaken: 0, marks: 0, cutKinds: {} },
    ended: false, failed: null, result: null, focus: false, cine: 0, holding: null, snap: null, t: 0, ghosts: [] };
  const W = M.world, fac = L.faction || 'kanemori';
  for (const s of L.guards || []) M.guards.push(Enemies.spawn(s, M, fac));
  for (const s of L.civilians || []) M.civs.push(Enemies.spawnCiv(s, M));
  if (L.boss) M.bosses.push(Bosses.spawn(L.boss, M));
  if (L.escort) M.escort = Escort.spawn(L.escort, M);
  M.bells = (L.bells || []).map(([cx, cy]) => ({ x: cellC(cx), y: cellC(cy), z: W.map.groundAt(cellC(cx), cellC(cy)) }));
  M.barracks = (L.barracks || []).map(([cx, cy]) => ({ x: cellC(cx), y: cellC(cy) }));
  M.pickups = (L.pickups || []).map((p, i) => ({ id: p.id || 'p' + i, kind: p.kind, tool: p.tool, n: p.n || 1, x: cellC(p.at[0]), y: cellC(p.at[1]), z: p.z !== undefined ? p.z : W.map.groundAt(cellC(p.at[0]), cellC(p.at[1])), taken: false, text: p.text, icon: p.icon }));
  M.interacts = (L.interact || []).map(s => Object.assign({ hold: 1, r: 18, done: false, progress: 0 }, s, { x: cellC(s.at[0]), y: cellC(s.at[1]), z: s.z !== undefined ? s.z : W.map.groundAt(cellC(s.at[0]), cellC(s.at[1])) }));
  M.objectives = (L.objectives || []).map(ob => Object.assign({ state: 'hidden', n: 0 }, ob));
  M.triggers = (L.triggers || []).map(t => Object.assign({ fired: false }, t));
  if (L.timer) M.timer = { t: L.timer.seconds, max: L.timer.seconds, spec: L.timer, stopped: false };
  // the hero, and its bento
  const hs = L.hero || { at: [2, 2] }, hx = cellC(hs.at[0]), hy = cellC(hs.at[1]);
  M.hero = Hero.make(M.char, { x: hx, y: hy, z: hs.z !== undefined ? hs.z : W.map.groundAt(hx, hy), facing: (hs.facing || 0) * Math.PI / 180 }, M);
  M.hero.bento = Bento.copy(o.loadout || Bento.fromHint((B.get('mission', M.missionId) || {}).loadoutHint || [['riceball', 2], ['shuriken', 10], ['smoke', 2]], o.save));
  M.exit = L.exit ? { x: cellC(L.exit.at[0]), y: cellC(L.exit.at[1]), r: (L.exit.r || 1.5) * T16 } : null;
  M.interact = (h, it) => Mission.interact(M, h, it);
  M.npcs = (L.npcs || []).map(n => { const x = cellC(n.at[0]), y = cellC(n.at[1]), a = Actor.make({ kind: 'npc', id: n.id, x, y, z: W.map.groundAt(x, y), facing: (n.facing || 0) * Math.PI / 180, rig: Rigs.make(n.rig, n.arg), team: 'npc' }); a.pose = n.pose; return a; });
  Mission.refreshObjectives(M, true);
  return M;
};
Mission.find = (M, id) => M.guards.find(g => g.id === id) || M.civs.find(c => c.id === id) || M.bosses.find(b => b.id === id) || (M.escort && M.escort.id === id ? M.escort : null);
/** each step of play (after the hero and the actors) */
Mission.update = (M, dt, it) => {
  if (M.ended) return;
  M.t += dt; M.stats.time += dt; M.detectCd -= dt; if (M.heightened !== Infinity) M.heightened = Math.max(0, M.heightened - dt); M.cine = Math.max(0, M.cine - dt);
  for (const n of M.noises) n.t -= dt; E.prune(M.noises, n => n.t <= 0);
  const h = M.hero, W = M.world;
  if (W.flash > 0) W.flash -= dt;
  // pickups on contact
  for (const p of M.pickups) if (!p.taken && Math.hypot(p.x - h.x, p.y - h.y) < 12 && Math.abs(p.z - h.z) < 12 && !h.dead) Mission.pick(M, p);
  // a held interaction (a lever, a cage, a mooring rope, the sake flask)
  if (M.holding) {
    const ix = M.holding;
    if (it.interactDown !== false && (it.interactDown || it.interactHold) && Math.hypot(ix.x - h.x, ix.y - h.y) < ix.r + 4 && !h.dead) {
      ix.progress += dt; if (ix.progress >= ix.hold) { Mission.doInteract(M, ix); M.holding = null; }
    } else { ix.progress = 0; M.holding = null; }
  }
  // the timer
  if (M.timer && !M.timer.stopped) { M.timer.t -= dt; if (M.timer.t <= 0) { M.timer.t = 0; M.timerFail = true; Mission.fail(M, M.timer.spec.fail || 'Time has run out.'); return; } }
  if (M.escort && !M.escort.alive && !M.failed) { Mission.fail(M, 'Tobei has fallen.'); return; }
  Mission.runTriggers(M);
  Mission.refreshObjectives(M);
  const req = M.objectives.filter(o => !o.optional);
  if (req.length && req.every(o => o.state === 'done') && !M.ended && !h.dead) Mission.complete(M);
};
Mission.pick = (M, p) => {
  p.taken = true; Au.sfx('pickup');
  if (p.kind === 'tool') { const n = Hero.give(M.hero, p.tool, p.n); B.Hud.toast('Found: ' + B.get('tool', p.tool).name, n ? '+' + n : 'The bento is full.'); }
  else if (p.kind === 'heal') { M.hero.hp = Math.min(M.hero.maxHp, M.hero.hp + 40); B.Hud.toast('A rice ball', '+40 health'); }
  else B.Hud.toast(p.text || 'Found it', '');
  B.emit('pickup', { pickup: p }); Pt.glints(p.x, p.y, p.z + 8, 10, '#ffe08a');
};
/** Interact pressed: Tobei's wait / follow, then a held interaction in reach */
Mission.interact = (M, h, it) => {
  let best = null, bd = 1e9; for (const ix of M.interacts) { if (ix.done || !Mission.interactReady(M, ix)) continue; const d = Math.hypot(ix.x - h.x, ix.y - h.y); if (d < ix.r + 4 && d < bd && Math.abs(ix.z - h.z) < 14) { bd = d; best = ix; } }
  const e = M.escort; if (!best && e && e.alive && !e.caged && Math.hypot(e.x - h.x, e.y - h.y) < 22) return Escort.toggle(e, M);
  if (!best) return false;
  if (!best.hold) { Mission.doInteract(M, best); return true; }
  M.holding = best; best.progress = 0; return true;
};
Mission.interactReady = (M, ix) => !ix.requires || Mission.cond(M, ix.requires);
Mission.nearInteract = (M, h) => { for (const ix of M.interacts) if (!ix.done && Mission.interactReady(M, ix) && Math.hypot(ix.x - h.x, ix.y - h.y) < ix.r + 4 && Math.abs(ix.z - h.z) < 14) return ix; return null; };
Mission.doInteract = (M, ix) => {
  ix.done = true; ix.progress = ix.hold; Au.sfx(ix.sfx || 'lever'); B.emit('interact', { id: ix.id, ix });
  Mission.actions(M, ix.do || []);
};
/** a condition string: 'objective:kill', 'kill:kanemori', 'alert', 'time:30', 'pickup:ledger', 'flag:x', 'boss:gonroku', 'interact:lever' */
Mission.cond = (M, c) => {
  const [k, v] = String(c).split(':');
  if (k === 'objective') { const o = M.objectives.find(o => o.id === v); return !!o && o.state === 'done'; }
  if (k === 'kill') { const a = Mission.find(M, v); return !!a && !a.alive; }
  if (k === 'alert') return M.guards.some(g => g.alive && g.mind && g.mind.state === 'alert');
  if (k === 'time') return M.t >= +v;
  if (k === 'pickup') { const p = M.pickups.find(p => p.id === v); return !!p && p.taken; }
  if (k === 'flag') return !!M.flags[v];
  if (k === 'boss') { const b = M.bosses.find(b => b.id === v); return !!b && b.defeated; }
  if (k === 'interact') { const ix = M.interacts.find(i => i.id === v); return !!ix && ix.done; }
  if (k === 'marks') return M.stats.marks >= +v;
  return false;
};
Mission.runTriggers = M => {
  const h = M.hero;
  for (const t of M.triggers) {
    if (t.fired && t.once !== false) continue;
    let ok = true;
    if (t.rect) { const cx = h.x / T16, cy = h.y / T16; ok = cx >= t.rect[0] && cx <= t.rect[2] + 1 && cy >= t.rect[1] && cy <= t.rect[3] + 1 && (t.z === undefined || h.z >= t.z - 2); }
    if (ok && t.at) ok = Math.hypot(h.x - cellC(t.at[0]), h.y - cellC(t.at[1])) < (t.r || 1.5) * T16;
    if (ok && t.when) ok = [].concat(t.when).every(c => Mission.cond(M, c));
    if (ok && h.dead) ok = false;
    if (!ok) continue;
    if (t.fired && t.once === false && t.latch) continue;
    t.fired = true; Mission.actions(M, t.do || []);
  }
};
Mission.actions = (M, list) => {
  for (const a of list) {
    const [k, ...p] = a;
    if (k === 'say') B.Cutscene.radio(p[0], B.Story.text(p[1], M.char), p[2]);
    else if (k === 'dialog') B.Cutscene.dialog(p[0], M.char);
    else if (k === 'toast') B.Hud.toast(p[0], p[1] || '');
    else if (k === 'tutorial') B.Hud.tutorial(p[0], p[1] || '', p[2]);
    else if (k === 'checkpoint') Mission.checkpoint(M);
    else if (k === 'spawn') M.guards.push(Enemies.spawn(p[0], M, M.level.faction));
    else if (k === 'boss') { const b = M.bosses.find(b => b.id === p[0]); if (b) Bosses.start(b, M); }
    else if (k === 'objective') { const o = M.objectives.find(o => o.id === p[0]); if (o) { if (p[1] === 'show' && o.state === 'hidden') { o.state = 'active'; o.forced = true; B.emit('objective', { obj: o, state: 'active' }); } else if (p[1] === 'done') Mission.setObj(M, o, 'done'); else if (p[1] === 'fail') Mission.setObj(M, o, 'failed'); } }
    else if (k === 'open') M.world.setCells(p[0], p[1], p[2] || 1, p[3] || 1, p[4] || '.');
    else if (k === 'close') M.world.setCells(p[0], p[1], p[2] || 1, p[3] || 1, p[4] || '#');
    else if (k === 'music') B.Music.play(p[0]);
    else if (k === 'flag') M.flags[p[0]] = p[1] === undefined ? true : p[1];
    else if (k === 'heal') M.hero.hp = M.hero.maxHp;
    else if (k === 'release') { const e = M.escort; if (e) { e.caged = false; e.follow = true; Brain.bark(e, 'tobeiFreed', true); B.Cutscene.radio('tobei', B.Story.text('tobei_freed', M.char)); } }
    else if (k === 'stopTimer') { if (M.timer) { M.timer.stopped = true; B.Hud.toast('The poison is gone', 'The lord’s cup is safe.'); } }
    else if (k === 'prop') { const pr = M.world.props.find(q => q.id === p[0] && toCell(q.x) === p[1] && toCell(q.y) === p[2]); if (pr) pr.id = p[3]; }
    else if (k === 'drift') { for (const pr of M.world.props) if (pr.id === 'riceBarge' && Math.hypot(toCell(pr.x) - p[0], toCell(pr.y) - p[1]) < 3) pr.drift = true; }
    else if (k === 'cower') { const c = Mission.find(M, p[0]); if (c) c.cowerAt = { x: cellC(p[1]), y: cellC(p[2]), z: 0 }; }
    else if (k === 'kill') { const g = Mission.find(M, p[0]); if (g) { g.alive = false; } }
    else if (k === 'remove') { const g = Mission.find(M, p[0]); if (g) { g.alive = false; g.sunk = true; g.marked = true; Pt.smoke(g.x, g.y, g.z + 12, 8, { size: 2 }); } }
    else if (k === 'give') Hero.give(M.hero, p[0], p[1] || 1);
    else if (k === 'cutscene') B.Cutscene.play(p[0], M.char);
  }
};
Mission.setObj = (M, o, st) => {
  if (o.state === st || o.state === 'done' || o.state === 'failed') return;
  o.state = st;
  if (st === 'done') { Au.sfx('stingObjective'); if (o.optional) M.stats.optionalDone++; B.Hud.toast(o.optional ? 'Optional task done' : 'Objective done', o.text); }
  B.emit('objective', { obj: o, state: st });
};
/** objectives: hidden until their 'after' list is done; done when their condition holds */
Mission.refreshObjectives = (M, quiet) => {
  const h = M.hero;
  for (const o of M.objectives) {
    if (o.state === 'done' || o.state === 'failed') continue;
    const ready = !o.after || o.after.every(id => { const p = M.objectives.find(q => q.id === id); return p && p.state === 'done'; });
    if (o.state === 'hidden' && (ready || o.forced) && !o.secret) { o.state = 'active'; if (!quiet) { B.Hud.objective(o); B.emit('objective', { obj: o, state: 'active' }); } }
    if (o.state !== 'active' && !(o.optional && ready)) continue;
    let done = false;
    if (o.type === 'assassinate') { const a = Mission.find(M, o.target); done = !!a && !a.alive; }
    else if (o.type === 'retrieve') { const p = M.pickups.find(p => p.id === o.pickup); done = !!p && p.taken; }
    else if (o.type === 'rescue') done = !!M.escort && !M.escort.caged;
    else if (o.type === 'escort') { const e = M.escort, z = o.zone; done = !!e && e.alive && !e.caged && (z ? toCell(e.x) >= z[0] && toCell(e.x) <= z[2] && toCell(e.y) >= z[1] && toCell(e.y) <= z[3] : M.exit && Math.hypot(e.x - M.exit.x, e.y - M.exit.y) < M.exit.r + 8); }
    else if (o.type === 'reach') { if (o.zone) done = toCell(h.x) >= o.zone[0] && toCell(h.x) <= o.zone[2] && toCell(h.y) >= o.zone[1] && toCell(h.y) <= o.zone[3] && (o.z === undefined || h.z >= o.z - 2); else done = !!M.exit && Math.hypot(h.x - M.exit.x, h.y - M.exit.y) < M.exit.r && Math.abs(h.z - M.world.map.groundAt(M.exit.x, M.exit.y)) < 20; done = done && ready; }
    else if (o.type === 'defeat') { const b = M.bosses.find(b => b.id === o.boss); done = !!b && b.defeated; }
    else if (o.type === 'interact') { const ids = [].concat(o.interact); o.n = M.interacts.filter(i => ids.includes(i.id) && i.done).length; done = o.n >= (o.count || ids.length); }
    else if (o.type === 'stopTimer') done = !!M.timer && M.timer.stopped;
    else if (o.type === 'flag') done = !!M.flags[o.flag];
    else if (o.type === 'marks') { o.n = M.stats.marks; done = o.n >= o.count; }
    else if (o.type === 'killAll') { const ids = [].concat(o.targets); o.n = ids.filter(id => { const a = Mission.find(M, id); return !a || !a.alive; }).length; done = o.n >= ids.length; }
    if (done && (ready || o.optional)) Mission.setObj(M, o, 'done');
  }
};
Mission.complete = M => { if (M.ended) return; M.ended = true; M.result = 'win'; B.emit('missionEnd', { M, win: true }); };
/** the generic fail hook: mission.fail(reason) (Tobei has fallen, time is up, the target escaped) */
Mission.fail = (M, reason) => { if (M.ended) return; M.ended = true; M.failed = reason; M.result = 'fail'; Au.sfx('stingOver'); B.emit('missionEnd', { M, win: false, reason }); };
/* ---- CHECKPOINTS: a snapshot of where things are; retry rebuilds the level and puts it back (guards calm, at their
 * route starts; the level stays heightened if it was) ---- */
Mission.checkpoint = (M, why) => {
  if (M.mode === 'hub' || M.mode === 'attract') return;
  const h = M.hero;
  M.snap = { hero: { x: h.x, y: h.y, z: h.z, facing: h.facing }, bento: Bento.copy(h.bento), rows: M.world.rows.slice(), stats: deepCopy(M.stats), flags: deepCopy(M.flags), t: M.t,
    dead: M.guards.concat(M.civs).filter(g => !g.alive).map(g => ({ id: g.id, x: g.x, y: g.y, z: g.z, facing: g.facing, sunk: g.sunk, hidden: g.hidden, found: g.found, marked: g.marked })),
    asleep: M.guards.filter(g => g.alive && (g.asleep || g.status.sleep > 0)).map(g => g.id), unmasked: M.guards.filter(g => g.unmasked).map(g => g.id),
    objectives: M.objectives.map(o => ({ id: o.id, state: o.state, n: o.n })), triggers: M.triggers.map(t => t.fired), pickups: M.pickups.map(p => p.taken), interacts: M.interacts.map(i => i.done),
    timer: M.timer ? { t: M.timer.t, stopped: M.timer.stopped } : null, heightened: M.heightened, alarm: M.alarm.rung,
    escort: M.escort ? { x: M.escort.x, y: M.escort.y, caged: M.escort.caged, follow: M.escort.follow, wait: M.escort.wait, hp: M.escort.hp } : null,
    bosses: M.bosses.map(b => ({ id: b.id, defeated: b.defeated, active: b.active, x: b.x, y: b.y, z: b.z })), props: M.world.props.map(p => p.id), music: B.Music.cur };
  if (why !== 'quiet') { B.Hud.toast('Checkpoint', ''); B.emit('checkpoint', {}); }
};
/** rebuild the mission at its checkpoint (or from the start); returns the new mission */
Mission.restore = (M, snap) => {
  const N = Mission.create(M.level, { mode: M.mode, char: M.char, missionId: M.missionId, loadout: snap ? snap.bento : M.startLoadout, cheats: M.cheats });
  N.startLoadout = M.startLoadout; N.levelSpec = M.levelSpec;
  if (!snap) { N.stats.retries = M.stats.retries + 1; return N; }
  const W = N.world;
  for (let y = 0; y < W.h; y++) if (snap.rows[y] !== W.rows[y]) for (let x = 0; x < W.w; x++) if (snap.rows[y][x] !== W.rows[y][x]) W.setCells(x, y, 1, 1, snap.rows[y][x]);
  Object.assign(N.hero, snap.hero); N.hero.hp = N.hero.maxHp;
  N.stats = Object.assign(deepCopy(snap.stats), { retries: M.stats.retries + 1 }); N.flags = deepCopy(snap.flags); N.t = snap.t;
  for (const id of snap.unmasked) { const c = N.civs.find(c => c.id === id); if (c) Enemies.unmask(c, N); }
  for (const d of snap.dead) { const g = Mission.find(N, d.id); if (g) Object.assign(g, { alive: false, x: d.x, y: d.y, z: d.z, facing: d.facing, sunk: d.sunk, hidden: d.hidden, found: d.found, marked: d.marked, hp: 0 }); }
  for (const id of snap.asleep) { const g = Mission.find(N, id); if (g) g.asleep = true; }
  snap.objectives.forEach(o => { const q = N.objectives.find(x => x.id === o.id); if (q) { q.state = o.state; q.n = o.n; } });
  snap.triggers.forEach((f, i) => { if (N.triggers[i]) N.triggers[i].fired = f; });
  snap.pickups.forEach((f, i) => { if (N.pickups[i]) N.pickups[i].taken = f; });
  snap.interacts.forEach((f, i) => { if (N.interacts[i]) { N.interacts[i].done = f; if (f) N.interacts[i].progress = N.interacts[i].hold; } });
  snap.props.forEach((id, i) => { if (N.world.props[i]) N.world.props[i].id = id; });
  if (snap.timer && N.timer) Object.assign(N.timer, snap.timer);
  N.heightened = snap.heightened; N.alarm.rung = snap.alarm;
  if (snap.escort && N.escort) Object.assign(N.escort, snap.escort, { z: W.map.groundAt(snap.escort.x, snap.escort.y) });
  for (const sb of snap.bosses) { const b = N.bosses.find(q => q.id === sb.id); if (b && sb.defeated) { b.defeated = true; b.alive = b.D.spar; b.hp = b.D.spar ? 1 : 0; Object.assign(b, { x: sb.x, y: sb.y, z: sb.z }); if (b.id === 'kurogane' || b.id === 'hotaru') b.sunk = b.id === 'hotaru'; } }
  N.snap = snap; N.music = snap.music;
  return N;
};
B.Mission = Mission;

/* ---- 61-score.js ---- */
/* ---- SCORE, RANKS, UNLOCKS, SAVES. The bus counts what happened; the formula turns it into a score; bento grades are
 * the ranks; high ranks unlock tools; the save keeps the story's progress, best ranks and the Shadow Trial's board ---- */
const RANKS = [[2600, 'Grand Kaiseki', 'GK'], [2000, 'Makunouchi', 'M'], [1400, 'Ekiben', 'E'], [600, 'Hinomaru', 'H'], [-1e9, 'Leftovers', 'L']];   // (the balance pass: a loud run that finishes still earns Hinomaru)
const RANK_ORDER = RANKS.map(r => r[1]);
const Score = {};
B.on('silentCut', e => { const M = B.M; if (!M) return; M.stats.silentCuts++; M.stats.cutKinds[e.kind] = (M.stats.cutKinds[e.kind] || 0) + 1; if (e.victim.kind === 'civ' && !e.victim.disguised) M.stats.civiliansHarmed++; });
B.on('kill', e => { const M = B.M; if (!M || e.how === 'cut') return; if (e.victim.kind === 'boss' || e.victim.kind === 'spirit') return; M.stats.kills++; if (e.how === 'poison') M.stats.cleanKills++; if (e.victim.kind === 'civ' && !e.victim.harmed && !e.victim.target) { e.victim.harmed = 1; M.stats.civiliansHarmed++; } });
B.on('toolUsed', e => { if (B.M) { B.M.stats.toolsUsed++; B.M.flags['used_' + e.tool] = true; } });
B.on('mark', () => { if (B.M) B.M.stats.marks++; });
/** the story score of a finished mission */
Score.story = (M, par) => {
  const s = M.stats, parT = (par || 600) * T('parTimeMul'), other = s.kills;
  const parts = [['Mission complete', 1000], ['Silent Cuts', 150 * s.silentCuts], ['Other kills', 25 * other], ['Clean kills', 100 * s.cleanKills], ['Optional tasks', 300 * s.optionalDone],
    ['Detections', -150 * Math.min(3, s.detections)], ['Unseen', s.detections === 0 ? 400 : 0], ['Civilians harmed', -400 * s.civiliansHarmed], ['Retries', -200 * s.retries],
    ['Untouched', s.damageTaken < .5 ? 200 : 0], ['Time bonus', Math.round(Math.min(500, Math.max(0, parT - s.time)))]];
  return { total: parts.reduce((a, p) => a + p[1], 0), parts };
};
Score.rank = sc => RANKS.find(r => sc >= r[0]);
Score.rankAtLeast = (have, need) => RANK_ORDER.indexOf(have) >= 0 && RANK_ORDER.indexOf(have) <= RANK_ORDER.indexOf(need);
/** the trial / hub round's score (the same rules alone and in a session) */
Score.round = (M, o = {}) => {
  const s = M.stats, target = M.level.target ? Mission.find(M, M.level.target) : null, down = target && !target.alive;
  let sc = (down ? 2000 : 0) + (o.escaped && down ? 1000 : 0) + 250 * s.silentCuts + 50 * s.kills + (s.detections === 0 ? 600 : -150 * s.detections) - 500 * s.civiliansHarmed;
  if (o.escaped) sc += Math.min(1200, Math.max(0, Math.round(4 * (300 - s.time))));
  return Math.max(0, Math.round(sc));
};
/** unlocks earned by a mission's rank: [tool ids] */
Score.unlocks = (missionId, rank, save) => {
  const out = [];
  for (const id of TOOL_ORDER) {
    const t = B.get('tool', id); if (!t.unlock || save.tools.includes(id)) continue;
    if ((t.unlock.mission === missionId || t.unlock.mission === 'any') && Score.rankAtLeast(rank, t.unlock.rank)) out.push(id);
  }
  return out;
};
/* ---- THE SAVE: game.saves (three slots and the autosave); a hub session never writes ---- */
const Save = { data: null };
Save.fresh = (char = 'sojiro') => ({ v: 1, character: char, nextMission: 'training', completed: {}, best: {}, tools: [], lastLoadout: {}, flags: {}, playSeconds: 0, story: false });
Save.get = () => Save.data || (Save.data = Save.fresh());
const MISSION_NAMES = { training: 'The Trial of the Second Tier', m1: 'Rice and Ash', m2: 'The Fort at Kiri Lake', m3: 'Moon over Kokaku', ending: 'Fed by All' };
game.saves.write = () => { const d = Save.get(); return { data: d, place: MISSION_NAMES[d.nextMission] || 'The Jubako-ya', level: (B.CHARS[d.character] || B.CHARS.sojiro).name }; };
game.saves.read = s => { Save.data = Object.assign(Save.fresh(), s.data || {}); };
Save.write = () => { if (HUBACTIVE || (B.M && B.M.mode === 'attract')) return false; try { return game.saves.save('auto'); } catch (e) { return false; } };
Save.record = (missionId, char, sc, rank) => {
  const d = Save.get(); d.completed[missionId] = true;
  const b = (d.best[missionId] = d.best[missionId] || {}), old = b[char];
  if (!old || sc > old.score) b[char] = { score: sc, rank };
  const un = Score.unlocks(missionId, rank, d); for (const t of un) d.tools.push(t);
  return un;
};
/** the Shadow Trial's board: the top 5 runs, and the best one's ghost (10 samples a second) */
Save.trial = () => E.store.get('bentou:trial', { board: [], ghost: null });
Save.trialAdd = (entry, track) => {
  if (HUBACTIVE) return 0;
  const t = Save.trial(); t.board.push(entry); t.board.sort((a, b) => b.score - a.score); const place = t.board.indexOf(entry) + 1; t.board = t.board.slice(0, 5);
  if (place === 1 && track && track.length) t.ghost = { score: entry.score, char: entry.char, track };
  E.store.set('bentou:trial', t); return place;
};
B.Score = Score; B.Save = Save; B.RANKS = RANKS; B.MISSION_NAMES = MISSION_NAMES;

/* ---- 62-story.js ---- */
/* ---- STORY: all the words (ASCII only: the pixel font has no macrons). The register is earnest, terse feudal drama;
 * the jokes are deadpan and come from the world. A line may be one text, or { sojiro, kaede } where they differ.
 * In a scene's cast and lines, 'hero' is the apprentice played and 'other' the one who is not ---- */
const Story = {};
Story.speakers = {
  granny: { name: 'GRANNY OSHIMA', rig: 'granny', voice: 'granny' }, sojiro: { name: 'SOJIRO', rig: 'sojiro', voice: 'sojiro' }, kaede: { name: 'KAEDE', rig: 'kaede', voice: 'kaede' },
  takanori: { name: 'LORD TAKANORI', rig: 'takanori', voice: 'takanori' }, kuroganeRobe: { name: 'KUROGANE', rig: 'kuroganeRobe', voice: 'kurogane' }, kurogane: { name: 'KUROGANE', rig: 'kurogane', voice: 'kurogane' },
  oni: { name: 'KUROGANE', rig: 'kuroganeOni', voice: 'oni' }, kanemori: { name: 'KANEMORI', rig: 'kanemori', voice: 'kanemori' }, gonroku: { name: 'GONROKU', rig: 'gonroku', voice: 'gonroku' },
  hotaru: { name: 'HOTARU', rig: 'hotaru', voice: 'hotaru' }, tobei: { name: 'TOBEI', rig: 'tobei', voice: 'tobei' }, ittetsu: { name: 'BROTHER ITTETSU', rig: 'ittetsu', voice: 'ittetsu' },
  sakubei: { name: 'SAKUBEI', rig: 'sakubei', voice: 'sakubei' }, ume: { name: 'UME', rig: 'disciple', voice: 'disciple', arg: '#3e6a3a' }, kiku: { name: 'KIKU', rig: 'disciple', voice: 'disciple', arg: '#2a4a7a' },
  masa: { name: 'MASA', rig: 'disciple', voice: 'disciple', arg: '#6a4a2a' }, daikon: { name: 'BIG DAIKON', rig: 'daikon', voice: 'gonroku' }
};
Story.crawl = [
  'The Sengoku era. Lords devour lords, and the land devours the poor.',
  'In Kasugai Province the granaries are full, and the people starve.',
  'In the shadow of Kokaku Castle stands a humble shop, the Jubako-ya.',
  'It sells lunchboxes to the lord\'s household. Every box has two tiers.',
  'So does the shop.'
];
Story.lines = {
  // ---- the Trial (Granny teaches by doing) ----
  t_move: 'Walk softly. A guard hears your feet before he sees your face.',
  t_fence: 'Over the fence. A ninja does not use the gate.',
  t_ki: 'The gauge in your belly is your ki. When it shouts, you whisper.',
  t_bamboo: 'Bamboo hides a crouching child. It does not hide a strolling fool.',
  t_mark: 'Ume walks the grove with her lantern. Come up behind her. Take her token with a Silent Mark.',
  t_mark_done: 'One. Do not smile. Smiles are loud.',
  t_swim: 'Kiku guards the koi pond. Swim. Dive under. Pull her in from the water.',
  t_roof: 'The roof is a road for those with a rope. Hook the storehouse.',
  t_above: 'Masa stands below the kura\'s edge. Drop on her from above.',
  t_tools: 'Big Daikon eats anything. Pull him off his post with a firecracker, then leave him a rice ball.',
  t_herb: 'I swapped the poison for a sleeping herb. This is a trial, not a funeral.',
  t_front: 'He sleeps. Now the front cut. Even a sleeping radish deserves respect.',
  t_smoke: 'Lanterns have found you. Smoke, and gone. Do not stand there admiring it.',
  t_spar: 'Brother Ittetsu waits in the gravel ring. Block. Parry. Roll. Then strike.',
  t_return: 'Enough. Come back to the porch.',
  t_end: 'Your rice is cooked. Whether it is seasoned, the world will decide.',
  t_hungry: 'Hungry men are careless men.',
  ittetsu_intro: 'Ha! The old woman sends me children. Draw, little dumplings.',
  ittetsu_defeat: '...Well struck. She was right about you.',
  // ---- Rice and Ash ----
  m1_start: { sojiro: 'The canal is quiet. The magistrate is not.', kaede: 'Smell that? Roast eel. He eats while the town boils grass.' },
  m1_inside: 'The compound wall. Inside, the feast hall. Kanemori eats with his back to the garden.',
  gonroku_intro: 'The magistrate pays me by the bowl. Tonight, I eat well.',
  gonroku_phase2: 'RAAAH! Stand still, mosquito!',
  gonroku_defeat: 'The rice... was always... his...',
  kanemori_cornered: 'W-wait! I only followed orders! The man with the iron seal promised me a castle!',
  m1_kill: { sojiro: 'Heaven was too slow.', kaede: 'You should have shared.' },
  m1_ledger: 'A letter, sealed in black iron. Granny will want this.',
  m1_escape: 'The boat waits at the west end of the canal.',
  // ---- The Fort at Kiri Lake ----
  m2_start: { sojiro: 'Rain. Good. Rain eats footsteps.', kaede: 'Rain. Wonderful. My boots are rice porridge.' },
  m2_cage: 'A bamboo cage by the storehouses. That shape inside is either Tobei or a sack of turnips.',
  tobei_freed: 'You came! I knew you would. I mean, I hoped. I mean... is that a rice ball?',
  m2_gate: 'The water gate. The lever inside opens it. Tobei swims like a stone, but he can wade.',
  m2_barges: 'The rice barges. Cut the ropes and the river carries them to the villages.',
  hotaru_intro: 'The Jubako-ya sends its children to fetch its fool. How sweet. Like bean paste.',
  hotaru_phase2: 'Which of me will you cut?',
  hotaru_clones: 'Which of me will you cut?',
  hotaru_defeat: 'Hm. Sharper than you look. Tell your grandmother: on the night of the full moon, your lord drinks his last.',
  // ---- Moon over Kokaku ----
  m3_start: { sojiro: 'The moat. Then the wall. Then the sake. Then him.', kaede: 'A moon-viewing. Everyone looking up. Nobody looking down.' },
  m3_bailey: 'The festival garden. Nobles, servants, lanterns. Three of the servants walk like ninja. Focus your ki to see them.',
  m3_swapped: 'The flask is swapped. The lord will drink plain sake and complain about it. Now, up.',
  m3_keep: 'The keep. Three tiers. A man like Kurogane always waits at the top.',
  kurogane_intro: 'Little boxes. Do you know what a lord is? A mouth. Feed it fear, and it rules a hundred years. Takanori feeds it rice. I will be the new mouth. ...Shuten. Wake.',
  kurogane_phase2: 'THE MOON... TASTES OF IRON!',
  kurogane_defeat: 'The mask... was hungrier... than I...',
  m3_timer: 'The lord raises his cup...',
  // ---- the round ----
  d_start: 'Sakubei the rice broker counts his coins by the canal. Silence him and leave by the canal gate.',
  d_target: 'The broker is down. Now the canal gate.'
};
Story.scenes = {
  prologue: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI], ['other', 55, Math.PI]], steps: [
    ['say', 'granny', 'Rice that is never tested is only seed. Tonight, you two are tested.'],
    ['say', 'kaede', 'Finally. Six years of folding boxes.'], ['say', 'sojiro', '...We are ready, Master.'],
    ['pose', 'granny', 'tap'], ['say', 'granny', 'Ready? The rice says when it is ready. Not the cook. Go.']] },
  training_end: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Your rice is cooked. Whether it is seasoned, the world will decide.'],
    ['say', 'hero', { sojiro: 'I will not shame the shop.', kaede: 'Seasoned. Ha. I am practically pickled.' }],
    ['say', 'granny', 'Tomorrow the lord sends for a delivery. Wash your hands. Sharpen your knives.']] },
  briefing1: { bg: 'garden', music: 'shop', cast: [['takanori', -30, 0], ['kuroganeRobe', -60, 0], ['granny', 40, Math.PI]], steps: [
    ['say', 'takanori', 'Magistrate Kanemori swears the harvest failed. Yet his storehouses groan with rice.'],
    ['say', 'kuroganeRobe', 'My lord, Kanemori has served your house for twenty years. To accuse without proof is--'],
    ['say', 'takanori', 'Enough, Kurogane. Leave us.'], ['exit', 'kuroganeRobe'],
    ['say', 'takanori', 'Grandmother. The law cannot reach him. Can your boxes?'],
    ['say', 'granny', 'Every box reaches its table, my lord.'],
    ['say', 'granny', 'He feasts tonight by the canal. He will not finish his meal. And bring me any letter he keeps. A man who hides rice also hides paper.'],
    ['say', 'hero', { sojiro: 'It will be done.', kaede: 'He will not even taste dessert.' }]] },
  debrief1: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Black iron. Kurogane\'s seal.'],
    ['say', 'granny', 'The rice was sold to the Red Lanterns. Sake-house ninja. They are paid in silver, and they pay in poison.'],
    ['say', 'hero', { sojiro: 'The lord\'s own chamberlain.', kaede: 'The man who bowed so nicely in the garden.' }],
    ['say', 'granny', 'Tobei carried a copy to the lake. He has not come home.']] },
  debrief1_noletter: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'No letter. Then we guess. A magistrate does not grow this fat on his own.'],
    ['say', 'granny', 'Tobei went to Kiri Lake to listen. He has not come home.']] },
  briefing2: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Tobei is a fool with good feet. The Red Lanterns hold him at Kiri Lake. Bring him home.'],
    ['say', 'kaede', 'And the rice barges?'],
    ['say', 'granny', 'Rice belongs in bellies, not in a traitor\'s war chest. Cut them loose. The river knows the way to the villages.'],
    ['say', 'sojiro', 'Tobei first. Then the rice.']] },
  debrief2: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['tobei', 0, Math.PI], ['hero', 40, Math.PI]], steps: [
    ['say', 'tobei', 'I told them nothing! Mostly because I know nothing. But I said it bravely.'],
    ['say', 'hero', 'Hotaru said the lord drinks his last on the night of the full moon.'],
    ['say', 'granny', 'The moon-viewing. Tomorrow night.']] },
  briefing3: { bg: 'shop', music: 'shop', cast: [['granny', -40, 0], ['hero', 30, Math.PI]], steps: [
    ['say', 'granny', 'Kurogane hosts the moon-viewing. The Red Lanterns pour the sake. Find the poisoned flask before the lord raises his cup.'],
    ['say', 'granny', 'Then go up. A man like Kurogane always waits at the top.'],
    ['say', 'sojiro', 'And if he wears the castle\'s colors?'], ['say', 'granny', 'Then cut through the colors.'],
    ['say', 'kaede', { sojiro: 'Bring me back a moon cake.', kaede: 'If there are moon cakes, I am taking one.' }]] },
  m3_fail: { bg: 'teahouse', music: null, cast: [['takanori', -20, 0]], steps: [['pose', 'takanori', 'toast'], ['say', 'takanori', 'The moon is generous tonight. A cup to its health...'], ['caption', 'The lord raises his cup... The Red Lanterns have won.']] },
  ending: { bg: 'town', music: 'ending', cast: [['takanori', -30, 0], ['granny', 30, Math.PI]], steps: [
    ['caption', 'Dawn. Lord Takanori opens the granaries of Kokaku.'],
    ['pose', 'takanori', 'toast'], ['say', 'takanori', 'Every bowl in Kasugai will be full by the next moon. See that it is, Grandmother.'],
    ['say', 'granny', 'Rice goes where it is carried, my lord.']] },
  ending2: { bg: 'shop', music: 'ending', cast: [['granny', -40, 0], ['hero', 25, Math.PI], ['other', 50, Math.PI]], steps: [
    ['say', 'granny', 'Black lacquer. The clan\'s crest. You are apprentices no longer.'],
    ['say', 'granny', 'You are Lunchbox Assassins. Seen by none.'],
    ['say', 'kaede', '...Fed by all.'], ['pose', 'sojiro', 'bow'], ['wait', 1.2]] },
  postcredits: { bg: 'sakehouse', music: null, cast: [['hotaru', 0, Math.PI / 2]], steps: [
    ['caption', 'A sake house with red lanterns.'],
    ['say', 'hotaru', 'Two tiers... Then I shall be the lid.']] }
};
Story.barks = {
  idle: ['Another cold night...', 'The barracks rice tastes of sand.', 'When does my watch end?', 'Haaah... (yawn)', 'My feet hurt.', 'My mother said: be a monk. Monks eat.', 'Is that the moon or a rice cake? I am too hungry to know.'],
  chat: ['Did you hear? The magistrate has eel tonight.', 'Eel. And we get millet.', 'Keep your voice down.', 'They say the Red Lanterns pay in silver.', 'Silver does not fill a belly.'],
  notice: ['Hm? What was that?', 'Is someone there?', 'A cat...?', 'Did that shadow move?'],
  search: ['Show yourself!', 'I know I heard something.', 'Check the shadows!', 'Come out, little rat.'],
  lost: ['...Must have been the wind.', 'Bah. My eyes play tricks.', 'Nothing. Back to my post.', 'Too much sake last night.'],
  alert: ['Intruder!', 'Ninja! Over here!', 'Sound the bell!', 'There! Get him!'],
  bell: ['To the bell!', 'Ring the alarm!'],
  body: ['He\'s... dead?!', 'Assassin! Wake the garrison!', 'Who did this?!'],
  bait: ['Oh? A rice ball... nobody will miss it.', 'Free food? Heaven is kind tonight.', 'Just one bite...'],
  poisoned: ['Ugh... my stomach...', 'This rice... is... wrong...'],
  sleepy: ['So... sleepy...', 'Just... resting... my eyes...'],
  hurt: ['Ngh--', 'M-mother...', 'Gah!', 'Hrk...'],
  civilian: ['Eek! Murderer!', 'Please, spare me!', 'Guards! Guards!', 'Help! A ninja!'],
  civIdle: ['Such a pretty night.', 'The rice price went up again.', 'Are the lanterns not lovely?', 'Hush, the guards can hear you.'],
  drunk: ['Another bowl! ...Where is the bowl?', 'I can see two moons. Lucky me.', 'Sing with me! No? Rude.'],
  kanemori: ['More eel! And the good sake!', 'Rice is for those who can pay.', 'Let them eat bark. Bark is free.'],
  tobei: ['Waiting. Quietly. Like a pickle in a jar.', 'Is that a rice ball? ...Later. Yes. Later.', 'I am being very brave right now.', 'My feet are wet. I am fine. Go on.'],
  tobeiWait: ['Waiting. Quietly. Like a pickle in a jar.', 'I will be a rock. A frightened rock.'],
  tobeiFollow: ['Following!', 'Right behind you. Not too close. Is this too close?'],
  tobeiFreed: ['You came! I knew you would.'],
  unmask: ['A Jubako rat.', 'Your lunch is over.', 'You saw through me? Then see this!'],
  ninja: ['A Jubako rat.', 'Your lunch is over.']
};
Story.results = { 'Grand Kaiseki': 'Not one grain out of place.', Makunouchi: 'Well packed.', Ekiben: 'Edible.', Hinomaru: 'Plain rice and one plum. Hm.', Leftovers: 'Even the dogs would refuse this box.' };
/** a line by id or the text itself, the variant for this character */
Story.text = (id, char) => { const t = Story.lines[id] !== undefined ? Story.lines[id] : id; return typeof t === 'object' && t ? (t[char] || t.sojiro) : t; };
Story.speaker = (id, char) => { if (id === 'hero') id = char; if (id === 'other') id = char === 'kaede' ? 'sojiro' : 'kaede'; return Object.assign({ id }, Story.speakers[id] || Story.speakers.granny); };
B.Story = Story;

/* ---- 63-cutscene.js ---- */
/* ---- CUTSCENES: a scene that stages rigs on a painted backdrop and plays a script (say, pose, exit, caption, wait),
 * E.Dialog with live portraits and gibberish voices; hold Start / Esc to skip a scene, confirm finishes a page. In play:
 * radio lines (non-modal, a portrait at the top), modal dialogs, and barks over an actor's head ---- */
const Cutscene = { queue: [], speaker: null, rigs: {}, holdT: 0 };
const TEXT_SPEED = { normal: 50, slow: 30, fast: 95 };
Cutscene.talk = new E.Dialog(game, { voice: null, bg: ['#2a1414', '#140a0a'], border: '#e8b04a', nameColor: '#e8b04a', lines: 3 });
Cutscene.rig = (id, char) => { const S = Story.speaker(id, char); const key = S.id; if (!Cutscene.rigs[key]) { Cutscene.rigs[key] = Rigs.make(S.rig, S.arg); Cutscene.rigs[key].update(0, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); } return Cutscene.rigs[key]; };
Cutscene.speed = () => TEXT_SPEED[game.settings.textSpeed] || 50;
/** a radio line in play: the speaker's portrait at the top, turning by itself, play goes on */
Cutscene.radio = (speaker, text, auto) => {
  if (!text) return; const char = (B.M && B.M.char) || 'sojiro', S = Story.speaker(speaker, char);
  Cutscene.queue.push({ S, text: Story.text(text, char), auto: auto || clamp(1.8 + String(text).length / 26, 2.5, 6), modal: false, place: 'top' });
};
/** a modal dialog: [[speaker, text], ...]; play waits until it closes */
Cutscene.dialog = (lines, char) => { for (const [sp, tx] of lines) Cutscene.queue.push({ S: Story.speaker(sp, char), text: Story.text(tx, char), modal: true }); };
/** a bark over an actor (a boss's line): a bubble, the voice, and a radio line at the top */
Cutscene.bark = (a, text, voice, dur) => {
  if (!text) return; const say = { text, t: dur || clamp(1.5 + text.length / 24, 2, 5) }; B.Voice.say(text, voice || a.voice || 'guard', { vol: .9 });
  if (a.kind !== 'boss') a.say = say; else a.said = say;
  const S = a.kind === 'boss' ? Story.speaker(a.id === 'kurogane' && a.phase ? 'oni' : a.id, (B.M && B.M.char) || 'sojiro') : null;
  if (S && S.name) { Cutscene.queue = Cutscene.queue.filter(q => q.modal); Cutscene.talk.close(); Cutscene.queue.push({ S, text, auto: say.t, modal: false, place: 'top', silent: true }); }
};
Cutscene.busy = () => Cutscene.talk.open && Cutscene.talk.modal;
/** each step: open the next queued line, voice the one typing; returns true while a modal one holds play */
Cutscene.update = dt => {
  const t = Cutscene.talk;
  if (!t.open && Cutscene.queue.length) {
    const q = Cutscene.queue.shift(); Cutscene.speaker = q;
    t.speed = Cutscene.speed(); t.lines = q.modal ? 3 : 2;
    t.say(q.text, { name: q.S.name, portrait: Cutscene.rig(q.S.id, (B.M && B.M.char) || 'sojiro'), modal: q.modal, auto: q.auto, place: q.place || 'bottom', portraitSize: q.modal ? 40 : 28 });
  }
  if (t.open && Cutscene.speaker && !Cutscene.speaker.silent) B.Voice.dialogStep(t, Cutscene.speaker.S.voice);
  return t.update(dt);
};
Cutscene.clear = () => { Cutscene.queue = []; Cutscene.talk.close(); };
Cutscene.draw = r => { if (Cutscene.talk.open) Cutscene.talk.draw(r); };
/** play a story scene, then call done (or go to a scene) */
Cutscene.play = (id, char, done) => game.go('story', { id, char, done }, { fade: 'dissolve' });

/* ---- the painted rooms behind a story scene ---- */
const BACKDROPS = {
  shop: new E.Backdrop({ sky: ['#1a0e0a', '#2a1810', '#3a2216'], stars: 0, layers: [] }),
  garden: new E.Backdrop({ sky: ['#0a0e24', '#1a2248', '#2a3460'], moon: { x: .78, y: .22, r: 18, color: '#f4ecd0' }, stars: 60, starsY: .6, layers: [{ kind: 'mountains', color: '#141a34', y: .62, height: .2, parallax: 0 }, { kind: 'forest', color: '#0e1424', y: .78, height: .14, parallax: 0 }] }),
  teahouse: new E.Backdrop({ sky: ['#0a0a20', '#1a1a3a', '#2a2448'], moon: { x: .5, y: .2, r: 30, color: '#fff4d8' }, stars: 40, layers: [{ kind: 'castle', color: '#10142a', y: .7, height: .36, parallax: 0 }] }),
  town: new E.Backdrop({ sky: ['#3a2a4a', '#c86a4a', '#f0b070'], sun: { x: .25, y: .7, r: 16, color: '#ffe0a0' }, stars: 0, layers: [{ kind: 'castle', color: '#3a2434', y: .66, height: .4, parallax: 0 }, { kind: 'city', color: '#2a1a24', y: .82, height: .2, parallax: 0 }] }),
  sakehouse: new E.Backdrop({ sky: ['#140608', '#2a0a10', '#3a1018'], stars: 0, layers: [] }),
  roof: new E.Backdrop({ sky: ['#06081a', '#141a3a', '#2a2a50'], moon: { x: .5, y: .25, r: 40, color: '#fff4d8' }, stars: 80, layers: [{ kind: 'mountains', color: '#0e1228', y: .7, height: .2, parallax: 0 }] })
};
/** the room's painted interior (screen pixels): shoji, stacked lunchboxes, a lantern, tatami */
const paintRoom = (r, kind, over, flK = .78) => (over ? r.overlay.bind(r) : f => f(r.ctx))(g => {
  const W = r.W, H = r.H, fl = Math.round(H * flK);
  if (kind === 'shop' || kind === 'sakehouse') {
    const wall = kind === 'shop' ? '#3a2418' : '#2a0e12';
    px.rect(g, 0, 0, W, fl, wall);
    for (let x = 6; x < W; x += 54) { px.rect(g, x, 18, 44, fl - 40, kind === 'shop' ? '#d8c8a0' : '#5a1a1a'); for (let k = 1; k < 4; k++) px.rect(g, x + k * 11, 18, 1, fl - 40, '#4a3020'); for (let y = 30; y < fl - 22; y += 16) px.rect(g, x, y, 44, 1, '#4a3020'); px.rect(g, x - 3, 14, 50, 4, '#2a1810'); }
    px.rect(g, 0, fl - 22, W, 4, '#2a1810');
    if (kind === 'shop') for (let i = 0; i < 4; i++) { const x = W - 70 + (i % 2) * 18, y = fl - 30 - Math.floor(i / 2) * 14; px.rect(g, x, y, 16, 12, i % 2 ? '#8a1c1c' : '#1e1616'); px.rect(g, x, y + 5, 16, 2, '#e8b04a'); }
    const lx = Math.round(W * .5), ly = 16; px.blend(g, .35, 'add', () => px.disc(g, lx, ly + 18, 44, '#ff9a40')); px.rect(g, lx - 1, 0, 2, ly, '#2a1810'); px.disc(g, lx, ly + 10, 8, kind === 'shop' ? '#f4ead5' : '#e83a2a'); px.rect(g, lx - 6, ly + 1, 12, 2, '#1e1616'); px.rect(g, lx - 6, ly + 17, 12, 2, '#1e1616');
    for (let x = 0; x < W; x += 32) { px.rect(g, x, fl, 32, H - fl, '#8a8040'); px.rect(g, x, fl, 1, H - fl, '#4a4020'); } px.rect(g, 0, fl, W, 2, '#4a3a20');
  } else if (kind === 'garden') {
    px.rect(g, 0, fl, W, H - fl, '#1e2a1e'); for (let x = 0; x < W; x += 6) px.dot(g, x + (x * 7) % 5, fl + 4 + (x * 13) % 18, '#2e3e2a');
    for (const x of [30, W - 40]) { px.rect(g, x - 2, fl - 26, 4, 26, '#5a5a62'); px.rect(g, x - 7, fl - 32, 14, 6, '#6a6a72'); px.rect(g, x - 4, fl - 28, 8, 4, '#ffb060'); px.blend(g, .3, 'add', () => px.disc(g, x, fl - 26, 22, '#ff9a40')); }
  } else if (kind === 'teahouse') { px.rect(g, 0, fl, W, H - fl, '#4a3a28'); for (let x = 0; x < W; x += 12) px.rect(g, x, fl, 1, H - fl, '#2a2018'); for (let x = 20; x < W; x += 60) { px.disc(g, x, 30, 6, '#e8603a'); px.blend(g, .3, 'add', () => px.disc(g, x, 30, 16, '#ff9a40')); } }
  else if (kind === 'town') { px.rect(g, 0, fl, W, H - fl, '#5a4a3a'); for (let i = 0; i < 9; i++) { const x = 20 + i * Math.round((W - 40) / 8); px.rect(g, x - 3, fl - 16, 6, 14, '#3a2a20'); px.disc(g, x, fl - 20, 4, '#e8c8a0'); px.rect(g, x - 5, fl - 6, 10, 3, '#1a1414'); } }
  else if (kind === 'roof') { px.rect(g, 0, fl, W, H - fl, '#2a3040'); for (let x = 0; x < W; x += 6) px.rect(g, x, fl, 1, H - fl, '#1a2030'); }
});
/* ---- the story scene: rigs on a floor line in the side view, the script, the dialog ---- */
const storyScene = {
  view: 'side', res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d; const S = Story.scenes[d.id]; this.S = S; this.i = 0; this.wait = 0; this.cap = null; this.capT = 0; this.done = false; this.hold = 0; this.exiting = {};
    Cutscene.clear(); game.follow(null); game.cam.bounds = null; Lt.enabled = false; game.lights.enabled = false;
    if (S && S.music !== undefined) B.Music.play(S.music); else if (S && S.music === null) B.Music.play(null);
    this.cast = (S ? S.cast : []).map(([id, x, f]) => { const sp = Story.speaker(id, d.char), rig = Rigs.make(sp.rig, sp.arg); return { id: sp.id, x, f, rig, pose: null, alpha: 1, sp }; });
    this.step();
  },
  step() {
    const S = this.S; if (!S) { this.finish(); return; }
    while (this.i < S.steps.length) {
      const st = S.steps[this.i++], [k, a, b] = st;
      if (k === 'say') { const sp = Story.speaker(a, this.d.char), txt = Story.text(b, this.d.char); if (!txt) continue; Cutscene.queue.push({ S: sp, text: txt, modal: true }); this.talker = sp.id; return; }
      if (k === 'pose') { const c = this.cast.find(c => c.id === (a === 'hero' ? this.d.char : a)); if (c) { c.pose = b; c.poseT = 0; if (b === 'tap') Au.sfx('stepWood', { vol: .6 }); } continue; }
      if (k === 'exit') { const c = this.cast.find(c => c.id === Story.speaker(a, this.d.char).id); if (c) c.leaving = true; continue; }
      if (k === 'caption') { this.cap = a; this.capT = 0; this.wait = 2.6; return; }
      if (k === 'wait') { this.wait = a; return; }
    }
    this.finish();
  },
  finish() { if (this.done) return; this.done = true; Cutscene.clear(); const d = this.d; if (typeof d.done === 'function') d.done(); else if (d.done) game.go(d.done.scene, d.done.data); else game.go('title'); },
  update(dt) {
    B.pollInput();
    const I = game.input;
    if (I.down('start') || I.down('pause')) { this.hold += dt; if (this.hold > .6) { this.finish(); return; } } else this.hold = 0;
    if (this.cap) this.capT += dt;
    if (this.wait > 0) { this.wait -= dt; if (I.pressed('confirm') && this.cap) this.wait = 0; if (this.wait <= 0) { this.cap = null; this.step(); } }
    else if (!Cutscene.update(dt) && !Cutscene.talk.open && !Cutscene.queue.length) this.step();
    for (const c of this.cast) {
      if (c.leaving) { c.x -= dt * 60; c.alpha = Math.max(0, c.alpha - dt); }
      const talking = Cutscene.talk.open && Cutscene.speaker && Cutscene.speaker.S.id === c.id;
      c.poseT = (c.poseT || 0) + dt; c.rig._post = c.pose === 'bow' ? Rigs.bow(Math.min(1, c.poseT * 2)) : c.pose === 'tap' ? Rigs.paddleTap(c.poseT) : c.pose === 'toast' ? Rigs.toast(Math.min(1, c.poseT * 1.5)) : null;
      c.rig.update(dt, { x: c.x, y: 0, z: 0, facing: c.f, vx: c.leaving ? -60 : 0, vy: 0, expr: talking && c.sp.id === 'kurogane' ? 'angry' : undefined, pose: c.pose === 'kneel' ? 'kneel' : undefined });
    }
    game.focus(0, 0, (game.H / 2 - game.H * .34) / -game.view.bz);   // the cast's feet on the room's floor line, above the dialog
  },
  draw(r) {
    const S = this.S, bg = S ? S.bg : 'shop';
    (BACKDROPS[bg] || BACKDROPS.shop).draw(r); paintRoom(r, bg, false, .66);
    for (const c of this.cast) if (c.alpha > .02) r.actor(c.x, 0, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { alpha: c.alpha });
    for (const c of this.cast) if (c.pose === 'toast') { const h = c.rig.hand('R'); r.queue(h[0], 0, h[2] + 1, g => { const p = r.w(h[0], 0, h[2] + 1); px.rect(g, p[0] - 2, p[1] - 3, 4, 3, '#f4ead5'); px.rect(g, p[0] - 2, p[1] - 3, 4, 1, '#c8c0b0'); }, { bias: 2 }); }   // the sake cup
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, 14, '#000'); px.rect(g, 0, r.H - 6, r.W, 6, '#000');
      if (this.cap) { const a = clamp(this.capT * 2, 0, 1); px.blend(g, a, 'normal', () => E.font.text(g, this.cap, r.W / 2, Math.round(r.H * .3), '#f4ead5', { align: 'center', shadow: '#000', outline: false, wrap: r.W - 40 })); }
      Glyph.text(g, 'Hold {a:start} to skip', 6, 4, '#b8a890', {});
      if (this.hold > 0) E.ui.bar(g, 6, 12, 60, 2, this.hold / .6, '#e8b04a');
    });
    Cutscene.draw(r);
  }
};
B.Cutscene = Cutscene; B.storyScene = storyScene; B.BACKDROPS = BACKDROPS; B.paintRoom = paintRoom;

/* ---- 64-levels-training.js ---- */
/* ---- LEVELS are data (the Workshop edits and exports the same JSON). LG builds a level's rows from rectangles, so a
 * campaign map reads as its plan. Legend: . earth , grass " bamboo : gravel = boards _ tatami + paving ~ deep water
 * - shallow  # castle wall (56)  W compound wall (30)  F bamboo fence (14)  H hall wall (40)  d doorway  A townhouse (40)
 * B inn (64)  C storehouse (48)  D shop (40)  S shrine (56)  T tower (80)  G K M keep tiers (64 112 160)  P planter (10)
 * R rocks (20). Actors, lights and props are lists, never letters in the rows ---- */
const LG = (w, h, fill = '.') => {
  const g = Array.from({ length: h }, () => Array(w).fill(fill));
  const L = {
    w, h, g,
    rect(x0, y0, x1, y1, ch) { for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g[y][x] = ch; return L; },
    frame(x0, y0, x1, y1, ch) { for (let x = x0; x <= x1; x++) { L.set(x, y0, ch); L.set(x, y1, ch); } for (let y = y0; y <= y1; y++) { L.set(x0, y, ch); L.set(x1, y, ch); } return L; },
    set(x, y, ch) { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = ch; return L; },
    rows() { return g.map(r => r.join('')); }
  };
  return L.frame(0, 0, w - 1, h - 1, '#');
};
B.LG = LG;
(() => {
  const L = LG(40, 28);
  L.rect(1, 1, 10, 4, 'A');                       // the Jubako-ya (its back porch faces the yard)
  L.rect(3, 8, 4, 9, 'P'); L.rect(8, 9, 9, 9, 'P');   // planters
  L.rect(1, 12, 14, 12, 'W');                     // the yard's low south wall (climb it)
  L.rect(14, 1, 14, 11, 'F');                     // the bamboo fence (vault it)
  L.rect(15, 1, 19, 4, ','); L.rect(20, 1, 37, 9, '"'); L.rect(26, 3, 28, 6, '.'); L.rect(21, 6, 34, 7, '.');   // tall grass, the bamboo grove and its path
  L.rect(16, 14, 26, 19, '~'); L.rect(15, 14, 15, 19, '-'); L.rect(17, 20, 25, 20, '-');   // the koi pond
  L.rect(31, 14, 36, 18, 'C');                    // the kura storehouse
  L.rect(2, 16, 12, 25, ':');                     // the raked-gravel sparring ring
  L.rect(1, 15, 1, 26, ','); L.rect(28, 22, 38, 26, '+');
  L.rect(13, 21, 14, 26, '.');
  B.def('level', 'training', { id: 'training', name: 'The Trial of the Second Tier', size: [40, 28], time: 'dusk', faction: 'trial', rows: L.rows(), music: 'training', weather: 'petals', par: 420,
    zones: [{ id: 'yard', rect: [1, 5, 13, 11], name: 'The back yard' }, { id: 'grove', rect: [15, 1, 38, 10], name: 'The bamboo grove' }, { id: 'pond', rect: [15, 13, 27, 21], name: 'The koi pond' }, { id: 'kura', rect: [29, 13, 38, 21], name: 'The storehouse' }, { id: 'ring', rect: [1, 15, 13, 26], name: 'The gravel ring' }],
    lights: [{ at: [5, 5], kind: 'paperLantern', r: 60, i: .8 }, { at: [9, 5], kind: 'paperLantern', r: 60, i: .8 }, { at: [17, 12], kind: 'stoneLantern', r: 56 }, { at: [29, 12], kind: 'stoneLantern', r: 56 },
      { at: [28, 20], kind: 'stoneLantern', r: 64 }, { at: [13, 16], kind: 'stoneLantern', r: 60 }, { at: [13, 24], kind: 'stoneLantern', r: 60 }, { at: [38, 23], kind: 'torch', r: 70 }, { at: [2, 6], kind: 'window', r: 40, i: .6, z: 14 }],
    props: [['jubako', 7, 5, { facing: 1.57, dy: -2 }], ['sakeBarrel', 2, 6], ['riceBale', 11, 6, { facing: .3 }], ['riceBale', 11, 7, { facing: -.2 }], ['waterBarrel', 12, 10], ['cherry', 7, 11], ['bonsaiPine', 2, 10],
      ['steppingStones', 6, 7], ['steppingStones', 16, 11], ['cherry', 22, 12], ['persimmonTree', 29, 21], ['strawMat', 34, 23], ['mato', 38, 25], ['weaponRack', 3, 15, { facing: 1.57 }], ['dummy', 14, 23], ['dummy', 14, 25],
      ['taiko', 7, 26, { facing: -1.57 }], ['torii', 26, 11, { facing: 0 }], ['bamboo', 25, 2, { params: { seed: 4, n: 5 } }], ['bonsaiPine', 38, 13], ['riceBale', 37, 19], ['riceBale', 38, 19], ['nobori', 1, 13, { color: '#3e5a32' }], ['nobori', 12, 26, { color: '#c8342a' }]],
    anchors: [[29, 21, 40, 31, 24]],
    hero: { at: [5, 6], z: 0, facing: 90 }, exit: { at: [5, 6], r: 1.5 },
    npcs: [{ id: 'granny', rig: 'granny', at: [6, 5], facing: 90 }],
    guards: [
      { id: 'ume', type: 'disciple', color: '#3e6a3a', at: [27, 6], mode: 'patrol', lantern: true, mark: true, route: [[24, 7, 1], [33, 7, 1.5, 0], [33, 6, 0], [24, 6, 1, 180]], loop: true },
      { id: 'kiku', type: 'disciple', color: '#2a4a7a', at: [27, 16], facing: 0, mode: 'post', mark: true },
      { id: 'masa', type: 'disciple', color: '#6a4a2a', at: [33, 20], facing: 90, mode: 'post', mark: true },
      { id: 'daikon', type: 'daikon', at: [36, 24], facing: 180, mode: 'post', mark: true }],
    bells: [], barracks: [[39, 24]],
    pickups: [{ id: 'cracker', kind: 'tool', tool: 'firecracker', n: 2, at: [30, 22] }, { id: 'riceT', kind: 'tool', tool: 'poisonball', n: 1, at: [31, 24] }],
    boss: { id: 'ittetsu', at: [7, 21], facing: 270, arena: [2, 16, 12, 25] },
    objectives: [
      { id: 'vault', type: 'flag', flag: 'vaulted', text: 'Vault the bamboo fence' },
      { id: 'ume', type: 'assassinate', target: 'ume', after: ['vault'], text: 'Silent Mark: Ume, from behind' },
      { id: 'kiku', type: 'assassinate', target: 'kiku', after: ['ume'], text: 'Silent Mark: Kiku, from the water' },
      { id: 'roof', type: 'reach', zone: [31, 14, 36, 18], z: 48, after: ['kiku'], text: 'Grapple onto the storehouse roof' },
      { id: 'masa', type: 'assassinate', target: 'masa', after: ['roof'], text: 'Silent Mark: Masa, from above' },
      { id: 'daikon', type: 'assassinate', target: 'daikon', after: ['masa'], text: 'Lure Big Daikon, put him to sleep, mark him' },
      { id: 'smoke', type: 'flag', flag: 'used_smoke', after: ['daikon'], text: 'Spotted! Smoke, and slip away' },
      { id: 'spar', type: 'defeat', boss: 'ittetsu', after: ['smoke'], text: 'Spar with Brother Ittetsu' },
      { id: 'return', type: 'reach', after: ['spar'], text: 'Return to Granny on the porch' }],
    triggers: [
      { id: 't0', when: 'time:.5', do: [['say', 'granny', 't_move'], ['tutorial', 'Move and sneak', 'Run with {a:up}{a:left}{a:down}{a:right} or the stick. {a:crouch} crouches. Tilt the stick a little to walk.']] },
      { id: 't1', rect: [11, 1, 13, 11], do: [['say', 'granny', 't_fence'], ['tutorial', 'Jump, vault, climb', '{a:jump} jumps. Run at a low fence or wall and press {a:jump} to vault or climb it.']] },
      { id: 't2', rect: [15, 1, 19, 11], do: [['flag', 'vaulted'], ['say', 'granny', 't_ki'], ['tutorial', 'The Ki Gauge', 'Bottom left: how near the nearest guard is, colored by what they know. Hold {a:focus} to focus your ki and sense further.']] },
      { id: 't3', rect: [20, 1, 23, 9], do: [['say', 'granny', 't_mark'], ['tutorial', 'Silent Cut', 'Crouch in the bamboo. Come up behind Ume unseen and press {a:attack} when the prompt shows.']] },
      { id: 't4', when: 'objective:ume', do: [['say', 'granny', 't_mark_done'], ['checkpoint'], ['say', 'granny', 't_swim']] },
      { id: 't5', rect: [15, 13, 27, 21], do: [['tutorial', 'Swim and dive', 'In deep water you swim. {a:crouch} dives: unseen, but your breath runs out. Near a guard on the bank, {a:attack} pulls them in.']] },
      { id: 't6', when: 'objective:kiku', do: [['checkpoint'], ['say', 'granny', 't_roof'], ['tutorial', 'The grappling hook', 'Face a roof edge and tap {a:grapple}. Hold it to aim. Only the rope reaches the roofs.']] },
      { id: 't7', when: 'objective:roof', do: [['say', 'granny', 't_above']] },
      { id: 't8', when: 'objective:masa', do: [['checkpoint'], ['say', 'granny', 't_tools'], ['tutorial', 'Tools', 'Pick a tool with {a:toolPrev} {a:toolNext} (or the wheel, 1-8). {a:useTool} throws it. A firecracker pulls a guard to look; a rice ball left on the ground feeds him.']] },
      { id: 't9', when: 'objective:masa', do: [['say', 'granny', 't_herb'], ['flag', 'sleepHerb']] },
      { id: 't10', when: 'objective:daikon', do: [['checkpoint'], ['flag', 'used_smoke', false], ['give', 'smoke', 1], ['spawn', { id: 'lb1', type: 'disciple', color: '#5a3a5a', at: [16, 23], facing: 0, mode: 'post', lantern: true }], ['spawn', { id: 'lb2', type: 'disciple', color: '#5a3a5a', at: [16, 25], facing: 0, mode: 'post', lantern: true }], ['say', 'granny', 't_smoke'], ['tutorial', 'Smoke and slip away', 'Throw a smoke bomb with {a:useTool} (hold {a:block} to drop it at your feet). Inside the cloud nobody sees you.']] },
      { id: 't11', when: 'objective:smoke', do: [['remove', 'lb1'], ['remove', 'lb2'], ['say', 'granny', 't_spar'], ['tutorial', 'Fighting', '{a:attack} strikes in a combo. Hold {a:block} to block; press it just before a blow lands to parry, then {a:attack} ripostes. {a:block} + {a:jump} rolls.']] },
      { id: 't12', rect: [2, 16, 12, 25], when: 'objective:smoke', do: [['boss', 'ittetsu']] },
      { id: 't13', when: 'boss:ittetsu', do: [['say', 'granny', 't_return']] }],
    timer: null });
})();

/* ---- 64-levels-m1.js ---- */
/* ---- MISSION 1, "Rice and Ash": the castle town by the canal. North, Magistrate Kanemori's walled mansion (the gravel
 * court, the feast hall, the garden and his storehouse); the middle, the market square with its alarm bell; the south,
 * alleys and rooftops and the rice merchant's yard; the canal along the bottom (arrive east, leave by the west boat) ---- */
(() => {
  const L = LG(56, 48);
  // the mansion compound
  L.frame(2, 2, 46, 16, 'W');
  L.rect(3, 3, 20, 11, ':'); L.rect(3, 12, 20, 12, 'W');                    // the inner gravel court (Gonroku's), its closed south gate
  L.frame(21, 3, 39, 11, 'H'); L.rect(22, 4, 38, 10, '_'); L.set(21, 7, 'd'); L.set(30, 11, 'd');   // the feast hall
  L.rect(40, 3, 45, 11, '.'); L.rect(41, 4, 44, 7, 'C');                    // Kanemori's storehouse
  L.rect(3, 13, 20, 15, ','); L.rect(21, 12, 45, 15, ','); L.rect(5, 13, 9, 15, '~'); L.rect(26, 12, 34, 15, '+'); L.rect(30, 12, 30, 15, '+');
  L.rect(24, 16, 25, 16, 'd'); L.set(46, 9, 'd');                           // the front gate, the side door
  // the east strip and its watchtower
  L.rect(47, 1, 54, 16, '.'); L.rect(50, 4, 51, 5, 'T');
  // the market square
  L.rect(1, 17, 54, 30, '.'); L.rect(20, 18, 34, 29, '+');
  for (const [x, ch] of [[2, 'A'], [8, 'A'], [14, 'B'], [37, 'B'], [43, 'A'], [49, 'A']]) L.rect(x, 18, x + 3, 21, ch);
  for (const [x, ch] of [[2, 'D'], [8, 'A'], [14, 'D'], [37, 'D'], [43, 'A'], [49, 'D']]) L.rect(x, 25, x + 3, 28, ch);
  // the south: alleys, roofs, the rice merchant's yard
  for (const [x, ch] of [[2, 'A'], [9, 'B'], [15, 'A'], [21, 'C'], [28, 'A']]) L.rect(x, 31, x + 3, 34, ch);
  for (const [x, ch] of [[2, 'D'], [8, 'A'], [14, 'B'], [21, 'A'], [28, 'D']]) L.rect(x, 36, x + 3, 39, ch);
  L.frame(36, 31, 48, 38, 'W'); L.rect(37, 32, 47, 37, ':'); L.set(42, 31, 'd'); L.set(36, 35, 'd');
  L.rect(50, 32, 53, 35, 'A');
  L.rect(1, 40, 54, 40, ','); L.rect(1, 41, 54, 46, '~'); L.rect(1, 40, 3, 41, '='); L.rect(50, 40, 54, 41, '=');
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'm1', { id: 'm1', name: 'Rice and Ash', size: [56, 48], time: 'night', faction: 'kanemori', rows: L.rows(), music: 'm1', weather: 'petals', par: 720,
    zones: [{ id: 'court', rect: [3, 3, 20, 11], name: 'The inner court' }, { id: 'hall', rect: [21, 3, 39, 11], name: 'The feast hall' }, { id: 'garden', rect: [3, 12, 45, 15], name: 'The magistrate\'s garden' },
      { id: 'tower', rect: [47, 1, 54, 16], name: 'The east lane' }, { id: 'market', rect: [1, 17, 54, 30], name: 'The market square' }, { id: 'yard', rect: [36, 31, 48, 38], name: 'The rice merchant\'s yard' },
      { id: 'alleys', rect: [1, 31, 35, 39], name: 'The south alleys' }, { id: 'canal', rect: [1, 40, 54, 46], name: 'The canal' }],
    lights: [{ at: [12, 14], kind: 'stoneLantern' }, { at: [18, 14], kind: 'stoneLantern' }, { at: [37, 13], kind: 'stoneLantern' }, { at: [44, 14], kind: 'stoneLantern' }, { at: [30, 12], kind: 'paperLantern', r: 56 },
      { at: [26, 7], kind: 'paperLantern', r: 70, i: .9 }, { at: [35, 7], kind: 'paperLantern', r: 70, i: .9 }, { at: [22, 17], kind: 'torch', r: 72 }, { at: [27, 17], kind: 'torch', r: 72 },
      { at: [22, 20], kind: 'none', z: 22, r: 60, color: '#ffb060' }, { at: [32, 27], kind: 'none', z: 22, r: 60, color: '#ffb060' }, { at: [7, 23], kind: 'paperLantern' }, { at: [19, 23], kind: 'paperLantern' },
      { at: [36, 23], kind: 'paperLantern' }, { at: [48, 23], kind: 'paperLantern' }, { at: [12, 30], kind: 'paperLantern' }, { at: [34, 30], kind: 'paperLantern' }, { at: [10, 40], kind: 'stoneLantern' },
      { at: [30, 40], kind: 'stoneLantern' }, { at: [46, 40], kind: 'stoneLantern' }, { at: [42, 34], kind: 'torch', r: 56 }, { at: [6, 22], kind: 'window', r: 34, i: .5 }, { at: [16, 24], kind: 'window', r: 34, i: .5 },
      { at: [45, 22], kind: 'window', r: 34, i: .5 }, { at: [17, 35], kind: 'window', r: 30, i: .45 }],
    props: [P('kotatsu', 30, 7), P('folding', 30, 4), P('kotatsu', 25, 6, { facing: 1.57 }), P('jubako', 33, 6), P('sakeBarrel', 23, 5), P('sakeBarrel', 37, 5), P('strongbox', 42, 5, { z: 48, facing: 1.57 }),
      P('cherry', 4, 14), P('cherry', 16, 13), P('bonsaiPine', 43, 13), P('steppingStones', 11, 13), P('steppingStones', 28, 14), P('weaponRack', 4, 4, { facing: 1.57 }), P('weaponRack', 4, 9, { facing: 1.57 }), P('mato', 18, 4),
      P('yatai', 22, 20, { facing: 1.57 }), P('yatai', 32, 27, { facing: -1.57 }), P('hansho', 27, 22), P('sakeBarrel', 23, 22), P('sakeBarrel', 24, 22), P('cart', 34, 21, { facing: 1.2 }), P('riceBale', 21, 26), P('riceBale', 22, 26),
      P('nobori', 20, 18, { color: '#8a6a2a' }), P('nobori', 34, 18, { color: '#8a6a2a' }), P('nobori', 20, 29, { color: '#c8342a' }), P('waterBarrel', 13, 22), P('waterBarrel', 42, 24),
      P('riceBale', 38, 33), P('riceBale', 39, 33), P('riceBale', 38, 34), P('riceBale', 45, 36), P('riceBale', 46, 36), P('riceBale', 46, 35), P('cart', 41, 36), P('sack', 44, 33),
      P('boat', 53, 42), P('boat', 2, 42), P('mooringPost', 50, 40), P('mooringPost', 4, 40), P('nets', 20, 40), P('jubako', 52, 40), P('sakeBarrel', 26, 33), P('waterBarrel', 13, 35), P('cherry', 34, 40), P('cherry', 7, 30),
      P('stoneLantern', 0 + 47, 10), P('torii', 52, 12, { facing: 0 })],
    anchors: [],
    hero: { at: [53, 40], facing: 180 }, exit: { at: [2, 40], r: 1.5 },
    guards: [
      { id: 'court', type: 'ashigaru', at: [5, 4], mode: 'patrol', lantern: true, route: [[5, 4, 1], [18, 4, 1, 0], [18, 10, 1], [5, 10, 1, 180]] },
      { id: 'garden', type: 'ashigaru', at: [22, 13], mode: 'patrol', lantern: true, route: [[22, 13, 2, 270], [44, 13, 1], [44, 15, 1], [22, 15, 1]] },
      { id: 'hallguard', type: 'samurai', at: [24, 9], facing: 0, mode: 'post' },
      { id: 'gate1', type: 'ashigaru', at: [23, 17], facing: 90, mode: 'post' }, { id: 'gate2', type: 'ashigaru', at: [26, 17], facing: 90, mode: 'post' },
      { id: 'side', type: 'ashigaru', at: [47, 9], facing: 0, mode: 'post', lantern: true },
      { id: 'archer', type: 'archer', at: [50, 4], facing: 110, mode: 'post', lantern: true },
      { id: 'east', type: 'samurai', at: [48, 2], mode: 'patrol', route: [[48, 2, 1], [48, 15, 2, 90], [53, 15, 1], [53, 2, 1]] },
      { id: 'sam1', type: 'samurai', at: [21, 23], mode: 'patrol', route: [[21, 23, 1], [34, 23, 1], [34, 24, 1], [21, 24, 1]], partner: 'sam2' },
      { id: 'sam2', type: 'samurai', at: [22, 23], mode: 'patrol', route: [[22, 23, 1], [35, 23, 1], [35, 24, 1], [22, 24, 1]], partner: 'sam1' },
      { id: 'bellguard', type: 'ashigaru', at: [27, 21], facing: 90, mode: 'post' },
      { id: 'south1', type: 'ashigaru', at: [3, 35], mode: 'patrol', lantern: true, route: [[3, 35, 2], [33, 35, 2, 0]], loop: false },
      { id: 'south2', type: 'ashigaru', at: [26, 30], mode: 'patrol', route: [[26, 30, 1], [26, 39, 2, 90]], loop: false },
      { id: 'south3', type: 'ashigaru', at: [13, 39], facing: 270, mode: 'post' },
      { id: 'hound', type: 'hound', at: [38, 33], mode: 'patrol', route: [[38, 33, 1], [47, 33, 1], [47, 37, 1], [38, 37, 1]] }],
    civilians: [{ id: 'kanemori', type: 'kanemori', at: [30, 6], facing: 90, mode: 'sit', target: true }, { id: 'maid1', type: 'maid', i: 0, at: [27, 8], facing: 0 }, { id: 'maid2', type: 'maid', i: 1, at: [33, 8], facing: 180 },
      { id: 'drunk1', type: 'drunk', at: [22, 21], facing: 90 }, { id: 'drunk2', type: 'drunk', at: [31, 26], facing: 270, route: [[31, 26, 3], [33, 26, 4]] }],
    bells: [[27, 22]], barracks: [[25, 17]],
    pickups: [{ id: 'ledger', kind: 'story', at: [42, 5], z: 48, text: 'The letter with the black iron seal' }, { id: 'onigiri1', kind: 'tool', tool: 'riceball', n: 1, at: [22, 27] }, { id: 'stars1', kind: 'tool', tool: 'shuriken', n: 5, at: [44, 37] }],
    boss: { id: 'gonroku', at: [11, 7], facing: 0, arena: [3, 3, 20, 11], open: [[11, 12, 1, 1, ':'], [30, 11, 1, 1, 'd']] },
    objectives: [
      { id: 'kill', type: 'assassinate', target: 'kanemori', text: 'Silence Magistrate Kanemori' },
      { id: 'ledger', type: 'retrieve', pickup: 'ledger', optional: true, text: 'Find what he hides (his storehouse roof)' },
      { id: 'boss', type: 'defeat', boss: 'gonroku', secret: true, text: 'Defeat Gonroku the Iron Ox' },
      { id: 'escape', type: 'reach', after: ['kill', 'boss'], text: 'Escape by the canal boat (west)' }],
    triggers: [
      { id: 's', when: 'time:.8', do: [['say', 'hero', 'm1_start']] },
      { id: 'in', rect: [3, 3, 45, 15], do: [['checkpoint'], ['say', 'granny', 'm1_inside']] },
      { id: 'k', when: 'objective:kill', do: [['say', 'hero', 'm1_kill'], ['close', 30, 11, 1, 1, 'H'], ['objective', 'boss', 'show'], ['boss', 'gonroku'], ['toast', 'The doors slam shut', 'The only way out is the court.']] },
      { id: 'c', rect: [3, 3, 20, 11], do: [['objective', 'boss', 'show'], ['boss', 'gonroku']] },
      { id: 'a', when: 'alert', do: [['cower', 'kanemori', 6, 5]] },
      { id: 'cornered', at: [6, 5], r: 3, when: 'boss:gonroku', do: [['say', 'kanemori', 'kanemori_cornered']] },
      { id: 'l', when: 'pickup:ledger', do: [['say', 'hero', 'm1_ledger']] },
      { id: 'b', when: 'boss:gonroku', do: [['say', 'hero', 'm1_escape']] }],
    timer: null });
})();

/* ---- 64-levels-m2.js ---- */
/* ---- MISSION 2, "The Fort at Kiri Lake": rain and lightning. West, the reed shore and the escape boat; the lake
 * channel (archers sweep it from the towers); the Red Lanterns' fort with its barracks, bell, storehouses, Tobei's cage,
 * the lever of the water gate, and the dock of rice barges; Hotaru waits on the pier of the escape route ---- */
(() => {
  const L = LG(60, 52);
  L.rect(1, 1, 12, 50, ','); L.rect(5, 2, 7, 49, '.'); L.rect(8, 8, 11, 9, '.'); L.rect(1, 12, 3, 14, '~');        // the reed shore, its path, the boat's inlet
  L.rect(13, 1, 29, 50, '~'); L.rect(30, 1, 30, 50, '-');                            // the channel; a wading strip under the fort wall
  L.rect(19, 30, 28, 34, '='); L.rect(29, 31, 30, 32, '-');                          // the pier (Hotaru's), the shallows to the water gate
  L.frame(31, 1, 58, 50, '#'); L.rect(32, 2, 57, 49, ':');                           // the fort
  L.rect(33, 3, 34, 4, 'T'); L.rect(55, 3, 56, 4, 'T'); L.rect(33, 41, 34, 42, 'T'); L.rect(55, 41, 56, 42, 'T');
  L.rect(36, 7, 41, 12, 'B'); L.rect(48, 7, 53, 11, 'C'); L.rect(44, 24, 47, 27, 'A'); L.rect(36, 34, 39, 37, 'C');
  L.rect(32, 14, 35, 20, ','); L.rect(54, 25, 57, 30, ','); L.rect(40, 16, 42, 18, ',');
  L.rect(33, 44, 56, 44, '='); L.rect(33, 45, 56, 48, '~');                          // the quay and the dock basin
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'm2', { id: 'm2', name: 'The Fort at Kiri Lake', size: [60, 52], time: 'rain', faction: 'redlantern', rows: L.rows(), music: 'm2', weather: 'rain', par: 900,
    zones: [{ id: 'shore', rect: [1, 1, 12, 50], name: 'The reed shore' }, { id: 'channel', rect: [13, 1, 30, 50], name: 'The lake channel' }, { id: 'fort', rect: [32, 2, 57, 43], name: 'The Red Lantern fort' }, { id: 'dock', rect: [32, 44, 57, 49], name: 'The barge dock' }, { id: 'pier', rect: [19, 30, 28, 34], name: 'The pier' }],
    lights: [{ at: [34, 4], kind: 'none', z: 86, r: 70, color: '#ff6a3a' }, { at: [56, 4], kind: 'none', z: 86, r: 70, color: '#ff6a3a' }, { at: [34, 42], kind: 'none', z: 86, r: 70, color: '#ff6a3a' },
      { at: [44, 10], kind: 'paperLantern', r: 64 }, { at: [43, 14], kind: 'paperLantern', r: 60 }, { at: [52, 15], kind: 'paperLantern', r: 60 }, { at: [35, 30], kind: 'torch', r: 64 }, { at: [46, 22], kind: 'paperLantern' },
      { at: [40, 43], kind: 'torch', r: 64 }, { at: [50, 43], kind: 'torch', r: 64 }, { at: [24, 30], kind: 'paperLantern', r: 60 }, { at: [6, 6], kind: 'none', z: 14, r: 40, i: .5 }, { at: [6, 42], kind: 'none', z: 14, r: 40, i: .5 },
      { at: [45, 32], kind: 'paperLantern' }],
    props: [P('hut', 4, 6), P('hut', 4, 40), P('nets', 9, 22), P('nets', 9, 30), P('boat', 2, 13, { facing: 1.57 }), P('mooringPost', 4, 12), P('riceBale', 8, 5), P('waterBarrel', 3, 8),
      P('bambooCage', 52, 17), P('lever', 34, 31, { facing: 0 }), P('hansho', 44, 9), P('weaponRack', 43, 13), P('weaponRack', 35, 13, { facing: 1.57 }), P('sakeBarrel', 47, 13), P('sakeBarrel', 48, 13),
      P('riceBale', 54, 13), P('riceBale', 55, 13), P('riceBale', 54, 14), P('riceBale', 42, 31), P('riceBale', 43, 31), P('cart', 49, 31), P('nobori', 32, 6, { color: '#c8242a' }), P('nobori', 57, 6, { color: '#c8242a' }),
      P('nobori', 32, 40, { color: '#c8242a' }), P('mooringPost', 37, 44), P('mooringPost', 45, 44), P('mooringPost', 53, 44), P('riceBarge', 37, 46), P('riceBarge', 45, 46), P('riceBarge', 53, 46),
      P('mooringPost', 19, 31), P('mooringPost', 28, 33), P('boat', 16, 32, { facing: 1.57 }), P('waterBarrel', 51, 21), P('crate', 46, 29), P('crate', 47, 29)],
    anchors: [],
    hero: { at: [6, 9], facing: 0 }, exit: { at: [5, 13], r: 2.5 },
    escort: { id: 'tobei', at: [52, 17], hp: 60, caged: true },
    guards: [
      { id: 'archerNW', type: 'archer', at: [33, 3], facing: 150, mode: 'post', lantern: true }, { id: 'archerNE', type: 'archer', at: [55, 3], facing: 120, mode: 'post' },
      { id: 'archerSW', type: 'archer', at: [33, 41], facing: 200, mode: 'post', lantern: true },
      { id: 'ninja1', type: 'ninja', at: [38, 9], z: 64, mode: 'patrol', route: [[37, 8, 2], [40, 11, 2]] }, { id: 'ninja2', type: 'ninja', at: [50, 9], z: 48, mode: 'post', facing: 90 },
      { id: 'ninja3', type: 'ninja', at: [37, 35], z: 48, mode: 'post', facing: 180 },
      { id: 'cagesam', type: 'samurai', at: [50, 19], facing: 90, mode: 'post' }, { id: 'leversam', type: 'samurai', at: [36, 29], facing: 0, mode: 'post' },
      { id: 'loopsam', type: 'samurai', at: [40, 20], mode: 'patrol', route: [[40, 20, 1], [54, 20, 1], [54, 38, 1], [40, 38, 1]] },
      { id: 'gatepat', type: 'ashigaru', at: [33, 22], mode: 'patrol', lantern: true, route: [[33, 22, 2, 180], [33, 39, 2, 180]], loop: false },
      { id: 'northpat', type: 'ashigaru', at: [36, 15], mode: 'patrol', route: [[36, 15, 1], [56, 15, 2]], loop: false },
      { id: 'dockpat', type: 'ashigaru', at: [34, 43], mode: 'patrol', lantern: true, route: [[34, 43, 2, 90], [56, 43, 2, 90]], loop: false },
      { id: 'bellash', type: 'ashigaru', at: [44, 11], facing: 90, mode: 'post' }, { id: 'midpat', type: 'ashigaru', at: [45, 29], mode: 'patrol', route: [[45, 29, 1], [45, 38, 2]], loop: false },
      { id: 'shed', type: 'ashigaru', at: [43, 26], facing: 180, mode: 'chat', partner: 'midpat' },
      { id: 'hound1', type: 'hound', at: [42, 19], mode: 'patrol', route: [[42, 19, 1], [42, 30, 1]], loop: false }, { id: 'hound2', type: 'hound', at: [50, 35], mode: 'patrol', route: [[50, 35, 1], [56, 35, 1]], loop: false }],
    civilians: [],
    bells: [[44, 9]], barracks: [[38, 13]],
    pickups: [{ id: 'pot', kind: 'tool', tool: 'smoke', n: 1, at: [46, 30] }, { id: 'onigiri2', kind: 'tool', tool: 'riceball', n: 1, at: [55, 22] }],
    interact: [
      { id: 'cage', at: [52, 18], hold: 1.5, text: 'Open the cage', do: [['release']], sfx: 'lever' },
      { id: 'lever', at: [34, 31], hold: 1.2, text: 'Open the water gate', do: [['open', 31, 31, 1, 2, '-'], ['prop', 'lever', 34, 31, 'leverDown'], ['toast', 'The water gate groans open', '']], sfx: 'gate' },
      { id: 'rope1', at: [37, 43], hold: 1.5, text: 'Cut the barge loose', do: [['drift', 37, 46]], sfx: 'slash' },
      { id: 'rope2', at: [45, 43], hold: 1.5, text: 'Cut the barge loose', do: [['drift', 45, 46]], sfx: 'slash' },
      { id: 'rope3', at: [53, 43], hold: 1.5, text: 'Cut the barge loose', do: [['drift', 53, 46]], sfx: 'slash' }],
    boss: { id: 'hotaru', at: [22, 32], facing: 0, arena: [19, 30, 28, 34], ambush: true },
    objectives: [
      { id: 'rescue', type: 'rescue', text: 'Free Tobei from the bamboo cage' },
      { id: 'gate', type: 'interact', interact: 'lever', text: 'Open the water gate (the lever inside)' },
      { id: 'boss', type: 'defeat', boss: 'hotaru', secret: true, text: 'Defeat Hotaru of the Red Lantern' },
      { id: 'escort', type: 'escort', zone: [1, 10, 9, 16], after: ['rescue', 'gate', 'boss'], text: 'Bring Tobei to the boat in the reeds' },
      { id: 'barges', type: 'interact', interact: ['rope1', 'rope2', 'rope3'], count: 3, optional: true, text: 'Cut the rice barges loose (0/3)' }],
    triggers: [
      { id: 's', when: 'time:.8', do: [['say', 'hero', 'm2_start'], ['tutorial', 'Rain and lightning', 'Rain hides your steps. Lightning shows everyone for a moment: stay out of the open when the sky growls.']] },
      { id: 'in', rect: [32, 2, 57, 43], do: [['checkpoint'], ['say', 'granny', 'm2_cage']] },
      { id: 'r', when: 'objective:rescue', do: [['checkpoint'], ['say', 'granny', 'm2_gate'], ['tutorial', 'Escort', '{a:interact} near Tobei: wait here, or follow me. He crouches when you crouch and swims where you swim.']] },
      { id: 'dock', rect: [33, 42, 56, 44], do: [['say', 'granny', 'm2_barges']] },
      { id: 'amb', rect: [19, 30, 28, 34], when: ['objective:rescue', 'objective:gate'], do: [['objective', 'boss', 'show'], ['boss', 'hotaru']] }],
    timer: null });
})();

/* ---- 64-levels-m3.js ---- */
/* ---- MISSION 3, "Moon over Kokaku": the festival night of the moon-viewing. Swim the outer moat, hook the stone wall,
 * find the poisoned flask in the tea pavilion of the festival garden before the moon is high (12:00), unmask the three
 * Red Lanterns among the servants, then climb the keep's three tiers to Kurogane and his oni mask under the moon ---- */
(() => {
  const L = LG(64, 56);
  L.rect(1, 1, 62, 54, '~');                                                    // the outer moat
  L.frame(3, 3, 60, 52, '+'); L.frame(4, 4, 59, 51, '#');                       // the stone berm, the ishigaki wall
  L.rect(5, 5, 58, 50, ':');
  L.rect(5, 5, 6, 6, 'T'); L.rect(57, 5, 58, 6, 'T'); L.rect(5, 49, 6, 50, 'T'); L.rect(57, 49, 58, 50, 'T');
  // the second bailey: the festival garden
  L.rect(5, 34, 58, 50, ','); L.rect(7, 46, 56, 47, '+'); L.rect(30, 34, 33, 50, '+'); L.rect(22, 36, 56, 37, '+');
  L.frame(12, 38, 21, 45, 'H'); L.rect(13, 39, 20, 44, '_'); L.set(16, 45, 'd'); L.set(21, 41, 'd');   // the tea pavilion
  L.rect(40, 41, 45, 44, 'D'); L.rect(50, 39, 54, 42, 'S');
  L.rect(5, 33, 58, 33, 'W'); L.rect(31, 33, 32, 33, 'd');                      // the inner wall and its gate
  // the honmaru: the keep's three tiers, the barracks, the bell
  L.rect(12, 10, 27, 25, 'G'); L.rect(14, 12, 25, 23, 'K'); L.rect(16, 14, 23, 21, 'M');
  L.rect(38, 9, 45, 13, 'B'); L.rect(48, 18, 53, 22, 'A'); L.rect(36, 26, 40, 29, 'C');
  L.rect(30, 8, 33, 31, '+'); L.rect(7, 27, 28, 28, '+');
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'm3', { id: 'm3', name: 'Moon over Kokaku', size: [64, 56], time: 'festival', faction: 'kokaku', rows: L.rows(), music: 'm3', weather: 'maple', par: 960, bigMoon: true,
    zones: [{ id: 'moat', rect: [1, 1, 62, 54], name: 'The outer moat' }, { id: 'bailey', rect: [5, 34, 58, 50], name: 'The festival garden' }, { id: 'pavilion', rect: [12, 38, 21, 45], name: 'The tea pavilion' },
      { id: 'honmaru', rect: [5, 5, 58, 32], name: 'The honmaru' }, { id: 'keep', rect: [12, 10, 27, 25], name: 'Kokaku keep' }],
    lights: [{ at: [26, 37], kind: 'lanternString', r: 72 }, { at: [36, 37], kind: 'lanternString', r: 72 }, { at: [46, 37], kind: 'lanternString', r: 72 }, { at: [26, 47], kind: 'lanternString', r: 72 }, { at: [40, 47], kind: 'lanternString', r: 72 },
      { at: [14, 40], kind: 'paperLantern', r: 60 }, { at: [19, 43], kind: 'paperLantern', r: 60 }, { at: [10, 47], kind: 'paperLantern' }, { at: [52, 47], kind: 'paperLantern' }, { at: [35, 42], kind: 'none', z: 22, r: 60 },
      { at: [31, 32], kind: 'torch', r: 72 }, { at: [34, 32], kind: 'torch', r: 72 }, { at: [44, 15], kind: 'paperLantern' }, { at: [19, 27], kind: 'torch', r: 70 }, { at: [29, 18], kind: 'stoneLantern' }, { at: [9, 18], kind: 'stoneLantern' },
      { at: [50, 25], kind: 'stoneLantern' }, { at: [6, 6], kind: 'none', z: 86, r: 70, color: '#ffb060' }, { at: [58, 6], kind: 'none', z: 86, r: 70, color: '#ffb060' }, { at: [20, 18], kind: 'moonpool', z: 175, r: 80, i: .5 }],
    props: [P('yatai', 30, 40, { facing: 1.57 }), P('yatai', 40, 39, { facing: 1.57 }), P('yatai', 48, 45, { facing: -1.57 }), P('lanternString', 26, 37), P('lanternString', 36, 37), P('lanternString', 46, 37), P('lanternString', 26, 47), P('lanternString', 40, 47),
      P('sakeFlask', 14, 40), P('kotatsu', 17, 41), P('folding', 17, 39), P('taiko', 35, 44), P('maple', 8, 36), P('maple', 24, 42), P('maple', 55, 36), P('maple', 9, 49), P('maple', 46, 49), P('bonsaiPine', 28, 44), P('steppingStones', 24, 39),
      P('nobori', 22, 35, { color: '#2a3a6a' }), P('nobori', 56, 44, { color: '#c8342a' }), P('nobori', 7, 44, { color: '#2a3a6a' }), P('sakeBarrel', 33, 41), P('sakeBarrel', 34, 41), P('riceBale', 42, 38), P('torii', 52, 44, { facing: 1.57 }),
      P('hansho', 44, 14), P('weaponRack', 42, 15), P('weaponRack', 46, 15), P('shachihoko', 16, 14, { z: 160 }), P('shachihoko', 23, 21, { z: 160 }), P('maple', 9, 9), P('maple', 54, 9), P('bonsaiPine', 9, 28), P('stoneLantern', 30, 25)],
    anchors: [],
    hero: { at: [22, 53], facing: 270 }, exit: null,
    npcs: [{ id: 'takanori', rig: 'takanori', at: [17, 42], facing: 270 }],
    guards: [
      { id: 'bpat1', type: 'ashigaru', at: [8, 38], mode: 'patrol', lantern: true, route: [[8, 38, 2], [28, 38, 1], [28, 49, 1], [8, 49, 2]] },
      { id: 'bpat2', type: 'ashigaru', at: [36, 49], mode: 'patrol', route: [[36, 49, 1], [56, 49, 2], [56, 35, 1], [36, 35, 1]] },
      { id: 'gatesam', type: 'samurai', at: [31, 35], facing: 90, mode: 'post' }, { id: 'bhound', type: 'hound', at: [44, 46], mode: 'patrol', route: [[44, 46, 1], [52, 46, 1]], loop: false },
      { id: 'tower1', type: 'archer', at: [5, 49], facing: 315, mode: 'post' }, { id: 'tower2', type: 'archer', at: [57, 5], facing: 135, mode: 'post' },
      { id: 'gsam', type: 'samurai', at: [12, 10], z: 64, mode: 'patrol', route: [[12, 10, 1], [27, 10, 1], [27, 25, 1], [12, 25, 1]] },
      { id: 'gninja', type: 'ninja', at: [27, 18], z: 64, mode: 'post', facing: 0 },
      { id: 'ksam', type: 'samurai', at: [14, 12], z: 112, mode: 'patrol', route: [[14, 12, 1], [25, 12, 1], [25, 23, 1], [14, 23, 1]] },
      { id: 'karcher1', type: 'archer', at: [25, 23], z: 112, facing: 45, mode: 'post' }, { id: 'karcher2', type: 'archer', at: [14, 12], z: 112, facing: 225, mode: 'post' },
      { id: 'doorsam', type: 'samurai', at: [19, 27], facing: 90, mode: 'post' }, { id: 'hsam1', type: 'samurai', at: [34, 20], mode: 'patrol', route: [[34, 20, 1], [56, 20, 1], [56, 30, 1], [34, 30, 1]] },
      { id: 'hsam2', type: 'samurai', at: [7, 8], mode: 'patrol', route: [[7, 8, 1], [29, 8, 2], [29, 30, 1], [7, 30, 2]] },
      { id: 'hash1', type: 'ashigaru', at: [44, 15], facing: 90, mode: 'post' }, { id: 'hash2', type: 'ashigaru', at: [9, 12], mode: 'patrol', lantern: true, route: [[9, 12, 2], [9, 30, 2]], loop: false },
      { id: 'hash3', type: 'ashigaru', at: [48, 8], mode: 'patrol', route: [[48, 8, 1], [56, 8, 1], [56, 16, 1]], loop: false }, { id: 'hash4', type: 'ashigaru', at: [36, 31], facing: 270, mode: 'chat', partner: 'hash5' },
      { id: 'hash5', type: 'ashigaru', at: [38, 31], facing: 90, mode: 'chat', partner: 'hash4' }, { id: 'bninja', type: 'ninja', at: [41, 11], z: 64, mode: 'post', facing: 180 },
      { id: 'hhound', type: 'hound', at: [40, 24], mode: 'patrol', route: [[40, 24, 1], [54, 24, 1]], loop: false }],
    civilians: [
      { id: 'n1', type: 'noble', i: 0, at: [25, 40], facing: 0 }, { id: 'n2', type: 'noble', i: 1, at: [27, 41], facing: 180 }, { id: 'n3', type: 'noble', i: 2, at: [37, 45], facing: 270 },
      { id: 's1', type: 'servant', at: [33, 39], route: [[33, 39, 3], [42, 39, 3]] }, { id: 's2', type: 'servant', at: [50, 47], route: [[50, 47, 3], [38, 47, 3]] }, { id: 'n4', type: 'noble', i: 3, at: [10, 44], facing: 0 },
      { id: 'dis1', type: 'servant', at: [22, 46], disguised: true, route: [[22, 46, 2], [29, 46, 2]] }, { id: 'dis2', type: 'servant', at: [46, 40], disguised: true, route: [[46, 40, 3], [46, 44, 2]] },
      { id: 'dis3', type: 'servant', at: [12, 47], disguised: true, route: [[12, 47, 2], [12, 36, 2]] }],
    bells: [[44, 14]], barracks: [[41, 14]],
    pickups: [{ id: 'onigiri3', kind: 'tool', tool: 'riceball', n: 1, at: [54, 48] }, { id: 'fc3', kind: 'tool', tool: 'firecracker', n: 2, at: [8, 30] }, { id: 'smoke3', kind: 'tool', tool: 'smoke', n: 1, at: [26, 26], z: 64 }],
    interact: [{ id: 'sake', at: [14, 40], hold: 1, text: 'Swap the poisoned sake', do: [['stopTimer']], sfx: 'pickup' }],
    boss: { id: 'kurogane', at: [20, 18], z: 160, facing: 90, arena: [16, 14, 23, 21] },
    objectives: [
      { id: 'sake', type: 'stopTimer', interact: 'sake', text: 'Find the poisoned sake before the moon is high' },
      { id: 'climb', type: 'reach', zone: [16, 14, 23, 21], z: 160, after: ['sake'], text: 'Climb the keep' },
      { id: 'boss', type: 'defeat', boss: 'kurogane', after: ['climb'], text: 'Defeat Chamberlain Kurogane' },
      { id: 'dis', type: 'killAll', targets: ['dis1', 'dis2', 'dis3'], optional: true, text: 'Silence the 3 disguised Red Lanterns (Ki Focus shows them)' }],
    triggers: [
      { id: 's', when: 'time:.8', do: [['say', 'hero', 'm3_start'], ['tutorial', 'The moon rises', 'The moon timer (top right) runs to 12:00. Find the poisoned flask in the tea pavilion before it is high.']] },
      { id: 'b', rect: [5, 34, 58, 50], do: [['checkpoint'], ['say', 'granny', 'm3_bailey'], ['tutorial', 'Ki Focus', 'Hold {a:focus}: your sense reaches further, sight cones show through walls, and disguised ninja glow red.']] },
      { id: 'sw', when: 'objective:sake', do: [['checkpoint'], ['say', 'granny', 'm3_swapped']] },
      { id: 'kp', rect: [12, 10, 27, 25], z: 64, do: [['say', 'granny', 'm3_keep']] },
      { id: 'k2', rect: [14, 12, 25, 23], z: 112, do: [['checkpoint']] },
      { id: 'top', rect: [16, 14, 23, 21], z: 160, when: 'objective:sake', do: [['checkpoint'], ['boss', 'kurogane']] }],
    timer: { seconds: 720, fail: 'The lord raises his cup... The Red Lanterns have won.', stopOn: 'objective:sake' } });
})();

/* ---- 64-levels-delivery.js ---- */
/* ---- "NIGHT DELIVERY": the Shadow Trial and the AI Hub round. The rice broker Sakubei's walled yard by the canal:
 * silence him in his counting hall and leave by the canal gate. Static data, the same in every copy; patrols run on the
 * seeded Math.random, so every player's round starts alike ---- */
(() => {
  const L = LG(34, 30);
  L.rect(1, 1, 32, 3, '~');                                                      // the canal
  L.frame(2, 4, 31, 22, 'W'); L.rect(16, 4, 17, 4, 'd');                         // the compound wall, the canal gate
  L.rect(3, 5, 30, 21, '.');
  L.rect(5, 6, 8, 9, 'C'); L.rect(25, 6, 28, 9, 'C'); L.rect(20, 6, 21, 7, 'T');
  L.frame(13, 11, 20, 16, 'H'); L.rect(14, 12, 19, 15, '_'); L.set(16, 16, 'd'); L.set(13, 13, 'd');
  L.rect(9, 17, 14, 20, '~'); L.rect(3, 11, 5, 14, ','); L.rect(26, 17, 29, 19, ','); L.rect(3, 19, 7, 21, ',');
  L.rect(15, 5, 18, 10, '+'); L.rect(15, 17, 18, 21, '+');
  L.rect(1, 23, 32, 28, '.'); L.rect(1, 23, 32, 23, ',');
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'delivery', { id: 'delivery', name: 'Night Delivery', size: [34, 30], time: 'night', faction: 'sakubei', rows: L.rows(), music: 'm1', weather: null, par: 300, target: 'sakubei',
    zones: [{ id: 'yard', rect: [3, 5, 30, 21], name: 'Sakubei\'s yard' }, { id: 'hall', rect: [13, 11, 20, 16], name: 'The counting hall' }, { id: 'outside', rect: [1, 23, 32, 28], name: 'Outside the south wall' }],
    lights: [{ at: [9, 13], kind: 'stoneLantern', r: 64 }, { at: [25, 13], kind: 'stoneLantern', r: 64 }, { at: [16, 13], kind: 'paperLantern', r: 60 }, { at: [16, 5], kind: 'torch', r: 64 }, { at: [17, 21], kind: 'paperLantern', r: 56 },
      { at: [21, 7], kind: 'none', z: 86, r: 70, color: '#ffb060' }, { at: [8, 26], kind: 'paperLantern' }, { at: [26, 26], kind: 'paperLantern' }],
    props: [P('kotatsu', 17, 13), P('jubako', 15, 14), P('strongbox', 18, 12, { facing: 3.14 }), P('riceBale', 4, 6), P('riceBale', 4, 7), P('riceBale', 10, 6), P('riceBale', 23, 8), P('riceBale', 24, 9), P('cart', 11, 9),
      P('sakeBarrel', 29, 11), P('sakeBarrel', 29, 12), P('bonsaiPine', 22, 18), P('steppingStones', 15, 19), P('cherry', 7, 16), P('boat', 16, 2, { facing: 0 }), P('mooringPost', 14, 3), P('nobori', 3, 5, { color: '#5a4a3a' }),
      P('waterBarrel', 30, 20), P('cart', 6, 25), P('riceBale', 28, 25), P('riceBale', 29, 25)],
    anchors: [],
    hero: { at: [16, 26], facing: 270 }, exit: { at: [16, 3], r: 1.5 },
    guards: [
      { id: 'lantern', type: 'ashigaru', at: [11, 10], mode: 'patrol', lantern: true, route: [[11, 10, 1], [22, 10, 1], [22, 18, 1], [11, 18, 1]] },
      { id: 'gateash', type: 'ashigaru', at: [16, 6], facing: 90, mode: 'post' }, { id: 'westash', type: 'ashigaru', at: [4, 16], mode: 'patrol', route: [[4, 16, 2, 0], [10, 16, 1]], loop: false },
      { id: 'doorsam', type: 'samurai', at: [17, 17], facing: 90, mode: 'post' }, { id: 'eastsam', type: 'samurai', at: [28, 14], mode: 'patrol', route: [[28, 14, 2, 180], [28, 20, 2, 180]], loop: false },
      { id: 'tower', type: 'archer', at: [20, 6], facing: 100, mode: 'post' }, { id: 'roofninja', type: 'ninja', at: [6, 7], z: 48, mode: 'patrol', route: [[6, 7, 2], [7, 8, 2]] },
      { id: 'hound', type: 'hound', at: [6, 19], mode: 'patrol', route: [[5, 19, 1], [8, 19, 1]], loop: false }],
    civilians: [{ id: 'sakubei', type: 'sakubei', at: [17, 12], facing: 90, mode: 'sit', target: true }, { id: 'clerk1', type: 'clerk', at: [15, 13], facing: 0 }, { id: 'clerk2', type: 'clerk', at: [10, 7], facing: 90, route: [[10, 7, 4], [12, 7, 3]] }],
    bells: [], barracks: [],
    pickups: [],
    objectives: [
      { id: 'kill', type: 'assassinate', target: 'sakubei', text: 'Silence Sakubei the rice broker' },
      { id: 'escape', type: 'reach', after: ['kill'], text: 'Leave by the canal gate' }],
    triggers: [{ id: 's', when: 'time:.5', do: [['say', 'granny', 'd_start']] }, { id: 'k', when: 'objective:kill', do: [['say', 'granny', 'd_target']] }],
    timer: null });
})();

/* ---- 65-missions.js ---- */
/* ---- MISSIONS: metadata over the levels: titles, the briefing and debrief scenes, the suggested bento, par times, the
 * order of the story. The Shadow Trial ("Night Delivery") is a mission of its own outside the story ---- */
B.def('mission', 'training', { title: 'The Trial of the Second Tier', level: 'training', briefing: 'prologue', debrief: 'training_end', par: 420, next: 'm1', chapter: 'Prologue',
  loadoutHint: [['riceball', 2], ['firecracker', 1], ['poisonball', 1], ['smoke', 1], ['shuriken', 6]], objectivesCard: ['Pass Granny\'s trial in the back yard', 'Three Silent Marks, a sleeping radish, a sparring monk'] });
B.def('mission', 'm1', { title: 'Rice and Ash', level: 'm1', briefing: 'briefing1', debrief: 'debrief1', par: 720, next: 'm2', chapter: 'Chapter One',
  loadoutHint: [['riceball', 3], ['shuriken', 10], ['smoke', 2], ['poisonball', 2], ['firecracker', 2], ['caltrops', 1]], objectivesCard: ['Silence Magistrate Kanemori at his feast', 'Find what he hides', 'Escape by the canal boat'] });
B.def('mission', 'm2', { title: 'The Fort at Kiri Lake', level: 'm2', briefing: 'briefing2', debrief: 'debrief2', par: 900, next: 'm3', chapter: 'Chapter Two',
  loadoutHint: [['riceball', 3], ['shuriken', 10], ['smoke', 2], ['caltrops', 2], ['firecracker', 2], ['dango', 2]], objectivesCard: ['Free Tobei from the Red Lanterns\' fort', 'Open the water gate and bring him home', 'Cut the rice barges loose'] });
B.def('mission', 'm3', { title: 'Moon over Kokaku', level: 'm3', briefing: 'briefing3', debrief: 'ending', par: 960, next: null, chapter: 'Chapter Three',
  loadoutHint: [['riceball', 3], ['shuriken', 10], ['smoke', 2], ['firepot', 1], ['plum', 2], ['firecracker', 2]], objectivesCard: ['Find the poisoned sake before the moon is high', 'Climb the keep', 'Face Kurogane at the top'] });
B.def('mission', 'delivery', { title: 'Night Delivery', level: 'delivery', briefing: null, debrief: null, par: 300, next: null, chapter: 'Shadow Trial', trial: true,
  loadoutHint: [['riceball', 2], ['shuriken', 10], ['smoke', 2], ['poisonball', 1], ['firecracker', 2], ['caltrops', 1]], objectivesCard: ['Silence Sakubei the rice broker', 'Leave by the canal gate', 'Fast, unseen, and with Silent Cuts'] });
const STORY_ORDER = ['training', 'm1', 'm2', 'm3'];
B.STORY_ORDER = STORY_ORDER;

/* ---- 70-hud.js ---- */
/* ---- THE HUD (canvas, anchored to r.W / r.H inside 4% overscan): health and the Silent Cut count (top left), toasts,
 * the boss bar and the alarm banner (top centre), the moon timer and place names (top right), the Ki Gauge with the
 * light eye (bottom left), the tool box and compass (bottom right), context prompts with glyphs (bottom centre), marks
 * over guards, chevrons at the edges, telegraph decals, the letterbox, the brush splash and the red edge pulse ---- */
const Hud = { toasts: [], tut: null, lb: 0, lbTo: 0, splashT: 0, splashK: null, pulseT: 0, tele: [], card: null, place: null, placeT: 0, lessonT: 0, lessonK: null, alarmT: 0, objT: 0 };
Hud.toast = (title, text = '', secs = 3.2) => { Hud.toasts = Hud.toasts.filter(t => t.title !== title); Hud.toasts.push({ title, text, t: secs, max: secs }); if (Hud.toasts.length > 3) Hud.toasts.shift(); };
Hud.tutorial = (title, text, secs = 14) => { Hud.tut = { title, text, t: secs }; };
Hud.objective = o => { Hud.toast(o.optional ? 'Optional' : 'Objective', o.text, 4); };
Hud.letterbox = secs => { Hud.lbTo = 1; Hud.lbT = secs; };
Hud.splash = (kind, mark) => { Hud.splashT = 1.1; Hud.splashK = { kind, mark, seed: (crand() * 999) | 0 }; };
Hud.pulse = () => { Hud.pulseT = .45; };
Hud.telegraph = (a, reach, arc, t) => Hud.tele.push({ kind: 'arc', a, x: a.x, y: a.y, z: a.z, f: a.facing, r: reach, arc, t, max: t });
Hud.telegraphRing = (a, r, t) => Hud.tele.push({ kind: 'ring', x: a.x, y: a.y, z: a.z || 0, r, t, max: t });
Hud.telegraphLine = (a, ang, len, t) => Hud.tele.push({ kind: 'line', x: a.x, y: a.y, z: a.z || 0, f: ang, r: len, t, max: t });
Hud.bossCard = (name, title) => { Hud.card = { name, title, t: 3 }; };
Hud.lesson = k => { Hud.lessonK = k; Hud.lessonT = 2.2; };
Hud.reset = () => { Hud.toasts = []; Hud.tut = null; Hud.lb = 0; Hud.lbTo = 0; Hud.splashT = 0; Hud.tele = []; Hud.card = null; Hud.place = null; Hud.lessonT = 0; Hud.pulseT = 0; };
Hud.update = (dt, M) => {
  const rd = dt / Math.max(.05, game.timeScale);   // (real time: slow motion does not stretch the HUD)
  for (const t of Hud.toasts) t.t -= rd; Hud.toasts = Hud.toasts.filter(t => t.t > 0);
  if (Hud.tut) { Hud.tut.t -= rd; if (Hud.tut.t <= 0) Hud.tut = null; }
  if (Hud.lbT > 0) { Hud.lbT -= rd; if (Hud.lbT <= 0) Hud.lbTo = 0; }
  const want = M && (M.cine > 0 || Cutscene.busy()) ? 1 : Hud.lbTo; Hud.lb = approach(Hud.lb, want, rd * 4);
  Hud.splashT = Math.max(0, Hud.splashT - rd); Hud.pulseT = Math.max(0, Hud.pulseT - rd); Hud.lessonT = Math.max(0, Hud.lessonT - rd);
  if (Hud.card) { Hud.card.t -= rd; if (Hud.card.t <= 0) Hud.card = null; }
  for (const t of Hud.tele) { t.t -= dt; if (t.a && t.kind === 'arc') { t.x = t.a.x; t.y = t.a.y; t.f = t.a.facing; } } Hud.tele = Hud.tele.filter(t => t.t > 0);
  if (M && M.hero) { const z = M.world.zoneAt(M.hero.x, M.hero.y); if (z && z !== Hud.place) { Hud.place = z; Hud.placeT = 3; } if (!z) Hud.place = null; Hud.placeT = Math.max(0, Hud.placeT - rd); }
};
/** the context prompts: what the buttons do here, at most two */
Hud.prompts = (M) => {
  const h = M.hero, out = []; if (!h || h.dead || h.action) return out;
  const cut = SilentCut.find(h, M);
  if (cut) out.push(['attack', 'Silent Cut \u2014 ' + SilentCut.LABEL[cut.kind] + (cut.victim.kind === 'civ' && !cut.victim.disguised ? ' (civilian!)' : cut.victim.mark ? ' (mark)' : '')]);
  else if (Combat.riposteTarget(h, M)) out.push(['attack', 'Riposte']);
  const ix = Mission.nearInteract(M, h), e = M.escort;
  if (h.drag) out.push(['interact', 'Drop body']);
  else if (ix) out.push(['interact', (ix.hold ? 'Hold: ' : '') + ix.text, ix.hold ? ix.progress / ix.hold : undefined]);
  else if (e && e.alive && !e.caged && Math.hypot(e.x - h.x, e.y - h.y) < 22) out.push(['interact', e.wait ? 'Follow me' : 'Wait here']);
  else if (Hero.bodyNear(h, M) && !h.swim) out.push(['interact', 'Drag body']);
  if (out.length < 2 && h.swim) out.push(['crouch', h.dive ? 'Surface' : 'Dive']);
  if (out.length < 2 && Grapple.best && !h.swim && !h.drag) out.push(['grapple', 'Grapple']);
  return out.slice(0, 2);
};
const MARK = { notice: ['?', '#f0d050'], search: ['?', '#f09040'], alert: ['!', '#ff4a3a'] };
/** world-space marks: awareness over guards, bark bubbles, breath, stamina, the objective marker, telegraphs */
Hud.world = (r, M) => {
  const h = M.hero;
  for (const t of Hud.tele) {
    const k = clamp(1 - t.t / t.max, 0, 1), a = .25 + .45 * k;
    if (t.kind === 'arc') r.decal(g => r.groundArc(t.x, t.y, 4, t.r, t.f - t.arc, t.f + t.arc, '#ff3a2a', a, t.z, g));
    else if (t.kind === 'ring') { r.decal(g => r.groundRing(t.x, t.y, t.r, '#ff3a2a', a, t.z)); r.decal(g => r.groundDisc(t.x, t.y, t.r * k, '#ff3a2a', a * .4, t.z)); }
    else r.decal(g => { const c = Math.cos(t.f), s = Math.sin(t.f), w = 7; const P = [r.w(t.x + s * w, t.y - c * w, t.z), r.w(t.x + c * t.r + s * w, t.y + s * t.r - c * w, t.z), r.w(t.x + c * t.r - s * w, t.y + s * t.r + c * w, t.z), r.w(t.x - s * w, t.y + c * w, t.z)]; px.blend(g, a, 'normal', () => px.poly(g, P, '#ff3a2a')); });
  }
  r.overlay(g => {
    const focus = M.focus;
    for (const a of M.guards.concat(M.civs, M.bosses)) {
      if (!a.alive || a.sunk || a.vis === 'hidden') { if (a.alive === false && !a.sunk && !a.hidden && B.Dev && B.Dev.flags.ai) { const p = r.w(a.x, a.y, a.z + 8); E.font.text(g, 'body', p[0], p[1], '#c8c0b0', { align: 'center', font: 'tiny' }); } continue; }
      const [sx, sy] = r.w(a.x, a.y, a.z + (a.kind === 'boss' ? 64 : a.A && a.A.hound ? 22 : 44)), ox = Math.round(sx), oy = Math.round(sy);
      if (a.asleep || a.status.sleep > 0) { const b = Math.sin(game.real * 2 + a.uid) * 2; E.font.text(g, 'Zz', ox + 4, oy - 4 + b, '#c8d8ff', { shadow: '#000', outline: false }); }
      else if (a.status.eat > 0) E.font.text(g, '...', ox, oy - 2, '#f4ead5', { align: 'center', shadow: '#000', outline: false });
      else if (a.status.stagger > 0) { for (let i = 0; i < 3; i++) { const an = game.real * 5 + i * 2.1; px.dot(g, ox + Math.cos(an) * 6, oy - 2 + Math.sin(an) * 2, '#ffe08a'); } }
      else if (a.mind && MARK[a.mind.state] && a.kind !== 'civ') { const [ch, c] = MARK[a.mind.state]; E.font.text(g, ch, ox, oy - 9, c, { align: 'center', shadow: '#000', outline: false, scale: a.mind.state === 'alert' ? 2 : 1 }); E.ui.bar(g, ox - 6, oy + 1, 12, 2, Math.min(1, a.mind.level), c); }
      else if (a.kind === 'civ' && a.status.flee > 0) E.font.text(g, '!', ox, oy - 9, '#ffd0d0', { align: 'center', shadow: '#000', outline: false });
      if (focus && a.disguised) { px.blend(g, .5 + .3 * Math.sin(game.real * 6), 'add', () => px.disc(g, ox, oy + 18, 10, '#ff2a1a')); }
      if (a.say && a.vis === 'visible') Hud.bubble(g, r, a);
      const mp = game.input.pointer && B.mouseMode() && game.input.pointer();
      if (mp && a.kind !== 'boss' && Math.hypot(mp[0] - sx, mp[1] - sy - 22) < 14) { E.font.text(g, (a.A && a.A.label) || 'Guard', ox, oy - 20, '#f4ead5', { align: 'center', shadow: '#000', outline: false, font: 'tiny' }); }
    }
    for (const a of [M.escort].concat(M.npcs || [])) if (a && a.say) Hud.bubble(g, r, a);
    if (h && !h.dead) {
      const [hx, hy] = r.w(h.x, h.y, (h.drawZ !== undefined ? h.drawZ : h.z) + 44);
      if (h.dive || h.breath < T('breath') - .5) { const n = Math.ceil(h.breath / T('breath') * 6); for (let i = 0; i < 6; i++) px.disc(g, hx - 10 + i * 4, hy - 4, 1.5, i < n ? '#bfe6ff' : '#3a4a5a'); }
      if (h.staminaMax && h.stamina < h.staminaMax - .5) { const k = h.stamina / h.staminaMax, n = 12; for (let i = 0; i < n; i++) { const an = -Math.PI / 2 + i / n * TAU, on = i / n < k; px.dot(g, hx + 9 + Math.cos(an) * 4, hy + 6 + Math.sin(an) * 4, on ? (h.exhausted ? '#ff6a4a' : '#9ae89a') : '#2a2a2a'); } }
    }
    // chevrons toward alerted enemies off screen
    for (const a of M.guards) {
      if (!a.alive || !a.mind || a.mind.state !== 'alert') continue;
      const [sx, sy] = r.w(a.x, a.y, a.z + 20); if (sx > 8 && sx < r.W - 8 && sy > 8 && sy < r.H - 8) continue;
      const cx = clamp(sx, 10, r.W - 10), cy = clamp(sy, 18, r.H - 18), an = Math.atan2(sy - r.H / 2, sx - r.W / 2);
      px.poly(g, [[cx + Math.cos(an) * 5, cy + Math.sin(an) * 5], [cx + Math.cos(an + 2.4) * 4, cy + Math.sin(an + 2.4) * 4], [cx + Math.cos(an - 2.4) * 4, cy + Math.sin(an - 2.4) * 4]], '#ff4a3a');
    }
  });
  // the objective marker
  if (game.settings.marker && M.mode !== 'attract') { const t = Hud.target(M); if (t) r.marker(t.x, t.y, t.z || 0, { label: t.label, color: '#e8b04a' }); }
};
Hud.bubble = (g, r, a) => {
  const [sx, sy] = r.w(a.x, a.y, (a.drawZ !== undefined ? a.drawZ : a.z) + (a.kind === 'boss' ? 70 : 50)), txt = a.say.text, lines = E.font.wrap(txt, 120), w = Math.max(...lines.map(l => E.font.width(l))) + 8, hh = lines.length * 9 + 4;
  const x = Math.round(clamp(sx - w / 2, 2, r.W - w - 2)), y = Math.round(clamp(sy - hh - 4, 16, r.H - hh - 2));
  px.blend(g, .85, 'normal', () => { px.rect(g, x, y, w, hh, '#f4ead5'); px.rect(g, x + 1, y + hh, w - 2, 1, '#8a8070'); });
  px.poly(g, [[clamp(sx, x + 4, x + w - 4) - 3, y + hh], [clamp(sx, x + 4, x + w - 4) + 3, y + hh], [clamp(sx, x + 4, x + w - 4), y + hh + 4]], '#f4ead5');
  lines.forEach((l, i) => E.font.text(g, l, x + 4, y + 2 + i * 9, '#1a1418', { outline: false }));
};
/** where the objective marker points: the first active required objective's place */
Hud.target = M => {
  for (const o of M.objectives) {
    if (o.state !== 'active' || o.optional) continue;
    if (o.type === 'assassinate') { const a = Mission.find(M, o.target); if (a && a.alive) return { x: a.x, y: a.y, z: a.z + 40, label: '' }; }
    if (o.type === 'defeat') { const b = M.bosses.find(b => b.id === o.boss); if (b && !b.defeated) return { x: b.x, y: b.y, z: b.z + 60, label: '' }; }
    if (o.type === 'rescue' && M.escort) return { x: M.escort.x, y: M.escort.y, z: M.escort.z + 34, label: '' };
    if ((o.type === 'interact' || o.type === 'stopTimer') && o.interact) { const ids = [].concat(o.interact), ix = M.interacts.find(i => ids.includes(i.id) && !i.done); if (ix) return { x: ix.x, y: ix.y, z: ix.z + 20, label: '' }; }
    if (o.type === 'stopTimer') { const ix = M.interacts.find(i => !i.done && i.do && i.do.some(a => a[0] === 'stopTimer')); if (ix) return { x: ix.x, y: ix.y, z: ix.z + 20 }; }
    if ((o.type === 'reach' || o.type === 'escort') && o.zone) return { x: (o.zone[0] + o.zone[2] + 1) * 8, y: (o.zone[1] + o.zone[3] + 1) * 8, z: (o.z || 0) + 8, label: '' };
    if ((o.type === 'reach' || o.type === 'escort') && M.exit) return { x: M.exit.x, y: M.exit.y, z: M.world.map.groundAt(M.exit.x, M.exit.y) + 8, label: 'EXIT' };
    if (o.type === 'retrieve') { const p = M.pickups.find(p => p.id === o.pickup && !p.taken); if (p) return { x: p.x, y: p.y, z: p.z + 10 }; }
  }
  return null;
};
/** the screen HUD */
Hud.draw = (r, M) => {
  const h = M.hero, W = r.W, H = r.H, mx = Math.round(W * .04), my = Math.round(H * .04), attract = M.mode === 'attract';
  r.overlay(g => {
    // letterbox and the red edge pulse
    if (Hud.lb > .01) { const b = Math.round(H * .11 * Hud.lb); px.rect(g, 0, 0, W, b, '#000'); px.rect(g, 0, H - b, W, b, '#000'); }
    if (Hud.pulseT > 0) px.blend(g, Hud.pulseT, 'normal', () => { px.rect(g, 0, 0, W, 4, '#c81a20'); px.rect(g, 0, H - 4, W, 4, '#c81a20'); px.rect(g, 0, 0, 4, H, '#c81a20'); px.rect(g, W - 4, 0, 4, H, '#c81a20'); });
    if (Perception.ki >= 50 && game.settings.heartbeat && !attract) { const k = (Perception.ki - 50) / 50, a = (Math.sin(game.real * (5 + k * 9)) * .5 + .5) * .25 * k; if (a > .02) px.blend(g, a, 'normal', () => { px.rect(g, 0, 0, W, 2, '#a01418'); px.rect(g, 0, H - 2, W, 2, '#a01418'); }); }
    if (M.focus) px.blend(g, .24, 'normal', () => px.rect(g, 0, 0, W, H, '#3a3a4e'));   // Ki Focus: the world loses its colour
    if (!h || Hud.lb > .9 && !attract) { Hud.splashDraw(g, r); return; }
    // ---- top left: health (a vermilion brush stroke), the crest, the Silent Cut count, Tobei ----
    const hw = Math.min(110, Math.round(W * .28)), hk = clamp(h.hp / h.maxHp, 0, 1);
    px.sprite(g, Art.crest, mx, my - 1);
    px.rect(g, mx + 17, my + 3, hw + 2, 8, '#1a1010'); px.rect(g, mx + 18, my + 4, hw, 6, '#3a1414');
    px.rect(g, mx + 18, my + 4, Math.round(hw * hk), 6, hk < .3 ? '#ff4a3a' : '#d8402a'); px.rect(g, mx + 18, my + 4, Math.round(hw * hk), 2, '#f08060');
    for (let x = mx + 18 + Math.round(hw * hk) - 3; x < mx + 18 + Math.round(hw * hk); x++) px.dot(g, x + 1, my + 4 + ((x * 7) % 5), '#d8402a');
    Art.kanji(g, 'sei', mx + 18, my + 13, .3, '#d02a20', '#2a0404', 3); Art.kanji(g, 'zan', mx + 29, my + 13, .3, '#d02a20', '#2a0404', 4);
    E.font.text(g, '\u00d7 ' + M.stats.silentCuts, mx + 41, my + 15, '#f4ead5', { shadow: '#000', outline: false });
    if (M.escort && !M.escort.caged) { const e = M.escort; Cutscene.rig('tobei').drawPortrait(g, mx, my + 26, 18, { zoom: 1.5, turn: .5, bg: '#1a2a1a' }); const n = 6; for (let i = 0; i < n; i++) px.rect(g, mx + 22 + i * 7, my + 32, 5, 5, i < Math.ceil(e.hp / e.hpMax * n) ? '#5ad05a' : '#2a3a2a'); E.font.text(g, e.wait ? 'Waiting' : 'Following', mx + 22, my + 39, '#b8d8b0', { font: 'tiny', outline: false }); }
    // ---- top centre: boss bar, the alarm banner, toasts, the boss card ----
    let ty = my;
    const boss = M.bossFight;
    if (boss && boss.alive && !boss.defeated) {
      const bw = Math.min(220, Math.round(W * .5)), bx = Math.round((W - bw) / 2), k = clamp(boss.hp / boss.maxHp, 0, 1);
      E.font.text(g, boss.D.name.toUpperCase(), W / 2, ty, '#f4ead5', { align: 'center', shadow: '#000', outline: false });
      px.rect(g, bx - 1, ty + 9, bw + 2, 7, '#100808'); px.rect(g, bx, ty + 10, bw, 5, '#3a1010'); px.rect(g, bx, ty + 10, Math.round(bw * k), 5, boss.phase ? '#ff6a2a' : '#c8202a'); px.rect(g, bx, ty + 10, Math.round(bw * k), 1, '#ffa080');
      for (const p of boss.D.phases) px.rect(g, bx + Math.round(bw * p), ty + 8, 1, 9, '#f4ead5');
      ty += 22;
    }
    if (M.alarm.rung && Math.floor(game.real * 2) % 2 === 0 && M.guards.some(g2 => g2.alive && g2.mind && g2.mind.state === 'alert')) { E.font.title(g, 'ALARM!', W / 2, ty, { align: 'center', scale: 2, colors: ['#ffd0a0', '#ff4a3a'], depth: 1 }); ty += 18; }
    for (const t of Hud.toasts) {
      const a = clamp(Math.min(t.t, t.max - t.t) * 4, 0, 1), tw = Math.max(E.font.width(t.title), t.text ? Glyph.text(null, t.text, 0, 0, '', { dry: true }) : 0) + 16, tx = Math.round((W - tw) / 2);
      px.blend(g, .8 * a, 'normal', () => px.rect(g, tx, ty, tw, t.text ? 22 : 13, '#140c0c'));
      px.blend(g, a, 'normal', () => { px.rect(g, tx, ty, tw, 1, '#e8b04a'); E.font.text(g, t.title, W / 2, ty + 3, '#e8b04a', { align: 'center', outline: false }); if (t.text) Glyph.text(g, t.text, W / 2, ty + 12, '#f4ead5', { align: 'center', shadow: false }); });
      ty += t.text ? 25 : 16;
    }
    if (Hud.card) { const c = Hud.card, a = clamp(Math.min(c.t, 3 - c.t) * 3, 0, 1), y = Math.round(H * .3); px.blend(g, a, 'normal', () => { px.rect(g, 0, y - 4, W, 34, '#100808'); px.rect(g, 0, y - 4, W, 1, '#c8202a'); px.rect(g, 0, y + 29, W, 1, '#c8202a'); E.font.title(g, c.name.toUpperCase(), W / 2, y, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd0a0', '#ff6a3a'], depth: 2 }); E.font.text(g, c.title, W / 2, y + 19, '#e8b04a', { align: 'center', outline: false }); }); }
    // ---- top right: the moon timer, the place ----
    let ry = my;
    if (M.timer && !M.timer.stopped) {
      const k = 1 - M.timer.t / M.timer.max, cx = W - mx - 22, cy = ry + 16, red = M.timer.t < 60;
      for (let i = 0; i <= 16; i++) { const an = Math.PI + i / 16 * Math.PI; px.dot(g, cx + Math.cos(an) * 18, cy + Math.sin(an) * 18, '#5a5a7a'); }
      const an = Math.PI + k * Math.PI; Art.moon(g, Math.round(cx + Math.cos(an) * 18), Math.round(cy + Math.sin(an) * 18), 4, red ? '#ff8a6a' : '#f4ecd0');
      E.font.text(g, fmtTime(M.timer.t), cx, cy + 2, red ? '#ff6a4a' : '#f4ead5', { align: 'center', shadow: '#000', outline: false }); ry += 30;
    }
    if (Hud.place && Hud.placeT > 0) { const a = clamp(Hud.placeT, 0, 1); px.blend(g, a, 'normal', () => E.font.text(g, Hud.place.name, W - mx, ry, '#e8dcc0', { align: 'right', shadow: '#000', outline: false })); }
    // ---- bottom left: the Ki Gauge (number, ring, ? or !), the eye (closed in shadow, open in light) ----
    if (!attract) {
      const kx = mx + 22, ky = H - my - 8, ks = Perception.kiState, col = Perception.COLOR[ks], K = Perception.ki;
      px.disc(g, kx, ky, 21, '#100a0a'); for (let i = 0; i <= 24; i++) { const an = Math.PI + i / 24 * Math.PI, on = i / 24 <= K / 99; px.rect(g, kx + Math.cos(an) * 18 - 1, ky + Math.sin(an) * 18 - 1, 2, 2, on ? col : '#2a2a30'); }
      E.font.text(g, String(K).padStart(2, '0'), kx, ky - 14, col, { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (ks !== 'calm') E.font.text(g, ks === 'alert' ? '!' : '?', kx + 16, ky - 22, col, { scale: 2, shadow: '#000', outline: false });
      const L = Perception.exp, ey = ky - 2, open = L > .55 ? 2 : L > .2 ? 1 : 0;
      px.rect(g, kx - 6, ey - 1, 13, 3, '#100a0a');
      if (open === 0) px.rect(g, kx - 5, ey, 11, 1, '#8a8aa8'); else { px.ell ? px.ell(g, kx, ey, 6, open === 2 ? 3 : 1.5, '#e8e0d0') : px.rect(g, kx - 5, ey - (open === 2 ? 2 : 1), 11, open === 2 ? 5 : 3, '#e8e0d0'); px.disc(g, kx, ey, open === 2 ? 2 : 1, '#1a1418'); }
      E.font.text(g, M.focus ? 'FOCUS' : open === 0 ? 'SHADOW' : open === 1 ? 'DIM' : 'LIT', kx, ky + 4, M.focus ? '#c8a8ff' : '#a8a090', { align: 'center', font: 'tiny', outline: false });
    }
    // ---- bottom right: the tool box, its neighbours, the compass ----
    if (!attract) {
      const bx = W - mx - 30, by = H - my - 30, sl = Hero.slot(h), n = h.bento.length;
      px.rect(g, bx - 2, by - 2, 32, 32, '#e8b04a'); px.rect(g, bx - 1, by - 1, 30, 30, '#1a1010'); px.rect(g, bx, by, 28, 28, '#2a1414');
      if (sl) { px.sprite(g, Art.icon[B.get('tool', sl.tool).icon], bx + 2, by + 2, { scale: 2 }); E.font.text(g, String(M.cheats.infinite ? '\u221e' : sl.n), bx + 27, by + 20, '#f4ead5', { align: 'right', shadow: '#000', outline: false }); E.font.text(g, B.get('tool', sl.tool).name, bx + 14, by - 11, '#e8dcc0', { align: 'center', shadow: '#000', outline: false }); }
      for (const [d, ox] of [[-1, -16], [1, 34]]) { for (let k = 1; k <= n; k++) { const i = ((h.sel + d * k) % n + n) % n, c = h.bento[i]; if (c && c.n > 0 && i !== h.sel) { px.blend(g, .6, 'normal', () => px.sprite(g, Art.icon[B.get('tool', c.tool).icon], bx + ox, by + 8)); break; } } }
      if (Glyph.device() === 'pad') { Glyph.draw(g, 'toolPrev', bx - 17, by + 19); Glyph.draw(g, 'toolNext', Math.min(r.W - 11, bx + 33), by + 19); }
      const cx = bx - 34, cy = by + 10, yaw = (game.yaw || 0) * Math.PI / 180, north = r.w(game.cam.tx || 0, (game.cam.ty || 0) - 30, 0), here = r.w(game.cam.tx || 0, game.cam.ty || 0, 0), an = Math.atan2(north[1] - here[1], north[0] - here[0]);
      void yaw; px.disc(g, cx, cy, 7, '#100a0a'); px.line(g, cx, cy, cx + Math.cos(an) * 6, cy + Math.sin(an) * 6, '#ff5a3a'); px.line(g, cx, cy, cx - Math.cos(an) * 4, cy - Math.sin(an) * 4, '#a8a090'); E.font.text(g, 'N', cx + Math.cos(an) * 10, cy + Math.sin(an) * 10 - 3, '#f4ead5', { align: 'center', font: 'tiny', outline: false });
    }
    // ---- bottom centre: prompts ----
    if (!attract) {
      const pr = Hud.prompts(M); let py = H - my - 12;
      for (const [act, label, prog] of pr.reverse()) {
        const w = Glyph.text(null, '{a:' + act + '} ' + label, 0, 0, '', { dry: true }) + 12, x = Math.round((W - w) / 2);
        px.blend(g, .7, 'normal', () => px.rect(g, x, py - 3, w, 14, '#140c0c'));
        Glyph.text(g, '{a:' + act + '} ' + label, W / 2, py, '#f4ead5', { align: 'center' });
        if (prog !== undefined) E.ui.bar(g, x + 2, py + 10, w - 4, 2, prog, '#e8b04a');
        py -= 17;
      }
    }
    // ---- tutorial card ----
    if (Hud.tut && !attract) {
      const t = Hud.tut, tw = Math.min(200, Math.round(W * .45)), lines = Hud.wrapGlyph(t.text, tw - 10), th = 16 + lines.length * 9, tx = mx, tyy = H - my - 56 - th;
      px.blend(g, .85, 'normal', () => px.rect(g, tx, tyy, tw, th, '#140c0c')); px.rect(g, tx, tyy, 2, th, '#e8b04a');
      E.font.text(g, t.title, tx + 6, tyy + 3, '#e8b04a', { outline: false });
      let i = 0; for (const seg of lines) { Glyph.text(g, seg, tx + 6, tyy + 13 + i * 9, '#f4ead5', { shadow: false }); i++; }
    }
    if (Hud.lessonT > 0 && Hud.lessonK) { const a = clamp(Hud.lessonT * 2, 0, 1), txt = { parry: 'An overhead! Tap {a:block} just before it lands: parry.', dodge: 'A lunge! {a:block} + {a:jump} with a direction: roll aside.', block: 'A combo! Hold {a:block} facing him.' }[Hud.lessonK]; px.blend(g, a, 'normal', () => Glyph.text(g, txt, W / 2, Math.round(H * .66), '#ffe08a', { align: 'center' })); }
    Hud.splashDraw(g, r);
  });
};
/** wrap text that holds {a:x} tokens (a token counts as a 4-letter word) */
Hud.wrapGlyph = (text, w) => {
  const words = text.split(' '), out = []; let line = '';
  for (const wd of words) { const tryL = line ? line + ' ' + wd : wd; if (Glyph.text(null, tryL, 0, 0, '', { dry: true }) > w && line) { out.push(line); line = wd; } else line = tryL; }
  if (line) out.push(line); return out;
};
/** the Silent Cut splash: 静斬 in red brush (chalk white for a training mark), an ink burst, a caption */
Hud.splashDraw = (g, r) => {
  if (Hud.splashT <= 0 || !Hud.splashK) return;
  const k = Hud.splashT, a = clamp(k * 3, 0, 1), s = 2, x = Math.round(r.W * .16), y = Math.round(r.H * .3), mark = Hud.splashK.mark, c = mark ? '#f4f0e6' : '#d02a20', edge = mark ? '#8a8a8a' : '#3a0806';
  px.blend(g, a, 'normal', () => {
    Art.splat(g, x + 33 * s, y + 30, 14 + (1.1 - k) * 18, mark ? '#d8d0c0' : '#7a0a0e', Hud.splashK.seed);
    Art.kanji(g, 'sei', x, y, s, c, edge, Hud.splashK.seed); Art.kanji(g, 'zan', x + 33 * s, y + 6, s, c, edge, Hud.splashK.seed + 1);
    E.font.text(g, mark ? 'SILENT MARK' : 'SILENT CUT', x + 33 * s, y + 70, '#f4ead5', { align: 'center', shadow: '#000', outline: false });
    E.font.text(g, SilentCut.LABEL[Hud.splashK.kind] || '', x + 33 * s, y + 80, '#e8b04a', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
  });
};
B.Hud = Hud;

/* ---- 71-scenes-menu.js ---- */
/* ---- MENUS: the title (a moonlit castle, the two apprentices on a tiled ridge; after 10 s idle, attract mode), the
 * character select, the mission select and the paged About / Credits. A touch-only device gets "Controller or keyboard
 * required" and a big Settings button instead of the menu ---- */
const MENU_SCENE = { view: 'side', res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: false } };
const paper = r => (g => { px.rect(g, 0, 0, r.W, r.H, '#140c0c'); for (let i = 0; i < 40; i++) { const x = (i * 97) % r.W, y = (i * 53) % r.H; px.dot(g, x, y, '#2a1814'); } })(r.ctx);
const TITLE_BG = new E.Backdrop({ sky: ['#05061a', '#10143a', '#2a2050', '#4a2a50'], moon: { x: .7, y: .3, r: 34, color: '#fff4d8' }, stars: 90, starsY: .7,
  layers: [{ kind: 'mountains', color: '#141a3a', y: .66, height: .28, parallax: .05, seed: 3 }, { kind: 'castle', color: '#0c0e24', y: .72, height: .44, parallax: .1, seed: 2 }, { kind: 'fog', color: '#3a3060', y: .8, height: .1, parallax: .2, drift: 6 }, { kind: 'forest', color: '#080a18', y: .86, height: .1, parallax: .3, seed: 5 }] });
const RIDGE = new E.PlatformMap({ rows: ['K'.repeat(80), 'K'.repeat(80)], legend: { K: 1 }, types: { 1: { style: 'block', side: '#3a4252', top: '#4a5468' } }, edges: 'open' });
const TMID = 640;
const TitleRigs = { sojiro: null, kaede: null };
const titleRig = id => TitleRigs[id] || (TitleRigs[id] = Rigs.make(id));
const versionLine = () => 'my-3D2dge v' + E.version + ' - Bentou 2 v' + B.version;
const titleScene = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.t = 0; this.pressed = !!(d && d.menu); B.Music.play('title'); game.follow(null); game.cam.bounds = null; Lt.enabled = false; game.lights.enabled = false;
    game.weather = { kind: 'petals', amount: .5, wind: .4 }; B.noteInput(); this.idleFrom = game.real; this.build();
  },
  build() {
    const any = game.saves.latest && game.saves.latest();
    this.items = [any && 'Continue', 'New Story', 'Missions', 'Shadow Trial', 'Workshop', 'Settings', 'About'].filter(Boolean);
    this.menu = new E.Menu(game, this.items, { x: 24, y: 112, box: false, color: '#f4ead5', pick: '#ffd36a', onPick: (i, it) => this.pick(it) });
  },
  pick(it) {
    Au.sfx('uiConfirm');
    if (it === 'Continue') Flow.continue();
    else if (it === 'New Story') game.go('charSelect', { then: 'story' }, { fade: 'dissolve' });
    else if (it === 'Missions') game.go('charSelect', { then: 'missions' }, { fade: 'dissolve' });
    else if (it === 'Shadow Trial') game.go('charSelect', { then: 'trial' }, { fade: 'dissolve' });
    else if (it === 'Workshop') game.go('workshop', {}, { fade: 'dissolve' });
    else if (it === 'Settings') game.menu('settings');
    else if (it === 'About') game.go('about', {}, { fade: 'dissolve' });
  },
  update(dt) {
    B.pollInput(); this.t += dt;
    if (game.real - B.lastInput > 10 && !ui.screen) { game.go('attract', {}, { fade: 'dissolve' }); return; }
    if (B.touchOnly()) { const c = game.input.clicked(); if (c && this.setBtn && c[0] >= this.setBtn.x && c[0] < this.setBtn.x + this.setBtn.w && c[1] >= this.setBtn.y && c[1] < this.setBtn.y + this.setBtn.h) game.menu('settings'); this.animate(dt); return; }
    if (ui.screen) { this.animate(dt); return; }
    if (!this.pressed) { if (game.input.pressed('start') || game.input.pressed('confirm') || game.input.clicked()) { this.pressed = true; Au.sfx('uiConfirm'); game.input.consumeAll(); } }
    else this.menu.update(dt);
    this.animate(dt);
  },
  animate(dt) {
    const t = game.time;
    titleRig('sojiro').update(dt, { x: TMID - 22, y: 0, z: 32, facing: 0, vx: 0, vy: 0, stance: 'ready' });
    titleRig('kaede').update(dt, { x: TMID + 22, y: 0, z: 32, facing: Math.PI, vx: 0, vy: 0, crouch: Math.sin(t * .5) > .6 });
    game.focus(TMID - Math.round(game.W * .18), 0, 32 + (game.H / 2 - 40) / -game.view.bz);
  },
  draw(r) {
    TITLE_BG.draw(r); RIDGE.draw(r);
    r.actor(TMID - 22, 0, 32, (g, ox, oy) => titleRig('sojiro').draw(g, ox, oy, r.view));
    r.actor(TMID + 22, 0, 32, (g, ox, oy) => titleRig('kaede').draw(g, ox, oy, r.view));
    for (const x of [TMID - 120, TMID + 120]) r.shape('paperLantern', x, 0, 32, {});
    r.overlay(g => {
      const W = r.W, ty = game.upright ? 64 : 14;
      E.font.title(g, 'BENTOU 2', W / 2, ty, { align: 'center', scale: 4, colors: ['#fff4c8', '#ffd36a', '#e8b04a', '#d8402a'], depth: 3, depthColor: '#3a0a0a' });
      E.font.text(g, 'Birth of the Lunchbox Assassins', W / 2, ty + 38, '#f4ead5', { align: 'center', gradient: ['#ffffff', '#e8c8a0'], shadow: '#140808', outline: false });
      px.sprite(g, Art.crest, Math.round(W / 2 + E.font.width('BENTOU 2', { scale: 4 }) / 2 + 6), ty + 4, { scale: 2 });
      E.font.text(g, versionLine(), W - 4, r.H - 10, '#6a6488', { align: 'right', font: 'tiny', outline: false });
      if (B.touchOnly()) {
        const bw = Math.min(240, W - 40), bx = Math.round((W - bw) / 2), by = ty + 76;
        px.blend(g, .85, 'normal', () => px.rect(g, bx, by, bw, 96, '#140c0c')); px.rect(g, bx, by, bw, 1, '#e8b04a');
        E.font.text(g, 'Controller or keyboard required', W / 2, by + 10, '#ffd36a', { align: 'center', outline: false });
        E.font.text(g, 'Connect a controller or a keyboard to play.', W / 2, by + 26, '#f4ead5', { align: 'center', outline: false, wrap: bw - 16 });
        this.setBtn = { x: bx + 40, y: by + 52, w: bw - 80, h: 30 }; px.rect(g, this.setBtn.x, this.setBtn.y, this.setBtn.w, this.setBtn.h, '#e8b04a'); E.font.text(g, 'SETTINGS', W / 2, this.setBtn.y + 9, '#1a1418', { align: 'center', scale: 2, outline: false });
        return;
      }
      if (!this.pressed) { if (Math.floor(this.t * 2) % 2 === 0) Glyph.text(g, 'PRESS {a:start}', Math.round(W * .3), Math.round(r.H * .5), '#f4ead5', { align: 'center', scale: 2 }); }
      else { const lbl = Glyph.device() === 'pad' ? '{a:confirm} Choose   {a:cancel} Back' : Glyph.device() === 'mouse' ? 'Click to choose' : '↑ ↓ + Enter'; Glyph.text(g, lbl, Math.max(12, Math.round(W * .08)), r.H - 24, '#b8b0d8', {}); }
    });
    if (this.pressed && !B.touchOnly()) { this.menu.x = Math.max(12, Math.round(r.W * .08)); this.menu.y = Math.max(70, Math.round(r.H * .36)); this.menu.draw(r); }
  }
});

/* ---- CHARACTER SELECT: two apprentices on a rooftop; left / right or hover; a greeting in their own voice ---- */
const CHAR_GREET = { sojiro: 'Sojiro. I carry the katana, and the shop\'s name.', kaede: 'Kaede. Two blades, light feet. Try to keep up.' };
const charScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d || {}; this.i = Save.get().character === 'kaede' ? 1 : 0; this.t = 0; this.greetT = 0; B.Music.play('shop'); this.greet(); this.rects = []; },
  greet() { const id = this.id(); B.Voice.say(CHAR_GREET[id], id); this.greetT = 3; },
  id() { return this.i ? 'kaede' : 'sojiro'; },
  update(dt) {
    B.pollInput(); this.t += dt; this.greetT -= dt;
    const I = game.input; let ch = false;
    if (I.pressed('left') && this.i) { this.i = 0; ch = true; } if (I.pressed('right') && !this.i) { this.i = 1; ch = true; }
    const p = I.pointer(); if (p && B.mouseMode()) { const k = p[0] < game.W / 2 ? 0 : 1; if (k !== this.i) { this.i = k; ch = true; } }
    if (ch) { Au.sfx('uiMove'); this.greet(); }
    if (I.pressed('confirm') || I.clicked() || I.pressed('start')) { Au.sfx('uiConfirm'); this.choose(); return; }
    if (I.pressed('cancel')) { game.go('title', { menu: true }); return; }
    for (const [k, x] of [['sojiro', TMID - 40], ['kaede', TMID + 40]]) titleRig(k).update(dt, { x, y: 0, z: 32, facing: Math.PI / 2, vx: 0, vy: 0, stance: this.id() === k ? 'ready' : null, pose: this.id() === k && this.t % 6 < 1 ? 'cheer' : undefined });
    game.focus(TMID, 0, 32 + (game.H / 2 - 60) / -game.view.bz);
  },
  choose() {
    const id = this.id(), then = this.d.then;
    Save.get().character = id;
    if (then === 'story') Flow.newStory(id);
    else if (then === 'missions') game.go('missions', { char: id }, { fade: 'dissolve' });
    else if (then === 'trial') Flow.bento('delivery', id, 'trial');
    else game.go('title', { menu: true });
  },
  draw(r) {
    B.BACKDROPS.roof.draw(r); RIDGE.draw(r);
    for (const [k, x] of [['sojiro', TMID - 40], ['kaede', TMID + 40]]) r.actor(x, 0, 32, (g, ox, oy) => titleRig(k).draw(g, ox, oy, r.view), { flash: this.id() === k ? false : '#202040', flashMix: .5 });
    r.overlay(g => {
      const W = r.W, id = this.id(), C = CHARS[id];
      E.font.title(g, 'CHOOSE YOUR APPRENTICE', W / 2, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      const pw = Math.min(W - 20, 300), x0 = Math.round((W - pw) / 2), y0 = 30, half = Math.round(pw * .42);
      px.blend(g, .82, 'normal', () => px.rect(g, x0, y0, pw, 62, '#140c0c')); px.rect(g, x0, y0, pw, 1, id === 'kaede' ? '#5ad8c8' : '#ff8a6a');
      E.font.title(g, C.name.toUpperCase(), x0 + 6, y0 + 5, { scale: 2, colors: ['#ffffff', id === 'kaede' ? '#5ad8c8' : '#ff8a6a'], depth: 1 });
      E.font.text(g, C.weapon, x0 + 6, y0 + 24, '#e8b04a', { outline: false });
      ['Strength', 'Speed', 'Stealth'].forEach((l, i) => { E.font.text(g, l, x0 + half, y0 + 5 + i * 10, '#b8a890', { outline: false }); E.ui.bar(g, x0 + half + 48, y0 + 7 + i * 10, pw - half - 56, 4, C.bars[i], '#d8402a'); });
      E.font.text(g, C.blurb, x0 + 6, y0 + 38, '#f4ead5', { outline: false, wrap: pw - 12 });
      if (this.greetT > 0) { const tw = E.font.width(CHAR_GREET[id]) + 16; px.blend(g, .8, 'normal', () => px.rect(g, Math.round((W - tw) / 2), r.H - 44, tw, 14, '#140c0c')); E.font.text(g, CHAR_GREET[id], W / 2, r.H - 41, '#f4ead5', { align: 'center', outline: false }); }
      Glyph.text(g, '{a:left} {a:right} Choose   {a:confirm} Begin   {a:cancel} Back', W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- MISSION SELECT: the unlocked missions on a scroll, each with its best rank per apprentice ---- */
const missionsScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.char = (d && d.char) || Save.get().character || 'sojiro'; const done = Save.get().completed; this.list = STORY_ORDER.filter((id, i) => i === 0 || done[STORY_ORDER[i - 1]] || done[id] || (B.Dev && B.Dev.unlockAll)); this.i = 0; B.Music.play('shop'); this.rects = []; },
  update(dt) {
    B.pollInput(); const I = game.input;
    if (I.repeat('up')) { this.i = (this.i + this.list.length - 1) % this.list.length; Au.sfx('uiMove'); } if (I.repeat('down')) { this.i = (this.i + 1) % this.list.length; Au.sfx('uiMove'); }
    if (I.pressed('block') || I.pressed('grapple')) { this.char = this.char === 'kaede' ? 'sojiro' : 'kaede'; Au.sfx('uiMove'); }
    const p = I.pointer(); if (p && B.mouseMode()) for (const rc of this.rects) if (p[1] >= rc.y && p[1] < rc.y + rc.h && p[0] >= rc.x && p[0] < rc.x + rc.w) this.i = rc.i;
    const cl = I.clicked(); let pick = I.pressed('confirm'); if (cl) for (const rc of this.rects) if (cl[1] >= rc.y && cl[1] < rc.y + rc.h && cl[0] >= rc.x && cl[0] < rc.x + rc.w) { this.i = rc.i; pick = true; }
    if (pick) { Au.sfx('uiConfirm'); Flow.briefing(this.list[this.i], this.char, 'missions'); }
    if (I.pressed('cancel')) game.go('title', { menu: true });
  },
  draw(r) {
    paper(r); this.rects = [];
    r.overlay(g => {
      const W = r.W, sw = Math.min(300, W - 40), sx = Math.round((W - sw) / 2);
      E.font.title(g, 'MISSIONS', W / 2, 10, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      E.font.text(g, 'Playing as ' + CHARS[this.char].name, W / 2, 30, '#f4ead5', { align: 'center', outline: false }); Glyph.text(g, '{a:block} {a:grapple} Switch', W / 2, 40, '#b8a890', { align: 'center' });
      this.list.forEach((id, i) => { const m = B.get('mission', id), y = 56 + i * 34, on = i === this.i, best = (Save.get().best[id] || {});
        this.rects.push({ i, x: sx, y, w: sw, h: 30 });
        px.rect(g, sx, y, sw, 30, on ? '#e8dcc0' : '#2a1a14'); px.rect(g, sx, y, 3, 30, on ? '#8a1c1c' : '#4a2a20');
        E.font.text(g, m.chapter, sx + 10, y + 4, on ? '#8a1c1c' : '#b8a890', { outline: false }); E.font.text(g, m.title, sx + 10, y + 15, on ? '#1a1418' : '#f4ead5', { outline: false, scale: 1 });
        for (const [k, c] of [['sojiro', 0], ['kaede', 1]]) { const b = best[k], x = sx + sw - 50 + c * 24; if (b) { const rk = B.RANKS.find(q => q[1] === b.rank); Art.hanko(g, x, y + 15, 9, rk ? rk[2] : '?', .9); } else { px.rect(g, x - 8, y + 7, 16, 16, on ? '#d8ccb0' : '#3a2a20'); } E.font.text(g, k === 'kaede' ? 'K' : 'S', x, y + 25, on ? '#3a2a20' : '#8a7a6a', { align: 'center', font: 'tiny', outline: false }); } });
      Glyph.text(g, '{a:up} {a:down} Choose   {a:confirm} Brief   {a:cancel} Back', W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- ABOUT / CREDITS: paged, large type ---- */
const aboutScene = Object.assign({}, MENU_SCENE, {
  enter() { this.p = 0; this.scroll = 0; this.pages = B.About.pages(); B.Music.play('shop'); },
  update(dt) {
    B.pollInput(); const I = game.input, n = this.pages.length;
    if (I.pressed('right') || I.pressed('grapple')) { this.p = (this.p + 1) % n; this.scroll = 0; Au.sfx('uiMove'); }
    if (I.pressed('left') || I.pressed('block')) { this.p = (this.p + n - 1) % n; this.scroll = 0; Au.sfx('uiMove'); }
    if (I.down('down')) this.scroll += dt * 60; if (I.down('up')) this.scroll = Math.max(0, this.scroll - dt * 60);
    if (B.wheel) { this.scroll = Math.max(0, this.scroll + B.wheel * 12); B.wheel = 0; }
    const cl = I.clicked(); if (cl) { if (cl[0] < game.W * .25) { this.p = (this.p + n - 1) % n; this.scroll = 0; } else if (cl[0] > game.W * .75) { this.p = (this.p + 1) % n; this.scroll = 0; } }
    if (I.pressed('cancel') || I.pressed('confirm')) game.go('title', { menu: true });
  },
  draw(r) {
    paper(r);
    const pg = this.pages[this.p];
    r.overlay(g => {
      const W = r.W, x0 = Math.round(W * .08), w = W - x0 * 2;
      E.font.title(g, pg[0].toUpperCase(), W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      let y = 34 - Math.round(this.scroll); const maxY = r.H - 22;
      for (const para of pg[1]) {
        const head = para.startsWith('# '), lines = E.font.wrap(head ? para.slice(2) : para, w);
        for (const l of lines) { if (y > 26 && y < maxY) E.font.text(g, l, x0, y, head ? '#e8b04a' : '#f4ead5', { outline: false, shadow: '#000' }); y += 10; }
        y += 4;
      }
      // the scroll stops where the page's last line sits above the prompt bar (it never scrolls the words away)
      const most = Math.max(0, y + Math.round(this.scroll) - maxY + 10); if (this.scroll > most) this.scroll = most;
      if (y > maxY) E.font.text(g, '↓ more', W - 8, maxY - 2, '#8a7a6a', { align: 'right', font: 'tiny', outline: false });
      px.rect(g, 0, r.H - 20, W, 20, '#140c0c');
      Glyph.text(g, '◀ {a:left}   Page ' + (this.p + 1) + ' of ' + this.pages.length + '   {a:right} ▶     {a:up}{a:down} Scroll   {a:cancel} Back', W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});
B.menuScenes = { title: titleScene, charSelect: charScene, missions: missionsScene, about: aboutScene };

/* ---- 72-scenes-story.js ---- */
/* ---- THE STORY'S FLOW and its screens: the opening crawl, the briefing card, Pack the Bento, the results scroll with
 * its hanko stamp, the debriefs, the ending and the credits. Big, sparse, one decision per screen ---- */
const Flow = {};
Flow.newStory = char => { const d = Save.fresh(char); d.story = true; Save.data = d; Save.write(); game.go('crawl', { char }, { fade: 'dissolve' }); };
Flow.continue = () => { const s = game.saves.latest(); if (s) game.saves.load(s.slot); const d = Save.get(); if (d.nextMission === 'ending') Flow.ending(d.character); else Flow.briefing(d.nextMission || 'training', d.character, 'story'); };
/** the briefing: its scene, then the objectives card */
Flow.briefing = (mid, char, mode = 'story') => {
  const mis = B.get('mission', mid); if (mode === 'story') { Save.get().nextMission = mid; Save.write(); }
  const card = () => game.go('brief', { mid, char, mode });
  if (mis.briefing && (mode === 'story' || mode === 'missions')) Cutscene.play(mis.briefing, char, card); else card();
};
Flow.bento = (mid, char, mode) => game.go('bento', { mid, char, mode }, { fade: 'dissolve' });
Flow.start = (mid, char, mode, loadout) => { const d = Save.get(); d.lastLoadout[mid] = Bento.copy(loadout); game.go('mission', { mission: mid, char, mode, loadout }, { fade: 'iris', seconds: .5 }); };
/** a mission was won: score it, record it, show the results */
Flow.missionDone = M => {
  const mis = B.get('mission', M.missionId) || { par: M.level.par || 600 }, sc = Score.story(M, mis.par || M.level.par);
  if (M.forceRank) { const rk = B.RANKS.find(q => q[1] === M.forceRank); sc.total = Math.max(rk[0], 0); sc.parts.push(['Dev mode', 0]); }
  const rank = Score.rank(sc.total);
  let unlocks = [];
  if ((M.mode === 'story' || M.mode === 'missions') && mis.title) { unlocks = Save.record(M.missionId, M.char, sc.total, rank[1]); const d = Save.get(); d.playSeconds += M.stats.time; if (M.mode === 'story') d.nextMission = mis.next || 'ending'; Save.write(); }
  if (M.mode === 'workshop') { game.go('results', { M, sc, rank, unlocks: [], mode: 'workshop' }); return; }
  game.go('results', { M, sc, rank, unlocks, mode: M.mode, mid: M.missionId, char: M.char });
};
Flow.after = (d) => {
  const mis = B.get('mission', d.mid);
  if (d.mode === 'story') {
    const dbf = d.mid === 'm1' && !(d.M.pickups.find(p => p.id === 'ledger') || {}).taken ? 'debrief1_noletter' : mis.debrief;
    if (d.mid === 'm3') { Flow.ending(d.char); return; }
    Cutscene.play(dbf, d.char, () => Flow.briefing(mis.next, d.char, 'story'));
  } else game.go('missions', { char: d.char });
};
Flow.ending = char => Cutscene.play('ending', char, () => Cutscene.play('ending2', char, () => game.go('credits', { char })));
B.Flow = Flow;

/* ---- THE CRAWL: white brush text on dark paper, Granny's voice ---- */
const crawlScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.i = 0; this.t = 0; B.Music.play('title'); this.say(); },
  say() { const l = Story.crawl[this.i]; if (l) B.Voice.say(l, 'granny', { vol: .7 }); },
  update(dt) {
    B.pollInput(); this.t += dt;
    if (game.input.pressed('confirm') || game.input.pressed('start') || this.t > 4.2) { this.i++; this.t = 0; if (this.i >= Story.crawl.length) { Cutscene.play('prologue', this.d.char, () => Flow.briefing('training', this.d.char, 'story')); return; } this.say(); }
    if (game.input.down('pause') && game.input.pressed('pause')) Cutscene.play('prologue', this.d.char, () => Flow.briefing('training', this.d.char, 'story'));
  },
  draw(r) {
    paper(r);
    r.overlay(g => {
      Art.moon(g, r.W - 50, 40, 14, '#e8dcc0');
      for (let k = 0; k <= this.i && k < Story.crawl.length; k++) { const a = k === this.i ? clamp(this.t * 1.5, 0, 1) : .55; px.blend(g, a, 'normal', () => E.font.text(g, Story.crawl[k], r.W / 2, Math.round(r.H * .25) + k * 18, '#f4ead5', { align: 'center', shadow: '#000', outline: false, wrap: r.W - 40 })); }
      Glyph.text(g, '{a:confirm} Next    Hold {a:pause} skip', r.W / 2, r.H - 14, '#8a7a6a', { align: 'center' });
    });
  }
});

/* ---- THE BRIEFING CARD: the mission, its chapter, its objectives in two or three lines ---- */
const briefScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.mis = B.get('mission', d.mid); this.t = 0; B.Music.play('shop'); this.menu = new E.Menu(game, ['Pack the bento', 'Back'], { y: 'center', box: false, onPick: i => { if (i === 0) Flow.bento(d.mid, d.char, d.mode); else game.go(d.mode === 'story' ? 'title' : 'missions', { char: d.char }); }, onCancel: () => game.go(d.mode === 'story' ? 'title' : 'missions', { char: d.char }) }); },
  update(dt) { B.pollInput(); this.t += dt; this.menu.update(dt); },
  draw(r) {
    B.BACKDROPS.shop.draw(r); B.paintRoom(r, 'shop');
    const m = this.mis;
    r.overlay(g => {
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#140c0c'));
      const y = Math.round(r.H * .14);
      E.font.text(g, (m.chapter || '').toUpperCase(), r.W / 2, y, '#e8b04a', { align: 'center', outline: false });
      E.font.title(g, m.title, r.W / 2, y + 12, { align: 'center', scale: 2, colors: ['#ffffff', '#f4ead5', '#e8b04a'], depth: 2 });
      (m.objectivesCard || []).forEach((l, i) => { px.rect(g, r.W / 2 - 90, y + 44 + i * 16, 4, 4, '#d8402a'); E.font.text(g, l, r.W / 2 - 82, y + 42 + i * 16, '#f4ead5', { outline: false, shadow: '#000' }); });
      E.font.text(g, 'Par ' + fmtTime(m.par) + (Save.get().best[this.d.mid] && Save.get().best[this.d.mid][this.d.char] ? '    Best: ' + Save.get().best[this.d.mid][this.d.char].rank : ''), r.W / 2, y + 96, '#b8a890', { align: 'center', outline: false });
    });
    this.menu.y = Math.round(r.H * .66); this.menu.draw(r);
  }
});

/* ---- PACK THE BENTO: a black-lacquer box of two tiers, four compartments each; the tool shelf on the left ---- */
const bentoScene = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; const save = Save.get(), mis = B.get('mission', d.mid) || {};
    this.shelf = TOOL_ORDER.filter(id => Bento.unlocked(id, save) || (B.Dev && B.Dev.unlockAll));
    this.slots = Bento.copy(save.lastLoadout[d.mid] && save.lastLoadout[d.mid].length === 8 ? save.lastLoadout[d.mid] : Bento.fromHint(mis.loadoutHint, save));
    this.slots = this.slots.map(s => s && this.shelf.includes(s.tool) ? s : null);
    this.focus = { area: 'shelf', i: 0 }; this.sel = this.shelf[0]; this.t = 0; this.rects = [];
    B.Music.play('shop');
  },
  fill(i, tool) { const t = B.get('tool', tool); this.slots[i] = { tool, n: t.stack }; Au.sfx('uiConfirm'); },
  empty(i) { if (this.slots[i]) { this.slots[i] = null; Au.sfx('uiBack'); } },
  restore() { this.slots = Bento.fromHint((B.get('mission', this.d.mid) || {}).loadoutHint, Save.get()); Au.sfx('fusuma'); },
  go() { Flow.start(this.d.mid, this.d.char, this.d.mode, this.slots); },
  update(dt) {
    B.pollInput(); this.t += dt;
    const I = game.input, f = this.focus, mv = (a) => I.repeat(a, .3, .1);
    if (f.area === 'shelf') { if (mv('up')) { f.i = (f.i + this.shelf.length - 1) % this.shelf.length; Au.sfx('uiMove'); } if (mv('down')) { f.i = (f.i + 1) % this.shelf.length; Au.sfx('uiMove'); } if (mv('right')) { f.area = 'box'; f.i = 0; Au.sfx('uiMove'); } this.sel = this.shelf[f.i]; }
    else if (f.area === 'box') { const c = f.i % 4, row = Math.floor(f.i / 4); if (mv('left')) { if (c === 0) { f.area = 'shelf'; f.i = Math.max(0, this.shelf.indexOf(this.sel)); } else f.i--; Au.sfx('uiMove'); } if (mv('right') && c < 3) { f.i++; Au.sfx('uiMove'); } if (mv('up') && row > 0) { f.i -= 4; Au.sfx('uiMove'); } if (mv('down')) { if (row < 1) f.i += 4; else { f.area = 'go'; } Au.sfx('uiMove'); } }
    else if (f.area === 'go') { if (mv('up')) { f.area = 'box'; f.i = 4; Au.sfx('uiMove'); } if (mv('left')) { f.area = 'shelf'; f.i = 0; } }
    // the mouse: hover focuses, click places, right click empties
    const p = I.pointer(), cl = I.clicked();
    if (p && B.mouseMode()) for (const rc of this.rects) if (p[0] >= rc.x && p[0] < rc.x + rc.w && p[1] >= rc.y && p[1] < rc.y + rc.h) { if (rc.area !== f.area || rc.i !== f.i) { f.area = rc.area; f.i = rc.i; if (rc.area === 'shelf') this.sel = this.shelf[rc.i]; } }
    if (cl) for (const rc of this.rects) if (cl[0] >= rc.x && cl[0] < rc.x + rc.w && cl[1] >= rc.y && cl[1] < rc.y + rc.h) { if (rc.area === 'box') this.fill(rc.i, this.sel); else if (rc.area === 'shelf') { this.sel = this.shelf[rc.i]; const e = this.slots.findIndex(s => !s); if (e >= 0) this.fill(e, this.sel); } else if (rc.area === 'go') this.go(); else if (rc.area === 'back') game.go('brief', this.d); return; }
    if (I.pressed('block') && I.held.has('Mouse2') && f.area === 'box') this.empty(f.i);
    if (I.pressed('confirm')) { if (f.area === 'box') this.fill(f.i, this.sel); else if (f.area === 'shelf') { const e = this.slots.findIndex(s => !s); if (e >= 0) this.fill(e, this.sel); else { f.area = 'box'; f.i = 0; } } else this.go(); }
    if (I.pressed('cancel') && !I.held.has('Escape')) { if (f.area === 'box' && this.slots[f.i]) this.empty(f.i); else game.go('brief', this.d); }
    if (I.pressed('cancel') && I.held.has('Escape')) game.go('brief', this.d);
    if (I.pressed('interact')) this.restore();
    if (I.pressed('start') && !I.held.has('Enter') && !I.held.has('NumpadEnter')) this.go();
  },
  draw(r) {
    B.BACKDROPS.shop.draw(r); B.paintRoom(r, 'shop');
    const W = r.W, H = r.H, f = this.focus; this.rects = [];
    r.overlay(g => {
      px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, W, H, '#140c0c'));
      E.font.title(g, 'PACK THE BENTO', W / 2, 8, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      // the shelf
      const sx = Math.round(W * .04), sy = 30, rowH = Math.max(14, Math.min(19, Math.floor((H - 70) / this.shelf.length)));
      this.shelf.forEach((id, i) => { const t = B.get('tool', id), y = sy + i * rowH, on = f.area === 'shelf' && f.i === i, sel = this.sel === id;
        this.rects.push({ area: 'shelf', i, x: sx, y, w: Math.round(W * .36), h: rowH - 1 });
        px.rect(g, sx, y, Math.round(W * .36), rowH - 1, on ? '#4a2418' : sel ? '#2e1810' : '#1e1010'); if (on) px.rect(g, sx, y, 2, rowH - 1, '#e8b04a');
        px.sprite(g, Art.icon[t.icon], sx + 4, y + Math.max(0, (rowH - 13) >> 1)); E.font.text(g, t.name, sx + 20, y + 2, on ? '#ffe08a' : '#f4ead5', { outline: false }); if (rowH >= 17) E.font.text(g, '×' + t.stack, sx + Math.round(W * .36) - 4, y + 2, '#b8a890', { align: 'right', outline: false }); });
      const t = B.get('tool', this.sel); if (t) E.font.text(g, t.desc, sx, sy + this.shelf.length * rowH + 4, '#e8dcc0', { outline: false, wrap: Math.round(W * .36) });
      // the box: two tiers side by side, 2 x 2 compartments each (black lacquer, a red rim, gold corners)
      const bx = Math.round(W * .45), by = 34, cs = Math.max(30, Math.min(44, Math.floor((W - bx - 20) / 4.4))), gap = 4;
      for (const tier of [0, 1]) { const tx = bx + tier * (cs * 2 + gap * 3 + 8); px.rect(g, tx - 4, by - 4, cs * 2 + gap + 8, cs * 2 + gap + 8, '#8a1c1c'); px.rect(g, tx - 2, by - 2, cs * 2 + gap + 4, cs * 2 + gap + 4, '#1e1616'); for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) px.rect(g, tx - 4 + cx * (cs * 2 + gap + 5), by - 4 + cy * (cs * 2 + gap + 5), 3, 3, '#e8b04a'); E.font.text(g, tier ? 'Steel tier' : 'Food tier', tx + cs + gap / 2, by + cs * 2 + gap + 8, '#b8a890', { align: 'center', outline: false }); }
      for (let i = 0; i < 8; i++) {
        const tier = i % 4 >= 2 ? 1 : 0, c = i % 2, row = Math.floor(i / 4), tx = bx + tier * (cs * 2 + gap * 3 + 8) + c * (cs + gap), ty = by + row * (cs + gap), s = this.slots[i], on = f.area === 'box' && f.i === i;
        this.rects.push({ area: 'box', i, x: tx, y: ty, w: cs, h: cs });
        px.rect(g, tx, ty, cs, cs, on ? '#3a1a14' : '#2a1414'); px.rect(g, tx, ty, cs, 1, '#3a2a2a');
        if (on) { px.rect(g, tx, ty, cs, 2, '#e8b04a'); px.rect(g, tx, ty + cs - 2, cs, 2, '#e8b04a'); px.rect(g, tx, ty, 2, cs, '#e8b04a'); px.rect(g, tx + cs - 2, ty, 2, cs, '#e8b04a'); }
        if (s) { px.sprite(g, Art.icon[B.get('tool', s.tool).icon], tx + (cs - 24) / 2, ty + (cs - 24) / 2 - 3, { scale: 2 }); E.font.text(g, '×' + s.n, tx + cs - 3, ty + cs - 10, '#f4ead5', { align: 'right', shadow: '#000', outline: false }); }
        else E.font.text(g, '--', tx + cs / 2, ty + cs / 2 - 3, '#4a3a3a', { align: 'center', outline: false });
      }
      const gy = by + cs * 2 + gap + 24, on = f.area === 'go', gw = 130;
      this.rects.push({ area: 'go', i: 0, x: Math.round(bx + (cs * 4 + gap * 4 + 8 - gw) / 2), y: gy, w: gw, h: 16 });
      px.rect(g, Math.round(bx + (cs * 4 + gap * 4 + 8 - gw) / 2), gy, gw, 16, on ? '#e8b04a' : '#4a2418'); E.font.text(g, 'Set out into the night', Math.round(bx + (cs * 4 + gap * 4 + 8) / 2), gy + 4, on ? '#1a1418' : '#f4ead5', { align: 'center', outline: false });
      Glyph.text(g, '{a:confirm} Place   {a:cancel} Empty   {a:interact} Suggested   {a:start} Start', W / 2, H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- RESULTS: a scroll unrolls, one line at a time; the score counts up; the hanko slams down; Granny's word ---- */
const resultsScene = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; this.t = 0; this.stamped = false; this.menu = null; const s = d.M.stats;
    this.lines = [['Time', fmtTime(s.time)], ['Silent Cuts', s.silentCuts], ['Kills', s.kills], ['Times detected', s.detections], ['Civilians harmed', s.civiliansHarmed], ['Optional tasks', s.optionalDone], ['Tools used', s.toolsUsed], ['Retries', s.retries]];
    this.rig = Rigs.make(d.char === 'kaede' ? 'kaede' : 'sojiro'); B.Music.play('results');
  },
  update(dt) {
    B.pollInput(); this.t += dt;
    if ((game.input.pressed('confirm') || game.input.pressed('start')) && this.t < 4.4) this.t = 4.4;
    if (this.t > 4.2 && !this.stamped) { this.stamped = true; Au.sfx('stamp'); game.shake(4); if (this.d.unlocks.length) Au.sfx('stingTool'); }
    if (this.t > 4.6 && !this.menu) {
      const d = this.d, items = d.mode === 'workshop' ? ['Back to the Workshop', 'Play again'] : d.mode === 'story' ? ['Continue', 'Retry'] : ['Missions', 'Retry'];
      this.menu = new E.Menu(game, items, { box: false, onPick: (i, it) => { if (it === 'Continue' || it === 'Missions') Flow.after(d); else if (it === 'Retry') Flow.bento(d.mid, d.char, d.mode); else if (it === 'Back to the Workshop') game.go('workshop', { resume: true }); else if (it === 'Play again') game.go('mission', { M: Mission.restore(d.M, null) }); } });
    }
    if (this.menu && this.t > 4.7) this.menu.update(dt);
    this.rig._post = Rigs.bow(clamp((this.t - 4.4) * 2, 0, 1) * (this.t < 7 ? 1 : 0));
    this.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
  },
  draw(r) {
    paper(r);
    const W = r.W, H = r.H, d = this.d, k = clamp(this.t / .8, 0, 1), sw = Math.min(260, W - 120), sx = Math.round((W - sw) / 2) + 30, sy = 14, sh = Math.round((H - 40) * k);
    r.overlay(g => {
      px.rect(g, sx - 6, sy - 4, sw + 12, 6, '#5a3a20'); px.rect(g, sx, sy, sw, sh, '#e8dcc0'); px.rect(g, sx, sy, 3, sh, '#c8b898'); px.rect(g, sx + sw - 3, sy, 3, sh, '#c8b898'); if (k >= 1) px.rect(g, sx - 6, sy + sh - 2, sw + 12, 6, '#5a3a20');
      const title = d.mode === 'workshop' ? 'Workshop test' : (B.get('mission', d.mid) || {}).title || d.M.level.name;
      if (k > .3) E.font.text(g, title, sx + sw / 2, sy + 8, '#1a1418', { align: 'center', outline: false });
      this.lines.forEach((l, i) => { const at = .9 + i * .3; if (this.t < at) return; const y = sy + 24 + i * 13, a = clamp((this.t - at) * 4, 0, 1); E.font.text(g, l[0], sx + 14, y, '#3a2a20', { outline: false }); E.font.text(g, String(l[1]), sx + sw - 70, y, '#1a1418', { align: 'right', outline: false }); px.rect(g, sx + 12, y + 9, Math.round((sw - 80) * a), 1, '#8a1c1c'); });
      if (this.t > 3.4) { const sc = Math.round(d.sc.total * clamp((this.t - 3.4) / .8, 0, 1)); E.font.text(g, 'Score', sx + 14, sy + 24 + 8 * 13 + 4, '#3a2a20', { outline: false }); E.font.title(g, String(sc), sx + sw - 70, sy + 24 + 8 * 13, { align: 'right', scale: 2, colors: ['#3a2a20', '#1a1418'], depth: 0 }); }
      if (this.stamped) {
        const s = clamp((this.t - 4.2) * 6, 0, 1), sz = Math.round(lerp(40, 22, s)), hx = sx + sw - 34, hy = sy + 40;
        Art.hanko(g, hx, hy, sz, d.rank[2], s); E.font.text(g, d.rank[1], hx, hy + sz + 4, '#8a1c1c', { align: 'center', outline: false });
        E.font.text(g, '"' + Story.results[d.rank[1]] + '"', sx + sw / 2, sy + 24 + 9 * 13 + 10, '#3a2a20', { align: 'center', outline: false, wrap: sw - 20 });
        E.font.text(g, '-- Granny Oshima', sx + sw - 14, sy + 24 + 9 * 13 + 22, '#5a4a3a', { align: 'right', outline: false });
        d.unlocks.forEach((id, i) => { const t = B.get('tool', id), y = sy + sh - 22 - i * 20; px.rect(g, sx + 10, y, sw - 20, 18, '#2a1414'); px.sprite(g, Art.icon[t.icon], sx + 14, y + 3); E.font.text(g, 'New tool: ' + t.name, sx + 30, y + 5, '#ffe08a', { outline: false }); });
      }
    });
    r.actor(-150, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    game.focus(-100, 0, 30 + (game.H / 2 - 52) / -game.view.bz);
    if (this.menu) { this.menu.y = r.H - 34; this.menu.draw(r); }
  }
});

/* ---- CREDITS: a roll over the moon; any input speeds it; then the post-credits scene and the title ---- */
const creditsScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.y = 0; B.Music.play('ending'); this.lines = B.About.creditLines(); },
  update(dt) { B.pollInput(); const fast = game.input.down('confirm') || game.input.down('start') || game.input.down('attack'); this.y += dt * (fast ? 90 : 22); if (this.y > this.lines.length * 14 + game.H + 20 && !this.out) { this.out = true; Cutscene.play('postcredits', this.d.char, () => game.go('title')); } },
  draw(r) {
    B.BACKDROPS.roof.draw(r);
    r.overlay(g => { this.lines.forEach((l, i) => { const y = Math.round(r.H + i * 14 - this.y); if (y < -10 || y > r.H + 10) return; const head = l.startsWith('# '); E.font.text(g, head ? l.slice(2) : l, r.W / 2, y, head ? '#e8b04a' : '#f4ead5', { align: 'center', shadow: '#000', outline: false }); }); Glyph.text(g, 'Hold {a:confirm} to hurry', r.W - 6, r.H - 12, '#8a7a6a', { align: 'right' }); });
  }
});
B.storyScenes = { crawl: crawlScene, brief: briefScene, bento: bentoScene, results: resultsScene, credits: creditsScene };

/* ---- 73-scene-mission.js ---- */
/* ---- THE MISSION SCENE: one gameplay scene for the story, the Shadow Trial, the hub round, attract mode and the
 * Workshop's test play. Each step: the intent, the hero, the senses, the minds, bosses, Tobei, tools, the mission's rules,
 * the HUD, the music, the camera. It draws the level, Shadow Sight's actors, the HUD and the game-over overlay ---- */
let GPU = null;
const LIGHT_AMB = { dusk: .5, night: .38, rain: .32, festival: .44 };
const MS = {};
MS.enter = d => {
  const opts = d || {};
  let M = opts.M;
  if (!M) {
    const mid = opts.mission || 'training', mis = B.get('mission', mid), lv = opts.level || (mis ? mis.level : mid);
    M = Mission.create(lv, { mode: opts.mode || 'story', char: opts.char || Save.get().character || 'sojiro', missionId: mid, loadout: opts.loadout, cheats: opts.cheats, save: Save.get() });
    M.startLoadout = Bento.copy(M.hero.bento); M.levelSpec = opts.level && typeof opts.level === 'object' ? opts.level : null;
  }
  M.onEnd = opts.onEnd || M.onEnd || null; M.endT = 0; M.overMenu = null;
  B.M = M; Tools.cd = 0; Hud.reset(); Cutscene.clear(); game.resetCamera(); Cam.reset(); Grapple.cands = []; Grapple.best = null; Grapple.aiming = false; SilentCut.active = null; SilentCut.slowT = 0;
  game.timeScale = (B.Dev && B.Dev.timeScale) || 1;
  if (game.settings.camAngle === 'high') game.setView('threequarter'); else game.setView('iso');
  const W = M.world, L = M.level;
  Lt.enabled = true; Lt.ambient = clamp(T('ambientNight') * (LIGHT_AMB[L.time] || .38) / .38, .1, .9);
  if (!game.headless && !GPU && typeof navigator !== 'undefined' && navigator.gpu && !(E.session && (E.session.recording || E.session.replaying))) { try { GPU = game.enableGPU({ map: W.map }); } catch (e) { GPU = null; } }
  if (GPU) { GPU.map = W.map; GPU.enabled = true; const a = Lt.ambient; GPU.ambient = [a * .8, a * .85, a * 1.15]; }
  game.weather = L.weather ? { kind: L.weather, amount: L.weather === 'rain' ? .9 : .5, wind: .3, lightning: 0 } : null;
  game.cam.bounds = v => W.map.bounds(v); game.cam.smooth = .12; game.cam.snap = true; game.follow(null);
  M.lightT = 6 + rand() * 6;
  B.Music.play(M.music || L.music || 'm1', { fade: .6 }); Au.layer && Music.cur && (Music.level = 0);
  if (M.snap) B.Hud.toast('Checkpoint', 'Back where the rice was last good.');
  B.emit('missionStart', { M });
};
MS.intent = M => {
  if (M.mode === 'attract' && B.Autopilot) return B.Autopilot.intent(M);
  if (B.testIntent) return Object.assign(B.noIntent(), B.testIntent);
  if (M.autopilot && B.Autopilot) return B.Autopilot.intent(M);
  if (M.locked || (B.Hub && B.Hub.locked)) return B.noIntent();
  return B.intentFromInput();
};
MS.step = (dt, M) => {
  const W = M.world, rd = dt / Math.max(.05, game.timeScale);
  SilentCut.update(rd, M);
  if (Cutscene.update(dt)) { Hud.update(dt, M); Cam.update(dt, M.hero, null); return; }
  if (M.ended) { MS.ending(dt, M); Hud.update(dt, M); Cam.update(dt, M.hero, null); return; }
  const it = MS.intent(M); M.lastIntent = it;
  if (it.mouseMode && M.holding && game.input.down('attack')) it.interactDown = true;   // a held left click keeps a hold interaction going
  if (it.player && game.input.pressed('objectives') && !HUBACTIVE && M.mode !== 'attract') { MS.objectivesPanel(M); return; }
  M.focus = !!it.focusDown;
  W.dynStep.length = 0;
  if (M.hero.stunT > 0) { M.hero.stunT -= dt; Object.assign(it, { move: [0, 0], attackPressed: false, jumpPressed: false, usePressed: false }); }
  Hero.update(M.hero, dt, it, M);
  Perception.update(dt, M);
  for (const g of M.guards) Brain.update(g, dt, M);
  for (const c of M.civs) Brain.update(c, dt, M);
  for (const n of M.npcs) { n.rig.update(dt, n.rigState({ pose: n.pose })); }
  for (const b of M.bosses) Bosses.update(b, dt, M);
  Bosses.updateSummons(dt, M);
  if (M.escort) Escort.update(M.escort, dt, M);
  Tools.update(dt, M);
  Mission.update(M, dt, it);
  if (M.level.time === 'rain') { M.lightT -= dt; if (M.lightT <= 0) { M.lightT = 7 + rand() * 9; W.flash = .25; game.flash('#e8f0ff', .12, .6); M.timers.push({ t: .5 + rand() * .6, fn: () => Au.sfx('thunder') }); } }
  // the music's mood: tension at any notice or a high Ki, alert layers on any alert
  let lv = 0; for (const g of M.guards) { if (!g.alive || !g.mind) continue; if (g.mind.state === 'alert') { lv = 2; break; } if (g.mind.state !== 'calm') lv = Math.max(lv, 1); }
  if (Perception.ki >= 60) lv = Math.max(lv, 1);
  if (!M.bossFight) Music.mood(lv, dt);
  // the Ki heartbeat: a soft taiko thump, faster as the nearest guard comes closer (0.8 to 2.2 a second from Ki 50)
  if (Perception.ki >= 50 && game.settings.heartbeat && M.mode !== 'attract') { M.heartT = (M.heartT || 0) - dt; if (M.heartT <= 0) { const k = (Perception.ki - 50) / 49; M.heartT = 1 / (.8 + 1.4 * k); Au.sfx('heart', { vol: .35 + .4 * k }); } } else M.heartT = 0;
  // fireflies over the water near the hero (cosmetic)
  M.flyT = (M.flyT || 0) - dt; if (M.flyT <= 0) { M.flyT = .25; const a = crand() * TAU, d = 30 + crand() * 120, x = M.hero.x + Math.cos(a) * d, y = M.hero.y + Math.sin(a) * d; if (W.isDeep(x, y, 0) || W.isHide(x, y, 0)) Pt.add({ kind: 'glint', x, y, z: 6 + crand() * 14, life: 1.2, color: '#d8f06a', vz: 4 }); }
  if (M.hero.dead && !M.ended && M.mode !== 'attract') { M.hero.deadT = M.hero.deadT || 0; if (M.hero.deadT > 1.4 && !M.overMenu) MS.gameOver(M, 'Your box is empty'); }
  if (M.mode === 'attract' && M.hero.dead) M.hero.dead = false;
  Hud.update(dt, M);
  Cam.update(dt, M.hero, it);
  if (B.Hub) B.Hub.step(dt, M);
  if (B.Dev) B.Dev.step(dt, M, it);
};
/** the mission ended: a short beat, then results (or the fail overlay) */
MS.ending = (dt, M) => {
  M.endT += dt;
  const h = M.hero; h.rig.update(dt, h.rigState({ pose: M.result === 'win' ? 'cheer' : undefined }));
  if (M.result === 'win' && M.endT > 1.6 && !M.endDone) { M.endDone = true; if (M.onEnd) M.onEnd(M); else B.Flow.missionDone(M); }
  if (M.result === 'fail' && M.timerFail && !M.timerCut && M.mode !== 'attract' && M.mode !== 'hub' && M.endT > 1.2) { M.timerCut = true; Cutscene.play('m3_fail', M.char, () => game.go('mission', { M }, { fade: 'dissolve' })); return; }   // the lord raises his cup
  if (M.result === 'fail' && M.endT > 1.2 && !M.overMenu) MS.gameOver(M, M.failed);
};
MS.gameOver = (M, reason) => {
  if (M.mode === 'hub') { if (B.Hub) B.Hub.died(M); return; }
  if (M.onFail) { M.onFail(M, reason); return; }
  Au.sfx('stingOver'); B.Music.play(null);
  const items = [M.snap ? 'Retry from checkpoint' : null, 'Restart mission', M.mode === 'workshop' ? 'Back to the Workshop' : 'Quit to title'].filter(Boolean);
  M.overMenu = new E.Menu(game, items, { y: 'center', onPick: (i, it) => {
    if (it === 'Retry from checkpoint') game.go('mission', { M: Mission.restore(M, M.snap) }, { fade: 'dissolve' });
    else if (it === 'Restart mission') game.go('mission', { M: Mission.restore(M, null) }, { fade: 'dissolve' });
    else if (it === 'Back to the Workshop') game.go('workshop', { resume: true });
    else game.go('title');
  } });
  M.overReason = reason; M.overT = 0;
};
MS.objectivesPanel = M => {
  const mis = B.get('mission', M.missionId);
  game.pause('menu');
  ui.show('objectives', { kicker: (mis && mis.chapter) || 'Mission', title: (mis && mis.title) || M.level.name,
    sections: M.objectives.filter(o => o.state !== 'hidden').map(o => [(o.state === 'done' ? '✓ ' : o.state === 'failed' ? '✗ ' : '○ ') + (o.optional ? 'Optional' : 'Objective'), o.text + (o.type === 'interact' && o.count ? '  (' + o.n + '/' + o.count + ')' : o.type === 'killAll' ? '  (' + o.n + '/' + o.targets.length + ')' : '')]),
    stats: [[fmtTime(M.stats.time), 'Time'], [String(M.stats.silentCuts), 'Silent Cuts'], [String(M.stats.detections), 'Times detected']],
    actions: [{ label: 'Back to the mission', primary: true, fn: () => { ui.hide(); game.resume(); } }], back: () => { ui.hide(); game.resume(); } });
};
/** the pause menu's own items (after Resume): none in a hub session */
B.pauseItems = () => {
  const M = B.M; if (HUBACTIVE || !M || !game.scene || !game.scene.isMission || M.mode === 'attract') return [];
  const out = [];
  if (M.snap) out.push(['Restart from checkpoint', () => { ui.hide(); game.go('mission', { M: Mission.restore(M, M.snap) }, { fade: 'dissolve' }); }]);
  out.push(['Restart mission', () => { ui.hide(); game.go('mission', { M: Mission.restore(M, null) }, { fade: 'dissolve' }); }]);
  out.push(['Objectives', () => MS.objectivesPanel(M)]);
  if (B.Dev) out.push(['Dev Mode', () => B.Dev.open()]);
  if (M.mode === 'workshop') out.push(['Back to the Workshop', () => { ui.hide(); game.go('workshop', { resume: true }); }]);
  return out;
};
const SENSED = { alpha: .35, flash: '#5a5aff', flashMix: 1 };
MS.draw = (r, M) => {
  const W = M.world, h = M.hero, focus = M.focus;
  W.draw(r, h);
  // drifting barges float away downstream (cosmetic)
  for (const p of W.props) if (p.drift) { p.x += .25; p.o.z = (p.o.z || 0); if (p.x > W.w * T16 + 40) p.gone = true; }
  E.prune(W.props, p => p.gone);
  // sight cones of the guards the ninja can see (Focus: through walls, of the sensed ones too)
  if (game.settings.cones || focus) for (const g of M.guards) {
    if (!g.alive || g.asleep || g.status.sleep > 0 || g.cutBy || (g.vis !== 'visible' && !(focus && g.vis === 'sensed')) || g.A.hound) continue;
    const st = g.mind.state; r.sightCone(g, { map: W.map, range: T('sightRange') * g.sightMul * (M.heightened > 0 ? 1.2 : 1), fov: T('sightFov') * g.fovMul, color: Perception.COLOR[st], alpha: st === 'calm' ? (focus ? .3 : .16) : .32 });
  }
  // pickups and interactions
  for (const p of M.pickups) if (!p.taken) { const ic = p.kind === 'tool' ? Art.icon[B.get('tool', p.tool).icon] : Art.icon.scroll; r.sprite(p.x, p.y, p.z + 4 + Math.sin(game.time * 3 + p.x) * 1.5, ic, { glow: .5 }); Lt.add(p.x, p.y, p.z + 8, 26, .5, { color: '#ffe08a' }); }
  for (const ix of M.interacts) if (!ix.done && Mission.interactReady(M, ix) && (focus || Math.hypot(ix.x - h.x, ix.y - h.y) < 70)) r.queue(ix.x, ix.y, ix.z + 22, g => { const p = r.w(ix.x, ix.y, ix.z + 22 + Math.sin(game.real * 4) * 1.5); px.line(g, p[0] - 3, p[1], p[0], p[1] - 3, '#e8b04a'); px.line(g, p[0], p[1] - 3, p[0] + 3, p[1], '#e8b04a'); px.line(g, p[0] + 3, p[1], p[0], p[1] + 3, '#e8b04a'); px.line(g, p[0], p[1] + 3, p[0] - 3, p[1], '#e8b04a'); }, { emissive: true });
  // the actors: Shadow Sight decides who is drawn and how
  const flashOf = a => a.flash > 0 ? '#ffffff' : false;
  for (const g of M.guards.concat(M.civs)) {
    if (g.sunk) continue;
    if (g.vis === 'hidden' && !(g.dragged)) continue;
    const o = g.vis === 'sensed' && g.alive ? Object.assign({}, SENSED, focus ? { alpha: .55 } : {}) : { flash: flashOf(g), xray: g.alive && g.mind && g.mind.state !== 'calm' ? { color: Perception.COLOR[g.mind.state] } : false };
    if (!g.alive && g.hidden) o.alpha = .6;
    if (g.A && g.A.hound) { if (g.vis !== 'hidden') { r.shadow(g.x, g.y, 6, .35, undefined, W.map.groundAt(g.x, g.y, 4, g.z)); r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), o); } continue; }
    if (g.status.stun > 0 || g.status.blind > 0) o.flash = Math.floor(game.real * 8) % 2 ? '#ffffff' : false;
    if (g.alive && g.unmasked === undefined && g.disguised && focus) o.flash = '#ff3a2a', o.flashMix = .35;
    Actor.draw(r, g, o);
  }
  for (const n of M.npcs) Actor.draw(r, n, {});
  for (const b of M.bosses) if (!b.sunk && !b.hiddenBoss && !b.vanished) { Actor.draw(r, b, { flash: flashOf(b) || (b.guardT > 0 && Math.floor(game.real * 6) % 2 ? '#c8d8ff' : false), flashMix: .4 }); if (b.id === 'hotaru' && b.phase && b.alive) Lt.add(b.x, b.y, b.z + 20, 30, .6, { color: '#ff3a2a' }); if (b.id === 'kurogane' && b.phase) { Lt.add(b.x, b.y, b.z + 30, 60, .8, { color: '#ff6a2a' }); if (crand() < .4) Pt.add({ kind: 'ember', x: b.x + (crand() - .5) * 16, y: b.y + (crand() - .5) * 16, z: b.z + 10 + crand() * 30, life: .8, color: '#ff8a3a' }); } }
  for (const c of M.summons) if (c.alive) { if (c.spirit) r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { emissive: true }); else Actor.draw(r, c, { alpha: .7, flash: '#ff6a8a', flashMix: .25, ghost: { color: '#ff3a5a', life: .2, alpha: .3, owner: c } }); }
  if (M.escort && M.escort.alive !== undefined) { Actor.draw(r, M.escort, { flash: flashOf(M.escort), xray: { color: '#5ad05a' } }); if (M.escort.swim) MS.water(r, M.escort); }
  if (B.Hub) B.Hub.drawGhosts(r, M);
  // the hero: x-ray through everything in front, a straw cloak's shimmer, swimming and diving
  if (!M.cheats.noclip || true) {
    const ho = { xray: { actors: true, color: '#8fe3ff' }, flash: h.hurtT > .3 ? '#ff4a3a' : h.blockFx > 0 ? '#c8d8ff' : false, flashMix: .5 };
    if (h.dive) Object.assign(ho, { alpha: .35, flash: '#0a1a2a', flashMix: .8 });
    if (h.cloakT > 0) Object.assign(ho, { flash: '#c8b070', flashMix: .55, alpha: .75 });
    if (h.sprinting && !h.dive) ho.ghost = { color: h.char === 'kaede' ? '#2a8a8a' : '#b0302a', life: .12, alpha: .25, owner: h };
    Actor.draw(r, h, ho); if (h.blockFx > 0) h.blockFx -= 1 / 60;
    if (h.swim) MS.water(r, h);
    if (h.combo.busy) h.rig.drawSmear && h.rig.drawSmear(r, h.char === 'kaede' ? ['#ffffff', '#c8fff4', '#5ae0d0', '#2a8a8a'] : undefined);
  }
  Grapple.draw(r, h); Tools.draw(r, M);
  Hud.world(r, M);
  if (B.Dev) B.Dev.drawWorld(r, M);
  Hud.draw(r, M);
  Cutscene.draw(r);
  if (M.overMenu) MS.drawOver(r, M);
};
/** the water's surface over a swimmer (the body below it), a ripple, bubbles while diving */
MS.water = (r, a) => {
  r.queue(a.x, a.y, 1, g => {
    const p = r.w(a.x, a.y, 0), k = game.zoom || 1, t = game.real;
    px.blend(g, a.dive ? .8 : .7, 'normal', () => { px.ell ? px.ell(g, p[0], p[1] + 3 * k, 10 * k, 6 * k, '#1e3a5a') : px.disc(g, p[0], p[1] + 3 * k, 9 * k, '#1e3a5a'); });
    const rr = (t * 10) % 10; px.blend(g, .5, 'normal', () => { for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; px.dot(g, p[0] + Math.cos(an) * (6 + rr) * k, p[1] + Math.sin(an) * (3 + rr / 2) * k, '#8ab8d8'); } });
  }, { bias: 6 });
};
MS.drawOver = (r, M) => {
  M.overT = (M.overT || 0) + 1 / 60;
  r.overlay(g => {
    px.blend(g, Math.min(.75, M.overT), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#140808'));
    const y = Math.round(r.H * .26);
    E.font.title(g, 'YOUR BOX IS EMPTY', r.W / 2, y, { align: 'center', scale: 3, colors: ['#ffe0d0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810', depth: 2 });
    if (M.overReason && M.overReason !== 'Your box is empty') E.font.text(g, M.overReason, r.W / 2, y + 30, '#f4ead5', { align: 'center', shadow: '#000', outline: false, wrap: r.W - 40 });
  });
  M.overMenu.y = Math.round(r.H * .5); M.overMenu.draw(r);
};
const missionScene = {
  isMission: true, pausable: true, view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [],
  camera: { zoom: [.75, 2], start: 1.15, tall: 1.35, rotate: true, wheel: false },
  enter: MS.enter,
  update(dt) {
    const M = B.M; if (!M) return;
    B.pollInput();
    if (M.overMenu) { M.overMenu.update(dt); MS.step(dt * 0, M); if (M.hero) M.hero.rig.update(dt, M.hero.rigState({ pose: 'die' })); return; }
    MS.step(dt, M);
  },
  draw(r) { if (B.M) MS.draw(r, B.M); },
  exit() { game.weather = null; game.timeScale = 1; if (GPU) GPU.enabled = false; Lt.enabled = false; B.Cam.override = null; Cutscene.clear(); },
  back() { return false; }
};
B.MS = MS; B.missionScene = missionScene;

/* ---- 74-dev.js ---- */
/* ---- DEV MODE (pause menu -> Dev Mode; never in a hub session or attract): Shell screens of at most 8 rows. Cheats,
 * mission tools, teleports, debug overlays (AI, light map, nav map, hide spots, anchors, ranges), time scale, the free
 * camera, and four pages of live balance sliders (game.settings group 'Dev') with Reset page and Reset all. L1 / R1,
 * PageUp / PageDown or the page buttons switch pages; ` toggles the AI overlay once dev mode has been opened ---- */
const Dev = { page: 0, opened: false, flags: { ai: false, light: false, nav: false, hide: false, anchors: false, ranges: false, roofs: false }, timeScale: 1, spawnI: 0, tpArmed: false, unlockAll: false };
const DEV_PAGES = ['Cheats', 'Mission', 'Teleport', 'Debug view'].concat(B.TUNE_PAGES.map(p => 'Balance: ' + p));
const onOff = v => (v ? 'On' : 'Off');
Dev.open = (page = Dev.page) => { Dev.opened = true; Dev.page = page; Dev.show(); };
Dev.show = () => {
  const M = B.M, p = Dev.page, name = DEV_PAGES[p], nav = [{ label: '◀ Prev page', fn: () => Dev.turn(-1) }, { label: 'Next page ▶', fn: () => Dev.turn(1) }];
  const tog = (label, get, set) => ({ label: label + ': ' + onOff(get()), fn: () => { set(!get()); Dev.show(); } });
  let actions = [], rows = null, text = 'Page ' + (p + 1) + ' of ' + DEV_PAGES.length + '  ·  ' + game.input.label('block') + ' / ' + game.input.label('grapple') + ' or PageUp / PageDown turn the page.';
  if (!M) { ui.show('dev', { kicker: 'Dev Mode', title: 'No mission', text: 'Dev mode works inside a mission.', actions: [['Back', () => ui.back()]] }); return; }
  const C = M.cheats;
  if (name === 'Cheats') actions = [tog('God mode', () => C.god, v => C.god = v), tog('Invisible to guards', () => C.invisible, v => C.invisible = v), tog('No-clip', () => C.noclip, v => C.noclip = v), tog('Infinite tools', () => C.infinite, v => C.infinite = v),
    tog('One-hit kills', () => C.oneHit, v => C.oneHit = v), tog('Freeze AI', () => C.freezeAI, v => C.freezeAI = v), tog('Reveal all enemies', () => C.reveal, v => C.reveal = v),
    { label: 'Heal · Give all tools · Unlock all', fn: () => { M.hero.hp = M.hero.maxHp; M.hero.bento = TOOL_ORDER.slice(0, 8).map(t => ({ tool: t, n: B.get('tool', t).stack })); Dev.unlockAll = true; const d = Save.get(); for (const t of TOOL_ORDER) if (!d.tools.includes(t)) d.tools.push(t); for (const id of STORY_ORDER) d.completed[id] = true; Save.write(); B.Hud.toast('Healed, armed, unlocked', ''); Dev.show(); } }];
  else if (name === 'Mission') actions = [
    { label: 'Complete current objective', fn: () => { const o = M.objectives.find(o => o.state === 'active' && !o.optional) || M.objectives.find(o => o.state === 'active'); if (o) { if (o.type === 'assassinate') { const a = Mission.find(M, o.target); if (a) { a.alive = false; } } else if (o.type === 'defeat') { const b = M.bosses.find(b => b.id === o.boss); if (b) { if (!b.active) Bosses.start(b, M); b.hp = 0; Bosses.defeat(b, M); if (!b.D.spar) b.alive = false; } } else if (o.type === 'rescue' && M.escort) Mission.actions(M, [['release']]); else if (o.type === 'escort' && M.escort && o.zone) { M.escort.x = cellC(o.zone[0] + 1); M.escort.y = cellC(o.zone[1] + 1); } else Mission.setObj(M, o, 'done'); } Dev.show(); } },
    { label: 'Kill all enemies · Alert all · Calm all', fn: () => Dev.show() }, { label: 'Kill all enemies', fn: () => { for (const g of M.guards) if (g.alive) { g.alive = false; g.hp = 0; } Dev.show(); } },
    { label: 'Alert all', fn: () => { for (const g of M.guards) if (g.alive && g.mind) { g.mind.level = 1.2; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; g.target = M.hero; } Dev.show(); } },
    { label: 'Calm all', fn: () => { for (const g of M.guards) if (g.mind) { g.mind.reset(); g.target = null; g.bellRun = null; } M.heightened = 0; Dev.show(); } },
    { label: 'Spawn guard here (' + ['ashigaru', 'samurai', 'archer', 'ninja', 'hound'][Dev.spawnI % 5] + ')', fn: () => { const ty = ['ashigaru', 'samurai', 'archer', 'ninja', 'hound'][Dev.spawnI++ % 5], h = M.hero, a = h.facing; M.guards.push(Enemies.spawn({ id: 'dev' + M.guards.length, type: ty, at: [toCell(h.x + Math.cos(a) * 40), toCell(h.y + Math.sin(a) * 40)], facing: a * 180 / Math.PI + 180, mode: 'post' }, M, M.level.faction)); Dev.show(); } },
    { label: 'Skip to boss · Win (rank) · Fail · Restart · Jump · Edit', fn: () => Dev.missionMore() }];
  else if (name === 'Teleport') {
    const tp = (x, y, z) => { const h = M.hero; Object.assign(h, { x, y, z: z !== undefined ? z : M.world.map.groundAt(x, y), vx: 0, vy: 0, vz: 0 }); h.swim = false; game.cam.snap = true; ui.hide(); game.resume(); };
    actions = [{ label: 'To the start', fn: () => { const s = M.level.hero; tp(cellC(s.at[0]), cellC(s.at[1])); } },
      { label: 'To the next objective', fn: () => { const t = Hud.target(M); if (t) tp(t.x + 20, t.y + 20); } },
      M.bosses.length && { label: 'To the boss arena', fn: () => { const b = M.bosses[0]; tp(b.x + 30, b.y, b.z); } },
      M.exit && { label: 'To the exit', fn: () => tp(M.exit.x, M.exit.y) },
      { label: 'To the cursor (then click or ' + game.input.label('confirm') + ')', fn: () => { Dev.tpArmed = true; ui.hide(); game.resume(); B.Hud.toast('Teleport armed', 'Click the ground, or press confirm at the camera’s centre.'); } }]
      .concat(M.world.zones.slice(0, 3).map(z => ({ label: 'To ' + z.name, fn: () => { let x = cellC((z.rect[0] + z.rect[2]) >> 1), y = cellC((z.rect[1] + z.rect[3]) >> 1); tp(x, y); } }))).filter(Boolean).slice(0, 8);
  } else if (name === 'Debug view') {
    const F = Dev.flags, f = k => tog({ ai: 'AI overlay', light: 'Light map', nav: 'Nav map', hide: 'Hide spots', anchors: 'Grapple anchors', ranges: 'Ranges', roofs: 'Hide hall roofs' }[k], () => F[k], v => F[k] = v);
    actions = [f('ai'), f('light'), f('nav'), f('hide'), f('anchors'), f('ranges'),
      { label: 'Time scale: ' + Dev.timeScale + '×', fn: () => { const L2 = [.25, .5, 1, 2, 4]; Dev.timeScale = L2[(L2.indexOf(Dev.timeScale) + 1) % L2.length]; game.timeScale = Dev.timeScale; Dev.show(); } },
      { label: 'Free camera: ' + onOff(!!game.cam.free) + '  ·  Frame rate: ' + onOff(!!game.settings.fps), fn: () => Dev.viewMore() }];
  } else {
    const pg = B.TUNE_PAGES[p - 4]; rows = TUNE.filter(t => t[6] === pg).map(t => t[0]);
    actions = [{ label: 'Reset page', fn: () => { for (const k of rows) game.settings.set(k, B.tuneDefault(k)); Dev.show(); } }, { label: 'Reset all to defaults', fn: () => { game.settings.reset('Dev'); Dev.show(); } }];
    text = 'Live: every change applies on the next step. ' + text;
  }
  ui.show('dev', { kicker: 'Dev Mode', title: name, text, rows: rows || undefined, actions: actions.concat(nav, [{ label: 'Back', fn: () => ui.back() }]) });
};
Dev.turn = d => { Dev.page = (Dev.page + d + DEV_PAGES.length) % DEV_PAGES.length; Au.sfx('uiMove'); Dev.show(); };
Dev.missionMore = () => {
  const M = B.M; if (!M) return;
  ui.show('devMission', { kicker: 'Dev Mode', title: 'Mission tools', actions: [
    M.bosses.length && { label: 'Skip to boss', fn: () => { const b = M.bosses[0]; if (!b.defeated) { Object.assign(M.hero, { x: b.x + 30, y: b.y, z: b.z, vx: 0, vy: 0 }); game.cam.snap = true; for (const o of M.objectives) if (!o.optional && o.type !== 'defeat' && o.type !== 'reach' && o.type !== 'escort' && o.state !== 'done') { if (o.type === 'assassinate') { const a = Mission.find(M, o.target); if (a) a.alive = false; } else if (o.type === 'rescue') Mission.actions(M, [['release']]); else if (o.type === 'stopTimer') { const ix = M.interacts.find(i => i.do && i.do.some(a => a[0] === 'stopTimer')); if (ix) Mission.doInteract(M, ix); } else Mission.setObj(M, o, 'done'); } Mission.refreshObjectives(M, true); const ob = M.objectives.find(o => o.type === 'defeat'); if (ob) ob.state = 'active'; Bosses.start(b, M); } ui.hide(); game.resume(); } },
    { label: 'Win mission (choose rank)', fn: () => ui.show('devRank', { kicker: 'Dev Mode', title: 'Win with rank', actions: B.RANKS.map(rk => ({ label: rk[1], fn: () => { M.forceRank = rk[1]; for (const o of M.objectives) if (!o.optional) o.state = 'done'; ui.hide(); game.resume(); Mission.complete(M); } })).concat([['Back', () => ui.back()]]) }) },
    { label: 'Fail mission', fn: () => { ui.hide(); game.resume(); Mission.fail(M, 'Failed from dev mode.'); } },
    { label: 'Restart mission', fn: () => { ui.hide(); game.go('mission', { M: Mission.restore(M, null) }); } },
    { label: 'Jump to mission…', fn: () => ui.show('devJump', { kicker: 'Dev Mode', title: 'Jump to mission', actions: STORY_ORDER.concat('delivery').map(id => ({ label: B.get('mission', id).title, fn: () => { ui.hide(); game.go('mission', { mission: id, char: M.char, mode: id === 'delivery' ? 'trial' : M.mode === 'workshop' ? 'missions' : M.mode, cheats: M.cheats }); } })).concat([['Back', () => ui.back()]]) }) },
    { label: 'Edit this level', fn: () => { ui.hide(); game.go('workshop', { level: deepCopy(M.level) }); } },
    { label: 'Back', fn: () => ui.back() }].filter(Boolean) });
};
Dev.viewMore = () => ui.show('devView', { kicker: 'Dev Mode', title: 'Camera and frame rate', actions: [
  { label: 'Free camera: ' + onOff(!!game.cam.free), fn: () => { game.cam.free = game.cam.free ? null : { keys: true, edge: 0, drag: true, speed: 260 }; Dev.viewMore(); } },
  { label: 'Show frame rate: ' + onOff(!!game.settings.fps), fn: () => { if (game.settings.spec('fps')) game.settings.set('fps', !game.settings.fps); Dev.viewMore(); } }, ['Back', () => ui.back()]] });
/** page turns and the backquote, also while paused (the Shell's step runs every step) */
Dev.poll = () => {
  if (!ui.screen || !/^dev/.test(ui.screen)) return;
  const I = game.input;
  if (ui.screen === 'dev' && (I.pressed('block') && I.held.has('Pad4') || I.pressed('grapple') && I.held.has('Pad5'))) Dev.turn(I.held.has('Pad4') ? -1 : 1);
};
if (hasDOM) addEventListener('keydown', e => {
  if (ui.screen === 'dev' && (e.code === 'PageUp' || e.code === 'PageDown')) { e.preventDefault(); Dev.turn(e.code === 'PageUp' ? -1 : 1); }
  if (e.code === 'Backquote' && Dev.opened && !e.repeat) Dev.flags.ai = !Dev.flags.ai;
});
const shellStep = ui._step && ui._step.bind(ui); if (shellStep) ui._step = (...a) => { const r = shellStep(...a); try { Dev.poll(); } catch (e) { /* no menu */ } return r; };
/** each step of play: the armed teleport */
Dev.step = (dt, M, it) => {
  if (!Dev.tpArmed) return;
  const I = game.input, cl = I.clicked();
  let at = null; if (cl && M.world.map.pick) { const p = M.world.map.pick(cl[0], cl[1]); if (p) at = { x: p.x !== undefined ? p.x : cellC(p.cx), y: p.y !== undefined ? p.y : cellC(p.cy), z: p.z }; }
  if (!at && I.pressed('confirm')) at = { x: game.cam.tx, y: game.cam.ty };
  if (at) { Dev.tpArmed = false; Object.assign(M.hero, { x: at.x, y: at.y, z: at.z !== undefined ? at.z : M.world.map.groundAt(at.x, at.y), vx: 0, vy: 0, vz: 0 }); game.cam.snap = true; }
};
/** the debug overlays, drawn in the world */
Dev.drawWorld = (r, M) => {
  const F = Dev.flags, W = M.world;
  if (F.light || F.nav || F.hide) r.decal(g => {
    const fx = game.cam.tx || 0, fy = game.cam.ty || 0, R = 220;
    for (let y = Math.max(0, Math.floor((fy - R) / 8)); y < Math.min(W.h * 2, (fy + R) / 8); y++) for (let x = Math.max(0, Math.floor((fx - R) / 8)); x < Math.min(W.w * 2, (fx + R) / 8); x++) {
      const wx = x * 8 + 4, wy = y * 8 + 4, z = W.map.heightAt(wx, wy); if (z > 1e8) continue;
      if (F.light) { const L = W.light[y * W.w * 2 + x], c = L > .6 ? '#ffe060' : L > .35 ? '#e87a2a' : L > .22 ? '#6a3a8a' : '#1a1a4a', p = r.w(wx, wy, z); if ((x + y) % 2 === 0) px.rect(g, p[0], p[1], 2, 2, c); }
      if (F.nav && !W.nav.walkable(x >> 1, y >> 1) && (x + y) % 2 === 0) { const p = r.w(wx, wy, z); px.rect(g, p[0], p[1], 2, 1, '#ff3a3a'); }
      if (F.hide && W.isHide(wx, wy, 0) && (x + y) % 2 === 1) { const p = r.w(wx, wy, 0); px.rect(g, p[0], p[1], 2, 1, '#5ad05a'); }
    }
  });
  if (F.anchors) for (const a of Grapple.anchors(M.hero, M)) r.queue(a.x, a.y, a.z, g => { const p = r.w(a.x, a.y, a.z), q = r.w(a.land.x, a.land.y, a.land.z); px.line(g, p[0], p[1], q[0], q[1], '#e8b04a'); px.disc(g, p[0], p[1], 2, a.tree ? '#5ad05a' : '#ffe08a'); }, { emissive: true });
  if (F.ranges) { const h = M.hero; r.decal(g => r.groundRing(h.x, h.y, T('killRange'), '#ff4a3a', .8, h.z)); r.decal(g => r.groundRing(h.x, h.y, T('baitRange'), '#e8b04a', .5, h.z)); r.decal(g => r.groundArc(h.x, h.y, 4, 22, h.facing - Math.PI / 3, h.facing + Math.PI / 3, '#8fe3ff', .35, h.z, g)); r.decal(g => r.groundRing(h.x, h.y, T('kiRange'), '#5ad8c8', .3, h.z)); }
  if (F.ai) {
    for (const g of M.guards) {
      if (!g.alive || !g.mind) continue;
      r.sightCone(g, { map: W.map, range: T('sightRange') * g.sightMul, fov: T('sightFov') * g.fovMul, color: Perception.COLOR[g.mind.state], alpha: .2 });
      if (g.route) r.queue(g.x, g.y, g.z, gg => { for (let i = 0; i < g.route.length; i++) { const a = g.route[i], b = g.route[(i + 1) % g.route.length], p = r.w(a.x, a.y, a.z || 0), q = r.w(b.x, b.y, b.z || 0); px.line(gg, p[0], p[1], q[0], q[1], '#5a8aff'); } }, { bias: 5 });
      if (g.mind.last) r.queue(g.mind.last.x, g.mind.last.y, g.mind.last.z || 0, gg => { const p = r.w(g.mind.last.x, g.mind.last.y, g.mind.last.z || 0); px.line(gg, p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3, '#ff4a3a'); px.line(gg, p[0] + 3, p[1] - 3, p[0] - 3, p[1] + 3, '#ff4a3a'); }, { emissive: true });
      r.textAt(g.x, g.y, g.z + 56, g.id + ' ' + (g.asleep ? 'sleep' : g.status.eat > 0 ? 'eat' : g.bellRun ? 'bell' : g.mind.state) + ' ' + g.mind.level.toFixed(2), '#f4ead5');
    }
    for (const n of M.noises) r.decal(g => r.groundRing(n.x, n.y, n.loud * (1 - n.t / .8 * .3), '#ffffff', n.t, n.z));
  }
};
B.Dev = Dev;

/* ---- 75-workshop.js ---- */
/* ---- THE WORKSHOP (the Mission Editor): it edits the exact level JSON the campaign uses, drawn by the same renderer.
 * Pad: stick moves the cursor, L1 / R1 the category, L2 / R2 the brush, cross paints, circle erases, square picks or
 * selects, triangle turns, Create test-plays, Options the menu. Mouse and keys: hover moves the cursor, left click
 * paints (drag paints a line), right click erases, middle drag pans, the wheel changes the brush, Tab the category, 1-9
 * a brush, Q / E turn, F5 test-plays, Esc the menu. Validation before a test, a save or a play ---- */
const ED_CATS = [
  { id: 'ground', name: 'Ground', brushes: [['.', 'Earth'], [',', 'Tall grass'], ['"', 'Bamboo'], [':', 'Gravel'], ['=', 'Boards'], ['_', 'Tatami'], ['+', 'Paving'], ['~', 'Deep water'], ['-', 'Shallows'], ['d', 'Doorway']] },
  { id: 'walls', name: 'Walls', brushes: [['#', 'Castle wall'], ['W', 'Compound wall'], ['F', 'Bamboo fence'], ['H', 'Hall wall']] },
  { id: 'buildings', name: 'Buildings', brushes: 'ABCDSTGKMPR'.split('').map(c => [c, WALLTYPES[c].name]) },
  { id: 'props', name: 'Props', brushes: ['bamboo', 'maple', 'cherry', 'persimmonTree', 'bonsaiPine', 'steppingStones', 'sakeBarrel', 'riceBale', 'jubako', 'yatai', 'weaponRack', 'mato', 'taiko', 'hansho', 'torii', 'waterBarrel', 'strawMat', 'boat', 'riceBarge', 'mooringPost', 'bambooCage', 'kotatsu', 'folding', 'hut', 'nets', 'dummy', 'cart', 'crate', 'barrel', 'well', 'nobori'].map(p => [p, p]) },
  { id: 'lights', name: 'Lights', brushes: [['stoneLantern', 'Stone lantern'], ['paperLantern', 'Paper lantern'], ['torch', 'Torch'], ['brazier', 'Brazier']] },
  { id: 'actors', name: 'Actors', brushes: [['hero', 'Hero start'], ['exit', 'Exit'], ['target', 'Target'], ['ashigaru', 'Ashigaru'], ['samurai', 'Samurai'], ['archer', 'Archer'], ['ninja', 'Red Lantern ninja'], ['hound', 'Hound'],
    ['maid', 'Maid'], ['merchant', 'Merchant'], ['monk', 'Monk'], ['noble', 'Noble'], ['servant', 'Servant'], ['disguised', 'Disguised ninja'], ['gonroku', 'Boss: Gonroku'], ['hotaru', 'Boss: Hotaru'], ['kurogane', 'Boss: Kurogane'], ['bell', 'Alarm bell'], ['barracks', 'Barracks door']] },
  { id: 'routes', name: 'Routes', brushes: [['route', 'Waypoints']] },
  { id: 'items', name: 'Items', brushes: TOOL_ORDER.map(t => ['tool:' + t, B.get('tool', t).name]).concat([['scroll', 'The scroll (optional)']]) },
  { id: 'settings', name: 'Settings', brushes: [['settings', 'Level settings']] }
];
const Ed = { L: null, W: null, cx: 3, cy: 3, cat: 0, brush: 0, facing: 90, sel: null, slot: 0, prev: new Set(), problems: [], dragPaint: null, wait: [0, 1, 2, 4], pan: [0, 0] };
Ed.blank = (w = 40, h = 40) => { const g = LG(w, h); return { id: 'custom', name: 'A New Night', size: [w, h], time: 'night', faction: 'kanemori', rows: g.rows(), music: 'm1', weather: null, par: 480, zones: [], lights: [], props: [], anchors: [],
  hero: { at: [3, h - 4], facing: 270 }, exit: { at: [w - 4, 3], r: 1.5 }, guards: [], civilians: [], bells: [], barracks: [], pickups: [], objectives: [], triggers: [], timer: null }; };
Ed.load = L => { Ed.L = deepCopy(L); Ed.L.id = Ed.L.id || 'custom'; Ed.rebuild(); Ed.cx = Ed.L.hero ? Ed.L.hero.at[0] : 3; Ed.cy = Ed.L.hero ? Ed.L.hero.at[1] : 3; Ed.sel = null; };
Ed.rebuild = () => { Ed.genObjectives(); Ed.W = new World(Ed.L); };
Ed.cell = (cx, cy) => (Ed.L.rows[cy] || '')[cx];
/** paint one cell of terrain (the border stays a castle wall) */
Ed.paint = (cx, cy, ch) => {
  const [w, h] = Ed.L.size; if (cx <= 0 || cy <= 0 || cx >= w - 1 || cy >= h - 1) return false;
  const row = Ed.L.rows[cy]; if (row[cx] === ch) return false;
  Ed.L.rows[cy] = row.slice(0, cx) + ch + row.slice(cx + 1); Ed.W.setCells(cx, cy, 1, 1, ch); Ed.W._findBlocks(); Ed.W._findHalls(); return true;
};
const atCell = (list, cx, cy, key = 'at') => list.findIndex(e => (Array.isArray(e) ? e[1] === cx && e[2] === cy : e[key] && e[key][0] === cx && e[key][1] === cy));
/** place the current brush (or a named one) at a cell */
Ed.place = (cx, cy, kind = Ed.brushId(), facing = Ed.facing) => {
  const L = Ed.L, cat = ED_CATS[Ed.cat].id;
  if (['ground', 'walls', 'buildings'].includes(Ed.catOf(kind))) return Ed.paint(cx, cy, kind);
  if (Ed.catOf(kind) === 'props') { const i = atCell(L.props, cx, cy); if (i >= 0) L.props.splice(i, 1); L.props.push([kind, cx, cy, { facing: facing * Math.PI / 180, color: kind === 'nobori' ? '#c8342a' : undefined }]); Ed.rebuild(); return true; }
  if (Ed.catOf(kind) === 'lights') { const i = atCell(L.lights, cx, cy); if (i >= 0) L.lights.splice(i, 1); L.lights.push({ at: [cx, cy], kind, r: kind === 'torch' ? 72 : 64, i: .9 }); Ed.rebuild(); return true; }
  if (kind.startsWith('tool:')) { const i = atCell(L.pickups, cx, cy); if (i >= 0) L.pickups.splice(i, 1); const t = kind.slice(5); L.pickups.push({ id: 'p' + cx + '_' + cy, kind: 'tool', tool: t, n: Math.min(3, B.get('tool', t).stack), at: [cx, cy] }); Ed.rebuild(); return true; }
  if (kind === 'scroll') { L.pickups = L.pickups.filter(p => p.id !== 'scroll'); L.pickups.push({ id: 'scroll', kind: 'story', at: [cx, cy], text: 'The secret scroll' }); Ed.rebuild(); return true; }
  if (kind === 'hero') { L.hero = { at: [cx, cy], facing }; Ed.rebuild(); return true; }
  if (kind === 'exit') { L.exit = { at: [cx, cy], r: 1.5 }; Ed.rebuild(); return true; }
  if (kind === 'bell') { L.bells = L.bells.filter(b => !(b[0] === cx && b[1] === cy)); L.bells.push([cx, cy]); if (!L.props.some(p => p[0] === 'hansho' && p[1] === cx && p[2] === cy)) L.props.push(['hansho', cx, cy, {}]); Ed.rebuild(); return true; }
  if (kind === 'barracks') { L.barracks = L.barracks.filter(b => !(b[0] === cx && b[1] === cy)); L.barracks.push([cx, cy]); Ed.rebuild(); return true; }
  if (['gonroku', 'hotaru', 'kurogane'].includes(kind)) { L.boss = { id: kind, at: [cx, cy], facing, arena: [Math.max(1, cx - 5), Math.max(1, cy - 5), Math.min(L.size[0] - 2, cx + 5), Math.min(L.size[1] - 2, cy + 5)] }; L.triggers = (L.triggers || []).filter(t => t.id !== 'edboss'); L.triggers.push({ id: 'edboss', rect: L.boss.arena, do: [['boss', kind]] }); Ed.rebuild(); return true; }
  Ed.remove(cx, cy, true);
  if (['target', 'maid', 'merchant', 'monk', 'noble', 'servant', 'disguised'].includes(kind)) {
    if (kind === 'target') L.civilians = L.civilians.filter(c => !c.target);
    L.civilians.push({ id: kind === 'target' ? 'target' : 'c' + cx + '_' + cy, type: kind === 'target' ? 'merchant' : kind === 'disguised' ? 'servant' : kind, i: cx, at: [cx, cy], facing, target: kind === 'target' || undefined, disguised: kind === 'disguised' || undefined });
    Ed.rebuild(); return true;
  }
  const z = Ed.W.map.height(cx, cy);
  L.guards.push({ id: 'g' + cx + '_' + cy, type: kind, at: [cx, cy], z: z > 0 && z < 1e8 ? z : undefined, facing, mode: 'post', lantern: kind === 'ashigaru' || undefined });
  Ed.rebuild(); return true;
};
Ed.catOf = kind => { for (const c of ED_CATS) if (c.brushes.some(b => b[0] === kind)) return c.id; return kind.startsWith('tool:') ? 'items' : null; };
/** erase what is at a cell: an actor, item, prop or light first, else the terrain back to earth */
Ed.remove = (cx, cy, actorsOnly) => {
  const L = Ed.L; let i;
  if ((i = atCell(L.guards, cx, cy)) >= 0) { L.guards.splice(i, 1); Ed.sel = null; Ed.rebuild(); return true; }
  if ((i = atCell(L.civilians, cx, cy)) >= 0) { L.civilians.splice(i, 1); Ed.rebuild(); return true; }
  if (actorsOnly) return false;
  if (L.boss && L.boss.at[0] === cx && L.boss.at[1] === cy) { L.boss = null; L.triggers = (L.triggers || []).filter(t => t.id !== 'edboss'); Ed.rebuild(); return true; }
  if ((i = atCell(L.pickups, cx, cy)) >= 0) { L.pickups.splice(i, 1); Ed.rebuild(); return true; }
  if ((i = atCell(L.props, cx, cy)) >= 0) { L.props.splice(i, 1); L.bells = L.bells.filter(b => !(b[0] === cx && b[1] === cy)); Ed.rebuild(); return true; }
  if ((i = atCell(L.lights, cx, cy)) >= 0) { L.lights.splice(i, 1); Ed.rebuild(); return true; }
  if ((i = L.barracks.findIndex(b => b[0] === cx && b[1] === cy)) >= 0) { L.barracks.splice(i, 1); return true; }
  return Ed.paint(cx, cy, '.');
};
/** the eyedropper: select the guard here (for routes), or take the brush of what is here */
Ed.pick = (cx, cy) => {
  const L = Ed.L, g = L.guards.find(g => g.at[0] === cx && g.at[1] === cy);
  if (g) { Ed.sel = g.id; Ed.setBrush('routes', 'route'); return 'guard'; }
  const ch = Ed.cell(cx, cy); for (const [ci, c] of ED_CATS.entries()) { const bi = c.brushes.findIndex(b => b[0] === ch); if (bi >= 0 && ['ground', 'walls', 'buildings'].includes(c.id)) { Ed.cat = ci; Ed.brush = bi; return 'terrain'; } }
  return null;
};
/** routes: the selected guard gets a waypoint, loses the last, or its last waypoint's wait cycles */
Ed.route = (op, cx, cy) => {
  const g = Ed.L.guards.find(g => g.id === Ed.sel); if (!g) return false;
  g.route = g.route || [[g.at[0], g.at[1], 1]];
  if (op === 'add') { g.route.push([cx, cy, 1]); g.mode = 'patrol'; }
  else if (op === 'pop') { g.route.pop(); if (g.route.length < 2) { delete g.route; g.mode = 'post'; } }
  else if (op === 'wait') { const p = g.route[g.route.length - 1]; p[2] = Ed.wait[(Ed.wait.indexOf(p[2]) + 1) % Ed.wait.length]; }
  Ed.rebuild(); return true;
};
Ed.setBrush = (cat, id) => { Ed.cat = ED_CATS.findIndex(c => c.id === cat); Ed.brush = Math.max(0, ED_CATS[Ed.cat].brushes.findIndex(b => b[0] === id)); };
Ed.brushId = () => ED_CATS[Ed.cat].brushes[Ed.brush][0];
/** the objectives come from what is placed: silence the target, defeat the boss, steal the scroll, escape */
Ed.genObjectives = () => {
  const L = Ed.L, obs = [], tg = L.civilians.find(c => c.target);
  if (tg) obs.push({ id: 'kill', type: 'assassinate', target: tg.id, text: 'Silence the target' });
  if (L.boss) obs.push({ id: 'boss', type: 'defeat', boss: L.boss.id, text: 'Defeat ' + B.get('boss', L.boss.id).name });
  if (L.pickups.some(p => p.id === 'scroll')) obs.push({ id: 'scroll', type: 'retrieve', pickup: 'scroll', optional: true, text: 'Steal the scroll' });
  obs.push({ id: 'escape', type: 'reach', after: obs.filter(o => !o.optional).map(o => o.id), text: 'Escape' });
  L.objectives = obs; L.target = tg ? tg.id : undefined;
};
/** validation: a hero start, an exit, a target or a boss, and both reachable (climbs of 30; the grapple's 96) */
Ed.validate = () => {
  const L = Ed.L, out = [];
  if (!L.hero) out.push({ text: 'There is no hero start. Place one (Actors, Hero start).', at: [3, 3] });
  if (!L.exit) out.push({ text: 'There is no exit. Place one (Actors, Exit).', at: [3, 3] });
  const tg = L.civilians.find(c => c.target);
  if (!tg && !L.boss) out.push({ text: 'There is no target and no boss. Place a target (Actors, Target) or a boss.', at: L.hero ? L.hero.at : [3, 3] });
  if (L.hero) {
    const W = Ed.W, f = new E.FlowField(W.map, { climb: 96, drop: 200, jump: 60 }), hx = cellC(L.hero.at[0]), hy = cellC(L.hero.at[1]);
    const reach = at => { f.update(cellC(at[0]), cellC(at[1])); const v = f.d[toCell(hy) * W.w + toCell(hx)]; return v !== undefined && v < 1e8; };
    if (L.exit && !reach(L.exit.at)) out.push({ text: 'The exit cannot be reached from the start.', at: L.exit.at });
    if (tg && !reach(tg.at)) out.push({ text: 'The target cannot be reached from the start.', at: tg.at });
    if (L.boss && !reach(L.boss.at)) out.push({ text: 'The boss cannot be reached from the start.', at: L.boss.at });
  }
  Ed.problems = out; return out;
};
Ed.problemScreen = (then) => {
  const p = Ed.validate(); if (!p.length) { then(); return; }
  Ed.cx = p[0].at[0]; Ed.cy = p[0].at[1];
  ui.show('edProblems', { kicker: 'Workshop', title: 'Not ready yet', sections: p.map((q, i) => ['Problem ' + (i + 1), q.text]), actions: [{ label: 'Fix it', primary: true, fn: () => ui.hide() }] });
};
Ed.json = () => JSON.stringify(Ed.L);
Ed.save = slot => { E.store.set('bentou:workshop:' + slot, Ed.json()); Ed.slot = slot; B.Hud.toast('Saved to slot ' + (slot + 1), Ed.L.name); };
Ed.loadSlot = slot => { const j = E.store.get('bentou:workshop:' + slot, null); if (!j) return false; try { Ed.load(JSON.parse(j)); Ed.slot = slot; return true; } catch (e) { return false; } };
/** import: parse and check a level's shape; returns an error string or null */
Ed.importJson = text => {
  let L; try { L = JSON.parse(text); } catch (e) { return 'That is not JSON.'; }
  if (!L || !Array.isArray(L.rows) || !Array.isArray(L.size) || L.rows.length !== L.size[1] || L.rows.some(r => typeof r !== 'string' || r.length !== L.size[0])) return 'The level’s rows do not match its size.';
  for (const k of ['guards', 'civilians', 'props', 'lights', 'pickups', 'bells', 'barracks', 'zones', 'anchors', 'triggers']) if (!Array.isArray(L[k])) L[k] = [];
  Ed.load(L); return null;
};
Ed.testPlay = (fresh) => Ed.problemScreen(() => { ui.hide(); game.go('mission', { level: deepCopy(Ed.L), mission: 'workshop', mode: 'workshop', char: Save.get().character || 'sojiro' }, { fade: 'iris', seconds: .4 }); });
/* ---- the editor's menus (Shell screens; no alert, prompt or confirm) ---- */
Ed.menu = () => ui.show('edMenu', { kicker: 'Workshop', title: Ed.L.name, actions: [
  { label: 'Test play', primary: true, fn: () => Ed.testPlay() }, ['Play (a fresh run with results)', () => Ed.testPlay(true)],
  ['Save to a slot', () => ui.show('edSave', { kicker: 'Workshop', title: 'Save to slot', actions: [0, 1, 2].map(s => [Ed.slotLabel(s), () => Ed.problemScreen(() => { Ed.save(s); ui.hide(); })]).concat([['Back', () => ui.back()]]) })],
  ['Load a slot', () => ui.show('edLoad', { kicker: 'Workshop', title: 'Load', actions: [0, 1, 2].map(s => ({ label: Ed.slotLabel(s), disabled: !E.store.get('bentou:workshop:' + s, null), fn: () => { Ed.loadSlot(s); ui.hide(); } })).concat([['Back', () => ui.back()]]) })],
  ['Level settings', () => Ed.settings()], ['Export JSON', () => Ed.exportScreen()], ['Import JSON', () => Ed.importScreen()],
  ['New level', () => Ed.newScreen()], ['Leave the Workshop', () => { ui.hide(); game.go('title', { menu: true }); }]] });
Ed.slotLabel = s => { const j = E.store.get('bentou:workshop:' + s, null); let n = 'empty'; if (j) { try { n = JSON.parse(j).name; } catch (e) { n = 'damaged'; } } return 'Slot ' + (s + 1) + ': ' + n; };
Ed.settings = () => {
  const L = Ed.L, cyc = (list, v) => list[(list.indexOf(v) + 1) % list.length];
  ui.show('edSettings', { kicker: 'Workshop', title: 'Level settings', actions: [
    ['Name: ' + L.name, () => { const names = ['A New Night', 'The Silent Granary', 'Lanterns by the Moat', 'The Broker’s Last Meal', 'Smoke over the Kura']; L.name = cyc(names, L.name); Ed.settings(); }],
    ['Size: ' + L.size[0] + ' × ' + L.size[1], () => { const s = cyc([32, 40, 48], L.size[0]); Ed.resize(s); Ed.settings(); }],
    ['Time: ' + L.time, () => { L.time = cyc(['night', 'dusk', 'rain', 'festival'], L.time); L.weather = { rain: 'rain', festival: 'maple', dusk: 'petals', night: null }[L.time]; Ed.rebuild(); Ed.settings(); }],
    ['Par time: ' + fmtTime(L.par), () => { L.par = cyc([240, 300, 420, 480, 600, 720, 900], L.par); Ed.settings(); }],
    ['Music: ' + L.music, () => { L.music = cyc(['m1', 'm2', 'm3', 'training'], L.music); Ed.settings(); }], ['Back', () => ui.back()]] });
};
Ed.resize = s => { const L = Ed.L, g = LG(s, s); for (let y = 1; y < s - 1; y++) for (let x = 1; x < s - 1; x++) { const c = (L.rows[y] || '')[x]; g.set(x, y, c && y < L.size[1] - 1 && x < L.size[0] - 1 ? c : '.'); } L.rows = g.rows(); L.size = [s, s];
  const inb = a => a && a[0] > 0 && a[1] > 0 && a[0] < s - 1 && a[1] < s - 1; L.guards = L.guards.filter(e => inb(e.at)); L.civilians = L.civilians.filter(e => inb(e.at)); L.props = L.props.filter(p => inb([p[1], p[2]])); L.lights = L.lights.filter(e => inb(e.at)); L.pickups = L.pickups.filter(e => inb(e.at));
  if (L.hero && !inb(L.hero.at)) L.hero.at = [2, s - 3]; if (L.exit && !inb(L.exit.at)) L.exit.at = [s - 3, 2]; if (L.boss && !inb(L.boss.at)) L.boss = null; Ed.rebuild(); };
Ed.newScreen = () => ui.show('edNew', { kicker: 'Workshop', title: 'New from template', actions: [['A blank 40 × 40 night', () => { Ed.load(Ed.blank()); ui.hide(); }]].concat(['training', 'm1', 'm2', 'm3', 'delivery'].map(id => ['A copy of ' + B.get('level', id).name, () => { const L = deepCopy(B.get('level', id)); L.id = 'custom'; L.name = 'Copy of ' + L.name; Ed.load(L); ui.hide(); }]), [['Back', () => ui.back()]]) });
/** export: the clipboard, else a read-only text box to select from */
Ed.exportScreen = () => {
  const j = Ed.json(); let copied = false;
  try { if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(j).then(() => B.Hud.toast('Copied', 'The level is on the clipboard.'), () => {}); copied = true; } } catch (e) { copied = false; }
  Ed.textBox(j, true, copied ? 'Copied to the clipboard. The level’s JSON is also below.' : 'Select the JSON below and copy it.');
};
Ed.importScreen = () => Ed.textBox('', false, 'Paste a level’s JSON, then Import.');
Ed.textBox = (text, readonly, msg) => {
  ui.show('edText', { kicker: 'Workshop', title: readonly ? 'Export' : 'Import', text: msg, actions: [readonly ? null : { label: 'Import', primary: true, fn: () => { const ta = document.getElementById('ed-ta'); const err = Ed.importJson(ta ? ta.value : ''); if (err) { Ed.textBox(ta ? ta.value : '', false, err); } else { Ed.closeText(); ui.hide(); B.Hud.toast('Imported', Ed.L.name); } } }, { label: 'Close', fn: () => { Ed.closeText(); ui.back(); } }].filter(Boolean) });
  if (!hasDOM) return;
  Ed.closeText(); const ta = document.createElement('textarea'); ta.id = 'ed-ta'; ta.value = text; ta.readOnly = !!readonly; ta.spellcheck = false;
  ta.style.cssText = 'position:fixed;left:8%;right:8%;bottom:6%;height:30%;z-index:40;background:#140c0c;color:#f4ead5;border:1px solid #e8b04a;font:12px ui-monospace,monospace;padding:8px';
  document.body.appendChild(ta); if (readonly) { ta.focus(); ta.select(); }
};
Ed.closeText = () => { if (!hasDOM) return; const ta = document.getElementById('ed-ta'); if (ta) ta.remove(); };
/* ---- the scene ---- */
const pressedCode = c => game.input.held.has(c) && !Ed.prev.has(c);
const workshopScene = {
  view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [.6, 2], start: 1, rotate: true, wheel: false }, pausable: false,
  enter(d) {
    if (d && d.level) Ed.load(d.level); else if (!(d && d.resume && Ed.L)) { if (!Ed.loadSlot(0)) Ed.load(Ed.blank()); }
    else Ed.rebuild();
    game.setView('iso'); Lt.enabled = true; Lt.ambient = .55; game.weather = null; game.cam.bounds = v => Ed.W.map.bounds(v); game.follow(null); game.cam.snap = true; B.Music.play('shop');
    B.M = null; Ed.prev = new Set(game.input.held); Ed.repT = 0;
  },
  update(dt) {
    B.pollInput(); Hud.update(dt, null); const I = game.input, L = Ed.L, [w, h] = L.size;
    if (ui.screen) { Ed.prev = new Set(I.held); return; }
    // the menu, the test play
    if (pressedCode('Escape') || pressedCode('Pad9')) { Ed.menu(); Ed.prev = new Set(I.held); return; }
    if (pressedCode('F5') || pressedCode('Pad8')) { Ed.testPlay(); Ed.prev = new Set(I.held); return; }
    // categories and brushes
    const cats = ED_CATS.length, nb = () => ED_CATS[Ed.cat].brushes.length;
    if (pressedCode('Pad4')) { Ed.cat = (Ed.cat + cats - 1) % cats; Ed.brush = 0; Au.sfx('uiMove'); } if (pressedCode('Pad5') || pressedCode('Tab')) { Ed.cat = (Ed.cat + 1) % cats; Ed.brush = 0; Au.sfx('uiMove'); }
    if (pressedCode('Pad6')) { Ed.brush = (Ed.brush + nb() - 1) % nb(); Au.sfx('uiMove'); } if (pressedCode('Pad7')) { Ed.brush = (Ed.brush + 1) % nb(); Au.sfx('uiMove'); }
    if (B.wheel) { Ed.brush = ((Ed.brush + (B.wheel > 0 ? 1 : -1)) % nb() + nb()) % nb(); B.wheel = 0; }
    for (let k = 1; k <= 9; k++) if (pressedCode('Digit' + k) && k <= nb()) Ed.brush = k - 1;
    if (pressedCode('KeyQ')) Ed.facing = (Ed.facing + 315) % 360; if (pressedCode('KeyE') || pressedCode('Pad3') || pressedCode('KeyF')) Ed.facing = (Ed.facing + 45) % 360;
    // the cursor: the stick or keys (repeat), or the mouse under it
    Ed.repT -= dt; const mv = I.move(); if (Math.hypot(mv[0], mv[1]) > .4 && Ed.repT <= 0) { const g2 = game.view.screenDirToGround(mv[0], mv[1]); Ed.cx = clamp(Ed.cx + Math.round(g2[0] * 1.2), 1, w - 2); Ed.cy = clamp(Ed.cy + Math.round(g2[1] * 1.2), 1, h - 2); Ed.repT = Ed.repT < -.2 ? .16 : .08; }
    const p = I.pointer(); let mouse = false; if (p && B.mouseMode()) { const q = Ed.W.map.pick(p[0], p[1]); if (q) { Ed.cx = clamp(q.cx, 1, w - 2); Ed.cy = clamp(q.cy, 1, h - 2); mouse = true; } }
    // right stick or middle drag pans; the camera turns with [ ]
    const rs = I.padAim; if (rs) { Ed.pan[0] += rs[0] * dt * 180; Ed.pan[1] += rs[1] * dt * 180; }
    const pn = I.pan && I.pan(); if (pn && I.held.has('Mouse1')) { Ed.pan[0] -= pn[0] * .8; Ed.pan[1] -= pn[1] * .8; }
    if (pressedCode('BracketLeft')) game.rotateView(-45); if (pressedCode('BracketRight')) game.rotateView(45);
    // paint, erase, pick
    const cat = ED_CATS[Ed.cat].id, id = Ed.brushId(), terrain = ['ground', 'walls', 'buildings'].includes(cat);
    const paint = pressedCode('Pad0') || pressedCode('Space') || pressedCode('Enter') || (mouse && pressedCode('Mouse0')), erase = pressedCode('Pad1') || pressedCode('Delete') || pressedCode('Backspace') || (mouse && pressedCode('Mouse2'));
    if (cat === 'settings') { if (paint) Ed.settings(); }
    else if (cat === 'routes') { if (paint) Ed.route('add', Ed.cx, Ed.cy); if (erase) Ed.route('pop'); if (pressedCode('Pad3') || pressedCode('KeyR')) Ed.route('wait'); }
    else { if (paint) { Ed.place(Ed.cx, Ed.cy, id); Au.sfx('uiMove'); Ed.drag = terrain && mouse ? [Ed.cx, Ed.cy] : null; } if (erase) { Ed.remove(Ed.cx, Ed.cy); Au.sfx('uiBack'); } }
    if (Ed.drag && I.held.has('Mouse0') && terrain && (Ed.drag[0] !== Ed.cx || Ed.drag[1] !== Ed.cy)) { const [x0, y0] = Ed.drag, n = Math.max(Math.abs(Ed.cx - x0), Math.abs(Ed.cy - y0)); for (let k = 1; k <= n; k++) Ed.paint(Math.round(x0 + (Ed.cx - x0) * k / n), Math.round(y0 + (Ed.cy - y0) * k / n), id); Ed.drag = [Ed.cx, Ed.cy]; }
    if (!I.held.has('Mouse0')) Ed.drag = null;
    if (pressedCode('Pad2') || pressedCode('KeyI')) Ed.pick(Ed.cx, Ed.cy);
    Ed.prev = new Set(I.held);
    game.focus(cellC(Ed.cx) + Ed.pan[0], cellC(Ed.cy) + Ed.pan[1], 0);
  },
  draw(r) {
    const W = Ed.W, L = Ed.L; if (!W) return;
    W.draw(r, null);
    const z0 = W.map.height(Ed.cx, Ed.cy), zc = z0 > 1e8 ? 0 : z0;
    // the grid around the cursor, the cursor box at the cell's top
    r.decal(g => { for (let y = Ed.cy - 8; y <= Ed.cy + 8; y++) for (let x = Ed.cx - 8; x <= Ed.cx + 8; x++) { if (x < 0 || y < 0 || x >= L.size[0] || y >= L.size[1]) continue; const p = r.w(x * 16, y * 16, 0); px.dot(g, p[0], p[1], '#5a5a7a'); } });
    r.queue(cellC(Ed.cx), cellC(Ed.cy), zc + 1, g => { const c = [[0, 0], [16, 0], [16, 16], [0, 16]].map(([dx, dy]) => r.w(Ed.cx * 16 + dx, Ed.cy * 16 + dy, zc + 1)); for (let i = 0; i < 4; i++) px.line(g, c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], Math.floor(game.real * 4) % 2 ? '#ffe08a' : '#e8b04a'); }, { emissive: true, bias: 9 });
    // entities as markers (rigs would be heavy; the shapes and lights already draw)
    const mark = (cx, cy, col, label, z) => r.queue(cellC(cx), cellC(cy), (z || 0) + 2, g => { const p = r.w(cellC(cx), cellC(cy), (z || 0) + 2); px.disc(g, p[0], p[1] - 4, 4, '#100808'); px.disc(g, p[0], p[1] - 4, 3, col); E.font.text(g, label, p[0], p[1] - 16, '#f4ead5', { align: 'center', font: 'tiny', shadow: '#000', outline: false }); }, { bias: 8 });
    if (L.hero) mark(L.hero.at[0], L.hero.at[1], '#5ad8c8', 'START'); if (L.exit) mark(L.exit.at[0], L.exit.at[1], '#e8b04a', 'EXIT');
    for (const gd of L.guards) { mark(gd.at[0], gd.at[1], gd.id === Ed.sel ? '#ffffff' : '#ff4a3a', gd.type.toUpperCase(), gd.z); if (gd.route) r.queue(cellC(gd.at[0]), cellC(gd.at[1]), 2, g => { for (let i = 0; i < gd.route.length; i++) { const a = gd.route[i], b2 = gd.route[(i + 1) % gd.route.length], p = r.w(cellC(a[0]), cellC(a[1]), 1), q = r.w(cellC(b2[0]), cellC(b2[1]), 1); px.line(g, p[0], p[1], q[0], q[1], gd.id === Ed.sel ? '#ffffff' : '#5a8aff'); E.font.text(g, String(a[2]), p[0] + 2, p[1] - 6, '#8ab8ff', { font: 'tiny', outline: false }); } }, { bias: 7 }); }
    for (const c of L.civilians) mark(c.at[0], c.at[1], c.target ? '#ffd36a' : c.disguised ? '#a83a5a' : '#c8c0b0', c.target ? 'TARGET' : c.type.toUpperCase());
    if (L.boss) mark(L.boss.at[0], L.boss.at[1], '#c8202a', L.boss.id.toUpperCase());
    for (const b2 of L.bells) mark(b2[0], b2[1], '#c8a040', 'BELL'); for (const b2 of L.barracks) mark(b2[0], b2[1], '#6a6a7a', 'BARRACKS');
    for (const pk of L.pickups) mark(pk.at[0], pk.at[1], '#9ae89a', pk.id === 'scroll' ? 'SCROLL' : (pk.tool || '').toUpperCase());
    // the panels: category tabs, the brush strip, the cell info, the controls
    r.overlay(g => {
      const Wd = r.W, H = r.H; let x = 4;
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, Wd, 13, '#140c0c'));
      ED_CATS.forEach((c, i) => { const tw = E.font.width(c.name) + 8; px.rect(g, x, 1, tw, 11, i === Ed.cat ? '#e8b04a' : '#2a1414'); E.font.text(g, c.name, x + 4, 3, i === Ed.cat ? '#1a1418' : '#f4ead5', { outline: false }); x += tw + 2; });
      const br = ED_CATS[Ed.cat].brushes; px.blend(g, .85, 'normal', () => px.rect(g, 0, H - 26, Wd, 26, '#140c0c'));
      const start = Math.max(0, Math.min(Ed.brush - 4, br.length - 9)); let bx = 4;
      for (let i = start; i < Math.min(br.length, start + 9); i++) { const [bid, name] = br[i], on = i === Ed.brush, bw = Math.min(Math.max(30, E.font.width(name, { font: 'tiny' }) + 8), 64); px.rect(g, bx, H - 24, bw, 22, on ? '#4a2418' : '#2a1414'); if (on) px.rect(g, bx, H - 24, bw, 2, '#e8b04a');
        if (bid.startsWith('tool:')) px.sprite(g, Art.icon[B.get('tool', bid.slice(5)).icon], bx + 2, H - 21); else if (bid.length === 1) { const t = WALLTYPES[bid]; px.rect(g, bx + 3, H - 20, 10, 10, t ? t.side : (bid === '~' ? '#1e3a5a' : bid === ',' ? '#2e4a32' : bid === ':' ? '#8a8a8a' : bid === '"' ? '#3a5a2a' : '#5a4a3a')); }
        E.font.text(g, (i < 9 ? (i + 1) + ' ' : '') + name, bx + (bid.length === 1 || bid.startsWith('tool:') ? 16 : 3), H - 12, '#f4ead5', { font: 'tiny', outline: false }); bx += bw + 2; }
      const ch = Ed.cell(Ed.cx, Ed.cy), wt = WALLTYPES[ch];
      E.font.text(g, 'Cell ' + Ed.cx + ', ' + Ed.cy + '  ·  ' + (wt ? wt.name + ' (h ' + wt.h + ')' : FLOORCH[ch] || 'earth') + '  ·  facing ' + Ed.facing + '°' + (Ed.sel ? '  ·  route of ' + Ed.sel : ''), 4, 16, '#f4ead5', { shadow: '#000', outline: false });
      E.font.text(g, L.name + '  ' + L.size[0] + '×' + L.size[1] + '  ' + L.time, 4, 26, '#b8a890', { shadow: '#000', outline: false });
      const leg = Glyph.device() === 'pad' ? '{a:jump} Paint  {a:crouch} Erase  {a:attack} Pick  {a:interact} Turn  {a:block}{a:grapple} Category  {a:focus}{a:useTool} Brush  {a:objectives} Test  {a:pause} Menu'
        : 'Click paint · Right click erase · Wheel brush · Tab category · Q/E turn · I pick · F5 test · Esc menu';
      Glyph.text(g, leg, Wd - 4, H - 36, '#b8a890', { align: 'right' });
      if (ED_CATS[Ed.cat].id === 'routes') E.font.text(g, Ed.sel ? 'Route: paint adds a waypoint, erase removes the last, R / triangle cycles its wait.' : 'Pick a guard first (square / I over it).', Wd / 2, 40, '#ffe08a', { align: 'center', shadow: '#000', outline: false });
    });
    Hud.draw && r.overlay(g => { let ty = 30; for (const t of Hud.toasts) { E.font.text(g, t.title + (t.text ? ': ' + t.text : ''), r.W / 2, ty, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); ty += 10; } });
  },
  exit() { Ed.closeText(); Lt.enabled = false; }
};
B.Ed = Ed; B.workshopScene = workshopScene;

/* ---- 80-autopilot.js ---- */
/* ---- THE AUTOPILOT: it plays the hero by producing intents (never game.input), so attract mode cannot be mistaken
 * for a player. A route is a list of beats: { at, facing } teleport, { goto: [cx, cy], gait } walk a flow field there,
 * { wait }, { until }, { press }, { hold, s }, { grapple: [cx, cy, z] }, { use: tool, at }, { cut: guardId }, { fight: s },
 * { camera }, { say }, { fn }. Each beat gives up after 8 s (or its max) so a loop can never stick ---- */
const Autopilot = { beats: [], i: 0, t: 0, held: {}, log: [], timeouts: 0, name: null };
Autopilot.load = (beats, name) => { Autopilot.beats = beats.slice(); Autopilot.i = 0; Autopilot.t = 0; Autopilot.held = {}; Autopilot.name = name || null; Autopilot.timeouts = 0; Autopilot.started = false; };
Autopilot.done = () => Autopilot.i >= Autopilot.beats.length;
const heroFlowKey = (W, tx, ty) => 'h' + toCell(tx) + ',' + toCell(ty);
/** a flow field for the hero (its own map: water swims, ledges of 30 climb, gaps of 60 leap) */
Autopilot.flow = (W, tx, ty) => {
  const k = heroFlowKey(W, tx, ty); let f = W.flows.get(k);
  if (!f) { f = new E.FlowField(W.map, { climb: 30, drop: 48, jump: 60 }); W.flows.set(k, f); if (W.flows.size > 32) W.flows.delete(W.flows.keys().next().value); }
  f.update(cellC(toCell(tx)), cellC(toCell(ty))); return f;
};
Autopilot.steer = (h, M, tx, ty, speed = 1) => {
  const W = M.world, d = Math.hypot(tx - h.x, ty - h.y); if (d < 5) return { move: [0, 0], jump: false, arrived: true };
  const f = Autopilot.flow(W, tx, ty), nx = f.next(h.x, h.y);
  let gx = nx ? nx.x : tx, gy = nx ? nx.y : ty; if (!nx || (toCell(nx.x) === toCell(tx) && toCell(nx.y) === toCell(ty))) { gx = tx; gy = ty; }
  const l = Math.hypot(gx - h.x, gy - h.y) || 1;
  return { move: [(gx - h.x) / l * speed, (gy - h.y) / l * speed], jump: !!(nx && h.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < h.r + 5), arrived: false };
};
Autopilot.intent = M => {
  const it = B.noIntent(), h = M.hero; if (!h) return it;
  if (!Autopilot.started) { Autopilot.started = true; Autopilot.t = 0; }
  if (Autopilot.done()) return it;
  const b = Autopilot.beats[Autopilot.i], dt = 1 / 120;
  Autopilot.t += dt;
  const next = () => { Autopilot.i++; Autopilot.t = 0; Autopilot.sub = null; };
  if (Autopilot.t > (b.max || (b.fight ? b.fight + 1 : b.wait ? b.wait + 1 : 8))) { Autopilot.timeouts++; Autopilot.log.push('timeout ' + (Autopilot.name || '') + ' #' + Autopilot.i + ' ' + Object.keys(b)[0]); next(); return it; }
  const gait = b.gait || 'run';
  const setCrouch = want => { if (!!h.crouch !== !!want && !h.swim) it.crouchPressed = true; };
  if (b.at) { Object.assign(h, { x: cellC(b.at[0]) + (b.dx || 0), y: cellC(b.at[1]) + (b.dy || 0), z: b.at[2] !== undefined ? b.at[2] : M.world.map.groundAt(cellC(b.at[0]), cellC(b.at[1])), vx: 0, vy: 0, vz: 0, onGround: true, action: null }); if (b.facing !== undefined) h.facing = b.facing * Math.PI / 180; h.swim = false; h.dive = false; game.cam.snap = true; if (b.crouch !== undefined) h.crouch = b.crouch; next(); return it; }
  if (b.wait !== undefined) { if (b.gait) setCrouch(gait === 'crouch'); if (b.focus) it.focusDown = true; if (Autopilot.t >= b.wait) next(); return it; }
  if (b.until) { if (b.until(M)) next(); return it; }
  if (b.fn) { b.fn(M, h); next(); return it; }
  if (b.press) { it[b.press] = true; next(); return it; }
  if (b.interact !== undefined) { it.interactDown = true; if (Autopilot.t <= dt * 1.5) it.interactPressed = true; if (Autopilot.t >= b.interact) next(); return it; }
  if (b.hold) { it[b.hold] = true; if (b.move) it.move = b.move; if (Autopilot.t >= (b.s || .5)) next(); return it; }
  if (b.face !== undefined) { h.facing = b.face * Math.PI / 180; next(); return it; }
  if (b.say) { B.Cutscene.radio(b.say[0], b.say[1], b.say[2] || 3); next(); return it; }
  if (b.camera) { if (b.camera.turn) B.Cam.turn(b.camera.turn); if (b.camera.zoom) B.Cam.cine(b.camera.zoom, b.camera.hold || 2); next(); return it; }
  if (b.goto) {
    const tx = cellC(b.goto[0]) + (b.dx || 0), ty = cellC(b.goto[1]) + (b.dy || 0);
    setCrouch(gait === 'crouch'); if (h.crouch && gait !== 'crouch' && !it.crouchPressed && !h.swim) it.crouchPressed = true;
    if (b.dive && h.swim && !h.dive) it.crouchPressed = true;
    const s = Autopilot.steer(h, M, tx, ty, gait === 'walk' ? .5 : 1); it.move = s.move; it.jumpPressed = s.jump; it.sprint = gait === 'sprint';
    if (s.arrived || Math.hypot(tx - h.x, ty - h.y) < (b.within || 6)) next();
    return it;
  }
  if (b.grapple) {
    const [cx, cy, z] = b.grapple, tx = cellC(cx), ty = cellC(cy);
    if (h.action && h.action.name === 'grapple') return it;
    if (Autopilot.sub === 'fired') { if (!h.action) next(); return it; }
    const list = Grapple.anchors(h, M); let best = null, bd = 1e9; for (const a of list) { const d = Math.hypot(a.x - tx, a.y - ty) + Math.abs(a.z - (z || a.z)) * 2; if (d < bd) { bd = d; best = a; } }
    if (best) { h.facing = Math.atan2(best.y - h.y, best.x - h.x); Grapple.fire(h, best, M); Autopilot.sub = 'fired'; }
    return it;
  }
  if (b.use) {
    const i = h.bento.findIndex(c => c && c.tool === b.use && c.n > 0); if (i < 0) { Hero.give(h, b.use, 1); return it; }
    h.sel = i; if (b.aim) { const x = cellC(b.aim[0]), y = cellC(b.aim[1]); it.aimPoint = { x, y, z: M.world.map.groundAt(x, y) }; it.mouseMode = true; h.facing = Math.atan2(y - h.y, x - h.x); }
    if (b.feet) it.blockDown = true;
    it.usePressed = true; next(); return it;
  }
  if (b.cut) {
    const v = Mission.find(M, b.cut); if (!v || !v.alive) { if (!h.action) next(); return it; }
    if (h.action) return it;
    const c = SilentCut.find(h, M);
    if (c && c.victim === v) { it.attackPressed = true; return it; }
    // approach from behind on the nav map (crouched), or from the water / a roof as the beat says
    const f = v.facing, back = b.from === 'above' ? 30 : 12, tx = v.x - Math.cos(f) * back, ty = v.y - Math.sin(f) * back;
    if (b.from === 'water') { const s = Autopilot.steer(h, M, b.water ? cellC(b.water[0]) : tx, b.water ? cellC(b.water[1]) : ty, .6); it.move = s.move; if (h.swim && !h.dive && b.dive) it.crouchPressed = true; return it; }
    if (b.from === 'above') { const s = Autopilot.steer(h, M, b.spot ? cellC(b.spot[0]) : tx, b.spot ? cellC(b.spot[1]) : ty, .5); it.move = s.move; return it; }
    setCrouch(b.gait !== 'run'); const s = Autopilot.steer(h, M, tx, ty, h.crouch ? 1 : .5); it.move = s.move; it.jumpPressed = s.jump;
    return it;
  }
  if (b.fight) {
    if (Autopilot.t > b.fight || (b.until2 && b.until2(M))) { next(); return it; }
    const foes = Combat.targets(M).filter(e => e.kind !== 'civ' && (e.kind === 'boss' ? e.active && !e.defeated : true)); let tgt = null, bd = 1e9; for (const e of foes) { const d = Math.hypot(e.x - h.x, e.y - h.y) + Math.abs(e.z - h.z) * 4; if (d < bd) { bd = d; tgt = e; } }
    if (h.crouch) it.crouchPressed = true;
    if (!tgt) return it;
    const d = Math.hypot(tgt.x - h.x, tgt.y - h.y), danger = Hud.tele.find(t => t.t < t.max * .5 && Math.hypot(h.x - t.x, h.y - t.y) < t.r + 4 && t.kind !== 'arc');
    const wind = tgt.atk && tgt.atk.busy && tgt.atk.phase === 'wind' ? tgt.atk.u : tgt.move && tgt.move.ph === 'wind' ? tgt.move.u : -1, key = tgt.move || tgt.atk;
    if (Combat.riposteTarget(h, M) && b.style !== 'plain') { it.attackPressed = true; return it; }
    if (wind >= 0 && key !== Autopilot.decided) { Autopilot.decided = key; Autopilot.plan = b.style === 'plain' ? (rand() < .4 ? 'roll' : 'press') : rand() < .55 ? 'parry' : rand() < .5 ? 'roll' : 'press'; }
    if (wind > .72 && d < 34 && Autopilot.plan === 'parry') { it.blockPressed = Autopilot.t % .5 < dt * 1.5; it.blockDown = true; h.facing = Math.atan2(tgt.y - h.y, tgt.x - h.x); return it; }
    if ((wind > .55 && d < 34 && Autopilot.plan === 'roll') || danger) { const a = Math.atan2(h.y - tgt.y, h.x - tgt.x) + .8; it.move = [Math.cos(a), Math.sin(a)]; it.blockDown = true; it.jumpPressed = true; Autopilot.plan = 'press'; return it; }
    if (d > 16 || h.swim) { const s = Autopilot.steer(h, M, tgt.x, tgt.y, 1); it.move = s.move; it.jumpPressed = s.jump || (h.swim && Autopilot.t % .6 < dt * 1.5); return it; }
    h.facing = Math.atan2(tgt.y - h.y, tgt.x - h.x); if (!h.combo.busy || h.combo.current && h.combo.current.phase === 'recover') it.attackPressed = true;
    return it;
  }
  next(); return it;
};
B.Autopilot = Autopilot;

/* ---- 81-attract.js ---- */
/* ---- ATTRACT MODE: after 10 s without input on the title, a loop of vignettes the autopilot plays with cheats
 * (invulnerable, endless tools). Each loads its level, keeps only the actors it lists, runs its beats and stops at its cap.
 * Any key, button, stick, mouse move, wheel, click or touch returns to the title ---- */
const Attract = { i: 0, loops: 0, visits: {}, log: [] };
const V = (o) => Object.assign({ cap: 24, keep: [], char: 'sojiro', extra: [] }, o);
Attract.VIGNETTES = [
  V({ id: 'rooftops', title: 'Rooftops', level: 'm1', keep: [], extra: [{ id: 'v1g', type: 'ashigaru', at: [16, 23], facing: 90, mode: 'post' }], char: 'kaede',
    beats: [{ at: [3, 19, 40], facing: 0 }, { wait: .6 }, { goto: [11, 19], gait: 'sprint', max: 5 }, { wait: .3 }, { grapple: [14, 19, 64], max: 4 }, { wait: .4 }, { goto: [16, 20], gait: 'crouch', max: 4 }, { wait: .6 },
      { cut: 'v1g', from: 'above', spot: [16, 21], max: 6 }, { wait: 2.5 }] }),
  V({ id: 'silentcut', title: 'Silent Cut', level: 'm1', keep: ['south1', 'south2'], char: 'sojiro',
    beats: [{ fn: M => { const g = Mission.find(M, 'south1'); g.x = cellC(13); g.y = cellC(35); g.mode = 'post'; g.route = null; g.home = { x: g.x, y: g.y, z: 0, facing: 0 }; g.facing = 0; } }, { at: [8, 35], facing: 0, crouch: true }, { wait: 1.4, gait: 'crouch', focus: true }, { cut: 'south1', gait: 'crouch', max: 10 }, { wait: 2.5 }] }),
  V({ id: 'rice', title: 'Rice for the Hungry', level: 'm1', keep: ['garden'], char: 'kaede',
    beats: [{ fn: M => { const g = Mission.find(M, 'garden'); g.x = cellC(30); g.y = cellC(13); g.ri = 1; } }, { at: [39, 15], facing: 180, crouch: true }, { wait: .5, gait: 'crouch' }, { use: 'poisonball', aim: [35, 13] }, { wait: 1, gait: 'crouch' },
      { until: M => { const g = Mission.find(M, 'garden'); return !g.alive; }, max: 16 }, { wait: 1 }, { fn: (M, h) => { const g = Mission.find(M, 'garden'); h.x = g.x + 10; h.y = g.y; } }, { press: 'interactPressed' }, { goto: [31, 13], gait: 'walk', max: 9 }, { press: 'interactPressed' }, { wait: 2 }] }),
  V({ id: 'moat', title: 'The Moat', level: 'm2', keep: ['archerSW'], extra: [{ id: 'v4g', type: 'ashigaru', at: [24, 30], facing: 270, mode: 'post', lantern: true }], char: 'sojiro',
    beats: [{ at: [22, 22], facing: 90 }, { wait: .4 }, { press: 'crouchPressed' }, { goto: [24, 28], gait: 'walk', max: 8 }, { cut: 'v4g', from: 'water', water: [24, 29], max: 6 }, { wait: 3 }] }),
  V({ id: 'smoke', title: 'Smoke and Steel', level: 'm2', keep: ['northpat', 'loopsam', 'bellash'], char: 'kaede', cheats: { god: true, infinite: true },
    beats: [{ fn: M => { for (const id of ['northpat', 'loopsam']) { const g = Mission.find(M, id); g.x = cellC(44 + (id === 'loopsam' ? 3 : -3)); g.y = cellC(19); } const b = Mission.find(M, 'bellash'); b.x = cellC(47); b.y = cellC(24); } }, { at: [44, 22], facing: 270 }, { wait: 2.6 },
      { use: 'smoke', feet: true }, { goto: [40, 26], gait: 'run', max: 3 }, { wait: 1.5 }, { fight: 9 }, { wait: 1 }] }),
  V({ id: 'oni', title: 'Oni on the Roof', level: 'm3', keep: [], boss: true, char: 'sojiro', cap: 28,
    beats: [{ at: [18, 17, 160], facing: 0 }, { fn: M => { const b = M.bosses[0]; Bosses.start(b, M); b.hp = Math.round(b.maxHp * .52); } }, { wait: 2.4 }, { fight: 8 }, { fn: M => { const b = M.bosses[0]; b.hp = Math.min(b.hp, 40); } }, { fight: 6, until2: M => M.bosses[0].defeated }, { wait: 3 }] }),
  V({ id: 'report', title: 'Report', report: true, cap: 9 })
];
const attractScene = Object.assign({}, B.missionScene, {
  pausable: false, isMission: true,
  enter(d) {
    const i = (d && d.i) || 0; Attract.i = i % Attract.VIGNETTES.length; if (Attract.i === 0 && d && d.i) Attract.loops++;
    const v = Attract.VIGNETTES[Attract.i]; Attract.v = v; Attract.t = 0; Attract.visits[v.id] = (Attract.visits[v.id] || 0) + 1; this.since = game.real + .2; B.noteInput(); B.lastInput = game.real;
    if (v.report) { this.report = true; B.Music.play('results'); game.setView('side'); Lt.enabled = false; game.weather = null; this.rig = Rigs.make(v.char); return; }
    this.report = false;
    const M = Mission.create(v.level, { mode: 'attract', char: v.char, missionId: v.level, cheats: Object.assign({ god: true, infinite: true }, v.cheats || {}) });
    M.guards = M.guards.filter(g => v.keep.includes(g.id)); M.civs = []; M.triggers = []; M.objectives = []; M.timer = null; M.escort = null; M.npcs = [];
    if (!v.boss) M.bosses = [];
    for (const s of v.extra) M.guards.push(Enemies.spawn(s, M, M.level.faction));
    M.hero.bento = TOOL_ORDER.slice(0, 8).map(t => ({ tool: t, n: B.get('tool', t).stack }));
    Autopilot.load(v.beats, v.id);
    MS.enter({ M });
  },
  update(dt) {
    B.pollInput(); Attract.t += dt;
    if (B.lastInput > this.since || game.input.anyPressed()) { game.go('title', { menu: true }, { fade: 'dissolve' }); return; }
    const v = Attract.v;
    if (this.report) { this.rig._post = Rigs.bow(clamp((Attract.t - 2) * 2, 0, 1)); this.rig.update(dt, { x: -150, y: 0, z: 0, facing: Math.PI / 2 }); game.focus(-100, 0, 30 + (game.H / 2 - 52) / -game.view.bz); if (Attract.t > v.cap) game.go('attract', { i: Attract.i + 1 }, { fade: 'dissolve' }); return; }
    const M = B.M; if (!M) return;
    MS.step(dt, M);
    if ((Autopilot.done() && Attract.t > 3) || Attract.t > v.cap) { Attract.log.push(...Autopilot.log.splice(0)); game.go('attract', { i: Attract.i + 1 }, { fade: 'dissolve' }); }
  },
  draw(r) {
    if (this.report) Attract.drawReport(r, this.rig); else if (B.M) MS.draw(r, B.M);
    r.overlay(g => {
      E.font.title(g, 'BENTOU 2', 6, 6, { scale: 1, colors: ['#fff4c8', '#e8b04a', '#d8402a'], depth: 1 });
      E.font.text(g, 'DEMO PLAY', r.W - 8, 8, '#f4ead5', { align: 'right', shadow: '#000', outline: false });
      if (!this.report && Attract.v) E.font.text(g, Attract.v.title, r.W - 8, 18, '#e8b04a', { align: 'right', shadow: '#000', outline: false });
      if (Math.floor(game.real * 1.6) % 2 === 0) Glyph.text(g, B.touchOnly() ? 'TAP TO RETURN' : 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#f4ead5', { align: 'center' });
    });
  },
  exit() { B.missionScene.exit(); }
});
Attract.drawReport = (r, rig) => {
  const t = Attract.t, W = r.W, H = r.H;
  r.overlay(g => { px.rect(g, 0, 0, W, H, '#140c0c'); });
  if (t < 5.5) {
    r.overlay(g => {
      const sw = Math.min(240, W - 120), sx = Math.round((W - sw) / 2) + 30, sh = Math.round((H - 50) * clamp(t / .8, 0, 1));
      px.rect(g, sx, 16, sw, sh, '#e8dcc0'); px.rect(g, sx - 6, 12, sw + 12, 6, '#5a3a20');
      const L = [['Time', '6:41'], ['Silent Cuts', 9], ['Kills', 0], ['Times detected', 0], ['Civilians harmed', 0], ['Optional tasks', 1]];
      L.forEach((l, i) => { if (t > .8 + i * .25) { E.font.text(g, l[0], sx + 12, 30 + i * 13, '#3a2a20', { outline: false }); E.font.text(g, String(l[1]), sx + sw - 60, 30 + i * 13, '#1a1418', { align: 'right', outline: false }); } });
      if (t > 2.8) { Art.hanko(g, sx + sw - 30, 50, Math.round(lerp(40, 22, clamp((t - 2.8) * 6, 0, 1))), 'GK', 1); E.font.text(g, '"Not one grain out of place."', sx + sw / 2, 30 + 7 * 13, '#3a2a20', { align: 'center', outline: false }); }
    });
    if (t > 2.8 && !Attract.stamped) { Attract.stamped = true; Au.sfx('stamp'); }
    r.actor(-150, 0, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  } else {
    Attract.stamped = false;
    TITLE_BG.draw(r);
    r.overlay(g => { E.font.title(g, 'BENTOU 2', W / 2, Math.round(H * .3), { align: 'center', scale: 4, colors: ['#fff4c8', '#ffd36a', '#e8b04a', '#d8402a'], depth: 3 }); E.font.text(g, 'Seen by none. Fed by all.', W / 2, Math.round(H * .3) + 40, '#f4ead5', { align: 'center', shadow: '#000', outline: false }); });
  }
};
B.Attract = Attract; B.attractScene = attractScene;

/* ---- 82-hub.js ---- */
/* ---- MULTIPLAYER: AI Hub Session Protocol v1, ghost mode, 1-4 players. Each player runs "Night Delivery" in their own
 * copy; the others appear as translucent shadow ninja in their seat colours and never touch the world. The game shows
 * its own card, starts on the hub's clock, sends its ninja 10 times a second, reports progress every second and its
 * result once. The SHADOW TRIAL is the same round alone, racing your own best run's ghost (white) ---- */
const Hub = { phase: 'off', info: null, card: null, ghosts: {}, sendT: 0, progT: 0, track: [], trackT: 0, resulted: false, ended: false, standings: null, locked: false, M: null };
const SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const ROUND_RANK = [[4000, 'Grand Kaiseki'], [3200, 'Makunouchi'], [2400, 'Ekiben'], [1500, 'Hinomaru'], [-1e9, 'Leftovers']];
Hub.rankOf = sc => ROUND_RANK.find(r => sc >= r[0])[1];
const AH = () => (typeof window !== 'undefined' ? window.AIHub : null);
/** the hero's state code for a ghost: 0 run, 1 crouch, 2 swim, 3 dive, 4 attack, 5 cut, 6 dead, 7 done */
Hub.code = (h, M) => M.ended ? 7 : h.dead ? 6 : h.action && /^cut_/.test(h.action.name) ? 5 : h.combo.busy ? 4 : h.dive ? 3 : h.swim ? 2 : h.crouch ? 1 : 0;
/** start a session: our own card first; null from connect() means no hub after all: the normal title */
Hub.boot = () => {
  const A = AH(); Hub.phase = 'card'; game.go('hubCard', {}, { fade: 0 });
  let p; try { p = A.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { Hub.fallback(); return; }
  Promise.resolve(p).then(info => {
    if (!info) { Hub.fallback(); return; }
    Hub.info = info;
    A.on('card', c => { Hub.card = c; });
    A.on('start', () => { Hub.phase = 'countdown'; Hub.enterRound(); });
    A.on('message', (d, from) => Hub.onMessage(d, from));
    A.on('leave', e => { delete Hub.ghosts[e.id]; Hub.labels(); });
    A.on('time-up', () => Hub.report(true));
    A.on('end', e => Hub.end(e));
    const ch = (info.me % 2) ? 'kaede' : 'sojiro';
    Hub.M = Mission.create('delivery', { mode: 'hub', char: ch, missionId: 'delivery', loadout: Bento.fromHint(B.get('mission', 'delivery').loadoutHint, Save.fresh()) });
    Hub.M.startLoadout = Bento.copy(Hub.M.hero.bento);
    for (const pl of info.players || []) if (pl.id !== info.me) Hub.ghosts[pl.id] = Hub.ghost(pl);
    Hub.cardRigs = (info.players || []).map(pl => { const r = Rigs.make(pl.id % 2 ? 'kaede' : 'sojiro'); r.C.cape = SEAT[pl.id % 4]; r.C.belt = SEAT[pl.id % 4]; return r; });
    A.ready();
  }, () => Hub.fallback());
};
Hub.fallback = () => { Hub.phase = 'off'; if (game.o.menu) game.o.menu.quit = 'title'; game.go('title', {}, { fade: 'dissolve' }); };
Hub.ghost = pl => { const rig = Rigs.make(pl.id % 2 ? 'kaede' : 'sojiro'); rig.C.cape = SEAT[pl.id % 4]; rig.C.belt = SEAT[pl.id % 4]; return { id: pl.id, name: pl.name, color: SEAT[pl.id % 4], rig, x: null, y: 0, z: 0, f: 0, s: 0, k: 0, tx: 0, ty: 0, tz: 0, a: 'delivery', done: false }; };
Hub.enterRound = () => { if (Hub.inRound) return; Hub.inRound = true; Hub.M.locked = true; game.go('mission', { M: Hub.M, mode: 'hub' }, { fade: 0 }); Hub.labels(); };
Hub.onMessage = (d, from) => {
  if (!d || Hub.ended) return; let gh = Hub.ghosts[from];
  if (!gh) { const pl = ((Hub.info && Hub.info.players) || []).find(p => p.id === from) || { id: from, name: 'P' + (from + 1) }; gh = Hub.ghosts[from] = Hub.ghost(pl); Hub.labels(); }
  if (d.t === 'g') { if (gh.x === null) { gh.x = d.x; gh.y = d.y; gh.z = d.z; } gh.tx = d.x; gh.ty = d.y; gh.tz = d.z; gh.f = d.f; gh.s = d.s; gh.k = d.k; gh.a = d.a; }
  if (d.t === 'done') { gh.done = true; gh.score = d.score; }
};
/** each step of the hub round or the trial: the clock, the countdown, ghosts, sends and progress */
Hub.step = (dt, M) => {
  // the trial's own ghost and its recording (10 Hz)
  if (M.mode === 'trial') {
    Hub.trackT -= dt; if (Hub.trackT <= 0 && !M.ended) { Hub.trackT = .1; const h = M.hero; Hub.track.push([Math.round(h.x), Math.round(h.y), Math.round(h.z), +h.facing.toFixed(2), Hub.code(h, M)]); }
    const g = Hub.trialGhost; if (g && g.track.length) { const i = Math.min(g.track.length - 1, Math.floor(M.stats.time * 10)); const [x, y, z, f, s] = g.track[i]; Object.assign(g, { tx: x, ty: y, tz: z, f, s }); if (g.x === null) { g.x = x; g.y = y; g.z = z; } }
  }
  for (const id in Hub.ghosts) { const g = Hub.ghosts[id]; if (g.x === null) continue; const k = 1 - Math.pow(.002, dt); g.x += (g.tx - g.x) * k; g.y += (g.ty - g.y) * k; g.z += (g.tz - g.z) * k; g.rig.blink = 9; g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.f, vx: (g.tx - g.x) * 4, vy: (g.ty - g.y) * 4, crouch: g.s === 1, down: g.s === 2 ? .35 : g.s === 3 ? .55 : g.s === 6 ? 1 : 0, attack: g.s === 4 || g.s === 5 ? E.move('slash', (game.real * 3) % 1) : null }); }
  if (Hub.trialGhost && Hub.trialGhost.x !== null) { const g = Hub.trialGhost, k = 1 - Math.pow(.002, dt); g.x += (g.tx - g.x) * k; g.y += (g.ty - g.y) * k; g.z += (g.tz - g.z) * k; g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.f, crouch: g.s === 1, down: g.s === 2 ? .35 : g.s === 3 ? .55 : 0 }); }
  if (M.mode !== 'hub') return;
  const A = AH(); if (!A || Hub.ended) return;
  const t = A.time();
  if (t < 0) { M.locked = true; return; }
  if (M.locked) { M.locked = false; Hub.phase = 'play'; M.stats.time = 0; }
  M.stats.time = t / 1000;
  Hub.sendT -= dt; if (Hub.sendT <= 0 && !Hub.resulted) { Hub.sendT = .1; const h = M.hero; A.send({ t: 'g', a: 'delivery', x: Math.round(h.x), y: Math.round(h.y), z: Math.round(h.z), f: +h.facing.toFixed(2), s: Hub.code(h, M), k: M.stats.silentCuts + M.stats.kills }, { reliable: false }); }
  Hub.progT -= dt; if (Hub.progT <= 0 && !Hub.resulted) { Hub.progT = 1; A.progress({ score: Score.round(M, {}), label: Hub.label(M) }); }
};
Hub.label = M => { const tg = Mission.find(M, 'sakubei'); if (M.ended && M.result === 'win') return 'Escaped ' + fmtTime(M.stats.time); if (tg && !tg.alive) return 'Target down'; return 'Cuts ' + M.stats.silentCuts + (M.stats.detections ? ' · Seen ' + M.stats.detections : ' · Unseen'); };
Hub.awards = M => { const s = M.stats, out = []; if (s.detections === 0) out.push({ title: 'Ghost of the Moon', detail: 'Never detected' }); if (s.silentCuts >= 5) out.push({ title: 'Silent Blade', detail: s.silentCuts + ' Silent Cuts' }); if (s.kills === 0 && s.silentCuts <= 1) out.push({ title: 'Fed by All', detail: 'No kills but the target' }); return out.slice(0, 3); };
Hub.stats = (M, sc) => ({ 'Silent cuts': M.stats.silentCuts, 'Detected': M.stats.detections, 'Time': fmtTime(M.stats.time), 'Rank': Hub.rankOf(sc) });
/** report the round once: on escape, on death, or at once on time-up */
Hub.report = (timeUp) => {
  const A = AH(), M = Hub.M; if (!A || !M || Hub.resulted) return;
  Hub.resulted = true; const escaped = M.ended && M.result === 'win', sc = Score.round(M, { escaped });
  try { A.send({ t: 'done', score: sc }, { reliable: true }); } catch (e) { /* the round may be over */ }
  A.result({ score: sc, stats: Hub.stats(M, sc), awards: Hub.awards(M) });
  Hub.finalScore = sc; if (timeUp) B.Hud.toast('Time!', 'Score ' + sc);
};
Hub.died = M => { if (M.mode === 'hub') { M.ended = true; M.result = 'dead'; Hub.report(false); B.Hud.toast('Fallen', 'Your round is over.'); } };
B.on('missionEnd', e => { if (e.M && e.M.mode === 'hub') { Hub.report(false); e.M.onEnd = () => {}; } });
Hub.end = e => {
  Hub.ended = true; Hub.locked = true; Hub.standings = e && e.standings; Hub.reason = e && e.reason; Hub.phase = 'end';
  if (B.M) B.M.locked = true; Au.stopMusic(.2); Au.mute(true); game.input.clear();
  Hub.labels();
};
/** names as DOM text (never HTML): over the card, the ghosts, and the round-over standings */
Hub.labels = () => {
  if (!hasDOM) return;
  let box = document.getElementById('hub-names'); if (!box) { box = document.createElement('div'); box.id = 'hub-names'; box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30;font:600 14px system-ui,sans-serif'; document.body.appendChild(box); }
  box.replaceChildren();
  Hub.nameEls = {};
  const add = (id, txt, col) => { const s = document.createElement('div'); s.textContent = txt; s.style.cssText = 'position:absolute;transform:translate(-50%,-100%);padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.55);color:' + col + ';white-space:nowrap'; box.appendChild(s); Hub.nameEls[id] = s; return s; };
  const pls = (Hub.info && Hub.info.players) || [];
  if (Hub.phase === 'card') for (const p of pls) add('c' + p.id, p.name + (Hub.card && Hub.card.ready && Hub.card.ready.includes(p.id) ? '  ✓' : ''), SEAT[p.id % 4]);
  else if (Hub.phase === 'end') {
    const panel = document.createElement('div'); panel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(20,12,12,.92);border:1px solid #e8b04a;padding:18px 28px;border-radius:8px;color:#f4ead5;text-align:center;min-width:240px';
    const h = document.createElement('div'); h.textContent = 'Round over'; h.style.cssText = 'font:600 26px Georgia,serif;color:#e8b04a;margin-bottom:10px'; panel.appendChild(h);
    const order = (Hub.standings || []).flat(); (order.length ? order : pls.map(p => p.id)).forEach((id, i) => { const p = pls.find(q => q.id === id); if (!p) return; const r = document.createElement('div'); r.textContent = (i + 1) + '. ' + p.name; r.style.color = SEAT[p.id % 4]; panel.appendChild(r); });
    box.appendChild(panel);
  } else for (const id in Hub.ghosts) add(id, Hub.ghosts[id].name, Hub.ghosts[id].color);
};
/** draw the ghosts (translucent, an afterimage, their colour) and keep their name labels over them */
Hub.drawGhosts = (r, M) => {
  const list = Object.values(Hub.ghosts).filter(g => g.x !== null && g.a === 'delivery');
  if (Hub.trialGhost && Hub.trialGhost.x !== null) list.push(Hub.trialGhost);
  for (const g of list) r.actor(g.x, g.y, g.z - (g.s === 2 ? 9 : g.s === 3 ? 15 : 0), (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), { alpha: .45, flash: g.color, flashMix: .35, ghost: { color: g.color, life: .25, alpha: .25, owner: g }, outline: false });
  if (!hasDOM || !Hub.nameEls || Hub.phase === 'end') return;
  const cv = document.getElementById('screen'), rc = cv && cv.getBoundingClientRect(); if (!rc) return;
  for (const id in Hub.nameEls) { const g = Hub.ghosts[id], el = Hub.nameEls[id]; if (!g || g.x === null) { el.style.display = 'none'; continue; } const p = r.w(g.x, g.y, g.z + 46); el.style.display = ''; el.style.left = (rc.left + p[0] / r.W * rc.width) + 'px'; el.style.top = (rc.top + p[1] / r.H * rc.height) + 'px'; }
};
/* ---- THE HUB CARD (the game's own): a rooftop at night, the players lined up in their colours, ready ticks, the goal,
 * this player's controls, the countdown. Enter / cross: Ready. Triangle / M: more time (again: take it back) ---- */
const hubCardScene = Object.assign({}, MENU_SCENE, {
  enter() { this.asked = false; B.Music.play('title'); },
  update(dt) {
    const A = AH(), I = game.input; if (!A || Hub.phase !== 'card') return;
    if (I.pressed('confirm') || I.pressed('start')) A.answer('ready');
    if (I.pressed('interact') || I.held.has('KeyM') && I.pressed('objectives')) A.answer('more');
    const c = I.clicked(); if (c && this.btns) { for (const b of this.btns) if (c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h) A.answer(b.a); }
    if (this.lastReady !== JSON.stringify(Hub.card && Hub.card.ready)) { this.lastReady = JSON.stringify(Hub.card && Hub.card.ready); Hub.labels(); }
    (Hub.cardRigs || []).forEach((rg, i) => { rg.blink = 9; rg.update(dt, { x: TMID - 45 + i * 30, y: 0, z: 32, facing: Math.PI / 2, vx: 0, vy: 0, stance: Hub.card && Hub.card.ready && Hub.card.ready.includes(i) ? 'ready' : null }); });
    game.focus(TMID, 0, 32 + (game.H / 2 - 40) / -game.view.bz);
  },
  draw(r) {
    TITLE_BG.draw(r); RIDGE.draw(r);
    (Hub.cardRigs || []).forEach((rg, i) => r.actor(TMID - 45 + i * 30, 0, 32, (g, ox, oy) => rg.draw(g, ox, oy, r.view)));
    r.overlay(g => {
      const W = r.W, c = Hub.card || {};
      E.font.title(g, 'BENTOU 2', W / 2, 10, { align: 'center', scale: 3, colors: ['#fff4c8', '#e8b04a', '#d8402a'], depth: 2 });
      E.font.text(g, 'Night Delivery  ·  ghost round', W / 2, 38, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silence the rice broker and escape by the canal gate.', W / 2, 52, '#e8dcc0', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silent Cuts, unseen, fast: the best ninja score wins.', W / 2, 62, '#e8dcc0', { align: 'center', outline: false, shadow: '#000' });
      Glyph.text(g, 'Move {a:up}{a:left}{a:down}{a:right}  Strike {a:attack}  Jump {a:jump}  Crouch {a:crouch}  Hook {a:grapple}  Tool {a:useTool}', W / 2, 76, '#b8b0d8', { align: 'center' });
      const st = c.paused ? 'Paused: more time asked' : c.starting ? 'Starting…' : c.left !== null && c.left !== undefined ? 'Starting in ' + Math.ceil(c.left / 1000) + ' s' : 'Waiting for the hub…';
      E.font.text(g, st, W / 2, r.H - 46, '#ffd36a', { align: 'center', outline: false, shadow: '#000' });
      const bw = 96, y = r.H - 32; this.btns = [{ a: 'ready', x: W / 2 - bw - 6, y, w: bw, h: 16 }, { a: 'more', x: W / 2 + 6, y, w: bw, h: 16 }];
      px.rect(g, this.btns[0].x, y, bw, 16, '#e8b04a'); Glyph.text(g, '{a:confirm} Ready', this.btns[0].x + bw / 2, y + 4, '#1a1418', { align: 'center', shadow: false });
      px.rect(g, this.btns[1].x, y, bw, 16, c.asked ? '#8a1c1c' : '#3a2a20'); E.font.text(g, (Glyph.device() === 'pad' ? '' : 'M  ') + 'More time', this.btns[1].x + bw / 2 + (Glyph.device() === 'pad' ? 6 : 0), y + 4, '#f4ead5', { align: 'center', outline: false }); if (Glyph.device() === 'pad') Glyph.draw(g, 'interact', this.btns[1].x + 8, y + 3);
    });
    if (hasDOM && Hub.nameEls) { const cv = document.getElementById('screen'), rc = cv && cv.getBoundingClientRect(); if (rc) ((Hub.info && Hub.info.players) || []).forEach((p, i) => { const el = Hub.nameEls['c' + p.id]; if (!el) return; el.style.left = (rc.left + rc.width / 2) + 'px'; el.style.top = (rc.top + rc.height * .36 + i * 28) + 'px'; }); }   // the players listed under the goal, one a line
  }
});
/** the countdown over the round's first frames: 3, 2, 1 in big brush digits */
Hub.drawCountdown = r => {
  const A = AH(); if (!A || Hub.phase === 'end') return; const t = A.time(); if (!(t < 0) || t === -Infinity) return;
  const n = Math.ceil(-t / 1000); r.overlay(g => E.font.title(g, String(Math.min(3, n)), r.W / 2, Math.round(r.H * .32), { align: 'center', scale: 5, colors: ['#ffffff', '#ffd36a', '#d8402a'], depth: 3 }));
};
/* ---- THE SHADOW TRIAL on its own: your best run's ghost in white, the local top five ---- */
Hub.trialStart = M => {
  Hub.track = []; Hub.trackT = 0; const best = Save.trial().ghost;
  if (best && best.track && best.track.length) { const rig = Rigs.make(best.char === 'kaede' ? 'kaede' : 'sojiro'); Hub.trialGhost = { id: 'best', name: 'Best', color: '#ffffff', rig, x: null, y: 0, z: 0, f: 0, s: 0, a: 'delivery', track: best.track }; }
  else Hub.trialGhost = null;
  M.onEnd = () => Hub.trialEnd(M, true); M.onFail = () => Hub.trialEnd(M, false);
};
Hub.trialEnd = (M, escaped) => {
  if (M.trialDone) return; M.trialDone = true;
  const sc = Score.round(M, { escaped }), entry = { score: sc, rank: Hub.rankOf(sc), char: M.char, date: new Date().toISOString().slice(0, 10), time: fmtTime(M.stats.time), escaped };
  const place = Save.trialAdd(entry, escaped ? Hub.track.slice() : null);
  game.go('trialResults', { M, entry, place }, { fade: 'dissolve' });
};
B.on('missionStart', e => { if (e.M.mode === 'trial') Hub.trialStart(e.M); });
const trialResultsScene = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.t = 0; B.Music.play('results'); this.menu = new E.Menu(game, ['Try again', 'Title'], { box: false, onPick: i => { if (i === 0) Flow.bento('delivery', d.M.char, 'trial'); else game.go('title', { menu: true }); } }); },
  update(dt) { B.pollInput(); this.t += dt; if (this.t > 1) this.menu.update(dt); },
  draw(r) {
    paper(r); const d = this.d, b = Save.trial().board;
    r.overlay(g => {
      const W = r.W;
      E.font.title(g, d.entry.escaped ? 'DELIVERED' : 'THE NIGHT TAKES YOU', W / 2, 12, { align: 'center', scale: 2, colors: ['#ffffff', '#e8b04a'], depth: 1 });
      E.font.title(g, String(d.entry.score), W / 2, 36, { align: 'center', scale: 3, colors: ['#fff4c8', '#ffd36a', '#d8402a'], depth: 2 });
      E.font.text(g, d.entry.rank + '  ·  ' + d.entry.time + '  ·  Silent Cuts ' + d.M.stats.silentCuts + '  ·  Detected ' + d.M.stats.detections, W / 2, 64, '#f4ead5', { align: 'center', outline: false });
      if (d.place) E.font.text(g, d.place === 1 ? 'A new best! Your ghost will race you next time.' : 'Place ' + d.place + ' on the board.', W / 2, 76, '#ffd36a', { align: 'center', outline: false });
      E.font.text(g, 'THE BOARD', W / 2, 92, '#e8b04a', { align: 'center', outline: false });
      b.forEach((e, i) => E.font.text(g, (i + 1) + '.  ' + e.score + '   ' + e.rank + '   ' + (B.CHARS[e.char] || B.CHARS.sojiro).name + '   ' + e.date, W / 2, 104 + i * 11, i === d.place - 1 ? '#ffd36a' : '#f4ead5', { align: 'center', outline: false }));
    });
    this.menu.y = r.H - 34; this.menu.draw(r);
  }
});
B.Hub = Hub; B.hubScenes = { hubCard: hubCardScene, trialResults: trialResultsScene };

/* ---- 90-main.js ---- */
/* ---- MAIN: the About / Credits text, the scenes, the boot, deep links (#m1, #trial, #workshop, #attract, #about,
 * #bento, #results), game.debug (the tests' and the checker's handle) and the start: the hub's card in a session, the
 * title otherwise ---- */
const ABOUT = {
  about: ['Bentou 2: Birth of the Lunchbox Assassins is an original isometric ninja stealth-action game, a playful riff on Tenchu 2: Birth of the Stealth Assassins (Acquire / Activision, PlayStation, 2000). It is not affiliated with them; no names, characters, levels, music or art are taken from it.',
    'The Sengoku era. In the shadow of Kokaku Castle, the Jubako-ya sells two-tier lunchboxes to the lord\'s household. One tier for the rice, one for the blade. Play Sojiro or Kaede through the night they become Lunchbox Assassins.',
    '# How to play', 'Stay in the shadows and out of sight cones; crouch in grass and bamboo; watch the Ki Gauge. Come up behind a guard and strike for a Silent Cut. The grappling hook is the only way onto the roofs. Pack your bento with tools before each mission.',
    '# Modes', 'Story (the Trial and three missions, each with a boss). Missions (replay any you have reached, as either apprentice). Shadow Trial (one night delivery against your own best ghost; the same round is the AI Hub\'s multiplayer). Workshop (the Mission Editor). Dev Mode is in the pause menu.'],
  source: ['# Date', '2026-11-03 18:33:31', '# Source', 'Tenchu 2: Birth of the Stealth Assassins (Acquire / Activision, PlayStation, 2000)', '# Plan', 'PLAN.md',
    '# Genre and perspective', 'Third-person ninja stealth-action with melee combat and boss duels; isometric third person, rotatable in 45-degree steps and zoomable (engine iso view; three-quarter as a Settings option)',
    '# Tech', 'my-3D2dge v0.85.2 (handoff package, patched: 9 changes listed in the credits), AI Hub Session Protocol v1 client 1.4.0 (unmodified), vanilla JavaScript in one HTML file; Node 24 and Playwright 1.63 (Chromium) for the tests',
    '# Art direction', 'The engine\'s native PS1-era pixel art (320 x 240 expanded), HD Humanoid rigs dressed for the period, canvas lighting (WebGPU lighting where available), procedural Japanese props, materials, roof caps and wall painters',
    '# Animation', 'The engine\'s procedural rigs, E.MOVES and E.ACTIONS, with new paired choreographies (ten Silent Cuts, the grapple, the drag) and joint post-processing poses (the ninja run, the wall hug, eating, sleeping, swimming, the bow)',
    '# Audio', 'Music on the engine\'s step sequencer in Japanese scales (Hirajoshi, In) with koto, shamisen, shakuhachi, fue, drone and taiko voices and layered mission songs; synthesized sound effects; Animalese-style gibberish voices from a WebAudio formant synth',
    '# Online', 'AI Hub Session Protocol v1, ghost mode, 1-4 players (Night Delivery); the Shadow Trial races your own best ghost on its own',
    '# Testing', 'One command (node tests/run.mjs: failures only and a one-line count, 384 checks): 23 suites in fresh node:vm pages driven by game.advance and game.debug, among them a TASK.md suite with one check a requirement, the stealth model measured in a real level, a scripted playthrough of the whole story, three attract loops and a mock hub; Playwright checks of the single file from file:// through real keys, mouse and a fake DualSense (the About pages and the phone\'s notice and Settings read off the real canvas and page, the audio sources and every request counted); the real AI Hub harness (2 players; 4 with latency 150, jitter 50, loss 5; the host leaving); node tools/audit.mjs maps each TASK.md item to the checks that show it; node tools/evidence.mjs plays every mission on the shipped file\'s own scripts and prints what the game reports; the engine\'s own checker (handoff/tools/check.mjs) on every mission: no errors, no look notes; screenshots only for the look',
    '# Research', 'The planner\'s research (the Wikipedia article on Tenchu 2; the engine\'s handoff docs; the AI Hub README and harness) plus the engine and hub docs read for this build; no web search during the build',
    '# Environment', 'Claude Code CLI (headless); Linux; browser unknown', '# Model', 'Anthropic, claude-opus-5-5, reasoning effort xhigh', '# Usage', 'API cost and tokens: unknown (not visible to the agent). Session time: about 3 hours 30 minutes (18:33 to about 22:05).'],
  testing: [
    '# How many issues did testing catch?', '28. The scripted tests caught 18 (in the game, the autopilot, the level data and one in the engine\'s Settings screen) and screenshot reviews caught 10 visual and layout issues. Each is listed in tests/ISSUES.md with how it was found and fixed.',
    '# How many would be considered critical issues / game breaking?', '4: guards attacking Tobei while he was still caged (the alarm bell could fail Kiri Lake), the water-gate lever taken by Tobei\'s wait / follow toggle (it blocked the escort), sleeping guards woken by their own snores (it broke the Sleep Dango and a Trial step), and the roof caps drawing over people standing on a roof (Kurogane\'s fight on the keep top was hidden).',
    '# What was the most helpful test you ran?', 'The scripted playthrough of the whole story (autopilot routes through all four missions, the ending, the credits, Kaede\'s run and the Night Delivery). Of the 78 failure lines the test command printed this session, it printed 37, more than four times any other suite, and it found 6 of the 28 issues (#2, #3 and #6 to #9 in tests/ISSUES.md), both Tobei bugs among them.',
    '# What was the least helpful test you ran?', 'The determinism test (one check: the same inputs, played twice, give the same game): it never failed in any of the 60 and more test runs of the session, so it caught nothing.'],
  engine: [
    '# What did you like most about the engine?', 'One height rule shared by collision, sight, reach and navigation: a TileMap with heights, E.Mover\'s parkour, E.sees, E.Suspicion and FlowField gave a working stealth sandbox almost at once, and exact fixed-step headless play (game.advance) made scripted playthroughs and a mock hub easy.',
    '# Did you get stuck or guess wrong?', 'Yes, a few times: a queue item lifted by a footprint sorts over actors standing on that block; r.overlay draws over everything, so a painted room has to go straight to r.ctx; E.Suspicion never decays while the target is seen, so a faint exposure still builds up; the Humanoid\'s blink draws Math.random in update (it matters on the hub\'s card); CSS zoom does not scale percentage heights; a custom input map has to list the menu actions itself.',
    '# What was the most important thing you had to build yourself?', 'The stealth layer: a baked light map and exposure (light x cover x motion x crouch), Shadow Sight and the Ki Gauge, a guard brain with bait, bodies, bells and reinforcements; and the mission runtime (objectives, triggers, checkpoints) that the campaign, the Workshop and the hub round share.',
    '# What was the hardest part about using the engine?', 'Depth-sorting big drawn roofs (kawara caps, hall roofs) against the actors in a height map of one column per cell, and making the HTML menus and the canvas HUD read at 10 feet.',
    '# What did you change in the engine, and why?', 'Nine small patches, marked BENTOU PATCH in the engine and listed on the Credits page: font glyphs; PlayStation symbols by default with an Xbox option; Humanoid masks, hats, spear, bow, club, an offhand blade and a sashimono; settings rows on custom Shell screens and a Dev group kept off the player\'s Settings; hover moves the focus; the 10-foot UI scale; music pluck, attack and release envelopes; a voice bus; the hub\'s Create + Options guard.',
    '# If you could change one thing about the engine, what would it be?', 'A first-class roof or canopy primitive (or a queue option) that sorts per cell, so actors standing on a block draw over its cap. Big drawn overhangs are the main gap for towns and castles.'],
  prompt: [
    '# What did you like most about this prompt?', 'Concrete deliverables with an exact done condition, a deep plan to follow, the one-command test rule (failures only), and a real hub harness to check against.',
    '# What was confusing?', 'The plan\'s file names carried another run\'s model and timestamp, and a short GameTitle (Bentou2) beside TASK.md\'s own [GameTitle-SOURCE] rule; the title rule (brainstorm 50 and draw with an RNG) next to a plan that had already drawn the title; and how to report usage when the agent cannot see its own token counts.',
    '# What was the hardest thing to do?', 'The scope: four missions with bosses, a mission editor, hub multiplayer, attract mode and dev tools in one pass, judging the look only from headless screenshots.',
    '# What would you change in this prompt?', 'Add a ranked must-have list (what to cut first if time runs short), give the plan this run\'s names, and say how to report usage when it is not visible.']
};
const PATCHES = ['1. PlayStation face symbols in the 5x7 pixel font', '2. Button symbols: PlayStation by default, Xbox as the option, on Settings', '3. Humanoid gear: cloth and oni masks, jingasa and kabuto hats, spear, bow and club, an offhand blade, a sashimono',
  '4. Shell: settings rows on custom screens; the Dev group kept off the player\'s Settings', '5. Shell: hovering a button moves the focus', '6. Shell: the 10-foot scale (--ui by window height and Interface size)',
  '7. Music: pluck, attack and release envelopes per track', '8. Audio: a voice bus with its own volume (Voices)', '9. The hub owns Create + Options: Options is ignored while Create is held in a session'];
const About = {};
About.text = ABOUT;
About.pages = () => [['About', ABOUT.about], ['Source Information', ABOUT.source], ['Testing Feedback', ABOUT.testing], ['Engine Feedback', ABOUT.engine], ['Prompt Feedback', ABOUT.prompt],
  ['Credits', ['Built by Claude (Anthropic, claude-opus-5-5) from PLAN.md.', 'Engine: my-3D2dge v0.85.2 (michaelcrosato/my-3d2dge), with these patches:'].concat(PATCHES, ['AI Hub Session Protocol v1, client 1.4.0 (michaelcrosato/ai-hub), unmodified.', 'All art, music, sound and voices are generated in code. No image or audio files.', 'An original game inspired by Tenchu 2: Birth of the Stealth Assassins; not affiliated.'])]];
About.creditLines = () => ['# BENTOU 2', 'Birth of the Lunchbox Assassins', '', '# Story, design, code, art, music', 'Claude (Anthropic, claude-opus-5-5)', 'from PLAN.md', '', '# Engine', 'my-3D2dge v0.85.2', 'by michaelcrosato', '', '# Multiplayer', 'AI Hub Session Protocol v1',
  '', '# Cast', 'Sojiro  ·  Kaede', 'Granny Oshima', 'Lord Mibu Takanori', 'Chamberlain Kurogane Dosetsu', 'Magistrate Kanemori', 'Gonroku the Iron Ox', 'Hotaru of the Red Lantern', 'Tobei the courier', 'Brother Ittetsu', 'Ume, Kiku, Masa', 'and Big Daikon',
  '', '# Inspired by', 'Tenchu 2: Birth of the Stealth Assassins', '(Acquire / Activision, 2000)', 'Not affiliated', '', '', 'Seen by none.', 'Fed by all.', '', ''];
B.About = About; B.ABOUT = ABOUT;

/* ---- the scenes ---- */
const SCENES = Object.assign({ mission: B.missionScene, story: B.storyScene, attract: B.attractScene, workshop: B.workshopScene }, B.menuScenes, B.storyScenes, B.hubScenes);
/* ---- game.debug: what tests and tools read and do ---- */
const snapHero = h => h && { x: +h.x.toFixed(1), y: +h.y.toFixed(1), z: +h.z.toFixed(1), hp: +h.hp.toFixed(1), state: h.action ? h.action.name : h.dead ? 'dead' : h.swim ? (h.dive ? 'dive' : 'swim') : h.hug ? 'hug' : h.drag ? 'drag' : h.crouch ? 'crouch' : 'stand',
  crouch: !!h.crouch, swim: !!h.swim, dive: !!h.dive, breath: +h.breath.toFixed(2), stamina: Math.round(h.stamina || 0), tool: Hero.slot(h) && Hero.slot(h).tool, stacks: h.bento.map(c => c ? c.tool + ':' + c.n : null), char: h.char, onGround: h.onGround };
game.debug = {
  snapshot() {
    const M = B.M, s = { scene: game.sceneName, paused: game.paused, mode: M && M.mode, mission: M && M.missionId, t: M ? +M.t.toFixed(2) : 0 };
    if (M && game.scene && game.scene.isMission) Object.assign(s, { hero: snapHero(M.hero), guards: M.guards.map(g => ({ id: g.id, type: g.type, x: Math.round(g.x), y: Math.round(g.y), z: Math.round(g.z), state: g.asleep || g.status.sleep > 0 ? 'sleep' : g.status.eat > 0 ? 'eat' : g.mind ? g.mind.state : 'calm', level: g.mind ? +g.mind.level.toFixed(2) : 0, alive: g.alive, vis: g.vis })),
      ki: Perception.ki, light: +Perception.lightNow.toFixed(2), exposure: +(Perception.exp || 0).toFixed(2), detections: M.stats.detections, silentCuts: M.stats.silentCuts, kills: M.stats.kills, civiliansHarmed: M.stats.civiliansHarmed,
      objectives: Object.fromEntries(M.objectives.map(o => [o.id, o.state])), score: M.ended && M.result === 'win' ? Score.story(M, (B.get('mission', M.missionId) || {}).par || 600).total : null,
      boss: M.bosses[0] ? { id: M.bosses[0].id, hp: Math.round(M.bosses[0].hp), phase: M.bosses[0].phase, active: M.bosses[0].active, defeated: M.bosses[0].defeated } : null, escort: M.escort ? { hp: Math.round(M.escort.hp), caged: M.escort.caged, follow: M.escort.follow, wait: M.escort.wait } : null,
      timer: M.timer ? Math.round(M.timer.t) : null, flags: Object.assign({}, M.flags), heightened: M.heightened, alarm: M.alarm.rung, ended: M.ended, result: M.result, failed: M.failed, over: !!M.overMenu });
    if (game.sceneName === 'attract') s.attract = { vignette: Attract.v && Attract.v.id, beat: Autopilot.i, loops: Attract.loops };
    if (Hub.phase !== 'off') s.hub = { phase: Hub.phase, resulted: Hub.resulted, ghosts: Object.keys(Hub.ghosts).length };
    if (game.sceneName === 'workshop' && Ed.L) s.editor = { name: Ed.L.name, size: Ed.L.size, cursor: [Ed.cx, Ed.cy], cat: ED_CATS[Ed.cat].id, guards: Ed.L.guards.length, problems: Ed.problems.length };
    return s;
  },
  teleport(x, y, z, f) { const h = B.M && B.M.hero; if (!h) return; Object.assign(h, { x, y, z: z === undefined ? B.M.world.map.groundAt(x, y) : z, vx: 0, vy: 0, vz: 0, onGround: true, action: null }); if (f !== undefined) h.facing = f; h.swim = false; h.dive = false; h.hug = null; game.cam.snap = true; },
  cell(cx, cy) { const M = B.M; return M ? { ch: M.world.rows[cy][cx], h: M.world.map.height(cx, cy), light: M.world.lightAt(cellC(cx), cellC(cy)) } : null; },
  load(id, o = {}) { game.go('mission', Object.assign({ mission: id, mode: o.mode || 'story', char: o.character || o.char || 'sojiro', loadout: o.loadout, cheats: o.cheats }, o.M ? { M: o.M } : {}), { fade: 0 }); },
  go(scene, data) { game.go(scene, data, { fade: 0 }); },
  tune(k, v) { return game.settings.set(k, v); }, resetTune() { game.settings.reset('Dev'); },
  cheat(name, on = true) { if (B.M) B.M.cheats[name] = on; }, give(tool, n = 1) { return B.M ? Hero.give(B.M.hero, tool, n) : 0; },
  kill(id) { const a = B.M && Mission.find(B.M, id); if (a) { a.alive = false; a.hp = 0; } }, alert(id) { const M = B.M; if (!M) return; for (const g of M.guards) if ((id === 'all' || g.id === id) && g.mind) { g.mind.level = 1.2; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; g.target = M.hero; } },
  calm() { if (B.M) for (const g of B.M.guards) if (g.mind) { g.mind.reset(); g.target = null; } }, complete(id) { const M = B.M, o = M && M.objectives.find(o => o.id === id); if (o) Mission.setObj(M, o, 'done'); },
  win(rank = 'Grand Kaiseki') { const M = B.M; if (!M) return; M.forceRank = rank; for (const o of M.objectives) if (!o.optional) o.state = 'done'; Mission.complete(M); }, fail(why) { if (B.M) Mission.fail(B.M, why || 'Failed.'); },
  autopilot(beats, name) { if (!B.M) return; B.M.autopilot = true; Autopilot.load(beats, name); },
  hash() { const M = B.M; if (!M) return 0; const s = JSON.stringify([M.hero.x, M.hero.y, M.hero.z, M.hero.hp, M.guards.map(g => [Math.round(g.x * 10), Math.round(g.y * 10), g.alive, g.mind && g.mind.state]), M.stats]); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
};
game.stateHash = () => { const M = B.M; return M && M.hero ? [Math.round(M.hero.x), Math.round(M.hero.y), Math.round(M.hero.hp)] : [game.sceneName]; };
B.Hub = Hub;
/* ---- the boot: real work behind the boot screen (every level checked once, the cast dressed), then the start ---- */
const BOOT_STEPS = [
  ['Steaming the rice', () => { for (const id of ['training', 'm1', 'm2', 'm3', 'delivery']) { const L = B.get('level', id); if (!L || L.rows.length !== L.size[1] || L.rows.some(r => r.length !== L.size[0])) throw new Error('level ' + id + ' rows do not match its size'); } }],
  ['Lacquering the boxes', () => { titleRig('sojiro'); titleRig('kaede'); }],
  ['Sharpening the knives', () => { for (const k of ['sojiro', 'kaede', 'granny', 'takanori']) Cutscene.rig(k, 'sojiro'); }]
];
const firstScene = () => {
  if (HUBACTIVE) return 'hubCard';
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1);
  return { attract: 'attract', workshop: 'workshop', about: 'about', title: 'title' }[h] || 'title';
};
game.start({ scenes: SCENES, scene: firstScene(), boot: { title: 'BENTOU 2', version: B.version, steps: BOOT_STEPS, messages: ['Folding the boxes', 'Counting the bells', 'Oiling the hinges', 'Feeding the hound'] } });
const deepLink = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h || HUBACTIVE) return;
  const [a, b] = h.split('/');
  if (B.get('mission', a)) game.go('mission', { mission: a, mode: a === 'delivery' ? 'trial' : 'story', char: b === 'kaede' ? 'kaede' : 'sojiro' }, { fade: 0 });
  else if (a === 'trial') game.go('mission', { mission: 'delivery', mode: 'trial', char: 'sojiro' }, { fade: 0 });
  else if (a === 'bento') Flow.bento(b || 'm1', 'sojiro', 'missions');
  else if (a === 'story') Cutscene.play(b || 'prologue', 'sojiro', () => game.go('title'));
  else if (a === 'chars') game.go('charSelect', { then: 'story' }, { fade: 0 });
  else if (a === 'missions') game.go('missions', { char: 'sojiro' }, { fade: 0 });
};
Promise.resolve(game.booted).then(() => { if (HUBACTIVE) Hub.boot(); else deepLink(); });
if (typeof window !== 'undefined') window.__BENTOU = B;

})();
