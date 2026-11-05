/* BREWING BAD — a spiritual successor to Breaking Bad (2008-2013), built on my-3D2dge.
 * Boot: hub session, input layout, settings, game object, sound and gibberish voices. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const TITLE = 'BREWING BAD';
const HUB = window.AIHub || { active: false };
const IN_SESSION = !!HUB.active;

/* ---- the controller's axes can arrive flipped on some pads: Settings can flip them back, for every screen ---- */
const FLIP = { h: false, v: false };
(function patchPads() {
  if (!navigator.getGamepads) return;
  const real = navigator.getGamepads.bind(navigator);
  navigator.getGamepads = () => {
    const list = real();
    if (!FLIP.h && !FLIP.v) return list;
    return Array.from(list).map(p => {
      if (!p) return p;
      const axes = Array.from(p.axes).map((v, i) => (i % 2 === 0 ? FLIP.h : FLIP.v) ? -v : v);
      return new Proxy(p, { get(t, k) { if (k === 'axes') return axes; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
    });
  };
})();

/* ---- keys: WASD + mouse for the PC; the pad's own layout. Prompts follow the device used last ---- */
const KEYMAP = Object.assign({}, E.Input.DEFAULT, {
  interact: ['KeyE', 'Pad0'], attack: ['Mouse0', 'KeyJ', 'Pad2'], throw: ['Mouse2', 'KeyK', 'Pad7', 'Pad3'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad4', 'Pad10'], view: ['KeyV', 'Pad11'], zoomIn: ['Equal'], zoomOut: ['Minus']
});
delete KEYMAP.dash; delete KEYMAP.skill; delete KEYMAP.jump; delete KEYMAP.zoomIn; delete KEYMAP.zoomOut;
KEYMAP.confirm = KEYMAP.confirm.concat(['KeyE']);

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: KEYMAP,
  id: 'brewing-bad',
  menu: {
    controls: { attack: 'Wrench', throw: 'Throw flask', interact: 'Use / talk', sprint: 'Sprint', view: 'Camera view' },
    saves: false, quit: IN_SESSION ? false : 'title',
    settings: [
      { key: 'invertH', label: 'Controller: invert left-right', group: 'Game', type: 'toggle', value: false, help: 'If a stick reads backwards sideways', apply: (g, v) => { FLIP.h = !!v; } },
      { key: 'invertV', label: 'Controller: invert up-down', group: 'Game', type: 'toggle', value: false, help: 'If a stick reads backwards up and down', apply: (g, v) => { FLIP.v = !!v; } },
      { key: 'xboxGlyphs', label: 'Controller: Xbox symbols (A B X Y)', group: 'Game', type: 'toggle', value: false, help: 'Off: PlayStation symbols. On: A B X Y', apply: (g, v) => { g.input.glyphs = v ? 'xbox' : 'playstation'; } },
      { key: 'difficulty', label: 'Difficulty', group: 'Game', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], value: 'normal' },
      { key: 'aimAssist', label: 'Aim assist', group: 'Game', type: 'toggle', value: true, help: 'Swings and throws lean toward the nearest threat' }
    ]
  }
});
const ui = new E.Shell(game, { theme: { accent: '#8fd14f', paper: '#0f1a12', ink: '#e8f1dc', danger: '#e0553a', muted: '#8aa088' } });
const P = game.particles, L = game.lights, A = game.audio;
const dev = () => game.input.lastDevice;
const lab = a => game.input.label(a);
const pad = () => dev() === 'gamepad';
game.input.touchEnabled = false;          // touch-only devices get a notice instead of touch controls

/* ---- music: all code. A Morricone twang for the title, a cold ostinato in the lab, drums when the heat is on ---- */
const SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . . E2 . . G2 . | A2 . . A2 . . B2 . | E2 . . E2 . . G2 . | D2 . . D2 . . B1 . ' },
    { name: 'twang', wave: 'pulse12', vol: .09, notes: 'E4 - - . G4 - A4 - | B4 - - - . . E5 - | D5 - B4 - A4 - G4 - | E4 - - - . . . . ' },
    { name: 'tick', wave: 'drums', vol: .08, notes: 'k . . . s . . h | k . h . s . . . ' }] },
  town: { bpm: 100, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'A2 . . A2 . . A2 . | A2 . . A2 . C3 . . | F2 . . F2 . . F2 . | E2 . . E2 . . G2 . ' },
    { name: 'hat', wave: 'drums', vol: .05, notes: 'h . . h . . h . h . . h . . h . ' },
    { name: 'lead', wave: 'pulse12', vol: .06, notes: 'E5 - . . . . D5 . | C5 - . . B4 . A4 . | . . . . F5 - E5 . | D5 - . . E5 - . . ' },
    { name: 'chase', wave: 'drums', vol: .14, on: false, notes: 'k . h k s . h . k k h . s . h s' },
    { name: 'alarm', wave: 'saw', vol: .05, on: false, notes: 'A3 A3 A4 A3 E4 A3 G4 A3 | F3 F3 F4 F3 C4 F3 E4 F3 ' }] },
  cook: { bpm: 112, steps: 4, tracks: [
    { name: 'pulse', wave: 'square', vol: .1, notes: 'D3 . D3 . D3 . F3 . | D3 . D3 . D3 . A2 . | D3 . D3 . D3 . F3 . | G3 . G3 . F3 . E3 . ' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'D2 - - - - - - - | D2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - - ' },
    { name: 'glass', wave: 'sine', vol: .08, notes: '. . . . A5 - . . | . . D6 - . . . . | . . . . F5 - . . | . . E5 - . . . . ' },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k . . . . . h . | . . h . . . . . ' }] },
  boss: { bpm: 132, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .12, notes: 'E2 E2 . E2 E2 . G2 . | E2 E2 . E2 E2 . A2 . | E2 E2 . E2 E2 . B2 . | C3 C3 . B2 B2 . A2 . ' },
    { name: 'twang', wave: 'pulse12', vol: .09, notes: 'E4 - G4 - B4 - G4 - | A4 - C5 - E5 - C5 - | B4 - D5 - F#5 - D5 - | E5 - - - . . . . ' },
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k h s h k k s h | k h s h k s s s ' }] },
  desk: { bpm: 70, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .22, notes: 'D3 - - - - - - - | Bb2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - ' },
    { name: 'bell', wave: 'sine', vol: .08, notes: '. . D5 - . . F5 - | . . . . G5 - . . | . . Bb4 - . . D5 - | . . . . E5 - - - ' }] }
};
// gibberish voices (Animalese-style): each speaker has a base pitch; every letter blips a note from it
const VOICES = { hoyt: [150, 'square', .5], pinky: [230, 'pulse', 1], marnie: [300, 'triangle', .8], clerk: [175, 'pulse12', .9], dealer: [125, 'saw', .6], boss: [92, 'saw', .7], cop: [140, 'pulse', .6], narrator: [110, 'triangle', .5], doc: [165, 'triangle', .5] };
function babble(who, ch) {
  const v = VOICES[who] || VOICES.narrator, c = ch.toLowerCase().charCodeAt(0) || 97;
  if (!/[a-z]/.test(ch.toLowerCase())) return;
  const f = v[0] * Math.pow(2, ((c * 7) % 12 - 4) / 12);
  A.sfx({ wave: v[1] === 'pulse' ? 'pulse' : v[1], freq: f, to: f * (c % 2 ? 1.12 : .9), dur: .055, vol: .1 * v[2] + .03 });
}

/* ---- the run's state: what a save keeps, what the results screen reads ---- */
const S = {
  step: 0, cash: 312, dirty: 0, bags: 0, purity: 0, heat: 0, supplies: false, persona: 0, kills: 0, cooked: 0, sold: 0, laundered: 0, busts: 0,
  time: 0, bestPurity: 0, clean: 0, hp: 6, flasks: 3, found: 0, flags: {}
};
const fresh = () => Object.assign(S, { step: 0, cash: 312, dirty: 0, bags: 0, purity: 0, heat: 0, supplies: false, persona: 0, kills: 0, cooked: 0, sold: 0, laundered: 0,
  busts: 0, time: 0, bestPurity: 0, clean: 0, hp: 6, flasks: 3, found: 0, flags: {} });

