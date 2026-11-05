/* ---- TUNING: every number a balance pass would move. Dev Mode shows the most important ones as live sliders. ---- */
const TUNE_DEFAULTS = {
  skateMax: 128, skateAccel: 320, turboMul: 1.42, turboDrain: .5, puckFriction: 20, puckBounce: .6,
  shotSpeed: 250, slapGain: 240, chargeTime: .95, shotErr: 1, passSpeed: 230, pickupRad: 9,
  goalieReact: .16, goalieSpeed: 150, saveBase: .86, reboundChance: .6,
  checkPower: 1, bigHit: 150, glassBreak: 170, boomGain: 1,
  periodLen: 90, periods: 3, cpuSkill: 1, crowd: 1, kaboomTime: 15, sinBin: 20, fightMax: 3
};
// the sliders: a group, a label, a range and a step (the Dev panel shows them in this order)
const TUNE_META = {
  skateMax: ['SKATING', 'Top speed', 90, 180, 2], skateAccel: ['SKATING', 'Acceleration', 120, 600, 10], turboMul: ['SKATING', 'Turbo multiplier', 1, 2, .02], turboDrain: ['SKATING', 'Turbo drain per second', .1, 2, .05],
  puckFriction: ['PUCK', 'Puck friction', 0, 60, 1], puckBounce: ['PUCK', 'Board bounce', .1, 1, .02], pickupRad: ['PUCK', 'Stick reach', 4, 16, .5],
  shotSpeed: ['SHOTS', 'Wrist shot speed', 150, 400, 5], slapGain: ['SHOTS', 'Slapshot extra speed', 0, 400, 5], chargeTime: ['SHOTS', 'Slapshot wind-up seconds', .3, 2, .05], shotErr: ['SHOTS', 'Shot error', 0, 2.5, .05], passSpeed: ['SHOTS', 'Pass speed', 120, 360, 5],
  goalieReact: ['GOALIES', 'Goalie reaction', .02, .4, .01], goalieSpeed: ['GOALIES', 'Goalie speed', 60, 260, 5], saveBase: ['GOALIES', 'Base save chance', .3, 1, .01], reboundChance: ['GOALIES', 'Rebound chance', 0, 1, .02],
  checkPower: ['HITS', 'Check power', .3, 3, .05], bigHit: ['HITS', 'Big hit threshold', 90, 260, 5], glassBreak: ['HITS', 'Glass break speed', 90, 300, 5],
  boomGain: ['BOOM', 'BOOM gain', 0, 3, .05], kaboomTime: ['BOOM', 'KABOOM seconds', 5, 30, 1], sinBin: ['BOOM', 'Sin bin seconds', 5, 40, 1], fightMax: ['BOOM', 'Fights a game', 0, 6, 1],
  periodLen: ['MATCH', 'Period length (seconds)', 30, 300, 5], periods: ['MATCH', 'Periods', 1, 3, 1], cpuSkill: ['MATCH', 'CPU skill', .5, 1.5, .05], crowd: ['MATCH', 'Crowd noise', 0, 2, .1]
};
const TUNE_KEYS = Object.keys(TUNE_DEFAULTS);
const T = Object.assign({}, TUNE_DEFAULTS, store.get('tuning', {}));
const tuneReset = k => { if (k) T[k] = TUNE_DEFAULTS[k]; else for (const key of TUNE_KEYS) T[key] = TUNE_DEFAULTS[key]; store.set('tuning', Object.fromEntries(TUNE_KEYS.filter(key => T[key] !== TUNE_DEFAULTS[key]).map(key => [key, T[key]]))); };
const tuneSet = (k, v) => { const [, , lo, hi] = TUNE_META[k]; T[k] = clamp(v, lo, hi); store.set('tuning', Object.fromEntries(TUNE_KEYS.filter(key => T[key] !== TUNE_DEFAULTS[key]).map(key => [key, T[key]]))); };
