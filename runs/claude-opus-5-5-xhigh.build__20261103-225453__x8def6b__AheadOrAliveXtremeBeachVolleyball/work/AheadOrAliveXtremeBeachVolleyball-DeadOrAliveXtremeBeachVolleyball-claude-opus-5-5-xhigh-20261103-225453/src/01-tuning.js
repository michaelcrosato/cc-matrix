/* 01-tuning: every live slider of the dev panel (default, range, step, group, label, unit). G.T is the live object every
 * system reads each step: the defaults, with the dev panel's overrides kept in E.store('aoa-dev-tuning'). */
G.TUNING = [
  ['ballGravity', 'Ball', 'Ball gravity', 330, 180, 500, 5, ' u/s²'],
  ['ballDrag', 'Ball', 'Air drag', .12, 0, .6, .01, ''],
  ['passT', 'Ball', 'Pass flight time', 1.05, .7, 1.6, .05, ' s'],
  ['setT', 'Ball', 'Set flight time', 1.1, .7, 1.6, .05, ' s'],
  ['serveT', 'Ball', 'Float serve time', 1.3, .9, 1.8, .05, ' s'],
  ['jumpServeT', 'Ball', 'Jump serve time', .85, .6, 1.3, .05, ' s'],
  ['spikeSpeed', 'Ball', 'Spike speed', 330, 220, 480, 5, ' u/s'],
  ['shotT', 'Ball', 'Cut shot time', .95, .6, 1.4, .05, ' s'],
  ['netCordOver', 'Ball', 'Net cord goes over', .45, 0, 1, .05, ''],
  ['perfectWin', 'Timing', 'Perfect window', .05, .02, .12, .005, ' s'],
  ['greatWin', 'Timing', 'Great window', .10, .05, .2, .005, ' s'],
  ['okWin', 'Timing', 'OK window', .16, .08, .3, .01, ' s'],
  ['reach', 'Timing', 'Reach', 14, 8, 24, 1, ' u'],
  ['diveReach', 'Timing', 'Dive reach', 16, 6, 30, 1, ' u'],
  ['blockRise', 'Timing', 'Block rise time', .28, .15, .45, .01, ' s'],
  ['runSpeed', 'Players', 'Run speed', 96, 60, 140, 2, ' u/s'],
  ['autoMove', 'Players', 'Auto-run strength', .85, 0, 1, .05, ''],
  ['aiSkillMul', 'AI', 'AI skill × day base', 1, .3, 1.6, .02, ''],
  ['aiReaction', 'AI', 'AI reaction', .25, 0, .6, .01, ' s'],
  ['aiSpeedMul', 'AI', 'AI speed', 1, .6, 1.4, .02, '×'],
  ['chemistry', 'AI', 'Partner chemistry effect', .3, 0, .6, .02, ''],
  ['pointsToWin', 'Match', 'Points to win (vacation)', 7, 3, 21, 1, ''],
  ['prizeMul', 'Economy', 'Prize money', 1, 0, 3, .05, '×'],
  ['priceMul', 'Economy', 'Shop prices', 1, .25, 3, .05, '×'],
  ['startMoney', 'Economy', 'Starting money', 30000, 0, 200000, 5000, ''],
  ['affinityGainMul', 'Social', 'Affinity gains', 1, 0, 3, .05, '×'],
  ['affinityDecay', 'Social', 'Daily affinity drift', 2, 0, 10, 1, ''],
  ['inviteThreshold', 'Social', 'Team-up threshold', 40, 0, 100, 1, ''],
  ['giftThreshold', 'Social', 'Gift acceptance', 0, -3, 3, 1, ''],
  ['poolBpm', 'Pool Hop', 'Pool Hop tempo', 112, 80, 150, 2, ' bpm'],
  ['poolWindowMul', 'Pool Hop', 'Pool Hop windows', 1, .5, 2, .05, '×'],
  ['poolTime', 'Pool Hop', 'Pool Hop time', 40, 20, 80, 1, ' s'],
  ['slotsPayMul', 'Casino', 'Slot payouts', 1, .5, 1.5, .01, '×'],
  ['dealerHitsSoft17', 'Casino', 'Dealer hits soft 17', false, null, null, null, ''],
  ['rouletteDoubleZero', 'Casino', 'Double-zero wheel', false, null, null, null, ''],
  ['textSpeed', 'Presentation', 'Text speed', 45, 10, 200, 5, ' /s'],
  ['cameraZoomMul', 'Presentation', 'Camera zoom', 1, .7, 1.3, .02, '×']
].map(([key, group, label, value, min, max, step, unit]) => ({ key, group, label, value, min, max, step, unit, toggle: typeof value === 'boolean' }));
G.TUNING_BY = Object.fromEntries(G.TUNING.map(t => [t.key, t]));
G.T = {};
G.tuningDefaults = () => Object.fromEntries(G.TUNING.map(t => [t.key, t.value]));
G.loadTuning = () => {
  Object.assign(G.T, G.tuningDefaults());
  if (G.hub) return;   // a session uses the defaults and stores nothing
  const saved = E.store.get('aoa-dev-tuning', null);
  if (saved && typeof saved === 'object') for (const k in saved) if (G.TUNING_BY[k] && typeof saved[k] === typeof G.T[k]) G.T[k] = saved[k];
};
G.setTuning = (k, v) => {
  const t = G.TUNING_BY[k]; if (!t) return;
  if (!t.toggle) v = clamp(Math.round(v / t.step) * t.step, t.min, t.max), v = +v.toFixed(4);
  G.T[k] = v; if (!G.hub) E.store.set('aoa-dev-tuning', G.tuningChanged());
};
G.resetTuning = (k) => {
  if (k) G.T[k] = G.TUNING_BY[k].value; else Object.assign(G.T, G.tuningDefaults());
  if (!G.hub) E.store.set('aoa-dev-tuning', G.tuningChanged());
};
G.tuningChanged = () => { const d = G.tuningDefaults(), out = {}; for (const k in d) if (G.T[k] !== d[k]) out[k] = G.T[k]; return out; };
G.loadTuning();

/* ---- difficulty and assists (the Settings' Game group) ---- */
G.DIFF = { Easy: -.2, Normal: 0, Hard: .12, Pro: .22 };
G.ASSIST = { Tight: .8, Normal: 1, Generous: 1.6 };
G.TEXT_SPEED = { Slow: .6, Normal: 1, Fast: 1.8, Instant: 40 };
G.setting = (k, fallback) => { const s = G.game && G.game.settings; const v = s ? s[k] : undefined; return v === undefined ? fallback : v; };
