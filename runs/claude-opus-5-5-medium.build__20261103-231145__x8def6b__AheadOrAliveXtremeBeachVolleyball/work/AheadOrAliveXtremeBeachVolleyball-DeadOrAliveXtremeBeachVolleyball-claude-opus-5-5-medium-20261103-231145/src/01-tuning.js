/* 01-tuning: every live slider the dev panel shows. G.T is read by every system every step. */
G.TUNING = [
  // group, key, default, min, max, step, label
  ['Ball', 'ballGravity', 330, 180, 500, 5, 'Gravity'],
  ['Ball', 'ballDrag', .12, 0, .6, .01, 'Air drag'],
  ['Ball', 'passT', 1.05, .7, 1.6, .05, 'Pass flight (s)'],
  ['Ball', 'setT', 1.1, .7, 1.6, .05, 'Set flight (s)'],
  ['Ball', 'serveT', 1.3, .9, 1.8, .05, 'Float serve flight (s)'],
  ['Ball', 'jumpServeT', .85, .6, 1.3, .05, 'Jump serve flight (s)'],
  ['Ball', 'spikeSpeed', 330, 220, 480, 5, 'Spike speed'],
  ['Ball', 'shotT', .95, .6, 1.4, .05, 'Shot flight (s)'],
  ['Ball', 'netCordOver', .45, 0, 1, .05, 'Net cord rolls over'],
  ['Timing', 'perfectWin', .05, .02, .12, .005, 'PERFECT window (s)'],
  ['Timing', 'greatWin', .10, .05, .2, .005, 'GREAT window (s)'],
  ['Timing', 'okWin', .16, .08, .3, .01, 'OK window (s)'],
  ['Timing', 'reach', 14, 8, 24, 1, 'Reach'],
  ['Timing', 'diveReach', 16, 6, 30, 1, 'Dive reach'],
  ['Timing', 'blockRise', .28, .15, .45, .01, 'Block rise (s)'],
  ['Players', 'runSpeed', 96, 60, 140, 2, 'Run speed'],
  ['Players', 'autoMove', .85, 0, 1, .05, 'Auto-run strength'],
  ['AI', 'aiSkillMul', 1, .3, 1.6, .02, 'AI skill ×'],
  ['AI', 'aiReaction', .25, 0, .6, .01, 'AI reaction (s)'],
  ['AI', 'aiSpeedMul', 1, .6, 1.4, .02, 'AI speed ×'],
  ['AI', 'chemistry', .3, 0, .6, .02, 'Partner chemistry weight'],
  ['Match', 'pointsToWin', 7, 3, 21, 1, 'Points to win (vacation)'],
  ['Economy', 'prizeMul', 1, 0, 3, .05, 'Prize money ×'],
  ['Economy', 'priceMul', 1, .25, 3, .05, 'Shop prices ×'],
  ['Economy', 'startMoney', 30000, 0, 200000, 5000, 'Starting money'],
  ['Social', 'affinityGainMul', 1, 0, 3, .05, 'Affinity gains ×'],
  ['Social', 'affinityDecay', 2, 0, 10, 1, 'Daily affinity drift'],
  ['Social', 'inviteThreshold', 40, 0, 100, 1, 'Team-up threshold'],
  ['Social', 'giftThreshold', 0, -3, 3, 1, 'Gift acceptance threshold'],
  ['Pool Hop', 'poolBpm', 112, 80, 150, 2, 'Tempo (bpm)'],
  ['Pool Hop', 'poolWindowMul', 1, .5, 2, .05, 'Timing windows ×'],
  ['Pool Hop', 'poolTime', 40, 20, 80, 1, 'Time limit (s)'],
  ['Casino', 'slotsPayMul', 1, .5, 1.5, .01, 'Slot payouts ×'],
  ['Casino', 'dealerHitsSoft17', 0, 0, 1, 1, 'Dealer hits soft 17'],
  ['Casino', 'rouletteDoubleZero', 0, 0, 1, 1, 'Double-zero wheel'],
  ['Presentation', 'textSpeed', 45, 10, 200, 5, 'Text speed (letters/s)'],
  ['Presentation', 'cameraZoomMul', 1, .7, 1.3, .02, 'Match camera zoom ×']
].map(([group, key, def, min, max, step, label]) => ({ group, key, def, min, max, step, label }));
G.TUNE = {}; for (const t of G.TUNING) G.TUNE[t.key] = t;
G.T = {};
G.resetTuning = (key) => {
  for (const t of G.TUNING) if (!key || key === t.key) G.T[t.key] = t.def;
  G.saveTuning();
};
G.saveTuning = () => { const o = {}; for (const t of G.TUNING) if (G.T[t.key] !== t.def) o[t.key] = G.T[t.key]; if (!G.inHub()) G.store.set('aoa-dev-tuning', o); };
G.loadTuning = () => {
  for (const t of G.TUNING) G.T[t.key] = t.def;
  const o = G.inHub() ? {} : G.store.get('aoa-dev-tuning', {}) || {};
  for (const k in o) if (G.TUNE[k] && typeof o[k] === 'number') G.T[k] = clamp(o[k], G.TUNE[k].min, G.TUNE[k].max);
};
G.loadTuning();
/** difficulty offsets for the AI's skill (§4.7) and spike assist */
G.DIFF = { Easy: { ai: -.2, assist: 99 }, Normal: { ai: 0, assist: 4 }, Hard: { ai: .12, assist: 0 }, Pro: { ai: .22, assist: 0 } };
G.ASSIST = { Tight: .8, Normal: 1, Generous: 1.6 };
