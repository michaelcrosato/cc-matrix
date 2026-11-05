/* 01-tune: every balance number is a game setting in group 'Dev' (live sliders in Dev Mode). B.T(key) reads the live
 * value, with the difficulty's multiplier where one applies. */
B.TUNE = [
  // page, key, label, default, min, max, step
  ['Hero', 'heroRun', 'Run speed', 85, 60, 130, 1], ['Hero', 'heroSneak', 'Sneak speed', 32, 18, 50, 1], ['Hero', 'heroSprint', 'Sprint speed', 125, 90, 170, 1],
  ['Hero', 'heroHpMul', 'Hero health ×', 1, .5, 2, .05], ['Hero', 'grappleRange', 'Grapple range', 112, 64, 200, 2], ['Hero', 'grappleSpeed', 'Grapple pull speed', 240, 120, 400, 5],
  ['Hero', 'breath', 'Breath (s)', 12, 5, 30, .5], ['Hero', 'noiseRun', 'Running noise', 60, 20, 140, 2],
  ['Guards', 'sightRange', 'Sight range', 112, 60, 200, 2], ['Guards', 'sightFov', 'Sight cone (rad)', 1.5, .8, 2.4, .05], ['Guards', 'suspRise', 'Suspicion rise', 1.4, .4, 3, .05],
  ['Guards', 'suspDecay', 'Suspicion decay', .3, .05, 1, .01], ['Guards', 'darkness', 'Darkness hides', .65, 0, 1, .01], ['Guards', 'crouchVis', 'Crouched visibility', .55, .2, 1, .01],
  ['Guards', 'hearing', 'Hearing ×', 1, .3, 2, .05], ['Guards', 'lookUp', 'Look-up limit (deg)', 35, 15, 70, 1],
  ['Combat', 'killRange', 'Silent Cut range', 18, 10, 30, 1], ['Combat', 'killBackAngle', 'Back cut angle (deg)', 60, 30, 90, 1], ['Combat', 'parryWindow', 'Parry window (s)', .18, .05, .4, .01],
  ['Combat', 'enemyDmg', 'Enemy damage ×', 1, .25, 2, .05], ['Combat', 'enemyHp', 'Enemy health ×', 1, .5, 2, .05], ['Combat', 'enemyWindup', 'Enemy wind-up ×', 1, .6, 1.6, .05],
  ['Combat', 'smokeTime', 'Smoke time (s)', 6, 2, 12, .5], ['Combat', 'baitRange', 'Bait range', 80, 40, 160, 2],
  ['World', 'kiRange', 'Ki sense range', 160, 80, 300, 2], ['World', 'alertShout', 'Alert shout radius', 160, 0, 320, 5], ['World', 'bodyRange', 'Body spotting range', 96, 40, 180, 2],
  ['World', 'reinforceDelay', 'Reinforcement delay (s)', 15, 5, 40, 1], ['World', 'ambientNight', 'Night ambient light', .38, .15, .7, .01], ['World', 'lanternRadius', 'Lantern radius ×', 1, .5, 1.6, .05],
  ['World', 'parTimeMul', 'Par time ×', 1, .5, 2, .05], ['World', 'slowmo', 'Silent Cut slow motion', .3, .1, 1, .05]
];
B.TUNE_PAGES = ['Hero', 'Guards', 'Combat', 'World'];
B.TUNE_DEF = {}; for (const t of B.TUNE) B.TUNE_DEF[t[1]] = t[3];
/* difficulty: guard perception, damage taken, Ki range */
B.DIFF = { ninja: { per: 1, dmg: 1, ki: 1 }, novice: { per: .8, dmg: .6, ki: 1.2 }, master: { per: 1.2, dmg: 1.4, ki: .85 } };
const DIFF_KEYS = { sightRange: 'per', suspRise: 'per', hearing: 'per', enemyDmg: 'dmg', kiRange: 'ki' };
B.T = key => {
  const S = B.game && B.game.settings, v = S && S[key] !== undefined ? S[key] : B.TUNE_DEF[key];
  const d = DIFF_KEYS[key]; if (!d || !S) return v;
  const trial = B.mission && (B.mission.mode === 'hub' || B.mission.mode === 'trial');
  return v * (trial ? 1 : (B.DIFF[S.difficulty] || B.DIFF.ninja)[d]);
};
