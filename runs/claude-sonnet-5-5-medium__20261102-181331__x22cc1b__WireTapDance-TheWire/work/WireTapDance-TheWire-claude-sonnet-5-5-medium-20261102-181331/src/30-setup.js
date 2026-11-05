/* ============================================================================
 * the game object, settings, controls, sound
 * ========================================================================== */
const E = My3D2dge;
const HUB = typeof AIHub !== 'undefined' ? AIHub : null;
const IN_SESSION = !!(HUB && HUB.active);
const ENGINE_NOTE = 'my-3D2dge ' + (E.version || 'v0.85.1');

/* controls: a pad-first map. Cross = interact, Circle = crouch, Square = tackle, Triangle = case file, L2 = camera,
   R2 = sprint, R3 = change the view. The keyboard takes the keys detectives' hands know: WASD, Shift, C, E, Q, J, Tab, V. */
const MENU_ACTIONS = {};
for (const k of ['start', 'pause', 'confirm', 'cancel']) MENU_ACTIONS[k] = E.Input.THIRDPERSON[k].filter(c => c !== 'KeyJ' && c !== 'KeyK');   // J is the tackle
const CONTROLS = Object.assign({
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad10'], crouch: ['KeyC', 'ControlLeft', 'Pad1'], interact: ['KeyE', 'KeyF', 'Space', 'Pad0'],
  camera: ['KeyQ', 'Mouse2', 'Pad6'], tackle: ['KeyJ', 'Pad2'], board: ['Tab', 'KeyB', 'Pad3'], view: ['KeyV', 'Pad11']
}, MENU_ACTIONS);

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], input: CONTROLS, id: 'wire-tap-dance',
  menu: {
    items: [['Case file', () => openBoard()]], saves: true, quit: IN_SESSION ? false : 'title',
    controls: { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', sprint: 'Sprint', crouch: 'Crouch and sneak', interact: 'Interact and talk', camera: 'Raise the camera', tackle: 'Tackle', board: 'Case file', view: 'Change the camera view' },
    settings: [
      { key: 'invertH', group: 'Controller', label: 'Invert stick left and right', type: 'toggle', value: false, help: 'For a controller whose horizontal axis reads backwards', apply: (g, v) => { g.input.invertH = !!v; } },
      { key: 'invertV', group: 'Controller', label: 'Invert stick up and down', type: 'toggle', value: false, help: 'For a controller whose vertical axis reads backwards', apply: (g, v) => { g.input.invertV = !!v; } },
      { key: 'cones', group: 'Game', label: 'Show lookouts’ sight cones', type: 'toggle', value: true, help: 'The lit wedge in front of each lookout. Off is harder and more honest' },
      { key: 'hints', group: 'Game', label: 'Hints', type: 'toggle', value: true, help: 'Short tips as new things come up' }
    ]
  }
});
/* the controller shows PlayStation symbols unless the player picks Xbox: the standard "Button symbols" setting, narrowed to the two */
(() => {
  const S = game.settings, sp = S.spec('glyphs');
  if (sp) { sp.options = [['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']]; sp.value = 'playstation'; sp.help = 'Which button symbols the prompts show for a controller'; sp.label = 'Controller symbols'; }
  if (S._raw.glyphs !== 'xbox' && S._raw.glyphs !== 'playstation') { S.glyphs = 'playstation'; S._apply('glyphs'); }
})();
const ui = new E.Shell(game, { theme: { accent: '#e0b06a', ink: '#f0e8da', paper: 'rgba(12,14,18,.9)', danger: '#e07a5a', titleFont: 'Georgia, "Times New Roman", serif' }, meters: .125 });
const talk = new E.Dialog(game, { speed: 42, lines: 3, bg: '#12161c', border: '#d8b070', nameColor: '#f0c070', voice: 'vx_det' });
const I = game.input;

/* ---------- sound: sfx, voices (Animalese-style gibberish by speaker) and music, all synthesized ---------- */
const A = game.audio;
const VOICES = {
  det: { wave: 'triangle', freq: 330, to: 360 }, sgt: { wave: 'saw', freq: 140, to: 120 }, lt: { wave: 'triangle', freq: 260, to: 240 },
  tooley: { wave: 'pulse12', freq: 200, to: 170 }, lorne: { wave: 'saw', freq: 110, to: 100 }, sweets: { wave: 'square', freq: 250, to: 290 },
  dray: { wave: 'pulse', freq: 190, to: 230 }, kid: { wave: 'square', freq: 520, to: 600 }, narr: { wave: 'sine', freq: 220, to: 220 }
};
for (const k in VOICES) A.define('vx_' + k, Object.assign({ dur: .055, vol: .1 }, VOICES[k]));
A.define('wire_ok', { wave: 'square', freq: 'C5', to: 'G5', dur: .12, vol: .18 });
A.define('wire_bad', { wave: 'saw', freq: 180, to: 60, dur: .25, vol: .2 });
A.define('shutter', [{ wave: 'noise', dur: .04, vol: .3 }, { wave: 'square', freq: 1400, to: 400, dur: .06, vol: .12 }]);
A.define('whistle', [{ wave: 'sine', freq: 1900, to: 2300, dur: .22, vol: .2, vib: [30, .04] }]);
A.define('radio', [{ wave: 'noise', dur: .08, vol: .12 }, { wave: 'square', freq: 900, to: 700, dur: .05, vol: .06 }]);
A.define('phone', { wave: 'square', freq: 'A5', dur: .09, vol: .12, arp: [0, 5], step: .04 });
A.define('footfall', { wave: 'noise', dur: .03, vol: .06 });
A.define('tick', { wave: 'square', freq: 1800, dur: .02, vol: .08 });
(() => {   // voices vary in pitch per blip: gibberish that still sounds like somebody
  const base = A.sfx.bind(A);
  A.sfx = function (n, o) { if (typeof n === 'string' && n.indexOf('vx_') === 0) { const r = Math.random(); return base(n, Object.assign({}, o, { pitch: .8 + r * .55 })); } return base(n, o); };
})();

const SONGS = {
  title: { bpm: 74, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'A2 - - - - - A2 - E3 - - - D3 - C3 - A2 - - - - - A2 - E3 - - - G3 - E3 - F2 - - - - - F2 - C3 - - - D3 - E3 - E2 - - - - - E2 - B2 - - - G#2 - B2 -' },
    { wave: 'pulse12', vol: .09, notes: '. . . . E4 - - - G4 - A4 - - - - - . . . . E4 - - - D4 - C4 - - - - - . . . . F4 - - - A4 - C5 - - - - - . . . . B4 - - - G#4 - E4 - - - - -' },
    { wave: 'drums', vol: .12, notes: 'k . . . . . h . s . . . . . h . k . . . . . h . s . . h . . h .' }
  ] },
  stealth: { bpm: 68, steps: 4, tracks: [
    { wave: 'saw', vol: .09, notes: 'D2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - F2 - - - Bb1 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - C2 - - -' },
    { wave: 'sine', vol: .08, notes: '. . . . . . . . A5 - - - . . . . . . . . . . . . . . . . E5 - - - . . . . . . . . . . . . . . . . . . . . D5 - - - . . . . . . . . . . . .' },
    { wave: 'drums', vol: .08, notes: '. . h . . . h . . . h . . . h h . . h . . . h . . . h . . . h .' }
  ] },
  chase: { bpm: 148, steps: 4, tracks: [
    { wave: 'saw', vol: .13, notes: 'E2 . E2 . E2 . G2 . E2 . E2 . A2 . G2 . E2 . E2 . E2 . G2 . B2 . A2 . G2 . E2 .' },
    { wave: 'square', vol: .06, notes: 'B4 - - B4 - - E5 - B4 - - G4 - - A4 - B4 - - B4 - - E5 - D5 - - B4 - - G4 - -' },
    { wave: 'drums', vol: .15, notes: 'k . h h s . h k k . h h s . h h k . h h s . h k k h h h s . s s' }
  ] },
  box: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'C2 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - G1 - - - Ab1 - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - -' },
    { wave: 'square', vol: .04, notes: '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
    { wave: 'drums', vol: .07, notes: 'h . . . . . . . h . . . . . . . h . . . . . . . h . . . . . . h' }
  ] },
  report: { bpm: 66, steps: 4, tracks: [
    { wave: 'triangle', vol: .17, notes: 'D3 - - - A2 - - - Bb2 - - - F2 - - - G2 - - - D3 - - - A2 - - - E2 - - -' },
    { wave: 'sine', vol: .1, notes: 'A4 - - - - - F4 - - - E4 - D4 - - - - - - - - - - - . . . . . . . . . . . .' }
  ] }
};
const music = (name, o) => { try { A.music(name ? SONGS[name] : null, o); } catch (e) { game.fail('music', e); } };

/* ---------- raw "somebody touched something" tracking, for the attract mode (the pilot's own taps never count) ---------- */
let lastUserInput = (typeof performance !== 'undefined' ? performance.now() : 0), userPoked = false;
const poke = () => { lastUserInput = performance.now(); userPoked = true; };
if (typeof window !== 'undefined' && !game.headless) {
  for (const t of ['keydown', 'pointerdown', 'wheel', 'touchstart']) window.addEventListener(t, poke, { passive: true });
  let mx = -1, my = -1;
  window.addEventListener('mousemove', e => { if (mx >= 0 && Math.hypot(e.clientX - mx, e.clientY - my) > 6) poke(); mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('gamepadconnected', poke);
}
function pollPadPoke() {
  let pads = []; try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { /* blocked */ }
  for (const p of Array.from(pads || [])) if (p && (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .55))) poke();
}
/** a device with a screen and no keyboard or pad: touch only (the game asks for a controller or a keyboard) */
function touchOnly() {
  if (typeof navigator === 'undefined' || game.headless) return false;
  let pad = false; try { pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(p => p && p.connected); } catch (e) { /* none */ }
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  return !pad && coarse && navigator.maxTouchPoints > 0 && !userUsedKeys;
}
let userUsedKeys = false;
if (typeof window !== 'undefined' && !game.headless) window.addEventListener('keydown', () => { userUsedKeys = true; }, { passive: true });

/* 10-foot UI: the HTML layer scales with the screen so a TV across the room reads */
function scaleUI() {
  if (game.headless || typeof innerWidth === 'undefined' || !ui.root) return;
  const z = Math.max(1, Math.min(1.9, innerWidth / 1000)); ui.root.style.zoom = String(z);
}
if (typeof window !== 'undefined' && !game.headless) { addEventListener('resize', scaleUI); setTimeout(scaleUI, 0); }
