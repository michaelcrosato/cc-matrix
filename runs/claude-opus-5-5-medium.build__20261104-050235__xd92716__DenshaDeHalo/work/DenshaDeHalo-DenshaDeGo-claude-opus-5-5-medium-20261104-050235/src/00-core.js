/* DENSHA DE HALO! · core
 * Core loop: read the line ahead, notch power and brake to keep the timetable, and stop each train exactly on the mark:
 * on time, smoothly and by the book. Then do it again at the next station.
 * This file: the DH namespace, units, seeded randomness, tuning (every dev slider), settings, the input map, the game. */
(() => {
'use strict';
const E = My3D2dge, DH = (window.DH = window.DH || {});
DH.E = E;
DH.VERSION = '1.0';
DH.TITLE = 'Densha de Halo!';
DH.HUB = typeof AIHub !== 'undefined' && AIHub.active ? AIHub : null;

/* ---------- units and helpers ---------- */
DH.KMH = 1 / 3.6;                        // km/h -> m/s
DH.LOOP = 20600;                         // the Halo Line, metres
DH.CAR = 20;                             // one car, metres
DH.clock = t => { t = Math.max(0, Math.round(t)); const h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = t % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
DH.hm = t => DH.clock(t).slice(0, 5);
DH.tsec = str => { const [h, m, s] = str.split(':').map(Number); return h * 3600 + m * 60 + (s || 0); };
DH.fnv = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
DH.wrap = (s, L) => ((s % L) + L) % L;
DH.fmtKm = m => (m / 1000).toFixed(2) + ' km';
DH.fmtNum = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ---------- determinism: every world-building and cosmetic stream comes from here ---------- */
DH.seed = 1;
DH.rng = label => DH.HUB && DH.HUB.seed !== undefined && DH.HUB.rng ? DH.HUB.rng(label) : E.rng(DH.fnv(label + ':' + DH.seed));

/* ---------- tuning: the balance variables (dev sliders read and write these; every system reads them each step) ---------- */
DH.TUNING_DEFAULTS = {
  accelScale: 1.0, brakeScale: 1.0, brakeLag: 0.7, ebDecel: 5.0, adhesionRain: 2.6, gradeScale: 1.0, resistScale: 1.0,
  graceStart: 25, lateCost: 1.0, overrunCost: 2.0, stopWindow: 1.0, onTimeWindow: 2, dwell: 12, callGreat: 120,
  limitTol: 3, atsTime: 5, comfortSens: 1.0, sway: 1.0, fov: 75
};
DH.T = Object.assign({}, DH.TUNING_DEFAULTS);
DH.DEV_SLIDERS = [
  ['accelScale', 'Power acceleration', .5, 2, .05], ['brakeScale', 'Service brake strength', .5, 2, .05], ['brakeLag', 'Brake response lag (s)', 0, 2, .05],
  ['ebDecel', 'Emergency brake (km/h/s)', 3, 7, .1], ['adhesionRain', 'Rain adhesion (km/h/s)', 1, 6, .1], ['gradeScale', 'Gradient effect', 0, 2, .05],
  ['resistScale', 'Running resistance', 0, 2, .05], ['graceStart', 'Starting Halo Time (s)', 5, 99, 1], ['lateCost', 'Halo Time lost per second late', 0, 3, .1],
  ['overrunCost', 'Seconds lost per metre overrun', 0, 5, .1], ['stopWindow', 'Stop window scale', .5, 3, .05], ['onTimeWindow', 'On-time window (±s)', 0, 10, 1],
  ['dwell', 'Minimum dwell (s)', 5, 60, 1], ['callGreat', 'Call sweet spot far edge (m)', 60, 200, 5], ['limitTol', 'Speed tolerance (km/h)', 0, 10, 1],
  ['atsTime', 'ATS confirm time (s)', 2, 10, .5], ['comfortSens', 'Comfort sensitivity', 0, 3, .05], ['sway', 'Camera sway', 0, 2, .05], ['fov', 'Cab field of view (deg)', 60, 90, 1]
];
/* difficulty tables (Halo Time start, stop windows, penalties) */
DH.DIFF = {
  Easy: { grace: 40, win: 1.5, pen: .5, hornMiss: 0 },
  Normal: { grace: 25, win: 1.0, pen: 1.0, hornMiss: 1 },
  Expert: { grace: 15, win: 0.7, pen: 1.5, hornMiss: 1 }
};
DH.diff = () => DH.DIFF[(DH.game && DH.game.settings.difficulty) || 'Normal'] || DH.DIFF.Normal;
DH.dev = { god: false, freeze: false, overlay: false, opened: false, unlocked: false };

/* ---------- input: one lever, the cab's buttons, menus (the engine's menu keys are added by the preset) ---------- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  power: ['KeyW', 'ArrowUp', 'Pad7', 'Pad12', 'PadAxisUp'], brake: ['KeyS', 'ArrowDown', 'Pad6', 'Pad13', 'PadAxisDown'],
  neutral: ['KeyN', 'Pad5'], eb: ['Backspace', 'KeyX', 'Pad4'], call: ['KeyE', 'Mouse0', 'Pad0'], horn: ['Space', 'Pad2'],
  ats: ['KeyQ', 'Pad3'], view: ['KeyC', 'Pad1'], more: ['KeyT', 'Pad3']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
DH.KEYS = KEYS;
DH.ACTION_NAMES = { power: 'Lever: power', brake: 'Lever: brake', neutral: 'Lever: neutral (N)', eb: 'Emergency brake', call: 'Point and call', horn: 'Horn', ats: 'ATS confirm', view: 'Change view', more: false, up: 'Menu up', down: 'Menu down', left: 'Menu left', right: 'Menu right' };

/* ---------- the game's own settings (group Game) and the Dev group's balance sliders ---------- */
const GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'Normal', options: ['Easy', 'Normal', 'Expert'], group: 'Game', help: 'Halo Time, stop windows and penalties' },
  { key: 'symbols', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], group: 'Game',
    apply: (g, v) => { g.input.glyphs = v; if (g.settings && g.settings.spec('glyphs') && g.settings.glyphs !== v) g.settings.set('glyphs', v); } },
  { key: 'leverDir', label: 'Lever direction', type: 'select', value: 'up-power', options: [['up-power', 'Up = Power'], ['up-brake', 'Up = Brake']], group: 'Game', help: 'Flips the d-pad, stick, W/S and arrows (R2/L2 and the wheel stay)' },
  { key: 'guide', label: 'Braking guide', type: 'select', value: 'auto', options: [['auto', 'Auto (Easy only)'], ['on', 'On'], ['off', 'Off']], group: 'Game' },
  { key: 'autoCalls', label: 'Auto calls (no score)', type: 'toggle', value: false, group: 'Game' },
  { key: 'subtitles', label: 'Subtitles', type: 'toggle', value: true, group: 'Game' },
  { key: 'tips', label: 'Show tips', type: 'toggle', value: true, group: 'Game' },
  { key: 'stopCam', label: 'Stop Cam', type: 'toggle', value: true, group: 'Game' },
  { key: 'cabDisplay', label: 'Cab display', type: 'select', value: 'full', options: [['full', 'Full'], ['minimal', 'Minimal']], group: 'Game' },
  { key: 'driveMusic', label: 'Driving music', type: 'toggle', value: false, group: 'Game' },
  { key: 'camSway', label: 'Camera sway', type: 'slider', value: 1, min: 0, max: 1, step: .05, group: 'Game' }
];
const DEV_SETTINGS = DH.DEV_SLIDERS.map(([key, label, min, max, step]) => ({ key: 'dev_' + key, label, type: 'slider', value: DH.TUNING_DEFAULTS[key], min, max, step, group: 'Dev',
  apply: (g, v) => { DH.T[key] = +v; } }));
DH.guideOn = () => { const v = DH.game.settings.guide; return v === 'on' || (v === 'auto' && DH.game.settings.difficulty === 'Easy'); };

/* ---------- the game ---------- */
const hub = !!DH.HUB;
const menuItems = () => {
  const out = [];
  if (DH.pauseItems) for (const it of DH.pauseItems()) out.push(it);
  return out;
};
const game = DH.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#05060c', input: KEYS, id: 'densha-de-halo',
  menu: { items: menuItems, settings: GAME_SETTINGS.concat(DEV_SETTINGS), controls: DH.ACTION_NAMES, quit: hub ? false : 'title' }
});
if (game.settings.spec('glyphs')) {   // PlayStation symbols unless the player picks Xbox (TASK: PlayStation glyphs, Xbox an option)
  game.input.glyphs = game.settings.symbols;
  if (game.settings.glyphs !== game.settings.symbols) game.settings.set('glyphs', game.settings.symbols);
}
for (const [key] of DH.DEV_SLIDERS) DH.T[key] = +game.settings['dev_' + key];
DH.resetTuning = () => { game.settings.reset('Dev'); for (const [key] of DH.DEV_SLIDERS) DH.T[key] = +game.settings['dev_' + key]; };
DH.setTuning = (key, v) => { game.settings.set('dev_' + key, v); DH.T[key] = +game.settings['dev_' + key]; };

/* ---------- devices: the mouse wheel moves the lever, touch-only devices get a notice ---------- */
DH.wheelQueue = [];
DH.touchOnly = false;
DH.sawKeyOrPad = false;
DH.checkTouchOnly = () => {
  if (typeof matchMedia === 'undefined' || typeof navigator === 'undefined') return (DH.touchOnly = false);
  let pads = false; try { pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); } catch (e) { pads = false; }
  DH.touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !pads && !DH.sawKeyOrPad;
  return DH.touchOnly;
};
if (typeof window !== 'undefined' && window.addEventListener && typeof document !== 'undefined') {
  let lastWheel = 0;
  window.addEventListener('wheel', e => {
    if (!DH.wheelWanted || !DH.wheelWanted()) return;
    e.preventDefault();
    const now = e.timeStamp || 0; if (now - lastWheel < 80) return; lastWheel = now;
    DH.wheelQueue.push(e.deltaY < 0 ? 'power' : 'brake');
  }, { passive: false });
  window.addEventListener('keydown', () => { if (!DH.sawKeyOrPad) { DH.sawKeyOrPad = true; DH.checkTouchOnly(); } }, true);
  window.addEventListener('gamepadconnected', () => { DH.sawKeyOrPad = true; DH.checkTouchOnly(); });
  DH.checkTouchOnly();
  if (DH.touchOnly) game.input.touchEnabled = false;
}

/* ---------- progress (E.store; memory-only in a hub session, by the hub client's design) ---------- */
DH.progressDefault = () => ({ unlocked: ['S0'], ranks: {}, best: {}, bestErr: {}, perfects: {}, stats: { km: 0, stops: 0, perfect: 0, calls: 0 }, postcards: [], done: {} });
DH.progress = Object.assign(DH.progressDefault(), E.store.get('dh:progress', {}) || {});
DH.saveProgress = () => { if (DH.attractOn) return; E.store.set('dh:progress', DH.progress); };
DH.resetProgress = () => { DH.progress = DH.progressDefault(); E.store.set('dh:progress', DH.progress); E.store.set('dh:tips', {}); E.store.set('dh:board', null); };
DH.tipsSeen = E.store.get('dh:tips', {}) || {};
DH.saveTips = () => { if (!DH.attractOn) E.store.set('dh:tips', DH.tipsSeen); };

/* ---------- colours ---------- */
DH.COL = { gold: '#f2c230', goldLt: '#ffe27a', goldDk: '#a87810', sky: '#3aa0e0', ink: '#0b0d18', paper: '#f4efe0', red: '#e8443a', blue: '#3b82f6', green: '#22c55e', amber: '#f5b700', pink: '#ff7ab8', cyan: '#5ae0ff', grey: '#8a8fa8' };
DH.SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
DH.SEAT_NAME = ['RED', 'BLUE', 'GREEN', 'GOLD'];
})();
