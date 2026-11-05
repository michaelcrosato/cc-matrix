/* GAUNTLETDOWN: an original Gauntlet-inspired co-op dungeon crawl on my-3D2dge.
 * 00-core: the engine handle, the input preset, the game, registries, the event bus, random streams. */
const E = My3D2dge, { px, clamp, lerp } = E;
const TAU = Math.PI * 2, T = 16;
const HUB = typeof window !== 'undefined' && window.AIHub ? window.AIHub : null;
const SESSION = !!(HUB && HUB.active);
const HAS_DOM = typeof document !== 'undefined' && !!document.getElementById;
const VERSION = '1.0';

// The input preset: twin-stick keys and pads. Order matters: a keyboard half gives the actions after the moves its
// buttons in turn (player 1: F G H, player 2: . / ,), and a prompt shows the first code of the device in use.
const MENU = {
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const GD_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Space', 'KeyJ', 'Mouse0', 'Pad7', 'Pad0'], magic: ['KeyQ', 'KeyK', 'Mouse2', 'Pad3', 'Pad5'], plant: ['ShiftLeft', 'ShiftRight', 'Pad6'],
  view: ['KeyV'], more: ['KeyT', 'Pad3'], ...MENU
};

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, id: 'gauntletdown', bg: '#05040a',
  ...(SESSION ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : { fullscreen: 'button' }),
  menu: {
    items: () => menuItems(),
    controls: { fire: 'Fire', magic: 'Magic', plant: 'Plant (stand and shoot)', view: 'Camera view', more: false },
    quit: 'title'
  }
});
const P = game.particles, L = game.lights, A = game.audio;
const scenes = {};   // every scene, by name
const SC = {};       // shared scene state

/* ---- registries: content is data (floors, heroes, monsters, items, lines) ---- */
const REG = {};
const def = (kind, id, spec) => { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; };
const get = (kind, id) => (REG[kind] || {})[id];
const all = kind => Object.values(REG[kind] || {});

/* ---- the event bus ---- */
const bus = (() => {
  const h = {};
  return {
    on(name, fn) { (h[name] || (h[name] = [])).push(fn); return () => { h[name] = h[name].filter(f => f !== fn); }; },
    emit(name, data) { for (const fn of h[name] || []) { try { fn(data); } catch (e) { game.fail('bus ' + name, e); } } }
  };
})();

/* ---- random streams: rng.sim for gameplay (seeded, repeatable), Math.random for looks ---- */
const rng = { seed: 1, sim: E.rng(1) };
const reseed = s => { rng.seed = s >>> 0; rng.sim = E.rng(rng.seed); };
const R = () => rng.sim();
const Ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const Rpick = list => list[Math.floor(R() * list.length)];

/* ---- small helpers ---- */
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const fmt = n => n > 9999 ? '9999+' : String(Math.max(0, Math.floor(n)));
const store = { get: (k, d) => { try { return E.store.get('gd:' + k, d); } catch (e) { return d; } }, set: (k, v) => { try { E.store.set('gd:' + k, v); } catch (e) { /* storage blocked */ } } };
const txt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, { shadow: '#05030a', outline: false, ...o });
const otxt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, { outline: '#05030a', ...o });
const twidth = (s, o) => E.font.width(s, o);
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];

/* ---- 10-foot HTML menus: the engine's standard screens scale up on a TV ---- */
if (HAS_DOM && document.head) {
  const st = document.createElement('style');
  const fit = () => { const k = clamp(Math.min(innerHeight / 620, innerWidth / 1000), 1, 2.4); st.textContent = '.esh{zoom:' + k.toFixed(2) + '}'; };
  fit(); document.head.appendChild(st); addEventListener('resize', fit);
}
