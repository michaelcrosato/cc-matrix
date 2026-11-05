/* 00-core: the engine alias, constants, the game, its keys and settings, the shared state S, the event bus, randomness
 * and the content registries. Everything else in the game hangs off these. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const PI = Math.PI;
const VERSION = '1.0.0';
const HUB = !!(typeof AIHub !== 'undefined' && AIHub.active);
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* ---- the broadcast camera: side-on, the court's length left to right, pitch 30 ---- */
const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 30, 1, 1);
E.VIEWS.broadcast = BROADCAST;

/* ---- court geometry (world units; z up). Court-local (cx, cy): x 0..640 baseline to baseline, y 0..288 far to near
 * sideline. World = court-local + (OX, OY) ---- */
const T16 = 16, OX = 64, OY = 64, CW = 640, CH = 288, CMX = OX + CW / 2, CMY = OY + CH / 2;
const RIM_Z = 80, RIM_R = 9, RIM_TUBE = 1.2, BALL_R = 4.5, THREE_R = 136, CORNER_Y = 20, CORNER_X = 108;
const RIMS = [{ x: OX + 52, y: CMY, z: RIM_Z, side: -1 }, { x: OX + 588, y: CMY, z: RIM_Z, side: 1 }];
const BOARD_X = [OX + 40, OX + 600], BOARD_Y = [OY + 120, OY + 168], BOARD_Z = [72, 100];
const WALL = { x0: OX - 24, x1: OX + CW + 24, y0: OY - 24, y1: OY + CH + 24 };
const MAP_W = 48, MAP_H = 25;
/** the hoop a team attacks: HOME (0) attacks the right hoop, AWAY (1) the left */
const attackRim = team => RIMS[team === 0 ? 1 : 0];
const defendRim = team => RIMS[team === 0 ? 0 : 1];
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
/** is a court point beyond the three-point line of the rim it attacks? */
function isThree(x, y, rim) {
  const lx = x - OX, ly = y - OY, nearX = rim.side < 0 ? lx : CW - lx;
  if (nearX <= CORNER_X) return ly < CORNER_Y || ly > CH - CORNER_Y;
  return dist2(x, y, rim.x, rim.y) > THREE_R;
}

/* ---- keys: the stick runs; six buttons (PLAN 6.2) ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  shoot: ['Space', 'KeyJ', 'Mouse0', 'Pad2'], pass: ['KeyE', 'KeyK', 'Mouse2', 'Pad0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'],
  shove: ['KeyQ', 'KeyL', 'Pad1'], oop: ['KeyF', 'KeyI', 'Pad3'], taunt: ['KeyR', 'KeyU', 'Pad4'],
  tabL: ['KeyQ', 'PageUp', 'Pad4'], tabR: ['KeyE', 'Tab', 'PageDown', 'Pad5'], more: ['KeyT']   // (menus only: L1 / R1, Q / E switch tabs; T asks the hub's card for more time)
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
const ACTIONS = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
const CONTROL_NAMES = { shoot: 'Shoot / Block', pass: 'Pass / Steal', turbo: 'Turbo', shove: 'Shove / Spin', oop: 'Alley-oop / Call', taunt: 'Taunt', tabL: false, tabR: false, more: false };

/* ---- the game's own settings (group Game), beside the engine's standard ones ---- */
const DIFF_NAMES = ['ROOKIE', 'PRO', 'ALL-STAR', 'BLAM'];
const GAME_SETTINGS = [
  { key: 'glyphs', label: 'Button symbols', type: 'select', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', group: 'Game', apply: (g, v) => applyGlyphs(v, g) },
  { key: 'difficulty', label: 'CPU difficulty', type: 'select', options: [[0, 'Rookie'], [1, 'Pro'], [2, 'All-Star'], [3, 'BLAM']], value: 1, group: 'Game' },
  { key: 'quarterLen', label: 'Quarter length', type: 'select', options: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00']], value: 120, group: 'Game' },
  { key: 'powerups', label: 'Power-ups', type: 'toggle', value: true, group: 'Game' },
  { key: 'twists', label: 'Court twists', type: 'toggle', value: true, group: 'Game' },
  { key: 'jackpotAll', label: 'Jackpot Spot on every court', type: 'toggle', value: false, group: 'Game' },
  { key: 'comeback', label: 'Comeback assist', type: 'select', options: [[0, 'Off'], [.2, 'Low'], [.35, 'Normal']], value: .35, group: 'Game' },
  { key: 'commentary', label: 'Commentary', type: 'select', options: [['full', 'Full'], ['big', 'Big plays'], ['off', 'Off']], value: 'full', group: 'Game' },
  { key: 'voiceVol', label: 'Voice volume', type: 'slider', min: 0, max: 1, step: .1, value: .8, group: 'Game' },
  { key: 'camera', label: 'Camera', type: 'select', options: [['broadcast', 'Broadcast'], ['high', 'High']], value: 'broadcast', group: 'Game', apply: g => applyCamera(g) },
  { key: 'shotMeter', label: 'Shot meter', type: 'toggle', value: true, group: 'Game' }
];

/* ---- the game ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: ['broadcast', 'threequarter'], bg: '#05040a', id: 'bashketball',
  input: KEYS, autoPause: !HUB, pace: true,
  menu: HUB ? false : { items: () => pauseItems(), settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const A = game.audio, P = game.particles, L = game.lights;

/* ---- the shared state ---- */
const S = {
  scene: 'boot', mode: 'exhibition', court: null, teams: [], players: [], ball: null, match: null, twist: null, powerups: [],
  cheats: {}, rng: E.rng(1), fx: E.rng(2), events: [], eventId: 0, progress: null, menu: {}, dev: { open: false, overlays: {} },
  net: { role: 'local', seat: -1, rtt: 0 }, attract: null, lastShot: null, touchOnly: false
};

/* ---- the event bus: systems talk through it; the last 64 events are kept for debug, the net and the attract director ---- */
const BUS = {};
function on(type, fn) { (BUS[type] || (BUS[type] = [])).push(fn); return () => { const l = BUS[type]; l.splice(l.indexOf(fn), 1); }; }
function emit(type, data = {}) {
  data.type = type; data.eid = ++S.eventId; data.t = S.match ? S.match.gameT : 0;
  S.events.push(data); if (S.events.length > 64) S.events.shift();
  for (const fn of (BUS[type] || []).slice()) try { fn(data); } catch (e) { game.fail('event ' + type, e); }
  for (const fn of (BUS['*'] || []).slice()) try { fn(data); } catch (e) { game.fail('event *', e); }
  return data;
}

/* ---- registries: content is data; systems read it ---- */
const REG = {};
function def(kind, id, obj) { (REG[kind] || (REG[kind] = {}))[id] = Object.assign(obj, { id }); return obj; }
function get(kind, id) { return (REG[kind] || {})[id]; }
function all(kind) { return Object.values(REG[kind] || {}); }

/* ---- small helpers ---- */
const rnd = (a = 0, b = 1) => a + S.rng() * (b - a);
const fxr = (a = 0, b = 1) => a + S.fx() * (b - a);
const pickR = list => list[Math.floor(S.rng() * list.length) % list.length];
const pickF = list => list[Math.floor(S.fx() * list.length) % list.length];
const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += S.rng(); return (u - 2) / .577; };
const mmss = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };
const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
const store = { get: (k, d) => E.store.get(k, d), set: (k, v) => E.store.set(k, v) };
function applyGlyphs(v, g = game) { for (const p of g.players || []) p.glyphs = v || 'playstation'; }
function applyCamera(g = game) {
  const want = g.settings && g.settings.camera === 'high' ? 'threequarter' : 'broadcast';
  if (g.scene && g.scene.matchScene && g.baseView && g.baseView.id !== want) g.setView(want);
}
