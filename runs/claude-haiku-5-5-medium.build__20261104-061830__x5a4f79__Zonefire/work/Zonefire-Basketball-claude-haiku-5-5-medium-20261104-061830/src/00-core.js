/* ZONEFIRE — an over-the-top 2-on-2 arcade basketball demo on my-3D2dge (v0.85.2).
 * Fragments in src/ are concatenated in name order into one IIFE by tools/build.mjs. This one holds the engine alias,
 * the constants of the court (plan §6.1), the input preset (§6.2), the shared state, the event bus, the registries and
 * the one game object. Systems read registries; content never edits systems; anything a test needs is on window.__bb. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const PI = Math.PI;
const HUB = !!(window.AIHub && AIHub.active);            // true from the first line inside a hub session

/* ---- the court's geometry (world units; one tile = 16; z up). Court-local (cx, cy): x 0..640 baseline to baseline,
 * y 0..288 far sideline to near sideline. World = court-local + (OX, OY). ---- */
const TILE = 16, OX = 64, OY = 112, CW = 640, CH = 288, MIDX = 320, MIDY = 144;
const RIM = [{ x: 52, y: 144, z: 80 }, { x: 588, y: 144, z: 80 }];   // rim centres, court-local
const RIM_R = 9, RIM_TUBE = 1.2, BALL_R = 4.5, BOARD_X = [40, 600], BOARD_Y = [120, 168], BOARD_Z = [72, 100];
const WALL_OUT = 24;                                       // invisible walls outside the lines
const WORLD_W = 768, WORLD_H = 448;                        // the arena map, 48 x 28 tiles

/* ---- the input preset (plan §6.2): the engine's DEFAULT without attack, dash, skill and jump ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  shoot: ['Space', 'KeyJ', 'Mouse0', 'Pad2'], pass: ['KeyE', 'KeyK', 'Mouse2', 'Pad0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'],
  shove: ['KeyQ', 'KeyL', 'Pad1'], oop: ['KeyF', 'KeyI', 'Pad3'], taunt: ['KeyR', 'KeyU', 'Pad4'],
  card: ['KeyT', 'Pad3']   // the hub's card: more time (the triangle, or T); Enter is ready (confirm)
});
delete KEYS.attack; delete KEYS.dash; delete KEYS.skill; delete KEYS.jump;
const ACTION_NAMES = { shoot: 'Shoot / Block', pass: 'Pass / Steal', turbo: 'Turbo', shove: 'Shove / Spin', oop: 'Alley-oop / Call', taunt: 'Taunt' };

/* the scene table: every fragment registers its scenes here (the engine's game.start takes it in 90-start) */
const scenes = {};

/* ---- the shared state (plan §4.4). Match fields are reset by the match module; progress by the Tour and records ---- */
const S = {
  scene: 'boot', mode: 'exhibition', court: 'skybox', teams: [null, null], players: [], ball: null,
  match: null, twist: {}, powerups: [], cheats: {}, rng: E.rng(1), fxRng: E.rng(2), events: [], seq: 0,
  menu: {}, progress: null, lastEvent: null, notes: [], seed: 1
};

/* ---- the event bus: emit(type, data) delivers at once to every listener, and keeps the last 64 for debug and the net ---- */
const LISTENERS = Object.create(null);
const on = (type, fn) => { (LISTENERS[type] || (LISTENERS[type] = [])).push(fn); };
const emit = (type, data = {}) => {
  const ev = Object.assign({ type, id: ++S.seq, t: S.match ? S.match.clock : 0 }, data);
  S.events.push(ev); if (S.events.length > 64) S.events.shift();
  S.lastEvent = ev;
  for (const fn of LISTENERS[type] || []) { try { fn(ev); } catch (err) { game.fail('event ' + type, err); } }
  for (const fn of LISTENERS['*'] || []) { try { fn(ev); } catch (err) { game.fail('event ' + type, err); } }
  return ev;
};

/* ---- the registries: def('team', id, data), get(kind, id), all(kind). A content entry is data; the lint checks it ---- */
const REG = Object.create(null);
const def = (kind, id, data) => { (REG[kind] || (REG[kind] = new Map())).set(id, Object.assign({ id }, data)); return REG[kind].get(id); };
const get = (kind, id) => (REG[kind] && REG[kind].get(id)) || null;
const all = kind => (REG[kind] ? [...REG[kind].values()] : []);

/* ---- saved data: the progress record and the tuning (plan §4.8) ---- */
const PROGRESS_DEFAULT = () => ({ tour: null, unlocked: { bots: false, allstars: false, bigHeads: false }, camp: [], records: { mostPoints: 0, bestDunk: null, toursWon: 0 }, hall: [] });
const loadProgress = () => { const p = E.store.get('bb:progress', null); S.progress = Object.assign(PROGRESS_DEFAULT(), p || {}); S.progress.unlocked = Object.assign(PROGRESS_DEFAULT().unlocked, (p && p.unlocked) || {}); return S.progress; };
const saveProgress = () => E.store.set('bb:progress', S.progress);
if (!S.progress) loadProgress();

/* ---- the game object: one E.Game for the page; the title, menus, matches and attract all share it ---- */
const GAME_SETTINGS = [
  { key: 'buttons', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
  { key: 'difficulty', label: 'CPU difficulty', options: ['Rookie', 'Pro', 'All-Star', 'BLAM'], value: 'Pro' },
  { key: 'quarter', label: 'Quarter length', options: ['1:00', '1:30', '2:00', '3:00'], value: '2:00' },
  { key: 'powerups', label: 'Power-ups', options: ['On', 'Off'], value: 'On' },
  { key: 'twists', label: 'Court twists', options: ['On', 'Off'], value: 'On' },
  { key: 'jackpot', label: 'Jackpot Spot on every court', options: ['Off', 'On'], value: 'Off' },
  { key: 'comeback', label: 'Comeback assist', options: ['Off', 'Low', 'Normal'], value: 'Normal' },
  { key: 'commentary', label: 'Commentary', options: ['Full', 'Big plays', 'Off'], value: 'Full' },
  { key: 'voiceVol', label: 'Voice volume', type: 'slider', value: 1, min: 0, max: 1, step: .1 },
  { key: 'camera', label: 'Camera', options: ['Broadcast', 'High'], value: 'Broadcast' },
  { key: 'shotMeter', label: 'Shot meter', options: ['On', 'Off'], value: 'On' },
  { key: 'bigHeads', label: 'Big heads', options: ['Off', 'On'], value: 'Off' }
];
const COMMENTARY_LEVEL = () => ({ Full: 2, 'Big plays': 1, Off: 0 })[(game.settings && game.settings.commentary) || 'Full'];
const setting = k => (game.settings && game.settings[k]) || null;
const dsp = () => game.input.lastDevice === 'gamepad' && setting('buttons') === 'Xbox' ? 'xbox' : 'playstation';

/* the broadcast camera (plan §2): yaw 0, pitch 30, one screen pixel per world unit; 'threequarter' is the High option */
const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 30, 1, 1);
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: [BROADCAST, 'threequarter'], bg: '#05040a', id: 'basketblam',
  input: KEYS, autoPause: !HUB,
  menu: HUB ? false : { items: () => pauseItems(), settings: GAME_SETTINGS, controls: ACTION_NAMES, quit: 'title' }
});
const P = game.particles, L = game.lights, A = game.audio;   // the engine's systems, short names for the fragments
