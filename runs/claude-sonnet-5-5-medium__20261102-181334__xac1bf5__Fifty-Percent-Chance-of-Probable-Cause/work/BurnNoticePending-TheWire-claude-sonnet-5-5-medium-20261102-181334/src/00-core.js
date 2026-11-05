/* FIFTY PERCENT CHANCE OF PROBABLE CAUSE: a wiretap-detective game after The Wire. Core: input, settings, audio, voices, shared state. */
const E = My3D2dge, { px, clamp, lerp, TAU } = E;
const T = 16;
const TITLE = 'FIFTY PERCENT CHANCE OF PROBABLE CAUSE';

/* ---- the gamepad's "intermittently inverted" axes: toggles in Settings flip the sticks before the engine reads them ---- */
const OPT = { invertPadX: false, invertPadY: false };
(() => {
  const real = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : null;
  if (!real) return;
  navigator.getGamepads = () => {
    const pads = real();
    if (!pads || (!OPT.invertPadX && !OPT.invertPadY)) return pads;
    return Array.from(pads).map(p => !p ? p : ({
      index: p.index, id: p.id, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons,
      vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators,
      axes: Array.from(p.axes).map((a, i) => (i % 2 === 0 ? OPT.invertPadX : OPT.invertPadY) ? -a : a)
    }));
  };
})();

const PRESET = Object.assign({}, E.Input.THIRDPERSON, {
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad10'], jump: ['Space'], crouch: ['KeyC', 'ControlLeft', 'Pad1'],
  interact: ['KeyE', 'KeyF', 'Pad0'], attack: ['KeyJ', 'Mouse0', 'Pad2'], shout: ['KeyQ', 'Pad4', 'Pad5'],
  camera: ['Mouse2', 'KeyR', 'Pad6'], map: ['Tab', 'KeyM', 'Pad3'], view: ['KeyV', 'Pad11'], dodge: [], block: [], use: []
});
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: PRESET, bg: '#06050a', id: 'fifty-percent-chance-of-probable-cause',
  menu: {
    settings: [
      { key: 'invertPadX', label: 'Invert gamepad horizontal', value: false },
      { key: 'invertPadY', label: 'Invert gamepad vertical', value: false },
      { key: 'difficulty', label: 'Difficulty', options: ['Rookie', 'Detective', 'Burned out'], value: 'Detective' }
    ],
    controls: { interact: 'Interact / talk', attack: 'Shove', shout: 'POLICE! (shout)', camera: 'Raise camera', crouch: 'Crouch', sprint: 'Hustle', map: 'Notebook', view: 'Change camera view', jump: 'Vault', dodge: false, block: false, use: false },
    quit: 'title'
  }
});
const P = game.particles, L = game.lights, A = game.audio, I = game.input;
const scenes = {};
const syncOpts = () => { OPT.invertPadX = !!game.settings.invertPadX; OPT.invertPadY = !!game.settings.invertPadY; };
// PlayStation glyphs by default; Settings > Button symbols switches to Xbox (A B X Y)
if (!E.store.get('bnp:glyphs-init', 0)) { game.settings.set('glyphs', 'playstation'); E.store.set('bnp:glyphs-init', 1); }
syncOpts();
const key = a => I.label(a);
const prompt = (a, word) => key(a) + ' ' + word;
const usingPad = () => I.lastDevice === 'gamepad';
const touchOnly = (() => {
  let kb = false, pad = false;
  addEventListener('keydown', () => { kb = true; }, { capture: true });
  return () => {
    const mm = q => window.matchMedia && matchMedia(q).matches;
    try { pad = Array.from(navigator.getGamepads() || []).some(Boolean); } catch (e) { pad = false; }
    return mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && !kb && !pad;
  };
})();

/* ---- the run's state ---- */
const BLANK = () => ({ step: 0, photos: [], tip: 0, tipKind: '', tapped: false, logged: [], board: null, juke: false, money: 120, integrity: 3, burn: 0,
  arrests: 0, seized: 0, escaped: 0, overtime: 0, shoves: 0, score: 0, ended: false, ending: '', time: 0, sweep: 0, memo: 0 });
let S = BLANK();
let DEMO = false;          // the attract mode drives the game and cheats freely
let HUB = { active: false, info: null, started: true };
const scoreNow = () => S.photos.length * 30 + S.logged.filter(e => e.good).length * 45 + (S.tip ? 20 * S.tip : 0) + S.arrests * 110 + S.seized * 45 +
  (S.board ? S.board.strength * 60 : 0) + S.integrity * 40 + (S.tapped ? 40 : 0) - S.burn * 55 - S.overtime * 30 + S.sweep * 18;

/* ---- music: written in code, one song per mood ---- */
const SONGS = {
  title: { bpm: 74, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'A2 . . . E3 . . . | A2 . . . G2 . . . | F2 . . . C3 . . . | E2 . . . B2 . . .' },
    { name: 'pad', wave: 'pulse12', vol: .06, notes: 'A4 - - - - - - - | C5 - - - - - - - | A4 - - - - - - - | B4 - - - - - - -' },
    { name: 'lead', wave: 'sine', vol: .12, notes: '. . . . E5 - . . | D5 - C5 - . . . . | . . . . A4 - . . | B4 - . . . . . .' },
    { name: 'hat', wave: 'drums', vol: .05, notes: 'h . . . h . . . h . . . h . h .' }] },
  street: { bpm: 90, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'D2 . . D2 . . F2 . | D2 . . D2 . A2 . . | C2 . . C2 . . E2 . | G2 . . G2 . D2 . .' },
    { name: 'tick', wave: 'drums', vol: .07, notes: 'h . h . h . h h | h . h . h . h .' },
    { name: 'kick', wave: 'drums', vol: .1, notes: 'k . . . . . s . | k . . k . . s .' },
    { name: 'lead', wave: 'pulse12', vol: .05, notes: 'A4 - . . F4 . . . | G4 - . . E4 - . . | . . . . A4 - . . | F4 - - - . . . .' }] },
  wire: { bpm: 66, steps: 4, tracks: [
    { name: 'hum', wave: 'sine', vol: .12, notes: 'E2 - - - - - - - | E2 - - - - - - - | G2 - - - - - - - | D2 - - - - - - -' },
    { name: 'tick', wave: 'drums', vol: .05, notes: 'h . . . . . . . | h . . . . . h .' },
    { name: 'blip', wave: 'square', vol: .03, notes: '. . . . . . B5 . | . . . . . . . . | . . E6 . . . . . | . . . . . . . .' }] },
  raid: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .12, notes: 'E2 E2 . E2 E2 . E2 . | E2 E2 . E2 G2 . A2 . | C2 C2 . C2 C2 . C2 . | D2 D2 . D2 E2 . G2 .' },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . h k s . h . | k k h . s . h s' },
    { name: 'alarm', wave: 'pulse', vol: .05, notes: 'E4 . . . B4 . . . | E4 . . . C5 . . . | C4 . . . G4 . . . | D4 . . . A4 . . .' }] },
  board: { bpm: 60, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'G2 . . . . . D3 . | G2 . . . . . F3 . | Eb2 . . . . . Bb2 . | D2 . . . . . A2 . .' },
    { name: 'tick', wave: 'drums', vol: .05, notes: 'h . . . h . . . | h . . . h . . .' }] },
  ending: { bpm: 70, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .25, notes: 'D2 . . . A2 . . . | Bb1 . . . F2 . . . | G1 . . . D2 . . . | A1 . . . E2 . . .' },
    { name: 'lead', wave: 'sine', vol: .14, notes: 'F4 - - - E4 - D4 - | D4 - - - C4 - . . | Bb3 - - - D4 - . . | E4 - - - . . . .' }] }
};
const music = (n, o) => { try { A.music(n ? SONGS[n] : null, o); } catch (e) { game.fail('music', e); } };
const sfx = (n, o) => A.sfx(n, o);
A.define('shutter', [{ wave: 'noise', freq: 4000, dur: .03, vol: .3 }, { wave: 'square', freq: 220, to: 90, dur: .08, vol: .2 }]);
A.define('whistle', [{ wave: 'sine', freq: 1900, to: 2400, dur: .18, vol: .22 }, { wave: 'sine', freq: 2400, to: 1700, dur: .22, vol: .2 }]);
A.define('gunshot', [{ wave: 'noise', freq: 900, dur: .18, vol: .5 }, { wave: 'square', freq: 160, to: 40, dur: .2, vol: .35 }]);
A.define('stamp', [{ wave: 'noise', freq: 600, dur: .05, vol: .35 }, { wave: 'triangle', freq: 90, to: 50, dur: .12, vol: .4 }]);
A.define('cuff', [{ wave: 'square', freq: 1500, dur: .02, vol: .2 }, { wave: 'square', freq: 1900, dur: .02, vol: .2 }]);
A.define('ring', [{ wave: 'square', freq: 1400, dur: .08, vol: .1 }, { wave: 'square', freq: 1000, dur: .08, vol: .1 }]);

/* ---- voices: Animalese-style gibberish. Each letter typed in a dialog box blips a note picked from the letter and the speaker ---- */
const VOICES = {
  dray:   { name: 'LT. DRAY', pitch: 90,  wave: 'triangle', color: '#ffd36a' },
  pike:   { name: 'DET. PIKE', pitch: 150, wave: 'pulse12', color: '#8fd8ff' },
  tolly:  { name: 'TOLLY', pitch: 120, wave: 'square', color: '#a8e890' },
  deacon: { name: 'DEACON', pitch: 70, wave: 'triangle', color: '#d8b090' },
  boyce:  { name: 'BOYCE', pitch: 80, wave: 'sine', color: '#ff9a8a' },
  fats:   { name: 'FATS', pitch: 110, wave: 'pulse', color: '#ffc080' },
  lonnie: { name: 'LONNIE', pitch: 60, wave: 'saw', color: '#ff7a6a' },
  tick:   { name: 'TICK', pitch: 200, wave: 'square', color: '#e8e070' },
  judge:  { name: 'JUDGE HARLOW', pitch: 100, wave: 'sine', color: '#c8b0ff' },
  desk:   { name: 'DESK SGT.', pitch: 130, wave: 'pulse12', color: '#c0c0c0' }
};
const babbleVoice = (who, ch) => {
  const v = VOICES[who] || VOICES.pike, c = (ch || 'a').toLowerCase().charCodeAt(0);
  if (!/[a-z]/.test(String.fromCharCode(c))) return { wave: 'sine', freq: 40, dur: .001, vol: 0 };
  const f = v.pitch * Math.pow(2, ((c * 7) % 12) / 12) * (1 + ((c % 5) - 2) * .02);
  return { wave: v.wave, freq: f, to: f * (c % 2 ? 1.12 : .9), dur: .055, vol: .13 };
};
const talk = new E.Dialog(game, { speed: 42, lines: 3, bg: '#12121a', border: '#c9b88a', nameColor: '#ffd36a' });
let talkWho = 'pike';
Object.defineProperty(talk, 'voice', { get() {
  if (!game.settings) return null;
  const i = Math.max(0, Math.floor(talk.shown) - 1), flat = (talk.pages[talk.i] || []).join(''), ch = flat[i] || 'a';
  return babbleVoice(talkWho, ch);
}, set() {} });
const RIGS = {};
const rigOf = (id, o) => RIGS[id] || (RIGS[id] = new E.Humanoid(o));
const portraitOf = who => RIGS['p_' + who] || (RIGS['p_' + who] = new E.Humanoid(PORTRAITS[who] || PORTRAITS.pike));
const PORTRAITS = {
  pike: { size: 1.3, build: 'heroic', outfit: 'coat', hair: 'ponytail', sleeves: 'long', weapon: null, colors: { skin: '#a8714f', hair: '#2a1a14', coat: '#5a5a66', cloth: '#7a6a5a', pants: '#2a2a36' } },
  dray: { size: 1.3, build: 'bulky', outfit: 'shirt', hair: 'bald', sleeves: 'long', weapon: null, colors: { skin: '#7a4e36', cloth: '#d8d8d0', pants: '#2a2a36' } },
  tolly: { size: 1.3, outfit: 'coat', hair: 'short', hat: 'cap', sleeves: 'long', weapon: null, colors: { skin: '#e0b090', hair: '#8a5a2a', coat: '#6a5a3a', cloth: '#5a6a7a' } },
  deacon: { size: 1.3, outfit: 'coat', hair: 'bald', sleeves: 'long', weapon: null, colors: { skin: '#5a3a2a', coat: '#4a4a3a', cloth: '#8a7a5a', pants: '#3a3a3a' } },
  boyce: { size: 1.3, build: 'heroic', outfit: 'coat', hair: 'short', sleeves: 'long', weapon: null, colors: { skin: '#6a4430', hair: '#111', coat: '#1a1a1e', cloth: '#d0c8b8', pants: '#1a1a1e' } },
  fats: { size: 1.3, build: 'bulky', outfit: 'shirt', hair: 'short', weapon: null, colors: { skin: '#c89070', cloth: '#a03030', pants: '#2a3a5a' } },
  lonnie: { size: 1.3, build: 'bulky', outfit: 'shirt', hair: 'bald', hat: 'band', sleeves: 'none', weapon: null, colors: { skin: '#4a2e22', cloth: '#2a2a2a', pants: '#3a3a4a' } },
  tick: { size: 1.2, outfit: 'shirt', hair: 'spiky', hat: 'cap', sleeves: 'long', weapon: null, colors: { skin: '#8a5a3a', cloth: '#d8d040', pants: '#2a2a3a' } },
  judge: { size: 1.3, outfit: 'robe', hair: 'long', sleeves: 'long', weapon: null, colors: { skin: '#e0b898', hair: '#d0d0d0', cloth: '#1a1a22' } },
  desk: { size: 1.3, outfit: 'shirt', hair: 'short', hat: 'cap', sleeves: 'short', weapon: null, colors: { skin: '#d0a080', cloth: '#3a4a6a', pants: '#222a3a' } }
};
// say(who, lines, opts): one speaker, a few pages, with a live portrait, then onDone
const say = (who, lines, o = {}) => {
  talkWho = who; const v = VOICES[who] || VOICES.pike;
  talk.nameColor = v.color;
  talk.say(lines, Object.assign({ name: v.name, portrait: portraitOf(who) }, DEMO && !o.choices ? { auto: 1.8 } : {}, o));
};
// a conversation: [[who, text-or-pages], ...] then onDone
const convo = (list, onDone) => {
  let i = 0;
  const next = () => { if (i >= list.length) { if (onDone) onDone(); return; } const [who, txt] = list[i++]; say(who, txt, { onDone: next }); };
  next();
};

/* ---- shared UI helpers (screen pixels, 10-foot sized) ---- */
const FONT = { shadow: '#000', outline: false };
// the bitmap font has no PlayStation face-button symbols, so ✕ ○ □ △ are drawn with pixels, in their familiar colours
const SYMRE = /[\u2715\u25cb\u25a1\u25b3]/;
const drawSym = (g, ch, x, y) => {
  if (ch === '\u2715') { const c = '#7fb2ff'; px.line(g, x, y, x + 6, y + 6, '#000', 3); px.line(g, x + 6, y, x, y + 6, '#000', 3); px.line(g, x, y, x + 6, y + 6, c, 1); px.line(g, x + 6, y, x, y + 6, c, 1); }
  else if (ch === '\u25cb') { const c = '#ff7a7a'; for (let a = 0; a < 24; a++) { const t = a / 24 * TAU; px.rect(g, Math.round(x + 3 + Math.cos(t) * 3), Math.round(y + 3 + Math.sin(t) * 3), 1, 1, c); } }
  else if (ch === '\u25a1') { const c = '#f0a8e8'; px.rect(g, x, y, 7, 1, c); px.rect(g, x, y + 6, 7, 1, c); px.rect(g, x, y, 1, 7, c); px.rect(g, x + 6, y, 1, 7, c); }
  else { const c = '#7fe8a8'; px.line(g, x + 3, y, x, y + 6, c, 1); px.line(g, x + 3, y, x + 6, y + 6, c, 1); px.line(g, x, y + 6, x + 6, y + 6, c, 1); }
};
const SYMW = 9;
const txt = (g, s, x, y, c = '#fff', o = {}) => {
  o = Object.assign({ shadow: '#000' }, o); s = String(s);
  if (!SYMRE.test(s)) return E.font.text(g, s, Math.round(x), Math.round(y), c, o);
  const parts = s.split(/([\u2715\u25cb\u25a1\u25b3])/).filter(p => p !== ''), wOf = p => SYMRE.test(p) ? SYMW : E.font.width(p) + 1;
  const total = parts.reduce((a, p) => a + wOf(p), 0); let xx = Math.round(x) - (o.align === 'center' ? Math.floor(total / 2) : o.align === 'right' ? total : 0);
  const o2 = Object.assign({}, o); delete o2.align;
  for (const p of parts) { if (SYMRE.test(p)) drawSym(g, p, xx, Math.round(y)); else E.font.text(g, p, xx, Math.round(y), c, o2); xx += wOf(p); }
};
const panel = (g, x, y, w, h, o) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#15151e', '#0c0c12'], border: '#c9b88a', alpha: .92 }, o));
const COL = { gold: '#ffd36a', paper: '#e8e0c8', red: '#ff5a4a', green: '#8fe08f', blue: '#8fd8ff', dim: '#8a8aa0', amber: '#ffb040' };
const toasts = [];
const toast = (title, text, c) => { toasts.push({ title, text, c: c || COL.gold, t: 4.2 }); if (toasts.length > 4) toasts.shift(); };
const updateToasts = dt => { for (const t of toasts) t.t -= dt; while (toasts.length && toasts[0].t <= 0) toasts.shift(); };
const drawToasts = (g, W) => {
  let y = 28;
  for (const t of toasts) {
    const a = clamp(Math.min(t.t, 4.2 - t.t) * 4, 0, 1), w = Math.max(E.font.width(t.title), E.font.width(t.text || '')) + 14;
    px.blend(g, a, 'normal', () => { panel(g, W - w - 6, y, w, t.text ? 26 : 16); txt(g, t.title, W - w + 1, y + 4, t.c); if (t.text) txt(g, t.text, W - w + 1, y + 14, '#ddd'); });
    y += t.text ? 30 : 20;
  }
};
// a glyph-prompt chip: "[✕] Interact"
const chip = (g, x, y, a, word, c = '#fff') => {
  const k = key(a), w = E.font.width(k) + 8;
  panel(g, x, y - 2, w, 13, { border: '#fff', bg: ['#2a2a3a', '#14141c'] }); txt(g, k, x + 4, y + 1, COL.gold);
  txt(g, word, x + w + 4, y + 1, c); return w + 8 + E.font.width(word);
};
// ground-direction of the left stick / keys, as a world vector
const moveDir = () => { const m = I.move(); const d = game.view.screenDirToGround(m[0], m[1]); return [d[0], d[1], Math.hypot(m[0], m[1])]; };
const mkMover = (x, y, o) => new E.Mover(Object.assign({ x, y, z: 0, r: 5, run: 78, walk: 32, climbMax: 12, hopMax: 12 }, o));
const hashf = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967295; };
const mkMap = (rows, w) => rows.map(r => r.padEnd(w, '#').slice(0, w));
const diff = () => ({ Rookie: .7, Detective: 1, 'Burned out': 1.4 })[game.settings.difficulty] || 1;
