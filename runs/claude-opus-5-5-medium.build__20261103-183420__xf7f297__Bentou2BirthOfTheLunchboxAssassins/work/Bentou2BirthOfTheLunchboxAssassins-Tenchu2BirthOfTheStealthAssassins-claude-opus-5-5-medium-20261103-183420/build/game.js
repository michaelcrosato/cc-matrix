(() => {
'use strict';
/* ---- 00-core ---- */
/* BENTOU 2: BIRTH OF THE LUNCHBOX ASSASSINS
 * Core loop: take a mission at the shop, pack your bento of ninja tools, slip into a lantern-lit night location unseen,
 * silence guards with Silent Cuts, reach the target, survive the boss, escape, and earn a rank that unlocks new tools.
 * 00-core: the shared namespace B, registries, the event bus, randomness and math helpers. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const B = {};
const CELL = 16;
const HEADLESS = typeof document === 'undefined' || typeof window === 'undefined' || !window.document || !window.document.body;
B.VERSION = '1.0.0';
B.HUB = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);

/* registries: content is data, registered by kind and id */
const REG = {};
const def = (kind, id, spec) => { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; };
const get = (kind, id) => (REG[kind] || {})[id];
const all = kind => Object.values(REG[kind] || {});
Object.assign(B, { def, get, all, REG });

/* the event bus: systems talk through events (noise, seen, detected, alert, bodyFound, silentCut, kill, damage,
 * heroDeath, toolUsed, objective, checkpoint, bell, boss, missionEnd) */
const BUS = {};
B.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => B.off(ev, fn); };
B.off = (ev, fn) => { const l = BUS[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
B.emit = (ev, data) => { const l = BUS[ev]; if (l) for (const fn of l.slice()) { try { fn(data); } catch (e) { if (B.game) B.game.fail('event ' + ev, e); else throw e; } } };

/* randomness: gameplay uses rand() (Math.random, seeded by the hub and the tests) in update only; drawing uses crand,
 * a cosmetic stream of its own, so it never shifts the game's numbers */
const rand = () => Math.random();
const crand = E.rng(0xB3770);
const rpick = l => l[Math.floor(rand() * l.length)];
const cpick = l => l[Math.floor(crand() * l.length)];
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const cc = v => (v + .5) * CELL;   // a cell's center in world units
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
Object.assign(B, { rand, crand, rpick, cpick, dist2, angTo, cc, fmtTime, hashStr });

/* ranks: bento grades, best first */
B.RANKS = [['Grand Kaiseki', 2600, '#e8b04a'], ['Makunouchi', 2000, '#d8402a'], ['Ekiben', 1400, '#c87a3a'], ['Hinomaru', 800, '#b8a890'], ['Leftovers', -1e9, '#7a6a5a']];
B.rankOf = score => B.RANKS.find(r => score >= r[1])[0];
B.rankIndex = name => B.RANKS.findIndex(r => r[0] === name);
B.rankColor = name => (B.RANKS.find(r => r[0] === name) || B.RANKS[4])[2];

/* ---- 01-tune ---- */
/* 01-tune: every balance number is a game setting in group 'Dev' (live sliders in Dev Mode). B.T(key) reads the live
 * value, with the difficulty's multiplier where one applies. */
B.TUNE = [
  // page, key, label, default, min, max, step
  ['Hero', 'heroRun', 'Run speed', 85, 60, 130, 1], ['Hero', 'heroSneak', 'Sneak speed', 32, 18, 50, 1], ['Hero', 'heroSprint', 'Sprint speed', 125, 90, 170, 1],
  ['Hero', 'heroHpMul', 'Hero health ×', 1, .5, 2, .05], ['Hero', 'grappleRange', 'Grapple range', 112, 64, 200, 2], ['Hero', 'grappleSpeed', 'Grapple pull speed', 240, 120, 400, 5],
  ['Hero', 'breath', 'Breath (s)', 12, 5, 30, .5], ['Hero', 'noiseRun', 'Running noise', 60, 20, 140, 2],
  ['Guards', 'sightRange', 'Sight range', 112, 60, 200, 2], ['Guards', 'sightFov', 'Sight cone (rad)', 1.5, .8, 2.4, .05], ['Guards', 'suspRise', 'Suspicion rise', 1.4, .4, 3, .05],
  ['Guards', 'suspDecay', 'Suspicion decay', .3, .05, 1, .01], ['Guards', 'darkness', 'Darkness hides', .65, 0, 1, .01], ['Guards', 'crouchVis', 'Crouched visibility', .55, .2, 1, .01],
  ['Guards', 'hearing', 'Hearing ×', 1, .3, 2, .05], ['Guards', 'lookUp', 'Look-up limit (deg)', 35, 15, 70, 1],
  ['Combat', 'killRange', 'Silent Cut range', 18, 10, 30, 1], ['Combat', 'killBackAngle', 'Back cut angle (deg)', 60, 30, 90, 1], ['Combat', 'parryWindow', 'Parry window (s)', .18, .05, .4, .01],
  ['Combat', 'enemyDmg', 'Enemy damage ×', 1, .25, 2, .05], ['Combat', 'enemyHp', 'Enemy health ×', 1, .5, 2, .05], ['Combat', 'enemyWindup', 'Enemy wind-up ×', 1, .6, 1.6, .05],
  ['Combat', 'smokeTime', 'Smoke time (s)', 6, 2, 12, .5], ['Combat', 'baitRange', 'Bait range', 80, 40, 160, 2],
  ['World', 'kiRange', 'Ki sense range', 160, 80, 300, 2], ['World', 'alertShout', 'Alert shout radius', 160, 0, 320, 5], ['World', 'bodyRange', 'Body spotting range', 96, 40, 180, 2],
  ['World', 'reinforceDelay', 'Reinforcement delay (s)', 15, 5, 40, 1], ['World', 'ambientNight', 'Night ambient light', .38, .15, .7, .01], ['World', 'lanternRadius', 'Lantern radius ×', 1, .5, 1.6, .05],
  ['World', 'parTimeMul', 'Par time ×', 1, .5, 2, .05], ['World', 'slowmo', 'Silent Cut slow motion', .3, .1, 1, .05]
];
B.TUNE_PAGES = ['Hero', 'Guards', 'Combat', 'World'];
B.TUNE_DEF = {}; for (const t of B.TUNE) B.TUNE_DEF[t[1]] = t[3];
/* difficulty: guard perception, damage taken, Ki range */
B.DIFF = { ninja: { per: 1, dmg: 1, ki: 1 }, novice: { per: .8, dmg: .6, ki: 1.2 }, master: { per: 1.2, dmg: 1.4, ki: .85 } };
const DIFF_KEYS = { sightRange: 'per', suspRise: 'per', hearing: 'per', enemyDmg: 'dmg', kiRange: 'ki' };
B.T = key => {
  const S = B.game && B.game.settings, v = S && S[key] !== undefined ? S[key] : B.TUNE_DEF[key];
  const d = DIFF_KEYS[key]; if (!d || !S) return v;
  const trial = B.mission && (B.mission.mode === 'hub' || B.mission.mode === 'trial');
  return v * (trial ? 1 : (B.DIFF[S.difficulty] || B.DIFF.ninja)[d]);
};

/* ---- 02-input ---- */
/* 02-input: the action map (DualSense first, keyboard and mouse native), the hero's intent from the player's input, the
 * button glyphs drawn on canvas for whichever device was used last, the touch-only gate and the idle clock. */
const MENU = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'] };
B.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  jump: ['Space', 'Pad0'], crouch: ['KeyC', 'Pad1'], attack: ['Mouse0', 'KeyJ', 'Pad2'], interact: ['KeyF', 'Pad3'], block: ['Mouse2', 'KeyK', 'Pad4'],
  grapple: ['KeyG', 'Mouse1', 'Pad5'], focus: ['Tab', 'Pad6'], useTool: ['KeyR', 'Pad7'], sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'],
  toolPrev: ['Pad14'], toolNext: ['Pad15'], heal: ['KeyH', 'Pad13'], lure: ['KeyV', 'Pad12'], camLeft: ['KeyQ'], camRight: ['KeyE'], camReset: ['KeyX', 'Pad11'],
  objectives: ['KeyM', 'Pad8'], ...MENU
};
B.CONTROL_NAMES = { jump: 'Jump / climb', crouch: 'Crouch', attack: 'Strike / Silent Cut', interact: 'Interact', block: 'Block / parry', grapple: 'Grappling hook',
  focus: 'Ki Focus', useTool: 'Use tool', sprint: 'Sprint', toolPrev: 'Previous tool', toolNext: 'Next tool', heal: 'Eat rice ball', lure: 'Whistle',
  camLeft: 'Turn camera left', camRight: 'Turn camera right', camReset: 'Reset camera', objectives: 'Objectives' };

/* the idle clock (attract mode) and "mouse mode": any key, button, stick, mouse move over 4 px, wheel, click or touch */
B.idle = 0; B.mouseT = -99; B.wheel = 0; B.slotKey = 0; B.anyInput = false;
const touchOnly = () => { try { return !!(typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0); } catch (e) { return false; } };
B.touchOnly = false;
if (!HEADLESS) {
  B.touchOnly = touchOnly();
  const poke = () => { B.idle = 0; B.anyInput = true; };
  B.taps = new Set();
  addEventListener('keydown', e => { if (!e.repeat) B.taps.add(e.code); }, { capture: true });
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') B.taps.add('Mouse' + e.button); }, { capture: true });
  let lx = -1, ly = -1;
  addEventListener('keydown', e => { poke(); B.touchOnly = false; if (/^Digit[1-8]$/.test(e.code)) B.slotKey = +e.code.slice(5); if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); }, { capture: true });
  addEventListener('pointerdown', e => { poke(); if (e.pointerType === 'mouse') B.mouseT = B.game ? B.game.real : 0; }, { capture: true });
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; if (lx >= 0 && Math.hypot(e.clientX - lx, e.clientY - ly) > 4) { poke(); B.mouseT = B.game ? B.game.real : 0; } lx = e.clientX; ly = e.clientY; }, { capture: true });
  addEventListener('wheel', e => { poke(); B.wheel += Math.sign(e.deltaY); B.mouseT = B.game ? B.game.real : 0; }, { passive: true, capture: true });
  addEventListener('touchstart', poke, { passive: true, capture: true });
  addEventListener('gamepadconnected', () => { B.touchOnly = false; poke(); });
  addEventListener('contextmenu', e => e.preventDefault());
}
/* a gamepad's activity (buttons or sticks) also resets the idle clock: read once a step */
B.padActive = () => {
  const I = B.game.input, ax = I.padAxes || []; let any = false;
  for (const v of ax) if (Math.abs(v) > .35) any = true;
  if (I.held && typeof I.held.forEach === 'function') I.held.forEach(c => { if (typeof c === 'string' && c.startsWith('Pad')) any = true; });
  if (any) B.padT = B.game.real;
  return any;
};
B.padT = -99;
B.mouseMode = () => !!B.game && B.game.real - B.mouseT < 3 && B.mouseT >= B.padT;
const heldCode = c => { const h = B.game.input.held; return !!h && (typeof h.has === 'function' ? h.has(c) : !!h[c]); };

/* the hero's intent from the player: the left stick and the movement keys (never the d-pad: it picks tools in play) */
B.stickPrev = { rx: 0, flick: 0 };
B.intentFromInput = () => {
  const G = B.game, I = G.input, ax = I.padAxes || []; B.padActive();
  let sx = ax[0] || 0, sy = ax[1] || 0; const sl = Math.hypot(sx, sy), dz = I.deadzone || .18;
  if (sl < dz) { sx = 0; sy = 0; } else { const k = (sl - dz) / (1 - dz) / sl; sx *= k; sy *= k; }
  let kx = 0, ky = 0;
  const keysOf = a => (I.map[a] || []).filter(c => !c.startsWith('Pad') && !c.startsWith('Act:'));
  for (const c of keysOf('left')) if (heldCode(c)) kx = -1;
  for (const c of keysOf('right')) if (heldCode(c)) kx = 1;
  for (const c of keysOf('up')) if (heldCode(c)) ky = -1;
  for (const c of keysOf('down')) if (heldCode(c)) ky = 1;
  for (const a of ['left', 'right', 'up', 'down']) if (heldCode('Act:' + a)) { if (a === 'left') kx = -1; if (a === 'right') kx = 1; if (a === 'up') ky = -1; if (a === 'down') ky = 1; }
  let mx = sx, my = sy, walk = false;
  if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; }
  else if (sl > dz && Math.hypot(sx, sy) < .55) walk = true;
  const d = Math.hypot(mx, my) > .01 ? G.view.screenDirToGround(mx, my) : [0, 0], dl = Math.hypot(d[0], d[1]), ml = Math.min(1, Math.hypot(mx, my));
  const move = dl > 0 ? [d[0] / dl * ml, d[1] / dl * ml] : [0, 0];
  let toolDelta = 0; if (I.pressed('toolPrev')) toolDelta = -1; if (I.pressed('toolNext')) toolDelta = 1;
  if (B.wheel) { toolDelta = B.wheel > 0 ? 1 : -1; B.wheel = 0; }
  const toolSlot = B.slotKey; B.slotKey = 0;
  const mg = B.mouseMode() ? G.mouseGround() : null;
  return { move, walk, sprint: I.down('sprint'), crouchPressed: I.pressed('crouch'), crouchDown: I.down('crouch'), jumpPressed: I.pressed('jump'), attackPressed: I.pressed('attack'),
    blockDown: I.down('block'), blockPressed: I.pressed('block'), interactPressed: I.pressed('interact'), interactDown: I.down('interact'), grapplePressed: I.pressed('grapple'),
    grappleDown: I.down('grapple'), grappleReleased: I.released('grapple'), usePressed: I.pressed('useTool'), focusDown: I.down('focus'), toolDelta, toolSlot,
    healPressed: I.pressed('heal'), lurePressed: I.pressed('lure'), aimPoint: mg ? { x: mg[0], y: mg[1] } : null, right: [ax[2] || 0, ax[3] || 0] };
};
B.emptyIntent = () => ({ move: [0, 0], walk: false, sprint: false, crouchPressed: false, crouchDown: false, jumpPressed: false, attackPressed: false, blockDown: false, blockPressed: false,
  interactPressed: false, interactDown: false, grapplePressed: false, grappleDown: false, grappleReleased: false, usePressed: false, focusDown: false, toolDelta: 0, toolSlot: 0,
  healPressed: false, lurePressed: false, aimPoint: null, right: [0, 0] });

/* ---- glyphs: a pixel icon for an action on the device used last (PlayStation shapes in their colors, Xbox letters,
 * a keycap, a mouse with its button lit). Canvas text can embed {a:attack} ---- */
const PS_COL = { '✕': '#7ab4ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#5ae0a0' }, XB_COL = { A: '#5ad86a', B: '#ff5a5a', X: '#5a9aff', Y: '#f0d040' };
B.device = () => { const I = B.game.input; return I.lastDevice === 'gamepad' ? 'gamepad' : B.mouseMode() ? 'mouse' : 'keyboard'; };
B.label = (a, dev) => { const I = B.game.input, d = dev || B.device(); let l = I.label(a, d === 'mouse' ? 'mouse' : d); if (!l || l === '?') l = I.label(a, 'keyboard'); return l || a; };
B.glyphW = (a, dev) => { const l = B.label(a, dev), d = dev || B.device(); if (d === 'gamepad' && (PS_COL[l] || XB_COL[l])) return 11; if (/click/i.test(l)) return 9; return E.font.width(l) + 6; };
B.glyph = (g, a, x, y, dev) => {   // x, y: top-left; returns the width drawn (icons are 11 px tall)
  const l = B.label(a, dev), d = dev || B.device();
  if (d === 'gamepad') {
    const c = PS_COL[l] || XB_COL[l];
    if (c) { px.disc(g, x + 5, y + 5, 5, '#101018'); px.disc(g, x + 5, y + 5, 4, '#2a2a38'); E.font.text(g, l, x + 6, y + 2, c, { align: 'center', outline: false }); return 11; }
    if (/^D-pad/.test(l)) {   // a cross with the used arm lit
      px.rect(g, x + 3, y, 5, 11, '#2a2a38'); px.rect(g, x, y + 3, 11, 5, '#2a2a38'); const arm = l.slice(-1);
      const lit = '#f0e0b0'; if (arm === '↑') px.rect(g, x + 4, y + 1, 3, 3, lit); if (arm === '↓') px.rect(g, x + 4, y + 7, 3, 3, lit); if (arm === '←') px.rect(g, x + 1, y + 4, 3, 3, lit); if (arm === '→') px.rect(g, x + 7, y + 4, 3, 3, lit);
      return 11;
    }
    const w = E.font.width(l) + 6; px.rect(g, x + 1, y, w - 2, 11, '#101018'); px.rect(g, x, y + 1, w, 9, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 9, '#3a3a4c');
    E.font.text(g, l, x + w / 2, y + 2, '#f4ead5', { align: 'center', outline: false }); return w;
  }
  if (/click/i.test(l)) {   // a mouse: body, buttons, the one used lit
    px.rect(g, x + 1, y, 7, 11, '#101018'); px.rect(g, x + 2, y + 1, 5, 9, '#d8d0c0'); px.rect(g, x + 4, y + 1, 1, 4, '#101018');
    const lit = '#d8402a'; if (/Left/.test(l)) px.rect(g, x + 2, y + 1, 2, 4, lit); else if (/Right/.test(l)) px.rect(g, x + 5, y + 1, 2, 4, lit); else px.rect(g, x + 4, y + 2, 1, 2, lit);
    return 9;
  }
  const w = E.font.width(l) + 6; px.rect(g, x, y, w, 11, '#101018'); px.rect(g, x + 1, y, w - 2, 10, '#e8e0cc'); px.rect(g, x + 1, y + 8, w - 2, 2, '#a89a80');
  E.font.text(g, l, x + w / 2, y + 1, '#1a1418', { align: 'center', outline: false }); return w;
};
/* text with inline {a:action} glyphs, left-aligned at x (or centered with align: 'center'); returns the width */
B.richW = (s, o = {}) => { let w = 0; for (const p of String(s).split(/(\{a:[a-zA-Z]+\})/)) { const m = /^\{a:([a-zA-Z]+)\}$/.exec(p); w += m ? B.glyphW(m[1]) + 2 : E.font.width(p, o); } return w; };
B.rich = (g, s, x, y, color = '#f4ead5', o = {}) => {
  let cx = o.align === 'center' ? Math.round(x - B.richW(s, o) / 2) : o.align === 'right' ? Math.round(x - B.richW(s, o)) : x;
  for (const p of String(s).split(/(\{a:[a-zA-Z]+\})/)) {
    const m = /^\{a:([a-zA-Z]+)\}$/.exec(p);
    if (m) { cx += B.glyph(g, m[1], cx, y - 2) + 2; continue; }
    if (p) { E.font.text(g, p, cx, y, color, Object.assign({ shadow: '#000', outline: false }, o, { align: 'left' })); cx += E.font.width(p, o); }
  }
  return cx;
};

/* ---- 05-game ---- */
/* 05-game: the game, its settings (the player's, in group 'Game'; balance in group 'Dev'), the HTML shell and the pause
 * menu's items. */
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'ninja', options: [['ninja', 'Ninja'], ['novice', 'Novice'], ['master', 'Grand Master']], help: 'Guard perception, damage taken and Ki range' },
  { key: 'uiSize', label: 'Interface size', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['normal', 'Normal'], ['large', 'Large'], ['huge', 'Huge']], help: 'Menus and panels, for a TV across the room', apply: (g, v) => { E.uiScale = { auto: 1, normal: 1, large: 1.25, huge: 1.5 }[v] || 1; if (g.shell && g.shell.rescale) g.shell.rescale(); B.hudScale = v === 'auto' ? 0 : { normal: 1, large: 1.25, huge: 1.5 }[v]; } },
  { key: 'camAngle', label: 'Camera angle', type: 'select', value: 'low', options: [['low', 'Low'], ['high', 'High']], help: 'Low: isometric. High: from above', apply: (g, v) => { if (g.sceneName === 'mission' || g.sceneName === 'attract') g.setView(v === 'high' ? 'threequarter' : 'iso'); } },
  { key: 'invertCam', label: 'Invert camera turn', type: 'toggle', value: false },
  { key: 'crouchMode', label: 'Crouch', type: 'select', value: 'toggle', options: [['toggle', 'Toggle'], ['hold', 'Hold']] },
  { key: 'cones', label: 'Sight cones', type: 'toggle', value: true, help: 'The faint cones of the guards you can see' },
  { key: 'marker', label: 'Objective marker', type: 'toggle', value: true },
  { key: 'showAll', label: 'Show all enemies (assist)', type: 'toggle', value: false, help: 'Turns Shadow Sight off: every guard is drawn' },
  { key: 'heartbeat', label: 'Ki heartbeat', type: 'toggle', value: true },
  { key: 'textSpeed', label: 'Text speed', type: 'select', value: 'normal', options: [['normal', 'Normal'], ['slow', 'Slow'], ['fast', 'Fast']] },
  { key: 'blood', label: 'Blood', type: 'select', value: 'ink', options: [['ink', 'Ink'], ['off', 'Off']] }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', input: B.INPUT, id: 'bentou2',
  menu: { quit: B.HUB ? false : 'title', items: () => B.pauseItems ? B.pauseItems() : [], controls: B.CONTROL_NAMES } });
B.game = game;
const A = game.audio, P = game.particles, L = game.lights;
for (const s of SETTINGS) game.settings.define(Object.assign({ group: 'Game' }, s));
game.settings.define({ key: 'voices', group: 'Sound', label: 'Voices', type: 'slider', value: .8, apply: (g, v) => { if (g.audio.voiceBus) g.audio.voiceBus.gain.value = v; } });
for (const [page, key, label, value, min, max, step] of B.TUNE) game.settings.define({ key, group: 'Dev', label: page + ': ' + label, type: 'slider', value, min, max, step });
E.pauseGuard = g => B.HUB && g.input.down('objectives');   // the hub owns Create + Options
B.ui = new E.Shell(game, { theme: { ink: '#f4ead5', paper: 'rgba(20,12,12,.92)', accent: '#e8b04a', muted: '#b8a890', danger: '#d8402a', line: 'rgba(232,176,74,.35)', font: 'system-ui, sans-serif', titleFont: 'Georgia, "Times New Roman", serif' } });
B.ts = () => ({ normal: 46, slow: 26, fast: 90 })[game.settings.textSpeed] || 46;
B.scenes = {};

/* ---- 10-audio ---- */
/* 10-audio: all music, effects and voices in code. Songs on the engine's step sequencer in Japanese scales (Hirajoshi
 * D E F A Bb, In E F A B C), one song in layers per mission (base / tension / alert); effects as voice lists; and a
 * formant gibberish voice synth (Animalese-style) on the patched voice bus. */
const KOTO = { wave: 'pulse12', pluck: true, ring: 1.2 }, SHAMI = { wave: 'saw', pluck: true, ring: .35 }, SHAKU = { wave: 'sine', attack: .09, vib: [5, .012] };
const FUE = { wave: 'pulse', vib: [6, .015], attack: .03 }, DRONE = { wave: 'triangle' };
const T_ = (o, name, vol, notes, extra) => Object.assign({ name, vol, notes }, o, extra || {});
B.SONGS = {
  title: { bpm: 72, steps: 4, tracks: [
    T_(DRONE, 'drone', .2, 'D3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - - | Bb2 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -'),
    T_(KOTO, 'koto', .13, 'D5 . . . A4 . . . Bb4 . A4 . F4 . . . | E4 . . . F4 . A4 . D5 . . . . . . . | F5 . E5 . D5 . . . Bb4 . A4 . F4 . . . | E4 . F4 . E4 . D4 . . . . . . . . .'),
    T_(SHAKU, 'shaku', .1, '. . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . A4 - - - Bb4 - A4 - | F4 - - - - - - - E4 - - - D4 - - - | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . . | . . . . . . . . . . . . . . . .'),
    T_({ wave: 'drums' }, 'taiko', .08, '. . . . . . . . . . . . k . . . | . . . . . . . . . . . . k . k .')] },
  shop: { bpm: 96, steps: 4, tracks: [
    T_(SHAMI, 'shami', .1, 'E4 . E4 F4 A4 . . . B4 . A4 . F4 . E4 . | E4 . E4 F4 A4 . B4 . C5 . B4 . A4 . . . | F4 . F4 A4 B4 . . . C5 . B4 . A4 . F4 . | E4 . F4 . E4 . . . . . . . . . . .'),
    T_(KOTO, 'koto', .08, 'E3 . . . B3 . . . E3 . . . A3 . . . | F3 . . . C4 . . . E3 . . . B3 . . .'),
    T_({ wave: 'drums' }, 'block', .05, 'c . . . h . . . c . h . h . . .')] },
  results: { bpm: 80, steps: 4, tracks: [
    T_(KOTO, 'koto', .12, 'A4 . D5 . E5 . F5 . E5 . D5 . A4 . . . | Bb4 . A4 . F4 . E4 . D4 . . . . . . .'),
    T_(DRONE, 'drone', .16, 'D3 - - - - - - - - - - - - - - - | Bb2 - - - - - - - A2 - - - - - - -')] },
  ending: { bpm: 66, steps: 4, tracks: [
    T_(SHAKU, 'shaku', .12, 'D5 - - - E5 - - - F#5 - - - A5 - - - | B5 - - - A5 - F#5 - E5 - - - - - - - | D5 - - - B4 - - - A4 - - - B4 - D5 - | E5 - - - - - - - D5 - - - - - - -'),
    T_(KOTO, 'koto', .09, 'D4 F#4 A4 D5 A4 F#4 D4 F#4 B3 D4 F#4 B4 F#4 D4 B3 D4 | G3 B3 D4 G4 D4 B3 G3 B3 A3 C#4 E4 A4 E4 C#4 A3 C#4'),
    T_(DRONE, 'drone', .14, 'D3 - - - - - - - B2 - - - - - - - | G2 - - - - - - - A2 - - - - - - -')] },
  boss: { bpm: 140, steps: 4, tracks: [
    T_({ wave: 'drums' }, 'taiko', .17, 'k . k . s . k k k . s . k s k s'),
    T_(SHAMI, 'shami', .1, 'D4 D4 F4 D4 A4 . Bb4 A4 D4 D4 F4 D4 E4 . D4 . | D4 D4 F4 D4 A4 . D5 Bb4 A4 . F4 . E4 F4 E4 D4'),
    T_(FUE, 'fue', .06, 'D6 - - - . . . . Bb5 - A5 - . . . . | F5 - - - E5 - - - D5 - - - . . . .'),
    T_(DRONE, 'drone', .2, 'D2 . D2 . D2 . D2 . D2 . D2 . C2 . C2 . | Bb1 . Bb1 . Bb1 . Bb1 . A1 . A1 . A1 . A1 .')] }
};
/* mission songs: base layer (drone + koto) always on; tension (shamisen) and alert (taiko + fue) come in by layers */
const missionSong = (bpm, drone, koto, shami, fue, extra = []) => ({ bpm, steps: 4, tracks: [
  T_(DRONE, 'drone', .18, drone), T_(KOTO, 'koto', .1, koto), ...extra,
  T_(SHAMI, 'tension', .09, shami, { on: false }),
  T_({ wave: 'drums' }, 'alertDrum', .16, 'k . . k s . k . k k . k s . k s', { on: false }), T_(FUE, 'alertFue', .06, fue, { on: false })] });
B.SONGS.training = missionSong(84, 'D3 - - - - - - - - - - - - - - - | F3 - - - - - - - E3 - - - - - - -', 'A4 . . . . . D5 . . . . . E5 . . . | F5 . . . E5 . . . D5 . . . . . . . | . . . . Bb4 . . . A4 . . . . . F4 . | E4 . . . . . . . D4 . . . . . . .',
  'D4 . F4 . A4 . F4 . D4 . E4 . F4 . E4 .', 'D6 - . D6 F6 - E6 - D6 - . . A5 - . .');
B.SONGS.m1 = missionSong(90, 'D2 - - - - - - - - - - - - - - - | Bb1 - - - - - - - A1 - - - - - - -', 'D3 . A3 . D4 . A3 . F3 . A3 . E3 . A3 . | D3 . A3 . Bb3 . A3 . F3 . E3 . D3 . . . | . . . . D5 . . . E5 . F5 . E5 . . . | . . . . A4 . . . Bb4 . A4 . F4 . . .',
  'D4 . D4 F4 A4 . F4 . D4 . D4 F4 E4 . D4 .', 'A5 - Bb5 A5 F5 - E5 - D5 - - - . . . .');
B.SONGS.m2 = missionSong(78, 'E2 - - - - - - - - - - - - - - - | F2 - - - - - - - E2 - - - - - - -', 'B5 . . . . . . . C6 . . . . . . . | . . . . A5 . . . . . . . . . . . | E5 . . . . . F5 . . . . . . . B4 . | . . . . . . . . A4 . . . . . . .',
  'E4 . E4 F4 A4 . B4 . A4 . F4 . E4 . F4 .', 'E6 - F6 E6 C6 - B5 - A5 - - - . . . .');
B.SONGS.m3 = missionSong(88, 'D3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -', 'D4 . F4 . A4 . . . Bb4 . A4 . F4 . . . | E4 . F4 . A4 . D5 . . . . . . . . .',
  'D4 F4 A4 F4 D4 F4 A4 F4 E4 F4 A4 F4 E4 F4 D4 .', 'D6 - - Bb5 A5 - F5 - E5 - F5 - D5 - . .',
  [T_(FUE, 'festival', .045, 'A5 - - - D6 - - - Bb5 - A5 - F5 - - - | . . . . . . . . . . . . . . . . | E5 - - - F5 - - - A5 - - - D5 - - - | . . . . . . . . . . . . . . . .'), T_({ wave: 'drums' }, 'festDrum', .06, 'k . . . c . . . k . k . c . . .')]);
B.STINGS = {
  cut: { bpm: 160, steps: 4, loop: false, tracks: [T_(SHAMI, 's', .16, 'D5 A5 D6 - - - - -'), T_({ wave: 'sine', attack: .2 }, 'sw', .1, 'D4 - - - - - - -')] },
  alert: { bpm: 180, steps: 4, loop: false, tracks: [T_(FUE, 's', .12, 'Bb5 A5 Bb5 A5 D6 - - -'), T_({ wave: 'drums' }, 'd', .2, 'k k k . k . . .')] },
  objective: { bpm: 150, steps: 4, loop: false, tracks: [T_(KOTO, 's', .14, 'A4 D5 E5 A5 - - - -')] },
  newTool: { bpm: 150, steps: 4, loop: false, tracks: [T_(KOTO, 's', .14, 'D5 F5 A5 D6 A5 D6 - -')] },
  gameOver: { bpm: 70, steps: 4, loop: false, tracks: [T_(SHAKU, 's', .14, 'A4 - - - F4 - - - E4 - - - D4 - - - - - - -'), T_(DRONE, 'd', .14, 'D2 - - - - - - - - - - - - - - -')] }
};
/* effects */
const SFX = {
  stepDirt: { wave: 'noise', freq: 600, dur: .04, vol: .05, filter: 'lowpass' }, stepGravel: [{ wave: 'noise', freq: 2400, dur: .05, vol: .08 }, { wave: 'noise', freq: 1200, dur: .03, vol: .05, delay: .02 }],
  stepWood: { wave: 'triangle', freq: 180, to: 120, dur: .05, vol: .09 }, stepTatami: { wave: 'noise', freq: 400, dur: .04, vol: .03, filter: 'lowpass' }, splash: [{ wave: 'noise', freq: 900, to: 300, dur: .22, vol: .12 }, { wave: 'noise', freq: 2400, dur: .08, vol: .06 }],
  grappleThrow: { wave: 'noise', freq: 1800, to: 3600, dur: .18, vol: .08 }, clink: [{ wave: 'square', freq: 2400, dur: .05, vol: .08 }, { wave: 'square', freq: 3200, dur: .04, vol: .05, delay: .03 }], zip: { wave: 'saw', freq: 300, to: 900, dur: .25, vol: .05 },
  shuriken: { wave: 'noise', freq: 4000, to: 2000, dur: .12, vol: .06 }, thunk: { wave: 'triangle', freq: 220, to: 90, dur: .08, vol: .14 },
  clash: [{ wave: 'square', freq: 1600, to: 1200, dur: .12, vol: .12 }, { wave: 'noise', freq: 3000, dur: .08, vol: .1 }], parry: [{ wave: 'sine', freq: 1760, dur: .5, vol: .16 }, { wave: 'sine', freq: 2640, dur: .35, vol: .08 }],
  twang: [{ wave: 'saw', freq: 'D4', to: 'D3', dur: .35, vol: .12 }, { wave: 'saw', freq: 'A4', dur: .25, vol: .06 }], thud: { wave: 'triangle', freq: 110, to: 50, dur: .2, vol: .2 },
  bodyDrop: [{ wave: 'noise', freq: 300, dur: .15, vol: .12, filter: 'lowpass' }, { wave: 'triangle', freq: 90, to: 50, dur: .15, vol: .12 }], dive: { wave: 'noise', freq: 700, to: 200, dur: .3, vol: .1 }, bubble: { wave: 'sine', freq: 700, to: 1400, dur: .06, vol: .05 },
  smoke: { wave: 'noise', freq: 500, to: 200, dur: .5, vol: .12 }, caltrop: [{ wave: 'square', freq: 3000, dur: .02, vol: .06 }, { wave: 'square', freq: 2600, dur: .02, vol: .05, delay: .05 }, { wave: 'square', freq: 3400, dur: .02, vol: .05, delay: .09 }],
  crack: [{ wave: 'noise', freq: 3000, dur: .05, vol: .2 }, { wave: 'noise', freq: 2000, dur: .05, vol: .18, delay: .09 }, { wave: 'noise', freq: 2600, dur: .06, vol: .2, delay: .2 }],
  bell: [{ wave: 'sine', freq: 220, dur: 2.4, vol: .22 }, { wave: 'sine', freq: 563, dur: 1.8, vol: .1 }, { wave: 'sine', freq: 1012, dur: 1.2, vol: .06 }, { wave: 'sine', freq: 1431, dur: .8, vol: .04 }],
  bark: [{ wave: 'noise', freq: 900, dur: .07, vol: .14 }, { wave: 'square', freq: 320, to: 220, dur: .09, vol: .1 }], growl: { wave: 'saw', freq: 90, to: 80, dur: .4, vol: .08, vib: [24, .1] },
  crunch: { wave: 'noise', freq: 1500, dur: .08, vol: .07 }, snore: { wave: 'saw', freq: 70, to: 60, dur: .7, vol: .05, vib: [9, .15] }, heartbeat: [{ wave: 'sine', freq: 60, to: 40, dur: .12, vol: .22 }, { wave: 'sine', freq: 55, to: 38, dur: .1, vol: .16, delay: .16 }],
  uiMove: { wave: 'triangle', freq: 900, dur: .03, vol: .06 }, uiConfirm: { wave: 'pulse12', freq: 'A5', dur: .25, vol: .08 }, uiBack: { wave: 'triangle', freq: 400, to: 300, dur: .06, vol: .06 },
  fusuma: { wave: 'noise', freq: 800, to: 400, dur: .25, vol: .06 }, stamp: [{ wave: 'noise', freq: 200, dur: .2, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 80, to: 40, dur: .25, vol: .3 }],
  whistle: { wave: 'sine', freq: 1800, to: 2400, dur: .3, vol: .1 }, eat: [{ wave: 'noise', freq: 1300, dur: .05, vol: .08 }, { wave: 'noise', freq: 1100, dur: .05, vol: .08, delay: .12 }],
  boom: [{ wave: 'noise', freq: 400, to: 60, dur: .6, vol: .3 }, { wave: 'triangle', freq: 70, to: 30, dur: .5, vol: .25 }], whoosh: { wave: 'noise', freq: 1000, to: 3000, dur: .14, vol: .07 },
  roar: [{ wave: 'saw', freq: 110, to: 70, dur: .9, vol: .14, vib: [18, .12] }, { wave: 'noise', freq: 500, dur: .8, vol: .1 }], shing: { wave: 'saw', freq: 2400, to: 4800, dur: .2, vol: .06 },
  thunder: [{ wave: 'noise', freq: 200, to: 60, dur: 1.6, vol: .25, filter: 'lowpass' }], cough: { wave: 'noise', freq: 900, dur: .12, vol: .07 }, lever: [{ wave: 'square', freq: 200, to: 150, dur: .2, vol: .08 }, { wave: 'noise', freq: 800, dur: .2, vol: .06 }]
};
for (const k in SFX) A.define(k, SFX[k]);
B.sfx = (n, o) => A.sfx(n, o);
/* positional effects: quieter with distance from the hero, silent past 260 */
B.sfxAt = (n, x, y, o = {}) => { const h = B.mission && B.mission.hero; const d = h ? Math.hypot(h.x - x, h.y - y) : 0; if (d > 260) return; A.sfx(n, Object.assign({}, o, { vol: (o.vol || 1) * (1 - d / 300) })); };
/* the mission's music mood: tension and alert layers */
B.music = {
  mood: (lv, fade = .6) => { const t = lv >= 1 ? 1 : 0, a = lv >= 2 ? 1 : 0; if (B.music._t !== t) { A.layer('tension', t, t ? fade : 3); B.music._t = t; } if (B.music._a !== a) { A.layer('alertDrum', a, a ? .3 : 4); A.layer('alertFue', a, a ? .6 : 4); B.music._a = a; } },
  play: (id, o) => { B.music._t = B.music._a = 0; A.music(id ? B.SONGS[id] || id : null, o); }
};

/* ---- the gibberish voice: syllables (consonant + vowel groups) through two band-pass formants ---- */
const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2100] };
B.VOICES = {
  granny: { hz: 205, f: 1.05, rate: 9, jit: .06, wave: 'square' }, sojiro: { hz: 108, f: .9, rate: 10, jit: .03, wave: 'sawtooth' }, kaede: { hz: 265, f: 1.12, rate: 13, jit: .03, wave: 'square' },
  takanori: { hz: 140, f: .95, rate: 10, jit: .03, wave: 'sawtooth' }, kurogane: { hz: 82, f: .85, rate: 8, jit: .03, wave: 'sawtooth' }, gonroku: { hz: 72, f: .8, rate: 7, jit: .04, wave: 'sawtooth' },
  hotaru: { hz: 240, f: 1.1, rate: 14, jit: .03, wave: 'square' }, tobei: { hz: 175, f: 1, rate: 15, jit: .04, wave: 'square' }, ittetsu: { hz: 95, f: .85, rate: 9, jit: .03, wave: 'sawtooth' },
  kanemori: { hz: 150, f: .95, rate: 13, jit: .05, wave: 'sawtooth' }, guard: { hz: 120, f: .9, rate: 11, jit: .03, wave: 'sawtooth' }, maid: { hz: 260, f: 1.1, rate: 12, jit: .03, wave: 'square' },
  disciple: { hz: 160, f: 1, rate: 11, jit: .03, wave: 'sawtooth' }, sakubei: { hz: 130, f: .95, rate: 12, jit: .04, wave: 'sawtooth' }
};
const syllables = text => {
  const out = [], s = String(text).toLowerCase(); let cons = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (FORM[ch]) { while (i + 1 < s.length && FORM[s[i + 1]] && s[i + 1] !== ch) i++; out.push({ c: cons, v: ch }); cons = ''; }
    else if (/[a-z]/.test(ch)) cons = (cons + ch).slice(-2);
    else if (/[.,!?;:-]/.test(ch)) { out.push({ pause: ch === ',' ? .12 : .22, mark: ch }); cons = ''; }
  }
  return out;
};
B.Voice = {
  /* speak text in a profile: { vol, pan, pitch } */
  speak(text, who, o = {}) {
    const c = A.ctx; if (!c || !A.voiceBus || A.muted || HEADLESS) return 0;
    const p = typeof who === 'object' ? who : B.VOICES[who] || B.VOICES.guard, syl = syllables(text), n = syl.filter(q => !q.pause).length || 1;
    const q = /\?\s*$/.test(text), bang = /!\s*$/.test(text), vol = (o.vol === undefined ? 1 : o.vol) * (bang ? .16 : .11), pitch = (o.pitch || 1) * (bang ? 1.2 : 1);
    let t = c.currentTime + .02, k = 0; const dur = 1 / p.rate;
    let out = A.voiceBus;
    if (o.pan !== undefined && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = clamp(o.pan, -1, 1); pn.connect(A.voiceBus); out = pn; }
    for (const s of syl) {
      if (s.pause) { t += s.pause; continue; }
      const u = k / n; k++;
      let hz = p.hz * pitch * (1 - .15 * u) * (1 + (crand() * 2 - 1) * p.jit);
      if (q && k >= n - 1) hz *= 1.25;
      const F = FORM[s.v], g = c.createGain(), osc = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), mixg = c.createGain();
      osc.type = p.wave; osc.frequency.setValueAtTime(hz, t); osc.frequency.linearRampToValueAtTime(hz * .97, t + dur);
      f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0] * p.f; f2.frequency.value = F[1] * p.f; f1.Q.value = 6; f2.Q.value = 8;
      osc.connect(f1); osc.connect(f2); f1.connect(mixg); f2.connect(mixg); mixg.gain.value = 2.2; mixg.connect(g); g.connect(out);
      let t0 = t;
      if (/[ptkbdg]/.test(s.c) || /[sfhz]/.test(s.c)) {   // a consonant: a burst of noise before the vowel
        const fric = /[sfhz]/.test(s.c), nb = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(), nd = fric ? .05 : .02;
        nb.buffer = A._noise; nf.type = fric ? 'highpass' : 'bandpass'; nf.frequency.value = fric ? 3500 : 2200; ng.gain.setValueAtTime(vol * .6, t); ng.gain.exponentialRampToValueAtTime(.0005, t + nd);
        nb.connect(nf); nf.connect(ng); ng.connect(out); nb.start(t); nb.stop(t + nd + .02); t0 = t + nd * .6;
      }
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.setValueAtTime(vol, t0 + dur * .7); g.gain.linearRampToValueAtTime(0, t0 + dur * .7 + .025);
      osc.start(t0); osc.stop(t0 + dur + .05); t = t0 + dur;
    }
    return t - c.currentTime;
  },
  /* a dialog's voice: speaks each page as it opens */
  dialog(talk, who) { if (!talk.open) { talk._vp = -1; return; } if (talk._vp !== talk.i) { talk._vp = talk.i; const pg = talk.pages && talk.pages[talk.i]; if (pg) B.Voice.speak(Array.isArray(pg) ? pg.join(' ') : String(pg), who); } },
  /* a bark in the world: quieter with distance, panned by its place on screen */
  bark(text, who, x, y) {
    const h = B.mission && B.mission.hero; if (!h) return;
    const d = Math.hypot(h.x - x, h.y - y); if (d > 220) return;
    let pan = 0; try { const s = game.r && game.r.w ? game.r.w(x, y, 0) : null; if (s) pan = (s[0] / game.W - .5) * 1.4; } catch (e) { pan = 0; }
    B.Voice.speak(text, who, { vol: 1 - d / 240, pan });
  }
};

/* ---- 20-art ---- */
/* 20-art: the look. Wall types and floors for the level legend, Japanese props as shape data, tool icons and the clan
 * crest as string sprites, the 静斬 kanji as brush strokes, kawara roof caps, and the petal and maple weathers. */
const H = E.hex;
/* wall decorators, baked with each face */
const shoji = f => { if (f.z1 - f.z0 < 20) return; const c = f.tones; for (let z = f.z0 + 6; z < f.z1 - 4; z += 6) f.line(f.u0, z, f.u1, z, c.sh); for (let u = Math.ceil(f.u0 / 5) * 5; u < f.u1; u += 5) f.line(u, f.z0 + 4, u, f.z1 - 6, c.deep); f.quad(f.u0, f.z1 - 6, f.u1, f.z1 - 3, '#3a2a20'); };
const lattice = f => { const z0 = f.z0 + 6, z1 = Math.min(f.z1 - 6, 30); for (let u = Math.ceil(f.u0 / 3) * 3; u < f.u1; u += 3) f.line(u, z0, u, z1, '#2a1a12'); f.quad(f.u0, f.z1 - 8, f.u1, f.z1 - 6, '#3a2a20'); if (f.z1 > 50) { f.quad(f.u0, 32, f.u1, 34, '#3a2a20'); for (let u = Math.ceil(f.u0 / 4) * 4; u < f.u1; u += 4) f.line(u, 38, u, f.z1 - 10, '#c8b890'); } };
const namako = f => { const z0 = f.z0, z1 = f.z0 + 12; f.quad(f.u0, z0, f.u1, z1, '#3a3a40'); for (let u = Math.floor(f.u0 / 4) * 4; u < f.u1; u += 4) { f.line(u, z0, u + 4, z1, '#e8e4dc'); f.line(u + 4, z0, u, z1, '#e8e4dc'); } f.quad(f.u0, f.z1 - 5, f.u1, f.z1 - 3, '#2a2a30'); if ((f.cx + f.cy) % 3 === 0) f.quad(f.u0 + 5, 30, f.u0 + 10, 36, '#2a2a30'); };
const noren = f => { lattice(f); if ((f.cx * 7 + f.cy * 3) % 2) return; f.quad(f.u0 + 2, f.z1 - 18, f.u1 - 2, f.z1 - 7, '#2a3a6a'); f.line(f.u0 + 8, f.z1 - 18, f.u0 + 8, f.z1 - 7, '#1a2240'); f.dot(f.u0 + 5, f.z1 - 12, '#f4ead5'); f.dot(f.u0 + 11, f.z1 - 12, '#f4ead5'); };
const pillars = f => { f.quad(f.u0, f.z0, f.u0 + 3, f.z1, '#c8402a'); f.quad(f.u1 - 3, f.z0, f.u1, f.z1, '#c8402a'); f.quad(f.u0, f.z1 - 6, f.u1, f.z1 - 3, '#8a2a1a'); };
const slits = f => { if ((f.cx + f.cy) % 2) return; if (f.z1 - f.z0 > 30) f.quad(f.u0 + 7, f.z1 - 14, f.u0 + 9, f.z1 - 6, '#1a1418'); };
const bamboo = f => { for (let u = Math.floor(f.u0 / 2.5) * 2.5; u < f.u1; u += 2.5) { f.line(u, f.z0, u, f.z1, '#6a7a3a'); f.dot(u, f.z0 + 5, '#3a4a20'); f.dot(u, f.z0 + 10, '#3a4a20'); } f.line(f.u0, f.z1 - 3, f.u1, f.z1 - 3, '#4a3a20'); };
const keep = f => { if (f.z1 - f.z0 < 40) return; f.quad(f.u0, f.z0, f.u1, Math.min(f.z1, f.z0 + 24), '#6a6a72'); for (let z = f.z0 + 6; z < f.z0 + 24; z += 6) f.line(f.u0, z, f.u1, z, '#4a4a52'); for (let z = f.z0 + 40; z < f.z1 - 8; z += 30) { f.quad(f.u0, z, f.u1, z + 3, '#2a2a34'); if ((f.cx + f.cy) % 2 === 0) f.quad(f.u0 + 6, z + 8, f.u0 + 10, z + 14, '#2a2a30'); } f.quad(f.u0, f.z1 - 4, f.u1, f.z1, '#4a5468'); };
B.WALLS = {
  '#': { id: 1, h: 56, top: '#5a5a62', side: '#6a6a72', face: 'stone', roof: 'slab', cut: true, cutH: 8, decorate: slits, name: 'Castle wall' },
  W: { id: 2, h: 30, top: '#4a5468', side: '#d8d0c0', face: 'plaster', roof: 'tiles', cut: true, cutH: 6, name: 'Compound wall' },
  F: { id: 3, h: 14, top: '#5a6a2a', side: '#7a8a3a', face: 'plank', roof: 'plain', decorate: bamboo, name: 'Bamboo fence' },
  H: { id: 4, h: 40, top: '#3a3028', side: '#4a3428', face: 'timber', roof: 'plain', cut: true, cutH: 6, decorate: shoji, hall: true, name: 'Hall wall' },
  A: { id: 5, h: 40, top: '#4a5468', side: '#c8bca8', face: 'timber', roof: 'tiles', decorate: lattice, name: 'Townhouse' },
  B: { id: 6, h: 64, top: '#4a5468', side: '#b8ac98', face: 'timber', roof: 'tiles', decorate: lattice, balcony: { z: 34, color: '#3a2a1e' }, name: 'Inn' },
  C: { id: 7, h: 48, top: '#3a4458', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: namako, name: 'Storehouse' },
  D: { id: 8, h: 40, top: '#4a5468', side: '#8a6a4a', face: 'timber', roof: 'tiles', decorate: noren, name: 'Shop' },
  S: { id: 9, h: 56, top: '#3a3a44', side: '#a8483a', face: 'plank', roof: 'tiles', decorate: pillars, name: 'Shrine' },
  T: { id: 10, h: 80, top: '#4a3a2a', side: '#7a6048', face: 'plank', roof: 'slab', name: 'Watchtower' },
  G: { id: 11, h: 64, top: '#4a5468', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: keep, name: 'Keep tier 1' },
  K: { id: 12, h: 112, top: '#4a5468', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: keep, name: 'Keep tier 2' },
  M: { id: 13, h: 160, top: '#3a4458', side: '#e8e4dc', face: 'plaster', roof: 'tiles', decorate: keep, name: 'Keep tier 3' },
  P: { id: 14, h: 10, top: '#3e6a3a', side: '#5a4a32', face: 'plank', roof: 'leaves', name: 'Planter' },
  R: { id: 15, h: 20, top: '#6a6a6a', side: '#5a5a5a', face: 'rock', roof: 'speckle', name: 'Rocks' }
};
B.FLOORS = { '.': ['earth', 'Earth'], ',': ['grass', 'Tall grass'], '"': ['bamboo', 'Bamboo grove'], ':': ['gravel', 'Raked gravel'], '=': ['boards', 'Boards'],
  _: ['tatami', 'Tatami'], '+': ['paving', 'Stone paving'], '~': ['deep', 'Deep water'], '-': ['shallow', 'Shallow water'], d: ['door', 'Doorway'] };
B.TYPES = {}; for (const ch in B.WALLS) B.TYPES[B.WALLS[ch].id] = B.WALLS[ch];
B.LEGEND = {}; for (const ch in B.WALLS) B.LEGEND[ch] = B.WALLS[ch].id; for (const ch in B.FLOORS) B.LEGEND[ch] = { floor: B.FLOORS[ch][0] };
const EARTH = { stones: ['#3a3430', '#423a34', '#36302c'].map(H), mortar: H('#2a2422'), hi: H('#4a423a'), lo: H('#2e2826'), speck: H('#4a4038') };
const PAVE = { stones: ['#5a5a60', '#626268', '#56565c'].map(H), mortar: H('#2e2e34'), hi: H('#72727a'), lo: H('#46464c'), speck: H('#4e4e54') };
B.floorTex = (x, y, tag) => {
  if (tag === 'grass' || tag === 'bamboo') return E.tex.grass(x, y, { base: tag === 'bamboo' ? '#2e4a2a' : '#2e4a32', dark: '#1e3422', light: '#4a6a3a' });
  if (tag === 'gravel') { const n = E.noise2(x * .7, y * .7), ring = Math.sin((y + Math.sin(x * .08) * 3) * .9) > .6; const v = 150 + n * 30 - (ring ? 34 : 0); return [v * .92, v * .92, v]; }
  if (tag === 'boards' || tag === 'door') return E.tex.planks(x, y, { base: '#5a4430', dark: '#3a2a1e', light: '#6e5438' });
  if (tag === 'tatami') { const bx = x % 32, by = y % 16, edge = bx < 1.5 || by < 1.5; if (edge) return [40, 30, 24]; const w = (Math.floor(y) % 2) ? 8 : 0; return [128 + w, 120 + w, 60]; }
  if (tag === 'deep') return E.tex.water(x, y, { deep: '#162c48', base: '#1e3a5a', light: '#4a7aa0' });
  if (tag === 'shallow') return E.tex.water(x, y, { deep: '#2a4a60', base: '#3a5a6a', light: '#6a9ab0' });
  if (tag === 'paving') return E.tex.flagstone(x, y, PAVE);
  return E.tex.dirt(x, y, { base: '#3a3430', dark: '#2a2420', light: '#4a4038' });
};
void EARTH;

/* ---- props as shape data (feet on the point, front south) ---- */
Object.assign(E.MATERIALS, { lacquer: { color: '#1a1214', pattern: 'glaze' }, lacquerRed: { color: '#8a1c1c', pattern: 'glaze' }, paperGlow: { color: '#ffd08a', glow: 1 },
  bronzeB: { color: '#7a5a2a', pattern: 'metal' }, vermilion: { color: '#c8402a' }, strawB: { color: '#b8a060', pattern: 'thatch' }, bambooG: { color: '#6a8a3a', pattern: 'planks', dir: 'v' } });
Object.assign(E.SHAPES, {
  stoneLantern: { about: 'stone lantern (ishidoro)', mats: { s: 'granite', g: 'paperGlow' }, lights: [[0, 0, 22, '#ffb060', 46]],
    parts: [['lathe', 's', [0, 0, 0], [[0, 0], [5, 0], [4, 2], [2, 3], [2, 14], [5, 15], [5, 17], [0, 17]]], ['box', 'g', [0, 0, 17], [6, 6, 6]], ['cyl', 's', [0, 0, 23], 7, 4, { r2: 0, seg: 6 }], ['ball', 's', [0, 0, 28], 1.5]] },
  chochin: { about: 'paper lantern on a post', mats: { w: 'walnut', g: 'paperGlow' }, lights: [[0, 0, 26, '#ffa050', 50]],
    parts: [['cyl', 'w', [0, 0, 0], 1, 22], ['ball', 'g', [0, 0, 26], 4, { sz: 1.3 }], ['cyl', 'w', [0, 0, 30], 2.5, 1.5]] },
  torii: { about: 'vermilion torii gate', mats: { v: 'vermilion', b: 'lacquer' },
    parts: [['mirror', 'x', ['cyl', 'v', [11, 0, 0], 1.6, 34]], ['box', 'v', [0, 0, 27], [26, 2, 2.5]], ['box', 'b', [0, 0, 34], [32, 3, 2.5]], ['box', 'v', [0, 0, 31], [2, 2, 3]]] },
  bambooClump: { about: 'bamboo stalks', mats: { b: 'bambooG', l: 'leaves' },
    parts: [['cyl', 'b', [-3, 0, 0], 1, 46], ['cyl', 'b', [2, -2, 0], 1, 52], ['cyl', 'b', [1, 3, 0], .9, 40], ['ball', 'l', [-2, 0, 46], 5, { sz: .5 }], ['ball', 'l', [2, -2, 52], 6, { sz: .5 }], ['ball', 'l', [1, 3, 41], 4, { sz: .5 }]] },
  sakeBarrel: { about: 'straw-wrapped sake barrel', mats: { s: 'strawB', r: 'lacquerRed' },
    parts: [['cyl', 's', [0, 0, 0], 6, 11], ['cyl', 'r', [0, 0, 4], 6.2, 3], ['cyl', 'lacquer', [0, 0, 11], 5.5, 1]] },
  riceBale: { about: 'rice bale (tawara)', mats: {}, parts: [['group', [0, 0, 5], [0, 90, 0], [['cyl', 'strawB', [0, 0, -7], 5, 14], ['cyl', 'lacquerRed', [0, 0, -2], 5.2, 1], ['cyl', 'lacquerRed', [0, 0, 3], 5.2, 1]]]] },
  jubako: { about: 'stack of lacquer lunchboxes', mats: { b: 'lacquer', r: 'lacquerRed', g: 'gold' },
    parts: [['box', 'b', [0, 0, 0], [10, 10, 4]], ['box', 'r', [0, 0, 4], [10, 10, 4]], ['box', 'b', [0, 0, 8], [10, 10, 3]], ['box', 'g', [0, 5, 5], [3, 1, 2]]] },
  yatai: { about: 'noodle stall', mats: { w: 'walnut', c: 'linen', r: 'lacquerRed', g: 'paperGlow' }, lights: [[0, 6, 20, '#ffb060', 54]],
    parts: [['box', 'w', [0, 0, 0], [26, 14, 12]], ['mirror', 'x', ['box', 'w', [12, -6, 12], [2, 2, 20]]], ['box', 'r', [0, 0, 32], [30, 18, 2]], ['box', 'c', [0, 8, 24], [24, 1, 8]], ['ball', 'g', [10, 8, 21], 2.5]] },
  weaponRack: { about: 'spear rack', mats: { w: 'walnut', m: 'steel' },
    parts: [['mirror', 'x', ['box', 'w', [8, 0, 0], [2, 3, 20]]], ['box', 'w', [0, 0, 14], [18, 2, 2]], ['row', 4, [4, 0, 0], ['cyl', 'w', [0, 1, 0], .5, 30]], ['row', 4, [4, 0, 0], ['cyl', 'm', [0, 1, 30], .8, 3, { r2: 0 }]]] },
  mato: { about: 'archery target', mats: {}, parts: [['mirror', 'x', ['box', 'oak', [5, 0, 0], [1.5, 1.5, 14]]], ['group', [0, 0, 12], [90, 0, 0], [['cyl', 'linen', [0, 0, -1], 7, 2], ['cyl', 'lacquerRed', [0, 0, -1.2], 4.5, 2.4], ['cyl', 'linen', [0, 0, -1.4], 2.5, 2.8]]]] },
  taiko: { about: 'taiko drum on a stand', mats: { w: 'walnut', d: 'lacquerRed', s: 'linen' },
    parts: [['mirror', 'x', ['box', 'w', [6, 0, 0], [2, 6, 10]]], ['group', [0, 0, 14], [90, 0, 0], [['lathe', 'd', [0, 0, -5], [[0, 0], [7, 0], [8, 5], [7, 10], [0, 10]]]]]] },
  hansho: { about: 'alarm bell on a frame', mats: { w: 'walnut', b: 'bronzeB', r: 'slate' },
    parts: [['mirror', 'x', ['box', 'w', [8, 0, 0], [2, 2, 34]]], ['box', 'r', [0, 0, 34], [22, 6, 3]], ['lathe', 'b', [0, 0, 16], [[0, 0], [5, 0], [4.5, 4], [4, 12], [1, 14], [0, 14]]]] },
  well: { about: 'stone well with a pulley', mats: { s: 'granite', w: 'walnut' },
    parts: [['lathe', 's', [0, 0, 0], [[7, 0], [7.5, 10], [5.5, 10], [5.5, 2], [0, 2]]], ['mirror', 'x', ['box', 'w', [7, 0, 0], [1.5, 1.5, 22]]], ['box', 'w', [0, 0, 22], [17, 2, 2]]] },
  waterBarrel: { about: 'water barrel', mats: { w: 'oak', h: 'iron' }, parts: [['cyl', 'w', [0, 0, 0], 5, 11], ['row', 2, [0, 0, 6], ['cyl', 'h', [0, 0, 2], 5.3, 1]]] },
  boat: { about: 'small moored boat', mats: {}, parts: [['box', 'walnut', [0, 0, 0], [40, 12, 4]], ['wedge', 'walnut', [22, 0, 0], [6, 12, 6]], ['box', 'oak', [0, 0, 4], [30, 9, 1]], ['cyl', 'walnut', [-14, 0, 4], .6, 16]] },
  bargeRice: { about: 'rice barge loaded with bales', mats: { w: 'walnut', s: 'strawB' }, parts: [['box', 'w', [0, 0, 0], [34, 14, 5]], ['row', 3, [9, 0, 0], ['cyl', 's', [0, 0, 5], 4, 7]]] },
  moorPost: { about: 'mooring post with rope', mats: { w: 'walnut', r: 'strawB' }, parts: [['cyl', 'w', [0, 0, 0], 2.2, 14], ['cyl', 'r', [0, 0, 9], 2.6, 2]] },
  cage: { about: 'bamboo cage', mats: { b: 'bambooG', w: 'walnut' }, parts: [['box', 'w', [0, 0, 0], [20, 20, 2]], ['box', 'w', [0, 0, 26], [20, 20, 2]], ['ring', 10, 9, ['cyl', 'b', [0, 0, 2], .7, 24]]] },
  lever: { about: 'iron lever on a post', mats: { w: 'walnut', m: 'iron' }, parts: [['box', 'w', [0, 0, 0], [5, 5, 14]], ['box', 'm', [0, 2, 12], [1.2, 1.2, 10], { rot: [30, 0, 0] }]] },
  nobori: { about: 'nobori banner pole', mats: { w: 'walnut', c: 'lacquerRed' }, parts: [['cyl', 'w', [0, 0, 0], .8, 44], ['box', 'c', [3, 0, 18], [6, .6, 24]]] },
  shachihoko: { about: 'golden shachihoko', mats: { g: 'gold' }, parts: [['ball', 'g', [0, 0, 4], 3, { sz: 1.4 }], ['cyl', 'g', [0, -2, 7], 1.5, 5, { r2: 2.5 }]] },
  dummy: { about: 'straw practice dummy', mats: { s: 'strawB', w: 'walnut' }, parts: [['cyl', 'w', [0, 0, 0], 1.2, 26], ['cyl', 's', [0, 0, 10], 4, 12], ['ball', 's', [0, 0, 26], 3.5], ['box', 'w', [0, 0, 18], [14, 1.5, 1.5]]] },
  steppingStone: { about: 'stepping stone', mats: { s: 'granite' }, parts: [['cyl', 's', [0, 0, 0], 5, 1.5, { sq: .7 }]] },
  strawMat: { about: 'straw mat', mats: { s: 'strawB' }, parts: [['box', 's', [0, 0, 0], [16, 10, .6]]] },
  persimmon: { about: 'persimmon tree', mats: { b: 'bark', l: 'leaves', f: 'lacquerRed' }, parts: [['cyl', 'b', [0, 0, 0], 2, 30, { r2: 1.2 }], ['ball', 'l', [0, 0, 38], 13, { sz: .7 }], ['ball', 'f', [5, 6, 34], 1.3], ['ball', 'f', [-6, 3, 38], 1.3], ['ball', 'f', [2, -6, 40], 1.3]] }
});
/* trees recolored: cherry and maple */
B.treeTint = { cherry: '#e8a0b8', maple: '#c8402a', pine: '#2a4a32' };

/* ---- string sprites: tool icons (16x16), the crest, small marks ---- */
const SP = (rows, pal) => E.sprite(rows, pal);
B.ICON = {
  riceball: SP(['......kk......', '.....kwwk.....', '....kwwwwk....', '...kwwwwwwk...', '..kwwwwwwwwk..', '..kwwwwwwwwk..', '.kwwwwwwwwwwk.', '.kwwwkkkkwwwk.', 'kwwwkggggkwwwk', 'kwwkggggggkwwk', 'kwwkggggggkwwk', '.kkkkkkkkkkkk.'], { k: '#1a1418', w: '#f4f0e4', g: '#2a4a2a' }),
  poison: SP(['......kk......', '.....kppk.....', '....kpwppk....', '...kppwpppk...', '..kppppppppk..', '..kppppwpppk..', '.kpppppppppk..', '.kppkkkkkpppk.', 'kpppkggggkpppk', 'kppkgsssgkkppk', 'kppkggggggkppk', '.kkkkkkkkkkkk.'], { k: '#1a1418', p: '#b8a0c8', w: '#e8e0f0', g: '#2a4a2a', s: '#5a2a6a' }),
  dango: SP(['.....kk.......', '....kppk......', '....kppk......', '.....kk.......', '....kwwk......', '....kwwk......', '.....kk.......', '....kggk......', '....kggk......', '.....kk.......', '......w.......', '......w.......'], { k: '#1a1418', p: '#f0a0b8', w: '#f4f0e4', g: '#8ac86a' }),
  plum: SP(['.......g......', '......gg......', '....kkkkk.....', '...krrrrrk....', '..krrwrrrrk...', '..krwrrrrrk...', '..krrrrrrrk...', '..krrrrrrrk...', '...krrrrrk....', '....kkkkk.....'], { k: '#2a0a10', r: '#c8302a', w: '#f0a090', g: '#4a8a3a' }),
  shuriken: SP(['......k.......', '.....kmk......', '.....kmk......', '.kk..kmk..kk..', '.kmmkkkkkmmk..', '..kmmkhkmmk...', '...kkhhhkk....', '..kmmkhkmmk...', '.kmmkkkkkmmk..', '.kk..kmk..kk..', '.....kmk......', '......k.......'], { k: '#1a1418', m: '#a8b0c0', h: '#e8ecf4' }),
  smoke: SP(['.....yy.......', '......y.......', '....kkkk......', '...kssssk.....', '..kssssssk....', '..kssssssk....', '..kssssssk....', '...kssssk.....', '....kkkk......'], { k: '#1a1418', s: '#5a5a62', y: '#e8b04a' }),
  caltrops: SP(['..............', '...k.....k....', '...mk...km....', '....mk.km.....', '.....mkm......', '....kmmmk.....', '...km.k.mk....', '..mk..k..km...', '......k.......'], { k: '#1a1418', m: '#a8b0c0' }),
  firecracker: SP(['........y.....', '.......y......', '......k.......', '.....krrk.....', '.....krrk.....', '.....krgk.....', '.....krrk.....', '.....krgk.....', '.....krrk.....', '.....kkkk.....'], { k: '#1a1418', r: '#d8402a', g: '#e8b04a', y: '#ffe080' }),
  firepot: SP(['......yy......', '.....yk.......', '....kkkk......', '...kbbbbk.....', '..kbbbbbbk....', '..kbbrbbbk....', '..kbbbbbbk....', '...kbbbbk.....', '....kkkk......'], { k: '#1a1418', b: '#5a4030', r: '#d8402a', y: '#ffa040' }),
  cloak: SP(['.....kkk......', '....kyyyk.....', '...kyyyyyk....', '...kyhyhyk....', '..kyyyyyyyk...', '..kyhyhyhyk...', '.kyyyyyyyyyk..', '.kyhyhyhyhyk..', 'kyyyyyyyyyyyk.', 'kkkkkkkkkkkkk.'], { k: '#2a2010', y: '#b8a060', h: '#8a7440' }),
  scroll: SP(['.kkkkkkkkkk.', 'kbppppppppbk', 'kbpkkkkkkpbk', 'kbppppppppbk', 'kbpkkkkkppbk', 'kbppppppppbk', '.kkkkkkkkkk.'], { k: '#1a1418', b: '#8a1c1c', p: '#f4ead5' }),
  coin: SP(['.kkkk.', 'kyyyyk', 'kyk.yk', 'kyyyyk', '.kkkk.'], { k: '#5a3a10', y: '#e8b04a' })
};
B.CREST = SP(['....kkkkkk....', '..kk......kk..', '.k..kkkkkk..k.', '.k..krrrrk..k.', 'k...krrrrk...k', 'k...kkkkkk...k', 'k...kbbbbk...k', 'k...kbbbbk...k', '.k..kkkkkk..k.', '.k..........k.', '..kk......kk..', '....kkkkkk....'], { k: '#e8b04a', r: '#d8402a', b: '#1a1214' });
/* ---- the kanji 静 (silent) and 斬 (cut) as brush strokes on a 32 grid ---- */
B.KANJI = {
  sei: [[[2, 3], [13, 3]], [[3, 7], [12, 7]], [[1, 11], [14, 11]], [[7.5, 1], [7.5, 11]], [[4, 14], [4, 27], [2, 30]], [[4, 14], [12, 14], [12, 28], [10, 30]], [[4, 19], [12, 19]], [[4, 23], [12, 23]],
    [[22, 1], [18, 8]], [[20, 5], [27, 5], [24, 10]], [[17, 12], [30, 12]], [[28, 12], [28, 22]], [[18, 17], [28, 17]], [[18, 22], [29, 22]], [[23, 8], [23, 29], [20, 30]]],
  zan: [[[2, 3], [13, 3]], [[3, 8], [12, 8]], [[3, 8], [3, 17]], [[12, 8], [12, 17]], [[3, 12.5], [12, 12.5]], [[3, 17], [12, 17]], [[1, 22], [14, 22]], [[7.5, 1], [7.5, 31]],
    [[29, 2], [19, 6]], [[19, 6], [19, 20], [16, 30]], [[19, 14], [31, 14]], [[26, 14], [26, 31]]]
};
B.drawKanji = (g, id, x, y, s, color, edge) => {
  for (const pass of [0, 1]) for (const st of B.KANJI[id]) for (let i = 0; i < st.length - 1; i++) {
    const [a0, b0] = st[i], [a1, b1] = st[i + 1], w = Math.max(1, Math.round(s * 2.6)) + (pass ? 0 : 2);
    px.line(g, Math.round(x + a0 * s), Math.round(y + b0 * s), Math.round(x + a1 * s), Math.round(y + b1 * s), pass ? color : edge, w);
    if (i === 0) px.disc(g, x + a0 * s, y + b0 * s, w * .6, pass ? color : edge);
  }
};
/* the weathers of falling petals and maple leaves (cosmetic) */
E.WEATHER.petals = Object.assign({}, E.WEATHER.leaves, { colors: ['#f0b8c8', '#e8a0b8', '#f8d0dc', '#d888a0'], n: 40, fall: 18, sway: 30, size: 1.5 });
E.WEATHER.maple = Object.assign({}, E.WEATHER.leaves, { colors: ['#c8402a', '#e05a2a', '#a8301a', '#e8803a'], n: 48 });
E.style.propSize = 1.4;

/* ---- 21-rigs ---- */
/* 21-rigs: the cast as Humanoid rigs (with the patched masks, hats and weapons), faction colors, and the Hound, a
 * quadruped of its own drawn through the view's projection. */
const HU = o => new E.Humanoid(o);
B.FACTION = { kanemori: '#8a6a2a', redlantern: '#8a2a2a', kokaku: '#2a3a6a', trial: '#3a5a3a' };
B.RIGS = {
  sojiro: () => HU({ size: 1.25, build: 'heroic', hood: true, mask: { color: '#232a44' }, outfit: 'coat', sleeves: 'long', weapon: 'sword', bladeLen: 8, cape: { len: 4, width: 3, seg: 2 },
    colors: { hair: '#232a44', cloth: '#2a3050', coat: '#2a3050', pants: '#1e2236', belt: '#b0302a', boot: '#2a2a2e', glove: '#2a2a2e', cape: '#b0302a', capeIn: '#6a1a18', metal: '#d8dce8', trim: '#b0302a' } }),
  kaede: () => HU({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#2a1a2a' }, outfit: 'tunic', sleeves: 'long', weapon: 'sword', bladeLen: 5.5, offhand: { len: 5.5 }, cape: { len: 3, width: 2, seg: 2 },
    colors: { hair: '#18141c', cloth: '#4a2a44', pants: '#2a1a28', belt: '#2a8a8a', boot: '#1e1a1e', glove: '#2a1e2a', cape: '#2a8a8a', capeIn: '#1a5a5a', metal: '#e0e4ec', trim: '#2a8a8a' } }),
  granny: () => HU({ size: 1.0, build: 'chibi', hunch: .35, outfit: 'robe', hair: 'ponytail', weapon: 'staff', colors: { hair: '#b8b0a8', cloth: '#5a4030', pants: '#4a3426', trim: '#e8dcc0', staff: '#c8a878', orb: '#e8dcc0', skin: '#e0c0a0' } }),
  takanori: () => HU({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'ponytail', weapon: null, colors: { hair: '#1a1418', cloth: '#2a3a6a', pants: '#1e2a4a', trim: '#e8b04a', belt: '#e8b04a' } }),
  kurogane: () => HU({ size: 1.8, build: 'bulky', armor: true, hat: { style: 'kabuto', color: '#2a2a30', crest: '#c8a040' }, weapon: 'sword', bladeLen: 14, colors: { cloth: '#2a2a30', pants: '#1e1e24', plate: '#2a2a30', belt: '#8a1c1c', trim: '#8a1c1c', metal: '#d8dce8' } }),
  kuroganeRobe: () => HU({ size: 1.3, build: 'bulky', outfit: 'robe', hair: 'short', weapon: null, colors: { hair: '#3a3a40', cloth: '#5a5a62', pants: '#4a4a52', trim: '#2a2a30' } }),
  kuroganeOni: () => HU({ size: 2.1, build: 'bulky', armor: true, mask: { style: 'oni', color: '#b0201a' }, eyeGlow: '#ff5a2a', weapon: 'sword', bladeLen: 15, hair: 'spiky', colors: { hair: '#1a1418', cloth: '#2a1a1a', pants: '#1e1214', plate: '#3a1a1a', belt: '#d8402a', metal: '#ff9a6a' } }),
  kanemori: () => HU({ size: 1.25, build: 'bulky', outfit: 'robe', hat: { style: 'band', color: '#2a1a10' }, weapon: null, colors: { cloth: '#6a4a2a', pants: '#4a3420', trim: '#e8b04a', belt: '#e8b04a' } }),
  gonroku: () => HU({ size: 1.9, build: 'bulky', hair: 'spiky', sleeves: 'none', weapon: 'club', bladeLen: 13, colors: { hair: '#2a1a10', cloth: '#6a4a2a', pants: '#4a3420', belt: '#2a1a10', metal: '#3a3a40', skin: '#c89070' } }),
  hotaru: () => HU({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#1a1018' }, weapon: 'sword', bladeLen: 5, offhand: { len: 5 }, outfit: 'tunic', sleeves: 'long', cape: { len: 4, width: 2.5, seg: 2 },
    colors: { hair: '#2a0a10', cloth: '#8a1a2a', pants: '#3a0a14', belt: '#1a1018', cape: '#1a1018', capeIn: '#8a1a2a', metal: '#e8c8c8', trim: '#ff6a4a' } }),
  tobei: () => HU({ size: 1.1, outfit: 'tunic', hat: { style: 'band', color: '#3a6a3a' }, weapon: null, cape: { len: 3, width: 4, seg: 1.6 }, colors: { cloth: '#6a5a3a', pants: '#3a4a2a', cape: '#3a6a3a', capeIn: '#2a4a2a' } }),
  ittetsu: () => HU({ size: 1.4, build: 'bulky', hair: 'bald', outfit: 'robe', weapon: 'sword', bladeLen: 10, colors: { cloth: '#6a5a4a', pants: '#4a3a2a', metal: '#8a6a4a', hilt: '#5a3a2a' } }),
  disciple: c => HU({ size: 1.15, build: 'heroic', hood: true, mask: { color: '#1a1a20' }, outfit: 'tunic', weapon: null, colors: { hair: c, cloth: c, pants: '#2a2a30' } }),
  ashigaru: f => HU({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#2a2a2e' }, armor: true, weapon: 'spear', colors: { cloth: B.FACTION[f] || '#8a6a2a', pants: '#3a3028', plate: '#4a4a50', metal: '#c8ccd4' } }),
  samurai: f => HU({ size: 1.25, build: 'heroic', hat: { style: 'kabuto', color: '#2a2a32' }, armor: true, sashimono: B.FACTION[f] || '#8a6a2a', weapon: 'sword', bladeLen: 10, colors: { cloth: B.FACTION[f] || '#8a6a2a', pants: '#2a2a30', plate: '#3a3a44', metal: '#dce0e8' } }),
  archer: f => HU({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#2a2a2e' }, armor: true, weapon: 'bow', colors: { cloth: B.FACTION[f] || '#8a6a2a', pants: '#3a3028', plate: '#4a4a50' } }),
  ninja: () => HU({ size: 1.2, build: 'heroic', hood: true, mask: { color: '#1a1418' }, outfit: 'tunic', sleeves: 'long', weapon: 'sword', bladeLen: 6, colors: { hair: '#6a1a1a', cloth: '#1a1418', pants: '#1a1418', belt: '#c8302a', boot: '#1a1418', glove: '#1a1418', metal: '#c8ccd4' } }),
  civilian: kind => {
    const C = { merchant: { cloth: '#5a6a4a', hat: { style: 'band', color: '#3a2a1a' } }, maid: { cloth: '#c85a7a', hair: 'ponytail' }, monk: { cloth: '#d8902a', hair: 'bald' }, drunk: { cloth: '#7a5a4a', skin: '#e8a090' },
      noble: { cloth: '#6a2a8a', hair: 'ponytail' }, servant: { cloth: '#6a6a6a' }, clerk: { cloth: '#4a5a6a', hat: { style: 'band', color: '#2a2a2a' } } }[kind] || { cloth: '#6a6a6a' };
    return HU({ size: 1.1, outfit: 'robe', weapon: null, hair: C.hair || 'short', hat: C.hat || null, colors: { cloth: C.cloth, pants: E.shade(C.cloth, -.3), skin: C.skin || '#e8c09a', hair: '#1a1418', trim: '#e8dcc0' } });
  },
  ghost: color => HU({ size: 1.2, build: 'heroic', hood: true, mask: { color: '#101018' }, outfit: 'tunic', weapon: 'sword', bladeLen: 6, cape: { len: 4, width: 2.5, seg: 2 }, colors: { hair: '#101018', cloth: '#181820', pants: '#101018', cape: color, capeIn: E.shade(color, -.4), belt: color } })
};

/* ---- the Hound: an Akita on four two-segment legs, a curled tail, states walk, run, sniff, bark, eat, down ---- */
class Hound {
  constructor() { this.t = crand() * 10; this.phase = 0; this.facing = 0; this.x = this.y = this.z = 0; this.speed = 0; this.head = 0; this.mouth = 0; this.down = 0; this.hurtW = 0; }
  update(dt, s) {
    this.t += dt; Object.assign(this, { x: s.x, y: s.y, z: s.z || 0, facing: s.facing });
    const sp = Math.hypot(s.vx || 0, s.vy || 0); this.speed = sp; this.phase += dt * (sp > 70 ? 13 : 8) * Math.min(1, sp / 30 + .05);
    this.head = approach(this.head, s.sniff || s.eat ? -1 : s.bark ? .6 : 0, dt * 5); this.mouth = s.bark ? (Math.sin(this.t * 22) > 0 ? 1 : 0) : s.eat ? (Math.sin(this.t * 10) > 0 ? .6 : 0) : 0;
    this.down = approach(this.down, s.down ? 1 : 0, dt * 3); this.hurtW = approach(this.hurtW, s.hurt ? 1 : 0, dt * 8);
  }
  draw(g, ox, oy, view) {
    const ca = Math.cos(this.facing), sa = Math.sin(this.facing), k = 1.15, sc = view.scale || 1;
    const P = (f, r, z) => { const wx = (f * ca - r * sa) * k, wy = (f * sa + r * ca) * k, q = view.p(wx, wy, z * k); return [ox + q[0], oy + q[1], (view.dx || 0) * wx + (view.dy || 0) * wy + (view.dz || 0) * z * k]; };
    const dn = this.down, run = this.speed > 70, sw = Math.sin(this.phase), lift = dn * 0;
    const bodyZ = 11 - dn * 7, tan = '#c88a4a', cream = '#f0e0c0', dark = '#7a4a2a', T = E.tones(tan);
    const parts = [];
    const leg = (f, r, ph) => { const s = Math.sin(this.phase + ph) * (run ? 4 : 2.5) * (1 - dn); const hip = P(f, r, bodyZ - 1), knee = P(f + s * .5, r, bodyZ - 6), foot = P(f + s, r, dn ? bodyZ - 3 : Math.max(0, (Math.cos(this.phase + ph) > 0 ? 1.2 : 0))); parts.push({ d: hip[2] - .2, f: () => { px.line(g, hip[0], hip[1], knee[0], knee[1], r < 0 ? E.shade(tan, -.25) : tan, Math.max(1, Math.round(sc * 1.3))); px.line(g, knee[0], knee[1], foot[0], foot[1], cream, Math.max(1, Math.round(sc))); } }); };
    leg(6, -2.2, 0); leg(6, 2.2, Math.PI); leg(-6, -2.2, Math.PI); leg(-6, 2.2, 0);
    const b0 = P(-7, 0, bodyZ + sw * .3), b1 = P(7, 0, bodyZ + 1 + sw * .3), chest = P(6, 0, bodyZ - 1), neck = P(9, 0, bodyZ + 3 + this.head * 2), hd = P(11.5, 0, bodyZ + 5 + this.head * 5), snout = P(15, 0, bodyZ + 3.5 + this.head * 5.5);
    parts.push({ d: (b0[2] + b1[2]) / 2, f: () => {
      const w = Math.max(2, Math.round(sc * 4.2)); px.line(g, b0[0], b0[1], b1[0], b1[1], T.sh, w + 1); px.line(g, b0[0], b0[1] - 1, b1[0], b1[1] - 1, T.base, w - 1); px.line(g, chest[0], chest[1] + 1, b1[0], b1[1] + 1, cream, Math.max(1, w - 2));
      const tl = P(-8, 0, bodyZ + 3), tt = P(-6, 0, bodyZ + 7); px.disc(g, tl[0], tl[1], Math.max(1, sc * 1.6), cream); px.disc(g, tt[0], tt[1], Math.max(1, sc * 1.8), T.base);
    } });
    parts.push({ d: hd[2] + .1, f: () => {
      px.line(g, neck[0], neck[1], hd[0], hd[1], T.base, Math.max(2, Math.round(sc * 3))); px.disc(g, hd[0], hd[1], Math.max(1.5, sc * 3), T.base); px.line(g, hd[0], hd[1], snout[0], snout[1], cream, Math.max(1, Math.round(sc * 2)));
      for (const s of [-1, 1]) { const e1 = P(11, s * 1.6, bodyZ + 9 + this.head * 5); px.line(g, e1[0], e1[1], e1[0], e1[1] - Math.max(1, sc * 1.5), dark, Math.max(1, Math.round(sc))); }
      const eye = P(13, 1.2, bodyZ + 6.2 + this.head * 5); px.dot(g, eye[0], eye[1], '#1a1010'); px.dot(g, snout[0], snout[1], '#1a1010');
      if (this.mouth > .5) { const m = P(14.5, 0, bodyZ + 2.2 + this.head * 5.5); px.dot(g, m[0], m[1], '#8a2a2a'); }
    } });
    parts.sort((a, b) => a.d - b.d); for (const p of parts) p.f(); void lift;
  }
}
B.Hound = Hound;

/* ---- 30-world ---- */
/* 30-world: a level (the JSON the campaign and the Workshop share) becomes a World: the physics TileMap (the hero swims
 * in its water), the navigation TileMap (water blocked for walkers), a baked light map, hide spots, grapple anchors,
 * halls with roof caps, lit props and lights, zones. Queries: lightAt, isHide, isDeep, anchorsNear, zoneAt. */
const AMBIENT = { dusk: .45, night: .22, rain: .18, festival: .3 };
const SOLID_CH = new Set(Object.keys(B.WALLS));
class World {
  constructor(spec) {
    this.spec = spec; this.rows = spec.rows.map(r => r.padEnd(spec.size[0], '.').slice(0, spec.size[0]));
    while (this.rows.length < spec.size[1]) this.rows.push('.'.repeat(spec.size[0]));
    this.w = spec.size[0]; this.h = spec.size[1]; this.T = CELL;
    const mk = (o = {}) => new E.TileMap(Object.assign({ rows: this.rows.slice(), legend: B.LEGEND, types: B.TYPES }, o));
    this.map = mk({ floorTex: B.floorTex, ao: 5, outside: '#0c0a10' });
    this.nav = mk({ block: ['deep'], floorTex: () => [0, 0, 0] });
    this.props = []; this.dynLights = [];
    this.lights = (spec.lights || []).map(l => ({ x: cc(l.at[0]), y: cc(l.at[1]), z: l.z || 18, r: (l.r || 64), i: l.i === undefined ? .9 : l.i, color: l.color || '#ffb060', kind: l.kind || null, flick: crand() * 10 }));
    for (const l of this.lights) if (l.kind) this.props.push({ id: l.kind, x: l.x, y: l.y, o: {} });
    for (const p of spec.props || []) { const [id, cx, cy, o = {}] = p; this.props.push({ id, x: cc(cx), y: cc(cy), o }); }
    for (const p of this.props) { const sp = E.SHAPES[p.id]; if (!sp || p.o.solid === false || ['strawMat', 'steppingStone'].includes(p.id)) continue; try { this.map.solid(p.id, p.x, p.y, 0, { facing: p.o.facing || 0 }); this.nav.solid(p.id, p.x, p.y, 0, { facing: p.o.facing || 0 }); this.nav.block(Math.floor(p.x / CELL), Math.floor(p.y / CELL), true); } catch (e) { /* a shape the map can't make solid stays decoration */ } }
    // bamboo groves get stalks scattered by cell (seeded), grass tufts in tall grass
    this.decor = []; const sr = E.rng(hashStr(spec.id || 'lvl'));
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.rows[cy][cx];
      if (ch === '"' && sr() < .45) this.decor.push({ k: 'bamboo', x: (cx + .2 + sr() * .6) * CELL, y: (cy + .2 + sr() * .6) * CELL });
      if (ch === ',' && sr() < .7) this.decor.push({ k: 'grass', x: (cx + .2 + sr() * .6) * CELL, y: (cy + .2 + sr() * .6) * CELL });
    }
    this.ambient = AMBIENT[spec.time] !== undefined ? AMBIENT[spec.time] : .22;
    this.zones = (spec.zones || []).map(z => Object.assign({}, z));
    this._components(); this.bake();
  }
  ch(cx, cy) { return cx < 0 || cy < 0 || cx >= this.w || cy >= this.h ? '#' : this.rows[cy][cx]; }
  /* connected building blocks (roof caps) and halls (H perimeters with their interiors) */
  _components() {
    const seen = new Uint8Array(this.w * this.h); this.blocks = []; this.halls = [];
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const ch = this.ch(cx, cy), i = cy * this.w + cx; if (seen[i] || !'ABCDSTGKM'.includes(ch)) continue;
      let x0 = cx, y0 = cy, x1 = cx, y1 = cy; const st = [[cx, cy]]; seen[i] = 1;
      while (st.length) { const [x, y] = st.pop(); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const j = ny * this.w + nx; if (!seen[j] && this.ch(nx, ny) === ch) { seen[j] = 1; st.push([nx, ny]); } } }
      this.blocks.push({ ch, x0, y0, x1, y1, h: B.WALLS[ch].h });
    }
    seen.fill(0);
    for (let cy = 0; cy < this.h; cy++) for (let cx = 0; cx < this.w; cx++) {
      const i = cy * this.w + cx; if (seen[i] || !(this.ch(cx, cy) === 'H' || this.ch(cx, cy) === 'd')) continue;
      let x0 = cx, y0 = cy, x1 = cx, y1 = cy; const st = [[cx, cy]]; seen[i] = 1;
      while (st.length) { const [x, y] = st.pop(); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const j = ny * this.w + nx, c2 = this.ch(nx, ny); if (!seen[j] && (c2 === 'H' || c2 === 'd')) { seen[j] = 1; st.push([nx, ny]); } } }
      if (x1 - x0 >= 2 && y1 - y0 >= 2) this.halls.push({ x0, y0, x1, y1, fade: 1 });
    }
  }
  /* the light map: half cells (8 units) of ambient moon + every light with its line of sight */
  bake() {
    const S = 8, W = Math.ceil(this.w * CELL / S), Hh = Math.ceil(this.h * CELL / S), amb = this.ambient, lr = B.T('lanternRadius');
    this.lmW = W; this.lmH = Hh; this.lm = new Float32Array(W * Hh).fill(amb);
    for (const l of this.lights) {
      const R = l.r * lr, gx0 = Math.max(0, Math.floor((l.x - R) / S)), gx1 = Math.min(W - 1, Math.ceil((l.x + R) / S)), gy0 = Math.max(0, Math.floor((l.y - R) / S)), gy1 = Math.min(Hh - 1, Math.ceil((l.y + R) / S));
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
        const x = (gx + .5) * S, y = (gy + .5) * S, d = Math.hypot(x - l.x, y - l.y); if (d >= R) continue;
        const k = 1 - d / R; let los = true; if (d > 10) { try { los = this.map.los(l.x, l.y, x, y); } catch (e) { los = true; } }
        if (los) this.lm[gy * W + gx] += l.i * k * k;
      }
    }
    for (let i = 0; i < this.lm.length; i++) this.lm[i] = clamp(this.lm[i], 0, 1);
    this._bakedLr = lr;
  }
  lightAt(x, y) {
    if (this._bakedLr !== B.T('lanternRadius')) this.bake();
    const gx = clamp(Math.floor(x / 8), 0, this.lmW - 1), gy = clamp(Math.floor(y / 8), 0, this.lmH - 1); let L = this.lm[gy * this.lmW + gx];
    for (const l of this.dynLights) { const d = Math.hypot(x - l.x, y - l.y); if (d < l.r) { const k = 1 - d / l.r; L += l.i * k * k; } }
    if (B.mission && B.mission.flashT > 0) L = Math.max(L, .95);
    return clamp(L, 0, 1);
  }
  floorAt(x, y) { return this.map.floorAt(x, y); }
  heightAt(x, y) { return this.map.height(Math.floor(x / CELL), Math.floor(y / CELL)); }
  isDeep(x, y) { return this.floorAt(x, y) === 'deep' && this.heightAt(x, y) === 0; }
  isShallow(x, y) { return this.floorAt(x, y) === 'shallow'; }
  isHide(x, y) { const f = this.floorAt(x, y); return f === 'grass' || f === 'bamboo'; }
  inHall(x, y) { const cx = x / CELL, cy = y / CELL; return this.halls.find(h => cx > h.x0 && cx < h.x1 + 1 && cy > h.y0 && cy < h.y1 + 1) || null; }
  zoneAt(x, y) { const cx = x / CELL, cy = y / CELL; return this.zones.find(z => cx >= z.rect[0] && cy >= z.rect[1] && cx <= z.rect[2] + 1 && cy <= z.rect[3] + 1) || null; }
  set(cx, cy, ch) {   // change a cell in both maps (open a gate)
    const row = this.rows[cy]; this.rows[cy] = row.slice(0, cx) + ch + row.slice(cx + 1);
    const v = B.LEGEND[ch], id = typeof v === 'number' ? v : 0;
    for (const m of [this.map, this.nav]) { m.set(cx, cy, id); if (typeof v === 'object' && m.setFloor) m.setFloor(cx, cy, v.floor, m === this.nav && v.floor === 'deep'); }
  }
  /* grapple anchors near a body: the edges of tops it can be pulled onto, plus the level's swing anchors */
  anchorsNear(b, range, rise) {
    const out = [], T = CELL, z = b.z || 0, c0x = Math.floor((b.x - range) / T), c1x = Math.floor((b.x + range) / T), c0y = Math.floor((b.y - range) / T), c1y = Math.floor((b.y + range) / T);
    for (let cy = Math.max(0, c0y); cy <= Math.min(this.h - 1, c1y); cy++) for (let cx = Math.max(0, c0x); cx <= Math.min(this.w - 1, c1x); cx++) {
      const id = this.map.cell(cx, cy); if (id <= 0) continue;
      const t = B.TYPES[id], top = t.h; if (t.hall || top < z + 16 || top > z + rise) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nb = this.map.cell(cx + dx, cy + dy), nh = nb > 0 ? B.TYPES[nb].h : 0; if (nh >= top - 8) continue;
        const ex = (cx + .5 + dx * .5) * T, ey = (cy + .5 + dy * .5) * T, d = Math.hypot(ex - b.x, ey - b.y); if (d > range || d < 6) continue;
        if ((ex - b.x) * dx + (ey - b.y) * dy > 0) continue;   // the face must look toward the body
        const lx = ex - dx * 6, ly = ey - dy * 6; if (!this.map.standable(lx, ly, top, 4)) continue;
        let clear = true; try { const ry = this.map.ray({ x: b.x, y: b.y, z }, { x: ex + dx * 2, y: ey + dy * 2, z: top - 1 }, { eye: 28, target: 0 }); clear = ry.clear || ry.t > .9; } catch (e) { clear = true; }
        if (!clear) continue;
        out.push({ x: ex, y: ey, z: top, lx, ly, lz: top, d, kind: 'edge' });
      }
    }
    for (const a of this.spec.anchors || []) { const x = cc(a[0]), y = cc(a[1]), az = a[2] || 40, d = Math.hypot(x - b.x, y - b.y); if (d < range && d > 10 && az > z + 10) out.push({ x, y, z: az, lx: x, ly: y, lz: az, d, kind: 'swing' }); }
    return out;
  }
}
B.World = World;
B.levelSpec = id => { const s = get('level', id); if (!s) throw new Error('no level ' + id); return JSON.parse(JSON.stringify(s)); };

/* ---- drawing the world: floor, walls, roof caps, hall roofs, props, decor, lights ---- */
B.drawWorld = (r, W, o = {}) => {
  const G = B.game, hero = o.hero;
  W.map.drawFloor(r); W.map.queueWalls(r);
  for (const d of W.decor) {
    const s = r.w(d.x, d.y, 0); if (s[0] < -30 || s[0] > r.W + 30 || s[1] < -60 || s[1] > r.H + 30) continue;
    if (d.k === 'bamboo') r.shape('bambooClump', d.x, d.y, 0, { facing: (d.x * 7 + d.y) % 6, hides: false }); else r.prop('grass', d.x, d.y, 0, { size: 1.2 });
  }
  for (const p of W.props) {
    const s = r.w(p.x, p.y, 0); if (s[0] < -50 || s[0] > r.W + 50 || s[1] < -90 || s[1] > r.H + 40) continue;
    if (E.SHAPES[p.id]) r.shape(p.id, p.x, p.y, 0, Object.assign({ facing: p.o.facing || 0 }, p.o.scale ? { scale: p.o.scale } : {}));
    else r.prop(p.id, p.x, p.y, 0, Object.assign({ size: 1.3 }, p.o.color ? { color: p.o.color } : {}));
  }
  const t = G.time;
  for (const l of W.lights) { const f = 1 + Math.sin(t * 9 + l.flick) * .05 + Math.sin(t * 23 + l.flick * 2) * .03; G.lights.add(l.x, l.y, l.z, l.r * B.T('lanternRadius') * 1.15, l.i * f, { color: l.color }); }
  for (const l of W.dynLights) G.lights.add(l.x, l.y, l.z || 16, l.r, l.i, { color: l.color || '#ffb060' });
  // kawara roof caps: eave lips, hips and a ridge beam on each building block
  for (const b of W.blocks) {
    if (b.ch === 'T') continue;
    const x0 = b.x0 * CELL, y0 = b.y0 * CELL, x1 = (b.x1 + 1) * CELL, y1 = (b.y1 + 1) * CELL, h = b.h, cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2;
    const s = r.w(cxm, cym, h); if (s[0] < -120 || s[0] > r.W + 120 || s[1] < -120 || s[1] > r.H + 120) continue;
    const alongX = (x1 - x0) >= (y1 - y0), inset = Math.min(x1 - x0, y1 - y0) / 2 - 2;
    r.queue(cxm, cym, h, g => {
      const P = (x, y, z) => r.w(x, y, z), rz = h + 1;
      const ra = alongX ? P(x0 + inset, cym, rz) : P(cxm, y0 + inset, rz), rb = alongX ? P(x1 - inset, cym, rz) : P(cxm, y1 - inset, rz);
      const c = [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)];
      for (const [i, end] of [[0, ra], [3, ra], [1, rb], [2, rb]]) { const q = alongX ? end : (i < 2 ? ra : rb); px.line(g, c[i][0], c[i][1], q[0], q[1], '#2a3040'); }
      px.line(g, ra[0], ra[1], rb[0], rb[1], '#e8e4dc', 2); px.line(g, ra[0], ra[1] + 1, rb[0], rb[1] + 1, '#3a4050');
      px.disc(g, ra[0], ra[1], 1.5, '#2a3040'); px.disc(g, rb[0], rb[1], 1.5, '#2a3040');
      for (let k = 0; k < 4; k++) { const a = c[k], bq = c[(k + 1) % 4]; px.line(g, a[0], a[1] + 1, bq[0], bq[1] + 1, '#1e2230'); }
      if (b.ch === 'M') { const sh = P(alongX ? x0 + inset : cxm, alongX ? cym : y0 + inset, rz + 4), sh2 = P(alongX ? x1 - inset : cxm, alongX ? cym : y1 - inset, rz + 4); for (const q of [sh, sh2]) { px.disc(g, q[0], q[1], 2, '#e8b04a'); px.dot(g, q[0], q[1] - 3, '#ffe080'); } }
    }, { footprint: [x0, y0, x1, y1] });
  }
  // halls: a roof over the interior, faded while the hero is inside
  for (const hl of W.halls) {
    const inside = hero && hero.z < 30 && W.inHall(hero.x, hero.y) === hl; hl.fade = approach(hl.fade, inside ? 0 : 1, G.dt ? G.dt * 4 : .05);
    if (hl.fade < .05) continue;
    const x0 = hl.x0 * CELL, y0 = hl.y0 * CELL, x1 = (hl.x1 + 1) * CELL, y1 = (hl.y1 + 1) * CELL, h = 40, cym = (y0 + y1) / 2, cxm = (x0 + x1) / 2;
    r.queue(cxm, cym, h + 1, g => {
      const P = (x, y, z) => r.w(x, y, z), c = [P(x0 - 3, y0 - 3, h), P(x1 + 3, y0 - 3, h), P(x1 + 3, y1 + 3, h), P(x0 - 3, y1 + 3, h)], alongX = x1 - x0 >= y1 - y0;
      const ra = alongX ? P(x0 + 10, cym, h + 10) : P(cxm, y0 + 10, h + 10), rb = alongX ? P(x1 - 10, cym, h + 10) : P(cxm, y1 - 10, h + 10);
      const polys = alongX ? [[c[0], c[1], rb, ra], [c[3], c[2], rb, ra], [c[0], c[3], ra], [c[1], c[2], rb]] : [[c[0], c[3], rb, ra], [c[1], c[2], rb, ra], [c[0], c[1], ra], [c[3], c[2], rb]];
      const cols = ['#4a5468', '#3a4458', '#525c70', '#343c50'];
      polys.forEach((p, i) => hl.fade > .95 ? px.poly(g, p, cols[i]) : px.polyDither(g, p, cols[i], hl.fade, r.ix, r.iy));
      if (hl.fade > .95) { px.line(g, ra[0], ra[1], rb[0], rb[1], '#e8e4dc', 2); for (let k = 0; k < 4; k++) { const a = c[k], bq = c[(k + 1) % 4]; px.line(g, a[0], a[1], bq[0], bq[1], '#1e2230'); } }
    }, { footprint: [x0, y0, x1 + 1, y1 + 1], hides: true });
  }
  // water: glints and drifting rings (cosmetic)
  if (!W._water) { W._water = []; for (let cy = 0; cy < W.h; cy++) for (let cx = 0; cx < W.w; cx++) if (W.ch(cx, cy) === '~' && (cx * 13 + cy * 7) % 5 === 0) W._water.push([cc(cx), cc(cy), (cx * 3 + cy) % 7]); }
  for (const [x, y, k] of W._water) {
    const ph = (t * .6 + k) % 7; if (ph > 1.2) continue; const s = r.w(x, y, 0); if (s[0] < 0 || s[0] > r.W || s[1] < 0 || s[1] > r.H) continue;
    r.decal(g => { const q = r.w(x + Math.sin(k) * 4, y, 0); px.dot(g, q[0], q[1], '#8ab8d8'); if (ph > .4) { px.dot(g, q[0] - 2, q[1], '#4a7aa0'); px.dot(g, q[0] + 2, q[1], '#4a7aa0'); } });
  }
};

/* ---- 40-hero ---- */
/* 40-hero: the ninja, driven by an intent (from the player's input, the autopilot or a test). Traversal (run, walk,
 * crouch-sneak, sprint, parkour, swim, dive, wall hug and peek, body dragging), exposure (light, cover, motion), noise
 * (by surface), and the hooks into Silent Cuts, combat, the grapple and the tools. */
def('character', 'sojiro', { name: 'Sojiro', weapon: 'Katana', hp: 100, dmg: 1.2, atkSpeed: 1, block: .85, cutSpeed: 1, pull: 1, noise: 1, run: 0, combo: ['slash', 'backslash', 'overhead'], comboDmg: [14, 14, 24],
  bars: [4, 2, 3], line: 'Steady and dutiful. A long blade and a longer patience.', greet: 'We are ready, Master.', voice: 'sojiro', crest: '#b0302a' });
def('character', 'kaede', { name: 'Kaede', weapon: 'Twin kodachi', hp: 80, dmg: .85, atkSpeed: 1.25, block: .7, cutSpeed: 1.25, pull: 1.15, noise: .8, run: 7, combo: ['thrust', 'backslash', 'spin'], comboDmg: [9, 9, 18],
  bars: [2, 4, 4], line: 'Quick and sharp-tongued. Two short blades, no patience at all.', greet: 'Finally. Six years of folding boxes.', voice: 'kaede', crest: '#2a8a8a' });
def('character', 'trial', { name: 'Shadow', weapon: 'Katana', hp: 100, dmg: 1.2, atkSpeed: 1, block: .85, cutSpeed: 1, pull: 1, noise: 1, run: 0, combo: ['slash', 'backslash', 'overhead'], comboDmg: [14, 14, 24], voice: 'sojiro' });
const SURF_NOISE = { gravel: 1.6, boards: 1.2, door: 1.2, tatami: .6, shallow: 1.4 };
const STEP_SFX = { gravel: 'stepGravel', boards: 'stepWood', door: 'stepWood', tatami: 'stepTatami', shallow: 'splash', deep: 'splash' };

B.makeHero = (W, charId, at, o = {}) => {
  const C = get('character', o.stats || charId) || get('character', 'sojiro');
  const h = new E.Mover({ x: at.x, y: at.y, z: at.z || 0, r: 5, climbAny: false, climbMax: 30, vault: 14, hopMax: 48, staminaMax: 100, jumpSpeed: 220 });
  Object.assign(h, { isHero: true, char: charId, C, hpMax: Math.round(C.hp * B.T('heroHpMul')), facing: at.facing || 0, rig: o.rig || (B.RIGS[charId] || B.RIGS.sojiro)(),
    swim: false, dive: false, breath: B.T('breath'), hug: null, hugT: 0, peek: null, drag: null, focus: false, eatT: 0, eatTool: null, cloakT: 0, softT: 0, iframes: 0, hurtT: 0, stepT: 0,
    exposure: 1, noiseT: 0, blockT: -9, parryT: -9, grappleHold: -1, aimAnchor: null, anchor: null, holdT: 0, holdTarget: null, dead: false, combo: null, comboT: 0, comboHit: new Set(), damaged: false });
  h.hp = h.hpMax;
  h.combo = new E.Combo(C.combo.map(m => new E.Attack(m, { reach: 9 })), { window: .3 });
  h.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(h.rig.solvePose);
  return h;
};
/* joint post-processing for the new poses: the ninja run (arms swept back), the wall hug, swimming strokes, eating */
B.postPose = rig => {
  const J = rig.J, p = rig._bentou; if (!J || !p) return;
  if (p.ninjaRun > .01 && J.handL && J.handR) { const k = p.ninjaRun; for (const [hd, el] of [['handL', 'elbowL'], ['handR', 'elbowR']]) { if (rig._atkW > .1 && hd === 'handR') continue; J[hd] = [lerp(J[hd][0], -5, k), J[hd][1], lerp(J[hd][2], J[hd][2] + 2, k)]; if (J[el]) J[el] = [lerp(J[el][0], -3, k), J[el][1], J[el][2]]; } }
  if (p.hug > .01 && J.handL) { const k = p.hug; for (const hd of ['handL', 'handR']) J[hd] = [lerp(J[hd][0], -2.5, k), J[hd][1] * 1.2, J[hd][2]]; }
  if (p.swim > .01 && J.handL) { const ph = p.phase || 0, k = p.swim; J.handL = [lerp(J.handL[0], 6 * Math.sin(ph), k), J.handL[1], lerp(J.handL[2], 14 + 4 * Math.cos(ph), k)]; J.handR = [lerp(J.handR[0], -6 * Math.sin(ph), k), J.handR[1], lerp(J.handR[2], 14 - 4 * Math.cos(ph), k)]; }
  if (p.eat > .01 && J.handR && J.head) { const k = p.eat; J.handR = [lerp(J.handR[0], J.head[0] + 2, k), lerp(J.handR[1], J.head[1], k), lerp(J.handR[2], J.head[2] - 2 + Math.sin(rig.t * 14), k)]; }
  if (p.handsUp > .01 && J.handL) { const k = p.handsUp; for (const hd of ['handL', 'handR']) J[hd] = [lerp(J[hd][0], 1, k), J[hd][1] * .6, lerp(J[hd][2], J.head ? J.head[2] + 6 : 30, k)]; }
};

/* exposure for E.sees: light, cover, motion, crouch (the engine's built-in .6 for crouching becomes the slider's value) */
B.exposureOf = (h, W) => {
  if (h.dive) return 0;
  const L = W.lightAt(h.x, h.y), lightF = lerp(1 - B.T('darkness'), 1, L);
  let cover = 1; if (h.z < 2 && W.isHide(h.x, h.y)) cover = h.crouch ? .15 : .6; if (h.hug) cover = Math.min(cover, .6); if (h.cloakT > 0) cover = Math.min(cover, .15); if (h.swim) cover = 1;
  const sp = Math.hypot(h.vx, h.vy), motion = sp < 5 ? .75 : h.sprinting ? 1.3 : sp > 70 ? 1.15 : 1;
  return clamp(lightF * cover * motion * (h.crouch ? B.T('crouchVis') / .6 : 1), 0, 1.5);
};
B.noise = (x, y, z, loud, kind = 'noise', src = null) => {
  const M = B.mission; if (!M || loud <= 0) return;
  M.noises.push({ x, y, z, loud, kind, t: 0 });
  for (const g of M.guards) if (g.alive && g !== src) g.hearNoise({ x, y, z: z || 0, loud }, kind);
  B.emit('noise', { x, y, z, loud, kind });
};

B.heroUpdate = (h, dt, I, M) => {
  const W = M.world, G = B.game;
  h.hurtT = Math.max(0, h.hurtT - dt); h.iframes = Math.max(0, h.iframes - dt); h.cloakT = Math.max(0, h.cloakT - dt); h.softT = Math.max(0, h.softT - dt); h.comboT += dt;
  if (h.dead) { h.update(dt, W.map, { move: [0, 0] }); return; }
  const deep = h.z <= 2 && W.isDeep(h.x, h.y), act = h.action;
  // crouch: toggle (or hold, in Settings); in deep water crouch dives
  const holdMode = G.settings.crouchMode === 'hold' && !M.auto;
  if (!act) { if (holdMode) h.crouch = I.crouchDown; else if (I.crouchPressed && !h.hug) h.crouch = !h.crouch; }
  if (h.hug && I.crouchPressed) { h.hug = null; h.crouch = !holdMode; }
  h.swim = deep && !act; h.dive = h.swim && h.crouch;
  if (h.swim && !h._wasSwim) { B.sfxAt('splash', h.x, h.y); P.bits(h.x, h.y, 2, 8, ['#8ab8d8', '#4a7aa0', '#ffffff']); B.noise(h.x, h.y, 0, 30, 'splash'); if (h.drag) B.dropBody(h, M); }
  if (h.dive && !h._wasDive) B.sfxAt('dive', h.x, h.y); h._wasSwim = h.swim; h._wasDive = h.dive;
  if (h.dive) { h.breath -= dt; if (h.breath <= 0) { h.breath = 0; h._drown = (h._drown || 0) + dt; if (h._drown > .5) { h._drown = 0; B.damage(null, h, 4, { kind: 'drown', pierce: true }); } } if (crand() < dt * 3) P.add({ kind: 'glint', x: h.x + (crand() - .5) * 6, y: h.y, z: 2, vz: 20, life: .6, color: '#cfe8ff' }); }
  else h.breath = Math.min(B.T('breath'), h.breath + dt * 3);
  // movement intent, shaped by state
  let move = I.move.slice(), ml = Math.hypot(move[0], move[1]);
  h.focus = I.focusDown && !h.swim;
  const slow = h.focus || I.walk;
  if (slow && ml > .5) { move[0] *= .5 / ml; move[1] *= .5 / ml; ml = .5; }
  if (h.eatT > 0) { h.eatT -= dt; move = [0, 0]; if (h.eatT <= 0) B.finishEat(h); }
  const Cm = h.C, softMul = h.softT > 0 ? 0 : 1;
  h.run = B.T('heroRun') + Cm.run; h.sneak = B.T('heroSneak'); h.sprintSpeed = B.T('heroSprint') + Cm.run; h.walk = 50;
  if (h.swim) { h.run = h.walk = h.sneak = h.dive ? 24 : 30; h.sprintSpeed = h.run; }
  if (h.drag) { h.run = h.walk = h.sneak = h.sprintSpeed = 24; }
  if (h.cloakT > 0 && I.sprint) h.cloakT = 0;
  // wall hug: crouched and pushing into a face for .2 s; then the stick moves along it only
  if (!act && h.crouch && !h.swim && !h.drag && h.onGround) {
    if (h.hug) {
      const n = h.hug, along = [-n.ny, n.nx], dot = move[0] * n.nx + move[1] * n.ny;
      if (dot > .6) { h.hug = null; }
      else {
        const a = move[0] * along[0] + move[1] * along[1]; move = [along[0] * a * .75, along[1] * a * .75];
        const ahead = Math.abs(a) > .05 ? Math.sign(a) : (h.peek ? h.peek.dir : 0);
        const probe = ahead ? { x: h.x + along[0] * ahead * 9, y: h.y + along[1] * ahead * 9, z: h.z, r: 3 } : null;
        const wl = probe ? W.map.wall(probe, [-n.nx, -n.ny], { reach: 10 }) : true;
        if (probe && !wl) { h.peek = { dir: ahead, x: h.x + along[0] * ahead * 10, y: h.y + along[1] * ahead * 10, z: h.z }; if (Math.abs(a) > .05) move = [0, 0]; }
        else h.peek = null;
        h.facing = Math.atan2(along[1] * (ahead || 1), along[0] * (ahead || 1));
      }
    } else if (ml > .5) {
      const wl = W.map.wall(h, move, { reach: 8 });
      if (wl && wl.top > 20) { h.hugT += dt; if (h.hugT > .2) { h.hug = { nx: wl.nx, ny: wl.ny }; h.hugT = 0; B.sfx('stepTatami'); } } else h.hugT = 0;
    } else h.hugT = 0;
  } else { h.hug = null; h.peek = null; h.hugT = 0; }
  // combat and actions
  const busy = !!act || h.eatT > 0 || h.combo.busy;
  if (!act) B.heroActions(h, dt, I, M, busy);
  // grapple targeting and aiming
  B.grappleUpdate(h, dt, I, M);
  // move the body
  const atk = h.combo.busy && !h.combo.active ? .25 : h.combo.busy ? 0 : 1;
  const jump = I.jumpPressed && !h.drag && h.eatT <= 0 && !h.combo.busy && !(I.blockDown && ml > .3);
  const blockMove = I.blockDown && !h.swim ? .35 : 1;
  h.update(dt, W.map, { move: [move[0] * atk * blockMove, move[1] * atk * blockMove], sprint: I.sprint && !h.swim && !h.drag && !h.crouch && !h.focus, crouch: h.crouch, jumpPressed: jump && !h.hug });
  if (h.combo.busy && I.aimPoint) h.facing = Math.atan2(I.aimPoint.y - h.y, I.aimPoint.x - h.x);
  if (h.drag) B.dragUpdate(h, M);
  // falls, hazards, out of the map
  if (h.hurt) { B.damage(null, h, 15, { kind: 'fall', pierce: true }); }
  if (h.landed || (h.fell > 1 && h.onGround)) { const f = h.fell || 0; if (f > 6) { const rolled = h.action && h.action.name === 'roll'; B.noise(h.x, h.y, h.z, rolled ? 20 : f > 26 ? 50 : 25, 'land'); P.dust(h.x, h.y, h.z, 4); } }
  if (h.inHazard || h.x < 0 || h.y < 0 || h.x > W.w * CELL || h.y > W.h * CELL) { h.respawn(); h.inHazard = false; B.damage(null, h, 10, { kind: 'fall', pierce: true }); }
  // footsteps: noise by surface, speed and character
  const sp = Math.hypot(h.vx, h.vy);
  if (h.onGround && sp > 20 && !act) {
    h.stepT -= dt * sp / 34;
    if (h.stepT <= 0) {
      h.stepT = 1; const surf = W.floorAt(h.x, h.y), onTop = h.z > 4, mul = (onTop ? 1 : SURF_NOISE[surf] || 1) * Cm.noise;
      let loud = 0;
      if (h.swim) loud = h.dive ? 0 : 15;
      else if (h.drag) loud = 10;
      else if (h.crouch || sp < 55) loud = surf === 'gravel' && !onTop && h.crouch ? 12 : 0;
      else if (h.sprinting) loud = (h.softT > 0 ? 30 : 110) * mul;
      else loud = B.T('noiseRun') * mul * softMul;
      if (surf === 'shallow' && !onTop) loud = Math.max(loud, 40);
      if (loud > 0) B.noise(h.x, h.y, h.z, loud, 'step');
      const sfx = onTop ? (h.z > 30 ? 'stepWood' : 'stepDirt') : STEP_SFX[surf] || 'stepDirt';
      if (!h.dive && (loud > 0 || sp > 40)) B.sfx(sfx, { vol: h.crouch ? .4 : .9 });
    }
  }
  h.exposure = B.exposureOf(h, W);
  // the rig
  const R = h.rig, bp = R._bentou || (R._bentou = {}), running = sp > 70 && h.onGround && !h.crouch && !h.swim && !h.combo.busy;
  bp.ninjaRun = approach(bp.ninjaRun || 0, running ? 1 : 0, dt * 6); bp.hug = approach(bp.hug || 0, h.hug ? 1 : 0, dt * 8); bp.swim = approach(bp.swim || 0, h.swim ? 1 : 0, dt * 6); bp.phase = (bp.phase || 0) + dt * (sp > 5 ? 6 : 2);
  bp.eat = approach(bp.eat || 0, h.eatT > 0 ? 1 : 0, dt * 8); bp.handsUp = approach(bp.handsUp || 0, act && act.name === 'grapple' && act.beat === 'pull' ? 1 : 0, dt * 10);
  const st = h.rigState({ attack: h.combo.state, pose: h.dead ? 'die' : I.blockDown && !act && !h.swim ? 'block' : h.eatT > 0 ? 'crouch' : null, hurt: h.hurtT > 0, expr: h.hurtT > 0 ? 'wince' : null });
  if (h.swim) { st.down = h.dive ? .85 : .6; st.crouch = false; }
  if (h.drag) { st.crouch = true; }
  R.update(dt, st);
};
/* the hero's own presses: strike / Silent Cut / riposte, block and parry, roll, interact, tools, heal, whistle */
B.heroActions = (h, dt, I, M, busy) => {
  const G = B.game, ml = Math.hypot(I.move[0], I.move[1]);
  if (I.toolDelta) B.Bento.cycle(M, I.toolDelta);
  if (I.toolSlot) B.Bento.pick(M, I.toolSlot - 1);
  if (I.blockPressed) { h.parryT = G.time; B.tryParry(h, M); }
  if (I.blockDown && I.jumpPressed && ml > .3 && !h.swim && h.onGround && !h.drag) { if (h.dodge(Math.atan2(I.move[1], I.move[0]), 34)) { B.sfx('whoosh'); h.iframes = .45; } return; }
  h.combo.update(dt);
  if (h.combo.busy) B.heroHits(h, M);
  if (I.attackPressed && h.eatT <= 0) {
    if (h.drag) B.dropBody(h, M);
    else if (!B.tryCut(h, M) && !B.tryRiposte(h, M) && !h.swim) {
      const tgt = I.aimPoint ? null : E.targets(h, M.guards.filter(g => g.alive && !g.civilian), { range: 40, sight: M.world.map })[0];
      if (I.aimPoint) h.facing = Math.atan2(I.aimPoint.y - h.y, I.aimPoint.x - h.x); else if (tgt) h.facing = tgt.angle;
      if (h.combo.press()) { h.comboHit = new Set(); h.comboT = 0; B.sfx('whoosh', { vol: .6 }); }
    }
  }
  if (busy) return;
  if (I.interactPressed) B.interact(h, M, true);
  B.holdInteract(h, dt, I, M);
  if (I.usePressed && !h.swim) B.Bento.use(h, M, I);
  if (I.healPressed) B.Bento.eatRiceBall(h, M);
  if (I.lurePressed && !h.dive) { B.sfx('whistle'); B.noise(h.x, h.y, h.z, 70, 'whistle'); M.toast('Whistle', 'Nearby guards come to look'); }
};
/* bodies: drag one under the arms; drop it in water (it sinks) or in grass and shadow (hidden) */
B.nearBody = (h, M) => M.guards.find(g => !g.alive && !g.sunk && !g.carried && !g.boss && Math.hypot(g.x - h.x, g.y - h.y) < 16 && Math.abs(g.z - h.z) < 8) || M.guards.find(g => g.asleep && !g.boss && Math.hypot(g.x - h.x, g.y - h.y) < 16);
B.dragUpdate = (h, M) => {
  const b = h.drag; if (!b) return;
  const bx = h.x - Math.cos(h.facing) * 14, by = h.y - Math.sin(h.facing) * 14;
  b.x = approach(b.x, bx, 200 / 120); b.y = approach(b.y, by, 200 / 120); b.z = M.world.map.groundAt(b.x, b.y, 3, h.z + 2) || 0; b.facing = h.facing + Math.PI;
};
B.dropBody = (h, M) => {
  const b = h.drag; if (!b) return; h.drag = null; b.carried = false; B.sfxAt('bodyDrop', b.x, b.y);
  const W = M.world;
  if (W.isDeep(b.x, b.y)) { b.sunk = true; B.sfxAt('splash', b.x, b.y); P.bits(b.x, b.y, 2, 10, ['#8ab8d8', '#ffffff']); M.toast('The water keeps it', 'The body sinks out of sight'); }
  else if (W.isHide(b.x, b.y) || W.lightAt(b.x, b.y) < .3) M.toast('Hidden', 'No one will find it here');
};

/* ---- 41-actions ---- */
/* 41-actions: paired and traversal actions on the engine's E.ACTIONS (Silent Cuts in five kinds for each character, the
 * grapple's throw / pull / mantle or swing, the riposte), their detection, the damage pipeline, parries, and the
 * hero's interactions (bodies, levers, cages, pickups, people). */
const lerpP = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z || 0, b.z || 0, u) });
const CUT_BEATS = {
  back: { sojiro: [['grab', .16], ['strike', .24], ['hold', .25], ['drop', .4], ['recover', .18]], kaede: [['hop', .14], ['strike', .16], ['strike2', .16], ['drop', .36], ['recover', .16]] },
  side: { sojiro: [['dash', .2], ['strike', .2], ['drop', .4], ['recover', .18]], kaede: [['dash', .14], ['spin', .3], ['drop', .36], ['recover', .14]] },
  front: { sojiro: [['set', .12], ['rising', .26], ['drop', .45], ['recover', .2]], kaede: [['set', .1], ['xcut', .26], ['drop', .4], ['recover', .16]] },
  above: { sojiro: [['leap', .38], ['strike', .2], ['drop', .45], ['recover', .25]], kaede: [['leap', .34], ['plunge', .2], ['drop', .4], ['recover', .2]] },
  water: { sojiro: [['rise', .2], ['grab', .24], ['pull', .5], ['recover', .2]], kaede: [['rise', .18], ['grab', .22], ['pull', .46], ['recover', .18]] }
};
E.ACTIONS.silentCut = {
  beats: CUT_BEATS.back.sojiro,
  setup(A) {
    const v = A.o.other, kind = A.o.kind || 'back', style = A.o.style === 'kaede' ? 'kaede' : 'sojiro';
    A.beats = CUT_BEATS[kind][style]; A.kind = kind; A.style = style;
    const toV = Math.atan2(v.y - A.start.y, v.x - A.start.x), gap = 8;
    A.vic = { x: v.x, y: v.y, z: v.z || 0, facing: v.facing || 0 };
    const a = kind === 'back' ? v.facing : toV; A.facing = a;
    A.spot = { x: v.x - Math.cos(a) * gap, y: v.y - Math.sin(a) * gap, z: v.z || 0 };
    if (kind === 'side') A.past = { x: v.x + Math.cos(toV) * 14, y: v.y + Math.sin(toV) * 14, z: v.z || 0 };
    if (kind === 'water') { A.spot = { x: A.start.x, y: A.start.y, z: 0 }; A.sink = { x: A.start.x + Math.cos(toV + Math.PI) * 6, y: A.start.y + Math.sin(toV + Math.PI) * 6, z: -6 }; }
  },
  at(A, b, u) {
    const st = { facing: A.facing }, V = { x: A.vic.x, y: A.vic.y, z: A.vic.z }, vs = { facing: A.vic.facing }, K = A.kind, S = A.style;
    const out = (p, s, vp, v2) => Object.assign(p, { state: Object.assign(st, s), other: Object.assign(vp || V, { state: Object.assign(vs, v2 || {}) }) });
    if (b === 'grab' && K === 'back') return out(lerpP(A.start, A.spot, E.ease.outQuad(u)), { stance: 'ready', crouch: u < .5 }, null, { hurt: u > .7, expr: 'wince' });
    if (b === 'hop') { const p = lerpP(A.start, A.spot, u); p.z += Math.sin(u * Math.PI) * 6; return out(p, { air: true }); }
    if (b === 'dash') return out(lerpP(A.start, A.spot, E.ease.inQuad(u)), { sprint: true, stance: 'ready' });
    if (b === 'set') return out(lerpP(A.start, A.spot, u), { stance: 'ready' });
    if (b === 'leap') { const p = lerpP(A.start, A.spot, u); p.z = lerp(A.start.z, A.spot.z, u * u) + Math.sin(u * Math.PI) * 12; return out(p, { air: true }); }
    if (b === 'rise') { const p = lerpP(A.start, A.spot, u); p.z = -8 + u * 8; return out(p, { crouch: true }); }
    const p = { x: A.spot.x, y: A.spot.y, z: A.spot.z };
    if (b === 'strike' && K === 'side') { const q = lerpP(A.spot, A.past, u); return out(q, { attack: E.move('slash', u) }, null, { hurt: u > .4, expr: 'wince' }); }
    if (b === 'strike' || b === 'plunge') return out(p, { attack: E.move(K === 'above' ? (S === 'kaede' ? 'plunge' : 'overhead') : 'thrust', u), land: K === 'above' && u < .2 ? 1 : 0 }, null, { hurt: u > .35, expr: 'wince' });
    if (b === 'strike2') return out(p, { attack: E.move('backslash', u) }, null, { hurt: true, expr: 'wince' });
    if (b === 'hold') return out(p, { attack: E.move('thrust', 1, 'recover') }, null, { hurt: true, expr: 'wince' });
    if (b === 'spin') { const q = lerpP(A.spot, A.past || A.spot, u); return out(q, { attack: E.move('spin', u) }, null, { hurt: u > .3, expr: 'wince' }); }
    if (b === 'rising') return out(p, { attack: E.move('rising', u) }, null, { hurt: u > .4, expr: 'wince' });
    if (b === 'xcut') return out(p, { attack: E.move(u < .5 ? 'slash' : 'backslash', u < .5 ? u * 2 : u * 2 - 1) }, null, { hurt: u > .3, expr: 'wince' });
    if (b === 'grab' && K === 'water') return out(p, { attack: E.move('claw', u), crouch: true }, null, { hurt: u > .5, expr: 'wince' });
    if (b === 'pull') { const vp = lerpP(V, A.sink, E.ease.inQuad(u)); return out({ x: p.x, y: p.y, z: -4 * u }, { crouch: true }, vp, { down: Math.min(1, u * 2), hurt: true }); }
    const sideEnd = K === 'side' && A.past ? { x: A.past.x, y: A.past.y, z: A.past.z } : p;
    if (b === 'drop') return out(sideEnd, { stance: 'ready' }, K === 'water' ? Object.assign({}, A.sink) : null, { down: E.ease.inQuad(u), fallBack: K === 'front' });
    return out(sideEnd, { crouch: u < .5 }, K === 'water' ? Object.assign({}, A.sink) : null, { down: 1 });
  }
};
E.ACTIONS.grapple = {
  beats: [['throw', .16], ['pull', .4], ['mantle', .2]],
  setup(A) {
    const t = A.o.to, d = Math.hypot(t.x - A.start.x, t.y - A.start.y, t.z - A.start.z), sp = B.T('grappleSpeed') * (A.o.pull || 1);
    A.to = t; A.facing = Math.atan2(t.y - A.start.y, t.x - A.start.x);
    A.hang = t.kind === 'swing' ? { x: t.x, y: t.y, z: t.z - 22 } : { x: t.x + Math.cos(A.facing) * -3, y: t.y + Math.sin(A.facing) * -3, z: t.z - 10 };
    if (t.kind === 'swing') {
      const lx = t.x + Math.cos(A.facing) * 46, ly = t.y + Math.sin(A.facing) * 46, gz = A.o.map ? A.o.map.groundAt(lx, ly, 4, 200) || 0 : 0;
      A.land = { x: lx, y: ly, z: gz }; A.beats = [['throw', .16], ['pull', Math.max(.2, d / sp)], ['swing', .45]];
    } else { A.land = { x: t.lx, y: t.ly, z: t.lz }; A.beats = [['throw', .16], ['pull', Math.max(.18, d / sp)], ['mantle', .22]]; }
  },
  at(A, b, u) {
    const st = { facing: A.facing };
    if (b === 'throw') return Object.assign({ x: A.start.x, y: A.start.y, z: A.start.z }, { state: Object.assign(st, { attack: E.move('throw', u) }) });
    if (b === 'pull') { const p = lerpP(A.start, A.hang, E.ease.inOutQuad(u)); p.z += Math.sin(u * Math.PI) * 10; return Object.assign(p, { state: Object.assign(st, { air: true }) }); }
    if (b === 'swing') { const p = lerpP(A.hang, A.land, u); p.z = lerp(A.hang.z, A.land.z, u) + Math.sin(u * Math.PI) * 18; return Object.assign(p, { state: Object.assign(st, { air: true, flip: u > .3 && u < .8 ? (u - .3) * 2 : 0 }) }); }
    const p = lerpP(A.hang, A.land, E.ease.outQuad(u)); if (u < .5) p.z = lerp(A.hang.z, A.land.z + 2, u * 2); else p.z = A.land.z;
    return Object.assign(p, { state: Object.assign(st, { crouch: true, hang: u < .4, hangZ: 22 }) });
  }
};
E.ACTIONS.riposte = {
  beats: [['strike', .22], ['hold', .3], ['recover', .16]],
  setup(A) { const v = A.o.other; A.facing = Math.atan2(v.y - A.start.y, v.x - A.start.x); A.vic = { x: v.x, y: v.y, z: v.z || 0, facing: v.facing || 0 }; },
  at(A, b, u) {
    const p = { x: A.start.x, y: A.start.y, z: A.start.z }, st = { facing: A.facing }, V = Object.assign({}, A.vic);
    if (b === 'strike') return Object.assign(p, { state: Object.assign(st, { attack: E.move('thrust', u) }), other: Object.assign(V, { state: { facing: A.vic.facing, hurt: u > .4, expr: 'wince' } }) });
    if (b === 'hold') return Object.assign(p, { state: Object.assign(st, { attack: E.move('thrust', 1, 'recover') }), other: Object.assign(V, { state: { facing: A.vic.facing, down: E.ease.inQuad(u) } }) });
    return Object.assign(p, { state: st, other: Object.assign(V, { state: { facing: A.vic.facing, down: 1 } }) });
  }
};

/* ---- Silent Cut detection: the best candidate this step ---- */
B.cutCandidate = (h, M) => {
  if (h.action || h.drag || h.eatT > 0 || h.combo.busy || h.dead) return null;
  const W = M.world, R = B.T('killRange'), back = B.T('killBackAngle') * Math.PI / 180;
  let best = null, bd = 1e9;
  for (const g of M.guards) {
    if (!g.alive || g.boss || g.dying || g.fighting || g.mind.state === 'alert') continue;
    const d = Math.hypot(g.x - h.x, g.y - h.y), dz = h.z - g.z;
    let kind = null;
    if (h.swim) { if (d <= 20 && Math.abs(dz) < 10 && W.isDeep(h.x, h.y) && !W.isDeep(g.x, g.y)) kind = 'water'; }
    else if (dz >= 14 && d <= 44 && h.onGround) { let ok = true; for (let k = 1; k < 8; k++) { const u = k / 8; if (W.heightAt(lerp(h.x, g.x, u), lerp(h.y, g.y, u)) > h.z + 2) ok = false; } if (ok) kind = 'above'; }
    else if (d <= R && Math.abs(dz) <= 10) {
      const rel = Math.abs(E.angDiff(g.facing, Math.atan2(g.y - h.y, g.x - h.x))), seeing = g.seesHero;
      const inc = g.asleep || g.eating || g.stunT > 0 || g.blindT > 0 || g.poisonT > 0;
      if (inc) kind = rel < back ? 'back' : rel < Math.PI * 2 / 3 ? 'side' : 'front';
      else if (rel < back && !seeing) kind = 'back';
      else if (rel < Math.PI * 2 / 3 && g.mind.state === 'calm' && !seeing) kind = 'side';
    }
    if (kind && d < bd) { best = { g, kind }; bd = d; }
  }
  return best;
};
B.CUT_NAMES = { back: 'Back', side: 'Side', front: 'Front', above: 'From above', water: 'Undertow' };
B.tryCut = (h, M) => {
  const c = B.cutCandidate(h, M); if (!c) return false;
  const g = c.g; h.play('silentCut', { other: g, kind: c.kind, style: h.char === 'kaede' ? 'kaede' : 'sojiro', speed: h.C.cutSpeed, map: M.world.map });
  g.dying = h.action; g.alive = false; g.cutKind = c.kind; if (c.kind === 'water') g.sunkLater = true;
  M.silentCut(c.kind, g); return true;
};
/* ---- combat: hits, parries, ripostes, and the one damage pipeline ---- */
B.heroHits = (h, M) => {
  const C = h.C, step = Math.max(0, h.combo.step || 0), dmg = (C.comboDmg[step] || 14) * C.dmg * (M.cheats.oneHit ? 99 : 1);
  h.combo.hits(M.guards.filter(g => g.alive && !g.dying), g => E.inArc(h, h.facing, g, 22, 1.3, 12), g => B.damage(h, g, dmg, { kind: 'melee', angle: h.facing }));
  for (const b of M.bosses) if (b.alive && b.active) h.combo.hits([b], g => E.inArc(h, h.facing, g, 26 + (b.reachBonus || 0), 1.3, 14), g => B.damage(h, g, dmg, { kind: 'melee', angle: h.facing }));
  for (const c of M.clones || []) if (c.alive) h.combo.hits([c], g => E.inArc(h, h.facing, g, 24, 1.3, 14), g => { g.alive = false; P.smoke(g.x, g.y, g.z + 14, 10, { size: 2 }); B.sfx('smoke'); });
};
B.tryParry = (h, M) => {
  const win = B.T('parryWindow'); let any = false;
  for (const g of M.guards.concat(M.bosses)) {
    if (!g.alive || !g.swing || g.swing.phase !== 'wind') continue;
    const d = Math.hypot(g.x - h.x, g.y - h.y); if (d > 34 + (g.reachBonus || 0)) continue;
    const left = (1 - g.swing.u) * (g.swing.o ? g.swing.o.wind || .4 : .4) * (g.windMul || 1);
    if (left <= win + .05 && g.parryable !== false) {
      g.swing.cancel(); g.staggerT = g.boss ? .9 : 1.3; any = true; B.sfx('parry'); B.game.flash('#ffffff', .06, .5); P.sparks(g.x, g.y, g.z + 18, 12, h.facing);
      M.toast('Parried', g.boss ? 'Strike now!' : 'Riposte!'); B.emit('parry', { g });
    }
  }
  return any;
};
B.tryRiposte = (h, M) => {
  const g = M.guards.concat(M.bosses).find(e => e.alive && e.staggerT > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 28 && Math.abs(e.z - h.z) < 10);
  if (!g) return false;
  if (g.boss) { h.facing = Math.atan2(g.y - h.y, g.x - h.x); h.combo.press(); B.damage(h, g, 60, { kind: 'riposte', pierce: true }); g.staggerT = 0; B.sfx('twang'); return true; }
  h.play('riposte', { other: g }); g.dying = h.action; g.alive = false; B.sfx('twang'); B.game.freeze(.06); M.kill(g, 'riposte'); return true;
};
B.damage = (src, dst, amt, o = {}) => {
  const M = B.mission, G = B.game; if (!M || !dst) return 0;
  if (dst.isHero) {
    if (dst.dead || M.cheats.god || M.over) return 0;
    if (!o.pierce && (dst.iframes > 0 || (dst.action && dst.action.invulnerable))) return 0;
    let a = amt * (o.kind === 'fall' || o.kind === 'drown' ? 1 : B.T('enemyDmg'));
    const blocking = M.intent && M.intent.blockDown && !dst.action && !dst.swim;
    if (blocking && src && !o.pierce && !o.unblockable && Math.abs(E.angDiff(dst.facing, Math.atan2(src.y - dst.y, src.x - dst.x))) < Math.PI / 3) { a *= 1 - dst.C.block; B.sfx('clash'); P.sparks(dst.x, dst.y, dst.z + 18, 6, dst.facing); }
    else { B.sfx('thud'); G.shake(3); G.freeze(.04); if (G.settings.blood === 'ink') P.bits(dst.x, dst.y, dst.z + 16, 6, ['#d02a20', '#8a1410']); }
    dst.hp -= a; dst.hurtT = .35; dst.iframes = .4; dst.damaged = true; M.hitFlash = .3; B.emit('damage', { dst, amt: a });
    if (dst.hp <= 0) { dst.hp = 0; M.heroDeath(o.kind); }
    return a;
  }
  return dst.takeHit ? dst.takeHit(src, amt, o) : 0;
};

/* ---- the grapple: targeting (auto, aim mode, mouse), firing ---- */
B.grappleUpdate = (h, dt, I, M) => {
  const G = B.game; h._gT = (h._gT || 0) - dt;
  if (h._gT <= 0) { h._gT = .1; h.anchors = h.dead ? [] : M.world.anchorsNear(h, B.T('grappleRange'), 96); }
  const L = h.anchors || [], aimDir = h.grappleHold > .25 && Math.hypot(I.move[0], I.move[1]) > .3 ? Math.atan2(I.move[1], I.move[0]) : h.facing;
  const ptr = I.aimPoint && B.lastR ? G.input.pointer() : null;
  let best = null, bs = 1e9;
  for (const a of L) {
    let s;
    if (ptr) { const q = B.lastR.w(a.x, a.y, a.z); s = Math.hypot(q[0] - ptr[0], q[1] - ptr[1]); if (s > 40) continue; }
    else { const da = Math.abs(E.angDiff(aimDir, Math.atan2(a.y - h.y, a.x - h.x))); if (da > 1.22) continue; s = da * 60 + a.d * .5 + (a.z - h.z) * .1; }
    if (s < bs) { bs = s; best = a; }
  }
  if (I.grappleTarget) best = I.grappleTarget;
  h.anchor = best;
  const can = !h.action && !h.dive && !h.drag && h.eatT <= 0 && !h.dead;
  if (I.grapplePressed && can) h.grappleHold = 0;
  if (h.grappleHold >= 0) {
    if (I.grappleDown) { h.grappleHold += dt / Math.max(.1, G.timeScale); if (h.grappleHold > .25 && !M.slowmoT) G.timeScale = .5; }
    if (I.grappleReleased || !I.grappleDown) {
      if (!M.slowmoT) G.timeScale = 1;
      const a = h.anchor; h.grappleHold = -1;
      if (a && can && (h._gCool || 0) <= G.time) {
        h.play('grapple', { to: a, map: M.world.map, pull: h.C.pull }); h._gCool = G.time + .3; h.rope = a;
        B.sfx('grappleThrow'); G.after(.16, () => { B.sfx('clink'); B.sfx('zip'); }); B.noise(a.x, a.y, a.z, 30, 'grapple', null); M.stats.grapples++; B.emit('grapple', { a });
      }
    }
  }
  if (!h.action || h.action.name !== 'grapple') h.rope = null;
};

/* ---- interactions: the nearest thing to use, held ones with a progress ring ---- */
B.interactable = (h, M) => {
  if (h.drag) return { kind: 'drop', label: 'Drop body' };
  const b = B.nearBody(h, M); if (b) return { kind: 'body', b, label: b.asleep ? 'Drag sleeper' : 'Drag body' };
  for (const it of M.interacts) { if (it.done || !it.active) continue; if (Math.hypot(it.x - h.x, it.y - h.y) < (it.r || 18) && Math.abs((it.z || 0) - h.z) < 12) return { kind: 'hold', it, label: it.text }; }
  for (const p of M.pickups) { if (p.taken) continue; if (Math.hypot(p.x - h.x, p.y - h.y) < 16 && Math.abs((p.z || 0) - h.z) < 12) return { kind: 'pickup', p, label: p.kind === 'story' ? 'Take ' + (p.name || 'it') : 'Pick up' }; }
  const npc = M.talkers.find(t => Math.hypot(t.x - h.x, t.y - h.y) < 22 && t.canTalk && t.canTalk()); if (npc) return { kind: 'talk', npc, label: npc.talkLabel || 'Talk' };
  if (M.escort && M.escort.alive && M.escort.freed && Math.hypot(M.escort.x - h.x, M.escort.y - h.y) < 24) return { kind: 'escort', label: M.escort.waiting ? 'Tobei: follow me' : 'Tobei: wait here' };
  return null;
};
B.interact = (h, M, pressed) => {
  const it = B.interactable(h, M); if (!it || !pressed) return;
  if (it.kind === 'drop') B.dropBody(h, M);
  else if (it.kind === 'body') { h.drag = it.b; it.b.carried = true; h.crouch = false; B.sfx('bodyDrop', { vol: .5 }); }
  else if (it.kind === 'pickup') M.takePickup(it.p);
  else if (it.kind === 'talk') it.npc.talk();
  else if (it.kind === 'escort') M.escort.toggle();
};
B.holdInteract = (h, dt, I, M) => {
  const it = B.interactable(h, M);
  if (!it || it.kind !== 'hold' || !I.interactDown) { if (h.holdTarget) h.holdTarget.prog = 0; h.holdTarget = null; return; }
  if (h.holdTarget !== it.it) { if (h.holdTarget) h.holdTarget.prog = 0; h.holdTarget = it.it; it.it.prog = 0; }
  it.it.prog += dt; if (crand() < dt * 6) B.sfx('lever', { vol: .3 });
  if (it.it.prog >= (it.it.hold || 1)) { it.it.prog = 0; h.holdTarget = null; M.useInteract(it.it); }
};

/* ---- 44-tools ---- */
/* 44-tools: the ten ninja tools and the Bento that carries them: 8 compartments (2 tiers x 4), each one tool type up to
 * its stack. Food tools are eaten or left as bait; steel tools are thrown, lobbed or dropped. */
def('tool', 'riceball', { name: 'Rice Ball', stack: 3, use: 'eat', desc: 'Eat to heal 40. Takes a moment.', unlock: null });
def('tool', 'poison', { name: 'Poison Rice Ball', stack: 2, use: 'bait', range: 48, desc: 'Leave it where a guard will see it. He eats. He does not finish.', unlock: null });
def('tool', 'dango', { name: 'Sleep Dango', stack: 2, use: 'bait', range: 48, desc: 'A bait that puts the eater to sleep for 25 s.', unlock: { mission: 'm1', rank: 'Ekiben' } });
def('tool', 'plum', { name: 'Sour Plum', stack: 3, use: 'eat', desc: 'Full stamina and soft steps for 20 s.', unlock: { mission: 'training', rank: 'Ekiben' } });
def('tool', 'shuriken', { name: 'Shuriken', stack: 10, use: 'throw', range: 160, desc: 'Thrown star. 8 damage; a calm guard turns to look.', unlock: null });
def('tool', 'smoke', { name: 'Smoke Bomb', stack: 2, use: 'lob', range: 96, desc: 'A cloud no eye sees through. Guards inside lose you.', unlock: null });
def('tool', 'caltrops', { name: 'Caltrops', stack: 2, use: 'drop', desc: 'Iron spikes at your feet: pursuers stumble and limp.', unlock: null });
def('tool', 'firecracker', { name: 'Firecracker', stack: 3, use: 'lob', range: 128, desc: 'Pops after landing. Guards go to look at the noise.', unlock: null });
def('tool', 'firepot', { name: 'Fire Pot', stack: 1, use: 'lob', range: 112, desc: 'Bursts in flame on impact: 45 damage, very loud.', unlock: { mission: 'm2', rank: 'Makunouchi' } });
def('tool', 'cloak', { name: 'Straw Cloak', stack: 1, use: 'self', desc: '15 s almost unseen, unless you strike or sprint.', unlock: { any: true, rank: 'Grand Kaiseki' } });
B.TOOL_ORDER = ['riceball', 'poison', 'dango', 'plum', 'shuriken', 'smoke', 'caltrops', 'firecracker', 'firepot', 'cloak'];

B.Bento = {
  make(loadout) { const slots = []; for (let i = 0; i < 8; i++) { const id = loadout && loadout[i]; slots.push(id ? { tool: id, n: get('tool', id).stack } : null); } return { slots, sel: Math.max(0, slots.findIndex(Boolean)), used: 0 }; },
  cur(M) { const b = M.bento, s = b.slots[b.sel]; return s && s.n > 0 ? s : null; },
  count(M, id) { return M.bento.slots.reduce((a, s) => a + (s && s.tool === id ? s.n : 0), 0); },
  cycle(M, d) { const b = M.bento; for (let k = 1; k <= 8; k++) { const i = (b.sel + d * k + 80) % 8; if (b.slots[i] && b.slots[i].n > 0) { b.sel = i; B.sfx('uiMove'); M.toolFlash = .6; return; } } },
  pick(M, i) { if (M.bento.slots[i] && M.bento.slots[i].n > 0) { M.bento.sel = i; B.sfx('uiMove'); M.toolFlash = .6; } },
  take(M, id) { const b = M.bento; if (M.cheats.infTools) return true; const s = b.slots.find(s => s && s.tool === id && s.n > 0); if (!s) return false; s.n--; return true; },
  add(M, id, n) { const b = M.bento, st = get('tool', id).stack; let left = n; for (const s of b.slots) if (s && s.tool === id && s.n < st && left > 0) { const k = Math.min(st - s.n, left); s.n += k; left -= k; } for (let i = 0; i < 8 && left > 0; i++) if (!b.slots[i]) { const k = Math.min(st, left); b.slots[i] = { tool: id, n: k }; left -= k; } return n - left; },
  eatRiceBall(h, M) { if (h.hp >= h.hpMax || h.eatT > 0) return; if (!B.Bento.take(M, 'riceball')) { M.toast('No rice balls', 'Your bento is empty of rice'); return; } h.eatT = .6; h.eatTool = 'riceball'; B.sfx('eat'); M.stats.tools++; B.emit('toolUsed', { tool: 'riceball' }); },
  use(h, M, I) {
    const s = B.Bento.cur(M); if (!s) { M.toast('Empty compartment', 'Pick another tool'); return; }
    const T = get('tool', s.tool);
    if (s.tool === 'riceball') return B.Bento.eatRiceBall(h, M);
    if (!B.Bento.take(M, s.tool)) return;
    M.stats.tools++; B.emit('toolUsed', { tool: s.tool });
    if (s.tool === 'plum') { h.stamina = h.staminaMax; h.softT = 20; B.sfx('eat'); M.toast('Sour Plum', 'Soft steps for 20 seconds'); return; }
    if (s.tool === 'cloak') { h.cloakT = 15; B.sfx('fusuma'); M.toast('Straw Cloak', 'Still as a haystack'); return; }
    if (s.tool === 'caltrops') { M.traps.push({ kind: 'caltrops', x: h.x, y: h.y, z: h.z, r: 24, t: 20 }); B.sfx('caltrop'); return; }
    const aim = B.Bento.aim(h, M, I, T.range || 80);
    if (T.use === 'bait') {
      const d = Math.hypot(aim.x - h.x, aim.y - h.y), at = d < 14 || I.blockDown ? { x: h.x + Math.cos(h.facing) * 8, y: h.y + Math.sin(h.facing) * 8 } : aim;
      B.Bento.lob(h, M, s.tool, at, 18); return;
    }
    if (T.use === 'throw') {
      const a = Math.atan2(aim.y - h.y, aim.x - h.x); h.facing = a; h.combo.cancel && h.combo.cancel();
      M.shots.fire({ x: h.x + Math.cos(a) * 6, y: h.y + Math.sin(a) * 6, z: h.z + 18, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 2, team: 'player', life: (T.range || 160) / 300, dmg: 8, color: '#c8d0e0' });
      B.sfx('shuriken'); return;
    }
    const at2 = s.tool === 'smoke' && I.blockDown ? { x: h.x, y: h.y } : aim;
    B.Bento.lob(h, M, s.tool, at2, 24);
  },
  /* where a thrown tool goes: the cursor (clamped to range), else the nearest visible guard ahead, else 80 ahead */
  aim(h, M, I, range) {
    if (I.aimPoint) { const d = Math.hypot(I.aimPoint.x - h.x, I.aimPoint.y - h.y), k = d > range ? range / d : 1; return { x: h.x + (I.aimPoint.x - h.x) * k, y: h.y + (I.aimPoint.y - h.y) * k }; }
    const t = E.targets(h, M.guards.filter(g => g.alive && g.vis === 'visible'), { range, arc: Math.PI / 4, sight: M.world.map })[0];
    if (t) return { x: t.target.x, y: t.target.y };
    const d = Math.min(80, range); return { x: h.x + Math.cos(h.facing) * d, y: h.y + Math.sin(h.facing) * d };
  },
  lob(h, M, tool, at, apex) {
    const from = { x: h.x, y: h.y, z: h.z + 20 }, gz = M.world.map.groundAt(at.x, at.y, 2, 300) || 0, v = E.arc(from, { x: at.x, y: at.y, z: gz }, 700, { apex });
    M.lobs.push({ tool, x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, t: 0 }); B.sfx('whoosh', { vol: .5 }); h.facing = Math.atan2(at.y - h.y, at.x - h.x);
  }
};
/* lobbed tools in flight, landed baits, clouds and traps */
B.toolsUpdate = (M, dt) => {
  const W = M.world;
  for (const l of M.lobs) {
    l.t += dt; l.vz -= 700 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    const gz = W.map.groundAt(l.x, l.y, 2, l.z + 4) || 0;
    if (l.z <= gz || l.t > 3) { l.done = true; l.z = gz; B.toolLand(M, l); }
  }
  M.lobs = M.lobs.filter(l => !l.done);
  for (const c of M.clouds) { c.t -= dt; for (let k = 0; k < 2; k++) if (crand() < dt * 8) P.smoke(c.x + (crand() - .5) * c.r, c.y + (crand() - .5) * c.r, c.z + 4 + crand() * 20, 1, { size: 3, color: '#a8a8b0' }); }
  M.clouds = M.clouds.filter(c => c.t > 0);
  for (const t of M.traps) {
    t.t -= dt;
    if (t.kind === 'caltrops') for (const g of M.guards) if (g.alive && !g.boss && !g.dying && Math.hypot(g.x - t.x, g.y - t.y) < t.r && g.onGround && !(g._calT > 0)) { g._calT = 4; B.damage(M.hero, g, 6, { kind: 'trap', pierce: true, quiet: true }); g.stunT = 2; g.limpT = 6; B.sfxAt('caltrop', g.x, g.y); g.bark('hurt'); }
    if (t.kind === 'pop' && t.t <= 0) { B.sfxAt('crack', t.x, t.y); P.sparks(t.x, t.y, t.z + 4, 12, 0); P.glints(t.x, t.y, t.z + 6, 6, '#ffe080'); B.noise(t.x, t.y, t.z, 140, 'firecracker'); }
  }
  for (const g of M.guards) if (g._calT > 0) g._calT -= dt;
  M.traps = M.traps.filter(t => t.t > 0);
  for (const b of M.baits) { b.t += dt; if (b.eaten) b.done = true; }
  M.baits = M.baits.filter(b => !b.done);
  for (const l of M.world.dynLights) if (l.life !== undefined) l.life -= dt;
  M.world.dynLights = M.world.dynLights.filter(l => l.life === undefined || l.life > 0);
};
B.toolLand = (M, l) => {
  const h = M.hero;
  if (l.tool === 'poison' || l.tool === 'dango') { M.baits.push({ kind: l.tool, x: l.x, y: l.y, z: l.z, t: 0, eaten: false }); B.sfxAt('stepTatami', l.x, l.y); return; }
  if (l.tool === 'smoke') { M.clouds.push({ x: l.x, y: l.y, z: l.z, r: 40, t: B.T('smokeTime') }); B.sfxAt('smoke', l.x, l.y); P.smoke(l.x, l.y, l.z + 8, 30, { size: 3, color: '#b0b0b8' }); for (const g of M.guards) if (g.alive && Math.hypot(g.x - l.x, g.y - l.y) < 40) g.blind(); return; }
  if (l.tool === 'firecracker') { M.traps.push({ kind: 'pop', x: l.x, y: l.y, z: l.z, t: .8 }); B.sfxAt('stepTatami', l.x, l.y); return; }
  if (l.tool === 'firepot') {
    B.sfxAt('boom', l.x, l.y); P.explosion(l.x, l.y, l.z + 4, 1.2, { freeze: false, shake: 4 }); P.fire(l.x, l.y, l.z, 20, { size: 2 });
    M.world.dynLights.push({ x: l.x, y: l.y, z: 12, r: 90, i: 1.2, color: '#ff8a3a', life: 1 });
    for (const g of M.guards.concat(M.bosses)) if (g.alive && Math.hypot(g.x - l.x, g.y - l.y) < 32) B.damage(h, g, 45, { kind: 'fire', pierce: true });
    if (h && Math.hypot(h.x - l.x, h.y - l.y) < 32) B.damage(null, h, 45 * .6, { kind: 'fire', pierce: true });
    B.noise(l.x, l.y, l.z, 220, 'explosion');
  }
};
/* is a sight line through smoke? */
B.smoked = (M, a, b) => {
  for (const c of M.clouds) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, u = clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / L2, 0, 1);
    if (Math.hypot(a.x + dx * u - c.x, a.y + dy * u - c.y) < c.r) return true;
  }
  return false;
};
B.finishEat = h => { if (h.eatTool === 'riceball') { h.hp = Math.min(h.hpMax, h.hp + 40); P.glints(h.x, h.y, h.z + 20, 8, '#a0ffa0'); B.sfx('pickup'); } h.eatTool = null; };

/* ---- 50-ai ---- */
/* 50-ai: guards, hounds and civilians. Perception (sight through light, cover, smoke and the look-up limit; hearing;
 * a hound's nose; bodies; baits), the mind (E.Suspicion) and the behaviors on top of it (patrol, post, sleep, eat, chat,
 * notice, search, chase, fight, flee, bell runs), barks with voices, and Shadow Sight and the Ki gauge. */
def('enemy', 'ashigaru', { rig: 'ashigaru', hp: 40, walk: 30, run: 70, sight: 1, fov: 1.5, moves: [['thrust', 12, .42], ['overhead', 10, .5]], voice: 'guard', label: 'Ashigaru' });
def('enemy', 'samurai', { rig: 'samurai', hp: 70, walk: 32, run: 75, sight: 1.05, fov: 1.5, moves: [['slash', 16, .36], ['overhead', 22, .5]], blocks: .5, voice: 'guard', label: 'Samurai' });
def('enemy', 'archer', { rig: 'archer', hp: 30, walk: 28, run: 65, sight: 1.25, fov: 1.3, lookUp: true, ranged: 'arrow', post: true, moves: [['bash', 6, .4]], voice: 'guard', label: 'Archer' });
def('enemy', 'ninja', { rig: 'ninja', hp: 50, walk: 40, run: 95, sight: 1.1, fov: 1.7, lookUp: true, ranged: 'shuriken', climbs: true, notice: 1.3, moves: [['slash', 10, .28]], voice: 'guard', label: 'Red Lantern ninja', barks: 'ninja' });
def('enemy', 'hound', { rig: 'hound', hp: 20, walk: 45, run: 120, sight: .8, fov: 1.8, moves: [['bite', 8, .25]], smell: true, hear: 1.5, voice: 'guard', label: 'Hound', barks: 'hound' });
def('enemy', 'civilian', { rig: 'civilian', hp: 15, walk: 25, run: 80, sight: .9, fov: 1.6, moves: [], civilian: true, voice: 'maid', label: 'Civilian', barks: 'civilian' });
def('enemy', 'disciple', { rig: 'disciple', hp: 40, walk: 26, run: 60, sight: .9, fov: 1.5, moves: [], harmless: true, voice: 'disciple', label: 'Disciple', barks: 'disciple' });
def('enemy', 'target', { rig: 'civilian', hp: 30, walk: 25, run: 70, sight: .8, fov: 1.5, moves: [], voice: 'kanemori', label: 'Target', target: true, barks: 'target' });
const MOOD = { calm: '#5ad8c8', notice: '#f0d050', search: '#f09040', alert: '#ff4a3a' };
B.MOOD = MOOD;
const FLOWS = new Map();
B.flowFor = (M, goal, kind) => {
  const W = M.world, cx = Math.floor(goal.x / CELL), cy = Math.floor(goal.y / CELL), key = kind + ':' + cx + ',' + cy + ':' + W.nav.version;
  let f = FLOWS.get(key);
  if (!f) {
    if (FLOWS.size > 24) FLOWS.delete(FLOWS.keys().next().value);
    f = new E.FlowField(W.nav, kind === 'ninja' ? { climb: 56, drop: 56, jump: 60 } : { drop: 30 }); f.update(goal.x, goal.y); FLOWS.set(key, f);
  } else { FLOWS.delete(key); FLOWS.set(key, f); }
  return f;
};
B.clearFlows = () => FLOWS.clear();

class Guard extends E.Mover {
  constructor(spec, M) {
    const T = get('enemy', spec.type) || get('enemy', 'ashigaru'), at = { x: cc(spec.at[0]), y: cc(spec.at[1]) };
    super({ x: at.x, y: at.y, z: spec.z || 0, r: spec.type === 'hound' ? 6 : 5, climbMax: T.climbs ? 56 : 30, hopMax: 56, walk: T.walk, run: T.run });
    this.spec = spec; this.T = T; this.type = spec.type; this.id = spec.id || spec.type + Math.floor(rand() * 1e6); this.M = M;
    this.faction = spec.faction || M.level.faction || 'kanemori'; this.civilian = !!T.civilian; this.disguised = !!spec.disguised; this.mark = !!spec.mark; this.harmless = !!T.harmless || !!spec.harmless;
    this.target = !!spec.target || !!T.target;
    this.hpMax = Math.round(T.hp * (this.civilian ? 1 : B.T('enemyHp'))); this.hp = this.hpMax; this.alive = true;
    this.facing = (spec.facing || 0) * Math.PI / 180; this.home = { x: at.x, y: at.y, z: spec.z || 0, facing: this.facing };
    this.mode = spec.mode || (spec.route ? 'patrol' : 'post'); this.route = (spec.route || []).map(p => ({ x: cc(p[0]), y: cc(p[1]), wait: p[2] || 0, look: p[3] === undefined ? null : p[3] * Math.PI / 180 }));
    this.ri = 0; this.waitT = 0; this.lantern = !!spec.lantern; this.partner = spec.partner || null;
    this.mind = new E.Suspicion({ rise: B.T('suspRise'), decay: B.T('suspDecay'), forget: 7 });
    this.asleep = this.mode === 'sleep'; this.eating = false; this.bait = null; this.eatT = 0; this.poisonT = 0; this.sleepT = this.asleep ? 1e9 : 0;
    this.stunT = 0; this.blindT = 0; this.staggerT = 0; this.limpT = 0; this.barkT = 1 + rand() * 6; this.idleBark = 12 + rand() * 13; this.bubble = null;
    this.swing = null; this.drawT = 0; this.throwT = 0; this.lookT = 0; this.searchT = 0; this.searchPts = null; this.bellRun = null; this.bellT = 0; this.flee = null;
    this.vis = 'hidden'; this.seesHero = false; this.fighting = false; this.lastSeen = -99; this.dying = null; this.carried = false; this.sunk = false;
    this.rig = this.type === 'hound' ? new B.Hound() : (B.RIGS[spec.rig || T.rig] || B.RIGS.ashigaru)(spec.type === 'civilian' || spec.type === 'target' ? spec.kind || (spec.disguised ? 'servant' : 'merchant') : spec.type === 'disciple' ? spec.color || '#3a6a3a' : this.faction);
    if (this.type !== 'hound') this.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(this.rig.solvePose);
    this.voice = spec.voice || T.voice; this.label = spec.name || T.label; this.pitch = .85 + (hashStr(this.id) % 100) / 250;
  }
  get boss() { return false; }
  /* ---- perception ---- */
  canSee(t, W, extraExp = 1) {
    const h = t, M = this.M, rangeMul = this.T.sight * (M.heightened ? 1.2 : 1) * (M.mode === 'training' ? .85 : 1);
    if (h.dead || h.dive || this.asleep || this.blindT > 0 || this.eating && this.eatT > 0) return { seen: false, exposure: 0 };
    const s = E.sees(this, h, { map: W.map, range: B.T('sightRange') * rangeMul, fov: B.T('sightFov') * (this.T.fov / 1.5) });
    if (!s.seen) return s;
    const dz = h.z - (this.z + 30);
    if (!this.T.lookUp && dz > 16 && Math.atan2(dz, Math.max(1, s.d)) > B.T('lookUp') * Math.PI / 180) return { seen: false, exposure: 0 };
    if (B.smoked(M, this, h)) return { seen: false, exposure: 0 };
    if (h.cloakT > 0 && s.d > 16 && !h.combo.busy) s.exposure *= .15;
    if (t.exposure === undefined) s.exposure *= extraExp; if (s.exposure < .04) return { seen: false, exposure: 0 };
    return s;
  }
  hearNoise(n, kind) {
    if (!this.alive || this.dying || this.mark && kind === 'step') return;
    let s = E.hears(this, n, this.M.world.map) * B.T('hearing') * (this.T.hear || 1);
    if (this.asleep) { if (s > .5 && this.sleepT < 1e8) this.wake(); else if (s > .5) { this.asleep = false; this.sleepT = 0; } else return; }
    if (s > .15) {
      if (this.civilian && !this.disguised) { if (s > .5 && (kind === 'shout' || kind === 'explosion' || kind === 'scream')) this.startFlee(); return; }
      const was = this.mind.state; this.mind.hear(Math.min(1, s), { x: n.x, y: n.y, z: n.z });
      if (kind === 'shout' || kind === 'bell') { this.mind.level = Math.max(this.mind.level, this.mind.search + .05); }
      if (was === 'calm' && this.mind.state !== 'calm') this.bark(kind === 'firecracker' || kind === 'explosion' ? 'notice' : 'notice');
      if (this.eating && s > .4) { this.eating = false; this.bait = null; }
    }
  }
  wake() { this.asleep = false; this.sleepT = 0; this.bark('notice'); }
  blind() { if (!this.alive) return; this.blindT = 1.5; this.mind.level = Math.min(this.mind.level, this.mind.search - .01); if (this.mind.state === 'alert') this.mind.state = 'search'; this.mind.last = null; this.bark('blind'); B.sfxAt('cough', this.x, this.y); }
  startFlee() {
    if (this.flee || !this.alive) return; const M = this.M;
    const near = M.guards.filter(g => g.alive && !g.civilian && g !== this).sort((a, b) => dist2(a, this) - dist2(b, this))[0];
    this.flee = near ? { x: near.x, y: near.y } : { x: this.home.x, y: this.home.y }; this.bark('civilian'); B.noise(this.x, this.y, this.z, 160, 'scream', this);
    if (near) near.mind.hear(1, M.hero ? { x: M.hero.x, y: M.hero.y, z: M.hero.z } : { x: this.x, y: this.y, z: 0 });
  }
  takeHit(src, amt, o = {}) {
    if (!this.alive || this.dying) return 0; const M = this.M;
    if (this.disguised) this.reveal();
    if (this.T.blocks && this.mind.state === 'alert' && src && !o.pierce && Math.abs(E.angDiff(this.facing, Math.atan2(src.y - this.y, src.x - this.x))) < 1) { amt *= 1 - this.T.blocks; B.sfxAt('clash', this.x, this.y); P.sparks(this.x, this.y, this.z + 18, 6, this.facing + Math.PI); }
    else if (!o.quiet) { B.sfxAt('thud', this.x, this.y); if (B.game.settings.blood === 'ink') P.bits(this.x, this.y, this.z + 16, 7, ['#d02a20', '#8a1410', '#1a1418']); P.impact(this.x, this.y, this.z + 16, 1, '#ffffff'); B.game.freeze(.04); }
    this.hp -= amt; this.hurtT = .3; if (src && !o.quiet) E.knockback(src, this, 80);
    if (this.asleep) this.asleep = false; this.eating = false;
    if (this.hp <= 0) { this.alive = false; this.dieT = 0; M.kill(this, o.kind || 'melee'); return amt; }
    if (this.civilian && !this.disguised) { this.startFlee(); M.civilianHurt(this); return amt; }
    if (src && src.isHero) { this.mind.level = 1.2; this.mind.last = { x: src.x, y: src.y, z: src.z }; if (o.kind === 'shuriken' && this.mind.state === 'calm') this.mind.level = this.mind.search + .05; }
    this.bark('hurt'); return amt;
  }
  reveal() {
    if (!this.disguised) return; this.disguised = false; this.civilian = false; this.type = 'ninja'; this.T = get('enemy', 'ninja');
    this.rig = B.RIGS.ninja(); this.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(this.rig.solvePose);
    P.smoke(this.x, this.y, this.z + 14, 14, { size: 2 }); B.sfxAt('shing', this.x, this.y); this.mind.level = 1.2; this.bark('ninja'); this.M.toast('A Red Lantern!', 'The servant was a ninja');
  }
  bark(cat, force) {
    const G = B.game, M = this.M; if (!this.alive && cat !== 'death') return;
    if (!force && (this.barkCool || 0) > G.time) return; if (!force && (M.lastBarkT || 0) > G.time - 2 && cat === 'idle') return;
    const own = this.T.barks, useOwn = own && B.STORY.barks[own] && (own === 'hound' || ['alert', 'idle', 'notice', 'chat'].includes(cat));
    const lines = B.STORY.barks[useOwn ? own : cat];
    if (!lines || !lines.length) return;
    const text = lines[Math.floor(rand() * lines.length)]; this.barkCool = G.time + 2.5; M.lastBarkT = G.time;
    this.bubble = { text, t: 0, life: clamp(text.length * .07, 1.5, 2.6) };
    if (this.type === 'hound') B.sfxAt(cat === 'alert' || cat === 'notice' ? 'bark' : 'growl', this.x, this.y); else B.Voice.bark(text, Object.assign({}, B.VOICES[this.voice] || B.VOICES.guard, { hz: (B.VOICES[this.voice] || B.VOICES.guard).hz * this.pitch }), this.x, this.y);
  }
  /* ---- one step ---- */
  update(dt, M) {
    const W = M.world, h = M.hero, G = B.game;
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.life) this.bubble = null; }
    if (this.dying) { if (this.dying.done) { this.dying = null; if (this.sunkLater) { this.sunk = true; } } return this.rigDead(dt); }
    if (!this.alive) { this.dieT = (this.dieT || 0) + dt; return this.rigDead(dt); }
    for (const k of ['stunT', 'blindT', 'staggerT', 'limpT', 'hurtT']) if (this[k] > 0) this[k] -= dt;
    if (M.cheats.freeze) { super.update(dt, W.map, { move: [0, 0] }); return this.rigLive(dt); }
    // poison and sleep from baits
    if (this.poisonT > 0) { this.poisonT -= dt; if (this.poisonT <= 0) { this.alive = false; this.dieT = 0; this.bark('poisoned', true); M.kill(this, 'poison'); return; } }
    if (this.asleep) { if (this.sleepT < 1e8) { this.sleepT -= dt; if (this.sleepT <= 0) this.wake(); } if (crand() < dt * .4) B.sfxAt('snore', this.x, this.y, { vol: .5 }); if (crand() < dt * .1) B.noise(this.x, this.y, this.z, 20, 'snore', this); super.update(dt, W.map, { move: [0, 0] }); return this.rigLive(dt); }
    // perception
    let seen = { seen: false, exposure: 0 }, who = h;
    if (h && !h.dead && !M.cheats.invisible && !M.over) seen = this.canSee(h, W, h.exposure);
    if (!seen.seen && M.escort && M.escort.alive && M.escort.freed) { const s2 = this.canSee(M.escort, W, M.escort.exposure); if (s2.seen) { seen = s2; who = M.escort; } }
    this.seesHero = seen.seen && who === h;
    if (seen.seen) this.lastSeen = G.time;
    if (this.disguised && h && Math.hypot(h.x - this.x, h.y - this.y) < 24 && !h.dive) this.reveal();
    // the mind: rise with heightened and the type's notice speed
    const m = this.mind; m.rise = B.T('suspRise') * (M.heightened ? 1.3 : 1) * (this.T.notice || 1) * (this.harmless ? 1.2 : 1); m.decay = B.T('suspDecay');
    if (this.civilian && !this.disguised) {
      m.update(dt, seen, who);
      if (!this.flee && (m.level > .6 || this.seesBody(W))) this.startFlee();
      return this.civilianMove(dt, W);
    }
    const before = m.state, st = this.blindT > 0 ? (m.update(dt, false, null), m.state === 'alert' ? 'search' : m.state) : m.update(dt, seen, who);
    if (m.changed || st !== before) this.onState(before, st, seen.seen && who === h);
    // hounds smell the hero
    if (this.T.smell && h && !h.dive && !h.dead && st !== 'alert') { const d = Math.hypot(h.x - this.x, h.y - this.y); if (d < (h.crouch ? 40 : 60) && Math.abs(h.z - this.z) < 20) { this.mind.hear(1, { x: h.x, y: h.y, z: h.z }); if ((this._sniffBark || 0) < G.time) { this._sniffBark = G.time + 2; this.bark('notice', true); B.noise(this.x, this.y, this.z, 150, 'bark', this); } } }
    // bodies and baits, while not hunting
    if (st !== 'alert' && !this.bellRun && !this.harmless) { const b = this.seesBody(W); if (b) this.foundBody(b); }
    if (st === 'calm' && !this.eating && !this.bellRun && !this.harmless || (this.mark && st === 'calm' && !this.eating)) this.lookForBait(W);
    this.fighting = st === 'alert' && h && Math.hypot(h.x - this.x, h.y - this.y) < 40;
    this.behave(dt, W, st);
    this.rigLive(dt);
  }
  onState(from, to, byHero) {
    const M = this.M;
    if (to === 'alert') {
      if (this.harmless) { this.bark('alert'); M.detected(this, byHero); B.noise(this.x, this.y, this.z, B.T('alertShout') * .6, 'shout', this); return; }
      this.bark('alert', true); B.noise(this.x, this.y, this.z, B.T('alertShout'), 'shout', this); M.detected(this, byHero); this.eating = false; this.bait = null;
      const bell = M.nearestBell(this); if (bell && !M.bellRung && !M.bellRunner && this.type !== 'archer' && this.type !== 'hound') { this.bellRun = bell; M.bellRunner = this; M.toast('He runs for the bell!', 'Stop him before it rings'); }
      if (this.type === 'samurai' && !this._drew) { this._drew = true; B.sfxAt('shing', this.x, this.y); }
    } else if (to === 'notice' && from === 'calm') this.bark('notice');
    else if (to === 'search' && from !== 'alert') this.bark('search');
    else if (to === 'calm' && (from === 'search' || from === 'alert')) { this.bark('lost'); this.returning = true; }
    else if (to === 'search' && from === 'alert') this.bark('search');
  }
  seesBody(W) {
    const M = this.M;
    for (const b of M.guards) {
      if (b.alive || b === this || b.found || b.sunk || b.carried || b.dying || b.mark || b.boss) continue;
      const d = Math.hypot(b.x - this.x, b.y - this.y); if (d > B.T('bodyRange')) continue;
      if (W.isHide(b.x, b.y) || W.isDeep(b.x, b.y)) continue;
      const exp = lerp(1 - B.T('darkness'), 1, W.lightAt(b.x, b.y)); if (exp < .35 + .1) continue;
      const s = E.sees(this, { x: b.x, y: b.y, z: b.z, chest: 6, eye: 4 }, { map: W.map, range: B.T('bodyRange'), fov: B.T('sightFov') });
      if (s.seen) return b;
    }
    return null;
  }
  foundBody(b) {
    const M = this.M; b.found = true; this.bark('body', true); this.mind.level = Math.max(this.mind.level, this.mind.search + .1); this.mind.last = { x: b.x, y: b.y, z: b.z };
    B.noise(this.x, this.y, this.z, B.T('alertShout'), 'shout', this); M.bodyFound(this, b);
    const bell = M.nearestBell(this); if (bell && !M.bellRung && !M.bellRunner && !this.T.post) { this.bellRun = bell; M.bellRunner = this; }
  }
  lookForBait(W) {
    const M = this.M; if (!M.baits.length || this.T.post && this.type === 'archer') return;
    for (const b of M.baits) {
      if (b.eaten || b.taken) continue; const d = Math.hypot(b.x - this.x, b.y - this.y), smell = this.T.smell && d < 120;
      if (d > B.T('baitRange') && !smell) continue;
      if (!smell) { const s = E.sees(this, { x: b.x, y: b.y, z: b.z, chest: 3, eye: 2 }, { map: W.map, range: B.T('baitRange'), fov: B.T('sightFov') * 1.3 }); if (!s.seen) continue; }
      this.bait = b; b.taken = this; this.eating = true; this.eatT = 0; this.bark('bait', true); return;
    }
  }
  goTo(dt, W, goal, speed, opt = {}) {
    const M = this.M, d = Math.hypot(goal.x - this.x, goal.y - this.y);
    if (d < (opt.near || 6)) { super.update(dt, W.map, { move: [0, 0] }); return true; }
    const f = B.flowFor(M, goal, this.T.climbs ? 'ninja' : 'walk'), nx = f.next(this.x, this.y);
    const tx = nx ? nx.x : goal.x, ty = nx ? nx.y : goal.y, l = Math.hypot(tx - this.x, ty - this.y) || 1;
    let mv = [(tx - this.x) / l, (ty - this.y) / l], jump = false;
    if (nx && this.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < this.r + 4) jump = true;
    const ahead = { x: this.x + mv[0] * 8, y: this.y + mv[1] * 8 }; if (W.isDeep(ahead.x, ahead.y) && this.z < 2) mv = [0, 0];
    const k = (speed === 'run' ? 1 : .5) * (this.limpT > 0 ? .5 : 1) * (this.stunT > 0 ? 0 : 1);
    // stuck against a prop (flow fields are by cell): sidestep for a moment
    if (this._side > 0) { this._side -= dt; const s = this._sideDir; mv = [mv[0] * .3 - mv[1] * s, mv[1] * .3 + mv[0] * s]; }
    else if (Math.hypot(this.vx, this.vy) < 4 && Math.hypot(mv[0], mv[1]) > .1 && this.onGround) { this._stuckT = (this._stuckT || 0) + dt; if (this._stuckT > .4) { this._stuckT = 0; this._side = .6; this._sideDir = this._sideDir === 1 ? -1 : 1; } }
    else this._stuckT = 0;
    super.update(dt, W.map, { move: [mv[0] * k, mv[1] * k], jumpPressed: jump });
    if (Math.hypot(mv[0], mv[1]) > .1) this.facing = E.approachAng(this.facing, Math.atan2(mv[1], mv[0]), dt * 8);
    return false;
  }
  stand(dt, W) { super.update(dt, W.map, { move: [0, 0] }); }
  behave(dt, W, st) {
    const M = this.M, h = M.hero, G = B.game;
    if (this.stunT > 0 || this.staggerT > 0) { if (this.swing) this.swing.cancel(); return this.stand(dt, W); }
    // the bell run
    if (this.bellRun) {
      const bl = this.bellRun;
      if (this.goTo(dt, W, bl, 'run', { near: 14 })) { this.bellT += dt; if (this.bellT > 1.5) { M.ringBell(this); this.bellRun = null; this.bellT = 0; } }
      return;
    }
    // eating a bait
    if (this.eating && this.bait) {
      if (this.goTo(dt, W, this.bait, 'walk', { near: 8 })) {
        this.eatT += dt; if (crand() < dt * 4) B.sfxAt('crunch', this.x, this.y, { vol: .6 });
        if (this.eatT > 2) { const b = this.bait; b.eaten = true; this.eating = false; this.bait = null; if (b.kind === 'poison' && !this.mark) { this.poisonT = 3; this.bark('poisoned', true); this.eatenPoison = true; } else { this.asleep = true; this.sleepT = 25; this.bark('sleepy', true); if (this.mark) this.M.setFlag('trick', true); } }
      }
      return;
    }
    if (st === 'alert' && h) return this.fight(dt, W, h);
    if (this.swing && this.swing.busy) { this.swing.update(dt); return this.stand(dt, W); }
    if (st === 'notice') { if (this.mind.last) this.facing = E.approachAng(this.facing, Math.atan2(this.mind.last.y - this.y, this.mind.last.x - this.x), dt * 3); return this.stand(dt, W); }
    if (st === 'search' && this.mind.last && !this.T.post) {
      if (this.goTo(dt, W, this.mind.last, 'walk', { near: 10 })) { this.lookT += dt; this.facing += Math.sin(this.lookT * 1.6) * dt * 1.6; if (this.lookT > 4) { this.lookT = 0; const a = rand() * TAU, r = 24 + rand() * 32; const nx = this.mind.last.x + Math.cos(a) * r, ny = this.mind.last.y + Math.sin(a) * r; if (W.nav.walkable(Math.floor(nx / CELL), Math.floor(ny / CELL))) this.mind.last = { x: nx, y: ny, z: 0 }; } }
      return;
    }
    if (st === 'search') { if (this.mind.last) this.facing = E.approachAng(this.facing, Math.atan2(this.mind.last.y - this.y, this.mind.last.x - this.x), dt * 3); return this.stand(dt, W); }
    // calm: route, post, chat, idle barks
    this.idleBark -= dt; if (this.idleBark <= 0) { this.idleBark = 12 + rand() * 13; this.bark(this.mode === 'chat' ? 'chat' : 'idle'); }
    if (this.returning) { if (this.goTo(dt, W, this.route.length ? this.route[this.ri] : this.home, 'walk', { near: 8 })) { this.returning = false; if (!this.route.length) this.facing = this.home.facing; } return; }
    if (this.mode === 'patrol' && this.route.length) {
      if (this.waitT > 0) { this.waitT -= dt; const p = this.route[this.ri]; if (p.look !== null) this.facing = E.approachAng(this.facing, p.look + Math.sin(this.waitT * 1.3) * .5, dt * 2); return this.stand(dt, W); }
      const p = this.route[this.ri]; if (this.goTo(dt, W, p, 'walk', { near: 6 })) { this.waitT = p.wait; this.ri = (this.ri + 1) % this.route.length; }
      return;
    }
    if (this.mode === 'chat' && this.partner) { const pt = M.guards.find(g => g.id === this.partner && g.alive); if (pt) this.facing = E.approachAng(this.facing, Math.atan2(pt.y - this.y, pt.x - this.x), dt * 3); }
    else if (this.mode === 'post' || this.mode === 'eat') { this.lookT += dt; this.facing = this.home.facing + Math.sin(this.lookT * TAU / 8) * (this.mode === 'eat' ? .2 : 1.05); }
    if (Math.hypot(this.home.x - this.x, this.home.y - this.y) > 8 && this.mode !== 'patrol') { this.goTo(dt, W, this.home, 'walk'); return; }
    return this.stand(dt, W);
  }
  fight(dt, W, h) {
    const M = this.M, G = B.game, d = Math.hypot(h.x - this.x, h.y - this.y), same = Math.abs(h.z - this.z) < 12;
    if (this.harmless) { this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * 6); if (d > 30) this.goTo(dt, W, h, 'run', { near: 24 }); else this.stand(dt, W); return; }
    if (this.swing && this.swing.busy) {
      const began = this.swing.update(dt); this.stand(dt, W);
      if (began === 'active') { if (E.inArc(this, this.facing, h, 22 + (this.reachBonus || 0), 1.2, 12)) B.damage(this, h, this.swingDmg, { kind: 'melee' }); }
      return;
    }
    // ranged: archers draw and loose; ninja throw shuriken at range
    if (this.T.ranged && (d > 40 || this.type === 'archer')) {
      const los = W.map.sight(this, h) && !B.smoked(M, this, h);
      if (this.type === 'archer' && d < 26 && same) { const away = Math.atan2(this.y - h.y, this.x - h.x); if (!this.T.post || this.z < 4) { this.goTo(dt, W, { x: this.x + Math.cos(away) * 30, y: this.y + Math.sin(away) * 30 }, 'run'); return; } }
      this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * 6);
      if (los) {
        this.drawT += dt; this.drawing = true;
        const need = this.type === 'archer' ? 1.6 * B.T('enemyWindup') : .9;
        if (this.drawT > need) { this.drawT = 0; this.drawing = false; M.enemyShoot(this, h, this.T.ranged); }
        if (this.type === 'archer' || d > 90) return this.stand(dt, W);
      } else { this.drawT = 0; this.drawing = false; if (this.T.post) return this.stand(dt, W); }
    }
    if (!this.T.moves.length) return this.stand(dt, W);
    if (d < 20 + (this.reachBonus || 0) && same && !h.dead) {
      this.facing = Math.atan2(h.y - this.y, h.x - this.x);
      if ((this._atkCool || 0) < G.time) {
        const mv = this.T.moves[Math.floor(rand() * this.T.moves.length)], name = mv[0] === 'bite' ? 'thrust' : mv[0];
        this.swing = new E.Attack(name, { wind: mv[2] * B.T('enemyWindup'), recover: .35, reach: 9 }); this.swing.o = { wind: mv[2] * B.T('enemyWindup') }; this.swingDmg = mv[1];
        this.swing.start(); this._atkCool = G.time + .9 + rand() * .6; B.sfxAt('whoosh', this.x, this.y, { vol: .4 });
        if (this.type === 'hound') B.sfxAt('growl', this.x, this.y);
      }
      return this.stand(dt, W);
    }
    if (this.T.post && this.type === 'archer') return this.stand(dt, W);
    this.goTo(dt, W, h, 'run', { near: 16 });
  }
  civilianMove(dt, W) {
    if (this.flee) { if (this.goTo(dt, W, this.flee, 'run', { near: 14 })) { this.cowerT = (this.cowerT || 0) + dt; } return this.rigLive(dt); }
    if (this.mode === 'patrol' && this.route.length) { if (this.waitT > 0) { this.waitT -= dt; this.stand(dt, W); } else { const p = this.route[this.ri]; if (this.goTo(dt, W, p, 'walk')) { this.waitT = p.wait; this.ri = (this.ri + 1) % this.route.length; } } }
    else { this.stand(dt, W); this.lookT += dt; this.facing = this.home.facing + Math.sin(this.lookT * .5) * .4; }
    this.idleBark -= dt; if (this.idleBark <= 0) { this.idleBark = 14 + rand() * 12; this.bark(this.target ? 'target' : 'chat'); }
    this.rigLive(dt);
  }
  rigLive(dt) {
    const st = this.rigState({ attack: this.swing ? this.swing.state : null, stance: this.mind.state === 'alert' && !this.civilian ? 'ready' : null, hurt: this.hurtT > 0 || this.staggerT > 0, point: this.drawing,
      pose: this.asleep ? 'kneel' : this.eating && this.eatT > 0 ? 'crouch' : this.flee && this.cowerT > 0 ? 'kneel' : this.blindT > 0 ? 'guard' : this.mark && this.defeated ? 'kneel' : null,
      expr: this.mind.state === 'alert' ? 'angry' : this.blindT > 0 || this.poisonT > 0 ? 'wince' : null, run: this.mode === 'chat' && this.mind.state === 'calm' ? 0 : undefined });
    if (this.type === 'hound') { this.rig.update(dt, { x: this.x, y: this.y, z: this.z, vx: this.vx, vy: this.vy, facing: this.facing, sniff: this.mind.state === 'search', bark: this.bubble && this.bubble.t < .6, eat: this.eating && this.eatT > 0, hurt: this.hurtT > 0 }); return; }
    const R = this.rig, bp = R._bentou || (R._bentou = {}); bp.eat = approach(bp.eat || 0, this.eating && this.eatT > 0 ? 1 : 0, dt * 6);
    R.update(dt, st);
  }
  rigDead(dt) {
    if (this.type === 'hound') { this.rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, down: true }); return; }
    if (this.dying && this.dying.other === this) { this.rig.update(dt, this.dying.otherState()); return; }
    if (this.mark) { this.rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, vx: 0, vy: 0, pose: 'kneel' }); return; }
    this.rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, vx: 0, vy: 0, down: 1, pose: (this.dieT || 0) < .9 && !this.cutKind ? 'die' : null });
  }
}
B.Guard = Guard;

/* ---- Shadow Sight (20 Hz) and the Ki gauge ---- */
B.perceive = (M, dt) => {
  M._percT = (M._percT || 0) - dt; if (M._percT > 0) return; M._percT = .05;
  const h = M.hero, W = M.world, G = B.game; if (!h) return;
  const reveal = G.settings.showAll || M.cheats.reveal || M.mode === 'attract' || M.mode === 'workshop-view';
  const focus = h.focus, kr = B.T('kiRange') * (focus ? 220 / 160 : 1);
  const eye = h.peek ? { x: h.peek.x, y: h.peek.y, z: h.z } : h;
  let K = 0, lvl = -1; const order = ['calm', 'notice', 'search', 'alert'];
  for (const g of M.guards.concat(M.bosses)) {
    if (!g.alive && !g.dying) { g.vis = 'visible'; continue; }
    const d = Math.hypot(g.x - h.x, g.y - h.y);
    let vis = 'hidden';
    if (reveal || g.boss && g.active) vis = 'visible';
    else if (d < 200) { let ok = false; try { ok = W.map.sight({ x: eye.x, y: eye.y, z: eye.z, eye: h.crouch ? 16 : 30 }, g); } catch (e) { ok = true; } vis = ok ? 'visible' : d < kr ? 'sensed' : 'hidden'; }
    else if (d < kr) vis = 'sensed';
    g.vis = vis;
    if ((vis !== 'hidden' || d < kr) && d < kr && !g.civilian) { K = Math.max(K, Math.round(99 * (1 - d / kr))); lvl = Math.max(lvl, order.indexOf(g.mind ? g.mind.state : 'calm')); }
  }
  M.ki = K; M.kiState = lvl < 0 ? 'calm' : order[lvl];
};

/* ---- 53-bosses ---- */
/* 53-bosses: duels. A Boss has HP, phases and a pattern (moves picked by distance and phase); every move telegraphs
 * with a wind-up pose, a red ground decal and a sound. Stealth kills don't work on them; parries work where noted.
 * Also the escort, Tobei, and the bosses' summons (Hotaru's clones, Kurogane's spirit flames). */
def('boss', 'ittetsu', { name: 'Brother Ittetsu', rig: 'ittetsu', hp: 120, voice: 'ittetsu', walk: 40, run: 70, dmgMul: .35, nonLethal: true,
  pattern(b, d) { if (d > 34) return 'approach'; const r = rand(); return r < .4 ? 'overhead' : r < .7 ? 'thrust' : 'combo3'; } });
def('boss', 'gonroku', { name: 'Gonroku the Iron Ox', rig: 'gonroku', hp: 300, voice: 'gonroku', walk: 38, run: 80, reach: 8,
  pattern(b, d) { const r = rand(); if (b.phase === 2 && r < .25 && d < 70) return 'quake'; if (d > 60 && r < .6) return 'charge'; if (d > 36) return 'approach'; return r < .55 ? 'smash' : 'sweep'; } });
def('boss', 'hotaru', { name: 'Hotaru of the Red Lantern', rig: 'hotaru', hp: 220, voice: 'hotaru', walk: 50, run: 110,
  pattern(b, d) { const r = rand(); if (b.phase === 2 && !b.M.clones.some(c => c.alive) && r < .35) return 'clones'; if (r < .25) return 'vanish'; if (d > 50) return r < .6 ? 'fan' : 'approach'; return r < .6 ? 'dash' : 'fan'; } });
def('boss', 'kurogane', { name: 'Chamberlain Kurogane', rig: 'kurogane', hp: 420, voice: 'kurogane', walk: 36, run: 70, reach: 10,
  pattern(b, d) { const r = rand(); if (b.phase === 2) { if (r < .2) return 'fireballs'; if (r < .32 && d < 50) return 'roar'; if (r < .44) return 'flame'; if (r < .52 && !b.M.spirits.some(s => s.alive)) return 'spirits'; } if (r < .15 && b.phase === 1) return 'guard'; if (d > 44) return r < .5 ? 'lunge' : 'approach'; return 'threecut'; } });
const MOVES = {
  approach: { wind: 0, act: .9, rec: 0 },
  overhead: { wind: .6, act: .2, rec: .5, dmg: 18, reach: 28, arc: .6, parry: true, pose: 'overhead', decal: 'arc' },
  thrust: { wind: .45, act: .25, rec: .5, dmg: 14, reach: 38, arc: .25, lunge: 120, pose: 'thrust', decal: 'line' },
  combo3: { wind: .3, act: .9, rec: .5, dmg: 8, reach: 26, arc: .9, hits: 3, pose: 'slash', decal: 'arc' },
  smash: { wind: .55, act: .2, rec: .4, dmg: 30, reach: 42, arc: .55, pose: 'overhead', decal: 'arc', stuck: 1.2, shake: 6 },
  sweep: { wind: .4, act: .25, rec: .4, dmg: 20, reach: 36, arc: 1.05, parry: true, pose: 'spin', decal: 'arc' },
  charge: { wind: .6, act: 1, rec: .4, dmg: 24, charge: 160, pose: 'thrust', decal: 'line' },
  quake: { wind: .7, act: .8, rec: .5, dmg: 18, ring: 64, pose: 'overhead', decal: 'ring' },
  fan: { wind: .45, act: .1, rec: .5, pose: 'throw', shots: 4 },
  dash: { wind: .3, act: .3, rec: .4, dmg: 16, reach: 22, arc: .8, lunge: 220, parry: true, pose: 'slash', decal: 'line' },
  vanish: { wind: .25, act: 1.2, rec: .3, dmg: 18, pose: 'cast' },
  clones: { wind: .5, act: .2, rec: .4, pose: 'cast' },
  threecut: { wind: .36, act: 1.0, rec: .55, dmg: 16, reach: 34, arc: .9, hits: 3, parry: true, pose: 'slash', decal: 'arc' },
  lunge: { wind: .5, act: .3, rec: .6, dmg: 24, reach: 30, arc: .3, lunge: 230, pose: 'thrust', decal: 'line' },
  guard: { wind: .1, act: 2, rec: .2, pose: 'block' },
  flame: { wind: .5, act: 3, rec: .3, pose: 'cast' },
  fireballs: { wind: .6, act: .9, rec: .5, pose: 'cast', balls: 3 },
  roar: { wind: .7, act: .3, rec: .6, ring: 40, pose: 'cheer', decal: 'ring' },
  spirits: { wind: .6, act: .2, rec: .4, pose: 'cast' }
};
class Boss extends E.Mover {
  constructor(id, spec, M) {
    const D = get('boss', id), at = { x: cc(spec.at[0]), y: cc(spec.at[1]) };
    super({ x: at.x, y: at.y, z: spec.z || M.world.map.groundAt(at.x, at.y, 4, 400) || 0, r: 7, walk: D.walk, run: D.run, climbMax: 0, hopMax: 0 });
    Object.assign(this, { D, bossId: id, M, spec, name: D.name, hpMax: Math.round(D.hp * B.T('enemyHp')), alive: true, active: false, phase: 1, move: null, cool: 1.2, staggerT: 0, stuckT: 0, hurtT: 0,
      facing: Math.PI / 2, rig: B.RIGS[D.rig](), mind: { state: 'alert', level: 1.2 }, vis: 'visible', reachBonus: D.reach || 0, swing: null, guardT: 0, home: at, label: D.name });
    this.hp = this.hpMax;
  }
  get boss() { return true; }
  hearNoise() { /* a boss in its duel already knows where you are: noise changes nothing */ }
  takeHit(src, amt, o = {}) {
    if (!this.alive || !this.active) return 0; const M = this.M;
    if (this.guardT > 0 && src && Math.abs(E.angDiff(this.facing, Math.atan2(src.y - this.y, src.x - this.x))) < 1.1 && !o.pierce) { B.sfxAt('clash', this.x, this.y); P.sparks(this.x, this.y, this.z + 26, 8, this.facing); M.toast('Iron Guard', 'Flank him, or use your tools'); return 0; }
    if (o.kind === 'melee' || o.kind === 'riposte') { B.sfxAt('thud', this.x, this.y); P.impact(this.x, this.y, this.z + 22, 1.2, '#ffffff'); if (B.game.settings.blood === 'ink') P.bits(this.x, this.y, this.z + 20, 6, ['#d02a20', '#1a1418']); B.game.freeze(.05); }
    this.hp -= amt; this.hurtT = .25; B.emit('bossHit', { b: this, amt });
    if (this.phase === 1 && this.hp <= this.hpMax / 2 && this.bossId !== 'ittetsu') this.enterPhase2();
    if (this.hp <= 0) { this.hp = 0; M.bossDefeated(this); }
    return amt;
  }
  enterPhase2() {
    const M = this.M; this.phase = 2; this.move = null; this.cool = 1.4; B.game.flash('#ff6a3a', .15, .6); B.sfx('roar');
    if (this.bossId === 'kurogane') { this.rig = B.RIGS.kuroganeOni(); this.r = 8; M.say('kurogane', 'kur_phase2'); P.fire(this.x, this.y, this.z + 10, 30, { size: 2 }); }
    else if (this.bossId === 'gonroku') M.say('gonroku', 'gon_phase2');
    else if (this.bossId === 'hotaru') M.say('hotaru', 'hot_clones');
    B.game.audio.tempo((B.SONGS.boss.bpm || 140) + 10);
  }
  start() { this.active = true; this.cool = 1.4; }
  update(dt, M) {
    const h = M.hero, W = M.world, G = B.game;
    for (const k of ['staggerT', 'stuckT', 'hurtT', 'guardT']) if (this[k] > 0) this[k] -= dt;
    if (this.phase === 2 && this.bossId === 'kurogane' && crand() < dt * 10) P.add({ kind: 'ember', x: this.x + (crand() - .5) * 14, y: this.y + (crand() - .5) * 14, z: this.z + 10 + crand() * 30, vz: 30, life: .8, color: '#ff8a3a' });
    if (!this.alive || !this.active || M.cheats.freeze || !h) { super.update(dt, W.map, { move: [0, 0] }); return this.rigUpdate(dt); }
    const d = Math.hypot(h.x - this.x, h.y - this.y);
    if (this.staggerT > 0 || this.stuckT > 0) { super.update(dt, W.map, { move: [0, 0] }); return this.rigUpdate(dt); }
    if (!this.move) {
      this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * 6);
      this.cool -= dt;
      if (d > 30) { const a = Math.atan2(h.y - this.y, h.x - this.x), k = this.cool > 0 ? .5 : 1; super.update(dt, W.map, { move: [Math.cos(a) * k, Math.sin(a) * k] }); }
      else super.update(dt, W.map, { move: [0, 0] });
      if (this.cool <= 0 && !h.dead) { const id = this.D.pattern(this, d); if (id === 'approach') this.cool = .5; else this.begin(id); }
      return this.rigUpdate(dt);
    }
    const mv = this.move, S = mv.S; mv.t += dt;
    const wind = S.wind * B.T('enemyWindup') * (this.phase === 2 ? .82 : 1);
    if (mv.phase === 'wind') { this.facing = E.approachAng(this.facing, Math.atan2(h.y - this.y, h.x - this.x), dt * (mv.id === 'charge' || mv.id === 'lunge' ? 10 : 4)); super.update(dt, W.map, { move: [0, 0] }); if (mv.t >= wind) { mv.phase = 'act'; mv.t = 0; this.onActive(mv); } }
    else if (mv.phase === 'act') { this.during(mv, dt); if (mv.t >= S.act) { mv.phase = 'rec'; mv.t = 0; this.onEnd(mv); } }
    else { super.update(dt, W.map, { move: [0, 0] }); if (mv.t >= S.rec) { this.move = null; this.cool = (this.phase === 2 ? .5 : .9) + rand() * .5; } }
    // the swing state for parries
    this.swing = mv && mv.phase === 'wind' && S.parry ? { phase: 'wind', u: clamp(mv.t / wind, 0, 1), o: { wind }, cancel: () => { this.move = null; this.cool = 1.4; } } : null;
    this.windMul = 1;
    return this.rigUpdate(dt);
  }
  begin(id) { const S = MOVES[id]; this.move = { id, S, t: 0, phase: 'wind', hits: 0 }; B.sfxAt(id === 'vanish' || id === 'dash' ? 'shing' : id === 'roar' ? 'roar' : 'whoosh', this.x, this.y, { vol: .6 }); }
  hitHero(dmg, reach, arc, o = {}) {
    const h = this.M.hero; if (!h || h.dead) return false;
    if (Math.hypot(h.x - this.x, h.y - this.y) > reach + 6 || Math.abs(h.z - this.z) > 16) return false;
    if (arc < 3 && Math.abs(E.angDiff(this.facing, Math.atan2(h.y - this.y, h.x - this.x))) > arc) return false;
    return B.damage(this, h, dmg * (this.D.dmgMul || 1), o) > 0;
  }
  onActive(mv) {
    const S = mv.S, M = this.M, h = M.hero, G = B.game, W = M.world;
    if (S.dmg && S.reach && !S.hits && !S.lunge) { const hit = this.hitHero(S.dmg, S.reach, S.arc); if (S.shake) G.shake(S.shake); if (S.stuck && !hit) { this.stuckT = S.stuck; M.toast('He is stuck!', 'Strike now'); } P.dust(this.x + Math.cos(this.facing) * 20, this.y + Math.sin(this.facing) * 20, this.z, 8); B.sfxAt('thud', this.x, this.y); }
    if (mv.id === 'fan') { const n = this.phase === 2 ? 5 : S.shots, a0 = Math.atan2(h.y - this.y, h.x - this.x); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .22; M.shots.fire({ x: this.x, y: this.y, z: this.z + 20, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, team: 'enemy', life: 1.2, dmg: 6, color: '#ff8a8a' }); } B.sfxAt('shuriken', this.x, this.y); P.glints(this.x, this.y, this.z + 20, 4, '#ff6a4a'); }
    if (mv.id === 'vanish') { P.smoke(this.x, this.y, this.z + 14, 20, { size: 2.5 }); B.sfxAt('smoke', this.x, this.y); this.hidden = true; }
    if (mv.id === 'clones') { M.spawnClones(this); }
    if (mv.id === 'guard') { this.guardT = S.act; }
    if (mv.id === 'roar') { G.shake(5); for (const k of [0, 1]) P.ring(this.x, this.y, 4, 40 + k * 10, '#ff6a3a', .5); if (h && Math.hypot(h.x - this.x, h.y - this.y) < 40 && !(M.intent && M.intent.blockDown)) { h.stunT = 1; B.damage(this, h, 8, { pierce: true }); M.toast('Stunned!', 'Block a roar next time'); } }
    if (mv.id === 'spirits') M.spawnSpirits(this);
    if (mv.id === 'fireballs') { for (let i = 0; i < S.balls; i++) { const tx = h.x + (rand() - .5) * 40, ty = h.y + (rand() - .5) * 40, v = E.arc({ x: this.x, y: this.y, z: this.z + 30 }, { x: tx, y: ty, z: h.z }, 700, { apex: 40 + i * 8 }); M.fireballs.push({ x: this.x, y: this.y, z: this.z + 30, vx: v.vx, vy: v.vy, vz: v.vz, tx, ty }); } B.sfxAt('boom', this.x, this.y, { vol: .4 }); }
    if (mv.id === 'charge' || S.lunge) { mv.dir = this.facing; }
    if (mv.id === 'quake') { mv.r = 0; G.shake(6); B.sfxAt('boom', this.x, this.y); }
  }
  during(mv, dt) {
    const S = mv.S, M = this.M, W = M.world, h = M.hero;
    if (mv.id === 'charge' || S.lunge) {
      const sp = mv.id === 'charge' ? S.charge : S.lunge * (mv.t < S.act * .6 ? 1 : .3), vx = Math.cos(mv.dir) * sp, vy = Math.sin(mv.dir) * sp, ox = this.x, oy = this.y;
      super.update(dt, W.map, { move: [0, 0] }); this.x += vx * dt; this.y += vy * dt;
      if (W.map.collide) W.map.collide(this);
      if (Math.hypot(this.x - ox, this.y - oy) < sp * dt * .4 && mv.id === 'charge') { this.stuckT = 2; this.move.phase = 'rec'; this.move.t = 0; B.sfxAt('thud', this.x, this.y); B.game.shake(5); M.toast('He hit the wall!', 'He is stunned'); }
      if (!mv.hitDone && this.hitHero(S.dmg, 18 + (S.reach ? 4 : 0), 3)) mv.hitDone = true;
      if (crand() < .5) P.dust(this.x, this.y, this.z, 1);
      return;
    }
    super.update(dt, W.map, { move: [0, 0] });
    if (S.hits) { const k = Math.floor(mv.t / (S.act / S.hits)); if (k > mv.hits - 1 && mv.hits < S.hits) { mv.hits++; this.hitHero(S.dmg, S.reach, S.arc); B.sfxAt('whoosh', this.x, this.y, { vol: .5 }); } }
    if (mv.id === 'quake') { const r0 = mv.r; mv.r = mv.t / S.act * S.ring; if (h && !mv.hitDone) { const d = Math.hypot(h.x - this.x, h.y - this.y); if (d > r0 - 2 && d <= mv.r + 2 && h.onGround && Math.abs(h.z - this.z) < 10) { mv.hitDone = true; B.damage(this, h, S.dmg, { unblockable: true }); } } }
    if (mv.id === 'vanish' && mv.t > S.act * .9 && this.hidden) { this.hidden = false; const a = h.facing + Math.PI; this.x = h.x + Math.cos(a) * 16; this.y = h.y + Math.sin(a) * 16; this.facing = Math.atan2(h.y - this.y, h.x - this.x); P.smoke(this.x, this.y, this.z + 14, 10, { size: 2 }); B.sfxAt('shing', this.x, this.y); this.hitHero(S.dmg, 24, 1.2); }
    if (mv.id === 'flame' && crand() < dt * 12) { M.flames.push({ x: this.x, y: this.y, z: this.z, t: 3, r: 10 }); }
  }
  onEnd(mv) { if (mv.id === 'vanish') this.hidden = false; }
  rigUpdate(dt) {
    const mv = this.move, S = mv && mv.S, wind = S ? S.wind * B.T('enemyWindup') : 1;
    let attack = null, pose = null;
    if (mv && S.pose && E.MOVES[S.pose]) { if (mv.phase === 'wind') attack = E.move(S.pose, Math.min(.33, mv.t / Math.max(.01, wind) * .33)); else if (mv.phase === 'act') attack = E.move(S.pose, .33 + Math.min(.67, mv.t / Math.max(.01, S.act) * .67)); }
    else if (mv && S.pose) pose = S.pose;
    if (!this.alive) pose = this.D.nonLethal ? 'kneel' : null;
    this.rig.update(dt, this.rigState({ attack, pose, stance: this.active ? 'ready' : null, hurt: this.hurtT > 0 || this.staggerT > 0, expr: this.active ? 'angry' : null, down: !this.alive && !this.D.nonLethal ? Math.min(1, (this.deadT || 0) * 2) : undefined }));
    if (!this.alive) this.deadT = (this.deadT || 0) + dt;
  }
}
B.Boss = Boss;
B.BOSS_MOVES = MOVES;

/* ---- Tobei, the courier to bring home: follows, waits, crouches and swims with the hero, hides behind them ---- */
class Escort extends E.Mover {
  constructor(spec, M) {
    super({ x: cc(spec.at[0]), y: cc(spec.at[1]), z: 0, r: 5, walk: 40, run: 82, sneak: 30, climbMax: 14, hopMax: 30 });
    Object.assign(this, { M, id: spec.id || 'tobei', hpMax: spec.hp || 60, alive: true, freed: false, waiting: false, facing: 0, rig: B.RIGS.tobei(), exposure: 1, hurtT: 0, barkT: 4, bubble: null, mind: { state: 'calm' }, vis: 'visible' });
    this.hp = this.hpMax; this.rig.solvePose = (base => function () { base.call(this); B.postPose(this); })(this.rig.solvePose);
  }
  get boss() { return false; }
  toggle() { this.waiting = !this.waiting; this.say(this.waiting ? 'tobei_wait' : 'tobei_follow'); }
  say(key) { const t = B.STORY.lines[key]; if (!t) return; this.bubble = { text: t, t: 0, life: 2.4 }; B.Voice.bark(t, 'tobei', this.x, this.y); }
  takeHit(src, amt) { if (!this.alive) return 0; this.hp -= amt; this.hurtT = .3; B.sfxAt('thud', this.x, this.y); if (this.hp <= 0) { this.hp = 0; this.alive = false; this.M.fail('Tobei has fallen.'); } else if (rand() < .4) this.say('tobei_hurt'); return amt; }
  update(dt, M) {
    const h = M.hero, W = M.world; if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.life) this.bubble = null; }
    if (this.hurtT > 0) this.hurtT -= dt;
    const deep = this.z < 2 && W.isDeep(this.x, this.y);
    if (!this.alive || !this.freed || !h) { super.update(dt, W.map, { move: [0, 0] }); return this.rigUp(dt, deep); }
    const hunted = M.guards.some(g => g.alive && g.mind.state === 'alert' && Math.hypot(g.x - this.x, g.y - this.y) < 120);
    const d = Math.hypot(h.x - this.x, h.y - this.y);
    if (d > 160 && !h.swim && !M.visibleTo(this)) { const a = h.facing + Math.PI; const nx = h.x + Math.cos(a) * 18, ny = h.y + Math.sin(a) * 18; if (W.map.standable(nx, ny, h.z, 4)) { this.x = nx; this.y = ny; this.z = h.z; } }
    let move = [0, 0];
    if ((!this.waiting || hunted) && (d > (hunted ? 14 : 26))) {
      const f = this._flow || (this._flow = new E.FlowField(W.map, { drop: 30 })); if (this._fg !== Math.floor(h.x / 16) + ',' + Math.floor(h.y / 16)) { this._fg = Math.floor(h.x / 16) + ',' + Math.floor(h.y / 16); f.update(h.x, h.y); }
      const nx = f.next(this.x, this.y), tx = nx ? nx.x : h.x, ty = nx ? nx.y : h.y, l = Math.hypot(tx - this.x, ty - this.y) || 1, k = d > 60 || hunted ? 1 : .55;
      move = [(tx - this.x) / l * k, (ty - this.y) / l * k];
    }
    this.crouch = h.crouch && !deep; this.run = deep ? 28 : 82; this.walk = deep ? 28 : 40;
    super.update(dt, W.map, { move, crouch: this.crouch });
    if (Math.hypot(move[0], move[1]) > .1) this.facing = Math.atan2(move[1], move[0]);
    this.exposure = deep ? .6 : lerp(1 - B.T('darkness'), 1, W.lightAt(this.x, this.y)) * (W.isHide(this.x, this.y) && this.crouch ? .15 : 1) * (this.crouch ? B.T('crouchVis') / .6 : 1);
    this.barkT -= dt; if (this.barkT <= 0) { this.barkT = 16 + rand() * 10; if (!hunted) this.say(rand() < .5 ? 'tobei_idle1' : 'tobei_idle2'); else this.say('tobei_scared'); }
    this.rigUp(dt, deep);
  }
  rigUp(dt, deep) { const st = this.rigState({ hurt: this.hurtT > 0, pose: !this.freed ? 'kneel' : null }); if (deep) st.down = .6; this.rig.update(dt, st); }
}
B.Escort = Escort;

/* ---- 60-mission ---- */
/* 60-mission: the mission runtime shared by story, Missions, the Shadow Trial, the hub round, attract mode and Workshop
 * test plays. Objectives (assassinate, retrieve, rescue, escort, reach, defeat, interact, stopTimer, flag), triggers,
 * checkpoints, the moon timer, alarm bells and reinforcements, fail states; and the score, ranks, unlocks and saves. */
class Mission {
  constructor(levelId, o = {}) {
    const spec = o.spec ? JSON.parse(JSON.stringify(o.spec)) : B.levelSpec(levelId);
    this.level = spec; this.levelId = levelId; this.o = o; this.mode = o.mode || 'story'; this.missionId = o.missionId || levelId; this.auto = !!o.auto;
    this.charId = o.character || 'sojiro'; this.world = new World(spec); B.mission = this; B.clearFlows();
    this.cheats = Object.assign({ god: false, invisible: false, noclip: false, infTools: false, oneHit: false, freeze: false, reveal: false }, o.cheats || {});
    this.stats = { silentCuts: 0, kills: 0, cleanKills: 0, detections: 0, civiliansHarmed: 0, optionalDone: 0, tools: 0, retries: o.retries || 0, grapples: 0, cutKinds: {} };
    this.t = 0; this.over = false; this.result = null; this.failReason = null; this.noises = []; this.lobs = []; this.clouds = []; this.traps = []; this.baits = []; this.flames = []; this.fireballs = []; this.spirits = []; this.clones = [];
    this.flags = {}; this.heightened = false; this.heightenT = 0; this.bellRung = false; this.bellRunner = null; this.waves = 0; this.lastDetect = -99; this.ki = 0; this.kiState = 'calm';
    this.toastQ = []; this.hitFlash = 0; this.toolFlash = 0; this.slowmoT = 0; this.splash = null; this.flashT = 0; this.place = null; this.placeT = 0; this.bossBar = null; this.letterbox = 0; this.cine = null;
    this.shots = new E.Bullets(B.game, { plane: 'ground' });
    this.talk = new E.Dialog(B.game, { voice: null, speed: B.ts() }); this.talk.voice = null; this.talkWho = null;
    this.bento = B.Bento.make(o.loadout || (get('mission', this.missionId) || {}).loadoutHint || ['riceball', 'shuriken', 'smoke', 'poison', 'firecracker', 'caltrops', 'riceball', 'shuriken']);
    const hs = spec.hero || { at: [2, 2] };
    this.hero = B.makeHero(this.world, this.charId, { x: cc(hs.at[0]), y: cc(hs.at[1]), z: hs.z || 0, facing: (hs.facing || 0) * Math.PI / 180 }, { stats: (this.mode === 'hub' || this.mode === 'trial') ? 'trial' : null, rig: o.rig ? o.rig() : null });
    this.guards = (spec.guards || []).concat((spec.civilians || []).map(c => Object.assign({ type: c.disguised ? 'civilian' : c.type === 'target' ? 'target' : 'civilian' }, c, { kind: c.kind || c.type, type: c.type === 'target' ? 'target' : 'civilian' }))).map(g => new Guard(g, this));
    this.bosses = []; if (spec.boss) this.bosses.push(new Boss(spec.boss.id, spec.boss, this));
    this.escort = spec.escort ? new Escort(spec.escort, this) : null;
    this.pickups = (spec.pickups || []).map(p => Object.assign({ x: cc(p.at[0]), y: cc(p.at[1]), z: p.z || 0, taken: false }, p));
    this.interacts = (spec.interact || []).map(it => Object.assign({ x: cc(it.at[0]), y: cc(it.at[1]), z: it.z || 0, done: false, prog: 0, active: it.active !== false }, it));
    this.talkers = []; for (const n of spec.npcs || []) this.talkers.push(this.makeNpc(n));
    this.bells = (spec.bells || []).map(b => ({ x: cc(b[0]), y: cc(b[1]) })); this.barracks = (spec.barracks || []).map(b => ({ x: cc(b[0]), y: cc(b[1]) }));
    for (const b of this.bells) this.world.props.push({ id: 'hansho', x: b.x, y: b.y - 6, o: { solid: false } });
    this.exit = spec.exit ? { x: cc(spec.exit.at[0]), y: cc(spec.exit.at[1]), r: (spec.exit.r || 1.5) * CELL } : null;
    this.objectives = (spec.objectives || []).map(ob => Object.assign({ state: ob.hidden ? 'hidden' : 'active', n: 0 }, ob));
    this.triggers = (spec.triggers || []).map(t => Object.assign({ fired: false }, t));
    this.timer = spec.timer ? { left: spec.timer.seconds, max: spec.timer.seconds, stopped: false, fail: spec.timer.fail, stopOn: spec.timer.stopOn } : null;
    this.checkpointData = null; this.snapshot('start');
    if (o.checkpoint) this.restore(o.checkpoint);
  }
  /* ---- simple NPCs: Granny at the training's end, Tobei in his cage ---- */
  makeNpc(n) {
    const M = this, rig = B.RIGS[n.rig] ? B.RIGS[n.rig]() : B.RIGS.granny();
    return { id: n.id, x: cc(n.at[0]), y: cc(n.at[1]), z: n.z || 0, facing: (n.facing || 90) * Math.PI / 180, rig, talkLabel: n.label || 'Talk', line: n.line, speaker: n.speaker || n.id,
      canTalk: () => !n.when || M.objDone(n.when), talk() { if (n.line) M.say(n.speaker || n.id, n.line); if (n.flag) M.setFlag(n.flag, true); },
      update(dt) { rig.update(dt, { x: this.x, y: this.y, z: this.z, facing: this.facing, vx: 0, vy: 0 }); } };
  }
  /* ---- the step ---- */
  update(dt, intent) {
    const G = B.game, h = this.hero; this.intent = intent; this.t += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt); this.toolFlash = Math.max(0, this.toolFlash - dt); this.flashT = Math.max(0, this.flashT - dt); this.placeT = Math.max(0, this.placeT - dt);
    if (this.slowmoT > 0) { this.slowmoT -= dt / Math.max(.05, G.timeScale); if (this.slowmoT <= 0) { G.timeScale = 1; G.setZoom(this.zoomBase || 1); } }
    if (this.splash) { this.splash.t += dt / Math.max(.05, G.timeScale); if (this.splash.t > 1.4) this.splash = null; }
    if (this.talk.open) { const modal = this.talk.update(dt); B.Voice.dialog(this.talk, this.talkWho); if (modal) { this.letterbox = approach(this.letterbox, 1, dt * 4); return; } }
    this.letterbox = approach(this.letterbox, this.cine || (this.splash && this.slowmoT > 0) ? 1 : 0, dt * 4 / Math.max(.2, B.game.timeScale));
    if (this.cine) { this.cine.t += dt; if (this.cine.t > this.cine.d) { const f = this.cine.done; this.cine = null; if (f) f(); } else return; }
    if (this.over) { if (h) h.rig.update(dt, h.rigState({ pose: this.result === 'win' ? 'cheer' : h.dead ? 'die' : null })); for (const g of this.guards) g.update(dt, this); return; }
    if (h) { if (h.stunT > 0) { h.stunT -= dt; intent = B.emptyIntent(); } if (this.cheats.noclip) this.noclip(h, dt, intent); else B.heroUpdate(h, dt, intent, this); }
    B.perceive(this, dt);
    for (const g of this.guards) g.update(dt, this);
    for (const b of this.bosses) b.update(dt, this);
    if (this.escort) this.escort.update(dt, this);
    for (const n of this.talkers) n.update(dt);
    this.shots.update(dt, this.world.map);
    this.shots.hit(this.guards.filter(g => g.alive && !g.dying).concat(this.bosses.filter(b => b.alive && b.active)), (b, t) => { B.damage(h, t, b.dmg || 8, { kind: 'shuriken', quiet: false }); B.sfxAt('thunk', t.x, t.y); }, 'player');
    if (h && !h.dead) { const tg = [h]; if (this.escort && this.escort.freed && this.escort.alive) tg.push(this.escort); this.shots.hit(tg, (b, t) => { if (t === h) B.damage(b.src || null, h, b.dmg || 10, { kind: 'arrow' }); else t.takeHit(null, b.dmg || 10); }, 'enemy'); }
    B.toolsUpdate(this, dt); this.hazards(dt);
    for (const n of this.noises) n.t += dt; this.noises = this.noises.filter(n => n.t < .8);
    if (this.heightenT > 0) { this.heightenT -= dt; if (this.heightenT <= 0 && !this.bellRung) this.heightened = false; }
    if (this.waveAt && this.t >= this.waveAt) { this.waveAt = 0; this.reinforce(); }
    if (this.timer && !this.timer.stopped && !this.over) { this.timer.left -= dt; if (this.timer.left <= 0) { this.timer.left = 0; this.fail(this.timer.fail || 'Time ran out.'); } }
    // pickups by touch (tools); story items with interact
    if (h) for (const p of this.pickups) if (!p.taken && p.kind === 'tool' && Math.hypot(p.x - h.x, p.y - h.y) < 12 && Math.abs(p.z - h.z) < 10) this.takePickup(p);
    // zone names
    if (h) { const z = this.world.zoneAt(h.x, h.y); if (z && z !== this.place) { this.place = z; this.placeT = 3; } }
    this.runTriggers(); this.checkObjectives();
    // the music's mood: tension at any notice or Ki 60+, alert on any alert
    const alert = this.guards.some(g => g.alive && !g.civilian && g.mind.state === 'alert') || this.bosses.some(b => b.active && b.alive);
    const tense = alert || this.ki >= 60 || this.guards.some(g => g.alive && !g.civilian && g.mind.state !== 'calm');
    if (alert) this.lastAlert = this.t;
    if (!this.bosses.some(b => b.active && b.alive)) B.music.mood(alert || this.t - (this.lastAlert || -99) < 4 ? 2 : tense ? 1 : 0);
    if (G.settings.heartbeat && this.ki >= 50 && !this.over) { this.hbT = (this.hbT || 0) - dt; if (this.hbT <= 0) { this.hbT = 1 / lerp(.8, 2.2, (this.ki - 50) / 49); B.sfx('heartbeat', { vol: .5 + (this.ki - 50) / 100 }); } }
  }
  noclip(h, dt, I) { const s = I.sprint ? 260 : 140; h.x += I.move[0] * s * dt; h.y += I.move[1] * s * dt; if (I.jumpPressed || B.game.input.down('jump')) h.z += 120 * dt; if (B.game.input.down('crouch')) h.z = Math.max(0, h.z - 120 * dt); h.vx = I.move[0] * s; h.vy = I.move[1] * s; h.vz = 0; if (Math.hypot(I.move[0], I.move[1]) > .1) h.facing = Math.atan2(I.move[1], I.move[0]); h.exposure = 0; h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, air: h.z > 0 }); }
  hazards(dt) {
    const h = this.hero;
    for (const f of this.flames) { f.t -= dt; if (crand() < dt * 6) P.fire(f.x, f.y, f.z, 1, { size: 1.2 }); if (h && !h.dead && Math.hypot(h.x - f.x, h.y - f.y) < f.r && Math.abs(h.z - f.z) < 8) { f.hit = (f.hit || 0) - dt; if (f.hit <= 0) { f.hit = .5; B.damage(null, h, 6, { kind: 'fire', unblockable: true }); } } }
    this.flames = this.flames.filter(f => f.t > 0);
    for (const b of this.fireballs) {
      b.vz -= 700 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (crand() < .6) P.add({ kind: 'fire', x: b.x, y: b.y, z: b.z, life: .3, size: 1.5 });
      const gz = this.world.map.groundAt(b.x, b.y, 2, b.z + 4) || 0;
      if (b.z <= gz) { b.done = true; P.explosion(b.x, b.y, gz + 2, .7, { freeze: false, shake: 2 }); B.sfxAt('boom', b.x, b.y, { vol: .5 }); if (h && Math.hypot(h.x - b.x, h.y - b.y) < 22) B.damage(null, h, 14, { kind: 'fire' }); this.flames.push({ x: b.x, y: b.y, z: gz, t: 2, r: 10 }); }
    }
    this.fireballs = this.fireballs.filter(b => !b.done);
    for (const s of this.spirits) {
      if (!s.alive) continue; s.t += dt; const a = Math.atan2(h.y - s.y, h.x - s.x); s.x += Math.cos(a) * 46 * dt; s.y += Math.sin(a) * 46 * dt; s.blob.update(dt, { squash: Math.sin(s.t * 8) * .15, look: [Math.cos(a), Math.sin(a)] });
      if (crand() < dt * 14) P.add({ kind: 'ember', x: s.x, y: s.y, z: s.z + 6, vz: 25, life: .5, color: '#ff8a3a' });
      if (Math.hypot(h.x - s.x, h.y - s.y) < 10 && Math.abs(h.z - s.z) < 12) { s.alive = false; P.explosion(s.x, s.y, s.z + 6, .5, { freeze: false, shake: 1 }); B.damage(null, h, 10, { kind: 'fire' }); }
      if (h.combo.busy && h.combo.active && E.inArc(h, h.facing, s, 24, 1.3)) { s.alive = false; P.smoke(s.x, s.y, s.z + 6, 6); B.sfx('smoke'); }
    }
    for (const c of this.clones) {
      if (!c.alive) continue; c.t += dt; c.fanT -= dt; c.rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: 0, vy: 0, facing: Math.atan2(h.y - c.y, h.x - c.x), stance: 'ready', attack: c.fanT < .3 ? E.move('throw', 1 - c.fanT / .3) : null });
      if (c.fanT <= 0) { c.fanT = 2.4 + rand(); const a0 = Math.atan2(h.y - c.y, h.x - c.x); for (let i = 0; i < 3; i++) { const a = a0 + (i - 1) * .25; this.shots.fire({ x: c.x, y: c.y, z: c.z + 20, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 2, team: 'enemy', life: 1.2, dmg: 5, color: '#ff8a8a' }); } }
    }
  }
  spawnClones(b) { this.clones = [0, 1].map(i => { const a = rand() * TAU; return { alive: true, x: b.x + Math.cos(a) * 40, y: b.y + Math.sin(a) * 40, z: b.z, t: 0, fanT: 1 + i, rig: B.RIGS.hotaru() }; }); for (const c of this.clones) P.smoke(c.x, c.y, c.z + 14, 10, { size: 2 }); this.say('hotaru', 'hot_clones'); }
  spawnSpirits(b) { for (let i = 0; i < 2; i++) { const a = rand() * TAU; this.spirits.push({ alive: true, x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, z: b.z, t: 0, blob: new E.Blob({ R: 5, colors: { dk: '#8a2a0a', base: '#ff6a2a', lt: '#ffb060', spec: '#fff0c0', eye: '#fff8e0', pupil: '#2a0a00' }, mouth: 'fangs' }) }); } }
  /* ---- events ---- */
  toast(title, text) { if (this.mode === 'attract') return; B.ui.toast(title, text, 3); this.toastQ.push({ title, text, t: 0 }); }
  say(who, key, o = {}) {
    if (who === 'hero') who = this.charId === 'trial' ? 'sojiro' : this.charId;
    const line = B.STORY.line(key, this.charId); if (!line) return;
    const sp = B.STORY.speakers[who] || { name: who.toUpperCase(), rig: 'granny', voice: 'guard' };
    if (!this._portraits) this._portraits = {};
    const rig = this._portraits[who] || (this._portraits[who] = B.RIGS[sp.rig] ? B.RIGS[sp.rig](sp.arg) : null);
    this.talk.speed = B.ts(); this.talkWho = sp.voice;
    this.talk.say(Array.isArray(line) ? line : [line], { name: sp.name, portrait: rig, modal: !!o.modal && !this.auto, auto: o.modal && !this.auto ? undefined : 3.2, onDone: o.onDone, place: 'top' });
  }
  setFlag(k, v) { this.flags[k] = v === undefined ? (this.flags[k] || 0) + 1 : v; B.emit('flag', { k, v: this.flags[k] }); }
  silentCut(kind, g) {
    const G = B.game, mark = g.mark; this.stats.silentCuts += mark ? 0 : 1; this.stats.cutKinds[kind] = (this.stats.cutKinds[kind] || 0) + 1;
    if (!mark) { if (g.civilian && !g.disguised) this.civilianHurt(g); else this.stats.kills++; }
    if (mark) { g.defeated = true; this.setFlag('marks'); this.setFlag('mark_' + kind, true); }
    if (g.target) this.targetDown(g); this.disguisedCheck(g);
    this.zoomBase = G.zoom / (G.settings.zoom || 1); const reduce = G.reduceMotion;
    G.freeze(.05); G.timeScale = B.T('slowmo'); this.slowmoT = reduce ? .3 : .9; if (!reduce) G.setZoom(Math.min(2.2, (this.zoomBase || 1) * 1.6));
    this.splash = { kind, t: 0, mark }; G.audio.sting(B.STINGS.cut); B.sfx('twang');
    if (!mark && G.settings.blood === 'ink') G.after(.25, () => { P.bits(g.x, g.y, g.z + 14, 14, ['#d02a20', '#8a1410', '#1a1418']); this.inkDecals = (this.inkDecals || []).concat([{ x: g.x, y: g.y, z: g.z, r: 5 + crand() * 4 }]).slice(-40); });
    B.emit('silentCut', { kind, victim: g }); if (!mark) B.emit('kill', { victim: g, kind: 'silentCut' });
  }
  kill(g, kind) {
    if (g.mark) { g.defeated = true; return; }
    if (g.civilian && !g.disguised && kind !== 'silentCut') this.civilianHurt(g, true);
    else { this.stats.kills++; if (kind === 'poison') this.stats.cleanKills++; }
    if (g.target) this.targetDown(g); this.disguisedCheck(g);
    if (this.bellRunner === g) { this.bellRunner = null; this.toast('The bell stays silent.', ''); }
    B.sfxAt('bodyDrop', g.x, g.y); B.emit('kill', { victim: g, kind });
  }
  disguisedCheck(g) { if (g.spec.disguised && !g._dcount) { g._dcount = true; this.setFlag('disguisedDown'); } }
  targetDown(g) { this.setFlag('target_' + g.id, true); B.emit('targetDown', { g }); }
  civilianHurt(g, dead) { if (g._harmed) return; g._harmed = true; this.stats.civiliansHarmed++; this.toast('An innocent!', 'The Jubako-ya does not harm the people'); B.emit('civilian', { g, dead }); }
  detected(g, byHero) {
    if (!byHero || this.mode === 'attract') return;
    if (this.t - this.lastDetect > 5) { this.stats.detections++; this.lastDetect = this.t; B.game.audio.sting(B.STINGS.alert); B.emit('detected', { g }); }
  }
  bodyFound(g, b) { this.heightened = true; this.heightenT = Math.max(this.heightenT, 90); this.toast('A body was found!', 'The guards are on edge'); B.emit('bodyFound', { g, b }); }
  nearestBell(g) { let best = null, bd = 240; for (const b of this.bells) { const d = Math.hypot(b.x - g.x, b.y - g.y); if (d < bd) { bd = d; best = b; } } return best; }
  ringBell(g) {
    if (this.bellRung) return; this.bellRung = true; this.bellRunner = null; this.heightened = true; this.heightenT = 1e9;
    B.sfxAt('bell', g.x, g.y, { vol: 1.4 }); this.toast('The alarm bell rings!', 'Every guard is searching'); B.emit('bell', { g });
    const h = this.hero; for (const q of this.guards) if (q.alive && !q.civilian && !q.harmless) { q.mind.level = Math.max(q.mind.level, q.mind.search + .05); q.mind.last = { x: h.x, y: h.y, z: h.z }; }
    if (this.waves < 2 && this.barracks.length) this.waveAt = this.t + B.T('reinforceDelay');
  }
  reinforce() {
    const h = this.hero; let bk = this.barracks[0], bd = 1e9; for (const b of this.barracks) { const d = Math.hypot(b.x - h.x, b.y - h.y); if (d < bd) { bd = d; bk = b; } }
    this.waves++; this.toast('Reinforcements!', 'More guards pour out of the barracks');
    for (const type of ['samurai', 'ashigaru']) { const g = new Guard({ id: 'rf' + this.waves + type, type, at: [bk.x / CELL - .5 + (type === 'samurai' ? .3 : -.3), bk.y / CELL - .5], faction: this.level.faction, lantern: type === 'ashigaru' }, this); g.mind.level = g.mind.search + .1; g.mind.last = { x: h.x, y: h.y, z: h.z }; this.guards.push(g); }
    B.emit('reinforce', { wave: this.waves });
  }
  takePickup(p) {
    p.taken = true;
    if (p.kind === 'tool') { const n = B.Bento.add(this, p.tool, p.n || 1); B.sfx('pickup'); this.toast(get('tool', p.tool).name + (n ? ' x' + n : ''), n ? 'Packed in your bento' : 'No room in the bento'); }
    else { B.sfx('powerup'); this.toast(p.name || 'Found it', p.text || ''); this.setFlag('pickup_' + p.id, true); }
    B.emit('pickup', { p });
  }
  useInteract(it) {
    it.done = true; B.sfx('lever'); this.setFlag('interact_' + it.id, true);
    for (const a of it.do || []) this.doAction(a);
    if (it.count) { this.setFlag(it.count); }
    B.emit('interact', { it });
  }
  visibleTo(b) { const h = this.hero; try { return this.world.map.sight(h, b); } catch (e) { return false; } }
  /* ---- triggers and actions ---- */
  condition(c) {
    if (!c) return true; const [k, v] = c.split(':');
    if (k === 'objective') return this.objDone(v); if (k === 'kill') { const g = this.guards.find(q => q.id === v); return !!g && !g.alive; }
    if (k === 'alert') return this.guards.some(g => g.alive && g.mind.state === 'alert'); if (k === 'time') return this.t >= +v; if (k === 'pickup') return !!this.flags['pickup_' + v];
    if (k === 'flag') { const [f, n] = v.split('>='); return n ? (this.flags[f] || 0) >= +n : !!this.flags[f]; } if (k === 'interact') return !!this.flags['interact_' + v];
    return false;
  }
  runTriggers() {
    const h = this.hero;
    for (const t of this.triggers) {
      if (t.fired && t.once !== false) continue;
      let ok = true;
      if (t.rect) { const cx = h.x / CELL, cy = h.y / CELL; ok = cx >= t.rect[0] && cy >= t.rect[1] && cx <= t.rect[2] + 1 && cy <= t.rect[3] + 1 && (t.z === undefined || h.z >= t.z - 4); }
      if (t.at) ok = ok && Math.hypot(h.x - cc(t.at[0]), h.y - cc(t.at[1])) < (t.r || 1.5) * CELL;
      if (t.when) ok = ok && this.condition(t.when);
      if (!ok) continue; if (t.fired && t.once === false && t._in) continue;
      t.fired = true; t._in = true; for (const a of t.do || []) this.doAction(a);
    }
  }
  doAction(a) {
    const [k, ...r] = a;
    if (k === 'say') this.say(r[0], r[1], { modal: !!r[2] });
    else if (k === 'toast') this.toast(r[0], r[1] || '');
    else if (k === 'tutorial') this.tutorial(r[0], r[1]);
    else if (k === 'checkpoint') this.snapshot(r[0] || 'trigger');
    else if (k === 'spawn') { const g = new Guard(r[0], this); this.guards.push(g); }
    else if (k === 'boss') this.startBoss(r[0]);
    else if (k === 'objective') { const ob = this.objectives.find(o => o.id === r[0]); if (ob) { if (r[1] === 'show' && ob.state === 'hidden') { ob.state = 'active'; this.objToast(ob, 'New objective'); } else if (r[1] === 'done') this.completeObj(ob); else if (r[1] === 'fail') { ob.state = 'failed'; } } }
    else if (k === 'open' || k === 'close') { const [cx, cy, w = 1, hh = 1, ch] = r; for (let y = cy; y < cy + hh; y++) for (let x = cx; x < cx + w; x++) this.world.set(x, y, k === 'open' ? (ch || '.') : (ch || '#')); B.sfx('lever'); this.openCells = (this.openCells || []).concat([[k, cx, cy, w, hh, ch]]); }
    else if (k === 'music') A.layer(r[0], r[1] === undefined ? 1 : r[1], 1);
    else if (k === 'flag') this.setFlag(r[0], r[1] === undefined ? true : r[1]);
    else if (k === 'timer') { if (this.timer) this.timer.stopped = r[0] === 'stop'; }
    else if (k === 'free') { if (this.escort) { this.escort.freed = true; this.escort.say('tobei_freed'); } }
    else if (k === 'activate') { const it = this.interacts.find(i => i.id === r[0]); if (it) it.active = true; }
    else if (k === 'barges') { this.bargesCut = (this.bargesCut || 0) + 1; }
    else if (k === 'swap') { if (this.timer) this.timer.stopped = true; this.toast('The sake is swapped', 'The lord will drink only rice wine'); }
  }
  tutorial(title, text) { if (this.mode === 'attract' || this.auto) return; this.tut = { title, text, t: 0 }; B.sfx('fusuma'); }
  /* ---- objectives ---- */
  objDone(id) { const ob = this.objectives.find(o => o.id === id); return !!ob && ob.state === 'done'; }
  objToast(ob, kicker) { this.toast(kicker || 'Objective', ob.text); }
  completeObj(ob) {
    if (ob.state === 'done' || ob.state === 'failed') return; ob.state = 'done'; if (ob.optional) this.stats.optionalDone++;
    B.game.audio.sting(B.STINGS.objective); this.objToast(ob, ob.optional ? 'Optional task done' : 'Objective done'); B.emit('objective', { ob });
    for (const o2 of this.objectives) if (o2.state === 'hidden' && o2.after && o2.after.every(x => this.objDone(x))) { o2.state = 'active'; this.objToast(o2, 'New objective'); }
    if (ob.say) this.say(ob.say[0], ob.say[1]);
  }
  checkObjectives() {
    const h = this.hero;
    for (const ob of this.objectives) {
      if (ob.state !== 'active') continue;
      if (ob.after && !ob.after.every(x => this.objDone(x))) continue;
      let done = false;
      if (ob.type === 'assassinate') { const g = this.guards.find(q => q.id === ob.target); done = !!g && !g.alive; }
      else if (ob.type === 'retrieve') done = !!this.flags['pickup_' + ob.pickup];
      else if (ob.type === 'rescue' || ob.type === 'interact' || ob.type === 'stopTimer') done = ob.count ? (this.flags[ob.flag] || 0) >= ob.count : !!this.flags['interact_' + ob.interact];
      else if (ob.type === 'defeat') { const b = this.bosses.find(q => q.bossId === ob.boss); done = !!b && !b.alive; }
      else if (ob.type === 'flag') done = ob.count ? (this.flags[ob.flag] || 0) >= ob.count : !!this.flags[ob.flag];
      else if (ob.type === 'reach') { const z = ob.exit ? this.exit : { x: cc(ob.at[0]), y: cc(ob.at[1]), r: (ob.r || 1.5) * CELL }; done = !!z && Math.hypot(h.x - z.x, h.y - z.y) < z.r && h.z < (ob.z === undefined ? 40 : ob.z + 8); }
      else if (ob.type === 'escort') { const e = this.escort, z = ob.exit ? this.exit : { x: cc(ob.at[0]), y: cc(ob.at[1]), r: (ob.r || 2) * CELL }; done = !!e && e.alive && Math.hypot(e.x - z.x, e.y - z.y) < z.r + 8 && Math.hypot(h.x - z.x, h.y - z.y) < z.r + 16; }
      if (done) this.completeObj(ob);
    }
    if (!this.over && this.objectives.length && this.objectives.filter(o => !o.optional).every(o => o.state === 'done')) this.complete();
  }
  /* ---- bosses ---- */
  startBoss(id) {
    const b = this.bosses.find(q => q.bossId === id); if (!b || b.active || !b.alive) return;
    const spec = this.level.boss; this.snapshot('boss');
    for (const c of spec.close || []) this.doAction(['close', ...c]);
    this.bossBar = b; B.music.play('boss'); A.tempo(spec.bpm || 140);
    this.cine = { t: 0, d: this.auto ? .1 : 2.2, done: () => b.start() }; this.bossCard = { name: b.name, t: 0 };
    if (spec.intro) this.say(spec.intro[0], spec.intro[1]);
    B.emit('boss', { b, phase: 'start' });
  }
  bossDefeated(b) {
    const G = B.game, spec = this.level.boss; b.alive = false; G.timeScale = .3; this.slowmoT = 1.2; G.flash('#ffffff', .2); B.sfx('boom');
    for (const s of this.spirits) s.alive = false; for (const c of this.clones) { if (c.alive) P.smoke(c.x, c.y, c.z + 14, 8); c.alive = false; } this.flames.length = 0;
    if (spec.defeat) this.say(spec.defeat[0], spec.defeat[1]);
    for (const c of spec.close || []) this.doAction(['open', c[0], c[1], c[2], c[3], c[5] || '.']);
    this.bossBar = null; B.music.play(this.level.music || 'm1'); this.snapshot('afterBoss'); B.emit('boss', { b, phase: 'defeated' });
  }
  /* ---- checkpoints ---- */
  snapshot(why) {
    const h = this.hero; if (why !== 'start') this.toast('Checkpoint', '');
    this.checkpointData = { why, hero: { x: h.x, y: h.y, z: h.z, facing: h.facing }, bento: JSON.parse(JSON.stringify(this.bento)), flags: Object.assign({}, this.flags),
      guards: this.guards.map(g => ({ id: g.id, alive: g.alive, x: g.x, y: g.y, z: g.z, found: g.found, sunk: g.sunk, defeated: g.defeated, spec: g.spec, disguised: g.disguised })),
      objectives: this.objectives.map(o => o.state), pickups: this.pickups.map(p => p.taken), interacts: this.interacts.map(i => [i.done, i.active]), rows: this.world.rows.slice(),
      timer: this.timer ? { left: this.timer.left, stopped: this.timer.stopped } : null, heightened: this.heightened, bellRung: this.bellRung, waves: this.waves,
      bosses: this.bosses.map(b => ({ alive: b.alive, active: b.active })), escort: this.escort ? { x: this.escort.x, y: this.escort.y, freed: this.escort.freed, alive: this.escort.alive } : null, stats: Object.assign({}, this.stats, { cutKinds: Object.assign({}, this.stats.cutKinds) }), t: this.t };
    if (why !== 'start') B.emit('checkpoint', { why });
  }
  restore(cp) {
    const h = this.hero, c = cp || this.checkpointData; if (!c) return;
    Object.assign(h, { x: c.hero.x, y: c.hero.y, z: c.hero.z, facing: c.hero.facing, vx: 0, vy: 0, vz: 0, action: null, hp: h.hpMax, dead: false, drag: null, hug: null, crouch: false, eatT: 0, breath: B.T('breath'), stunT: 0, onGround: true });
    h.combo = new E.Combo(h.C.combo.map(m => new E.Attack(m, { reach: 9 })), { window: .3 });
    this.bento = JSON.parse(JSON.stringify(c.bento)); this.flags = Object.assign({}, c.flags);
    for (let y = 0; y < this.world.h; y++) if (this.world.rows[y] !== c.rows[y]) for (let x = 0; x < this.world.w; x++) if (this.world.rows[y][x] !== c.rows[y][x]) this.world.set(x, y, c.rows[y][x]);
    const keep = []; for (const s of c.guards) {
      const g = new Guard(Object.assign({}, s.spec, { disguised: s.disguised }), this); g.id = s.id;
      if (!s.alive) { Object.assign(g, { alive: false, x: s.x, y: s.y, z: s.z, found: s.found, sunk: s.sunk, defeated: s.defeated, dieT: 9 }); }
      keep.push(g);
    }
    this.guards = keep; this.objectives.forEach((o, i) => { o.state = c.objectives[i]; }); this.pickups.forEach((p, i) => { p.taken = c.pickups[i]; }); this.interacts.forEach((it, i) => { it.done = c.interacts[i][0]; it.active = c.interacts[i][1]; it.prog = 0; });
    if (this.timer && c.timer) Object.assign(this.timer, c.timer);
    this.heightened = c.heightened; this.bellRung = c.bellRung; this.bellRunner = null; this.waves = c.waves; this.waveAt = 0; this.over = false; this.result = null;
    this.bosses = this.bosses.map((b, i) => { const nb = new Boss(b.bossId, this.level.boss, this); nb.alive = c.bosses[i].alive; if (!nb.alive) { nb.deadT = 9; nb.active = false; } return nb; });
    if (this.bossBar) { this.bossBar = null; B.music.play(this.level.music || 'm1'); }
    if (this.escort && c.escort) Object.assign(this.escort, { x: c.escort.x, y: c.escort.y, freed: c.escort.freed, alive: true, hp: this.escort.hpMax, waiting: false });
    for (const t of this.triggers) if ((t.do || []).some(a => a[0] === 'boss' && this.bosses.some(b => b.bossId === a[1] && b.alive))) { t.fired = false; t._in = false; }
    this.lobs = []; this.clouds = []; this.traps = []; this.baits = []; this.flames = []; this.fireballs = []; this.spirits = []; this.clones = []; this.shots.clear();
    B.game.timeScale = 1; this.slowmoT = 0; this.splash = null; this.cine = null; this.talk.close();
  }
  retry() { this.stats.retries++; const r = this.stats.retries; this.restore(); this.stats.retries = r; B.emit('retry', {}); }
  /* ---- the end ---- */
  heroDeath(kind) {
    const h = this.hero; if (h.dead || this.over) return; h.dead = true; B.emit('heroDeath', { kind });
    if (this.mode === 'attract') { h.dead = false; h.hp = h.hpMax; return; }
    B.game.timeScale = .4; this.slowmoT = 1.2; B.game.audio.sting(B.STINGS.gameOver); A.music(null);
    this.over = true; this.result = 'dead';
  }
  fail(reason) { if (this.over) return; this.over = true; this.result = 'fail'; this.failReason = reason; B.game.audio.sting(B.STINGS.gameOver); A.music(null); B.emit('missionFail', { reason }); }
  complete() { if (this.over) return; this.over = true; this.result = 'win'; B.game.timeScale = 1; B.emit('missionEnd', { M: this }); }
  /* ---- the score ---- */
  score() {
    const s = this.stats, par = (this.level.par || 600) * B.T('parTimeMul');
    const rows = [['Complete', this.result === 'win' ? 1000 : 0], ['Silent Cuts', 150 * s.silentCuts], ['Other kills', 25 * Math.max(0, s.kills - s.silentCuts - s.cleanKills)], ['Clean kills', 100 * s.cleanKills],
      ['Optional tasks', 300 * s.optionalDone], ['Detections', -150 * s.detections], ['Unseen', s.detections === 0 ? 400 : 0], ['Civilians harmed', -400 * s.civiliansHarmed], ['Retries', -200 * s.retries],
      ['Untouched', this.hero && !this.hero.damaged ? 200 : 0], ['Time bonus', Math.round(Math.min(500, Math.max(0, par - this.t)))]];
    let total = rows.reduce((a, r) => a + r[1], 0);
    if (this.forceRank) { const rk = B.RANKS.find(q => q[0] === this.forceRank); total = Math.max(rk[1] + 50, 0); }
    return { rows, total, rank: B.rankOf(total) };
  }
}
B.Mission = Mission;

/* ---- saves, unlocks, the trial board ---- */
B.save = { data: null };
B.freshSave = () => ({ v: 1, character: 'sojiro', nextMission: 'training', completed: {}, best: {}, tools: B.TOOL_ORDER.filter(t => !get('tool', t).unlock), lastLoadout: null, flags: {}, playSeconds: 0 });
game.saves.write = () => ({ data: B.save.data, place: (get('mission', B.save.data.nextMission) || { title: 'The end' }).title, level: Object.keys(B.save.data.completed).length + 1 });
game.saves.read = s => { B.save.data = Object.assign(B.freshSave(), s.data || s); };
B.autosave = () => { if (B.HUB || !B.save.data) return; try { game.saves.save('auto'); } catch (e) { game.fail('autosave', e); } };
B.loadLatest = () => { try { const s = game.saves.latest(); if (s) { game.saves.load(s.slot === undefined ? 'auto' : s.slot); return true; } } catch (e) { game.fail('load', e); } return false; };
B.hasSave = () => { try { return !B.HUB && !!game.saves.latest(); } catch (e) { return false; } };
B.toolUnlocked = id => { const T = get('tool', id); if (!T.unlock) return true; const S = B.save.data; return !!S && S.tools.includes(id); };
/* after a mission: best records, the tools a rank unlocks */
B.applyResults = (M, sc) => {
  const S = B.save.data || (B.save.data = B.freshSave()), id = M.missionId, ch = M.charId, out = { newTools: [] };
  S.best[id] = S.best[id] || {}; const old = S.best[id][ch]; if (!old || sc.total > old.score) S.best[id][ch] = { score: sc.total, rank: sc.rank };
  S.completed[id] = true; S.playSeconds += M.t;
  for (const t of B.TOOL_ORDER) { const T = get('tool', t), u = T.unlock; if (!u || S.tools.includes(t)) continue; if ((u.any || u.mission === id) && B.rankIndex(sc.rank) <= B.rankIndex(u.rank)) { S.tools.push(t); out.newTools.push(t); } }
  const ms = get('mission', id); if (ms && ms.next && M.mode === 'story') S.nextMission = ms.next;
  return out;
};
B.trialBoard = () => E.store.get('bentou:trial', { top: [], ghost: null });

/* ---- 62-story ---- */
/* 62-story: all the words. Earnest, terse feudal drama with deadpan lunchbox details; ASCII only (the pixel font has no
 * macrons). Lines may differ by character: { sojiro, kaede }. */
B.STORY = {
  speakers: {
    granny: { name: 'GRANNY OSHIMA', rig: 'granny', voice: 'granny' }, sojiro: { name: 'SOJIRO', rig: 'sojiro', voice: 'sojiro' }, kaede: { name: 'KAEDE', rig: 'kaede', voice: 'kaede' },
    hero: { name: 'YOU', rig: 'sojiro', voice: 'sojiro' }, takanori: { name: 'LORD TAKANORI', rig: 'takanori', voice: 'takanori' }, kurogane: { name: 'KUROGANE', rig: 'kurogane', voice: 'kurogane' },
    kuroganeRobe: { name: 'KUROGANE', rig: 'kuroganeRobe', voice: 'kurogane' }, gonroku: { name: 'GONROKU', rig: 'gonroku', voice: 'gonroku' }, kanemori: { name: 'KANEMORI', rig: 'kanemori', voice: 'kanemori' },
    hotaru: { name: 'HOTARU', rig: 'hotaru', voice: 'hotaru' }, tobei: { name: 'TOBEI', rig: 'tobei', voice: 'tobei' }, ittetsu: { name: 'BROTHER ITTETSU', rig: 'ittetsu', voice: 'ittetsu' },
    ume: { name: 'DISCIPLE UME', rig: 'disciple', arg: '#3a6a3a', voice: 'disciple' }, sakubei: { name: 'BROKER SAKUBEI', rig: 'civilian', arg: 'merchant', voice: 'sakubei' }
  },
  line(key, ch) { const l = this.lines[key]; if (l === undefined) return null; return typeof l === 'object' && !Array.isArray(l) ? (l[ch] || l.sojiro) : l; },
  crawl: ['The Sengoku era. Lords devour lords, and the land devours the poor.', 'In Kasugai Province the granaries are full, and the people starve.', 'In the shadow of Kokaku Castle stands a humble shop, the Jubako-ya.',
    'It sells lunchboxes to the lord\'s household. Every box has two tiers.', 'So does the shop.'],
  lines: {
    // the prologue and the trial
    pro1: 'Rice that is never tested is only seed. Tonight, you two are tested.',
    pro2: { sojiro: '...We are ready, Master.', kaede: 'Finally. Six years of folding boxes.' },
    pro3: 'Ready? The rice says when it is ready. Not the cook. Go.',
    tr_move: 'Walk softly. A guard hears your feet before he sees your face.',
    tr_ki: 'The gauge in your belly is your ki. When it shouts, you whisper.',
    tr_hide: 'Bamboo hides a crouching child. It does not hide a running fool.',
    tr_mark: 'Ume carries a token. Take it from behind. Touch the blade to her neck. Do not cut the girl.',
    tr_swim: 'Kiku guards the pond. Under the water, no one sees you. Hold your breath and come up beneath her.',
    tr_roof: 'The roof is a road for those with a rope.',
    tr_above: 'Masa stands under the storehouse eaves. A ninja above is a ninja unseen.',
    tr_tools: 'Hungry men are careless men. Big Daikon has eaten nothing since noon.',
    tr_firecracker: 'A noise over there means you are not over here.',
    tr_daikon: 'I swapped the poison for a sleeping herb. This time.',
    tr_smoke: 'My lantern-bearers will spot you. That is the lesson. Smoke, and be gone.',
    tr_spar: 'Ittetsu waits at the gravel ring. He is old. He is not slow.',
    itt_intro: 'Ha! The old woman sends me children. Draw, little dumplings.',
    itt_defeat: '...Well struck. She was right about you.',
    tr_return: 'Come back to the porch. The rice is cooling.',
    tr_end: 'Your rice is cooked. Whether it is seasoned, the world will decide.',
    ume_marked: 'Hm! I never heard you. Take the token.',
    // briefing 1
    b1_1: 'Magistrate Kanemori swears the harvest failed. Yet his storehouses groan with rice.',
    b1_2: 'My lord, Kanemori has served your house for twenty years. To accuse without proof is-',
    b1_3: 'Enough, Kurogane. Leave us.',
    b1_4: 'Grandmother. The law cannot reach him. Can your boxes?',
    b1_5: 'Every box reaches its table, my lord.',
    b1_6: 'He feasts tonight by the canal. He will not finish his meal. And bring me any letter he keeps. A man who hides rice also hides paper.',
    b1_7: { sojiro: 'It will be done quietly.', kaede: 'He will not even taste dessert.' },
    // mission 1
    m1_arrive: 'The canal is cold. The magistrate\'s lanterns are warm. Stay between them.',
    gon_intro: 'The magistrate pays me by the bowl. Tonight, I eat well.',
    gon_phase2: 'RAAAH! Stand still, mosquito!',
    gon_defeat: 'The rice... was always... his...',
    kan_cornered: 'W-wait! I only followed orders! The man with the iron seal promised me a castle!',
    m1_after: { sojiro: 'Heaven was too slow.', kaede: 'You should have shared.' },
    m1_letter: 'A letter sealed in black iron. Granny will want this.',
    d1_1: 'Black iron. Kurogane\'s seal.',
    d1_2: 'The rice was sold to the Red Lanterns. Sake-house ninja. They are paid in silver, and they pay in poison.',
    d1_3: 'Tobei carried a copy to the lake. He has not come home.',
    // briefing 2 and mission 2
    b2_1: 'Tobei is a fool with good feet. The Red Lanterns hold him at Kiri Lake. Bring him home.',
    b2_2: { sojiro: 'And the rice barges?', kaede: 'And the rice barges? We could sink them.' },
    b2_3: 'Rice belongs in bellies, not in a traitor\'s war chest. Cut them loose. The river knows the way to the villages.',
    m2_arrive: 'Rain. Good. Rain hides footsteps. Lightning does not.',
    tobei_freed: 'You came! I knew you would. I mean, I hoped. I mean... is that a rice ball?',
    tobei_wait: 'Waiting. Quietly. Like a pickle in a jar.', tobei_follow: 'Following!', tobei_hurt: 'Ow! Ow. Yes. Ow.', tobei_scared: 'They see me! They see me!',
    tobei_idle1: 'Is that a rice ball? ...Later. Yes. Later.', tobei_idle2: 'I can swim. Mostly. Downward.',
    m2_gate: 'The water gate is open. The channel leads to the reeds.',
    hot_intro: 'The Jubako-ya sends its children to fetch its fool. How sweet. Like bean paste.',
    hot_clones: 'Which of me will you cut?',
    hot_defeat: 'Hm. Sharper than you look. Tell your grandmother: on the night of the full moon, your lord drinks his last.',
    // briefing 3 and mission 3
    b3_1: 'Kurogane hosts the moon-viewing. The Red Lanterns pour the sake. Find the poisoned flask before the lord raises his cup. Then go up. A man like Kurogane always waits at the top.',
    b3_2: { sojiro: 'And if he wears the castle\'s colors?', kaede: 'And if he wears the castle\'s colors? I will cut them off him.' },
    b3_3: 'Then cut through the colors.',
    m3_arrive: 'The moat is deep and the moon is rising. Three Red Lanterns hide among the servants. Only your ki will find them.',
    m3_swapped: 'Rice wine for poison. The lord will drink to the moon, and wake tomorrow.',
    m3_keep: 'The keep. Go up.',
    kur_intro: ['Little boxes. Do you know what a lord is? A mouth. Feed it fear, and it rules a hundred years.', 'Takanori feeds it rice. I will be the new mouth.', '(He lifts an oni mask to his face.) Shuten. Wake.'],
    kur_phase2: 'THE MOON... TASTES OF IRON!',
    kur_defeat: 'The mask... was hungrier... than I...',
    m3_timeout: 'The lord raises his cup...',
    // the ending
    end_1: 'At dawn, Lord Takanori opens the granaries. The people line up with bowls.',
    end_2: 'Black lacquer. The clan\'s crest. You are apprentices no longer. You are Lunchbox Assassins. Seen by none.',
    end_3: { sojiro: '(Sojiro bows low.) ...', kaede: '...Fed by all.' },
    end_4: { sojiro: '...Fed by all.', kaede: '(Kaede grins behind her mask.)' },
    end_post: 'Two tiers... Then I shall be the lid.',
    // the night delivery (trial / hub)
    del_brief: 'Broker Sakubei buys the starving villages\' seed rice at a tenth of its worth. Deliver his last lunch. Then out by the canal gate.',
    sak_idle: 'Nine hundred... nine hundred and one... the villages will pay double in spring.'
  },
  barks: {
    idle: ['Another cold night...', 'The barracks rice tastes of sand.', 'When does my watch end?', 'Haaah... (yawn)', 'My feet hurt.', 'Who buys rice by the cartload in a famine?', 'I could eat a whole box of anything.'],
    chat: ['Did you hear? The magistrate eats three dinners.', 'My cousin says there are ninja in the hills.', 'Ninja? Nonsense. Stories for children.', 'Pass me the sake... just a little.'],
    notice: ['Hm? What was that?', 'Is someone there?', 'A cat...?', 'Did something move?'],
    search: ['Show yourself!', 'I know I heard something.', 'Check the shadows!', 'Come out, rat!'],
    lost: ['...Must have been the wind.', 'Bah. My eyes play tricks.', 'Nothing. Back to my post.'],
    alert: ['Intruder!', 'Ninja! Over here!', 'Sound the bell!', 'There! In the shadows!'],
    body: ['He\'s... dead?!', 'Assassin! Wake the garrison!', 'A body! Raise the alarm!'],
    bait: ['Oh? A rice ball... nobody will miss it.', 'Food! Finally!'], poisoned: ['Ugh... my stomach...'], sleepy: ['So... sleepy...'],
    hurt: ['Ngh-!', 'M-mother...', 'Gah!'], blind: ['My eyes! (cough)', 'Smoke! I can\'t see!'],
    civilian: ['Eek! Murderer!', 'Please, spare me!', 'Guards! Guards!'], hound: ['Woof! Woof!', 'Grrrr...', 'Arf!'],
    ninja: ['A Jubako rat.', 'Your lunch is over.', 'Red Lantern takes the field.'], disciple: ['I see you, little sister!', 'Too slow!', 'Hm? Someone there?'],
    target: ['More rice... more...', 'Nine hundred... nine hundred and one...', 'Who let the lanterns burn so low?']
  },
  rankComment: { 'Grand Kaiseki': 'Not one grain out of place.', Makunouchi: 'Well packed.', Ekiben: 'Edible.', Hinomaru: 'Plain rice and one plum. Hm.', Leftovers: 'Even the dogs would refuse this box.' },
  briefings: {
    training: { place: 'shop', lines: [['granny', 'pro1'], ['hero', 'pro2'], ['granny', 'pro3']] },
    m1: { place: 'garden', lines: [['takanori', 'b1_1'], ['kuroganeRobe', 'b1_2'], ['takanori', 'b1_3'], ['takanori', 'b1_4'], ['granny', 'b1_5'], ['granny', 'b1_6'], ['hero', 'b1_7']] },
    m2: { place: 'shop', lines: [['granny', 'd1_1'], ['granny', 'd1_2'], ['granny', 'd1_3'], ['granny', 'b2_1'], ['hero', 'b2_2'], ['granny', 'b2_3']] },
    m3: { place: 'shop', lines: [['granny', 'b3_1'], ['hero', 'b3_2'], ['granny', 'b3_3']] },
    delivery: { place: 'shop', lines: [['granny', 'del_brief']] }
  }
};

/* ---- 63-cutscene ---- */
/* 63-cutscene: painted interiors (the shop's back room, the lord's moonlit garden), the opening crawl, briefings with
 * live rigs, portraits and gibberish voices, and the ending with its credits roll. Hold Start / Esc to skip. */
const blend = (g, a, mode, fn) => px.blend(g, a, mode, fn);
B.paint = {
  shop(g, W, H, t) {
    px.rect(g, 0, 0, W, H, '#1a1210');
    const fy = Math.round(H * .68);
    for (let x = 0; x < W; x += 34) { px.rect(g, x, 20, 32, fy - 24, '#e8d8b0'); for (let k = 1; k < 4; k++) px.rect(g, x, 20 + k * (fy - 24) / 4, 32, 1, '#6a4a30'); for (let k = 1; k < 3; k++) px.rect(g, x + k * 11, 20, 1, fy - 24, '#6a4a30'); px.rect(g, x + 32, 14, 2, fy - 14, '#3a2418'); }
    px.rect(g, 0, 12, W, 8, '#3a2418'); px.rect(g, 0, fy - 4, W, 4, '#2a1a10');
    blend(g, .35, 'multiply', () => px.rect(g, 0, 20, W, fy - 24, '#c08050'));
    for (let y = fy; y < H; y += 6) px.rect(g, 0, y, W, 5, y % 12 ? '#4a3422' : '#523a26');
    // shelves of lunchboxes
    for (let k = 0; k < 3; k++) { const x = W - 70 + k * 18, y = fy - 10; for (let j = 0; j < 4 - k % 2; j++) { px.rect(g, x, y - j * 7, 15, 6, j % 2 ? '#8a1c1c' : '#1a1214'); px.rect(g, x, y - j * 7, 15, 1, '#e8b04a'); } }
    // the lantern and its glow
    const lx = 46, ly = 34 + Math.sin(t * 1.5) * 1; px.line(g, lx, 12, lx, ly - 8, '#2a1a10');
    blend(g, .25 + Math.sin(t * 7) * .03, 'add', () => { px.disc(g, lx, ly, 46, '#a05a20'); px.disc(g, lx, ly, 24, '#c87a30'); });
    px.ell ? px.ell(g, lx, ly, 6, 8, '#ffb060') : px.disc(g, lx, ly, 7, '#ffb060'); px.rect(g, lx - 4, ly - 9, 8, 2, '#2a1a10'); px.rect(g, lx - 4, ly + 7, 8, 2, '#2a1a10');
    px.sprite(g, B.CREST, lx - 7, ly - 6);
  },
  garden(g, W, H, t) {
    for (let y = 0; y < H; y++) px.rect(g, 0, y, W, 1, E.mix('#0a1030', '#2a3a6a', y / H));
    for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 53) % Math.round(H * .5); px.dot(g, x, y, i % 5 ? '#8a9ad8' : '#ffffff'); }
    const mx = Math.round(W * .72), my = Math.round(H * .24); blend(g, .25, 'add', () => px.disc(g, mx, my, 34, '#5a6aa8')); px.disc(g, mx, my, 20, '#f4ecd0'); px.disc(g, mx + 5, my - 3, 4, '#e0d4b0'); px.disc(g, mx - 6, my + 5, 3, '#e0d4b0');
    const fy = Math.round(H * .66);
    px.poly(g, [[0, fy], [W * .2, fy - 40], [W * .45, fy - 20], [W * .7, fy - 50], [W, fy - 18], [W, fy], [0, fy]], '#141c34');
    // a pine silhouette
    const px0 = Math.round(W * .18); px.rect(g, px0, fy - 70, 4, 70, '#1a1410'); for (let k = 0; k < 4; k++) px.ell ? px.ell(g, px0 + 2 + (k % 2 ? 14 : -10), fy - 70 + k * 14, 22 - k * 3, 6, '#10241a') : px.disc(g, px0 + 2, fy - 70 + k * 14, 14, '#10241a');
    for (let y = fy; y < H; y += 5) px.rect(g, 0, y, W, 4, y % 10 ? '#3a2a1e' : '#42301f');
    const sx = Math.round(W * .85); px.rect(g, sx - 3, fy - 20, 6, 20, '#5a5a62'); px.rect(g, sx - 6, fy - 26, 12, 6, '#6a6a72'); blend(g, .3, 'add', () => px.disc(g, sx, fy - 23, 14, '#a06a30')); px.rect(g, sx - 2, fy - 25, 4, 3, '#ffb060');
  },
  night(g, W, H, t) {
    for (let y = 0; y < H; y++) px.rect(g, 0, y, W, 1, E.mix('#05060f', '#1e1430', y / H));
    for (let i = 0; i < 60; i++) { const x = (i * 131) % W, y = (i * 71) % H; if ((i + Math.floor(t * 2)) % 9) px.dot(g, x, y, '#6a6aa0'); }
    const mx = Math.round(W * .5), my = Math.round(H * .34); blend(g, .2, 'add', () => px.disc(g, mx, my, 60, '#5a4a8a')); px.disc(g, mx, my, 34, '#f0e8d0'); px.disc(g, mx + 8, my - 6, 6, '#ddd0b0'); px.disc(g, mx - 10, my + 8, 4, '#ddd0b0');
  }
};

/* the briefing / story scene: data { lines: [[who, key]], place, then: fn } */
B.scenes.story = {
  view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [],
  enter(d) {
    this.d = d; this.i = -1; this.skipT = 0; this.talk = new E.Dialog(game, { voice: null, speed: B.ts() }); this.talk.voice = null; this.t = 0;
    this.rigs = {}; const who = new Set(d.lines.map(l => l[0] === 'hero' ? B.save.data && B.save.data.character || 'sojiro' : l[0])); let k = 0;
    for (const w of who) { const sp = B.STORY.speakers[w]; if (!sp) continue; const rig = B.RIGS[sp.rig](sp.arg); this.rigs[w] = { rig, x: -70 + (k++) * (140 / Math.max(1, who.size - 1 || 1)), sp }; }
    B.music.play(d.music || 'shop'); game.follow(null); game.cam.bounds = null; game.lights.enabled = false; this.next();
  },
  next() {
    const d = this.d; this.i++;
    if (this.i >= d.lines.length) { const f = d.then; this.d.then = null; if (f) f(); return; }
    let [who, key] = d.lines[this.i]; const ch = (B.save.data && B.save.data.character) || 'sojiro'; if (who === 'hero') who = ch;
    const sp = B.STORY.speakers[who], R = this.rigs[who]; this.who = who;
    const text = B.STORY.line(key, ch) || key;
    this.talk.speed = B.ts(); this.talk.say(Array.isArray(text) ? text : [text], { name: sp ? sp.name : who, portrait: R ? R.rig : null, onDone: () => this.next() });
    this.voice = sp ? sp.voice : 'guard';
  },
  update(dt) {
    this.t += dt; const I = game.input;
    if (I.down('start') || I.down('pause')) { this.skipT += dt; if (this.skipT > .6) { this.skipT = -99; this.talk.close(); const f = this.d.then; this.d.then = null; if (f) f(); return; } } else if (this.skipT > 0) this.skipT = 0;
    this.talk.update(dt); B.Voice.dialog(this.talk, this.voice);
    for (const w in this.rigs) { const R = this.rigs[w]; R.rig.update(dt, { x: R.x, y: 0, z: 0, vx: 0, vy: 0, facing: R.x < 0 ? 0 : Math.PI, pose: w === 'granny' && this.d.place === 'garden' ? 'kneel' : null, expr: w === this.who && this.talk.typing ? 'smile' : null }); R.rig._talk = w === this.who && this.talk.typing; }
    game.focus(0, 0, 44 + (game.H / 2 - 70) / -game.view.bz);
  },
  draw(r) {
    r.sky(['#000000', '#000000', '#000000']);
    const P = B.paint[this.d.place] || B.paint.shop; r.decal(g => P(g, r.W, r.H, this.t));
    for (const w in this.rigs) { const R = this.rigs[w]; r.actor(R.x, 0, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view)); }
    this.talk.draw(r);
    r.overlay(g => { if (this.d.title) { E.font.text(g, this.d.title, r.W / 2, 6, '#e8b04a', { align: 'center', shadow: '#000', outline: false, scale: 1 }); } B.rich(g, 'Hold {a:start} to skip', r.W - 6, 6, '#b8a890', { align: 'right' }); if (this.skipT > 0) E.ui.bar(g, r.W - 60, 18, 54, 2, this.skipT / .6, '#e8b04a'); });
  }
};
/* the opening crawl */
B.scenes.crawl = {
  view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [],
  enter(d) { this.d = d; this.t = 0; this.line = -1; B.music.play('title'); game.follow(null); },
  update(dt) {
    const I = game.input; this.t += dt * (I.down('confirm') ? 3 : 1);
    const L = B.STORY.crawl, k = Math.floor(this.t / 3.4);
    if (k !== this.line && k < L.length) { this.line = k; B.Voice.speak(L[k], 'granny', { vol: .7 }); }
    if (this.t > L.length * 3.4 + 1.5 || I.pressed('start') || I.pressed('pause')) { const f = this.d.then; this.d.then = null; if (f) f(); }
  },
  draw(r) {
    r.sky(['#0a0806', '#14100c', '#1a1410']);
    r.overlay(g => {
      for (let y = 0; y < r.H; y += 3) px.rect(g, 0, y, r.W, 1, y % 6 ? '#16120e' : '#1a150f');
      const L = B.STORY.crawl;
      L.forEach((s, i) => { const a = clamp(this.t / 3.4 - i, 0, 1); if (a <= 0) return; const y = Math.round(r.H * .2 + i * 26 - Math.max(0, this.t - 10) * 3); const lines = E.font.wrap(s, r.W - 60); lines.forEach((ln, j) => E.font.text(g, ln, r.W / 2, y + j * 10, a > .5 ? '#f4ead5' : '#8a8070', { align: 'center', outline: false, shadow: '#000' })); });
      B.drawKanji(g, 'sei', 10, r.H - 40, .9, '#3a1410', '#1a0a08');
      B.rich(g, '{a:confirm} faster   {a:start} skip', r.W - 6, r.H - 12, '#8a7a60', { align: 'right' });
    });
  }
};
/* the ending: panels of the dawn, the shop, the post-credits scene, then the credits over the moon */
B.scenes.ending = {
  view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [],
  enter() {
    this.t = 0; this.phase = 'story'; B.music.play('ending'); game.follow(null);
    B.scenes.story.enter.call(this.st = Object.create(B.scenes.story), { place: 'shop', music: 'ending', lines: [['granny', 'end_1'], ['granny', 'end_2'], ['hero', 'end_3'], ['hero', 'end_4'], ['hotaru', 'end_post']], then: () => { this.phase = 'credits'; this.t = 0; } });
  },
  update(dt) {
    if (this.phase === 'story') { this.st.update(dt); return; }
    const I = game.input; this.t += dt * (I.down('confirm') || I.down('jump') ? 4 : 1);
    if (this.t > B.CREDITS.length * 1.6 + 8 || I.pressed('start')) { game.go('title'); }
  },
  draw(r) {
    if (this.phase === 'story') { B.scenes.story.draw.call(this.st, r); return; }
    r.sky(['#000', '#000', '#000']); r.decal(g => B.paint.night(g, r.W, r.H, this.t));
    r.overlay(g => {
      const y0 = r.H + 10 - this.t * 22;
      B.CREDITS.forEach((c, i) => { const y = Math.round(y0 + i * 16); if (y < -10 || y > r.H + 10) return; const head = c.startsWith('#'); E.font.text(g, head ? c.slice(1) : c, r.W / 2, y, head ? '#e8b04a' : '#f4ead5', { align: 'center', shadow: '#000', outline: false, scale: head ? 1 : 1 }); });
      B.rich(g, 'Hold {a:confirm} faster   {a:start} title', r.W - 6, r.H - 12, '#8a7a60', { align: 'right' });
    });
  }
};
B.CREDITS = ['#BENTOU 2', 'Birth of the Lunchbox Assassins', '', '#An original game', 'inspired by Tenchu 2: Birth of the Stealth Assassins', '(Acquire / Activision, 2000). Not affiliated.', '',
  '#Built by', 'Claude (Anthropic claude-opus-5-5, medium effort)', 'in Claude Code', '', '#Plan', 'PLAN.md', '', '#Engine', 'my-3D2dge v0.85.2 (michaelcrosato/my-3d2dge)', 'with nine small patches', '',
  '#Online', 'AI Hub Session Protocol v1, client 1.4.0', '', '#Art, music, sound and voices', 'all generated in code', '', '#Cast', 'Sojiro  -  Kaede  -  Granny Oshima', 'Lord Mibu Takanori  -  Chamberlain Kurogane',
  'Magistrate Kanemori  -  Gonroku the Iron Ox', 'Hotaru of the Red Lantern  -  Tobei the courier', 'Brother Ittetsu  -  Ume, Kiku and Masa', '', '#Thank you for playing', 'Seen by none. Fed by all.'];

/* ---- 64-levels ---- */
/* 64-levels: the maps. Rows are painted from a short list of operations (rect fill, box outline, single cells) into the
 * level format the Workshop shares; then the entities, lights, props, triggers and objectives as data. */
B.paintRows = (w, h, base, ops) => {
  const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(base));
  const S = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
  for (const [k, a, b, c, d, ch] of ops) {
    if (k === 'rect') for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) S(x, y, ch);
    else if (k === 'box') for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) { if (x === a || x === c || y === b || y === d) S(x, y, ch); }
    else if (k === 'set') S(a, b, c);
  }
  return g.map(r => r.join(''));
};
const R = B.paintRows;
const lantern = (x, y, o = {}) => Object.assign({ at: [x, y], z: 22, r: 60, i: .9, color: '#ffb060', kind: 'stoneLantern' }, o);
const paper = (x, y, o = {}) => Object.assign({ at: [x, y], z: 26, r: 56, i: .85, color: '#ff9a40', kind: 'chochin' }, o);

/* ---- Mission 0: The Trial of the Second Tier (training; dusk) ---- */
def('level', 'training', { name: 'The Trial of the Second Tier', size: [40, 28], time: 'dusk', faction: 'trial', music: 'training', weather: 'petals', par: 420,
  rows: R(40, 28, '.', [['box', 0, 0, 39, 27, '#'], ['rect', 1, 1, 12, 4, 'A'], ['rect', 2, 5, 10, 6, '='], ['rect', 16, 2, 23, 2, 'F'], ['rect', 24, 1, 38, 7, '"'], ['rect', 4, 8, 7, 9, 'P'],
    ['rect', 18, 8, 18, 10, 'W'], ['rect', 22, 8, 22, 10, 'W'], ['rect', 32, 8, 37, 13, 'C'], ['rect', 14, 12, 24, 15, '~'], ['rect', 3, 13, 8, 14, ','], ['rect', 4, 19, 20, 25, ':'], ['rect', 26, 16, 29, 16, '+'], ['rect', 1, 26, 38, 26, '.']]),
  zones: [{ id: 'shop', rect: [1, 1, 12, 6], name: 'The Jubako-ya' }, { id: 'grove', rect: [24, 1, 38, 7], name: 'Bamboo Grove' }, { id: 'pond', rect: [13, 11, 25, 16], name: 'Koi Pond' }, { id: 'ring', rect: [4, 19, 20, 25], name: 'Sparring Ring' }, { id: 'kura', rect: [30, 8, 38, 14], name: 'The Storehouse' }],
  lights: [paper(11, 6), paper(2, 6), lantern(13, 11), lantern(26, 12), lantern(30, 15), lantern(4, 18), lantern(21, 18), lantern(21, 26), lantern(26, 4, { i: .5 }), paper(38, 15)],
  props: [['jubako', 3.5, 5.6], ['jubako', 9.2, 5.5, { facing: .4 }], ['sakeBarrel', 1.6, 7.4], ['waterBarrel', 12.4, 6], ['persimmon', 27, 17], ['dummy', 30, 23], ['dummy', 32.5, 23.4], ['weaponRack', 22.5, 22, { facing: Math.PI }],
    ['riceBale', 31, 15.4], ['riceBale', 31.8, 16.2], ['steppingStone', 13, 16.5], ['steppingStone', 25.5, 16.8], ['mato', 36, 21], ['well', 14, 8.5], ['taiko', 2.5, 22], ['strawMat', 10, 21.6]],
  anchors: [[27, 17, 46]],
  hero: { at: [5, 6], facing: 90 },
  npcs: [{ id: 'granny', rig: 'granny', at: [7, 5], facing: 90, label: 'Report to Granny', line: 'tr_end', speaker: 'granny', when: 'spar', flag: 'trialDone' }],
  guards: [
    { id: 'ume', type: 'disciple', mark: true, color: '#3a6a3a', at: [28, 3], lantern: true, mode: 'patrol', route: [[28, 3, 1.5, 0], [35, 3, 1, 90], [35, 6, 1.5, 180], [28, 6, 1, 270]] },
    { id: 'kiku', type: 'disciple', mark: true, color: '#3a4a7a', at: [25.2, 13.5], facing: 0, mode: 'post' },
    { id: 'masa', type: 'disciple', mark: true, color: '#6a4a2a', at: [31, 11], facing: 90, mode: 'post' },
    { id: 'daikon', type: 'ashigaru', mark: true, harmless: true, name: 'Big Daikon', faction: 'trial', at: [35, 17], facing: 180, mode: 'post' },
    { id: 'bearer1', type: 'disciple', mark: true, color: '#7a3a3a', at: [6, 18], facing: 90, lantern: true, mode: 'post' },
    { id: 'bearer2', type: 'disciple', mark: true, color: '#7a3a3a', at: [18, 18], facing: 90, lantern: true, mode: 'post' }],
  boss: { id: 'ittetsu', at: [12, 22], intro: ['ittetsu', 'itt_intro'], defeat: ['ittetsu', 'itt_defeat'], close: [] },
  pickups: [{ kind: 'tool', tool: 'firecracker', n: 2, at: [26, 10] }, { kind: 'tool', tool: 'riceball', n: 1, at: [16, 10] }],
  objectives: [
    { id: 'ume', type: 'assassinate', target: 'ume', text: 'Take Ume\'s token: a Silent Mark from behind', say: ['ume', 'ume_marked'] },
    { id: 'kiku', type: 'assassinate', target: 'kiku', text: 'Mark Kiku from the pond: dive, then strike from the water', hidden: true, after: ['ume'] },
    { id: 'masa', type: 'assassinate', target: 'masa', text: 'Grapple onto the storehouse; mark Masa from above', hidden: true, after: ['kiku'] },
    { id: 'daikon', type: 'assassinate', target: 'daikon', text: 'Lure Big Daikon with a firecracker, feed him rice, mark him', hidden: true, after: ['masa'] },
    { id: 'spar', type: 'defeat', boss: 'ittetsu', text: 'Spar with Brother Ittetsu at the gravel ring', hidden: true, after: ['daikon'] },
    { id: 'report', type: 'flag', flag: 'trialDone', text: 'Report to Granny on the porch', hidden: true, after: ['spar'] }],
  triggers: [
    { id: 't0', when: 'time:.5', do: [['say', 'granny', 'tr_move'], ['tutorial', 'Moving', '{a:jump} jump, climb, vault.  {a:crouch} crouch to sneak.  {a:sprint} sprint (loud).  A light tilt walks silently.']] },
    { id: 't1', rect: [13, 1, 23, 7], do: [['say', 'granny', 'tr_ki'], ['tutorial', 'The Ki Gauge', 'The number bottom-left is how near the closest guard is. Its color is how aware they are. Hold {a:focus} to sense further.']] },
    { id: 't2', rect: [24, 1, 38, 7], do: [['say', 'granny', 'tr_mark'], ['tutorial', 'Silent Cuts', 'Crouch in the bamboo, get behind the disciple, and press {a:attack} when the prompt shows.']] },
    { id: 't3', when: 'objective:ume', do: [['checkpoint'], ['say', 'granny', 'tr_swim'], ['tutorial', 'Swimming', 'In deep water press {a:crouch} to dive: unseen, but mind your breath. Strike from below with {a:attack}.']] },
    { id: 't4', when: 'objective:kiku', do: [['checkpoint'], ['say', 'granny', 'tr_roof'], ['tutorial', 'The Grappling Hook', 'Tap {a:grapple} to fire at the highlighted roof edge. Hold it to aim (time slows).']] },
    { id: 't4b', rect: [30, 8, 38, 13], z: 40, do: [['say', 'granny', 'tr_above']] },
    { id: 't5', when: 'objective:masa', do: [['checkpoint'], ['say', 'granny', 'tr_tools'], ['tutorial', 'The Bento', 'Pick a tool with {a:toolPrev} {a:toolNext} (wheel or 1-8), use it with {a:useTool}. A firecracker pulls a guard; a rice ball left out feeds him.']] },
    { id: 't5b', when: 'flag:trick', do: [['say', 'granny', 'tr_daikon']] },
    { id: 't6', when: 'objective:daikon', do: [['checkpoint'], ['say', 'granny', 'tr_spar']] },
    { id: 't7', rect: [4, 17, 20, 18], when: 'objective:daikon', do: [['say', 'granny', 'tr_smoke'], ['tutorial', 'Smoke and steel', 'Spotted? A smoke bomb ({a:useTool}) breaks their sight. In a fight: {a:block} blocks, a timed {a:block} parries, {a:block}+{a:jump} rolls.']] },
    { id: 't8', rect: [6, 19, 18, 25], when: 'objective:daikon', do: [['boss', 'ittetsu']] },
    { id: 't9', when: 'objective:spar', do: [['checkpoint'], ['say', 'granny', 'tr_return']] }]
});

/* ---- Mission 1: Rice and Ash (castle town at night; Kanemori's household) ---- */
def('level', 'm1', { name: 'Rice and Ash', size: [56, 48], time: 'night', faction: 'kanemori', music: 'm1', weather: 'petals', par: 720,
  rows: R(56, 48, '.', [['box', 0, 0, 55, 47, '#'],
    ['box', 2, 2, 45, 15, 'W'], ['rect', 3, 3, 19, 14, ':'], ['rect', 20, 3, 20, 14, 'W'], ['set', 20, 7, ':'], ['set', 20, 8, ':'],
    ['box', 22, 4, 38, 10, 'H'], ['rect', 23, 5, 37, 9, '_'], ['set', 22, 7, 'd'], ['set', 30, 10, 'd'],
    ['rect', 24, 12, 28, 13, '~'], ['rect', 31, 12, 34, 14, ','], ['rect', 36, 11, 39, 13, 'C'], ['rect', 21, 11, 44, 11, '+'], ['set', 24, 15, '.'], ['set', 25, 15, '.'], ['set', 45, 9, '.'],
    ['rect', 47, 4, 48, 5, 'T'],
    ['rect', 3, 18, 6, 21, 'A'], ['rect', 9, 18, 12, 22, 'B'], ['rect', 16, 18, 19, 21, 'D'], ['rect', 28, 18, 31, 22, 'B'], ['rect', 35, 18, 38, 21, 'A'], ['rect', 42, 18, 45, 21, 'D'], ['rect', 48, 18, 52, 22, 'A'],
    ['rect', 20, 24, 34, 28, '+'],
    ['rect', 3, 31, 6, 35, 'B'], ['rect', 10, 31, 14, 34, 'A'], ['rect', 18, 31, 21, 35, 'D'], ['rect', 25, 31, 28, 34, 'A'], ['rect', 32, 31, 35, 35, 'B'], ['rect', 39, 31, 42, 34, 'A'], ['rect', 46, 31, 49, 35, 'C'],
    ['rect', 23, 36, 26, 38, ','], ['rect', 8, 37, 11, 38, ','], ['rect', 44, 37, 52, 39, ':'],
    ['rect', 1, 41, 54, 41, '='], ['rect', 1, 42, 54, 45, '~'], ['rect', 1, 46, 54, 46, '=']]),
  zones: [{ id: 'mansion', rect: [21, 3, 45, 14], name: 'Kanemori Mansion' }, { id: 'court', rect: [3, 3, 19, 14], name: 'The Inner Court' }, { id: 'market', rect: [1, 16, 54, 29], name: 'Market Square' }, { id: 'alleys', rect: [1, 30, 54, 40], name: 'The Rice Alleys' }, { id: 'canal', rect: [1, 41, 54, 46], name: 'The Canal' }],
  lights: [lantern(23, 12), lantern(29, 12), lantern(41, 12), lantern(43, 6), paper(30, 11.2), paper(22.5, 6.5), paper(23, 16.2), paper(26, 16.2), lantern(8, 4), lantern(17, 13), paper(14, 23), paper(27, 23.2), paper(40, 22.6), paper(47, 23),
    { at: [24, 25], z: 18, r: 70, i: 1, color: '#ffb060', kind: null }, paper(33, 29), paper(16, 36), paper(30, 36), paper(44, 36), lantern(52, 40), lantern(4, 40), paper(48, 6.6, { z: 84, r: 70 })],
  props: [['yatai', 22, 26], ['yatai', 32, 26, { facing: Math.PI }], ['sakeBarrel', 21, 24.5], ['sakeBarrel', 34.5, 24.5], ['riceBale', 45, 38], ['riceBale', 46, 38.6], ['riceBale', 50, 38.2], ['waterBarrel', 7.5, 30], ['well', 37, 27],
    ['boat', 52, 43.5], ['boat', 3, 43.5], ['torii', 27, 23.3], ['nobori', 19.5, 16.8], ['nobori', 30, 16.8], ['bambooClump', 33, 13], ['weaponRack', 8, 13.4], ['taiko', 17, 4], ['strawMat', 29, 7], ['strawMat', 33, 7], ['jubako', 31, 7.4], ['moorPost', 10, 41.2], ['moorPost', 40, 41.2]],
  anchors: [],
  hero: { at: [52, 41], facing: 180 }, exit: { at: [3, 41], r: 1.5 },
  bells: [[24, 22.6]], barracks: [[24, 14]],
  guards: [
    { id: 'gate1', type: 'ashigaru', at: [23, 16.5], facing: 90, mode: 'post', lantern: true }, { id: 'gate2', type: 'ashigaru', at: [26.5, 16.5], facing: 90, mode: 'post' },
    { id: 'sam1', type: 'samurai', at: [14, 24], mode: 'patrol', partner: 'sam2', route: [[14, 24, 1], [38, 24, 2, 0], [38, 29, 1], [14, 29, 2, 180]] },
    { id: 'sam2', type: 'samurai', at: [15, 25], mode: 'patrol', route: [[15, 25, 1], [37, 25, 2, 0], [37, 28, 1], [15, 28, 2, 180]] },
    { id: 'ash1', type: 'ashigaru', at: [8, 36], mode: 'patrol', lantern: true, route: [[8, 36, 2, 90], [22, 36, 1], [22, 39, 1], [8, 39, 2]] },
    { id: 'ash2', type: 'ashigaru', at: [30, 37], mode: 'patrol', route: [[30, 37, 2], [44, 36, 1, 0], [30, 39, 2]] },
    { id: 'hound', type: 'hound', at: [40, 37], mode: 'patrol', route: [[36, 37, 1], [43, 38, 2], [40, 39, 1]] },
    { id: 'ash3', type: 'ashigaru', at: [44, 37.5], facing: 0, mode: 'post' },
    { id: 'ash4', type: 'ashigaru', at: [24, 13], mode: 'patrol', lantern: true, route: [[24, 13, 1], [43, 13, 2, 0], [43, 6, 1], [40, 12, 1]] },
    { id: 'ash5', type: 'ashigaru', at: [42, 4], facing: 180, mode: 'post' },
    { id: 'ash6', type: 'ashigaru', at: [27, 11.4], mode: 'chat', partner: 'ash7', facing: 0 }, { id: 'ash7', type: 'ashigaru', at: [28.6, 11.4], mode: 'chat', partner: 'ash6', facing: 180 },
    { id: 'sam3', type: 'samurai', at: [34, 8], facing: 180, mode: 'post' },
    { id: 'sam4', type: 'samurai', at: [10, 8], mode: 'patrol', route: [[5, 5, 2], [17, 5, 1], [17, 12, 2], [5, 12, 1]] },
    { id: 'ash8', type: 'ashigaru', at: [50, 28], mode: 'sleep', facing: 90 },
    { id: 'ash9', type: 'ashigaru', at: [2.5, 28], facing: 0, mode: 'eat' },
    { id: 'archer', type: 'archer', at: [47.5, 4.5], z: 80, facing: 180, mode: 'post', lantern: true }],
  civilians: [{ id: 'kanemori', type: 'target', kind: 'kanemori', target: true, name: 'Magistrate Kanemori', at: [30, 6], facing: 90, mode: 'post', voice: 'kanemori', rig: 'kanemori' },
    { id: 'maid1', kind: 'maid', at: [27, 7], facing: 0, mode: 'post' }, { id: 'maid2', kind: 'maid', at: [34, 6], mode: 'patrol', route: [[34, 6, 2], [25, 8, 2]] },
    { id: 'drunk1', kind: 'drunk', at: [23, 27], facing: 0, mode: 'post' }, { id: 'drunk2', kind: 'drunk', at: [33, 27.5], mode: 'patrol', route: [[33, 27.5, 3], [29, 26, 2]] }],
  boss: { id: 'gonroku', at: [10, 8], intro: ['gonroku', 'gon_intro'], defeat: ['gonroku', 'gon_defeat'], close: [[20, 7, 1, 2, '#', ':']] },
  pickups: [{ id: 'ledger', kind: 'story', name: 'the iron-sealed letter', text: 'Sealed in black iron', at: [37.5, 12], z: 48 }, { kind: 'tool', tool: 'shuriken', n: 4, at: [12, 37] }, { kind: 'tool', tool: 'riceball', n: 2, at: [40, 27] }],
  objectives: [
    { id: 'kill', type: 'assassinate', target: 'kanemori', text: 'Silence Magistrate Kanemori at his feast', say: ['hero', 'm1_after'] },
    { id: 'letter', type: 'retrieve', pickup: 'ledger', optional: true, text: 'Optional: find what he hides (the storehouse roof)', say: ['hero', 'm1_letter'] },
    { id: 'boss', type: 'defeat', boss: 'gonroku', text: 'Defeat Gonroku in the inner court', hidden: true, after: ['kill'] },
    { id: 'escape', type: 'reach', exit: true, text: 'Escape by the canal boat at the west end', hidden: true, after: ['kill', 'boss'] }],
  triggers: [
    { id: 'arrive', when: 'time:.6', do: [['say', 'granny', 'm1_arrive']] },
    { id: 'inside', rect: [21, 3, 44, 14], do: [['checkpoint']] },
    { id: 'killed', when: 'objective:kill', do: [['close', 30, 10, 1, 1, 'H'], ['toast', 'The south door is barred', 'The only way out is the court to the west']] },
    { id: 'court', rect: [3, 3, 18, 14], do: [['boss', 'gonroku']] }],
  timer: null
});

/* ---- Mission 2: The Fort at Kiri Lake (rain and lightning; Red Lantern hold) ---- */
def('level', 'm2', { name: 'The Fort at Kiri Lake', size: [60, 52], time: 'rain', faction: 'redlantern', music: 'm2', weather: 'rain', par: 900,
  rows: R(60, 52, ',', [['box', 0, 0, 59, 51, '#'], ['rect', 13, 1, 30, 50, '~'], ['rect', 2, 3, 5, 6, 'A'], ['rect', 2, 30, 5, 33, 'A'], ['rect', 7, 42, 10, 45, 'A'], ['rect', 6, 14, 11, 20, '.'], ['rect', 1, 22, 12, 22, '-'],
    ['box', 31, 2, 56, 46, '#'], ['rect', 32, 3, 55, 45, ':'], ['rect', 32, 3, 33, 4, 'T'], ['rect', 54, 3, 55, 4, 'T'], ['rect', 32, 43, 33, 44, 'T'], ['rect', 54, 43, 55, 44, 'T'],
    ['rect', 36, 6, 42, 12, 'B'], ['rect', 46, 6, 50, 10, 'C'], ['rect', 37, 18, 41, 22, 'C'], ['rect', 46, 24, 52, 29, 'B'], ['rect', 35, 34, 39, 37, 'A'],
    ['rect', 36, 41, 52, 41, '='], ['rect', 35, 42, 53, 45, '~'], ['rect', 18, 31, 30, 33, '='], ['rect', 28, 26, 30, 30, 'R'], ['set', 31, 32, '#'],
    ['rect', 52, 13, 54, 15, '+'], ['rect', 34, 30, 44, 30, '+']]),
  zones: [{ id: 'reeds', rect: [1, 1, 12, 50], name: 'The Reed Shore' }, { id: 'lake', rect: [13, 1, 30, 50], name: 'Kiri Lake' }, { id: 'fort', rect: [32, 3, 55, 45], name: 'Red Lantern Fort' }, { id: 'dock', rect: [35, 40, 53, 45], name: 'The Rice Dock' }],
  lights: [lantern(34, 14), lantern(44, 14), lantern(53, 18), lantern(36, 30), lantern(48, 32), lantern(44, 39), paper(36, 40.4), paper(52, 40.4), paper(32.5, 3.5, { z: 84, r: 80 }), paper(54.5, 3.5, { z: 84, r: 80 }), paper(32.5, 43.5, { z: 84, r: 80 }), paper(54.5, 43.5, { z: 84, r: 80 }),
    paper(19, 32, { z: 16 }), paper(29, 32, { z: 16 }), paper(4, 7.2), paper(9, 17)],
  props: [['boat', 9, 24], ['cage', 53, 14, { solid: false }], ['lever', 36, 32.2], ['moorPost', 39, 41.4], ['moorPost', 45, 41.4], ['moorPost', 51, 41.4], ['bargeRice', 40, 43.5], ['bargeRice', 46, 43.5], ['bargeRice', 51, 43.5],
    ['riceBale', 44, 20], ['riceBale', 45, 20.8], ['sakeBarrel', 34, 26], ['sakeBarrel', 35, 26.6], ['weaponRack', 43, 13.4], ['nobori', 44, 4], ['nobori', 33.6, 15], ['strawMat', 8, 15], ['waterBarrel', 6.6, 13.2]],
  anchors: [],
  hero: { at: [8, 18], facing: 0 }, exit: { at: [9, 22], r: 1.8 },
  bells: [[44, 16]], barracks: [[39, 13.5], [49, 30]],
  guards: [
    { id: 'arc1', type: 'archer', at: [32.5, 3.5], z: 80, facing: 180, mode: 'post', lantern: true }, { id: 'arc2', type: 'archer', at: [32.5, 43.5], z: 80, facing: 180, mode: 'post', lantern: true },
    { id: 'arc3', type: 'archer', at: [54.5, 3.5], z: 80, facing: 135, mode: 'post' },
    { id: 'nin1', type: 'ninja', at: [48, 8], z: 48, mode: 'patrol', route: [[46.5, 6.5, 2], [49.5, 6.5, 1], [49.5, 9.5, 2], [46.5, 9.5, 1]] },
    { id: 'nin2', type: 'ninja', at: [39, 9], z: 64, mode: 'post', facing: 90 }, { id: 'nin3', type: 'ninja', at: [49, 26], z: 64, mode: 'post', facing: 180 },
    { id: 'sam1', type: 'samurai', at: [44, 17], mode: 'post', facing: 180 }, { id: 'sam2', type: 'samurai', at: [52, 17], mode: 'patrol', route: [[52, 17, 2], [52, 22, 1], [45, 22, 2]] },
    { id: 'sam3', type: 'samurai', at: [42, 39], mode: 'patrol', route: [[36, 39, 2, 90], [52, 39, 2, 90]] },
    { id: 'ash1', type: 'ashigaru', at: [35, 25], mode: 'patrol', lantern: true, route: [[34, 15, 1], [34, 38, 2], [44, 38, 1], [44, 25, 1]] },
    { id: 'ash2', type: 'ashigaru', at: [53, 32], mode: 'patrol', route: [[53, 32, 2], [53, 40, 1], [47, 36, 2]] },
    { id: 'ash3', type: 'ashigaru', at: [38, 31], facing: 0, mode: 'post' }, { id: 'ash4', type: 'ashigaru', at: [42, 27], mode: 'chat', partner: 'ash5', facing: 0 }, { id: 'ash5', type: 'ashigaru', at: [43.5, 27], mode: 'chat', partner: 'ash4', facing: 180 },
    { id: 'ash6', type: 'ashigaru', at: [50, 12], mode: 'sleep' },
    { id: 'hnd1', type: 'hound', at: [47, 33], mode: 'patrol', route: [[45, 33, 1], [51, 35, 1]] }, { id: 'hnd2', type: 'hound', at: [36, 20], mode: 'patrol', route: [[35, 17, 1], [35, 24, 2]] }],
  escort: { id: 'tobei', at: [53, 14], hp: 60 },
  boss: { id: 'hotaru', at: [21, 32], intro: ['hotaru', 'hot_intro'], defeat: ['hotaru', 'hot_defeat'], close: [] },
  interact: [{ id: 'cage', at: [52, 14], hold: 1.5, text: 'Open the cage', do: [['free'], ['checkpoint']] },
    { id: 'lever', at: [36, 31.4], hold: 1.2, text: 'Open the water gate', do: [['open', 31, 32, 1, 1, '='], ['say', 'granny', 'm2_gate']] },
    { id: 'post1', at: [39, 40.6], hold: 1.5, text: 'Cut the barge loose', count: 'barges', do: [['barges']] }, { id: 'post2', at: [45, 40.6], hold: 1.5, text: 'Cut the barge loose', count: 'barges', do: [['barges']] },
    { id: 'post3', at: [51, 40.6], hold: 1.5, text: 'Cut the barge loose', count: 'barges', do: [['barges']] }],
  pickups: [{ kind: 'tool', tool: 'smoke', n: 1, at: [33, 36] }, { kind: 'tool', tool: 'riceball', n: 2, at: [55, 21] }],
  objectives: [
    { id: 'rescue', type: 'rescue', interact: 'cage', text: 'Rescue Tobei from the bamboo cage (north-east)' },
    { id: 'gate', type: 'interact', interact: 'lever', text: 'Open the water gate (the lever inside the west wall)', hidden: true, after: ['rescue'] },
    { id: 'barges', type: 'interact', flag: 'barges', count: 3, optional: true, text: 'Optional: cut the 3 rice barges loose at the dock' },
    { id: 'hotaru', type: 'defeat', boss: 'hotaru', text: 'Defeat Hotaru on the pier', hidden: true, after: ['gate'] },
    { id: 'escort', type: 'escort', exit: true, text: 'Bring Tobei to the boat in the reeds', hidden: true, after: ['hotaru'] }],
  triggers: [{ id: 'arrive', when: 'time:.6', do: [['say', 'granny', 'm2_arrive']] }, { id: 'inside', rect: [32, 3, 55, 45], do: [['checkpoint']] },
    { id: 'pier', rect: [19, 30, 29, 34], when: 'objective:gate', do: [['boss', 'hotaru']] }],
  timer: null
});

/* ---- Mission 3: Moon over Kokaku (festival night; the keep) ---- */
def('level', 'm3', { name: 'Moon over Kokaku', size: [64, 56], time: 'festival', faction: 'kokaku', music: 'm3', weather: 'maple', par: 960,
  rows: R(64, 56, '~', [['box', 0, 0, 63, 55, '#'], ['box', 3, 3, 58, 50, '#'], ['rect', 4, 4, 57, 20, ','], ['rect', 8, 6, 52, 18, '+'], ['box', 12, 8, 19, 13, 'H'], ['rect', 13, 9, 18, 12, '_'], ['set', 15, 13, 'd'], ['set', 16, 13, 'd'],
    ['rect', 4, 21, 57, 21, 'W'], ['set', 30, 21, '.'], ['set', 31, 21, '.'], ['rect', 4, 22, 57, 49, ':'], ['rect', 10, 26, 25, 41, 'G'], ['rect', 12, 28, 23, 39, 'K'], ['rect', 14, 30, 21, 37, 'M'],
    ['rect', 4, 4, 5, 5, 'T'], ['rect', 56, 4, 57, 5, 'T'], ['rect', 4, 48, 5, 49, 'T'], ['rect', 56, 48, 57, 49, 'T'], ['rect', 36, 26, 41, 31, 'B'], ['rect', 44, 38, 50, 43, 'C'], ['rect', 28, 44, 32, 46, 'P']]),
  zones: [{ id: 'moat', rect: [1, 51, 62, 54], name: 'The Outer Moat' }, { id: 'bailey', rect: [4, 4, 57, 20], name: 'The Festival Garden' }, { id: 'honmaru', rect: [4, 22, 57, 49], name: 'The Honmaru' }, { id: 'keep', rect: [10, 26, 25, 41], name: 'Kokaku Keep' }],
  lights: [paper(9, 7), paper(14, 7), paper(20, 7), paper(26, 7), paper(32, 7), paper(38, 7), paper(44, 7), paper(50, 7), paper(9, 17), paper(22, 17), paper(30, 17), paper(40, 17), paper(50, 17), lantern(24, 12), lantern(36, 12),
    lantern(28, 24), lantern(34, 24), lantern(28, 35), lantern(44, 35), lantern(52, 25), lantern(8, 44), paper(15.5, 13.6), { at: [17.5, 33.5], z: 170, r: 90, i: .7, color: '#ffd8a0', kind: null }, { at: [17.5, 27], z: 118, r: 70, i: .6, color: '#ffb060', kind: null }],
  props: [['yatai', 26, 15], ['yatai', 34, 15, { facing: Math.PI }], ['yatai', 44, 10], ['taiko', 30, 10], ['nobori', 22, 9], ['nobori', 38, 9], ['torii', 30.5, 19.4], ['sakeBarrel', 40, 15], ['sakeBarrel', 41, 15.6], ['bambooClump', 6, 10], ['bambooClump', 55, 12],
    ['strawMat', 14.5, 10.5], ['jubako', 16, 10.2], ['weaponRack', 34, 34], ['riceBale', 46, 36], ['well', 52, 30], ['boat', 20, 53.5]],
  anchors: [],
  hero: { at: [24.5, 52.5], facing: 270 }, exit: null,
  bells: [[45, 32]], barracks: [[38.5, 32.5]],
  guards: [
    { id: 'sam1', type: 'samurai', faction: 'kokaku', at: [30, 23], facing: 90, mode: 'post', lantern: true }, { id: 'sam2', type: 'samurai', faction: 'kokaku', at: [31.5, 19.5], facing: 90, mode: 'post' },
    { id: 'sam3', type: 'samurai', faction: 'kokaku', at: [10.5, 26.5], z: 64, mode: 'patrol', route: [[10.5, 26.5, 1], [24.5, 26.5, 1], [24.5, 40.5, 1], [10.5, 40.5, 1]] },
    { id: 'sam4', type: 'samurai', faction: 'kokaku', at: [12.5, 28.5], z: 112, mode: 'patrol', route: [[12.5, 28.5, 2], [22.5, 28.5, 1], [22.5, 38.5, 2], [12.5, 38.5, 1]] },
    { id: 'sam5', type: 'samurai', faction: 'kokaku', at: [44, 24], mode: 'patrol', route: [[44, 24, 2], [55, 24, 1], [55, 46, 2], [44, 46, 1]] }, { id: 'sam6', type: 'samurai', faction: 'kokaku', at: [8, 14], mode: 'patrol', route: [[8, 14, 2], [8, 6, 2]] },
    { id: 'ash1', type: 'ashigaru', faction: 'kokaku', at: [28, 30], mode: 'patrol', lantern: true, route: [[28, 24, 1], [28, 46, 2], [8, 46, 1], [8, 24, 2]] }, { id: 'ash2', type: 'ashigaru', faction: 'kokaku', at: [48, 34], mode: 'post', facing: 180 },
    { id: 'ash3', type: 'ashigaru', faction: 'kokaku', at: [33, 40], mode: 'chat', partner: 'ash4', facing: 0 }, { id: 'ash4', type: 'ashigaru', faction: 'kokaku', at: [34.5, 40], mode: 'chat', partner: 'ash3', facing: 180 },
    { id: 'ash5', type: 'ashigaru', faction: 'kokaku', at: [52, 18], mode: 'patrol', route: [[52, 18, 2], [52, 6, 2]] }, { id: 'ash6', type: 'ashigaru', faction: 'kokaku', at: [7, 33], mode: 'sleep' },
    { id: 'arc1', type: 'archer', faction: 'kokaku', at: [4.5, 4.5], z: 80, facing: 45, mode: 'post' }, { id: 'arc2', type: 'archer', faction: 'kokaku', at: [56.5, 4.5], z: 80, facing: 135, mode: 'post' },
    { id: 'arc3', type: 'archer', faction: 'kokaku', at: [4.5, 48.5], z: 80, facing: 315, mode: 'post', lantern: true }, { id: 'arc4', type: 'archer', faction: 'kokaku', at: [56.5, 48.5], z: 80, facing: 225, mode: 'post', lantern: true },
    { id: 'nin1', type: 'ninja', faction: 'redlantern', at: [38.5, 28.5], z: 64, mode: 'post', facing: 180 }, { id: 'nin2', type: 'ninja', faction: 'redlantern', at: [46.5, 40.5], z: 48, mode: 'post', facing: 270 },
    { id: 'hnd1', type: 'hound', faction: 'kokaku', at: [40, 44], mode: 'patrol', route: [[36, 44, 1], [44, 47, 1]] }],
  civilians: [{ id: 'nob1', kind: 'noble', at: [27, 12], facing: 0, mode: 'post' }, { id: 'nob2', kind: 'noble', at: [33, 12], facing: 180, mode: 'post' }, { id: 'nob3', kind: 'noble', at: [42, 16], mode: 'patrol', route: [[42, 16, 3], [47, 12, 3]] },
    { id: 'srv1', kind: 'servant', at: [24, 9], mode: 'patrol', route: [[24, 9, 2], [36, 9, 2]] }, { id: 'srv2', kind: 'servant', at: [46, 8], facing: 90, mode: 'post' }, { id: 'srv3', kind: 'servant', at: [20, 16], mode: 'patrol', route: [[20, 16, 2], [12, 16, 2]] },
    { id: 'dis1', kind: 'servant', disguised: true, at: [36, 16], mode: 'patrol', route: [[36, 16, 3], [28, 17, 2]] }, { id: 'dis2', kind: 'servant', disguised: true, at: [50, 13], facing: 180, mode: 'post' }, { id: 'dis3', kind: 'servant', disguised: true, at: [10, 18], mode: 'patrol', route: [[10, 18, 2], [10, 11, 2]] }],
  boss: { id: 'kurogane', at: [17.5, 33.5], z: 160, intro: ['kurogane', 'kur_intro'], defeat: ['kurogane', 'kur_defeat'], close: [], bpm: 132 },
  interact: [{ id: 'sake', at: [16, 10.4], hold: 1, text: 'Swap the poisoned sake', do: [['swap'], ['say', 'granny', 'm3_swapped'], ['checkpoint']] }],
  pickups: [{ kind: 'tool', tool: 'riceball', n: 2, at: [24, 40.5], z: 64 }, { kind: 'tool', tool: 'smoke', n: 1, at: [44, 30] }],
  objectives: [
    { id: 'sake', type: 'stopTimer', interact: 'sake', text: 'Find the poisoned sake in the tea pavilion before the moon is high' },
    { id: 'disguised', type: 'flag', flag: 'disguisedDown', count: 3, optional: true, text: 'Optional: silence the 3 disguised Red Lanterns (Ki Focus shows them)' },
    { id: 'climb', type: 'reach', at: [17.5, 33.5], r: 4, z: 160, text: 'Climb the keep to the top roof', hidden: true, after: ['sake'], say: ['granny', 'm3_keep'] },
    { id: 'kurogane', type: 'defeat', boss: 'kurogane', text: 'Defeat Chamberlain Kurogane', hidden: true, after: ['climb'] }],
  triggers: [{ id: 'arrive', when: 'time:.6', do: [['say', 'granny', 'm3_arrive']] }, { id: 'bailey', rect: [4, 4, 57, 20], do: [['checkpoint']] },
    { id: 'tier2', rect: [12, 28, 23, 39], z: 112, do: [['checkpoint']] }, { id: 'arena', rect: [14, 30, 21, 37], z: 160, when: 'objective:sake', do: [['boss', 'kurogane']] }],
  timer: { seconds: 720, fail: 'The lord raised his cup. The moon drank him.', stopOn: 'objective:sake' }
});

/* ---- Night Delivery: the Shadow Trial and the AI Hub round ---- */
def('level', 'delivery', { name: 'Night Delivery', size: [34, 30], time: 'night', faction: 'kanemori', music: 'm1', weather: null, par: 300,
  rows: R(34, 30, '.', [['box', 0, 0, 33, 29, '#'], ['rect', 1, 1, 32, 3, '~'], ['box', 2, 4, 31, 25, 'W'], ['set', 16, 4, 'd'], ['set', 17, 4, 'd'], ['rect', 3, 5, 30, 24, ':'],
    ['rect', 6, 7, 9, 10, 'C'], ['rect', 24, 7, 27, 10, 'C'], ['rect', 19, 7, 20, 8, 'T'], ['box', 14, 12, 20, 17, 'H'], ['rect', 15, 13, 19, 16, '_'], ['set', 17, 17, 'd'],
    ['rect', 3, 13, 6, 16, ','], ['rect', 25, 19, 29, 22, ','], ['rect', 10, 18, 14, 21, '~'], ['rect', 3, 5, 30, 5, '+'], ['rect', 16, 18, 18, 24, '+']]),
  zones: [{ id: 'yard', rect: [3, 5, 30, 24], name: 'Sakubei\'s Yard' }, { id: 'canal', rect: [1, 1, 32, 3], name: 'The Canal' }],
  lights: [lantern(10, 15), lantern(23, 15), lantern(17, 22), paper(17, 18.2), paper(19.5, 7.5, { z: 84, r: 70 }), paper(15, 6), paper(19, 6), lantern(4, 27), lantern(29, 27)],
  props: [['riceBale', 4, 7], ['riceBale', 4.8, 7.6], ['sakeBarrel', 29, 13], ['waterBarrel', 12, 7], ['boat', 16.5, 2], ['strawMat', 17, 14.5], ['jubako', 16, 14.4]],
  anchors: [],
  hero: { at: [16.5, 27], facing: 270 }, exit: { at: [16.5, 4], r: 1.4 },
  bells: [], barracks: [],
  guards: [
    { id: 'd_ash1', type: 'ashigaru', at: [8, 22], mode: 'patrol', lantern: true, route: [[5, 22, 1], [28, 22, 1], [28, 11, 1], [11, 11, 1]] },
    { id: 'd_ash2', type: 'ashigaru', at: [12, 6], mode: 'patrol', route: [[5, 6, 2], [14, 6, 1]] }, { id: 'd_ash3', type: 'ashigaru', at: [29, 17], facing: 180, mode: 'post' },
    { id: 'd_sam1', type: 'samurai', at: [17, 18.5], facing: 90, mode: 'post' }, { id: 'd_sam2', type: 'samurai', at: [10, 17], mode: 'patrol', route: [[9, 17, 2], [9, 23, 1]] },
    { id: 'd_arc', type: 'archer', at: [19.5, 7.5], z: 80, facing: 90, mode: 'post', lantern: true }, { id: 'd_nin', type: 'ninja', at: [25.5, 8.5], z: 48, mode: 'patrol', route: [[24.5, 7.5, 2], [27.5, 9.5, 2]] },
    { id: 'd_hnd', type: 'hound', at: [11, 9], mode: 'patrol', route: [[11, 8, 1], [11, 11, 1]] }],
  civilians: [{ id: 'sakubei', type: 'target', kind: 'merchant', target: true, name: 'Broker Sakubei', at: [17, 14], facing: 90, mode: 'post', voice: 'sakubei' }, { id: 'clerk1', kind: 'clerk', at: [15.5, 15.5], facing: 0, mode: 'post' }, { id: 'clerk2', kind: 'clerk', at: [23, 6], mode: 'patrol', route: [[23, 6, 3], [27, 6, 3]] }],
  pickups: [], interact: [],
  objectives: [{ id: 'kill', type: 'assassinate', target: 'sakubei', text: 'Silence Broker Sakubei in his counting hall' }, { id: 'escape', type: 'reach', exit: true, text: 'Out through the canal gate', hidden: true, after: ['kill'] }],
  triggers: [], timer: null
});

/* ---- missions: metadata, briefings, loadouts, unlocks, the story order ---- */
def('mission', 'training', { title: 'The Trial of the Second Tier', level: 'training', next: 'm1', loadoutHint: ['riceball', 'poison', 'firecracker', 'smoke', 'shuriken', 'caltrops', 'riceball', 'firecracker'], par: 420, num: 'Prologue' });
def('mission', 'm1', { title: 'Rice and Ash', level: 'm1', next: 'm2', loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'riceball', 'shuriken'], par: 720, num: 'Mission 1' });
def('mission', 'm2', { title: 'The Fort at Kiri Lake', level: 'm2', next: 'm3', loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'riceball', 'smoke'], par: 900, num: 'Mission 2' });
def('mission', 'm3', { title: 'Moon over Kokaku', level: 'm3', next: 'end', loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'riceball', 'riceball'], par: 960, num: 'Mission 3' });
def('mission', 'delivery', { title: 'Night Delivery', level: 'delivery', next: null, loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'shuriken', 'riceball'], par: 300, num: 'Shadow Trial' });
B.STORY_ORDER = ['training', 'm1', 'm2', 'm3'];

/* ---- 70-hud ---- */
/* 70-hud: the in-game HUD on canvas, inside 4% overscan margins: health and Silent Cuts (top left), objective and boss
 * bar (top centre), the moon timer and the place (top right), the Ki Gauge (bottom left), the tool box (bottom right),
 * context prompts (bottom centre), marks over guards, bark bubbles, edge chevrons, the letterbox and the 静斬 splash. */
B.prompts = M => {
  const h = M.hero, out = []; if (!h || h.dead || M.over) return out;
  const c = B.cutCandidate(h, M); if (c) out.push({ act: 'attack', label: (c.g.mark ? 'Silent Mark - ' : 'Silent Cut - ') + B.CUT_NAMES[c.kind] });
  else if (M.guards.concat(M.bosses).some(e => e.alive && e.staggerT > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 28)) out.push({ act: 'attack', label: 'Riposte' });
  else if (M.guards.concat(M.bosses).some(e => e.alive && e.swing && e.swing.phase === 'wind' && e.swing.u > .4 && Math.hypot(e.x - h.x, e.y - h.y) < 34 && e.parryable !== false)) out.push({ act: 'block', label: 'Parry!' });
  const it = B.interactable(h, M); if (it) out.push({ act: 'interact', label: (it.kind === 'hold' ? 'Hold: ' : '') + it.label, prog: it.kind === 'hold' && it.it.prog ? it.it.prog / (it.it.hold || 1) : 0 });
  if (out.length < 2 && h.anchor && !h.action) out.push({ act: 'grapple', label: h.grappleHold > .25 ? 'Release: grapple' : 'Grapple' });
  if (out.length < 2 && h.hug) out.push({ act: 'crouch', label: h.peek ? 'Peeking - leave the wall' : 'Leave the wall' });
  return out.slice(0, 2);
};
const box = (g, x, y, w, hh, a = .7) => { px.blend(g, a, 'normal', () => px.rect(g, x, y, w, hh, '#140c0c')); px.rect(g, x, y, w, 1, '#8a6a3a'); px.rect(g, x, y + hh - 1, w, 1, '#3a2a1a'); };
B.drawHud = (r, M) => {
  const G = B.game, h = M.hero, W = r.W, Hh = r.H, mx = Math.round(W * .04), my = Math.round(Hh * .04), t = G.real;
  r.overlay(g => {
    // the letterbox
    if (M.letterbox > .01) { const lb = Math.round(M.letterbox * Hh * .1); px.rect(g, 0, 0, W, lb, '#000'); px.rect(g, 0, Hh - lb, W, lb, '#000'); }
    // hit pulse at the edges
    if (M.hitFlash > 0) px.blend(g, M.hitFlash, 'normal', () => { px.rect(g, 0, 0, W, 4, '#d02a20'); px.rect(g, 0, Hh - 4, W, 4, '#d02a20'); px.rect(g, 0, 0, 4, Hh, '#d02a20'); px.rect(g, W - 4, 0, 4, Hh, '#d02a20'); });
    if (M.mode === 'attract' || !h) return B.drawSplash(g, r, M);
    if (M.letterbox > .6 && M.talk.open && M.talk.modal) return;
    // health: a vermilion brush stroke with the crest at its head
    const hw = 80, hp = clamp(h.hp / h.hpMax, 0, 1);
    box(g, mx, my, hw + 22, 26);
    px.sprite(g, B.CREST, mx + 3, my + 3);
    px.rect(g, mx + 19, my + 6, hw, 6, '#2a1414'); px.rect(g, mx + 19, my + 6, Math.round(hw * hp), 6, hp < .3 && Math.floor(t * 4) % 2 ? '#ff6a4a' : '#d8402a'); px.rect(g, mx + 19, my + 6, Math.round(hw * hp), 1, '#ff8a6a');
    for (let k = 0; k < Math.round(hw * hp); k += 7) px.dot(g, mx + 19 + k, my + 11, '#8a1c1c');
    B.drawKanji(g, 'sei', mx + 19, my + 14, .28, '#d02a20', '#1a0a08'); B.drawKanji(g, 'zan', mx + 29, my + 14, .28, '#d02a20', '#1a0a08');
    E.font.text(g, 'x' + M.stats.silentCuts, mx + 41, my + 15, '#f4ead5', { outline: false, shadow: '#000' });
    if (M.escort && M.escort.freed) { box(g, mx, my + 28, 70, 12); E.font.text(g, 'TOBEI', mx + 3, my + 30, '#b8a890', { outline: false }); const ep = M.escort.hp / M.escort.hpMax; for (let k = 0; k < 6; k++) px.rect(g, mx + 34 + k * 5, my + 31, 4, 5, k < Math.ceil(ep * 6) ? '#5ae0a0' : '#2a3a2a'); }
    // the boss bar
    const bb = M.bossBar; if (bb && bb.active) {
      const bw = Math.min(220, W - 120), bx = Math.round(W / 2 - bw / 2), by = my + 2; box(g, bx - 4, by - 2, bw + 8, 20, .8);
      E.font.text(g, bb.name.toUpperCase(), W / 2, by, '#e8b04a', { align: 'center', outline: false, shadow: '#000' });
      px.rect(g, bx, by + 10, bw, 5, '#2a1414'); px.rect(g, bx, by + 10, Math.round(bw * clamp(bb.hp / bb.hpMax, 0, 1)), 5, bb.phase === 2 ? '#ff6a2a' : '#d8402a'); px.rect(g, bx + bw / 2, by + 9, 1, 7, '#f4ead5');
    }
    if (M.bossCard && M.cine) E.font.title(g, M.bossCard.name.toUpperCase(), W / 2, Math.round(Hh * .32), { align: 'center', scale: 2, colors: ['#ffe8c0', '#e8b04a', '#d8402a'], depth: 2 });
    // ALARM banner
    if (M.bellRung && M.t - (M._bellShown || (M._bellShown = M.t)) < 3 && Math.floor(t * 3) % 2 === 0) E.font.title(g, 'ALARM!', W / 2, my + (bb ? 26 : 4), { align: 'center', scale: 2, colors: ['#ffd0a0', '#ff4a3a'], depth: 1 });
    // the moon timer, the place
    if (M.timer && !M.timer.stopped) {
      const tx = W - mx - 30, ty = my + 18, u = M.timer.left / M.timer.max, red = M.timer.left < 60;
      px.disc(g, tx, ty, 14, '#140c18'); for (let a = 0; a < 24; a++) { const an = Math.PI + a / 23 * Math.PI; px.dot(g, tx + Math.cos(an) * 12, ty + Math.sin(an) * 12, a / 23 <= 1 - u ? (red ? '#ff4a3a' : '#e8b04a') : '#3a3048'); }
      const an = Math.PI + (1 - u) * Math.PI; px.disc(g, tx + Math.cos(an) * 12, ty + Math.sin(an) * 12, 3, '#f4ecd0');
      E.font.text(g, B.fmtTime(M.timer.left), tx, ty + 2, red ? '#ff6a4a' : '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
    }
    if (M.placeT > 0 && M.place) { const a = Math.min(1, M.placeT); px.blend(g, a, 'normal', () => E.font.text(g, M.place.name, W - mx, my + (M.timer && !M.timer.stopped ? 38 : 4), '#e8dcc0', { align: 'right', outline: false, shadow: '#000' })); }
    if (M.mode === 'trial' || M.mode === 'hub') { const s = B.trialScore(M); E.font.text(g, 'SCORE ' + s, W - mx, my + 4, '#e8b04a', { align: 'right', outline: false, shadow: '#000' }); E.font.text(g, B.fmtTime(M.hubClock !== undefined ? M.hubClock : M.t), W - mx, my + 14, '#b8a890', { align: 'right', outline: false, shadow: '#000' }); }
    // the Ki Gauge
    const kx = mx + 22, ky = Hh - my - 6, col = MOOD[M.kiState] || MOOD.calm;
    px.disc(g, kx, ky, 21, '#100a10');
    for (let a = 0; a <= 32; a++) { const an = Math.PI + a / 32 * Math.PI, on = a / 32 <= M.ki / 99; px.rect(g, Math.round(kx + Math.cos(an) * 18), Math.round(ky + Math.sin(an) * 18), 2, 2, on ? col : '#2a2430'); }
    E.font.text(g, String(M.ki).padStart(2, '0'), kx, ky - 15, M.ki ? col : '#5a5060', { align: 'center', scale: 2, outline: false, shadow: '#000' });
    const L = M.world.lightAt(h.x, h.y), eyeY = ky - 2; px.ell(g, kx, eyeY, 5, L < .35 ? 1 : L < .6 ? 2 : 3, '#e8dcc0'); if (L >= .35) px.disc(g, kx, eyeY, L < .6 ? 1 : 2, '#1a1418'); if (L < .35) px.rect(g, kx - 5, eyeY, 11, 1, '#5a5060');
    if (M.kiState === 'notice' || M.kiState === 'search' || M.kiState === 'alert') E.font.text(g, M.kiState === 'alert' ? '!' : '?', kx + 18, ky - 22, col, { scale: 2, outline: false, shadow: '#000' });
    if (h.focus) E.font.text(g, 'KI FOCUS', kx, ky + 1, '#a0a0ff', { align: 'center', outline: false, font: 'tiny' });
    // the tool box
    const s = B.Bento.cur(M), bx2 = W - mx - 44, by2 = Hh - my - 40;
    box(g, bx2, by2, 44, 40, .78);
    if (s) { const icon = B.ICON[s.tool]; if (icon) px.sprite(g, icon, bx2 + 15 - 6, by2 + 6, { scale: 2 }); E.font.text(g, 'x' + (M.cheats.infTools ? '99' : s.n), bx2 + 40, by2 + 28, '#f4ead5', { align: 'right', outline: false, shadow: '#000' }); }
    else E.font.text(g, 'EMPTY', bx2 + 22, by2 + 16, '#7a6a5a', { align: 'center', outline: false });
    if (M.toolFlash > 0 && s) E.font.text(g, get('tool', s.tool).name, bx2 + 44, by2 - 10, '#e8b04a', { align: 'right', outline: false, shadow: '#000' });
    const dv = B.device(); if (dv === 'gamepad') { B.glyph(g, 'toolPrev', bx2 - 12, by2 + 14); B.glyph(g, 'toolNext', bx2 + 46, by2 + 14); B.glyph(g, 'useTool', bx2 + 2, by2 + 27); }
    else { B.glyph(g, 'useTool', bx2 + 2, by2 + 27); }
    for (let k = 0; k < 8; k++) px.rect(g, bx2 + 4 + k * 5, by2 + 2, 4, 2, k === M.bento.sel ? '#e8b04a' : M.bento.slots[k] && M.bento.slots[k].n > 0 ? '#8a6a4a' : '#3a2a20');
    // the compass (north) beside the tool box
    const cx2 = bx2 - 10, cy2 = by2 + 36, n = r.view.p(0, -1), nl = Math.hypot(n[0], n[1]) || 1; px.disc(g, cx2, cy2, 5, '#140c0c'); px.line(g, cx2, cy2, Math.round(cx2 + n[0] / nl * 5), Math.round(cy2 + n[1] / nl * 5), '#d8402a'); E.font.text(g, 'N', Math.round(cx2 + n[0] / nl * 9), Math.round(cy2 + n[1] / nl * 9) - 3, '#b8a890', { align: 'center', outline: false, font: 'tiny' });
    // context prompts
    const pr = B.prompts(M); let py = Hh - my - 14 - (pr.length - 1) * 15;
    for (const p of pr) { const txt = '{a:' + p.act + '} ' + p.label, w = B.richW(txt) + 10; box(g, Math.round(W / 2 - w / 2), py - 3, w, 14, .7); B.rich(g, txt, W / 2, py, '#f4ead5', { align: 'center' }); if (p.prog) E.ui.bar(g, Math.round(W / 2 - w / 2) + 2, py + 9, Math.round((w - 4) * clamp(p.prog, 0, 1)), 1, 1, '#e8b04a'); py += 15; }
    // the tutorial card
    if (M.tut) { M.tut.t += 1 / 60; const tw = Math.min(300, W - 120), lines = E.font.wrap(M.tut.text.replace(/\{a:[a-zA-Z]+\}/g, 'MMM'), tw - 12); const th = 18 + lines.length * 11, tx = Math.round(W / 2 - tw / 2), ty = Math.round(Hh * .62) - th;
      box(g, tx, ty, tw, th, .85); E.font.text(g, M.tut.title.toUpperCase(), tx + 6, ty + 4, '#e8b04a', { outline: false }); B.richWrap(g, M.tut.text, tx + 6, ty + 15, tw - 12, '#f4ead5'); if (M.tut.t > 9) M.tut = null; }
    B.drawSplash(g, r, M);
  });
};
/* wrapped rich text: words and {a:} tokens */
B.richWrap = (g, s, x, y, w, color) => {
  const words = s.split(' '); let line = '', yy = y;
  for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (B.richW(test) > w && line) { B.rich(g, line, x, yy, color); yy += 11; line = wd; } else line = test; }
  if (line) B.rich(g, line, x, yy, color); return yy + 11;
};
/* the 静斬 splash: two brush kanji, an ink burst and a caption */
B.drawSplash = (g, r, M) => {
  const sp = M.splash; if (!sp) return;
  const u = sp.t, a = u < .1 ? u / .1 : u > 1.1 ? Math.max(0, 1 - (u - 1.1) / .3) : 1, S = 2.1, x = Math.round(r.W * .16), y = Math.round(r.H * .3);
  const col = sp.mark ? '#f0f0e8' : '#d02a20', edge = sp.mark ? '#5a5a60' : '#1a0806';
  px.blend(g, a, 'normal', () => {
    for (let k = 0; k < 14; k++) { const an = k * 2.4, rr = 30 + (k * 37) % 40; px.disc(g, x + 34 + Math.cos(an) * rr * Math.min(1, u * 4), y + 34 + Math.sin(an) * rr * .7 * Math.min(1, u * 4), 2 + k % 3, edge); }
    B.drawKanji(g, 'sei', x - 4, y, S * .5, col, edge); B.drawKanji(g, 'zan', x + 34, y + 8, S * .5, col, edge);
    E.font.text(g, sp.mark ? 'SILENT MARK' : 'SILENT CUT', x + 34, y + 50, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
    E.font.text(g, B.CUT_NAMES[sp.kind].toUpperCase(), x + 34, y + 60, '#e8b04a', { align: 'center', outline: false, shadow: '#000' });
  });
};
/* world marks: guard awareness, bark bubbles, breath and stamina, the objective marker, chevrons, sight cones */
B.drawWorldMarks = (r, M) => {
  const G = B.game, h = M.hero; if (!h) return;
  const cones = G.settings.cones && M.mode !== 'attract';
  for (const g of M.guards) {
    if (!g.alive || g.vis === 'hidden' || g.civilian && !g.disguised) continue;
    if (cones && g.vis === 'visible' && !g.asleep) r.sightCone(g, { map: M.world.map, range: B.T('sightRange') * g.T.sight, fov: B.T('sightFov') * (g.T.fov / 1.5), color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .16 : .3 });
    else if (h.focus && g.vis === 'sensed') r.sightCone(g, { map: M.world.map, range: B.T('sightRange') * g.T.sight, fov: B.T('sightFov'), color: '#7a7aff', alpha: .18 });
  }
  if (M.dev && M.dev.ai) for (const g of M.guards) if (g.alive) { r.sightCone(g, { map: M.world.map, range: B.T('sightRange') * g.T.sight, fov: B.T('sightFov'), color: MOOD[g.mind.state], alpha: .25 }); }
  if (G.settings.marker && M.mode !== 'attract') { const tgt = B.objectiveTarget(M); if (tgt) r.marker(tgt.x, tgt.y, tgt.z || 0, { label: tgt.label, color: '#e8b04a' }); }
  r.overlay(g => {
    for (const q of M.guards.concat(M.bosses, M.escort ? [M.escort] : [])) {
      const [sx, sy] = r.w(q.x, q.y, q.z + (q.type === 'hound' ? 24 : 46)); if (sx < -20 || sx > r.W + 20 || sy < -20 || sy > r.H + 20) continue;
      if (q.bubble && (q.vis !== 'hidden' || q === M.escort)) { const lines = E.font.wrap(q.bubble.text, 110), bw = Math.max(...lines.map(l => E.font.width(l))) + 8, bh = lines.length * 9 + 4, bx = Math.round(sx - bw / 2), by = Math.round(sy - bh - 12);
        px.rect(g, bx, by, bw, bh, '#f4ead5'); px.rect(g, bx, by + bh, bw, 1, '#8a7a60'); px.poly(g, [[sx - 3, by + bh], [sx + 3, by + bh], [sx, by + bh + 4]], '#f4ead5'); lines.forEach((l, i) => E.font.text(g, l, bx + 4, by + 2 + i * 9, '#1a1418', { outline: false })); }
      if (!q.alive || q === M.escort || q.boss || q.vis === 'hidden' || q.civilian && !q.disguised) continue;
      const st = q.mind.state, c = MOOD[st];
      if (q.asleep) E.font.text(g, 'Zz', sx, sy - 6 - Math.round(Math.sin(G.real * 3) * 2), '#b8c8ff', { align: 'center', outline: false, shadow: '#000' });
      else if (q.eating && q.eatT > 0) E.font.text(g, '...', sx, sy - 6, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
      else if (st !== 'calm') { E.font.text(g, st === 'alert' ? '!' : '?', sx, sy - 9, c, { align: 'center', scale: 2, outline: false, shadow: '#000' }); E.ui.bar(g, Math.round(sx) - 7, Math.round(sy) + 6, 14, 2, Math.min(1, q.mind.level / 1.2), c); }
      if (B.mouseMode()) { const p = G.input.pointer(); if (p && Math.hypot(p[0] - sx, p[1] - sy - 24) < 18) { E.font.text(g, q.label, sx, sy - 22, '#f4ead5', { align: 'center', outline: false, shadow: '#000' }); E.ui.bar(g, Math.round(sx) - 10, Math.round(sy) - 12, 20, 2, Math.min(1, q.mind.level / 1.2), c); } }
      if (M.dev && M.dev.ai) E.font.text(g, st + (q.bellRun ? ' BELL' : ''), sx, sy + 10, '#ffffff', { align: 'center', font: 'tiny' });
    }
    // chevrons toward alerted enemies off screen
    for (const q of M.guards) { if (!q.alive || q.mind.state !== 'alert' || q.civilian) continue; const [sx, sy] = r.w(q.x, q.y, q.z + 20); if (sx >= 0 && sx <= r.W && sy >= 0 && sy <= r.H) continue; const cx = clamp(sx, 10, r.W - 10), cy = clamp(sy, 10, r.H - 10), a = Math.atan2(sy - r.H / 2, sx - r.W / 2); px.poly(g, [[cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a + 2.4) * 5, cy + Math.sin(a + 2.4) * 5], [cx + Math.cos(a - 2.4) * 5, cy + Math.sin(a - 2.4) * 5]], '#ff4a3a'); }
    // over the hero: breath and stamina
    const [hx, hy] = r.w(h.x, h.y, h.z + 44);
    if (h.dive || h.breath < B.T('breath') - .1) { const n = Math.ceil(h.breath / B.T('breath') * 6); for (let k = 0; k < 6; k++) px.disc(g, hx - 13 + k * 5, hy - 4, 2, k < n ? '#a8d8ff' : '#2a3a4a'); }
    if (h.stamina < h.staminaMax - .5) { const u = h.stamina / h.staminaMax; for (let a = 0; a < 16; a++) { const an = -Math.PI / 2 + a / 16 * TAU; px.dot(g, Math.round(hx + 14 + Math.cos(an) * 4), Math.round(hy + 6 + Math.sin(an) * 4), a / 16 <= u ? '#5ae0a0' : '#2a3a2a'); } }
    // grapple anchors: the highlighted one, or all of them while aiming
    const L = h.grappleHold > .25 ? h.anchors || [] : h.anchor ? [h.anchor] : [];
    for (const a of L) { const [ax, ay] = r.w(a.x, a.y, a.z), on = a === h.anchor, s = on ? 4 + Math.round(Math.sin(G.real * 6)) : 2; px.poly(g, [[ax, ay - s], [ax + s, ay], [ax, ay + s], [ax - s, ay]], on ? '#e8b04a' : '#8a7a5a'); }
  });
};
/* where the objective marker points */
B.objectiveTarget = M => {
  const ob = M.objectives.find(o => o.state === 'active' && !o.optional && (!o.after || o.after.every(x => M.objDone(x)))); if (!ob) return null;
  if (ob.type === 'assassinate') { const g = M.guards.find(q => q.id === ob.target && q.alive); return g ? { x: g.x, y: g.y, z: g.z, label: 'TARGET' } : null; }
  if (ob.type === 'defeat') { const b = M.bosses.find(q => q.bossId === ob.boss); return b && b.alive ? { x: b.x, y: b.y, z: b.z, label: b.active ? '' : 'DUEL' } : null; }
  if (ob.type === 'reach' || ob.type === 'escort') { if (ob.exit && M.exit) return { x: M.exit.x, y: M.exit.y, z: 0, label: 'EXIT' }; if (ob.at) return { x: cc(ob.at[0]), y: cc(ob.at[1]), z: ob.z || 0, label: '' }; }
  if (ob.type === 'rescue' || ob.type === 'interact' || ob.type === 'stopTimer') { const it = M.interacts.find(i => !i.done && (i.id === ob.interact || (ob.flag && i.count === ob.flag))); return it ? { x: it.x, y: it.y, z: it.z, label: '' } : null; }
  if (ob.type === 'retrieve') { const p = M.pickups.find(q => q.id === ob.pickup && !q.taken); return p ? { x: p.x, y: p.y, z: p.z, label: '' } : null; }
  if (ob.type === 'flag' && ob.flag === 'trialDone') { const n = M.talkers[0]; return n ? { x: n.x, y: n.y, z: 0, label: 'GRANNY' } : null; }
  return null;
};

/* ---- 71-scenes ---- */
/* 71-scenes: the title (and its idle clock into attract mode, and the touch-only notice), character select, mission
 * select, Pack the Bento, results with the rank stamp, About / Credits, and the story's flow between them. */
const MENU_SCENE = { view: 'side', res: 'ps1', input: B.INPUT, expand: true, touch: [] };
const titleBg = new E.Backdrop({ sky: ['#05060f', '#141838', '#2a2450'], moon: { x: .72, y: .26, r: 26, color: '#f4ecd0' }, stars: 70, starsY: .6,
  layers: [{ kind: 'mountains', color: '#1a1a38', y: .62, height: .26, parallax: .1 }, { kind: 'castle', color: '#0e0e22', y: .7, height: .3, parallax: .2 }, { kind: 'fog', color: '#3a3a6a', y: .78, height: .1, parallax: .3, drift: 3 }, { kind: 'forest', color: '#0a0c18', y: .86, height: .12, parallax: .4 }] });
const ridge = new E.PlatformMap({ rows: ['S'.repeat(70), 'S'.repeat(70)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#3a4458' } }, edges: 'open' });
const MIDX = 560;
B.titleRigs = null;
const titleItems = () => [B.hasSave() && 'Continue', 'New Story', 'Missions', 'Shadow Trial', 'Workshop', 'Settings', 'About'].filter(Boolean);
B.scenes.title = Object.assign({}, MENU_SCENE, {
  enter() {
    const G = B.game; G.resetCamera(); G.follow(null); G.cam.room = null; G.cam.bounds = null; G.lights.enabled = false; G.timeScale = 1; G.weather = { kind: 'petals', amount: .5, wind: .4 };
    if (!B.titleRigs) B.titleRigs = [B.RIGS.sojiro(), B.RIGS.kaede()];
    B.music.play('title'); B.idle = 0; this.pressed = !!this.pressedOnce; this.t = 0;
    this.items = titleItems(); this.menu = new E.Menu(G, this.items, { y: 112, onPick: i => this.pick(this.items[i]) });
  },
  pick(it) {
    const G = B.game; B.sfx('uiConfirm');
    if (it === 'Continue') { if (B.loadLatest()) B.Flow.continueStory(); }
    else if (it === 'New Story') G.go('charSelect', { then: 'story' });
    else if (it === 'Missions') { if (!B.save.data) B.loadLatest() || (B.save.data = B.freshSave()); G.go('missionSelect'); }
    else if (it === 'Shadow Trial') { if (!B.save.data) B.loadLatest() || (B.save.data = B.freshSave()); G.go('bento', { missionId: 'delivery', mode: 'trial', character: B.save.data.character || 'sojiro' }); }
    else if (it === 'Workshop') G.go('workshop', {});
    else if (it === 'Settings') G.menu('settings');
    else if (it === 'About') B.showAbout(0);
  },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt;
    B.idle += dt; if (I.anyPressed() || B.padActive() || B.ui.screen || (I.held && (I.held.size || 0) > 0)) B.idle = 0;
    if (B.idle > 10 && !B.HUB) { G.go('attract', {}, { fade: 'dissolve' }); return; }
    const tr = B.titleRigs; tr[0].update(dt, { x: MIDX - 22, y: 0, z: 32, vx: 0, vy: 0, facing: 0, pose: 'hips' }); tr[1].update(dt, { x: MIDX + 22, y: 0, z: 32, vx: 0, vy: 0, facing: Math.PI, stance: 'ready' });
    G.focus(MIDX, 0, 32 + (G.H / 2 - 46) / -G.view.bz);
    if (B.touchOnly) { const c = I.clicked(); if (c && this.btn && c[0] >= this.btn[0] && c[0] <= this.btn[0] + this.btn[2] && c[1] >= this.btn[1] && c[1] <= this.btn[1] + this.btn[3]) G.menu('settings'); return; }
    if (!this.pressed) { if (I.pressed('start') || I.pressed('confirm') || I.clicked()) { this.pressed = this.pressedOnce = true; B.sfx('uiConfirm'); I.consumeAll(); } return; }
    if (B.ui.screen) return;
    const was = this.menu.i; this.menu.update(dt); if (this.menu.i !== was) B.sfx('uiMove');
  },
  draw(r) {
    titleBg.draw(r); ridge.draw(r);
    for (const x of [MIDX - 90, MIDX + 90]) r.prop('lantern', x, 0, 40, { anchor: 'top', light: false, size: 1.2 });
    for (const rig of B.titleRigs) r.actor(rig.x, 0, 32, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'BENTOU 2', r.W / 2, 18, { align: 'center', scale: 4, colors: ['#fff4d8', '#e8b04a', '#d8402a', '#8a1c1c'], depth: 3 });
      E.font.text(g, 'Birth of the Lunchbox Assassins', r.W / 2, 54, '#f4ead5', { align: 'center', gradient: ['#ffffff', '#e8c8a0'], shadow: '#140c0c', outline: false });
      px.sprite(g, B.CREST, Math.round(r.W / 2 + E.font.width('BENTOU 2', { scale: 4 }) / 2 + 6), 22);
      E.font.text(g, E.versionLabel ? E.versionLabel() + '  game ' + B.VERSION : B.VERSION, r.W - 4, r.H - 9, '#6a6a8a', { align: 'right', outline: false, font: 'tiny' });
      if (B.touchOnly) {
        const w = 220, h = 70, x = Math.round(r.W / 2 - w / 2), y = 96; px.blend(g, .85, 'normal', () => px.rect(g, x, y, w, h, '#140c0c')); px.rect(g, x, y, w, 1, '#e8b04a');
        E.font.text(g, 'Controller or keyboard required', r.W / 2, y + 8, '#e8b04a', { align: 'center', outline: false });
        E.font.text(g, 'Connect a controller or a keyboard to play.', r.W / 2, y + 22, '#f4ead5', { align: 'center', outline: false });
        this.btn = [Math.round(r.W / 2 - 40), y + 40, 80, 20]; px.rect(g, this.btn[0], this.btn[1], 80, 20, '#e8b04a'); E.font.text(g, 'SETTINGS', r.W / 2, y + 46, '#140c0c', { align: 'center', outline: false });
        return;
      }
      if (!this.pressed) { if (Math.floor(this.t * 2) % 2 === 0) B.rich(g, 'PRESS {a:start}', r.W / 2, 128, '#f4ead5', { align: 'center' }); return; }
      const dev = B.device(); B.rich(g, dev === 'gamepad' ? '{a:up}{a:down} choose   {a:confirm} select' : dev === 'mouse' ? 'Click to select' : 'Arrows choose   Enter select', r.W / 2, r.H - 22, '#b8a890', { align: 'center' });
    });
    if (this.pressed && !B.touchOnly) this.menu.draw(r);
  }
});

/* ---- character select ---- */
B.scenes.charSelect = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d || {}; this.i = 0; this.rigs = [B.RIGS.sojiro(), B.RIGS.kaede()]; this.ids = ['sojiro', 'kaede']; this.t = 0; this.greet(); B.music.play('shop'); B.game.follow(null); B.game.lights.enabled = false; },
  greet() { const C = get('character', this.ids[this.i]); this.say = C.greet; this.sayT = 0; B.Voice.speak(C.greet, C.voice); },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt; this.sayT += dt;
    let ni = this.i; if (I.pressed('left')) ni = 0; if (I.pressed('right')) ni = 1;
    const p = I.pointer(); if (B.mouseMode() && p) ni = p[0] < G.W / 2 ? 0 : 1;
    if (ni !== this.i) { this.i = ni; B.sfx('uiMove'); this.greet(); }
    if (I.pressed('confirm') || I.clicked()) { B.sfx('uiConfirm'); I.consumeAll(); B.Flow.newStory(this.ids[this.i]); }
    if (I.pressed('cancel')) G.go('title');
    this.rigs.forEach((rg, k) => rg.update(dt, { x: -50 + k * 100, y: 0, z: 0, vx: 0, vy: 0, facing: k ? Math.PI * .85 : Math.PI * .15, stance: k === this.i ? 'ready' : null, pose: k === this.i && this.t % 4 < 1 ? 'cheer' : null }));
    G.focus(0, 0, 40 + (G.H / 2 - 60) / -G.view.bz);
  },
  draw(r) {
    titleBg.draw(r); ridge.draw(r);
    this.rigs.forEach((rg, k) => r.actor(rg.x, 0, 0, (g, ox, oy) => rg.draw(g, ox, oy, r.view), { flash: k === this.i ? undefined : '#1a1a2a', flashMix: k === this.i ? 0 : .55 }));
    r.overlay(g => {
      E.font.title(g, 'WHO PASSES THE TRIAL?', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      const C = get('character', this.ids[this.i]), x = this.i ? r.W - 130 : 12, y = 40;
      px.blend(g, .8, 'normal', () => px.rect(g, x - 4, y - 4, 124, 88, '#140c0c')); px.rect(g, x - 4, y - 4, 124, 1, C.crest);
      E.font.text(g, C.name.toUpperCase(), x, y, '#f4ead5', { scale: 2, outline: false, shadow: '#000' }); E.font.text(g, C.weapon, x, y + 17, '#e8b04a', { outline: false });
      ['Strength', 'Speed', 'Stealth'].forEach((lab, k) => { E.font.text(g, lab, x, y + 30 + k * 10, '#b8a890', { outline: false }); for (let j = 0; j < 5; j++) px.rect(g, x + 50 + j * 9, y + 31 + k * 10, 7, 5, j < C.bars[k] ? C.crest : '#3a2a2a'); });
      E.font.wrap(C.line, 116).forEach((l, k) => E.font.text(g, l, x, y + 62 + k * 9, '#f4ead5', { outline: false }));
      if (this.sayT < 3) { const w = E.font.width(this.say) + 10, bx = Math.round(r.W / 2 - w / 2); px.rect(g, bx, r.H - 50, w, 14, '#f4ead5'); E.font.text(g, this.say, r.W / 2, r.H - 47, '#1a1418', { align: 'center', outline: false }); }
      B.rich(g, '{a:left}{a:right} choose   {a:confirm} begin   {a:cancel} back', r.W / 2, r.H - 16, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- mission select: unlocked missions, best rank per character, the character toggle ---- */
B.scenes.missionSelect = Object.assign({}, MENU_SCENE, {
  enter() {
    const S = B.save.data; this.ch = S.character || 'sojiro'; this.list = B.STORY_ORDER.filter((id, i) => i === 0 || S.completed[B.STORY_ORDER[i - 1]] || S.completed[id]);
    this.menu = new E.Menu(B.game, this.list.map(id => get('mission', id).num + '  ' + get('mission', id).title), { y: 60, onPick: i => { B.sfx('uiConfirm'); B.Flow.startMission(this.list[i], 'missions', this.ch); } });
    B.music.play('shop'); B.game.follow(null);
  },
  update(dt) {
    const G = B.game, I = G.input; if (B.ui.screen) return;
    if (I.pressed('left') || I.pressed('right') || I.pressed('toolPrev') || I.pressed('toolNext') || I.pressed('block') || I.pressed('grapple')) { this.ch = this.ch === 'sojiro' ? 'kaede' : 'sojiro'; B.sfx('uiMove'); }
    if (I.pressed('cancel')) { G.go('title'); return; }
    this.menu.update(dt); G.focus(MIDX, 0, 120);
  },
  draw(r) {
    titleBg.draw(r);
    r.overlay(g => {
      px.blend(g, .85, 'normal', () => px.rect(g, 20, 30, r.W - 40, r.H - 60, '#1a1210')); px.rect(g, 20, 30, r.W - 40, 2, '#8a1c1c'); px.rect(g, 20, r.H - 32, r.W - 40, 2, '#8a1c1c');
      E.font.title(g, 'MISSIONS', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      E.font.text(g, 'Character: ' + get('character', this.ch).name, r.W / 2, 40, '#e8b04a', { align: 'center', outline: false });
      const S = B.save.data;
      this.list.forEach((id, i) => { const best = S.best[id] && S.best[id][this.ch]; if (best) { const y = this.menu.y + i * (this.menu.lh || 12); E.font.text(g, best.rank, r.W - 30, y, B.rankColor(best.rank), { align: 'right', outline: false, shadow: '#000' }); } });
      B.rich(g, '{a:up}{a:down} choose   {a:left}{a:right} character   {a:confirm} brief   {a:cancel} back', r.W / 2, r.H - 20, '#b8a890', { align: 'center' });
    });
    this.menu.draw(r);
  }
});

/* ---- Pack the Bento: the tool shelf (left) and the two-tier box (right) ---- */
B.scenes.bento = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; const S = B.save.data || (B.save.data = B.freshSave()), ms = get('mission', d.missionId);
    this.tools = B.TOOL_ORDER.filter(t => B.toolUnlocked(t)); this.hint = ms.loadoutHint.map(t => B.toolUnlocked(t) ? t : 'riceball');
    this.slots = (S.lastLoadout && S.lastLoadout.length === 8 ? S.lastLoadout : this.hint).map(t => t && B.toolUnlocked(t) ? t : null);
    this.fx = 0; this.fy = 0; this.brush = this.tools[0]; this.t = 0; B.music.play('shop'); B.game.follow(null); B.sfx('fusuma');
  },
  cells(r) { const out = [], sx = 16, sy = 34, rowH = Math.min(18, Math.floor((r.H - 80) / this.tools.length)); this.tools.forEach((t, i) => out.push({ kind: 'shelf', i, x: sx, y: sy + i * rowH, w: 120, h: rowH - 2, t }));
    const bw = Math.min(46, Math.floor((r.W - 170) / 4)), bx = Math.round(r.W - 20 - bw * 4), by = 52; for (let k = 0; k < 8; k++) out.push({ kind: 'slot', i: k, x: bx + (k % 4) * bw, y: by + Math.floor(k / 4) * (bw + 18), w: bw - 4, h: bw - 4 }); return out; },
  start() { const S = B.save.data; S.lastLoadout = this.slots.slice(); B.sfx('uiConfirm'); B.game.go('mission', Object.assign({}, this.d, { loadout: this.slots.slice() })); },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt; if (B.ui.screen) return;
    const col = this.fx === 0;
    if (I.pressed('up')) { if (col) this.fy = (this.fy - 1 + this.tools.length) % this.tools.length; else if (this.fy >= 4) this.fy -= 4; B.sfx('uiMove'); }
    if (I.pressed('down')) { if (col) this.fy = (this.fy + 1) % this.tools.length; else if (this.fy < 4) this.fy += 4; B.sfx('uiMove'); }
    if (I.pressed('right')) { if (col) { this.fx = 1; this.brush = this.tools[this.fy]; this.fy = 0; } else if (this.fy % 4 < 3) this.fy++; B.sfx('uiMove'); }
    if (I.pressed('left')) { if (!col) { if (this.fy % 4 === 0) { this.fx = 0; this.fy = Math.max(0, this.tools.indexOf(this.brush)); } else this.fy--; } B.sfx('uiMove'); }
    // the mouse: hover focuses, click places or picks, right click empties
    const p = I.pointer(), cl = I.clicked();
    if (B.mouseMode() && p && this._cells) { for (const c of this._cells) if (p[0] >= c.x && p[0] <= c.x + c.w && p[1] >= c.y && p[1] <= c.y + c.h) { const nx = c.kind === 'shelf' ? 0 : 1; if (this.fx !== nx || this.fy !== c.i) { this.fx = nx; this.fy = c.i; } } }
    if (I.pressed('confirm') || cl) { if (this.fx === 0) { this.brush = this.tools[this.fy]; this.fx = 1; this.fy = this.slots.findIndex(s => !s); if (this.fy < 0) this.fy = 0; B.sfx('uiConfirm'); } else { this.slots[this.fy] = this.brush; B.sfx('stamp', { vol: .3 }); } }
    if ((I.pressed('cancel') && this.fx === 1) || (B.mouseMode() && I.pressed('block') && this.fx === 1)) { this.slots[this.fy] = null; B.sfx('uiBack'); }
    else if (I.pressed('cancel')) { G.go(this.d.mode === 'trial' ? 'title' : this.d.mode === 'missions' ? 'missionSelect' : 'title'); return; }
    if (I.pressed('interact')) { this.slots = this.hint.slice(); B.sfx('fusuma'); }
    if (I.pressed('start') || I.pressed('useTool')) this.start();
  },
  draw(r) {
    r.sky(['#0e0808', '#1a1010', '#140c0c']); const cells = this._cells = this.cells(r);
    r.overlay(g => {
      E.font.title(g, 'PACK THE BENTO', r.W / 2, 6, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      const ms = get('mission', this.d.missionId); E.font.text(g, ms.num + ': ' + ms.title, r.W / 2, 24, '#b8a890', { align: 'center', outline: false });
      // the box: black lacquer with a red inner rim, two tiers of four
      const sl = cells.filter(c => c.kind === 'slot'), x0 = sl[0].x - 6, y0 = sl[0].y - 6, x1 = sl[7].x + sl[7].w + 6, y1 = sl[7].y + sl[7].h + 6;
      px.rect(g, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, '#0a0606'); px.rect(g, x0, y0, x1 - x0, y1 - y0, '#1a1214'); px.rect(g, x0, y0 + (sl[4].y - sl[0].y) - 10, x1 - x0, 3, '#e8b04a');
      E.font.text(g, 'UPPER TIER', x0 + 4, y0 + 1, '#8a7a60', { outline: false, font: 'tiny' }); E.font.text(g, 'LOWER TIER', x0 + 4, sl[4].y - 9, '#8a7a60', { outline: false, font: 'tiny' });
      for (const c of cells) {
        const foc = (c.kind === 'shelf' && this.fx === 0 && this.fy === c.i) || (c.kind === 'slot' && this.fx === 1 && this.fy === c.i);
        if (c.kind === 'shelf') {
          const T = get('tool', c.t); px.rect(g, c.x, c.y, c.w, c.h, foc ? '#3a2418' : c.t === this.brush ? '#2a1a12' : '#1a1210'); if (foc) px.rect(g, c.x, c.y, 2, c.h, '#e8b04a');
          px.sprite(g, B.ICON[c.t], c.x + 4, c.y + Math.max(0, (c.h - 12) / 2)); E.font.text(g, T.name, c.x + 22, c.y + Math.max(1, (c.h - 7) / 2), foc ? '#f4ead5' : '#c8b8a0', { outline: false });
        } else {
          const s = this.slots[c.i]; px.rect(g, c.x, c.y, c.w, c.h, '#8a1c1c'); px.rect(g, c.x + 2, c.y + 2, c.w - 4, c.h - 4, '#240e0e'); if (foc) { px.rect(g, c.x - 1, c.y - 1, c.w + 2, 1, '#e8b04a'); px.rect(g, c.x - 1, c.y + c.h, c.w + 2, 1, '#e8b04a'); px.rect(g, c.x - 1, c.y, 1, c.h, '#e8b04a'); px.rect(g, c.x + c.w, c.y, 1, c.h, '#e8b04a'); }
          if (s) { px.sprite(g, B.ICON[s], c.x + c.w / 2 - 14, c.y + c.h / 2 - 12, { scale: 2 }); E.font.text(g, 'x' + get('tool', s).stack, c.x + c.w - 3, c.y + c.h - 9, '#f4ead5', { align: 'right', outline: false, shadow: '#000' }); }
        }
      }
      const fT = this.fx === 0 ? this.tools[this.fy] : this.slots[this.fy] || this.brush, T = get('tool', fT);
      if (T) { const ty = y1 + 8; E.font.text(g, T.name + '  (stack ' + T.stack + ')', x0, ty, '#e8b04a', { outline: false }); E.font.wrap(T.desc, x1 - x0).forEach((l, k) => E.font.text(g, l, x0, ty + 10 + k * 9, '#f4ead5', { outline: false })); }
      const locked = B.TOOL_ORDER.filter(t => !B.toolUnlocked(t)).length; if (locked) E.font.text(g, locked + ' tools still locked: earn high ranks', 16, r.H - 28, '#8a7a60', { outline: false });
      B.rich(g, '{a:confirm} pack   {a:cancel} empty   {a:interact} suggested   {a:start} begin', r.W / 2, r.H - 14, '#b8a890', { align: 'center' });
    });
  }
});

/* ---- results: the scroll, one stat at a time, the score, the hanko ---- */
B.scenes.results = Object.assign({}, MENU_SCENE, {
  enter(d) {
    this.d = d; this.t = 0; this.stamped = false; const M = d.M; this.sc = d.sc; B.music.play('results');
    const s = M.stats; this.lines = [['Time', B.fmtTime(M.t)], ['Silent Cuts', s.silentCuts], ['Kills', s.kills], ['Times detected', s.detections], ['Civilians harmed', s.civiliansHarmed], ['Optional tasks', s.optionalDone], ['Tools used', s.tools], ['Retries', s.retries]];
    this.items = d.mode === 'story' ? ['Continue', 'Retry'] : d.mode === 'workshop' ? ['Back to the Workshop', 'Retry'] : ['Missions', 'Retry', 'Title'];
    this.menu = new E.Menu(B.game, this.items, { y: 0, onPick: i => this.pick(this.items[i]) }); this.bow = B.RIGS[M.charId === 'kaede' ? 'kaede' : 'sojiro'](); B.game.follow(null);
  },
  pick(it) {
    const G = B.game, d = this.d; B.sfx('uiConfirm');
    if (it === 'Continue') B.Flow.afterResults(d); else if (it === 'Retry') G.go('mission', d.data); else if (it === 'Missions') G.go('missionSelect'); else if (it === 'Back to the Workshop') G.go('workshop', { keep: true }); else G.go('title');
  },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt * (I.down('confirm') && !this.stamped ? 4 : 1);
    const ready = this.t > this.lines.length * .45 + 2.2;
    if (this.t > this.lines.length * .45 + 1.6 && !this.stamped) { this.stamped = true; B.sfx('stamp'); G.shake(4); if (this.d.out.newTools.length) G.audio.sting(B.STINGS.newTool); }
    if (ready) this.menu.update(dt);
    this.bow.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: this.stamped ? 'kneel' : null });
  },
  draw(r) {
    r.sky(['#1a120c', '#241810', '#1a120c']);
    r.overlay(g => {
      const w = Math.min(300, r.W - 40), x0 = Math.round(r.W / 2 - w / 2), unroll = clamp(this.t / .6, 0, 1), hh = Math.round((r.H - 30) * unroll);
      px.rect(g, x0, 12, w, hh, '#f4ead5'); px.rect(g, x0 - 4, 8, w + 8, 6, '#6a3a1a'); px.rect(g, x0 - 4, 12 + hh, w + 8, 6, '#6a3a1a');
      if (unroll < 1) return;
      const M = this.d.M; E.font.text(g, (get('mission', M.missionId) || { title: M.level.name }).title || M.level.name, r.W / 2, 20, '#1a1418', { align: 'center', outline: false, scale: 1 });
      this.lines.forEach(([k, v], i) => { if (this.t < .8 + i * .45) return; const y = 36 + i * 12; E.font.text(g, k, x0 + 16, y, '#3a2a20', { outline: false }); E.font.text(g, String(v), x0 + w - 90, y, '#1a1418', { align: 'right', outline: false }); px.rect(g, x0 + 16, y + 8, Math.min(w - 110, (this.t - .8 - i * .45) * 300), 1, '#8a1c1c'); });
      const sy = 36 + this.lines.length * 12 + 4, shown = Math.round(this.sc.total * clamp((this.t - this.lines.length * .45 - .8) / .8, 0, 1));
      if (this.t > this.lines.length * .45 + .8) E.font.text(g, 'SCORE ' + shown, x0 + 16, sy, '#1a1418', { outline: false, scale: 2 });
      if (this.stamped) {
        const k = clamp((this.t - this.lines.length * .45 - 1.6) / .15, 0, 1), sx = x0 + w - 56, sy2 = 46, S = Math.round(lerp(60, 44, k));
        px.rect(g, sx - S / 2, sy2 - S / 2 + 20, S, S, '#c8302a'); px.rect(g, sx - S / 2 + 3, sy2 - S / 2 + 23, S - 6, S - 6, '#f4ead5'); px.rect(g, sx - S / 2 + 5, sy2 - S / 2 + 25, S - 10, S - 10, '#c8302a');
        const rk = this.sc.rank.split(' '); rk.forEach((wd, j) => E.font.text(g, wd.toUpperCase(), sx, sy2 + 14 + j * 9 - (rk.length - 1) * 4, '#f4ead5', { align: 'center', outline: false }));
        E.font.text(g, '"' + B.STORY.rankComment[this.sc.rank] + '"  - Granny', r.W / 2, sy + 22, '#3a2a20', { align: 'center', outline: false });
        if (this.d.out.newTools.length) { const nt = this.d.out.newTools.map(t => get('tool', t).name).join(', '); px.rect(g, x0 + 12, sy + 34, w - 24, 22, '#1a1214'); E.font.text(g, 'NEW TOOL: ' + nt, r.W / 2, sy + 37, '#e8b04a', { align: 'center', outline: false }); E.font.text(g, 'Pack it on the bento screen', r.W / 2, sy + 46, '#c8b8a0', { align: 'center', outline: false }); }
      }
    });
    if (this.t > this.lines.length * .45 + 2.2) { this.menu.y = r.H - 18 - this.items.length * 12; this.menu.draw(r); }
  }
});

/* ---- About / Credits: paged HTML screens, large type ---- */
B.showAbout = i => {
  const pages = B.ABOUT_PAGES(), p = pages[i];
  B.ui.show('about', { kicker: 'About ' + (i + 1) + ' / ' + pages.length, title: p[0], text: p[1],
    actions: [i > 0 && ['◀ Previous page', () => B.showAbout(i - 1)], i < pages.length - 1 && { label: 'Next page ▶', primary: true, fn: () => B.showAbout(i + 1) }, ['Back to the title', () => B.ui.hide()]],
    back: () => B.ui.hide() });
};

/* ---- the story's flow ---- */
B.Flow = {
  newStory(ch) {
    const keep = B.save.data && B.save.data.tools ? B.save.data : null; B.save.data = B.freshSave(); B.save.data.character = ch; if (keep) { B.save.data.tools = keep.tools.slice(); B.save.data.best = keep.best; }
    B.game.go('crawl', { then: () => B.Flow.startMission('training', 'story', ch) });
  },
  continueStory() { const S = B.save.data; if (S.nextMission === 'end') B.game.go('ending'); else B.Flow.startMission(S.nextMission, 'story', S.character); },
  startMission(id, mode, ch) {
    const S = B.save.data; S.character = ch || S.character; B.autosave();
    const br = B.STORY.briefings[id], ms = get('mission', id);
    const go = () => B.game.go('bento', { missionId: id, levelId: ms.level, mode, character: S.character });
    if (br) B.game.go('story', { place: br.place, lines: br.lines, title: ms.num + ': ' + ms.title, music: 'shop', then: go }); else go();
  },
  afterResults(d) {
    const S = B.save.data, ms = get('mission', d.M.missionId);
    if (ms && ms.next === 'end') B.game.go('ending'); else if (ms && ms.next) B.Flow.startMission(ms.next, 'story', S.character); else B.game.go('title');
  }
};
B.missionWon = M => {
  const sc = M.score(), G = B.game;
  if (M.mode === 'workshop') { G.go('results', { M, sc, mode: 'workshop', out: { newTools: [] }, data: M.scene.d }); return; }
  const out = B.applyResults(M, sc); B.autosave();
  G.go('results', { M, sc, mode: M.mode === 'story' ? 'story' : 'missions', out, data: M.scene.d });
};

/* ---- 73-mission-scene ---- */
/* 73-mission-scene: the gameplay scene used by story, Missions, the Shadow Trial, the hub round and Workshop test plays
 * (attract mode draws missions with the same B.drawMission). The camera (follow, 45-degree turns, zoom, mouse lean,
 * Focus scouting, peeks), drawing with Shadow Sight, the game-over overlay, the pause menu's items and the objectives. */
const AMB = { dusk: .5, night: null, rain: .32, festival: .44 };
B.setupMissionView = M => {
  const G = B.game, W = M.world, L = G.lights;
  L.enabled = true; L.ambient = AMB[M.level.time] === null || AMB[M.level.time] === undefined ? B.T('ambientNight') : AMB[M.level.time]; L.dark = M.level.time === 'dusk' ? [30, 16, 40] : [8, 10, 30]; L.tint = .4; L.refresh && L.refresh();
  G.cam.bounds = v => W.map.bounds(v); G.cam.smooth = .12; G.follow(null);
  const wk = M.level.weather; G.weather = wk ? { kind: wk, amount: wk === 'rain' ? .8 : .5, wind: .3, lightning: 0 } : null;
  if (G.settings.camAngle === 'high') G.setView('threequarter'); else G.setView('iso');
  G.cam.snap = true; M.lean = { x: 0, y: 0 };
};
B.cameraUpdate = (M, dt, I) => {
  const G = B.game, h = M.hero; if (!h) return;
  const inv = G.settings.invertCam ? -1 : 1, rs = I.right || [0, 0];
  M._turnCool = Math.max(0, (M._turnCool || 0) - dt);
  let turn = 0; if (G.input.pressed('camLeft')) turn = -1; if (G.input.pressed('camRight')) turn = 1;
  if (!h.focus) { if (Math.abs(rs[0]) > .7 && !M._flick) { turn = Math.sign(rs[0]); M._flick = true; } if (Math.abs(rs[0]) < .3) M._flick = false; if (Math.abs(rs[1]) > .5) G.zoomBy(1 - rs[1] * dt * 1.2); }
  if (turn && M._turnCool <= 0) { G.rotateView(45 * turn * inv); M._turnCool = .25; B.sfx('whoosh', { vol: .3 }); }
  if (G.input.pressed('camReset')) { G.resetCamera(); if (G.yaw) G.rotateView(-G.yaw); }
  // lean: the mouse leans the view toward the cursor; Focus + the right stick (or the mouse) scouts further; peeks
  let lx = 0, ly = 0;
  if (I.aimPoint) { const dx = I.aimPoint.x - h.x, dy = I.aimPoint.y - h.y, d = Math.hypot(dx, dy) || 1, m = Math.min(d * .35, h.focus ? 140 : 40); lx = dx / d * m; ly = dy / d * m; }
  else if (h.focus && Math.hypot(rs[0], rs[1]) > .25) { const g2 = G.view.screenDirToGround(rs[0], rs[1]); lx = g2[0] * 140 * Math.min(1, Math.hypot(rs[0], rs[1])); ly = g2[1] * 140 * Math.min(1, Math.hypot(rs[0], rs[1])); }
  if (h.peek) { lx = (h.peek.x - h.x) * 4.8; ly = (h.peek.y - h.y) * 4.8; }
  M.lean.x = approach(M.lean.x, lx, dt * 220); M.lean.y = approach(M.lean.y, ly, dt * 220);
  const fz = h.focus ? .9 : 1; M._fz = approach(M._fz || 1, fz, dt * .8);
  G.focus(h.x + M.lean.x, h.y + M.lean.y, h.z + 18);
};
/* drawing a mission: the world, every body (with Shadow Sight), tools in flight, effects, the HUD */
B.drawMission = (r, M, o = {}) => {
  const G = B.game, h = M.hero, W = M.world; B.lastR = r;
  B.drawWorld(r, W, { hero: h });
  const dark = '#0c0a18';
  // ink decals, traps, baits, clouds' shadow, flames
  for (const d of M.inkDecals || []) r.decal(g => { const q = r.w(d.x, d.y, d.z); px.ell(g, q[0], q[1], d.r, d.r * .5, '#5a0a0a'); px.ell(g, q[0] + 2, q[1] - 1, d.r * .5, d.r * .3, '#3a0606'); });
  for (const t of M.traps) if (t.kind === 'caltrops') r.decal(g => { for (let k = 0; k < 9; k++) { const q = r.w(t.x + Math.cos(k * 2.3) * (4 + k * 2), t.y + Math.sin(k * 2.3) * (4 + k * 2), t.z); px.dot(g, q[0], q[1], '#c8ccd4'); px.dot(g, q[0] + 1, q[1], '#5a5a62'); } });
  for (const b of M.baits) r.sprite(b.x, b.y, b.z + 2, B.ICON[b.kind === 'dango' ? 'dango' : 'riceball'], { anchor: 'bottom' });
  for (const l of M.lobs) { r.shadow(l.x, l.y, 2, .3); r.sprite(l.x, l.y, l.z, B.ICON[l.tool] || B.ICON.coin, { anchor: 'center' }); }
  for (const p of M.pickups) if (!p.taken) { const bob = Math.sin(G.time * 3 + p.x) * 1.5; r.shadow(p.x, p.y, 4, .3, undefined, p.z); r.sprite(p.x, p.y, p.z + 6 + bob, p.kind === 'story' ? B.ICON.scroll : B.ICON[p.tool] || B.ICON.coin, { anchor: 'bottom', glow: .6 }); G.lights.add(p.x, p.y, p.z + 8, 24, .5, { color: '#ffe080' }); }
  for (const it of M.interacts) if (it.active && !it.done) { const q = Math.sin(G.time * 4) > 0; r.queue(it.x, it.y, it.z + 18, g => { const s = r.w(it.x, it.y, it.z + 18); if (q) px.dot(g, s[0], s[1], '#ffe080'); px.dot(g, s[0] - 1, s[1] - 1, '#e8b04a'); }, { emissive: true }); }
  for (const f of M.flames) G.lights.add(f.x, f.y, f.z + 6, 30, .6, { color: '#ff7a2a' });
  for (const b of M.fireballs) { r.queue(b.x, b.y, b.z, g => { const s = r.w(b.x, b.y, b.z); px.disc(g, s[0], s[1], 3, '#ff8a2a'); px.disc(g, s[0], s[1], 1.5, '#ffe0a0'); }, { emissive: true }); G.lights.add(b.x, b.y, b.z, 40, .8, { color: '#ff7a2a' }); r.shadow(b.x, b.y, 3, .3); }
  // guards, bodies, civilians
  const focus = h && h.focus;
  for (const g of M.guards) {
    if (g.sunk || (!g.alive && !g.dying && g.vis === 'hidden')) continue;
    const vis = g.alive || g.dying ? g.vis : 'visible'; if (vis === 'hidden' && !o.reveal) continue;
    const sensed = vis === 'sensed' && !o.reveal;
    if (!sensed) r.shadow(g.x, g.y, g.type === 'hound' ? 7 : 6, .35, undefined, W.map.groundAt(g.x, g.y, g.r, g.z));
    const aura = focus && g.disguised;
    const op = sensed ? { alpha: .4, flash: '#5a5aff', flashMix: 1 } : { xray: { color: MOOD[g.mind ? g.mind.state : 'calm'] }, flash: g.hurtT > 0 ? '#ffffff' : aura ? '#ff3a2a' : g.staggerT > 0 && Math.floor(G.time * 10) % 2 ? '#ffe080' : undefined, flashMix: aura ? .45 : .7 };
    r.actor(g.x, g.y, g.z, (gg, ox, oy) => g.rig.draw(gg, ox, oy, r.view), op);
    if (g.lantern && g.alive && !g.asleep) { const hd = g.type === 'hound' ? null : g.rig.hand ? g.rig.hand() : null; const lx = hd ? hd[0] : g.x, ly = hd ? hd[1] : g.y, lz = hd ? hd[2] - 4 : g.z + 14; if (!sensed) r.queue(lx, ly, lz, gg => { const s = r.w(lx, ly, lz); px.line(gg, s[0], s[1] - 4, s[0], s[1] - 1, '#2a1a10'); px.ell(gg, s[0], s[1] + 2, 2, 3, '#ffb060'); }, { emissive: true }); G.lights.add(lx, ly, lz, 48 * B.T('lanternRadius'), .8, { color: '#ffb060' }); }
    if (aura && g.alive) r.queue(g.x, g.y, g.z + 1, gg => { const s = r.w(g.x, g.y, g.z + 20); px.blend(gg, .3, 'add', () => px.disc(gg, s[0], s[1], 16, '#c81a1a')); }, { emissive: true });
  }
  for (const n of M.talkers) { r.shadow(n.x, n.y, 6, .35); r.actor(n.x, n.y, n.z, (gg, ox, oy) => n.rig.draw(gg, ox, oy, r.view), { xray: true }); }
  for (const b of M.bosses) { if (b.hidden) continue; r.shadow(b.x, b.y, 10, .4, undefined, b.z); r.actor(b.x, b.y, b.z, (gg, ox, oy) => b.rig.draw(gg, ox, oy, r.view), { xray: { color: '#ff4a3a' }, flash: b.hurtT > 0 ? '#ffffff' : b.guardT > 0 ? '#a0c8ff' : b.staggerT > 0 ? '#ffe080' : undefined, flashMix: .6 }); B.drawTelegraph(r, b); if (b.phase === 2 && b.bossId === 'kurogane') G.lights.add(b.x, b.y, b.z + 20, 70, .8, { color: '#ff5a2a' }); if (b.bossId === 'hotaru') G.lights.add(b.x, b.y, b.z + 24, 30, .5, { color: '#ff3a2a' }); }
  for (const c of M.clones) if (c.alive) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, c.z, (gg, ox, oy) => c.rig.draw(gg, ox, oy, r.view), { alpha: .8 }); }
  for (const s of M.spirits) if (s.alive) { r.actor(s.x, s.y, s.z + 6 + Math.sin(s.t * 5) * 2, (gg, ox, oy) => s.blob.draw(gg, ox, oy, r.view), { emissive: true }); G.lights.add(s.x, s.y, s.z + 8, 36, .7, { color: '#ff7a2a' }); }
  if (M.escort) { const e = M.escort; if (e.alive) { r.shadow(e.x, e.y, 6, .35); r.actor(e.x, e.y, e.z - (e.z < 2 && W.isDeep(e.x, e.y) ? 8 : 0), (gg, ox, oy) => e.rig.draw(gg, ox, oy, r.view), { xray: { color: '#5ae0a0' }, flash: e.hurtT > 0 ? '#ffffff' : undefined }); } }
  for (const gh of M.ghosts || []) { if (!gh.vis) continue; r.actor(gh.x, gh.y, gh.z, (gg, ox, oy) => gh.rig.draw(gg, ox, oy, r.view), { alpha: .45, ghost: { color: gh.color, life: .25, alpha: .3, owner: gh }, flash: gh.color, flashMix: .35 }); }
  // the hero: x-ray through everything; low in the water while swimming; a shadow under the surface while diving
  if (h) {
    if (h.rope) { const a = h.rope, hand = h.rig.hand ? h.rig.hand() : [h.x, h.y, h.z + 24], act = h.action, u = act && act.beat === 'throw' ? act.u : 1; const ex = lerp(hand[0], a.x, u), ey = lerp(hand[1], a.y, u), ez = lerp(hand[2], a.z, u);
      r.queue((hand[0] + ex) / 2, (hand[1] + ey) / 2, Math.max(hand[2], ez), g => { let p0 = r.w(hand[0], hand[1], hand[2]); for (let k = 1; k <= 8; k++) { const t = k / 8, sag = Math.sin(t * Math.PI) * (act && act.beat === 'pull' ? 2 : 6); const p1 = r.w(lerp(hand[0], ex, t), lerp(hand[1], ey, t), lerp(hand[2], ez, t) - sag); px.line(g, p0[0], p0[1], p1[0], p1[1], '#c8b080'); p0 = p1; } px.dot(g, p0[0], p0[1], '#ffffff'); }); }
    if (h.dive) { r.decal(g => { const q = r.w(h.x, h.y, 0); px.ell(g, q[0], q[1], 9, 4, '#0c1a2a'); px.ell(g, q[0] + Math.cos(h.facing) * 2, q[1], 5, 2, '#14283c'); }); }
    else {
      if (!h.swim) r.shadow(h.x, h.y, 6, .4, undefined, W.map.groundAt(h.x, h.y, h.r, h.z));
      const cloak = h.cloakT > 0, sz = h.swim ? h.z - 9 : h.z;
      r.actor(h.x, h.y, sz, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view), { xray: { actors: true }, flash: h.hurtT > 0 ? '#ff6a6a' : cloak ? '#b8a060' : undefined, flashMix: cloak ? .8 : .6, alpha: h.exposure < .2 && !h.swim ? .7 : 1 });
      if (h.swim) r.queue(h.x, h.y, 1, g => { const q = r.w(h.x, h.y, 0); px.blend(g, .55, 'normal', () => px.ell(g, q[0], q[1] + 1, 9, 4, '#1e3a5a')); px.ell(g, q[0], q[1], 10, 4, '#4a7aa0'); px.ell(g, q[0], q[1], 8, 3, '#1e3a5a'); }, { bias: 2 });
    }
  }
  if (M.shots) M.shots.draw(r);
  B.drawWorldMarks(r, M);
  if (M.dev) B.devDraw(r, M);
  if (!o.noHud) B.drawHud(r, M);
  if (M.talk.open) M.talk.draw(r);
};
/* boss telegraphs: red arcs, lines and rings during a wind-up */
B.drawTelegraph = (r, b) => {
  const mv = b.move; if (!mv || mv.phase !== 'wind' || !mv.S.decal) return; const S = mv.S, u = clamp(mv.t / (S.wind * B.T('enemyWindup')), 0, 1);
  r.decal(g => {
    if (S.decal === 'arc') r.groundArc(b.x, b.y, (S.reach || 30) + (b.reachBonus || 0), b.facing, S.arc || .6, '#ff3a2a', .25 + u * .3, b.z);
    else if (S.decal === 'ring') r.groundRing(b.x, b.y, S.ring || 40, '#ff3a2a', .3 + u * .3, b.z);
    else if (S.decal === 'line') { const L = S.charge ? 160 : (S.lunge || 100) * .35 + 20; for (let k = 0; k < 10; k++) { const q = r.w(b.x + Math.cos(b.facing) * L * k / 10, b.y + Math.sin(b.facing) * L * k / 10, b.z); px.disc(g, q[0], q[1], 2, k % 2 ? '#ff3a2a' : '#8a1a1a'); } }
  });
};
/* the gameplay scene */
B.scenes.mission = {
  pausable: true, view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [.75, 2], start: 1, tall: 1.25, rotate: true, wheel: false },
  enter(d) {
    this.d = d; const G = B.game; G.timeScale = 1; G.resetCamera();
    const M = this.M = new Mission(d.levelId || (get('mission', d.missionId) || {}).level || d.missionId, Object.assign({}, d, { mode: d.mode || 'story' }));
    M.scene = this; B.setupMissionView(M); B.music.play(M.level.music || 'm1'); A.layer('tension', 0, .01); A.layer('alertDrum', 0, .01); A.layer('alertFue', 0, .01);
    this.overT = 0; this.overMenu = null; this.endT = 0; this.lightT = 4 + rand() * 6;
    if (d.mode === 'hub' || d.mode === 'trial') B.hubMissionStart(M, d);
    B.emit('missionStart', { M });
  },
  exit() { const G = B.game; G.timeScale = 1; G.weather = null; G.lights.enabled = false; if (B.mission === this.M) B.mission = null; B.ui.hud({}); },
  update(dt) {
    const M = this.M, G = B.game; if (!M) return;
    if (M.mode === 'hub' && !B.hubPlaying(M)) { B.hubWait(M, dt); return; }
    // rain: lightning flashes expose everyone for a moment
    if (M.level.weather === 'rain' && !M.over) { this.lightT -= dt; if (this.lightT <= 0) { this.lightT = 6 + rand() * 8; M.flashT = .25; G.flash('#c8d8ff', .15, .7); G.after(.6, () => B.sfx('thunder')); } }
    if (M.over) return this.overUpdate(dt);
    const I = M.auto ? B.Autopilot.intent(M, dt) : B.intentFromInput();
    if (G.input.pressed('objectives') && !B.HUB && !M.auto) { B.showObjectives(M); return; }
    B.cameraUpdate(M, dt, I);
    M.update(dt, I);
    if (M.mode === 'hub' || M.mode === 'trial') B.hubTick(M, dt);
    if (M.dev) B.devUpdate(M, dt);
  },
  overUpdate(dt) {
    const M = this.M, G = B.game; this.overT += dt / Math.max(.1, G.timeScale);
    M.update(dt, B.emptyIntent());
    if (M.result === 'win') {
      if (this.overT > 1.6 && !this.left) { this.left = true; G.timeScale = 1; B.missionWon(M); }
      return;
    }
    if (M.mode === 'hub' || M.mode === 'trial') { if (!this.left && this.overT > 1.4) { this.left = true; G.timeScale = 1; B.hubFinish(M); } return; }
    if (this.overT > 1.2 && !this.overMenu) {
      G.timeScale = 1; const items = M.mode === 'workshop' ? ['Retry from checkpoint', 'Restart', 'Back to the Workshop'] : ['Retry from checkpoint', 'Restart mission', 'Quit to title'];
      this.overMenu = new E.Menu(G, items, { y: Math.round(G.H * .55), onPick: i => {
        if (i === 0) { this.overMenu = null; this.overT = 0; M.retry(); B.music.play(M.level.music || 'm1'); }
        else if (i === 1) G.go('mission', Object.assign({}, this.d, { retries: M.stats.retries + 1 }));
        else if (M.mode === 'workshop') G.go('workshop', { keep: true }); else G.go('title');
      } });
    }
    if (this.overMenu) this.overMenu.update(dt);
  },
  draw(r) {
    const M = this.M; if (!M) return;
    if (M.mode === 'hub' && !B.hubPlaying(M) && !M.over) { B.drawMission(r, M); B.hubDrawWait(r, M); return; }
    B.drawMission(r, M);
    if (M.mode === 'hub' || M.mode === 'trial') B.hubDraw(r, M);
    if (M.over && M.result !== 'win') r.overlay(g => {
      const a = clamp(this.overT / 1.2, 0, 1); px.polyDither(g, [[0, 0], [r.W, 0], [r.W, r.H], [0, r.H]], '#140c0c', a * .7, r.ix, r.iy);
      if (a > .5) { E.font.title(g, M.result === 'fail' ? 'MISSION FAILED' : 'YOUR BOX IS EMPTY', r.W / 2, Math.round(r.H * .3), { align: 'center', scale: 3, colors: ['#f4ead5', '#d8402a', '#8a1c1c'], depth: 2 });
        if (M.failReason) E.font.text(g, M.failReason, r.W / 2, Math.round(r.H * .3) + 30, '#e8dcc0', { align: 'center', outline: false, shadow: '#000' }); }
    });
    if (this.overMenu) this.overMenu.draw(r);
  }
};
/* the pause menu's items (the Shell adds Resume, Settings, Controls, Full screen and Quit) */
B.pauseItems = () => {
  const M = B.mission, G = B.game; if (!M || B.HUB || M.mode === 'attract' || M.mode === 'hub') return [];
  const out = [['Restart from checkpoint', () => { B.ui.hide(); M.retry(); }], ['Restart mission', () => { B.ui.hide(); G.go('mission', Object.assign({}, M.scene.d, { retries: M.stats.retries + 1 })); }], ['Objectives', () => B.showObjectives(M, true)], ['Dev Mode', () => B.Dev.open(M)]];
  if (M.mode === 'workshop') out.push(['Back to the Workshop', () => { B.ui.hide(); G.go('workshop', { keep: true }); }]);
  return out;
};
B.showObjectives = (M, fromPause) => {
  const G = B.game; if (!fromPause) G.pause('menu');
  const mark = o => o.state === 'done' ? '[x] ' : o.state === 'failed' ? '[-] ' : '[ ] ';
  B.ui.show('objectives', { kicker: (get('mission', M.missionId) || {}).num || 'Mission', title: M.level.name,
    text: M.objectives.filter(o => o.state !== 'hidden').map(o => mark(o) + o.text).join('\n') + '\n\nTime ' + B.fmtTime(M.t) + '   Silent Cuts ' + M.stats.silentCuts + '   Detected ' + M.stats.detections,
    actions: [{ label: 'Back', primary: true, fn: () => { if (fromPause) B.ui.back(); else { B.ui.hide(); G.resume(); } } }], back: fromPause ? undefined : () => { B.ui.hide(); G.resume(); } });
};

/* ---- 74-dev ---- */
/* 74-dev: Dev Mode, from the pause menu (never in hub sessions or attract mode). Pages of at most 8 rows: cheats,
 * mission tools, teleports, debug views, and the balance sliders bound live to the 'Dev' settings, with resets. Page
 * keys: PageUp / PageDown, L1 / R1, or the buttons at the bottom of each page. */
const DEV_PAGES = ['Cheats', 'Mission', 'Teleport', 'Debug view', ...B.TUNE_PAGES.map(p => 'Balance: ' + p)];
const SPAWN_TYPES = ['ashigaru', 'samurai', 'archer', 'ninja', 'hound'];
B.Dev = {
  page: 0, spawnI: 0, scales: [.25, .5, 1, 2, 4], scaleI: 2,
  open(M, page) {
    if (!M || B.HUB || M.mode === 'attract' || M.mode === 'hub') return;
    M.dev = M.dev || { ai: false, light: false, nav: false, hide: false, anchors: false, ranges: false }; B.devOpened = true;
    if (page !== undefined) this.page = (page + DEV_PAGES.length) % DEV_PAGES.length;
    const G = B.game, onoff = v => v ? 'On' : 'Off', C = M.cheats, D = M.dev, again = () => this.open(M);
    const tog = (label, obj, k, after) => [label + ': ' + onoff(obj[k]), () => { obj[k] = !obj[k]; if (after) after(obj[k]); again(); }];
    const name = DEV_PAGES[this.page]; let actions = [], rows = null, text = '';
    if (name === 'Cheats') actions = [tog('God mode', C, 'god'), tog('Invisible to guards', C, 'invisible'), tog('No-clip (jump / crouch fly)', C, 'noclip'), tog('Infinite tools', C, 'infTools'), tog('One-hit kills', C, 'oneHit'), tog('Freeze AI', C, 'freeze'), tog('Reveal all enemies', C, 'reveal'),
      ['Heal', () => { M.hero.hp = M.hero.hpMax; again(); }],
      ['Give all tools', () => { const pack = ['riceball', 'poison', 'dango', 'shuriken', 'smoke', 'firecracker', 'firepot', 'cloak']; pack.forEach((t, i) => { M.bento.slots[i] = { tool: t, n: get('tool', t).stack }; }); M.toast('Dev', 'Every tool packed'); again(); }],
      ['Unlock everything', () => { const S = B.save.data || (B.save.data = B.freshSave()); S.tools = B.TOOL_ORDER.slice(); for (const id of B.STORY_ORDER) S.completed[id] = true; B.autosave(); M.toast('Dev', 'Every tool and mission unlocked'); again(); }]];
    else if (name === 'Mission') actions = [
      ['Complete current objective', () => { const ob = M.objectives.find(o => o.state === 'active' && !o.optional && (!o.after || o.after.every(x => M.objDone(x)))); if (ob) { if (ob.type === 'defeat') { const b = M.bosses.find(q => q.bossId === ob.boss); if (b) { if (!b.active) M.startBoss(b.bossId); b.takeHit(null, 9999, { pierce: true }); b.alive = false; } } else if (ob.type === 'assassinate') { const g = M.guards.find(q => q.id === ob.target); if (g && g.alive) { g.alive = false; M.kill(g, 'dev'); } } else if (ob.type === 'escort' && M.escort) { M.escort.freed = true; M.escort.x = M.hero.x = M.exit.x; M.escort.y = M.hero.y = M.exit.y; } else M.completeObj(ob); } again(); }],
      ['Kill all enemies', () => { for (const g of M.guards) if (g.alive && !g.civilian) { g.alive = false; g.dieT = 9; M.kill(g, 'dev'); } again(); }],
      ['Alert all / Calm all', () => { const any = M.guards.some(g => g.alive && g.mind.state === 'alert'); for (const g of M.guards) if (g.alive && !g.civilian) { if (any) { g.mind.reset(); g.bellRun = null; } else { g.mind.level = 1.2; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; } } again(); }],
      ['Spawn guard here: ' + SPAWN_TYPES[this.spawnI], () => { const h = M.hero, g = new Guard({ id: 'dev' + Math.floor(rand() * 1e6), type: SPAWN_TYPES[this.spawnI], at: [h.x / CELL + Math.cos(h.facing) * 2 - .5, h.y / CELL + Math.sin(h.facing) * 2 - .5], z: h.z, facing: (h.facing * 180 / Math.PI) + 180 }, M); M.guards.push(g); this.spawnI = (this.spawnI + 1) % SPAWN_TYPES.length; again(); }],
      ['Skip to boss', () => { const b = M.bosses[0]; if (b) { M.hero.x = b.x - 30; M.hero.y = b.y; M.hero.z = b.z; for (const ob of M.objectives) if (ob.state !== 'done' && ob.type !== 'defeat' && ob.type !== 'reach' && ob.type !== 'escort' && !ob.optional) M.completeObj(ob); M.startBoss(b.bossId); } B.ui.hide(); }],
      ['Win mission (choose rank)', () => B.ui.show('devRank', { title: 'Win with which rank?', actions: B.RANKS.map(rk => [rk[0], () => { M.forceRank = rk[0]; B.ui.hide(); M.complete(); }]).concat([['Back', () => B.ui.back()]]) })],
      ['Fail mission', () => { B.ui.hide(); M.fail('Failed from Dev Mode.'); }], ['Restart mission', () => { B.ui.hide(); G.go('mission', M.scene.d); }],
      ['Jump to mission...', () => B.ui.show('devJump', { title: 'Jump to mission', actions: B.STORY_ORDER.concat(['delivery']).map(id => [get('mission', id).title, () => { B.ui.hide(); G.go('mission', { missionId: id, levelId: get('mission', id).level, mode: id === 'delivery' ? 'trial' : 'missions', character: M.charId === 'trial' ? 'sojiro' : M.charId }); }]).concat([['Back', () => B.ui.back()]]) })],
      ['Edit this level (Workshop)', () => { B.ui.hide(); G.go('workshop', { spec: JSON.parse(JSON.stringify(M.level)) }); }]];
    else if (name === 'Teleport') {
      const tp = (x, y, z) => { const h = M.hero; Object.assign(h, { x, y, z: z === undefined ? M.world.map.groundAt(x, y, 4, 400) || 0 : z, vx: 0, vy: 0, vz: 0, action: null }); G.cam.snap = true; B.ui.hide(); };
      const hs = M.level.hero.at, tgt = B.objectiveTarget(M); actions = [['To the start', () => tp(cc(hs[0]), cc(hs[1]), M.level.hero.z || 0)], tgt && ['To the next objective', () => tp(tgt.x + 12, tgt.y + 12)], M.bosses[0] && ['To the boss arena', () => tp(M.bosses[0].x - 30, M.bosses[0].y, M.bosses[0].z)], M.exit && ['To the exit', () => tp(M.exit.x, M.exit.y)],
        ...M.world.zones.slice(0, 4).map(z => ['To ' + z.name, () => tp(cc((z.rect[0] + z.rect[2]) / 2), cc((z.rect[1] + z.rect[3]) / 2))]), ['To the cursor (then click or press ' + B.label('jump', 'gamepad') + ')', () => { M.dev.tpCursor = true; B.ui.hide(); M.toast('Teleport', 'Click the ground, or press jump on a pad to land at the camera\'s centre'); }]].filter(Boolean).slice(0, 8);
    }
    else if (name === 'Debug view') actions = [tog('AI overlay (or ` key)', D, 'ai'), tog('Light map', D, 'light'), tog('Nav map', D, 'nav'), tog('Hide spots', D, 'hide'), tog('Grapple anchors', D, 'anchors'), tog('Ranges', D, 'ranges'),
      ['Time scale: ' + this.scales[this.scaleI] + 'x', () => { this.scaleI = (this.scaleI + 1) % this.scales.length; M.devScale = this.scales[this.scaleI]; again(); }],
      ['Show frame rate: ' + onoff(G.settings.showFps), () => { G.settings.set('showFps', !G.settings.showFps); again(); }],
      ['Free camera: ' + onoff(D.free), () => { D.free = !D.free; G.cam.free = D.free ? { speed: 300, keys: true } : null; again(); }]];
    else {
      const pg = name.slice(9); rows = B.TUNE.filter(t => t[0] === pg).map(t => t[1]); text = 'Changes apply at once. Defaults in brackets on reset.';
      actions = [['Reset this page', () => { for (const k of rows) G.settings.set(k, B.TUNE_DEF[k]); again(); }], ['Reset all to defaults', () => { G.settings.reset('Dev'); again(); }]];
    }
    actions.push(['◀ Prev page', () => this.open(M, this.page - 1)], ['Next page ▶', () => this.open(M, this.page + 1)], ['Close Dev Mode', () => B.ui.back()]);
    B.ui.show('dev', { kicker: 'Dev Mode  ' + (this.page + 1) + ' / ' + DEV_PAGES.length, title: name, text, rows, actions });
    this.poll(M);
  },
  /* L1 / R1 and PageUp / PageDown switch pages while the screen is open */
  poll(M) {
    if (HEADLESS || this._polling) return; this._polling = true; let last = {};
    const step = () => {
      if (B.ui.screen !== 'dev') { this._polling = false; return; }
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      for (const p of pads) for (const [b, d] of [[4, -1], [5, 1]]) { const on = p.buttons[b] && p.buttons[b].pressed; if (on && !last[b]) this.open(M, this.page + d); last[b] = on; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};
if (!HEADLESS) addEventListener('keydown', e => {
  if (B.ui.screen === 'dev' && (e.code === 'PageUp' || e.code === 'PageDown')) { e.preventDefault(); B.Dev.open(B.mission, B.Dev.page + (e.code === 'PageUp' ? -1 : 1)); }
  if (e.code === 'Backquote' && B.devOpened && B.mission && B.mission.dev) B.mission.dev.ai = !B.mission.dev.ai;
});
B.devUpdate = (M, dt) => {
  const G = B.game; if (M.devScale && !M.slowmoT) G.timeScale = M.devScale;
  if (M.dev.tpCursor) {
    const c = G.input.clicked(); let to = null;
    if (c) { const p = M.world.map.pick(c[0], c[1]); if (p) to = { x: p.x, y: p.y, z: p.z }; }
    else if (G.input.lastDevice === 'gamepad' && G.input.pressed('jump')) to = { x: G.cam.x !== undefined ? M.hero.x + M.lean.x : M.hero.x, y: M.hero.y + M.lean.y, z: null };
    if (to) { const h = M.hero; Object.assign(h, { x: to.x, y: to.y, z: to.z === null ? M.world.map.groundAt(to.x, to.y, 4, 400) || 0 : to.z, vx: 0, vy: 0, vz: 0 }); M.dev.tpCursor = false; G.cam.snap = true; }
  }
};
B.devDraw = (r, M) => {
  const D = M.dev, W = M.world, h = M.hero;
  if (D.light) r.decal(g => { for (let gy = 0; gy < W.lmH; gy += 1) for (let gx = 0; gx < W.lmW; gx += 1) { const v = W.lm[gy * W.lmW + gx]; if ((gx + gy) % 2) continue; const q = r.w(gx * 8 + 4, gy * 8 + 4, 0); if (q[0] < 0 || q[1] < 0 || q[0] > r.W || q[1] > r.H) continue; px.dot(g, q[0], q[1], v > .7 ? '#ffe080' : v > .45 ? '#e08030' : v > .3 ? '#a03020' : '#301040'); } });
  if (D.nav || D.hide) r.decal(g => { for (let cy = 0; cy < W.h; cy++) for (let cx = 0; cx < W.w; cx++) { const blocked = !W.nav.walkable(cx, cy), hide = W.isHide(cc(cx), cc(cy)); if (!(D.nav && blocked) && !(D.hide && hide)) continue; const q = r.w(cc(cx), cc(cy), W.map.height(cx, cy)); if (q[0] < -8 || q[1] < -8 || q[0] > r.W + 8 || q[1] > r.H + 8) continue; px.rect(g, q[0] - 1, q[1] - 1, 3, 3, D.nav && blocked ? '#ff3a3a' : '#5aff7a'); } });
  if (D.anchors) for (const a of W.anchorsNear(h, 220, 200)) r.queue(a.x, a.y, a.z, g => { const q = r.w(a.x, a.y, a.z); px.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#5ad8ff'); }, { emissive: true });
  if (D.ranges) r.decal(() => { r.groundRing(h.x, h.y, B.T('killRange'), '#ff3a3a', .5, h.z); r.groundArc(h.x, h.y, 22, h.facing, Math.PI / 3, '#5aa0ff', .3, h.z); r.groundRing(h.x, h.y, B.T('baitRange'), '#e8b04a', .3, h.z); });
  if (D.ai) {
    for (const g of M.guards) if (g.alive) { if (g.route.length) r.decal(gg => { for (let i = 0; i < g.route.length; i++) { const a = g.route[i], b = g.route[(i + 1) % g.route.length], p = r.w(a.x, a.y, 0), q = r.w(b.x, b.y, 0); px.line(gg, p[0], p[1], q[0], q[1], '#5a8aff'); } }); if (g.mind.last) r.decal(() => r.groundRing(g.mind.last.x, g.mind.last.y, 5, '#ff9a40', .6)); }
    for (const n of M.noises) r.decal(() => r.groundRing(n.x, n.y, n.loud * Math.min(1, n.t * 3), '#f4ead5', .35 * (1 - n.t / .8), n.z));
  }
};

/* ---- 75-workshop ---- */
/* 75-workshop: the Mission Editor. It edits the exact level JSON the campaign uses: terrain, buildings, props, lights,
 * actors with patrol routes, items and settings; validates (start, exit, a target or a boss, all reachable); test-plays;
 * saves to three slots; exports and imports JSON. Pad: stick cursor, L1/R1 category, L2/R2 brush, ✕ paint, ○ erase,
 * □ pick / select, △ rotate, Create test, Options menu. Mouse and keys: hover, click paints, right click erases,
 * middle drag pans, wheel brush, Tab category, 1-9 brush, Q/E rotate, F5 test, Esc menu. */
const WS_CATS = {
  Ground: Object.keys(B.FLOORS).map(ch => ({ id: ch, name: B.FLOORS[ch][1], kind: 'cell' })),
  Walls: ['#', 'W', 'F', 'H'].map(ch => ({ id: ch, name: B.WALLS[ch].name, kind: 'cell' })),
  Buildings: ['A', 'B', 'C', 'D', 'S', 'T', 'G', 'K', 'M', 'P', 'R'].map(ch => ({ id: ch, name: B.WALLS[ch].name, kind: 'cell' })),
  Props: ['stoneLantern', 'chochin', 'torii', 'bambooClump', 'sakeBarrel', 'riceBale', 'jubako', 'yatai', 'weaponRack', 'mato', 'taiko', 'well', 'waterBarrel', 'boat', 'bargeRice', 'moorPost', 'cage', 'nobori', 'dummy', 'persimmon', 'strawMat', 'steppingStone'].map(id => ({ id, name: E.SHAPES[id] ? E.SHAPES[id].about : id, kind: 'prop' })),
  Lights: [{ id: 'stoneLantern', name: 'Stone lantern', kind: 'light' }, { id: 'chochin', name: 'Paper lantern', kind: 'light' }, { id: 'torch', name: 'Torch', kind: 'light' }, { id: 'brazier', name: 'Brazier', kind: 'light' }],
  Actors: [{ id: 'hero', name: 'Hero start', kind: 'actor' }, { id: 'exit', name: 'Exit', kind: 'actor' }, { id: 'target', name: 'Target (merchant)', kind: 'actor' }, ...SPAWN_TYPES.map(t => ({ id: t, name: get('enemy', t).label, kind: 'actor' })),
    { id: 'merchant', name: 'Civilian merchant', kind: 'actor' }, { id: 'maid', name: 'Civilian maid', kind: 'actor' }, { id: 'monk', name: 'Civilian monk', kind: 'actor' }, { id: 'disguised', name: 'Disguised Red Lantern', kind: 'actor' },
    { id: 'gonroku', name: 'Boss: Gonroku', kind: 'actor' }, { id: 'hotaru', name: 'Boss: Hotaru', kind: 'actor' }, { id: 'kurogane', name: 'Boss: Kurogane', kind: 'actor' }, { id: 'bell', name: 'Alarm bell', kind: 'actor' }, { id: 'barracks', name: 'Barracks door', kind: 'actor' }],
  Routes: [{ id: 'route', name: 'Waypoint (select a guard with pick first)', kind: 'route' }],
  Items: [...B.TOOL_ORDER.map(t => ({ id: t, name: get('tool', t).name, kind: 'item' })), { id: 'scroll', name: 'The scroll (optional objective)', kind: 'item' }],
  Settings: [{ id: 'settings', name: 'Name, size, time, par, music', kind: 'settings' }]
};
const WS_CAT_NAMES = Object.keys(WS_CATS);
B.WS = { blank(n = 40) { return { id: 'workshop', name: 'My Mission', size: [n, n], time: 'night', faction: 'kanemori', music: 'm1', weather: null, par: 400, rows: R(n, n, '.', [['box', 0, 0, n - 1, n - 1, '#']]), lights: [], props: [], anchors: [], hero: { at: [3, n - 3], facing: 270 }, exit: null, guards: [], civilians: [], pickups: [], bells: [], barracks: [], objectives: [], triggers: [], zones: [] }; } };
B.WS.generate = spec => {
  const s = JSON.parse(JSON.stringify(spec)), ob = []; s.id = 'workshop';
  const tgt = (s.civilians || []).find(c => c.type === 'target');
  if (tgt) ob.push({ id: 'kill', type: 'assassinate', target: tgt.id, text: 'Silence the target' });
  if (s.boss) ob.push({ id: 'boss', type: 'defeat', boss: s.boss.id, text: 'Defeat ' + get('boss', s.boss.id).name });
  if ((s.pickups || []).some(p => p.kind === 'story')) ob.push({ id: 'scroll', type: 'retrieve', pickup: 'scroll', optional: true, text: 'Optional: steal the scroll' });
  if (s.exit) ob.push({ id: 'escape', type: 'reach', exit: true, text: 'Escape', hidden: true, after: ob.filter(o => !o.optional).map(o => o.id) });
  s.objectives = ob; s.triggers = s.boss ? [{ id: 'bossT', at: s.boss.at, r: 4, do: [['boss', s.boss.id]] }] : [];
  return s;
};
B.WS.validate = spec => {
  const out = [];
  if (!spec.hero) out.push({ msg: 'There is no hero start.', at: null }); if (!spec.exit) out.push({ msg: 'There is no exit.', at: null });
  const tgt = (spec.civilians || []).find(c => c.type === 'target'); if (!tgt && !spec.boss) out.push({ msg: 'Place a target or a boss.', at: null });
  if (spec.hero) {
    const W = new World(spec), f = new E.FlowField(W.map, { climb: 30, drop: 56, jump: 60 }), hs = spec.hero.at; f.update(cc(hs[0]), cc(hs[1]));
    const reach = at => { if (!at) return true; const x = cc(at[0]), y = cc(at[1]); if (Math.hypot(x - cc(hs[0]), y - cc(hs[1])) < 20) return true; const nx = f.next(x, y); return !!nx; };
    if (spec.exit && !reach(spec.exit.at)) out.push({ msg: 'The exit cannot be reached from the start.', at: spec.exit.at });
    if (tgt && !reach(tgt.at)) out.push({ msg: 'The target cannot be reached from the start.', at: tgt.at });
    if (spec.boss && !reach(spec.boss.at)) out.push({ msg: 'The boss cannot be reached from the start.', at: spec.boss.at });
  }
  return out;
};
B.WS.slotKey = i => 'bentou:workshop:' + i;
B.scenes.workshop = {
  view: 'iso', views: ['iso', 'threequarter'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [.6, 2], start: 1, rotate: true, wheel: false },
  enter(d) {
    d = d || {}; const G = B.game; G.lights.enabled = true; G.lights.ambient = .6; G.weather = null; B.music.play('shop'); G.timeScale = 1;
    if (d.keep && B.wsState) this.spec = B.wsState.spec; else if (d.spec) this.spec = JSON.parse(JSON.stringify(d.spec)); else this.spec = null;
    this.cat = 0; this.brush = 0; this.cx = 5; this.cy = 5; this.face = 0; this.sel = null; this.prev = new Set(); this.wait = [0, 1, 2, 4]; this.problems = [];
    if (this.spec) this.load(this.spec); else this.startMenu();
  },
  exit() { B.game.lights.enabled = false; this.closeText(); },
  load(spec) { this.spec = spec; this.world = new World(spec); B.wsState = { spec }; const G = B.game; G.cam.bounds = v => this.world.map.bounds(v); if (spec.hero) { this.cx = spec.hero.at[0]; this.cy = spec.hero.at[1]; } G.cam.snap = true; this.dirty = false; },
  rebuild() { this.world = new World(this.spec); this.dirty = false; },
  startMenu() {
    const slots = [1, 2, 3].map(i => { const s = E.store.get(B.WS.slotKey(i), null); return [s ? 'Slot ' + i + ': ' + s.name : 'Slot ' + i + ': empty', () => { if (s) { B.ui.hide(); this.load(s); } else { B.ui.hide(); this.load(B.WS.blank(40)); this.slot = i; } }]; });
    B.ui.show('wsStart', { kicker: 'Workshop', title: 'The Mission Editor', text: 'Build a night of your own on the same maps the story uses. Pick a slot, or start from a template.',
      actions: [...slots, ['New: blank 40 x 40', () => { B.ui.hide(); this.load(B.WS.blank(40)); }], ['New: copy a campaign level', () => B.ui.show('wsCopy', { title: 'Copy which level?', actions: ['training', 'm1', 'm2', 'm3', 'delivery'].map(id => [get('level', id).name, () => { B.ui.hide(); this.load(Object.assign(B.levelSpec(id), { id: 'workshop' })); }]).concat([['Back', () => B.ui.back()]]) })],
        ['Back to the title', () => { B.ui.hide(); B.game.go('title'); }]], back: () => { B.ui.hide(); B.game.go('title'); } });
  },
  menu() {
    const G = B.game, sp = this.spec;
    B.ui.show('wsMenu', { kicker: 'Workshop', title: sp.name, text: this.problems.length ? 'Problems:\n' + this.problems.map(p => '- ' + p.msg).join('\n') : 'Level ' + sp.size[0] + ' x ' + sp.size[1] + ', ' + (sp.guards.length + sp.civilians.length) + ' people.',
      actions: [{ label: 'Test play', primary: true, fn: () => this.test('workshop') }, ['Play (a fresh run with results)', () => this.test('workshop')],
        ...[1, 2, 3].map(i => ['Save to slot ' + i, () => { E.store.set(B.WS.slotKey(i), this.spec); B.ui.toast('Saved', 'Slot ' + i); this.menu(); }]),
        ['Load...', () => B.ui.show('wsLoad', { title: 'Load which slot?', actions: [1, 2, 3].map(i => { const s = E.store.get(B.WS.slotKey(i), null); return [s ? 'Slot ' + i + ': ' + s.name : 'Slot ' + i + ': empty', () => { if (s) { B.ui.hide(); this.load(s); } }]; }).concat([['Back', () => B.ui.back()]]) })],
        ['Export JSON', () => this.exportJson()], ['Import JSON', () => this.importJson()], ['Settings', () => this.settingsScreen()], ['Exit to title', () => { B.ui.hide(); G.go('title'); }]],
      back: () => B.ui.hide() });
  },
  settingsScreen() {
    const sp = this.spec, cyc = (k, opts) => { const i = opts.indexOf(sp[k]); sp[k] = opts[(i + 1) % opts.length]; this.rebuild(); this.settingsScreen(); };
    const names = ['My Mission', 'The Broker\'s Warehouse', 'Night at the Ferry', 'Lanterns over the Rice', 'The Red Gate'];
    B.ui.show('wsSettings', { kicker: 'Workshop', title: 'Level settings', actions: [
      ['Name: ' + sp.name, () => cyc('name', names.includes(sp.name) ? names : [sp.name].concat(names))],
      ['Size: ' + sp.size[0] + ' x ' + sp.size[1], () => { const n = { 32: 40, 40: 48, 48: 32 }[sp.size[0]] || 40; this.resize(n); this.settingsScreen(); }],
      ['Time: ' + sp.time, () => cyc('time', ['dusk', 'night', 'rain', 'festival'])], ['Par time: ' + sp.par + ' s', () => { sp.par = sp.par >= 900 ? 200 : sp.par + 100; this.settingsScreen(); }],
      ['Music: ' + sp.music, () => cyc('music', ['m1', 'm2', 'm3', 'training'])], ['Back', () => B.ui.back()]], back: () => B.ui.back() });
  },
  resize(n) { const sp = this.spec, old = sp.rows; sp.size = [n, n]; sp.rows = R(n, n, '.', [['box', 0, 0, n - 1, n - 1, '#']]).map((row, y) => row.split('').map((c, x) => (x > 0 && y > 0 && x < n - 1 && y < n - 1 && old[y] && old[y][x] && x < old[y].length - 1 && y < old.length - 1) ? old[y][x] : c).join('')); this.rebuild(); },
  test() {
    this.problems = B.WS.validate(this.spec);
    if (this.problems.length) { const p = this.problems.find(q => q.at); if (p) { this.cx = Math.floor(p.at[0]); this.cy = Math.floor(p.at[1]); } this.menu(); return; }
    B.ui.hide(); B.wsState = { spec: this.spec }; B.game.go('mission', { mode: 'workshop', levelId: 'workshop', spec: B.WS.generate(this.spec), character: (B.save.data && B.save.data.character) || 'sojiro', missionId: 'workshop' });
  },
  exportJson() { const s = JSON.stringify(this.spec); try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(() => B.ui.toast('Copied', 'The level JSON is on your clipboard'), () => B.ui.toast('Copy blocked', 'Select the text below and copy it')); } catch (e) { /* the text box below is the fallback */ } this.textBox(s, true); },
  importJson() { this.textBox('', false); },
  textBox(text, readOnly) {
    if (HEADLESS) return; this.closeText(); B.ui.hide();
    const wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;inset:0;background:#000c;display:grid;place-items:center;z-index:40';
    const box = document.createElement('div'); box.style.cssText = 'background:#140c0c;border:1px solid #e8b04a;padding:16px;width:min(720px,92vw);color:#f4ead5;font:16px system-ui;zoom:var(--ui,1)';
    const h = document.createElement('div'); h.textContent = readOnly ? 'Level JSON (select all and copy)' : 'Paste a level JSON, then Import'; h.style.cssText = 'color:#e8b04a;margin-bottom:8px';
    const ta = document.createElement('textarea'); ta.value = text; ta.readOnly = readOnly; ta.style.cssText = 'width:100%;height:40vh;background:#0a0606;color:#f4ead5;border:1px solid #8a6a3a;font:12px monospace';
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;margin-top:10px';
    const mk = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:600 15px system-ui;padding:12px 18px;background:#e8b04a;border:0;color:#140c0c;cursor:pointer'; b.onclick = fn; b.onpointermove = () => b.focus(); row.appendChild(b); return b; };
    if (!readOnly) mk('Import', () => { try { const sp = JSON.parse(ta.value); if (!sp || !Array.isArray(sp.rows) || !Array.isArray(sp.size)) throw new Error('not a level'); for (const k of ['guards', 'civilians', 'props', 'lights', 'pickups', 'bells', 'barracks']) sp[k] = sp[k] || []; this.closeText(); this.load(sp); B.ui.toast('Imported', sp.name || 'a level'); } catch (e) { h.textContent = 'That is not a level JSON (' + e.message + ')'; } });
    const close = mk(readOnly ? 'Done' : 'Cancel', () => this.closeText());
    box.append(h, ta, row); wrap.appendChild(box); document.body.appendChild(wrap); this.overlay = wrap; (readOnly ? (ta.select(), close) : ta).focus();
  },
  closeText() { if (this.overlay) { this.overlay.remove(); this.overlay = null; } },
  edge(code) { const I = B.game.input, h = I.held, on = h && (typeof h.has === 'function' ? h.has(code) : h[code]); return (on && !this.prev.has(code)) || (!!B.taps && B.taps.has(code) && !this.prev.has(code)); },
  held(code) { const h = B.game.input.held; return !!h && (typeof h.has === 'function' ? h.has(code) : !!h[code]); },
  cur() { return WS_CATS[WS_CAT_NAMES[this.cat]][this.brush]; },
  update(dt) {
    const G = B.game, I = G.input; B.padActive(); if (!this.spec || B.ui.screen || this.overlay) { this.snapPrev(); return; }
    const n = WS_CATS[WS_CAT_NAMES[this.cat]].length;
    if (this.edge('Pad4') || (this.edge('Tab') && this.held('ShiftLeft'))) { this.cat = (this.cat + WS_CAT_NAMES.length - 1) % WS_CAT_NAMES.length; this.brush = 0; B.sfx('uiMove'); }
    else if (this.edge('Pad5') || this.edge('Tab')) { this.cat = (this.cat + 1) % WS_CAT_NAMES.length; this.brush = 0; B.sfx('uiMove'); }
    if (this.edge('Pad6')) this.brush = (this.brush + n - 1) % n; if (this.edge('Pad7')) this.brush = (this.brush + 1) % n;
    if (B.wheel) { this.brush = (this.brush + (B.wheel > 0 ? 1 : n - 1)) % n; B.wheel = 0; }
    for (let k = 1; k <= 9; k++) if (this.edge('Digit' + k) && k <= n) this.brush = k - 1;
    const rot = this.edge('KeyQ') || this.edge('Pad3');
    if (rot && WS_CAT_NAMES[this.cat] === 'Routes' && this.sel && this.sel.route) { const wp = this.sel.route[this.sel.route.length - 1], i = this.wait.indexOf(wp[2] || 0); wp[2] = this.wait[(i + 1) % this.wait.length]; B.ui.toast('Waypoint wait', wp[2] + ' s'); }
    else if (rot) this.face = (this.face + 3) % 4; if (this.edge('KeyE')) this.face = (this.face + 1) % 4;
    // the cursor: stick / keys with repeat, or the mouse under the pointer
    const rep = a => I.repeat(a, .22, .06); let dx = 0, dy = 0; if (rep('left')) dx = -1; if (rep('right')) dx = 1; if (rep('up')) dy = -1; if (rep('down')) dy = 1;
    if (dx || dy) { const g2 = G.view.screenDirToGround(dx, dy); this.cx += Math.round(g2[0] * 1.4); this.cy += Math.round(g2[1] * 1.4); }
    const p = I.pointer(); if (B.mouseMode() && p) { const pk = this.world.map.pick(p[0], p[1]); if (pk) { this.cx = pk.cx; this.cy = pk.cy; } }
    this.cx = clamp(this.cx, 0, this.spec.size[0] - 1); this.cy = clamp(this.cy, 0, this.spec.size[1] - 1);
    const ax = I.padAxes || []; if (Math.hypot(ax[2] || 0, ax[3] || 0) > .3) { this.pan = this.pan || { x: 0, y: 0 }; const g2 = G.view.screenDirToGround(ax[2], ax[3]); this.pan.x += g2[0] * 200 * dt; this.pan.y += g2[1] * 200 * dt; }
    if (this.held('Mouse1')) { const d2 = I.pan ? I.pan() : null; if (d2) { this.pan = this.pan || { x: 0, y: 0 }; const g2 = G.view.screenDirToGround(-d2[0], -d2[1]); this.pan.x += g2[0] * 2; this.pan.y += g2[1] * 2; } }
    // paint, erase, pick
    const paint = this.held('Pad0') || this.held('Space') || (this.held('Mouse0') && B.mouseMode()), erase = this.edge('Pad1') || this.edge('Mouse2') || this.edge('Delete') || this.edge('Backspace');
    const paintEdge = this.edge('Pad0') || this.edge('Space') || this.edge('Mouse0');
    const b = this.cur();
    if (paint && (b.kind === 'cell' ? true : paintEdge)) this.apply(b);
    if (erase) this.erase();
    if (this.edge('Pad2') || this.edge('KeyI')) this.pick();
    if (this.edge('Pad8') || this.edge('F5')) this.test();
    if (this.edge('Pad9') || this.edge('Escape')) { this.problems = B.WS.validate(this.spec); this.menu(); }
    if (this.dirty) this.rebuild();
    const W = this.world; G.focus(cc(this.cx) + (this.pan ? this.pan.x : 0), cc(this.cy) + (this.pan ? this.pan.y : 0), W.map.height(this.cx, this.cy));
    if (dx || dy) this.pan = null;
    this.snapPrev();
  },
  snapPrev() { if (B.taps) B.taps.clear(); const h = B.game.input.held; this.prev = new Set(h ? (typeof h.forEach === 'function' ? [...h] : Object.keys(h).filter(k => h[k])) : []); },
  apply(b) {
    const sp = this.spec, x = this.cx, y = this.cy, edgeCell = x === 0 || y === 0 || x === sp.size[0] - 1 || y === sp.size[1] - 1;
    if (b.kind === 'cell') { if (edgeCell && b.id !== '#') return; if (sp.rows[y][x] === b.id) return; sp.rows[y] = sp.rows[y].slice(0, x) + b.id + sp.rows[y].slice(x + 1); this.world.set(x, y, b.id); this.world.bake(); return; }
    const at = [x, y], fac = this.face * 90;
    if (b.kind === 'prop') { sp.props.push([b.id, x, y, { facing: this.face * Math.PI / 2 }]); }
    else if (b.kind === 'light') { if (b.id === 'torch' || b.id === 'brazier') { sp.lights.push({ at, z: 20, r: 60, i: .9, color: '#ffa040', kind: null }); sp.props.push([b.id, x, y, {}]); } else sp.lights.push({ at, z: 22, r: 60, i: .9, color: '#ffb060', kind: b.id }); }
    else if (b.kind === 'item') { if (b.id === 'scroll') { sp.pickups = sp.pickups.filter(p => p.kind !== 'story'); sp.pickups.push({ id: 'scroll', kind: 'story', name: 'the scroll', at }); } else sp.pickups.push({ kind: 'tool', tool: b.id, n: 2, at }); }
    else if (b.kind === 'route') { if (!this.sel) { B.ui.toast('Routes', 'Pick a guard first (□ or I)'); return; } this.sel.route = this.sel.route || [this.sel.at.slice()]; this.sel.route.push([x, y, 0]); this.sel.mode = 'patrol'; }
    else if (b.kind === 'settings') { this.settingsScreen(); return; }
    else if (b.kind === 'actor') {
      const id = b.id, uid = id + (sp.guards.length + sp.civilians.length + 1);
      if (id === 'hero') sp.hero = { at, facing: fac }; else if (id === 'exit') sp.exit = { at, r: 1.5 };
      else if (id === 'bell') sp.bells.push(at); else if (id === 'barracks') sp.barracks.push(at);
      else if (id === 'target') { sp.civilians = sp.civilians.filter(c => c.type !== 'target'); sp.civilians.push({ id: 'target', type: 'target', kind: 'merchant', target: true, name: 'The Broker', at, facing: fac, mode: 'post' }); }
      else if (['merchant', 'maid', 'monk'].includes(id)) sp.civilians.push({ id: uid, kind: id, at, facing: fac, mode: 'post' });
      else if (id === 'disguised') sp.civilians.push({ id: uid, kind: 'servant', disguised: true, at, facing: fac, mode: 'post' });
      else if (['gonroku', 'hotaru', 'kurogane'].includes(id)) { sp.boss = { id, at, z: this.world.map.height(x, y), intro: [id, { gonroku: 'gon_intro', hotaru: 'hot_intro', kurogane: 'kur_intro' }[id]], defeat: [id, { gonroku: 'gon_defeat', hotaru: 'hot_defeat', kurogane: 'kur_defeat' }[id]], close: [] }; }
      else { const g = { id: uid, type: id, at, z: this.world.map.height(x, y), facing: fac, mode: 'post', lantern: id === 'ashigaru' }; sp.guards.push(g); this.sel = g; }
    }
    B.sfx('uiMove'); this.dirty = true;
  },
  erase() {
    const sp = this.spec, x = this.cx, y = this.cy, near = a => a && Math.abs(a[0] - x) < 1 && Math.abs(a[1] - y) < 1;
    const b = this.cur();
    if (b.kind === 'route' && this.sel && this.sel.route) { this.sel.route.pop(); if (this.sel.route.length < 2) { this.sel.route = null; this.sel.mode = 'post'; } this.dirty = true; return; }
    const before = JSON.stringify(sp);
    sp.guards = sp.guards.filter(g => !near(g.at)); sp.civilians = sp.civilians.filter(g => !near(g.at)); sp.props = sp.props.filter(p => !near([p[1], p[2]])); sp.lights = sp.lights.filter(l => !near(l.at)); sp.pickups = sp.pickups.filter(p => !near(p.at));
    sp.bells = sp.bells.filter(q => !near(q)); sp.barracks = sp.barracks.filter(q => !near(q)); if (sp.boss && near(sp.boss.at)) sp.boss = null; if (sp.exit && near(sp.exit.at)) sp.exit = null;
    if (JSON.stringify(sp) === before && (b.kind === 'cell') && sp.rows[y][x] !== '.' && !(x === 0 || y === 0 || x === sp.size[0] - 1 || y === sp.size[1] - 1)) { sp.rows[y] = sp.rows[y].slice(0, x) + '.' + sp.rows[y].slice(x + 1); this.world.set(x, y, '.'); this.world.bake(); return; }
    B.sfx('uiBack'); this.dirty = true;
  },
  pick() {
    const sp = this.spec, x = this.cx, y = this.cy, near = a => a && Math.abs(a[0] - x) < 1 && Math.abs(a[1] - y) < 1;
    const g = sp.guards.find(q => near(q.at)); if (g) { this.sel = g; this.cat = WS_CAT_NAMES.indexOf('Routes'); this.brush = 0; B.ui.toast('Selected', g.type + ': add waypoints with paint, cycle the wait with rotate'); return; }
    const ch = sp.rows[y][x]; for (let c = 0; c < WS_CAT_NAMES.length; c++) { const k = WS_CATS[WS_CAT_NAMES[c]].findIndex(q => q.kind === 'cell' && q.id === ch); if (k >= 0) { this.cat = c; this.brush = k; return; } }
  },
  draw(r) {
    if (!this.spec) { r.sky(['#0e0808', '#1a1010', '#140c0c']); return; }
    const W = this.world, sp = this.spec, G = B.game; B.lastR = r;
    B.drawWorld(r, W, {});
    const pin = (x, y, z, c, label) => r.queue(x, y, z, g => { const q = r.w(x, y, z); px.line(g, q[0], q[1], q[0], q[1] - 14, '#1a1418'); px.disc(g, q[0], q[1] - 16, 3, c); if (label) E.font.text(g, label, q[0], q[1] - 28, '#f4ead5', { align: 'center', font: 'tiny' }); }, { emissive: true });
    if (sp.hero) pin(cc(sp.hero.at[0]), cc(sp.hero.at[1]), sp.hero.z || 0, '#5ae0a0', 'START');
    if (sp.exit) r.decal(() => r.groundRing(cc(sp.exit.at[0]), cc(sp.exit.at[1]), 20, '#5ad8ff', .6));
    for (const g of sp.guards) { pin(cc(g.at[0]), cc(g.at[1]), g.z || 0, g === this.sel ? '#ffffff' : '#ff6a4a', g.type.slice(0, 3).toUpperCase()); if (g.route) r.decal(gg => { for (let i = 0; i < g.route.length; i++) { const a = g.route[i], bq = g.route[(i + 1) % g.route.length], p0 = r.w(cc(a[0]), cc(a[1]), 0), p1 = r.w(cc(bq[0]), cc(bq[1]), 0); px.line(gg, p0[0], p0[1], p1[0], p1[1], g === this.sel ? '#ffffff' : '#5a8aff'); px.disc(gg, p1[0], p1[1], 2, '#5a8aff'); } }); }
    for (const c of sp.civilians) pin(cc(c.at[0]), cc(c.at[1]), 0, c.type === 'target' ? '#e8b04a' : c.disguised ? '#c83a3a' : '#c8c8c8', c.type === 'target' ? 'TARGET' : null);
    if (sp.boss) pin(cc(sp.boss.at[0]), cc(sp.boss.at[1]), sp.boss.z || 0, '#d8402a', 'BOSS');
    for (const p of sp.pickups) pin(cc(p.at[0]), cc(p.at[1]), 0, '#ffe080', null);
    for (const q of sp.bells) pin(cc(q[0]), cc(q[1]), 0, '#c8a040', 'BELL'); for (const q of sp.barracks) pin(cc(q[0]), cc(q[1]), 0, '#8a8a8a', 'BRK');
    // the grid and the cursor box at the cell's top
    const ch = W.map.height(this.cx, this.cy), x0 = this.cx * CELL, y0 = this.cy * CELL;
    r.queue(x0 + 8, y0 + 8, ch + 1, g => { const c = [r.w(x0, y0, ch), r.w(x0 + 16, y0, ch), r.w(x0 + 16, y0 + 16, ch), r.w(x0, y0 + 16, ch)]; for (let k = 0; k < 4; k++) px.line(g, c[k][0], c[k][1], c[(k + 1) % 4][0], c[(k + 1) % 4][1], Math.floor(G.real * 4) % 2 ? '#ffffff' : '#e8b04a'); }, { emissive: true, bias: 50 });
    r.decal(g => { for (let k = -6; k <= 6; k++) for (const [ax, ay, bx, by] of [[this.cx + k, this.cy - 6, this.cx + k, this.cy + 7], [this.cx - 6, this.cy + k, this.cx + 7, this.cy + k]]) { const p = r.w(ax * CELL, ay * CELL, 0), q = r.w(bx * CELL, by * CELL, 0); px.line(g, p[0], p[1], q[0], q[1], '#3a3048'); } });
    r.overlay(g => {
      // category tabs, the brush strip, the cell info and the legend
      let tx = 6; WS_CAT_NAMES.forEach((n, i) => { const w = E.font.width(n) + 8; px.rect(g, tx, 4, w, 12, i === this.cat ? '#e8b04a' : '#1a1210'); E.font.text(g, n, tx + 4, 6, i === this.cat ? '#140c0c' : '#c8b8a0', { outline: false }); tx += w + 2; });
      const L = WS_CATS[WS_CAT_NAMES[this.cat]], bw = 18, start = clamp(this.brush - 8, 0, Math.max(0, L.length - 17)); px.blend(g, .85, 'normal', () => px.rect(g, 0, r.H - 34, r.W, 34, '#140c0c'));
      L.slice(start, start + 17).forEach((b2, k) => { const i = start + k, x = 6 + k * (bw + 2), y = r.H - 30; px.rect(g, x, y, bw, bw, i === this.brush ? '#e8b04a' : '#3a2418'); const icon = b2.kind === 'item' ? B.ICON[b2.id === 'scroll' ? 'scroll' : b2.id] : null; if (icon) px.sprite(g, icon, x + 2, y + 3); else E.font.text(g, b2.kind === 'cell' ? b2.id : b2.name.slice(0, 2), x + bw / 2, y + 6, i === this.brush ? '#140c0c' : '#f4ead5', { align: 'center', outline: false }); });
      E.font.text(g, this.cur().name, 6, r.H - 44, '#e8b04a', { outline: false, shadow: '#000' });
      const c = sp.rows[this.cy][this.cx], wt = B.WALLS[c]; E.font.text(g, '(' + this.cx + ', ' + this.cy + ') ' + (wt ? wt.name + ' h' + wt.h : (B.FLOORS[c] || ['', 'Floor'])[1]) + '   facing ' + ['E', 'S', 'W', 'N'][this.face], 6, 20, '#f4ead5', { outline: false, shadow: '#000' });
      if (this.sel) E.font.text(g, 'Selected: ' + this.sel.type + (this.sel.route ? ' (' + this.sel.route.length + ' waypoints)' : ''), 6, 30, '#ffffff', { outline: false, shadow: '#000' });
      const dev = B.device(); B.rich(g, dev === 'gamepad' ? '{a:jump} paint {a:crouch} erase {a:attack} pick {a:interact} rotate  L1/R1 tab  L2/R2 brush  Create test  Options menu' : 'Click paint  Right click erase  Wheel brush  Tab category  Q/E rotate  I pick  F5 test  Esc menu', r.W - 6, r.H - 44, '#b8a890', { align: 'right' });
    });
  }
};
if (!HEADLESS) addEventListener('keydown', e => { if (e.code === 'F5' && B.game && B.game.sceneName === 'workshop') e.preventDefault(); });

/* ---- 80-autopilot ---- */
/* 80-autopilot: an intent producer that runs beats (teleport, go to, wait, press, hold, grapple, use a tool, Silent Cut
 * a guard, fight), shared by attract mode and the playthrough test. It never touches game.input, so its activity can't
 * count as the player's. Each beat times out (8 s by default) and the next one runs, so a loop can't get stuck.
 * Then the attract director: seven vignettes, looping, any input returns to the title. */
B.Autopilot = {
  start(M, beats) { M.ap = { beats: beats.slice(), i: 0, t: 0, log: [], timeouts: 0 }; },
  done(M) { return !M.ap || M.ap.i >= M.ap.beats.length; },
  next(M, timedOut) { const ap = M.ap; if (timedOut) { ap.timeouts++; ap.log.push('timeout:' + ap.i); } ap.i++; ap.t = 0; ap.st = null; },
  goTo(M, I, tx, ty, gait, near = 6, tz) {
    const h = M.hero, d = Math.hypot(tx - h.x, ty - h.y); if (d < near && (tz === undefined || Math.abs(h.z - tz) < 10)) return true;
    const W = M.world, key = Math.floor(tx / 8) + ',' + Math.floor(ty / 8);
    if (!M.ap.flow || M.ap.flowKey !== key) { M.ap.flow = new E.FlowField(W.map, { climb: 30, drop: 48, jump: 60 }); M.ap.flow.update(tx, ty); M.ap.flowKey = key; }
    const nx = M.ap.flow.next(h.x, h.y), gx = nx ? nx.x : tx, gy = nx ? nx.y : ty, l = Math.hypot(gx - h.x, gy - h.y) || 1;
    I.move = [(gx - h.x) / l, (gy - h.y) / l]; if (gait === 'walk') I.move = I.move.map(v => v * .5); if (gait === 'sprint') I.sprint = true;
    if (gait === 'crouch' && !h.crouch) I.crouchPressed = true; if (gait !== 'crouch' && h.crouch && !h.swim) I.crouchPressed = true;
    if (nx && h.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < h.r + 5) I.jumpPressed = true;
    return false;
  },
  intent(M, dt) {
    const I = B.emptyIntent(), h = M.hero, ap = M.ap; if (!ap || !h || ap.i >= ap.beats.length) return I;
    const b = ap.beats[ap.i]; ap.t += dt; const max = b.max || 8;
    if (ap.t > max) { this.next(M, true); return I; }
    if (b.at) { Object.assign(h, { x: cc(b.at[0]), y: cc(b.at[1]), z: b.at[2] || 0, vx: 0, vy: 0, vz: 0, action: null, onGround: true }); if (b.facing !== undefined) h.facing = b.facing * Math.PI / 180; if (b.crouch !== undefined) h.crouch = b.crouch; B.game.cam.snap = true; this.next(M); return I; }
    if (b.fn) { b.fn(M); this.next(M); return I; }
    if (b.wait !== undefined) { if (b.crouch) { if (!h.crouch) I.crouchPressed = true; } if (b.focus) I.focusDown = true; if (ap.t >= b.wait) this.next(M); return I; }
    if (b.until) { if (b.until(M)) this.next(M); return I; }
    if (b.press) { I[b.press] = true; if (b.press === 'grapplePressed') I.grappleDown = true; this.next(M); return I; }
    if (b.hold) { I[b.hold] = true; if (ap.t >= (b.s || .5)) this.next(M); return I; }
    if (b.goto) { if (this.goTo(M, I, cc(b.goto[0]), cc(b.goto[1]), b.gait || 'run', b.near || 6, b.z)) this.next(M); return I; }
    if (b.face) { h.facing = b.face * Math.PI / 180; this.next(M); return I; }
    if (b.grapple) {
      const [gx, gy, gz] = b.grapple, x = cc(gx), y = cc(gy); const L = M.world.anchorsNear(h, B.T('grappleRange') + 40, 120); let best = null, bd = 1e9;
      for (const a of L) { const d = Math.hypot(a.x - x, a.y - y) + Math.abs(a.z - (gz || a.z)); if (d < bd) { bd = d; best = a; } }
      if (!ap.st) { if (!best) { this.next(M, true); return I; } ap.st = { a: best, k: 0 }; }
      ap.st.k++; I.grappleTarget = ap.st.a; if (ap.st.k === 1) { I.grapplePressed = true; I.grappleDown = true; } else { I.grappleReleased = true; }
      if (ap.st.k >= 2 && !(h.action && h.action.name === 'grapple')) { if (ap.st.k > 3) this.next(M); }
      return I;
    }
    if (b.use) {
      if (!ap.st) { const k = M.bento.slots.findIndex(s => s && s.tool === b.use && s.n > 0); if (k < 0) { B.Bento.add(M, b.use, 1); } ap.st = { k: M.bento.slots.findIndex(s => s && s.tool === b.use && s.n > 0) }; I.toolSlot = ap.st.k + 1; return I; }
      I.usePressed = true; if (b.target) I.aimPoint = { x: cc(b.target[0]), y: cc(b.target[1]) }; this.next(M); return I;
    }
    if (b.cut) {
      const g = M.guards.find(q => q.id === b.cut); if (!g || !g.alive) { if (!g || !(h.action && h.action.name === 'silentCut')) this.next(M); return I; }
      const c = B.cutCandidate(h, M); if (c && c.g === g) { I.attackPressed = true; return I; }
      const behind = { x: g.x - Math.cos(g.facing) * 12, y: g.y - Math.sin(g.facing) * 12 };
      if (b.from === 'water' || h.swim) { this.goTo(M, I, g.x, g.y, 'crouch', 4); return I; }
      if (b.from === 'above') { I.move = [0, 0]; return I; }
      this.goTo(M, I, behind.x, behind.y, b.gait || 'crouch', 3); return I;
    }
    if (b.fight) {
      const foes = M.guards.filter(q => q.alive && !q.civilian && !q.dying).concat(M.bosses.filter(q => q.alive && q.active)), f = foes.sort((p, q) => dist2(p, h) - dist2(q, h))[0];
      if (!f || ap.t > b.fight) { this.next(M); return I; }
      const d = Math.hypot(f.x - h.x, f.y - h.y), wind = f.move ? f.move.phase === 'wind' : f.swing && f.swing.phase === 'wind';
      if (f.staggerT > 0 && d < 28) { I.attackPressed = true; return I; }
      if (wind && d < 40) { if (f.swing && f.swing.u > .7 || (f.move && f.move.S && f.move.S.parry && f.move.t > f.move.S.wind * .7)) I.blockPressed = true; I.blockDown = true; if (f.move && !f.move.S.parry && d < 30) { I.jumpPressed = true; const a = Math.atan2(h.y - f.y, h.x - f.x) + 1.2; I.move = [Math.cos(a), Math.sin(a)]; } return I; }
      if (d > 20) { this.goTo(M, I, f.x, f.y, 'run', 16); return I; }
      h.facing = Math.atan2(f.y - h.y, f.x - h.x); if (Math.floor(ap.t * 4) % 2 === 0) I.attackPressed = true; return I;
    }
    if (b.say) { M.say(b.say[0], b.say[1]); this.next(M); return I; }
    this.next(M); return I;
  }
};
/* ---- the attract director ---- */
const keepOnly = (M, ids) => { M.guards = M.guards.filter(g => ids.includes(g.id)); };
B.VIGNETTES = [
  { name: 'Rooftops', level: 'm1', cap: 24, setup(M) { keepOnly(M, ['guardB']); M.guards.push(new Guard({ id: 'guardB', type: 'ashigaru', at: [36.5, 33], facing: 90, mode: 'post', lantern: true }, M)); },
    beats: [{ at: [11, 32, 40], facing: 0 }, { wait: .6 }, { goto: [20, 33], gait: 'run', z: 40 }, { goto: [26, 32.5], gait: 'run', z: 40 }, { goto: [28, 32.5], gait: 'walk', near: 4 }, { grapple: [32, 33, 64] }, { wait: 1.2 }, { goto: [35.3, 33], gait: 'crouch', near: 3 }, { wait: .4, crouch: true }, { cut: 'guardB', from: 'above', max: 3 }, { wait: 2 }] },
  { name: 'Silent Cut', level: 'm1', cap: 22, setup(M) { keepOnly(M, ['ash1']); const g = M.guards[0]; Object.assign(g, { x: cc(9), y: cc(36.5) }); g.route = [{ x: cc(22), y: cc(36.5), wait: 0, look: null }]; g.ri = 0; },
    beats: [{ at: [6, 36.5, 0], facing: 0, crouch: true }, { wait: 1.5, crouch: true, focus: true }, { cut: 'ash1', gait: 'crouch', max: 14 }, { wait: 2.2 }] },
  { name: 'Rice for the Hungry', level: 'm1', cap: 24, setup(M) { keepOnly(M, ['ash6']); const g = M.guards[0]; Object.assign(g, { x: cc(26), y: cc(11.5), facing: 0, mode: 'post' }); g.home = { x: g.x, y: g.y, z: 0, facing: 0 }; },
    beats: [{ at: [33, 13.2, 0], facing: 180, crouch: true }, { wait: .5 }, { use: 'poison', target: [29.5, 12.2] }, { until: M => !M.guards[0].alive, max: 12 }, { wait: 1 }, { goto: [29.5, 12.2], gait: 'run', near: 10 }, { press: 'interactPressed' }, { goto: [32.5, 13], gait: 'walk', near: 4 }, { press: 'interactPressed' }, { wait: 2 }] },
  { name: 'The Moat', level: 'm2', cap: 22, setup(M) { keepOnly(M, ['arc2', 'pg']); M.guards.push(new Guard({ id: 'pg', type: 'ashigaru', faction: 'redlantern', at: [25, 31.2], facing: 90, mode: 'post', lantern: true }, M)); },
    beats: [{ at: [17, 24, 0], facing: 0 }, { goto: [21, 27], gait: 'run' }, { wait: .2, crouch: true }, { goto: [24.8, 30.2], gait: 'crouch', near: 4 }, { cut: 'pg', from: 'water', max: 6 }, { wait: 2.5 }] },
  { name: 'Smoke and Steel', level: 'm2', cap: 26, setup(M) { keepOnly(M, ['ash4', 'ash5', 'sam1']); for (const g of M.guards) g.mind.level = 0; },
    beats: [{ at: [43, 31, 0], facing: 270 }, { wait: 2.5 }, { until: M => M.guards.some(g => g.mind.state === 'alert'), max: 4 }, { use: 'smoke', target: [43, 28.5] }, { goto: [40, 33], gait: 'sprint' }, { wait: 2 }, { fight: 12 }, { wait: 1 }] },
  { name: 'Oni on the Roof', level: 'm3', cap: 26, setup(M) { keepOnly(M, []); const b = M.bosses[0]; b.hp = b.hpMax * .52; },
    beats: [{ at: [15, 33.5, 160], facing: 0 }, { fn: M => { M.startBoss('kurogane'); M.cine = null; M.bosses[0].start(); } }, { fight: 9 }, { fn: M => { const b = M.bosses[0]; if (b.phase === 1) b.enterPhase2(); } }, { fight: 9 }, { fn: M => { const b = M.bosses[0]; if (b.alive) b.takeHit(M.hero, 9999, { pierce: true }); } }, { wait: 2.5 }] },
  { name: 'Report', report: true, cap: 7 }
];
B.scenes.attract = {
  view: 'iso', views: ['iso'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [1, 1.4], start: 1.2, rotate: false, wheel: false },
  enter(d) { this.vi = (d && d.start) || 0; this.loops = 0; this.visited = new Set(); this.t = 0; this.inputT = 0; B.idle = 0; this.startVignette(); },
  exit() { const G = B.game; G.timeScale = 1; G.weather = null; G.lights.enabled = false; if (B.mission === this.M) B.mission = null; this.M = null; },
  startVignette() {
    const V = B.VIGNETTES[this.vi], G = B.game; this.t = 0; this.visited.add(V.name); G.timeScale = 1;
    if (V.report) { this.M = null; G.lights.enabled = false; G.weather = null; B.music.play('results'); this.fake = { total: 2840, rank: 'Grand Kaiseki' }; return; }
    const M = this.M = new Mission(V.level, { mode: 'attract', auto: true, character: this.vi % 2 ? 'kaede' : 'sojiro', cheats: { god: true, infTools: true }, missionId: V.level });
    M.objectives = []; M.triggers = []; M.timer = null; V.setup(M); B.setupMissionView(M); G.setZoom(1.2); B.music.play(V.level === 'm3' ? 'boss' : M.level.music);
    B.Autopilot.start(M, V.beats);
  },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt / Math.max(.1, G.timeScale);
    this.inputT += dt;
    if (this.inputT > .4 && (B.anyInput || I.anyPressed() || B.padActive())) { B.anyInput = false; G.go('title'); return; }
    if (this.inputT <= .4) B.anyInput = false;
    const V = B.VIGNETTES[this.vi];
    if (this.M) { const M = this.M; const Ii = B.Autopilot.intent(M, dt); B.cameraUpdate(M, dt, Ii); M.update(dt, Ii); }
    if (this.t > V.cap || (this.M && B.Autopilot.done(this.M) && this.t > 3)) { this.vi = (this.vi + 1) % B.VIGNETTES.length; if (this.vi === 0) this.loops++; this.startVignette(); }
  },
  draw(r) {
    const V = B.VIGNETTES[this.vi];
    if (this.M) B.drawMission(r, this.M, { reveal: true });
    else { r.sky(['#1a120c', '#241810', '#1a120c']); }
    r.overlay(g => {
      if (V.report) {
        const w = Math.min(280, r.W - 40), x0 = Math.round(r.W / 2 - w / 2); px.rect(g, x0, 20, w, r.H - 50, '#f4ead5'); px.rect(g, x0 - 4, 16, w + 8, 6, '#6a3a1a'); px.rect(g, x0 - 4, r.H - 32, w + 8, 6, '#6a3a1a');
        E.font.text(g, 'Moon over Kokaku', r.W / 2, 28, '#1a1418', { align: 'center', outline: false });
        [['Silent Cuts', 14], ['Times detected', 0], ['Civilians harmed', 0], ['Optional tasks', 1]].forEach(([k, v], i) => { E.font.text(g, k, x0 + 16, 46 + i * 12, '#3a2a20', { outline: false }); E.font.text(g, String(v), x0 + w - 80, 46 + i * 12, '#1a1418', { align: 'right', outline: false }); });
        E.font.text(g, 'SCORE ' + Math.round(this.fake.total * Math.min(1, this.t / 1.5)), x0 + 16, 100, '#1a1418', { outline: false, scale: 2 });
        if (this.t > 2) { const sx = x0 + w - 50, sy = 70; px.rect(g, sx - 22, sy - 22, 44, 44, '#c8302a'); px.rect(g, sx - 19, sy - 19, 38, 38, '#f4ead5'); px.rect(g, sx - 17, sy - 17, 34, 34, '#c8302a'); E.font.text(g, 'GRAND', sx, sy - 8, '#f4ead5', { align: 'center', outline: false }); E.font.text(g, 'KAISEKI', sx, sy + 2, '#f4ead5', { align: 'center', outline: false }); }
        if (this.t > 3.2) { px.rect(g, 0, 0, r.W, r.H, '#05060f'); E.font.title(g, 'BENTOU 2', r.W / 2, Math.round(r.H * .35), { align: 'center', scale: 4, colors: ['#fff4d8', '#e8b04a', '#d8402a', '#8a1c1c'], depth: 3 }); E.font.text(g, 'Birth of the Lunchbox Assassins', r.W / 2, Math.round(r.H * .35) + 36, '#f4ead5', { align: 'center', outline: false }); }
      }
      E.font.title(g, 'BENTOU 2', 6, 6, { scale: 1, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      E.font.text(g, 'DEMO PLAY', r.W - 6, 26, '#e8b04a', { align: 'right', outline: false, shadow: '#000' });
      if (!V.report) E.font.text(g, V.name.toUpperCase(), r.W - 6, 36, '#b8a890', { align: 'right', outline: false, shadow: '#000' });
      if (Math.floor(B.game.real * 2) % 2 === 0) B.rich(g, B.touchOnly ? 'TAP TO RETURN' : 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#f4ead5', { align: 'center' });
    });
  }
};

/* ---- 82-hub ---- */
/* 82-hub: AI Hub ghost mode (1-4 players, each in their own copy of "Night Delivery"; the others appear as shadow
 * ninja in their seat colors) with the game's own card, progress every second, one result, time-up and end; and its
 * standalone twin, the Shadow Trial, where your best run's ghost (a 10 Hz track) races you, with a local top-5 board. */
const SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
B.hub = { info: null, card: null, ended: false, sentResult: false, standings: null, names: [] };
B.trialScore = M => {
  const s = M.stats, tgt = !!Object.keys(M.flags).find(k => k.startsWith('target_')), esc = M.result === 'win';
  let sc = (tgt ? 2000 : 0) + (esc ? 1000 : 0) + 250 * s.silentCuts + 50 * Math.max(0, s.kills - s.silentCuts) - 500 * s.civiliansHarmed;
  sc += s.detections === 0 ? (esc ? 600 : 0) : -150 * s.detections;
  if (esc) sc += Math.min(1200, Math.max(0, Math.round(4 * (300 - M.t))));
  return Math.max(0, Math.round(sc));
};
const stateCode = h => h.dead ? 6 : h.action && h.action.name === 'silentCut' ? 5 : h.combo.busy ? 4 : h.dive ? 3 : h.swim ? 2 : h.crouch ? 1 : 0;
B.hubMissionStart = (M, d) => {
  M.ghosts = []; M.track = []; M.trackT = 0; M.sendT = 0; M.progT = 0; M.hubClock = 0;
  if (M.mode === 'trial') { const bd = B.trialBoard(); if (bd.ghost && bd.ghost.track && bd.ghost.track.length) M.ghosts.push({ id: 'best', track: bd.ghost.track, x: 0, y: 0, z: 0, f: 0, vis: true, color: '#f4f4f4', rig: B.RIGS.ghost('#f4f4f4'), replay: true }); }
  if (M.mode === 'hub') { B.hub.M = M; for (const gh of B.hub.pending || []) B.hubGhostMsg(gh[0], gh[1]); B.hub.pending = []; }
};
B.hubPlaying = M => { if (M.mode !== 'hub') return true; const AH = typeof window !== 'undefined' && window.AIHub; if (!AH || !AH.active) return true; return AH.time() >= 0 && !B.hub.ended; };
B.hubWait = (M, dt) => { const h = M.hero; if (h) h.rig.update(dt, h.rigState({})); B.game.focus(h.x, h.y, h.z + 18); for (const gh of M.ghosts) gh.rig.update(dt, { x: gh.x, y: gh.y, z: gh.z, vx: 0, vy: 0, facing: gh.f }); };
B.hubDrawWait = (r, M) => r.overlay(g => {
  const t = window.AIHub ? window.AIHub.time() : -Infinity, n = t === -Infinity ? null : Math.ceil(-t / 1000);
  if (B.hub.ended) return; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000'));
  if (n !== null && n > 0) E.font.title(g, String(n), r.W / 2, Math.round(r.H * .35), { align: 'center', scale: 6, colors: ['#fff4d8', '#e8b04a', '#d8402a'], depth: 3 });
  else E.font.text(g, 'Waiting for the round...', r.W / 2, Math.round(r.H * .4), '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
});
B.hubTick = (M, dt) => {
  const h = M.hero, AH = window.AIHub;
  if (M.mode === 'hub' && AH) M.hubClock = Math.max(0, AH.time() / 1000);
  // the ghost track (10 Hz): sent in a hub round, recorded in the trial
  M.sendT += dt; if (M.sendT >= .1) { M.sendT = 0; const msg = { t: 'g', a: 'delivery', x: Math.round(h.x), y: Math.round(h.y), z: Math.round(h.z), f: Math.round(h.facing * 100) / 100, s: stateCode(h), k: M.stats.kills };
    if (M.mode === 'hub' && AH && !B.hub.ended) AH.send(msg, { reliable: false }); else M.track.push([msg.x, msg.y, msg.z, msg.f, msg.s]); }
  if (M.mode === 'hub' && AH && !B.hub.ended && !B.hub.sentResult) { M.progT += dt; if (M.progT >= 1) { M.progT = 0; AH.progress({ score: B.trialScore(M), label: B.hubLabel(M) }); } }
  // ghosts: interpolate toward their latest sample, or replay the recorded track
  for (const gh of M.ghosts) {
    if (gh.replay) { const i = Math.min(gh.track.length - 1, Math.floor(M.t * 10)), p = gh.track[i]; if (p) { gh.tx = p[0]; gh.ty = p[1]; gh.tz = p[2]; gh.f = p[3]; gh.s = p[4]; } }
    const k = 1 - Math.pow(.002, dt); gh.x += ((gh.tx || gh.x) - gh.x) * k; gh.y += ((gh.ty || gh.y) - gh.y) * k; gh.z += ((gh.tz || gh.z) - gh.z) * k;
    gh.rig.update(dt, { x: gh.x, y: gh.y, z: gh.z, vx: ((gh.tx || gh.x) - gh.x) * 8, vy: ((gh.ty || gh.y) - gh.y) * 8, facing: gh.f || 0, crouch: gh.s === 1, down: gh.s === 6 ? 1 : gh.s === 2 || gh.s === 3 ? .6 : 0, attack: gh.s === 4 || gh.s === 5 ? E.move('slash', (M.t * 3) % 1) : null });
  }
};
B.hubLabel = M => { const s = M.stats; if (M.result === 'win') return 'Escaped ' + B.fmtTime(M.t); if (Object.keys(M.flags).some(k => k.startsWith('target_'))) return 'Target down'; return 'Cuts ' + s.silentCuts + (s.detections ? ' · Seen ' + s.detections : ' · Unseen'); };
B.hubAwards = M => { const s = M.stats, out = []; if (s.detections === 0) out.push({ title: 'Ghost of the Moon', detail: 'Never detected' }); if (s.silentCuts >= 5) out.push({ title: 'Silent Blade', detail: s.silentCuts + ' Silent Cuts' }); if (s.kills <= 1 && M.result === 'win') out.push({ title: 'Fed by All', detail: 'No kills but the target' }); return out.slice(0, 3); };
B.hubResult = M => {
  const AH = window.AIHub; if (!AH || B.hub.sentResult) return; B.hub.sentResult = true;
  const sc = B.trialScore(M), rank = B.rankOf(sc * .9);
  AH.result({ score: sc, stats: { 'Silent cuts': M.stats.silentCuts, Detected: M.stats.detections, Time: B.fmtTime(M.t), Rank: rank }, awards: B.hubAwards(M) });
  AH.send({ t: 'done', score: sc }, { reliable: true });
};
B.hubFinish = M => {
  if (M.mode === 'hub') { B.hubResult(M); return; }
  // the Shadow Trial: the board and the best ghost
  const sc = B.trialScore(M), bd = B.trialBoard(), entry = { score: sc, rank: B.rankOf(sc * .9), character: get('character', M.charId).name || 'Sojiro', date: new Date().toISOString().slice(0, 10), escaped: M.result === 'win' };
  bd.top.push(entry); bd.top.sort((a, b) => b.score - a.score); bd.top = bd.top.slice(0, 5);
  if (M.result === 'win' && (!bd.ghost || sc > bd.ghost.score)) bd.ghost = { score: sc, track: M.track.slice(0, 3600) };
  E.store.set('bentou:trial', bd); B.game.go('trialBoard', { entry, M, d: M.scene.d });
};
B.hubGhostMsg = (data, from) => {
  const M = B.hub.M; if (!M || !data) return;
  let gh = M.ghosts.find(q => q.id === from);
  if (data.t === 'g') {
    if (!gh) { const info = B.hub.info, p = info && info.players.find(q => q.id === from), col = p ? p.color || SEAT[from % 4] : SEAT[from % 4]; gh = { id: from, x: data.x, y: data.y, z: data.z, f: data.f, vis: true, color: col, rig: B.RIGS.ghost(col), name: p ? p.name : 'P' + (from + 1) }; M.ghosts.push(gh); }
    gh.tx = data.x; gh.ty = data.y; gh.tz = data.z; gh.f = data.f; gh.s = data.s; gh.vis = data.a === 'delivery';
  } else if (data.t === 'done' && gh) gh.done = data.score;
};
B.hubDraw = (r, M) => {
  r.overlay(g => {
    if (B.hub.ended) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000')); E.font.title(g, 'ROUND OVER', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 3, colors: ['#fff4d8', '#e8b04a'], depth: 2 }); }
    else if (M.mode === 'trial' && M.ghosts.length) E.font.text(g, 'Your best run races you (white)', r.W / 2, r.H - 8, '#c8c8c8', { align: 'center', outline: false, font: 'tiny' });
  });
  B.hubNames(r, M);
};
/* names over the ghosts, and the standings at the end, in DOM (textContent only) */
B.hubNames = (r, M) => {
  if (HEADLESS || M.mode !== 'hub') return; const root = B.hub.dom || (B.hub.dom = (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:15;font:600 13px system-ui;color:#fff;text-shadow:0 1px 2px #000'; document.body.appendChild(d); return d; })());
  const want = B.hub.ended ? [] : M.ghosts.filter(gh => gh.vis && gh.name);
  while (root.children.length < want.length + 1) root.appendChild(document.createElement('div'));
  [...root.children].forEach((el, i) => { const gh = want[i]; if (i === root.children.length - 1 && B.hub.ended && B.hub.standings) { el.style.cssText = 'position:absolute;left:50%;top:38%;transform:translateX(-50%);font:600 20px system-ui;text-align:center;white-space:pre'; el.textContent = B.hub.standings; return; } if (!gh) { el.textContent = ''; return; } const s = r.w(gh.x, gh.y, gh.z + 50); el.style.cssText = 'position:absolute;transform:translate(-50%,-100%);color:' + gh.color + ';left:' + (s[0] / r.W * 100) + 'vw;top:' + (s[1] / r.H * 100) + 'vh'; el.textContent = gh.name; });
};
/* ---- the hub's card: the rooftop at night, the players lined up in seat colors, ready ticks, the goal, the controls ---- */
const cardRigs = [0, 1, 2, 3].map(i => B.RIGS.ghost(SEAT[i]));
B.scenes.hubCard = Object.assign({}, MENU_SCENE, {
  enter() { this.t = 0; B.game.follow(null); B.game.lights.enabled = false; B.game.weather = null; B.music.play('title'); this.dom = null; },
  exit() { if (this.dom) { this.dom.remove(); this.dom = null; } },
  update(dt) {
    const G = B.game, I = G.input, AH = window.AIHub; this.t += dt;
    if (AH && B.hub.info) { if (I.pressed('start') || I.pressed('jump') || I.pressed('confirm')) AH.answer('ready'); if (I.pressed('interact') || I.pressed('objectives')) AH.answer('more'); }
    const n = B.hub.info ? B.hub.info.players.length : 1;
    for (let i = 0; i < n; i++) cardRigs[i].update(dt, { x: MIDX - (n - 1) * 18 + i * 36, y: 0, z: 32, vx: 0, vy: 0, facing: i % 2 ? Math.PI : 0, stance: (this.card() || {}).ready && this.card().ready.includes(i) ? 'ready' : null });
    G.focus(MIDX, 0, 32 + (G.H / 2 - 46) / -G.view.bz);
  },
  card() { return B.hub.card; },
  draw(r) {
    titleBg.draw(r); ridge.draw(r); const info = B.hub.info, n = info ? info.players.length : 1;
    for (let i = 0; i < n; i++) r.actor(cardRigs[i].x, 0, 32, (g, ox, oy) => cardRigs[i].draw(g, ox, oy, r.view));
    const c = this.card() || {};
    r.overlay(g => {
      E.font.title(g, 'BENTOU 2', r.W / 2, 10, { align: 'center', scale: 3, colors: ['#fff4d8', '#e8b04a', '#d8402a'], depth: 2 });
      E.font.text(g, 'NIGHT DELIVERY  -  ghost race, 1 to 4 ninja', r.W / 2, 38, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silence Broker Sakubei, escape by the canal gate.', r.W / 2, 50, '#e8b04a', { align: 'center', outline: false, shadow: '#000' });
      E.font.text(g, 'Silent Cuts, unseen and fast score most.', r.W / 2, 60, '#c8b8a0', { align: 'center', outline: false, shadow: '#000' });
      B.rich(g, '{a:jump} jump  {a:crouch} crouch  {a:attack} strike / cut  {a:grapple} hook  {a:useTool} tool  {a:block} block', r.W / 2, 74, '#f4ead5', { align: 'center' });
      const left = c.left === null || c.left === undefined ? (c.paused ? 'Paused: more time asked' : c.starting ? 'Starting...' : '') : Math.ceil(c.left / 1000) + ' s';
      E.font.text(g, left, r.W / 2, 90, '#f4ead5', { align: 'center', outline: false, shadow: '#000', scale: 2 });
      B.rich(g, '{a:confirm} Ready      {a:interact} or M: more time' + (c.asked ? ' (asked)' : ''), r.W / 2, r.H - 16, '#b8a890', { align: 'center' });
    });
    if (!HEADLESS && info) {
      if (!this.dom) { this.dom = document.createElement('div'); this.dom.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:15;font:600 16px system-ui;text-shadow:0 1px 2px #000'; document.body.appendChild(this.dom); }
      while (this.dom.children.length < n) this.dom.appendChild(document.createElement('div'));
      [...this.dom.children].forEach((el, i) => { const p = info.players[i]; if (!p) { el.textContent = ''; return; } const s = r.w(cardRigs[i].x, 0, 32 - 6); el.style.cssText = 'position:absolute;transform:translate(-50%,0);color:' + (p.color || SEAT[i]) + ';left:' + (s[0] / r.W * 100) + 'vw;top:' + (s[1] / r.H * 100) + 'vh'; el.textContent = p.name + ((c.ready || []).includes(p.id) ? ' ✓' : ''); });
    }
  }
});
B.hubBoot = () => {
  const AH = window.AIHub, G = B.game;
  AH.on('card', c => { B.hub.card = c; });
  AH.on('start', () => { const info = B.hub.info, me = info ? info.me : 0; G.go('mission', { mode: 'hub', missionId: 'delivery', levelId: 'delivery', character: me % 2 ? 'kaede' : 'sojiro', loadout: get('mission', 'delivery').loadoutHint }, { fade: 0 }); });
  AH.on('message', (data, from) => { if (B.hub.M && G.sceneName === 'mission') B.hubGhostMsg(data, from); else (B.hub.pending = B.hub.pending || []).push([data, from]); });
  AH.on('leave', ({ id }) => { const M = B.hub.M; if (M) M.ghosts = M.ghosts.filter(q => q.id !== id); });
  AH.on('time-up', () => { const M = B.hub.M; if (M) B.hubResult(M); else { B.hub.sentResult = true; AH.result({ score: 0 }); } });
  AH.on('end', e => { B.hub.ended = true; A.music(null); A.mute(true); G.input.clear(); const info = B.hub.info; if (e && e.standings && info) B.hub.standings = 'Round over\n' + e.standings.map((grp, i) => (i + 1) + '. ' + grp.map(id => (info.players.find(p => p.id === id) || { name: 'P' + (id + 1) }).name).join(', ')).join('\n'); else B.hub.standings = 'Round over'; });
  G.go('hubCard', {}, { fade: 0 });
  AH.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(info => {
    if (!info) { B.HUB = false; G.o.menu.quit = 'title'; G.go('title'); return; }
    B.hub.info = info; AH.ready();
  }).catch(e => { try { AH.fail('The game could not start: ' + (e && e.message || e)); } catch (err) { G.fail('hub', err); } });
};
/* ---- the Shadow Trial's board ---- */
B.scenes.trialBoard = Object.assign({}, MENU_SCENE, {
  enter(d) { this.d = d; this.t = 0; B.music.play('results'); this.menu = new E.Menu(B.game, ['Run again', 'Title'], { y: 0, onPick: i => i ? B.game.go('title') : B.game.go('mission', this.d.d) }); },
  update(dt) { this.t += dt; if (this.t > 1) this.menu.update(dt); },
  draw(r) {
    r.sky(['#05060f', '#141838', '#2a2450']);
    r.overlay(g => {
      E.font.title(g, 'SHADOW TRIAL', r.W / 2, 10, { align: 'center', scale: 2, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      const e = this.d.entry; E.font.text(g, (e.escaped ? 'Escaped' : 'Fallen') + '   score ' + e.score + '   ' + e.rank, r.W / 2, 34, '#f4ead5', { align: 'center', outline: false });
      const bd = B.trialBoard(); bd.top.forEach((q, i) => { const y = 56 + i * 14, me = q === e || (q.score === e.score && q.date === e.date); E.font.text(g, (i + 1) + '.  ' + q.score + '   ' + q.rank + '   ' + q.character + '   ' + q.date, r.W / 2, y, me ? '#e8b04a' : '#c8b8a0', { align: 'center', outline: false }); });
    });
    this.menu.y = r.H - 40; if (this.t > 1) this.menu.draw(r);
  }
});

/* ---- 90-main ---- */
/* 90-main: the boot (heavy setup in steps behind the boot screen), the debug handle the tests and tools read, the
 * About pages, and the start: the hub's card in an AI Hub session, else the title. */
B.ABOUT = {
  source: [['Date', '2026-11-03 18:34:20'], ['Source', 'Tenchu 2: Birth of the Stealth Assassins (Acquire / Activision, PlayStation, 2000)'], ['Plan', 'PLAN.md'],
    ['Genre and Perspective', 'Third-person ninja stealth-action with melee combat and boss duels; isometric third person (rotatable in 45-degree steps, zoomable), with a high three-quarter camera option'],
    ['Tech', 'my-3D2dge v0.85.2 handoff engine (nine small patches), AI Hub session client 1.4.0 (unmodified), vanilla JavaScript in one HTML file; Node 24 + Playwright Chromium for tests'],
    ['Art Direction', 'The engine\'s native PS1-era pixel art (320x240 expanded), HD Humanoid rigs with new masks, hats and weapons, canvas lighting, Japanese props and materials written as shape data'],
    ['Animation', 'The engine\'s procedural rigs and E.ACTIONS, with new paired Silent Cut choreographies (5 kinds x 2 characters), grapple, riposte, ninja run, wall hug, swimming, eating and a quadruped hound'],
    ['Audio', 'The engine\'s chip synth: layered Japanese-scale music (koto, shamisen, shakuhachi, fue, taiko), code-made effects, and a formant gibberish voice synth for every line'],
    ['Online', 'AI Hub Session Protocol v1, ghost mode, 1-4 players (the game\'s own card); offline: the Shadow Trial against your own best ghost'],
    ['Testing', "Headless node:vm suites driving game.advance and game.debug behind one command (failures only, one-line count): mechanics, all four missions completed through their objectives with the autopilot fighting each boss, menus/story flow/ending, attract mode (3 loops), Dev Mode, the Workshop, a mock AI Hub, determinism; Playwright checks of the bundle, a TASK.md audit with a simulated DualSense, keyboard and mouse, and the real AI Hub harness (2 players, 4 players on a lossy network, host leaving). 165 checks pass."],
    ['Research', 'The engine handoff docs and the AI Hub README; the planner\'s research (Wikipedia on Tenchu 2) carried in PLAN.md'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'], ['Model', 'Anthropic, claude-opus-5-5, reasoning effort medium'], ['Usage', 'unknown']],
  testing: ["About 12 real issues, all fixed: guards squared the hero's exposure (they barely noticed anyone); the cut-from-above check never fired from a roof edge; diving was impossible (the engine's Mover overwrote the crouch toggle); guards and bait-eaters got stuck on solid props; a held button didn't count against the attract idle clock; debug teleports left the camera behind under slow motion; after using a gamepad the mouse never took over again (Workshop painting failed); quick key taps were missed by the Workshop; the mouse wheel was ignored mid-attack; plus test-setup issues (rice bales in a path, a hound that smelled the tester, Python buffering the harness server's port).", "3 were game-breaking: no diving (an Undertow and the dive under archers impossible), guards stuck on props (baits and some patrols broken), and the squared exposure (stealth had no tension).", "The missions suite: it completes the Trial, Rice and Ash, Kiri Lake and Moon over Kokaku through their real objectives (cuts, holds, the escort, the timer) with the autopilot fighting each boss, and it found the stuck-on-props bug.", "The headless smoke test of wandering input: it passed at once, because headless runs skip all drawing; only browser screenshots exercised the draw code."],
  engine: ["The breadth that is already there and works headless: E.Mover parkour, E.sees / E.Suspicion / E.hears, paired E.ACTIONS, the Shell with its standard pause, settings and rebinding, fixed-step game.advance for exact tests, and Humanoid rigs that look good with very little code.", "Yes, a few times: an intent's crouch is a state, not a toggle (it silently undid my toggle); flow fields don't see map.solid props; E.sees already multiplies the target's exposure (I multiplied it again); a single-step scripted press can be lost during hit-stop; and the custom input map must restate the menu keys.", "The stealth layer on top: Shadow Sight and the Ki gauge, light maps baked with line of sight, the guard state machine (bait, bodies, bells, reinforcements), Silent Cut detection and choreographies, bosses with telegraphs, and the mission runtime with checkpoints.", "Knowing what already exists in a 1.2 MB engine: the index is good, but behaviour details (what an intent field means, which systems respect props) are only in the source.", "Nine small patches, listed in engine/PATCHES.md: PlayStation glyphs in the pixel font; PlayStation/Xbox button symbols; masks, jingasa/kabuto hats, spear, bow, club, offhand blades and sashimono on the Humanoid; settings rows on custom Shell screens; hover moves focus; a 10-foot UI scale; plucked music envelopes; a voice bus; and a pause guard for the hub's Create + Options.", "Make FlowField respect map.solid shapes (or offer a nav option for them), so AI never walks into props."],
  prompt: ["It is concrete about the player: a TV at 10 feet, PlayStation glyphs with an Xbox option, attract mode, touch-only handling, dev sliders, and the hub; together with the detailed plan it left little to guess.", "The bracketed file name pattern [GameTitle-SOURCE-...] versus the plan's own name (it was written for a max-effort run), and how 'every feature' should be weighed between TASK.md and a plan far larger than a single session.", "Scope: a full stealth game, four bosses, an escort, a mission editor, attract mode, hub multiplayer and a dev mode in one session, while keeping everything tested and stubs-free.", "Say which plan items are must-haves versus stretch, and give the expected session budget; also note the /tmp space limit in TASK.md itself."]
};
B.ABOUT_PAGES = () => [
  ['Bentou 2: Birth of the Lunchbox Assassins', 'An original isometric ninja stealth-action game inspired by Tenchu 2: Birth of the Stealth Assassins (Acquire / Activision, 2000). Not affiliated.\n\nHow to play: stay in shadow and grass, crouch to sneak, and strike unseen for a Silent Cut. Watch the Ki Gauge: the number is how near a guard is, the color how aware. Pack your bento with tools before every mission, and leave by the way the night allows.'],
  ['Source Information', B.ABOUT.source.map(([k, v]) => k + ': ' + v).join('\n')],
  ['Testing Feedback', B.ABOUT.testing.map((t, i) => (i + 1) + '. ' + t).join('\n\n') || 'unknown'],
  ['Engine Feedback', B.ABOUT.engine.map((t, i) => (i + 1) + '. ' + t).join('\n\n') || 'unknown'],
  ['Prompt Feedback', B.ABOUT.prompt.map((t, i) => (i + 1) + '. ' + t).join('\n\n') || 'unknown'],
  ['Credits', 'Built by Claude (Anthropic claude-opus-5-5, medium effort) in Claude Code, from PLAN.md.\nEngine: my-3D2dge v0.85.2 (michaelcrosato/my-3d2dge), with patches: PlayStation glyphs in the pixel font; PlayStation / Xbox button symbols; masks, jingasa and kabuto hats, yari, bow, kanabo, offhand blades and sashimono on the Humanoid; settings rows on custom Shell screens; hover moves the focus; a 10-foot interface scale; plucked music envelopes; a voice bus; the hub\'s Create + Options guard.\nAI Hub Session Protocol v1, client 1.4.0 (unmodified).\nAll art, music, sound and voices are generated in code.']
];
B.debugApi = {
  snapshot() {
    const G = B.game, M = B.mission, h = M && M.hero;
    return { scene: G.sceneName, mode: M ? M.mode : null, mission: M ? M.missionId : null, t: M ? +M.t.toFixed(2) : 0,
      hero: h ? { x: +h.x.toFixed(1), y: +h.y.toFixed(1), z: +h.z.toFixed(1), hp: +h.hp.toFixed(1), crouch: !!h.crouch, swim: !!h.swim, dive: !!h.dive, breath: +h.breath.toFixed(2), stamina: Math.round(h.stamina), hug: !!h.hug, drag: !!h.drag, action: h.action ? h.action.name : null, tool: (B.Bento.cur(M) || {}).tool || null } : null,
      guards: M ? M.guards.map(g => ({ id: g.id, type: g.type, x: Math.round(g.x), y: Math.round(g.y), z: Math.round(g.z), state: g.mind.state, level: +g.mind.level.toFixed(2), alive: g.alive, vis: g.vis, asleep: !!g.asleep })) : [],
      ki: M ? M.ki : 0, light: M && h ? +M.world.lightAt(h.x, h.y).toFixed(2) : 0, exposure: h ? +h.exposure.toFixed(2) : 0, stats: M ? M.stats : null,
      objectives: M ? Object.fromEntries(M.objectives.map(o => [o.id, o.state])) : {}, score: M ? M.score().total : 0, rank: M ? M.score().rank : null, over: M ? M.over : false, result: M ? M.result : null,
      boss: M && M.bosses[0] ? { id: M.bosses[0].bossId, hp: Math.round(M.bosses[0].hp), phase: M.bosses[0].phase, active: M.bosses[0].active, alive: M.bosses[0].alive } : null,
      escort: M && M.escort ? { hp: M.escort.hp, freed: M.escort.freed, x: Math.round(M.escort.x), y: Math.round(M.escort.y) } : null, timer: M && M.timer ? Math.round(M.timer.left) : null, flags: M ? M.flags : {},
      attract: G.sceneName === 'attract' ? { vignette: B.scenes.attract.vi, loops: B.scenes.attract.loops } : null, save: B.save.data };
  },
  teleport(x, y, z, f) { const h = B.mission.hero; Object.assign(h, { x, y, z: z || 0, vx: 0, vy: 0, vz: 0, action: null, onGround: true }); if (f !== undefined) h.facing = f; B.game.cam.snap = true; },
  cell(cx, cy) { return B.mission.world.ch(cx, cy); },
  load(id, o = {}) { B.game.go('mission', Object.assign({ missionId: id, levelId: (get('mission', id) || { level: id }).level, mode: 'missions', character: 'sojiro' }, o), { fade: 0 }); B.game.advance(1 / 60); return B.mission; },
  go(scene, data) { B.game.go(scene, data, { fade: 0 }); B.game.advance(1 / 60); },
  tune(k, v) { B.game.settings.set(k, v); }, resetTune() { B.game.settings.reset('Dev'); },
  cheat(name, on = true) { B.mission.cheats[name] = on; }, give(tool, n) { return B.Bento.add(B.mission, tool, n); },
  kill(id) { const g = B.mission.guards.find(q => q.id === id); if (g && g.alive) { g.alive = false; B.mission.kill(g, 'dev'); } },
  alert(id) { for (const g of B.mission.guards) if (id === 'all' || g.id === id) { g.mind.level = 1.2; g.mind.last = { x: B.mission.hero.x, y: B.mission.hero.y, z: 0 }; } },
  calm() { for (const g of B.mission.guards) g.mind.reset(); },
  complete(objId) { const ob = B.mission.objectives.find(o => o.id === objId); if (ob) B.mission.completeObj(ob); },
  win(rank) { B.mission.forceRank = rank || null; B.mission.complete(); }, fail() { B.mission.fail('test'); },
  autopilot(beats) { B.Autopilot.start(B.mission, beats); B.mission.auto = true; },
  hash() { const s = JSON.stringify(this.snapshot()); return hashStr(s); }
};
game.debug = B.debugApi;
if (typeof window !== 'undefined') window.__BENTOU = { B, E, game };
const BOOT = [['Folding two-tier boxes', () => { for (const id of ['training', 'm1']) get('level', id); }], ['Steaming the rice', () => { B.save.data = null; if (!B.HUB) B.loadLatest(); }], ['Sharpening the kodachi', () => { B.titleRigs = [B.RIGS.sojiro(), B.RIGS.kaede()]; }]];
const startScene = B.HUB ? 'hubCard' : (typeof location !== 'undefined' && /^#(title|attract|mission|workshop)/.test(location.hash) ? location.hash.slice(1).split('/')[0] : 'title');
game.start({ scenes: B.scenes, scene: startScene === 'mission' ? 'title' : startScene, boot: { title: 'BENTOU 2', version: B.VERSION, steps: BOOT, messages: ['Pouring the sake', 'Hushing the koi', 'Counting the lanterns'] } });
if (B.HUB) { try { B.hubBoot(); } catch (e) { try { window.AIHub.fail('Bentou 2 could not start: ' + e.message); } catch (er) { game.fail('hub', er); } } }
else if (typeof location !== 'undefined' && /^#mission\//.test(location.hash)) { const id = location.hash.split('/')[1]; B.save.data = B.save.data || B.freshSave(); game.go('mission', { missionId: id, levelId: (get('mission', id) || { level: id }).level, mode: 'missions', character: 'sojiro' }, { fade: 0 }); }

})();
