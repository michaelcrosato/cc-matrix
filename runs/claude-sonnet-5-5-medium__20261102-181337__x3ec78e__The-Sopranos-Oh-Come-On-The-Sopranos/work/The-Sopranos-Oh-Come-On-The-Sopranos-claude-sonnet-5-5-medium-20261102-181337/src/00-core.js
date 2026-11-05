/* ====================================================================================================================
 * THE SOPRANOS OH, COME ON  -  a spiritual successor to The Sopranos (1999-2007)
 * A beat-'em-up with sit-downs: collect the envelopes, keep a lid on the stress, see the therapist, don't feed the ducks
 * to the wrong people.  Built on my-3D2dge (the engine's 'brawler' view, with 3/4, top-down and iso views on V).
 * 00-core: the game, its keys, settings, gamepad fixes, sound, voices, profile, helpers
 * ==================================================================================================================== */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const TITLE = 'The Sopranos Oh, Come On', SOURCE = 'The Sopranos (1999-2007)', BUILD = '2026-11-02 18:13';

/* ---- INPUT: one game, three families of devices. Pad: PS5 layout (standard mapping): 0 Cross, 1 Circle, 2 Square, 3 Triangle,
 *      4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3 ---- */
const INPUT = Object.assign({}, E.Input.DEFAULT);
delete INPUT.dash; delete INPUT.skill;
Object.assign(INPUT, {
  attack: ['KeyJ', 'Mouse0', 'Pad2'],              // Square / J / left click: the punch string
  kick: ['KeyK', 'Mouse2', 'Pad1'],                // Circle / K / right click: kicks
  jump: ['Space', 'KeyZ', 'Pad0'],                 // Cross / Space
  special: ['KeyL', 'Pad5', 'Pad7'],               // R1 or R2 / L: Fuhgeddaboudit (rage)
  interact: ['KeyE', 'KeyF', 'Pad3'],              // Triangle / E: talk, collect, feed the ducks
  view: ['KeyV', 'Pad11']                          // R3 / V: change the camera view
});

/* ---- GAMEPAD FIX: some pads report an inverted horizontal / vertical stick now and then. Settings has a toggle for each; it is
 *      applied to the pad itself, so menus, walking and everything else follow ---- */
let game = null;
const flipAxes = p => {
  const s = game && game.settings; if (!p || !s || (!s.invertH && !s.invertV)) return p;
  const axes = Array.from(p.axes || []); for (const i of [0, 2]) if (s.invertH && axes[i] !== undefined) axes[i] = -axes[i]; for (const i of [1, 3]) if (s.invertV && axes[i] !== undefined) axes[i] = -axes[i];
  return { index: p.index, id: p.id, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes, vibrationActuator: p.vibrationActuator };
};
if (typeof navigator !== 'undefined' && navigator.getGamepads) {
  const raw = navigator.getGamepads.bind(navigator);
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => Array.from(raw() || []).map(flipAxes) }); } catch (e) { /* locked down */ }
}

/* ---- THE GAME ---- */
game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'brawler', bg: '#07060d', input: INPUT,
  menu: {
    quit: 'title', saves: { version: 1 },
    controls: { attack: 'Punch', kick: 'Kick', jump: 'Jump', special: 'Fuhgeddaboudit (rage)', interact: 'Talk / collect / feed', view: 'Camera view' },
    settings: [
      { key: 'invertH', label: 'Invert gamepad horizontal', value: false },
      { key: 'invertV', label: 'Invert gamepad vertical', value: false },
      { key: 'xbox', label: 'Xbox glyphs (A B X Y)', value: false },
      { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' }
    ]
  } });
const P = game.particles, L = game.lights, A = game.audio;
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const T = 16;

/* ---- ACTIVITY: attract mode starts after 10 s of nothing on the title; any input ends it ---- */
const act = { at: 0, ptr: null };
const touchAct = () => { act.at = game.real; };
if (typeof addEventListener === 'function') for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, touchAct, { passive: true });
if (typeof addEventListener === 'function') addEventListener('pointermove', e => { const p = e.clientX + ',' + e.clientY; if (act.ptr !== null && p !== act.ptr) act.at = game.real; act.ptr = p; }, { passive: true });
/** has the player done anything this step (a key, a button, a stick, the mouse)? */
let demoAt = 0;                       // when the attract mode began: any real key, click or touch since then ends it, even one that lands during a hit-stop
const demoInput = () => act.at > demoAt + .02;
const userActive = () => { const I = game.input; if (I.anyPressed()) return true; const m = I.move(); return Math.hypot(m[0], m[1]) > .4; };

/* ---- common per-step work: glyph family, the touch-only check ---- */
const touchOnly = () => { try { return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean)); } catch (e) { return false; } };
function common() {
  const I = game.input, s = game.settings;
  I.glyphs = s.xbox ? 'xbox' : 'playstation';        // PlayStation glyphs unless Settings says Xbox
  I.touchEnabled = false;                              // no touch controls: the game wants a controller or a keyboard
  if (userActive()) act.at = game.real;
}
const prompt = (a, word) => game.input.label(a) + ' ' + word;

/* ---- THE PROFILE: what carries from one chapter to the next, and into a save ---- */
const blank = () => ({ step: 0, cash: 0, respect: 0, calm: 0, kills: 0, envelopes: 0, ducks: 0, up: { hp: 0, dmg: 0, calm: 0, bat: 0, duck: 0 }, flags: {}, time: 0, best: 0 });
let S = blank();
const FLOW = ['intro', 'street', 'kitchen', 'therapy', 'yard', 'ending'];
const DIFF = { Easy: { foeHp: .7, foeDmg: .6 }, Normal: { foeHp: 1, foeDmg: 1 }, Hard: { foeHp: 1.35, foeDmg: 1.3 } };
const diff = () => DIFF[game.settings.difficulty] || DIFF.Normal;
const heroMax = () => 60 + S.up.hp * 12;
const dmgMul = () => 1 + S.up.dmg * .2 + S.calm * .02;
const stressMul = () => Math.max(.4, 1 - S.up.calm * .15 - S.calm * .03);
const score = () => S.cash * 10 + S.kills * 100 + S.respect * 50;
const UPGRADES = [
  { id: 'hp', name: 'GYM MEMBERSHIP', text: 'More health. You will go twice. Maybe.', base: 300, max: 3 },
  { id: 'dmg', name: 'NEW KNUCKLES', text: 'Your hands hit harder. Brass has a way.', base: 400, max: 3 },
  { id: 'calm', name: 'BREATHING TAPES', text: 'Stress builds slower. Dr. M swears by them.', base: 350, max: 3 },
  { id: 'bat', name: 'BAT LESSONS', text: 'A bat lasts longer. Respect for the craft.', base: 250, max: 3 },
  { id: 'duck', name: 'DUCK FEEDER', text: 'The ducks calm you more. Do not ask why.', base: 200, max: 3 }
];
const upCost = u => u.base + S.up[u.id] * 250;

/* ---- SOUND: code-written music, effects and the gibberish voices ---- */
const rep = (s, n) => Array(n).fill(s).join(' ');
const SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, notes: 'A2 . . A2 . . E3 . A2 . . A2 . G2 . . | F2 . . F2 . . C3 . F2 . . F2 . E2 . . | D2 . . D2 . . A2 . D2 . . D2 . F2 . . | E2 . . E2 . . B2 . E2 . . G#2 . B2 . .' },
    { wave: 'pulse12', vol: .1, notes: 'A4 - - . C5 - E5 - D5 - C5 - B4 - . . | C5 - - . A4 - F4 - G4 - A4 - C5 - . . | D5 - - . F5 - A4 - D5 - C5 - A4 - . . | B4 - G#4 - E4 - . . B4 - - - . . . .' },
    { wave: 'sine', vol: .08, notes: 'A3 - - - - - - - E3 - - - - - - - | F3 - - - - - - - C3 - - - - - - - | D3 - - - - - - - A3 - - - - - - - | E3 - - - - - - - G#3 - - - - - - -' },
    { wave: 'drums', vol: .22, notes: 'k . . h . . s h k . h . s . h .' }] },
  home: { bpm: 70, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'C4 - E4 - G4 - E4 - | A3 - C4 - E4 - C4 - | F3 - A3 - C4 - A3 - | G3 - B3 - D4 - B3 -' },
    { wave: 'triangle', vol: .2, notes: 'C2 - - - - - - - | A1 - - - - - - - | F1 - - - - - - - | G1 - - - - - - -' }] },
  street: { bpm: 106, steps: 4, tracks: [
    { wave: 'triangle', vol: .25, notes: 'E2 . E2 E3 . E2 . G2 | A2 . A2 A3 . A2 . G2 | E2 . E2 E3 . E2 . B2 | D3 . D3 . B2 . G2 .' },
    { wave: 'pulse', vol: .08, notes: '. . B3 . . . B3 . | . . C4 . . . C4 . | . . B3 . . . B3 . | . . A3 . . . G3 .' },
    { wave: 'pulse12', vol: .07, notes: 'E4 - . G4 - . B4 - | A4 - . C5 - . E5 - | G4 - . B4 - . D5 - | B4 - A4 - G4 - . .' },
    { wave: 'drums', vol: .25, notes: 'k . h . s . h k | . . h . s . h h' }] },
  yard: { bpm: 124, steps: 4, tracks: [
    { wave: 'saw', vol: .13, notes: 'D2 . D2 . D2 . F2 . | D2 . D2 . C2 . A1 . | Bb1 . Bb1 . Bb1 . D2 . | A1 . A1 . C2 . E2 .' },
    { wave: 'pulse12', vol: .07, notes: 'D4 . . F4 . . A4 . | G4 . . F4 . . D4 . | Bb3 . . D4 . . F4 . | E4 . . C#4 . . A3 .' },
    { wave: 'noise', vol: .04, notes: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . h' },
    { wave: 'drums', vol: .28, notes: 'k . h h s . h . | k k h . s . h h' }] },
  boss: { bpm: 142, steps: 4, tracks: [
    { wave: 'saw', vol: .14, notes: 'A1 A1 . A1 A1 . C2 . | A1 A1 . A1 A1 . E2 . | F1 F1 . F1 F1 . A1 . | G1 G1 . G1 G1 . B1 .' },
    { wave: 'pulse', vol: .09, notes: 'A4 . C5 . E5 . C5 . | A4 . C5 . E5 . G5 . | F4 . A4 . C5 . A4 . | G4 . B4 . D5 . B4 .' },
    { wave: 'drums', vol: .3, notes: 'k . k h s . h k | k . k h s h s s' }] },
  therapy: { bpm: 60, steps: 4, tracks: [
    { wave: 'sine', vol: .12, notes: 'E4 - - B3 - - G4 - | F#4 - - D4 - - B3 - | C4 - - G3 - - E4 - | D4 - - B3 - - F#3 -' },
    { wave: 'triangle', vol: .12, notes: 'E2 - - - - - - - | D2 - - - - - - - | C2 - - - - - - - | B1 - - - - - - -' }] },
  sting: { bpm: 100, steps: 4, tracks: [{ wave: 'pulse12', vol: .14, notes: 'A4 C5 E5 - A5 - - - | . . . . . . . .' }, { wave: 'triangle', vol: .2, notes: 'A2 - - - A2 - - - | . . . . . . . .' }] }
};
for (const k of ['title', 'home', 'street', 'yard', 'boss', 'therapy']) SONGS[k].tracks.forEach(t => { t.notes = t.notes.replace(/\|/g, ''); });
const music = (name, o) => { try { A.music(name ? SONGS[name] : null, o); } catch (e) { game.fail('music', e); } };
const sfx = (n, o) => { try { A.sfx(n, o); } catch (e) { game.fail('sfx', e); } };
// the voices: "Animalese" gibberish. Each speaker has a pitch range and a wave; every blip of the dialog box is a random syllable
const VOICES = { vic: { wave: 'square', lo: 90, hi: 150 }, connie: { wave: 'triangle', lo: 260, hi: 360 }, doc: { wave: 'sine', lo: 200, hi: 280 }, sal: { wave: 'pulse', lo: 130, hi: 210 },
  chris: { wave: 'saw', lo: 150, hi: 230 }, dino: { wave: 'square', lo: 70, hi: 100 }, johnny: { wave: 'saw', lo: 80, hi: 120 }, shop: { wave: 'pulse12', lo: 120, hi: 190 }, duck: { wave: 'saw', lo: 520, hi: 700 }, narr: { wave: 'sine', lo: 110, hi: 150 } };
let voice = VOICES.narr;
const setVoice = id => { voice = VOICES[id] || VOICES.narr; };
const blip = () => { const f = voice.lo * Math.pow(voice.hi / voice.lo, rnd()); return { wave: voice.wave, freq: f, to: f * (rnd() < .5 ? .9 : 1.12), dur: .055, vol: .11 }; };

/* ---- small shared helpers ---- */
const TXT = { outline: false, shadow: '#08060e' }, TXC = Object.assign({ align: 'center' }, TXT), TXR = Object.assign({ align: 'right' }, TXT);
const WIN = { bg: ['#3a2a5c', '#0e0a1c'], border: '#a89ad8' }, WINR = { bg: ['#4a1e3a', '#12060e'], border: '#d08aa8' };
const scenes = {};
const store = { get: (k, d) => E.store.get('soprano:' + k, d), set: (k, v) => E.store.set('soprano:' + k, v) };
const money = n => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const ordinalGrade = p => p >= .9 ? 'A' : p >= .75 ? 'B' : p >= .55 ? 'C' : p >= .35 ? 'D' : 'F';
