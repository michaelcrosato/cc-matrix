// BIG BUCK HUNT-OFF: core. The core loop: spot the bucks, shoot clean, pump, never shoot a doe; bag them before they're
// gone, then read your shots in x-ray and climb the standings.
// Units: metres and seconds. x east, y north, z up. Yaw 0 = east, counter-clockwise. Site data uses bearings in degrees
// (negative = left of the vantage's base yaw) and distances in metres.
(() => {
const E = My3D2dge;
const B = globalThis.BB = { E };
B.VERSION = '1.0.0';
B.TITLE = 'Big Buck Hunt-Off';
B.DEG = Math.PI / 180;
B.SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
B.SEAT_NAMES = ['RED', 'BLUE', 'GREEN', 'GOLD'];

// ---- registries: content is data, referenced by id ----
const REG = B.REG = {};
B.def = (kind, id, spec) => { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; };
B.get = (kind, id) => { const r = REG[kind] && REG[kind][id]; if (!r) throw new Error('unknown ' + kind + ' ' + id); return r; };
B.all = kind => Object.values(REG[kind] || {});

// ---- event bus ----
const subs = {};
B.bus = {
  on(name, fn) { (subs[name] || (subs[name] = [])).push(fn); return () => { const l = subs[name]; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }; },
  emit(name, data) { const l = subs[name]; if (l) for (const f of l.slice()) { try { f(data); } catch (e) { if (E.current) E.current.fail('bus ' + name, e); else throw e; } } }
};

// ---- random streams: gameplay draws only from these seeded streams ----
// world: map generation (per hunt seed); spawn: site variations; ai: per animal; bot; fx: cosmetic only.
B.hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
B.mkRng = seed => {
  const R = E.rng(seed >>> 0);
  const f = () => R();
  f.range = (a, b) => a + (b - a) * R();
  f.int = (a, b) => a + Math.floor((b - a + 1) * R());
  f.pick = list => list[Math.floor(R() * list.length)];
  f.chance = p => R() < p;
  f.sign = () => (R() < .5 ? -1 : 1);
  return f;
};
B.runSeed = 1;
B.streams = {};
B.rng = name => B.streams[name] || (B.streams[name] = B.mkRng(B.hashStr(name) ^ Math.imul(B.runSeed, 2654435761)));
B.reseed = seed => { B.runSeed = seed >>> 0; B.streams = {}; };
B.fx = B.mkRng(777);   // cosmetic: draws from it never shift the others

// ---- small math ----
B.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
B.lerp = (a, b, t) => a + (b - a) * t;
B.smooth = t => t * t * (3 - 2 * t);
B.wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
B.approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
B.fmt = n => Math.round(n).toLocaleString('en-US');
B.mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ---- dev tuning: live sliders (Appendix A), saved, with reset ----
const TUNE_SPEC = B.TUNE_SPEC = [
  ['animalSpeed', 'Animal speed', 1, .25, 2, .05],
  ['spook', 'Spook from shots', 1, 0, 2, .05],
  ['doeShare', 'Does and fawns', 1, 0, 2, .05],
  ['spawnRate', 'Spawn rate', 1, .5, 2, .05],
  ['siteTime', 'Site time x', 1, .3, 3, .05],
  ['reticleSpeed', 'Pad reticle speed', 400, 150, 900, 10],
  ['assist', 'Assist friction (1 none)', .65, 0, 1, .05],
  ['rounds', 'Rounds in a tube', 5, 1, 10, 1],
  ['rackTime', 'Pump time', .22, 0, .6, .01],
  ['reloadTime', 'Reload time', 1.25, .2, 3, .05],
  ['scopeMag', 'Scope magnification', 3.5, 1.5, 6, .1],
  ['sway', 'Scope sway px', 2.6, 0, 6, .1],
  ['breath', 'Hold-breath seconds', 3, 1, 6, .1],
  ['calls', 'Calls per site', 2, 0, 5, 1],
  ['callFreeze', 'Call freeze seconds', 1.4, 0, 4, .1],
  ['distanceSlope', 'Metres per +1 distance x', 75, 25, 200, 5],
  ['heartMult', 'Heart multiplier', 2, .5, 4, .1],
  ['headMult', 'Head multiplier', 1.8, .5, 4, .1],
  ['lungMult', 'Lung multiplier', 1.6, .5, 4, .1],
  ['runningMult', 'Running-shot multiplier', 1.25, 1, 2, .05],
  ['antlerBoost', 'Antler draw scale', 1.15, 1, 2, .05],
  ['animalScale', 'Animal size boost', 1.1, .8, 1.5, .05],
  ['fog', 'Fog density', 1, 0, 2, .05],
  ['timeOfDay', 'Time of day shift', 0, -1, 1, .05],
  ['timeScale', 'Game speed', 1, .1, 2, .05]
];
const T = B.TUNING = {};
B.TUNE_DEFAULTS = {};
for (const [k, , v] of TUNE_SPEC) { T[k] = v; B.TUNE_DEFAULTS[k] = v; }
B.loadTuning = () => { const s = E.store.get('bbho:tuning', null); if (s && typeof s === 'object') for (const k in s) if (k in T && typeof s[k] === 'number' && isFinite(s[k])) T[k] = s[k]; };
B.saveTuning = () => E.store.set('bbho:tuning', Object.assign({}, T));
B.setTuning = (k, v) => { const sp = TUNE_SPEC.find(s => s[0] === k); if (!sp) return; T[k] = B.clamp(+v, sp[3], sp[4]); B.saveTuning(); B.bus.emit('tuning', { k, v: T[k] }); };
B.resetTuning = () => { for (const k in B.TUNE_DEFAULTS) T[k] = B.TUNE_DEFAULTS[k]; B.saveTuning(); B.bus.emit('tuning', { k: '*' }); };

// ---- cheats from dev mode ----
B.CHEAT = { god: false, infinite: false, freeze: false, slow: false, overlays: { zones: false, states: false, fan: false } };

// ---- records (E.store; in an AI Hub session the client's memory storage) ----
const RKEY = 'bbho:records';
const freshRecords = () => ({ v: 1, best: {}, stars: {}, trophies: {}, bestBuck: {}, stats: { hunts: 0, shots: 0, hits: 0, bucks: 0, does: 0, longest: 0, critters: 0 }, range: false, champion: false, campaign: null, tables: {} });
B.records = freshRecords();
B.loadRecords = () => { const r = E.store.get(RKEY, null); B.records = r && r.v === 1 ? Object.assign(freshRecords(), r) : freshRecords(); return B.records; };
B.saveRecords = () => E.store.set(RKEY, B.records);
B.resetRecords = () => { B.records = freshRecords(); B.saveRecords(); };

// high-score tables, preloaded with the lodge regulars
B.table = mode => {
  const t = B.records.tables;
  if (!t[mode]) {
    const base = mode.startsWith('bonus') ? [1500, 1200, 900, 700, 500] : mode === 'hunt-off' ? [22000, 18000, 15000, 12000, 9000] : [7000, 6000, 5000, 4000, 3000];
    t[mode] = ['DUB', 'MAE', 'LOR', 'DWN', 'ERL'].map((name, i) => ({ name, score: base[i] }));
  }
  return t[mode];
};
B.qualifies = (mode, score) => { const t = B.table(mode); return score > 0 && (t.length < 8 || score > t[t.length - 1].score); };
B.addScore = (mode, name, score) => { const t = B.table(mode); t.push({ name, score: Math.round(score) }); t.sort((a, b) => b.score - a.score); t.length = Math.min(t.length, 8); B.saveRecords(); };

// ---- settings of the game's own (engine settings group 'Game') ----
B.GAME_SETTINGS = [
  { key: 'difficulty', group: 'Game', label: 'Difficulty', type: 'select', options: [['easy', 'Easy'], ['normal', 'Normal'], ['pro', 'Pro']], value: 'normal', help: 'Easy: strong aim assist, auto-pump, slower animals. Pro: no assist, faster animals, more does' },
  { key: 'assistMode', group: 'Game', label: 'Aim assist', type: 'select', options: [['off', 'Off'], ['light', 'Light'], ['strong', 'Strong']], value: 'light', help: 'Sticks and keys only: the reticle slows over a buck. Never toward does' },
  { key: 'reticleSens', group: 'Game', label: 'Reticle speed', type: 'slider', value: 1, min: .4, max: 2, step: .05, unit: '×' },
  { key: 'autoPump', group: 'Game', label: 'Auto-pump', type: 'toggle', value: false, help: 'The rifle racks itself after each shot' },
  { key: 'scopeMode', group: 'Game', label: 'Scope', type: 'select', options: [['hold', 'Hold'], ['toggle', 'Toggle']], value: 'hold' },
  { key: 'doeRule', group: 'Game', label: 'Doe rule', type: 'select', options: [['classic', 'Classic: benched'], ['casual', 'Casual: -300']], value: 'classic' },
  { key: 'trophyCam', group: 'Game', label: 'Trophy Cam', type: 'select', options: [['on', 'On'], ['trophies', 'Trophies only'], ['off', 'Off']], value: 'on' },
  { key: 'glint', group: 'Game', label: 'Antler glint', type: 'toggle', value: false, help: 'A bright pixel on antler tips, to tell bucks at range' },
  { key: 'bigCaptions', group: 'Game', label: 'Large captions', type: 'toggle', value: false },
  { key: 'rivalTag', group: 'Game', label: 'Rival tag', type: 'toggle', value: true, help: "Show Cousin Dwayne's score to beat during a Hunt-Off" }
];
B.setting = k => { const g = E.current; const s = g && g.settings; if (s && s[k] !== undefined) return s[k]; const d = B.GAME_SETTINGS.find(x => x.key === k); return d ? d.value : undefined; };
B.DIFF = {
  easy: { assist: 'strong', autoPump: true, speed: .85, calls: 1, doe: .8, sway: 1 },
  normal: { assist: null, autoPump: false, speed: 1, calls: 0, doe: 1, sway: 1 },
  pro: { assist: 'off', autoPump: false, speed: 1.15, calls: 0, doe: 1.35, sway: 1.3 }
};
B.diff = () => B.DIFF[B.setting('difficulty')] || B.DIFF.normal;

// ---- touch-only detection (5.25) ----
B.touchOnly = false;
B.checkTouchOnly = () => {
  if (B.touchCleared) return (B.touchOnly = false);
  try { const mm = globalThis.matchMedia; B.touchOnly = !!(mm && mm('(pointer: coarse)').matches && !mm('(any-pointer: fine)').matches); } catch (e) { B.touchOnly = false; }
  return B.touchOnly;
};
})();
