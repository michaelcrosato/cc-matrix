/* THE BARITONES — core: the game object, controls, settings, sound, helpers.
 * A spiritual successor to The Sopranos (1999-2007): a North Jersey crime boss with panic attacks, a family, a crew,
 * and a therapist. Built on my-3D2dge v0.85.1 (threequarter view; topdown and iso on V / R3). */
const E = My3D2dge, { px, clamp, lerp } = E;
const TAU = Math.PI * 2;
let HUB = typeof AIHub !== 'undefined' && AIHub.active;
const T = 16;

/* ---- CONTROLS: the keys PC players expect for a top-down brawler-shooter; a DualSense in its standard mapping ---- */
const D = E.Input.DEFAULT;
const KEYS = {
  up: D.up, down: D.down, left: D.left, right: D.right,
  attack: ['KeyJ', 'Mouse0', 'Pad2'],            // punch combo (□ / X)
  kick: ['KeyK', 'Pad3'],                        // kick (△ / Y)
  interact: ['KeyE', 'KeyF', 'Pad0'],            // talk, use, get in the car (✕ / A)
  dodge: ['Space', 'Pad1'],                      // roll; handbrake in the car (○ / B)
  block: ['KeyL', 'KeyC', 'Pad4', 'Pad6'],       // guard; brake in the car (L1, L2)
  fire: ['KeyQ', 'Mouse2', 'Pad7'],              // the pistol; gas in the car (R2)
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad5', 'Pad10'],   // R1 or L3
  view: ['KeyV', 'Pad11'],                       // camera view (R3)
  start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel
};
const ACTION_NAMES = { attack: 'Punch', kick: 'Kick', interact: 'Talk / Use', dodge: 'Roll', block: 'Block', fire: 'Shoot', sprint: 'Sprint', view: 'Camera view' };

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: KEYS, bg: '#07060a',
  menu: {
    saves: HUB ? false : true,
    controls: ACTION_NAMES,
    quit: HUB ? false : 'title',
    settings: [
      { key: 'glyphs', group: 'Controller', label: 'Button symbols', options: [['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']], value: 'playstation', help: 'Which buttons the prompts show for a controller', apply: (g, v) => { for (const p of (g && g.players) || []) p.glyphs = v === 'xbox' ? 'xbox' : 'playstation'; } },
      { key: 'invertX', group: 'Controller', label: 'Invert horizontal axes', type: 'toggle', value: false, help: 'Flip the sticks left to right (a controller that reports them backwards)' },
      { key: 'invertY', group: 'Controller', label: 'Invert vertical axes', type: 'toggle', value: false, help: 'Flip the sticks up and down (a controller that reports them backwards)' },
      { key: 'difficulty', group: 'Game', label: 'Difficulty', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], value: 'normal', help: 'How hard the Falsettis hit' },
      { key: 'autoaim', group: 'Game', label: 'Aim assist', type: 'toggle', value: true, help: 'The pistol leans toward the nearest enemy' },
      { key: 'hints', group: 'Game', label: 'Tutorial hints', type: 'toggle', value: true, help: 'Show button tips the first time something comes up' }
    ]
  }
});
const P = game.particles, L = game.lights, A = game.audio, I = game.input;
game.fadeTime = .3;

/* ---- the glyph family and the inverted-axes fix, applied to every player's input ---- */
function applyGlyphs() { for (const p of game.players) p.glyphs = game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation'; }
applyGlyphs();
// Some pads report their axes flipped. Settings → Controller → Invert horizontal / vertical: the engine reads the pad
// through navigator.getGamepads, so the flip happens there, for play, menus and the right stick alike.
if (typeof navigator !== 'undefined' && navigator.getGamepads) {
  const real = navigator.getGamepads.bind(navigator);
  const wrap = p => {
    const fx = game.settings.invertX, fy = game.settings.invertY;
    if (!p || (!fx && !fy)) return p;
    const axes = Array.from(p.axes, (v, i) => (i % 2 === 0 ? (fx ? -v : v) : (fy ? -v : v)));
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try { navigator.getGamepads = () => Array.from(real() || [], wrap); } catch (e) { /* a locked-down browser: the toggles do nothing there */ }
}

/* ---- touch-only devices: no touch controls; the title says a controller or keyboard is needed ---- */
const TOUCH_ONLY = typeof matchMedia === 'function' && typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || typeof window !== 'undefined' && 'ontouchstart' in window)
  && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
let touchLocked = TOUCH_ONLY;
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { touchLocked = false; });
  addEventListener('gamepadconnected', () => { touchLocked = false; });
}
I.touchEnabled = false;
// prompts follow the device used last: the engine counts a mouse button as the mouse; moving it over the game counts too
{ let lastMouseT; const tick = I.tick.bind(I);
  I.tick = function (dt) { const r = tick(dt); const m = I.mouse; if (m && m.active && m.t !== lastMouseT) { if (lastMouseT !== undefined && I.lastDevice !== 'touch') I.lastDevice = 'mouse'; lastMouseT = m.t; } return r; }; }

/* ---- helpers ---- */
// the pixel font has no middle dot or left triangle: every string drawn in it goes through here
const fixGlyphs = s => String(s).replace(/·/g, '•').replace(/◂/g, '←').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, '-');
{ const ft = E.font.text, fw = E.font.width, fwr = E.font.wrap, ftt = E.font.title;
  E.font.text = function (g, s, ...a) { return ft.call(this, g, fixGlyphs(s), ...a); };
  E.font.width = function (s, ...a) { return fw.call(this, fixGlyphs(s), ...a); };
  E.font.wrap = function (s, ...a) { return fwr.call(this, fixGlyphs(s), ...a); };
  E.font.title = function (g, s, ...a) { return ftt.call(this, g, fixGlyphs(s), ...a); }; }
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const label = (a, p = I) => p.label(a);
const txt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, { shadow: '#07040c', outline: false, ...o });
const settingsDiff = () => ({ easy: .6, normal: 1, hard: 1.45 })[game.settings.difficulty || 'normal'];
const now = () => game.time;

/* ---- SOUND: chip voices for the street, and code-written songs ---- */
A.define('gun', [{ wave: 'noise', freq: 900, to: 120, dur: .16, vol: .45 }, { wave: 'square', freq: 180, to: 50, dur: .1, vol: .25 }]);
A.define('click', { wave: 'square', freq: 1400, to: 1200, dur: .03, vol: .15 });
A.define('quack', [{ wave: 'saw', freq: 520, to: 380, dur: .09, vol: .18, vib: [30, .05] }, { wave: 'saw', freq: 480, to: 340, dur: .07, vol: .12 }]);
A.define('cash', { wave: 'square', freq: 'E6', dur: .06, vol: .2, arp: [0, 7, 12], step: .05 });
A.define('engine', { wave: 'saw', freq: 55, to: 60, dur: .09, vol: .07 });
A.define('horn', [{ wave: 'square', freq: 392, dur: .3, vol: .2 }, { wave: 'square', freq: 494, dur: .3, vol: .15 }]);
A.define('heart', [{ wave: 'sine', freq: 70, to: 40, dur: .1, vol: .5 }]);
A.define('breath', { wave: 'noise', freq: 400, to: 900, dur: .5, vol: .12 });
A.define('bell', [{ wave: 'triangle', freq: 'E6', dur: .5, vol: .25 }, { wave: 'triangle', freq: 'C6', dur: .6, vol: .2 }]);
A.define('crash', [{ wave: 'noise', freq: 600, to: 80, dur: .35, vol: .45 }, { wave: 'square', freq: 90, to: 40, dur: .25, vol: .2 }]);

// The voices: gibberish syllables, pitched per speaker (a baritone is low; the Falsettis sing high)
const VOICES = {};
function babble(ch, who) {
  const v = VOICES[who] || { base: 180, wave: 'pulse' };
  const c = ch.toLowerCase().charCodeAt(0);
  const vowel = 'aeiouy'.includes(ch.toLowerCase());
  const f = v.base * (vowel ? 1.25 : .9) * (1 + ((c * 37) % 11) / 40);
  A.sfx({ wave: v.wave, freq: f, to: f * (vowel ? .88 : 1.08), dur: vowel ? .075 : .045, vol: .16, vib: vowel ? [12, .04] : undefined });
}

const SONGS = {
  // a lounge-noir walking line under a muted trumpet: the title
  title: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .32, notes: 'D3 . A2 . F3 . A2 . | D3 . A2 . G3 . A2 . | C3 . G2 . E3 . G2 . | A2 . E3 . C#3 . E3 . | Bb2 . F3 . D3 . F3 . | G2 . D3 . Bb2 . D3 . | A2 . E3 . A2 . G3 . | A2 . C#3 . E3 . A3 .' },
    { wave: 'pulse12', vol: .12, notes: 'F5 - - E5 D5 - A4 - | - - - - . . . . | E5 - - D5 C5 - G4 - | - - - - . . A4 C#5 | D5 - - F5 E5 - D5 - | Bb4 - - - . . . . | A4 - C#5 - E5 - G5 - | F5 - E5 - D5 - - - ' },
    { wave: 'drums', vol: .18, notes: 'k . h . s . h h | k . h . s . h . | k . h . s . h h | k . h k s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h h | k k h . s . s s' } ] },
  // the town by day: a jaunty mandolin over a bass that walks
  town: { bpm: 112, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'G2 . D3 . B2 . D3 . | C3 . G3 . E3 . G3 . | A2 . E3 . C3 . E3 . | D3 . A3 . F#3 . A3 . | G2 . D3 . B2 . D3 . | E3 . B3 . G3 . B3 . | C3 . G3 . D3 . A3 . | G2 . D3 . G3 . . .' },
    { wave: 'pulse', vol: .09, notes: 'B4 B4 D5 . G5 . F#5 . | E5 E5 G5 . C6 . B5 . | A5 . G5 . E5 . C5 . | D5 . F#5 . A5 . . . | B4 B4 D5 . G5 . A5 . | B5 . G5 . E5 . B4 . | C5 . E5 . D5 . F#5 . | G5 - - - . . . .' },
    { wave: 'drums', vol: .14, notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s h s . | k . h . s . h . | k . h . s . h h | k . h . s . h . | k k h . s . . .' } ] },
  // the town at night: slow, minor, a vibraphone
  night: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'E2 . . . B2 . . . | C3 . . . G2 . . . | A2 . . . E2 . . . | B2 . . . F#2 . B2 . ' },
    { wave: 'sine', vol: .16, notes: 'G4 . B4 . E5 . . . | G4 . C5 . E5 . . . | A4 . C5 . E5 . . . | F#4 . B4 . D#5 . . . ' },
    { wave: 'drums', vol: .1, notes: 'k . . . h . . . | s . . . h . . h | k . . . h . . . | s . . . h . h . ' } ] },
  // a brawl: driving eighths, stabs
  fight: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .16, notes: 'E2 E2 E3 E2 G2 E2 A2 E2 | E2 E2 E3 E2 Bb2 A2 G2 E2 | D2 D2 D3 D2 F2 D2 G2 D2 | E2 E2 E3 E2 B2 A2 G2 F#2' },
    { wave: 'square', vol: .1, notes: 'E5 . . E5 . . G5 . | E5 . . E5 . Bb5 A5 . | D5 . . D5 . . F5 . | E5 . . B5 . A5 G5 F#5' },
    { wave: 'drums', vol: .22, notes: 'k . h k s . h . | k . h k s . h h | k . h k s . h . | k k h k s s s s' } ] },
  // the boss: the tenor's aria, menacing
  boss: { bpm: 132, steps: 4, tracks: [
    { wave: 'saw', vol: .16, notes: 'A1 A1 A2 A1 C2 A1 D2 Eb2 | A1 A1 A2 A1 G2 F2 E2 Eb2 | F1 F1 F2 F1 A1 F1 C2 D2 | E1 E1 E2 E1 G#1 B1 D2 E2' },
    { wave: 'pulse', vol: .11, notes: 'A5 - - G5 F5 - E5 - | C6 - - B5 A5 - G#5 - | F5 - - E5 D5 - C5 - | E5 - - - G#5 - B5 - ' },
    { wave: 'drums', vol: .24, notes: 'k . s . k k s . | k . s . k k s s | k . s . k k s . | k s k s k s s s' } ] },
  // the snowy pine barrens: lost, cold, a little funny
  barrens: { bpm: 72, steps: 4, tracks: [
    { wave: 'triangle', vol: .28, notes: 'D3 . . . . . . . | C3 . . . . . . . | Bb2 . . . . . . . | A2 . . . . . C#3 . ' },
    { wave: 'sine', vol: .14, notes: 'A5 . F5 . D5 . . . | G5 . E5 . C5 . . . | F5 . D5 . Bb4 . . . | E5 . C#5 . A4 . . . ' },
    { wave: 'drums', vol: .06, notes: 'h . . . . . h . | . . h . . . . . | h . . . . . h . | . . h . . . . h' } ] },
  // the therapist's office: soft, patient
  office: { bpm: 70, steps: 4, tracks: [
    { wave: 'sine', vol: .2, notes: 'F3 . C4 . A3 . C4 . | E3 . C4 . G3 . C4 . | D3 . A3 . F3 . A3 . | Bb2 . F3 . D3 . G3 . ' },
    { wave: 'triangle', vol: .12, notes: 'A4 - - - G4 - - - | G4 - - - E4 - - - | F4 - - - D4 - - - | D4 - - - C4 - - - ' } ] },
  // the diner jukebox: an original power-ballad, piano and a big drum fill
  jukebox: { bpm: 120, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'E3 . E3 . E3 . E3 . | B2 . B2 . B2 . B2 . | C#3 . C#3 . C#3 . C#3 . | A2 . A2 . A2 . A2 . ' },
    { wave: 'pulse', vol: .12, notes: 'E4 G#4 B4 E5 B4 G#4 E4 G#4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4 | C#4 E4 G#4 C#5 G#4 E4 C#4 E4 | A3 C#4 E4 A4 E4 C#4 A3 B3' },
    { wave: 'square', vol: .1, notes: 'B5 - - - G#5 - E5 - | F#5 - - - D#5 - B4 - | G#5 - - - E5 - C#5 - | A5 - G#5 - F#5 - E5 - ' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k . s . s s s s' } ] },
  // the victory sting
  win: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .16, notes: 'C5 E5 G5 C6 - - . . | Bb4 D5 F5 Bb5 - - . . | C5 - E5 - G5 - C6 - | - - - - . . . .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . . . G2 . . . | Bb2 . . . F2 . . . | C3 . G2 . C3 . . . | . . . . . . . .' } ] }
};
let curSong = null;
function music(name) { if (name === curSong) return; curSong = name; A.music(name ? SONGS[name] : null, { fade: .6 }); }
