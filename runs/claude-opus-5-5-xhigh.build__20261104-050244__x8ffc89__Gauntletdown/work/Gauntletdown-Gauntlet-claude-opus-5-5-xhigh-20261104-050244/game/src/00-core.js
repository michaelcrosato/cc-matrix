// GAUNTLETDOWN. Core loop: descend floor by floor through a starving dungeon, blasting hordes and the generators that
// breed them, grabbing keys, food and treasure before your ever-draining life force runs out: together, and racing each
// other for score. Built on my-3D2dge v0.85.2 (patched: ENGINE-CHANGES.md). The source fragments in game/src are joined
// in name order into this one IIFE by build.mjs.
const E = My3D2dge, { px, clamp, lerp, TAU } = E;
const T = 16;                                             // one tile
const VERSION = '1.0';
const HUB = typeof window !== 'undefined' ? window.AIHub : undefined;
const SESSION = !!(HUB && HUB.active);                    // known on the first line: an AI Hub round
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* ---- input: the keys PC players expect for a twin-stick dungeon crawler; a DualSense's standard mapping first ---- */
const MENU = { start: E.Input.DEFAULT.start, pause: E.Input.DEFAULT.pause, confirm: E.Input.DEFAULT.confirm, cancel: E.Input.DEFAULT.cancel };
const GD_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7', 'Pad0'],      // prompts show R2 first on a pad, Left click on a mouse
  magic: ['Mouse2', 'KeyQ', 'KeyK', 'Pad3', 'Pad5'],      // △ first
  plant: ['ShiftLeft', 'ShiftRight', 'Pad6'],             // L2: stand and shoot
  view: ['KeyV'],
  ...MENU
};

/* ---- registries: content is data; the core never changes to add a floor, a monster or an item ---- */
const REG = {};
/** def(kind, id, spec): register a part (floors, heroes, monsters, items, specials, amulets, gens, lines) */
function def(kind, id, spec) { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; }
function get(kind, id) { return (REG[kind] || {})[id]; }
function all(kind) { return Object.values(REG[kind] || {}); }

/* ---- the event bus: HUD, narrator, audio, effects and the network listen to what the sim says ---- */
const bus = {
  _h: {},
  on(name, fn) { (this._h[name] || (this._h[name] = [])).push(fn); return () => { const a = this._h[name]; a.splice(a.indexOf(fn), 1); }; },
  emit(name, data) { const a = this._h[name]; if (a) for (const fn of a.slice()) { try { fn(data); } catch (e) { game.fail('event ' + name, e); } } }
};

/* ---- random streams: gameplay draws from rng.sim (seeded per floor), cosmetics from Math.random ---- */
const rng = { sim: E.rng(1), seed(s) { this.sim = E.rng(s >>> 0); }, r() { return this.sim(); }, range(a, b) { return a + (b - a) * this.sim(); }, int(a, b) { return a + Math.floor((b - a + 1) * this.sim()); }, pick(l) { return l[Math.floor(this.sim() * l.length)]; } };

/* ---- small helpers ---- */
const hyp = Math.hypot, dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2, near = (a, b, d) => dist2(a, b) <= d * d;
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const cellOf = v => Math.floor(v / T), mid = c => (c + .5) * T;
const fmt = n => n > 9999 ? '9999+' : String(Math.max(0, Math.ceil(n)));
const sum = (l, f) => l.reduce((s, x) => s + f(x), 0);
const shuffle = (l, R = Math.random) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const touchOnly = () => typeof window !== 'undefined' && !!window.matchMedia && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0;

/* ---- the game ---- */
const gameOpts = {
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, id: 'gauntletdown', bg: '#07050c',
  menu: {
    items: () => typeof pauseItems === 'function' ? pauseItems() : [],
    settings: typeof gameSettings === 'function' ? gameSettings() : [],
    controls: { fire: 'Fire (hold)', magic: 'Magic', plant: 'Plant (hold)', view: 'Camera view' },
    quit: 'title'
  }
};
if (SESSION) Object.assign(gameOpts, { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' });
const game = new E.Game(gameOpts);
const P = game.particles, L = game.lights, A = game.audio;
game.allowJoin(false);
/** W: the world of the floor in play (21-sim.js builds it), or null */
let W = null;
/** the party: the heroes that carry over from floor to floor (score, specials, keys, flasks, health) */
let PARTY = [];
/** the run: { descent (1 or 2), floorIndex, firsts, dev (a cheat was used: no high scores), ended } */
let RUN = null;
/** the player's zoom in play: the wheel, - and =, Settings */
const CAM = { zoom: [.55, 1.4], start: .7, tall: 1 };
/** the scenes, filled by the scene files */
const scenes = {};
/** a value from settings with a fallback (settings exist before scenes do) */
const S = k => game.settings[k];
