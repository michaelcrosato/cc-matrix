/* 01-tuning: every balance number as a live slider (G.T). Systems read G.T each step; dev mode edits it; the
 * values persist in E.store('aoa-dev-tuning'); Reset all restores G.TUNING defaults. */
G.TUNING = [
  { key: 'ballGravity', group: 'Ball', label: 'Gravity', def: 330, min: 180, max: 500, step: 5, unit: '' },
  { key: 'ballDrag', group: 'Ball', label: 'Air drag', def: .12, min: 0, max: .6, step: .01, unit: '' },
  { key: 'passT', group: 'Ball', label: 'Pass flight time', def: 1.05, min: .7, max: 1.6, step: .05, unit: 's' },
  { key: 'setT', group: 'Ball', label: 'Set flight time', def: 1.1, min: .7, max: 1.6, step: .05, unit: 's' },
  { key: 'serveT', group: 'Ball', label: 'Float serve time', def: 1.3, min: .9, max: 1.8, step: .05, unit: 's' },
  { key: 'jumpServeT', group: 'Ball', label: 'Jump serve time', def: .85, min: .6, max: 1.3, step: .05, unit: 's' },
  { key: 'spikeSpeed', group: 'Ball', label: 'Spike speed', def: 330, min: 220, max: 480, step: 5, unit: '' },
  { key: 'shotT', group: 'Ball', label: 'Shot flight time', def: .95, min: .6, max: 1.4, step: .05, unit: 's' },
  { key: 'netCordOver', group: 'Ball', label: 'Net cord goes over', def: .45, min: 0, max: 1, step: .05, unit: '' },
  { key: 'perfectWin', group: 'Timing', label: 'Perfect window', def: .05, min: .02, max: .12, step: .005, unit: 's' },
  { key: 'greatWin', group: 'Timing', label: 'Great window', def: .10, min: .05, max: .2, step: .005, unit: 's' },
  { key: 'okWin', group: 'Timing', label: 'OK window', def: .16, min: .08, max: .3, step: .01, unit: 's' },
  { key: 'reach', group: 'Timing', label: 'Reach', def: 14, min: 8, max: 24, step: 1, unit: '' },
  { key: 'diveReach', group: 'Timing', label: 'Dive reach', def: 16, min: 6, max: 30, step: 1, unit: '' },
  { key: 'blockRise', group: 'Timing', label: 'Block rise time', def: .28, min: .15, max: .45, step: .01, unit: 's' },
  { key: 'runSpeed', group: 'Players', label: 'Run speed', def: 96, min: 60, max: 140, step: 2, unit: '' },
  { key: 'autoMove', group: 'Players', label: 'Auto-run strength', def: .85, min: 0, max: 1, step: .05, unit: '' },
  { key: 'aiSkillMul', group: 'AI', label: 'AI skill (x day base)', def: 1, min: .3, max: 1.6, step: .02, unit: 'x' },
  { key: 'aiReaction', group: 'AI', label: 'AI reaction', def: .25, min: 0, max: .6, step: .01, unit: 's' },
  { key: 'aiSpeedMul', group: 'AI', label: 'AI speed', def: 1, min: .6, max: 1.4, step: .02, unit: 'x' },
  { key: 'chemistry', group: 'AI', label: 'Partner chemistry', def: .3, min: 0, max: .6, step: .02, unit: '' },
  { key: 'pointsToWin', group: 'Match', label: 'Points to win (vacation)', def: 7, min: 3, max: 21, step: 1, unit: '' },
  { key: 'prizeMul', group: 'Economy', label: 'Prize money', def: 1, min: 0, max: 3, step: .05, unit: 'x' },
  { key: 'priceMul', group: 'Economy', label: 'Shop prices', def: 1, min: .25, max: 3, step: .05, unit: 'x' },
  { key: 'startMoney', group: 'Economy', label: 'Starting money', def: 30000, min: 0, max: 200000, step: 5000, unit: 'S$' },
  { key: 'affinityGainMul', group: 'Social', label: 'Affinity gain', def: 1, min: 0, max: 3, step: .05, unit: 'x' },
  { key: 'affinityDecay', group: 'Social', label: 'Affinity decay per day', def: 2, min: 0, max: 10, step: 1, unit: '' },
  { key: 'inviteThreshold', group: 'Social', label: 'Team-up threshold', def: 40, min: 0, max: 100, step: 1, unit: '' },
  { key: 'giftThreshold', group: 'Social', label: 'Gift threshold', def: 0, min: -3, max: 3, step: 1, unit: '' },
  { key: 'poolBpm', group: 'Pool Hop', label: 'Pool Hop tempo', def: 112, min: 80, max: 150, step: 2, unit: 'bpm' },
  { key: 'poolWindowMul', group: 'Pool Hop', label: 'Pool Hop window', def: 1, min: .5, max: 2, step: .05, unit: 'x' },
  { key: 'poolTime', group: 'Pool Hop', label: 'Pool Hop time', def: 40, min: 20, max: 80, step: 1, unit: 's' },
  { key: 'slotsPayMul', group: 'Casino', label: 'Slot payouts', def: 1, min: .5, max: 1.5, step: .01, unit: 'x' },
  { key: 'dealerHitsSoft17', group: 'Casino', label: 'Dealer hits soft 17', def: false, toggle: true },
  { key: 'rouletteDoubleZero', group: 'Casino', label: 'Double zero wheel', def: false, toggle: true },
  { key: 'textSpeed', group: 'Presentation', label: 'Text speed (letters/s)', def: 45, min: 10, max: 200, step: 5, unit: '' },
  { key: 'cameraZoomMul', group: 'Presentation', label: 'Camera zoom', def: 1, min: .7, max: 1.3, step: .02, unit: 'x' }
];
G.TUNING_DEFAULTS = {};
for (const t of G.TUNING) G.TUNING_DEFAULTS[t.key] = t.def;
G.T = Object.assign({}, G.TUNING_DEFAULTS);
G.loadTuning = function () {
  const saved = E.store.get('aoa-dev-tuning', null);
  Object.assign(G.T, G.TUNING_DEFAULTS);
  if (saved && typeof saved === 'object') for (const k in saved) if (k in G.TUNING_DEFAULTS) G.T[k] = saved[k];
};
G.saveTuning = function () {
  const diff = {};
  for (const k in G.T) if (G.T[k] !== G.TUNING_DEFAULTS[k]) diff[k] = G.T[k];
  E.store.set('aoa-dev-tuning', diff);
};
G.resetTuning = function () { Object.assign(G.T, G.TUNING_DEFAULTS); G.saveTuning(); };
G.tuneDef = function (key) { return G.TUNING.find(t => t.key === key); };
G.setTune = function (key, v) {
  const d = G.tuneDef(key); if (!d) return;
  if (d.toggle) v = !!v;
  else { v = Math.round(G.clamp(+v, d.min, d.max) / d.step) * d.step; v = +v.toFixed(4); }
  G.T[key] = v; G.saveTuning();
};
/* difficulty presets: an offset to the AI skill and a few windows */
G.DIFFICULTY = { easy: { name: 'Easy', skill: -.2, assist: 1.25, spikeAssist: 'always' }, normal: { name: 'Normal', skill: 0, assist: 1, spikeAssist: 'near' },
  hard: { name: 'Hard', skill: .12, assist: .9, spikeAssist: 'never' }, pro: { name: 'Pro', skill: .22, assist: .8, spikeAssist: 'never' } };
