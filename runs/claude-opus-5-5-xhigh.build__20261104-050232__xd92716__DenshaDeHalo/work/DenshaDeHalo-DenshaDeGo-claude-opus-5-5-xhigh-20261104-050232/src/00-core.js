/* DENSHA DE HALO!  (an original homage to Densha de Go!)
 * CORE LOOP: Read the line ahead, notch power and brake to keep the timetable, and stop each train exactly on the mark:
 * on time, smoothly and by the book. Then do it again at the next station.
 *
 * 00-core: the DH namespace, the E.Game, units, seeded randomness, the player's settings and the input map.
 * Every src file is one IIFE writing only into DH; the only globals are My3D2dge, AIHub and DH. */
(() => {
'use strict';
const E = My3D2dge, DH = (window.DH = window.DH || {});
DH.E = E;
DH.VERSION = '1.0';
DH.TITLE = 'Densha de Halo!';
DH.L = 5;                 // metres a segment
DH.LOOP = 20600;          // the Halo Line's length, metres
DH.KMH = 3.6;             // m/s -> km/h
DH.hub = typeof AIHub !== 'undefined' && AIHub.active ? AIHub : null;

/* ---- hashing and seeded streams: never Math.random in game logic ---- */
DH.hash = str => { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
DH.seed = 1;   // the stage's seed (set at each stage start)
DH.rng = label => (DH.hub && DH.hub.rng && DH.hubInfo) ? DH.hub.rng(label) : E.rng(DH.hash(label + ':' + DH.seed));
DH.fnv = arr => DH.hash(JSON.stringify(arr));

/* ---- time ---- */
DH.clockStr = (t, sec = true) => { t = ((Math.round(t) % 86400) + 86400) % 86400; const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + (sec ? ':' + String(s).padStart(2, '0') : ''); };
DH.hms = (h, m, s = 0) => h * 3600 + m * 60 + s;
DH.parseClock = str => { const [h, m, s] = String(str).split(':').map(Number); return DH.hms(h || 0, m || 0, s || 0); };
DH.fmtDist = m => m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.max(0, Math.round(m)) + ' m';
DH.clamp = E.clamp; DH.lerp = E.lerp;

/* ---- the player's own settings (group Game) and the balance sliders (group Dev, shown only in Dev Mode) ---- */
const GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: [['easy', 'Easy'], ['normal', 'Normal'], ['expert', 'Expert']], value: 'normal', help: 'Easy: more Halo Time, wider stop windows, half penalties. Expert: less of all three.' },
  { key: 'buttons', label: 'Controller symbols', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', help: 'The button symbols in prompts: ✕ ○ □ △ or A B X Y.', apply: (g, v) => { if (g.settings && g.settings.glyphs !== v) g.settings.set('glyphs', v); } },
  { key: 'leverDir', label: 'Lever direction', options: [['powerUp', 'Up = Power'], ['brakeUp', 'Up = Brake']], value: 'powerUp', help: 'Which way up on the d-pad, stick, W/S and arrows moves the lever. The triggers and the wheel stay power and brake.' },
  { key: 'guide', label: 'Braking guide', options: [['auto', 'Auto (Easy only)'], ['on', 'On'], ['off', 'Off']], value: 'auto', help: 'An amber zone on the stop gauge where B4 must start, and a marker where you would stop.' },
  { key: 'autoCalls', label: 'Auto calls', value: false, help: 'The driver points and calls for you at the sweet spot (no call points).' },
  { key: 'subtitles', label: 'Subtitles', value: true, help: 'Words for every voice. The voices are gibberish, so leave them on.' },
  { key: 'tips', label: 'Show tips', value: true, help: 'First-time tips for each new thing on the line.' },
  { key: 'stopCam', label: 'Stop Cam', value: true, help: 'A side view of every stop, with how far from the mark you came.' },
  { key: 'cab', label: 'Cab display', options: [['full', 'Full'], ['minimal', 'Minimal']], value: 'full', help: 'Minimal hides the dashboard and shows the readouts over the view.' },
  { key: 'driveMusic', label: 'Driving music', value: false, help: 'Music while you drive. Off: just the train.' },
  { key: 'sway', label: 'Camera sway', type: 'slider', value: 1, min: 0, max: 1, step: .05, unit: '', help: 'How much the cab rocks on curves, joints and brakes.' }
];
DH.GAME_SETTINGS = GAME_SETTINGS;

/* ---- input: the lever on up/down (W/S, arrows, d-pad, stick: flippable), triggers on power/brake; the rest ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  power: ['Pad7'], brake: ['Pad6'], neutral: ['KeyN', 'Pad5'], eb: ['Backspace', 'KeyX', 'Pad4'],
  call: ['KeyE', 'Mouse0', 'Pad0'], horn: ['Space', 'Pad2'], ats: ['KeyQ', 'Pad3'], view: ['KeyC', 'Pad1'], dbg: ['Backquote']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
DH.KEYS = KEYS;
// the duel's halves (Input.halfKeys hands the non-move actions out in order to F G H R T Y / . / , L ; ')
const DUEL_ORDER = ['call', 'horn', 'ats', 'eb', 'neutral', 'view'];
DH.DUEL_KEYS = (() => { const o = {}; for (const a of ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel']) o[a] = KEYS[a]; for (const a of DUEL_ORDER) o[a] = KEYS[a]; o.power = KEYS.power; o.brake = KEYS.brake; return o; })();

DH.CONTROL_NAMES = { up: 'Lever up (power)', down: 'Lever down (brake)', power: 'Power notch (trigger)', brake: 'Brake notch (trigger)', neutral: 'Lever to N', eb: 'Emergency brake', call: 'Point and call', horn: 'Horn', ats: 'ATS confirm', view: 'Change view', left: false, right: false, dbg: false };

/* ---- the game ---- */
const menuItems = () => (DH.pauseItems ? DH.pauseItems() : []);
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'side', input: KEYS, bg: '#05060c', id: 'densha-de-halo',
  menu: { items: menuItems, settings: GAME_SETTINGS, controls: DH.CONTROL_NAMES, quit: 'title' } });
DH.game = game;
game.input.names = DH.CONTROL_NAMES;
DH.ui = new E.Shell(game, { theme: { accent: '#f2c230', ink: '#fff8e8' }, screens: {} });
game.settings.set('glyphs', game.settings.buttons || 'playstation');

/* ---- devices: which glyph family a prompt shows, touch-only detection ---- */
DH.device = (I = game.input) => I.lastDevice === 'gamepad' ? (game.settings.buttons === 'xbox' ? 'xbox' : 'playstation') : I.lastDevice === 'mouse' ? 'mouse' : I.lastDevice === 'touch' ? 'touch' : 'keyboard';
DH.keySeen = false; DH.padSeen = false;
DH.touchOnly = () => {
  if (DH.forceTouchOnly !== undefined) return DH.forceTouchOnly;
  if (typeof matchMedia !== 'function') return false;
  try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !DH.keySeen && !DH.padSeen; } catch (e) { return false; }
};
if (typeof addEventListener === 'function' && !game.headless) {
  addEventListener('keydown', () => { DH.keySeen = true; }, { capture: true });
  addEventListener('gamepadconnected', () => { DH.padSeen = true; });
}
/** the lever's up and down, after the Lever direction setting */
DH.leverUp = I => game.settings.leverDir === 'brakeUp' ? 'brake' : 'power';

/* ---- tiny helpers ---- */
DH.pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
DH.range = (r, a, b) => a + (b - a) * r();
DH.once = new Set();
// the save: E.store (localStorage) with a copy kept in memory, so a visit with storage blocked still remembers
const MEM = new Map();
DH.store = {
  get: (k, d) => { if (MEM.has(k)) { const m = MEM.get(k); return m === null || m === undefined ? d : JSON.parse(JSON.stringify(m)); } const v = E.store.get('dh:' + k, null); MEM.set(k, v); return v === null || v === undefined ? d : v; },
  set: (k, v) => { MEM.set(k, v === undefined ? null : JSON.parse(JSON.stringify(v))); return E.store.set('dh:' + k, v); }
};
DH.scenes = {};
DH.log = [];
})();
