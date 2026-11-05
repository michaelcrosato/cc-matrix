(() => {
"use strict";
// ---- 01-core.js ----
// ============================================================================================================
// REWIRED • 01 core: the game object, input map, settings (axis inversion, glyphs), sound, music, voices,
// shared drawing helpers (key badges, panels), the case state and saves.
// ============================================================================================================
const E = My3D2dge, { px, clamp, lerp } = E;
const WIN = typeof window !== 'undefined' ? window : null;
const HAS_DOM = !!(WIN && typeof document !== 'undefined' && document.getElementById);
const HUB = WIN && WIN.AIHub ? WIN.AIHub : null;
const IN_HUB = !!(HUB && HUB.active);
const TITLE = 'REWIRED';
const VERSION = '1.0.0';

// ---- touch-only detection: a phone or tablet with no keyboard, mouse or pad gets the "required" notice ---------
const DEV = { touchOnly: false, sawKeys: false, sawPad: false };
if (HAS_DOM) {
  try {
    const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches, hover = matchMedia('(any-hover: hover)').matches;
    DEV.touchOnly = (navigator.maxTouchPoints || 0) > 0 && coarse && !fine && !hover;
  } catch (e) { DEV.touchOnly = false; }
  addEventListener('keydown', () => { DEV.sawKeys = true; DEV.touchOnly = false; }, true);
  addEventListener('gamepadconnected', () => { DEV.sawPad = true; DEV.touchOnly = false; });
  if (/[?&]touchonly=1/.test(location.search)) DEV.touchOnly = true;   // (testing the notice on a desktop)
}

// ---- gamepad axis inversion (some pads report sticks flipped): wraps what the browser reports, before the engine reads it
const INV = { x: false, y: false };
if (HAS_DOM && navigator.getGamepads) {
  const orig = navigator.getGamepads.bind(navigator);
  const wrap = p => {
    if (!p) return p;
    const ax = Array.from(p.axes);
    if (INV.x) { ax[0] = -ax[0]; if (ax.length > 2) ax[2] = -ax[2]; }
    if (INV.y) { ax[1] = -ax[1]; if (ax.length > 3) ax[3] = -ax[3]; }
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes: ax, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => { const l = orig(); return (INV.x || INV.y) ? Array.from(l, wrap) : l; } }); } catch (e) { /* the browser keeps its own */ }
}

// ---- the keys PC players expect for third-person stealth; a DualSense's layout --------------------------------
const D = E.Input.DEFAULT;
const INPUT = {
  up: D.up, down: D.down, left: D.left, right: D.right,
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad10', 'Pad5'],
  crouch: ['KeyC', 'ControlLeft', 'Pad1'],
  interact: ['KeyE', 'KeyF', 'Pad0'],
  act2: ['KeyR', 'Space', 'Pad2'],
  aim: ['Mouse2', 'KeyQ', 'Pad6'],
  shoot: ['Mouse0', 'Pad7'],
  notes: ['Tab', 'KeyM', 'Pad8'],
  view: ['KeyV', 'Pad3'],
  d1: ['Digit1', 'Numpad1'], d2: ['Digit2', 'Numpad2'], d3: ['Digit3', 'Numpad3'], d4: ['Digit4', 'Numpad4'], d5: ['Digit5', 'Numpad5'],
  d6: ['Digit6', 'Numpad6'], d7: ['Digit7', 'Numpad7'], d8: ['Digit8', 'Numpad8'], d9: ['Digit9', 'Numpad9'], d0: ['Digit0', 'Numpad0'],
  start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel
};
const DIGIT_ACTS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'];
const CONTROL_NAMES = { sprint: 'Sprint', crouch: 'Crouch • blend in', interact: 'Interact • tag a line', act2: 'Tackle • minimize', aim: 'Raise the camera',
  shoot: 'Take the photo', notes: 'Case notes', view: 'Change the view' };
for (const k of DIGIT_ACTS) CONTROL_NAMES[k] = false;

const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], input: INPUT,
  menu: { controls: CONTROL_NAMES, quit: IN_HUB ? false : 'title', items: IN_HUB ? [] : [['Case notes', () => { game.resume && game.resume(); NOTES.open = true; }]] } });
const I = game.input;

// ---- settings of the game's own: axis inversion, glyph family, hints, subtitles size ---------------------------
function defineSettings() {
  const S = game.settings;
  if (!S || !S.define) return;
  S.define({ key: 'invertX', label: 'Invert stick left and right', type: 'toggle', value: false, group: 'Controller', help: 'For pads that report the sticks flipped sideways', apply: (g, v) => { INV.x = !!v; } });
  S.define({ key: 'invertMoveY', label: 'Invert stick up and down', type: 'toggle', value: false, group: 'Controller', help: 'For pads that report the sticks flipped up and down', apply: (g, v) => { INV.y = !!v; } });
  S.define({ key: 'hints', label: 'Objective markers', type: 'toggle', value: true, group: 'Game' });
  S.define({ key: 'cones', label: 'Show lookout sight', type: 'toggle', value: true, group: 'Game', help: 'Draw what the corner boys can see' });
  S.define({ key: 'textSpeed', label: 'Dialog speed', type: 'select', value: 'normal', options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']], group: 'Game' });
  // PlayStation symbols by default (a Settings switch shows Xbox's A B X Y): the engine's own Button symbols setting
  if (E.store.get('rewired-glyphs-set', false) !== true) { try { S.set('glyphs', 'playstation'); } catch (e) {} E.store.set('rewired-glyphs-set', true); }
}
defineSettings();
const setting = (k, d) => { const v = game.settings ? game.settings[k] : undefined; return v === undefined ? d : v; };

// ---- sound: custom effects, a code-written score, gibberish voices --------------------------------------------
const A = game.audio;
A.define('shutter', [{ wave: 'noise', freq: 2000, dur: .04, vol: .35 }, { wave: 'square', freq: 1800, to: 900, dur: .03, vol: .12 }]);
A.define('wind', { wave: 'noise', freq: 600, dur: .12, vol: .1 });
A.define('whistle', { wave: 'sine', freq: 1700, to: 2300, dur: .25, vol: .2, vib: [10, .02] });
A.define('ring', { wave: 'square', freq: 880, dur: .5, vol: .1, arp: [0, 3], step: .04 });
A.define('click', { wave: 'square', freq: 300, dur: .02, vol: .15 });
A.define('pager', { wave: 'square', freq: 2400, dur: .3, vol: .1, arp: [0, 0, 12], step: .08 });
A.define('pin', [{ wave: 'noise', freq: 900, dur: .03, vol: .2 }, { wave: 'triangle', freq: 220, to: 120, dur: .06, vol: .2 }]);
A.define('wrong', { wave: 'saw', freq: 160, to: 90, dur: .2, vol: .18 });
A.define('siren', { wave: 'saw', freq: 600, to: 900, dur: .6, vol: .08, vib: [3, .2] });
A.define('cuffs', [{ wave: 'noise', freq: 3000, dur: .05, vol: .25 }, { wave: 'square', freq: 1200, dur: .03, vol: .1 }]);
A.define('car', { wave: 'saw', freq: 55, to: 80, dur: .5, vol: .15 });
A.define('door2', { wave: 'noise', freq: 200, to: 60, dur: .25, vol: .3 });
A.define('ram', [{ wave: 'noise', freq: 120, dur: .3, vol: .45 }, { wave: 'square', freq: 70, to: 40, dur: .2, vol: .3 }]);
A.define('tape', { wave: 'triangle', freq: 120, to: 135, dur: .4, vol: .05 });

// songs: original, code-written. A slow blues for the title, a boom-bap for the corner, a tense loop for the wire.
const SONGS = {
  title: { bpm: 72, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'E2 . E2 G2 | A2 . A2 G2 | E2 . E2 G2 | B1 . D2 . | E2 . E2 G2 | A2 . A2 C3 | B2 . A2 G2 | E2 . . . ' },
    { wave: 'pulse', vol: .07, notes: '. . B3 - | . . C4 - | . . B3 - | . . A3 - | . . G3 B3 | . . C4 E4 | D4 - B3 - | E3 - - - ' },
    { wave: 'saw', vol: .035, notes: 'E4 - - - | . . . . | G4 - E4 - | D4 - B3 - | E4 - G4 A4 | B4 - A4 G4 | E4 - D4 - | E4 - - - ' },
    { wave: 'drums', vol: .25, notes: 'k . h s | k k h s | k . h s | k . s s | k . h s | k k h s | k . h s | k . s o ' } ] },
  street: { bpm: 88, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'D2 . . D2 | . . F2 . | G2 . . G2 | . . F2 E2 | D2 . . D2 | . . F2 . | A1 . . A1 | C2 . D2 . ' },
    { wave: 'pulse12', vol: .045, notes: 'D4 . F4 . | A4 . . . | . . G4 . | F4 . E4 . | D4 . F4 . | A4 . C5 . | . . A4 . | G4 F4 E4 . ' },
    { wave: 'sine', vol: .06, notes: 'F3 - - - | A3 - - - | G3 - - - | E3 - - - | F3 - - - | C4 - - - | E3 - - - | E3 - - - ' },
    { wave: 'drums', vol: .32, notes: 'k . h . | s . h k | k . h . | s . h h | k . h . | s . h k | k k h . | s . h o ' } ] },
  night: { bpm: 80, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'A1 . . A1 | . . C2 . | D2 . . . | E2 . D2 . | A1 . . A1 | . . C2 . | G1 . . G1 | B1 . . . ' },
    { wave: 'sine', vol: .07, notes: 'E4 - - - | C4 - - - | D4 - - - | B3 - - - | E4 - - - | C4 - - - | B3 - - - | G3 - - - ' },
    { wave: 'drums', vol: .26, notes: 'k . h . | s . h . | k . h k | s . h . | k . h . | s . h . | k . h k | s . c . ' } ] },
  wire: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'C2 . . . | C2 . . . | Eb2 . . . | D2 . . . | C2 . . . | C2 . . . | Ab1 . . . | G1 . . . ' },
    { wave: 'pulse12', vol: .03, notes: 'G4 . . . | . . G4 . | . . . . | F4 . . . | G4 . . . | . . Ab4 . | . . G4 . | . . F4 . ' },
    { wave: 'drums', vol: .18, notes: 'h . h . | h . h . | h . h . | h . h h | h . h . | h . h . | h . h . | h h h . ' } ] },
  chase: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .08, notes: 'E2 E2 E3 E2 | G2 G2 G3 G2 | A2 A2 A3 A2 | B2 B2 B3 D3 | E2 E2 E3 E2 | G2 G2 G3 G2 | C3 C3 B2 A2 | B2 . B2 . ' },
    { wave: 'pulse', vol: .05, notes: 'B4 . . B4 | . . D5 . | E5 . . D5 | . . B4 . | B4 . . B4 | . . D5 . | E5 . G5 . | F#5 . . . ' },
    { wave: 'drums', vol: .35, notes: 'k h s h | k k s h | k h s h | k k s s | k h s h | k k s h | k h s h | s s s c ' } ] },
  office: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'F2 . . . | A2 . . . | Bb2 . . . | C3 . . . | F2 . . . | A2 . . . | G2 . . . | C2 . . . ' },
    { wave: 'sine', vol: .06, notes: 'A3 - C4 - | F4 - - - | D4 - F4 - | E4 - - - | C4 - A3 - | F4 - E4 - | D4 - - - | E4 - - - ' },
    { wave: 'drums', vol: .14, notes: 'k . . . | h . . . | k . . . | h . h . | k . . . | h . . . | k . k . | h . . . ' } ] },
  ending: { bpm: 66, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, notes: 'A2 . E3 . | F2 . C3 . | C3 . G3 . | G2 . D3 . | A2 . E3 . | F2 . C3 . | D3 . A3 . | E2 . B2 . ' },
    { wave: 'sine', vol: .08, notes: 'C5 - B4 A4 | A4 - - - | G4 - E4 G4 | D4 - - - | C5 - B4 A4 | F4 - A4 C5 | B4 - A4 - | G#4 - - - ' },
    { wave: 'drums', vol: .12, notes: 'k . . . | . . h . | k . . . | . . h . | k . . . | . . h . | k . . . | . . h . ' } ] }
};
let songNow = null;
function music(name) {
  if (songNow === name) return;
  songNow = name;
  try { A.music(name ? SONGS[name] : null, { fade: .8 }); } catch (e) { try { A.music(name ? SONGS[name] : null); } catch (e2) {} }
}

// voices: each speaker a pitch and a timbre; syllables blipped as their text types (Simlish-style gibberish)
const VOICES = {
  KOWAL: { f: 210, w: 'triangle' }, BRIGGS: { f: 120, w: 'square' }, MABRY: { f: 95, w: 'saw' }, PIGEON: { f: 260, w: 'pulse' },
  JUNEBUG: { f: 230, w: 'square' }, MOE: { f: 150, w: 'square' }, TAY: { f: 110, w: 'pulse' }, SQUEAK: { f: 300, w: 'pulse12' },
  FELD: { f: 240, w: 'sine' }, JUDGE: { f: 100, w: 'triangle' }, HASKINS: { f: 90, w: 'saw' }, UNIFORM: { f: 135, w: 'square' },
  CALLER: { f: 170, w: 'pulse' }, DEFAULT: { f: 160, w: 'triangle' }
};
const VOWEL = [1, 1.26, 1.5, 1.12, .89, 1.34];
function voiceBlip(who, ch, vol = .07) {
  const v = VOICES[who] || VOICES.DEFAULT, k = (ch.charCodeAt(0) * 7) % VOWEL.length, f = v.f * VOWEL[k];
  A.sfx([{ wave: v.w, freq: f, to: f * (k % 2 ? .82 : 1.1), dur: .065, vol }, { wave: 'sine', freq: f * 3.1, dur: .04, vol: vol * .5 }], { vary: .06 });
}

// ---- a dialog with voices: wraps E.Dialog; each speaker's lines blip in its own voice ----------------------------
const talk = new E.Dialog(game, { lines: 3 });
talk.voice = null;
let talkWho = null, talkShown = 0;
function say(who, lines, o = {}) {
  talkWho = who;
  const sp = { slow: 30, normal: 48, fast: 80 }[setting('textSpeed', 'normal')] || 48;
  talk.speed = sp;
  talk.say(Array.isArray(lines) ? lines : [lines], Object.assign({ name: who, portrait: CAST[who] ? CAST[who].rig : undefined }, o));
  talkShown = 0;
}
function talkTick(dt) {
  if (talk.open && talk.shown !== undefined) {
    if (talk.shown < talkShown) talkShown = 0;
    if (talk.shown - talkShown >= 2) { const page = (talk.pages[talk.i] || []).join(' '); voiceBlip(talkWho, page[talk.shown] || 'a'); talkShown = talk.shown; }
  }
  return talk.update(dt);
}
// a queue of lines from several speakers: [['KOWAL', 'text'], ['PIGEON', ['a', 'b'], { choices, onChoice }], ...]
function convo(list, done) {
  let i = 0;
  const next = () => {
    if (i >= list.length) { if (done) done(); return; }
    const [who, lines, o] = list[i++];
    const extra = Object.assign({}, o || {});
    const userDone = extra.onDone, userChoice = extra.onChoice;
    if (extra.choices) { extra.onChoice = c => { if (userChoice) userChoice(c); setTimeoutGame(next); }; }
    else extra.onDone = () => { if (userDone) userDone(); setTimeoutGame(next); };
    say(who, lines, extra);
  };
  next();
}
const setTimeoutGame = fn => game.after(.05, fn);
// every scene starts clean: no dialog, notes or toasts carried over from the last one
function sceneReset() { try { if (talk.open) talk.close(); } catch (e) {} NOTES.open = false; TOASTS.length = 0; }

// ---- the cast: rigs shared across scenes (portraits in dialog use them too) -------------------------------------
const CAST = {};
function castRig(id, o) { CAST[id] = { rig: new E.Humanoid(Object.assign({ size: 1.3, weapon: null }, o)), name: id }; return CAST[id].rig; }
castRig('KOWAL', { build: 'heroic', outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { skin: '#e2b49a', hair: '#5a3a22', cloth: '#6a6a72', coat: '#4a3a2c', pants: '#2a3242', boot: '#1e1a18', belt: '#2a2018', trim: '#8a7a5a' } });
castRig('BRIGGS', { build: 'bulky', outfit: 'coat', hair: 'bald', sleeves: 'long', colors: { skin: '#6a4430', hair: '#1a1210', cloth: '#d8d4c8', coat: '#2a3448', pants: '#3a3a40', boot: '#141414', belt: '#1a1a1a', trim: '#5a6478' } });
castRig('MABRY', { build: 'heroic', outfit: 'shirt', hair: 'short', sleeves: 'long', colors: { skin: '#7a5038', hair: '#2a2a2a', cloth: '#e8e4dc', pants: '#2e2e36', boot: '#141414', belt: '#2a1a12', trim: '#7a2a2a' } });
castRig('PIGEON', { build: 'chibi', outfit: 'coat', hood: true, hunch: .35, sleeves: 'long', colors: { skin: '#c89a78', hair: '#4a4a3a', cloth: '#7a6a4a', coat: '#5a5a3a', pants: '#4a4238', boot: '#3a2a20', trim: '#6a5a3a' } });
castRig('JUNEBUG', { build: 'chibi', outfit: 'shirt', hat: { style: 'cap', color: '#2a3a8a' }, sleeves: 'short', colors: { skin: '#5a3a28', hair: '#141010', cloth: '#f0f0ec', pants: '#3a5a8a', boot: '#e8e8e8', belt: '#1a1a1a' } });
castRig('MOE', { build: 'bulky', outfit: 'shirt', hair: 'short', sleeves: 'long', hood: true, colors: { skin: '#4a3020', hair: '#1a1a1a', cloth: '#2a2a2a', pants: '#2a2a30', boot: '#c8c8c8', belt: '#1a1a1a' } });
castRig('TAY', { build: 'heroic', outfit: 'coat', hat: { style: 'cap', color: '#141414' }, sleeves: 'long', colors: { skin: '#5a3826', hair: '#101010', cloth: '#8a1a1a', coat: '#181818', pants: '#202024', boot: '#d8b860', trim: '#d8b860' } });
castRig('SQUEAK', { build: 'chibi', size: 1.15, outfit: 'shirt', hood: true, sleeves: 'long', colors: { skin: '#6a442e', hair: '#5a6a3a', cloth: '#5a6a3a', pants: '#2a2a2a', boot: '#d8d8d8', belt: '#1a1a1a' } });
castRig('KEVO', { build: 'chibi', outfit: 'shirt', hat: { style: 'band', color: '#c83a2a' }, sleeves: 'short', colors: { skin: '#4a2e1e', hair: '#101010', cloth: '#c83a2a', pants: '#2a2a3a', boot: '#2a2a2a' } });
castRig('DRE', { build: 'chibi', outfit: 'shirt', hair: 'short', sleeves: 'long', hood: true, colors: { skin: '#5a3a26', hair: '#7a7a7a', cloth: '#7a7a7a', pants: '#3a4a6a', boot: '#f0f0f0' } });
castRig('FELD', { build: 'heroic', outfit: 'coat', hair: 'long', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#2a1a14', cloth: '#e8e4ec', coat: '#3a3a4a', pants: '#2a2a34', boot: '#141414' } });
castRig('JUDGE', { build: 'bulky', outfit: 'robe', hair: 'short', sleeves: 'long', colors: { skin: '#d8a888', hair: '#d8d8d8', cloth: '#141418', pants: '#141418', boot: '#0a0a0a' } });
castRig('HASKINS', { build: 'bulky', outfit: 'coat', hat: { style: 'cap', color: '#1a2448' }, sleeves: 'long', colors: { skin: '#e0b090', hair: '#8a8a8a', cloth: '#e8e8f0', coat: '#1a2448', pants: '#1a2448', boot: '#0a0a0a', trim: '#d8b860' } });
castRig('UNIFORM', { build: 'heroic', outfit: 'shirt', hat: { style: 'cap', color: '#1a2448' }, sleeves: 'short', colors: { skin: '#c89070', hair: '#3a2a1a', cloth: '#2a3a68', pants: '#1a2448', boot: '#0a0a0a', belt: '#141414' } });
castRig('CALLER', { build: 'chibi', outfit: 'shirt', hair: 'short', colors: { skin: '#6a4430', cloth: '#5a5a5a' } });

// ---- key and button badges: PlayStation shapes drawn in pixels, keys as caps, mouse buttons as a mouse ----------
const PS_COL = { '✕': '#7ab0f0', '○': '#f06a6a', '□': '#e08ad0', '△': '#5ad0a8' };
const XB_COL = { A: '#5ac04a', B: '#e04a3a', X: '#3a8ae0', Y: '#e8c03a' };
function lastDev() { return I.lastDevice === 'gamepad' ? 'gamepad' : (I.lastDevice === 'touch' ? 'keyboard' : I.lastDevice); }
function keyLabel(act) { try { return I.label(act, lastDev() === 'mouse' ? 'mouse' : lastDev()) || '?'; } catch (e) { return '?'; } }
// draws a badge for an action's key at x, y (top-left); returns its width
function badge(g, act, x, y, o = {}) {
  const lab = typeof act === 'string' && act.startsWith('#') ? act.slice(1) : keyLabel(act);
  return badgeText(g, lab, x, y, o);
}
function badgeText(g, lab, x, y, o = {}) {
  x = Math.round(x); y = Math.round(y);
  if (PS_COL[lab]) {
    px.disc(g, x + 5, y + 5, 5, '#101018'); px.disc(g, x + 5, y + 5, 4, '#2a2a38');
    const c = PS_COL[lab], cx = x + 5, cy = y + 5;
    if (lab === '✕') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, c); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, c); }
    else if (lab === '○') { px.disc(g, cx, cy, 3, c); px.disc(g, cx, cy, 2, '#2a2a38'); }
    else if (lab === '□') { px.rect(g, cx - 2, cy - 2, 5, 5, c); px.rect(g, cx - 1, cy - 1, 3, 3, '#2a2a38'); }
    else { px.line(g, cx, cy - 3, cx - 3, cy + 2, c); px.line(g, cx, cy - 3, cx + 3, cy + 2, c); px.line(g, cx - 3, cy + 2, cx + 3, cy + 2, c); }
    return 11;
  }
  if (XB_COL[lab] && lab.length === 1 && I.padStyle && I.padStyle() === 'xbox' && lastDev() === 'gamepad') {
    px.disc(g, x + 5, y + 5, 5, '#101018'); px.disc(g, x + 5, y + 5, 4, XB_COL[lab]);
    E.font.text(g, lab, x + 5, y + 2, '#101018', { align: 'center', outline: false });
    return 11;
  }
  if (/click/i.test(lab)) {   // a little mouse with the button lit
    const which = /Right/.test(lab) ? 1 : /Middle/.test(lab) ? 2 : 0;
    px.rect(g, x + 1, y, 8, 11, '#101018'); px.rect(g, x + 2, y + 1, 6, 9, '#d8d4e0');
    px.rect(g, which === 1 ? x + 5 : which === 2 ? x + 4 : x + 2, y + 1, which === 2 ? 2 : 3, 4, '#f0a040'); px.rect(g, x + 4, y + 1, 1, 4, '#101018');
    return 11;
  }
  const w = Math.max(9, E.font.width(lab) + 6);
  px.rect(g, x, y, w, 11, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 9, lastDev() === 'gamepad' ? '#3a3a4a' : '#e8e4dc');
  px.rect(g, x + 1, y + 9, w - 2, 1, lastDev() === 'gamepad' ? '#22222c' : '#a8a49c');
  E.font.text(g, lab, x + w / 2, y + 2, lastDev() === 'gamepad' ? '#f0f0f0' : '#141418', { align: 'center', outline: false });
  return w;
}
// a row of prompts: [['interact', 'Talk'], ['aim', 'Camera']]: centred at cx (or left at x with o.left)
function badgeWidth(act) {
  const lab = typeof act === 'string' && act.startsWith('#') ? act.slice(1) : keyLabel(act);
  if (PS_COL[lab] || /click/i.test(lab)) return 11;
  if (XB_COL[lab] && lab.length === 1 && I.padStyle && I.padStyle() === 'xbox' && lastDev() === 'gamepad') return 11;
  return Math.max(9, E.font.width(lab) + 6);
}
function promptRow(g, items, cx, y, o = {}) {
  const parts = items.map(([a, t]) => ({ a, t, w: badgeWidth(a) + 3 + E.font.width(t) + 10 }));
  let total = parts.reduce((s, p) => s + p.w, 0) - 10, x = o.left ? cx : Math.round(cx - total / 2);
  if (o.bg !== false) E.ui.box(g, x - 5, y - 3, total + 10, 17, { bg: ['#0c0c12', '#16161e'], border: '#3a3a48', alpha: .85 });
  for (const p of parts) { const bw = badge(g, p.a, x, y); E.font.text(g, p.t, x + bw + 3, y + 2, o.color || '#e8e4dc', { shadow: '#000', outline: false }); x += p.w; }
  return total;
}
// a panel in the house style: dark glass, thin rule, a header
function panel(g, x, y, w, h, title, o = {}) {
  E.ui.box(g, x, y, w, h, { bg: o.bg || ['#101018', '#08080c'], border: o.border || '#4a4a5a', alpha: o.alpha === undefined ? .92 : o.alpha });
  if (title) { E.font.text(g, title, x + 8, y + 6, o.titleColor || '#d8b860', { shadow: '#000', outline: false }); px.rect(g, x + 6, y + 16, w - 12, 1, '#3a3a48'); }
}
const hit = (p, x, y, w, h) => !!p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;
function wrapText(s, w, o) { try { return E.font.wrap(s, w, o); } catch (e) { return [s]; } }

// ---- the case: everything one run of the story remembers ------------------------------------------------------
function freshCase() {
  return { chapter: 1, stage: 0, evidence: [], intel: [], heat: 0, violations: 0, pigeonPaid: null, pigeonTrust: 1, squeakCaught: false, tayPlate: false,
    tagsWasted: 0, photos: 0, burns: 0, ending: null, line: null, pc: 0, time: 0, checkpoints: {}, ledger: false, package: false, shots: [] };
}
let CASE = freshCase();
const hasEv = id => CASE.evidence.includes(id);
function addEvidence(id) { if (!CASE.evidence.includes(id)) { CASE.evidence.push(id); return true; } return false; }
const EVIDENCE = {
  h2h1: { name: 'Hand-to-hand #1', who: 'JUNEBUG', text: 'Junebug takes cash from a buyer at Monroe and Calhoun.' },
  h2h2: { name: 'Hand-to-hand #2', who: 'JUNEBUG', text: 'A second sale. Same corner, same hopper, different fiend.' },
  stash: { name: 'The stash', who: 'SQUEAK', text: 'Squeak pulls vials from under the vacant\'s steps.' },
  collect: { name: 'The collection', who: 'MOE', text: 'Little Moe hands the day\'s money to a man in a black cap.' },
  tay: { name: 'Black cap', who: 'TAY', text: 'Tavon "Tay" Rucker. Lieutenant. Drives the Lexus.' },
  pigeon: { name: 'CI statement', who: 'PIGEON', text: 'Pigeon: "It\'s Deacon\'s package. Everybody know that."' },
  house: { name: '1419 Lorraine', who: 'SQUEAK', text: 'The re-up stash house. Squeak keys in the back door.' },
  lookouts: { name: 'The lookouts', who: 'KEVO', text: 'Kevo and Dre, calling out on the corners.' }
};

// saves: the autosave at each chapter's start, three slots from the pause menu
try {
  const SV = game.saves;
  SV.write = () => ({ data: JSON.parse(JSON.stringify(CASE)), place: CHAPTERS[CASE.chapter] ? CHAPTERS[CASE.chapter].name : 'Case', level: CASE.chapter });
  SV.read = s => { CASE = Object.assign(freshCase(), s.data || {}); };
} catch (e) { /* headless without storage */ }
const CHAPTERS = {
  1: { tape: 'TAPE ONE', name: 'The Corner', scene: 'street', mode: 'corner', quote: '"You can\'t see the game from a desk. You got to stand in it."', by: '- Det. Dana Kowal' },
  2: { tape: 'TAPE TWO', name: 'Paper', scene: 'office', mode: 'board', quote: '"A judge don\'t sign feelings. Judge signs paper."', by: '- ASA Ruth Feld' },
  3: { tape: 'TAPE THREE', name: 'The Wire', scene: 'wire', mode: 'wire', quote: '"Every phone is a confession waiting on a fool."', by: '- Det. Lonnie Briggs' },
  4: { tape: 'TAPE FOUR', name: 'The Re-Up', scene: 'street', mode: 'reup', quote: '"Ain\'t no clean way out of a dirty house."', by: '- Pigeon' },
  5: { tape: 'TAPE FIVE', name: 'The Stat', scene: 'ending', mode: 'ending', quote: '"They don\'t want the case. They want the picture of the case."', by: '- Lt. Cedric Mabry' }
};
function autosave() { if (IN_HUB) return; try { game.saves.autosave(); } catch (e) {} }

// ---- case notes overlay (Tab / M / Create): the objective, the evidence and the intel, in big type ---------------
const NOTES = { open: false, page: 0 };
let OBJECTIVE = { title: '', text: '' };
function setObjective(title, text = '') { if (OBJECTIVE.title !== title) { OBJECTIVE = { title, text }; if (title) toast('NEW OBJECTIVE', title); } else OBJECTIVE.text = text; }
const TOASTS = [];
function toast(head, text, t = 3.2) { TOASTS.push({ head, text, t, max: t }); if (TOASTS.length > 3) TOASTS.shift(); }
function toastTick(dt) { for (const t of TOASTS) t.t -= dt; while (TOASTS.length && TOASTS[0].t <= 0) TOASTS.shift(); }
function drawToasts(r) {
  r.overlay(g => {
    let y = 52;
    for (const t of TOASTS) {
      const a = Math.min(1, t.t * 3, (t.max - t.t) * 6), w = Math.max(E.font.width(t.head), E.font.width(t.text)) + 20, x = Math.round(r.W / 2 - w / 2 + (1 - a) * 30);
      E.ui.box(g, x, y, w, 26, { bg: ['#1a1408', '#0c0a06'], border: '#d8b860', alpha: .9 });
      E.font.text(g, t.head, x + 10, y + 4, '#d8b860', { font: 'tiny', outline: false });
      E.font.text(g, t.text, x + 10, y + 13, '#f0ece0', { shadow: '#000', outline: false });
      y += 30;
    }
  });
}
function notesTick() {
  if (!NOTES.open) return false;
  if (I.pressed('notes') || I.pressed('cancel')) { NOTES.open = false; A.sfx('cancel'); I.consumeAll(); }
  else if (I.pressed('left') || I.pressed('right')) { NOTES.page = 1 - NOTES.page; A.sfx('select'); }
  const c = I.clicked();
  if (c) NOTES.page = 1 - NOTES.page;
  return true;
}
function drawNotes(r) {
  if (!NOTES.open) return;
  r.overlay(g => {
    px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
    const w = Math.min(380, r.W - 20), h = Math.min(220, r.H - 20), x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
    panel(g, x, y, w, h, NOTES.page === 0 ? 'CASE NOTES  •  ' + (CHAPTERS[CASE.chapter] ? CHAPTERS[CASE.chapter].tape + ': ' + CHAPTERS[CASE.chapter].name.toUpperCase() : '') : 'EVIDENCE AND INTEL');
    if (NOTES.page === 0) {
      E.font.text(g, 'NOW', x + 10, y + 24, '#8a8a9a', { font: 'tiny', outline: false });
      E.font.text(g, OBJECTIVE.title || '-', x + 10, y + 32, '#f0ece0', { scale: 2, outline: false, shadow: '#000' });
      let yy = y + 52;
      for (const l of wrapText(OBJECTIVE.text || '', w - 20)) { E.font.text(g, l, x + 10, yy, '#c8c4bc', { outline: false }); yy += 10; }
      yy += 6;
      E.font.text(g, 'HEAT', x + 10, yy, '#8a8a9a', { font: 'tiny', outline: false });
      for (let i = 0; i < 3; i++) px.rect(g, x + 34 + i * 12, yy - 1, 9, 7, i < CASE.heat ? '#e04a3a' : '#3a3a48');
      E.font.text(g, 'Three burns and the corner knows your face. The case is blown.', x + 76, yy, '#8a8a9a', { font: 'tiny', outline: false });
      yy += 14;
      E.font.text(g, 'VIOLATIONS', x + 10, yy, '#8a8a9a', { font: 'tiny', outline: false });
      for (let i = 0; i < 3; i++) px.rect(g, x + 56 + i * 12, yy - 1, 9, 7, i < CASE.violations ? '#e0a03a' : '#3a3a48');
      E.font.text(g, 'Listen to the wrong call too long and the judge pulls the wire.', x + 98, yy, '#8a8a9a', { font: 'tiny', outline: false });
    } else {
      let yy = y + 24;
      if (!CASE.evidence.length) E.font.text(g, 'Nothing yet. Get out there.', x + 10, yy, '#8a8a9a', { outline: false });
      for (const id of CASE.evidence) { const ev = EVIDENCE[id]; if (!ev) continue; E.font.text(g, '• ' + ev.name, x + 10, yy, '#f0ece0', { outline: false }); E.font.text(g, ev.text, x + 120, yy, '#a8a49c', { outline: false }); yy += 11; if (yy > y + h - 50) break; }
      yy += 4;
      for (const it of CASE.intel) { E.font.text(g, '♪ ' + it, x + 10, yy, '#d8b860', { outline: false }); yy += 11; if (yy > y + h - 20) break; }
    }
    promptRow(g, [['#← →', 'Page'], ['notes', 'Close']], r.W / 2, y + h - 18);
  });
}
// the HUD's objective line, heat pips and prompts, drawn in screen pixels anchored to the edges
function drawHudObjective(g, r) {
  if (!OBJECTIVE.title) return;
  const corner = game.cornerArea ? game.cornerArea() : null, maxX = corner ? corner.x0 - 6 : r.W - 6;
  const w = Math.min(maxX - 6, Math.max(E.font.width(OBJECTIVE.title) + 16, 120));
  E.ui.box(g, 6, 6, w, 22, { bg: ['#0c0c12', '#14141c'], border: '#3a3a48', alpha: .8 });
  E.font.text(g, (CHAPTERS[CASE.chapter] ? CHAPTERS[CASE.chapter].tape : (typeof ST !== 'undefined' && ST.mode === 'coldopen' ? 'COLD OPEN' : 'SHIFT')), 12, 9, '#d8b860', { font: 'tiny', outline: false });
  E.font.text(g, OBJECTIVE.title, 12, 17, '#f0ece0', { shadow: '#000', outline: false });
}

// ---- 02-world.js ----
// ============================================================================================================
// REWIRED • 02 world: materials (rowhouse brick with windows, boarded vacants with tags), objects as data (cars,
// dumpster, couch, payphone, desks), the street block, the detail's office, the wire room, the stash house; actors.
// ============================================================================================================
const T = 16;
const rgb = h => E.hex(h);
const NIGHT = { on: false };   // lit windows and their count follow the hour

// ---- wall faces painted per pixel ---------------------------------------------------------------------------
function brickAt(wx, z, ct, seed) {
  const course = Math.floor(z / 3), off = course % 2 ? 3 : 0, bx = Math.floor((wx + off) / 6);
  if (z % 3 < .55) return ct.deep;
  if (((wx + off) % 6 + 6) % 6 < .55) return ct.deep;
  const v = E.hash2(bx + seed, course);
  return v < .18 ? ct.sh : v > .9 ? ct.lt : null;
}
function windowAt(wx, z, cx, cy, fi, h, kind) {
  const u = ((wx % 16) + 16) % 16, floorZ = z < 22 ? 0 : 1, zz = z - (floorZ ? 26 : 8);
  const door = kind !== 'store' && floorZ === 0 && E.hash2(cx * 3 + fi, cy * 5) > .55;
  if (door) { if (u > 5 && u < 11 && z < 16) return u < 5.8 || u > 10.2 || z > 15.2 ? '#2a1e18' : (kind === 'vacant' ? '#8a6a3c' : (E.hash2(cx, cy) > .5 ? '#5a2a20' : '#2a2a3a')); return null; }
  if (zz < 0 || zz > 11 || u < 4 || u > 12 || z > h - 5) return null;
  const edge = u < 4.8 || u > 11.2 || zz < .8 || zz > 10.2;
  if (kind === 'vacant') {   // plywood over the glass, a stencilled X
    if (edge) return '#3a2a1e';
    const d1 = Math.abs((u - 4) - zz * .73), d2 = Math.abs((12 - u) - zz * .73);
    return d1 < .7 || d2 < .7 ? '#d8d0c0' : (Math.floor(zz / 3) % 2 ? '#9a7a4a' : '#8a6c40');
  }
  if (edge) return kind === 'store' ? '#1a1a1a' : '#d8d4c8';
  if (Math.abs(u - 8) < .5) return '#d8d4c8';
  const lit = NIGHT.on && E.hash2(cx * 11 + fi * 3 + floorZ, cy * 7) > .55;
  if (kind === 'store') return lit || !NIGHT.on ? (zz > 8 ? '#e8d880' : '#c8b048') : '#2a3038';
  return lit ? (zz > 7 ? '#f0c878' : '#d8a050') : (zz > 7 ? '#3a4a5a' : '#1a2230');
}
function tagAt(wx, z, cx, cy) {   // graffiti on vacants: a few loops of spray paint near the ground
  if (z > 14 || z < 2) return null;
  const n = E.noise2(wx / 3 + cx * 9, z / 2 + cy * 4), m = E.hash2(cx, cy * 3);
  if (m < .45) return null;
  return n > .62 && n < .7 ? (m > .8 ? '#e85ab0' : m > .62 ? '#5ad0e8' : '#e8e8e8') : null;
}
E.MATERIALS.rowhouse = { color: '#8a4436', pattern: 'bricks', face(wx, z, ct, t, cx, cy, fi, nh, h) { return windowAt(wx, z, cx, cy, fi, h, 'row') || (z < 4 ? ct.sh : brickAt(wx, z, ct, cx * 3 + cy)); } };
E.MATERIALS.formstone = { color: '#8a8478', pattern: 'stones', face(wx, z, ct, t, cx, cy, fi, nh, h) {
  const w = windowAt(wx, z, cx, cy, fi, h, 'row'); if (w) return w;
  const n = E.noise2(wx / 3 + cx, z / 2.4 + cy); return n < .3 ? ct.deep : n < .42 ? ct.sh : n > .74 ? ct.lt : null; } };
E.MATERIALS.vacant = { color: '#5a3a30', pattern: 'bricks', face(wx, z, ct, t, cx, cy, fi, nh, h) { return windowAt(wx, z, cx, cy, fi, h, 'vacant') || tagAt(wx, z, cx, cy) || (z < 5 ? ct.deep : brickAt(wx, z, ct, cx + cy * 5)); } };
E.MATERIALS.lowrise = { color: '#a8846a', pattern: 'bricks', face(wx, z, ct, t, cx, cy, fi, nh, h) {
  const w = windowAt(wx, z, cx, cy, fi, h, 'row'); if (w) return w;
  if (Math.abs(z - 20) < 1) return ct.lt;   // a concrete band between the floors
  return z < 4 ? ct.sh : brickAt(wx, z, ct, cx * 5 + cy); } };
E.MATERIALS.store = { color: '#3a5a4a', pattern: 'none', face(wx, z, ct, t, cx, cy, fi, nh, h) {
  if (z > 18 && z < 26) { const u = ((wx % 64) + 64) % 64; return z > 24.5 || z < 19.5 ? '#141414' : (u > 8 && u < 56 && Math.floor(u) % 2 === 0 && z > 21 && z < 23.5 ? '#f0d848' : '#c82a2a'); }   // the sign band: LUCKY'S, as a marquee
  return windowAt(wx, z, cx, cy, fi, h, 'store') || (z < 3 ? ct.deep : null); } };
E.MATERIALS.chainlink = { color: '#8a8a90', pattern: 'none', face(wx, z, ct) { const a = ((wx + z) % 3 + 3) % 3, b = ((wx - z) % 3 + 3) % 3; return a < .5 || b < .5 ? ct.lt : (z > 11.5 ? ct.base : ct.sh); } };
E.MATERIALS.drywall = { color: '#9a9a88', pattern: 'none', face(wx, z, ct) { if (z < 3) return '#4a4038'; if (Math.abs(z - 14) < .5) return ct.sh; return E.hash2(Math.floor(wx), Math.floor(z)) < .04 ? ct.sh : null; } };
E.MATERIALS.cinder = { color: '#7a7a74', pattern: 'none', face(wx, z, ct) { const c = Math.floor(z / 5), off = c % 2 ? 6 : 0; return z % 5 < .6 || ((wx + off) % 12 + 12) % 12 < .6 ? ct.deep : (E.hash2(Math.floor((wx + off) / 12), c) < .2 ? ct.sh : null); } };
E.MATERIALS.tarroof = { color: '#363639', pattern: 'speck', amount: .03 };

// ---- floors ---------------------------------------------------------------------------------------------------
function n2(x, y) { return E.noise2(x, y); }
const FLOORS = {
  road(x, y) {
    let v = 52 + n2(x / 9, y / 9) * 14 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 10;
    const crack = Math.abs(n2(x / 23, y / 31) - .5) < .012; if (crack) v -= 22;
    const patch = n2(x / 40 + 9, y / 40) > .72; if (patch) v -= 8;
    let c = [v, v, v + 4];
    const L = STREET.laneAt(x, y); if (L) c = L;
    if (STREET.wet) { const p = n2(x / 14 + 3, y / 10) > .64; if (p) c = [c[0] * .6 + 20, c[1] * .6 + 24, c[2] * .6 + 40]; }
    return c;
  },
  walk(x, y) {
    const jx = ((x % 16) + 16) % 16, jy = ((y % 16) + 16) % 16;
    let v = 128 + n2(x / 7, y / 7) * 16 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 8;
    if (jx < 1 || jy < 1) v -= 34;
    if (n2(x / 5 + 40, y / 5) > .78) v -= 26;   // stains
    if (E.hash2(Math.floor(x / 2), Math.floor(y / 2) + 99) > .996) return [200, 196, 180];   // a cap, a wrapper
    const c = [v, v - 2, v - 6];
    if (STREET.wet) return [c[0] * .7, c[1] * .7, c[2] * .75 + 8];
    return c;
  },
  lot(x, y) {
    const n = n2(x / 6, y / 6), h = E.hash2(Math.floor(x), Math.floor(y));
    if (h > .993) return [210, 220, 200];   // glass glints
    if (h > .985) return [180, 60, 50];     // a red cap
    const grass = n2(x / 11 + 7, y / 11) > .6;
    return grass ? [58 + n * 20, 70 + n * 24, 40] : [92 + n * 24, 76 + n * 18, 58 + n * 10];
  },
  court(x, y) {
    let v = 108 + n2(x / 8, y / 8) * 18; const jx = ((x % 32) + 32) % 32, jy = ((y % 32) + 32) % 32;
    if (jx < 1 || jy < 1) v -= 26; if (Math.abs(n2(x / 17, y / 13) - .5) < .015) v -= 30;
    return [v, v - 4, v - 10];
  },
  alley(x, y) {
    let v = 40 + n2(x / 6, y / 6) * 16; if (E.hash2(Math.floor(x / 3), Math.floor(y / 3)) > .97) v += 30;
    const p = n2(x / 12, y / 12 + 5) > .66; return p ? [28, 32, 44] : [v, v - 2, v - 4];
  },
  lino(x, y) { const cx = Math.floor(x / 8), cy = Math.floor(y / 8), k = (cx + cy) % 2; const v = k ? 150 : 120; const s = n2(x / 9, y / 9) * 16; return [v + s, v - 6 + s, v - 22 + s]; },
  carpet(x, y) { const v = 58 + n2(x / 4, y / 4) * 10 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 8; return [v * .8, v * .85, v * 1.1]; },
  concrete(x, y) { let v = 84 + n2(x / 10, y / 10) * 20; if (n2(x / 6 + 30, y / 6) > .75) v -= 20; return [v, v, v - 4]; },
  boards(x, y) { const r = Math.floor(y / 5), j = ((x + r * 23) % 40 + 40) % 40; let v = 92 + n2(x / 20, r) * 20; if (((y % 5) + 5) % 5 < .6 || j < .6) v -= 40; return [v, v * .72, v * .5]; }
};

// ---- objects as data ------------------------------------------------------------------------------------------
Object.assign(E.MATERIALS, {
  carpaint: { color: '#b0a07a', pattern: 'glaze' }, chrome: { color: '#c8ccd4', pattern: 'metal' }, glass: { color: '#2a3a4a', pattern: 'glaze' },
  tire: { color: '#1a1a1c', pattern: 'none' }, dumpgreen: { color: '#2e5a3a', pattern: 'metal', rivet: 1 }, couchgreen: { color: '#5a6a3a', pattern: 'cloth' },
  ratty: { color: '#a89a7a', pattern: 'cloth' }, payblue: { color: '#2a4a8a', pattern: 'metal' }, steelgrey: { color: '#8a8e96', pattern: 'metal' },
  deskwood: { color: '#7a5a3a', pattern: 'planks' }, beige: { color: '#c8c0a8', pattern: 'none' }, screen: { color: '#3aa060', pattern: 'none', glow: 1 },
  redlight: { color: '#ff3030', pattern: 'none', glow: 1 }, bluelight: { color: '#3050ff', pattern: 'none', glow: 1 }, cork: { color: '#a8784a', pattern: 'speck' }
});
E.SHAPES.sedan = { about: 'a boxy American sedan, chrome bumpers', tags: 'vehicle street', mats: { b: 'carpaint', g: 'glass', t: 'tire', c: 'chrome' },
  parts: [['box','b',[0,0,4],[18,40,8]], ['box','g',[0,-2,12],[16,20,6]], ['box','b',[0,-2,17.5],[15,18,1.5]], ['box','c',[0,20.5,4],[18,1,3]], ['box','c',[0,-20.5,4],[18,1,3]],
    ['mirror','xy',['cyl','t',[8.5,13,0],4,2.5,{rot:[0,90,0]}]]], foot: [-9,-20,9,20] };
E.SHAPES.cruiser = { about: 'a city patrol car with a light bar', tags: 'vehicle police', mats: { b: 'beige', d: 'payblue', g: 'glass', t: 'tire', r: 'redlight', u: 'bluelight' },
  parts: [['box','b',[0,0,4],[18,40,8]], ['box','d',[9.1,0,6],[.4,24,3]], ['box','d',[-9.1,0,6],[.4,24,3]], ['box','g',[0,-2,12],[16,20,6]], ['box','b',[0,-2,17.5],[15,18,1.5]],
    ['box','r',[-4,-2,19],[4,4,2]], ['box','u',[4,-2,19],[4,4,2]], ['mirror','xy',['cyl','t',[8.5,13,0],4,2.5,{rot:[0,90,0]}]]], foot: [-9,-20,9,20] };
E.SHAPES.dumpster = { about: 'a green steel dumpster, lid ajar', tags: 'street alley', mats: { d: 'dumpgreen', l: 'iron' },
  parts: [['box','d',[0,0,1],[26,14,14]], ['wedge','d',[0,-2,15],[27,12,3]], ['mirror','x',['box','l',[10,0,0],[2,12,1.5]]]], foot: [-13,-7,13,7] };
E.SHAPES.couch = { about: 'a sagging old couch left out in the courtyard', tags: 'furniture street', mats: { c: 'couchgreen', l: 'walnut' },
  parts: [['box','c',[0,0,3],[30,12,5]], ['box','c',[0,-5,3],[30,3,12]], ['mirror','x',['box','c',[14,0,3],[3,12,9]]], ['box','c',[-6,1,8],[13,9,2]], ['box','c',[7,1,8],[12,9,1.5]], ['mirror','xy',['box','l',[13,4,0],[2,2,3]]]], foot: [-15,-6,15,6] };
E.SHAPES.mattress = { about: 'a stained mattress dumped in the lot', tags: 'street junk', mats: { m: 'ratty' }, parts: [['box','m',[0,0,0],[30,18,3],{rot:12}]] };
E.SHAPES.tires = { about: 'a stack of old tires', tags: 'street junk', mats: { t: 'tire' }, parts: [['row',3,[0,0,4],['cyl','t',[0,0,0],6,3.6,{seg:10}]]] };
E.SHAPES.payphone = { about: 'a blue payphone on a post', tags: 'street', mats: { p: 'payblue', s: 'steelgrey', k: 'iron' },
  parts: [['box','s',[0,0,0],[3,3,14]], ['box','p',[0,0,14],[9,6,14]], ['box','k',[0,3.2,18],[5,.6,7]], ['box','p',[0,0,28],[11,8,1.5]]] };
E.SHAPES.busstop = { about: 'a bus stop bench and sign', tags: 'street', mats: { w: 'oak', s: 'steelgrey', y: '#e8c03a' },
  parts: [['box','w',[0,0,7],[24,6,1.5]], ['box','w',[0,-3,9],[24,1,6]], ['mirror','x',['box','s',[10,0,0],[2,5,7]]], ['cyl','s',[16,0,0],1,32], ['box','y',[16,0,30],[1,10,7]]] };
E.SHAPES.desk = { about: 'a steel office desk with a beige terminal', tags: 'office', mats: { d: 'steelgrey', t: 'deskwood', b: 'beige', s: 'screen' },
  parts: [['box','t',[0,0,11],[28,14,1.5]], ['mirror','x',['box','d',[11,0,0],[6,13,11]]], ['box','b',[-4,-2,12.5],[9,8,8]], ['box','s',[-4,2.1,14],[7,.4,5]], ['box','b',[6,1,12.5],[8,4,.8]]], foot: [-14,-7,14,7] };
E.SHAPES.filecab = { about: 'a four-drawer filing cabinet', tags: 'office', mats: { d: 'steelgrey', k: 'iron' }, parts: [['box','d',[0,0,0],[10,12,26]], ['row',4,[0,0,6],['box','k',[0,6.2,4],[4,.6,1]]]] };
E.SHAPES.reel = { about: 'a wiretap console: reel decks and a headset', tags: 'office', mats: { d: 'steelgrey', t: 'tire', s: 'screen', b: 'beige' },
  parts: [['box','d',[0,0,0],[30,14,12]], ['box','b',[0,-2,12],[28,8,9]], ['mirror','x',['cyl','t',[7,2.3,18],3.5,.5,{rot:[90,0,0]}]], ['box','s',[0,2.2,13],[6,.3,3]]], foot: [-15,-7,15,7] };
E.SHAPES.officechair = { about: 'a swivel chair', tags: 'office', mats: { c: 'leather', s: 'steelgrey' }, parts: [['cyl','s',[0,0,0],5,1], ['cyl','s',[0,0,1],1,7], ['box','c',[0,0,8],[9,9,2]], ['box','c',[0,-4,10],[9,2,9]]] };
E.SHAPES.cart = E.SHAPES.cart || { parts: [] };
E.SHAPES.shopcart = { about: 'a shopping cart full of scrap', tags: 'street junk', mats: { s: 'chrome', j: 'rusted' },
  parts: [['box','s',[0,0,4],[14,9,8]], ['box','j',[0,0,10],[11,7,4]], ['mirror','xy',['cyl','tire',[5,3.5,0],1.5,1.5]]] };
E.SHAPES.toilet = { about: 'a cracked toilet', tags: 'house', mats: { p: 'porcelain' }, parts: [['cyl','p',[0,1,0],4,8,{r2:5}], ['box','p',[0,-4,8],[10,4,9]]] };
E.SHAPES.fridge = { about: 'an old fridge', tags: 'house', mats: { w: 'beige', k: 'iron' }, parts: [['box','w',[0,0,0],[12,11,30]], ['box','k',[4,5.7,14],[1,.6,8]]] };
E.SHAPES.stove = { about: 'a greasy stove', tags: 'house', mats: { w: 'beige', k: 'iron' }, parts: [['box','w',[0,0,0],[14,12,15]], ['mirror','xy',['cyl','k',[3.5,3,15],2,.5]]] };

// ---- maps -----------------------------------------------------------------------------------------------------
// The block: Monroe St and Lorraine Ave run east-west, Calhoun and Fulton north-south. The corner is the vacant lot
// at Monroe and Calhoun; the Courts' low-rises sit behind it; 1419 Lorraine is the stash house.
const STREET = (() => {
  const SW = 64, SH = 44, g = [];
  for (let y = 0; y < SH; y++) g.push(new Array(SW).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && x >= 0 && x < SW) g[y][x] = ch; };
  // sidewalks around every block
  const blocksX = [[0, 13], [20, 43], [50, 63]], blocksY = [[0, 7], [14, 29], [36, 43]];
  for (const [y0, y1] of blocksY) for (const [x0, x1] of blocksX) fill(Math.max(0, x0 - 1), Math.max(0, y0 - 1), Math.min(SW - 1, x1 + 1), Math.min(SH - 1, y1 + 1), ',');
  // rowhouse blocks, alternating brick and formstone, a vacant here and there
  const rows = (x0, y0, x1, y1, seed) => { for (let x = x0; x <= x1; x++) { const k = E.hash2(x + seed, seed) ; const ch = k < .16 ? 'V' : (Math.floor((x + seed) / 2) % 3 === 0 ? 'R' : 'B'); fill(x, y0, x, y1, ch); } };
  // north row (faces Monroe), with the alley behind
  rows(0, 2, 13, 7, 3); fill(0, 0, 13, 1, 'a');
  rows(26, 2, 43, 7, 5); fill(20, 2, 25, 7, 'S'); fill(20, 0, 43, 1, 'a');
  rows(50, 2, 63, 7, 7); fill(50, 0, 63, 1, 'a');
  // west middle block: two rows back to back with an alley
  rows(0, 14, 13, 19, 11); fill(0, 20, 13, 21, 'a'); rows(0, 22, 13, 29, 13);
  // the centre: the corner lot, the vacants with the stash under the steps, the Courts
  fill(20, 14, 27, 19, 'd'); fill(28, 14, 33, 19, 'V'); fill(34, 14, 43, 19, 'L');
  fill(20, 20, 43, 20, 'a'); fill(20, 21, 25, 29, 'L'); fill(38, 21, 43, 29, 'L'); fill(26, 21, 37, 29, 'c');
  fill(26, 20, 27, 20, 'c'); fill(36, 20, 37, 20, 'c');
  // a chain-link fence along the lot, open at the corner and by the stash
  for (let x = 23; x <= 27; x++) g[14][x] = 'f';
  for (let y = 16; y <= 19; y++) g[y][20] = 'f';
  // east middle
  rows(50, 14, 63, 19, 17); fill(50, 20, 63, 21, 'a'); rows(50, 22, 63, 29, 19);
  // south row (faces Lorraine) and its alley; 1419 Lorraine is cols 30-31
  rows(0, 36, 13, 41, 23); fill(0, 42, 13, 43, 'a');
  rows(20, 36, 43, 41, 29); fill(30, 36, 31, 41, 'H'); fill(20, 42, 43, 43, 'a');
  rows(50, 36, 63, 41, 31); fill(50, 42, 63, 43, 'a');
  // alley cut-throughs between the south row and the alley, for the chase
  fill(26, 36, 26, 41, 'a'); fill(37, 36, 37, 41, 'a');
  for (const [x, y] of [[26, 39], [37, 38]]) g[y][x] = 'f';   // fences to vault in them
  fill(8, 14, 8, 19, 'a'); fill(8, 22, 8, 29, 'a');
  const rowsStr = g.map(r => r.join(''));
  const map = new E.TileMap({ rows: rowsStr,
    legend: { '.': { floor: 'road' }, ',': { floor: 'walk' }, d: { floor: 'lot' }, c: { floor: 'court' }, a: { floor: 'alley' },
      B: 1, R: 2, V: 3, L: 4, S: 5, f: { tile: 6, floor: 'lot' }, H: 7 },
    types: {
      1: { h: 44, top: '#3a3436', side: '#8a4436', face: 'rowhouse', roof: 'tarroof', cut: true, cutH: 10 },
      2: { h: 44, top: '#3a3a3a', side: '#8a8478', face: 'formstone', roof: 'tarroof', cut: true, cutH: 10 },
      3: { h: 44, top: '#2a2626', side: '#5a3a30', face: 'vacant', roof: 'tarroof', cut: true, cutH: 10 },
      4: { h: 38, top: '#4a4644', side: '#a8846a', face: 'lowrise', roof: 'slab', cut: true, cutH: 10 },
      5: { h: 40, top: '#3a3a3a', side: '#3a5a4a', face: 'store', roof: 'tarroof', cut: true, cutH: 10 },
      6: { h: 13, top: '#9a9aa0', side: '#8a8a90', face: 'chainlink', roof: 'plain' },
      7: { h: 44, top: '#3a3436', side: '#6a5a50', face: 'rowhouse', roof: 'tarroof', cut: true, cutH: 10 }
    },
    floorTex: (x, y, tag) => (FLOORS[tag] || FLOORS.road)(x, y), ao: 6, outside: '#1e1e22' });
  const P = (cx, cy) => ({ x: cx * T + 8, y: cy * T + 8 });
  const S = {
    map, SW, SH, wet: false, P,
    laneAt(x, y) {
      const cx = Math.floor(x / T), cy = Math.floor(y / T);
      const inH = (cy >= 9 && cy <= 12) || (cy >= 31 && cy <= 34), inV = (cx >= 15 && cx <= 18) || (cx >= 45 && cx <= 48);
      if (inH && inV) return null;
      if (inH && !inV) { const mid = cy <= 12 ? 11 * T : 33 * T; if (Math.abs(y - mid) < 1.1 && (((x % 20) + 20) % 20) < 12) return [190, 160, 60]; }
      if (inV && !inH) { const mid = cx <= 18 ? 17 * T : 47 * T; if (Math.abs(x - mid) < 1.1 && (((y % 20) + 20) % 20) < 12) return [190, 160, 60]; }
      // crosswalks at the corners
      const nearX = (cx === 14 || cx === 19 || cx === 44 || cx === 49), nearY = (cy === 8 || cy === 13 || cy === 30 || cy === 35);
      if (inH && (cx === 14 || cx === 19 || cx === 44 || cx === 49) && (((y % 4) + 4) % 4) < 2) return [170, 168, 160];
      if (inV && (cy === 8 || cy === 13 || cy === 30 || cy === 35) && (((x % 4) + 4) % 4) < 2) return [170, 168, 160];
      return nearX && nearY ? null : null;
    },
    // places the story uses
    corner: P(21, 13), hopperSpot: P(20, 13), runnerSpot: P(22, 15), stash: { x: 28 * T + 4, y: 13 * T + 4 }, moeSpot: P(19, 14),
    lookoutA: P(14, 13), lookoutB: P(24, 8), alleyMeet: P(23, 1), car1: { x: 4 * T, y: 9 * T + 6 }, playerStart: P(2, 8),
    payphone: { x: 49 * T + 10, y: 35 * T + 4 }, car2: { x: 41 * T, y: 34 * T + 6 }, houseDoor: { x: 31 * T, y: 35 * T + 8 }, houseBack: { x: 31 * T, y: 42 * T + 8 },
    tayPark: { x: 20 * T, y: 12 * T }, courier: { x: 47 * T, y: 33 * T }, couch: P(31, 25),
    busstop: { x: 9 * T + 8, y: 8 * T + 4 }
  };
  // the dressing: [kind, id, x, y, opts]; solid ones block walkers
  const D = [];
  const lamp = (cx, cy) => D.push(['prop', 'streetlamp', cx * T + 8, cy * T + 8, { light: true, cone: true }]);
  for (let x = 2; x < SW; x += 7) { if (x < 14 || (x > 19 && x < 44) || x > 49) { lamp(x, 8); lamp(x, 13); lamp(x, 30); lamp(x, 35); } }
  for (let y = 3; y < SH; y += 8) { if (!(y >= 8 && y <= 13) && !(y >= 30 && y <= 35)) { lamp(14, y); lamp(49, y); } }
  for (const [cx, cy] of [[3, 13], [12, 8], [27, 8], [40, 13], [55, 8], [58, 30], [36, 35], [11, 35], [52, 13], [6, 30]]) D.push(['prop', 'trashcan', cx * T + 4, cy * T + 4, {}]);
  for (const [cx, cy] of [[14, 9], [19, 30], [44, 13], [49, 8], [14, 34]]) D.push(['prop', 'hydrant', cx * T + 6, cy * T + 8, {}]);
  D.push(['prop', 'firedrum', 25 * T, 17 * T, { light: true }], ['prop', 'firedrum', 31 * T, 27 * T, { light: true }]);
  D.push(['solid', 'couch', S.couch.x, S.couch.y, { facing: Math.PI / 2 }], ['solid', 'mattress', 23 * T, 18 * T, {}], ['solid', 'tires', 26 * T + 4, 15 * T + 6, {}]);
  D.push(['solid', 'shopcart', 22 * T, 2 * T - 6, { facing: .4 }], ['solid', 'dumpster', 30 * T, T - 2, { facing: Math.PI / 2 }], ['solid', 'dumpster', 6 * T, 21 * T - 2, { facing: Math.PI / 2 }], ['solid', 'dumpster', 33 * T, 43 * T - 4, { facing: Math.PI / 2 }]);
  D.push(['solid', 'payphone', S.payphone.x, S.payphone.y - 4, { facing: Math.PI / 2 }], ['solid', 'busstop', S.busstop.x, S.busstop.y, { facing: Math.PI / 2 }]);
  // parked cars along the curbs (the unmarked car first: the player sits in it)
  const cars = [[S.car1.x, S.car1.y, 0, '#b0a07a'], [S.car2.x, S.car2.y, Math.PI, '#b0a07a'], [28 * T, 9 * T + 6, 0, '#5a2a2a'], [56 * T, 12 * T + 10, Math.PI, '#3a4a6a'],
    [6 * T, 34 * T + 10, Math.PI, '#4a5a3a'], [24 * T, 31 * T + 6, 0, '#6a6a6a'], [46 * T + 8, 20 * T, Math.PI / 2, '#2a2a3a'], [15 * T + 8, 24 * T, -Math.PI / 2, '#7a6a4a'], [58 * T, 31 * T + 6, 0, '#8a3a2a']];
  cars.forEach(([x, y, f, c], i) => D.push(['solid', 'sedan', x, y, { facing: f, mats: { b: { color: c, pattern: 'glaze' } }, car: i }]));
  for (const d of D) if (d[0] === 'solid') map.solid(d[1], d[2], d[3], 0, d[4]);
  S.dress = D;
  // blend spots: where a plainclothes cop looks like he belongs
  S.blend = [{ x: S.busstop.x, y: S.busstop.y + 10, r: 22, name: 'Bus stop' }, { x: S.payphone.x, y: S.payphone.y + 10, r: 16, name: 'Payphone' },
    { x: 12 * T, y: 7 * T + 14, r: 14, name: 'Stoop' }, { x: 36 * T, y: 7 * T + 14, r: 14, name: 'Stoop' }, { x: 52 * T, y: 13 * T + 6, r: 14, name: 'Stoop' }, { x: 41 * T, y: 13 * T + 4, r: 14, name: 'Stoop' },
    { x: 24 * T, y: 7 * T + 14, r: 18, name: 'Lucky\'s' }, { x: 44 * T + 8, y: 34 * T, r: 16, name: 'Corner' }];
  S.cars = cars;
  return S;
})();

// a small interior map maker: rows, a floor material per tag, wall types
function interior(rows, legend, types, floors) {
  return new E.TileMap({ rows, legend, types, floorTex: (x, y, tag) => (FLOORS[tag] || FLOORS.concrete)(x, y), ao: 5, outside: '#08080a' });
}
const OFFICE = (() => {
  const rows = [
    '##############',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '######..######'];
  const map = interior(rows, { '#': 1, '.': { floor: 'lino' } }, { 1: { h: 40, top: '#2a2a2a', side: '#9a9a88', face: 'drywall', roof: 'plain', cut: true, cutH: 8 } });
  const dress = [['desk', 3 * T, 3 * T, Math.PI / 2], ['desk', 6 * T, 3 * T, Math.PI / 2], ['desk', 3 * T, 6 * T, Math.PI / 2], ['desk', 9 * T + 8, 6 * T, Math.PI / 2],
    ['filecab', 12 * T + 4, 2 * T, Math.PI], ['filecab', 12 * T + 4, 3 * T, Math.PI], ['filecab', 1 * T + 10, 8 * T, 0],
    ['officechair', 3 * T, 4 * T, -Math.PI / 2], ['officechair', 6 * T, 4 * T, -Math.PI / 2], ['officechair', 3 * T, 7 * T, -Math.PI / 2]];
  for (const [id, x, y, f] of dress) if (id !== 'officechair') map.solid(id, x, y, 0, { facing: f });
  return { map, dress, board: { x: 8 * T, y: 1 * T + 10 }, door: { x: 7 * T, y: 9 * T + 4 }, mabry: { x: 10 * T, y: 3 * T + 8 }, feld: { x: 11 * T, y: 7 * T }, briggs: { x: 6 * T + 4, y: 4 * T + 4 } };
})();
const BASEMENT = (() => {
  const rows = ['##########', '#........#', '#........#', '#........#', '#........#', '#........#', '##########'];
  const map = interior(rows, { '#': 1, '.': { floor: 'concrete' } }, { 1: { h: 36, top: '#222', side: '#7a7a74', face: 'cinder', roof: 'plain', cut: true, cutH: 8 } });
  const dress = [['reel', 3 * T, 2 * T, Math.PI / 2], ['reel', 6 * T + 8, 2 * T, Math.PI / 2], ['officechair', 3 * T, 3 * T + 4, -Math.PI / 2], ['officechair', 6 * T + 8, 3 * T + 4, -Math.PI / 2],
    ['filecab', 8 * T + 6, 5 * T, Math.PI], ['desk', 2 * T, 5 * T, -Math.PI / 2]];
  return { map, dress, seatA: { x: 3 * T, y: 3 * T + 6 }, seatB: { x: 6 * T + 8, y: 3 * T + 6 } };
})();
const STASH = (() => {
  const rows = [
    '############',
    '#....#.....#',
    '#....#.....#',
    '#....D.....#',
    '#....#.....#',
    '##D###..####',
    '#..........#',
    '#..........#',
    '#####..#####'];
  const map = interior(rows, { '#': 1, D: { floor: 'boards' }, '.': { floor: 'boards' } }, { 1: { h: 36, top: '#1a1614', side: '#7a6a58', face: 'plaster', roof: 'plain', cut: true, cutH: 8 } });
  const dress = [['solid', 'couch', 7 * T, 7 * T + 8, { facing: -Math.PI / 2 }], ['solid', 'fridge', 9 * T, 1 * T + 6, { facing: Math.PI / 2 }], ['solid', 'stove', 7 * T + 8, 1 * T + 6, { facing: Math.PI / 2 }],
    ['solid', 'toilet', 1 * T + 8, 1 * T + 6, { facing: Math.PI / 2 }], ['solid', 'mattress', 3 * T, 3 * T, {}], ['prop', 'trashcan', 10 * T + 4, 6 * T + 6, {}]];
  for (const d of dress) if (d[0] === 'solid') map.solid(d[1], d[2], d[3], 0, d[4]);
  // the places to search: two hold what the case needs
  const spots = [
    { id: 'couch', name: 'Couch cushions', x: 7 * T, y: 7 * T, holds: null, note: 'Bottle caps. A cold french fry. Nothing.' },
    { id: 'fridge', name: 'Freezer', x: 9 * T, y: 2 * T + 4, holds: 'package', note: 'Behind the ice trays: the re-up. Bricks, taped tight.' },
    { id: 'toilet', name: 'Toilet tank', x: 1 * T + 8, y: 2 * T + 4, holds: null, note: 'Rust and a dead roach.' },
    { id: 'vent', name: 'Floor vent', x: 4 * T, y: 7 * T, holds: 'ledger', note: 'A spiral notebook. Names. Numbers. A column marked "D".' },
    { id: 'mattress', name: 'Mattress', x: 3 * T, y: 3 * T, holds: null, note: 'Springs and stains. Someone sleeps here.' }
  ];
  return { map, dress, spots, entry: { x: 5 * T + 8, y: 8 * T }, squad: [{ x: 6 * T, y: 6 * T + 8 }, { x: 4 * T, y: 7 * T }] };
})();

// ---- actors: a body, a rig, and what it is doing ----------------------------------------------------------------
class Actor {
  constructor(id, x, y, o = {}) {
    this.id = id; this.name = o.name || id; this.role = o.role || 'civ';
    this.body = new E.Body({ x, y, r: 5 }); this.body.facing = o.facing || 0; this.facing = o.facing || 0;
    this.rig = o.rig || (CAST[id] ? CAST[id].rig : new E.Humanoid(Object.assign({ size: 1.3, weapon: null }, o.look || {})));
    this.speed = o.speed || 34; this.path = []; this.wait = 0; this.state = o.state || 'idle'; this.t = 0; this.pose = null; this.expr = null; this.hidden = false;
    this.sus = 0; this.susState = 'calm'; this.tag = null; this.point = false; this.stance = null; this.down = 0; this.run = 0; this.label = o.label || null; this.ghost = false;
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  goTo(x, y, speed) { this.path = [{ x, y }]; if (speed) this.speed = speed; }
  follow(points, speed) { this.path = points.map(p => ({ x: p.x, y: p.y })); if (speed) this.speed = speed; }
  arrived() { return !this.path.length; }
  face(a) { this.facing = typeof a === 'number' ? a : Math.atan2(a.y - this.y, a.x - this.x); }
  update(dt, map) {
    const b = this.body;
    if (this.path.length) {
      const p = this.path[0], dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
      if (d < 3) { this.path.shift(); b.vx = b.vy = 0; this.stuck = 0; }
      else {
        // a walker that makes no headway for a while skips the point (a car parked on its line, a corner cut)
        const moved = this._lx === undefined ? 1 : Math.hypot(b.x - this._lx, b.y - this._ly);
        this.stuck = moved < this.speed * dt * .25 ? (this.stuck || 0) + dt : 0;
        if (this.stuck > 2.5) { this.stuck = 0; if (this.path.length > 1) this.path.shift(); else { b.x = p.x; b.y = p.y; this.path.shift(); } } b.vx = dx / d * this.speed; b.vy = dy / d * this.speed; this.facing = E.approachAng ? E.approachAng(this.facing, Math.atan2(dy, dx), 10 * dt) : Math.atan2(dy, dx); }
    } else { b.vx = 0; b.vy = 0; }
    this._lx = b.x; this._ly = b.y;
    if (map) b.update(dt, map); else { b.x += b.vx * dt; b.y += b.vy * dt; }
    b.facing = this.facing;
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: this.facing, pose: this.pose || undefined, expr: this.expr || undefined, point: this.point, stance: this.stance || undefined, down: this.down || undefined, run: this.run || undefined });
  }
  draw(r, o = {}) {
    if (this.hidden) return;
    const b = this.body;
    r.shadow(b.x, b.y, 7, .35, undefined, b.groundZ || 0);
    r.actor(b.x, b.y, b.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), Object.assign({ xray: o.xray || false, key: this, every: o.every }, o.ghost ? { alpha: .5 } : {}));
  }
}
function drawTag(r, a, text, color = '#f0ece0') {
  const h = a.rig && a.rig.o ? 44 * (a.rig.o.size || 1.3) / 1.3 : 44;
  r.textAt(a.x, a.y, (a.z || 0) + h, text, color);
}
// sight: where a lookout's eyes can reach, as E.sees with the height rules, plus a blending multiplier
function canSee(watcher, target, map, o = {}) {
  const s = E.sees({ x: watcher.x, y: watcher.y, z: watcher.z || 0, facing: watcher.facing }, target, { range: o.range || 130, fov: o.fov || 1.5, map });
  return s;
}

// ---- 03-street.js ----
// ============================================================================================================
// REWIRED • 03 street: the block in every mode. 'coldopen' (a body in the Courts), 'corner' (TAPE ONE: the CI,
// the hand-to-hands, the stash, the collection, the tail), 'reup' (TAPE FOUR: the stakeout, the handoff, the raid,
// the chase), 'shift' (the AI Hub round and local 1-2 player surveillance shift) and 'demo' (the attract mode).
// ============================================================================================================
Object.assign(EVIDENCE, {
  payphone: { name: 'The payphone', who: 'TAY', text: 'Tay takes the 11:40 call at Lorraine and Fulton.' },
  handoff: { name: 'The handoff', who: 'TAY', text: 'Tay and Deacon\'s courier swap a duffel for a gym bag.' },
  plate: { name: 'Courier\'s plate', who: 'DEACON', text: 'A grey Lincoln. The plate runs to a Deacon-owned car lot.' },
  arrest: { name: 'Squeak in cuffs', who: 'SQUEAK', text: 'Squeak, sixteen, caught in the alley behind 1419.' },
  package: { name: 'The re-up', who: 'TAY', text: 'Four bricks in the freezer at 1419 Lorraine.' },
  ledger: { name: 'The ledger', who: 'DEACON', text: 'A notebook of counts. A column marked "D".' }
});
CAST.PRUITT = { rig: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'short', colors: { skin: '#3a2618', hair: '#101010', cloth: '#e8e8e8', coat: '#5a5a62', pants: '#2a2a30', boot: '#1a1a1a' } }), name: 'PRUITT' };
VOICES.PRUITT = { f: 85, w: 'square' };

const ST = { mode: null, demo: false, players: [], npcs: {}, crowd: [], cars: [], stage: 0, t: 0, scatter: 0, sale: null, saleN: 0, coolBurn: 0, clock: 0, score: 0,
  shiftLen: 180, shiftLeft: 180, tayT: 0, collect: null, tail: null, chase: null, raid: null, handoff: null, banner: null, ghosts: {}, sentAt: 0, ended: false, bot: null, demoT: 0, flashT: 0, lastPhoto: null };
const SHIFT_SCORE = { h2h: 100, stash: 150, collect: 300, tay: 120, lookouts: 60, burn: -150 };
const RANGE = 260, FRAME_R = 26;

// ---- a vehicle that drives a path (not solid while it moves) --------------------------------------------------------
class Car {
  constructor(x, y, facing, o = {}) { this.x = x; this.y = y; this.facing = facing; this.speed = o.speed || 90; this.path = []; this.shape = o.shape || 'sedan'; this.color = o.color || '#202020'; this.lights = !!o.lights; this.siren = 0; this.hidden = !!o.hidden; }
  drive(points, speed) { this.path = points.slice(); if (speed) this.speed = speed; }
  update(dt) {
    if (!this.path.length) return;
    const p = this.path[0], dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
    if (d < 4) { this.path.shift(); return; }
    const sp = Math.min(this.speed, 30 + d * 1.2); this.x += dx / d * sp * dt; this.y += dy / d * sp * dt;
    this.facing = E.approachAng ? E.approachAng(this.facing, Math.atan2(dy, dx), 3 * dt) : Math.atan2(dy, dx);
  }
  get moving() { return this.path.length > 0; }
  draw(r) {
    if (this.hidden) return;
    r.shape(this.shape, this.x, this.y, 0, { facing: this.facing, mats: this.shape === 'sedan' ? { b: { color: this.color, pattern: 'glaze' } } : undefined });
    const c = Math.cos(this.facing), s = Math.sin(this.facing);
    if (this.moving || NIGHT.on) game.lights.add(this.x + c * 30, this.y + s * 30, 6, 46, .7, { color: '#fff0c0' });
    if (this.lights) { const on = Math.floor(game.time * 4) % 2; game.lights.add(this.x, this.y, 20, 70, .9, { color: on ? '#ff2020' : '#2040ff' }); }
  }
}

// ---- players: a detective each (Kowal, and Briggs when a second player joins) -----------------------------------
function makePlayer(i, x, y, input) {
  const id = i === 0 ? 'KOWAL' : 'BRIGGS';
  const mover = new E.Mover({ x, y, r: 5, staminaMax: 100, walk: 52, run: 82, sprintSpeed: 128, sneak: 34, vault: 14 });
  mover.facing = 0;
  return { i, id, mover, rig: CAST[id].rig, input, aim: false, rx: x + 40, ry: y, crouch: false, inCar: null, still: 0, blend: null, film: 36, tackle: 0, tackleT: 0, cons: 0 };
}
const P1 = () => ST.players[0];
function playerAt(p) { return { x: p.mover.x, y: p.mover.y, z: p.mover.z }; }

// ---- set up a mode ----------------------------------------------------------------------------------------------------
function streetSetup(mode, data = {}) {
  const S = STREET, map = S.map;
  ST.mode = mode; ST.demo = !!data.demo; ST.stage = data.stage || 0; ST.t = 0; ST.scatter = 0; ST.sale = null; ST.saleN = 0; ST.saleWait = 3; ST.tayShot = false; ST.lookShot = false; ST.squad = []; ST.coolBurn = 0; ST.score = 0; ST.ended = false;
  ST.collect = null; ST.tail = null; ST.chase = null; ST.raid = null; ST.handoff = null; ST.banner = null; ST.cars = []; ST.crowd = []; ST.npcs = {}; ST.ghosts = {}; ST.bot = null; ST.demoT = 0; ST.lastPhoto = null;
  NIGHT.on = mode === 'reup' || mode === 'coldopen'; STREET.wet = NIGHT.on;
  // players
  const start = mode === 'reup' ? S.P(36, 30) : mode === 'coldopen' ? S.P(17, 22) : S.playerStart;
  ST.players = [makePlayer(0, start.x, start.y, I)];
  if (mode === 'shift' || mode === 'corner' || mode === 'reup') {
    for (const inp of game.players.slice(1)) ST.players.push(makePlayer(ST.players.length, start.x + 12, start.y + 8, inp));
  }
  // the corner crew
  const N = ST.npcs;
  const crew = mode === 'corner' || mode === 'shift' || mode === 'demo';
  if (crew) {
    N.junebug = new Actor('JUNEBUG', S.hopperSpot.x, S.hopperSpot.y, { role: 'hopper', label: 'JUNEBUG', facing: Math.PI / 2 });
    N.squeak = new Actor('SQUEAK', S.runnerSpot.x, S.runnerSpot.y, { role: 'runner', label: 'SQUEAK', facing: Math.PI });
    N.moe = new Actor('MOE', S.moeSpot.x, S.moeSpot.y, { role: 'boss', label: 'LITTLE MOE', facing: -Math.PI / 2 });
    N.kevo = new Actor('KEVO', S.lookoutA.x, S.lookoutA.y, { role: 'lookout', label: 'KEVO', facing: 0 });
    N.dre = new Actor('DRE', S.lookoutB.x, S.lookoutB.y, { role: 'lookout', label: 'DRE', facing: Math.PI / 2 });
    N.kevo.scan = [-.4, .8, Math.PI / 2, Math.PI - .3, .2]; N.dre.scan = [Math.PI / 2, Math.PI * .85, Math.PI / 2 + .2, .3, Math.PI * .7];
    for (const k of ['kevo', 'dre']) { N[k].scanI = 0; N[k].scanT = 2 + Math.random() * 2; N[k].home = { x: N[k].x, y: N[k].y }; }
    for (const k of ['junebug', 'squeak', 'moe']) N[k].home = { x: N[k].x, y: N[k].y };
  }
  if (mode === 'corner' && !ST.demo) {
    N.pigeon = new Actor('PIGEON', S.alleyMeet.x, S.alleyMeet.y, { role: 'ci', label: 'PIGEON', facing: Math.PI / 2 });
    N.pigeon.cart = true;
  }
  // the block's own people: walkers on the sidewalks, a grandmother on a stoop, kids
  const civ = (x, y, look, route, speed) => { const a = new Actor('civ' + ST.crowd.length, x, y, { look, role: 'civ', speed: speed || 26 }); a.route = route; a.ri = 0; ST.crowd.push(a); return a; };
  const looks = [
    { build: 'chibi', outfit: 'coat', hair: 'long', colors: { skin: '#6a442e', hair: '#2a1a14', coat: '#7a3a5a', pants: '#2a2a3a' } },
    { build: 'heroic', outfit: 'shirt', hat: { style: 'cap', color: '#8a2a2a' }, colors: { skin: '#e0b090', cloth: '#5a6a7a', pants: '#3a3a40' } },
    { build: 'bulky', outfit: 'coat', hair: 'short', colors: { skin: '#4a3020', hair: '#c8c8c8', coat: '#4a4a3a', pants: '#3a3a30' } },
    { build: 'chibi', size: 1, outfit: 'shirt', hair: 'spiky', colors: { skin: '#5a3a26', cloth: '#e8b03a', pants: '#3a5a8a' } },
    { build: 'chibi', outfit: 'robe', hair: 'ponytail', colors: { skin: '#7a5038', hair: '#1a1210', cloth: '#5a7a8a' } }
  ];
  const sw = (cx, cy) => S.P(cx, cy);
  if (mode !== 'coldopen') {
    civ(sw(2, 13).x, sw(2, 13).y, looks[0], [sw(2, 13), sw(13, 13), sw(13, 30), sw(2, 30)]);
    civ(sw(50, 8).x, sw(50, 8).y, looks[1], [sw(50, 8), sw(62, 8), sw(62, 13), sw(50, 13)], 30);
    civ(sw(44, 20).x, sw(44, 20).y, looks[2], [sw(44, 20), sw(44, 34), sw(44, 20)], 18);
    civ(sw(30, 30).x, sw(30, 30).y, looks[3], [sw(28, 30), sw(40, 30), sw(40, 26), sw(28, 26)], 40);
    civ(sw(56, 35).x, sw(56, 35).y, looks[4], [sw(56, 35), sw(51, 35), sw(51, 30), sw(56, 30)], 22);
    const nana = civ(38 * T, 7 * T + 13, { build: 'chibi', outfit: 'robe', hair: 'short', hunch: .3, colors: { skin: '#5a3a28', hair: '#d8d8d8', cloth: '#8a4a6a' } }, null);
    nana.pose = 'kneel'; nana.facing = Math.PI / 2;
  }
  // the fiends: buyers who come to the corner
  ST.fiendLooks = [
    { build: 'chibi', outfit: 'coat', hood: true, hunch: .4, colors: { skin: '#a87858', hair: '#3a3a3a', coat: '#4a4a40', pants: '#3a342a' } },
    { build: 'heroic', outfit: 'shirt', hair: 'short', hunch: .3, colors: { skin: '#e0b8a0', hair: '#7a5a3a', cloth: '#8a8a6a', pants: '#4a4a5a' } },
    { build: 'chibi', outfit: 'coat', hair: 'long', hunch: .3, colors: { skin: '#6a4430', hair: '#3a2a1a', coat: '#6a2a3a', pants: '#2a2a2a' } }
  ];
  // vehicles
  if (mode === 'reup') {
    ST.cars.push(Object.assign(new Car(70 * T, 33 * T, Math.PI, { color: '#6a6a72', hidden: true }), { id: 'courier' }));
  }
  // lights and weather
  game.lights.enabled = true;
  game.lights.ambient = NIGHT.on ? .3 : .62;
  if (game.lights.tint !== undefined) game.lights.tint = NIGHT.on ? '#203060' : '#604030';
  game.weather = NIGHT.on ? { kind: 'rain', amount: .65, wind: .25, lightning: mode === 'reup' ? .03 : 0 } : null;
  music(mode === 'reup' || mode === 'coldopen' ? 'night' : 'street');
  // mode scripts
  if (mode === 'coldopen') coldOpenSetup();
  if (mode === 'corner') cornerSetup(data);
  if (mode === 'reup') reupSetup(data);
  if (mode === 'shift') shiftSetup(data);
  if (mode === 'demo') demoSetup(data);
  if (mode === 'chasedemo') { chaseStart(true); }
}

// ---- the sale cycle: buyer pays the hopper, the runner fetches from the stash, the buyer gets it round the corner -----
function saleTick(dt) {
  const N = ST.npcs, S = STREET;
  if (!N.junebug) return;
  if (ST.scatter > 0) return;
  let s = ST.sale;
  if (!s) { ST.saleWait = (ST.saleWait === undefined ? 3 : ST.saleWait) - dt; if (ST.saleWait > 0) return; s = ST.sale = { phase: 'approach', t: 0, n: ++ST.saleN, shot: {} };
    const look = ST.fiendLooks[ST.saleN % ST.fiendLooks.length], from = E.pick([S.P(2, 13), S.P(17, 2), S.P(19, 29), S.P(30, 13)]);
    s.fiend = new Actor('fiend' + ST.saleN, from.x, from.y, { look, role: 'fiend', speed: 30 }); s.fiend.goTo(S.hopperSpot.x + 10, S.hopperSpot.y + 2); s.from = from; }
  s.t += dt;
  const f = s.fiend, J = N.junebug, Q = N.squeak;
  f.update(dt, S.map);
  if (s.phase === 'approach' && f.arrived()) { s.phase = 'pay'; s.t = 0; f.face(J); J.face(f); f.pose = 'cast'; J.pose = 'cast'; }
  else if (s.phase === 'pay' && s.t > 2.6) { s.phase = 'signal'; s.t = 0; f.pose = null; J.pose = null; J.face(Q); Q.goTo(S.stash.x, S.stash.y, 40); f.goTo(S.P(22, 13).x + 8, S.P(22, 13).y + 4); }
  else if (s.phase === 'signal' && Q.arrived()) { s.phase = 'grab'; s.t = 0; Q.pose = 'kneel'; Q.face(-Math.PI / 2); }
  else if (s.phase === 'grab' && s.t > 2.2) { s.phase = 'deliver'; s.t = 0; Q.pose = null; Q.goTo(f.x - 8, f.y + 6, 42); }
  else if (s.phase === 'deliver' && Q.arrived()) { s.phase = 'hand'; s.t = 0; Q.face(f); f.face(Q); Q.pose = 'cast'; f.pose = 'cast'; }
  else if (s.phase === 'hand' && s.t > 1.3) { s.phase = 'leave'; s.t = 0; Q.pose = null; f.pose = null; f.goTo(s.from.x, s.from.y, 34); Q.goTo(Q.home.x, Q.home.y, 36); J.face(Math.PI / 2); }
  else if (s.phase === 'leave' && (f.arrived() || s.t > 14)) { ST.sale = null; ST.saleWait = 3 + Math.random() * 4; }
}
function scatterCorner() {
  const N = ST.npcs, S = STREET;
  ST.scatter = 16;
  if (ST.sale) { const f = ST.sale.fiend; ST.sale.phase = 'leave'; f.pose = null; f.goTo(ST.sale.from.x, ST.sale.from.y, 50); }
  const hide = [S.P(30, 24), S.P(34, 27), S.P(28, 28)];
  ['junebug', 'squeak', 'moe'].forEach((k, i) => { if (N[k]) { N[k].pose = null; N[k].goTo(S.P(26, 20).x, S.P(26, 20).y, 60); N[k].path.push(hide[i]); } });
}
function unscatterTick(dt) {
  if (ST.scatter <= 0) return;
  ST.scatter -= dt;
  if (ST.scatter <= 0) { const N = ST.npcs; for (const k of ['junebug', 'squeak', 'moe']) if (N[k]) N[k].follow([STREET.P(26, 20), N[k].home], 34); ST.sale = null; ST.saleWait = 6; }
}

// ---- lookouts: scan, notice, warn, burn -------------------------------------------------------------------------------
function conspicuous(p) {
  if (p.inCar) return p.aim ? .35 : 0;
  const m = p.mover;
  let c = .45;
  if (p.blend && p.still > .8) c = p.aim ? .55 : .2;
  else if (p.aim) c = 2.6;
  else if (m.sprinting) c = 1.5;
  else if (p.still > 2.5) c = .9;
  if (p.crouch && !p.aim) c *= .75;
  return c;
}
function lookoutTick(dt) {
  const N = ST.npcs, map = STREET.map;
  if (ST.coolBurn > 0) ST.coolBurn -= dt;
  for (const k of ['kevo', 'dre']) {
    const L = N[k]; if (!L) continue;
    let best = 0, bestP = null;
    if (!ST.demo && ST.coolBurn <= 0 && ST.scatter <= 0) for (const p of ST.players) {
      const at = playerAt(p), seen = canSee(L, Object.assign({ crouch: p.crouch }, at), map, { range: 135, fov: 1.5 });
      const dd = E.dist(L, at), prox = dd < 40 ? 1.6 : dd < 80 ? 1.1 : .6;
      const exposure = p.inCar ? (seen.seen ? .5 : 0) : seen.seen ? seen.exposure : 0;
      const rate = exposure * conspicuous(p) * prox * .5;
      p.cons = Math.max(p.cons, rate);
      if (rate > best) { best = rate; bestP = p; }
    }
    if (best > 0) L.sus = Math.min(1.2, L.sus + best * dt); else L.sus = Math.max(0, L.sus - .2 * dt);
    const was = L.susState;
    L.susState = L.sus >= 1 ? 'alert' : L.sus >= .7 ? 'search' : L.sus >= .35 ? 'notice' : 'calm';
    if (L.susState !== 'calm' && bestP) L.face(playerAt(bestP));
    else if (ST.scatter <= 0) { L.scanT -= dt; if (L.scanT <= 0) { L.scanI = (L.scanI + 1) % L.scan.length; L.scanT = 2.2 + Math.random() * 2.5; } L.facing = E.approachAng(L.facing, L.scan[L.scanI], 2.5 * dt); }
    if (was !== 'search' && L.susState === 'search') { A.sfx('whistle', { vol: .6 }); bubble(L, '?!', '#f0c040'); }
    if (L.susState === 'alert') burn(L);
  }
}
function burn(L) {
  const N = ST.npcs;
  bubble(L, 'FIVE-O! FIVE-O!', '#ff5040', 2.5);
  A.sfx('whistle'); A.sfx('whistle', { pitch: .8 });
  game.shake && game.shake(2);
  for (const k of ['kevo', 'dre']) if (N[k]) { N[k].sus = .2; N[k].susState = 'calm'; }
  ST.coolBurn = 14;
  scatterCorner();
  if (ST.mode === 'shift') { ST.score += SHIFT_SCORE.burn; toast('BURNED', 'The corner made you. -150. Back off and let it cool.'); }
  else if (ST.mode === 'corner' || ST.mode === 'reup') {
    CASE.heat++; CASE.burns++;
    toast('BURNED', CASE.heat >= 3 ? 'They know your face now.' : 'The corner made you. Heat ' + CASE.heat + ' of 3. Let it cool.');
    if (CASE.heat >= 3) game.after(2.2, () => game.go('gameover', { why: 'blown', retry: { scene: 'street', mode: ST.mode, stage: ST.stage } }));
  }
}
const BUBBLES = [];
function bubble(a, text, color = '#f0ece0', t = 1.8) { BUBBLES.push({ a, text, color, t }); }

// ---- the camera: aim, frame, shoot, and what the picture shows -------------------------------------------------------------
function aimTick(p, dt, ctl) {
  const m = p.mover;
  const wasAim = p.aim;
  p.aim = !!ctl.aim && p.film > 0;
  const from = p.inCar ? { x: p.inCar.x, y: p.inCar.y } : { x: m.x, y: m.y };
  if (p.aim && !wasAim) {   // start framed on the nearest thing worth a picture in front
    const subjects = photoSubjects().filter(s => E.dist(s, from) < RANGE);
    let best = null, bd = 1e9;
    for (const s of subjects) { const a = Math.atan2(s.y - from.y, s.x - from.x), d = Math.abs(E.angDiff ? E.angDiff(a, m.facing) : 0) * 60 + E.dist(s, from); if (d < bd) { bd = d; best = s; } }
    if (best && !ctl.mouse) { p.rx = best.x; p.ry = best.y; } else { p.rx = from.x + Math.cos(m.facing) * 60; p.ry = from.y + Math.sin(m.facing) * 60; }
    A.sfx('click');
  }
  if (!p.aim) return;
  if (ctl.mouse) { p.rx = ctl.mouse[0]; p.ry = ctl.mouse[1]; }
  else if (ctl.aimMove) { p.rx += ctl.aimMove[0] * 150 * dt; p.ry += ctl.aimMove[1] * 150 * dt; }
  const dx = p.rx - from.x, dy = p.ry - from.y, d = Math.hypot(dx, dy);
  if (d > RANGE) { p.rx = from.x + dx / d * RANGE; p.ry = from.y + dy / d * RANGE; }
  if (!p.inCar) m.facing = Math.atan2(p.ry - m.y, p.rx - m.x);
  if (ctl.shoot) takePhoto(p);
}
function photoSubjects() {
  const N = ST.npcs, out = [];
  for (const k in N) if (N[k] && !N[k].hidden) out.push(N[k]);
  if (ST.sale && ST.sale.fiend) out.push(ST.sale.fiend);
  return out;
}
function inFrame(p, a) {
  if (!a || a.hidden) return false;
  const from = p.inCar ? { x: p.inCar.x, y: p.inCar.y, z: 8 } : playerAt(p);
  if (Math.hypot(a.x - p.rx, a.y - p.ry) > FRAME_R) return false;
  if (E.dist(a, from) > RANGE) return false;
  const clear = STREET.map.sight ? STREET.map.sight({ x: from.x, y: from.y, z: from.z || 0 }, { x: a.x, y: a.y, z: a.z || 0 }) : true;
  return !!clear;
}
function takePhoto(p) {
  if (p.film <= 0) return;
  p.film--; CASE.photos++;
  A.sfx('shutter'); ST.flashT = .12;
  const N = ST.npcs, s = ST.sale, got = [];
  const give = (id, pts) => {
    if (ST.mode === 'shift') { ST.score += pts; got.push(EVIDENCE[id] ? EVIDENCE[id].name : id); return true; }
    if (addEvidence(id)) { got.push(EVIDENCE[id].name); return true; }
    return false;
  };
  if (s && s.phase === 'pay' && inFrame(p, N.junebug) && inFrame(p, s.fiend) && !s.shot.pay) {
    s.shot.pay = true;
    if (ST.mode === 'shift') give('h2h', SHIFT_SCORE.h2h);
    else if (!hasEv('h2h1')) give('h2h1'); else give('h2h2');
  }
  if (s && s.phase === 'hand' && inFrame(p, N.squeak) && inFrame(p, s.fiend) && !s.shot.hand) {
    s.shot.hand = true;
    if (ST.mode === 'shift') give('h2h', SHIFT_SCORE.h2h); else if (!hasEv('h2h1')) give('h2h1'); else give('h2h2');
  }
  if (s && s.phase === 'grab' && inFrame(p, N.squeak) && !s.shot.grab) { s.shot.grab = true; give('stash', SHIFT_SCORE.stash); }
  if (ST.collect && ST.collect.phase === 'give' && inFrame(p, N.tay) && inFrame(p, N.moe) && !ST.collect.shot) { ST.collect.shot = true; give('collect', SHIFT_SCORE.collect); }
  if (N.tay && inFrame(p, N.tay) && !(ST.mode === 'shift' && ST.tayShot)) { if (give('tay', SHIFT_SCORE.tay)) ST.tayShot = true; }
  if ((inFrame(p, N.kevo) || inFrame(p, N.dre)) && !(ST.mode === 'shift' && ST.lookShot)) { if (give('lookouts', SHIFT_SCORE.lookouts)) ST.lookShot = true; }
  if (ST.mode === 'reup' && ST.handoff) {
    const H = ST.handoff;
    if (H.phase === 'call' && inFrame(p, N.tay)) give('payphone');
    if ((H.phase === 'swap' || H.phase === 'walk') && inFrame(p, N.tay) && inFrame(p, N.pruitt)) give('handoff');
    const car = ST.cars.find(c => c.id === 'courier');
    if (car && !car.hidden && Math.hypot(car.x - p.rx, car.y - p.ry) < FRAME_R + 10 && E.dist(car, p.inCar || playerAt(p)) < RANGE) give('plate');
  }
  ST.lastPhoto = { t: 2.2, got };
  if (got.length) { A.sfx('pickup'); toast(ST.mode === 'shift' ? 'PHOTO' : 'EVIDENCE', got.join(' • ')); }
  else toast('PHOTO', 'Nothing a judge would care about.', 1.6);
}

// ---- interactions: talk, the car, vaulting --------------------------------------------------------------------------------
function nearestInteract(p) {
  const m = p.mover, at = { x: m.x, y: m.y }, N = ST.npcs, list = [];
  if (p.inCar) return { label: 'Get out', fn: () => exitCar(p) };
  if (N.pigeon && !N.pigeon.hidden && ST.mode === 'corner' && ST.stage === 0 && E.dist(at, N.pigeon) < 26) list.push({ d: E.dist(at, N.pigeon), label: 'Talk to Pigeon', fn: pigeonTalk });
  if (ST.mode === 'coldopen' && N.uniform && E.dist(at, N.uniform) < 28 && ST.stage === 0) list.push({ d: 0, label: 'Talk to the uniform', fn: coldOpenTalk });
  for (const [i, c] of [[0, STREET.car1], [1, STREET.car2]]) if (E.dist(at, c) < 30 && (ST.mode !== 'reup' || i === 1)) list.push({ d: E.dist(at, c), label: 'Get in the car', fn: () => enterCar(p, c) });
  if (ST.mode === 'reup' && ST.stage === 4 && E.dist(at, STREET.houseDoor) < 30) list.push({ d: 0, label: 'Search 1419', fn: () => game.go('stash', {}) });
  list.sort((a, b) => a.d - b.d);
  return list[0] || null;
}
function enterCar(p, c) { p.inCar = c; p.aim = false; A.sfx('door2'); p.mover.x = c.x; p.mover.y = c.y + 14; }
function exitCar(p) { const c = p.inCar; p.inCar = null; p.aim = false; A.sfx('door2'); p.mover.x = c.x; p.mover.y = c.y + 16; p.mover.vx = p.mover.vy = 0; }

// ---- a player's step: the stick, the buttons, the camera ------------------------------------------------------------------------
function readControls(p) {
  const inp = p.input, m = inp.move(), g = game.view.screenDirToGround(m[0], m[1]);
  const mouse = (inp === I && I.lastDevice === 'mouse' && game.mouseGround) ? game.mouseGround() : null;
  let aimMove = null;
  if (inp.padAim) { const a = game.view.screenDirToGround(inp.padAim[0], inp.padAim[1]); aimMove = a; }
  else if (Math.hypot(g[0], g[1]) > .1) aimMove = g;
  return { move: g, sprint: inp.down('sprint'), crouchP: inp.pressed('crouch'), interact: inp.pressed('interact'), act2: inp.pressed('act2'), aim: inp.down('aim'),
    shoot: inp.pressed('shoot') || (inp.down('aim') && inp.pressed('interact')), mouse: mouse ? [mouse[0], mouse[1]] : (mouse === null ? null : null), aimMove, view: inp.pressed('view'), notes: inp.pressed('notes') };
}
function playerTick(p, dt, ctl) {
  const m = p.mover, map = STREET.map;
  if (ctl.crouchP && !p.inCar) { p.crouch = !p.crouch; }
  if (ctl.mouse && game.mouseGround) { const mg = game.mouseGround(); if (mg) ctl.mouse = [mg[0], mg[1]]; }
  aimTick(p, dt, ctl);
  const it = !p.aim ? nearestInteract(p) : null;
  p.interact = it;
  if (it && ctl.interact) { it.fn(); return; }
  if (p.inCar) { m.vx = m.vy = 0; p.still += dt; p.blend = { name: 'In the car' }; return; }
  const mv = p.aim ? [0, 0] : ctl.move;
  const nearFence = !p.aim && ST.chase && (ctl.interact || ctl.sprint) ? true : false;
  m.update(dt, map, { move: mv, sprint: ctl.sprint && !p.aim, crouch: p.crouch, jumpPressed: nearFence && ctl.interact });
  const moving = Math.hypot(m.vx, m.vy) > 6;
  p.still = moving ? 0 : p.still + dt;
  p.blend = null;
  for (const b of STREET.blend) if (Math.hypot(b.x - m.x, b.y - m.y) < b.r) { p.blend = b; break; }
  // tackle (the chase)
  if (p.tackleT > 0) p.tackleT -= dt;
  if (ctl.act2 && ST.chase && p.tackleT <= 0) { p.tackleT = .6; m.push && m.push(Math.cos(m.facing) * 160, Math.sin(m.facing) * 160, 60); A.sfx('whoosh'); chaseTackle(p); }
  p.rig.update(dt, m.rigState({ point: p.aim, dash: p.tackleT > .3 }));
}

// ---- the scene -------------------------------------------------------------------------------------------------------------
const street = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.75, 2], start: 1 },
  enter(data = {}) { sceneReset();
    game.cam.bounds = v => STREET.map.bounds(v);
    game.cam.smooth = .12;
    streetSetup(data.mode || 'corner', data);
    try { game.allowJoin({ max: 2, onJoin: (inp, n) => { if (['shift', 'corner', 'reup'].includes(ST.mode) && ST.players.length < 2) { const p0 = P1().mover; ST.players.push(makePlayer(1, p0.x + 10, p0.y + 8, inp)); toast('PARTNER', 'Det. Lonnie Briggs rolls up. Player 2 joined.'); } } }); } catch (e) {}
  },
  exit() { game.weather = null; game.lights.enabled = false; BUBBLES.length = 0; NIGHT.on = false; STREET.wet = false; try { game.cam.frame && game.cam.frame(null); } catch (e) {} },
  update(dt) {
    toastTick(dt);
    if (ST.demo || ST.mode === 'demo' || ST.mode === 'chasedemo') { if (demoInputBreak()) return; }
    if (notesTick()) return;
    if (talkTick(dt)) { for (const p of ST.players) p.rig.update(dt, p.mover.rigState({})); return; }
    ST.t += dt;
    if (ST.flashT > 0) ST.flashT -= dt;
    if (ST.lastPhoto) { ST.lastPhoto.t -= dt; if (ST.lastPhoto.t <= 0) ST.lastPhoto = null; }
    for (const b of BUBBLES) b.t -= dt; while (BUBBLES.length && BUBBLES[0].t <= 0) BUBBLES.shift();
    // players
    for (const p of ST.players) {
      p.cons = 0;
      const ctl = ST.bot && p.i === 0 ? ST.bot(p, dt) : readControls(p);
      if (p.i === 0 && !ST.bot) {
        if (ctl.view) { game.nextView(); game.note && game.note(String(game.view.label || game.view.id || 'VIEW').toUpperCase()); }
        if (ctl.notes && !IN_HUB) { NOTES.open = true; A.sfx('select'); }
      }
      playerTick(p, dt, ctl);
    }
    // the world
    const map = STREET.map;
    for (const k in ST.npcs) { const a = ST.npcs[k]; if (a && !a.static) a.update(dt, map); }
    for (const a of ST.crowd) { if (a.route) { if (a.arrived()) { a.ri = (a.ri + 1) % a.route.length; a.goTo(a.route[a.ri].x, a.route[a.ri].y); } } a.update(dt, map); }
    for (const c of ST.cars) c.update(dt);
    if (ST.npcs.junebug) { saleTick(dt); unscatterTick(dt); lookoutTick(dt); }
    if (ST.mode === 'corner') cornerTick(dt);
    if (ST.mode === 'reup') reupTick(dt);
    if (ST.mode === 'shift') shiftTick(dt);
    if (ST.mode === 'coldopen') coldOpenTick(dt);
    if (ST.mode === 'demo' || ST.mode === 'chasedemo') demoTick(dt);
    if (ST.chase) chaseTick(dt);
    // the camera
    const p = P1();
    if (ST.players.length > 1 && game.cam.frame) game.cam.frame(ST.players.map(q => ({ x: q.mover.x, y: q.mover.y, z: 0 })), { margin: 60, zoom: [.6, 1] });
    else {
      const from = p.inCar ? p.inCar : p.mover;
      const fx = p.aim ? lerp(from.x, p.rx, .5) : from.x, fy = p.aim ? lerp(from.y, p.ry, .5) : from.y;
      game.focus(fx, fy, 14);
    }
    hubGhostTick(dt);
  },
  draw(r) { drawStreet(r); }
};

function drawStreet(r) {
  const map = STREET.map, N = ST.npcs;
  map.drawFloor(r); map.queueWalls(r);
  for (const d of STREET.dress) {
    if (d[0] === 'prop') r.prop(d[1], d[2], d[3], 0, d[4]);
    else if (d[4] && d[4].car !== undefined) { const c = STREET.cars[d[4].car]; r.shape('sedan', d[2], d[3], 0, { facing: d[4].facing, mats: { b: { color: c[3], pattern: 'glaze' } } }); }
    else r.shape(d[1], d[2], d[3], 0, d[4]);
  }
  // sneakers on the wire over Calhoun: two lamp tops joined by a sagging line
  const a = r.w(14 * T + 8, 13 * T + 8, 44), b = r.w(19 * T + 8, 13 * T + 8, 44);
  r.queue(16.5 * T, 13 * T + 8, 40, g => {
    let prev = a;
    for (let i = 1; i <= 10; i++) { const t = i / 10, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t) + Math.sin(t * Math.PI) * 6; px.line(g, prev[0], prev[1], x, y, '#141414'); prev = [x, y]; }
    const mx = lerp(a[0], b[0], .45), my = lerp(a[1], b[1], .45) + Math.sin(.45 * Math.PI) * 6;
    px.line(g, mx, my, mx - 1, my + 5, '#e8e8e8'); px.line(g, mx + 2, my, mx + 3, my + 4, '#e8e8e8'); px.rect(g, mx - 3, my + 5, 4, 2, '#f0f0f0'); px.rect(g, mx + 2, my + 4, 4, 2, '#f0f0f0');
  });
  // sight cones
  if (setting('cones', true) && !ST.demo) for (const k of ['kevo', 'dre']) { const L = N[k]; if (L && !L.hidden) r.sightCone(L, { map, range: 135, fov: 1.5, color: L.susState === 'calm' ? '#ffe080' : L.susState === 'notice' ? '#ffa040' : '#ff4030', alpha: .22 }); }
  if (ST.tail && ST.tail.look > 0) r.sightCone(N.squeak, { map, range: 110, fov: 1.3, color: '#ff6040', alpha: .3 });
  // the body in the cold open
  if (ST.mode === 'coldopen') r.queue(STREET.P(31, 23).x, STREET.P(31, 23).y, 0, g => { const c = r.w(STREET.P(31, 23).x, STREET.P(31, 23).y, 1); px.ell(g, c[0], c[1], 13, 5, '#d8d8d0'); px.ell(g, c[0] - 2, c[1] - 1, 10, 3, '#f0f0e8'); px.rect(g, c[0] + 10, c[1] + 1, 4, 2, '#5a3a26'); });
  // actors
  for (const k in N) { const a2 = N[k]; if (a2) a2.draw(r, { xray: false }); }
  if (ST.sale && ST.sale.fiend) ST.sale.fiend.draw(r);
  for (const a3 of ST.crowd) a3.draw(r, { every: 2 });
  for (const c of ST.cars) c.draw(r);
  for (const p of ST.players) {
    if (p.inCar) continue;
    const m = p.mover;
    r.shadow(m.x, m.y, 7, .35, undefined, m.groundZ || 0);
    r.actor(m.x, m.y, m.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), { xray: { color: p.i ? '#5a8ae8' : '#e8c060', actors: true } });
    if (p.aim) { const h = p.rig.hand ? p.rig.hand('R') : null; if (h) r.queue(h.x, h.y, h.z, g => { const q = r.w(h.x, h.y, h.z); px.rect(g, q[0] - 2, q[1] - 2, 5, 3, '#141414'); px.rect(g, q[0] - 1, q[1] - 1, 2, 1, '#6a8aa8'); }, { bias: 2 }); }
  }
  drawGhosts(r);
  // tags over the crew once Pigeon has named them
  if (CASE.pigeonPaid || ST.mode !== 'corner') for (const k in N) { const x = N[k]; if (x && x.label && !x.hidden && (ST.mode !== 'corner' || CASE.pigeonPaid !== 10 || ['junebug', 'squeak'].includes(k) || k === 'pigeon')) drawTag(r, x, x.label, x.role === 'lookout' ? (x.susState === 'calm' ? '#c8c4bc' : '#ff8060') : '#c8c4bc'); }
  for (const k of ['kevo', 'dre']) { const L = N[k]; if (L && L.susState !== 'calm') r.textAt(L.x, L.y, 62, L.susState === 'notice' ? '?' : '!', L.susState === 'notice' ? '#f0c040' : '#ff4030'); }
  for (const b of BUBBLES) r.textAt(b.a.x, b.a.y, 70, b.text, b.color);
  // objective markers
  if (setting('hints', true) && !ST.demo) for (const mk of streetMarkers()) r.marker(mk.x, mk.y, mk.z || 30, { label: mk.label });
  drawStreetHud(r);
}
function streetMarkers() {
  const out = [], N = ST.npcs;
  if (ST.mode === 'corner') {
    if (ST.stage === 0 && N.pigeon) out.push({ x: N.pigeon.x, y: N.pigeon.y, label: 'PIGEON' });
    if (ST.stage === 1 || ST.stage === 2) out.push({ x: STREET.corner.x, y: STREET.corner.y, label: 'THE CORNER' });
    if (ST.stage === 3 && N.tay) out.push({ x: N.tay.x, y: N.tay.y, z: 48, label: 'BLACK CAP' });
    if (ST.stage === 4 && N.squeak) out.push({ x: N.squeak.x, y: N.squeak.y, z: 46, label: 'SQUEAK' });
  }
  if (ST.mode === 'coldopen' && ST.stage === 0 && N.uniform) out.push({ x: N.uniform.x, y: N.uniform.y, label: 'THE SCENE' });
  if (ST.mode === 'reup') {
    if (ST.stage === 0) out.push({ x: STREET.car2.x, y: STREET.car2.y, label: 'THE CAR' });
    if (ST.stage === 2) out.push({ x: STREET.houseBack.x, y: STREET.houseBack.y, label: 'COVER THE BACK' });
    if (ST.stage === 3 && N.squeak) out.push({ x: N.squeak.x, y: N.squeak.y, z: 44, label: 'SQUEAK' });
    if (ST.stage === 4) out.push({ x: STREET.houseDoor.x, y: STREET.houseDoor.y, label: '1419' });
  }
  return out;
}
function drawStreetHud(r) {
  drawToasts(r);
  r.overlay(g => {
    const p = P1();
    if (ST.flashT > 0) px.blend(g, .6, 'add', () => px.rect(g, 0, 0, r.W, r.H, '#ffffff'));
    if (ST.mode === 'demo' || ST.demo || ST.mode === 'chasedemo') { drawDemoBanner(g, r); return; }
    drawHudObjective(g, r);
    // heat, or the shift's clock and score
    if (ST.mode === 'shift') {
      const mm = Math.max(0, Math.ceil(ST.shiftLeft)), s = Math.floor(mm / 60) + ':' + String(mm % 60).padStart(2, '0');
      E.ui.box(g, 6, 32, 120, 22, { bg: ['#0c0c12', '#14141c'], border: '#3a3a48', alpha: .8 });
      E.font.text(g, s, 12, 37, mm < 20 ? '#ff6040' : '#f0ece0', { scale: 1, shadow: '#000', outline: false });
      E.font.text(g, 'SCORE ' + ST.score, 50, 37, '#d8b860', { shadow: '#000', outline: false });
    } else if (ST.mode === 'corner' || ST.mode === 'reup') {
      E.ui.box(g, 6, 32, 66, 14, { bg: ['#0c0c12', '#14141c'], border: '#3a3a48', alpha: .8 });
      E.font.text(g, 'HEAT', 11, 36, '#8a8a9a', { font: 'tiny', outline: false });
      for (let i = 0; i < 3; i++) px.rect(g, 32 + i * 12, 35, 9, 7, i < CASE.heat ? '#e04a3a' : '#3a3a48');
    }
    // what the corner thinks of you: an eye meter
    const sus = Math.max(ST.npcs.kevo ? ST.npcs.kevo.sus : 0, ST.npcs.dre ? ST.npcs.dre.sus : 0, 0);
    if (ST.npcs.kevo && !ST.demo) {
      const w = 90, x = Math.round(r.W / 2 - w / 2), y = r.H - 50;
      if (sus > .02 || p.cons > 0) {
        E.ui.box(g, x - 4, y - 4, w + 8, 16, { bg: ['#0c0c12', '#14141c'], border: sus >= .7 ? '#ff4030' : '#3a3a48', alpha: .85 });
        E.ui.bar(g, x + 18, y + 1, w - 20, 6, Math.min(1, sus), sus >= .7 ? '#ff4030' : sus >= .35 ? '#f0a030' : '#d8d0a0');
        px.ell(g, x + 7, y + 4, 6, 3, '#e8e4dc'); px.disc(g, x + 7, y + 4, 2, '#141418');
      }
    }
    // status words
    const status = p.inCar ? 'IN THE CAR' : p.aim ? 'CAMERA UP' : p.blend && p.still > .8 ? 'BLENDING IN • ' + p.blend.name.toUpperCase() : p.crouch ? 'CROUCHED' : p.mover.sprinting ? 'RUNNING' : '';
    if (status) E.font.text(g, status, r.W / 2, r.H - 64, p.aim ? '#ff8060' : '#a8d8a0', { align: 'center', shadow: '#000', outline: false });
    // the viewfinder
    for (const q of ST.players) if (q.aim) drawViewfinder(g, r, q);
    // prompts at the bottom
    const items = [];
    if (p.aim) { items.push(['shoot', 'Take photo']); items.push(['aim', 'Lower']); }
    else {
      if (p.interact) items.push(['interact', p.interact.label]);
      if (ST.chase) items.push(['act2', 'Tackle']); else items.push(['aim', 'Camera']);
      if (!p.inCar && !ST.chase) items.push(['crouch', p.crouch ? 'Stand' : 'Crouch']);
      if (ST.chase) items.push(['sprint', 'Sprint']);
      if (!IN_HUB) items.push(['notes', 'Notes']);
    }
    promptRow(g, items, r.W / 2, r.H - 22);
    // stamina while running
    if (p.mover.stamina < p.mover.staminaMax - 1) E.ui.bar(g, r.W / 2 - 30, r.H - 34, 60, 3, p.mover.stamina / p.mover.staminaMax, p.mover.exhausted ? '#ff6040' : '#7ad06a');
    if (ST.banner) { const b = ST.banner; E.font.title(g, b.text, r.W / 2, r.H / 2 - 30, { scale: 2, align: 'center', colors: b.colors || ['#ffffff', '#d8b860'] }); if (b.sub) E.font.text(g, b.sub, r.W / 2, r.H / 2 - 4, '#e8e4dc', { align: 'center', shadow: '#000', outline: false }); }
    if (ST.players.length < 2 && ['shift', 'corner', 'reup'].includes(ST.mode) && !IN_HUB && ST.t < 12) E.font.text(g, 'PLAYER 2: START ON A SECOND PAD, OR 2 ON THE KEYBOARD', r.W - 8, (game.cornerArea && game.cornerArea() ? game.cornerArea().y1 + 4 : 8), '#8a8a9a', { align: 'right', font: 'tiny', outline: false, shadow: '#000' });
  });
  talk.draw(r);
  drawNotes(r);
}
function drawViewfinder(g, r, p) {
  const c = r.w(p.rx, p.ry, 16), R = Math.round(FRAME_R * (r.view.zoom || 1) * (r.view.scale || 1) + 6);
  const x = Math.round(c[0]), y = Math.round(c[1]);
  const N = ST.npcs, subjects = photoSubjects().filter(a => inFrame(p, a));
  const good = subjects.length > 0, col = good ? '#60f080' : '#e8e4dc';
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, x + sx * R - (sx > 0 ? 6 : 0), y + sy * R - (sy > 0 ? 1 : 0), 7, 1, col); px.rect(g, x + sx * R - (sx > 0 ? 0 : 0), y + sy * R - (sy > 0 ? 6 : 0), 1, 7, col); }
  px.rect(g, x - 3, y, 7, 1, col); px.rect(g, x, y - 3, 1, 7, col);
  if (Math.floor(game.real * 2) % 2) px.disc(g, x - R + 2, y - R - 7, 2, '#ff3030'); E.font.text(g, 'REC  ' + p.film + ' LEFT', x - R + 7, y - R - 10, '#ff5050', { font: 'tiny', outline: false, shadow: '#000' });
  let yy = y + R + 4;
  for (const a of subjects.slice(0, 3)) { const lab = (a.label || (a.role === 'fiend' ? 'BUYER' : '')); if (lab) { E.font.text(g, lab, x, yy, '#60f080', { align: 'center', font: 'tiny', outline: false, shadow: '#000' }); yy += 7; } }
  if (ST.lastPhoto && ST.lastPhoto.got.length) E.font.text(g, 'GOT IT', x, y - R - 20, '#60f080', { align: 'center', shadow: '#000', outline: false });
}

// ---- the cold open: a body in the Courts -------------------------------------------------------------------------------------
function coldOpenSetup() {
  const S = STREET;
  ST.npcs.uniform = new Actor('UNIFORM', S.P(29, 23).x, S.P(29, 23).y, { label: 'OFC. DIAZ', facing: 0 });
  ST.cars.push(Object.assign(new Car(S.P(17, 17).x, S.P(17, 17).y, Math.PI / 2, { shape: 'cruiser', lights: true }), { id: 'cruiser' }));
  setObjective('Walk the scene', 'A call came in from the Courts. Walk over and talk to the uniform.');
  CASE.chapter = 0;
}
function coldOpenTick() {}
function coldOpenTalk() {
  ST.stage = 1;
  convo([
    ['UNIFORM', ['Detective. Kid called it in around two. Nobody saw nothing, naturally.', 'Neighbors say he worked the corner up on Monroe. Sixteen, maybe seventeen.']],
    ['KOWAL', ['Who\'s corner?']],
    ['UNIFORM', ['Who\'s you think? Every corner from here to Fulton is Deacon\'s.', 'Homicide\'s gonna write it as a robbery. Clean in ninety days.']],
    ['KOWAL', ['A robbery. With his money still in his shoe.']],
    ['MABRY', ['{c=#d8b860}[RADIO]{/c} Kowal. Mabry. Leave it for Homicide.', 'Deputy Ops just gave us a detail. Six detectives, a basement, and Deacon Price.', 'Monroe and Calhoun in the morning. Bring a camera.']],
    ['KOWAL', ['{w=.4}Copy.']]
  ], () => { CASE.chapter = 1; game.go('card', { chapter: 1 }); });
}

// ---- TAPE ONE: the corner -----------------------------------------------------------------------------------------------------------
function cornerSetup(data) {
  CASE.chapter = 1;
  const st = ST.stage;
  if (st > 0 && ST.npcs.pigeon) ST.npcs.pigeon.hidden = true;
  cornerObjective();
  if (st === 0) game.after(.8, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} Your CI says he\'ll meet you in the alley behind Lucky\'s. Go easy. Pigeon spooks.']));
  if (st === 3) cornerTayArrives();
  if (st === 4) { const P = STREET.P(19, 12); ST.players[0].mover.x = P.x; ST.players[0].mover.y = P.y; ST.sale = null; ST.saleWait = 999; game.after(1, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} Squeak\'s moving with a bag. Stay on him. Crouch when he turns.'], { onDone: tailStart })); }
}
function cornerObjective() {
  const n = (hasEv('h2h1') ? 1 : 0) + (hasEv('h2h2') ? 1 : 0);
  const O = [
    ['Meet Pigeon behind Lucky\'s', 'Your informant waits in the alley north of Monroe. Walk, don\'t run: the lookouts watch the street.'],
    ['Photograph hand-to-hands (' + n + '/2)', 'Hold ' + keyLabel('aim') + ' to raise the camera, frame the hopper and the buyer while cash changes hands, press ' + keyLabel('shoot') + '. Blend in at the bus stop or a stoop, or shoot from the car on Monroe.'],
    ['Photograph the stash', 'Squeak fetches the vials from somewhere close. Catch him at the stash while he crouches over it.'],
    ['Photograph the collection', 'A black Lexus. The man in the black cap collects from Little Moe. Get them both in one frame.'],
    ['Tail Squeak', 'Keep him close but stay out of his eyes when he looks back. Stop, crouch or blend when he turns.']
  ];
  const o = O[ST.stage] || O[0];
  setObjective(o[0], o[1]);
}
function pigeonTalk() {
  const N = ST.npcs;
  N.pigeon.face(P1().mover);
  convo([
    ['PIGEON', ['Detective Kowal. You look tired. You want to buy a lighter? Socks? I got socks.']],
    ['KOWAL', ['I want names, Pigeon. Monroe and Calhoun.']],
    ['PIGEON', ['Names cost. Names is the expensive aisle.'], { choices: ['Pay him $20', 'Pay him $10', 'Lean on him'], onChoice: c => { CASE.pigeonPaid = c === 0 ? 20 : c === 1 ? 10 : 'lean'; if (c === 2) CASE.pigeonTrust = 0; } }]
  ], () => {
    const lines = CASE.pigeonPaid === 20 ? [['PIGEON', ['Twenty. That\'s respect. OK. The boy in the blue cap is Junebug. He take the money.', 'Little one in green is Squeak. He run the vials. Big one is Little Moe, it\'s his shift.', 'Kevo and Dre on the lookouts. And all of it is Deacon\'s package. Everybody know that.']]]
      : CASE.pigeonPaid === 10 ? [['PIGEON', ['Ten. Ten gets you ten dollars of truth.', 'Blue cap, that\'s Junebug, the money. Green hood, Squeak. That\'s what ten buys.']]]
      : [['KOWAL', ['How about you tell me, and I don\'t mention your warrant on Edmondson.']], ['PIGEON', ['...That\'s cold. That\'s real cold.', 'Junebug take the money, Squeak run, Little Moe watch the shift. Kevo and Dre call it out.', 'It\'s Deacon\'s package. You ain\'t heard it from me. You ain\'t heard nothing from me no more.']]];
    convo(lines.concat([['KOWAL', ['Get lost, Pigeon. Not too lost.']]]), () => {
      if (CASE.pigeonPaid !== 10) addEvidence('pigeon');
      N.pigeon.follow([STREET.P(30, 1), STREET.P(40, 1)], 30);
      game.after(9, () => { if (N.pigeon) N.pigeon.hidden = true; });
      ST.stage = 1; cornerObjective(); autoCheckpoint();
      game.after(1.5, () => say('KOWAL', ['{c=#8a8a9a}(Bus stop on Calhoun. Stoops. The car. Places a cop can stand without looking like one.){/c}']));
    });
  });
}
function autoCheckpoint() { CASE.checkpoints.corner = ST.stage; }
function cornerTick(dt) {
  const N = ST.npcs;
  if (ST.stage === 1) { cornerObjective(); if (hasEv('h2h1') && hasEv('h2h2')) { ST.stage = hasEv('stash') ? 3 : 2; cornerObjective(); autoCheckpoint(); if (ST.stage === 3) cornerTayArrives(); } }
  if (ST.stage === 2 && hasEv('stash')) { ST.stage = 3; cornerObjective(); autoCheckpoint(); cornerTayArrives(); }
  if (ST.stage === 3) collectTick(dt);
  if (ST.stage === 4) tailTick(dt);
}
function cornerTayArrives() {
  if (ST.npcs.tay) return;
  const car = Object.assign(new Car(66 * T, 10 * T, Math.PI, { color: '#141414', speed: 110 }), { id: 'lexus' });
  ST.cars.push(car);
  car.drive([{ x: 30 * T, y: 10 * T + 4 }, { x: STREET.tayPark.x + 30, y: STREET.tayPark.y + 6 }]);
  ST.collect = { phase: 'arrive', t: 0, shot: false, car };
  A.sfx('car');
  say('BRIGGS', ['{c=#d8b860}[RADIO]{/c} Black Lexus eastbound on Monroe. Tinted. Somebody\'s paying respects.'], { auto: 3, modal: false });
}
function collectTick(dt) {
  const C = ST.collect, N = ST.npcs; if (!C) return;
  C.t += dt;
  if (C.phase === 'arrive' && !C.car.moving) {
    C.phase = 'walk'; C.t = 0;
    N.tay = new Actor('TAY', C.car.x - 4, C.car.y + 14, { label: 'BLACK CAP', role: 'lt' });
    N.tay.goTo(N.moe.x + 12, N.moe.y + 2, 32); N.moe.face(N.tay);
  } else if (C.phase === 'walk' && N.tay.arrived()) { C.phase = 'give'; C.t = 0; N.tay.face(N.moe); N.moe.face(N.tay); N.moe.pose = 'cast'; N.tay.pose = 'hips'; }
  else if (C.phase === 'give' && C.t > 7) { C.phase = 'back'; C.t = 0; N.moe.pose = null; N.tay.pose = null; N.tay.goTo(C.car.x - 4, C.car.y + 14, 34); }
  else if (C.phase === 'back' && N.tay.arrived()) { C.phase = 'leave'; N.tay.hidden = true; C.car.drive([{ x: 10 * T, y: 10 * T + 4 }, { x: -6 * T, y: 10 * T + 4 }], 120); A.sfx('car'); }
  else if (C.phase === 'leave' && !C.car.moving) {
    ST.cars.splice(ST.cars.indexOf(C.car), 1); delete N.tay; ST.collect = null;
    if (ST.mode !== 'corner') return;
    if (hasEv('collect')) { ST.stage = 4; cornerObjective(); autoCheckpoint(); game.after(1, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} That\'s Tavon Rucker. Tay. Deacon\'s lieutenant on the west side.', 'Squeak\'s moving with a bag. Tail him. Don\'t you dare get made.'], { onDone: tailStart })); }
    else { say('MABRY', ['{c=#d8b860}[RADIO]{/c} You missed it. He comes back every hour on the hour. Be ready.'], { auto: 3.5, modal: false }); game.after(20, () => { if (ST.mode === 'corner' && ST.stage === 3) cornerTayArrives(); }); }
  }
}
// the tail: Squeak walks the bag to 1419 Lorraine, looking back now and then
function tailStart() {
  const N = ST.npcs, S = STREET;
  if (!N.squeak) return;
  N.squeak.pose = null; N.squeak.home = null;
  const route = [S.P(19, 14), S.P(19, 22), S.P(19, 30), S.P(25, 30), S.P(25, 35), S.P(31, 35), { x: S.houseDoor.x, y: S.houseDoor.y - 2 }];
  N.squeak.follow(route, 30);
  ST.tail = { look: 0, next: 5 + Math.random() * 3, far: 0, route };
  ST.sale = null; ST.saleWait = 999;
}
function tailTick(dt) {
  const tl = ST.tail, N = ST.npcs, Q = N.squeak; if (!tl || !Q) return;
  const p = P1(), at = p.inCar ? p.inCar : playerAt(p), d = E.dist(Q, at);
  if (tl.look > 0) {
    tl.look -= dt; Q.path.length && (Q.body.vx = Q.body.vy = 0);
    const seen = canSee(Q, Object.assign({ crouch: p.crouch }, playerAt(p)), STREET.map, { range: 110, fov: 1.3 });
    // a tail is judged on how you carry yourself: crouched or blending you are nobody, upright in the open you are a cop
    const m = p.mover, c = p.aim ? 2.6 : m.sprinting ? 1.5 : (p.blend && p.still > .5) ? .2 : p.crouch ? .3 : .55;
    tl.heat = seen.seen && !p.inCar && seen.exposure * c > .3 ? (tl.heat || 0) + dt : Math.max(0, (tl.heat || 0) - dt);
    if (tl.heat > .45) { tailBurned(); return; }
    if (tl.look <= 0) { Q.speed = 30; Q.facing = tl.saved || Q.facing; }
  } else {
    tl.next -= dt;
    if (tl.next <= 0) { tl.look = 1.9; tl.saved = Q.facing; Q.facing = Q.facing + Math.PI; Q.speed = 0; tl.next = 6 + Math.random() * 3; bubble(Q, '...', '#c8c4bc', 1.2); }
  }
  if (Q.speed === 0 && tl.look <= 0) Q.speed = 30;
  if (d > 210) { tl.far += dt; if (tl.far > 3) { toast('LOST HIM', 'Squeak turned a corner and he\'s gone. Back to the corner.'); tailReset(); return; } } else tl.far = 0;
  if (Q.arrived() && E.dist(Q, STREET.houseDoor) < 14) {
    addEvidence('house'); Q.hidden = true; ST.tail = null; A.sfx('door');
    say('KOWAL', ['1419 Lorraine. He let himself in. Back door\'s got a new lock on a house with no glass.', '{c=#8a8a9a}(That\'s the stash. That\'s the case.){/c}'], { onDone: () => chapterDone(1) });
  }
}
function tailBurned() {
  bubble(ST.npcs.squeak, 'HOLD UP...', '#ff5040', 2);
  A.sfx('whistle');
  CASE.heat++; CASE.burns++;
  toast('MADE', CASE.heat >= 3 ? 'Squeak knows your face.' : 'Squeak clocked you. Heat ' + CASE.heat + ' of 3.');
  if (CASE.heat >= 3) { game.after(1.6, () => game.go('gameover', { why: 'blown', retry: { scene: 'street', mode: 'corner', stage: 4 } })); return; }
  tailReset();
}
function tailReset() {
  const N = ST.npcs, S = STREET;
  ST.tail = null;
  N.squeak.body.x = S.runnerSpot.x; N.squeak.body.y = S.runnerSpot.y; N.squeak.path = []; N.squeak.speed = 30;
  const p = P1(); if (p.inCar) exitCar(p);
  p.mover.x = S.P(10, 13).x; p.mover.y = S.P(10, 13).y;
  game.after(4, () => { if (ST.mode === 'corner' && ST.stage === 4) tailStart(); });
}
function chapterDone(n) {
  if (ST.demo) return;
  game.go('results', { chapter: n });
}

// ---- TAPE FOUR: the re-up ---------------------------------------------------------------------------------------------------------
function reupSetup(data) {
  CASE.chapter = 4;
  ST.clock = 23 * 60 + 31;
  const st = ST.stage;
  if (st <= 1) { setObjective('Get in the car on Lorraine', 'The pager said 11:40 at the payphone on Lorraine and Fulton. The unmarked car is parked with a view.'); game.after(1, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} Units are staged on Fulton. Nobody moves until you get the picture.'], { auto: 3.5, modal: false })); }
  if (st >= 2) reupRaid(true);
}
function reupTick(dt) {
  const N = ST.npcs, p = P1(), S = STREET;
  if (ST.stage <= 1) ST.clock += dt * (p.inCar ? 1.4 : .5);
  if (ST.stage === 0 && p.inCar === S.car2) { ST.stage = 1; setObjective('Photograph the handoff', 'Wait. Tay comes for the 11:40 call, then Deacon\'s courier. Frame them together when the bags change hands.'); handoffStart(); }
  if (ST.stage === 1) handoffTick(dt);
  if (ST.stage === 2 && E.dist(playerAt(p), S.houseBack) < 70 && !p.inCar) { ST.stage = 3; chaseStart(false); }
  if (ST.stage === 3 && ST.chase && ST.chase.done) {
    ST.stage = 4; setObjective('Search 1419 Lorraine', 'The squad has the house. Find the package before somebody upstairs calls a press conference.');
  }
}
function handoffStart() {
  const N = ST.npcs, S = STREET;
  N.tay = new Actor('TAY', S.P(36, 35).x, S.P(36, 35).y, { label: 'TAY', role: 'lt' });
  N.tay.follow([S.P(44, 35), { x: S.payphone.x - 2, y: S.payphone.y + 12 }], 28);
  ST.handoff = { phase: 'walk', t: 0 };
}
function handoffTick(dt) {
  const H = ST.handoff, N = ST.npcs, S = STREET, car = ST.cars.find(c => c.id === 'courier');
  H.t += dt;
  if (H.phase === 'walk' && N.tay.arrived()) { H.phase = 'call'; H.t = 0; N.tay.face(-Math.PI / 2); N.tay.pose = 'wave'; A.sfx('ring'); ST.clock = 23 * 60 + 40; }
  else if (H.phase === 'call' && H.t > 6) { H.phase = 'car'; H.t = 0; N.tay.pose = null; car.hidden = false; car.drive([{ x: 52 * T, y: 33 * T }, { x: S.courier.x + 30, y: S.courier.y }], 80); A.sfx('car'); }
  else if (H.phase === 'car' && !car.moving) { H.phase = 'meet'; H.t = 0; N.pruitt = new Actor('PRUITT', car.x - 6, car.y + 16, { label: 'COURIER' }); N.pruitt.goTo(S.payphone.x + 12, S.payphone.y + 16, 30); N.tay.goTo(S.payphone.x - 4, S.payphone.y + 16, 20); }
  else if (H.phase === 'meet' && N.pruitt.arrived()) { H.phase = 'swap'; H.t = 0; N.pruitt.face(N.tay); N.tay.face(N.pruitt); N.pruitt.pose = 'cast'; N.tay.pose = 'cast'; }
  else if (H.phase === 'swap' && H.t > 8) { H.phase = 'walk2'; H.t = 0; N.pruitt.pose = null; N.tay.pose = null; N.pruitt.goTo(car.x - 6, car.y + 16, 26); N.tay.goTo(S.P(38, 35).x, S.P(38, 35).y, 30); H.phase = 'walk'; H.phase = 'walkaway'; }
  else if (H.phase === 'walkaway' && N.pruitt.arrived()) {
    N.pruitt.hidden = true; car.drive([{ x: 70 * T, y: 33 * T }], 100); A.sfx('car'); H.phase = 'gone'; H.t = 0;
    const ok = hasEv('handoff');
    convo([['MABRY', ['{c=#d8b860}[RADIO]{/c} Tell me you got that.']],
      ['KOWAL', ok ? ['Got it. Both faces, both bags.'] : ['...Partial. Not the swap.']],
      ['MABRY', ok ? ['{c=#d8b860}[RADIO]{/c} Then we go. All units, 1419 Lorraine. Kowal, take the back.'] : ['{c=#d8b860}[RADIO]{/c} Damn it. We go anyway, the package is in that house. Kowal, take the back.']]], () => reupRaid(false));
  }
}
function reupRaid(skip) {
  const S = STREET, N = ST.npcs;
  ST.stage = 2;
  const p = P1(); if (skip && p.inCar) exitCar(p);
  setObjective('Cover the back of 1419', 'The squad hits the front door. Whoever runs, runs out the back into the alley. Be there.');
  for (let i = 0; i < 2; i++) { const c = new Car(S.P(i ? 62 : 56, 33).x, S.P(56, 33).y, Math.PI, { shape: 'cruiser', lights: true, speed: 130 }); c.drive([{ x: S.houseDoor.x + (i ? 50 : 10), y: 33 * T }]); ST.cars.push(c); }
  A.sfx('siren');
  ST.squad = [];
  for (let i = 0; i < 3; i++) { const a = new Actor('cop' + i, S.P(44, 35).x + i * 8, S.P(44, 35).y, { look: { build: 'heroic', weapon: 'gun', outfit: 'coat', hat: { style: 'helmet', color: '#1a1a22' }, colors: { coat: '#1a2448', cloth: '#2a2a34', pants: '#1a1a2a', metal: '#2a2a2a', skin: ['#c89070', '#6a4430', '#e0b090'][i] } }, speed: 70 }); a.point = true; a.goTo(S.houseDoor.x - 10 + i * 10, S.houseDoor.y + 6); N['cop' + i] = a; }
  game.after(4, () => { A.sfx('ram'); game.shake && game.shake(3); bubble(N.cop0, 'POLICE! SEARCH WARRANT!', '#f0ece0', 2.4); });
  game.after(5.5, () => { A.sfx('ram'); A.sfx('door2'); });
  N.squeak = new Actor('SQUEAK', S.houseBack.x, S.houseBack.y - 10, { label: 'SQUEAK', speed: 0 }); N.squeak.hidden = true;
}
// the chase: Squeak out the back, through the cut-throughs; a tackle ends it
function chaseStart(demo) {
  const S = STREET, N = ST.npcs;
  if (demo) { ST.players[0].mover.x = S.houseBack.x - 40; ST.players[0].mover.y = S.houseBack.y; N.squeak = new Actor('SQUEAK', S.houseBack.x, S.houseBack.y, { label: 'SQUEAK' }); NIGHT.on = true; game.lights.ambient = .3; game.weather = { kind: 'rain', amount: .6, wind: .2 }; }
  const Q = N.squeak; Q.hidden = false; Q.down = 0; Q.run = 0;
  bubble(Q, 'AW HELL NO', '#f0ece0', 1.6);
  Q.follow([S.P(37, 42), S.P(37, 36), S.P(37, 35), S.P(44, 35), S.P(44, 30), S.P(44, 22), S.P(49, 22), S.P(56, 21), S.P(63, 21)], 104);
  ST.chase = { t: 0, far: 0, done: false, caught: false };
  music('chase');
  if (!demo) setObjective('Catch Squeak', 'Sprint with ' + keyLabel('sprint') + '. Get close and tackle with ' + keyLabel('act2') + '. Vault the fences with ' + keyLabel('interact') + '.');
}
function chaseTick(dt) {
  const C = ST.chase, Q = ST.npcs.squeak; if (!C || C.done) return;
  C.t += dt;
  const p = P1(), d = E.dist(Q, playerAt(p));
  // he tires: a sixteen-year-old in Jordans, not a sprinter
  Q.speed = Math.max(70, 104 - C.t * 1.6) * (d < 40 ? 1.08 : 1);
  if (d > 230) { C.far += dt; if (C.far > 3.5) chaseEnd(false); } else C.far = 0;
  if (Q.arrived() && !C.caught) chaseEnd(false);
}
function chaseTackle(p) {
  const C = ST.chase, Q = ST.npcs.squeak; if (!C || C.done) return;
  if (E.dist(Q, playerAt(p)) < 22) {
    C.caught = true; Q.path = []; Q.down = 1; Q.speed = 0;
    game.hitFx ? game.hitFx(Q.x, Q.y, 10, { power: .6, damage: null, textScale: 0 }) : null;
    A.sfx('punch'); game.after(.6, () => A.sfx('cuffs'));
    chaseEnd(true);
  }
}
function chaseEnd(caught) {
  const C = ST.chase; if (!C || C.done) return;
  C.done = true;
  music('night');
  if (ST.mode === 'chasedemo') return;
  if (caught) { CASE.squeakCaught = true; addEvidence('arrest'); say('SQUEAK', ['Get off me! I ain\'t did nothing! I was just... running. For my health.'], { onDone: () => say('KOWAL', ['Sixteen. Hands like a kid. They put a kid in the house with the package.'])}); }
  else { ST.npcs.squeak.hidden = true; say('KOWAL', ['{c=#8a8a9a}(Gone. Somewhere a mother\'s back door is open.){/c}']); }
}

// ---- the shift: the AI Hub round, or a local 1-2 player surveillance shift ----------------------------------------------------------
function shiftSetup(data) {
  CASE.chapter = 0;
  ST.shiftLen = data.seconds || 180; ST.shiftLeft = ST.shiftLen; ST.tayT = ST.shiftLen * .45; ST.tayShot = false; ST.lookShot = false;
  setObjective('Shift: photograph the corner', 'Every hand-to-hand is points. The stash, the collection and the lookouts pay more. Getting burned costs you.');
  CASE.pigeonPaid = 20;
}
function shiftTick(dt) {
  if (ST.ended) return;
  if (IN_HUB) {
    const t = HUB.time();
    if (t < 0) { ST.shiftLeft = ST.shiftLen; return; }
    ST.shiftLeft = Math.max(0, ST.shiftLen - t / 1000);
  } else ST.shiftLeft -= dt;
  ST.tayT -= dt;
  if (ST.tayT <= 0 && !ST.npcs.tay && !ST.collect) { cornerTayArrives(); ST.tayT = 9999; }
  if (ST.collect) collectTick(dt);
  hubProgressTick(dt);
  if (ST.shiftLeft <= 0) shiftEnd();
}
function shiftEnd() {
  if (ST.ended) return;
  ST.ended = true;
  ST.banner = { text: 'END OF SHIFT', sub: 'Score ' + ST.score };
  if (IN_HUB) { hubResult(); return; }
  const best = MEM.best !== undefined ? MEM.best : E.store.get('rewired-shift-best', 0);
  if (ST.score > best) { MEM.best = ST.score; E.store.set('rewired-shift-best', ST.score); }
  game.after(2.5, () => game.go('results', { shift: true, score: ST.score, best: Math.max(best, ST.score), photos: CASE.photos }));
}

// ---- 04-office.js ----
// ============================================================================================================
// REWIRED • 04 inside: the detail's office and its case board (TAPE TWO), the wire room's calls and pages
// (TAPE THREE), the stash house search (end of TAPE FOUR). Interiors are small TileMaps; the boards are canvas UI
// sized for a TV: big cards, one focus, d-pad / stick / mouse hover / click all move it.
// ============================================================================================================

// ---- a walkable interior: a Mover, the cast standing about, interactables -----------------------------------------
function makeWalker(x, y) { const m = new E.Mover({ x, y, r: 5, walk: 50, run: 70, sprintSpeed: 90 }); m.facing = -Math.PI / 2; return m; }
function walkerTick(m, rig, map, dt, locked) {
  const mv = I.move(), g = game.view.screenDirToGround(mv[0], mv[1]);
  m.update(dt, map, { move: locked ? [0, 0] : g, sprint: I.down('sprint') });
  rig.update(dt, m.rigState({}));
}
function drawWalker(r, m, rig) { r.shadow(m.x, m.y, 7, .35); r.actor(m.x, m.y, m.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: { color: '#e8c060' } }); }
function standActor(id, x, y, facing, label) { const a = new Actor(id, x, y, { facing, label }); a.static = false; return a; }

// ---- the case board -------------------------------------------------------------------------------------------------
const BOARD_SLOTS = [
  { id: 'DEACON', name: 'DARNELL "DEACON" PRICE', sub: 'Never on the street', col: 1, row: 0, pts: 0 },
  { id: 'TAY', name: 'TAVON "TAY" RUCKER', sub: 'Lieutenant', col: 1, row: 1, parent: 'DEACON' },
  { id: 'MOE', name: 'LITTLE MOE', sub: 'Shift boss', col: 1, row: 2, parent: 'TAY' },
  { id: 'HOUSE', name: '1419 LORRAINE', sub: 'Stash house', col: 2, row: 2, parent: 'TAY' },
  { id: 'JUNEBUG', name: 'JUNEBUG', sub: 'Hopper: the money', col: 0, row: 3, parent: 'MOE' },
  { id: 'SQUEAK', name: 'SQUEAK', sub: 'Runner: the vials', col: 1, row: 3, parent: 'MOE' },
  { id: 'LOOKOUTS', name: 'KEVO AND DRE', sub: 'Lookouts', col: 2, row: 3, parent: 'MOE' }
];
const CARD_RULES = { h2h1: ['JUNEBUG'], h2h2: ['JUNEBUG'], stash: ['SQUEAK'], collect: ['MOE', 'TAY'], tay: ['TAY'], pigeon: ['DEACON'], house: ['HOUSE'], lookouts: ['LOOKOUTS'] };
const CARD_PTS = { h2h1: 10, h2h2: 10, stash: 15, collect: 20, tay: 10, pigeon: 15, house: 20, lookouts: 5 };
const PC_NEED = 60;
const BOARD = { open: false, cards: [], placed: {}, focus: 'tray', ti: 0, si: 0, held: null, msg: null, msgT: 0, done: false, demo: false };
function boardOpen(demo) {
  BOARD.open = true; BOARD.demo = !!demo; BOARD.done = false; BOARD.placed = {}; BOARD.held = null; BOARD.focus = 'tray'; BOARD.ti = 0; BOARD.si = 0; BOARD.msg = null;
  BOARD.cards = (demo ? ['h2h1', 'h2h2', 'stash', 'collect', 'tay', 'pigeon', 'house', 'lookouts'] : CASE.evidence.filter(id => CARD_RULES[id])).map(id => ({ id, on: null }));
  CASE.pc = 0;
}
function boardSlotRect(r, s) {
  const W = r.W, H = r.H, top = 30, bottomTray = 86, rows = 4, rowH = Math.floor((H - top - bottomTray) / rows), cw = Math.min(118, Math.floor((W - 40) / 3) - 8), ch = Math.min(rowH - 8, 40);
  const cx = W / 2 + (s.col - 1) * (cw + 16);
  return { x: Math.round(cx - cw / 2), y: Math.round(top + s.row * rowH + (rowH - ch) / 2), w: cw, h: ch };
}
function boardCardRect(r, i, n) {
  const W = r.W, H = r.H, cw = Math.min(84, Math.floor((W - 20) / Math.max(1, n)) - 6), ch = 40, total = n * (cw + 6) - 6;
  return { x: Math.round(W / 2 - total / 2 + i * (cw + 6)), y: H - 84, w: cw, h: ch };
}
function boardTick(dt, r) {
  if (BOARD.msgT > 0) BOARD.msgT -= dt;
  const free = BOARD.cards.filter(c => !c.on);
  const pointer = I.pointer(), click = I.clicked();
  // mouse hover moves the focus; a click picks
  if (r && pointer && I.lastDevice === 'mouse') {
    free.forEach((c, i) => { const q = boardCardRect(r, i, free.length); if (hit(pointer, q.x, q.y, q.w, q.h) && !BOARD.held) { BOARD.focus = 'tray'; BOARD.ti = i; } });
    BOARD_SLOTS.forEach((s, i) => { const q = boardSlotRect(r, s); if (hit(pointer, q.x, q.y, q.w, q.h) && BOARD.held) { BOARD.focus = 'slots'; BOARD.si = i; } });
  }
  let confirm = I.pressed('confirm') || I.pressed('interact');
  if (click && r) {
    let onSomething = false;
    free.forEach((c, i) => { const q = boardCardRect(r, i, free.length); if (hit(click, q.x, q.y, q.w, q.h)) { onSomething = true; if (!BOARD.held) { BOARD.ti = i; BOARD.focus = 'tray'; confirm = true; } } });
    BOARD_SLOTS.forEach((s, i) => { const q = boardSlotRect(r, s); if (hit(click, q.x, q.y, q.w, q.h) && BOARD.held) { onSomething = true; BOARD.si = i; BOARD.focus = 'slots'; confirm = true; } });
    const jb = judgeButton(r); if (jb && hit(click, jb.x, jb.y, jb.w, jb.h)) { boardToJudge(); return; }
    if (!onSomething && BOARD.held) { BOARD.held = null; BOARD.focus = 'tray'; }
  }
  if (I.pressed('notes') && CASE.pc >= PC_NEED) { boardToJudge(); return; }
  if (BOARD.focus === 'tray') {
    if (I.repeat('left')) { BOARD.ti = Math.max(0, BOARD.ti - 1); A.sfx('select'); }
    if (I.repeat('right')) { BOARD.ti = Math.min(free.length - 1, BOARD.ti + 1); A.sfx('select'); }
    BOARD.ti = clamp(BOARD.ti, 0, Math.max(0, free.length - 1));
    if (confirm && free[BOARD.ti]) { BOARD.held = free[BOARD.ti]; BOARD.focus = 'slots'; A.sfx('confirm'); BOARD.si = BOARD_SLOTS.findIndex(s => !BOARD.placed[s.id]); if (BOARD.si < 0) BOARD.si = 0; }
    if (I.pressed('cancel')) { BOARD.open = false; A.sfx('cancel'); }
  } else {
    const cur = BOARD_SLOTS[BOARD.si];
    const move = (dc, dr) => {
      let best = -1, bd = 1e9;
      BOARD_SLOTS.forEach((s, i) => { if (i === BOARD.si) return; const ddc = s.col - cur.col, ddr = s.row - cur.row; if ((dc && Math.sign(ddc) !== dc) || (dr && Math.sign(ddr) !== dr)) return; const d = Math.abs(ddc) * (dc ? 1 : 3) + Math.abs(ddr) * (dr ? 1 : 3); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { BOARD.si = best; A.sfx('select'); }
    };
    if (I.repeat('left')) move(-1, 0); if (I.repeat('right')) move(1, 0); if (I.repeat('up')) move(0, -1); if (I.repeat('down')) move(0, 1);
    if (confirm && BOARD.held) boardPlace(BOARD.held, BOARD_SLOTS[BOARD.si]);
    if (I.pressed('cancel')) { BOARD.held = null; BOARD.focus = 'tray'; A.sfx('cancel'); }
  }
}
function boardPlace(card, slot) {
  const ok = CARD_RULES[card.id].includes(slot.id);
  if (ok) {
    card.on = slot.id; (BOARD.placed[slot.id] = BOARD.placed[slot.id] || []).push(card.id);
    CASE.pc += CARD_PTS[card.id]; A.sfx('pin');
    BOARD.msg = ['FELD', E.pick(['That holds.', 'Good. That\'s a line a judge can follow.', 'Pin it.', 'OK. That\'s probable cause, a piece of it.'])];
  } else {
    CASE.pc = Math.max(0, CASE.pc - 5); A.sfx('wrong');
    BOARD.msg = ['FELD', E.pick(['No. A defense attorney eats that for lunch.', 'That picture doesn\'t say what you want it to say.', 'Doesn\'t hold. Try again.'])];
  }
  BOARD.msgT = 2.6; BOARD.held = null; BOARD.focus = 'tray'; BOARD.ti = 0;
  if (BOARD.cards.every(c => c.on)) { BOARD.done = true; if (!BOARD.demo) game.after(1, boardToJudge); }
}
function judgeButton(r) { if (CASE.pc < PC_NEED || BOARD.demo) return null; return { x: r.W - 128, y: 6, w: 120, h: 18 }; }
function boardToJudge() {
  if (BOARD.demo || BOARD.toJudge) return;
  BOARD.toJudge = true;
  BOARD.open = false;
  convo([
    ['FELD', ['Probable cause at ' + Math.round(CASE.pc) + '. Necessity: you can\'t get to Deacon any other way, and you can prove it. I\'ll walk it over.']],
    ['JUDGE', ['Ms. Feld. Detective. I\'ve read it.', 'Hand-to-hands, a stash, a lieutenant. Thin at the top. It always is.', 'Thirty days. Minimize what you should minimize. One sloppy call and I pull it.']],
    ['FELD', ['Which line do you want up, Kowal?'], { choices: ['The payphone on Lorraine', 'Tay\'s cell'], onChoice: c => { CASE.line = c === 0 ? 'payphone' : 'cell'; } }]
  ], () => {
    convo([[ 'BRIGGS', CASE.line === 'payphone' ? ['The payphone. Old school. They think a phone with no name on it is a phone nobody\'s listening to.'] : ['Tay\'s cell. He swaps it every few weeks. We\'ll hear him until he gets smart.'] ]], () => { BOARD.toJudge = false; chapterDone(2); });
  });
}
function drawBoard(r) {
  if (!BOARD.open) return;
  r.overlay(g => {
    // cork and frame
    px.rect(g, 0, 0, r.W, r.H, '#5a3a22');
    for (let y = 0; y < r.H; y += 2) for (let x = (y / 2) % 2; x < r.W; x += 3) if (E.hash2(x, y) > .7) px.dot(g, x, y, E.hash2(y, x) > .5 ? '#7a5232' : '#4a2e1a');
    px.rect(g, 0, 0, r.W, 4, '#2a1a10'); px.rect(g, 0, r.H - 4, r.W, 4, '#2a1a10');
    E.font.text(g, 'THE BOARD  •  PROBABLE CAUSE', 10, 8, '#f0e0c0', { shadow: '#000', outline: false });
    E.ui.bar(g, 10, 19, 140, 6, Math.min(1, CASE.pc / 100), CASE.pc >= PC_NEED ? '#60d070' : '#e0a040');
    px.rect(g, 10 + Math.round(140 * PC_NEED / 100), 17, 1, 10, '#f0f0f0');
    E.font.text(g, Math.round(CASE.pc) + ' / ' + PC_NEED + ' to see a judge', 156, 19, '#f0e0c0', { font: 'tiny', outline: false });
    const jb = judgeButton(r);
    if (jb) { E.ui.box(g, jb.x, jb.y, jb.w, jb.h, { bg: ['#2a5a2a', '#1a3a1a'], border: '#a0f0a0' }); E.font.text(g, 'TO THE JUDGE', jb.x + jb.w / 2 + 6, jb.y + 6, '#e0ffe0', { align: 'center', outline: false }); badge(g, 'notes', jb.x + 4, jb.y + 4); }
    // the red string from each placed slot to its parent
    for (const s of BOARD_SLOTS) {
      if (!s.parent || !BOARD.placed[s.id]) continue;
      const a = boardSlotRect(r, s), b = boardSlotRect(r, BOARD_SLOTS.find(x => x.id === s.parent));
      px.line(g, a.x + a.w / 2, a.y, b.x + b.w / 2, b.y + b.h, '#c82a2a', 1);
    }
    // slots
    BOARD_SLOTS.forEach((s, i) => {
      const q = boardSlotRect(r, s), placed = BOARD.placed[s.id], foc = BOARD.focus === 'slots' && BOARD.si === i;
      px.rect(g, q.x + 2, q.y + 2, q.w, q.h, '#2a1a10');
      px.rect(g, q.x, q.y, q.w, q.h, placed ? '#f0ece0' : '#c8bca0');
      px.rect(g, q.x + 3, q.y + 3, 26, q.h - 6, '#3a3a40');
      const rig = CAST[s.id] ? CAST[s.id].rig : s.id === 'LOOKOUTS' ? CAST.KEVO.rig : null;
      if (rig && (placed || s.id !== 'DEACON')) rig.drawPortrait(g, q.x + 3, q.y + 3, Math.min(26, q.h - 6), { zoom: 2.2, bg: '#3a3a40', tint: placed ? undefined : '#707070' });
      else if (s.id === 'DEACON') E.font.text(g, '?', q.x + 16, q.y + q.h / 2 - 7, '#8a8a8a', { align: 'center', scale: 2, outline: false });
      else if (s.id === 'HOUSE') { px.rect(g, q.x + 7, q.y + 12, 18, 14, '#6a5a50'); px.rect(g, q.x + 13, q.y + 18, 5, 8, '#8a6a3c'); }
      E.font.text(g, s.name, q.x + 32, q.y + 5, '#141414', { font: 'tiny', outline: false });
      E.font.text(g, s.sub, q.x + 32, q.y + 13, '#5a5a5a', { font: 'tiny', outline: false });
      if (placed) E.font.text(g, placed.length + ' PINNED', q.x + 32, q.y + q.h - 9, '#2a6a2a', { font: 'tiny', outline: false });
      px.disc(g, q.x + q.w / 2, q.y + 1, 2, '#d82a2a');
      if (foc) { const c = Math.floor(game.real * 6) % 2 ? '#ffe060' : '#ffffff'; px.rect(g, q.x - 2, q.y - 2, q.w + 4, 1, c); px.rect(g, q.x - 2, q.y + q.h + 1, q.w + 4, 1, c); px.rect(g, q.x - 2, q.y - 2, 1, q.h + 4, c); px.rect(g, q.x + q.w + 1, q.y - 2, 1, q.h + 4, c); }
    });
    // the tray of evidence cards
    const free = BOARD.cards.filter(c => !c.on);
    px.blend(g, .5, 'normal', () => px.rect(g, 0, r.H - 86, r.W, 82, '#000000'));
    free.forEach((c, i) => {
      const q = boardCardRect(r, i, free.length), foc = BOARD.focus === 'tray' && BOARD.ti === i, held = BOARD.held === c, ev = EVIDENCE[c.id];
      const y = q.y - (foc || held ? 4 : 0);
      px.rect(g, q.x, y, q.w, q.h, held ? '#fff8d0' : '#e8e4dc'); px.rect(g, q.x + 2, y + 2, q.w - 4, 18, '#2a2a30');
      const who = CAST[ev.who] ? CAST[ev.who].rig : null; if (who) who.drawPortrait(g, q.x + 2, y + 2, 18, { zoom: 1.6, bg: '#2a2a30' }); else E.font.text(g, '?', q.x + 11, y + 6, '#8a8a8a', { align: 'center', outline: false });
      const lines = wrapText(ev.name.toUpperCase(), q.w - 4, { font: 'tiny' }).slice(0, 2);
      lines.forEach((l, k) => E.font.text(g, l, q.x + 3, y + 24 + k * 7, '#141414', { font: 'tiny', outline: false }));
      if (foc) { px.rect(g, q.x - 1, y - 1, q.w + 2, 1, '#ffe060'); px.rect(g, q.x - 1, y + q.h, q.w + 2, 1, '#ffe060'); }
    });
    const cur = BOARD.held || free[BOARD.ti];
    if (cur) E.font.text(g, EVIDENCE[cur.id].text, r.W / 2, r.H - 40, '#f0ece0', { align: 'center', shadow: '#000', outline: false });
    if (!free.length) E.font.text(g, 'Every card is on the board.', r.W / 2, r.H - 60, '#f0ece0', { align: 'center', shadow: '#000', outline: false });
    const items = BOARD.held ? [['#↑↓←→', 'Choose a name'], ['confirm', 'Pin it'], ['cancel', 'Put back']] : [['#← →', 'Choose a card'], ['confirm', 'Pick up'], ['cancel', 'Step back']];
    promptRow(g, items, r.W / 2, r.H - 22);
    if (BOARD.msg && BOARD.msgT > 0) { const w = E.font.width(BOARD.msg[1]) + 50; E.ui.box(g, r.W / 2 - w / 2, r.H / 2 - 12, w, 22, { bg: ['#141414', '#0a0a0a'], border: '#d8b860', alpha: .92 }); CAST.FELD.rig.drawPortrait(g, r.W / 2 - w / 2 + 3, r.H / 2 - 10, 18, { zoom: 1.6 }); E.font.text(g, BOARD.msg[1], r.W / 2 - w / 2 + 26, r.H / 2 - 5, '#f0ece0', { outline: false }); }
  });
}

// ---- the office scene ----------------------------------------------------------------------------------------------------------
const OF = { me: null, rig: CAST.KOWAL.rig, npcs: [], stage: 0, ending: false };
const office = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.8, 2], start: 1.25 },
  enter(data = {}) { sceneReset();
    OF.ending = data.mode === 'ending'; OF.demo = !!data.demo;
    OF.me = makeWalker(OFFICE.door.x, OFFICE.door.y - 12);
    OF.npcs = [standActor('MABRY', OFFICE.mabry.x, OFFICE.mabry.y, Math.PI, 'LT. MABRY'), standActor('BRIGGS', OFFICE.briggs.x, OFFICE.briggs.y, Math.PI / 2, 'BRIGGS')];
    OF.npcs.push(OF.ending ? standActor('HASKINS', OFFICE.feld.x, OFFICE.feld.y, Math.PI, 'DEP. OPS HASKINS') : standActor('FELD', OFFICE.feld.x, OFFICE.feld.y, Math.PI, 'ASA FELD'));
    OF.stage = 0; game.cam.bounds = v => OFFICE.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = OF.ending ? .45 : .7;
    music(OF.ending ? 'ending' : 'office');
    if (OF.ending) { CASE.chapter = 5; setObjective('Face the brass', 'Deputy Ops Haskins came down to the basement. That never means good news.'); }
    else { CASE.chapter = 2; setObjective('Talk to Lt. Mabry', 'The lieutenant wants a board. Feld wants paper.'); }
    if (OF.demo) { boardOpen(true); OF.demoT = 0; }
  },
  exit() { game.lights.enabled = false; BOARD.open = false; },
  update(dt) {
    toastTick(dt);
    if (OF.demo) { if (demoInputBreak()) return; boardDemoTick(dt); return; }
    if (notesTick()) return;
    if (BOARD.open) { boardTick(dt, RW()); return; }
    if (talkTick(dt)) { OF.rig.update(dt, OF.me.rigState({})); for (const a of OF.npcs) a.update(dt, null); return; }
    walkerTick(OF.me, OF.rig, OFFICE.map, dt, false);
    for (const a of OF.npcs) { a.update(dt, null); if (E.dist(a, OF.me) < 50) a.face(OF.me); }
    if (I.pressed('view')) game.nextView();
    if (I.pressed('notes') && !IN_HUB) { NOTES.open = true; }
    const it = officeInteract();
    if (it && I.pressed('interact')) it.fn();
    game.focus(OF.me.x, OF.me.y, 12);
  },
  draw(r) {
    OFFICE.map.drawFloor(r); OFFICE.map.queueWalls(r);
    for (const [id, x, y, f] of OFFICE.dress) r.shape(id, x, y, 0, { facing: f });
    // the board on the north wall: cork, photos, string
    const b = OFFICE.board;
    r.queue(b.x, b.y, 0, g => {
      const p0 = r.w(b.x - 30, b.y - 9, 30), p1 = r.w(b.x + 30, b.y - 9, 30), p2 = r.w(b.x + 30, b.y - 9, 12), p3 = r.w(b.x - 30, b.y - 9, 12);
      px.poly(g, [p0, p1, p2, p3], '#8a5a32');
      for (let i = 0; i < 7; i++) { const t = (i + .5) / 7, q = r.w(b.x - 26 + 52 * t, b.y - 9, 18 + (i % 3) * 4); px.rect(g, q[0] - 2, q[1] - 2, 4, 4, '#e8e4dc'); }
    }, { bias: -2 });
    for (let i = 0; i < 3; i++) r.prop('lamp', 3 * T + i * 4 * T, 1 * T + 6, 30, { light: true, size: .6 });
    game.lights.add(7 * T, 5 * T, 40, 160, .6, { color: '#e8f0ff' });
    for (const a of OF.npcs) { a.draw(r); drawTag(r, a, a.label, '#c8c4bc'); }
    drawWalker(r, OF.me, OF.rig);
    const it = officeInteract();
    if (setting('hints', true) && !OF.demo) { const mk = officeMarker(); if (mk) r.marker(mk.x, mk.y, 34, { label: mk.label }); }
    drawToasts(r);
    r.overlay(g => {
      if (OF.demo) { drawDemoBanner(g, r); return; }
      drawHudObjective(g, r);
      const items = []; if (it) items.push(['interact', it.label]); items.push(['notes', 'Notes']);
      if (!BOARD.open) promptRow(g, items, r.W / 2, r.H - 22);
    });
    drawBoard(r);
    talk.draw(r);
    drawNotes(r);
  }
};
function officeMarker() {
  if (OF.ending) return OF.stage === 0 ? { x: OF.npcs[2].x, y: OF.npcs[2].y, label: 'HASKINS' } : null;
  if (OF.stage === 0) return { x: OFFICE.mabry.x, y: OFFICE.mabry.y, label: 'MABRY' };
  if (OF.stage === 1) return { x: OFFICE.board.x, y: OFFICE.board.y + 6, label: 'THE BOARD' };
  return null;
}
function officeInteract() {
  const me = OF.me;
  if (OF.ending) { if (OF.stage === 0 && E.dist(me, OF.npcs[2]) < 34) return { label: 'Talk to Haskins', fn: endingTalk }; return null; }
  if (OF.stage === 0 && E.dist(me, OF.npcs[0]) < 30) return { label: 'Talk to Mabry', fn: mabryBrief };
  if (OF.stage >= 1 && Math.hypot(me.x - OFFICE.board.x, me.y - OFFICE.board.y) < 30) return { label: 'Work the board', fn: () => { boardOpen(false); A.sfx('confirm'); } };
  if (E.dist(me, OF.npcs[1]) < 26) return { label: 'Talk to Briggs', fn: () => say('BRIGGS', E.pick([['Forty-one years and I still can\'t make that coffee taste like coffee.'], ['Pin the money to the top. Always the money. The dope just tells you where the money\'s standing.'], ['Feld\'s good. Feld\'s scary good. Don\'t tell her I said it.']])) };
  if (E.dist(me, OF.npcs[2]) < 26) return { label: 'Talk to Feld', fn: () => say('FELD', ['Show me who does what and who answers to who. Every card goes where a judge can see why.']) };
  return null;
}
function mabryBrief() {
  OF.stage = 1;
  convo([
    ['MABRY', ['Good work on the street. Now the boring part, which is the only part that counts.', 'Feld needs probable cause for a wiretap. Put every picture where it belongs on the board.']],
    ['FELD', ['Who sells, who runs, who collects, who owns it. Pin it to the right name or I can\'t use it.', 'Get me to sixty and I can take it to Judge Talbot.']],
    ['KOWAL', ['And Deacon?']],
    ['MABRY', ['Deacon\'s a question mark with a lawyer. Find me something that points at him and pin it at the top.']]
  ], () => { setObjective('Build the board', 'Pin each card to the name it proves. ' + PC_NEED + ' points of probable cause gets you to the judge.'); autosave(); });
}
function boardDemoTick(dt) {
  OF.demoT += dt;
  OF.rig.update(dt, OF.me.rigState({}));
  if (OF.demoT > .9 && !BOARD.done) {
    OF.demoT = 0;
    const c = BOARD.cards.find(x => !x.on);
    if (c) boardPlace(c, BOARD_SLOTS.find(s => s.id === CARD_RULES[c.id][0]));
  }
  game.focus(OF.me.x, OF.me.y, 12);
  demoTick(dt);
}

// ---- the ending: the brass want dope on the table --------------------------------------------------------------------------------
function endingTalk() {
  OF.stage = 1;
  convo([
    ['HASKINS', ['Lieutenant. Detectives. I hear you\'ve got four bricks and a sixteen-year-old.', 'The Deputy Commissioner wants the bricks on a table Friday. Cameras. Flag behind the table. A good week for the department.']],
    ['MABRY', ['We\'ve got a ledger with a "D" in it, a courier\'s car on a Deacon lot, and a live wire. Sixty more days and we\'re in the money.']],
    ['HASKINS', ['Sixty days is a lot of overtime for a letter of the alphabet.', 'Detective Kowal. You\'re the one who stood on the corner. You tell me.'], { choices: ['Put it on the table', 'Follow the money'], onChoice: c => { CASE.ending = c === 0 ? 'table' : 'money'; } }]
  ], () => {
    const tail = CASE.ending === 'table'
      ? [['HASKINS', ['Smart. Friday, nine a.m. Wear a tie, Lieutenant.']], ['BRIGGS', ['{c=#8a8a9a}(quietly){/c} Wire comes down Monday. You know that.']]]
      : [['HASKINS', ['...Thirty days. Not sixty. And if the stats dip on the west side, it\'s your pension, Cedric, not mine.']], ['MABRY', ['Thirty days. We\'ll take it.']]];
    convo(tail, () => game.go('montage', {}));
  });
}

// ---- the wire room: calls, minimization, tags, pages -----------------------------------------------------------------------------
// each call: the parties, its lines; pert: the line is about the business; key: tagging it logs intel; priv: a lawyer's
// call (privileged: minimize at once)
const CALLS = [
  { from: 'JUNEBUG', to: 'CALLER', toName: 'TASHA', lines: [
    ['CALLER', 'Your mother called me. You forgot her birthday again.'], ['JUNEBUG', 'I ain\'t forget. I\'m getting her something.'],
    ['CALLER', 'Getting her something. From where, the corner store?'], ['JUNEBUG', 'Man, it\'s a cake. A real one. With the writing on it.'],
    ['CALLER', 'You better be at that table Sunday.'], ['JUNEBUG', 'I\'ll be there. I swear on everything.'] ] },
  { from: 'MOE', to: 'TAY', lines: [
    ['MOE', 'Yo. It\'s me.', 1], ['TAY', 'Talk.', 1], ['MOE', 'We light. Real light. Corner\'s gonna be dry by Thursday.', 1, 'The corner runs dry by Thursday'],
    ['TAY', 'Thing comes Thursday night. Same as always. Don\'t call this number no more.', 1, 'Re-up: Thursday night'], ['MOE', 'Aight.', 1] ] },
  { from: 'SQUEAK', to: 'CALLER', toName: 'COUSIN', lines: [
    ['SQUEAK', 'Nah you got cheated, that game is broke, the goalie don\'t even move.'], ['CALLER', 'You just mad you lost.'],
    ['SQUEAK', 'I ain\'t lost, I got cheated. Big difference.'], ['CALLER', 'Come over Thursday, I\'ll beat you again.'],
    ['SQUEAK', 'Can\'t Thursday. Moe got me sitting the house on Lorraine all night.', 1, 'Squeak sits 1419 Lorraine on Thursday'],
    ['SQUEAK', 'Gotta stay up with the thing till Tay come back.', 1, 'Tay brings the package to the house'] ] },
  { page: '2160', answer: '2340', intel: 'The meet: 11:40 PM', hint: 'Tay pages Moe a time.' },
  { from: 'CALLER', fromName: 'MR. EARL', to: 'CALLER', toName: 'MR. LEON', lines: [
    ['CALLER', 'You see the game last night? Bullpen gave it away in the eighth.'], ['CALLER', 'Every year. Every year they break my heart in August.'],
    ['CALLER', 'My grandson says they gonna be good in two years.'], ['CALLER', 'Your grandson said that two years ago.'],
    ['CALLER', 'Ha. Yeah. Yeah he did.'] ] },
  { from: 'TAY', to: 'PRUITT', lines: [
    ['PRUITT', 'You the one called?', 1], ['TAY', 'Usual time. You know the box.', 1],
    ['PRUITT', 'Which box. I ain\'t been down there since the summer.', 1], ['TAY', 'The box on Lorraine and Fulton. Corner by the bus stop.', 1, 'The meet: payphone at Lorraine and Fulton'],
    ['PRUITT', 'He coming?', 1], ['TAY', 'He don\'t come. He never come. Just bring it.', 1, 'Deacon stays away from the package'] ] },
  { page: '0368', answer: '0148', intel: 'The box: 555-0148, confirmed', hint: 'The payphone\'s last four digits.' },
  { from: 'CALLER', fromName: 'BRENNAN & ASSOC.', to: 'TAY', priv: true, lines: [
    ['CALLER', 'Mr. Rucker, this is the office of Saul Brennan, attorney at law. Please hold for Mr. Brennan.', 0],
    ['CALLER', 'Tavon. About that matter we discussed. I need you to listen carefully.', 0], ['TAY', 'I\'m listening.', 0],
    ['CALLER', 'Do not, under any circumstances, discuss the car lot on a telephone.', 0] ] }
];
const MIN_LIMIT = 6, PRIV_LIMIT = 2.5, SPOT_LEN = 3, SPOT_WAIT = 2.5, LINE_T = 3.1;
const WR = { i: 0, call: null, li: 0, lt: 0, state: 'idle', listenT: 0, minT: 0, spotT: 0, pert: false, tags: [], entry: '', tries: 0, msg: null, msgT: 0, done: false, gap: 0, demo: false, shown: 0, logged: [], foc: 0 };
function wireReset(demo) { Object.assign(WR, { i: 0, call: null, li: 0, lt: 0, state: 'idle', listenT: 0, minT: 0, spotT: 0, pert: false, entry: '', tries: 0, msg: null, msgT: 0, done: false, gap: 2, demo: !!demo, shown: 0, logged: [], foc: 0 }); }
function wireNext() {
  if (WR.i >= CALLS.length) { WR.done = true; WR.state = 'done'; return; }
  WR.call = CALLS[WR.i++]; WR.li = 0; WR.lt = 0; WR.listenT = 0; WR.minT = 0; WR.spotT = 0; WR.pert = false; WR.shown = 0; WR.entry = ''; WR.tries = 0; WR.logged = [];
  if (WR.call.page) { WR.state = 'page'; A.sfx('pager'); } else { WR.state = 'ring'; WR.ringT = 1.2; A.sfx('ring'); }
}
function wireMsg(t, c = '#f0ece0') { WR.msg = [t, c]; WR.msgT = 2.4; }
function wireViolation(why) {
  CASE.violations++; A.sfx('wrong'); wireMsg('VIOLATION: ' + why, '#ff6040');
  game.shake && game.shake(1);
  if (CASE.violations >= 3 && !WR.demo) { WR.state = 'pulled'; game.after(2, () => game.go('gameover', { why: 'wire', retry: { scene: 'wire' } })); }
}
function wireTick(dt, r) {
  if (WR.msgT > 0) WR.msgT -= dt;
  const c = WR.call;
  if (WR.state === 'idle' || WR.state === 'between') { WR.gap -= dt; if (WR.gap <= 0) wireNext(); return; }
  if (WR.state === 'done' || WR.state === 'pulled') return;
  if (WR.state === 'ring') { WR.ringT -= dt; if (WR.ringT <= 0) { WR.state = 'listen'; A.sfx('tape'); } return; }
  if (WR.state === 'page') { pageTick(dt, r); return; }
  // the call plays on whether or not we listen: lines advance on the clock
  const line = c.lines[WR.li];
  WR.lt += dt;
  const listening = WR.state === 'listen' || WR.state === 'spot';
  if (line) {
    const len = line[1].length, typed = Math.min(len, Math.floor(WR.lt * 30));
    if (listening && typed > WR.shown) { if (typed - WR.shown >= 2 || typed === len) { voiceBlip(line[0] === 'CALLER' ? 'CALLER' : line[0], line[1][typed - 1] || 'a', .05); WR.shown = typed; } }
    if (listening && line[2]) WR.pert = true;
    if (WR.lt > Math.max(LINE_T, len / 30 + 1.2)) { WR.li++; WR.lt = 0; WR.shown = 0; if (WR.li >= c.lines.length) { wireEndCall(); return; } }
  }
  if (WR.state === 'listen') {
    WR.listenT += dt;
    if (c.priv && WR.listenT > PRIV_LIMIT) { wireViolation('a privileged call. Lawyers are off limits.'); WR.state = 'min'; WR.minT = 0; WR.privHit = true; }
    else if (!c.priv && !WR.pert && WR.listenT > MIN_LIMIT) { wireViolation('a personal call, past the minimization limit.'); WR.state = 'min'; WR.minT = 0; }
  } else if (WR.state === 'min') { WR.minT += dt; }
  else if (WR.state === 'spot') { WR.spotT -= dt; if (WR.pert) { WR.state = 'listen'; wireMsg('Pertinent. Back on it.', '#60f080'); } else if (WR.spotT <= 0) { WR.state = 'min'; WR.minT = 0; } }
  // input: tag, minimize, spot check (buttons and clicks)
  let tag = I.pressed('interact') || I.pressed('confirm'), mini = I.pressed('act2'), click = I.clicked();
  if (click && r) { const B = wireButtons(r); for (const b of B) if (hit(click, b.x, b.y, b.w, b.h)) { if (b.id === 'tag') tag = true; if (b.id === 'min') mini = true; } }
  if (WR.demo) { tag = false; mini = false; const ln = c.lines[WR.li]; if (WR.state === 'listen' && ln && ln[3] && WR.lt > 1.2 && !WR.logged.includes(WR.li)) tag = true; if (WR.state === 'listen' && !WR.pert && WR.listenT > 3) mini = true; if (WR.state === 'min' && WR.minT > SPOT_WAIT + .2 && !c.priv) tag = true; }
  if (WR.state === 'listen' && tag) {
    const ln = c.lines[WR.li];
    if (ln && ln[3] && !WR.logged.includes(WR.li)) { WR.logged.push(WR.li); if (!CASE.intel.includes(ln[3])) CASE.intel.push(ln[3]); A.sfx('pin'); wireMsg('LOGGED: ' + ln[3], '#60f080'); }
    else { CASE.tagsWasted++; A.sfx('cancel'); wireMsg('Nothing worth logging in that line.', '#c8c4bc'); }
  } else if (WR.state === 'min' && tag) {
    if (WR.minT >= SPOT_WAIT && !c.priv) { WR.state = 'spot'; WR.spotT = SPOT_LEN; A.sfx('click'); }
    else if (c.priv) wireMsg('Privileged. Stay off it.', '#ff8060'); else wireMsg('Spot check in ' + Math.ceil(SPOT_WAIT - WR.minT) + '...', '#c8c4bc');
  }
  if ((WR.state === 'listen' || WR.state === 'spot') && mini) { WR.state = 'min'; WR.minT = 0; A.sfx('click'); if (WR.pert && !c.priv) wireMsg('Minimized a pertinent call. You\'ll miss what they say.', '#f0a040'); }
}
function wireEndCall() {
  const c = WR.call;
  // missed intel stays missed; a call ends with a note in the log
  const keys = c.lines.filter(l => l[3]).length, got = WR.logged.length;
  if (keys && got < keys) wireMsg('Call ended. ' + (keys - got) + ' pertinent line' + (keys - got > 1 ? 's' : '') + ' not logged.', '#f0a040');
  else if (!keys && !c.priv) wireMsg('Call ended. Properly minimized.', '#c8c4bc');
  WR.state = 'between'; WR.gap = 1.8; A.sfx('click');
}
const KEYPAD = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];
function pageTick(dt, r) {
  const c = WR.call;
  let digit = null;
  DIGIT_ACTS.forEach((a, d) => { if (I.pressed(a)) digit = String(d); });
  const kx = WR.foc % 3, ky = Math.floor(WR.foc / 3);
  if (I.repeat('left')) WR.foc = ky * 3 + (kx + 2) % 3; if (I.repeat('right')) WR.foc = ky * 3 + (kx + 1) % 3;
  if (I.repeat('up')) WR.foc = ((ky + 3) % 4) * 3 + kx; if (I.repeat('down')) WR.foc = ((ky + 1) % 4) * 3 + kx;
  const pointer = I.pointer(), click = I.clicked();
  if (r) for (let i = 0; i < 12; i++) { const q = keypadRect(r, i); if (pointer && I.lastDevice === 'mouse' && hit(pointer, q.x, q.y, q.w, q.h)) WR.foc = i; if (click && hit(click, q.x, q.y, q.w, q.h)) { WR.foc = i; digit = keypadPress(i); } }
  if (I.pressed('confirm') || I.pressed('interact')) digit = keypadPress(WR.foc);
  if (I.pressed('cancel') || I.pressed('act2')) { WR.entry = WR.entry.slice(0, -1); A.sfx('cancel'); }
  if (WR.demo && game.time % .8 < dt) digit = c.answer[WR.entry.length];
  if (digit === 'del') { WR.entry = WR.entry.slice(0, -1); A.sfx('cancel'); digit = null; }
  if (digit && /\d/.test(digit) && WR.entry.length < 4) { WR.entry += digit; A.sfx('blip'); }
  if (WR.entry.length === 4) {
    if (WR.entry === c.answer) { if (!CASE.intel.includes(c.intel)) CASE.intel.push(c.intel); A.sfx('powerup'); wireMsg('DECODED: ' + c.intel, '#60f080'); WR.state = 'between'; WR.gap = 2.2; }
    else { WR.tries++; A.sfx('wrong'); wireMsg(WR.tries >= 3 ? 'Briggs: "Try ' + c.answer.slice(0, 2) + '.. Mirror it, Dana."' : 'That number doesn\'t mean anything. Mirror the keypad.', '#f0a040'); WR.entry = WR.tries >= 3 ? c.answer.slice(0, 2) : ''; }
  }
}
function keypadPress(i) { const k = KEYPAD[Math.floor(i / 3)][i % 3]; return k === '*' || k === '#' ? 'del' : k; }
function keypadRect(r, i) { const s = 26, x0 = Math.round(r.W / 2 + 30), y0 = Math.round(r.H / 2 - 56); return { x: x0 + (i % 3) * (s + 4), y: y0 + Math.floor(i / 3) * (s + 4), w: s, h: s }; }
function wireButtons(r) {
  const y = r.H - 46, w = 110;
  return [{ id: 'tag', x: Math.round(r.W / 2 - w - 8), y, w, h: 18, act: 'interact', label: WR.state === 'min' ? 'SPOT-CHECK' : 'TAG LINE' }, { id: 'min', x: Math.round(r.W / 2 + 8), y, w, h: 18, act: 'act2', label: 'MINIMIZE' }];
}
function mirrorDigit(d) { return { 1: '3', 3: '1', 4: '6', 6: '4', 7: '9', 9: '7' }[d] || d; }
const wire = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso'], camera: false,
  enter(data = {}) { sceneReset();
    CASE.chapter = 3; wireReset(!!data.demo); WR.intro = !data.demo;
    game.cam.bounds = v => BASEMENT.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .4; music('wire');
    WR.me = new Actor('KOWAL', BASEMENT.seatA.x, BASEMENT.seatA.y, { facing: -Math.PI / 2 }); WR.me.pose = 'kneel';
    WR.br = new Actor('BRIGGS', BASEMENT.seatB.x, BASEMENT.seatB.y, { facing: -Math.PI / 2 }); WR.br.pose = 'kneel';
    setObjective('Work the wire', 'Log what matters. Minimize what doesn\'t. Decode the pages.');
    if (!data.demo) {
      WR.state = 'intro';
      convo([
        ['BRIGGS', ['Rules of the room. A call comes in, you listen. If it ain\'t about the business, you minimize: ' + keyLabel('act2') + '.', 'You got about two minutes on the tape. Call it six seconds of your life. Go past that on a call about somebody\'s mama, that\'s a violation.']],
        ['BRIGGS', ['Minimized, you can spot-check after a bit with ' + keyLabel('interact') + '. If it turned dirty, stay on it.', 'When they say something worth having, tag the line with ' + keyLabel('interact') + '. Three violations and Talbot pulls the plug.']],
        ['BRIGGS', ['And lawyers. A lawyer calls, you get off that line like it\'s on fire.', 'Their pagers: they mirror the keypad. One and three swap, four and six, seven and nine. The middle column stays.']]
      ], () => { WR.state = 'idle'; WR.gap = 1; });
    }
  },
  exit() { game.lights.enabled = false; },
  update(dt) {
    toastTick(dt);
    if (WR.demo) { if (demoInputBreak()) return; }
    else { if (notesTick()) return; if (talkTick(dt)) { WR.me.update(dt, null); WR.br.update(dt, null); return; } if (I.pressed('notes') && !IN_HUB) NOTES.open = true; }
    if (WR.state !== 'intro') wireTick(dt, RW());
    WR.me.update(dt, null); WR.br.update(dt, null);
    game.focus(5 * T, 3 * T, 10);
    if (WR.done && !WR.leaving && !WR.demo) {
      WR.leaving = true;
      const need = ['The meet: 11:40 PM', 'The meet: payphone at Lorraine and Fulton'];
      const ok = need.every(n => CASE.intel.includes(n));
      convo([['BRIGGS', ok ? ['Eleven-forty, the box at Lorraine and Fulton, Thursday. Tay meets the courier himself.', 'That\'s the re-up. That\'s our night.'] : ['We got pieces. Thursday. Lorraine. Not the hour, not the spot, not all of it.', 'Mabry wants to go anyway. We sit on the payphone and hope.']],
        ['KOWAL', ['Thursday night. Bring coffee.']]], () => { WR.leaving = false; chapterDone(3); });
    }
    if (WR.demo) demoTick(dt);
  },
  draw(r) {
    BASEMENT.map.drawFloor(r); BASEMENT.map.queueWalls(r);
    for (const [id, x, y, f] of BASEMENT.dress) r.shape(id, x, y, 0, { facing: f });
    r.prop('lamp', 5 * T, 1 * T + 4, 28, { light: true, size: .6 });
    game.lights.add(3 * T, 2 * T, 20, 50, .5, { color: '#60f0a0' }); game.lights.add(6.5 * T, 2 * T, 20, 50, .5, { color: '#60f0a0' });
    WR.me.draw(r); WR.br.draw(r);
    drawToasts(r);
    r.overlay(g => drawWireUi(g, r));
    talk.draw(r);
    drawNotes(r);
  }
};
function drawWireUi(g, r) {
  if (WR.demo) drawDemoBanner(g, r); else drawHudObjective(g, r);
  const c = WR.call, W = r.W, H = r.H;
  // violations and logged counts
  E.ui.box(g, W - 118, 6, 112, 26, { bg: ['#0c0c12', '#14141c'], border: '#3a3a48', alpha: .85 });
  E.font.text(g, 'VIOLATIONS', W - 112, 10, '#8a8a9a', { font: 'tiny', outline: false });
  for (let i = 0; i < 3; i++) px.rect(g, W - 56 + i * 12, 9, 9, 7, i < CASE.violations ? '#e0a03a' : '#3a3a48');
  E.font.text(g, 'LOGGED  ' + CASE.intel.length, W - 112, 20, '#60f080', { font: 'tiny', outline: false });
  if (!c || WR.state === 'intro') return;
  const pw = Math.min(360, W - 24), ph = 118, x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2 - 14);
  if (WR.state === 'page') { drawPager(g, r, c); return; }
  if (WR.state === 'done') { panel(g, x, y, pw, 50, 'LINE QUIET'); E.font.text(g, 'No more calls tonight.', x + 10, y + 26, '#c8c4bc', { outline: false }); return; }
  const lineName = CASE.line === 'cell' ? 'TAY\'S CELL • 443-555-0172' : 'PAYPHONE • LORRAINE & FULTON • 555-0148';
  panel(g, x, y, pw, ph, lineName);
  const fromN = c.fromName || c.from, toN = c.toName || c.to;
  E.font.text(g, (WR.state === 'ring' ? 'INCOMING  ' : 'CALL  ') + String(fromN) + '  →  ' + String(toN), x + 10, y + 21, '#a8a49c', { font: 'tiny', outline: false });
  // the reels turn while the tape rolls
  const live = WR.state === 'listen' || WR.state === 'spot';
  for (const k of [0, 1]) { const cx = x + pw - 40 + k * 18, cy = y + 24, a = game.real * (live ? 6 : 1.5); px.disc(g, cx, cy, 6, '#2a2a30'); px.disc(g, cx, cy, 5, '#5a5a62'); px.dot(g, Math.round(cx + Math.cos(a) * 3), Math.round(cy + Math.sin(a) * 3), '#141414'); px.dot(g, Math.round(cx - Math.cos(a) * 3), Math.round(cy - Math.sin(a) * 3), '#141414'); }
  if (WR.state === 'ring') { E.font.text(g, 'RING... RING...', x + pw / 2, y + 56, '#f0d060', { align: 'center', scale: 2, outline: false }); return; }
  // the transcript: the current line typed, the last line above it
  if (live) {
    const ln = c.lines[WR.li], prev = c.lines[WR.li - 1];
    if (prev) E.font.text(g, nameOf(prev[0], c) + ': ' + prev[1], x + 10, y + 32, '#6a6a72', { outline: false, wrap: pw - 20 });
    if (ln) {
      const txt = ln[1].slice(0, Math.min(ln[1].length, Math.floor(WR.lt * 30)));
      E.font.text(g, nameOf(ln[0], c), x + 10, y + 52, '#d8b860', { outline: false });
      let yy = y + 62; for (const l of wrapText(txt, pw - 20)) { E.font.text(g, l, x + 10, yy, '#f0ece0', { outline: false, shadow: '#000' }); yy += 10; }
      if (WR.logged.includes(WR.li)) E.font.text(g, 'LOGGED', x + pw - 12, y + 52, '#60f080', { align: 'right', font: 'tiny', outline: false });
    }
    // the minimization clock: fills on a call that hasn't turned pertinent
    const lim = c.priv ? PRIV_LIMIT : MIN_LIMIT, k = WR.pert && !c.priv ? 0 : Math.min(1, WR.listenT / lim);
    E.font.text(g, WR.pert && !c.priv ? 'PERTINENT • LISTEN FREELY' : 'MINIMIZATION CLOCK', x + 10, y + ph - 14, WR.pert && !c.priv ? '#60f080' : '#8a8a9a', { font: 'tiny', outline: false });
    if (!(WR.pert && !c.priv)) E.ui.bar(g, x + 100, y + ph - 15, pw - 112, 6, k, k > .75 ? '#ff5040' : '#e0c050');
    if (WR.state === 'spot') E.font.text(g, 'SPOT-CHECK ' + Math.ceil(WR.spotT), x + pw - 12, y + 21, '#60c0f0', { align: 'right', font: 'tiny', outline: false });
  } else if (WR.state === 'min') {
    E.font.text(g, 'MINIMIZED', x + pw / 2, y + 50, '#8a8a9a', { align: 'center', scale: 2, outline: false });
    E.font.text(g, c.priv ? 'Privileged call. Stay off the line.' : WR.minT < SPOT_WAIT ? 'Spot-check allowed in ' + Math.ceil(SPOT_WAIT - WR.minT) + ' s' : 'Spot-check allowed', x + pw / 2, y + 74, '#c8c4bc', { align: 'center', outline: false });
    for (let i = 0; i < 24; i++) px.rect(g, x + pw / 2 - 48 + i * 4, y + 90 - (E.hash2(i, Math.floor(game.real * 8)) * 6 | 0), 2, 1 + (E.hash2(i, Math.floor(game.real * 8)) * 6 | 0), '#3a3a48');
  }
  // the buttons: big, labelled with the player's own keys
  for (const b of wireButtons(r)) {
    const active = (b.id === 'tag' && (live || WR.state === 'min')) || (b.id === 'min' && live);
    E.ui.box(g, b.x, b.y, b.w, b.h, { bg: active ? ['#2a2a3a', '#1a1a24'] : ['#141418', '#101014'], border: active ? '#d8b860' : '#3a3a48' });
    badge(g, b.act, b.x + 4, b.y + 4);
    E.font.text(g, b.id === 'tag' ? (WR.state === 'min' ? 'SPOT-CHECK' : 'TAG LINE') : 'MINIMIZE', b.x + 20, b.y + 6, active ? '#f0ece0' : '#5a5a62', { outline: false });
  }
  if (WR.msg && WR.msgT > 0) E.font.text(g, WR.msg[0], W / 2, H - 22, WR.msg[1], { align: 'center', shadow: '#000', outline: false });
}
function nameOf(id, c) { if (id === 'CALLER') return (c.from === 'CALLER' ? c.fromName : c.toName) || 'CALLER'; return id === 'TAY' ? 'TAY' : id; }
function drawPager(g, r, c) {
  const W = r.W, H = r.H, x = Math.round(W / 2 - 170), y = Math.round(H / 2 - 64);
  panel(g, x, y, 190, 128, 'PAGE INTERCEPTED');
  px.rect(g, x + 12, y + 26, 166, 30, '#2a3a2a'); px.rect(g, x + 14, y + 28, 162, 26, '#8aa878');
  E.font.text(g, c.page, x + 95, y + 33, '#1a2a1a', { align: 'center', scale: 2, outline: false });
  E.font.text(g, c.hint, x + 12, y + 62, '#c8c4bc', { outline: false, wrap: 166 });
  E.font.text(g, 'DECODED', x + 12, y + 86, '#8a8a9a', { font: 'tiny', outline: false });
  for (let i = 0; i < 4; i++) { px.rect(g, x + 12 + i * 22, y + 94, 18, 20, '#141418'); E.font.text(g, WR.entry[i] || '', x + 21 + i * 22, y + 98, '#f0d060', { align: 'center', scale: 2, outline: false }); }
  // the keypad, with the mirror shown as arrows
  for (let i = 0; i < 12; i++) {
    const q = keypadRect(r, i), k = KEYPAD[Math.floor(i / 3)][i % 3], foc = WR.foc === i;
    E.ui.box(g, q.x, q.y, q.w, q.h, { bg: foc ? ['#4a4a5a', '#2a2a3a'] : ['#2a2a30', '#18181e'], border: foc ? '#ffe060' : '#4a4a5a' });
    E.font.text(g, k === '*' || k === '#' ? '←' : k, q.x + q.w / 2, q.y + 6, '#f0ece0', { align: 'center', scale: 2, outline: false });
    if (/[1346 79]/.test(k) && k !== ' ') E.font.text(g, mirrorDigit(k), q.x + q.w - 3, q.y + q.h - 8, '#6a6a72', { align: 'right', font: 'tiny', outline: false });
  }
  const kq = keypadRect(r, 0);
  E.font.text(g, 'MIRROR: 1-3  4-6  7-9', kq.x, kq.y - 10, '#d8b860', { font: 'tiny', outline: false });
  promptRow(g, [['#0-9', 'Type'], ['confirm', 'Press key'], ['cancel', 'Delete']], W / 2, H - 22);
  if (WR.msg && WR.msgT > 0) E.font.text(g, WR.msg[0], W / 2, H - 38, WR.msg[1], { align: 'center', shadow: '#000', outline: false });
}

// ---- the stash house: search it in the dark ------------------------------------------------------------------------------------------
const SH = { me: null, holdT: 0, target: null, searched: [], squad: [] };
const stash = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.8, 2], start: 1.3 },
  enter() { sceneReset();
    SH.me = makeWalker(STASH.entry.x, STASH.entry.y - 8); SH.searched = []; SH.holdT = 0;
    SH.squad = STASH.squad.map((p, i) => { const a = new Actor('raid' + i, p.x, p.y, { look: { build: 'heroic', outfit: 'coat', hat: { style: 'helmet', color: '#1a1a22' }, weapon: 'gun', colors: { coat: '#1a2448', cloth: '#2a2a34', pants: '#1a1a2a', metal: '#2a2a2a' } } }); a.point = true; a.facing = -Math.PI / 2 + i; return a; });
    game.cam.bounds = v => STASH.map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .18; music('night');
    setObjective('Search 1419 (0/2)', 'Hold ' + keyLabel('interact') + ' to search. The package and anything with Deacon on it.');
    say('BRIGGS', ['House is clear. One kid in custody, one out the window. Find me that package before somebody calls the news.'], { auto: 3.5, modal: false });
  },
  exit() { game.lights.enabled = false; },
  update(dt) {
    toastTick(dt);
    if (notesTick()) return;
    if (talkTick(dt)) { SH.me && OF.rig.update(dt, SH.me.rigState({})); return; }
    const near = STASH.spots.filter(s => !SH.searched.includes(s.id) && Math.hypot(s.x - SH.me.x, s.y - SH.me.y) < 22).sort((a, b) => Math.hypot(a.x - SH.me.x, a.y - SH.me.y) - Math.hypot(b.x - SH.me.x, b.y - SH.me.y))[0];
    SH.target = near || null;
    const holding = near && I.down('interact');
    walkerTick(SH.me, CAST.KOWAL.rig, STASH.map, dt, holding);
    if (holding) { SH.holdT += dt; if (SH.holdT > 1.3) { stashSearch(near); SH.holdT = 0; } } else SH.holdT = 0;
    if (I.pressed('view')) game.nextView();
    if (I.pressed('notes') && !IN_HUB) NOTES.open = true;
    for (const a of SH.squad) a.update(dt, null);
    game.focus(SH.me.x, SH.me.y, 12);
  },
  draw(r) {
    STASH.map.drawFloor(r); STASH.map.queueWalls(r);
    for (const d of STASH.dress) { if (d[0] === 'prop') r.prop(d[1], d[2], d[3], 0, d[4]); else r.shape(d[1], d[2], d[3], 0, d[4]); }
    const m = SH.me, f = m.facing;
    game.lights.add(m.x + Math.cos(f) * 30, m.y + Math.sin(f) * 30, 12, 60, 1, { color: '#fff4d0' });
    game.lights.add(m.x, m.y, 20, 26, .5, { color: '#fff4d0' });
    for (const a of SH.squad) { a.draw(r); const c = Math.cos(a.facing), s = Math.sin(a.facing); game.lights.add(a.x + c * 26, a.y + s * 26, 12, 40, .7, { color: '#e8f0ff' }); }
    drawWalker(r, m, CAST.KOWAL.rig);
    for (const s of STASH.spots) if (!SH.searched.includes(s.id)) r.textAt(s.x, s.y, 20, '•', '#f0d060');
    drawToasts(r);
    r.overlay(g => {
      drawHudObjective(g, r);
      const items = [];
      if (SH.target) items.push(['interact', 'Hold: search the ' + SH.target.name.toLowerCase()]);
      items.push(['notes', 'Notes']);
      promptRow(g, items, r.W / 2, r.H - 22);
      if (SH.holdT > 0) E.ui.bar(g, r.W / 2 - 40, r.H - 34, 80, 4, SH.holdT / 1.3, '#f0d060');
    });
    talk.draw(r); drawNotes(r);
  }
};
function stashSearch(s) {
  SH.searched.push(s.id); A.sfx(s.holds ? 'secret' : 'bump');
  if (s.holds) { addEvidence(s.holds); CASE[s.holds] = true; toast('EVIDENCE', EVIDENCE[s.holds].name); }
  say('KOWAL', [s.note]);
  const found = (hasEv('package') ? 1 : 0) + (hasEv('ledger') ? 1 : 0);
  setObjective('Search 1419 (' + found + '/2)', 'Hold ' + keyLabel('interact') + ' to search.');
  if (found >= 2) game.after(.4, () => { talk.open ? null : null; const go = () => convo([['MABRY', ['{c=#d8b860}[RADIO]{/c} Package. Ledger. Good. Wrap it up, Kowal. The brass already heard.']]], () => chapterDone(4)); if (talk.open) { const od = talk.onDone; talk.onDone = () => { if (od) od(); go(); }; } else go(); });
}

// ---- 05-meta.js ----
// ============================================================================================================
// REWIRED • 05 meta: the title (and its attract mode), chapter cards, results, game over, the ending montage,
// About / Credits, and the AI Hub session (ghost mode: a surveillance shift; the other detectives walk the
// block beside you as ghosts).
// ============================================================================================================
const RW = () => ({ W: game.W, H: game.H });
// kept in memory too, so a browser that blocks storage still unlocks chapters for the visit
const MEM = {};
const unlocked = () => Math.max(MEM.unlocked || 1, E.store.get('rewired-unlocked', 1));
function unlock(n) { if (n > unlocked()) { MEM.unlocked = n; E.store.set('rewired-unlocked', n); } }

// ---- the title -------------------------------------------------------------------------------------------------------
const TI = { menu: null, idle: 0, t: 0, lastPtr: null, chapters: false, rain: [] };
function titleMenu() {
  const items = [];
  const save = (() => { try { return game.saves.latest(); } catch (e) { return null; } })();
  items.push({ label: 'NEW CASE', id: 'new' });
  items.push({ label: 'CONTINUE', id: 'continue', disabled: !save });
  items.push({ label: 'CHAPTER SELECT', id: 'chapters', disabled: unlocked() < 2 });
  items.push({ label: 'SURVEILLANCE SHIFT • 1-2 PLAYERS', id: 'shift' });
  items.push({ label: 'SETTINGS', id: 'settings' });
  items.push({ label: 'ABOUT & CREDITS', id: 'about' });
  TI.items = items;
  TI.menu = new E.Menu(game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 0, onPick: i => titlePick(items[i]) });
  TI.menu.bg = '#0c0c12'; TI.menu.border = '#4a4a5a'; TI.menu.pick = '#d8b860';
}
function chapterMenu() {
  const n = unlocked(), items = [];
  for (let c = 1; c <= 5; c++) items.push({ label: CHAPTERS[c].tape + ' • ' + CHAPTERS[c].name.toUpperCase(), id: 'ch' + c, ch: c, disabled: c > n });
  items.push({ label: 'BACK', id: 'back' });
  TI.items = items;
  TI.menu = new E.Menu(game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 0, title: 'CHAPTER SELECT', onPick: i => titlePick(items[i]), onCancel: () => { titleMenu(); } });
  TI.menu.bg = '#0c0c12'; TI.menu.border = '#4a4a5a'; TI.menu.pick = '#d8b860';
}
function titlePick(it) {
  if (!it) return;
  if (it.id === 'new') { CASE = freshCase(); game.go('street', { mode: 'coldopen' }); }
  else if (it.id === 'continue') { try { const s = game.saves.latest(); if (s) { game.saves.load(s.slot); startChapter(CASE.chapter || 1, true); } } catch (e) { game.fail && game.fail('continue', e); } }
  else if (it.id === 'chapters') chapterMenu();
  else if (it.id === 'back') titleMenu();
  else if (it.ch) { CASE = freshCase(); seedCaseFor(it.ch); game.go('card', { chapter: it.ch }); }
  else if (it.id === 'shift') { CASE = freshCase(); game.go('street', { mode: 'shift', seconds: 180 }); }
  else if (it.id === 'settings') { try { game.menu('settings'); } catch (e) {} }
  else if (it.id === 'about') game.go('about', {});
}
// a chapter picked from the menu gets the evidence the earlier chapters would have given
function seedCaseFor(ch) {
  CASE.chapter = ch;
  if (ch >= 2) { for (const id of ['pigeon', 'h2h1', 'h2h2', 'stash', 'collect', 'tay', 'house']) addEvidence(id); CASE.pigeonPaid = 20; }
  if (ch >= 3) { CASE.pc = 90; CASE.line = 'payphone'; }
  if (ch >= 4) CASE.intel.push('Re-up: Thursday night', 'The meet: 11:40 PM', 'The meet: payphone at Lorraine and Fulton');
  if (ch >= 5) { for (const id of ['handoff', 'plate', 'arrest', 'package', 'ledger']) addEvidence(id); CASE.squeakCaught = true; }
}
function startChapter(n, fromSave) {
  const c = CHAPTERS[n];
  if (!c) { game.go('title'); return; }
  CASE.chapter = n;
  if (c.scene === 'street') game.go('street', { mode: c.mode, stage: fromSave && CASE.checkpoints[c.mode] ? CASE.checkpoints[c.mode] : 0 });
  else if (c.scene === 'office') game.go('office', {});
  else if (c.scene === 'wire') game.go('wire', {});
  else if (c.scene === 'ending') game.go('office', { mode: 'ending' });
}
const title = {
  enter() { sceneReset();
    titleMenu(); TI.idle = 0; TI.t = 0; TI.lastPtr = null; game.lights.enabled = false;
    music('title'); game.weather = null; NOTES.open = false; OBJECTIVE = { title: '', text: '' };
    try { I.touchButtons([]); } catch (e) {}
    TI.rain = []; for (let i = 0; i < 90; i++) TI.rain.push([Math.random(), Math.random(), .5 + Math.random()]);
  },
  update(dt) {
    TI.t += dt; toastTick(dt);
    const ptr = I.pointer();
    const moved = ptr && TI.lastPtr && (Math.abs(ptr[0] - TI.lastPtr[0]) + Math.abs(ptr[1] - TI.lastPtr[1]) > 2);
    TI.lastPtr = ptr ? ptr.slice() : null;
    if (I.anyPressed() || I.clicked() || moved || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3)) TI.idle = 0; else TI.idle += dt;
    if (TI.idle > 10) { demoStart(); return; }
    if (DEV.touchOnly) {
      const c = I.clicked(), b = touchSettingsBtn();
      if (c && hit(c, b.x, b.y, b.w, b.h)) { try { game.menu('settings'); } catch (e) {} }
      return;
    }
    TI.menu.y = Math.round(game.H * .5);
    TI.menu.update(dt);
  },
  draw(r) {
    drawTitleBackdrop(r);
    r.overlay(g => {
      const m = Math.round(r.H * .5);
      E.font.title(g, TITLE, r.W / 2, Math.round(r.H * .16), { scale: 5, align: 'center', colors: ['#f0ece0', '#d8b860', '#8a6a2a'], outline: '#0a0a0a', depth: 3, depthColor: '#2a1a0a' });
      E.font.text(g, 'A BALTIMORE CASE IN FIVE TAPES', r.W / 2, Math.round(r.H * .16) + 46, '#a8a49c', { align: 'center', shadow: '#000', outline: false });
      if (DEV.touchOnly) {
        E.ui.box(g, r.W / 2 - 130, m - 8, 260, 40, { bg: ['#1a0c0c', '#0c0606'], border: '#e04a3a', alpha: .92 });
        E.font.text(g, 'Controller or keyboard required', r.W / 2, m + 2, '#f0ece0', { align: 'center', scale: 1, outline: false });
        E.font.text(g, 'Connect a gamepad or keyboard to play', r.W / 2, m + 16, '#a8a49c', { align: 'center', font: 'tiny', outline: false });
        const b = touchSettingsBtn(); E.ui.box(g, b.x, b.y, b.w, b.h, { bg: ['#2a2a3a', '#1a1a24'], border: '#d8b860' }); E.font.text(g, 'SETTINGS', b.x + b.w / 2, b.y + 7, '#f0ece0', { align: 'center', outline: false });
      }
      E.font.text(g, 'v' + VERSION + ' • my-3D2dge ' + (E.version || ''), 6, r.H - 10, '#4a4a5a', { font: 'tiny', outline: false });
      if (!DEV.touchOnly) promptRow(g, [['#↑↓', 'Choose'], ['confirm', 'Select']], r.W / 2, r.H - 22);
    });
    if (!DEV.touchOnly) TI.menu.draw(r);
    drawToasts(r);
  }
};
function touchSettingsBtn() { return { x: Math.round(game.W / 2 - 50), y: Math.round(game.H * .5 + 44), w: 100, h: 20 }; }
// a skyline of rowhouses in the rain, sneakers on the wire, a streetlamp humming
function drawTitleBackdrop(r) {
  r.sky(['#06060c', '#141428', '#2a2030']);
  r.overlay(g => {
    const W = r.W, H = r.H, base = Math.round(H * .78);
    for (let i = 0; i < 40; i++) { const x = Math.round((i * 37 + 11) % W), y = Math.round((i * 53) % (H * .4)); if (E.hash2(i, 3) > .5) px.dot(g, x, y, '#3a3a5a'); }
    // rowhouses
    let x = -10, k = 0;
    while (x < W + 20) {
      const w = 30 + Math.round(E.hash2(k, 1) * 16), h = 70 + Math.round(E.hash2(k, 2) * 26), vac = E.hash2(k, 4) > .78;
      px.rect(g, x, base - h, w, h, vac ? '#141010' : '#1c1416'); px.rect(g, x, base - h, w, 3, '#0a0808');
      for (let fy = 0; fy < 3; fy++) for (let fx = 0; fx < 2; fx++) {
        const wx = x + 6 + fx * (w / 2), wy = base - h + 10 + fy * 22, lit = !vac && E.hash2(k * 7 + fx, fy + Math.floor(TI.t / 9)) > .62;
        px.rect(g, wx, wy, 8, 11, vac ? '#4a3a24' : lit ? '#d8a050' : '#10141c');
        if (vac) { px.line(g, wx, wy, wx + 7, wy + 10, '#2a1e14'); px.line(g, wx + 7, wy, wx, wy + 10, '#2a1e14'); }
      }
      px.rect(g, x + w / 2 - 6, base - 6, 12, 6, '#2a2224');
      x += w; k++;
    }
    px.rect(g, 0, base, W, H - base, '#0e0e12'); px.rect(g, 0, base, W, 2, '#2a2a30');
    for (let i = 0; i < W; i += 24) px.rect(g, i, base + 22, 12, 1, '#3a3420');
    // the lamp and its pool of light
    const lx = Math.round(W * .76);
    px.rect(g, lx, base - 90, 2, 90, '#2a2a2e'); px.rect(g, lx - 10, base - 92, 14, 2, '#2a2a2e'); px.rect(g, lx - 12, base - 90, 6, 3, '#f0d080');
    const flick = E.hash2(Math.floor(TI.t * 12), 1) > .97 ? .2 : .45;
    px.blend(g, flick, 'add', () => { px.poly(g, [[lx - 10, base - 88], [lx - 34, base + 6], [lx + 18, base + 6], [lx - 4, base - 88]], '#6a5020'); });
    // the wire and the sneakers
    const wx0 = Math.round(W * .1), wx1 = Math.round(W * .62), wy = Math.round(H * .28);
    let prev = [wx0, wy];
    for (let i = 1; i <= 20; i++) { const t = i / 20, xx = lerp(wx0, wx1, t), yy = wy + Math.sin(t * Math.PI) * 14; px.line(g, prev[0], prev[1], xx, yy, '#0a0a0a'); prev = [xx, yy]; }
    const sx = Math.round(lerp(wx0, wx1, .58)), sy = Math.round(wy + Math.sin(.58 * Math.PI) * 14), sw = Math.sin(TI.t * 1.3) * 1.5;
    px.line(g, sx, sy, sx - 2 + sw, sy + 9, '#d8d8d8'); px.line(g, sx + 1, sy, sx + 4 + sw, sy + 7, '#d8d8d8');
    px.rect(g, sx - 6 + sw, sy + 9, 7, 3, '#e8e8e8'); px.rect(g, sx + 2 + sw, sy + 7, 7, 3, '#e8e8e8'); px.rect(g, sx - 6 + sw, sy + 11, 7, 1, '#c82a2a');
    // rain
    for (const d of TI.rain) { const yy = ((d[1] + TI.t * .9 * d[2]) % 1) * H, xx = ((d[0] - TI.t * .05) % 1 + 1) % 1 * W; px.line(g, xx, yy, xx - 1, yy + 4, '#3a4a6a'); }
  });
}

// ---- the attract mode: a scripted loop of every part of the game, any input ends it ------------------------------------
const DEMO = { on: false, i: 0, t: 0, seq: [['street', { mode: 'demo', demo: true }, 26], ['wire', { demo: true }, 16], ['office', { demo: true }, 11], ['street', { mode: 'chasedemo', demo: true }, 12]] };
function demoStart() { DEMO.on = true; DEMO.i = 0; DEMO.t = 0; CASE = freshCase(); const s = DEMO.seq[0]; game.go(s[0], Object.assign({}, s[1]), { fade: 'dissolve' }); }
function demoTick(dt) {
  if (!DEMO.on) return;
  DEMO.t += dt;
  const s = DEMO.seq[DEMO.i];
  if (DEMO.t > s[2]) { DEMO.t = 0; DEMO.i = (DEMO.i + 1) % DEMO.seq.length; const n = DEMO.seq[DEMO.i]; CASE = freshCase(); game.go(n[0], Object.assign({}, n[1]), { fade: 'dissolve' }); }
}
function demoInputBreak() {
  if (!DEMO.on) return false;
  const ptr = I.pointer();
  const moved = ptr && DEMO.ptr && Math.abs(ptr[0] - DEMO.ptr[0]) + Math.abs(ptr[1] - DEMO.ptr[1]) > 6;
  DEMO.ptr = ptr ? ptr.slice() : null;
  if (I.anyPressed() || I.clicked() || moved || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .4)) { DEMO.on = false; I.consumeAll(); game.go('title', {}, { fade: 'dissolve' }); return true; }
  return false;
}
function drawDemoBanner(g, r) {
  const on = Math.floor(game.real * 1.5) % 2;
  E.ui.box(g, r.W / 2 - 90, r.H - 30, 180, 20, { bg: ['#0c0c12', '#14141c'], border: '#d8b860', alpha: .85 });
  E.font.text(g, on ? 'DEMO • PRESS ANY BUTTON' : TITLE + ' • ATTRACT MODE', r.W / 2, r.H - 24, '#f0ece0', { align: 'center', outline: false });
  const seg = DEMO.seq[DEMO.i], name = { street: seg[1].mode === 'chasedemo' ? 'THE CHASE' : 'THE CORNER', wire: 'THE WIRE', office: 'THE BOARD' }[seg[0]];
  E.font.text(g, name || '', 8, 8, '#d8b860', { shadow: '#000', outline: false });
}
function demoSetup() {
  const S = STREET;
  ST.demo = true;
  const route = [S.P(6, 9), { x: S.busstop.x, y: S.busstop.y + 10 }];
  ST.botRoute = route.slice(); ST.botAimT = 0;
  ST.saleWait = .5;
  ST.bot = (p, dt) => {
    const m = p.mover, ctl = { move: [0, 0], sprint: false, crouchP: false, interact: false, act2: false, aim: false, shoot: false, mouse: null, aimMove: null };
    p.film = 36;
    if (ST.botRoute.length) { const t = ST.botRoute[0], dx = t.x - m.x, dy = t.y - m.y, d = Math.hypot(dx, dy); if (d < 5) ST.botRoute.shift(); else ctl.move = [dx / d, dy / d]; return ctl; }
    const s = ST.sale, N = ST.npcs;
    let target = null;
    if (s && s.phase === 'pay' && !s.shot.pay) target = { x: (N.junebug.x + s.fiend.x) / 2, y: (N.junebug.y + s.fiend.y) / 2 };
    else if (s && s.phase === 'grab' && !s.shot.grab) target = N.squeak;
    if (target) {
      ctl.aim = true; ST.botAimT += dt;
      p.rx = lerp(p.rx, target.x, Math.min(1, dt * 6)); p.ry = lerp(p.ry, target.y, Math.min(1, dt * 6));
      if (ST.botAimT > .8) { ctl.shoot = true; ST.botAimT = 0; }
    } else ST.botAimT = 0;
    return ctl;
  };
}
// the chase demo's bot: runs Squeak down with infinite stamina, tackles in reach
function chaseBot(p, dt) {
  const m = p.mover, Q = ST.npcs.squeak, ctl = { move: [0, 0], sprint: true, crouchP: false, interact: false, act2: false, aim: false, shoot: false };
  m.stamina = m.staminaMax; m.sprintSpeed = 150;
  if (!Q || !ST.chase || ST.chase.done) return Object.assign(ctl, { sprint: false });
  const dx = Q.x - m.x, dy = Q.y - m.y, d = Math.hypot(dx, dy);
  ctl.move = [dx / d, dy / d];
  if (d < 18) ctl.act2 = true;
  return ctl;
}

// ---- the chapter card: tape number, title, an epigraph ------------------------------------------------------------------
const CD = { n: 1, t: 0 };
const card = {
  enter(data = {}) { sceneReset(); CD.n = data.chapter || 1; CD.t = 0; CASE.chapter = CD.n; CASE.stage = 0; unlock(CD.n); music(null); game.lights.enabled = false; autosave(); A.sfx('tape'); },
  update(dt) {
    CD.t += dt;
    if ((CD.t > 1.2 && (I.pressed('confirm') || I.pressed('start') || I.pressed('interact') || I.clicked())) || CD.t > 9) startChapter(CD.n);
  },
  draw(r) {
    r.sky(['#000000', '#08080c', '#0c0a0a']);
    const c = CHAPTERS[CD.n], m = Math.round(r.H / 2);
    r.overlay(g => {
      const a = Math.min(1, CD.t * 1.5);
      E.font.text(g, c.tape, r.W / 2, m - 54, a > .5 ? '#d8b860' : '#5a4a2a', { align: 'center', outline: false });
      E.font.title(g, c.name.toUpperCase(), r.W / 2, m - 40, { scale: 3, align: 'center', colors: ['#f0ece0', '#c8c4bc'], outline: '#000' });
      const q = c.quote, n = Math.floor(Math.max(0, CD.t - .8) * 40);
      let yy = m + 10; for (const l of wrapText(q.slice(0, n), Math.min(300, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#e8e4dc', { align: 'center', outline: false }); yy += 11; }
      if (n >= q.length) E.font.text(g, c.by, r.W / 2, yy + 6, '#8a8a9a', { align: 'center', outline: false });
      if (CD.t > 1.2) promptRow(g, [['confirm', 'Continue']], r.W / 2, r.H - 22);
    });
  }
};

// ---- results: a chapter closed, or a shift scored ------------------------------------------------------------------------
const RS = { data: null, t: 0, menu: null };
const results = {
  enter(data = {}) { sceneReset();
    RS.data = data; RS.t = 0; music('office'); game.lights.enabled = false;
    if (data.chapter) { unlock(data.chapter + 1); CASE.chapter = data.chapter + 1; CASE.stage = 0; autosave(); }
    const items = data.shift ? ['ANOTHER SHIFT', 'TITLE'] : data.final ? ['CREDITS', 'TITLE'] : ['NEXT TAPE', 'TITLE'];
    RS.menu = new E.Menu(game, items, { x: 'center', y: 0, onPick: i => {
      if (data.shift) { if (i === 0) { CASE = freshCase(); game.go('street', { mode: 'shift', seconds: 180 }); } else game.go('title'); }
      else if (data.final) game.go(i === 0 ? 'about' : 'title', { fromEnding: true });
      else if (i === 0) game.go('card', { chapter: data.chapter + 1 }); else game.go('title');
    } });
    RS.menu.bg = '#0c0c12'; RS.menu.border = '#4a4a5a'; RS.menu.pick = '#d8b860';
  },
  update(dt) { RS.t += dt; RS.menu.y = Math.round(game.H - 70); if (RS.t > .6) RS.menu.update(dt); },
  draw(r) {
    r.sky(['#0a0a0e', '#12121a', '#1a1414']);
    const d = RS.data;
    r.overlay(g => {
      const head = d.shift ? 'END OF SHIFT' : d.final ? 'CASE FILE' : (CHAPTERS[d.chapter] ? CHAPTERS[d.chapter].tape + ' CLOSED' : '');
      E.font.title(g, head, r.W / 2, 22, { scale: 2, align: 'center', colors: ['#f0ece0', '#d8b860'] });
      const stats = d.shift ? [[String(d.score), 'SCORE'], [String(d.best), 'BEST'], [String(d.photos), 'PHOTOS']]
        : d.final ? [[caseGrade().pct + '%', 'CASE STRENGTH'], [caseGrade().letter, 'GRADE'], [String(CASE.evidence.length), 'EVIDENCE']]
        : d.chapter === 1 ? [[String(CASE.evidence.length), 'EVIDENCE'], [String(CASE.heat) + '/3', 'HEAT'], [String(CASE.photos), 'PHOTOS']]
        : d.chapter === 2 ? [[String(Math.round(CASE.pc)), 'PROBABLE CAUSE'], [CASE.line === 'cell' ? 'CELL' : 'PAYPHONE', 'THE LINE'], ['30', 'DAYS']]
        : d.chapter === 3 ? [[String(CASE.intel.length), 'INTEL LOGGED'], [String(CASE.violations) + '/3', 'VIOLATIONS'], [String(CASE.tagsWasted), 'WASTED TAGS']]
        : [[String(CASE.evidence.length), 'EVIDENCE'], [CASE.squeakCaught ? 'CAUGHT' : 'GOT AWAY', 'SQUEAK'], [hasEv('handoff') ? 'YES' : 'NO', 'THE HANDOFF']];
      const n = stats.length, w = Math.min(110, Math.floor((r.W - 30) / n));
      stats.forEach(([v, l], i) => {
        const x = Math.round(r.W / 2 + (i - (n - 1) / 2) * (w + 8) - w / 2), y = 58;
        E.ui.box(g, x, y, w, 50, { bg: ['#14141c', '#0c0c12'], border: '#3a3a48' });
        E.font.text(g, v, x + w / 2, y + 10, '#f0ece0', { align: 'center', scale: 2, outline: false });
        E.font.text(g, l, x + w / 2, y + 34, '#8a8a9a', { align: 'center', font: 'tiny', outline: false });
      });
      const line = d.shift ? (IN_HUB ? 'Waiting for the other detectives.' : 'Every photo a judge can read is a point. The corner never closes.')
        : d.final ? caseGrade().line : chapterLine(d.chapter);
      let yy = 124; for (const l of wrapText(line, Math.min(320, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#c8c4bc', { align: 'center', outline: false }); yy += 11; }
    });
    RS.menu.draw(r);
  }
};
function chapterLine(n) {
  return { 1: 'Five pictures and an address. On paper, a corner is a pyramid. On the street, it\'s a kid in a blue cap.',
    2: 'Thirty days on the ' + (CASE.line === 'cell' ? 'cell' : 'payphone') + '. Feld says the clock started when the judge put the pen down.',
    3: CASE.violations ? 'The wire held, barely. Talbot\'s clerk called twice about the minimization logs.' : 'Clean logs. Feld bought the room doughnuts. Nobody ate the jelly ones.',
    4: 'Four bricks on a table, a ledger in a bag. Upstairs, somebody is already writing the press release.' }[n] || '';
}
function caseGrade() {
  const ev = CASE.evidence.length, intel = CASE.intel.length;
  let pct = Math.round(clamp(ev * 5.5 + intel * 4 + (CASE.squeakCaught ? 6 : 0) - CASE.violations * 6 - CASE.heat * 4 + (CASE.ending === 'money' ? 8 : 0), 0, 100));
  const letter = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 45 ? 'D' : 'F';
  const line = CASE.ending === 'money' ? 'The case went upstairs, where cases go to die slowly. But it went.' : 'Dope on the table. The pictures ran on page one. The corner opened at nine.';
  return { pct, letter, line };
}

// ---- game over: blown, or the wire pulled ------------------------------------------------------------------------------
const GO = { data: null, menu: null };
const gameover = {
  enter(data = {}) { sceneReset();
    GO.data = data; music(null); A.sfx('die');
    GO.menu = new E.Menu(game, ['TRY AGAIN', 'TITLE'], { x: 'center', y: 0, onPick: i => {
      if (i === 1) { game.go('title'); return; }
      const rt = data.retry || {};
      if (data.why === 'blown') CASE.heat = 0;
      if (data.why === 'wire') { CASE.violations = 0; CASE.intel = CASE.intel.filter(x => /Thursday|1419/.test(x) && false); }
      if (rt.scene === 'street') game.go('street', { mode: rt.mode, stage: rt.stage || 0 }); else if (rt.scene) game.go(rt.scene, {}); else game.go('title');
    } });
    GO.menu.bg = '#0c0c12'; GO.menu.border = '#4a4a5a'; GO.menu.pick = '#d8b860';
  },
  update(dt) { GO.menu.y = Math.round(game.H * .66); GO.menu.update(dt); },
  draw(r) {
    r.sky(['#100404', '#200808', '#0a0404']);
    const d = GO.data, m = Math.round(r.H * .3);
    r.overlay(g => {
      E.font.title(g, d.why === 'wire' ? 'WIRE PULLED' : 'CASE BLOWN', r.W / 2, m - 20, { scale: 3, align: 'center', colors: ['#f0ece0', '#e04a3a'] });
      const txt = d.why === 'wire' ? 'Three violations. Judge Talbot signed the order at 4:52. The line goes dark, and so does the case.' : 'The corner knows your face. Deacon\'s people change their phones, their stash, their corner. Months, gone.';
      let yy = m + 24; for (const l of wrapText(txt, Math.min(300, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#e8e4dc', { align: 'center', outline: false }); yy += 11; }
    });
    GO.menu.draw(r);
  }
};

// ---- the montage: where everybody ended up ----------------------------------------------------------------------------------
const MT = { i: 0, t: 0, slides: [] };
const montage = {
  enter() { sceneReset();
    music('ending'); MT.i = 0; MT.t = 0; game.lights.enabled = false;
    const tb = CASE.ending === 'table', S = [];
    S.push(['MABRY', tb ? 'Friday, 9 a.m. Four bricks, a stack of cash, a flag. The Deputy Commissioner called it "a major blow to the drug trade in West Baltimore."' : 'The wire stayed up twenty-six days. Then a new phone, a new code, and the line went quiet. But the ledger had already talked.']);
    S.push(['TAY', tb ? 'Tay Rucker made bail by noon. Brennan\'s office called the whole thing "a misunderstanding about a gym bag."' : 'The "D" column led to a car lot, a funeral home and a councilman\'s campaign fund. Tay was indicted in the spring. He didn\'t talk. Nobody expected him to.']);
    S.push(['SQUEAK', CASE.squeakCaught ? 'Squeak did eleven months juvenile. He came home taller. He wasn\'t anybody\'s runner anymore. He was somebody\'s hopper.' : 'Squeak was back on Monroe in nine days. Somebody had to sit the house.']);
    S.push(['PIGEON', CASE.pigeonTrust ? 'Pigeon sold socks on Fulton all winter. He still waves at the unmarked car. He shouldn\'t.' : 'Pigeon stopped taking Kowal\'s calls. In March somebody found his cart in the Courts, empty. Nobody filed a report.']);
    S.push(['JUNEBUG', 'Junebug made it to his mother\'s table that Sunday. The cake said HAPPY BIRTHDAY MAMA in blue. By April he had Moe\'s spot.']);
    S.push(['HASKINS', tb ? 'Deputy Ops Haskins made colonel. The stats on the west side looked very good that quarter.' : 'Haskins kept his word: thirty days, not sixty. He took credit for both.']);
    S.push(['KOWAL', tb ? 'Kowal got a commendation and a transfer to Southeast. The basement went back to storing evidence boxes.' : 'Kowal kept the board. In a closet, behind the evidence boxes. Somebody always keeps the board.']);
    S.push([null, 'The corner at Monroe and Calhoun opened at nine the next morning. Same as always.']);
    MT.slides = S;
  },
  update(dt) {
    MT.t += dt;
    const s = MT.slides[MT.i], full = s && MT.t * 40 >= s[1].length;
    if ((MT.t > .5 && (I.pressed('confirm') || I.pressed('interact') || I.clicked())) || MT.t > (s ? s[1].length / 40 + 4.5 : 1)) {
      if (!full && MT.t <= s[1].length / 40) { MT.t = s[1].length / 40; return; }
      MT.i++; MT.t = 0; A.sfx('tape');
      if (MT.i >= MT.slides.length) game.go('results', { final: true });
    }
    const sp = MT.slides[MT.i];
    if (sp && sp[0] && CAST[sp[0]]) CAST[sp[0]].rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
  },
  draw(r) {
    r.sky(['#050505', '#0c0c10', '#100c0c']);
    const s = MT.slides[MT.i]; if (!s) return;
    r.overlay(g => {
      const m = Math.round(r.H / 2);
      if (s[0] && CAST[s[0]]) { const sz = 64; px.rect(g, r.W / 2 - sz / 2 - 3, m - 86, sz + 6, sz + 6, '#e8e4dc'); CAST[s[0]].rig.drawPortrait(g, r.W / 2 - sz / 2, m - 83, sz, { zoom: 3.2, bg: '#2a2a30', tint: '#909090' }); }
      const n = Math.floor(MT.t * 40);
      let yy = s[0] ? m - 6 : m - 20;
      for (const l of wrapText(s[1].slice(0, n), Math.min(300, r.W - 40))) { E.font.text(g, l, r.W / 2, yy, '#e8e4dc', { align: 'center', outline: false }); yy += 11; }
      for (let i = 0; i < MT.slides.length; i++) px.rect(g, r.W / 2 - MT.slides.length * 4 + i * 8, r.H - 14, 5, 2, i === MT.i ? '#d8b860' : '#3a3a48');
    });
  }
};

// ---- About & Credits: the Source Information and the feedback, in big type, page by page -----------------------------------------
const AB = { i: 0, scroll: 0 };
const about = {
  enter(data = {}) { sceneReset(); AB.i = 0; AB.scroll = 0; AB.from = data.fromEnding; music('title'); game.lights.enabled = false; },
  update(dt) {
    const n = CREDITS.length;
    if (I.repeat('right') || I.pressed('interact')) { AB.i = (AB.i + 1) % n; AB.scroll = 0; A.sfx('select'); }
    if (I.repeat('left')) { AB.i = (AB.i + n - 1) % n; AB.scroll = 0; A.sfx('select'); }
    if (I.down('down')) AB.scroll += dt * 60; if (I.down('up')) AB.scroll = Math.max(0, AB.scroll - dt * 60);
    const c = I.clicked(); if (c) { if (c[0] < game.W / 3) AB.i = (AB.i + n - 1) % n; else AB.i = (AB.i + 1) % n; AB.scroll = 0; }
    if (I.pressed('cancel') || I.pressed('start')) game.go('title');
  },
  draw(r) {
    r.sky(['#08080c', '#101018', '#14101a']);
    const pg = CREDITS[AB.i];
    r.overlay(g => {
      const ca = game.cornerArea ? game.cornerArea() : null, w = Math.min(400, r.W - 20), x = Math.round(r.W / 2 - w / 2), y = ca && ca.x0 < x + w ? Math.round(ca.y1 + 4) : 10, h = r.H - 34 - y;
      panel(g, x, y, w, h, pg.title + '   ' + (AB.i + 1) + ' / ' + CREDITS.length);
      let yy = y + 24 - Math.round(AB.scroll), maxScroll = 0;
      for (const [k, v] of pg.rows) {
        if (k) { if (yy > y + 18 && yy < y + h - 8) E.font.text(g, k, x + 10, yy, '#d8b860', { outline: false }); yy += 10; }
        for (const l of wrapText(v, w - 24)) { if (yy > y + 18 && yy < y + h - 8) E.font.text(g, l, x + 14, yy, '#e8e4dc', { outline: false }); yy += 10; }
        yy += 4;
      }
      maxScroll = Math.max(0, yy + AB.scroll - (y + h - 10));
      if (AB.scroll > maxScroll) AB.scroll = maxScroll;
      if (maxScroll > 0) E.font.text(g, '↓ more', x + w - 10, y + h - 10, '#6a6a7a', { align: 'right', font: 'tiny', outline: false });
      promptRow(g, [['#← →', 'Page'], ['#↑↓', 'Scroll'], ['cancel', 'Back']], r.W / 2, r.H - 22);
    });
  }
};

// ---- the AI Hub: ghost mode. Each copy plays its own shift from the same seed; the others' detectives show as ghosts ------------
const HB = { info: null, ended: false, resulted: false, lastProg: 0 };
function hubSetup() {
  if (!IN_HUB) return;
  HUB.on('message', (data, from) => { if (data && data.k === 'g') ST.ghosts[from] = Object.assign({ t: game.real }, data); });
  HUB.on('leave', e => { if (e) delete ST.ghosts[e.id]; });
  HUB.on('time-up', () => { if (ST.mode === 'shift') { ST.shiftLeft = 0; shiftEnd(); } hubResult(); });
  HUB.on('end', () => { HB.ended = true; ST.ended = true; try { A.music(null); A.mute(true); } catch (e) {} try { game.stop(); } catch (e) {} });
  HUB.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    HB.info = info;
    if (!info) { game.go('title'); return; }
    const secs = Math.max(30, Math.min(180, ((info.limitMs || 200000) / 1000) - 12));
    CASE = freshCase();
    game.go('street', { mode: 'shift', seconds: secs }, { fade: 0 });
    HUB.ready();
  }).catch(() => game.go('title'));
}
function hubProgressTick() {
  if (!IN_HUB || !HB.info || HB.ended) return;
  if (game.real - HB.lastProg > 1) { HB.lastProg = game.real; try { HUB.progress({ score: ST.score, label: ST.score + ' pts • ' + CASE.photos + ' photos' }); } catch (e) {} }
}
function hubResult() {
  if (!IN_HUB || HB.resulted || HB.ended) return;
  HB.resulted = true;
  try { HUB.result({ score: ST.score, stats: { Photos: CASE.photos, Burns: CASE.burns }, awards: ST.score >= 500 ? [{ title: 'Natural Police', detail: '500 points in one shift' }] : [] }); } catch (e) {}
}
function hubGhostTick(dt) {
  if (!IN_HUB || !HB.info || HB.ended || ST.mode !== 'shift') return;
  ST.sentAt += dt;
  if (ST.sentAt > .125) {
    ST.sentAt = 0;
    const p = P1(), m = p.mover;
    try { HUB.send({ k: 'g', x: Math.round(m.x), y: Math.round(m.y), f: Math.round(m.facing * 100) / 100, a: p.aim ? 1 : 0, c: p.inCar ? 1 : 0, s: ST.score }, { reliable: false }); } catch (e) {}
  }
}
const GHOST_RIGS = {};
function drawGhosts(r) {
  if (!IN_HUB || !HB.info) return;
  for (const id in ST.ghosts) {
    const gh = ST.ghosts[id]; if (game.real - gh.t > 3 || gh.c) continue;
    const pl = (HB.info.players || []).find(p => String(p.id) === String(id)), col = pl ? pl.color : '#8a8a9a';
    const rig = GHOST_RIGS[id] || (GHOST_RIGS[id] = new E.Humanoid({ size: 1.3, weapon: null, build: 'heroic', outfit: 'coat', hair: 'short', colors: { coat: col, cloth: '#d8d8d8', pants: '#2a2a32' } }));
    const vx = gh.px !== undefined ? (gh.x - gh.px) * 8 : 0, vy = gh.py !== undefined ? (gh.y - gh.py) * 8 : 0;
    gh.px = gh.x; gh.py = gh.y;
    rig.update(1 / 60, { x: gh.x, y: gh.y, z: 0, vx, vy, facing: gh.f || 0, point: !!gh.a });
    r.actor(gh.x, gh.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { ghost: undefined, alpha: .55 });
    r.textAt(gh.x, gh.y, 50, (pl ? pl.name : 'P' + id) + ' • ' + (gh.s || 0), col);
  }
}
// the hub's waiting scene: the round has not started yet
const hubwait = {
  update() {},
  draw(r) { drawTitleBackdrop(r); r.overlay(g => { E.font.title(g, TITLE, r.W / 2, r.H * .3, { scale: 4, align: 'center', colors: ['#f0ece0', '#d8b860'] }); E.font.text(g, 'Connecting to the hub...', r.W / 2, r.H * .3 + 44, '#a8a49c', { align: 'center', outline: false }); }); }
};

// ---- 06-credits.js ----
// ============================================================================================================
// REWIRED • 06 credits: the About / Credits pages (Source Information and the three feedback sections).
// The same text is in the chat reply and in exit-interview.json.
// ============================================================================================================
const CREDITS = [
  { title: 'ABOUT REWIRED', rows: [
    ['', 'REWIRED is an original spiritual successor to The Wire (HBO, 2002-2008). Every character, street address, line of dialog, song and code in it is new. The corner, the paper, the wire and the brass are the show\'s territory; the people are our own.'],
    ['How it plays', 'Surveillance and stealth on a West Baltimore block, in five tapes: a cold open, the corner (blend in, photograph hand-to-hands, tail a runner), the case board (pin evidence to names until a judge signs), the wire room (minimize, spot-check, tag pertinent lines, decode mirrored pages), the re-up (stakeout, raid, foot chase, a search in the dark) and the stat (the brass decide what the case was for).'],
    ['Also', 'A Surveillance Shift for one or two players on one screen, an AI Hub ghost round for up to four, an attract mode after ten seconds on the title, three views (three-quarter, isometric, top-down), controller-first menus with PlayStation or Xbox symbols, and stick inversion toggles in Settings.'] ] },
  { title: 'SOURCE INFORMATION', rows: [
    ['Date', '2026-11-02 18:13'],
    ['Source', 'The Wire (HBO, 2002-2008), created by David Simon. Kept as gritty and real as the show.'],
    ['Genre and Perspective', 'Surveillance / stealth investigation with a case-board puzzle, a wiretap listening game and a foot chase. Main perspective: the engine\'s three-quarter view (pitch 55); the player can switch to isometric or top-down at any time.'],
    ['Tech', 'my-3D2dge v0.85.1 (full engine edition, one file, no dependencies) for rendering, input, audio, scenes, lighting, weather and the standard menus; AI Hub Session Protocol v1 client 1.3.0 (session.js) for online rounds; plain JavaScript, bundled into one HTML file by a small Node script.'],
    ['Art Direction', 'The engine\'s native look: 320x240 base pixels expanded to any screen, HD Humanoid rigs, TileMap rowhouses with per-pixel painted faces (brick, formstone, boarded vacants with graffiti, a corner store marquee), objects as data (cars, dumpster, couch, payphone, desks, reel decks), canvas lighting with street lamps, rain at night.'],
    ['Animation', 'The engine\'s procedural Humanoid rigs driven by velocity and poses (walk, sprint, crouch, kneel, cast, hips, wave, down), the Mover for the player (sprint, sneak, vault), tweened transitions; no frame lists.'],
    ['Audio', 'Code-written music on the engine\'s chip synth (a slow blues title, a boom-bap corner loop, a night loop, a tense wire-room loop, a chase, an office theme and an ending). Code-written sound effects (shutter, whistle, pager, ram, siren, cuffs). Gibberish Simlish-style voices: every speaker has a pitch and timbre, blipped syllable by syllable as their text types, on the street and on the wire.'],
    ['Online', 'AI Hub Session Protocol v1 in ghost mode: each player runs their own seeded surveillance shift; the other detectives\' positions are sent about eight times a second and drawn as ghosts with their names and scores; progress and a score result go to the hub. No other network use. Local 1-2 player drop-in on one machine outside the hub.'],
    ['Testing', 'Headless Node tests of every system through the engine\'s fixed-step clock and game.debug; Playwright runs in Chromium, Firefox and WebKit; viewport-matrix screenshots on phones, tablets and desktops; the AI Hub harness (players=2 and players=4 with latency, jitter, loss and host-leave); a scripted full playthrough of all five tapes.'],
    ['Research', 'None beyond the engine and hub documentation; the show\'s details come from memory.'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort medium'],
    ['Usage', 'unknown'] ] },
  { title: 'TESTING FEEDBACK', rows: [
    ['How many issues did testing catch?', '28 issues, found by the headless playthrough and system tests, the browser screenshots in Chromium, Firefox and WebKit, and the viewport matrix. The AI Hub harness passed on its first run.'],
    ['How many were critical / game breaking?', '5: a boot step that crashed the start, a runner whose stash spot was inside a wall (the corner stalled forever), a dialog carried into the next scene that froze it, the shift mode triggering story events, and a sale timer from the tail that left later sessions with no sales at all.'],
    ['Most helpful test', 'The scripted headless playthrough of all five tapes: it drives the real scenes through game.advance and game.debug and found every soft-lock in the story chain.'],
    ['Least helpful test', 'The viewport matrix: 24 of 24 clean on its first run, since the engine\'s expand mode already fits every screen; it only caught a toast overlapping the objective on narrow screens.'] ] },
  { title: 'ENGINE FEEDBACK', rows: [
    ['What I liked most', 'Everything a game needs but nobody wants to write is already there: the pause menu, rebinding, glyphs per device, settings that save, fixed-step determinism, and a headless mode where the same game runs in Node.'],
    ['Did I get stuck or guess wrong?', 'A few guesses: whether an intent object to Mover.update is in ground or screen directions (ground), what a face painter returns for the base colour (null), that objects as data are written facing south (my cars came out sideways first), and that TileMap.bounds needs a view object, not a name.'],
    ['Most important thing I built myself', 'The surveillance layer: a camera viewfinder in world space that works with mouse, stick and keys, the sale cycle the photos read, and the lookouts\' suspicion with blending.'],
    ['Hardest part', 'Reading a 1.2 MB engine through its index without being able to see its pixels quickly; the per-pixel wall painter has a large signature to learn.'],
    ['Remove or overhaul one thing', 'The single-letter-heavy option bags on draw calls: a typed options object per call would catch typos the engine now ignores.'],
    ['Change one thing', 'Ship PlayStation / Xbox button glyphs as font glyphs so prompts drawn with E.font show ✕ ○ □ △ without custom drawing.'] ] },
  { title: 'PROMPT FEEDBACK', rows: [
    ['What I liked most', 'It is specific about the player\'s experience (10-foot UI, glyphs following the last device, attract mode, the touch-only notice) and leaves genre and design open.'],
    ['What was confusing', '"Follow the hub for multiplayer integration as well as for the game on its own" can be read as hub-only or as hub plus local multiplayer; I did both.'],
    ['Hardest thing', 'Fitting the show\'s slow, procedural texture (paper, waiting, minimization) into mechanics that are still fun to play in a short demo.'],
    ['One test I wish I could run', 'A real DualSense on a real TV at ten feet, to judge text size and glyph readability with human eyes.'] ] },
  { title: 'CREDITS', rows: [
    ['Design, code, writing, music', 'Claude (Anthropic, claude-opus-5-5) in Claude Code'],
    ['Engine', 'my-3D2dge by Michael Crosato, v0.85.1'],
    ['Online', 'AI Hub Session Protocol v1 by Michael Crosato'],
    ['Inspired by', 'The Wire, created by David Simon for HBO. This is an homage; no characters, dialog or music from the show are used.'],
    ['Thanks', 'To every corner, every desk and every basement that ever kept a board.'] ] }
];

// ---- 07-start.js ----
// ============================================================================================================
// REWIRED • 07 start: the scenes, the boot, the test handle.
// ============================================================================================================
street.pausable = !IN_HUB;
if (IN_HUB) { office.pausable = false; wire.pausable = false; stash.pausable = false; }

// the chase demo drives its detective with the chase bot
const _streetSetup = streetSetup;
streetSetup = function (mode, data) { _streetSetup(mode, data); if (mode === 'chasedemo') { ST.demo = true; ST.bot = chaseBot; } };

// in a hub round, nobody moves before the hub's clock reaches zero
const _streetUpdate = street.update;
street.update = function (dt) {
  if (IN_HUB && ST.mode === 'shift' && !(HUB.time() >= 0)) { const p = P1(); game.focus(p.mover.x, p.mover.y, 14); for (const q of ST.players) q.rig.update(dt, q.mover.rigState({})); return; }
  if (HB.ended) return;
  _streetUpdate.call(this, dt);
};
const _drawStreetHud = drawStreetHud;
drawStreetHud = function (r) {
  _drawStreetHud(r);
  if (IN_HUB && ST.mode === 'shift') {
    const t = HUB.time();
    if (!(t >= 0)) r.overlay(g => { const s = isFinite(t) ? String(Math.ceil(-t / 1000)) : 'GET READY'; E.font.title(g, s, r.W / 2, r.H / 2 - 30, { scale: 4, align: 'center', colors: ['#ffffff', '#d8b860'] }); E.font.text(g, 'Photograph every hand-to-hand. Don\'t get burned.', r.W / 2, r.H / 2 + 12, '#e8e4dc', { align: 'center', shadow: '#000', outline: false }); });
  }
};

const SCENES = { title, card, street, office, wire, stash, results, gameover, montage, about, hubwait };
// deep links for testing: #street/corner, #wire, #office, #stash, #ending, #shift, #demo, #about
function deepLink() {
  if (!HAS_DOM || !location.hash) return null;
  const h = location.hash.slice(1).split('/');
  const map = { corner: ['street', { mode: 'corner' }, 1], reup: ['street', { mode: 'reup' }, 4], coldopen: ['street', { mode: 'coldopen' }, 0], shift: ['street', { mode: 'shift', seconds: 180 }, 0],
    office: ['office', {}, 2], wire: ['wire', {}, 3], stash: ['stash', {}, 4], ending: ['office', { mode: 'ending' }, 5], about: ['about', {}, 0], demo: ['street', { mode: 'demo', demo: true }, 0], chase: ['street', { mode: 'chasedemo', demo: true }, 0], montage: ['montage', {}, 5] };
  const k = h[0] === 'street' ? h[1] : h[0];
  const d = map[k]; if (!d) return null;
  const st = h[0] === 'street' ? h[2] : h[1]; if (st) d[1].stage = +st;
  return d;
}

game.debug = {
  snapshot: () => ({ scene: game.sceneName, mode: ST.mode, stage: ST.stage, chapter: CASE.chapter, evidence: CASE.evidence.slice(), intel: CASE.intel.slice(), heat: CASE.heat, violations: CASE.violations, pc: CASE.pc,
    player: ST.players[0] ? [Math.round(ST.players[0].mover.x), Math.round(ST.players[0].mover.y)] : null, sale: ST.sale ? ST.sale.phase : null, score: ST.score, wire: WR.state, board: BOARD.open, demo: DEMO.on, talk: talk.open,
    sus: ST.npcs.kevo ? Math.round(Math.max(ST.npcs.kevo.sus, ST.npcs.dre.sus) * 100) / 100 : 0, touchOnly: DEV.touchOnly }),
  teleport(x, y) { const p = ST.players[0]; if (p) { p.mover.x = x; p.mover.y = y; p.mover.vx = p.mover.vy = 0; } },
  ST, CASE: () => CASE, setCase: c => { CASE = c; }, fresh: () => { CASE = freshCase(); }, WR, BOARD, OF, SH, DEMO, TI, STREET, EVIDENCE, CALLS, seedCaseFor, startChapter, talk, chaseBot, P1, takePhoto, inFrame, hubResult, HB, INV, DEV
};

const dl = deepLink();
if (dl) { CASE = freshCase(); seedCaseFor(Math.max(1, dl[2])); if (dl[2] === 0) CASE.chapter = 0; }
game.start({ scenes: SCENES, scene: IN_HUB ? 'hubwait' : dl ? dl[0] : 'title', data: dl ? dl[1] : undefined,
  boot: { title: TITLE, steps: [['Wiring the block', () => { STREET.map.find && STREET.map.cell(0, 0); }], ['Pulling the tapes', () => { hubSetup(); }]] } });
if (dl && game.sceneName !== dl[0]) game.go(dl[0], dl[1], { fade: 0 });

})();
