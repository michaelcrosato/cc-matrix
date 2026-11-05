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
