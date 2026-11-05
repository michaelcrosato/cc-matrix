/* ---- TUNING: the live gameplay variables. Systems read T('key') at each use and never cache it, so dev-mode sliders
 * take effect at once. Difficulty multiplies some of them (applied in T, never shown on the sliders). Persisted in
 * E.store('kerfuffle:dev') (memory-only in AI Hub sessions, whose storage is empty). ---- */
const TUNING_DEFS = [
  ['ballSpeed', 'Ball speed scale', .62, .35, 1, .01], ['gravity', 'Gravity (u/s/s)', 160, 100, 300, 5],
  ['pitchBounce', 'Pitch bounce', .55, .3, .8, .01], ['swing', 'Swing ×', 1, 0, 3, .05], ['spin', 'Spin turn ×', 1, 0, 3, .05],
  ['seam', 'Seam spread (deg)', 2.5, 0, 8, .1], ['perfectMs', 'Perfect window +/-ms', 40, 10, 120, 1], ['goodMs', 'Good window +/-ms', 85, 30, 200, 1],
  ['okMs', 'Mistime window +/-ms', 150, 60, 300, 1], ['batPower', 'Ground shot power ×', 1, .5, 2, .05], ['loftPower', 'Lofted power ×', 1, .5, 2, .05],
  ['edge', 'Edge zone ×', 1, 0, 3, .05], ['runSpeed', 'Batter run speed', 140, 70, 200, 1], ['fieldSpeed', 'Fielder speed', 105, 60, 180, 1],
  ['throwSpeed', 'Throw speed', 420, 250, 700, 5], ['throwError', 'Throw error', 6, 0, 30, .5], ['catchRing', 'Catch ring time (s)', .9, .3, 2, .05],
  ['catchWindow', 'Catch window +/-ms', 110, 30, 300, 5], ['aiBatSkill', 'CPU timing error (ms)', 90, 5, 200, 1], ['aiAggression', 'CPU aggression', .5, 0, 1, .05],
  ['aiBowlAccuracy', 'CPU bowling scatter', 10, 0, 40, .5], ['meterSpeed', 'Bowling meter speed (Hz)', 1.4, .5, 3, .05], ['meterSweet', 'Meter sweet zone', .18, .05, .5, .01],
  ['hypeGain', 'Hype gain ×', 1, 0, 4, .1], ['fireStreak', 'ON FIRE streak', 3, 2, 6, 1], ['boundaryScale', 'Boundary size ×', 1, .6, 1.3, .01],
  ['chaosRate', 'Chaos rate ×', 1, 0, 3, .1], ['commentaryRate', 'Commentary rate ×', 1, 0, 2, .1], ['camPitch', 'Broadcast pitch (deg)', 15, 8, 30, 1],
  ['camScale', 'Broadcast scale', 1.4, 1, 2.4, .05], ['wideScale', 'Wide cam scale', .8, .5, 1.2, .05], ['timeScale', 'Game speed', 1, .1, 2, .05]
];
const DIFF = {
  village: { perfectMs: 1.5, goodMs: 1.4, okMs: 1.2, ballSpeed: .85, aiBatSkill: 1.6, aiBowlAccuracy: 1.5, catchWindow: 1.5, meterSweet: 1.4 },
  county: {},
  test: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8 },
  kerfuffle: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8, chaosRate: 2 }
};
const Tuning = {
  defs: TUNING_DEFS.map(([key, label, def, min, max, step]) => ({ key, label, def, min, max, step })),
  v: {}, difficulty: 'county', persist: true,
  init() { for (const d of this.defs) this.v[d.key] = d.def; const saved = E.store.get('kerfuffle:dev', null); if (saved && typeof saved === 'object') for (const d of this.defs) if (typeof saved[d.key] === 'number' && isFinite(saved[d.key])) this.v[d.key] = clamp(saved[d.key], d.min, d.max); },
  def(key) { return this.defs.find(d => d.key === key); },
  raw(key) { return this.v[key]; },
  get(key) { const m = DIFF[this.difficulty] || {}; return this.v[key] * (m[key] || 1); },
  set(key, val) { const d = this.def(key); if (!d) return; this.v[key] = clamp(Math.round(val / d.step) * d.step, d.min, d.max); this.save(); K.bus && K.bus.emit('tuning', { key, value: this.v[key] }); },
  reset(key) { const d = this.def(key); if (d) { this.v[key] = d.def; this.save(); } },
  resetAll() { for (const d of this.defs) this.v[d.key] = d.def; this.save(); },
  changed() { return this.defs.filter(d => Math.abs(this.v[d.key] - d.def) > 1e-9).map(d => d.key); },
  save() { if (this.persist) E.store.set('kerfuffle:dev', Object.assign({}, this.v)); }
};
const T = key => Tuning.get(key);
K.Tuning = Tuning; K.T = T; K.DIFF = DIFF;
