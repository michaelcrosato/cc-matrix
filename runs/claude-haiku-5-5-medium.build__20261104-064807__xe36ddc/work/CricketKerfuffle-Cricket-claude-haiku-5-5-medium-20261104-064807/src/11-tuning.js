/* ---- TUNING: the live gameplay variables. Systems read G.T(key) at each use, so a dev slider takes effect at once.
 * The difficulty multipliers apply over the live value (never shown as sliders). Reset puts every value back. ---- */
G.TUNE_DEFS = [
  { key: 'ballSpeed', label: 'Ball speed scale', def: 0.62, min: 0.35, max: 1.0, step: 0.01, group: 'Ball' },
  { key: 'gravity', label: 'Gravity (u/s2)', def: 160, min: 100, max: 300, step: 5, group: 'Ball' },
  { key: 'pitchBounce', label: 'Pitch bounce', def: 0.55, min: 0.3, max: 0.8, step: 0.01, group: 'Ball' },
  { key: 'swing', label: 'Swing x', def: 1.0, min: 0, max: 3, step: 0.05, group: 'Ball' },
  { key: 'spin', label: 'Spin turn x', def: 1.0, min: 0, max: 3, step: 0.05, group: 'Ball' },
  { key: 'seam', label: 'Seam sd ( deg)', def: 2.5, min: 0, max: 8, step: 0.1, group: 'Ball' },
  { key: 'perfectMs', label: 'Perfect window +/-ms', def: 40, min: 10, max: 120, step: 1, group: 'Batting' },
  { key: 'goodMs', label: 'Good window +/-ms', def: 85, min: 30, max: 200, step: 1, group: 'Batting' },
  { key: 'okMs', label: 'Mistime window +/-ms', def: 150, min: 60, max: 300, step: 1, group: 'Batting' },
  { key: 'batPower', label: 'Ground shot power x', def: 1.0, min: 0.5, max: 2, step: 0.05, group: 'Batting' },
  { key: 'loftPower', label: 'Lofted power x', def: 1.0, min: 0.5, max: 2, step: 0.05, group: 'Batting' },
  { key: 'edge', label: 'Edge zone x', def: 1.0, min: 0, max: 3, step: 0.05, group: 'Batting' },
  { key: 'runSpeed', label: 'Batter run speed', def: 120, min: 70, max: 200, step: 1, group: 'Fielding' },
  { key: 'fieldSpeed', label: 'Fielder speed', def: 105, min: 60, max: 180, step: 1, group: 'Fielding' },
  { key: 'throwSpeed', label: 'Throw speed', def: 420, min: 250, max: 700, step: 5, group: 'Fielding' },
  { key: 'throwError', label: 'Throw error', def: 6, min: 0, max: 30, step: 0.5, group: 'Fielding' },
  { key: 'catchRing', label: 'Catch ring time (s)', def: 0.9, min: 0.3, max: 2, step: 0.05, group: 'Fielding' },
  { key: 'catchWindow', label: 'Catch window +/-ms', def: 110, min: 30, max: 300, step: 5, group: 'Fielding' },
  { key: 'aiBatSkill', label: 'CPU timing error (ms)', def: 70, min: 5, max: 200, step: 1, group: 'CPU' },
  { key: 'aiAggression', label: 'CPU aggression', def: 0.5, min: 0, max: 1, step: 0.05, group: 'CPU' },
  { key: 'aiBowlAccuracy', label: 'CPU bowling scatter', def: 10, min: 0, max: 40, step: 0.5, group: 'CPU' },
  { key: 'meterSpeed', label: 'Bowling meter speed (Hz)', def: 1.4, min: 0.5, max: 3, step: 0.05, group: 'Bowling' },
  { key: 'meterSweet', label: 'Meter sweet zone', def: 0.18, min: 0.05, max: 0.5, step: 0.01, group: 'Bowling' },
  { key: 'hypeGain', label: 'Hype gain x', def: 1.0, min: 0, max: 4, step: 0.1, group: 'Kerfuffle' },
  { key: 'fireStreak', label: 'ON FIRE streak', def: 3, min: 2, max: 6, step: 1, group: 'Kerfuffle' },
  { key: 'boundaryScale', label: 'Boundary size x', def: 1.0, min: 0.6, max: 1.3, step: 0.01, group: 'Ground' },
  { key: 'chaosRate', label: 'Chaos rate x', def: 1.0, min: 0, max: 3, step: 0.1, group: 'Kerfuffle' },
  { key: 'commentaryRate', label: 'Commentary rate x', def: 1.0, min: 0, max: 2, step: 0.1, group: 'Presentation' },
  { key: 'camPitch', label: 'Broadcast pitch ( deg)', def: 12, min: 8, max: 30, step: 1, group: 'Presentation' },
  { key: 'camScale', label: 'Broadcast scale', def: 1.45, min: 1.0, max: 2.4, step: 0.05, group: 'Presentation' },
  { key: 'wideScale', label: 'Wide cam scale', def: 0.8, min: 0.5, max: 1.2, step: 0.05, group: 'Presentation' },
  { key: 'timeScale', label: 'Game speed', def: 1.0, min: 0.1, max: 2.0, step: 0.05, group: 'Presentation' }
];
G.TUNE_DEF = Object.fromEntries(G.TUNE_DEFS.map(d => [d.key, d.def]));
G.tune = Object.assign({}, G.TUNE_DEF);
// the difficulty multipliers (plan 5.19.2): Village is kinder to the batter, Test and Kerfuffle! are harder
G.DIFF = {
  County: {},
  Village: { perfectMs: 1.5, goodMs: 1.4, ballSpeed: 0.85, aiBatSkill: 1.6, aiBowlAccuracy: 1.5, catchWindow: 1.5, meterSweet: 1.4 },
  Test: { perfectMs: 0.75, goodMs: 0.8, ballSpeed: 1.1, aiBatSkill: 0.7, catchWindow: 0.8 },
  'Kerfuffle!': { perfectMs: 0.75, goodMs: 0.8, ballSpeed: 1.1, aiBatSkill: 0.7, catchWindow: 0.8, chaosRate: 2 }
};
G.difficulty = () => {
  const d = game.settings.difficulty;
  return G.DIFF[d] ? d : 'County';
};
// G.T(key): the live value, times the difficulty's multiplier if it has one
G.T = key => {
  const base = G.tune[key];
  const m = G.DIFF[G.difficulty()] || {};
  return m[key] !== undefined ? base * m[key] : base;
};
G.tuneSet = (key, v) => {
  const d = G.TUNE_DEFS.find(x => x.key === key);
  if (!d) return false;
  G.tune[key] = clamp(+v, d.min, d.max);
  G.tuneSave();
  return true;
};
G.tuneReset = () => { G.tune = Object.assign({}, G.TUNE_DEF); G.tuneSave(); };
G.tuneChanged = () => G.TUNE_DEFS.filter(d => Math.abs(G.tune[d.key] - d.def) > 1e-9).map(d => d.key);
G.tuneSave = () => E.store.set('kerfuffle:dev', { v: 1, values: G.tune });
G.tuneLoad = () => {
  const s = E.store.get('kerfuffle:dev', null);
  if (!s || s.v !== 1 || !s.values) return;
  for (const d of G.TUNE_DEFS) if (typeof s.values[d.key] === 'number') G.tune[d.key] = clamp(s.values[d.key], d.min, d.max);
};
G.tuneLoad();
